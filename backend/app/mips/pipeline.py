from __future__ import annotations

from dataclasses import dataclass

from app.mips.datapath import datapath_state
from app.mips.memory import Memory
from app.mips.models import IRInstruction
from app.mips.registers import RegisterFile, to_signed_32
from app.mips.signals import (
    alu_input_registers,
    base_control_signals,
    is_branch,
    is_control,
    is_jump,
    make_event,
    store_data_register,
    uses_memory_read,
    uses_memory_write,
    writes_register,
)


STAGES = ["IF", "ID", "EX", "MEM", "WB"]
IMMEDIATE_ALU_OPS = {"addi", "addiu", "andi", "ori", "xori", "slti", "lw", "sw", "lui"}


@dataclass
class PipeSlot:
    instruction: IRInstruction
    pc: int
    alu_result: int | None = None
    mem_data: int | None = None
    store_value: int | None = None
    result_value: int | None = None


class PipelineSimulator:
    def __init__(
        self,
        instructions: list[IRInstruction],
        forwarding: bool = True,
        mode: str = "pipeline",
        initial_registers: dict[str, int] | None = None,
        initial_memory: dict[int | str, int] | None = None,
        max_cycles: int = 10000,
    ):
        self.instructions = instructions
        self.forwarding = forwarding
        self.mode = mode
        self.registers = RegisterFile(initial_registers)
        self.memory = Memory(initial_memory)
        self.pc_to_instruction = {instruction.address: instruction for instruction in instructions}
        self.pc: int | None = instructions[0].address if instructions else None
        self.pipeline: dict[str, PipeSlot | None] = {stage: None for stage in STAGES}
        self.cycles: list[dict] = []
        self.hazards: list[dict] = []
        self.forwarding_events: list[dict] = []
        self.execution_trace: list[dict] = []
        self.stalls = 0
        self.max_cycles = max_cycles

    def run(self) -> dict:
        if self.mode == "sequential":
            return self._run_sequential()
        return self._run_pipeline()

    def _run_pipeline(self) -> dict:
        cycle = 1
        self.pipeline["IF"] = self._fetch()
        while (self.pc is not None or any(self.pipeline.values())) and cycle <= self.max_cycles:
            stage_map = dict(self.pipeline)
            events: list[dict] = []
            hazards: list[dict] = []
            stalled = False

            load_use = self._detect_load_use(cycle)
            if load_use:
                stalled = True
                self.stalls += 1
                hazards.append(load_use)
                self.hazards.append(load_use)
                events.extend(self._stall_events(cycle, load_use))

            events.extend(self._instruction_fetch_events(cycle, stage_map.get("IF")))
            events.extend(self._register_read_events(cycle, stage_map.get("ID")))

            forwarding_events = self._forwarding_events_for_ex(cycle) if self.forwarding else []
            if not self.forwarding:
                raw_stall = self._detect_no_forwarding_stall(cycle)
                if raw_stall:
                    stalled = True
                    self.stalls += 1
                    hazards.append(raw_stall)
                    self.hazards.append(raw_stall)
                    events.extend(self._stall_events(cycle, raw_stall))
            for event in forwarding_events:
                self.forwarding_events.append(event)
                events.append(event)
                raw_hazard = self._raw_hazard_from_forwarding(event)
                hazards.append(raw_hazard)
                self.hazards.append(raw_hazard)

            events.extend(self._write_back_events(cycle, stage_map.get("WB")))
            store_forwarding = self._store_forwarding_events(cycle)
            for event in store_forwarding:
                self.forwarding_events.append(event)
                events.append(event)
                raw_hazard = self._raw_hazard_from_forwarding(event)
                hazards.append(raw_hazard)
                self.hazards.append(raw_hazard)

            events.extend(self._memory_stage_events(cycle, stage_map.get("MEM")))
            control_resolved, redirect_pc, control_events = self._execute_ex_stage(
                cycle,
                stage_map.get("EX"),
            )
            events.extend(control_events)

            control_signals = self._control_signals(stage_map, events, stalled)
            self.cycles.append(
                self._snapshot_cycle(
                    cycle,
                    hazards,
                    events,
                    stalled,
                    control_signals,
                )
            )
            self._advance(
                stalled=stalled,
                control_resolved=control_resolved,
                redirect_pc=redirect_pc,
            )
            cycle += 1

        return self._result()

    def _run_sequential(self) -> dict:
        cycle = 1
        steps = 0
        while self.pc in self.pc_to_instruction and cycle <= self.max_cycles and steps < self.max_cycles:
            instruction = self.pc_to_instruction[self.pc]
            slot = PipeSlot(instruction=instruction, pc=self.pc)
            self.pc = instruction.address + 4
            for stage in instruction.stages:
                events: list[dict] = []
                stage_map = {item: None for item in STAGES}
                stage_map[stage] = slot
                if stage == "IF":
                    events.extend(self._instruction_fetch_events(cycle, slot))
                elif stage == "ID":
                    events.extend(self._register_read_events(cycle, slot))
                elif stage == "EX":
                    _, redirect_pc, ex_events = self._execute_ex_stage(cycle, slot)
                    events.extend(ex_events)
                    if redirect_pc is not None:
                        self.pc = redirect_pc
                elif stage == "MEM":
                    events.extend(self._memory_stage_events(cycle, slot))
                elif stage == "WB":
                    events.extend(self._write_back_events(cycle, slot))

                control_signals = self._control_signals(stage_map, events, stalled=False)
                self.cycles.append(
                    self._snapshot_cycle(
                        cycle,
                        [],
                        events,
                        False,
                        control_signals,
                        stage_override=stage_map,
                    )
                )
                cycle += 1
            self._record_completed(slot)
            steps += 1
        return self._result()

    def _result(self) -> dict:
        return {
            "cycles": self.cycles,
            "hazards": self.hazards,
            "forwardingEvents": self.forwarding_events,
            "executionTrace": self.execution_trace,
            "metrics": {
                "totalCycles": len(self.cycles),
                "instructionCount": len(self.execution_trace) or len(self.instructions),
                "stalls": self.stalls,
                "forwardingEvents": len(self.forwarding_events),
                "cpi": round(len(self.cycles) / len(self.execution_trace), 3)
                if self.execution_trace
                else 0,
            },
        }

    def _fetch(self) -> PipeSlot | None:
        if self.pc is None:
            return None
        instruction = self.pc_to_instruction.get(self.pc)
        if instruction is None:
            self.pc = None
            return None
        slot = PipeSlot(instruction=instruction, pc=self.pc)
        self.pc = instruction.address + 4
        return slot

    def _advance(
        self,
        *,
        stalled: bool,
        control_resolved: bool,
        redirect_pc: int | None,
    ) -> None:
        old = dict(self.pipeline)
        if stalled:
            completed = old["WB"]
            if completed:
                self._record_completed(completed)
            self.pipeline["WB"] = self._move_to_stage(old["MEM"], "WB")
            if old["MEM"] and self.pipeline["WB"] is None:
                self._record_completed(old["MEM"])
            self.pipeline["MEM"] = self._move_to_stage(old["EX"], "MEM")
            if old["EX"] and self.pipeline["MEM"] is None:
                self._record_completed(old["EX"])
            self.pipeline["EX"] = None
            self.pipeline["ID"] = old["ID"]
            self.pipeline["IF"] = old["IF"]
            return

        completed = old["WB"]
        if completed:
            self._record_completed(completed)

        if redirect_pc is not None:
            self.pc = redirect_pc

        self.pipeline["WB"] = self._move_to_stage(old["MEM"], "WB")
        if old["MEM"] and self.pipeline["WB"] is None:
            self._record_completed(old["MEM"])
        self.pipeline["MEM"] = self._move_to_stage(old["EX"], "MEM")
        if old["EX"] and self.pipeline["MEM"] is None:
            self._record_completed(old["EX"])

        if control_resolved and redirect_pc is not None:
            self.pipeline["EX"] = None
            self.pipeline["ID"] = None
            self.pipeline["IF"] = self._fetch()
            return

        self.pipeline["EX"] = self._move_to_stage(old["ID"], "EX")
        self.pipeline["ID"] = self._move_to_stage(old["IF"], "ID")

        block_fetch = bool(
            (old["IF"] and is_control(old["IF"].instruction))
            or (old["ID"] and is_control(old["ID"].instruction))
        )
        self.pipeline["IF"] = None if block_fetch else self._fetch()

    @staticmethod
    def _move_to_stage(slot: PipeSlot | None, stage: str) -> PipeSlot | None:
        if slot and stage in slot.instruction.stages:
            return slot
        return None

    def _record_completed(self, slot: PipeSlot) -> None:
        instruction = slot.instruction
        if any(item["instructionId"] == instruction.id for item in self.execution_trace):
            return
        self.execution_trace.append(
            {
                "instructionId": instruction.id,
                "instructionText": instruction.source,
                "pc": slot.pc,
                "op": instruction.op,
            }
        )

    def _detect_load_use(self, cycle: int) -> dict | None:
        producer = self.pipeline["EX"]
        consumer = self.pipeline["ID"]
        if not producer or not consumer or producer.instruction.op != "lw":
            return None
        written = producer.instruction.writes[0] if producer.instruction.writes else None
        if not written or written == "$zero":
            return None
        ex_needs = set(alu_input_registers(consumer.instruction).values())
        conflict = sorted({written} & ex_needs)
        if not conflict:
            return None
        return {
            "cycle": cycle,
            "type": "load-use",
            "severity": "stall",
            "producerInstructionId": producer.instruction.id,
            "consumerInstructionId": consumer.instruction.id,
            "registers": conflict,
                    "reason": "El valor cargado no esta disponible a tiempo para la siguiente etapa EX.",
        }

    def _detect_no_forwarding_stall(self, cycle: int) -> dict | None:
        current = self.pipeline["ID"]
        if not current:
            return None
        for producer in [self.pipeline["EX"], self.pipeline["MEM"]]:
            if not producer or not writes_register(producer.instruction):
                continue
            conflict = sorted(set(producer.instruction.writes) & set(current.instruction.uses))
            if conflict:
                return {
                    "cycle": cycle,
                    "type": "RAW",
                    "severity": "stall",
                    "producerInstructionId": producer.instruction.id,
                    "consumerInstructionId": current.instruction.id,
                    "registers": conflict,
                    "reason": "Forwarding esta deshabilitado, por eso la instruccion consumidora espera hasta Write Back.",
                }
        return None

    def _stall_events(self, cycle: int, hazard: dict) -> list[dict]:
        consumer = self._instruction_by_id(hazard.get("consumerInstructionId"))
        signal_values = {"PCWrite": 0, "IF_IDWrite": 0, "ControlMux": 0}
        return [
            make_event(
                event_type="stall",
                cycle=cycle,
                instruction=consumer,
                stage="ID",
                message="Se detecto un load-use hazard. PC e IF/ID quedan congelados.",
                component_ids=["HazardDetectionUnit", "PC", "IF_ID", "ControlMux"],
                wire_ids=["hazard_to_pc", "hazard_to_if_id", "hazard_to_control_mux"],
                source=hazard.get("producerInstructionId"),
                target=hazard.get("consumerInstructionId"),
                register=", ".join(hazard.get("registers", [])),
                signal_values=signal_values,
            ),
            make_event(
                event_type="bubble",
                cycle=cycle,
                instruction=None,
                stage="ID/EX",
                message=(
                    "Se detecto un load-use hazard. PC e IF/ID quedan congelados, "
                    "y se inserta un NOP en ID/EX."
                ),
                component_ids=["HazardDetectionUnit", "ControlMux", "ID_EX"],
                wire_ids=["hazard_to_pc", "hazard_to_if_id", "hazard_to_control_mux"],
                source="HazardDetectionUnit",
                target="ID/EX",
                signal_values=signal_values,
            ),
        ]

    def _instruction_fetch_events(self, cycle: int, slot: PipeSlot | None) -> list[dict]:
        if not slot:
            return []
        return [
            make_event(
                event_type="instruction_fetch",
                cycle=cycle,
                instruction=slot.instruction,
                stage="IF",
                message=f"Se obtiene `{slot.instruction.source}` desde Instruction Memory.",
                component_ids=["PC", "InstructionMemory", "IF_ID"],
                wire_ids=["pc_to_instruction_memory", "instruction_memory_to_if_id"],
            )
        ]

    def _register_read_events(self, cycle: int, slot: PipeSlot | None) -> list[dict]:
        if not slot:
            return []
        instruction = slot.instruction
        components = ["IF_ID", "ControlUnit", "ID_EX"]
        if instruction.uses:
            components.append("RegisterFile")
        if instruction.rs:
            components.extend(["ReadRegister1", "ReadData1"])
        if instruction.rt and instruction.op not in {"lw", "addi", "addiu", "andi", "ori", "xori", "slti", "lui"}:
            components.extend(["ReadRegister2", "ReadData2"])
        if instruction.immediate is not None or is_branch(instruction):
            components.append("SignExtend")
        return [
            make_event(
                event_type="register_read",
                cycle=cycle,
                instruction=instruction,
                stage="ID",
                message=f"Se decodifica `{instruction.source}` y se leen los registros requeridos.",
                component_ids=components,
                wire_ids=["if_id_to_register_file", "register_file_to_id_ex"],
            )
        ]

    def _forwarding_events_for_ex(self, cycle: int) -> list[dict]:
        slot = self.pipeline["EX"]
        if not slot:
            return []
        events: list[dict] = []
        for input_name, register in alu_input_registers(slot.instruction).items():
            if not register or register == "$zero":
                continue
            source_name, producer = self._forwarding_source_for_ex(register)
            if not source_name or not producer:
                continue
            signal_name = "ForwardA" if input_name == "A" else "ForwardB"
            signal_value = "10" if source_name == "EX/MEM" else "01"
            wire = (
                f"ex_mem_forward_to_alu_{input_name.lower()}"
                if source_name == "EX/MEM"
                else f"mem_wb_forward_to_alu_{input_name.lower()}"
            )
            event = make_event(
                event_type="forwarding",
                cycle=cycle,
                instruction=slot.instruction,
                stage="EX",
                message=f"Se reenvia {register} desde {source_name} hacia la entrada {input_name} de la ALU.",
                component_ids=["ForwardingUnit", f"Mux{input_name}", "ALU"],
                wire_ids=[wire],
                source=source_name,
                target=f"ALU_INPUT_{input_name}",
                register=register,
                signal_values={signal_name: signal_value},
            )
            event.update(
                {
                    "from": source_name,
                    "to": f"ALU_INPUT_{input_name}",
                    "producerInstructionId": producer.instruction.id,
                    "consumerInstructionId": slot.instruction.id,
                }
            )
            events.append(event)
        return events

    def _store_forwarding_events(self, cycle: int) -> list[dict]:
        slot = self.pipeline["MEM"]
        register = store_data_register(slot.instruction if slot else None)
        if not slot or not register or register == "$zero":
            return []
        producer = self.pipeline["WB"]
        if not producer or not writes_register(producer.instruction):
            return []
        if register not in producer.instruction.writes:
            return []
        event = make_event(
            event_type="forwarding",
            cycle=cycle,
            instruction=slot.instruction,
            stage="MEM",
            message=f"Se reenvia {register} desde MEM/WB hacia el dato que escribira el store.",
            component_ids=["ForwardingUnit", "DataMemory"],
            wire_ids=["mem_wb_forward_to_store_data"],
            source="MEM/WB",
            target="STORE_DATA",
            register=register,
            signal_values={},
        )
        event.update(
            {
                "from": "MEM/WB",
                "to": "STORE_DATA",
                "producerInstructionId": producer.instruction.id,
                "consumerInstructionId": slot.instruction.id,
            }
        )
        return [event]

    def _forwarding_source_for_ex(self, register: str) -> tuple[str | None, PipeSlot | None]:
        mem = self.pipeline["MEM"]
        if (
            mem
            and writes_register(mem.instruction)
            and register in mem.instruction.writes
            and mem.instruction.op != "lw"
        ):
            return "EX/MEM", mem
        wb = self.pipeline["WB"]
        if wb and writes_register(wb.instruction) and register in wb.instruction.writes:
            return "MEM/WB", wb
        return None, None

    @staticmethod
    def _raw_hazard_from_forwarding(event: dict) -> dict:
        return {
            "cycle": event["cycle"],
            "type": "RAW",
            "severity": "forwarding",
            "producerInstructionId": event.get("producerInstructionId"),
            "consumerInstructionId": event.get("consumerInstructionId"),
            "registers": [event["register"]] if event.get("register") else [],
            "reason": "La instruccion consumidora usa un registro producido antes y forwarding entrega ese dato.",
        }

    def _write_back_events(self, cycle: int, slot: PipeSlot | None) -> list[dict]:
        if not slot or not writes_register(slot.instruction):
            return []
        value = self._slot_result(slot)
        self.registers.write(slot.instruction.writes[0], value)
        return [
            make_event(
                event_type="write_back",
                cycle=cycle,
                instruction=slot.instruction,
                stage="WB",
                message=(
                    f"`{slot.instruction.source}` escribe el resultado en {slot.instruction.writes[0]} "
                    "dentro del Register File."
                ),
                component_ids=["MEM_WB", "MemToRegMux", "WriteBack", "RegisterFile", "WriteRegister", "WriteData"],
                wire_ids=["mem_wb_to_register_file"],
                register=slot.instruction.writes[0],
                signal_values={
                    "RegWrite": 1,
                    "MemToReg": 1 if slot.instruction.op == "lw" else 0,
                },
            )
        ]

    def _memory_stage_events(self, cycle: int, slot: PipeSlot | None) -> list[dict]:
        if not slot:
            return []
        instruction = slot.instruction
        if instruction.op == "lw":
            address = slot.alu_result or 0
            slot.mem_data = self.memory.load_word(address)
            slot.result_value = slot.mem_data
            return [
                make_event(
                    event_type="memory_read",
                    cycle=cycle,
                    instruction=instruction,
                    stage="MEM",
                    message=f"`{instruction.source}` lee un dato desde Data Memory.",
                    component_ids=["EX_MEM", "DataMemory", "MEM_WB"],
                    wire_ids=["ex_mem_to_data_memory", "data_memory_to_mem_wb"],
                    signal_values={"MemRead": 1, "MemToReg": 1},
                )
            ]
        if instruction.op == "sw":
            address = slot.alu_result or 0
            value = self._store_value(slot)
            slot.store_value = value
            self.memory.store_word(address, value)
            return [
                make_event(
                    event_type="memory_write",
                    cycle=cycle,
                    instruction=instruction,
                    stage="MEM",
                    message=f"`{instruction.source}` escribe un dato en Data Memory.",
                    component_ids=["EX_MEM", "DataMemory"],
                    wire_ids=["ex_mem_to_data_memory"],
                    signal_values={"MemWrite": 1},
                )
            ]
        if "MEM" in instruction.stages:
            return [
                make_event(
                    event_type="pipeline_advance",
                    cycle=cycle,
                    instruction=instruction,
                    stage="MEM",
                    message=f"`{instruction.source}` pasa por MEM sin acceder a Data Memory.",
                    component_ids=["EX_MEM", "MEM_WB"],
                    wire_ids=[],
                )
            ]
        return []

    def _execute_ex_stage(self, cycle: int, slot: PipeSlot | None) -> tuple[bool, int | None, list[dict]]:
        if not slot:
            return False, None, []
        instruction = slot.instruction
        events: list[dict] = []
        control_resolved = False
        redirect_pc: int | None = None

        if is_jump(instruction):
            control_resolved = True
            if instruction.op == "jr":
                redirect_pc = self._read_operand(instruction.rs)
            else:
                redirect_pc = instruction.target_address
            if instruction.op == "jal":
                slot.result_value = instruction.address + 4
                self.registers.write("$ra", slot.result_value)
                events.append(
                    make_event(
                        event_type="write_back",
                        cycle=cycle,
                        instruction=instruction,
                        stage="EX",
                        message=f"`{instruction.source}` escribe la direccion de retorno en $ra.",
                        component_ids=["RegisterFile", "WriteRegister", "WriteData"],
                        wire_ids=[],
                        register="$ra",
                        signal_values={"RegWrite": 1},
                    )
                )
            events.append(
                make_event(
                    event_type="jump",
                    cycle=cycle,
                    instruction=instruction,
                    stage="EX",
                    message=f"`{instruction.source}` actualiza el PC hacia el destino del jump.",
                    component_ids=["JumpTarget", "PCSrc", "PC"],
                    wire_ids=["jump_to_pc"],
                    source=instruction.source,
                    target=instruction.target or "register target",
                    signal_values={"Jump": 1, "PCWrite": 1},
                )
            )
            return control_resolved, redirect_pc, events

        alu_components = ["ID_EX", "ALU"]
        alu_wires = []
        operands = alu_input_registers(instruction)
        if operands.get("A"):
            alu_components.append("MuxA")
            alu_wires.append("id_ex_to_alu_a")
        if operands.get("B") or instruction.op in IMMEDIATE_ALU_OPS:
            alu_components.append("MuxB")
            alu_wires.append("id_ex_to_alu_b")
        if "MEM" in instruction.stages:
            alu_components.append("EX_MEM")
            alu_wires.append("alu_to_ex_mem")

        a = self._read_operand(operands.get("A"))
        b = self._read_operand(operands.get("B"))
        imm = instruction.immediate or 0
        op = instruction.op
        if op in {"add", "addu"}:
            slot.alu_result = to_signed_32(a + b)
        elif op in {"addi", "addiu"}:
            slot.alu_result = to_signed_32(a + imm)
        elif op in {"sub", "subu"}:
            slot.alu_result = to_signed_32(a - b)
        elif op == "and":
            slot.alu_result = to_signed_32(a & b)
        elif op == "andi":
            slot.alu_result = to_signed_32(a & imm)
        elif op == "or":
            slot.alu_result = to_signed_32(a | b)
        elif op == "ori":
            slot.alu_result = to_signed_32(a | imm)
        elif op == "xor":
            slot.alu_result = to_signed_32(a ^ b)
        elif op == "xori":
            slot.alu_result = to_signed_32(a ^ imm)
        elif op == "nor":
            slot.alu_result = to_signed_32(~(a | b))
        elif op == "slt":
            slot.alu_result = 1 if a < b else 0
        elif op == "slti":
            slot.alu_result = 1 if a < imm else 0
        elif op == "sll":
            slot.alu_result = to_signed_32(b << (instruction.shamt or 0))
        elif op == "srl":
            slot.alu_result = to_signed_32((b & 0xFFFFFFFF) >> (instruction.shamt or 0))
        elif op == "lui":
            slot.alu_result = to_signed_32(imm << 16)
        elif op in {"lw", "sw"}:
            slot.alu_result = to_signed_32(a + imm)
        elif op in {"beq", "bne"}:
            control_resolved = True
            taken = (a == b) if op == "beq" else (a != b)
            redirect_pc = instruction.target_address if taken else None
            alu_components.extend(["BranchLogic"])
            events.append(
                make_event(
                    event_type="alu_execute",
                    cycle=cycle,
                    instruction=instruction,
                    stage="EX",
                    message=f"`{instruction.source}` compara operandos de registros en la ALU.",
                    component_ids=alu_components,
                    wire_ids=alu_wires,
                    signal_values={"Branch": 1},
                )
            )
            branch_components = ["BranchLogic"]
            branch_wires: list[str] = []
            if taken:
                branch_components.extend(["PCSrc", "PC"])
                branch_wires.append("branch_to_pcsrc")
            events.append(
                make_event(
                    event_type="branch",
                    cycle=cycle,
                    instruction=instruction,
                    stage="EX",
                    message=(
                        f"`{instruction.source}` evalua el branch como "
                        f"{'tomado' if taken else 'no tomado'}. El modelo del pipeline espera "
                        "conservadoramente hasta EX; no modela prediccion ni flush especulativo."
                    ),
                    component_ids=branch_components,
                    wire_ids=branch_wires,
                    source=instruction.source,
                    target=instruction.target,
                    signal_values={"Branch": 1, "PCSrc": 1 if taken else 0},
                )
            )
            return control_resolved, redirect_pc, events

        slot.result_value = slot.alu_result
        events.append(
            make_event(
                event_type="alu_execute",
                cycle=cycle,
                instruction=instruction,
                stage="EX",
                message=f"`{instruction.source}` se ejecuta en la ALU.",
                component_ids=alu_components,
                wire_ids=alu_wires,
                signal_values={"ALUSrc": 1 if op in IMMEDIATE_ALU_OPS else 0},
            )
        )
        return control_resolved, redirect_pc, events

    def _read_operand(self, register: str | None) -> int:
        if not register:
            return 0
        source_name, producer = self._forwarding_source_for_ex(register)
        if source_name and producer:
            return self._slot_result(producer)
        return self.registers.read(register)

    def _store_value(self, slot: PipeSlot) -> int:
        register = store_data_register(slot.instruction)
        if not register:
            return 0
        producer = self.pipeline["WB"]
        if producer and writes_register(producer.instruction) and register in producer.instruction.writes:
            return self._slot_result(producer)
        return self.registers.read(register)

    @staticmethod
    def _slot_result(slot: PipeSlot) -> int:
        if slot.instruction.op == "lw":
            return slot.mem_data if slot.mem_data is not None else slot.result_value or 0
        return slot.result_value if slot.result_value is not None else slot.alu_result or 0

    def _control_signals(
        self,
        stage_map: dict[str, PipeSlot | None],
        events: list[dict],
        stalled: bool,
    ) -> dict[str, int | str]:
        signals = base_control_signals()
        ex = stage_map.get("EX").instruction if stage_map.get("EX") else None
        mem = stage_map.get("MEM").instruction if stage_map.get("MEM") else None
        wb = stage_map.get("WB").instruction if stage_map.get("WB") else None

        if ex:
            signals["ALUSrc"] = 1 if ex.op in IMMEDIATE_ALU_OPS else 0
            signals["Branch"] = 1 if is_branch(ex) else 0
            signals["Jump"] = 1 if is_jump(ex) else 0
        if mem:
            signals["MemRead"] = 1 if uses_memory_read(mem) else 0
            signals["MemWrite"] = 1 if uses_memory_write(mem) else 0
        if wb and writes_register(wb):
            signals["RegWrite"] = 1
            signals["MemToReg"] = 1 if wb.op == "lw" else 0
        if stalled:
            signals["PCWrite"] = 0
            signals["IF_IDWrite"] = 0
            signals["ControlMux"] = 0
        for event in events:
            for key, value in event.get("signalValues", {}).items():
                signals[key] = value
        return signals

    def _snapshot_cycle(
        self,
        cycle: int,
        hazards: list[dict],
        events: list[dict],
        stalled: bool,
        control_signals: dict[str, int | str],
        stage_override: dict[str, PipeSlot | None] | None = None,
    ) -> dict:
        stage_map = stage_override or dict(self.pipeline)
        instructions = []
        for stage in STAGES:
            slot = stage_map.get(stage)
            if slot:
                instructions.append(
                    {
                        "instructionId": slot.instruction.id,
                        "stage": stage,
                        "source": slot.instruction.source,
                        "op": slot.instruction.op,
                    }
                )

        data = datapath_state(events)
        return {
            "cycle": cycle,
            "instructions": instructions,
            "stalls": [
                {
                    "stage": event["stage"],
                    "reason": event["message"],
                    "signals": event.get("signalValues", {}),
                    "annotations": ["PC congelado", "IF/ID congelado", "ID/EX recibe bubble"],
                }
                for event in events
                if event["type"] == "stall"
            ],
            "bubbles": [
                {
                    "stage": event["stage"],
                    "type": "NOP",
                    "label": "NOP / STALL",
                    "reason": event["message"],
                }
                for event in events
                if event["type"] == "bubble"
            ],
            "hazards": hazards,
            "forwarding": [event for event in events if event["type"] == "forwarding"],
            "cycleEvents": events,
            "explanation": self._explain_cycle(cycle, stage_map, events, stalled),
            "pipelineRegisters": {
                "IF/ID": self._pipe_reg(stage_map.get("IF")),
                "ID/EX": {"bubble": True} if stalled else self._pipe_reg(stage_map.get("ID")),
                "EX/MEM": self._pipe_reg(stage_map.get("EX")),
                "MEM/WB": self._pipe_reg(stage_map.get("MEM")),
            },
            "controlSignals": control_signals,
            "datapath": data,
            "activeComponents": data["activeComponents"],
            "activeWires": data["activeWires"],
        }

    @staticmethod
    def _pipe_reg(slot: PipeSlot | None) -> dict | None:
        if not slot:
            return None
        instruction = slot.instruction
        return {
            "instructionId": instruction.id,
            "op": instruction.op,
            "source": instruction.source,
            "uses": instruction.uses,
            "writes": instruction.writes,
        }

    @staticmethod
    def _explain_cycle(
        cycle: int,
        stage_map: dict[str, PipeSlot | None],
        events: list[dict],
        stalled: bool,
    ) -> str:
        active = [
            f"`{slot.instruction.source}` esta en {stage}"
            for stage, slot in stage_map.items()
            if slot
        ]
        text = f"En el ciclo {cycle}, " + ("; ".join(active) if active else "el pipeline esta vacio") + "."
        if stalled:
            text += " Se congela PC e IF/ID y se inserta una bubble en ID/EX."
        for event in events:
            if event["type"] in {"forwarding", "memory_read", "memory_write", "write_back", "branch", "jump"}:
                text += f" {event['message']}"
        return text

    def _instruction_by_id(self, instruction_id: object) -> IRInstruction | None:
        if not isinstance(instruction_id, int):
            return None
        for instruction in self.instructions:
            if instruction.id == instruction_id:
                return instruction
        return None
