# Copyright 2026 Ravinder Singh
# Licensed under the Apache License, Version 2.0 (the "License");

"""Planner: decide minimal slots + tools before any LLM call.

Frontier rule: 0 LLM for planning in 95% turns. Deterministic slots
choose 0-3 tools with projections so the model only sees what the
answer needs. No over-fetch, no over-send.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any


@dataclass
class PlanSlots:
    need_avg: bool = False
    need_breakdown: bool = False
    need_names: bool = False
    need_risk: bool = False
    need_candidates: bool = False
    need_governance: bool = False
    dept: str = ""
    limit: int = 20
    confidence: str = "high"


def plan_slots(query: str) -> PlanSlots:
    """Extract minimal answer needs from resolved query. No I/O."""
    t = " ".join((query or "").lower().split())
    s = PlanSlots()
    if not t:
        return s
    s.need_avg = bool(
        re.search(
            r"\b(avg|average|sentiment|morale|pulse|headcount|how (is|are)|overall)\b",
            t,
        )
    )
    s.need_breakdown = bool(
        re.search(
            r"\b(breakdown|by dept|by department|per department|compare|hotspot|which team|which dept)\b",
            t,
        )
    )
    s.need_names = bool(
        re.search(
            r"\b(who|names?|list|show|table|top \d+|struggling|lowest|highest)\b", t
        )
    )
    s.need_risk = bool(
        re.search(
            r"\b(risk|attrition|leaving|at-risk|at risk|retention|burnout|churn)\b", t
        )
    )
    s.need_candidates = bool(re.search(r"\b(candidate|applicant|hiring|recruit)\b", t))
    s.need_governance = bool(
        re.search(
            r"\b(integration|compliance|policy|governance|audit|intervention|sync)\b", t
        )
    )
    m = re.search(r"\btop\s+(\d{1,3})\b", t)
    if m:
        try:
            s.limit = max(1, min(50, int(m.group(1))))
        except Exception:
            pass
    dm = re.search(r"filtered to ([a-zA-Z][a-zA-Z\s&\-\.]{2,40})", t)
    if dm:
        s.dept = dm.group(1).strip().title()[:40]
    else:
        dm2 = re.search(
            r"\b(?:in|for|of)\s+([a-zA-Z][a-zA-Z\s&\-\.]{2,40}?)(?:\s+team|\s+dept|\s+department|\?|$)",
            query or "",
            re.IGNORECASE,
        )
        if dm2:
            cand = dm2.group(1).strip().title()
            if 1 <= len(cand.split()) <= 4:
                s.dept = cand
    # Sentiment question without explicit names still needs 5 names for table
    # only when user asked who/list; otherwise aggregates suffice (token lean).
    return s


def plan_tools(lane_tools: list[str], slots: PlanSlots) -> list[str]:
    """Trim lane tools to minimal set satisfying slots. Max 3."""
    if not lane_tools:
        return []
    wanted: list[str] = []
    has = set(lane_tools)

    def add(name: str) -> None:
        if name in has and name not in wanted:
            wanted.append(name)

    # Governance / candidates are exclusive fast paths
    if slots.need_governance:
        add("governance_review")
        return wanted[:3]
    if slots.need_candidates and not (
        slots.need_avg or slots.need_breakdown or slots.need_risk or slots.need_names
    ):
        add("candidate_pipeline")
        return wanted[:3]
    # Analytics needs
    if slots.need_avg or slots.need_breakdown:
        add("workforce_analytics")
    if slots.need_risk:
        # workforce_risk carries symptoms; analytics carries numbers
        add("workforce_risk")
        if not slots.need_avg and not slots.need_breakdown:
            add("workforce_analytics")
    if slots.need_names:
        add("employee_directory")
    # Fallbacks: keep lane intent with minimal cost
    if not wanted:
        for fallback in (
            "workforce_analytics",
            "employee_directory",
            "candidate_pipeline",
            "governance_review",
            "analyse",
        ):
            if fallback in has:
                wanted.append(fallback)
                break
    return wanted[:3]


def tool_arguments(tool: str, resolved_query: str, slots: PlanSlots) -> dict[str, Any]:
    """Minimal per-tool args: only what that tool needs."""
    base_q = (resolved_query or "")[:500]
    if tool == "workforce_analytics":
        args: dict[str, Any] = {"query": base_q}
        if slots.dept:
            args["dept"] = slots.dept
        if slots.need_breakdown:
            args["group_by"] = "department"
        return args
    if tool == "workforce_risk":
        return {"query": base_q}
    if tool == "employee_directory":
        return {"query": base_q, "limit": slots.limit if slots.limit else 20}
    if tool == "candidate_pipeline":
        return {"query": base_q, "limit": slots.limit if slots.limit else 20}
    return {"query": base_q}
