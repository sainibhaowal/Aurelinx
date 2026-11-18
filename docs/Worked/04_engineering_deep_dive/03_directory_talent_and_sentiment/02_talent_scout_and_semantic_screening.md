# 02. Talent Scout and Semantic Screening

01. **Candidate Pipeline (`server/app/api/v1/candidates.py`, `client/src/components/TalentScoutView.jsx`):**
    - Manages external candidate records (`candidatetable`, `14,999` records in the demo bundle) separately from internal employees.
    - Supports `GET /api/v1/candidates`, `/candidates/count`, `/candidates/departments`, and candidate skill/experience inspection.

02. **Semantic Screening Engine (`server/app/services/screening_engine.py`):**
    - Compiles each candidate profile (`Role`, `Department`, `Skills`) into a text representation and embeds both the job query $\mathbf{q}$ and candidate profiles $\mathbf{c}_i$ into dense vectors.
    - Ranks candidates by **Cosine Similarity**:
    $$\text{similarity}(\mathbf{q}, \mathbf{c}_i) = \frac{\mathbf{q} \cdot \mathbf{c}_i}{\|\mathbf{q}\|_2 \, \|\mathbf{c}_i\|_2}$$
    $$\text{match\_score}_i = \text{round}\left(100 \times \text{similarity}(\mathbf{q}, \mathbf{c}_i),\; 1\right)$$

03. **LLM-Assisted Analysis (`server/app/api/v1/analysis.py`):**
    - `POST /api/v1/ai/analyze` supports OpenAI-compatible and configured providers (`ProvidersView.jsx`) to generate structured candidate and workforce evaluations.
