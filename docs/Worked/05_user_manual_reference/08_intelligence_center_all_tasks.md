# Intelligence Center (Overview & Tasks 1 to 5)

## 01. Intelligence Center (Decision Workbench)

The Intelligence Center computes results from tenant-scoped employee skills, dated employee experience, collaboration records, and employment outcomes. Each tab uses different evidence and shows its own readiness and interpretation limits.

**Observed versus modeled:** employee and network records come from the tenant data scope. Skill similarity, team selection, survival curves, network measures, and role-transition probabilities are calculated outputs. Check their input coverage and status. Offline demo records and calculated values are synthetic and should not be treated as facts about a real workforce.

### Math-Engine Architecture & Optimization Pipeline

```text
+---------------------------------------------------------------------------------+
|                                USER INPUT STAGE                                 |
|  [Define Skill Node] + [Proficiency Scale] + [Budget Limit] + [Max Team Size]   |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                            1. SEMANTIC ADJACENCY RESOLVER                       |
|   * Skill graph paths estimate transfer similarity between named skills.      |
|   * Resolves conceptual transfers: [Vue.js] --> [JS] --> [React]                |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                            2. COMBINATORIAL TEAM BUILDER                        |
|   * MILP maximizes skill coverage under the hard team-size and budget limits.   |
|   * A second solve minimizes cost among maximum-coverage feasible teams.        |
|   * Solver errors are returned when feasibility/optimality cannot be proven.   |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                            3. SURVIVAL SANDBOX FORECASTER                       |
|   * Kaplan-Meier describes the uploaded cohort with censoring.                 |
|   * It does not emit unvalidated individual attrition forecasts.               |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                               OUTPUT RESULTS STAGE                              |
|   * Data-backed calculations with coverage and interpretation limits            |
+---------------------------------------------------------------------------------+
```

**In this section - one subsection per task**

- Task 1 - Semantic Skills Graph (match people to skill demands)
- Task 2 - Optimal Team Assembly (constrained MILP team builder)
- Task 3 - Survival Attrition (cohort survival, readiness-gated)
- Task 4 - Network Analysis (ONA) (influence, bridges, silos)
- Task 5 - Markov Career Path (observed role transitions)
### Task 1 - Semantic Skills Graph

#### 1. Semantic Skills Graph (Dijkstra's Solver)

**What is it**: A graph representation of competencies where skills are nodes and edges represent learning/transfer paths.

Uploaded employee and candidate skill names are searched exactly after normalization. The curated graph adds reviewed transfer paths. Optional vector similarity can surface additional candidates, but those results are explicitly exploratory until HR reviewers validate them.

**What you get**: Each result shows the recorded skill, requested proficiency, evidence type, and graph distance or vector similarity when applicable. Vector matching is off by default and sends only skill labels to the configured embedding endpoint when explicitly enabled. Ranking scores are heuristic and are not job-fit probabilities.

#### Task 1 (continued) - Skills Graph Controls & Terms

**🎯 Target Requirements & Skill Node**

The skill token (e.g. `TypeScript`, `Docker`) selected as a search requirement.

**📊 Minimum Proficiency**

The capability target required for the match (L1: Foundational, L2: Operational, L3: Strategic).

**🔗 Solving Adjacencies (Graph Theory)**

What is an Adjacency?

Uploaded skill labels are first indexed from the current tenant's employee and candidate records. Exact normalized matches work for every uploaded label, including labels that do not have a transfer edge in the curated graph. Approved tenant aliases and short weighted graph paths add explicitly recorded equivalence or transfer evidence.

The graph search uses Dijkstra shortest paths and ignores paths beyond its configured distance threshold. A path is ontology proximity evidence; it is not a claim that two skills are interchangeable or that a person is qualified.

**🧮 Semantic Matching Matrix**

The ranking compares requested skills with recorded skills and proficiency levels. One recorded skill can satisfy at most one requested requirement. Profiles are ranked using exact/alias evidence and accepted graph distances; role similarity is not part of this score.

**🗺️ Path Analysis**

The visual mapping highlights only nodes and edges in the selected profile's returned shortest paths. Path order comes from the same weighted Dijkstra route used by the backend matcher. Catalog-only exact matches have no transfer edge; vector candidates are labeled separately and are not drawn as ontology paths. Skills without a visual node remain listed in the path details.

**📊 Target Match Breakdown**

The search evaluates all profiles in the selected tenant scope (employees, candidates, or both) and returns up to 100 highest-ranked matches. The full evaluated count and total number of matched profiles are shown with results. Scores are heuristic ranking evidence, not calibrated probabilities, validated job fit, or hiring decisions. Individual skill rows distinguish exact or normalized names from curated graph paths and unmatched requirements.

**🕸️ Search Evidence Graph**

The SVG displays the curated skill ontology as context and highlights only the exact route returned for each matched requirement. It is evidence visualization, not a validated measure of job fit.

- **Neon Green Nodes:** Mark matched, intermediate, and target skill nodes in the selected result's actual routes.
- **Neon Cyan Edges:** Mark the exact ontology edges traversed by the backend's shortest paths. Unrelated edges stay dim.
- **Route order:** The evidence breakdown lists every node in path order; an exact name match is shown as a single node, with no invented transfer edge.
Graph proximity is evidence for ranking only. It does not prove that two skills are interchangeable or that a person is qualified for a role.

### Task 2 - Optimal Team Assembly

#### 2. Optimal Team Assembly (Constrained MILP)

The solver assembles the requested number of employees (2-10) under a hard budget cap. It first maximizes mean direct skill coverage using exact skill-name matches only, then picks the cheapest roster among teams tied at that coverage. Related-skill (ontology) estimates are shown for context but never select the team. This is an exact mixed-integer (HiGHS MILP) optimization with a zero-gap optimality proof for the submitted data and objective; it does not prove that skill definitions or salaries represent real business value or job fit.

**Team constraints panel (left)**

- **Budget cap:** a ceiling in the uploaded compensation unit, never a spending target. The live feasibility box shows the real minimum roster cost for your team size (computed from recorded salaries), the shortfall or headroom, one-click *Set cap to minimum* / *Reuse last cost* , and eligibility counts (eligible, departed excluded, missing salary excluded).
- **Team size 2-10:** stepper plus direct input. Larger teams cost more; the solver proves the optimum for the exact size you set.
- **Skill browser:** auto-loads up to 200 skills from your database (name, headcount, average level) with a search box - pick from real evidence instead of typing blind. Every row has its own L1-L5 selector plus Add; the custom search row also has a level selector for unlisted skills.
- **Duplicate rule (skill + level):** the same skill may repeat at different levels (Python L2 + L4 count as two requirements), but the exact same skill+level pair is never stored twice - Add blocks it, rows show ✓, and level changes that would collide are rejected. Name matching is case-insensitive. *Remove duplicates* / *Clear all* repair a list in one click; offending rows are badged.
**Results panel (right) - how to read it**

- **Run banner:** tells you whether the charts match the current form or are a previous proven run kept visible for comparison (with its original cap, size, and requirement count). Editing the form never deletes the last proven charts.
- **Related-skill estimates:** wide bar = graph-adjusted estimate per requirement (teal = exact evidence, amber = ontology bridge with the path shown, grey = no evidence); thin bar = exact-skill evidence only, which is the optimized objective. Text shows the supplying skill or path plus effective vs target level. Coverage caps at 100% per requirement.
- **Budget card:** total recorded cost vs cap, percent used, remainder, Within-cap badge.
- **Search proof:** solver status, optimality (proven only when gap is 0.0), search nodes, eligible employee count. History holds the single proven final measurement - there is no live iteration progress by design; the result appears only when proven.
- **Roster + direct coverage:** winning members with role, department, and recorded salary each, plus the maximized exact-coverage score and per-requirement exact-match detail.
- **Errors guide you:** an infeasible cap names the cheapest feasible cost and the shortfall with *Set cap to minimum* / *Reduce team size* buttons; duplicate demands name the exact skill+level pairs. The previous proven result stays visible underneath.
**Eligibility, persistence, and AI explanation**

- Only active employees with a positive recorded salary plus explicit currency and pay period are eligible, in one consistent unit. Missing values are never estimated; mixed currencies or pay periods block the run until the upload is normalized.
- Runs persist server-side per tenant and restore on return; the newest valid result reloads with its input snapshot for auditability.
- **Explain with AI** stays clickable for any saved run (labelled *Explain Saved Run* when the form has moved on) and streams an executive-grade consultant report - verdict, what/why/how findings, skill table, financial review, HR read, limits, numbered next steps - generated live from your result by the configured provider. If the provider is unreachable the panel names it and tells you to check the connection.
If the solver cannot prove feasibility and optimality, it returns an error rather than presenting an unproven team. Larger datasets or harder inputs can take longer; the objective is defined by the configured data and constraints.

### Task 3 - Survival Attrition

#### 3. Attrition Model Data Readiness

The current survival endpoint describes a cohort when valid employment durations and departure/censor outcomes exist. It does not emit individual employee forecasts. Stored sentiment, retention scores, salary, and risk flags do not replace observed employment outcomes.

**Required historical records**

- Employment start date for each observed employment episode.
- Departure date for employees who left, or a censor date for employees still active.
- An explicit indicator distinguishing a departure from an active, censored observation.
- Tenant ownership and source provenance for every record.
The offline bundle includes synthetic dates and benchmark-linked outcomes so the cohort calculation can be demonstrated. The curve is descriptive; it is not an individually validated prediction. Check the reported eligible, excluded, departure, and censor counts.

**How to operate this task**

- Read the model status and readiness counts first (usable durations, departures, censored). If outcomes are missing, no curve or registry is shown - upload employment start, departure/censor dates, and the departure indicator.
- The survival curve and population stats describe the cohort (Kaplan-Meier). The registry lists observed descriptive records (tenure, status, skills, cohort survival at tenure) with search and sort - it never shows risk scores or forecasts.
- Selecting a record shows its observed facts plus cohort context (survival at its tenure, tenure vs median) and marks the tenure on the curve with an amber marker. Context is description, not prediction.
- Morale, salary-increase, and workload sliders are legacy scenario levers for validated selections only; they are not predictions and stay dormant on descriptive data.
- Re-run after new outcome data arrives; never compare curves across different populations without documenting the change.
**What survival attrition is and how it works**

Survival attrition answers one question from recorded history: of the people who started, what share was still employed after 6, 12, 24… months? Each employee contributes one observed episode - a tenure length plus an outcome (departed = event, still active = right-censored, meaning “observed this long without leaving”). The Kaplan-Meier product-limit estimator combines all episodes into a survival curve S(t): it starts at 100% and steps down only at tenures where a departure was actually recorded. Censored records keep people in the at-risk pool up to their tenure without ever stepping the curve down.

- **What you get:** the curve, its 95% Greenwood log-log confidence band, an event-time table (tenure, survival, CI, at-risk, departures, censored per row), cohort counts, and a descriptive registry placing each person against the curve.
- **What it is for:** retention planning from evidence - e.g. “only ~52% of the cohort is still employed at 432 months tenure” tells you where tenure risk concentrates, which cohorts to interview, and whether onboarding or mid-tenure programs deserve budget.
- **Why you need it:** gut feel and raw headcount cannot separate “many people left early” from normal tenure mix. The curve adjusts for censoring, so active employees count correctly instead of biasing the picture.
- **What it is not:** no individual departure prediction, no reasons for leaving, no causal claims about salary, morale, or managers. Per-employee risk appears only with a fitted, holdout-validated model - which this endpoint does not claim to be.
**Reading the graph: axes, legends, markers, tooltips**

- **X axis - Observed tenure (months):** how long employees have been employed. Ticks are auto-spaced (≈6 across the longest observed tenure).
- **Y axis - Survival probability:** share of the starting cohort still employed, 0-100% in 20% steps with faint 10% gridlines.
- **Estimated survival (cyan step line):** the Kaplan-Meier curve. Flat = nobody left at those tenures; each downward step = recorded departures at that tenure.
- **95% confidence band (shaded):** the uncertainty range around the curve (Greenwood log-log). Wide band = few observations there - trust it less.
- **Departure event time (ringed cyan nodes):** tenures where at least one departure was recorded. Small grey dots are censored-only times.
- **Selected tenure (amber marker):** the dashed line + dot for the registry person you picked, plotted at their cohort survival value.
- **Hover/tap any point:** a tooltip follows your cursor with tenure, survival %, 95% CI, at-risk count, departures, and censored for that exact event time. The ⤢ button expands the graph full-screen (⤡ or backdrop restores it); Table ↓ jumps to the estimate table.
- **Estimate table:** one row per observed event time with the same six numbers, newest last; the header shows the row count. Source note below lists date-based vs duration-based records and excluded invalid orders.
**Reading a selected record and the counts**

- **Registry rows** show role, department, tenure in months, recorded skill count, and Active/Departed status - all uploaded facts.
- **Cohort S(t)** on each row is the curve's survival value at that tenure - e.g. 51.5% means just over half the observed cohort was still employed that long.
- **Selected-record card:** “Cohort still employed at this tenure” (same S(t) as a headline), “Tenure vs cohort median” (e.g. 432.0 vs median 60.0 mo - far above typical tenure), and the amber-marker note. The “Context only” line is the contract: these place one record against the curve and never predict that person.
- **Counts:** Included records (usable episodes), Recorded departures (events), Active / censored (still observed), Excluded records (missing start/outcome or invalid date order - fixable in the upload). Generated timestamp + Scenario ID identify every data pull for audit.
### Task 4 - Network Analysis (ONA)

**What is ONA?** ONA stands for **Organizational Network Analysis** . While traditional organizational charts show only the formal reporting hierarchy, ONA models the informal network of communications, collaborations, and advice flows. This reveals the actual collaborative engine of the company, answering: *Who is the true node of influence? Who acts as the bridge between isolated departments?*

- A
Isolated B High PageRank C Team Hub D Key Broker E Operational F Operational **PageRank Centrality (Influence)** **Measures:** Overall connectivity and communication propagation strength. High PageRank nodes act as information multipliers.

PR(u) = (1-d)/N + d × ∑ [PR(v) / L(v)]

*Logic*: Adopted from Google's web-ranking algorithm, it measures structural prestige. An employee receives high PageRank if they are connected to other highly connected employees, indicating key decision-makers who can broadcast communications effectively.

**Betweenness Centrality (Bridges)** **Measures:** Structural bridge strength across siloed departments. High betweenness employees prevent organizational communication bottlenecks.

C_B(v) = ∑ [σ_st(v) / σ_st]

*Logic*: Calculated via Brandes' algorithm, it represents the fraction of all shortest communication paths that pass through an employee. High-betweenness employees act as bridges (like Node **D** ). If a bridge is at risk of resigning, communication silos will form.

**Collaboration evidence and graph scope** ONA builds ties from dated collaboration-event records that link two distinct employees in the tenant. It does not create a relationship just because employees share a department or skills. Repeated events increase the recorded tie count; centrality and bridge values describe the resulting graph structure, not job performance or influence outside the observed events.

Demo event links are simulated. Jira reporter-to-assignee links can be used as an issue-based proxy when both emails match employee records; Jira issue assignment does not prove direct communication. Review event source, date coverage, exclusions, and duplicate handling before interpreting a graph.

### Task 5 - Markov Career Path

Career Markov reads dated role records linked to employees in the current tenant. Candidate history is excluded. The service orders an employee's non-overlapping role records by effective date and counts transitions between consecutive, distinct roles. **Observed transition calculation** P(role A → role B) = observed A-to-B changes ÷ all observed changes from A

Later steps multiply the observed transition matrix. Each step means the next recorded role change, not a fixed time period. The calculation does not adjust probabilities from skill coverage, predict promotion, or estimate when a move will happen. When history has no observed exits from the selected role, the result reports insufficient transitions.

In the offline demo, role dates and sequences are generated synthetic data. The graph demonstrates how the calculation works; its transition rates do not describe a real employer and are not an individual career forecast. Review the data readiness counts and source records beside the result.

### Intelligence Center: End-to-End Operating Reference

Use the five workbench tabs in this order when moving from a talent question to an accountable decision: **Semantic Skills Graph** for capability fit, **Optimal Team Assembly** for constrained staffing, **Survival / Attrition** for retention signals, **Network Analysis (ONA)** for collaboration structure, and **Markov Career Path** for role-transition scenarios. Results are decision support; they do not change employee records or automatically trigger HR actions. **Shared data contract** Employee profiles, roles, departments, compensation, join dates, skills, skill levels, experience records, sentiment, and explicit risk flags are read within the signed-in tenant scope. The engine filters invalid or synthetic records according to the server data-quality rules.

Interactive calls are authenticated and use the Intelligence API: `POST /skill-match` , `POST /team-optimize` , `GET /attrition-hazard` , `GET /ona?limit=120` , and `GET /career-path/<employee_id>` .

**Interpretation and safety** “Probability,” “risk,” “influence,” “bridge,” “coverage,” and “optimal” are model outputs, not facts or employment recommendations. Review the source records, sample size, model status, validation status, and confidence before acting.

Team optimality applies to the mathematical objective and inputs, not to real-world job fit. Demo career transitions are generated and are not validated against an employer's actual history. Never use a demo score as the sole basis for hiring, promotion, compensation, discipline, or termination.

**Complete operator workflow** Confirm tenant, permissions, data freshness, and that the population is large and representative enough for the question.

- Define the question and inputs. Record target skill names and L1-L5 minimums, team budget and size, the employee profile, or the network scope.
- Run the relevant tab and inspect both the visual result and its underlying evidence: match details, cost sources, covariates, graph metrics, transition gaps, timestamps, and model metadata.
- Use the AI explanation panel only as a plain-language explanation of the displayed result; verify it against the source cards and formulas.
- Save or export the result through the authorized workflow, attach assumptions and a human owner, and route any high-impact action to the Reviews Queue and applicable policy gate.
- Monitor the decision outcome. Re-run after source data, integrations, skills, compensation, or model versions change; do not compare scores from different populations without documenting the change.
**Tab-by-tab controls and outputs**

- **Skills:** add/remove target nodes, choose L1-L5, run matching, select a person, inspect semantic paths, confidence, status, and training gaps.
- **Team:** browse/search database skills with per-row L1-L5 and Add (same skill allowed at different levels, never the same skill+level twice), set budget with live minimum/shortfall guidance and roster size 2-10, run the solver, inspect run currency vs saved-run state, solver proof, exact vs graph-adjusted coverage, salary units, cost, and roster. Charts are the proven final measurement kept visible across edits, not live iteration progress. Explain with AI streams a consultant-grade report of the displayed run.
- **Attrition:** inspect the cohort survival curve, eligibility counts, departure count, and censor count. The endpoint does not return individual risk forecasts.
- **ONA:** search, filter by department, select a node, change coloring by department/PageRank/betweenness/silo, inspect neighbors and graph metrics, then explain the observed topology.
- **Career:** select an employee, inspect the next observed role-change probabilities and history counts, then review whether the dated employee history supports those transitions.
**Failure, empty-state, and recovery rules**

- Loading means the request is still running; do not interpret a blank chart as zero risk or zero connectivity.
- Missing employee, skill, dated experience, collaboration, compensation, or outcome records produce an empty result or an unavailable/readiness status. Add valid source records and re-run.
- Skill-match and team optimization require at least one target skill; team optimization also requires enough employees for the requested roster size.
- Team Assembly excludes employees without positive recorded compensation and matching currency and pay period. It does not invent role-based salaries.
- Authentication, authorization, API, or network errors are operational failures. Retry only after checking access and connectivity; never substitute a stale result without labeling it.
**Audit, privacy, and governance checklist**

For every consequential use, retain the question, tenant and population scope, source timestamp, filters, exact inputs, model version, seed where supplied, returned evidence, explanation, reviewer, decision, and outcome. Team scenarios return a deterministic tenant/input-derived seed when one is not supplied and are persisted as forecast scenarios. ONA uses up to the requested employee limit and successful Jira integration logs; it is not a complete communication census. Attrition and career paths expose model limitations so HR must combine them with documented human review.

Restrict access to least privilege, avoid exposing unnecessary names or compensation, honor retention/deletion policy, and use approved intervention, compliance, audit, and disaster-recovery procedures for any downstream action. The Intelligence Center is read/compute oriented; write actions belong in governed workflows.

### Compliance Approval Gates

High-impact interventions or structural updates (such as releasing department reorganizations) trigger **Mandatory Policy Pack Gates**. These gates require administrative override keys to authorize releases.
