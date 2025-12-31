import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.routes.chat import router as chat_router
from app.database import models
from app.database.db import engine
from app.routes.voice import router as voice_router

app = FastAPI(
    title="AI English Grammar Chatbot",
    description="Chatbot for grammar correction and conversation",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

app.include_router(chat_router, prefix="/chat", tags=["chat"])
app.include_router(voice_router, prefix="/voice", tags=["voice"])

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

app.mount(
    "/static", 
    StaticFiles(directory=FRONTEND_DIR), 
    name="static")

# serve main page
@app.get("/")
def serve_frontend():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))