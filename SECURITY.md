# Aurelinx Security Policy

> **Project**: Aurelinx HR Intelligence Platform  
> **Version**: 1.2.0  
> **Contact**: `rav.singh039@gmail.com`  

---

## Supported Versions

| Version | Status | Security Updates |
|---------|--------|------------------|
| `master` | Active development | Best effort |
| `v1.2.x` | Latest Production | Supported |

---

## Reporting a Vulnerability

### Do not create public GitHub issues for security vulnerabilities.

### Report Privately To:
**`rav.singh039@gmail.com`**

Include:
1. **Description** — What is the vulnerability?
2. **Impact** — What can an attacker achieve? (RCE, data leak, auth bypass, etc.)
3. **Reproduction** — Minimal steps/Payload to reproduce
4. **Affected Components** — e.g., `server/app/api/v1/auth.py`, `client/src/lib/auth.ts`
5. **Environment** — Version, deployment (Docker/K8s/local), config
6. **Suggested Fix** — If you have one
7. **Your Contact** — For coordination and credit

### Response Commitments

| Severity | Acknowledgment | Initial Assessment | Fix Target | Disclosure |
|----------|---------------|-------------------|------------|------------|
| **Critical** (RCE, auth bypass, mass data leak) | ≤24 hours | ≤72 hours | ≤7 days | Coordinated, after fix |
| **High** (Privilege escalation, single-user data leak) | ≤48 hours | ≤5 business days | ≤14 days | Coordinated, after fix |
| **Medium** (Info disclosure, DoS, logic flaw) | ≤5 business days | ≤10 business days | ≤30 days | Coordinated, after fix |
| **Low** (Minor info leak, hardening) | ≤10 business days | ≤15 business days | Next minor | Optional |

### Disclosure Process
1. **Acknowledge** — We confirm receipt within SLA
2. **Validate** — Reproduce, assess impact, assign CVE if warranted
3. **Develop Fix** — Private branch, minimal scope, regression tests
4. **Coordinate Release** — Agree on disclosure date with reporter
5. **Publish** — Security advisory (GitHub Security Advisories), release notes, changelog
6. **Credit** — Reporter acknowledged (unless anonymity requested)

---

## Aurelinx-Specific Threat Model

### Attack Surface

| Component | Exposure | Primary Risks |
|-----------|----------|---------------|
| **REST API** (`/api/v1/*`) | Internet (if deployed publicly) | Auth bypass, injection, rate limit bypass, PII exposure |
| **WebSocket** (`/ws/chat`) | Authenticated users | Message injection, DoS, info leak |
| **Connectors** (Greenhouse, Workday) | Outbound + webhook inbound | Credential theft, SSRF, webhook spoofing |
| **File Upload** (resumes, attachments) | Authenticated users | Malicious files, path traversal, DoS |
| **Vector Search** (Qdrant) | Internal network | Data poisoning, embedding inversion |
| **Desktop App** (Tauri) | User's machine | IPC abuse, native code execution, auto-updater hijack |

### Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                      INTERNET                                │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS/TLS 1.3
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    EDGE (nginx/Cloudflare)                   │
│  Rate limiting │ WAF │ TLS termination │ Cert management    │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   FRONTEND    │ │    BACKEND    │ │   CONNECTORS  │
│  (Next.js)    │ │  (FastAPI)    │ │  (Outbound)   │
│  Static assets│ │  API + WS     │ │  Webhook recv │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                 │                 │
        │         ┌───────┴───────┐         │
        │         ▼               ▼         │
        │  ┌─────────┐       ┌─────────┐    │
        │  │PostgreSQL│       │  Redis  │    │
        │  │ (Primary)│       │ (Cache/ │    │
        │  │          │       │  Queue) │    │
        │  └────┬────┘       └────┬────┘    │
        │       │                 │          │
        ▼       ▼                 ▼          ▼
┌─────────────────────────────────────────────────────────────┐
│                    INTERNAL NETWORK                          │
│  Qdrant (vectors) │ MLflow (models) │ Workers │ Scheduler  │
└─────────────────────────────────────────────────────────────┘
```

### Data Classification

| Classification | Examples | Protection |
|----------------|----------|------------|
| **PII** | Names, emails, phones, addresses, resumes | Encryption at rest (pgcrypto), TLS 1.3 in transit, column-level encryption for sensitive fields |
| **Credentials** | API keys, OAuth tokens, webhook secrets | HashiCorp Vault / AWS Secrets Manager / `.env` (dev only), never in logs |
| **Analytics** | Sentiment scores, screening results, attrition risk | Row-level security, audit logging, aggregation for reporting |
| **Public** | Job descriptions, company info, public profiles | Standard protection |

---

## Security Controls Implemented

### Application Layer
- **Authentication**: JWT (RS256), short-lived access (15m) + refresh tokens (7d), rotation on use
- **Authorization**: RBAC (admin/member/viewer), resource-level permissions, admin-only tools in chat agent
- **Input Validation**: Pydantic v2 models on all endpoints, strict enum validation, size limits
- **Output Encoding**: Auto-escaping in templates, CSP headers, `X-Content-Type-Options: nosniff`
- **Rate Limiting**: Per-IP + per-user (Redis-backed), stricter on auth endpoints
- **Audit Logging**: All mutating operations + auth events + admin actions (immutable append-only)
- **Secrets Management**: Zero secrets in code, `.env.example` templates, runtime injection

### Infrastructure Layer
- **Containers**: Non-root user, read-only rootfs, dropped capabilities, distroless base images
- **Network**: Database/internal services not exposed externally, service mesh ready
- **Database**: Parameterized queries only (SQLAlchemy ORM), row-level security policies, automated backups with encryption
- **Monitoring**: Structured JSON logs, OpenTelemetry traces, Prometheus metrics, alerting on anomalies

### Supply Chain
- **Dependencies**: `pip-audit`, `npm audit`, `cargo audit` in CI on every PR
- **Pinning**: Exact versions + hashes in `requirements.txt`, `package-lock.json`, `Cargo.lock`
- **SBOM**: Generated via `syft` on release, published to GitHub Releases
- **Signing**: Cosign/keyless signing for container images and desktop installers

### Desktop (Tauri) Specific
- **IPC**: Allowlist-only commands, no `eval`/`exec`, schema-validated arguments
- **Auto-Updater**: Signed updates, version verification, rollback capability
- **CSP**: Strict policy, no inline scripts, nonce-based for required inline
- **Permissions**: Minimal (network, fs read/write scoped to app data)

---

## Secure Development Practices

### For Contributors
```bash
# Pre-commit (run locally)
cd server && pre-commit run --all-files
cd client && pnpm exec lint-staged

# Security checks before PR
cd server && pip-audit && bandit -r app/
cd client && pnpm audit
cd desktop/src-tauri && cargo audit
```

**Never commit**:
- `.env` files with real values
- API keys, tokens, certificates
- Database dumps with real data
- Generated secrets (JWT keys, encryption keys)

### For Maintainers (Review Checklist)
- [ ] No hardcoded secrets or credentials
- [ ] Input validation on all user-controlled data
- [ ] Authorization checks on all mutating endpoints
- [ ] No new SQL injection vectors (raw SQL?)
- [ ] File uploads: type validation, size limits, sandboxed processing
- [ ] Webhook signatures verified (Greenhouse, Workday, custom)
- [ ] Dependencies: minimal, maintained, no known CVEs
- [ ] Logging: no PII/credentials in logs
- [ ] Error messages: no stack traces in production responses

---

## Incident Response

### Security Incident Definition
Any confirmed or suspected:
- Unauthorized access to data or systems
- Vulnerability actively exploited
- Credential compromise
- Malicious code deployment

### Response Plan
1. **Detect** — Monitoring alerts, user reports, security@ email
2. **Assess** — Severity, scope, active exploitation?
3. **Contain** — Revoke tokens, block IPs, disable features, rotate keys
4. **Eradicate** — Patch vulnerability, remove malicious artifacts
5. **Recover** — Restore from clean backups, verify integrity
6. **Postmortem** — Blameless, public (redacted), action items tracked

### Communication
- **Internal**: Maintainers + BDFL (Signal/encrypted email)
- **Users**: GitHub Security Advisory + email (if email collected)
- **Public**: Coordinated disclosure timeline

---

## Compliance & Standards

| Standard | Status | Notes |
|----------|--------|-------|
| **OWASP Top 10** | ✅ Addressed | See `docs/security/owasp-mapping.md` |
| **OWASP API Security Top 10** | ✅ Addressed | Rate limiting, auth, validation, logging |
| **GDPR** | 🟡 Design-ready | Data export/delete endpoints planned, DPIA template in `docs/compliance/` |
| **CCPA** | 🟡 Design-ready | Same as GDPR |
| **SOC 2 Type II** | 🔄 Roadmap v1.2 | Controls documented, audit prep in `docs/compliance/soc2/` |
| **ISO 27001** | 🔄 Roadmap v2.0 | ISMS framework planned |

---

## Hall of Fame

Security researchers who responsibly disclosed vulnerabilities:

| Researcher | Vulnerability | Date | Credit |
|------------|---------------|------|--------|
| *(awaiting first report)* | | | |

---

## Security Resources

- **OWASP Cheat Sheets**: https://cheatsheetseries.owasp.org/
- **FastAPI Security**: https://fastapi.tiangolo.com/tutorial/security/
- **Tauri Security**: https://tauri.app/v1/guides/security/
- **Dependency Review**: https://github.com/sainibhaowal/Aurelinx/security/dependabot
- **CodeQL Analysis**: https://github.com/sainibhaowal/Aurelinx/security/code-scanning