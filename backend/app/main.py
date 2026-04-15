from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import events, executions, health
from app.config import get_settings

settings = get_settings()
logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[type-arg]
    logger.info(
        "Agentic Integration Backend starting | stub_services=%s | log_level=%s",
        settings.use_stub_services,
        settings.log_level,
    )
    yield
    logger.info("Agentic Integration Backend shutting down")


app = FastAPI(
    title="Agentic Integration API",
    version="0.1.0",
    description="Backend for the Agentic Integration commerce agent hub.",
    lifespan=lifespan,
)

# CORS: explicit allow-list only (not wildcard)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(health.router)
app.include_router(events.router)
app.include_router(executions.router)
