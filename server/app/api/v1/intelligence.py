"""
Aurelinx Core Intelligence Engine
Advanced Algorithms & Data Structures for Talent Optimization
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from uuid import UUID
from datetime import datetime
import functools
import math
import random
from typing import List, Dict, Any, Tuple, Set
from collections import deque
import heapq

from app.models.database import EmployeeTable, SkillTable, get_session
from app.core.security import get_current_user, TokenData
from app.core.logging_config import get_logger
from app.core.data_policy import filter_real_records

router = APIRouter(prefix="/intelligence", tags=["intelligence"])
logger = get_logger(__name__)

# =====================================================================
# 1. SEMANTIC SKILL ONTOLOGY & DIJKSTRA MATCHING
# =====================================================================

# Curated, weighted Skill Graph (directed)
# Edge weight = "Semantic distance" (smaller means closer/easier to bridge)
SKILL_GRAPH: Dict[str, List[Tuple[str, float]]] = {
    # Frontend Ecosystem
    "React": [
        ("JavaScript", 0.05),
        ("Next.js", 0.1),
        ("TypeScript", 0.15),
        ("Frontend", 0.2),
    ],
    "Next.js": [("React", 0.05), ("Frontend", 0.15), ("TypeScript", 0.1)],
    "TypeScript": [("JavaScript", 0.05)],
    "JavaScript": [("Frontend", 0.3), ("Node.js", 0.25)],
    "Vue.js": [("JavaScript", 0.1), ("Frontend", 0.25)],
    "Angular": [("TypeScript", 0.1), ("Frontend", 0.25)],
    "Frontend": [("UI/UX", 0.4)],
    # Backend & System
    "Node.js": [("JavaScript", 0.1), ("Backend", 0.2)],
    "Python": [("Backend", 0.15), ("Data Science", 0.2), ("AI/ML", 0.25)],
    "Django": [("Python", 0.05), ("Backend", 0.1)],
    "FastAPI": [("Python", 0.05), ("Backend", 0.1)],
    "Go": [("Backend", 0.2), ("System Design", 0.25)],
    "Java": [("Backend", 0.2), ("Spring Boot", 0.1)],
    "Spring Boot": [("Java", 0.05), ("Backend", 0.1)],
    "Backend": [("System Design", 0.35), ("SQL", 0.2)],
    "SQL": [("PostgreSQL", 0.1), ("Database", 0.1)],
    "PostgreSQL": [("SQL", 0.05), ("Database", 0.1)],
    # AI / Machine Learning
    "AI/ML": [("Deep Learning", 0.2), ("Machine Learning", 0.1)],
    "Machine Learning": [("AI/ML", 0.1), ("Python", 0.2), ("Data Science", 0.15)],
    "Deep Learning": [
        ("Machine Learning", 0.1),
        ("PyTorch", 0.15),
        ("TensorFlow", 0.15),
    ],
    "PyTorch": [("Deep Learning", 0.05), ("Python", 0.15), ("TensorFlow", 0.2)],
    "TensorFlow": [("Deep Learning", 0.05), ("Python", 0.15), ("PyTorch", 0.2)],
    "Data Science": [("Python", 0.1), ("SQL", 0.25)],
    "NLP": [("Deep Learning", 0.15), ("AI/ML", 0.2)],
    "Computer Vision": [("Deep Learning", 0.15), ("AI/ML", 0.2)],
    # DevOps / Infrastructure
    "DevOps": [("Docker", 0.1), ("Kubernetes", 0.15), ("AWS", 0.2)],
    "Docker": [("DevOps", 0.1), ("Kubernetes", 0.1)],
    "Kubernetes": [("Docker", 0.05), ("DevOps", 0.1), ("AWS", 0.15)],
    "AWS": [("DevOps", 0.2), ("Cloud Architecture", 0.15)],
    "Cloud Architecture": [("System Design", 0.25)],
    # Management & Soft Skills
    "Leadership": [("Product Management", 0.3), ("Scrum", 0.35)],
    "Product Management": [("Leadership", 0.2), ("Agile", 0.2)],
    "Agile": [("Scrum", 0.1)],
    "Scrum": [("Agile", 0.05)],
}

# Build full graph with forward and reverse edges once globally
FULL_SKILL_GRAPH: Dict[str, List[Tuple[str, float]]] = {}


def _init_full_graph():
    # Copy forward edges
    for source, targets in SKILL_GRAPH.items():
        if source not in FULL_SKILL_GRAPH:
            FULL_SKILL_GRAPH[source] = []
        for target, w in targets:
            FULL_SKILL_GRAPH[source].append((target, w))
            if target not in FULL_SKILL_GRAPH:
                FULL_SKILL_GRAPH[target] = []
            # Add reverse edge with a 2.5x penalty
            FULL_SKILL_GRAPH[target].append((source, w * 2.5))


_init_full_graph()


@functools.lru_cache(maxsize=4096)
def dijkstra_distance(start: str, end: str) -> float:
    """Computes the shortest semantic distance in the skill graph."""
    # Normalize casings to make comparison simple
    start_norm = next((k for k in SKILL_GRAPH if k.lower() == start.lower()), start)
    end_norm = next((k for k in SKILL_GRAPH if k.lower() == end.lower()), end)

    if start_norm == end_norm:
        return 0.0

    if start_norm not in FULL_SKILL_GRAPH:
        return 99.0  # Large distance if node not in ontology

    queue = [(0.0, start_norm)]
    distances = {start_norm: 0.0}
    visited = set()

    while queue:
        dist, node = heapq.heappop(queue)

        if node in visited:
            continue
        visited.add(node)

        if node == end_norm:
            return dist

        # Get precomputed neighbors (both forward and penalty reverse edges)
        neighbors = FULL_SKILL_GRAPH.get(node, [])
        for neighbor, weight in neighbors:
            if neighbor in visited:
                continue
            new_dist = dist + weight
            if neighbor not in distances or new_dist < distances[neighbor]:
                distances[neighbor] = new_dist
                heapq.heappush(queue, (new_dist, neighbor))

    return distances.get(end_norm, 99.0)


def calculate_skill_match(
    candidate_skills: List[Dict[str, Any]], target_skills: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Calculates detailed matching scores between two skill sets using Graph Shortest Path.
    Includes skill match paths and missing-but-bridgeable skills.
    """
    matches = []
    total_score = 0.0

    for target in target_skills:
        target_name = target["name"]
        target_lvl = target["level"]

        best_match_name = None
        best_match_score = 0.0
        best_path_distance = 99.0

        for cand in candidate_skills:
            cand_name = cand["name"]
            cand_lvl = cand["level"]

            # Dijkstra path distance
            dist = dijkstra_distance(cand_name, target_name)

            # Calculate match quality based on distance and proficiency
            if dist < 99.0:
                dist_factor = 1.0 / (1.0 + dist)
                lvl_factor = min(1.0, cand_lvl / target_lvl)
                match_val = dist_factor * lvl_factor
                if match_val > best_match_score:
                    best_match_score = match_val
                    best_match_name = cand_name
                    best_path_distance = dist

        # Score mapping:
        # 1.0 = Perfect match
        # >0.7 = Strong adjacency
        # >0.4 = Moderate gap, needs learning
        # <0.4 = Major gap
        total_score += best_match_score

        matches.append(
            {
                "target_skill": target_name,
                "target_level": target_lvl,
                "matched_by_skill": best_match_name,
                "semantic_distance": (
                    round(best_path_distance, 3) if best_path_distance < 99 else None
                ),
                "match_confidence": round(best_match_score, 3),
                "status": (
                    "Perfect"
                    if best_match_score >= 0.95
                    else (
                        "Highly Transferable"
                        if best_match_score >= 0.7
                        else (
                            "Trainable Gap"
                            if best_match_score >= 0.4
                            else "Missing Node"
                        )
                    )
                ),
            }
        )

    overall_match = round(total_score / len(target_skills), 3) if target_skills else 0.0
    return {"overall_compatibility": overall_match, "detailed_matches": matches}


@router.post("/skill-match")
def match_skills(
    payload: Dict[str, Any],
    session: Session = Depends(get_session),
    current_user: TokenData = Depends(get_current_user),
):
    """API endpoint to match a custom target skillset against all employees in the system."""
    target_skills = payload.get("target_skills", [])
    if not target_skills:
        raise HTTPException(status_code=400, detail="target_skills list is required")

    employees = [
        emp
        for emp in filter_real_records(session.exec(select(EmployeeTable)).all())
        if emp is not None
        and getattr(emp, "id", None) is not None
        and getattr(emp, "join_date", None) is not None
    ]
    if not employees:
        return []

    # Pre-fetch all skills once and group by employee_id to avoid O(N) database queries
    all_skills = [
        s
        for s in session.exec(select(SkillTable)).all()
        if s is not None
        and getattr(s, "employee_id", None) is not None
        and getattr(s, "name", None)
    ]
    skills_by_employee: Dict[UUID, List[SkillTable]] = {}
    for s in all_skills:
        emp_id = s.employee_id
        if emp_id not in skills_by_employee:
            skills_by_employee[emp_id] = []
        skills_by_employee[emp_id].append(s)

    results = []

    for emp in employees:
        skills = skills_by_employee.get(emp.id, [])
        cand_skills = [{"name": s.name, "level": s.level} for s in skills]

        match_info = calculate_skill_match(cand_skills, target_skills)
        results.append(
            {
                "employee_id": emp.id,
                "full_name": emp.full_name,
                "department": emp.department,
                "role": emp.role,
                "match_details": match_info,
            }
        )

    # Sort by compatibility
    results.sort(
        key=lambda x: x["match_details"]["overall_compatibility"], reverse=True
    )
    return results[:5]


# =====================================================================
# 2. COMBINATORIAL TEAM ASSEMBLY (SIMULATED ANNEALING)
# =====================================================================


def evaluate_team(
    team: List[EmployeeTable],
    target_skills: List[Dict[str, Any]],
    budget_cap: float,
    session: Session,
    skills_by_employee: Dict[UUID, List[SkillTable]] = None,
) -> Tuple[float, Dict[str, Any]]:
    """Calculates coverage score (energy) for team assembly."""
    if not team:
        return -9999.0, {}

    # Combine candidate skills
    merged_skills: Dict[str, int] = {}
    total_cost = 0.0

    for emp in team:
        # Estimate salary/cost from role/sentiment/mock basis
        base_salary = 80000 + (
            len(emp.role) * 1500
        )  # Algorithmic pricing based on position
        total_cost += base_salary

        if skills_by_employee is not None:
            skills = skills_by_employee.get(emp.id, [])
        else:
            skills = session.exec(
                select(SkillTable).where(SkillTable.employee_id == emp.id)
            ).all()
        for s in skills:
            merged_skills[s.name] = max(merged_skills.get(s.name, 0), s.level)

    # Calculate coverage
    coverage_score = 0.0
    skill_details = []

    for target in target_skills:
        t_name = target["name"]
        t_lvl = target["level"]

        # Look for perfect or adjacent match
        best_match_lvl = 0
        best_skill_contrib = ""

        for cand_s_name, cand_lvl in merged_skills.items():
            dist = dijkstra_distance(cand_s_name, t_name)
            if dist < 99.0:
                dist_factor = 1.0 / (1.0 + dist)
                effective_lvl = cand_lvl * dist_factor
                if effective_lvl > best_match_lvl:
                    best_match_lvl = effective_lvl
                    best_skill_contrib = cand_s_name

        coverage_score += min(1.0, best_match_lvl / t_lvl) if t_lvl > 0 else 0.0
        skill_details.append(
            {
                "skill": t_name,
                "target_level": t_lvl,
                "achieved_effective_level": round(best_match_lvl, 2),
                "contributed_by_skill": best_skill_contrib,
            }
        )

    coverage_pct = coverage_score / len(target_skills) if target_skills else 0.0

    # Penalties
    cost_penalty = 0.0
    if total_cost > budget_cap:
        over = total_cost - budget_cap
        cost_penalty = (over / budget_cap) * 5.0  # Severe penalty for blowing budget

    # Overall energy: We want to maximize coverage and minimize cost penalty
    energy = (coverage_pct * 10.0) - cost_penalty

    return energy, {
        "coverage_percentage": round(coverage_pct * 100, 1),
        "total_cost": total_cost,
        "is_under_budget": total_cost <= budget_cap,
        "budget_usage_percentage": round((total_cost / budget_cap) * 100, 1),
        "skills_coverage": skill_details,
    }


@router.post("/team-optimize")
def optimize_team(
    payload: Dict[str, Any],
    session: Session = Depends(get_session),
    current_user: TokenData = Depends(get_current_user),
):
    """
    Implements a Simulated Annealing algorithm to find the optimal combination of
    employees that satisfies skill needs under a budget cap.
    """
    target_skills = payload.get("target_skills", [])
    budget_cap = float(payload.get("budget_cap", 300000.0))
    max_team_size = int(payload.get("max_team_size", 4))

    if not target_skills:
        raise HTTPException(status_code=400, detail="target_skills are required")

    employees = [
        emp
        for emp in filter_real_records(session.exec(select(EmployeeTable)).all())
        if emp is not None and getattr(emp, "id", None) is not None
    ]
    if len(employees) < max_team_size:
        raise HTTPException(
            status_code=400,
            detail="Not enough employees in database to construct a team of requested size",
        )

    # Pre-fetch all skills once and group by employee_id to avoid queries inside Simulated Annealing iterations
    all_skills = [
        s
        for s in session.exec(select(SkillTable)).all()
        if s is not None
        and getattr(s, "employee_id", None) is not None
        and getattr(s, "name", None)
    ]
    skills_by_employee: Dict[UUID, List[SkillTable]] = {}
    for s in all_skills:
        emp_id = s.employee_id
        if emp_id not in skills_by_employee:
            skills_by_employee[emp_id] = []
        skills_by_employee[emp_id].append(s)

    # Simulated Annealing Hyperparameters
    temp = 10.0
    cooling_rate = 0.85
    min_temp = 0.1

    # Initial state: random selection
    current_team = random.sample(employees, max_team_size)
    current_energy, current_breakdown = evaluate_team(
        current_team, target_skills, budget_cap, session, skills_by_employee
    )

    best_team = list(current_team)
    best_energy = current_energy
    best_breakdown = dict(current_breakdown)

    history = []
    step = 0

    while temp > min_temp:
        step += 1
        # Propose neighbor: Swap one random team member with one from the remaining pool
        remaining = [e for e in employees if e not in current_team]
        if not remaining:
            break

        candidate_team = list(current_team)
        swap_idx = random.randint(0, len(candidate_team) - 1)
        new_member = random.choice(remaining)
        candidate_team[swap_idx] = new_member

        cand_energy, cand_breakdown = evaluate_team(
            candidate_team, target_skills, budget_cap, session, skills_by_employee
        )

        # Accept criteria (Metropolis Hastings)
        delta = cand_energy - current_energy
        if delta > 0 or random.random() < math.exp(delta / temp):
            current_team = candidate_team
            current_energy = cand_energy
            current_breakdown = cand_breakdown

            if current_energy > best_energy:
                best_team = list(current_team)
                best_energy = current_energy
                best_breakdown = dict(current_breakdown)

        history.append(
            {
                "step": step,
                "temperature": round(temp, 3),
                "energy": round(current_energy, 3),
                "coverage": current_breakdown.get("coverage_percentage", 0),
                "cost": current_breakdown.get("total_cost", 0),
            }
        )

        temp *= cooling_rate

    return {
        "optimized_team": [
            {
                "id": emp.id,
                "full_name": emp.full_name,
                "role": emp.role,
                "department": emp.department,
                "estimated_cost": 80000 + (len(emp.role) * 1500),
            }
            for emp in best_team
        ],
        "optimization_history": history,
        "metrics": best_breakdown,
        "total_optimization_steps": step,
    }


# =====================================================================
# 3. ATTRITION SURVIVAL HAZARD RATE PREDICTOR
# =====================================================================


@router.get("/attrition-hazard")
def calculate_hazard_rate(
    session: Session = Depends(get_session),
    current_user: TokenData = Depends(get_current_user),
):
    """
    Computes a mathematical Cox Proportional Hazards survival prediction
    for every employee. Returns SHAP-style covariate contribution breakdowns.
    """
    employees = [
        emp
        for emp in filter_real_records(session.exec(select(EmployeeTable)).all())
        if emp is not None
        and getattr(emp, "id", None) is not None
        and getattr(emp, "join_date", None) is not None
    ]
    if not employees:
        return []

    # Pre-fetch all skills once and group by employee_id to avoid O(N) database queries
    all_skills = [
        s
        for s in session.exec(select(SkillTable)).all()
        if s is not None
        and getattr(s, "employee_id", None) is not None
        and getattr(s, "name", None)
    ]
    skills_by_employee: Dict[UUID, List[SkillTable]] = {}
    for s in all_skills:
        emp_id = s.employee_id
        if emp_id not in skills_by_employee:
            skills_by_employee[emp_id] = []
        skills_by_employee[emp_id].append(s)

    results = []

    for emp in employees:
        # 1. Tenure in months (computed from join_date)
        tenure_months = max(1.0, (datetime.utcnow() - emp.join_date).days / 30.4)
        sentiment_score = float(emp.sentiment_score or 0.5)
        risk_flag = bool(emp.is_at_risk)

        # 2. Baseline Hazard Function h_0(t) based on tenure
        # 1-year mark (12mo) and 3-year mark (36mo) have peaks in baseline risk
        peak_1yr = math.exp(
            -0.5 * ((tenure_months - 12.0) / 3.0) ** 2
        )  # Gaussian peak at 1 year
        peak_3yr = math.exp(
            -0.5 * ((tenure_months - 36.0) / 6.0) ** 2
        )  # Gaussian peak at 3 years
        baseline_hazard = 0.05 + 0.12 * peak_1yr + 0.08 * peak_3yr

        # 3. Covariates and SHAP Contribution math
        covariates = []
        log_hazard_ratio = 0.0

        # Morale covariate (Sentiment)
        morale_effect = -2.5 * (sentiment_score - 0.5)
        log_hazard_ratio += morale_effect
        covariates.append(
            {
                "factor": "Organizational Morale Index",
                "val": round(sentiment_score, 2),
                "impact_direction": "risky" if morale_effect > 0 else "protective",
                "impact_percentage": round((math.exp(morale_effect) - 1.0) * 100, 1),
            }
        )

        # Salary dissatisfaction / At-risk status
        if risk_flag:
            risk_effect = 1.2
            log_hazard_ratio += risk_effect
            covariates.append(
                {
                    "factor": "Historical Risk Trigger Flag",
                    "val": 1,
                    "impact_direction": "risky",
                    "impact_percentage": round((math.exp(risk_effect) - 1.0) * 100, 1),
                }
            )

        # Role mismatch / Overqualification
        skills = skills_by_employee.get(emp.id, [])
        overqualified = len(skills) > 5
        if overqualified:
            overqual_effect = 0.55
            log_hazard_ratio += overqual_effect
            covariates.append(
                {
                    "factor": "Skill Density / Task Fatigue",
                    "val": len(skills),
                    "impact_direction": "risky",
                    "impact_percentage": round(
                        (math.exp(overqual_effect) - 1.0) * 100, 1
                    ),
                }
            )

        # Calculate actual hazard and survival timeline (1 to 12 months forecast)
        hazard_multiplier = math.exp(log_hazard_ratio)
        current_hazard = baseline_hazard * hazard_multiplier

        # Compute survival curve S(t) = P(Tenure > t) for next 12 months
        survival_timeline = []
        cumulative_hazard = 0.0
        for m in range(1, 13):
            # Future tenure projection
            projected_t = tenure_months + m
            future_peak_1yr = math.exp(-0.5 * ((projected_t - 12.0) / 3.0) ** 2)
            future_peak_3yr = math.exp(-0.5 * ((projected_t - 36.0) / 6.0) ** 2)
            future_baseline = 0.05 + 0.12 * future_peak_1yr + 0.08 * future_peak_3yr

            cumulative_hazard += future_baseline * hazard_multiplier
            survival_prob = math.exp(-cumulative_hazard)
            survival_timeline.append(
                {
                    "month": m,
                    "survival_probability": round(survival_prob, 3),
                    "attrition_probability": round(1.0 - survival_prob, 3),
                }
            )

        results.append(
            {
                "employee_id": emp.id,
                "full_name": emp.full_name,
                "department": emp.department,
                "role": emp.role,
                "tenure_months": round(tenure_months, 1),
                "hazard_ratio": round(hazard_multiplier, 2),
                "monthly_attrition_hazard": round(min(1.0, current_hazard), 3),
                "covariates_explain": covariates,
                "survival_forecast": survival_timeline,
            }
        )

    return results


# =====================================================================
# 4. ORGANIZATIONAL NETWORK ANALYSIS (ONA)
# =====================================================================


@router.get("/ona")
def compute_ona(
    limit: int = 45,
    session: Session = Depends(get_session),
    current_user: TokenData = Depends(get_current_user),
):
    """
    Builds a corporate collaboration graph based on shared parameters.
    Computes PageRank (influence) and BFS Brandes Betweenness Centrality (bridges).
    """
    employees = [
        emp
        for emp in filter_real_records(session.exec(select(EmployeeTable).limit(limit)).all())
        if emp is not None and getattr(emp, "id", None) is not None
    ]
    if not employees:
        return {"nodes": [], "links": []}

    # Pre-fetch all skills once and group by employee_id to avoid O(N^2) database queries
    all_skills = [
        s
        for s in session.exec(select(SkillTable)).all()
        if s is not None
        and getattr(s, "employee_id", None) is not None
        and getattr(s, "name", None)
    ]
    skills_by_employee: Dict[UUID, Set[str]] = {}
    for s in all_skills:
        emp_id = s.employee_id
        if emp_id not in skills_by_employee:
            skills_by_employee[emp_id] = set()
        skills_by_employee[emp_id].add(str(s.name))

    # Build Edges based on shared department and overlap
    # We will build links if they are in same department or share similar skills
    nodes = []
    {emp.id: idx for idx, emp in enumerate(employees)}

    # Adjacency list for analysis
    adj: Dict[UUID, Set[UUID]] = {emp.id: set() for emp in employees}

    # Calculate ONA graph link weights
    # Query any B2B Jira active collaboration logs from database to inject live weights!
    from app.models.database import IntegrationLogTable

    try:
        jira_logs = session.exec(
            select(IntegrationLogTable).where(
                IntegrationLogTable.integration_name == "jira",
                IntegrationLogTable.status == "success",
            )
        ).all()
    except Exception:
        jira_logs = []

    links = []
    for i in range(len(employees)):
        emp_a = employees[i]
        skills_a = skills_by_employee.get(emp_a.id, set())

        for j in range(i + 1, len(employees)):
            emp_b = employees[j]
            skills_b = skills_by_employee.get(emp_b.id, set())

            weight = 0.0
            if emp_a.department == emp_b.department:
                weight += 0.4
            shared_skills = skills_a & skills_b
            if shared_skills:
                weight += min(0.4, len(shared_skills) * 0.1)

            # Dynamic Jira Ingestion edge boost!
            collab_count = 0
            for log in jira_logs:
                details_lower = log.details.lower()
                if (
                    emp_a.email.lower() in details_lower
                    and emp_b.email.lower() in details_lower
                ):
                    collab_count += 1
            if collab_count > 0:
                weight += min(0.9, collab_count * 0.3)

            if weight > 0.1:
                adj[emp_a.id].add(emp_b.id)
                adj[emp_b.id].add(emp_a.id)
                links.append(
                    {
                        "source": str(emp_a.id),
                        "target": str(emp_b.id),
                        "weight": round(weight, 2),
                    }
                )

    # A. PageRank Power Iteration
    # PR(u) = (1-d)/N + d * sum( PR(v)/L(v) )
    N = len(employees)
    d = 0.85
    pr = {emp.id: 1.0 / N for emp in employees}

    # Run PageRank for 20 iterations
    for _ in range(20):
        new_pr = {}
        for emp in employees:
            rank_sum = 0.0
            for other in employees:
                if emp.id in adj[other.id]:
                    rank_sum += pr[other.id] / len(adj[other.id])
            new_pr[emp.id] = (1 - d) / N + d * rank_sum
        pr = new_pr

    # B. Brandes Betweenness Centrality
    # Measures the extent to which a node lies on paths between other nodes.
    betweenness = {emp.id: 0.0 for emp in employees}

    for s in employees:
        s_id = s.id
        stack = []
        P = {emp.id: [] for emp in employees}
        sigma = {emp.id: 0 for emp in employees}
        sigma[s_id] = 1
        d_map = {emp.id: -1 for emp in employees}
        d_map[s_id] = 0

        queue = deque([s_id])
        while queue:
            v = queue.popleft()
            stack.append(v)
            for w in adj[v]:
                # w found for first time
                if d_map[w] < 0:
                    d_map[w] = d_map[v] + 1
                    queue.append(w)
                # shortest path to w via v?
                if d_map[w] == d_map[v] + 1:
                    sigma[w] += sigma[v]
                    P[w].append(v)

        delta = {emp.id: 0.0 for emp in employees}
        while stack:
            w = stack.pop()
            for v in P[w]:
                delta[v] += (sigma[v] / sigma[w]) * (1.0 + delta[w])
            if w != s_id:
                betweenness[w] += delta[w]

    # Normalize ONA metrics for elegant display
    max_pr = max(pr.values()) if pr.values() else 1.0
    max_bc = max(betweenness.values()) if betweenness.values() else 1.0

    for emp in employees:
        nodes.append(
            {
                "id": str(emp.id),
                "name": emp.full_name,
                "department": emp.department,
                "role": emp.role,
                "influence_pagerank": round(pr[emp.id] / max_pr, 3),
                "bridge_betweenness": round(betweenness[emp.id] / max_bc, 3),
            }
        )

    return {"nodes": nodes, "links": links}


# =====================================================================
# 5. CAREER PATH MARKOV TRANSITION ROADMAP
# =====================================================================

# Transition Matrix: Probabilities of promotion/lateral moves
MARKOV_TRANSITIONS: Dict[str, Dict[str, float]] = {
    "Junior Software Engineer": {
        "Software Engineer": 0.75,
        "QA Engineer": 0.10,
        "Junior Software Engineer": 0.15,
    },
    "Software Engineer": {
        "Senior Software Engineer": 0.60,
        "DevOps Engineer": 0.15,
        "Product Owner": 0.10,
        "Software Engineer": 0.15,
    },
    "QA Engineer": {"QA Lead": 0.70, "Software Engineer": 0.20, "QA Engineer": 0.10},
    "DevOps Engineer": {
        "Senior DevOps Engineer": 0.70,
        "Cloud Architect": 0.20,
        "DevOps Engineer": 0.10,
    },
    "Senior Software Engineer": {
        "Tech Lead": 0.45,
        "Engineering Manager": 0.35,
        "Solutions Architect": 0.15,
        "Senior Software Engineer": 0.05,
    },
    "Tech Lead": {
        "Principal Engineer": 0.50,
        "Engineering Manager": 0.40,
        "Tech Lead": 0.10,
    },
    "Engineering Manager": {
        "Director of Engineering": 0.80,
        "Engineering Manager": 0.20,
    },
    "Director of Engineering": {
        "VP of Engineering": 0.90,
        "Director of Engineering": 0.10,
    },
    # Generic catch-alls to ensure no dead ends
    "VP of Engineering": {"VP of Engineering": 1.0},
    "Principal Engineer": {"Principal Engineer": 1.0},
    "QA Lead": {"Engineering Manager": 0.4, "QA Lead": 0.6},
    "Senior DevOps Engineer": {"Cloud Architect": 0.5, "Senior DevOps Engineer": 0.5},
    "Cloud Architect": {"Principal Engineer": 0.4, "Cloud Architect": 0.6},
    "Product Owner": {"Product Manager": 0.8, "Product Owner": 0.2},
    "Product Manager": {"Director of Product": 0.9, "Product Manager": 0.1},
    "Director of Product": {"Director of Product": 1.0},
}

# Role Required Skills ontology for skill gap extraction
ROLE_SKILL_REQUIREMENTS: Dict[str, List[str]] = {
    "Software Engineer": ["React", "JavaScript", "Python", "SQL"],
    "Senior Software Engineer": [
        "React",
        "TypeScript",
        "FastAPI",
        "System Design",
        "SQL",
    ],
    "DevOps Engineer": ["Docker", "Kubernetes", "AWS", "DevOps"],
    "Tech Lead": ["System Design", "Leadership", "Agile", "Cloud Architecture"],
    "Engineering Manager": ["Leadership", "Agile", "Scrum", "Product Management"],
    "Principal Engineer": ["System Design", "Cloud Architecture", "Go", "Kubernetes"],
}


def get_markov_predictions(current_role: str, steps: int = 3) -> List[Dict[str, Any]]:
    """Runs a matrix-multiplication style prediction on next transitions."""
    # Find matching role key
    current_key = next(
        (k for k in MARKOV_TRANSITIONS if k.lower() == current_role.lower()), None
    )
    if not current_key:
        # Default starting state
        current_key = "Software Engineer"

    state_probs = {current_key: 1.0}
    roadmaps = []

    for step in range(1, steps + 1):
        next_probs = {}
        for state, prob in state_probs.items():
            transitions = MARKOV_TRANSITIONS.get(state, {state: 1.0})
            for next_state, trans_prob in transitions.items():
                next_probs[next_state] = next_probs.get(next_state, 0.0) + (
                    prob * trans_prob
                )

        state_probs = next_probs

        # Sort and take top transitions
        sorted_transitions = sorted(
            state_probs.items(), key=lambda x: x[1], reverse=True
        )
        top_moves = []
        for role, p in sorted_transitions:
            if p > 0.05 and role != current_key:  # Filter noise & static self loops
                top_moves.append(
                    {
                        "target_role": role,
                        "probability": round(p, 3),
                        "required_skills_missing": ROLE_SKILL_REQUIREMENTS.get(
                            role, []
                        ),
                    }
                )

        roadmaps.append({"step_years": step, "predictions": top_moves})

    return roadmaps


@router.get("/career-path/{employee_id}")
def predict_career_path(
    employee_id: UUID,
    session: Session = Depends(get_session),
    current_user: TokenData = Depends(get_current_user),
):
    """Computes Markov state transitions and skill gaps for career progression."""
    emp = session.get(EmployeeTable, employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    current_role = emp.role or "Software Engineer"

    skills = [
        s
        for s in session.exec(
            select(SkillTable).where(SkillTable.employee_id == emp.id)
        ).all()
        if s is not None and getattr(s, "name", None)
    ]
    has_skills = {str(s.name).lower() for s in skills}

    raw_predictions = get_markov_predictions(current_role, steps=3)

    # Process skill gaps
    structured_predictions = []
    for step in raw_predictions:
        processed_moves = []
        for move in step["predictions"]:
            target_r = move["target_role"]
            prob = move["probability"]
            req_skills = move["required_skills_missing"]

            # Extract real skill gaps
            gaps = []
            for rs in req_skills:
                if rs.lower() not in has_skills:
                    # Find semantic gap distance
                    min_dist = 99.0
                    for s in skills:
                        dist = dijkstra_distance(str(s.name), rs)
                        if dist < min_dist:
                            min_dist = dist
                    gaps.append(
                        {
                            "skill": rs,
                            "bridgeable_distance": (
                                round(min_dist, 2) if min_dist < 99 else None
                            ),
                            "difficulty": (
                                "Easy (Semantic Adjacent)"
                                if min_dist <= 0.2
                                else (
                                    "Medium (Indirect Path)"
                                    if min_dist <= 0.6
                                    else "Hard (New Skill Node)"
                                )
                            ),
                        }
                    )

            processed_moves.append(
                {"role": target_r, "transition_probability": prob, "skill_gaps": gaps}
            )

        structured_predictions.append(
            {
                "projected_time_horizon": f"{step['step_years']} Year(s)",
                "possibilities": processed_moves,
            }
        )

    return {
        "employee_id": emp.id,
        "full_name": emp.full_name,
        "current_role": emp.role,
        "career_progression_markov": structured_predictions,
    }
