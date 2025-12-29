from pydantic import BaseModel
from typing import List

class ChatRequest(BaseModel):
    session_id: str
    user_input: str

class ChatResponse(BaseModel):
    has_error: bool
    error_categories: List[str]
    explanation: str
    corrected_sentence: str
    chat_reply: str

    