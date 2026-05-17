from __future__ import annotations

import re

from app.mips.exceptions import InvalidImmediateError, LabelNotFoundError, MIPSSyntaxError
from app.mips.instruction_set import INSTRUCTION_SET
from app.mips.models import IRInstruction, Program
from app.mips.registers import normalize_register


OFFSET_RE = re.compile(r"^(-?(?:0x[0-9a-fA-F]+|\d+))\((\$[\w\d]+)\)$")


class MIPSTranspiler:
    def transpile(self, program: Program) -> list[IRInstruction]:
        ir: list[IRInstruction] = []
        labels = {**program.labels, **program.data_labels}
        for index, parsed in enumerate(program.instructions):
            spec = INSTRUCTION_SET[parsed.op]
            item = IRInstruction(
                id=index,
                op=parsed.op,
                type=spec.fmt,
                source=parsed.source,
                address=parsed.address,
                line=parsed.line,
            )
            self._fill_fields(item, parsed.args, labels)
            if item.op == "sw":
                item.stages = ["IF", "ID", "EX", "MEM"]
            if item.op in {"beq", "bne", "j", "jal", "jr"}:
                item.stages = ["IF", "ID", "EX"]
            ir.append(item)
        return ir

    def _fill_fields(self, item: IRInstruction, args: list[str], labels: dict[str, int]) -> None:
        op = item.op
        if op in {"add", "addu", "sub", "subu", "and", "or", "xor", "nor", "slt"}:
            self._expect(args, 3, item)
            item.rd = normalize_register(args[0])
            item.rs = normalize_register(args[1])
            item.rt = normalize_register(args[2])
            item.uses = [item.rs, item.rt]
            item.writes = [item.rd]
        elif op in {"sll", "srl"}:
            self._expect(args, 3, item)
            item.rd = normalize_register(args[0])
            item.rt = normalize_register(args[1])
            item.shamt = self._parse_immediate(args[2], bits=5, signed=False)
            item.uses = [item.rt]
            item.writes = [item.rd]
        elif op == "jr":
            self._expect(args, 1, item)
            item.rs = normalize_register(args[0])
            item.uses = [item.rs]
        elif op in {"addi", "addiu", "andi", "ori", "xori", "slti"}:
            self._expect(args, 3, item)
            item.rt = normalize_register(args[0])
            item.rs = normalize_register(args[1])
            item.immediate = self._parse_immediate(args[2], bits=16, signed=op not in {"andi", "ori", "xori"})
            item.uses = [item.rs]
            item.writes = [item.rt]
        elif op == "lui":
            self._expect(args, 2, item)
            item.rt = normalize_register(args[0])
            item.immediate = self._parse_immediate(args[1], bits=16, signed=False)
            item.writes = [item.rt]
        elif op in {"lw", "sw"}:
            self._expect(args, 2, item)
            item.rt = normalize_register(args[0])
            item.offset, item.base = self._parse_offset(args[1])
            item.rs = item.base
            item.immediate = item.offset
            item.uses = [item.base] if op == "lw" else [item.base, item.rt]
            item.writes = [item.rt] if op == "lw" else []
        elif op in {"beq", "bne"}:
            self._expect(args, 3, item)
            item.rs = normalize_register(args[0])
            item.rt = normalize_register(args[1])
            item.target = args[2]
            item.target_address = self._resolve_label(args[2], labels, item)
            item.uses = [item.rs, item.rt]
        elif op in {"j", "jal"}:
            self._expect(args, 1, item)
            item.target = args[0]
            item.target_address = self._resolve_label(args[0], labels, item)
            if op == "jal":
                item.writes = ["$ra"]
        else:
            raise MIPSSyntaxError(f"Instruccion no implementada: {op}")

    @staticmethod
    def _expect(args: list[str], count: int, item: IRInstruction) -> None:
        if len(args) != count:
            raise MIPSSyntaxError(
                f"Sintaxis invalida en linea {item.line}: {item.source}. Se esperaban {count} operandos."
            )

    @staticmethod
    def _parse_immediate(value: str, bits: int, signed: bool) -> int:
        try:
            parsed = int(value, 0)
        except ValueError as exc:
            raise InvalidImmediateError(f"Inmediato invalido: {value}") from exc
        lower = -(2 ** (bits - 1)) if signed else 0
        upper = 2 ** (bits - 1) - 1 if signed else 2**bits - 1
        if parsed < lower or parsed > upper:
            raise InvalidImmediateError(f"Inmediato fuera de rango ({bits} bits): {value}")
        return parsed

    @classmethod
    def _parse_offset(cls, value: str) -> tuple[int, str]:
        match = OFFSET_RE.match(value.replace(" ", ""))
        if not match:
            raise MIPSSyntaxError(f"Offset de memoria invalido: {value}")
        return cls._parse_immediate(match.group(1), bits=16, signed=True), normalize_register(match.group(2))

    @staticmethod
    def _resolve_label(label: str, labels: dict[str, int], item: IRInstruction) -> int:
        if label not in labels:
            raise LabelNotFoundError(f"Label no encontrado en linea {item.line}: {label}")
        return labels[label]


def transpile(program: Program) -> list[IRInstruction]:
    return MIPSTranspiler().transpile(program)
