# 04. Survival Attrition (Kaplan-Meier Estimator)

01. **Endpoint & Service (`GET /api/v1/intelligence/attrition-hazard`, `server/app/services/survival_analysis.py`):**
    - Computes a **descriptive** cohort survival curve from dated employment intervals (`employment_start_date`, `employment_end_date`, `employment_censor_date`, `departure_event`, `employment_duration_years`).
    - Malformed or zero-duration rows are safely counted and excluded without failing the cohort (`1,426` usable observations in the demo bundle: `221` departures, `1,205` right-censored).

02. **Kaplan-Meier Product-Limit Formula:**
    - Duration is converted to months: $t = \text{round}(\text{duration\_days} / 30.4375, 6)$.
    - At each distinct event time $t_i$ with $d_i$ departures and $n_i$ employees at risk:
    $$\hat{S}(t) = \prod_{t_i \le t} \left(1 - \frac{d_i}{n_i}\right)$$

03. **Greenwood Variance & Log-Log 95% Confidence Intervals:**
    - Greenwood cumulative variance term:
    $$V_G(t) = \sum_{t_i \le t} \frac{d_i}{n_i (n_i - d_i)}$$
    - Log-log standard error and 95% confidence bounds ($z = 1.959964$):
    $$\text{SE}(t) = \frac{\sqrt{V_G(t)}}{|\ln \hat{S}(t)|}, \qquad \theta(t) = \ln(-\ln \hat{S}(t))$$
    $$\text{CI}_{\text{low}}(t) = \exp\left(-\exp(\theta(t) + z \cdot \text{SE}(t))\right), \qquad \text{CI}_{\text{high}}(t) = \exp\left(-\exp(\theta(t) - z \cdot \text{SE}(t))\right)$$
