"""
routes/ingest.py — POST /ingest
Parses multipart form data, delegates to ingest_service. No logic here.
"""
from fastapi import APIRouter, Form, UploadFile

from backend.models import IngestResponse
from backend.services import ingest_service

router = APIRouter(tags=["ingest"])


@router.post("/ingest", response_model=IngestResponse)
async def ingest(
    file: UploadFile,
    notebook_id: str = Form(...),
) -> IngestResponse:
    return await ingest_service.ingest_document(file, notebook_id)
