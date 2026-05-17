import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSimulation } from "@/hooks/useSimulation";
import { programApi, type ExampleProgram } from "@/services/programApi";
import { EXAMPLE_PROGRAMS } from "@/data/examplePrograms";
import { PipelineTimeline } from "@/components/PipelineTimeline";
import { DatapathVisualizer } from "@/components/DatapathVisualizer";
import { HazardVisualizer } from "@/components/HazardVisualizer";
import { InstructionEditor } from "@/components/InstructionEditor";
import { ExplanationPanel } from "@/components/ExplanationPanel";
import { ControlPanel } from "@/components/ControlPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const sim = useSimulation({ initialCode: EXAMPLE_PROGRAMS[1].code });
  const [programs, setPrograms] = useState<ExampleProgram[]>([]);

  useEffect(() => {
    programApi.list().then(setPrograms);
  }, []);

  const result = sim.data?.result;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgb(14_165_233/0.12),transparent_28%),radial-gradient(circle_at_80%_0%,rgb(217_70_239/0.09),transparent_24%),linear-gradient(135deg,#020617,#000,#020617)] text-zinc-100">
      <header className="simulation-header border-b border-white/10">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-3 px-3 py-2">
          <div className="min-w-60">
            <h1 className="bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-lg font-bold text-transparent">
              MIPS Pipeline Simulator
            </h1>
            <p className="text-[11px] text-zinc-500">
              Simulador interactivo de pipelining · IF · ID · EX · MEM · WB
            </p>
          </div>
          <Button size="sm" onClick={sim.runSimulation} disabled={sim.loading}>
            {sim.loading ? "Corriendo..." : "Run Simulation"}
          </Button>
          {sim.hasPendingChanges && (
            <span className="rounded border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
              Cambios sin ejecutar
            </span>
          )}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch id="pipelined" checked={sim.pipelined} onCheckedChange={sim.setPipelined} />
              <Label htmlFor="pipelined" className="text-xs">Pipelined</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="fwd" checked={sim.forwarding} onCheckedChange={sim.setForwarding} />
              <Label htmlFor="fwd" className="text-xs">Forwarding</Label>
            </div>
          </div>
          {result && <MiniMetrics result={result} />}
          {result && (
            <div className="min-w-[420px] flex-1">
              <ControlPanel
                cycle={sim.cycle}
                totalCycles={result.totalCycles}
                onChange={sim.setCycle}
              />
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-3 py-3">
        <div className="dashboard-main">
          <aside className="space-y-3 lg:sticky lg:top-[76px]">
            <InstructionEditor
              code={sim.draftCode}
              onChange={sim.setDraftCode}
              programs={programs}
              onRun={sim.runSimulation}
              loading={sim.loading}
              hasPendingChanges={sim.hasPendingChanges}
              showRun={false}
            />
            <section className="logic-card rounded-xl border p-3">
              <h2 className="text-sm font-bold text-zinc-100">Guía rápida</h2>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Edita el código y presiona <span className="text-cyan-200">Run Simulation</span>. El datapath usa colores por etapa:
                <span className="text-sky-300"> IF</span>, <span className="text-violet-300"> ID</span>,
                <span className="text-emerald-300"> EX</span>, <span className="text-amber-300"> MEM</span>,
                <span className="text-cyan-200"> WB</span>.
              </p>
            </section>
          </aside>

        {sim.error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
            <span>{sim.error}</span>
            <Button size="sm" variant="secondary" onClick={sim.retry}>
              Reintentar
            </Button>
          </div>
        )}

          <section className="min-w-0 space-y-3">
        {result ? (
            <Tabs defaultValue="timeline" className="w-full">
              <TabsList className="logic-card h-9 bg-black/60">
                <TabsTrigger value="timeline">Execution Timeline</TabsTrigger>
                <TabsTrigger value="datapath">Datapath Visualizer</TabsTrigger>
                <TabsTrigger value="hazards">Hazard Visualizer</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="space-y-3">
                <PipelineTimeline result={result} currentCycle={sim.cycle} />
                <ExplanationPanel
                  result={result}
                  cycle={sim.cycle}
                  forwardingEnabled={sim.forwarding}
                />
              </TabsContent>

              <TabsContent value="datapath" className="space-y-3">
                <DatapathVisualizer result={result} cycle={sim.cycle} />
                <ExplanationPanel
                  result={result}
                  cycle={sim.cycle}
                  forwardingEnabled={sim.forwarding}
                />
              </TabsContent>

              <TabsContent value="hazards">
                <HazardVisualizer result={result} />
              </TabsContent>

            </Tabs>
        ) : (
          <div className="logic-card rounded-xl border p-6 text-sm text-zinc-400">
            Presiona <span className="text-cyan-200">Run Simulation</span> para generar timeline, datapath, hazards y explicación.
          </div>
        )}
          </section>
        </div>
      </main>
    </div>
  );
}

function MiniMetrics({ result }: { result: NonNullable<ReturnType<typeof useSimulation>["data"]>["result"] }) {
  const items = [
    ["Instr", result.instructions.length, "text-sky-300"],
    ["Cycles", result.totalCycles, "text-violet-300"],
    ["Stalls", result.stalls, "text-red-300"],
    ["FWD", result.forwards, "text-emerald-300"],
    ["CPI", result.cpi.toFixed(2), "text-amber-300"],
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(([label, value, cls]) => (
        <div key={label} className="rounded border border-white/10 bg-white/[0.04] px-2 py-1">
          <span className="mr-1 text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>
          <span className={`font-mono text-sm font-bold ${cls}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}
