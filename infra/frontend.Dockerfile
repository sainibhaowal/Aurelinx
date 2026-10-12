# syntax=docker/dockerfile:1.7
FROM node:20-bookworm-slim AS builder

WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://localhost:5100
ARG INTERNAL_API_URL=http://api:5000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    INTERNAL_API_URL=${INTERNAL_API_URL} \
    NEXT_TELEMETRY_DISABLED=1 \
    npm_config_fund=false \
    npm_config_audit=false

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    corepack enable \
    && corepack prepare pnpm@9.15.5 --activate \
    && pnpm config set store-dir /pnpm/store \
    && pnpm install --frozen-lockfile

COPY . ./

RUN ./node_modules/.bin/next build

FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static /app/static-assets
COPY --from=builder /app/public ./public

# Keep the runtime static directory on a persistent volume across deployments.
# Copy new build assets into it at startup so chunks requested by already-open
# tabs remain available after the application image is replaced.
RUN cat > /app/start-frontend.sh <<'EOF'
#!/bin/sh
set -eu
mkdir -p /app/.next/static
cp -a /app/static-assets/. /app/.next/static/
# Hashed assets are immutable. Retain old build chunks for 30 days so stale
# tabs can finish loading while naturally bounding persistent-volume growth.
find /app/.next/static -type f -mtime +30 -delete
exec node /app/server.js
EOF
RUN chmod +x /app/start-frontend.sh

EXPOSE 3000

CMD ["/app/start-frontend.sh"]
