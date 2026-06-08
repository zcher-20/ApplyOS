"""
main.py — FastAPI backend for ApplyOS.

Endpoints:
  POST /analyze          — Full pipeline run (upload resume + paste JD)
  POST /upload/resume    — Upload resume file to session
  POST /upload/company   — Upload company doc to session
  GET  /sessions         — List saved sessions
  GET  /sessions/{id}    — Get a specific session's results
  POST /feedback         — Submit user feedback on a section
  DELETE /sessions/{id}  — Delete a session + its vector data
"""

from __future__ import annotations

import logging
import os
import shutil
import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .graph import run_pipeline
from .database.models import (
    AnalysisResult,
    ApplicationSession,
    UserFeedback,
    get_session_factory,
    init_db,
)
from .rag.ingest import clear_session
from .rag.vector_store import build_vector_store

# ──────────────────────────────────────────────────────────────────────────────
# Setup
# ──────────────────────────────────────────────────────────────────────────────

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

UPLOAD_DIR = Path("./data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="ApplyOS API",
    description="Agentic Resume + Job Intelligence Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Init DB on startup
init_db()
SessionFactory = get_session_factory()


# ──────────────────────────────────────────────────────────────────────────────
# Request / Response schemas
# ──────────────────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    job_description: str = Field(min_length=50, description="Full text of the job posting")
    resume_text: Optional[str] = Field(None, description="Resume as plain text (alt to upload)")
    session_id: Optional[str] = Field(None, description="Reuse an existing session")


class FeedbackRequest(BaseModel):
    session_id: str
    section: str
    thumbs_up: Optional[bool] = None
    notes: Optional[str] = None
    corrected_output: Optional[str] = None


class AnalyzeResponse(BaseModel):
    session_id: str
    status: str
    ats_score: Optional[int]
    overall_quality_score: float
    errors: list[str]
    results: dict


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/upload/resume")
async def upload_resume(file: UploadFile = File(...), session_id: Optional[str] = None):
    """Upload a resume PDF or DOCX. Returns the session_id and file path."""
    session_id = session_id or str(uuid.uuid4())
    suffix = Path(file.filename or "resume.pdf").suffix.lower()

    if suffix not in (".pdf", ".docx", ".doc", ".txt"):
        raise HTTPException(400, "Unsupported file type. Upload PDF, DOCX, or TXT.")

    session_dir = UPLOAD_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    dest = session_dir / f"resume{suffix}"

    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"session_id": session_id, "resume_path": str(dest)}


@app.post("/upload/company")
async def upload_company_doc(file: UploadFile = File(...), session_id: str = ""):
    """Upload a company document (PDF, DOCX, TXT) to a session."""
    if not session_id:
        raise HTTPException(400, "session_id is required")

    session_dir = UPLOAD_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    dest = session_dir / f"company_{uuid.uuid4().hex[:6]}_{file.filename}"
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"session_id": session_id, "company_doc_path": str(dest)}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    """
    Run the full multi-agent pipeline.

    Accepts either:
      - resume_text in the request body, OR
      - a previously uploaded resume file (session_id must match)
    """
    session_id = req.session_id or str(uuid.uuid4())

    # Discover uploaded files for this session
    session_dir = UPLOAD_DIR / session_id
    resume_path: Optional[str] = None
    company_doc_paths: list[str] = []

    if session_dir.exists():
        for f in session_dir.iterdir():
            if f.stem.startswith("resume"):
                resume_path = str(f)
            elif f.stem.startswith("company_"):
                company_doc_paths.append(str(f))

    if not resume_path and not req.resume_text:
        raise HTTPException(
            400,
            "Provide resume_text in the request body or upload a resume first.",
        )

    t0 = time.perf_counter()

    try:
        final_state = run_pipeline(
            job_description_text=req.job_description,
            resume_path=resume_path,
            resume_text=req.resume_text,
            company_doc_paths=company_doc_paths,
            session_id=session_id,
        )
    except Exception as e:
        logger.exception("Pipeline failed")
        raise HTTPException(500, f"Pipeline error: {e}")

    elapsed_ms = int((time.perf_counter() - t0) * 1000)

    # Persist to database
    _save_session(session_id, final_state, elapsed_ms)

    # Build response
    ats_score = None
    if final_state.get("skill_gap_report"):
        ats_score = final_state["skill_gap_report"].ats_score.total_score

    return AnalyzeResponse(
        session_id=session_id,
        status=final_state.get("status", "unknown"),
        ats_score=ats_score,
        overall_quality_score=final_state.get("overall_quality_score", 0.0),
        errors=final_state.get("errors", []),
        results=_serialize_results(final_state),
    )


@app.get("/sessions")
def list_sessions(limit: int = 20):
    with SessionFactory() as db:
        sessions = (
            db.query(ApplicationSession)
            .order_by(ApplicationSession.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": s.id,
                "job_title": s.job_title,
                "company_name": s.company_name,
                "ats_score": s.ats_score,
                "status": s.status,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in sessions
        ]


@app.get("/sessions/{session_id}")
def get_session(session_id: str):
    with SessionFactory() as db:
        session = db.query(ApplicationSession).filter_by(id=session_id).first()
        if not session:
            raise HTTPException(404, "Session not found")

        results = db.query(AnalysisResult).filter_by(session_id=session_id).all()
        return {
            "session": {
                "id": session.id,
                "job_title": session.job_title,
                "company_name": session.company_name,
                "ats_score": session.ats_score,
                "status": session.status,
            },
            "results": {r.agent_name: r.output_json for r in results},
        }


@app.post("/feedback")
def submit_feedback(req: FeedbackRequest):
    with SessionFactory() as db:
        fb = UserFeedback(
            session_id=req.session_id,
            section=req.section,
            thumbs_up=req.thumbs_up,
            notes=req.notes,
            corrected_output=req.corrected_output,
        )
        db.add(fb)
        db.commit()
    return {"status": "saved"}


@app.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    # Clear vector store
    try:
        vs = build_vector_store()
        clear_session(session_id, vs)
    except Exception as e:
        logger.warning("Vector store clear failed: %s", e)

    # Remove uploaded files
    session_dir = UPLOAD_DIR / session_id
    if session_dir.exists():
        shutil.rmtree(session_dir)

    # Remove DB records
    with SessionFactory() as db:
        db.query(AnalysisResult).filter_by(session_id=session_id).delete()
        db.query(UserFeedback).filter_by(session_id=session_id).delete()
        db.query(ApplicationSession).filter_by(id=session_id).delete()
        db.commit()

    return {"status": "deleted"}


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _save_session(session_id: str, state: dict, elapsed_ms: int) -> None:
    with SessionFactory() as db:
        jp = state.get("job_profile")
        gr = state.get("skill_gap_report")

        sess = ApplicationSession(
            id=session_id,
            job_title=jp.job_title if jp else None,
            company_name=jp.company_name if jp else None,
            ats_score=gr.ats_score.total_score if gr else None,
            overall_quality_score=state.get("overall_quality_score"),
            status=state.get("status", "complete"),
            error_count=len(state.get("errors", [])),
        )
        db.merge(sess)

        # Save each agent's output
        agent_keys = {
            "resume_parser_agent": "resume_profile",
            "job_analyzer_agent": "job_profile",
            "skill_gap_agent": "skill_gap_report",
            "bullet_rewriter_agent": "bullet_rewrite_report",
            "interview_prep_agent": "interview_prep_report",
        }
        for agent_name, state_key in agent_keys.items():
            obj = state.get(state_key)
            if obj is not None:
                result = AnalysisResult(
                    session_id=session_id,
                    agent_name=agent_name,
                    output_json=obj.model_dump() if hasattr(obj, "model_dump") else {},
                    latency_ms=elapsed_ms,
                    model_used="gpt-4o",
                    hallucination_flags=state.get("hallucination_flags", []),
                )
                db.add(result)

        db.commit()


def _serialize_results(state: dict) -> dict:
    """Convert Pydantic models in state to plain dicts for JSON serialization."""
    keys = [
        "resume_profile",
        "job_profile",
        "skill_gap_report",
        "bullet_rewrite_report",
        "interview_prep_report",
    ]
    out = {}
    for k in keys:
        obj = state.get(k)
        if obj is not None and hasattr(obj, "model_dump"):
            out[k] = obj.model_dump()
        elif obj is not None:
            out[k] = obj
    out["hallucination_flags"] = state.get("hallucination_flags", [])
    out["rubric_scores"] = state.get("rubric_scores", {})
    return out
