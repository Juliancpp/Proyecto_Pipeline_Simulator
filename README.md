# MIPS Pipeline Simulator

Simulador educativo web para estudiar la ejecucion funcional de programas MIPS y visualizar, ciclo por ciclo, el comportamiento de un pipeline clasico de 5 etapas: **IF**, **ID**, **EX**, **MEM** y **WB**.

El proyecto combina un backend en **FastAPI/Python** con un frontend en **React/TypeScript**. El backend es la fuente de verdad de la simulacion: parsea el codigo MIPS, ejecuta el programa, simula el pipeline y genera los eventos, senales y componentes activos que la interfaz renderiza. El frontend presenta esta informacion mediante timeline, datapath visual, panel de hazards, metricas y explicaciones educativas.

## Descripcion General

MIPS Pipeline Simulator permite escribir o cargar programas en ensamblador MIPS y observar como avanzan sus instrucciones por un pipeline de 5 etapas:

- **IF**: Instruction Fetch.
- **ID**: Instruction Decode / Register Read.
- **EX**: Execute / Address Calculation.
- **MEM**: Data Memory Access.
- **WB**: Write Back.

La aplicacion visualiza:

- Ejecucion funcional MIPS.
- Pipeline ciclo a ciclo.
- Datapath visual con componentes activos.
- Timeline de ejecucion.
- Hazards de datos y control.
- Forwarding.
- Stalls y bubbles.
- Branch y jump.
- Senales de control.
- Metricas de rendimiento.
- Explicaciones educativas por ciclo.

## Objetivo Academico

El objetivo del proyecto es apoyar cursos de **Organizacion de Computadores** y **Arquitectura de Computadores**, ayudando a los estudiantes a comprender visualmente:

- Como avanzan las instrucciones por el pipeline.
- Como el pipelining mejora el throughput.
- Como aparecen los hazards.
- Como se resuelven dependencias RAW mediante forwarding.
- Por que un load-use hazard requiere insertar bubbles.
- Como cambian los componentes, wires y senales del datapath en cada ciclo.
- Como branch y jump modifican el flujo de control del programa.

El simulador esta orientado a la docencia: no solo muestra resultados, sino que explica el comportamiento de cada ciclo con niveles de detalle ajustables.

## Caracteristicas Principales

- Editor de codigo MIPS.
- Carga de programas de ejemplo.
- Ejecucion manual con boton **Ejecutar simulacion**.
- Simulacion pipeline ciclo a ciclo.
- Modo **pipeline** y modo **sequential**.
- Timeline interactivo del pipeline.
- Datapath visual con componentes activos.
- Visualizacion de wires activos.
- Visualizacion de forwarding.
- Visualizacion de stalls y bubbles.
- Deteccion de load-use hazards.
- Manejo de branch y jump.
- Metricas: ciclos totales, instrucciones, stalls, forwarding events, CPI y speedup.
- Panel educativo con tres niveles de explicacion:
  - Intuitivo.
  - Universitario.
  - Hardware.
- Backend como fuente de verdad para eventos y senales.
- CORS configurable por variable de entorno.
- Servicio preparado para integracion futura con IA/Ollama.

## Arquitectura del Sistema

La aplicacion esta separada en frontend y backend.

### Frontend

El frontend renderiza la interfaz de usuario, el timeline, el datapath, las metricas, el panel de hazards y las explicaciones educativas. No inventa eventos visuales ni infiere por su cuenta que componentes deben encenderse. Renderiza la informacion estructurada enviada por el backend.

Componentes principales:

- `InstructionEditor`: editor y selector de programas.
- `PipelineTimeline`: visualizacion de etapas por ciclo.
- `DatapathVisualizer`: datapath visual y senales activas.
- `HazardVisualizer`: resumen de hazards y forwarding.
- `ExplanationPanel`: explicacion educativa del ciclo actual.
- `MetricsPanel`: metricas de ejecucion.
- `useSimulation`: estado central de la simulacion.
- `pipelineApi`: comunicacion con el backend.

### Backend

El backend recibe codigo MIPS, lo parsea, genera una representacion intermedia, ejecuta el programa funcionalmente y simula el pipeline. Tambien genera los datos que consume el frontend:

- `cycleEvents`
- `activeComponents`
- `activeWires`
- `controlSignals`
- `hazards`
- `forwardingEvents`
- `metrics`
- `finalState`
- `executionTrace`

### Flujo General

```text
Frontend React
   |
   | HTTP
   v
FastAPI Backend
   |
   v
MIPS Parser / Transpiler
   |
   v
MIPS Engine
   |
   v
Pipeline Simulator
   |
   v
cycleEvents / activeComponents / activeWires / controlSignals
   |
   v
Frontend Visualization
```

## Estructura de Carpetas

```text
backend/
  app/
    api/
      data.py
      explanation_routes.py
      program_routes.py
      routes.py
      simulation_routes.py
    mips/
      engine.py
      parser.py
      transpiler.py
      pipeline.py
      hazards.py
      forwarding.py
      signals.py
      datapath.py
      instruction_set.py
      memory.py
      registers.py
    schemas/
      explanation.py
      instruction.py
      pipeline.py
      simulation.py
    services/
      pipeline_service.py
      explanation_service.py
      ai_explanation_service.py
    main.py
  tests/
  requirements.txt
  pytest.ini

frontend/
  src/
    components/
    data/
    hooks/
    logic/
    routes/
    services/
    types/
    styles.css
  QA_MANUAL.md
  package.json
  vite.config.ts
```

### Backend

- `app/api/`: rutas HTTP de FastAPI.
- `app/mips/`: logica del parser, motor funcional, pipeline, hazards, forwarding, senales y datapath.
- `app/schemas/`: modelos Pydantic.
- `app/services/`: servicios de simulacion y explicacion educativa.
- `tests/`: pruebas automatizadas con pytest.

### Frontend

- `src/components/`: componentes visuales principales.
- `src/services/`: clientes HTTP y servicios de explicacion.
- `src/types/`: tipos TypeScript del contrato de simulacion.
- `src/routes/`: rutas de la aplicacion.
- `src/data/`: programas MIPS de ejemplo.
- `src/hooks/`: hooks de estado de simulacion.
- `QA_MANUAL.md`: guia de QA manual del datapath.

## Tecnologias Utilizadas

### Backend

- Python.
- FastAPI.
- Pydantic.
- Uvicorn.
- Pytest.
- HTTPX, usado por el servicio preparado para IA/Ollama.

### Frontend

- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- Radix UI.
- Lucide React.

## Requisitos Previos

- Python 3.10 o superior.
- Node.js 18 o superior.
- npm.
- Git.

> Nota: el entorno local del proyecto puede usar una version mas reciente de Python. Los comandos siguientes asumen un entorno Unix/Linux o macOS.

## Instalacion del Backend

Desde la raiz del proyecto:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

El archivo `backend/requirements.txt` ya existe. Si en otro entorno se modifican dependencias y se necesita regenerarlo:

```bash
pip freeze > requirements.txt
```

## Ejecucion del Backend

Desde `backend/`, con el entorno virtual activo:

```bash
uvicorn app.main:app --reload
```

Tambien puede ejecutarse como modulo:

```bash
python -m uvicorn app.main:app --reload
```

Por defecto, FastAPI queda disponible en:

```text
http://127.0.0.1:8000
```

Endpoints utiles:

- Documentacion Swagger: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/health`
- Simulacion pipeline: `POST http://127.0.0.1:8000/api/pipeline/simulate`
- Ejecucion funcional: `POST http://127.0.0.1:8000/api/mips/run`

## Instalacion del Frontend

Desde la raiz del proyecto:

```bash
cd frontend
npm install
```

## Configuracion del Frontend

El frontend usa por defecto:

```text
http://127.0.0.1:8000/api
```

Si se requiere cambiar la URL del backend, crear un archivo `.env` o `.env.local` en `frontend/`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## Ejecucion del Frontend

Desde `frontend/`:

```bash
npm run dev
```

Normalmente Vite queda disponible en:

```text
http://127.0.0.1:5173
```

Si el puerto esta ocupado, Vite puede usar otro puerto. El backend incluye defaults CORS para `5173`, `8080` y `8081`.

## Configuracion CORS

El backend permite configurar origenes CORS mediante la variable de entorno:

```bash
BACKEND_CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:8080,http://localhost:8080,http://127.0.0.1:8081,http://localhost:8081
```

No se usa `allow_origins=["*"]` porque `allow_credentials=True` esta activo.

## Configuracion Opcional de IA/Ollama

El backend contiene un servicio preparado para solicitar explicaciones a Ollama mediante `POST /api/explain/ai`. Si no esta configurado, el sistema usa un fallback determinista educativo basado en `cycleEvents`.

Variables opcionales:

```env
OLLAMA_API_KEY=<tu_api_key>
OLLAMA_HOST=https://ollama.com
OLLAMA_MODEL=gpt-oss:120b
```

No es obligatorio configurar Ollama para usar el simulador.

## Uso de la Aplicacion

1. Iniciar el backend.
2. Iniciar el frontend.
3. Abrir el navegador en la URL de Vite.
4. Escribir un programa MIPS o seleccionar un programa de ejemplo.
5. Presionar **Ejecutar simulacion**.
6. Navegar ciclo por ciclo con los controles.
7. Revisar el timeline de ejecucion.
8. Revisar el datapath visual.
9. Revisar el panel de hazards.
10. Leer la explicacion educativa del ciclo actual.

## Ejemplos de Programas MIPS

### Programa sin Hazards

```mips
add $s0, $t0, $t1
sub $s1, $t2, $t3
or  $s2, $t4, $t5
```

### RAW con Forwarding

```mips
add $s0, $t0, $t1
sub $t2, $s0, $t3
or  $t4, $t2, $t5
```

### Load-use Hazard

```mips
lw  $s0, 0($t0)
add $s1, $s0, $t1
```

### Store

```mips
add $s0, $t0, $t1
sw  $s0, 4($sp)
```

### Branch

```mips
beq $s0, $s1, target
add $t0, $t1, $t2
target:
sub $s2, $s3, $s4
```

### Jump

```mips
j end
add $t0, $t1, $t2
end:
sub $s0, $s1, $s2
```

### Programa Mixto Avanzado

```mips
addi $t0, $zero, 100
addi $t1, $zero, 7
sw   $t1, 0($t0)
lw   $s0, 0($t0)
add  $s1, $s0, $t1
sub  $s2, $s1, $s0
beq  $s2, $zero, done
or   $s3, $s2, $s1
done:
add  $v0, $s3, $zero
```

## API Principal

### `POST /api/pipeline/simulate`

Ejecuta la simulacion funcional y la simulacion de pipeline.

#### Request

```json
{
  "code": "lw $s0, 0($t0)\nadd $s1, $s0, $t1",
  "forwarding": true,
  "mode": "pipeline",
  "initialRegisters": {},
  "initialMemory": {}
}
```

Campos:

- `code`: programa MIPS en texto.
- `forwarding`: habilita o deshabilita forwarding.
- `mode`: `"pipeline"` o `"sequential"`.
- `initialRegisters`: valores iniciales de registros.
- `initialMemory`: valores iniciales de memoria, indexados por direccion.

#### Response

La respuesta contiene:

- `program`: instrucciones normalizadas.
- `cycles`: ciclos simulados del pipeline.
- `cycleEvents`: eventos de cada ciclo, incluidos dentro de cada elemento de `cycles`.
- `activeComponents`: componentes activos por ciclo.
- `activeWires`: wires activos por ciclo.
- `controlSignals`: senales de control por ciclo.
- `hazards`: hazards detectados.
- `forwardingEvents`: eventos de forwarding.
- `metrics`: metricas de ejecucion.
- `finalState`: estado final funcional de registros y memoria.
- `executionTrace`: instrucciones realmente completadas por el pipeline.

Otros endpoints relacionados:

- `POST /api/mips/run`: ejecuta el programa funcionalmente.
- `POST /api/explain/cycle`: genera explicacion deterministica para un ciclo.
- `POST /api/explain/ai`: genera explicacion mediante IA si Ollama esta configurado; usa fallback si no lo esta.
- `GET /api/programs`: lista programas de ejemplo.

## Contrato Visual del Simulador

El frontend no infiere visualmente el datapath por su cuenta.

**El backend es la fuente de verdad.**

El frontend renderiza los siguientes campos:

- `activeComponents`
- `activeWires`
- `cycleEvents`
- `controlSignals`
- `pipelineStages` o la informacion de etapas presente en `cycles`
- `executionTrace`

Esto evita que la UI ilumine componentes incorrectos. Por ejemplo:

- `DataMemory` no se activa para instrucciones R-format.
- `WriteBack` no se activa para `sw`, `beq` o `j`.
- `ForwardingUnit` se activa solo cuando hay un evento real de forwarding.
- `HazardDetectionUnit` se activa solo cuando hay stall/bubble real.

## Modelo de Pipeline Implementado

El simulador implementa un pipeline MIPS clasico de 5 etapas:

| Etapa | Funcion |
|---|---|
| IF | Busca la instruccion en Instruction Memory. |
| ID | Decodifica la instruccion y lee el Register File. |
| EX | Ejecuta ALU, calcula direcciones o resuelve comparaciones. |
| MEM | Accede a Data Memory cuando corresponde. |
| WB | Escribe resultados en Register File cuando corresponde. |

Aclaraciones importantes:

- Las instrucciones R-format pasan por MEM, pero no activan `DataMemory`.
- `lw` usa `DataMemory` en MEM y escribe en WB.
- `sw` usa `DataMemory` en MEM, pero no usa WB.
- `beq` y `bne` se resuelven como flujo de control, no como instrucciones normales hasta MEM/WB.
- `j` cambia el PC hacia el label destino y no activa MEM/WB.
- `jal` esta definido en el conjunto de instrucciones y escribe `$ra` como parte del flujo de control.
- `$zero` no se modifica.
- El modelo de control hazards es conservador: espera hasta EX y no implementa prediccion ni flush especulativo visual.

## Hazards Soportados

El simulador soporta:

- RAW hazards.
- Forwarding `EX/MEM -> EX`.
- Forwarding `MEM/WB -> EX`.
- Forwarding de dato para `sw` cuando aplica.
- Load-use hazard con un stall y una bubble.
- Congelamiento de `PC` e `IF/ID` en load-use.
- Insercion de NOP en `ID/EX`.
- Control hazards conservadores para branch/jump.

## Explicacion Educativa

El panel educativo explica el ciclo actual usando informacion real del backend. Tiene tres niveles:

### Nivel Intuitivo

Explica con lenguaje simple para estudiantes principiantes. Evita detalles internos salvo que sean necesarios.

### Nivel Universitario

Explica con vocabulario formal de arquitectura:

- Etapas IF/ID/EX/MEM/WB.
- Registros de pipeline.
- Hazards.
- Forwarding.
- Throughput.
- Stalls y bubbles.

### Nivel Hardware

Explica detalles internos:

- `controlSignals`.
- `ForwardA` y `ForwardB`.
- `PCWrite`.
- `IF_IDWrite`.
- `ControlMux`.
- Muxes.
- Wires activos.
- Registros de pipeline.

Si el servicio de IA/Ollama no esta disponible, el panel mantiene una explicacion deterministica basada en `cycleEvents`.

## Pruebas y QA

### Backend

Desde `backend/`:

```bash
source venv/bin/activate
pytest
```

Resultado esperado:

```text
pytest debe completar sin fallos.
```

### Frontend

Desde `frontend/`:

```bash
npm run build
```

Resultado esperado:

```text
npm run build debe completarse correctamente.
```

El proyecto no incluye un framework completo de tests frontend automatizados. Existe una guia de QA manual en:

```text
frontend/QA_MANUAL.md
```

## Casos QA Validados

| Caso | Resultado esperado |
|---|---|
| R-format sin memoria | No se activa `DataMemory`. |
| Store sin WriteBack | `sw` no llega a WB. |
| Load-use | Se genera exactamente 1 stall y 1 bubble. |
| RAW forwarding | Forwarding sin stall innecesario. |
| Jump | La instruccion saltada no se completa. |
| Branch | `BranchLogic` activo, sin memoria ni WB. |

## Creditos

Desarrollado como proyecto educativo para Organizacion de Computadores.

**Autor:** Julián Díaz
