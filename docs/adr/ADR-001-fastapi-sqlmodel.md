# ADR-001: FastAPI + SQLModel for Backend

**Status**: Accepted  
**Date**: 2026-08-23  
**Deciders**: @ravindersingh  
**Technical Story**: Initial architecture decision

## Context

Need to choose a backend framework for the Aurelinx HR intelligence platform. Requirements:
- Async-first for high concurrency (WebSocket chat agent, background workers)
- Strong type safety for maintainability
- Excellent ML/AI ecosystem integration (screening engine, sentiment analysis)
- Auto-generated OpenAPI docs for frontend consumption
- Production-ready with good observability

Options considered:
1. **FastAPI + SQLModel** (Python 3.11+)
2. **Django + Django REST Framework** (Python)
3. **Node.js + NestJS + Prisma** (TypeScript)
4. **Go + Gin + GORM** (Go)
5. **Rust + Actix-web + SeaORM** (Rust)

## Decision

**Choose FastAPI + SQLModel** for the backend.

## Consequences

### Positive
- Native async/await support throughout
- Pydantic v2 validation integrated (request/response + database models)
- SQLModel = SQLAlchemy + Pydantic = single source of truth for schemas
- Auto-generated OpenAPI/Swagger docs at `/docs`
- Excellent ML ecosystem (scikit-learn, XGBoost, PyTorch, HuggingFace)
- Large talent pool (Python is #1 for ML/AI)
- Fast development velocity

### Negative
- Python GIL limits CPU-bound parallelism (mitigated by multiprocessing/workers)
- Slower raw throughput than Go/Rust (acceptable for our use case)
- Dependency management complexity (mitigated by `pip-tools`/`uv`)

### Risks
- Async database drivers less mature than sync (mitigated: asyncpg is production-ready)
- SQLModel still pre-1.0 (mitigated: built on SQLAlchemy 2.0, stable)

## Alternatives Considered

| Alternative | Pros | Cons | Why Not Chosen |
|-------------|------|------|----------------|
| Django | Batteries included, admin, auth | Sync-first, heavier, no native async | Chat agent needs WebSocket + async |
| NestJS | TypeScript end-to-end, DI | ML ecosystem weaker, more boilerplate | Screening engine needs Python ML |
| Go | Performance, concurrency | ML ecosystem immature, verbose | Time-to-market for ML features |
| Rust | Performance, safety | Steep learning curve, slower dev | Team expertise in Python/TS |

## Implementation Notes

- Use `uvicorn` with `gunicorn` workers for production
- `asyncpg` for PostgreSQL, `redis.asyncio` for Redis
- SQLModel with `SQLAlchemy 2.0` style (select/async_session)
- Dependency injection via FastAPI `Depends()`

## Related ADRs

- ADR-002: Next.js App Router for Frontend
- ADR-003: Tauri for Desktop
- ADR-004: Qdrant for Vector Search
- ADR-005: Celery for Background Workers
