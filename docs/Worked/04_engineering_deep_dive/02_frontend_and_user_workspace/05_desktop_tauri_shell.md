# 05. Desktop Application Shell (Tauri)

01. **Architecture (`desktop/`, `desktop/src-tauri/`):**
    - Wraps the Aurelinx web workspace inside a native cross-platform desktop container powered by **Tauri** (Rust backend + webview frontend).
    - Includes custom window chrome (`client/src/components/WindowControls.jsx`) when running inside the desktop shell.

02. **Build & Release Controls (`desktop/package.json`, `desktop/scripts/`):**
    - Supports local development (`cargo tauri dev`) and production binary bundling (`cargo tauri build`).
    - Desktop release binary builds are explicitly selectable in CI (`.github/workflows/release.yml`, updated in `v0.2.9`).
