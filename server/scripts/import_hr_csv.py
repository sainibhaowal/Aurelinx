"""
Import HR data from CSV files into Aurelinx tables.

Usage (from server directory):
  python scripts/import_hr_csv.py --employees employees.csv
  python scripts/import_hr_csv.py --employees employees.csv --candidates candidates.csv
  python scripts/import_hr_csv.py --employees employees.csv --employee-skills employee_skills.csv --employee-experience employee_experience.csv
"""

from __future__ import annotations

import argparse
import csv
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

from sqlmodel import Session, select

SERVER_ROOT = Path(__file__).resolve().parent.parent
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from app.models.database import (  # noqa: E402
    CandidateTable,
    EmployeeTable,
    ExperienceTable,
    SkillTable,
    engine,
)

REQUIRED_EMPLOYEE_COLUMNS = {"full_name", "email", "department", "role"}
REQUIRED_CANDIDATE_COLUMNS = {"full_name", "email", "department", "role"}
REQUIRED_SKILLS_COLUMNS = {"email", "skill_name", "level"}
REQUIRED_EXPERIENCE_COLUMNS = {
    "email",
    "company",
    "position",
    "duration_years",
    "description",
}


@dataclass
class ImportStats:
    created: int = 0
    updated: int = 0
    skipped: int = 0


def _read_csv(path: Path) -> Tuple[List[Dict[str, str]], List[str]]:
    if not path.exists():
        raise FileNotFoundError(f"CSV file not found: {path}")
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = [
            {(k or "").strip(): (v or "").strip() for k, v in row.items()}
            for row in reader
        ]
        return rows, [h.strip() for h in (reader.fieldnames or [])]


def _assert_columns(
    file_label: str, headers: Iterable[str], required: set[str]
) -> None:
    missing = sorted(required - set(headers))
    if missing:
        raise ValueError(
            f"{file_label} is missing required columns: {', '.join(missing)}"
        )


def _to_bool(value: str, default: bool = False) -> bool:
    if not value:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y"}


def _to_float(value: str, default: Optional[float] = None) -> Optional[float]:
    if value == "":
        return default
    try:
        return float(value)
    except ValueError:
        return default


def _upsert_employees(
    session: Session, rows: List[Dict[str, str]]
) -> Tuple[ImportStats, Dict[str, EmployeeTable]]:
    stats = ImportStats()
    email_index: Dict[str, EmployeeTable] = {}
    for row in rows:
        email = row.get("email", "").lower()
        if not email:
            stats.skipped += 1
            continue

        existing = session.exec(
            select(EmployeeTable).where(EmployeeTable.email == email)
        ).first()
        if existing:
            existing.full_name = row["full_name"] or existing.full_name
            existing.department = row["department"] or existing.department
            existing.role = row["role"] or existing.role
            if "sentiment_score" in row:
                sentiment = _to_float(
                    row.get("sentiment_score", ""), existing.sentiment_score
                )
                if sentiment is not None:
                    existing.sentiment_score = sentiment
            if "retention_prob" in row:
                existing.retention_prob = _to_float(
                    row.get("retention_prob", ""), existing.retention_prob
                )
            if "is_at_risk" in row:
                existing.is_at_risk = _to_bool(
                    row.get("is_at_risk", ""), existing.is_at_risk
                )
            session.add(existing)
            email_index[email] = existing
            stats.updated += 1
            continue

        employee = EmployeeTable(
            full_name=row["full_name"],
            email=email,
            department=row["department"],
            role=row["role"],
            sentiment_score=_to_float(row.get("sentiment_score", ""), 0.5) or 0.5,
            retention_prob=_to_float(row.get("retention_prob", ""), None),
            is_at_risk=_to_bool(row.get("is_at_risk", ""), False),
        )
        session.add(employee)
        session.flush()
        email_index[email] = employee
        stats.created += 1

    return stats, email_index


def _upsert_candidates(
    session: Session, rows: List[Dict[str, str]]
) -> Tuple[ImportStats, Dict[str, CandidateTable]]:
    stats = ImportStats()
    email_index: Dict[str, CandidateTable] = {}
    for row in rows:
        email = row.get("email", "").lower()
        if not email:
            stats.skipped += 1
            continue

        existing = session.exec(
            select(CandidateTable).where(CandidateTable.email == email)
        ).first()
        if existing:
            existing.full_name = row["full_name"] or existing.full_name
            existing.department = row["department"] or existing.department
            existing.role = row["role"] or existing.role
            if "sentiment_score" in row:
                sentiment = _to_float(
                    row.get("sentiment_score", ""), existing.sentiment_score
                )
                if sentiment is not None:
                    existing.sentiment_score = sentiment
            if "match_score" in row:
                existing.match_score = _to_float(
                    row.get("match_score", ""), existing.match_score
                )
            session.add(existing)
            email_index[email] = existing
            stats.updated += 1
            continue

        candidate = CandidateTable(
            full_name=row["full_name"],
            email=email,
            department=row["department"],
            role=row["role"],
            sentiment_score=_to_float(row.get("sentiment_score", ""), 0.5) or 0.5,
            match_score=_to_float(row.get("match_score", ""), None),
        )
        session.add(candidate)
        session.flush()
        email_index[email] = candidate
        stats.created += 1

    return stats, email_index


def _import_skills(
    session: Session,
    rows: List[Dict[str, str]],
    employee_index: Dict[str, EmployeeTable],
    candidate_index: Dict[str, CandidateTable],
) -> ImportStats:
    stats = ImportStats()
    for row in rows:
        email = row.get("email", "").lower()
        skill_name = row.get("skill_name", "")
        level = int(_to_float(row.get("level", ""), 1) or 1)
        level = max(1, min(5, level))
        if not email or not skill_name:
            stats.skipped += 1
            continue

        employee = (
            employee_index.get(email)
            or session.exec(
                select(EmployeeTable).where(EmployeeTable.email == email)
            ).first()
        )
        candidate = (
            candidate_index.get(email)
            or session.exec(
                select(CandidateTable).where(CandidateTable.email == email)
            ).first()
        )
        if not employee and not candidate:
            stats.skipped += 1
            continue

        query = select(SkillTable).where(
            SkillTable.name == skill_name, SkillTable.level == level
        )
        if employee:
            query = query.where(SkillTable.employee_id == employee.id)
        if candidate:
            query = query.where(SkillTable.candidate_id == candidate.id)
        existing = session.exec(query).first()
        if existing:
            stats.skipped += 1
            continue

        skill = SkillTable(
            name=skill_name,
            level=level,
            employee_id=employee.id if employee else None,
            candidate_id=candidate.id if candidate else None,
        )
        session.add(skill)
        stats.created += 1
    return stats


def _import_experience(
    session: Session,
    rows: List[Dict[str, str]],
    employee_index: Dict[str, EmployeeTable],
    candidate_index: Dict[str, CandidateTable],
) -> ImportStats:
    stats = ImportStats()
    for row in rows:
        email = row.get("email", "").lower()
        if not email:
            stats.skipped += 1
            continue

        employee = (
            employee_index.get(email)
            or session.exec(
                select(EmployeeTable).where(EmployeeTable.email == email)
            ).first()
        )
        candidate = (
            candidate_index.get(email)
            or session.exec(
                select(CandidateTable).where(CandidateTable.email == email)
            ).first()
        )
        if not employee and not candidate:
            stats.skipped += 1
            continue

        company = row.get("company", "")
        position = row.get("position", "")
        description = row.get("description", "")
        duration = _to_float(row.get("duration_years", ""), 0.0) or 0.0
        if not company or not position:
            stats.skipped += 1
            continue

        exp = ExperienceTable(
            company=company,
            position=position,
            duration_years=duration,
            description=description or "Imported from CSV",
            employee_id=employee.id if employee else None,
            candidate_id=candidate.id if candidate else None,
        )
        session.add(exp)
        stats.created += 1
    return stats


def _parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Import HR CSV data into Aurelinx")
    p.add_argument("--employees", type=Path, help="employees.csv")
    p.add_argument("--candidates", type=Path, help="candidates.csv")
    p.add_argument(
        "--employee-skills",
        type=Path,
        help="employee_skills.csv (email,skill_name,level)",
    )
    p.add_argument(
        "--candidate-skills",
        type=Path,
        help="candidate_skills.csv (email,skill_name,level)",
    )
    p.add_argument("--employee-experience", type=Path, help="employee_experience.csv")
    p.add_argument("--candidate-experience", type=Path, help="candidate_experience.csv")
    return p


def main() -> None:
    args = _parser().parse_args()
    if not any(
        [
            args.employees,
            args.candidates,
            args.employee_skills,
            args.candidate_skills,
            args.employee_experience,
            args.candidate_experience,
        ]
    ):
        raise SystemExit(
            "No files provided. Use --employees and/or --candidates (and optional skills/experience files)."
        )

    with Session(engine) as session:
        employee_index: Dict[str, EmployeeTable] = {}
        candidate_index: Dict[str, CandidateTable] = {}

        if args.employees:
            rows, headers = _read_csv(args.employees)
            _assert_columns("employees.csv", headers, REQUIRED_EMPLOYEE_COLUMNS)
            stats, employee_index = _upsert_employees(session, rows)
            print(
                f"Employees: created={stats.created}, updated={stats.updated}, skipped={stats.skipped}"
            )

        if args.candidates:
            rows, headers = _read_csv(args.candidates)
            _assert_columns("candidates.csv", headers, REQUIRED_CANDIDATE_COLUMNS)
            stats, candidate_index = _upsert_candidates(session, rows)
            print(
                f"Candidates: created={stats.created}, updated={stats.updated}, skipped={stats.skipped}"
            )

        if args.employee_skills:
            rows, headers = _read_csv(args.employee_skills)
            _assert_columns("employee_skills.csv", headers, REQUIRED_SKILLS_COLUMNS)
            stats = _import_skills(session, rows, employee_index, {})
            print(f"Employee skills: created={stats.created}, skipped={stats.skipped}")

        if args.candidate_skills:
            rows, headers = _read_csv(args.candidate_skills)
            _assert_columns("candidate_skills.csv", headers, REQUIRED_SKILLS_COLUMNS)
            stats = _import_skills(session, rows, {}, candidate_index)
            print(f"Candidate skills: created={stats.created}, skipped={stats.skipped}")

        if args.employee_experience:
            rows, headers = _read_csv(args.employee_experience)
            _assert_columns(
                "employee_experience.csv", headers, REQUIRED_EXPERIENCE_COLUMNS
            )
            stats = _import_experience(session, rows, employee_index, {})
            print(
                f"Employee experience: created={stats.created}, skipped={stats.skipped}"
            )

        if args.candidate_experience:
            rows, headers = _read_csv(args.candidate_experience)
            _assert_columns(
                "candidate_experience.csv", headers, REQUIRED_EXPERIENCE_COLUMNS
            )
            stats = _import_experience(session, rows, {}, candidate_index)
            print(
                f"Candidate experience: created={stats.created}, skipped={stats.skipped}"
            )

        session.commit()
        print("Import completed.")


if __name__ == "__main__":
    main()
