#!/usr/bin/env python3
"""Build a deterministic, importable synthetic intelligence demo bundle.

The source people/profile/skill data and IBM benchmark outcomes are public
sample material. Career dates, salary, and collaboration events are simulated
to exercise Aurelinx workflows; they are not observations about real people.
"""

from __future__ import annotations

import csv
import hashlib
import json
import random
import shutil
import zipfile
from collections import Counter
from collections.abc import Iterable
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "Docs/datasets/production_sample_20260725"
IBM_SOURCE = ROOT / "Docs/datasets/raw/ibm_hr_attrition.csv"
OUTPUT_DIR = ROOT / "Docs/datasets/production_sample_20260725_career_demo"
ZIP_PATH = ROOT / "Docs/datasets/aurelinx_offline_career_markov_demo.zip"
AS_OF_DATE = date(2026, 10, 10)
RNG_SEED = 20260725

ROLE_LADDERS = {
    "Sales": [
        "Sales Representative",
        "Sales Executive",
        "Account Executive",
        "Sales Manager",
    ],
    "Engineering & IT": [
        "IT Specialist",
        "Software Engineer",
        "DevOps Engineer",
        "System Architect",
    ],
    "Finance & Accounting": [
        "Audit Specialist",
        "Financial Analyst",
        "Senior Accountant",
        "Finance Lead",
    ],
    "Human Resources": [
        "Recruiting Specialist",
        "HR Generalist",
        "People Operations",
        "Talent Partner",
    ],
    "Operations": [
        "Supply Chain Analyst",
        "Operations Manager",
        "Process Improvement Lead",
        "Manufacturing Director",
    ],
    "Customer Support": [
        "Customer Support Specialist",
        "Client Success Manager",
        "Support Operations Lead",
    ],
    "Research & Development": [
        "Laboratory Technician",
        "Research Associate",
        "Research Scientist",
        "Research Director",
    ],
    "Marketing": [
        "Brand Specialist",
        "Content Strategist",
        "Growth Marketing Specialist",
        "Digital Marketing Lead",
    ],
    "Product Management": [
        "Business Associate",
        "Product Analyst",
        "UX Researcher",
        "Product Manager",
    ],
    "Healthcare & Services": [
        "Healthcare Representative",
        "Field Services Specialist",
        "Compliance Lead",
    ],
}
# Plausible specialist/lead roles that create alternate routes between the
# source ladder roles. They are generated only as synthetic demo history, never
# added to the employee's current profile. This prevents the uploaded demo
# transition matrix from being a single deterministic ladder.
CAREER_BRIDGES = {
    ("Sales", 0): "Strategic Sales Representative",
    ("Sales", 1): "Enterprise Account Executive",
    ("Sales", 2): "Key Account Manager",
    ("Engineering & IT", 0): "Infrastructure Engineer",
    ("Engineering & IT", 1): "Platform Engineer",
    ("Engineering & IT", 2): "Cloud Architecture Lead",
    ("Finance & Accounting", 0): "Financial Reporting Analyst",
    ("Finance & Accounting", 1): "Senior Financial Analyst",
    ("Finance & Accounting", 2): "Accounting Manager",
    ("Human Resources", 0): "Talent Acquisition Partner",
    ("Human Resources", 1): "HR Business Partner",
    ("Human Resources", 2): "People Programs Lead",
    ("Operations", 0): "Logistics Analyst",
    ("Operations", 1): "Continuous Improvement Manager",
    ("Operations", 2): "Regional Operations Lead",
    ("Customer Support", 0): "Customer Experience Specialist",
    ("Customer Support", 1): "Customer Success Partner",
    ("Research & Development", 0): "Research Laboratory Associate",
    ("Research & Development", 1): "Applied Research Scientist",
    ("Research & Development", 2): "Principal Research Scientist",
    ("Marketing", 0): "Campaign Specialist",
    ("Marketing", 1): "Demand Generation Strategist",
    ("Marketing", 2): "Marketing Strategy Manager",
    ("Product Management", 0): "Product Operations Analyst",
    ("Product Management", 1): "Product Owner",
    ("Product Management", 2): "Product Strategy Lead",
    ("Healthcare & Services", 0): "Clinical Services Specialist",
    ("Healthcare & Services", 1): "Service Delivery Manager",
}
SALARY_BANDS_EUR = {
    "Sales": (38_000, 112_000),
    "Engineering & IT": (48_000, 142_000),
    "Finance & Accounting": (42_000, 108_000),
    "Human Resources": (39_000, 96_000),
    "Operations": (38_000, 105_000),
    "Customer Support": (32_000, 82_000),
    "Research & Development": (42_000, 118_000),
    "Marketing": (37_000, 98_000),
    "Product Management": (45_000, 125_000),
    "Healthcare & Services": (36_000, 94_000),
}
SAMPLE_COMPANIES = [
    "Northstar Labs",
    "Cedar Works",
    "Summit Partners",
    "Harbor Systems",
    "Blue Oak Group",
]

REQUIRED = (
    "employees_public.csv",
    "candidates_public.csv",
    "employee_skills_public.csv",
    "candidate_skills_public.csv",
    "employee_experience_public.csv",
    "candidate_experience_public.csv",
)


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, object]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def _widen_rows(rows: Iterable[dict[str, str]]) -> list[dict[str, object]]:
    widened_rows: list[dict[str, object]] = []
    for row in rows:
        widened: dict[str, object] = {}
        widened.update(row)
        widened_rows.append(widened)
    return widened_rows


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _date_text(value: date | None) -> str:
    return value.isoformat() if value else ""


def _add_years_ago(anchor: date, years: float) -> date:
    return anchor - timedelta(days=max(0, round(years * 365.2425)))


def _salary_eur(employee: dict[str, str], tenure: float, seed: int) -> int:
    low, high = SALARY_BANDS_EUR.get(employee["department"], (36_000, 100_000))
    ladder = ROLE_LADDERS.get(employee["department"], [])
    level = (
        ladder.index(employee["role"])
        if employee["role"] in ladder
        else max(0, len(ladder) // 2)
    )
    seniority = level / max(1, len(ladder) - 1)
    base = low + (high - low) * (0.25 + 0.60 * seniority)
    # Small stable variation keeps each demo record distinct without implausible outliers.
    variation = random.Random(seed).uniform(0.92, 1.08)
    tenure_adjustment = min(1.12, 1.0 + max(0.0, tenure - 2) * 0.008)
    return int(round(base * variation * tenure_adjustment / 1000) * 1000)


def _career_transition_quality(rows: list[dict[str, object]]) -> dict[str, int]:
    histories: dict[str, list[dict[str, object]]] = {}
    for row in rows:
        email = str(row.get("email") or "").strip().casefold()
        if email:
            histories.setdefault(email, []).append(row)
    transition_counts: dict[str, Counter[str]] = {}
    for history in histories.values():
        ordered = sorted(history, key=lambda row: str(row.get("effective_start") or ""))
        for previous, following in zip(ordered[:-1], ordered[1:], strict=True):
            source = str(previous.get("position") or "").strip()
            target = str(following.get("position") or "").strip()
            if source and target and source.casefold() != target.casefold():
                transition_counts.setdefault(source, Counter())[target] += 1
    return {
        "employee_histories_with_multiple_roles": sum(
            len(history) > 1 for history in histories.values()
        ),
        "observed_role_changes": sum(
            sum(targets.values()) for targets in transition_counts.values()
        ),
        "distinct_role_states_in_transitions": len(
            {
                role
                for source, targets in transition_counts.items()
                for role in (source, *targets.keys())
            }
        ),
        "distinct_transition_pairs": sum(
            len(targets) for targets in transition_counts.values()
        ),
        "roles_with_multiple_observed_next_roles": sum(
            len(targets) > 1 for targets in transition_counts.values()
        ),
        "roles_with_only_one_observed_next_role": sum(
            len(targets) == 1 for targets in transition_counts.values()
        ),
    }


def _career_rows(
    employees: list[dict[str, str]],
    experience_by_email: dict[str, dict[str, str]],
    outcomes_by_email: dict[str, dict[str, object]],
) -> list[dict[str, object]]:
    generated: list[dict[str, object]] = []
    for index, employee in enumerate(employees):
        outcome = outcomes_by_email[employee["email"]]
        tenure = max(0.0, float(str(outcome["employment_duration_years"])))
        departed = bool(outcome["departure_event"])
        start = date.fromisoformat(str(outcome["employment_start_date"]))
        end = date.fromisoformat(
            str(outcome.get("employment_end_date") or outcome["employment_censor_date"])
        )
        source = experience_by_email[employee["email"]]
        ladder = ROLE_LADDERS.get(employee["department"], [employee["role"]])
        current_index = (
            ladder.index(employee["role"]) if employee["role"] in ladder else 0
        )
        move_count = min(current_index, 3, int(tenure // 3.5))
        positions = ladder[current_index - move_count : current_index + 1]
        # Add a generated specialist or lead assignment on roughly one third
        # of eligible career moves. A stable per-person/per-stage seed keeps
        # the bundle reproducible while providing observed variation in the
        # demo transition matrix.
        routed_positions = [positions[0]] if positions else [employee["role"]]
        first_ladder_index = current_index - move_count
        for offset, next_role in enumerate(positions[1:]):
            source_index = first_ladder_index + offset
            bridge = CAREER_BRIDGES.get((employee["department"], source_index))
            if (
                bridge is not None
                and random.Random(RNG_SEED + index * 31 + source_index).random() < 0.35
            ):
                routed_positions.append(bridge)
            routed_positions.append(next_role)
        positions = routed_positions
        role_count = len(positions)
        total_days = max(0, (end - start).days)
        if role_count == 1:
            segment_days = [total_days]
        else:
            # Give recent roles slightly more time while keeping the timeline contiguous.
            weights = list(range(1, role_count + 1))
            segment_days = [total_days * weight // sum(weights) for weight in weights]
            segment_days[-1] += total_days - sum(segment_days)
        cursor = start
        for role_index, (position, duration_days) in enumerate(
            zip(positions, segment_days, strict=True)
        ):
            role_start = cursor
            role_end = cursor + timedelta(days=duration_days)
            is_last = role_index == role_count - 1
            generated.append(
                {
                    **source,
                    "company": (
                        source["company"]
                        if is_last
                        else SAMPLE_COMPANIES[
                            (index + role_index) % len(SAMPLE_COMPANIES)
                        ]
                    ),
                    "position": position,
                    "duration_years": f"{duration_days / 365.2425:.3f}",
                    "description": (
                        f"Synthetic demo career record for {position}; dates and sequence are generated for workflow demonstration."
                    ),
                    "external_record_id": f"employee-career:{index + 1}:{role_index + 1}",
                    "effective_start": _date_text(role_start),
                    "effective_end": (
                        _date_text(role_end) if (not is_last or departed) else ""
                    ),
                    "is_current": "true" if (is_last and not departed) else "false",
                }
            )
            cursor = role_end
    return generated


def _collaboration_rows(
    employees: list[dict[str, str]], outcomes: list[dict[str, object]]
) -> list[dict[str, str]]:
    """Create deterministic simulated activity over valid employment overlaps."""
    rng = random.Random(RNG_SEED)
    by_department: dict[str, list[int]] = {}
    for index, employee in enumerate(employees):
        by_department.setdefault(employee["department"], []).append(index)
    # Build small departmental team rings and a cross-functional bridge network.
    pairs: set[tuple[int, int]] = set()
    teams: list[list[int]] = []
    for member_indices in by_department.values():
        for start in range(0, len(member_indices), 10):
            team = member_indices[start : start + 10]
            teams.append(team)
            if len(team) > 1:
                for position, left in enumerate(team):
                    for offset in (1, 2):
                        if len(team) > offset:
                            right = team[(position + offset) % len(team)]
                            pairs.add((min(left, right), max(left, right)))
    for team_index, team in enumerate(teams):
        next_team = teams[(team_index + 3) % len(teams)] if len(teams) > 1 else []
        if team and next_team:
            left = team[len(team) // 2]
            right = next_team[len(next_team) // 2]
            pairs.add((min(left, right), max(left, right)))

    events: list[dict[str, str]] = []
    for pair_number, (left, right) in enumerate(sorted(pairs)):
        left_outcome, right_outcome = outcomes[left], outcomes[right]
        left_start = date.fromisoformat(str(left_outcome["employment_start_date"]))
        right_start = date.fromisoformat(str(right_outcome["employment_start_date"]))
        left_end = date.fromisoformat(
            str(left_outcome.get("employment_end_date") or AS_OF_DATE.isoformat())
        )
        right_end = date.fromisoformat(
            str(right_outcome.get("employment_end_date") or AS_OF_DATE.isoformat())
        )
        overlap_start = max(left_start, right_start, AS_OF_DATE - timedelta(days=365))
        overlap_end = min(left_end, right_end, AS_OF_DATE)
        span = (overlap_end - overlap_start).days
        if span < 0:
            continue
        count = 1 + (pair_number % 3)
        for occurrence in range(count):
            occurred = overlap_start + timedelta(days=rng.randint(0, max(0, span)))
            events.append(
                {
                    "external_event_id": f"demo-collab-{pair_number + 1:06d}-{occurrence + 1:02d}",
                    "employee_a_email": employees[left]["email"],
                    "employee_b_email": employees[right]["email"],
                    "event_type": (
                        "project_planning",
                        "code_review",
                        "customer_handoff",
                        "knowledge_sharing",
                    )[occurrence % 4],
                    "occurred_at": f"{occurred.isoformat()}T{9 + (occurrence % 8):02d}:00:00",
                }
            )
    return events


def main() -> None:
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir(parents=True)

    original: dict[str, tuple[list[str], list[dict[str, str]]]] = {
        name: read_csv(SOURCE_DIR / name) for name in REQUIRED
    }
    ibm_fields, ibm_rows = read_csv(IBM_SOURCE)
    if len(original["employees_public.csv"][1]) != len(ibm_rows):
        raise SystemExit(
            "Employee and source benchmark row counts differ; refusing positional linkage."
        )
    if not {"EmployeeNumber", "Attrition", "MonthlyIncome", "YearsAtCompany"}.issubset(
        ibm_fields
    ):
        raise SystemExit("Benchmark source is missing required outcome fields.")

    employees_fields, employees = original["employees_public.csv"]
    employee_extras = [
        "benchmark_source_id",
        "employment_duration_years",
        "departure_event",
        "salary",
        "salary_currency",
        "salary_period",
        "employment_status",
        "employment_start_date",
        "employment_end_date",
        "employment_censor_date",
    ]
    enriched_employees: list[dict[str, object]] = []
    outcomes_by_email: dict[str, dict[str, object]] = {}
    event_counts: Counter[str] = Counter()
    zero_duration = 0
    for index, (employee, benchmark) in enumerate(
        zip(employees, ibm_rows, strict=True)
    ):
        # The source bundle was created from this exact benchmark in row order;
        # keep the relationship explicit and independently auditable in output.
        if not employee["email"].lower().endswith(f"emp{index + 1:05d}@public.local"):
            raise SystemExit(
                f"Employee row {index + 1} does not match the documented benchmark order."
            )
        duration = float(benchmark["YearsAtCompany"])
        event = benchmark["Attrition"].strip().casefold() == "yes"
        # The benchmark has durations and outcomes, but no calendar dates.
        # Anchor a clearly synthetic calendar timeline to the source sample date.
        rng = random.Random(RNG_SEED + index)
        departure_date = (
            AS_OF_DATE - timedelta(days=rng.randint(30, 5 * 365)) if event else None
        )
        end_date = departure_date or AS_OF_DATE
        start_date = _add_years_ago(end_date, duration)
        zero_duration += int(duration <= 0)
        event_counts["departures"] += int(event and duration > 0)
        event_counts["censored"] += int(not event and duration > 0)
        outcome: dict[str, object] = {
            "employment_duration_years": duration,
            "departure_event": event,
            "employment_status": "departed" if event else "active",
            "employment_start_date": _date_text(start_date),
            "employment_end_date": _date_text(departure_date),
            "employment_censor_date": _date_text(AS_OF_DATE if not event else None),
        }
        outcomes_by_email[employee["email"]] = outcome
        enriched_employees.append(
            {
                **employee,
                "benchmark_source_id": benchmark["EmployeeNumber"],
                "employment_duration_years": benchmark["YearsAtCompany"],
                "departure_event": "true" if event else "false",
                "employment_status": outcome["employment_status"],
                "salary": _salary_eur(employee, duration, RNG_SEED + index),
                "salary_currency": "EUR",
                "salary_period": "annual",
                **{
                    key: outcome[key]
                    for key in (
                        "employment_start_date",
                        "employment_end_date",
                        "employment_censor_date",
                    )
                },
            }
        )

    original_experience = original["employee_experience_public.csv"][1]
    experience_by_email = {
        row["email"].strip().casefold(): row for row in original_experience
    }
    if len(experience_by_email) != len(employees) or set(experience_by_email) != {
        row["email"].casefold() for row in employees
    }:
        raise SystemExit(
            "Employee experience rows do not map one-to-one to employee identities."
        )
    dated_employee_experiences = _career_rows(
        employees, experience_by_email, outcomes_by_email
    )
    collaboration_events = _collaboration_rows(employees, enriched_employees)

    employee_emails = {row["email"].casefold() for row in employees}
    if len({row["external_event_id"] for row in collaboration_events}) != len(
        collaboration_events
    ):
        raise SystemExit("Generated collaboration event IDs are not unique.")
    if any(
        row["employee_a_email"].casefold() not in employee_emails
        or row["employee_b_email"].casefold() not in employee_emails
        or row["employee_a_email"].casefold() == row["employee_b_email"].casefold()
        for row in collaboration_events
    ):
        raise SystemExit(
            "Generated collaboration event has an invalid employee reference."
        )
    for email in employee_emails:
        career = sorted(
            (
                row
                for row in dated_employee_experiences
                if str(row.get("email") or "").casefold() == email
            ),
            key=lambda row: str(row.get("effective_start") or ""),
        )
        if any(
            not row.get("effective_start")
            or float(str(row.get("duration_years") or 0)) < 0
            for row in career
        ):
            raise SystemExit(
                f"Generated career history has invalid dates or duration for {email}."
            )
        if any(
            career[position]["effective_end"] != career[position + 1]["effective_start"]
            for position in range(len(career) - 1)
        ):
            raise SystemExit(
                f"Generated career history has a gap or overlap for {email}."
            )

    for name in REQUIRED:
        fields, source_rows = original[name]
        rows_for_output = _widen_rows(source_rows)
        if name == "employees_public.csv":
            fields = fields + [
                field for field in employee_extras if field not in fields
            ]
            rows_for_output = enriched_employees
        elif name == "employee_experience_public.csv":
            fields = fields + [
                field
                for field in (
                    "external_record_id",
                    "effective_start",
                    "effective_end",
                    "is_current",
                )
                if field not in fields
            ]
            rows_for_output = dated_employee_experiences
        elif name == "candidate_experience_public.csv":
            fields = fields + [
                field
                for field in (
                    "external_record_id",
                    "effective_start",
                    "effective_end",
                    "is_current",
                )
                if field not in fields
            ]
            rows_for_output = [
                {
                    **row,
                    "external_record_id": f"candidate-experience:{index + 1}",
                    "effective_start": "",
                    "effective_end": "",
                    "is_current": "",
                }
                for index, row in enumerate(source_rows)
            ]
        target = OUTPUT_DIR / name
        write_csv(target, fields, rows_for_output)

    write_csv(
        OUTPUT_DIR / "collaboration_events.csv",
        [
            "external_event_id",
            "employee_a_email",
            "employee_b_email",
            "event_type",
            "occurred_at",
        ],
        _widen_rows(collaboration_events),
    )
    write_csv(
        OUTPUT_DIR / "skill_aliases.csv",
        ["alias", "canonical_skill", "approved"],
        [],
    )

    employee_skill_names = {
        " ".join(str(row.get("skill_name", row.get("name", ""))).casefold().split())
        for row in original["employee_skills_public.csv"][1]
    }
    # Read the app ontology directly so this report reflects current code.
    from app.api.v1.intelligence import FULL_SKILL_GRAPH, _resolve_skill_name

    mapped_names = {
        name
        for name in employee_skill_names
        if _resolve_skill_name(name) in FULL_SKILL_GRAPH
    }
    quality = {
        "generated_from": SOURCE_DIR.relative_to(ROOT).as_posix(),
        "source_row_counts": {name: len(rows) for name, (_, rows) in original.items()},
        "bundle_row_counts": {
            **{name: len(rows) for name, (_, rows) in original.items()},
            "employees_public.csv": len(enriched_employees),
            "employee_experience_public.csv": len(dated_employee_experiences),
            "collaboration_events.csv": len(collaboration_events),
            "skill_aliases.csv": 0,
        },
        "employee_outcomes": {
            "source": IBM_SOURCE.relative_to(ROOT).as_posix(),
            "source_sha256": sha256(IBM_SOURCE),
            "source_rows": len(ibm_rows),
            "row_linkage": "positional: source sample employee row N is linked to IBM EmployeeNumber at row N; generated pseudonymous identities are not IBM identities",
            "valid_positive_duration_observations": len(ibm_rows) - zero_duration,
            "excluded_zero_duration_observations": zero_duration,
            "observed_departures_among_positive_durations": event_counts["departures"],
            "right_censored_among_positive_durations": event_counts["censored"],
            "calendar_dates_available": True,
            "calendar_dates_are_synthetic": True,
            "as_of_date": AS_OF_DATE.isoformat(),
            "departed_employees": sum(
                row["employment_status"] == "departed" for row in enriched_employees
            ),
            "active_employees": sum(
                row["employment_status"] == "active" for row in enriched_employees
            ),
            "individual_forecasts_available": False,
            "interpretation": "public benchmark outcome labels with simulated calendar dates; useful for demonstrating cohort survival calculations, not validated for individual decisions",
        },
        "salary": {
            "source_field": "deterministic synthetic salary bands by department and role",
            "period": "annual",
            "currency": "EUR",
            "salary_records": sum(
                bool(row.get("salary")) for row in enriched_employees
            ),
            "budget_comparison_ready": True,
            "synthetic": True,
            "interpretation": "simulated annual EUR compensation for demonstrating budget workflows only; not observed or market-validated pay",
        },
        "career_history": {
            "employee_experience_rows": len(dated_employee_experiences),
            "employees_with_multiple_ordered_roles": sum(
                1
                for email in experience_by_email
                if sum(
                    str(row.get("email") or "").casefold() == email
                    for row in dated_employee_experiences
                )
                > 1
            ),
            "dated_employee_experience_rows": sum(
                bool(row["effective_start"]) for row in dated_employee_experiences
            ),
            "career_transitions_supported": True,
            "sequences_are_synthetic": True,
            "transition_quality": _career_transition_quality(
                dated_employee_experiences
            ),
            "transition_interpretation": "Counts and proportions describe generated demo career sequences only; they are not observed Aurelinx or industry mobility rates.",
        },
        "collaboration": {
            "event_rows": len(collaboration_events),
            "dated_collaboration_events_supported": True,
            "events_are_synthetic": True,
            "unique_employees_linked": len(
                {
                    email
                    for row in collaboration_events
                    for email in (row["employee_a_email"], row["employee_b_email"])
                }
            ),
            "unique_pairs": len(
                {
                    tuple(sorted((row["employee_a_email"], row["employee_b_email"])))
                    for row in collaboration_events
                }
            ),
            "duplicate_event_ids": len(collaboration_events)
            - len({row["external_event_id"] for row in collaboration_events}),
        },
        "skill_mapping": {
            "distinct_uploaded_employee_skill_names": len(employee_skill_names),
            "names_mapped_by_current_app_ontology": len(mapped_names),
            "unmapped_names": len(employee_skill_names - mapped_names),
            "aliases_added": 0,
            "aliases_are_not_guessed": True,
        },
        "preservation": "Original source CSVs are never modified. The bundle carries the source profile/skill rows and adds clearly marked synthetic outcomes, dates, career records, collaboration events, and annual EUR salary for demo workflows.",
    }
    (OUTPUT_DIR / "DATA_QUALITY_REPORT.json").write_text(
        json.dumps(quality, indent=2) + "\n", encoding="utf-8"
    )
    (OUTPUT_DIR / "PROVENANCE.json").write_text(
        json.dumps(
            {
                "dataset_type": "offline synthetic production-shaped demonstration bundle",
                "source_bundle": SOURCE_DIR.relative_to(ROOT).as_posix(),
                "outcome_source": IBM_SOURCE.relative_to(ROOT).as_posix(),
                "outcome_source_sha256": sha256(IBM_SOURCE),
                "synthetic_identity_notice": "This bundle is synthetic demo data. The pseudonymous profiles originate from the public Aurelinx sample; IBM HR Attrition outcome labels are linked by the documented row relationship; all calendar dates, role sequences, collaboration events, and EUR salary values are simulated. No records describe real Aurelinx employees.",
                "career_history_method": "Role paths are generated from department career ladders with deterministic optional specialist/lead assignments to create multiple observed transitions in the demo matrix. This is synthetic workflow data, not observed employee mobility.",
                "as_of_date": AS_OF_DATE.isoformat(),
                "generation_seed": RNG_SEED,
                "prohibited_interpretations": [
                    "not an organization-specific HR dataset",
                    "not a validated individual attrition forecast",
                    "not real compensation or salary market evidence",
                    "not observed career progression",
                    "not evidence of actual collaboration between employees",
                ],
                "source_file_hashes": {
                    name: sha256(SOURCE_DIR / name) for name in REQUIRED
                },
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    (OUTPUT_DIR / "README.txt").write_text(
        "Aurelinx offline intelligence demo bundle\n\n"
        "This production-shaped sample is designed to exercise the Aurelinx employee, candidate, skills, career, ONA, survival, and team budget workflows.\n"
        "All records are synthetic/demo data. IBM public benchmark outcome labels are linked to pseudonymous sample employees by the source builder's documented row order.\n"
        "Calendar dates, role sequences, employee collaboration events, and annual EUR compensation are deterministically simulated so the workflows have complete, coherent input fields.\n"
        "Career paths include deterministic alternate specialist/lead routes. Career Markov displays empirical counts from these generated paths; those probabilities demonstrate the product and are not observed workforce mobility rates.\n"
        "These generated dates, career moves, relationships, and salaries are not actual observations, market compensation, or validated individual forecasts. Use them for product demonstrations and pipeline checks, not employment decisions.\n"
        "Candidate records remain separate and do not receive employee attrition outcomes or collaboration events. Original source CSVs in production_sample_20260725 are never modified.\n"
        "Bundle import merges rows and preserves records absent from the ZIP. Review DATA_QUALITY_REPORT.json and PROVENANCE.json before use.\n",
        encoding="utf-8",
    )

    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(OUTPUT_DIR.iterdir()):
            archive.write(path, arcname=path.name)

    with zipfile.ZipFile(ZIP_PATH) as archive:
        bad_member = archive.testzip()
        if bad_member:
            raise SystemExit(f"ZIP integrity failure at {bad_member}")
        members = set(archive.namelist())
        expected = set(REQUIRED) | {
            "collaboration_events.csv",
            "skill_aliases.csv",
            "DATA_QUALITY_REPORT.json",
            "PROVENANCE.json",
            "README.txt",
        }
        missing = expected - members
        if missing:
            raise SystemExit(f"Bundle missing required files: {sorted(missing)}")
    print(
        json.dumps(
            {"folder": str(OUTPUT_DIR), "zip": str(ZIP_PATH), "quality": quality},
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
