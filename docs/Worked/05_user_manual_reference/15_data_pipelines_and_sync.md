# Data Pipelines and Sync

Data Ops & Enterprise Console

## 01. Data Pipelines & Sync Sub-Manual

Registry for system integrations, schema mappings, local dataset imports, pipeline logs, and quarantined validation failures.

**System Integrations**

Register a supported connector with its base URL and credentials. Use connection verification to authenticate against the real provider, metadata discovery to inspect available projects/channels/fields, and Pipeline Sync to retrieve source records. Credentials are encrypted server-side and never returned in connection responses. The pipeline result reports bronze events, canonical upserts, and quarantined rows. HRIS employee records are also mirrored into the existing Directory/Dashboard read model by normalized email, and supported ATS candidate records are available to Talent Scout. Each profile exposes source provider, source type, last source update, external ID, validation status, and duplicate warnings. In production, recurring syncs and webhook retries are enqueued through Redis/RQ and run by the dedicated worker; the API process does not own the schedule.

**Schema & Mappings**

Choose a connection, map each source column to a canonical field, optionally apply a transform rule, and mark the mapping required. Lean data contracts define source/provider/status expectations and enforce ingestion shape.

**Local Dataset Hub**

Upload CSV schemas individually or import a CSV/ZIP dataset bundle. Review validation progress, accepted records, and rejected records before treating the import as available operational data.

**Pipeline Logs & Quarantine**

Logs show ingestion status, counts, timestamps, and errors. Invalid or contract-breaking events are quarantined for review; an empty quarantine queue means no currently listed validation alerts, not that every historical event was perfect.

**Offline Intelligence Demo ZIP**

To load the prepared demo, open Data Ops → Local Dataset Hub and upload `aurelinx_offline_intelligence_bundle.zip` . The ZIP contains eight CSV data files plus a README, provenance file, and data quality report. The importer matches CSVs by filename, imports parent employee/candidate records before their skills and experience, and merges by stable identifiers. It keeps existing records that are absent from the ZIP. The three documentation files explain how the sample was built; they are not imported tables.

**Files and uses**

- `employees_public.csv` : 1,470 employee profiles, synthetic indicators, annual EUR salary, employment dates, and outcome flags.
- `candidates_public.csv` : 14,999 candidate profiles, kept separate from employee retention and career history.
- `employee_skills_public.csv` and `candidate_skills_public.csv` : 16,025 employee and 164,111 candidate skill rows joined by email.
- `employee_experience_public.csv` and `candidate_experience_public.csv` : 2,422 dated employee and 14,999 candidate role rows; only employee roles feed Career Markov.
- `collaboration_events.csv` : dated employee-to-employee events used by ONA.
- `skill_aliases.csv` : reviewed name mappings; the demo file is header-only and adds no aliases.
**What the demo demonstrates**

- Directory, Dashboard, Analytics, and Talent Scout read the imported employee and candidate profiles and their linked skill records.
- Career Markov counts dated employee role changes. A step means the next recorded role change, not a year or an individual promotion forecast.
- ONA computes graph measures from the included collaboration events; it does not infer ties from shared departments or skills.
- Retention displays a descriptive cohort survival curve from employment durations, departures, and censored active records. It does not predict individual attrition.
- Team Assembly uses compensation only when salary, currency, and pay period are present and consistent.
- Semantic matching checks uploaded names against the normalized tenant catalog, approved aliases, and configured skill graph. Optional embedding matching is disabled by default; if enabled, vector candidates are exploratory and need human validation. The bundle report maps 25 of 170 distinct names to curated graph relations; remaining names are still searchable exactly.
**Demo data warning:** identities, role dates, role sequences, collaboration events, compensation, sentiment, risk, and retention indicators are synthetic or benchmark-linked demo values. Salary is simulated annual EUR. The sample has 2,422 dated employee experience rows, 4,579 simulated collaboration events, and 1,470 employee outcome labels. Of these, 1,426 positive-duration observations are eligible, including 221 departures and 1,205 censored observations; 44 zero-duration rows are excluded. The survival report is descriptive only. These values are for demonstrations and pipeline checks, not company facts, market pay, or employment decisions.

**Operational sequence:** select provider → enter server-held credentials → verify connection → discover metadata → define contract and mappings → run real Pipeline Sync → inspect source counts/logs → resolve or retain quarantine → verify canonical records → refresh downstream analytics. For Workday, use the exact versioned workers endpoint from the Workday REST API Explorer; for Slack, select channels the installed OAuth bot can access; for Jira, grant Browse Projects/issue-read access. Never bypass schema validation by editing source data directly. The Directory source badges identify the systems contributing to a normalized profile; source records remain traceable in Data Ops and are never silently treated as identical when their email or external identity does not match.

**Cross-source evidence:** Workday is the authoritative identity source. Jira activity and Slack activity are supporting evidence and are attached only when a verified normalized work email matches an employee. Open an employee profile to review provider, source type, external ID, observed time, and the safe evidence summary. Unmatched records remain in Data Ops for review; they are not guessed into a profile.

**Production migration:** apply the Alembic migration before enabling live evidence collection: `cd server && alembic upgrade head` . The evidence table is `integration_evidence` ; it is tenant-scoped and does not store provider secrets.
