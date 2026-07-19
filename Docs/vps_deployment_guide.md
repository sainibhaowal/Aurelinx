# Production Deployment Guide: Aurelinx on VPS

This guide provides clean, step-by-step instructions to deploy and update the Aurelinx HR Intelligence Platform on your VPS at **144.91.118.196**.

---

## 🛠️ Prerequisites

Make sure you are logged into your VPS as `root`. If Docker or Docker Compose is not installed, install them using:

```bash
# Update packages and install Docker
apt-get update && apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg lsb-release

# Install Docker Engine and Compose
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

---

## 🚀 Initial setup & Clone

Clone the codebase onto your VPS:

```bash
# Clone the repository directly to /opt/aurelinx
git clone https://github.com/sainibhaowal/Aurelinx.git /opt/aurelinx

# Navigate to the project directory
cd /opt/aurelinx
```

---

## ⚙️ Configuration (.env.production)

1. Navigate to the `infra/` folder:
   ```bash
   cd /opt/aurelinx/infra
   ```
2. Create the production environment file from the example template:
   ```bash
   cp .env.production.example .env.production
   ```
3. Open `.env.production` for editing:
   ```bash
   nano .env.production
   ```

### Core Settings to Update:
* **SITE_ADDRESS**: Your new domain (e.g. `https://aurelinx.com`). Caddy will automatically secure it with Let's Encrypt SSL.
* **NEXT_PUBLIC_API_URL**: Set to `https://your-new-domain.com`.
* **FRONTEND_URL**: Set to `https://your-new-domain.com`.
* **ALLOWED_ORIGINS**: Set to `https://your-new-domain.com`.
* **POSTGRES_DB**: Set to `aurelinx_db`.
* **POSTGRES_USER**: Set to `aurelinx`.
* **POSTGRES_PASSWORD**: Set a secure database password.
* **DATABASE_URL**: Update with the new username, database name, and password.

---

## 🏗️ How to Deploy / Update Website (Main Command)

Always use these commands to pull updates and rebuild the Aurelinx stack on the VPS:

```bash
# Navigate to the repo
cd /opt/aurelinx

# Pull latest code
git pull origin main

# Rebuild and start container services in background
docker compose -f infra/docker-compose.prod.yml up -d --build --no-deps
```

---

## 🗄️ Database Initialization & Seeding

The first time you deploy, or if you reset your database, initialize the default administrator roles and schema data:

```bash
# Populate default Aurelinx Admin accounts and intelligence seeds
docker compose -f infra/docker-compose.prod.yml exec api python -m app.core.seed_data
```

* **Admin Username**: `admin@aurelinx.com`
* **Admin Password**: `AdminPassword123`

---

## 🔍 Useful Maintenance Commands

* **Stop Application**:
  ```bash
  docker compose -f infra/docker-compose.prod.yml down
  ```
* **View Container Status**:
  ```bash
  docker compose -f infra/docker-compose.prod.yml ps
  ```
* **View Live Logs**:
  ```bash
  docker compose -f infra/docker-compose.prod.yml logs -f
  ```
