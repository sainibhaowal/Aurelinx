import asyncio
import csv
import io
import zipfile
from datetime import datetime

from sqlalchemy import create_engine, func, select
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel
from starlette.datastructures import UploadFile

from app.api.v1.employees import _employee_sensitive_values
from app.api.v1.lean_enterprise import _import_rows_for_kind, import_dataset_bundle
from app.core.security import TokenData
from app.models.database import (
    CandidateTable,
    CollaborationEventTable,
    EmployeeTable,
    ExperienceTable,
    SkillAliasTable,
    SkillTable,
)


def test_uploaded_intelligence_records_are_tenant_scoped_and_idempotent():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        _import_rows_for_kind(
            session,
            "tenant-a",
            "employees",
            [
                {
                    "email": "a@example.test",
                    "full_name": "A",
                    "department": "Engineering",
                    "role": "Senior Engineer",
                    "salary": "120000",
                    "salary_currency": "USD",
                    "salary_period": "annual",
                    "employment_start_date": "2021-01-01",
                    "departure_event": "false",
                    "employment_censor_date": "2026-01-01",
                },
                {
                    "email": "b@example.test",
                    "full_name": "B",
                    "department": "Engineering",
                    "role": "Engineer",
                    "salary": "110000",
                    "salary_currency": "USD",
                    "salary_period": "annual",
                    "employment_start_date": "2022-01-01",
                    "departure_event": "false",
                    "employment_censor_date": "2026-01-01",
                },
            ],
        )
        session.commit()

        experience = {
            "employee_email": "a@example.test",
            "company": "Example",
            "position": "Engineer",
            "effective_start": "2021-01-01",
            "effective_end": "2023-01-01",
            "duration_years": "2",
            "external_record_id": "experience-1",
        }
        assert (
            _import_rows_for_kind(
                session, "tenant-a", "employee_experience", [experience]
            )
            == 1
        )
        assert (
            _import_rows_for_kind(
                session, "tenant-a", "employee_experience", [experience]
            )
            == 1
        )
        session.commit()

        interactions = [
            {
                "employee_a_email": "a@example.test",
                "employee_b_email": "b@example.test",
                "occurred_at": "2025-01-01T09:00:00",
                "event_type": "project",
            },
            {
                "employee_a_email": "b@example.test",
                "employee_b_email": "a@example.test",
                "occurred_at": "2025-01-01T09:00:00",
                "event_type": "project",
            },
        ]
        assert (
            _import_rows_for_kind(
                session, "tenant-a", "collaboration_events", interactions
            )
            == 1
        )
        assert (
            _import_rows_for_kind(
                session,
                "tenant-a",
                "skill_aliases",
                [
                    {"alias": "golang", "canonical_skill": "Go", "approved": "true"},
                ],
            )
            == 1
        )
        session.commit()

        assert (
            session.exec(
                select(func.count())
                .select_from(EmployeeTable)
                .where(EmployeeTable.tenant_id == "tenant-a")
            ).scalar_one()
            == 2
        )
        assert (
            session.exec(
                select(func.count())
                .select_from(ExperienceTable)
                .where(ExperienceTable.tenant_id == "tenant-a")
            ).scalar_one()
            == 1
        )
        assert (
            session.exec(
                select(func.count())
                .select_from(CollaborationEventTable)
                .where(CollaborationEventTable.tenant_id == "tenant-a")
            ).scalar_one()
            == 1
        )
        assert (
            session.exec(
                select(func.count())
                .select_from(SkillAliasTable)
                .where(SkillAliasTable.tenant_id == "tenant-a")
            ).scalar_one()
            == 1
        )
        assert (
            session.exec(
                select(func.count())
                .select_from(EmployeeTable)
                .where(EmployeeTable.tenant_id == "tenant-b")
            ).scalar_one()
            == 0
        )
        employee = (
            session.exec(
                select(EmployeeTable).where(EmployeeTable.email == "a@example.test")
            )
            .scalars()
            .first()
        )
        assert employee.salary_currency == "USD"
        assert employee.salary_period == "annual"
        assert employee.employment_start_date == datetime(2021, 1, 1)
        assert employee.employment_censor_date == datetime(2026, 1, 1)

    engine.dispose()


def test_bundle_import_merges_without_deleting_existing_tenant_records():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    tenant = "merge-tenant"
    user = TokenData(
        user_id="00000000-0000-0000-0000-000000000001",
        email="admin@example.test",
        is_admin=True,
        tenant_id=tenant,
    )
    with Session(engine) as session:
        existing = EmployeeTable(
            tenant_id=tenant,
            full_name="Keep Existing",
            email="keep@example.test",
            department="Finance",
            role="Analyst",
        )
        matched_employee = EmployeeTable(
            tenant_id=tenant,
            full_name="Prior Employee Name",
            email="new@example.test",
            department="Prior Department",
            role="Prior Role",
            salary=9000,
            salary_currency="USD",
            salary_period="annual",
        )
        matched_candidate = CandidateTable(
            tenant_id=tenant,
            full_name="Prior Candidate Name",
            email="candidate@example.test",
            department="Prior Candidate Department",
            role="Prior Candidate Role",
            sentiment_score=0.8,
            match_score=0.7,
        )
        session.add_all([existing, matched_employee, matched_candidate])
        session.commit()
        session.add_all(
            [
                SkillTable(
                    tenant_id=tenant,
                    name="Existing Skill",
                    level=5,
                    employee_id=matched_employee.id,
                ),
                SkillTable(
                    tenant_id=tenant,
                    name="Candidate Skill",
                    level=4,
                    candidate_id=matched_candidate.id,
                ),
                ExperienceTable(
                    tenant_id=tenant,
                    company="Existing Company",
                    position="Prior Role",
                    duration_years=2,
                    description="Existing experience",
                    employee_id=matched_employee.id,
                ),
                ExperienceTable(
                    tenant_id=tenant,
                    company="Candidate Company",
                    position="Prior Candidate Role",
                    duration_years=3,
                    description="Existing candidate experience",
                    candidate_id=matched_candidate.id,
                ),
            ]
        )
        session.commit()

        archive = io.BytesIO()
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
            csv_files = {
                "employees_public.csv": (
                    [
                        "full_name",
                        "email",
                        "department",
                        "role",
                        "salary",
                        "salary_period",
                        "employment_duration_years",
                        "departure_event",
                    ],
                    [
                        [
                            "New Record",
                            "new@example.test",
                            "Engineering",
                            "Engineer",
                            "5000",
                            "monthly",
                            "4",
                            "false",
                        ],
                        [
                            "Zero Tenure",
                            "zero@example.test",
                            "Engineering",
                            "Engineer",
                            "3000",
                            "monthly",
                            "0",
                            "true",
                        ],
                    ],
                ),
                "candidates_public.csv": (
                    ["full_name", "email", "department", "role"],
                    [
                        [
                            "New Candidate",
                            "candidate@example.test",
                            "New Department",
                            "New Role",
                        ]
                    ],
                ),
                "employee_skills_public.csv": (
                    ["employee_email", "skill_name", "level"],
                    [["new@example.test", "Existing Skill", "1"]],
                ),
                "candidate_skills_public.csv": (
                    ["candidate_email", "skill_name", "level"],
                    [["candidate@example.test", "Candidate Skill", "1"]],
                ),
                "employee_experience_public.csv": (
                    [
                        "employee_email",
                        "company",
                        "position",
                        "duration_years",
                        "description",
                    ],
                    [
                        [
                            "new@example.test",
                            "Existing Company",
                            "Prior Role",
                            "2",
                            "Existing experience",
                        ]
                    ],
                ),
                "candidate_experience_public.csv": (
                    [
                        "candidate_email",
                        "company",
                        "position",
                        "duration_years",
                        "description",
                    ],
                    [
                        [
                            "candidate@example.test",
                            "Candidate Company",
                            "Prior Candidate Role",
                            "3",
                            "Existing candidate experience",
                        ]
                    ],
                ),
            }
            for name, (fields, rows) in csv_files.items():
                content = io.StringIO()
                writer = csv.writer(content)
                writer.writerow(fields)
                writer.writerows(rows)
                bundle.writestr(name, content.getvalue())
        archive.seek(0)
        upload = UploadFile(filename="sample.zip", file=archive)
        result = asyncio.run(
            import_dataset_bundle(file=upload, current_user=user, db=session)
        )
        assert result["mode"] == "merge"
        assert (
            session.exec(
                select(EmployeeTable).where(
                    EmployeeTable.tenant_id == tenant,
                    EmployeeTable.email == "keep@example.test",
                )
            )
            .scalars()
            .first()
            is not None
        )
        imported = (
            session.exec(
                select(EmployeeTable).where(
                    EmployeeTable.tenant_id == tenant,
                    EmployeeTable.email == "new@example.test",
                )
            )
            .scalars()
            .first()
        )
        assert imported is not None
        assert imported.employment_duration_years == 4
        assert imported.departure_event is False
        assert imported.full_name == "Prior Employee Name"
        assert imported.department == "Prior Department"
        assert imported.role == "Prior Role"
        assert imported.salary == 9000
        assert imported.salary_currency == "USD"
        assert imported.salary_period == "annual"
        candidate = (
            session.exec(
                select(CandidateTable).where(
                    CandidateTable.email == "candidate@example.test"
                )
            )
            .scalars()
            .first()
        )
        assert candidate.full_name == "Prior Candidate Name"
        assert candidate.role == "Prior Candidate Role"
        assert (
            session.exec(
                select(SkillTable).where(
                    SkillTable.employee_id == imported.id,
                    SkillTable.name == "Existing Skill",
                )
            )
            .scalars()
            .first()
            .level
            == 5
        )
        assert (
            session.exec(
                select(SkillTable).where(
                    SkillTable.candidate_id == candidate.id,
                    SkillTable.name == "Candidate Skill",
                )
            )
            .scalars()
            .first()
            .level
            == 4
        )
        assert (
            session.exec(
                select(func.count())
                .select_from(ExperienceTable)
                .where(ExperienceTable.tenant_id == tenant)
            ).scalar_one()
            == 2
        )
        zero_duration = (
            session.exec(
                select(EmployeeTable).where(
                    EmployeeTable.tenant_id == tenant,
                    EmployeeTable.email == "zero@example.test",
                )
            )
            .scalars()
            .first()
        )
        assert zero_duration is not None
        assert zero_duration.employment_duration_years == 0
        assert zero_duration.departure_event is True
    engine.dispose()


def test_employee_confidential_fields_are_admin_only():
    employee = EmployeeTable(
        full_name="Example Person",
        email="person@example.test",
        department="Engineering",
        role="Engineer",
        salary=100000,
        salary_currency="USD",
        salary_period="annual",
        employment_duration_years=2.0,
        departure_event=False,
    )
    ordinary_user = TokenData(
        user_id="u1", email="user@example.test", is_admin=False, tenant_id="tenant-a"
    )
    administrator = TokenData(
        user_id="u2", email="admin@example.test", is_admin=True, tenant_id="tenant-a"
    )
    assert all(
        value is None
        for value in _employee_sensitive_values(employee, ordinary_user).values()
    )
    assert _employee_sensitive_values(employee, administrator)["salary"] == 100000
    assert (
        _employee_sensitive_values(employee, administrator)["departure_event"] is False
    )
