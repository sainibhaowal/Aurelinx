import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, select

from app.api.v1.employees import _filter_employment_status
from app.core.security import TokenData
from app.models.database import EmployeeTable


def test_employment_status_filter_is_admin_only_and_filters_exact_tenant_rows():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    admin = TokenData(
        user_id="admin-id",
        email="admin@example.test",
        is_admin=True,
        tenant_id="tenant-a",
    )
    employee_rows = [
        EmployeeTable(
            tenant_id="tenant-a",
            full_name="Active Person",
            email="active@example.test",
            department="Engineering",
            role="Engineer",
            employment_status="active",
        ),
        EmployeeTable(
            tenant_id="tenant-a",
            full_name="Departed Person",
            email="departed@example.test",
            department="Engineering",
            role="Engineer",
            employment_status="departed",
        ),
        EmployeeTable(
            tenant_id="tenant-b",
            full_name="Other Tenant Person",
            email="other@example.test",
            department="Engineering",
            role="Engineer",
            employment_status="departed",
        ),
    ]
    with Session(engine) as session:
        session.add_all(employee_rows)
        session.commit()

        query = select(EmployeeTable).where(EmployeeTable.tenant_id == "tenant-a")
        departed = session.exec(
            _filter_employment_status(query, "departed", admin)
        ).all()
        assert [row.email for row in departed] == ["departed@example.test"]

        with pytest.raises(HTTPException) as error:
            _filter_employment_status(
                query,
                "departed",
                TokenData(
                    user_id="user-id", email="user@example.test", tenant_id="tenant-a"
                ),
            )
        assert error.value.status_code == 403

        with pytest.raises(HTTPException) as error:
            _filter_employment_status(query, "unknown-status", admin)
        assert error.value.status_code == 422

    engine.dispose()
