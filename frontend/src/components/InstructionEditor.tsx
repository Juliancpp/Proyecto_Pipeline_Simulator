import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ExampleProgram } from "@/services/programApi";

interface Props {
  code: string;
  onChange: (s: string) => void;
  programs: ExampleProgram[];
  onRun: () => void;
  loading?: boolean;
  hasPendingChanges?: boolean;
  showRun?: boolean;
}

export function InstructionEditor({
  code,
  onChange,
  programs,
  onRun,
  loading = false,
  hasPendingChanges = false,
  showRun = true,
}: Props) {
  return (
    <div className="logic-card rounded-xl border p-3">
      <div className="mb-3 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {programs.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant="secondary"
              onClick={() => onChange(p.code)}
              title={p.description}
            >
              {p.name}
            </Button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          {hasPendingChanges && (
            <span className="text-xs text-amber-300">Hay cambios sin ejecutar</span>
          )}
          {showRun && (
            <Button size="sm" onClick={onRun} disabled={loading}>
              {loading ? "Ejecutando..." : "Ejecutar simulación"}
            </Button>
          )}
        </div>
      </div>
      <Textarea
        value={code}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-72 bg-black/60 font-mono text-sm text-cyan-100 lg:min-h-[420px]"
        spellCheck={false}
      />
      <p className="mt-2 text-xs text-zinc-500">
        Soporta: add, sub, and, or, slt, lw, sw, beq. Sintaxis MIPS estándar.
      </p>
    </div>
  );
}
