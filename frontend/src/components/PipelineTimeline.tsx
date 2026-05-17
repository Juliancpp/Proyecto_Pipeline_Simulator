import type { Stage, SimResult } from "@/types/pipeline";

const STAGE_STYLES: Record<Stage | "BUBBLE", { bg: string; text: string; label: string }> = {
  IF: { bg: "bg-sky-500/85 shadow-[0_0_16px_rgb(14_165_233/0.28)]", text: "text-sky-50", label: "IF" },
  ID: { bg: "bg-violet-500/85 shadow-[0_0_16px_rgb(139_92_246/0.25)]", text: "text-violet-50", label: "ID" },
  EX: { bg: "bg-emerald-500/85 shadow-[0_0_16px_rgb(16_185_129/0.25)]", text: "text-emerald-50", label: "EX" },
  MEM: { bg: "bg-amber-500/85 shadow-[0_0_16px_rgb(245_158_11/0.25)]", text: "text-amber-950", label: "MEM" },
  WB: { bg: "bg-cyan-300/90 shadow-[0_0_16px_rgb(103_232_249/0.25)]", text: "text-cyan-950", label: "WB" },
  BUBBLE: { bg: "bg-red-500/25 border-2 border-dashed border-red-300 shadow-[0_0_22px_rgb(248_113_113/0.5)]", text: "text-red-100", label: "⚠ BUBBLE" },
};

interface Props {
  result: SimResult;
  currentCycle?: number;
}

export function PipelineTimeline({ result, currentCycle }: Props) {
  const cycles = Array.from({ length: result.totalCycles }, (_, i) => i + 1);
  return (
    <div className="pipeline-surface overflow-x-auto rounded-xl border border-white/10 p-4">
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {(Object.keys(STAGE_STYLES) as (Stage | "BUBBLE")[])
          .filter((s) => s !== "BUBBLE")
          .map((s) => (
            <span key={s} className={`rounded px-2 py-0.5 ${STAGE_STYLES[s].bg} ${STAGE_STYLES[s].text}`}>
              {s}
            </span>
          ))}
        <span className="rounded border border-dashed border-red-300 bg-red-500/20 px-2 py-0.5 text-red-100">
          ⚠ Bubble / Stall
        </span>
        <span className="rounded border border-emerald-400/50 bg-emerald-500/15 px-2 py-0.5 text-emerald-200">
          FWD
        </span>
        <span className="rounded border border-fuchsia-400/50 bg-fuchsia-500/15 px-2 py-0.5 text-fuchsia-200">
          Control flow
        </span>
      </div>
      <table className="min-w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-slate-950/95 px-3 py-2 text-left text-zinc-300">Instrucción</th>
            {cycles.map((c) => (
              <th
                key={c}
                className={`px-2 py-1 text-center font-mono text-zinc-400 ${
                  currentCycle === c ? "bg-white/10 text-white" : ""
                }`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.schedule.map((row) => {
            const ins = result.instructions[row.instrId];
            return (
              <tr key={row.instrId}>
                <td className={`sticky left-0 z-10 whitespace-nowrap bg-black/40 px-3 py-1 font-mono ${row.isBubble ? "text-orange-200" : "text-zinc-100"}`}>
                  {row.label ?? ins?.raw ?? "Pipeline bubble"}
                </td>
                {cycles.map((c) => {
                  const stage = row.stages[c];
                  if (!stage) return <td key={c} className={`h-9 min-w-20 rounded bg-white/[0.025] ${currentCycle === c ? "outline outline-1 outline-white/20" : ""}`} />;
                  const s = STAGE_STYLES[stage];
                  const events = result.cycleEvents[c - 1]?.events ?? [];
                  const rowEvents = events.filter((event) => {
                    if (row.isBubble) return event.type === "bubble" || event.type === "stall";
                    return event.instructionId === row.instrId;
                  });
                  const hasForward = rowEvents.some((event) => event.type === "forwarding");
                  const hasStall = rowEvents.some((event) => event.type === "stall" || event.type === "bubble");
                  const hasControl = rowEvents.some((event) => event.type === "branch" || event.type === "jump");
                  const title = [
                    row.label ?? ins?.raw,
                    `Ciclo ${c}`,
                    `Etapa ${stage}`,
                    ...rowEvents.map((event) => event.message),
                  ]
                    .filter(Boolean)
                    .join("\n");
                  return (
                    <td
                      key={c}
                      title={title}
                      className={`timeline-cell relative h-9 min-w-20 rounded px-2 text-center text-[11px] font-black ${s.bg} ${s.text} ${
                        currentCycle === c ? "ring-2 ring-white ring-offset-2 ring-offset-black" : ""
                      } ${hasStall ? "animate-pulse uppercase tracking-wide" : ""}`}
                    >
                      {s.label}
                      {hasForward && (
                        <span className="absolute -right-1 -top-1 rounded bg-emerald-400 px-1 text-[9px] text-black">
                          FWD
                        </span>
                      )}
                      {hasControl && (
                        <span className="absolute -right-1 -bottom-1 rounded bg-sky-400 px-1 text-[9px] text-black">
                          PC
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
