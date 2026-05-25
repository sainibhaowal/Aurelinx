from typing import Dict, List

class BaseConnector:
    provider = "base"
    source_type = "unknown"

    def fetch_records(self, connection: Dict) -> List[Dict]:
        raise NotImplementedError
