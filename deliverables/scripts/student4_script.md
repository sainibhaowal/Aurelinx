# Student 4 Script - Percentages, Concentration, Lean ML Scoring, Data Quality, Why Numbers Matter

## Opening (1 min)
Thank you. I will close with the meaning of all major percentages and numeric outputs: concentration, risk percentages, predictive lean score, quality score, and optimization percentages.

## Risk Concentration and Top-Risk Department (3 min)
In analytics snapshot, backend computes department risk concentration.

Process:
1. Count employees per department.
2. Count at-risk employees per department.
3. For each department, compute ratio:
   `dept_ratio = dept_at_risk / dept_total`
4. Pick highest ratio as top risk concentration.

Outputs shown:
- `topRiskDepartment`
- `topRiskDepartmentRatio` as percentage

Why this exists:
- Tells leadership where risk is most concentrated, not just overall count.

## Workforce Risk Percentage and Risk Level (2 min)
Main risk percentage:
- `atRiskPct = (at_risk / total) * 100`

Risk levels:
- `HIGH` if >= 20%
- `MEDIUM` if >= 10%
- `LOW` otherwise

Why we need it:
- Raw counts are misleading across different workforce sizes.
- Percentage normalizes risk intensity.

## Lean Predictive Scoring (`/lean/ml/score`) (4 min)
In lean module, scoring endpoint applies active model parameters:

Inputs:
- sentiment weight
- retention weight
- bias

Per employee formula:
- `risk = bias + max(0, (0.55 - sentiment)*sentiment_weight) + max(0, (0.6 - retention)*retention_weight)`
- Clamp to `[0.01, 0.99]`

Then employees are sorted by risk probability and top results are returned.

Why this is useful:
- Gives adjustable policy-driven risk scoring for enterprise workflows.
- Allows retraining/scoring lifecycle with versioned model artifacts.

## Data Validation Quality Score (3 min)
Before import, CSV quality is scored with weighted components:

- Coverage (missing required rows impact)
- Uniqueness (duplicate impact)
- Completeness (required field fill ratio)

Formula:
`quality_score = 0.45*coverage + 0.35*uniqueness + 0.20*completeness - duplicate_penalty`
Then clamped to 0..1.

Why this matters:
- Prevents poor data from contaminating predictive and analytics outputs.
- Gives measurable data readiness signal.

## Other Important Percentages in App (2 min)
1. Coverage percentage (team optimization)
- Measures how well selected team covers target skills.

2. Budget usage percentage
- `total_cost / budget_cap * 100`
- Ensures optimization decisions are financially constrained.

3. Fairness summary at-risk rate
- Department-wise at-risk rates with gap from reference group.
- Used for governance and compliance review.

## Dataset Grounding (1.5 min)
These numbers are not arbitrary.
Processed dataset includes real columns used by formulas:
- `sentiment_score`
- `is_at_risk`
- `retention_prob`

From:
- `server/datasets/processed/employees_public.csv`

So UI percentages and risk outputs are generated from actual stored records, then transformed by explicit backend formulas.

## Closing (1 min)
To conclude, our numeric system is intentional:
- clear business semantics,
- transparent formulas,
- action-oriented thresholds,
- and governance-ready outputs.

That is how Aurelius converts workforce data into measurable decisions and operational retention actions.
Thank you.
