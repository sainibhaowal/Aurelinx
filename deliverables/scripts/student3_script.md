# Student 3 Script - Predictive Risk Logic, Explainability, Interventions, Confidence

## Opening (1 min)
Thank you. I will cover how predictive risk is calculated, what confidence score means in enterprise outputs, and how intervention priority and recommended actions are generated.

## Explainable Attrition Endpoint (2 min)
Our key enterprise endpoint is:
- `GET /api/v1/enterprise/attrition/explain`

It does not return only a score. It returns:
- `risk_probability`
- `confidence`
- driver list with factor, contribution, and evidence
- recommended actions

So the system is transparent and explainable.

## Driver Construction: Why someone is high risk (3 min)
In `_risk_components(employee)` backend builds drivers from real fields:

1. Low morale trend
- Trigger: `sentiment_score < 0.45`
- Contribution proportional to gap below threshold

2. Retention probability pressure
- Trigger: `retention_prob < 0.55`
- Contribution proportional to gap below threshold

3. Rule-based risk flag
- Trigger: `is_at_risk == true`
- Fixed contribution (`0.26`)

If no critical signal exists, a small neutral driver is added.

## Risk Probability Formula (4 min)
Final predictive score is in `_risk_probability`:

- Start with base: `0.12`
- Add morale pressure: `max(0, (0.55 - sentiment)*0.9)`
- Add retention pressure: `max(0, (0.60 - retention)*0.8)`
- Add flag penalty: `+0.2` if `is_at_risk`
- Add driver blend: `+ min(0.18, sum(top2_contributions)*0.35)`
- Clamp to `[0.01, 0.99]`

Meaning:
- low sentiment and low retention jointly push risk upward
- rule-based flag increases urgency
- explainable driver contributions are integrated, not hidden

## What does Confidence mean here? (1 min)
In this enterprise explain endpoint, confidence is currently policy-style reliability tagging:
- `0.84` when retention probability exists
- `0.72` when retention probability is missing

So confidence reflects input completeness, not deep model uncertainty.

## Intervention Priority Meaning (1.5 min)
Intervention object has priority levels:
- `low`, `medium`, `high`, `critical`

These control operational urgency and governance.
If priority is `high` or `critical`, non-admin users are blocked from creation.
This is enforced in backend create endpoint.

## Recommended Actions Logic (1.5 min)
Actions are tied directly to risk threshold:
- `risk >= 0.6`: urgent retention conversation + compensation review
- `risk >= 0.4`: growth-path and mobility review
- else: routine monitoring

So risk score maps to practical HR actions.

## Dynamic Ranking (30 sec)
Employees are scored, then sorted descending by `risk_probability`.
Top-N list is the active triage list for leadership.
Ranking changes dynamically as sentiment, retention, and flags change.

Next speaker will explain percentage metrics like concentration, top-risk department ratio, quality score, and lean ML scoring pipeline.
