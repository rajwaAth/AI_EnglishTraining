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


def _find_frontend_dir() -> str | None:
    """Find frontend directory across common layouts.

    Local repo layout: <root>/backend/app/main.py and <root>/frontend
    Docker (backend-only build context): /app/app/main.py (no /app/frontend)
    """
    candidates: list[str] = []

    # Local repo: BASE_DIR=.../backend/app => up two levels is repo root
    candidates.append(os.path.abspath(os.path.join(BASE_DIR, "..", "..", "frontend")))

    # Container with backend as workdir: BASE_DIR=/app/app => up one level is /app
    candidates.append(os.path.abspath(os.path.join(BASE_DIR, "..", "frontend")))

    for path in candidates:
        if os.path.isdir(path) and os.path.isfile(os.path.join(path, "index.html")):
            return path
    return None


FRONTEND_DIR = _find_frontend_dir()

if FRONTEND_DIR:
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    def serve_frontend():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
else:
    @app.get("/")
    def serve_api_only():
        return {
            "status": "ok",
            "frontend": False,
            "message": "Frontend not bundled in this deployment. Serve frontend separately or include it in the image build context.",
        }