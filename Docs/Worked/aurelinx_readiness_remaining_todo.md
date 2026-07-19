# Aurelinx Readiness Remaining Todo

## Goal
Close the last enterprise-readiness gaps from the addendum in a lean, startup-friendly way.

## In Progress
1. Expand regional fairness policy packs beyond department-level parity summaries.
2. Multi-tenant security scoping, secret handling, and SRE/DR hooks.
3. Optional real vendor auth flows for Workday and Greenhouse if enterprise customers need direct connector sync.
4. Marketing screenshots and workflow preview assets for the landing page.

## Completed
1. Local end-to-end import mode.
2. Tenant scoping.
3. Scheduled sync orchestration.
4. Policy packs and policy checks.
5. Drift snapshots and retraining trigger.
6. Scenario persistence.
7. Enterprise operations UI.
8. Audit enforcement for enterprise actions.
9. Fairness and regional compliance reporting.
10. Model governance with model cards and promotion/rollback.
11. Release governance across dev/stage/prod.
12. DR / SRE admin runbooks and drills.
13. Procurement artifact management.
14. Public landing page route outside the shell.
15. Lazy-loaded workspace views and deferred export/report bundle.
16. Import validation scorecards and executive packet generation.

## Implementation Order
1. Add audit helper and wire it into every mutating enterprise endpoint.
2. Add fairness summary endpoint and region-aware policy review output.
3. Add model cards and approval/promotion workflow.
4. Add release promotion record endpoints.
5. Add regional fairness enforcement and security/DR hardening.

## Definition Of Done
1. Every meaningful enterprise mutation writes an audit record.
2. Policy checks can explain why an action is blocked.
3. Model versions can be reviewed and promoted with approval.
4. The readiness addendum can be mapped to code or documented artifacts.
