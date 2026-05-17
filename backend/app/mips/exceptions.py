class MIPSError(ValueError):
    """Base exception for user-facing MIPS errors."""


class MIPSSyntaxError(MIPSError):
    pass


class UnknownInstructionError(MIPSError):
    pass


class InvalidRegisterError(MIPSError):
    pass


class LabelNotFoundError(MIPSError):
    pass


class InvalidImmediateError(MIPSError):
    pass


class MemoryAccessError(MIPSError):
    pass
