# Administrator Guide: Aurelinx Admin ID Gating System

Aurelinx is protected by a secure, invitation-only **Post-Authentication Admin ID Gate**. Users can register freely or perform OAuth login via Google/GitHub, but they are gated from viewing the application workspace until they verify a valid **Admin ID** (access code).

---

## 🔒 How the Gating Architecture Works

1. **Decoupled Registration**:
   - Users can register using email and password, Google OAuth, or GitHub OAuth without inputting an Admin ID upfront.
   - This ensures a frictionless onboarding flow and flawless OAuth callbacks.
2. **Post-Authentication Gating**:
   - Once authenticated, if the browser session does not contain a verified `aurelinx_admin_id`, the user is intercepted by the **Verify Admin Access** gate screen inside `/app`.
   - The user is prevented from viewing the metrics or interacting with the dashboard until they enter a valid Admin ID code.
3. **One-Time Code Consumption**:
   - When a user enters an Admin ID, the backend verifies the code and consumes it, linking the code to that user's email.
   - Once linked, the code is marked as `is_used = true` and cannot be consumed by other users.
4. **Persistent Browser Session**:
   - The verified code is stored in the browser's `localStorage` as `aurelinx_admin_id`.
   - The next time the user logs in from the same device, the app automatically checks the code against `/verify-gate` in the background and unlocks the dashboard instantly.

---

## 💻 How to Manage Admin IDs from the VPS

A secure CLI management tool is deployed in the `infra/` directory.

### 1. Connect to your VPS
Log in to your server:
```bash
ssh root@144.91.118.196
```

### 2. Navigate to the Infrastructure Directory
```bash
cd /opt/aurelinx/infra
```

### 3. Run the Management Commands

#### A. Generate a New Secure Admin ID
To generate a secure 12-character Admin ID containing uppercase/lowercase letters, digits, and symbols:
```bash
bash ./manage-codes.sh --generate
```

*Example Output:*
```
==================================================
🎉 SECURE ADMIN ID GENERATED SUCCESSFULLY
==================================================
ID:          e67f70b4-3a95-46f9-8476-eb3479a957b4
Admin ID:    xP3!d9$qLmR*
==================================================
⚠️  Copy and share this code with the user. It cannot be shown again!
==================================================
```

#### B. List All Admin IDs and Statuses
To check which codes are active, which are used, and which email addresses registered with them:
```bash
bash ./manage-codes.sh --list
```

#### C. Revoke or Delete an Admin ID
To revoke a code so it can no longer be used to access the login or register pages, copy its **CODE ID (UUID)** from the list command and run:
```bash
bash ./manage-codes.sh --revoke e67f70b4-3a95-46f9-8476-eb3479a957b4
```

---

## 🚀 Deployment Steps (Applying Changes to Production)

To apply this security system to your live website, execute the following commands on the VPS:

1. **Pull the latest codebase updates**:
   ```bash
   cd /opt/aurelinx
   git pull origin master
   ```
2. **Rebuild and restart the container services**:
   ```bash
   docker compose -f infra/docker-compose.prod.yml up -d --build --no-deps web api worker scheduler
   ```
3. **Make the management script executable (if needed)**:
   ```bash
   chmod +x /opt/aurelinx/infra/manage-codes.sh
   ```
