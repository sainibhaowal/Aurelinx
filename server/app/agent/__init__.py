# Copyright 2026 Ravinder Singh
# Licensed under the Apache License, Version 2.0 (the "License");
"""Frontier agent package: single registry + governed dispatch.

Pipeline: normalize -> known? -> authorize (role/tenant) -> validate args
-> run with timeout -> verify mutations -> wrap envelope -> audit -> record step.
"""
from .dispatch import audit_log, clear_audit_log, dispatch_many, dispatch_tool
from .guards import (
    KNOWN_PREFIXES,
    TOOL_ALIASES,
    guard_safe_sql,
    normalize_tool_name,
    safe_limit,
    validate_tool_args,
    wrap_untrusted_data,
)
from .registry import REGISTRY, ToolSpec, agent_catalog, tool_labels, tool_schemas
from .state import AgentExecutionState, AgentStep

__all__ = [
    "REGISTRY",
    "ToolSpec",
    "tool_schemas",
    "agent_catalog",
    "tool_labels",
    "AgentExecutionState",
    "AgentStep",
    "dispatch_tool",
    "dispatch_many",
    "audit_log",
    "clear_audit_log",
    "normalize_tool_name",
    "safe_limit",
    "validate_tool_args",
    "guard_safe_sql",
    "wrap_untrusted_data",
    "KNOWN_PREFIXES",
    "TOOL_ALIASES",
]
