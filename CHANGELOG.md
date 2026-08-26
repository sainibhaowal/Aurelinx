# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.4.0](https://github.com/sainibhaowal/Aurelinx/compare/v1.3.2...v1.4.0) (2026-08-26)


### Features

* **auth:** implement 1-time 30s email verification on signup and instant direct sign in ([3a70b2e](https://github.com/sainibhaowal/Aurelinx/commit/3a70b2e6b6354d454ab85ef3d4c912bc786a02e0))
* **auth:** simplify signup to email and password with auto-derived profile metadata ([f41d094](https://github.com/sainibhaowal/Aurelinx/commit/f41d094702ed28e1be719bb0fa310a8adb79d63e))
* **db:** add alembic migration 004 for email verifications ([23ca800](https://github.com/sainibhaowal/Aurelinx/commit/23ca8000521c619b286e852d06f353e0a4c59d98))


### Bug Fixes

* **client:** add missing framer-motion import in AurelinxLogo ([4610b1c](https://github.com/sainibhaowal/Aurelinx/commit/4610b1cfc86c240bc374280b4df0c8abf8e9aa9b))
* **client:** configure Next.js rewrites for transparent /api proxying ([92e06aa](https://github.com/sainibhaowal/Aurelinx/commit/92e06aa0ebc6be6aab3424c065ede261538186c7))
* **client:** route api requests through same-origin reverse proxy ([56039c4](https://github.com/sainibhaowal/Aurelinx/commit/56039c48d1cdfcac0af4a633e2dc7938476305de))
* **client:** set dev script to default container port 3000 ([39869bd](https://github.com/sainibhaowal/Aurelinx/commit/39869bd3d6f3db118106a2ecc49b4175888b1ed7))
* deliver email verification codes ([da0ef7a](https://github.com/sainibhaowal/Aurelinx/commit/da0ef7adbbae4647b303cfa72dd9ab8e36437fd4))
* **infra:** add resilient postgres socket wait before alembic migrations ([0c1b05e](https://github.com/sainibhaowal/Aurelinx/commit/0c1b05e531fa0487347e17425c66fef1f002da36))
* satisfy authentication CI checks ([2852734](https://github.com/sainibhaowal/Aurelinx/commit/2852734a939595b2a88d7f51d29f1ac79c8a844d))

### [1.3.2](https://github.com/sainibhaowal/Aurelinx/compare/v1.3.1...v1.3.2) (2026-08-23)


### Bug Fixes

* **ui:** trigger direct in-browser file download on button click ([f742e54](https://github.com/sainibhaowal/Aurelinx/commit/f742e54d4a1348012c5164d49e8a57d0fe7e8606))

### [1.3.1](https://github.com/sainibhaowal/Aurelinx/compare/v1.3.0...v1.3.1) (2026-08-23)

## [1.3.0](https://github.com/sainibhaowal/Aurelinx/compare/v1.2.0...v1.3.0) (2026-08-23)


### Features

* **desktop:** embed Ravinder Singh publisher and copyright metadata in Windows installer ([4a91568](https://github.com/sainibhaowal/Aurelinx/commit/4a91568a8b817882e1243f7a430d33759fc51b01))
* implement 10-way parallel CI, semantic release, zero-downtime deploy, and desktop downloads ([175f94d](https://github.com/sainibhaowal/Aurelinx/commit/175f94d2257b01c5c07e06e68e9d368d85765286))
* implement Aurelinx OS code signing and 1-click certificate installer ([e373174](https://github.com/sainibhaowal/Aurelinx/commit/e37317425d53c643f117d390491e93d331d8df0e))
* update to Apache 2.0 and integrate SignPath Foundation code signing ([69c3a13](https://github.com/sainibhaowal/Aurelinx/commit/69c3a13916efa69c8b48de399483760709f939c0))

## [1.0.0] - TBD

### Added
- Core HR intelligence platform
- Candidate screening engine
- Team optimization analytics
- Real-time sentiment analysis
- Enterprise integrations (Greenhouse, Workday)
- Desktop application (Tauri)
- Web dashboard (Next.js)
- REST API (FastAPI)
- Authentication & authorization
- Audit logging
- Data export/import

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- TLS 1.3 enforcement
- Secrets management
- PII encryption
- Rate limiting
- Input validation

---

## Release Template

## [X.Y.Z] - YYYY-MM-DD

### Added
- Feature descriptions

### Changed
- Changes to existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security improvements