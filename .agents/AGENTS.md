# Aurelinx Repository Agent Rules (`AGENTS.md`)

01. **Repository Identity & Stack:**
    - **Frontend (`client/`):** Next.js 15 (App Router, standalone output), React 19, Tailwind CSS, Vitest, ESLint, pnpm.
    - **Backend (`server/`):** FastAPI, Python 3.12 (GIL enabled, standard CPython), SQLModel, SQLAlchemy, Alembic (`001` through `018`), RQ workers, pytest, Ruff.
    - **Infrastructure (`infra/`):** Docker Compose (`infra/docker-compose.local.yml` with `infra/.env.local`; `caddy` gated behind `profiles: ["proxy"]`), PostgreSQL 16 (`app` schema, host port `55432`), Redis 7 (`56379`), Qdrant `v1.13.6` (`6333`/`6334`), API (`5100 -> 5000`), Web (`3100 -> 3000`).
    - **Desktop (`desktop/`):** Tauri shell (`src-tauri`).

02. **Non-Negotiable Verification Rules:**
    - Never claim tests, builds, or endpoints pass without running them after your final edit and observing actual output.
    - **Backend Tests (`191 passed`):** Run inside `infra-api-1` against the PostgreSQL `test` schema (`TEST_DATABASE_URL` and `DATABASE_URL` with `options=-csearch_path%3Dtest,public`), or locally with `ALLOW_SQLITE=1` for unit-only checks.
    - **Frontend Checks:** Run `pnpm -C client run lint`, `pnpm -C client run test`, and `pnpm -C client run build`.
    - **Pre-Commit & Pre-Push:** `.pre-commit-config.yaml` enforces `ruff`, `ruff-format`, `ast.parse` syntax check, secret/cache blocking, `eslint`, `vitest`, `next build`, `docker compose config`, and backend `pytest` before push.

03. **Security, Privacy, and Multi-Tenancy Invariants:**
    - Every tenant-owned query, mutation, analytics endpoint, workflow, and audit event must enforce `tenant_id` derived server-side from authenticated JWT/session claims, never from untrusted client headers.
    - Administrative routes (`/api/v1/integrations/*`, `/api/v1/privacy/*`, workflow approvals) require `is_admin = True`.
    - Never commit, print, or expose secrets (`infra/.env.local`, `infra/.env.production`, `opencode_auth.json`, `*.pem`, `*.key`, API tokens, or private server IPs).
    - External provider mutations must route through `external_action_requests` and `workflow_approvals` (human-in-the-loop) and fail closed for undeclared actions.

04. **Data Integrity & Scientific Honesty:**
    - Never fabricate individual attrition forecasts, market salaries, live provider connections, or fake citations/URLs.
    - Preserve `docs/datasets/aurelinx_offline_career_markov_demo.zip` and `docs/datasets/README.md` provenance notices (`PROVENANCE.json`, `DATA_QUALITY_REPORT.json`).
    - Never substitute unrelated records when a search/read query returns no match.
    - Keep `employeetable` active vs. departed filtering consistent via `is_active_employee()` and `filter_real_records()`.

05. **Performance & Database Rules:**
    - Keep `IN_PROCESS_SCHEDULER="false"` on the `api` container when `scheduler` runs as a separate service.
    - Never load full ORM collections just to count rows (use SQL `COUNT(*)`) or export large tables (use column-projected `select(...)` tuples).
    - Every new Alembic migration must be idempotent on both fresh and existing PostgreSQL databases.

06. **Documentation & Clean Workspace Rules:**
    - Keep all documentation in lowercase `docs/` (`docs/Worked/`, `docs/Planned_Architecture/`, `docs/AdminWork/`, `docs/datasets/README.md`). Never recreate uppercase `Docs/`.
    - Format documentation with `01.`, `02.`, `03.` numbered sections, zero em dashes, and 100% code-verified file paths, symbol names, and formulas.
    - Never leave `__pycache__`, `.pytest_cache`, `.ruff_cache`, `.mypy_cache`, `tmp/`, or `.next` artifacts tracked in git.

07. **Execution Workflow & Production-Safe Protocol:**
    - **Before Implementation (Analyze & Plan First, Start Immediately):**
      1. Clearly identify: (1) What to do, (2) Why to do it, (3) What already exists, (4) What needs work and where, (5) Where to do it, (6) Exact files, folders, routes, APIs, components, schemas, tests, and docs involved, (7) How to implement safely and accurately, (8) What must not break.
      2. Inspect the current codebase carefully, map exact paths and dependencies, identify risks/gaps/validation steps, and start implementation immediately without waiting for approval unless destructive or ambiguous.
    - **Always Protect:**
      1. Existing code structure, backend/frontend behavior, and existing integrations/connections.
      2. Auth, `tenant_id` isolation, security, encryption, and cryptography safety.
      3. Existing workflows, APIs, background jobs, storage, memory, and event streams.
    - **During Implementation:**
      1. Implement end-to-end (never partially), preserve all unrelated logic/comments, and keep behavior accurate, secure, and production-grade.
    - **Before Claiming Completion (Evidence-First):**
      1. Run tests and verification, check for regressions, and update relevant documentation.
      2. Provide real observed evidence and proof (actual command outputs, test counts, HTTP status codes, file paths) of what was fixed and implemented, confirming the existing system remains protected.
      3. Commit only after verified success.
