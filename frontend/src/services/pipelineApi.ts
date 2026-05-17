import type {
  BackendCycle,
  BackendForwardingEvent,
  BackendInstruction,
  BackendSimulationResponse,
  Instruction,
  SimResult,
  Stage,
} from "@/types/pipeline";
import { API_BASE_URL, ApiResponseError, parseErrorResponse } from "./apiConfig";

export interface SimulateRequest {
  code: string;
  forwarding: boolean;
  mode: "pipelined" | "sequential";
  initialRegisters?: Record<string, number>;
  initialMemory?: Record<string, number>;
}

export interface SimulateResponse {
  result: SimResult;
  parsed: Instruction[];
  source: "backend" | "fallback";
  error?: string;
}

export interface PipelineApi {
  simulate(req: SimulateRequest): Promise<SimulateResponse>;
}

const httpPipelineApi: PipelineApi = {
  async simulate(req) {
    const res = await fetch(`${API_BASE_URL}/pipeline/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: req.code,
        forwarding: req.forwarding,
        mode: req.mode === "pipelined" ? "pipeline" : "sequential",
        initialRegisters: req.initialRegisters ?? {},
        initialMemory: req.initialMemory ?? {},
      }),
    });
    if (!res.ok) throw new ApiResponseError(await parseErrorResponse(res), res.status);

    const backend = (await res.json()) as BackendSimulationResponse;
    const parsed = backend.program.map(toInstruction);
    return {
      result: toSimResult(backend, req.mode),
      parsed,
      source: "backend",
    };
  },
};

export const pipelineApi: PipelineApi = {
  async simulate(req) {
    return httpPipelineApi.simulate(req);
  },
};

function toInstruction(instruction: BackendInstruction): Instruction {
  return {
    id: instruction.id,
    raw: instruction.source,
    op: instruction.op,
    type: uiInstructionType(instruction),
    rd: instruction.rd ?? undefined,
    rs: instruction.rs ?? instruction.base ?? undefined,
    rt: instruction.rt ?? undefined,
    imm: instruction.immediate ?? instruction.offset ?? undefined,
    base: instruction.base ?? undefined,
    label: instruction.target ?? undefined,
    writes: instruction.writes[0],
    reads: instruction.uses,
  };
}

function uiInstructionType(instruction: BackendInstruction): Instruction["type"] {
  if (instruction.op === "lw") return "lw";
  if (instruction.op === "sw") return "sw";
  if (instruction.op === "beq" || instruction.op === "bne") return "beq";
  if (instruction.type === "R") return "R";
  if (instruction.type === "J") return "J";
  return "I";
}

function toSimResult(
  backend: BackendSimulationResponse,
  requestedMode: "pipelined" | "sequential"
): SimResult {
  const instructions = backend.program.map(toInstruction);
  const schedule = instructions.map((instruction) => ({
    instrId: instruction.id,
    stages: buildStagesForInstruction(instruction.id, backend.cycles),
  }));
  for (const cycle of backend.cycles) {
    if (cycle.bubbles.length > 0) {
      schedule.push({
        instrId: -1000 - cycle.cycle,
        label: "NOP / STALL",
        isBubble: true,
        stages: { [cycle.cycle]: "BUBBLE" },
      });
    }
  }
  const cycleEvents = backend.cycles.map((cycle) => ({
    cycle: cycle.cycle,
    active: cycle.instructions.map((active) => ({
      instrId: active.instructionId,
      stage: active.stage,
      forwardA: forwardingFor(cycle.forwarding, active.instructionId, "ALU_INPUT_A"),
      forwardB: forwardingFor(cycle.forwarding, active.instructionId, "ALU_INPUT_B"),
    })),
    explanation: cycle.explanation ?? explainBackendCycle(cycle),
    events: cycle.cycleEvents ?? [],
      activeComponents: cycle.activeComponents,
      activeWires: cycle.activeWires,
      controlSignals: cycle.controlSignals,
    }));

  const responseMode =
    backend.mode === "sequential"
      ? "sequential"
      : backend.mode === "pipeline"
        ? "pipelined"
        : requestedMode;

  return {
    instructions,
    schedule,
    totalCycles: backend.metrics.totalCycles,
    stalls: backend.metrics.stalls,
    forwards: backend.metrics.forwardingEvents,
    cpi: backend.metrics.cpi,
    cycleEvents,
    mode: responseMode,
    backend,
    usedFallback: false,
  };
}

function buildStagesForInstruction(
  instructionId: number,
  cycles: BackendCycle[]
): Record<number, Stage | "BUBBLE"> {
  const stages: Record<number, Stage | "BUBBLE"> = {};
  for (const cycle of cycles) {
    const active = cycle.instructions.find((item) => item.instructionId === instructionId);
    if (active) stages[cycle.cycle] = active.stage;
  }
  return stages;
}

function forwardingFor(
  events: BackendForwardingEvent[],
  instructionId: number,
  input: "ALU_INPUT_A" | "ALU_INPUT_B"
): "EX/MEM" | "MEM/WB" | null {
  const event = events.find(
    (item) => item.consumerInstructionId === instructionId && item.to === input
  );
  if (event?.from === "EX/MEM" || event?.from === "MEM/WB") return event.from;
  return null;
}

function explainBackendCycle(cycle: BackendCycle): string {
  if (cycle.instructions.length === 0) return `Ciclo ${cycle.cycle}: pipeline vacio.`;
  const active = cycle.instructions
    .map((item) => `"${item.source}" en ${item.stage}`)
    .join(" • ");
  const hazards = cycle.hazards.length > 0 ? " Hay hazards detectados en este ciclo." : "";
  const forwards =
    cycle.forwarding.length > 0 ? " Se aplica forwarding para resolver dependencias RAW." : "";
  const bubbles = cycle.bubbles.length > 0 ? " Se inserta una bubble/NOP." : "";
  return `Ciclo ${cycle.cycle}: ${active}.${hazards}${forwards}${bubbles}`;
}
