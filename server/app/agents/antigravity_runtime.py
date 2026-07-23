"""Safe Antigravity runtime bridge for Aurelinx workflow chat.

This module owns the model/runtime boundary. Aurelinx keeps ownership of
authentication, authorization, database access, approvals, persistence, and
the browser SSE contract. Antigravity supplies the real agent loop and native
Thought/Text/ToolCall events.
"""

from __future__ import annotations

import asyncio
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, AsyncIterator, Callable, Dict, Optional

from app.core.provider_utils import normalize_local_provider_base


@dataclass
class AntigravityRuntimeEvent:
    """One native runtime event forwarded to the Aurelinx SSE adapter."""

    kind: str
    value: Any = None


_SESSION_LOCKS: dict[str, asyncio.Lock] = {}


def _session_lock(session_id: str) -> asyncio.Lock:
    lock = _SESSION_LOCKS.get(str(session_id))
    if lock is None:
        lock = asyncio.Lock()
        _SESSION_LOCKS[str(session_id)] = lock
    return lock


def _state_directory() -> Path:
    configured = os.getenv("ANTIGRAVITY_STATE_DIR")
    if configured:
        path = Path(configured).expanduser().resolve()
    else:
        path = Path(tempfile.gettempdir()) / "aurelinx-antigravity"
    path.mkdir(parents=True, exist_ok=True)
    (path / "app-data").mkdir(parents=True, exist_ok=True)
    return path


def _make_tools(
    *,
    user_text: str,
    current_user: Any,
    session_id: str,
    result_buffer: list[dict[str, Any]],
    mutation_state: dict[str, Any],
    has_attachments: bool,
) -> list[Callable[..., Any]]:
    """Build request-scoped tools with the authenticated user captured.

    The SDK only sees public query arguments. It never receives a database
    session, user token, or arbitrary filesystem path from the model.
    """

    # Imported lazily to avoid a chat.py ↔ runtime.py import cycle. This helper
    # remains the single Aurelinx authorization/database implementation while
    # the Antigravity runtime owns the model loop.
    from app.api.v1.chat import _execute_agent_tool

    def invoke(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        result = _execute_agent_tool(
            tool_name,
            arguments,
            user_text,
            current_user,
            session_id,
            mutation_state,
        )
        if tool_name == "data.mutate" and isinstance(result.get("result"), dict):
            mutation_state.clear()
            mutation_state.update(result["result"])
        elif tool_name == "data.verify" and isinstance(result.get("result"), dict):
            mutation_state["verification"] = result["result"]
        result_buffer.append({"tool": tool_name, "result": result})
        return result

    def employee_search(query: str, limit: int = 8) -> Dict[str, Any]:
        """Search verified employee records. Read-only."""
        return invoke(
            "employee.search",
            {"query": str(query)[:12000], "limit": max(1, min(int(limit), 20))},
        )

    def candidate_search(query: str, limit: int = 8) -> Dict[str, Any]:
        """Search verified candidate records. Read-only."""
        return invoke(
            "candidate.search",
            {"query": str(query)[:12000], "limit": max(1, min(int(limit), 20))},
        )

    def database_overview() -> Dict[str, Any]:
        """Count verified Aurelinx records. Read-only."""
        return invoke("database.overview", {})

    def dashboard_snapshot() -> Dict[str, Any]:
        """Calculate current workforce analytics. Read-only."""
        return invoke("dashboard.snapshot", {})

    def workspace_snapshot(query: str) -> Dict[str, Any]:
        """Retrieve verified workspace context for the request. Read-only."""
        return invoke("workspace.snapshot", {"query": str(query)[:12000]})

    def document_csv_ingest() -> Dict[str, Any]:
        """Parse and validate the CSV attached to this chat session."""
        return invoke("document.csv_ingest", {})

    tools: list[Callable[..., Any]] = [
        employee_search,
        candidate_search,
        database_overview,
        dashboard_snapshot,
        workspace_snapshot,
    ]

    # Attachment ingestion is exposed only when the request actually has an
    # attachment; the backend helper performs the final attachment lookup.
    if has_attachments:
        tools.append(document_csv_ingest)

    if getattr(current_user, "is_admin", False):

        def mutate_data(instruction: str) -> Dict[str, Any]:
            """Apply an explicitly requested non-delete admin data change."""
            return invoke("data.mutate", {"query": str(instruction)[:12000]})

        def verify_mutation() -> Dict[str, Any]:
            """Read back the last committed mutation for verification."""
            return invoke("data.verify", {})

        tools.extend([mutate_data, verify_mutation])

    return tools


def _config_for_request(
    *,
    provider: str,
    api_key: Optional[str],
    base_url: Optional[str],
    model: Optional[str],
    tools: list[Callable[..., Any]],
    conversation_id: str,
):
    """Construct a deny-by-default Antigravity configuration."""

    from google.antigravity import LocalAgentConfig, LocalOpenAIAgentConfig
    from google.antigravity import types
    from google.antigravity.hooks import policy

    tool_names = [tool.__name__ for tool in tools]
    policies = [policy.deny_all(), *[policy.allow(name) for name in tool_names]]
    capabilities = types.CapabilitiesConfig(
        enabled_tools=[],
        enable_subagents=False,
    )
    state_dir = _state_directory()
    common = {
        "model": model or ("gemini-2.0-flash" if provider == "gemini" else "default"),
        "system_instructions": (
            "You are the Aurelinx workflow agent. Use only the supplied Aurelinx "
            "application tools. Built-in filesystem, shell, web, and subagent "
            "tools are disabled. Use read-only tools for facts and never invent "
            "employee, candidate, or metric data. Never delete records. A delete "
            "request must stop for human approval. Explain the verified tool result "
            "clearly in the final answer. Do not reveal private chain-of-thought."
        ),
        "capabilities": capabilities,
        "tools": tools,
        "policies": policies,
        "workspaces": [],
        "conversation_id": conversation_id,
        "session_continuation_mode": types.SessionContinuationMode.CREATE_OR_RESUME,
        "save_dir": str(state_dir),
        "app_data_dir": str(state_dir / "app-data"),
    }

    if provider in {"gemini", "google", "google-gemini"}:
        if not api_key:
            raise RuntimeError("A Gemini API key is required for Antigravity Gemini mode")
        return LocalAgentConfig(api_key=api_key, **common)

    resolved_base = normalize_local_provider_base(
        base_url or os.getenv("OPENAI_BASE_URL") or ""
    )
    if not resolved_base:
        raise RuntimeError(
            "An OpenAI-compatible base URL is required for Antigravity local mode"
        )
    return LocalOpenAIAgentConfig(
        base_url=resolved_base,
        env={"OPENAI_API_KEY": api_key or "not-needed"},
        **common,
    )


async def stream_agent_turn(
    *,
    prompt: str,
    user_text: str,
    current_user: Any,
    session_id: str,
    provider: str,
    api_key: Optional[str],
    base_url: Optional[str],
    model: Optional[str],
    has_attachments: bool = False,
) -> AsyncIterator[AntigravityRuntimeEvent]:
    """Run one serialized Antigravity turn and yield native semantic events."""

    from google.antigravity import Agent
    from google.antigravity import types

    result_buffer: list[dict[str, Any]] = []
    mutation_state: dict[str, Any] = {}
    tools = _make_tools(
        user_text=user_text,
        current_user=current_user,
        session_id=str(session_id),
        result_buffer=result_buffer,
        mutation_state=mutation_state,
        has_attachments=has_attachments,
    )
    config = _config_for_request(
        provider=(provider or "lmstudio").lower(),
        api_key=api_key,
        base_url=base_url,
        model=model,
        tools=tools,
        conversation_id=str(session_id),
    )

    async with _session_lock(str(session_id)):
        async with Agent(config) as agent:
            response = await agent.chat(prompt)
            emitted_tool_results = 0
            async for event in response.chunks:
                if isinstance(event, types.Thought):
                    yield AntigravityRuntimeEvent("thought", event)
                elif isinstance(event, types.Text):
                    yield AntigravityRuntimeEvent("text", event)
                elif isinstance(event, types.ToolCall):
                    yield AntigravityRuntimeEvent("tool_call", event)
                elif isinstance(event, types.ToolResult):
                    # Successful custom tools are recorded by the request-
                    # scoped wrapper. If the wrapper raised before recording,
                    # the SDK can expose only this native error result; surface
                    # that one failure instead of silently losing the tool step.
                    native_name = str(getattr(event.name, "value", event.name))
                    native_name = {
                        "employee_search": "employee.search",
                        "candidate_search": "candidate.search",
                        "database_overview": "database.overview",
                        "dashboard_snapshot": "dashboard.snapshot",
                        "workspace_snapshot": "workspace.snapshot",
                        "document_csv_ingest": "document.csv_ingest",
                        "mutate_data": "data.mutate",
                        "verify_mutation": "data.verify",
                    }.get(native_name, native_name.replace("_", "."))
                    wrapper_pending = any(
                        item.get("tool") == native_name
                        for item in result_buffer[emitted_tool_results:]
                    )
                    if not wrapper_pending:
                        reason = event.error or str(event.exception or "Tool execution failed")
                        yield AntigravityRuntimeEvent(
                            "tool_result",
                            {
                                "tool": native_name,
                                "result": {
                                    "tool": native_name,
                                    "blocked": True,
                                    "reason": reason[:500],
                                },
                            },
                        )

                # Current SDK versions expose native ToolCall chunks but do not
                # always expose custom Python ToolResult chunks. The request-
                # scoped wrappers provide the exact safe result in that case.
                while emitted_tool_results < len(result_buffer):
                    yield AntigravityRuntimeEvent(
                        "tool_result", result_buffer[emitted_tool_results]
                    )
                    emitted_tool_results += 1

            while emitted_tool_results < len(result_buffer):
                yield AntigravityRuntimeEvent(
                    "tool_result", result_buffer[emitted_tool_results]
                )
                emitted_tool_results += 1

            yield AntigravityRuntimeEvent("finished", response.usage_metadata)
