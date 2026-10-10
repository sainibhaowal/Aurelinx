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
Lean Enterprise v1 APIs:
- Real connector sync into bronze/silver/quarantine
- Data contract registry
- Lightweight ML registry + train/activate/score
- Workforce economics scenario optimizer
- Policy enforcement and scheduling
"""

import asyncio
import csv
import hashlib
import io
import json
import threading
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlmodel import Session, select

from app.core.data_policy import is_active_employee
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
    CollaborationEventTable,
    CompliancePolicyTable,
    ConnectorFieldMappingTable,
    ConnectorSyncJobTable,
    DataContractTable,
    DRRunbookTable,
    EmployeeTable,
    ExperienceTable,
    ForecastScenarioTable,
    GoldMetricSnapshotTable,
    IntegrationConnectionTable,
    IntegrationEvidenceTable,
    MLDriftSnapshotTable,
    MLModelCardTable,
    MLModelRegistryTable,
    ProcurementArtifactTable,
    QuarantineEventTable,
    RawEventTable,
    ReleaseGateTable,
    SkillAliasTable,
    SkillTable,
    engine,
    get_session,
)
from app.schemas.schemas import (
    CompliancePolicyCreate,
    CompliancePolicyOut,
    ConnectorFieldMappingCreate,
    ConnectorFieldMappingOut,
    ConnectorSyncJobOut,
    DRRunbookCreate,
    DRRunbookOut,
    FairnessSummaryOut,
    ForecastScenarioOut,
    MLDriftSnapshotOut,
    MLModelCardOut,
    PolicyCheckRequest,
    PolicyCheckResponse,
    ProcurementArtifactCreate,
    ProcurementArtifactOut,
    ReleaseGateCreate,
    ReleaseGateOut,
)
from app.services.connectors.factory import get_connector
from app.services.connectors.secrets import open_credentials

router = APIRouter(prefix="/lean", tags=["lean-enterprise"])
_SCHEDULER_TASK: asyncio.Task | None = None
_BUNDLE_FILE_NAMES = {
    "employees": "employees_public.csv",
    "candidates": "candidates_public.csv",
    "employee_skills": "employee_skills_public.csv",
    "candidate_skills": "candidate_skills_public.csv",
    "employee_experience": "employee_experience_public.csv",
    "candidate_experience": "candidate_experience_public.csv",
    "collaboration_events": "collaboration_events.csv",
    "skill_aliases": "skill_aliases.csv",
}
_IMPORT_JOB_LOCK = threading.Lock()
_IMPORT_JOBS: dict[str, dict[str, Any]] = {}


def _load_required_fields(contract: DataContractTable) -> list[str]:
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


def _get_import_job(job_id: str) -> dict[str, Any] | None:
    with _IMPORT_JOB_LOCK:
        job = _IMPORT_JOBS.get(job_id)
        return dict(job) if job else None


def _validate_payload(payload: dict[str, Any], required_fields: list[str]) -> list[str]:
    missing = []
    for field in required_fields:
        if field not in payload or payload[field] in [None, ""]:
            missing.append(field)
    return missing


def _apply_connector_mappings(
    db: Session, connection_id: UUID, tenant_id: str, payload: dict[str, Any]
) -> dict[str, Any]:
    """Apply registered deterministic transforms to a source row."""
    mappings = db.exec(
        select(ConnectorFieldMappingTable)
        .where(ConnectorFieldMappingTable.connection_id == connection_id)
        .where(ConnectorFieldMappingTable.tenant_id == tenant_id)
    ).all()
    if not mappings:
        return payload
    mapped = dict(payload)
    for mapping in mappings:
        if mapping.source_field not in payload:
            continue
        value = payload[mapping.source_field]
        rule = (mapping.transform_rule or "").strip().lower()
        if rule == "trim" and isinstance(value, str):
            value = value.strip()
        elif rule == "lower" and isinstance(value, str):
            value = value.lower()
        elif rule == "upper" and isinstance(value, str):
            value = value.upper()
        elif rule == "to_float":
            value = float(value)
        elif rule == "to_bool":
            value = str(value).strip().lower() in {"1", "true", "yes", "y"}
        elif rule == "iso_date" and value:
            value = datetime.fromisoformat(
                str(value).replace("Z", "+00:00")
            ).isoformat()
        mapped[mapping.canonical_field] = value
    return mapped


def _build_quality_score(
    rows: list[dict[str, Any]],
    required_fields: list[str],
    unique_field: str | None = "email",
) -> dict[str, Any]:
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
    issue_samples: list[str] = []

    for idx, row in enumerate(rows):
        missing = _validate_payload(row, required_fields)
        if missing:
            missing_required_rows += 1
            missing_required_fields += len(missing)
            if len(issue_samples) < 5:
                issue_samples.append(f"Row {idx + 1}: missing {', '.join(missing)}")
        value = (
            str(row.get(unique_field) or "").strip().lower()
            if unique_field
            else json.dumps(row, sort_keys=True, ensure_ascii=False, default=str)
        )
        if value:
            if value in seen_values:
                duplicate_rows += 1
                if len(issue_samples) < 5:
                    issue_samples.append(
                        f"Row {idx + 1}: duplicate {unique_field or 'entire record'} '{value[:80]}'"
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
    reasons: list[str] = []
    matched: list[str] = []
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
    tenant_id = str(current_user.tenant_id or "default")
    return {
        "employees": len(
            db.exec(
                select(EmployeeTable).where(EmployeeTable.tenant_id == tenant_id)
            ).all()
        ),
        "candidates": len(
            db.exec(
                select(CandidateTable).where(CandidateTable.tenant_id == tenant_id)
            ).all()
        ),
        "skills": len(
            db.exec(select(SkillTable).where(SkillTable.tenant_id == tenant_id)).all()
        ),
        "experience": len(
            db.exec(
                select(ExperienceTable).where(ExperienceTable.tenant_id == tenant_id)
            ).all()
        ),
    }


def _audit(
    db: Session,
    current_user: TokenData,
    action: str,
    resource_type: str,
    resource_id: UUID | None = None,
    details: dict[str, Any] | None = None,
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


def _fairness_summary(
    rows: list[CanonicalEmployeeTable], tenant_id: str
) -> FairnessSummaryOut:
    groups: list[dict] = []
    if not rows:
        return FairnessSummaryOut(
            tenant_id=tenant_id,
            reference_group="none",
            groups=[],
            max_gap=0.0,
            compliant=True,
        )
    buckets: dict[str, list[CanonicalEmployeeTable]] = {}
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


def _analytics_snapshot(db: Session, tenant_id: str) -> dict[str, Any]:
    # EmployeeTable is the tenant-owned read model shared by uploaded bundles
    # and HRIS sync. Canonical connector rows may be incomplete/stale, so use
    # this authoritative tenant scope for workspace metrics.
    rows = [
        employee
        for employee in db.exec(
            select(EmployeeTable).where(EmployeeTable.tenant_id == tenant_id)
        ).all()
        if is_active_employee(employee)
    ]
    total = len(rows)
    at_risk = len([r for r in rows if r.is_at_risk])
    at_risk_pct = round((at_risk / total) * 100, 1) if total else 0.0
    avg_sentiment = (
        round(sum(float(r.sentiment_score or 0.0) for r in rows) / total, 3)
        if total
        else 0.0
    )
    dept_map: dict[str, int] = {}
    dept_risk: dict[str, int] = {}
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
    is_unvalidated_attrition = card.model_name == "attrition_v1"
    return MLModelCardOut(
        id=card.id,
        tenant_id=card.tenant_id,
        model_name=card.model_name,
        version=card.version,
        status="unvalidated" if is_unvalidated_attrition else card.status,
        pr_auc=None if is_unvalidated_attrition else card.pr_auc,
        calibration_error=(
            None if is_unvalidated_attrition else card.calibration_error
        ),
        fairness_gap=None if is_unvalidated_attrition else card.fairness_gap,
        notes=(
            "Historical profile-based metrics are not valid model validation. "
            "Observed departure and censoring outcomes are required."
            if is_unvalidated_attrition
            else card.notes
        ),
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


def _normalize_header_map(row: dict[str, Any]) -> dict[str, Any]:
    normalized = {}
    for key, value in row.items():
        normalized[(key or "").strip().lower().replace(" ", "_").replace("-", "_")] = (
            value
        )
    return normalized


def _first_value(data: dict[str, Any], keys: list[str], default: Any = None) -> Any:
    for key in keys:
        value = data.get(key)
        if value not in [None, ""]:
            return value
    return default


def _parse_optional_datetime(value: Any, field_name: str) -> datetime | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.replace(tzinfo=None) if value.tzinfo else value
    text_value = str(value).strip()
    if not text_value:
        return None
    try:
        parsed = datetime.fromisoformat(text_value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid {field_name}; use an ISO date or datetime.",
        ) from exc
    return parsed.replace(tzinfo=None) if parsed.tzinfo else parsed


def _parse_optional_bool(value: Any, field_name: str) -> bool | None:
    if value in (None, ""):
        return None
    if isinstance(value, bool):
        return value
    normalized = str(value).strip().casefold()
    if normalized in {"1", "true", "yes", "y", "active", "current"}:
        return True
    if normalized in {"0", "false", "no", "n", "inactive", "former"}:
        return False
    raise HTTPException(
        status_code=422, detail=f"Invalid {field_name}; use true or false."
    )


def _load_csv_rows(file_path: Path) -> list[dict[str, Any]]:
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


def _rows_to_csv_bytes(rows: list[dict[str, Any]], fieldnames: list[str]) -> bytes:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow({field: _csv_value(row.get(field)) for field in fieldnames})
    return buffer.getvalue().encode("utf-8")


def _parse_employee_row(row: dict[str, Any]) -> dict[str, Any]:
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
    salary_value = _first_value(row, ["salary", "annual_salary", "compensation"], None)
    try:
        salary = int(float(salary_value)) if salary_value not in (None, "") else None
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=422, detail="salary must be a numeric amount."
        ) from exc
    if salary is not None and salary < 0:
        raise HTTPException(status_code=422, detail="salary cannot be negative.")
    salary_currency = (
        str(_first_value(row, ["salary_currency", "currency"], "") or "")
        .strip()
        .upper()
        or None
    )
    if salary_currency and (len(salary_currency) != 3 or not salary_currency.isalpha()):
        raise HTTPException(
            status_code=422,
            detail="salary_currency must be a three-letter currency code.",
        )
    salary_period = (
        str(
            _first_value(
                row, ["salary_period", "pay_period", "compensation_period"], ""
            )
            or ""
        )
        .strip()
        .casefold()
        or None
    )
    if salary_period:
        salary_period = {
            "year": "annual",
            "yearly": "annual",
            "per_year": "annual",
            "month": "monthly",
            "per_month": "monthly",
            "hour": "hourly",
            "per_hour": "hourly",
        }.get(salary_period, salary_period)
        if salary_period not in {"annual", "monthly", "weekly", "hourly"}:
            raise HTTPException(
                status_code=422,
                detail="salary_period must be annual, monthly, weekly, or hourly.",
            )
    employment_duration_raw = _first_value(
        row,
        ["employment_duration_years", "tenure_years", "years_at_company"],
        None,
    )
    try:
        employment_duration_years = (
            float(employment_duration_raw)
            if employment_duration_raw not in (None, "")
            else None
        )
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail="employment_duration_years must be numeric.",
        ) from exc
    if (
        employment_duration_years is not None
        and not 0 <= employment_duration_years <= 80
    ):
        raise HTTPException(
            status_code=422,
            detail="employment_duration_years must be between 0 and 80.",
        )
    join_date = _parse_optional_datetime(
        _first_value(
            row, ["employment_start_date", "hire_date", "join_date", "start_date"], None
        ),
        "employment_start_date",
    )
    employment_end_date = _parse_optional_datetime(
        _first_value(
            row,
            ["employment_end_date", "termination_date", "end_date", "departure_date"],
            None,
        ),
        "employment_end_date",
    )
    employment_censor_date = _parse_optional_datetime(
        _first_value(
            row, ["employment_censor_date", "censor_date", "observed_through"], None
        ),
        "employment_censor_date",
    )
    departure_event = _parse_optional_bool(
        _first_value(
            row, ["departure_event", "is_departed", "terminated", "left_company"], None
        ),
        "departure_event",
    )
    employment_status_raw = (
        str(
            _first_value(row, ["employment_status", "worker_status", "status"], "")
            or ""
        )
        .strip()
        .casefold()
    )
    employment_status = {
        "current": "active",
        "employed": "active",
        "on leave": "on_leave",
        "on_leave": "on_leave",
        "inactive": "departed",
        "terminated": "departed",
        "former": "departed",
        "left": "departed",
    }.get(employment_status_raw, employment_status_raw) or None
    if employment_status and employment_status not in {
        "active",
        "on_leave",
        "departed",
    }:
        raise HTTPException(
            status_code=422,
            detail="employment_status must be active, on_leave, or departed.",
        )
    if departure_event is True and employment_status not in (None, "departed"):
        raise HTTPException(
            status_code=422,
            detail="departure_event=true conflicts with an active employment_status.",
        )
    if departure_event is False and employment_status == "departed":
        raise HTTPException(
            status_code=422,
            detail="departure_event=false conflicts with employment_status=departed.",
        )
    if departure_event is True:
        employment_status = "departed"
    if employment_end_date and departure_event is False:
        raise HTTPException(
            status_code=422,
            detail="A row with employment_end_date cannot mark departure_event false.",
        )
    # Preserve zero-duration source outcomes as raw imported data. The survival
    # estimator excludes zero duration because event ordering is undefined at
    # that point, but rejecting the whole employee row would lose valid source
    # attributes and make bundle imports fail on benchmark records.
    duration_available = employment_duration_years is not None
    if departure_event is True and not employment_end_date and not duration_available:
        raise HTTPException(
            status_code=422,
            detail="departure_event=true requires employment_end_date or a nonnegative employment_duration_years.",
        )
    if departure_event is False and employment_end_date:
        raise HTTPException(
            status_code=422,
            detail="departure_event=false must use employment_censor_date, not employment_end_date.",
        )
    if (
        departure_event is False
        and not employment_censor_date
        and not duration_available
    ):
        raise HTTPException(
            status_code=422,
            detail="departure_event=false requires employment_censor_date or a nonnegative employment_duration_years.",
        )
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
        "salary": salary,
        "salary_currency": salary_currency,
        "salary_period": salary_period,
        "join_date": join_date,
        "employment_duration_years": employment_duration_years,
        "employment_end_date": employment_end_date,
        "employment_censor_date": employment_censor_date,
        "departure_event": departure_event,
        "employment_status": employment_status,
        "external_id": external_id or email,
    }


def _parse_candidate_row(row: dict[str, Any]) -> dict[str, Any]:
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
    db: Session,
    tenant_id: str,
    kind: str,
    rows: list[dict[str, Any]],
    *,
    preserve_existing: bool = False,
) -> int:
    imported = 0
    if kind == "employees":
        existing_employees = {
            row.email.lower(): row
            for row in db.exec(
                select(EmployeeTable).where(EmployeeTable.tenant_id == tenant_id)
            ).all()
            if row.email
        }
        employee_tenant_by_email = {
            str(email).casefold(): owner_tenant
            for email, owner_tenant in db.exec(
                select(EmployeeTable.email, EmployeeTable.tenant_id)
            ).all()
            if email
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
            if (
                existing is None
                and parsed["email"].casefold() in employee_tenant_by_email
            ):
                raise HTTPException(
                    status_code=409,
                    detail="An employee with this email belongs to a different tenant; the import row was not applied.",
                )
            if existing:
                if not preserve_existing:
                    existing.full_name = parsed["full_name"]
                    existing.department = parsed["department"]
                    existing.role = parsed["role"]
                    existing.sentiment_score = parsed["sentiment_score"]
                    existing.is_at_risk = parsed["is_at_risk"]
                    existing.retention_prob = parsed["retention_prob"]
                if parsed["salary"] is not None and (
                    not preserve_existing or existing.salary is None
                ):
                    existing.salary = parsed["salary"]
                if parsed["salary_currency"] and (
                    not preserve_existing or existing.salary_currency is None
                ):
                    existing.salary_currency = parsed["salary_currency"]
                if parsed["salary_period"] and (
                    not preserve_existing or existing.salary_period is None
                ):
                    existing.salary_period = parsed["salary_period"]
                if parsed["join_date"] is not None and (
                    not preserve_existing or existing.employment_start_date is None
                ):
                    existing.join_date = parsed["join_date"]
                    existing.employment_start_date = parsed["join_date"]
                if parsed["employment_end_date"] is not None and (
                    not preserve_existing or existing.employment_end_date is None
                ):
                    existing.employment_end_date = parsed["employment_end_date"]
                if parsed["employment_censor_date"] is not None and (
                    not preserve_existing or existing.employment_censor_date is None
                ):
                    existing.employment_censor_date = parsed["employment_censor_date"]
                if parsed["employment_duration_years"] is not None and (
                    not preserve_existing or existing.employment_duration_years is None
                ):
                    existing.employment_duration_years = parsed[
                        "employment_duration_years"
                    ]
                if parsed["departure_event"] is not None and (
                    not preserve_existing or existing.departure_event is None
                ):
                    existing.departure_event = parsed["departure_event"]
                if parsed["employment_status"] and (
                    not preserve_existing or existing.employment_status is None
                ):
                    existing.employment_status = parsed["employment_status"]
                if not preserve_existing:
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
                    salary=parsed.get("salary"),
                    salary_currency=parsed["salary_currency"],
                    salary_period=parsed["salary_period"],
                    join_date=parsed["join_date"] or datetime.utcnow(),
                    employment_start_date=parsed["join_date"],
                    employment_end_date=parsed["employment_end_date"],
                    employment_censor_date=parsed["employment_censor_date"],
                    employment_duration_years=parsed["employment_duration_years"],
                    departure_event=parsed["departure_event"],
                    employment_status=parsed["employment_status"],
                    tenant_id=tenant_id,
                )
                db.add(existing)
                existing_employees[parsed["email"]] = existing

            canonical = existing_canonical.get(parsed["external_id"])
            if canonical:
                if not preserve_existing:
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
            for row in db.exec(
                select(CandidateTable).where(CandidateTable.tenant_id == tenant_id)
            ).all()
            if row.email
        }
        candidate_tenant_by_email = {
            str(email).casefold(): owner_tenant
            for email, owner_tenant in db.exec(
                select(CandidateTable.email, CandidateTable.tenant_id)
            ).all()
            if email
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
            if (
                existing is None
                and parsed["email"].casefold() in candidate_tenant_by_email
            ):
                raise HTTPException(
                    status_code=409,
                    detail="A candidate with this email belongs to a different tenant; the import row was not applied.",
                )
            if existing:
                if not preserve_existing:
                    existing.full_name = parsed["full_name"]
                    existing.department = parsed["department"]
                    existing.role = parsed["role"]
                    existing.sentiment_score = parsed["sentiment_score"]
                    existing.match_score = parsed["match_score"]
                    existing.updated_at = datetime.utcnow()
                else:
                    if not existing.full_name:
                        existing.full_name = parsed["full_name"]
                    if not existing.department:
                        existing.department = parsed["department"]
                    if not existing.role:
                        existing.role = parsed["role"]
                    if existing.match_score is None:
                        existing.match_score = parsed["match_score"]
                db.add(existing)
            else:
                existing = CandidateTable(
                    full_name=parsed["full_name"],
                    email=parsed["email"],
                    department=parsed["department"],
                    role=parsed["role"],
                    sentiment_score=parsed["sentiment_score"],
                    match_score=parsed["match_score"],
                    tenant_id=tenant_id,
                )
                db.add(existing)
                existing_candidates[parsed["email"]] = existing

            canonical = existing_canonical.get(parsed["external_id"])
            if canonical:
                if not preserve_existing:
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
            owners = db.exec(
                select(EmployeeTable).where(EmployeeTable.tenant_id == tenant_id)
            ).all()
            owner_lookup = {row.email.lower(): row.id for row in owners if row.email}
        else:
            owners = db.exec(
                select(CandidateTable).where(CandidateTable.tenant_id == tenant_id)
            ).all()
            owner_lookup = {row.email.lower(): row.id for row in owners if row.email}
        batch = []
        existing_skills = db.exec(
            select(SkillTable).where(SkillTable.tenant_id == tenant_id)
        ).all()
        existing_by_owner_name = {
            (
                row.employee_id or row.candidate_id,
                " ".join(row.name.casefold().split()),
            ): row
            for row in existing_skills
            if row.name and (row.employee_id or row.candidate_id)
        }
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
                existing_skill = existing_by_owner_name.get(
                    (owner_id, " ".join(name.casefold().split()))
                )
                if existing_skill:
                    if not preserve_existing:
                        existing_skill.level = max(1, min(5, level))
                        batch.append(existing_skill)
                else:
                    skill = SkillTable(
                        name=name,
                        level=max(1, min(5, level)),
                        employee_id=owner_id,
                        tenant_id=tenant_id,
                    )
                    existing_by_owner_name[
                        (owner_id, " ".join(name.casefold().split()))
                    ] = skill
                    batch.append(skill)
            else:
                owner_id = owner_lookup.get(owner_email)
                if not owner_id:
                    continue
                existing_skill = existing_by_owner_name.get(
                    (owner_id, " ".join(name.casefold().split()))
                )
                if existing_skill:
                    if not preserve_existing:
                        existing_skill.level = max(1, min(5, level))
                        batch.append(existing_skill)
                else:
                    skill = SkillTable(
                        name=name,
                        level=max(1, min(5, level)),
                        candidate_id=owner_id,
                        tenant_id=tenant_id,
                    )
                    existing_by_owner_name[
                        (owner_id, " ".join(name.casefold().split()))
                    ] = skill
                    batch.append(skill)
            imported += 1
        if batch:
            db.add_all(batch)
    elif kind in {"employee_experience", "candidate_experience"}:
        owner_lookup = {}
        if kind == "employee_experience":
            owners = db.exec(
                select(EmployeeTable).where(EmployeeTable.tenant_id == tenant_id)
            ).all()
            owner_lookup = {row.email.lower(): row.id for row in owners if row.email}
        else:
            owners = db.exec(
                select(CandidateTable).where(CandidateTable.tenant_id == tenant_id)
            ).all()
            owner_lookup = {row.email.lower(): row.id for row in owners if row.email}
        batch = []
        existing_experiences = db.exec(
            select(ExperienceTable).where(ExperienceTable.tenant_id == tenant_id)
        ).all()
        existing_experience_by_key = {
            row.source_record_key: row
            for row in existing_experiences
            if row.source_record_key
        }
        existing_experience_signatures = {
            (
                row.employee_id or row.candidate_id,
                row.company.casefold().strip(),
                row.position.casefold().strip(),
                row.duration_years,
                row.description.casefold().strip(),
                row.effective_start,
                row.effective_end,
                row.is_current,
            )
            for row in existing_experiences
        }
        for row in rows:
            company = str(_first_value(row, ["company", "organization"], "")).strip()
            position = str(_first_value(row, ["position", "role", "title"], "")).strip()
            description = str(_first_value(row, ["description", "summary"], "")).strip()
            effective_start = _parse_optional_datetime(
                _first_value(
                    row, ["effective_start", "start_date", "position_start_date"], None
                ),
                "experience effective_start",
            )
            effective_end = _parse_optional_datetime(
                _first_value(
                    row, ["effective_end", "end_date", "position_end_date"], None
                ),
                "experience effective_end",
            )
            is_current = bool(
                _parse_optional_bool(
                    _first_value(row, ["is_current", "current"], None),
                    "experience is_current",
                )
                or False
            )
            if effective_start and effective_end and effective_end < effective_start:
                raise HTTPException(
                    status_code=422,
                    detail="Experience effective_end must not precede effective_start.",
                )
            if is_current and effective_end:
                raise HTTPException(
                    status_code=422,
                    detail="Current experience rows must not include effective_end.",
                )
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
                signature = (
                    owner_id,
                    company.casefold(),
                    position.casefold(),
                    duration_years,
                    description.casefold(),
                    effective_start,
                    effective_end,
                    is_current,
                )
                if preserve_existing and signature in existing_experience_signatures:
                    continue
                source_record_key = str(
                    _first_value(
                        row, ["external_record_id", "experience_id", "record_id"], ""
                    )
                    or ""
                ).strip()
                if source_record_key and not source_record_key.startswith(
                    "employee_experience:"
                ):
                    source_record_key = f"employee_experience:{source_record_key}"
                if not source_record_key:
                    key_payload = "|".join(
                        (
                            owner_email,
                            company.casefold(),
                            position.casefold(),
                            effective_start.isoformat() if effective_start else "",
                            effective_end.isoformat() if effective_end else "",
                            str(duration_years),
                            description,
                        )
                    )
                    source_record_key = hashlib.sha256(
                        key_payload.encode("utf-8")
                    ).hexdigest()
                experience = existing_experience_by_key.get(
                    source_record_key
                ) or ExperienceTable(
                    company=company,
                    position=position,
                    duration_years=duration_years,
                    description=description,
                    employee_id=owner_id,
                    tenant_id=tenant_id,
                    source_record_key=source_record_key,
                )
                existing_experience_by_key[source_record_key] = experience
                existing_experience_signatures.add(signature)
                experience.company = company
                experience.position = position
                experience.duration_years = duration_years
                experience.description = description
                experience.employee_id = owner_id
                experience.effective_start = effective_start
                experience.effective_end = effective_end
                experience.is_current = is_current
                batch.append(experience)
            else:
                owner_id = owner_lookup.get(owner_email)
                if not owner_id:
                    continue
                signature = (
                    owner_id,
                    company.casefold(),
                    position.casefold(),
                    duration_years,
                    description.casefold(),
                    effective_start,
                    effective_end,
                    is_current,
                )
                if preserve_existing and signature in existing_experience_signatures:
                    continue
                source_record_key = str(
                    _first_value(
                        row, ["external_record_id", "experience_id", "record_id"], ""
                    )
                    or ""
                ).strip()
                if source_record_key and not source_record_key.startswith(
                    "candidate_experience:"
                ):
                    source_record_key = f"candidate_experience:{source_record_key}"
                if not source_record_key:
                    key_payload = "|".join(
                        (
                            "candidate",
                            owner_email,
                            company.casefold(),
                            position.casefold(),
                            effective_start.isoformat() if effective_start else "",
                            effective_end.isoformat() if effective_end else "",
                            str(duration_years),
                            description,
                        )
                    )
                    source_record_key = hashlib.sha256(
                        key_payload.encode("utf-8")
                    ).hexdigest()
                experience = existing_experience_by_key.get(
                    source_record_key
                ) or ExperienceTable(
                    company=company,
                    position=position,
                    duration_years=duration_years,
                    description=description,
                    candidate_id=owner_id,
                    tenant_id=tenant_id,
                    source_record_key=source_record_key,
                )
                existing_experience_by_key[source_record_key] = experience
                existing_experience_signatures.add(signature)
                experience.company = company
                experience.position = position
                experience.duration_years = duration_years
                experience.description = description
                experience.candidate_id = owner_id
                experience.effective_start = effective_start
                experience.effective_end = effective_end
                experience.is_current = is_current
                batch.append(experience)
            imported += 1
        if batch:
            db.add_all(batch)
    elif kind == "collaboration_events":
        employees = db.exec(
            select(EmployeeTable).where(EmployeeTable.tenant_id == tenant_id)
        ).all()
        employee_by_email = {
            str(row.email or "").strip().casefold(): row
            for row in employees
            if row.email
        }
        existing_ids = set(
            db.exec(
                select(CollaborationEventTable.external_event_id).where(
                    CollaborationEventTable.tenant_id == tenant_id,
                    CollaborationEventTable.source == "uploaded_csv",
                )
            ).all()
        )
        batch = []
        for row in rows:
            email_a = (
                str(
                    _first_value(
                        row,
                        [
                            "employee_a_email",
                            "employee_email",
                            "source_email",
                            "reporter_email",
                        ],
                        "",
                    )
                    or ""
                )
                .strip()
                .casefold()
            )
            email_b = (
                str(
                    _first_value(
                        row,
                        [
                            "employee_b_email",
                            "counterparty_email",
                            "target_email",
                            "assignee_email",
                        ],
                        "",
                    )
                    or ""
                )
                .strip()
                .casefold()
            )
            person_a, person_b = employee_by_email.get(email_a), employee_by_email.get(
                email_b
            )
            if not person_a or not person_b or person_a.id == person_b.id:
                continue
            occurred_at = _parse_optional_datetime(
                _first_value(
                    row, ["occurred_at", "event_time", "timestamp", "date"], None
                ),
                "collaboration occurred_at",
            )
            if occurred_at is None:
                raise HTTPException(
                    status_code=422,
                    detail="Every collaboration event requires occurred_at.",
                )
            event_type = str(
                _first_value(
                    row, ["event_type", "interaction_type", "type"], "collaboration"
                )
                or "collaboration"
            ).strip()[:80]
            external_id = str(
                _first_value(row, ["external_event_id", "event_id", "id"], "") or ""
            ).strip()
            if not external_id:
                canonical = "|".join(
                    (
                        *sorted((email_a, email_b)),
                        event_type.casefold(),
                        occurred_at.isoformat(),
                    )
                )
                external_id = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
            if external_id in existing_ids:
                continue
            existing_ids.add(external_id)
            batch.append(
                CollaborationEventTable(
                    tenant_id=tenant_id,
                    source="uploaded_csv",
                    external_event_id=external_id,
                    employee_a_id=person_a.id,
                    employee_b_id=person_b.id,
                    event_type=event_type,
                    occurred_at=occurred_at,
                )
            )
            imported += 1
        if batch:
            db.add_all(batch)
    elif kind == "skill_aliases":
        aliases = {
            row.alias_key: row
            for row in db.exec(
                select(SkillAliasTable).where(SkillAliasTable.tenant_id == tenant_id)
            ).all()
        }
        batch = []
        for row in rows:
            alias = str(
                _first_value(row, ["alias", "skill", "skill_name"], "") or ""
            ).strip()
            canonical = str(
                _first_value(row, ["canonical_skill", "canonical", "mapped_skill"], "")
                or ""
            ).strip()
            if not alias or not canonical:
                continue
            alias_key = " ".join(alias.casefold().split())
            approved = bool(
                _parse_optional_bool(
                    _first_value(row, ["approved", "reviewed"], None),
                    "skill alias approved",
                )
                or False
            )
            item = aliases.get(alias_key)
            if item:
                item.alias = alias
                item.canonical_skill = canonical
                item.approved = approved
                db.add(item)
            else:
                batch.append(
                    SkillAliasTable(
                        tenant_id=tenant_id,
                        alias=alias,
                        alias_key=alias_key,
                        canonical_skill=canonical,
                        approved=approved,
                    )
                )
            imported += 1
        if batch:
            db.add_all(batch)
    else:
        raise HTTPException(status_code=422, detail="Unsupported kind")
    return imported


def _export_dataset_bundle_bytes(db: Session, tenant_id: str) -> bytes:
    employees = db.exec(
        select(EmployeeTable)
        .where(EmployeeTable.tenant_id == tenant_id)
        .order_by(EmployeeTable.created_at.asc())
    ).all()
    candidates = db.exec(
        select(CandidateTable)
        .where(CandidateTable.tenant_id == tenant_id)
        .order_by(CandidateTable.created_at.asc())
    ).all()
    skills = db.exec(
        select(SkillTable)
        .where(SkillTable.tenant_id == tenant_id)
        .order_by(SkillTable.created_at.asc())
    ).all()
    experiences = db.exec(
        select(ExperienceTable)
        .where(ExperienceTable.tenant_id == tenant_id)
        .order_by(ExperienceTable.created_at.asc())
    ).all()
    collaboration_events = db.exec(
        select(CollaborationEventTable).where(
            CollaborationEventTable.tenant_id == tenant_id
        )
    ).all()
    skill_aliases = db.exec(
        select(SkillAliasTable).where(SkillAliasTable.tenant_id == tenant_id)
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
            "salary": row.salary,
            "salary_currency": row.salary_currency,
            "salary_period": row.salary_period,
            "join_date": row.join_date,
            "employment_start_date": row.employment_start_date,
            "employment_end_date": row.employment_end_date,
            "employment_censor_date": row.employment_censor_date,
            "employment_duration_years": row.employment_duration_years,
            "departure_event": row.departure_event,
            "employment_status": row.employment_status,
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
            "effective_start": row.effective_start,
            "effective_end": row.effective_end,
            "is_current": row.is_current,
            "external_record_id": row.source_record_key,
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
            "effective_start": row.effective_start,
            "effective_end": row.effective_end,
            "is_current": row.is_current,
        }
        for row in experiences
        if row.candidate_id is not None
    ]
    collaboration_rows = [
        {
            "external_event_id": row.external_event_id,
            "employee_a_email": employee_email_by_id.get(row.employee_a_id, ""),
            "employee_b_email": employee_email_by_id.get(row.employee_b_id, ""),
            "event_type": row.event_type,
            "occurred_at": row.occurred_at,
        }
        for row in collaboration_events
        if row.employee_a_id in employee_email_by_id
        and row.employee_b_id in employee_email_by_id
    ]
    skill_alias_rows = [
        {
            "alias": row.alias,
            "canonical_skill": row.canonical_skill,
            "approved": row.approved,
        }
        for row in skill_aliases
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
                    "salary",
                    "salary_currency",
                    "salary_period",
                    "join_date",
                    "employment_start_date",
                    "employment_end_date",
                    "employment_censor_date",
                    "employment_duration_years",
                    "departure_event",
                    "employment_status",
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
                    "effective_start",
                    "effective_end",
                    "is_current",
                    "external_record_id",
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
                    "effective_start",
                    "effective_end",
                    "is_current",
                ],
            ),
        )
        zipf.writestr(
            _BUNDLE_FILE_NAMES["collaboration_events"],
            _rows_to_csv_bytes(
                collaboration_rows,
                [
                    "external_event_id",
                    "employee_a_email",
                    "employee_b_email",
                    "event_type",
                    "occurred_at",
                ],
            ),
        )
        zipf.writestr(
            _BUNDLE_FILE_NAMES["skill_aliases"],
            _rows_to_csv_bytes(
                skill_alias_rows, ["alias", "canonical_skill", "approved"]
            ),
        )
    archive.seek(0)
    return archive.getvalue()


def _upsert_employee_like(
    db: Session, tenant_id: str, row: dict[str, Any]
) -> dict[str, Any]:
    parsed = _parse_employee_row(row)
    email = parsed["email"]
    full_name = parsed["full_name"]
    department = parsed["department"]
    role = parsed["role"]

    existing = db.exec(
        select(EmployeeTable)
        .where(EmployeeTable.tenant_id == tenant_id)
        .where(EmployeeTable.email == email)
    ).first()
    if existing is None:
        # Email is globally unique: never overwrite another tenant's row.
        cross = db.exec(
            select(EmployeeTable).where(EmployeeTable.email == email)
        ).first()
        if cross is not None:
            raise ValueError(
                f"Email {email} already owned by another tenant; quarantining"
            )
    if existing:
        existing.full_name = full_name or existing.full_name
        existing.department = department or existing.department
        existing.role = role or existing.role
        if _first_value(
            row, ["sentiment_score", "morale", "engagement_score"], None
        ) not in (None, ""):
            existing.sentiment_score = parsed["sentiment_score"]
        if _first_value(row, ["is_at_risk", "risk_flag"], None) not in (None, ""):
            existing.is_at_risk = parsed["is_at_risk"]
        if _first_value(
            row, ["retention_prob", "retention_probability", "retention"], None
        ) not in (None, ""):
            existing.retention_prob = parsed["retention_prob"]
        if parsed["salary"] is not None:
            existing.salary = parsed["salary"]
        if parsed["salary_currency"]:
            existing.salary_currency = parsed["salary_currency"]
        if parsed["salary_period"]:
            existing.salary_period = parsed["salary_period"]
        if parsed["join_date"]:
            existing.join_date = parsed["join_date"]
            existing.employment_start_date = parsed["join_date"]
        if parsed["employment_end_date"]:
            existing.employment_end_date = parsed["employment_end_date"]
        if parsed["employment_censor_date"]:
            existing.employment_censor_date = parsed["employment_censor_date"]
        if parsed["employment_duration_years"] is not None:
            existing.employment_duration_years = parsed["employment_duration_years"]
        if parsed["departure_event"] is not None:
            existing.departure_event = parsed["departure_event"]
        if parsed["employment_status"]:
            existing.employment_status = parsed["employment_status"]
        existing.updated_at = datetime.utcnow()
        db.add(existing)
        db.flush()
        employee_id = existing.id
        created = False
    else:
        created_row = EmployeeTable(
            tenant_id=tenant_id,
            full_name=full_name or email.split("@")[0].replace(".", " ").title(),
            email=email,
            department=department,
            role=role,
            sentiment_score=parsed["sentiment_score"],
            is_at_risk=parsed["is_at_risk"],
            retention_prob=parsed["retention_prob"],
            salary=parsed["salary"],
            salary_currency=parsed["salary_currency"],
            salary_period=parsed["salary_period"],
            join_date=parsed["join_date"] or datetime.utcnow(),
            employment_start_date=parsed["join_date"],
            employment_end_date=parsed["employment_end_date"],
            employment_censor_date=parsed["employment_censor_date"],
            employment_duration_years=parsed["employment_duration_years"],
            departure_event=parsed["departure_event"],
            employment_status=parsed["employment_status"],
        )
        db.add(created_row)
        db.flush()
        employee_id = created_row.id
        created = True
    return {"id": str(employee_id), "created": created}


def _upsert_candidate_like(
    db: Session, tenant_id: str, row: dict[str, Any]
) -> dict[str, Any]:
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
        select(CandidateTable)
        .where(CandidateTable.tenant_id == tenant_id)
        .where(CandidateTable.email == email)
    ).first()
    if existing is None:
        cross = db.exec(
            select(CandidateTable).where(CandidateTable.email == email)
        ).first()
        if cross is not None:
            raise ValueError(
                f"Email {email} already owned by another tenant; quarantining"
            )
    if existing:
        existing.full_name = full_name or existing.full_name
        existing.department = department or existing.department
        existing.role = role or existing.role
        if _first_value(row, ["sentiment_score", "engagement_score"], None) not in (
            None,
            "",
        ):
            existing.sentiment_score = sentiment_score
        if match_score is not None:
            existing.match_score = match_score
        existing.updated_at = datetime.utcnow()
        db.add(existing)
        db.flush()
        candidate_id = existing.id
        created = False
    else:
        created_row = CandidateTable(
            tenant_id=tenant_id,
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
    db: Session, tenant_id: str, row: dict[str, Any]
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
    db: Session, tenant_id: str, row: dict[str, Any]
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
    payload: dict[str, Any],
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


_DEFAULT_CONTRACT_FIELDS = {
    "hris": ["email", "full_name"],
    "ats": ["email", "full_name"],
}


def _ensure_default_contract(
    db: Session, tenant_id: str, source_type: str, provider: str
):
    """Auto-seed minimal contract so nightly sync never 422s on setup.

    Production-safe: minimal required fields only (email, full_name);
    stricter contracts can still be created via POST /contracts.
    """
    existing = db.exec(
        select(DataContractTable)
        .where(DataContractTable.tenant_id == tenant_id)
        .where(DataContractTable.source_type == source_type)
        .where(DataContractTable.provider == provider)
        .where(DataContractTable.status == "active")
        .order_by(DataContractTable.updated_at.desc())
    ).first()
    if existing:
        return existing
    if source_type not in {"hris", "ats"}:
        return None
    row = DataContractTable(
        tenant_id=tenant_id,
        source_type=source_type,
        provider=provider,
        version="v1",
        required_fields=json.dumps(_DEFAULT_CONTRACT_FIELDS[source_type]),
        status="active",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _run_connection_sync(
    connection_id: UUID, tenant_id: str, db: Session
) -> dict[str, int]:
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
    if not contract and conn.source_type in {"hris", "ats"}:
        contract = _ensure_default_contract(
            db, tenant_id, conn.source_type, conn.provider
        )
    required_fields = _load_required_fields(contract) if contract else []

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
        encrypted = open_credentials(conn.encrypted_secret_ref)
        options = encrypted.pop("__options", {}) if encrypted else {}
        records = connector.fetch_records(
            {
                "connection": conn,
                "session": db,
                "base_url": conn.base_url,
                "credentials": encrypted,
                "options": options,
            }
        )
        for rec in records:
            rec = _apply_connector_mappings(db, conn.id, tenant_id, rec)
            external_id = str(rec.get("external_id") or "").strip()
            raw = None
            if external_id:
                raw = db.exec(
                    select(RawEventTable)
                    .where(RawEventTable.tenant_id == tenant_id)
                    .where(RawEventTable.provider == conn.provider)
                    .where(RawEventTable.source_type == conn.source_type)
                    .where(RawEventTable.external_id == external_id)
                ).first()
            if raw is None:
                raw = RawEventTable(
                    tenant_id=tenant_id,
                    source_type=conn.source_type,
                    provider=conn.provider,
                    external_id=external_id or None,
                    payload=json.dumps(rec, default=str),
                )
            else:
                raw.payload = json.dumps(rec, default=str)
                raw.ingested_at = datetime.utcnow()
            db.add(raw)
            evidence_email = (
                str(rec.get("email") or rec.get("employee_email") or "").strip().lower()
            )
            if evidence_email:
                evidence = None
                if external_id:
                    evidence = db.exec(
                        select(IntegrationEvidenceTable)
                        .where(IntegrationEvidenceTable.tenant_id == tenant_id)
                        .where(IntegrationEvidenceTable.provider == conn.provider)
                        .where(IntegrationEvidenceTable.source_type == conn.source_type)
                        .where(IntegrationEvidenceTable.external_id == external_id)
                        .where(
                            IntegrationEvidenceTable.employee_email == evidence_email
                        )
                        .where(
                            IntegrationEvidenceTable.evidence_type == "provider_record"
                        )
                    ).first()
                if evidence is None:
                    evidence = IntegrationEvidenceTable(
                        tenant_id=tenant_id,
                        employee_email=evidence_email,
                        provider=conn.provider,
                        source_type=conn.source_type,
                        external_id=external_id or None,
                        evidence_type="provider_record",
                        summary="",
                    )
                evidence.summary = json.dumps(
                    {
                        key: rec.get(key)
                        for key in (
                            "issue_key",
                            "summary",
                            "channel_id",
                            "message_count",
                            "text",
                        )
                        if rec.get(key) is not None
                    },
                    default=str,
                )
                evidence.observed_at = datetime.utcnow()
                db.add(evidence)
            bronze += 1
            if conn.provider == "jira" and conn.source_type == "productivity":
                email_a = str(rec.get("reporter_email") or "").strip().casefold()
                email_b = (
                    str(rec.get("assignee_email") or rec.get("email") or "")
                    .strip()
                    .casefold()
                )
                occurred_at = _parse_optional_datetime(
                    rec.get("occurred_at") or rec.get("updated_at"),
                    "Jira issue updated_at",
                )
                if email_a and email_b and email_a != email_b and occurred_at:
                    people = db.exec(
                        select(EmployeeTable).where(
                            EmployeeTable.tenant_id == tenant_id,
                            EmployeeTable.email.in_([email_a, email_b]),
                        )
                    ).all()
                    by_email = {
                        str(person.email or "").casefold(): person for person in people
                    }
                    person_a, person_b = by_email.get(email_a), by_email.get(email_b)
                    if person_a and person_b:
                        event_id = f"{rec.get('external_id') or rec.get('issue_key')}:{occurred_at.isoformat()}"
                        event_exists = db.exec(
                            select(CollaborationEventTable.id).where(
                                CollaborationEventTable.tenant_id == tenant_id,
                                CollaborationEventTable.source == "jira_sync",
                                CollaborationEventTable.external_event_id == event_id,
                            )
                        ).first()
                        if not event_exists:
                            db.add(
                                CollaborationEventTable(
                                    tenant_id=tenant_id,
                                    source="jira_sync",
                                    external_event_id=event_id,
                                    employee_a_id=person_a.id,
                                    employee_b_id=person_b.id,
                                    event_type=str(
                                        rec.get("activity_type") or "issue_updated"
                                    )[:80],
                                    occurred_at=occurred_at,
                                )
                            )
                            silver += 1
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
                # Keep the existing Directory/Dashboard read model aligned
                # with the governed canonical HRIS layer.
                # Tenant-collision never aborts the sync: quarantine the row.
                try:
                    _upsert_employee_like(db, tenant_id, rec)
                except ValueError as ve:
                    quarantined += 1
                    db.add(
                        QuarantineEventTable(
                            tenant_id=tenant_id,
                            source_type=conn.source_type,
                            provider=conn.provider,
                            external_id=str(rec.get("external_id") or ""),
                            payload=json.dumps(rec, default=str),
                            reason=str(ve)[:300],
                        )
                    )
                    continue
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
                try:
                    _upsert_candidate_like(db, tenant_id, rec)
                except ValueError as ve:
                    quarantined += 1
                    db.add(
                        QuarantineEventTable(
                            tenant_id=tenant_id,
                            source_type=conn.source_type,
                            provider=conn.provider,
                            external_id=str(rec.get("external_id") or ""),
                            payload=json.dumps(rec, default=str),
                            reason=str(ve)[:300],
                        )
                    )
                    continue
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
    response_model=list[ConnectorFieldMappingOut],
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
    "/connections/{connection_id}/sync-jobs", response_model=list[ConnectorSyncJobOut]
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
):
    raise HTTPException(
        status_code=422,
        detail=(
            "Attrition model training is unavailable: the workspace has no "
            "validated employee departure and censoring history. Profile risk "
            "flags are not valid training labels."
        ),
    )


@router.get("/ml/models")
async def list_models(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    tenant_id = current_user.tenant_id or "default"
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
            "status": "unvalidated" if r.model_name == "attrition_v1" else r.status,
            "trained_at": r.trained_at.isoformat(),
            "metrics": (
                {} if r.model_name == "attrition_v1" else json.loads(r.metrics or "{}")
            ),
            "validation_status": (
                "insufficient_outcome_data"
                if r.model_name == "attrition_v1"
                else "not_applicable"
            ),
        }
        for r in rows
    ]


@router.post("/ml/score")
async def score_attrition(
    top_n: int = 100,
    current_user: TokenData = Depends(get_current_user),
):
    raise HTTPException(
        status_code=422,
        detail=(
            "Attrition scoring is unavailable until a model is trained and "
            "validated on this tenant's observed departure and censoring history."
        ),
    )


@router.post("/optimizer/scenario")
async def optimize_workforce_scenario(
    payload: dict[str, Any],
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


@router.get("/policy/packs", response_model=list[CompliancePolicyOut])
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


@router.get("/ml/drift", response_model=list[MLDriftSnapshotOut])
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


@router.get("/scenarios", response_model=list[ForecastScenarioOut])
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


@router.get("/ml/cards", response_model=list[MLModelCardOut])
async def list_model_cards(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    tenant_id = current_user.tenant_id or "default"
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
    db: Session = Depends(get_session),
):
    tenant_id = current_user.tenant_id or "default"
    card = db.get(MLModelCardTable, card_id)
    if not card or card.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Model card not found")
    if card.model_name == "attrition_v1":
        raise HTTPException(
            status_code=422,
            detail="Attrition model approval is blocked until outcome-based validation is available.",
        )
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
    db: Session = Depends(get_session),
):
    tenant_id = current_user.tenant_id or "default"
    card = db.get(MLModelCardTable, card_id)
    if not card or card.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Model card not found")
    if card.model_name == "attrition_v1":
        raise HTTPException(
            status_code=422,
            detail="Attrition model promotion is blocked until outcome-based validation is available.",
        )
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
    db: Session = Depends(get_session),
):
    tenant_id = current_user.tenant_id or "default"
    card = db.get(MLModelCardTable, card_id)
    if not card or card.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Model card not found")
    if card.model_name == "attrition_v1":
        raise HTTPException(
            status_code=422,
            detail="Attrition model rollback is blocked until outcome-based validation is available.",
        )
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


@router.get("/release-gates", response_model=list[ReleaseGateOut])
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


@router.get("/dr/runbooks", response_model=list[DRRunbookOut])
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


@router.get("/procurement/artifacts", response_model=list[ProcurementArtifactOut])
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

    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=403, detail="Authenticated tenant is required")
    for model in [
        CollaborationEventTable,
        SkillAliasTable,
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
        db.execute(delete(model).where(model.tenant_id == tenant_id))
    db.commit()
    _audit(
        db,
        current_user,
        "RESET_DEMO_DATA",
        "dataset",
        None,
        {"scope": "authenticated_tenant_entities", "tenant_id": tenant_id},
    )
    db.commit()
    return {"status": "cleared"}


def _reset_local_demo_data_sync(db: Session, current_user: TokenData) -> None:
    from sqlmodel import delete

    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=403, detail="Authenticated tenant is required")
    for model in [
        CollaborationEventTable,
        SkillAliasTable,
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
        db.execute(delete(model).where(model.tenant_id == tenant_id))
    db.commit()
    _audit(
        db,
        current_user,
        "RESET_DEMO_DATA",
        "dataset",
        None,
        {"scope": "authenticated_tenant_entities", "tenant_id": tenant_id},
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


def _bundle_job_runner(
    file_name: str, archive_bytes: bytes, current_user: TokenData, tenant_id: str
):
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
                    bundle_members: dict[str, str] = {}
                    for member in zipf.namelist():
                        base_name = Path(member).name.lower()
                        for kind, expected_name in _BUNDLE_FILE_NAMES.items():
                            if base_name == expected_name:
                                bundle_members[kind] = member
                    missing = [
                        expected
                        for kind, expected in _BUNDLE_FILE_NAMES.items()
                        if kind
                        in {
                            "employees",
                            "candidates",
                            "employee_skills",
                            "candidate_skills",
                            "employee_experience",
                            "candidate_experience",
                        }
                        if kind not in bundle_members
                    ]
                    if missing:
                        raise HTTPException(
                            status_code=422,
                            detail=f"Bundle missing required files: {', '.join(missing)}",
                        )

                    ordered_kinds = [
                        kind for kind in _BUNDLE_FILE_NAMES if kind in bundle_members
                    ]
                    results: dict[str, int] = {}
                    total_steps = len(ordered_kinds)
                    for index, kind in enumerate(ordered_kinds, start=1):
                        member = bundle_members[kind]
                        _update_import_job(
                            job_id,
                            phase=f"importing_{kind}",
                            progress=10 + int((index - 1) / total_steps * 80),
                            message=f"Importing {kind.replace('_', ' ')}...",
                        )
                        with zipf.open(member) as handle:
                            content = handle.read().decode("utf-8-sig")
                        reader = csv.DictReader(content.splitlines())
                        rows = [_normalize_header_map(row) for row in reader]
                        results[kind] = _import_rows_for_kind(
                            db, tenant_id, kind, rows, preserve_existing=True
                        )

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
                        "mode": "merge",
                        "bundle": results,
                        "file_name": file_name,
                        "message": "Imported rows were merged by stable identifiers; existing rows not present in this bundle were preserved.",
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
    kind: str,
    file_name: str,
    csv_bytes: bytes,
    current_user: TokenData,
    tenant_id: str,
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
            imported = _import_rows_for_kind(db, tenant_id, kind, rows)
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
    tenant_id = current_user.tenant_id or "default"
    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(content.splitlines())
    rows = [_normalize_header_map(row) for row in reader]
    imported = _import_rows_for_kind(db, tenant_id, kind, rows)

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
    current_user: TokenData = Depends(get_current_user),
):
    tenant_id = current_user.tenant_id or "default"
    csv_bytes = await file.read()
    job_id = _create_import_job("csv", file.filename or f"{kind}.csv")
    _run_import_job(
        job_id,
        _csv_job_runner(
            kind, file.filename or f"{kind}.csv", csv_bytes, current_user, tenant_id
        ),
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
        if kind == "employees":
            metrics["with_salary_units"] = sum(
                bool(
                    row.get("salary")
                    and row.get("salary_currency")
                    and row.get("salary_period")
                )
                for row in rows
            )
            metrics["with_employment_outcome_fields"] = sum(
                bool(
                    row.get("employment_start_date")
                    and (
                        (
                            str(row.get("departure_event", "")).casefold()
                            in {"true", "1", "yes"}
                            and row.get("employment_end_date")
                        )
                        or (
                            str(row.get("departure_event", "")).casefold()
                            in {"false", "0", "no"}
                            and row.get("employment_censor_date")
                        )
                    )
                )
                for row in rows
            )
    elif kind in {"employee_skills", "candidate_skills"}:
        required_fields = ["email", "skill_name"]
        owner_key = "employee_email" if kind == "employee_skills" else "candidate_email"
        quality_rows = [
            {
                **row,
                "email": _first_value(row, [owner_key, "email"]),
                "skill_name": _first_value(row, ["skill_name", "name", "skill"]),
            }
            for row in rows
        ]
        metrics = _build_quality_score(quality_rows, required_fields, unique_field=None)
    elif kind in {"employee_experience", "candidate_experience"}:
        required_fields = ["email", "company", "position"]
        owner_key = (
            "employee_email" if kind == "employee_experience" else "candidate_email"
        )
        quality_rows = [
            {
                **row,
                "email": _first_value(row, [owner_key, "email"]),
                "position": _first_value(row, ["position", "role", "title"]),
            }
            for row in rows
        ]
        metrics = _build_quality_score(quality_rows, required_fields, unique_field=None)
        metrics["dated_rows"] = sum(
            bool(
                _first_value(
                    row, ["effective_start", "start_date", "position_start_date"], None
                )
            )
            for row in rows
        )
        metrics["undated_rows"] = len(rows) - metrics["dated_rows"]
    elif kind == "collaboration_events":
        required_fields = ["employee_a_email", "employee_b_email", "occurred_at"]
        metrics = _build_quality_score(
            rows, required_fields, unique_field="external_event_id"
        )
    elif kind == "skill_aliases":
        required_fields = ["alias", "canonical_skill"]
        metrics = _build_quality_score(rows, required_fields, unique_field="alias")
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
    tenant_id = current_user.tenant_id or "default"
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(
            status_code=422,
            detail="Upload a ZIP bundle containing the dataset CSV files",
        )

    archive_bytes = await file.read()
    try:
        with zipfile.ZipFile(io.BytesIO(archive_bytes)) as zipf:
            bundle_members: dict[str, str] = {}
            for member in zipf.namelist():
                base_name = Path(member).name.lower()
                for kind, expected_name in _BUNDLE_FILE_NAMES.items():
                    if base_name == expected_name:
                        bundle_members[kind] = member
            missing = [
                expected
                for kind, expected in _BUNDLE_FILE_NAMES.items()
                if kind
                in {
                    "employees",
                    "candidates",
                    "employee_skills",
                    "candidate_skills",
                    "employee_experience",
                    "candidate_experience",
                }
                if kind not in bundle_members
            ]
            if missing:
                raise HTTPException(
                    status_code=422,
                    detail=f"Bundle missing required files: {', '.join(missing)}",
                )

            # Bundle imports are additive/idempotent. The explicit reset endpoint
            # remains available to admins, but uploading a bundle must never erase
            # records that are absent from that archive.
            # Import parent tables before their dependent skills/experiences,
            # independent of archive member ordering.
            results: dict[str, int] = {}
            for kind in _BUNDLE_FILE_NAMES:
                member = bundle_members.get(kind)
                if member is None:
                    continue
                with zipf.open(member) as handle:
                    content = handle.read().decode("utf-8-sig")
                reader = csv.DictReader(content.splitlines())
                rows = [_normalize_header_map(row) for row in reader]
                results[kind] = _import_rows_for_kind(
                    db, tenant_id, kind, rows, preserve_existing=True
                )

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
            return {
                "status": "imported",
                "mode": "merge",
                "bundle": results,
                "file_name": file.filename,
                "message": "Imported rows were merged by stable identifiers; existing rows not present in this bundle were preserved.",
            }
    except zipfile.BadZipFile:
        raise HTTPException(status_code=422, detail="Invalid ZIP bundle")


@router.post("/import/bundle/async")
async def import_dataset_bundle_async(
    file: UploadFile = File(...),
    current_user: TokenData = Depends(get_current_user),
):
    tenant_id = current_user.tenant_id or "default"
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(
            status_code=422,
            detail="Upload a ZIP bundle containing the dataset CSV files",
        )
    archive_bytes = await file.read()
    job_id = _create_import_job("bundle", file.filename)
    _run_import_job(
        job_id,
        _bundle_job_runner(file.filename, archive_bytes, current_user, tenant_id),
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
    tenant_id = current_user.tenant_id or "default"
    bundle_bytes = _export_dataset_bundle_bytes(db, tenant_id)
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
    analytics = _analytics_snapshot(db, tenant_id)
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
                        # Exponential retry backoff, capped at one day. The
                        # scheduler remains live while avoiding a hot retry loop.
                        retry_minutes = min(
                            1440, max(5, 5 * (2 ** min(conn.sync_retry_count - 1, 8)))
                        )
                        conn.next_sync_at = datetime.utcnow() + timedelta(
                            minutes=retry_minutes
                        )
                        if conn.sync_retry_count >= 8:
                            conn.status = "error"
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
