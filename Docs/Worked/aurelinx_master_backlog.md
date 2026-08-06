# Aurelinx Master Backlog

## Goal
Track every remaining enterprise gap and implement Aurelinx as a lean but production-grade HR intelligence platform.

## Completed
1. Connector sync framework with field mappings and sync history.
2. Tenant-scoped lean enterprise tables and request context.
3. Scheduled sync orchestration with retry/history.
4. Compliance policy packs and policy check endpoint.
5. Drift snapshots and retrain trigger for attrition model.
6. Persisted workforce scenarios.
7. Frontend controls for policy, drift, and scenario monitoring.
8. Local CSV import and bundled demo data loader for end-to-end startup mode.
9. Audit enforcement for enterprise mutations.
10. Fairness summary reporting.
11. Model cards and champion/challenger governance.
12. Release gate records and approval flow.
13. Public landing page route outside the shell.
14. Lazy-loaded workspace views and deferred export/report bundle.
15. DR / SRE admin runbooks and drills.
16. Procurement artifact management.
17. Landing page blueprint implementation.
18. Import validation scorecards and executive packet generation.

## Phase 1 Remaining Gaps
1. Multi-tenant security scoping, secret handling, and SRE/DR hooks.
2. Expand regional fairness policy packs beyond department-level parity summaries.
3. Optional real vendor auth flows for Workday and Greenhouse if enterprise customers need direct connector sync.

## Implementation Order
1. Connector auth and mapping.
2. Ingestion scheduler and sync history.
3. ML pipeline and drift.
4. Compliance and fairness engine.
5. Scenario optimizer and persistence.
6. Security and DR.
7. Frontend wiring.

## Definition Of Done
1. A connector can be configured, validated, synchronized, and reviewed.
2. Every sync writes raw, canonical, and quarantine artifacts.
3. An attrition model can be trained, activated, and used for scoring.
4. Compliance policy checks can block risky actions.
5. Scenario inputs produce a persisted recommendation and outputs.
6. Enterprise routes require tenant scoping and emit audit logs.
7. Frontend can operate the new flows end to end.

## Notes
1. Keep the implementation lean.
2. Use production-shaped abstractions, not vendor-specific hardcoding.
3. Prefer small reliable modules over a big framework.
