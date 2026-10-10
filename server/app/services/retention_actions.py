# Copyright 2026 Ravinder Singh
# Licensed under the Apache License, Version 2.0 (the "License");
"""Close-loop builders: check-in, manager nudge, intervention draft.

Pure payload builders only. Nothing sends without a stored approval
(actions.py proposals + approvals inbox). No migration, no behavior change.
"""

from __future__ import annotations

import hashlib
from typing import Any


def checkin_task(employee: dict[str, Any]) -> dict[str, Any]:
    name = employee.get("full_name", "Unknown")
    dept = employee.get("department", "General")
    return {
        "title": f"Retention check-in: {name}",
        "target_scope": "employee",
        "target_employee": employee.get("email"),
        "target_department": dept,
        "priority": (
            "high" if float(employee.get("risk_score", 0) or 0) >= 0.7 else "medium"
        ),
        "description": f"Empathetic 1:1 within 48h. Drivers: {', '.join(d.get('driver','?') for d in employee.get('drivers', [])[:3]) or 'review sentiment'}",
    }


def manager_nudge(
    employee: dict[str, Any], connection_id: str, provider: str = "slack"
) -> dict[str, Any]:
    name = employee.get("full_name", "Unknown")
    text = (
        f"Hi — {name} ({employee.get('department','')}) shows elevated attrition risk "
        f"(score {employee.get('risk_score','?')}). Suggested: brief check-in this week. Reply DONE when complete."
    )
    payload = (
        {"text": text, "channel": "#people-ops"}
        if provider == "slack"
        else {"text": text}
    )
    key_src = f"{provider}:{connection_id}:{employee.get('email')}:{text[:80]}"
    return {
        "provider": provider,
        "connection_id": connection_id,
        "payload": payload,
        "action_type": "send_manager_notification",
        "idempotency_key": "nudge-" + hashlib.sha256(key_src.encode()).hexdigest()[:24],
        "reason": f"Retention nudge for {name}",
    }


def intervention_draft(
    employee: dict[str, Any], owner: str = "People Ops"
) -> dict[str, Any]:
    return {
        "title": f"Retain {employee.get('full_name','Unknown')} — {employee.get('tier','high')} risk",
        "target_scope": "employee",
        "target_department": employee.get("department"),
        "priority": "critical" if employee.get("tier") == "critical" else "high",
        "owner_name": owner,
        "description": "; ".join(
            d.get("reason", "") for d in employee.get("drivers", [])[:3]
        ),
        "expected_impact": "Reduce 90-day attrition risk via weekly check-ins + workload review",
    }
