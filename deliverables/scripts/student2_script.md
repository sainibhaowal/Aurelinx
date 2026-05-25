# Student 2 Script - Frontend Walkthrough, Sentiment Metrics, Priority and Dynamic Ranking

## Opening (1 min)
Thank you. I will explain the frontend flow and the real-time sentiment analytics screen, including exactly what Current Score, Velocity, Confidence, Intervention Priority, and Dynamic Ranking mean.

## Frontend Flow (3 min)
The frontend is built in React with modular components and a centralized API client.

User journey:
1. User opens app and enters auth flow.
2. Auth context verifies session using protected endpoint.
3. User enters workspace and can navigate to Dashboard, Directory, Sentiment, Intelligence, Enterprise Ops.
4. Components consume shared API services, ensuring consistent tokens, error handling, and response parsing.

The Sentiment screen (`SentimentPulseView`) subscribes to:
- `GET /api/v1/ai/sentiment/stream`
using Server-Sent Events for live updates.

## What the Sentiment Table Means (5 min)
The table shows four indicators generated in backend function `_build_sentiment_metrics`.

### A) Organizational Morale (Current Score)
- Formula: average of all employee `sentiment_score` values.
- Range is 0 to 1.
- Represents overall workforce morale level.

### B) Talent Density (Current Score)
- Computed as `1 - largest_department_ratio`.
- If one department dominates workforce share, density drops.
- Helps track concentration and distribution balance.

### C) Burnout Risk (Current Score)
- Formula: `(at_risk_ratio * 0.7) + ((1 - avg_sentiment) * 0.3)`.
- Increases when at-risk ratio rises and morale falls.

### D) Leadership Trust (Current Score)
- Formula: `(avg_retention * 0.6) + (avg_sentiment * 0.4)`.
- Uses retention and morale together as trust proxy.

## Velocity Meaning (1 min)
Velocity is short-term directional change:
- `velocity = current_score - previous_score`
- Previous score is remembered from prior stream snapshot.

Interpretation:
- Positive velocity = improvement
- Negative velocity = decline
- Near zero = stable

## Confidence Meaning (1 min)
Confidence is currently a sample-size-based confidence proxy:
- `sample_confidence = min(0.99, 0.72 + total_employees/200)`
- Then slight per-metric offset is applied.

So larger workforce samples increase confidence, capped at 99%.

## Intervention Priority and Dynamic Ranking (1.5 min)
The sentiment stream returns priority level from at-risk percentage:
- `>= 20%` -> `Level 3` (risk)
- `>= 10%` -> `Level 2` (warning)
- else -> `Level 1` (safe)

This is called dynamic because each new stream cycle re-evaluates risk in near real-time.

## At-Risk Percentage and Why It Matters (30 sec)
- Formula: `(at_risk_count / total_employees) * 100`
- Gives normalized risk load, so teams of different sizes are comparable.

That completes the frontend sentiment interpretation. Next speaker will explain predictive risk, explainable drivers, and intervention logic in enterprise APIs.
