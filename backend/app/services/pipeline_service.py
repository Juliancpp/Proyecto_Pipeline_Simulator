from __future__ import annotations

from app.mips.engine import MIPSEngine
from app.mips.parser import parse_mips
from app.mips.pipeline import PipelineSimulator
from app.mips.transpiler import transpile


class PipelineService:
    def parse(self, code: str) -> dict:
        program = parse_mips(code)
        ir = transpile(program)
        return {
            "program": [instruction.to_dict() for instruction in ir],
            "labels": program.labels,
            "dataLabels": program.data_labels,
            "dataMemory": {str(address): value for address, value in program.data_memory.items()},
        }

    def run(
        self,
        code: str,
        initial_registers: dict[str, int] | None = None,
        initial_memory: dict[str, int] | None = None,
    ) -> dict:
        program = parse_mips(code)
        ir = transpile(program)
        memory = {**program.data_memory}
        if initial_memory:
            memory.update({int(address): value for address, value in initial_memory.items()})
        result = MIPSEngine(ir, initial_registers=initial_registers, initial_memory=memory).run()
        result["program"] = [instruction.to_dict() for instruction in ir]
        return result

    def simulate(
        self,
        code: str,
        forwarding: bool = True,
        mode: str = "pipeline",
        initial_registers: dict[str, int] | None = None,
        initial_memory: dict[str, int] | None = None,
    ) -> dict:
        program = parse_mips(code)
        ir = transpile(program)
        memory = {**program.data_memory}
        if initial_memory:
            memory.update({int(address): value for address, value in initial_memory.items()})
        pipeline = PipelineSimulator(
            ir,
            forwarding=forwarding,
            mode=mode,
            initial_registers=initial_registers,
            initial_memory=memory,
        ).run()
        final = MIPSEngine(ir, initial_registers=initial_registers, initial_memory=memory).run()
        return {
            "program": [instruction.to_dict() for instruction in ir],
            "cycles": pipeline["cycles"],
            "hazards": pipeline["hazards"],
            "forwardingEvents": pipeline["forwardingEvents"],
            "executionTrace": pipeline["executionTrace"],
            "mode": mode,
            "metrics": pipeline["metrics"],
            "finalState": {
                "registers": final["registers"],
                "memory": final["memory"],
                "executionTrace": final["trace"],
            },
        }
