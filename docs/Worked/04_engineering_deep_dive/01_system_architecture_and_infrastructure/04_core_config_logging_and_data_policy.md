# 04. Core Configuration, Logging, and Data Policy

01. **Configuration (`server/app/core/config.py`):**
    - Centralizes Pydantic settings (`DATABASE_URL`, `REDIS_URL`, `QDRANT_URL`, `ALLOWED_HOSTS`, `ENVIRONMENT`, `CHAT_UPLOAD_ROOT`, `VERSION`, OAuth client credentials).
    - Enforces environment-aware security defaults (such as HTTPS redirect exemptions for `/health`).

02. **Structured Logging (`server/app/core/logging_config.py`):**
    - Attaches per-request correlation UUIDs (`X-Request-ID`) across FastAPI request logs, SQLAlchemy events, and background tasks so distributed errors can be traced end-to-end.

03. **Data Policy & Record Filtering (`server/app/core/data_policy.py`):**
    - `is_active_employee()` evaluates `employment_status`, `departure_event`, and `employment_end_date` to separate active headcount from departed records.
    - `filter_real_records()` ensures analytics engines only compute over valid, non-placeholder tenant records.
