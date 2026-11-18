# 02. CI/CD Pipelines and Release Automation

01. **GitHub Actions Workflows (`.github/workflows/`):**
    - **`ci.yml`:** Runs automated backend checks (`ruff`, `mypy`, `pytest`) and frontend checks (`eslint`, `vitest`, `next build`) on pull requests and pushes.
    - **`release.yml`:** Triggered on version tags (`v*`); builds and pushes multi-service Docker images (`aurelinx-backend`, `aurelinx-frontend`) to GitHub Container Registry (GHCR), with selectable desktop binary builds.
    - **`deploy.yml`:** Pulls prebuilt GHCR images on the target server and runs `docker compose -f infra/docker-compose.prod.yml up -d --wait` with health-check verification.

02. **Version Reconciliation (`scripts/`):**
    - `scripts/reconcile-release-version.js` and `scripts/verify-release-metadata.js` keep version numbers synchronized across `package.json`, `client/package.json`, `client/src/config/version.js`, `server/app/core/config.py`, `server/pyproject.toml`, `desktop/package.json`, and `desktop/src-tauri/tauri.conf.json`.
