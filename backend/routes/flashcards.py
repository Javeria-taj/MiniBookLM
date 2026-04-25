"""
routes/flashcards.py — GET /notebook/{notebook_id}/flashcards
Delegates to flashcard_service.
"""
from fastapi import APIRouter

from backend.models import FlashcardResponse
from backend.services import flashcard_service

router = APIRouter(tags=["flashcards"])


@router.get("/notebook/{notebook_id}/flashcards", response_model=FlashcardResponse)
async def get_flashcards(notebook_id: str) -> FlashcardResponse:
    return await flashcard_service.get_flashcards(notebook_id)
