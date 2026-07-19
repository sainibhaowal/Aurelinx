"""
Aurelinx B2B/B2C Enterprise API Integration Middleware
Secure endpoint ingestions for Slack, Jira, and Workday systems.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header, Request, status
from sqlmodel import Session, select
from uuid import UUID
from datetime import datetime, timedelta
import hashlib
import hmac
import json
import secrets
from typing import Dict, Any, Optional

from app.models.database import (
    get_session,
    EmployeeTable,
    SkillTable,
    IntegrationApiKeyTable,
    IntegrationLogTable,
    IntegrationWebhookEventTable,
)
from app.core.logging_config import get_logger
from app.core.security import get_current_admin_user_strict, get_tenant_id

router = APIRouter(prefix="/integrations", tags=["integrations"])
logger = get_logger(__name__)


# Helper to generate a secure random API key token
def generate_api_key() -> str:
    # Generates a premium key prefixed with "aur_" for real-world authenticity
    random_hex = secrets.token_hex(24)
    return f"aur_{random_hex}"


# Helper to hash key for safe DB lookup
def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


# API Key security validator dependency
def verify_api_key(
    api_key_header: Optional[str] = Header(None, alias="X-API-Key"),
    tenant_id: str = Depends(get_tenant_id),
    session: Session = Depends(get_session),
):
    # Enforce header-only API key auth for ingestion endpoints.
    key = api_key_header
    if not key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API Ingestion Key. Pass in 'X-API-Key' header. Query parameters are not accepted.",
        )

    hashed = hash_api_key(key)
    # Lookup active keys in DB scoped to tenant
    db_key = session.exec(
        select(IntegrationApiKeyTable).where(
            IntegrationApiKeyTable.api_key_hash == hashed,
            IntegrationApiKeyTable.status == "active",
            IntegrationApiKeyTable.tenant_id == tenant_id,
        )
    ).first()

    if not db_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API Ingestion Key.",
        )

    if db_key.expires_at and db_key.expires_at < datetime.utcnow():
        db_key.status = "revoked"
        session.add(db_key)
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API Ingestion Key has expired.",
        )

    return db_key


async def verify_payload_signature(
    request: Request,
    x_signature: Optional[str] = Header(None, alias="X-Signature"),
    api_key_header: Optional[str] = Header(None, alias="X-API-Key"),
):
    raw_key = api_key_header
    if not raw_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header for signature verification.",
        )

    if not x_signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Signature header.",
        )

    body_bytes = await request.body()
    expected_signature = x_signature.replace("sha256=", "")
    computed_signature = hmac.new(
        raw_key.encode("utf-8"), body_bytes, hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(computed_signature, expected_signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid payload signature.",
        )

    return True


def get_idempotency_key(
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")
) -> Optional[str]:
    return idempotency_key


def create_webhook_event_record(
    session: Session,
    api_key: IntegrationApiKeyTable,
    integration_name: str,
    endpoint: str,
    payload: Dict[str, Any],
    headers: Dict[str, Any],
    idempotency_key: Optional[str] = None,
):
    existing = None
    if idempotency_key:
        existing = session.exec(
            select(IntegrationWebhookEventTable).where(
                IntegrationWebhookEventTable.idempotency_key == idempotency_key,
                IntegrationWebhookEventTable.integration_name == integration_name,
                IntegrationWebhookEventTable.tenant_id == api_key.tenant_id,
            )
        ).first()

    if existing:
        return existing, True

    event = IntegrationWebhookEventTable(
        tenant_id=api_key.tenant_id,
        api_key_id=api_key.id,
        integration_name=integration_name,
        endpoint=endpoint,
        idempotency_key=idempotency_key,
        payload=json.dumps(payload, default=str),
        headers=json.dumps(headers, default=str),
        status="pending",
        attempts=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event, False


def update_webhook_event_status(
    session: Session,
    event: IntegrationWebhookEventTable,
    success: bool,
    error_message: Optional[str] = None,
):
    event.attempts += 1
    event.updated_at = datetime.utcnow()
    if success:
        event.status = "success"
        event.last_error = None
        event.next_retry_at = None
    else:
        event.status = "failed"
        event.last_error = error_message[:240] if error_message else "Unknown failure"
        event.next_retry_at = datetime.utcnow() + timedelta(minutes=15)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


# =====================================================================
# 1. API KEY GENERATION ENDPOINTS
# =====================================================================


@router.post("/token", status_code=201)
def create_ingestion_token(
    name: str = Query(
        ...,
        description="A friendly name for this integration credential, e.g. Jira-Webhook",
    ),
    expires_in_days: int = Query(30, description="Expiration buffer in days"),
    current_user=Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    session: Session = Depends(get_session),
):
    """
    Generates a secure cryptographically signed API token for B2B/B2C ingestion systems.
    The raw key is shown only once to the client, while a SHA-256 hash is saved in the DB.
    Requires admin authentication.
    """
    raw_key = generate_api_key()
    hashed_key = hash_api_key(raw_key)

    expiry = datetime.utcnow() + timedelta(days=expires_in_days)

    db_key = IntegrationApiKeyTable(
        tenant_id=tenant_id,
        name=name,
        api_key_hash=hashed_key,
        status="active",
        created_at=datetime.utcnow(),
        expires_at=expiry,
    )

    session.add(db_key)
    session.commit()
    session.refresh(db_key)

    return {
        "id": str(db_key.id),
        "name": db_key.name,
        "api_key": raw_key,  # Returned only once!
        "expires_at": db_key.expires_at.isoformat(),
        "status": db_key.status,
        "tenant_id": db_key.tenant_id,
        "note": "Copy this token securely. It will not be shown again.",
    }


@router.get("/tokens")
def list_active_tokens(
    current_user=Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    session: Session = Depends(get_session),
):
    """List all registered API tokens for the current tenant."""
    tokens = session.exec(
        select(IntegrationApiKeyTable).where(
            IntegrationApiKeyTable.tenant_id == tenant_id
        )
    ).all()
    return [
        {
            "id": str(t.id),
            "name": t.name,
            "status": t.status,
            "created_at": t.created_at.isoformat(),
            "expires_at": t.expires_at.isoformat() if t.expires_at else None,
            "tenant_id": t.tenant_id,
        }
        for t in tokens
    ]


@router.delete("/token/{token_id}")
def revoke_token(
    token_id: UUID,
    current_user=Depends(get_current_admin_user_strict),
    session: Session = Depends(get_session),
):
    """Instantly revokes access credentials for B2B platforms."""
    db_key = session.exec(
        select(IntegrationApiKeyTable).where(IntegrationApiKeyTable.id == token_id)
    ).first()
    if not db_key:
        raise HTTPException(status_code=404, detail="Token credential not found")

    db_key.status = "revoked"
    session.add(db_key)
    session.commit()
    return {"message": "Access token revoked successfully"}


@router.post("/token/{token_id}/rotate", status_code=201)
def rotate_token(
    token_id: UUID,
    current_user=Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    session: Session = Depends(get_session),
):
    """Rotate an existing ingestion token. The old token is revoked and a new one is issued."""
    db_key = session.exec(
        select(IntegrationApiKeyTable).where(
            IntegrationApiKeyTable.id == token_id,
            IntegrationApiKeyTable.tenant_id == tenant_id,
        )
    ).first()
    if not db_key:
        raise HTTPException(status_code=404, detail="Token credential not found")

    db_key.status = "revoked"
    session.add(db_key)

    raw_key = generate_api_key()
    hashed_key = hash_api_key(raw_key)
    expiry = db_key.expires_at or (datetime.utcnow() + timedelta(days=30))

    new_key = IntegrationApiKeyTable(
        tenant_id=db_key.tenant_id,
        name=db_key.name,
        api_key_hash=hashed_key,
        status="active",
        created_at=datetime.utcnow(),
        expires_at=expiry,
    )
    session.add(new_key)
    session.commit()
    session.refresh(new_key)

    return {
        "id": str(new_key.id),
        "name": new_key.name,
        "api_key": raw_key,
        "expires_at": new_key.expires_at.isoformat() if new_key.expires_at else None,
        "status": new_key.status,
        "tenant_id": new_key.tenant_id,
        "note": "Copy this rotated token securely. The previous key has been revoked.",
    }


# =====================================================================
# 2. INCOMING DATA INGESTION WEBHOOKS
# =====================================================================


@router.post("/workday")
def ingest_workday_hris(
    payload: Dict[str, Any],
    request: Request,
    api_key: IntegrationApiKeyTable = Depends(verify_api_key),
    signature_valid: bool = Depends(verify_payload_signature),
    idempotency_key: Optional[str] = Depends(get_idempotency_key),
    session: Session = Depends(get_session),
):
    """
    Workday HRIS Synchronizer endpoint.
    Processes Hires, Updates, and Promotions dynamically to update database states.
    """
    headers = {
        k: v
        for k, v in request.headers.items()
        if k.lower() in {"x-api-key", "x-signature", "idempotency-key", "content-type"}
    }

    event, duplicate = create_webhook_event_record(
        session=session,
        api_key=api_key,
        integration_name="workday",
        endpoint="/workday",
        payload=payload,
        headers=headers,
        idempotency_key=idempotency_key,
    )

    if duplicate:
        return {
            "status": "duplicate",
            "message": "This idempotent Workday payload was already received and processed.",
            "event_id": str(event.id),
        }

    action = payload.get("action", "update")
    employee_data = payload.get("employee")

    if not employee_data or not employee_data.get("email"):
        update_webhook_event_status(
            session,
            event,
            success=False,
            error_message="Missing employee contact or email",
        )
        raise HTTPException(
            status_code=400,
            detail="Missing required 'employee' details or 'email' address.",
        )

    email = employee_data["email"].strip().lower()
    full_name = employee_data.get("full_name", "Unknown Employee")
    dept = employee_data.get("department", "Engineering")
    role = employee_data.get("role", "Software Engineer")
    skills = employee_data.get("skills", [])

    emp = session.exec(
        select(EmployeeTable).where(EmployeeTable.email == email)
    ).first()
    summary = ""

    if action == "hire" and not emp:
        emp = EmployeeTable(
            full_name=full_name,
            email=email,
            department=dept,
            role=role,
            sentiment_score=0.75,
            is_at_risk=False,
            join_date=datetime.utcnow(),
        )
        session.add(emp)
        session.commit()
        session.refresh(emp)

        for s in skills:
            skill_obj = SkillTable(
                name=s.get("name"),
                level=s.get("level", 3),
                employee_id=emp.id,
            )
            session.add(skill_obj)
        session.commit()
        summary = f"Workday Sync: Hired new employee {full_name} ({email}) with {len(skills)} skills."
    else:
        if not emp:
            emp = EmployeeTable(
                full_name=full_name,
                email=email,
                department=dept,
                role=role,
                join_date=datetime.utcnow() - timedelta(days=365),
            )
            session.add(emp)
            session.commit()
            session.refresh(emp)

        emp.full_name = full_name
        emp.department = dept
        emp.role = role
        emp.updated_at = datetime.utcnow()
        session.add(emp)

        existing_skills = {
            s.name.lower()
            for s in session.exec(
                select(SkillTable).where(SkillTable.employee_id == emp.id)
            ).all()
            if s.name
        }
        for s in skills:
            s_name = s.get("name")
            if s_name and s_name.lower() not in existing_skills:
                skill_obj = SkillTable(
                    name=s_name,
                    level=s.get("level", 3),
                    employee_id=emp.id,
                )
                session.add(skill_obj)
        session.commit()
        summary = (
            f"Workday Sync: Updated employee profile details for {full_name} ({email})."
        )

    update_webhook_event_status(session, event, success=True)

    log = IntegrationLogTable(
        tenant_id=api_key.tenant_id,
        integration_name="workday",
        status="success",
        details=summary,
    )
    session.add(log)
    session.commit()

    return {"status": "success", "message": summary, "employee_id": str(emp.id)}


@router.post("/slack")
def ingest_slack_sentiment(
    payload: Dict[str, Any],
    request: Request,
    api_key: IntegrationApiKeyTable = Depends(verify_api_key),
    signature_valid: bool = Depends(verify_payload_signature),
    idempotency_key: Optional[str] = Depends(get_idempotency_key),
    session: Session = Depends(get_session),
):
    """
    Slack Communication Sentiment Webhook.
    Analyzes message frequencies and sentiment indexes to dynamically adjust Employee Attrition parameters.
    """
    headers = {
        k: v
        for k, v in request.headers.items()
        if k.lower() in {"x-api-key", "x-signature", "idempotency-key", "content-type"}
    }

    event, duplicate = create_webhook_event_record(
        session=session,
        api_key=api_key,
        integration_name="slack",
        endpoint="/slack",
        payload=payload,
        headers=headers,
        idempotency_key=idempotency_key,
    )

    if duplicate:
        return {
            "status": "duplicate",
            "message": "This idempotent Slack payload was already received and processed.",
            "event_id": str(event.id),
        }

    email = payload.get("email")
    sentiment = payload.get("sentiment_score")
    message_count = payload.get("message_count", 0)

    if not email or sentiment is None:
        update_webhook_event_status(
            session,
            event,
            success=False,
            error_message="Missing required email or sentiment_score",
        )
        raise HTTPException(
            status_code=400,
            detail="Missing required parameters: 'email' and 'sentiment_score'",
        )

    email = email.strip().lower()
    emp = session.exec(
        select(EmployeeTable).where(EmployeeTable.email == email)
    ).first()
    if not emp:
        update_webhook_event_status(
            session, event, success=False, error_message=f"Employee not found: {email}"
        )
        raise HTTPException(
            status_code=404,
            detail=f"Employee with email {email} not found in directory.",
        )

    old_sentiment = emp.sentiment_score
    emp.sentiment_score = max(0.0, min(1.0, float(sentiment)))

    if emp.sentiment_score <= 0.35:
        emp.is_at_risk = True
    elif emp.sentiment_score >= 0.70:
        emp.is_at_risk = False

    emp.updated_at = datetime.utcnow()
    session.add(emp)
    session.commit()

    summary = f"Slack Sync: Adjusted morale score for {emp.full_name} from {old_sentiment:.2f} to {emp.sentiment_score:.2f} (Activity: {message_count} messages)."

    update_webhook_event_status(session, event, success=True)

    log = IntegrationLogTable(
        tenant_id=api_key.tenant_id,
        integration_name="slack",
        status="success",
        details=summary,
    )
    session.add(log)
    session.commit()

    return {
        "status": "success",
        "message": summary,
        "current_hazard_factor": emp.sentiment_score,
    }


@router.post("/jira")
def ingest_jira_collaboration(
    payload: Dict[str, Any],
    request: Request,
    api_key: IntegrationApiKeyTable = Depends(verify_api_key),
    signature_valid: bool = Depends(verify_payload_signature),
    idempotency_key: Optional[str] = Depends(get_idempotency_key),
    session: Session = Depends(get_session),
):
    """
    Jira Agile Activity Webhook.
    Captures Ticket collaborations and pull requests between assignees/reporters,
    directly adding active collaboration logs to feed ONA Network graphs.
    """
    headers = {
        k: v
        for k, v in request.headers.items()
        if k.lower() in {"x-api-key", "x-signature", "idempotency-key", "content-type"}
    }

    event, duplicate = create_webhook_event_record(
        session=session,
        api_key=api_key,
        integration_name="jira",
        endpoint="/jira",
        payload=payload,
        headers=headers,
        idempotency_key=idempotency_key,
    )

    if duplicate:
        return {
            "status": "duplicate",
            "message": "This idempotent Jira payload was already received and processed.",
            "event_id": str(event.id),
        }

    reporter_email = payload.get("reporter_email")
    assignee_email = payload.get("assignee_email")
    issue_key = payload.get("issue_key", "TASK")
    activity_type = payload.get("activity_type", "ticket_resolved")

    if not reporter_email or not assignee_email:
        update_webhook_event_status(
            session,
            event,
            success=False,
            error_message="Missing reporter or assignee email",
        )
        raise HTTPException(
            status_code=400,
            detail="Both 'reporter_email' and 'assignee_email' are required.",
        )

    reporter_email = reporter_email.strip().lower()
    assignee_email = assignee_email.strip().lower()

    rep = session.exec(
        select(EmployeeTable).where(EmployeeTable.email == reporter_email)
    ).first()
    asg = session.exec(
        select(EmployeeTable).where(EmployeeTable.email == assignee_email)
    ).first()

    if not rep or not asg:
        update_webhook_event_status(
            session,
            event,
            success=False,
            error_message="Reporter or assignee not found in directory",
        )
        raise HTTPException(
            status_code=400,
            detail=f"Both developers must exist in directory. Reporter found: {rep is not None}, Assignee found: {asg is not None}",
        )

    summary = f"Jira Collaboration: {rep.email} <-> {asg.email} on issue {issue_key} ({activity_type})"

    update_webhook_event_status(session, event, success=True)

    log = IntegrationLogTable(
        tenant_id=api_key.tenant_id,
        integration_name="jira",
        status="success",
        details=summary,
    )
    session.add(log)
    session.commit()

    return {
        "status": "success",
        "message": "Jira telemetry ingested successfully",
        "collaboration": summary,
    }


@router.get("/logs")
def list_integration_logs(
    limit: int = Query(50, ge=1, le=200),
    current_user=Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    session: Session = Depends(get_session),
):
    """List recent integration logs for audit panels."""
    logs = session.exec(
        select(IntegrationLogTable)
        .where(IntegrationLogTable.tenant_id == tenant_id)
        .order_by(IntegrationLogTable.created_at.desc())
        .limit(limit)
    ).all()
    return logs


@router.get("/events")
def list_webhook_events(
    limit: int = Query(50, ge=1, le=200),
    current_user=Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    session: Session = Depends(get_session),
):
    """List recent webhook delivery events for the tenant."""
    events = session.exec(
        select(IntegrationWebhookEventTable)
        .where(IntegrationWebhookEventTable.tenant_id == tenant_id)
        .order_by(IntegrationWebhookEventTable.updated_at.desc())
        .limit(limit)
    ).all()
    return events
