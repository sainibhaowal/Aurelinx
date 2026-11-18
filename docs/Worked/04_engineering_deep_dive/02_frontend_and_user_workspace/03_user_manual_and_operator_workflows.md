# 03. User Manual and Operator Workflows

01. **Embedded User Manual (`client/src/components/UserManual.jsx`):**
    - Provides in-app, section-by-section operator guidance across all workspace modules:
      - **Overview & Executive Packet:** Headline metrics, risk composition, and PDF/XLSX exports.
      - **Directory & Talent Scout:** Search, department/status filtering, and candidate-to-role matching.
      - **Sentiment Pulse:** Departmental health, risk ratios, and AI copilot briefs.
      - **Intelligence Center:** All 5 analytical engines with `data-readiness` gating explanations.
      - **Intelligence Chat:** Session management, file attachments, and approval-gated tool execution.
      - **Enterprise Ops:** Data Pipelines, AI & Governance, Risk & Interventions, and Compliance & Audit.

02. **Recommended Operator Workflow (End-to-End):**
    - **Step 1 (Data Ingestion):** Upload a dataset bundle (`Docs/datasets/aurelinx_offline_career_markov_demo.zip`) in **Enterprise Ops -> Data Pipelines -> Local Dataset Hub**.
    - **Step 2 (Readiness Check):** Open **Intelligence Center** and inspect the `data-readiness` banner to confirm which engines have sufficient dated records.
    - **Step 3 (Analysis & Action):** Run skill matching, team assembly, survival curves, ONA, or Markov career paths; use **AI Explain** or **Intelligence Chat** to summarize findings and propose interventions.
    - **Step 4 (Audit & Export):** Review actions in **Audit Logs** and export the dataset or executive packet.
