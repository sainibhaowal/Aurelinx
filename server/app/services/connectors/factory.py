from app.services.connectors.workday import WorkdayConnector
from app.services.connectors.greenhouse import GreenhouseConnector

CONNECTOR_MAP = {
    "workday": WorkdayConnector,
    "greenhouse": GreenhouseConnector,
}


def get_connector(provider: str):
    cls = CONNECTOR_MAP.get((provider or "").lower())
    return cls() if cls else None
