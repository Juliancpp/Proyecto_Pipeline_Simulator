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
    description: "Instrucciones R independientes; no requieren forwarding ni stalls.",
    code: `add $s0, $t0, $t1
sub $s1, $t2, $t3
or  $s2, $t4, $t5`,
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
    name: "Load-use hazard requiere stall",
    description: "Después de un lw, el siguiente usa el dato cargado: se inserta una bubble.",
    code: `lw  $s0, 20($s1)
and $s4, $s0, $s5
or  $s8, $s0, $s6
add $s9, $s4, $s2`,
  },
  {
    id: "control",
    name: "Branch / control hazard",
    description: "Un beq cambia el PC cuando la comparación se resuelve en EX.",
    code: `beq $s0, $s1, target
add $t0, $t1, $t2
target:
sub $s2, $s3, $s4`,
  },
  {
    id: "mixed-advanced",
    name: "Programa mixto avanzado",
    description: "Combina forwarding, load-use, store y branch para una prueba final.",
    code: `add $s0, $t0, $t1
sub $s1, $s0, $t2
lw  $s2, 0($sp)
add $s3, $s2, $s1
sw  $s3, 4($sp)
beq $s3, $zero, end
or  $s4, $s1, $s0
end:
and $s5, $s4, $s1`,
  },
];
