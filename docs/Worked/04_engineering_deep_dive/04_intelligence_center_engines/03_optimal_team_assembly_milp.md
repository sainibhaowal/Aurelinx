# 03. Optimal Team Assembly (MILP / Budget-Capped)

01. **Eligibility & Feasibility (`GET /api/v1/intelligence/team-optimize/feasibility`):**
    - `_team_eligible_scope()` filters to active employees (`is_active_employee()`) with valid compensation (`salary`, `salary_currency`, `salary_period`).
    - In the demo bundle: `1,233` active eligible employees (`237` departed excluded, `0` missing compensation).

02. **Constrained Optimization Formulation (`_solve_team_milp()` in `server/app/api/v1/intelligence.py`):**
    - Given candidate pool $E_{\text{active}}$, target skills $S_{\text{target}}$, `budget_cap` $B$, and `max_team_size` $K$:
    $$\max_{x \in \{0, 1\}^{|E|}} \sum_{i \in E} u_i x_i$$
    $$\text{subject to:} \quad \sum_{i \in E} c_i x_i \le B, \qquad \sum_{i \in E} x_i \le K$$
    where $x_i \in \{0, 1\}$ indicates selecting employee $i$, $c_i$ is annual compensation (`EUR`), and $u_i$ is the employee's skill-coverage contribution (`_team_contributions()`).

03. **Endpoints:**
    - `GET /api/v1/intelligence/team-optimize/skill-suggestions`: Top skills ranked by active employee coverage and mean level.
    - `POST /api/v1/intelligence/team-optimize`: Solves and returns `optimized_team` with `estimated_cost`, `salary_source`, `salary_currency`, and `salary_period`.
    - `GET /api/v1/intelligence/team-optimize/latest`: Retrieves the latest persisted `ForecastScenarioTable` optimization.
