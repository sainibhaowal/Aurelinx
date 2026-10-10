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

"""Central flags and lane budgets for the instant harness."""

from __future__ import annotations

import os


def _get_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _get_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def _get_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


# Master kill-switch. Legacy loop is used when False.
INSTANT_LOOP_ENABLED: bool = _get_bool("AURELINX_INSTANT_LOOP", True)

# Per-lane native-decision timeouts (seconds). L0 never calls native.
LANE_NATIVE_TIMEOUT_S: dict[str, float] = {
    "L1": _get_float("AURELINX_INSTANT_L1_TIMEOUT", 8.0),
    "L2": _get_float("AURELINX_INSTANT_L2_TIMEOUT", 12.0),
    "L3": _get_float("AURELINX_INSTANT_L3_TIMEOUT", 12.0),
}

# Per-lane answer-stream timeouts (seconds).
LANE_ANSWER_TIMEOUT_S: dict[str, float] = {
    "L0": _get_float("AURELINX_INSTANT_L0_ANSWER_TIMEOUT", 30.0),
    "L1": _get_float("AURELINX_INSTANT_L1_ANSWER_TIMEOUT", 30.0),
    "L2": _get_float("AURELINX_INSTANT_L2_ANSWER_TIMEOUT", 45.0),
    "L3": _get_float("AURELINX_INSTANT_L3_ANSWER_TIMEOUT", 45.0),
}

# Max parallel tool executions per turn.
MAX_PARALLEL_TOOLS: int = _get_int("AURELINX_INSTANT_MAX_PARALLEL", 4)

# Max tools attached per lane (manifest trimming).
LANE_TOOL_BUDGET: dict[str, int] = {
    "L0": 0,
    "L1": 6,
    "L2": 10,
    "L3": 10,
}

# Max live-evidence recovery tools per turn (never a loop).
MAX_RECOVERY_TOOLS: int = 1

# Background event-persist batching.
EVENT_FLUSH_INTERVAL_S: float = _get_float("AURELINX_INSTANT_EVENT_FLUSH_S", 0.1)
EVENT_FLUSH_BATCH: int = _get_int("AURELINX_INSTANT_EVENT_BATCH", 20)

PROMPT_ASSEMBLER_VERSION = "instant-v1"
