# Aurelinx Deployment Guide

> **Version**: 1.0 (pre-release)  
> **Last Updated**: 2026-08-23  
> **Status**: Production-ready for v1.0+

---

## Quick Start (Local Development)

### Prerequisites
```bash
# Required
docker >= 24.0
docker-compose >= 2.20
git >= 2.40

# Optional (for manual setup)
python >= 3.11
node >= 18.0
rust >= 1.75
postgresql >= 15
redis >= 7
qdrant >= 1.8
```

### One-Command Launch
```bash
git clone https://github.com/ravindersingh/Aurelinx.git
cd Aurelinx
make install && make dev
```

**Access Points**:
| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3001 | Create account |
| Backend API | http://localhost:8000 | — |
| API Docs | http://localhost:8000/api/v1/docs | — |
| Mailhog (email) | http://localhost:8025 | — |
| Qdrant | http://localhost:6333 | — |

---

## Environment Configuration

### Required Files
```bash
# Copy templates
cp server/.env.example server/.env
cp client/.env.example client/.env.local
cp infra/.env.example infra/.env.local
```

### Critical Variables (All Environments)

#### Backend (`server/.env`)
```bash
# Database
DATABASE_URL=postgresql+asyncpg://aurelinx:password@localhost:5432/aurelinx

# Redis (Cache + Celery Broker)
REDIS_URL=redis://localhost:6379/0

# Qdrant Vector Search
QDRANT_URL=http://localhost:6333

# JWT (Generate: `openssl rand -base64 32`)
JWT_SECRET_KEY=your-32-byte-base64-secret-here
JWT_ALGORITHM=RS256
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem

# CORS (comma-separated)
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000,tauri://localhost

# Security
TRUSTED_HOSTS=localhost,127.0.0.1,0.0.0.0
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# Connectors (Optional - for integrations)
GREENHOUSE_API_KEY=
WORKDAY_CLIENT_ID=
WORKDAY_CLIENT_SECRET=
WORKDAY_TENANT=

# LLM Providers (Optional - for chat agent)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

#### Frontend (`client/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_APP_NAME=Aurelinx
NEXT_PUBLIC_APP_VERSION=1.0.0-dev
```

#### Infrastructure (`infra/.env.local`)
```bash
# Postgres
POSTGRES_USER=aurelinx
POSTGRES_PASSWORD=password
POSTGRES_DB=aurelinx

# Redis
REDIS_PASSWORD=

# Qdrant
QDRANT_STORAGE_PATH=./qdrant_data

# Monitoring (Optional)
SENTRY_DSN=
OTEL_EXPORTER_OTLP_ENDPOINT=
```

### Generate JWT Keys
```bash
mkdir -p server/keys
openssl genrsa -out server/keys/private.pem 4096
openssl rsa -in server/keys/private.pem -pubout -out server/keys/public.pem
# Add paths to server/.env
```

---

## Local Development Workflows

### Backend Only
```bash
cd server
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Only
```bash
cd client
pnpm dev
```

### Database Operations
```bash
# Run migrations
cd server && alembic upgrade head

# Create migration
cd server && alembic revision --autogenerate -m "add screening explanations"

# Seed sample data
cd server && python -m app.core.seed_data

# Reset database (DESTRUCTIVE)
cd server && alembic downgrade base && alembic upgrade head && python -m app.core.seed_data
```

### Run Tests
```bash
# Backend
make test-backend

# Frontend
cd client && pnpm test && pnpm test:e2e

# Desktop
cd desktop/src-tauri && cargo test

# All
make test
```

### Lint & Format
```bash
# All
make lint && make format

# Individual
make lint-backend
make lint-frontend
make lint-desktop
```

---

## Production Deployment

### Option 1: Docker Compose (Single VM / Small Scale)

#### Prepare
```bash
# On production server
git clone https://github.com/ravindersingh/Aurelinx.git
cd Aurelinx/infra

# Configure production env
cp .env.production.example .env.production
# Edit .env.production with production values
```

#### Required Production Variables (`infra/.env.production`)
```bash
# Database (use managed PostgreSQL in production)
DATABASE_URL=postgresql+asyncpg://user:pass@prod-db:5432/aurelinx

# Redis (use managed Redis/ElastiCache)
REDIS_URL=redis://prod-redis:6379/0

# Qdrant (use managed or self-hosted cluster)
QDRANT_URL=http://prod-qdrant:6333

# JWT (Generate new production keys!)
JWT_SECRET_KEY=<production-32-byte-base64>
JWT_ALGORITHM=RS256
JWT_PRIVATE_KEY_PATH=/secrets/jwt/private.pem
JWT_PUBLIC_KEY_PATH=/secrets/jwt/public.pem

# Domain & SSL
ALLOWED_ORIGINS=https://aurelinx.yourdomain.com,https://app.aurelinx.yourdomain.com
TRUSTED_HOSTS=aurelinx.yourdomain.com,app.aurelinx.yourdomain.com

# Security
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=60
SECURE_COOKIES=true
CSRF_PROTECTION=true

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.yourdomain.com:4317

# Email (for notifications)
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@aurelinx.yourdomain.com

# Connectors
GREENHOUSE_API_KEY=
WORKDAY_CLIENT_ID=
WORKDAY_CLIENT_SECRET=
WORKDAY_TENANT=

# LLM
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

#### Deploy
```bash
# Build and start
docker compose -f docker-compose.prod.yml up --build -d

# Run migrations
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Verify
docker compose -f docker-compose.prod.yml ps
curl -f https://aurelinx.yourdomain.com/health
```

#### Production Compose Services
```yaml
# docker-compose.prod.yml
services:
  nginx:           # Reverse proxy, TLS termination, rate limiting
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes: ["./nginx.conf:/etc/nginx/nginx.conf", "certs:/etc/ssl/certs"]
    depends_on: [backend, frontend]

  backend:         # FastAPI (Gunicorn + Uvicorn workers)
    build: ../server
    environment: [from .env.production]
    deploy:
      replicas: 3
      resources:
        limits: {cpus: "2", memory: "2G"}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s

  frontend:        # Next.js (standalone output)
    build: ../client
    environment: [from .env.production]
    deploy:
      replicas: 2

  worker:          # Celery worker (screening, sync, analytics)
    build: ../server
    command: celery -A app.workers.celery_app worker -Q screening,sync,analytics -c 4
    deploy:
      replicas: 4

  scheduler:       # Celery beat (periodic tasks)
    build: ../server
    command: celery -A app.workers.celery_app beat
    deploy:
      replicas: 1

  # Postgres, Redis, Qdrant: Use MANAGED SERVICES in production!
  # See "Managed Services" section below.
```

### Option 2: Kubernetes (Recommended for Production)

#### Prerequisites
- Kubernetes 1.28+
- Helm 3.12+
- cert-manager (for TLS)
- External Secrets Operator (for Vault/AWS Secrets Manager)
- Prometheus Operator (for monitoring)

#### Install via Helm
```bash
# Add repo (when published)
helm repo add aurelinx https://charts.aurelinx.com
helm repo update

# Install
helm install aurelinx aurelinx/aurelinx \
  --namespace aurelinx-prod \
  --create-namespace \
  --values values-prod.yaml
```

#### Key `values-prod.yaml` Settings
```yaml
global:
  domain: aurelinx.yourdomain.com
  tls:
    enabled: true
    issuer: letsencrypt-prod

backend:
  replicas: 3
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 20
    targetCPUUtilization: 70
  resources:
    limits: {cpu: "2000m", memory: "2Gi"}
    requests: {cpu: "500m", memory: "1Gi"}

frontend:
  replicas: 2
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10

worker:
  screening:
    replicas: 3
    autoscaling:
      enabled: true
      keda:
        enabled: true
        pollingInterval: 15
        cooldownPeriod: 300
        triggers:
          - type: redis
            metadata:
              host: redis-master
              port: "6379"
              listName: "celery:screening"
              targetListLength: "50"

scheduler:
  enabled: true
  replicas: 1

postgresql:
  # USE MANAGED POSTGRES (RDS, Cloud SQL, Azure Database) INSTEAD
  enabled: false
  # external:
  #   host: prod-db.yourdomain.com
  #   port: 5432
  #   database: aurelinx
  #   existingSecret: aurelinx-postgres-credentials

redis:
  # USE MANAGED REDIS (ElastiCache, Azure Cache) INSTEAD
  enabled: false

qdrant:
  # Use Qdrant Cloud or self-hosted cluster
  enabled: false

monitoring:
  prometheus:
    enabled: true
  grafana:
    enabled: true
  alertmanager:
    enabled: true
```

#### Secrets Management (External Secrets Operator)
```yaml
# external-secrets.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: aurelinx-secrets
  namespace: aurelinx-prod
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: aurelinx-secrets
    creationPolicy: Owner
  data:
    - secretKey: JWT_SECRET_KEY
      remoteRef:
        key: aurelinx/prod/jwt
        property: secret_key
    - secretKey: DATABASE_URL
      remoteRef:
        key: aurelinx/prod/postgres
        property: url
    - secretKey: OPENAI_API_KEY
      remoteRef:
        key: aurelinx/prod/llm
        property: openai_key
```

### Option 3: Cloud Provider Managed Services (Recommended)

| Component | AWS | GCP | Azure | Self-Hosted |
|-----------|-----|-----|-------|-------------|
| **PostgreSQL** | RDS (Multi-AZ) | Cloud SQL | Azure Database | Patroni + pgBouncer |
| **Redis** | ElastiCache (Cluster) | Memorystore | Azure Cache | Redis Sentinel |
| **Qdrant** | Qdrant Cloud | Qdrant Cloud | Qdrant Cloud | Qdrant Cluster |
| **Object Storage** | S3 | GCS | Blob Storage | MinIO |
| **Container Registry** | ECR | Artifact Registry | ACR | Harbor |
| **Secrets** | Secrets Manager | Secret Manager | Key Vault | Vault |
| **Monitoring** | CloudWatch + X-Ray | Cloud Monitoring | Azure Monitor | Prometheus + Grafana |
| **Load Balancer** | ALB + CloudFront | Cloud Load Balancing | Front Door | nginx + Cloudflare |

---

## SSL/TLS Configuration

### Let's Encrypt (Automatic via cert-manager)
```yaml
# cert-manager ClusterIssuer
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@aurelinx.yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

### Custom Certificates
```bash
# Place in infra/certs/
# fullchain.pem + privkey.pem
# Reference in nginx.conf:
ssl_certificate /etc/ssl/certs/fullchain.pem;
ssl_certificate_key /etc/ssl/certs/privkey.pem;
```

---

## Database Migration Strategy

### Zero-Downtime Migrations
```bash
# 1. Backward-compatible migration (add column, create index)
alembic revision --autogenerate -m "add screening_shap_values"

# 2. Deploy new code (reads/writes both old + new)
# 3. Backfill data (background job)
# 4. Deploy cleanup migration (drop old column)
```

### Migration Checklist
- [ ] Test on staging with production data volume
- [ ] Verify rollback works (`alembic downgrade -1`)
- [ ] Schedule during low-traffic window
- [ ] Monitor `pg_stat_activity` during migration
- [ ] Have rollback plan documented

---

## Monitoring & Operations

### Health Checks
| Endpoint | Purpose | Expected |
|----------|---------|----------|
| `GET /health` | Liveness | `200 OK` |
| `GET /ready` | Readiness | `200 OK` (DB, Redis, Qdrant reachable) |
| `GET /api/v1/health/detailed` | Deep check | Component status JSON |

### Key Dashboards (Grafana)
- **System Overview**: Request rate, error rate, latency (RED metrics)
- **Business Metrics**: Screenings/day, active users, connector sync status
- **Infrastructure**: CPU, memory, disk, network per service
- **Database**: Connections, slow queries, replication lag
- **Queue**: Celery queue depths, worker utilization, task duration

### Alerting Rules (Critical)
```yaml
groups:
  - name: aurelinx-critical
    rules:
      - alert: BackendDown
        expr: up{job="aurelinx-backend"} == 0
        for: 1m
        labels: {severity: critical}
        annotations:
          summary: "Backend is down"
          
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.9
        for: 5m
        labels: {severity: critical}
        
      - alert: ScreeningQueueStuck
        expr: rate(celery_tasks_completed_total{queue="screening"}[10m]) == 0
        for: 10m
        labels: {severity: critical}
```

### Log Aggregation
```yaml
# Loki + Promtail (Kubernetes)
# Or: Datadog, Elastic, Splunk, CloudWatch
# Structured JSON logs with trace_id for correlation
```

---

## Backup & Disaster Recovery

### Automated Backups
| Component | Frequency | Retention | Method |
|-----------|-----------|-----------|--------|
| PostgreSQL | Daily + WAL archiving | 30 days | pgBackRest / RDS snapshots |
| Redis | Hourly RDB | 7 days | Redis snapshots |
| Qdrant | Daily | 14 days | Qdrant snapshots |
| Config/Secrets | On change | 90 days | GitOps + Vault |

### Recovery Procedures
1. **Database Restore**: `pgBackRest restore --target-time="2026-08-23 10:00:00"`
2. **Redis Restore**: Stop Redis, replace `dump.rdb`, restart
3. **Qdrant Restore**: `qdrant-cli snapshot restore --name backup-20260823`
4. **Full DR Test**: Quarterly, documented runbook

---

## Desktop App Distribution

### Build Release
```bash
cd desktop/src-tauri
# Version bump handled by root Makefile
cargo tauri build --target universal-apple-darwin  # macOS universal
cargo tauri build --target x86_64-pc-windows-msvc  # Windows
cargo tauri build --target x86_64-unknown-linux-gnu  # Linux
```

### Artifacts Produced
| Platform | Format | Location |
|----------|--------|----------|
| macOS | `.dmg`, `.app.tar.gz` | `src-tauri/target/universal-apple-darwin/release/bundle/dmg/` |
| Windows | `.exe` (NSIS), `.msi` | `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/` |
| Linux | `.deb`, `.AppImage`, `.tar.gz` | `src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/` |

### Auto-Updater
- **Server**: GitHub Releases (signed assets)
- **Client**: Tauri updater with Ed25519 verification
- **Channels**: `stable`, `beta`, `nightly` (via `--channel` flag)

### Code Signing
```bash
# macOS (Apple Developer ID)
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application: Your Name (TEAM_ID)" \
  --options runtime \
  Aurelinx.app

# Windows (EV Certificate)
signtool sign /fd sha256 /tr http://timestamp.digicert.com \
  /a Aurelinx_Setup.exe

# Linux (GPG)
gpg --detach-sign --armor Aurelinx_1.0.0_amd64.deb
```

---

## Rollback Procedures

### Backend Rollback
```bash
# Docker Compose
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --force-recreate backend:v1.0.1

# Kubernetes
helm rollback aurelinx 3  # Revision 3
# OR
kubectl set image deployment/backend backend=ghcr.io/ravindersingh/aurelinx/backend:v1.0.1
```

### Database Rollback
```bash
# If migration was backward-compatible
alembic downgrade -1

# If breaking (restore from backup)
pgBackRest restore --target-time="2026-08-23 09:00:00"
```

### Frontend Rollback
```bash
# Vercel/Netlify: Instant rollback via dashboard
# Kubernetes: helm rollback / kubectl rollout undo
# Static: Re-deploy previous build artifact
```

---

## Security Hardening Checklist

### Pre-Deployment
- [ ] All secrets in Vault/Secrets Manager (not `.env`)
- [ ] JWT keys rotated, RS256 algorithm
- [ ] TLS 1.3 only, HSTS enabled
- [ ] CSP headers configured
- [ ] Rate limiting enabled on all endpoints
- [ ] CORS restricted to known domains
- [ ] Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- [ ] Dependency scans clean (`pip-audit`, `npm audit`, `cargo audit`)
- [ ] Container images signed (cosign)
- [ ] SBOM generated and published

### Post-Deployment
- [ ] Penetration test scheduled
- [ ] Vulnerability scanning enabled (Trivy, Grype)
- [ ] Log monitoring for anomalies
- [ ] Incident response runbook accessible
- [ ] Backup restore tested

---

## Scaling Guidelines

### When to Scale
| Metric | Threshold | Action |
|--------|-----------|--------|
| Backend CPU | > 70% for 10m | Add replicas |
| Backend p99 latency | > 500ms | Add replicas, check DB |
| Celery queue depth | > 100 | Add workers |
| DB connections | > 80% max | Add PgBouncer, read replicas |
| Redis memory | > 80% | Increase memory, add cluster nodes |
| Qdrant search latency | > 200ms | Add shards/replicas |

### Capacity Planning
```
Baseline (1000 users):
- Backend: 3 replicas × 2 CPU / 2GB
- Workers: 4 screening + 2 sync + 2 analytics
- PostgreSQL: 8 vCPU / 32GB (Primary) + 2 read replicas
- Redis: 16GB (Cluster mode)
- Qdrant: 3 nodes × 8 vCPU / 32GB

Scale Factor: ~Linear with user count
```

---

## Support & Escalation

| Issue | Channel | SLA |
|-------|---------|-----|
| Production down | `ops@aurelinx.com` + PagerDuty | 15 min |
| Performance degradation | `ops@aurelinx.com` | 1 hour |
| Security incident | `security@aurelinx.com` | 30 min |
| Feature deployment | GitHub Deployments | Next release |

---

## Related Documents
- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture
- [SECURITY.md](SECURITY.md) — Security controls
- [ROADMAP.md](ROADMAP.md) — Future deployment targets
- [CONTRIBUTING.md](CONTRIBUTING.md) — Development workflow