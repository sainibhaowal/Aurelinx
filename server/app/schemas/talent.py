from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime


class Skill(BaseModel):
    name: str
    level: int = Field(..., ge=1, le=5)  # 1 to 5
    category: str  # e.g., "Frontend", "AI", "Leadership"


class Experience(BaseModel):
    company: str
    role: str
    duration_months: int
    description: str


class TalentBase(BaseModel):
    full_name: str
    email: EmailStr
    department: str
    role: str
    skills: List[Skill]
    experience: List[Experience]
    sentiment_score: float = Field(default=0.0, ge=-1.0, le=1.0)
    salary_expectation: Optional[int] = None


class Candidate(TalentBase):
    id: UUID = Field(default_factory=uuid4)
    application_date: datetime = Field(default_factory=datetime.now)


class Employee(TalentBase):
    id: UUID = Field(default_factory=uuid4)
    join_date: datetime
    is_at_risk: bool = False


class JobDescription(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    title: str
    department: str
    required_skills: List[Skill]
    budget_range: str
    description: str
