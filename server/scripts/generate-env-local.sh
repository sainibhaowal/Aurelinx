#!/usr/bin/env bash
# --------------------------------------------------------------
# generate-env-local.sh
#   Creates infra/.env.local with strong random secrets for dev.
#   Run from the repository root (the folder that contains the `infra/` dir).
#   Example:  bash scripts/generate-env-local.sh
# --------------------------------------------------------------

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
ENV_FILE="${REPO_ROOT}/infra/.env.local"

# ---------- 1️⃣  generate strong random secrets ----------
# 24-byte base64  (good for DB / Redis passwords)
pg_pass=$(openssl rand -base64 24 | tr -d '\n')
redis_pass=$(openssl rand -base64 24 | tr -d '\n')

# 32-byte base64  (>=32 bytes, ideal for JWT HS256 secret)
jwt_secret=$(openssl rand -base64 32 | tr -d '\n')

# ---------- 2️⃣  static values that are NOT random ----------
DOMAIN="localhost"
API_SUBDOMAIN="localhost"
FRONTEND_URL="http://${DOMAIN}:3100"
API_URL="http://${API_SUBDOMAIN}:5100"

# ---------- 3️⃣  write the .env.local file ----------
cat > "${ENV_FILE}" <<EOF
# -------------------------------------------------
# infra/.env.local   (generated - safe to commit)
# -------------------------------------------------
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=DEBUG

# ---- POSTGRES ---------------------------------------------------------
POSTGRES_DB=aurelinx_db
POSTGRES_USER=aurelinx
POSTGRES_PASSWORD=${pg_pass}
POSTGRES_PORT=5432
POSTGRES_SCHEMA=app
DATABASE_URL=postgresql+psycopg://aurelinx:${pg_pass}@postgres:5432/aurelinx_db?options=-csearch_path%3Dapp,public

# ---- REDIS ------------------------------------------------------------
REDIS_PASSWORD=${redis_pass}
REDIS_PORT=6379
REDIS_URL=redis://:${redis_pass}@redis:6379/0

# ---- QDRANT -----------------------------------------------------------
QDRANT_URL=http://qdrant:6333
QDRANT_HTTP_PORT=6333
QDRANT_GRPC_PORT=6334

# ---- APP PORTS --------------------------------------------------------
API_PORT=5100
WEB_PORT=3100
NEXT_PUBLIC_API_URL=${API_URL}
FRONTEND_URL=${FRONTEND_URL}
ALLOWED_ORIGINS=${FRONTEND_URL}
ALLOWED_HOSTS=localhost,127.0.0.1,web,api
REQUIRE_HTTPS=false

# ---- AUTH / JWT -------------------------------------------------------
SECRET_KEY=${jwt_secret}
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALGORITHM=HS256

# ---- RATE LIMIT -------------------------------------------------------
RATE_LIMIT_ENABLED=false
REQUESTS_PER_MINUTE=1000

# ---- EXTERNAL AI / LLM KEYS (optional - keep commented if unused) ---
# OPENAI_API_KEY=
# CLAUDE_API_KEY=
# GROQ_API_KEY=
EMBEDDING_MODEL=text-embedding-3-small

# ---- CADDY REVERSE PROXY -----------------------------------------------
CADDY_HTTP_PORT=80
CADDY_HTTPS_PORT=443
SITE_ADDRESS=${FRONTEND_URL}

# ---- FILE UPLOADS -----------------------------------------------------
CHAT_UPLOAD_ROOT=/app/data/chat

# ---- GHCR placeholders - not used locally -------------------------------
GHCR_OWNER=local
VERSION=dev
EOF

# ---------- 4️⃣  make it readable only by you (optional) ----------
chmod 600 "${ENV_FILE}"

echo "✅  ${ENV_FILE} created with strong random secrets."
echo "   • Postgres password : ${pg_pass}"
echo "   • Redis password    : ${redis_pass}"
echo "   • JWT secret (HS256): ${jwt_secret}"
echo
echo "👉  Start the dev stack:"
echo "    cd infra && docker compose -f docker-compose.local.yml --env-file .env.local up -d --build"