"""
interview_prep_agent.py — Interview preparation agent.

Generates:
  • Role-specific behavioral questions (STAR format prompts)
  • Technical / domain questions derived from the JD
  • Company-specific talking points (grounded in company docs via RAG)
  • Suggested candidate questions to ask the interviewer
  • Red-flag awareness (gaps, over/under-qualifications)
"""

from __future__ import annotations

import logging
from typing import List, Optional

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from .resume_parser_agent import ResumeProfile
from .job_analyzer_agent import JobProfile
from .skill_gap_agent import SkillGapReport
from ..rag.retriever import MultiNamespaceRetriever

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Output schema
# ──────────────────────────────────────────────────────────────────────────────

class InterviewQuestion(BaseModel):
    question: str
    category: str  # behavioral | technical | situational | company
    why_likely: str = Field(description="Why this question is likely given the JD/gaps")
    star_hint: str = Field(
        description="1-sentence hint on which resume experience to use for STAR answer"
    )
    sample_answer_scaffold: str = Field(
        description="Situation → Task → Action → Result skeleton (fill-in-the-blank style)"
    )


class TalkingPoint(BaseModel):
    topic: str
    point: str = Field(description="What to say, grounded in company/role knowledge")
    source: str = Field(description="Where this came from: company doc, JD, news, etc.")


class CandidateQuestion(BaseModel):
    question: str
    why_smart: str = Field(description="Why this question signals strong candidacy")


class InterviewPrepReport(BaseModel):
    behavioral_questions: List[InterviewQuestion]
    technical_questions: List[InterviewQuestion]
    company_specific_questions: List[InterviewQuestion]

    company_talking_points: List[TalkingPoint] = Field(
        description="Evidence-backed talking points about the company to weave into answers"
    )
    questions_to_ask: List[CandidateQuestion] = Field(
        description="Smart questions the candidate should ask the interviewer"
    )

    red_flags_to_address: List[str] = Field(
        description="Potential concerns the interviewer may have; how to preemptively address"
    )
    closing_pitch: str = Field(
        description="30-second closing pitch tailored to this specific role and company"
    )


# ──────────────────────────────────────────────────────────────────────────────
# Agent
# ──────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are a veteran tech-industry interview coach who has helped hundreds of
engineers land roles at FAANG, startups, and everything in between.

Given a candidate's profile, job requirements, skill gap report, and company
context, generate a comprehensive InterviewPrepReport.

Guidelines:
- Behavioral questions should directly probe the candidate's known skill gaps.
- Technical questions should match the seniority level from the JD.
- Company talking points MUST be grounded in the provided company context —
  cite the source (e.g. "from company docs: …").
- For STAR scaffolds use [SITUATION], [TASK], [ACTION], [RESULT] placeholders.
- Red flags = places where an interviewer might be skeptical; give a reframe
  strategy for each.
- Questions to ask should demonstrate strategic thinking, not just curiosity.
"""


class InterviewPrepAgent:
    """
    Agent: Interview Prep

    Input:  ResumeProfile, JobProfile, SkillGapReport, retriever
    Output: InterviewPrepReport
    """

    def __init__(self, retriever: MultiNamespaceRetriever, model: str = "gpt-4o"):
        self._retriever = retriever
        self._llm = ChatOpenAI(model=model, temperature=0.4).with_structured_output(
            InterviewPrepReport
        )

    def run(
        self,
        resume: ResumeProfile,
        job: JobProfile,
        gap_report: SkillGapReport,
    ) -> InterviewPrepReport:
        # Fetch company docs for talking points
        company_docs = self._retriever.retrieve_company(
            "company mission values culture products recent news strategy", k=8
        )
        company_ctx = self._retriever.format_context(company_docs)

        # Fetch resume evidence for STAR hints
        resume_docs = self._retriever.retrieve_resume(
            "project outcomes metrics results leadership collaboration", k=6
        )
        resume_ctx = self._retriever.format_context(resume_docs)

        gaps_text = "\n".join(
            f"- {g.skill} ({g.importance}): {g.recommendation}"
            for g in gap_report.gaps
        )

        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(
                content=(
                    f"## Candidate: {resume.full_name}\n"
                    f"## Target Role: {job.job_title} @ {job.company_name}\n"
                    f"## Seniority: {job.seniority}\n\n"
                    f"## Skill Gaps\n{gaps_text}\n\n"
                    f"## ATS Score: {gap_report.ats_score.total_score}/100\n\n"
                    f"## Company Context (RAG)\n{company_ctx}\n\n"
                    f"## Resume Evidence (RAG)\n{resume_ctx}\n\n"
                    f"## Culture Keywords\n{', '.join(job.culture_keywords)}\n\n"
                    "Generate the InterviewPrepReport."
                )
            ),
        ]

        report: InterviewPrepReport = self._llm.invoke(messages)  # type: ignore

        logger.info(
            "InterviewPrepAgent: %d behavioral + %d technical + %d company Qs | %d talking points",
            len(report.behavioral_questions),
            len(report.technical_questions),
            len(report.company_specific_questions),
            len(report.company_talking_points),
        )
        return report
