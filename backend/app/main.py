from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import explanation_routes, program_routes, routes, simulation_routes


DEFAULT_CORS_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:8080",
    "http://localhost:8080",
    "http://127.0.0.1:8081",
    "http://localhost:8081",
]


def cors_origins() -> list[str]:
    configured = os.getenv("BACKEND_CORS_ORIGINS")
    if not configured:
        return DEFAULT_CORS_ORIGINS
    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    return origins or DEFAULT_CORS_ORIGINS


app = FastAPI(
    title="MIPS Pipeline Simulator Backend",
    version="0.1.0",
    description="Educational MIPS functional and 5-stage pipeline simulator.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router)
app.include_router(program_routes.router)
app.include_router(program_routes.program_router)
app.include_router(simulation_routes.router)
app.include_router(explanation_routes.router)
