# 01. Explainable Attrition and Risk Drivers

01. **Deterministic Risk Score Formula (`server/app/services/risk_explainer.py`):**
    - Computes a transparent, reproducible risk score $R \in [0.0, 1.0]$ without an LLM call:
    $$R = \min\Big(1.0,\; \max\big(0.0,\; 0.6(1 - s) + 0.4(1 - r) + 0.2 \cdot \mathbb{I}_{\text{at\_risk}}\big)\Big)$$
    where $s$ is `sentiment_score` (default `0.5`), $r$ is `retention_prob` (default `0.5`), and $\mathbb{I}_{\text{at\_risk}} \in \{0, 1\}$ is the explicit HRIS risk flag.

02. **Risk Tiers & Driver Attribution:**
    - **Tiers:** `critical` ($R \ge 0.70$), `high` ($0.50 \le R < 0.70$), `medium` ($0.30 \le R < 0.50$), `low` ($R < 0.30$).
    - **Explainable Drivers:** `low_sentiment` ($s < 0.40$, weight $0.6(1-s)$), `low_retention` ($r < 0.70$, weight $0.4(1-r)$), and `flagged_at_risk` (weight $0.20$), sorted descending by weight.

03. **API Endpoints (`server/app/api/v1/enterprise.py`):**
    - `GET /api/v1/enterprise/attrition/explain`: Tenant-level attrition risk summary.
    - `GET /api/v1/enterprise/risk-explain?email=...`: Employee-level deterministic driver breakdown.
    - `GET /api/v1/enterprise/risk-drivers/drilldown?factor=...`: Cohort drilldown by risk factor.
