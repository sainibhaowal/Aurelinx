from langchain_core.tools import tool
from sqlmodel import Session, select
from app.models.database import engine, EmployeeTable, CandidateTable, SkillTable
from app.services.screening_engine import screening_service
import json

def get_tools(api_key: str):
    """
    Returns a list of tools initialized with the user's dynamic API key.
    """

    @tool
    def search_candidates_semantically(query: str):
        """
        Searches the candidate pool using Conceptual/Semantic matching.
        Use this when a manager asks for a specific 'type' of person or skill set.
        """
        return screening_service.get_semantic_matches(query, api_key)

    @tool
    def get_talent_pool(talent_type: str):
        """
        Fetches the list of talent from the database. 
        talent_type must be either 'employee' or 'candidate'.
        """
        with Session(engine) as session:
            if talent_type == 'employee':
                results = session.exec(select(EmployeeTable)).all()
                out = []
                for t in results:
                    skills = session.exec(select(SkillTable).where(SkillTable.employee_id == t.id)).all()
                    out.append({
                        "id": str(t.id),
                        "name": t.full_name,
                        "role": t.role,
                        "department": t.department,
                        "sentiment": t.sentiment_score,
                        "skills": [s.name for s in skills]
                    })
                return out
            else:
                results = session.exec(select(CandidateTable)).all()
                out = []
                for t in results:
                    skills = session.exec(select(SkillTable).where(SkillTable.candidate_id == t.id)).all()
                    out.append({
                        "id": str(t.id),
                        "name": t.full_name,
                        "role": t.role,
                        "department": t.department,
                        "sentiment": t.sentiment_score,
                        "skills": [s.name for s in skills]
                    })
                return out

    @tool
    def analyze_department_sentiment(department: str):
        """
        Calculates the average sentiment and identifies 'At-Risk' employees for a specific department.
        """
        with Session(engine) as session:
            statement = select(EmployeeTable).where(EmployeeTable.department == department)
            employees = session.exec(statement).all()
            
            if not employees:
                return f"No data found for department: {department}"
            
            avg_sentiment = sum(e.sentiment_score for e in employees) / len(employees)
            at_risk = [e.full_name for e in employees if e.is_at_risk]
            
            return {
                "department": department,
                "average_sentiment": round(avg_sentiment, 2),
                "at_risk_count": len(at_risk),
                "at_risk_employees": at_risk
            }

    return [get_talent_pool, analyze_department_sentiment, search_candidates_semantically]
