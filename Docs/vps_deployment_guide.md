# Aurelinx VPS Production Deployment Guide

> **What this guide is:** the complete, definitive reference for how Aurelinx is deployed to the production VPS (`144.91.118.196`) and how the automated CI/CD pipeline works. It documents exactly what is configured today, including the fixes that were required to get the pipeline working end-to-end.

---

## 1. Architecture: how the pipeline works (30-second summary)

```
[Laptop: npm run release]  →  git tag vX.Y.Z  →  push to GitHub
                                                  ↓
                    GitHub Actions: "Release" workflow
                                                  ↓
        1. build-and-push job         2. deploy job (runs after build succeeds)
           ├─ Build backend image         ├─ SSH into VPS as `deploy`
           ├─ Build frontend image        ├─ docker login ghcr.io (using GHCR_PAT)
           ├─ Push both to GHCR           ├─ docker compose pull
           │   (version tag + latest)     ├─ docker compose up -d --wait
           └─ Create GitHub Release       ├─ health check (must match version)
           (professional release notes)   └─ prune old images + build cache
```

**Key rule:** the pipeline triggers **only on git tags** (`v*`). A normal `git push` does **nothing** — no build, no deploy, no VPS contact. Only `npm run release` (which creates a tag) deploys.

---

## 2. What runs on the VPS

| Path on VPS | Description |
|-------------|-------------|
| `/opt/aurelinx/docker-compose.yml` | Production compose file — **image-only** (no `build:` lines). Images use `ghcr.io/` prefix, e.g. `image: ghcr.io/${GHCR_OWNER:-your-org}/aurelinx-backend:${VERSION:-latest}` |
| `/opt/aurelinx/.env.production` | Real production secrets (generated once; see §4). **Owned by `deploy` user, chmod 600.** |
| `/opt/aurelinx/.env.deploy` | **Written automatically by the pipeline on every deploy** — contains only `GHCR_OWNER=<owner>` and `VERSION=vX.Y.Z`. Do not edit manually. |
| `/opt/aurelinx/Caddyfile` | Caddy reverse-proxy config (TLS via Let's Encrypt, routes `/api/*` and `/health*` to the API, everything else to the frontend). |
| `/opt/aurelinx/postgres/init/001-init.sql` | Postgres initialisation script (runs only on first volume creation). |
| `deploy` system user | Runs Docker (`usermod -aG docker deploy`), owns `/opt/aurelinx`, is the user GitHub Actions SSHes as. |

**No source code lives on the VPS.** All application images come from **GHCR** (`ghcr.io/sainibhaowal/aurelinx-backend` and `aurelinx-frontend`).

### VPS container services (in compose)

| Service | Image | Purpose |
|---------|-------|---------|
| `postgres` | `postgres:16-alpine` | Main database (schema `app`) |
| `redis` | `redis:7-alpine` | Cache / queue / SSE pub-sub |
| `qdrant` | `qdrant/qdrant:v1.13.6` | Vector database for embeddings |
| `api` | `ghcr.io/sainibhaowal/aurelinx-backend:vX.Y.Z` | FastAPI backend (port `5100` → container `5000`) |
| `worker` | same backend image | Async job worker (`retry_worker.py`) |
| `scheduler` | same backend image | Lean scheduler (`retry_scheduler.py`) |
| `web` | `ghcr.io/sainibhaowal/aurelinx-frontend:vX.Y.Z` | Next.js frontend (port `3100` → container `3000`) |
| `caddy` | `caddy:2-alpine` | Reverse proxy / TLS termination (ports `80`, `443`) |

**Important:** the API container receives `VERSION: ${VERSION:-1.0.0}` as an environment variable so `/health` reports the deployed version. The health endpoint must return `"version": "vX.Y.Z"` for the deploy to be marked successful.

---

## 3. One-time VPS provisioning (run **as root** on the VPS)

```bash
# 1. Install Docker, Compose plugin, jq
apt-get update && apt-get install -y docker.io docker-compose-plugin jq
systemctl enable --now docker

# 2. Create deploy user and give Docker rights
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy

# 3. Add GitHub Actions SSH public key
#    On laptop: cat ~/.ssh/aurelinx_deploy.pub  (copy the line)
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chown deploy:deploy /home/deploy/.ssh
cat <<'PUBKEY' > /home/deploy/.ssh/authorized_keys
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKnhrZ5Yr9USrY844kaopx9IToGgtJtS+aO35CI4tHpI ravi_saini@pop-os
PUBKEY
chmod 600 /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys

# 4. Deploy directory (owned by deploy)
mkdir -p /opt/aurelinx/postgres/init
chown -R deploy:deploy /opt/aurelinx

# 5. Copy static files from laptop
#    From laptop (in /home/ravi_saini/Aurelinx):
scp infra/docker-compose.prod.yml root@144.91.118.196:/opt/aurelinx/docker-compose.yml
scp infra/Caddyfile root@144.91.118.196:/opt/aurelinx/Caddyfile
scp infra/postgres/init/001-init.sql root@144.91.118.196:/opt/aurelinx/postgres/init/

# 6. Create .env.production (see §4 for content)
```

---

## 4. The `.env.production` file (critical)

> **Two golden rules, learned the hard way:**
> 1. `DATABASE_URL` must contain **exactly the same password** as `POSTGRES_PASSWORD`. A mismatch causes `password authentication failed for user "aurelinx"` and an unhealthy API container.
> 2. `ALLOWED_HOSTS` **must include `localhost` and `127.0.0.1`** — otherwise the internal Docker health check (`curl http://127.0.0.1:5000/health`) is rejected with `400` by the TrustedHost middleware and the container is marked **unhealthy**.

```bash
cat > /opt/aurelinx/.env.production <<'EOF'
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

POSTGRES_DB=aurelinx_db
POSTGRES_USER=aurelinx
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD
POSTGRES_PORT=55433
POSTGRES_SCHEMA=app
DATABASE_URL=postgresql+psycopg://aurelinx:CHANGE_ME_STRONG_PASSWORD@postgres:5432/aurelinx_db?options=-csearch_path%3Dapp,public

REDIS_PASSWORD=CHANGE_ME_ANOTHER_PASSWORD
REDIS_PORT=6380
REDIS_URL=redis://:CHANGE_ME_ANOTHER_PASSWORD@redis:6379/0

QDRANT_URL=http://qdrant:6333
QDRANT_HTTP_PORT=6335
QDRANT_GRPC_PORT=6336

API_PORT=5100
WEB_PORT=3100
NEXT_PUBLIC_API_URL=https://aurelinx.averqel.com
FRONTEND_URL=https://aurelinx.averqel.com
ALLOWED_ORIGINS=https://aurelinx.averqel.com
ALLOWED_HOSTS=localhost,127.0.0.1,aurelinx.averqel.com,api.aurelinx.averqel.com,api,web
REQUIRE_HTTPS=true

SECRET_KEY=CHANGE_ME_64_CHAR_RANDOM
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALGORITHM=HS256

RATE_LIMIT_ENABLED=true
REQUESTS_PER_MINUTE=100

CADDY_HTTP_PORT=80
CADDY_HTTPS_PORT=443
SITE_ADDRESS=https://aurelinx.averqel.com

CHAT_UPLOAD_ROOT=/app/data/chat
EOF

chmod 600 /opt/aurelinx/.env.production
chown deploy:deploy /opt/aurelinx/.env.production
```

> **Note on `NEXT_PUBLIC_API_URL`:** it points at `https://aurelinx.averqel.com` (the main domain) — the Caddyfile routes `/api/*` and `/health*` to the backend, so a separate `api.` subdomain is **not required** (and the `api.aurelinx.averqel.com` DNS record does not exist). The same value must be set as the GitHub secret `NEXT_PUBLIC_API_URL`, because it is baked into the frontend image **at build time**.

---

## 5. GitHub repository secrets (set once: **Settings → Secrets → Actions**)

| Secret name | Value |
|-------------|-------|
| `VPS_HOST` | `144.91.118.196` |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Entire private key from `cat ~/.ssh/aurelinx_deploy` (including `-----BEGIN OPENSSH PRIVATE KEY-----` / `-----END OPENSSH PRIVATE KEY-----` lines) |
| `VPS_DEPLOY_DIR` | `/opt/aurelinx` |
| `NEXT_PUBLIC_API_URL` | `https://aurelinx.averqel.com` |
| `GHCR_PAT` | GitHub Personal Access Token with **`read:packages`** scope (used by the VPS to pull images from GHCR) |

> **Why `GHCR_PAT` is required:** the deploy job logs into GHCR **on the VPS**. The workflow's automatic `GITHUB_TOKEN` **cannot** pull images from outside the Actions runner (it fails with `pull access denied ... repository does not exist or may require 'docker login'`). A PAT with `read:packages` is the reliable fix.

---

## 6. Repository files that must stay in sync

| File | Important bits |
|------|----------------|
| `infra/docker-compose.prod.yml` | Image lines **must** include `ghcr.io/` (e.g. `image: ghcr.io/${GHCR_OWNER:-your-org}/aurelinx-backend:${VERSION:-latest}`). Missing `ghcr.io/` makes Docker try Docker Hub and fail with `pull access denied`. The `api` service must pass `VERSION: ${VERSION:-1.0.0}` so `/health` reports the real version. |
| `.github/workflows/release.yml` | Triggers on `v*` tags. `build-and-push` job builds/pushes both images (version tag **and** `latest`), generates professional release notes, creates the GitHub Release. `deploy` job SSHes to the VPS, writes `.env.deploy` (`GHCR_OWNER`, `VERSION`), runs `docker compose pull` → `up -d --wait --remove-orphans` → health check → `docker image prune -af` + `docker builder prune -af`. |
| `package.json` | `"release": "standard-version && git push --follow-tags"` (bumps version, writes CHANGELOG, creates tag, pushes). |
| `server/app/main.py` | `/health` is exempt from the HTTPS-enforcement middleware (so the internal HTTP health check passes); it returns `settings.VERSION` (dynamic, not hardcoded). |
| `infra/Caddyfile` | Routes `/api/*` and `/health*` → `api:5000`; everything else → `web:3000`. |

---

## 7. Release / Deploy flow (run on your laptop)

### Full release (deploys to VPS):

```bash
git add .
git commit -m "feat: your change"          # conventional commits = better release notes
npm run release                             # bumps version, tags vX.Y.Z, auto-pushes
git push origin master:main --force         # keep the main branch in sync
```

> `npm run release` already runs `git push --follow-tags` — it pushes `master` and the new tag, which is what triggers the pipeline.

### Small change, NO release (never touches the VPS):

```bash
git add .
git commit -m "docs: update readme"
git push origin master && git push origin master:main --force
```

> No tag → no build → no deploy. The VPS stays untouched. **This is the answer to "I don't want to deploy for every small change".**

### What GitHub Actions does automatically

1. **build-and-push**
   - Checks out code, sets up Buildx, logs into GHCR.
   - Builds `aurelinx-backend` and `aurelinx-frontend` (using `type=gha` build cache — dependency layers are cached between releases, no full re-download).
   - Pushes `ghcr.io/sainibhaowal/aurelinx-backend:vX.Y.Z` + `:latest` (same for frontend).
   - Creates the GitHub Release **"Aurelinx vX.Y.Z"** with categorized notes (features / fixes) and image references.

2. **deploy** (only after build succeeds)
   - SSHes to `deploy@144.91.118.196` using `VPS_SSH_KEY`.
   - `cd /opt/aurelinx`
   - `docker login ghcr.io -u sainibhaowal` using `GHCR_PAT`
   - Writes `.env.deploy` (`GHCR_OWNER=sainibhaowal`, `VERSION=vX.Y.Z`)
   - `docker compose --env-file .env.production --env-file .env.deploy pull`
   - `docker compose --env-file .env.production --env-file .env.deploy up -d --remove-orphans --wait`
   - Health check: `curl http://localhost:5100/health` must return `"version": "vX.Y.Z"` → prints `Deployed vX.Y.Z`
   - Cleanup: `docker image prune -af` + `docker builder prune -af` (keeps volumes — DB data untouched)

---

## 8. Verify a deployment

```bash
# From anywhere:
curl -s https://aurelinx.averqel.com/health | jq .
# Expect: { "status": "healthy", "service": "aurelinx", "version": "1.1.15", "environment": "production", ... }

# On the VPS directly:
docker ps --format "{{.Names}} {{.Status}}"
# All services should show "Up" and api/postgres/redis/qdrant should show "(healthy)"
```

If the JSON shows the version you just tagged → the deploy succeeded.

---

## 9. Common failures and their real fixes (lessons learned)

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| `pull access denied for sainibhaowal/aurelinx-backend, repository does not exist` | 1) compose image line missing `ghcr.io/` prefix → Docker Hub lookup, or 2) VPS docker login uses `GITHUB_TOKEN` instead of a PAT | 1) add `ghcr.io/` to image lines; 2) use `GHCR_PAT` (read:packages) in the deploy job |
| `password authentication failed for user "aurelinx"` | `DATABASE_URL` password ≠ `POSTGRES_PASSWORD`, or stale postgres volume from an old password | make both passwords identical; or `docker volume rm aurelinx_postgres_data` for a fresh DB |
| container `unhealthy` — `/health` returns `400 Bad Request` | `ALLOWED_HOSTS` missing `localhost`/`127.0.0.1` → TrustedHostMiddleware rejects the internal health check | add `localhost,127.0.0.1` to `ALLOWED_HOSTS` in `.env.production` |
| API starts but reports `"version": "1.0.0"` | compose `api` service missing `VERSION: ${VERSION:-1.0.0}` env | add the `VERSION` env line to the `api` service |
| `ERR_NAME_NOT_RESOLVED` for `api.aurelinx.averqel.com` | frontend was built with `NEXT_PUBLIC_API_URL` pointing at a subdomain with no DNS record | set `NEXT_PUBLIC_API_URL=https://aurelinx.averqel.com` (in GitHub secret + `.env.production`) and re-release |

---

## 10. VPS maintenance

### Safe cleanup (keeps all volumes / DB data)

```bash
docker image prune -af          # old unused images (runs automatically after every deploy)
docker builder prune -af        # build cache
docker system prune -f          # stopped containers + dangling images + unused networks
```

### NEVER run these without being sure

```bash
docker volume prune -f                  # deletes volumes NOT attached to a container (DATA LOSS)
docker system prune -af --volumes       # nuclear: removes everything unused (DATA LOSS)
docker compose down -v                  # removes named volumes incl. postgres_data (DATA LOSS)
```

### Useful checks

```bash
df -h /                       # disk space
docker system df              # docker disk usage breakdown
docker ps --format "{{.Names}} {{.Status}}"   # container health at a glance
journalctl --vacuum-time=3d   # trim old system logs
```

---

## 11. FAQ

**Q: I changed a README file — will it deploy?**
No. Deploys happen only on tags. Plain commits never touch the VPS.

**Q: How do I roll back to a previous version?**
On the VPS: `sed -i 's|VERSION=.*|VERSION=v1.1.14|' /opt/aurelinx/.env.deploy` then `docker compose --env-file .env.production --env-file .env.deploy up -d api web` (old images stay cached until pruned, but only the newest is kept — re-pull an old tag with `docker compose pull` if needed).

**Q: Will pruning make the next build re-download all dependencies?**
No. Builds happen on GitHub Actions with `type=gha` cache — dependency layers persist there. The VPS only pulls the finished images.

**Q: Does a deploy cause downtime?**
A short restart window (~15–60s) while containers swap to the new image. `restart: unless-stopped` + health checks keep the impact minimal. True zero-downtime would require a second server / load balancer.