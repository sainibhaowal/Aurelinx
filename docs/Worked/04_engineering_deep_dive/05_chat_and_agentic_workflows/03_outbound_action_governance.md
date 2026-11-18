# 03. Outbound Action Governance and Invariants

01. **Governed Execution Pipeline (`server/app/api/v1/actions.py`):**
    - The AI agent never calls an external HRIS, ATS, or messaging provider directly. Every outbound mutation passes through a strict, auditable approval pipeline:

```text
native tool call
  -> payload and role validation
  -> tenant/provider connection validation
  -> idempotent action proposal (external_action_requests)
  -> human admin approval (workflow_approvals)
  -> governed dispatcher
  -> provider attempt and read-back result (external_action_attempts)
  -> audit/workflow trace
```

02. **Mandatory Security Invariants:**
    - Every request is authenticated and strictly scoped by `tenant_id`.
    - Every outbound write carries an `idempotency_key` and an immutable payload hash.
    - Secrets are rejected from action payloads and remain isolated inside encrypted connection records.
    - Non-admin members cannot create, approve, or execute outbound mutation actions.
    - Deletions and employment-impacting changes require an explicit `workflow_approvals` record.
    - Provider failures are recorded in `external_action_attempts` and never reported as successful; unregistered provider actions fail closed.
