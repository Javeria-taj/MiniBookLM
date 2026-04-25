MODE: Plan

## Mission
Build the complete backend and RAG pipeline for a NotebookLM clone — a document intelligence platform where users upload PDFs, which are chunked, embedded, and stored in Qdrant, then queried via a chat API that returns cited answers and full chunk-level explainability metadata.

## Stack
- Language: Python 3.11
- Framework: FastAPI with async throughout — every handler and service is async def
- PDF parsing: PyMuPDF (fitz)
- Embeddings: Google Gemini API — model: gemini-embedding-exp
- LLM: Google Gemini API — model: gemini-3.1-pro-preview
- Vector DB: Qdrant Cloud (Python SDK: qdrant-client)
- Config: pydantic-settings — validate all env vars at startup, crash fast if missing
- Deploy: Render (single web service running both backend + pipeline)

## Folder Structure

backend/
├── main.py              ← FastAPI app: CORS, routers, startup/shutdown
├── config.py            ← pydantic-settings: env validation at boot
├── models.py            ← Pydantic v2 request/response schemas
├── errors.py            ← Typed error classes + global exception handler
├── routes/
│   ├── ingest.py        ← POST /ingest
│   ├── chat.py          ← POST /chat
│   ├── insights.py      ← GET /notebook/{id}/insights
│   └── documents.py     ← DELETE /document/{doc_id}, GET /notebook/{id}/documents
├── services/
│   ├── ingest_service.py   ← orchestrates pipeline calls on upload
│   ├── chat_service.py     ← orchestrates retrieval + LLM for Q&A
│   └── insights_service.py ← orchestrates summary + topics + questions
├── requirements.txt
└── render.yaml

pipeline/
├── __init__.py
├── ingest.py      ← top-level: parse → chunk → embed → upsert
├── chunker.py     ← custom recursive text splitter
├── embedder.py    ← gemini-embedding-exp calls
├── retriever.py   ← query embedding + Qdrant similarity search
├── llm.py         ← gemini-3.1-pro-preview: answer + summarise prompts
└── qdrant_client.py ← Qdrant init, upsert, search, delete helpers


## Architecture Rules — Enforce These Without Exception
1. Routes do ONE thing: parse input, call service, return response. No logic.
2. Services contain all business logic. They call pipeline modules, not Qdrant directly.
3. Pipeline modules are pure functions — no FastAPI imports, no HTTP concerns.
4. All env vars live in config.py only. No os.getenv() calls elsewhere.
5. Every async function uses await — no blocking I/O anywhere.
6. All errors bubble up as typed exceptions caught by the global handler.
7. Never return a stack trace to the client.

## API Endpoints — Full Spec

POST /ingest
- Input: multipart/form-data — file (PDF), notebook_id (str)
- Flow: extract text → chunk → embed each chunk → upsert to Qdrant with metadata
- Qdrant payload per chunk: { text, doc_id, notebook_id, page_number, chunk_index, source_filename }
- Response: { doc_id: str, chunk_count: int, filename: str }
- Error cases: unsupported file type (422), Qdrant upsert failure (500)

POST /chat
- Input: { notebook_id: str, query: str, history: [ {role, content} ], doc_id?: str }
- Flow: embed query → Qdrant search (filter by notebook_id, optionally doc_id) → build prompt with top 5 chunks → Gemini call → return
- Response:

{
  "answer": "...",
  "citations": [{ "source": str, "page": int, "chunk_index": int }],
  "retrieved_chunks": [
    {
      "text": str,
      "source": str,
      "page": int,
      "similarity_score": float,
      "used_in_answer": bool
    }
  ]
}

- retrieved_chunks is the RAG Explainability feature — always return all 5 retrieved chunks with scores

GET /notebook/{notebook_id}/insights
- Flow: fetch up to 10 representative chunks from Qdrant for this notebook → single Gemini call with structured prompt
- Response: { summary: str, key_topics: [str], suggested_questions: [str] }
- This endpoint is called once after ingest, not on every request

DELETE /document/{doc_id}
- Flow: delete all Qdrant points where payload.doc_id == doc_id
- Response: { deleted: true, doc_id: str }

GET /health
- Check Qdrant connectivity + return service status
- Response: { status: "ok", qdrant: "connected" }

## Pipeline Module Specs

chunker.py — write this from scratch, do NOT use LangChain or LlamaIndex
- Recursive splitter: try splitting on "\n\n", then "\n", then " ", then characters
- Target chunk size: 500 tokens (approximate with len(text.split()))
- Overlap: 50 tokens — carry last 50 tokens of previous chunk into next
- Return: List[{ text: str, chunk_index: int, page_number: int }]

embedder.py
- Model: gemini-embedding-exp via google-generativeai SDK
- Function: embed_texts(texts: List[str]) → List[List[float]]
- Batch calls where possible — do not call one chunk at a time in a loop
- Handle rate limit errors with exponential backoff (max 3 retries)

retriever.py
- embed the query → search Qdrant with filter on notebook_id
- Return top 5 results with: text, score, source, page, chunk_index
- Score threshold: 0.5 minimum — discard irrelevant results below this

llm.py
- Model: gemini-3.1-pro-preview via google-generativeai SDK
- answer_question(query, chunks, history) → builds a prompt with chunks as context, asks model to cite sources inline, returns answer string
- generate_insights(chunks) → single call returning JSON with summary, key_topics[], suggested_questions[]
  - Prompt must instruct model to return ONLY valid JSON, no markdown, no preamble
  - Parse safely with try/except, return fallback if parse fails

## Config — pydantic-settings

class Settings(BaseSettings):
    gemini_api_key: str
    qdrant_url: str
    qdrant_api_key: str
    qdrant_collection_name: str = "notebooklm_chunks"
    environment: str = "development"

    model_config = SettingsConfigDict(env_file=".env")

App crashes at startup if gemini_api_key, qdrant_url, or qdrant_api_key are missing.

## CORS — Add to main.py on line 1 of setup

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


## Error Handling
- Define: IngestError, RetrievalError, LLMError, NotFoundError in errors.py
- Global @app.exception_handler catches all, returns: { "error": { "code": str, "message": str } }
- HTTP 422 for validation, 404 for not found, 500 for pipeline failures
- Never let a raw Python exception reach the response

## Render Deploy Config — render.yaml

services:
  - type: web
    name: notebooklm-backend
    runtime: python
    buildCommand: pip install -r backend/requirements.txt
    startCommand: uvicorn backend.main:app --host 0.0.0.0 --port 8000
    envVars:
      - key: GEMINI_API_KEY
        sync: false
      - key: QDRANT_URL
        sync: false
      - key: QDRANT_API_KEY
        sync: false
      - key: QDRANT_COLLECTION_NAME
        value: notebooklm_chunks


## requirements.txt — Include All Of These

fastapi
uvicorn[standard]
python-multipart
pydantic-settings
pydantic>=2.0
pymupdf
qdrant-client
google-generativeai
python-dotenv


## .env.example — Ship This

GEMINI_API_KEY=
QDRANT_URL=
QDRANT_API_KEY=
QDRANT_COLLECTION_NAME=notebooklm_chunks
ENVIRONMENT=development


## Build Order — Execute in This Sequence
1. Folder structure + requirements.txt + .env.example
2. config.py — settings with startup validation
3. errors.py — typed error classes + exception handler
4. pipeline/qdrant_client.py — init collection, upsert, search, delete
5. pipeline/chunker.py — recursive splitter, written from scratch
6. pipeline/embedder.py — gemini embedding with batching + retry
7. pipeline/retriever.py — query embed + Qdrant search
8. pipeline/llm.py — answer + insights prompts
9. pipeline/ingest.py — orchestrates 5→6→4
10. backend/models.py — all Pydantic schemas
11. backend/services/ — all three services
12. backend/routes/ — all four route files
13. backend/main.py — wire everything, CORS, startup/shutdown
14. render.yaml

## VERIFY
- [ ] GET /health returns 200 with qdrant: connected
- [ ] POST /ingest with a real PDF returns doc_id and chunk_count > 0
- [ ] POST /chat returns answer + retrieved_chunks array with similarity_score on each
- [ ] GET /notebook/{id}/insights returns valid JSON with all three fields
- [ ] App crashes at startup if GEMINI_API_KEY is missing from env
- [ ] No route handler contains business logic — all logic is in services/
- [ ] chunker.py has zero LangChain/LlamaIndex imports
