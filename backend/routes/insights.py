"""
routes/insights.py — GET /notebook/{notebook_id}/insights
Delegates to insights_service. No logic here.
"""
from fastapi import APIRouter

from backend.models import InsightsResponse
from backend.services import insights_service

router = APIRouter(tags=["insights"])


@router.get("/notebook/{notebook_id}/insights", response_model=InsightsResponse)
async def get_insights(notebook_id: str) -> InsightsResponse:
    return await insights_service.get_insights(notebook_id)
