# Copyright 2026 Ravinder Singh
# Licensed under the Apache License, Version 2.0 (the "License");
"""Fixed execution state: single-count evidence, verification, safe trace."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

SENSITIVE_ARG_KEYS = {
    "api_key",
    "token",
    "secret",
    "password",
    "authorization",
    "payload",
    "fields",
    "data",
}


def _redact(args: Any) -> Any:
    if not isinstance(args, dict):
        return args
    return {
        k: ("[redacted]" if k.lower() in SENSITIVE_ARG_KEYS else v)
        for k, v in args.items()
    }


@dataclass
class AgentStep:
    sequence: int
    kind: str
    name: str
    status: str
    input: dict[str, Any] = field(default_factory=dict)
    evidence: Any = None
    error: str | None = None
    verified: bool = False


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
        """Enforce max_steps; never count evidence here (fixes A7)."""
        if len(self.steps) >= self.max_steps:
            self.errors.append(f"Step budget exceeded (max {self.max_steps})")
            return None
        kwargs.pop("evidence", None)  # only complete_tool may attach evidence
        step = AgentStep(
            sequence=len(self.steps) + 1, kind=kind, name=name, status=status, **kwargs
        )
        self.steps.append(step)
        if step.error:
            self.errors.append(step.error)
        return step

    def complete_tool(self, step: AgentStep, result: dict[str, Any]) -> None:
        """Attach evidence exactly once; blocked results are NOT evidence (A7)."""
        if step.evidence is not None:
            return  # already completed; never double-count
        blocked = bool(result.get("blocked"))
        step.status = "blocked" if blocked else "completed"
        if not blocked:
            step.evidence = result
            self.evidence_count += 1
        else:
            step.error = str(result.get("reason") or "Tool blocked")
            self.errors.append(step.error)
        # Verification wiring (fixes A8): modify/write must be verified.
        tool = step.name
        if tool in {"modify", "write"} and not blocked:
            verified = bool(
                result.get("verified")
                or (result.get("result") or {}).get("verified")
                or (result.get("result") or {}).get("updated")
                or (result.get("result") or {}).get("created")
            )
            step.verified = verified
            if not verified:
                self.errors.append(f"{tool} completed without verification")

    def evaluate(self) -> dict[str, Any]:
        completed = [
            s.name for s in self.steps if s.kind == "tool" and s.status == "completed"
        ]
        blocked = [s.name for s in self.steps if s.status == "blocked"]
        unverified = [
            s.name
            for s in self.steps
            if s.name in {"modify", "write"}
            and s.status == "completed"
            and not s.verified
        ]
        complete = not self.errors and not blocked and not unverified
        return {
            "complete": complete,
            "tool_calls": len(completed),
            "blocked_tools": blocked,
            "unverified_mutations": unverified,
            "evidence_items": self.evidence_count,
            "assumptions": self.assumptions,
            "errors": self.errors,
            "next_action": "answer" if complete else "answer_with_limitations",
        }

    def public_trace(self) -> dict[str, Any]:
        """Counts + status only; never raw records (fixes PII leak)."""
        return {
            "task_graph": [
                {
                    "sequence": s.sequence,
                    "kind": s.kind,
                    "name": s.name,
                    "status": s.status,
                    "input": _redact(s.input),
                    "has_evidence": s.evidence is not None,
                    "verified": s.verified,
                    "error": s.error,
                }
                for s in self.steps
            ],
            "evaluation": self.evaluate(),
        }
