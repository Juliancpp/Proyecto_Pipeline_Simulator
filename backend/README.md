# MIPS Pipeline Simulator Backend

Backend educativo en FastAPI para parsear, ejecutar y simular programas MIPS en un pipeline clasico de 5 etapas: IF, ID, EX, MEM y WB.

## Instalacion

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Ejecucion

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

```bash
curl http://localhost:8000/api/health
```

## Endpoints

- `GET /api/health`
- `POST /api/mips/parse`
- `POST /api/mips/run`
- `POST /api/pipeline/simulate`
- `POST /api/explain/cycle`
- `POST /api/explain/ai` placeholder preparado para Ollama

Ejemplo de simulacion:

```json
{
  "code": "lw $s0, 20($s1)\nand $s4, $s0, $s5",
  "forwarding": true,
  "mode": "pipeline",
  "initialRegisters": {"$s1": 100, "$s5": 3},
  "initialMemory": {"120": 7}
}
```

Respuesta principal:

```json
{
  "program": [],
  "cycles": [],
  "hazards": [],
  "forwardingEvents": [],
  "metrics": {
    "totalCycles": 0,
    "instructionCount": 0,
    "stalls": 0,
    "forwardingEvents": 0,
    "cpi": 0
  },
  "finalState": {
    "registers": {},
    "memory": {}
  }
}
```

## Arquitectura

- `app/mips/parser.py`: elimina comentarios, reconoce `.data`, `.text`, labels e instrucciones.
- `app/mips/transpiler.py`: convierte el AST a IR uniforme con `uses`, `writes`, offsets, targets y etapas.
- `app/mips/engine.py`: ejecucion funcional MIPS con registros, memoria y PC.
- `app/mips/pipeline.py`: simulacion visual del pipeline, stalls, bubbles y registros IF/ID, ID/EX, EX/MEM, MEM/WB.
- `app/mips/hazards.py`: hazards RAW, load-use y control basico.
- `app/mips/forwarding.py`: eventos EX/MEM -> EX y MEM/WB -> EX.
- `app/mips/datapath.py`: componentes y wires activos por ciclo.
- `app/services/explanation_service.py`: explicaciones deterministas por ciclo.
- `app/services/ai_explanation_service.py`: abstraccion mock para conectar Ollama mas adelante.

## Alcance actual

Soporta registros MIPS por nombre y numericos: `$zero`, `$at`, `$v0-$v1`, `$a0-$a3`, `$t0-$t9`, `$s0-$s7`, `$k0-$k1`, `$gp`, `$sp`, `$fp`, `$ra`, `$0-$31`.

Instrucciones soportadas:

- R-format: `add`, `addu`, `sub`, `subu`, `and`, `or`, `xor`, `nor`, `slt`, `sll`, `srl`, `jr`
- I-format: `addi`, `addiu`, `andi`, `ori`, `xori`, `slti`, `lw`, `sw`, `beq`, `bne`, `lui`
- J-format: `j`, `jal`

El simulador de pipeline es educativo y determinista. La ejecucion funcional resuelve branches y jumps para validar resultados finales. La simulacion de pipeline representa hazards y forwarding sobre el flujo estatico del programa; el manejo de control hazard es basico.

## Conexion con el frontend

Configura el frontend para apuntar a `http://localhost:8000`. El endpoint principal es `POST /api/pipeline/simulate`; devuelve `program`, `cycles`, `hazards`, `forwardingEvents`, `metrics` y `finalState`.

## Extender instrucciones

1. Agrega la especificacion en `app/mips/instruction_set.py`.
2. Agrega parseo de operandos en `app/mips/transpiler.py`.
3. Agrega semantica funcional en `app/mips/engine.py`.
4. Agrega tests en `tests/`.

## Tests

```bash
pytest
```
