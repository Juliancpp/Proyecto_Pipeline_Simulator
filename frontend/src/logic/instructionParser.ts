import type { Instruction } from "@/types/pipeline";

const R_OPS = new Set(["add", "sub", "and", "or", "slt"]);

export function parseProgram(text: string): Instruction[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  return lines.map((raw, i) => parseLine(raw, i));
}

function parseLine(raw: string, id: number): Instruction {
  const cleaned = raw.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const [op, ...rest] = cleaned.split(" ");
  const args = rest.join(" ").split(" ").filter(Boolean);

  if (R_OPS.has(op)) {
    const [rd, rs, rt] = args;
    return {
      id,
      raw,
      op,
      type: "R",
      rd,
      rs,
      rt,
      writes: rd,
      reads: [rs, rt].filter(Boolean) as string[],
    };
  }
  if (op === "lw" || op === "sw") {
    // lw $rt, imm($base)
    const rt = args[0];
    const m = args.slice(1).join("").match(/(-?\d+)\(([^)]+)\)/);
    const imm = m ? parseInt(m[1], 10) : 0;
    const base = m ? m[2] : "$0";
    if (op === "lw") {
      return {
        id, raw, op, type: "lw", rt, imm, base,
        writes: rt, reads: [base],
      };
    }
    return {
      id, raw, op, type: "sw", rt, imm, base,
      reads: [rt, base],
    };
  }
  if (op === "beq" || op === "bne") {
    const [rs, rt, label] = args;
    return {
      id, raw, op, type: "beq", rs, rt, label,
      reads: [rs, rt],
    };
  }
  // fallback
  return { id, raw, op, type: "R", reads: [] };
}
