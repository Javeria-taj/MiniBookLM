"""
routes/graph.py — GET /notebook/{notebook_id}/graph
Delegates to graph_service. No logic here.
"""
from fastapi import APIRouter

from backend.models import GraphResponse
from backend.services import graph_service

router = APIRouter(tags=["graph"])


@router.get("/notebook/{notebook_id}/graph", response_model=GraphResponse)
async def get_graph(notebook_id: str) -> GraphResponse:
    """Extract and return a knowledge graph for all documents in the notebook."""
    return await graph_service.get_graph(notebook_id)
