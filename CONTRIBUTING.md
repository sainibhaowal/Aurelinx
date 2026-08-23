# Contributing to Aurelinx

Thank you for contributing to **Aurelinx** — the open-source HR intelligence platform for talent operations, workforce analysis, and decision support.

## Quick Links
- **Architecture**: See [ARCHITECTURE.md](ARCHITECTURE.md)
- **API Reference**: `/api/v1/docs` (running locally) or [OpenAPI Spec](server/app/main.py)
- **Roadmap**: [ROADMAP.md](ROADMAP.md)
- **Discussions**: [GitHub Discussions](https://github.com/ravindersingh/Aurelinx/discussions)

---

## Getting Started

### Prerequisites
| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | Backend (FastAPI, SQLAlchemy, Alembic) |
| Node.js | 18+ | Frontend (Next.js 15, React 19) |
| Rust | 1.75+ | Desktop (Tauri 2.x) |
| PostgreSQL | 15+ | Primary database |
| Redis | 7+ | Caching, Celery broker |
| Qdrant | 1.8+ | Vector search for embeddings |
| Docker | 24+ | Containerized services |

### One-Command Setup
```bash
# Clone and enter
git clone https://github.com/ravindersingh/Aurelinx.git
cd Aurelinx

# Install all deps + start dev stack
make install && make dev
```

### Manual Setup (per component)

**Backend (`server/`)**
```bash
cd server
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # Configure DATABASE_URL, REDIS_URL, JWT_SECRET, etc.
alembic upgrade head
python -m app.core.seed_data  # Optional: sample data
uvicorn app.main:app --reload --port 8000
```

**Frontend (`client/`)**
```bash
cd client
pnpm install
cp .env.example .env.local    # Configure NEXT_PUBLIC_API_URL
pnpm dev                      # Runs on http://localhost:3001
```

**Desktop (`desktop/`)**
```bash
cd desktop
pnpm install
cd src-tauri
cargo tauri dev               # Hot-reload desktop app
```

---

## How to Contribute

### 1. Reporting Bugs
Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.yml). Include:
- **Minimal reproduction** (code, API calls, UI steps)
- **Environment**: `make version` output or `docker compose ps`
- **Logs**: `docker compose logs backend` or backend console output

### 2. Proposing Features
Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.yml). We prioritize:
- Alignment with [ROADMAP.md](ROADMAP.md)
- HR/talent domain value (screening, analytics, sentiment, integrations)
- Extensibility (connectors, plugins, custom models)

### 3. Pull Requests

#### Branch Naming
| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/<short-desc>` | `feat/candidate-skills-gap-analysis` |
| Fix | `fix/<short-desc>` | `fix/sentiment-analysis-null-handling` |
| Docs | `docs/<short-desc>` | `docs/api-authentication-guide` |
| Refactor | `refactor/<area>` | `refactor/screening-engine-modular` |
| Chore | `chore/<task>` | `chore/update-dependencies-q3` |

#### Commit Messages (Conventional Commits)
```bash
feat(screening): add skills-gap analysis endpoint
fix(api): handle null sentiment scores in team analytics
docs(architecture): add data-flow diagram for chat agent
refactor(core): extract connector base class
test(integration): add Greenhouse webhook idempotency test
```

#### PR Checklist (enforced by template)
- [ ] `make check` passes (lint + test)
- [ ] New tests for new functionality
- [ ] Database migration if schema changed (`alembic revision --autogenerate`)
- [ ] Updated docs: README, docstrings, CHANGELOG.md
- [ ] No secrets in code (checked by `trufflehog` in CI)
- [ ] Breaking changes documented in PR description

---

## Coding Standards (Aurelinx-Specific)

### Backend (Python/FastAPI)
```python
# File: server/app/services/screening_engine.py
# 1. Module docstring (what, why, key classes)
"""Candidate screening engine with ML-powered scoring and explainability."""

# 2. Imports: stdlib → third-party → local
from datetime import datetime
from typing import Annotated

from fastapi import Depends
from sqlmodel import Session, select

from app.core.config import settings
from app.models.database import Candidate, ScreeningResult
from app.schemas.talent import ScreeningRequest

# 3. Type hints required for all public functions
async def screen_candidate(
    request: ScreeningRequest,
    db: Annotated[Session, Depends(get_db)],
) -> ScreeningResult:
    """Screen a candidate against job requirements.
    
    Args:
        request: Screening parameters including candidate_id, job_id, weights.
        db: Database session.
    
    Returns:
        ScreeningResult with score, breakdown, and SHAP explanations.
    
    Raises:
        CandidateNotFound: If candidate_id doesn't exist.
        JobNotFound: If job_id doesn't exist.
    """
    ...
```

**Tools**: `ruff` (lint/format), `mypy` (type check), `pytest` (test), `bandit` (security)

### Frontend (Next.js/React/TypeScript)
```tsx
// File: client/src/components/TalentScoutView.tsx
// 1. Named exports, TypeScript interfaces
interface TalentScoutViewProps {
  initialFilters?: CandidateFilters;
  onCandidateSelect: (candidate: Candidate) => void;
}

// 2. Component with JSDoc
/**
 * Talent Scout - Candidate discovery and screening workspace.
 * Integrates with ScreeningEngine API for real-time scoring.
 */
export function TalentScoutView({ initialFilters, onCandidateSelect }: TalentScoutViewProps) {
  // 3. Custom hooks for data fetching
  const { data: candidates, mutate } = useSWR<Candidate[]>('/api/v1/candidates', fetcher);
  
  // 4. Event handlers prefixed with handle
  const handleScreen = async (candidateId: string) => {
    const result = await api.post('/api/v1/analysis/screen', { candidate_id: candidateId });
    mutate(); // Revalidate
  };
  
  return (
    // 5. Semantic HTML, Tailwind utilities, Framer Motion for animations
  );
}
```

**Tools**: `eslint` + `prettier`, `typescript`, `jest` + `react-testing-library`

### Desktop (Rust/Tauri)
```rust
// File: desktop/src-tauri/src/commands/screening.rs
// 1. Module docs
//! Tauri commands for candidate screening operations.

// 2. Public functions with doc comments
/// Screen a candidate by ID using the backend API.
/// 
/// # Errors
/// Returns `Error::Api` if backend request fails.
#[tauri::command]
pub async fn screen_candidate(candidate_id: String) -> Result<ScreeningResult, Error> {
    let client = reqwest::Client::new();
    let response = client
        .post(&format!("{}/api/v1/analysis/screen", get_api_base()))
        .json(&serde_json::json!({ "candidate_id": candidate_id }))
        .send()
        .await?
        .json()
        .await?;
    Ok(response)
}
```

**Tools**: `cargo fmt`, `cargo clippy`, `cargo test`, `cargo audit`

### Database Migrations (Alembic)
```python
# File: server/alembic/versions/xxx_add_screening_explanations.py
"""Add SHAP explanation columns to screening_results.

Revision ID: xxx
Revises: yyy
Create Date: 2026-08-23

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# Always include upgrade/downgrade
def upgrade() -> None:
    op.add_column(
        'screening_results',
        sa.Column('shap_values', postgresql.JSONB, nullable=True),
    )
    op.add_column(
        'screening_results',
        sa.Column('feature_importance', postgresql.JSONB, nullable=True),
    )

def downgrade() -> None:
    op.drop_column('screening_results', 'shap_values')
    op.drop_column('screening_results', 'feature_importance')
```

---

## Project-Specific Guidelines

### Adding a New HR Connector (Greenhouse, Workday, Lever, etc.)
1. **Create connector** in `server/app/services/connectors/<name>.py` extending `BaseConnector`
2. **Register** in `server/app/services/connectors/factory.py`
3. **Add config** to `server/app/core/config.py` (pydantic settings)
4. **Write tests** in `server/tests/connectors/test_<name>.py` (mock external API)
5. **Document** in `docs/integrations/<name>.md`

### Extending the Chat Agent (7-Tool Architecture)
Tools live in `server/app/agents/tools/`:
| Tool | File | Purpose |
|------|------|---------|
| `search` | `search_tool.py` | Multi-entity search |
| `read` | `read_tool.py` | Single record read |
| `modify` | `modify_tool.py` | Update fields (admin) |
| `write` | `write_tool.py` | Create records (admin) |
| `delete` | `delete_tool.py` | Deletion with approval |
| `analyse` | `analyse_tool.py` | Structured analysis |
| `observe` | `observe_tool.py` | Pattern detection |

To add a tool: implement `BaseTool` interface, register in `manager_agent.py`, update permissions matrix.

### Adding ML Models / Analytics
1. **Model code**: `server/app/ml/models/<name>.py`
2. **Training script**: `server/scripts/train_<name>.py` (logs to MLflow)
3. **Inference endpoint**: `server/app/api/v1/analysis.py`
4. **Versioning**: Store model artifacts in `server/ml/models/` with semantic version

---

## Testing Requirements

### Backend
```bash
# Unit tests (fast, no external deps)
pytest server/tests/unit -v

# Integration tests (requires Postgres, Redis)
pytest server/tests/integration -v

# Contract tests (API schema validation)
pytest server/tests/contract -v

# Full suite with coverage
make test-backend  # Runs all + coverage report
```

### Frontend
```bash
# Unit + component tests
pnpm test

# E2E tests (Playwright)
pnpm test:e2e

# Visual regression (Chromatic)
pnpm test:visual
```

### Desktop
```bash
cargo test                    # Unit tests
cargo test --test e2e         # Tauri integration tests
```

---

## Release Process

### Versioning
We follow [SemVer](https://semver.org/): `MAJOR.MINOR.PATCH`
- **Patch**: Bug fixes, security, dependency updates
- **Minor**: New features, new connectors, new analytics (backward compatible)
- **Major**: Breaking API changes, schema migrations, architecture shifts

### Release Checklist (maintainers)
1. `make version-patch|minor|major` → updates `pyproject.toml`, `package.json`, `Cargo.toml`
2. `make changelog` → generates `CHANGELOG.md` from conventional commits
3. Create release branch: `release/vX.Y.Z`
4. CI runs full test matrix + security scans
5. BDFL approves, tags `vX.Y.Z`
6. GitHub Actions builds/publishes:
   - Docker images (`ghcr.io/ravindersingh/aurelinx/backend`, `frontend`)
   - Desktop installers (`.exe`, `.deb`, `.AppImage`)
   - PyPI package (if applicable)

---

## Community & Support

- **Questions**: [GitHub Discussions](https://github.com/ravindersingh/Aurelinx/discussions)
- **Bugs**: [Issue Tracker](https://github.com/ravindersingh/Aurelinx/issues)
- **Security**: `security@aurelinx.com` (see [SECURITY.md](SECURITY.md))
- **Enterprise**: `enterprise@aurelinx.com`

---

## Recognition

Contributors are recognized in:
- `CHANGELOG.md` (per release)
- `AUTHORS.md` (cumulative)
- Release notes (GitHub Releases)
- Annual "Contributor Spotlight" blog post

---

## License

By contributing, you agree your contributions are licensed under **Apache 2.0** (see [LICENSE](LICENSE)).