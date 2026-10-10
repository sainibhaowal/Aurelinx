from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ActionProposalCreate(BaseModel):
    provider: str = Field(min_length=2, max_length=80)
    action_type: str = Field(min_length=2, max_length=120)
    connection_id: UUID | None = None
    payload: dict[str, Any]
    idempotency_key: str = Field(min_length=8, max_length=256)
    reason: str | None = Field(default=None, max_length=1000)


class ActionProposalOut(BaseModel):
    id: str
    tenant_id: str
    provider: str
    action_type: str
    connection_id: UUID | None = None
    status: str
    idempotency_key: str
    approval_id: str | None = None
    provider_request_id: str | None = None
    result_summary: str | None = None
    failure_reason: str | None = None
    created_at: datetime
    updated_at: datetime


class ActionDecision(BaseModel):
    decision: str = Field(pattern="^(approve|reject)$")
    reason: str | None = Field(default=None, max_length=1000)
