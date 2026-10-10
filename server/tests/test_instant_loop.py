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

"""Enterprise harness tests for the instant workflow loop (no provider I/O)."""

import asyncio
import json

from app.workflows.instant.event_buffer import InstantEventBuffer
from app.workflows.instant.instant_loop import (
    InstantDeps,
    InstantTurnRequest,
    stream_instant_turn,
)
from app.workflows.instant.lane_router import route_lane
from app.workflows.instant.prompt_assembly import (
    build_controller_system,
    manifest_cache_key,
    trim_tool_schemas,
)
from app.workflows.instant.tool_executor import (
    extract_native_calls,
    run_tools_parallel,
)


def _fake_emit(run_id, event_type, phase, message, **kw):
    """Mirror the real emit shape so shutdown-flush reconciliation keeps status/text."""
    return {
        "event_id": f"durable-{event_type}",
        "run_id": run_id,
        "type": event_type,
        "phase": phase,
        "status": kw.get("status", "running"),
        "display_message": message,
        "safe_input": kw.get("safe_input"),
        "result_summary": kw.get("result_summary"),
        "error_code": kw.get("error_code"),
        "duration_ms": kw.get("duration_ms"),
    }


# --- Lane router: only what is needed, when needed ---


def test_router_sends_greeting_to_L0_without_tools():
    decision = route_lane("hello")
    assert decision.lane == "L0"
    assert decision.tools == []
    assert decision.max_llm_calls == 1
    assert decision.needs_live_data is False


def test_router_sends_directory_lookup_to_L1():
    decision = route_lane("show all employees in the directory")
    assert decision.lane == "L1"
    assert "employee_directory" in decision.tools
    assert decision.max_llm_calls == 2


def test_router_sends_simple_employee_count_to_single_directory_tool():
    decision = route_lane("how many employees do I have")
    assert decision.lane == "L1"
    assert decision.tools == ["employee_directory"]
    assert decision.reason == "single employee count lookup"


def test_router_sends_combined_count_to_employee_and_candidate_tools():
    decision = route_lane("check how many candidates and employees I have")
    assert decision.lane == "L1"
    assert decision.tools == ["employee_directory", "candidate_pipeline"]
    assert decision.reason == "combined employee and candidate count lookup"


def test_router_sends_analytics_to_L2_with_parallel_tools():
    decision = route_lane("compare attrition vs sentiment by department")
    assert decision.lane == "L2"
    assert len(decision.tools) >= 1
    assert decision.max_llm_calls == 3


def test_router_sends_delete_and_export_to_governed_L3():
    assert route_lane("delete employee john@example.com").lane == "L3"
    assert route_lane("export employees to csv").lane == "L3"
    assert route_lane("create a new employee record").lane == "L3"


# --- Prompt assembly: stable prefix, deterministic order ---


def test_manifest_is_deterministic_and_lane_budgeted():
    schemas = [
        {
            "type": "function",
            "function": {
                "name": "b_tool",
                "description": "b",
                "parameters": {"type": "object", "properties": {}},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "a_tool",
                "description": "a",
                "parameters": {"type": "object", "properties": {}},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "c_tool",
                "description": "c",
                "parameters": {"type": "object", "properties": {}},
            },
        },
    ]
    first = trim_tool_schemas(schemas, ["c_tool", "a_tool"], "L1")
    second = trim_tool_schemas(schemas, ["a_tool", "c_tool"], "L1")
    assert [s["function"]["name"] for s in first] == [
        s["function"]["name"] for s in second
    ]
    # Lane-relevant tools come first in sorted order.
    assert first[0]["function"]["name"] == "a_tool"
    assert first[1]["function"]["name"] == "c_tool"
    # Unknown tools become stable stubs, never dropped silently.
    assert first[2]["function"]["name"] == "b_tool"
    assert first[2]["function"].get("defer_loading") is True


def test_controller_system_is_byte_stable_for_cache():
    a = build_controller_system(["b_tool", "a_tool"], [])
    b = build_controller_system(["a_tool", "b_tool"], [])
    assert a == b
    assert manifest_cache_key("L1", ["a_tool"], "groq", "m") == manifest_cache_key(
        "L1", ["a_tool"], "groq", "m"
    )


# --- Tool executor: parallel, ordered, fail-closed ---


def test_extract_native_calls_accepts_single_and_batch():
    single = extract_native_calls(
        {"action": "tool", "tool": "search", "arguments": {"query": "x"}}
    )
    assert single == [{"tool": "search", "arguments": {"query": "x"}}]
    batch = extract_native_calls(
        {
            "action": "tools",
            "calls": [
                {"tool": "search", "arguments": {}},
                {"tool": "read", "arguments": {}},
            ],
        }
    )
    assert [c["tool"] for c in batch] == ["search", "read"]


def test_parallel_tools_preserve_order_and_isolate_failures():
    def fake_execute(
        tool_name, arguments, user_text, user, session_id, mutation_state=None
    ):
        if tool_name == "boom":
            raise RuntimeError("db down")
        return {"tool": tool_name, "ok": True}

    calls = [
        {"tool": "b", "arguments": {}},
        {"tool": "boom", "arguments": {}},
        {"tool": "a", "arguments": {}},
    ]
    results = asyncio.run(
        run_tools_parallel(
            fake_execute, calls, user_text="q", current_user=object(), session_id="s"
        )
    )
    assert [r["tool"] for r in results] == ["b", "boom", "a"]
    assert results[1].get("blocked") is True
    assert results[0].get("ok") is True


# --- Event buffer: paint first, persist in background ---


def test_event_buffer_emits_fast_and_reconciles_durable():
    written: list[dict] = []

    def fake_emit(run_id, event_type, phase, message, **kwargs):
        written.append({"run_id": run_id, "type": event_type})
        return {
            "event_id": f"durable-{len(written)}",
            "run_id": run_id,
            "type": event_type,
            "status": kwargs.get("status", "running"),
            "display_message": message,
        }

    async def _run():
        buffer = InstantEventBuffer(
            "run-1",
            fake_emit,
            lambda *a, **k: None,
            flush_interval_s=0.01,
            flush_batch=10,
        )
        fast = buffer.emit_fast("workflow_started", "intake", "hi", status="completed")
        assert fast["event_id"].startswith("instant-")
        assert len(buffer.events) == 1
        await buffer.close()
        # Background flush reconciled the provisional frame with durable row.
        assert buffer.events[0]["event_id"].startswith("durable-")
        assert len(written) == 1
        return buffer

    buffer = asyncio.run(_run())
    assert buffer.pending_errors == []


# --- Instant loop: bounded provider calls, no sleeps on hot path ---


def _make_deps(answer_tokens, native_decision=None, tools=None):
    async def fake_native(**kwargs):
        return native_decision

    async def fake_stream(**kwargs):
        for token in answer_tokens:
            yield token

    def fake_execute(
        tool_name, arguments, user_text, user, session_id, mutation_state=None
    ):
        # NOTE: `tools` may be an empty (falsy) dict; never use `or {}` here.
        target = tools if tools is not None else {}
        target.setdefault("calls", []).append(tool_name)
        return {"tool": tool_name, "result": {"rows": [1, 2]}}

    def fake_parse(raw, request_text):
        try:
            payload = json.loads(raw) if isinstance(raw, str) else (raw or {})
        except Exception:
            payload = {}
        if isinstance(payload, dict) and payload.get("tool"):
            return {
                "action": "tool",
                "tool": payload["tool"],
                "arguments": payload.get("arguments", {}),
                "message": "go",
            }
        if isinstance(payload, dict) and payload.get("action") == "respond":
            return {"action": "respond", "message": "done"}
        return {"action": "invalid", "error": "empty"}

    return InstantDeps(
        native_decision=fake_native,
        llm_stream=fake_stream,
        execute_tool=fake_execute,
        parse_decision=fake_parse,
        resolve_api_key=lambda *a: "key",
        tool_schemas=[
            {
                "type": "function",
                "function": {
                    "name": "employee_directory",
                    "description": "d",
                    "parameters": {"type": "object", "properties": {}},
                },
            },
        ],
        agent_catalog={"employee_directory": "directory", "analyse": "analysis"},
        is_transient=lambda exc: False,
        sanitize_response=lambda text, req: text,
    ), (tools if tools is not None else {})


def _collect_frames(coro):
    async def _gather():
        frames = []
        async for frame in coro:
            frames.append(frame)
        return frames

    return asyncio.run(_gather())


def test_instant_L0_answers_with_single_provider_call():
    deps, _ = _make_deps(["Hello", " world"])
    lane = route_lane("hello")
    assert lane.lane == "L0"
    seen: list[dict] = []
    buffer = InstantEventBuffer(
        "run-L0",
        lambda *a, **k: seen.append(a) or {"event_id": "e", "type": a[1]},
        lambda *a, **k: None,
        flush_interval_s=1000,
        flush_batch=1000,
    )
    req = InstantTurnRequest(content="hello", session_id="s1", history=[])
    frames = _collect_frames(stream_instant_turn(deps, req, lane, "run-L0", buffer))
    chunks = [f for f in frames if "event: chunk" in f]
    # Content streams live (one frame per token); joined text is the answer.
    assert len(chunks) >= 1
    assert (
        "".join(json.loads(c.split("data:", 1)[1])["text"] for c in chunks)
        == "Hello world"
    )
    markers = [e for e in buffer.events if e.get("type") == "__assistant_text"]
    assert markers and markers[0]["text"] == "Hello world"
    assert markers[0]["llm_calls"] == 1  # exactly one provider call


def test_instant_L0_thinking_stays_in_banner_not_output():
    deps, _ = _make_deps(["<think>", "secret planning", "</think>", "Hello", " world"])
    lane = route_lane("hello")
    buffer = InstantEventBuffer(
        "run-think",
        _fake_emit,
        lambda *a, **k: None,
        flush_interval_s=1000,
        flush_batch=1000,
    )
    req = InstantTurnRequest(content="hello", session_id="s1", history=[])
    frames = _collect_frames(stream_instant_turn(deps, req, lane, "run-think", buffer))
    chunk_text = "".join(
        json.loads(f.split("data:", 1)[1])["text"]
        for f in frames
        if "event: chunk" in f
    )
    assert chunk_text == "Hello world"
    assert "secret planning" not in chunk_text
    markers = [e for e in buffer.events if e.get("type") == "__assistant_text"]
    assert markers and "secret planning" not in markers[0]["text"]
    cards = [e for e in buffer.events if e.get("type") == "model_reasoning"]
    assert cards and cards[0]["status"] == "completed"
    assert "secret planning" not in (cards[0].get("result_summary") or {}).get(
        "text", ""
    )
    deltas = [f for f in frames if "event: model_reasoning_delta" in f]
    assert deltas and '"text": ""' in "".join(deltas)


def test_instant_L0_handles_glued_thinking_markers():
    deps, _ = _make_deps(["<think>planning", " more</think>", "Hi"])
    lane = route_lane("hello")
    buffer = InstantEventBuffer(
        "run-glue",
        _fake_emit,
        lambda *a, **k: None,
        flush_interval_s=1000,
        flush_batch=1000,
    )
    req = InstantTurnRequest(content="hello", session_id="s1", history=[])
    frames = _collect_frames(stream_instant_turn(deps, req, lane, "run-glue", buffer))
    chunk_text = "".join(
        json.loads(f.split("data:", 1)[1])["text"]
        for f in frames
        if "event: chunk" in f
    )
    assert chunk_text == "Hi"
    assert "<think>" not in chunk_text and "</think>" not in chunk_text


def test_instant_L1_final_answer_keeps_thinking_out_of_output():
    calls: dict = {}
    deps, _ = _make_deps(
        ["<think>", "tool analysis", "</think>", "Here", " are", " employees"],
        native_decision=json.dumps(
            {
                "action": "tool",
                "tool": "employee_directory",
                "arguments": {"query": "all"},
            }
        ),
        tools=calls,
    )
    lane = route_lane("show all employees in the directory")
    buffer = InstantEventBuffer(
        "run-L1t",
        _fake_emit,
        lambda *a, **k: None,
        flush_interval_s=1000,
        flush_batch=1000,
    )
    req = InstantTurnRequest(
        content="show all employees in the directory", session_id="s1", history=[]
    )
    frames = _collect_frames(stream_instant_turn(deps, req, lane, "run-L1t", buffer))
    chunk_text = "".join(
        json.loads(f.split("data:", 1)[1])["text"]
        for f in frames
        if "event: chunk" in f
    )
    assert "tool analysis" not in chunk_text
    assert "Here are employees" in chunk_text
    cards = [e for e in buffer.events if e.get("type") == "model_reasoning"]
    assert cards and cards[0]["status"] == "completed"


def test_instant_L1_runs_single_native_call_then_parallel_tools():
    calls: dict = {}
    deps, _ = _make_deps(
        ["Here", " are", " employees"],
        native_decision=json.dumps(
            {
                "action": "tool",
                "tool": "employee_directory",
                "arguments": {"query": "all"},
            }
        ),
        tools=calls,
    )
    lane = route_lane("show all employees in the directory")
    assert lane.lane == "L1"
    buffer = InstantEventBuffer(
        "run-L1",
        _fake_emit,
        lambda *a, **k: None,
        flush_interval_s=1000,
        flush_batch=1000,
    )
    req = InstantTurnRequest(
        content="show all employees in the directory", session_id="s1", history=[]
    )
    frames = _collect_frames(stream_instant_turn(deps, req, lane, "run-L1", buffer))
    assert calls["calls"] == ["employee_directory"]
    markers = [e for e in buffer.events if e.get("type") == "__assistant_text"]
    assert markers and markers[0]["llm_calls"] == 2  # 1 native + 1 answer, never N+1
    assert markers[0]["lane"] == "L1"
    assert any("event: chunk" in f for f in frames)


def test_instant_L0_think_only_fallback():
    deps, _ = _make_deps(["<think>", "thinking about intern center", "</think>"])
    lane = route_lane("what is intern center we have")
    assert lane.lane == "L2"
    assert lane.needs_live_data is True
    buffer = InstantEventBuffer(
        "run-think-only",
        _fake_emit,
        lambda *a, **k: None,
        flush_interval_s=1000,
        flush_batch=1000,
    )
    req = InstantTurnRequest(
        content="what is intern center we have", session_id="s1", history=[]
    )
    frames = _collect_frames(
        stream_instant_turn(deps, req, lane, "run-think-only", buffer)
    )
    chunks = [f for f in frames if "event: chunk" in f]
    assert len(chunks) == 1
    text = json.loads(chunks[0].split("data:", 1)[1])["text"]
    assert text.strip()  # Must not be empty!
    assert "intern center" in text.lower() or "workspace" in text.lower()
