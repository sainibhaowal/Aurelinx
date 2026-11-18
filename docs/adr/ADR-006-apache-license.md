# ADR-006: Apache License 2.0 for Aurelinx

**Status**: Accepted  
**Date**: 2026-08-23  
**Deciders**: @ravindersingh  
**Technical Story**: Licensing decision for open-source release

## Context

Need to choose an open-source license for Aurelinx. Goals:
- Enable enterprise adoption (companies can use in proprietary products)
- Protect contributor credit (attribution required)
- Patent protection for contributors and users
- Professional credibility (used by major projects)
- Future commercial flexibility (dual-licensing possible)
- Student/portfolio project — maximize visibility and hiring signal

Options considered:
1. **Apache 2.0** (Permissive + patent grant + attribution)
2. **MIT** (Simplest permissive)
3. **BSD-3-Clause** (Permissive + no endorsement)
4. **GPL v3** (Strong copyleft)
5. **AGPL v3** (Network copyleft)
6. **MPL 2.0** (File-level copyleft)
7. **Proprietary / Source Available** (BSL, ELv2, etc.)

## Decision

**Choose Apache License 2.0** for Aurelinx.

## Consequences

### Positive
- **Enterprise-friendly**: Permissive — companies can embed in proprietary SaaS
- **Attribution enforced**: License requires preserving copyright/license notices
- **Patent grant**: Protects contributors and users from patent litigation
- **No endorsement clause**: Prevents implied endorsement by contributors
- **Professional signal**: Used by Kubernetes, TensorFlow, Android, VS Code, Rust
- **Dual-license ready**: Copyright holder can sell commercial license later
- **Hiring signal**: Shows legal/IP maturity for student portfolio

### Negative
- **More verbose** than MIT (mitigated: standard header, tooling handles it)
- **Not viral**: Derivatives can be closed source (by design for enterprise adoption)

### Risks
- **Cloud providers** could offer hosted Aurelinx without contributing back (acceptable: trademark protects brand)
- **Competitors** could fork and extend (mitigated: trademark + community momentum)

## Alternatives Considered

| Alternative | Pros | Cons | Why Not Chosen |
|-------------|------|------|----------------|
| MIT | Simplest, shortest | No patent grant, weaker attribution | Patent protection important for ML |
| BSD-3 | Permissive, no endorsement | No patent grant | Apache patent clause stronger |
| GPL v3 | Protects freedom, viral | Scares enterprises, no SaaS embedding | Enterprise adoption goal |
| AGPL v3 | Covers network use | Even scarier for enterprises | Overkill |
| MPL 2.0 | Middle ground | File-level complexity, less known | Apache more recognized |
| BSL/ELv2 | Source available | Not open source (OSI), limits adoption | Open source for credibility |

## Implementation Notes

- Add `LICENSE` file with full Apache 2.0 text
- Add `NOTICE` file with third-party acknowledgments
- Add license header to **every source file** (Python, JS/TS, Rust)
- Update `README.md` with license badge
- Add `LICENSE` to `.github/FUNDING.yml` for sponsor visibility
- Configure `reuse` tool for compliance checking (future)

## Related ADRs

- ADR-001: FastAPI + SQLModel for Backend
- ADR-002: Next.js App Router for Frontend
- ADR-003: Tauri for Desktop
