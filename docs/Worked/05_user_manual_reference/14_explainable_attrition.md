# Explainable Attrition

Data Ops & Enterprise ➔ Risk & Interventions Engine

## 01. Attrition Evidence and Readiness

The uploaded-data survival view estimates a cohort Kaplan-Meier curve when employee durations, departure outcomes, and active censoring records are usable. It does not calculate individual employee forecasts or SHAP explanations.

### Required fields

- Employment start date for each employee observation.
- Departure date and departure flag for a known departure.
- Observation/censor date and a false departure flag for an active employee.
- Positive duration and an explicit departure flag can be used when dates are unavailable.
The offline sample contains synthetic calendar dates and benchmark-linked outcome labels. The report is a demonstration of cohort survival calculations, not a forecast about a real company or an employee. Review eligible, excluded, departure, and censored counts in the result before interpretation.
