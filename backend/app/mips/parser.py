from __future__ import annotations

import re

from app.mips.exceptions import MIPSSyntaxError, UnknownInstructionError
from app.mips.instruction_set import SUPPORTED_OPS
from app.mips.models import ParsedInstruction, Program


DATA_BASE = 0x10010000
TEXT_BASE = 0x00400000
LABEL_RE = re.compile(r"^([A-Za-z_][\w.]*)\s*:\s*(.*)$")


class MIPSParser:
    def parse(self, code: str) -> Program:
        labels: dict[str, int] = {}
        data_labels: dict[str, int] = {}
        data_memory: dict[int, int] = {}
        instructions: list[ParsedInstruction] = []
        section = ".text"
        text_address = TEXT_BASE
        data_address = DATA_BASE
        pending_label: str | None = None

        for line_no, raw_line in enumerate(code.splitlines(), start=1):
            line = self._strip_comment(raw_line).strip()
            if not line:
                continue
            if line in {".text", ".data"}:
                section = line
                continue

            while True:
                match = LABEL_RE.match(line)
                if not match:
                    break
                label, rest = match.groups()
                if section == ".text":
                    labels[label] = text_address
                    pending_label = label
                else:
                    data_labels[label] = data_address
                line = rest.strip()
                if not line:
                    break
            if not line:
                continue

            if section == ".data":
                data_address = self._parse_data_directive(line, line_no, data_address, data_memory)
                continue

            op, args = self._parse_instruction(line, line_no)
            instructions.append(
                ParsedInstruction(
                    op=op,
                    args=args,
                    line=line_no,
                    source=line,
                    address=text_address,
                    label=pending_label,
                )
            )
            pending_label = None
            text_address += 4

        return Program(
            instructions=instructions,
            labels=labels,
            data_labels=data_labels,
            data_memory=data_memory,
        )

    @staticmethod
    def _strip_comment(line: str) -> str:
        return line.split("#", 1)[0]

    @staticmethod
    def _parse_instruction(line: str, line_no: int) -> tuple[str, list[str]]:
        parts = line.split(None, 1)
        op = parts[0].lower()
        if op not in SUPPORTED_OPS:
            raise UnknownInstructionError(f"Instruccion desconocida en linea {line_no}: {op}")
        args_text = parts[1].strip() if len(parts) > 1 else ""
        args = [arg.strip() for arg in args_text.split(",") if arg.strip()]
        return op, args

    @staticmethod
    def _parse_data_directive(
        line: str,
        line_no: int,
        data_address: int,
        data_memory: dict[int, int],
    ) -> int:
        parts = line.split(None, 1)
        directive = parts[0]
        values = parts[1] if len(parts) > 1 else ""
        if directive != ".word":
            raise MIPSSyntaxError(f"Directiva .data no soportada en linea {line_no}: {directive}")
        for raw_value in values.split(","):
            raw_value = raw_value.strip()
            if not raw_value:
                continue
            data_memory[data_address] = int(raw_value, 0)
            data_address += 4
        return data_address


def parse_mips(code: str) -> Program:
    return MIPSParser().parse(code)
