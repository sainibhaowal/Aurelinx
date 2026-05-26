"""
Employee management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from uuid import UUID
from typing import List

from app.schemas.schemas import (
    EmployeeCreate,
    EmployeeOut,
    EmployeeUpdate,
    SkillOut,
    ExperienceOut,
)
from app.models.database import EmployeeTable, SkillTable, ExperienceTable, get_session
from app.core.security import get_current_user, TokenData
from app.core.logging_config import get_logger
from app.core.data_policy import filter_real_records

router = APIRouter(prefix="/employees", tags=["employees"])
logger = get_logger(__name__)


def get_employee_out(emp: EmployeeTable, session: Session) -> EmployeeOut:
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
    )


@router.get("", response_model=List[EmployeeOut])
async def list_employees(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    department: str = Query(None),
    at_risk_only: bool = Query(False),
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

    query = query.offset(skip).limit(limit)
    employees = filter_real_records(session.exec(query).all())

    return [get_employee_out(emp, session) for emp in employees]


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
    )

    session.add(employee)
    session.commit()
    session.refresh(employee)

    logger.info(f"Employee created: {employee.id}")

    return get_employee_out(employee, session)


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

    return get_employee_out(employee, session)


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
