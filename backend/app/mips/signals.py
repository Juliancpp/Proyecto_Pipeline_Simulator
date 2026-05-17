from __future__ import annotations

from app.mips.models import IRInstruction


COMPONENT_IDS = {
    "PC",
    "InstructionMemory",
    "IF_ID",
    "RegisterFile",
    "ReadRegister1",
    "ReadRegister2",
    "ReadData1",
    "ReadData2",
    "WriteRegister",
    "WriteData",
    "SignExtend",
    "ControlUnit",
    "ControlMux",
    "ID_EX",
    "ALU",
    "EX_MEM",
    "DataMemory",
    "MEM_WB",
    "MemToRegMux",
    "WriteBack",
    "ForwardingUnit",
    "HazardDetectionUnit",
    "BranchLogic",
    "JumpTarget",
    "PCSrc",
    "MuxA",
    "MuxB",
}


WIRE_IDS = {
    "pc_to_instruction_memory",
    "instruction_memory_to_if_id",
    "if_id_to_register_file",
    "register_file_to_id_ex",
    "id_ex_to_alu_a",
    "id_ex_to_alu_b",
    "alu_to_ex_mem",
    "ex_mem_to_data_memory",
    "data_memory_to_mem_wb",
    "mem_wb_to_register_file",
    "ex_mem_forward_to_alu_a",
    "ex_mem_forward_to_alu_b",
    "mem_wb_forward_to_alu_a",
    "mem_wb_forward_to_alu_b",
    "ex_mem_forward_to_store_data",
    "mem_wb_forward_to_store_data",
    "hazard_to_pc",
    "hazard_to_if_id",
    "hazard_to_control_mux",
    "branch_to_pcsrc",
    "jump_to_pc",
}


def base_control_signals() -> dict[str, int | str]:
    return {
        "RegWrite": 0,
        "MemRead": 0,
        "MemWrite": 0,
        "MemToReg": 0,
        "ALUSrc": 0,
        "Branch": 0,
        "Jump": 0,
        "PCWrite": 1,
        "IF_IDWrite": 1,
        "ControlMux": 1,
        "ForwardA": "00",
        "ForwardB": "00",
    }


def writes_register(instruction: IRInstruction | None) -> bool:
    return bool(instruction and instruction.writes and instruction.writes[0] != "$zero")


def uses_memory_read(instruction: IRInstruction | None) -> bool:
    return bool(instruction and instruction.op == "lw")


def uses_memory_write(instruction: IRInstruction | None) -> bool:
    return bool(instruction and instruction.op == "sw")


def is_control(instruction: IRInstruction | None) -> bool:
    return bool(instruction and instruction.op in {"beq", "bne", "j", "jal", "jr"})


def is_branch(instruction: IRInstruction | None) -> bool:
    return bool(instruction and instruction.op in {"beq", "bne"})


def is_jump(instruction: IRInstruction | None) -> bool:
    return bool(instruction and instruction.op in {"j", "jal", "jr"})


def alu_input_registers(instruction: IRInstruction) -> dict[str, str]:
    op = instruction.op
    if op in {"add", "addu", "sub", "subu", "and", "or", "xor", "nor", "slt"}:
        return {"A": instruction.rs or "", "B": instruction.rt or ""}
    if op in {"addi", "addiu", "andi", "ori", "xori", "slti", "lw", "sw"}:
        return {"A": instruction.rs or ""}
    if op in {"sll", "srl"}:
        return {"B": instruction.rt or ""}
    if op in {"beq", "bne"}:
        return {"A": instruction.rs or "", "B": instruction.rt or ""}
    if op == "jr":
        return {"A": instruction.rs or ""}
    return {}


def store_data_register(instruction: IRInstruction | None) -> str | None:
    if instruction and instruction.op == "sw":
        return instruction.rt
    return None


def instruction_text(instruction: IRInstruction | None) -> str | None:
    return instruction.source if instruction else None


def make_event(
    *,
    event_type: str,
    cycle: int,
    instruction: IRInstruction | None,
    stage: str,
    message: str,
    component_ids: list[str] | None = None,
    wire_ids: list[str] | None = None,
    source: str | int | None = None,
    target: str | int | None = None,
    register: str | None = None,
    signal_values: dict[str, int | str] | None = None,
) -> dict:
    return {
        "type": event_type,
        "cycle": cycle,
        "instructionId": instruction.id if instruction else None,
        "instructionText": instruction_text(instruction),
        "stage": stage,
        "message": message,
        "componentIds": [item for item in component_ids or [] if item in COMPONENT_IDS],
        "wireIds": [item for item in wire_ids or [] if item in WIRE_IDS],
        "source": source,
        "target": target,
        "register": register,
        "signalValues": signal_values or {},
    }

