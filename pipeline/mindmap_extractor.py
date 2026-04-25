"""
pipeline/mindmap_extractor.py — Hierarchical mindmap extraction via Gemini.
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
_MAX_DEPTH = 3
_MAX_CHILDREN = 6

_SYSTEM_INSTRUCTION = (
    "You are a mindmap extraction engine. "
    "Analyse the provided text and extract a hierarchical mindmap. "
    "Return ONLY valid JSON, no markdown, no preamble."
)

_USER_TEMPLATE = """From the following document chunks, extract a hierarchical mindmap.

Return this exact JSON structure:
{{
  "root": {{
    "id": "<slug>",
    "label": "<central topic — max 5 words>",
    "children": [
      {{
        "id": "<slug>",
        "label": "<subtopic — max 5 words>",
        "children": [
          {{
            "id": "<slug>",
            "label": "<detail — max 5 words>",
            "children": []
          }}
        ]
      }}
    ]
  }}
}}

Rules:
- root label must be the central topic of the document
- maximum 3 levels of depth (root → branches → leaves)
- maximum 6 children per node
- id must be a slug (lowercase, hyphens, no spaces)
- labels must be concise — maximum 5 words each
- return ONLY the JSON object, nothing else

=== DOCUMENT CHUNKS ===
{context}"""

_FALLBACK: dict[str, Any] = {
    "root": {"id": "root", "label": "Document", "children": []}
}

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
# Internal — sanitise tree to enforce depth and children limits
# ---------------------------------------------------------------------------

def _sanitise_node(node: dict[str, Any], depth: int = 0) -> dict[str, Any]:
    """
    Recursively enforce:
    - max _MAX_DEPTH levels (children at depth == _MAX_DEPTH - 1 become leaves)
    - max _MAX_CHILDREN per node
    - id and label presence (fallback to slugified label if id is missing)
    """
    label = str(node.get("label", "Node"))
    node_id = node.get("id") or re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")

    children: list[dict[str, Any]] = []
    if depth < _MAX_DEPTH - 1:
        raw_children = node.get("children", []) or []
        for child in raw_children[:_MAX_CHILDREN]:
            if isinstance(child, dict):
                children.append(_sanitise_node(child, depth + 1))

    return {"id": node_id, "label": label, "children": children}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def extract_mindmap(chunks: list[str]) -> dict[str, Any]:
    """
    Send up to _MAX_CHUNKS text excerpts to Gemini and return a mindmap tree
    as { root: { id, label, children: [...] } }.

    Falls back to { root: { id: 'root', label: 'Document', children: [] } }
    if the LLM response cannot be parsed.
    """
    client = _get_client()
    context = "\n\n---\n\n".join(chunks[:_MAX_CHUNKS])
    user_prompt = _USER_TEMPLATE.format(context=context)

    try:
        response = await client.aio.models.generate_content(
            model=settings.gemini_llm_model,
            contents=user_prompt,
            config={"system_instruction": _SYSTEM_INSTRUCTION},
        )
        raw = response.text.strip()
    except Exception as exc:
        logger.error("mindmap_extractor: Gemini call failed: %s", exc)
        return _FALLBACK

    # Attempt 1 — direct parse
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Attempt 2 — extract outermost JSON object
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group())
            except json.JSONDecodeError:
                logger.warning("mindmap_extractor: could not parse JSON. Returning fallback.")
                return _FALLBACK
        else:
            logger.warning("mindmap_extractor: no JSON found in response. Returning fallback.")
            return _FALLBACK

    # Sanitise structure — enforce depth, children limits, slug ids
    root_raw = data.get("root")
    if not isinstance(root_raw, dict):
        logger.warning("mindmap_extractor: missing 'root' key. Returning fallback.")
        return _FALLBACK

    return {"root": _sanitise_node(root_raw, depth=0)}
