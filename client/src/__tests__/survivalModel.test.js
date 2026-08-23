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

import { describe, it, expect } from "vitest";
import {
  baselineHazard,
  buildCovariates,
  logHazardContributions,
  computeSurvival,
  riskTier,
  tierColor,
  tierBg,
} from "../utils/survivalModel.js";

describe("Survival Model — Client Math Engine", () => {
  const sampleMeans = {
    morale: 0.7,
    salary_log_ratio: 0.0,
    risk_flag: 0.15,
    skills_count: 5.0,
    skill_level_avg: 3.2,
    match_score: 0.65,
    experience_years: 6.0,
    companies_count: 2.0,
    dept_offset: 0.0,
  };

  it("should return correct baseline hazard rates across tenure buckets", () => {
    expect(baselineHazard(2)).toBe(0.008);
    expect(baselineHazard(8)).toBe(0.013);
    expect(baselineHazard(15)).toBe(0.017);
    expect(baselineHazard(20)).toBe(0.014);
    expect(baselineHazard(30)).toBe(0.011);
    expect(baselineHazard(40)).toBe(0.008);
    expect(baselineHazard(50)).toBe(0.006);
    expect(baselineHazard(100)).toBe(0.005);
  });

  it("should build default and overridden covariates correctly", () => {
    const rawLevers = {
      morale: 0.6,
      salary: 100000,
      dept_median_salary: 90000,
      skills_count: 6,
      tenure_months: 18,
    };
    const base = buildCovariates(rawLevers);
    expect(base.morale).toBe(0.6);
    expect(base.salary).toBe(100000);
    expect(base.tenure_months).toBe(18);

    const overridden = buildCovariates(rawLevers, {
      morale: 0.85,
      salaryIncrease: 0.1,
      riskFlag: true,
    });
    expect(overridden.morale).toBe(0.85);
    expect(Math.round(overridden.salary)).toBe(110000);
    expect(overridden.risk_flag).toBe(true);
  });

  it("should compute log hazard contributions and handle clamping", () => {
    const covs = buildCovariates({
      morale: 0.3,
      salary_log_ratio: -0.2,
      risk_flag: true,
      skills_count: 8,
      skill_level_avg: 2.0,
      match_score: 0.4,
      experience_years: 2,
      companies_count: 5,
    });
    const { contribs, total } = logHazardContributions(covs, sampleMeans);
    expect(typeof total).toBe("number");
    expect(contribs).toHaveProperty("morale");
    expect(contribs).toHaveProperty("salary");
    expect(contribs).toHaveProperty("risk_flag");
  });

  it("should compute 12-month survival curve and forecast with monotonicity", () => {
    const covs = buildCovariates({
      morale: 0.7,
      salary: 110000,
      dept_median_salary: 100000,
      skills_count: 5,
      tenure_months: 12,
    });
    const result = computeSurvival(covs, sampleMeans, 12);
    expect(result.forecast).toHaveLength(12);
    expect(result.hazardRatio).toBeGreaterThan(0);
    expect(result.attr12).toBeGreaterThanOrEqual(0);
    expect(result.attr12).toBeLessThanOrEqual(1);

    for (let i = 1; i < result.forecast.length; i++) {
      expect(result.forecast[i].survival_probability).toBeLessThanOrEqual(
        result.forecast[i - 1].survival_probability,
      );
      expect(result.forecast[i].ci_low).toBeLessThanOrEqual(
        result.forecast[i].survival_probability,
      );
      expect(result.forecast[i].ci_high).toBeGreaterThanOrEqual(
        result.forecast[i].survival_probability,
      );
    }
  });

  it("should return correct risk tiers and color/bg styles based on 12-month attrition", () => {
    expect(riskTier(0.04)).toBe("Low");
    expect(riskTier(0.08)).toBe("Moderate");
    expect(riskTier(0.15)).toBe("Elevated");
    expect(riskTier(0.25)).toBe("High");
    expect(riskTier(0.4)).toBe("Critical");

    expect(tierColor("Low")).toBe("#34d399");
    expect(tierBg("Low")).toContain("rgba");
    expect(tierColor("Critical")).toBe("#e11d48");
  });
});
