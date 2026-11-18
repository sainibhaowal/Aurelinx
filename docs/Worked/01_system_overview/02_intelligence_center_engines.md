# 02. Intelligence Center Engines

01. **Data Readiness Gating (`GET /api/v1/intelligence/data-readiness`):**
    - Profiles the active tenant's database tables before running analytics so the UI clearly reports what each engine can and cannot compute.
    - Refuses to fabricate individual-level attrition predictions when only descriptive cohort outcomes are present.

02. **Engine 01: Semantic Skills Graph (`POST /api/v1/intelligence/skill-match`):**
    - Matches target skill requirements (`name`, `level`) against employee and candidate skill inventories.
    - Supports exact matching across all uploaded skill names (`170` unique skills in the demo bundle) plus ontology/alias mapping (`25` mapped by built-in ontology; extensible via `skill_aliases`).

03. **Engine 02: Optimal Team Assembly (`GET /team-optimize/feasibility`, `POST /team-optimize`):**
    - Evaluates active workforce eligibility (`1,233` active employees, excluding `237` departed records) and annual compensation records (`EUR`).
    - Selects a team that covers requested skills within a specified `budget_cap` and `max_team_size`.

04. **Engine 03: Survival Attrition (`GET /api/v1/intelligence/attrition-hazard`):**
    - Computes a descriptive Kaplan-Meier survival curve (`36` curve points in the demo bundle) from dated employment start, end, and censor dates (`1,426` positive-duration observations: `221` departures, `1,205` right-censored).

05. **Engine 04: Organizational Network Analysis (`GET /api/v1/intelligence/ona`):**
    - Builds a collaboration graph (`nodes`, `links`, `metrics`) from dated `collaboration_events` (`4,579` events in the demo bundle), returning component counts, isolated nodes, and average degree (capped at `500` nodes for UI responsiveness).

06. **Engine 05: Markov Career Path (`GET /career-path-employees`, `GET /career-path/{employee_id}`):**
    - Computes empirical role-transition probabilities from ordered, dated `experiences` (`714` multi-role histories and `1,326` observed role transitions in the demo bundle).
