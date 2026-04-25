"""
routes/quiz.py — GET /notebook/{notebook_id}/quiz
Delegates to quiz_service.
"""
from fastapi import APIRouter

from backend.models import QuizResponse
from backend.services import quiz_service

router = APIRouter(tags=["quiz"])


@router.get("/notebook/{notebook_id}/quiz", response_model=QuizResponse)
async def get_quiz(notebook_id: str) -> QuizResponse:
    return await quiz_service.get_quiz(notebook_id)
