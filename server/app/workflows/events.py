
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

"""Safe, durable workflow events.

Events intentionally contain operational summaries rather than hidden model
chain-of-thought. They are suitable for SSE, audit history, and the UI.
"""

from __future__ import annotations

import json
import time
from collections.abc import Callable
from datetime import datetime
from typing import Any

from sqlmodel import Session, col, select

from app.models.database import (
    WorkflowEventTable,
    WorkflowRunTable,
    engine,
)


def _safe_json(value: Any, max_chars: int = 4000) -> str | None:
    if value is None:
        return None
    try:
        text = json.dumps(value, default=str)
    except Exception:
        text = str(value)
    return text[:max_chars]


def safe_summary(value: Any, max_chars: int = 500) -> Any:
    """Return a compact, non-secret summary for display and persistence."""
    if value is None:
        return None
    if isinstance(value, dict):
        result: dict[str, Any] = {}
        for key, item in value.items():
            lowered = str(key).lower()
            if any(
                secret in lowered
                for secret in ("password", "token", "api_key", "secret")
            ):
                result[str(key)] = "[redacted]"
            elif isinstance(item, (dict, list, tuple)):
                result[str(key)] = safe_summary(item, max_chars)
            else:
                result[str(key)] = item
        return result
    if isinstance(value, (list, tuple)):
        return [safe_summary(item, max_chars) for item in list(value)[:20]]
    text = str(value)
    return text[:max_chars]


def create_workflow_run(
    session_id: str, user_id: str, tenant_id: str = "default"
) -> WorkflowRunTable:
    with Session(engine) as db:
        run = WorkflowRunTable(
            session_id=str(session_id),
            user_id=str(user_id),
            tenant_id=tenant_id,
            status="received",
            current_phase="intake",
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        return run


def update_workflow_run(
    run_id: str,
    status: str,
    phase: str | None = None,
    failure_reason: str | None = None,
) -> None:
    with Session(engine) as db:
        run = db.get(WorkflowRunTable, str(run_id))
        if not run:
            return
        run.status = status
        run.current_phase = phase or run.current_phase
        run.failure_reason = failure_reason
        run.updated_at = datetime.utcnow()
        if status in {"completed", "failed", "cancelled", "blocked_by_policy"}:
            run.completed_at = datetime.utcnow()
        db.add(run)
        db.commit()


def emit_workflow_event(
    run_id: str,
    event_type: str,
    phase: str,
    display_message: str,
    *,
    status: str = "running",
    tool_name: str | None = None,
    safe_input: Any = None,
    result_summary: Any = None,
    error_code: str | None = None,
    duration_ms: int | None = None,
    parent_event_id: str | None = None,
) -> dict[str, Any]:
    """Persist and return one event. This is safe to call from a worker thread."""
    with Session(engine) as db:
        last = db.exec(
            select(WorkflowEventTable)
            .where(WorkflowEventTable.run_id == str(run_id))
            .order_by(col(WorkflowEventTable.sequence).desc())
        ).first()
        sequence = (last.sequence + 1) if last else 1
        event = WorkflowEventTable(
            run_id=str(run_id),
            sequence=sequence,
            parent_event_id=parent_event_id,
            event_type=event_type,
            phase=phase,
            tool_name=tool_name,
            status=status,
            display_message=display_message,
            safe_input=_safe_json(safe_summary(safe_input)),
            result_summary=_safe_json(safe_summary(result_summary)),
            error_code=error_code,
            duration_ms=duration_ms,
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return workflow_event_dict(event)


def update_workflow_event(
    event_id: str,
    *,
    status: str | None = None,
    display_message: str | None = None,
    result_summary: Any = None,
    error_code: str | None = None,
    duration_ms: int | None = None,
) -> dict[str, Any] | None:
    """Update one workflow event in place and return its dict.

    Used to finish a reasoning card on the same row instead of persisting a
    duplicate 'completed' sibling event, so the timeline shows exactly one
    thinking card per provider turn.
    """
    with Session(engine) as db:
        event = db.get(WorkflowEventTable, str(event_id))
        if not event:
            return None
        if status is not None:
            event.status = status
        if display_message is not None:
            event.display_message = display_message
        if result_summary is not None:
            event.result_summary = _safe_json(safe_summary(result_summary))
        if error_code is not None:
            event.error_code = error_code
        if duration_ms is not None:
            event.duration_ms = duration_ms
        db.add(event)
        db.commit()
        db.refresh(event)
        return workflow_event_dict(event)


def workflow_event_dict(event: WorkflowEventTable) -> dict[str, Any]:
    def parse(value: str | None) -> Any:
        if not value:
            return None
        try:
            return json.loads(value)
        except Exception:
            return value

    return {
        "event_id": event.id,
        "run_id": event.run_id,
        "sequence": event.sequence,
        "parent_event_id": event.parent_event_id,
        "type": event.event_type,
        "phase": event.phase,
        "tool": event.tool_name,
        "status": event.status,
        "display_message": event.display_message,
        "safe_input": parse(event.safe_input),
        "result_summary": parse(event.result_summary),
        "error_code": event.error_code,
        "duration_ms": event.duration_ms,
        "created_at": event.created_at.isoformat() + "Z" if event.created_at else None,
    }


class ToolEventScope:
    """Emit a start/completion pair around one real internal tool operation."""

    def __init__(
        self,
        run_id: str,
        tool_name: str,
        phase: str,
        message: str,
        sink: Callable[[dict[str, Any]], None] | None = None,
    ):
        self.run_id = run_id
        self.tool_name = tool_name
        self.phase = phase
        self.message = message
        self.sink = sink
        self.started = time.perf_counter()

    def start(self, safe_input: Any = None) -> dict[str, Any]:
        event = emit_workflow_event(
            self.run_id,
            "tool_call",
            self.phase,
            self.message,
            status="running",
            tool_name=self.tool_name,
            safe_input=safe_input,
        )
        if self.sink:
            self.sink(event)
        return event

    def complete(
        self,
        result_summary: Any = None,
        status: str = "completed",
        error_code: str | None = None,
    ) -> dict[str, Any]:
        event = emit_workflow_event(
            self.run_id,
            "tool_result",
            self.phase,
            self.message,
            status=status,
            tool_name=self.tool_name,
            result_summary=result_summary,
            error_code=error_code,
            duration_ms=int((time.perf_counter() - self.started) * 1000),
        )
        if self.sink:
            self.sink(event)
        return event
