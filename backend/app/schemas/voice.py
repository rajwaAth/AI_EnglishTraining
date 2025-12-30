from pydantic import BaseModel
from typing import Optional


class TranscribeResponse(BaseModel):
    transcript: str
    fluency_score: Optional[int] = None
    level: Optional[str] = None
    word_count: Optional[int] = None
    filler_count: Optional[int] = None
    wpm: Optional[float] = None
    duration_ms: Optional[int] = None
