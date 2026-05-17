from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ParsedInstruction:
    op: str
    args: list[str]
    line: int
    source: str
    address: int
    label: str | None = None


@dataclass
class Program:
    instructions: list[ParsedInstruction]
    labels: dict[str, int]
    data_labels: dict[str, int] = field(default_factory=dict)
    data_memory: dict[int, int] = field(default_factory=dict)


@dataclass
class IRInstruction:
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
    target_address: int | None = None
    uses: list[str] = field(default_factory=list)
    writes: list[str] = field(default_factory=list)
    stages: list[str] = field(default_factory=lambda: ["IF", "ID", "EX", "MEM", "WB"])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "op": self.op,
            "type": self.type,
            "source": self.source,
            "address": self.address,
            "line": self.line,
            "rs": self.rs,
            "rt": self.rt,
            "rd": self.rd,
            "shamt": self.shamt,
            "immediate": self.immediate,
            "offset": self.offset,
            "base": self.base,
            "target": self.target,
            "targetAddress": self.target_address,
            "uses": self.uses,
            "writes": self.writes,
            "stages": self.stages,
        }
