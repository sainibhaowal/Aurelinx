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

"""Buffered workflow-event persistence: paint first, persist in background.

SSE frames are yielded from in-memory dicts immediately (<100ms TTFT).
Durable ``workflow_events`` rows are written by a background flush task in
original order so sequence numbers stay monotonic. Failures are recorded
in ``pending_errors`` and never break the user stream.
"""

from __future__ import annotations

import asyncio
import time
from collections.abc import Callable
from typing import Any
from uuid import uuid4

from .config import EVENT_FLUSH_BATCH, EVENT_FLUSH_INTERVAL_S

EmitFn = Callable[..., dict[str, Any]]
UpdateFn = Callable[..., dict[str, Any] | None]


class InstantEventBuffer:
    def __init__(
        self,
        run_id: str,
        emit_fn: EmitFn,
        update_fn: UpdateFn,
        *,
        flush_interval_s: float = EVENT_FLUSH_INTERVAL_S,
        flush_batch: int = EVENT_FLUSH_BATCH,
    ) -> None:
        self.run_id = str(run_id)
        self._emit_fn = emit_fn
        self._update_fn = update_fn
        self.flush_interval_s = flush_interval_s
        self.flush_batch = flush_batch
        self.events: list[dict[str, Any]] = []
        self._queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._flush_task: asyncio.Task | None = None
        self.pending_errors: list[str] = []
        self._closed = False
        self._provisional_map: dict[str, str] = {}

    def _track(self, event: dict[str, Any]) -> dict[str, Any]:
        self.events.append(event)
        return event

    def start(self) -> None:
        if self._flush_task is None or self._flush_task.done():
            self._flush_task = asyncio.create_task(self._flush_loop())

    async def _flush_loop(self) -> None:
        batch: list[dict[str, Any]] = []
        try:
            while not self._closed or not self._queue.empty():
                try:
                    item = await asyncio.wait_for(
                        self._queue.get(), timeout=self.flush_interval_s
                    )
                    batch.append(item)
                except TimeoutError:
                    pass
                if batch and (len(batch) >= self.flush_batch or self._closed):
                    await self._persist_batch(batch)
                    batch = []
                if batch and self._queue.empty():
                    # Opportunistic flush so short turns persist promptly.
                    await asyncio.sleep(self.flush_interval_s)
                    if batch:
                        await self._persist_batch(batch)
                        batch = []
        except asyncio.CancelledError:
            pass
        finally:
            if batch:
                await self._persist_batch(batch)

    async def _persist_batch(self, batch: list[dict[str, Any]]) -> None:
        for pending in batch:
            try:
                kwargs = dict(pending["_kwargs"])
                message = pending["_message"]
                # Overlay the latest in-memory state so in-place updates
                # (e.g. reasoning card completion) survive persistence.
                # Without this the durable row would keep the provisional
                # "running" snapshot instead of the finalized card.
                for ev in self.events:
                    if ev.get("event_id") != pending.get("event_id") and ev.get(
                        "_provisional_id"
                    ) != pending.get("event_id"):
                        continue
                    if str(ev.get("type", "")).startswith("__"):
                        break
                    if ev.get("display_message"):
                        message = ev["display_message"]
                    for key in (
                        "status",
                        "result_summary",
                        "error_code",
                        "duration_ms",
                    ):
                        if ev.get(key) is not None:
                            kwargs[key] = ev[key]
                    break
                durable = await asyncio.to_thread(
                    self._emit_fn,
                    self.run_id,
                    pending["_event_type"],
                    pending["_phase"],
                    message,
                    **kwargs,
                )
                # Reconcile provisional id with durable row for updates.
                provisional_id = pending.get("event_id")
                if provisional_id and durable.get("event_id"):
                    self._provisional_map[provisional_id] = durable["event_id"]
                for i, ev in enumerate(self.events):
                    if (
                        ev.get("event_id") == provisional_id
                        or ev.get("_provisional_id") == provisional_id
                    ):
                        durable_item = dict(durable)
                        if provisional_id:
                            durable_item["_provisional_id"] = provisional_id
                        self.events[i] = durable_item
                        break
                pending["_durable"] = durable
                if pending.get("_future") is not None and not pending["_future"].done():
                    pending["_future"].set_result(durable)
            except Exception as exc:  # durable write must not break stream
                self.pending_errors.append(str(exc)[:300])
                if pending.get("_future") is not None and not pending["_future"].done():
                    pending["_future"].set_exception(exc)
            finally:
                try:
                    self._queue.task_done()
                except ValueError:
                    pass

    def emit_fast(
        self,
        event_type: str,
        phase: str,
        message: str,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Yield-ready in-memory event; durable write happens in background."""
        prov_id = f"instant-{uuid4().hex[:12]}"
        provisional = {
            "event_id": prov_id,
            "_provisional_id": prov_id,
            "run_id": self.run_id,
            "sequence": len(self.events) + 1,
            "type": event_type,
            "phase": phase,
            "tool": kwargs.get("tool_name"),
            "status": kwargs.get("status", "running"),
            "display_message": message,
            "safe_input": kwargs.get("safe_input"),
            "result_summary": kwargs.get("result_summary"),
            "error_code": kwargs.get("error_code"),
            "duration_ms": kwargs.get("duration_ms"),
            "created_at": None,
            "provisional": True,
        }
        self._provisional_map[prov_id] = prov_id
        self._track(provisional)
        loop = asyncio.get_running_loop()
        future: asyncio.Future = loop.create_future()
        self._queue.put_nowait(
            {
                "event_id": provisional["event_id"],
                "_event_type": event_type,
                "_phase": phase,
                "_message": message,
                "_kwargs": dict(kwargs),
                "_future": future,
            }
        )
        self.start()
        return provisional

    def emit_durable(
        self,
        event_type: str,
        phase: str,
        message: str,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Synchronous durable emit for cards that need later in-place update."""
        started = time.perf_counter()
        event = self._emit_fn(self.run_id, event_type, phase, message, **kwargs)
        if kwargs.get("duration_ms") is None:
            event = dict(event)
        self._track(event)
        event["_emit_ms"] = int((time.perf_counter() - started) * 1000)
        return event

    def update(self, event_id: str | None, **kwargs: Any) -> dict[str, Any] | None:
        if not event_id:
            return None
        durable_id = self._provisional_map.get(event_id, event_id)
        patched_event: dict[str, Any] | None = None
        for i, ev in enumerate(self.events):
            if (
                ev.get("event_id") in (event_id, durable_id)
                or ev.get("_provisional_id") == event_id
            ):
                patched = dict(ev)
                if kwargs.get("status") is not None:
                    patched["status"] = kwargs["status"]
                if kwargs.get("display_message") is not None:
                    patched["display_message"] = kwargs["display_message"]
                if kwargs.get("result_summary") is not None:
                    patched["result_summary"] = kwargs["result_summary"]
                if kwargs.get("error_code") is not None:
                    patched["error_code"] = kwargs["error_code"]
                if kwargs.get("duration_ms") is not None:
                    patched["duration_ms"] = kwargs["duration_ms"]
                self.events[i] = patched
                patched_event = patched
                break
        if durable_id and not durable_id.startswith("instant-"):
            try:
                db_updated = self._update_fn(durable_id, **kwargs)
                if db_updated:
                    for i, ev in enumerate(self.events):
                        if (
                            ev.get("event_id") == durable_id
                            or ev.get("_provisional_id") == event_id
                        ):
                            durable_copy = dict(db_updated)
                            durable_copy["_provisional_id"] = event_id
                            self.events[i] = durable_copy
                            return durable_copy
            except Exception as exc:
                self.pending_errors.append(str(exc)[:300])
        return patched_event

    async def close(self) -> None:
        self._closed = True
        if self._flush_task is not None:
            try:
                await asyncio.wait_for(self._flush_task, timeout=5.0)
            except (TimeoutError, asyncio.CancelledError):
                self._flush_task.cancel()
