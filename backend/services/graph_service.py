"""
services/graph_service.py — Orchestrates knowledge graph extraction.
Fetches representative chunks from Qdrant, calls the extractor, caches the result.
"""
from __future__ import annotations

import logging

from backend.config import settings
from backend.errors import LLMError, NotFoundError
from backend.models import GraphEdge, GraphNode, GraphResponse
from pipeline import graph_extractor, qdrant_client

logger = logging.getLogger(__name__)

# In-memory cache: notebook_id → GraphResponse
_cache: dict[str, GraphResponse] = {}

_MAX_CHUNKS_FOR_GRAPH = 15


async def get_graph(notebook_id: str) -> GraphResponse:
    """
    Return the cached knowledge graph for this notebook, or extract and cache it.
    Raises NotFoundError if no documents have been ingested yet.
    """
    if notebook_id in _cache:
        logger.info("graph_service: cache hit for notebook '%s'", notebook_id)
        return _cache[notebook_id]

    # Fetch representative chunks from Qdrant (scroll — no query vector needed)
    payloads = await qdrant_client.scroll_by_notebook(
        collection_name=settings.qdrant_collection_name,
        notebook_id=notebook_id,
        limit=_MAX_CHUNKS_FOR_GRAPH,
    )

    if not payloads:
        raise NotFoundError(f"No documents found for notebook '{notebook_id}'.")

    chunk_texts = [p.get("text", "") for p in payloads if p.get("text")]

    try:
        raw = await graph_extractor.extract_graph(chunk_texts)
    except Exception as exc:
        raise LLMError(f"Graph extraction failed: {exc}") from exc

    # Parse and validate nodes / edges
    nodes = [
        GraphNode(
            id=n.get("id", ""),
            label=n.get("label", ""),
            type=n.get("type", "concept"),
        )
        for n in raw.get("nodes", [])
        if n.get("id") and n.get("label")
    ]

    # Build a set of valid node ids to filter out dangling edges
    valid_ids = {n.id for n in nodes}
    edges = [
        GraphEdge(
            source=e.get("source", ""),
            target=e.get("target", ""),
            relationship=e.get("relationship", "relates to"),
        )
        for e in raw.get("edges", [])
        if e.get("source") in valid_ids and e.get("target") in valid_ids
    ]

    response = GraphResponse(
        nodes=nodes,
        edges=edges,
        notebook_id=notebook_id,
    )

    _cache[notebook_id] = response
    logger.info(
        "graph_service: extracted graph for notebook '%s' — %d nodes, %d edges",
        notebook_id, len(nodes), len(edges),
    )
    return response


def invalidate_cache(notebook_id: str) -> None:
    """Call this when a document is deleted to force re-extraction."""
    _cache.pop(notebook_id, None)
