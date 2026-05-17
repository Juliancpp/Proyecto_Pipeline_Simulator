from __future__ import annotations

from contextlib import contextmanager

from fastapi import APIRouter, HTTPException

from app.mips.exceptions import (
    InvalidImmediateError,
    InvalidRegisterError,
    LabelNotFoundError,
    MemoryAccessError,
    MIPSError,
    MIPSSyntaxError,
    UnknownInstructionError,
)

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "mips-pipeline-backend"}


@contextmanager
def translate_mips_errors():
    try:
        yield
    except UnknownInstructionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (InvalidRegisterError, InvalidImmediateError, LabelNotFoundError, MIPSSyntaxError, MemoryAccessError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except MIPSError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
