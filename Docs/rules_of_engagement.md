# Aurelius: Rules of Engagement (Production Standard)

This document defines the mandatory protocols for every code change, test, and implementation step. **Strict adherence is non-negotiable.**

## 1. Pre-Implementation Protocol (The "Why & Where")
Before writing a single line of code, I must:
- **Analyze Context:** Check existing imports, global state, and API patterns to prevent breakage.
- **Dependency Audit:** Ensure all required libraries are present. Never install a package without a specific purpose.
- **Path Verification:** Confirm absolute and relative paths for files, assets, and endpoints.

## 2. Coding Standards (The "How")
- **Clean Imports:** Organize imports logically (Standard Lib -> External Lib -> Local Modules).
- **Type Safety:** 
    - **Backend (Python):** Use Pydantic models for every request/response and Type Hints for all functions.
    - **Frontend (React):** Use PropTypes or TypeScript definitions (if applicable).
- **Naming Conventions:** Use descriptive, industry-standard naming (camelCase for JS, snake_case for Python).
- **No Placeholders:** Never use "TODO" or "Lorem Ipsum" in production code.

## 3. The "No-Gap" Testing Suite
No feature is considered "done" until it passes:
- **Linting:** 
    - Python: `ruff` check and `black` formatting.
    - Frontend: `eslint` and `prettier`.
- **Unit Testing:** 
    - Backend: `pytest` for every endpoint and logic block.
    - Frontend: `vitest` for component rendering and logic.
- **Integration/E2E:** `playwright` for critical user flows (e.g., Login -> File Upload -> AI Report).

## 4. API & Endpoint Integrity
- **Versioning:** Always use `/api/v1/` prefixes.
- **Documentation:** Every endpoint must have an auto-generated Swagger/OpenAPI description.
- **Error Handling:** Use standard HTTP status codes. Every error must return a JSON body with a clear message (no "Internal Server Error" generic crashes).

## 5. Documentation & "Worked" Log
After every implementation:
- **Record Step:** Document exactly what was changed in `Docs/Worked/changelog.md`.
- **Log Proof:** Include a summary of test results (e.g., "All 12 unit tests passed").
- **Verification:** Confirm that the change did not break existing features.

## 6. Security & Performance
- **Environment Safety:** Never hardcode API keys. Use `.env` files.
- **State Management:** Use efficient state updates to prevent UI re-renders.
- **Payload Optimization:** Minimize JSON sizes and use lazy loading for heavy UI components.
