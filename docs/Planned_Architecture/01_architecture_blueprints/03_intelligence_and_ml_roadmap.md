# 03. Intelligence and ML Roadmap

01. **Skill Ontology Expansion:**
    - Expand built-in ontology coverage beyond the current `25` mapped skills (out of `170` demo skills) and add an admin workflow to approve `skill_aliases` suggestions.

02. **Async Pre-Computation for Heavy Analytics:**
    - Move `ona`, `attrition-hazard`, and `team-optimize` heavy graph/optimization calculations into RQ background jobs that cache results in Redis/Gold snapshots for sub-100 ms UI loads on large tenants.

03. **Validated Predictive Modeling (Future Work):**
    - Introduce calibrated survival models (Cox Proportional Hazards / Random Survival Forest) only when longitudinal, real-world HRIS outcome data is available.
    - Track model drift (`ml_drift_snapshots`) and fairness metrics (`ml_model_cards`) automatically on each training run.
