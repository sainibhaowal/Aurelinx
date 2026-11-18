# 02. System Integrations and Webhook Pipeline

01. **Connector Registry (`server/app/api/v1/enterprise.py`, `server/app/services/connectors/`):**
    - `GET /api/v1/enterprise/connection-providers`: Lists supported providers (`workday`, `greenhouse`, `slack`, `jira`, etc.) and their auth modes (`oauth2`, `basic`, `api_key`).
    - Connection lifecycle: `POST /enterprise/connections` -> `POST /connections/{id}/verify` -> `GET /connections/{id}/discover` -> `POST /connections/{id}/sync` (plus SSE `/sync/stream`).

02. **Webhook Ingestion & Security (`server/app/api/v1/integrations.py`):**
    - Admin-managed API keys (`POST /api/v1/integrations/token`, `GET /tokens`, `DELETE /token/{id}`, `POST /token/{id}/rotate`) stored as cryptographic hashes (`api_key_hash`).
    - Incoming webhooks (`POST /api/v1/integrations/workday`, `/slack`, `/jira`) validate:
      - `X-API-Key` header against active non-expired keys.
      - Optional HMAC-SHA256 `X-Signature` verification over the raw request body.
      - `Idempotency-Key` uniqueness constraint in `integration_webhook_events` to prevent duplicate processing.

03. **Retry & Audit Logs:**
    - Failed webhook events are queued for `retry_worker.py` (`GET /api/v1/integrations/logs`, `GET /api/v1/integrations/events`).
