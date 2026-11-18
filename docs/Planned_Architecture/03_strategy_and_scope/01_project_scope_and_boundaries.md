# 01. Project Scope and Honest Boundaries

01. **What Aurelinx Is Today:**
    - A production-architected, full-stack HR intelligence prototype (`v0.2.9`) demonstrating end-to-end engineering across Next.js 15, FastAPI, PostgreSQL, Redis, Qdrant, and Docker Compose.
    - Verified end-to-end using public/synthetic benchmark bundles (`Docs/datasets/aurelinx_offline_career_markov_demo.zip`).

02. **What Is Deliberately Out of Current Scope:**
    - Live production HRIS/ATS/Slack syncs (requires company-owned OAuth apps and credentials).
    - Individual-level attrition predictions (intentionally gated behind `data-readiness` until real longitudinal outcomes exist).
    - Full SOC2/enterprise procurement operations (modeled in schema and APIs as architectural scaffolding).

03. **Recommended Product Wedge (If Commercialized):**
    - Narrow focus to one high-pain workflow (such as engineering retention early-warning or automated technical candidate evidence scoring) before expanding into a broad suite.
