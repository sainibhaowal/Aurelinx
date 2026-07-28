"""
Candidate management endpoints
"""

import json
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from typing import List
from uuid import UUID
from sqlalchemy import func, or_

from app.schemas.schemas import CandidateOut, CandidateListOut, SkillOut, ExperienceOut
from app.models.database import AuditLogTable, CandidateTable, SkillTable, ExperienceTable, get_session
from app.core.security import get_current_user, TokenData
from app.core.logging_config import get_logger
from app.core.data_policy import filter_real_records, include_sample_data

router = APIRouter(prefix="/candidates", tags=["candidates"])
logger = get_logger(__name__)


def _candidate_quality(cand: CandidateTable, session: Session, current_user: TokenData | None = None) -> dict:
    missing = [field for field, value in {
        "full_name": cand.full_name,
        "email": cand.email,
        "department": cand.department,
        "role": cand.role,
    }.items() if not str(value or "").strip()]
    if cand.sentiment_score is None:
        missing.append("sentiment_score")
    if cand.match_score is None:
        missing.append("match_score")
    duplicate_warnings = []
    if cand.email and len(session.exec(select(CandidateTable).where(CandidateTable.email == cand.email)).all()) > 1:
        duplicate_warnings.append("duplicate candidate email")
    if cand.full_name and len(session.exec(select(CandidateTable).where(CandidateTable.full_name == cand.full_name)).all()) > 1:
        duplicate_warnings.append("duplicate candidate name")
    audit_history = []
    user_uuid = None
    if current_user and current_user.user_id:
        try:
            user_uuid = UUID(current_user.user_id)
        except ValueError:
            user_uuid = None
    if user_uuid:
        rows = session.exec(
            select(AuditLogTable)
            .where(AuditLogTable.resource_type == "candidate", AuditLogTable.resource_id == cand.id, AuditLogTable.user_id == user_uuid)
            .order_by(AuditLogTable.created_at.desc()).limit(50)
        ).all()
        for row in rows:
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


def get_candidate_out(cand: CandidateTable, session: Session, current_user: TokenData | None = None) -> CandidateOut:
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
        **_candidate_quality(cand, session, current_user),
    )


@router.get("", response_model=List[CandidateListOut])
async def list_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    department: str = Query(None),
    q: str = Query(None, max_length=120),
    sentiment_min: float = Query(None, ge=0.0, le=1.0),
    sentiment_max: float = Query(None, ge=0.0, le=1.0),
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
    if sentiment_min is not None:
        query = query.where(CandidateTable.sentiment_score >= sentiment_min)
    if sentiment_max is not None:
        query = query.where(CandidateTable.sentiment_score <= sentiment_max)

    if not include_sample_data():
        query = query.where(
            ~CandidateTable.email.ilike("%@company.com"),
            ~CandidateTable.email.ilike("candidate.%@example.com"),
        )

    query = query.order_by(CandidateTable.id).offset(skip).limit(limit)
    candidates = filter_real_records(session.exec(query).all())

    # Return lightweight response (no N+1 queries for skills/experiences)
    return candidates


@router.get("/count")
async def count_candidates(
    q: str = Query(None, max_length=120),
    department: str = Query(None),
    sentiment_min: float = Query(None, ge=0.0, le=1.0),
    sentiment_max: float = Query(None, ge=0.0, le=1.0),
    current_user: TokenData = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Return the authoritative candidate count without loading all profiles."""
    query = select(func.count()).select_from(CandidateTable)
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
    if sentiment_min is not None:
        query = query.where(CandidateTable.sentiment_score >= sentiment_min)
    if sentiment_max is not None:
        query = query.where(CandidateTable.sentiment_score <= sentiment_max)
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
    query = select(CandidateTable.department).where(CandidateTable.department.is_not(None))
    if not include_sample_data():
        query = query.where(
            ~CandidateTable.email.ilike("%@company.com"),
            ~CandidateTable.email.ilike("candidate.%@example.com"),
        )
    rows = session.exec(query.distinct().order_by(CandidateTable.department)).all()
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

    return get_candidate_out(candidate, session, current_user)
