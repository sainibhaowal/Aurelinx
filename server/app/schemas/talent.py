
# Copyright 2026 Ravinder Singh
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from datetime import datetime
from uuid import UUID, uuid4

from pydantic import BaseModel, EmailStr, Field


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
    skills: list[Skill]
    experience: list[Experience]
    sentiment_score: float = Field(default=0.0, ge=-1.0, le=1.0)
    salary_expectation: int | None = None


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
    required_skills: list[Skill]
    budget_range: str
    description: str
