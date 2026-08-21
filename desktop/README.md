# Aurelinx Desktop — Tauri Shell

A lightweight native desktop shell for the **Aurelinx Executive Talent Intelligence Platform**, built with **Tauri 2** (Rust + system webview). It wraps the platform's web frontend in a native window — a fast, small-footprint alternative to Electron.

---

## Tech stack

| Layer | Technology |
|---|---|
| Shell | Tauri 2 |
| Native backend | Rust (edition 2021) |
| Frontend | Bundled web assets (`frontendDist: ../dist`) |
| Dev server | http://localhost:3100 (during `tauri dev`) |

---

## Repository layout

```
desktop/
├── src-tauri/
│   ├── src/main.rs      # Rust entrypoint (native shell)
│   ├── Cargo.toml       # Rust manifest
│   ├── tauri.conf.json  # Tauri configuration (window, bundle, icons)
│   ├── capabilities/    # Tauri capability/permission declarations
│   ├── icons/           # App icons (PNG / ICO / ICNS)
│   └── build.rs         # Tauri build script
├── scripts/
│   └── prepare-config.js # Pre-build config preparation
├── dist/                 # Bundled frontend assets (from the client build)
└── package.json
```

---

## Prerequisites

- Node.js 18+
- Rust toolchain (1.77+): `rustup default stable`
- Platform system dependencies for Tauri 2 — see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

---

## Development

```bash
cd desktop
npm install
npm run dev
```

`npm run dev` prepares the config (`scripts/prepare-config.js`) and launches `tauri dev`, which opens a native window pointed at the local frontend dev server (http://localhost:3100).

> Make sure the frontend (or its production build) is available at the configured URL before launching.

---

## Build (installers)

```bash
npm run build
```

Builds native installers for all configured bundle targets (`.deb`, `.rpm`, `.msi`, `.dmg`, …) via `tauri build`.

---

## Configuration

Key settings in `src-tauri/tauri.conf.json`:

| Setting | Value | Purpose |
|---|---|---|
| `productName` | `Aurelinx` | Installed app name |
| `identifier` | `com.aurelinx.desktop` | Unique app identifier |
| `build.frontendDist` | `../dist` | Bundled web assets used in release builds |
| `build.devUrl` | `http://localhost:3100` | Dev server URL for `tauri dev` |
| window size | 1440×960, resizable | Default window geometry |
| `bundle.targets` | `all` | Build installers for every platform |

---

## Notes

- The desktop shell is **independent from the production web deployment** — the platform remains fully usable in a browser via `aurelinx.averqel.com`.
- Releases can be tagged/triggered via the repo's release pipeline if desktop distributions are published (see the root [`README.md`](../README.md)).

---

## Related

- Frontend (web): [`client/`](../client/README.md)
- Backend API: [`server/`](../server/README.md)
- Infrastructure: [`infra/`](../infra/README.md)