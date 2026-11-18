# 02. Data Ops and Lakehouse Design

01. **End-to-End Data Ops Loop:**
    - **Ingest:** Accept structured CSV/ZIP bundles or authenticated connector/webhook payloads with idempotency keys and retry backoff.
    - **Validate:** Enforce active `data_contracts` (required fields, date formats, currency/period units).
    - **Quarantine:** Route malformed or contract-violating rows to `quarantine_events` with clear failure reasons instead of failing silently or polluting Silver/Gold tables.
    - **Normalize & Serve:** Map aliases (`skill_aliases`), deduplicate canonical employee/candidate records, and update `gold_metric_snapshots`.

02. **Medallion Layer Mapping in PostgreSQL:**
    - **Bronze (`raw_events`, `integration_evidence`):** Immutable raw ingestion payloads and provenance metadata.
    - **Silver (`canonical_employees`, `canonical_candidates`, `employeetable`, `candidatetable`, `skills`, `experiences`, `collaboration_events`):** Cleaned, tenant-scoped relational entities.
    - **Gold (`gold_metric_snapshots`):** Pre-aggregated workforce, risk, and sentiment snapshots for fast dashboard reads.

03. **Planned Enhancements:**
    - Automated quarantine replay UI so operators can fix a mapping rule and reprocess quarantined rows in one click.
    - Scheduled freshness alerts when a connected HRIS/ATS sync falls behind its SLA.
