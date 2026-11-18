# Sentiment Intelligence

## 01. Sentiment Intelligence

Sentiment Intelligence is the authenticated employee snapshot view. It separates stored record fields from derived review indicators and does not diagnose people or make employment decisions.

**Scope and data boundary:** the page reads employee sentiment, retention probability, department, and policy-risk fields. Candidate count is shown as separate context and never enters employee morale or risk totals.

### End-to-end page flow

{[ [ "1. Authenticate", "Sign in and open the protected sentiment stream.", ], [ "2. Receive snapshot", "The live SSE stream supplies current employee metrics and a timestamp.", ], [ "3. Derive evidence", "The page calculates priority, department concentration, and threshold matches.", ], [ "4. Review action", "Inspect evidence, export the visible scope, and use authorized HR workflows.", ], ].map(([title, description]) => (

**{title}**

{description}

))}

### Controls and displayed sections

- **Connection status:** “Live stream connected” confirms updates are arriving; “disconnected” means current values are not being refreshed.
- **Department:** recalculates the aggregate report for one employee department and updates the evidence context.
- **At-risk only:** filters the low-sentiment and low-retention evidence lists only; it must not change the headline denominator.
- **System Status:** shows employees reviewed, average sentiment, and stored at-risk count.
- **Intervention Priority:** maps the at-risk percentage to Level 1 (<10%), Level 2 (10-<20%), or Level 3 (≥20%).
- **Derived Workforce Metrics:** shows current score, velocity versus the prior snapshot, and coverage. Coverage is record volume, not statistical confidence.
- **Department concentration:** shows each department’s at-risk count, total, at-risk share, and average sentiment.
- **Evidence lists:** low sentiment means `sentiment_score < 0.45` ; low retention means `retention_prob < 0.55` . Lists are scrollable and show every loaded match.
- **Snapshot history:** bars show captured sentiment snapshots; hover or focus a bar to read timestamp, sentiment, and at-risk percentage.
- **Exports:** PDF, Excel, and Markdown export the currently visible employee scope. Buttons are disabled when that scope has no rows.
### Interpretation, freshness, and failure handling

Sentiment is a normalized review signal, not a diagnosis. Retention probability is probability-like and not a guaranteed outcome. Derived indicators support respectful evidence review and must not be used alone for employment decisions.

The header timestamp is the latest snapshot time. Stream updates append deduplicated points and retain the latest 24 points in the browser’s sentiment trend cache; this is an operational view, not a complete historical warehouse.

If authentication fails, sign in again. If the stream disconnects or the context request fails, treat the page as unconfirmed, check connectivity, and reload. Never interpret missing data as zero.

Use manager/HR review and the governed intervention workflow for follow-up. Viewing, filtering, or exporting does not modify employee records.
