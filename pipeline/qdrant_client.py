"""
pipeline/qdrant_client.py — Qdrant Cloud helpers.
Pure functions + a module-level client singleton.
No FastAPI imports. No HTTP concerns.
"""
from __future__ import annotations

import uuid
from typing import Any

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    FilterSelector,
    MatchValue,
    PayloadSchemaType,
    PointStruct,
    VectorParams,
)

# ---------------------------------------------------------------------------
# Singleton client
# ---------------------------------------------------------------------------

_client: AsyncQdrantClient | None = None


def init_client(url: str, api_key: str) -> None:
    """Call once from main.py startup event."""
    global _client
    _client = AsyncQdrantClient(url=url, api_key=api_key)


def get_client() -> AsyncQdrantClient:
    if _client is None:
        raise RuntimeError("Qdrant client has not been initialised — call init_client() first.")
    return _client


async def close_client() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None


# ---------------------------------------------------------------------------
# Collection management
# ---------------------------------------------------------------------------

async def init_collection(collection_name: str, vector_size: int) -> None:
    """Create the collection if it does not already exist, then ensure payload indexes."""
    client = get_client()
    existing = await client.collection_exists(collection_name)
    if not existing:
        await client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )

    # Always ensure payload indexes exist (idempotent — safe to call on existing collections).
    # Qdrant requires a keyword index on any field used in filter queries.
    for field in ("notebook_id", "doc_id"):
        await client.create_payload_index(
            collection_name=collection_name,
            field_name=field,
            field_schema=PayloadSchemaType.KEYWORD,
        )


# ---------------------------------------------------------------------------
# CRUD helpers
# ---------------------------------------------------------------------------

async def upsert_chunks(
    collection_name: str,
    chunks: list[dict[str, Any]],
    embeddings: list[list[float]],
) -> int:
    """
    Upsert chunk payloads + their embeddings into Qdrant.
    Returns the number of points upserted.
    """
    client = get_client()
    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=embedding,
            payload=chunk,
        )
        for chunk, embedding in zip(chunks, embeddings)
    ]
    await client.upsert(collection_name=collection_name, points=points, wait=True)
    return len(points)


async def search_chunks(
    collection_name: str,
    query_vector: list[float],
    notebook_id: str,
    doc_id: str | None = None,
    top_k: int = 5,
    score_threshold: float = 0.5,
) -> list[dict[str, Any]]:
    """
    Similarity search filtered by notebook_id (and optionally doc_id).
    Returns up to top_k results with score >= score_threshold.
    """
    client = get_client()

    must_conditions = [
        FieldCondition(key="notebook_id", match=MatchValue(value=notebook_id))
    ]
    if doc_id:
        must_conditions.append(
            FieldCondition(key="doc_id", match=MatchValue(value=doc_id))
        )

    results = await client.query_points(
        collection_name=collection_name,
        query=query_vector,
        query_filter=Filter(must=must_conditions),
        limit=top_k,
        score_threshold=score_threshold,
        with_payload=True,
    )

    return [
        {
            "text": r.payload.get("text", ""),
            "source": r.payload.get("source_filename", ""),
            "page": r.payload.get("page_number", 0),
            "chunk_index": r.payload.get("chunk_index", 0),
            "score": r.score,
        }
        for r in results.points
    ]


async def delete_by_doc_id(collection_name: str, doc_id: str) -> None:
    """Delete all Qdrant points where payload.doc_id == doc_id."""
    client = get_client()
    await client.delete(
        collection_name=collection_name,
        points_selector=FilterSelector(
            filter=Filter(
                must=[FieldCondition(key="doc_id", match=MatchValue(value=doc_id))]
            )
        ),
        wait=True,
    )


async def scroll_by_notebook(
    collection_name: str,
    notebook_id: str,
    limit: int = 1000,
) -> list[dict[str, Any]]:
    """
    Scroll all points for a notebook — used to list documents and generate insights.
    Returns raw payload dicts (no vectors).
    """
    client = get_client()
    results, _ = await client.scroll(
        collection_name=collection_name,
        scroll_filter=Filter(
            must=[FieldCondition(key="notebook_id", match=MatchValue(value=notebook_id))]
        ),
        limit=limit,
        with_payload=True,
        with_vectors=False,
    )
    return [r.payload for r in results]
