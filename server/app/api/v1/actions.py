"""Governed outbound HR action proposals and approval decisions."""

import hashlib
import json
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, col, select

from app.core.security import (
    TokenData,
    get_current_admin_user_strict,
    get_current_user,
    get_tenant_id,
)
from app.models.database import (
    AuditLogTable,
    CompliancePolicyTable,
    ExternalActionAttemptTable,
    ExternalActionRequestTable,
    IntegrationConnectionTable,
    WorkflowApprovalTable,
    get_session,
)
from app.schemas.actions import ActionDecision, ActionProposalCreate, ActionProposalOut
from app.services.actions.dispatcher import dispatch_approved_action
from app.services.actions.policy import validate_action
from app.services.connectors.factory import get_connector

router = APIRouter(prefix="/actions", tags=["governed-actions"])


@router.get("/capabilities")
def list_capabilities(
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    """Return non-secret action capabilities for this tenant's connections."""
    if tenant_id != current_user.tenant_id and current_user.tenant_id != "default":
        raise HTTPException(
            status_code=403, detail="Authenticated user is not assigned to this tenant"
        )
    rows = db.exec(
        select(IntegrationConnectionTable).where(
            IntegrationConnectionTable.tenant_id == tenant_id
        )
    ).all()
    result = []
    for connection in rows:
        connector = get_connector(connection.provider)
        result.append(
            {
                "connection_id": str(connection.id),
                "provider": connection.provider,
                "name": connection.name,
                "status": connection.status,
                "supported_actions": (
                    sorted(connector.supported_actions) if connector else []
                ),
            }
        )
    return {"tenant_id": tenant_id, "connections": result}


def _out(row: ExternalActionRequestTable) -> ActionProposalOut:
    return ActionProposalOut.model_validate(row, from_attributes=True)


def _policy_block(db: Session, tenant_id: str, action_type: str) -> str | None:
    policies = db.exec(
        select(CompliancePolicyTable).where(
            CompliancePolicyTable.tenant_id == tenant_id,
            CompliancePolicyTable.status == "active",
            col(CompliancePolicyTable.action_type).in_([action_type, "all", "export"]),
        )
    ).all()
    for policy in policies:
        try:
            blocked = json.loads(policy.blocked_actions or "[]")
        except (TypeError, json.JSONDecodeError):
            blocked = []
        if isinstance(blocked, list) and (action_type in blocked or "all" in blocked):
            return f"Action blocked by active compliance policy: {policy.policy_name}"
    return None


@router.post("/proposals", response_model=ActionProposalOut, status_code=201)
def create_proposal(
    payload: ActionProposalCreate,
    current_user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    if tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=403, detail="Authenticated user is not assigned to this tenant"
        )
    error = validate_action(payload.action_type, payload.payload, current_user.is_admin)
    if error:
        raise HTTPException(status_code=403, detail=error)
    policy_error = _policy_block(db, tenant_id, payload.action_type)
    if policy_error:
        raise HTTPException(status_code=403, detail=policy_error)
    connection = (
        db.get(IntegrationConnectionTable, payload.connection_id)
        if payload.connection_id
        else None
    )
    if (
        not connection
        or connection.tenant_id != tenant_id
        or connection.provider != payload.provider.lower()
    ):
        raise HTTPException(
            status_code=422,
            detail="A matching tenant-scoped provider connection is required",
        )
    connector = get_connector(payload.provider)
    if connector is None or not connector.supports_action(payload.action_type):
        raise HTTPException(
            status_code=422,
            detail=f"{payload.provider} does not support {payload.action_type}",
        )
    existing = db.exec(
        select(ExternalActionRequestTable).where(
            ExternalActionRequestTable.tenant_id == tenant_id,
            ExternalActionRequestTable.idempotency_key == payload.idempotency_key,
        )
    ).first()
    serialized = json.dumps(
        payload.payload, sort_keys=True, separators=(",", ":"), default=str
    )
    payload_hash = hashlib.sha256(serialized.encode()).hexdigest()
    if existing:
        if existing.payload_hash != payload_hash:
            raise HTTPException(
                status_code=409,
                detail="Idempotency key was already used for a different payload",
            )
        return _out(existing)
    row = ExternalActionRequestTable(
        tenant_id=tenant_id,
        requested_by=str(current_user.user_id),
        provider=payload.provider.lower(),
        action_type=payload.action_type,
        connection_id=payload.connection_id,
        payload_hash=payload_hash,
        payload=serialized,
        idempotency_key=payload.idempotency_key,
    )
    db.add(row)
    db.flush()
    approval = WorkflowApprovalTable(
        id=str(uuid4()),
        run_id="action-" + row.id,
        tenant_id=tenant_id,
        requested_by=str(current_user.user_id),
        action_type=payload.action_type,
        action_payload_hash=row.payload_hash,
        action_payload=serialized,
        reason=payload.reason or "Outbound HR action requires human approval",
        expires_at=datetime.utcnow() + timedelta(minutes=30),
    )
    db.add(approval)
    row.approval_id = approval.id
    db.add(
        AuditLogTable(
            user_id=None,
            action="CREATE_ACTION_PROPOSAL",
            resource_type="external_action",
            resource_id=None,
            details=json.dumps(
                {
                    "provider": row.provider,
                    "action_type": row.action_type,
                    "tenant_id": tenant_id,
                }
            ),
            ip_address="system",
        )
    )
    db.commit()
    db.refresh(row)
    return _out(row)


@router.get("/proposals", response_model=list[ActionProposalOut])
def list_proposals(
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    if tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=403, detail="Authenticated user is not assigned to this tenant"
        )
    rows = db.exec(
        select(ExternalActionRequestTable)
        .where(ExternalActionRequestTable.tenant_id == tenant_id)
        .order_by(col(ExternalActionRequestTable.created_at).desc())
        .limit(100)
    ).all()
    return [_out(row) for row in rows]


@router.get("/approvals/pending")
def list_pending_approvals(
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    """Approvals inbox: pending human decisions across chat deletes + action proposals.

    Additive read-only route. No behavior change to existing flows.
    """
    if tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=403, detail="Authenticated user is not assigned to this tenant"
        )
    rows = db.exec(
        select(WorkflowApprovalTable)
        .where(WorkflowApprovalTable.tenant_id == tenant_id)
        .where(WorkflowApprovalTable.status == "pending")
        .order_by(col(WorkflowApprovalTable.created_at).desc())
        .limit(100)
    ).all()
    return [
        {
            "id": r.id,
            "run_id": r.run_id,
            "action_type": r.action_type,
            "reason": r.reason,
            "requested_by": r.requested_by,
            "expires_at": r.expires_at.isoformat() if r.expires_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.post("/proposals/{action_id}/decision", response_model=ActionProposalOut)
def decide_proposal(
    action_id: str,
    decision: ActionDecision,
    current_user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    if tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=403, detail="Authenticated user is not assigned to this tenant"
        )
    row = db.exec(
        select(ExternalActionRequestTable).where(
            ExternalActionRequestTable.id == action_id,
            ExternalActionRequestTable.tenant_id == tenant_id,
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Action proposal not found")
    if row.status != "pending_approval":
        raise HTTPException(
            status_code=409, detail="Action proposal is no longer pending"
        )
    approval = (
        db.get(WorkflowApprovalTable, row.approval_id) if row.approval_id else None
    )
    if not approval or approval.tenant_id != tenant_id or approval.status != "pending":
        raise HTTPException(status_code=409, detail="Approval is unavailable")
    if approval.expires_at <= datetime.utcnow():
        approval.status = "expired"
        row.status = "expired"
    else:
        approval.status = "approved" if decision.decision == "approve" else "rejected"
        row.status = approval.status
        approval.approved_by = str(current_user.user_id)
        approval.reason = decision.reason or approval.reason
        approval.resolved_at = datetime.utcnow()
    db.add(row)
    db.add(approval)
    db.commit()
    db.refresh(row)
    return _out(row)


@router.post("/proposals/{action_id}/execute", response_model=ActionProposalOut)
def execute_proposal(
    action_id: str,
    current_user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    if tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=403, detail="Authenticated user is not assigned to this tenant"
        )
    row = db.exec(
        select(ExternalActionRequestTable).where(
            ExternalActionRequestTable.id == action_id,
            ExternalActionRequestTable.tenant_id == tenant_id,
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Action proposal not found")
    if row.status != "approved":
        raise HTTPException(
            status_code=409, detail="Action must be approved before execution"
        )
    connection = (
        db.get(IntegrationConnectionTable, row.connection_id)
        if row.connection_id
        else None
    )
    if (
        not connection
        or connection.tenant_id != tenant_id
        or connection.provider != row.provider
    ):
        raise HTTPException(
            status_code=422,
            detail="A matching tenant-scoped provider connection is required",
        )
    attempt_number = (
        len(
            db.exec(
                select(ExternalActionAttemptTable).where(
                    ExternalActionAttemptTable.action_id == row.id
                )
            ).all()
        )
        + 1
    )
    attempt = ExternalActionAttemptTable(
        action_id=row.id, tenant_id=tenant_id, attempt_number=attempt_number
    )
    db.add(attempt)
    row.status = "running"
    db.add(row)
    db.commit()
    try:
        result = dispatch_approved_action(
            row.provider, row.action_type, json.loads(row.payload), connection
        )
        row.status = "completed"
        row.provider_request_id = (
            str(result.get("provider_request_id"))
            if result.get("provider_request_id")
            else None
        )
        row.result_summary = json.dumps(
            {
                key: value
                for key, value in result.items()
                if key not in {"payload", "headers", "token"}
            },
            default=str,
        )[:4000]
        attempt.status = "completed"
        attempt.provider_request_id = row.provider_request_id
        attempt.safe_result = row.result_summary
    except Exception as exc:
        db.rollback()
        row = db.get(ExternalActionRequestTable, action_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Action proposal was deleted")
        attempt = ExternalActionAttemptTable(
            action_id=action_id,
            tenant_id=tenant_id,
            attempt_number=attempt_number,
            status="failed",
            error_code=type(exc).__name__,
            safe_result=str(exc)[:500],
        )
        row.status = "failed"
        row.failure_reason = str(exc)[:500]
        db.add(attempt)
    row.updated_at = datetime.utcnow()
    row.completed_at = (
        datetime.utcnow() if row.status in {"completed", "failed"} else None
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _out(row)
