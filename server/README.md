# Aurelinx Backend — API, Workers & Intelligence

The backend of the **Aurelinx Executive Talent Intelligence Platform**: a FastAPI service providing authentication, enterprise talent analytics, AI chat over enterprise data, workforce intelligence, candidate screening, and document processing — backed by PostgreSQL, Redis (RQ workers), and Qdrant (vector search).

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.115 + Uvicorn |
| Data models | SQLModel (SQLAlchemy 2.0) + Pydantic v2 |
| Database | PostgreSQL 16 (schema `app`) |
| Migrations | Alembic |
| Vector search | Qdrant |
| Cache / queues | Redis 7 (+ RQ background workers) |
| Auth | JWT (python-jose), bcrypt / Argon2 password hashing |
| Rate limiting | SlowAPI |
| Testing | pytest + pytest-asyncio |
| Linting / format | Ruff + Black (configured in `pyproject.toml`) |
| Runtime | Python 3.12 (slim Docker image) |

---

## Repository layout

```
server/
├── app/
│   ├── main.py            # FastAPI app entrypoint (middleware, routes, health)
│   ├── core/              # Settings (config.py), security, logging
│   ├── api/v1/            # API routers: auth, employees, candidates, analysis,
│   │                      #   chat, intelligence, enterprise, integrations, lean_enterprise
│   ├── models/            # SQLModel table definitions (users, employees, candidates,
│   │                      #   skills, experiences, registration codes, …)
│   ├── schemas/           # Pydantic request/response schemas
│   ├── services/          # Business logic: sentiment analyzer, screening engine,
│   │                      #   connectors (external systems)
│   ├── agents/            # Agent/LLM orchestration layer
│   ├── workflows/         # Workflow orchestration
├── worker/
│   └── tasks.py           # Redis RQ background task definitions
├── scripts/               # Operational scripts (sample data, retry wrappers,
│   │                      #   env generation, admin tools)
├── alembic/               # Migration environment + versions
├── tests/                 # pytest suites (integration, intelligence, workflows)
├── requirements.txt       # Python dependencies
└── pyproject.toml         # Ruff / Black / pytest configuration
```

---

## Running locally (outside Docker)

Requires a running PostgreSQL (and Redis/Qdrant for full features).

```bash
cd server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL="postgresql+psycopg://aurelinx:<password>@localhost:55433/aurelinx_db?options=-csearch_path%3Dapp,public"
uvicorn app.main:app --reload --port 5000
```

API docs: http://localhost:5000/docs

> **Recommended local workflow:** use Docker Compose (see [`infra/README.md`](../infra/README.md)) — it provisions PostgreSQL, Redis, Qdrant, the API, worker, scheduler, and frontend with a single command.

---

## API surface (v1)

| Router | Prefix | Purpose |
|---|---|---|
| `auth` | `/api/v1/auth` | Login, registration (invite codes), token refresh |
| `employees` | `/api/v1/employees` | Employee records, departments, skills, experiences |
| `candidates` | `/api/v1/candidates` | Candidate pipeline, screening |
| `analysis` | `/api/v1/analysis` | Attrition risk, retention analytics |
| `intelligence` | `/api/v1/intelligence` | Workforce intelligence & team optimization |
| `enterprise` | `/api/v1/enterprise` | Enterprise-wide insights |
| `chat` | `/api/v1/chat` | AI chat with tools (search/analyse over enterprise data) |
| `integrations` | `/api/v1/integrations` | External system connectors & webhook events |
| `lean_enterprise` | `/api/v1/lean_enterprise` | Lean enterprise operations |
| health | `/health` | Health check (exempt from HTTPS enforcement; reports deployed version) |

---

## Background workers

- **`worker`** — Redis RQ worker executing queued tasks (`worker/tasks.py`).
- **`scheduler`** — lean periodic scheduler for recurring jobs.
- Both are separate containers sharing the backend image (see [`infra/README.md`](../infra/README.md)).

---

## Database migrations

```bash
alembic upgrade head
```

Migrations run automatically on API container startup in production.

---

## Testing & code quality

```bash
cd server
pytest                    # run test suite
ruff check .              # lint
black .                   # format
```

---

## Production

The backend is built via `infra/backend.Dockerfile` and published to **GHCR** as `ghcr.io/sainibhaowal/aurelinx-backend`. Deployments are fully automated by the GitHub Actions release pipeline on `v*` tags (see [`../README.md`](../README.md) and [`Docs/vps_deployment_guide.md`](../Docs/vps_deployment_guide.md)).

---

## Related

- Frontend: [`client/`](../client/README.md)
- Desktop shell: [`desktop/`](../desktop/README.md)
- Infrastructure: [`infra/`](../infra/README.md)