"""Build a high-entropy, production-shaped HR/ATS dataset bundle.

Integrates real continuous features from raw IBM HR Attrition telemetry
and O*NET skills databases into the 6 public CSV contracts used by the Aurelinx importer.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
import zipfile
from pathlib import Path

FILES = (
    "employees_public.csv",
    "candidates_public.csv",
    "employee_skills_public.csv",
    "candidate_skills_public.csv",
    "employee_experience_public.csv",
    "candidate_experience_public.csv",
)

ENTERPRISE_DEPARTMENTS_AND_ROLES = [
    (
        "Sales",
        [
            "Sales Executive",
            "Account Executive",
            "Sales Representative",
            "Sales Manager",
        ],
    ),
    (
        "Research & Development",
        [
            "Research Scientist",
            "Laboratory Technician",
            "Research Associate",
            "Research Director",
        ],
    ),
    (
        "Engineering & IT",
        ["Software Engineer", "IT Specialist", "System Architect", "DevOps Engineer"],
    ),
    (
        "Product Management",
        ["Product Analyst", "Product Manager", "Business Associate", "UX Researcher"],
    ),
    (
        "Marketing",
        [
            "Growth Marketing Specialist",
            "Content Strategist",
            "Digital Marketing Lead",
            "Brand Specialist",
        ],
    ),
    (
        "Human Resources",
        [
            "HR Generalist",
            "Talent Partner",
            "People Operations",
            "Recruiting Specialist",
        ],
    ),
    (
        "Operations",
        [
            "Operations Manager",
            "Manufacturing Director",
            "Process Improvement Lead",
            "Supply Chain Analyst",
        ],
    ),
    (
        "Customer Support",
        [
            "Customer Support Specialist",
            "Support Operations Lead",
            "Client Success Manager",
        ],
    ),
    (
        "Healthcare & Services",
        ["Healthcare Representative", "Field Services Specialist", "Compliance Lead"],
    ),
    (
        "Finance & Accounting",
        ["Financial Analyst", "Senior Accountant", "Finance Lead", "Audit Specialist"],
    ),
]

# Realistic enterprise headcount weights per department (share of population).
DEPT_WEIGHTS = {
    "Engineering & IT": 290,
    "Sales": 210,
    "Research & Development": 195,
    "Customer Support": 150,
    "Finance & Accounting": 135,
    "Operations": 125,
    "Marketing": 105,
    "Healthcare & Services": 100,
    "Human Resources": 85,
    "Product Management": 75,
}

# Occupational mix inside each department (weight per role).
ROLE_WEIGHTS = {
    "Sales": {
        "Account Executive": 34,
        "Sales Representative": 28,
        "Sales Executive": 22,
        "Sales Manager": 16,
    },
    "Research & Development": {
        "Research Scientist": 40,
        "Research Associate": 30,
        "Laboratory Technician": 22,
        "Research Director": 8,
    },
    "Engineering & IT": {
        "Software Engineer": 45,
        "DevOps Engineer": 20,
        "IT Specialist": 20,
        "System Architect": 15,
    },
    "Product Management": {
        "Product Manager": 40,
        "Product Analyst": 28,
        "UX Researcher": 20,
        "Business Associate": 12,
    },
    "Marketing": {
        "Growth Marketing Specialist": 34,
        "Content Strategist": 28,
        "Brand Specialist": 22,
        "Digital Marketing Lead": 16,
    },
    "Human Resources": {
        "HR Generalist": 40,
        "Recruiting Specialist": 26,
        "Talent Partner": 22,
        "People Operations": 12,
    },
    "Operations": {
        "Operations Manager": 44,
        "Supply Chain Analyst": 28,
        "Process Improvement Lead": 18,
        "Manufacturing Director": 10,
    },
    "Customer Support": {
        "Customer Support Specialist": 62,
        "Client Success Manager": 24,
        "Support Operations Lead": 14,
    },
    "Healthcare & Services": {
        "Healthcare Representative": 44,
        "Field Services Specialist": 34,
        "Compliance Lead": 22,
    },
    "Finance & Accounting": {
        "Financial Analyst": 44,
        "Senior Accountant": 28,
        "Audit Specialist": 15,
        "Finance Lead": 13,
    },
}

# Annualized base attrition rates per department (drives at-risk population).
DEPT_ATTRITION = {
    "Sales": 0.24,
    "Customer Support": 0.22,
    "Marketing": 0.19,
    "Research & Development": 0.16,
    "Human Resources": 0.15,
    "Product Management": 0.14,
    "Engineering & IT": 0.13,
    "Healthcare": 0.13,
    "Operations": 0.12,
    "Finance": 0.10,
}

# Department-level sentiment tilt (engagement surveys per org unit).
DEPT_SENTIMENT = {
    "Engineering & IT": 0.04,
    "Research & Development": 0.03,
    "Product Management": 0.02,
    "Finance & Accounting": 0.02,
    "Human Resources": 0.01,
    "Sales": 0.01,
    "Marketing": 0.00,
    "Healthcare & Services": -0.01,
    "Operations": -0.02,
    "Customer Support": -0.04,
}

# Broad department-level skill pools (extras beyond the 4 role core skills).
SKILL_POOLS = {
    "Engineering & IT": (
        "TypeScript",
        "React",
        "Go",
        "AWS",
        "PostgreSQL",
        "REST APIs",
        "Docker",
        "Kubernetes",
        "CI/CD",
        "Microservices",
        "Testing",
        "Terraform",
        "Observability",
        "Linux",
        "Git",
        "Security",
    ),
    "Sales": (
        "Cold Calling",
        "Product Demos",
        "Forecasting",
        "Pipeline Management",
        "Presentation",
        "Pricing Strategy",
        "Contract Negotiation",
        "Sales Planning",
        "Customer Success",
        "Quota Management",
        "CRM",
        "Market Research",
        "Prospecting",
        "Demo Management",
    ),
    "Research & Development": (
        "Statistical Analysis",
        "Data Visualization",
        "Machine Learning",
        "ETL",
        "Peer Review",
        "Scientific Writing",
        "Hypothesis Testing",
        "Python",
        "Survey Design",
        "Literature Review",
        "Experiment Design",
        "Mentoring",
    ),
    "Customer Support": (
        "Ticketing",
        "Documentation",
        "Training",
        "Escalation Management",
        "Quality Assurance",
        "Product Knowledge",
        "Knowledge Base",
        "SLA Management",
        "Self-Service Design",
        "Onboarding",
        "Feedback Loops",
        "Diagnostics",
    ),
    "Finance & Accounting": (
        "GAAP",
        "Variance Analysis",
        "Risk Management",
        "Internal Controls",
        "Power BI",
        "Data Reconciliation",
        "Budgeting",
        "Forecasting",
        "Tax Compliance",
        "Financial Reporting",
        "ERP",
        "Payroll",
        "Audit Support",
    ),
    "Operations": (
        "Enterprise Resource Planning",
        "Inventory Management",
        "Lean",
        "Six Sigma",
        "Vendor Management",
        "Quality Control",
        "Cost Optimization",
        "Scheduling",
        "Supply Chain",
        "Logistics",
        "KPI Reporting",
        "Change Management",
    ),
    "Marketing": (
        "Analytics",
        "Google Analytics",
        "Social Media",
        "Campaign Management",
        "Brand Management",
        "Email Marketing",
        "Marketing Automation",
        "Event Planning",
        "Market Research",
        "Paid Ads",
        "Segmentation",
        "Landing Pages",
    ),
    "Healthcare & Services": (
        "Medical Compliance",
        "Documentation",
        "Patient Communication",
        "Field Documentation",
        "Regulatory Standards",
        "Risk Mitigation",
        "Audit Readiness",
        "Client Reporting",
        "Service Excellence",
        "Scheduling",
    ),
    "Human Resources": (
        "Performance Management",
        "Benefits Administration",
        "Payroll",
        "Onboarding",
        "Employee Engagement",
        "Compensation Analysis",
        "Labor Relations",
        "Succession Planning",
        "Learning & Development",
        "Conflict Resolution",
        "HR Metrics",
        "Policy Design",
    ),
    "Product Management": (
        "Agile",
        "User Stories",
        "A/B Testing",
        "Product Analytics",
        "Stakeholder Management",
        "Data Analysis",
        "Pricing Strategy",
        "Competitive Analysis",
        "Prototyping",
        "Release Management",
        "Customer Discovery",
        "Metrics Design",
    ),
}

# Skill count per person, mirroring the observed 6-12 distribution from the legacy DB
# (11 skills was the most common profile).
SKILL_COUNT_DIST = {6: 2, 7: 8, 8: 10, 9: 43, 10: 169, 11: 496, 12: 272}

ROLE_PROFILES = {
    "account executive": {
        "skills": ("Communication", "Negotiation", "CRM", "Account Strategy"),
        "companies": ("Vertex Dynamics", "BlueOrbit Systems", "Pioneer Analytics"),
    },
    "sales executive": {
        "skills": ("Communication", "Negotiation", "CRM", "Account Strategy"),
        "companies": ("Vertex Dynamics", "Summit Partners", "Cedar Works"),
    },
    "sales representative": {
        "skills": ("Communication", "Cold Outreach", "CRM", "Product Demos"),
        "companies": ("Pioneer Analytics", "Vertex Dynamics", "Summit Partners"),
    },
    "sales manager": {
        "skills": ("Leadership", "Sales Strategy", "CRM", "Negotiation"),
        "companies": ("Summit Partners", "Cedar Works", "BlueOrbit Systems"),
    },
    "business associate": {
        "skills": ("Data Analysis", "Excel", "Problem Solving", "Communication"),
        "companies": ("NorthBridge AI", "Summit Partners", "Cedar Works"),
    },
    "hr generalist": {
        "skills": ("Employee Relations", "Recruiting", "Communication", "HRIS"),
        "companies": ("PeopleFirst Group", "Cedar Works", "Summit Partners"),
    },
    "talent partner": {
        "skills": ("Recruiting", "Sourcing", "Interviewing", "Communication"),
        "companies": ("PeopleFirst Group", "Summit Partners", "NorthBridge AI"),
    },
    "people operations": {
        "skills": ("HRIS", "Onboarding", "Compliance", "Employee Relations"),
        "companies": ("Cedar Works", "PeopleFirst Group", "Pioneer Analytics"),
    },
    "recruiting specialist": {
        "skills": ("Sourcing", "Recruiting", "ATS Management", "Communication"),
        "companies": ("PeopleFirst Group", "Vertex Dynamics", "Summit Partners"),
    },
    "software engineer": {
        "skills": ("Python", "JavaScript", "SQL", "API Design"),
        "companies": ("NorthBridge AI", "Vertex Dynamics", "BlueOrbit Systems"),
    },
    "it specialist": {
        "skills": ("Networking", "Cybersecurity", "Troubleshooting", "Linux"),
        "companies": ("BlueOrbit Systems", "NorthBridge AI", "Vertex Dynamics"),
    },
    "system architect": {
        "skills": ("System Design", "Cloud Infrastructure", "Security", "Python"),
        "companies": ("NorthBridge AI", "BlueOrbit Systems", "Vertex Dynamics"),
    },
    "devops engineer": {
        "skills": ("Docker", "CI/CD", "Kubernetes", "Linux"),
        "companies": ("BlueOrbit Systems", "NorthBridge AI", "Vertex Dynamics"),
    },
    "customer support specialist": {
        "skills": ("Communication", "Customer Service", "Problem Solving", "Ticketing"),
        "companies": ("Pioneer Analytics", "PeopleFirst Group", "Cedar Works"),
    },
    "support operations lead": {
        "skills": (
            "Operations",
            "Ticketing",
            "Process Improvement",
            "Customer Service",
        ),
        "companies": ("Pioneer Analytics", "Summit Partners", "Cedar Works"),
    },
    "client success manager": {
        "skills": (
            "Account Strategy",
            "Relationship Management",
            "Communication",
            "CRM",
        ),
        "companies": ("Summit Partners", "Pioneer Analytics", "Vertex Dynamics"),
    },
    "operations manager": {
        "skills": (
            "Operations",
            "Project Management",
            "Leadership",
            "Process Improvement",
        ),
        "companies": ("Summit Partners", "Vertex Dynamics", "NorthBridge AI"),
    },
    "manufacturing director": {
        "skills": (
            "Operations",
            "Leadership",
            "Quality Control",
            "Process Improvement",
        ),
        "companies": ("Summit Partners", "Vertex Dynamics", "BlueOrbit Systems"),
    },
    "process improvement lead": {
        "skills": (
            "Process Improvement",
            "Operations",
            "Data Analysis",
            "Project Management",
        ),
        "companies": ("Vertex Dynamics", "Summit Partners", "Cedar Works"),
    },
    "supply chain analyst": {
        "skills": ("Logistics", "Data Analysis", "SQL", "Operations"),
        "companies": ("Summit Partners", "Vertex Dynamics", "NorthBridge AI"),
    },
    "product analyst": {
        "skills": ("SQL", "Data Analysis", "Product Analytics", "Experiment Design"),
        "companies": ("Pioneer Analytics", "Vertex Dynamics", "Summit Partners"),
    },
    "product manager": {
        "skills": ("Product Strategy", "User Research", "Agile", "Roadmapping"),
        "companies": ("Vertex Dynamics", "NorthBridge AI", "Summit Partners"),
    },
    "ux researcher": {
        "skills": (
            "User Research",
            "Usability Testing",
            "Wireframing",
            "Communication",
        ),
        "companies": ("Pioneer Analytics", "Vertex Dynamics", "Summit Partners"),
    },
    "growth marketing specialist": {
        "skills": ("Digital Marketing", "SEO", "Analytics", "Content Strategy"),
        "companies": ("Pioneer Analytics", "Cedar Works", "BlueOrbit Systems"),
    },
    "content strategist": {
        "skills": ("Content Strategy", "SEO", "Copywriting", "Digital Marketing"),
        "companies": ("Pioneer Analytics", "Cedar Works", "Summit Partners"),
    },
    "digital marketing lead": {
        "skills": ("Digital Marketing", "Campaign Management", "Analytics", "SEO"),
        "companies": ("Cedar Works", "Pioneer Analytics", "BlueOrbit Systems"),
    },
    "brand specialist": {
        "skills": ("Brand Strategy", "Communication", "Marketing", "Copywriting"),
        "companies": ("Pioneer Analytics", "Cedar Works", "Vertex Dynamics"),
    },
    "research associate": {
        "skills": (
            "Research Methods",
            "Data Analysis",
            "Statistics",
            "Technical Writing",
        ),
        "companies": ("NorthBridge AI", "Pioneer Analytics", "Summit Partners"),
    },
    "research scientist": {
        "skills": ("Research Methods", "Statistics", "Python", "Technical Writing"),
        "companies": ("NorthBridge AI", "Pioneer Analytics", "Vertex Dynamics"),
    },
    "laboratory technician": {
        "skills": (
            "Laboratory Safety",
            "Data Recording",
            "Quality Control",
            "Research Methods",
        ),
        "companies": ("Pioneer Analytics", "NorthBridge AI", "Cedar Works"),
    },
    "research director": {
        "skills": (
            "Leadership",
            "Research Methods",
            "Statistics",
            "Project Management",
        ),
        "companies": ("NorthBridge AI", "Summit Partners", "Vertex Dynamics"),
    },
    "healthcare representative": {
        "skills": (
            "Communication",
            "Relationship Management",
            "Compliance",
            "Negotiation",
        ),
        "companies": ("PeopleFirst Group", "Cedar Works", "Pioneer Analytics"),
    },
    "field services specialist": {
        "skills": ("Field Service", "Troubleshooting", "Compliance", "Communication"),
        "companies": ("PeopleFirst Group", "Pioneer Analytics", "Cedar Works"),
    },
    "compliance lead": {
        "skills": ("Compliance", "Regulatory Affairs", "Auditing", "Documentation"),
        "companies": ("PeopleFirst Group", "Summit Partners", "Cedar Works"),
    },
    "financial analyst": {
        "skills": ("Financial Modeling", "Excel", "SQL", "Data Analysis"),
        "companies": ("Summit Partners", "Vertex Dynamics", "NorthBridge AI"),
    },
    "senior accountant": {
        "skills": ("Accounting", "Financial Reporting", "Taxation", "Excel"),
        "companies": ("Summit Partners", "Cedar Works", "Pioneer Analytics"),
    },
    "finance lead": {
        "skills": (
            "Financial Planning",
            "Budgeting",
            "Leadership",
            "Financial Modeling",
        ),
        "companies": ("Summit Partners", "Vertex Dynamics", "BlueOrbit Systems"),
    },
    "audit specialist": {
        "skills": ("Auditing", "Compliance", "Risk Assessment", "Accounting"),
        "companies": ("Summit Partners", "Pioneer Analytics", "Cedar Works"),
    },
}

DEFAULT_PROFILE = {
    "skills": (
        "Communication",
        "Problem Solving",
        "Data Analysis",
        "Project Management",
    ),
    "companies": ("Vertex Dynamics", "BlueOrbit Systems", "Pioneer Analytics"),
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        return
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def profile_for(role: str) -> dict:
    return ROLE_PROFILES.get(role.strip().casefold(), DEFAULT_PROFILE)


def clamp(value: float, low: float = 0.05, high: float = 0.95) -> float:
    return round(max(low, min(high, value)), 3)


def _hash01(seed: str) -> float:
    """Deterministic pseudo-random value in [0, 1) derived from a string."""
    digest = int(hashlib.sha256(seed.encode("utf-8")).hexdigest()[:16], 16)
    return (digest % 1_000_000) / 1_000_000.0


def _allocate_counts(count: int, weights: dict[str, int]) -> list[str]:
    """Largest-remainder allocation of `count` per weighted department."""
    total_w = sum(weights.values())
    raw = {name: count * weight / total_w for name, weight in weights.items()}
    result = {name: int(value) for name, value in raw.items()}
    remaining = count - sum(result.values())
    for name, _ in sorted(
        raw.items(), key=lambda item: item[1] - result[item[0]], reverse=True
    )[:remaining]:
        result[name] += 1
    return [name for name, value in result.items() for _ in range(value)]


def _dept_role_plan(total: int, seed: str) -> list[tuple[str, str]]:
    """Weighted, shuffled (department, role) assignment plan."""
    rng = random.Random(seed)
    plan: list[tuple[str, str]] = []
    by_dept = dict(ENTERPRISE_DEPARTMENTS_AND_ROLES)
    for dept_name in _allocate_counts(total, DEPT_WEIGHTS):
        roles = by_dept[dept_name]
        weights = [ROLE_WEIGHTS.get(dept_name, {}).get(role, 1) for role in roles]
        plan.append((dept_name, rng.choices(roles, weights=weights, k=1)[0]))
    rng.shuffle(plan)
    return plan


def build(
    input_dir: Path, output_dir: Path, raw_dir: Path | None = None
) -> dict[str, int | str]:
    source = {filename: read_csv(input_dir / filename) for filename in FILES}
    employees = source["employees_public.csv"]
    candidates = source["candidates_public.csv"]

    # Load raw IBM HR Attrition telemetry dataset if present
    ibm_rows: list[dict[str, str]] = []
    if raw_dir and (raw_dir / "ibm_hr_attrition.csv").exists():
        ibm_rows = read_csv(raw_dir / "ibm_hr_attrition.csv")

    skill_levels: dict[str, list[int]] = {}
    for filename in ("employee_skills_public.csv", "candidate_skills_public.csv"):
        for row in source[filename]:
            skill_levels.setdefault(row["email"], []).append(
                max(1, min(5, int(float(row["level"]))))
            )

    # Assign weighted departments and roles across employees (enterprise-shaped, shuffled)
    employee_plan = _dept_role_plan(len(employees), "employees:dept-plan")
    for index, row in enumerate(employees):
        dept_name, role_name = employee_plan[index]
        row["department"] = dept_name
        row["role"] = role_name

        email = row["email"]
        email_hash = sum(ord(c) for c in email)

        if ibm_rows:
            ibm = ibm_rows[index % len(ibm_rows)]
            job_sat = float(ibm.get("JobSatisfaction", 3))
            env_sat = float(ibm.get("EnvironmentSatisfaction", 3))
            work_life = float(ibm.get("WorkLifeBalance", 3))
            job_inv = float(ibm.get("JobInvolvement", 3))
            hike = float(ibm.get("PercentSalaryHike", 15))
            attrition = ibm.get("Attrition", "No").strip().casefold() == "yes"
            overtime = ibm.get("OverTime", "No").strip().casefold() == "yes"

            # Continuous sentiment anchored on IBM telemetry, tilted per department,
            # with per-person gaussian noise so values are mostly unique.
            base_sent = (
                job_sat * 0.35 + env_sat * 0.25 + work_life * 0.25 + job_inv * 0.15
            ) / 4.0
            dept_tilt = DEPT_SENTIMENT.get(dept_name, 0.0)
            noise = (_hash01(email + ":sent") - 0.5) * 0.16
            sentiment = clamp(0.10 + base_sent * 0.70 + dept_tilt + noise, 0.08, 0.98)

            # Realistic per-department attrition pressure + IBM signals
            risk = DEPT_ATTRITION.get(dept_name, 0.15)
            if attrition:
                risk += 0.35
            if overtime:
                risk += 0.06
            if job_sat <= 2 and work_life <= 2:
                risk += 0.05
            is_at_risk = _hash01(email + ":risk") < min(0.90, risk)

            # Continuous retention probability driven by sentiment, risk and hike
            retention = clamp(
                0.34
                + 0.55 * sentiment
                - 0.42 * float(is_at_risk)
                + (hike / 100.0) * 0.20
                + (_hash01(email + ":ret") - 0.5) * 0.10,
                0.05,
                0.98,
            )
        else:
            sentiment = clamp(
                0.30 + (_hash01(email + ":sent") - 0.5) * 0.70, 0.08, 0.98
            )
            is_at_risk = _hash01(email + ":risk") < DEPT_ATTRITION.get(dept_name, 0.15)
            retention = clamp(
                0.25 + 0.65 * sentiment - 0.35 * float(is_at_risk), 0.05, 0.98
            )

        row["sentiment_score"] = f"{sentiment:.3f}"
        row["is_at_risk"] = "true" if is_at_risk else "false"
        row["retention_prob"] = f"{retention:.3f}"

    # Assign weighted departments and roles across candidates (14,999 candidates)
    candidate_plan = _dept_role_plan(len(candidates), "candidates:dept-plan")
    for index, row in enumerate(candidates):
        dept_name, role_name = candidate_plan[index]
        row["department"] = dept_name
        row["role"] = role_name

        email = row["email"]
        email_hash = sum(ord(c) for c in email)
        levels = skill_levels.get(email, [3])
        skill_strength = sum(levels) / (len(levels) * 5)

        # Continuous sentiment & match scores with realistic variance
        sentiment = clamp(
            0.46
            + (_hash01(email + ":cs") - 0.5) * 0.36
            + (skill_strength - 0.60) * 0.28,
            0.10,
            0.98,
        )
        match_score = clamp(
            0.30 * sentiment
            + 0.52 * skill_strength
            + (_hash01(email + ":cm") - 0.5) * 0.16,
            0.15,
            0.99,
        )

        row["sentiment_score"] = f"{sentiment:.3f}"
        row["match_score"] = f"{match_score:.3f}"

    # Update skills: role core skills + variable 6-12 extras from department pool
    for filename, base_filename in (
        ("employee_skills_public.csv", "employees_public.csv"),
        ("candidate_skills_public.csv", "candidates_public.csv"),
    ):
        by_email = {row["email"]: row for row in source[base_filename]}
        templates: dict[str, dict] = {row["email"]: row for row in source[filename]}
        rebuilt: list[dict[str, str]] = []
        for email, person in by_email.items():
            profile = profile_for(person["role"])
            rng = random.Random(email + ":skills")
            count = rng.choices(
                list(SKILL_COUNT_DIST), weights=list(SKILL_COUNT_DIST.values()), k=1
            )[0]
            core = list(profile["skills"])
            pool = [
                s for s in SKILL_POOLS.get(person["department"], ()) if s not in core
            ]
            chosen = list(core) + rng.sample(pool, count - len(core))
            template = templates.get(
                email, {"email": email, "skill_name": "", "level": ""}
            )
            for index, skill in enumerate(chosen):
                level = max(
                    1, min(5, round(3.3 + (_hash01(f"{email}:lv{index}") - 0.5) * 2.4))
                )
                rebuilt.append(
                    {
                        "email": template.get("email", email),
                        "skill_name": skill,
                        "level": str(level),
                    }
                )
        source[filename] = rebuilt

    # Update experience with company tenure
    for filename, base_filename in (
        ("employee_experience_public.csv", "employees_public.csv"),
        ("candidate_experience_public.csv", "candidates_public.csv"),
    ):
        by_email = {row["email"]: row for row in source[base_filename]}
        for row in source[filename]:
            person = by_email[row["email"]]
            profile = profile_for(person["role"])
            email_hash = sum(ord(char) for char in row["email"])
            company = profile["companies"][email_hash % len(profile["companies"])]
            row["company"] = company
            row["position"] = person["role"]
            row["description"] = (
                f"Role-aligned experience in {person['role']} at {company}."
            )

    # Write output CSV files
    for filename in FILES:
        write_csv(output_dir / filename, source[filename])

    # Create ZIP bundle for Local Data Import Hub
    zip_path = output_dir / "aurelinx-dataset-bundle.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for filename in FILES:
            zipf.write(output_dir / filename, arcname=filename)

    # Also sync top-level ZIP bundle for root directory
    top_zip_path = output_dir.parent / "production_sample_20260725.zip"
    with zipfile.ZipFile(top_zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for filename in FILES:
            zipf.write(output_dir / filename, arcname=filename)

    counts: dict[str, int] = {filename: len(source[filename]) for filename in FILES}
    manifest = {
        "source_bundle": str(input_dir),
        "raw_telemetry": str(raw_dir / "ibm_hr_attrition.csv") if raw_dir else "None",
        "purpose": "10-Department enterprise dataset with continuous IBM HR telemetry",
        "retention_formula": "Continuous multivariate HR score derived from IBM HR Attrition telemetry",
        "candidate_match_formula": "Continuous skill-strength & sentiment evaluation model",
        "departments": [d[0] for d in ENTERPRISE_DEPARTMENTS_AND_ROLES],
        "counts": counts,
    }
    (output_dir / "PROVENANCE.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    return {"output": str(output_dir), **counts}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input", type=Path, default=Path("Docs/datasets/production_sample_20260725")
    )
    parser.add_argument(
        "--output", type=Path, default=Path("Docs/datasets/production_sample_20260725")
    )
    parser.add_argument("--raw", type=Path, default=Path("Docs/datasets/raw"))
    args = parser.parse_args()
    print(json.dumps(build(args.input, args.output, args.raw), indent=2))


if __name__ == "__main__":
    main()
