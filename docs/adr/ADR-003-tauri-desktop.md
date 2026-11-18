# ADR-003: Tauri 2.x for Desktop Application

**Status**: Accepted  
**Date**: 2026-08-23  
**Deciders**: @ravindersingh  
**Technical Story**: Initial architecture decision

## Context

Need a desktop application wrapper for Aurelinx. Requirements:
- Native performance and feel
- Small binary size
- Secure by default
- Access to OS APIs (keyring, notifications, tray)
- Cross-platform: Windows, macOS, Linux
- Auto-updater with signature verification
- Share code with web frontend

Options considered:
1. **Tauri 2.x** (Rust + WebView)
2. **Electron** (Chromium + Node.js)
3. **Wails** (Go + WebView)
4. **Flutter** (Dart + Skia)
5. **Native** (Swift/WinUI/GTK)

## Decision

**Choose Tauri 2.x** for the desktop application.

## Consequences

### Positive
- Tiny binary (~10MB vs 100MB+ Electron)
- Uses system WebView (WebView2 on Windows, WebKitGTK on Linux) — no bundled Chromium
- Rust backend for native performance and OS integration
- Secure by default: allowlist-only IPC, CSP, no `eval`
- Auto-updater with Ed25519 signature verification
- Share Next.js frontend code (web + desktop from same repo)
- MIT/Apache-2.0 license (business-friendly)
- Active community and growing ecosystem

### Negative
- Rust learning curve for frontend developers
- WebView differences across platforms (mitigated: test on all three)
- Less mature ecosystem than Electron
- No Node.js in Rust side (need to reimplement or use commands)

### Risks
- WebView2 not on Windows 7 (acceptable: Windows 10+ only)
- Linux WebKitGTK version fragmentation (mitigated: specify minimum version)

## Alternatives Considered

| Alternative | Pros | Cons | Why Not Chosen |
|-------------|------|------|----------------|
| Electron | Mature, huge ecosystem, Node.js access | Huge size, security issues, memory hungry | Binary size + security critical |
| Wails | Go backend, smaller than Electron | Smaller community, Go not needed | Tauri has better Rust ecosystem |
| Flutter | Single codebase, native performance | Different language (Dart), web support limited | Team expertise in React/TypeScript |
| Native | Best performance, platform feel | 3x development effort | Not feasible for small team |

## Implementation Notes

- Frontend: Minimal Next.js shell that redirects to hosted web app
- Rust: Tauri commands for native features (keyring, tray, updater, auth)
- IPC: Type-safe via `ts-rs` (shared TypeScript ↔ Rust types)
- Build: GitHub Actions matrix (Windows, macOS, Linux)
- Signing: Apple Developer ID (macOS), EV Cert (Windows), GPG (Linux)
- Distribution: GitHub Releases + Homebrew/Scoop/Chocolatey (future)

## Related ADRs

- ADR-001: FastAPI + SQLModel for Backend
- ADR-002: Next.js App Router for Frontend
