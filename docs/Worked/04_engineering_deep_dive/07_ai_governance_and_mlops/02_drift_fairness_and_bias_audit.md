# 02. Drift Monitoring, Fairness, and Bias Audit

01. **Drift Monitoring (`GET /api/v1/lean/ml/drift`, `POST /api/v1/lean/ml/retrain`):**
    - `MLDriftSnapshotTable` tracks `drift_score` $\in [0.0, 1.0]$ and boolean `needs_retraining` flags per `model_name` and `model_version`.
    - Allows operators to trigger `/ml/retrain` when feature distributions shift beyond acceptable thresholds.

02. **Fairness & Bias Audit (`GET /api/v1/lean/compliance/fairness`):**
    - Computes departmental risk/outcome parity across active employee cohorts (`_fairness_summary()`).
    - Evaluates fairness gap:
    $$\Delta_{\text{fairness}} = \max_{g} R(g) - \min_{g} R(g)$$
    where $R(g)$ is the group-level risk or selection rate across departments/cohorts, flagging gaps that exceed policy thresholds.
