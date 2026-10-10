"""Empirical Markov transitions from tenant-uploaded employee role histories."""

from __future__ import annotations

from collections import defaultdict
from typing import Any


def _role_key(role: str) -> str:
    return " ".join(role.casefold().split())


def build_observed_role_transitions(
    snapshots: list[dict[str, Any]],
    current_role: str | None,
    *,
    selected_person_key: str | None = None,
    steps: int = 3,
) -> dict[str, Any]:
    """Estimate next-role-change probabilities from dated employee histories.

    A step means the next observed change of role. The data does not contain
    exposure time, so these probabilities are not annual promotion forecasts.
    """
    previous_role: dict[str, str] = {}
    previous_end: dict[str, Any] = {}
    role_labels: dict[str, str] = {}
    transition_counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    history_employees: set[str] = set()
    employee_transition_counts: dict[str, int] = defaultdict(int)
    valid_snapshots = 0

    for row in snapshots:
        person = str(row.get("person_key") or "").strip().casefold()
        role = row.get("role")
        start = row.get("recorded_at")
        end = row.get("end_at")
        if not person:
            continue
        if not isinstance(role, str) or not role.strip():
            # A missing role breaks that person's sequence; do not bridge across
            # an incomplete HR snapshot and invent an unobserved transition.
            previous_role.pop(person, None)
            previous_end.pop(person, None)
            continue
        key = _role_key(role)
        if not key:
            previous_role.pop(person, None)
            previous_end.pop(person, None)
            continue
        role_labels.setdefault(key, " ".join(role.split()))
        history_employees.add(person)
        valid_snapshots += 1
        prior = previous_role.get(person)
        prior_end = previous_end.get(person)
        overlaps = prior_end is not None and start is not None and prior_end > start
        if prior and prior != key and not overlaps:
            transition_counts[prior][key] += 1
            employee_transition_counts[person] += 1
        previous_role[person] = key
        previous_end[person] = end

    matrix: dict[str, dict[str, float]] = {}
    row_counts: dict[str, int] = {}
    for source, targets in transition_counts.items():
        total = sum(targets.values())
        if total:
            row_counts[source] = total
            matrix[source] = {
                target: count / total for target, count in targets.items()
            }

    normalized_current = (
        _role_key(current_role) if current_role and current_role.strip() else ""
    )
    has_current_role_history = bool(
        normalized_current and matrix.get(normalized_current)
    )
    model_status = (
        "exploratory_observed_transitions"
        if has_current_role_history
        else "insufficient_observed_transitions"
    )

    projections = []
    state_probs = {normalized_current: 1.0} if has_current_role_history else {}
    unknown_mass = 0.0
    for step in range(1, steps + 1):
        next_probs: dict[str, float] = defaultdict(float)
        step_unknown_mass = unknown_mass
        for state, probability in state_probs.items():
            outgoing = matrix.get(state)
            if not outgoing:
                step_unknown_mass += probability
                continue
            for target, transition_probability in outgoing.items():
                next_probs[target] += probability * transition_probability

        predictions = []
        for role_key, probability in sorted(
            next_probs.items(),
            key=lambda item: (-item[1], role_labels[item[0]].casefold()),
        ):
            prediction: dict[str, Any] = {
                "role": role_labels[role_key],
                "transition_probability": round(probability, 6),
            }
            if step == 1:
                prediction["observed_transition_count"] = transition_counts[
                    normalized_current
                ][role_key]
                prediction["observations_from_current_role"] = row_counts[
                    normalized_current
                ]
            predictions.append(prediction)

        modeled_mass = sum(next_probs.values())
        projections.append(
            {
                "step_number": step,
                "projected_time_horizon": (
                    "Next observed role change"
                    if step == 1
                    else f"After {step} observed role changes"
                ),
                "possibilities": predictions,
                "modeled_probability_mass": round(modeled_mass, 6),
                "unmodeled_probability_mass": round(max(0.0, 1.0 - modeled_mass), 6),
            }
        )
        state_probs = dict(next_probs)
        unknown_mass = step_unknown_mass

    return {
        "career_progression_markov": projections,
        "model_version": "tenant-uploaded-role-transitions-v2",
        "model_status": model_status,
        "validation_status": "not_validated_as_individual_forecast",
        "reason_code": (
            None
            if has_current_role_history
            else "NO_OBSERVED_TRANSITIONS_FROM_CURRENT_ROLE"
        ),
        "message": (
            None
            if has_current_role_history
            else "No dated uploaded employee role history contains transitions from this employee's current role. Transition probabilities are unavailable."
        ),
        "transition_unit": "next observed role change; no elapsed-time estimate",
        "current_role_has_observed_exits": has_current_role_history,
        "observed_transition_count": sum(row_counts.values()),
        "history_employee_count": len(history_employees),
        "role_state_count": len(role_labels),
        "current_employee_observed_transitions": employee_transition_counts.get(
            str(selected_person_key or "").strip().casefold(), 0
        ),
        "role_snapshot_count": valid_snapshots,
        "transition_observation_counts_by_role": {
            role_labels[role]: count for role, count in row_counts.items()
        },
        "transition_matrix": {
            role_labels[source]: {
                "observations": row_counts[source],
                "transitions": {
                    role_labels[target]: {
                        "count": count,
                        "probability": matrix[source][target],
                    }
                    for target, count in transition_counts[source].items()
                },
            }
            for source in matrix
        },
        "probability_estimator": "maximum-likelihood observed transition count divided by all observed exits from that role; no smoothing",
        "history_definition": "consecutive distinct dated employee experience roles per tenant; overlapping intervals are not counted as transitions",
    }
