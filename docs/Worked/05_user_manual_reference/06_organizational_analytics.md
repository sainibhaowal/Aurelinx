# Organizational Analytics

## 01. Sentiment Intelligence

Sentiment Intelligence is a current workforce-snapshot view. It reads stored employee sentiment, retention, department, and policy-risk fields, then calculates transparent organizational indicators and review lists. It is not a clinical assessment or validated forecasting model.

#### Why Sentiment? The Philosophy of Aurelinx

Organizations use this view to identify which stored workforce signals deserve human review instead of treating one metric as a decision.

Aurelinx does not silently scan collaboration messages in this page. It presents the authenticated database snapshot and clearly separates observed fields from derived indicators.

### Sentiment Intelligence Flow

A

TELEMETRY INGEST

Raw Ingestion

Reads the authenticated employee snapshot and its stored sentiment, retention, department, and risk fields.

B

NLP PARSER

Valence Mapping

Uses the normalized 0-1 sentiment values already stored on employee records.

C

TELEMETRY SOLVER

Three Pillars

Calculates averages, threshold lists, department breakdowns, and snapshot-to-snapshot velocity.

D

THREAT CLASSIFIER

Macro Status Index

Maps the current employee at-risk ratio to Level 1, 2, or 3 review priority.

### The Three Pillars of Live Indicators

Aurelinx measures three independent values to generate high-fidelity, actionable employee profiles:

📊 Current sentiment score (0.0-1.0)

The normalized sentiment value stored on an employee record. Lower values are review signals; higher values are more favorable within this dataset. It is not a diagnosis.

Organizational morale = Σ employee sentiment / employee count

⚡ Velocity (dM/dt)

The difference between the current snapshot and the previous captured snapshot. It is zero when no prior snapshot differs; it is not guaranteed to represent seven days.

Velocity = current snapshot score − previous snapshot score

🎯 Coverage (0% - 100%)

The table's Coverage value describes record/data coverage. It is a volume indicator, not statistical confidence or model accuracy.

Coverage = records represented / records in the current scope

### Dashboard Telemetry & Priority Rules

The Sentiment Intelligence view displays two primary cards at the top representing macro-level metrics, and a table below for granular indicators:

**System Status (Live Telemetry)**

This left card displays the current authenticated employee snapshot:

- **Total Analyzed:** Count of employees currently tracked by sentiment telemetry.
- **Current Average Sentiment:** The arithmetic mean of stored normalized 0.0-1.0 employee sentiment scores.
- **Flagged Profiles:** Count of employee records whose stored policy/risk flag is true.
** Intervention Priority (Dynamic Ranking)**

This right card represents a **macro review priority** . It calculates the current at-risk ratio (flagged employees divided by employee scope) and maps it into three tiers:

- **Level 1 (Healthy/Safe):** At-risk ratio is **< 10%** . Morale is balanced across departments.
- **Level 2 (Caution/Warning):** At-risk ratio is **10% - 20%** . Triggers early warning review for department workloads.
- **Level 3 (Critical/Risk):** At-risk ratio is **≥ 20%** . Auto-escalates systemic risk, warning administrators of attrition bottlenecks.
**🚨 Individual Employee Intervention Priority**

Individual review urgency is based on the stored employee risk flag and the configured workforce indicators. ONA is available separately in Intel Center and is not used as proof of employee sentiment:

CRITICAL Priority

Stored risk flag plus multiple supporting review signals.

HIGH Priority

Stored risk flag with a supporting low-sentiment or low-retention signal.

MEDIUM Priority

One or more derived indicators requiring context.

LOW Priority

No current stored risk flag.

### Organizational Analytics & Workforce Distribution

**Separate from Sentiment Intelligence:** Sentiment Intelligence is the dedicated normalized-sentiment and risk-review page. This Organizational Analytics section is the workforce distribution, department aggregation, server-side risk evidence, candidate hiring context, exports, and durable snapshot trend view. Candidate metrics here never alter employee sentiment or risk totals.

The **Organizational Analytics** view aggregates individual employee risk telemetry to map macro department-level health and workforce layout.

Organizational Analytics Processing Flow

1. WORKFORCE REGISTRATION (N)

Total database profiles registered across Active Departments.

2. RISK DISTRIBUTION CALCULATOR

Flags employees as at-risk and calculates department concentrations.

3. RULE-BASED RISK RATE

Calculates the current snapshot coefficient (LOW, MEDIUM, HIGH); it is not a validated predictive model.

**👥 Total Workforce (N)**

The absolute number of active internal staff profiles. This acts as the denominator ($N$) for all organizational ratios.

**⚠️ At-Risk Employees**

Employees whose stored `is_at_risk` flag is true. This status is separate from the low-retention evidence rule; the dashboard does not silently rewrite the stored flag while it is being viewed.

**🏢 Active Departments & Workforce Distribution**

Measures the count of administrative divisions. Department distribution is computed by dividing the number of members in a specific department by the total workforce ($N$):

Distribution % = (Department Member Count / Total Workforce) * 100

**🔮 Predictive Risk Vector & Risk Coefficient**

The risk vector is a derived review indicator based on the current employee snapshot. It is not a validated prediction of who will leave in the next 90 days. The priority coefficient categorizes the current at-risk ratio:

- **LOW Risk Coefficient:** Overall organization at-risk ratio < 10%.
- **MEDIUM Risk Coefficient:** Overall organization at-risk ratio between 10% and 20%.
- **HIGH Risk Coefficient:** Overall organization at-risk ratio ≥ 20%.
**📍 Highest Department Risk Concentration**

Isolates which department holds the densest cluster of at-risk employees (e.g. *"Sales currently has the highest risk concentration at 40.0%"* ). It is calculated as:

Dept Risk Concentration % = (At-Risk Employees in Department / Total Employees in Department) * 100

**Why it matters:** If risk is clustered in a single team (e.g. Sales), the root cause is likely localized (e.g., poor local management, unreasonable quota pressures) rather than systemic company-wide culture issues. This helps target remedial training precisely.

#### Organizational Analytics: operational guide

This page is an employee-workforce view. Candidate totals and match scores are shown in a separate hiring-context panel and never enter employee morale, risk, department, or gauge calculations.

- **Department:** filters every employee card, headline, department drill-down, risk-evidence list, and the risk gauge. Choose “All employee departments” to clear it.
- **At-risk only:** restricts the view to stored `is_at_risk` records. With no matching rows, cards and the gauge intentionally show **0** , never organization-wide fallback totals.
- **Gauge:** filtered ratio = matching at-risk employees ÷ matching employees × 100. With no filter it uses the full employee snapshot. LOW <10%, MEDIUM 10-<20%, HIGH ≥20%.
- **Thresholds:** low sentiment is `sentiment_score < 0.45` ; retention pressure is `retention_prob < 0.55` ; department concentration is `department at-risk share ≥ 25%` . These are transparent review rules, not clinical or validated predictive truth.
- **Exports:** PDF, Excel, and Markdown use the currently visible filtered employee scope and include the filter context. A disabled export means the current scope contains zero rows.
- **Drill-down:** selecting a distribution row focuses department evidence; “Show all” clears the focus. Risk evidence is server-paginated and loads more as its list is scrolled.
- **Create review:** creates a planned, medium-priority HR review request tied to the employee and evidence context. It does not change the employee record. A later high/critical escalation remains administrator-protected. Success or permission/API failure is shown inline.
- **History:** the page requests up to 24 tenant-scoped analytics snapshots. If backend history is unavailable or does not contain varying points, the page can render an operational fallback derived from the currently loaded records; this is not a complete historical warehouse.
- **Freshness and failures:** the header timestamp is the snapshot generation time; a disconnected stream means the page is not receiving updates. Authentication/API failures are surfaced and do not silently replace filtered results with stale totals.
### Create Review & Risk Intervention Workflows: End-to-End Operational Guide

**1. What is a "Review"?** A **Review Request** is a preliminary, documented HR triage ticket generated when an HRBP or Manager reviews an imported employee source flag or another documented review criterion in *Operational Analytics* . It captures the target employee, available evidence, department, and triage steps without changing the source profile.

**2. Why does it exist and who uses it?** Direct employee record modifications (such as compensation adjustments, department transfers, or contract changes) require strict administrative governance. The Review Queue allows HR Business Partners to immediately capture AI evidence, document retention risks, and schedule stay conversations without violating permission policies or triggering unauthorized database mutations.

End-to-End 5-Step Risk & Intervention Lifecycle:

Step 1

**Signal Review:** Operational Analytics displays stored source indicators and derived summaries. It does not produce an individual attrition forecast.

Step 2

**Create Review:** Clicking "Create review" logs a `planned` medium-priority review record in the database.

Step 3

**Triage Queue:** The ticket appears in *Reviews Queue* . The HRBP inspects risk drivers, schedules stay meetings, or dismisses signals.

Step 4

**Escalation:** Clicking "⚡ Escalate to Active Plan" elevates the request into a formal Active Intervention Plan with assigned budget & HR owner.

Step 5

**Outcome Scoring:** Active plans record auditable 30-day (Improved), 60-day (Neutral), and 90-day (Degraded) impact checkpoints.

### Mathematical Model Formulations

**Burnout Risk Vector** A derived display indicator using employee risk flags and normalized sentiment:

Burnout indicator = (at-risk ratio × 0.7) + ((1.0 − average sentiment) × 0.3)

**Talent Density Score** Measures organizational distribution balance:

Density = 1.0 - (largest_dept_count / total_workforce)

**Leadership Trust** A derived display indicator based on current morale and retention values; it is not a validated trust measure:

Trust indicator = (average retention × 0.6) + (average sentiment × 0.4)

#### Risk Review Warning

If the overall risk percentage of your workforce exceeds 20%, the system status auto-escalates to **Level 3 (High)** and warns administrators to review ONA bottlenecks.

**Snapshot history and evidence boundary:** this page reads the current authenticated employee snapshot. The chart keeps the latest 24 tenant-scoped snapshots in the durable analytics snapshot store; it is an operational trend, not a complete historical warehouse or an audited time series. Coverage describes record volume, not statistical confidence. Derived indicators support review and must not be treated as validated clinical or predictive truth.
