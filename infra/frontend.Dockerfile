# syntax=docker/dockerfile:1.7
FROM node:20-bookworm-slim AS builder

WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://localhost:5100
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_TELEMETRY_DISABLED=1 \
    npm_config_fund=false \
    npm_config_audit=false

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    corepack enable \
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
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
