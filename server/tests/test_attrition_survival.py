"""
Tests for the Cox Proportional Hazards attrition survival engine.

Verifies the /attrition-hazard endpoint contract consumed by the
Intelligence Center survival sandbox: per-employee differentiation,
real covariate engineering, survival curve integrity (monotone hazard,
probability bounds), 95% CI bands, SHAP-style waterfall completeness,
population percentile bands, and risk tiering.
"""

import os
from uuid import uuid4

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://aurelinx:AurelinxPg_2026!ChangeMe@localhost:55433/aurelinx_db"
    "?options=-csearch_path%3Dtest,public",
)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["ALLOWED_HOSTS"] = "*"
os.environ.setdefault("ENVIRONMENT", "development")

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import (
    create_engine,
)
from sqlmodel import Session as SQLSession

from app.core.security import TokenData, get_current_user, get_tenant_id
from app.main import app
from app.models import database as db
from app.models.database import (
    EmployeeTable,
    ExperienceTable,
    SkillTable,
    SQLModel,
    get_session,
)


@pytest.fixture()
def client_db(monkeypatch):
    engine = create_engine(TEST_DATABASE_URL, echo=False, pool_pre_ping=True)
    with engine.begin() as conn:
        conn.exec_driver_sql("CREATE SCHEMA IF NOT EXISTS test AUTHORIZATION aurelinx")
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)

    def _get_session_override():
        with SQLSession(engine) as s:
            yield s

    monkeypatch.setattr("app.models.database.get_session", _get_session_override)
    app.dependency_overrides[get_session] = _get_session_override
    app.dependency_overrides[db.get_session] = _get_session_override
    app.dependency_overrides[get_current_user] = lambda: TokenData(
        user_id=str(uuid4()), email="survival@aurelinx.com", is_admin=True
    )
    app.dependency_overrides[get_tenant_id] = lambda: "test-tenant"
    yield {"client": TestClient(app), "engine": engine}
    app.dependency_overrides.clear()


def _seed_workforce(engine):
    """Three deliberately contrasted profiles to prove differentiation."""
    with SQLSession(engine) as s:
        stable = EmployeeTable(
            full_name="Stable Senior Engineer",
            email="stable@aurelinx.io",
            department="Engineering",
            role="Senior Software Engineer",
            sentiment_score=0.85,
            is_at_risk=False,
            salary=165000,
            join_date=datetime.utcnow() - timedelta(days=1600),
        )
        mid = EmployeeTable(
            full_name="Mid Analyst",
            email="mid@aurelinx.io",
            department="Analytics",
            role="Data Analyst",
            sentiment_score=0.55,
            is_at_risk=False,
            salary=95000,
            join_date=datetime.utcnow() - timedelta(days=600),
        )
        risky = EmployeeTable(
            full_name="Flight Risk Sales Rep",
            email="risky@aurelinx.io",
            department="Sales",
            role="Sales Associate",
            sentiment_score=0.28,
            is_at_risk=True,
            salary=62000,
            join_date=datetime.utcnow() - timedelta(days=380),
        )
        s.add_all([stable, mid, risky])
        s.commit()
        for e in (stable, mid, risky):
            s.refresh(e)
        ids = {"stable": stable.id, "mid": mid.id, "risky": risky.id}

        s.add_all(
            [
                # Stable: deep, aligned, modest load, long tenure, one employer
                SkillTable(employee_id=stable.id, name="Python", level=5),
                SkillTable(employee_id=stable.id, name="FastAPI", level=5),
                SkillTable(employee_id=stable.id, name="SQL", level=4),
                SkillTable(employee_id=stable.id, name="Docker", level=4),
                SkillTable(employee_id=stable.id, name="AWS", level=4),
                ExperienceTable(
                    employee_id=stable.id,
                    company="Acme",
                    position="Engineer",
                    duration_years=12.0,
                    description="",
                ),
                # Mid: average everything
                SkillTable(employee_id=mid.id, name="SQL", level=3),
                SkillTable(employee_id=mid.id, name="Excel", level=4),
                SkillTable(employee_id=mid.id, name="Python", level=3),
                SkillTable(employee_id=mid.id, name="Tableau", level=3),
                SkillTable(employee_id=mid.id, name="Power BI", level=2),
                ExperienceTable(
                    employee_id=mid.id,
                    company="Beta",
                    position="Analyst",
                    duration_years=6.0,
                    description="",
                ),
                ExperienceTable(
                    employee_id=mid.id,
                    company="Gamma",
                    position="Associate",
                    duration_years=2.0,
                    description="",
                ),
                # Risky: overloaded, misaligned, compressed, fragmented history
                SkillTable(employee_id=risky.id, name="React", level=2),
                SkillTable(employee_id=risky.id, name="Node.js", level=2),
                SkillTable(employee_id=risky.id, name="Docker", level=2),
                SkillTable(employee_id=risky.id, name="Vue.js", level=2),
                SkillTable(employee_id=risky.id, name="Angular", level=1),
                SkillTable(employee_id=risky.id, name="TypeScript", level=2),
                SkillTable(employee_id=risky.id, name="JavaScript", level=3),
                SkillTable(employee_id=risky.id, name="Go", level=1),
                SkillTable(employee_id=risky.id, name="Kubernetes", level=1),
                SkillTable(employee_id=risky.id, name="AWS", level=2),
                ExperienceTable(
                    employee_id=risky.id,
                    company="One",
                    position="Dev",
                    duration_years=1.0,
                    description="",
                ),
                ExperienceTable(
                    employee_id=risky.id,
                    company="Two",
                    position="Dev",
                    duration_years=1.0,
                    description="",
                ),
                ExperienceTable(
                    employee_id=risky.id,
                    company="Three",
                    position="Dev",
                    duration_years=1.0,
                    description="",
                ),
                ExperienceTable(
                    employee_id=risky.id,
                    company="Four",
                    position="Dev",
                    duration_years=1.0,
                    description="",
                ),
                ExperienceTable(
                    employee_id=risky.id,
                    company="Five",
                    position="Dev",
                    duration_years=1.0,
                    description="",
                ),
            ]
        )
        s.commit()
    return ids


def test_attrition_hazard_contract_and_differentiation(client_db):
    engine = client_db["engine"]
    ids = _seed_workforce(engine)

    resp = client_db["client"].get("/api/v1/intelligence/attrition-hazard")
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert "employees" in data and "population" in data and "model" in data
    employees = data["employees"]
    assert len(employees) == 3

    by_id = {e["employee_id"]: e for e in employees}

    # 1. Per-employee differentiation — the core regression this guards
    stable = by_id[str(ids["stable"])]
    mid = by_id[str(ids["mid"])]
    risky = by_id[str(ids["risky"])]
    assert stable["hazard_ratio"] < mid["hazard_ratio"] < risky["hazard_ratio"]
    assert stable["risk_percentile"] < mid["risk_percentile"] < risky["risk_percentile"]
    assert stable["risk_tier"] in ("Low", "Moderate")
    assert risky["risk_tier"] in ("High", "Critical")
    assert stable["attr_12"] < mid["attr_12"] < risky["attr_12"]
    assert (
        stable["median_residual_tenure"] is None
        or stable["median_residual_tenure"] > 12
    )
    assert risky["median_residual_tenure"] is not None
    assert risky["median_residual_tenure"] < (
        stable.get("median_residual_tenure") or 999
    )

    # 2. Survival timeline integrity
    for e in employees:
        timeline = e["survival_forecast"]
        assert len(timeline) == 12
        prev_s = 1.0
        prev_H = 0.0
        for point in timeline:
            assert 0.0 <= point["survival_probability"] <= 1.0
            assert 0.0 <= point["attrition_probability"] <= 1.0
            assert 0.0 <= point["ci_low"] <= point["ci_high"] <= 1.0
            assert point["ci_low"] <= point["survival_probability"] <= point["ci_high"]
            assert point["hazard"] >= 0.0
            assert point["cumulative_hazard"] > prev_H
            # survival is non-increasing
            assert point["survival_probability"] <= prev_s + 1e-9
            prev_s = point["survival_probability"]
            prev_H = point["cumulative_hazard"]

        # 3. SHAP waterfall: ratios multiply to the hazard ratio
        waterfall = e["shap_waterfall"]
        assert len(waterfall) == 9  # all covariates present
        product = 1.0
        for w in waterfall:
            assert w["direction"] in ("risky", "protective")
            assert w["impact_ratio"] > 0
            product *= w["impact_ratio"]
        assert abs(product - e["hazard_ratio"]) / e["hazard_ratio"] < 0.02

        # 4. Covariate explain rows mirror waterfall
        assert len(e["covariates_explain"]) == len(waterfall)
        assert all(
            "factor" in c and "impact_percentage" in c for c in e["covariates_explain"]
        )

        # 5. Levers block present for the client-side sandbox mirror
        levers = e["levers"]
        for field in (
            "morale",
            "salary",
            "dept_median_salary",
            "skills_count",
            "skill_level_avg",
            "match_score",
            "experience_years",
            "companies_count",
            "tenure_months",
            "department",
            "role",
            "seniority_scale",
            "dept_offset",
            "risk_flag",
        ):
            assert field in levers, f"levers missing {field}"

    # 6. Population band integrity
    pop = data["population"]
    assert pop["count"] == 3
    assert len(pop["p10"]) == len(pop["p50"]) == len(pop["p90"]) == 12
    for lo, mid_v, hi in zip(pop["p10"], pop["p50"], pop["p90"], strict=True):
        assert 0.0 <= lo <= mid_v <= hi <= 1.0

    # 7. Hazard ratio vs population average reference
    assert data["population"]["avg_hr"] > 0


def test_attrition_hazard_empty_workforce(client_db):
    resp = client_db["client"].get("/api/v1/intelligence/attrition-hazard")
    assert resp.status_code == 200
    data = resp.json()
    assert data["employees"] == []
    assert data["population"] is None
