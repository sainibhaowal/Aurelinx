# Aurelinx Datasets & Provenance Evidence (`docs/datasets`)

01. **Purpose & Demo Notice:**
    - All datasets in this directory are **synthetic and public-benchmark demonstration data** used strictly for local testing, pipeline verification, and academic/portfolio demonstrations.
    - No record in these files represents real Aurelinx employees, real company compensation, or validated individual-level forecasts.

02. **How the Demo Bundle Is Built (End-to-End Pipeline):**
    - **Stage 1 (`server/scripts/build_production_sample_bundle.py`):** Integrates continuous telemetry from `ibm_hr_attrition.csv` (`JobSatisfaction`, `EnvironmentSatisfaction`, `WorkLifeBalance`, `JobInvolvement`, `PercentSalaryHike`, `Attrition`, `OverTime`) and O*NET skills into the 6 base public CSV contracts (`employees_public.csv`, `candidates_public.csv`, `employee_skills_public.csv`, `candidate_skills_public.csv`, `employee_experience_public.csv`, `candidate_experience_public.csv`).
    - **Stage 2 (`server/scripts/build_intelligence_ready_bundle.py`, seed `20260725`, `as_of_date`: `2026-10-10`):** Links IBM HR Attrition outcomes positionally and deterministically simulates dated survival intervals, annual `EUR` salary bands, multi-step `ROLE_LADDERS` career histories (`2,796` rows), and `4,579` collaboration events to package `aurelinx_offline_career_markov_demo.zip` (`1.8 MB`).
    - **Stage 3 (App Ingestion):** Upload `docs/datasets/aurelinx_offline_career_markov_demo.zip` in **Enterprise Ops -> Data Pipelines -> Local Dataset Hub** (`POST /api/v1/lean/import/bundle`).
    - **Extracted Folder:** `docs/datasets/production_sample_20260725_career_demo/`

03. **Public Source Provenance (`docs/datasets/raw/`):**
    - **`ibm_hr_attrition.csv`** (`SHA-256: e9f55fbf0a5c058306225d131311e135379d82ad0c94c33738ec75b9a179db9c`): Public IBM HR Attrition benchmark (`1,470` rows) providing cohort departure labels linked positionally to pseudonymous employee profiles.
    - **`hr_comma_sep.csv`:** Public HR analytics benchmark (`14,999` rows) used to shape candidate/workforce distributions.
    - **`oecd_bli_2015.csv`:** Public OECD Better Life Index reference data.
    - **`onet_database_text/` (`onet_database_text.zip`):** Public O*NET occupational skill taxonomy used to ground skill labels.

04. **Bundle Contents, Row Counts & Source Hashes (`production_sample_20260725_career_demo/`):**

| File | Rows | Purpose & Provenance |
| --- | --- | --- |
| `employees_public.csv` | `1,470` | Pseudonymous employee profiles, simulated annual `EUR` salaries, and cohort survival dates (`237` departed, `1,233` active) |
| `candidates_public.csv` | `14,999` | Separate candidate pool (no employee attrition outcomes or collaboration events) |
| `employee_skills_public.csv` | `16,025` | Employee skill inventory (`170` unique skill names) |
| `candidate_skills_public.csv` | `164,111` | Candidate skill inventory for Talent Scout & Semantic Skills Graph |
| `employee_experience_public.csv` | `2,796` | Dated role histories (`714` multi-role histories, `1,326` role transitions across `66` roles) for Markov Career Path |
| `candidate_experience_public.csv` | `14,999` | Candidate prior experience records |
| `collaboration_events.csv` | `4,579` | Simulated dated collaboration events (`1,273` linked employees, `2,305` unique pairs) for ONA |
| `skill_aliases.csv` | `0` | Optional tenant skill alias overrides |
| `PROVENANCE.json` | - | Machine-readable provenance, seed (`20260725`), and source SHA-256 hashes |
| `DATA_QUALITY_REPORT.json` | - | Automated row counts, survival eligibility (`1,426` positive-duration rows), and Markov transition diagnostics |

05. **Source File SHA-256 Evidence (from `PROVENANCE.json`):**
    - `employees_public.csv`: `3929e4b7608662513389f515ee3df2c39e6fa015f1ee579500f9ab1c657bd56e`
    - `candidates_public.csv`: `5f8e7cafd45cec2f34d0671e45720dc3f1cab021cb9c96252144dedc424f6be6`
    - `employee_skills_public.csv`: `5306e8372a57e8db2532309ad596d553d6f9c44bec5010e6f61c362685048795`
    - `candidate_skills_public.csv`: `d19e84f2e366c07700c75630b5a00eccdc340e0fffccac4e4857a9675336efa8`
    - `employee_experience_public.csv`: `307c1eb8067a61d7b06134297869b025b8100e5a854e6fb66394aca99cfa5f56`
    - `candidate_experience_public.csv`: `3cb6e023b2d34dfadfc41cef583d18f36a089722decd8d0d058a8b3f3092d342`

06. **Prohibited Interpretations:**
    - Not an organization-specific HR dataset.
    - Not a validated individual attrition forecast.
    - Not real compensation or market salary evidence.
    - Not observed real-world career progression or actual employee collaboration.

07. **Sources, References & Citations:**
    - **O*NET Database (`onet_database_text.zip`):** U.S. Department of Labor, Employment and Training Administration. *O*NET Database Text Files* (CC BY 4.0). https://www.onetcenter.org/database.html
    - **OECD Better Life Index (`oecd_bli_2015.csv`):** Organisation for Economic Co-operation and Development (2015). *Better Life Index (BLI) / How's Life? 2015: Measuring Well-being*. https://stats.oecd.org/
    - **IBM HR Analytics (`ibm_hr_attrition.csv`):** IBM Watson Analytics Sample Dataset (1,470 synthetic employee records). Public mirror: https://www.kaggle.com/datasets/pavansubhash/ibm-hr-analytics-attrition-dataset
    - **HR Analytics (`hr_comma_sep.csv`):** Public HR Analytics Benchmark (14,999 synthetic records). Public mirror: https://www.kaggle.com/datasets/giripujar/hr-analytics
    - **Kaplan-Meier Estimator:** Kaplan, E. L., & Meier, P. (1958). Nonparametric estimation from incomplete observations. *Journal of the American Statistical Association*, 53(282), 457-481.
    - **Greenwood Variance Intervals:** Greenwood, M. (1926). The natural duration of cancer. *Reports on Public Health and Medical Subjects*, 33, 1-26.
    - **Shortest-Path Skill Graph:** Dijkstra, E. W. (1959). A note on two problems in connexion with graphs. *Numerische Mathematik*, 1(1), 269-271.
