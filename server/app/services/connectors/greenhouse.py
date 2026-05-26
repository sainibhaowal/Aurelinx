from typing import Dict, List
from sqlmodel import Session, select
from app.services.connectors.base import BaseConnector
from app.models.database import CandidateTable


class GreenhouseConnector(BaseConnector):
    provider = "greenhouse"
    source_type = "ats"

    def fetch_records(self, connection: Dict) -> List[Dict]:
        # Lean v1 adapter: map from local candidate store as source simulation.
        # Replace with real Greenhouse Harvest API calls when credentials are configured.
        session: Session = connection["session"]
        rows = session.exec(select(CandidateTable).limit(5000)).all()
        data = []
        for c in rows:
            data.append(
                {
                    "external_id": str(c.id),
                    "full_name": c.full_name,
                    "email": c.email,
                    "department": c.department,
                    "role": c.role,
                    "match_score": c.match_score,
                }
            )
        return data
