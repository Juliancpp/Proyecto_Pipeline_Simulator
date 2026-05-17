import type { PipelineCycleEvent, SimResult } from "@/types/pipeline";
import type { ExplanationLevel } from "./aiExplanationService";

export interface CycleTeachingSections {
  title: string;
  summary: string;
  what: string;
  why: string;
  components: string;
  takeaway: string;
  eventSummary: string[];
  signalSummary: string[];
  wireSummary: string[];
}

export function buildCycleTeachingSections(
  result: SimResult,
  cycle: number,
  level: ExplanationLevel
): CycleTeachingSections {
  const ev = result.cycleEvents[cycle - 1];
  const events = ev?.events ?? [];
  const eventTypes = new Set(events.map((event) => event.type));
  const active = ev?.active ?? [];
  const components = ev?.activeComponents ?? result.backend?.cycles[cycle - 1]?.activeComponents ?? [];
  const wires = ev?.activeWires ?? result.backend?.cycles[cycle - 1]?.activeWires ?? [];
  const signals = ev?.controlSignals ?? result.backend?.cycles[cycle - 1]?.controlSignals ?? {};

  return {
    title: cycleTitle(cycle, eventTypes),
    summary: summaryText(result, cycle, events, eventTypes, level),
    what: whatText(events, eventTypes, active, result),
    why: whyText(events, eventTypes),
    components: componentText(components, level),
    takeaway: takeawayText(eventTypes, level),
    eventSummary: educationalEventSummary(events, result),
    signalSummary: signalSummary(signals),
    wireSummary: wires.slice(0, 10),
  };
}

function cycleTitle(cycle: number, eventTypes: Set<PipelineCycleEvent["type"]>): string {
  if (eventTypes.has("stall") || eventTypes.has("bubble")) return `Ciclo ${cycle} - Load-use hazard`;
  if (eventTypes.has("forwarding")) return `Ciclo ${cycle} - Forwarding aplicado`;
  if (eventTypes.has("branch")) return `Ciclo ${cycle} - Branch resuelto`;
  if (eventTypes.has("jump")) return `Ciclo ${cycle} - Jump aplicado`;
  if (eventTypes.has("memory_write")) return `Ciclo ${cycle} - Escritura en memoria`;
  if (eventTypes.has("memory_read")) return `Ciclo ${cycle} - Lectura de memoria`;
  if (eventTypes.has("write_back")) return `Ciclo ${cycle} - Write Back`;
  if (eventTypes.has("alu_execute")) return `Ciclo ${cycle} - Ejecucion en ALU`;
  if (eventTypes.has("register_read")) return `Ciclo ${cycle} - Lectura de registros`;
  if (eventTypes.has("instruction_fetch")) return `Ciclo ${cycle} - Instruction Fetch`;
  return `Ciclo ${cycle} - Avance del pipeline`;
}

function summaryText(
  result: SimResult,
  cycle: number,
  events: PipelineCycleEvent[],
  eventTypes: Set<PipelineCycleEvent["type"]>,
  level: ExplanationLevel
): string {
  if (eventTypes.has("stall") || eventTypes.has("bubble")) {
    return "El procesador conserva la correccion ante una dependencia load-use: detiene el frente del pipeline e inserta una bubble.";
  }
  if (eventTypes.has("forwarding")) {
    const event = first(events, "forwarding");
    return `Una instruccion necesita ${event?.register ?? "un dato"} antes de que llegue a WB. El pipeline usa forwarding para no detenerse.`;
  }
  if (eventTypes.has("branch")) {
    return "El branch decide el siguiente PC en EX. Este modelo espera de forma conservadora hasta conocer la comparacion.";
  }
  if (eventTypes.has("jump")) {
    return "El jump rompe el flujo secuencial y actualiza el PC hacia el label destino.";
  }
  if (eventTypes.has("memory_write")) {
    return "La instruccion store escribe en Data Memory; como no produce un registro, no necesita WriteBack.";
  }
  if (eventTypes.has("memory_read")) {
    return "La instruccion load usa la direccion calculada para leer Data Memory en la etapa MEM.";
  }
  if (eventTypes.has("write_back")) {
    return "El resultado arquitectonico vuelve al Register File para que instrucciones futuras puedan leerlo.";
  }
  const active = result.cycleEvents[cycle - 1]?.active ?? [];
  const rendered = active
    .map((item) => {
      const raw = result.instructions[item.instrId]?.raw ?? "instruccion";
      return `${raw} en ${item.stage}`;
    })
    .join("; ");
  if (!rendered) return "No hay instrucciones activas en este ciclo.";
  if (level === "intuitive") {
    return `El procesador reparte trabajo entre etapas: ${rendered}.`;
  }
  return `El pipeline solapa etapas de distintas instrucciones: ${rendered}.`;
}

function whatText(
  events: PipelineCycleEvent[],
  eventTypes: Set<PipelineCycleEvent["type"]>,
  active: NonNullable<SimResult["cycleEvents"][number]>["active"],
  result: SimResult
): string {
  if (eventTypes.has("stall") || eventTypes.has("bubble")) {
    const event = first(events, "stall") ?? first(events, "bubble");
    return `La instruccion consumidora espera ${event?.register ?? "el registro dependiente"}. PC e IF/ID quedan congelados y el registro ID/EX recibe un NOP.`;
  }
  if (eventTypes.has("forwarding")) {
    const event = first(events, "forwarding");
    const producer = instructionText(result, event?.producerInstructionId);
    const consumer = event?.instructionText ?? instructionText(result, event?.consumerInstructionId);
    return `${consumer} necesita ${event?.register ?? "un registro"} producido por ${producer}. La Forwarding Unit lo envia desde ${event?.source ?? event?.from} hacia ${event?.target ?? event?.to}.`;
  }
  if (eventTypes.has("branch")) {
    const event = first(events, "branch");
    return `${event?.instructionText ?? "El branch"} compara operandos en EX y activa la logica de branch. No se usa prediccion ni flush especulativo.`;
  }
  if (eventTypes.has("jump")) {
    const event = first(events, "jump");
    return `${event?.instructionText ?? "El jump"} actualiza el PC hacia ${event?.target ?? "su destino"}. Las instrucciones intermedias saltadas no se completan.`;
  }
  if (eventTypes.has("memory_read")) {
    const event = first(events, "memory_read");
    return `${event?.instructionText ?? "lw"} lee Data Memory en MEM usando la direccion producida en EX.`;
  }
  if (eventTypes.has("memory_write")) {
    const event = first(events, "memory_write");
    return `${event?.instructionText ?? "sw"} escribe su dato en Data Memory y no activa RegWrite.`;
  }
  if (eventTypes.has("write_back")) {
    const event = first(events, "write_back");
    return `${event?.instructionText ?? "La instruccion"} escribe ${event?.register ?? "su destino"} en el Register File.`;
  }
  if (eventTypes.has("alu_execute")) {
    const event = first(events, "alu_execute");
    return `${event?.instructionText ?? "La instruccion"} usa la ALU para calcular un resultado, una direccion o una comparacion.`;
  }
  if (eventTypes.has("register_read")) {
    const event = first(events, "register_read");
    return `${event?.instructionText ?? "La instruccion"} se decodifica en ID y lee sus operandos del Register File.`;
  }
  if (eventTypes.has("instruction_fetch")) {
    const event = first(events, "instruction_fetch");
    return `${event?.instructionText ?? "La instruccion"} se trae desde Instruction Memory mediante el PC.`;
  }
  if (active.length === 0) return "El pipeline no tiene actividad util visible.";
  return "Las instrucciones activas avanzan por sus etapas sin hazard ni evento especial.";
}

function whyText(events: PipelineCycleEvent[], eventTypes: Set<PipelineCycleEvent["type"]>): string {
  if (eventTypes.has("stall") || eventTypes.has("bubble")) {
    return "Forwarding no alcanza porque el dato de un lw aparece al final de MEM, demasiado tarde para la EX inmediata de la instruccion siguiente.";
  }
  if (eventTypes.has("forwarding")) {
    const event = first(events, "forwarding");
    const target = event?.target === "STORE_DATA" ? "dato de store" : "entrada de la ALU";
    return `El resultado ya existe antes de WB. Reenviarlo hacia ${target} evita un stall sin cambiar el orden arquitectonico.`;
  }
  if (eventTypes.has("branch")) {
    return "Un branch es un control hazard: hasta resolver la comparacion no se conoce con certeza el proximo PC.";
  }
  if (eventTypes.has("jump")) {
    return "Un jump no depende del siguiente PC secuencial; define explicitamente otra direccion de ejecucion.";
  }
  if (eventTypes.has("memory_read")) {
    return "MIPS separa el calculo de direccion en EX del acceso real a memoria en MEM.";
  }
  if (eventTypes.has("memory_write")) {
    return "sw modifica memoria, no un registro; por eso termina en MEM y no pasa por WB.";
  }
  if (eventTypes.has("write_back")) {
    return "WB hace visible el resultado en el estado arquitectonico del procesador.";
  }
  if (eventTypes.has("alu_execute")) return "EX concentra las operaciones aritmeticas, logicas, direcciones y comparaciones.";
  if (eventTypes.has("register_read")) return "ID prepara operandos y senales antes de que la instruccion entre a EX.";
  if (eventTypes.has("instruction_fetch")) return "IF mantiene alimentado el pipeline con la proxima instruccion.";
  return "El solapamiento de etapas aumenta throughput sin cambiar el resultado secuencial del programa.";
}

function componentText(components: string[], level: ExplanationLevel): string {
  if (components.length === 0) return "El backend no reporta componentes activos para este ciclo.";
  if (level === "hardware") return components.slice(0, 14).join(", ");
  return components.slice(0, 10).map(componentLabel).join(", ");
}

function takeawayText(eventTypes: Set<PipelineCycleEvent["type"]>, level: ExplanationLevel): string {
  if (eventTypes.has("stall") || eventTypes.has("bubble")) return "No todo hazard se resuelve con forwarding; load-use inmediato cuesta un ciclo.";
  if (eventTypes.has("forwarding")) return "Forwarding usa resultados disponibles antes de WB para mantener el throughput.";
  if (eventTypes.has("branch")) return "Los hazards de control se resuelven por la ruta del PC, no como hazards de datos.";
  if (eventTypes.has("jump")) return "El PC determina que instrucciones realmente llegan a ejecutarse.";
  if (eventTypes.has("memory_read")) return "Solo lw lee Data Memory y luego necesita WB.";
  if (eventTypes.has("memory_write")) return "sw escribe memoria y no debe activar WriteBack.";
  if (eventTypes.has("write_back")) return "El Register File solo cambia cuando hay una escritura real.";
  if (level === "hardware") return "Las senales y wires activos deben coincidir con etapa, opcode y eventos reales.";
  return "Cada etapa cumple una funcion distinta y el pipeline las ejecuta en paralelo.";
}

function educationalEventSummary(events: PipelineCycleEvent[], result: SimResult): string[] {
  return events.map((event) => {
    if (event.type === "forwarding") {
      const producer = instructionText(result, event.producerInstructionId);
      return `${event.instructionText ?? "La instruccion"} recibe ${event.register ?? "un dato"} desde ${event.source ?? event.from}; productor: ${producer}.`;
    }
    if (event.type === "bubble") return "Bubble: NOP insertado en ID/EX.";
    if (event.type === "stall") return "Stall: PC e IF/ID se congelan en este ciclo.";
    if (event.type === "memory_write") return `${event.instructionText ?? "sw"} escribe Data Memory.`;
    if (event.type === "memory_read") return `${event.instructionText ?? "lw"} lee Data Memory.`;
    if (event.type === "write_back") return `${event.instructionText ?? "La instruccion"} escribe ${event.register ?? "un registro"}.`;
    if (event.type === "branch") return `${event.instructionText ?? "branch"} resuelve el siguiente PC en EX.`;
    if (event.type === "jump") return `${event.instructionText ?? "jump"} cambia el PC al destino.`;
    return event.message;
  });
}

function signalSummary(signals: Record<string, number | string>): string[] {
  const ordered = [
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
  ];
  return ordered.filter((key) => key in signals).map((key) => `${key}=${signals[key]}`);
}

function componentLabel(component: string): string {
  const labels: Record<string, string> = {
    PC: "PC",
    InstructionMemory: "Instruction Memory",
    RegisterFile: "Register File",
    DataMemory: "Data Memory",
    WriteBack: "Write Back",
    ForwardingUnit: "Forwarding Unit",
    HazardDetectionUnit: "Hazard Detection Unit",
    BranchLogic: "Branch Logic",
    JumpTarget: "Jump Target",
    PCSrc: "PCSrc",
    ControlUnit: "Control Unit",
    ControlMux: "Control Mux",
    MemToRegMux: "MemToReg Mux",
  };
  return labels[component] ?? component;
}

function first<T extends PipelineCycleEvent["type"]>(
  events: PipelineCycleEvent[],
  type: T
): PipelineCycleEvent | undefined {
  return events.find((event) => event.type === type);
}

function instructionText(result: SimResult, id?: number | null): string {
  if (typeof id !== "number") return "una instruccion anterior";
  return result.instructions[id]?.raw ?? `instruccion ${id}`;
}
