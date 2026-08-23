# Aurelinx Development Makefile
# Usage: make <target>

.PHONY: help install dev test lint format clean build docker-up docker-down

# Default target
.DEFAULT_GOAL := help

# Colors
YELLOW := \033[33m
GREEN := \033[32m
RED := \033[31m
BLUE := \033[34m
RESET := \033[0m

help: ## Show this help message
	@echo "$(BLUE)Aurelinx Development Commands$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "%-30s %s\n", "Target", "Description"} /^[a-zA-Z_-]+:.*?##/ { printf "$(GREEN)%-30s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# =============================================================================
# Installation
# =============================================================================

install: install-backend install-frontend install-desktop ## Install all dependencies

install-backend: ## Install Python backend dependencies
	@echo "$(YELLOW)Installing backend dependencies...$(RESET)"
	cd server && python -m venv venv && source venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt

install-frontend: ## Install frontend dependencies
	@echo "$(YELLOW)Installing frontend dependencies...$(RESET)"
	cd client && pnpm install

install-desktop: ## Install desktop app dependencies
	@echo "$(YELLOW)Installing desktop dependencies...$(RESET)"
	cd desktop && pnpm install
	cd desktop/src-tauri && cargo fetch

install-hooks: ## Install git hooks
	@echo "$(YELLOW)Installing git hooks...$(RESET)"
	cd server && pre-commit install
	cd client && pnpm exec husky install

# =============================================================================
# Development
# =============================================================================

dev: ## Start all development servers
	@echo "$(YELLOW)Starting development environment...$(RESET)"
	docker compose -f docker-compose.dev.yml up -d
	@echo "$(GREEN)Services started. Run 'make dev-backend', 'make dev-frontend', 'make dev-desktop' in separate terminals.$(RESET)"

dev-backend: ## Start backend development server
	cd server && source venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend: ## Start frontend development server
	cd client && pnpm dev

dev-desktop: ## Start desktop development
	cd desktop/src-tauri && cargo tauri dev

# =============================================================================
# Testing
# =============================================================================

test: test-backend test-frontend test-desktop ## Run all tests

test-backend: ## Run backend tests
	@echo "$(YELLOW)Running backend tests...$(RESET)"
	cd server && source venv/bin/activate && pytest -v --cov=app --cov-report=term-missing

test-backend-watch: ## Run backend tests in watch mode
	cd server && source venv/bin/activate && pytest-watch

test-frontend: ## Run frontend tests
	@echo "$(YELLOW)Running frontend tests...$(RESET)"
	cd client && pnpm test

test-frontend-watch: ## Run frontend tests in watch mode
	cd client && pnpm test:watch

test-desktop: ## Run desktop tests
	@echo "$(YELLOW)Running desktop tests...$(RESET)"
	cd desktop/src-tauri && cargo test

test-integration: ## Run integration tests
	@echo "$(YELLOW)Running integration tests...$(RESET)"
	cd server && source venv/bin/activate && pytest tests/ -v -k "integration"

# =============================================================================
# Linting & Formatting
# =============================================================================

lint: lint-backend lint-frontend lint-desktop ## Run all linters

lint-backend: ## Lint backend code
	@echo "$(YELLOW)Linting backend...$(RESET)"
	cd server && source venv/bin/activate && ruff check . && mypy app/

lint-frontend: ## Lint frontend code
	@echo "$(YELLOW)Linting frontend...$(RESET)"
	cd client && pnpm lint

lint-desktop: ## Lint desktop code
	@echo "$(YELLOW)Linting desktop...$(RESET)"
	cd desktop/src-tauri && cargo clippy -- -D warnings

format: format-backend format-frontend format-desktop ## Format all code

format-backend: ## Format backend code
	@echo "$(YELLOW)Formatting backend...$(RESET)"
	cd server && source venv/bin/activate && ruff format . && ruff check --fix .

format-frontend: ## Format frontend code
	@echo "$(YELLOW)Formatting frontend...$(RESET)"
	cd client && pnpm format

format-desktop: ## Format desktop code
	@echo "$(YELLOW)Formatting desktop...$(RESET)"
	cd desktop/src-tauri && cargo fmt --all

# =============================================================================
# Database
# =============================================================================

db-upgrade: ## Run database migrations
	cd server && source venv/bin/activate && alembic upgrade head

db-downgrade: ## Rollback last migration
	cd server && source venv/bin/activate && alembic downgrade -1

db-revision: ## Create new migration (usage: make db-revision MSG="description")
	cd server && source venv/bin/activate && alembic revision --autogenerate -m "$(MSG)"

db-reset: ## Reset database (WARNING: destroys data)
	@echo "$(RED)WARNING: This will destroy all data!$(RESET)"
	@read -p "Are you sure? [y/N] " -n 1 -r; echo; if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		cd server && source venv/bin/activate && alembic downgrade base && alembic upgrade head; \
	fi

db-seed: ## Seed database with sample data
	cd server && source venv/bin/activate && python -m app.core.seed_data

# =============================================================================
# Building
# =============================================================================

build: build-backend build-frontend build-desktop ## Build all components

build-backend: ## Build backend (verify imports)
	@echo "$(YELLOW)Verifying backend...$(RESET)"
	cd server && source venv/bin/activate && python -m py_compile app/main.py

build-frontend: ## Build frontend for production
	@echo "$(YELLOW)Building frontend...$(RESET)"
	cd client && pnpm build

build-desktop: ## Build desktop app
	@echo "$(YELLOW)Building desktop app...$(RESET)"
	cd desktop/src-tauri && cargo tauri build

# =============================================================================
# Docker
# =============================================================================

docker-up: ## Start all services with Docker Compose
	docker compose up -d --build

docker-down: ## Stop all Docker services
	docker compose down -v

docker-logs: ## View Docker logs
	docker compose logs -f

docker-ps: ## List running containers
	docker compose ps

docker-clean: ## Clean Docker resources
	docker compose down -v --rmi all --remove-orphans
	docker system prune -f

# =============================================================================
# Quality Gates
# =============================================================================

check: lint test ## Run all quality checks (CI equivalent)

pre-commit: ## Run pre-commit hooks
	cd server && source venv/bin/activate && pre-commit run --all-files
	cd client && pnpm exec lint-staged

# =============================================================================
# Release
# =============================================================================

version-patch: ## Bump patch version
	@node scripts/version-updater.js patch

version-minor: ## Bump minor version
	@node scripts/version-updater.js minor

version-major: ## Bump major version
	@node scripts/version-updater.js major

changelog: ## Generate changelog
	@echo "$(YELLOW)Generating changelog...$(RESET)"
	@npx conventional-changelog -p angular -i CHANGELOG.md -s -r 0

# =============================================================================
# Cleanup
# =============================================================================

clean: clean-backend clean-frontend clean-desktop ## Clean all build artifacts

clean-backend: ## Clean backend artifacts
	@echo "$(YELLOW)Cleaning backend...$(RESET)"
	cd server && find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	cd server && find . -type f -name "*.pyc" -delete
	cd server && find . -type f -name "*.pyo" -delete
	cd server && rm -rf .pytest_cache .coverage htmlcov .mypy_cache .ruff_cache

clean-frontend: ## Clean frontend artifacts
	@echo "$(YELLOW)Cleaning frontend...$(RESET)"
	cd client && rm -rf .next out dist node_modules/.cache

clean-desktop: ## Clean desktop artifacts
	@echo "$(YELLOW)Cleaning desktop...$(RESET)"
	cd desktop/src-tauri && cargo clean

clean-all: clean docker-clean ## Clean everything including Docker
	@echo "$(GREEN)Complete cleanup done$(RESET)"

# =============================================================================
# Utilities
# =============================================================================

logs-backend: ## View backend logs
	docker compose logs -f backend

logs-frontend: ## View frontend logs
	docker compose logs -f frontend

logs-db: ## View database logs
	docker compose logs -f postgres

shell-backend: ## Open backend shell
	docker compose exec backend bash

shell-db: ## Open database shell
	docker compose exec postgres psql -U aurelinx -d aurelinx

shell-redis: ## Open Redis shell
	docker compose exec redis redis-cli

# =============================================================================
# Documentation
# =============================================================================

docs-serve: ## Serve documentation locally
	@echo "$(YELLOW)Starting docs server...$(RESET)"
	cd docs && python -m http.server 8080

docs-build: ## Build documentation
	@echo "$(YELLOW)Building documentation...$(RESET)"
	# Add your doc build command here

# =============================================================================
# Security
# =============================================================================

security-audit: ## Run security audits
	@echo "$(YELLOW)Running security audits...$(RESET)"
	cd server && source venv/bin/activate && pip-audit
	cd client && pnpm audit
	cd desktop/src-tauri && cargo audit

security-scan: ## Run SAST scans
	@echo "$(YELLOW)Running SAST scans...$(RESET)"
	# Add bandit, semgrep, etc.