from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from app.agents.tools import get_tools
from app.core.provider_utils import normalize_local_provider_base


def get_llm(provider: str, api_key: str, base_url: str = None):
    """
    LLM Factory to return the correct LangChain LLM instance.
    """
    if provider == "openai":
        return ChatOpenAI(model="gpt-4o", openai_api_key=api_key, temperature=0)
    elif provider == "claude":
        return ChatAnthropic(
            model="claude-3-5-sonnet-20240620", anthropic_api_key=api_key, temperature=0
        )
    elif provider == "gemini":
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-pro", google_api_key=api_key, temperature=0
        )
    elif provider == "groq":
        return ChatOpenAI(
            model="llama-3.1-70b-versatile",
            openai_api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
            temperature=0,
        )
    elif provider == "lmstudio":
        resolved_base = normalize_local_provider_base(base_url)
        return ChatOpenAI(
            model="local-model",
            openai_api_key="not-needed",
            base_url=resolved_base,
            temperature=0,
        )
    else:
        return ChatOpenAI(model="gpt-4o", openai_api_key=api_key, temperature=0)


def create_manager_agent(provider: str, api_key: str, base_url: str = None):
    """
    Creates a Tool-Enabled Manager Agent using the selected Provider.
    """
    llm = get_llm(provider, api_key, base_url)
    tools = get_tools(api_key)

    system_message = (
        "You are the Aurelinx Strategic Managerial Assistant. "
        "You have access to the company's internal talent database. "
        "Your goal is to provide data-driven, strategic recommendations for HR and Operations. "
        "Always use the provided tools to fetch real data before making claims. "
        "For candidate matching, use the 'search_candidates_semantically' tool to find conceptual matches."
    )

    return create_react_agent(llm, tools, state_modifier=system_message)
