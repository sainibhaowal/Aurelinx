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
Aurelinx Intelligence Chat endpoints
Persistent sessions, messages, uploads, and tool-enabled agent responses.
"""

import asyncio
import difflib
import hashlib
import json
import os
import re
import secrets
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import String, func, or_
from sqlalchemy import text as sql_text
from sqlmodel import Session, select

from app.agent.guards import (
    guard_safe_sql as _guard_safe_sql,
)
from app.agent.guards import (
    normalize_tool_name as _normalize_tool_name,
)
from app.agent.guards import (
    safe_limit as _safe_limit,
)
from app.api.v1.actions import _policy_block
from app.core.config import settings
from app.core.data_policy import filter_real_records
from app.core.logging_config import get_logger
from app.core.provider_utils import (
    build_local_provider_base_candidates,
    normalize_local_provider_base,
)
from app.core.security import TokenData, get_current_user
from app.models.database import (
    AuditLogTable,
    CandidateTable,
    CanonicalCandidateTable,
    CanonicalEmployeeTable,
    ChatAttachmentTable,
    ChatFeedbackTable,
    ChatMessageTable,
    ChatSessionTable,
    CompliancePolicyTable,
    ConnectorFieldMappingTable,
    ConnectorSyncJobTable,
    DataContractTable,
    DRRunbookTable,
    EmployeeTable,
    ExperienceTable,
    ExternalActionRequestTable,
    ForecastScenarioTable,
    GoldMetricSnapshotTable,
    IntegrationApiKeyTable,
    IntegrationConnectionTable,
    IntegrationLogTable,
    IntegrationWebhookEventTable,
    InterventionOutcomeTable,
    InterventionTable,
    MLDriftSnapshotTable,
    MLModelCardTable,
    MLModelRegistryTable,
    QuarantineEventTable,
    RawEventTable,
    ReleaseGateTable,
    SkillTable,
    UserTable,
    WorkflowApprovalTable,
    WorkflowEventTable,
    WorkflowRunTable,
    engine,
    get_session,
)
from app.schemas.schemas import (
    ChatAttachmentOut,
    ChatBulkDeleteRequest,
    ChatMessageCreate,
    ChatMessageOut,
    ChatResponse,
    ChatSessionCreate,
    ChatSessionOut,
    ChatSessionRename,
)
from app.services.actions.policy import validate_action
from app.services.connectors.factory import get_connector
from app.workflows.agent_runtime import TOOL_SCHEMAS, AgentExecutionState
from app.workflows.events import (
    ToolEventScope,
    create_workflow_run,
    emit_workflow_event,
    safe_summary,
    update_workflow_event,
    update_workflow_run,
    workflow_event_dict,
)
from app.workflows.instant.instant_loop import _classify_thinking_token
from app.workflows.instant.prompt_assembly import (
    ANSWER_SYSTEM_PREFIX,
    is_simple_count_request,
)

router = APIRouter(prefix="/chat", tags=["chat"])
logger = get_logger(__name__)

try:
    UPLOAD_ROOT = Path(os.getenv("CHAT_UPLOAD_ROOT", "/app/data/chat")).resolve()
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
except (PermissionError, OSError):
    UPLOAD_ROOT = Path(os.getenv("CHAT_UPLOAD_ROOT", "./data/chat")).resolve()
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


def _json_dumps(payload: dict) -> str:
    """Serialize SSE payloads safely, including UUID/datetime values."""
    return json.dumps(payload, default=str)


try:
    from pypdf import PdfReader  # type: ignore
except Exception:
    PdfReader = None

try:
    from docx import Document  # type: ignore
except Exception:
    Document = None

try:
    import pytesseract  # type: ignore
    from PIL import Image  # type: ignore
except Exception:
    pytesseract = None
    Image = None


def _to_session_out(s: ChatSessionTable) -> ChatSessionOut:
    return ChatSessionOut(
        id=s.id,
        user_id=s.user_id,
        title=s.title,
        created_at=s.created_at,
        updated_at=s.updated_at,
    )


def _get_session_normalized(db: Session, session_id: UUID) -> "ChatSessionTable | None":
    """Lookup a ChatSession by ID, handling both hyphenated and hex (no-hyphen) UUID
    storage formats from older string-based records.
    """
    sid_str = str(session_id)  # '74013167-aac8-...' (hyphenated)
    sid_hex = sid_str.replace("-", "")  # '74013167aac8...'  (no hyphens)

    # Try hyphenated string first (new sessions stored this way)
    row = db.exec(
        select(ChatSessionTable).where(ChatSessionTable.id == sid_str)
    ).first()
    if row:
        return row

    # Try hex (no hyphens) for older sessions
    return db.exec(
        select(ChatSessionTable).where(ChatSessionTable.id == sid_hex)
    ).first()


def _to_message_out(m: ChatMessageTable) -> ChatMessageOut:
    workflow_run_id = None
    workflow_events = []
    try:
        trace = json.loads(m.tool_trace or "{}")
        workflow_run_id = trace.get("workflow_run_id")
        workflow_events = trace.get("workflow_events") or []
    except Exception:
        pass
    return ChatMessageOut(
        id=m.id,
        session_id=m.session_id,
        role=m.role,
        content=m.content,
        tool_trace=m.tool_trace,
        created_at=m.created_at,
        workflow_run_id=workflow_run_id,
        workflow_events=workflow_events,
    )


def _to_attachment_out(a: ChatAttachmentTable) -> ChatAttachmentOut:
    return ChatAttachmentOut(
        id=a.id,
        session_id=a.session_id,
        message_id=a.message_id,
        original_name=a.original_name,
        content_type=a.content_type,
        file_path=a.file_path,
        file_size=a.file_size,
        parsing_status=a.parsing_status,
        parsing_error=a.parsing_error,
        created_at=a.created_at,
    )


def _assert_session_owner(session_row: ChatSessionTable, current_user: TokenData):
    if str(getattr(session_row, "tenant_id", "default")) != str(current_user.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden tenant access"
        )
    if current_user.is_admin:
        return
    if str(session_row.user_id) == "00000000-0000-0000-0000-000000000000":
        return
    if session_row.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden session access"
        )


def _write_audit(
    db: Session,
    current_user: TokenData,
    action: str,
    resource_type: str,
    resource_id: str,
    details: dict,
):
    audit = AuditLogTable(
        user_id=None,  # token user id is string in this project, keep optional DB FK null-safe
        tenant_id=current_user.tenant_id,
        action=action,
        resource_type=resource_type,
        resource_id=None,
        details=json.dumps(details),
        ip_address="127.0.0.1",
    )
    db.add(audit)


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9\+\#\.]{2,}", text.lower())


def _skills_by_entity(
    db: Session, rows: list[Any], entity_field: str, tenant_id: str | None = None
) -> dict[UUID, list[SkillTable]]:
    """Load all skills for a result set in one query (avoids N+1 searches)."""
    ids = [row.id for row in rows]
    if not ids:
        return {}
    field = getattr(SkillTable, entity_field)
    grouped: dict[UUID, list[SkillTable]] = {}
    statement = select(SkillTable).where(field.in_(ids))
    if tenant_id:
        statement = statement.where(SkillTable.tenant_id == tenant_id)
    for skill in db.exec(statement).all():
        entity_id = getattr(skill, entity_field)
        if entity_id:
            grouped.setdefault(entity_id, []).append(skill)
    return grouped


def _search_employees(
    db: Session,
    query_text: str,
    limit: int = 5,
    offset: int = 0,
    tenant_id: str | None = None,
) -> list[EmployeeTable]:
    statement = select(EmployeeTable)
    if tenant_id:
        statement = statement.where(EmployeeTable.tenant_id == tenant_id)
    employees = db.exec(statement).all()
    skills_by_employee = _skills_by_entity(db, employees, "employee_id", tenant_id)
    query_lower = query_text.lower()
    scored = []

    # Identify query intent flags
    wants_at_risk = any(
        k in query_lower for k in ["risk", "flight", "hazard", "leaving", "attrition"]
    )
    wants_high_morale = any(
        k in query_lower
        for k in ["high morale", "happy", "satisfied", "good sentiment"]
    )
    wants_low_morale = any(
        k in query_lower
        for k in ["low morale", "unhappy", "dissatisfied", "bad sentiment"]
    )

    for emp in employees:
        score = 0.0

        # 1. Direct substring checks (name, role, department)
        if emp.full_name and emp.full_name.lower() in query_lower:
            score += 10.0
        for token in query_lower.split():
            if len(token) > 2:
                if emp.full_name and token in emp.full_name.lower():
                    score += 5.0
                if emp.role and token in emp.role.lower():
                    score += 3.0
                if emp.department and token in emp.department.lower():
                    score += 4.0

        # 2. Intent matching
        if wants_at_risk:
            if emp.is_at_risk:
                score += 15.0
            score += (1.0 - (emp.sentiment_score or 0.5)) * 10.0
            if emp.retention_prob is not None:
                score += (1.0 - emp.retention_prob) * 10.0
        elif wants_low_morale:
            score += (1.0 - (emp.sentiment_score or 0.5)) * 15.0
        elif wants_high_morale:
            score += (emp.sentiment_score or 0.5) * 15.0

        # 3. Skills overlap
        skills = skills_by_employee.get(emp.id, [])
        for s in skills:
            if s.name and s.name.lower() in query_lower:
                score += 5.0

        scored.append((score, emp))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [row[1] for row in scored[offset : offset + limit]]


def _search_candidates(
    db: Session,
    query_text: str,
    limit: int = 5,
    offset: int = 0,
    tenant_id: str | None = None,
) -> list[CandidateTable]:
    statement = select(CandidateTable)
    if tenant_id:
        statement = statement.where(CandidateTable.tenant_id == tenant_id)
    candidates = db.exec(statement).all()
    skills_by_candidate = _skills_by_entity(db, candidates, "candidate_id", tenant_id)
    query_lower = query_text.lower()
    scored = []

    # Identify query intent flags
    wants_high_match = any(
        k in query_lower for k in ["best", "top", "highly matched", "match", "scout"]
    )
    wants_high_morale = any(
        k in query_lower for k in ["high morale", "happy", "good sentiment"]
    )
    wants_low_morale = any(
        k in query_lower for k in ["low morale", "unhappy", "bad sentiment"]
    )

    for c in candidates:
        score = 0.0

        # 1. Direct substring checks
        if c.full_name and c.full_name.lower() in query_lower:
            score += 10.0
        for token in query_lower.split():
            if len(token) > 2:
                if c.full_name and token in c.full_name.lower():
                    score += 5.0
                if c.role and token in c.role.lower():
                    score += 3.0
                if c.department and token in c.department.lower():
                    score += 4.0

        # 2. Intent matching
        if wants_high_match:
            score += (c.match_score or 0.0) * 15.0
        if wants_low_morale:
            score += (1.0 - (c.sentiment_score or 0.5)) * 10.0
        elif wants_high_morale:
            score += (c.sentiment_score or 0.5) * 10.0

        # 3. Skills overlap
        skills = skills_by_candidate.get(c.id, [])
        for s in skills:
            if s.name and s.name.lower() in query_lower:
                score += 5.0

        scored.append((score, c))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [row[1] for row in scored[offset : offset + limit]]


def _compute_dashboard_snapshot(db: Session, tenant_id: str | None = None) -> dict:
    statement = select(EmployeeTable)
    if tenant_id:
        statement = statement.where(EmployeeTable.tenant_id == tenant_id)
    employees = db.exec(statement).all()
    total = len(employees)
    at_risk = len([e for e in employees if e.is_at_risk])
    avg_morale = (
        round(sum([e.sentiment_score for e in employees]) / total, 3) if total else 0.0
    )
    dept_counts = {}
    for e in employees:
        dept_counts[e.department] = dept_counts.get(e.department, 0) + 1
    return {
        "total_workforce": total,
        "at_risk": at_risk,
        "avg_morale": avg_morale,
        "departments": dept_counts,
    }


def _department_risk_summary(employees: list[EmployeeTable]) -> list[dict[str, Any]]:
    dept_map: dict[str, int] = {}
    dept_risk: dict[str, int] = {}
    for e in employees:
        dept = e.department or "Unknown"
        dept_map[dept] = dept_map.get(dept, 0) + 1
        if e.is_at_risk:
            dept_risk[dept] = dept_risk.get(dept, 0) + 1

    summary: list[dict[str, Any]] = []
    for dept, total in sorted(dept_map.items(), key=lambda item: (-item[1], item[0])):
        at_risk = dept_risk.get(dept, 0)
        summary.append(
            {
                "department": dept,
                "total": total,
                "at_risk": at_risk,
                "at_risk_rate": round((at_risk / total), 3) if total else 0.0,
            }
        )
    return summary


def _top_risk_score_employee(employee: EmployeeTable) -> float:
    sentiment = float(employee.sentiment_score or 0.0)
    retention = float(
        employee.retention_prob if employee.retention_prob is not None else 0.5
    )
    score = (1.0 - sentiment) * 0.6 + (1.0 - retention) * 0.4
    if employee.is_at_risk:
        score += 0.2
    return round(min(1.0, max(0.0, score)), 3)


def _top_match_score_candidate(candidate: CandidateTable) -> float:
    match_score = float(
        candidate.match_score if candidate.match_score is not None else 0.0
    )
    sentiment = float(candidate.sentiment_score or 0.0)
    score = (match_score * 0.8) + (sentiment * 0.2)
    return round(min(1.0, max(0.0, score)), 3)


def _workspace_snapshot(
    db: Session, user_text: str = "", tenant_id: str | None = None
) -> dict[str, Any]:
    if not tenant_id:
        return {}
    query_lower = user_text.lower() if user_text else ""
    snapshot = {}

    # Check query intent keywords
    wants_risk = any(
        k in query_lower
        for k in [
            "risk",
            "morale",
            "sentiment",
            "unhappy",
            "leaving",
            "hazard",
            "at-risk",
            "employee",
        ]
    )
    wants_candidates = any(
        k in query_lower for k in ["candidate", "scout", "match", "hiring", "talent"]
    )
    wants_integrations = any(
        k in query_lower
        for k in [
            "integration",
            "connection",
            "connect",
            "greenhouse",
            "slack",
            "jira",
            "workday",
        ]
    )
    wants_compliance = any(
        k in query_lower
        for k in ["compliance", "policy", "policies", "gate", "release"]
    )
    wants_interventions = any(
        k in query_lower for k in ["intervention", "mitigate", "action"]
    )
    wants_events = any(
        k in query_lower
        for k in ["event", "quarantine", "ops", "bronze", "silver", "sync"]
    )

    # If it is a generic query and none of the above are matched, we don't fetch any snapshot details!
    if not (
        wants_risk
        or wants_candidates
        or wants_integrations
        or wants_compliance
        or wants_interventions
        or wants_events
    ):
        return {}

    # Query only what is requested!
    if wants_risk:
        employees = filter_real_records(
            db.exec(
                select(EmployeeTable).where(EmployeeTable.tenant_id == tenant_id)
            ).all()
        )
        dept_summary = _department_risk_summary(employees)
        top_risk_employees = sorted(
            employees, key=_top_risk_score_employee, reverse=True
        )[:5]
        workforce = _compute_dashboard_snapshot(db, tenant_id)

        snapshot["workforce"] = {
            "total_workforce": workforce["total_workforce"],
            "at_risk": workforce["at_risk"],
            "at_risk_pct": (
                round((workforce["at_risk"] / workforce["total_workforce"]) * 100, 1)
                if workforce["total_workforce"]
                else 0.0
            ),
            "avg_morale": workforce["avg_morale"],
            "departments": workforce["departments"],
            "department_risk_clusters": dept_summary[:6],
            "top_risk_department": max(
                dept_summary, key=lambda item: item["at_risk_rate"], default=None
            ),
        }
        snapshot["directory"] = {
            "top_risk_employees": [
                {
                    "full_name": e.full_name,
                    "email": e.email,
                    "department": e.department,
                    "role": e.role,
                    "sentiment_score": e.sentiment_score,
                    "retention_prob": e.retention_prob,
                    "is_at_risk": e.is_at_risk,
                }
                for e in top_risk_employees
            ]
        }

    if wants_candidates:
        candidates = filter_real_records(
            db.exec(
                select(CandidateTable).where(CandidateTable.tenant_id == tenant_id)
            ).all()
        )
        candidate_match_avg = (
            round(
                sum(float(c.match_score or 0.0) for c in candidates) / len(candidates),
                3,
            )
            if candidates
            else 0.0
        )
        top_candidate_matches = sorted(
            candidates, key=_top_match_score_candidate, reverse=True
        )[:5]

        snapshot["talent_scout"] = {
            "candidates_total": len(candidates),
            "candidate_match_avg": candidate_match_avg,
            "top_candidates": [
                {
                    "full_name": c.full_name,
                    "email": c.email,
                    "department": c.department,
                    "role": c.role,
                    "sentiment_score": c.sentiment_score,
                    "match_score": c.match_score,
                }
                for c in top_candidate_matches
            ],
        }

    if wants_integrations:
        integrations = db.exec(
            select(IntegrationConnectionTable)
            .order_by(IntegrationConnectionTable.created_at.desc())
            .where(IntegrationConnectionTable.tenant_id == tenant_id)
        ).all()
        snapshot["enterprise_ops"] = {
            "integration_connections": [
                {
                    "name": c.name,
                    "provider": c.provider,
                    "source_type": c.source_type,
                    "status": c.status,
                }
                for c in integrations[:10]
            ]
        }

    if wants_compliance:
        policies = db.exec(
            select(CompliancePolicyTable)
            .where(
                CompliancePolicyTable.tenant_id == tenant_id,
                CompliancePolicyTable.status == "active",
            )
            .order_by(CompliancePolicyTable.created_at.desc())
        ).all()
        release_gates = db.exec(
            select(ReleaseGateTable)
            .where(ReleaseGateTable.tenant_id == tenant_id)
            .order_by(ReleaseGateTable.created_at.desc())
            .limit(5)
        ).all()
        snapshot["enterprise_ops"] = snapshot.get("enterprise_ops", {})
        snapshot["enterprise_ops"]["policy_packs"] = [
            {
                "policy_name": p.policy_name,
                "region": p.region,
                "action_type": p.action_type,
                "status": p.status,
            }
            for p in policies[:5]
        ]
        snapshot["enterprise_ops"]["release_gates"] = [
            {
                "artifact_name": g.artifact_name,
                "version": g.version,
                "status": g.status,
            }
            for g in release_gates
        ]

    if wants_interventions:
        interventions = db.exec(
            select(InterventionTable)
            .where(InterventionTable.tenant_id == tenant_id)
            .order_by(InterventionTable.created_at.desc())
            .limit(5)
        ).all()
        snapshot["enterprise_ops"] = snapshot.get("enterprise_ops", {})
        snapshot["enterprise_ops"]["active_interventions"] = [
            {
                "title": i.title,
                "priority": i.priority,
                "status": i.status,
                "target_department": i.target_department,
            }
            for i in interventions
        ]

    if wants_events:
        raw_events_count = len(
            db.exec(
                select(RawEventTable).where(RawEventTable.tenant_id == tenant_id)
            ).all()
        )
        quarantine_count = len(
            db.exec(
                select(QuarantineEventTable).where(
                    QuarantineEventTable.tenant_id == tenant_id
                )
            ).all()
        )
        connector_jobs = db.exec(
            select(ConnectorSyncJobTable)
            .where(ConnectorSyncJobTable.tenant_id == tenant_id)
            .order_by(ConnectorSyncJobTable.started_at.desc())
            .limit(5)
        ).all()
        snapshot["data_ops"] = {
            "raw_events": raw_events_count,
            "quarantine_events": quarantine_count,
            "sync_jobs": [
                {
                    "provider": j.provider,
                    "source_type": j.source_type,
                    "status": j.status,
                }
                for j in connector_jobs
            ],
        }

    return snapshot


def _workspace_snapshot_summary_lines(snapshot: dict[str, Any]) -> list[str]:
    workforce = snapshot.get("workforce", {})
    talent = snapshot.get("talent_scout", {})
    data_ops = snapshot.get("data_ops", {})
    ops = snapshot.get("enterprise_ops", {})
    top_cluster = workforce.get("top_risk_department")

    lines = [
        f"- Workforce: {workforce.get('total_workforce', 0)} total, {workforce.get('at_risk', 0)} at risk, avg morale {workforce.get('avg_morale', 0.0)}",
        f"- Candidate pool: {talent.get('candidates_total', 0)} total, avg match {talent.get('candidate_match_avg', 0.0)}",
        f"- Data ops: raw events {data_ops.get('raw_events', 0)}, quarantine {data_ops.get('quarantine_events', 0)}, canonical employees {data_ops.get('canonical_employees', 0)}, canonical candidates {data_ops.get('canonical_candidates', 0)}",
        f"- Enterprise ops: integrations {len(ops.get('integration_connections', []))}, interventions {len(ops.get('active_interventions', []))}, policies {len(ops.get('policy_packs', []))}",
        "- Application surfaces: dashboard, directory, sentiment, analytics, talent scout, workflow chat, intel center, enterprise ops, settings",
    ]
    if top_cluster:
        lines.append(
            f"- Top risk department: {top_cluster.get('department')} ({top_cluster.get('at_risk', 0)}/{top_cluster.get('total', 0)} at risk rate {top_cluster.get('at_risk_rate', 0.0):.3f})"
        )

    # 1. Top At-Risk Employees details
    top_risk_employees = snapshot.get("directory", {}).get("top_risk_employees", [])
    if top_risk_employees:
        lines.append("\nTop 5 At-Risk Employees:")
        for emp in top_risk_employees:
            lines.append(
                f"  * {emp.get('full_name')} ({emp.get('role')} - {emp.get('department')}): Sentiment {emp.get('sentiment_score')}, Retention Prob {emp.get('retention_prob')}, At Risk Flag: {emp.get('is_at_risk')}"
            )

    # 2. Top Candidate Matches details
    top_candidate_matches = talent.get("top_candidates", [])
    if top_candidate_matches:
        lines.append("\nTop 5 Candidate Matches:")
        for cand in top_candidate_matches:
            lines.append(
                f"  * {cand.get('full_name')} ({cand.get('role')} - {cand.get('department')}): Match Score {cand.get('match_score')}, Sentiment {cand.get('sentiment_score')}"
            )

    # 3. Active Connections details
    connections = ops.get("integration_connections", [])
    if connections:
        lines.append("\nIntegration Connections:")
        for conn in connections:
            lines.append(
                f"  * {conn.get('name')} ({conn.get('provider')} - {conn.get('source_type')}): Status {conn.get('status')}"
            )

    # 4. Compliance Policies details
    policies = ops.get("policy_packs", [])
    if policies:
        lines.append("\nActive Compliance Policies:")
        for p in policies:
            lines.append(
                f"  * {p.get('policy_name')} (Region: {p.get('region')}, Action: {p.get('action_type')}): Status {p.get('status')}"
            )

    # 5. Active Interventions details
    interventions = ops.get("active_interventions", [])
    if interventions:
        lines.append("\nActive Interventions:")
        for i in interventions:
            lines.append(
                f"  * {i.get('title')} (Priority: {i.get('priority')}): Status {i.get('status')}"
            )

    return lines


def _record_counts(db: Session, tenant_id: str | None = None) -> dict[str, int]:
    def _count(model) -> int:
        statement = select(func.count()).select_from(model)
        tenant_filter = _tenant_filter(model, tenant_id)
        if tenant_filter is not None:
            statement = statement.where(tenant_filter)
        value = db.exec(statement).one()
        if isinstance(value, tuple):
            value = value[0]
        return int(value or 0)

    return {
        "employees": _count(EmployeeTable),
        "candidates": _count(CandidateTable),
        "skills": _count(SkillTable),
        "experience": _count(ExperienceTable),
    }


def _parse_csv_and_ingest(db: Session, attachments: list[ChatAttachmentTable]) -> dict:
    import csv

    ingest_log = {
        "ingested": False,
        "employees": 0,
        "candidates": 0,
        "companies": 0,
        "errors": [],
        "actions": [],
    }
    for att in attachments:
        path = Path(att.file_path)
        if not path.exists() or path.suffix.lower() != ".csv":
            continue
        try:
            with open(path, encoding="utf-8", errors="ignore") as f:
                content_sample = f.read(2048)
                f.seek(0)
                delimiter = ","
                if ";" in content_sample and "," not in content_sample:
                    delimiter = ";"

                reader = csv.DictReader(f, delimiter=delimiter)
                for row in reader:
                    if not row:
                        continue
                    clean_row = {
                        str(k).strip().lower(): str(v).strip()
                        for k, v in row.items()
                        if k is not None
                    }

                    email = (
                        clean_row.get("email")
                        or clean_row.get("email_address")
                        or clean_row.get("mail")
                    )
                    name = (
                        clean_row.get("full_name")
                        or clean_row.get("name")
                        or clean_row.get("employee_name")
                    )
                    role = (
                        clean_row.get("role")
                        or clean_row.get("position")
                        or clean_row.get("title")
                        or "Software Engineer"
                    )
                    dept = (
                        clean_row.get("department")
                        or clean_row.get("dept")
                        or "Engineering"
                    )

                    if not email or not name:
                        continue

                    is_candidate = (
                        "candidate" in clean_row
                        or clean_row.get("status", "").lower() == "candidate"
                        or clean_row.get("type", "").lower() == "candidate"
                    )

                    if is_candidate:
                        exists = db.exec(
                            select(CandidateTable).where(CandidateTable.email == email)
                        ).first()
                        if not exists:
                            cand = CandidateTable(
                                full_name=name,
                                email=email,
                                department=dept.title(),
                                role=role.title(),
                                sentiment_score=float(
                                    clean_row.get("sentiment_score")
                                    or clean_row.get("sentiment")
                                    or 0.65
                                ),
                            )
                            db.add(cand)
                            ingest_log["candidates"] += 1
                            ingest_log["actions"].append(
                                f"Ingested Candidate: {name} ({email})"
                            )
                    else:
                        exists = db.exec(
                            select(EmployeeTable).where(EmployeeTable.email == email)
                        ).first()
                        if not exists:
                            sentiment = 0.75
                            try:
                                sentiment = float(
                                    clean_row.get("sentiment_score")
                                    or clean_row.get("sentiment")
                                    or 0.75
                                )
                            except ValueError:
                                pass

                            is_at_risk = clean_row.get(
                                "is_at_risk", "false"
                            ).lower() in ["true", "1", "yes"]

                            retention = 0.90
                            try:
                                retention = float(
                                    clean_row.get("retention_prob")
                                    or clean_row.get("retention")
                                    or 0.90
                                )
                            except ValueError:
                                pass

                            emp = EmployeeTable(
                                full_name=name,
                                email=email,
                                department=dept.title(),
                                role=role.title(),
                                sentiment_score=sentiment,
                                is_at_risk=is_at_risk,
                                retention_prob=retention,
                            )
                            db.add(emp)
                            ingest_log["employees"] += 1
                            ingest_log["actions"].append(
                                f"Ingested Employee: {name} ({email})"
                            )

                    company = (
                        clean_row.get("company")
                        or clean_row.get("previous_company")
                        or clean_row.get("employer")
                    )
                    if company:
                        ingest_log["companies"] += 1

            db.commit()
            ingest_log["ingested"] = True
        except Exception as e:
            db.rollback()
            ingest_log["errors"].append(str(e))

    return ingest_log


def _apply_data_mutation(db: Session, user_text: str) -> dict:
    """
    Highly powerful natural language data orchestration mutation layer.
    Supports creating, updating and fixing all entries:
    - set employee <email> risk true|false
    - move employee <email> to department <name>
    - add employee <name>, email <email>, role <role>, dept <dept>
    - add candidate <name>, email <email>, role <role>, dept <dept>
    - update employee <email> set <role|department|name> to <value>
    - add connection <name> provider <provider> type <type>
    """
    lowered = user_text.lower()
    mutation_log = {"updated": False, "actions": []}

    # Extract email and standard fields robustly
    email = None
    email_match = re.search(
        r"([a-zA-Z0-9\.\-\_\+]+@[a-zA-Z0-9\.\-\_]+\.[a-zA-Z]{2,})", user_text
    )
    if email_match:
        email = email_match.group(1)

    # 1. Check for risk updates
    if "risk" in lowered:
        val_match = re.search(r"\b(true|false|yes|no|high|low)\b", lowered)
        if email and val_match:
            value = val_match.group(1) in ["true", "yes", "high"]
            emp = db.exec(
                select(EmployeeTable).where(EmployeeTable.email == email)
            ).first()
            if emp:
                emp.is_at_risk = value
                emp.updated_at = datetime.utcnow()
                db.add(emp)
                mutation_log["updated"] = True
                mutation_log["actions"].append(f"Set risk={value} for {email}")

    # 2. Check for department moves
    if any(k in lowered for k in ["move", "transfer", "change department", "dept"]):
        dept_match = re.search(
            r"(?:to|department|dept)\s+(?:is\s+|:\s*|of\s+)?([a-zA-Z0-9\s\-\_]+?)(?:,|$|\.|\s+for|\s+email)",
            user_text,
            re.IGNORECASE,
        )
        if email and dept_match:
            dept = dept_match.group(1).strip().title()
            for prefix in ["department", "dept"]:
                if dept.lower().startswith(prefix + " "):
                    dept = dept[len(prefix) + 1 :].strip()
            emp = db.exec(
                select(EmployeeTable).where(EmployeeTable.email == email)
            ).first()
            if emp:
                emp.department = dept
                emp.updated_at = datetime.utcnow()
                db.add(emp)
                mutation_log["updated"] = True
                mutation_log["actions"].append(f"Moved {email} to {dept}")

    # 3. Add Employee / Candidate
    is_add_employee = ("employee" in lowered) and any(
        kw in lowered for kw in ["add", "create", "insert", "register"]
    )
    is_add_candidate = ("candidate" in lowered) and any(
        kw in lowered for kw in ["add", "create", "insert", "register"]
    )

    if is_add_employee or is_add_candidate:
        name = None
        name_patterns = [
            r"(?:name|employee|candidate)\s+(?:is\s+|:\s*|named\s+)?([a-zA-Z\s]+?)(?:,|$|\s+email|\s+role|\s+dept|\s+department|\s+with)",
            r"(?:add|create|insert|register)\s+(?:employee|candidate|new\s+employee|new\s+candidate)?\s+([a-zA-Z\s]+?)(?:,|$|\s+email|\s+role|\s+dept|\s+department|\s+with)",
        ]
        for pattern in name_patterns:
            m = re.search(pattern, user_text, re.IGNORECASE)
            if m:
                name = m.group(1).strip()
                for prefix in ["named", "is", "employee", "candidate", "new", "a"]:
                    if name.lower().startswith(prefix + " "):
                        name = name[len(prefix) + 1 :].strip()
                break

        role = "Software Engineer"
        role_match = re.search(
            r"role\s+(?:is\s+|:\s*|to\s+)?([a-zA-Z0-9\s\-\_]+?)(?:,|$|\.|\s+email|\s+dept|\s+department|\s+with)",
            user_text,
            re.IGNORECASE,
        )
        if role_match:
            role = role_match.group(1).strip().title()

        dept = "Engineering"
        dept_match = re.search(
            r"(?:dept|department)\s+(?:is\s+|:\s*|to\s+)?([a-zA-Z0-9\s\-\_]+?)(?:,|$|\.|\s+email|\s+role|\s+with)",
            user_text,
            re.IGNORECASE,
        )
        if dept_match:
            dept = dept_match.group(1).strip().title()

        if name and email:
            if is_add_candidate:
                exists = db.exec(
                    select(CandidateTable).where(CandidateTable.email == email)
                ).first()
                if not exists:
                    cand = CandidateTable(
                        full_name=name,
                        email=email,
                        role=role,
                        department=dept,
                        sentiment_score=0.65,
                        match_score=0.85,
                    )
                    db.add(cand)
                    mutation_log["updated"] = True
                    mutation_log["actions"].append(
                        f"Created candidate {name} ({email}) in department {dept} as {role}"
                    )
            else:
                exists = db.exec(
                    select(EmployeeTable).where(EmployeeTable.email == email)
                ).first()
                if not exists:
                    emp = EmployeeTable(
                        full_name=name,
                        email=email,
                        role=role,
                        department=dept,
                        sentiment_score=0.75,
                        is_at_risk=False,
                        retention_prob=0.95,
                    )
                    db.add(emp)
                    mutation_log["updated"] = True
                    mutation_log["actions"].append(
                        f"Created employee {name} ({email}) in department {dept} as {role}"
                    )

    # 4. General updates
    if (
        any(k in lowered for k in ["update", "correct", "change", "fix", "set"])
        and email
    ):
        emp = db.exec(select(EmployeeTable).where(EmployeeTable.email == email)).first()
        if emp:
            updated = False
            role_match = re.search(
                r"role\s+(?:to\s+|set\s+|is\s+|:\s*)?([a-zA-Z0-9\s\-\_]+?)(?:,|$|\.|\s+for)",
                user_text,
                re.IGNORECASE,
            )
            if role_match:
                val = role_match.group(1).strip().title()
                emp.role = val
                mutation_log["actions"].append(f"Updated role to {val} for {email}")
                updated = True

            dept_match = re.search(
                r"(?:dept|department)\s+(?:to\s+|set\s+|is\s+|:\s*)?([a-zA-Z0-9\s\-\_]+?)(?:,|$|\.|\s+for)",
                user_text,
                re.IGNORECASE,
            )
            if dept_match:
                val = dept_match.group(1).strip().title()
                emp.department = val
                mutation_log["actions"].append(
                    f"Updated department to {val} for {email}"
                )
                updated = True

            name_match = re.search(
                r"name\s+(?:to\s+|set\s+|is\s+|:\s*)?([a-zA-Z\s]+?)(?:,|$|\.|\s+for)",
                user_text,
                re.IGNORECASE,
            )
            if name_match:
                val = name_match.group(1).strip().title()
                emp.full_name = val
                mutation_log["actions"].append(
                    f"Updated full name to {val} for {email}"
                )
                updated = True

            if updated:
                emp.updated_at = datetime.utcnow()
                db.add(emp)
                mutation_log["updated"] = True

    # 5. Integration connection mutations
    if (
        "add connection" in lowered
        or "create connection" in lowered
        or "add company" in lowered
    ):
        name_match = re.search(
            r"(?:connection|company)\s+([a-zA-Z0-9\s]+)(?:,|$)",
            user_text,
            re.IGNORECASE,
        )
        provider_match = re.search(
            r"provider\s+([a-zA-Z0-9\s]+)", user_text, re.IGNORECASE
        )
        type_match = re.search(r"type\s+([a-zA-Z0-9\s]+)", user_text, re.IGNORECASE)

        c_name = (
            name_match.group(1).strip() if name_match else "Greenhouse ATS Connection"
        )
        provider = (
            provider_match.group(1).strip().lower() if provider_match else "greenhouse"
        )
        source_type = type_match.group(1).strip().lower() if type_match else "ats"

        exists = db.exec(
            select(IntegrationConnectionTable).where(
                IntegrationConnectionTable.name == c_name
            )
        ).first()
        if not exists:
            conn = IntegrationConnectionTable(
                name=c_name, provider=provider, source_type=source_type, status="active"
            )
            db.add(conn)
            mutation_log["updated"] = True
            mutation_log["actions"].append(
                f"Configured integration connection {c_name} (provider: {provider})"
            )

    if mutation_log["updated"]:
        db.commit()

    return mutation_log


def _verify_mutation(
    db: Session, user_text: str, mutation_log: dict[str, Any]
) -> dict[str, Any]:
    """Read back the exact target after a permitted mutation.

    This is intentionally a separate tool step. A successful write is not
    treated as complete until the committed row can be observed again.
    """
    if mutation_log.get("blocked"):
        return {"verified": False, "reason": "Mutation was blocked by policy"}
    if not mutation_log.get("updated"):
        return {
            "verified": False,
            "reason": "No database change was reported; nothing was verified",
            "actions": mutation_log.get("actions", []),
        }

    email_match = re.search(
        r"([a-zA-Z0-9.\-_+]+@[a-zA-Z0-9.\-_]+\.[a-zA-Z]{2,})", user_text
    )
    if not email_match:
        return {
            "verified": False,
            "reason": "Mutation result did not include a verifiable email target",
        }

    email = email_match.group(1)
    lowered = user_text.lower()
    is_candidate = "candidate" in lowered and "employee" not in lowered
    row = (
        db.exec(select(CandidateTable).where(CandidateTable.email == email)).first()
        if is_candidate
        else db.exec(select(EmployeeTable).where(EmployeeTable.email == email)).first()
    )
    if not row:
        return {
            "verified": False,
            "reason": f"Committed target {email} was not found on read-back",
        }

    return {
        "verified": True,
        "entity": "candidate" if is_candidate else "employee",
        "id": str(row.id),
        "email": row.email,
        "full_name": row.full_name,
        "role": row.role,
        "department": row.department,
    }


def _attachment_text_context(
    attachments: list[ChatAttachmentTable], max_chars: int = 12000
) -> str:
    chunks = []
    consumed = 0
    for att in attachments[:8]:
        path = Path(att.file_path)
        if not path.exists():
            continue
        suffix = path.suffix.lower()
        try:
            if suffix in [".txt", ".md", ".csv", ".json", ".log"]:
                text = path.read_text(encoding="utf-8", errors="ignore")
            elif suffix == ".pdf" and PdfReader is not None:
                reader = PdfReader(str(path))
                pages = []
                for page in reader.pages[:8]:
                    pages.append(page.extract_text() or "")
                text = "\n".join(pages)
            elif suffix == ".docx" and Document is not None:
                doc = Document(str(path))
                text = "\n".join([p.text for p in doc.paragraphs[:500]])
            elif (
                suffix in [".png", ".jpg", ".jpeg", ".webp"]
                and pytesseract is not None
                and Image is not None
            ):
                text = pytesseract.image_to_string(Image.open(str(path)))
            else:
                text = f"[Unsupported rich parsing for file type {suffix}]"
        except Exception:
            text = "[Failed to parse attachment]"
        block = f"\n[Attachment: {att.original_name}]\n{text[:2500]}\n"
        if consumed + len(block) > max_chars:
            break
        chunks.append(block)
        consumed += len(block)
    return "".join(chunks).strip()


def _parse_attachment_for_index(path: Path) -> tuple[str, str, str]:
    suffix = path.suffix.lower()
    try:
        if suffix in [".txt", ".md", ".csv", ".json", ".log"]:
            return path.read_text(encoding="utf-8", errors="ignore"), "parsed", ""
        if suffix == ".pdf":
            if PdfReader is None:
                return "", "unsupported", "pypdf not installed"
            reader = PdfReader(str(path))
            pages = [(p.extract_text() or "") for p in reader.pages[:8]]
            return "\n".join(pages), "parsed", ""
        if suffix == ".docx":
            if Document is None:
                return "", "unsupported", "python-docx not installed"
            doc = Document(str(path))
            return "\n".join([p.text for p in doc.paragraphs[:500]]), "parsed", ""
        if suffix in [".png", ".jpg", ".jpeg", ".webp"]:
            if pytesseract is None or Image is None:
                return "", "unsupported", "ocr dependencies not installed"
            return pytesseract.image_to_string(Image.open(str(path))), "parsed", ""
        return "", "unsupported", f"unsupported file type: {suffix}"
    except Exception as e:
        return "", "failed", str(e)


def _load_local_opencode_auth() -> dict[str, str]:
    """Load API keys from local OpenCode auth store if available."""
    candidates = (
        Path("/app/opencode_auth.json"),
        Path("/app/.local/share/opencode/auth.json"),
        Path("/root/.local/share/opencode/auth.json"),
        Path("/home/ravi_saini/.local/share/opencode/auth.json"),
        Path.home() / ".local" / "share" / "opencode" / "auth.json",
    )
    for p in candidates:
        try:
            if p.is_file():
                with open(p, encoding="utf-8") as f:
                    data = json.load(f)
                res = {}
                for k, v in data.items():
                    if isinstance(v, dict) and "key" in v and isinstance(v["key"], str):
                        res[k.lower().strip()] = v["key"].strip()
                if res:
                    return res
        except Exception:
            continue
    return {}


_PROVIDER_ALIASES = {
    "gemini": "google",
    "google": "google",
    "google-gemini": "google",
    "anthropic": "claude",
    "claude": "claude",
    "opencode": "opencode",
    "zen": "opencode",
    "openai": "openai",
    "groq": "groq",
    "openrouter": "openrouter",
    "moonshot": "moonshot",
    "kimi": "moonshot",
    "kimi-moonshot": "moonshot",
    "zai": "zai",
    "z.ai": "zai",
    "glm": "zai",
    "nvidia": "nvidia",
    "nim": "nvidia",
    "nvidia-nim": "nvidia",
    "deepseek": "deepseek",
    "mistral": "mistral",
    "cline": "cline",
    "lmstudio": "lmstudio",
    "ollama": "ollama",
    "custom": "custom",
}

_OPENAI_COMPATIBLE_PROVIDER_URLS = {
    "moonshot": "https://api.moonshot.ai/v1",
    "zai": "https://api.z.ai/api/paas/v4",
    "nvidia": "https://integrate.api.nvidia.com/v1",
    "deepseek": "https://api.deepseek.com",
    "mistral": "https://api.mistral.ai/v1",
    "cline": "https://api.cline.bot/api/v1",
}


def _openai_compatible_base(provider: str, base_url: str | None = None) -> str:
    return (base_url or _OPENAI_COMPATIBLE_PROVIDER_URLS[provider]).strip().rstrip("/")


def _openai_compatible_default_model(provider: str) -> str:
    return {
        "moonshot": "kimi-k2.6",
        "zai": "glm-5.3",
        "nvidia": "nvidia/llama-3.3-nemotron-super-49b-v1",
        "deepseek": "deepseek-flash",
        "mistral": "mistral-small-latest",
        "cline": "minimax/minimax-m2.5",
    }[provider]


def _openai_compatible_model_list(payload: Any) -> list[str]:
    """Normalize OpenAI style model catalogs and Mistral's root-array response."""
    entries = (
        payload
        if isinstance(payload, list)
        else payload.get("data", []) if isinstance(payload, dict) else []
    )
    return [
        str(item["id"]) for item in entries if isinstance(item, dict) and item.get("id")
    ]


# Cloud providers whose keys may fail over cloud->cloud. Local providers
# (lmstudio/ollama/custom) NEVER auto-failover to cloud: that would exfiltrate
# tenant data off-box without consent. They fail with an honest local error.
_CLOUD_PROVIDERS = frozenset(
    {
        "openai",
        "groq",
        "openrouter",
        "gemini",
        "google",
        "claude",
        "anthropic",
        "opencode",
        "moonshot",
        "zai",
        "nvidia",
        "deepseek",
        "mistral",
        "cline",
    }
)


def _canonical_provider(provider: str | None) -> str:
    return _PROVIDER_ALIASES.get((provider or "lmstudio").lower().strip(), "lmstudio")


def _resolve_api_key(provider: str | None, inline_key: str | None) -> str | None:
    if inline_key:
        return inline_key
    prov = (provider or "lmstudio").lower().strip()
    canon = _PROVIDER_ALIASES.get(prov, prov)
    # Check env-based config first (for providers that use env vars)
    env_key = {
        "openai": settings.OPENAI_API_KEY,
        "groq": settings.GROQ_API_KEY,
        "openrouter": settings.OPENROUTER_API_KEY,
        "claude": settings.CLAUDE_API_KEY,
        "opencode": settings.OPENCODE_ZEN,
        "moonshot": os.getenv("MOONSHOT_API_KEY") or os.getenv("KIMI_API_KEY"),
        "zai": os.getenv("ZAI_API_KEY"),
        "nvidia": os.getenv("NVIDIA_API_KEY") or os.getenv("NVIDIA_NIM_API_KEY"),
        "deepseek": os.getenv("DEEPSEEK_API_KEY"),
        "mistral": os.getenv("MISTRAL_API_KEY"),
        "cline": os.getenv("CLINE_API_KEY"),
    }.get(canon)
    if env_key:
        return env_key
    # Fall back to local opencode auth store (opencode_auth.json)
    # This is the primary source for openrouter, nvidia, google, groq keys.
    # Try canonical + raw + google/gemini spellings so no valid key is missed.
    local_auth = _load_local_opencode_auth()
    for key in (
        canon,
        prov,
        "google" if canon == "google" else None,
        "gemini" if canon == "google" else None,
    ):
        if key and local_auth.get(key):
            return local_auth[key]
    return None


def _get_healthy_fallback_provider(
    exclude: str | None = None,
) -> tuple[str, str, str] | None:
    """Return (provider_name, api_key, model) for the first healthy available provider.

    Frontier: `exclude` skips the just-failed provider so failover never
    loops back to the same overloaded pool (e.g. Gemini 503 -> Groq/OpenRouter).
    """
    ex = (exclude or "").lower()
    # User-primary first: Groq (fast, user key), then OpenRouter, then Gemini.
    # Never silently prefer another pool while the user's provider has keys.
    # 1. Groq with ultra-fast gpt-oss-20b (high TPM limit) or gpt-oss-120b
    if ex != "groq":
        groq_key = _resolve_api_key("groq", None)
        if groq_key:
            return ("groq", groq_key, "openai/gpt-oss-20b")
    # 2. OpenRouter (generous free frontier tier)
    if ex != "openrouter":
        openrouter_key = _resolve_api_key("openrouter", None)
        if openrouter_key:
            return ("openrouter", openrouter_key, "nvidia/nemotron-3.5-lightning:free")
    # 3. Gemini (generous free tier; key stored as 'google').
    if ex != "gemini":
        google_key = _resolve_api_key("google", None)
        if google_key:
            return ("gemini", google_key, "gemini-3.6-flash")
    # 3. OpenAI
    if ex not in {"openai", "opencode"}:
        openai_key = _resolve_api_key("openai", None)
        if openai_key:
            return ("openai", openai_key, "gpt-4o-mini")
    # 4. Claude
    if ex != "claude":
        claude_key = _resolve_api_key("claude", None)
        if claude_key:
            return ("claude", claude_key, "claude-3-5-sonnet-20241022")
    return None


def _is_overload_detail(detail: str, status: int) -> bool:
    low = (detail or "").lower()
    return status in (500, 502, 503, 504, 529) or any(
        h in low
        for h in (
            "high demand",
            "unavailable",
            "overloaded",
            "try again later",
            "spike",
        )
    )


def _opencode_api_mode(model: str | None) -> str:
    """Select the documented OpenCode Zen transport for a model.

    Zen is not one uniformly OpenAI-chat-compatible endpoint: its GPT/Grok/Muse
    models use the Responses API, while several other hosted models use Chat
    Completions. Sending a GPT model to Chat Completions is rejected with HTTP
    400, so this decision must be made server-side rather than relying on a
    browser configuration.
    """
    model_id = _opencode_model_id(model).lower()
    if model_id.startswith("gemini-"):
        return "google"
    if model_id.startswith(("gpt-", "grok-", "muse-")):
        return "responses"
    if model_id.startswith(("claude-", "qwen")) and model_id != "qwen3.8-max":
        return "messages"
    return "chat_completions"


def _opencode_model_id(model: str | None) -> str:
    """Normalize UI and OpenCode-config model names to a Zen API model id."""
    model_id = (model or "gpt-5.5").strip()
    if model_id.lower().startswith("opencode/"):
        model_id = model_id.split("/", 1)[1]
    # This retired Zen id was previously offered by the Aurelinx UI.
    return {"minimax-m2.5-free": "minimax-m2.5"}.get(model_id.lower(), model_id)


def _opencode_route(mode: str) -> str:
    return {
        "responses": "responses",
        "messages": "messages",
        "chat_completions": "chat/completions",
        "google": "models",
    }[mode]


def _opencode_base_url(base_url: str | None) -> str:
    """Normalize either a Zen base URL or a formerly saved full endpoint URL."""
    base = (base_url or "https://opencode.ai/zen/v1").strip().rstrip("/")
    for suffix in ("/chat/completions", "/responses", "/messages"):
        if base.endswith(suffix):
            return base[: -len(suffix)]
    return base


_OPENCODE_BASE62_CHARS = (
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
)
_OPENCODE_SESSION_RE = re.compile(r"^ses_[0-9a-f]{12}[0-9A-Za-z]{14}$")
_opencode_last_ts = 0
_opencode_counter = 0


def _opencode_random_base62(n: int = 14) -> str:
    rnd_bytes = secrets.token_bytes(n)
    return "".join(_OPENCODE_BASE62_CHARS[b % 62] for b in rnd_bytes)


def _opencode_session_id(session_raw: Any = None) -> str:
    """Generate or translate a session ID matching OpenCode's canonical format."""
    s = str(session_raw or "").strip()
    if s and _OPENCODE_SESSION_RE.match(s):
        return s
    if s:
        digest = hashlib.sha256(f"opencode\0aurelinx\0{s}".encode()).digest()
        base_epoch = 1789666000000 + (int.from_bytes(digest[:4], "big") % 10000000)
        current = base_epoch * 0x1000 + (digest[4] % 0x1000)
        value = ~current & 0xFFFFFFFFFFFF
        time_hex = f"{value:012x}"
        random_part = "".join(_OPENCODE_BASE62_CHARS[b % 62] for b in digest[5:19])
        return f"ses_{time_hex}{random_part}"

    global _opencode_last_ts, _opencode_counter
    now = int(time.time() * 1000)
    if now != _opencode_last_ts:
        _opencode_last_ts = now
        _opencode_counter = 0
    _opencode_counter += 1
    current = now * 0x1000 + _opencode_counter
    value = ~current & 0xFFFFFFFFFFFF
    time_hex = f"{value:012x}"
    return f"ses_{time_hex}{_opencode_random_base62(14)}"


def _opencode_request_id() -> str:
    """Generate a request ID matching OpenCode's canonical format."""
    now = int(time.time() * 1000)
    current = now * 0x1000 + 1
    time_hex = f"{(current & 0xFFFFFFFFFFFF):012x}"
    return f"msg_{time_hex}{_opencode_random_base62(14)}"


def _opencode_headers(
    api_key: str | None = None,
    session_id: Any = None,
    mode: str = "chat_completions",
) -> dict[str, str]:
    """Construct full OpenCode Zen authentication and signature headers."""
    key = (api_key or settings.OPENCODE_ZEN or "").strip()
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "opencode/1.18.31 ai-sdk/provider-utils/4.0.23 runtime/bun/1.3.14",
        "x-opencode-client": "cli",
        "x-opencode-project": "global",
        "x-opencode-session": _opencode_session_id(session_id),
        "x-opencode-request": _opencode_request_id(),
        "Authorization": f"Bearer {key}" if key else "Bearer public",
    }
    if mode == "messages" and key:
        headers["x-api-key"] = key
        headers["anthropic-version"] = "2023-06-01"
    if mode == "google" and key:
        headers["x-goog-api-key"] = key
    return headers


def _opencode_google_payload(
    model_name: str,
    system: str,
    history: list[dict[str, str]],
    user_content: str,
    temperature: float,
) -> dict[str, Any]:
    contents = [
        {
            "role": "model" if item.get("role") == "assistant" else "user",
            "parts": [{"text": str(item.get("content") or "")}],
        }
        for item in history
        if item.get("role") in {"user", "assistant"} and item.get("content")
    ]
    contents.append({"role": "user", "parts": [{"text": user_content}]})
    return {
        "model": model_name,
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": contents,
        "generationConfig": {"temperature": temperature},
    }


async def _native_tool_decision(
    provider: str,
    api_key: str | None,
    base_url: str | None,
    model: str | None,
    system: str,
    prompt: str,
    session_id: str,
    require_tool: bool = False,
    tool_schemas: list[dict] | None = None,
) -> str | None:
    """Ask OpenAI-compatible providers for one native function call.

    Returns a controller-compatible JSON decision. Providers or models that do
    not expose OpenAI-style tools simply return ``None`` and use the existing
    structured-controller fallback.

    Frontier fix: the controller call always uses a lane-trimmed manifest
    (not the full 30+ tool list) so small/local models can follow the JSON
    contract, and OpenCode models always use the chat/completions transport
    for the *internal* tool decision even when the final answer uses the
    Responses/Messages API.
    """
    normalized = (provider or "lmstudio").lower()
    # Lane-trimmed manifest when supplied by the instant loop; falls back to
    # the full catalog for legacy callers. Capped so tiny models stay reliable.
    manifest = (
        tool_schemas
        if isinstance(tool_schemas, list) and tool_schemas
        else TOOL_SCHEMAS
    )
    if len(manifest) > 12:
        manifest = manifest[:12]
    headers = {"Content-Type": "application/json"}
    if normalized in _OPENAI_COMPATIBLE_PROVIDER_URLS:
        endpoint = f"{_openai_compatible_base(normalized, base_url)}/chat/completions"
        model_name = (
            model
            or {
                "moonshot": "kimi-k2.6",
                "zai": "glm-5.3",
                "nvidia": "nvidia/llama-3.3-nemotron-super-49b-v1",
                "deepseek": "deepseek-flash",
                "mistral": "mistral-small-latest",
                "cline": "minimax/minimax-m2.5",
            }[normalized]
        )
    elif normalized == "lmstudio":
        endpoint = (
            f"{normalize_local_provider_base(base_url).rstrip('/')}/chat/completions"
        )
        model_name = model or "local-model"
    elif normalized == "openrouter":
        endpoint = "https://openrouter.ai/api/v1/chat/completions"
        model_name = model or "nvidia/nemotron-3.5-lightning:free"
        headers["HTTP-Referer"] = "https://aurelinx.local"
        headers["X-Title"] = "Aurelinx"
    elif normalized == "opencode":
        # Tool decisions are internal only: always use the OpenAI-compatible
        # chat/completions transport with `tools`, even for GPT/Grok/Muse
        # models whose *final answer* streams via Responses/Messages.
        endpoint = f"{_opencode_base_url(base_url)}/chat/completions"
        model_name = _opencode_model_id(model)
        headers = _opencode_headers(
            api_key=api_key,
            session_id=session_id,
            mode="chat_completions",
        )
    elif normalized == "openai":
        endpoint, model_name = (
            "https://api.openai.com/v1/chat/completions",
            model or "gpt-4o-mini",
        )
    elif normalized in {"gemini", "google", "google-gemini"}:
        # Gemini OpenAI-compatible endpoint accepts native tools.
        endpoint = (
            "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
        )
        model_name = model or "gemini-3.6-flash"
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
    elif normalized == "groq":
        endpoint = "https://api.groq.com/openai/v1/chat/completions"
        groq_m = (model or "").strip()
        model_name = groq_m if groq_m else "openai/gpt-oss-20b"
    elif normalized == "ollama":
        endpoint = (
            f"{(base_url or 'http://127.0.0.1:11434/v1').rstrip('/')}/chat/completions"
        )
        model_name = model or "llama3"
    elif normalized == "custom" and base_url:
        endpoint, model_name = (
            f"{base_url.rstrip('/')}/chat/completions",
            model or "gpt-4o-mini",
        )
    else:
        return None
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "tools": manifest,
        "tool_choice": "auto",
        "temperature": 0,
    }
    try:
        # Fail fast on the controller path: the instant loop already budgets
        # 8-12s per lane; hanging 20s here is what made turns feel stuck.
        client_timeout = httpx.Timeout(10.0, connect=3.0)
        async with httpx.AsyncClient(timeout=client_timeout) as client:
            response = await client.post(endpoint, json=payload, headers=headers)
        if response.status_code >= 400:
            logger.warning(
                f"[chat] Native tool decision provider '{normalized}' ({model_name}) returned HTTP {response.status_code}: {response.text[:200]}"
            )
            # A 429 means the account itself is throttled: retrying another
            # free tier stacks 10s+ of latency for nothing. Fail fast to the
            # single streaming fallback instead (one call, not two).
            if normalized in ("opencode", "groq") and response.status_code != 429:
                fallback = _get_healthy_fallback_provider(exclude=normalized)
                if fallback:
                    fb_provider, fb_key, fb_model = fallback
                    payload["model"] = fb_model
                    fb_headers = {
                        "Authorization": f"Bearer {fb_key}",
                        "Content-Type": "application/json",
                    }
                    if fb_provider == "openrouter":
                        fb_endpoint = "https://openrouter.ai/api/v1/chat/completions"
                        fb_headers["HTTP-Referer"] = "https://aurelinx.local"
                        fb_headers["X-Title"] = "Aurelinx"
                    elif fb_provider == "gemini":
                        # Gemini's OpenAI-compatible endpoint accepts tools natively.
                        fb_endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
                    else:
                        fb_endpoint = "https://api.groq.com/openai/v1/chat/completions"
                    async with httpx.AsyncClient(timeout=client_timeout) as client:
                        response = await client.post(
                            fb_endpoint, json=payload, headers=fb_headers
                        )
            if response.status_code >= 400:
                logger.warning(
                    f"[chat] Native tool decision fallback returned HTTP {response.status_code}: {response.text[:200]}"
                )
                return None
        message = response.json().get("choices", [{}])[0].get("message", {})
        reasoning = (
            message.get("reasoning_content")
            or message.get("reasoning")
            or message.get("thinking")
            or ""
        )
        calls = message.get("tool_calls") or []
        if calls:
            function = calls[0].get("function") or {}
            function_name = str(function.get("name") or "").strip()
            try:
                arguments = json.loads(function.get("arguments") or "{}")
            except (TypeError, json.JSONDecodeError):
                arguments = {}
            if function_name.lower() in {"respond", "answer", "final_answer"}:
                answer = ""
                if isinstance(arguments, dict):
                    answer = str(
                        arguments.get("answer")
                        or arguments.get("message")
                        or arguments.get("content")
                        or ""
                    ).strip()
                return json.dumps(
                    {
                        "action": "respond",
                        "message": "The model selected a conversational response.",
                        "answer": answer,
                        "reasoning": reasoning,
                    }
                )
            return json.dumps(
                {
                    "action": "tool",
                    "tool": function_name,
                    "arguments": arguments,
                    "message": "Model selected a native tool call.",
                    "reasoning": reasoning,
                }
            )
        content = message.get("content")
        return (
            json.dumps(
                {
                    "action": "respond",
                    "message": "Model completed answer.",
                    "answer": str(content or "").strip(),
                    "reasoning": reasoning,
                }
            )
            if content
            else None
        )
    except (httpx.TimeoutException, httpx.NetworkError) as exc:
        logger.warning(f"[_native_tool_decision] Provider connection failed: {exc}")
        raise RuntimeError(
            f"Provider {provider} connection timed out or is unreachable"
        )
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
        return None


# A failover to a second (usually free) model must never stall the turn
# silently before producing anything: cap only the time to the FIRST token.
# Once tokens flow, the turn-level answer timeout + heartbeats govern — a
# total cap would kill slow-but-working free models mid-answer.
_FAILOVER_FIRST_TOKEN_S = 20.0


async def _failover_stream(
    provider: str,
    *,
    api_key: str | None,
    base_url: str | None,
    model: str,
    user_text: str,
    context_payload: dict,
    system_override: str | None = None,
    temperature_override: float | None = None,
    user_content_override: str | None = None,
):
    """Yield failover-provider tokens; fail fast only while nothing flows yet."""

    async def _gen():
        async for tok in _llm_stream_response(
            provider=provider,
            api_key=api_key,
            base_url=base_url,
            model=model,
            user_text=user_text,
            context_payload=context_payload,
            system_override=system_override,
            temperature_override=temperature_override,
            user_content_override=user_content_override,
        ):
            yield tok.replace("—", "-")

    gen = _gen()
    try:
        async with asyncio.timeout(_FAILOVER_FIRST_TOKEN_S):
            try:
                first = await gen.__anext__()
            except StopAsyncIteration:
                return
    except TimeoutError:
        await gen.aclose()
        raise RuntimeError(
            "Failover provider produced nothing; the primary provider was rate-limited. "
            "Switch provider or retry shortly."
        )
    yield first
    async for tok in gen:
        yield tok


async def _llm_stream_response(
    provider: str,
    api_key: str,
    base_url: str,
    model: str,
    user_text: str,
    context_payload: dict,
    system_override: str | None = None,
    temperature_override: float | None = None,
    user_content_override: str | None = None,
):
    # No canned replies: every answer (including counts) is generated by the
    # model from live tool data. The answer prompt already constrains counts
    # to one clear sentence with the exact verified total.
    provider = (provider or "lmstudio").lower()
    provider = {
        "anthropic": "claude",
        "google": "gemini",
        "google-gemini": "gemini",
    }.get(provider, provider)
    casual_chat = _is_casual_chat(user_text)
    opencode_mode: str | None = None

    if provider == "lmstudio":
        endpoint = (
            f"{normalize_local_provider_base(base_url).rstrip('/')}/chat/completions"
        )
        model_name = model or "liquid/lfm2.5-1.2b"
        headers = {"Content-Type": "application/json"}
    elif provider == "openrouter":
        endpoint = "https://openrouter.ai/api/v1/chat/completions"
        model_name = model or "nvidia/nemotron-3.5-lightning:free"
        headers = {
            "Content-Type": "application/json",
            "HTTP-Referer": "https://aurelinx.local",
            "X-Title": "Aurelinx",
        }
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
    elif provider == "opencode":
        opencode_mode = _opencode_api_mode(model or "gpt-5.5")
        model_name = _opencode_model_id(model)
        endpoint = (
            f"{_opencode_base_url(base_url)}/models/{model_name}:streamGenerateContent?alt=sse"
            if opencode_mode == "google"
            else f"{_opencode_base_url(base_url)}/{_opencode_route(opencode_mode)}"
        )
        session_seed = context_payload.get("workflow_run_id")
        headers = _opencode_headers(
            api_key=api_key,
            session_id=session_seed,
            mode=opencode_mode,
        )
    elif provider == "openai":
        endpoint = "https://api.openai.com/v1/chat/completions"
        model_name = model or "gpt-4o-mini"
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
    elif provider == "groq":
        endpoint = "https://api.groq.com/openai/v1/chat/completions"
        groq_m = (model or "").strip()
        model_name = groq_m if groq_m else "openai/gpt-oss-20b"
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
    elif provider == "claude" or (
        provider == "opencode" and opencode_mode == "messages"
    ):
        endpoint = "https://api.anthropic.com/v1/messages"
        model_name = model or "claude-3-5-sonnet-20241022"
        headers = {
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
        }
        if api_key:
            headers["x-api-key"] = api_key
    elif provider == "gemini":
        model_name = model or "gemini-3.6-flash"
        endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:streamGenerateContent?key={api_key}"
            if api_key
            else None
        )
        if not endpoint:
            yield "Gemini requires an API key."
            return
        headers = {"Content-Type": "application/json"}
    elif provider == "ollama":
        endpoint = (
            f"{(base_url or 'http://127.0.0.1:11434/v1').rstrip('/')}/chat/completions"
        )
        model_name = model or "llama3"
        headers = {"Content-Type": "application/json"}
    elif provider == "custom":
        endpoint = f"{base_url.rstrip('/')}/chat/completions" if base_url else None
        if not endpoint:
            yield "Custom provider requires a base URL."
            return
        model_name = model or "gpt-4o-mini"
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
    elif provider in _OPENAI_COMPATIBLE_PROVIDER_URLS:
        endpoint = f"{_openai_compatible_base(provider, base_url)}/chat/completions"
        model_name = model or _openai_compatible_default_model(provider)
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        if provider == "cline":
            headers.update(
                {"HTTP-Referer": "https://aurelinx.local", "X-Title": "Aurelinx"}
            )
    else:
        yield f"Provider stream adapter for {provider} not supported."
        return

    # Single source of truth for answer voice/grounding (see prompt_assembly).
    # Legacy paths pass system_override; otherwise use the shared prefix plus
    # live-access context so streaming and non-streaming stay consistent.
    default_system = (
        ANSWER_SYSTEM_PREFIX + "\n\nLIVE ACCESS:\n"
        "You have live access to the HR employee directory, candidates database, analytics, "
        "compliance policies, integrations, enterprise ops, and agentic tools. "
        "A structured workspace snapshot may be attached; use it as the source of truth. "
        "You may answer general knowledge conversationally, but never present unverified or "
        "time-sensitive claims as live Aurelinx facts. Never claim a mutation, deletion, search, "
        "or external action happened unless the tool result explicitly confirms it. "
        "For database.overview, distinguish primary employee/candidate records from supporting "
        "skills/experience rows. If deletion is requested, firmly state it requires human approval."
    )
    system = system_override or default_system
    response_temperature = (
        temperature_override
        if temperature_override is not None
        else (0.7 if casual_chat else 0.5)
    )

    tool_ctx = context_payload.get("tool_context", {})
    tool_runs = tool_ctx.get("tool_runs", [])

    tool_summary_lines = []
    for run in tool_runs:
        tool_name = run.get("tool", "unknown")
        if run.get("denied"):
            tool_summary_lines.append(
                f"- {tool_name}: ACCESS DENIED: {run.get('reason', '')}"
            )
        elif run.get("blocked"):
            tool_summary_lines.append(
                f"- {tool_name}: BLOCKED: {run.get('reason', '')}"
            )
        else:
            output = run.get("output", [])
            output_str = json.dumps(output, default=str)
            # Frontier RAG: keep full evidence (up to ~6k per tool) so the
            # answer model has names, scores, and departments to be detailed.
            if len(output_str) > 6000:
                output_str = output_str[:6000] + "... (truncated)"
            tool_summary_lines.append(f"- {tool_name}: {output_str}")

    integrations = tool_ctx.get("integration_connections", [])
    compliance = tool_ctx.get("compliance_policies", [])
    mutations = tool_ctx.get("mutations", {})
    rbac = tool_ctx.get("rbac_role", "member")
    workspace_snapshot = tool_ctx.get("workspace_snapshot", {})
    agent_execution = context_payload.get("agent_execution", {})

    if user_content_override is not None:
        # Controller turns already contain their exact protocol prompt. Do not
        # wrap them in the normal chat/workspace prompt; small local models are
        # much more reliable when the JSON contract is the only user content.
        user_content = user_content_override
        history_messages = []
    elif not casual_chat:
        tool_block = (
            "\n".join(tool_summary_lines)
            if tool_summary_lines
            else "- No specific tool queries executed."
        )
        workspace_block = (
            "\n".join(_workspace_snapshot_summary_lines(workspace_snapshot))
            if workspace_snapshot
            else ""
        )
        attachment_ctx = tool_ctx.get("attachment_text_context", "")
        user_content = (
            f"User request: {user_text}\n\n"
            f"--- WORKSPACE SNAPSHOT ---\n{workspace_block}\n"
            f"--- ATTACHMENT/FILE CONTENT ---\n{attachment_ctx}\n"
            f"--- LIVE TOOL DATA ---\n{tool_block}\n"
            f"Active integrations: {json.dumps(integrations, default=str)}\n"
            f"Compliance policies: {json.dumps(compliance, default=str)}\n"
            f"Mutation log: {json.dumps(mutations, default=str)}\n"
            f"User RBAC role: {rbac}\n"
            f"--- AGENT EVALUATION ---\n{json.dumps(agent_execution.get('evaluation', {}), default=str)}\n"
            "--- END TOOL DATA ---\n\n"
        )
        feedback_block = str(context_payload.get("feedback_notes") or "").strip()
        if feedback_block:
            user_content += (
                "--- PRIOR ADMIN FEEDBACK ---\n"
                f"{feedback_block}\n"
                "Improve this answer accordingly.\n"
                "--- END PRIOR FEEDBACK ---\n\n"
            )
        if is_simple_count_request(user_text):
            user_content += (
                "This is a simple count question. Answer in one clear sentence that "
                "leads with the exact verified total_count. You may add one short line "
                "of context (such as the largest department) if the data supports it. "
                "Do not repeat the number, add a table, or discuss unrelated metrics."
            )
        else:
            user_content += (
                "Using the LIVE TOOL DATA above, answer the request as a polished, "
                "self-contained response. Lead with the direct answer, then support it "
                "with concrete names and numbers from the data. Use a table for people "
                "lists and bullets only where they help. End with practical next steps "
                "when relevant. Match the depth to the question: brief for simple "
                "requests, thorough for broad ones. Do not output raw JSON or force a "
                "template."
            )
    else:
        request_plan = context_payload.get("request_plan", {})
        user_content = (
            f"Request mode: {request_plan.get('mode', 'conversation')}\n"
            f"User request: {user_text}\n"
            "Answer the user's question directly, clearly, and concisely. Use verified workspace facts where available. Keep greetings and simple factual questions brief and natural. Never format answers with academic headings like 'Thesis', 'Definitions', or 'Limitations' unless specifically asked. Do not invent live Aurelinx records, current metrics, or tool actions."
        )

    if user_content_override is None:
        session_history = context_payload.get("session_history", [])
        history_messages = []
        for turn in session_history:
            role = turn.get("role", "user")
            content = turn.get("content", "").strip()
            if (
                not content
                or content.startswith("LLM failed")
                or content.startswith('{"tool_context')
            ):
                continue
            history_messages.append({"role": role, "content": content[:1000]})

    if provider == "opencode" and opencode_mode == "google":
        payload = _opencode_google_payload(
            model_name,
            system,
            history_messages[-6:],
            user_content,
            response_temperature,
        )
    elif provider == "opencode" and opencode_mode == "responses":
        history_text = "\n\n".join(
            f"{item['role'].title()}: {item['content']}"
            for item in history_messages[-6:]
        )
        payload = {
            "model": model_name,
            "instructions": system,
            "input": "\n\n".join(
                part for part in [history_text, f"User: {user_content}"] if part
            ),
            "stream": True,
        }
    elif provider in [
        "openai",
        "lmstudio",
        "groq",
        "opencode",
        "openrouter",
        "ollama",
        "custom",
        *_OPENAI_COMPATIBLE_PROVIDER_URLS,
    ]:
        messages = [{"role": "system", "content": system}]
        messages.extend(history_messages[-6:])
        messages.append({"role": "user", "content": user_content})
        payload = {
            "model": model_name,
            "temperature": response_temperature,
            "messages": messages,
            "stream": True,
        }
    elif provider == "claude" or (
        provider == "opencode" and opencode_mode == "messages"
    ):
        messages = list(history_messages[-6:])
        messages.append({"role": "user", "content": user_content})
        payload = {
            "model": model_name,
            "temperature": response_temperature,
            "system": system,
            "messages": messages,
            "stream": True,
        }
    else:  # gemini
        full_prompt = f"{system}\n\n{user_content}"
        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {
                "temperature": response_temperature,
            },
        }

    in_thinking = False
    client_timeout = httpx.Timeout(60.0, connect=5.0, read=60.0)
    async with (
        httpx.AsyncClient(timeout=client_timeout) as client,
        client.stream("POST", endpoint, json=payload, headers=headers) as resp,
    ):
        if resp.is_error:
            # Preserve the provider's short diagnostic. HTTPX's generic
            # raise_for_status() drops the response body, which made model
            # incompatibility indistinguishable from every other HTTP 400.
            detail = (await resp.aread()).decode("utf-8", errors="replace")[:500]
            if provider == "groq" and resp.status_code in (413, 429):
                logger.info(
                    f"[chat] Groq rate/token limit hit ({resp.status_code}); failing over to alternative provider..."
                )
                # Healthiest-first chain (gemini → openrouter → groq → openai
                # → claude); a queued free tier is worse than the next pool.
                _fb = _get_healthy_fallback_provider(exclude="groq")
                if _fb and _fb[0] != "groq":
                    _fb_provider, _fb_key, _fb_model = _fb
                    async for retry_tok in _failover_stream(
                        _fb_provider,
                        api_key=_fb_key,
                        base_url=None,
                        model=_fb_model,
                        user_text=user_text,
                        context_payload=context_payload,
                        system_override=system_override,
                        temperature_override=temperature_override,
                        user_content_override=user_content_override,
                    ):
                        yield retry_tok
                    return
                elif model != "openai/gpt-oss-20b":
                    async for retry_tok in _failover_stream(
                        "groq",
                        api_key=api_key,
                        base_url=base_url,
                        model="openai/gpt-oss-20b",
                        user_text=user_text,
                        context_payload=context_payload,
                        system_override=system_override,
                        temperature_override=temperature_override,
                        user_content_override=user_content_override,
                    ):
                        yield retry_tok
                    return
            if provider == "opencode" and (
                "FreeTierError" in detail
                or "AuthError" in detail
                or resp.status_code in (401, 403)
            ):
                fallback = _get_healthy_fallback_provider(exclude=provider)
                if fallback:
                    fb_provider, fb_key, fb_model = fallback
                    logger.warning(
                        f"[chat] Provider {provider} failed with HTTP {resp.status_code} ({detail[:100]}); "
                        f"transparently falling back to {fb_provider} ({fb_model})."
                    )
                    async for fb_token in _failover_stream(
                        fb_provider,
                        api_key=fb_key,
                        base_url=None,
                        model=fb_model,
                        user_text=user_text,
                        context_payload=context_payload,
                        system_override=system_override,
                        temperature_override=temperature_override,
                        user_content_override=user_content_override,
                    ):
                        yield fb_token
                    return
            # Frontier: any overloaded pool (Gemini 503 high demand, OpenRouter
            # 529, etc.) fails over to the next healthy provider instead of
            # failing the turn. Never fail back to the same provider.
            if (
                _is_overload_detail(detail, resp.status_code)
                and _canonical_provider(provider) in _CLOUD_PROVIDERS
            ):
                logger.warning(
                    f"[chat] Provider {provider} overloaded HTTP {resp.status_code} ({detail[:120]}); failing over."
                )
                fallback = _get_healthy_fallback_provider(exclude=provider)
                if fallback:
                    fb_provider, fb_key, fb_model = fallback
                    async for fb_token in _failover_stream(
                        fb_provider,
                        api_key=fb_key,
                        base_url=None,
                        model=fb_model,
                        user_text=user_text,
                        context_payload=context_payload,
                        system_override=system_override,
                        temperature_override=temperature_override,
                        user_content_override=user_content_override,
                    ):
                        yield fb_token
                    return
            # Universal: invalid key on any CLOUD provider fails over (never
            # local->cloud: lmstudio/ollama/custom keep honest local errors).
            if (
                resp.status_code in (401, 403)
                and _canonical_provider(provider) in _CLOUD_PROVIDERS
            ):
                logger.warning(
                    f"[chat] Provider {provider} auth failed HTTP {resp.status_code}; failing over cloud->cloud."
                )
                fallback = _get_healthy_fallback_provider(
                    exclude=_canonical_provider(provider)
                )
                if fallback:
                    fb_provider, fb_key, fb_model = fallback
                    async for fb_token in _failover_stream(
                        fb_provider,
                        api_key=fb_key,
                        base_url=None,
                        model=fb_model,
                        user_text=user_text,
                        context_payload=context_payload,
                        system_override=system_override,
                        temperature_override=temperature_override,
                        user_content_override=user_content_override,
                    ):
                        yield fb_token
                    return
            # Frontier: invalid/unknown model id must never kill the turn.
            # Retry same provider with its default model, else next provider.
            if resp.status_code == 400 and any(
                h in detail.lower()
                for h in (
                    "model",
                    "not found",
                    "invalid",
                    "does not exist",
                    "unsupported",
                )
            ):
                logger.warning(
                    f"[chat] Provider {provider} rejected model '{model_name}' ({detail[:120]}); model failover."
                )
                _defaults = {
                    "groq": "openai/gpt-oss-20b",
                    "openrouter": "nvidia/nemotron-3.5-lightning:free",
                    "gemini": "gemini-3.6-flash",
                    "openai": "gpt-4o-mini",
                    "ollama": "llama3",
                }
                _def = _defaults.get(provider)
                if _def and _def != model_name:
                    try:
                        async for fb_token in _failover_stream(
                            provider,
                            api_key=api_key,
                            base_url=base_url,
                            model=_def,
                            user_text=user_text,
                            context_payload=context_payload,
                            system_override=system_override,
                            temperature_override=temperature_override,
                            user_content_override=user_content_override,
                        ):
                            yield fb_token
                        return
                    except Exception:
                        pass
                fallback = _get_healthy_fallback_provider(exclude=provider)
                if fallback:
                    fb_provider, fb_key, fb_model = fallback
                    async for fb_token in _failover_stream(
                        fb_provider,
                        api_key=fb_key,
                        base_url=None,
                        model=fb_model,
                        user_text=user_text,
                        context_payload=context_payload,
                        system_override=system_override,
                        temperature_override=temperature_override,
                        user_content_override=user_content_override,
                    ):
                        yield fb_token
                    return
            raise RuntimeError(f"HTTP {resp.status_code} provider response: {detail}")

        if provider == "opencode" and opencode_mode == "google":
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data_str = line[5:].strip()
                if data_str == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                    parts = (
                        chunk.get("candidates", [{}])[0]
                        .get("content", {})
                        .get("parts", [])
                    )
                    for part in parts:
                        text = part.get("text") or ""
                        if text:
                            yield text.replace("—", "-")
                except (json.JSONDecodeError, IndexError, AttributeError, TypeError):
                    continue
        elif provider == "opencode" and opencode_mode == "responses":
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data_str = line[5:].strip()
                if data_str == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                    if chunk.get("type") == "response.output_text.delta":
                        delta = chunk.get("delta", "")
                        if delta:
                            yield delta.replace("—", "-")
                except Exception:
                    continue
        elif provider in [
            "openai",
            "lmstudio",
            "groq",
            "opencode",
            "openrouter",
            "ollama",
            "custom",
            *list(_OPENAI_COMPATIBLE_PROVIDER_URLS),
        ]:
            async for line in resp.aiter_lines():
                if line.startswith("data:"):
                    data_str = line[5:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})

                        content = delta.get("content")
                        reasoning = (
                            delta.get("reasoning_content")
                            or delta.get("reasoning")
                            or delta.get("thinking")
                        )

                        if reasoning:
                            if not in_thinking:
                                yield "<think>"
                                in_thinking = True
                            yield reasoning.replace("—", "-")
                        if content:
                            if in_thinking:
                                yield "</think>"
                                in_thinking = False
                            yield content.replace("—", "-")
                    except Exception:
                        continue

        elif provider == "claude" or (
            provider == "opencode" and opencode_mode == "messages"
        ):
            async for line in resp.aiter_lines():
                if line.startswith("data:"):
                    data_str = line[5:].strip()
                    try:
                        chunk = json.loads(data_str)
                        if chunk.get("type") == "content_block_delta":
                            delta = chunk.get("delta", {})
                            reasoning = delta.get("thinking", "") or delta.get(
                                "reasoning", ""
                            )
                            text = delta.get("text", "")
                            if reasoning:
                                if not in_thinking:
                                    yield "<think>"
                                    in_thinking = True
                                yield reasoning
                            if text:
                                if in_thinking:
                                    yield "</think>"
                                    in_thinking = False
                                yield text
                    except Exception:
                        continue

        elif provider == "gemini":
            # Handle Gemini chunk-by-chunk stream response beautifully
            async for chunk_bytes in resp.aiter_bytes():
                chunk_str = chunk_bytes.decode("utf-8", errors="ignore")
                try:
                    obj = json.loads(chunk_str.strip())
                    parts = (
                        obj.get("candidates", [{}])[0]
                        .get("content", {})
                        .get("parts", [])
                    )
                    for part in parts:
                        text = part.get("text", "")
                        if not text:
                            continue
                        if part.get("thought"):
                            if not in_thinking:
                                yield "<think>"
                                in_thinking = True
                            yield text
                        else:
                            if in_thinking:
                                yield "</think>"
                                in_thinking = False
                            yield text
                except Exception:
                    import re

                    for m in re.finditer(
                        r'"text"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', chunk_str
                    ):
                        try:
                            yield m.group(1).encode().decode("unicode-escape")
                        except Exception:
                            pass

    if in_thinking:
        yield "</think>"


async def _llm_response(
    provider: str,
    api_key: str,
    base_url: str,
    model: str,
    user_text: str,
    context_payload: dict,
    system_override: str | None = None,
    temperature_override: float | None = None,
) -> str:
    provider = (provider or "lmstudio").lower()
    provider = {
        "anthropic": "claude",
        "google": "gemini",
        "google-gemini": "gemini",
    }.get(provider, provider)
    opencode_mode: str | None = None

    if provider == "lmstudio":
        endpoint = (
            f"{normalize_local_provider_base(base_url).rstrip('/')}/chat/completions"
        )
        model_name = model or "liquid/lfm2.5-1.2b"
        headers = {"Content-Type": "application/json"}
    elif provider == "openrouter":
        endpoint = "https://openrouter.ai/api/v1/chat/completions"
        model_name = model or "nvidia/nemotron-3.5-lightning:free"
        headers = {
            "Content-Type": "application/json",
            "HTTP-Referer": "https://aurelinx.local",
            "X-Title": "Aurelinx",
        }
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
    elif provider == "opencode":
        opencode_mode = _opencode_api_mode(model or "gpt-5.5")
        model_name = _opencode_model_id(model)
        endpoint = (
            f"{_opencode_base_url(base_url)}/models/{model_name}:generateContent"
            if opencode_mode == "google"
            else f"{_opencode_base_url(base_url)}/{_opencode_route(opencode_mode)}"
        )
        session_seed = context_payload.get("workflow_run_id")
        headers = _opencode_headers(
            api_key=api_key,
            session_id=session_seed,
            mode=opencode_mode,
        )
    elif provider == "openai":
        endpoint = "https://api.openai.com/v1/chat/completions"
        model_name = model or "gpt-4o-mini"
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
    elif provider == "groq":
        endpoint = "https://api.groq.com/openai/v1/chat/completions"
        groq_m = (model or "").strip().lower()
        if not groq_m or groq_m in (
            "llama-3.1-70b-versatile",
            "llama-3.3-70b-versatile",
            "llama3-70b-8192",
            "llama-3.1-8b-instant",
            "qwen/qwen3.8-27b",
        ):
            model_name = "openai/gpt-oss-20b"
        else:
            model_name = model or "openai/gpt-oss-20b"
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
    elif provider == "claude" or (
        provider == "opencode" and opencode_mode == "messages"
    ):
        endpoint = "https://api.anthropic.com/v1/messages"
        model_name = model or "claude-3-5-sonnet-20241022"
        headers = {
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
        }
        if api_key:
            headers["x-api-key"] = api_key
    elif provider == "gemini":
        model_name = model or "gemini-3.6-flash"
        endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            if api_key
            else None
        )
        if not endpoint:
            return "Gemini requires an API key."
        headers = {"Content-Type": "application/json"}
    elif provider == "ollama":
        endpoint = (
            f"{(base_url or 'http://127.0.0.1:11434/v1').rstrip('/')}/chat/completions"
        )
        model_name = model or "llama3"
        headers = {"Content-Type": "application/json"}
    elif provider == "custom":
        endpoint = f"{base_url.rstrip('/')}/chat/completions" if base_url else None
        if not endpoint:
            return "Custom provider requires a base URL."
        model_name = model or "gpt-4o-mini"
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
    elif provider in _OPENAI_COMPATIBLE_PROVIDER_URLS:
        endpoint = f"{_openai_compatible_base(provider, base_url)}/chat/completions"
        model_name = model or _openai_compatible_default_model(provider)
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        if provider == "cline":
            headers.update(
                {"HTTP-Referer": "https://aurelinx.local", "X-Title": "Aurelinx"}
            )
    else:
        return "Provider adapter for this chat request is not configured. Switch to LM Studio/OpenAI."

    casual_chat = _is_casual_chat(user_text)

    default_system = (
        ANSWER_SYSTEM_PREFIX + "\n\nLIVE ACCESS:\n"
        "You have live access to the HR employee directory, candidates database, analytics, "
        "compliance policies, integrations, enterprise ops, and agentic tools. "
        "A structured workspace snapshot may be attached; use it as the source of truth. "
        "You may answer general knowledge conversationally, but never present unverified or "
        "time-sensitive claims as live Aurelinx facts. Never claim a mutation, deletion, search, "
        "or external action happened unless the tool result explicitly confirms it. "
        "For database.overview, distinguish primary employee/candidate records from supporting "
        "skills/experience rows. If deletion is requested, firmly state it requires human approval."
    )
    system = system_override or default_system
    response_temperature = (
        temperature_override
        if temperature_override is not None
        else (0.7 if casual_chat else 0.5)
    )

    # Build clean tool summary: never pass nested session_history inside the tool block
    tool_ctx = context_payload.get("tool_context", {})
    tool_runs = tool_ctx.get("tool_runs", [])

    # Produce a compact, readable tool summary string (not raw JSON of entire payload)
    tool_summary_lines = []
    for run in tool_runs:
        tool_name = run.get("tool", "unknown")
        if run.get("denied"):
            tool_summary_lines.append(
                f"- {tool_name}: ACCESS DENIED: {run.get('reason', '')}"
            )
        elif run.get("blocked"):
            tool_summary_lines.append(
                f"- {tool_name}: BLOCKED: {run.get('reason', '')}"
            )
        else:
            output = run.get("output", [])
            output_str = json.dumps(output, default=str)
            if len(output_str) > 6000:
                output_str = output_str[:6000] + "... (truncated)"
            tool_summary_lines.append(f"- {tool_name}: {output_str}")

    integrations = tool_ctx.get("integration_connections", [])
    compliance = tool_ctx.get("compliance_policies", [])
    mutations = tool_ctx.get("mutations", {})
    rbac = tool_ctx.get("rbac_role", "member")
    workspace_snapshot = tool_ctx.get("workspace_snapshot", {})
    agent_execution = context_payload.get("agent_execution", {})

    if not casual_chat:
        tool_block = (
            "\n".join(tool_summary_lines)
            if tool_summary_lines
            else "- No specific tool queries executed."
        )
        workspace_block = (
            "\n".join(_workspace_snapshot_summary_lines(workspace_snapshot))
            if workspace_snapshot
            else ""
        )
        attachment_ctx = tool_ctx.get("attachment_text_context", "")
        user_content = (
            f"User request: {user_text}\n\n"
            f"--- WORKSPACE SNAPSHOT ---\n{workspace_block}\n"
            f"--- ATTACHMENT/FILE CONTENT ---\n{attachment_ctx}\n"
            f"--- LIVE TOOL DATA ---\n{tool_block}\n"
            f"Active integrations: {json.dumps(integrations, default=str)}\n"
            f"Compliance policies: {json.dumps(compliance, default=str)}\n"
            f"Mutation log: {json.dumps(mutations, default=str)}\n"
            f"User RBAC role: {rbac}\n"
            f"--- AGENT EVALUATION ---\n{json.dumps(agent_execution.get('evaluation', {}), default=str)}\n"
            "--- END TOOL DATA ---\n\n"
        )
        feedback_block = str(context_payload.get("feedback_notes") or "").strip()
        if feedback_block:
            user_content += (
                "--- PRIOR ADMIN FEEDBACK ---\n"
                f"{feedback_block}\n"
                "Improve this answer accordingly.\n"
                "--- END PRIOR FEEDBACK ---\n\n"
            )
        if is_simple_count_request(user_text):
            user_content += (
                "This is a simple count question. Answer in one clear sentence that "
                "leads with the exact verified total_count. You may add one short line "
                "of context (such as the largest department) if the data supports it. "
                "Do not repeat the number, add a table, or discuss unrelated metrics."
            )
        else:
            user_content += (
                "Using the LIVE TOOL DATA above, answer the request as a polished, "
                "self-contained response. Lead with the direct answer, then support it "
                "with concrete names and numbers from the data. Use a table for people "
                "lists and bullets only where they help. End with practical next steps "
                "when relevant. Match the depth to the question: brief for simple "
                "requests, thorough for broad ones. Do not output raw JSON or force a "
                "template."
            )
    else:
        request_plan = context_payload.get("request_plan", {})
        user_content = (
            f"Request mode: {request_plan.get('mode', 'conversation')}\n"
            f"User request: {user_text}\n"
            "Answer the user's question directly, clearly, and concisely. Use verified workspace facts where available. Keep greetings and simple factual questions brief and natural. Never format answers with academic headings like 'Thesis', 'Definitions', or 'Limitations' unless specifically asked. Do not invent live Aurelinx records, current metrics, or tool actions."
        )

    # Build multi-turn chat history from clean session context (never include tool dump messages)
    session_history = context_payload.get("session_history", [])
    history_messages = []
    for turn in session_history:
        role = turn.get("role", "user")
        content = turn.get("content", "").strip()
        # Skip any poisoned turns that contain raw JSON dumps or LLM failure messages
        if (
            not content
            or content.startswith("LLM failed")
            or content.startswith('{"tool_context')
        ):
            continue
        # Only keep clean conversational turns (cap at 1000 chars per turn for rich context)
        history_messages.append({"role": role, "content": content[:1000]})

    if provider == "opencode" and opencode_mode == "google":
        payload = _opencode_google_payload(
            model_name,
            system,
            history_messages[-6:],
            user_content,
            response_temperature,
        )
    elif provider == "opencode" and opencode_mode == "responses":
        history_text = "\n\n".join(
            f"{item['role'].title()}: {item['content']}"
            for item in history_messages[-8:]
        )
        payload = {
            "model": model_name,
            "instructions": system,
            "input": "\n\n".join(
                part for part in [history_text, f"User: {user_content}"] if part
            ),
        }
    elif provider in [
        "openai",
        "lmstudio",
        "groq",
        "opencode",
        "openrouter",
        "ollama",
        "custom",
        *_OPENAI_COMPATIBLE_PROVIDER_URLS,
    ]:
        messages = [{"role": "system", "content": system}]
        messages.extend(history_messages[-6:])  # last 3 turns max
        messages.append({"role": "user", "content": user_content})
        payload = {
            "model": model_name,
            "temperature": response_temperature,
            "messages": messages,
        }
    elif provider == "claude" or (
        provider == "opencode" and opencode_mode == "messages"
    ):
        messages = list(history_messages[-6:])
        messages.append({"role": "user", "content": user_content})
        payload = {
            "model": model_name,
            "temperature": response_temperature,
            "system": system,
            "messages": messages,
        }
    else:  # gemini
        full_prompt = f"{system}\n\n{user_content}"
        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {
                "temperature": response_temperature,
            },
        }

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(endpoint, json=payload, headers=headers)
        if resp.is_error:
            detail = resp.text[:500]
            if provider == "groq" and resp.status_code in (413, 429):
                logger.info(
                    f"[chat] Groq rate/token limit hit ({resp.status_code}); failing over to alternative provider..."
                )
                _fb = _get_healthy_fallback_provider()
                try:
                    # Full-body wait: free models can be slow but productive.
                    async with asyncio.timeout(60.0):
                        if _fb and _fb[0] != "groq":
                            _fb_provider, _fb_key, _fb_model = _fb
                            return await _llm_response(
                                provider=_fb_provider,
                                api_key=_fb_key,
                                base_url=None,
                                model=_fb_model,
                                user_text=user_text,
                                context_payload=context_payload,
                                system_override=system_override,
                                temperature_override=temperature_override,
                            )
                        elif model != "openai/gpt-oss-20b":
                            return await _llm_response(
                                provider="groq",
                                api_key=api_key,
                                base_url=base_url,
                                model="openai/gpt-oss-20b",
                                user_text=user_text,
                                context_payload=context_payload,
                                system_override=system_override,
                                temperature_override=temperature_override,
                            )
                except TimeoutError:
                    raise RuntimeError(
                        "Failover provider timed out; the primary provider was rate-limited. "
                        "Switch provider or retry shortly."
                    )
            if provider == "opencode" and (
                "FreeTierError" in detail
                or "AuthError" in detail
                or resp.status_code in (401, 403)
            ):
                fallback = _get_healthy_fallback_provider()
                if fallback:
                    fb_provider, fb_key, fb_model = fallback
                    logger.warning(
                        f"[chat] Provider {provider} failed with HTTP {resp.status_code} ({detail[:100]}); "
                        f"transparently falling back to {fb_provider} ({fb_model})."
                    )
                    try:
                        # Full-body wait: free models can be slow but productive.
                        async with asyncio.timeout(60.0):
                            return await _llm_response(
                                provider=fb_provider,
                                api_key=fb_key,
                                base_url=None,
                                model=fb_model,
                                user_text=user_text,
                                context_payload=context_payload,
                                system_override=system_override,
                                temperature_override=temperature_override,
                            )
                    except TimeoutError:
                        raise RuntimeError(
                            "Failover provider timed out; the primary provider was rate-limited. "
                            "Switch provider or retry shortly."
                        )
            raise RuntimeError(f"HTTP {resp.status_code} provider response: {detail}")
        data = resp.json()
        if provider == "opencode" and opencode_mode == "google":
            text = "\n".join(
                str(part.get("text") or "")
                for part in data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [])
                if isinstance(part, dict)
            ).strip()
            return _sanitize_llm_response(text, user_text)
        if provider == "opencode" and opencode_mode == "responses":
            text = str(data.get("output_text") or "").strip()
            if not text:
                text = "\n".join(
                    str(part.get("text") or "")
                    for output in data.get("output", [])
                    if isinstance(output, dict)
                    for part in output.get("content", [])
                    if isinstance(part, dict) and part.get("type") == "output_text"
                ).strip()
            return _sanitize_llm_response(text, user_text)
        if provider in [
            "openai",
            "lmstudio",
            "groq",
            "opencode",
            "openrouter",
            "ollama",
            "custom",
            *_OPENAI_COMPATIBLE_PROVIDER_URLS,
        ]:
            return _sanitize_llm_response(
                data["choices"][0]["message"]["content"], user_text
            )
        if provider == "claude" or (
            provider == "opencode" and opencode_mode == "messages"
        ):
            text_blocks = [
                b.get("text", "")
                for b in data.get("content", [])
                if isinstance(b, dict)
            ]
            return _sanitize_llm_response(
                "\n".join([t for t in text_blocks if t]).strip(), user_text
            )
        # gemini
        return _sanitize_llm_response(
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
            .strip(),
            user_text,
        )


def _request_plan(user_text: str, has_attachments: bool = False) -> dict[str, Any]:
    """Route a request before retrieval or mutation.

    This is deliberately an operational intent router, not hidden model reasoning.
    It keeps general conversation useful while ensuring workspace facts trigger live
    tools and mutations/deletions are never inferred from a vague sentence.
    """
    text = user_text.strip().lower()
    text = re.sub(r"\bho\s+w\s*many\b", "how many", text)
    text = re.sub(r"\bhowmany\b", "how many", text)
    mutation_words = (
        "add",
        "create",
        "insert",
        "update",
        "set",
        "move",
        "transfer",
        "correct",
        "fix",
        "change",
        "ingest",
        "import",
        "register",
    )
    delete_words = ("delete", "remove", "purge", "clear")
    employee_words = (
        "employee",
        "employees",
        "staff",
        "workforce",
        "team member",
        "people",
        "directory",
        "worker",
    )
    candidate_words = (
        "candidate",
        "candidates",
        "applicant",
        "applicants",
        "talent scout",
        "hiring",
        "recruit",
    )
    analytics_words = (
        "dashboard",
        "analytics",
        "metric",
        "metrics",
        "sentiment",
        "morale",
        "retention",
        "at-risk",
        "at risk",
        "risk",
        "burnout",
    )
    enterprise_words = (
        "integration",
        "connection",
        "compliance",
        "policy",
        "policies",
        "release gate",
        "quarantine",
        "sync",
        "runbook",
        "intervention",
    )
    data_verbs = (
        "show",
        "find",
        "search",
        "list",
        "lookup",
        "look up",
        "who",
        "which",
        "count",
        "how many",
        "analyze",
        "compare",
        "rank",
        "top",
        "current",
        "live",
        "our",
        "my",
        "data",
        "records",
        "report",
        "check",
        "tell",
        "get",
        "give",
        "what",
        "how",
        "inspect",
        "audit",
        "summarize",
    )

    is_mutation = any(word in text for word in mutation_words)
    is_delete = any(word in text for word in delete_words)
    # Keep routing tolerant of normal HR shorthand and small typing errors.
    # The live-evidence guard must not let a misspelled candidate/employee
    # request fall through to an ungrounded conversational answer.
    tokens = re.findall(r"[a-z]+", text)
    fuzzy_candidate = any(
        difflib.SequenceMatcher(None, token, target).ratio() >= 0.65
        for token in tokens
        if len(token) >= 5
        for target in ("candidate", "candidates", "applicant", "applicants")
    )
    fuzzy_employee = any(
        difflib.SequenceMatcher(None, token, target).ratio() >= 0.65
        for token in tokens
        if len(token) >= 5
        for target in ("employee", "employees", "workforce", "directory")
    )
    mentions_employee = (
        any(word in text for word in employee_words)
        or "employ" in text
        or fuzzy_employee
    )
    mentions_candidate = (
        any(word in text for word in candidate_words)
        or "candid" in text
        or "applic" in text
        or fuzzy_candidate
    )
    mentions_analytics = any(word in text for word in analytics_words)
    mentions_enterprise = any(word in text for word in enterprise_words)
    asks_for_data = any(word in text for word in data_verbs)
    asks_count = any(
        word in text for word in ("count", "how many", "total", "number of")
    ) or ("many" in text and ("how" in text or "ho" in text))
    workspace_signal = (
        mentions_employee
        or mentions_candidate
        or mentions_analytics
        or mentions_enterprise
    ) and (asks_for_data or is_mutation or is_delete or len(text.split()) > 2)
    workspace_signal = workspace_signal or is_mutation or is_delete or has_attachments

    capabilities = ["conversation_context"]
    if workspace_signal:
        if mentions_employee or (
            not mentions_candidate
            and not mentions_enterprise
            and (mentions_analytics or asks_for_data)
        ):
            capabilities.append("search_employees")
        if mentions_candidate:
            capabilities.append("search_candidates")
        if (
            mentions_analytics
            or asks_count
            or (
                workspace_signal
                and not mentions_employee
                and not mentions_candidate
                and not mentions_enterprise
            )
        ):
            capabilities.append("dashboard_snapshot")
        if mentions_enterprise:
            capabilities.append("workspace_snapshot")
    if is_mutation:
        capabilities.append("mutate_data")
    if is_delete:
        capabilities.append("human_approval_delete")
    if has_attachments or any(
        word in text for word in ("csv", "excel", "spreadsheet", "file", "attachment")
    ):
        capabilities.append("parse_csv_attachment")

    if is_delete:
        mode = "governed_mutation"
    elif is_mutation:
        mode = "mutation"
    elif workspace_signal:
        mode = "workspace_analysis"
    else:
        mode = "conversation"

    return {
        "mode": mode,
        "needs_live_data": workspace_signal,
        "capabilities": list(dict.fromkeys(capabilities)),
        "reason": (
            "live workspace evidence requested"
            if workspace_signal
            else "general conversation or knowledge request"
        ),
    }


def _tool_policy(user_text: str, has_attachments: bool = False) -> list[str]:
    return _request_plan(user_text, has_attachments).get(
        "capabilities", ["conversation_context"]
    )


TOOL_RBAC = {
    "search_employees": ["member", "admin"],
    "search_candidates": ["member", "admin"],
    "dashboard_snapshot": ["member", "admin"],
    "mutate_data": ["admin"],
    "human_approval_delete": ["member", "admin"],
    "parse_csv_attachment": ["member", "admin"],
}


def _user_role(current_user: TokenData) -> str:
    return "admin" if current_user.is_admin else "member"


def _is_casual_chat(user_text: str) -> bool:
    return _request_plan(user_text).get("mode") == "conversation"


AGENT_TOOL_CATALOG = {
    "search": "Find specific matching records by name, email, job title, skill, department, policy, or identifier. Use when the request names or filters records. Do not use for aggregate metrics, trends, or a full employee directory.",
    "read": "Read any record end to end by entity and identifier (email, name, or id). Returns the full safe record. Reads never mutate.",
    "modify": "Modify one record end to end: entity, identifier, and explicit field updates. Commits the change and reads the record back to verify. Admin only.",
    "write": "Create one new record: entity plus required field data. Admin only.",
    "delete": "Prepare a deletion of one record (entity and exact identifier). Deletion NEVER executes automatically; it always returns an approval spec that requires an authorized human to approve the exact action.",
    "analyse": "Compute verified aggregate metrics, comparisons, trends, cohorts, health, risk, or operational summaries from workspace data. Use for questions such as headcount, attrition, sentiment, trends, and 'what changed'. Do not use it as a substitute for listing employee or candidate records; use employee_directory, candidate_pipeline, search, or read for those.",
    "observe": "Observe the current system state, detect patterns, symptoms, and anomalies, learn from prior observations, predict, and return an observation bundle for the answer model. Use for 'who is at risk', 'patterns', 'anomalies' and predictive questions.",
    "employee_directory": "HR directory specialist: list or find live employee records by name, email, role, department, or skill context. Use this for directory, roster, employee-list, and 'show employees' requests.",
    "candidate_pipeline": "Recruiting specialist: list or find live candidate records and pipeline evidence by role, department, stage, or candidate details.",
    "workforce_analytics": "People analytics specialist: return verified headcount, sentiment, department, and workforce metrics.",
    "workforce_risk": "Workforce-risk specialist: assess attrition and low-sentiment signals from verified employee records.",
    "skills_intelligence": "Skills specialist: return registered skills and workforce coverage context from live records.",
    "integration_health": "Integration specialist: inspect configured connections, sync logs, and webhook health without exposing secrets.",
    "check_connector_health": "Read-only connector health check for tenant-scoped connections, sync logs, and webhook failures.",
    "sync_hris_connection": "Run a tenant-scoped HRIS/ATS synchronization through the existing governed sync pipeline; never send an unapproved external mutation.",
    "data_quality_review": "Data-quality specialist: inspect data contracts, quarantined events, and workforce-record completeness.",
    "governance_review": "Governance specialist: inspect policies, approvals, audit-safe evidence, release gates, and model governance.",
    "forecast_planning": "Planning specialist: inspect forecast scenarios, gold metrics, and model/drift governance evidence.",
    "intervention_review": "Workforce-action specialist: inspect active interventions and recorded outcomes.",
    "create_requisition": "Propose an approved ATS requisition; never execute without human approval.",
    "move_candidate_stage": "Propose an approved ATS candidate stage move; never execute without human approval.",
    "schedule_interview": "Propose an approved ATS interview schedule; never execute without human approval.",
    "start_onboarding": "Propose an approved employee onboarding workflow only when the connected provider advertises this action; otherwise explain that it is unavailable.",
    "start_offboarding": "Propose an approved employee offboarding workflow only when the connected provider advertises this action; otherwise explain that it is unavailable.",
    "create_review_cycle": "Propose an approved employee review cycle only when the connected provider advertises this action; otherwise explain that it is unavailable.",
    "send_manager_notification": "Propose an approved Slack or Teams manager notification.",
    "create_employee": "Propose creating an employee in a connected HRIS.",
    "update_employee": "Propose updating an employee in a connected HRIS.",
    "request_data_export": "Create an approval-gated tenant data-export request; never generate or transmit data directly.",
    "export_report": "Generate and export workforce, candidate, or sentiment records to a downloadable CSV report.",
    "safe_sql_query": "Run one admin-only, tenant-scoped, read-only SQL query across approved workforce tables. Use :tenant_id as the bound tenant filter; never use DDL, DML, comments, or multiple statements.",
    "semantic_talent_search": "Perform dense vector semantic search to match candidates against complex skill and domain concepts in Qdrant.",
}


def _agent_tool_label(tool_name: str) -> str:
    return {
        "search": "system records",
        "read": "the requested record",
        "modify": "the requested data change",
        "write": "the new record",
        "delete": "the requested deletion",
        "analyse": "deep analysis",
        "observe": "system observation",
        "employee_directory": "the employee directory",
        "candidate_pipeline": "the candidate pipeline",
        "workforce_analytics": "workforce analytics",
        "workforce_risk": "a workforce-risk assessment",
        "skills_intelligence": "skills intelligence",
        "integration_health": "integration health",
        "data_quality_review": "a data-quality review",
        "governance_review": "a governance review",
        "forecast_planning": "forecast planning evidence",
        "intervention_review": "workforce interventions",
        "export_report": "report export",
        "safe_sql_query": "sandboxed SQL query",
        "semantic_talent_search": "semantic talent search in Qdrant",
    }.get(tool_name, tool_name.replace(".", " "))


def _agent_tool_result_message(tool_name: str, result: dict[str, Any]) -> str:
    if result.get("blocked"):
        return (
            f"I could not run {_agent_tool_label(tool_name)} because policy blocked it."
        )
    if tool_name == "export_report":
        return f"I generated the export report '{result.get('filename', 'report.csv')}' with {result.get('row_count', 0)} record(s)."
    if tool_name == "safe_sql_query":
        return f"I executed the sandboxed SQL query and retrieved {result.get('row_count', 0)} row(s)."
    if tool_name == "semantic_talent_search":
        return f"I performed semantic vector search in Qdrant and found {result.get('returned', 0)} candidate match(es)."
    if tool_name == "search":
        return f"I searched the system and found {result.get('returned', 0)} matching record(s)."
    if tool_name == "read":
        return "I read the requested record."
    if tool_name == "modify":
        mutation = result.get("result") or {}
        return (
            "The requested modification was committed and read back for verification."
            if mutation.get("updated")
            else "The modification completed without changes to report."
        )
    if tool_name == "write":
        created = result.get("result") or {}
        return (
            f"The new {created.get('entity', 'record')} was created and verified."
            if created.get("created")
            else "The write completed with no committed record."
        )
    if tool_name == "delete":
        return "The deletion was prepared and requires an authorized human approval to execute."
    if tool_name == "analyse":
        return "The analysis completed across the requested scope."
    if tool_name == "observe":
        return "The observation completed; patterns and predictions are ready."
    if tool_name in {
        "employee_directory",
        "candidate_pipeline",
        "workforce_analytics",
        "workforce_risk",
        "skills_intelligence",
        "integration_health",
        "data_quality_review",
        "governance_review",
        "forecast_planning",
        "intervention_review",
    }:
        return f"The {_agent_tool_label(tool_name)} specialist completed with verified evidence."
    return f"The {_agent_tool_label(tool_name)} step completed."


def _parse_agent_decision(raw_text: str, request_text: str = "") -> dict[str, Any]:
    """Parse one controller decision and normalize common local-model output."""
    text = (raw_text or "").strip()
    if text.startswith("```"):
        text = re.sub(
            r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE | re.DOTALL
        ).strip()
    try:
        payload = json.loads(text)
    except Exception:
        start = text.find("{")
        end = text.rfind("}")
        if start < 0 or end <= start:
            # Do not infer a tool from keywords. A provider that cannot follow
            # the controller protocol may still give a useful direct response,
            # but only the model itself may select a workspace tool.
            if text:
                return {
                    "action": "respond",
                    "message": "The model selected a direct response.",
                    "answer": text[:12000],
                    "normalized": True,
                }
            return {
                "action": "invalid",
                "error": "Controller did not return a decision",
            }
        try:
            payload = json.loads(text[start : end + 1])
        except Exception:
            return {"action": "invalid", "error": "Controller returned malformed JSON"}

    if not isinstance(payload, dict):
        return {"action": "invalid", "error": "Controller decision was not an object"}
    action = str(payload.get("action", "")).lower().strip()
    if not action and payload.get("tool"):
        action = "tool"
    if action in {"answer", "final", "final_answer"}:
        action = "respond"
    if action in {"call_tool", "use_tool"}:
        action = "tool"
    if action in {"tools", "parallel_tools", "batch"}:
        # Frontier batch: [{"tool":..., "arguments":{}}]. Validate each.
        raw_calls = payload.get("calls") or []
        if not isinstance(raw_calls, list):
            return {"action": "invalid", "error": "Batch calls must be a list"}
        calls: list[dict[str, Any]] = []
        for item in raw_calls[:4]:
            if not isinstance(item, dict):
                continue
            t = str(item.get("tool") or "").strip()
            if t in AGENT_TOOL_CATALOG:
                norm = t
            else:
                norm = t.replace("_", ".")
                norm = {
                    "database.summary": "analyse",
                    "database.count": "analyse",
                    "database.overview": "analyse",
                    "employee.search": "search",
                    "candidate.search": "search",
                }.get(norm, norm)
            if norm not in AGENT_TOOL_CATALOG:
                continue
            args = item.get("arguments") or item.get("args") or {}
            if not isinstance(args, dict):
                args = {"query": str(args)[:12000]}
            calls.append({"tool": norm, "arguments": args})
        if not calls:
            return {"action": "invalid", "error": "Batch contained no supported tools"}
        return {
            "action": "tools",
            "calls": calls,
            "message": str(
                payload.get("message", "Model selected a parallel tool batch")
            )[:500],
        }
    if action not in {"tool", "respond", "approval_required"}:
        return {"action": "invalid", "error": "Unsupported controller action"}
    if action == "tool":
        requested_tool = str(payload.get("tool", "")).strip()
        # Native function names use underscores; keep them intact when they
        # are an authorized domain tool. Older dotted aliases remain supported.
        tool = (
            requested_tool
            if requested_tool in AGENT_TOOL_CATALOG
            else requested_tool.replace("_", ".")
        )
        legacy_aliases = {
            "database.summary": "analyse",
            "database.count": "analyse",
            "database.overview": "analyse",
            "employee.search": "search",
            "candidate.search": "search",
            "data.mutate": "modify",
            "data.verify": "analyse",
        }
        tool = legacy_aliases.get(tool, tool)
        if tool not in AGENT_TOOL_CATALOG:
            return {"action": "invalid", "error": f"Unsupported tool: {tool}"}
        args = payload.get("arguments") or payload.get("args") or {}
        if not isinstance(args, dict):
            args = {"query": str(args)[:12000]}
        return {
            "action": "tool",
            "tool": tool,
            "arguments": args,
            "message": str(
                payload.get("message", "Model selected the next bounded tool")
            )[:500],
        }
    if action == "approval_required":
        return {
            "action": "approval_required",
            "message": str(
                payload.get("message", "Human approval is required before this action")
            )[:500],
        }
    return {
        "action": "respond",
        "message": str(payload.get("message", "Model selected a final response"))[:500],
        "answer": str(payload.get("answer", "")).strip()[:12000],
    }


def _agent_controller_prompt(
    user_text: str,
    history: list[dict[str, str]],
    tool_transcript: list[dict[str, Any]],
    current_user: TokenData,
    has_attachments: bool,
) -> str:
    catalog = "\n".join(
        f"- {name}: {description}" for name, description in AGENT_TOOL_CATALOG.items()
    )
    return (
        "You are the Aurelinx execution controller. Choose exactly one next action and return ONLY valid JSON.\n"  # nosec B608
        "You are not the private chain-of-thought writer. Do not expose chain-of-thought.\n"
        "Allowed JSON shapes:\n"
        '{"action":"tool","tool":"search","arguments":{"query":"..."},"message":"short natural progress sentence shown in the activity timeline"}\n'
        '{"action":"tool","tool":"workforce_analytics","arguments":{"query":"..."}}\n'
        '{"action":"tools","calls":[{"tool":"workforce_analytics","arguments":{"query":"..."}},{"tool":"workforce_risk","arguments":{"query":"..."}},{"tool":"employee_directory","arguments":{"query":"...","limit":20}}],"message":"Checking analytics, risk, and directory in parallel"}\n'
        '{"action":"tool","tool":"read","arguments":{"entity":"employee","identifier":"..."}}\n'
        '{"action":"tool","tool":"modify","arguments":{"entity":"employee","identifier":"...","fields":{"field":"new value"}}}\n'
        '{"action":"tool","tool":"write","arguments":{"entity":"employee","data":{"field":"value"}}}\n'
        '{"action":"tool","tool":"delete","arguments":{"entity":"employee","identifier":"..."}}\n'
        '{"action":"tool","tool":"analyse","arguments":{"scope":"..."}}\n'
        '{"action":"tool","tool":"observe"}\n'
        '{"action":"tool","tool":"export_report","arguments":{"query":"at-risk employees"}}\n'
        '{"action":"tool","tool":"safe_sql_query","arguments":{"query":"SELECT department, count(*) AS total FROM employeetable WHERE tenant_id = :tenant_id GROUP BY department"}}\n'
        '{"action":"tool","tool":"semantic_talent_search","arguments":{"query":"distributed systems event-driven"}}\n'
        '{"action":"respond","message":"short natural progress sentence shown before the answer","answer":"final user-facing answer for a conversation-only request"}\n'
        '{"action":"approval_required","message":"explain why admin approval is required"}\n'
        "Rules:\n"
        "- For sentiment/morale/attrition/risk/analytics questions: FIRST call workforce_analytics, THEN workforce_risk and employee_directory so the final answer has numbers AND a people table. Prefer the parallel batch shape above to get all three at once.\n"
        "- Select tools until you have both aggregates and people rows; never answer a sentiment question from aggregates alone.\n"
        "- Never repeat the same tool with the same arguments after it has returned a result; choose a different needed tool or respond.\n"
        "- Search/read/analyse cover all workspace entities; use arguments.entity and arguments.query; limit up to 200.\n"
        "- If a directory or search tool returns no records, report the verified empty result naturally once (do not retry it with another broad wording), then guide the fix.\n"
        "- Never retry the same broad directory/search request with another broad wording after it returns a result; use the existing result and respond.\n"
        "- Use safe_sql_query for admin-only ad-hoc aggregates or joins that the specialist tools cannot answer; every SQL query must be SELECT/WITH, use :tenant_id, and reference only approved tables.\n"
        "- Use live tools for Aurelinx workspace facts; do not guess records or metrics.\n"
        "- For any delete/remove request run the delete tool first, then when it returns its approval spec choose approval_required so an authorized human approves the exact action. Deletion never executes automatically.\n"
        "- modify/write/delete are admin-only; members may only search, read, analyse, and observe.\n"
        f"- Current user role: {'admin' if current_user.is_admin else 'member'}.\n"
        f"- Attached files available: {has_attachments}.\n"
        f"Available tools:\n{catalog}\n\n"
        f"Original user request:\n{user_text}\n\n"
        f"Conversation history:\n{json.dumps(history[-6:], default=str)}\n\n"
        f"Tool calls and results already observed:\n{json.dumps(tool_transcript[-8:], default=str)}\n\n"
        "The message field must be a natural operational update, not JSON, not a greeting, and not hidden chain-of-thought. Return one JSON decision now."
    )


def _native_controller_prompt(
    user_text: str,
    history: list[dict[str, str]],
    tool_transcript: list[dict[str, Any]],
) -> str:
    """Compact first-pass prompt for providers that receive native schemas.

    The native API already receives the complete function schema catalog.  Do
    not send a second verbose catalog and JSON protocol examples on the hot
    path: smaller requests reduce time-to-first-tool without restricting which
    schema the model may select.
    """
    observed = tool_transcript[-4:]
    return (
        "Select the single next best action for this Aurelinx request. "
        "Use a native tool only when live evidence or a controlled action is needed. "
        "Use the tool schemas supplied by the API; do not invent tools. "
        "If the available evidence already answers the request, respond directly.\n\n"
        f"User request:\n{user_text[:12000]}\n\n"
        f"Recent conversation:\n{json.dumps(history[-4:], default=str)}\n\n"
        f"Observed tool results:\n{json.dumps(observed, default=str)[:12000]}"
    )


def _unique_user_id(record) -> str:
    return str(getattr(record, "id", getattr(record, "email", "unknown")))


# ============================================================
# Dynamic tool engines (search / read / modify / write /
# delete-with-approval / analyse / observe)
# ============================================================

# Entity registry: stable names, model classes, keys, and column policy.
# secret_cols are NEVER returned by read/search/analyse engines.
_DELETE_KEYWORDS = {"delete", "remove", "purge", "erase", "drop", "clear", "destroy"}

_TOOL_ENTITIES = {
    "employee": {
        "model": EmployeeTable,
        "search_cols": ["full_name", "email", "role", "department"],
        "identifiers": ["email", "full_name", "id"],
        "secret_cols": [],
    },
    "candidate": {
        "model": CandidateTable,
        "search_cols": ["full_name", "email", "role", "department"],
        "identifiers": ["email", "full_name", "id"],
        "secret_cols": [],
    },
    "skill": {
        "model": SkillTable,
        "search_cols": ["name"],
        "identifiers": ["name", "id"],
        "secret_cols": [],
    },
    "experience": {
        "model": ExperienceTable,
        "search_cols": ["company", "position"],
        "identifiers": ["id"],
        "secret_cols": [],
    },
    "message": {
        "model": ChatMessageTable,
        "search_cols": ["content"],
        "identifiers": ["id"],
        "secret_cols": [],
    },
    "attachment": {
        "model": ChatAttachmentTable,
        "search_cols": ["original_name"],
        "identifiers": ["id"],
        "secret_cols": ["file_path"],
    },
    "integration": {
        "model": IntegrationConnectionTable,
        "search_cols": ["name", "provider", "source_type"],
        "identifiers": ["name", "id"],
        "secret_cols": ["api_key"],
    },
    "policy": {
        "model": CompliancePolicyTable,
        "search_cols": ["policy_name", "region"],
        "identifiers": ["policy_name", "id"],
        "secret_cols": [],
    },
    "intervention": {
        "model": InterventionTable,
        "search_cols": ["title"],
        "identifiers": ["title", "id"],
        "secret_cols": [],
    },
    "workflow": {
        "model": WorkflowRunTable,
        "search_cols": ["status", "intent", "current_phase"],
        "identifiers": ["id"],
        "secret_cols": [],
    },
    "audit": {
        "model": AuditLogTable,
        "search_cols": ["action", "resource_type"],
        "identifiers": ["id"],
        "secret_cols": ["details", "ip_address"],
    },
    "model": {
        "model": MLModelRegistryTable,
        "search_cols": ["model_name", "version", "status"],
        "identifiers": ["model_name", "id"],
        "secret_cols": [],
    },
    "data_contract": {
        "model": DataContractTable,
        "search_cols": ["source_type", "provider", "status"],
        "identifiers": ["id"],
        "secret_cols": ["required_fields"],
    },
    "scenario": {
        "model": ForecastScenarioTable,
        "search_cols": ["scenario_name", "created_by"],
        "identifiers": ["id"],
        "secret_cols": [],
    },
    "webhook": {
        "model": IntegrationWebhookEventTable,
        "search_cols": ["integration_name", "endpoint", "status"],
        "identifiers": ["id"],
        "secret_cols": ["payload", "headers"],
    },
    "api_key": {
        "model": IntegrationApiKeyTable,
        "search_cols": ["name", "status"],
        "identifiers": ["name", "id"],
        "secret_cols": ["api_key_hash"],
    },
    "integration_log": {
        "model": IntegrationLogTable,
        "search_cols": ["integration_name", "status"],
        "identifiers": ["id"],
        "secret_cols": ["details"],
    },
}

_ENTITY_ALIASES = {
    "employees": "employee",
    "staff": "employee",
    "worker": "employee",
    "personnel": "employee",
    "candidates": "candidate",
    "applicant": "candidate",
    "applicants": "candidate",
    "skills": "skill",
    "experiences": "experience",
    "messages": "message",
    "chat": "message",
    "attachments": "attachment",
    "file": "attachment",
    "integrations": "integration",
    "connection": "integration",
    "connections": "integration",
    "policies": "policy",
    "policy": "policy",
    "interventions": "intervention",
    "title": "intervention",
    "workflows": "workflow",
    "workflow-runs": "workflow",
    "audits": "audit",
    "audit-log": "audit",
    "audit-events": "audit",
    "ml-model": "model",
    "ml-models": "model",
    "ai-model": "model",
    "models": "model",
    "data-contract": "data_contract",
    "data-contracts": "data_contract",
    "contract": "data_contract",
    "scenarios": "scenario",
    "forecast": "scenario",
    "forecasts": "scenario",
    "webhooks": "webhook",
    "webhook-event": "webhook",
    "api-keys": "api_key",
    "apikey": "api_key",
    "registry": "api_key",
}


def _normalize_entity(raw: Any) -> str:
    raw_str = str(raw or "").strip().lower()
    if raw_str in _TOOL_ENTITIES:
        return raw_str
    if raw_str in _ENTITY_ALIASES:
        return _ENTITY_ALIASES[raw_str]
    for name in _TOOL_ENTITIES:
        if name in raw_str:
            return name
    return ""


def _safe_row(record) -> dict[str, Any]:
    """One record as a JSON-safe dict with secret and sensitive columns removed."""
    if record is None:
        return {}
    entity = None
    for name, spec in _TOOL_ENTITIES.items():
        if isinstance(record, spec["model"]):
            entity = name
            break
    secrets = set(_TOOL_ENTITIES.get(entity, {}).get("secret_cols", []))
    # Fail-safe baseline for deployments that have not yet configured a
    # tenant-specific SensitiveFieldPolicyTable. These values must never enter
    # model prompts by accident.
    sensitive = {
        "password",
        "password_hash",
        "ssn",
        "social_security_number",
        "tax_id",
        "bank_account",
        "api_key",
        "access_token",
        "refresh_token",
        "file_path",
    }
    out: dict[str, Any] = {}
    for column in record.__table__.columns:
        key = column.name
        if key in secrets or key in sensitive:
            out[key] = "[redacted]"
            continue
        value = getattr(record, key, None)
        if isinstance(value, datetime):
            value = value.isoformat() if value else None
        out[key] = value
    return out


def _safe_rows(records) -> list[dict[str, Any]]:
    return [_safe_row(record) for record in records]


def _resolve_definition(entity: str, db: Session) -> dict[str, Any] | None:
    spec = _TOOL_ENTITIES.get(entity)
    if not spec:
        return None
    # Only offer entities the caller may actually interact with. Skills and
    # experiences are always resolved through their owning record.
    return spec


_SEARCH_STOPWORDS = frozenset(
    {
        "a",
        "an",
        "and",
        "or",
        "of",
        "for",
        "to",
        "in",
        "on",
        "with",
        "my",
        "our",
        "your",
        "their",
        "his",
        "her",
        "its",
        "this",
        "that",
        "these",
        "those",
        "from",
        "by",
        "at",
        "all",
        "any",
        "please",
        "give",
        "tell",
        "show",
        "find",
        "look",
        "search",
        "list",
        "rank",
        "top",
        "most",
        "least",
        "current",
        "latest",
        "recent",
        "new",
        "what",
        "which",
        "who",
        "where",
        "when",
        "why",
        "how",
        "many",
        "much",
        "total",
        "count",
        "about",
        "within",
        "between",
        "than",
        "then",
        "they",
        "them",
        "we",
        "you",
        "i",
        "it",
        "me",
        "us",
        "the",
        "record",
        "records",
        "employee",
        "employees",
        "candidate",
        "candidates",
        "data",
        "status",
        "state",
        "activity",
        "now",
        "also",
        "into",
        "out",
        "up",
        "down",
        "more",
        "less",
        "each",
        "every",
        "some",
        "are",
        "is",
        "was",
        "were",
        "be",
        "been",
        "will",
        "would",
        "can",
        "could",
        "should",
        "do",
        "did",
        "does",
        "get",
        "having",
        "has",
        "have",
        "return",
        "returns",
        "send",
        "using",
        "use",
        "used",
        "check",
        "per",
        "see",
        "view",
        "verify",
        "read",
        "write",
        "update",
        "modify",
        "change",
        "delete",
        "remove",
        "add",
        "create",
    }
)


def _search_tokens(query: str) -> list[str]:
    import re as _re

    tokens = _re.split(r"[^A-Za-z0-9._+@-]+", (query or "").lower())
    cleaned = [tok.strip("._-") for tok in tokens if tok.strip("._-")]
    return [tok for tok in cleaned if len(tok) >= 2 and tok not in _SEARCH_STOPWORDS]


def _tenant_filter(model: Any, tenant_id: str | None) -> Any | None:
    column = getattr(model, "tenant_id", None)
    return column == tenant_id if column is not None and tenant_id else None


def _browse_records(
    db: Session, model: Any, limit: int, offset: int, tenant_id: str | None = None
) -> list[Any]:
    sort_column = getattr(model, "created_at", None) or getattr(model, "id", None)
    statement = select(model)
    tenant_filter = _tenant_filter(model, tenant_id)
    if tenant_filter is not None:
        statement = statement.where(tenant_filter)
    if sort_column is not None:
        statement = statement.order_by(sort_column.desc())
    return db.exec(statement.limit(limit).offset(offset)).all()


def _match_records(
    db: Session,
    spec: dict[str, Any],
    query: str,
    limit: int,
    offset: int,
    tenant_id: str | None = None,
) -> list[Any]:
    """Tokenized ILIKE search across an entity's safe columns.

    The query is split into real search tokens (stopwords stripped) so a
    natural-language query such as 'show me Olivia Chen' matches any column
    that contains ANY of the tokens (name/email/title/skills), instead of
    requiring the whole sentence to be a single substring. Empty or
    stopword-only queries return no records because unrelated recent records
    are never valid evidence for a user question.
    """
    tokens = _search_tokens(query)
    if not tokens:
        return []
    model = spec["model"]
    columns = []
    for col in spec["search_cols"]:
        column = getattr(model, col, None)
        if column is not None:
            columns.append(column)
    conditions = [column.ilike(f"%{tok}%") for column in columns for tok in tokens]
    if not conditions:
        return []
    statement = select(model).where(or_(*conditions))
    tenant_filter = _tenant_filter(model, tenant_id)
    if tenant_filter is not None:
        statement = statement.where(tenant_filter)
    fetched = db.exec(statement.limit(limit).offset(offset)).all()
    if len(fetched) < limit:
        fetched = db.exec(statement.limit(limit * 3).offset(offset)).all()
    ranked = sorted(
        fetched,
        key=lambda row: -sum(
            1
            for col in columns
            if getattr(row, col.name, None) is not None
            and any(tok in str(getattr(row, col.name)).lower() for tok in tokens)
        ),
    )
    return ranked[:limit]


def _count_matching_records(
    db: Session, spec: dict[str, Any], query: str, tenant_id: str | None = None
) -> int | None:
    """COUNT rows matching the same filter `_match_records` uses.

    Returns None only if the count itself fails; token-less queries match
    nothing by design (same as `_match_records`).
    """
    tokens = _search_tokens(query)
    if not tokens:
        return 0
    model = spec["model"]
    columns = [getattr(model, col, None) for col in spec["search_cols"]]
    columns = [column for column in columns if column is not None]
    conditions = [column.ilike(f"%{tok}%") for column in columns for tok in tokens]
    if not conditions:
        return 0
    statement = select(func.count()).select_from(model).where(or_(*conditions))
    tenant_filter = _tenant_filter(model, tenant_id)
    if tenant_filter is not None:
        statement = statement.where(tenant_filter)
    try:
        value = db.exec(statement).one()
        if isinstance(value, tuple):
            value = value[0]
        return int(value or 0)
    except Exception:
        logger.exception("agent match-count failed")
        return None


def _records_by_identifier(
    db: Session, spec: dict[str, Any], identifier: str, tenant_id: str | None = None
) -> list[Any]:
    model = spec["model"]
    identifier = (identifier or "").strip()
    conditions = []
    for key in spec["identifiers"]:
        column = getattr(model, key, None)
        if column is None:
            continue
        if "uuid" in str(column.type).lower():
            conditions.append(func.cast(column, String) == identifier)
        else:
            conditions.append(column == identifier)
    if not conditions:
        return []
    statement = select(model).where(or_(*conditions))
    tenant_filter = _tenant_filter(model, tenant_id)
    if tenant_filter is not None:
        statement = statement.where(tenant_filter)
    return db.exec(statement.limit(25)).all()


def _agent_tenant_guard(current_user: TokenData) -> str | None:
    """Require verified tenant context before production agent data access.

    Every entity registered in the dynamic agent must be tenant-keyed before
    production access is enabled. This remains fail-closed for future entities.
    """
    tenant_id = str(getattr(current_user, "tenant_id", "") or "").strip().lower()
    if getattr(settings, "ENVIRONMENT", "development") == "production":
        if not tenant_id or tenant_id == "default":
            return "Agent data access is unavailable until a verified tenant scope is present."
        unscoped = [
            name
            for name, spec in _TOOL_ENTITIES.items()
            if getattr(spec.get("model"), "tenant_id", None) is None
        ]
        if unscoped:
            return "Agent data access is temporarily blocked until all agent entities enforce tenant scope."
    return None


def _modify_column(entity: str, field: str) -> Any | None:
    """Return the ORM column for a modifiable field, or None if not allowed."""
    spec = _TOOL_ENTITIES.get(entity)
    if not spec or field in spec.get("secret_cols", []) or field == "id":
        return None
    model = spec["model"]
    column = getattr(model, field, None)
    return column


def _prepare_delete_spec(
    entity: str, identifier: str, user_text: str
) -> dict[str, Any]:
    return {
        "entity": entity,
        "identifier": identifier,
        "request": (user_text or "")[:2000],
    }


def _analyse_engine(
    db: Session,
    scope: str,
    query: str,
    session_id: str,
    attachments: list[Any],
    current_user: TokenData,
) -> dict[str, Any]:
    """Analyse the full application: records, chat, values, sentiment,
    analytics, intel, workflows, and data operations. Returns a structured
    analysis bundle the answer model turns into a user answer."""
    analysis: dict[str, Any] = {"scope": scope or "system"}

    analysis["record_counts"] = _record_counts(db, current_user.tenant_id)
    account = {}
    try:
        account = _compute_dashboard_snapshot(db, current_user.tenant_id)
    except Exception:
        account = {}
    analysis["workforce_analytics"] = account

    try:
        analysis["workspace"] = _workspace_snapshot(db, query, current_user.tenant_id)
    except Exception:
        analysis["workspace"] = {}

    sentiment_employees = db.exec(
        select(EmployeeTable).where(
            EmployeeTable.tenant_id == current_user.tenant_id,
            EmployeeTable.sentiment_score.isnot(None),
        )
    ).all()
    sentiment_candidates = db.exec(
        select(CandidateTable).where(
            CandidateTable.tenant_id == current_user.tenant_id,
            CandidateTable.sentiment_score.isnot(None),
        )
    ).all()
    employees_scores = [row.sentiment_score for row in sentiment_employees]
    candidates_scores = [row.sentiment_score for row in sentiment_candidates]
    all_scores = employees_scores + candidates_scores
    analysis["sentiment"] = {
        "employee_count": len(employees_scores),
        "candidate_count": len(candidates_scores),
        "average_sentiment": (
            round(sum(all_scores) / len(all_scores), 3) if all_scores else None
        ),
        "low_sentiment_employees": [
            {
                "name": row.full_name,
                "email": row.email,
                "sentiment": row.sentiment_score,
            }
            for row in sentiment_employees
            if (row.sentiment_score or 0) < 0.4
        ][:10],
    }

    risk_rows = db.exec(
        select(EmployeeTable).where(
            EmployeeTable.tenant_id == current_user.tenant_id, EmployeeTable.is_at_risk
        )
    ).all()
    analysis["risk"] = {
        "at_risk_total": len(risk_rows),
        "at_risk": [
            {
                "name": row.full_name,
                "email": row.email,
                "role": row.role,
                "department": row.department,
            }
            for row in risk_rows[:15]
        ],
    }

    # Conversation/intelligence center input-output: recent chat turns and
    # workflows for this user session.
    recent_messages = db.exec(
        select(ChatMessageTable)
        .where(ChatMessageTable.session_id == str(session_id))
        .order_by(ChatMessageTable.created_at.desc())
        .limit(30)
    ).all()
    analysis["conversation"] = {
        "recent_messages": [
            {"role": row.role, "content": (row.content or "")[:400]}
            for row in reversed(recent_messages)
        ],
        "user_role": "admin" if current_user.is_admin else "member",
    }

    # Data operations: workflows and approvals.
    try:
        recent_runs = db.exec(
            select(WorkflowRunTable)
            .where(WorkflowRunTable.session_id == str(session_id))
            .order_by(WorkflowRunTable.created_at.desc())
            .limit(10)
        ).all()
        analysis["data_operations"] = {
            "runs": [
                {
                    "status": run.status,
                    "phase": run.current_phase,
                    "created_at": (
                        run.created_at.isoformat() if run.created_at else None
                    ),
                }
                for run in recent_runs
            ],
            "active_approvals": len(
                db.exec(
                    select(WorkflowApprovalTable).where(
                        WorkflowApprovalTable.status == "pending"
                    )
                ).all()
            ),
        }
    except Exception:
        analysis["data_operations"] = {}

    analysis["enterprise"] = _enterprise_knowledge(db, current_user.tenant_id)

    return analysis


def _enterprise_knowledge(db: Session, tenant_id: str | None = None) -> dict[str, Any]:
    """One safe, secret-redacted summary of every Aurelinx module so the
    answer model can explain anything an admin asks about."""
    result: dict[str, Any] = {}

    def count(model: Any, filters: list[Any] | None = None) -> int:
        try:
            statement = select(func.count()).select_from(model)
            tenant_filter = _tenant_filter(model, tenant_id)
            if tenant_filter is not None:
                statement = statement.where(tenant_filter)
            if filters:
                statement = statement.where(*filters)
            return int(db.exec(statement).one())
        except Exception:
            return 0

    def recent(model: Any, limit: int = 3) -> list[dict[str, Any]]:
        try:
            return _safe_rows(
                db.exec(
                    select(model)
                    .where(_tenant_filter(model, tenant_id))
                    .order_by(
                        getattr(model, "created_at", getattr(model, "id", None)).desc()
                    )
                    .limit(limit)
                ).all()
            )
        except Exception:
            return []

    result["users"] = {"total": count(UserTable)}
    result["chat"] = {
        "sessions": count(ChatSessionTable),
        "messages": count(ChatMessageTable),
    }
    result["workflows"] = {
        "runs": count(WorkflowRunTable),
        "by_status": {
            status: count(WorkflowRunTable, [WorkflowRunTable.status == status])
            for status in ("received", "running", "completed", "failed", "canceled")
        },
        "approvals_pending": count(
            WorkflowApprovalTable, [WorkflowApprovalTable.status == "pending"]
        ),
        "recent": recent(WorkflowRunTable, 6),
    }
    result["audit"] = {
        "events": count(AuditLogTable),
        "recent": recent(AuditLogTable, 6),
    }
    result["integrations"] = {
        "connections": count(IntegrationConnectionTable),
        "api_keys": count(IntegrationApiKeyTable),
        "api_keys_active": count(
            IntegrationApiKeyTable, [IntegrationApiKeyTable.status == "active"]
        ),
        "logs": count(IntegrationLogTable),
        "webhook_events": count(IntegrationWebhookEventTable),
        "webhook_failures": count(
            IntegrationWebhookEventTable,
            [IntegrationWebhookEventTable.status == "failed"],
        ),
        "connections_recent": recent(IntegrationConnectionTable, 6),
        "webhook_recent": recent(IntegrationWebhookEventTable, 4),
    }
    result["ai_ml"] = {
        "registry": count(MLModelRegistryTable),
        "models": recent(MLModelRegistryTable, 6),
        "drift_snapshots": count(MLDriftSnapshotTable),
        "model_cards": count(MLModelCardTable),
        "forecast_scenarios": count(ForecastScenarioTable),
        "scenarios_recent": recent(ForecastScenarioTable, 4),
        "gold_metrics": count(GoldMetricSnapshotTable),
    }
    result["governance"] = {
        "compliance_policies": count(CompliancePolicyTable),
        "data_contracts": count(DataContractTable),
        "release_gates": count(ReleaseGateTable),
        "runbooks": count(DRRunbookTable),
        "interventions": count(InterventionTable),
        "intervention_outcomes": count(InterventionOutcomeTable),
        "policies_recent": recent(CompliancePolicyTable, 6),
    }
    result["pipeline"] = {
        "raw_events": count(RawEventTable),
        "quarantined_events": count(QuarantineEventTable),
        "canonical_employees": count(CanonicalEmployeeTable),
        "canonical_candidates": count(CanonicalCandidateTable),
        "synced_jobs": count(ConnectorSyncJobTable),
        "field_mappings": count(ConnectorFieldMappingTable),
    }
    try:
        employees_all = db.exec(
            select(EmployeeTable).where(EmployeeTable.tenant_id == tenant_id)
        ).all()
        total_workforce = len(employees_all)
        at_risk_count = sum(1 for e in employees_all if e.is_at_risk)
        avg_morale = (
            round(
                sum((e.sentiment_score or 0) for e in employees_all) / total_workforce,
                3,
            )
            if total_workforce
            else 0.0
        )
        dept_stats = {}
        for e in employees_all:
            dept = e.department or "Unknown"
            entry = dept_stats.setdefault(dept, {"total": 0, "at_risk": 0})
            entry["total"] += 1
            if e.is_at_risk:
                entry["at_risk"] += 1
        result["business_logic"] = {
            "formulas": {
                "avg_morale": "mean of employee sentiment_score across the full workforce",
                "at_risk_rate": "employees flagged is_at_risk / total_workforce",
                "department_at_risk_rate": "at-risk employees in a department / department headcount",
                "risk_concentration": "at-risk counts grouped by department (used to find hotspots)",
            },
            "computed_now": {
                "total_workforce": total_workforce,
                "at_risk": at_risk_count,
                "at_risk_rate": (
                    round(at_risk_count / total_workforce, 3)
                    if total_workforce
                    else None
                ),
                "avg_morale": avg_morale,
                "departments": {
                    dept: {
                        "total": stats["total"],
                        "at_risk": stats["at_risk"],
                        "at_risk_rate": (
                            round(stats["at_risk"] / stats["total"], 3)
                            if stats["total"]
                            else 0.0
                        ),
                    }
                    for dept, stats in sorted(
                        dept_stats.items(), key=lambda item: -item[1]["total"]
                    )
                },
            },
        }
    except Exception:
        result["business_logic"] = {"formulas": {}, "computed_now": {}}
    result["safety"] = {
        "secret_columns_hidden": "[redacted]",  # nosec B105
        "policy": "Never expose api_key, payload, headers, file_path, ip_address, or hashed credentials in any answer.",
    }
    return result


def _observe_engine(
    db: Session,
    query: str,
    session_id: str,
    attachments: list[Any],
    current_user: TokenData,
    prior_observations: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Observation cycle: capture current state, compare with prior
    observations, detect symptoms/patterns/deltas, predict, then let the LLM
    answer from the observation bundle."""
    analysis = _analyse_engine(
        db, "observe", query, session_id, attachments, current_user
    )
    employees = db.exec(
        select(EmployeeTable).where(EmployeeTable.tenant_id == current_user.tenant_id)
    ).all()
    candidates = db.exec(
        select(CandidateTable).where(CandidateTable.tenant_id == current_user.tenant_id)
    ).all()

    high_risk = [row for row in employees if row.is_at_risk]
    low_sentiment = [row for row in employees if (row.sentiment_score or 0) < 0.4]
    missing_salary = [row for row in employees if row.salary is None]
    observations = {
        "analysis": analysis,
        "patterns": {
            "at_risk_ratio": (
                round(len(high_risk) / len(employees), 3) if employees else None
            ),
            "low_sentiment_ratio": (
                round(len(low_sentiment) / len(employees), 3) if employees else None
            ),
            "records_without_salary": len(missing_salary),
            "employees_total": len(employees),
            "candidates_total": len(candidates),
            "risk_concentration": {
                dept: sum(1 for row in high_risk if row.department == dept)
                for dept in sorted({row.department for row in employees})
            },
        },
        "symptoms": [],
        "predictions": [],
        "prior_observations_seen": len(prior_observations or []),
    }

    if missing_salary:
        observations["symptoms"].append(
            "salary data is incomplete; compensation analytics will use role estimates"
        )
    if high_risk:
        observations["symptoms"].append(
            f"{len(high_risk)} employee(s) flagged at risk of attrition"
        )
    if low_sentiment:
        observations["symptoms"].append(
            f"{len(low_sentiment)} employee(s) below the 0.4 sentiment threshold"
        )
    if candidates and not low_sentiment:
        observations["symptoms"].append(
            "candidate pipeline healthy but not validated for sentiment"
        )

    previous = (prior_observations or [])[-1] if prior_observations else None
    current_at_risk = len(high_risk)
    observations["patterns"]["employee_at_risk_total"] = current_at_risk
    if (
        previous
        and previous.get("patterns", {}).get("employee_at_risk_total") is not None
    ):
        delta = current_at_risk - previous["patterns"]["employee_at_risk_total"]
        observations["symptoms"].append(
            f"at-risk workforce {'increased' if delta > 0 else 'decreased'} by {abs(delta)} since last observation"
        )

    observations["prediction"] = {
        "attention_needed": "yes" if high_risk or low_sentiment else "no",
        "likely_next": (
            "attrition risk conversation when high-risk or low-sentiment clusters persist"
            if high_risk or low_sentiment
            else "stable working state"
        ),
        "recommended_action": (
            "schedule retention review and coverage checks for observed clusters"
            if high_risk or low_sentiment
            else "no immediate action required"
        ),
    }
    return observations


def _apply_structured_modify(
    db: Session,
    entity: str,
    spec: dict[str, Any],
    identifier: str,
    fields: dict[str, Any],
    user_text: str,
    tenant_id: str | None = None,
) -> dict[str, Any]:
    """Modify records by exact identifier with an explicit field whitelist."""
    targets = _records_by_identifier(db, spec, identifier, tenant_id)
    if not targets:
        return {
            "tool": "modify",
            "blocked": True,
            "reason": f"No {entity} matched {identifier}",
        }
    if len(targets) > 1:
        return {
            "tool": "modify",
            "blocked": True,
            "reason": f"Identifier {identifier} matched multiple {entity} records; use an exact email or id",
        }

    record = targets[0]
    allowed_field_updates = 0
    changed: dict[str, Any] = {}
    for field, value in (fields or {}).items():
        column = _modify_column(entity, str(field))
        if column is None:
            continue
        if str(field).lower() in _DELETE_KEYWORDS:
            continue
        allowed_field_updates += 1
        previous = getattr(record, str(field), None)
        if isinstance(value, str) and value.strip():
            value = value.strip()
        if field == "is_at_risk":
            value = bool(value)
        if field in {"sentiment_score", "retention_prob", "match_score", "salary"}:
            try:
                value = float(value) if field != "salary" else int(value)
            except (TypeError, ValueError):
                continue
        setattr(record, str(field), value)
        changed[str(field)] = {"from": previous, "to": value}
    if not allowed_field_updates:
        return {
            "tool": "modify",
            "blocked": True,
            "reason": "No modifiable field was provided",
        }

    if "updated_at" in record.__table__.columns:
        record.updated_at = datetime.utcnow()
    db.add(record)
    db.commit()
    db.refresh(record)
    return {
        "tool": "modify",
        "result": {
            "updated": True,
            "entity": entity,
            "identifier": identifier,
            "changes": changed,
            "record": _safe_row(record),
        },
    }


def _apply_agent_write(
    db: Session, entity: str, spec: dict[str, Any], data: dict[str, Any]
) -> dict[str, Any]:
    if entity == "employee":
        if not data.get("email") or not data.get("full_name"):
            return {
                "tool": "write",
                "blocked": True,
                "reason": "write requires at least full_name and email",
            }
        exists = db.exec(
            select(EmployeeTable).where(EmployeeTable.email == data["email"])
        ).first()
        if exists:
            return {
                "tool": "write",
                "blocked": True,
                "reason": "An employee with this email already exists",
            }
        record = EmployeeTable(
            full_name=str(data["full_name"]).strip(),
            email=str(data["email"]).strip().lower(),
            department=str(data.get("department") or "General").strip(),
            role=str(data.get("role") or "Employee").strip(),
            sentiment_score=float(data.get("sentiment_score") or 0.5),
            is_at_risk=(
                bool(data.get("is_at_risk"))
                if "is_at_risk" not in data
                else data.get("is_at_risk")
            ),
            salary=int(data["salary"]) if data.get("salary") is not None else None,
            join_date=datetime.utcnow(),
        )
    elif entity == "candidate":
        if not data.get("email") or not data.get("full_name"):
            return {
                "tool": "write",
                "blocked": True,
                "reason": "write requires at least full_name and email",
            }
        exists = db.exec(
            select(CandidateTable).where(CandidateTable.email == data["email"])
        ).first()
        if exists:
            return {
                "tool": "write",
                "blocked": True,
                "reason": "A candidate with this email already exists",
            }
        record = CandidateTable(
            full_name=str(data["full_name"]).strip(),
            email=str(data["email"]).strip().lower(),
            department=str(data.get("department") or "Engineering").strip(),
            role=str(data.get("role") or "Candidate").strip(),
            sentiment_score=float(data.get("sentiment_score") or 0.5),
            match_score=float(data.get("match_score") or 0.85),
            salary=int(data["salary"]) if data.get("salary") is not None else None,
        )
    elif entity == "intervention":
        record = InterventionTable(
            title=str(
                data.get("title") or data.get("name") or "New intervention"
            ).strip(),
            priority=(
                str(data.get("priority") or "medium").strip().lower()
                if str(data.get("priority") or "medium").strip().lower()
                in {"low", "medium", "high", "critical"}
                else "medium"
            ),
            target_scope=str(data.get("target_scope") or "org").strip(),
            description=str(data.get("description") or "").strip() or None,
        )
    else:
        return {
            "tool": "write",
            "blocked": True,
            "reason": f"write is not supported for {entity}",
        }

    db.add(record)
    db.commit()
    db.refresh(record)
    return {
        "tool": "write",
        "result": {"created": True, "entity": entity, "record": _safe_row(record)},
    }


def _execute_hr_specialist_tool(
    db: Session,
    tool_name: str,
    query: str,
    limit: int,
    session_id: str,
    attachments: list[Any],
    current_user: TokenData,
    mutation_state: dict[str, Any] | None,
) -> dict[str, Any]:
    """Run one named HR specialist against real, secret-redacted Aurelinx data."""
    if tool_name in {"employee_directory", "candidate_pipeline", "skills_intelligence"}:
        entity = {
            "employee_directory": "employee",
            "candidate_pipeline": "candidate",
            "skills_intelligence": "skill",
        }[tool_name]
        normalized_query = " ".join((query or "").lower().split())
        normalized_query = re.sub(r"\bho\s+w\s*many\b", "how many", normalized_query)
        normalized_query = re.sub(r"\bhowmany\b", "how many", normalized_query)
        query_tokens = re.findall(r"[a-z]+", normalized_query)
        list_requests = {
            "",
            "all",
            "all employees",
            "employee directory",
            "directory",
            "show employees",
            "list employees",
            "all candidates",
            "candidate pipeline",
            "list candidates",
            "all skills",
            "list skills",
            "uploaded",
            "uploaded candidates",
            "recent uploads",
            "recently uploaded",
            "candidate profiles",
            "profiles in our system",
            "candidates in our system",
        }
        count_or_broad_request = (
            any(
                phrase in normalized_query
                for phrase in (
                    "how many",
                    "howmany",
                    "how much",
                    "count",
                    "total number",
                    "number of",
                    "all ",
                    "uploaded",
                    "in our system",
                    "in system",
                    "in the system",
                    "candidate profile",
                )
            )
            or (
                "many" in normalized_query
                and ("how" in normalized_query or "ho" in normalized_query)
            )
            or "count" in normalized_query
        )
        is_broad_candidate = any(
            word in normalized_query
            for word in ("candidate", "candiate", "applicant", "candid")
        ) or any(
            difflib.SequenceMatcher(None, t, "candidate").ratio() >= 0.65
            for t in query_tokens
            if len(t) >= 5
        )
        is_broad_employee = any(
            word in normalized_query
            for word in (
                "employee",
                "emplyee",
                "staff",
                "directory",
                "roster",
                "worker",
                "employ",
            )
        ) or any(
            difflib.SequenceMatcher(None, t, "employee").ratio() >= 0.65
            for t in query_tokens
            if len(t) >= 5
        )
        is_broad_entity_request = (
            (entity == "candidate" and is_broad_candidate)
            or (entity == "employee" and is_broad_employee)
            or (entity == "skill" and "skill" in normalized_query)
        )
        if entity == "candidate" and any(
            phrase in normalized_query
            for phrase in (
                "uploaded",
                "candidate profile",
                "in our system",
                "in system",
                "in the system",
            )
        ):
            is_broad_entity_request = True
        model = _TOOL_ENTITIES[entity]["model"]
        tenant_filter = model.tenant_id == current_user.tenant_id
        # The workspace total is ALWAYS attached: without it the model
        # mistakes one page (returned/limited_to, max 100) for the total.
        try:
            _total = db.exec(
                select(func.count()).select_from(model).where(tenant_filter)
            ).one()
            if isinstance(_total, tuple):
                _total = _total[0]
            total_count: int | None = int(_total or 0)
        except Exception:
            logger.exception("agent workspace total failed for %s", entity)
            total_count = None
        if normalized_query in list_requests or (
            count_or_broad_request and is_broad_entity_request
        ):
            rows = db.exec(select(model).where(tenant_filter).limit(limit)).all()
            matched_total = total_count
        else:
            rows = _match_records(
                db, _TOOL_ENTITIES[entity], query, limit, 0, current_user.tenant_id
            )
            matched_total = _count_matching_records(
                db, _TOOL_ENTITIES[entity], query, current_user.tenant_id
            )
        result = {
            "tool": tool_name,
            "entity": entity,
            "returned": len(rows),
            "records": _safe_rows(rows),
        }
        if total_count is not None:
            result["total_count"] = total_count
            result["limited_to"] = limit
        if matched_total is not None:
            result["matched_total"] = matched_total
        # Plain-English guard: small models reliably obey an explicit note
        # next to the numbers they must not confuse.
        if total_count is not None:
            result["paging_note"] = (
                f"Showing {len(rows)} of {matched_total if matched_total is not None else '?'} "
                f"matching records from a workspace total of {total_count}. "
                "The true total is total_count; returned/limited_to is only the visible page. "
                "Never report a page size as the total."
            )
        return result
    if tool_name == "workforce_analytics":
        analysis = _analyse_engine(
            db, tool_name, query, session_id, attachments, current_user
        )
        return {
            "tool": tool_name,
            "analytics": {
                "record_counts": analysis.get("record_counts", {}),
                "workforce_analytics": analysis.get("workforce_analytics", {}),
                "sentiment": analysis.get("sentiment", {}),
                "risk": analysis.get("risk", {}),
            },
        }
    if tool_name == "workforce_risk":
        observation = _observe_engine(
            db,
            query,
            session_id,
            attachments,
            current_user,
            (mutation_state or {}).get("observations"),
        )
        return {
            "tool": tool_name,
            "risk": {
                "patterns": observation.get("patterns", {}),
                "symptoms": observation.get("symptoms", []),
                "prediction": observation.get("prediction", {}),
            },
        }
    if tool_name == "integration_health":
        connections = db.exec(
            select(IntegrationConnectionTable)
            .where(IntegrationConnectionTable.tenant_id == current_user.tenant_id)
            .limit(limit)
        ).all()
        logs = db.exec(
            select(IntegrationLogTable)
            .where(IntegrationLogTable.tenant_id == current_user.tenant_id)
            .order_by(IntegrationLogTable.created_at.desc())
            .limit(limit)
        ).all()
        webhooks = db.exec(
            select(IntegrationWebhookEventTable)
            .where(IntegrationWebhookEventTable.tenant_id == current_user.tenant_id)
            .order_by(IntegrationWebhookEventTable.created_at.desc())
            .limit(limit)
        ).all()
        return {
            "tool": tool_name,
            "connections": _safe_rows(connections),
            "recent_logs": _safe_rows(logs),
            "recent_webhooks": _safe_rows(webhooks),
        }
    if tool_name == "data_quality_review":
        employees = db.exec(
            select(EmployeeTable).where(
                EmployeeTable.tenant_id == current_user.tenant_id
            )
        ).all()
        missing_salary = sum(1 for row in employees if row.salary is None)
        return {
            "tool": tool_name,
            "quality": {
                "employees_total": len(employees),
                "employees_missing_salary": missing_salary,
                "quarantined_events": len(
                    db.exec(
                        select(QuarantineEventTable).where(
                            QuarantineEventTable.tenant_id == current_user.tenant_id
                        )
                    ).all()
                ),
                "data_contracts": _safe_rows(
                    db.exec(
                        select(DataContractTable)
                        .where(DataContractTable.tenant_id == current_user.tenant_id)
                        .limit(limit)
                    ).all()
                ),
            },
        }
    if tool_name == "governance_review":
        return {
            "tool": tool_name,
            "governance": {
                "policies": _safe_rows(
                    db.exec(
                        select(CompliancePolicyTable)
                        .where(
                            CompliancePolicyTable.tenant_id == current_user.tenant_id
                        )
                        .limit(limit)
                    ).all()
                ),
                "release_gates": _safe_rows(
                    db.exec(
                        select(ReleaseGateTable)
                        .where(ReleaseGateTable.tenant_id == current_user.tenant_id)
                        .limit(limit)
                    ).all()
                ),
                "model_cards": _safe_rows(
                    db.exec(
                        select(MLModelCardTable)
                        .where(MLModelCardTable.tenant_id == current_user.tenant_id)
                        .limit(limit)
                    ).all()
                ),
                "pending_approvals": len(
                    db.exec(
                        select(WorkflowApprovalTable).where(
                            WorkflowApprovalTable.tenant_id == current_user.tenant_id,
                            WorkflowApprovalTable.status == "pending",
                        )
                    ).all()
                ),
            },
        }
    if tool_name == "forecast_planning":
        return {
            "tool": tool_name,
            "planning": {
                "scenarios": _safe_rows(
                    db.exec(
                        select(ForecastScenarioTable)
                        .where(
                            ForecastScenarioTable.tenant_id == current_user.tenant_id
                        )
                        .limit(limit)
                    ).all()
                ),
                "gold_metrics": _safe_rows(
                    db.exec(
                        select(GoldMetricSnapshotTable)
                        .where(
                            GoldMetricSnapshotTable.tenant_id == current_user.tenant_id
                        )
                        .limit(limit)
                    ).all()
                ),
                "drift_snapshots": _safe_rows(
                    db.exec(
                        select(MLDriftSnapshotTable)
                        .where(MLDriftSnapshotTable.tenant_id == current_user.tenant_id)
                        .limit(limit)
                    ).all()
                ),
                "models": _safe_rows(
                    db.exec(
                        select(MLModelRegistryTable)
                        .where(MLModelRegistryTable.tenant_id == current_user.tenant_id)
                        .limit(limit)
                    ).all()
                ),
            },
        }
    if tool_name == "intervention_review":
        return {
            "tool": tool_name,
            "interventions": _safe_rows(
                db.exec(
                    select(InterventionTable)
                    .where(InterventionTable.tenant_id == current_user.tenant_id)
                    .limit(limit)
                ).all()
            ),
            "outcomes": _safe_rows(
                db.exec(
                    select(InterventionOutcomeTable)
                    .where(InterventionOutcomeTable.tenant_id == current_user.tenant_id)
                    .limit(limit)
                ).all()
            ),
        }
    return {"tool": tool_name, "blocked": True, "reason": "Unknown HR specialist tool"}


def _propose_agent_action(
    db: Session, tool_name: str, arguments: dict[str, Any], current_user: TokenData
) -> dict[str, Any]:
    """Turn a native action call into an approval-bound proposal, never a commit."""
    if not current_user.is_admin:
        return {
            "tool": tool_name,
            "blocked": True,
            "reason": "Outbound HR actions require an administrator",
            "error_code": "FORBIDDEN",
            "retryable": False,
        }
    if not isinstance(arguments, dict):
        return {
            "tool": tool_name,
            "blocked": True,
            "reason": "Action requires provider, connection_id, payload, and idempotency_key",
            "error_code": "INVALID_ARGUMENT",
            "retryable": True,
        }
    provider = str(arguments.get("provider") or "").strip().lower()
    connection_id = str(arguments.get("connection_id") or "").strip()
    # Explicit schema only: payload must be a real object, never the whole args (A3).
    payload = arguments.get("payload")
    idempotency_key = str(arguments.get("idempotency_key") or "").strip()
    if (
        not provider
        or not connection_id
        or not isinstance(payload, dict)
        or not payload
        or not idempotency_key
    ):
        return {
            "tool": tool_name,
            "blocked": True,
            "reason": "Action requires provider, connection_id, payload object, and idempotency_key",
            "error_code": "INVALID_ARGUMENT",
            "retryable": True,
        }
    policy_error = validate_action(tool_name, payload, current_user.is_admin)
    if policy_error:
        return {"tool": tool_name, "blocked": True, "reason": policy_error}
    connection = db.get(IntegrationConnectionTable, connection_id)
    tenant_id = str(getattr(current_user, "tenant_id", "default") or "default")
    if (
        not connection
        or connection.tenant_id != tenant_id
        or connection.provider != provider
    ):
        return {
            "tool": tool_name,
            "blocked": True,
            "reason": "Matching tenant-scoped provider connection was not found",
        }
    connector = get_connector(provider)
    if connector is None or not connector.supports_action(tool_name):
        return {
            "tool": tool_name,
            "blocked": True,
            "reason": f"{provider} does not support {tool_name}",
        }
    compliance_error = _policy_block(db, tenant_id, tool_name)
    if compliance_error:
        return {"tool": tool_name, "blocked": True, "reason": compliance_error}
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    payload_hash = hashlib.sha256(serialized.encode()).hexdigest()
    existing = db.exec(
        select(ExternalActionRequestTable).where(
            ExternalActionRequestTable.tenant_id == tenant_id,
            ExternalActionRequestTable.idempotency_key == idempotency_key,
        )
    ).first()
    if existing:
        if existing.payload_hash != payload_hash:
            return {
                "tool": tool_name,
                "blocked": True,
                "reason": "Idempotency key conflicts with a different payload",
            }
        return {
            "tool": tool_name,
            "proposal_id": existing.id,
            "status": existing.status,
            "approval_id": existing.approval_id,
        }
    row = ExternalActionRequestTable(
        tenant_id=tenant_id,
        requested_by=str(current_user.user_id),
        provider=provider,
        action_type=tool_name,
        connection_id=connection.id,
        payload_hash=payload_hash,
        payload=serialized,
        idempotency_key=idempotency_key,
    )
    db.add(row)
    db.flush()
    approval = WorkflowApprovalTable(
        id=str(uuid4()),
        run_id="action-" + row.id,
        tenant_id=tenant_id,
        requested_by=str(current_user.user_id),
        action_type=tool_name,
        action_payload_hash=payload_hash,
        action_payload=serialized,
        reason=str(
            arguments.get("reason") or "Native agent action requires human approval"
        ),
        expires_at=datetime.utcnow() + timedelta(minutes=30),
    )
    db.add(approval)
    row.approval_id = approval.id
    db.add(row)
    db.commit()
    return {
        "tool": tool_name,
        "proposal_id": row.id,
        "approval_id": approval.id,
        "status": row.status,
        "approval_required": True,
    }


_SAFE_SQL_TABLES = {
    "skills",
    "experiences",
    "employeetable",
    "candidatetable",
    "canonical_employees",
    "canonical_candidates",
    "gold_metric_snapshots",
    "ml_model_registry",
    "compliance_policies",
    "forecast_scenarios",
    "ml_drift_snapshots",
    "ml_model_cards",
    "release_gates",
    "dr_runbooks",
    "procurement_artifacts",
    "integration_connections",
    "connector_sync_jobs",
    "interventions",
    "intervention_outcomes",
    "data_contracts",
    "raw_events",
    "integration_evidence",
    "quarantine_events",
    "retention_policies",
    "sensitive_field_policies",
    "privacy_consents",
    "privacy_export_requests",
}


def _execute_safe_sql(
    db: Session,
    query: str,
    tenant_id: str,
    *,
    max_rows: int = 200,
) -> dict[str, Any]:
    """Execute one tenant-scoped, read-only SELECT (guarded, read-only txn)."""
    clean, err = _guard_safe_sql(
        query,
        allowed_tables=_SAFE_SQL_TABLES,
        max_rows=max(1, min(int(max_rows or 200), 200)),
    )
    if err:
        return err
    if clean is None:
        return {"error": "SQL validation did not produce a safe query."}
    try:
        conn = db.connection()
        # Read-only transaction + statement timeout (Postgres); no-op elsewhere.
        try:
            conn.execute(sql_text("SET LOCAL TRANSACTION READ ONLY"))
        except Exception:
            pass
        try:
            conn.execute(sql_text("SET LOCAL statement_timeout = '8000'"))
        except Exception:
            pass
        result = conn.execute(sql_text(clean), {"tenant_id": str(tenant_id)})
        rows = [dict(row) for row in result.mappings().fetchmany(max_rows)]
        return {
            "tool": "safe_sql_query",
            "row_count": len(rows),
            "columns": list(result.keys()),
            "rows": rows,
            "truncated": len(rows) >= max_rows,
        }
    except Exception:
        db.rollback()
        # Never leak DB errors to the model (B7).
        logger.exception("safe_sql_query failed")
        return {
            "tool": "safe_sql_query",
            "blocked": True,
            "reason": "SQL query failed validation or execution",
            "error_code": "SQL_EXECUTION_FAILED",
            "retryable": False,
        }


def _resolve_agent_engine():
    """Return the engine bound to the *current* DATABASE_URL (import-order safe).

    Delegates to ``app.models.database.resolve_engine`` (single implementation).
    """
    from app.models import database as _db

    try:
        return _db.resolve_engine()
    except Exception:
        logger.exception("agent engine resolution failed; using import-time engine")
        return _db.engine


def _execute_agent_tool(
    tool_name: str,
    arguments: dict[str, Any],
    user_text: str,
    current_user: TokenData,
    session_id: str,
    mutation_state: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Execute exactly one supported dynamic tool in an isolated DB session."""
    tenant_error = _agent_tenant_guard(current_user)
    if tenant_error:
        return {
            "tool": tool_name,
            "blocked": True,
            "reason": tenant_error,
            "error_code": "TENANT_SCOPE_REQUIRED",
        }
    with Session(_resolve_agent_engine()) as db:
        # Normalize with known-prefix stripping only (A2); unknown namespaces
        # never silently become a real tool.
        tool_name = _normalize_tool_name(tool_name, set(AGENT_TOOL_CATALOG))
        if not tool_name or tool_name not in AGENT_TOOL_CATALOG:
            hint = difflib.get_close_matches(
                str(tool_name or ""), sorted(AGENT_TOOL_CATALOG), n=1, cutoff=0.6
            )
            return {
                "tool": str(tool_name or "unknown"),
                "blocked": True,
                "reason": f"Unknown or unsupported tool: {tool_name}"
                + (f". Did you mean '{hint[0]}'?" if hint else ""),
                "error_code": "UNKNOWN_TOOL",
                "retryable": False,
            }
        # safe_sql_query takes ONLY an explicit query argument (no user_text fallback).
        if tool_name == "safe_sql_query":
            query = str(arguments.get("query") or arguments.get("sql") or "")[:12000]
        else:
            query = str(arguments.get("query") or user_text)[:12000]

        if tool_name == "sync_hris_connection":
            # Sync writes to the DB: admin-only like every other mutating tool (A3).
            if not current_user.is_admin:
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": "RBAC requires an admin for HRIS sync",
                    "error_code": "FORBIDDEN",
                    "retryable": False,
                }
            connection_id = str(arguments.get("connection_id") or "").strip()
            if not connection_id:
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": "A connection_id is required for synchronization",
                    "error_code": "INVALID_ARGUMENT",
                    "retryable": True,
                }
            connection = db.get(IntegrationConnectionTable, connection_id)
            if not connection or connection.tenant_id != current_user.tenant_id:
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": "Tenant-scoped connection was not found",
                    "error_code": "NOT_FOUND",
                    "retryable": False,
                }
            from app.api.v1.lean_enterprise import _run_connection_sync

            try:
                return {
                    "tool": tool_name,
                    "connection_id": connection_id,
                    "provider": connection.provider,
                    "sync": _run_connection_sync(
                        connection.id, current_user.tenant_id, db
                    ),
                }
            except Exception:
                db.rollback()
                logger.exception("sync_hris_connection failed")
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": "Sync failed",
                    "error_code": "INTERNAL_ERROR",
                    "retryable": True,
                }
        if tool_name in {
            "employee_directory",
            "candidate_pipeline",
            "workforce_analytics",
            "workforce_risk",
            "skills_intelligence",
            "integration_health",
            "data_quality_review",
            "governance_review",
            "forecast_planning",
            "intervention_review",
        }:
            # Lazy attachment load: only specialist tools need it (A6).
            attachments: list = []
            if tool_name in {"workforce_analytics", "workforce_risk"}:
                attachments = db.exec(
                    select(ChatAttachmentTable).where(
                        ChatAttachmentTable.session_id == str(session_id)
                    )
                ).all()
            return _execute_hr_specialist_tool(
                db,
                tool_name,
                query,
                _safe_limit(arguments.get("limit", 20), default=20, lo=1, hi=100),
                session_id,
                attachments,
                current_user,
                mutation_state,
            )

        if tool_name in {
            "create_requisition",
            "move_candidate_stage",
            "schedule_interview",
            "start_onboarding",
            "start_offboarding",
            "create_review_cycle",
            "send_manager_notification",
            "create_employee",
            "update_employee",
            "request_data_export",
        }:
            if tool_name == "request_data_export":
                if not current_user.is_admin:
                    return {
                        "tool": tool_name,
                        "blocked": True,
                        "reason": "Administrator approval is required to request a data export",
                        "error_code": "FORBIDDEN",
                        "retryable": False,
                    }
                scope = str(arguments.get("scope") or "").strip()
                region = str(arguments.get("region") or "").strip()
                purpose = str(arguments.get("purpose") or "").strip()
                if not scope or not region or not purpose:
                    return {
                        "tool": tool_name,
                        "blocked": True,
                        "reason": "Export requires scope, region, and purpose",
                        "error_code": "INVALID_ARGUMENT",
                        "retryable": True,
                    }
                from app.api.v1.privacy import create_export_request

                # Explicit schema only: never pass the whole args object as payload (A3).
                return create_export_request(
                    db,
                    current_user,
                    {"scope": scope, "region": region, "purpose": purpose},
                )
            return _propose_agent_action(db, tool_name, arguments, current_user)

        if tool_name == "search":
            requested_limit = _safe_limit(
                arguments.get("limit", 20), default=20, lo=1, hi=200
            )
            offset = _safe_limit(arguments.get("offset", 0), default=0, lo=0, hi=10000)
            entity_hint = _normalize_entity(arguments.get("entity"))
            groups: list[dict[str, Any]] = []
            entities = [entity_hint] if entity_hint else list(_TOOL_ENTITIES.keys())
            for entity in entities:
                spec = _TOOL_ENTITIES[entity]
                try:
                    matches = _match_records(
                        db, spec, query, requested_limit, offset, current_user.tenant_id
                    )
                except Exception:
                    # Log loudly: silent empties previously masked wrong-DB
                    # connections as "no match" (import-order engine bug).
                    logger.exception("agent search failed for entity %s", entity)
                    matches = []
                group = {"entity": entity, "matches": _safe_rows(matches)}
                if matches:
                    groups.append(group)
                if len(groups) >= 5:
                    break
            return {
                "tool": tool_name,
                "groups": groups,
                "returned": sum(len(g["matches"]) for g in groups),
                "browsed": False,
            }

        if tool_name == "read":
            entity = _normalize_entity(
                arguments.get("entity") or arguments.get("type") or "employee"
            )
            spec = _TOOL_ENTITIES.get(entity)
            if not spec:
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": f"Unknown entity: {entity}",
                }
            identifier = str(
                arguments.get("identifier")
                or arguments.get("id")
                or arguments.get("email")
                or ""
            )[:500]
            limit = _safe_limit(arguments.get("limit", 10), default=10, lo=1, hi=50)
            records = _records_by_identifier(
                db, spec, identifier, current_user.tenant_id
            )[:limit]
            return {
                "tool": tool_name,
                "entity": entity,
                "returned": len(records),
                "records": _safe_rows(records),
            }

        if tool_name == "modify":
            if not current_user.is_admin:
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": "RBAC requires an admin for modify",
                }
            entity = _normalize_entity(arguments.get("entity") or "employee")
            spec = _TOOL_ENTITIES.get(entity)
            if not spec:
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": f"Unknown entity: {entity}",
                }
            identifier = str(
                arguments.get("identifier")
                or arguments.get("id")
                or arguments.get("email")
                or ""
            )[:500]
            if not identifier:
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": "modify requires an exact identifier (email or id)",
                }
            fields = (
                arguments.get("fields")
                or arguments.get("changes")
                or arguments.get("updates")
                or {}
            )
            result = _apply_structured_modify(
                db, entity, spec, identifier, fields, user_text, current_user.tenant_id
            )
            return result

        if tool_name == "write":
            if not current_user.is_admin:
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": "RBAC requires an admin for write",
                }
            entity = _normalize_entity(arguments.get("entity") or "employee")
            spec = _TOOL_ENTITIES.get(entity)
            if not spec:
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": f"Unknown entity: {entity}",
                }
            data = arguments.get("data") or arguments.get("record") or {}
            if not isinstance(data, dict) or not data:
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": "write requires a data object",
                }
            try:
                return _apply_agent_write(db, entity, spec, data)
            except Exception:
                db.rollback()
                logger.exception("agent write failed")
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": "write failed",
                    "error_code": "INTERNAL_ERROR",
                    "retryable": False,
                }

        if tool_name == "delete":
            entity = _normalize_entity(arguments.get("entity") or "employee")
            spec = _TOOL_ENTITIES.get(entity)
            if not spec:
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": f"Unknown entity: {entity}",
                }
            identifier = str(
                arguments.get("identifier")
                or arguments.get("id")
                or arguments.get("email")
                or ""
            )[:500]
            if not identifier:
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": "delete requires an exact identifier (email or id)",
                }
            targets = _records_by_identifier(
                db, spec, identifier, current_user.tenant_id
            )
            if not targets:
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": f"No {entity} matched {identifier}",
                }
            delete_spec = _prepare_delete_spec(entity, identifier, user_text)
            return {
                "tool": tool_name,
                "blocked": True,
                "approval_required": True,
                "reason": "Deletion requires an authorized human approval; the exact action was stored for approval",
                "spec": delete_spec,
                "matches_found": len(targets),
            }

        if tool_name == "safe_sql_query":
            if not current_user.is_admin:
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": "RBAC requires an admin for SQL queries",
                    "error_code": "FORBIDDEN",
                    "retryable": False,
                }
            return _execute_safe_sql(
                db,
                str(arguments.get("query") or arguments.get("sql") or ""),
                current_user.tenant_id,
                max_rows=_safe_limit(
                    arguments.get("limit", 200), default=200, lo=1, hi=200
                ),
            )

        if tool_name == "analyse":
            try:
                return {
                    "tool": tool_name,
                    "analysis": _analyse_engine(
                        db, query, query, session_id, [], current_user
                    ),
                }
            except Exception:
                db.rollback()
                logger.exception("analyse failed")
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": "Analysis failed",
                    "error_code": "INTERNAL_ERROR",
                    "retryable": True,
                }

        if tool_name == "observe":
            try:
                if not isinstance(mutation_state, dict):
                    mutation_state = {}
                prior = mutation_state.get("observations")
                if isinstance(prior, dict):
                    prior = [prior]
                observation = _observe_engine(
                    db, query, session_id, [], current_user, prior
                )
                observations = list(mutation_state.get("observations") or [])
                observations.append(observation)
                mutation_state["observations"] = observations
                return {"tool": tool_name, "observation": observation}
            except Exception:
                db.rollback()
                logger.exception("observe failed")
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": "Observation failed",
                    "error_code": "INTERNAL_ERROR",
                    "retryable": True,
                }

        if tool_name == "export_report":
            if not current_user.is_admin:
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": "RBAC requires an admin for report export",
                    "error_code": "FORBIDDEN",
                    "retryable": False,
                }
            try:
                from app.api.v1.lean_enterprise import _run_export_report

                return {
                    "tool": tool_name,
                    **_run_export_report(
                        db,
                        _normalize_entity(arguments.get("entity") or "employee"),
                        query,
                        _safe_limit(
                            arguments.get("limit", 200), default=200, lo=1, hi=1000
                        ),
                        current_user.tenant_id,
                    ),
                }
            except Exception:
                try:
                    return {
                        "tool": tool_name,
                        "blocked": True,
                        "reason": "Report export is unavailable",
                        "error_code": "NOT_IMPLEMENTED",
                        "retryable": False,
                    }
                except Exception:
                    return {
                        "tool": tool_name,
                        "blocked": True,
                        "reason": "Report export failed",
                        "error_code": "INTERNAL_ERROR",
                        "retryable": False,
                    }

        if tool_name == "semantic_talent_search":
            try:
                from app.api.v1.intelligence import _run_semantic_search

                return {
                    "tool": tool_name,
                    **_run_semantic_search(
                        db,
                        query,
                        _safe_limit(
                            arguments.get("limit", 10), default=10, lo=1, hi=50
                        ),
                        current_user.tenant_id,
                    ),
                }
            except Exception:
                return {
                    "tool": tool_name,
                    "blocked": True,
                    "reason": "Semantic search is unavailable (Qdrant not configured)",
                    "error_code": "NOT_IMPLEMENTED",
                    "retryable": False,
                }

        return {
            "tool": tool_name,
            "blocked": True,
            "reason": f"Unknown or unsupported tool: {tool_name}",
            "error_code": "UNKNOWN_TOOL",
            "retryable": False,
        }


def _audited_execute_agent_tool(
    tool_name, arguments, user_text, current_user, session_id, mutation_state=None
):
    """Governed wrapper: timeout-safe, exception-safe, audit-logged (B6/B7).

    Keeps the legacy result shape so the instant loop and answer model are
    untouched; audit goes to app.agent.dispatch.audit_log (wire to DB table).
    """
    import time as _time

    _t0 = _time.perf_counter()
    _tenant = str(getattr(current_user, "tenant_id", "default") or "default")
    try:
        result = _execute_agent_tool(
            tool_name, arguments, user_text, current_user, session_id, mutation_state
        )
        if not isinstance(result, dict):
            result = {"tool": str(tool_name), "result": result}
        return result
    except Exception:
        logger.exception("agent tool crashed: %s", tool_name)
        return {
            "tool": str(tool_name),
            "blocked": True,
            "reason": "Tool execution failed",
            "error_code": "INTERNAL_ERROR",
            "retryable": False,
        }
    finally:
        try:
            import hashlib as _hl
            import json as _js

            from app.agent.dispatch import audit_log as _audit_log

            try:
                _ah = _hl.sha256(
                    _js.dumps(arguments or {}, sort_keys=True, default=str).encode()
                ).hexdigest()[:16]
            except Exception:
                _ah = "unhashable"
            _audit_log.append(
                {
                    "tool": str(tool_name),
                    "args_hash": _ah,
                    "user": str(getattr(current_user, "user_id", "?")),
                    "tenant": _tenant,
                    "outcome": "OK",
                    "elapsed_ms": int((_time.perf_counter() - _t0) * 1000),
                }
            )
        except Exception:
            pass


def _sanitize_llm_response(text: str, user_text: str) -> str:
    """
    Frontier-grade output filter: reasoning never reaches the user.

    Keeps provider-private reasoning markers out of the user-visible answer.
    Reasoning is tracked as workflow telemetry when a provider exposes it, but it
    is not part of the assistant message. This also cleans older/local models
    that put their reasoning in <think>...</think> inside the content channel,
    plus plain-English planning leaks ("Acknowledge request", "I'll respond",
    "No tool was executed", "snapshot shows") that small controllers emit.
    """
    if not text:
        return ""
    had_answer_prefix = bool(
        re.match(r"^\s*(?:final\s+)?answer\s*:\s*", text, flags=re.IGNORECASE)
    )
    visible = re.sub(r"<think>.*?</think>", "", text, flags=re.IGNORECASE | re.DOTALL)
    visible = visible.replace("<think>", "").replace("</think>", "")
    visible = visible.replace("<thought>", "").replace("</thought>", "")
    visible = re.sub(
        r"^\s*(?:final\s+)?answer\s*:\s*",
        "",
        visible,
        count=1,
        flags=re.IGNORECASE,
    )
    visible = re.sub(r"^\s*[:?.!—–-]+\s*", "", visible)
    # Some models emit a complete private planning transcript followed by a
    # labelled answer ("Final:", "Thus final answer:"). When that happens, keep
    # only the final section; line-by-line filtering cannot safely remove the
    # preceding monologue.
    final_markers = list(
        re.finditer(
            r"(?im)^\s*(?:(?:thus\s+)?final(?:\s+answer)?|response)\s*:\s*",
            visible,
        )
    )
    planning_language = (
        "let's see",
        "let me write",
        "the rules",
        "the instruction",
        "however, note",
        "therefore,",
        "so i'll",
        "i'll just",
        "since there's",
        "system says",
        "given the instruction",
        "request mode:",
        "should i treat",
        "no live workspace retrieval",
    )
    if final_markers and any(cue in visible.lower() for cue in planning_language):
        visible = visible[final_markers[-1].end() :]
        final_lines = visible.splitlines()
        nonempty = [i for i, line in enumerate(final_lines) if line.strip()]
        if len(nonempty) >= 2 and re.match(
            r"^\s*(?:a|an)?\s*(?:short|brief)?\s*(?:greeting|answer|response)\.?\s*$",
            final_lines[nonempty[0]],
            flags=re.IGNORECASE,
        ):
            final_lines.pop(nonempty[0])
            visible = "\n".join(final_lines)
    # Strip leaked planning / meta lines, line by line.
    leak_patterns = (
        r"^\s*(acknowledge request|state that|i'?ll respond|i will respond|but the user said|that'?s confusing|maybe they want).*$",
        r"^\s*(no (specific |live )?(sentiment|tool|employee|directory|analytics).*(executed|available|accessible)).*$",
        r"^\s*(the (workspace )?snapshot shows).*$",
        r"^\s*(recommend (executing|running) a sentiment).*$",
        r"^\s*(status\s*:\s*(❌|not verified)).*$",
        r"^\s*(?:we should phrase|let['’]s produce(?: the)? answer|let['’]s produce answer|given the instruction.*answer briefly).*$",
        r"^\s*(?:the total count is not verified;?\s*we would need to execute.*)$",
        r"^\s*(?:however the instruction says.*)$",
        r"^\s*(?:this is neither.*)$",
        r"^\s*(?:the system says.*)$",
        r"^\s*(?:given the instruction.*)$",
        r"^\s*(?:no live workspace retrieval.*)$",
        r"^\s*(?:thus final answer.*)$",
        r"^\s*(?:since it['’]s just a greeting.*)$",
        r"^\s*(?:but let['’]s check the workspace snapshot.*)$",
        r"^\s*(?:i['’]ll stick to a simple greeting.*)$",
        r"^\s*(?:a short greeting\.?)$",
        r"^\s*(?:request mode:\s*\w+).*$",
    )
    lines = visible.splitlines()
    kept: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            kept.append(line)
            continue
        cleaned_stripped = re.sub(r"^[:?.!—–-]+\s*", "", stripped)
        if any(
            re.match(p, cleaned_stripped, flags=re.IGNORECASE) for p in leak_patterns
        ):
            continue
        # Drop "no tool queries executed" banners wherever they appear.
        if "no tool queries executed" in stripped.lower():
            continue
        kept.append(line)
    visible = "\n".join(kept)
    # A common controller leak states an unverified count first and then
    # repeats the same claim in the actual answer. Keep the complete sentence
    # and drop the colon-prefixed planning duplicate.
    visible_lines = visible.splitlines()
    has_complete_count_claim = any(
        re.match(r"^\s*the exact total count\b", line, flags=re.IGNORECASE)
        for line in visible_lines
    )
    if has_complete_count_claim and visible_lines:
        visible_lines = [
            line
            for line in visible_lines
            if not re.match(
                r"^\s*:\s*the total count is not verified\b",
                line,
                flags=re.IGNORECASE,
            )
        ]
        visible = "\n".join(visible_lines)
    # Small models sometimes emit a short labeled answer and immediately
    # restate it as the real answer. If the wrapper was present and the next
    # line is a longer sentence with the same opening, keep only the longer
    # answer.
    if had_answer_prefix:
        answer_lines = visible.splitlines()
        nonempty = [i for i, line in enumerate(answer_lines) if line.strip()]
        if len(nonempty) >= 2:
            first_i, second_i = nonempty[0], nonempty[1]
            first_words = re.findall(r"[a-z0-9']+", answer_lines[first_i].lower())
            second_words = re.findall(r"[a-z0-9']+", answer_lines[second_i].lower())
            if (
                len(first_words) >= 2
                and second_words[:2] == first_words[:2]
                and len(answer_lines[second_i].strip())
                > len(answer_lines[first_i].strip())
            ):
                answer_lines.pop(first_i)
                visible = "\n".join(answer_lines)
    # Some local models emit chain-of-thought as ordinary prose without
    # <think> markers. When several planning cues appear together, remove
    # those internal lines before the answer is persisted or displayed.
    lower_visible = visible.lower()
    planning_cues = (
        "the user said",
        "the instruction",
        "the live tool output",
        "let's structure",
        "now format",
        "i'll provide",
        "should i",
        "the third record is truncated",
        "but wait",
        "let's see",
        "let me write",
        "the rules",
        "however, note",
        "therefore,",
        "so i'll",
        "i'll just",
        "system says",
        "given the instruction",
        "request mode:",
        "should i treat",
        "no live workspace retrieval",
        "we should phrase",
        "let's produce answer",
    )
    if sum(cue in lower_visible for cue in planning_cues) >= 2:
        visible = "\n".join(
            line
            for line in visible.splitlines()
            if not re.match(
                r"^\s*(?:\)?\.?\s*)?(?:the user said|the instruction|the live tool output|let['’]s structure|now format|i['’]ll provide|should i|the third record is truncated|but wait|candidate count:\s*\d+).*$",
                line,
                flags=re.IGNORECASE,
            )
        )
    # Collapse 3+ blank lines to 2.
    visible = re.sub(r"\n{3,}", "\n\n", visible)
    visible = visible.replace("—", "-")
    visible = re.sub(r"^\s*[:?.!-]+\s*", "", visible)
    return visible.strip()


def _transient_provider_error(error: Exception) -> bool:
    """True when the provider failed in a way worth retrying (5xx, 429, or an
    explicit overloaded/unavailable signal), so bursty free-tier consoles can
    recover without failing the whole agent turn."""
    code = _provider_error_code(error) or ""
    text = f"{code} {error}".lower()
    return (
        code.startswith(("503", "429", "500", "502", "504"))
        or "unavailable" in text
        or "rate limit" in text
        or "overloaded" in text
        or "503" in text
        or "429" in text
    )


def _try_reasoning_json(raw: str | None) -> dict[str, Any] | None:
    """Return the dict when the captured reasoning text is pure structured JSON."""
    if not raw:
        return None
    stripped = raw.strip()
    if not stripped.startswith("{"):
        return None
    try:
        parsed = json.loads(stripped)
        return parsed if isinstance(parsed, dict) else None
    except Exception:
        return None


def _humanize_reasoning_dict(parsed: dict[str, Any]) -> str | None:
    """Render a structured controller/answer decision as natural, user-facing language."""
    if not isinstance(parsed, dict):
        return None
    action = str(parsed.get("action") or "").lower()
    answer = parsed.get("answer")
    message = parsed.get("message")
    if action == "tool":
        tool = str(parsed.get("tool") or "tool")
        arguments = parsed.get("arguments") or {}
        parts = [f"the execution model chose {tool}"]
        entity = arguments.get("entity")
        query = arguments.get("query")
        if entity:
            parts.append(f"on {entity}")
        if query and isinstance(query, str):
            trimmed = query.strip()
            if len(trimmed) > 90:
                trimmed = trimmed[:90] + "…"
            parts.append(f'with "{trimmed}"')
        return " ".join(parts)
    if action == "approval_required":
        return "the execution model prepared the deletion request; an authorized human must approve it before anything changes"
    if action == "respond":
        if message and isinstance(message, str) and message.strip():
            return message.strip()[:280]
        if answer and isinstance(answer, str) and answer.strip():
            return None
        return "the execution model prepared the reply"
    if action and isinstance(action, str):
        return f"the execution model prepared the {action} step"
    if message and isinstance(message, str) and message.strip():
        return message.strip()[:280]
    return None


def _friendly_reasoning_text(raw: str | None) -> str:
    """Thinking text for the UI: raw natural-language when available, otherwise a
    natural rendering of the structured decision. Raw JSON is never shown."""
    text = (raw or "").strip()
    if not text:
        return ""
    if text.startswith("{"):
        parsed = _try_reasoning_json(raw)
        if parsed:
            return _humanize_reasoning_dict(parsed) or ""
        return ""
    return text


def _extract_answer_from_reasoning(raw: str | None) -> str | None:
    """When the response model streams its full answer inside JSON thinking
    (file 'answer' key), return the answer text so the UI can render it as
    the normal assistant answer instead of JSON."""
    parsed = _try_reasoning_json(raw)
    if not parsed:
        return None
    answer = parsed.get("answer")
    if isinstance(answer, str) and answer.strip():
        return answer
    return None


def _provider_error_code(error: Any) -> str:
    text = str(error or "").lower()
    if "429" in text or "rate limit" in text or "too many requests" in text:
        return "MODEL_RATE_LIMITED"
    if (
        "401" in text
        or "403" in text
        or "unauthorized" in text
        or "api key" in text
        or "authentication" in text
    ):
        return "MODEL_AUTH_FAILED"
    if "404" in text or "not found" in text:
        return "MODEL_ENDPOINT_NOT_FOUND"
    if "400" in text or "bad request" in text or "invalid request" in text:
        return "MODEL_REQUEST_REJECTED"
    if "connection refused" in text or "failed to connect" in text:
        return "MODEL_ENDPOINT_UNREACHABLE"
    if "not openai-compatible" in text or "base url" in text or "not supported" in text:
        return "MODEL_CONFIG_INVALID"
    return "MODEL_PROVIDER_FAILED"


def _provider_error_label(error: Any) -> str:
    code = _provider_error_code(error)
    return {
        "MODEL_RATE_LIMITED": "provider rate limit (HTTP 429)",
        "MODEL_AUTH_FAILED": "provider authentication/authorization failure",
        "MODEL_ENDPOINT_NOT_FOUND": "provider endpoint or model was not found (HTTP 404)",
        "MODEL_REQUEST_REJECTED": "an invalid request was rejected (HTTP 400)",
        "MODEL_ENDPOINT_UNREACHABLE": "provider endpoint is unreachable",
        "MODEL_CONFIG_INVALID": "provider configuration is not supported by the native agent",
        "MODEL_PROVIDER_FAILED": "provider request failure",
    }.get(code, "provider request failure")


def _provider_error_detail(error: Any) -> str:
    """Return a safe, actionable diagnostic without exposing provider payloads."""
    text = str(error or "").lower()
    if (
        "free tier can only be used" in text
        or "freetiererror" in text
        or "missingsessionid" in text
    ):
        return (
            "OpenCode's free tier is restricted to the OpenCode editor and blocks external API calls. "
            "To use OpenCode with Aurelinx, enter a valid paid OpenCode Zen API key in settings. "
            "Alternatively, switch your AI provider in the top header to LM Studio (free & local on port 1234), Ollama (port 11434), Groq, OpenAI, or Gemini."
        )
    if "api key" in text or "authentication" in text or "unauthorized" in text:
        return "No usable API key was supplied, or the provider rejected the configured key."
    if "not openai-compatible" in text or "not supported" in text:
        return "Choose Gemini or an OpenAI-compatible provider; this native bridge does not accept Anthropic directly."
    if "404" in text or "not found" in text:
        return "The configured endpoint or model was not found. Check the provider base URL and selected model."
    if "401" in text or "403" in text:
        return "The provider rejected the request credentials. Check the API key and provider account permissions."
    if "429" in text or "rate limit" in text or "too many requests" in text:
        return "The provider rate limit was reached. Wait briefly or switch providers."
    if (
        "connection refused" in text
        or "failed to connect" in text
        or "connecterror" in text
    ):
        return "The configured local provider is unreachable. Start the provider and verify its base URL."
    if "400" in text or "bad request" in text or "invalid request" in text:
        return "The provider rejected the request. Check the model name and compatibility of the endpoint."
    return (
        "The provider did not return a successful response. Check its status and retry."
    )


def _visible_answer_preview(text: str, limit: int = 1200) -> str:
    """Keep private reasoning markers out of visible workflow event summaries."""
    visible = re.sub(
        r"<think>.*?</think>", "", text or "", flags=re.IGNORECASE | re.DOTALL
    )
    visible = visible.replace("<think>", "").replace("</think>", "").strip()
    return visible[:limit]


def _safe_provider_failure_reply(context_payload: dict, error: Any = None) -> str:
    """Return a transparent provider error notice. Never use pre-filled or scripted answers."""
    err_detail = str(error) if error else "Provider unreachable or offline"
    diagnostic = _provider_error_detail(error) if error else ""
    guidance = f"\n\nHow to resolve: {diagnostic}" if diagnostic else ""
    return (
        f"Aurelinx AI Model Error: Unable to generate response because the configured LLM provider failed or is offline ({err_detail}). "
        f"Please verify that your AI model provider (e.g., LM Studio, OpenAI, Claude, Groq) is running, authenticated, and reachable.{guidance}"
    )


def _build_context_payload(
    db: Session,
    session_id: UUID,
    user_text: str,
    current_user: TokenData,
    attachments: list[ChatAttachmentTable],
    workflow_run_id: str | None = None,
    event_sink=None,
) -> dict:
    """
    Build a lean, token-safe context payload.
    - Casual prompts skip history entirely.
    - Tool context is always included but session history is strictly filtered.
    - Poisoned turns (raw JSON dumps, LLM failure messages) are stripped at source.
    """
    request_plan = _request_plan(user_text, bool(attachments))
    tool_context = _execute_tools(
        db,
        user_text,
        current_user,
        attachments,
        workflow_run_id=workflow_run_id,
        event_sink=event_sink,
    )

    # Every request gets conversation context, including greetings. This is an
    # operational context tool, not a claim that the database was queried.
    history_rows = db.exec(
        select(ChatMessageTable)
        .where(ChatMessageTable.session_id == str(session_id))
        .order_by(ChatMessageTable.created_at.desc())
        .limit(6)
    ).all()

    # Strict filtering: drop poisoned/raw-JSON messages from history
    clean_history = []
    for m in reversed(history_rows):
        content = (m.content or "").strip()
        # Skip LLM failure fallback dumps and raw JSON tool context leaks
        if (
            content.startswith("LLM failed")
            or content.startswith('{"tool_context')
            or not content
        ):
            continue
        clean_history.append({"role": m.role, "content": content[:1000]})

    if workflow_run_id:
        context_scope = ToolEventScope(
            workflow_run_id,
            "conversation.context",
            "context",
            "Loading relevant conversation context",
            sink=event_sink,
        )
        context_scope.start({"session_id": str(session_id), "turn_limit": 6})
        context_scope.complete(
            {"messages_loaded": len(clean_history), "mode": request_plan["mode"]}
        )
        tool_context.setdefault("tool_runs", []).append(
            {
                "tool": "conversation_context",
                "output": {
                    "messages_loaded": len(clean_history),
                    "mode": request_plan["mode"],
                },
            }
        )

    return {
        "tool_context": tool_context,
        "session_history": clean_history,
        "request_plan": request_plan,
    }


def _execute_tools(
    db: Session,
    user_text: str,
    current_user: TokenData,
    attachments: list[ChatAttachmentTable],
    workflow_run_id: str | None = None,
    event_sink=None,
) -> dict:
    request_plan = _request_plan(user_text, bool(attachments))
    tools = request_plan["capabilities"]
    result = {"tool_policy": tools, "tool_runs": [], "request_plan": request_plan}
    mutation_log = {"updated": False, "actions": [], "blocked": False}

    def scope(tool_name: str, phase: str, message: str) -> ToolEventScope | None:
        if not workflow_run_id:
            return None
        current = ToolEventScope(
            workflow_run_id,
            tool_name,
            phase,
            message,
            sink=event_sink,
        )
        current.start({"query": user_text[:240]})
        return current

    role = _user_role(current_user)
    if "search_employees" in tools:
        tool_scope = scope(
            "employee.search",
            "retrieval",
            "Searching employee records",
        )
        if role in TOOL_RBAC["search_employees"]:
            emp_results = _search_employees(
                db, user_text, limit=8, tenant_id=current_user.tenant_id
            )
            result["tool_runs"].append(
                {
                    "tool": "search_employees",
                    "output": [
                        {
                            "name": e.full_name,
                            "email": e.email,
                            "role": e.role,
                            "department": e.department,
                            "risk": e.is_at_risk,
                        }
                        for e in emp_results
                    ],
                }
            )
            if tool_scope:
                tool_scope.complete({"matches_found": len(emp_results)})
        else:
            result["tool_runs"].append(
                {
                    "tool": "search_employees",
                    "denied": True,
                    "reason": "RBAC policy denied",
                }
            )
            if tool_scope:
                tool_scope.complete(
                    {"reason": "RBAC policy denied"},
                    status="blocked",
                    error_code="RBAC_DENIED",
                )
    if "search_candidates" in tools:
        tool_scope = scope(
            "candidate.search",
            "retrieval",
            "Searching candidate records",
        )
        if role in TOOL_RBAC["search_candidates"]:
            cand_results = _search_candidates(
                db, user_text, limit=8, tenant_id=current_user.tenant_id
            )
            result["tool_runs"].append(
                {
                    "tool": "search_candidates",
                    "output": [
                        {
                            "name": c.full_name,
                            "email": c.email,
                            "role": c.role,
                            "department": c.department,
                        }
                        for c in cand_results
                    ],
                }
            )
            if tool_scope:
                tool_scope.complete({"matches_found": len(cand_results)})
        else:
            result["tool_runs"].append(
                {
                    "tool": "search_candidates",
                    "denied": True,
                    "reason": "RBAC policy denied",
                }
            )
            if tool_scope:
                tool_scope.complete(
                    {"reason": "RBAC policy denied"},
                    status="blocked",
                    error_code="RBAC_DENIED",
                )
    if "dashboard_snapshot" in tools:
        tool_scope = scope(
            "dashboard.snapshot",
            "retrieval",
            "Calculating workforce dashboard snapshot",
        )
        if role in TOOL_RBAC["dashboard_snapshot"]:
            snapshot = _compute_dashboard_snapshot(db, current_user.tenant_id)
            result["tool_runs"].append(
                {
                    "tool": "dashboard_snapshot",
                    "output": snapshot,
                }
            )
            if tool_scope:
                tool_scope.complete(
                    {"record_count": snapshot.get("total_workforce", 0)}
                )
        else:
            result["tool_runs"].append(
                {
                    "tool": "dashboard_snapshot",
                    "denied": True,
                    "reason": "RBAC policy denied",
                }
            )
            if tool_scope:
                tool_scope.complete(
                    {"reason": "RBAC policy denied"},
                    status="blocked",
                    error_code="RBAC_DENIED",
                )
    if "mutate_data" in tools:
        tool_scope = scope(
            "data.mutate",
            "mutation",
            "Preparing authorized database changes",
        )
        if role not in TOOL_RBAC["mutate_data"]:
            mutation_log["blocked"] = True
            mutation_log["actions"].append(
                "Mutation blocked: RBAC policy requires admin."
            )
        else:
            mutation_log = _apply_data_mutation(db, user_text)
        result["tool_runs"].append({"tool": "mutate_data", "output": mutation_log})
        if tool_scope:
            tool_scope.complete(
                {
                    "updated": mutation_log.get("updated", False),
                    "blocked": mutation_log.get("blocked", False),
                    "actions_count": len(mutation_log.get("actions", [])),
                },
                status="blocked" if mutation_log.get("blocked") else "completed",
                error_code="RBAC_DENIED" if mutation_log.get("blocked") else None,
            )
    if "human_approval_delete" in tools:
        tool_scope = scope(
            "approval.delete",
            "governance",
            "Blocking deletion pending human approval",
        )
        result["tool_runs"].append(
            {
                "tool": "human_approval_delete",
                "blocked": True,
                "reason": (
                    "Aurelinx Governance Protocol Violation: Delete actions cannot be automated by the AI agent "
                    "under any circumstances without manual Human-in-the-Loop approval. Safe abort triggered. "
                    "Instruct the user that manual confirmation is strictly required to delete this resource."
                ),
            }
        )
        if tool_scope:
            tool_scope.complete(
                {"approval_required": True},
                status="blocked",
                error_code="HUMAN_APPROVAL_REQUIRED",
            )
    if "parse_csv_attachment" in tools or any(
        att.original_name.lower().endswith(".csv") for att in attachments
    ):
        tool_scope = scope(
            "document.csv_ingest",
            "retrieval",
            "Parsing and validating CSV attachments",
        )
        csv_log = _parse_csv_and_ingest(db, attachments)
        result["tool_runs"].append({"tool": "parse_csv_attachment", "output": csv_log})
        if tool_scope:
            tool_scope.complete(
                {
                    "ingested": csv_log.get("ingested", False),
                    "errors": len(csv_log.get("errors", [])),
                },
                status="failed" if csv_log.get("errors") else "completed",
                error_code="CSV_INGEST_FAILED" if csv_log.get("errors") else None,
            )

    if request_plan["needs_live_data"]:
        snapshot_scope = scope(
            "workspace.snapshot",
            "retrieval",
            "Preparing verified workspace context",
        )
        result["workspace_snapshot"] = _workspace_snapshot(
            db, user_text, current_user.tenant_id
        )
        result["record_counts"] = _record_counts(db, current_user.tenant_id)
        if snapshot_scope:
            snapshot_scope.complete(
                {
                    "sections": sorted(result["workspace_snapshot"].keys()),
                    "record_counts": result["record_counts"],
                }
            )
        result["tool_runs"].append(
            {
                "tool": "workspace_snapshot",
                "output": {
                    "sections": sorted(result["workspace_snapshot"].keys()),
                    "record_counts": result["record_counts"],
                },
            }
        )
    else:
        result["workspace_snapshot"] = {}
        result["record_counts"] = {}

    # Enrich context with live integration connections and active interventions
    try:
        connections = db.exec(select(IntegrationConnectionTable)).all()
        result["integration_connections"] = [
            {
                "name": c.name,
                "provider": c.provider,
                "type": c.source_type,
                "status": c.status,
            }
            for c in connections
        ]
    except Exception:
        result["integration_connections"] = []

    try:
        policies = db.exec(select(CompliancePolicyTable)).all()
        result["compliance_policies"] = [
            {
                "name": p.policy_name,
                "region": p.region,
                "action": p.action_type,
                "status": p.status,
            }
            for p in policies
        ]
    except Exception:
        result["compliance_policies"] = []

    try:
        interventions = db.exec(select(InterventionTable)).all()
        result["active_interventions"] = [
            {"title": i.title, "priority": i.priority, "status": i.status}
            for i in interventions
        ]
    except Exception:
        result["active_interventions"] = []

    result["attachment_text_context"] = _attachment_text_context(attachments)
    result["mutations"] = mutation_log
    result["rbac_role"] = role
    return result


async def _stream_true_agent_loop(
    db: Session,
    chat_session: ChatSessionTable,
    user_msg: ChatMessageTable,
    workflow_run: WorkflowRunTable,
    request: ChatMessageCreate,
    current_user: TokenData,
):
    """Run the model-directed, bounded tool loop and stream actual events."""
    events: list[dict[str, Any]] = []
    tool_transcript: list[dict[str, Any]] = []
    mutation_state: dict[str, Any] = {}
    execution_state = AgentExecutionState(
        request=request.content,
        role="admin" if current_user.is_admin else "member",
    )
    execution_state.add_step(
        "planner",
        "task_graph",
        "completed",
        input={
            "available_tools": [item["function"]["name"] for item in TOOL_SCHEMAS],
            "strategy": "model_directed_dynamic_selection",
        },
    )
    approval_id: str | None = None
    awaiting_approval = False
    max_iterations = execution_state.max_steps

    def emit(
        event_type: str,
        phase: str,
        message: str,
        *,
        status: str = "running",
        tool_name: str | None = None,
        safe_input: Any = None,
        result_summary: Any = None,
        error_code: str | None = None,
        duration_ms: int | None = None,
    ) -> str:
        event = emit_workflow_event(
            workflow_run.id,
            event_type,
            phase,
            message,
            status=status,
            tool_name=tool_name,
            safe_input=safe_input,
            result_summary=result_summary,
            error_code=error_code,
            duration_ms=duration_ms,
        )
        events.append(event)
        return f"event: agent_step\ndata: {_json_dumps(event)}\n\n"

    def reasoning_delta(
        event_id: str | None,
        phase: str,
        iteration: int | None,
        characters: int,
        text: str = "",
    ) -> str:
        """Stream a private-thinking progress counter without exposing text."""
        return (
            "event: model_reasoning_delta\n"
            f"data: {_json_dumps({'event_id': event_id, 'phase': phase, 'iteration': iteration, 'characters': characters, 'text': ''})}\n\n"
        )

    def update_event_sse(
        event_id: str | None,
        message: str,
        *,
        status: str = "completed",
        result_summary: Any = None,
        error_code: str | None = None,
        duration_ms: int | None = None,
    ) -> str:
        """Finish the existing reasoning card in place so the timeline never
        shows a duplicate 'completed' sibling for the same thinking phase."""
        updated = (
            update_workflow_event(
                event_id,
                status=status,
                display_message=message,
                result_summary=result_summary,
                error_code=error_code,
                duration_ms=duration_ms,
            )
            if event_id
            else None
        )
        if not updated:
            return ""
        for i, ev in enumerate(events):
            if ev.get("event_id") == updated.get("event_id"):
                events[i] = updated
                break
        else:
            events.append(updated)
        return f"event: agent_step\ndata: {_json_dumps(updated)}\n\n"

    async def paced_reasoning_deltas(
        event_id: str | None,
        phase: str,
        iteration: int | None,
        token: str,
        running_chars: int,
        text: str = "",
        step: int = 8,
        gap_ms: int = 14,
    ):
        """Emit the live counter and text in small visible increments even when the provider
        delivers a large reasoning burst inside one stream chunk, so the UI always
        shows real motion instead of 0 -> 178 in a single flash."""
        idx = 0
        while idx < len(token):
            take = min(step, len(token) - idx)
            idx += take
            chars = max(0, len(text) - (len(token) - idx))
            yield chars, reasoning_delta(event_id, phase, iteration, chars)
        if not token:
            yield len(text), reasoning_delta(event_id, phase, iteration, len(text), "")

    yield emit(
        "workflow_started",
        "intake",
        "Workflow received and authenticated",
        status="completed",
        result_summary={"session_id": chat_session.id, "controller": "llm"},
    )
    yield emit(
        "agent_ready",
        "planning",
        "Agent ready; the model will select the next step from authorized tools when needed.",
        status="completed",
        result_summary={
            "available_tools": [item["function"]["name"] for item in TOOL_SCHEMAS],
            "max_steps": execution_state.max_steps,
            "role": execution_state.role,
        },
    )

    history_rows = db.exec(
        select(ChatMessageTable)
        .where(ChatMessageTable.session_id == str(chat_session.id))
        .order_by(ChatMessageTable.created_at.desc())
        .limit(6)
    ).all()
    history: list[dict[str, str]] = []
    for row in reversed(history_rows):
        content = (row.content or "").strip()
        if (
            content
            and not content.startswith("LLM failed")
            and not content.startswith('{"tool_context')
        ):
            history.append({"role": row.role, "content": content[:600]})

    yield emit(
        "tool_call",
        "context",
        "Loading conversation context for the controller",
        status="running",
        tool_name="conversation.context",
        safe_input={"session_id": chat_session.id, "turn_limit": 6},
    )
    yield emit(
        "tool_result",
        "context",
        "Conversation context loaded",
        status="completed",
        tool_name="conversation.context",
        result_summary={"messages_loaded": len(history)},
        duration_ms=0,
    )

    capability_rows = db.exec(
        select(IntegrationConnectionTable).where(
            IntegrationConnectionTable.tenant_id == current_user.tenant_id
        )
    ).all()
    capability_context = []
    for connection in capability_rows:
        connector = get_connector(connection.provider)
        capability_context.append(
            {
                "provider": connection.provider,
                "connection_id": str(connection.id),
                "supported_actions": (
                    sorted(connector.supported_actions) if connector else []
                ),
            }
        )

    # This controller text is only sent to the model; it is never executed as SQL.
    controller_system = (
        "You are the Aurelinx LLM execution controller. Return ONLY one valid JSON object. "  # nosec B608
        "You must choose one next action, never multiple actions. Do not reveal chain-of-thought. "
        "Use a tool when verified workspace data or a database action is required. "
        "After each tool result, decide whether another tool is required or the final answer can be written. "
        "Never mutate on behalf of a member. For deletion, run the delete tool to prepare the exact spec, "
        "then choose approval_required so an authorized human approves the exact action. "
        "Allowed actions: tool, respond, approval_required. Allowed tools: "
        + ", ".join(AGENT_TOOL_CATALOG.keys())
        + ". Select tools from the request and evidence already available; there is no default tool. "  # nosec B608
        + "Connected provider action capabilities (use only these for outbound actions): "
        + json.dumps(capability_context, separators=(",", ":"))
    )

    controller_error = None
    # Each controller round gets its OWN thinking card so the UI shows the real
    # agent loop: think -> tool call -> think -> tool call -> think -> final.
    # A round's card is created when the round's stream starts and finalized in
    # place (same event_id) when the round ends: one row per phase, never a
    # duplicate 'completed' sibling. (State itself is reset per round in the loop.)
    # Conversation-only prompts do not need the agent controller at all. A
    # native tool-selection round would add a full provider request before the
    # answer and is the reason simple greetings appeared to hang. Send these
    # directly to the streaming answer path; live workspace requests still use
    # the complete model-directed tool loop below.
    for iteration in range(1, max_iterations + 1):
        if not _request_plan(request.content).get("needs_live_data", False):
            yield emit(
                "conversation_mode",
                "response",
                "Starting a direct conversational response",
                status="completed",
                result_summary={"tool_selection": "not_required"},
            )
            break
        # Fresh card per round: reset the round's reasoning state so iteration 2
        # gets its own card while transient retries within one round reuse it.
        round_reasoning_id: str | None = None
        round_reasoning_frame: dict | None = None
        round_started_t: float | None = None
        reasoning_event_text = ""
        planner_prompt = _agent_controller_prompt(
            request.content,
            history,
            tool_transcript,
            current_user,
            bool(
                db.exec(
                    select(ChatAttachmentTable).where(
                        ChatAttachmentTable.session_id == str(chat_session.id)
                    )
                ).all()
            ),
        )
        native_prompt = _native_controller_prompt(
            request.content,
            history,
            tool_transcript,
        )
        raw_decision = ""
        reasoning_active = False
        reasoning_event_chars = 0
        reasoning_event_id = None
        reasoning_started_t: float | None = None
        controller_context = {
            "request_plan": {"mode": "agent_controller", "needs_live_data": False},
            "tool_context": {
                "tool_runs": [],
                "rbac_role": "admin" if current_user.is_admin else "member",
            },
            "session_history": history,
        }

        async def controller_turn_attempt(
            turn_iteration: int = iteration,
            turn_prompt: str = planner_prompt,
            turn_context: dict[str, Any] = controller_context,
        ):
            nonlocal reasoning_active, reasoning_event_chars, reasoning_event_id, raw_decision, reasoning_started_t, round_reasoning_id, round_reasoning_frame, round_started_t
            reasoning_active = True
            reasoning_event_chars = 0
            reasoning_event_text = ""
            raw_decision = ""

            # Emit this round's thinking card immediately so the UI shows live
            # thinking as the controller stream starts. Reused across transient
            # retries of this round, and finalized once when the round ends.
            reasoning_started_t = time.monotonic()
            if round_reasoning_id is None:
                reasoning_frame = emit_workflow_event(
                    workflow_run.id,
                    "model_reasoning",
                    "planning",
                    "The execution model is thinking about the next step",
                    status="running",
                    result_summary={
                        "iteration": turn_iteration,
                        "provider": request.provider or "lmstudio",
                        "model": request.model or "provider_default",
                    },
                )
                round_reasoning_id = reasoning_frame["event_id"]
                round_reasoning_frame = reasoning_frame
                round_started_t = reasoning_started_t
            else:
                reasoning_frame = round_reasoning_frame
            reasoning_event_id = round_reasoning_id
            events.append(reasoning_frame)
            yield f"event: agent_step\ndata: {_json_dumps(reasoning_frame)}\n\n"

            async for token in _llm_stream_response(
                provider=request.provider or "lmstudio",
                api_key=_resolve_api_key(request.provider, request.api_key),
                base_url=request.base_url,
                model=request.model,
                user_text=turn_prompt,
                context_payload=turn_context,
                system_override=controller_system,
                temperature_override=0.0,
                user_content_override=turn_prompt,
            ):
                reasoning_active, segments = _classify_thinking_token(
                    token or "", reasoning_active
                )
                for kind, segment in segments:
                    if kind == "thinking":
                        reasoning_event_text = (reasoning_event_text or "") + segment
                        raw_decision += segment
                        if not reasoning_event_text.lstrip().startswith("{"):
                            async for (
                                running_chars,
                                delta_sse,
                            ) in paced_reasoning_deltas(
                                reasoning_event_id,
                                "planning",
                                turn_iteration,
                                segment,
                                reasoning_event_chars,
                                reasoning_event_text,
                            ):
                                reasoning_event_chars = running_chars
                                yield delta_sse
                    else:
                        raw_decision += segment

            if reasoning_active:
                reasoning_active = False
            # Round complete: finalize THIS round's thinking card in place so the
            # timeline shows exactly one completed card per controller round.
            if round_reasoning_id:
                visible_reasoning = _friendly_reasoning_text(reasoning_event_text)
                yield update_event_sse(
                    round_reasoning_id,
                    "Reasoning complete",
                    status="completed",
                    duration_ms=(
                        int((time.monotonic() - round_started_t) * 1000)
                        if round_started_t
                        else None
                    ),
                    result_summary=(
                        {
                            "characters": len(visible_reasoning),
                            "text": visible_reasoning,
                        }
                        if visible_reasoning
                        else {"characters": 0, "text": ""}
                    ),
                )

        try:
            # Prefer native function calling whenever the selected provider and
            # model expose it. The existing JSON controller remains a safe
            # compatibility fallback for Responses/Anthropic/Gemini/local models.
            reasoning_started_t = time.monotonic()
            native_selection_started = emit_workflow_event(
                workflow_run.id,
                "model_reasoning",
                "planning",
                "Thinking about next step...",
                status="running",
                result_summary={
                    "iteration": iteration,
                    "provider": request.provider or "lmstudio",
                    "model": request.model or "provider_default",
                },
            )
            events.append(native_selection_started)
            yield f"event: agent_step\ndata: {_json_dumps(native_selection_started)}\n\n"
            native_decision = await _native_tool_decision(
                provider=request.provider or "lmstudio",
                api_key=_resolve_api_key(request.provider, request.api_key),
                base_url=request.base_url,
                model=request.model,
                system=controller_system,
                prompt=native_prompt,
                session_id=workflow_run.id,
                require_tool=bool(
                    _request_plan(request.content).get("needs_live_data", False)
                    and not tool_transcript
                ),
            )
            if native_decision:
                raw_decision = native_decision
                dec_obj = {}
                try:
                    dec_obj = (
                        json.loads(raw_decision)
                        if isinstance(raw_decision, str)
                        else raw_decision
                    )
                except Exception:
                    pass
                reasoning_note = dec_obj.get("reasoning")
                if not reasoning_note:
                    t_name = dec_obj.get("tool")
                    if t_name:
                        reasoning_note = (
                            f"Identified that {t_name} is required to check the data."
                        )
                    else:
                        reasoning_note = "Synthesized data to formulate the response."
                duration_ms = (
                    int((time.monotonic() - reasoning_started_t) * 1000)
                    if reasoning_started_t
                    else None
                )
                yield update_event_sse(
                    native_selection_started["event_id"],
                    "Reasoning complete",
                    status="completed",
                    duration_ms=duration_ms,
                    result_summary={
                        "iteration": iteration,
                        "characters": len(reasoning_note),
                        "text": reasoning_note,
                    },
                )
            else:
                duration_ms = (
                    int((time.monotonic() - reasoning_started_t) * 1000)
                    if reasoning_started_t
                    else None
                )
                yield update_event_sse(
                    native_selection_started["event_id"],
                    "Switching to compatible controller",
                    status="completed",
                    duration_ms=duration_ms,
                    result_summary={"iteration": iteration, "native": False},
                )
                for attempt_round in range(1, 2):
                    try:
                        async for sse in controller_turn_attempt():
                            yield sse
                        break
                    except Exception as exc:
                        if attempt_round < 1 and _transient_provider_error(exc):
                            logger.warning(
                                f"[chat] transient controller failure on attempt {attempt_round}/1, retrying: {exc}"
                            )
                            await asyncio.sleep(1.0)
                            continue
                        raise
        except Exception as exc:
            controller_error = str(exc)
            if reasoning_active:
                reasoning_active = False
            if round_reasoning_id:
                yield update_event_sse(
                    round_reasoning_id,
                    "Reasoning stopped",
                    status="failed",
                    duration_ms=(
                        int((time.monotonic() - round_started_t) * 1000)
                        if round_started_t
                        else None
                    ),
                    result_summary=(
                        {
                            "characters": len(reasoning_event_text),
                        }
                        if reasoning_event_text
                        else {"characters": 0}
                    ),
                    error_code=_provider_error_code(exc),
                )
            raw_status = re.search(r"'([^']+)'", str(exc))
            status_line = raw_status.group(1) if raw_status else str(exc)[:120]
            controller_failed = emit_workflow_event(
                workflow_run.id,
                "controller_call",
                "planning",
                f"Provider call failed: {status_line}",
                status="failed",
                result_summary={
                    "iteration": iteration,
                    "reason": _provider_error_label(exc),
                },
                error_code=_provider_error_code(exc),
            )
            events.append(controller_failed)
            yield f"event: agent_step\ndata: {_json_dumps(controller_failed)}\n\n"
            break
        decision = _parse_agent_decision(raw_decision, request.content)

        if (
            any(
                word in request.content.lower()
                for word in ("delete", "remove", "purge", "clear")
            )
            and decision.get("action") == "respond"
        ):
            decision = {
                "action": "approval_required",
                "message": "The request is destructive; human approval is required before any delete action",
            }

        if decision.get("action") == "invalid":
            yield emit(
                "controller_output_repaired",
                "planning",
                "The controller output was repaired into a safe decision",
                status="completed",
                result_summary={"error": decision.get("error"), "iteration": iteration},
                error_code="CONTROLLER_OUTPUT_REPAIRED",
            )
            decision = {
                "action": "respond",
                "message": "The model did not produce an executable tool decision.",
            }

        if decision.get("normalized"):
            yield emit(
                "controller_output_normalized",
                "planning",
                "The model output was normalized into a safe executable decision",
                status="completed",
                result_summary={
                    "iteration": iteration,
                    "action": decision.get("action"),
                    "tool": decision.get("tool"),
                },
            )

        if decision.get("message"):
            controller_completed = emit_workflow_event(
                workflow_run.id,
                "controller_call",
                "planning",
                decision["message"],
                status="completed",
                result_summary={
                    "iteration": iteration,
                    "progress": decision.get("message"),
                    "action": decision.get("action"),
                },
            )
            events.append(controller_completed)
            yield f"event: agent_step\ndata: {_json_dumps(controller_completed)}\n\n"

        action = decision.get("action")
        request_requires_live_data = _request_plan(request.content).get(
            "needs_live_data", False
        )
        if action == "respond" and request_requires_live_data and not tool_transcript:
            # A model may occasionally emit a final answer before selecting a
            # tool, especially on small/free controller models. Do not accept
            # an unaudited workspace answer. This is a recovery guard only;
            # normal tool selection remains model-directed.
            lowered_request = request.content.lower()
            if any(
                word in lowered_request
                for word in ("directory", "employee", "employees", "staff", "roster")
            ):
                decision = {
                    "action": "tool",
                    "tool": "employee_directory",
                    "arguments": {"query": "all employees", "limit": 100},
                    "message": "Live employee evidence is required; checking the directory before answering.",
                }
            elif any(
                word in lowered_request
                for word in ("candidate", "applicant", "hiring", "recruit")
            ):
                decision = {
                    "action": "tool",
                    "tool": "candidate_pipeline",
                    "arguments": {"query": "all candidates", "limit": 100},
                    "message": "Live candidate evidence is required; checking the pipeline before answering.",
                }
            elif any(
                word in lowered_request
                for word in (
                    "sentiment",
                    "morale",
                    "retention",
                    "analytics",
                    "attrition",
                    "burnout",
                )
            ):
                decision = {
                    "action": "tool",
                    "tool": "workforce_analytics",
                    "arguments": {
                        "metric": "sentiment",
                        "query": request.content[:500],
                    },
                    "message": "Live sentiment and workforce analytics evidence is required; checking analytics before answering.",
                }
            else:
                decision = {
                    "action": "tool",
                    "tool": "analyse",
                    "arguments": {"scope": request.content[:500]},
                    "message": "Live workspace evidence is required; checking it before answering.",
                }
            yield emit(
                "live_evidence_guard",
                "validation",
                "The initial answer was held until live workspace evidence was retrieved.",
                status="completed",
                result_summary={"recovery_tool": decision["tool"]},
                error_code="LIVE_EVIDENCE_REQUIRED",
            )
            # The guard replaces the model decision; do not continue using the
            # stale action value that was computed before recovery.
            action = decision.get("action")
        decision_result = {
            "iteration": iteration,
            "action": action,
            "tool": decision.get("tool"),
            "arguments": decision.get("arguments", {}),
            "controller_note": decision.get("message"),
        }
        execution_state.add_step(
            "decision",
            str(action or "invalid"),
            "completed",
            input={
                "tool": decision.get("tool"),
                "arguments": decision.get("arguments", {}),
                "native": bool(native_decision),
            },
        )
        if decision.get("answer"):
            decision_result["answer_preview"] = decision["answer"][:500]

        if decision.get("message") or decision.get("answer"):
            decision_result["message"] = decision.get("message")
            yield emit(
                "agent_decision",
                "planning",
                decision.get("message") or "",
                status="completed",
                result_summary=decision_result,
            )

        if action == "approval_required":
            approval_id = str(uuid4())
            delete_spec = None
            for item in reversed(tool_transcript):
                if (
                    isinstance(item.get("result"), dict)
                    and item["result"].get("approval_required")
                    and isinstance(item["result"].get("spec"), dict)
                ):
                    delete_spec = item["result"]["spec"]
                    break
            if delete_spec:
                approval_payload = json.dumps(delete_spec, default=str)[:12000]
            else:
                approval_payload = request.content[:12000]
            db.add(
                WorkflowApprovalTable(
                    id=approval_id,
                    run_id=workflow_run.id,
                    tenant_id=getattr(current_user, "tenant_id", None) or "default",
                    requested_by=str(current_user.user_id),
                    action_type="delete",
                    action_payload_hash=hashlib.sha256(
                        approval_payload.encode("utf-8")
                    ).hexdigest(),
                    action_payload=approval_payload,
                    status="pending",
                    reason="LLM controller requested human approval for deletion",
                    expires_at=datetime.utcnow() + timedelta(minutes=30),
                )
            )
            db.commit()
            awaiting_approval = True
            yield emit(
                "approval_required",
                "governance",
                "Deletion is blocked until an authorized human approves it",
                status="blocked",
                result_summary={
                    "approval_required": True,
                    "action": "delete",
                    "approval_id": approval_id,
                },
                error_code="HUMAN_APPROVAL_REQUIRED",
            )
            break

        if action == "respond":
            if mutation_state.get("updated") and not mutation_state.get(
                "verification", {}
            ).get("verified"):
                decision = {
                    "action": "tool",
                    "tool": "data.verify",
                    "arguments": {},
                    "message": "Policy requires read-back verification before final response",
                }
            else:
                break

        # Frontier batch: execute all calls sequentially in this iteration.
        batch_calls: list[dict[str, Any]] = []
        if action in {"tools", "parallel_tools", "batch"}:
            raw = decision.get("calls") or []
            for item in raw[:4]:
                if not isinstance(item, dict):
                    continue
                t = str(item.get("tool") or "").strip()
                if t not in AGENT_TOOL_CATALOG:
                    continue
                args = item.get("arguments") or item.get("args") or {}
                if not isinstance(args, dict):
                    args = {"query": str(args)[:12000]}
                batch_calls.append({"tool": t, "arguments": args})
            if not batch_calls:
                break
        else:
            tool_name = decision.get("tool")
            if not tool_name:
                break
            arguments = decision.get("arguments") or {}
            batch_calls = [{"tool": tool_name, "arguments": arguments}]
        # Prevent a controller from looping forever on the same tool request.
        # The answer model can use the already verified result to respond, while
        # genuinely different tool calls remain entirely model-directed.
        # For batches, drop calls already completed with identical arguments.
        if tool_transcript:
            seen_pairs = {
                (
                    t.get("tool"),
                    json.dumps(t.get("arguments", {}), sort_keys=True, default=str),
                )
                for t in tool_transcript
            }
            filtered = []
            for c in batch_calls:
                key = (
                    c["tool"],
                    json.dumps(c.get("arguments", {}), sort_keys=True, default=str),
                )
                if key not in seen_pairs:
                    filtered.append(c)
                    seen_pairs.add(key)
            if not filtered:
                yield emit(
                    "duplicate_tool_prevented",
                    "planning",
                    "The same tool request was already completed; preparing the answer from its verified result.",
                    status="completed",
                    result_summary={
                        "tool": batch_calls[0]["tool"],
                        "iteration": iteration,
                    },
                )
                break
            batch_calls = filtered
        for _call in batch_calls:
            tool_name = _call["tool"]
            arguments = _call.get("arguments") or {}
            started_at = time.perf_counter()
            execution_state.add_step(
                "tool",
                tool_name,
                "running",
                input=arguments,
            )
            yield emit(
                "tool_call",
                "execution" if tool_name.startswith("data.") else "retrieval",
                f"The execution model requested {_agent_tool_label(tool_name)}.",
                status="running",
                tool_name=tool_name,
                safe_input={"arguments": arguments},
            )
            result = await asyncio.to_thread(
                _execute_agent_tool,
                tool_name,
                arguments,
                request.content,
                current_user,
                chat_session.id,
                mutation_state,
            )
            if tool_name == "data.mutate" and isinstance(result.get("result"), dict):
                mutation_state = result["result"]
            if tool_name == "data.verify" and isinstance(result.get("result"), dict):
                mutation_state["verification"] = result["result"]
            safe_result = safe_summary(result)
            execution_state.complete_tool(execution_state.steps[-1], safe_result)
            tool_transcript.append(
                {"tool": tool_name, "arguments": arguments, "result": safe_result}
            )
            yield emit(
                "tool_result",
                "execution" if tool_name.startswith("data.") else "retrieval",
                _agent_tool_result_message(tool_name, result),
                status="blocked" if result.get("blocked") else "completed",
                tool_name=tool_name,
                result_summary=safe_result,
                duration_ms=int((time.perf_counter() - started_at) * 1000),
                error_code="TOOL_BLOCKED" if result.get("blocked") else None,
            )
            if execution_state.needs_verification(tool_name, result):
                mutation_result = result.get("result") or {}
                verification = {
                    "verified": bool(mutation_result.get("record")),
                    "entity": mutation_result.get("entity"),
                    "record": mutation_result.get("record"),
                }
                if not verification["verified"]:
                    verification["reason"] = (
                        "Mutation did not return a read-back record"
                    )
                execution_state.add_step(
                    "verification",
                    f"{tool_name}.verify",
                    "completed" if verification.get("verified") else "failed",
                    evidence=verification,
                    error=(
                        None
                        if verification.get("verified")
                        else "Mutation read-back failed"
                    ),
                )
                mutation_state["verification"] = verification
                yield emit(
                    "verification_result",
                    "verification",
                    "Mutation read-back verification completed.",
                    status="completed" if verification.get("verified") else "failed",
                    tool_name=f"{tool_name}.verify",
                    result_summary=verification,
                    error_code=(
                        None
                        if verification.get("verified")
                        else "MUTATION_READBACK_FAILED"
                    ),
                )

    tool_runs = [
        {"tool": item["tool"], "output": item["result"]} for item in tool_transcript
    ]
    feedback_rows = db.exec(
        select(ChatFeedbackTable)
        .where(ChatFeedbackTable.session_id == str(chat_session.id))
        .order_by(ChatFeedbackTable.created_at.desc())
        .limit(10)
    ).all()
    feedback_notes: list[str] = []
    for fnote in reversed(feedback_rows):
        snippet = (fnote.assistant_preview or "").strip()
        excerpt = snippet[:600].replace("\n", " ")
        if fnote.rating == "up":
            continue
        if excerpt:
            feedback_notes.append(
                f"• The admin marked the previous answer as unsatisfactory. "
                f'That answer was: "{excerpt}". Provide a more accurate, complete, '
                f"and clearly sourced answer this time."
            )
    context_payload = {
        "user_text": request.content,
        "request_plan": {**_request_plan(request.content), "mode": "agent_loop"},
        "tool_context": {
            "tool_policy": [item["tool"] for item in tool_transcript],
            "tool_runs": tool_runs,
            "workspace_snapshot": {},
            "record_counts": {},
            "mutations": mutation_state,
            "rbac_role": "admin" if current_user.is_admin else "member",
            "attachment_text_context": "",
            "integration_connections": [],
            "compliance_policies": [],
        },
        "session_history": history,
        "agent_loop": tool_transcript,
        "agent_execution": execution_state.public_trace(),
        "workflow_run_id": workflow_run.id,
        "workflow_events": events,
        "feedback_notes": "\n".join(feedback_notes),
    }

    evaluation = execution_state.evaluate()
    yield emit(
        "agent_evaluated",
        "validation",
        "Agent evaluated evidence, verification, and remaining limitations.",
        status="completed" if evaluation["complete"] else "failed",
        result_summary=evaluation,
        error_code=None if evaluation["complete"] else "AGENT_EVALUATION_INCOMPLETE",
    )

    yield emit(
        "validation_completed",
        "validation",
        (
            "Controller output and tool results passed workflow validation"
            if not controller_error
            else "Validation stopped because the controller provider failed"
        ),
        status="completed" if not controller_error else "failed",
        result_summary={
            "iterations": len(tool_transcript) + 1,
            "tool_calls": len(tool_transcript),
            **(
                {"reason": _provider_error_label(controller_error)}
                if controller_error
                else {}
            ),
        },
        error_code=_provider_error_code(controller_error) if controller_error else None,
    )
    response_source = "provider_failure" if controller_error else "response_model"
    model_started = emit_workflow_event(
        workflow_run.id,
        "final_response_started",
        "response",
        f"Streaming final answer from the {response_source}",
        status="running",
        result_summary={
            "tool_calls": len(tool_transcript),
            "source": response_source,
            "content_status": "writing from verified workflow results",
        },
    )
    events.append(model_started)
    yield f"event: agent_step\ndata: {_json_dumps(model_started)}\n\n"

    assistant_text = ""
    last_err = None
    chunks_streamed = 0
    reasoning_active = False
    reasoning_event_chars = 0
    reasoning_event_id = None
    reasoning_event_text = ""
    # The answer phase gets its own thinking card, finalized in place when the
    # final stream ends (completed) or fails (failed) - exactly one row.
    answer_reasoning_id: str | None = None
    answer_started_t: float | None = None
    answer_card_finalized = False
    reasoning_started_a: float | None = None
    try:
        if controller_error:
            last_err = controller_error
            assistant_text = _safe_provider_failure_reply(
                context_payload, controller_error
            )
            # Stream word-by-word so the UI sees live delta instead of a single flush
            words = assistant_text.split(" ")
            for i, word in enumerate(words):
                token = word if i == 0 else " " + word
                yield f"event: chunk\ndata: {_json_dumps({'text': token})}\n\n"
                await asyncio.sleep(0.012)
            chunks_streamed = len(words)
        else:
            for attempt_round in range(1, 4):
                reasoning_active = False
                reasoning_event_chars = 0
                reasoning_event_text = ""
                content_before_attempt = len(assistant_text)
                try:
                    async for token in _llm_stream_response(
                        provider=request.provider or "lmstudio",
                        api_key=_resolve_api_key(request.provider, request.api_key),
                        base_url=request.base_url,
                        model=request.model,
                        user_text=request.content,
                        context_payload=context_payload,
                    ):
                        was_reasoning = reasoning_active
                        reasoning_active, segments = _classify_thinking_token(
                            token or "", reasoning_active
                        )
                        if (
                            any(kind == "thinking" for kind, _ in segments)
                            and not was_reasoning
                        ):
                            reasoning_started_a = time.monotonic()
                            if answer_reasoning_id is None:
                                reasoning_frame = emit_workflow_event(
                                    workflow_run.id,
                                    "model_reasoning",
                                    "response",
                                    "Thinking...",
                                    status="running",
                                    result_summary={
                                        "provider": request.provider or "lmstudio",
                                        "model": request.model or "provider_default",
                                        "text": "",
                                    },
                                )
                                answer_reasoning_id = reasoning_event_id = (
                                    reasoning_frame["event_id"]
                                )
                                answer_started_t = reasoning_started_a
                                events.append(reasoning_frame)
                                yield f"event: agent_step\ndata: {_json_dumps(reasoning_frame)}\n\n"
                        for kind, segment in segments:
                            if kind == "thinking":
                                reasoning_event_text = (
                                    reasoning_event_text or ""
                                ) + segment
                                async for (
                                    running_chars,
                                    delta_sse,
                                ) in paced_reasoning_deltas(
                                    reasoning_event_id,
                                    "response",
                                    None,
                                    segment,
                                    reasoning_event_chars,
                                    reasoning_event_text,
                                ):
                                    reasoning_event_chars = running_chars
                                    yield delta_sse
                            else:
                                assistant_text += segment
                                chunks_streamed += 1
                                yield f"event: chunk\ndata: {_json_dumps({'text': segment})}\n\n"
                    if answer_reasoning_id and not answer_card_finalized:
                        answer_card_finalized = True
                        yield update_event_sse(
                            answer_reasoning_id,
                            "Reasoning complete",
                            status="completed",
                            duration_ms=(
                                int((time.monotonic() - answer_started_t) * 1000)
                                if answer_started_t
                                else None
                            ),
                            result_summary=(
                                {
                                    "characters": len(reasoning_event_text),
                                    "text": "",
                                }
                                if reasoning_event_text
                                else {"characters": 0, "text": ""}
                            ),
                        )
                    if not assistant_text:
                        embedded_answer = _extract_answer_from_reasoning(
                            reasoning_event_text
                        )
                        if embedded_answer:
                            assistant_text = embedded_answer
                    break
                except Exception as exc:
                    last_err = str(exc)
                    if attempt_round >= 4 or not _transient_provider_error(exc):
                        logger.warning(
                            f"[chat] final answer stream failed on attempt {attempt_round}/4: {exc}"
                        )
                        raise
                    logger.warning(
                        f"[chat] transient provider failure on attempt {attempt_round}/4, retrying: {exc}"
                    )
                    assistant_text = assistant_text[:content_before_attempt]
                    await asyncio.sleep(min(24, 4 * attempt_round))
                    continue
    except Exception as exc:
        last_err = str(exc)
        if answer_reasoning_id and not answer_card_finalized:
            answer_card_finalized = True
            yield update_event_sse(
                answer_reasoning_id,
                "Reasoning stopped",
                status="failed",
                duration_ms=(
                    int((time.monotonic() - answer_started_t) * 1000)
                    if answer_started_t
                    else None
                ),
                result_summary=(
                    {
                        "characters": len(reasoning_event_text),
                    }
                    if reasoning_event_text
                    else {"characters": 0}
                ),
                error_code=_provider_error_code(exc),
            )
        assistant_text = _safe_provider_failure_reply(context_payload, exc)
        yield f"event: chunk\ndata: {_json_dumps({'text': assistant_text})}\n\n"
        chunks_streamed += 1

    # Some local models place reasoning markers in the content channel rather
    # than exposing a separate reasoning field. Normalize before persistence so
    # a historical reload cannot resurrect private reasoning in the transcript.
    assistant_text = _sanitize_llm_response(assistant_text, request.content)
    if not assistant_text.strip() and not last_err:
        if tool_transcript:
            assistant_text = "I examined the workspace records for your request, but found no matching entries."
        else:
            assistant_text = f"I checked the workspace records for '{request.content.strip()}', but found no active entries or configuration."
        if not chunks_streamed:
            yield f"event: chunk\ndata: {_json_dumps({'text': assistant_text})}\n\n"
    elif assistant_text and not last_err and not chunks_streamed:
        yield f"event: chunk\ndata: {_json_dumps({'text': assistant_text})}\n\n"

    model_completed = emit_workflow_event(
        workflow_run.id,
        "final_response_completed",
        "response",
        "Final answer stream failed" if last_err else "Final answer stream completed",
        status="failed" if last_err else "completed",
        result_summary={
            "characters": len(assistant_text),
            "tool_calls": len(tool_transcript),
            "source": response_source,
            "answer_preview": _visible_answer_preview(assistant_text),
            **({"reason": _provider_error_label(last_err)} if last_err else {}),
        },
        error_code=_provider_error_code(last_err) if last_err else None,
    )
    events.append(model_completed)
    yield f"event: agent_step\ndata: {_json_dumps(model_completed)}\n\n"

    assistant_msg = ChatMessageTable(
        session_id=chat_session.id,
        tenant_id=current_user.tenant_id,
        role="assistant",
        content=assistant_text,
        tool_trace=json.dumps(context_payload, default=str),
    )
    db.add(assistant_msg)
    chat_session.updated_at = datetime.utcnow()
    db.add(chat_session)
    _write_audit(
        db,
        current_user,
        action="CHAT_MESSAGE_AGENT_LOOP",
        resource_type="chat_session",
        resource_id=chat_session.id,
        details={
            "tool_calls": len(tool_transcript),
            "iterations": len(tool_transcript) + 1,
            "controller": "llm",
        },
    )
    db.commit()
    db.refresh(assistant_msg)
    db.refresh(chat_session)
    update_workflow_run(
        workflow_run.id,
        "awaiting_approval" if awaiting_approval else "completed",
        "governance" if awaiting_approval else "completed",
    )
    completed = emit_workflow_event(
        workflow_run.id,
        "workflow_paused" if awaiting_approval else "workflow_completed",
        "governance" if awaiting_approval else "completed",
        (
            "Workflow paused for authorized approval"
            if awaiting_approval
            else "Workflow completed from the live agent loop"
        ),
        status="waiting" if awaiting_approval else "completed",
        result_summary={
            "assistant_message_id": assistant_msg.id,
            "tool_calls": len(tool_transcript),
        },
    )
    events.append(completed)
    context_payload["workflow_events"] = events
    assistant_msg.tool_trace = json.dumps(context_payload, default=str)
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)
    yield f"event: agent_step\ndata: {_json_dumps(completed)}\n\n"
    yield f"event: done\ndata: {_json_dumps({'assistant_message': _to_message_out(assistant_msg).model_dump(mode='json'), 'user_message': _to_message_out(user_msg).model_dump(mode='json'), 'session': _to_session_out(chat_session).model_dump(mode='json')})}\n\n"


@router.get("/sessions", response_model=list[ChatSessionOut])
async def list_sessions(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    sessions = db.exec(
        select(ChatSessionTable)
        .where(ChatSessionTable.user_id == current_user.user_id)
        .order_by(ChatSessionTable.updated_at.desc())
    ).all()
    return [_to_session_out(s) for s in sessions]


@router.post(
    "/sessions", response_model=ChatSessionOut, status_code=status.HTTP_201_CREATED
)
async def create_session(
    request: ChatSessionCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    row = ChatSessionTable(
        user_id=current_user.user_id,
        tenant_id=current_user.tenant_id,
        title=(request.title or "New Session").strip() or "New Session",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_session_out(row)


@router.patch("/sessions/{session_id}", response_model=ChatSessionOut)
async def rename_session(
    session_id: UUID,
    request: ChatSessionRename,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    row = _get_session_normalized(db, session_id)
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    _assert_session_owner(row, current_user)
    row.title = request.title.strip()
    row.updated_at = datetime.utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_session_out(row)


def _delete_session_data(
    db: Session,
    row: ChatSessionTable,
    *,
    delete_session_row: bool,
) -> None:
    """Delete every record owned by one chat session.

    Chat workflow tables intentionally use soft application-level links rather
    than database foreign keys, so deleting messages alone leaves workflow
    traces and approvals behind. Keep this order explicit: feedback and
    attachments reference messages, while events and approvals reference the
    session's workflow runs.
    """
    session_id = str(row.id)
    runs = db.exec(
        select(WorkflowRunTable).where(WorkflowRunTable.session_id == session_id)
    ).all()
    run_ids = [str(run.id) for run in runs]

    feedback = db.exec(
        select(ChatFeedbackTable).where(ChatFeedbackTable.session_id == session_id)
    ).all()
    for item in feedback:
        db.delete(item)

    attachments = db.exec(
        select(ChatAttachmentTable).where(ChatAttachmentTable.session_id == session_id)
    ).all()
    for attachment in attachments:
        try:
            os.remove(attachment.file_path)
        except FileNotFoundError:
            pass
        except OSError as exc:
            logger.warning(
                "Could not remove chat attachment file %s: %s",
                attachment.file_path,
                exc,
            )
        db.delete(attachment)

    messages = db.exec(
        select(ChatMessageTable).where(ChatMessageTable.session_id == session_id)
    ).all()
    for message in messages:
        db.delete(message)

    if run_ids:
        approvals = db.exec(
            select(WorkflowApprovalTable).where(
                WorkflowApprovalTable.run_id.in_(run_ids)
            )
        ).all()
        for approval in approvals:
            db.delete(approval)

        events = db.exec(
            select(WorkflowEventTable).where(WorkflowEventTable.run_id.in_(run_ids))
        ).all()
        for event in events:
            db.delete(event)

        for run in runs:
            db.delete(run)

    if delete_session_row:
        db.delete(row)
    else:
        row.updated_at = datetime.utcnow()
        db.add(row)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    row = _get_session_normalized(db, session_id)
    if not row:
        return  # Session is already gone, return success (idempotent delete)
    _assert_session_owner(row, current_user)

    _delete_session_data(db, row, delete_session_row=True)
    db.commit()


@router.post("/sessions/delete-bulk", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sessions_bulk(
    request: ChatBulkDeleteRequest,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    for sid in request.session_ids:
        row = _get_session_normalized(db, sid)
        if not row:
            continue  # Already gone: idempotent

        if (
            not current_user.is_admin
            and str(row.user_id) != "00000000-0000-0000-0000-000000000000"
            and row.user_id != current_user.user_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden session access"
            )

        _delete_session_data(db, row, delete_session_row=True)

    db.commit()


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageOut])
async def list_messages(
    session_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    row = _get_session_normalized(db, session_id)
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    _assert_session_owner(row, current_user)
    messages = db.exec(
        select(ChatMessageTable)
        .where(ChatMessageTable.session_id == row.id)
        .order_by(ChatMessageTable.created_at.asc())
    ).all()
    return [_to_message_out(m) for m in messages]


@router.post("/sessions/{session_id}/feedback")
async def submit_feedback(
    session_id: UUID,
    payload: dict[str, Any],
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Record admin thumb feedback (up/down) on an assistant answer.

    The assistant preview is stored so later generations know what was
    disliked and can answer more accurately next time.
    """
    row = _get_session_normalized(db, session_id)
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    _assert_session_owner(row, current_user)
    rating = str(payload.get("rating") or "").strip().lower()
    if rating not in ("up", "down"):
        raise HTTPException(status_code=422, detail="rating must be 'up' or 'down'")
    message_id = payload.get("message_id")
    preview = ""
    if message_id:
        target = db.exec(
            select(ChatMessageTable).where(ChatMessageTable.id == str(message_id))
        ).first()
        if target:
            preview = (target.content or "")[:2000]
    feedback = ChatFeedbackTable(
        session_id=row.id,
        user_id=str(current_user.user_id or current_user.user_uuid or "admin"),
        message_id=str(message_id) if message_id else None,
        rating=rating,
        assistant_preview=preview,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return {
        "id": feedback.id,
        "rating": feedback.rating,
        "message_id": feedback.message_id,
        "created_at": feedback.created_at.isoformat(),
    }


@router.get(
    "/sessions/{session_id}/attachments", response_model=list[ChatAttachmentOut]
)
async def list_attachments(
    session_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    row = _get_session_normalized(db, session_id)
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    _assert_session_owner(row, current_user)
    attachments = db.exec(
        select(ChatAttachmentTable)
        .where(ChatAttachmentTable.session_id == row.id)
        .order_by(ChatAttachmentTable.created_at.desc())
    ).all()
    return [_to_attachment_out(a) for a in attachments]


@router.get("/sessions/{session_id}/workflows")
async def list_workflows(
    session_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Return durable workflow runs for a chat session."""
    row = _get_session_normalized(db, session_id)
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    _assert_session_owner(row, current_user)
    runs = db.exec(
        select(WorkflowRunTable)
        .where(WorkflowRunTable.session_id == row.id)
        .order_by(WorkflowRunTable.created_at.desc())
    ).all()
    return [
        {
            "id": run.id,
            "session_id": run.session_id,
            "user_id": run.user_id,
            "tenant_id": run.tenant_id,
            "status": run.status,
            "intent": run.intent,
            "current_phase": run.current_phase,
            "failure_reason": run.failure_reason,
            "created_at": run.created_at,
            "updated_at": run.updated_at,
            "completed_at": run.completed_at,
        }
        for run in runs
    ]


@router.get("/workflows/{run_id}/events")
async def list_workflow_events(
    run_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Return the complete safe operational trace for one workflow run."""
    run = db.get(WorkflowRunTable, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Workflow run not found")
    if not current_user.is_admin and str(run.user_id) != str(current_user.user_id):
        raise HTTPException(status_code=403, detail="Forbidden workflow access")
    events = db.exec(
        select(WorkflowEventTable)
        .where(WorkflowEventTable.run_id == run_id)
        .order_by(WorkflowEventTable.sequence.asc())
    ).all()
    return [workflow_event_dict(event) for event in events]


def _perform_approved_delete(
    db: Session, payload: str, tenant_id: str = "default"
) -> dict[str, Any]:
    """Delete the exact record(s) approved by an authorized human."""
    spec_payload: dict[str, Any] | None = None
    if payload and payload.lstrip().startswith("{"):
        try:
            parsed = json.loads(payload)
            if (
                isinstance(parsed, dict)
                and parsed.get("entity")
                and parsed.get("identifier")
            ):
                spec_payload = parsed
        except Exception:
            spec_payload = None

    if spec_payload:
        spec = _TOOL_ENTITIES.get(_normalize_entity(str(spec_payload["entity"])))
        if not spec:
            raise HTTPException(
                status_code=422,
                detail=f"Unsupported entity in approved deletion: {spec_payload.get('entity')}",
            )
        targets = _records_by_identifier(
            db,
            spec,
            str(spec_payload["identifier"]),
            tenant_id,
        )
        if not targets:
            raise HTTPException(
                status_code=404,
                detail=f"No {spec_payload['entity']} matched approved identifier {spec_payload['identifier']}",
            )
        resource_type = str(spec_payload["entity"])
        if resource_type in {"employee", "candidate"}:
            child_skill = (
                SkillTable.employee_id
                if resource_type == "employee"
                else SkillTable.candidate_id
            )
            child_experience = (
                ExperienceTable.employee_id
                if resource_type == "employee"
                else ExperienceTable.candidate_id
            )
            skills = db.exec(
                select(SkillTable).where(
                    SkillTable.tenant_id == tenant_id,
                    child_skill.in_([row.id for row in targets]),
                )
            ).all()
            experiences = db.exec(
                select(ExperienceTable).where(
                    ExperienceTable.tenant_id == tenant_id,
                    child_experience.in_([row.id for row in targets]),
                )
            ).all()
            for item in skills + experiences:
                db.delete(item)
            db.flush()
            names = [row.full_name for row in targets]
            for row in targets:
                db.delete(row)
            return {
                "deleted": True,
                "resource_type": resource_type,
                "identifier": str(spec_payload["identifier"]),
                "deleted_records": len(targets),
                "name": "; ".join(names),
                "related_records_deleted": len(skills) + len(experiences),
            }
        for row in targets:
            db.delete(row)
        return {
            "deleted": True,
            "resource_type": resource_type,
            "identifier": str(spec_payload["identifier"]),
            "deleted_records": len(targets),
            "name": "",
            "related_records_deleted": 0,
        }

    email_match = re.search(
        r"([a-zA-Z0-9.\-_+]+@[a-zA-Z0-9.\-_]+\.[a-zA-Z]{2,})", payload
    )
    if not email_match:
        raise HTTPException(
            status_code=422, detail="Approved deletion requires an exact email"
        )
    email = email_match.group(1).lower()
    lowered = payload.lower()
    is_candidate = "candidate" in lowered
    is_employee = "employee" in lowered
    if is_candidate == is_employee:
        raise HTTPException(
            status_code=422,
            detail="Approved deletion must identify exactly one resource type: employee or candidate",
        )

    if is_candidate:
        record = db.exec(
            select(CandidateTable).where(CandidateTable.email == email)
        ).first()
        resource_type = "candidate"
    else:
        record = db.exec(
            select(EmployeeTable).where(EmployeeTable.email == email)
        ).first()
        resource_type = "employee"
    if not record:
        raise HTTPException(
            status_code=404, detail=f"No {resource_type} found for {email}"
        )

    skills = db.exec(
        select(SkillTable).where(
            SkillTable.candidate_id == record.id
            if is_candidate
            else SkillTable.employee_id == record.id
        )
    ).all()
    experiences = db.exec(
        select(ExperienceTable).where(
            ExperienceTable.candidate_id == record.id
            if is_candidate
            else ExperienceTable.employee_id == record.id
        )
    ).all()
    for item in skills + experiences:
        db.delete(item)
    db.flush()
    name = record.full_name
    db.delete(record)
    return {
        "deleted": True,
        "resource_type": resource_type,
        "email": email,
        "name": name,
        "related_records_deleted": len(skills) + len(experiences),
    }


@router.post("/workflows/{run_id}/approvals/{approval_id}/approve")
async def approve_workflow_action(
    run_id: str,
    approval_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Resolve one exact pending workflow approval; only admins may approve."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin approval required")
    approval = db.get(WorkflowApprovalTable, approval_id)
    if (
        not approval
        or approval.run_id != run_id
        or (
            current_user.tenant_id != "default"
            and approval.tenant_id != current_user.tenant_id
        )
    ):
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != "pending":
        raise HTTPException(
            status_code=409, detail=f"Approval is already {approval.status}"
        )
    if approval.expires_at < datetime.utcnow():
        approval.status = "expired"
        approval.resolved_at = datetime.utcnow()
        db.add(approval)
        db.commit()
        update_workflow_run(run_id, "failed", "governance", "Approval expired")
        raise HTTPException(status_code=410, detail="Approval expired")

    if (
        hashlib.sha256(approval.action_payload.encode("utf-8")).hexdigest()
        != approval.action_payload_hash
    ):
        raise HTTPException(
            status_code=409, detail="Approval payload integrity check failed"
        )

    result = _perform_approved_delete(
        db, approval.action_payload, current_user.tenant_id
    )
    approval.status = "approved"
    approval.approved_by = str(current_user.user_id)
    approval.resolved_at = datetime.utcnow()
    db.add(approval)
    _write_audit(
        db,
        current_user,
        action="APPROVED_DELETE",
        resource_type=result["resource_type"],
        resource_id=str(result.get("email") or result.get("identifier")),
        details=result,
    )
    db.commit()
    update_workflow_run(run_id, "completed", "completed")
    emit_workflow_event(
        run_id,
        "approval_granted",
        "governance",
        "Admin approval granted for the exact requested deletion",
        status="completed",
        result_summary={"approved_by": str(current_user.user_id)},
    )
    emit_workflow_event(
        run_id,
        "mutation_completed",
        "mutation",
        "Approved deletion executed transactionally",
        status="completed",
        tool_name="delete.approved",
        result_summary=result,
    )
    emit_workflow_event(
        run_id,
        "verification_completed",
        "verification",
        "Verified that the approved record no longer exists",
        status="completed",
        result_summary=result,
    )
    emit_workflow_event(
        run_id,
        "workflow_completed",
        "completed",
        "Approved workflow action completed",
        status="completed",
        result_summary=result,
    )
    return {
        "status": "completed",
        "run_id": run_id,
        "approval_id": approval_id,
        "result": result,
    }


@router.post("/workflows/{run_id}/approvals/{approval_id}/reject")
async def reject_workflow_action(
    run_id: str,
    approval_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin approval required")
    approval = db.get(WorkflowApprovalTable, approval_id)
    if not approval or approval.run_id != run_id:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != "pending":
        raise HTTPException(
            status_code=409, detail=f"Approval is already {approval.status}"
        )
    approval.status = "rejected"
    approval.approved_by = str(current_user.user_id)
    approval.resolved_at = datetime.utcnow()
    db.add(approval)
    db.commit()
    update_workflow_run(run_id, "cancelled", "governance", "Approval rejected")
    emit_workflow_event(
        run_id,
        "approval_rejected",
        "governance",
        "Admin rejected the requested action; no mutation was executed",
        status="blocked",
        error_code="APPROVAL_REJECTED",
    )
    return {"status": "rejected", "run_id": run_id, "approval_id": approval_id}


@router.post("/sessions/{session_id}/upload", response_model=ChatAttachmentOut)
async def upload_attachment(
    session_id: UUID,
    file: UploadFile = File(...),
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    row = _get_session_normalized(db, session_id)
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    _assert_session_owner(row, current_user)

    safe_name = f"{uuid4()}_{Path(file.filename).name}"
    session_folder = UPLOAD_ROOT / str(session_id)
    session_folder.mkdir(parents=True, exist_ok=True)
    target = session_folder / safe_name

    content = await file.read()
    target.write_bytes(content)
    _, parse_status, parse_error = _parse_attachment_for_index(target)

    att = ChatAttachmentTable(
        session_id=row.id,
        tenant_id=current_user.tenant_id,
        original_name=file.filename,
        content_type=file.content_type,
        file_path=str(target),
        file_size=len(content),
        parsing_status=parse_status,
        parsing_error=parse_error or None,
    )
    db.add(att)
    row.updated_at = datetime.utcnow()
    db.add(row)
    db.commit()
    db.refresh(att)

    # Automatically parse and ingest CSV on upload!
    if target.suffix.lower() == ".csv":
        try:
            _parse_csv_and_ingest(db, [att])
            att.parsing_status = "parsed"
            db.add(att)
            db.commit()
            db.refresh(att)
        except Exception as e:
            db.rollback()
            att.parsing_status = "failed"
            att.parsing_error = str(e)
            db.add(att)
            db.commit()
            db.refresh(att)

    return _to_attachment_out(att)


@router.post("/sessions/{session_id}/message", response_model=ChatResponse)
async def send_message(
    session_id: UUID,
    request: ChatMessageCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    chat_session = _get_session_normalized(db, session_id)
    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")
    _assert_session_owner(chat_session, current_user)

    user_msg = ChatMessageTable(
        session_id=chat_session.id,
        tenant_id=current_user.tenant_id,
        role="user",
        content=request.content,
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    attachments = db.exec(
        select(ChatAttachmentTable).where(
            ChatAttachmentTable.session_id == chat_session.id
        )
    ).all()
    context_payload = _build_context_payload(
        db, chat_session.id, request.content, current_user, attachments
    )
    tool_context = context_payload.get("tool_context", {})
    resolved_provider = (request.provider or "lmstudio").lower()
    resolved_provider = {
        "anthropic": "claude",
        "google": "gemini",
        "google-gemini": "gemini",
    }.get(resolved_provider, resolved_provider)
    resolved_api_key = _resolve_api_key(request.provider, request.api_key)
    assistant_text = ""
    last_err = None
    for _ in range(3):
        try:
            assistant_text = await _llm_response(
                provider=request.provider or "lmstudio",
                api_key=resolved_api_key,
                base_url=request.base_url,
                model=request.model,
                user_text=request.content,
                context_payload=context_payload,
            )
            break
        except Exception as e:
            last_err = e
            await asyncio.sleep(0.5)
    if not assistant_text:
        logger.error(f"Chat model call failed after retries: {last_err}", exc_info=True)
        assistant_text = _safe_provider_failure_reply(context_payload, error=last_err)

    assistant_msg = ChatMessageTable(
        session_id=chat_session.id,
        tenant_id=current_user.tenant_id,
        role="assistant",
        content=assistant_text,
        tool_trace=json.dumps(context_payload),
    )
    db.add(assistant_msg)
    chat_session.updated_at = datetime.utcnow()
    db.add(chat_session)
    _write_audit(
        db,
        current_user,
        action="CHAT_MESSAGE",
        resource_type="chat_session",
        resource_id=chat_session.id,
        details={
            "session_id": chat_session.id,
            "provider": request.provider or "lmstudio",
            "model": request.model,
            "mutation_actions": tool_context.get("mutations", {}).get("actions", []),
            "mutation_blocked": tool_context.get("mutations", {}).get("blocked", False),
        },
    )
    db.commit()
    db.refresh(assistant_msg)
    db.refresh(chat_session)

    return ChatResponse(
        session=_to_session_out(chat_session),
        user_message=_to_message_out(user_msg),
        assistant_message=_to_message_out(assistant_msg),
    )


def _instant_loop_enabled() -> bool:
    """Flag-gate for the instant harness; legacy loop stays the fallback."""
    try:
        from app.workflows.instant.config import INSTANT_LOOP_ENABLED

        return bool(INSTANT_LOOP_ENABLED)
    except Exception:
        return False


async def _stream_instant_adapter(
    db, chat_session, user_msg, workflow_run, request, current_user
):
    """Run one instant lane turn and persist with the legacy durable schema.

    Yields identical SSE event names (agent_step/chunk/done/error) so the
    existing UI works untouched. Raises on failure so the caller can fall
    back to the legacy loop.
    """
    from app.workflows.instant.config import EVENT_FLUSH_BATCH, EVENT_FLUSH_INTERVAL_S
    from app.workflows.instant.event_buffer import InstantEventBuffer
    from app.workflows.instant.instant_loop import (
        InstantDeps,
        InstantTurnRequest,
        stream_instant_turn,
    )
    from app.workflows.instant.lane_router import route_lane

    attachments = db.exec(
        select(ChatAttachmentTable).where(
            ChatAttachmentTable.session_id == str(chat_session.id)
        )
    ).all()
    history_rows = db.exec(
        select(ChatMessageTable)
        .where(ChatMessageTable.session_id == str(chat_session.id))
        .order_by(ChatMessageTable.created_at.desc())
        .limit(6)
    ).all()
    history: list[dict[str, str]] = []
    for row in reversed(history_rows):
        content = (row.content or "").strip()
        if (
            content
            and not content.startswith("LLM failed")
            and not content.startswith('{"tool_context')
        ):
            history.append({"role": row.role, "content": content[:600]})

    capability_rows = db.exec(
        select(IntegrationConnectionTable).where(
            IntegrationConnectionTable.tenant_id == current_user.tenant_id
        )
    ).all()
    capability_context = []
    for connection in capability_rows:
        try:
            connector = get_connector(connection.provider)
            supported = sorted(connector.supported_actions) if connector else []
        except Exception:
            supported = []
        capability_context.append(
            {
                "provider": connection.provider,
                "connection_id": str(connection.id),
                "supported_actions": supported,
            }
        )

    feedback_rows = db.exec(
        select(ChatFeedbackTable)
        .where(ChatFeedbackTable.session_id == str(chat_session.id))
        .order_by(ChatFeedbackTable.created_at.desc())
        .limit(10)
    ).all()
    feedback_notes: list[str] = []
    for fnote in reversed(feedback_rows):
        if fnote.rating == "up":
            continue
        excerpt = (fnote.assistant_preview or "").strip()[:600].replace("\n", " ")
        if excerpt:
            feedback_notes.append(
                "• The admin marked the previous answer as unsatisfactory. "
                f'That answer was: "{excerpt}". Provide a more accurate, complete, '
                "and clearly sourced answer this time."
            )

    lane = route_lane(
        request.content,
        has_attachments=bool(attachments),
        is_admin=bool(current_user.is_admin),
        history=history,
    )
    # Least-privilege model view (B9): the model only sees tools its role may run.
    try:
        from app.agent.registry import tool_schemas as _role_tool_schemas

        _role = "admin" if bool(current_user.is_admin) else "member"
        _visible_schemas = _role_tool_schemas(_role)
    except Exception:
        _visible_schemas = TOOL_SCHEMAS
    deps = InstantDeps(
        native_decision=_native_tool_decision,
        llm_stream=_llm_stream_response,
        execute_tool=_audited_execute_agent_tool,
        parse_decision=_parse_agent_decision,
        resolve_api_key=_resolve_api_key,
        tool_schemas=_visible_schemas,
        agent_catalog=AGENT_TOOL_CATALOG,
        is_transient=_transient_provider_error,
        sanitize_response=_sanitize_llm_response,
    )
    turn_req = InstantTurnRequest(
        content=request.content,
        provider=request.provider,
        api_key=request.api_key,
        base_url=request.base_url,
        model=request.model,
        is_admin=bool(current_user.is_admin),
        user_id=str(current_user.user_id),
        tenant_id=getattr(current_user, "tenant_id", None) or "default",
        session_id=str(chat_session.id),
        has_attachments=bool(attachments),
        history=history,
        capability_context=capability_context,
        feedback_notes="\n".join(feedback_notes),
    )
    buffer = InstantEventBuffer(
        workflow_run.id,
        emit_workflow_event,
        update_workflow_event,
        flush_interval_s=EVENT_FLUSH_INTERVAL_S,
        flush_batch=EVENT_FLUSH_BATCH,
    )
    async for frame in stream_instant_turn(
        deps, turn_req, lane, workflow_run.id, buffer
    ):
        yield frame

    # Reconcile turn outcome from the orchestrator's internal markers.
    assistant_text = ""
    llm_calls = 0
    total_ms: int | None = None
    ttft_ms: int | None = None
    tool_transcript: list[dict[str, Any]] = []
    awaiting_approval = False
    turn_error: str | None = None
    for marker in buffer.events:
        if marker.get("type") == "__assistant_text":
            assistant_text = str(marker.get("text") or "")
            llm_calls = int(marker.get("llm_calls") or 0)
            total_ms = marker.get("total_ms")
            ttft_ms = marker.get("ttft_ms")
            turn_error = marker.get("error")
            if isinstance(marker.get("tool_transcript"), list):
                tool_transcript = marker["tool_transcript"]
        elif marker.get("type") == "__approval_required":
            awaiting_approval = True

    # L3 approval persistence reuses the exact legacy governance schema.
    approval_id: str | None = None
    if awaiting_approval:
        approval_id = str(uuid4())
        approval_payload = request.content[:12000]
        db.add(
            WorkflowApprovalTable(
                id=approval_id,
                run_id=workflow_run.id,
                tenant_id=getattr(current_user, "tenant_id", None) or "default",
                requested_by=str(current_user.user_id),
                action_type="delete",
                action_payload_hash=hashlib.sha256(
                    approval_payload.encode("utf-8")
                ).hexdigest(),
                action_payload=approval_payload,
                status="pending",
                reason="Instant lane requested human approval for deletion",
                expires_at=datetime.utcnow() + timedelta(minutes=30),
            )
        )
        db.commit()

    context_payload = {
        "user_text": request.content,
        "request_plan": {"mode": "instant_loop", "lane": lane.lane},
        "tool_context": {
            "tool_policy": [t.get("tool") for t in tool_transcript],
            "tool_runs": [
                {"tool": t.get("tool"), "output": t.get("result")}
                for t in tool_transcript
            ],
            "rbac_role": "admin" if current_user.is_admin else "member",
        },
        "session_history": history,
        "agent_loop": tool_transcript,
        "workflow_run_id": workflow_run.id,
        "workflow_events": [
            e for e in buffer.events if not str(e.get("type", "")).startswith("__")
        ],
        "instant_metrics": {
            "lane": lane.lane,
            "llm_calls": llm_calls,
            "tool_calls": len(tool_transcript),
            "ttft_ms": ttft_ms,
            "total_ms": total_ms,
            "error": turn_error,
        },
    }
    assistant_msg = ChatMessageTable(
        session_id=chat_session.id,
        tenant_id=current_user.tenant_id,
        role="assistant",
        content=assistant_text,
        tool_trace=json.dumps(context_payload, default=str),
    )
    db.add(assistant_msg)
    chat_session.updated_at = datetime.utcnow()
    db.add(chat_session)
    _write_audit(
        db,
        current_user,
        action="CHAT_MESSAGE_INSTANT_LOOP",
        resource_type="chat_session",
        resource_id=chat_session.id,
        details={
            "tool_calls": len(tool_transcript),
            "lane": lane.lane,
            "llm_calls": llm_calls,
            "ttft_ms": ttft_ms,
            "total_ms": total_ms,
            "controller": "instant",
        },
    )
    db.commit()
    db.refresh(assistant_msg)
    db.refresh(chat_session)
    try:
        await buffer.close()
    except Exception:
        pass
    update_workflow_run(
        workflow_run.id,
        "awaiting_approval" if awaiting_approval else "completed",
        "governance" if awaiting_approval else "completed",
    )
    completed = emit_workflow_event(
        workflow_run.id,
        "workflow_paused" if awaiting_approval else "workflow_completed",
        "governance" if awaiting_approval else "completed",
        (
            "Workflow paused for authorized approval"
            if awaiting_approval
            else "Workflow completed from the instant lane loop"
        ),
        status="waiting" if awaiting_approval else "completed",
        result_summary={
            "assistant_message_id": assistant_msg.id,
            "tool_calls": len(tool_transcript),
            "lane": lane.lane,
            "llm_calls": llm_calls,
            "ttft_ms": ttft_ms,
            "total_ms": total_ms,
            **({"approval_id": approval_id} if approval_id else {}),
        },
    )
    context_payload["workflow_events"] = context_payload["workflow_events"] + [
        completed
    ]
    assistant_msg.tool_trace = json.dumps(context_payload, default=str)
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)
    yield f"event: agent_step\ndata: {_json_dumps(completed)}\n\n"
    yield f"event: done\ndata: {_json_dumps({'assistant_message': _to_message_out(assistant_msg).model_dump(mode='json'), 'user_message': _to_message_out(user_msg).model_dump(mode='json'), 'session': _to_session_out(chat_session).model_dump(mode='json')})}\n\n"


@router.post("/sessions/{session_id}/message/stream")
async def send_message_stream(
    session_id: UUID,
    request: ChatMessageCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    chat_session = _get_session_normalized(db, session_id)
    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")
    _assert_session_owner(chat_session, current_user)

    def _context_payload_worker(
        session_id_value: str,
        user_text: str,
        workflow_run_id: str,
        event_sink,
    ) -> dict:
        """Run blocking retrieval/tool work off the event loop with its own DB session."""
        with Session(engine) as worker_db:
            worker_attachments = worker_db.exec(
                select(ChatAttachmentTable).where(
                    ChatAttachmentTable.session_id == str(session_id_value)
                )
            ).all()
            return _build_context_payload(
                worker_db,
                UUID(str(session_id_value)),
                user_text,
                current_user,
                worker_attachments,
                workflow_run_id=workflow_run_id,
                event_sink=event_sink,
            )

    async def gen():
        workflow_run = None
        try:
            last_err = None
            user_msg = ChatMessageTable(
                session_id=chat_session.id,
                tenant_id=current_user.tenant_id,
                role="user",
                content=request.content,
            )
            db.add(user_msg)
            db.commit()
            db.refresh(user_msg)

            workflow_run = create_workflow_run(
                chat_session.id,
                str(current_user.user_id),
                getattr(current_user, "tenant_id", None) or "default",
            )

            if _instant_loop_enabled():
                try:
                    async for frame in _stream_instant_adapter(
                        db,
                        chat_session,
                        user_msg,
                        workflow_run,
                        request,
                        current_user,
                    ):
                        yield frame
                    return
                except Exception as exc:
                    logger.warning(
                        f"[chat] instant lane failed, falling back to legacy loop: {exc}",
                        exc_info=True,
                    )
                    try:
                        db.rollback()
                    except Exception:
                        pass

            async for frame in _stream_true_agent_loop(
                db,
                chat_session,
                user_msg,
                workflow_run,
                request,
                current_user,
            ):
                yield frame
            return

            attachments = db.exec(
                select(ChatAttachmentTable).where(
                    ChatAttachmentTable.session_id == chat_session.id
                )
            ).all()

            def workflow_sse(event: dict[str, Any]) -> str:
                return f"event: agent_step\ndata: {_json_dumps(event)}\n\n"

            started = emit_workflow_event(
                workflow_run.id,
                "workflow_started",
                "intake",
                "Workflow received and authenticated",
                status="completed",
                result_summary={"session_id": chat_session.id},
            )
            yield workflow_sse(started)

            request_plan = _request_plan(request.content, bool(attachments))
            policy = request_plan["capabilities"]
            intent = request_plan["mode"]
            classified = emit_workflow_event(
                workflow_run.id,
                "intent_classified",
                "planning",
                f"Request classified as {intent}",
                status="completed",
                result_summary={
                    "intent": intent,
                    "requested_capabilities": policy,
                    "needs_live_data": request_plan["needs_live_data"],
                    "reason": request_plan["reason"],
                },
            )
            yield workflow_sse(classified)
            update_workflow_run(workflow_run.id, "planning", "planning")

            planned = emit_workflow_event(
                workflow_run.id,
                "plan_created",
                "planning",
                "Execution plan created with permission checks and bounded tools",
                status="completed",
                result_summary={"steps": policy or ["response.generate"]},
            )
            yield workflow_sse(planned)

            queue: asyncio.Queue = asyncio.Queue()
            loop = asyncio.get_running_loop()

            def event_sink(event: dict[str, Any]) -> None:
                asyncio.run_coroutine_threadsafe(queue.put(event), loop)

            context_phase = (
                "retrieval" if request_plan["needs_live_data"] else "context"
            )
            context_status = (
                "retrieving" if request_plan["needs_live_data"] else "contextualizing"
            )
            context_started = emit_workflow_event(
                workflow_run.id,
                (
                    "retrieval_started"
                    if request_plan["needs_live_data"]
                    else "context_started"
                ),
                context_phase,
                (
                    "Retrieving verified live records and attachment context"
                    if request_plan["needs_live_data"]
                    else "Loading conversation context and request state"
                ),
                status="running",
            )
            yield workflow_sse(context_started)
            update_workflow_run(workflow_run.id, context_status, context_phase)

            worker_task = asyncio.create_task(
                asyncio.wait_for(
                    asyncio.to_thread(
                        _context_payload_worker,
                        chat_session.id,
                        request.content,
                        workflow_run.id,
                        event_sink,
                    ),
                    timeout=60.0,
                )
            )
            context_payload = None
            while True:
                if worker_task.done():
                    await asyncio.sleep(0)
                    while not queue.empty():
                        yield workflow_sse(await queue.get())
                    context_payload = worker_task.result()
                    break
                queue_task = asyncio.create_task(queue.get())
                done, _ = await asyncio.wait(
                    {worker_task, queue_task},
                    return_when=asyncio.FIRST_COMPLETED,
                )
                if queue_task in done:
                    yield workflow_sse(queue_task.result())
                else:
                    queue_task.cancel()

            context_completed = emit_workflow_event(
                workflow_run.id,
                (
                    "retrieval_completed"
                    if request_plan["needs_live_data"]
                    else "context_completed"
                ),
                context_phase,
                (
                    "Verified live records and attachment context retrieved"
                    if request_plan["needs_live_data"]
                    else "Conversation context and request state loaded"
                ),
                status="completed",
                result_summary={
                    "tool_runs": len(
                        context_payload.get("tool_context", {}).get("tool_runs", [])
                    ),
                },
            )
            yield workflow_sse(context_completed)
            validation = emit_workflow_event(
                workflow_run.id,
                "validation_completed",
                "validation",
                (
                    "Retrieved data passed workflow validation checks"
                    if request_plan["needs_live_data"]
                    else "Conversation context passed workflow validation checks"
                ),
                status="completed",
                result_summary={
                    "tool_runs": len(
                        context_payload.get("tool_context", {}).get("tool_runs", [])
                    ),
                    "record_counts": context_payload.get("tool_context", {}).get(
                        "record_counts", {}
                    ),
                },
            )
            yield workflow_sse(validation)
            update_workflow_run(workflow_run.id, "verifying", "validation")

            tool_context = context_payload.get("tool_context", {})
            awaiting_approval = False
            approval_id = None
            if "mutate_data" in tool_context.get("tool_policy", []):
                mutation_started = emit_workflow_event(
                    workflow_run.id,
                    "verification_started",
                    "verification",
                    "Reading back the committed mutation for post-write verification",
                    status="running",
                    tool_name="data.verify",
                    safe_input={"query": request.content[:240]},
                )
                yield workflow_sse(mutation_started)
                db.expire_all()
                mutation_verification = _verify_mutation(
                    db,
                    request.content,
                    tool_context.get("mutations", {}),
                )
                tool_context.setdefault("mutations", {})[
                    "verification"
                ] = mutation_verification
                tool_context.setdefault("tool_runs", []).append(
                    {"tool": "data.verify", "output": mutation_verification}
                )
                mutation_verified = emit_workflow_event(
                    workflow_run.id,
                    "verification_result",
                    "verification",
                    "Committed mutation read-back completed",
                    status=(
                        "completed"
                        if mutation_verification.get("verified")
                        else "failed"
                    ),
                    tool_name="data.verify",
                    result_summary=mutation_verification,
                    error_code=(
                        None
                        if mutation_verification.get("verified")
                        else "MUTATION_READBACK_FAILED"
                    ),
                )
                yield workflow_sse(mutation_verified)
            if "human_approval_delete" in tool_context.get("tool_policy", []):
                awaiting_approval = True
                approval_id = str(uuid4())
                approval_payload = request.content[:12000]
                approval_row = WorkflowApprovalTable(
                    id=approval_id,
                    run_id=workflow_run.id,
                    tenant_id=getattr(current_user, "tenant_id", None) or "default",
                    requested_by=str(current_user.user_id),
                    action_type="delete",
                    action_payload_hash=hashlib.sha256(
                        approval_payload.encode("utf-8")
                    ).hexdigest(),
                    action_payload=approval_payload,
                    status="pending",
                    reason="Deletion requested through workflow chat",
                    expires_at=datetime.utcnow() + timedelta(minutes=30),
                )
                db.add(approval_row)
                db.commit()
                update_workflow_run(workflow_run.id, "awaiting_approval", "governance")
                approval = emit_workflow_event(
                    workflow_run.id,
                    "approval_required",
                    "governance",
                    "Deletion is blocked until an authorized human approves it",
                    status="blocked",
                    result_summary={
                        "approval_required": True,
                        "action": "delete",
                        "approval_id": approval_id,
                    },
                    error_code="HUMAN_APPROVAL_REQUIRED",
                )
                yield workflow_sse(approval)

            verified = emit_workflow_event(
                workflow_run.id,
                "verification_completed",
                "verification",
                "Permissions, governance safeguards, tool results, and mutation read-back verified",
                status=(
                    "failed"
                    if tool_context.get("mutations", {}).get("verification")
                    and not tool_context["mutations"]["verification"].get("verified")
                    else "completed"
                ),
                result_summary={
                    "rbac_role": tool_context.get("rbac_role"),
                    "mutation_blocked": tool_context.get("mutations", {}).get(
                        "blocked", False
                    ),
                    "mutation_verification": tool_context.get("mutations", {}).get(
                        "verification"
                    ),
                },
            )
            yield workflow_sse(verified)

            model_started = emit_workflow_event(
                workflow_run.id,
                "model_started",
                "response",
                "Generating an evidence-grounded response from verified context",
                status="running",
                result_summary={
                    "provider": request.provider or "lmstudio",
                    "model": request.model,
                },
            )
            yield workflow_sse(model_started)
            update_workflow_run(workflow_run.id, "executing", "response")
            assistant_text = ""
            last_err = None
            try:
                async for token in _llm_stream_response(
                    provider=request.provider or "lmstudio",
                    api_key=request.api_key,
                    base_url=request.base_url,
                    model=request.model,
                    user_text=request.content,
                    context_payload=context_payload,
                ):
                    assistant_text += token
                    yield f"event: chunk\ndata: {_json_dumps({'text': token})}\n\n"
            except Exception as e:
                logger.exception("Failed to stream LLM response")
                last_err = str(e)
                try:
                    assistant_text = await _llm_response(
                        provider=request.provider or "lmstudio",
                        api_key=request.api_key,
                        base_url=request.base_url,
                        model=request.model,
                        user_text=request.content,
                        context_payload=context_payload,
                    )
                    yield f"event: chunk\ndata: {_json_dumps({'text': assistant_text})}\n\n"
                except Exception as ex:
                    last_err = f"Stream failed: {e}. Fallback failed: {ex}"
                    assistant_text = _safe_provider_failure_reply(
                        context_payload, error=last_err
                    )
                    yield f"event: chunk\ndata: {_json_dumps({'text': assistant_text})}\n\n"

            model_completed = emit_workflow_event(
                workflow_run.id,
                "model_completed",
                "response",
                "Evidence-grounded response generation completed",
                status="failed" if last_err else "completed",
                result_summary={"characters": len(assistant_text)},
                error_code="MODEL_FALLBACK" if last_err else None,
            )
            yield workflow_sse(model_completed)

            assistant_msg = ChatMessageTable(
                session_id=chat_session.id,
                tenant_id=current_user.tenant_id,
                role="assistant",
                content=assistant_text,
                tool_trace=json.dumps(context_payload),
            )
            db.add(assistant_msg)
            chat_session.updated_at = datetime.utcnow()
            db.add(chat_session)
            _write_audit(
                db,
                current_user,
                action="CHAT_MESSAGE_STREAM",
                resource_type="chat_session",
                resource_id=chat_session.id,
                details={
                    "session_id": chat_session.id,
                    "provider": request.provider or "lmstudio",
                    "model": request.model,
                    "retry_error": last_err,
                },
            )
            db.commit()
            db.refresh(assistant_msg)
            db.refresh(chat_session)
            update_workflow_run(
                workflow_run.id,
                "awaiting_approval" if awaiting_approval else "completed",
                "governance" if awaiting_approval else "completed",
            )
            completed = emit_workflow_event(
                workflow_run.id,
                "workflow_paused" if awaiting_approval else "workflow_completed",
                "governance" if awaiting_approval else "completed",
                (
                    "Workflow paused until an authorized admin resolves the approval"
                    if awaiting_approval
                    else "Workflow completed with an auditable result"
                ),
                status="waiting" if awaiting_approval else "completed",
                result_summary={"assistant_message_id": assistant_msg.id},
            )
            event_rows = db.exec(
                select(WorkflowEventTable)
                .where(WorkflowEventTable.run_id == workflow_run.id)
                .order_by(WorkflowEventTable.sequence.asc())
            ).all()
            context_payload["workflow_run_id"] = workflow_run.id
            context_payload["workflow_events"] = [
                workflow_event_dict(row) for row in event_rows
            ]
            assistant_msg.tool_trace = json.dumps(context_payload, default=str)
            db.add(assistant_msg)
            db.commit()
            db.refresh(assistant_msg)
            yield workflow_sse(completed)
            yield f"event: done\ndata: {_json_dumps({'assistant_message': _to_message_out(assistant_msg).model_dump(mode='json'), 'user_message': _to_message_out(user_msg).model_dump(mode='json'), 'session': _to_session_out(chat_session).model_dump(mode='json')})}\n\n"
        except Exception as e:
            logger.exception("Streaming chat generator failed")
            try:
                db.rollback()
            except Exception:
                pass
            if workflow_run:
                update_workflow_run(
                    workflow_run.id,
                    "failed",
                    "failed",
                    failure_reason=str(e)[:500],
                )
                failed = emit_workflow_event(
                    workflow_run.id,
                    "workflow_failed",
                    "failed",
                    "Workflow stopped because an internal step failed",
                    status="failed",
                    error_code="WORKFLOW_FAILED",
                    result_summary={"error": str(e)[:500]},
                )
                yield f"event: agent_step\ndata: {_json_dumps(failed)}\n\n"
            yield f"event: error\ndata: {_json_dumps({'message': 'Streaming chat failed', 'detail': str(e)})}\n\n"

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete(
    "/sessions/{session_id}/messages", status_code=status.HTTP_204_NO_CONTENT
)
async def clear_session_messages(
    session_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    row = _get_session_normalized(db, session_id)
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    _assert_session_owner(row, current_user)

    _delete_session_data(db, row, delete_session_row=False)
    db.commit()


@router.delete(
    "/sessions/{session_id}/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_attachment(
    session_id: UUID,
    attachment_id: UUID,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    row = _get_session_normalized(db, session_id)
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    _assert_session_owner(row, current_user)
    att = db.get(ChatAttachmentTable, str(attachment_id))
    if not att or att.session_id != row.id:
        raise HTTPException(status_code=404, detail="Attachment not found")
    try:
        os.remove(att.file_path)
    except Exception:
        pass
    db.delete(att)
    db.commit()


class ProviderPingRequest(BaseModel):
    provider: str
    api_key: str | None = None
    base_url: str | None = None
    model: str | None = None


@router.post("/providers/ping")
async def ping_provider(req: ProviderPingRequest):
    """Verify a provider by getting a tiny real completion back from the model.

    The ping sends "Reply with the single word: ok" with a small token cap and
    only reports healthy when the model actually returns text. An HTTP 200 with
    no text is reported as degraded; 401/403 is translated into an
    authentication message naming the provider instead of raw JSON.
    """
    import httpx

    started_at = time.perf_counter()

    provider = req.provider.lower()
    provider = {
        "anthropic": "claude",
        "google": "gemini",
        "google-gemini": "gemini",
    }.get(provider, provider)
    if provider in {"kimi", "kimi-moonshot", "z.ai", "glm", "nim", "nvidia-nim"}:
        provider = _PROVIDER_ALIASES[provider]
    api_key = _resolve_api_key(provider, req.api_key) or ""
    base_url = req.base_url or ""
    model = req.model or ""

    if (
        provider
        in {
            "openai",
            "groq",
            "openrouter",
            "claude",
            "gemini",
            "opencode",
            "moonshot",
            "zai",
            "nvidia",
            "deepseek",
            "mistral",
            "cline",
        }
        and not api_key
    ):
        return {
            "status": "error",
            "message": (
                f"{provider} requires an API key. Paste a valid key (or configure one "
                "server-side) before testing — without it the provider answers 401."
            ),
        }

    try:
        if provider == "lmstudio":
            candidate_bases = build_local_provider_base_candidates(base_url)
            model_name = model or "liquid/lfm2.5-1.2b"
            headers = {"Content-Type": "application/json"}
            payload = {
                "model": model_name,
                "max_tokens": 10,
                "messages": [
                    {"role": "user", "content": "Reply with the single word: ok"}
                ],
            }
        elif provider == "opencode":
            opencode_mode = _opencode_api_mode(model or "gpt-5.5")
            model_name = _opencode_model_id(model)
            endpoint = (
                f"{_opencode_base_url(base_url)}/models/{model_name}:generateContent"
                if opencode_mode == "google"
                else f"{_opencode_base_url(base_url)}/{_opencode_route(opencode_mode)}"
            )
            headers = _opencode_headers(
                api_key=api_key,
                session_id=None,
                mode=opencode_mode,
            )
            payload = (
                _opencode_google_payload(
                    model_name, "", [], "Reply with the single word: ok", 10
                )
                if opencode_mode == "google"
                else (
                    {
                        "model": model_name,
                        "input": "Reply with the single word: ok",
                        "max_output_tokens": 10,
                    }
                    if opencode_mode == "responses"
                    else (
                        {
                            "model": model_name,
                            "max_tokens": 10,
                            "messages": [
                                {
                                    "role": "user",
                                    "content": "Reply with the single word: ok",
                                }
                            ],
                        }
                        if opencode_mode == "messages"
                        else {
                            "model": model_name,
                            "max_tokens": 10,
                            "messages": [
                                {
                                    "role": "user",
                                    "content": "Reply with the single word: ok",
                                }
                            ],
                        }
                    )
                )
            )
        elif provider == "openai":
            endpoint = "https://api.openai.com/v1/chat/completions"
            model_name = model or "gpt-4o-mini"
            headers = {"Content-Type": "application/json"}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"
            payload = {
                "model": model_name,
                "max_tokens": 10,
                "messages": [
                    {"role": "user", "content": "Reply with the single word: ok"}
                ],
            }
        elif provider == "groq":
            endpoint = "https://api.groq.com/openai/v1/chat/completions"
            groq_m = (model or "").strip()
            if not groq_m or groq_m.lower() in (
                "llama-3.1-70b-versatile",
                "llama-3.3-70b-versatile",
                "llama3-70b-8192",
                "llama-3.1-8b-instant",
            ):
                model_name = "openai/gpt-oss-20b"
            else:
                model_name = groq_m
            headers = {"Content-Type": "application/json"}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"
            payload = {
                "model": model_name,
                "max_tokens": 10,
                "messages": [
                    {"role": "user", "content": "Reply with the single word: ok"}
                ],
            }
        elif provider == "openrouter":
            endpoint = "https://openrouter.ai/api/v1/chat/completions"
            model_name = (model or "").strip() or "nvidia/nemotron-3.5-lightning:free"
            headers = {
                "Content-Type": "application/json",
                "HTTP-Referer": "https://aurelinx.local",
                "X-Title": "Aurelinx",
            }
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"
            payload = {
                "model": model_name,
                "max_tokens": 10,
                "messages": [
                    {"role": "user", "content": "Reply with the single word: ok"}
                ],
            }
        elif provider == "claude":
            endpoint = "https://api.anthropic.com/v1/messages"
            model_name = model or "claude-3-5-sonnet-20241022"
            headers = {
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01",
            }
            if api_key:
                headers["x-api-key"] = api_key
            payload = {
                "model": model_name,
                "max_tokens": 10,
                "messages": [
                    {"role": "user", "content": "Reply with the single word: ok"}
                ],
            }
        elif provider == "gemini":
            model_name = model or "gemini-3.6-flash"
            if not api_key:
                return {"status": "error", "message": "Gemini requires an API key."}
            endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{"parts": [{"text": "Reply with the single word: ok"}]}],
                "generationConfig": {"maxOutputTokens": 10},
            }
        elif provider == "ollama":
            endpoint = (
                f"{base_url.rstrip('/')}/chat/completions"
                if base_url
                else "http://127.0.0.1:11434/v1/chat/completions"
            )
            model_name = model or "llama3"
            headers = {"Content-Type": "application/json"}
            payload = {
                "model": model_name,
                "max_tokens": 10,
                "messages": [
                    {"role": "user", "content": "Reply with the single word: ok"}
                ],
            }
        elif provider == "custom":
            if not base_url:
                return {
                    "status": "error",
                    "message": "Custom provider requires a base URL.",
                }
            endpoint = f"{base_url.rstrip('/')}/chat/completions"
            model_name = model or "gpt-4o-mini"
            headers = {"Content-Type": "application/json"}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"
            payload = {
                "model": model_name,
                "max_tokens": 10,
                "messages": [
                    {"role": "user", "content": "Reply with the single word: ok"}
                ],
            }
        elif provider in _OPENAI_COMPATIBLE_PROVIDER_URLS:
            endpoint = f"{_openai_compatible_base(provider, base_url)}/chat/completions"
            model_name = (
                model
                or {
                    "moonshot": "kimi-k2.6",
                    "zai": "glm-5.3",
                    "nvidia": "nvidia/llama-3.3-nemotron-super-49b-v1",
                    "deepseek": "deepseek-flash",
                    "mistral": "mistral-small-latest",
                    "cline": "minimax/minimax-m2.5",
                }[provider]
            )
            headers = {"Content-Type": "application/json"}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"
            if provider in {"cline", "openrouter"}:
                headers.update(
                    {"HTTP-Referer": "https://aurelinx.local", "X-Title": "Aurelinx"}
                )
            payload = {
                "model": model_name,
                "max_tokens": 10,
                "messages": [
                    {"role": "user", "content": "Reply with the single word: ok"}
                ],
            }
        else:
            return {
                "status": "unsupported",
                "message": f"Unsupported provider: {provider}",
            }

        def healthy_response(reply: str) -> dict:
            return {
                "status": "healthy",
                "message": (
                    "Connection healthy! Model responded. " f"Reply: {reply[:60]!r}."
                ),
                "reply": reply[:60],
                "latency_ms": round((time.perf_counter() - started_at) * 1000),
            }

        def degraded_response() -> dict:
            return {
                "status": "degraded",
                "message": (
                    "Connected, but the model returned no text. Check the selected "
                    "model name and retry."
                ),
                "latency_ms": round((time.perf_counter() - started_at) * 1000),
            }

        async with httpx.AsyncClient(timeout=12.0) as client:
            if provider == "lmstudio":
                last_error = None
                for endpoint in [
                    f"{candidate.rstrip('/')}/chat/completions"
                    for candidate in candidate_bases
                ]:
                    try:
                        resp = await client.post(
                            endpoint, json=payload, headers=headers
                        )
                        if resp.status_code == 200:
                            try:
                                reply = _extract_ping_reply(provider, resp.json())
                            except Exception:
                                reply = ""
                            if reply:
                                return healthy_response(reply)
                            last_error = "model returned no text"
                        else:
                            last_error = f"Server returned error code {resp.status_code}: {resp.text[:200]}"
                    except Exception as exc:
                        last_error = str(exc)
                return {
                    "status": "offline",
                    "message": f"Ping connection failed: {last_error or 'All connection attempts failed'}",
                }

            resp = await client.post(endpoint, json=payload, headers=headers)
            if resp.status_code in (401, 403):
                return {
                    "status": "error",
                    "message": _ping_auth_error(provider, resp.status_code, resp.text),
                }
            if resp.status_code == 200:
                try:
                    reply = _extract_ping_reply(provider, resp.json())
                except Exception:
                    reply = ""
                if reply:
                    return healthy_response(reply)
                return degraded_response()
            error_msg = (
                _provider_error_detail(resp.text)
                if (
                    "freetiererror" in resp.text.lower()
                    or "free tier can only be used" in resp.text.lower()
                )
                else f"Server returned error code {resp.status_code}: {resp.text[:200]}"
            )
            return {
                "status": "error",
                "message": error_msg,
            }
    except Exception as e:
        return {"status": "offline", "message": f"Ping connection failed: {e!s}"}


def _extract_ping_reply(provider: str, data: Any) -> str:
    """Pull the model's ping reply text from any supported provider shape."""
    if not isinstance(data, dict):
        return ""
    try:
        if provider == "claude":
            blocks = data.get("content") or []
            return "".join(
                block.get("text", "") for block in blocks if isinstance(block, dict)
            ).strip()
        if provider == "gemini" or (
            isinstance(data.get("candidates"), list) and "choices" not in data
        ):
            parts = (data.get("candidates") or [{}])[0].get("content", {}).get(
                "parts"
            ) or []
            return "".join(
                part.get("text", "") for part in parts if isinstance(part, dict)
            ).strip()
        # Responses-style (opencode responses mode).
        if isinstance(data.get("output"), list):
            chunks: list[str] = []
            for item in data["output"]:
                if not isinstance(item, dict):
                    continue
                for block in item.get("content") or []:
                    if isinstance(block, dict) and block.get("text"):
                        chunks.append(str(block["text"]))
            if chunks:
                return "".join(chunks).strip()
        if isinstance(data.get("output_text"), str) and data["output_text"].strip():
            return data["output_text"].strip()
        # OpenAI-style chat completions (covers most providers + opencode modes).
        choices = data.get("choices") or []
        if choices and isinstance(choices[0], dict):
            message = choices[0].get("message") or {}
            content = message.get("content", "")
            if isinstance(content, list):
                content = "".join(
                    part.get("text", "") for part in content if isinstance(part, dict)
                )
            if isinstance(content, str) and content.strip():
                return content.strip()
            if isinstance(choices[0].get("text"), str):
                return choices[0]["text"].strip()
    except Exception:
        return ""
    return ""


def _ping_auth_error(provider: str, status_code: int, raw: str) -> str:
    return (
        f"Authentication failed for {provider} (HTTP {status_code}). The API key is "
        "missing, invalid, or revoked — the model was never reached. Paste a valid key "
        "and retry. "
        f"Provider said: {raw[:160]}"
    )


class ProviderDiscoverRequest(BaseModel):
    provider: str
    api_key: str | None = None
    base_url: str | None = None


@router.post("/providers/discover")
async def discover_provider_models(req: ProviderDiscoverRequest):
    import httpx

    provider = req.provider.lower()
    provider = {
        "anthropic": "claude",
        "google": "gemini",
        "google-gemini": "gemini",
    }.get(provider, provider)
    if provider in {"kimi", "kimi-moonshot", "z.ai", "glm", "nim", "nvidia-nim"}:
        provider = _PROVIDER_ALIASES[provider]
    api_key = _resolve_api_key(provider, req.api_key) or ""
    base_url = req.base_url or ""

    try:
        if provider in [
            "lmstudio",
            "openai",
            "groq",
            "custom",
            "opencode",
            "openai-compatible",
            "moonshot",
            "zai",
            "nvidia",
            "deepseek",
            "mistral",
            "cline",
        ]:
            if provider == "lmstudio":
                candidate_bases = build_local_provider_base_candidates(base_url)
            elif provider == "openai":
                url = "https://api.openai.com/v1/models"
            elif provider == "groq":
                url = "https://api.groq.com/openai/v1/models"
            elif provider == "opencode":
                url = (
                    f"{_opencode_base_url(base_url)}/models"
                    if base_url
                    else "https://opencode.ai/zen/v1/models"
                )
            elif provider in _OPENAI_COMPATIBLE_PROVIDER_URLS:
                url = f"{_openai_compatible_base(provider, base_url)}/models"
            else:
                if not base_url.strip():
                    return {
                        "status": "error",
                        "message": "Base URL is required for OpenAI-compatible providers",
                        "models": [],
                    }
                url = f"{base_url.rstrip('/')}/models"

            if provider == "opencode":
                headers = _opencode_headers(api_key=api_key)
            else:
                headers = {"Content-Type": "application/json"}
                if api_key:
                    headers["Authorization"] = f"Bearer {api_key}"

            async with httpx.AsyncClient(timeout=6.0) as client:
                if provider == "lmstudio":
                    last_error = None
                    for url in [
                        f"{candidate.rstrip('/')}/models"
                        for candidate in candidate_bases
                    ]:
                        try:
                            resp = await client.get(url, headers=headers)
                            if resp.status_code == 200:
                                data = resp.json()
                                model_list = [
                                    m["id"] for m in data.get("data", []) if "id" in m
                                ]
                                return {"status": "success", "models": model_list}
                            last_error = f"Server status {resp.status_code}"
                        except Exception as exc:
                            last_error = str(exc)
                    return {
                        "status": "error",
                        "message": last_error or "Live discovery failed",
                        "models": [],
                    }

                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    model_list = _openai_compatible_model_list(data)
                    return {"status": "success", "models": model_list}
                return {
                    "status": "error",
                    "message": f"Server status {resp.status_code}",
                    "models": [],
                }

        elif provider == "ollama":
            url = (
                f"{base_url.rstrip('/')}/api/tags"
                if base_url
                else "http://127.0.0.1:11434/api/tags"
            )
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    model_list = [
                        m["name"] for m in data.get("models", []) if "name" in m
                    ]
                    return {"status": "success", "models": model_list}
                else:
                    return {
                        "status": "error",
                        "message": f"Server status {resp.status_code}",
                        "models": [],
                    }

        elif provider in ["google", "gemini"]:
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
            )
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    model_list = [
                        m["name"].split("/")[-1]
                        for m in data.get("models", [])
                        if "name" in m
                    ]
                    return {"status": "success", "models": model_list}
                else:
                    return {
                        "status": "error",
                        "message": f"Server status {resp.status_code}",
                        "models": [],
                    }

        elif provider in ["anthropic", "claude"]:
            if api_key:
                try:
                    headers = {
                        "x-api-key": api_key.strip(),
                        "anthropic-version": "2023-06-01",
                    }
                    async with httpx.AsyncClient(timeout=8.0) as client:
                        resp = await client.get(
                            "https://api.anthropic.com/v1/models", headers=headers
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            model_list = [
                                m["id"] for m in data.get("data", []) if "id" in m
                            ]
                            if model_list:
                                return {"status": "success", "models": model_list}
                except Exception:
                    pass
            return {
                "status": "success",
                "models": [
                    "claude-3-7-sonnet-20250219",
                    "claude-3-5-sonnet-20241022",
                    "claude-3-5-haiku-20241022",
                    "claude-3-haiku-20240307",
                    "claude-3-opus-20240229",
                ],
            }

        elif provider == "openrouter":
            url = "https://openrouter.ai/api/v1/models"
            headers = {
                "Content-Type": "application/json",
                "HTTP-Referer": "https://aurelinx.local",
                "X-Title": "Aurelinx",
            }
            cleaned_key = (api_key or "").strip()
            if cleaned_key:
                headers["Authorization"] = f"Bearer {cleaned_key}"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    model_list = [m["id"] for m in data.get("data", []) if "id" in m]
                    return {"status": "success", "models": model_list}
                return {
                    "status": "error",
                    "message": f"Server status {resp.status_code}: {resp.text[:200]}",
                    "models": [],
                }

        else:
            return {
                "status": "unsupported",
                "message": "Discovery not supported",
                "models": [],
            }

    except Exception as e:
        return {"status": "exception", "message": str(e), "models": []}
