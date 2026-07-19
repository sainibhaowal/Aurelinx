# Aurelinx Status Report

## Date
2026-05-19

## Executive Summary
Aurelinx is now operational in local startup mode without vendor auth.
The product can ingest CSV data or load the bundled demo dataset, compute explainable attrition risk, create interventions, run policy checks, track sync jobs, snapshot drift, persist scenarios, render a public landing page, and operate DR/procurement admin screens.

## What Works End to End
1. Local data import.
2. Demo dataset import.
3. Public landing page plus dashboard/operations UI.
4. Explainable attrition and drilldown.
5. Intervention workflow and outcome tracking.
6. Compliance policy packs and checks.
7. Drift snapshots and retraining trigger.
8. Scenario planning and persistence.
9. Tenant-aware enterprise scoping.
10. Audit trail for enterprise actions.
11. Model card governance.
12. Release gate approval flow.
13. Fairness summary reporting.
14. DR / SRE admin runbooks and drills.
15. Procurement artifact management.
16. Import validation and data quality scorecards.
17. Executive packet generation.

## What Is Optional
1. Live Workday / Greenhouse auth.
2. Enterprise vendor-specific connectors.
3. Advanced regional fairness packs.
4. SRE / DR hardening.
5. Connector marketplace.

## Current Build Health
1. Backend compile passes.
2. Frontend build passes.
3. Main bundle is code-split with lazy-loaded views and export/report code deferred.
4. No vendor auth required for startup mode.
5. The shell now includes a floating page-scoped AI drawer with real action buttons and page-context prompts.
6. OpenCode Zen is now available as a provider option in Settings and works across chat, copilot, and talent analysis flows.
7. The client dev server now binds cleanly to `127.0.0.1:5173`, so `npm run dev` is stable for local testing.

## Launch Readiness Notes
1. Good for internal demo and pilot customers.
2. Good for landing page screenshots and product walkthroughs.
3. Good for collecting early customer feedback.
4. Not yet full Workday/SAP/Oracle parity, but that is no longer a blocker for launch.
5. The landing route is now outside the app shell, so public/marketing traffic can land cleanly before entering the workspace.
6. The landing page blueprint is implemented end to end; only screenshot and media assets remain as polish.
7. The landing page now matches the supplied reference direction with a black premium hero, compact workflow cards, and a polished glass system.
8. The landing page has been tightened again to lean harder into the supplied black reference style, including animated geometry, a separate teams/logo section, and smaller Inter-based hero type.
8. The startup checklist is now centralized in `Docs/Worked/aurelinx_end_to_end_checklist.md`.

## Next Recommended Work
1. Add polished screenshots and demo steps.
2. Expand DR/SRE documentation and runbooks.
3. Keep the implementation log updated after each change.
