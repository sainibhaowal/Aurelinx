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

"""
Tests for tenant isolation, exact team optimization, hard budget constraints,
compensation data quality, and the response consumed by the Intelligence Center.
"""

import json
import os
from itertools import combinations
from types import SimpleNamespace
from uuid import uuid4

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["ALLOW_SQLITE"] = "1"
os.environ["ALLOWED_HOSTS"] = "*"
os.environ.setdefault("ENVIRONMENT", "development")

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.pool import StaticPool
from sqlmodel import Session as SQLSession

from app.api.v1.intelligence import _solve_team_milp
from app.core.security import TokenData, get_current_user
from app.main import app
from app.models import database as db
from app.models.database import (
    EmployeeTable,
    SkillTable,
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
        with SQLSession(engine) as s:
            yield s

    monkeypatch.setattr("app.models.database.get_session", _get_session_override)
    app.dependency_overrides[get_session] = _get_session_override
    app.dependency_overrides[db.get_session] = _get_session_override
    app.dependency_overrides[get_current_user] = lambda: TokenData(
        user_id=str(uuid4()),
        email="optimizer@aurelinx.com",
        is_admin=True,
        tenant_id="test-tenant",
    )
    yield {"client": TestClient(app), "engine": engine}
    app.dependency_overrides.clear()
    engine.dispose()


def _seed_employees(engine, count=8, tenant_id="test-tenant", salary_start=90000):
    employees = []
    with SQLSession(engine) as s:
        for idx in range(count):
            emp = EmployeeTable(
                tenant_id=tenant_id,
                full_name=f"Engineer {idx}",
                email=f"engineer{idx}-{tenant_id}@aurelinx.io",
                department="Engineering",
                role="Software Engineer",
                sentiment_score=0.6,
                is_at_risk=False,
                salary=salary_start + idx * 5000,
                salary_currency="USD",
                salary_period="annual",
                join_date=datetime.utcnow() - timedelta(days=400),
            )
            s.add(emp)
            employees.append(emp)
        s.commit()
        for emp in employees:
            s.refresh(emp)
        employee_ids = [emp.id for emp in employees]
        skills = [
            SkillTable(
                tenant_id=tenant_id,
                employee_id=emp.id,
                name=name,
                level=level,
            )
            for emp in employees
            for name, level in [
                ("React", 4),
                ("Python", 3),
                ("AWS", 3),
                ("TypeScript", 2),
            ]
        ]
        s.add_all(skills)
        s.commit()
    return employee_ids


def test_team_optimize_uses_recorded_salary_and_reports_solver_proof(client_db):
    engine = client_db["engine"]
    _seed_employees(engine, count=8)

    payload = {
        "target_skills": [
            {"name": "React", "level": 4},
            {"name": "Python", "level": 3},
            {"name": "AWS", "level": 3},
        ],
        "budget_cap": 500000.0,
        "max_team_size": 3,
    }

    resp = client_db["client"].post("/api/v1/intelligence/team-optimize", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # Real compensation: every member's estimated_cost must equal the recorded salary
    with SQLSession(engine) as s:
        rows = s.exec(select(EmployeeTable)).scalars().all()
        salary_by_id = {str(r.id): r.salary for r in rows}
    for member in data["optimized_team"]:
        assert member["estimated_cost"] == salary_by_id[member["id"]]
        assert member["salary_source"] == "employee_record"

    # Budget cap exposed for the UI budget line
    assert data["budget_cap"] == 500000.0

    assert data["optimality_proven"] is True
    assert data["search_status"] == "optimal"
    assert data["solver"] == "HiGHS MILP"
    assert data["solver_relative_gap"] == 0.0
    assert data["run_inputs"] == {**payload, "seed": None}
    assert data["compensation_unit"] == "USD per annual"
    assert data["compensation_provenance"] == (
        "Employee record values; source provenance is not stored per employee."
    )
    assert data["metrics"]["compensation_basis"] == "recorded_employee_values"
    assert data["score_definition"]["qualification_validation"] is False

    # The chart reports one final measurement, not simulated solver iterations.
    history = data["optimization_history"]
    assert len(history) == 1
    first = history[0]
    for field in (
        "step",
        "search_nodes",
        "energy",
        "best_energy",
        "coverage",
        "cost",
        "budget_usage_percentage",
    ):
        assert field in first, f"history missing field {field}"

    # Coverage/cost used by the chart axes are sane
    assert all(0 <= h["coverage"] <= 100 for h in history)
    assert all(h["cost"] > 0 for h in history)

    # Metrics contract used by the UI
    metrics = data["metrics"]
    for field in (
        "coverage_percentage",
        "total_cost",
        "is_under_budget",
        "budget_usage_percentage",
        "skills_coverage",
        "compensation_basis",
        "salary_record_ratio",
    ):
        assert field in metrics, f"metrics missing {field}"
    assert metrics["salary_record_ratio"] == 1.0


def test_latest_team_result_restores_the_persisted_graph_data(client_db):
    engine = client_db["engine"]
    _seed_employees(engine, count=8)
    payload = {
        "target_skills": [
            {"name": "React", "level": 4},
            {"name": "Python", "level": 3},
        ],
        "budget_cap": 500000.0,
        "max_team_size": 3,
    }

    optimized = client_db["client"].post(
        "/api/v1/intelligence/team-optimize", json=payload
    )
    assert optimized.status_code == 200, optimized.text

    restored = client_db["client"].get("/api/v1/intelligence/team-optimize/latest")
    assert restored.status_code == 200, restored.text
    data = restored.json()
    assert data["saved_at"]
    assert data["result"]["scenario_id"] == optimized.json()["scenario_id"]
    assert data["result"]["optimized_team"] == optimized.json()["optimized_team"]
    expected_inputs = {**payload, "seed": None}
    assert data["inputs"] == expected_inputs
    assert data["result"]["run_inputs"] == expected_inputs
    assert (
        data["result"]["optimization_history"]
        == optimized.json()["optimization_history"]
    )


def test_latest_team_result_does_not_return_another_tenants_scenario(client_db):
    from app.models.database import ForecastScenarioTable

    engine = client_db["engine"]
    with SQLSession(engine) as session:
        session.add(
            ForecastScenarioTable(
                tenant_id="another-tenant",
                scenario_name="Team optimization · other tenant",
                input_payload="{}",
                output_payload=json.dumps(
                    {
                        "optimized_team": [{"full_name": "Other tenant"}],
                        "metrics": {},
                        "optimization_history": [],
                    }
                ),
            )
        )
        session.commit()

    response = client_db["client"].get("/api/v1/intelligence/team-optimize/latest")
    assert response.status_code == 200, response.text
    assert response.json()["result"] is None


def test_team_optimize_is_deterministic_for_same_inputs(client_db):
    engine = client_db["engine"]
    _seed_employees(engine, count=8)

    payload = {
        "target_skills": [
            {"name": "React", "level": 4},
            {"name": "Python", "level": 3},
            {"name": "AWS", "level": 3},
        ],
        "budget_cap": 500000.0,
        "max_team_size": 3,
        "seed": 12345,
    }

    r1 = client_db["client"].post("/api/v1/intelligence/team-optimize", json=payload)
    r2 = client_db["client"].post("/api/v1/intelligence/team-optimize", json=payload)
    assert r1.status_code == 200 and r2.status_code == 200
    d1, d2 = r1.json(), r2.json()

    assert [m["id"] for m in d1["optimized_team"]] == [
        m["id"] for m in d2["optimized_team"]
    ]
    assert d1["optimization_history"] == d2["optimization_history"]
    assert d1["metrics"] == d2["metrics"]


def test_team_optimize_rejects_missing_compensation_instead_of_estimating(client_db):
    engine = client_db["engine"]
    employees = _seed_employees(engine, count=6)
    # Missing compensation is not replaced with a fabricated estimate.
    with SQLSession(engine) as s:
        for emp in (
            s.exec(select(EmployeeTable).where(EmployeeTable.id.in_(employees)))
            .scalars()
            .all()
        ):
            emp.salary = None
            s.add(emp)
        s.commit()

    payload = {
        "target_skills": [{"name": "React", "level": 4}],
        "budget_cap": 1_000_000.0,
        "max_team_size": 2,
    }
    resp = client_db["client"].post("/api/v1/intelligence/team-optimize", json=payload)
    assert resp.status_code == 422, resp.text
    assert (
        "positive salary with explicit currency and pay period" in resp.json()["detail"]
    )


def test_team_optimize_enforces_budget_and_prefers_lower_cost_on_equal_coverage(
    client_db,
):
    engine = client_db["engine"]
    employees = _seed_employees(engine, count=5)
    payload = {
        "target_skills": [{"name": "React", "level": 4}],
        "budget_cap": 190000,
        "max_team_size": 2,
    }
    response = client_db["client"].post(
        "/api/v1/intelligence/team-optimize", json=payload
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["metrics"]["is_under_budget"] is True
    assert data["metrics"]["total_cost"] == 185000
    assert {member["id"] for member in data["optimized_team"]} == {
        str(employees[0]),
        str(employees[1]),
    }

    payload["budget_cap"] = 180000
    infeasible = client_db["client"].post(
        "/api/v1/intelligence/team-optimize", json=payload
    )
    assert infeasible.status_code == 422
    # Enriched infeasibility message must state the real minimum + shortfall.
    assert "185,000" in infeasible.json()["detail"]
    assert "shortfall" in infeasible.json()["detail"].casefold()


def test_team_feasibility_reports_minimum_costs_and_scope(client_db):
    engine = client_db["engine"]
    _seed_employees(engine, count=5)
    response = client_db["client"].get("/api/v1/intelligence/team-optimize/feasibility")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["eligible_employee_count"] == 5
    assert data["compensation_unit"] == "USD per annual"
    # 90k + 95k = 185k cheapest pair; exposes sizes up to 10 when staff allows.
    assert data["minimum_cost_by_team_size"]["2"] == 185000
    assert data["supported_team_sizes"][-1] == 10


def test_team_skill_suggestions_come_from_uploaded_records(client_db):
    engine = client_db["engine"]
    _seed_employees(engine, count=4)
    response = client_db["client"].get(
        "/api/v1/intelligence/team-optimize/skill-suggestions",
        params={"q": "reac", "limit": 10},
    )
    assert response.status_code == 200, response.text
    names = [row["name"] for row in response.json()["suggestions"]]
    assert "React" in names


def test_team_optimize_allows_same_skill_at_different_levels(client_db):
    engine = client_db["engine"]
    _seed_employees(engine, count=4)
    # Same skill at L2 and L4 are distinct demands and must solve.
    ok = client_db["client"].post(
        "/api/v1/intelligence/team-optimize",
        json={
            "target_skills": [
                {"name": "React", "level": 2},
                {"name": "React", "level": 4},
            ],
            "budget_cap": 500000.0,
            "max_team_size": 2,
        },
    )
    assert ok.status_code == 200, ok.text
    # Exact same skill+level twice is still rejected.
    dupe = client_db["client"].post(
        "/api/v1/intelligence/team-optimize",
        json={
            "target_skills": [
                {"name": "React", "level": 4},
                {"name": "react", "level": 4},
            ],
            "budget_cap": 500000.0,
            "max_team_size": 2,
        },
    )
    assert dupe.status_code == 422
    assert "level combination" in dupe.json()["detail"]


def test_team_optimize_accepts_team_size_up_to_ten(client_db):
    engine = client_db["engine"]
    _seed_employees(engine, count=11)
    payload = {
        "target_skills": [{"name": "React", "level": 4}],
        "budget_cap": 2_000_000.0,
        "max_team_size": 10,
    }
    response = client_db["client"].post(
        "/api/v1/intelligence/team-optimize", json=payload
    )
    assert response.status_code == 200, response.text
    assert len(response.json()["optimized_team"]) == 10

    oversized = client_db["client"].post(
        "/api/v1/intelligence/team-optimize",
        json={**payload, "max_team_size": 11},
    )
    assert oversized.status_code == 422


def test_team_coverage_separates_exact_skill_matches_from_graph_bridges(client_db):
    from sqlalchemy import delete

    from app.api.v1.intelligence import dijkstra_distance

    engine = client_db["engine"]
    employee_ids = _seed_employees(engine, count=2)
    bridge_distance = dijkstra_distance("Data Analysis", "Python")
    assert bridge_distance < 99

    with SQLSession(engine) as session:
        session.exec(delete(SkillTable))
        session.add_all(
            [
                SkillTable(
                    tenant_id="test-tenant",
                    employee_id=employee_ids[0],
                    name="React",
                    level=4,
                ),
                SkillTable(
                    tenant_id="test-tenant",
                    employee_id=employee_ids[1],
                    name="Data Analysis",
                    level=3,
                ),
            ]
        )
        session.commit()

    response = client_db["client"].post(
        "/api/v1/intelligence/team-optimize",
        json={
            "target_skills": [
                {"name": "React", "level": 4},
                {"name": "Python", "level": 3},
            ],
            "budget_cap": 500000,
            "max_team_size": 2,
        },
    )
    assert response.status_code == 200, response.text
    metrics = response.json()["metrics"]
    assert metrics["coverage_percentage"] == 90
    assert metrics["ontology_adjusted_coverage_percentage"] == 90
    assert metrics["exact_skill_coverage_percentage"] == 50
    by_target = {row["skill"]: row for row in metrics["skills_coverage"]}
    assert by_target["React"]["match_basis"] == "exact_skill_name"
    assert by_target["React"]["exact_match_coverage_percentage"] == 100
    assert by_target["Python"]["match_basis"] == "ontology_bridge"
    assert by_target["Python"]["coverage_percentage"] == 80
    assert by_target["Python"]["exact_match_coverage_percentage"] == 0
    assert by_target["Python"]["ontology_path"] == [
        "Data Analysis",
        "Data Science",
        "Python",
    ]
    assert by_target["Python"]["ontology_distance"] == round(bridge_distance, 3)

    with SQLSession(engine) as session:
        session.exec(delete(SkillTable).where(SkillTable.name == "React"))
        session.commit()
    distant_bridge = client_db["client"].post(
        "/api/v1/intelligence/team-optimize",
        json={
            "target_skills": [{"name": "Frontend", "level": 3}],
            "budget_cap": 500000,
            "max_team_size": 2,
        },
    )
    assert distant_bridge.status_code == 200, distant_bridge.text
    distant_detail = distant_bridge.json()["metrics"]["skills_coverage"][0]
    assert distant_detail["match_basis"] == "no_evidence"
    assert distant_detail["contributed_by_skill"] == ""


def test_team_optimize_ignores_untrusted_tenant_header(client_db):
    engine = client_db["engine"]
    allowed = _seed_employees(engine, count=4, tenant_id="test-tenant")
    _seed_employees(engine, count=4, tenant_id="other-tenant", salary_start=1000)
    response = client_db["client"].post(
        "/api/v1/intelligence/team-optimize",
        headers={"X-Tenant-ID": "other-tenant"},
        json={
            "target_skills": [{"name": "React", "level": 4}],
            "budget_cap": 300000,
            "max_team_size": 2,
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    allowed_ids = {str(employee_id) for employee_id in allowed}
    assert all(member["id"] in allowed_ids for member in data["optimized_team"])
    assert data["source_scope"]["tenant_id"] == "test-tenant"
    assert data["source_scope"]["eligible_employee_count"] == 4


def test_milp_matches_exhaustive_search_for_small_fixture():
    employees = [SimpleNamespace(id=f"candidate-{idx}") for idx in range(6)]
    costs = [10, 20, 30, 40, 50, 60]
    contributions = [
        [1.0, 0.0, 0.2],
        [0.0, 1.0, 0.2],
        [0.5, 0.5, 0.8],
        [0.7, 0.0, 0.1],
        [0.0, 0.7, 0.9],
        [0.2, 0.2, 0.2],
    ]
    budget = 80
    selected, score, cost, info = _solve_team_milp(
        employees, costs, contributions, team_size=2, budget=budget
    )

    feasible = []
    for team in combinations(range(len(employees)), 2):
        team_cost = sum(costs[index] for index in team)
        if team_cost <= budget:
            team_score = sum(
                max(round(contributions[index][skill], 12) for index in team)
                for skill in range(len(contributions[0]))
            ) / len(contributions[0])
            feasible.append((team_score, team_cost))
    expected_score, expected_cost = max(
        feasible, key=lambda result: (result[0], -result[1])
    )

    assert score == expected_score
    assert cost == expected_cost
    assert sum(costs[index] for index in selected) <= budget
    assert info["optimality_proven"] is True
