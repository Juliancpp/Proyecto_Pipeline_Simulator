from __future__ import annotations

from pydantic import BaseModel, Field


class SimulationRequest(BaseModel):
    code: str = Field(..., min_length=1)
    forwarding: bool = True
    mode: str = "pipeline"
    initialRegisters: dict[str, int] = Field(default_factory=dict)
    initialMemory: dict[str, int] = Field(default_factory=dict)


class RunRequest(BaseModel):
    code: str = Field(..., min_length=1)
    initialRegisters: dict[str, int] = Field(default_factory=dict)
    initialMemory: dict[str, int] = Field(default_factory=dict)


class Metrics(BaseModel):
    totalCycles: int
    instructionCount: int
    stalls: int
    forwardingEvents: int
    cpi: float


class FinalState(BaseModel):
    registers: dict[str, int]
    memory: dict[str, int]
    executionTrace: list[dict] = Field(default_factory=list)


class SimulationResponse(BaseModel):
    program: list[dict]
    cycles: list[dict]
    hazards: list[dict]
    forwardingEvents: list[dict]
    executionTrace: list[dict] = Field(default_factory=list)
    mode: str = "pipeline"
    metrics: Metrics
    finalState: FinalState
