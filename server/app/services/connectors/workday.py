from sqlmodel import Session, select

from app.models.database import EmployeeTable
from app.services.connectors.base import BaseConnector


class WorkdayConnector(BaseConnector):
    provider = "workday"
    source_type = "hris"

    def fetch_records(self, connection: dict) -> list[dict]:
        # Lean v1 adapter: map from local employee store as source simulation.
        # Replace with real Workday API calls when credentials are configured.
        session: Session = connection["session"]
        rows = session.exec(select(EmployeeTable).limit(5000)).all()
        data = []
        for e in rows:
            data.append(
                {
                    "external_id": str(e.id),
                    "full_name": e.full_name,
                    "email": e.email,
                    "department": e.department,
                    "role": e.role,
                    "sentiment_score": e.sentiment_score,
                    "retention_prob": e.retention_prob,
                    "is_at_risk": e.is_at_risk,
                }
            )
        return data
