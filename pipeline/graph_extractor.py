"""
pipeline/graph_extractor.py — Knowledge graph extraction via Gemini.
Pure async functions. No FastAPI imports.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

from google import genai

from backend.config import settings

logger = logging.getLogger(__name__)

_MAX_CHUNKS = 15

_SYSTEM_INSTRUCTION = (
    "You are a knowledge graph extraction engine. "
    "Analyse the provided text and extract a knowledge graph. "
    "Return ONLY valid JSON, no markdown, no preamble."
)

_USER_TEMPLATE = """From the following document chunks, extract all key entities \
(people, concepts, organisations, events, terms) and the relationships between them.

Return this exact JSON structure:
{{
  "nodes": [
    {{ "id": "<slug>", "label": "<display name>", "type": "concept" | "person" | "organisation" | "event" | "term" }}
  ],
  "edges": [
    {{ "source": "<node-id>", "target": "<node-id>", "relationship": "<short verb phrase>" }}
  ]
}}

Rules:
- node id must be a slug (lowercase, hyphens, no spaces)
- minimum 8 nodes, maximum 30 nodes
- every edge source and target must reference an existing node id
- relationship must be a short verb phrase e.g. "defines", "belongs to", "causes", "is part of"
- return ONLY the JSON object, nothing else

=== DOCUMENT CHUNKS ===
{context}"""

_FALLBACK_GRAPH: dict[str, Any] = {"nodes": [], "edges": []}

# ---------------------------------------------------------------------------
# Client singleton
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

async def extract_graph(chunks: list[str]) -> dict[str, Any]:
    """
    Send up to _MAX_CHUNKS text excerpts to Gemini and return a knowledge
    graph as { nodes: [...], edges: [...] }.

    Falls back to { nodes: [], edges: [] } if the LLM response cannot be parsed.
    """
    client = _get_client()

    context = "\n\n---\n\n".join(chunks[:_MAX_CHUNKS])
    user_prompt = _USER_TEMPLATE.format(context=context)

    try:
        response = await client.aio.models.generate_content(
            model=settings.gemini_llm_model,
            contents=user_prompt,
            config={
                "system_instruction": _SYSTEM_INSTRUCTION,
            },
        )
        raw = response.text.strip()
    except Exception as exc:
        logger.error("graph_extractor: Gemini call failed: %s", exc)
        return _FALLBACK_GRAPH

    # Attempt 1 — direct parse
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Attempt 2 — extract outermost JSON object from response
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    logger.warning("graph_extractor: could not parse JSON from LLM response. Returning fallback.")
    return _FALLBACK_GRAPH
