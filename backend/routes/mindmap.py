"""
routes/mindmap.py — GET /notebook/{notebook_id}/mindmap
Delegates to mindmap_service. No logic here.
"""
from fastapi import APIRouter

from backend.models import MindmapResponse
from backend.services import mindmap_service

router = APIRouter(tags=["mindmap"])


@router.get("/notebook/{notebook_id}/mindmap", response_model=MindmapResponse)
async def get_mindmap(notebook_id: str) -> MindmapResponse:
    """Extract and return a hierarchical mindmap for all documents in the notebook."""
    return await mindmap_service.get_mindmap(notebook_id)
