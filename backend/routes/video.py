"""
routes/video.py — Video generation endpoints.
POST /notebook/{id}/video/generate  → non-blocking, returns job_id immediately
GET  /notebook/{id}/video/status/{job_id} → blocking poll, returns iframe_url
"""
from __future__ import annotations

from fastapi import APIRouter

from backend.models import VideoGenerateRequest, VideoGenerateResponse, VideoStatusResponse
from backend.services import video_service

router = APIRouter(tags=["video"])


@router.post(
    "/notebook/{notebook_id}/video/generate",
    response_model=VideoGenerateResponse,
)
async def generate_video(
    notebook_id: str,
    body: VideoGenerateRequest,
) -> VideoGenerateResponse:
    """
    Submit a video generation job.
    Returns immediately (< 2 seconds) with a job_id to poll.
    Raises 404 if the notebook has no ingested documents yet.
    """
    result = await video_service.generate_video(notebook_id, body.audience_level)
    return VideoGenerateResponse(**result)


@router.get(
    "/notebook/{notebook_id}/video/status/{job_id}",
    response_model=VideoStatusResponse,
)
async def get_video_status(
    notebook_id: str,  # kept for URL consistency / future auth scoping
    job_id: str,
) -> VideoStatusResponse:
    """
    Poll GoSquad until the video is ready (~2-3 minutes).
    This endpoint BLOCKS — call it once with a long client timeout.
    Returns iframe_url on success, status: "failed" on error.
    """
    result = await video_service.get_video_status(job_id)
    return VideoStatusResponse(**result)
