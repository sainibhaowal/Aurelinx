
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

"""
Pydantic schemas for request/response validation
Ensures type safety and automatic documentation
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

# ============ AUTHENTICATION SCHEMAS ============


class LoginRequest(BaseModel):
    """User login request"""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(
        ..., min_length=8, max_length=100, description="User password"
    )


class LoginResponse(BaseModel):
    """User login response"""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: UUID


class VerifyCodeRequest(BaseModel):
    """Request to verify an Admin ID"""

    code: str = Field(..., min_length=8, max_length=32)


class RegisterRequest(BaseModel):
    """User registration request"""

    email: EmailStr
    full_name: str | None = Field(default=None, max_length=100)
    password: str = Field(
        ..., min_length=8, max_length=100, description="Must be at least 8 characters"
    )

    @field_validator("password")
    def validate_password(cls, v):
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one digit")
        if not any(char.isupper() for char in v):
            raise ValueError("Password must contain at least one uppercase letter")
        return v


class UserOut(BaseModel):
    """User response (no password)"""

    id: UUID
    email: str
    full_name: str
    is_active: bool
    is_admin: bool
    is_verified: bool = False
    created_at: datetime


class RegisterResponse(BaseModel):
    """Response after registration requiring email verification"""

    user_id: UUID
    email: str
    full_name: str
    message: str
    expires_in: int = 30
    demo_code: str | None = None
    token: str | None = None


class EmailVerifyRequest(BaseModel):
    """Request to verify email with 6-digit code or token"""

    email: EmailStr
    code: str = Field(..., min_length=4, max_length=64)


class ResendVerificationRequest(BaseModel):
    """Request to resend a new 30-second verification challenge"""

    email: EmailStr
    purpose: str = "register"


class VerifyLoginRequest(BaseModel):
    """Request to complete login verification challenge"""

    email: EmailStr
    code: str = Field(..., min_length=4, max_length=64)


class LoginVerificationChallenge(BaseModel):
    """Response when login requires email 2-step verification"""

    requires_verification: bool = True
    email: str
    expires_in: int = 30
    message: str
    demo_code: str | None = None


class DeleteAccountRequest(BaseModel):
    """Delete the current account after explicit confirmation."""

    confirmation_text: str = Field(..., min_length=1, max_length=32)


class ResetWorkspaceRequest(BaseModel):
    """Reset all non-user app data after explicit confirmation."""

    confirmation_text: str = Field(..., min_length=1, max_length=32)


# ============ SKILL SCHEMAS ============


class SkillCreate(BaseModel):
    """Create skill"""

    name: str = Field(..., min_length=1, max_length=100)
    level: int = Field(..., ge=1, le=5, description="Proficiency level 1-5")


class SkillOut(BaseModel):
    """Skill response"""

    id: UUID
    name: str
    level: int
    created_at: datetime


# ============ EXPERIENCE SCHEMAS ============


class ExperienceCreate(BaseModel):
    """Create experience"""

    company: str = Field(..., min_length=1, max_length=200)
    position: str = Field(..., min_length=1, max_length=100)
    duration_years: float = Field(..., ge=0, le=70)
    description: str = Field(..., min_length=0, max_length=1000)


class ExperienceOut(BaseModel):
    """Experience response"""

    id: UUID
    company: str
    position: str
    duration_years: float
    description: str
    created_at: datetime


# ============ EMPLOYEE SCHEMAS ============


class EmployeeCreate(BaseModel):
    """Create employee"""

    full_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    department: str = Field(..., min_length=1, max_length=100)
    role: str = Field(..., min_length=1, max_length=100)
    sentiment_score: float | None = Field(default=0.5, ge=0.0, le=1.0)
    salary: int | None = None
    join_date: datetime | None = None
    skills: list[SkillCreate] | None = []
    experiences: list[ExperienceCreate] | None = []


class EmployeeUpdate(BaseModel):
    """Update employee"""

    full_name: str | None = None
    department: str | None = None
    role: str | None = None
    sentiment_score: float | None = Field(None, ge=0.0, le=1.0)
    is_at_risk: bool | None = None
    salary: int | None = None
    join_date: datetime | None = None


class EmployeeOut(BaseModel):
    """Employee response"""

    id: UUID
    full_name: str
    email: str
    department: str
    role: str
    sentiment_score: float
    is_at_risk: bool
    retention_prob: float | None
    salary: int | None = None
    join_date: datetime | None = None
    skills: list[SkillOut] = []
    experiences: list[ExperienceOut] = []
    created_at: datetime
    updated_at: datetime
    source_type: str = "database_record"
    source_version: str = "directory-v1"
    validation_status: str = "valid"
    missing_fields: list[str] = []
    duplicate_warnings: list[str] = []
    audit_history: list[dict] = []


class EmployeeListOut(BaseModel):
    """Lightweight employee response for list endpoints (no skills/experiences)"""

    id: UUID
    full_name: str
    email: str
    department: str
    role: str
    sentiment_score: float
    is_at_risk: bool
    retention_prob: float | None
    salary: int | None = None
    join_date: datetime | None = None
    created_at: datetime
    updated_at: datetime


# ============ CANDIDATE SCHEMAS ============


class CandidateCreate(BaseModel):
    """Create candidate"""

    full_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    department: str = Field(..., min_length=1, max_length=100)
    role: str = Field(..., min_length=1, max_length=100)
    salary: int | None = None
    skills: list[SkillCreate] | None = []
    experiences: list[ExperienceCreate] | None = []


class CandidateOut(BaseModel):
    """Candidate response"""

    id: UUID
    full_name: str
    email: str
    department: str
    role: str
    sentiment_score: float
    match_score: float | None
    salary: int | None = None
    skills: list[SkillOut] = []
    experiences: list[ExperienceOut] = []
    application_date: datetime
    created_at: datetime
    updated_at: datetime | None = None
    source_type: str = "database_record"
    source_version: str = "directory-v1"
    validation_status: str = "valid"
    missing_fields: list[str] = []
    duplicate_warnings: list[str] = []
    audit_history: list[dict] = []


class CandidateListOut(BaseModel):
    """Lightweight candidate response for list endpoints (no skills/experiences)"""

    id: UUID
    full_name: str
    email: str
    department: str
    role: str
    sentiment_score: float
    match_score: float | None
    salary: int | None = None
    application_date: datetime
    created_at: datetime


# ============ AI/ANALYSIS SCHEMAS ============


class AIAnalysisRequest(BaseModel):
    """Request for AI talent analysis"""

    prompt: str = Field(
        ..., min_length=5, max_length=1000, description="What are you looking for?"
    )
    provider: str = Field(..., description="LLM provider: openai, claude, or groq")
    api_key: str | None = None
    base_url: str | None = None
    model: str | None = None

    @field_validator("provider")
    def validate_provider(cls, v):
        allowed = ["openai", "claude", "groq", "lmstudio", "gemini", "opencode"]
        if v.lower() not in allowed:
            raise ValueError(f"Provider must be one of {allowed}")
        return v.lower()

    @field_validator("prompt")
    def validate_prompt(cls, v):
        # Prevent SQL injection and prompt injection
        dangerous_patterns = [
            "DROP TABLE",
            "DELETE FROM",
            "INSERT INTO",
            "UPDATE ",
            ";--",
        ]
        for pattern in dangerous_patterns:
            if pattern.upper() in v.upper():
                raise ValueError("Prompt contains potentially dangerous SQL patterns")
        return v


class AIAnalysisResponse(BaseModel):
    """Response from AI analysis"""

    analysis: str
    # Scout cards intentionally use the same public field shape, but omit
    # heavy experience payloads. The existing profile endpoint remains the
    # source of full details when a card is opened.
    candidates: list[dict] = []
    confidence_score: float | None
    processing_time_ms: float
    searched_records: int | None = None
    returned_records: int | None = None


class AICopilotRequest(BaseModel):
    """Request for the workplace copilot."""

    prompt: str = Field(..., min_length=1, max_length=1000)
    surface: str = Field(
        default="dashboard",
        pattern="^(dashboard|directory|enterprise|scout|workflow|chat)$",
    )
    provider: str = Field(
        default="lmstudio",
        description="LLM provider: openai, claude, groq, lmstudio, gemini",
    )
    api_key: str | None = None
    base_url: str | None = None
    model: str | None = None
    page_context: dict | None = None

    @field_validator("provider")
    def validate_provider(cls, v):
        allowed = ["openai", "claude", "groq", "lmstudio", "gemini", "opencode"]
        if v.lower() not in allowed:
            raise ValueError(f"Provider must be one of {allowed}")
        return v.lower()

    @field_validator("prompt")
    def validate_prompt(cls, v):
        dangerous_patterns = [
            "DROP TABLE",
            "DELETE FROM",
            "INSERT INTO",
            "UPDATE ",
            ";--",
        ]
        for pattern in dangerous_patterns:
            if pattern.upper() in v.upper():
                raise ValueError("Prompt contains potentially dangerous SQL patterns")
        return v


class AICopilotResponse(BaseModel):
    """Structured response from the workplace copilot."""

    headline: str
    answer: str
    evidence: list[str] = []
    recommendations: list[str] = []
    actions: list[str] = []
    warnings: list[str] = []
    context: dict
    confidence_score: float
    provider: str
    surface: str
    generated_at: datetime


class SentimentReportRequest(BaseModel):
    """Request sentiment analysis report"""

    department: str | None = None
    include_at_risk_only: bool = False


class SentimentMetric(BaseModel):
    """Single sentiment metric"""

    name: str
    score: float
    velocity: float  # rate of change
    confidence: float


class SentimentReportResponse(BaseModel):
    """Sentiment analysis report"""

    total_employees: int
    at_risk_count: int
    at_risk_percentage: float
    metrics: list[SentimentMetric]
    recommendations: list[str]


# ============ ERROR RESPONSE SCHEMAS ============


class ErrorResponse(BaseModel):
    """Standard error response"""

    error_code: str
    message: str
    details: dict | None = None
    request_id: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ValidationErrorResponse(BaseModel):
    """Validation error response"""

    error_code: str = "VALIDATION_ERROR"
    message: str = "Request validation failed"
    errors: dict  # Field name -> error message
    request_id: str | None = None


# ============ PAGINATION ============


class PaginationParams(BaseModel):
    """Pagination parameters"""

    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=10, ge=1, le=100)
    sort_by: str | None = None
    sort_order: str = Field(default="asc", pattern="^(asc|desc)$")


class PaginatedResponse(BaseModel):
    """Generic paginated response"""

    total: int
    skip: int
    limit: int
    items: list[dict]


# ============ CHAT SCHEMAS ============


class ChatSessionCreate(BaseModel):
    title: str | None = "New Session"


class ChatSessionRename(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)


class ChatSessionOut(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime


class ChatBulkDeleteRequest(BaseModel):
    session_ids: list[UUID]


class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=12000)
    provider: str | None = "lmstudio"
    api_key: str | None = None
    base_url: str | None = None
    model: str | None = None


class ChatMessageOut(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    tool_trace: str | None = None
    created_at: datetime
    workflow_run_id: str | None = None
    workflow_events: list[dict] = Field(default_factory=list)


class ChatAttachmentOut(BaseModel):
    id: str
    session_id: str
    message_id: str | None = None
    original_name: str
    content_type: str | None = None
    file_path: str
    file_size: int
    parsing_status: str
    parsing_error: str | None = None
    created_at: datetime


class ChatResponse(BaseModel):
    session: ChatSessionOut
    user_message: ChatMessageOut
    assistant_message: ChatMessageOut


# ============ ENTERPRISE INTELLIGENCE SCHEMAS ============


class AttritionDriverOut(BaseModel):
    factor: str
    contribution: float = Field(..., ge=0.0, le=1.0)
    evidence: str


class AttritionExplainOut(BaseModel):
    employee_id: UUID
    full_name: str
    department: str
    role: str
    risk_probability: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    recommended_actions: list[str]
    drivers: list[AttritionDriverOut]


class AttritionExplainResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    generated_at: datetime
    model_version: str
    items: list[AttritionExplainOut]


class InterventionCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str | None = None
    target_scope: str = Field(
        default="team", pattern="^(employee|team|department|org)$"
    )
    target_employee_id: UUID | None = None
    target_department: str | None = None
    priority: str = Field(default="medium", pattern="^(low|medium|high|critical)$")
    status: str = Field(
        default="planned",
        pattern="^(planned|approved|in_progress|completed|cancelled)$",
    )
    owner_name: str | None = None
    due_date: datetime | None = None
    expected_impact: str | None = None
    estimated_cost: float | None = Field(default=None, ge=0.0)


class InterventionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = None
    target_scope: str | None = Field(
        default=None, pattern="^(employee|team|department|org)$"
    )
    target_employee_id: UUID | None = None
    target_department: str | None = None
    priority: str | None = Field(default=None, pattern="^(low|medium|high|critical)$")
    status: str | None = Field(
        default=None, pattern="^(planned|approved|in_progress|completed|cancelled)$"
    )
    owner_name: str | None = None
    due_date: datetime | None = None
    expected_impact: str | None = None
    estimated_cost: float | None = Field(default=None, ge=0.0)
    outcome_score: float | None = Field(default=None, ge=0.0, le=1.0)


class InterventionOut(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    target_scope: str
    target_employee_id: UUID | None = None
    target_department: str | None = None
    priority: str
    status: str
    owner_name: str | None = None
    due_date: datetime | None = None
    expected_impact: str | None = None
    estimated_cost: float | None = None
    outcome_score: float | None = None
    closed_at: datetime | None = None
    created_by: str | None = None
    created_at: datetime
    updated_at: datetime


class IntegrationConnectionCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    source_type: str = Field(
        ..., pattern="^(hris|ats|engagement|productivity|finance)$"
    )
    provider: str = Field(..., min_length=2, max_length=80)
    status: str = Field(default="draft", pattern="^(draft|active|paused|error)$")
    base_url: str | None = None
    auth_type: str = Field(default="api_key", pattern="^(api_key|oauth2|basic)$")
    encrypted_secret_ref: str | None = None
    sync_interval_minutes: int | None = Field(default=60, ge=5, le=10080)


class IntegrationConnectionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    source_type: str | None = Field(
        default=None, pattern="^(hris|ats|engagement|productivity|finance)$"
    )
    provider: str | None = Field(default=None, min_length=2, max_length=80)
    status: str | None = Field(default=None, pattern="^(draft|active|paused|error)$")
    base_url: str | None = None
    auth_type: str | None = Field(default=None, pattern="^(api_key|oauth2|basic)$")
    encrypted_secret_ref: str | None = None
    sync_interval_minutes: int | None = Field(default=None, ge=5, le=10080)
    last_sync_status: str | None = None
    last_sync_summary: str | None = None


class IntegrationConnectionOut(BaseModel):
    id: UUID
    tenant_id: str | None = None
    name: str
    source_type: str
    provider: str
    status: str
    base_url: str | None = None
    auth_type: str
    encrypted_secret_ref: str | None = None
    sync_interval_minutes: int = 60
    next_sync_at: datetime | None = None
    sync_retry_count: int = 0
    last_sync_at: datetime | None = None
    last_sync_status: str | None = None
    last_sync_summary: str | None = None
    created_at: datetime
    updated_at: datetime


class InterventionOutcomeCreate(BaseModel):
    checkpoint_day: int = Field(..., ge=30, le=90)
    status: str = Field(
        default="tracking", pattern="^(tracking|improved|neutral|worsened)$"
    )
    risk_delta: float | None = None
    retention_delta: float | None = None
    notes: str | None = None


class InterventionOutcomeOut(BaseModel):
    id: UUID
    intervention_id: UUID
    checkpoint_day: int
    measured_at: datetime
    status: str
    risk_delta: float | None = None
    retention_delta: float | None = None
    notes: str | None = None
    created_at: datetime


class ConnectionSyncStatusOut(BaseModel):
    connection_id: UUID
    status: str
    phase: str
    progress: int = Field(..., ge=0, le=100)
    message: str
    updated_at: datetime


class ConnectorFieldMappingCreate(BaseModel):
    source_field: str = Field(..., min_length=1, max_length=120)
    canonical_field: str = Field(..., min_length=1, max_length=120)
    transform_rule: str | None = None
    required: bool = True


class ConnectorFieldMappingOut(BaseModel):
    id: UUID
    connection_id: UUID
    source_field: str
    canonical_field: str
    transform_rule: str | None = None
    required: bool
    created_at: datetime
    updated_at: datetime


class ConnectorSyncJobOut(BaseModel):
    id: UUID
    tenant_id: str | None = None
    connection_id: UUID
    status: str
    source_type: str
    provider: str
    bronze_events: int
    silver_upserts: int
    quarantined: int
    error_message: str | None = None
    started_at: datetime
    finished_at: datetime | None = None


class RiskDriverDrilldownItem(BaseModel):
    employee_id: UUID
    full_name: str
    department: str
    role: str
    sentiment_score: float
    retention_prob: float | None = None
    risk_probability: float
    evidence: str


class RiskDriverDrilldownResponse(BaseModel):
    factor: str
    generated_at: datetime
    items: list[RiskDriverDrilldownItem]


class CompliancePolicyCreate(BaseModel):
    region: str = Field(default="global", min_length=2, max_length=40)
    policy_name: str = Field(..., min_length=3, max_length=120)
    action_type: str = Field(
        default="intervention", pattern="^(intervention|export|sync|recommendation)$"
    )
    min_confidence: float = Field(default=0.75, ge=0.0, le=1.0)
    requires_approval: bool = True
    blocked_if_missing_evidence: bool = True
    blocked_actions: list[str] = Field(default_factory=list)
    status: str = Field(default="active", pattern="^(active|paused)$")


class CompliancePolicyOut(BaseModel):
    id: UUID
    tenant_id: str | None = None
    region: str
    policy_name: str
    action_type: str
    min_confidence: float
    requires_approval: bool
    blocked_if_missing_evidence: bool
    blocked_actions: list[str]
    status: str
    created_at: datetime
    updated_at: datetime


class PolicyCheckRequest(BaseModel):
    action_type: str = Field(..., pattern="^(intervention|export|sync|recommendation)$")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    evidence: str | None = None
    region: str = Field(default="global")
    high_impact: bool = False


class PolicyCheckResponse(BaseModel):
    allowed: bool
    reasons: list[str]
    matched_policies: list[str]


class ForecastScenarioCreate(BaseModel):
    scenario_name: str = Field(..., min_length=3, max_length=120)
    budget_cap: float = Field(..., gt=0)
    target_hires: int = Field(default=0, ge=0)
    target_retentions: int = Field(default=0, ge=0)
    retention_priority: float = Field(default=0.6, ge=0.0, le=1.0)
    hiring_priority: float = Field(default=0.4, ge=0.0, le=1.0)
    retention_unit_cost: float = Field(default=3500, gt=0)
    hire_unit_cost: float = Field(default=9500, gt=0)


class ForecastScenarioOut(BaseModel):
    id: UUID
    tenant_id: str | None = None
    scenario_name: str
    input_payload: dict
    output_payload: dict
    created_by: str | None = None
    created_at: datetime


class MLDriftSnapshotOut(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    id: UUID
    tenant_id: str | None = None
    model_name: str
    model_version: str
    drift_score: float
    needs_retraining: bool
    notes: str | None = None
    created_at: datetime


class MLModelCardOut(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    id: UUID
    tenant_id: str | None = None
    model_name: str
    version: str
    status: str
    pr_auc: float
    calibration_error: float
    fairness_gap: float
    notes: str | None = None
    approved_by: str | None = None
    approved_at: datetime | None = None
    created_at: datetime


class ReleaseGateCreate(BaseModel):
    environment: str = Field(default="dev", pattern="^(dev|stage|prod)$")
    artifact_name: str = Field(..., min_length=2, max_length=120)
    version: str = Field(..., min_length=1, max_length=80)
    required_checks: list[str] = Field(default_factory=list)
    notes: str | None = None


class ReleaseGateOut(BaseModel):
    id: UUID
    tenant_id: str | None = None
    environment: str
    artifact_name: str
    version: str
    status: str
    required_checks: list[str]
    approved_by: str | None = None
    approved_at: datetime | None = None
    notes: str | None = None
    created_at: datetime


class FairnessSummaryOut(BaseModel):
    tenant_id: str | None = None
    reference_group: str
    groups: list[dict]
    max_gap: float
    compliant: bool


class DRRunbookCreate(BaseModel):
    runbook_name: str = Field(..., min_length=3, max_length=120)
    environment: str = Field(default="prod", pattern="^(dev|stage|prod)$")
    rto_minutes: int = Field(default=120, ge=1)
    rpo_minutes: int = Field(default=15, ge=1)
    status: str = Field(
        default="draft", pattern="^(draft|ready|validated|needs_review)$"
    )
    notes: str | None = None


class DRRunbookOut(BaseModel):
    id: UUID
    tenant_id: str | None = None
    runbook_name: str
    environment: str
    rto_minutes: int
    rpo_minutes: int
    status: str
    last_drill_at: datetime | None = None
    last_drill_result: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class ProcurementArtifactCreate(BaseModel):
    artifact_type: str = Field(..., pattern="^(msa|dpa|sig|caiq|sla|security_pack)$")
    title: str = Field(..., min_length=3, max_length=120)
    version: str = Field(default="v1", max_length=40)
    status: str = Field(default="draft", pattern="^(draft|ready|approved)$")
    notes: str | None = None


class ProcurementArtifactOut(BaseModel):
    id: UUID
    tenant_id: str | None = None
    artifact_type: str
    title: str
    version: str
    status: str
    notes: str | None = None
    created_at: datetime
