# Aurelinx Architecture

> **Version**: 1.0 (pre-release)  
> **Last Updated**: 2026-08-23  
> **Status**: Living document — update with each architectural decision

---

## System Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AURELINX ECOSYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
│  │   Web App    │    │ Desktop App  │    │  Mobile Web  │    │  API     │  │
│  │  (Next.js)   │    │   (Tauri)    │    │  (PWA-ready) │    │ Consumers│  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └────┬─────┘  │
│         │                   │                   │                 │         │
│         └───────────────────┼───────────────────┼─────────────────┘         │
│                             ▼                   ▼                           │
│                    ┌─────────────────────────────────────┐                  │
│                    │         API GATEWAY / EDGE           │                  │
│                    │  (nginx / Cloudflare / Traefik)      │                  │
│                    │  TLS │ Rate Limit │ WAF │ Routing    │                  │
│                    └─────────────────────┬────────────────┘                  │
│                                          │                                    │
│                    ┌─────────────────────┼────────────────┐                  │
│                    ▼                     ▼                 ▼                  │
│           ┌───────────────┐      ┌───────────────┐ ┌───────────────┐        │
│           │  FRONTEND     │      │   BACKEND     │ │  CONNECTORS   │        │
│           │  (Next.js 15) │      │  (FastAPI)    │ │  (Outbound)   │        │
│           │  React 19     │      │  Python 3.11+ │ │  Greenhouse   │        │
│           │  Tailwind     │      │  SQLAlchemy   │ │  Workday      │        │
│           │  Framer Motion│      │  Alembic      │ │  Lever        │        │
│           └───────────────┘      └───────┬───────┘ └───────┬───────┘        │
│                                          │                 │                  │
│                    ┌─────────────────────┼─────────────────┘                  │
│                    ▼                     ▼                                    │
│           ┌───────────────┐      ┌───────────────┐ ┌───────────────┐        │
│           │  PostgreSQL   │      │    Redis      │ │    Qdrant     │        │
│           │  15+ (Primary)│      │  7+ (Cache/   │ │  1.8+ (Vector │        │
│           │  SQLModel     │      │   Queue)      │ │   Search)     │        │
│           └───────────────┘      └───────────────┘ └───────────────┘        │
│                    │                     │                 │                  │
│                    └─────────────────────┼─────────────────┘                  │
│                                          ▼                                    │
│                    ┌─────────────────────────────────────┐                  │
│                    │         BACKGROUND WORKERS           │                  │
│                    │  Celery │ Beat Scheduler │ MLflow    │                  │
│                    └─────────────────────────────────────┘                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. Frontend (`client/`)
**Tech**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion

```
client/
├── src/
│   ├── app/                    # App Router pages
│   │   ├── (auth)/             # Login, signup, password reset
│   │   ├── (dashboard)/        # Protected workspace
│   │   │   ├── talent-scout/   # Candidate discovery
│   │   │   ├── intelligence/   # Chat agent, analytics
│   │   │   ├── enterprise/     # Interventions, operations
│   │   │   └── settings/       # Workspace, integrations
│   │   ├── api/                # Next.js API routes (proxy, auth)
│   │   └── layout.tsx          # Root layout, providers
│   ├── components/
│   │   ├── ui/                 # Base components (Button, Card, Modal)
│   │   ├── talent/             # TalentCard, TalentScoutView
│   │   ├── intelligence/       # ChatView, SentimentPulse, Analytics
│   │   ├── enterprise/         # Interventions, Approvals
│   │   └── layout/             # Sidebar, Header, WorkspaceShell
│   ├── contexts/               # React Context (Auth, Theme, WebSocket)
│   ├── hooks/                  # Custom hooks (useSWR, useWebSocket)
│   ├── services/               # API client, WebSocket client
│   ├── utils/                  # Helpers, formatters, validators
│   └── config/                 # Environment, constants, version
├── public/                     # Static assets, logos, favicon
└── tests/                      # Jest + React Testing Library + Playwright
```

**Key Patterns**:
- **Server Components** by default, Client Components only where needed (interactivity)
- **SWR** for data fetching with optimistic updates
- **WebSocket** for real-time chat agent events
- **Component Composition** over inheritance
- **Zod** for runtime validation matching backend schemas

### 2. Backend (`server/`)
**Tech**: FastAPI, Python 3.11+, SQLAlchemy 2.0 (SQLModel), Alembic, Pydantic v2

```
server/
├── app/
│   ├── main.py                 # App factory, middleware, lifespan
│   ├── core/
│   │   ├── config.py           # Pydantic Settings (env-driven)
│   │   ├── security.py         # JWT, password hashing, RBAC
│   │   ├── logging_config.py   # Structured JSON logging
│   │   ├── data_policy.py      # PII handling, retention, export
│   │   └── provider_utils.py   # LLM provider abstraction
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py         # Login, register, refresh, SSO
│   │       ├── candidates.py   # CRUD, search, bulk operations
│   │       ├── employees.py    # Directory, profiles, org chart
│   │       ├── analysis.py     # Screening, sentiment, attrition
│   │       ├── chat.py         # Chat agent WebSocket + REST
│   │       ├── enterprise.py   # Interventions, approvals, workflows
│   │       ├── intelligence.py # Team optimization, skills gap
│   │       └── integrations.py # Connector management, webhooks
│   ├── models/
│   │   └── database.py         # SQLModel tables, relationships
│   ├── schemas/
│   │   ├── talent.py           # Candidate, Employee, Screening
│   │   ├── ai.py               # Chat, Analysis, Tool schemas
│   │   └── schemas.py          # Shared, pagination, errors
│   ├── services/
│   │   ├── screening_engine.py # ML scoring + SHAP explanations
│   │   ├── sentiment_analyzer.py # NLP pipeline
│   │   ├── connectors/         # Base + Greenhouse + Workday + Factory
│   │   └── workflow_orchestrator.py # Chat agent 7-tool engine
│   ├── agents/
│   │   ├── manager_agent.py    # Tool orchestration, permissions
│   │   └── tools/              # Search, Read, Modify, Write, Delete, Analyse, Observe
│   ├── workflows/
│   │   └── events.py           # Workflow event definitions
│   └── workers/
│       └── tasks.py            # Celery tasks (async processing)
├── alembic/                    # Database migrations
├── scripts/                    # Operational scripts (seed, train, migrate)
├── tests/
│   ├── unit/                   # Fast, isolated
│   ├── integration/            # Real DB, Redis, Qdrant
│   ├── contract/               # API schema validation
│   └── conftest.py             # Fixtures, test containers
└── requirements.txt            # Pinned dependencies + hashes
```

**Key Patterns**:
- **Dependency Injection** via `Depends()` for DB, auth, config
- **Middleware Stack**: Request ID → CORS → Trusted Host → Auth → Rate Limit → Logging
- **Exception Handlers**: Unified error responses, no stack traces in prod
- **Async First**: `async/await` throughout, sync only for CPU-bound ML
- **Versioned API**: `/api/v1/` prefix, explicit deprecation policy

### 3. Desktop (`desktop/`)
**Tech**: Tauri 2.x, Rust 1.75+, WebView2 (Windows), WebKitGTK (Linux)

```
desktop/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs             # Entry, window config, menu
│   │   ├── commands/           # Tauri commands (screening, auth, sync)
│   │   ├── ipc/                # Type-safe IPC schemas (ts-rs)
│   │   ├── tray.rs             # System tray, notifications
│   │   ├── updater.rs          # Auto-updater with signature verification
│   │   └── auth.rs             # Secure token storage (keyring)
│   ├── Cargo.toml              # Dependencies, features
│   ├── tauri.conf.json         # Window, security, bundle config
│   └── build.rs                # Version embedding, resource compilation
├── src/                        # Minimal frontend (redirect shell)
└── scripts/                    # Build, sign, notarize helpers
```

**Security Model**:
- **Allowlist-only IPC** — No `eval`, no arbitrary code execution
- **Keyring Storage** — Tokens in OS credential manager (not localStorage)
- **CSP** — `default-src 'self'; script-src 'self'; connect-src 'self' https://api.aurelinx.com`
- **Signed Updates** — Ed25519 verification, mandatory on launch

### 4. Connectors Framework
**Location**: `server/app/services/connectors/`

```python
# Base interface (server/app/services/connectors/base.py)
class BaseConnector(ABC):
    """Abstract base for all HR system connectors."""
    
    @property
    @abstractmethod
    def connector_type(self) -> ConnectorType: ...
    
    @abstractmethod
    async def test_connection(self, config: ConnectorConfig) -> ConnectionResult: ...
    
    @abstractmethod
    async def sync_candidates(self, config: ConnectorConfig, since: datetime) -> SyncResult: ...
    
    @abstractmethod
    async def sync_employees(self, config: ConnectorConfig, since: datetime) -> SyncResult: ...
    
    @abstractmethod
    async def handle_webhook(self, payload: dict, headers: dict) -> WebhookResult: ...

# Factory registration (server/app/services/connectors/factory.py)
CONNECTOR_REGISTRY: dict[ConnectorType, type[BaseConnector]] = {
    ConnectorType.GREENHOUSE: GreenhouseConnector,
    ConnectorType.WORKDAY: WorkdayConnector,
    # ConnectorType.LEVER: LeverConnector,  # Planned
}
```

**Adding a Connector**:
1. Implement `BaseConnector` in `connectors/<name>.py`
2. Add config model in `core/config.py` (`<Name>ConnectorSettings`)
3. Register in `factory.py`
4. Write contract tests in `tests/connectors/test_<name>.py`
5. Document in `docs/integrations/<name>.md`

### 5. Chat Agent (7-Tool Architecture)
**Location**: `server/app/agents/`

```
manager_agent.py           # Orchestrates tool execution, permissions, approvals
tools/
├── base.py                # BaseTool interface, result types
├── search_tool.py         # Multi-entity search (candidates, employees, skills, messages)
├── read_tool.py           # Single record read by entity + ID
├── modify_tool.py         # Update fields (admin only)
├── write_tool.py          # Create records (admin only)
├── delete_tool.py         # Deletion with approval workflow
├── analyse_tool.py        # Structured analysis (screening, sentiment, team, data ops)
└── observe_tool.py        # Pattern detection, anomaly alerts, predictions
```

**Execution Flow**:
```
User Message → ManagerAgent → Tool Selection (LLM) → Permission Check → 
Tool Execution → Result Validation → Response Assembly → User
                    ↓
            Approval Required? → WorkflowApproval (30min TTL) → Admin Approve → Execute
```

**Permissions Matrix**:
| Tool | Admin | Member | Viewer |
|------|-------|--------|--------|
| search | ✅ | ✅ | ✅ |
| read | ✅ | ✅ | ✅ |
| modify | ✅ | ❌ | ❌ |
| write | ✅ | ❌ | ❌ |
| delete | ✅ (with approval) | ❌ | ❌ |
| analyse | ✅ | ✅ | ❌ |
| observe | ✅ | ✅ | ❌ |

---

## Data Architecture

### Core Entities (ERD Summary)
```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  Candidate  │       │  Employee   │       │    Job      │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ email (UK)  │       │ email (UK)  │       │ title       │
│ name        │       │ name        │       │ department  │
│ resume_text │       │ role        │       │ requirements│
│ skills[]    │       │ skills[]    │       │ skills[]    │
│ source      │       │ manager_id  │───────│ hiring_mgr  │
│ status      │       │ dept_id     │       │ status      │
└──────┬──────┘       └──────┬──────┘       └──────┬──────┘
       │                     │                     │
       │         ┌───────────┴───────────┐        │
       │         ▼                       ▼        │
       │  ┌─────────────┐           ┌─────────────┐ │
       │  │ Screening   │           │ Sentiment   │ │
       │  │ Result      │           │ Analysis    │ │
       │  ├─────────────┤           ├─────────────┤ │
       │  │ score       │           │ score       │ │
       │  │ breakdown   │           │ drivers     │ │
       │  │ shap_values │           │ trend       │ │
       │  │ explanation │           │ alerts      │ │
       │  └─────────────┘           └─────────────┘ │
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             ▼
                    ┌─────────────────┐
                    │  Audit Log      │
                    ├─────────────────┤
                    │ actor_id        │
                    │ action          │
                    │ entity_type     │
                    │ entity_id       │
                    │ before/after    │
                    │ ip_address      │
                    │ timestamp       │
                    └─────────────────┘
```

### Vector Search (Qdrant Collections)
| Collection | Vector Size | Payload | Use Case |
|------------|-------------|---------|----------|
| `candidates` | 1536 (text-embedding-3-small) | skills, experience, location | Semantic candidate search |
| `employees` | 1536 | skills, projects, feedback | Team building, expertise finder |
| `jobs` | 1536 | requirements, department | Job-candidate matching |
| `messages` | 1536 | channel, sentiment, participants | Knowledge retrieval |

### Data Flow: Candidate Screening
```
1. POST /api/v1/analysis/screen {candidate_id, job_id, weights}
         │
         ▼
2. ScreeningEngine.screen_candidate()
         │
         ├─► Fetch candidate + job + historical screenings
         ├─► Feature engineering (skills match, exp, sentiment, tenure)
         ├─► Model inference (XGBoost + SHAP)
         ├─► Persist ScreeningResult + SHAP values
         ├─► Emit ScreeningCompleted event (WebSocket)
         ▼
3. Return {score, breakdown, shap_explanation, recommendations}
```

---

## Deployment Architecture

### Local Development (Docker Compose)
```yaml
# infra/docker-compose.dev.yml
services:
  postgres:    # Primary DB
  redis:       # Cache + Celery broker
  qdrant:      # Vector search
  backend:     # FastAPI (hot reload)
  frontend:    # Next.js (hot reload)
  worker:      # Celery worker
  scheduler:   # Celery beat
  mailhog:     # Email testing
```

### Production (Kubernetes - Planned)
```
Namespace: aurelinx-prod
├── Ingress (nginx) → TLS, Rate Limit, WAF
├── Deployment: backend (HPA: CPU>70%, custom: queue_depth)
├── Deployment: frontend (static, CDN)
├── StatefulSet: postgres (Patroni for HA)
├── StatefulSet: redis (Sentinel)
├── StatefulSet: qdrant (cluster mode)
├── Deployment: worker (KEDA: queue length)
├── CronJob: scheduler (beat)
├── Secrets: Vault / SealedSecrets
├── ConfigMap: non-sensitive config
├── ServiceMonitor: Prometheus metrics
└── NetworkPolicy: deny-by-default
```

### Environment Configuration
| Environment | Config Source | Secrets |
|-------------|---------------|---------|
| Local | `.env.local` + `docker-compose.dev.yml` | `.env.local` (gitignored) |
| Staging | GitHub Environments + Doppler | Doppler / Vault |
| Production | GitHub Environments + Vault | Vault (dynamic secrets) |

**Required Variables** (see `.env.example`):
```bash
# Core
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/aurelinx
REDIS_URL=redis://host:6379/0
QDRANT_URL=http://host:6333
JWT_SECRET_KEY=<32-byte-base64>          # Rotate quarterly
JWT_ALGORITHM=RS256
JWT_PUBLIC_KEY=<base64-pem>
JWT_PRIVATE_KEY=<base64-pem>

# Auth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Connectors
GREENHOUSE_API_KEY=
WORKDAY_CLIENT_ID=
WORKDAY_CLIENT_SECRET=
WORKDAY_TENANT=

# LLM Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_KEY=

# Monitoring
SENTRY_DSN=
OTEL_EXPORTER_OTLP_ENDPOINT=
```

---

## Observability

### Logging
- **Format**: JSON (structured)
- **Levels**: `DEBUG` (dev), `INFO` (prod), `WARNING`, `ERROR`, `CRITICAL`
- **Fields**: `timestamp`, `level`, `logger`, `message`, `trace_id`, `span_id`, `user_id`, `request_id`
- **PII Redaction**: Automatic via log filter (`email`, `phone`, `ssn`, `api_key` patterns)

### Metrics (Prometheus)
| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | By method, path, status |
| `http_request_duration_seconds` | Histogram | Latency percentiles |
| `active_users` | Gauge | Current authenticated sessions |
| `screening_jobs_total` | Counter | By status (success, failed, pending) |
| `chat_agent_tools_executed` | Counter | By tool, user_role |
| `connector_sync_duration_seconds` | Histogram | By connector |
| `db_connection_pool_usage` | Gauge | Active/idle connections |

### Tracing (OpenTelemetry)
- **Backend**: Auto-instrumentation (FastAPI, SQLAlchemy, Redis, HTTPX)
- **Frontend**: Manual spans for critical user journeys
- **Exporters**: OTLP → Jaeger (dev), Tempo/Grafana (prod)

### Alerting (PrometheusRule examples)
```yaml
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
  for: 2m
  labels: {severity: critical}
  annotations:
    summary: "High 5xx error rate on {{ $labels.path }}"

- alert: ScreeningQueueBacklog
  expr: celery_queue_length{queue="screening"} > 100
  for: 5m
  labels: {severity: warning}
```

---

## Security Architecture

### Authentication Flow
```
1. User → POST /api/v1/auth/login {email, password}
2. Backend → Verify argon2id hash → Generate JWT pair
   - Access: 15min, RS256, claims: {sub, roles, permissions, exp}
   - Refresh: 7d, stored hashed in DB, rotation on use
3. Client → Store access in memory, refresh in httpOnly cookie
4. Requests → Authorization: Bearer <access>
5. Middleware → Verify signature, expiry, revocation list
6. Expiry → POST /api/v1/auth/refresh {refresh_token} → New pair
```

### Authorization Model
```
Permission = Resource + Action + Scope
Resources: candidates, employees, jobs, screenings, interventions, analytics, settings
Actions: read, write, delete, admin, export
Scopes: own, team, department, organization

Role → Permission Set:
- Admin: *:* *:*
- HR Manager: candidates:read,write,delete:org; employees:read:org; screenings:read,export:org
- Hiring Manager: candidates:read,write:team; screenings:read:team; analytics:read:team
- Employee: candidates:read:own; employees:read:own; screenings:read:own
```

### Encryption
| Data | Algorithm | Key Management |
|------|-----------|----------------|
| Database (PII columns) | AES-256-GCM (pgcrypto) | Vault-managed DEK, rotated annually |
| TLS | TLS 1.3 (X25519, AES-256-GCM) | Let's Encrypt / ACME (auto-renew) |
| JWT Signing | RS256 (4096-bit RSA) | Vault, rotated quarterly |
| File Storage | AES-256-GCM | Per-file DEK, KEK in Vault |
| Desktop Tokens | OS Keyring (DPAPI/Keychain/libsecret) | Hardware-backed where available |

---

## Scalability & Performance

### Horizontal Scaling Targets
| Component | Scaling Trigger | Max Replicas | Notes |
|-----------|-----------------|--------------|-------|
| Backend (FastAPI) | CPU > 70%, latency p99 > 500ms | 20 | Stateless, sticky sessions not needed |
| Celery Workers | Queue depth > 50/task | 50 | Per-queue (screening, sync, analytics) |
| Frontend (Next.js) | Requests/sec > 1000 | 10 | Static export + CDN preferred |
| PostgreSQL | Connections > 80% max | Read replicas | PgBouncer for connection pooling |
| Redis | Memory > 80%, latency > 10ms | Cluster mode | Sentinel for HA |
| Qdrant | CPU > 70%, search latency > 200ms | Cluster | Sharding by collection |

### Caching Strategy
| Data | TTL | Invalidation | Store |
|------|-----|--------------|-------|
| User sessions | 15m | On logout/password change | Redis |
| Candidate search results | 5m | On candidate update | Redis |
| Screening results | 1h | On re-screen | Redis + DB |
| Connector configs | 10m | On config update | Redis |
| Embeddings | Permanent | On model version change | Qdrant |

### Database Optimization
- **Indexes**: Composite on `(status, created_at)`, `(skills, location)` via GIN
- **Partitioning**: `audit_logs` by month, `screening_results` by quarter
- **Read Replicas**: Analytics queries routed to replica
- **Connection Pool**: PgBouncer (transaction mode), 100 max connections

---

## Evolution & Decision Log

| Date | Decision | Rationale | ADR |
|------|----------|-----------|-----|
| 2026-08-23 | FastAPI + SQLModel over Django | Async, type safety, ML ecosystem | ADR-001 |
| 2026-08-23 | Next.js App Router over Pages | RSC, streaming, better DX | ADR-002 |
| 2026-08-23 | Tauri over Electron | Binary size, security, Rust ecosystem | ADR-003 |
| 2026-08-23 | Qdrant over pgvector | Scale, filtering, dedicated vector engine | ADR-004 |
| 2026-08-23 | Celery over RQ/Arq | Maturity, scheduling, monitoring | ADR-005 |
| 2026-08-23 | Apache 2.0 license | Enterprise adoption, patent grant | ADR-006 |

*Full ADRs in `docs/adr/`*

---

## Related Documents
- [DEPLOYMENT.md](DEPLOYMENT.md) — Deployment guides
- [ROADMAP.md](ROADMAP.md) — Future architecture evolution
- [CONTRIBUTING.md](CONTRIBUTING.md) — Development workflow
- [SECURITY.md](SECURITY.md) — Threat model, controls