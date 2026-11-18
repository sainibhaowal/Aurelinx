# 01. Local Docker Stack Runbook

01. **Prerequisites:**
    - Docker Engine 24+ with Docker Compose v2+.
    - Local environment file `infra/.env.local` (generated via `bash server/scripts/generate-env-local.sh`).

02. **Service Architecture (`infra/docker-compose.local.yml`):**
    - `postgres` (`postgres:16-alpine`): Primary relational database (`55432 -> 5432`).
    - `redis` (`redis:7-alpine`): Cache, job queues, and pub/sub (`56379 -> 6379`).
    - `qdrant` (`qdrant/qdrant:v1.13.6`): Vector store (`6333` HTTP, `6334` gRPC).
    - `api` (`infra/backend.Dockerfile`): Runs `alembic upgrade head` and Uvicorn on port `5100 -> 5000` with `IN_PROCESS_SCHEDULER=false`.
    - `worker` & `scheduler` (`infra/backend.Dockerfile`): Dedicated background retry worker and scheduler containers.
    - `web` (`infra/frontend.Dockerfile`): Next.js 15 standalone server on port `3100 -> 3000`.
    - `caddy` (optional `proxy` profile): Local reverse proxy if host ports `80`/`443` are free.

03. **Build and Start Commands:**
    ```bash
    cd infra
    docker compose -f docker-compose.local.yml --env-file .env.local up -d --build
    ```
    - To include local Caddy on ports 80/443:
    ```bash
    docker compose -f docker-compose.local.yml --env-file .env.local --profile proxy up -d --build
    ```

04. **Health Verification:**
    - API Health: `curl -fsS http://localhost:5100/health`
    - Frontend App: `http://localhost:3100/app` (or `http://localhost:3100/login`)
    - Container Status: `docker compose -f docker-compose.local.yml --env-file .env.local ps`
