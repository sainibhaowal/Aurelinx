# 03. Workers, Scheduler, and Runtime Execution

01. **Process Separation:**
    - `api` serves HTTP/SSE traffic on port `5000` with `IN_PROCESS_SCHEDULER="false"` so periodic background loops do not block or duplicate work inside Uvicorn.
    - `worker` (`server/scripts/retry_worker.py`) processes pending `integration_webhook_events` whose `next_retry_at <= now` and `attempts < 5`.
    - `scheduler` (`server/scripts/retry_scheduler.py` / `connector_scheduler.py`) polls due retry windows and scheduled connector syncs.

02. **Exponential Retry Backoff:**
    - Failed webhook/integration deliveries increment `attempts` and compute the next retry timestamp:
    $$\Delta t_{\text{retry}}(k) = \min\left(3600,\; 30 \cdot 2^{k}\right) \text{ seconds}$$
    where $k = \text{attempts}$ (`0` to `4`). Events reaching `attempts >= 5` transition to `status = "failed"`.

03. **Startup & Health Sequence:**
    - `api` waits for PostgreSQL TCP readiness (`postgres:5432`), executes `alembic upgrade head`, and starts Uvicorn.
    - Docker healthcheck probes `http://127.0.0.1:5000/health` every 10s (`web` depends on `api` being `service_healthy`).
