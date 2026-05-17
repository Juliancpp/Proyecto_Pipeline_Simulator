import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { SimResult } from "@/types/pipeline";
import { aiExplanationService, buildAiRequest, type ExplanationLevel } from "@/services/aiExplanationService";
import { buildCycleTeachingSections } from "@/services/educationalExplanation";

interface Props {
  result: SimResult;
  cycle: number;
  forwardingEnabled: boolean;
}

export function ExplanationPanel({ result, cycle, forwardingEnabled }: Props) {
  const ev = result.cycleEvents[cycle - 1];
  const [level, setLevel] = useState<ExplanationLevel>("university");
  const [aiText, setAiText] = useState<string>("");
  const [aiSource, setAiSource] = useState<string>("deterministic");
  const [loading, setLoading] = useState(false);

  const teaching = useMemo(
    () => buildCycleTeachingSections(result, cycle, level),
    [result, cycle, level]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setAiText("");
    aiExplanationService
      .explainCycle(buildAiRequest(result, cycle, { forwardingEnabled, explanationLevel: level }))
      .then((resp) => {
        if (cancelled) return;
        setAiText(resp.text);
        setAiSource(resp.source);
      })
      .catch(() => {
        if (cancelled) return;
        setAiText("");
        setAiSource("deterministic");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [result, cycle, forwardingEnabled, level]);

  if (!ev) return null;

  const aiSummary = aiText || teaching.summary;
  return (
    <section className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-cyan-400">
            Tutor educativo sincronizado
          </div>
          <h2 className="mt-1 text-base font-bold text-zinc-100">{teaching.title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LevelButton active={level === "intuitive"} onClick={() => setLevel("intuitive")}>
            Intuitivo
          </LevelButton>
          <LevelButton active={level === "university"} onClick={() => setLevel("university")}>
            Universitario
          </LevelButton>
          <LevelButton active={level === "hardware"} onClick={() => setLevel("hardware")}>
            Hardware
          </LevelButton>
          <span className="rounded bg-cyan-500/15 px-2 py-1 text-[10px] font-mono text-cyan-200">
            {loading ? "IA generando..." : aiSource}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <TeachingBlock title="Resumen educativo">
          <p>{aiSummary}</p>
          {loading && (
            <p className="mt-2 text-xs text-zinc-500">
              Mostrando explicación determinista mientras responde el tutor IA.
            </p>
          )}
        </TeachingBlock>
        <TeachingBlock title="Que esta ocurriendo">
          <p>{teaching.what}</p>
        </TeachingBlock>
        <TeachingBlock title="Por que ocurre">
          <p>{teaching.why}</p>
        </TeachingBlock>
        <TeachingBlock title="Componentes que participan">
          <p>{teaching.components}</p>
        </TeachingBlock>
      </div>

      <div className="mt-3 rounded-lg border border-white/10 bg-black/25 p-3">
        <div className="text-xs uppercase tracking-wider text-cyan-300">
          Que aprende el estudiante
        </div>
        <p className="mt-1 text-sm leading-relaxed text-zinc-200">{teaching.takeaway}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <CycleBadges events={ev.events ?? []} />
      </div>

      {level === "hardware" && (
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <DebugList title="Eventos reales" items={teaching.eventSummary} />
          <DebugList title="Control signals" items={teaching.signalSummary} />
          <DebugList title="Active wires" items={teaching.wireSummary} />
        </div>
      )}
    </section>
  );
}

function TeachingBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-3">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{title}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{children}</div>
    </div>
  );
}

function DebugList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{title}</div>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-zinc-300">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-zinc-500">Sin datos activos en este ciclo.</p>
      )}
    </div>
  );
}

function LevelButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2 py-1 text-xs transition-colors ${
        active
          ? "border-cyan-300 bg-cyan-500/25 text-cyan-100"
          : "border-white/10 bg-black/30 text-zinc-400 hover:text-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}

function CycleBadges({ events }: { events: NonNullable<SimResult["cycleEvents"][number]["events"]> }) {
  const badges: { label: string; cls: string }[] = [];
  if (events.some((event) => event.type === "forwarding")) {
    badges.push({ label: "Forwarding real", cls: "border-emerald-400 bg-emerald-500/10 text-emerald-200" });
  }
  if (events.some((event) => event.type === "stall" || event.type === "bubble")) {
    badges.push({ label: "Stall/bubble real", cls: "border-orange-400 bg-orange-500/10 text-orange-200" });
  }
  if (events.some((event) => event.type === "branch")) {
    badges.push({ label: "Control hazard", cls: "border-sky-400 bg-sky-500/10 text-sky-200" });
  }
  if (events.some((event) => event.type === "jump")) {
    badges.push({ label: "Jump", cls: "border-sky-400 bg-sky-500/10 text-sky-200" });
  }
  if (events.some((event) => event.type === "memory_read")) {
    badges.push({ label: "Lectura de memoria", cls: "border-cyan-400 bg-cyan-500/10 text-cyan-200" });
  }
  if (events.some((event) => event.type === "memory_write")) {
    badges.push({ label: "Escritura de memoria", cls: "border-fuchsia-400 bg-fuchsia-500/10 text-fuchsia-200" });
  }
  if (events.some((event) => event.type === "write_back")) {
    badges.push({ label: "Write Back", cls: "border-rose-400 bg-rose-500/10 text-rose-200" });
  }
  if (badges.length === 0) {
    badges.push({ label: "Avance normal", cls: "border-zinc-600 bg-zinc-500/10 text-zinc-300" });
  }
  return badges.map((badge) => (
    <span key={badge.label} className={`rounded border px-2 py-0.5 text-xs font-bold ${badge.cls}`}>
      {badge.label}
    </span>
  ));
}
