import os
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Depends, Form
from sqlalchemy.orm import Session

from app.database.deps import get_db
from app.database.models import Message
from app.services.sst_service import transcribe_audio
from app.routes.chat import chat_text
from app.schemas.chat import ChatRequest
from app.schemas.voice import TranscribeResponse
from app.services.fluency_service import compute_fluency_score

router = APIRouter()

UPLOAD_DIR = "storage/audio"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _guess_extension(audio_file: UploadFile) -> str:
    original = (audio_file.filename or "").strip()
    suffix = Path(original).suffix.lower()
    if suffix:
        return suffix

    content_type = (audio_file.content_type or "").lower()
    content_type_map = {
        "audio/webm": ".webm",
        "audio/ogg": ".ogg",
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "audio/mp4": ".m4a",
        "audio/aac": ".aac",
    }

    return content_type_map.get(content_type, ".audio")

@router.post("")
def chat_voice(
    session_id: str,
    audio_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # save file audio
    extension = _guess_extension(audio_file)
    filename = f"{uuid.uuid4()}{extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as f:
        f.write(audio_file.file.read())

    # transcribe audio to text
    transcript = transcribe_audio(file_path)

    # enter the pipeline text
    payload = ChatRequest(
        session_id=session_id,
        user_input=transcript
    )

    return chat_text(payload, db)


@router.post("/transcribe", response_model=TranscribeResponse)
def transcribe_voice(
    audio_file: UploadFile = File(...),
    duration_ms: int | None = Form(None),
):
    # save file audio
    extension = _guess_extension(audio_file)
    filename = f"{uuid.uuid4()}{extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as f:
        f.write(audio_file.file.read())

    transcript = transcribe_audio(file_path)
    score = compute_fluency_score(transcript=transcript, duration_ms=duration_ms)

    return TranscribeResponse(
        transcript=transcript,
        fluency_score=score["fluency_score"],
        level=score["level"],
        word_count=score["word_count"],
        filler_count=score["filler_count"],
        wpm=score["wpm"],
        duration_ms=score["duration_ms"],
    )