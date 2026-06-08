"""
job_analyzer_agent.py — Job description analysis agent.

Extracts structured requirements from the job posting so downstream agents
can compare them against the candidate's resume without re-reading raw text.
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

class JobRequirement(BaseModel):
    skill: str
    required: bool = Field(description="True = must-have, False = nice-to-have")
    years_experience: Optional[int] = None
    context: str = Field(description="Brief quote / paraphrase from the JD")


class JobProfile(BaseModel):
    company_name: str = ""
    job_title: str = ""
    team_or_org: str = ""
    location: str = ""
    employment_type: str = ""  # Full-time, Contract, etc.
    seniority: str = ""        # Entry, Mid, Senior, Staff, Principal
    compensation_range: str = ""

    # Core content
    role_summary: str = Field(description="2-3 sentence summary of the role")
    required_skills: List[JobRequirement] = Field(default_factory=list)
    preferred_skills: List[JobRequirement] = Field(default_factory=list)
    responsibilities: List[str] = Field(default_factory=list)
    success_metrics: List[str] = Field(
        default_factory=list,
        description="How the company measures success in this role",
    )

    # Culture / values signals
    culture_keywords: List[str] = Field(
        default_factory=list,
        description="Values, culture signals, buzzwords from the JD",
    )
    ats_keywords: List[str] = Field(
        default_factory=list,
        description="High-frequency terms an ATS would score",
    )


# ──────────────────────────────────────────────────────────────────────────────
# Agent
# ──────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are a senior technical recruiter and job description analyst.

Given excerpts from a job posting, extract a structured JobProfile.

Rules:
- Distinguish clearly between required (must-have) and preferred (nice-to-have) skills.
- ats_keywords = terms repeated multiple times or listed in required sections
  (exact strings matter for ATS matching).
- success_metrics = phrases like "you will be measured by", "we expect you to",
  KPIs, OKRs, delivery targets.
- culture_keywords = values phrases like "ownership", "bias for action", "humble".
- Only extract what is explicitly in the text; never invent details.
"""


class JobAnalyzerAgent:
    """
    Agent: Job Analyzer

    Input:  session_id (retriever fetches job_description chunks)
    Output: JobProfile (structured Pydantic model)
    """

    def __init__(self, retriever: MultiNamespaceRetriever, model: str = "gpt-4o"):
        self._retriever = retriever
        self._llm = ChatOpenAI(model=model, temperature=0).with_structured_output(
            JobProfile
        )

    def run(self) -> JobProfile:
        queries = [
            "required skills qualifications years experience",
            "preferred nice to have bonus skills",
            "responsibilities duties day to day work",
            "company name team organization location employment type",
            "compensation salary benefits equity",
            "culture values diversity inclusion mission",
            "success metrics KPIs OKRs performance expectations",
        ]

        docs = []
        for q in queries:
            docs.extend(self._retriever.retrieve_job(q, k=4))

        seen: set[str] = set()
        unique = [d for d in docs if not (d.page_content in seen or seen.add(d.page_content))]  # type: ignore

        context = self._retriever.format_context(unique)

        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(
                content=(
                    f"Job posting excerpts:\n\n{context}\n\n"
                    "Extract the JobProfile from these excerpts."
                )
            ),
        ]

        profile: JobProfile = self._llm.invoke(messages)  # type: ignore[assignment]

        logger.info(
            "JobAnalyzerAgent: %s @ %s | required=%d preferred=%d ats_kw=%d",
            profile.job_title,
            profile.company_name,
            len(profile.required_skills),
            len(profile.preferred_skills),
            len(profile.ats_keywords),
        )
        return profile
