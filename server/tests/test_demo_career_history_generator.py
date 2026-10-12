from datetime import date

from scripts.build_intelligence_ready_bundle import (
    _career_rows,
    _career_transition_quality,
)


def test_synthetic_career_bundle_has_branching_dated_transitions():
    employees = [
        {
            "email": f"sales-{index}@public.local",
            "department": "Sales",
            "role": "Sales Manager",
        }
        for index in range(6)
    ]
    experiences = {
        row["email"]: {"email": row["email"], "company": "Demo Company"}
        for row in employees
    }
    outcomes = {
        row["email"]: {
            "employment_duration_years": 8,
            "departure_event": False,
            "employment_start_date": "2018-01-01",
            "employment_end_date": None,
            "employment_censor_date": "2026-01-01",
        }
        for row in employees
    }

    rows = _career_rows(employees, experiences, outcomes)

    histories = {
        employee["email"]: sorted(
            [row for row in rows if row["email"] == employee["email"]],
            key=lambda row: str(row["effective_start"]),
        )
        for employee in employees
    }
    assert all(
        history[-1]["position"] == "Sales Manager" for history in histories.values()
    )
    assert all(row["effective_start"] for row in rows)
    assert any(row["position"] == "Key Account Manager" for row in rows)
    assert all(
        left["effective_end"] == right["effective_start"]
        for history in histories.values()
        for left, right in zip(history[:-1], history[1:], strict=True)
    )

    quality = _career_transition_quality(rows)
    assert quality["observed_role_changes"] > 0
    assert quality["roles_with_multiple_observed_next_roles"] >= 1


def test_synthetic_career_history_generation_is_reproducible():
    employee = {
        "email": "sales@example.local",
        "department": "Sales",
        "role": "Sales Manager",
    }
    experiences = {employee["email"]: {"email": employee["email"], "company": "Demo"}}
    outcomes = {
        employee["email"]: {
            "employment_duration_years": 8,
            "departure_event": False,
            "employment_start_date": date(2018, 1, 1).isoformat(),
            "employment_end_date": None,
            "employment_censor_date": "2026-01-01",
        }
    }

    first = _career_rows([employee], experiences, outcomes)
    second = _career_rows([employee], experiences, outcomes)

    assert first == second
