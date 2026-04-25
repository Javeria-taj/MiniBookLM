"""
services/insights_service.py — Generates and caches notebook insights.
Cache is in-memory (keyed by notebook_id) to avoid redundant Gemini calls.
"""
from __future__ import annotations

from backend.config import settings
from backend.errors import LLMError, NotFoundError
from backend.models import InsightsResponse
from pipeline import llm, qdrant_client

# In-memory cache: notebook_id → InsightsResponse
_cache: dict[str, InsightsResponse] = {}

_MAX_CHUNKS_FOR_INSIGHTS = 10


async def get_insights(notebook_id: str) -> InsightsResponse:
    """
    Return cached insights for the notebook, or generate and cache them.
    Raises NotFoundError if no documents exist for this notebook.
    """
    # Return cached result if available
    if notebook_id in _cache:
        return _cache[notebook_id]

    # Fetch representative chunks from Qdrant
    all_payloads = await qdrant_client.scroll_by_notebook(
        collection_name=settings.qdrant_collection_name,
        notebook_id=notebook_id,
        limit=_MAX_CHUNKS_FOR_INSIGHTS,
    )

    if not all_payloads:
        raise NotFoundError(f"No documents found for notebook '{notebook_id}'.")

    chunks = [{"text": p.get("text", ""), "source": p.get("source_filename", "")} for p in all_payloads]

    try:
        raw = await llm.generate_insights(chunks)
    except Exception as exc:
        raise LLMError(f"Insights generation failed: {exc}") from exc

    response = InsightsResponse(
        summary=raw.get("summary", ""),
        key_topics=raw.get("key_topics", []),
        suggested_questions=raw.get("suggested_questions", []),
    )

    _cache[notebook_id] = response
    return response


def invalidate_cache(notebook_id: str) -> None:
    """Call this after a document is deleted to force re-generation."""
    _cache.pop(notebook_id, None)
