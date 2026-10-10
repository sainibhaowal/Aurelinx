# Copyright 2026 Ravinder Singh
# Licensed under the Apache License, Version 2.0 (the "License");

"""ThreadState: compact conversational memory without token bloat.

Frontier rule: never resend full history or full tool dumps.
One small dict per session carries intent forward so bare follow-ups
("yes", "what about sales?") resolve to a self-contained query.
Derived from persisted chat history (no migration) + in-memory LRU.
"""

from __future__ import annotations

import re
import time
from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class ThreadState:
    last_user_text: str = ""
    last_intent: str = ""  # sentiment | directory | candidate | governance | chat
    last_lane: str = "L0"
    last_tools: list[str] = field(default_factory=list)
    dept_filter: str = ""
    pending_offer: str = ""
    updated_at: float = 0.0


_CACHE: dict[str, ThreadState] = {}
_CACHE_TTL_S = 30 * 60


_INTENT_PATTERNS = (
    (
        "sentiment",
        (
            "sentiment",
            "morale",
            "attrition",
            "retention",
            "burnout",
            "pulse",
            "risk",
            "trend",
        ),
    ),
    ("candidate", ("candidate", "applicant", "hiring", "recruit")),
    (
        "directory",
        (
            "employee",
            "staff",
            "directory",
            "roster",
            "people",
            "team",
            "who",
            "show",
            "list",
        ),
    ),
    (
        "governance",
        ("integration", "compliance", "policy", "governance", "audit", "intervention"),
    ),
)


def _intent_of(text: str) -> str:
    t = (text or "").lower()
    for intent, kws in _INTENT_PATTERNS:
        if any(k in t for k in kws):
            return intent
    return "chat" if len(t.split()) <= 2 else "directory"


def _dept_of(text: str) -> str:
    m = re.search(
        r"\b(?:in|for|of)\s+([a-zA-Z][a-zA-Z\s&\-\.]{2,40}?)(?:\s+team|\s+dept|\s+department|\?|$|,)",
        text or "",
        re.IGNORECASE,
    )
    if m:
        cand = m.group(1).strip().title()
        if len(cand.split()) <= 4 and cand.lower() not in {
            "our",
            "the system",
            "system",
            "our company",
        }:
            return cand
    return ""


def _last_user(history: list[dict[str, Any]] | None, skip: str = "") -> str:
    if not history:
        return ""
    cur = " ".join((skip or "").lower().split())
    for turn in reversed(history):
        try:
            if str(turn.get("role", "")).lower() != "user":
                continue
            c = str(turn.get("content", "") or "").strip()
            if not c or " ".join(c.lower().split()) == cur:
                continue
            return c
        except Exception:
            continue
    return ""


def load_threadstate(
    session_id: str, history: list[dict[str, Any]] | None
) -> ThreadState:
    """Build compact state from cache + persisted history. No I/O, <1ms."""
    now = time.time()
    cached = _CACHE.get(session_id or "")
    if cached and (now - cached.updated_at) < _CACHE_TTL_S:
        base = cached
    else:
        base = ThreadState()
    prev = _last_user(history or [])
    if not prev:
        return base
    intent = _intent_of(prev)
    dept = _dept_of(prev) or base.dept_filter
    return ThreadState(
        last_user_text=prev[:500],
        last_intent=intent,
        last_lane=base.last_lane,
        last_tools=list(base.last_tools),
        dept_filter=dept,
        pending_offer=base.pending_offer,
        updated_at=now,
    )


def save_threadstate(session_id: str, state: ThreadState) -> None:
    try:
        state.updated_at = time.time()
        _CACHE[session_id or ""] = state
        if len(_CACHE) > 2000:
            oldest = sorted(_CACHE.items(), key=lambda kv: kv[1].updated_at)[:500]
            for k, _ in oldest:
                _CACHE.pop(k, None)
    except Exception:
        pass


def resolve_with_state(
    user_text: str,
    history: list[dict[str, Any]] | None,
    state: ThreadState | None,
) -> str:
    """Resolve drill-downs + affirmations without an LLM call."""
    raw = (user_text or "").strip()
    compact = " ".join(raw.lower().split())
    if not compact:
        return raw
    prev = _last_user(history, raw) or (state.last_user_text if state else "")
    # Drill-down: "what about sales?" / "and for engineering?"
    m = re.match(r"^(what about|how about|and|also|then)\s+(.+?)\??$", compact)
    if (
        m
        and prev
        and state
        and state.last_intent in {"sentiment", "directory", "candidate"}
    ):
        target = m.group(2).strip()
        # bare dept name after prefix
        return f"{prev} filtered to {target}"
    return raw


def to_dict(state: ThreadState) -> dict[str, Any]:
    return asdict(state)
