EXAMPLE_PROGRAMS = [
    {
        "id": "no-hazards",
        "name": "Programa sin hazards",
        "description": "Instrucciones independientes que avanzan sin conflictos.",
        "code": "lw $s0, 8($0)\nadd $s1, $s2, $s3\nsub $s4, $s5, $s6\nand $s7, $s2, $s3\nor $t0, $s5, $s6",
    },
    {
        "id": "raw-forward",
        "name": "Data hazard resuelto por forwarding",
        "description": "RAW hazard entre R-instrucciones; se resuelve con forwarding EX/MEM y MEM/WB.",
        "code": "add $s0, $s1, $s2\nsub $s3, $s0, $s4\nand $s5, $s0, $s3\nor $s6, $s5, $s3",
    },
    {
        "id": "load-use",
        "name": "Load-use hazard (requiere stall)",
        "description": "Despues de un lw, el siguiente usa el dato cargado: se inserta una bubble.",
        "code": "lw $s0, 20($s1)\nand $s4, $s0, $s5\nor $s8, $s0, $s6\nadd $s9, $s4, $s2",
    },
    {
        "id": "control",
        "name": "Branch / Control hazard",
        "description": "Un beq genera un control hazard basico.",
        "code": "beq $s0, $s1, target\nadd $t0, $t1, $t2\ntarget:\nsub $t3, $t4, $t5",
    },
]
