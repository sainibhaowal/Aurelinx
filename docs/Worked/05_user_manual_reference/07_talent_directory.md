# Talent Directory

## 01. Talent Directory

The Talent Directory is the searchable, paginated record browser. It presents lightweight employee and candidate metadata, keeps the two populations separate, and opens a full profile only when you select a card.

#### Directory scope and safety

Directory cards are read-only previews. They contain enough metadata to search and browse quickly, while skills, experience, and other full-profile fields are requested only after a profile is opened.

Employee risk and morale indicators are separate from candidate matching. The Directory does not change a record merely because it is viewed or flagged; controlled changes belong in authorized workflows.

### Data Processing & Attrition Pipeline

1

SCOPE

Metadata load

Loads the configured directory metadata scope.

2

FIELDS

Field display

Reads stored fields and configured indicators for display.

3

SEPARATION

Scope separation

Separates employee and candidate views without mixing their metrics.

4

DETAILS

On-demand profile

Opens a profile or sends the selected report scope to export.

### Acronyms & Technical Glossary

**ONA (Organizational Network Analysis)** Study of communication and collaboration networks to map communication patterns, influence nodes, and systemic bottlenecks.

**NLP (Natural Language Processing)** A general term for language-analysis capabilities used by applicable intelligence features; opening a Directory card does not run a new NLP analysis.

**ML (Machine Learning)** A general term for modeled indicators. A Directory card displays returned values; it does not claim that a new model was trained or run during browsing.

**HRIS (Human Resources Info System)** Core systems of record (like Workday) tracking employment, compensation, job hierarchies, and roles.

#### Employees

People in the employee/workforce scope. Employee cards can show stored role, department, sentiment, retention, and risk fields when those fields are available.

#### Candidates

People in the candidate scope. Candidate cards use candidate fields such as role, department, skills, application date, and match score; they are not included in workforce risk or morale totals.

### Understanding Directory Metrics

**💬 Sentiment score (normalized 0-1)**

This is a normalized signal used for workforce analysis. It is not a diagnosis or a direct statement of how a person feels.

- **How it works:** The Directory displays the stored score returned by the employee profile endpoint; the Directory itself does not infer a new score while you browse.
- **Interpretation:** Lower values are review signals and higher values are more favorable signals within the configured scale. Use Sentiment Intelligence for definitions, filters, and trends.
**⚠️ Retention probability (0%-100%)**

This is a stored or modeled probability-like indicator used to prioritize review. It is not a guaranteed departure date or outcome.

- **How it works:** The Directory reads the value returned by the employee profile endpoint and renders it as a percentage.
- **Why it matters:** It helps users decide which records need evidence review; it must not be used alone for an employment decision.
### Retention Status Definitions

OPTIMAL

The record does not currently match the configured at-risk flag.

- Review the displayed retention and sentiment values.
- Confirm the record is in the correct scope.
- Do not treat the label as a guarantee of future stability.
AT RISK

The record matches the configured at-risk flag and requires evidence review.

- Open the full profile to inspect the supporting fields.
- Use Sentiment Intelligence or Analytics for broader context.
- Create a controlled intervention only after review and authorization.
### The Skills Ontology & Level Scale

Aurelinx displays each stored skill on a five-level execution scale. The profile dossier renders the selected level as a five-segment meter:

L1: Foundational

Capable of performing supervised core tasks.

L2: Operational

Performs autonomously in production setups.

L3: Proficient

Handles common work independently.

L4: Advanced

Leads complex delivery and raises team capability.

L5: Strategic Expert

Sets direction for complex systems and capability.

### Operational Checklist

- Use tabs at the top ( **All / Employees / Candidates** ) to toggle records.
- Search by name, email, role, or department. Search is debounced and executed server-side across the full matching population, not only the cards already loaded.
- The first metadata page contains up to 100 rows. Scroll near the end to load more lightweight metadata automatically; full skills and experience are not loaded for every card.
- Read the totals separately from the loaded-card count. “Records in scope” is the authoritative count; the small “shown” label describes rendered matching cards.
- Click an employee card to open the personnel dossier. Click a candidate card to open the candidate dossier. The dossier request is made only after selection.
- Use the Department, Risk status, and Sentiment range filters to query the complete server-side population. Administrators also have an employee employment-status filter for active, on-leave, departed, and unreported records. “At-risk employees only” and employment status apply only to employees; candidates remain separate.
- Scroll-to-load uses paginated metadata. Off-screen cards use browser content-visibility optimization, while server-side pagination prevents the full database from being loaded at once. This is not a limit on search or totals.
- Employee dossiers show salary and employment outcome details only to administrators. Missing salary, currency, pay period, outcome, and censor fields are shown as not provided; the system does not fill them with estimates. The long dossier scrolls inside its window.
- Use the refresh icon to re-fetch directory pages, totals, department totals, and risk totals. A spinner indicates the request is running.
- Use the export menu or **Quick PDF** to request a report. Exports repeat the active tab, search, department, risk, sentiment, and administrator employment-status filters and page through the matching database population until complete.
- If a warning appears, use **Retry** . Do not interpret an error or missing response as a zero count.
**Caching, freshness, and failures**

The Directory may show a user-scoped cached metadata page for up to ten minutes so navigation stays fast. A stale-cache notice tells you to refresh before making a decision or exporting.

Employee and candidate totals are requested separately. Department totals are also separated before the shared department union is displayed.

Profile retrieval errors, search errors, and pagination errors are operational failures - not empty datasets. Retry after checking authentication and connectivity.

The Directory is a read and review surface. To change a risk flag or create an HR action, use an authorized workflow with its audit and approval controls.

**Profile quality, provenance, and audit details**

Opening a dossier requests validation metadata in addition to the profile: source classification and directory version, missing required fields, exact duplicate-name/email warnings, and audit events available to the signed-in user for that record.

A “review” status means a required field or duplicate warning needs attention; it does not delete, merge, or rewrite records. “No audit events” means none are available to this user, not that the record has never changed. Organization-wide audit review remains governed by the protected audit surface.

Directory includes a lightweight ONA summary (network people, links, and leading influence/bridge signals) returned by the protected ONA service. The full interactive graph, filters, and node exploration remain in Intel Center. Directory does not train models or invent relationships.
