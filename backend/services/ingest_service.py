"""
services/ingest_service.py — Orchestrates document ingest.
Validates input, calls the pipeline, returns typed response.
"""
from __future__ import annotations

from fastapi import UploadFile

from backend.errors import IngestError, UnsupportedFileError
from backend.models import IngestResponse
from pipeline import ingest as ingest_pipeline

_ALLOWED_CONTENT_TYPES = {"application/pdf", "application/octet-stream"}
_ALLOWED_EXTENSIONS = {".pdf"}


async def ingest_document(file: UploadFile, notebook_id: str) -> IngestResponse:
    """
    Validate the uploaded file, run the ingest pipeline, return IngestResponse.
    Raises UnsupportedFileError for non-PDFs, IngestError for pipeline failures.
    """
    # Validate file type
    filename = file.filename or "upload.pdf"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    content_type = file.content_type or ""
    if ext not in _ALLOWED_EXTENSIONS and content_type not in _ALLOWED_CONTENT_TYPES:
        raise UnsupportedFileError(
            f"Unsupported file type '{content_type}'. Only PDF files are accepted."
        )

    try:
        file_bytes = await file.read()
        doc_id, chunk_count = await ingest_pipeline.run(file_bytes, notebook_id, filename)
    except UnsupportedFileError:
        raise
    except Exception as exc:
        raise IngestError(f"Ingest pipeline failed: {exc}") from exc

    return IngestResponse(doc_id=doc_id, chunk_count=chunk_count, filename=filename)
