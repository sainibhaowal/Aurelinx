# 01. Intelligence Chat and Attachments

01. **Persistent Chat Architecture (`server/app/api/v1/chat.py`, `client/src/components/IntelligenceChatView.jsx`):**
    - Stores multi-turn conversations in `chat_sessions` and `chat_messages` (with `tool_trace` JSON logs), scoped by `tenant_id` and `user_id`.
    - Captures thumbs-up/down steering feedback in `chat_feedback` (`ChatFeedbackTable`).

02. **File Upload & Parsing Pipeline (`chat_attachments`):**
    - Uploaded files are stored under `CHAT_UPLOAD_ROOT` (`/app/data/chat` in Docker) and tracked with `parsing_status` (`pending | parsed | failed | unsupported`) and `parsing_error`.
    - File paths are redacted from agent tool read outputs so internal storage paths are never leaked to end users.

03. **LLM Provider Routing & Output Sanitization:**
    - Supports OpenAI-compatible endpoints (including local Ollama and OpenCode Zen) via `ProvidersView.jsx` and `/api/v1/proxy/models`.
    - `_sanitize_llm_response()` strips unsafe markup and internal system tags before rendering responses.
