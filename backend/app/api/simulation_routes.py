from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import translate_mips_errors
from app.schemas.simulation import RunRequest, SimulationRequest
from app.services.pipeline_service import PipelineService

router = APIRouter(prefix="/api", tags=["simulation"])
service = PipelineService()


@router.post("/pipeline/simulate")
def simulate_pipeline(request: SimulationRequest) -> dict:
    with translate_mips_errors():
        return service.simulate(
            request.code,
            forwarding=request.forwarding,
            mode=request.mode,
            initial_registers=request.initialRegisters,
            initial_memory=request.initialMemory,
        )


@router.post("/mips/run")
def run_mips(request: RunRequest) -> dict:
    with translate_mips_errors():
        return service.run(
            request.code,
            initial_registers=request.initialRegisters,
            initial_memory=request.initialMemory,
        )
