from __future__ import annotations

from dataclasses import dataclass


R_FORMAT = {"add", "addu", "sub", "subu", "and", "or", "xor", "nor", "slt", "sll", "srl", "jr"}
I_FORMAT = {"addi", "addiu", "andi", "ori", "xori", "slti", "lw", "sw", "beq", "bne", "lui"}
J_FORMAT = {"j", "jal"}
SUPPORTED_OPS = R_FORMAT | I_FORMAT | J_FORMAT


@dataclass(frozen=True)
class InstructionSpec:
    op: str
    fmt: str
    syntax: str
    writes_register: bool
    reads_memory: bool = False
    writes_memory: bool = False
    is_branch: bool = False
    is_jump: bool = False


INSTRUCTION_SET: dict[str, InstructionSpec] = {
    op: InstructionSpec(op, "R", "rd, rs, rt", True) for op in R_FORMAT - {"sll", "srl", "jr"}
}
INSTRUCTION_SET.update(
    {
        "sll": InstructionSpec("sll", "R", "rd, rt, shamt", True),
        "srl": InstructionSpec("srl", "R", "rd, rt, shamt", True),
        "jr": InstructionSpec("jr", "R", "rs", False, is_jump=True),
        "addi": InstructionSpec("addi", "I", "rt, rs, imm", True),
        "addiu": InstructionSpec("addiu", "I", "rt, rs, imm", True),
        "andi": InstructionSpec("andi", "I", "rt, rs, imm", True),
        "ori": InstructionSpec("ori", "I", "rt, rs, imm", True),
        "xori": InstructionSpec("xori", "I", "rt, rs, imm", True),
        "slti": InstructionSpec("slti", "I", "rt, rs, imm", True),
        "lw": InstructionSpec("lw", "I", "rt, offset(rs)", True, reads_memory=True),
        "sw": InstructionSpec("sw", "I", "rt, offset(rs)", False, writes_memory=True),
        "beq": InstructionSpec("beq", "I", "rs, rt, label", False, is_branch=True),
        "bne": InstructionSpec("bne", "I", "rs, rt, label", False, is_branch=True),
        "lui": InstructionSpec("lui", "I", "rt, imm", True),
        "j": InstructionSpec("j", "J", "label", False, is_jump=True),
        "jal": InstructionSpec("jal", "J", "label", True, is_jump=True),
    }
)
