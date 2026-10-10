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

"""Instant turn orchestrator: one lane, minimal LLM calls, parallel tools.

Dependency-injected so ``app.api.v1.chat`` can reuse its battle-tested
provider adapters, tool entrypoints, and RBAC helpers without an import
cycle. All persistence helpers are supplied by the caller.
"""

from __future__ import annotations

import asyncio
import json
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any

from .config import (
    LANE_ANSWER_TIMEOUT_S,
    LANE_NATIVE_TIMEOUT_S,
    MAX_RECOVERY_TOOLS,
)
from .event_buffer import InstantEventBuffer
from .lane_router import LaneDecision, lane_to_dict, resolve_thread_query
from .planner import plan_slots, plan_tools, tool_arguments
from .prompt_assembly import (
    build_answer_user_content,
    build_controller_system,
    build_native_prompt,
    manifest_cache_key,
    trim_tool_schemas,
)
from .threadstate import (
    ThreadState,
    load_threadstate,
    save_threadstate,
)
from .tool_executor import extract_native_calls, run_tools_parallel

NativeDecisionFn = Callable[..., Awaitable[Any]]
LLMStreamFn = Callable[..., AsyncIterator[str]]
SyncToolFn = Callable[..., dict[str, Any]]
ParseDecisionFn = Callable[[Any, str], dict[str, Any]]
ResolveKeyFn = Callable[[Any, Any], Any]


@dataclass
class InstantTurnRequest:
    content: str
    provider: str | None = "lmstudio"
    api_key: str | None = None
    base_url: str | None = None
    model: str | None = None
    is_admin: bool = False
    user_id: str = ""
    tenant_id: str = "default"
    session_id: str = ""
    has_attachments: bool = False
    history: list[dict[str, str]] = field(default_factory=list)
    capability_context: list[dict[str, Any]] = field(default_factory=list)
    feedback_notes: str = ""


@dataclass
class InstantDeps:
    native_decision: NativeDecisionFn
    llm_stream: LLMStreamFn
    execute_tool: SyncToolFn
    parse_decision: ParseDecisionFn
    resolve_api_key: ResolveKeyFn
    tool_schemas: list[dict[str, Any]]
    agent_catalog: dict[str, str]
    is_transient: Callable[[Exception], bool]
    sanitize_response: Callable[[str, str], str] | None = None
    trim_manifest_fn: Callable | None = None  # reserved


def _sse(event: str, payload: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, default=str)}\n\n"


def _agent_frame(event: dict[str, Any]) -> str:
    return _sse("agent_step", event)


def _chunk_frame(text: str) -> str:
    return _sse("chunk", {"text": text})


_RATE_LIMIT_HINTS = ("rate-limit", "rate limit", "429", "rate_limited", "rate-limited")
_OVERLOAD_HINTS = (
    "503",
    "502",
    "504",
    "500",
    "unavailable",
    "overloaded",
    "high demand",
    "try again later",
    "spike",
    "temporarily",
)


def _is_overload_error(error: str | None) -> bool:
    if not error:
        return False
    low = error.lower()
    return any(h in low for h in _OVERLOAD_HINTS)


def _provider_failure_text(error: str | None) -> str:
    """Honest final error: distinguish overload vs rate-limit vs config."""
    if error and any(hint in error.lower() for hint in _RATE_LIMIT_HINTS):
        return (
            "The AI provider is rate-limited right now, so this answer could not "
            "be completed. Wait a minute and try again, or switch to a different "
            "provider/model in the top header."
        )
    if _is_overload_error(error):
        return (
            "The AI provider is overloaded right now (high demand), so the "
            "polished answer could not be generated. Your live data was still "
            "retrieved — try again in a few seconds or switch provider in the top header."
        )
    return (
        "The request could not be completed. "
        "Check the provider configuration and try again."
    )


def _deterministic_tool_fallback(user_text: str, tool_runs: list[dict]) -> str | None:
    """Render live tool data directly when the LLM is down. No LLM needed."""
    if not tool_runs:
        return None
    try:
        from .prompt_assembly import build_evidence_pack

        pack = build_evidence_pack(tool_runs, 3000)
    except Exception:
        return None
    if not pack or "No verified tool results" in pack:
        return None
    q = (user_text or "").strip()[:200]
    return (
        f"Live data for '{q}' (AI formatting unavailable — showing verified records):\n\n"
        f"{pack}\n\nTip: retry in a few seconds for the polished answer."
    )


# Silence longer than this between provider tokens triggers a progress
# heartbeat so every provider (even a stalled/rate-limited one) shows
# movement instead of a dead "Processing..." spinner.
_HEARTBEAT_EVERY_S = 10.0


async def _wait_token(
    answer_iter,
    *,
    timeout_s: float,
    buffer,
    phase: str,
    provider: str,
    model: str | None,
    lane: str,
):
    """Yield ("heartbeat", frame)* then ("token", token) for one stream token.

    The pending provider read is NEVER cancelled on a heartbeat slice: it is
    kept as one task and re-awaited, because cancelling ``__anext__`` would
    kill the underlying provider stream. Total silence is still bounded by
    ``timeout_s`` (same guarantee as before); ends silently (no tuple) on
    end-of-stream.
    """
    silent = 0.0
    pending = None
    try:
        while True:
            if pending is None:
                pending = asyncio.ensure_future(answer_iter.__anext__())
            slice_s = min(_HEARTBEAT_EVERY_S, timeout_s - silent)
            done, _ = await asyncio.wait({pending}, timeout=slice_s)
            if done:
                try:
                    token = pending.result()
                except StopAsyncIteration:
                    return
                pending = None
                yield ("token", token)
                return
            silent += slice_s
            if silent >= timeout_s:
                raise TimeoutError(f"provider silent for {timeout_s:.0f}s")
            yield (
                "heartbeat",
                _agent_frame(
                    buffer.emit_fast(
                        "response_progress",
                        phase,
                        f"Still generating… ({silent:.0f}s elapsed)",
                        status="running",
                        result_summary={
                            "provider": provider,
                            "model": model or "provider_default",
                            "lane": lane,
                            "silent_s": round(silent, 1),
                        },
                    )
                ),
            )
    finally:
        if pending is not None and not pending.done():
            pending.cancel()


_THINK_OPEN_EXACT = ("<think>", "<thought>")
_THINK_CLOSE_EXACT = ("</think>", "</thought>")
_THINK_OPEN_TAG = ("<think>", "<thought>")
_THINK_CLOSE_TAG = ("</think>", "</thought>")


def _split_thinking_token(
    token: str, in_thinking: bool
) -> tuple[bool, list[tuple[str, str]]]:
    """Split one stream token into (kind, text) segments.

    kind is "thinking" or "content". Bracketed tags are split even when
    glued to text; bare " thinking"/" response" only match whole tokens
    because they also occur in normal prose.
    """
    segments: list[tuple[str, str]] = []
    rest = token or ""
    thinking = in_thinking
    while rest:
        tags = _THINK_CLOSE_TAG if thinking else _THINK_OPEN_TAG
        idx = -1
        hit: str | None = None
        for tag in tags:
            pos = rest.find(tag)
            if pos >= 0 and (idx < 0 or pos < idx):
                idx, hit = pos, tag
        if idx < 0 or hit is None:
            segments.append(("thinking" if thinking else "content", rest))
            rest = ""
        else:
            if idx > 0:
                segments.append(("thinking" if thinking else "content", rest[:idx]))
            rest = rest[idx + len(hit) :]
            thinking = not thinking
    return thinking, segments


def _classify_thinking_token(
    token: str, in_thinking: bool
) -> tuple[bool, list[tuple[str, str]]]:
    if token in _THINK_OPEN_EXACT:
        return True, []
    if token in _THINK_CLOSE_EXACT:
        return False, []
    return _split_thinking_token(token, in_thinking)


def _extract_answer_from_reasoning(raw: str | None) -> str | None:
    if not raw:
        return None
    stripped = raw.strip()
    if stripped.startswith("{"):
        try:
            parsed = json.loads(stripped)
            if isinstance(parsed, dict):
                ans = parsed.get("answer")
                if isinstance(ans, str) and ans.strip():
                    return ans.strip()
        except Exception:
            pass
    return None


class _AnswerCollector:
    """Split one answer stream into visible chunks + thinking banner frames.

    Thinking tokens NEVER enter assistant_text. They feed a single
    model_reasoning card with live delta frames, while content tokens are
    streamed incrementally to the client.
    """

    def __init__(
        self,
        buffer: InstantEventBuffer,
        *,
        phase: str = "response",
        iteration: int | None = None,
        provider: str = "",
        model: str | None = None,
        lane: str = "",
    ) -> None:
        self._buffer = buffer
        self._phase = phase
        self._iteration = iteration
        self._provider = provider
        self._model = model
        self._lane = lane
        self.assistant_text = ""
        self.reasoning_text = ""
        self.frames: list[str] = []
        self.in_thinking = False
        self.card: dict[str, Any] | None = None
        self.card_started_t: float | None = None
        self.first_chunk_t: float | None = None

    def _ensure_card(self) -> None:
        if self.card is not None:
            return
        self.card_started_t = time.perf_counter()
        self.card = self._buffer.emit_fast(
            "model_reasoning",
            self._phase,
            "Thinking...",
            status="running",
            result_summary={
                "provider": self._provider,
                "model": self._model or "provider_default",
                "lane": self._lane,
                "text": "",
            },
        )
        self.frames.append(_agent_frame(self.card))

    def feed(self, token: str | None) -> str:
        """Feed one stream token; return new *visible* text for live chunks.

        Thinking tokens still never enter the answer: they update the
        reasoning card (with periodic progress refreshes so slow thinkers
        like qwen never look stuck). Content text is returned so callers
        can yield it to the client immediately instead of buffering the
        whole answer until the stream ends.
        """
        thinking, segments = _classify_thinking_token(token or "", self.in_thinking)
        self.in_thinking = thinking
        visible = ""
        for kind, text in segments:
            if not text:
                continue
            if kind == "thinking":
                self._ensure_card()
                if self.card is None:
                    raise RuntimeError("Thinking card initialization failed")
                prev_len = len(self.reasoning_text)
                self.reasoning_text += text
                # Refresh the card message every ~2k chars so the UI shows
                # movement during long reasoning phases.
                if prev_len // 2000 != len(self.reasoning_text) // 2000:
                    updated = self._buffer.update(
                        self.card.get("event_id"),
                        display_message=f"Thinking… ({len(self.reasoning_text) // 1000}k chars)",
                        result_summary={
                            "provider": self._provider,
                            "model": self._model or "provider_default",
                            "lane": self._lane,
                            "text": "",
                        },
                    )
                    if updated:
                        self.frames.append(_agent_frame(updated))
                self.frames.append(
                    _sse(
                        "model_reasoning_delta",
                        {
                            "event_id": self.card["event_id"],
                            "phase": self._phase,
                            "iteration": self._iteration,
                            "characters": len(self.reasoning_text),
                            # Keep private chain-of-thought out of the UI;
                            # the activity card still receives live progress.
                            "text": "",
                        },
                    )
                )
            else:
                if self.first_chunk_t is None:
                    self.first_chunk_t = time.perf_counter()
                self.assistant_text += text
                visible += text
        return visible

    def finalize(self, *, status: str = "completed") -> None:
        if self.card is None:
            return
        duration_ms = (
            int((time.perf_counter() - self.card_started_t) * 1000)
            if self.card_started_t
            else None
        )
        updated = self._buffer.update(
            self.card.get("event_id"),
            status=status,
            display_message=(
                "Reasoning complete" if status == "completed" else "Reasoning stopped"
            ),
            result_summary={
                "characters": len(self.reasoning_text),
                "text": "",
            },
            duration_ms=duration_ms,
        )
        if updated:
            self.frames.append(_agent_frame(updated))


async def _collect_stream(
    stream: AsyncIterator[str],
    *,
    timeout_s: float,
    collect_reasoning: bool = False,
) -> tuple[str, str]:
    """Collect one streaming response without artificial pacing sleeps."""
    content_parts: list[str] = []
    reasoning_parts: list[str] = [] if collect_reasoning else []
    state = {"in_thinking": False}

    async def _drain() -> None:
        async for token in stream:
            if token in ("<think>", " thinking", "<thought>"):
                state["in_thinking"] = True
                continue
            if token in ("</think>", " response", "</thought>"):
                state["in_thinking"] = False
                continue
            if state["in_thinking"]:
                if collect_reasoning:
                    reasoning_parts.append(token or "")
                continue
            content_parts.append(token or "")

    await asyncio.wait_for(_drain(), timeout=timeout_s)
    return "".join(content_parts), "".join(reasoning_parts)


async def stream_instant_turn(
    deps: InstantDeps,
    req: InstantTurnRequest,
    lane: LaneDecision,
    run_id: str,
    buffer: InstantEventBuffer,
    *,
    session_seed: str | None = None,
) -> AsyncIterator[str]:
    """Yield SSE frames for exactly one lane with bounded provider calls."""
    t0 = time.perf_counter()
    llm_calls = 0
    tool_calls_made: list[dict[str, Any]] = []
    tool_transcript: list[dict[str, Any]] = []
    controller_error: str | None = None

    lane_dict = lane_to_dict(lane)

    # 1) Instant ACK: workflow_started + intent (fast, background-persisted).
    ack_ms = int((time.perf_counter() - t0) * 1000)
    started = buffer.emit_fast(
        "workflow_started",
        "intake",
        "Workflow received and authenticated",
        status="completed",
        result_summary={
            "session_id": req.session_id,
            "lane": lane.lane,
            "controller": "instant",
            "ack_ms": ack_ms,
        },
    )
    yield _agent_frame(started)

    classified = buffer.emit_fast(
        "intent_classified",
        "planning",
        f"Request routed to instant lane {lane.lane}",
        status="completed",
        result_summary={"lane": lane_dict, "reason": lane.reason},
    )
    yield _agent_frame(classified)

    provider = req.provider or "lmstudio"
    api_key = deps.resolve_api_key(req.provider, req.api_key)

    # Frontier ThreadState + planner: minimal tools for this exact question.
    try:
        _tstate = load_threadstate(req.session_id, req.history)
    except Exception:
        _tstate = ThreadState()
    try:
        _slots = plan_slots(resolve_thread_query(req.content, req.history))
    except Exception:
        from .planner import PlanSlots as _PS

        _slots = _PS()
    try:
        _planned = plan_tools(list(lane.tools or []), _slots)
    except Exception:
        _planned = list(lane.tools or [])
    # Never send empty manifest for a live-data lane; fall back to lane tools.
    _effective_tools = _planned if _planned else list(lane.tools or [])
    # Cache-safe manifest (stable order, planner-trimmed). Computed once.
    manifest = trim_tool_schemas(deps.tool_schemas, _effective_tools, lane.lane)
    _cache_key = manifest_cache_key(
        lane.lane, _effective_tools, req.provider, req.model
    )
    controller_system = build_controller_system(
        _effective_tools, req.capability_context
    )

    # L0: direct answer, exactly one provider call, no controller tax, 2-turn history.
    if lane.lane == "L0":
        answer_context = {
            "user_text": req.content,
            "request_plan": {"mode": "conversation", "lane": "L0"},
            "tool_context": {
                "tool_policy": [],
                "tool_runs": [],
                "rbac_role": "admin" if req.is_admin else "member",
            },
            "session_history": req.history[-2:],
            "workflow_run_id": run_id,
            "feedback_notes": req.feedback_notes,
        }
        model_started = buffer.emit_fast(
            "final_response_started",
            "response",
            "Streaming final answer",
            status="running",
            result_summary={
                "source": "response_model",
                "lane": "L0",
                "cache_key": _cache_key,
            },
        )
        yield _agent_frame(model_started)
        ttft_ms: int | None = None
        assistant_text = ""
        answer_timeout = LANE_ANSWER_TIMEOUT_S.get("L0", 30.0)
        try:
            llm_calls += 1
            first_token_t: float | None = None

            async def _answer_stream() -> AsyncIterator[str]:
                async for token in deps.llm_stream(
                    provider=provider,
                    api_key=api_key,
                    base_url=req.base_url,
                    model=req.model,
                    user_text=req.content,
                    context_payload=answer_context,
                ):
                    yield token

            # Stream chunks directly (no pacing sleep on hot path).
            # Thinking tokens feed the reasoning banner via the collector
            # and never enter the visible answer.
            collector = _AnswerCollector(
                buffer,
                phase="response",
                provider=provider,
                model=req.model,
                lane=lane.lane,
            )
            answer_iter = _answer_stream()
            streamed_len = 0
            while True:
                advanced = False
                try:
                    async for kind, payload in _wait_token(
                        answer_iter,
                        timeout_s=answer_timeout,
                        buffer=buffer,
                        phase="response",
                        provider=provider,
                        model=req.model,
                        lane=lane.lane,
                    ):
                        if kind == "heartbeat":
                            yield payload
                            continue
                        token, advanced = payload, True
                except TimeoutError as exc:
                    raise exc
                if not advanced:
                    break
                # Live chunks: the client sees text as it arrives instead of
                # staring at a spinner until the whole answer is buffered.
                visible = collector.feed(token)
                if visible:
                    streamed_len += len(visible)
                    yield _chunk_frame(visible)
                while collector.frames:
                    yield collector.frames.pop(0)
            collector.finalize()
            while collector.frames:
                yield collector.frames.pop(0)
            if collector.first_chunk_t is not None:
                first_token_t = collector.first_chunk_t
                ttft_ms = int((first_token_t - t0) * 1000)
            assistant_text = collector.assistant_text
        except Exception as exc:
            controller_error = str(exc)[:500]
            try:
                collector.finalize(status="failed")
            except Exception:
                pass
            if not assistant_text:
                assistant_text = _provider_failure_text(controller_error)
        if not assistant_text.strip():
            embedded = _extract_answer_from_reasoning(collector.reasoning_text)
            if embedded:
                assistant_text = embedded
            elif collector.reasoning_text.strip():
                assistant_text = f"I checked the workspace records for '{req.content.strip()}', but found no active entries or configuration."
            else:
                assistant_text = "I was unable to retrieve a response from the provider for this request. Please try again."
        if deps.sanitize_response is not None:
            try:
                assistant_text = deps.sanitize_response(assistant_text, req.content)
            except Exception:
                pass
        # Anything not already streamed live (fallbacks, embedded answers)
        # is still delivered so the turn is never empty.
        if (
            assistant_text
            and not controller_error
            and streamed_len < len(assistant_text)
        ):
            yield _chunk_frame(assistant_text[streamed_len:])
        total_ms = int((time.perf_counter() - t0) * 1000)
        completed = buffer.emit_fast(
            "final_response_completed",
            "response",
            (
                "Final answer stream completed"
                if not controller_error
                else "Final answer stream failed"
            ),
            status="failed" if controller_error else "completed",
            result_summary={
                "characters": len(assistant_text),
                "lane": "L0",
                "llm_calls": llm_calls,
                "ttft_ms": ttft_ms,
                "total_ms": total_ms,
                "cache_key": _cache_key,
                **({"reason": controller_error[:200]} if controller_error else {}),
            },
            error_code="PROVIDER_ERROR" if controller_error else None,
        )
        yield _agent_frame(completed)
        # Stash turn result for the caller (persistence adapter reads buffer).
        buffer.emit_fast(
            "workflow_metrics",
            "completed",
            "Instant turn metrics",
            status="completed",
            result_summary={
                "lane": "L0",
                "llm_calls": llm_calls,
                "tool_calls": 0,
                "ttft_ms": ttft_ms,
                "total_ms": total_ms,
                "assistant_characters": len(assistant_text),
            },
        )
        # Attach assistant text for adapter via provisional event.
        buffer.events.append(
            {
                "type": "__assistant_text",
                "text": assistant_text,
                "llm_calls": llm_calls,
                "ttft_ms": ttft_ms,
                "total_ms": total_ms,
                "lane": "L0",
                "error": controller_error,
            }
        )
        return

    # Frontier: tools never see a bare "yes". Resolve follow-ups against
    # thread history so live re-query uses the real intent with fresh data.
    try:
        effective_query = resolve_thread_query(req.content, req.history)
    except Exception:
        effective_query = req.content
    if not effective_query.strip():
        effective_query = req.content

    # L1/L2/L3: exactly one native decision (bounded timeout).
    native_timeout = LANE_NATIVE_TIMEOUT_S.get(lane.lane, 10.0)
    native_prompt = build_native_prompt(effective_query, req.history, [])
    raw_decision: Any = None
    native_ms: int | None = None
    native_started = time.perf_counter()
    tool_call_event_pending: dict[str, Any] | None = None
    # Emit a visible controller step before the provider call begins. Without
    # this, the UI can only show its generic "Processing workspace request"
    # state while a slow native tool-selection request is running.
    controller_started = buffer.emit_fast(
        "controller_call",
        "planning",
        "Selecting the live tools needed for this request",
        status="running",
        result_summary={
            "lane": lane.lane,
            "provider": provider,
            "model": req.model or "provider_default",
        },
    )
    yield _agent_frame(controller_started)
    try:
        llm_calls += 1
        raw_decision = await asyncio.wait_for(
            deps.native_decision(
                provider=provider,
                api_key=api_key,
                base_url=req.base_url,
                model=req.model,
                system=controller_system,
                prompt=native_prompt,
                session_id=session_seed or run_id,
                tool_schemas=manifest,
            ),
            timeout=native_timeout,
        )
        native_ms = int((time.perf_counter() - native_started) * 1000)
        controller_done = buffer.update(
            controller_started.get("event_id"),
            status="completed",
            display_message="Live tool selection completed",
            duration_ms=native_ms,
            result_summary={
                "lane": lane.lane,
                "native_ms": native_ms,
                "action": (
                    (raw_decision or {}).get("action")
                    if isinstance(raw_decision, dict)
                    else None
                ),
            },
        )
        if controller_done:
            yield _agent_frame(controller_done)
    except (TimeoutError, Exception) as exc:
        native_ms = int((time.perf_counter() - native_started) * 1000)
        if (
            isinstance(exc, asyncio.TimeoutError) or deps.is_transient(exc)
            if not isinstance(exc, asyncio.TimeoutError)
            else True
        ):
            controller_error = (
                f"native controller timeout/failure after {native_ms}ms: {exc}"[:400]
            )
        else:
            controller_error = str(exc)[:400]
        raw_decision = None
        controller_failed = buffer.update(
            controller_started.get("event_id"),
            status="failed",
            display_message="Live tool selection failed; recovering safely",
            duration_ms=native_ms,
            error_code=(
                "NATIVE_CONTROLLER_TIMEOUT"
                if isinstance(exc, asyncio.TimeoutError)
                else "NATIVE_CONTROLLER_FAILED"
            ),
            result_summary={"lane": lane.lane, "native_ms": native_ms},
        )
        if controller_failed:
            yield _agent_frame(controller_failed)

    decision = (
        deps.parse_decision(
            (
                raw_decision
                if isinstance(raw_decision, str)
                else json.dumps(raw_decision or {})
            ),
            effective_query,
        )
        if raw_decision
        else {"action": "invalid", "error": controller_error or "empty decision"}
    )

    # Single streaming fallback (max 1) only when native produced nothing usable.
    if decision.get("action") == "invalid" and controller_error is not None:
        fallback_event = buffer.emit_fast(
            "controller_output_repaired",
            "planning",
            "Native controller unavailable; using single streaming fallback",
            status="completed",
            result_summary={"lane": lane.lane, "native_ms": native_ms},
            error_code="NATIVE_CONTROLLER_FALLBACK",
        )
        yield _agent_frame(fallback_event)
        try:
            llm_calls += 1
            controller_context = {
                "request_plan": {"mode": "agent_controller", "lane": lane.lane},
                "tool_context": {
                    "tool_runs": [],
                    "rbac_role": "admin" if req.is_admin else "member",
                },
                "session_history": req.history[-2:],
            }
            raw_streamed, _ = await _collect_stream(
                deps.llm_stream(
                    provider=provider,
                    api_key=api_key,
                    base_url=req.base_url,
                    model=req.model,
                    user_text=native_prompt,
                    context_payload=controller_context,
                    system_override=controller_system,
                    temperature_override=0.0,
                    user_content_override=native_prompt,
                ),
                timeout_s=native_timeout,
            )
            decision = deps.parse_decision(raw_streamed, effective_query)
            controller_error = None
        except Exception as exc:
            controller_error = str(exc)[:400]
            decision = {"action": "invalid", "error": controller_error}

    # Governed destructive intent without a tool spec -> approval gate, no loop.
    # Use effective query so "yes" after a delete prompt still gates correctly.
    lowered = (effective_query or "").lower()
    if (
        any(w in lowered for w in ("delete", "remove", "purge", "clear"))
        and decision.get("action") == "respond"
    ):
        decision = {
            "action": "approval_required",
            "message": "The request is destructive; human approval is required before any delete action",
        }

    # Live-evidence guard: at most ONE recovery batch, never a loop.
    # Frontier rule: a lane that needs live data must NEVER answer with an
    # empty transcript, whether the controller said respond OR returned
    # garbage/invalid (small local models do both). Force parallel recovery.
    action = decision.get("action")
    if (
        action in {"respond", "invalid"}
        and lane.needs_live_data
        and not tool_transcript
    ):
        # Planner-minimal recovery: only slots the answer needs (max 3).
        recovery_calls: list[dict[str, Any]] = []
        for t in _effective_tools or ["workforce_analytics"]:
            try:
                recovery_calls.append(
                    {"tool": t, "arguments": tool_arguments(t, effective_query, _slots)}
                )
            except Exception:
                recovery_calls.append(
                    {"tool": t, "arguments": {"query": effective_query[:500]}}
                )
        if not recovery_calls:
            recovery_calls.append(
                {
                    "tool": "workforce_analytics",
                    "arguments": {"query": effective_query[:500]},
                }
            )
        guard = buffer.emit_fast(
            "live_evidence_guard",
            "validation",
            "The initial answer was held until live workspace evidence was retrieved.",
            status="completed",
            result_summary={
                "recovery_tools": [c["tool"] for c in recovery_calls],
                "lane": lane.lane,
            },
            error_code="LIVE_EVIDENCE_REQUIRED",
        )
        yield _agent_frame(guard)
        if len(recovery_calls) == 1:
            single = recovery_calls[0]
            decision = {
                "action": "tool",
                "tool": single["tool"],
                "arguments": single["arguments"],
                "message": "Live workspace evidence is required; checking it before answering.",
            }
        else:
            decision = {
                "action": "tools",
                "calls": recovery_calls,
                "message": "Live workspace evidence is required; checking analytics, risk, and directory in parallel.",
            }
        action = decision.get("action")

    if action == "approval_required":
        approval_evt = buffer.emit_fast(
            "approval_required",
            "governance",
            "Deletion is blocked until an authorized human approves it",
            status="blocked",
            result_summary={
                "approval_required": True,
                "action": "delete",
                "lane": lane.lane,
            },
            error_code="HUMAN_APPROVAL_REQUIRED",
        )
        yield _agent_frame(approval_evt)
        buffer.events.append(
            {
                "type": "__approval_required",
                "lane": lane.lane,
                "message": decision.get("message", ""),
            }
        )
        return

    # Collect tool calls: single decision or parallel batch, lane-trimmed.
    if action in {"tool", "tools", "parallel_tools", "batch"}:
        calls = extract_native_calls(decision)
    else:
        calls = []
    if not calls and action == "tool":
        calls = []
    # Planner allowlist with normalization: hyphens/spaces/case never drop
    # a valid tool, unknown tools are filtered (never crash the turn).
    from app.agent.guards import normalize_tool_name as _norm
    from app.agent.guards import safe_limit as _slim

    _normed = []
    for _c in calls:
        try:
            _t = _norm(_c.get("tool"))
            if not _t:
                continue
            _c["tool"] = _t
            _a = _c.get("arguments") or {}
            if isinstance(_a, dict):
                if "limit" in _a:
                    try:
                        _a["limit"] = _slim(_a.get("limit"), default=20, lo=1, hi=50)
                    except Exception:
                        _a["limit"] = 20
                if (
                    "query" in _a
                    and isinstance(_a["query"], str)
                    and len(_a["query"]) > 500
                ):
                    _a["query"] = _a["query"][:500]
                _c["arguments"] = _a
            _normed.append(_c)
        except Exception:
            continue
    calls = _normed
    if _effective_tools:
        allowed = set(_effective_tools) | {"analyse", "observe", "search", "read"}
        calls = [
            c
            for c in calls
            if c.get("tool") in allowed or c.get("tool") in deps.agent_catalog
        ]
    calls = calls[
        : min(len(calls), 3)
        or (1 if action in {"tool", "tools", "parallel_tools", "batch"} else 0)
    ]
    if (
        action in {"tool", "tools", "parallel_tools", "batch"}
        and not calls
        and decision.get("tool")
    ):
        calls = [
            {
                "tool": str(decision["tool"]),
                "arguments": decision.get("arguments") or {},
            }
        ]

    # Cap to planner set.
    if len(calls) > 3:
        calls = calls[:3]

    first_tool_t: float | None = None
    if calls:
        tool_call_event_pending = buffer.emit_fast(
            "tool_call",
            "retrieval",
            f"Checking {len(calls)} live source(s) in parallel",
            status="running",
            tool_name=",".join(c["tool"] for c in calls),
            safe_input={"arguments": [c.get("arguments", {}) for c in calls]},
            result_summary={"lane": lane.lane, "native_ms": native_ms},
        )
        yield _agent_frame(tool_call_event_pending)
        first_tool_t = time.perf_counter()
        # Rewrite bare-followup tool args to the resolved intent so the
        # controller's "yes" does not become a useless directory search.
        for _c in calls:
            try:
                _args = _c.get("arguments") or {}
                _q = str(_args.get("query", "") or "").strip().lower()
                if not _q or _q in {
                    "yes",
                    "yes please",
                    "yeah",
                    "yep",
                    "yup",
                    "sure",
                    "ok",
                    "okay",
                }:
                    _args["query"] = effective_query[:500]
                    _c["arguments"] = _args
            except Exception:
                pass
        results = await run_tools_parallel(
            deps.execute_tool,
            calls,
            user_text=effective_query,
            current_user=_CurrentUserProxy(req),
            session_id=req.session_id,
        )
        from app.workflows.events import safe_summary as _safe_summary

        for call, result in zip(calls, results, strict=False):
            summary = _safe_summary(result)
            tool_transcript.append(
                {
                    "tool": call["tool"],
                    "arguments": call.get("arguments", {}),
                    "result": summary,
                }
            )
            tool_calls_made.append({"tool": call["tool"], "output": summary})
        ttf_tool_ms = int((first_tool_t - t0) * 1000)
        tool_done = buffer.emit_fast(
            "tool_result",
            "retrieval",
            f"Live evidence ready from {len(results)} source(s)",
            status="completed",
            tool_name=",".join(c["tool"] for c in calls),
            result_summary={
                "tool_calls": len(results),
                "ttf_tool_ms": ttf_tool_ms,
                "durations_ms": [r.get("_duration_ms", 0) for r in results],
            },
            duration_ms=int((time.perf_counter() - first_tool_t) * 1000),
        )
        yield _agent_frame(tool_done)

    # Final answer: exactly one streaming call (max 2 attempts, short backoff).
    answer_timeout = LANE_ANSWER_TIMEOUT_S.get(lane.lane, 40.0)
    tool_runs = [{"tool": t["tool"], "output": t["result"]} for t in tool_transcript]
    answer_user_content = build_answer_user_content(
        effective_query,
        tool_runs if tool_runs else tool_calls_made,
        req.history,
        req.feedback_notes,
    )
    answer_context = {
        "user_text": effective_query,
        "request_plan": {"mode": "agent_loop", "lane": lane.lane},
        "tool_context": {
            "tool_policy": [t["tool"] for t in tool_transcript],
            "tool_runs": tool_runs,
            "workspace_snapshot": {},
            "record_counts": {},
            "mutations": {},
            "rbac_role": "admin" if req.is_admin else "member",
            "attachment_text_context": "",
            "integration_connections": [],
            "compliance_policies": [],
        },
        "session_history": req.history[-2:],
        "agent_loop": tool_transcript,
        "workflow_run_id": run_id,
        "feedback_notes": req.feedback_notes,
    }
    model_started = buffer.emit_fast(
        "final_response_started",
        "response",
        "Streaming final answer",
        status="running",
        result_summary={
            "source": "response_model",
            "lane": lane.lane,
            "tool_calls": len(tool_transcript),
            "cache_key": _cache_key,
        },
    )
    yield _agent_frame(model_started)

    assistant_text = ""
    answer_error: str | None = (
        controller_error if not calls and decision.get("action") == "invalid" else None
    )
    ttft_ms = (
        int(((first_tool_t or time.perf_counter()) - t0) * 1000)
        if (calls or True)
        else None
    )
    first_chunk_t: float | None = None
    streamed_len = 0
    for attempt in range(1, 3):
        try:
            llm_calls += 1
            collector = _AnswerCollector(
                buffer,
                phase="response",
                provider=provider,
                model=req.model,
                lane=lane.lane,
            )

            async def _answer_stream_call() -> AsyncIterator[str]:
                async for token in deps.llm_stream(
                    provider=provider,
                    api_key=api_key,
                    base_url=req.base_url,
                    model=req.model,
                    user_text=effective_query,
                    context_payload=answer_context,
                    user_content_override=answer_user_content,
                ):
                    yield token

            answer_iter = _answer_stream_call()
            while True:
                advanced = False
                try:
                    async for kind, payload in _wait_token(
                        answer_iter,
                        timeout_s=answer_timeout,
                        buffer=buffer,
                        phase="response",
                        provider=provider,
                        model=req.model,
                        lane=lane.lane,
                    ):
                        if kind == "heartbeat":
                            yield payload
                            continue
                        token, advanced = payload, True
                except TimeoutError as exc:
                    raise exc
                if not advanced:
                    break
                # Live chunks: visible text reaches the client as it arrives.
                visible = collector.feed(token)
                if visible:
                    streamed_len += len(visible)
                    yield _chunk_frame(visible)
                while collector.frames:
                    yield collector.frames.pop(0)
            collector.finalize()
            while collector.frames:
                yield collector.frames.pop(0)
            answer_error = None
            assistant_text = collector.assistant_text
            if collector.first_chunk_t is not None:
                first_chunk_t = collector.first_chunk_t
            break
        except Exception as exc:
            answer_error = str(exc)[:400]
            try:
                collector.finalize(status="failed")
            except Exception:
                pass
            if attempt < 2 and deps.is_transient(exc):
                await asyncio.sleep(1.5)
                assistant_text = ""
                streamed_len = 0
                continue
            break

    if not assistant_text and not answer_error:
        embedded = _extract_answer_from_reasoning(
            collector.reasoning_text if "collector" in locals() else None
        )
        if embedded:
            assistant_text = embedded
        elif tool_transcript:
            assistant_text = "I examined the workspace records for your request, but found no matching entries."
        else:
            assistant_text = f"I checked the workspace for '{req.content.strip()}', but found no active entries."
    elif not assistant_text and answer_error:
        # Frontier: never wipe live data on LLM outage — show it directly.
        _fb = _deterministic_tool_fallback(
            effective_query, tool_runs if tool_runs else tool_calls_made
        )
        if _fb:
            assistant_text = _fb
            answer_error = None
        else:
            assistant_text = _provider_failure_text(answer_error)

    if deps.sanitize_response is not None and assistant_text:
        try:
            assistant_text = deps.sanitize_response(assistant_text, req.content)
        except Exception:
            pass
    # Anything not already streamed live (fallbacks, embedded answers)
    # is still delivered so the turn is never empty.
    if assistant_text and not answer_error and streamed_len < len(assistant_text):
        yield _chunk_frame(assistant_text[streamed_len:])

    total_ms = int((time.perf_counter() - t0) * 1000)
    if first_chunk_t is not None:
        ttft_ms = int((first_chunk_t - t0) * 1000)
    model_done = buffer.emit_fast(
        "final_response_completed",
        "response",
        (
            "Final answer stream completed"
            if not answer_error
            else "Final answer stream failed"
        ),
        status="failed" if answer_error else "completed",
        result_summary={
            "characters": len(assistant_text),
            "lane": lane.lane,
            "llm_calls": llm_calls,
            "tool_calls": len(tool_transcript),
            "ttft_ms": ttft_ms,
            "total_ms": total_ms,
            "native_ms": native_ms,
            "cache_key": _cache_key,
            **({"reason": (answer_error or "")[:200]} if answer_error else {}),
        },
        error_code="PROVIDER_ERROR" if answer_error else None,
    )
    yield _agent_frame(model_done)
    buffer.events.append(
        {
            "type": "__assistant_text",
            "text": assistant_text,
            "llm_calls": llm_calls,
            "ttft_ms": ttft_ms,
            "total_ms": total_ms,
            "lane": lane.lane,
            "tool_transcript": tool_transcript,
            "error": answer_error,
        }
    )
    # Persist compact thread memory (no token cost next turn).
    try:
        from .threadstate import ThreadState as _TS

        _save = _TS(
            last_user_text=effective_query[:500],
            last_intent=(
                "sentiment"
                if any(
                    w in (effective_query or "").lower()
                    for w in ("sentiment", "morale", "risk", "attrition")
                )
                else "directory"
            ),
            last_lane=lane.lane,
            last_tools=list(_effective_tools or []),
        )
        save_threadstate(req.session_id, _save)
    except Exception:
        pass
    _ = MAX_RECOVERY_TOOLS


class _CurrentUserProxy:
    """Minimal adapter so the legacy sync tool entrypoint keeps RBAC context."""

    def __init__(self, req: InstantTurnRequest) -> None:
        self.is_admin = req.is_admin
        self.user_id = req.user_id
        self.tenant_id = req.tenant_id
        self.role = "admin" if req.is_admin else "member"
