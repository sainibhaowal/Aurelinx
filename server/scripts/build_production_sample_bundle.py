"""Build a production-shaped synthetic HR/ATS bundle from the clean bundle.

This keeps the six CSV contracts used by the importer, but makes related
skills, experience, and scores coherent with each person's role.  It never
overwrites the source bundle; output is written to a separate directory.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


FILES = (
    "employees_public.csv",
    "candidates_public.csv",
    "employee_skills_public.csv",
    "candidate_skills_public.csv",
    "employee_experience_public.csv",
    "candidate_experience_public.csv",
)

ROLE_PROFILES = {
    "account executive": {
        "skills": ("Communication", "Negotiation", "CRM", "Account Strategy"),
        "companies": ("Vertex Dynamics", "BlueOrbit Systems", "Pioneer Analytics"),
    },
    "business associate": {
        "skills": ("Data Analysis", "Excel", "Problem Solving", "Communication"),
        "companies": ("NorthBridge AI", "Summit Partners", "Cedar Works"),
    },
    "hr generalist": {
        "skills": ("Employee Relations", "Recruiting", "Communication", "HRIS"),
        "companies": ("PeopleFirst Group", "Cedar Works", "Summit Partners"),
    },
    "software engineer": {
        "skills": ("Python", "JavaScript", "SQL", "API Design"),
        "companies": ("NorthBridge AI", "Vertex Dynamics", "BlueOrbit Systems"),
    },
    "customer support specialist": {
        "skills": ("Communication", "Customer Service", "Problem Solving", "Ticketing"),
        "companies": ("Pioneer Analytics", "PeopleFirst Group", "Cedar Works"),
    },
    "operations manager": {
        "skills": ("Operations", "Project Management", "Leadership", "Process Improvement"),
        "companies": ("Summit Partners", "Vertex Dynamics", "NorthBridge AI"),
    },
    "it specialist": {
        "skills": ("Networking", "Cybersecurity", "Troubleshooting", "Linux"),
        "companies": ("BlueOrbit Systems", "NorthBridge AI", "Vertex Dynamics"),
    },
    "product analyst": {
        "skills": ("SQL", "Data Analysis", "Product Analytics", "Experiment Design"),
        "companies": ("Pioneer Analytics", "Vertex Dynamics", "Summit Partners"),
    },
    "growth marketing specialist": {
        "skills": ("Digital Marketing", "SEO", "Analytics", "Content Strategy"),
        "companies": ("Pioneer Analytics", "Cedar Works", "BlueOrbit Systems"),
    },
    "research associate": {
        "skills": ("Research Methods", "Data Analysis", "Statistics", "Technical Writing"),
        "companies": ("NorthBridge AI", "Pioneer Analytics", "Summit Partners"),
    },
    "sales executive": {
        "skills": ("Communication", "Negotiation", "CRM", "Account Strategy"),
        "companies": ("Vertex Dynamics", "Summit Partners", "Cedar Works"),
    },
    "research scientist": {
        "skills": ("Research Methods", "Statistics", "Python", "Technical Writing"),
        "companies": ("NorthBridge AI", "Pioneer Analytics", "Vertex Dynamics"),
    },
    "laboratory technician": {
        "skills": ("Laboratory Safety", "Data Recording", "Quality Control", "Research Methods"),
        "companies": ("Pioneer Analytics", "NorthBridge AI", "Cedar Works"),
    },
    "manufacturing director": {
        "skills": ("Operations", "Leadership", "Quality Control", "Process Improvement"),
        "companies": ("Summit Partners", "Vertex Dynamics", "BlueOrbit Systems"),
    },
    "healthcare representative": {
        "skills": ("Communication", "Relationship Management", "Compliance", "Negotiation"),
        "companies": ("PeopleFirst Group", "Cedar Works", "Pioneer Analytics"),
    },
}

DEFAULT_PROFILE = {
    "skills": ("Communication", "Problem Solving", "Data Analysis", "Project Management"),
    "companies": ("Vertex Dynamics", "BlueOrbit Systems", "Pioneer Analytics"),
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def profile_for(role: str) -> dict:
    return ROLE_PROFILES.get(role.strip().casefold(), DEFAULT_PROFILE)


def clamp(value: float, low: float = 0.05, high: float = 0.95) -> float:
    return round(max(low, min(high, value)), 2)


def build(input_dir: Path, output_dir: Path) -> dict[str, int | str]:
    source = {filename: read_csv(input_dir / filename) for filename in FILES}
    employees = source["employees_public.csv"]
    candidates = source["candidates_public.csv"]

    skill_levels: dict[str, list[int]] = {}
    for filename in ("employee_skills_public.csv", "candidate_skills_public.csv"):
        for row in source[filename]:
            skill_levels.setdefault(row["email"], []).append(max(1, min(5, int(float(row["level"])))))

    for row in employees:
        sentiment = float(row["sentiment_score"])
        at_risk = row["is_at_risk"].strip().casefold() == "true"
        row["retention_prob"] = f"{clamp(0.25 + (0.65 * sentiment) - (0.35 if at_risk else 0.0)):.2f}"

    for row in candidates:
        sentiment = float(row["sentiment_score"])
        levels = skill_levels.get(row["email"], [3])
        skill_strength = sum(levels) / (len(levels) * 5)
        row["match_score"] = f"{clamp((0.55 * sentiment) + (0.45 * skill_strength), 0.0, 1.0):.2f}"

    for filename, base_filename in (
        ("employee_skills_public.csv", "employees_public.csv"),
        ("candidate_skills_public.csv", "candidates_public.csv"),
    ):
        by_email = {row["email"]: row for row in source[base_filename]}
        rows = source[filename]
        occurrence: dict[str, int] = {}
        for row in rows:
            email = row["email"]
            person = by_email[email]
            profile = profile_for(person["role"])
            index = occurrence.get(email, 0)
            row["skill_name"] = profile["skills"][index % len(profile["skills"])]
            base_level = skill_levels.get(email, [3])[0]
            row["level"] = str(max(1, min(5, base_level + ((index % 3) - 1))) or 1)
            occurrence[email] = index + 1

    for filename, base_filename in (
        ("employee_experience_public.csv", "employees_public.csv"),
        ("candidate_experience_public.csv", "candidates_public.csv"),
    ):
        by_email = {row["email"]: row for row in source[base_filename]}
        for row in source[filename]:
            person = by_email[row["email"]]
            profile = profile_for(person["role"])
            company = profile["companies"][sum(ord(char) for char in row["email"]) % len(profile["companies"])]
            row["company"] = company
            row["position"] = person["role"]
            row["description"] = f"Role-aligned experience in {person['role']} at {company}."

    for filename in FILES:
        write_csv(output_dir / filename, source[filename])

    manifest = {
        "source_bundle": str(input_dir),
        "purpose": "Production-shaped synthetic tenant for end-to-end workflow testing",
        "retention_formula": "clamp(0.25 + 0.65*sentiment_score - 0.35*is_at_risk, 0.05, 0.95)",
        "candidate_match_formula": "clamp(0.55*sentiment_score + 0.45*average_skill_level/5, 0, 1)",
        "skills": "Role-aligned four-skill profiles",
        "experience": "Role-aligned company and position records",
        "counts": {filename: len(source[filename]) for filename in FILES},
    }
    (output_dir / "PROVENANCE.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return {"output": str(output_dir), **manifest["counts"]}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path("Docs/datasets/processed"))
    parser.add_argument("--output", type=Path, default=Path("Docs/datasets/production_sample"))
    args = parser.parse_args()
    print(json.dumps(build(args.input, args.output), indent=2))


if __name__ == "__main__":
    main()
