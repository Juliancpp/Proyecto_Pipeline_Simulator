/**
 * AI explanation service (Ollama-ready abstraction).
 *
 * Today: returns mock pedagogical explanations built from cycle context.
 * Tomorrow: swap the implementation for an HTTP call to a backend that
 * proxies a local Ollama model (e.g. `llama3`, `qwen2.5`, `mistral`).
 *
 * The frontend never talks to Ollama directly — it always goes through this
 * service, so swapping providers (Ollama, OpenAI, etc.) is a one-file change.
 *
 * Backend contract (when implemented):
 *   POST /api/ai/explain-cycle
 *   body: AiExplanationRequest
 *   resp: AiExplanationResponse
 */
import type { SimResult, Stage } from "@/types/pipeline";
import { API_BASE_URL } from "./apiConfig";

export type ExplanationLevel = "intuitive" | "university" | "hardware";

export interface AiExplanationRequest {
  cycle: number;
  totalCycles: number;
  forwardingEnabled: boolean;
  mode: "pipelined" | "sequential";
  explanationLevel: ExplanationLevel;
  activeInstructions: {
    instrId: number;
    raw: string;
    stage: Stage | "BUBBLE";
    forwardA?: string | null;
    forwardB?: string | null;
  }[];
  detectedHazard?: "raw" | "load-use" | "control" | null;
  appliedSolution?: "forwarding" | "stall" | "bubble" | null;
  cycleEvents?: NonNullable<SimResult["cycleEvents"][number]["events"]>;
  activeComponents?: string[];
  activeWires?: string[];
  controlSignals?: Record<string, number | string>;
  hazards?: Record<string, unknown>[];
  forwardingEvents?: Record<string, unknown>[];
  executionTrace?: Record<string, unknown>[];
  /** Optional free-form question from the learner. */
  userQuestion?: string;
}

export interface AiExplanationResponse {
  text: string;
  /** Source identifier — useful for UI badges (mock | ollama:llama3 | ...). */
  source: string;
  /** Streaming-ready: future backend may stream tokens. */
  streamed: boolean;
}

export interface AiExplanationService {
  explainCycle(req: AiExplanationRequest): Promise<AiExplanationResponse>;
}

/* ----- mock implementation ----- */

function buildMockText(req: AiExplanationRequest): string {
  if (req.activeInstructions.length === 0) {
    return "En este ciclo el pipeline está vacío. No hay instrucciones ocupando etapas, así que el hardware no tiene trabajo útil que avanzar.";
  }
  const eventTypes = new Set(req.cycleEvents?.map((event) => event.type) ?? []);
  if (eventTypes.has("stall") || eventTypes.has("bubble")) {
    const event = req.cycleEvents?.find((item) => item.type === "stall" || item.type === "bubble");
    const hardware =
      req.explanationLevel === "hardware"
        ? ` En hardware, PCWrite=0, IF_IDWrite=0 y ControlMux=0 congelan el frente del pipeline e inyectan el NOP.`
        : "";
    return [
      `Aquí aparece un load-use hazard: la instrucción consumidora necesita ${event?.register ?? "un registro"} justo después de un lw.`,
      `Forwarding no alcanza porque el dato cargado todavía está saliendo de memoria. El procesador congela PC e IF/ID e inserta una bubble en ID/EX.${hardware}`,
      "La idea importante es que el pipeline pierde un ciclo para no ejecutar con un valor incorrecto.",
    ].join("\n\n");
  }
  if (eventTypes.has("forwarding")) {
    const forwarded = req.cycleEvents?.find((event) => event.type === "forwarding");
    const target = forwarded?.target === "STORE_DATA" ? "el dato que se guardará en memoria" : `la entrada ${forwarded?.target ?? "de la ALU"}`;
    const hardware =
      req.explanationLevel === "hardware"
        ? ` La ruta activa es ${forwarded?.wireIds?.join(", ") || "la ruta de forwarding reportada"} y la señal asociada es ${signalText(forwarded?.signalValues)}.`
        : "";
    return [
      `La instrucción \`${forwarded?.instructionText ?? "actual"}\` necesita ${forwarded?.register ?? "un valor"} antes de que ese resultado llegue al Register File.`,
      `Como el dato ya existe en ${forwarded?.source ?? forwarded?.from ?? "una etapa posterior"}, la Forwarding Unit lo envía directamente hacia ${target}.${hardware}`,
      "Así se resuelve una dependencia RAW sin insertar un stall.",
    ].join("\n\n");
  }
  if (eventTypes.has("branch")) {
    const branch = req.cycleEvents?.find((event) => event.type === "branch");
    return [
      `La instrucción \`${branch?.instructionText ?? "branch"}\` crea un control hazard porque el siguiente PC depende de la comparación.`,
      "Este simulador usa un modelo conservador: espera hasta EX para resolver el branch. No usa predicción ni modela flush especulativo.",
      "El aprendizaje clave es que los cambios del PC afectan qué instrucciones entran realmente al pipeline.",
    ].join("\n\n");
  }
  if (eventTypes.has("jump")) {
    const jump = req.cycleEvents?.find((event) => event.type === "jump");
    return [
      `La instrucción \`${jump?.instructionText ?? "jump"}\` rompe el flujo secuencial y carga el PC con el destino ${jump?.target ?? "del salto"}.`,
      "Por eso una instrucción intermedia puede no completarse: nunca pertenece al camino realmente ejecutado.",
    ].join("\n\n");
  }
  if (eventTypes.has("memory_write")) {
    return "La instrucción store escribe un dato en Data Memory durante MEM. Como sw no produce un valor para un registro, no debe activar WriteBack ni RegWrite.";
  }
  if (eventTypes.has("memory_read")) {
    return "La instrucción load usa en MEM la dirección calculada previamente por la ALU. El dato leído de Data Memory todavía tendrá que volver al Register File en WB.";
  }
  if (eventTypes.has("write_back")) {
    const wb = req.cycleEvents?.find((event) => event.type === "write_back");
    return `En este ciclo se completa la escritura arquitectónica: \`${wb?.instructionText ?? "la instrucción"}\` coloca ${wb?.register ?? "su resultado"} en el Register File.`;
  }
  const lines: string[] = [];
  lines.push(`En el ciclo ${req.cycle}, el procesador está avanzando trabajo en paralelo dentro del pipeline.`);
  for (const a of req.activeInstructions) {
    const stageDesc: Record<string, string> = {
      IF: "el CPU está buscando la instrucción en memoria; todavía no calcula nada, solo trae la siguiente tarea",
      ID: "la instrucción se interpreta y se leen sus operandos desde el banco de registros",
      EX: "la ALU realiza el cálculo o comparación que da sentido a la instrucción",
      MEM: "la instrucción atraviesa la etapa MEM; solo lw/sw activan Data Memory",
      WB: "el resultado vuelve al banco de registros para que futuras instrucciones puedan usarlo",
      BUBBLE: "es un NOP insertado para mantener la corrección del pipeline",
    };
    const fwd =
      a.forwardA || a.forwardB
        ? ` Forwarding activo: ${[a.forwardA && `A←${a.forwardA}`, a.forwardB && `B←${a.forwardB}`]
            .filter(Boolean)
            .join(", ")}.`
        : "";
    lines.push(`• \`${a.raw}\` está en ${a.stage}: ${stageDesc[a.stage] ?? "etapa activa"}.${fwd}`);
  }
  if (req.detectedHazard) {
    const hz: Record<string, string> = {
      raw: "Hay un RAW hazard: una instrucción posterior necesita un registro que aún no se escribió.",
      "load-use": "Load-use hazard: un lw produce el dato en MEM y la siguiente instrucción lo necesita en EX.",
      control: "Control hazard: un branch obliga a esperar el resultado de la condición.",
    };
    lines.push(hz[req.detectedHazard]);
  }
  if (req.appliedSolution) {
    const sol: Record<string, string> = {
      forwarding: "Solución: la Forwarding Unit bypassa el dato directamente a la ALU.",
      stall: "Solución: la Hazard Detection Unit detiene PC e IF/ID.",
      bubble: "Solución: se inserta una burbuja (NOP) en el pipeline.",
    };
    lines.push(sol[req.appliedSolution]);
  }
  return lines.join("\n");
}

function signalText(signals?: Record<string, number | string>): string {
  if (!signals) return "la señal de forwarding reportada por el backend";
  return Object.entries(signals)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}

const mockAiExplanationService: AiExplanationService = {
  async explainCycle(req) {
    // Simulate slight latency so the UI can show loading states.
    await new Promise((r) => setTimeout(r, 80));
    return {
      text: buildMockText(req),
      source: "mock",
      streamed: false,
    };
  },
};

const ollamaAiExplanationService: AiExplanationService = {
  async explainCycle(req) {
    const res = await fetch(`${API_BASE_URL}/explain/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: req }),
    });
    if (!res.ok) throw new Error(`AI explain failed: ${res.status}`);
    const body = (await res.json()) as { explanation?: string; provider?: string };
    return {
      text: body.explanation ?? "AI explanation service is not available yet.",
      source: body.provider ?? "backend-mock",
      streamed: false,
    };
  },
};

export const aiExplanationService: AiExplanationService = {
  async explainCycle(req) {
    try {
      return await ollamaAiExplanationService.explainCycle(req);
    } catch {
      return mockAiExplanationService.explainCycle(req);
    }
  },
};

/** Helper: derive a structured AiExplanationRequest from a SimResult + cycle. */
export function buildAiRequest(
  result: SimResult,
  cycle: number,
  opts: { forwardingEnabled: boolean; explanationLevel?: ExplanationLevel; userQuestion?: string }
): AiExplanationRequest {
  const ev = result.cycleEvents[cycle - 1];
  const active =
    ev?.active.map((a) => ({
      instrId: a.instrId,
      raw: result.instructions[a.instrId]?.raw ?? "?",
      stage: a.stage,
      forwardA: a.forwardA,
      forwardB: a.forwardB,
    })) ?? [];

  let detectedHazard: AiExplanationRequest["detectedHazard"] = null;
  let appliedSolution: AiExplanationRequest["appliedSolution"] = null;
  const cycleEvents = ev?.events ?? [];
  if (cycleEvents.some((event) => event.type === "forwarding")) {
    detectedHazard = "raw";
    appliedSolution = "forwarding";
  }
  if (cycleEvents.some((event) => event.type === "stall" || event.type === "bubble")) {
    detectedHazard = "load-use";
    appliedSolution = "bubble";
  }
  if (cycleEvents.some((event) => event.type === "branch" || event.type === "jump")) {
    detectedHazard = "control";
  }

  return {
    cycle,
    totalCycles: result.totalCycles,
    forwardingEnabled: opts.forwardingEnabled,
    mode: result.mode,
    explanationLevel: opts.explanationLevel ?? "university",
    activeInstructions: active,
    detectedHazard,
    appliedSolution,
    cycleEvents,
    activeComponents: ev?.activeComponents ?? result.backend?.cycles[cycle - 1]?.activeComponents ?? [],
    activeWires: ev?.activeWires ?? result.backend?.cycles[cycle - 1]?.activeWires ?? [],
    controlSignals: ev?.controlSignals ?? result.backend?.cycles[cycle - 1]?.controlSignals ?? {},
    hazards: result.backend?.cycles[cycle - 1]?.hazards ?? [],
    forwardingEvents: result.backend?.cycles[cycle - 1]?.forwarding ?? [],
    executionTrace: result.backend?.executionTrace ?? result.backend?.finalState.executionTrace ?? [],
    userQuestion: opts.userQuestion,
  };
}
