from __future__ import annotations

from typing import Any


LEVELS = {"intuitive", "university", "hardware"}


class ExplanationService:
    def explain_cycle(
        self,
        cycle: dict,
        program: list[dict] | None = None,
        level: str = "university",
    ) -> str:
        return build_deterministic_explanation(
            {
                "cycle": cycle.get("cycle"),
                "activeInstructions": _active_instructions(cycle),
                "cycleEvents": cycle.get("cycleEvents", []),
                "activeComponents": cycle.get("activeComponents", []),
                "activeWires": cycle.get("activeWires", []),
                "controlSignals": cycle.get("controlSignals", {}),
                "hazards": cycle.get("hazards", []),
                "program": program or [],
            },
            level=level,
        )


def build_deterministic_explanation(
    context: dict[str, Any],
    *,
    level: str = "university",
    reason: str | None = None,
) -> str:
    normalized_level = _normalize_level(level or context.get("explanationLevel"))
    events = _events(context)
    event_types = {event.get("type") for event in events}
    active = _active_from_context(context)
    title = _title(context.get("cycle"), event_types)
    summary = _summary(active, events, event_types, normalized_level)
    what = _what_happens(active, events, event_types)
    why = _why_it_happens(events, event_types)
    components = _component_text(context, normalized_level)
    takeaway = _takeaway(event_types, normalized_level)
    prefix = f"{reason}\n\n" if reason else ""

    return (
        f"{prefix}{title}\n\n"
        f"Resumen educativo: {summary}\n\n"
        f"Que esta ocurriendo: {what}\n\n"
        f"Por que ocurre: {why}\n\n"
        f"Componentes que participan: {components}\n\n"
        f"Que aprende el estudiante: {takeaway}"
    )


def _active_instructions(cycle: dict) -> list[dict[str, Any]]:
    return [
        {
            "instrId": item.get("instructionId"),
            "raw": item.get("source"),
            "stage": item.get("stage"),
            "op": item.get("op"),
        }
        for item in cycle.get("instructions", [])
        if isinstance(item, dict)
    ]


def _normalize_level(value: Any) -> str:
    if value in LEVELS:
        return str(value)
    return "university"


def _events(context: dict[str, Any]) -> list[dict[str, Any]]:
    events = context.get("cycleEvents", [])
    return [event for event in events if isinstance(event, dict)]


def _active_from_context(context: dict[str, Any]) -> list[dict[str, Any]]:
    active = context.get("activeInstructions", [])
    return [item for item in active if isinstance(item, dict)]


def _title(cycle: Any, event_types: set[Any]) -> str:
    label = "Avance del pipeline"
    if "stall" in event_types or "bubble" in event_types:
        label = "Load-use hazard"
    elif "forwarding" in event_types:
        label = "Forwarding aplicado"
    elif "branch" in event_types:
        label = "Branch resuelto"
    elif "jump" in event_types:
        label = "Jump aplicado"
    elif "memory_write" in event_types:
        label = "Escritura en memoria"
    elif "memory_read" in event_types:
        label = "Lectura de memoria"
    elif "write_back" in event_types:
        label = "Write Back"
    elif "alu_execute" in event_types:
        label = "Ejecucion en ALU"
    elif "register_read" in event_types:
        label = "Lectura de registros"
    elif "instruction_fetch" in event_types:
        label = "Instruction Fetch"
    return f"Ciclo {cycle} - {label}"


def _summary(
    active: list[dict[str, Any]],
    events: list[dict[str, Any]],
    event_types: set[Any],
    level: str,
) -> str:
    if not active and not events:
        return "el pipeline no tiene trabajo util en este ciclo."
    if "stall" in event_types or "bubble" in event_types:
        return (
            "el procesador se detiene un ciclo para preservar la correccion de una "
            "dependencia load-use."
        )
    if "forwarding" in event_types:
        event = _first(events, "forwarding")
        reg = event.get("register") if event else "un registro"
        return (
            f"una instruccion necesita {reg} antes de que llegue a WB, asi que el "
            "dato se reenvia desde una etapa posterior hacia la ALU."
        )
    if "branch" in event_types:
        return (
            "la instruccion de branch decide si el PC sigue secuencialmente o cambia "
            "hacia el label destino."
        )
    if "jump" in event_types:
        return "el flujo secuencial se rompe y el PC se actualiza hacia el destino del salto."
    if "memory_read" in event_types:
        return "una instruccion lw usa la direccion calculada para leer Data Memory."
    if "memory_write" in event_types:
        return "una instruccion sw escribe su dato en Data Memory y por eso no necesita WB."
    if "write_back" in event_types:
        return "un resultado calculado vuelve al Register File para quedar disponible."
    rendered = ", ".join(
        f"{item.get('raw', '?')} en {item.get('stage', '?')}" for item in active
    )
    if level == "intuitive":
        return f"el procesador reparte trabajo entre etapas: {rendered}."
    return f"hay instrucciones ocupando etapas del pipeline de 5 fases: {rendered}."


def _what_happens(
    active: list[dict[str, Any]],
    events: list[dict[str, Any]],
    event_types: set[Any],
) -> str:
    if "stall" in event_types or "bubble" in event_types:
        event = _first(events, "stall") or _first(events, "bubble")
        reg = event.get("register") if event else "el registro dependiente"
        return (
            f"la instruccion consumidora necesita {reg}, pero el dato viene de un lw "
            "que aun esta llegando desde memoria. PC e IF/ID quedan congelados y se "
            "inyecta un NOP en ID/EX."
        )
    if "forwarding" in event_types:
        event = _first(events, "forwarding")
        consumer = event.get("instructionText") or "la instruccion consumidora"
        reg = event.get("register") or "el registro dependiente"
        source = event.get("source") or event.get("from") or "una etapa posterior"
        target = event.get("target") or event.get("to") or "la entrada de la ALU"
        return (
            f"{consumer} necesita {reg}. Como el valor ya existe en {source}, la "
            f"Forwarding Unit lo envia directamente hacia {target}."
        )
    if "branch" in event_types:
        event = _first(events, "branch")
        return (
            f"{event.get('instructionText', 'el branch')} compara operandos en EX. "
            "Este simulador espera conservadoramente hasta EX: no predice ni modela "
            "flush especulativo."
        )
    if "jump" in event_types:
        event = _first(events, "jump")
        return (
            f"{event.get('instructionText', 'el jump')} actualiza el PC hacia "
            "su destino, asi que las instrucciones intermedias saltadas no se completan."
        )
    if "memory_read" in event_types:
        event = _first(events, "memory_read")
        return (
            f"{event.get('instructionText', 'lw')} accede a Data Memory en MEM con "
            "la direccion que se calculo en EX."
        )
    if "memory_write" in event_types:
        event = _first(events, "memory_write")
        return (
            f"{event.get('instructionText', 'sw')} guarda el dato leido del Register "
            "File en Data Memory. No escribe un registro de vuelta."
        )
    if "write_back" in event_types:
        event = _first(events, "write_back")
        reg = event.get("register") or "su registro destino"
        return f"{event.get('instructionText', 'la instruccion')} escribe {reg} en el Register File."
    if "alu_execute" in event_types:
        event = _first(events, "alu_execute")
        return f"{event.get('instructionText', 'la instruccion')} usa la ALU en EX."
    if "register_read" in event_types:
        event = _first(events, "register_read")
        return f"{event.get('instructionText', 'la instruccion')} se decodifica y lee operandos en ID."
    if "instruction_fetch" in event_types:
        event = _first(events, "instruction_fetch")
        return f"{event.get('instructionText', 'la instruccion')} se trae desde Instruction Memory en IF."
    if active:
        return "las instrucciones avanzan por sus etapas sin eventos especiales en este ciclo."
    return "no hay actividad visible del pipeline."


def _why_it_happens(events: list[dict[str, Any]], event_types: set[Any]) -> str:
    if "stall" in event_types or "bubble" in event_types:
        return (
            "forwarding no alcanza en un load-use inmediato porque el dato cargado "
            "aparece al final de MEM, demasiado tarde para la EX del ciclo siguiente."
        )
    if "forwarding" in event_types:
        return (
            "el resultado ya fue calculado antes de WB. Reenviarlo evita una parada "
            "sin violar la dependencia RAW."
        )
    if "branch" in event_types:
        return (
            "un branch es un hazard de control: hasta conocer la comparacion, el "
            "procesador no sabe con certeza cual debe ser el siguiente PC."
        )
    if "jump" in event_types:
        return "un jump cambia directamente el PC, por eso rompe el camino secuencial normal."
    if "memory_read" in event_types:
        return "lw separa el calculo de direccion en EX del acceso real a memoria en MEM."
    if "memory_write" in event_types:
        return "sw modifica memoria, no el Register File; por eso su recorrido termina en MEM."
    if "write_back" in event_types:
        return "WB cierra la instruccion para que instrucciones futuras lean el resultado correcto."
    if "alu_execute" in event_types:
        return "EX concentra calculos aritmeticos, logicos, direcciones y comparaciones."
    if "register_read" in event_types:
        return "ID prepara operandos y senales de control antes de ejecutar."
    if "instruction_fetch" in event_types:
        return "IF mantiene alimentado el pipeline trayendo la siguiente instruccion."
    return "el pipeline aumenta throughput al solapar etapas de instrucciones distintas."


def _component_text(context: dict[str, Any], level: str) -> str:
    components = [str(item) for item in context.get("activeComponents", [])]
    wires = [str(item) for item in context.get("activeWires", [])]
    signals = context.get("controlSignals", {})
    if not components:
        return "no hay componentes activos reportados para este ciclo."
    if level == "intuitive":
        return _friendly_components(components)
    if level == "hardware":
        signal_text = _signal_text(signals)
        wire_text = ", rutas: " + ", ".join(wires[:8]) if wires else ""
        return f"{', '.join(components[:14])}{wire_text}{signal_text}."
    return _friendly_components(components) + " Estos componentes coinciden con los eventos reales del ciclo."


def _takeaway(event_types: set[Any], level: str) -> str:
    if "stall" in event_types or "bubble" in event_types:
        return "algunas dependencias obligan a perder un ciclo aun con forwarding."
    if "forwarding" in event_types:
        return "forwarding mejora el throughput porque usa resultados disponibles antes de WB."
    if "branch" in event_types:
        return "los hazards de control se tratan aparte de los hazards de datos."
    if "jump" in event_types:
        return "el PC define el flujo del programa; un salto cambia que instrucciones se ejecutan."
    if "memory_read" in event_types:
        return "solo lw lee Data Memory y luego necesita WB para escribir el registro destino."
    if "memory_write" in event_types:
        return "sw escribe memoria y no debe activar RegWrite ni WriteBack."
    if "write_back" in event_types:
        return "WB hace visible el resultado arquitectonico en el Register File."
    if level == "hardware":
        return "las senales activas deben coincidir con la etapa y el tipo real de instruccion."
    return "cada etapa hace una parte distinta del trabajo y el pipeline las solapa."


def _friendly_components(components: list[str]) -> str:
    labels = {
        "PC": "PC",
        "InstructionMemory": "Instruction Memory",
        "RegisterFile": "Register File",
        "ALU": "ALU",
        "DataMemory": "Data Memory",
        "WriteBack": "Write Back",
        "ForwardingUnit": "Forwarding Unit",
        "HazardDetectionUnit": "Hazard Detection Unit",
        "BranchLogic": "Branch Logic",
        "JumpTarget": "Jump Target",
        "PCSrc": "PCSrc",
    }
    rendered = [labels.get(component, component) for component in components[:10]]
    return ", ".join(rendered) + "."


def _signal_text(signals: Any) -> str:
    if not isinstance(signals, dict) or not signals:
        return ""
    keys = [
        "RegWrite",
        "MemRead",
        "MemWrite",
        "MemToReg",
        "ALUSrc",
        "Branch",
        "Jump",
        "PCWrite",
        "IF_IDWrite",
        "ControlMux",
        "ForwardA",
        "ForwardB",
    ]
    rendered = [f"{key}={signals[key]}" for key in keys if key in signals]
    return "; senales: " + ", ".join(rendered) if rendered else ""


def _first(events: list[dict[str, Any]], event_type: str) -> dict[str, Any] | None:
    return next((event for event in events if event.get("type") == event_type), None)
