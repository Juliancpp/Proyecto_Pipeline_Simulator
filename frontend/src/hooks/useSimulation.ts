/**
 * useSimulation — central state hook for the pipeline UI.
 *
 * Owns: draft/submitted code, switches, current cycle, and the
 * simulation result. All data flows through the services layer
 * (`pipelineApi`), so this hook is the single seam between UI and backend.
 */
import { useCallback, useState } from "react";
import { pipelineApi, type SimulateResponse } from "@/services/pipelineApi";

interface Options {
  initialCode: string;
  initialForwarding?: boolean;
  initialPipelined?: boolean;
}

export function useSimulation({
  initialCode,
  initialForwarding = true,
  initialPipelined = true,
}: Options) {
  const [draftCode, setDraftCode] = useState(initialCode);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [submittedForwarding, setSubmittedForwarding] = useState(initialForwarding);
  const [submittedPipelined, setSubmittedPipelined] = useState(initialPipelined);
  const [forwarding, setForwarding] = useState(initialForwarding);
  const [pipelined, setPipelined] = useState(initialPipelined);
  const [cycle, setCycle] = useState(1);
  const [data, setData] = useState<SimulateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await pipelineApi.simulate({
        code: draftCode,
        forwarding,
        mode: pipelined ? "pipelined" : "sequential",
      });
      setData(resp);
      setSubmittedCode(draftCode);
      setSubmittedForwarding(forwarding);
      setSubmittedPipelined(pipelined);
      setCycle(1);
      setError(resp.error ?? null);
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setLoading(false);
    }
  }, [draftCode, forwarding, pipelined]);

  const hasPendingChanges =
    submittedCode === null ||
    draftCode !== submittedCode ||
    forwarding !== submittedForwarding ||
    pipelined !== submittedPipelined;

  return {
    code: draftCode,
    setCode: setDraftCode,
    draftCode,
    setDraftCode,
    submittedCode,
    forwarding,
    setForwarding,
    pipelined,
    setPipelined,
    cycle,
    setCycle,
    data,
    loading,
    error,
    hasPendingChanges,
    runSimulation,
    refresh: runSimulation,
    retry: runSimulation,
  };
}

function toUserMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Error desconocido";
  if (message.toLowerCase().includes("failed to fetch")) {
    return "Backend apagado o no disponible. Revisa que FastAPI este ejecutandose.";
  }
  if (message.toLowerCase().includes("instruccion desconocida")) return message;
  if (message.toLowerCase().includes("registro invalido")) return message;
  if (message.toLowerCase().includes("label no encontrado")) return message;
  if (message.toLowerCase().includes("sintaxis invalida")) return message;
  if (message.toLowerCase().includes("inmediato")) return message;
  return message || "Error interno al simular el programa.";
}
