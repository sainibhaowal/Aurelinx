"""Tenant-scoped privacy and data-governance controls."""

import json
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, col, select

from app.core.security import TokenData, get_current_admin_user_strict, get_tenant_id
from app.models.database import (
    AuditLogTable,
    PrivacyConsentTable,
    PrivacyExportRequestTable,
    RetentionPolicyTable,
    SensitiveFieldPolicyTable,
    WorkflowApprovalTable,
    get_session,
)
from app.schemas.privacy import (
    ConsentCreate,
    ConsentOut,
    ExportRequestCreate,
    ExportRequestOut,
    RetentionPolicyCreate,
    RetentionPolicyOut,
    SensitiveFieldPolicyCreate,
    SensitiveFieldPolicyOut,
)

router = APIRouter(prefix="/privacy", tags=["privacy-governance"])


def _guard(user: TokenData, tenant_id: str) -> None:
    if tenant_id != user.tenant_id:
        raise HTTPException(
            status_code=403, detail="Authenticated user is not assigned to this tenant"
        )


def _sensitive_out(row: SensitiveFieldPolicyTable) -> dict:
    data = row.model_dump()
    try:
        data["allowed_roles"] = json.loads(row.allowed_roles or "[]")
    except (TypeError, json.JSONDecodeError):
        data["allowed_roles"] = []
    return data


@router.get("/consents", response_model=list[ConsentOut])
def list_consents(
    user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    _guard(user, tenant_id)
    return db.exec(
        select(PrivacyConsentTable)
        .where(PrivacyConsentTable.tenant_id == tenant_id)
        .limit(500)
    ).all()


@router.post("/consents", response_model=ConsentOut, status_code=201)
def create_consent(
    payload: ConsentCreate,
    user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    _guard(user, tenant_id)
    row = PrivacyConsentTable(
        **payload.model_dump(), tenant_id=tenant_id, recorded_by=str(user.user_id)
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post("/consents/{consent_id}/withdraw", response_model=ConsentOut)
def withdraw_consent(
    consent_id: str,
    user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    _guard(user, tenant_id)
    row = db.exec(
        select(PrivacyConsentTable).where(
            PrivacyConsentTable.id == consent_id,
            PrivacyConsentTable.tenant_id == tenant_id,
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Consent record not found")
    if row.status == "withdrawn":
        return row
    row.status = "withdrawn"
    db.add(row)
    db.add(
        AuditLogTable(
            user_id=str(user.user_id),
            action="WITHDRAW_PRIVACY_CONSENT",
            resource_type="privacy_consent",
            resource_id=str(row.id),
            details="Consent withdrawn by authorized administrator",
            ip_address="system",
            tenant_id=tenant_id,
        )
    )
    db.commit()
    db.refresh(row)
    return row


@router.get("/exports", response_model=list[ExportRequestOut])
def list_exports(
    user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    _guard(user, tenant_id)
    return db.exec(
        select(PrivacyExportRequestTable)
        .where(PrivacyExportRequestTable.tenant_id == tenant_id)
        .order_by(col(PrivacyExportRequestTable.created_at).desc())
        .limit(200)
    ).all()


@router.post("/exports", response_model=ExportRequestOut, status_code=201)
def request_export(
    payload: ExportRequestCreate,
    user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    _guard(user, tenant_id)
    return create_export_request(db, user, payload.model_dump())


def create_export_request(db: Session, user: TokenData, raw_payload: dict) -> dict:
    """Create only the approval record; data extraction is a separate operation."""
    payload = ExportRequestCreate.model_validate(raw_payload)
    tenant_id = user.tenant_id
    row = PrivacyExportRequestTable(
        tenant_id=tenant_id, requested_by=str(user.user_id), **payload.model_dump()
    )
    db.add(row)
    db.flush()
    approval = WorkflowApprovalTable(
        id=str(uuid4()),
        run_id="privacy-export-" + str(row.id),
        tenant_id=tenant_id,
        requested_by=str(user.user_id),
        action_type="request_data_export",
        action_payload=json.dumps(payload.model_dump(), sort_keys=True, default=str),
        action_payload_hash="",
        reason="Data export requires explicit human approval",
        expires_at=datetime.utcnow() + timedelta(minutes=30),
    )
    approval.action_payload_hash = (
        __import__("hashlib").sha256(approval.action_payload.encode()).hexdigest()
    )
    db.add(approval)
    row.approval_id = approval.id
    db.add(
        AuditLogTable(
            user_id=str(user.user_id),
            action="REQUEST_PRIVACY_EXPORT",
            resource_type="privacy_export",
            resource_id=str(row.id),
            details="Export request created; awaiting approval",
            ip_address="system",
            tenant_id=tenant_id,
        )
    )
    db.commit()
    db.refresh(row)
    return row.model_dump()


@router.get("/retention", response_model=list[RetentionPolicyOut])
def list_retention(
    user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    _guard(user, tenant_id)
    return db.exec(
        select(RetentionPolicyTable)
        .where(RetentionPolicyTable.tenant_id == tenant_id)
        .limit(500)
    ).all()


@router.post("/retention", response_model=RetentionPolicyOut, status_code=201)
def create_retention(
    payload: RetentionPolicyCreate,
    user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    _guard(user, tenant_id)
    row = RetentionPolicyTable(**payload.model_dump(), tenant_id=tenant_id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/sensitive-fields", response_model=list[SensitiveFieldPolicyOut])
def list_sensitive_fields(
    user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    _guard(user, tenant_id)
    rows = db.exec(
        select(SensitiveFieldPolicyTable)
        .where(SensitiveFieldPolicyTable.tenant_id == tenant_id)
        .limit(500)
    ).all()
    return [_sensitive_out(row) for row in rows]


@router.post(
    "/sensitive-fields", response_model=SensitiveFieldPolicyOut, status_code=201
)
def create_sensitive_field(
    payload: SensitiveFieldPolicyCreate,
    user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    _guard(user, tenant_id)
    row = SensitiveFieldPolicyTable(
        **payload.model_dump(exclude={"allowed_roles"}),
        allowed_roles=json.dumps(payload.allowed_roles),
        tenant_id=tenant_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _sensitive_out(row)
