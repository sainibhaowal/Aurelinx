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

"""Parallel tool fan-out for the instant harness."""

from __future__ import annotations

import asyncio
import time
from collections.abc import Awaitable, Callable
from typing import Any

from .config import MAX_PARALLEL_TOOLS

# Sync legacy tool entrypoint signature:
#   (tool_name, arguments, user_text, current_user, session_id, mutation_state) -> dict
SyncToolFn = Callable[..., dict[str, Any]]


async def run_tools_parallel(
    execute_tool: SyncToolFn,
    calls: list[dict[str, Any]],
    *,
    user_text: str,
    current_user: Any,
    session_id: str,
    mutation_state: dict[str, Any] | None = None,
    limit: int = MAX_PARALLEL_TOOLS,
) -> list[dict[str, Any]]:
    """Execute independent tool calls concurrently, preserving order."""
    if not calls:
        return []

    semaphore = asyncio.Semaphore(max(1, min(limit, len(calls))))
    safe_mutation = dict(mutation_state or {})

    async def _one(index: int, call: dict[str, Any]) -> tuple[int, dict[str, Any]]:
        tool_name = str(call.get("tool") or "").strip()
        arguments = call.get("arguments") or {}
        if not isinstance(arguments, dict):
            arguments = {"query": str(arguments)[:2000]}
        started = time.perf_counter()
        try:
            async with semaphore:
                result = await asyncio.to_thread(
                    execute_tool,
                    tool_name,
                    arguments,
                    user_text,
                    current_user,
                    session_id,
                    safe_mutation,
                )
            if not isinstance(result, dict):
                result = {"tool": tool_name, "result": result}
        except Exception as exc:  # fail-closed per tool, never fail the turn
            result = {
                "tool": tool_name,
                "blocked": True,
                "reason": f"Tool execution failed: {exc}",
                "error_code": "TOOL_EXECUTION_FAILED",
            }
        result.setdefault("tool", tool_name)
        result["_duration_ms"] = int((time.perf_counter() - started) * 1000)
        return index, result

    ordered = await asyncio.gather(*(_one(i, call) for i, call in enumerate(calls)))
    ordered_sorted = sorted(ordered, key=lambda item: item[0])
    return [result for _, result in ordered_sorted]


def extract_native_calls(raw_decision: Any) -> list[dict[str, Any]]:
    """Accept one decision or a parallel batch; always return a list."""
    import json as _json

    if isinstance(raw_decision, str):
        try:
            raw_decision = _json.loads(raw_decision)
        except Exception:
            return []
    if isinstance(raw_decision, dict):
        # Batch shape: {"action": "tools", "calls": [...]}
        calls = raw_decision.get("calls")
        if isinstance(calls, list) and raw_decision.get("action") in {
            "tools",
            "parallel_tools",
            "batch",
        }:
            normalized: list[dict[str, Any]] = []
            for item in calls:
                if not isinstance(item, dict):
                    continue
                tool = str(item.get("tool") or "").strip()
                if not tool:
                    continue
                args = item.get("arguments") or item.get("args") or {}
                if not isinstance(args, dict):
                    args = {"query": str(args)[:2000]}
                normalized.append({"tool": tool, "arguments": args})
            return normalized[:MAX_PARALLEL_TOOLS]
        tool = str(raw_decision.get("tool") or "").strip()
        if raw_decision.get("action") == "tool" and tool:
            args = raw_decision.get("arguments") or raw_decision.get("args") or {}
            if not isinstance(args, dict):
                args = {"query": str(args)[:2000]}
            return [{"tool": tool, "arguments": args}]
    return []


AwaitableToolRunner = Callable[..., Awaitable[list[dict[str, Any]]]]
