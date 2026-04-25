"""
pipeline/embedder.py — Gemini embedding calls with batching and retry.
Migrated to google-genai SDK.
Pure async functions. No FastAPI imports.
"""
from __future__ import annotations

import asyncio
import logging

from google import genai
from google.genai import types

from backend.config import settings

logger = logging.getLogger(__name__)

_BATCH_SIZE = 100          # Max texts per API call
_MAX_RETRIES = 3
_RETRY_BASE_DELAY = 0.5    # seconds; doubles each retry


# ---------------------------------------------------------------------------
# Internal — Client singleton
# ---------------------------------------------------------------------------

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Embed a list of texts using Gemini (google-genai).
    Batches up to _BATCH_SIZE per API call and retries on errors.

    Returns a list of embedding vectors in the same order as input texts.
    """
    client = _get_client()
    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), _BATCH_SIZE):
        batch = texts[i : i + _BATCH_SIZE]
        delay = _RETRY_BASE_DELAY

        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                # Use the new SDK's async client
                response = await client.aio.models.embed_content(
                    model=settings.gemini_embedding_model,
                    contents=batch,
                    config=types.EmbedContentConfig(
                        task_type="RETRIEVAL_DOCUMENT",
                        output_dimensionality=settings.embedding_dimension
                    )
                )

                # Normalise response to list[list[float]]
                # response.embeddings is a list of Embeddings, each has a 'values' list
                batch_vectors = [e.values for e in response.embeddings]
                all_embeddings.extend(batch_vectors)
                break

            except Exception as exc:
                err_msg = str(exc).lower()
                is_rate_limit = any(
                    kw in err_msg for kw in ("resource_exhausted", "rate", "quota", "429")
                )
                if is_rate_limit and attempt < _MAX_RETRIES:
                    logger.warning(
                        "Rate limit hit (attempt %d/%d). Retrying in %.1fs…",
                        attempt, _MAX_RETRIES, delay,
                    )
                    await asyncio.sleep(delay)
                    delay *= 2
                else:
                    raise

    return all_embeddings
