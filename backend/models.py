"""
models.py — All Pydantic v2 request/response schemas.
Single source of truth for the API contract.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared primitives
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: Literal["user", "model"]
    content: str


# ---------------------------------------------------------------------------
# POST /ingest
# ---------------------------------------------------------------------------

class IngestResponse(BaseModel):
    doc_id: str
    chunk_count: int
    filename: str


# ---------------------------------------------------------------------------
# POST /chat
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    notebook_id: str
    query: str = Field(..., min_length=1)
    history: list[ChatMessage] = Field(default_factory=list)
    doc_id: str | None = None
    audience_level: Literal["beginner", "student", "expert"] = "student"


class Citation(BaseModel):
    source: str
    page: int
    chunk_index: int


class RetrievedChunk(BaseModel):
    text: str
    source: str
    page: int
    similarity_score: float
    used_in_answer: bool


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
    retrieved_chunks: list[RetrievedChunk]


# ---------------------------------------------------------------------------
# GET /notebook/{id}/insights
# ---------------------------------------------------------------------------

class InsightsResponse(BaseModel):
    summary: str
    key_topics: list[str]
    suggested_questions: list[str]


# ---------------------------------------------------------------------------
# DELETE /document/{doc_id}
# ---------------------------------------------------------------------------

class DeleteResponse(BaseModel):
    deleted: bool
    doc_id: str


# ---------------------------------------------------------------------------
# GET /notebook/{id}/documents
# ---------------------------------------------------------------------------

class DocumentInfo(BaseModel):
    doc_id: str
    filename: str
    chunk_count: int
    uploaded_at: str


class DocumentListResponse(BaseModel):
    documents: list[DocumentInfo]


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    qdrant: str


# ---------------------------------------------------------------------------
# GET /notebook/{id}/graph
# ---------------------------------------------------------------------------

class GraphNode(BaseModel):
    id: str
    label: str
    type: str


class GraphEdge(BaseModel):
    source: str
    target: str
    relationship: str


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    notebook_id: str


# ---------------------------------------------------------------------------
# GET /notebook/{id}/mindmap
# ---------------------------------------------------------------------------

class MindmapNode(BaseModel):
    id: str
    label: str
    children: list["MindmapNode"] = []

# Required for Pydantic v2 to resolve the self-referential type annotation.
MindmapNode.model_rebuild()


class MindmapResponse(BaseModel):
    root: MindmapNode
    notebook_id: str


# ---------------------------------------------------------------------------
# POST /notebook/{id}/video/generate
# GET  /notebook/{id}/video/status/{job_id}
# ---------------------------------------------------------------------------

class VideoGenerateRequest(BaseModel):
    audience_level: Literal["beginner", "student", "expert"] = "student"


class VideoGenerateResponse(BaseModel):
    job_id: str
    topic: str
    status: str  # always "processing" on initial response


class VideoStatusResponse(BaseModel):
    job_id: str
    status: str                  # "processing" | "completed" | "failed"
    iframe_url: str | None = None
