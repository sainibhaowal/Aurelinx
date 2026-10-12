from datetime import datetime
from types import SimpleNamespace
from uuid import uuid4

from app.api.v1.intelligence import list_career_path_employees, predict_career_path
from app.core.security import TokenData
from app.services.career_markov import build_observed_role_transitions


def test_markov_probabilities_are_frequencies_of_observed_role_changes():
    snapshots = [
        {"person_key": "one", "role": "Analyst"},
        {"person_key": "one", "role": "Engineer"},
        {"person_key": "one", "role": "Engineer"},  # Stable snapshot is not an exit.
        {"person_key": "one", "role": "Lead"},
        {"person_key": "two", "role": "analyst"},
        {"person_key": "two", "role": "Engineer"},
        {"person_key": "two", "role": "Senior Engineer"},
    ]

    result = build_observed_role_transitions(
        snapshots, "ANALYST", selected_person_key="one", steps=3
    )

    assert result["model_status"] == "exploratory_observed_transitions"
    assert result["observed_transition_count"] == 4
    assert result["current_employee_observed_transitions"] == 2
    first, second, third = result["career_progression_markov"]
    assert first["possibilities"] == [
        {
            "role": "Engineer",
            "transition_probability": 1.0,
            "observed_transition_count": 2,
            "observations_from_current_role": 2,
        }
    ]
    assert [row["transition_probability"] for row in second["possibilities"]] == [
        0.5,
        0.5,
    ]
    assert third["possibilities"] == []
    assert third["unmodeled_probability_mass"] == 1.0


def test_markov_does_not_fill_unknown_roles_or_bridge_missing_snapshots():
    result = build_observed_role_transitions(
        [
            {"person_key": "one", "role": "Analyst"},
            {"person_key": "one", "role": None},
            {"person_key": "one", "role": "Engineer"},
        ],
        "Software Engineer",
        steps=2,
    )

    assert result["model_status"] == "insufficient_observed_transitions"
    assert result["current_role_has_observed_exits"] is False
    assert all(
        not step["possibilities"] for step in result["career_progression_markov"]
    )


def test_career_path_endpoint_uses_tenant_uploaded_employee_experience():
    employee_id = uuid4()
    employee = SimpleNamespace(
        id=employee_id,
        tenant_id="tenant-a",
        email="selected@example.test",
        full_name="Selected Employee",
        role="Software Engineer",
    )
    history = [
        (
            "selected@example.test",
            "Software Engineer",
            datetime(2025, 1, 1),
            datetime(2025, 12, 31),
            False,
        ),
        (
            "other@example.test",
            "Software Engineer",
            datetime(2025, 1, 3),
            datetime(2025, 12, 31),
            False,
        ),
        (
            "selected@example.test",
            "Senior Software Engineer",
            datetime(2026, 1, 1),
            None,
            True,
        ),
        (
            "other@example.test",
            "Senior Software Engineer",
            datetime(2026, 1, 3),
            None,
            True,
        ),
    ]

    class Result:
        def __init__(self, rows):
            self.rows = rows

        def first(self):
            return self.rows[0] if self.rows else None

        def all(self):
            return self.rows

    class Session:
        statements = []

        def exec(self, statement):
            self.statements.append(statement)
            query = str(statement)
            if "FROM employeetable" in query:
                return Result([employee])
            if "FROM skills" in query:
                return Result([])
            if "FROM experiences" in query:
                return Result(history)
            raise AssertionError(f"Unexpected query: {query}")

    session = Session()
    result = predict_career_path(
        employee_id=employee_id,
        session=session,
        current_user=TokenData(
            user_id="user-a", email="user@example.test", tenant_id="tenant-a"
        ),
    )

    assert result["model_status"] == "exploratory_observed_transitions"
    assert result["observed_transition_count"] == 2
    assert result["current_employee_observed_transitions"] == 1
    assert (
        result["career_progression_markov"][0]["possibilities"][0][
            "transition_probability"
        ]
        == 1
    )
    assert (
        result["career_progression_markov"][0]["possibilities"][0][
            "observed_transition_count"
        ]
        == 2
    )
    assert all("tenant_id" in str(statement) for statement in session.statements)
    assert all(
        "tenant-a" in str(statement.compile().params.values())
        for statement in session.statements
    )
    selector = list_career_path_employees(
        limit=10,
        session=session,
        current_user=TokenData(
            user_id="user-a", email="user@example.test", tenant_id="tenant-a"
        ),
    )
    assert selector["employees"] == [
        {
            "id": employee_id,
            "full_name": "Selected Employee",
            "role": "Software Engineer",
        }
    ]
    assert selector["employee_scope_truncated"] is False
