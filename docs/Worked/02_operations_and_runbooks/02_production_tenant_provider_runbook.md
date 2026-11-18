# 02. Production Tenant and Provider Runbook

01. **Purpose and Data Boundary:**
    - Defines the strict boundary between local/demo datasets (`Docs/datasets/`) and live company data.
    - Uploaded demo bundles are synthetic/public benchmark data and never prove that Jira, Slack, Workday, or Greenhouse are connected.

02. **Required Production Onboarding Sequence:**
    - Create the company tenant and its administrator account.
    - Verify tenant membership and server-side authentication claims.
    - Store provider credentials in the server secret manager (never in source code, Markdown, CSV/ZIP files, browser storage, or logs).
    - Register a tenant-owned connection in **Enterprise Ops -> Data Pipelines -> System Integrations**.
    - Verify connectivity with least-privilege credentials, discover metadata, and define the tenant's data contract and field mappings.
    - Run a scoped sync against a test population, review quarantine and freshness, and verify cross-tenant isolation before enabling scheduled syncs.

03. **Provider Scope Rules:**
    - **Jira:** Dedicated service account email, API token, read-only project/issue scopes, and scoped JQL.
    - **Slack:** Approved Slack app with minimal channel-read bot scopes; ingest only approved channel IDs.
    - **Workday:** Tenant API base URL, versioned workers endpoint, and minimal worker-read OAuth client scopes.

04. **Data Security and Isolation Rules:**
    - Every application record, provider connection, evidence row, workflow run, approval, and audit event must enforce `tenant_id` server-side.
    - Client headers are never trusted as proof of tenant membership; `tenant_id` must come from authenticated session/JWT claims.
    - Raw provider payloads and secrets must never be sent to an LLM.
    - External writes, updates, and deletes require explicit human approval (`workflow_approvals`).
