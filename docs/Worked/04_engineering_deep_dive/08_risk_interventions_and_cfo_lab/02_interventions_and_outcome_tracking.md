# 02. Retention Interventions and Outcome Tracking

01. **Closed-Loop Intervention Lifecycle (`server/app/api/v1/enterprise.py`, `RetentionOpsView.jsx`):**
    - `GET /api/v1/enterprise/interventions`: Lists active and historical retention interventions (`InterventionTable`).
    - `POST /api/v1/enterprise/interventions`: Creates a new intervention (compensation adjustment, coaching, mobility, workload change) tied to an employee/department.
    - `PATCH /api/v1/enterprise/interventions/{id}` & `DELETE /interventions/{id}`: Updates status or removes draft interventions.

02. **Outcome Measurement (`InterventionOutcomeTable`):**
    - `GET /api/v1/enterprise/interventions/{id}/outcomes` & `POST /interventions/{id}/outcomes`: Records 30/60/90-day retention outcomes (`retained` vs `departed`, sentiment delta, cost vs savings) to close the feedback loop.
