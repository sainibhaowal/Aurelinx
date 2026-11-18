---
name: production-hardening-and-review
description: Senior staff-level code hardening, security, performance, and regression review for Aurelinx backend, frontend, and database changes. Use before finalizing any feature, refactor, or API change.
---

# Production Hardening and Senior Code Review

01. **Security & Multi-Tenancy (Fail Closed):**
    - Verify every query, mutation, analytics endpoint, workflow, and audit log derives `tenant_id` from authenticated server-side JWT/session claims—never from untrusted headers.
    - Verify administrative endpoints (`/api/v1/integrations/*`, `/api/v1/privacy/*`, `workflow_approvals`) enforce `is_admin = True`.
    - Verify outbound provider actions route through `external_action_requests` and `workflow_approvals` and reject undeclared actions.
    - Never log, return, or expose secrets, tokens, internal file paths, or raw provider credentials.

02. **Performance & Resource Bounds:**
    - Never load full ORM collections to count rows (use SQL `COUNT(*)`) or export large tables (use column-projected `select(...)` tuples).
    - Check for N+1 queries inside loops and replace with batched queries or joins.
    - Enforce explicit HTTP/DB timeouts, pagination limits, and bounded memory on file uploads/exports.

03. **Correctness & Error Handling:**
    - Never swallow exceptions silently (`except Exception: pass`); log structured errors with context and return accurate HTTP status codes.
    - Keep `is_active_employee()` and `filter_real_records()` consistent across workforce metrics.
    - Write small, single-purpose helpers with early returns and zero duplicated logic.
