# 02. RBAC and Tenant Isolation

01. **Server-Side Tenant Enforcement (`tenant_id`):**
    - Every core workforce, intelligence, chat, workflow, integration, and privacy table includes a `tenant_id` column.
    - `tenant_id` is derived from authenticated JWT/session claims on the server, never trusted from arbitrary client request headers.

02. **Role-Based Access Control (`is_admin`):**
    - Standard authenticated users can access workspace dashboards, directories, and intelligence queries within their tenant.
    - Administrative routes require `is_admin = true` (returning HTTP `403 Not enough permissions` for non-admin users), including:
      - Integration API keys and logs (`/api/v1/integrations/tokens`, `/api/v1/integrations/logs`)
      - Privacy consents, exports, retention policies, and sensitive-field rules (`/api/v1/privacy/*`)
      - Mutating workflow approvals (`workflow_approvals`)

03. **Secret Handling Rules:**
    - Environment secrets (`infra/.env.local`, `.env.production`) are excluded from git via `.gitignore`.
    - Integration API keys are hashed at rest in PostgreSQL (`integration_api_keys`) and returned in plaintext only once upon creation.
