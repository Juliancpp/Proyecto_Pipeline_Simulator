import type { SimResult } from "@/types/pipeline";

interface Props {
  result: SimResult;
}
export function MetricsPanel({ result }: Props) {
  const sequentialCycles = result.instructions.length * 5;
  const speedup = result.totalCycles > 0 ? sequentialCycles / result.totalCycles : 0;
  const items = [
    { label: "Instrucciones", value: result.instructions.length, color: "text-sky-300", border: "border-sky-500/25" },
    { label: "Ciclos totales", value: result.totalCycles, color: "text-violet-300", border: "border-violet-500/25" },
    { label: "CPI", value: result.cpi.toFixed(2), color: "text-amber-300", border: "border-amber-500/25" },
    { label: "Stalls", value: result.stalls, color: "text-red-300", border: "border-red-500/25" },
    { label: "Forwards", value: result.forwards, color: "text-emerald-300", border: "border-emerald-500/25" },
    { label: "Speedup vs sin pipeline", value: `${speedup.toFixed(2)}x`, color: "text-fuchsia-300", border: "border-fuchsia-500/25" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((it) => (
        <div key={it.label} className={`logic-card rounded-xl border ${it.border} p-3`}>
          <div className="text-xs uppercase tracking-wider text-zinc-400">{it.label}</div>
          <div className={`mt-1 font-mono text-2xl font-bold ${it.color}`}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}
