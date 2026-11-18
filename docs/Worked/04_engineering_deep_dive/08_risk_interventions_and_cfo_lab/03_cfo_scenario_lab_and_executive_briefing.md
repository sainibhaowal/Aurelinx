# 03. CFO Scenario Lab and Executive Briefing

01. **CFO Scenario Lab (`POST /api/v1/lean/optimizer/scenario`, `GET /api/v1/lean/scenarios`):**
    - Persists workforce economics simulations in `ForecastScenarioTable`, modeling headcount, salary budget (`EUR/annual`), attrition cost assumptions, and retention savings.
    - Replacement cost modeling follows standard turnover-cost multipliers:
    $$C_{\text{turnover}} = N_{\text{departures\_projected}} \times \bar{S}_{\text{annual}} \times m_{\text{replacement}}$$

02. **Executive Briefing Packet (`GET /api/v1/lean/executive/packet`):**
    - Aggregates active workforce headcount (`1,233`), at-risk count, fairness summary, active contracts, and recent scenario/governance posture into a single executive-ready JSON packet for monthly/quarterly leadership reviews.
