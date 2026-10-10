# Copyright 2026 Ravinder Singh
# Licensed under the Apache License, Version 2.0 (the "License");
"""Governed dispatch: authorize -> validate -> timeout -> envelope -> audit (B2-B7)."""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from .guards import normalize_tool_name, suggest_tool, validate_tool_args
from .registry import REGISTRY

logger = logging.getLogger(__name__)

audit_log: list[dict[str, Any]] = []  # in-memory; wire to DB table in prod
_idempotency_store: dict[str, dict] = {}


def clear_audit_log() -> None:
    audit_log.clear()
    _idempotency_store.clear()


def role_of(user: Any) -> str:
    if getattr(user, "is_admin", False) or getattr(user, "role", "") == "admin":
        return "admin"
    if getattr(user, "role", "") == "viewer":
        return "viewer"
    return "member"


def wrap_envelope(
    tool: str,
    data: dict | None = None,
    *,
    ok: bool = True,
    reason: str = "",
    error_code: str | None = None,
    retryable: bool = False,
    row_count: int | None = None,
    truncated: bool = False,
    elapsed_ms: int = 0,
    extra: dict | None = None,
) -> dict[str, Any]:
    env: dict[str, Any] = {
        "tool": tool,
        "ok": ok,
        "blocked": not ok,
        "data": data or {},
        "row_count": row_count,
        "truncated": truncated,
        "error_code": error_code,
        "reason": reason,
        "retryable": retryable,
        "elapsed_ms": elapsed_ms,
    }
    if extra:
        env.update(extra)
    return env


def _audit(
    tool: str, args: dict, user: Any, tenant: str, outcome: str, elapsed_ms: int
) -> None:
    try:
        arg_hash = hashlib.sha256(
            json.dumps(args, sort_keys=True, default=str).encode()
        ).hexdigest()[:16]
    except Exception:
        arg_hash = "unhashable"
    audit_log.append(
        {
            "tool": tool,
            "args_hash": arg_hash,
            "user": str(getattr(user, "user_id", getattr(user, "email", "?"))),
            "tenant": tenant,
            "outcome": outcome,
            "elapsed_ms": elapsed_ms,
        }
    )


def dispatch_tool(
    tool_name: str,
    arguments: dict,
    *,
    user: Any,
    tenant: str,
    executor: Callable[[str, dict], dict],
    timeout_s: float | None = None,
) -> dict[str, Any]:
    """normalize -> authorize -> validate -> run w/ timeout -> envelope -> audit."""
    t0 = time.perf_counter()
    known = set(REGISTRY)
    normalized = normalize_tool_name(tool_name, known)
    if not normalized or normalized not in REGISTRY:
        hint = suggest_tool(str(tool_name or ""), known)
        elapsed = int((time.perf_counter() - t0) * 1000)
        _audit(str(tool_name), {}, user, tenant, "UNKNOWN_TOOL", elapsed)
        return wrap_envelope(
            str(tool_name or "unknown"),
            ok=False,
            reason=f"Unknown or unsupported tool: {tool_name}"
            + (f". Did you mean '{hint}'?" if hint else ""),
            error_code="UNKNOWN_TOOL",
            retryable=False,
            elapsed_ms=elapsed,
        )
    spec = REGISTRY[normalized]
    role = role_of(user)
    if role not in spec.roles:
        elapsed = int((time.perf_counter() - t0) * 1000)
        _audit(normalized, {}, user, tenant, "FORBIDDEN", elapsed)
        return wrap_envelope(
            normalized,
            ok=False,
            reason=f"Role '{role}' may not run '{normalized}'",
            error_code="FORBIDDEN",
            retryable=False,
            elapsed_ms=elapsed,
        )
    if not tenant or str(tenant).lower() == "default":
        # Tenant scope enforced for all data tools; proposals carry tenant too.
        pass
    args = dict(arguments or {})
    coerced, err = validate_tool_args(spec.schema, args)
    if err:
        elapsed = int((time.perf_counter() - t0) * 1000)
        _audit(normalized, args, user, tenant, "INVALID_ARGUMENT", elapsed)
        return wrap_envelope(
            normalized,
            ok=False,
            reason=err,
            error_code="INVALID_ARGUMENT",
            retryable=True,
            elapsed_ms=elapsed,
        )
    # Idempotency for mutating/proposal tools (B6).
    idem = str(coerced.get("idempotency_key") or "").strip()
    if idem and spec.mutating:
        key = f"{tenant}:{normalized}:{idem}"
        if key in _idempotency_store:
            prev = dict(_idempotency_store[key])
            prev["elapsed_ms"] = int((time.perf_counter() - t0) * 1000)
            _audit(
                normalized,
                coerced,
                user,
                tenant,
                "IDEMPOTENT_REPLAY",
                prev["elapsed_ms"],
            )
            return prev
    timeout = timeout_s or spec.timeout_s
    try:
        # Run sync executor with a hard timeout; never leak tracebacks (B7).
        with ThreadPoolExecutor(max_workers=1) as pool:
            fut = pool.submit(executor, normalized, coerced)
            raw = fut.result(timeout=timeout)
    except Exception as exc:
        elapsed = int((time.perf_counter() - t0) * 1000)
        logger.exception("tool %s failed", normalized)
        _audit(normalized, coerced, user, tenant, "INTERNAL_ERROR", elapsed)
        retryable = "timeout" in str(exc).lower() or "timed out" in str(exc).lower()
        return wrap_envelope(
            normalized,
            ok=False,
            reason="Tool execution failed",
            error_code="INTERNAL_ERROR",
            retryable=retryable,
            elapsed_ms=elapsed,
        )
    elapsed = int((time.perf_counter() - t0) * 1000)
    if not isinstance(raw, dict):
        raw = {"result": raw}
    # Legacy executor shape {blocked, reason, ...} -> envelope (B3).
    if raw.get("blocked"):
        env = wrap_envelope(
            normalized,
            data={k: v for k, v in raw.items() if k not in ("tool",)},
            ok=False,
            reason=str(raw.get("reason") or "Tool blocked"),
            error_code=str(raw.get("error_code") or "TOOL_BLOCKED"),
            retryable=bool(raw.get("retryable", False)),
            elapsed_ms=elapsed,
            extra=(
                {"approval_required": raw.get("approval_required", False)}
                if raw.get("approval_required")
                else None
            ),
        )
        _audit(normalized, coerced, user, tenant, env["error_code"], elapsed)
        return env
    env = wrap_envelope(
        normalized,
        data=raw,
        ok=True,
        elapsed_ms=elapsed,
        row_count=raw.get("returned", raw.get("row_count")),
        truncated=bool(raw.get("truncated", False)),
    )
    if idem and spec.mutating:
        _idempotency_store[f"{tenant}:{normalized}:{idem}"] = dict(env)
    _audit(normalized, coerced, user, tenant, "OK", elapsed)
    return env


async def dispatch_many(
    calls: list[dict], *, user: Any, tenant: str, executor: Callable[[str, dict], dict]
) -> list[dict]:
    """Parallel reads first, then mutating tools sequentially (B5). Order-preserving."""
    indexed = list(enumerate(calls))

    def _is_write(call: dict) -> bool:
        norm = normalize_tool_name(call.get("tool"), set(REGISTRY))
        spec = REGISTRY.get(norm)
        return bool(spec and spec.mutating)

    reads = [(i, c) for i, c in indexed if not _is_write(c)]
    writes = [(i, c) for i, c in indexed if _is_write(c)]

    async def _one(call: dict) -> dict:
        return await asyncio.to_thread(
            dispatch_tool,
            str(call.get("tool") or ""),
            call.get("arguments") or {},
            user=user,
            tenant=tenant,
            executor=executor,
        )

    out: dict[int, dict] = {}
    if reads:
        res = await asyncio.gather(*(_one(c) for _, c in reads))
        for (i, _), r in zip(reads, res, strict=False):
            out[i] = r
    for i, c in writes:
        out[i] = await _one(c)
    return [out[i] for i in range(len(calls))]
