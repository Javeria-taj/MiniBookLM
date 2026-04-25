"""
services/video_service.py — Orchestrates GoSquad video generation.
Non-blocking job submission, blocking status poll.
All GoSquad errors return status: "failed" — never propagate as 500.
"""
from __future__ import annotations

import logging

from backend.errors import LLMError, NotFoundError
from pipeline import gosquad, topic_extractor

logger = logging.getLogger(__name__)

# Map frontend audience_level → GoSquad gradeLevel
_GRADE_MAP: dict[str, str] = {
    "beginner": "Grade 5",
    "student":  "Grade 8",
    "expert":   "Grade 12",
}


async def generate_video(notebook_id: str, audience_level: str) -> dict:
    """
    Submit a video generation job to GoSquad.
    Returns immediately — does NOT wait for video completion.
    Raises NotFoundError if no insights exist for the notebook.
    """
    # extract_topic raises NotFoundError if notebook has no documents
    extracted = await topic_extractor.extract_topic(notebook_id)
    topic       = extracted["topic"]
    grade_level = _GRADE_MAP.get(audience_level, "Grade 8")

    job_id = await gosquad.submit_job(topic, grade_level)

    logger.info(
        "video_service: job submitted — notebook=%r topic=%r grade=%r job_id=%r",
        notebook_id, topic, grade_level, job_id,
    )

    return {
        "job_id": job_id,
        "topic":  topic,
        "status": "processing",
    }


async def get_video_status(job_id: str) -> dict:
    """
    Poll GoSquad until the job completes (or fails / times out).
    This call BLOCKS until a result is available (~2-3 minutes).
    Always returns a dict — never raises (errors → status: "failed").
    """
    try:
        iframe_url = await gosquad.poll_until_complete(job_id)
        return {
            "job_id":     job_id,
            "status":     "completed",
            "iframe_url": iframe_url,
        }
    except LLMError as exc:
        logger.error("video_service: job %r failed — %s", job_id, exc)
        return {
            "job_id":     job_id,
            "status":     "failed",
            "iframe_url": None,
        }
