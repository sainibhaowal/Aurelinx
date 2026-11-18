# 03. Performance and Database Migrations

01. **Alembic Migration Chain (`server/alembic/versions/`):**
    - Migrations `001` through `018` manage the complete PostgreSQL schema (`users`, `auth_sessions`, `employeetable`, `candidatetable`, `skills`, `skill_aliases`, `experiences`, `collaboration_events`, `chat_*`, `workflow_*`, `privacy_*`, `integration_*`, and `lean_*` tables).
    - **Fresh-Database Fix (`011_add_chat_audit_tenant_scope.py`):** Updated migration `011` to inspect existing tables via SQLAlchemy `inspect()` and create `chat_sessions`, `chat_messages`, `chat_feedback`, and `chat_attachments` when absent on a clean database, before idempotently adding `tenant_id` and indexes.

02. **Query Performance Optimizations (`server/app/api/v1/lean_enterprise.py`):**
    - **`GET /api/v1/lean/summary`:** Replaced full-table `.all()` ORM fetches + Python `len()` with SQL `COUNT(*)` (`func.count()`), reducing response latency from >5,000 ms to ~125 ms on `180,136` skill rows.
    - **`GET /api/v1/lean/export/bundle`:** Replaced full ORM entity loading with column-projected `select(...)` tuple queries across `EmployeeTable`, `CandidateTable`, `SkillTable`, `ExperienceTable`, `CollaborationEventTable`, and `SkillAliasTable`, keeping full-bundle ZIP export under ~3.5 s for `200,000+` rows.

03. **Runtime Stability (`infra/docker-compose.local.yml`):**
    - Configured `IN_PROCESS_SCHEDULER: "false"` on the `api` service so background scheduling runs exclusively in the dedicated `scheduler` container instead of duplicating work inside the Uvicorn web process.
