"""Provider-neutral, auditable state for Aurelinx agent workflows.

The runtime deliberately separates an LLM's proposed next action from tool
execution.  This lets providers with native function calling use the supplied
schemas, while providers without it can fall back to the controller protocol
without weakening permissions, verification, or auditability.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "search",
            "description": "Find safe matching records across Aurelinx entities.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "entity": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 200},
                    "offset": {"type": "integer", "minimum": 0},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read",
            "description": "Read one safe record by its exact identifier.",
            "parameters": {
                "type": "object",
                "properties": {
                    "entity": {"type": "string"},
                    "identifier": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 50},
                },
                "required": ["entity", "identifier"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "analyse",
            "description": "Compute verified workforce, business, or operational analysis.",
            "parameters": {
                "type": "object",
                "properties": {
                    "scope": {"type": "string"},
                    "query": {"type": "string"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "observe",
            "description": "Detect current patterns, symptoms, and predicted risks.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "modify",
            "description": "Admin-only update of one exact record. Changes are verified after commit.",
            "parameters": {
                "type": "object",
                "properties": {
                    "entity": {"type": "string"},
                    "identifier": {"type": "string"},
                    "fields": {"type": "object"},
                },
                "required": ["entity", "identifier", "fields"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write",
            "description": "Admin-only creation of a new supported record.",
            "parameters": {
                "type": "object",
                "properties": {
                    "entity": {"type": "string"},
                    "data": {"type": "object"},
                },
                "required": ["entity", "data"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete",
            "description": "Prepare deletion of an exact record. It always requires human approval.",
            "parameters": {
                "type": "object",
                "properties": {
                    "entity": {"type": "string"},
                    "identifier": {"type": "string"},
                },
                "required": ["entity", "identifier"],
            },
        },
    },
]

# Domain functions are what the model sees.  The generic CRUD functions above
# remain available for exact record work; these functions give the model clear,
# HR-safe intent boundaries and return evidence from real Aurelinx tables.
_SPECIALIST_TOOLS = [
    (
        "employee_directory",
        "Search the employee directory by name, email, role, department, or skill context.",
    ),
    (
        "candidate_pipeline",
        "Search and assess the candidate pipeline by role, department, stage, or candidate details.",
    ),
    (
        "workforce_analytics",
        "Return verified headcount, sentiment, workforce, and department analytics.",
    ),
    (
        "workforce_risk",
        "Assess current attrition, sentiment, and workforce-risk signals from verified records.",
    ),
    (
        "skills_intelligence",
        "Find skills and identify workforce skill coverage or gaps from available records.",
    ),
    (
        "integration_health",
        "Inspect configured HR integrations, recent sync/log evidence, and webhook failures.",
    ),
    (
        "check_connector_health",
        "Check tenant-scoped connector connectivity, sync, and webhook health.",
    ),
    (
        "data_quality_review",
        "Review workforce data completeness, quarantined events, contracts, and pipeline quality signals.",
    ),
    (
        "governance_review",
        "Review compliance policies, audit-safe evidence, approvals, and AI governance controls.",
    ),
    (
        "forecast_planning",
        "Inspect workforce forecast scenarios, model governance, and available gold metrics.",
    ),
    (
        "intervention_review",
        "Review active workforce interventions and their recorded outcomes.",
    ),
    (
        "export_report",
        "Generate and export workforce, candidate, or sentiment records to a downloadable CSV report.",
    ),
    (
        "safe_sql_query",
        "Run one admin-only, tenant-scoped, read-only SQL query across approved workforce tables. Use :tenant_id as the bound tenant filter; never use DDL, DML, comments, or multiple statements.",
    ),
    (
        "semantic_talent_search",
        "Perform dense vector semantic search to match candidates against complex skill and domain concepts in Qdrant.",
    ),
]

_ACTION_TOOLS = [
    ("create_requisition", "Propose an approved ATS requisition/job creation."),
    (
        "move_candidate_stage",
        "Propose moving one candidate application to a new ATS stage.",
    ),
    ("schedule_interview", "Propose scheduling an interview in a connected ATS."),
    (
        "start_onboarding",
        "Propose onboarding only when a connected provider explicitly supports it.",
    ),
    (
        "start_offboarding",
        "Propose offboarding only when a connected provider explicitly supports it.",
    ),
    (
        "create_review_cycle",
        "Propose a review cycle only when a connected provider explicitly supports it.",
    ),
    (
        "send_manager_notification",
        "Propose an approved notification to a manager through Slack or Teams.",
    ),
    ("create_employee", "Propose creating an employee in a connected HRIS."),
    ("update_employee", "Propose updating an employee in a connected HRIS."),
]

TOOL_SCHEMAS.extend(
    {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Optional focus, role, department, or question.",
                    },
                    "limit": {"type": "integer", "minimum": 1, "maximum": 100},
                },
            },
        },
    }
    for name, description in _SPECIALIST_TOOLS
)
TOOL_SCHEMAS.append(
    {
        "type": "function",
        "function": {
            "name": "sync_hris_connection",
            "description": "Run a tenant-scoped synchronization through the existing governed sync pipeline.",
            "parameters": {
                "type": "object",
                "properties": {
                    "connection_id": {
                        "type": "string",
                        "description": "Tenant-scoped integration connection ID.",
                    }
                },
                "required": ["connection_id"],
            },
        },
    }
)
TOOL_SCHEMAS.extend(
    {
        "type": "function",
        "function": {
            "name": name,
            "description": description
            + " This only creates a reviewable proposal; it never executes directly.",
            "parameters": {
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
        },
    }
    for name, description in _ACTION_TOOLS
)
TOOL_SCHEMAS.append(
    {
        "type": "function",
        "function": {
            "name": "request_data_export",
            "description": "Request a tenant-scoped data export for human approval; never export data directly.",
            "parameters": {
                "type": "object",
                "properties": {
                    "scope": {"type": "string"},
                    "region": {"type": "string"},
                    "purpose": {"type": "string"},
                },
                "required": ["scope", "region", "purpose"],
            },
        },
    }
)


@dataclass
class AgentStep:
    sequence: int
    kind: str
    name: str
    status: str
    input: dict[str, Any] = field(default_factory=dict)
    evidence: Any = None
    error: str | None = None


@dataclass
class AgentExecutionState:
    request: str
    role: str
    max_steps: int = 10
    steps: list[AgentStep] = field(default_factory=list)
    assumptions: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    evidence_count: int = 0

    def add_step(
        self, kind: str, name: str, status: str = "running", **kwargs: Any
    ) -> AgentStep | None:
        # Enforce step budget; never count evidence here (only complete_tool may).
        if len(self.steps) >= self.max_steps:
            self.errors.append(f"Step budget exceeded (max {self.max_steps})")
            return None
        kwargs.pop("evidence", None)
        step = AgentStep(
            sequence=len(self.steps) + 1, kind=kind, name=name, status=status, **kwargs
        )
        self.steps.append(step)
        if step.error:
            self.errors.append(step.error)
        return step

    def complete_tool(self, step: AgentStep, result: dict[str, Any]) -> None:
        """Attach evidence exactly once; blocked results are NOT evidence."""
        if step.evidence is not None:
            return
        blocked = bool(result.get("blocked"))
        step.status = "blocked" if blocked else "completed"
        if not blocked:
            step.evidence = result
            self.evidence_count += 1
        else:
            step.error = str(result.get("reason") or "Tool blocked")
            self.errors.append(step.error)
        if step.name in {"modify", "write"} and not blocked:
            verified = bool(
                result.get("verified")
                or (result.get("result") or {}).get("verified")
                or (result.get("result") or {}).get("updated")
                or (result.get("result") or {}).get("created")
            )
            if not verified:
                self.errors.append(f"{step.name} completed without verification")

    def needs_verification(self, tool: str, result: dict[str, Any]) -> bool:
        return tool in {"modify", "write"} and not result.get("blocked")

    def evaluate(self) -> dict[str, Any]:
        completed_tools = [
            s.name for s in self.steps if s.kind == "tool" and s.status == "completed"
        ]
        blocked = [s.name for s in self.steps if s.status == "blocked"]
        unverified = [
            s.name
            for s in self.steps
            if s.name in {"modify", "write"}
            and s.status == "completed"
            and not (
                (s.evidence or {}).get("verified")
                or ((s.evidence or {}).get("result") or {}).get("verified")
                or ((s.evidence or {}).get("result") or {}).get("updated")
                or ((s.evidence or {}).get("result") or {}).get("created")
            )
        ]
        complete = not self.errors and not blocked and not unverified
        return {
            "complete": complete,
            "tool_calls": len(completed_tools),
            "blocked_tools": blocked,
            "unverified_mutations": unverified,
            "evidence_items": self.evidence_count,
            "assumptions": self.assumptions,
            "errors": self.errors,
            "next_action": "answer" if complete else "answer_with_limitations",
        }

    def public_trace(self) -> dict[str, Any]:
        # Counts + status only; never raw records.
        return {
            "task_graph": [
                {
                    "sequence": s.sequence,
                    "kind": s.kind,
                    "name": s.name,
                    "status": s.status,
                    "has_evidence": s.evidence is not None,
                    "error": s.error,
                }
                for s in self.steps
            ],
            "evaluation": self.evaluate(),
            "native_tool_schemas": [item["function"]["name"] for item in TOOL_SCHEMAS],
        }
