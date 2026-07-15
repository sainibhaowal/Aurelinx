# Docker Commands

Use `infra/docker-compose.prod.yml` for the production stack.

## Services

- `api`
- `web`
- `worker`
- `scheduler`
- `postgres`
- `redis`
- `qdrant`

## Build And Rebuild

```bash
# Full rebuild of app images
docker compose -f infra/docker-compose.prod.yml build api web worker scheduler

# Full rebuild with no cache
docker compose -f infra/docker-compose.prod.yml build --no-cache api web worker scheduler

# Rebuild and recreate everything
docker compose -f infra/docker-compose.prod.yml up -d --build --force-recreate
```

### Separate Rebuilds

```bash
# Frontend only
docker compose -f infra/docker-compose.prod.yml up -d --build --no-deps web

# Backend API only
docker compose -f infra/docker-compose.prod.yml up -d --build --no-deps api

# Worker only
docker compose -f infra/docker-compose.prod.yml up -d --build --no-deps worker

# Scheduler only
docker compose -f infra/docker-compose.prod.yml up -d --build --no-deps scheduler
```

### Infrastructure Services

`postgres`, `redis`, and `qdrant` are image-based services. They do not have local Dockerfiles in this repo, so use pull/up instead of build.

```bash
docker compose -f infra/docker-compose.prod.yml pull postgres redis qdrant
docker compose -f infra/docker-compose.prod.yml up -d --no-deps postgres redis qdrant
```

## Start, Stop, Restart

```bash
# Start everything
docker compose -f infra/docker-compose.prod.yml up -d

# Restart one service
docker compose -f infra/docker-compose.prod.yml restart api
docker compose -f infra/docker-compose.prod.yml restart web
docker compose -f infra/docker-compose.prod.yml restart worker
docker compose -f infra/docker-compose.prod.yml restart scheduler

# Stop one service
docker compose -f infra/docker-compose.prod.yml stop api
docker compose -f infra/docker-compose.prod.yml stop web

# Stop the full stack
docker compose -f infra/docker-compose.prod.yml down

# Remove one service container only, keep volumes
docker compose -f infra/docker-compose.prod.yml rm -sf api
```

## Inspect Current Stack

```bash
docker compose -f infra/docker-compose.prod.yml ps
docker compose -f infra/docker-compose.prod.yml logs -f api
docker compose -f infra/docker-compose.prod.yml logs -f web
docker compose -f infra/docker-compose.prod.yml logs -f postgres
```

## Prune Old Images And Build Cache

These commands do not remove volumes.

```bash
# Unused images only
docker image prune -f
docker image prune -af

# Build cache only
docker builder prune -f
docker builder prune -af

# Stopped containers, unused networks, dangling images
docker system prune -f
docker system prune -af
```

## Security Notes

- Ingestion API keys are hashed in Postgres and are safe at rest.
- LLM provider keys are not fully safe yet if they are stored in browser localStorage.
- Browser auth tokens are separate from provider secrets.
- If you want provider secrets fully protected, move them into encrypted backend storage and stop persisting them in localStorage.

## API Key System

### User Auth JWT

- Used for app login.
- Issued by the backend auth system.
- Stored by the frontend in browser localStorage as `auth_token`.
- Sent as `Authorization: Bearer <token>`.
- This is the user session token, not an integration secret.

### Integration API Keys

- Used for ingestion and webhook traffic.
- Created by `POST /api/v1/integrations/token`.
- Raw key is returned once only.
- Database stores only `api_key_hash` in Postgres.
- Validation uses `X-API-Key` header.
- Optional payload signing uses `X-Signature` plus `Idempotency-Key`.
- Revocation and rotation are supported.

### Provider Secrets

- LLM provider keys are currently entered in the UI.
- The UI still keeps provider config in browser localStorage.
- That means they are not yet fully protected at rest by the backend.
- If you want proper secret storage, move provider credentials into backend-managed encrypted storage and stop saving them in localStorage.

## Production Notes

- PostgreSQL is the primary database.
- The app schema is `app`.
- Redis is used for cache/queue work.
- Qdrant is included for vector/search workloads if needed.
- Runtime logs should go to stdout only.
- No SQLite should be used in the Docker runtime path.
