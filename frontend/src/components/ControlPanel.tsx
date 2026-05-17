import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from "lucide-react";

interface Props {
  cycle: number;
  totalCycles: number;
  onChange: (c: number) => void;
}

export function ControlPanel({ cycle, totalCycles, onChange }: Props) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    ref.current = window.setInterval(() => {
      onChange(Math.min(totalCycles, cycleRef.current + 1));
    }, speed);
    return () => {
      if (ref.current) window.clearInterval(ref.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, totalCycles]);

  const cycleRef = useRef(cycle);
  cycleRef.current = cycle;

  useEffect(() => {
    if (cycle >= totalCycles) setPlaying(false);
  }, [cycle, totalCycles]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="secondary" onClick={() => onChange(1)}>
        <RotateCcw className="size-4" />
      </Button>
      <Button size="sm" variant="secondary" onClick={() => onChange(Math.max(1, cycle - 1))}>
        <SkipBack className="size-4" />
      </Button>
      <Button size="sm" onClick={() => setPlaying((p) => !p)}>
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </Button>
      <Button size="sm" variant="secondary" onClick={() => onChange(Math.min(totalCycles, cycle + 1))}>
        <SkipForward className="size-4" />
      </Button>
      <div className="ml-1 font-mono text-sm text-zinc-300">
        Ciclo <span className="text-cyan-400">{cycle}</span> / {totalCycles}
      </div>
      <div className="flex min-w-40 items-center gap-2">
        <span className="text-xs text-zinc-400">Velocidad</span>
        <Slider
          value={[1100 - speed]}
          min={100}
          max={1000}
          step={50}
          onValueChange={(v) => setSpeed(1100 - v[0])}
          className="w-32"
        />
      </div>
      <div className="min-w-52 flex-1">
        <Slider
          value={[cycle]}
          min={1}
          max={Math.max(1, totalCycles)}
          step={1}
          onValueChange={(v) => onChange(v[0])}
        />
      </div>
    </div>
  );
}
