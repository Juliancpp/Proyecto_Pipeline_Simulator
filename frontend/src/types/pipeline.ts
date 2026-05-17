export type Stage = "IF" | "ID" | "EX" | "MEM" | "WB";
export const STAGES: Stage[] = ["IF", "ID", "EX", "MEM", "WB"];

export type InstrType = "R" | "I" | "J" | "lw" | "sw" | "beq";

export interface Instruction {
  id: number;
  raw: string;
  op: string; // add, sub, and, or, lw, sw, beq
  type: InstrType;
  rd?: string; // destination (R-format)
  rs?: string;
  rt?: string;
  imm?: number;
  base?: string; // for lw/sw
  label?: string;
  /** Register written by this instr (rd for R, rt for lw, none for sw/beq) */
  writes?: string;
  /** Registers read */
  reads: string[];
}

export type HazardKind = "none" | "forward-ex-mem" | "forward-mem-wb" | "load-use-stall" | "control";

export interface CycleSlot {
  instrId: number;
  stage: Stage | "BUBBLE";
  cycle: number;
  /** Forwarding info if the EX stage gets data forwarded */
  forwardA?: "EX/MEM" | "MEM/WB" | null;
  forwardB?: "EX/MEM" | "MEM/WB" | null;
  note?: string;
}

export interface SimResult {
  instructions: Instruction[];
  /** Per-instruction array of (cycle -> stage). cycle index relative to absolute cycles. */
  schedule: { instrId: number; stages: Record<number, Stage | "BUBBLE">; label?: string; isBubble?: boolean }[];
  totalCycles: number;
  stalls: number;
  forwards: number;
  cpi: number;
  /** Per cycle, what's happening */
  cycleEvents: {
    cycle: number;
    active: { instrId: number; stage: Stage | "BUBBLE"; forwardA?: string | null; forwardB?: string | null }[];
    explanation: string;
    events?: PipelineCycleEvent[];
    activeComponents?: string[];
    activeWires?: string[];
    controlSignals?: Record<string, number | string>;
  }[];
  mode: "pipelined" | "sequential";
  backend?: BackendSimulationResponse;
  usedFallback?: boolean;
  fallbackReason?: string;
}

export interface BackendInstruction {
  id: number;
  op: string;
  type: "R" | "I" | "J" | string;
  source: string;
  address: number;
  line: number;
  rs?: string | null;
  rt?: string | null;
  rd?: string | null;
  shamt?: number | null;
  immediate?: number | null;
  offset?: number | null;
  base?: string | null;
  target?: string | null;
  targetAddress?: number | null;
  uses: string[];
  writes: string[];
  stages: Stage[];
}

export interface BackendCycleInstruction {
  instructionId: number;
  stage: Stage;
  source: string;
  op: string;
}

export interface BackendCycle {
  cycle: number;
  instructions: BackendCycleInstruction[];
  stalls: Record<string, unknown>[];
  bubbles: Record<string, unknown>[];
  hazards: Record<string, unknown>[];
  forwarding: BackendForwardingEvent[];
  cycleEvents?: PipelineCycleEvent[];
  pipelineRegisters: Record<string, unknown>;
  controlSignals?: Record<string, number | string>;
  datapath?: {
    activeComponents?: string[];
    activeWires?: string[];
  };
  datapathState?: {
    activeComponents?: string[];
    activeWires?: string[];
  };
  activeComponents: string[];
  activeWires: string[];
  explanation?: string;
}

export type PipelineCycleEventType =
  | "pipeline_advance"
  | "instruction_fetch"
  | "register_read"
  | "alu_execute"
  | "control_signal"
  | "forwarding"
  | "stall"
  | "bubble"
  | "branch"
  | "jump"
  | "memory_read"
  | "memory_write"
  | "write_back";

export interface PipelineCycleEvent {
  type: PipelineCycleEventType;
  instructionId?: number | null;
  instructionText?: string | null;
  cycle: number;
  stage?: Stage | "ID/EX" | "MEM/WB" | string;
  message: string;
  source?: string | number | null;
  target?: string | number | null;
  register?: string | null;
  wireId?: string;
  wireIds?: string[];
  componentIds?: string[];
  forwardA?: "10" | "01" | string | null;
  forwardB?: "10" | "01" | string | null;
  signals?: Record<string, number | string>;
  signalValues?: Record<string, number | string>;
  from?: "EX/MEM" | "MEM/WB" | string;
  to?: "ALU_INPUT_A" | "ALU_INPUT_B" | "STORE_DATA" | string;
  producerInstructionId?: number;
  consumerInstructionId?: number;
}

export interface BackendForwardingEvent {
  cycle: number;
  type: string;
  from: "EX/MEM" | "MEM/WB" | string;
  to: "ALU_INPUT_A" | "ALU_INPUT_B" | string;
  register: string;
  producerInstructionId?: number;
  consumerInstructionId?: number;
  reason?: string;
}

export interface BackendMetrics {
  totalCycles: number;
  instructionCount: number;
  stalls: number;
  forwardingEvents: number;
  cpi: number;
}

export interface BackendSimulationResponse {
  program: BackendInstruction[];
  cycles: BackendCycle[];
  hazards: Record<string, unknown>[];
  forwardingEvents: BackendForwardingEvent[];
  executionTrace?: Record<string, unknown>[];
  mode?: "pipeline" | "sequential" | string;
  metrics: BackendMetrics;
  finalState: {
    registers: Record<string, number>;
    memory: Record<string, number>;
    executionTrace?: Record<string, unknown>[];
  };
}
