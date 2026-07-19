"""
Database seeding script
Populates database with test data for development and testing
"""

from sqlmodel import Session
from app.models.database import (
    engine,
    create_db_and_tables,
    UserTable,
    EmployeeTable,
    CandidateTable,
    SkillTable,
    ExperienceTable,
)
from app.core.security import hash_password
import random

EMPLOYEE_NAMES = [
    "Alice Johnson",
    "Bob Smith",
    "Carol White",
    "David Brown",
    "Eva Garcia",
    "Frank Miller",
    "Grace Lee",
    "Henry Davis",
    "Iris Martinez",
    "Jack Wilson",
    "Kelly Anderson",
    "Liam Thomas",
    "Mary Jackson",
    "Nathan Harris",
    "Olivia Martin",
    "Peter Thompson",
    "Quinn Roberts",
    "Rachel Phillips",
    "Samuel Edwards",
    "Tina Campbell",
]

ROLES = [
    "Senior Engineer",
    "Product Manager",
    "Sales Executive",
    "HR Manager",
    "Financial Analyst",
    "Junior Developer",
    "Product Designer",
    "Account Manager",
]

DEPARTMENTS = ["Engineering", "Product", "Sales", "HR", "Finance"]

SKILL_NAMES = [
    "Python",
    "JavaScript",
    "React",
    "SQL",
    "AWS",
    "Docker",
    "Project Management",
    "Leadership",
    "Communication",
    "Data Analysis",
    "Kubernetes",
    "Microservices",
    "API Design",
    "Testing",
    "CI/CD",
]

COMPANIES = [
    "Google",
    "Amazon",
    "Microsoft",
    "Apple",
    "Facebook",
    "Netflix",
    "Uber",
    "Twitter",
    "LinkedIn",
    "Salesforce",
]


def seed_production_data():
    """Seed database with test data"""
    create_db_and_tables()

    with Session(engine) as session:
        # Check if already seeded
        existing = session.query(UserTable).first()
        if existing:
            print("❌ Database already seeded. Clearing...")
            session.query(UserTable).delete()
            session.query(EmployeeTable).delete()
            session.query(CandidateTable).delete()
            session.commit()

        print("🌱 Seeding database...")

        # Create test users
        users = [
            UserTable(
                email="admin@aurelinx.com",
                full_name="Admin User",
                hashed_password=hash_password("AdminPassword123"),
                is_active=True,
                is_admin=True,
            ),
            UserTable(
                email="manager@aurelinx.com",
                full_name="Manager User",
                hashed_password=hash_password("ManagerPassword123"),
                is_active=True,
                is_admin=False,
            ),
        ]

        for user in users:
            session.add(user)
        session.commit()
        print(f"✅ Created {len(users)} users")

        # Create employees
        employee_names = [
            "Alice Johnson",
            "Bob Smith",
            "Carol White",
            "David Brown",
            "Eva Garcia",
            "Frank Miller",
            "Grace Lee",
            "Henry Davis",
            "Iris Martinez",
            "Jack Wilson",
            "Kelly Anderson",
            "Liam Thomas",
            "Mary Jackson",
            "Nathan Harris",
            "Olivia Martin",
            "Peter Thompson",
            "Quinn Roberts",
            "Rachel Phillips",
            "Samuel Edwards",
            "Tina Campbell",
        ]

        employees = []
        for name in employee_names:
            emp = EmployeeTable(
                full_name=name,
                email=f"{name.lower().replace(' ', '.')}@company.com",
                department=DEPARTMENTS[random.randint(0, len(DEPARTMENTS) - 1)],
                role=ROLES[random.randint(0, len(ROLES) - 1)],
                sentiment_score=round(random.uniform(0.3, 1.0), 2),
                is_at_risk=random.random() < 0.2,
                retention_prob=round(random.uniform(0.0, 1.0), 2),
            )
            employees.append(emp)
            session.add(emp)

        session.commit()
        print(f"✅ Created {len(employees)} employees")

        # Create skills for employees
        skills_created = 0
        for emp in employees:
            for _ in range(random.randint(2, 4)):
                skill = SkillTable(
                    name=SKILL_NAMES[random.randint(0, len(SKILL_NAMES) - 1)],
                    level=random.randint(1, 5),
                    employee_id=emp.id,
                )
                session.add(skill)
                skills_created += 1

        session.commit()
        print(f"✅ Created {skills_created} skills")

        # Create experiences for employees
        experiences_created = 0
        for emp in employees:
            for _ in range(random.randint(1, 3)):
                exp = ExperienceTable(
                    company=COMPANIES[random.randint(0, len(COMPANIES) - 1)],
                    position=ROLES[random.randint(0, len(ROLES) - 1)],
                    duration_years=round(random.uniform(0.5, 10), 1),
                    description=f"Experience in {random.choice(['backend', 'frontend', 'DevOps', 'data'])}",
                    employee_id=emp.id,
                )
                session.add(exp)
                experiences_created += 1

        session.commit()
        print(f"✅ Created {experiences_created} experiences")

        # Create candidates
        candidate_names = [
            "John Anderson",
            "Sarah Mitchell",
            "Michael Chen",
            "Jennifer Brown",
            "Christopher Lee",
            "Emily Davis",
            "Joshua Wilson",
            "Amanda Harris",
            "Daniel Martinez",
            "Lauren Thompson",
        ]

        candidates = []
        for name in candidate_names:
            cand = CandidateTable(
                full_name=name,
                email=f"candidate.{name.lower().replace(' ', '.')}@example.com",
                department=DEPARTMENTS[random.randint(0, len(DEPARTMENTS) - 1)],
                role=ROLES[random.randint(0, len(ROLES) - 1)],
                sentiment_score=round(random.uniform(0.6, 1.0), 2),
                match_score=round(random.uniform(0.4, 1.0), 2),
            )
            candidates.append(cand)
            session.add(cand)

        session.commit()
        print(f"✅ Created {len(candidates)} candidates")

        # Create skills for candidates
        cand_skills_created = 0
        for cand in candidates:
            for _ in range(random.randint(2, 4)):
                skill = SkillTable(
                    name=SKILL_NAMES[random.randint(0, len(SKILL_NAMES) - 1)],
                    level=random.randint(1, 5),
                    candidate_id=cand.id,
                )
                session.add(skill)
                cand_skills_created += 1

        session.commit()
        print(f"✅ Created {cand_skills_created} candidate skills")

        # Create experiences for candidates
        cand_experiences_created = 0
        for cand in candidates:
            for _ in range(random.randint(1, 2)):
                exp = ExperienceTable(
                    company=COMPANIES[random.randint(0, len(COMPANIES) - 1)],
                    position=ROLES[random.randint(0, len(ROLES) - 1)],
                    duration_years=round(random.uniform(0.5, 8), 1),
                    description=f"Experience in {random.choice(['backend', 'frontend', 'DevOps', 'data'])}",
                    candidate_id=cand.id,
                )
                session.add(exp)
                cand_experiences_created += 1

        session.commit()
        print(f"✅ Created {cand_experiences_created} candidate experiences")

        print("\n✅ Database seeding complete!")
        print(f"   - Users: {len(users)}")
        print(f"   - Employees: {len(employees)}")
        print(f"   - Candidates: {len(candidates)}")
        print("\n📝 Test credentials:")
        print("   Admin: admin@aurelinx.com / AdminPassword123")
        print("   User: manager@aurelinx.com / ManagerPassword123")


if __name__ == "__main__":
    seed_production_data()
