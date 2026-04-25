"""
pipeline/llm.py — Gemini generative calls for Q&A and document insights.
Migrated to google-genai SDK.
Pure async functions. No FastAPI imports.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any

from google import genai
from google.genai import types

from backend.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Internal — Client singleton
# ---------------------------------------------------------------------------

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def answer_question(
    query: str,
    chunks: list[dict[str, Any]],
    history: list[dict[str, str]],
    audience_level: str = "student",
) -> str:
    """
    Build a RAG prompt from the retrieved chunks + conversation history
    and ask Gemini to produce a cited answer, tuned to the audience level.
    """
    client = _get_client()

    # Build context block
    context_parts = [
        f"[Source: {c['source']}, Page: {c['page']}]\n{c['text']}"
        for c in chunks
    ]
    context = "\n\n---\n\n".join(context_parts)

    # Build conversation history block (last 6 turns max)
    history_block = ""
    if history:
        turns = []
        for msg in history[-6:]:
            role = "User" if msg.get("role") == "user" else "Assistant"
            turns.append(f"{role}: {msg.get('content', '')}")
        history_block = "\n".join(turns)

    # Audience-level tuning instructions
    _AUDIENCE_INSTRUCTIONS: dict[str, str] = {
        "beginner": (
            "Explain your answer simply, avoid jargon, use analogies and plain language "
            "as if explaining to someone with no background in this topic."
        ),
        "student": (
            "Explain your answer clearly with some technical depth. Assume the reader has "
            "basic familiarity with the topic but is still learning."
        ),
        "expert": (
            "Answer with full technical precision. Use domain terminology, skip basic "
            "explanations, and prioritise depth and accuracy over simplicity."
        ),
    }
    audience_instruction = _AUDIENCE_INSTRUCTIONS.get(audience_level, _AUDIENCE_INSTRUCTIONS["student"])

    prompt = f"""You are a precise document Q&A assistant.
Answer ONLY using the context provided below — do not use outside knowledge.
For every factual claim, cite the source inline using exactly this format: [Source: filename, Page: N]
If the context does not contain enough information, say so clearly.

=== AUDIENCE LEVEL ===
{audience_instruction}

=== CONTEXT ===
{context}

{"=== CONVERSATION HISTORY ===" + chr(10) + history_block if history_block else ""}

=== QUESTION ===
{query}

=== ANSWER ==="""

    response = await client.aio.models.generate_content(
        model=settings.gemini_llm_model,
        contents=prompt
    )
    return response.text.strip()


async def generate_insights(chunks: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Generate a summary, key topics, and suggested questions from document chunks.
    Migrated to google-genai SDK.
    """
    client = _get_client()
    context = "\n\n".join(c["text"] for c in chunks)

    prompt = f"""Analyze the following document excerpts.
Return ONLY a valid JSON object — no markdown fences, no preamble, no explanation.

Required JSON structure:
{{
  "summary": "A concise 2-3 sentence overview of the main content",
  "key_topics": ["topic1", "topic2", "topic3"],
  "suggested_questions": ["question1", "question2", "question3"]
}}

=== DOCUMENT EXCERPTS ===
{context}"""

    response = await client.aio.models.generate_content(
        model=settings.gemini_llm_model,
        contents=prompt
    )
    raw = response.text.strip()

    # Attempt 1 — direct parse
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Attempt 2 — extract JSON object from the response
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    logger.warning("generate_insights: could not parse JSON from LLM response. Returning fallback.")
    return {
        "summary": "Could not generate a summary for this document.",
        "key_topics": [],
        "suggested_questions": [],
    }
