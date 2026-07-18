"""
Pydantic schemas for request/response validation
Ensures type safety and automatic documentation
"""

from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID

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
    full_name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(
        ..., min_length=8, max_length=100, description="Must be at least 8 characters"
    )
    admin_id: str = Field(..., min_length=8, max_length=32, description="Required secure code")

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
    created_at: datetime


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
    sentiment_score: Optional[float] = Field(default=0.5, ge=0.0, le=1.0)
    skills: Optional[List[SkillCreate]] = []
    experiences: Optional[List[ExperienceCreate]] = []


class EmployeeUpdate(BaseModel):
    """Update employee"""

    full_name: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    sentiment_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    is_at_risk: Optional[bool] = None


class EmployeeOut(BaseModel):
    """Employee response"""

    id: UUID
    full_name: str
    email: str
    department: str
    role: str
    sentiment_score: float
    is_at_risk: bool
    retention_prob: Optional[float]
    skills: List[SkillOut] = []
    experiences: List[ExperienceOut] = []
    created_at: datetime
    updated_at: datetime


class EmployeeListOut(BaseModel):
    """Lightweight employee response for list endpoints (no skills/experiences)"""

    id: UUID
    full_name: str
    email: str
    department: str
    role: str
    sentiment_score: float
    is_at_risk: bool
    retention_prob: Optional[float]
    created_at: datetime
    updated_at: datetime


# ============ CANDIDATE SCHEMAS ============


class CandidateCreate(BaseModel):
    """Create candidate"""

    full_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    department: str = Field(..., min_length=1, max_length=100)
    role: str = Field(..., min_length=1, max_length=100)
    skills: Optional[List[SkillCreate]] = []
    experiences: Optional[List[ExperienceCreate]] = []


class CandidateOut(BaseModel):
    """Candidate response"""

    id: UUID
    full_name: str
    email: str
    department: str
    role: str
    sentiment_score: float
    match_score: Optional[float]
    skills: List[SkillOut] = []
    experiences: List[ExperienceOut] = []
    application_date: datetime
    created_at: datetime


class CandidateListOut(BaseModel):
    """Lightweight candidate response for list endpoints (no skills/experiences)"""

    id: UUID
    full_name: str
    email: str
    department: str
    role: str
    sentiment_score: float
    match_score: Optional[float]
    application_date: datetime
    created_at: datetime


# ============ AI/ANALYSIS SCHEMAS ============


class AIAnalysisRequest(BaseModel):
    """Request for AI talent analysis"""

    prompt: str = Field(
        ..., min_length=5, max_length=1000, description="What are you looking for?"
    )
    provider: str = Field(..., description="LLM provider: openai, claude, or groq")
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None

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
    candidates: List[EmployeeOut] = []
    confidence_score: Optional[float]
    processing_time_ms: float


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
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None
    page_context: Optional[dict] = None

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
    evidence: List[str] = []
    recommendations: List[str] = []
    actions: List[str] = []
    warnings: List[str] = []
    context: dict
    confidence_score: float
    provider: str
    surface: str
    generated_at: datetime


class SentimentReportRequest(BaseModel):
    """Request sentiment analysis report"""

    department: Optional[str] = None
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
    metrics: List[SentimentMetric]
    recommendations: List[str]


# ============ ERROR RESPONSE SCHEMAS ============


class ErrorResponse(BaseModel):
    """Standard error response"""

    error_code: str
    message: str
    details: Optional[dict] = None
    request_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ValidationErrorResponse(BaseModel):
    """Validation error response"""

    error_code: str = "VALIDATION_ERROR"
    message: str = "Request validation failed"
    errors: dict  # Field name -> error message
    request_id: Optional[str] = None


# ============ PAGINATION ============


class PaginationParams(BaseModel):
    """Pagination parameters"""

    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=10, ge=1, le=100)
    sort_by: Optional[str] = None
    sort_order: str = Field(default="asc", pattern="^(asc|desc)$")


class PaginatedResponse(BaseModel):
    """Generic paginated response"""

    total: int
    skip: int
    limit: int
    items: List[dict]


# ============ CHAT SCHEMAS ============


class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Session"


class ChatSessionRename(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)


class ChatSessionOut(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime


class ChatBulkDeleteRequest(BaseModel):
    session_ids: List[UUID]


class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=12000)
    provider: Optional[str] = "lmstudio"
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None


class ChatMessageOut(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    tool_trace: Optional[str] = None
    created_at: datetime


class ChatAttachmentOut(BaseModel):
    id: str
    session_id: str
    message_id: Optional[str] = None
    original_name: str
    content_type: Optional[str] = None
    file_path: str
    file_size: int
    parsing_status: str
    parsing_error: Optional[str] = None
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
    recommended_actions: List[str]
    drivers: List[AttritionDriverOut]


class AttritionExplainResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    generated_at: datetime
    model_version: str
    items: List[AttritionExplainOut]


class InterventionCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    target_scope: str = Field(
        default="team", pattern="^(employee|team|department|org)$"
    )
    target_employee_id: Optional[UUID] = None
    target_department: Optional[str] = None
    priority: str = Field(default="medium", pattern="^(low|medium|high|critical)$")
    status: str = Field(
        default="planned",
        pattern="^(planned|approved|in_progress|completed|cancelled)$",
    )
    owner_name: Optional[str] = None
    due_date: Optional[datetime] = None
    expected_impact: Optional[str] = None
    estimated_cost: Optional[float] = Field(default=None, ge=0.0)


class InterventionUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=200)
    description: Optional[str] = None
    target_scope: Optional[str] = Field(
        default=None, pattern="^(employee|team|department|org)$"
    )
    target_employee_id: Optional[UUID] = None
    target_department: Optional[str] = None
    priority: Optional[str] = Field(
        default=None, pattern="^(low|medium|high|critical)$"
    )
    status: Optional[str] = Field(
        default=None, pattern="^(planned|approved|in_progress|completed|cancelled)$"
    )
    owner_name: Optional[str] = None
    due_date: Optional[datetime] = None
    expected_impact: Optional[str] = None
    estimated_cost: Optional[float] = Field(default=None, ge=0.0)
    outcome_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class InterventionOut(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    target_scope: str
    target_employee_id: Optional[UUID] = None
    target_department: Optional[str] = None
    priority: str
    status: str
    owner_name: Optional[str] = None
    due_date: Optional[datetime] = None
    expected_impact: Optional[str] = None
    estimated_cost: Optional[float] = None
    outcome_score: Optional[float] = None
    closed_at: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class IntegrationConnectionCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    source_type: str = Field(
        ..., pattern="^(hris|ats|engagement|productivity|finance)$"
    )
    provider: str = Field(..., min_length=2, max_length=80)
    status: str = Field(default="draft", pattern="^(draft|active|paused|error)$")
    base_url: Optional[str] = None
    auth_type: str = Field(default="api_key", pattern="^(api_key|oauth2|basic)$")
    encrypted_secret_ref: Optional[str] = None
    sync_interval_minutes: Optional[int] = Field(default=60, ge=5, le=10080)


class IntegrationConnectionUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    source_type: Optional[str] = Field(
        default=None, pattern="^(hris|ats|engagement|productivity|finance)$"
    )
    provider: Optional[str] = Field(default=None, min_length=2, max_length=80)
    status: Optional[str] = Field(default=None, pattern="^(draft|active|paused|error)$")
    base_url: Optional[str] = None
    auth_type: Optional[str] = Field(default=None, pattern="^(api_key|oauth2|basic)$")
    encrypted_secret_ref: Optional[str] = None
    sync_interval_minutes: Optional[int] = Field(default=None, ge=5, le=10080)
    last_sync_status: Optional[str] = None
    last_sync_summary: Optional[str] = None


class IntegrationConnectionOut(BaseModel):
    id: UUID
    tenant_id: Optional[str] = None
    name: str
    source_type: str
    provider: str
    status: str
    base_url: Optional[str] = None
    auth_type: str
    encrypted_secret_ref: Optional[str] = None
    sync_interval_minutes: int = 60
    next_sync_at: Optional[datetime] = None
    sync_retry_count: int = 0
    last_sync_at: Optional[datetime] = None
    last_sync_status: Optional[str] = None
    last_sync_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class InterventionOutcomeCreate(BaseModel):
    checkpoint_day: int = Field(..., ge=30, le=90)
    status: str = Field(
        default="tracking", pattern="^(tracking|improved|neutral|worsened)$"
    )
    risk_delta: Optional[float] = None
    retention_delta: Optional[float] = None
    notes: Optional[str] = None


class InterventionOutcomeOut(BaseModel):
    id: UUID
    intervention_id: UUID
    checkpoint_day: int
    measured_at: datetime
    status: str
    risk_delta: Optional[float] = None
    retention_delta: Optional[float] = None
    notes: Optional[str] = None
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
    transform_rule: Optional[str] = None
    required: bool = True


class ConnectorFieldMappingOut(BaseModel):
    id: UUID
    connection_id: UUID
    source_field: str
    canonical_field: str
    transform_rule: Optional[str] = None
    required: bool
    created_at: datetime
    updated_at: datetime


class ConnectorSyncJobOut(BaseModel):
    id: UUID
    tenant_id: Optional[str] = None
    connection_id: UUID
    status: str
    source_type: str
    provider: str
    bronze_events: int
    silver_upserts: int
    quarantined: int
    error_message: Optional[str] = None
    started_at: datetime
    finished_at: Optional[datetime] = None


class RiskDriverDrilldownItem(BaseModel):
    employee_id: UUID
    full_name: str
    department: str
    role: str
    sentiment_score: float
    retention_prob: Optional[float] = None
    risk_probability: float
    evidence: str


class RiskDriverDrilldownResponse(BaseModel):
    factor: str
    generated_at: datetime
    items: List[RiskDriverDrilldownItem]


class CompliancePolicyCreate(BaseModel):
    region: str = Field(default="global", min_length=2, max_length=40)
    policy_name: str = Field(..., min_length=3, max_length=120)
    action_type: str = Field(
        default="intervention", pattern="^(intervention|export|sync|recommendation)$"
    )
    min_confidence: float = Field(default=0.75, ge=0.0, le=1.0)
    requires_approval: bool = True
    blocked_if_missing_evidence: bool = True
    blocked_actions: List[str] = Field(default_factory=list)
    status: str = Field(default="active", pattern="^(active|paused)$")


class CompliancePolicyOut(BaseModel):
    id: UUID
    tenant_id: Optional[str] = None
    region: str
    policy_name: str
    action_type: str
    min_confidence: float
    requires_approval: bool
    blocked_if_missing_evidence: bool
    blocked_actions: List[str]
    status: str
    created_at: datetime
    updated_at: datetime


class PolicyCheckRequest(BaseModel):
    action_type: str = Field(..., pattern="^(intervention|export|sync|recommendation)$")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    evidence: Optional[str] = None
    region: str = Field(default="global")
    high_impact: bool = False


class PolicyCheckResponse(BaseModel):
    allowed: bool
    reasons: List[str]
    matched_policies: List[str]


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
    tenant_id: Optional[str] = None
    scenario_name: str
    input_payload: dict
    output_payload: dict
    created_by: Optional[str] = None
    created_at: datetime


class MLDriftSnapshotOut(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    id: UUID
    tenant_id: Optional[str] = None
    model_name: str
    model_version: str
    drift_score: float
    needs_retraining: bool
    notes: Optional[str] = None
    created_at: datetime


class MLModelCardOut(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    id: UUID
    tenant_id: Optional[str] = None
    model_name: str
    version: str
    status: str
    pr_auc: float
    calibration_error: float
    fairness_gap: float
    notes: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime


class ReleaseGateCreate(BaseModel):
    environment: str = Field(default="dev", pattern="^(dev|stage|prod)$")
    artifact_name: str = Field(..., min_length=2, max_length=120)
    version: str = Field(..., min_length=1, max_length=80)
    required_checks: List[str] = Field(default_factory=list)
    notes: Optional[str] = None


class ReleaseGateOut(BaseModel):
    id: UUID
    tenant_id: Optional[str] = None
    environment: str
    artifact_name: str
    version: str
    status: str
    required_checks: List[str]
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime


class FairnessSummaryOut(BaseModel):
    tenant_id: Optional[str] = None
    reference_group: str
    groups: List[dict]
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
    notes: Optional[str] = None


class DRRunbookOut(BaseModel):
    id: UUID
    tenant_id: Optional[str] = None
    runbook_name: str
    environment: str
    rto_minutes: int
    rpo_minutes: int
    status: str
    last_drill_at: Optional[datetime] = None
    last_drill_result: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ProcurementArtifactCreate(BaseModel):
    artifact_type: str = Field(..., pattern="^(msa|dpa|sig|caiq|sla|security_pack)$")
    title: str = Field(..., min_length=3, max_length=120)
    version: str = Field(default="v1", max_length=40)
    status: str = Field(default="draft", pattern="^(draft|ready|approved)$")
    notes: Optional[str] = None


class ProcurementArtifactOut(BaseModel):
    id: UUID
    tenant_id: Optional[str] = None
    artifact_type: str
    title: str
    version: str
    status: str
    notes: Optional[str] = None
    created_at: datetime
