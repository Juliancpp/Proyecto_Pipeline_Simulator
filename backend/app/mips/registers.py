from __future__ import annotations

from app.mips.exceptions import InvalidRegisterError


REGISTER_ALIASES = {
    "$zero": 0,
    "$at": 1,
    "$v0": 2,
    "$v1": 3,
    "$a0": 4,
    "$a1": 5,
    "$a2": 6,
    "$a3": 7,
    "$t0": 8,
    "$t1": 9,
    "$t2": 10,
    "$t3": 11,
    "$t4": 12,
    "$t5": 13,
    "$t6": 14,
    "$t7": 15,
    "$s0": 16,
    "$s1": 17,
    "$s2": 18,
    "$s3": 19,
    "$s4": 20,
    "$s5": 21,
    "$s6": 22,
    "$s7": 23,
    "$s8": 30,
    "$s9": 31,
    "$t8": 24,
    "$t9": 25,
    "$k0": 26,
    "$k1": 27,
    "$gp": 28,
    "$sp": 29,
    "$fp": 30,
    "$ra": 31,
}

CANONICAL_NAMES = {
    0: "$zero",
    1: "$at",
    2: "$v0",
    3: "$v1",
    4: "$a0",
    5: "$a1",
    6: "$a2",
    7: "$a3",
    8: "$t0",
    9: "$t1",
    10: "$t2",
    11: "$t3",
    12: "$t4",
    13: "$t5",
    14: "$t6",
    15: "$t7",
    16: "$s0",
    17: "$s1",
    18: "$s2",
    19: "$s3",
    20: "$s4",
    21: "$s5",
    22: "$s6",
    23: "$s7",
    24: "$t8",
    25: "$t9",
    26: "$k0",
    27: "$k1",
    28: "$gp",
    29: "$sp",
    30: "$fp",
    31: "$ra",
}


def normalize_register(name: str) -> str:
    value = name.strip().lower()
    if value in REGISTER_ALIASES:
        return CANONICAL_NAMES[REGISTER_ALIASES[value]]
    if value.startswith("$") and value[1:].isdigit():
        number = int(value[1:])
        if 0 <= number <= 31:
            return CANONICAL_NAMES[number]
    raise InvalidRegisterError(f"Registro invalido: {name}")


class RegisterFile:
    def __init__(self, initial: dict[str, int] | None = None):
        self.values = {name: 0 for name in CANONICAL_NAMES.values()}
        self.values["$sp"] = 0x7FFFEFFC
        if initial:
            for register, value in initial.items():
                self.write(register, int(value))

    def read(self, register: str) -> int:
        return self.values[normalize_register(register)]

    def write(self, register: str, value: int) -> None:
        normalized = normalize_register(register)
        if normalized == "$zero":
            return
        self.values[normalized] = to_signed_32(value)

    def snapshot(self) -> dict[str, int]:
        return dict(self.values)


def to_signed_32(value: int) -> int:
    value &= 0xFFFFFFFF
    if value & 0x80000000:
        return value - 0x100000000
    return value
