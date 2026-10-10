# Copyright 2026 Ravinder Singh
# Licensed under the Apache License, Version 2.0 (the "License");
"""Single source of truth for all agent tools (fixes B1).

TOOL_SCHEMAS, AGENT_TOOL_CATALOG, labels, roles and dispatch all derive
from REGISTRY. Adding a tool = one entry here.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    schema: dict[str, Any]
    roles: frozenset[str]  # {"admin","member","viewer"} subset allowed to run
    label: str = ""
    mutating: bool = False
    needs_approval: bool = False
    read_only: bool = True
    timeout_s: float = 15.0
    handler: str = ""  # name of executor branch, for traceability


def _q(limit_max: int = 100) -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "query": {"type": "string"},
            "limit": {"type": "integer", "minimum": 1, "maximum": limit_max},
        },
    }


_SPECS: list[ToolSpec] = [
    ToolSpec(
        "search",
        "Find safe matching records across Aurelinx entities.",
        {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "entity": {"type": "string"},
                "limit": {"type": "integer", "minimum": 1, "maximum": 200},
                "offset": {"type": "integer", "minimum": 0},
            },
            "required": ["query"],
        },
        frozenset({"admin", "member", "viewer"}),
        "system records",
        handler="search",
    ),
    ToolSpec(
        "read",
        "Read one safe record by its exact identifier.",
        {
            "type": "object",
            "properties": {
                "entity": {"type": "string"},
                "identifier": {"type": "string"},
                "limit": {"type": "integer", "minimum": 1, "maximum": 50},
            },
            "required": ["entity", "identifier"],
        },
        frozenset({"admin", "member", "viewer"}),
        "the requested record",
        handler="read",
    ),
    ToolSpec(
        "modify",
        "Admin-only update of one exact record. Verified after commit.",
        {
            "type": "object",
            "properties": {
                "entity": {"type": "string"},
                "identifier": {"type": "string"},
                "fields": {"type": "object"},
            },
            "required": ["entity", "identifier", "fields"],
        },
        frozenset({"admin"}),
        "the requested data change",
        mutating=True,
        read_only=False,
        handler="modify",
    ),
    ToolSpec(
        "write",
        "Admin-only creation of a new supported record.",
        {
            "type": "object",
            "properties": {"entity": {"type": "string"}, "data": {"type": "object"}},
            "required": ["entity", "data"],
        },
        frozenset({"admin"}),
        "the new record",
        mutating=True,
        read_only=False,
        handler="write",
    ),
    ToolSpec(
        "delete",
        "Prepare deletion of an exact record. Always needs human approval.",
        {
            "type": "object",
            "properties": {
                "entity": {"type": "string"},
                "identifier": {"type": "string"},
            },
            "required": ["entity", "identifier"],
        },
        frozenset({"admin"}),
        "the requested deletion",
        mutating=True,
        read_only=False,
        needs_approval=True,
        handler="delete",
    ),
    ToolSpec(
        "analyse",
        "Compute verified aggregate metrics, comparisons, trends.",
        {
            "type": "object",
            "properties": {"scope": {"type": "string"}, "query": {"type": "string"}},
        },
        frozenset({"admin", "member"}),
        "deep analysis",
        handler="analyse",
    ),
    ToolSpec(
        "observe",
        "Detect current patterns, symptoms, predicted risks.",
        {"type": "object", "properties": {"query": {"type": "string"}}},
        frozenset({"admin", "member"}),
        "system observation",
        handler="observe",
    ),
    ToolSpec(
        "employee_directory",
        "List/find live employee records.",
        _q(),
        frozenset({"admin", "member", "viewer"}),
        "the employee directory",
        handler="specialist",
    ),
    ToolSpec(
        "candidate_pipeline",
        "List/find live candidate records.",
        _q(),
        frozenset({"admin", "member", "viewer"}),
        "the candidate pipeline",
        handler="specialist",
    ),
    ToolSpec(
        "workforce_analytics",
        "Verified headcount/sentiment/department metrics.",
        _q(),
        frozenset({"admin", "member"}),
        "workforce analytics",
        handler="specialist",
    ),
    ToolSpec(
        "workforce_risk",
        "Attrition and low-sentiment signals.",
        _q(),
        frozenset({"admin", "member"}),
        "a workforce-risk assessment",
        handler="specialist",
    ),
    ToolSpec(
        "skills_intelligence",
        "Skills coverage/gaps from live records.",
        _q(),
        frozenset({"admin", "member", "viewer"}),
        "skills intelligence",
        handler="specialist",
    ),
    ToolSpec(
        "integration_health",
        "Connections, sync logs, webhook health (secrets redacted).",
        _q(),
        frozenset({"admin", "member"}),
        "integration health",
        handler="specialist",
    ),
    ToolSpec(
        "check_connector_health",
        "Alias of integration_health.",
        _q(),
        frozenset({"admin", "member"}),
        "integration health",
        handler="specialist",
    ),
    ToolSpec(
        "data_quality_review",
        "Contracts, quarantine, completeness.",
        _q(),
        frozenset({"admin", "member"}),
        "a data-quality review",
        handler="specialist",
    ),
    ToolSpec(
        "governance_review",
        "Policies, approvals, release gates.",
        _q(),
        frozenset({"admin", "member"}),
        "a governance review",
        handler="specialist",
    ),
    ToolSpec(
        "forecast_planning",
        "Forecast scenarios, gold metrics, drift.",
        _q(),
        frozenset({"admin", "member"}),
        "forecast planning evidence",
        handler="specialist",
    ),
    ToolSpec(
        "intervention_review",
        "Active interventions + outcomes.",
        _q(),
        frozenset({"admin", "member"}),
        "workforce interventions",
        handler="specialist",
    ),
    ToolSpec(
        "export_report",
        "Generate CSV report of workforce/candidate/sentiment records.",
        {
            "type": "object",
            "properties": {
                "entity": {"type": "string"},
                "query": {"type": "string"},
                "limit": {"type": "integer", "minimum": 1, "maximum": 1000},
            },
        },
        frozenset({"admin"}),
        "report export",
        handler="export",
    ),
    ToolSpec(
        "safe_sql_query",
        "One admin-only tenant-scoped read-only SELECT. Use :tenant_id.",
        {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "limit": {"type": "integer", "minimum": 1, "maximum": 200},
            },
            "required": ["query"],
        },
        frozenset({"admin"}),
        "sandboxed SQL query",
        handler="sql",
    ),
    ToolSpec(
        "semantic_talent_search",
        "Dense vector search in Qdrant.",
        {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "limit": {"type": "integer", "minimum": 1, "maximum": 50},
            },
            "required": ["query"],
        },
        frozenset({"admin", "member"}),
        "semantic talent search in Qdrant",
        handler="semantic",
    ),
    ToolSpec(
        "sync_hris_connection",
        "Tenant-scoped HRIS/ATS sync (writes DB: admin-only).",
        {
            "type": "object",
            "properties": {"connection_id": {"type": "string"}},
            "required": ["connection_id"],
        },
        frozenset({"admin"}),
        "HRIS sync",
        mutating=True,
        read_only=False,
        handler="sync",
    ),
    # Action proposals: never execute directly; still need human approval downstream.
    ToolSpec(
        "create_requisition",
        "Propose ATS requisition.",
        {
            "type": "object",
            "properties": {
                "provider": {"type": "string"},
                "connection_id": {"type": "string"},
                "payload": {"type": "object"},
                "idempotency_key": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["provider", "connection_id", "payload", "idempotency_key"],
        },
        frozenset({"admin", "member"}),
        "requisition proposal",
        mutating=True,
        needs_approval=True,
        handler="action",
    ),
    ToolSpec(
        "move_candidate_stage",
        "Propose ATS stage move.",
        {
            "type": "object",
            "properties": {
                "provider": {"type": "string"},
                "connection_id": {"type": "string"},
                "payload": {"type": "object"},
                "idempotency_key": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["provider", "connection_id", "payload", "idempotency_key"],
        },
        frozenset({"admin", "member"}),
        "stage-move proposal",
        mutating=True,
        needs_approval=True,
        handler="action",
    ),
    ToolSpec(
        "schedule_interview",
        "Propose ATS interview.",
        {
            "type": "object",
            "properties": {
                "provider": {"type": "string"},
                "connection_id": {"type": "string"},
                "payload": {"type": "object"},
                "idempotency_key": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["provider", "connection_id", "payload", "idempotency_key"],
        },
        frozenset({"admin", "member"}),
        "interview proposal",
        mutating=True,
        needs_approval=True,
        handler="action",
    ),
    ToolSpec(
        "start_onboarding",
        "Propose onboarding when provider supports it.",
        {
            "type": "object",
            "properties": {
                "provider": {"type": "string"},
                "connection_id": {"type": "string"},
                "payload": {"type": "object"},
                "idempotency_key": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["provider", "connection_id", "payload", "idempotency_key"],
        },
        frozenset({"admin", "member"}),
        "onboarding proposal",
        mutating=True,
        needs_approval=True,
        handler="action",
    ),
    ToolSpec(
        "start_offboarding",
        "Propose offboarding when provider supports it.",
        {
            "type": "object",
            "properties": {
                "provider": {"type": "string"},
                "connection_id": {"type": "string"},
                "payload": {"type": "object"},
                "idempotency_key": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["provider", "connection_id", "payload", "idempotency_key"],
        },
        frozenset({"admin", "member"}),
        "offboarding proposal",
        mutating=True,
        needs_approval=True,
        handler="action",
    ),
    ToolSpec(
        "create_review_cycle",
        "Propose review cycle when provider supports it.",
        {
            "type": "object",
            "properties": {
                "provider": {"type": "string"},
                "connection_id": {"type": "string"},
                "payload": {"type": "object"},
                "idempotency_key": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["provider", "connection_id", "payload", "idempotency_key"],
        },
        frozenset({"admin", "member"}),
        "review-cycle proposal",
        mutating=True,
        needs_approval=True,
        handler="action",
    ),
    ToolSpec(
        "send_manager_notification",
        "Propose Slack/Teams manager notification.",
        {
            "type": "object",
            "properties": {
                "provider": {"type": "string"},
                "connection_id": {"type": "string"},
                "payload": {"type": "object"},
                "idempotency_key": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["provider", "connection_id", "payload", "idempotency_key"],
        },
        frozenset({"admin", "member"}),
        "notification proposal",
        mutating=True,
        needs_approval=True,
        handler="action",
    ),
    ToolSpec(
        "create_employee",
        "Propose creating employee in HRIS.",
        {
            "type": "object",
            "properties": {
                "provider": {"type": "string"},
                "connection_id": {"type": "string"},
                "payload": {"type": "object"},
                "idempotency_key": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["provider", "connection_id", "payload", "idempotency_key"],
        },
        frozenset({"admin", "member"}),
        "create-employee proposal",
        mutating=True,
        needs_approval=True,
        handler="action",
    ),
    ToolSpec(
        "update_employee",
        "Propose updating employee in HRIS.",
        {
            "type": "object",
            "properties": {
                "provider": {"type": "string"},
                "connection_id": {"type": "string"},
                "payload": {"type": "object"},
                "idempotency_key": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["provider", "connection_id", "payload", "idempotency_key"],
        },
        frozenset({"admin", "member"}),
        "update-employee proposal",
        mutating=True,
        needs_approval=True,
        handler="action",
    ),
    ToolSpec(
        "request_data_export",
        "Approval-gated tenant data-export request.",
        {
            "type": "object",
            "properties": {
                "scope": {"type": "string"},
                "region": {"type": "string"},
                "purpose": {"type": "string"},
                "payload": {"type": "object"},
                "idempotency_key": {"type": "string"},
            },
            "required": ["scope", "region", "purpose"],
        },
        frozenset({"admin"}),
        "data-export request",
        mutating=True,
        needs_approval=True,
        handler="export_request",
    ),
]

REGISTRY: dict[str, ToolSpec] = {s.name: s for s in _SPECS}

# Fail fast at import if a tool lacks metadata (prevents B1 drift).
for _s in _SPECS:
    if not (_s.name and _s.description and _s.handler):
        raise RuntimeError(f"ToolSpec incomplete: {_s}")

# Aliases resolved in one place (fixes A2 second half).
TOOL_ALIASES: dict[str, str] = {
    "check_connector_health": "integration_health",
    "analyze": "analyse",
}


def tool_schemas(role: str | None = None) -> list[dict]:
    """Generate OpenAI function schemas; filter by role for least-privilege (B9)."""
    out = []
    for spec in _SPECS:
        if role and role not in spec.roles:
            continue
        # Aliases share the canonical schema but are hidden from the model
        # to avoid duplicate function names.
        if spec.name in TOOL_ALIASES.values() and spec.name == "integration_health":
            pass
        if spec.name == "check_connector_health":
            continue
        out.append(
            {
                "type": "function",
                "function": {
                    "name": spec.name,
                    "description": spec.description,
                    "parameters": spec.schema,
                },
            }
        )
    return out


def agent_catalog() -> dict[str, str]:
    return {s.name: s.description for s in _SPECS if s.name != "check_connector_health"}


def tool_labels() -> dict[str, str]:
    return {s.name: (s.label or s.name) for s in _SPECS}
