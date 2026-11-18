# Data Ops and Enterprise Console Overview

## 01. Data Ops & Enterprise Console

The Enterprise Console contains raw pipeline registries, telemetry logs, model cards, structural simulation sandboxes, and the **Reviews Queue & Risk Interventions Operational Engine**.

Enterprise Sub-Manual Chapters:

Sub-Manual Chapter 1

### Reviews Queue & Operational Risk Interventions: End-to-End Operational Guide

✓ Live Workflow Spec v2.4

This detailed sub-manual explains the exact mathematics, underlying calculations, business logic, card anatomy, button operations, and decision workflows of the **Reviews Queue** inside Data Ops & Enterprise.

#### 1. What is the Reviews Queue and Why is it Essential?

**Signal Discovery vs Human Triage**

The Reviews Queue stores human-created review actions based on available profile fields and documented criteria. It does not continuously scan morale, pay parity, or workload or generate individual risk predictions. Review actions enter the queue as planned tickets ( `status: planned` ). This gives HR Business Partners and managers full audit control to investigate evidence before spending budget.

**Why We Need This Workspace**

Unmanaged employee attrition costs enterprises 1.5x to 2.0x annual salary per departed engineer or leader. The Reviews Queue converts silent flight risk signals into **accountable, owned retention actions** with auditable budget tracking and outcome measurement.

#### 2. Mathematical Calculations & Algorithmic Engines

A. Attrition Model Readiness

Observed employment duration + departure/censor status

No employee probability is produced without observed departure and active-censoring outcomes and validation against held-out historical records.

B. Market Pay Parity Gap

Gap% = ((BaseSalary - MarketMedian) / MarketMedian) * 100

Compares employee base salary against benchmarked market medians for their role and level, identifying compensation risk gaps (e.g. **-22.5% below median** ).

C. Morale & Sentiment Score

Score = ∑(TokenSentiment * Weight) / N

Aggregates anonymized feedback, communication sentiment signals, and 1-on-1 survey indicators into a normalized [0.0 to 1.0] scale (e.g. **0.38 / 1.0 Low Morale** ).

#### 3. Anatomy of a Review Request Card

**Header Metadata & Badges:**

Displays ticket type ( `Review Request` ), target employee/team name, priority badge ( `MEDIUM / HIGH / CRITICAL` ), department, and assigned HRBP owner.

STATUS: PLANNED

**Recommended Triage Action / Evidence Signal Box:**

Summarizes AI findings (e.g. *"Document a retention conversation and reassess employee risk signals."* ) to give HR immediate triage guidance.

#### 4. Detailed Operation of Action Buttons

⚡ Escalate to Active Plan

Opens an interactive modal to enter **Allocated Retention Budget ($)** , **Assigned HR Owner** , **Priority Level** , and **Strategy Notes** . Upon confirming:

- Updates status to `in_progress` with assigned budget.
- Moves ticket from *Pending Reviews Queue* into *Active Interventions Workflow* .
- Renders a direct button: `View in Active Interventions Workflow →` .
📅 Schedule Retention Meeting

Opens an interactive modal to set **Scheduled Date & Time** , **HRBP Lead** , and **Agenda Topics** . Upon confirming:

- Locks calendar timestamp in database record.
- Displays a prominent cyan calendar badge in Active Interventions.
- Enables 30/60/90-day retention outcome tracking.
🚫 Dismiss Signal

Opens a modal prompting for an **Audit Justification Reason** (e.g. *False positive signal* , *Recently promoted* , *Planned departure* ). Upon confirming:

- Updates status to `cancelled` .
- Logs dismissal reason into compliance audit trail.
- Archives request out of active queues.
🔍 View Evidence & Audit

Expands the **Interactive 3-Part Operational Audit Hub** directly on the card:

- **Part 1:** Flight Risk, Pay Gap, and Morale Score visual progress bars.
- **Part 2:** Chronological log of ticket creation, HR assignments, budget approval, and notes.
- **Part 3:** 30/60/90-day outcome scoring checkpoints.
#### 5. Enterprise Governance & Audit Compliance Protocols

**Human-in-the-Loop Safeguards**

Imported employee flags and descriptive analysis serve as evidence for human review; they are not individual flight-risk forecasts. Aurelinx does not alter employee contracts, salaries, or roles automatically. Administrative authorization is required for high-impact actions.

**Immutable Audit Trails**

Every triage action (Escalate, Schedule Meeting, Dismiss) is stamped with UTC timestamps, assigned user credentials, and mandatory justification audit logs.

**Source Data Refresh**

A sync updates mapped source fields only. It does not recalibrate an attrition model or infer sentiment from messages. Review provider sync results and rerun the analysis that uses the refreshed fields.

### Enterprise Connections & Compliance Hub

The Enterprise Operations page registers HRIS/ATS connections, monitors sync jobs, manages evidence-linked interventions, and exposes model governance, disaster recovery, and compliance controls.

**Integration connections** Register approved Workday, Greenhouse, or other HRIS/ATS sources and monitor their sync status before data is used.

**Intervention workflows** Convert reviewed workforce signals into owned, status-controlled HR actions with checkpoint history and audit evidence.

**Governance & compliance** Review model quality, fairness, drift, policies, recovery readiness, and audit events before production decisions.
