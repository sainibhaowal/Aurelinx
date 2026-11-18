# 01. Intelligence Data Readiness and Gating

01. **Purpose (`GET /api/v1/intelligence/data-readiness` in `server/app/api/v1/intelligence.py`):**
    - Profiles the authenticated tenant's PostgreSQL tables before running any analytical engine.
    - Enforces scientific honesty: if required dated outcomes, compensation units, or collaboration events are absent, the UI displays the exact gap instead of fabricating scores.

02. **Readiness Signals Evaluated:**
    - `records`: Counts of employees, candidates, employee skills, candidate skills, unique skill names, dated employee experiences, and collaboration events.
    - `semantic_skill_graph`: Distinguishes `names_indexed_for_exact_matching` (`170`) from `names_mapped_to_graph_or_approved_alias` (`25` mapped, `145` unmapped in demo bundle).
    - `team_assembly`: Counts `eligible_compensation_records` and verifies uniform currency/period units (`EUR per annual`).
    - `attrition`: Counts `usable_duration_outcomes`, `departures`, and `right_censored_active_employees`, marking status `cohort_descriptive_possible`.
    - `ona`: Verifies dated `collaboration_events` (`evidence_available`).
    - `career_markov`: Counts `dated_employee_role_records`, `employees_with_observed_role_changes`, and `observed_role_change_count`.
