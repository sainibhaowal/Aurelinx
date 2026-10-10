# Copyright 2026 Ravinder Singh
# Licensed under the Apache License, Version 2.0 (the "License");
"""Risk proof: deterministic score + why + trend. No LLM, no migration.

Uses existing EmployeeTable + GoldMetricSnapshotTable only.
Score = 0.6*(1-sentiment) + 0.4*(1-retention) + 0.2 if is_at_risk, capped 0..1.
Why = top contributing drivers with human-readable reasons.
Trend = at_risk_pct velocity from recent gold snapshots.
"""

from __future__ import annotations

import json
from typing import Any


def risk_score(
    sentiment: float | None, retention: float | None, is_at_risk: bool
) -> float:
    s = float(sentiment if sentiment is not None else 0.5)
    r = float(retention if retention is not None else 0.5)
    score = (1.0 - s) * 0.6 + (1.0 - r) * 0.4
    if is_at_risk:
        score += 0.2
    return round(min(1.0, max(0.0, score)), 3)


def explain_employee(row: Any) -> dict[str, Any]:
    """Explain one employee row (EmployeeTable or dict). Pure function."""
    if isinstance(row, dict):
        sentiment = row.get("sentiment_score", 0.5)
        retention = row.get("retention_prob", 0.5)
        at_risk = bool(row.get("is_at_risk", False))
        name = row.get("full_name", "Unknown")
        dept = row.get("department", "General")
    else:
        sentiment = getattr(row, "sentiment_score", 0.5)
        retention = getattr(row, "retention_prob", 0.5)
        at_risk = bool(getattr(row, "is_at_risk", False))
        name = getattr(row, "full_name", "Unknown")
        dept = getattr(row, "department", "General")
    score = risk_score(sentiment, retention, at_risk)
    drivers: list[dict[str, Any]] = []
    s = float(sentiment if sentiment is not None else 0.5)
    r = float(retention if retention is not None else 0.5)
    if s < 0.4:
        drivers.append(
            {
                "driver": "low_sentiment",
                "weight": round((1.0 - s) * 0.6, 3),
                "reason": f"Sentiment {s:.2f} below 0.40 threshold",
            }
        )
    if r < 0.7:
        drivers.append(
            {
                "driver": "low_retention",
                "weight": round((1.0 - r) * 0.4, 3),
                "reason": f"Retention probability {r:.2f} below 0.70",
            }
        )
    if at_risk:
        drivers.append(
            {
                "driver": "flagged_at_risk",
                "weight": 0.2,
                "reason": "Explicitly flagged is_at_risk by HRIS/rules",
            }
        )
    drivers.sort(key=lambda d: -d["weight"])
    tier = (
        "critical"
        if score >= 0.7
        else "high" if score >= 0.5 else "medium" if score >= 0.3 else "low"
    )
    return {
        "name": name,
        "department": dept,
        "risk_score": score,
        "tier": tier,
        "drivers": drivers[:3],
        "sentiment": s,
        "retention": r,
        "is_at_risk": at_risk,
    }


def trend_velocity(snapshots: list[dict[str, Any]]) -> dict[str, Any]:
    """Velocity from gold metric snapshots (workforce payloads). Pure function."""
    pts: list[float] = []
    for s in snapshots[-6:]:
        try:
            payload = s.get("payload") if isinstance(s, dict) else None
            if isinstance(payload, str):
                payload = json.loads(payload)
            if isinstance(payload, dict) and "at_risk_pct" in payload:
                pts.append(float(payload["at_risk_pct"]))
        except Exception:
            continue
    if len(pts) < 2:
        return {"points": pts, "delta": 0.0, "direction": "stable"}
    delta = round(pts[-1] - pts[0], 2)
    direction = "rising" if delta > 0.5 else "falling" if delta < -0.5 else "stable"
    return {"points": pts, "delta": delta, "direction": direction}
