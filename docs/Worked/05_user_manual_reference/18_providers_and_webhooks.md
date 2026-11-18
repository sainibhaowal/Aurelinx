# Providers and Webhooks

## 01. Providers & Webhook Registry

Data Ops supports provider API connections for configured connectors and separate inbound webhooks. API connections pull records when you run or schedule a sync; webhooks receive signed events pushed by another system. A successful connection only confirms access. Check the sync counts, mappings, quarantine, and downstream records to confirm which data was actually imported.

### Ingestion Webhooks

**Slack Morale API** Endpoint: `/api/v1/integrations/slack`

Accepts a precomputed sentiment score and message count for a matched employee. This endpoint does not analyze Slack text or automatically change the employee's risk flag.

**Workday HRIS Sync** Endpoint: `/api/v1/integrations/workday`

Processes hire, update, and promotion payloads, including employee identity, department, role, and new skill records.

**Jira Activity API** Endpoint: `/api/v1/integrations/jira`

Records dated reporter-to-assignee events for ONA when both employees resolve inside the same tenant.

### How to Integrate

- Create an ingestion API token in Settings ➔ Providers & Webhooks. Copy the raw key immediately; it is shown only once.
- Configure a source-side webhook, middleware job, or custom service to POST events to the matching Aurelinx endpoint.
- Add header `X-API-Key: [your_api_key]` on webhook requests.
- Include `X-Signature` as `sha256=<hex>` , where the hex value is the SHA-256 HMAC of the exact body using the API key as secret. All three webhook endpoints require this signature.
### AI / LLM Provider Setup

**Supported provider families**

Choose from Anthropic, OpenAI-Compatible, Google, Groq, LM Studio, Ollama, OpenAI API, or OpenCode Zen. Hosted providers normally require a secret; LM Studio and Ollama use local loopback runtimes and do not require an API key.

Use **Navigator** to review configured runtimes. Only one linked model is marked active for the workspace at a time.

**Connection lifecycle**

- Open Settings → AI Providers and select a family with **+** .
- Confirm authentication protocol and runtime/base URL.
- Enter the secret when required; local runtimes use their loopback URL.
- Refresh model discovery, search the returned models, and select one.
- Run Test Ping, confirm the response, then Link/activate the connection.
**Models, keys, and failure states**

Model discovery is requested from the configured endpoint when the URL/token changes or when Refresh Discovery is selected. If live discovery fails, the interface may show predefined model options; treat those as selectable defaults, not proof that the remote model is reachable.

Test Ping is the connectivity check. “Connected” means the check succeeded; “Offline” or an error means verify URL, model name, credentials, network access, local service availability, and provider limits. Never paste secrets into chat, screenshots, logs, or webhook payloads. Rotate any exposed key.

### Webhook delivery, idempotency, and monitoring

**API key registry**

In the Integrations console, create a named ingestion token, copy the generated secret immediately, and store it in the source system’s secret manager. Tokens can be listed, rotated, or revoked by authorized administrators. A revoked or expired token must not be reused.

Use `X-API-Key` for authentication and `X-Signature` for the SHA-256 HMAC of the exact request body using the API token as the secret.

**Delivery lifecycle**

Send the JSON payload to the selected endpoint. The service authenticates and validates it, records the webhook event, applies the source-specific update, and marks success or failure. Include an `Idempotency-Key` so retries do not create duplicate effects. The HMAC signature must be calculated from the exact body bytes sent; changing whitespace or field order after signing can invalidate it.

Review Integration Logs for processing status and Webhook Events for delivery history, endpoint, timestamps, and error details. Retry transient failures with the same idempotency key; fix authentication or schema errors before retrying.

**Source-specific behavior**

- **Slack:** the API connector stores accessible message records as source evidence; it does not score message sentiment. The sentiment webhook accepts a score produced elsewhere, validates it from 0 to 1, and updates the stored score without changing the risk flag. Slack messages do not automatically create ONA edges.
- **Jira:** API sync can create a dated reporter-to-assignee collaboration event when both emails match employees in the tenant. Treat this as an issue-based proxy, not proof of direct communication. Jira may withhold email addresses depending on account permissions.
- **Workday:** sends an `employee` object with a required email plus optional full name, department, role, and skills; `action: hire` creates a new record and other actions update an existing or newly initialized profile. A live worker profile is not historical career data: Career Markov still needs dated employee role records. Lifecycle dates and compensation units must be returned by the configured source before retention or budget analyses can use them.
### Integration Harness & End-to-End Proof

**What the automated harness proves**

- Provider authentication request shapes and credential boundaries.
- Jira page traversal, Slack cursor traversal, and Workday offset traversal.
- Canonical normalization, retry handling, and encrypted-secret non-leakage.
- Worker entrypoint and durable scheduler wiring are import-tested without vendor calls.
**How administrators prove a live tenant**

- Run the offline connector harness in CI: `cd server && PYTHONPATH=. pytest -q tests/test_connector_harness.py` .
- Start PostgreSQL, Redis, Qdrant, API, worker, and connector scheduler.
- Create the connection as an administrator, then run Verify Connection.
- Run Discover Metadata and compare returned fields/projects/channels to vendor access.
- Define the contract and mappings, run Pipeline Sync, and reconcile bronze, canonical, and quarantine counts.
- Confirm the audit event, sync job, retry behavior, and downstream dashboard refresh.
**Harness boundary:** automated tests never use real company data or credentials. The live-tenant runbook is the final acceptance test and must use a least-privilege service account, a limited test project/channel/worker population, and a documented rollback/credential-revocation procedure.

**Public-facing trust and privacy guidance**

Providers and integrations may process workforce, candidate, sentiment, compensation, or collaboration data. Obtain the required organizational consent and legal basis, minimize fields, restrict tenant/admin access, configure retention, and explain automated processing to affected users where required.

Provider configuration is currently saved in the browser's local storage for this workspace UI; it is not a server-side secret vault. Use a trusted device, do not share browser profiles, avoid screenshots, and remove or rotate keys when access changes. Integration API tokens are different: the server stores only their hash and shows the raw token once.

A successful webhook or connected model does not mean the resulting data is accurate. Check source freshness, schema mapping, duplicate handling, logs, quarantine, model governance, and audit evidence before relying on downstream dashboards or decisions.
