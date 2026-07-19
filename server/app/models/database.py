from sqlmodel import SQLModel, Field, create_engine, Session
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy import Column, inspect, text, String, UniqueConstraint
from sqlalchemy.pool import QueuePool
from typing import Optional
from uuid import UUID, uuid4
from datetime import datetime
import os
import logging

# Load environment variables FIRST
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://aurelinx:aurelinx_password@localhost:5432/aurelinx_db",
)

ALLOW_SQLITE = os.getenv("ALLOW_SQLITE", "").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
if DATABASE_URL.startswith("sqlite") and not ALLOW_SQLITE:
    raise RuntimeError(
        "SQLite is disabled. Set DATABASE_URL to PostgreSQL and use ALLOW_SQLITE only for explicit tests."
    )

engine = create_engine(
    DATABASE_URL,
    echo=os.getenv("DEBUG", "False").lower() == "true",
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 10},
)


# ============ USER & AUTHENTICATION ============
class UserTable(SQLModel, table=True):
    """System users for authentication"""

    __tablename__ = "users"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    email: str = Field(unique=True, index=True)
    full_name: str
    hashed_password: str
    is_active: bool = Field(default=True, index=True)
    is_admin: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ============ REGISTRATION CODES (ADMIN IDs) ============
class RegistrationCodeTable(SQLModel, table=True):
    """Secure invitation/admin codes to access login/register screen"""

    __tablename__ = "registration_codes"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    code_hash: str = Field(index=True)
    is_used: bool = Field(default=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    used_at: Optional[datetime] = Field(default=None)
    used_by: Optional[str] = Field(default=None)  # Email of the registered user


# ============ SKILLS ============
class SkillTable(SQLModel, table=True):
    """Proper skill tracking (not JSON strings)"""

    __tablename__ = "skills"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    name: str = Field(index=True)
    level: int = Field(ge=1, le=5)  # 1-5 proficiency scale
    employee_id: Optional[UUID] = Field(
        default=None, foreign_key="employeetable.id", index=True
    )
    candidate_id: Optional[UUID] = Field(
        default=None, foreign_key="candidatetable.id", index=True
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============ EXPERIENCE ============
class ExperienceTable(SQLModel, table=True):
    """Proper experience tracking"""

    __tablename__ = "experiences"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    company: str
    position: str
    duration_years: float
    description: str
    employee_id: Optional[UUID] = Field(
        default=None, foreign_key="employeetable.id", index=True
    )
    candidate_id: Optional[UUID] = Field(
        default=None, foreign_key="candidatetable.id", index=True
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============ EMPLOYEES ============
class EmployeeTable(SQLModel, table=True):
    """Core employee records with relationships"""

    __tablename__ = "employeetable"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    full_name: str = Field(index=True)
    email: str = Field(unique=True, index=True)
    department: str = Field(index=True)
    role: str = Field(index=True)
    sentiment_score: float = Field(default=0.5, ge=0.0, le=1.0)
    is_at_risk: bool = Field(default=False, index=True)
    retention_prob: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    join_date: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ============ CANDIDATES ============
class CandidateTable(SQLModel, table=True):
    """External candidates for recruitment"""

    __tablename__ = "candidatetable"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    full_name: str = Field(index=True)
    email: str = Field(unique=True, index=True)
    department: str = Field(index=True)
    role: str = Field(index=True)
    sentiment_score: float = Field(default=0.5, ge=0.0, le=1.0)
    application_date: datetime = Field(default_factory=datetime.utcnow)
    match_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ============ VECTOR EMBEDDINGS ============
class VectorEmbeddingTable(SQLModel, table=True):
    """Store embeddings for semantic search"""

    __tablename__ = "vector_embeddings"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    entity_type: str = Field(index=True)  # 'employee' or 'candidate'
    entity_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), index=True))
    embedding_text: str  # Original text that was embedded
    # Note: For actual vector storage, use pgvector extension
    # embedding: Vector(1536) = Field(sa_column=Column(Vector(1536)))
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============ AUDIT LOG ============
class AuditLogTable(SQLModel, table=True):
    """Track all important actions for compliance"""

    __tablename__ = "audit_logs"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    user_id: Optional[UUID] = Field(default=None, foreign_key="users.id", index=True)
    action: str = Field(index=True)  # 'VIEW_EMPLOYEE', 'EXPORT_REPORT', etc
    resource_type: str  # 'employee', 'candidate', 'report'
    resource_id: Optional[UUID] = Field(default=None)
    details: str  # JSON string with additional details
    ip_address: str
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


# ============ INTELLIGENCE CHAT ============
class ChatSessionTable(SQLModel, table=True):
    """Persistent chat sessions for Aurelinx Intelligence chat"""

    __tablename__ = "chat_sessions"

    id: Optional[str] = Field(
        default=None, sa_column=Column(String(36), primary_key=True)
    )
    user_id: str = Field(index=True)
    title: str = Field(default="New Session")
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    def __init__(self, **data):
        if "id" not in data or data["id"] is None:
            data["id"] = str(uuid4())
        super().__init__(**data)


class ChatMessageTable(SQLModel, table=True):
    """Messages belonging to chat sessions"""

    __tablename__ = "chat_messages"

    id: Optional[str] = Field(
        default=None, sa_column=Column(String(36), primary_key=True)
    )
    session_id: str = Field(foreign_key="chat_sessions.id", index=True)
    role: str = Field(index=True)  # user | assistant | system
    content: str
    tool_trace: Optional[str] = Field(
        default=None
    )  # JSON string with executed tool actions
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    def __init__(self, **data):
        if "id" not in data or data["id"] is None:
            data["id"] = str(uuid4())
        if "session_id" in data and data["session_id"] is not None:
            data["session_id"] = str(data["session_id"])
        super().__init__(**data)


class ChatAttachmentTable(SQLModel, table=True):
    """Uploaded files associated with a chat session/message"""

    __tablename__ = "chat_attachments"

    id: Optional[str] = Field(
        default=None, sa_column=Column(String(36), primary_key=True)
    )
    session_id: str = Field(foreign_key="chat_sessions.id", index=True)
    message_id: Optional[str] = Field(
        default=None, foreign_key="chat_messages.id", index=True
    )
    original_name: str
    content_type: Optional[str] = None
    file_path: str
    file_size: int = 0
    parsing_status: str = Field(
        default="pending", index=True
    )  # pending|parsed|failed|unsupported
    parsing_error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    def __init__(self, **data):
        if "id" not in data or data["id"] is None:
            data["id"] = str(uuid4())
        if "session_id" in data and data["session_id"] is not None:
            data["session_id"] = str(data["session_id"])
        if "message_id" in data and data["message_id"] is not None:
            data["message_id"] = str(data["message_id"])
        super().__init__(**data)


# ============ ENTERPRISE INTEGRATIONS ============
class IntegrationConnectionTable(SQLModel, table=True):
    """Configured source system connectors (HRIS/ATS/etc)."""

    __tablename__ = "integration_connections"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    name: str = Field(index=True)  # e.g. Workday Primary
    source_type: str = Field(
        index=True
    )  # hris | ats | engagement | productivity | finance
    provider: str = Field(
        index=True
    )  # workday | successfactors | oracle_hcm | greenhouse ...
    status: str = Field(default="draft", index=True)  # draft | active | paused | error
    base_url: Optional[str] = None
    auth_type: str = Field(default="api_key")  # api_key | oauth2 | basic
    encrypted_secret_ref: Optional[str] = None  # reference only, no raw secrets in DB
    sync_interval_minutes: int = Field(default=60, ge=5, le=10080)
    next_sync_at: Optional[datetime] = Field(default=None, index=True)
    sync_retry_count: int = Field(default=0, ge=0)
    last_sync_at: Optional[datetime] = None
    last_sync_status: Optional[str] = None  # success | failed | partial
    last_sync_summary: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class ConnectorFieldMappingTable(SQLModel, table=True):
    """Source-to-canonical field mapping for a connector."""

    __tablename__ = "connector_field_mappings"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    connection_id: UUID = Field(foreign_key="integration_connections.id", index=True)
    source_field: str = Field(index=True)
    canonical_field: str = Field(index=True)
    transform_rule: Optional[str] = None
    required: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class ConnectorSyncJobTable(SQLModel, table=True):
    """Historical record for connector sync runs."""

    __tablename__ = "connector_sync_jobs"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    connection_id: UUID = Field(foreign_key="integration_connections.id", index=True)
    status: str = Field(
        default="queued", index=True
    )  # queued | running | success | failed
    source_type: str = Field(index=True)
    provider: str = Field(index=True)
    bronze_events: int = Field(default=0)
    silver_upserts: int = Field(default=0)
    quarantined: int = Field(default=0)
    error_message: Optional[str] = None
    started_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    finished_at: Optional[datetime] = None


# ============ INTERVENTION WORKFLOW ============
class InterventionTable(SQLModel, table=True):
    """Retention intervention actions and lifecycle."""

    __tablename__ = "interventions"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    title: str = Field(index=True)
    description: Optional[str] = None
    target_scope: str = Field(index=True)  # employee | team | department | org
    target_employee_id: Optional[UUID] = Field(
        default=None, foreign_key="employeetable.id", index=True
    )
    target_department: Optional[str] = Field(default=None, index=True)
    priority: str = Field(
        default="medium", index=True
    )  # low | medium | high | critical
    status: str = Field(
        default="planned", index=True
    )  # planned | approved | in_progress | completed | cancelled
    owner_name: Optional[str] = Field(default=None, index=True)
    due_date: Optional[datetime] = Field(default=None, index=True)
    expected_impact: Optional[str] = None
    estimated_cost: Optional[float] = Field(default=None, ge=0.0)
    outcome_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    closed_at: Optional[datetime] = None
    created_by: Optional[str] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class InterventionOutcomeTable(SQLModel, table=True):
    """30/60/90 day outcome scoring checkpoints for interventions."""

    __tablename__ = "intervention_outcomes"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    intervention_id: UUID = Field(foreign_key="interventions.id", index=True)
    checkpoint_day: int = Field(index=True)  # 30 | 60 | 90
    measured_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    status: str = Field(
        default="tracking", index=True
    )  # tracking | improved | neutral | worsened
    risk_delta: Optional[float] = None  # negative is better
    retention_delta: Optional[float] = None  # positive is better
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


# ============ LEAN ENTERPRISE DATA PLATFORM ============
class DataContractTable(SQLModel, table=True):
    """Schema contract for connector payload validation."""

    __tablename__ = "data_contracts"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    source_type: str = Field(index=True)  # hris | ats
    provider: str = Field(index=True)  # workday | greenhouse
    version: str = Field(default="v1", index=True)
    required_fields: str  # JSON array string
    status: str = Field(default="active", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class RawEventTable(SQLModel, table=True):
    """Bronze layer raw payload."""

    __tablename__ = "raw_events"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    source_type: str = Field(index=True)
    provider: str = Field(index=True)
    external_id: Optional[str] = Field(default=None, index=True)
    payload: str  # JSON payload
    ingested_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class QuarantineEventTable(SQLModel, table=True):
    """Failed contract payloads."""

    __tablename__ = "quarantine_events"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    source_type: str = Field(index=True)
    provider: str = Field(index=True)
    external_id: Optional[str] = Field(default=None, index=True)
    payload: str
    reason: str
    quarantined_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class CanonicalEmployeeTable(SQLModel, table=True):
    """Silver layer canonical employee records from connectors."""

    __tablename__ = "canonical_employees"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    provider: str = Field(index=True)
    external_id: str = Field(index=True)
    full_name: str = Field(index=True)
    email: str = Field(index=True)
    department: str = Field(index=True)
    role: str = Field(index=True)
    sentiment_score: float = Field(default=0.5, ge=0.0, le=1.0)
    retention_prob: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    is_at_risk: bool = Field(default=False, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class CanonicalCandidateTable(SQLModel, table=True):
    """Silver layer canonical candidate records from connectors."""

    __tablename__ = "canonical_candidates"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    provider: str = Field(index=True)
    external_id: str = Field(index=True)
    full_name: str = Field(index=True)
    email: str = Field(index=True)
    department: str = Field(index=True)
    role: str = Field(index=True)
    match_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class GoldMetricSnapshotTable(SQLModel, table=True):
    """Gold layer aggregated snapshots used by executive dashboards."""

    __tablename__ = "gold_metric_snapshots"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    metric_type: str = Field(index=True)  # workforce|hiring|risk
    payload: str  # JSON
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class MLModelRegistryTable(SQLModel, table=True):
    """Simple model registry for lean ML operations."""

    __tablename__ = "ml_model_registry"
    model_config = {"protected_namespaces": ()}

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    model_name: str = Field(index=True)  # attrition_v1
    version: str = Field(index=True)
    status: str = Field(default="trained", index=True)  # trained|active|archived
    metrics: str  # JSON
    parameters: str  # JSON
    trained_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class CompliancePolicyTable(SQLModel, table=True):
    """Lean policy pack for regional compliance and high-impact action enforcement."""

    __tablename__ = "compliance_policies"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    region: str = Field(default="global", index=True)
    policy_name: str = Field(index=True)
    action_type: str = Field(index=True)  # intervention|export|sync|recommendation
    min_confidence: float = Field(default=0.75, ge=0.0, le=1.0)
    requires_approval: bool = Field(default=True, index=True)
    blocked_if_missing_evidence: bool = Field(default=True, index=True)
    blocked_actions: str = Field(default="[]")  # JSON array string
    status: str = Field(default="active", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class ForecastScenarioTable(SQLModel, table=True):
    """Persisted workforce scenario runs for CFO/CHRO review."""

    __tablename__ = "forecast_scenarios"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    scenario_name: str = Field(index=True)
    input_payload: str  # JSON
    output_payload: str  # JSON
    created_by: Optional[str] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class MLDriftSnapshotTable(SQLModel, table=True):
    """Lightweight drift monitoring snapshots."""

    __tablename__ = "ml_drift_snapshots"
    model_config = {"protected_namespaces": ()}

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    model_name: str = Field(index=True)
    model_version: str = Field(index=True)
    drift_score: float = Field(default=0.0, ge=0.0, le=1.0)
    needs_retraining: bool = Field(default=False, index=True)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class MLModelCardTable(SQLModel, table=True):
    """Model governance record for approvals, fairness, and promotion tracking."""

    __tablename__ = "ml_model_cards"
    model_config = {"protected_namespaces": ()}

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    model_name: str = Field(index=True)
    version: str = Field(index=True)
    status: str = Field(
        default="candidate", index=True
    )  # candidate|approved|champion|archived
    pr_auc: float = Field(default=0.0, ge=0.0, le=1.0)
    calibration_error: float = Field(default=0.0, ge=0.0, le=1.0)
    fairness_gap: float = Field(default=0.0, ge=0.0, le=1.0)
    notes: Optional[str] = None
    approved_by: Optional[str] = Field(default=None, index=True)
    approved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class ReleaseGateTable(SQLModel, table=True):
    """Simple release governance record for environment promotion."""

    __tablename__ = "release_gates"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    environment: str = Field(default="dev", index=True)
    artifact_name: str = Field(index=True)
    version: str = Field(index=True)
    status: str = Field(
        default="pending", index=True
    )  # pending|approved|rejected|promoted
    required_checks: str = Field(default="[]")  # JSON array string
    approved_by: Optional[str] = Field(default=None, index=True)
    approved_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class DRRunbookTable(SQLModel, table=True):
    """Operational DR/SRE runbook and recovery drill records."""

    __tablename__ = "dr_runbooks"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    runbook_name: str = Field(index=True)
    environment: str = Field(default="prod", index=True)
    rto_minutes: int = Field(default=120, ge=1)
    rpo_minutes: int = Field(default=15, ge=1)
    status: str = Field(
        default="draft", index=True
    )  # draft|ready|validated|needs_review
    last_drill_at: Optional[datetime] = None
    last_drill_result: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class ProcurementArtifactTable(SQLModel, table=True):
    """Procurement and security readiness artifact tracker."""

    __tablename__ = "procurement_artifacts"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    artifact_type: str = Field(index=True)  # msa|dpa|sig|caiq|sla|security_pack
    title: str = Field(index=True)
    version: str = Field(default="v1", index=True)
    status: str = Field(default="draft", index=True)  # draft|ready|approved
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


# ============ B2B INTEGRATION CREDENTIALS & AUDIT ============
class IntegrationApiKeyTable(SQLModel, table=True):
    """Store generated B2B/B2C API Keys and tokens securely"""

    __tablename__ = "integration_api_keys"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    name: str = Field(index=True)  # Description, e.g., "Slack Webhook Ingester"
    api_key_hash: str = Field(index=True)  # Hashed key for secure lookup
    status: str = Field(default="active", index=True)  # active | revoked
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    expires_at: Optional[datetime] = None


class IntegrationLogTable(SQLModel, table=True):
    """Log incoming integration API webhooks for audit and debugging"""

    __tablename__ = "integration_logs"

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    integration_name: str = Field(index=True)  # 'jira' | 'slack' | 'workday'
    status: str = Field(default="success", index=True)  # 'success' | 'failed'
    details: str  # Description or parsed summary
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class IntegrationWebhookEventTable(SQLModel, table=True):
    """Track webhook deliveries for idempotency, retries and audit."""

    __tablename__ = "integration_webhook_events"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "integration_name",
            "idempotency_key",
            name="uq_integration_idempotency",
        ),
    )

    id: UUID = Field(
        default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )
    tenant_id: str = Field(default="default", index=True)
    api_key_id: Optional[UUID] = Field(
        default=None, foreign_key="integration_api_keys.id", index=True
    )
    integration_name: str = Field(index=True)
    endpoint: str = Field(index=True)
    idempotency_key: Optional[str] = Field(default=None, index=True)
    status: str = Field(default="pending", index=True)  # pending | success | failed
    attempts: int = Field(default=0)
    last_error: Optional[str] = None
    payload: str
    headers: Optional[str] = None
    next_retry_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)


# ============ DATABASE INITIALIZATION ============
def create_db_and_tables():
    """Create all tables - USE ALEMBIC IN PRODUCTION"""
    logger.info("Creating database tables...")
    SQLModel.metadata.create_all(engine)
    _ensure_runtime_schema_compat()
    logger.info("Database initialization complete")


def _ensure_runtime_schema_compat():
    """
    Runtime-safe schema reconciliation for non-migrated environments.
    Keeps existing dev/prod DBs compatible with newly added chat fields.
    """
    try:
        inspector = inspect(engine)
        table_names = set(inspector.get_table_names())
        if "chat_attachments" not in table_names:
            return

        cols = {c["name"] for c in inspector.get_columns("chat_attachments")}
        dialect = engine.dialect.name

        alter_statements = []
        if "parsing_status" not in cols:
            if dialect == "postgresql":
                alter_statements.append(
                    "ALTER TABLE chat_attachments ADD COLUMN parsing_status VARCHAR(32) DEFAULT 'pending'"
                )
            else:
                alter_statements.append(
                    "ALTER TABLE chat_attachments ADD COLUMN parsing_status VARCHAR(32) DEFAULT 'pending'"
                )
        if "parsing_error" not in cols:
            alter_statements.append(
                "ALTER TABLE chat_attachments ADD COLUMN parsing_error TEXT"
            )

        if alter_statements:
            with engine.begin() as conn:
                for stmt in alter_statements:
                    conn.execute(text(stmt))
            logger.info(
                "Applied runtime schema compatibility updates for chat_attachments"
            )

        enterprise_column_plan = {
            "integration_connections": [
                ("tenant_id", "VARCHAR(64) DEFAULT 'default'"),
                ("sync_interval_minutes", "INTEGER DEFAULT 60"),
                ("next_sync_at", "TIMESTAMP NULL"),
                ("sync_retry_count", "INTEGER DEFAULT 0"),
            ],
            "connector_field_mappings": [
                ("tenant_id", "VARCHAR(64) DEFAULT 'default'")
            ],
            "connector_sync_jobs": [("tenant_id", "VARCHAR(64) DEFAULT 'default'")],
            "interventions": [("tenant_id", "VARCHAR(64) DEFAULT 'default'")],
            "intervention_outcomes": [("tenant_id", "VARCHAR(64) DEFAULT 'default'")],
            "data_contracts": [("tenant_id", "VARCHAR(64) DEFAULT 'default'")],
            "raw_events": [("tenant_id", "VARCHAR(64) DEFAULT 'default'")],
            "quarantine_events": [("tenant_id", "VARCHAR(64) DEFAULT 'default'")],
            "canonical_employees": [("tenant_id", "VARCHAR(64) DEFAULT 'default'")],
            "canonical_candidates": [("tenant_id", "VARCHAR(64) DEFAULT 'default'")],
            "gold_metric_snapshots": [("tenant_id", "VARCHAR(64) DEFAULT 'default'")],
            "ml_model_registry": [("tenant_id", "VARCHAR(64) DEFAULT 'default'")],
            "compliance_policies": [("tenant_id", "VARCHAR(64) DEFAULT 'default'")],
            "forecast_scenarios": [("tenant_id", "VARCHAR(64) DEFAULT 'default'")],
            "ml_drift_snapshots": [("tenant_id", "VARCHAR(64) DEFAULT 'default'")],
            "ml_model_cards": [("tenant_id", "VARCHAR(64) DEFAULT 'default'")],
            "release_gates": [("tenant_id", "VARCHAR(64) DEFAULT 'default'")],
            "dr_runbooks": [("tenant_id", "VARCHAR(64) DEFAULT 'default'")],
            "procurement_artifacts": [("tenant_id", "VARCHAR(64) DEFAULT 'default'")],
        }

        with engine.begin() as conn:
            for table_name, columns in enterprise_column_plan.items():
                if table_name not in table_names:
                    continue
                existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
                for column_name, column_sql in columns:
                    if column_name not in existing_cols:
                        try:
                            conn.execute(
                                text(
                                    f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_sql}"
                                )
                            )
                            logger.info(
                                f"Added missing column {column_name} to {table_name}"
                            )
                        except Exception as e:
                            logger.warning(
                                f"Could not add column {column_name} to {table_name}: {e}"
                            )
    except Exception as e:
        logger.warning(f"Runtime schema reconciliation skipped/failed: {e}")


def get_session():
    """Get database session - use as dependency injection"""
    with Session(engine) as session:
        yield session
