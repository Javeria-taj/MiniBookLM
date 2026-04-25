"""
pipeline/topic_extractor.py — Extracts a topic from cached notebook insights.
Reuses the insights_service cache — never triggers a new Gemini call.
"""
from __future__ import annotations

import logging

from backend.services import insights_service

logger = logging.getLogger(__name__)


async def extract_topic(notebook_id: str) -> dict[str, str]:
    """
    Return { topic, grade_level } by reading the already-cached insights
    for this notebook. Raises NotFoundError (from insights_service) if no
    documents have been ingested yet.

    grade_level is always "Grade 8" here — the caller maps audience_level
    to the correct grade before this function is needed.
    """
    insights = await insights_service.get_insights(notebook_id)

    if insights.key_topics:
        topic = insights.key_topics[0]
    elif insights.summary:
        words = insights.summary.split()
        topic = " ".join(words[:5])
    else:
        topic = "Document Overview"

    logger.info("topic_extractor: topic=%r for notebook '%s'", topic, notebook_id)
    return {"topic": topic, "grade_level": "Grade 8"}
