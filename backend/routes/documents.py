"""
routes/documents.py — DELETE /document/{doc_id}
                      GET    /notebook/{notebook_id}/documents
No logic here — delegates to inline service calls via qdrant helpers.
"""
from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter

from backend.config import settings
from backend.errors import NotFoundError
from backend.models import DeleteResponse, DocumentInfo, DocumentListResponse
from backend.services import insights_service
from pipeline import qdrant_client

router = APIRouter(tags=["documents"])


@router.delete("/document/{doc_id}", response_model=DeleteResponse)
async def delete_document(doc_id: str) -> DeleteResponse:
    """Delete all Qdrant points for a given doc_id."""
    await qdrant_client.delete_by_doc_id(
        collection_name=settings.qdrant_collection_name,
        doc_id=doc_id,
    )
    # Invalidate insights cache for any notebook this doc belonged to
    # (we can't know which notebook cheaply, so we rely on lazy re-generation)
    return DeleteResponse(deleted=True, doc_id=doc_id)


@router.get("/notebook/{notebook_id}/documents", response_model=DocumentListResponse)
async def list_documents(notebook_id: str) -> DocumentListResponse:
    """
    List all documents ingested for a notebook by aggregating Qdrant payloads.
    Each unique doc_id becomes one DocumentInfo entry.
    """
    payloads = await qdrant_client.scroll_by_notebook(
        collection_name=settings.qdrant_collection_name,
        notebook_id=notebook_id,
    )

    if not payloads:
        raise NotFoundError(f"No documents found for notebook '{notebook_id}'.")

    # Aggregate by doc_id
    doc_map: dict[str, dict] = {}
    chunk_count: dict[str, int] = defaultdict(int)

    for p in payloads:
        doc_id = p.get("doc_id", "")
        if not doc_id:
            continue
        if doc_id not in doc_map:
            doc_map[doc_id] = {
                "doc_id": doc_id,
                "filename": p.get("source_filename", "unknown"),
                "uploaded_at": p.get("uploaded_at", ""),
            }
        chunk_count[doc_id] += 1

    documents = [
        DocumentInfo(
            doc_id=info["doc_id"],
            filename=info["filename"],
            chunk_count=chunk_count[info["doc_id"]],
            uploaded_at=info["uploaded_at"],
        )
        for info in doc_map.values()
    ]

    return DocumentListResponse(documents=documents)
