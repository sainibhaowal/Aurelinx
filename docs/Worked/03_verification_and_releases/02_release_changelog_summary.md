# 02. Release Changelog Summary

01. **`v0.2.9` (Current Release):**
    - Fixed refresh session credential handling in `client/src/contexts/AuthContext.jsx` and `server/app/api/v1/auth.py`.
    - Controlled desktop release artifact builds in CI.
    - Hardened fresh-database Alembic migration `011` and optimized `/api/v1/lean/summary` and `/api/v1/lean/export/bundle` queries for `180k+` skill datasets.

02. **`v0.2.8` and Prior Milestones (`v0.2.x`):**
    - Added Intelligence Center engines (Semantic Skills Graph, Optimal Team Assembly, Kaplan-Meier Survival Attrition, ONA Graph, Markov Career Path) with honest `data-readiness` gating.
    - Added multi-tenant scoping (`tenant_id`), auth session management (`auth_sessions`), email verification flows, and privacy consent/retention/export controls (`privacy_*`).
    - Containerized the full stack with Next.js 15 standalone frontend, FastAPI backend, PostgreSQL 16, Redis 7, and Qdrant.
