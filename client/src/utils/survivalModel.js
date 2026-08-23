// Copyright 2026 Ravinder Singh
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Cox Proportional Hazards survival engine — client mirror.
 *
 * Pure-JS 1:1 mirror of the server model in
 * server/app/api/v1/intelligence.py (section "COX PROPORTIONAL HAZARDS
 * SURVIVAL ENGINE"). Used by the Flight Risk Mitigation Sandbox to
 * recompute hazard ratios, survival curves, CI bands and SHAP
 * waterfalls live as sliders move, with exact parity to the backend.
 *
 * IMPORTANT: constants below MUST stay in lockstep with the backend.
 */

export const BASELINE_HAZARD_BUCKETS = [
  [0.0, 6.0, 0.008], // probation / onboarding
  [6.0, 12.0, 0.013], // first role-fit wave
  [12.0, 18.0, 0.017], // 12-18 month peak
  [18.0, 24.0, 0.014], // post-peak fade
  [24.0, 36.0, 0.011], // 2-3 year career-climber wave
  [36.0, 48.0, 0.008], // settled contributors
  [48.0, 60.0, 0.006], // tenured professionals
  [60.0, 240.0, 0.005], // long-tenure stable cohort
];

export const COX_COEFFICIENTS = {
  morale: -1.5,
  salary: -1.0,
  risk_flag: 0.8,
  skills: 0.06,
  skill_level: -0.25,
  match: -1.2,
  experience: 0.08,
  companies: 0.12,
};

export const HEALTHY_SKILL_BASELINE = 4.0;
export const EXPERIENCE_INFLECTION_YEARS = 10.0;
export const COMPANIES_INFLECTION = 3.0;
export const MATCH_REFERENCE = 0.6;
export const SKILL_LEVEL_REFERENCE = 3.0;
export const MAX_LOG_HAZARD_RATIO = 1.79;
export const MIN_LOG_HAZARD_RATIO = -1.61;
export const CI_SE_BASE = 0.08;
export const CI_SE_GROWTH = 0.05;
export const FORECAST_HORIZON_MONTHS = 12;

export const COVARIATE_LABELS = {
  morale: "Organizational Morale Index",
  salary: "Salary Compression",
  risk_flag: "Historical Risk Trigger",
  skills: "Skill Overload",
  skill_level: "Proficiency Depth",
  match: "Role-Skill Alignment",
  experience: "Experience Maturity",
  companies: "Tenure Fragmentation",
  department: "Department Base Rate",
};

export function baselineHazard(tenureMonths) {
  for (const [lo, hi, rate] of BASELINE_HAZARD_BUCKETS) {
    if (tenureMonths >= lo && tenureMonths < hi) return rate;
  }
  return BASELINE_HAZARD_BUCKETS[BASELINE_HAZARD_BUCKETS.length - 1][2];
}

/**
 * Build the employee covariate state used by the model.
 * `levers` from the backend response carries the recorded values.
 */
export function buildCovariates(levers, overrides = {}) {
  const base = {
    morale: levers.morale ?? 0.5,
    salary: levers.salary ?? null,
    salary_log_ratio: levers.salary_log_ratio ?? 0.0,
    dept_median_salary: levers.dept_median_salary ?? 0,
    skills_count: levers.skills_count ?? 0,
    skill_level_avg: levers.skill_level_avg ?? 2.0,
    match_score: levers.match_score ?? 0.5,
    experience_years: levers.experience_years ?? 0,
    companies_count: levers.companies_count ?? 0,
    risk_flag: levers.risk_flag ?? false,
    tenure_months: levers.tenure_months ?? 12,
    seniority_scale: levers.seniority_scale ?? 1.0,
    dept_offset: levers.dept_offset ?? 0.0,
  };
  const out = { ...base };

  if (overrides.morale != null) {
    out.morale = Math.max(0.0, Math.min(1.0, overrides.morale));
  }
  if (overrides.salaryIncrease != null && base.salary) {
    out.salary = base.salary * (1 + overrides.salaryIncrease);
    if (base.dept_median_salary > 0) {
      out.salary_log_ratio = Math.log(
        Math.max(1.0, out.salary / base.dept_median_salary),
      );
    }
  }
  if (overrides.skillsCount != null) {
    out.skills_count = Math.max(0, Math.round(overrides.skillsCount));
  }
  if (overrides.riskFlag != null) out.risk_flag = Boolean(overrides.riskFlag);
  return out;
}

/**
 * Centered log-hazard contributions β(x - x̄) per covariate.
 * `means` is the population means block returned by the backend.
 */
export function logHazardContributions(covs, means) {
  const centered = (value, mean) => value - mean;
  const overloaded = (count) => Math.max(0.0, count - HEALTHY_SKILL_BASELINE);

  const contribs = {
    morale: COX_COEFFICIENTS.morale * centered(covs.morale, means.morale),
    salary:
      COX_COEFFICIENTS.salary *
      centered(covs.salary_log_ratio, means.salary_log_ratio),
    risk_flag:
      COX_COEFFICIENTS.risk_flag *
      centered(Number(covs.risk_flag), means.risk_flag),
    skills:
      COX_COEFFICIENTS.skills *
      centered(overloaded(covs.skills_count), overloaded(means.skills_count)),
    skill_level:
      COX_COEFFICIENTS.skill_level *
      centered(
        covs.skill_level_avg - SKILL_LEVEL_REFERENCE,
        means.skill_level_avg - SKILL_LEVEL_REFERENCE,
      ),
    match:
      COX_COEFFICIENTS.match *
      centered(
        covs.match_score - MATCH_REFERENCE,
        means.match_score - MATCH_REFERENCE,
      ),
    experience:
      COX_COEFFICIENTS.experience *
      centered(
        covs.experience_years - EXPERIENCE_INFLECTION_YEARS,
        means.experience_years - EXPERIENCE_INFLECTION_YEARS,
      ),
    companies:
      COX_COEFFICIENTS.companies *
      centered(
        covs.companies_count - COMPANIES_INFLECTION,
        means.companies_count - COMPANIES_INFLECTION,
      ),
    department: centered(covs.dept_offset, means.dept_offset),
  };

  let total = Object.values(contribs).reduce((a, b) => a + b, 0);
  if (total > MAX_LOG_HAZARD_RATIO || total < MIN_LOG_HAZARD_RATIO) {
    // Absorb saturation remainder into the dominant driver (backend parity)
    const clamped = Math.max(
      MIN_LOG_HAZARD_RATIO,
      Math.min(MAX_LOG_HAZARD_RATIO, total),
    );
    let dominant = null;
    let maxAbs = -Infinity;
    for (const key of Object.keys(contribs)) {
      if (Math.abs(contribs[key]) > maxAbs) {
        maxAbs = Math.abs(contribs[key]);
        dominant = key;
      }
    }
    contribs[dominant] += clamped - total;
    total = clamped;
  }
  return { contribs, total };
}

/**
 * Full survival recomputation for the sandbox.
 * Returns { hazardRatio, currentHazard, forecast[], medianResidualTenure,
 *           attr12, waterfall[] }.
 */
export function computeSurvival(
  covs,
  means,
  horizon = FORECAST_HORIZON_MONTHS,
) {
  const { contribs, total } = logHazardContributions(covs, means);
  const hazardRatio = Math.exp(total);
  const deptHr = Math.exp(covs.dept_offset);

  let cumulativeHazard = 0.0;
  const forecast = [];
  for (let m = 1; m <= horizon; m++) {
    const projectedT = covs.tenure_months + m;
    const h_t =
      baselineHazard(projectedT) * covs.seniority_scale * deptHr * hazardRatio;
    cumulativeHazard += h_t;
    const survival = Math.exp(-cumulativeHazard);

    const seLogH = CI_SE_BASE + CI_SE_GROWTH * Math.log1p(cumulativeHazard);
    const hLo = cumulativeHazard * Math.exp(-1.96 * seLogH);
    const hHi = cumulativeHazard * Math.exp(1.96 * seLogH);

    forecast.push({
      month: m,
      projected_tenure: Number(projectedT.toFixed(1)),
      survival_probability: survival,
      attrition_probability: 1 - survival,
      hazard: h_t,
      cumulative_hazard: cumulativeHazard,
      ci_low: Math.max(0, Math.exp(-hHi)),
      ci_high: Math.min(1, Math.exp(-hLo)),
    });
  }

  let medianResidualTenure = null;
  for (let m = 1; m <= horizon; m++) {
    const cur = forecast[m - 1];
    if (cur.survival_probability <= 0.5) {
      const prevS = m === 1 ? 1.0 : forecast[m - 2].survival_probability;
      const prevT =
        m === 1 ? covs.tenure_months : forecast[m - 2].projected_tenure;
      if (prevS > 0.5) {
        const frac = (prevS - 0.5) / (prevS - cur.survival_probability);
        medianResidualTenure = prevT + frac * (cur.projected_tenure - prevT);
      }
      break;
    }
  }

  // SHAP waterfall (sorted by |impact|, ratios multiply to HR)
  const waterfall = Object.keys(contribs).map((key) => {
    const ratio = Math.exp(contribs[key]);
    return {
      factor: key,
      label: COVARIATE_LABELS[key] || key,
      impact_percentage: (ratio - 1.0) * 100,
      impact_ratio: ratio,
      direction: contribs[key] > 0 ? "risky" : "protective",
    };
  });
  waterfall.sort(
    (a, b) => Math.abs(b.impact_percentage) - Math.abs(a.impact_percentage),
  );

  return {
    hazardRatio,
    currentHazard:
      baselineHazard(covs.tenure_months) *
      covs.seniority_scale *
      deptHr *
      hazardRatio,
    forecast,
    medianResidualTenure,
    attr12: forecast[horizon - 1].attrition_probability,
    waterfall,
    logHazardTotal: total,
  };
}

/**
 * Risk tier from 12-month attrition probability (backend parity).
 * The percentile is reported separately as Risk Percentile.
 */
export function riskTier(attr12) {
  if (attr12 < 0.05) return "Low";
  if (attr12 < 0.12) return "Moderate";
  if (attr12 < 0.2) return "Elevated";
  if (attr12 < 0.35) return "High";
  return "Critical";
}

export function tierColor(tier) {
  switch (tier) {
    case "Low":
      return "#34d399";
    case "Moderate":
      return "#fbbf24";
    case "Elevated":
      return "#fb923c";
    case "High":
      return "#f43f5e";
    case "Critical":
      return "#e11d48";
    default:
      return "#94a3b8";
  }
}

export function tierBg(tier) {
  switch (tier) {
    case "Low":
      return "rgba(52,211,153,0.12)";
    case "Moderate":
      return "rgba(251,191,36,0.12)";
    case "Elevated":
      return "rgba(251,146,60,0.12)";
    case "High":
      return "rgba(244,63,94,0.14)";
    case "Critical":
      return "rgba(225,29,72,0.18)";
    default:
      return "rgba(148,163,184,0.1)";
  }
}
