"""
services/mindmap_service.py — Orchestrates mindmap extraction.
Fetches representative chunks from Qdrant, calls the extractor, caches the result.
"""
from __future__ import annotations

import logging

from backend.config import settings
from backend.errors import LLMError, NotFoundError
from backend.models import MindmapNode, MindmapResponse
from pipeline import mindmap_extractor, qdrant_client

logger = logging.getLogger(__name__)

# In-memory cache: notebook_id → MindmapResponse
_cache: dict[str, MindmapResponse] = {}

_MAX_CHUNKS_FOR_MINDMAP = 15


def _build_node(raw: dict) -> MindmapNode:
    """Recursively convert raw dict into MindmapNode model."""
    return MindmapNode(
        id=raw.get("id", "node"),
        label=raw.get("label", ""),
        children=[_build_node(c) for c in raw.get("children", []) if isinstance(c, dict)],
    )


async def get_mindmap(notebook_id: str) -> MindmapResponse:
    """
    Return cached mindmap for this notebook, or extract and cache it.
    Raises NotFoundError if no documents have been ingested yet.
    """
    if notebook_id in _cache:
        logger.info("mindmap_service: cache hit for notebook '%s'", notebook_id)
        return _cache[notebook_id]

    # Fetch representative chunks from Qdrant
    payloads = await qdrant_client.scroll_by_notebook(
        collection_name=settings.qdrant_collection_name,
        notebook_id=notebook_id,
        limit=_MAX_CHUNKS_FOR_MINDMAP,
    )

    if not payloads:
        raise NotFoundError(f"No documents found for notebook '{notebook_id}'.")

    chunk_texts = [p.get("text", "") for p in payloads if p.get("text")]

    try:
        raw = await mindmap_extractor.extract_mindmap(chunk_texts)
    except Exception as exc:
        raise LLMError(f"Mindmap extraction failed: {exc}") from exc

    root_node = _build_node(raw.get("root", {"id": "root", "label": "Document", "children": []}))

    response = MindmapResponse(root=root_node, notebook_id=notebook_id)
    _cache[notebook_id] = response

    logger.info(
        "mindmap_service: extracted mindmap for notebook '%s' — root: '%s', branches: %d",
        notebook_id, root_node.label, len(root_node.children),
    )
    return response


def invalidate_cache(notebook_id: str) -> None:
    """Call when a document is deleted to force re-extraction on next request."""
    _cache.pop(notebook_id, None)
