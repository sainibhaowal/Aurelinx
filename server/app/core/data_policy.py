import os
from typing import Iterable, List
from app.core.config import settings


def include_sample_data() -> bool:
    # Always include sample data in development/debug environments to prevent empty screen experiences
    if getattr(settings, "ENVIRONMENT", "development") == "development" or getattr(settings, "DEBUG", False):
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


def filter_real_records(records: Iterable) -> List:
    if include_sample_data():
        return list(records)
    return [r for r in records if not _is_mock_email(getattr(r, "email", ""))]
