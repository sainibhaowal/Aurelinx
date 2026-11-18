# 01. Platform Architecture Vision

01. **Core Architectural Principles:**
    - **Server-Based Multi-Tenancy:** Centralized FastAPI + PostgreSQL backend where all workforce data, analytics, and audit trails are scoped by `tenant_id` from verified server-side session claims.
    - **Async Worker Offloading:** Long-running webhook retries, connector syncs, and heavy analytics pre-computation run in dedicated RQ worker and scheduler containers rather than blocking API request threads.
    - **Honest Analytics Gating:** Every intelligence module checks `data-readiness` first and refuses to fabricate individual forecasts when only descriptive cohort data exists.

02. **Service Topology:**
    - **Presentation Layer (`client/`):** Next.js 15 App Router with standalone output and static asset retention.
    - **API Layer (`server/`):** FastAPI with Pydantic strict validation, SQLModel/SQLAlchemy, and Alembic migrations.
    - **Storage Layer (`infra/`):** PostgreSQL 16 (relational truth in `app` schema), Redis 7 (queues, cache, pub/sub), and Qdrant (semantic vector search).
    - **Desktop Shell (`desktop/`):** Optional Tauri wrapper targeting the web workspace.

03. **Security and Governance Layer:**
    - Argon2 password hashing, rotated refresh sessions, role-based access (`is_admin`), human-in-the-loop approvals (`workflow_approvals`), and append-only audit logs.
