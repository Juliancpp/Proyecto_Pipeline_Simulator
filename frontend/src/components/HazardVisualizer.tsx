import type { PipelineCycleEvent, SimResult } from "@/types/pipeline";

interface Props {
  result: SimResult;
}

export function HazardVisualizer({ result }: Props) {
  const events = result.cycleEvents.flatMap((cycle) => cycle.events ?? []);
  const hazards = result.backend?.hazards ?? [];
  const forwarding = events.filter((event) => event.type === "forwarding");
  const stalls = events.filter((event) => event.type === "stall" || event.type === "bubble");
  const control = events.filter((event) => event.type === "branch" || event.type === "jump");
  const dataHazards = hazards.filter((hazard) => hazard.type === "RAW" || hazard.type === "load-use");

  if (dataHazards.length === 0 && forwarding.length === 0 && stalls.length === 0 && control.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
        <div className="text-sm font-bold text-emerald-300">Sin hazards</div>
        <p className="mt-2 text-sm text-zinc-300">El programa actual no presenta data hazards ni eventos de flujo de control visibles en esta simulación.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="Hazards RAW" value={dataHazards.length} tone="cyan" />
        <SummaryCard label="Forwarding aplicado" value={forwarding.length} tone="emerald" />
        <SummaryCard label="Stalls load-use" value={stalls.filter((event) => event.type === "stall").length} tone="orange" />
        <SummaryCard label="Flujo de control" value={control.length} tone="sky" />
      </div>

      <section className="rounded-xl border border-white/10 bg-black/40 p-4">
        <h3 className="text-sm font-bold text-zinc-100">Eventos del programa actual</h3>
        <div className="mt-3 space-y-2">
          {dataHazards.map((hazard, index) => (
            <EventRow
              key={`hazard-${index}`}
              badge={hazard.type === "load-use" ? "Dependencia load-use" : "Dependencia RAW"}
              tone={hazard.type === "load-use" ? "orange" : "cyan"}
              text={`${formatInstr(result, hazard.producerInstructionId)} produce ${formatRegisters(hazard.registers)} usado por ${formatInstr(result, hazard.consumerInstructionId)}.`}
            />
          ))}
          {forwarding.map((event, index) => (
            <EventRow
              key={`fwd-${index}`}
              badge="Forwarding aplicado"
              tone="emerald"
              text={`${event.message} No requiere stall porque el dato ya esta en ${String(event.message).includes("EX/MEM") ? "EX/MEM" : "MEM/WB"}.`}
            />
          ))}
          {stalls.map((event, index) => (
            <EventRow
              key={`stall-${index}`}
              badge={event.type === "bubble" ? "Bubble / NOP" : "Stall requerido"}
              tone="orange"
              text={event.message}
            />
          ))}
          {control.map((event, index) => (
            <EventRow
              key={`control-${index}`}
              badge={event.type === "jump" ? "Evento jump" : "Control hazard"}
              tone="sky"
              text={event.message}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-black/40 p-4">
        <h3 className="text-sm font-bold text-zinc-100">Lectura educativa</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-300">
          Este panel muestra solo eventos detectados en el programa actualmente ejecutado. Una dependencia RAW puede resolverse con forwarding si el valor ya está en EX/MEM o MEM/WB. Un load-use inmediato requiere stall porque el dato cargado por <span className="font-mono">lw</span> aparece demasiado tarde para la EX de la siguiente instrucción.
        </p>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "cyan" | "emerald" | "orange" | "sky" }) {
  const cls = {
    cyan: "border-cyan-500/30 bg-cyan-500/5 text-cyan-300",
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
    orange: "border-orange-500/30 bg-orange-500/5 text-orange-300",
    sky: "border-sky-500/30 bg-sky-500/5 text-sky-300",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-1 font-mono text-2xl font-bold">{value}</div>
    </div>
  );
}

function EventRow({ badge, tone, text }: { badge: string; tone: "cyan" | "emerald" | "orange" | "sky"; text: string }) {
  const cls = {
    cyan: "border-cyan-400/40 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
    orange: "border-orange-400/40 bg-orange-500/10 text-orange-200",
    sky: "border-sky-400/40 bg-sky-500/10 text-sky-200",
  }[tone];
  return (
    <div className="rounded-lg border border-white/10 bg-black/50 p-3 text-sm text-zinc-300">
      <span className={`mr-2 rounded border px-2 py-0.5 text-xs font-bold ${cls}`}>{badge}</span>
      {text}
    </div>
  );
}

function formatInstr(result: SimResult, id: unknown): string {
  if (typeof id !== "number") return "instruccion desconocida";
  return `\`${result.instructions[id]?.raw ?? `instr ${id}`}\``;
}

function formatRegisters(registers: unknown): string {
  return Array.isArray(registers) ? registers.join(", ") : "un registro";
}
