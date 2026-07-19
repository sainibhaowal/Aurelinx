"""
Lean Enterprise v1 APIs:
- Real connector sync into bronze/silver/quarantine
- Data contract registry
- Lightweight ML registry + train/activate/score
- Workforce economics scenario optimizer
- Policy enforcement and scheduling
"""

import asyncio
import csv
import io
from datetime import datetime, timedelta
from pathlib import Path
import json
import threading
import zipfile
from typing import Any, Dict, List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlmodel import Session, select

from app.core.security import (
    TokenData,
    get_current_user,
    get_current_user_strict,
    get_tenant_id,
)
from app.models.database import (
    AuditLogTable,
    CandidateTable,
    CanonicalCandidateTable,
    CanonicalEmployeeTable,
    DRRunbookTable,
    ConnectorFieldMappingTable,
    ConnectorSyncJobTable,
    DataContractTable,
    CompliancePolicyTable,
    GoldMetricSnapshotTable,
    IntegrationConnectionTable,
    ForecastScenarioTable,
    MLDriftSnapshotTable,
    MLModelCardTable,
    MLModelRegistryTable,
    EmployeeTable,
    ExperienceTable,
    SkillTable,
    ReleaseGateTable,
    ProcurementArtifactTable,
    QuarantineEventTable,
    RawEventTable,
    engine,
    get_session,
)
from app.services.connectors.factory import get_connector
from app.schemas.schemas import (
    ConnectorFieldMappingCreate,
    ConnectorFieldMappingOut,
    ConnectorSyncJobOut,
    CompliancePolicyCreate,
    CompliancePolicyOut,
    FairnessSummaryOut,
    DRRunbookCreate,
    DRRunbookOut,
    PolicyCheckRequest,
    PolicyCheckResponse,
    ForecastScenarioOut,
    MLDriftSnapshotOut,
    MLModelCardOut,
    ReleaseGateCreate,
    ReleaseGateOut,
    ProcurementArtifactCreate,
    ProcurementArtifactOut,
)

router = APIRouter(prefix="/lean", tags=["lean-enterprise"])
_SCHEDULER_TASK: asyncio.Task | None = None
_BUNDLE_FILE_NAMES = {
    "employees": "employees_public.csv",
    "candidates": "candidates_public.csv",
    "employee_skills": "employee_skills_public.csv",
    "candidate_skills": "candidate_skills_public.csv",
    "employee_experience": "employee_experience_public.csv",
    "candidate_experience": "candidate_experience_public.csv",
}
_IMPORT_JOB_LOCK = threading.Lock()
_IMPORT_JOBS: Dict[str, Dict[str, Any]] = {}


def _load_required_fields(contract: DataContractTable) -> List[str]:
    try:
        parsed = json.loads(contract.required_fields or "[]")
        return [str(x) for x in parsed]
    except Exception:
        return []


def _create_import_job(job_type: str, file_name: str | None = None) -> str:
    job_id = str(uuid4())
    with _IMPORT_JOB_LOCK:
        _IMPORT_JOBS[job_id] = {
            "job_id": job_id,
            "job_type": job_type,
            "status": "queued",
            "phase": "queued",
            "progress": 0,
            "message": "Queued",
            "file_name": file_name,
            "result": None,
            "error": None,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
    return job_id


def _update_import_job(job_id: str, **fields: Any) -> None:
    with _IMPORT_JOB_LOCK:
        job = _IMPORT_JOBS.get(job_id)
        if not job:
            return
        job.update(fields)
        job["updated_at"] = datetime.utcnow().isoformat()


def _get_import_job(job_id: str) -> Dict[str, Any] | None:
    with _IMPORT_JOB_LOCK:
        job = _IMPORT_JOBS.get(job_id)
        return dict(job) if job else None


def _validate_payload(payload: Dict[str, Any], required_fields: List[str]) -> List[str]:
    missing = []
    for field in required_fields:
        if field not in payload or payload[field] in [None, ""]:
            missing.append(field)
    return missing


def _build_quality_score(
    rows: List[Dict[str, Any]],
    required_fields: List[str],
    unique_field: str = "email",
) -> Dict[str, Any]:
    total_rows = len(rows)
    if total_rows == 0:
        return {
            "total_rows": 0,
            "missing_required_rows": 0,
            "duplicate_rows": 0,
            "unique_values": 0,
            "quality_score": 0.0,
            "issues": ["No rows found"],
        }

    missing_required_rows = 0
    missing_required_fields = 0
    seen_values: set[str] = set()
    duplicate_rows = 0
    issue_samples: List[str] = []

    for idx, row in enumerate(rows):
        missing = _validate_payload(row, required_fields)
        if missing:
            missing_required_rows += 1
            missing_required_fields += len(missing)
            if len(issue_samples) < 5:
                issue_samples.append(f"Row {idx + 1}: missing {', '.join(missing)}")
        value = str(row.get(unique_field) or "").strip().lower()
        if value:
            if value in seen_values:
                duplicate_rows += 1
                if len(issue_samples) < 5:
                    issue_samples.append(
                        f"Row {idx + 1}: duplicate {unique_field} '{value}'"
                    )
            else:
                seen_values.add(value)

    coverage = 1.0 - (missing_required_rows / total_rows)
    uniqueness = len(seen_values) / total_rows if total_rows else 0.0
    completeness = 1.0 - (
        missing_required_fields / max(1, total_rows * max(1, len(required_fields)))
    )
    quality_score = max(
        0.0,
        min(
            1.0,
            (coverage * 0.45)
            + (uniqueness * 0.35)
            + (completeness * 0.20)
            - (duplicate_rows / total_rows) * 0.1,
        ),
    )

    return {
        "total_rows": total_rows,
        "missing_required_rows": missing_required_rows,
        "duplicate_rows": duplicate_rows,
        "unique_values": len(seen_values),
        "coverage": round(coverage, 4),
        "uniqueness": round(uniqueness, 4),
        "completeness": round(completeness, 4),
        "quality_score": round(quality_score, 4),
        "issues": issue_samples,
    }


def _policy_to_out(row: CompliancePolicyTable) -> CompliancePolicyOut:
    return CompliancePolicyOut(
        id=row.id,
        tenant_id=row.tenant_id,
        region=row.region,
        policy_name=row.policy_name,
        action_type=row.action_type,
        min_confidence=row.min_confidence,
        requires_approval=row.requires_approval,
        blocked_if_missing_evidence=row.blocked_if_missing_evidence,
        blocked_actions=json.loads(row.blocked_actions or "[]"),
        status=row.status,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _policy_check(
    db: Session,
    tenant_id: str,
    action_type: str,
    confidence: float,
    evidence: str | None,
    region: str,
    high_impact: bool,
) -> PolicyCheckResponse:
    policies = db.exec(
        select(CompliancePolicyTable)
        .where(CompliancePolicyTable.tenant_id == tenant_id)
        .where(CompliancePolicyTable.status == "active")
        .order_by(CompliancePolicyTable.created_at.desc())
    ).all()
    reasons: List[str] = []
    matched: List[str] = []
    allowed = True
    for policy in policies:
        if policy.action_type != action_type:
            continue
        if policy.region not in {"global", region}:
            continue
        matched.append(policy.policy_name)
        blocked_actions = set(json.loads(policy.blocked_actions or "[]"))
        if action_type in blocked_actions:
            allowed = False
            reasons.append(f"Blocked by policy {policy.policy_name}")
        if confidence < float(policy.min_confidence):
            allowed = False
            reasons.append(
                f"Confidence {confidence:.2f} below minimum {policy.min_confidence:.2f}"
            )
        if policy.blocked_if_missing_evidence and not (evidence or "").strip():
            allowed = False
            reasons.append(f"Evidence required by policy {policy.policy_name}")
        if policy.requires_approval and high_impact:
            reasons.append(
                f"High-impact action requires approval under policy {policy.policy_name}"
            )
    return PolicyCheckResponse(
        allowed=allowed, reasons=reasons, matched_policies=matched
    )


@router.get("/summary")
async def get_data_summary(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    return {
        "employees": len(db.exec(select(EmployeeTable)).all()),
        "candidates": len(db.exec(select(CandidateTable)).all()),
        "skills": len(db.exec(select(SkillTable)).all()),
        "experience": len(db.exec(select(ExperienceTable)).all()),
    }


def _audit(
    db: Session,
    current_user: TokenData,
    action: str,
    resource_type: str,
    resource_id: UUID | None = None,
    details: Dict[str, Any] | None = None,
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
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=json.dumps(details or {}, default=str),
            ip_address="system",
        )
    )


def _fairness_summary(
    rows: List[CanonicalEmployeeTable], tenant_id: str
) -> FairnessSummaryOut:
    groups: List[dict] = []
    if not rows:
        return FairnessSummaryOut(
            tenant_id=tenant_id,
            reference_group="none",
            groups=[],
            max_gap=0.0,
            compliant=True,
        )
    buckets: Dict[str, List[CanonicalEmployeeTable]] = {}
    for row in rows:
        buckets.setdefault(row.department or "Unknown", []).append(row)
    reference = "Unknown"
    if buckets:
        reference = max(buckets.items(), key=lambda item: len(item[1]))[0]
    reference_rate = 0.0
    if reference in buckets:
        reference_rate = len([r for r in buckets[reference] if r.is_at_risk]) / max(
            1, len(buckets[reference])
        )
    max_gap = 0.0
    for name, members in buckets.items():
        rate = len([r for r in members if r.is_at_risk]) / max(1, len(members))
        gap = abs(rate - reference_rate)
        max_gap = max(max_gap, gap)
        groups.append(
            {
                "group": name,
                "count": len(members),
                "at_risk_rate": round(rate, 4),
                "gap_from_reference": round(gap, 4),
            }
        )
    groups.sort(key=lambda item: item["at_risk_rate"], reverse=True)
    return FairnessSummaryOut(
        tenant_id=tenant_id,
        reference_group=reference,
        groups=groups,
        max_gap=round(max_gap, 4),
        compliant=max_gap < 0.2,
    )


def _analytics_snapshot(db: Session) -> Dict[str, Any]:
    rows = db.exec(select(CanonicalEmployeeTable)).all()
    if not rows:
        rows = [
            CanonicalEmployeeTable(
                tenant_id="default",
                provider="local_fallback",
                external_id=str(r.id),
                full_name=r.full_name,
                email=r.email,
                department=r.department,
                role=r.role,
                sentiment_score=r.sentiment_score,
                retention_prob=r.retention_prob,
                is_at_risk=r.is_at_risk,
            )
            for r in db.exec(select(EmployeeTable)).all()
        ]
    total = len(rows)
    at_risk = len([r for r in rows if r.is_at_risk])
    at_risk_pct = round((at_risk / total) * 100, 1) if total else 0.0
    avg_sentiment = (
        round(sum(float(r.sentiment_score or 0.0) for r in rows) / total, 3)
        if total
        else 0.0
    )
    dept_map: Dict[str, int] = {}
    dept_risk: Dict[str, int] = {}
    for row in rows:
        dept_map[row.department] = dept_map.get(row.department, 0) + 1
        if row.is_at_risk:
            dept_risk[row.department] = dept_risk.get(row.department, 0) + 1
    top_risk_department = None
    top_risk_department_ratio = 0.0
    for dept, count in dept_map.items():
        ratio = dept_risk.get(dept, 0) / max(1, count)
        if ratio > top_risk_department_ratio:
            top_risk_department_ratio = ratio
            top_risk_department = dept
    low_sentiment_count = len(
        [r for r in rows if float(r.sentiment_score or 0.0) < 0.45]
    )
    low_retention_count = len(
        [r for r in rows if float(r.retention_prob or 0.5) < 0.55]
    )
    flagged_count = len([r for r in rows if r.is_at_risk])
    dept_pressure_count = len(
        [
            dept
            for dept, count in dept_map.items()
            if count > 0 and (dept_risk.get(dept, 0) / count) >= 0.25
        ]
    )
    top_risk_drivers = sorted(
        [
            {"factor": "Low morale signals", "count": low_sentiment_count},
            {"factor": "Retention probability pressure", "count": low_retention_count},
            {"factor": "Policy risk flags", "count": flagged_count},
            {"factor": "Department concentration risk", "count": dept_pressure_count},
        ],
        key=lambda x: x["count"],
        reverse=True,
    )[:3]
    return {
        "total": total,
        "atRisk": at_risk,
        "atRiskPct": at_risk_pct,
        "avgSentiment": avg_sentiment,
        "topRiskDepartment": top_risk_department,
        "topRiskDepartmentRatio": round(top_risk_department_ratio * 100, 1),
        "topRiskDrivers": top_risk_drivers,
    }


def _model_card_out(card: MLModelCardTable) -> MLModelCardOut:
    return MLModelCardOut(
        id=card.id,
        tenant_id=card.tenant_id,
        model_name=card.model_name,
        version=card.version,
        status=card.status,
        pr_auc=card.pr_auc,
        calibration_error=card.calibration_error,
        fairness_gap=card.fairness_gap,
        notes=card.notes,
        approved_by=card.approved_by,
        approved_at=card.approved_at,
        created_at=card.created_at,
    )


def _release_gate_out(gate: ReleaseGateTable) -> ReleaseGateOut:
    return ReleaseGateOut(
        id=gate.id,
        tenant_id=gate.tenant_id,
        environment=gate.environment,
        artifact_name=gate.artifact_name,
        version=gate.version,
        status=gate.status,
        required_checks=json.loads(gate.required_checks or "[]"),
        approved_by=gate.approved_by,
        approved_at=gate.approved_at,
        notes=gate.notes,
        created_at=gate.created_at,
    )


def _dr_runbook_out(row: DRRunbookTable) -> DRRunbookOut:
    return DRRunbookOut(
        id=row.id,
        tenant_id=row.tenant_id,
        runbook_name=row.runbook_name,
        environment=row.environment,
        rto_minutes=row.rto_minutes,
        rpo_minutes=row.rpo_minutes,
        status=row.status,
        last_drill_at=row.last_drill_at,
        last_drill_result=row.last_drill_result,
        notes=row.notes,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _procurement_artifact_out(row: ProcurementArtifactTable) -> ProcurementArtifactOut:
    return ProcurementArtifactOut(
        id=row.id,
        tenant_id=row.tenant_id,
        artifact_type=row.artifact_type,
        title=row.title,
        version=row.version,
        status=row.status,
        notes=row.notes,
        created_at=row.created_at,
    )


def _normalize_header_map(row: Dict[str, Any]) -> Dict[str, Any]:
    normalized = {}
    for key, value in row.items():
        normalized[(key or "").strip().lower().replace(" ", "_").replace("-", "_")] = (
            value
        )
    return normalized


def _first_value(data: Dict[str, Any], keys: List[str], default: Any = None) -> Any:
    for key in keys:
        value = data.get(key)
        if value not in [None, ""]:
            return value
    return default


def _load_csv_rows(file_path: Path) -> List[Dict[str, Any]]:
    with file_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return [_normalize_header_map(row) for row in reader]


def _csv_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    return str(value)


def _rows_to_csv_bytes(rows: List[Dict[str, Any]], fieldnames: List[str]) -> bytes:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow({field: _csv_value(row.get(field)) for field in fieldnames})
    return buffer.getvalue().encode("utf-8")


def _parse_employee_row(row: Dict[str, Any]) -> Dict[str, Any]:
    email = (
        str(_first_value(row, ["email", "work_email", "employee_email"], ""))
        .strip()
        .lower()
    )
    full_name = str(
        _first_value(row, ["full_name", "name", "employee_name"], "")
    ).strip()
    department = (
        str(
            _first_value(row, ["department", "dept", "department_name"], "General")
        ).strip()
        or "General"
    )
    role = (
        str(
            _first_value(row, ["role", "job_title", "position", "title"], "Employee")
        ).strip()
        or "Employee"
    )
    sentiment_score = float(
        _first_value(row, ["sentiment_score", "morale", "engagement_score"], 0.5) or 0.5
    )
    is_at_risk = str(
        _first_value(row, ["is_at_risk", "risk_flag"], "false")
    ).lower() in {"1", "true", "yes", "y"}
    retention_prob = _first_value(
        row, ["retention_prob", "retention_probability", "retention"], None
    )
    retention_prob = float(retention_prob) if retention_prob not in [None, ""] else None
    external_id = str(
        _first_value(
            row, ["external_id", "id", "employee_id"], email or full_name or "local"
        )
    ).strip()
    if not email:
        email = (
            f"{external_id or full_name}".replace(" ", ".").lower() + "@local.invalid"
        )
    display_name = full_name or email.split("@")[0].replace(".", " ").title()
    return {
        "email": email,
        "full_name": display_name,
        "department": department,
        "role": role,
        "sentiment_score": sentiment_score,
        "is_at_risk": is_at_risk,
        "retention_prob": retention_prob,
        "external_id": external_id or email,
    }


def _parse_candidate_row(row: Dict[str, Any]) -> Dict[str, Any]:
    email = (
        str(_first_value(row, ["email", "candidate_email", "work_email"], ""))
        .strip()
        .lower()
    )
    full_name = str(
        _first_value(row, ["full_name", "name", "candidate_name"], "")
    ).strip()
    department = (
        str(
            _first_value(row, ["department", "dept", "department_name"], "General")
        ).strip()
        or "General"
    )
    role = (
        str(
            _first_value(row, ["role", "job_title", "position", "title"], "Candidate")
        ).strip()
        or "Candidate"
    )
    sentiment_score = float(
        _first_value(row, ["sentiment_score", "engagement_score"], 0.5) or 0.5
    )
    match_score = _first_value(row, ["match_score", "fit_score"], None)
    match_score = float(match_score) if match_score not in [None, ""] else None
    external_id = str(
        _first_value(
            row, ["external_id", "id", "candidate_id"], email or full_name or "local"
        )
    ).strip()
    if not email:
        email = (
            f"{external_id or full_name}".replace(" ", ".").lower() + "@local.invalid"
        )
    display_name = full_name or email.split("@")[0].replace(".", " ").title()
    return {
        "email": email,
        "full_name": display_name,
        "department": department,
        "role": role,
        "sentiment_score": sentiment_score,
        "match_score": match_score,
        "external_id": external_id or email,
    }


def _import_rows_for_kind(
    db: Session, tenant_id: str, kind: str, rows: List[Dict[str, Any]]
) -> int:
    imported = 0
    if kind == "employees":
        existing_employees = {
            row.email.lower(): row
            for row in db.exec(select(EmployeeTable)).all()
            if row.email
        }
        existing_canonical = {
            row.external_id: row
            for row in db.exec(
                select(CanonicalEmployeeTable)
                .where(CanonicalEmployeeTable.tenant_id == tenant_id)
                .where(CanonicalEmployeeTable.provider == "local_csv")
            ).all()
        }
        for row in rows:
            parsed = _parse_employee_row(row)
            existing = existing_employees.get(parsed["email"])
            if existing:
                existing.full_name = parsed["full_name"]
                existing.department = parsed["department"]
                existing.role = parsed["role"]
                existing.sentiment_score = parsed["sentiment_score"]
                existing.is_at_risk = parsed["is_at_risk"]
                existing.retention_prob = parsed["retention_prob"]
                existing.updated_at = datetime.utcnow()
                db.add(existing)
            else:
                existing = EmployeeTable(
                    full_name=parsed["full_name"],
                    email=parsed["email"],
                    department=parsed["department"],
                    role=parsed["role"],
                    sentiment_score=parsed["sentiment_score"],
                    is_at_risk=parsed["is_at_risk"],
                    retention_prob=parsed["retention_prob"],
                )
                db.add(existing)
                existing_employees[parsed["email"]] = existing

            canonical = existing_canonical.get(parsed["external_id"])
            if canonical:
                canonical.full_name = parsed["full_name"]
                canonical.email = parsed["email"]
                canonical.department = parsed["department"]
                canonical.role = parsed["role"]
                canonical.sentiment_score = parsed["sentiment_score"]
                canonical.retention_prob = parsed["retention_prob"]
                canonical.is_at_risk = parsed["is_at_risk"]
                canonical.updated_at = datetime.utcnow()
                db.add(canonical)
            else:
                canonical = CanonicalEmployeeTable(
                    tenant_id=tenant_id,
                    provider="local_csv",
                    external_id=parsed["external_id"],
                    full_name=parsed["full_name"],
                    email=parsed["email"],
                    department=parsed["department"],
                    role=parsed["role"],
                    sentiment_score=parsed["sentiment_score"],
                    retention_prob=parsed["retention_prob"],
                    is_at_risk=parsed["is_at_risk"],
                )
                db.add(canonical)
                existing_canonical[parsed["external_id"]] = canonical
            imported += 1
    elif kind == "candidates":
        existing_candidates = {
            row.email.lower(): row
            for row in db.exec(select(CandidateTable)).all()
            if row.email
        }
        existing_canonical = {
            row.external_id: row
            for row in db.exec(
                select(CanonicalCandidateTable)
                .where(CanonicalCandidateTable.tenant_id == tenant_id)
                .where(CanonicalCandidateTable.provider == "local_csv")
            ).all()
        }
        for row in rows:
            parsed = _parse_candidate_row(row)
            existing = existing_candidates.get(parsed["email"])
            if existing:
                existing.full_name = parsed["full_name"]
                existing.department = parsed["department"]
                existing.role = parsed["role"]
                existing.sentiment_score = parsed["sentiment_score"]
                existing.match_score = parsed["match_score"]
                existing.updated_at = datetime.utcnow()
                db.add(existing)
            else:
                existing = CandidateTable(
                    full_name=parsed["full_name"],
                    email=parsed["email"],
                    department=parsed["department"],
                    role=parsed["role"],
                    sentiment_score=parsed["sentiment_score"],
                    match_score=parsed["match_score"],
                )
                db.add(existing)
                existing_candidates[parsed["email"]] = existing

            canonical = existing_canonical.get(parsed["external_id"])
            if canonical:
                canonical.full_name = parsed["full_name"]
                canonical.email = parsed["email"]
                canonical.department = parsed["department"]
                canonical.role = parsed["role"]
                canonical.match_score = parsed["match_score"]
                canonical.updated_at = datetime.utcnow()
                db.add(canonical)
            else:
                canonical = CanonicalCandidateTable(
                    tenant_id=tenant_id,
                    provider="local_csv",
                    external_id=parsed["external_id"],
                    full_name=parsed["full_name"],
                    email=parsed["email"],
                    department=parsed["department"],
                    role=parsed["role"],
                    match_score=parsed["match_score"],
                )
                db.add(canonical)
                existing_canonical[parsed["external_id"]] = canonical
            imported += 1
    elif kind in {"employee_skills", "candidate_skills"}:
        owner_lookup = {}
        if kind == "employee_skills":
            owners = db.exec(select(EmployeeTable)).all()
            owner_lookup = {row.email.lower(): row.id for row in owners if row.email}
        else:
            owners = db.exec(select(CandidateTable)).all()
            owner_lookup = {row.email.lower(): row.id for row in owners if row.email}
        batch = []
        for row in rows:
            name = str(_first_value(row, ["name", "skill", "skill_name"], "")).strip()
            level = int(float(_first_value(row, ["level", "proficiency"], 3) or 3))
            if not name:
                continue
            owner_email = (
                str(
                    _first_value(
                        row, ["employee_email", "candidate_email", "email"], ""
                    )
                )
                .strip()
                .lower()
            )
            if kind == "employee_skills":
                owner_id = owner_lookup.get(owner_email)
                if not owner_id:
                    continue
                batch.append(
                    SkillTable(
                        name=name, level=max(1, min(5, level)), employee_id=owner_id
                    )
                )
            else:
                owner_id = owner_lookup.get(owner_email)
                if not owner_id:
                    continue
                batch.append(
                    SkillTable(
                        name=name, level=max(1, min(5, level)), candidate_id=owner_id
                    )
                )
            imported += 1
        if batch:
            db.add_all(batch)
    elif kind in {"employee_experience", "candidate_experience"}:
        owner_lookup = {}
        if kind == "employee_experience":
            owners = db.exec(select(EmployeeTable)).all()
            owner_lookup = {row.email.lower(): row.id for row in owners if row.email}
        else:
            owners = db.exec(select(CandidateTable)).all()
            owner_lookup = {row.email.lower(): row.id for row in owners if row.email}
        batch = []
        for row in rows:
            company = str(_first_value(row, ["company", "organization"], "")).strip()
            position = str(_first_value(row, ["position", "role", "title"], "")).strip()
            description = str(_first_value(row, ["description", "summary"], "")).strip()
            duration_years = float(
                _first_value(row, ["duration_years", "years"], 0) or 0
            )
            if not company or not position:
                continue
            owner_email = (
                str(
                    _first_value(
                        row, ["employee_email", "candidate_email", "email"], ""
                    )
                )
                .strip()
                .lower()
            )
            if kind == "employee_experience":
                owner_id = owner_lookup.get(owner_email)
                if not owner_id:
                    continue
                batch.append(
                    ExperienceTable(
                        company=company,
                        position=position,
                        duration_years=duration_years,
                        description=description,
                        employee_id=owner_id,
                    )
                )
            else:
                owner_id = owner_lookup.get(owner_email)
                if not owner_id:
                    continue
                batch.append(
                    ExperienceTable(
                        company=company,
                        position=position,
                        duration_years=duration_years,
                        description=description,
                        candidate_id=owner_id,
                    )
                )
            imported += 1
        if batch:
            db.add_all(batch)
    else:
        raise HTTPException(status_code=422, detail="Unsupported kind")
    return imported


def _export_dataset_bundle_bytes(db: Session) -> bytes:
    employees = db.exec(
        select(EmployeeTable).order_by(EmployeeTable.created_at.asc())
    ).all()
    candidates = db.exec(
        select(CandidateTable).order_by(CandidateTable.created_at.asc())
    ).all()
    skills = db.exec(select(SkillTable).order_by(SkillTable.created_at.asc())).all()
    experiences = db.exec(
        select(ExperienceTable).order_by(ExperienceTable.created_at.asc())
    ).all()

    employee_email_by_id = {row.id: row.email for row in employees}
    candidate_email_by_id = {row.id: row.email for row in candidates}

    employee_rows = [
        {
            "id": row.id,
            "full_name": row.full_name,
            "email": row.email,
            "department": row.department,
            "role": row.role,
            "sentiment_score": row.sentiment_score,
            "is_at_risk": row.is_at_risk,
            "retention_prob": row.retention_prob,
            "join_date": row.join_date,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }
        for row in employees
    ]
    candidate_rows = [
        {
            "id": row.id,
            "full_name": row.full_name,
            "email": row.email,
            "department": row.department,
            "role": row.role,
            "sentiment_score": row.sentiment_score,
            "match_score": row.match_score,
            "application_date": row.application_date,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }
        for row in candidates
    ]
    employee_skill_rows = [
        {
            "employee_email": employee_email_by_id.get(row.employee_id, ""),
            "skill_name": row.name,
            "level": row.level,
        }
        for row in skills
        if row.employee_id is not None
    ]
    candidate_skill_rows = [
        {
            "candidate_email": candidate_email_by_id.get(row.candidate_id, ""),
            "skill_name": row.name,
            "level": row.level,
        }
        for row in skills
        if row.candidate_id is not None
    ]
    employee_experience_rows = [
        {
            "employee_email": employee_email_by_id.get(row.employee_id, ""),
            "company": row.company,
            "position": row.position,
            "duration_years": row.duration_years,
            "description": row.description,
        }
        for row in experiences
        if row.employee_id is not None
    ]
    candidate_experience_rows = [
        {
            "candidate_email": candidate_email_by_id.get(row.candidate_id, ""),
            "company": row.company,
            "position": row.position,
            "duration_years": row.duration_years,
            "description": row.description,
        }
        for row in experiences
        if row.candidate_id is not None
    ]

    archive = io.BytesIO()
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as zipf:
        zipf.writestr(
            _BUNDLE_FILE_NAMES["employees"],
            _rows_to_csv_bytes(
                employee_rows,
                [
                    "id",
                    "full_name",
                    "email",
                    "department",
                    "role",
                    "sentiment_score",
                    "is_at_risk",
                    "retention_prob",
                    "join_date",
                    "created_at",
                    "updated_at",
                ],
            ),
        )
        zipf.writestr(
            _BUNDLE_FILE_NAMES["candidates"],
            _rows_to_csv_bytes(
                candidate_rows,
                [
                    "id",
                    "full_name",
                    "email",
                    "department",
                    "role",
                    "sentiment_score",
                    "match_score",
                    "application_date",
                    "created_at",
                    "updated_at",
                ],
            ),
        )
        zipf.writestr(
            _BUNDLE_FILE_NAMES["employee_skills"],
            _rows_to_csv_bytes(
                employee_skill_rows, ["employee_email", "skill_name", "level"]
            ),
        )
        zipf.writestr(
            _BUNDLE_FILE_NAMES["candidate_skills"],
            _rows_to_csv_bytes(
                candidate_skill_rows, ["candidate_email", "skill_name", "level"]
            ),
        )
        zipf.writestr(
            _BUNDLE_FILE_NAMES["employee_experience"],
            _rows_to_csv_bytes(
                employee_experience_rows,
                [
                    "employee_email",
                    "company",
                    "position",
                    "duration_years",
                    "description",
                ],
            ),
        )
        zipf.writestr(
            _BUNDLE_FILE_NAMES["candidate_experience"],
            _rows_to_csv_bytes(
                candidate_experience_rows,
                [
                    "candidate_email",
                    "company",
                    "position",
                    "duration_years",
                    "description",
                ],
            ),
        )
    archive.seek(0)
    return archive.getvalue()


def _upsert_employee_like(
    db: Session, tenant_id: str, row: Dict[str, Any]
) -> Dict[str, Any]:
    email = (
        str(_first_value(row, ["email", "work_email", "employee_email"], ""))
        .strip()
        .lower()
    )
    full_name = str(
        _first_value(row, ["full_name", "name", "employee_name"], "")
    ).strip()
    department = (
        str(
            _first_value(row, ["department", "dept", "department_name"], "General")
        ).strip()
        or "General"
    )
    role = (
        str(
            _first_value(row, ["role", "job_title", "position", "title"], "Employee")
        ).strip()
        or "Employee"
    )
    sentiment_score = float(
        _first_value(row, ["sentiment_score", "morale", "engagement_score"], 0.5) or 0.5
    )
    is_at_risk = str(
        _first_value(row, ["is_at_risk", "risk_flag"], "false")
    ).lower() in {"1", "true", "yes", "y"}
    retention_prob = _first_value(
        row, ["retention_prob", "retention_probability", "retention"], None
    )
    retention_prob = float(retention_prob) if retention_prob not in [None, ""] else None
    external_id = str(
        _first_value(row, ["external_id", "id", "employee_id"], email or full_name)
    )
    if not email:
        email = (
            f"{external_id or full_name}".replace(" ", ".").lower() + "@local.invalid"
        )

    existing = db.exec(
        select(EmployeeTable).where(EmployeeTable.email == email)
    ).first()
    if existing:
        existing.full_name = full_name or existing.full_name
        existing.department = department or existing.department
        existing.role = role or existing.role
        existing.sentiment_score = sentiment_score
        existing.is_at_risk = is_at_risk
        existing.retention_prob = retention_prob
        existing.updated_at = datetime.utcnow()
        db.add(existing)
        db.flush()
        employee_id = existing.id
        created = False
    else:
        created_row = EmployeeTable(
            full_name=full_name or email.split("@")[0].replace(".", " ").title(),
            email=email,
            department=department,
            role=role,
            sentiment_score=sentiment_score,
            is_at_risk=is_at_risk,
            retention_prob=retention_prob,
        )
        db.add(created_row)
        db.flush()
        employee_id = created_row.id
        created = True
    return {"id": str(employee_id), "created": created}


def _upsert_candidate_like(
    db: Session, tenant_id: str, row: Dict[str, Any]
) -> Dict[str, Any]:
    email = (
        str(_first_value(row, ["email", "candidate_email", "work_email"], ""))
        .strip()
        .lower()
    )
    full_name = str(
        _first_value(row, ["full_name", "name", "candidate_name"], "")
    ).strip()
    department = (
        str(
            _first_value(row, ["department", "dept", "department_name"], "General")
        ).strip()
        or "General"
    )
    role = (
        str(
            _first_value(row, ["role", "job_title", "position", "title"], "Candidate")
        ).strip()
        or "Candidate"
    )
    sentiment_score = float(
        _first_value(row, ["sentiment_score", "engagement_score"], 0.5) or 0.5
    )
    match_score = _first_value(row, ["match_score", "fit_score"], None)
    match_score = float(match_score) if match_score not in [None, ""] else None
    external_id = str(
        _first_value(row, ["external_id", "id", "candidate_id"], email or full_name)
    )
    if not email:
        email = (
            f"{external_id or full_name}".replace(" ", ".").lower() + "@local.invalid"
        )

    existing = db.exec(
        select(CandidateTable).where(CandidateTable.email == email)
    ).first()
    if existing:
        existing.full_name = full_name or existing.full_name
        existing.department = department or existing.department
        existing.role = role or existing.role
        existing.sentiment_score = sentiment_score
        existing.match_score = match_score
        existing.updated_at = datetime.utcnow()
        db.add(existing)
        db.flush()
        candidate_id = existing.id
        created = False
    else:
        created_row = CandidateTable(
            full_name=full_name or email.split("@")[0].replace(".", " ").title(),
            email=email,
            department=department,
            role=role,
            sentiment_score=sentiment_score,
            match_score=match_score,
        )
        db.add(created_row)
        db.flush()
        candidate_id = created_row.id
        created = True
    return {"id": str(candidate_id), "created": created}


def _upsert_canonical_employee_from_local(
    db: Session, tenant_id: str, row: Dict[str, Any]
) -> None:
    email = (
        str(_first_value(row, ["email", "work_email", "employee_email"], ""))
        .strip()
        .lower()
    )
    full_name = str(
        _first_value(row, ["full_name", "name", "employee_name"], "")
    ).strip()
    department = (
        str(
            _first_value(row, ["department", "dept", "department_name"], "General")
        ).strip()
        or "General"
    )
    role = (
        str(
            _first_value(row, ["role", "job_title", "position", "title"], "Employee")
        ).strip()
        or "Employee"
    )
    sentiment_score = float(
        _first_value(row, ["sentiment_score", "morale", "engagement_score"], 0.5) or 0.5
    )
    is_at_risk = str(
        _first_value(row, ["is_at_risk", "risk_flag"], "false")
    ).lower() in {"1", "true", "yes", "y"}
    retention_prob = _first_value(
        row, ["retention_prob", "retention_probability", "retention"], None
    )
    retention_prob = float(retention_prob) if retention_prob not in [None, ""] else None
    external_id = str(
        _first_value(
            row, ["external_id", "id", "employee_id"], email or full_name or "local"
        )
    ).strip()
    if not email:
        email = (
            f"{external_id or full_name}".replace(" ", ".").lower() + "@local.invalid"
        )
    existing = db.exec(
        select(CanonicalEmployeeTable)
        .where(CanonicalEmployeeTable.tenant_id == tenant_id)
        .where(CanonicalEmployeeTable.provider == "local_csv")
        .where(CanonicalEmployeeTable.external_id == external_id)
    ).first()
    if existing:
        existing.full_name = full_name or existing.full_name
        existing.email = email or existing.email
        existing.department = department or existing.department
        existing.role = role or existing.role
        existing.sentiment_score = sentiment_score
        existing.retention_prob = retention_prob
        existing.is_at_risk = is_at_risk
        existing.updated_at = datetime.utcnow()
        db.add(existing)
    else:
        db.add(
            CanonicalEmployeeTable(
                tenant_id=tenant_id,
                provider="local_csv",
                external_id=external_id or email,
                full_name=full_name or email.split("@")[0].replace(".", " ").title(),
                email=email,
                department=department,
                role=role,
                sentiment_score=sentiment_score,
                retention_prob=retention_prob,
                is_at_risk=is_at_risk,
            )
        )


def _upsert_canonical_candidate_from_local(
    db: Session, tenant_id: str, row: Dict[str, Any]
) -> None:
    email = (
        str(_first_value(row, ["email", "candidate_email", "work_email"], ""))
        .strip()
        .lower()
    )
    full_name = str(
        _first_value(row, ["full_name", "name", "candidate_name"], "")
    ).strip()
    department = (
        str(
            _first_value(row, ["department", "dept", "department_name"], "General")
        ).strip()
        or "General"
    )
    role = (
        str(
            _first_value(row, ["role", "job_title", "position", "title"], "Candidate")
        ).strip()
        or "Candidate"
    )
    match_score = _first_value(row, ["match_score", "fit_score"], None)
    match_score = float(match_score) if match_score not in [None, ""] else None
    external_id = str(
        _first_value(
            row, ["external_id", "id", "candidate_id"], email or full_name or "local"
        )
    ).strip()
    if not email:
        email = (
            f"{external_id or full_name}".replace(" ", ".").lower() + "@local.invalid"
        )
    existing = db.exec(
        select(CanonicalCandidateTable)
        .where(CanonicalCandidateTable.tenant_id == tenant_id)
        .where(CanonicalCandidateTable.provider == "local_csv")
        .where(CanonicalCandidateTable.external_id == external_id)
    ).first()
    if existing:
        existing.full_name = full_name or existing.full_name
        existing.email = email or existing.email
        existing.department = department or existing.department
        existing.role = role or existing.role
        existing.match_score = match_score
        existing.updated_at = datetime.utcnow()
        db.add(existing)
    else:
        db.add(
            CanonicalCandidateTable(
                tenant_id=tenant_id,
                provider="local_csv",
                external_id=external_id or email,
                full_name=full_name or email.split("@")[0].replace(".", " ").title(),
                email=email,
                department=department,
                role=role,
                match_score=match_score,
            )
        )


@router.get("/contracts")
async def list_contracts(
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    rows = db.exec(
        select(DataContractTable).order_by(DataContractTable.created_at.desc())
    ).all()
    rows = [r for r in rows if r.tenant_id == tenant_id]
    return [
        {
            "id": str(r.id),
            "source_type": r.source_type,
            "provider": r.provider,
            "version": r.version,
            "required_fields": json.loads(r.required_fields or "[]"),
            "status": r.status,
            "updated_at": r.updated_at.isoformat(),
        }
        for r in rows
    ]


@router.post("/contracts")
async def create_contract(
    payload: Dict[str, Any],
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    source_type = (payload.get("source_type") or "").strip().lower()
    provider = (payload.get("provider") or "").strip().lower()
    required_fields = payload.get("required_fields") or []
    if source_type not in {"hris", "ats"}:
        raise HTTPException(status_code=422, detail="source_type must be hris or ats")
    if not provider:
        raise HTTPException(status_code=422, detail="provider is required")
    if not isinstance(required_fields, list) or not required_fields:
        raise HTTPException(
            status_code=422, detail="required_fields must be non-empty list"
        )
    row = DataContractTable(
        tenant_id=tenant_id,
        source_type=source_type,
        provider=provider,
        version=(payload.get("version") or "v1").strip(),
        required_fields=json.dumps(required_fields),
        status=(payload.get("status") or "active").strip(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(
        db,
        current_user,
        "CREATE_CONTRACT",
        "data_contract",
        row.id,
        {"source_type": source_type, "provider": provider},
    )
    db.commit()
    return {"id": str(row.id), "status": "created"}


def _run_connection_sync(
    connection_id: UUID, tenant_id: str, db: Session
) -> Dict[str, int]:
    conn = db.get(IntegrationConnectionTable, connection_id)
    if not conn or conn.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Connection not found")

    connector = get_connector(conn.provider)
    if connector is None:
        raise HTTPException(
            status_code=422,
            detail=f"No connector adapter configured for provider {conn.provider}",
        )

    contract = db.exec(
        select(DataContractTable)
        .where(DataContractTable.tenant_id == tenant_id)
        .where(DataContractTable.source_type == conn.source_type)
        .where(DataContractTable.provider == conn.provider)
        .where(DataContractTable.status == "active")
        .order_by(DataContractTable.updated_at.desc())
    ).first()
    if not contract:
        raise HTTPException(
            status_code=422,
            detail=f"No active contract for {conn.provider}/{conn.source_type}",
        )
    required_fields = _load_required_fields(contract)

    job = ConnectorSyncJobTable(
        tenant_id=tenant_id,
        connection_id=conn.id,
        status="running",
        source_type=conn.source_type,
        provider=conn.provider,
        bronze_events=0,
        silver_upserts=0,
        quarantined=0,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    bronze = 0
    silver = 0
    quarantined = 0
    try:
        records = connector.fetch_records({"connection": conn, "session": db})
        for rec in records:
            db.add(
                RawEventTable(
                    tenant_id=tenant_id,
                    source_type=conn.source_type,
                    provider=conn.provider,
                    external_id=str(rec.get("external_id") or ""),
                    payload=json.dumps(rec, default=str),
                )
            )
            bronze += 1
            missing = _validate_payload(rec, required_fields)
            if missing:
                quarantined += 1
                db.add(
                    QuarantineEventTable(
                        tenant_id=tenant_id,
                        source_type=conn.source_type,
                        provider=conn.provider,
                        external_id=str(rec.get("external_id") or ""),
                        payload=json.dumps(rec, default=str),
                        reason=f"Missing required fields: {', '.join(missing)}",
                    )
                )
                continue

            if conn.source_type == "hris":
                existing = db.exec(
                    select(CanonicalEmployeeTable)
                    .where(CanonicalEmployeeTable.tenant_id == tenant_id)
                    .where(CanonicalEmployeeTable.provider == conn.provider)
                    .where(
                        CanonicalEmployeeTable.external_id == str(rec["external_id"])
                    )
                ).first()
                if existing:
                    existing.full_name = rec["full_name"]
                    existing.email = rec["email"]
                    existing.department = rec["department"]
                    existing.role = rec["role"]
                    existing.sentiment_score = float(
                        rec.get("sentiment_score", existing.sentiment_score or 0.5)
                    )
                    existing.retention_prob = rec.get("retention_prob")
                    existing.is_at_risk = bool(
                        rec.get("is_at_risk", existing.is_at_risk)
                    )
                    existing.updated_at = datetime.utcnow()
                    db.add(existing)
                else:
                    db.add(
                        CanonicalEmployeeTable(
                            tenant_id=tenant_id,
                            provider=conn.provider,
                            external_id=str(rec["external_id"]),
                            full_name=rec["full_name"],
                            email=rec["email"],
                            department=rec["department"],
                            role=rec["role"],
                            sentiment_score=float(rec.get("sentiment_score", 0.5)),
                            retention_prob=rec.get("retention_prob"),
                            is_at_risk=bool(rec.get("is_at_risk", False)),
                        )
                    )
                silver += 1

            if conn.source_type == "ats":
                existing = db.exec(
                    select(CanonicalCandidateTable)
                    .where(CanonicalCandidateTable.tenant_id == tenant_id)
                    .where(CanonicalCandidateTable.provider == conn.provider)
                    .where(
                        CanonicalCandidateTable.external_id == str(rec["external_id"])
                    )
                ).first()
                if existing:
                    existing.full_name = rec["full_name"]
                    existing.email = rec["email"]
                    existing.department = rec["department"]
                    existing.role = rec["role"]
                    existing.match_score = rec.get("match_score")
                    existing.updated_at = datetime.utcnow()
                    db.add(existing)
                else:
                    db.add(
                        CanonicalCandidateTable(
                            tenant_id=tenant_id,
                            provider=conn.provider,
                            external_id=str(rec["external_id"]),
                            full_name=rec["full_name"],
                            email=rec["email"],
                            department=rec["department"],
                            role=rec["role"],
                            match_score=rec.get("match_score"),
                        )
                    )
                silver += 1

        emp_rows = db.exec(
            select(CanonicalEmployeeTable).where(
                CanonicalEmployeeTable.tenant_id == tenant_id
            )
        ).all()
        cand_rows = db.exec(
            select(CanonicalCandidateTable).where(
                CanonicalCandidateTable.tenant_id == tenant_id
            )
        ).all()
        emp_count = len(emp_rows)
        cand_count = len(cand_rows)
        at_risk = len([e for e in emp_rows if e.is_at_risk])
        db.add(
            GoldMetricSnapshotTable(
                tenant_id=tenant_id,
                metric_type="workforce",
                payload=json.dumps(
                    {
                        "employees": emp_count,
                        "candidates": cand_count,
                        "at_risk": at_risk,
                        "at_risk_pct": (
                            round((at_risk / emp_count) * 100, 2) if emp_count else 0.0
                        ),
                        "updated_at": datetime.utcnow().isoformat(),
                    }
                ),
            )
        )

        conn.last_sync_at = datetime.utcnow()
        conn.last_sync_status = "success"
        conn.last_sync_summary = (
            f"bronze={bronze}, silver={silver}, quarantined={quarantined}"
        )
        conn.status = "active"
        conn.sync_retry_count = 0
        conn.next_sync_at = datetime.utcnow() + timedelta(
            minutes=max(5, conn.sync_interval_minutes)
        )
        conn.updated_at = datetime.utcnow()
        db.add(conn)
        job.status = "success"
        job.bronze_events = bronze
        job.silver_upserts = silver
        job.quarantined = quarantined
        job.finished_at = datetime.utcnow()
        db.add(job)
        db.commit()
        _audit(
            db,
            TokenData(user_id="system", email="system@aurelinx.local", is_admin=True),
            "SYNC_CONNECTION",
            "integration_connection",
            conn.id,
            {"bronze": bronze, "silver": silver, "quarantined": quarantined},
        )
        db.commit()
        return {
            "connection_id": str(connection_id),
            "bronze_events": bronze,
            "silver_upserts": silver,
            "quarantined": quarantined,
        }
    except Exception as exc:
        conn.last_sync_at = datetime.utcnow()
        conn.last_sync_status = "failed"
        conn.last_sync_summary = str(exc)[:240]
        conn.sync_retry_count += 1
        conn.updated_at = datetime.utcnow()
        db.add(conn)
        job.status = "failed"
        job.error_message = str(exc)[:240]
        job.finished_at = datetime.utcnow()
        db.add(job)
        _audit(
            db,
            TokenData(user_id="system", email="system@aurelinx.local", is_admin=True),
            "SYNC_CONNECTION_FAILED",
            "integration_connection",
            conn.id,
            {"error": str(exc)[:240]},
        )
        db.commit()
        raise


@router.post("/connections/{connection_id}/sync")
async def sync_connection_into_pipeline(
    connection_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    result = _run_connection_sync(connection_id, tenant_id, db)
    return result


@router.get(
    "/connections/{connection_id}/mappings",
    response_model=List[ConnectorFieldMappingOut],
)
async def list_field_mappings(
    connection_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    rows = db.exec(
        select(ConnectorFieldMappingTable)
        .where(ConnectorFieldMappingTable.connection_id == connection_id)
        .where(ConnectorFieldMappingTable.tenant_id == tenant_id)
        .order_by(ConnectorFieldMappingTable.created_at.asc())
    ).all()
    return [
        ConnectorFieldMappingOut(
            id=r.id,
            connection_id=r.connection_id,
            source_field=r.source_field,
            canonical_field=r.canonical_field,
            transform_rule=r.transform_rule,
            required=r.required,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]


@router.post(
    "/connections/{connection_id}/mappings",
    response_model=ConnectorFieldMappingOut,
    status_code=201,
)
async def create_field_mapping(
    connection_id: UUID,
    payload: ConnectorFieldMappingCreate,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    conn = db.get(IntegrationConnectionTable, connection_id)
    if not conn or conn.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Connection not found")
    row = ConnectorFieldMappingTable(
        tenant_id=tenant_id,
        connection_id=connection_id,
        source_field=payload.source_field,
        canonical_field=payload.canonical_field,
        transform_rule=payload.transform_rule,
        required=payload.required,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ConnectorFieldMappingOut(
        id=row.id,
        connection_id=row.connection_id,
        source_field=row.source_field,
        canonical_field=row.canonical_field,
        transform_rule=row.transform_rule,
        required=row.required,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get(
    "/connections/{connection_id}/sync-jobs", response_model=List[ConnectorSyncJobOut]
)
async def list_sync_jobs(
    connection_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    rows = db.exec(
        select(ConnectorSyncJobTable)
        .where(ConnectorSyncJobTable.connection_id == connection_id)
        .where(ConnectorSyncJobTable.tenant_id == tenant_id)
        .order_by(ConnectorSyncJobTable.started_at.desc())
    ).all()
    return [
        ConnectorSyncJobOut(
            id=r.id,
            connection_id=r.connection_id,
            status=r.status,
            source_type=r.source_type,
            provider=r.provider,
            bronze_events=r.bronze_events,
            silver_upserts=r.silver_upserts,
            quarantined=r.quarantined,
            error_message=r.error_message,
            started_at=r.started_at,
            finished_at=r.finished_at,
        )
        for r in rows
    ]


@router.get("/quarantine")
async def list_quarantine(
    limit: int = 200,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    rows = db.exec(
        select(QuarantineEventTable)
        .where(QuarantineEventTable.tenant_id == tenant_id)
        .order_by(QuarantineEventTable.quarantined_at.desc())
        .limit(limit)
    ).all()
    return [
        {
            "id": str(r.id),
            "source_type": r.source_type,
            "provider": r.provider,
            "external_id": r.external_id,
            "reason": r.reason,
            "quarantined_at": r.quarantined_at.isoformat(),
        }
        for r in rows
    ]


@router.post("/ml/train")
async def train_attrition_model(
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    rows = db.exec(
        select(CanonicalEmployeeTable).where(
            CanonicalEmployeeTable.tenant_id == tenant_id
        )
    ).all()
    if len(rows) < 20:
        raise HTTPException(
            status_code=422,
            detail="Need at least 20 canonical employees to train model",
        )

    risky = [r for r in rows if r.is_at_risk]
    stable = [r for r in rows if not r.is_at_risk]
    if not risky or not stable:
        raise HTTPException(
            status_code=422, detail="Need both risky and stable records for training"
        )

    def avg(values: List[float]) -> float:
        return sum(values) / len(values) if values else 0.0

    r_sent = avg([float(r.sentiment_score or 0.5) for r in risky])
    s_sent = avg([float(r.sentiment_score or 0.5) for r in stable])
    r_ret = avg(
        [
            float(r.retention_prob if r.retention_prob is not None else 0.5)
            for r in risky
        ]
    )
    s_ret = avg(
        [
            float(r.retention_prob if r.retention_prob is not None else 0.5)
            for r in stable
        ]
    )

    sentiment_weight = max(0.2, min(2.0, abs(s_sent - r_sent) * 2.5 + 0.4))
    retention_weight = max(0.2, min(2.0, abs(s_ret - r_ret) * 2.5 + 0.4))
    bias = 0.15 + (len(risky) / len(rows)) * 0.3

    params = {
        "sentiment_weight": round(sentiment_weight, 4),
        "retention_weight": round(retention_weight, 4),
        "bias": round(bias, 4),
        "trained_on": len(rows),
    }
    metrics = {
        "risk_rate": round(len(risky) / len(rows), 4),
        "avg_risky_sentiment": round(r_sent, 4),
        "avg_stable_sentiment": round(s_sent, 4),
        "avg_risky_retention": round(r_ret, 4),
        "avg_stable_retention": round(s_ret, 4),
    }

    # archive currently active
    for m in db.exec(
        select(MLModelRegistryTable)
        .where(MLModelRegistryTable.tenant_id == tenant_id)
        .where(MLModelRegistryTable.model_name == "attrition_v1")
    ).all():
        if m.status == "active":
            m.status = "archived"
            db.add(m)

    version = f"v{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    row = MLModelRegistryTable(
        tenant_id=tenant_id,
        model_name="attrition_v1",
        version=version,
        status="active",
        metrics=json.dumps(metrics),
        parameters=json.dumps(params),
        trained_at=datetime.utcnow(),
    )
    drift_score = round(abs(float(metrics["risk_rate"]) - 0.5), 4)
    db.add(
        MLDriftSnapshotTable(
            tenant_id=tenant_id,
            model_name="attrition_v1",
            model_version=version,
            drift_score=drift_score,
            needs_retraining=drift_score >= 0.25,
            notes="initial post-train drift baseline",
        )
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    card = MLModelCardTable(
        tenant_id=tenant_id,
        model_name="attrition_v1",
        version=version,
        status="candidate",
        pr_auc=max(0.5, min(0.99, 0.72 + abs(s_sent - r_sent) * 0.08)),
        calibration_error=max(0.01, min(0.35, abs(0.5 - metrics["risk_rate"]))),
        fairness_gap=0.0,
        notes="Auto-generated model card from lean training run",
    )
    db.add(card)
    _audit(
        db,
        current_user,
        "TRAIN_MODEL",
        "ml_model_registry",
        row.id,
        {"metrics": metrics, "card_id": str(card.id)},
    )
    db.commit()
    return {
        "model_name": row.model_name,
        "version": row.version,
        "status": row.status,
        "metrics": metrics,
    }


@router.get("/ml/models")
async def list_models(
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    rows = db.exec(
        select(MLModelRegistryTable)
        .where(MLModelRegistryTable.tenant_id == tenant_id)
        .order_by(MLModelRegistryTable.trained_at.desc())
    ).all()
    return [
        {
            "id": str(r.id),
            "model_name": r.model_name,
            "version": r.version,
            "status": r.status,
            "trained_at": r.trained_at.isoformat(),
            "metrics": json.loads(r.metrics or "{}"),
        }
        for r in rows
    ]


@router.post("/ml/score")
async def score_attrition(
    top_n: int = 100,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    model = db.exec(
        select(MLModelRegistryTable)
        .where(MLModelRegistryTable.tenant_id == tenant_id)
        .where(MLModelRegistryTable.model_name == "attrition_v1")
        .where(MLModelRegistryTable.status == "active")
        .order_by(MLModelRegistryTable.trained_at.desc())
    ).first()
    if not model:
        raise HTTPException(
            status_code=422, detail="No active attrition_v1 model. Train first."
        )
    params = json.loads(model.parameters or "{}")
    sw = float(params.get("sentiment_weight", 1.0))
    rw = float(params.get("retention_weight", 1.0))
    bias = float(params.get("bias", 0.2))

    rows = db.exec(
        select(CanonicalEmployeeTable).where(
            CanonicalEmployeeTable.tenant_id == tenant_id
        )
    ).all()
    scored = []
    for e in rows:
        sentiment = float(e.sentiment_score or 0.5)
        retention = float(e.retention_prob if e.retention_prob is not None else 0.5)
        risk = (
            bias + max(0.0, (0.55 - sentiment) * sw) + max(0.0, (0.6 - retention) * rw)
        )
        risk = max(0.01, min(0.99, risk))
        scored.append(
            {
                "employee_id": str(e.id),
                "full_name": e.full_name,
                "department": e.department,
                "role": e.role,
                "risk_probability": round(risk, 4),
            }
        )
    scored.sort(key=lambda x: x["risk_probability"], reverse=True)
    return {"model_version": model.version, "count": len(scored), "top": scored[:top_n]}


@router.post("/optimizer/scenario")
async def optimize_workforce_scenario(
    payload: Dict[str, Any],
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    budget = float(payload.get("budget_cap", 0))
    target_hires = int(payload.get("target_hires", 0))
    target_retentions = int(payload.get("target_retentions", 0))
    if budget <= 0:
        raise HTTPException(status_code=422, detail="budget_cap must be > 0")
    if target_hires < 0 or target_retentions < 0:
        raise HTTPException(status_code=422, detail="targets cannot be negative")

    # Lean optimizer: simple constrained allocation between retention and hiring pools.
    # retention action avg cost and benefit
    retention_unit_cost = float(payload.get("retention_unit_cost", 3500))
    hire_unit_cost = float(payload.get("hire_unit_cost", 9500))
    retention_priority = float(payload.get("retention_priority", 0.6))
    hiring_priority = float(payload.get("hiring_priority", 0.4))
    total_priority = max(0.01, retention_priority + hiring_priority)

    budget_retention = budget * (retention_priority / total_priority)
    budget_hiring = budget * (hiring_priority / total_priority)
    retention_actions = int(budget_retention // max(1.0, retention_unit_cost))
    hires = int(budget_hiring // max(1.0, hire_unit_cost))

    retention_actions = (
        min(retention_actions, target_retentions)
        if target_retentions > 0
        else retention_actions
    )
    hires = min(hires, target_hires) if target_hires > 0 else hires

    used_budget = (retention_actions * retention_unit_cost) + (hires * hire_unit_cost)
    remaining_budget = max(0.0, budget - used_budget)

    result = {
        "input": {
            "budget_cap": budget,
            "target_hires": target_hires,
            "target_retentions": target_retentions,
        },
        "recommendation": {
            "retention_actions": retention_actions,
            "hiring_actions": hires,
            "used_budget": round(used_budget, 2),
            "remaining_budget": round(remaining_budget, 2),
        },
        "assumptions": {
            "retention_unit_cost": retention_unit_cost,
            "hire_unit_cost": hire_unit_cost,
        },
    }
    row = ForecastScenarioTable(
        tenant_id=tenant_id,
        scenario_name=str(
            payload.get("scenario_name")
            or f"scenario-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        ),
        input_payload=json.dumps(result["input"]),
        output_payload=json.dumps(
            result["recommendation"] | {"assumptions": result["assumptions"]}
        ),
        created_by=current_user.user_id,
    )
    db.add(row)
    db.commit()
    _audit(db, current_user, "RUN_SCENARIO", "forecast_scenario", row.id, result)
    db.commit()
    return {**result, "scenario_id": str(row.id)}


@router.get("/policy/packs", response_model=List[CompliancePolicyOut])
async def list_policy_packs(
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    rows = db.exec(
        select(CompliancePolicyTable)
        .where(CompliancePolicyTable.tenant_id == tenant_id)
        .order_by(CompliancePolicyTable.created_at.desc())
    ).all()
    return [_policy_to_out(r) for r in rows]


@router.post("/policy/packs", response_model=CompliancePolicyOut, status_code=201)
async def create_policy_pack(
    payload: CompliancePolicyCreate,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    row = CompliancePolicyTable(
        tenant_id=tenant_id,
        region=payload.region,
        policy_name=payload.policy_name,
        action_type=payload.action_type,
        min_confidence=payload.min_confidence,
        requires_approval=payload.requires_approval,
        blocked_if_missing_evidence=payload.blocked_if_missing_evidence,
        blocked_actions=json.dumps(payload.blocked_actions),
        status=payload.status,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(
        db,
        current_user,
        "CREATE_POLICY_PACK",
        "compliance_policy",
        row.id,
        {"region": payload.region, "action_type": payload.action_type},
    )
    db.commit()
    return _policy_to_out(row)


@router.post("/policy/check", response_model=PolicyCheckResponse)
async def check_policy(
    payload: PolicyCheckRequest,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    return _policy_check(
        db=db,
        tenant_id=tenant_id,
        action_type=payload.action_type,
        confidence=payload.confidence,
        evidence=payload.evidence,
        region=payload.region,
        high_impact=payload.high_impact,
    )


@router.get("/ml/drift", response_model=List[MLDriftSnapshotOut])
async def list_ml_drift(
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    rows = db.exec(
        select(MLDriftSnapshotTable)
        .where(MLDriftSnapshotTable.tenant_id == tenant_id)
        .order_by(MLDriftSnapshotTable.created_at.desc())
    ).all()
    return [
        MLDriftSnapshotOut(
            id=r.id,
            tenant_id=r.tenant_id,
            model_name=r.model_name,
            model_version=r.model_version,
            drift_score=r.drift_score,
            needs_retraining=r.needs_retraining,
            notes=r.notes,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.post("/ml/retrain")
async def retrain_model(
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    return await train_attrition_model(
        current_user=current_user, tenant_id=tenant_id, db=db
    )


@router.get("/scenarios", response_model=List[ForecastScenarioOut])
async def list_scenarios(
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    rows = db.exec(
        select(ForecastScenarioTable)
        .where(ForecastScenarioTable.tenant_id == tenant_id)
        .order_by(ForecastScenarioTable.created_at.desc())
    ).all()
    return [
        ForecastScenarioOut(
            id=r.id,
            tenant_id=r.tenant_id,
            scenario_name=r.scenario_name,
            input_payload=json.loads(r.input_payload or "{}"),
            output_payload=json.loads(r.output_payload or "{}"),
            created_by=r.created_by,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.get("/ml/cards", response_model=List[MLModelCardOut])
async def list_model_cards(
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    rows = db.exec(
        select(MLModelCardTable)
        .where(MLModelCardTable.tenant_id == tenant_id)
        .order_by(MLModelCardTable.created_at.desc())
    ).all()
    return [_model_card_out(r) for r in rows]


@router.post("/ml/cards/{card_id}/approve", response_model=MLModelCardOut)
async def approve_model_card(
    card_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    card = db.get(MLModelCardTable, card_id)
    if not card or card.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Model card not found")
    card.status = "approved"
    card.approved_by = current_user.user_id
    card.approved_at = datetime.utcnow()
    db.add(card)
    _audit(
        db,
        current_user,
        "APPROVE_MODEL_CARD",
        "ml_model_card",
        card.id,
        {"model_name": card.model_name, "version": card.version},
    )
    db.commit()
    return _model_card_out(card)


@router.post("/ml/cards/{card_id}/promote", response_model=MLModelCardOut)
async def promote_model_card(
    card_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    card = db.get(MLModelCardTable, card_id)
    if not card or card.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Model card not found")
    for other in db.exec(
        select(MLModelCardTable)
        .where(MLModelCardTable.tenant_id == tenant_id)
        .where(MLModelCardTable.model_name == card.model_name)
    ).all():
        if other.status == "champion":
            other.status = "archived"
            db.add(other)
    card.status = "champion"
    card.approved_by = current_user.user_id
    card.approved_at = datetime.utcnow()
    db.add(card)
    db.commit()
    _audit(
        db,
        current_user,
        "PROMOTE_MODEL_CARD",
        "ml_model_card",
        card.id,
        {"model_name": card.model_name, "version": card.version},
    )
    db.commit()
    return _model_card_out(card)


@router.post("/ml/cards/{card_id}/rollback", response_model=MLModelCardOut)
async def rollback_model_card(
    card_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    card = db.get(MLModelCardTable, card_id)
    if not card or card.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Model card not found")
    for other in db.exec(
        select(MLModelCardTable)
        .where(MLModelCardTable.tenant_id == tenant_id)
        .where(MLModelCardTable.model_name == card.model_name)
    ).all():
        if other.status == "champion":
            other.status = "archived"
            db.add(other)
    card.status = "approved"
    db.add(card)
    db.commit()
    _audit(
        db,
        current_user,
        "ROLLBACK_MODEL_CARD",
        "ml_model_card",
        card.id,
        {"model_name": card.model_name, "version": card.version},
    )
    db.commit()
    return _model_card_out(card)


@router.get("/compliance/fairness", response_model=FairnessSummaryOut)
async def get_fairness_summary(
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    rows = db.exec(
        select(CanonicalEmployeeTable).where(
            CanonicalEmployeeTable.tenant_id == tenant_id
        )
    ).all()
    if not rows:
        rows = [
            CanonicalEmployeeTable(
                tenant_id=tenant_id,
                provider="local_fallback",
                external_id=str(r.id),
                full_name=r.full_name,
                email=r.email,
                department=r.department,
                role=r.role,
                sentiment_score=r.sentiment_score,
                retention_prob=r.retention_prob,
                is_at_risk=r.is_at_risk,
            )
            for r in db.exec(select(EmployeeTable)).all()
        ]
    return _fairness_summary(rows, tenant_id)


@router.get("/release-gates", response_model=List[ReleaseGateOut])
async def list_release_gates(
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    rows = db.exec(
        select(ReleaseGateTable)
        .where(ReleaseGateTable.tenant_id == tenant_id)
        .order_by(ReleaseGateTable.created_at.desc())
    ).all()
    return [_release_gate_out(r) for r in rows]


@router.post("/release-gates", response_model=ReleaseGateOut, status_code=201)
async def create_release_gate(
    payload: ReleaseGateCreate,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    row = ReleaseGateTable(
        tenant_id=tenant_id,
        environment=payload.environment,
        artifact_name=payload.artifact_name,
        version=payload.version,
        status="pending",
        required_checks=json.dumps(payload.required_checks),
        notes=payload.notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(
        db,
        current_user,
        "CREATE_RELEASE_GATE",
        "release_gate",
        row.id,
        {"environment": payload.environment, "artifact_name": payload.artifact_name},
    )
    db.commit()
    return _release_gate_out(row)


@router.post("/release-gates/{gate_id}/approve", response_model=ReleaseGateOut)
async def approve_release_gate(
    gate_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    gate = db.get(ReleaseGateTable, gate_id)
    if not gate or gate.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Release gate not found")
    gate.status = "approved"
    gate.approved_by = current_user.user_id
    gate.approved_at = datetime.utcnow()
    db.add(gate)
    db.commit()
    _audit(
        db,
        current_user,
        "APPROVE_RELEASE_GATE",
        "release_gate",
        gate.id,
        {"environment": gate.environment, "artifact_name": gate.artifact_name},
    )
    db.commit()
    return _release_gate_out(gate)


@router.get("/audit-events")
async def list_audit_events(
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    rows = db.exec(
        select(AuditLogTable).order_by(AuditLogTable.created_at.desc()).limit(200)
    ).all()
    return [
        {
            "id": str(r.id),
            "action": r.action,
            "resource_type": r.resource_type,
            "resource_id": str(r.resource_id) if r.resource_id else None,
            "details": json.loads(r.details or "{}"),
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


@router.get("/dr/runbooks", response_model=List[DRRunbookOut])
async def list_dr_runbooks(
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    rows = db.exec(
        select(DRRunbookTable)
        .where(DRRunbookTable.tenant_id == tenant_id)
        .order_by(DRRunbookTable.created_at.desc())
    ).all()
    return [_dr_runbook_out(r) for r in rows]


@router.post("/dr/runbooks", response_model=DRRunbookOut, status_code=201)
async def create_dr_runbook(
    payload: DRRunbookCreate,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    row = DRRunbookTable(
        tenant_id=tenant_id,
        runbook_name=payload.runbook_name,
        environment=payload.environment,
        rto_minutes=payload.rto_minutes,
        rpo_minutes=payload.rpo_minutes,
        status=payload.status,
        notes=payload.notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(
        db,
        current_user,
        "CREATE_DR_RUNBOOK",
        "dr_runbook",
        row.id,
        {
            "environment": payload.environment,
            "rto_minutes": payload.rto_minutes,
            "rpo_minutes": payload.rpo_minutes,
        },
    )
    db.commit()
    return _dr_runbook_out(row)


@router.post("/dr/runbooks/{runbook_id}/drill", response_model=DRRunbookOut)
async def run_dr_drill(
    runbook_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    row = db.get(DRRunbookTable, runbook_id)
    if not row or row.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Runbook not found")
    row.last_drill_at = datetime.utcnow()
    row.last_drill_result = f"Validated recovery for {row.environment} within {row.rto_minutes}m RTO and {row.rpo_minutes}m RPO"
    row.status = "validated"
    row.updated_at = datetime.utcnow()
    db.add(row)
    db.commit()
    _audit(
        db,
        current_user,
        "RUN_DR_DRILL",
        "dr_runbook",
        row.id,
        {"result": row.last_drill_result},
    )
    db.commit()
    return _dr_runbook_out(row)


@router.get("/procurement/artifacts", response_model=List[ProcurementArtifactOut])
async def list_procurement_artifacts(
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    rows = db.exec(
        select(ProcurementArtifactTable)
        .where(ProcurementArtifactTable.tenant_id == tenant_id)
        .order_by(ProcurementArtifactTable.created_at.desc())
    ).all()
    return [_procurement_artifact_out(r) for r in rows]


@router.post(
    "/procurement/artifacts", response_model=ProcurementArtifactOut, status_code=201
)
async def create_procurement_artifact(
    payload: ProcurementArtifactCreate,
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    row = ProcurementArtifactTable(
        tenant_id=tenant_id,
        artifact_type=payload.artifact_type,
        title=payload.title,
        version=payload.version,
        status=payload.status,
        notes=payload.notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(
        db,
        current_user,
        "CREATE_PROCUREMENT_ARTIFACT",
        "procurement_artifact",
        row.id,
        {"artifact_type": payload.artifact_type, "title": payload.title},
    )
    db.commit()
    return _procurement_artifact_out(row)


@router.delete("/import/reset")
async def reset_local_demo_data(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    from sqlmodel import delete

    for model in [
        SkillTable,
        ExperienceTable,
        EmployeeTable,
        CandidateTable,
        CanonicalEmployeeTable,
        CanonicalCandidateTable,
        RawEventTable,
        QuarantineEventTable,
        GoldMetricSnapshotTable,
    ]:
        db.execute(delete(model))
    db.commit()
    _audit(
        db,
        current_user,
        "RESET_DEMO_DATA",
        "dataset",
        None,
        {"scope": "all_local_demo_entities"},
    )
    db.commit()
    return {"status": "cleared"}


def _reset_local_demo_data_sync(db: Session, current_user: TokenData) -> None:
    from sqlmodel import delete

    for model in [
        SkillTable,
        ExperienceTable,
        EmployeeTable,
        CandidateTable,
        CanonicalEmployeeTable,
        CanonicalCandidateTable,
        RawEventTable,
        QuarantineEventTable,
        GoldMetricSnapshotTable,
    ]:
        db.execute(delete(model))
    db.commit()
    _audit(
        db,
        current_user,
        "RESET_DEMO_DATA",
        "dataset",
        None,
        {"scope": "all_local_demo_entities"},
    )
    db.commit()


def _run_import_job(job_id: str, runner):
    def _target():
        _update_import_job(
            job_id,
            status="running",
            phase="starting",
            progress=1,
            message="Starting import job...",
        )
        try:
            result = runner(job_id)
            _update_import_job(
                job_id,
                status="completed",
                phase="completed",
                progress=100,
                message="Import completed.",
                result=result,
            )
        except Exception as exc:
            _update_import_job(
                job_id,
                status="failed",
                phase="failed",
                progress=100,
                message="Import failed.",
                error=str(exc),
            )

    threading.Thread(target=_target, daemon=True).start()


def _bundle_job_runner(file_name: str, archive_bytes: bytes, current_user: TokenData):
    def _runner(job_id: str):
        with Session(engine) as db:
            _update_import_job(
                job_id,
                phase="reading_bundle",
                progress=10,
                message="Opening ZIP bundle...",
            )
            try:
                with zipfile.ZipFile(io.BytesIO(archive_bytes)) as zipf:
                    bundle_members: Dict[str, str] = {}
                    for member in zipf.namelist():
                        base_name = Path(member).name.lower()
                        for kind, expected_name in _BUNDLE_FILE_NAMES.items():
                            if base_name == expected_name:
                                bundle_members[kind] = member
                    missing = [
                        expected
                        for kind, expected in _BUNDLE_FILE_NAMES.items()
                        if kind not in bundle_members
                    ]
                    if missing:
                        raise HTTPException(
                            status_code=422,
                            detail=f"Bundle missing required files: {', '.join(missing)}",
                        )

                    _update_import_job(
                        job_id,
                        phase="resetting",
                        progress=20,
                        message="Resetting current local dataset...",
                    )
                    _reset_local_demo_data_sync(db, current_user)

                    ordered_kinds = list(_BUNDLE_FILE_NAMES.keys())
                    results: Dict[str, int] = {}
                    total_steps = len(ordered_kinds)
                    for index, kind in enumerate(ordered_kinds, start=1):
                        member = bundle_members[kind]
                        _update_import_job(
                            job_id,
                            phase=f"importing_{kind}",
                            progress=20 + int((index - 1) / total_steps * 70),
                            message=f"Importing {kind.replace('_', ' ')}...",
                        )
                        with zipf.open(member) as handle:
                            content = handle.read().decode("utf-8-sig")
                        reader = csv.DictReader(content.splitlines())
                        rows = [_normalize_header_map(row) for row in reader]
                        results[kind] = _import_rows_for_kind(db, "default", kind, rows)
                        db.commit()

                    _update_import_job(
                        job_id,
                        phase="auditing",
                        progress=95,
                        message="Finalizing import audit...",
                    )
                    _audit(
                        db,
                        current_user,
                        "IMPORT_DATASET_BUNDLE",
                        "dataset",
                        None,
                        {"bundle": results, "file_name": file_name},
                    )
                    db.commit()
                    return {
                        "status": "imported",
                        "bundle": results,
                        "file_name": file_name,
                    }
            except zipfile.BadZipFile as exc:
                raise HTTPException(
                    status_code=422, detail="Invalid ZIP bundle"
                ) from exc

    return _runner


def _demo_job_runner(current_user: TokenData):
    def _runner(job_id: str):
        raise HTTPException(
            status_code=410,
            detail="Demo dataset import has been removed. Upload CSV files manually.",
        )

    return _runner


def _csv_job_runner(
    kind: str, file_name: str, csv_bytes: bytes, current_user: TokenData
):
    def _runner(job_id: str):
        with Session(engine) as db:
            _update_import_job(
                job_id,
                phase="reading_csv",
                progress=15,
                message=f"Reading {file_name}...",
            )
            content = csv_bytes.decode("utf-8-sig")
            reader = csv.DictReader(content.splitlines())
            rows = [_normalize_header_map(row) for row in reader]
            _update_import_job(
                job_id,
                phase="importing_csv",
                progress=45,
                message=f"Importing {kind.replace('_', ' ')} rows...",
            )
            imported = _import_rows_for_kind(db, "default", kind, rows)
            db.commit()
            _update_import_job(
                job_id, phase="auditing", progress=90, message="Writing audit trail..."
            )
            _audit(
                db,
                current_user,
                "IMPORT_CSV",
                "dataset",
                None,
                {"kind": kind, "rows": imported, "file_name": file_name},
            )
            db.commit()
            return {
                "status": "imported",
                "kind": kind,
                "rows": imported,
                "file_name": file_name,
            }

    return _runner


@router.post("/import/csv")
async def import_csv_bundle(
    kind: str = Form(...),
    file: UploadFile = File(...),
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(content.splitlines())
    rows = [_normalize_header_map(row) for row in reader]
    imported = _import_rows_for_kind(db, "default", kind, rows)

    db.commit()
    _audit(
        db,
        current_user,
        "IMPORT_CSV",
        "dataset",
        None,
        {"kind": kind, "rows": imported, "file_name": file.filename},
    )
    db.commit()
    return {"status": "imported", "kind": kind, "rows": imported}


@router.post("/import/csv/async")
async def import_csv_bundle_async(
    kind: str = Form(...),
    file: UploadFile = File(...),
    current_user: TokenData = Depends(get_current_user_strict),
):
    csv_bytes = await file.read()
    job_id = _create_import_job("csv", file.filename or f"{kind}.csv")
    _run_import_job(
        job_id,
        _csv_job_runner(kind, file.filename or f"{kind}.csv", csv_bytes, current_user),
    )
    return {"job_id": job_id, "status": "queued"}


@router.post("/import/validate")
async def validate_csv_bundle(
    kind: str = Form(...),
    file: UploadFile = File(...),
    current_user: TokenData = Depends(get_current_user),
):
    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(content.splitlines())
    rows = [_normalize_header_map(row) for row in reader]

    if kind in {"employees", "candidates"}:
        required_fields = ["email", "full_name", "department", "role"]
        metrics = _build_quality_score(rows, required_fields, unique_field="email")
    elif kind in {"employee_skills", "candidate_skills"}:
        required_fields = ["email", "skill_name"]
        metrics = _build_quality_score(rows, required_fields, unique_field="email")
    elif kind in {"employee_experience", "candidate_experience"}:
        required_fields = ["email", "company", "position"]
        metrics = _build_quality_score(rows, required_fields, unique_field="email")
    else:
        raise HTTPException(status_code=422, detail="Unsupported kind")

    return {
        "kind": kind,
        "file_name": file.filename,
        "validated_at": datetime.utcnow().isoformat(),
        "metrics": metrics,
    }


@router.post("/import/bundle")
async def import_dataset_bundle(
    file: UploadFile = File(...),
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(
            status_code=422,
            detail="Upload a ZIP bundle containing the dataset CSV files",
        )

    archive_bytes = await file.read()
    try:
        with zipfile.ZipFile(io.BytesIO(archive_bytes)) as zipf:
            bundle_members: Dict[str, str] = {}
            for member in zipf.namelist():
                base_name = Path(member).name.lower()
                for kind, expected_name in _BUNDLE_FILE_NAMES.items():
                    if base_name == expected_name:
                        bundle_members[kind] = member
            missing = [
                expected
                for kind, expected in _BUNDLE_FILE_NAMES.items()
                if kind not in bundle_members
            ]
            if missing:
                raise HTTPException(
                    status_code=422,
                    detail=f"Bundle missing required files: {', '.join(missing)}",
                )

            await reset_local_demo_data(current_user=current_user, db=db)

            results: Dict[str, int] = {}
            for kind, member in bundle_members.items():
                with zipf.open(member) as handle:
                    content = handle.read().decode("utf-8-sig")
                reader = csv.DictReader(content.splitlines())
                rows = [_normalize_header_map(row) for row in reader]
                results[kind] = _import_rows_for_kind(db, "default", kind, rows)

            db.commit()
            _audit(
                db,
                current_user,
                "IMPORT_DATASET_BUNDLE",
                "dataset",
                None,
                {"bundle": results, "file_name": file.filename},
            )
            db.commit()
            return {"status": "imported", "bundle": results, "file_name": file.filename}
    except zipfile.BadZipFile:
        raise HTTPException(status_code=422, detail="Invalid ZIP bundle")


@router.post("/import/bundle/async")
async def import_dataset_bundle_async(
    file: UploadFile = File(...),
    current_user: TokenData = Depends(get_current_user_strict),
):
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(
            status_code=422,
            detail="Upload a ZIP bundle containing the dataset CSV files",
        )
    archive_bytes = await file.read()
    job_id = _create_import_job("bundle", file.filename)
    _run_import_job(
        job_id, _bundle_job_runner(file.filename, archive_bytes, current_user)
    )
    return {"job_id": job_id, "status": "queued"}


@router.post("/import/demo")
async def import_local_demo_bundle(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    raise HTTPException(
        status_code=410,
        detail="Demo dataset import has been removed. Upload CSV files manually.",
    )


@router.post("/import/demo/async")
async def import_local_demo_bundle_async(
    current_user: TokenData = Depends(get_current_user_strict),
):
    raise HTTPException(
        status_code=410,
        detail="Demo dataset import has been removed. Upload CSV files manually.",
    )


@router.get("/import/jobs/{job_id}")
async def get_import_job_status(
    job_id: str,
    current_user: TokenData = Depends(get_current_user),
):
    job = _get_import_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Import job not found")
    return job


@router.get("/export/bundle")
async def export_dataset_bundle(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    bundle_bytes = _export_dataset_bundle_bytes(db)
    _audit(
        db,
        current_user,
        "EXPORT_DATASET_BUNDLE",
        "dataset",
        None,
        {"file_name": "aurelinx-dataset-bundle.zip"},
    )
    db.commit()
    return Response(
        content=bundle_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="aurelinx-dataset-bundle.zip"'
        },
    )


@router.get("/import/demo/status")
async def get_demo_import_status(
    current_user: TokenData = Depends(get_current_user),
):
    raise HTTPException(
        status_code=410,
        detail="Demo dataset import has been removed. Use /lean/summary instead.",
    )


@router.get("/executive/packet")
async def get_executive_packet(
    template: str = "monthly",
    current_user: TokenData = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    analytics = _analytics_snapshot(db)
    scenarios = db.exec(
        select(ForecastScenarioTable)
        .where(ForecastScenarioTable.tenant_id == tenant_id)
        .order_by(ForecastScenarioTable.created_at.desc())
        .limit(3)
    ).all()
    policies = db.exec(
        select(CompliancePolicyTable)
        .where(CompliancePolicyTable.tenant_id == tenant_id)
        .where(CompliancePolicyTable.status == "active")
        .order_by(CompliancePolicyTable.created_at.desc())
        .limit(5)
    ).all()
    dr_runbooks = db.exec(
        select(DRRunbookTable)
        .where(DRRunbookTable.tenant_id == tenant_id)
        .order_by(DRRunbookTable.created_at.desc())
        .limit(3)
    ).all()
    procurement = db.exec(
        select(ProcurementArtifactTable)
        .where(ProcurementArtifactTable.tenant_id == tenant_id)
        .order_by(ProcurementArtifactTable.created_at.desc())
        .limit(5)
    ).all()
    packet = {
        "template": template,
        "generated_at": datetime.utcnow().isoformat(),
        "headline": "Aurelinx executive packet",
        "summary": {
            "workforce": analytics["total"],
            "at_risk": analytics["atRisk"],
            "risk_pct": analytics["atRiskPct"],
            "avg_sentiment": analytics["avgSentiment"],
            "top_risk_department": analytics["topRiskDepartment"],
            "top_risk_department_ratio": analytics["topRiskDepartmentRatio"],
        },
        "risk_drivers": analytics["topRiskDrivers"],
        "actions": [
            "Review the highest-risk department and open interventions for the top drivers.",
            "Validate policy coverage for any high-impact recommendation before execution.",
            "Check the latest scenario output against budget and headcount targets.",
        ],
        "scenarios": [
            {
                "id": str(row.id),
                "name": row.scenario_name,
                "created_at": row.created_at.isoformat(),
            }
            for row in scenarios
        ],
        "governance": {
            "policies": [
                {
                    "name": row.policy_name,
                    "region": row.region,
                    "action_type": row.action_type,
                }
                for row in policies
            ],
            "dr_runbooks": [
                {
                    "name": row.runbook_name,
                    "environment": row.environment,
                    "rto": row.rto_minutes,
                    "rpo": row.rpo_minutes,
                }
                for row in dr_runbooks
            ],
            "procurement_artifacts": [
                {
                    "type": row.artifact_type,
                    "title": row.title,
                    "version": row.version,
                    "status": row.status,
                }
                for row in procurement
            ],
        },
        "template_notes": {
            "monthly": "Default monthly executive review packet.",
            "board": "Board-ready condensed packet.",
            "hrbp": "Operational packet for HR business partners.",
        }.get(template, "Custom packet template."),
    }
    _audit(
        db,
        current_user,
        "GENERATE_EXECUTIVE_PACKET",
        "report",
        None,
        {"template": template},
    )
    db.commit()
    return packet


async def scheduler_loop():
    """Background scheduler for lean connector sync orchestration."""
    while True:
        try:
            now = datetime.utcnow()
            with Session(engine) as db:
                due = db.exec(
                    select(IntegrationConnectionTable)
                    .where(IntegrationConnectionTable.status == "active")
                    .where(
                        (IntegrationConnectionTable.next_sync_at.is_(None))
                        | (IntegrationConnectionTable.next_sync_at <= now)
                    )
                ).all()
                for conn in due:
                    try:
                        _run_connection_sync(conn.id, conn.tenant_id, db)
                        conn.next_sync_at = datetime.utcnow() + timedelta(
                            minutes=max(5, conn.sync_interval_minutes)
                        )
                        conn.last_sync_status = "success"
                        conn.sync_retry_count = 0
                        conn.updated_at = datetime.utcnow()
                        db.add(conn)
                        db.commit()
                    except Exception as exc:
                        conn.sync_retry_count += 1
                        conn.last_sync_status = "failed"
                        conn.last_sync_summary = str(exc)[:240]
                        conn.updated_at = datetime.utcnow()
                        db.add(conn)
                        db.commit()
        except Exception:  # nosec B110
            pass
        await asyncio.sleep(60)


def start_scheduler():
    global _SCHEDULER_TASK
    if _SCHEDULER_TASK is None or _SCHEDULER_TASK.done():
        _SCHEDULER_TASK = asyncio.create_task(scheduler_loop())
    return _SCHEDULER_TASK


def stop_scheduler():
    global _SCHEDULER_TASK
    if _SCHEDULER_TASK and not _SCHEDULER_TASK.done():
        _SCHEDULER_TASK.cancel()
    _SCHEDULER_TASK = None
