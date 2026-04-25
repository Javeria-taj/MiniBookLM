"""
routes/chat.py — POST /chat
Parses JSON body, delegates to chat_service. No logic here.
"""
from fastapi import APIRouter

from backend.models import ChatRequest, ChatResponse
from backend.services import chat_service

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    return await chat_service.chat(req)
