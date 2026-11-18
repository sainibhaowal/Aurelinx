# 03. Sentiment Pulse and Organizational Health Engine

01. **Sentiment & Health API (`server/app/api/v1/analysis.py`, `client/src/components/SentimentPulseView.jsx`):**
    - `GET /api/v1/ai/sentiment/report`: Returns aggregate organizational sentiment, risk profile classification, at-risk counts, and critical department identification.
    - `GET /api/v1/ai/sentiment/stream`: Real-time SSE stream for sentiment updates.
    - `GET /api/v1/ai/copilot/context` & `POST /api/v1/ai/copilot/brief`: Page-aware AI brief generation.

02. **Health Classification Logic (`server/app/services/sentiment_analyzer.py`):**
    - Computes the tenant risk ratio:
    $$r_{\text{risk}} = \frac{N_{\text{at\_risk}}}{N_{\text{total}}}$$
    - Maps $r_{\text{risk}}$ to organizational health profiles:
      - $r_{\text{risk}} > 0.30 \implies \text{Critical Turnover Risk}$
      - $0.15 < r_{\text{risk}} \le 0.30 \implies \text{Attention Required}$
      - $r_{\text{risk}} \le 0.15 \implies \text{Stable / High Engagement}$
    - Identifies the critical department via $\arg\max_{d} \text{count}(\text{at\_risk} \mid \text{dept} = d)$.
