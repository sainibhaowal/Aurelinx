# 03. Data Pipeline and Import/Export

01. **Local Dataset Hub (`CSV / ZIP`):**
    - Supports uploading ZIP bundles or individual CSVs into the PostgreSQL `app` schema with merge-upsert semantics (`tenant_id` isolated).
    - Verified against `Docs/datasets/aurelinx_offline_career_markov_demo.zip` (`1,470` employees, `14,999` candidates, `16,025` employee skills, `164,111` candidate skills, `2,796` employee experiences, `14,999` candidate experiences, and `4,579` collaboration events).

02. **Schema Contracts and Quarantine (`GET /api/v1/lean/contracts`, `GET /api/v1/lean/quarantine`):**
    - Incoming connector/import payloads are validated against active `DataContractTable` definitions (e.g., `workday` HRIS contract requiring `email`, `full_name`, `department`, `role`).
    - Invalid records are routed to `quarantine_events` rather than corrupting core workforce tables.

03. **Fast Summary (`GET /api/v1/lean/summary`):**
    - Uses SQL `COUNT(*)` aggregations (`func.count()`) over `employees`, `candidates`, `skills`, and `experience` tables, returning in ~125 ms even with `180,000+` skill rows.

04. **Bundle Export (`GET /api/v1/lean/export/bundle`):**
    - Streams a ZIP archive containing normalized CSVs for employees, candidates, skills, experiences, collaboration events, and skill aliases.
    - Uses column-projected SQL queries to avoid full ORM object instantiation overhead across `200,000+` rows.
