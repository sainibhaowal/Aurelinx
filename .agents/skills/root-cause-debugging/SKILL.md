---
name: root-cause-debugging
description: Systematic root-cause debugging and observability workflow for Aurelinx Docker containers, FastAPI APIs, PostgreSQL/Alembic, RQ workers, and Next.js frontend. Use whenever investigating errors, timeouts, or failing tests.
---

# Root-Cause Debugging and Observability

01. **Reproduce & Gather Real Evidence First:**
    - Check container health and logs before editing (`docker compose -f infra/docker-compose.local.yml --env-file infra/.env.local ps` and `docker logs <container> --tail 100`).
    - Trace requests using `X-Request-ID`, HTTP status codes, SQLAlchemy query logs, and Alembic state (`alembic current`).
    - Never guess or patch symptoms without confirming the exact failing line and condition.

02. **Isolate & Fix the Root Cause:**
    - Identify why the failure occurred (e.g., missing migration table on fresh DB, duplicate in-process scheduler, O(N) ORM load, hardcoded localhost port inside container).
    - Implement a clean, minimal, idempotent fix that protects all existing behavior.

03. **Verify & Prevent Regression:**
    - Add or run targeted `pytest` / `vitest` tests covering the exact failure mode.
    - Re-test the live endpoint or container end-to-end and report the exact observed command output and HTTP status.
