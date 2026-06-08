"""
graph.py — LangGraph multi-agent orchestration for ApplyOS.

State machine:
  START
    │
    ├──▶ ingest_documents        (parallel: resume + job + company docs)
    │
    ├──▶ parse_resume            (ResumeParserAgent)
    ├──▶ analyze_job             (JobAnalyzerAgent)
    │
    ├──▶ analyze_skill_gap       (SkillGapAgent)  — depends on both above
    │
    ├──▶ rewrite_bullets         (BulletRewriterAgent)
    ├──▶ prepare_interview       (InterviewPrepAgent)
    │         (both run in parallel after skill gap)
    │
    ├──▶ evaluate_outputs        (HallucinationChecker + ScoringRubric)
    │
    └──▶ END  →  ApplyOSResult

All state is passed through a typed TypedDict; agents are pure functions
that receive state and return a state patch.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Annotated, Any, Dict, Optional

from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

from .agents.bullet_rewriter_agent import BulletRewriterAgent, BulletRewriteReport
from .agents.interview_prep_agent import InterviewPrepAgent, InterviewPrepReport
from .agents.job_analyzer_agent import JobAnalyzerAgent, JobProfile
from .agents.resume_parser_agent import ResumeParserAgent, ResumeProfile
from .agents.skill_gap_agent import SkillGapAgent, SkillGapReport
from .evaluation.hallucination_checker import HallucinationChecker
from .evaluation.scoring_rubric import ScoringRubric
from .rag.ingest import ingest_file, ingest_text
from .rag.retriever import MultiNamespaceRetriever
from .rag.vector_store import build_vector_store

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Graph state
# ──────────────────────────────────────────────────────────────────────────────

class ApplyOSState(TypedDict):
    # Inputs
    session_id: str
    resume_path: Optional[str]
    resume_text: Optional[str]
    job_description_text: str
    company_doc_paths: list[str]

    # Intermediate
    resume_profile: Optional[ResumeProfile]
    job_profile: Optional[JobProfile]
    skill_gap_report: Optional[SkillGapReport]

    # Outputs
    bullet_rewrite_report: Optional[BulletRewriteReport]
    interview_prep_report: Optional[InterviewPrepReport]

    # Quality
    hallucination_flags: list[str]
    rubric_scores: dict[str, float]
    overall_quality_score: float

    # Meta
    errors: list[str]
    status: str


# ──────────────────────────────────────────────────────────────────────────────
# Node functions
# ──────────────────────────────────────────────────────────────────────────────

def node_ingest(state: ApplyOSState) -> dict:
    """Ingest all documents into the vector store."""
    session_id = state["session_id"]
    vs = build_vector_store()
    errors = list(state.get("errors", []))

    # Resume
    if state.get("resume_path"):
        try:
            ingest_file(state["resume_path"], "resume", session_id, vs)
        except Exception as e:
            errors.append(f"Resume ingest error: {e}")

    if state.get("resume_text"):
        try:
            ingest_text(state["resume_text"], "resume", session_id, vs, "resume_paste")
        except Exception as e:
            errors.append(f"Resume text ingest error: {e}")

    # Job description
    try:
        ingest_text(state["job_description_text"], "job_description", session_id, vs, "job_post")
    except Exception as e:
        errors.append(f"JD ingest error: {e}")

    # Company docs
    for path in state.get("company_doc_paths", []):
        try:
            ingest_file(path, "company_doc", session_id, vs)
        except Exception as e:
            errors.append(f"Company doc ingest error ({path}): {e}")

    logger.info("node_ingest: session=%s errors=%d", session_id, len(errors))
    return {"errors": errors, "status": "ingested"}


def node_parse_resume(state: ApplyOSState) -> dict:
    """Run ResumeParserAgent."""
    vs = build_vector_store()
    retriever = MultiNamespaceRetriever(vs, state["session_id"])
    agent = ResumeParserAgent(retriever)
    try:
        profile = agent.run()
        return {"resume_profile": profile, "status": "resume_parsed"}
    except Exception as e:
        logger.exception("node_parse_resume failed")
        return {"errors": state.get("errors", []) + [str(e)], "status": "error"}


def node_analyze_job(state: ApplyOSState) -> dict:
    """Run JobAnalyzerAgent."""
    vs = build_vector_store()
    retriever = MultiNamespaceRetriever(vs, state["session_id"])
    agent = JobAnalyzerAgent(retriever)
    try:
        profile = agent.run()
        return {"job_profile": profile, "status": "job_analyzed"}
    except Exception as e:
        logger.exception("node_analyze_job failed")
        return {"errors": state.get("errors", []) + [str(e)], "status": "error"}


def node_skill_gap(state: ApplyOSState) -> dict:
    """Run SkillGapAgent — requires both profiles."""
    agent = SkillGapAgent()
    try:
        report = agent.run(state["resume_profile"], state["job_profile"])
        return {"skill_gap_report": report, "status": "gap_analyzed"}
    except Exception as e:
        logger.exception("node_skill_gap failed")
        return {"errors": state.get("errors", []) + [str(e)], "status": "error"}


def node_rewrite_bullets(state: ApplyOSState) -> dict:
    """Run BulletRewriterAgent."""
    vs = build_vector_store()
    retriever = MultiNamespaceRetriever(vs, state["session_id"])
    agent = BulletRewriterAgent(retriever)
    try:
        report = agent.run(
            state["resume_profile"],
            state["job_profile"],
            state["skill_gap_report"],
        )
        return {"bullet_rewrite_report": report}
    except Exception as e:
        logger.exception("node_rewrite_bullets failed")
        return {"errors": state.get("errors", []) + [str(e)]}


def node_interview_prep(state: ApplyOSState) -> dict:
    """Run InterviewPrepAgent."""
    vs = build_vector_store()
    retriever = MultiNamespaceRetriever(vs, state["session_id"])
    agent = InterviewPrepAgent(retriever)
    try:
        report = agent.run(
            state["resume_profile"],
            state["job_profile"],
            state["skill_gap_report"],
        )
        return {"interview_prep_report": report}
    except Exception as e:
        logger.exception("node_interview_prep failed")
        return {"errors": state.get("errors", []) + [str(e)]}


def node_evaluate(state: ApplyOSState) -> dict:
    """Run hallucination checker and rubric scorer."""
    checker = HallucinationChecker()
    rubric = ScoringRubric()

    flags = checker.check(state)
    scores = rubric.score(state)
    overall = sum(scores.values()) / len(scores) if scores else 0.0

    return {
        "hallucination_flags": flags,
        "rubric_scores": scores,
        "overall_quality_score": round(overall, 2),
        "status": "complete",
    }


# ──────────────────────────────────────────────────────────────────────────────
# Graph construction
# ──────────────────────────────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    g = StateGraph(ApplyOSState)

    g.add_node("ingest", node_ingest)
    g.add_node("parse_resume", node_parse_resume)
    g.add_node("analyze_job", node_analyze_job)
    g.add_node("skill_gap", node_skill_gap)
    g.add_node("rewrite_bullets", node_rewrite_bullets)
    g.add_node("interview_prep", node_interview_prep)
    g.add_node("evaluate", node_evaluate)

    g.set_entry_point("ingest")

    # After ingestion: parse resume and analyze job in parallel
    g.add_edge("ingest", "parse_resume")
    g.add_edge("ingest", "analyze_job")

    # Both parsing steps feed into skill gap
    g.add_edge("parse_resume", "skill_gap")
    g.add_edge("analyze_job", "skill_gap")

    # After gap analysis: rewrite and prep in parallel
    g.add_edge("skill_gap", "rewrite_bullets")
    g.add_edge("skill_gap", "interview_prep")

    # Both outputs feed into evaluation
    g.add_edge("rewrite_bullets", "evaluate")
    g.add_edge("interview_prep", "evaluate")

    g.add_edge("evaluate", END)

    return g.compile()


# ──────────────────────────────────────────────────────────────────────────────
# Public runner
# ──────────────────────────────────────────────────────────────────────────────

def run_pipeline(
    job_description_text: str,
    resume_path: str | None = None,
    resume_text: str | None = None,
    company_doc_paths: list[str] | None = None,
    session_id: str | None = None,
) -> dict:
    """
    Entry point for the full ApplyOS pipeline.

    Returns the final state dict with all outputs.
    """
    session_id = session_id or str(uuid.uuid4())

    initial_state: ApplyOSState = {
        "session_id": session_id,
        "resume_path": resume_path,
        "resume_text": resume_text,
        "job_description_text": job_description_text,
        "company_doc_paths": company_doc_paths or [],
        "resume_profile": None,
        "job_profile": None,
        "skill_gap_report": None,
        "bullet_rewrite_report": None,
        "interview_prep_report": None,
        "hallucination_flags": [],
        "rubric_scores": {},
        "overall_quality_score": 0.0,
        "errors": [],
        "status": "starting",
    }

    graph = build_graph()
    final_state = graph.invoke(initial_state)
    return final_state
