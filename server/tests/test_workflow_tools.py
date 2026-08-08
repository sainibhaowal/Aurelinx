"""
Tests for the dynamic 7-tool workflow architecture (search / read / modify /
write / delete-with-approval / analyse / observe).

Verifies that the dynamic tools resolve real records, enforce RBAC on
modify/write, redact secret columns, gate deletions behind an admin approval
that executes the exact stored spec, and return the observation bundle used
by the answer model.
"""

import json
import os
from uuid import uuid4

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://aurelinx:AurelinxPg_2026!ChangeMe@localhost:5432/aurelinx_db"
    "?options=-csearch_path%3Dtest,public",
)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["ALLOWED_HOSTS"] = "*"
os.environ.setdefault("ENVIRONMENT", "development")

from datetime import datetime, timedelta  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, select  # noqa: E402
from sqlmodel import Session as SQLSession  # noqa: E402

from app.main import app  # noqa: E402
from app.core.security import get_current_user, get_tenant_id, TokenData  # noqa: E402
from app.models.database import (  # noqa: E402
    SQLModel,
    EmployeeTable,
    CandidateTable,
    SkillTable,
    IntegrationConnectionTable,
    ChatAttachmentTable,
    ChatMessageTable,
    ChatSessionTable,
    WorkflowApprovalTable,
    get_session,
)
from app.models import database as db  # noqa: E402
from app.workflows.events import create_workflow_run  # noqa: E402
from app.api.v1.chat import (  # noqa: E402
    _execute_agent_tool,
    _prepare_delete_spec,
    _perform_approved_delete,
)

ADMIN = TokenData(user_id=str(uuid4()), email="admin-tools@aurelinx.com", is_admin=True)
MEMBER = TokenData(user_id=str(uuid4()), email="member-tools@aurelinx.com", is_admin=False)


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
    app.dependency_overrides[get_current_user] = lambda: ADMIN
    app.dependency_overrides[get_tenant_id] = lambda: "test-tenant"
    yield {"client": TestClient(app), "engine": engine}
    app.dependency_overrides.clear()


def _seed_employee(engine, email="seed.emp@aurelinx.io", name="Seed Employee"):
    with SQLSession(engine) as s:
        emp = EmployeeTable(
            full_name=name,
            email=email,
            department="Engineering",
            role="Backend Engineer",
            sentiment_score=0.72,
            is_at_risk=False,
            salary=110000,
            join_date=datetime.utcnow() - timedelta(days=300),
        )
        s.add(emp)
        s.commit()
        s.refresh(emp)
        s.add(SkillTable(employee_id=emp.id, name="Python", level=4))
        s.add(SkillTable(employee_id=emp.id, name="SQL", level=3))
        s.commit()
        return str(emp.id)


def _seed_integration(engine):
    with SQLSession(engine) as s:
        conn = IntegrationConnectionTable(
            name="Workday Primary",
            source_type="hris",
            provider="workday",
            status="active",
            api_key="super-secret-key-123",
        )
        s.add(conn)
        s.commit()
        return conn


def test_search_groups_records_and_redacts_secrets(client_db):
    engine = client_db["engine"]
    _seed_employee(engine, "alice.search@aurelinx.io", "Alice Searchable")
    _seed_integration(engine)

    result = _execute_agent_tool(
        "search",
        {"query": "Alice", "limit": 20},
        "find Alice",
        MEMBER,
        str(uuid4()),
        {},
    )
    assert result["tool"] == "search"
    assert result["returned"] >= 1
    assert any("employee" == group["entity"] for group in result["groups"])
    alice = next(
        row
        for group in result["groups"]
        if group["entity"] == "employee"
        for row in group["matches"]
        if row.get("email") == "alice.search@aurelinx.io"
    )
    assert alice["full_name"] == "Alice Searchable"

    result = _execute_agent_tool(
        "search",
        {"query": "Workday", "limit": 20},
        "find integration",
        MEMBER,
        str(uuid4()),
        {},
    )
    integration_rows = [
        row
        for group in result["groups"]
        for row in group["matches"]
        if group["entity"] == "integration"
    ]
    assert integration_rows
    assert all("api_key" not in row or row["api_key"] == "[redacted]" for row in integration_rows)


def test_read_by_email_and_redacts_file_path(client_db):
    engine = client_db["engine"]
    emp_id = _seed_employee(engine, "bob.read@aurelinx.io", "Bob Readable")

    result = _execute_agent_tool(
        "read",
        {"entity": "employee", "identifier": "bob.read@aurelinx.io"},
        "read bob",
        MEMBER,
        str(uuid4()),
        {},
    )
    assert result["returned"] == 1
    assert result["records"][0]["email"] == "bob.read@aurelinx.io"
    assert str(result["records"][0]["id"]) == emp_id

    with SQLSession(engine) as s:
        session_row = ChatSessionTable(title="test", user_id=str(uuid4()))
        s.add(session_row)
        s.commit()
        attachment = ChatAttachmentTable(
            session_id=str(session_row.id),
            original_name="resume.pdf",
            file_path="/tmp/secrets/resume.pdf",
        )
        s.add(attachment)
        s.commit()
        attachment_id = str(attachment.id)
        session_id = str(session_row.id)
    result = _execute_agent_tool(
        "read",
        {"entity": "attachment", "identifier": attachment_id},
        "read attachment",
        MEMBER,
        session_id,
        {},
    )
    assert result["returned"] == 1
    assert result["records"][0]["file_path"] == "[redacted]"


def test_modify_admin_commits_and_member_blocked(client_db):
    engine = client_db["engine"]
    _seed_employee(engine, "carol.modify@aurelinx.io", "Carol Modifiable")

    member_result = _execute_agent_tool(
        "modify",
        {"entity": "employee", "identifier": "carol.modify@aurelinx.io", "fields": {"sentiment_score": 0.99}},
        "update carol",
        MEMBER,
        str(uuid4()),
        {},
    )
    assert member_result.get("blocked") is True
    assert "admin" in member_result.get("reason", "").lower()

    result = _execute_agent_tool(
        "modify",
        {
            "entity": "employee",
            "identifier": "carol.modify@aurelinx.io",
            "fields": {"sentiment_score": 0.99, "department": "Data Science"},
        },
        "update carol",
        ADMIN,
        str(uuid4()),
        {},
    )
    assert result["result"]["updated"] is True
    changes = result["result"]["changes"]
    assert changes["sentiment_score"]["to"] == 0.99
    assert changes["department"]["to"] == "Data Science"
    assert result["result"]["record"]["sentiment_score"] == 0.99

    with SQLSession(engine) as s:
        row = s.exec(
            select(EmployeeTable).where(EmployeeTable.email == "carol.modify@aurelinx.io")
        ).scalars().first()
        assert row.sentiment_score == 0.99
        assert row.department == "Data Science"


def test_modify_blocks_secret_and_id_columns(client_db):
    engine = client_db["engine"]
    _seed_employee(engine, "dave.secret@aurelinx.io", "Dave Guarded")

    result = _execute_agent_tool(
        "modify",
        {"entity": "employee", "identifier": "dave.secret@aurelinx.io", "fields": {"id": "new-id"}},
        "update dave",
        ADMIN,
        str(uuid4()),
        {},
    )
    assert result.get("blocked") is True


def test_write_creates_and_duplicates_blocked(client_db):
    engine = client_db["engine"]
    session_id = str(uuid4())

    result = _execute_agent_tool(
        "write",
        {
            "entity": "employee",
            "data": {
                "full_name": "Eve Written",
                "email": "eve.write@aurelinx.io",
                "department": "Marketing",
                "role": "Growth Lead",
                "salary": 95000,
            },
        },
        "add eve",
        ADMIN,
        session_id,
        {},
    )
    assert result["result"]["created"] is True
    assert result["result"]["record"]["email"] == "eve.write@aurelinx.io"

    duplicate = _execute_agent_tool(
        "write",
        {
            "entity": "employee",
            "data": {"full_name": "Eve Again", "email": "eve.write@aurelinx.io"},
        },
        "duplicate eve",
        ADMIN,
        session_id,
        {},
    )
    assert duplicate.get("blocked") is True

    member_result = _execute_agent_tool(
        "write",
        {"entity": "candidate", "data": {"full_name": "Nope", "email": "nope@aurelinx.io"}},
        "member write",
        MEMBER,
        session_id,
        {},
    )
    assert member_result.get("blocked") is True


def test_delete_prepares_spec_then_approval_executes(client_db):
    engine = client_db["engine"]
    emp_id = _seed_employee(engine, "frank.delete@aurelinx.io", "Frank Deletable")

    result = _execute_agent_tool(
        "delete",
        {"entity": "employee", "identifier": "frank.delete@aurelinx.io"},
        "delete frank",
        MEMBER,
        str(uuid4()),
        {},
    )
    assert result.get("blocked") is True
    assert result.get("approval_required") is True
    assert result["spec"]["entity"] == "employee"
    assert result["spec"]["identifier"] == "frank.delete@aurelinx.io"

    # The approval record stores the exact spec JSON and the approve endpoint
    # executes it with the stored payload (admin only).
    run = create_workflow_run(str(uuid4()), str(ADMIN.user_id), "test-tenant")
    approval_id = str(uuid4())
    payload = json.dumps(_prepare_delete_spec("employee", "frank.delete@aurelinx.io", "delete frank"))
    with SQLSession(engine) as s:
        s.add(
            WorkflowApprovalTable(
                id=approval_id,
                run_id=str(run.id),
                tenant_id="test-tenant",
                requested_by=str(MEMBER.user_id),
                action_type="delete",
                action_payload_hash=__import__("hashlib").sha256(payload.encode("utf-8")).hexdigest(),
                action_payload=payload,
                status="pending",
                reason="Deletion requested through workflow chat",
                expires_at=datetime.utcnow() + timedelta(minutes=30),
            )
        )
        s.commit()

    resp = client_db["client"].post(
        f"/api/v1/chat/workflows/{run.id}/approvals/{approval_id}/approve"
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["status"] == "completed"
    assert data["result"]["deleted"] is True
    assert data["result"]["resource_type"] == "employee"
    assert data["result"]["name"] == "Frank Deletable"

    with SQLSession(engine) as s:
        row = s.exec(
            select(EmployeeTable).where(EmployeeTable.email == "frank.delete@aurelinx.io")
        ).scalars().first()
        assert row is None
        skills = s.exec(
            select(SkillTable).where(SkillTable.employee_id == emp_id)
        ).all()
        assert skills == []

    # Re-approval is refused: the approval is already resolved.
    resp = client_db["client"].post(
        f"/api/v1/chat/workflows/{run.id}/approvals/{approval_id}/approve"
    )
    assert resp.status_code == 409


def test_approval_reject_marks_rejected(client_db):
    engine = client_db["engine"]
    _seed_employee(engine, "grace.reject@aurelinx.io", "Grace Rejectable")
    run = create_workflow_run(str(uuid4()), str(ADMIN.user_id), "test-tenant")
    approval_id = str(uuid4())
    payload = json.dumps(_prepare_delete_spec("employee", "grace.reject@aurelinx.io", "delete grace"))
    with SQLSession(engine) as s:
        s.add(
            WorkflowApprovalTable(
                id=approval_id,
                run_id=str(run.id),
                tenant_id="test-tenant",
                requested_by=str(ADMIN.user_id),
                action_type="delete",
                action_payload_hash=__import__("hashlib").sha256(payload.encode("utf-8")).hexdigest(),
                action_payload=payload,
                status="pending",
                reason="Deletion requested through workflow chat",
                expires_at=datetime.utcnow() + timedelta(minutes=30),
            )
        )
        s.commit()

    resp = client_db["client"].post(
        f"/api/v1/chat/workflows/{run.id}/approvals/{approval_id}/reject"
    )
    assert resp.status_code == 200, resp.text
    with SQLSession(engine) as s:
        approval = s.get(WorkflowApprovalTable, approval_id)
        assert approval.status == "rejected"
        assert s.exec(select(EmployeeTable).where(EmployeeTable.email == "grace.reject@aurelinx.io")).scalars().first() is not None


def test_legacy_email_delete_payload_still_supported(client_db):
    engine = client_db["engine"]
    _seed_employee(engine, "heidi.legacy@aurelinx.io", "Heidi Legacy")
    with SQLSession(engine) as s:
        result = _perform_approved_delete(s, "delete the employee heidi.legacy@aurelinx.io please")
    assert result["deleted"] is True
    assert result["resource_type"] == "employee"
    assert result["email"] == "heidi.legacy@aurelinx.io"


def test_analyse_returns_record_counts_and_workforce(client_db):
    engine = client_db["engine"]
    _seed_employee(engine, "ivan.analyse@aurelinx.io", "Ivan Analyst")
    _seed_employee(engine, "julia.analyse@aurelinx.io", "Julia Analyst", )

    result = _execute_agent_tool(
        "analyse",
        {"scope": "full system"},
        "analyse everything",
        MEMBER,
        str(uuid4()),
        {},
    )
    assert result["tool"] == "analyse"
    analysis = result["analysis"]
    assert analysis["record_counts"].get("employees") == 2
    assert analysis["workforce_analytics"]["total_workforce"] == 2
    assert analysis["sentiment"]["employee_count"] == 2


def test_observe_reports_patterns_symptoms_and_delta(client_db):
    engine = client_db["engine"]
    session_id = str(uuid4())
    _seed_employee(engine, "kate.observe@aurelinx.io", "Kate Observed")
    with SQLSession(engine) as s:
        row = s.exec(select(EmployeeTable).where(EmployeeTable.email == "kate.observe@aurelinx.io")).scalars().first()
        row.is_at_risk = True
        s.add(row)
        s.commit()

    first = _execute_agent_tool(
        "observe", {"scope": "attrition"}, "observe risk", MEMBER, session_id, {}
    )
    observation = first["observation"]
    assert observation["patterns"]["employees_total"] == 1
    assert observation["patterns"]["employee_at_risk_total"] == 1
    assert any("at risk" in symptom for symptom in observation["symptoms"])
    assert observation["prediction"]["attention_needed"] == "yes"

    mutation_state = {"observations": [observation]}
    second = _execute_agent_tool(
        "observe", {"scope": "attrition"}, "observe risk again", MEMBER, session_id, mutation_state
    )
    second_observation = second["observation"]
    assert second_observation["prior_observations_seen"] == 1
    assert any("decreased" in symptom for symptom in second_observation["symptoms"])
