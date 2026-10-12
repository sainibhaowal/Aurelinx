from datetime import UTC, datetime
from types import SimpleNamespace

import pytest

from app.api.v1.intelligence import compute_ona
from app.core.security import TokenData
from app.models.database import EmployeeTable
from app.services.ona import build_ona_graph


def employee(employee_id: str, department: str):
    return SimpleNamespace(
        id=employee_id,
        full_name=employee_id,
        department=department,
        role="Analyst",
    )


def test_ona_uses_successful_jira_records_as_ties_and_counts_repeats():
    staff = [
        employee("a", "Engineering"),
        employee("b", "Engineering"),
        employee("c", "Sales"),
    ]
    occurred_at = datetime(2026, 10, 1)
    result = build_ona_graph(
        staff,
        [
            {
                "reporter_id": "a",
                "assignee_id": "b",
                "event_type": "review",
                "occurred_at": occurred_at,
            },
            {
                "reporter_id": "a",
                "assignee_id": "b",
                "event_type": "planning",
                "occurred_at": occurred_at,
            },
            {
                "reporter_id": "a",
                "assignee_id": "b",
                "event_type": "review",
                "occurred_at": occurred_at,
            },
            {
                "reporter_id": "b",
                "assignee_id": "c",
                "event_type": "handoff",
                "occurred_at": occurred_at,
            },
        ],
        window_days=90,
    )

    assert result["metrics"]["represented_record_count"] == 4
    assert result["metrics"]["link_count"] == 2
    assert result["metrics"]["component_count"] == 1
    assert result["metrics"]["largest_component_size"] == 3
    assert result["metrics"]["isolated_node_count"] == 0
    assert result["metrics"]["cross_dept_ratio"] == 0.5
    assert result["metrics"]["status"] == "available"
    by_pair = {(edge["source"], edge["target"]): edge for edge in result["links"]}
    assert by_pair[("a", "b")]["record_count"] == 3
    assert by_pair[("a", "b")]["weight"] == 1
    assert by_pair[("b", "c")]["weight"] == pytest.approx(1 / 3)
    assert by_pair[("a", "b")]["channel"] == "uploaded_collaboration_event"
    assert by_pair[("a", "b")]["event_types"] == [
        {"type": "review", "count": 2},
        {"type": "planning", "count": 1},
    ]
    assert by_pair[("a", "b")]["first_occurred_at"] == f"{occurred_at.isoformat()}Z"
    assert result["metrics"]["event_type_breakdown"] == {
        "handoff": 1,
        "planning": 1,
        "review": 2,
    }
    node_b = next(node for node in result["nodes"] if node["id"] == "b")
    assert node_b["degree"] == 2
    assert node_b["betweenness"] == 1.0
    assert node_b["ei_silo_index"] == 0.0


def test_ona_empty_and_disconnected_graphs_do_not_claim_influence_or_ties():
    staff = [employee("a", "Engineering"), employee("b", "Sales")]
    empty = build_ona_graph(staff, [], window_days=30)
    assert empty["metrics"]["status"] == "insufficient_evidence"
    assert empty["metrics"]["graph_density"] == 0
    assert empty["metrics"]["component_count"] == 2
    assert empty["metrics"]["isolated_node_count"] == 2
    assert all(node["influence_pagerank"] == 0 for node in empty["nodes"])
    assert all(node["ei_silo_index"] is None for node in empty["nodes"])

    disconnected = build_ona_graph(
        staff,
        [{"reporter_id": "outside", "assignee_id": "a", "occurred_at": None}],
        window_days=30,
    )
    assert disconnected["metrics"]["represented_record_count"] == 0
    assert disconnected["metrics"]["excluded_record_count"] == 1
    assert disconnected["links"] == []


def test_ona_pagerank_converges_and_is_normalized_only_for_connected_nodes():
    staff = [
        employee("a", "Engineering"),
        employee("b", "Sales"),
        employee("c", "Sales"),
    ]
    result = build_ona_graph(
        staff,
        [{"reporter_id": "a", "assignee_id": "b", "occurred_at": None}],
        window_days=90,
    )
    assert result["metrics"]["pagerank_converged"] is True
    assert result["metrics"]["pagerank_iterations"] < 500
    assert sum(node["pagerank"] for node in result["nodes"]) == pytest.approx(1.0)
    isolated = next(node for node in result["nodes"] if node["id"] == "c")
    assert isolated["influence_pagerank"] == 0


def test_ona_endpoint_scopes_both_employee_and_event_queries_to_authenticated_tenant():
    staff = [
        employee("a", "Engineering"),
        employee("b", "Sales"),
        employee("c", "Operations"),
    ]
    staff[0].email = "a@example.test"
    staff[1].email = "b@example.test"
    staff[2].email = "c@example.test"
    event_at = datetime.now(UTC).replace(tzinfo=None)
    event = ("a", "b", "review", 1, event_at, event_at)

    class Result:
        def __init__(self, rows):
            self.rows = rows

        def all(self):
            return self.rows

    class Session:
        statements = []

        def exec(self, statement):
            self.statements.append(statement)
            entity = statement.column_descriptions[0]["entity"]
            rows = staff if entity is EmployeeTable else [event]
            return Result(rows)

    session = Session()
    result = compute_ona(
        limit=10,
        window_days=90,
        session=session,
        current_user=TokenData(
            user_id="user-1", email="user@example.test", tenant_id="tenant-1"
        ),
    )

    assert result["metrics"]["represented_record_count"] == 1
    assert result["metrics"]["tenant_employee_count"] == 3
    assert result["metrics"]["employees_without_qualifying_events"] == 1
    assert result["metrics"]["participant_count_before_display_limit"] == 2
    assert len(session.statements) == 2
    for statement in session.statements:
        assert "tenant_id" in str(statement)
        assert "tenant-1" in str(statement.compile().params.values())
