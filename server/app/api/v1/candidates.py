"""
Candidate management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from uuid import UUID
from typing import List, Optional

from app.schemas.schemas import (
    CandidateOut,
    SkillOut,
    ExperienceOut
)
from app.models.database import (
    CandidateTable,
    SkillTable,
    ExperienceTable,
    get_session
)
from app.core.security import get_current_user, TokenData
from app.core.logging_config import get_logger
from app.core.data_policy import filter_real_records

router = APIRouter(prefix="/candidates", tags=["candidates"])
logger = get_logger(__name__)

def get_candidate_out(cand: CandidateTable, session: Session) -> CandidateOut:
    skills = session.exec(select(SkillTable).where(SkillTable.candidate_id == cand.id)).all()
    experiences = session.exec(select(ExperienceTable).where(ExperienceTable.candidate_id == cand.id)).all()
    return CandidateOut(
        id=cand.id,
        full_name=cand.full_name,
        email=cand.email,
        department=cand.department,
        role=cand.role,
        sentiment_score=cand.sentiment_score,
        match_score=cand.match_score,
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
                created_at=exp.created_at
            )
            for exp in experiences
        ],
        application_date=cand.application_date,
        created_at=cand.created_at
    )

@router.get("", response_model=List[CandidateOut])
async def list_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    department: str = Query(None),
    current_user: TokenData = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    List candidates with optional filtering
    """
    logger.info(f"User {current_user.user_id} listing candidates")
    
    query = select(CandidateTable)
    if department:
        query = query.where(CandidateTable.department == department)
        
    query = query.offset(skip).limit(limit)
    candidates = filter_real_records(session.exec(query).all())
    
    return [get_candidate_out(cand, session) for cand in candidates]
