from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from backend.services.advisor_service import process_advisor_turn

router = APIRouter(prefix="/api/advisor", tags=["Advisor"])

class ChatMessage(BaseModel):
    role: str
    content: str

class AdvisorChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    slots: Optional[Dict[str, Any]] = {}

@router.post("/chat")
def advisor_chat(req: AdvisorChatRequest):
    history_dicts = [{'role': m.role, 'content': m.content} for m in req.history or []]
    res = process_advisor_turn(
        message=req.message,
        history=history_dicts,
        slots=req.slots or {}
    )
    return res
