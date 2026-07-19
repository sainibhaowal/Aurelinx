# Aurelinx Docker Infra

This directory contains the production-oriented Docker setup for Aurelinx.

## Files

- `docker-compose.prod.yml`: full stack with `web`, `api`, `worker`, `scheduler`, `postgres`, `redis`, and `qdrant`
- `backend.Dockerfile`: FastAPI image with Alembic migration startup
- `frontend.Dockerfile`: Next.js standalone production image
- `.env.production.example`: concrete environment template with PostgreSQL/Redis/Qdrant URLs
- `postgres/init/001-init.sql`: PostgreSQL schema bootstrap

## Usage

```bash
cd infra
cp .env.production.example .env.production
docker compose -f docker-compose.prod.yml up --build -d
```

## Notes

- Runtime is configured for PostgreSQL, Redis, and Qdrant. No Docker service uses SQLite.
- PostgreSQL tables are created in schema `app` via the database `search_path`.
- Runtime application schema is `app`; PostgreSQL `search_path` is set so all tables and migrations land there.
- Logs go to stdout only. Chat uploads use a named Docker volume at `/app/data/chat`, not the repo.
- The API container runs `alembic upgrade head` before starting Uvicorn.
- Host ports default to `3100` for `web`, `5100` for `api`, `55433` for PostgreSQL, `6380` for Redis, and `6335/6336` for Qdrant.
