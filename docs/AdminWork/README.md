# Aurelinx: Administration, Security and Access Control (`Docs/AdminWork`)

01. **Purpose:** Documents authentication, session lifecycle, role-based access control (`is_admin`), tenant isolation, and legacy access notices.
02. **Audience:** System administrators, security reviewers, and public GitHub contributors.
03. **Structure:**
    - `01_authentication_and_access/`: Current authentication, session, RBAC, and tenant isolation architecture.
    - `02_deprecated_and_legacy/`: Historical decommission notices (such as the retired Admin ID gate).

---

## Navigation Index

01. [`01_authentication_and_access/01_auth_and_session_architecture.md`](./01_authentication_and_access/01_auth_and_session_architecture.md): Password hashing, JWT access tokens, refresh sessions, and OAuth configuration.
02. [`01_authentication_and_access/02_rbac_and_tenant_isolation.md`](./01_authentication_and_access/02_rbac_and_tenant_isolation.md): Server-side `tenant_id` enforcement and admin-only route protection.
03. [`02_deprecated_and_legacy/01_admin_id_gate_decommission_notice.md`](./02_deprecated_and_legacy/01_admin_id_gate_decommission_notice.md): Notice documenting the removal of the legacy Admin ID gate.
