"""
pipeline/ingest.py — Top-level ingest orchestrator.
Flow: parse PDF → chunk → embed → upsert to Qdrant.
Pure async functions. No FastAPI imports.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

import fitz  # PyMuPDF

from backend.config import settings
from pipeline import chunker, embedder, qdrant_client


# ---------------------------------------------------------------------------
# PDF parsing
# ---------------------------------------------------------------------------

def parse_pdf(file_bytes: bytes) -> list[dict[str, Any]]:
    """
    Extract text from each page of a PDF using PyMuPDF.

    Returns:
        [{ "text": str, "page_number": int }, ...]   (1-indexed pages)
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = []
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text("text").strip()
        if text:
            pages.append({"text": text, "page_number": page_num + 1})
    doc.close()
    return pages


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def run(
    file_bytes: bytes,
    notebook_id: str,
    filename: str,
) -> tuple[str, int]:
    """
    Full ingest pipeline for a single PDF document.

    Steps:
        1. Parse PDF page-by-page (PyMuPDF)
        2. Chunk pages with overlap (chunker.py)
        3. Embed all chunks in batches (embedder.py)
        4. Upsert to Qdrant with full metadata (qdrant_client.py)

    Returns:
        (doc_id, chunk_count)
    """
    doc_id = str(uuid.uuid4())
    uploaded_at = datetime.now(timezone.utc).isoformat()

    # Step 1 — parse
    pages = parse_pdf(file_bytes)

    # Step 2 — chunk
    chunks = chunker.chunk_pages(pages)

    if not chunks:
        return doc_id, 0

    # Step 3 — embed (batch call)
    texts = [c["text"] for c in chunks]
    embeddings = await embedder.embed_texts(texts)

    # Step 4 — build payloads and upsert
    payloads = [
        {
            "text": chunk["text"],
            "doc_id": doc_id,
            "notebook_id": notebook_id,
            "page_number": chunk["page_number"],
            "chunk_index": chunk["chunk_index"],
            "source_filename": filename,
            "uploaded_at": uploaded_at,
        }
        for chunk in chunks
    ]

    await qdrant_client.upsert_chunks(
        collection_name=settings.qdrant_collection_name,
        chunks=payloads,
        embeddings=embeddings,
    )

    return doc_id, len(chunks)
