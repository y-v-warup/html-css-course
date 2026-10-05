"""LabelGuard AI — FastAPI backend.

    GET  /          → the built frontend application
    GET  /health    → server health (incl. whether the AI key is configured)
    POST /analyze   → extraction + deterministic rule engine → result

The OpenAI key stays server-side (OPENAI_API_KEY environment variable) and is
never sent to the browser. Run from the backend directory:

    uvicorn server:app --reload
"""

from __future__ import annotations

import os
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DIST_DIR = PROJECT_ROOT / "frontend" / "dist"
VERSION = "1.0.0"

# Local env files fill gaps only — values already injected into the process
# environment (e.g. by the platform) always win, and .env.local beats .env.
try:
    from dotenv import load_dotenv

    for env_file in (
        BASE_DIR / ".env.local",
        BASE_DIR / ".env",
        PROJECT_ROOT / ".env.local",
        PROJECT_ROOT / ".env",
    ):
        if env_file.is_file():
            load_dotenv(env_file, override=False)
except Exception:  # pragma: no cover - dotenv optional
    pass

from extraction import analyze_extraction  # noqa: E402
from rules import FLAT_KEYS, evaluate  # noqa: E402

app = FastAPI(title="LabelGuard AI API", version=VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    front_image: Optional[str] = Field(default=None, max_length=16_000_000)
    back_image: Optional[str] = Field(default=None, max_length=16_000_000)
    qr_data: Optional[str] = Field(default=None, max_length=4096)
    demo_sample: Optional[str] = Field(default=None, max_length=64)
    category_hint: Optional[str] = Field(default=None, max_length=32)


FRIENDLY_FAILURE = "Analysis could not be completed. Please try again."


def ai_configured() -> bool:
    return bool(os.getenv("OPENAI_API_KEY", "").strip())


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "LabelGuard AI",
        "version": VERSION,
        "ai_configured": ai_configured(),
    }


@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    if not (
        request.front_image
        or request.back_image
        or request.qr_data
        or request.demo_sample
    ):
        return JSONResponse(
            status_code=400,
            content={"detail": "Capture a label image or choose a demo sample first."},
        )

    try:
        extraction = analyze_extraction(
            front_image=request.front_image,
            back_image=request.back_image,
            qr_data=request.qr_data,
            demo_sample=request.demo_sample,
            category_hint=request.category_hint,
        )
        evaluated = evaluate(extraction)

        flat = {}
        for key in FLAT_KEYS:
            value = str(extraction.get(key) or "").strip()
            flat[key] = value if value else "Not detected"

        return {
            **flat,
            "coverage": evaluated["coverage"],
            "status": evaluated["status"],
            "source": str(extraction.get("_source") or "Not analyzed"),
            "product_category": evaluated["product_category"],
            "category_label": evaluated["category_label"],
            "qr_detected": evaluated["qr_detected"],
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
            "mode": str(extraction.get("_mode") or "live"),
            "ai_configured": ai_configured(),
            "fields": evaluated["fields"],
            "issues": evaluated["issues"],
            "suggestions": evaluated["suggestions"],
            "notes": list(extraction.get("_notes") or []),
        }
    except Exception:
        traceback.print_exc()  # server-side log only, never sent to clients
        return JSONResponse(status_code=500, content={"detail": FRIENDLY_FAILURE})


def _not_built() -> HTMLResponse:
    return HTMLResponse(
        status_code=503,
        content=(
            "<!doctype html><meta charset='utf-8'>"
            "<title>LabelGuard AI</title>"
            "<body style='font-family:system-ui;padding:40px;color:#0c1c33'>"
            "<h1>LabelGuard AI</h1>"
            "<p>The frontend build was not found. Build it first:</p>"
            "<pre style='background:#eef3fa;padding:14px;border-radius:10px'>"
            "npm install --prefix frontend\n"
            "npm run build --prefix frontend</pre>"
            "<p>The API is running — check <a href='/health'>/health</a>.</p>"
            "</body>"
        ),
    )


@app.get("/")
def index():
    entry = DIST_DIR / "index.html"
    if not entry.is_file():
        return _not_built()
    return FileResponse(entry)


@app.get("/{full_path:path}")
def spa(full_path: str):
    if full_path in ("health", "analyze"):
        return JSONResponse(status_code=404, content={"detail": "Not found"})

    candidate = (DIST_DIR / full_path).resolve()
    if str(candidate).startswith(str(DIST_DIR.resolve())) and candidate.is_file():
        return FileResponse(candidate)

    if full_path.startswith("assets/"):
        return JSONResponse(status_code=404, content={"detail": "Not found"})

    entry = DIST_DIR / "index.html"
    if not entry.is_file():
        return _not_built()
    return FileResponse(entry)
