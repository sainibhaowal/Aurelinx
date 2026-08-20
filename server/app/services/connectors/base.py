class BaseConnector:
    provider = "base"
    source_type = "unknown"

    def fetch_records(self, connection: dict) -> list[dict]:
        raise NotImplementedError
