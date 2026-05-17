from __future__ import annotations

from app.mips.models import IRInstruction


def detect_load_use(previous: IRInstruction | None, current: IRInstruction | None, cycle: int) -> dict | None:
    if not previous or not current or previous.op != "lw":
        return None
    written = set(previous.writes)
    used = set(current.uses)
    conflict = sorted(written & used)
    if not conflict:
        return None
    return {
        "cycle": cycle,
        "type": "load-use",
        "severity": "stall",
        "producerInstructionId": previous.id,
        "consumerInstructionId": current.id,
        "registers": conflict,
        "reason": "The loaded value is not available early enough for the next EX stage.",
    }


def detect_raw_hazards(program: list[IRInstruction]) -> list[dict]:
    hazards: list[dict] = []
    for consumer in program:
        for producer in program[: consumer.id]:
            conflict = sorted(set(producer.writes) & set(consumer.uses))
            if conflict:
                hazards.append(
                    {
                        "type": "RAW",
                        "producerInstructionId": producer.id,
                        "consumerInstructionId": consumer.id,
                        "registers": conflict,
                        "reason": "The consumer reads a register written by an earlier instruction.",
                    }
                )
    return hazards


def detect_control_hazard(instruction: IRInstruction, cycle: int) -> dict | None:
    if instruction.op in {"beq", "bne", "j", "jal", "jr"}:
        return {
            "cycle": cycle,
            "type": "control",
            "instructionId": instruction.id,
            "reason": "The next PC depends on branch or jump resolution.",
        }
    return None
