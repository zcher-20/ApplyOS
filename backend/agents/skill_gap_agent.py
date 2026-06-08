"""
skill_gap_agent.py — ATS scoring + skill gap analysis agent.

Takes the structured ResumeProfile and JobProfile produced by the upstream
parsing agents and computes:

  • Overall ATS match score (0–100)
  • Per-skill match breakdown
  • Skill gap list (missing required / preferred skills)
  • Keyword coverage report
  • Prioritized recommendations
"""

from __future__ import annotations

import logging
import re
from typing import List, Literal, Optional

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from .resume_parser_agent import ResumeProfile
from .job_analyzer_agent import JobProfile

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Output schema
# ──────────────────────────────────────────────────────────────────────────────

class SkillMatch(BaseModel):
    skill: str
    status: Literal["present", "partial", "missing"]
    candidate_evidence: str = Field(
        description="Quote from resume proving the skill, or empty if missing"
    )
    importance: Literal["required", "preferred"]
    impact_on_score: int = Field(description="Points this skill contributes to ATS score")


class ATSScoreBreakdown(BaseModel):
    required_skills_score: int = Field(description="0–50 points for required skills coverage")
    preferred_skills_score: int = Field(description="0–25 points for preferred skills coverage")
    keyword_coverage_score: int = Field(description="0–15 points for ATS keyword density")
    experience_alignment_score: int = Field(description="0–10 points for seniority / years match")
    total_score: int = Field(description="Sum 0–100")


class GapItem(BaseModel):
    skill: str
    importance: Literal["required", "preferred"]
    recommendation: str = Field(description="Concrete actionable advice to address this gap")
    effort: Literal["quick-win", "medium", "long-term"]


class SkillGapReport(BaseModel):
    ats_score: ATSScoreBreakdown
    skill_matches: List[SkillMatch]
    gaps: List[GapItem]
    keyword_hits: List[str] = Field(description="ATS keywords found in the resume")
    keyword_misses: List[str] = Field(description="ATS keywords NOT found in the resume")
    overall_verdict: str = Field(description="1-paragraph honest assessment")
    top_3_quick_wins: List[str] = Field(
        description="3 highest-leverage actions the candidate can take RIGHT NOW"
    )


# ──────────────────────────────────────────────────────────────────────────────
# Agent
# ──────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are an ATS (Applicant Tracking System) expert and career coach.

Given a structured ResumeProfile and a JobProfile, produce a SkillGapReport.

Scoring rubric (total = 100):
  - Required skills coverage  : 0–50  (each required skill worth ~50/N points)
  - Preferred skills coverage : 0–25
  - ATS keyword density       : 0–15
  - Seniority / YoE match     : 0–10

For skill status:
  - "present"  = explicit evidence in resume (same or equivalent technology)
  - "partial"  = adjacent technology or indirect evidence
  - "missing"  = no evidence at all

Be honest and specific. Avoid inflating scores.
Evidence must be a direct quote or paraphrase from the candidate's resume text.
"""


class SkillGapAgent:
    """
    Agent: Skill Gap Analyzer

    Input:  ResumeProfile, JobProfile
    Output: SkillGapReport
    """

    def __init__(self, model: str = "gpt-4o"):
        self._llm = ChatOpenAI(model=model, temperature=0).with_structured_output(
            SkillGapReport
        )

    def run(self, resume: ResumeProfile, job: JobProfile) -> SkillGapReport:
        resume_json = resume.model_dump_json(indent=2)
        job_json = job.model_dump_json(indent=2)

        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(
                content=(
                    f"## Resume Profile\n```json\n{resume_json}\n```\n\n"
                    f"## Job Profile\n```json\n{job_json}\n```\n\n"
                    "Generate the SkillGapReport."
                )
            ),
        ]

        report: SkillGapReport = self._llm.invoke(messages)  # type: ignore[assignment]

        logger.info(
            "SkillGapAgent: ATS score=%d  gaps=%d  quick-wins=%d",
            report.ats_score.total_score,
            len(report.gaps),
            len(report.top_3_quick_wins),
        )
        return report
