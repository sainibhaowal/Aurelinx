# Roadmap

## Vision

Build the leading open-source HR intelligence platform that empowers organizations
to make data-driven people decisions with privacy, ethics, and transparency at the core.

---

## Version 1.0 — Foundation (Q3 2026)

**Status: In Progress**

### Core Platform
- [x] FastAPI backend with async architecture
- [x] PostgreSQL + Redis + Elasticsearch
- [x] Authentication (JWT, OAuth2, SSO)
- [x] Role-based access control
- [x] Audit logging framework
- [x] Database migrations (Alembic)

### Intelligence Engine
- [x] Candidate screening & scoring
- [x] Team composition optimization
- [x] Attrition risk prediction
- [x] Sentiment analysis pipeline
- [ ] Skills gap analysis
- [ ] Career pathing recommendations

### Integrations
- [x] Greenhouse ATS connector
- [x] Workday HRIS connector
- [ ] Lever ATS connector
- [ ] BambooHR connector
- [ ] Generic webhook framework
- [ ] Custom connector SDK

### Frontend
- [x] Next.js 14 dashboard
- [x] Real-time analytics views
- [x] Candidate review workflow
- [x] Team intelligence center
- [ ] Mobile-responsive design
- [ ] Dark mode

### Desktop App
- [x] Tauri shell
- [x] Native authentication
- [x] Offline capability
- [ ] System tray integration
- [ ] Auto-updater

### DevOps
- [x] Docker Compose for local dev
- [x] GitHub Actions CI/CD
- [ ] Kubernetes manifests
- [ ] Helm charts
- [ ] Terraform modules

---

## Version 1.1 — Intelligence Expansion (Q4 2026)

### Advanced Analytics
- [ ] Diversity & inclusion analytics
- [ ] Compensation benchmarking
- [ ] Workforce planning models
- [ ] Predictive hiring needs
- [ ] Engagement pulse surveys

### AI/ML Enhancements
- [ ] LLM-powered job description optimizer
- [ ] Interview question generator
- [ ] Candidate fit explanations (SHAP/LIME)
- [ ] Bias detection in hiring patterns
- [ ] Natural language query interface

### Platform
- [ ] Plugin/extension system
- [ ] Custom dashboard builder
- [ ] Advanced reporting engine
- [ ] Scheduled report delivery
- [ ] API rate limiting tiers

---

## Version 1.2 — Enterprise Ready (Q1 2027)

### Security & Compliance
- [ ] SOC 2 Type II readiness
- [ ] GDPR/CCPA compliance tools
- [ ] Data residency controls
- [ ] Advanced audit trail
- [ ] Penetration testing program

### Scalability
- [ ] Horizontal scaling benchmarks
- [ ] Multi-region deployment
- [ ] Read replicas for analytics
- [ ] Caching strategy optimization
- [ ] Load testing suite

### Enterprise Features
- [ ] SSO/SAML/OIDC providers
- [ ] SCIM provisioning
- [ ] Custom branding
- [ ] White-label options
- [ ] Dedicated support portal

---

## Version 2.0 — Platform Ecosystem (Q3 2027)

### Marketplace
- [ ] Community connector marketplace
- [ ] Custom model marketplace
- [ ] Template library
- [ ] Revenue sharing for contributors

### Extensibility
- [ ] WebAssembly plugin runtime
- [ ] Event-driven architecture
- [ ] GraphQL federation
- [ ] Real-time subscriptions

### AI Agent Framework
- [ ] Autonomous HR agents
- [ ] Workflow automation builder
- [ ] Multi-agent orchestration
- [ ] Human-in-the-loop controls

---

## Research & Exploration

- [ ] Federated learning for privacy-preserving analytics
- [ ] Differential privacy for sensitive metrics
- [ ] Blockchain for credential verification
- [ ] Quantum-resistant cryptography prep
- [ ] Edge computing for global deployments

---

## How to Influence the Roadmap

1. **Vote** on GitHub Discussions (👍 reactions count)
2. **Propose** new features via RFC process
3. **Contribute** — PRs for roadmap items get priority review
4. **Sponsor** — Funded features get dedicated resources

---

## Release Cadence

| Release | Target | Focus |
|---------|--------|-------|
| Patch | Bi-weekly | Bug fixes, security |
| Minor | Monthly | Features, improvements |
| Major | Yearly | Breaking changes, architecture |

---

*Last updated: 2026-08-23*
*Next review: 2026-09-23*