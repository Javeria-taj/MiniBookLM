"""
services/chat_service.py — Orchestrates retrieval + LLM for Q&A.
Parses citations from the answer to populate the explainability payload.
"""
from __future__ import annotations

import re
from typing import Any

from backend.errors import LLMError, RetrievalError
from backend.models import ChatRequest, ChatResponse, Citation, RetrievedChunk
from pipeline import llm, retriever

# Matches [Source: some_file.pdf, Page: 3]
_CITATION_RE = re.compile(r"\[Source:\s*(.+?),\s*Page:\s*(\d+)\]")


def _parse_citations(answer: str, chunks: list[dict[str, Any]]) -> list[Citation]:
    """Extract unique citations from the answer text and cross-reference with chunks."""
    seen: set[tuple[str, int]] = set()
    citations: list[Citation] = []

    for match in _CITATION_RE.finditer(answer):
        source = match.group(1).strip()
        page = int(match.group(2))
        key = (source, page)
        if key in seen:
            continue
        seen.add(key)

        # Find matching chunk_index
        chunk_index = next(
            (c["chunk_index"] for c in chunks if c["source"] == source and c["page"] == page),
            0,
        )
        citations.append(Citation(source=source, page=page, chunk_index=chunk_index))

    return citations


def _build_retrieved_chunks(
    chunks: list[dict[str, Any]],
    citations: list[Citation],
) -> list[RetrievedChunk]:
    cited_keys = {(c.source, c.page) for c in citations}
    return [
        RetrievedChunk(
            text=c["text"],
            source=c["source"],
            page=c["page"],
            similarity_score=round(c["score"], 4),
            used_in_answer=(c["source"], c["page"]) in cited_keys,
        )
        for c in chunks
    ]


async def chat(req: ChatRequest) -> ChatResponse:
    """
    Embed the query, retrieve top-5 chunks, call Gemini, return a
    fully-populated ChatResponse including RAG explainability metadata.
    """
    # Retrieve relevant chunks
    try:
        chunks = await retriever.retrieve(
            query=req.query,
            notebook_id=req.notebook_id,
            doc_id=req.doc_id,
        )
    except Exception as exc:
        raise RetrievalError(f"Retrieval failed: {exc}") from exc

    history = [m.model_dump() for m in req.history]

    # Generate answer
    try:
        answer = await llm.answer_question(req.query, chunks, history, req.audience_level)
    except Exception as exc:
        raise LLMError(f"LLM call failed: {exc}") from exc

    # Parse citations + build explainability payload
    citations = _parse_citations(answer, chunks)
    retrieved_chunks = _build_retrieved_chunks(chunks, citations)

    return ChatResponse(
        answer=answer,
        citations=citations,
        retrieved_chunks=retrieved_chunks,
    )
