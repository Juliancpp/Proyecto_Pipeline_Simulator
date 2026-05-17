from __future__ import annotations

from pydantic import BaseModel, Field


class ParseRequest(BaseModel):
    code: str = Field(..., min_length=1)


class InstructionIR(BaseModel):
    id: int
    op: str
    type: str
    source: str
    address: int
    line: int
    rs: str | None = None
    rt: str | None = None
    rd: str | None = None
    shamt: int | None = None
    immediate: int | None = None
    offset: int | None = None
    base: str | None = None
    target: str | None = None
    targetAddress: int | None = None
    uses: list[str] = []
    writes: list[str] = []
    stages: list[str] = []


class ParseResponse(BaseModel):
    program: list[dict]
    labels: dict[str, int]
    dataLabels: dict[str, int]
    dataMemory: dict[str, int]
