export interface ExampleProgram {
  id: string;
  name: string;
  description: string;
  code: string;
}

export const EXAMPLE_PROGRAMS: ExampleProgram[] = [
  {
    id: "no-hazards",
    name: "Programa sin hazards",
    description: "Instrucciones independientes que avanzan sin conflictos.",
    code: `lw $s0, 8($0)
add $s1, $s2, $s3
sub $s4, $s5, $s6
and $s7, $s2, $s3
or  $t0, $s5, $s6`,
  },
  {
    id: "raw-forward",
    name: "Data hazard resuelto por forwarding",
    description: "RAW hazard entre R-instrucciones; se resuelve con forwarding EX/MEM y MEM/WB.",
    code: `add $s0, $s1, $s2
sub $s3, $s0, $s4
and $s5, $s0, $s3
or  $s6, $s5, $s3`,
  },
  {
    id: "load-use",
    name: "Load-use hazard (requiere stall)",
    description: "Después de un lw, el siguiente usa el dato cargado: se inserta una bubble.",
    code: `lw  $s0, 20($s1)
and $s4, $s0, $s5
or  $s8, $s0, $s6
add $s9, $s4, $s2`,
  },
  {
    id: "control",
    name: "Branch / Control hazard",
    description: "Un beq genera un control hazard que se resuelve con bubbles.",
    code: `add $s1, $s2, $s3
beq $s1, $s2, label
sub $s4, $s5, $s6
and $s7, $s8, $s9`,
  },
];
