"""
Employee management endpoints
"""

import json
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from uuid import UUID
from typing import List
from datetime import datetime
from sqlalchemy import func, or_

from app.schemas.schemas import (
    EmployeeCreate,
    EmployeeOut,
    EmployeeListOut,
    EmployeeUpdate,
    SkillOut,
    ExperienceOut,
)
from app.models.database import AuditLogTable, EmployeeTable, SkillTable, ExperienceTable, get_session
from app.core.security import get_current_user, TokenData
from app.core.logging_config import get_logger
from app.core.data_policy import filter_real_records, include_sample_data

router = APIRouter(prefix="/employees", tags=["employees"])
logger = get_logger(__name__)


def _employee_quality(emp: EmployeeTable, session: Session, current_user: TokenData | None = None) -> dict:
    missing = [field for field, value in {
        "full_name": emp.full_name,
        "email": emp.email,
        "department": emp.department,
        "role": emp.role,
    }.items() if not str(value or "").strip()]
    if emp.sentiment_score is None:
        missing.append("sentiment_score")
    duplicate_warnings = []
    if emp.email:
        email_count = session.exec(select(EmployeeTable).where(EmployeeTable.email == emp.email)).all()
        if len(email_count) > 1:
            duplicate_warnings.append("duplicate employee email")
    if emp.full_name:
        name_count = session.exec(select(EmployeeTable).where(EmployeeTable.full_name == emp.full_name)).all()
        if len(name_count) > 1:
            duplicate_warnings.append("duplicate employee name")
    audit_history = []
    user_uuid = None
    if current_user and current_user.user_id:
        try:
            user_uuid = UUID(current_user.user_id)
        except ValueError:
            user_uuid = None
    if user_uuid:
        for row in session.exec(select(AuditLogTable).where(AuditLogTable.resource_type == "employee", AuditLogTable.resource_id == emp.id, AuditLogTable.user_id == user_uuid).order_by(AuditLogTable.created_at.desc()).limit(50)).all():
            try:
                details = json.loads(row.details or "{}")
            except (TypeError, ValueError):
                details = {"raw": row.details}
            audit_history.append({"action": row.action, "details": details, "created_at": row.created_at.isoformat()})
    return {
        "source_type": "database_record",
        "source_version": "directory-v1",
        "validation_status": "review" if missing or duplicate_warnings else "valid",
        "missing_fields": missing,
        "duplicate_warnings": duplicate_warnings,
        "audit_history": audit_history,
    }


def get_employee_out(emp: EmployeeTable, session: Session, current_user: TokenData | None = None) -> EmployeeOut:
    skills = session.exec(
        select(SkillTable).where(SkillTable.employee_id == emp.id)
    ).all()
    experiences = session.exec(
        select(ExperienceTable).where(ExperienceTable.employee_id == emp.id)
    ).all()
    return EmployeeOut(
        id=emp.id,
        full_name=emp.full_name,
        email=emp.email,
        department=emp.department,
        role=emp.role,
        sentiment_score=emp.sentiment_score,
        is_at_risk=emp.is_at_risk,
        retention_prob=emp.retention_prob,
        salary=emp.salary,
        join_date=emp.join_date,
        skills=[
            SkillOut(id=s.id, name=s.name, level=s.level, created_at=s.created_at)
            for s in skills
        ],
        experiences=[
            ExperienceOut(
                id=exp.id,
                company=exp.company,
                position=exp.position,
                duration_years=exp.duration_years,
                description=exp.description,
                created_at=exp.created_at,
            )
            for exp in experiences
        ],
        created_at=emp.created_at,
        updated_at=emp.updated_at,
        **_employee_quality(emp, session, current_user),
    )


@router.get("", response_model=List[EmployeeListOut])
async def list_employees(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    department: str = Query(None),
    at_risk_only: bool = Query(False),
    q: str = Query(None, max_length=120),
    sentiment_min: float = Query(None, ge=0.0, le=1.0),
    sentiment_max: float = Query(None, ge=0.0, le=1.0),
    current_user: TokenData = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    List employees with optional filtering

    - **skip**: Number of records to skip (pagination)
    - **limit**: Number of records to return (max 10000)
    - **department**: Filter by department
    - **at_risk_only**: Only show at-risk employees
    """

    logger.info(f"User {current_user.user_id} listing employees")

    query = select(EmployeeTable)

    if department:
        query = query.where(EmployeeTable.department == department)

    if at_risk_only:
        query = query.where(EmployeeTable.is_at_risk)
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        query = query.where(or_(
            EmployeeTable.full_name.ilike(pattern),
            EmployeeTable.email.ilike(pattern),
            EmployeeTable.role.ilike(pattern),
            EmployeeTable.department.ilike(pattern),
        ))
    if sentiment_min is not None:
        query = query.where(EmployeeTable.sentiment_score >= sentiment_min)
    if sentiment_max is not None:
        query = query.where(EmployeeTable.sentiment_score <= sentiment_max)

    # Apply the same production-record policy before pagination so list pages
    # and count results always describe the same population.
    if not include_sample_data():
        query = query.where(
            ~EmployeeTable.email.ilike("%@company.com"),
            ~EmployeeTable.email.ilike("candidate.%@example.com"),
        )

    query = query.order_by(EmployeeTable.id).offset(skip).limit(limit)
    employees = filter_real_records(session.exec(query).all())

    # Return lightweight response (no N+1 queries for skills/experiences)
    return employees


@router.post("", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
async def create_employee(
    employee_data: EmployeeCreate,
    current_user: TokenData = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Create a new employee record
    """

    # Check if email exists
    existing = session.exec(
        select(EmployeeTable).where(EmployeeTable.email == employee_data.email)
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee with this email already exists",
        )

    employee = EmployeeTable(
        full_name=employee_data.full_name,
        email=employee_data.email,
        department=employee_data.department,
        role=employee_data.role,
        sentiment_score=employee_data.sentiment_score or 0.5,
        salary=employee_data.salary,
        join_date=employee_data.join_date or datetime.utcnow(),
    )

    session.add(employee)
    session.commit()
    session.refresh(employee)

    logger.info(f"Employee created: {employee.id}")

    return get_employee_out(employee, session)


@router.get("/count")
async def count_employees(
    q: str = Query(None, max_length=120),
    at_risk_only: bool = Query(False),
    department: str = Query(None),
    sentiment_min: float = Query(None, ge=0.0, le=1.0),
    sentiment_max: float = Query(None, ge=0.0, le=1.0),
    current_user: TokenData = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Return the authoritative employee count without loading profile details."""
    query = select(func.count()).select_from(EmployeeTable)
    if department:
        query = query.where(EmployeeTable.department == department)
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        query = query.where(or_(
            EmployeeTable.full_name.ilike(pattern),
            EmployeeTable.email.ilike(pattern),
            EmployeeTable.role.ilike(pattern),
            EmployeeTable.department.ilike(pattern),
        ))
    if at_risk_only:
        query = query.where(EmployeeTable.is_at_risk)
    if sentiment_min is not None:
        query = query.where(EmployeeTable.sentiment_score >= sentiment_min)
    if sentiment_max is not None:
        query = query.where(EmployeeTable.sentiment_score <= sentiment_max)
    if not include_sample_data():
        query = query.where(
            ~EmployeeTable.email.ilike("%@company.com"),
            ~EmployeeTable.email.ilike("candidate.%@example.com"),
        )
    return {"count": int(session.exec(query).one() or 0)}


@router.get("/departments", response_model=List[str])
async def list_employee_departments(
    current_user: TokenData = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    query = select(EmployeeTable.department).where(EmployeeTable.department.is_not(None))
    if not include_sample_data():
        query = query.where(
            ~EmployeeTable.email.ilike("%@company.com"),
            ~EmployeeTable.email.ilike("candidate.%@example.com"),
        )
    rows = session.exec(query.distinct().order_by(EmployeeTable.department)).all()
    return [str(value) for value in rows if value]


@router.get("/{employee_id}", response_model=EmployeeOut)
async def get_employee(
    employee_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get employee by ID"""

    employee = session.get(EmployeeTable, employee_id)

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee {employee_id} not found",
        )

    logger.info(f"User {current_user.user_id} accessed employee {employee_id}")

    return get_employee_out(employee, session, current_user)


@router.patch("/{employee_id}", response_model=EmployeeOut)
async def update_employee(
    employee_id: UUID,
    update_data: EmployeeUpdate,
    current_user: TokenData = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Update employee"""

    employee = session.get(EmployeeTable, employee_id)

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee {employee_id} not found",
        )

    # Update fields that were provided
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(employee, field, value)

    session.add(employee)
    session.commit()
    session.refresh(employee)

    logger.info(f"User {current_user.user_id} updated employee {employee_id}")

    return get_employee_out(employee, session)


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    employee_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Delete employee (admin only)"""

    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete employees",
        )

    employee = session.get(EmployeeTable, employee_id)

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee {employee_id} not found",
        )

    session.delete(employee)
    session.commit()

    logger.info(f"User {current_user.user_id} deleted employee {employee_id}")
