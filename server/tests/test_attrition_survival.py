# Copyright 2026 Ravinder Singh
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Safety and tenant-scope contract for the attrition model readiness API."""

import os
from datetime import datetime, timedelta
from uuid import uuid4

# This test must never connect to or drop tables from a configured application DB.
os.environ["ALLOW_SQLITE"] = "1"
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["ENVIRONMENT"] = "test"
os.environ.setdefault("ALLOWED_HOSTS", "*")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlmodel import Session as SQLSession
from sqlmodel import select

from app.core.security import TokenData, get_current_user
from app.main import app
from app.models import database as db
from app.models.database import (
    EmployeeTable,
    MLModelCardTable,
    MLModelRegistryTable,
    SQLModel,
    get_session,
)


@pytest.fixture()
def client_db(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    def _get_session_override():
        with SQLSession(engine) as session:
            yield session

    monkeypatch.setattr("app.models.database.get_session", _get_session_override)
    app.dependency_overrides[get_session] = _get_session_override
    app.dependency_overrides[db.get_session] = _get_session_override
    app.dependency_overrides[get_current_user] = lambda: TokenData(
        user_id=str(uuid4()),
        email="survival-test@example.invalid",
        is_admin=True,
        tenant_id="tenant-a",
    )
    with TestClient(app) as client:
        yield {"client": client, "engine": engine}
    app.dependency_overrides.clear()
    SQLModel.metadata.drop_all(engine)
    engine.dispose()


def test_attrition_requires_dated_outcomes_and_scopes_tenant(client_db):
    with SQLSession(client_db["engine"]) as session:
        session.add_all(
            [
                EmployeeTable(
                    tenant_id="tenant-a",
                    full_name="Tenant A Employee",
                    email="a@tenant-a.example.invalid",
                    department="Engineering",
                    role="Engineer",
                    join_date=datetime.utcnow() - timedelta(days=800),
                ),
                EmployeeTable(
                    tenant_id="tenant-b",
                    full_name="Tenant B Employee",
                    email="b@tenant-b.example.invalid",
                    department="Sales",
                    role="Sales Associate",
                    join_date=datetime.utcnow() - timedelta(days=400),
                ),
            ]
        )
        session.commit()

    # A caller supplied tenant header must never override the authenticated scope.
    response = client_db["client"].get(
        "/api/v1/intelligence/attrition-hazard",
        headers={"X-Tenant-ID": "tenant-b"},
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["employees"] == []
    assert data["population"] is None
    assert data["model"]["status"] == "insufficient_outcome_data"
    assert data["model"]["reason_code"] == "NO_VALID_OBSERVED_OUTCOMES"
    assert data["model"]["tenant_profile_count"] == 1
    assert data["model"]["observed_departure_count"] == 0
    assert (
        data["model"]["source_scope"]
        == "authenticated_tenant_uploaded_employee_records"
    )


def test_attrition_returns_descriptive_kaplan_meier_for_uploaded_events(client_db):
    start = datetime.utcnow() - timedelta(days=900)
    with SQLSession(client_db["engine"]) as session:
        session.add_all(
            [
                EmployeeTable(
                    tenant_id="tenant-a",
                    full_name="Departed",
                    email="departed@tenant-a.example.invalid",
                    department="Engineering",
                    role="Engineer",
                    employment_start_date=start,
                    employment_end_date=start + timedelta(days=400),
                    departure_event=True,
                ),
                EmployeeTable(
                    tenant_id="tenant-a",
                    full_name="Active",
                    email="active@tenant-a.example.invalid",
                    department="Engineering",
                    role="Engineer",
                    employment_start_date=start,
                    employment_censor_date=datetime.utcnow(),
                    departure_event=False,
                ),
            ]
        )
        session.commit()

    response = client_db["client"].get("/api/v1/intelligence/attrition-hazard")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["model"]["status"] == "cohort_descriptive"
    assert data["model"]["eligible_observation_count"] == 2
    assert data["model"]["observed_departure_count"] == 1
    assert data["model"]["right_censored_count"] == 1
    assert data["model"]["excluded_record_count"] == 0
    assert data["model"]["date_based_observation_count"] == 2
    assert data["model"]["individual_forecasts_available"] is False
    assert data["survival_curve"][-1]["survival_probability"] == 0.5


def test_attrition_roster_reports_observed_records_without_forecasts(client_db):
    from app.models.database import SkillTable

    start = datetime.utcnow() - timedelta(days=900)
    with SQLSession(client_db["engine"]) as session:
        session.add_all(
            [
                EmployeeTable(
                    tenant_id="tenant-a",
                    full_name="Departed",
                    email="departed-r@tenant-a.example.invalid",
                    department="Engineering",
                    role="Engineer",
                    employment_start_date=start,
                    employment_end_date=start + timedelta(days=400),
                    departure_event=True,
                ),
                EmployeeTable(
                    tenant_id="tenant-a",
                    full_name="Active",
                    email="active-r@tenant-a.example.invalid",
                    department="Sales",
                    role="Associate",
                    employment_start_date=start,
                    employment_censor_date=datetime.utcnow(),
                    departure_event=False,
                ),
                EmployeeTable(
                    tenant_id="tenant-b",
                    full_name="Other Tenant",
                    email="other@tenant-b.example.invalid",
                    department="Sales",
                    role="Associate",
                    employment_start_date=start,
                    employment_censor_date=datetime.utcnow(),
                    departure_event=False,
                ),
            ]
        )
        session.commit()
    with SQLSession(client_db["engine"]) as session:
        people = session.exec(select(EmployeeTable)).all()
        by_email = {person.email: person for person in people}
        session.add(
            SkillTable(
                tenant_id="tenant-a",
                employee_id=by_email["active-r@tenant-a.example.invalid"].id,
                name="Python",
                level=3,
            )
        )
        session.commit()

    response = client_db["client"].get("/api/v1/intelligence/attrition-hazard")
    assert response.status_code == 200, response.text
    data = response.json()

    # Descriptive roster only, strictly tenant-scoped.
    assert {row["full_name"] for row in data["employees"]} == {"Departed", "Active"}
    by_name = {row["full_name"]: row for row in data["employees"]}
    assert by_name["Departed"]["employment_status"] == "departed"
    assert by_name["Departed"]["departure_observed"] is True
    assert by_name["Active"]["employment_status"] == "active"
    assert by_name["Active"]["skills_count"] == 1
    assert by_name["Departed"]["skills_count"] == 0
    assert by_name["Active"]["tenure_months"] > by_name["Departed"]["tenure_months"]
    for row in data["employees"]:
        assert 0.0 <= row["cohort_survival_at_tenure"] <= 1.0
        # Honesty lock: no forecast fields may ever appear on roster rows.
        for forbidden in (
            "hazard_ratio",
            "risk_tier",
            "risk_percentile",
            "risk_score",
            "forecast",
            "probability",
        ):
            assert forbidden not in row

    population = data["population"]
    assert population["count"] == 2
    assert population["departments"] == {"Engineering": 1, "Sales": 1}
    assert population["median_tenure_months"] > 0
    assert data["model"]["individual_forecasts_available"] is False
    assert "forecast" in data["model"]["roster_basis"]
    assert "no risk scores" in data["model"]["roster_basis"]


def test_attrition_roster_counts_skills_per_employee(client_db):
    """Per-employee skill counts require GROUP BY (Postgres rejects bare aggregates)."""
    from app.models.database import SkillTable

    start = datetime.utcnow() - timedelta(days=900)
    with SQLSession(client_db["engine"]) as session:
        session.add_all(
            [
                EmployeeTable(
                    tenant_id="tenant-a",
                    full_name="First",
                    email="first@tenant-a.example.invalid",
                    department="Engineering",
                    role="Engineer",
                    employment_start_date=start,
                    employment_censor_date=datetime.utcnow(),
                    departure_event=False,
                ),
                EmployeeTable(
                    tenant_id="tenant-a",
                    full_name="Second",
                    email="second@tenant-a.example.invalid",
                    department="Engineering",
                    role="Engineer",
                    employment_start_date=start,
                    employment_end_date=start + timedelta(days=400),
                    departure_event=True,
                ),
            ]
        )
        session.commit()
        people = session.exec(select(EmployeeTable)).all()
        by_email = {person.email: person for person in people}
        session.add_all(
            [
                SkillTable(
                    tenant_id="tenant-a",
                    employee_id=by_email["first@tenant-a.example.invalid"].id,
                    name="Python",
                    level=3,
                ),
                SkillTable(
                    tenant_id="tenant-a",
                    employee_id=by_email["second@tenant-a.example.invalid"].id,
                    name="React",
                    level=4,
                ),
            ]
        )
        session.commit()

    response = client_db["client"].get("/api/v1/intelligence/attrition-hazard")
    assert response.status_code == 200, response.text
    by_name = {row["full_name"]: row for row in response.json()["employees"]}
    assert by_name["First"]["skills_count"] == 1
    assert by_name["Second"]["skills_count"] == 1


def test_attrition_survives_mixed_and_malformed_date_records(client_db):
    """Mixed date/datetime values and bad durations degrade, never 500."""
    from datetime import date as date_cls

    start = datetime.utcnow() - timedelta(days=900)
    with SQLSession(client_db["engine"]) as session:
        session.add_all(
            [
                EmployeeTable(
                    tenant_id="tenant-a",
                    full_name="Mixed Types",
                    email="mixed@tenant-a.example.invalid",
                    department="Engineering",
                    role="Engineer",
                    employment_start_date=date_cls(2022, 1, 15),
                    employment_censor_date=datetime.utcnow(),
                    departure_event=False,
                ),
                EmployeeTable(
                    tenant_id="tenant-a",
                    full_name="Negative Duration",
                    email="negative@tenant-a.example.invalid",
                    department="Sales",
                    role="Associate",
                    employment_duration_years=-3.0,
                    departure_event=False,
                ),
                EmployeeTable(
                    tenant_id="tenant-a",
                    full_name="Anchor Departed",
                    email="anchor@tenant-a.example.invalid",
                    department="Engineering",
                    role="Engineer",
                    employment_start_date=start,
                    employment_end_date=start + timedelta(days=400),
                    departure_event=True,
                ),
            ]
        )
        session.commit()

    response = client_db["client"].get("/api/v1/intelligence/attrition-hazard")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["model"]["status"] == "cohort_descriptive"
    names = {row["full_name"] for row in data["employees"]}
    assert "Mixed Types" in names
    assert "Anchor Departed" in names
    assert "Negative Duration" not in names


def test_legacy_attrition_routes_never_return_unvalidated_cross_tenant_scores(
    client_db,
):
    with SQLSession(client_db["engine"]) as session:
        session.add_all(
            [
                EmployeeTable(
                    tenant_id="tenant-a",
                    full_name="Tenant A Employee",
                    email="a-legacy@tenant-a.example.invalid",
                    department="Engineering",
                    role="Engineer",
                    sentiment_score=0.2,
                    is_at_risk=True,
                ),
                EmployeeTable(
                    tenant_id="tenant-b",
                    full_name="Tenant B Secret Employee",
                    email="b-legacy@tenant-b.example.invalid",
                    department="Sales",
                    role="Sales Associate",
                    sentiment_score=0.1,
                    is_at_risk=True,
                ),
                MLModelRegistryTable(
                    tenant_id="tenant-a",
                    model_name="attrition_v1",
                    version="legacy-a",
                    status="active",
                    metrics='{"pr_auc":0.99}',
                    parameters="{}",
                ),
                MLModelRegistryTable(
                    tenant_id="tenant-b",
                    model_name="attrition_v1",
                    version="legacy-b",
                    status="active",
                    metrics='{"pr_auc":0.99}',
                    parameters="{}",
                ),
                MLModelCardTable(
                    tenant_id="tenant-a",
                    model_name="attrition_v1",
                    version="legacy-card-a",
                    status="champion",
                    pr_auc=0.99,
                    calibration_error=0.01,
                    fairness_gap=0.0,
                ),
                MLModelCardTable(
                    tenant_id="tenant-b",
                    model_name="attrition_v1",
                    version="legacy-card-b",
                    status="champion",
                    pr_auc=0.99,
                    calibration_error=0.01,
                    fairness_gap=0.0,
                ),
            ]
        )
        session.commit()

    headers = {"X-Tenant-ID": "tenant-b"}
    explain = client_db["client"].get(
        "/api/v1/enterprise/attrition/explain", headers=headers
    )
    drilldown = client_db["client"].get(
        "/api/v1/enterprise/risk-drivers/drilldown?factor=department",
        headers=headers,
    )

    assert explain.status_code == 200, explain.text
    explain_data = explain.json()
    assert explain_data["status"] == "insufficient_outcome_data"
    assert explain_data["model_version"] == "unavailable-no-observed-outcomes"
    assert explain_data["tenant_profile_count"] == 1
    assert explain_data["items"] == []

    assert drilldown.status_code == 200, drilldown.text
    drilldown_data = drilldown.json()
    assert drilldown_data["status"] == "insufficient_outcome_data"
    assert drilldown_data["items"] == []
    assert "Tenant B Secret Employee" not in drilldown.text

    train = client_db["client"].post("/api/v1/lean/ml/train", headers=headers)
    score = client_db["client"].post("/api/v1/lean/ml/score", headers=headers)
    models = client_db["client"].get("/api/v1/lean/ml/models", headers=headers)
    cards = client_db["client"].get("/api/v1/lean/ml/cards", headers=headers)

    assert train.status_code == 422
    assert "departure and censoring history" in train.json()["detail"]
    assert score.status_code == 422
    assert "observed departure and censoring history" in score.json()["detail"]
    assert models.status_code == 200, models.text
    model_data = models.json()
    assert [row["version"] for row in model_data] == ["legacy-a"]
    assert model_data[0]["status"] == "unvalidated"
    assert model_data[0]["metrics"] == {}

    assert cards.status_code == 200, cards.text
    card_data = cards.json()
    assert [row["version"] for row in card_data] == ["legacy-card-a"]
    assert card_data[0]["status"] == "unvalidated"
    assert card_data[0]["pr_auc"] is None
    promote = client_db["client"].post(
        f"/api/v1/lean/ml/cards/{card_data[0]['id']}/promote", headers=headers
    )
    assert promote.status_code == 422
