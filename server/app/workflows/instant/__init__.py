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

"""Frontier-grade instant workflow harness (additive, non-breaking).

Legacy path ``_stream_true_agent_loop`` stays untouched. This package
implements the fast lanes: deterministic routing, cache-safe prompts,
single native tool call + parallel execution, and buffered persistence.
"""
