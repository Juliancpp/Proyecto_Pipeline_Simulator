from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.api.data import EXAMPLE_PROGRAMS
from app.api.routes import translate_mips_errors
from app.schemas.instruction import ParseRequest
from app.services.pipeline_service import PipelineService

router = APIRouter(prefix="/api/mips", tags=["mips"])
program_router = APIRouter(prefix="/api/programs", tags=["programs"])
service = PipelineService()


@router.post("/parse")
def parse_program(request: ParseRequest) -> dict:
    with translate_mips_errors():
        return service.parse(request.code)


@program_router.get("")
def list_programs() -> list[dict]:
    return EXAMPLE_PROGRAMS


@program_router.get("/{program_id}")
def get_program(program_id: str) -> dict:
    for program in EXAMPLE_PROGRAMS:
        if program["id"] == program_id:
            return program
    raise HTTPException(status_code=404, detail="Programa no encontrado")
