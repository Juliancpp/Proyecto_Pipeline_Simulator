from __future__ import annotations

from fastapi import APIRouter

from app.schemas.explanation import AIExplanationRequest, CycleExplanationRequest
from app.services.ai_explanation_service import generate_ai_explanation
from app.services.explanation_service import ExplanationService

router = APIRouter(prefix="/api/explain", tags=["explanations"])
service = ExplanationService()


@router.post("/cycle")
def explain_cycle(request: CycleExplanationRequest) -> dict:
    return {
        "cycle": request.cycle.get("cycle", 0),
        "explanation": service.explain_cycle(request.cycle, request.program, request.level),
    }


@router.post("/ai")
def explain_ai(request: AIExplanationRequest) -> dict:
    return generate_ai_explanation(request.context)
