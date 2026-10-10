import json
from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel

from app.api.v1 import intelligence
from app.api.v1.intelligence import (
    FULL_SKILL_GRAPH,
    SkillMatchRequest,
    calculate_skill_match,
    dijkstra_distance,
    match_skills,
)
from app.core.security import TokenData, get_current_user
from app.main import app
from app.models.database import EmployeeTable, SkillAliasTable, SkillTable


def test_skill_matching_resolves_case_and_common_python_transposition():
    assert dijkstra_distance("pyhtoin", "Python") == 0
    assert dijkstra_distance("python", "PYTHON") == 0


def test_sales_skills_are_connected_in_the_transfer_map():
    result = calculate_skill_match(
        candidate_skills=[{"name": "Negotiation", "level": 3}],
        target_skills=[{"name": "sales", "level": 3}],
    )
    detail = result["detailed_matches"][0]
    assert detail["target_skill_mapped"] is True
    assert detail["matched_by_skill"] == "Negotiation"
    assert detail["semantic_distance"] is not None
    assert detail["status"] == "Trainable Gap"


def test_seed_catalog_skills_have_transfer_paths():
    assert dijkstra_distance("Data Analysis", "Python") < 99
    assert dijkstra_distance("CI/CD", "AWS") < 99


def test_graph_adjacency_is_deduplicated():
    for neighbors in FULL_SKILL_GRAPH.values():
        labels = [name for name, _weight in neighbors]
        assert len(labels) == len(set(labels))


def test_unmapped_skill_still_allows_exact_matches_and_explains_no_match():
    exact = calculate_skill_match(
        candidate_skills=[{"name": "Workday Payroll", "level": 2}],
        target_skills=[{"name": "workday payroll", "level": 2}],
    )["detailed_matches"][0]
    assert exact["matched_by_skill"] == "Workday Payroll"
    assert exact["semantic_distance"] == 0
    assert exact["status"] == "Perfect"

    missing = calculate_skill_match(
        candidate_skills=[{"name": "Workday Payroll", "level": 2}],
        target_skills=[{"name": "Specialized Industry Knowledge", "level": 2}],
    )["detailed_matches"][0]
    assert missing["status"] == "Unmapped Skill"
    assert missing["target_skill_mapped"] is False
    assert "not in the transfer map" in missing["unmatched_reason"]


def test_tenant_approved_alias_maps_uploaded_skill_to_graph_node():
    detail = calculate_skill_match(
        candidate_skills=[{"name": "golang", "level": 3}],
        target_skills=[{"name": "Go", "level": 3}],
        skill_aliases={"golang": "Go"},
    )["detailed_matches"][0]
    assert detail["matched_by_skill"] == "golang"
    assert detail["matched_by_canonical_skill"] == "Go"
    assert detail["semantic_distance"] == 0
    assert detail["match_confidence"] == 1


def test_skill_match_queries_only_the_authenticated_tenant():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(
        engine,
        tables=[
            EmployeeTable.__table__,
            SkillTable.__table__,
            SkillAliasTable.__table__,
        ],
    )

    with Session(engine) as session:
        tenant_employee = EmployeeTable(
            full_name="Tenant A",
            email="tenant-a@example.test",
            department="Sales",
            role="Account Executive",
            tenant_id="tenant-a",
        )
        other_employee = EmployeeTable(
            full_name="Tenant B",
            email="tenant-b@example.test",
            department="Engineering",
            role="Engineer",
            tenant_id="tenant-b",
        )
        session.add_all([tenant_employee, other_employee])
        session.commit()
        session.add_all(
            [
                SkillTable(
                    employee_id=tenant_employee.id,
                    tenant_id="tenant-a",
                    name="Negotiation",
                    level=3,
                ),
                SkillTable(
                    employee_id=other_employee.id,
                    tenant_id="tenant-b",
                    name="Sales",
                    level=5,
                ),
            ]
        )
        session.commit()

        results = match_skills(
            SkillMatchRequest(target_skills=[{"name": "Sales", "level": 3}]),
            session,
            SimpleNamespace(tenant_id="tenant-a"),
        )

    assert len(results) == 1
    assert results[0]["full_name"] == "Tenant A"
    assert (
        results[0]["match_details"]["detailed_matches"][0]["matched_by_skill"]
        == "Negotiation"
    )
    engine.dispose()


def test_stream_reports_server_confirmed_matching_progress(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(
        engine,
        tables=[
            EmployeeTable.__table__,
            SkillTable.__table__,
            SkillAliasTable.__table__,
        ],
    )
    with Session(engine) as session:
        employee = EmployeeTable(
            full_name="Streamed Match",
            email="streamed-match@example.test",
            department="Sales",
            role="Account Executive",
            tenant_id="tenant-stream",
        )
        session.add(employee)
        session.commit()
        session.add(
            SkillTable(
                employee_id=employee.id,
                tenant_id="tenant-stream",
                name="Negotiation",
                level=3,
            )
        )
        session.commit()

    monkeypatch.setattr(intelligence, "resolve_engine", lambda: engine)
    app.dependency_overrides[get_current_user] = lambda: TokenData(
        user_id="00000000-0000-0000-0000-000000000001",
        email="stream-user@example.test",
        tenant_id="tenant-stream",
    )
    try:
        response = TestClient(app).post(
            "/api/v1/intelligence/skill-match/stream",
            json={"target_skills": [{"name": "Sales", "level": 3}]},
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        engine.dispose()

    assert response.status_code == 200
    events = [
        json.loads(line.removeprefix("data: "))
        for line in response.text.splitlines()
        if line.startswith("data: ")
    ]
    phases = [event.get("phase", event["type"]) for event in events]
    assert phases == [
        "accepted",
        "employees_loaded",
        "skills_loaded",
        "matching",
        "matching",
        "ranking",
        "complete",
    ]
    matching_events = [event for event in events if event.get("phase") == "matching"]
    assert [(event["completed"], event["total"]) for event in matching_events] == [
        (0, 1),
        (1, 1),
    ]
    assert events[-1]["results"][0]["full_name"] == "Streamed Match"
