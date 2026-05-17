EXAMPLE_PROGRAMS = [
    {
        "id": "no-hazards",
        "name": "Programa sin hazards",
        "description": "Instrucciones R independientes; no requieren forwarding ni stalls.",
        "code": "add $s0, $t0, $t1\nsub $s1, $t2, $t3\nor $s2, $t4, $t5",
    },
    {
        "id": "raw-forward",
        "name": "Data hazard resuelto por forwarding",
        "description": "RAW hazard entre R-instrucciones; se resuelve con forwarding EX/MEM y MEM/WB.",
        "code": "add $s0, $s1, $s2\nsub $s3, $s0, $s4\nand $s5, $s0, $s3\nor $s6, $s5, $s3",
    },
    {
        "id": "load-use",
        "name": "Load-use hazard requiere stall",
        "description": "Despues de un lw, el siguiente usa el dato cargado: se inserta una bubble.",
        "code": "lw $s0, 20($s1)\nand $s4, $s0, $s5\nor $s8, $s0, $s6\nadd $s9, $s4, $s2",
    },
    {
        "id": "control",
        "name": "Branch / control hazard",
        "description": "Un beq cambia el PC cuando la comparacion se resuelve en EX.",
        "code": "beq $s0, $s1, target\nadd $t0, $t1, $t2\ntarget:\nsub $s2, $s3, $s4",
    },
    {
        "id": "mixed-advanced",
        "name": "Programa mixto avanzado",
        "description": "Combina forwarding, load-use, store y branch para una prueba final.",
        "code": "add $s0, $t0, $t1\nsub $s1, $s0, $t2\nlw $s2, 0($sp)\nadd $s3, $s2, $s1\nsw $s3, 4($sp)\nbeq $s3, $zero, end\nor $s4, $s1, $s0\nend:\nand $s5, $s4, $s1",
    },
]
