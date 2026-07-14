# Aurelius

![Aurelius Logo](client/public/logo.png)

> Enterprise HR intelligence platform with a Next.js workspace and a production-oriented FastAPI backend.

## What Aurelius Is

Aurelius is a full-stack HR intelligence system for modern talent, employee, and enterprise operations. It combines an interactive frontend with a secure Python backend to help teams explore workforce data, assess risk, analyze sentiment, and support operational decision-making.

This repository is organized as a monorepo with:

- `client/` for the frontend experience
- `server/` for the API, database, and worker logic
- `infra/` for deployment and Docker configuration
- `Docs/` for planning, architecture, and delivery records

## My Opinion

This is a strong project foundation. The codebase already looks beyond a demo and into real product territory because it has a clear separation between the UI, backend API, migrations, workers, and deployment assets. The biggest strength is the direction: this is not just an HR dashboard, it is an intelligence platform with automation, analytics, and operational workflows.

If you want this to feel truly production-grade, the main priorities are consistency, documentation, and deployment clarity. The core architecture is already there; the README should now match that level of seriousness.

## Key Capabilities

- Talent and employee intelligence workspace
- AI-assisted analysis and conversation flows
- Candidate and employee directory views
- Analytics snapshots and risk visibility
- Sentiment and retention signal monitoring
- Enterprise operations and intervention workflows
- Authentication and protected workspace access
- Export-ready reporting for business use

## Architecture

### Frontend

The frontend is built with Next.js and React, with a modern workspace UI under `client/`. The app includes routed views for the landing page, analytics, talent scouting, intelligence center, sentiment monitoring, settings, and enterprise operations.

### Backend

The backend is a FastAPI service under `server/` with versioned API routes, database setup, middleware, exception handling, and scheduled enterprise workflows. It includes:

- API route groups for auth, employees, candidates, analysis, chat, intelligence, enterprise, and integrations
- Database initialization and Alembic migrations
- Request ID tracking and structured error handling
- CORS and host safety controls for production deployments
- Scheduler hooks for enterprise automation

### Infrastructure

Deployment and runtime support live in `infra/`, including Dockerfiles, compose configuration, and PostgreSQL initialization scripts.

## Tech Stack

- Frontend: Next.js, React, Framer Motion, Lucide React
- Backend: FastAPI, Python, SQLAlchemy-style database layer, Alembic
- Operations: Docker, PostgreSQL, scheduled workers
- Tooling: ESLint, PostCSS, Tailwind CSS, Vite assets in the legacy client layer

## Project Structure

```text
Aurelius/
├── client/      # Next.js frontend and UI components
├── server/      # FastAPI backend, migrations, workers, tests
├── infra/       # Docker and deployment assets
├── Docs/        # Architecture notes and delivery documentation
└── package.json # Repository-level orchestration entry point
```

## Getting Started

### Prerequisites

- Node.js 18+ for the frontend and workspace scripts
- Python 3.11+ for the backend
- PostgreSQL for persistent data storage
- Docker and Docker Compose for local production-style runs

### Frontend

```bash
cd client
npm install
npm run dev
```

### Backend

```bash
cd server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Database Migrations

```bash
cd server
alembic upgrade head
```

## Environment Notes

The backend is configured through environment variables in the `server/` area. Review `server/.env.example` before running locally and set values for your database, frontend origin, and any provider or integration settings.

## API

The FastAPI application exposes documentation endpoints at:

- `/api/v1/docs`
- `/api/v1/redoc`
- `/api/v1/openapi.json`

The service also exposes health and root endpoints for deployment checks.

## Deployment

Use the Docker assets in `infra/` when you want a repeatable production-style build. That folder contains the frontend and backend Dockerfiles, compose configuration, and PostgreSQL bootstrap SQL.

## Files Worth Reading First

- `server/app/main.py` for the API bootstrap and middleware
- `client/src/App.jsx` for the main application shell and routes
- `client/src/components/` for the UI views
- `server/app/api/v1/` for the backend route surface
- `infra/docker-compose.prod.yml` for deployment wiring

## Why This Project Stands Out

Aurelius is not a single-purpose dashboard. It is shaped like an enterprise platform: frontend workspace, backend intelligence layer, migrations, workers, deployment assets, and documentation. That makes it a solid base for a serious product if you keep tightening the data model, deployment story, and API contracts.

## Logo

The brand mark used in this README comes from `client/public/logo.png`.
