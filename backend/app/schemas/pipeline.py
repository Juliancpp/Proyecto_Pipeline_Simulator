from __future__ import annotations

from pydantic import BaseModel


class PipelineCycle(BaseModel):
    cycle: int
    instructions: list[dict]
    stalls: list[dict]
    bubbles: list[dict]
    hazards: list[dict]
    forwarding: list[dict]
    pipelineRegisters: dict
    controlSignals: dict
    cycleEvents: list[dict] = []
    datapath: dict
    activeComponents: list[str]
    activeWires: list[str]
