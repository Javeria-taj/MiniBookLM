"""
pipeline/retriever.py — Query embedding + Qdrant similarity search.
Pure async functions. No FastAPI imports.
"""
from __future__ import annotations

from typing import Any

from pipeline import embedder, qdrant_client
from backend.config import settings


async def retrieve(
    query: str,
    notebook_id: str,
    doc_id: str | None = None,
    top_k: int = 5,
    score_threshold: float = 0.5,
) -> list[dict[str, Any]]:
    """
    Embed the query and search Qdrant for the most relevant chunks.

    Args:
        query: The user's natural-language question.
        notebook_id: Scope search to this notebook.
        doc_id: Optional — further narrow to a single document.
        top_k: Maximum results to return.
        score_threshold: Discard results below this cosine similarity.

    Returns:
        List of dicts: { text, source, page, chunk_index, score }
    """
    # Embed the query
    vectors = await embedder.embed_texts([query])
    query_vector = vectors[0]

    # Search Qdrant
    results = await qdrant_client.search_chunks(
        collection_name=settings.qdrant_collection_name,
        query_vector=query_vector,
        notebook_id=notebook_id,
        doc_id=doc_id,
        top_k=top_k,
        score_threshold=score_threshold,
    )

    return results
