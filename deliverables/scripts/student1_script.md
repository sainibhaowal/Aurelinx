# Student 1 Script - Vision, Problem, Architecture, Core Metric Meanings

## Opening (2 min)
Good morning/afternoon respected faculty and everyone. We are Team Aurelius, a group of four students, and today we are presenting our full-stack application, Aurelius Intelligence. Our application is an HR intelligence and decision-support platform that combines workforce data, risk analytics, AI insights, and intervention workflows.

Our presentation is divided across four speakers. I will cover the problem, vision, architecture, and the foundational meanings of key terms used throughout the app, so the remaining sections are easy to understand.

## Problem Statement (2 min)
In many organizations, HR data is fragmented across HRIS, ATS, spreadsheets, and communication systems. Because of fragmentation, decisions are delayed and mostly reactive. Leaders ask:
- Who is likely to leave?
- Which team is under pressure?
- What action should be prioritized?

Most systems only show static reports. Our goal was to build an operational intelligence platform that converts signals into action.

## Solution Overview (2 min)
Aurelius integrates:
- Authentication and secure role-aware access
- Employee and candidate intelligence views
- Sentiment and risk analytics
- Explainable attrition scoring
- Intervention lifecycle management
- Lean enterprise pipeline for data quality and predictive scoring

This is not only dashboarding; it is a decision workflow from data ingestion to intervention outcomes.

## Architecture Overview (3 min)
The system has three major layers:

1. Frontend (`client`, React + Vite)
- Views: Dashboard, Directory, Sentiment, Intelligence Center, Enterprise Ops
- Real-time sentiment screen via SSE stream
- Shared API client and auth context

2. Backend (`server`, FastAPI)
- Versioned REST APIs under `/api/v1`
- Domains: `auth`, `ai`, `enterprise`, `intelligence`, `lean`
- Centralized request validation, logging, security dependencies

3. Data layer
- SQLModel-based tables for employees, candidates, interventions, policy, model artifacts
- Processed datasets loaded for demo realism

## Key Terms: Exact Meaning (3 min)
Before deeper sections, here are the exact meanings used by the app:

### 1) Retention (`retention_prob`)
- Probability from 0.0 to 1.0 that employee is likely to stay.
- Example: `0.80` means stronger expected retention than `0.35`.
- Stored in model and used in multiple risk formulas.

### 2) At Risk (`is_at_risk`)
- Boolean flag (`true`/`false`) indicating elevated attrition concern.
- Used for risk counts, percentages, driver analysis, and intervention triggers.

### 3) Optimal
- UI label for stable state when `is_at_risk` is false.
- Not a separate database field.
- It is a human-readable status shown in cards and profile panels.

### 4) Sentiment (`sentiment_score`)
- Numeric morale signal from 0.0 to 1.0.
- Lower values indicate weaker engagement/morale.
- Used in snapshots, sentiment metrics, and risk scoring.

## Why naming is like this (final 30 sec)
We use explicit names like `retention_prob`, `is_at_risk`, `sentiment_score`, `risk_probability` so business meaning is clear across backend formulas, API responses, and frontend labels.

That completes the foundation. Next speaker will show how these values are visualized in the UI and how live sentiment metrics like current score, velocity, confidence, and intervention priority are computed.
