# 01. Employee Directory and Profiles

01. **Backend Endpoints (`server/app/api/v1/employees.py`):**
    - `GET /api/v1/employees`: Paginated, tenant-scoped employee listing with search, department, risk, and `employment_status` filters (`active` vs `departed`).
    - `GET /api/v1/employees/count` & `GET /api/v1/employees/departments`: Fast count and department facets.
    - `GET /api/v1/employees/{employee_id}` & `GET /api/v1/employees/{employee_id}/integration-evidence`: Detailed employee profile joined with skills, experiences, and `IntegrationEvidenceTable` provenance.

02. **Frontend Component (`client/src/components/DirectoryView.jsx`, `TalentCard.jsx`):**
    - Renders searchable, filterable employee cards with sentiment indicators, risk flags, compensation metadata (`salary`, `salary_currency`, `salary_period`), and drilldown drawers.

03. **Active vs. Departed Filtering (`server/app/core/data_policy.py`):**
    - `is_active_employee()` evaluates `employment_status`, `departure_event`, and `employment_end_date` consistently so departed employees are excluded from active headcount and team optimization pools while remaining available in historical survival analysis.
