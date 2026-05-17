# QA manual del datapath

No hay framework de tests frontend configurado en `package.json`. Validar estos casos con el backend activo y `Run Simulation`.

1. R-format sin memoria
   - Programa: `add $s0, $t0, $t1`
   - Esperado: `DataMemory` nunca se ilumina. `WriteBack` solo se ilumina en WB.

2. Store sin WB
   - Programa: `add $s0, $t0, $t1` seguido de `sw $s0, 4($sp)`
   - Esperado: `sw` llega hasta MEM, emite `memory_write` y nunca aparece en WB.

3. Load-use
   - Programa: `lw $s0, 0($t0)` seguido de `add $s1, $s0, $t1`
   - Esperado: exactamente un evento `stall` y un evento `bubble` en el mismo ciclo; `PCWrite=0`, `IF_IDWrite=0`, `ControlMux=0`.

4. RAW forwarding
   - Programa: `add $s0, $t0, $t1` seguido de `sub $t2, $s0, $t3`
   - Esperado: evento `forwarding`, wire `ex_mem_forward_to_alu_a`, `ForwardA=10`, sin stall.

5. Jump
   - Programa: `j end`, una instruccion intermedia, `end:` y una instruccion destino.
   - Esperado: la instruccion intermedia no llega a WB; timeline y `finalState` no se contradicen.

