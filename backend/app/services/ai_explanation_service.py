from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import httpx

from app.services.explanation_service import build_deterministic_explanation


DEFAULT_OLLAMA_HOST = "https://ollama.com"
DEFAULT_OLLAMA_MODEL = "gpt-oss:120b"
REQUEST_TIMEOUT_SECONDS = 20.0


def generate_ai_explanation(request: dict) -> dict:
    """Generate a didactic explanation using Ollama Cloud when configured.

    Required environment variable:
      OLLAMA_API_KEY

    Optional environment variables:
      OLLAMA_HOST=https://ollama.com
      OLLAMA_MODEL=gpt-oss:120b
    """
    _load_local_env_if_needed()
    api_key = os.getenv("OLLAMA_API_KEY")
    if not api_key:
        return _fallback_response(
            request,
            "Ollama no esta configurado. Define OLLAMA_API_KEY para activar el tutor IA.",
        )

    host = os.getenv("OLLAMA_HOST", DEFAULT_OLLAMA_HOST).rstrip("/")
    model = os.getenv("OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL)
    payload = {
        "model": model,
        "messages": _build_messages(request),
        "stream": False,
        "options": {
            "temperature": 0.2,
            "top_p": 0.9,
        },
    }

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = client.post(
                f"{host}/api/chat",
                headers={"Authorization": f"Bearer {api_key}"},
                json=payload,
            )
            response.raise_for_status()
            body = response.json()
    except httpx.HTTPStatusError as exc:
        return _fallback_response(
            request,
            f"Ollama respondio con error HTTP {exc.response.status_code}.",
        )
    except httpx.RequestError:
        return _fallback_response(
            request,
            "No se pudo conectar con Ollama. Se usa explicacion mock.",
        )
    except ValueError:
        return _fallback_response(
            request,
            "Ollama devolvio una respuesta invalida. Se usa explicacion mock.",
        )

    text = _extract_message_content(body)
    if not text:
        return _fallback_response(
            request,
            "Ollama no devolvio texto util. Se usa explicacion mock.",
        )

    return {
        "provider": f"ollama:{model}",
        "explanation": text,
        "streamed": False,
        "fallback": False,
    }


def _build_messages(context: dict[str, Any]) -> list[dict[str, str]]:
    level = _normalize_level(context.get("explanationLevel"))
    summary = _educational_summary(context)
    return [
        {
            "role": "system",
            "content": _system_prompt(level),
        },
        {
            "role": "user",
            "content": (
                "Ensenia lo que ocurre en este ciclo del pipeline MIPS. "
                "Usa el contexto solo como evidencia tecnica; no lo repitas como logs. "
                "No inventes eventos que no aparezcan en la evidencia.\n\n"
                f"Nivel solicitado: {level}\n"
                f"{summary}"
            ),
        },
    ]


def _system_prompt(level: str) -> str:
    level_guidance = {
        "intuitive": (
            "Nivel 1 - Intuitivo: explica para principiantes. Usa una analogia breve si ayuda "
            "(linea de ensamblaje, tarea, flujo de trabajo), sin exagerar. Evita senales internas "
            "salvo que sean imprescindibles."
        ),
        "university": (
            "Nivel 2 - Tecnico universitario: explica formalmente etapas IF/ID/EX/MEM/WB, "
            "dependencias, throughput, hazards, forwarding y stalls con vocabulario de arquitectura."
        ),
        "hardware": (
            "Nivel 3 - Hardware interno: incluye muxes, pipeline registers, senales de control, "
            "ForwardA/ForwardB, PCWrite, IF_IDWrite y rutas activas, pero siempre conectandolo con el concepto."
        ),
    }[level]
    return (
        "Actua como un profesor experto de Organizacion de Computadoras y Arquitectura de Computadores. "
        "Tu objetivo principal es ENSENAR, no describir logs. Empieza por la idea conceptual de lo que pasa "
        "en el ciclo, luego conecta esa idea con el hardware visible. Explica por que ocurre, que problema "
        "resuelve el pipeline y cuales son las consecuencias de hazards, forwarding, stalls, branches o jumps.\n\n"
        "Reglas de estilo:\n"
        "- No hagas dumps de JSON, IDs internos, None, ni listas de variables sin contexto.\n"
        "- No empieces con 'segun los datos' ni 'el simulador indica'. Habla como docente.\n"
        "- Basa la explicacion unicamente en los eventos, senales y componentes proporcionados.\n"
        "- No menciones forwarding, bubble, stall, Data Memory ni Write Back si no aparecen en los eventos o componentes.\n"
        "- Si hay forwarding, explica que valor se adelanta, desde donde, hacia donde y por que evita un stall.\n"
        "- Si hay load-use, explica que el dato aun no existe a tiempo y que forwarding no puede viajar hacia atras en el tiempo.\n"
        "- Si hay branch, explica que este simulador espera conservadoramente hasta EX; no usa prediccion ni flush especulativo.\n"
        "- Si hay jump, explica que el PC cambia y por que eso afecta el flujo secuencial.\n"
        "- Si hay memoria, explica lectura/escritura y su papel en MEM.\n"
        "- Menciona componentes iluminados relevantes y lineas activas solo como apoyo visual.\n"
        "- En nivel intuitivo evita nombres de senales; en nivel hardware si puedes mencionar controlSignals y wires.\n"
        "- Responde en espanol claro en 2 a 4 parrafos cortos.\n\n"
        f"{level_guidance}"
    )


def _educational_summary(context: dict[str, Any]) -> str:
    level = _normalize_level(context.get("explanationLevel"))
    active = context.get("activeInstructions", [])
    events = context.get("cycleEvents", [])
    components = context.get("activeComponents", [])
    wires = context.get("activeWires", [])
    control_signals = context.get("controlSignals", {})
    hazards = context.get("hazards", [])
    forwarding_events = context.get("forwardingEvents", [])
    lines = [
        f"Ciclo actual: {context.get('cycle')} de {context.get('totalCycles')}",
        "Instrucciones activas reales:",
    ]
    for item in active if isinstance(active, list) else []:
        if isinstance(item, dict):
            lines.append(f"- {item.get('raw')} en etapa {item.get('stage')}")
    if events:
        lines.append("Eventos reales del ciclo:")
        for event in events if isinstance(events, list) else []:
            if isinstance(event, dict):
                parts = [str(event.get("type", "evento"))]
                if event.get("instructionText"):
                    parts.append(f"instruccion {event.get('instructionText')}")
                if event.get("stage"):
                    parts.append(f"etapa {event.get('stage')}")
                if event.get("register"):
                    parts.append(f"registro {event.get('register')}")
                if event.get("source"):
                    parts.append(f"desde {event.get('source')}")
                if event.get("target"):
                    parts.append(f"hacia {event.get('target')}")
                if event.get("message"):
                    parts.append(str(event.get("message")))
                lines.append("- " + "; ".join(part for part in parts if part))
    if components:
        lines.append("Componentes iluminados relevantes: " + ", ".join(map(str, components[:14])))
    if wires and level == "hardware":
        lines.append("Lineas/rutas activas relevantes: " + ", ".join(map(str, wires[:10])))
    if isinstance(control_signals, dict) and control_signals and level == "hardware":
        ordered = [
            "RegWrite",
            "MemRead",
            "MemWrite",
            "MemToReg",
            "ALUSrc",
            "Branch",
            "Jump",
            "PCWrite",
            "IF_IDWrite",
            "ControlMux",
            "ForwardA",
            "ForwardB",
        ]
        rendered = [f"{key}={control_signals[key]}" for key in ordered if key in control_signals]
        lines.append("Senales de control reales: " + ", ".join(rendered))
    if hazards:
        lines.append(f"Hazards reportados por el backend: {hazards}")
    if forwarding_events:
        lines.append(f"Forwarding reportado por el backend: {forwarding_events}")
    trace = context.get("executionTrace", [])
    if trace:
        executed = [
            item.get("instructionText")
            for item in trace
            if isinstance(item, dict) and item.get("instructionText")
        ]
        lines.append("Instrucciones realmente completadas hasta la simulacion: " + ", ".join(executed))
    return "\n".join(lines)


def _normalize_level(value: Any) -> str:
    if value in {"intuitive", "university", "hardware"}:
        return str(value)
    return "university"


def _extract_message_content(body: dict[str, Any]) -> str:
    message = body.get("message")
    if isinstance(message, dict) and isinstance(message.get("content"), str):
        return message["content"].strip()
    if isinstance(body.get("response"), str):
        return body["response"].strip()
    return ""


def _fallback_response(request: dict, reason: str) -> dict:
    level = _normalize_level(request.get("explanationLevel"))
    explanation = build_deterministic_explanation(request, level=level, reason=reason)
    return {
        "provider": "mock",
        "explanation": explanation,
        "streamed": False,
        "fallback": True,
        "reason": reason,
    }


def _load_local_env_if_needed() -> None:
    if os.getenv("OLLAMA_DISABLE_ENV_FILE") == "1":
        return
    if os.getenv("OLLAMA_API_KEY"):
        return
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))
