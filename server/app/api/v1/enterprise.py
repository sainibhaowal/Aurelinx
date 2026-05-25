"""
Enterprise HR intelligence endpoints:
- Explainable attrition risk
- Intervention workflow
- Integration connector registry
"""

from datetime import datetime
import asyncio
import json
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from app.core.data_policy import filter_real_records
from app.core.security import TokenData, get_current_user, get_tenant_id
from app.models.database import (
    AuditLogTable,
    EmployeeTable,
    IntegrationConnectionTable,
    InterventionTable,
    InterventionOutcomeTable,
    CandidateTable,
    get_session,
)
from app.schemas.schemas import (
    AttritionDriverOut,
    AttritionExplainOut,
    AttritionExplainResponse,
    IntegrationConnectionCreate,
    IntegrationConnectionOut,
    IntegrationConnectionUpdate,
    ConnectionSyncStatusOut,
    InterventionCreate,
    InterventionOut,
    InterventionUpdate,
    InterventionOutcomeCreate,
    InterventionOutcomeOut,
    RiskDriverDrilldownItem,
    RiskDriverDrilldownResponse,
)

router = APIRouter(prefix="/enterprise", tags=["enterprise"])
_SYNC_STATE: dict[str, dict] = {}


def _audit(db: Session, current_user: TokenData, action: str, resource_type: str, resource_id: UUID | None = None, details: dict | None = None):
    user_uuid = None
    if current_user.user_id:
        try:
            user_uuid = UUID(current_user.user_id)
        except ValueError:
            user_uuid = None
    db.add(
        AuditLogTable(
            user_id=user_uuid,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=json.dumps(details or {}, default=str),
            ip_address="system",
        )
    )


def _risk_components(employee: EmployeeTable) -> List[AttritionDriverOut]:
    drivers: List[AttritionDriverOut] = []
    sentiment = float(employee.sentiment_score or 0.5)
    retention = float(employee.retention_prob if employee.retention_prob is not None else 0.5)

    if sentiment < 0.45:
        drivers.append(
            AttritionDriverOut(
                factor="Low morale trend",
                contribution=round(min(1.0, (0.45 - sentiment) * 1.8), 3),
                evidence=f"sentiment_score={sentiment:.2f} below healthy threshold 0.45",
            )
        )
    if retention < 0.55:
        drivers.append(
            AttritionDriverOut(
                factor="Retention probability pressure",
                contribution=round(min(1.0, (0.55 - retention) * 1.8), 3),
                evidence=f"retention_prob={retention:.2f} indicates elevated exit likelihood",
            )
        )
    if employee.is_at_risk:
        drivers.append(
            AttritionDriverOut(
                factor="Rule-based risk flag",
                contribution=0.26,
                evidence="is_at_risk flag set by workforce policy or prior analysis",
            )
        )
    if not drivers:
        drivers.append(
            AttritionDriverOut(
                factor="No critical risk signal",
                contribution=0.08,
                evidence="current morale and retention indicators are within stable range",
            )
        )
    drivers.sort(key=lambda d: d.contribution, reverse=True)
    return drivers


def _risk_probability(employee: EmployeeTable, drivers: List[AttritionDriverOut]) -> float:
    sentiment = float(employee.sentiment_score or 0.5)
    retention = float(employee.retention_prob if employee.retention_prob is not None else 0.5)
    base = 0.12
    base += max(0.0, (0.55 - sentiment) * 0.9)
    base += max(0.0, (0.60 - retention) * 0.8)
    if employee.is_at_risk:
        base += 0.2
    base += min(0.18, sum(d.contribution for d in drivers[:2]) * 0.35)
    return round(max(0.01, min(0.99, base)), 3)


def _recommended_actions(employee: EmployeeTable, risk_probability: float) -> List[str]:
    actions = []
    if risk_probability >= 0.6:
        actions.append("Schedule manager + HRBP retention conversation within 7 days.")
        actions.append("Run compensation and role-level market parity review.")
    elif risk_probability >= 0.4:
        actions.append("Initiate growth-path check-in and mobility options review.")
    else:
        actions.append("Maintain standard engagement cadence and monitor monthly.")
    if employee.department:
        actions.append(f"Compare {employee.department} team baseline against org median sentiment.")
    return actions[:3]


def _json(payload: dict) -> str:
    return json.dumps(payload, default=str)


@router.get("/attrition/explain", response_model=AttritionExplainResponse)
async def explain_attrition(
    top_n: int = Query(25, ge=1, le=200),
    department: str | None = Query(default=None),
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    query = select(EmployeeTable)
    if department:
        query = query.where(EmployeeTable.department == department)

    employees = filter_real_records(db.exec(query).all())
    if not employees:
        return AttritionExplainResponse(
            generated_at=datetime.utcnow(),
            model_version="attrition-v1.0-ruleboost",
            items=[],
        )

    scored = []
    for e in employees:
        drivers = _risk_components(e)
        risk = _risk_probability(e, drivers)
        scored.append((risk, e, drivers))
    scored.sort(key=lambda x: x[0], reverse=True)

    items = []
    for risk, e, drivers in scored[:top_n]:
        confidence = 0.72 if e.retention_prob is None else 0.84
        items.append(
            AttritionExplainOut(
                employee_id=e.id,
                full_name=e.full_name,
                department=e.department,
                role=e.role,
                risk_probability=risk,
                confidence=confidence,
                recommended_actions=_recommended_actions(e, risk),
                drivers=drivers[:4],
            )
        )

    return AttritionExplainResponse(
        generated_at=datetime.utcnow(),
        model_version="attrition-v1.0-ruleboost",
        items=items,
    )


@router.get("/risk-drivers/drilldown", response_model=RiskDriverDrilldownResponse)
async def risk_driver_drilldown(
    factor: str = Query(...),
    top_n: int = Query(30, ge=1, le=200),
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    employees = filter_real_records(db.exec(select(EmployeeTable)).all())
    normalized = factor.strip().lower()
    selected = []
    for e in employees:
        drivers = _risk_components(e)
        risk = _risk_probability(e, drivers)
        evidence = ""
        include = False
        if "morale" in normalized:
            include = (e.sentiment_score or 0.5) < 0.45
            evidence = f"sentiment_score={e.sentiment_score:.2f}"
        elif "retention" in normalized:
            include = (e.retention_prob if e.retention_prob is not None else 0.5) < 0.55
            evidence = f"retention_prob={(e.retention_prob if e.retention_prob is not None else 0.5):.2f}"
        elif "policy" in normalized or "flag" in normalized:
            include = bool(e.is_at_risk)
            evidence = f"is_at_risk={e.is_at_risk}"
        elif "department" in normalized:
            include = True
            evidence = f"department={e.department}"
        if include:
            selected.append((risk, e, evidence))
    selected.sort(key=lambda x: x[0], reverse=True)
    items = [
        RiskDriverDrilldownItem(
            employee_id=e.id,
            full_name=e.full_name,
            department=e.department,
            role=e.role,
            sentiment_score=e.sentiment_score,
            retention_prob=e.retention_prob,
            risk_probability=risk,
            evidence=evidence,
        )
        for risk, e, evidence in selected[:top_n]
    ]
    return RiskDriverDrilldownResponse(factor=factor, generated_at=datetime.utcnow(), items=items)


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


@router.get("/interventions", response_model=List[InterventionOut])
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


@router.post("/interventions", response_model=InterventionOut, status_code=status.HTTP_201_CREATED)
async def create_intervention(
    payload: InterventionCreate,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    if payload.priority in {"high", "critical"} and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="High-impact interventions require admin approval")
    row = InterventionTable(
        tenant_id=tenant_id,
        title=payload.title,
        description=payload.description,
        target_scope=payload.target_scope,
        target_employee_id=payload.target_employee_id,
        target_department=payload.target_department,
        priority=payload.priority,
        status=payload.status,
        owner_name=payload.owner_name,
        due_date=payload.due_date,
        expected_impact=payload.expected_impact,
        estimated_cost=payload.estimated_cost,
        created_by=current_user.user_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(db, current_user, "CREATE_INTERVENTION", "intervention", row.id, {"priority": payload.priority, "target_scope": payload.target_scope})
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
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    if row.status in {"completed", "cancelled"} and row.closed_at is None:
        row.closed_at = datetime.utcnow()
    row.updated_at = datetime.utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(db, current_user, "UPDATE_INTERVENTION", "intervention", row.id, {"status": row.status, "priority": row.priority})
    db.commit()
    return _to_intervention_out(row)


@router.delete("/interventions/{intervention_id}", status_code=status.HTTP_204_NO_CONTENT)
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


@router.get("/interventions/{intervention_id}/outcomes", response_model=List[InterventionOutcomeOut])
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


@router.post("/interventions/{intervention_id}/outcomes", response_model=InterventionOutcomeOut, status_code=status.HTTP_201_CREATED)
async def upsert_intervention_outcome(
    intervention_id: UUID,
    payload: InterventionOutcomeCreate,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    if payload.checkpoint_day not in {30, 60, 90}:
        raise HTTPException(status_code=422, detail="checkpoint_day must be one of 30, 60, 90")
    intervention = db.get(InterventionTable, intervention_id)
    if not intervention or intervention.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Intervention not found")
    existing = db.exec(
        select(InterventionOutcomeTable)
        .where(InterventionOutcomeTable.intervention_id == intervention_id)
        .where(InterventionOutcomeTable.tenant_id == tenant_id)
        .where(InterventionOutcomeTable.checkpoint_day == payload.checkpoint_day)
    ).first()
    if existing:
        existing.measured_at = datetime.utcnow()
        existing.status = payload.status
        existing.risk_delta = payload.risk_delta
        existing.retention_delta = payload.retention_delta
        existing.notes = payload.notes
        db.add(existing)
        db.commit()
        db.refresh(existing)
        # lightweight aggregate score on intervention
        outcomes = db.exec(select(InterventionOutcomeTable).where(InterventionOutcomeTable.intervention_id == intervention_id)).all()
        scored = [o for o in outcomes if o.status in {"improved", "neutral", "worsened"}]
        if scored:
            mapping = {"worsened": 0.0, "neutral": 0.5, "improved": 1.0}
            intervention.outcome_score = round(sum(mapping[o.status] for o in scored) / len(scored), 3)
            intervention.updated_at = datetime.utcnow()
            db.add(intervention)
            db.commit()
        return _to_outcome_out(existing)

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
    _audit(db, current_user, "UPSERT_INTERVENTION_OUTCOME", "intervention_outcome", row.id, {"checkpoint_day": payload.checkpoint_day, "status": payload.status})
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
        encrypted_secret_ref=item.encrypted_secret_ref,
        sync_interval_minutes=item.sync_interval_minutes,
        next_sync_at=item.next_sync_at,
        sync_retry_count=item.sync_retry_count,
        last_sync_at=item.last_sync_at,
        last_sync_status=item.last_sync_status,
        last_sync_summary=item.last_sync_summary,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("/connections", response_model=List[IntegrationConnectionOut])
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


@router.post("/connections", response_model=IntegrationConnectionOut, status_code=status.HTTP_201_CREATED)
async def create_connection(
    payload: IntegrationConnectionCreate,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    row = IntegrationConnectionTable(
        tenant_id=tenant_id,
        name=payload.name,
        source_type=payload.source_type,
        provider=payload.provider,
        status=payload.status,
        base_url=payload.base_url,
        auth_type=payload.auth_type,
        encrypted_secret_ref=payload.encrypted_secret_ref,
        sync_interval_minutes=payload.sync_interval_minutes or 60,
        next_sync_at=datetime.utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(db, current_user, "CREATE_CONNECTION", "integration_connection", row.id, {"provider": payload.provider, "source_type": payload.source_type})
    db.commit()
    return _to_connection_out(row)


@router.patch("/connections/{connection_id}", response_model=IntegrationConnectionOut)
async def update_connection(
    connection_id: UUID,
    payload: IntegrationConnectionUpdate,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    row = db.get(IntegrationConnectionTable, connection_id)
    if not row or row.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Connection not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    row.updated_at = datetime.utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(db, current_user, "UPDATE_CONNECTION", "integration_connection", row.id, {"status": row.status, "provider": row.provider})
    db.commit()
    return _to_connection_out(row)


async def _run_sync_job(connection_id: UUID):
    phases = [
        ("auth", 10, "Authenticating connector"),
        ("extract", 35, "Extracting source payload"),
        ("normalize", 60, "Normalizing canonical records"),
        ("quality", 82, "Running quality checks"),
        ("upsert", 95, "Applying upserts"),
        ("complete", 100, "Sync completed"),
    ]
    key = str(connection_id)
    for phase, progress, message in phases:
        _SYNC_STATE[key] = {
            "connection_id": key,
            "status": "running" if phase != "complete" else "completed",
            "phase": phase,
            "progress": progress,
            "message": message,
            "updated_at": datetime.utcnow().isoformat(),
        }
        await asyncio.sleep(1.0)


@router.post("/connections/{connection_id}/sync", response_model=ConnectionSyncStatusOut)
async def trigger_connection_sync(
    connection_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    row = db.get(IntegrationConnectionTable, connection_id)
    if not row:
        raise HTTPException(status_code=404, detail="Connection not found")
    row.status = "active"
    row.last_sync_status = "running"
    row.last_sync_summary = "Sync started"
    row.last_sync_at = datetime.utcnow()
    row.updated_at = datetime.utcnow()
    db.add(row)
    db.commit()
    _audit(db, current_user, "TRIGGER_CONNECTION_SYNC", "integration_connection", row.id, {"connection_id": str(connection_id)})
    db.commit()
    key = str(connection_id)
    _SYNC_STATE[key] = {
        "connection_id": key,
        "status": "running",
        "phase": "queued",
        "progress": 1,
        "message": "Sync queued",
        "updated_at": datetime.utcnow().isoformat(),
    }
    asyncio.create_task(_run_sync_job(connection_id))
    return ConnectionSyncStatusOut(
        connection_id=connection_id,
        status="running",
        phase="queued",
        progress=1,
        message="Sync queued",
        updated_at=datetime.utcnow(),
    )


@router.get("/connections/{connection_id}/sync-status", response_model=ConnectionSyncStatusOut)
async def get_sync_status(
    connection_id: UUID,
    current_user: TokenData = Depends(get_current_user),
):
    key = str(connection_id)
    state = _SYNC_STATE.get(key)
    if not state:
        return ConnectionSyncStatusOut(
            connection_id=connection_id,
            status="idle",
            phase="idle",
            progress=0,
            message="No sync in progress",
            updated_at=datetime.utcnow(),
        )
    return ConnectionSyncStatusOut(
        connection_id=connection_id,
        status=state["status"],
        phase=state["phase"],
        progress=state["progress"],
        message=state["message"],
        updated_at=datetime.fromisoformat(state["updated_at"]),
    )


@router.get("/connections/{connection_id}/sync/stream")
async def sync_status_stream(
    connection_id: UUID,
    current_user: TokenData = Depends(get_current_user),
):
    key = str(connection_id)

    async def event_generator():
        while True:
            state = _SYNC_STATE.get(key, {
                "status": "idle",
                "phase": "idle",
                "progress": 0,
                "message": "No sync in progress",
                "updated_at": datetime.utcnow().isoformat(),
            })
            yield f"event: sync\ndata: {_json(state)}\n\n"
            if state.get("status") == "completed":
                break
            await asyncio.sleep(1.0)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
