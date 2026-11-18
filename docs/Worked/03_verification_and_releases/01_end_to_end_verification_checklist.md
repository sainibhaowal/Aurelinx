# 01. End-to-End Verification Checklist

01. **Container Stack Health:**
    - `infra-postgres-1` (`postgres:16-alpine`): Up and healthy (`55432 -> 5432`).
    - `infra-redis-1` (`redis:7-alpine`): Up and healthy (`56379 -> 6379`).
    - `infra-qdrant-1` (`qdrant/qdrant:v1.13.6`): Up and healthy (`6333-6334`).
    - `infra-api-1` (`infra-api`): Up and healthy (`5100 -> 5000`), Alembic at `018 (head)`.
    - `infra-web-1` (`infra-web`): Up and healthy (`3100 -> 3000`).
    - `infra-worker-1` & `infra-scheduler-1`: Running cleanly.

02. **Backend Automated Test Suite (`pytest`):**
    - Executed inside `infra-api-1` against the PostgreSQL `test` schema (`TEST_DATABASE_URL` and `DATABASE_URL` configured for `postgres:5432`).
    - Result: **191 passed, 0 failed, 0 errors**.

03. **Live API & Intelligence Center Verification:**
    - `GET /health` -> `200 OK`
    - `GET /api/v1/lean/summary` -> `200 OK` (~125 ms)
    - `GET /api/v1/lean/export/bundle` -> `200 OK` (~3.49 s, `2.44 MB` ZIP)
    - `POST /api/v1/intelligence/skill-match` -> `200 OK`
    - `POST /api/v1/intelligence/team-optimize` -> `200 OK`
    - `GET /api/v1/intelligence/attrition-hazard` -> `200 OK` (`36` Kaplan-Meier curve points)
    - `GET /api/v1/intelligence/ona` -> `200 OK` (`500` nodes, `356` links)
    - `GET /api/v1/intelligence/career-path/{employee_id}` -> `200 OK`
    - Admin-gated routes (`/api/v1/integrations/*`, `/api/v1/privacy/*`) -> `200 OK` for admin user.
    - Governance routes (`/api/v1/lean/contracts`, `/dr/runbooks`, `/ml/cards`, `/policy/packs`, `/procurement/artifacts`, `/release-gates`) -> `200 OK` with baseline records.

04. **Live Frontend Verification:**
    - Verified `200 OK` on `/login`, `/app`, `/app/directory`, `/app/talent-scout`, `/app/sentiment-pulse`, `/app/enterprise-ops`, and `/app/intelligence-chat`.
