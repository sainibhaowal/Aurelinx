# 06. Markov Career Path Modeling

01. **Endpoints & Service (`GET /api/v1/intelligence/career-path-employees`, `GET /api/v1/intelligence/career-path/{employee_id}`, `server/app/services/career_markov.py`):**
    - Constructs ordered role timelines per employee from dated `ExperienceTable` rows (`2,796` employee experience rows, `714` multi-role histories, `1,326` role transitions in the demo bundle).
    - Overlapping or blank-role snapshots are never bridged artificially so unobserved transitions are not invented.

02. **Empirical Transition Matrix ($P$):**
    - For each observed role change from source role $i$ to target role $j$:
    $$P_{ij} = \frac{N_{ij}}{\sum_{k} N_{ik}}$$
    where $N_{ij}$ is the observed transition count from role $i$ to role $j$.

03. **Multi-Step Horizon Projection ($t = 1, 2, 3$):**
    - Starting from state vector $\pi^{(0)}$ concentrated on the employee's `current_role`:
    $$\pi^{(t)} = \pi^{(t-1)} P$$
    - Any probability mass on terminal roles with no observed outgoing transitions is tracked explicitly as `unknown_mass` rather than re-normalized away.
