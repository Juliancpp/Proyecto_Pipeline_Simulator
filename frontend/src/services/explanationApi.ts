/**
 * Static / rule-based explanation service.
 *
 * Returns the deterministic per-cycle explanation already produced by the
 * simulator. Useful as a fallback when the AI explanation service is
 * unavailable, and as a clear seam for a future backend that ships
 * pre-computed didactic text per cycle.
 */
import type { BackendCycle, SimResult } from "@/types/pipeline";
import { API_BASE_URL, parseErrorResponse } from "./apiConfig";
import type { ExplanationLevel } from "./aiExplanationService";

export interface CycleExplanationRequest {
  result: SimResult;
  cycle: number;
  level?: ExplanationLevel;
}

export interface CycleExplanation {
  cycle: number;
  text: string;
  activeInstructions: {
    instrId: number;
    raw: string;
    stage: string;
    forwardA?: string | null;
    forwardB?: string | null;
  }[];
}

export interface ExplanationApi {
  forCycle(req: CycleExplanationRequest): Promise<CycleExplanation>;
}

const mockExplanationApi: ExplanationApi = {
  async forCycle({ result, cycle }) {
    const ev = result.cycleEvents[cycle - 1];
    if (!ev) {
      return { cycle, text: `Ciclo ${cycle}: sin actividad.`, activeInstructions: [] };
    }
    return {
      cycle,
      text: ev.explanation,
      activeInstructions: ev.active.map((a) => ({
        instrId: a.instrId,
        raw: result.instructions[a.instrId]?.raw ?? "?",
        stage: a.stage,
        forwardA: a.forwardA,
        forwardB: a.forwardB,
      })),
    };
  },
};

const httpExplanationApi: ExplanationApi = {
  async forCycle({ result, cycle, level = "university" }) {
    const backendCycle = result.backend?.cycles.find((item) => item.cycle === cycle);
    const res = await fetch(`${API_BASE_URL}/explain/cycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cycle: backendCycle ?? toBackendLikeCycle(result, cycle),
        program: result.backend?.program ?? [],
        level,
      }),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    const body = (await res.json()) as { cycle: number; explanation: string };
    const fallback = await mockExplanationApi.forCycle({ result, cycle });
    return {
      ...fallback,
      cycle: body.cycle,
      text: body.explanation,
    };
  },
};

export const explanationApi: ExplanationApi = {
  async forCycle(req) {
    try {
      if (!req.result.usedFallback) return await httpExplanationApi.forCycle(req);
    } catch {
      // Deterministic local explanation remains the safe fallback.
    }
    return mockExplanationApi.forCycle(req);
  },
};

function toBackendLikeCycle(result: SimResult, cycle: number): BackendCycle {
  const ev = result.cycleEvents[cycle - 1];
  return {
    cycle,
    instructions:
      ev?.active
        .filter((item) => item.stage !== "BUBBLE")
        .map((item) => ({
          instructionId: item.instrId,
          stage: item.stage,
          source: result.instructions[item.instrId]?.raw ?? "?",
          op: result.instructions[item.instrId]?.op ?? "?",
        })) ?? [],
    stalls: [],
    bubbles: ev?.active.some((item) => item.stage === "BUBBLE") ? [{ stage: "EX" }] : [],
    hazards: [],
    forwarding: [],
    pipelineRegisters: {},
    activeComponents: [],
    activeWires: [],
  };
}
