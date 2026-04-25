"""
errors.py — typed exception hierarchy + global FastAPI exception handler.
All pipeline errors bubble up as one of these types.
The global handler ensures raw Python tracebacks never reach the client.
"""
from fastapi import Request
from fastapi.responses import JSONResponse


# ---------------------------------------------------------------------------
# Typed exception classes
# ---------------------------------------------------------------------------

class AppError(Exception):
    """Base class for all application errors."""
    def __init__(self, message: str, code: str = "INTERNAL_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class IngestError(AppError):
    """Raised when PDF parsing, chunking, embedding, or Qdrant upsert fails."""
    def __init__(self, message: str):
        super().__init__(message, code="INGEST_ERROR")


class RetrievalError(AppError):
    """Raised when Qdrant search or query embedding fails."""
    def __init__(self, message: str):
        super().__init__(message, code="RETRIEVAL_ERROR")


class LLMError(AppError):
    """Raised when the Gemini API call fails."""
    def __init__(self, message: str):
        super().__init__(message, code="LLM_ERROR")


class NotFoundError(AppError):
    """Raised when a notebook or document does not exist."""
    def __init__(self, message: str):
        super().__init__(message, code="NOT_FOUND")


class UnsupportedFileError(AppError):
    """Raised when a non-PDF file is uploaded."""
    def __init__(self, message: str):
        super().__init__(message, code="UNSUPPORTED_FILE")


# ---------------------------------------------------------------------------
# HTTP status mapping
# ---------------------------------------------------------------------------

_STATUS_MAP: dict[type, int] = {
    UnsupportedFileError: 422,
    NotFoundError: 404,
    IngestError: 500,
    RetrievalError: 500,
    LLMError: 500,
    AppError: 500,
}


def _http_status(exc: Exception) -> int:
    for cls, status in _STATUS_MAP.items():
        if isinstance(exc, cls):
            return status
    return 500


# ---------------------------------------------------------------------------
# Global exception handler — register this in main.py
# ---------------------------------------------------------------------------

async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if isinstance(exc, AppError):
        return JSONResponse(
            status_code=_http_status(exc),
            content={"error": {"code": exc.code, "message": exc.message}},
        )

    # Unexpected Python exception — never expose the traceback
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred."}},
    )
