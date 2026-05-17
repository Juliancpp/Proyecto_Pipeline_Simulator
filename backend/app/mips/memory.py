from __future__ import annotations

from app.mips.exceptions import MemoryAccessError
from app.mips.registers import to_signed_32


class Memory:
    def __init__(self, initial: dict[int | str, int] | None = None):
        self.words: dict[int, int] = {}
        if initial:
            for address, value in initial.items():
                self.store_word(int(address), int(value))

    def load_word(self, address: int) -> int:
        self._validate_word_address(address)
        return self.words.get(address, 0)

    def store_word(self, address: int, value: int) -> None:
        self._validate_word_address(address)
        self.words[address] = to_signed_32(value)

    def snapshot(self) -> dict[str, int]:
        return {str(address): value for address, value in sorted(self.words.items())}

    @staticmethod
    def _validate_word_address(address: int) -> None:
        if address < 0:
            raise MemoryAccessError(f"Direccion de memoria invalida: {address}")
        if address % 4 != 0:
            raise MemoryAccessError(f"Direccion no alineada a palabra: {address}")
