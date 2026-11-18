# 01. Compliance Policies and Audit Logs

01. **Compliance Policy Packs (`GET/POST /api/v1/lean/policy/packs`, `POST /api/v1/lean/policy/check`):**
    - `CompliancePolicyTable` defines regional governance rules (`region`, `action_type`, `min_confidence`, `requires_approval`, `blocked_if_missing_evidence`, `blocked_actions`).
    - `_policy_check()` evaluates proposed actions (e.g., `intervention`, `export`, `sync`) against active tenant policies and blocks non-compliant actions with explicit reasons.

02. **Audit Logging (`GET /api/v1/lean/audit-events`, `AuditLogTable`):**
    - Records tenant-scoped administrative and data operations (`EXPORT_DATASET_BUNDLE`, policy checks, model promotions, integration changes) with `user_id`, `action`, `resource_type`, `resource_id`, `details`, `ip_address`, and `created_at`.
