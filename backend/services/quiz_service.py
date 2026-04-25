"""
services/quiz_service.py — Generates and caches MCQ quiz questions.
Cache is in-memory (keyed by notebook_id) to avoid redundant Gemini calls.
Invalidated when new documents are ingested into the same notebook.
"""
from __future__ import annotations

from backend.config import settings
from backend.errors import LLMError, NotFoundError
from backend.models import QuizQuestion, QuizResponse
from pipeline import llm, qdrant_client

# In-memory cache: notebook_id → QuizResponse
_cache: dict[str, QuizResponse] = {}

# Retrieve up to this many chunks to ground the quiz questions
_MAX_CHUNKS_FOR_QUIZ = 15


async def get_quiz(notebook_id: str, num_questions: int = 5) -> QuizResponse:
    """
    Return cached quiz for the notebook, or generate and cache it.
    Raises NotFoundError if no documents exist for this notebook.
    """
    # Return cached result if available
    if notebook_id in _cache:
        return _cache[notebook_id]

    # Fetch representative chunks from Qdrant
    all_payloads = await qdrant_client.scroll_by_notebook(
        collection_name=settings.qdrant_collection_name,
        notebook_id=notebook_id,
        limit=_MAX_CHUNKS_FOR_QUIZ,
    )

    if not all_payloads:
        raise NotFoundError(f"No documents found for notebook '{notebook_id}'.")

    chunks = [
        {"text": p.get("text", ""), "source": p.get("source_filename", "")}
        for p in all_payloads
    ]

    try:
        raw = await llm.generate_quiz(chunks, num_questions=num_questions)
    except Exception as exc:
        raise LLMError(f"Quiz generation failed: {exc}") from exc

    questions = [
        QuizQuestion(
            q=item.get("q", ""),
            options=item.get("options", []),
            correct=item.get("correct", 0),
        )
        for item in raw.get("questions", [])
        if item.get("q") and item.get("options")
    ]

    response = QuizResponse(questions=questions, notebook_id=notebook_id)
    _cache[notebook_id] = response
    return response


def invalidate_cache(notebook_id: str) -> None:
    """Call this after a new document is ingested to force re-generation."""
    _cache.pop(notebook_id, None)
