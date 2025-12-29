import os
import uuid
from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session

from app.database.deps import get_db
from app.database.models import Message
from app.services.sst_service import transcribe_audio
from app.routes.chat import chat_text
from app.schemas.chat import ChatRequest

router = APIRouter()

UPLOAD_DIR = "storage/audio"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/voice")
def chat_voice(
    session_id: str,
    audio_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # save file audio
    filename = f"{uuid.uuid4()}.wav"
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