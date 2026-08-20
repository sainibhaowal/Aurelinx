# VPS Production Deployment Guide

This guide explains the **one‑time VPS setup** and the **continuous deployment** that runs automatically after you push a tag.

---

## 1. What runs on the VPS

| Path on VPS | Description |
|-------------|-------------|
| `/opt/aurelinx/docker-compose.yml` | Production compose file (only `image:` lines, no `build:`). |
| `/opt/aurelinx/.env.production`   | Real production secrets (generated once on the VPS). |
| `/opt/aurelinx/Caddyfile`         | Caddy reverse‑proxy config (TLS, domain). |
| `/opt/aurelinx/postgres/init/001‑init.sql` | Database initialisation script. |
| `deploy` system user               | Runs Docker, owns `/opt/aurelinx`, used by GitHub Actions to deploy. |

**No source code, no `.env.local`, no `docker-compose.local.yml` on the VPS.** All images are pulled from **GitHub Container Registry (GHCR)**.

---

## 2. One‑time VPS provisioning (run **as root** on the VPS)

```bash
# 1️⃣ Install Docker, Compose plugin, jq
apt-get update && apt-get install -y docker.io docker-compose-plugin jq
systemctl enable --now docker

# 2️⃣ Create deploy user and give Docker rights
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy

# 3️⃣ Add GitHub Actions SSH public key
#   On your laptop: cat ~/.ssh/aurelinx_deploy.pub   (copy the line)
#   On VPS (as root):
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chown deploy:deploy /home/deploy/.ssh
cat <<'PUBKEY' > /home/deploy/.ssh/authorized_keys
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKnhrZ5Yr9USrY844kaopx9IToGgtJtS+aO35CI4tHpI ravi_saini@pop-os
PUBKEY
chmod 600 /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys

# 4️⃣ Deploy directory & static files (copy from your laptop)
mkdir -p /opt/aurelinx
chown deploy:deploy /opt/aurelinx
# From your laptop:
# scp infra/docker-compose.prod.yml deploy@<VPS>:/opt/aurelinx/docker-compose.yml
# scp infra/Caddyfile deploy@<VPS>:/opt/aurelinx/Caddyfile
# scp -r infra/postgres/init deploy@<VPS>:/opt/aurelinx/postgres/init

# 5️⃣ Generate production secrets (run as root on the VPS)
bash /root/generate-env-production.sh   # script below
```

### `generate-env-production.sh` (save as `/root/generate-env-production.sh` on the VPS)

```bash
#!/usr/bin/env bash
set -euo pipefail
ENV_FILE="/opt/aurelinx/.env.production"
DEPLOY_USER="deploy"

pg_pass=$(openssl rand -base64 24 | tr -d '\n')
redis_pass=$(openssl rand -base64 24 | tr -d '\n')
jwt_secret=$(openssl rand -base64 32 | tr -d '\n')

DOMAIN="aurelinx.averqel.com"
API_URL="https://api.${DOMAIN}"
FRONTEND_URL="https://${DOMAIN}"

cat > "${ENV_FILE}" <<EOF
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

POSTGRES_DB=aurelinx_db
POSTGRES_USER=aurelinx
POSTGRES_PASSWORD=${pg_pass}
POSTGRES_PORT=55433
POSTGRES_SCHEMA=app
DATABASE_URL=postgresql+psycopg://aurelinx:${pg_pass}@postgres:5432/aurelinx_db?options=-csearch_path%3Dapp,public

REDIS_PASSWORD=${redis_pass}
REDIS_PORT=6380
REDIS_URL=redis://:${redis_pass}@redis:6379/0

QDRANT_URL=http://qdrant:6333
QDRANT_HTTP_PORT=6335
QDRANT_GRPC_PORT=6336

API_PORT=5100
WEB_PORT=3100
NEXT_PUBLIC_API_URL=${API_URL}
FRONTEND_URL=${FRONTEND_URL}
ALLOWED_ORIGINS=${FRONTEND_URL}
ALLOWED_HOSTS=${DOMAIN},api,web
REQUIRE_HTTPS=true

SECRET_KEY=${jwt_secret}
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALGORITHM=HS256

RATE_LIMIT_ENABLED=true
REQUESTS_PER_MINUTE=100

# OPENAI_API_KEY=   # uncomment & fill if you use OpenAI
EMBEDDING_MODEL=text-embedding-3-small

CADDY_HTTP_PORT=80
CADDY_HTTPS_PORT=443
SITE_ADDRESS=${FRONTEND_URL}

CHAT_UPLOAD_ROOT=/app/data/chat
EOF

chmod 600 "${ENV_FILE}"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${ENV_FILE}"

echo "✅ ${ENV_FILE} created"
echo "   Postgres pwd : ${pg_pass}"
echo "   Redis pwd    : ${redis_pass}"
echo "   JWT secret   : ${jwt_secret}"
```

Run it once:

```bash
chmod +x /root/generate-env-production.sh
bash /root/generate-env-production.sh
```

*Save the three printed secrets (Postgres password, Redis password, JWT secret) in a password manager.*

---

## 3. GitHub repository secrets (set **once** in **Settings → Secrets → Actions**)

| Secret name | Value |
|-------------|-------|
| `VPS_HOST` | `144.91.118.196` (or your DNS name) |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | **Entire private key** from `cat ~/.ssh/aurelinx_deploy` (including `-----BEGIN …-----` / `-----END …-----`). |
| `VPS_DEPLOY_DIR` | `/opt/aurelinx` |
| `NEXT_PUBLIC_API_URL` *(optional)* | `https://api.aurelinx.averqel.com` |

---

## 4. Repository files that must be correct (already in repo)

| File | Important bits |
|------|----------------|
| `infra/docker-compose.prod.yml` | `postgres` & `redis` services have `env_file: ./.env.production`; services use `image: ${GHCR_OWNER:-your-org}/aurelinx-backend:${VERSION:-latest}` etc. |
| `.github/workflows/release.yml` | **build‑and‑push** job builds & pushes images to GHCR, **deploy** job SSHes to VPS, writes `.env.deploy` (`GHCR_OWNER`, `VERSION`), runs `docker compose pull && up -d`. |
| `package.json` | `"release": "standard-version && git push --follow-tags"` (or your preferred release tool). |

---

## 5. Release / Deploy flow (run on your laptop)

```bash
# 1️⃣ Make a change / commit
git add .
git commit -m "feat: your new feature"

# 2️⃣ Bump version, write CHANGELOG, create annotated tag
npm run release          # runs standard-version → creates tag vX.Y.Z

# 3️⃣ Push the tag – this single push triggers the whole pipeline
git push --follow-tags
```

### What GitHub Actions does automatically

1. **build‑and‑push**  
   * Checks out code, sets up Buildx, logs into GHCR.  
   * Builds `aurelinx-backend` and `aurelinx-frontend` images.  
   * Pushes them as `ghcr.io/<owner>/aurelinx-backend:vX.Y.Z` and `…/frontend:vX.Y.Z`.  
   * Creates a GitHub Release with generated changelog.

2. **deploy** (runs after successful build)  
   * SSHes to `VPS_HOST` as `VPS_USER` using `VPS_SSH_KEY`.  
   * `cd $VPS_DEPLOY_DIR` (`/opt/aurelinx`).  
   * Writes a tiny `.env.deploy`:

     ```dotenv
     GHCR_OWNER=<github‑owner>
     VERSION=vX.Y.Z
     ```

   * Runs:

     ```bash
     docker compose --env-file .env.production --env-file .env.deploy pull
     docker compose --env-file .env.production --env-file .env.deploy up -d --remove-orphans
     ```

   * Health‑checks `curl http://localhost:5100/health` → must return the new version.

3. **GitHub Release** is published automatically.

---

## 6. Verify the deployment

```bash
curl -s https://aurelinx.averqel.com/health | jq .
# Expected output:
# { "status":"ok", "version":"X.Y.Z" }
```

If the JSON shows the version you just tagged, the deploy succeeded.

---

## 7. Future releases (after the first successful run)

```bash
git add .
git commit -m "feat: new feature"
npm run release
git push --follow-tags
```

That’s it – **no manual SSH, no manual `docker pull`, no file edits on the VPS**.

---

## 8. Docker cleanup / prune on the VPS (keep the host tidy)

### What the flags mean

| Flag | Meaning |
|------|---------|
| `-f` | **force** – don't ask for confirmation |
| `-a` | **all** – include unused images (not just dangling ones) |
| `-f` + `-a` together (`-af`) = force remove ALL unused images, not just dangling ones |

**Example:** `docker system prune -af` = force remove all unused containers, networks, AND all unused images (not just dangling ones).

### Safe daily clean‑up (run as `deploy` user)

```bash
# Remove stopped containers, unused networks, dangling images (keeps volumes)
docker system prune -f

# Remove BuildKit build cache
docker builder prune -af
```

### Remove **unused images** (not just dangling ones)

```bash
docker image prune -af
```

### Remove **unused volumes** (⚠️ destroys DB, Qdrant, upload data)

```bash
docker volume prune -f
```

### Nuclear option – remove everything not used by a running container

```bash
docker system prune -af --volumes
```

> **Tip:** Run `docker system df` before and after to see reclaimed space.

### Docker Compose specific clean‑up flags (run from `/opt/aurelinx`)

| Flag | What it does | When to use |
|------|--------------|-------------|
| `--volumes` | Also remove named volumes (`postgres_data`, `redis_data`, `qdrant_data`, `chat_uploads`, `caddy_data`, `caddy_config`). | When you want a completely fresh DB / storage. |
| `--remove-orphans` | Remove containers for services that were removed from the compose file. | After you rename or delete a service in `docker-compose.yml`. |
| `--rmi all` | Remove all images used by the services (not just dangling ones). | Force a fresh pull of images. |
| `--no-deps` (with `up`/`run`) | Start only the requested service, **skip its dependencies**. | Debug a single service, e.g. `docker compose run --no-deps api bash`. |
| `--no-build` (with `up`) | Skip building images even if Dockerfile changed; use existing image. | Faster iteration when you know the image is up‑to‑date. |
| `--no-deps` | **Skip starting linked services** – only start the service you named. | Use when dependencies are already running and you want to restart just one service. |

**Typical clean‑up after a major refactor on the VPS**

```bash
# Stop everything, remove containers, networks, orphan containers – keep volumes
cd /opt/aurelinx
docker compose down --remove-orphans

# Full clean‑up including volumes (fresh DB) and images
docker compose down -v --rmi all --remove-orphans
```

### Removing a specific container / image / volume

```bash
# Remove a single stopped container
docker rm <container_name_or_id>

# Remove a specific image (force if needed)
docker rmi -f <image_name_or_id>

# Remove a specific named volume (⚠️ data loss)
docker volume rm <volume_name>
```

### Why `--remove-orphans` matters
When you rename or delete a service in `docker-compose.yml`, Docker Compose does **not** automatically delete the old containers. `--remove-orphans` tells Compose to delete those "ghost" containers so they don't waste resources or hold ports.

### Why `--no-deps` can be handy
`docker compose up api` normally also starts `postgres`, `redis`, `qdrant`, etc. With `--no-deps` you start only `api`, assuming the dependencies are already running. This speeds up iterative debugging.

---

## Complete Docker Prune Reference (VPS)

Below is a exhaustive list of every `docker * prune` command, every flag, filter, and practical examples for the VPS. Keep this page as a cheat‑sheet.

---

### 1. `docker system prune`

Removes **containers, networks, images, and optionally volumes** that are not used by any running container.

```bash
docker system prune [OPTIONS]
```

| Option | Description |
|------|-------------|
| `-f, --force` | Do not prompt for confirmation |
| `-a, --all` | Remove **all unused images**, not just dangling ones |
| `--volumes` | Also prune volumes (data loss!) |
| `--filter <filter>` | Apply filters (see Filters below) |
| `--dry-run` | Show what would be removed without actually removing |

**Common examples**

```bash
# Safe daily cleanup (no volumes, no all-images)
docker system prune -f

# Aggressive cleanup: remove everything unused including all images and volumes
docker system prune -af --volumes

# Dry‑run to see what would be deleted
docker system prune -af --volumes --dry-run
```

---

### 2. `docker container prune`

Removes **stopped containers**.

```bash
docker container prune [OPTIONS]
```

| Option | Description |
|------|-------------|
| `-f, --force` | No confirmation |
| `--filter` | Filter (e.g. `until=24h`, `label=...`) |

```bash
# Remove all stopped containers older than 24h
docker container prune -f --filter "until=24h"
```

---

### 3. `docker image prune`

Removes **unused images**.

```bash
docker image prune [OPTIONS]
```

| Option | Description |
|------|-------------|
| `-f, --force` | No confirmation |
| `-a, --all` | Remove **all unused images**, not just dangling ones |
| `--filter` | Filter (e.g. `until=24h`, `label=...`) |

```bash
# Remove dangling images only (default)
docker image prune -f

# Remove ALL unused images (including tagged but not referenced)
docker image prune -af

# Remove images older than 48h
docker image prune -af --filter "until=48h"
```

**Dangling vs Unused**  
*Dangling* = images with no tag and not referenced by any container.  
*Unused* = any image not referenced by any container (includes tagged images you built but never ran).

---

### 4. `docker volume prune`

Removes **unused volumes** (data loss!).

```bash
docker volume prune [OPTIONS]
```

| Option | Description |
|------|-------------|
| `-f, --force` | No confirmation |
| `--filter` | Filter (e.g. `label=...`) |

```bash
# Remove all volumes not attached to a container
docker volume prune -f
```

---

### 5. `docker network prune`

Removes **unused networks**.

```bash
docker network prune [OPTIONS]
```

| Option | Description |
|------|-------------|
| `-f, --force` | No confirmation |
| `--filter` | Filter (e.g. `until=24h`) |

```bash
docker network prune -f
```

---

### 6. `docker builder prune`

Removes **BuildKit build cache**.

```bash
docker builder prune [OPTIONS]
```

| Option | Description |
|------|-------------|
| `-f, --force` | No confirmation |
| `-a, --all` | Remove **all** cache, not just unused |
| `--keep-storage <bytes>` | Keep at least this much cache (e.g. `10GB`) |
| `--filter` | Filter (e.g. `until=24h`) |

```bash
# Remove all build cache (aggressive)
docker builder prune -af

# Keep at least 5 GB of cache
docker builder prune -af --keep-storage 5GB
```

---

### 8. Filters (common to all prune commands)

| Filter | Syntax | Example |
|--------|--------|---------|
| `until` | Remove objects created before timestamp | `--filter "until=24h"` or `--filter "until=2024-01-01T00:00:00"` |
| `label` | Match objects with a label | `--filter "label=maintainer=team"` |
| `id` | Specific object ID (rarely used) | `--filter "id=abc123"` |

Multiple filters can be combined by repeating `--filter`.

---

### 8. Practical “daily / weekly / nuclear” scripts for the VPS

**Daily (safe)**

```bash
docker system prune -f          # containers, networks, dangling images
docker builder prune -af        # build cache
```

**Weekly (more aggressive, still safe for volumes)**

```bash
docker system prune -af         # all unused images + containers + networks
docker builder prune -af
docker volume prune -f          # only if you can afford DB loss
```

**Nuclear (complete wipe – use with caution!)**

```bash
docker system prune -af --volumes   # removes EVERYTHING not used by a running container
```

---

### 9. `docker compose` specific clean‑up flags (run from `/opt/aurelinx`)

| Flag | What it does | When to use |
|------|--------------|-------------|
| `--volumes` | Also remove named volumes (`postgres_data`, `redis_data`, `qdrant_data`, `chat_uploads`, `caddy_data`, `caddy_config`). | When you want a completely fresh DB / storage. |
| `--remove-orphans` | Remove containers for services that were removed from the compose file. | After you rename or delete a service in `docker-compose.yml`. |
| `--rmi all` | Remove all images used by the services (not just dangling ones). | Force a fresh pull of images. |
| `--no-deps` (with `up`/`run`) | Start only the requested service, **skip its dependencies**. | Debug a single service, e.g. `docker compose run --no-deps api bash`. |
| `--no-build` (with `up`) | Skip building images even if Dockerfile changed; use existing image. | Faster iteration when you know the image is up‑to‑date. |
| `--no-deps` | **Skip starting linked services** – only start the service you named. | Use when dependencies are already running and you want to restart just one service. |

**Typical clean‑up after a major refactor on the VPS**

```bash
# Stop everything, remove containers, networks, orphan containers – keep volumes
cd /opt/aurelinx
docker compose down --remove-orphans

# Full clean‑up including volumes (fresh DB) and images
docker compose down -v --rmi all --remove-orphans
```

### Removing a specific container / image / volume

```bash
# Remove a single stopped container
docker rm <container_name_or_id>

# Remove a specific image (force if needed)
docker rmi -f <image_name_or_id>

# Remove a specific named volume (⚠️ data loss)
docker volume rm <volume_name>
```

### Why `--remove-orphans` matters
When you rename or delete a service in `docker-compose.yml`, Docker Compose does **not** automatically delete the old containers. `--remove-orphans` tells Compose to delete those “ghost” containers so they don’t waste resources or hold ports.

### Why `--no-deps` can be handy
`docker compose up api` normally also starts `postgres`, `redis`, `qdrant`, etc. With `--no-deps` you start only `api`, assuming the dependencies are already running. This speeds up iterative debugging.

---

## Quick command cheat‑sheet (run on laptop)

```bash
# One‑time: ensure compose file in repo has env_file for postgres/redis
git add infra/docker-compose.prod.yml
git commit -m "chore: let postgres & redis read .env.production"
git push

# Every release
git add .
git commit -m "feat: …"
npm run release
git push --follow-tags
```

That’s the complete production deployment guide for the Aurelinx VPS. 🚀