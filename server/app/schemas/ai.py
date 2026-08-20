from pydantic import BaseModel


class AnalysisRequest(BaseModel):
    prompt: str
    api_key: str
    provider: str = "openai"  # openai, claude, gemini, groq, lmstudio
    base_url: str | None = None  # Specifically for LM Studio / Local models
    context: dict | None = None
