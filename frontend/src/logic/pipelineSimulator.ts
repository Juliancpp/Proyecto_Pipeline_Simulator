import type { Instruction, SimResult, Stage } from "@/types/pipeline";

const STAGES: Stage[] = ["IF", "ID", "EX", "MEM", "WB"];

interface InstrSchedule {
  instrId: number;
  startCycle: number; // cycle of IF
  stallsBefore: number;
}

/** Simulate pipeline execution with forwarding + hazard detection. */
export function simulatePipeline(
  instructions: Instruction[],
  opts: { forwarding: boolean; mode: "pipelined" | "sequential" } = {
    forwarding: true,
    mode: "pipelined",
  }
): SimResult {
  if (opts.mode === "sequential") {
    return simulateSequential(instructions);
  }

  const schedules: InstrSchedule[] = [];
  let stalls = 0;
  let forwards = 0;

  for (let i = 0; i < instructions.length; i++) {
    const ins = instructions[i];
    let start = i === 0 ? 1 : schedules[i - 1].startCycle + 1;
    let stallsBefore = 0;

    // Load-use hazard: previous instr is lw and writes a register that this instr reads in EX
    const prev = instructions[i - 1];
    if (prev && prev.type === "lw" && prev.writes && ins.reads.includes(prev.writes)) {
      // need 1 bubble: this instr's ID can read fwd from MEM/WB only after lw finishes MEM
      start += 1;
      stallsBefore = 1;
      stalls += 1;
    }

    // Without forwarding: any RAW within 2 instrs needs stalls
    if (!opts.forwarding) {
      for (let k = 1; k <= 2; k++) {
        const p = instructions[i - k];
        if (p && p.writes && ins.reads.includes(p.writes)) {
          const need = 3 - k; // distance must be >=3
          const have = start - schedules[i - k].startCycle;
          if (have < 3) {
            const add = 3 - have;
            start += add;
            stallsBefore += add;
            stalls += add;
          }
        }
      }
    }

    // Control hazard: previous beq -> 1 bubble (simple model)
    if (prev && prev.type === "beq") {
      start += 1;
      stallsBefore += 1;
      stalls += 1;
    }

    schedules.push({ instrId: ins.id, startCycle: start, stallsBefore });
  }

  // count forwards (with forwarding on)
  if (opts.forwarding) {
    for (let i = 0; i < instructions.length; i++) {
      const ins = instructions[i];
      for (let k = 1; k <= 2; k++) {
        const p = instructions[i - k];
        if (p && p.writes && ins.reads.includes(p.writes)) {
          if (!(p.type === "lw" && k === 1)) forwards += 1;
        }
      }
    }
  }

  const schedule = schedules.map((s) => {
    const stages: Record<number, Stage | "BUBBLE"> = {};
    // bubbles appear in EX slot of this instr's slot before start? Represent bubble as separate?
    for (let i = 0; i < STAGES.length; i++) {
      stages[s.startCycle + i] = STAGES[i];
    }
    return { instrId: s.instrId, stages };
  });

  const totalCycles = Math.max(...schedules.map((s) => s.startCycle + 4));

  // build cycleEvents
  const cycleEvents: SimResult["cycleEvents"] = [];
  for (let c = 1; c <= totalCycles; c++) {
    const active: SimResult["cycleEvents"][number]["active"] = [];
    for (const s of schedule) {
      const st = s.stages[c];
      if (st) {
        const ev: { instrId: number; stage: Stage | "BUBBLE"; forwardA?: string | null; forwardB?: string | null } = { instrId: s.instrId, stage: st };
        if (st === "EX" && opts.forwarding) {
          const ins = instructions[s.instrId];
          // check producers
          const prev1 = instructions[s.instrId - 1];
          const prev2 = instructions[s.instrId - 2];
          for (const reg of ins.reads) {
            if (prev1?.writes === reg && prev1.type !== "lw") {
              if (ins.reads[0] === reg) ev.forwardA = "EX/MEM";
              if (ins.reads[1] === reg) ev.forwardB = "EX/MEM";
            } else if (prev2?.writes === reg) {
              if (ins.reads[0] === reg) ev.forwardA = "MEM/WB";
              if (ins.reads[1] === reg) ev.forwardB = "MEM/WB";
            } else if (prev1?.writes === reg && prev1.type === "lw") {
              // load-use: stall happened, after stall data forwards from MEM/WB
              if (ins.reads[0] === reg) ev.forwardA = "MEM/WB";
              if (ins.reads[1] === reg) ev.forwardB = "MEM/WB";
            }
          }
        }
        active.push(ev);
      }
    }
    cycleEvents.push({
      cycle: c,
      active,
      explanation: explainCycle(c, active, instructions),
    });
  }

  return {
    instructions,
    schedule,
    totalCycles,
    stalls,
    forwards,
    cpi: instructions.length > 0 ? totalCycles / instructions.length : 0,
    cycleEvents,
    mode: "pipelined",
  };
}

function simulateSequential(instructions: Instruction[]): SimResult {
  const schedule = instructions.map((ins, i) => {
    const start = 1 + i * 5;
    const stages: Record<number, Stage | "BUBBLE"> = {};
    for (let k = 0; k < STAGES.length; k++) stages[start + k] = STAGES[k];
    return { instrId: ins.id, stages };
  });
  const totalCycles = instructions.length * 5;
  const cycleEvents: SimResult["cycleEvents"] = [];
  for (let c = 1; c <= totalCycles; c++) {
    const active = schedule
      .map((s) => ({ instrId: s.instrId, stage: s.stages[c] }))
      .filter((a) => a.stage)
      .map((a) => ({ instrId: a.instrId, stage: a.stage as Stage }));
    cycleEvents.push({
      cycle: c,
      active,
      explanation: explainCycle(c, active, instructions),
    });
  }
  return {
    instructions,
    schedule,
    totalCycles,
    stalls: 0,
    forwards: 0,
    cpi: 5,
    cycleEvents,
    mode: "sequential",
  };
}

function explainCycle(
  cycle: number,
  active: { instrId: number; stage: Stage | "BUBBLE"; forwardA?: string | null; forwardB?: string | null }[],
  instructions: Instruction[]
): string {
  if (active.length === 0) return `Ciclo ${cycle}: pipeline vacío.`;
  const parts = active.map((a) => {
    const ins = instructions[a.instrId];
    const fwd =
      a.forwardA || a.forwardB
        ? ` (forwarding ${[a.forwardA && `A←${a.forwardA}`, a.forwardB && `B←${a.forwardB}`].filter(Boolean).join(", ")})`
        : "";
    return `“${ins.raw}” en ${a.stage}${fwd}`;
  });
  return `Ciclo ${cycle}: ${parts.join(" • ")}`;
}
