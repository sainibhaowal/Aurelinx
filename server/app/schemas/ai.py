from pydantic import BaseModel
from typing import Optional

class AnalysisRequest(BaseModel):
    prompt: str
    api_key: str
    provider: str = "openai"  # openai, claude, gemini, groq, lmstudio
    base_url: Optional[str] = None  # Specifically for LM Studio / Local models
    context: Optional[dict] = None
