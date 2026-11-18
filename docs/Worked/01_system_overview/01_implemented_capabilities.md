# 01. Implemented Capabilities Overview (`v0.2.9`)

01. **Core Technology Stack:**
    - **Frontend (`client/`):** Next.js 15 (standalone production build), React 19, Tailwind CSS, Framer Motion, and Lucide icons.
    - **Backend (`server/`):** FastAPI, Python 3.12, SQLModel, SQLAlchemy, Alembic (`001` through `018`), and RQ background workers.
    - **Data & Infrastructure (`infra/`):** PostgreSQL 16 (schema `app`), Redis 7, Qdrant vector database (`v1.13.6`), and Docker Compose.

02. **Application Workspace Routes (`client/`):**
    - Public landing page (`/`) and authentication flows (`/login`, `/register`).
    - `/app`: Executive overview dashboard.
    - `/app/directory`: Employee directory and profile detail exploration.
    - `/app/talent-scout`: Candidate discovery and role-to-skill matching.
    - `/app/sentiment-pulse`: Workforce sentiment and risk signal monitoring.
    - `/app/intelligence-chat`: Persistent AI chat sessions with file attachment parsing and tool execution traces.
    - `/app/enterprise-ops`: Data Pipelines, AI & Governance, Risk & Interventions, and Compliance & Audit views.

03. **Backend API Surface (`server/app/api/v1/`):**
    - **Authentication (`auth.py`, `oauth.py`):** Argon2 password hashing, JWT access tokens, refresh session rotation, and optional Google/GitHub OAuth.
    - **Workforce & Talent (`employees.py`, `candidates.py`, `analysis.py`):** Tenant-scoped CRUD, search, department filters, and analytics snapshots.
    - **Intelligence Center (`intelligence.py`):** Semantic skill matching, optimal team assembly, Kaplan-Meier survival attrition, ONA collaboration graphs, and Markov career paths.
    - **Data Operations & Lean Enterprise (`lean_enterprise.py`, `enterprise.py`):** Bulk CSV/ZIP import and export, data contracts, quarantine tracking, compliance policies, DR runbooks, release gates, and model cards.
    - **Integrations & Privacy (`integrations.py`, `actions.py`, `privacy.py`):** Admin-scoped integration API keys, webhook idempotency/retry queues, human-in-the-loop action approvals, consent, and retention policies.

04. **Current Scope & Honest Boundaries:**
    - The platform runs end-to-end with synthetic/demo workforce bundles (`Docs/datasets/aurelinx_offline_career_markov_demo.zip`).
    - External HRIS/ATS/collaboration connectors (`workday`, `greenhouse`, `slack`, `jira`) have schema contracts and connector scaffolding, and require organization-owned credentials before live syncing.
