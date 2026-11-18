# 04. Connector Capability Matrix, Secrets, and PKCE OAuth

01. **Connector Registry (`server/app/services/connectors/factory.py`):**
    - Outbound mutation proposals are validated against each adapter's declared `supported_actions`. Unimplemented actions fail closed before any external provider HTTP request is sent.

02. **Outbound Action Capability Matrix:**

| Provider | Implemented Outbound Actions | Verification Status |
| --- | --- | --- |
| Greenhouse | `create_requisition`, `move_candidate_stage`, `schedule_interview` | Offline HTTP contract tests |
| Lever | `move_candidate_stage`, `create_candidate_opportunity`, `schedule_interview` | Offline HTTP contract tests |
| Slack | `send_manager_notification` | Offline HTTP contract tests |
| Microsoft Teams | `send_manager_notification` | Offline HTTP contract tests |
| BambooHR | `create_employee`, `update_employee` | Adapter implemented; provider sandbox required |
| HiBob | `create_employee`, `update_employee` | Adapter implemented; provider sandbox required |
| SAP SuccessFactors | `update_employee` | Adapter implemented; provider sandbox required |
| Workday | No outbound action declared | Provider-specific API contract and sandbox approval required |

03. **Connection Lifecycle & Credential Sealing (`server/app/services/connectors/secrets.py`):**
    - An administrator creates a tenant-scoped connection (`POST /api/v1/enterprise/connections`) in `draft` status.
    - Credentials are sealed at rest using **AES-GCM** envelope encryption and decrypted only inside the connector execution path.
    - Once verified (`Verify -> Discover -> Bounded Sync`), invalid records are routed to `quarantine_events` rather than canonical tables.

04. **PKCE OAuth Flow (`server/app/api/v1/oauth.py`):**
    - Start route: `GET /api/v1/oauth/{provider}/start?connection_id=...`
    - Callback route: `GET /api/v1/oauth/{provider}/callback`
    - OAuth `state` (`OAuthStateTable`) is signed, tenant-bound, PKCE-protected, persisted with expiration, and consumed once.
