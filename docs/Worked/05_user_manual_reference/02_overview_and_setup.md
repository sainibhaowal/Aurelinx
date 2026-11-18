# Overview and Setup

## 01. Aurelinx Platform Overview

Aurelinx brings workforce records, analytics, and decision support into one workspace. You can explore the offline demo bundle without connecting a provider, or configure supported provider connectors and webhooks for tenant data. A connection only supplies the fields and event types that its source actually returns.

### Quick Start Checklist

- **Configure LLM Provider:** Go to Settings ➔ Providers to set up your OpenAI, Claude, Groq, or local LM Studio connection.
- **Review Workforce Analytics:** Review the Dashboard and Sentiment views as stored indicators. Demo values are synthetic and are not evidence about a real workforce.
- **Launch Interventions:** Identify at-risk employees and initiate structured 30/60/90-day mitigation plans.
- **Setup Data Ingestion:** Upload the offline demo ZIP through Data Ops, or configure a provider connection and verify its sync results before using the returned data.
### System Architecture Flow

[Data Ops ZIP / Provider Sync / Webhooks] ➔ [Tenant Records]

➔ [PostgreSQL database] ➔ [Directory / Analytics]

➔ [Intelligence Center evidence] ➔ [AI explanations]

➔ [Agentic Workflows Chat & Client Dashboard]
