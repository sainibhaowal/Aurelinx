# Aurelinx Production Tenant and Provider Runbook

## Purpose

This runbook defines the boundary between local/sample data and real company
data. The ZIP in `Docs/datasets/` is demo data for development and testing. It
does not prove that Jira, Slack, Workday, or any other provider is connected.

## Required production sequence

1. Create the company tenant and its administrator.
2. Verify tenant membership and authentication claims.
3. Configure provider credentials in the server secret manager. Never put them
   in source code, Markdown, CSV/ZIP files, browser storage, logs, or chat.
4. Register a tenant-owned connection in **Data Ops → System Integrations**.
5. Verify the provider connection using least-privilege credentials.
6. Discover provider metadata and review the returned projects, channels, or
   fields.
7. Define the tenant's data contract and field mappings.
8. Run a limited sync against a documented test population.
9. Review source evidence, freshness, duplicates, conflicts, and quarantine.
10. Run cross-tenant isolation tests before enabling production access.
11. Enable scheduled sync only after the review and rollback procedure pass.

## Provider requirements

### Jira

Use the company's Jira Cloud base URL, a dedicated service account email, an
API token, and only the required project/issue read scopes. Limit the initial
JQL to a test project or test issue population.

### Slack

Install an approved Slack app in the company's workspace, grant only the bot
scopes required for the selected channels, add the bot to those channels, and
record the approved channel IDs. Do not ingest the entire workspace by
default.

### Workday

Use the company's tenant API base URL, the exact versioned workers endpoint,
and an OAuth client or access token with the minimum worker-read scopes. Test
against a limited worker population where the provider supports it.

## Data and security rules

- Every application record, provider connection, evidence row, workflow run,
  approval, audit event, and aggregate must carry and enforce `tenant_id`.
- A request header is not proof of tenant membership. The tenant must come
  from authenticated membership and be checked server-side.
- Provider credentials are decrypted only inside the connector execution path.
- Raw provider payloads and secrets must not be sent to the language model.
- A no-match query returns no records; unrelated recent records are never
  substituted.
- External writes, updates, and deletes require explicit human approval.
- Sample data must remain labeled as demo/local and must not be presented as
  live provider evidence.

## Acceptance evidence

Record the following for each test connection:

- tenant and test administrator;
- provider, connection ID, scope, and credential reference;
- verification result and timestamp;
- discovered metadata;
- sync job ID, source counts, canonical upserts, and quarantined rows;
- freshness timestamp and source evidence IDs;
- approval ID and audit event for every external action;
- proof that a second tenant cannot read, analyze, modify, approve, or delete
  the first tenant's records.

## Current repository status

The local sample dataset and offline connector harness are suitable for
development tests. Real provider verification still requires company-owned
credentials, provider permissions, a dedicated test tenant, and an isolated
PostgreSQL test database. Do not call a connection live until the acceptance
evidence above exists.
