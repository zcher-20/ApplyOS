"""
models.py — SQLAlchemy ORM models for persisting application sessions.

Tables:
  • application_sessions — one row per job application
  • analysis_results     — stores the JSON outputs of each agent run
  • user_feedback        — thumbs up/down + freeform notes per section
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker
import os


# ──────────────────────────────────────────────────────────────────────────────
# Base + engine
# ──────────────────────────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


def get_engine(url: str | None = None):
    url = url or os.getenv("DATABASE_URL", "sqlite:///./applyos.db")
    return create_engine(url, echo=False)


def get_session_factory(engine=None):
    engine = engine or get_engine()
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)


# ──────────────────────────────────────────────────────────────────────────────
# Models
# ──────────────────────────────────────────────────────────────────────────────

class ApplicationSession(Base):
    """One row per (user, job application) pair."""

    __tablename__ = "application_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Application metadata
    job_title = Column(String(256))
    company_name = Column(String(256))
    job_url = Column(Text)
    status = Column(String(64), default="in_progress")  # in_progress | complete | error

    # File references (paths or S3 keys)
    resume_path = Column(Text)
    company_doc_paths = Column(JSON, default=list)  # list[str]

    # Scalar results for quick filtering/sorting
    ats_score = Column(Integer)
    overall_quality_score = Column(Float)
    error_count = Column(Integer, default=0)

    results = relationship(
        "AnalysisResult", back_populates="session", cascade="all, delete-orphan"
    )
    feedback = relationship(
        "UserFeedback", back_populates="session", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ApplicationSession id={self.id} job={self.job_title}@{self.company_name}>"


class AnalysisResult(Base):
    """Stores the JSON output from each agent run for a session."""

    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("application_sessions.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    agent_name = Column(String(128), nullable=False)  # e.g. "skill_gap_agent"
    output_json = Column(JSON, nullable=False)         # full Pydantic model as dict
    latency_ms = Column(Integer)                       # agent runtime in ms
    model_used = Column(String(64))                    # gpt-4o, gpt-4o-mini, etc.
    hallucination_flags = Column(JSON, default=list)

    session = relationship("ApplicationSession", back_populates="results")


class UserFeedback(Base):
    """Thumbs up/down + notes on individual sections of the analysis."""

    __tablename__ = "user_feedback"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("application_sessions.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    section = Column(String(64), nullable=False)
    # "ats_score" | "skill_gap" | "bullets" | "interview_prep" | "talking_points"

    thumbs_up = Column(Boolean)         # True = positive, False = negative, None = not rated
    notes = Column(Text)                # freeform feedback
    corrected_output = Column(Text)     # user-edited version of the section

    session = relationship("ApplicationSession", back_populates="feedback")


# ──────────────────────────────────────────────────────────────────────────────
# Init helper
# ──────────────────────────────────────────────────────────────────────────────

def init_db(url: str | None = None) -> None:
    """Create all tables (idempotent)."""
    engine = get_engine(url)
    Base.metadata.create_all(engine)
