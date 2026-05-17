from __future__ import annotations

from app.mips.models import IRInstruction


def forwarding_events_for_ex(
    cycle: int,
    ex_instruction: IRInstruction | None,
    mem_instruction: IRInstruction | None,
    wb_instruction: IRInstruction | None,
) -> list[dict]:
    if not ex_instruction:
        return []
    events: list[dict] = []
    events.extend(_events_from_stage(cycle, ex_instruction, mem_instruction, "EX/MEM"))
    forwarded_registers = {event["register"] for event in events}
    for event in _events_from_stage(cycle, ex_instruction, wb_instruction, "MEM/WB"):
        if event["register"] not in forwarded_registers:
            events.append(event)
    return events


def _events_from_stage(
    cycle: int,
    consumer: IRInstruction,
    producer: IRInstruction | None,
    stage_name: str,
) -> list[dict]:
    if not producer or not producer.writes:
        return []
    events = []
    for index, register in enumerate(consumer.uses[:2]):
        if register in producer.writes:
            events.append(
                {
                    "cycle": cycle,
                    "type": "forwarding",
                    "from": stage_name,
                    "to": "ALU_INPUT_A" if index == 0 else "ALU_INPUT_B",
                    "register": register,
                    "producerInstructionId": producer.id,
                    "consumerInstructionId": consumer.id,
                    "reason": "The value is available from a later pipeline register.",
                }
            )
    return events
