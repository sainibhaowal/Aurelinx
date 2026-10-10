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

"""Deterministic sub-5ms lane router. No LLM calls.

Lanes:
  L0 chat        -> conversational, zero tools, one answer call.
  L1 single-tool -> one listing/lookup, one native call + one answer call.
  L2 multi-tool  -> analytics/compare/risk, one native call (parallel
                    tools) + one answer call, max 3 LLM calls total.
  L3 governed    -> any mutation/delete/export, same as L2 + approval gate.
"""

from __future__ import annotations

import difflib
import re
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class LaneDecision:
    lane: str  # L0 | L1 | L2 | L3
    tools: list[str] = field(default_factory=list)
    max_llm_calls: int = 1
    needs_live_data: bool = False
    reason: str = ""
    confidence: str = "high"


_GREETINGS = {
    "hi",
    "hello",
    "hey",
    "yo",
    "greetings",
    "good morning",
    "good afternoon",
    "good evening",
    "thanks",
    "thank you",
    "bye",
    "goodbye",
    "ok",
    "okay",
}

_DELETE_WORDS = ("delete", "remove", "purge", "clear", "destroy", "drop")
_MUTATION_WORDS = (
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
    "schedule",
    "propose",
)
_EXPORT_WORDS = ("export", "download", "csv", "excel", "spreadsheet", "report file")

_EMPLOYEE_HINTS = (
    "employee",
    "employees",
    "staff",
    "directory",
    "roster",
    "team member",
    "people",
    "worker",
    "employ",
)
_CANDIDATE_HINTS = (
    "candidate",
    "candidates",
    "applicant",
    "applicants",
    "hiring",
    "recruit",
    "talent scout",
    "candid",
    "applic",
)
_ANALYTICS_HINTS = (
    "analytic",
    "metric",
    "dashboard",
    "sentiment",
    "morale",
    "retention",
    "attrition",
    "risk",
    "burnout",
    "trend",
    "compare",
    "comparison",
    "forecast",
    "headcount",
)
_ENTERPRISE_HINTS = (
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
    "governance",
    "contract",
    "audit",
    # Intel center / intern center shorthand (users type both) maps to
    # governance + analytics so "what is intern center we have" gets tools.
    "intel center",
    "intel centre",
    "intern center",
    "intern centre",
    "intelligence",
    "intel",
    "center",
    "centre",
    "dashboard center",
)
_INTEL_CENTER_PHRASES = (
    "intern center",
    "intern centre",
    "intel center",
    "intel centre",
)
_DATA_VERBS = (
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
    "analyse",
    "compare",
    "rank",
    "top",
    "current",
    "live",
    "data",
    "records",
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


def _contains(text: str, words: tuple[str, ...]) -> bool:
    return any(w in text for w in words)


def _fuzzy_check(
    tokens: list[str], targets: tuple[str, ...], threshold: float = 0.65
) -> bool:
    for token in tokens:
        if len(token) < 4:
            continue
        for target in targets:
            if target in token or token in target:
                return True
            if difflib.SequenceMatcher(None, token, target).ratio() >= threshold:
                return True
    return False


_FOLLOWUP_AFFIRMATIVE = (
    "yes",
    "yes please",
    "yeah",
    "yep",
    "yup",
    "sure",
    "ok",
    "okay",
    "please do",
    "go ahead",
    "do it",
    "show me",
    "tell me",
    "break it down",
    "breakdown",
    "show breakdown",
    "give breakdown",
    "continue",
    "proceed",
    "please proceed",
    "sounds good",
)

_CONTINUATION_PREFIXES = (
    "and ",
    "also ",
    "then ",
    "what about",
    "how about",
    "for ",
    "in ",
    "by department",
    "per department",
)


def _is_bare_followup(text: str) -> bool:
    """Short affirmation / continuation with no new standalone intent."""
    compact = " ".join((text or "").lower().split())
    if not compact:
        return False
    if compact in _FOLLOWUP_AFFIRMATIVE:
        return True
    words = compact.split()
    # "yes, break it down", "yes show me by department", etc.
    if (
        words
        and words[0] in {"yes", "yeah", "yep", "yup", "sure", "ok", "okay"}
        and len(words) <= 6
    ):
        return True
    if len(words) <= 6 and any(
        p in compact
        for p in (
            "break it down",
            "breakdown",
            "show me",
            "tell me",
            "go ahead",
            "please do",
            "do it",
        )
    ):
        return True
    # Drill-down: "what about sales?", "and engineering?", "for sales?"
    if (
        re.match(r"^(what about|how about|and|also|then)\s+.+", compact)
        and len(words) <= 6
    ):
        return True
    if re.match(r"^(for|in)\s+[a-z][a-z\s&\-]{2,30}\??$", compact):
        return True
    return False


def _last_user_text(history: list[dict[str, Any]] | None, current: str) -> str:
    """Most recent user turn before the current message (history-aware)."""
    if not history:
        return ""
    cur = " ".join((current or "").lower().split())
    for turn in reversed(history):
        try:
            if str(turn.get("role", "")).lower() != "user":
                continue
            content = str(turn.get("content", "") or "").strip()
            if not content:
                continue
            if " ".join(content.lower().split()) == cur:
                continue
            return content
        except Exception:
            continue
    return ""


def resolve_thread_query(
    user_text: str,
    history: list[dict[str, Any]] | None = None,
) -> str:
    """Expand bare follow-ups + drill-downs into a self-contained query.

    Frontier rule: tools never receive a bare "yes". They receive the
    last real user intent plus the follow-up confirmation, so live
    re-query returns fresh numbers instead of stale text.
    """
    raw = (user_text or "").strip()
    compact = " ".join(raw.lower().split())
    if not _is_bare_followup(raw):
        return raw
    prev = _last_user_text(history, raw)
    if not prev:
        return raw
    # Drill-down keeps parent intent with new filter (token-lean, no LLM)
    m = re.match(r"^(what about|how about|and|also|then)\s+(.+?)\??$", compact)
    if m:
        target = m.group(2).strip()
        return f"{prev} filtered to {target}"
    m2 = re.match(r"^(for|in)\s+([a-z][a-z\s&\-]{2,30})\??$", compact)
    if m2:
        return f"{prev} filtered to {m2.group(2).strip()}"
    return f"{prev} (follow-up confirmed: {raw})"


def route_lane(
    user_text: str,
    *,
    has_attachments: bool = False,
    is_admin: bool = False,  # reserved for future RBAC-aware routing
    history: list[dict[str, Any]] | None = None,
) -> LaneDecision:
    """Route a prompt to exactly one lane without any I/O.

    History-aware: a bare follow-up ("yes please", "break it down")
    inherits the previous turn's lane/tools so the agent re-queries
    live data instead of falling back to tool-less chit-chat.
    """
    raw = (user_text or "").strip()
    direct = _route_single(raw, has_attachments=has_attachments, is_admin=is_admin)
    # Explicit intent always wins over history.
    if direct.needs_live_data:
        return direct
    # Only tool-less L0 decisions are eligible for continuation.
    if direct.lane == "L0" and history:
        if _is_bare_followup(raw):
            prev = _last_user_text(history, raw)
            if prev:
                prev_decision = _route_single(prev)
                if prev_decision.needs_live_data:
                    return LaneDecision(
                        lane=prev_decision.lane,
                        tools=list(prev_decision.tools),
                        max_llm_calls=prev_decision.max_llm_calls,
                        needs_live_data=True,
                        reason=f"follow-up continuation of: {prev_decision.reason}",
                        confidence="medium",
                    )
    return direct


def _route_single(
    user_text: str,
    *,
    has_attachments: bool = False,
    is_admin: bool = False,
) -> LaneDecision:
    raw = (user_text or "").strip()
    text = raw.lower()
    text = re.sub(r"\bho\s+w\s*many\b", "how many", text)
    text = re.sub(r"\bhowmany\b", "how many", text)
    tokens = re.findall(r"[a-z]+", text)

    if not text:
        return LaneDecision(lane="L0", max_llm_calls=1, reason="empty prompt")

    # Attachments always need at least the single-tool lane.
    if has_attachments:
        return LaneDecision(
            lane="L1",
            tools=["employee_directory"],
            max_llm_calls=2,
            needs_live_data=True,
            reason="attachment context required",
        )

    # Exact greetings / very short chit-chat -> L0.
    compact = " ".join(text.split())
    if compact in _GREETINGS or (
        len(compact.split()) <= 2 and not _contains(compact, _DATA_VERBS)
    ):
        if not _contains(
            compact, _EMPLOYEE_HINTS + _CANDIDATE_HINTS + _ANALYTICS_HINTS
        ):
            return LaneDecision(lane="L0", max_llm_calls=1, reason="chit-chat")

    is_delete = _contains(text, _DELETE_WORDS)
    is_mutation = _contains(text, _MUTATION_WORDS)
    is_export = _contains(text, _EXPORT_WORDS)

    if is_delete or is_export or (is_mutation and len(text.split()) > 1):
        return LaneDecision(
            lane="L3",
            tools=["employee_directory", "candidate_pipeline", "analyse"],
            max_llm_calls=3,
            needs_live_data=True,
            reason="governed mutation/delete/export",
        )

    mentions_employee = _contains(text, _EMPLOYEE_HINTS) or _fuzzy_check(
        tokens,
        (
            "employee",
            "employees",
            "workforce",
            "directory",
            "staff",
            "directry",
            "employe",
        ),
    )
    mentions_candidate = _contains(text, _CANDIDATE_HINTS) or _fuzzy_check(
        tokens,
        (
            "candidate",
            "candidates",
            "applicant",
            "applicants",
            "candid",
            "condaidate",
            "candiate",
        ),
    )
    mentions_analytics = _contains(text, _ANALYTICS_HINTS) or _fuzzy_check(
        tokens,
        ("analytics", "sentiment", "morale", "retention", "attrition", "risk", "trend"),
    )
    mentions_enterprise = _contains(text, _ENTERPRISE_HINTS) or _fuzzy_check(
        tokens,
        (
            "integration",
            "compliance",
            "policy",
            "governance",
            "intelligence",
            "centre",
            "center",
        ),
    )
    asks_data = _contains(text, _DATA_VERBS)
    # "what is X we have" / "check about X" is a workspace lookup even without
    # a classic data verb match (typos like "cehck", "ho wmuch" included).
    is_intel_center = _contains(text, _INTEL_CENTER_PHRASES)
    has_workspace_possessive = any(
        p in text
        for p in (
            "we have",
            "we got",
            "in our",
            "in the system",
            "in system",
            "do we have",
        )
    )
    fuzzy_data_verb = _fuzzy_check(
        tokens, ("check", "about", "show", "list", "what", "how", "which", "tell")
    )

    # A count is a narrow directory lookup, not an analytics request. Keeping
    # it in L1 avoids extra analytics/risk passes for simple questions.
    is_count = (
        _contains(
            text, ("how many", "count", "total number", "number of", "total count")
        )
        or ("count" in text)
        or ("many" in text and ("how" in text or "ho" in text))
    )
    if is_count and mentions_employee and mentions_candidate:
        return LaneDecision(
            lane="L1",
            tools=["employee_directory", "candidate_pipeline"],
            max_llm_calls=2,
            needs_live_data=True,
            reason="combined employee and candidate count lookup",
        )
    if is_count and mentions_employee and not mentions_candidate:
        return LaneDecision(
            lane="L1",
            tools=["employee_directory"],
            max_llm_calls=2,
            needs_live_data=True,
            reason="single employee count lookup",
        )
    if is_count and mentions_candidate and not mentions_employee:
        return LaneDecision(
            lane="L1",
            tools=["candidate_pipeline"],
            max_llm_calls=2,
            needs_live_data=True,
            reason="single candidate count lookup",
        )

    analytics_request = (
        mentions_analytics
        or (mentions_enterprise and asks_data)
        or ("how many" in text or "count" in text or "compare" in text)
    )

    if analytics_request or mentions_analytics:
        # Frontier behavior: sentiment/analytics questions need numbers AND
        # people. workforce_analytics gives aggregates, workforce_risk gives
        # at-risk signals, employee_directory gives rows for the table.
        # A single-tool lane would force the answer model to invent a table
        # from aggregates alone, which is exactly the failure users saw.
        tools = ["workforce_analytics", "workforce_risk", "safe_sql_query"]
        lowered = text
        wants_people = mentions_employee or any(
            w in lowered
            for w in (
                "sentiment",
                "morale",
                "retention",
                "attrition",
                "risk",
                "burnout",
                "pulse",
                "table",
                "who",
                "show",
                "list",
                "check",
            )
        )
        if wants_people:
            tools.append("employee_directory")
        if mentions_candidate:
            tools.append("candidate_pipeline")
        if mentions_enterprise:
            tools.append("governance_review")
        # Preserve order, drop duplicates.
        seen: set[str] = set()
        ordered: list[str] = []
        for t in tools:
            if t not in seen:
                seen.add(t)
                ordered.append(t)
        return LaneDecision(
            lane="L2",
            tools=ordered,
            max_llm_calls=3,
            needs_live_data=True,
            reason="analytics request",
        )

    if (mentions_employee or mentions_candidate) and (
        asks_data or len(text.split()) > 2
    ):
        tool = (
            "candidate_pipeline"
            if mentions_candidate and not mentions_employee
            else "employee_directory"
        )
        # Both mentioned -> allow both in one parallel native call.
        tools = (
            ["employee_directory", "candidate_pipeline"]
            if (mentions_employee and mentions_candidate)
            else [tool]
        )
        return LaneDecision(
            lane="L1",
            tools=tools,
            max_llm_calls=2,
            needs_live_data=True,
            reason="single directory/pipeline lookup",
        )

    if mentions_enterprise and len(text.split()) > 2:
        return LaneDecision(
            lane="L1",
            tools=["governance_review"],
            max_llm_calls=2,
            needs_live_data=True,
            reason="single governance lookup",
        )

    if is_intel_center:
        # Intel/intern center = intelligence + governance overview with live data.
        return LaneDecision(
            lane="L2",
            tools=["workforce_analytics", "governance_review", "employee_directory"],
            max_llm_calls=3,
            needs_live_data=True,
            reason="intel center overview",
        )

    # Frontier fallback: broad workspace questions ("what ... we have",
    # "check about ...", ended/terminated lookups with typos) must get live
    # tools instead of a tool-less L0 "I don't have data" answer.
    if (has_workspace_possessive or fuzzy_data_verb) and len(text.split()) >= 3:
        return LaneDecision(
            lane="L1",
            tools=["employee_directory", "candidate_pipeline"],
            max_llm_calls=2,
            needs_live_data=True,
            reason="broad workspace lookup fallback",
        )

    # Default: conversation. No tools, no controller tax.
    return LaneDecision(lane="L0", max_llm_calls=1, reason="general conversation")


def lane_to_dict(decision: LaneDecision) -> dict[str, Any]:
    return {
        "lane": decision.lane,
        "tools": list(decision.tools),
        "max_llm_calls": decision.max_llm_calls,
        "needs_live_data": decision.needs_live_data,
        "reason": decision.reason,
        "confidence": decision.confidence,
    }
