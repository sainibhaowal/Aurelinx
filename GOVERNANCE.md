# Aurelinx Governance Model

> **Project**: Aurelinx — Open-Source HR Intelligence Platform  
> **BDFL**: Ravinder Singh (@ravindersingh)  
> **Status**: Active development (pre-1.0)  
> **Last Updated**: 2026-08-23

---

## Roles & Responsibilities

### Benevolent Dictator For Life (BDFL)
**Ravinder Singh** — Final authority on:
- Project vision, roadmap priorities, and release milestones
- Breaking changes to public APIs, database schemas, connector interfaces
- Security incident response and disclosure coordination
- Code of Conduct enforcement and community bans
- License changes, governance amendments, project transfer
- Maintainer appointments/removals

**Contact**: `ravinder.singh@aurelinx.com` | GitHub: `@ravindersingh`

### Maintainers (Core Team)
Trusted contributors with **write access** to `ravindersingh/Aurelinx`. Current maintainers listed in [MAINTAINERS.md](MAINTAINERS.md).

**Responsibilities**:
- Review/merge PRs within **3 business days** (SLA)
- Triage new issues weekly (label, assign, milestone)
- Mentor contributors on Aurelinx architecture
- Participate in release process (testing, changelog, tagging)
- Uphold Code of Conduct in PR reviews and discussions
- Attend quarterly planning (async via GitHub Discussions)

**Areas of Ownership** (examples):
| Maintainer | Primary Areas |
|------------|---------------|
| @ravindersingh | All (BDFL) |
| *(open)* | Backend: Screening Engine, Chat Agent, ML Pipeline |
| *(open)* | Frontend: Talent Scout, Intelligence Center, Analytics |
| *(open)* | Integrations: Greenhouse, Workday, Lever, Custom SDK |
| *(open)* | Desktop: Tauri, Auto-updater, Native Features |
| *(open)* | DevOps: CI/CD, Docker, Kubernetes, Security Scanning |

### Contributors
Anyone with **merged PRs**. Recognized in `CHANGELOG.md` and `AUTHORS.md`.

### Community Members
Users, testers, discussion participants, documentation writers, advocates.

---

## Decision-Making Process

### 1. Routine Decisions (PR Reviews, Bug Fixes, Small Features)
- **Authority**: Any maintainer
- **Process**: Standard PR review → approve → merge
- **Escalation**: Disagreement → second maintainer → BDFL

### 2. Significant Decisions (New APIs, Architecture Changes, New Connectors)
**Consensus-Seeking Process**:
1. **Proposal** — Open GitHub Issue with `proposal` label, include:
   - Problem statement & use cases
   - Technical design (API, data model, migration plan)
   - Alternatives considered
   - Breaking change analysis
2. **Discussion** — **7-day** comment period for community input
3. **Consensus Check** — Maintainers summarize positions in issue
4. **Decision** — BDFL makes final call if no consensus

### 3. Major Decisions (License, Governance, BDFL Succession, Project Transfer)
**Formal Vote Required**:
- **Quorum**: BDFL + ≥3 maintainers
- **Threshold**: 75% supermajority
- **Voting Window**: 14 days
- **Record**: Archived in `GOVERNANCE_HISTORY.md`

---

## Adding Maintainers

### Criteria (all required)
- **Time**: ≥6 months active contribution
- **Impact**: ≥5 merged PRs across **≥2 areas** (backend, frontend, desktop, integrations, ML, DevOps)
- **Judgment**: Demonstrated architectural thinking in reviews
- **Collaboration**: Helpful, respectful in PR reviews and discussions
- **Trust**: Community endorsement (no objections during nomination)

### Process
1. **Nomination** — Existing maintainer opens issue with `maintainer-nomination` label
2. **Discussion** — 7-day community comment period
3. **Decision** — BDFL approves (or vetoes with written rationale)
4. **Onboarding** — Access granted, added to `MAINTAINERS.md`, announced

### Emeritus Status
- Voluntary resignation → `MAINTAINERS.md` (Emeritus section)
- Inactivity >12 months → graceful transition, access revoked
- Code of Conduct violation → immediate (see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md))

---

## Release Management

### Versioning
[Semantic Versioning](https://semver.org/) — `MAJOR.MINOR.PATCH`

| Release Type | Cadence | Authority | Examples |
|--------------|---------|-----------|----------|
| Patch | As needed (bi-weekly target) | Any maintainer | Bug fixes, security, deps |
| Minor | Monthly | Maintainer consensus | New features, connectors |
| Major | Yearly or as needed | BDFL + maintainer vote | Breaking changes |

### Release Process
1. **Release Branch** — `release/vX.Y.Z` from `main`
2. **CI Gate** — Full test matrix + security scans must pass
3. **Changelog** — `make changelog` (conventional commits → `CHANGELOG.md`)
4. **Approval** — BDFL signs off (GPG-signed tag)
5. **Publish** — GitHub Actions builds:
   - Docker: `ghcr.io/ravindersingh/aurelinx/backend:vX.Y.Z`, `frontend:vX.Y.Z`
   - Desktop: Windows `.exe`, Linux `.deb`/`.AppImage`, macOS `.dmg`
   - GitHub Release with artifacts + notes
6. **Announce** — Discord, Discussions, Twitter/X, LinkedIn

### Hotfix Process
- Branch from latest tag: `hotfix/vX.Y.Z+1`
- Fast-track review (1 maintainer + BDFL)
- Patch release within 24h for critical security

---

## Security Governance

### Vulnerability Handling
See [SECURITY.md](SECURITY.md) — coordinated disclosure, 48h acknowledgment.

### Security Review Required For:
- New authentication/authorization logic
- Connector credential handling
- File upload/processing
- User-generated content rendering
- Database schema changes affecting PII

### Security Maintainers
Designated subset of maintainers with `security@aurelinx.com` access.

---

## Conflict Resolution

### Technical Disagreements
1. **Direct** — Discuss in PR/issue (async, documented)
2. **Mediate** — Escalate to neutral maintainer
3. **Decide** — BDFL ruling (documented in issue)

### Conduct Violations
See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — enforcement by BDFL.

### Governance Disputes
1. Document concern in GitHub issue (`governance-dispute` label)
2. 7-day discussion period
3. BDFL ruling (appealable to maintainer vote within 14 days)

---

## Transparency Commitments

All governance happens **in public**:
- Proposals → GitHub Issues (searchable, permanent)
- Discussions → GitHub Discussions (open to all)
- Decisions → Recorded in issue + `GOVERNANCE_HISTORY.md`
- Meetings → Notes published (if any synchronous meetings occur)

---

## Succession Planning

### BDFL Incapacity/Departure
1. **Interim** — Maintainers elect interim BDFL (simple majority) within 7 days
2. **Election** — Community election within 90 days
   - **Electorate**: All contributors with ≥3 merged PRs
   - **Method**: Ranked-choice voting (GitHub poll or external tool)
3. **Transition** — Outgoing BDFL transfers: domain, socials, email, keys

### Project Abandonment Prevention
If no maintainers active for >6 months:
1. **Transfer** — BDFL transfers to qualified community member
2. **Foundation** — Donate to neutral org (Linux Foundation, Apache Software Foundation, OpenJS Foundation)
3. **Archive** — Last resort: mark archived, preserve history

**Never** abandon without transition plan.

---

## Amendments

This document can be amended by:
- **BDFL decision** (with 7-day community notice), or
- **Maintainer supermajority (75%) + BDFL approval**

All changes documented in [GOVERNANCE_HISTORY.md](GOVERNANCE_HISTORY.md) with:
- Date, author, rationale
- Previous vs. new text (diff)
- Vote record (if applicable)

---

## Related Documents
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — Community standards
- [CONTRIBUTING.md](CONTRIBUTING.md) — Contribution workflow
- [MAINTAINERS.md](MAINTAINERS.md) — Current team
- [SECURITY.md](SECURITY.md) — Vulnerability process
- [ROADMAP.md](ROADMAP.md) — Technical direction