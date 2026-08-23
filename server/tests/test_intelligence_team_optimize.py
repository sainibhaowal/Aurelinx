
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
Tests for the Team Assembly Simulated Annealing optimizer.

Verifies that team assembly uses real compensation from employee records,
emits a complete optimization_history (temperature, energy, best_energy,
coverage, cost, budget usage), is deterministic for a fixed seed, and does not
regress on the response contract consumed by the Intelligence Center UI.
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
    select,
)
from sqlmodel import Session as SQLSession

from app.core.security import TokenData, get_current_user, get_tenant_id
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
        user_id=str(uuid4()), email="optimizer@aurelinx.com", is_admin=True
    )
    app.dependency_overrides[get_tenant_id] = lambda: "test-tenant"
    yield {"client": TestClient(app), "engine": engine}
    app.dependency_overrides.clear()


def _seed_employees(engine, count=8):
    employees = []
    with SQLSession(engine) as s:
        for idx in range(count):
            emp = EmployeeTable(
                full_name=f"Engineer {idx}",
                email=f"engineer{idx}@aurelinx.io",
                department="Engineering",
                role="Software Engineer",
                sentiment_score=0.6,
                is_at_risk=False,
                salary=90000 + idx * 5000,  # real recorded compensation
                join_date=datetime.utcnow() - timedelta(days=400),
            )
            s.add(emp)
            employees.append(emp)
        s.commit()
        for emp in employees:
            s.refresh(emp)
        skills = [
            SkillTable(employee_id=emp.id, name=name, level=level)
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
    return employees


def test_team_optimize_uses_real_salary_and_full_history(client_db):
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

    # History must contain every field the chart draws
    history = data["optimization_history"]
    assert len(history) >= 5
    first = history[0]
    for field in (
        "step",
        "temperature",
        "energy",
        "best_energy",
        "coverage",
        "cost",
        "budget_usage_percentage",
    ):
        assert field in first, f"history missing field {field}"

    # best_energy is the best-so-far and is monotonic non-decreasing
    bests = [h["best_energy"] for h in history]
    assert bests == sorted(bests, reverse=True) or bests == sorted(bests)
    assert max(bests) == max(h["energy"] for h in history)

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


def test_team_optimize_deterministic_for_same_seed(client_db):
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


def test_team_optimize_falls_back_when_salary_missing(client_db):
    engine = client_db["engine"]
    employees = _seed_employees(engine, count=6)
    # Null out salaries to force the deterministic fallback estimator
    with SQLSession(engine) as s:
        for emp in employees:
            emp.salary = None
            s.add(emp)
        s.commit()

    payload = {
        "target_skills": [{"name": "React", "level": 4}],
        "budget_cap": 1_000_000.0,
        "max_team_size": 2,
    }
    resp = client_db["client"].post("/api/v1/intelligence/team-optimize", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["metrics"]["salary_record_ratio"] == 0.0
    assert data["metrics"]["compensation_basis"] == "role_estimate_fallback"
    for member in data["optimized_team"]:
        assert member["salary_source"] == "role_estimate"
        # fallback: 80000 + len(role) * 1500
        assert member["estimated_cost"] == 80000 + len("Software Engineer") * 1500
