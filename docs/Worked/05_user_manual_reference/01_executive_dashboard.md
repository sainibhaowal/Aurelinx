# Executive Dashboard

## 01. Executive Dashboard

Aurelinx is a workforce and talent-intelligence application. It connects operational views, search, analysis, decision support, and controlled follow-up actions in one auditable workspace.

**Why companies use it:** to understand organizational signals, investigate evidence, make informed decisions, and move from analysis to an owned action without changing source records automatically.

### Headline metrics

**Workforce** A count of people in the organization scope selected for the workspace. It provides the population context for workforce metrics.

**Candidates** A separate hiring-pool count. Candidate measures remain separate from workforce health and workforce risk measures.

**At risk** The number of people matching the configured risk flag. The percentage expresses that count relative to the workforce scope.

**Average morale** An aggregate sentiment indicator for the current scope. It is a summary signal for investigation, not a diagnosis or a definitive prediction about any person.

### Risk composition

The risk panel groups the workforce scope by signal. These counts are matches per category and can overlap; they must not be added together.

**Retention probability pressure**

People below the configured retention-probability threshold. This is a modeled estimate of possible departure pressure, not a fact or certainty.

**Low morale signals**

People below the configured sentiment threshold. It is a prompt for respectful human review, not proof of dissatisfaction.

**Policy risk flags**

People matching the configured policy-risk rule. A flag is a review signal and requires evidence before any action.

These categories can overlap. Their counts describe separate signals and must not be added together.

### How the thresholds work

Each threshold is an inclusive rule applied independently to every record in the current workforce scope. A record is counted when its value satisfies the rule; it is not counted when the value is exactly on the safe side of the boundary.

**Retention < 0.55**

A retention probability of 0.54 is included; 0.55 is not. The value is a modeled likelihood signal, not a promise that someone will leave.

**Sentiment < 0.45**

A sentiment score of 0.44 is included; 0.45 is not. The score is a screening signal for human review, not a diagnosis.

**Department risk ≥ 25%**

A department is concentrated when at least one quarter of its scoped people are flagged at risk. This driver counts departments, not people.

Changing a source value or risk rule changes the next snapshot. Threshold matches are not additive because one person or department can satisfy more than one rule.

### Workforce health and morale signal

**Morale signal** is the arithmetic mean of the stored sentiment scores in the current workforce scope. The Dashboard label **Current model indicator** means this is a calculated summary used for decision support; it is not a trained clinical measure or a historical trend. Open Sentiment Intelligence for filters, drilldowns, live snapshots, and trend history.

### Workspace overview and actions

Workspace Overview links to Analytics, Talent Scout, Grounded Query/Workflows, Intelligence Center, and Data Ops. Each area has a defined purpose and scope. Clicking a risk row opens its drilldown; creating an intervention records a controlled action and does not modify source records automatically.

### Controls and day-to-day operation

**Manual** opens this guide at the Executive Dashboard section.

**Refresh** requests the latest workforce cards, candidate count, and analytics snapshot. During the request, values show a loading state. Refresh does not alter records or run an intervention.

**Export** opens PDF, Excel, and Markdown actions. Export runs against the report scope and may take longer for a large scope; wait for the success or error notification before closing the page.

**Import Data** opens Data Ops, where authorized users manage ingestion and validation. Import is separate from Refresh; refresh reads the currently available records after an import has completed.

**Workspace links** navigate to the relevant operational area without changing the dashboard scope.

**Risk rows** are interactive. Select one to open its matching drilldown and review evidence before creating any controlled action.

**Talent stream cards** are lightweight previews. Selecting a card opens the full profile on demand; candidates remain separate from workforce risk and morale calculations.

### Loading, freshness, and failure states

**Loading** is shown as a placeholder while a request is in progress. Existing cached values may remain visible until the new response replaces them.

**Freshness** means the timestamp of the most recently returned snapshot, not the timestamp of the underlying source system. The dashboard is a current snapshot view; it does not invent historical values. The current Dashboard does not display a separate freshness badge, so use Refresh before a decision or export.

**Source and scope** identify which workspace population the metrics summarize. The Dashboard shows the current-record scope; source/version and ingestion details are managed in Data Ops. Workforce measures and candidate measures must always be interpreted separately.

**Errors** are surfaced with an error notification when an API, authentication session, or provider request fails. Retry with Refresh after correcting the underlying connection or session; an error must not be interpreted as a zero metric.

**Stale values** should be refreshed before a decision or export. If a refresh fails, treat the last visible snapshot as unconfirmed until a successful response is shown.

### Exports

Dashboard export actions generate PDF, Excel, or Markdown reports for the selected report scope. Reports include generation time and should be reviewed for scope, filters, observed fields, and modeled indicators before sharing.
