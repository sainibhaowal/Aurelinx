# 03. MLOps Deployment Center and Release Gates

01. **Release Gates (`GET/POST /api/v1/lean/release-gates`, `POST /api/v1/lean/release-gates/{gate_id}/approve`):**
    - `ReleaseGateTable` tracks environment promotions (`dev`, `staging`, `prod`) with `artifact_name`, `version`, `required_checks` (e.g., `["pytest", "alembic-head", "docker-health"]`), `status` (`pending | approved | rejected | promoted`), and `approved_by`.

02. **CI/CD & Container Build Pipeline (`.github/workflows/`):**
    - Builds and publishes versioned `aurelinx-backend` and `aurelinx-frontend` Docker images on release tags (`v0.2.9`), plus optional desktop binary builds.
