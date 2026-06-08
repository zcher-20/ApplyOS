"""
resume_parser_agent.py — Structured resume extraction agent.

Uses function-calling to extract a typed ResumeProfile from raw resume text
retrieved via RAG.  The structured output is consumed by downstream agents
(skill_gap, bullet_rewriter, interview_prep).
"""

from __future__ import annotations

import logging
from typing import List, Optional

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from ..rag.retriever import MultiNamespaceRetriever

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Output schema
# ──────────────────────────────────────────────────────────────────────────────

class WorkExperience(BaseModel):
    company: str
    title: str
    duration: str
    bullets: List[str] = Field(description="Key accomplishment bullets")


class Education(BaseModel):
    institution: str
    degree: str
    year: Optional[str] = None
    gpa: Optional[str] = None


class ResumeProfile(BaseModel):
    full_name: str = ""
    email: str = ""
    phone: str = ""
    linkedin: str = ""
    github: str = ""
    summary: str = ""
    skills: List[str] = Field(default_factory=list)
    work_experience: List[WorkExperience] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    projects: List[str] = Field(default_factory=list)
    raw_text_snippet: str = Field(
        default="", description="First 500 chars of raw resume for debugging"
    )


# ──────────────────────────────────────────────────────────────────────────────
# Agent
# ──────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are an expert resume parser.  You will be given excerpts from a candidate's
resume (retrieved via semantic search).  Extract structured information and
return it as valid JSON matching the ResumeProfile schema.

Rules:
- Be conservative: only extract information explicitly present in the text.
- For missing fields, return empty strings or empty lists — never hallucinate.
- Normalize skills to their canonical form (e.g. "JS" → "JavaScript").
- Keep bullet points concise; strip filler phrases ("Responsible for…").
"""


class ResumeParserAgent:
    """
    Agent: Resume Parser

    Input:  session_id (retriever fetches resume chunks)
    Output: ResumeProfile (structured Pydantic model)
    """

    def __init__(self, retriever: MultiNamespaceRetriever, model: str = "gpt-4o"):
        self._retriever = retriever
        self._llm = ChatOpenAI(model=model, temperature=0).with_structured_output(
            ResumeProfile
        )

    def run(self) -> ResumeProfile:
        # Pull resume chunks covering the most important sections
        queries = [
            "personal contact information name email phone linkedin github",
            "work experience job titles companies responsibilities achievements",
            "skills technologies programming languages frameworks tools",
            "education degrees universities GPA certifications",
            "projects side projects open source contributions",
        ]

        docs = []
        for q in queries:
            docs.extend(self._retriever.retrieve_resume(q, k=4))

        # Deduplicate
        seen: set[str] = set()
        unique = [d for d in docs if not (d.page_content in seen or seen.add(d.page_content))]  # type: ignore[func-returns-value]

        context = self._retriever.format_context(unique)
        raw_snippet = unique[0].page_content[:500] if unique else ""

        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(
                content=(
                    f"Resume excerpts:\n\n{context}\n\n"
                    "Extract the ResumeProfile from these excerpts."
                )
            ),
        ]

        profile: ResumeProfile = self._llm.invoke(messages)  # type: ignore[assignment]
        profile.raw_text_snippet = raw_snippet

        logger.info(
            "ResumeParserAgent: extracted %d skills, %d roles",
            len(profile.skills),
            len(profile.work_experience),
        )
        return profile
