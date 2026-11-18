# Workflow Chat and Agents

## 01. Agentic Workflow Chat

The Workflow Chat is Aurelinx's cognitive agent console. Rather than a static conversational bot, this agent dynamically inspects your intent, selects governed tools, reads verified database context, proposes or executes authorized actions, and streams an auditable result in real time.

Database Mutations (Write Ops)

Administrators can write or modify supported records using natural language. The agent translates the request into a structured, validated data operation; execution is restricted by role and policy.

RBAC Security & Safety

Every mutation check is gated by Role-Based Access Control (RBAC). General members are blocked from executing mutations. Critical actions (like deletion) trigger mandatory safety blocks.

### Workflows Agent Ingestion & Retrieval Pipeline

1. INGESTION ENGINE

Context Gathering & Parser

Accepts user natural language prompts + rich file attachments (PDFs, DOCX, CSV, Image OCR).

2. INTENT CLASSIFIER

Dynamic Tool Policy

Decides whether the query requests a readonly database search, summary metrics snapshot, or administrative write transactions.

3. RBAC & SECURITY CHECK

Compliance Gatekeeper

Authenticates user privileges. Blocks write operations for regular members and redirects deletion operations to human-in-the-loop gates.

4. TRANSACTION LAYER

PostgreSQL Execution

Commits data mutations, runs skills similarity searches, or imports batch CSV rosters directly into Postgres.

5. GENERATIVE STREAM

SSE Token Typewriter

Integrates tool query outcomes with conversation logs and streams real-time Markdown via Server-Sent Events.

### Attachment Parsing Engines

When you drag and drop attachments into the chat input, the backend parses them using specific libraries depending on file suffix:

- **TXT / MD / LOG / JSON:** Ingested directly as UTF-8 text strings.
- **PDF Documents:** Parsed using `pypdf` page-by-page.
- **Word Documents (DOCX):** Read paragraph-by-paragraph using `python-docx` .
- **Images (PNG / JPG / JPEG):** Extracted using Tesseract OCR ( `pytesseract` ).
- **CSV files:** Parsed and automatically imported into PostgreSQL as either candidate or employee profiles based on status headers.
### Data Mutations Command Reference

Admins can input the following commands directly into the workflow chat to alter PostgreSQL database values:

Set Employee Risk Flags

`"Set employee liam@aurelinx.com risk to true"`

Reorganize Personnel Departments

`"Move employee olivia@public.local to department Engineering"`

Add New Workforce Entries

`"Add employee Silas Vance, email silas@aurelinx.com, role Lead Developer, dept Technical"`

Configure Integration Connections

`"Add connection Slack Sync, provider slack, type messaging"`

### Agents, tools, and decision policy

**Controller agent**

Classifies the request, selects one or more allowed tools, validates the tool result, and asks the answer model to respond from verified context. Private model reasoning is never exposed as the answer.

**Retrieval tools**

`search` finds text matches; `read` returns one safe record; `analyse` computes structured statistics and formulas; `observe` detects patterns, symptoms, and anomalies.

**Execution tools**

`modify` updates one identified record and verifies it; `write` creates a supported record; `delete` only prepares an exact approval specification and never deletes automatically.

**Role policy**

Members may search, read, analyse, and observe. Administrators may modify or write. Deletion remains human-approved for both roles, with the exact action, requester, hash, expiry, and decision recorded.

### Database entities and safe field policy

The workflow engine uses a registered entity map rather than arbitrary SQL. Supported entities include employees, candidates, skills, experiences, chat messages, attachments, integrations, policies, interventions, workflow runs, audit records, model registry entries, data contracts, scenarios, webhooks, API keys, and integration logs.

**Identifiers:** employees/candidates use email, full name, or ID; skills use name or ID; integrations/policies/interventions/models use their registered name or ID; experiences, messages, attachments, workflows, audits, contracts, scenarios, webhooks, keys, and logs use exact IDs where required.

**Protected fields:** attachment file paths, integration/API secrets, audit details/IP addresses, webhook payloads/headers, model contract requirements, and integration-log details are never returned to the answer model or user.

### Analysis formulas and evidence rules

- **At-risk percentage:** flagged employees ÷ scoped employees × 100.
- **Average sentiment:** arithmetic mean of stored employee sentiment scores in the requested scope.
- **Department risk concentration:** at-risk employees in a department ÷ total employees in that department × 100.
- **Search versus analysis:** search returns matching records and cannot calculate statistics; analysis returns verified counts, current values, and computed formulas; observe adds pattern and anomaly interpretation.
- Tool results are bounded, redacted, and passed to the answer model as live context. The model must not invent missing records, counts, approvals, or completed mutations.
### Sessions, attachments, and user controls

- Create, select, rename, clear, and delete workflow sessions from the right-side Workflow Sessions drawer. Clear removes messages/attachments for the selected session; delete removes the session after confirmation.
- Attach TXT/MD/LOG/JSON, PDF, DOCX, image, or CSV files. Each attachment displays pending, parsed, failed, or unsupported status and can be removed before sending.
- Send with Enter, use Shift+Enter for a new line, stop an active stream with the stop button, copy messages, edit a user request to regenerate, regenerate an assistant answer, and submit thumbs-up/down feedback.
- Export the transcript as PDF, Excel, or Markdown. Excel includes tool, record, approval, and error summary counts; exports are local artifacts and should be handled as sensitive data.
### End-to-end mutation and approval lifecycle

- User submits a natural-language request.
- Controller classifies intent and selects a tool.
- Policy gate checks role, entity, exact identifier, allowed fields, and destructive keywords.
- Read operations return redacted context; modify/write operations commit and verify the record.
- Delete operations create a pending approval with an exact payload hash and expiry; an authorized human approves or rejects it.
- Workflow events, tool calls/results, status, duration, errors, and final response are persisted and shown as safe telemetry.
#### Human-in-the-Loop Safe Aborts

**Aurelinx Governance Protocol:** The agent is strictly prohibited from executing deletion operations ( `delete` , `remove` , or `purge` ) under any circumstances. If requested, the pipeline safely aborts the operation, prompting the administrator to verify the deletion manually.
