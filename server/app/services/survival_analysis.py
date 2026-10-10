"""Descriptive Kaplan-Meier estimates for observed employment duration data."""

from __future__ import annotations

import math
from collections import defaultdict
from typing import Any


def kaplan_meier(observations: list[dict[str, Any]]) -> dict[str, Any]:
    """Return an event-time survival curve with Greenwood log-log 95% intervals.

    Each observation has ``duration_days`` and ``event`` (True for a recorded
    departure, False for right-censoring). This is a population description,
    not an employee-level forecast.
    """
    grouped: dict[float, dict[str, int]] = defaultdict(
        lambda: {"events": 0, "censored": 0}
    )
    eligible = 0
    departures = 0
    for row in observations:
        duration = row.get("duration_days")
        event = row.get("event")
        if (
            not isinstance(duration, (int, float))
            or not math.isfinite(duration)
            or duration <= 0
            or not isinstance(event, bool)
        ):
            continue
        months = round(float(duration) / 30.4375, 6)
        grouped[months]["events" if event else "censored"] += 1
        eligible += 1
        departures += int(event)

    if not grouped:
        return {"n": 0, "departures": 0, "censored": 0, "curve": []}

    at_risk = eligible
    survival = 1.0
    greenwood_sum = 0.0
    curve = []
    for month in sorted(grouped):
        events = grouped[month]["events"]
        censored = grouped[month]["censored"]
        risk_before = at_risk
        if events:
            survival *= 1.0 - events / risk_before
            if risk_before > events:
                greenwood_sum += events / (risk_before * (risk_before - events))
            elif survival == 0:
                greenwood_sum = math.inf
        lower, upper = survival, survival
        if 0 < survival < 1 and math.isfinite(greenwood_sum):
            standard_error = math.sqrt(greenwood_sum) / abs(math.log(survival))
            transformed = math.log(-math.log(survival))
            lower = math.exp(
                -math.exp(transformed + 1.959963984540054 * standard_error)
            )
            upper = math.exp(
                -math.exp(transformed - 1.959963984540054 * standard_error)
            )
        curve.append(
            {
                "tenure_month": month,
                "at_risk": risk_before,
                "departures": events,
                "censored": censored,
                "survival_probability": max(0.0, min(1.0, survival)),
                "ci_95_low": max(0.0, min(1.0, lower)),
                "ci_95_high": max(0.0, min(1.0, upper)),
            }
        )
        at_risk -= events + censored
    return {
        "n": eligible,
        "departures": departures,
        "censored": eligible - departures,
        "curve": curve,
        "estimator": "Kaplan-Meier product-limit estimate; Greenwood log-log 95% intervals",
    }
