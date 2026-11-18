---
name: ci-cd-and-release-assurance
description: Release readiness, Docker Compose verification, Alembic migration safety, and CI/CD parity checks for Aurelinx. Use before committing, pushing, or updating infrastructure/workflows.
---

# CI/CD and Release Assurance

01. **Database & Migration Safety:**
    - Verify every new Alembic migration is idempotent on both a fresh PostgreSQL database and an existing populated database (`inspector = inspect(op.get_bind())`).
    - Confirm `alembic upgrade head` reaches `018 (head)` cleanly inside `infra-api-1`.

02. **Container & Runtime Parity:**
    - Validate compose configuration (`docker compose -f infra/docker-compose.local.yml --env-file infra/.env.local config -q`).
    - Keep `IN_PROCESS_SCHEDULER="false"` on `api` when `scheduler` runs as a separate container.
    - Verify `api`, `web`, `postgres`, `redis`, and `qdrant` reach `healthy` status after rebuilds.

03. **Pre-Commit & CI Gate Parity:**
    - Ensure no secrets (`.env.local`, `.env.production`, `opencode_auth.json`, `*.pem`, `*.key`) or cache/temp artifacts (`__pycache__`, `.pytest_cache`, `.ruff_cache`, `.mypy_cache`, `.next`, `tmp/`) are staged.
    - Verify backend (`ruff`, `pytest` against PostgreSQL `test` schema) and frontend (`eslint`, `vitest`, `next build`) pass before pushing.
