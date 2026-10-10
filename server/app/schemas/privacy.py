from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ConsentCreate(BaseModel):
    subject_ref: str = Field(min_length=1, max_length=256)
    purpose: str = Field(min_length=1, max_length=160)
    legal_basis: str = Field(min_length=1, max_length=80)
    region: str = Field(default="global", min_length=1, max_length=80)
    expires_at: datetime | None = None


class ConsentOut(ConsentCreate):
    id: UUID
    tenant_id: str
    status: str
    recorded_by: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class RetentionPolicyCreate(BaseModel):
    data_class: str = Field(min_length=1, max_length=120)
    region: str = Field(default="global", min_length=1, max_length=80)
    retention_days: int = Field(ge=1, le=36500)
    deletion_mode: str = Field(
        default="review_required", pattern="^(review_required|automatic|hold)$"
    )


class RetentionPolicyOut(RetentionPolicyCreate):
    id: UUID
    tenant_id: str
    status: str
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class SensitiveFieldPolicyCreate(BaseModel):
    entity: str = Field(min_length=1, max_length=120)
    field_name: str = Field(min_length=1, max_length=120)
    classification: str = Field(
        default="confidential",
        pattern="^(internal|confidential|restricted|special_category)$",
    )
    allowed_roles: list[str] = Field(
        default_factory=lambda: ["admin"], min_length=1, max_length=10
    )
    redaction_mode: str = Field(default="omit", pattern="^(omit|mask|hash)$")


class SensitiveFieldPolicyOut(SensitiveFieldPolicyCreate):
    id: UUID
    tenant_id: str
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}


class ExportRequestCreate(BaseModel):
    scope: str = Field(min_length=1, max_length=160)
    region: str = Field(default="global", min_length=1, max_length=80)
    purpose: str = Field(min_length=1, max_length=1000)


class ExportRequestOut(ExportRequestCreate):
    id: UUID
    tenant_id: str
    requested_by: str
    status: str
    approval_id: str | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
