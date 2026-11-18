# 01. Authentication and Session Architecture

01. **Credential Security (`server/app/core/security.py`):**
    - Passwords are hashed using **Argon2** (`argon2-cffi` / `passlib`).
    - Access tokens are signed JWTs carrying `sub` (user UUID), `email`, `tenant_id`, and `is_admin`.

02. **Refresh Session Lifecycle (`auth_sessions`):**
    - Refresh tokens are backed by database-persisted `AuthSessionTable` records with explicit expiration (`014_add_auth_sessions.py`, `015_require_auth_session_expiry.py`).
    - Stale or revoked refresh credentials are rejected cleanly (`v0.2.9` auth fix).

03. **Optional External OAuth (`server/app/api/v1/oauth.py`):**
    - Supports Google OAuth and GitHub OAuth when `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` or `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` are configured in the server environment.
    - Returns HTTP `400` with a clear configuration message when a provider's credentials are not set.
