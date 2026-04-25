"""
services/flashcard_service.py — Generates and caches flashcards.
Cache is in-memory (keyed by notebook_id) to avoid redundant Gemini calls.
"""
from __future__ import annotations

from backend.config import settings
from backend.errors import LLMError, NotFoundError
from backend.models import Flashcard, FlashcardResponse
from pipeline import llm, qdrant_client

# In-memory cache: notebook_id → FlashcardResponse
_cache: dict[str, FlashcardResponse] = {}

# Retrieve up to this many chunks to ground the flashcards
_MAX_CHUNKS_FOR_FLASHCARDS = 15


async def get_flashcards(notebook_id: str, num_cards: int = 6) -> FlashcardResponse:
    """
    Return cached flashcards for the notebook, or generate and cache them.
    Raises NotFoundError if no documents exist for this notebook.
    """
    # Return cached result if available
    if notebook_id in _cache:
        return _cache[notebook_id]

    # Fetch representative chunks from Qdrant
    all_payloads = await qdrant_client.scroll_by_notebook(
        collection_name=settings.qdrant_collection_name,
        notebook_id=notebook_id,
        limit=_MAX_CHUNKS_FOR_FLASHCARDS,
    )

    if not all_payloads:
        raise NotFoundError(f"No documents found for notebook '{notebook_id}'.")

    chunks = [
        {"text": p.get("text", ""), "source": p.get("source_filename", "")}
        for p in all_payloads
    ]

    try:
        raw = await llm.generate_flashcards(chunks, num_cards=num_cards)
    except Exception as exc:
        raise LLMError(f"Flashcard generation failed: {exc}") from exc

    flashcards = [
        Flashcard(
            id=i + 1,
            front=item.get("front", ""),
            back=item.get("back", ""),
        )
        for i, item in enumerate(raw.get("flashcards", []))
        if item.get("front") and item.get("back")
    ]

    response = FlashcardResponse(flashcards=flashcards, notebook_id=notebook_id)
    _cache[notebook_id] = response
    return response


def invalidate_cache(notebook_id: str) -> None:
    """Call this after a new document is ingested to force re-generation."""
    _cache.pop(notebook_id, None)
