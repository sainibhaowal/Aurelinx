# Aurelinx Implementation Record

## Purpose
This file is the durable record of what Aurelinx is, what has been implemented, and what remains to be completed.
Use this as the source of truth for future engineering, product, and launch work.

## Current Product Position
Aurelinx is a lean HR Intelligence platform that works end to end without vendor auth.
It supports local CSV import, bundled demo data loading, explainable attrition, interventions, compliance policy checks, sync history, drift snapshots, scenario runs, and tenant-scoped enterprise operations.

## What Is Implemented
1. Employee and candidate management.
2. Skill and experience capture.
3. Explainable attrition risk scoring.
4. Risk-driver drilldown and intervention creation.
5. Intervention lifecycle with 30/60/90 outcome checkpoints.
6. Connector registry with field mappings and sync history.
7. Scheduled sync orchestration.
8. Compliance policy packs and policy checks.
9. Attrition model registry, drift snapshots, and retraining trigger.
10. Workforce scenario persistence.
11. Tenant-aware request context and enterprise route scoping.
12. Local CSV import and demo bundle import.
13. Enterprise operations frontend controls.
14. Audit logging for enterprise actions.
15. Fairness summary reporting.
16. Model governance cards and release gates.
17. Dedicated public landing route outside the shell.
18. Direct dashboard-first workspace entry with no launch screen.
19. Lazy-loaded workspace views and deferred report/export bundle.
20. DR / SRE admin runbooks and procurement artifact management.
21. Full landing-page blueprint implementation with problem, solution, modules, demo, integrations, governance, and CTA sections.
22. Import validation scorecards and executive packet generation.
23. Floating page-scoped agent drawer with real action buttons and page-context copilot prompts.
24. OpenCode Zen provider added to provider settings and wired through chat/copilot/talent flows.
25. Client dev script now binds Vite to 127.0.0.1 so npm run dev serves consistently on the local loopback address.
26. Landing page hero was tightened further into a more literal black reference composition with animated geometry, featured-in logos, and a calmer Inter-based type scale.

## Operational Flow
1. Load demo bundle or upload CSV files.
2. Import employees, candidates, skills, and experience.
3. Run attrition model training.
4. Review risk drivers and create interventions.
5. Apply policy checks before high-impact actions.
6. Run workforce scenarios and store outcomes.
7. Monitor sync jobs, quarantine, and drift snapshots.

## Data Import Paths
1. Demo bundle import from `server/datasets/processed`.
2. CSV upload through the Enterprise Operations screen.
3. Connector sync framework for future vendor integrations.

## Remaining Optional Enterprise Gaps
1. Real Workday / Greenhouse / SuccessFactors auth and live APIs.
2. Stronger fairness and regional compliance packs.
3. Deep SRE and disaster recovery hardening.
4. External connector marketplace.

## Validation Status
1. Backend compile passes.
2. Frontend build passes.
3. Local demo mode is operational.

## Implementation Rules
1. Keep the product lean.
2. Prefer operational value over framework complexity.
3. Avoid adding vendor-specific hard dependencies unless required by a customer.
4. Track every major change here and in the changelog.

## Change History
- 2026-05-18: Added local end-to-end startup mode, import controls, policy packs, drift tracking, and scenario persistence.
- 2026-05-18: Added public landing route, lazy-loaded views, deferred export/report bundle, and DR/procurement admin screens.
- 2026-05-18: Completed the landing-page blueprint with dedicated sections and a local demo-request capture flow.
- 2026-05-18: Added import validation scorecards, executive packet output, and the end-to-end checklist document.
- 2026-05-18: Fixed demo skill imports so the bundled `skill_name` columns load into the workspace correctly.
- 2026-05-18: Added a structured AI copilot endpoint and reusable copilot panels so the LLM can power dashboard and enterprise workflows.
- 2026-05-19: Removed the in-app launch surface and routed the workspace directly to dashboard-first navigation.
- 2026-05-19: Added a floating page agent drawer with page-specific action buttons and a context-aware copilot prompt across the app shell.
- 2026-05-19: Added OpenCode Zen as a selectable provider and wired it through the runtime AI request paths.
- 2026-05-19: Fixed the client dev host binding so `npm run dev` serves reliably on `127.0.0.1:5173`.
- 2026-05-19: Rebuilt the public landing page into a premium glassmorphism composition with a sticky header, split hero, vertical product sections, and a polished footer.
- 2026-05-19: Tightened the landing page into a more editorial, less text-heavy visual system with animated signal field, premium hero, and compact trust sections.
- 2026-05-19: Reworked the landing page into a more cinematic, control-room style composition with an orbital signal hero and tighter premium sections.
- 2026-05-19: Replaced the landing page architecture with a centered hero, orbital signal stage, stacked full-width sections, and a stronger premium CTA/footer flow.
- 2026-05-19: Rebuilt the landing page hero around the supplied reference style with a black premium surface, soft line geometry, glass cards, and a more comfortable type scale.
- 2026-05-19: Finalized the landing page around the supplied reference composition with a centered hero, compact workflow cards, and a polished black glass system.
- 2026-05-19: Tightened the landing page again into a more literal reference-style hero with animated geometry, a teams/logo block, and a calmer Inter type scale.
