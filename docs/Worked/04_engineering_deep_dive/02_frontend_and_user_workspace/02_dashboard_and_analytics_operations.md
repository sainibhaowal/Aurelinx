# 02. Dashboard and Analytics Operations

01. **Overview & Snapshot Endpoints (`server/app/api/v1/analysis.py`):**
    - `GET /api/v1/ai/analytics/overview`: Computes workforce totals, at-risk counts, average sentiment, risk level, top risk department, and department distribution.
    - `GET /api/v1/ai/analytics/snapshot` & `GET /api/v1/ai/analytics/history`: Reads and persists `GoldMetricSnapshotTable` rows (`metric_type="analytics"`) for historical trend tracking.
    - `GET /api/v1/ai/analytics/stream`: Server-Sent Events (SSE) stream for live analytics updates.

02. **Frontend Visualization (`client/src/components/AnalyticsView.jsx`):**
    - Displays headline KPIs, risk composition breakdowns, department risk distribution, and report exports (`jsPDF`, `xlsx` lazy-loaded on demand).

03. **Gold Snapshot Aggregation Formula:**
    - Active workforce count $N_{\text{active}}$ filters out departed records via `is_active_employee()`.
    - At-risk percentage:
    $$P_{\text{at\_risk}} = \frac{N_{\text{at\_risk}}}{N_{\text{active}}} \times 100$$
    - Mean sentiment score:
    $$\bar{S} = \frac{1}{N_{\text{active}}} \sum_{i=1}^{N_{\text{active}}} s_i$$
