# 01. Admin ID Gate Decommission Notice

01. **Status: Deprecated and Decommissioned**
    - The legacy post-authentication **Admin ID Gate** (`aurelinx_admin_id` / `registration_codes`) has been retired for standard user onboarding.
    - Users can register and sign in directly via email/password or configured OAuth providers without entering a one-time Admin ID code.

02. **Current Access Control:**
    - Access to sensitive administrative operations is now enforced server-side via JWT authentication, `AuthSessionTable` session tracking, `tenant_id` isolation, and `is_admin` role checks.

03. **Legacy Tooling Reference:**
    - The historical code-management script remains at `infra/manage-codes.sh` for reference only and is not required for standard application access.
