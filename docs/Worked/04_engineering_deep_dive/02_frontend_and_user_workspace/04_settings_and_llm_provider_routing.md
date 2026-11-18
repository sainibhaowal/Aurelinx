# 04. Workspace Settings, LLM Providers, and Model Proxy

01. **Provider Configuration UI (`client/src/components/SettingsWorkspaceView.jsx`, `ProvidersView.jsx`):**
    - Allows operators to configure LLM providers (OpenAI-compatible APIs, local Ollama, OpenCode Zen) and select active models for Intelligence Chat, Talent Scout analysis, and Intelligence Explainability.

02. **Provider Utilities & Model Proxy (`server/app/core/provider_utils.py`, `GET /api/v1/proxy/models`):**
    - Normalizes base URLs and safely proxies `/models` discovery requests from the backend so the frontend can populate available models without CORS issues.
    - Falls back to deterministic explanations (`_generate_deterministic_explanation()` in `intelligence.py`) whenever no external LLM key is configured.
