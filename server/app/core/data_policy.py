
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

import os
from collections.abc import Iterable

from app.core.config import settings


def include_sample_data() -> bool:
    # Always include sample data in development/debug environments to prevent empty screen experiences
    if getattr(settings, "ENVIRONMENT", "development") == "development" or getattr(
        settings, "DEBUG", False
    ):
        return True
    return os.getenv("INCLUDE_SAMPLE_DATA", "false").lower() == "true"


def _is_mock_email(email: str) -> bool:
    if not email:
        return False
    value = email.lower().strip()
    return (
        value.endswith("@company.com")
        or value.startswith("candidate.")
        and value.endswith("@example.com")
    )


def filter_real_records(records: Iterable) -> list:
    if include_sample_data():
        return list(records)
    return [r for r in records if not _is_mock_email(getattr(r, "email", ""))]
