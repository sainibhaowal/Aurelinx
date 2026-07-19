"""
Aurelinx Intelligence Chat endpoints
Persistent sessions, messages, uploads, and tool-enabled agent responses.
"""

from datetime import datetime
import asyncio
import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID, uuid4

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func
from sqlmodel import Session, select

from app.core.logging_config import get_logger
from app.core.data_policy import filter_real_records
from app.core.provider_utils import (
    build_local_provider_base_candidates,
    normalize_local_provider_base,
)
from app.core.security import TokenData, get_current_user
from app.models.database import (
    AuditLogTable,
    CandidateTable,
    ChatAttachmentTable,
    ChatMessageTable,
    ChatSessionTable,
    CanonicalCandidateTable,
    CanonicalEmployeeTable,
    EmployeeTable,
    SkillTable,
    IntegrationConnectionTable,
    CompliancePolicyTable,
    InterventionTable,
    ExperienceTable,
    GoldMetricSnapshotTable,
    MLModelCardTable,
    MLDriftSnapshotTable,
    ReleaseGateTable,
    DRRunbookTable,
    ProcurementArtifactTable,
    RawEventTable,
    QuarantineEventTable,
    ConnectorSyncJobTable,
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

router = APIRouter(prefix="/chat", tags=["chat"])
logger = get_logger(__name__)

UPLOAD_ROOT = Path(os.getenv("CHAT_UPLOAD_ROOT", "/app/data/chat")).resolve()
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


def _json_dumps(payload: Dict) -> str:
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
    return ChatMessageOut(
        id=m.id,
        session_id=m.session_id,
        role=m.role,
        content=m.content,
        tool_trace=m.tool_trace,
        created_at=m.created_at,
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
    details: Dict,
):
    audit = AuditLogTable(
        user_id=None,  # token user id is string in this project, keep optional DB FK null-safe
        action=action,
        resource_type=resource_type,
        resource_id=None,
        details=json.dumps(details),
        ip_address="127.0.0.1",
    )
    db.add(audit)


def _tokenize(text: str) -> List[str]:
    return re.findall(r"[a-z0-9\+\#\.]{2,}", text.lower())


def _search_employees(
    db: Session, query_text: str, limit: int = 5
) -> List[EmployeeTable]:
    employees = db.exec(select(EmployeeTable)).all()
    query_lower = query_text.lower()
    scored = []
    
    # Identify query intent flags
    wants_at_risk = any(k in query_lower for k in ["risk", "flight", "hazard", "leaving", "attrition"])
    wants_high_morale = any(k in query_lower for k in ["high morale", "happy", "satisfied", "good sentiment"])
    wants_low_morale = any(k in query_lower for k in ["low morale", "unhappy", "dissatisfied", "bad sentiment"])
    
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
        skills = db.exec(select(SkillTable).where(SkillTable.employee_id == emp.id)).all()
        for s in skills:
            if s.name and s.name.lower() in query_lower:
                score += 5.0
                
        scored.append((score, emp))
        
    scored.sort(key=lambda x: x[0], reverse=True)
    return [row[1] for row in scored[:limit]]


def _search_candidates(
    db: Session, query_text: str, limit: int = 5
) -> List[CandidateTable]:
    candidates = db.exec(select(CandidateTable)).all()
    query_lower = query_text.lower()
    scored = []
    
    # Identify query intent flags
    wants_high_match = any(k in query_lower for k in ["best", "top", "highly matched", "match", "scout"])
    wants_high_morale = any(k in query_lower for k in ["high morale", "happy", "good sentiment"])
    wants_low_morale = any(k in query_lower for k in ["low morale", "unhappy", "bad sentiment"])
    
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
        skills = db.exec(select(SkillTable).where(SkillTable.candidate_id == c.id)).all()
        for s in skills:
            if s.name and s.name.lower() in query_lower:
                score += 5.0
                
        scored.append((score, c))
        
    scored.sort(key=lambda x: x[0], reverse=True)
    return [row[1] for row in scored[:limit]]


def _compute_dashboard_snapshot(db: Session) -> Dict:
    employees = db.exec(select(EmployeeTable)).all()
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


def _department_risk_summary(employees: List[EmployeeTable]) -> List[Dict[str, Any]]:
    dept_map: Dict[str, int] = {}
    dept_risk: Dict[str, int] = {}
    for e in employees:
        dept = e.department or "Unknown"
        dept_map[dept] = dept_map.get(dept, 0) + 1
        if e.is_at_risk:
            dept_risk[dept] = dept_risk.get(dept, 0) + 1

    summary: List[Dict[str, Any]] = []
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


def _workspace_snapshot(db: Session, user_text: str = "") -> Dict[str, Any]:
    query_lower = user_text.lower() if user_text else ""
    snapshot = {}

    # Check query intent keywords
    wants_risk = any(k in query_lower for k in ["risk", "morale", "sentiment", "unhappy", "leaving", "hazard", "at-risk", "employee"])
    wants_candidates = any(k in query_lower for k in ["candidate", "scout", "match", "hiring", "talent"])
    wants_integrations = any(k in query_lower for k in ["integration", "connection", "connect", "greenhouse", "slack", "jira", "workday"])
    wants_compliance = any(k in query_lower for k in ["compliance", "policy", "policies", "gate", "release"])
    wants_interventions = any(k in query_lower for k in ["intervention", "mitigate", "action"])
    wants_events = any(k in query_lower for k in ["event", "quarantine", "ops", "bronze", "silver", "sync"])

    # If it is a generic query and none of the above are matched, we don't fetch any snapshot details!
    if not (wants_risk or wants_candidates or wants_integrations or wants_compliance or wants_interventions or wants_events):
        return {}

    # Query only what is requested!
    if wants_risk:
        employees = filter_real_records(db.exec(select(EmployeeTable)).all())
        dept_summary = _department_risk_summary(employees)
        top_risk_employees = sorted(employees, key=_top_risk_score_employee, reverse=True)[:5]
        workforce = _compute_dashboard_snapshot(db)
        
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
        candidates = filter_real_records(db.exec(select(CandidateTable)).all())
        candidate_match_avg = (
            round(sum(float(c.match_score or 0.0) for c in candidates) / len(candidates), 3)
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
            ]
        }

    if wants_integrations:
        integrations = db.exec(
            select(IntegrationConnectionTable).order_by(
                IntegrationConnectionTable.created_at.desc()
            )
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
            .where(CompliancePolicyTable.status == "active")
            .order_by(CompliancePolicyTable.created_at.desc())
        ).all()
        release_gates = db.exec(
            select(ReleaseGateTable).order_by(ReleaseGateTable.created_at.desc()).limit(5)
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
        raw_events_count = len(db.exec(select(RawEventTable)).all())
        quarantine_count = len(db.exec(select(QuarantineEventTable)).all())
        connector_jobs = db.exec(
            select(ConnectorSyncJobTable)
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
            ]
        }

    return snapshot


def _is_workspace_query(user_text: str) -> bool:
    text = user_text.lower()
    terms = [
        "directory",
        "sentiment",
        "morale",
        "risk",
        "retention",
        "talent scout",
        "talent scout",
        "workflow",
        "workflows",
        "candidate",
        "workforce",
        "analytics",
        "intervention",
        "policy",
        "system status",
        "enterprise operations",
        "data ops",
        "model",
        "drift",
        "release gate",
        "runbook",
        "procurement",
        "integration",
        "quarantine",
        "department",
        "cluster",
        "priority",
        "predictive",
    ]
    return any(term in text for term in terms)


def _direct_workspace_answer(db: Session, user_text: str) -> str | None:
    if not _is_workspace_query(user_text):
        return None

    snapshot = _workspace_snapshot(db)
    workforce = snapshot["workforce"]
    directory = snapshot["directory"]
    talent = snapshot["talent_scout"]
    ops = snapshot["enterprise_ops"]
    data_ops = snapshot["data_ops"]

    lines = [
        "## Aurelinx Workspace Snapshot",
        f"- Workforce: **{workforce['total_workforce']}**",
        f"- At risk employees: **{workforce['at_risk']}**",
        f"- Average morale: **{workforce['avg_morale']}**",
        f"- Candidates: **{talent['candidates_total']}**",
        f"- Candidate match average: **{talent['candidate_match_avg']}**",
        f"- Raw events: **{data_ops['raw_events']}**",
        f"- Quarantine events: **{data_ops['quarantine_events']}**",
        f"- Active interventions: **{len(ops['active_interventions'])} shown**",
        f"- Active policy packs: **{len(ops['policy_packs'])} shown**",
    ]

    top_cluster = workforce.get("top_risk_department")
    if top_cluster:
        lines.append(
            f"- Top risk department: **{top_cluster['department']}** "
            f"({top_cluster['at_risk']} / {top_cluster['total']} at risk rate {top_cluster['at_risk_rate']:.3f})"
        )

    lines.append("")
    lines.append("### Risk Drivers")
    for item in workforce["top_risk_drivers"]:
        lines.append(f"- {item['factor']}: `{item['count']}`")

    if workforce.get("department_risk_clusters"):
        lines.append("")
        lines.append("### Department Risk Clusters")
        for cluster in workforce["department_risk_clusters"][:5]:
            lines.append(
                f"- {cluster['department']} | total `{cluster['total']}` | at risk `{cluster['at_risk']}` | "
                f"rate `{cluster['at_risk_rate']:.3f}`"
            )

    if directory["top_risk_employees"]:
        lines.append("")
        lines.append("### Highest Risk Employees")
        for e in directory["top_risk_employees"]:
            lines.append(
                f"- {e['full_name']} | {e['department']} | {e['role']} | "
                f"sentiment `{e['sentiment_score']}` | retention `{e['retention_prob']}` | risk `{e['risk_score']}`"
            )

    if talent["top_candidates"]:
        lines.append("")
        lines.append("### Top Candidate Matches")
        for c in talent["top_candidates"]:
            lines.append(
                f"- {c['full_name']} | {c['department']} | {c['role']} | "
                f"match `{c['match_score']}` | scout `{c['scout_score']}`"
            )

    lines.append("")
    lines.append("### Enterprise Operations")
    lines.append(f"- Integrations: `{len(ops['integration_connections'])}`")
    lines.append(f"- Model cards: `{len(ops['model_governance'])}`")
    lines.append(f"- Drift snapshots: `{len(ops['drift_snapshots'])}`")
    lines.append(f"- Release gates: `{len(ops['release_gates'])}`")
    lines.append(f"- DR runbooks: `{len(ops['dr_runbooks'])}`")
    lines.append(f"- Procurement artifacts: `{len(ops['procurement_artifacts'])}`")
    surface = snapshot.get("application_surface", {})
    if surface:
        lines.append("")
        lines.append("### Application Surfaces")
        lines.append(f"- Modules: {', '.join(surface.get('modules', []))}")
        lines.append(f"- Data planes: {', '.join(surface.get('data_planes', []))}")
        lines.append(f"- Import paths: {', '.join(surface.get('import_paths', []))}")

    return "\n".join(lines)


def _workspace_snapshot_summary_lines(snapshot: Dict[str, Any]) -> List[str]:
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
            lines.append(f"  * {conn.get('name')} ({conn.get('provider')} - {conn.get('source_type')}): Status {conn.get('status')}")

    # 4. Compliance Policies details
    policies = ops.get("policy_packs", [])
    if policies:
        lines.append("\nActive Compliance Policies:")
        for p in policies:
            lines.append(f"  * {p.get('policy_name')} (Region: {p.get('region')}, Action: {p.get('action_type')}): Status {p.get('status')}")

    # 5. Active Interventions details
    interventions = ops.get("active_interventions", [])
    if interventions:
        lines.append("\nActive Interventions:")
        for i in interventions:
            lines.append(f"  * {i.get('title')} (Priority: {i.get('priority')}): Status {i.get('status')}")

    return lines


def _record_counts(db: Session) -> Dict[str, int]:
    def _count(model) -> int:
        value = db.exec(select(func.count()).select_from(model)).one()
        if isinstance(value, tuple):
            value = value[0]
        return int(value or 0)

    return {
        "employees": _count(EmployeeTable),
        "candidates": _count(CandidateTable),
        "skills": _count(SkillTable),
        "experience": _count(ExperienceTable),
    }


def _is_count_query(user_text: str) -> bool:
    text = user_text.lower()
    count_phrases = (
        "how many",
        "number of",
        "count of",
        "total",
        "how much",
    )
    entity_phrases = (
        "candidate",
        "candidates",
        "employee",
        "employees",
        "workforce",
        "people",
    )
    return any(p in text for p in count_phrases) and any(
        p in text for p in entity_phrases
    )


def _direct_count_answer(db: Session, user_text: str) -> str | None:
    if not _is_count_query(user_text):
        return None

    counts = _record_counts(db)
    text = user_text.lower()
    if any(
        term in text
        for term in [
            "candidate",
            "candidates",
            "recruit",
            "hiring",
            "talent",
            "talents",
        ]
    ):
        return (
            f"There are **{counts['candidates']} candidates** in Postgres.\n\n"
            f"- Candidates: `{counts['candidates']}`\n"
            f"- Skills linked: `{counts['skills']}`\n"
            f"- Experience rows: `{counts['experience']}`"
        )
    if any(term in text for term in ["employee", "employees", "workforce", "people"]):
        return (
            f"There are **{counts['employees']} employees** in Postgres.\n\n"
            f"- Employees: `{counts['employees']}`\n"
            f"- Candidates: `{counts['candidates']}`"
        )
    return None


def _parse_csv_and_ingest(db: Session, attachments: List[ChatAttachmentTable]) -> Dict:
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
            with open(path, mode="r", encoding="utf-8", errors="ignore") as f:
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


def _apply_data_mutation(db: Session, user_text: str) -> Dict:
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
    email_match = re.search(r"([a-zA-Z0-9\.\-\_\+]+@[a-zA-Z0-9\.\-\_]+\.[a-zA-Z]{2,})", user_text)
    if email_match:
        email = email_match.group(1)

    # 1. Check for risk updates
    if "risk" in lowered:
        val_match = re.search(r"\b(true|false|yes|no|high|low)\b", lowered)
        if email and val_match:
            value = val_match.group(1) in ["true", "yes", "high"]
            emp = db.exec(select(EmployeeTable).where(EmployeeTable.email == email)).first()
            if emp:
                emp.is_at_risk = value
                emp.updated_at = datetime.utcnow()
                db.add(emp)
                mutation_log["updated"] = True
                mutation_log["actions"].append(f"Set risk={value} for {email}")

    # 2. Check for department moves
    if any(k in lowered for k in ["move", "transfer", "change department", "dept"]):
        dept_match = re.search(r"(?:to|department|dept)\s+(?:is\s+|:\s*|of\s+)?([a-zA-Z0-9\s\-\_]+?)(?:,|$|\.|\s+for|\s+email)", user_text, re.IGNORECASE)
        if email and dept_match:
            dept = dept_match.group(1).strip().title()
            for prefix in ["department", "dept"]:
                if dept.lower().startswith(prefix + " "):
                    dept = dept[len(prefix)+1:].strip()
            emp = db.exec(select(EmployeeTable).where(EmployeeTable.email == email)).first()
            if emp:
                emp.department = dept
                emp.updated_at = datetime.utcnow()
                db.add(emp)
                mutation_log["updated"] = True
                mutation_log["actions"].append(f"Moved {email} to {dept}")

    # 3. Add Employee / Candidate
    is_add_employee = ("employee" in lowered) and any(kw in lowered for kw in ["add", "create", "insert", "register"])
    is_add_candidate = ("candidate" in lowered) and any(kw in lowered for kw in ["add", "create", "insert", "register"])

    if is_add_employee or is_add_candidate:
        name = None
        name_patterns = [
            r"(?:name|employee|candidate)\s+(?:is\s+|:\s*|named\s+)?([a-zA-Z\s]+?)(?:,|$|\s+email|\s+role|\s+dept|\s+department|\s+with)",
            r"(?:add|create|insert|register)\s+(?:employee|candidate|new\s+employee|new\s+candidate)?\s+([a-zA-Z\s]+?)(?:,|$|\s+email|\s+role|\s+dept|\s+department|\s+with)"
        ]
        for pattern in name_patterns:
            m = re.search(pattern, user_text, re.IGNORECASE)
            if m:
                name = m.group(1).strip()
                for prefix in ["named", "is", "employee", "candidate", "new", "a"]:
                    if name.lower().startswith(prefix + " "):
                        name = name[len(prefix)+1:].strip()
                break

        role = "Software Engineer"
        role_match = re.search(r"role\s+(?:is\s+|:\s*|to\s+)?([a-zA-Z0-9\s\-\_]+?)(?:,|$|\.|\s+email|\s+dept|\s+department|\s+with)", user_text, re.IGNORECASE)
        if role_match:
            role = role_match.group(1).strip().title()

        dept = "Engineering"
        dept_match = re.search(r"(?:dept|department)\s+(?:is\s+|:\s*|to\s+)?([a-zA-Z0-9\s\-\_]+?)(?:,|$|\.|\s+email|\s+role|\s+with)", user_text, re.IGNORECASE)
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
    if any(k in lowered for k in ["update", "correct", "change", "fix", "set"]) and email:
        emp = db.exec(select(EmployeeTable).where(EmployeeTable.email == email)).first()
        if emp:
            updated = False
            role_match = re.search(r"role\s+(?:to\s+|set\s+|is\s+|:\s*)?([a-zA-Z0-9\s\-\_]+?)(?:,|$|\.|\s+for)", user_text, re.IGNORECASE)
            if role_match:
                val = role_match.group(1).strip().title()
                emp.role = val
                mutation_log["actions"].append(f"Updated role to {val} for {email}")
                updated = True
            
            dept_match = re.search(r"(?:dept|department)\s+(?:to\s+|set\s+|is\s+|:\s*)?([a-zA-Z0-9\s\-\_]+?)(?:,|$|\.|\s+for)", user_text, re.IGNORECASE)
            if dept_match:
                val = dept_match.group(1).strip().title()
                emp.department = val
                mutation_log["actions"].append(f"Updated department to {val} for {email}")
                updated = True

            name_match = re.search(r"name\s+(?:to\s+|set\s+|is\s+|:\s*)?([a-zA-Z\s]+?)(?:,|$|\.|\s+for)", user_text, re.IGNORECASE)
            if name_match:
                val = name_match.group(1).strip().title()
                emp.full_name = val
                mutation_log["actions"].append(f"Updated full name to {val} for {email}")
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


def _attachment_text_context(
    attachments: List[ChatAttachmentTable], max_chars: int = 12000
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


def _parse_attachment_for_index(path: Path) -> Tuple[str, str, str]:
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


async def _llm_stream_response(
    provider: str,
    api_key: str,
    base_url: str,
    model: str,
    user_text: str,
    context_payload: Dict,
):
    provider = (provider or "lmstudio").lower()
    casual_chat = _is_casual_chat(user_text)

    if provider == "lmstudio":
        endpoint = (
            f"{normalize_local_provider_base(base_url).rstrip('/')}/chat/completions"
        )
        model_name = model or "liquid/lfm2.5-1.2b"
        headers = {"Content-Type": "application/json"}
    elif provider == "opencode":
        endpoint = (
            f"{(base_url or 'https://opencode.ai/zen/v1').rstrip('/')}/chat/completions"
        )
        model_name = model or "gpt-5.5"
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
    elif provider == "openai":
        endpoint = "https://api.openai.com/v1/chat/completions"
        model_name = model or "gpt-4o-mini"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
    elif provider == "groq":
        endpoint = "https://api.groq.com/openai/v1/chat/completions"
        model_name = model or "llama-3.1-70b-versatile"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
    elif provider == "claude":
        endpoint = "https://api.anthropic.com/v1/messages"
        model_name = model or "claude-3-5-sonnet-20241022"
        headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        }
    elif provider == "gemini":
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model or 'gemini-1.5-pro'}:streamGenerateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
    else:
        yield f"Provider stream adapter for {provider} not supported."
        return

    system = (
        "You are Aurelinx, the authoritative AI intelligence of the Aurelinx Management OS — "
        "an executive-grade HR platform.\n"
        "You have live access to the HR employee directory, candidates database, analytics, "
        "compliance policies, integrations, enterprise ops, and agentic tools.\n"
        "A structured workspace snapshot may be attached; use it as the source of truth.\n"
        "IMPORTANT RULES:\n"
        "- Always respond in clear, beautiful Markdown with tables, bullet points, bold text where appropriate.\n"
        "- Never dump raw JSON or technical payloads to the user.\n"
        "- Never fabricate data — only use what is provided in the tool context.\n"
        "- Be natural, direct, and executive in tone.\n"
        "- If asked about employees, present the data in a clean formatted table or list.\n"
        "- If deletion is requested, firmly state it requires human approval and cannot be automated."
    )

    tool_ctx = context_payload.get("tool_context", {})
    tool_runs = tool_ctx.get("tool_runs", [])
    has_tool_output = bool(tool_runs)

    tool_summary_lines = []
    for run in tool_runs:
        tool_name = run.get("tool", "unknown")
        if run.get("denied"):
            tool_summary_lines.append(
                f"- {tool_name}: ACCESS DENIED — {run.get('reason', '')}"
            )
        elif run.get("blocked"):
            tool_summary_lines.append(
                f"- {tool_name}: BLOCKED — {run.get('reason', '')}"
            )
        else:
            output = run.get("output", [])
            tool_summary_lines.append(f"- {tool_name}: {json.dumps(output)}")

    integrations = tool_ctx.get("integration_connections", [])
    compliance = tool_ctx.get("compliance_policies", [])
    mutations = tool_ctx.get("mutations", {})
    rbac = tool_ctx.get("rbac_role", "member")
    workspace_snapshot = tool_ctx.get("workspace_snapshot", {})

    if not casual_chat:
        tool_block = "\n".join(tool_summary_lines) if tool_summary_lines else "- No specific tool queries executed."
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
            f"Active integrations: {json.dumps(integrations)}\n"
            f"Compliance policies: {json.dumps(compliance)}\n"
            f"Mutation log: {json.dumps(mutations)}\n"
            f"User RBAC role: {rbac}\n"
            "--- END TOOL DATA ---\n\n"
            "Using the data above, answer the user's request clearly in Markdown. "
            "Present employee data as a formatted table. Do not include raw JSON in your response."
        )
    else:
        user_content = f"{user_text}\n\n" "Answer naturally and conversationally."

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
        history_messages.append({"role": role, "content": content[:300]})

    if provider in ["openai", "lmstudio", "groq", "opencode"]:
        messages = [{"role": "system", "content": system}]
        messages.extend(history_messages[-6:])
        messages.append({"role": "user", "content": user_content})
        payload = {
            "model": model_name,
            "max_tokens": 1024,
            "temperature": 0.7 if casual_chat else 0.3,
            "messages": messages,
            "stream": True,
        }
    elif provider == "claude":
        messages = list(history_messages[-6:])
        messages.append({"role": "user", "content": user_content})
        payload = {
            "model": model_name,
            "max_tokens": 1024,
            "temperature": 0.7 if casual_chat else 0.3,
            "system": system,
            "messages": messages,
            "stream": True,
        }
    else:  # gemini
        full_prompt = f"{system}\n\n{user_content}"
        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {
                "temperature": 0.7 if casual_chat else 0.3,
                "maxOutputTokens": 1024,
            },
        }

    in_thinking = False
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST", endpoint, json=payload, headers=headers
        ) as resp:
            resp.raise_for_status()

            if provider in ["openai", "lmstudio", "groq", "opencode"]:
                async for line in resp.aiter_lines():
                    if line.startswith("data:"):
                        data_str = line[5:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data_str)
                            delta = chunk.get("choices", [{}])[0].get("delta", {})

                            content = delta.get("content")
                            reasoning = delta.get("reasoning_content")

                            if reasoning:
                                if not in_thinking:
                                    yield "<think>"
                                    in_thinking = True
                                yield reasoning
                            elif content:
                                if in_thinking:
                                    yield "</think>"
                                    in_thinking = False
                                yield content
                        except Exception:
                            continue

            elif provider == "claude":
                async for line in resp.aiter_lines():
                    if line.startswith("data:"):
                        data_str = line[5:].strip()
                        try:
                            chunk = json.loads(data_str)
                            if chunk.get("type") == "content_block_delta":
                                delta = chunk.get("delta", {})
                                text = delta.get("text", "")
                                if text:
                                    yield text
                        except Exception:
                            continue

            elif provider == "gemini":
                # Handle Gemini chunk-by-chunk stream response beautifully
                async for chunk_bytes in resp.aiter_bytes():
                    chunk_str = chunk_bytes.decode("utf-8", errors="ignore")
                    try:
                        obj = json.loads(chunk_str.strip())
                        text = (
                            obj.get("candidates", [{}])[0]
                            .get("content", {})
                            .get("parts", [{}])[0]
                            .get("text", "")
                        )
                        if text:
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
    context_payload: Dict,
) -> str:
    provider = (provider or "lmstudio").lower()

    if provider == "lmstudio":
        endpoint = (
            f"{normalize_local_provider_base(base_url).rstrip('/')}/chat/completions"
        )
        model_name = model or "liquid/lfm2.5-1.2b"
        headers = {"Content-Type": "application/json"}
    elif provider == "opencode":
        endpoint = (
            f"{(base_url or 'https://opencode.ai/zen/v1').rstrip('/')}/chat/completions"
        )
        model_name = model or "gpt-5.5"
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
    elif provider == "openai":
        endpoint = "https://api.openai.com/v1/chat/completions"
        model_name = model or "gpt-4o-mini"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
    elif provider == "groq":
        endpoint = "https://api.groq.com/openai/v1/chat/completions"
        model_name = model or "llama-3.1-70b-versatile"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
    elif provider == "claude":
        endpoint = "https://api.anthropic.com/v1/messages"
        model_name = model or "claude-3-5-sonnet-20241022"
        headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        }
    elif provider == "gemini":
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model or 'gemini-1.5-pro'}:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
    else:
        return "Provider adapter for this chat request is not configured. Switch to LM Studio/OpenAI."

    casual_chat = _is_casual_chat(user_text)

    system = (
        "You are Aurelinx, the authoritative AI intelligence of the Aurelinx Management OS — "
        "an executive-grade HR platform.\n"
        "You have live access to the HR employee directory, candidates database, analytics, "
        "compliance policies, integrations, enterprise ops, and agentic tools.\n"
        "A structured workspace snapshot may be attached; use it as the source of truth.\n"
        "IMPORTANT RULES:\n"
        "- Always respond in clear, beautiful Markdown with tables, bullet points, bold text where appropriate.\n"
        "- Never dump raw JSON or technical payloads to the user.\n"
        "- Never fabricate data — only use what is provided in the tool context.\n"
        "- Be natural, direct, and executive in tone.\n"
        "- If asked about employees, present the data in a clean formatted table or list.\n"
        "- If deletion is requested, firmly state it requires human approval and cannot be automated."
    )

    # Build clean tool summary — never pass nested session_history inside the tool block
    tool_ctx = context_payload.get("tool_context", {})
    tool_runs = tool_ctx.get("tool_runs", [])
    has_tool_output = bool(tool_runs)

    # Produce a compact, readable tool summary string (not raw JSON of entire payload)
    tool_summary_lines = []
    for run in tool_runs:
        tool_name = run.get("tool", "unknown")
        if run.get("denied"):
            tool_summary_lines.append(
                f"- {tool_name}: ACCESS DENIED — {run.get('reason', '')}"
            )
        elif run.get("blocked"):
            tool_summary_lines.append(
                f"- {tool_name}: BLOCKED — {run.get('reason', '')}"
            )
        else:
            output = run.get("output", [])
            tool_summary_lines.append(f"- {tool_name}: {json.dumps(output)}")

    integrations = tool_ctx.get("integration_connections", [])
    compliance = tool_ctx.get("compliance_policies", [])
    mutations = tool_ctx.get("mutations", {})
    rbac = tool_ctx.get("rbac_role", "member")
    workspace_snapshot = tool_ctx.get("workspace_snapshot", {})

    if not casual_chat:
        tool_block = "\n".join(tool_summary_lines) if tool_summary_lines else "- No specific tool queries executed."
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
            f"Active integrations: {json.dumps(integrations)}\n"
            f"Compliance policies: {json.dumps(compliance)}\n"
            f"Mutation log: {json.dumps(mutations)}\n"
            f"User RBAC role: {rbac}\n"
            "--- END TOOL DATA ---\n\n"
            "Using the data above, answer the user's request clearly in Markdown. "
            "Present employee data as a formatted table. Do not include raw JSON in your response."
        )
    else:
        user_content = f"{user_text}\n\n" "Answer naturally and conversationally."

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
        # Only keep clean conversational turns (cap at 300 chars per turn to stay token-safe)
        history_messages.append({"role": role, "content": content[:300]})

    if provider in ["openai", "lmstudio", "groq", "opencode"]:
        messages = [{"role": "system", "content": system}]
        messages.extend(history_messages[-6:])  # last 3 turns max
        messages.append({"role": "user", "content": user_content})
        payload = {
            "model": model_name,
            "max_tokens": 1024,
            "temperature": 0.7 if casual_chat else 0.3,
            "messages": messages,
        }
    elif provider == "claude":
        messages = list(history_messages[-6:])
        messages.append({"role": "user", "content": user_content})
        payload = {
            "model": model_name,
            "max_tokens": 1024,
            "temperature": 0.7 if casual_chat else 0.3,
            "system": system,
            "messages": messages,
        }
    else:  # gemini
        full_prompt = f"{system}\n\n{user_content}"
        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {
                "temperature": 0.7 if casual_chat else 0.3,
                "maxOutputTokens": 1024,
            },
        }

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(endpoint, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        if provider in ["openai", "lmstudio", "groq", "opencode"]:
            return _sanitize_llm_response(
                data["choices"][0]["message"]["content"], user_text
            )
        if provider == "claude":
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


def _tool_policy(user_text: str) -> List[str]:
    text = user_text.lower()
    tools = []
    
    # If not a casual chat, always include search and dashboard tools to provide maximal context
    if not _is_casual_chat(user_text):
        tools.append("search_employees")
        tools.append("search_candidates")
        tools.append("dashboard_snapshot")

    if any(
        k in text
        for k in [
            "add",
            "create",
            "insert",
            "update",
            "set",
            "move",
            "correct",
            "fix",
            "change",
            "ingest",
            "import",
            "register",
        ]
    ):
        tools.append("mutate_data")
    if any(k in text for k in ["delete", "remove", "purge", "clear"]):
        tools.append("human_approval_delete")
    if any(k in text for k in ["csv", "excel", "file"]):
        tools.append("parse_csv_attachment")
    return list(set(tools))


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
    text = user_text.strip().lower()
    casual_phrases = {
        "hi",
        "hello",
        "hey",
        "who are you",
        "what can you do",
        "help",
        "good morning",
        "good afternoon",
        "good evening",
    }
    return text in casual_phrases or (len(text.split()) <= 2 and not _tool_policy(text))


def _sanitize_llm_response(text: str, user_text: str) -> str:
    """
    Ensure raw generated markdown text is passed directly to allow comprehensive markdown styling.
    """
    if not text:
        return ""
    return text.strip()


def _direct_casual_reply(user_text: str) -> str:
    # Retained as a fallback if model calls fail entirely
    return "Hi, I am Aurelinx. Let me know how I can assist with HR analytics, employee tracking, or database management."


def _build_context_payload(
    db: Session,
    session_id: UUID,
    user_text: str,
    current_user: TokenData,
    attachments: List[ChatAttachmentTable],
) -> Dict:
    """
    Build a lean, token-safe context payload.
    - Casual prompts skip history entirely.
    - Tool context is always included but session history is strictly filtered.
    - Poisoned turns (raw JSON dumps, LLM failure messages) are stripped at source.
    """
    casual_chat = _is_casual_chat(user_text)
    tool_context = _execute_tools(db, user_text, current_user, attachments)

    if casual_chat:
        return {
            "tool_context": {
                "tool_policy": tool_context.get("tool_policy", []),
                "tool_runs": [],
                "rbac_role": tool_context.get("rbac_role"),
            },
            "session_history": [],
        }

    # Fetch last 6 messages (3 turns) for multi-turn context
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
        clean_history.append({"role": m.role, "content": content[:400]})

    return {
        "tool_context": tool_context,
        "session_history": clean_history,
    }


def _execute_tools(
    db: Session,
    user_text: str,
    current_user: TokenData,
    attachments: List[ChatAttachmentTable],
) -> Dict:
    tools = _tool_policy(user_text)
    result = {"tool_policy": tools, "tool_runs": []}
    mutation_log = {"updated": False, "actions": [], "blocked": False}

    role = _user_role(current_user)
    if "search_employees" in tools:
        if role in TOOL_RBAC["search_employees"]:
            emp_results = _search_employees(db, user_text, limit=8)
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
        else:
            result["tool_runs"].append(
                {
                    "tool": "search_employees",
                    "denied": True,
                    "reason": "RBAC policy denied",
                }
            )
    if "search_candidates" in tools:
        if role in TOOL_RBAC["search_candidates"]:
            cand_results = _search_candidates(db, user_text, limit=8)
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
        else:
            result["tool_runs"].append(
                {
                    "tool": "search_candidates",
                    "denied": True,
                    "reason": "RBAC policy denied",
                }
            )
    if "dashboard_snapshot" in tools:
        if role in TOOL_RBAC["dashboard_snapshot"]:
            result["tool_runs"].append(
                {
                    "tool": "dashboard_snapshot",
                    "output": _compute_dashboard_snapshot(db),
                }
            )
        else:
            result["tool_runs"].append(
                {
                    "tool": "dashboard_snapshot",
                    "denied": True,
                    "reason": "RBAC policy denied",
                }
            )
    if "mutate_data" in tools:
        if role not in TOOL_RBAC["mutate_data"]:
            mutation_log["blocked"] = True
            mutation_log["actions"].append(
                "Mutation blocked: RBAC policy requires admin."
            )
        else:
            mutation_log = _apply_data_mutation(db, user_text)
        result["tool_runs"].append({"tool": "mutate_data", "output": mutation_log})
    if "human_approval_delete" in tools:
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
    if "parse_csv_attachment" in tools or any(att.original_name.lower().endswith(".csv") for att in attachments):
        csv_log = _parse_csv_and_ingest(db, attachments)
        result["tool_runs"].append({"tool": "parse_csv_attachment", "output": csv_log})

    result["workspace_snapshot"] = _workspace_snapshot(db, user_text)
    result["record_counts"] = _record_counts(db)

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


@router.get("/sessions", response_model=List[ChatSessionOut])
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

    # 1. Delete attachments first
    attachments = db.exec(
        select(ChatAttachmentTable).where(ChatAttachmentTable.session_id == row.id)
    ).all()
    for a in attachments:
        try:
            os.remove(a.file_path)
        except Exception:
            pass
        db.delete(a)

    # 2. Delete messages next
    messages = db.exec(
        select(ChatMessageTable).where(ChatMessageTable.session_id == row.id)
    ).all()
    for m in messages:
        db.delete(m)

    # 3. Delete session row
    db.delete(row)
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
            continue  # Already gone — idempotent

        if (
            not current_user.is_admin
            and str(row.user_id) != "00000000-0000-0000-0000-000000000000"
            and row.user_id != current_user.user_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden session access"
            )

        # 1. Delete attachments first
        attachments = db.exec(
            select(ChatAttachmentTable).where(ChatAttachmentTable.session_id == row.id)
        ).all()
        for a in attachments:
            try:
                os.remove(a.file_path)
            except Exception:
                pass
            db.delete(a)

        # 2. Delete messages next
        messages = db.exec(
            select(ChatMessageTable).where(ChatMessageTable.session_id == row.id)
        ).all()
        for m in messages:
            db.delete(m)

        # 3. Delete session row
        db.delete(row)

    db.commit()


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageOut])
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


@router.get(
    "/sessions/{session_id}/attachments", response_model=List[ChatAttachmentOut]
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
        session_id=chat_session.id, role="user", content=request.content
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
    assistant_text = ""
    last_err = None
    for _ in range(3):
        try:
            assistant_text = await _llm_response(
                provider=request.provider or "lmstudio",
                api_key=request.api_key,
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
        assistant_text = (
            "I processed your request with available tools but the LLM response failed after retries. "
            f"Tool results: {json.dumps(context_payload)}"
        )

    assistant_msg = ChatMessageTable(
        session_id=chat_session.id,
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

    async def gen():
        try:
            last_err = None
            user_msg = ChatMessageTable(
                session_id=chat_session.id, role="user", content=request.content
            )
            db.add(user_msg)
            db.commit()
            db.refresh(user_msg)
            
            # Step 1: Thinking
            yield f"event: status\ndata: {_json_dumps({'phase': 'thinking'})}\n\n"
            await asyncio.sleep(0.35)
            
            # Step 2: Planning
            yield f"event: status\ndata: {_json_dumps({'phase': 'planning'})}\n\n"
            await asyncio.sleep(0.35)

            attachments = db.exec(
                select(ChatAttachmentTable).where(
                    ChatAttachmentTable.session_id == chat_session.id
                )
            ).all()
            
            # Step 3: Exploring
            yield f"event: status\ndata: {_json_dumps({'phase': 'exploring'})}\n\n"
            context_payload = _build_context_payload(
                db, chat_session.id, request.content, current_user, attachments
            )
            await asyncio.sleep(0.35)
            
            # Check if there is mutation tool policy to show modifying step
            tool_policy = context_payload.get("tool_context", {}).get("tool_policy", [])
            if "mutate_data" in tool_policy:
                # Step 4: Modifying
                yield f"event: status\ndata: {_json_dumps({'phase': 'modifying'})}\n\n"
                await asyncio.sleep(0.35)
                
            # Step 5: Verifying
            yield f"event: status\ndata: {_json_dumps({'phase': 'verifying'})}\n\n"
            await asyncio.sleep(0.35)

            # Step 6: Completing
            yield f"event: status\ndata: {_json_dumps({'phase': 'completing'})}\n\n"
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
                    assistant_text = (
                        f"LLM failed. Tool context: {json.dumps(context_payload)}"
                    )
                    yield f"event: chunk\ndata: {_json_dumps({'text': assistant_text})}\n\n"

            assistant_msg = ChatMessageTable(
                session_id=chat_session.id,
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
            yield f"event: done\ndata: {_json_dumps({'assistant_message': _to_message_out(assistant_msg).model_dump(mode='json'), 'user_message': _to_message_out(user_msg).model_dump(mode='json'), 'session': _to_session_out(chat_session).model_dump(mode='json')})}\n\n"
        except Exception as e:
            logger.exception("Streaming chat generator failed")
            try:
                db.rollback()
            except Exception:
                pass
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

    # 1. Delete attachments first to avoid foreign key violations on chat_messages
    attachments = db.exec(
        select(ChatAttachmentTable).where(ChatAttachmentTable.session_id == row.id)
    ).all()
    for att in attachments:
        try:
            os.remove(att.file_path)
        except Exception:
            pass
        db.delete(att)

    # 2. Delete messages next
    messages = db.exec(
        select(ChatMessageTable).where(ChatMessageTable.session_id == row.id)
    ).all()
    for m in messages:
        db.delete(m)

    row.updated_at = datetime.utcnow()
    db.add(row)
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
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None


@router.post("/providers/ping")
async def ping_provider(req: ProviderPingRequest):
    import httpx

    provider = req.provider.lower()
    api_key = req.api_key or ""
    base_url = req.base_url or ""
    model = req.model or ""

    try:
        if provider == "lmstudio":
            candidate_bases = build_local_provider_base_candidates(base_url)
            model_name = model or "liquid/lfm2.5-1.2b"
            headers = {"Content-Type": "application/json"}
            payload = {
                "model": model_name,
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "ping"}],
            }
        elif provider == "opencode":
            endpoint = (
                f"{base_url.rstrip('/')}/chat/completions"
                if base_url
                else "https://opencode.ai/zen/v1/chat/completions"
            )
            model_name = model or "gpt-5.5"
            headers = {"Content-Type": "application/json"}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"
            payload = {
                "model": model_name,
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "ping"}],
            }
        elif provider == "openai":
            endpoint = "https://api.openai.com/v1/chat/completions"
            model_name = model or "gpt-4o-mini"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            }
            payload = {
                "model": model_name,
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "ping"}],
            }
        elif provider == "groq":
            endpoint = "https://api.groq.com/openai/v1/chat/completions"
            model_name = model or "llama-3.1-70b-versatile"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            }
            payload = {
                "model": model_name,
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "ping"}],
            }
        elif provider == "claude":
            endpoint = "https://api.anthropic.com/v1/messages"
            model_name = model or "claude-3-5-sonnet-20241022"
            headers = {
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            }
            payload = {
                "model": model_name,
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "ping"}],
            }
        elif provider == "gemini":
            endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model or 'gemini-1.5-pro'}:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{"parts": [{"text": "ping"}]}],
                "generationConfig": {"maxOutputTokens": 1},
            }
        else:
            return {
                "status": "unsupported",
                "message": f"Unsupported provider: {provider}",
            }

        async with httpx.AsyncClient(timeout=8.0) as client:
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
                            return {
                                "status": "healthy",
                                "message": "Connection healthy! Model is fully responsive.",
                            }
                        last_error = f"Server returned error code {resp.status_code}: {resp.text[:200]}"
                    except Exception as exc:
                        last_error = str(exc)
                return {
                    "status": "offline",
                    "message": f"Ping connection failed: {last_error or 'All connection attempts failed'}",
                }

            resp = await client.post(endpoint, json=payload, headers=headers)
            if resp.status_code == 200:
                return {
                    "status": "healthy",
                    "message": "Connection healthy! Model is fully responsive.",
                }
            return {
                "status": "error",
                "message": f"Server returned error code {resp.status_code}: {resp.text[:200]}",
            }
    except Exception as e:
        return {"status": "offline", "message": f"Ping connection failed: {str(e)}"}


class ProviderDiscoverRequest(BaseModel):
    provider: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None


@router.post("/providers/discover")
async def discover_provider_models(req: ProviderDiscoverRequest):
    import httpx

    provider = req.provider.lower()
    api_key = req.api_key or ""
    base_url = req.base_url or ""

    try:
        if provider in [
            "lmstudio",
            "openai",
            "groq",
            "custom",
            "opencode",
            "openai-compatible",
        ]:
            if provider == "lmstudio":
                candidate_bases = build_local_provider_base_candidates(base_url)
            elif provider == "openai":
                url = "https://api.openai.com/v1/models"
            elif provider == "groq":
                url = "https://api.groq.com/openai/v1/models"
            elif provider == "opencode":
                url = (
                    f"{base_url.rstrip('/')}/models"
                    if base_url
                    else "https://opencode.ai/zen/v1/models"
                )
            else:
                if not base_url.strip():
                    return {
                        "status": "error",
                        "message": "Base URL is required for OpenAI-compatible providers",
                        "models": [],
                    }
                url = f"{base_url.rstrip('/')}/models"

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
                    model_list = [m["id"] for m in data.get("data", []) if "id" in m]
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
            return {
                "status": "success",
                "models": ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
            }

        else:
            return {
                "status": "unsupported",
                "message": "Discovery not supported",
                "models": [],
            }

    except Exception as e:
        return {"status": "exception", "message": str(e), "models": []}
