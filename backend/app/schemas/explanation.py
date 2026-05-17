from __future__ import annotations

from pydantic import BaseModel


class CycleExplanationRequest(BaseModel):
    cycle: dict
    program: list[dict] = []
    level: str = "university"


class CycleExplanationResponse(BaseModel):
    cycle: int
    explanation: str


class AIExplanationRequest(BaseModel):
    context: dict
