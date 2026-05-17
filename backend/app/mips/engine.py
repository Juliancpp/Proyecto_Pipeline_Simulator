from __future__ import annotations

from app.mips.memory import Memory
from app.mips.models import IRInstruction
from app.mips.parser import parse_mips
from app.mips.registers import RegisterFile, to_signed_32
from app.mips.transpiler import transpile


class MIPSEngine:
    def __init__(
        self,
        instructions: list[IRInstruction],
        initial_registers: dict[str, int] | None = None,
        initial_memory: dict[int | str, int] | None = None,
        max_steps: int = 10000,
    ):
        self.instructions = instructions
        self.registers = RegisterFile(initial_registers)
        self.memory = Memory(initial_memory)
        self.pc_to_index = {instruction.address: index for index, instruction in enumerate(instructions)}
        self.pc = instructions[0].address if instructions else 0
        self.max_steps = max_steps
        self.trace: list[dict] = []

    def run(self) -> dict:
        steps = 0
        while self.pc in self.pc_to_index and steps < self.max_steps:
            instruction = self.instructions[self.pc_to_index[self.pc]]
            before_pc = self.pc
            self.pc += 4
            self.execute(instruction)
            self.trace.append(
                {
                    "step": steps + 1,
                    "pc": before_pc,
                    "nextPc": self.pc,
                    "instruction": instruction.to_dict(),
                }
            )
            steps += 1
        return {
            "registers": self.registers.snapshot(),
            "memory": self.memory.snapshot(),
            "pc": self.pc,
            "steps": steps,
            "trace": self.trace,
        }

    def execute(self, instruction: IRInstruction) -> None:
        op = instruction.op
        rs = self._read(instruction.rs)
        rt = self._read(instruction.rt)
        imm = instruction.immediate or 0

        if op in {"add", "addu", "addi", "addiu"}:
            self._write(instruction.writes, rs + (rt if op in {"add", "addu"} else imm))
        elif op in {"sub", "subu"}:
            self._write(instruction.writes, rs - rt)
        elif op == "and":
            self._write(instruction.writes, rs & rt)
        elif op == "andi":
            self._write(instruction.writes, rs & imm)
        elif op == "or":
            self._write(instruction.writes, rs | rt)
        elif op == "ori":
            self._write(instruction.writes, rs | imm)
        elif op == "xor":
            self._write(instruction.writes, rs ^ rt)
        elif op == "xori":
            self._write(instruction.writes, rs ^ imm)
        elif op == "nor":
            self._write(instruction.writes, ~(rs | rt))
        elif op == "slt":
            self._write(instruction.writes, 1 if rs < rt else 0)
        elif op == "slti":
            self._write(instruction.writes, 1 if rs < imm else 0)
        elif op == "sll":
            self._write(instruction.writes, rt << (instruction.shamt or 0))
        elif op == "srl":
            self._write(instruction.writes, (rt & 0xFFFFFFFF) >> (instruction.shamt or 0))
        elif op == "lui":
            self._write(instruction.writes, imm << 16)
        elif op == "lw":
            self._write(instruction.writes, self.memory.load_word(rs + imm))
        elif op == "sw":
            self.memory.store_word(rs + imm, rt)
        elif op == "beq":
            if rs == rt:
                self.pc = instruction.target_address or self.pc
        elif op == "bne":
            if rs != rt:
                self.pc = instruction.target_address or self.pc
        elif op == "j":
            self.pc = instruction.target_address or self.pc
        elif op == "jal":
            self.registers.write("$ra", self.pc)
            self.pc = instruction.target_address or self.pc
        elif op == "jr":
            self.pc = rs

    def _read(self, register: str | None) -> int:
        return self.registers.read(register) if register else 0

    def _write(self, registers: list[str], value: int) -> None:
        if registers:
            self.registers.write(registers[0], to_signed_32(value))


def run_code(
    code: str,
    initial_registers: dict[str, int] | None = None,
    initial_memory: dict[int | str, int] | None = None,
) -> dict:
    program = parse_mips(code)
    ir = transpile(program)
    merged_memory = {**program.data_memory}
    if initial_memory:
        merged_memory.update({int(address): value for address, value in initial_memory.items()})
    result = MIPSEngine(ir, initial_registers=initial_registers, initial_memory=merged_memory).run()
    result["program"] = [instruction.to_dict() for instruction in ir]
    return result
