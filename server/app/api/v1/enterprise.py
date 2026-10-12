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
Enterprise HR intelligence endpoints:
- Explainable attrition risk
- Intervention workflow
- Integration connector registry
"""

import json
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.core.data_policy import filter_real_records
from app.core.security import (
    TokenData,
    get_current_admin_user_strict,
    get_current_user,
    get_tenant_id,
)
from app.models.database import (
    AuditLogTable,
    ConnectorSyncJobTable,
    EmployeeTable,
    GoldMetricSnapshotTable,
    IntegrationConnectionTable,
    InterventionOutcomeTable,
    InterventionTable,
    QuarantineEventTable,
    get_session,
)
from app.schemas.schemas import (
    AttritionExplainResponse,
    ConnectionSyncStatusOut,
    IntegrationConnectionCreate,
    IntegrationConnectionOut,
    IntegrationConnectionUpdate,
    InterventionCreate,
    InterventionOut,
    InterventionOutcomeCreate,
    InterventionOutcomeOut,
    InterventionUpdate,
    RiskDriverDrilldownResponse,
)
from app.services.connectors.factory import (
    PROVIDER_PRESETS,
    get_connector,
    get_provider_preset,
)
from app.services.connectors.secrets import open_credentials, seal_credentials

router = APIRouter(prefix="/enterprise", tags=["enterprise"])


@router.get("/connection-providers")
async def list_connection_provider_presets():
    """Return non-secret provider defaults used by the connection form."""
    return {"providers": PROVIDER_PRESETS}


def _audit(
    db: Session,
    current_user: TokenData,
    action: str,
    resource_type: str,
    resource_id: UUID | None = None,
    details: dict | None = None,
):
    user_uuid = None
    if current_user.user_id:
        try:
            user_uuid = UUID(current_user.user_id)
        except ValueError:
            user_uuid = None
    db.add(
        AuditLogTable(
            user_id=user_uuid,
            tenant_id=current_user.tenant_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=json.dumps(details or {}, default=str),
            ip_address="system",
        )
    )


def _json(payload: dict) -> str:
    return json.dumps(payload, default=str)


@router.get("/attrition/explain", response_model=AttritionExplainResponse)
async def explain_attrition(
    top_n: int = Query(25, ge=1, le=200),
    department: str | None = Query(default=None),
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    # This legacy API remains for compatibility, but it must follow the signed-in
    # tenant and must not manufacture probabilities from profile heuristics.
    tenant_id = current_user.tenant_id or "default"
    query = select(EmployeeTable).where(EmployeeTable.tenant_id == tenant_id)
    if department:
        query = query.where(EmployeeTable.department == department)

    employees = filter_real_records(db.exec(query).all())
    return AttritionExplainResponse(
        generated_at=datetime.utcnow(),
        model_version="unavailable-no-observed-outcomes",
        status="insufficient_outcome_data",
        message=(
            "This tenant has no validated departure and censoring history. "
            "No individual attrition probability is available."
        ),
        tenant_profile_count=len(employees),
        items=[],
    )


@router.get("/risk-explain")
async def explain_single_risk(
    email: str = Query(...),
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Single-employee risk proof: score + why + trend. Additive, tenant-scoped."""
    from app.services.risk_explainer import explain_employee, trend_velocity

    tenant_id = current_user.tenant_id or "default"
    row = db.exec(
        select(EmployeeTable)
        .where(EmployeeTable.tenant_id == tenant_id)
        .where(EmployeeTable.email == email.strip().lower())
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Employee not found")
    explained = explain_employee(row)
    snaps = db.exec(
        select(GoldMetricSnapshotTable)
        .where(GoldMetricSnapshotTable.tenant_id == tenant_id)
        .order_by(GoldMetricSnapshotTable.created_at.desc())
        .limit(6)
    ).all()
    trend = trend_velocity([{"payload": s.payload} for s in reversed(snaps)])
    return {"tenant_id": tenant_id, "explanation": explained, "org_trend": trend}


@router.get("/sync-health")
async def sync_health(
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    """Aggregated sync health: connections + last jobs + quarantine. Additive read-only."""
    connections = db.exec(
        select(IntegrationConnectionTable).where(
            IntegrationConnectionTable.tenant_id == tenant_id
        )
    ).all()
    jobs = db.exec(
        select(ConnectorSyncJobTable)
        .where(ConnectorSyncJobTable.tenant_id == tenant_id)
        .order_by(ConnectorSyncJobTable.started_at.desc())
        .limit(10)
    ).all()
    qcount = len(
        db.exec(
            select(QuarantineEventTable).where(
                QuarantineEventTable.tenant_id == tenant_id
            )
        ).all()
    )
    return {
        "tenant_id": tenant_id,
        "connections": [
            {
                "id": str(c.id),
                "name": c.name,
                "provider": c.provider,
                "status": c.status,
                "last_sync_status": c.last_sync_status,
                "last_sync_summary": c.last_sync_summary,
                "next_sync_at": c.next_sync_at.isoformat() if c.next_sync_at else None,
            }
            for c in connections
        ],
        "recent_jobs": [
            {
                "id": str(j.id),
                "provider": j.provider,
                "status": j.status,
                "bronze": j.bronze_events,
                "silver": j.silver_upserts,
                "quarantined": j.quarantined,
                "error": j.error_message,
                "started_at": j.started_at.isoformat() if j.started_at else None,
            }
            for j in jobs
        ],
        "quarantined_total": qcount,
    }


@router.get("/risk-drivers/drilldown", response_model=RiskDriverDrilldownResponse)
async def risk_driver_drilldown(
    factor: str = Query(...),
    top_n: int = Query(30, ge=1, le=10000),
    current_user: TokenData = Depends(get_current_user),
):
    # Do not return profile heuristics as validated individual attrition risk.
    # Keep factor/top_n accepted for old clients while the outcome-data pipeline
    # is not available.
    return RiskDriverDrilldownResponse(
        factor=factor,
        generated_at=datetime.utcnow(),
        status="insufficient_outcome_data",
        message=(
            "Observed employee departures and censoring dates are required "
            "before individual risk probabilities can be returned."
        ),
        items=[],
    )


def _to_intervention_out(item: InterventionTable) -> InterventionOut:
    return InterventionOut(
        id=item.id,
        title=item.title,
        description=item.description,
        target_scope=item.target_scope,
        target_employee_id=item.target_employee_id,
        target_department=item.target_department,
        priority=item.priority,
        status=item.status,
        owner_name=item.owner_name,
        due_date=item.due_date,
        expected_impact=item.expected_impact,
        estimated_cost=item.estimated_cost,
        outcome_score=item.outcome_score,
        closed_at=item.closed_at,
        created_by=item.created_by,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("/interventions", response_model=list[InterventionOut])
async def list_interventions(
    status_filter: str | None = Query(default=None),
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    query = select(InterventionTable).where(InterventionTable.tenant_id == tenant_id)
    if status_filter:
        query = query.where(InterventionTable.status == status_filter)
    rows = db.exec(query.order_by(InterventionTable.created_at.desc())).all()
    return [_to_intervention_out(r) for r in rows]


@router.post(
    "/interventions",
    response_model=InterventionOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_intervention(
    payload: InterventionCreate,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    if payload.priority in {"high", "critical"} and not current_user.is_admin:
        raise HTTPException(
            status_code=403, detail="High-impact interventions require admin approval"
        )
    row = InterventionTable(
        tenant_id=tenant_id,
        title=payload.title,
        description=payload.description,
        target_scope=payload.target_scope,
        target_employee_id=payload.target_employee_id,
        target_department=payload.target_department,
        priority=payload.priority,
        # A connection cannot become active until a live provider verification
        # succeeds. This prevents an unverified credential from entering the
        # scheduler even when a client submits status=active.
        status="draft",
        owner_name=payload.owner_name,
        due_date=payload.due_date,
        expected_impact=payload.expected_impact,
        estimated_cost=payload.estimated_cost,
        created_by=current_user.user_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(
        db,
        current_user,
        "CREATE_INTERVENTION",
        "intervention",
        row.id,
        {"priority": payload.priority, "target_scope": payload.target_scope},
    )
    db.commit()
    return _to_intervention_out(row)


@router.patch("/interventions/{intervention_id}", response_model=InterventionOut)
async def update_intervention(
    intervention_id: UUID,
    payload: InterventionUpdate,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    row = db.get(InterventionTable, intervention_id)
    if not row or row.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Intervention not found")
    requested_status = payload.status
    if requested_status and requested_status != row.status:
        allowed_transitions = {
            "planned": {"approved", "in_progress", "cancelled", "completed"},
            "approved": {"in_progress", "cancelled", "completed"},
            "in_progress": {"completed", "cancelled", "planned", "approved"},
            "completed": {"in_progress", "planned", "approved"},
            "cancelled": {"in_progress", "planned", "approved"},
        }
        if requested_status not in allowed_transitions.get(row.status, set()):
            raise HTTPException(
                status_code=409,
                detail=f"Invalid intervention transition: {row.status} -> {requested_status}",
            )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    if row.status in {"completed", "cancelled"} and row.closed_at is None:
        row.closed_at = datetime.utcnow()
    row.updated_at = datetime.utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(
        db,
        current_user,
        "UPDATE_INTERVENTION",
        "intervention",
        row.id,
        {"status": row.status, "priority": row.priority},
    )
    db.commit()
    return _to_intervention_out(row)


@router.delete(
    "/interventions/{intervention_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_intervention(
    intervention_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    row = db.get(InterventionTable, intervention_id)
    if not row or row.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Intervention not found")
    db.delete(row)
    db.commit()
    _audit(db, current_user, "DELETE_INTERVENTION", "intervention", intervention_id, {})
    db.commit()


def _to_outcome_out(item: InterventionOutcomeTable) -> InterventionOutcomeOut:
    return InterventionOutcomeOut(
        id=item.id,
        intervention_id=item.intervention_id,
        checkpoint_day=item.checkpoint_day,
        measured_at=item.measured_at,
        status=item.status,
        risk_delta=item.risk_delta,
        retention_delta=item.retention_delta,
        notes=item.notes,
        created_at=item.created_at,
    )


@router.get(
    "/interventions/{intervention_id}/outcomes",
    response_model=list[InterventionOutcomeOut],
)
async def list_intervention_outcomes(
    intervention_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    intervention = db.get(InterventionTable, intervention_id)
    if not intervention or intervention.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Intervention not found")
    rows = db.exec(
        select(InterventionOutcomeTable)
        .where(InterventionOutcomeTable.tenant_id == tenant_id)
        .where(InterventionOutcomeTable.intervention_id == intervention_id)
        .order_by(InterventionOutcomeTable.checkpoint_day.asc())
    ).all()
    return [_to_outcome_out(r) for r in rows]


@router.post(
    "/interventions/{intervention_id}/outcomes",
    response_model=InterventionOutcomeOut,
    status_code=status.HTTP_201_CREATED,
)
async def upsert_intervention_outcome(
    intervention_id: UUID,
    payload: InterventionOutcomeCreate,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    if payload.checkpoint_day not in {30, 60, 90}:
        raise HTTPException(
            status_code=422, detail="checkpoint_day must be one of 30, 60, 90"
        )
    intervention = db.get(InterventionTable, intervention_id)
    if not intervention or intervention.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Intervention not found")
    if intervention.status in {"planned", "cancelled"}:
        raise HTTPException(
            status_code=409,
            detail="Start the intervention before recording a checkpoint; cancelled interventions cannot receive checkpoints",
        )
    if payload.checkpoint_day in {60, 90}:
        required_previous_day = 30 if payload.checkpoint_day == 60 else 60
        previous = db.exec(
            select(InterventionOutcomeTable)
            .where(InterventionOutcomeTable.intervention_id == intervention_id)
            .where(InterventionOutcomeTable.checkpoint_day == required_previous_day)
        ).first()
        if not previous:
            raise HTTPException(
                status_code=409,
                detail=f"Record the {required_previous_day}-day checkpoint before the {payload.checkpoint_day}-day checkpoint",
            )
    existing = db.exec(
        select(InterventionOutcomeTable)
        .where(InterventionOutcomeTable.intervention_id == intervention_id)
        .where(InterventionOutcomeTable.tenant_id == tenant_id)
        .where(InterventionOutcomeTable.checkpoint_day == payload.checkpoint_day)
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"The {payload.checkpoint_day}-day checkpoint is already recorded and cannot be overwritten",
        )

    row = InterventionOutcomeTable(
        tenant_id=tenant_id,
        intervention_id=intervention_id,
        checkpoint_day=payload.checkpoint_day,
        measured_at=datetime.utcnow(),
        status=payload.status,
        risk_delta=payload.risk_delta,
        retention_delta=payload.retention_delta,
        notes=payload.notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    outcomes = db.exec(
        select(InterventionOutcomeTable).where(
            InterventionOutcomeTable.intervention_id == intervention_id
        )
    ).all()
    mapping = {"worsened": 0.0, "neutral": 0.5, "improved": 1.0}
    scored = [o for o in outcomes if o.status in mapping]
    if scored:
        intervention.outcome_score = round(
            sum(mapping[o.status] for o in scored) / len(scored), 3
        )
        intervention.updated_at = datetime.utcnow()
        db.add(intervention)
        db.commit()
    _audit(
        db,
        current_user,
        "UPSERT_INTERVENTION_OUTCOME",
        "intervention_outcome",
        row.id,
        {"checkpoint_day": payload.checkpoint_day, "status": payload.status},
    )
    db.commit()
    return _to_outcome_out(row)


def _to_connection_out(item: IntegrationConnectionTable) -> IntegrationConnectionOut:
    return IntegrationConnectionOut(
        id=item.id,
        tenant_id=item.tenant_id,
        name=item.name,
        source_type=item.source_type,
        provider=item.provider,
        status=item.status,
        base_url=item.base_url,
        auth_type=item.auth_type,
        encrypted_secret_ref=("configured" if item.encrypted_secret_ref else None),
        sync_interval_minutes=item.sync_interval_minutes,
        next_sync_at=item.next_sync_at,
        sync_retry_count=item.sync_retry_count,
        last_sync_at=item.last_sync_at,
        last_sync_status=item.last_sync_status,
        last_sync_summary=item.last_sync_summary,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("/connections", response_model=list[IntegrationConnectionOut])
async def list_connections(
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    rows = db.exec(
        select(IntegrationConnectionTable)
        .where(IntegrationConnectionTable.tenant_id == tenant_id)
        .order_by(IntegrationConnectionTable.created_at.desc())
    ).all()
    return [_to_connection_out(r) for r in rows]


@router.post(
    "/connections",
    response_model=IntegrationConnectionOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_connection(
    payload: IntegrationConnectionCreate,
    current_user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    preset = get_provider_preset(payload.provider)
    if not preset:
        raise HTTPException(status_code=422, detail="Unsupported provider")
    if preset.get("requires_tenant_url") and not payload.base_url:
        raise HTTPException(
            status_code=422,
            detail="This provider requires its tenant-specific base URL",
        )
    credentials = payload.credentials or {}
    if payload.options:
        credentials = {**credentials, "__options": payload.options}
    row = IntegrationConnectionTable(
        tenant_id=tenant_id,
        name=payload.name,
        source_type=payload.source_type or preset.get("source_type"),
        provider=payload.provider.lower(),
        status=payload.status,
        base_url=payload.base_url or preset.get("base_url"),
        auth_type=payload.auth_type or preset.get("auth_type", "api_key"),
        encrypted_secret_ref=(
            seal_credentials(credentials)
            if credentials
            else payload.encrypted_secret_ref
        ),
        sync_interval_minutes=payload.sync_interval_minutes or 60,
        next_sync_at=datetime.utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(
        db,
        current_user,
        "CREATE_CONNECTION",
        "integration_connection",
        row.id,
        {"provider": payload.provider, "source_type": payload.source_type},
    )
    db.commit()
    return _to_connection_out(row)


@router.patch("/connections/{connection_id}", response_model=IntegrationConnectionOut)
async def update_connection(
    connection_id: UUID,
    payload: IntegrationConnectionUpdate,
    current_user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    row = db.get(IntegrationConnectionTable, connection_id)
    if not row or row.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Connection not found")
    updates = payload.model_dump(exclude_unset=True)
    credentials = updates.pop("credentials", None)
    options = updates.pop("options", None)
    updates.pop("encrypted_secret_ref", None)
    if credentials is not None:
        if options:
            credentials = {**credentials, "__options": options}
        row.encrypted_secret_ref = seal_credentials(credentials)
    for field, value in updates.items():
        setattr(row, field, value)
    row.updated_at = datetime.utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(
        db,
        current_user,
        "UPDATE_CONNECTION",
        "integration_connection",
        row.id,
        {"status": row.status, "provider": row.provider},
    )
    db.commit()
    return _to_connection_out(row)


def _connector_request_config(row: IntegrationConnectionTable) -> dict:
    credentials = open_credentials(row.encrypted_secret_ref)
    options = credentials.pop("__options", {}) if credentials else {}
    return {"base_url": row.base_url, "credentials": credentials, "options": options}


@router.post("/connections/{connection_id}/verify")
async def verify_connection(
    connection_id: UUID,
    current_user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    row = db.get(IntegrationConnectionTable, connection_id)
    if not row or row.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Connection not found")
    connector = get_connector(row.provider)
    if connector is None:
        raise HTTPException(
            status_code=422,
            detail=f"No connector adapter configured for provider {row.provider}",
        )
    try:
        result = connector.verify(_connector_request_config(row))
        row.status = "active"
        row.last_sync_status = "verified"
        row.last_sync_summary = "Connection verified"
        db.add(row)
        _audit(
            db,
            current_user,
            "VERIFY_CONNECTION",
            "integration_connection",
            row.id,
            {"provider": row.provider},
        )
        db.commit()
        return result
    except Exception as exc:
        row.status = "error"
        row.last_sync_status = "failed"
        row.last_sync_summary = str(exc)[:240]
        db.add(row)
        db.commit()
        raise HTTPException(
            status_code=502, detail=f"Provider verification failed: {str(exc)[:240]}"
        ) from exc


@router.get("/connections/{connection_id}/discover")
async def discover_connection(
    connection_id: UUID,
    current_user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    row = db.get(IntegrationConnectionTable, connection_id)
    if not row or row.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Connection not found")
    connector = get_connector(row.provider)
    if connector is None:
        raise HTTPException(
            status_code=422,
            detail=f"No connector adapter configured for provider {row.provider}",
        )
    try:
        result = connector.discover(_connector_request_config(row))
        _audit(
            db,
            current_user,
            "DISCOVER_CONNECTION_METADATA",
            "integration_connection",
            row.id,
            {"provider": row.provider, "keys": list(result.keys())},
        )
        db.commit()
        return result
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"Provider discovery failed: {str(exc)[:240]}"
        ) from exc


@router.post(
    "/connections/{connection_id}/sync", response_model=ConnectionSyncStatusOut
)
async def trigger_connection_sync(
    connection_id: UUID,
    current_user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    row = db.get(IntegrationConnectionTable, connection_id)
    if not row or row.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Connection not found")
    # Keep the legacy endpoint useful for existing clients, but execute the
    # same real connector pipeline as the current /lean endpoint. There is no
    # simulated progress state: the response reflects committed sync results.
    from app.api.v1.lean_enterprise import _run_connection_sync

    result = _run_connection_sync(connection_id, tenant_id, db)
    _audit(
        db,
        current_user,
        "TRIGGER_CONNECTION_SYNC",
        "integration_connection",
        row.id,
        result,
    )
    db.commit()
    return ConnectionSyncStatusOut(
        connection_id=connection_id,
        status="completed",
        phase="committed",
        progress=100,
        message=(
            f"Sync committed: bronze={result['bronze_events']}, "
            f"silver={result['silver_upserts']}, quarantined={result['quarantined']}"
        ),
        updated_at=datetime.utcnow(),
    )


@router.get(
    "/connections/{connection_id}/sync-status", response_model=ConnectionSyncStatusOut
)
async def get_sync_status(
    connection_id: UUID,
    current_user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    row = db.get(IntegrationConnectionTable, connection_id)
    if not row or row.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Connection not found")
    state = row.last_sync_status or "idle"
    status_value = "completed" if state in {"success", "verified"} else state
    return ConnectionSyncStatusOut(
        connection_id=connection_id,
        status=status_value,
        phase="committed" if status_value == "completed" else "provider",
        progress=100 if status_value == "completed" else 0,
        message=row.last_sync_summary or "No sync has completed",
        updated_at=row.updated_at,
    )


@router.get("/connections/{connection_id}/sync/stream")
async def sync_status_stream(
    connection_id: UUID,
    current_user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    row = db.get(IntegrationConnectionTable, connection_id)
    if not row or row.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Connection not found")

    async def event_generator():
        state = {
            "connection_id": str(connection_id),
            "status": (
                "completed"
                if row.last_sync_status == "success"
                else (row.last_sync_status or "idle")
            ),
            "phase": "committed" if row.last_sync_status == "success" else "provider",
            "progress": 100 if row.last_sync_status == "success" else 0,
            "message": row.last_sync_summary or "No sync has completed",
            "updated_at": row.updated_at.isoformat(),
        }
        yield f"event: sync\ndata: {_json(state)}\n\n"

    from fastapi.responses import StreamingResponse

    return StreamingResponse(event_generator(), media_type="text/event-stream")
