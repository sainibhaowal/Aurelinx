"""
Candidate management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from typing import List
from uuid import UUID
from sqlalchemy import func, or_

from app.schemas.schemas import CandidateOut, CandidateListOut, SkillOut, ExperienceOut
from app.models.database import CandidateTable, SkillTable, ExperienceTable, get_session
from app.core.security import get_current_user, TokenData
from app.core.logging_config import get_logger
from app.core.data_policy import filter_real_records, include_sample_data

router = APIRouter(prefix="/candidates", tags=["candidates"])
logger = get_logger(__name__)


def get_candidate_out(cand: CandidateTable, session: Session) -> CandidateOut:
    skills = session.exec(
        select(SkillTable).where(SkillTable.candidate_id == cand.id)
    ).all()
    experiences = session.exec(
        select(ExperienceTable).where(ExperienceTable.candidate_id == cand.id)
    ).all()
    return CandidateOut(
        id=cand.id,
        full_name=cand.full_name,
        email=cand.email,
        department=cand.department,
        role=cand.role,
        sentiment_score=cand.sentiment_score,
        match_score=cand.match_score,
        salary=cand.salary,
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
        application_date=cand.application_date,
        created_at=cand.created_at,
        updated_at=cand.updated_at,
    )


@router.get("", response_model=List[CandidateListOut])
async def list_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    department: str = Query(None),
    q: str = Query(None, max_length=120),
    current_user: TokenData = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    List candidates with optional filtering
    """
    logger.info(f"User {current_user.user_id} listing candidates")

    query = select(CandidateTable)
    if department:
        query = query.where(CandidateTable.department == department)
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        query = query.where(or_(
            CandidateTable.full_name.ilike(pattern),
            CandidateTable.email.ilike(pattern),
            CandidateTable.role.ilike(pattern),
            CandidateTable.department.ilike(pattern),
        ))

    query = query.offset(skip).limit(limit)
    candidates = filter_real_records(session.exec(query).all())

    # Return lightweight response (no N+1 queries for skills/experiences)
    return candidates


@router.get("/count")
async def count_candidates(
    q: str = Query(None, max_length=120),
    current_user: TokenData = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Return the authoritative candidate count without loading all profiles."""
    query = select(func.count()).select_from(CandidateTable)
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        query = query.where(or_(
            CandidateTable.full_name.ilike(pattern),
            CandidateTable.email.ilike(pattern),
            CandidateTable.role.ilike(pattern),
            CandidateTable.department.ilike(pattern),
        ))
    if not include_sample_data():
        query = query.where(
            ~CandidateTable.email.ilike("%@company.com"),
            ~CandidateTable.email.ilike("candidate.%@example.com"),
        )
    return {"count": int(session.exec(query).one() or 0)}


@router.get("/departments", response_model=List[str])
async def list_candidate_departments(
    current_user: TokenData = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    rows = session.exec(
        select(CandidateTable.department)
        .where(CandidateTable.department.is_not(None))
        .distinct()
        .order_by(CandidateTable.department)
    ).all()
    return [str(value) for value in rows if value]


@router.get("/{candidate_id}", response_model=CandidateOut)
async def get_candidate(
    candidate_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get a candidate by ID with skills and experiences."""

    candidate = session.get(CandidateTable, candidate_id)

    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate {candidate_id} not found",
        )

    logger.info(f"User {current_user.user_id} accessed candidate {candidate_id}")

    return get_candidate_out(candidate, session)
