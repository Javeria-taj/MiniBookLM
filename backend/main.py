"""
main.py — FastAPI application entry point.
Wires CORS, routers, startup/shutdown, health endpoint, and global error handler.
"""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.errors import global_exception_handler
from backend.models import HealthResponse
from backend.routes import chat, documents, graph, ingest, insights
from pipeline import qdrant_client

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="MiniBookLM API",
    description="Document intelligence backend — RAG pipeline powered by Gemini + Qdrant.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — allow all origins (hackathon demo, single-user)
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,   # must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global exception handler — catches ALL unhandled errors
# ---------------------------------------------------------------------------

app.add_exception_handler(Exception, global_exception_handler)

# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup() -> None:
    logger.info("Starting MiniBookLM backend (env=%s)", settings.environment)

    # Initialise Qdrant client singleton
    qdrant_client.init_client(
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key,
    )

    # Ensure collection exists
    await qdrant_client.init_collection(
        collection_name=settings.qdrant_collection_name,
        vector_size=settings.embedding_dimension,
    )

    logger.info("Qdrant collection '%s' ready.", settings.qdrant_collection_name)


@app.on_event("shutdown")
async def shutdown() -> None:
    await qdrant_client.close_client()
    logger.info("MiniBookLM backend shut down cleanly.")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health() -> HealthResponse:
    """Confirm service is running and Qdrant is reachable."""
    client = qdrant_client.get_client()
    try:
        await client.get_collections()
        qdrant_status = "connected"
    except Exception:
        qdrant_status = "unreachable"

    return HealthResponse(status="ok", qdrant=qdrant_status)


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(ingest.router)
app.include_router(chat.router)
app.include_router(insights.router)
app.include_router(documents.router)
app.include_router(graph.router)
