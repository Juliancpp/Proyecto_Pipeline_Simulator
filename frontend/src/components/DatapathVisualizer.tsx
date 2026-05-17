import type { PipelineCycleEvent, SimResult, Stage } from "@/types/pipeline";

interface Props {
  result: SimResult;
  cycle: number;
}

type CompId =
  | "PC"
  | "InstructionMemory"
  | "IF_ID"
  | "HazardDetectionUnit"
  | "ControlUnit"
  | "ControlMux"
  | "RegisterFile"
  | "SignExtend"
  | "ID_EX"
  | "ForwardingUnit"
  | "MuxA"
  | "MuxB"
  | "ALU"
  | "BranchLogic"
  | "JumpTarget"
  | "PCSrc"
  | "EX_MEM"
  | "DataMemory"
  | "MEM_WB"
  | "MemToRegMux"
  | "WriteBack";

const STAGE_COLOR: Record<Stage | "BUBBLE", string> = {
  IF: "#0ea5e9",
  ID: "#8b5cf6",
  EX: "#22c55e",
  MEM: "#f59e0b",
  WB: "#67e8f9",
  BUBBLE: "#ef4444",
};

const L: Record<CompId, { x: number; y: number; w: number; h: number; label: string; sub?: string }> = {
  PC: { x: 60, y: 300, w: 80, h: 54, label: "PC" },
  InstructionMemory: { x: 190, y: 270, w: 160, h: 112, label: "Instruction", sub: "Memory" },
  IF_ID: { x: 410, y: 160, w: 22, h: 380, label: "IF/ID" },
  HazardDetectionUnit: { x: 455, y: 50, w: 230, h: 52, label: "Hazard Detection Unit" },
  ControlUnit: { x: 470, y: 145, w: 180, h: 52, label: "Control Unit" },
  ControlMux: { x: 690, y: 145, w: 92, h: 52, label: "Control", sub: "Mux" },
  RegisterFile: { x: 480, y: 260, w: 220, h: 160, label: "Register File" },
  SignExtend: { x: 510, y: 465, w: 150, h: 52, label: "Sign Extend" },
  ID_EX: { x: 820, y: 160, w: 22, h: 380, label: "ID/EX" },
  ForwardingUnit: { x: 860, y: 620, w: 310, h: 52, label: "Forwarding Unit" },
  MuxA: { x: 895, y: 265, w: 64, h: 64, label: "Mux A" },
  MuxB: { x: 895, y: 375, w: 64, h: 64, label: "Mux B" },
  ALU: { x: 1015, y: 305, w: 150, h: 96, label: "ALU" },
  BranchLogic: { x: 1015, y: 160, w: 150, h: 56, label: "Branch Logic" },
  JumpTarget: { x: 1015, y: 70, w: 150, h: 56, label: "Jump Target" },
  PCSrc: { x: 1210, y: 118, w: 88, h: 56, label: "PCSrc" },
  EX_MEM: { x: 1245, y: 230, w: 22, h: 310, label: "EX/MEM" },
  DataMemory: { x: 1325, y: 300, w: 190, h: 124, label: "Data", sub: "Memory" },
  MEM_WB: { x: 1580, y: 230, w: 22, h: 310, label: "MEM/WB" },
  MemToRegMux: { x: 1660, y: 340, w: 82, h: 64, label: "MemToReg" },
  WriteBack: { x: 1790, y: 335, w: 120, h: 74, label: "Write Back" },
};

export function DatapathVisualizer({ result, cycle }: Props) {
  const ev = result.cycleEvents[cycle - 1];
  const activeComponents = new Set<string>(ev?.activeComponents ?? result.backend?.cycles[cycle - 1]?.activeComponents ?? []);
  const activeWires = new Set<string>(ev?.activeWires ?? result.backend?.cycles[cycle - 1]?.activeWires ?? []);
  const events = ev?.events ?? [];

  const on = (id: CompId) => activeComponents.has(id);
  const wireOn = (id: string) => activeWires.has(id);

  return (
    <div className="pipeline-surface rounded-xl border border-white/10 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2">
        <div>
          <div className="text-sm font-bold text-zinc-100">Datapath por ciclo</div>
          <div className="text-xs text-zinc-500">Datos al centro · control arriba · forwarding abajo · write-back por debajo</div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <CycleBadges result={result} cycle={cycle} />
        </div>
      </div>
      <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="scan-grid overflow-hidden rounded-lg border border-white/10 bg-slate-950/60">
      <svg viewBox="0 0 1980 730" preserveAspectRatio="xMidYMid meet" className="block h-auto w-full">
        <defs>
          <linearGradient id="stage-if" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="stage-id" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="stage-ex" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="stage-mem" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="stage-wb" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.02" />
          </linearGradient>
          <marker id="dp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#e4e4e7" />
          </marker>
          <marker id="dp-arrow-dim" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#3f3f46" />
          </marker>
        </defs>

        <StageBand x={20} w={390} label="IF" sub="Instruction Fetch" fill="url(#stage-if)" color={STAGE_COLOR.IF} />
        <StageBand x={432} w={388} label="ID" sub="Instruction Decode" fill="url(#stage-id)" color={STAGE_COLOR.ID} />
        <StageBand x={842} w={403} label="EX" sub="Execute" fill="url(#stage-ex)" color={STAGE_COLOR.EX} />
        <StageBand x={1267} w={313} label="MEM" sub="Memory Access" fill="url(#stage-mem)" color={STAGE_COLOR.MEM} />
        <StageBand x={1602} w={350} label="WB" sub="Write Back" fill="url(#stage-wb)" color={STAGE_COLOR.WB} />

        <ControlWires activeWires={activeWires} />
        <DataWires wireOn={wireOn} />
        <ForwardingWires events={events} activeWires={activeWires} />

        {(Object.keys(L) as CompId[]).map((id) => (
          <Block key={id} id={id} active={on(id)} />
        ))}

        <EventLabels events={events} />
        <BubbleOverlay events={events} />
      </svg>
        </div>
        <CycleInspector result={result} cycle={cycle} events={events} activeComponents={[...activeComponents]} />
      </div>
    </div>
  );
}

function StageBand({ x, w, label, sub, fill, color }: { x: number; w: number; label: string; sub: string; fill: string; color: string }) {
  return (
    <g>
      <rect x={x} y={10} width={w} height={700} fill={fill} stroke={color} strokeOpacity={0.32} strokeWidth={1.2} />
      <text x={x + w / 2} y={34} textAnchor="middle" fontSize={17} fontWeight={900} fill={color}>
        {label}
      </text>
      <text x={x + w / 2} y={54} textAnchor="middle" fontSize={11} fill="#94a3b8">
        {sub}
      </text>
    </g>
  );
}

function Block({ id, active }: { id: CompId; active: boolean }) {
  const b = L[id];
  const color = active ? "#22d3ee" : "#3f3f46";
  const special =
    id === "HazardDetectionUnit" || id === "ControlMux"
      ? "#ef4444"
      : id === "ForwardingUnit" || id === "MuxA" || id === "MuxB"
        ? "#22c55e"
        : id === "DataMemory"
          ? "#f59e0b"
          : id === "WriteBack" || id === "MemToRegMux"
            ? "#67e8f9"
            : id === "BranchLogic" || id === "JumpTarget" || id === "PCSrc"
              ? "#e879f9"
              : color;
  const stroke = active ? special : "#3f3f46";
  return (
    <g>
      <rect
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        rx={id.includes("_") ? 3 : 8}
        fill={active ? `${stroke}24` : "#09090b"}
        stroke={stroke}
        strokeWidth={active ? 2.5 : 1.2}
        style={active ? { filter: `drop-shadow(0 0 10px ${stroke})`, animation: id === "HazardDetectionUnit" ? "hazard-pulse 1.2s ease-in-out infinite" : undefined } : undefined}
      />
      <text x={b.x + b.w / 2} y={b.y + b.h / 2 - (b.sub ? 4 : -4)} textAnchor="middle" fontSize={12} fontWeight={700} fill={active ? "#fff" : "#d4d4d8"}>
        {b.label}
      </text>
      {b.sub && (
        <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 14} textAnchor="middle" fontSize={11} fill={active ? stroke : "#a1a1aa"}>
          {b.sub}
        </text>
      )}
    </g>
  );
}

function Wire({ points, active, color = "#38bdf8", dashed = false }: { points: [number, number][]; active?: boolean; color?: string; dashed?: boolean }) {
  const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  return (
    <path
      d={d}
      fill="none"
      stroke={active ? color : "#3f3f46"}
      strokeWidth={active ? 2.6 : 1.2}
      strokeDasharray={dashed ? "6 5" : undefined}
      markerEnd={`url(#${active ? "dp-arrow" : "dp-arrow-dim"})`}
      style={active ? { filter: `drop-shadow(0 0 6px ${color})`, animation: dashed ? "wire-flow 0.9s linear infinite" : "data-glow 1.4s ease-in-out infinite" } : undefined}
    />
  );
}

function DataWires({ wireOn }: { wireOn: (id: string) => boolean }) {
  return (
    <g>
      <Wire points={[[140, 327], [190, 327]]} active={wireOn("pc_to_instruction_memory")} />
      <Wire points={[[350, 327], [410, 327]]} active={wireOn("instruction_memory_to_if_id")} />
      <Wire points={[[432, 335], [480, 335]]} active={wireOn("if_id_to_register_file")} />
      <Wire points={[[700, 340], [820, 340]]} active={wireOn("register_file_to_id_ex")} />
      <Wire points={[[842, 318], [895, 298]]} active={wireOn("id_ex_to_alu_a")} />
      <Wire points={[[842, 405], [895, 407]]} active={wireOn("id_ex_to_alu_b")} />
      <Wire points={[[959, 298], [1015, 334]]} active={wireOn("id_ex_to_alu_a")} />
      <Wire points={[[959, 407], [1015, 375]]} active={wireOn("id_ex_to_alu_b")} />
      <Wire points={[[1165, 353], [1245, 353]]} active={wireOn("alu_to_ex_mem")} />
      <Wire points={[[1267, 363], [1325, 363]]} active={wireOn("ex_mem_to_data_memory")} />
      <Wire points={[[1515, 363], [1580, 363]]} active={wireOn("data_memory_to_mem_wb")} />
      <Wire points={[[1602, 372], [1660, 372]]} active={wireOn("mem_wb_to_register_file")} />
      <Wire points={[[1742, 372], [1790, 372]]} active={wireOn("mem_wb_to_register_file")} />
      <Wire points={[[1850, 409], [1850, 700], [590, 700], [590, 420]]} active={wireOn("mem_wb_to_register_file")} color="#67e8f9" />
      <Wire points={[[1588, 540], [1515, 540], [1515, 424]]} active={wireOn("mem_wb_forward_to_store_data")} color="#a78bfa" dashed />
      <Wire points={[[1256, 540], [1325, 540], [1325, 424]]} active={wireOn("ex_mem_forward_to_store_data")} color="#22c55e" dashed />
    </g>
  );
}

function ControlWires({ activeWires }: { activeWires: Set<string> }) {
  const hazard =
    activeWires.has("hazard_to_pc") ||
    activeWires.has("hazard_to_if_id") ||
    activeWires.has("hazard_to_control_mux");
  const branch = activeWires.has("branch_to_pcsrc");
  const jump = activeWires.has("jump_to_pc");
  return (
    <g>
      <Wire points={[[455, 76], [100, 76], [100, 300]]} active={hazard} color="#ef4444" dashed />
      <Wire points={[[570, 102], [421, 102], [421, 160]]} active={hazard} color="#ef4444" dashed />
      <Wire points={[[685, 76], [736, 76], [736, 145]]} active={hazard} color="#ef4444" dashed />
      {hazard && (
        <g fill="#fecaca" fontSize={13} fontWeight={900}>
          <text x={118} y={70}>PCWrite = 0</text>
          <text x={438} y={122}>IF_IDWrite = 0</text>
          <text x={720} y={132}>ControlMux = 0</text>
        </g>
      )}
      <Wire points={[[1165, 188], [1210, 146]]} active={branch} color="#e879f9" dashed />
      <Wire points={[[1165, 98], [1210, 146]]} active={jump} color="#e879f9" dashed />
      <Wire points={[[1210, 146], [100, 146], [100, 300]]} active={branch || jump} color="#e879f9" dashed />
    </g>
  );
}

function ForwardingWires({ events, activeWires }: { events: PipelineCycleEvent[]; activeWires: Set<string> }) {
  const fwd = events.filter((event) => event.type === "forwarding");
  const exMem =
    activeWires.has("ex_mem_forward_to_alu_a") ||
    activeWires.has("ex_mem_forward_to_alu_b") ||
    activeWires.has("ex_mem_forward_to_store_data");
  const memWb =
    activeWires.has("mem_wb_forward_to_alu_a") ||
    activeWires.has("mem_wb_forward_to_alu_b") ||
    activeWires.has("mem_wb_forward_to_store_data");
  return (
    <g>
      <Wire points={[[1256, 540], [1256, 646], [1170, 646]]} active={exMem} color="#22c55e" dashed />
      <Wire points={[[1588, 540], [1588, 670], [1170, 670]]} active={memWb} color="#a78bfa" dashed />
      <Wire points={[[860, 646], [927, 646], [927, 439]]} active={activeWires.has("ex_mem_forward_to_alu_b") || activeWires.has("mem_wb_forward_to_alu_b")} color="#22c55e" dashed />
      <Wire points={[[900, 620], [927, 620], [927, 329]]} active={activeWires.has("ex_mem_forward_to_alu_a") || activeWires.has("mem_wb_forward_to_alu_a")} color="#22c55e" dashed />
      {fwd.map((event, index) => (
        <text key={index} x={920} y={590 + index * 18} fontSize={13} fontWeight={900} fill="#bbf7d0">
          Forward {event.register} from {String(event.message).includes("EX/MEM") ? "EX/MEM" : "MEM/WB"}
        </text>
      ))}
      {fwd.some((event) => event.signalValues?.ForwardA) && <text x={820} y={596} fontSize={13} fontWeight={900} fill="#bbf7d0">ForwardA = {String(fwd.find((e) => e.signalValues?.ForwardA)?.signalValues?.ForwardA)}</text>}
      {fwd.some((event) => event.signalValues?.ForwardB) && <text x={820} y={714} fontSize={13} fontWeight={900} fill="#bbf7d0">ForwardB = {String(fwd.find((e) => e.signalValues?.ForwardB)?.signalValues?.ForwardB)}</text>}
    </g>
  );
}

function EventLabels({ events }: { events: PipelineCycleEvent[] }) {
  const jump = events.find((event) => event.type === "jump");
  const branch = events.find((event) => event.type === "branch");
  return (
    <g>
      {jump && (
        <text x={1210} y={92} fontSize={14} fontWeight={900} fill="#f5d0fe">
          Jump to {jump.target ?? "target"}
        </text>
      )}
      {branch && (
        <text x={1210} y={208} fontSize={14} fontWeight={900} fill="#f5d0fe">
          Control flow event
        </text>
      )}
    </g>
  );
}

function BubbleOverlay({ events }: { events: PipelineCycleEvent[] }) {
  const bubble = events.some((event) => event.type === "bubble" || event.type === "stall");
  if (!bubble) return null;
  return (
    <g style={{ animation: "hazard-pulse 1.2s ease-in-out infinite" }}>
      <rect x={760} y={540} width={138} height={104} rx={10} fill="#7f1d1d" fillOpacity={0.72} stroke="#f87171" strokeWidth={3} strokeDasharray="8 6" />
      <text x={829} y={575} textAnchor="middle" fontSize={18} fontWeight={900} fill="#fecaca">STALL</text>
      <text x={829} y={600} textAnchor="middle" fontSize={15} fontWeight={900} fill="#fff">BUBBLE</text>
      <text x={829} y={623} textAnchor="middle" fontSize={12} fontWeight={800} fill="#fed7d7">NOP INSERTED</text>
    </g>
  );
}

function CycleInspector({ result, cycle, events, activeComponents }: { result: SimResult; cycle: number; events: PipelineCycleEvent[]; activeComponents: string[] }) {
  const controlSignals = result.cycleEvents[cycle - 1]?.controlSignals ?? result.backend?.cycles[cycle - 1]?.controlSignals ?? {};
  const controls = Object.entries(controlSignals);
  const forwarding = events.filter((event) => event.type === "forwarding");
  return (
    <aside className="grid gap-3 md:grid-cols-3 2xl:block 2xl:space-y-3">
      <div className="logic-card rounded-lg border p-3">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Ciclo actual</div>
        <div className="mt-1 font-mono text-3xl font-black text-sky-300">{cycle} / {result.totalCycles}</div>
      </div>
      <div className="logic-card rounded-lg border p-3">
        <div className="mb-3 text-sm font-bold text-zinc-100">Eventos activos</div>
        <div className="space-y-2">
          {events.length === 0 && <div className="text-sm text-zinc-400">Avance normal del pipeline.</div>}
          {events.map((event, index) => (
            <div key={index} className={`rounded border p-2 text-xs ${eventClass(event.type)}`}>
              <div className="font-black uppercase">{event.type.replace("_", " ")}</div>
              <div className="mt-1 leading-relaxed">{event.message}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="logic-card rounded-lg border p-3">
        <div className="mb-3 text-sm font-bold text-zinc-100">Señales</div>
        <div className="space-y-2 text-xs">
          {controls.length === 0 && <Signal name="PCWrite" value="1" tone="normal" />}
          {controls.map(([key, value]) => (
            <Signal key={key} name={key} value={String(value)} tone={signalTone(key, value)} />
          ))}
          {forwarding.find((event) => event.signalValues?.ForwardA) && <Signal name="ForwardA" value={String(forwarding.find((event) => event.signalValues?.ForwardA)?.signalValues?.ForwardA)} tone="forward" />}
          {forwarding.find((event) => event.signalValues?.ForwardB) && <Signal name="ForwardB" value={String(forwarding.find((event) => event.signalValues?.ForwardB)?.signalValues?.ForwardB)} tone="forward" />}
        </div>
      </div>
      <div className="logic-card rounded-lg border p-3">
        <div className="mb-3 text-sm font-bold text-zinc-100">Componentes activos</div>
        <div className="flex flex-wrap gap-1">
          {activeComponents.slice(0, 28).map((component) => (
            <span key={component} className="rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-zinc-300">
              {component}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}

function signalTone(name: string, value: number | string): "normal" | "hazard" | "forward" {
  if (name === "ForwardA" || name === "ForwardB") return value === "00" ? "normal" : "forward";
  if ((name === "PCWrite" || name === "IF_IDWrite" || name === "ControlMux") && String(value) === "0") return "hazard";
  return "normal";
}

function Signal({ name, value, tone }: { name: string; value: string; tone: "normal" | "hazard" | "forward" }) {
  const cls = tone === "hazard" ? "border-red-400/40 bg-red-500/10 text-red-200" : tone === "forward" ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200" : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-zinc-400">{name}</span>
      <span className={`rounded border px-2 py-0.5 font-mono font-bold ${cls}`}>{value}</span>
    </div>
  );
}

function eventClass(type: PipelineCycleEvent["type"]) {
  if (type === "forwarding") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-100";
  if (type === "stall" || type === "bubble") return "border-red-400/50 bg-red-500/12 text-red-100";
  if (type === "branch" || type === "jump") return "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-100";
  if (type === "memory_read" || type === "memory_write") return "border-amber-400/40 bg-amber-500/10 text-amber-100";
  return "border-cyan-400/40 bg-cyan-500/10 text-cyan-100";
}

function CycleBadges({ result, cycle }: { result: SimResult; cycle: number }) {
  const events = result.cycleEvents[cycle - 1]?.events ?? [];
  const allEvents = result.cycleEvents.flatMap((item) => item.events ?? []);
  const badges: { label: string; cls: string }[] = [];
  if (allEvents.length === 0 && result.stalls === 0 && result.forwards === 0) badges.push({ label: "No hazards", cls: "border-zinc-500 bg-zinc-500/10 text-zinc-200" });
  if (events.some((event) => event.type === "forwarding")) badges.push({ label: "Forwarding applied", cls: "border-emerald-400 bg-emerald-500/10 text-emerald-200" });
  if (events.some((event) => event.type === "stall" || event.type === "bubble")) badges.push({ label: "Load-use stall", cls: "border-orange-400 bg-orange-500/10 text-orange-200" });
  if (events.some((event) => event.type === "branch")) badges.push({ label: "Control hazard", cls: "border-fuchsia-400 bg-fuchsia-500/10 text-fuchsia-200" });
  if (events.some((event) => event.type === "jump")) badges.push({ label: "Jump event", cls: "border-fuchsia-400 bg-fuchsia-500/10 text-fuchsia-200" });
  if (events.some((event) => event.type === "memory_read")) badges.push({ label: "Memory read", cls: "border-amber-400 bg-amber-500/10 text-amber-200" });
  if (events.some((event) => event.type === "memory_write")) badges.push({ label: "Memory write", cls: "border-fuchsia-400 bg-fuchsia-500/10 text-fuchsia-200" });
  if (events.some((event) => event.type === "write_back")) badges.push({ label: "Write back", cls: "border-rose-400 bg-rose-500/10 text-rose-200" });
  if (badges.length === 0) badges.push({ label: "Normal pipeline advance", cls: "border-zinc-600 bg-zinc-500/10 text-zinc-300" });
  return badges.map((badge) => (
    <span key={badge.label} className={`rounded border px-2 py-1 ${badge.cls}`}>
      {badge.label}
    </span>
  ));
}
