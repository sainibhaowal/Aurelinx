# 01. Local Dataset Hub (CSV / ZIP Pipeline)

01. **Import & Validation Endpoints (`server/app/api/v1/lean_enterprise.py`):**
    - `POST /api/v1/lean/import/validate`: Validates uploaded CSV/ZIP payloads against schema rules before writing.
    - `POST /api/v1/lean/import/csv` & `/import/csv/async`: Single-CSV ingestion.
    - `POST /api/v1/lean/import/bundle` & `/import/bundle/async`: Multi-file ZIP bundle ingestion (`employees_public.csv`, `candidates_public.csv`, `employee_skills_public.csv`, `candidate_skills_public.csv`, `employee_experience_public.csv`, `candidate_experience_public.csv`, `collaboration_events.csv`, `skill_aliases.csv`).
    - `GET /api/v1/lean/import/jobs/{job_id}`: Polls async import progress.

02. **Merge-Upsert Semantics:**
    - Bundle imports merge-upsert by tenant and email/key while preserving existing tenant records absent from the ZIP.
    - `DELETE /api/v1/lean/import/reset` provides a controlled tenant dataset reset when starting fresh.

03. **Summary & Export (`GET /api/v1/lean/summary`, `GET /api/v1/lean/export/bundle`):**
    - `/lean/summary` executes SQL `COUNT(*)` queries (~125 ms on `180,136` skills).
    - `/lean/export/bundle` streams a normalized 8-CSV ZIP archive using column-projected SQL queries (~3.5 s for `200,000+` rows).
