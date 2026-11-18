# Aurelinx: Implemented System Documentation (`Docs/Worked`)

01. **Purpose:** This directory documents the implemented, verified capabilities of the Aurelinx platform (`v0.2.9`), its operational runbooks, and end-to-end verification records.
02. **Audience:** Public GitHub reviewers, technical recruiters, contributors, and operators running the platform locally or in production.
03. **Structure:**
    - `01_system_overview/`: Implemented features, the 5 Intelligence Center engines, and the CSV/ZIP data pipeline.
    - `02_operations_and_runbooks/`: Local Docker Compose startup, production tenant/provider boundary rules, and database migration/performance notes.
    - `03_verification_and_releases/`: End-to-end test and API verification results plus the release changelog summary.

---

## Navigation Index

01. [`01_system_overview/01_implemented_capabilities.md`](./01_system_overview/01_implemented_capabilities.md): Full-stack inventory of implemented frontend, backend, database, and worker capabilities.
02. [`01_system_overview/02_intelligence_center_engines.md`](./01_system_overview/02_intelligence_center_engines.md): Technical breakdown of all 5 Intelligence Center analytics engines and readiness gating.
03. [`01_system_overview/03_data_pipeline_and_import_export.md`](./01_system_overview/03_data_pipeline_and_import_export.md): Local Dataset Hub (`CSV / ZIP`), schema contracts, quarantine, and bundle export.
04. [`02_operations_and_runbooks/01_local_docker_stack_runbook.md`](./02_operations_and_runbooks/01_local_docker_stack_runbook.md): Step-by-step guide to build, start, and verify the 7-service Docker Compose stack.
05. [`02_operations_and_runbooks/02_production_tenant_provider_runbook.md`](./02_operations_and_runbooks/02_production_tenant_provider_runbook.md): Security boundary and acceptance checklist for connecting real company tenants and external providers.
06. [`02_operations_and_runbooks/03_performance_and_database_migrations.md`](./02_operations_and_runbooks/03_performance_and_database_migrations.md): Alembic migration history (`001` to `018`) and SQL query optimizations.
07. [`03_verification_and_releases/01_end_to_end_verification_checklist.md`](./03_verification_and_releases/01_end_to_end_verification_checklist.md): Verified backend test suite (`191 passed`), live endpoint checks, and container health.
08. [`03_verification_and_releases/02_release_changelog_summary.md`](./03_verification_and_releases/02_release_changelog_summary.md): Chronological summary of key releases up to `v0.2.9`.
09. [`04_engineering_deep_dive/README.md`](./04_engineering_deep_dive/README.md): Complete 10-volume technical & mathematical engineering reference covering every backend service, formula, diagram, database table, and frontend module.
10. [`05_user_manual_reference/README.md`](./05_user_manual_reference/README.md): Complete 19-section User Manual reference extracted directly from `client/src/components/UserManual.jsx` (`v0.2.9`).
