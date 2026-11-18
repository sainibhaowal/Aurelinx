# 01. Test Architecture and End-to-End Verification

01. **Backend Test Suite (`server/tests/`):**
    - **Total Verified Passing:** `191 passed, 0 failed, 0 errors` (executed inside `infra-api-1` against the PostgreSQL `test` schema).
    - **Coverage Domains:**
      - `test_attrition_survival.py`: Kaplan-Meier survival curves, censoring, malformed date resilience, tenant isolation.
      - `test_career_markov.py`: Markov transition counts, multi-step propagation, undated record exclusion.
      - `test_ona_graph.py`: Collaboration graph construction, connected components, self-loop filtering.
      - `test_intelligence_skill_matching.py` & `test_intelligence_team_optimize.py`: Dijkstra skill matching, bipartite assignment, MILP budget optimization.
      - `test_workflow_tools.py` & `test_agent_runtime.py`: 7-tool agent runtime, secret redaction, admin approval gates.
      - `test_integration_endtoend.py` & `test_integration_idempotency.py`: HMAC `X-Signature`, `X-API-Key`, and `Idempotency-Key` constraints.
      - `test_privacy_controls.py`, `test_email_verification_flow.py`, `test_uploaded_intelligence_data.py`.

02. **Running Tests Against Containerized PostgreSQL:**
    - Pass `TEST_DATABASE_URL` and `DATABASE_URL` pointing to `postgres:5432` with `options=-csearch_path%3Dtest,public` inside `infra-api-1`, or against `localhost:55432` from the host.
