from fastapi import FastAPI

from app.routes.chat import router as chat_router
from app.database import models
from app.database.db import engine
from app.routes.voice import router as voice_router

app = FastAPI(
    title="AI English Grammar Chatbot",
    description="Chatbot for grammar correction and conversation",
    version="1.0.0"
)

models.Base.metadata.create_all(bind=engine)

app.include_router(chat_router, prefix="/chat", tags=["chat"])
app.include_router(voice_router, prefix="/voice", tags=["voice"])

@app.get("/")
def root():
    return {"message": "Welcome to the AI English Grammar Chatbot API"}