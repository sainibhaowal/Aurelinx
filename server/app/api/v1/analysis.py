"""
AI Analysis and Agent endpoints
"""

from datetime import datetime
import asyncio
import json
import re
import time
from typing import Dict, List, Tuple

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from app.api.v1.employees import get_employee_out
from app.api.v1.candidates import get_candidate_out
from app.core.logging_config import get_logger
from app.core.security import TokenData, get_current_user
from app.core.provider_utils import normalize_local_provider_base
from app.core.data_policy import filter_real_records
from app.models.database import (
    CandidateTable,
    CompliancePolicyTable,
    EmployeeTable,
    ForecastScenarioTable,
    InterventionTable,
    MLModelCardTable,
    SkillTable,
    engine,
    get_session,
)
from app.schemas.schemas import (
    AIAnalysisRequest,
    AIAnalysisResponse,
    AICopilotRequest,
    AICopilotResponse,
    SentimentMetric,
    SentimentReportResponse,
)

router = APIRouter(prefix="/ai", tags=["analysis"])
logger = get_logger(__name__)
_SENTIMENT_PREV_SNAPSHOT = {}


def _analytics_snapshot(session: Session) -> dict:
    employees = filter_real_records(session.exec(select(EmployeeTable)).all())
    total = len(employees)
    at_risk = len([e for e in employees if e.is_at_risk])
    at_risk_pct = round((at_risk / total) * 100, 1) if total > 0 else 0.0
    avg_sentiment = (
        round(sum(e.sentiment_score for e in employees) / total, 3)
        if total > 0
        else 0.0
    )

    dept_map = {}
    dept_risk = {}
    for e in employees:
        dept_map[e.department] = dept_map.get(e.department, 0) + 1
        if e.is_at_risk:
            dept_risk[e.department] = dept_risk.get(e.department, 0) + 1

    depts = [
        {"name": name, "count": count}
        for name, count in sorted(dept_map.items(), key=lambda x: x[0])
    ]
    top_risk_dept = None
    top_risk_ratio = 0.0
    for dept_name, dept_total in dept_map.items():
        dept_at_risk = dept_risk.get(dept_name, 0)
        ratio = (dept_at_risk / dept_total) if dept_total > 0 else 0.0
        if ratio > top_risk_ratio:
            top_risk_ratio = ratio
            top_risk_dept = dept_name

    if at_risk_pct >= 20:
        risk_level = "HIGH"
    elif at_risk_pct >= 10:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    low_sentiment_count = len(
        [e for e in employees if (e.sentiment_score or 0.0) < 0.45]
    )
    low_retention_count = len(
        [
            e
            for e in employees
            if (e.retention_prob if e.retention_prob is not None else 0.5) < 0.55
        ]
    )
    flagged_count = len([e for e in employees if e.is_at_risk])
    dept_pressure_count = len(
        [
            d
            for d, total_count in dept_map.items()
            if total_count > 0 and (dept_risk.get(d, 0) / total_count) >= 0.25
        ]
    )
    top_risk_drivers = sorted(
        [
            {"factor": "Low morale signals", "count": low_sentiment_count},
            {"factor": "Retention probability pressure", "count": low_retention_count},
            {"factor": "Policy risk flags", "count": flagged_count},
            {"factor": "Department concentration risk", "count": dept_pressure_count},
        ],
        key=lambda x: x["count"],
        reverse=True,
    )[:3]

    return {
        "total": total,
        "atRisk": at_risk,
        "atRiskPct": at_risk_pct,
        "avgSentiment": avg_sentiment,
        "riskLevel": risk_level,
        "topRiskDepartment": top_risk_dept,
        "topRiskDepartmentRatio": round(top_risk_ratio * 100, 1),
        "topRiskDrivers": top_risk_drivers,
        "depts": depts,
        "timestamp": datetime.utcnow().isoformat(),
    }


def _workspace_context(session: Session) -> Dict:
    employees = filter_real_records(session.exec(select(EmployeeTable)).all())
    top_risky = sorted(
        employees,
        key=lambda e: (
            float(e.retention_prob or 0.5) - float(e.sentiment_score or 0.0),
            e.sentiment_score,
        ),
        reverse=False,
    )[:5]
    interventions = session.exec(
        select(InterventionTable)
        .order_by(InterventionTable.created_at.desc())
        .limit(10)
    ).all()
    policies = session.exec(
        select(CompliancePolicyTable)
        .where(CompliancePolicyTable.status == "active")
        .order_by(CompliancePolicyTable.created_at.desc())
        .limit(5)
    ).all()
    model_cards = session.exec(
        select(MLModelCardTable).order_by(MLModelCardTable.created_at.desc()).limit(5)
    ).all()
    scenarios = session.exec(
        select(ForecastScenarioTable)
        .order_by(ForecastScenarioTable.created_at.desc())
        .limit(3)
    ).all()
    snapshot = _analytics_snapshot(session)
    return {
        "snapshot": snapshot,
        "top_at_risk": [
            {
                "full_name": e.full_name,
                "department": e.department,
                "role": e.role,
                "sentiment_score": e.sentiment_score,
                "retention_prob": e.retention_prob,
                "is_at_risk": e.is_at_risk,
            }
            for e in top_risky
        ],
        "interventions": [
            {
                "title": row.title,
                "status": row.status,
                "priority": row.priority,
                "owner_name": row.owner_name,
                "target_department": row.target_department,
            }
            for row in interventions
        ],
        "policies": [
            {
                "policy_name": row.policy_name,
                "region": row.region,
                "action_type": row.action_type,
                "min_confidence": row.min_confidence,
                "requires_approval": row.requires_approval,
            }
            for row in policies
        ],
        "model_cards": [
            {
                "model_name": row.model_name,
                "version": row.version,
                "status": row.status,
                "pr_auc": row.pr_auc,
                "calibration_error": row.calibration_error,
                "fairness_gap": row.fairness_gap,
            }
            for row in model_cards
        ],
        "scenarios": [
            {
                "name": row.scenario_name,
                "output": row.output_payload,
            }
            for row in scenarios
        ],
    }


def _build_sentiment_metrics(
    employees: List[EmployeeTable], prev_snapshot: dict = None
) -> Tuple[List[SentimentMetric], dict]:
    total = len(employees)
    if total == 0:
        return [], {}

    avg_sentiment = sum(e.sentiment_score for e in employees) / total
    at_risk_count = len([e for e in employees if e.is_at_risk])
    at_risk_ratio = (at_risk_count / total) if total else 0.0
    avg_retention = sum((e.retention_prob or 0.5) for e in employees) / total

    dept_counts = {}
    for e in employees:
        dept_counts[e.department] = dept_counts.get(e.department, 0) + 1
    largest_dept_ratio = max(dept_counts.values()) / total if dept_counts else 0.0
    talent_density = 1.0 - largest_dept_ratio

    leadership_trust = min(max((avg_retention * 0.6) + (avg_sentiment * 0.4), 0.0), 1.0)
    burnout_risk = min(
        max((at_risk_ratio * 0.7) + ((1.0 - avg_sentiment) * 0.3), 0.0), 1.0
    )

    current = {
        "Organizational Morale": round(avg_sentiment, 4),
        "Talent Density": round(talent_density, 4),
        "Burnout Risk": round(burnout_risk, 4),
        "Leadership Trust": round(leadership_trust, 4),
    }

    metrics: List[SentimentMetric] = []
    sample_confidence = min(0.99, 0.72 + (total / 200))
    for idx, (name, score) in enumerate(current.items()):
        prev_score = (prev_snapshot or {}).get(name, score)
        velocity = round(score - prev_score, 4)
        confidence = round(min(0.99, sample_confidence - (idx * 0.01)), 3)
        metrics.append(
            SentimentMetric(
                name=name,
                score=score,
                velocity=velocity,
                confidence=confidence,
            )
        )

    return metrics, current


def _tokenize(text: str) -> List[str]:
    return re.findall(r"[a-z0-9\+\#\.]{2,}", text.lower())


def _score_employee(
    prompt: str, employee: EmployeeTable, skill_names: List[str]
) -> float:
    prompt_tokens = set(_tokenize(prompt))
    role_tokens = set(_tokenize(employee.role))
    dept_tokens = set(_tokenize(employee.department))
    skill_tokens = set(_tokenize(" ".join(skill_names)))

    role_hits = len(prompt_tokens & role_tokens)
    dept_hits = len(prompt_tokens & dept_tokens)
    skill_hits = len(prompt_tokens & skill_tokens)

    score = (skill_hits * 2.5) + (role_hits * 2.0) + (dept_hits * 1.2)
    score += float(employee.sentiment_score) * 1.1
    if employee.is_at_risk:
        score -= 0.6
    return score


def _score_candidate(
    prompt: str, candidate: CandidateTable, skill_names: List[str]
) -> float:
    prompt_tokens = set(_tokenize(prompt))
    role_tokens = set(_tokenize(candidate.role))
    dept_tokens = set(_tokenize(candidate.department))
    skill_tokens = set(_tokenize(" ".join(skill_names)))

    role_hits = len(prompt_tokens & role_tokens)
    dept_hits = len(prompt_tokens & dept_tokens)
    skill_hits = len(prompt_tokens & skill_tokens)

    score = (skill_hits * 2.6) + (role_hits * 2.1) + (dept_hits * 1.3)
    score += float(candidate.sentiment_score) * 1.0
    if candidate.match_score is not None:
        score += float(candidate.match_score) * 1.8
    return score


async def _call_openai_compatible_model(
    provider: str,
    prompt: str,
    ranked_profiles: List[dict],
    api_key: str = None,
    base_url: str = None,
    model: str = None,
) -> str:
    provider = (provider or "openai").lower()

    if provider == "lmstudio":
        endpoint = (
            f"{normalize_local_provider_base(base_url).rstrip('/')}/chat/completions"
        )
        selected_model = model or "local-model"
        auth_header = {}
    elif provider == "opencode":
        endpoint = (
            f"{(base_url or 'https://opencode.ai/zen/v1').rstrip('/')}/chat/completions"
        )
        selected_model = model or "gpt-5.5"
        auth_header = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    elif provider == "groq":
        endpoint = "https://api.groq.com/openai/v1/chat/completions"
        selected_model = model or "llama-3.1-70b-versatile"
        auth_header = {"Authorization": f"Bearer {api_key}"}
    elif provider == "openai":
        endpoint = "https://api.openai.com/v1/chat/completions"
        selected_model = model or "gpt-4o-mini"
        auth_header = {"Authorization": f"Bearer {api_key}"}
    else:
        # Keep non-openai-compatible providers graceful until dedicated adapters are added.
        return (
            f"Top matches identified from internal data. Direct provider adapter for '{provider}' "
            "is not configured in this build; showing deterministic ranking summary."
        )

    system_msg = (
        "You are Aurelinx Talent Intelligence. Provide concise, high-signal hiring analysis. "
        "Use the candidate/profile evidence exactly as provided. No generic filler."
    )
    user_msg = (
        f"Hiring need:\n{prompt}\n\n"
        f"Top ranked profiles (JSON):\n{ranked_profiles}\n\n"
        "Return:\n"
        "1) Best overall match and why\n"
        "2) Strengths of top 3\n"
        "3) Risks/gaps\n"
        "4) Final recommendation"
    )

    payload = {
        "model": selected_model,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg},
        ],
    }

    headers = {"Content-Type": "application/json", **auth_header}

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(endpoint, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()


async def _call_copilot_model(
    provider: str,
    prompt: str,
    context: Dict,
    api_key: str = None,
    base_url: str = None,
    model: str = None,
) -> str:
    provider = (provider or "lmstudio").lower()
    if provider == "lmstudio":
        endpoint = (
            f"{normalize_local_provider_base(base_url).rstrip('/')}/chat/completions"
        )
        selected_model = model or "local-model"
        auth_header = {}
    elif provider == "groq":
        endpoint = "https://api.groq.com/openai/v1/chat/completions"
        selected_model = model or "llama-3.1-70b-versatile"
        auth_header = {"Authorization": f"Bearer {api_key}"}
    elif provider == "openai":
        endpoint = "https://api.openai.com/v1/chat/completions"
        selected_model = model or "gpt-4o-mini"
        auth_header = {"Authorization": f"Bearer {api_key}"}
    elif provider == "claude":
        endpoint = "https://api.anthropic.com/v1/messages"
        selected_model = model or "claude-3-5-sonnet-20241022"
        auth_header = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        }
    elif provider == "gemini":
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model or 'gemini-1.5-pro'}:generateContent?key={api_key}"
        selected_model = model or "gemini-1.5-pro"
        auth_header = {}
    elif provider == "opencode":
        endpoint = (
            f"{(base_url or 'https://opencode.ai/zen/v1').rstrip('/')}/chat/completions"
        )
        selected_model = model or "gpt-5.5"
        auth_header = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    else:
        raise ValueError(f"Copilot provider adapter is not configured for '{provider}'")

    system_msg = (
        "You are Aurelinx Copilot, an HR intelligence assistant that turns workforce data into "
        "decisions. Be practical, concise, and evidence-backed. Use the provided context only. "
        "Always mention the key evidence, recommended actions, and any risks or caveats. "
        "Do not invent facts not present in the context. "
        "Return Markdown only, using short headings and bullets. Do not wrap the whole answer in code fences."
    )
    user_msg = (
        f"User request:\n{prompt}\n\n"
        f"Workspace context (JSON):\n{json.dumps(context, default=str)}\n\n"
        "Return a concise executive answer with Markdown sections for headline, answer, evidence, recommendations, actions, and warnings."
    )
    if provider in ["openai", "lmstudio", "groq"]:
        payload = {
            "model": selected_model,
            "temperature": 0.2,
            "messages": [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
        }
    elif provider == "claude":
        payload = {
            "model": selected_model,
            "max_tokens": 1200,
            "temperature": 0.2,
            "system": system_msg,
            "messages": [{"role": "user", "content": user_msg}],
        }
    else:
        payload = {
            "contents": [{"parts": [{"text": f"{system_msg}\n\n{user_msg}"}]}],
            "generationConfig": {"temperature": 0.2},
        }
    headers = {"Content-Type": "application/json", **auth_header}
    async with httpx.AsyncClient(timeout=35.0) as client:
        resp = await client.post(endpoint, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        if provider in ["openai", "lmstudio", "groq"]:
            return data["choices"][0]["message"]["content"].strip()
        if provider == "claude":
            text_blocks = [
                b.get("text", "")
                for b in data.get("content", [])
                if isinstance(b, dict)
            ]
            return "\n".join([t for t in text_blocks if t]).strip()
        return (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
            .strip()
        )


@router.post("/analyze", response_model=AIAnalysisResponse)
async def analyze_talent(
    request: AIAnalysisRequest,
    current_user: TokenData = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Analyze talent using real candidate/profile ranking + LLM reasoning.
    """
    start = time.perf_counter()
    logger.info(f"User {current_user.user_id} analyzing talent with {request.provider}")

    try:
        candidates = filter_real_records(session.exec(select(CandidateTable)).all())
        employees = filter_real_records(session.exec(select(EmployeeTable)).all())

        use_candidates = bool(candidates)
        scored: List[Tuple[float, object, List[str]]] = []
        if use_candidates:
            for cand in candidates:
                skills = session.exec(
                    select(SkillTable).where(SkillTable.candidate_id == cand.id)
                ).all()
                skill_names = [s.name for s in skills]
                score = _score_candidate(request.prompt, cand, skill_names)
                scored.append((score, cand, skill_names))
        else:
            if not employees:
                return AIAnalysisResponse(
                    analysis="No candidate or employee profiles are available in the database for analysis.",
                    candidates=[],
                    confidence_score=0.0,
                    processing_time_ms=0.0,
                )

            for emp in employees:
                skills = session.exec(
                    select(SkillTable).where(SkillTable.employee_id == emp.id)
                ).all()
                skill_names = [s.name for s in skills]
                score = _score_employee(request.prompt, emp, skill_names)
                scored.append((score, emp, skill_names))

        scored.sort(key=lambda x: x[0], reverse=True)
        top_scored = scored[:5]

        top_profiles = []
        top_candidates = []
        for score, person, skill_names in top_scored:
            if use_candidates:
                cand = person  # type: ignore[assignment]
                candidate_out = get_candidate_out(cand, session).model_dump(mode="json")
                candidate_out.update(
                    {
                        "is_at_risk": bool((cand.match_score or 0.0) < 0.55),
                        "retention_prob": float(cand.match_score or 0.0),
                        "updated_at": cand.created_at,
                    }
                )
                top_profiles.append(
                    {
                        "name": cand.full_name,
                        "role": cand.role,
                        "department": cand.department,
                        "skills": skill_names[:8],
                        "sentiment_score": cand.sentiment_score,
                        "match_score": cand.match_score,
                        "ranking_score": round(score, 3),
                    }
                )
                top_candidates.append(candidate_out)
            else:
                emp = person  # type: ignore[assignment]
                top_profiles.append(
                    {
                        "name": emp.full_name,
                        "role": emp.role,
                        "department": emp.department,
                        "skills": skill_names[:8],
                        "sentiment_score": emp.sentiment_score,
                        "is_at_risk": emp.is_at_risk,
                        "ranking_score": round(score, 3),
                    }
                )
                top_candidates.append(get_employee_out(emp, session))

        analysis_text = await _call_openai_compatible_model(
            provider=request.provider,
            prompt=request.prompt,
            ranked_profiles=top_profiles,
            api_key=request.api_key,
            base_url=request.base_url,
            model=request.model,
        )

        processing_ms = (time.perf_counter() - start) * 1000.0

        return AIAnalysisResponse(
            analysis=analysis_text,
            candidates=top_candidates,
            confidence_score=0.9 if len(top_candidates) >= 3 else 0.75,
            processing_time_ms=round(processing_ms, 1),
        )

    except httpx.HTTPStatusError as e:
        logger.error(
            f"Provider HTTP error: {e.response.status_code} - {e.response.text}"
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider request failed. Check provider endpoint/key/model.",
        )
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Analysis failed",
        )


@router.get("/sentiment/report", response_model=SentimentReportResponse)
async def get_sentiment_report(
    department: str = None,
    include_at_risk_only: bool = False,
    current_user: TokenData = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Get organizational sentiment analysis report
    """
    logger.info(f"User {current_user.user_id} requesting sentiment report")

    try:
        query = select(EmployeeTable)

        if department:
            query = query.where(EmployeeTable.department == department)

        if include_at_risk_only:
            query = query.where(EmployeeTable.is_at_risk)

        employees = filter_real_records(session.exec(query).all())

        if not employees:
            return SentimentReportResponse(
                total_employees=0,
                at_risk_count=0,
                at_risk_percentage=0.0,
                metrics=[],
                recommendations=["No employees found matching criteria"],
            )

        at_risk_count = len([e for e in employees if e.is_at_risk])
        sum([e.sentiment_score for e in employees]) / len(employees)
        metrics, _ = _build_sentiment_metrics(employees)
        risk_pct = (at_risk_count / len(employees) * 100) if employees else 0.0

        return SentimentReportResponse(
            total_employees=len(employees),
            at_risk_count=at_risk_count,
            at_risk_percentage=risk_pct,
            metrics=metrics,
            recommendations=[
                (
                    f"Monitor {at_risk_count} employees at risk of attrition"
                    if at_risk_count > 0
                    else "All employees seem satisfied"
                ),
                f"Current at-risk percentage is {risk_pct:.1f}%",
                "Consider engagement initiatives for teams with lower morale",
                "Schedule 1:1s with at-risk employees for retention conversations",
            ],
        )

    except Exception as e:
        logger.error(f"Sentiment report failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate sentiment report",
        )


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "aurelinx-ai",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/sentiment/stream")
async def sentiment_stream(
    department: str = None,
    include_at_risk_only: bool = False,
    current_user: TokenData = Depends(get_current_user),
):
    """
    Real-time sentiment intelligence stream using SSE.
    """
    logger.info(f"User {current_user.user_id} connected to sentiment SSE stream")

    stream_key = f"{department or 'all'}::{include_at_risk_only}"

    async def event_generator():
        global _SENTIMENT_PREV_SNAPSHOT
        while True:
            try:
                with Session(engine) as session:
                    query = select(EmployeeTable)
                    if department:
                        query = query.where(EmployeeTable.department == department)
                    if include_at_risk_only:
                        query = query.where(EmployeeTable.is_at_risk)
                    employees = filter_real_records(session.exec(query).all())

                prev = _SENTIMENT_PREV_SNAPSHOT.get(stream_key, {})
                metrics, current = _build_sentiment_metrics(employees, prev)
                _SENTIMENT_PREV_SNAPSHOT[stream_key] = current

                total = len(employees)
                at_risk_count = len([e for e in employees if e.is_at_risk])
                risk_pct = round((at_risk_count / total) * 100, 1) if total > 0 else 0.0
                avg_sentiment = (
                    round(sum(e.sentiment_score for e in employees) / total, 3)
                    if total > 0
                    else 0.0
                )

                if risk_pct >= 20:
                    priority_level = "Level 3"
                    priority_color = "risk"
                elif risk_pct >= 10:
                    priority_level = "Level 2"
                    priority_color = "warning"
                else:
                    priority_level = "Level 1"
                    priority_color = "safe"

                payload = {
                    "total_employees": total,
                    "at_risk_count": at_risk_count,
                    "at_risk_percentage": risk_pct,
                    "avg_sentiment": avg_sentiment,
                    "priority_level": priority_level,
                    "priority_color": priority_color,
                    "metrics": [m.model_dump() for m in metrics],
                    "timestamp": datetime.utcnow().isoformat(),
                }
                yield f"event: sentiment\ndata: {json.dumps(payload)}\n\n"
            except Exception as e:
                logger.error(f"Sentiment stream error: {e}", exc_info=True)
                yield f"event: error\ndata: {json.dumps({'message': 'stream_error'})}\n\n"
            await asyncio.sleep(3)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/analytics/stream")
async def analytics_stream(
    current_user: TokenData = Depends(get_current_user),
):
    """
    Real-time analytics stream using SSE.
    Emits latest workforce metrics every 3 seconds.
    """
    logger.info(f"User {current_user.user_id} connected to analytics SSE stream")

    async def event_generator():
        while True:
            try:
                with Session(engine) as session:
                    snapshot = _analytics_snapshot(session)
                yield f"event: analytics\ndata: {json.dumps(snapshot)}\n\n"
            except Exception as e:
                logger.error(f"Analytics stream error: {e}", exc_info=True)
                yield f"event: error\ndata: {json.dumps({'message': 'stream_error'})}\n\n"
            await asyncio.sleep(3)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/analytics/snapshot")
async def analytics_snapshot(
    current_user: TokenData = Depends(get_current_user),
):
    """
    Point-in-time analytics snapshot with totals and top risk drivers.
    """
    with Session(engine) as session:
        return _analytics_snapshot(session)


@router.get("/copilot/context")
async def copilot_context(
    current_user: TokenData = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Structured workspace context for AI copilot screens.
    """
    logger.info(f"User {current_user.user_id} requested copilot context")
    return _workspace_context(session)


@router.post("/copilot/brief", response_model=AICopilotResponse)
async def copilot_brief(
    request: AICopilotRequest,
    current_user: TokenData = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Generate a grounded, cross-surface HR intelligence brief.
    """
    logger.info(
        f"User {current_user.user_id} requested copilot brief on {request.surface}"
    )
    context = _workspace_context(session)
    context["surface"] = request.surface
    context["prompt"] = request.prompt
    context["page_context"] = request.page_context or {}

    if (
        request.provider in {"openai", "groq", "claude", "gemini", "opencode"}
        and not request.api_key
    ):
        raise HTTPException(
            status_code=422, detail="LLM provider key is required for this provider"
        )

    try:
        answer = await _call_copilot_model(
            provider=request.provider,
            prompt=request.prompt,
            context=context,
            api_key=request.api_key,
            base_url=request.base_url,
            model=request.model,
        )
    except Exception as exc:
        logger.exception(f"Copilot LLM call failed for provider {request.provider}")
        raise HTTPException(status_code=503, detail=f"LLM chat unavailable: {exc}")

    evidence = [
        f"Workforce: {context['snapshot']['total']}",
        f"At risk: {context['snapshot']['atRisk']} ({context['snapshot']['atRiskPct']}%)",
        f"Top risk department: {context['snapshot'].get('topRiskDepartment') or 'n/a'}",
    ]
    recommendations = [
        "Open interventions for the highest-risk employees in the top-risk department.",
        "Review the active policy pack before approving any high-impact action.",
        "Check model cards and fairness gap before using the result for executive decisions.",
    ]
    actions = [
        "Create an intervention from the top risk driver.",
        "Run the monthly executive packet and share with CHRO/CFO.",
        "Refresh the model and compare the latest drift snapshot.",
    ]
    headline = request.prompt[:80].strip() or "Copilot brief"
    return AICopilotResponse(
        headline=headline,
        answer=answer,
        evidence=evidence,
        recommendations=recommendations,
        actions=actions,
        warnings=[],
        context=context,
        confidence_score=0.86 if context["snapshot"]["total"] else 0.0,
        provider=request.provider,
        surface=request.surface,
        generated_at=datetime.utcnow(),
    )
