# 03. DR, SRE Runbooks, and Procurement Artifacts

01. **Disaster Recovery Runbooks (`GET/POST /api/v1/lean/dr/runbooks`, `POST /dr/runbooks/{id}/drill`):**
    - `DRRunbookTable` tracks `runbook_name`, `environment`, `rto_minutes` (Recovery Time Objective), `rpo_minutes` (Recovery Point Objective), `status` (`draft | ready | validated | needs_review`), `last_drill_at`, and `last_drill_result`.

02. **Procurement & Security Readiness (`GET/POST /api/v1/lean/procurement/artifacts`):**
    - `ProcurementArtifactTable` tracks enterprise security/legal artifacts (`msa`, `dpa`, `sig`, `caiq`, `sla`, `security_pack`) and their review status (`draft | ready | approved`).
