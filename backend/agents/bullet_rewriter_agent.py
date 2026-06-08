"""
bullet_rewriter_agent.py — Resume bullet rewriting agent.

Takes original resume bullets + job requirements and rewrites them to:
  • Front-load strong action verbs
  • Embed ATS keywords naturally
  • Quantify impact (STAR / XYZ format)
  • Mirror the language / seniority of the target role

Also generates NEW bullets for roles where the candidate's existing text
is thin.
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

class RewrittenBullet(BaseModel):
    original: str = Field(description="Original bullet text (empty if newly generated)")
    rewritten: str = Field(description="Improved bullet with ATS keywords embedded")
    keywords_added: List[str] = Field(description="ATS keywords woven into this bullet")
    rationale: str = Field(description="Why this rewrite improves the original")
    is_new: bool = Field(description="True if generated from scratch, not a rewrite")


class RoleRewrite(BaseModel):
    company: str
    title: str
    bullets: List[RewrittenBullet]


class BulletRewriteReport(BaseModel):
    roles: List[RoleRewrite]
    summary_rewrite: str = Field(
        description="Rewritten professional summary tailored to this specific role"
    )
    skills_section_suggestion: str = Field(
        description="Suggested skills section ordering to front-load most relevant skills"
    )
    cover_letter_opener: str = Field(
        description="1–2 sentence hook for a cover letter specific to this company + role"
    )


# ──────────────────────────────────────────────────────────────────────────────
# Agent
# ──────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are an elite resume writer and ATS optimization specialist with 15 years of
experience helping engineers land roles at top-tier tech companies.

Your job: rewrite resume bullets to maximize ATS match AND human readability.

Rules:
1. Use strong action verbs (Led, Architected, Reduced, Shipped, Drove…).
2. Quantify everything possible — if no number exists, use relative language
   ("significantly reduced", "10x improvement").
3. Embed ATS keywords NATURALLY — never keyword-stuff.
4. Mirror the seniority and language of the target job description.
5. Keep each bullet to 1–2 lines.  Quality > quantity.
6. Do NOT fabricate achievements.  If you can't ground a claim in the original
   resume text, mark is_new=True and note it's a suggestion.
7. For the summary: open with the job title the candidate is targeting, then
   value proposition in 2–3 sentences.
"""


class BulletRewriterAgent:
    """
    Agent: Bullet Rewriter

    Input:  ResumeProfile, JobProfile, SkillGapReport, retriever (for evidence)
    Output: BulletRewriteReport
    """

    def __init__(self, retriever: MultiNamespaceRetriever, model: str = "gpt-4o"):
        self._retriever = retriever
        self._llm = ChatOpenAI(model=model, temperature=0.3).with_structured_output(
            BulletRewriteReport
        )

    def run(
        self,
        resume: ResumeProfile,
        job: JobProfile,
        gap_report: SkillGapReport,
    ) -> BulletRewriteReport:
        # Fetch additional evidence from vector store for context
        evidence_docs = self._retriever.retrieve_resume(
            "accomplishments quantified results metrics impact", k=6
        )
        evidence_ctx = self._retriever.format_context(evidence_docs)

        missing_kw = ", ".join(gap_report.keyword_misses[:20])
        ats_kw = ", ".join(job.ats_keywords[:30])

        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(
                content=(
                    f"## Target Role\n{job.job_title} @ {job.company_name}\n\n"
                    f"## ATS Keywords to embed\n{ats_kw}\n\n"
                    f"## Missing Keywords (priority targets)\n{missing_kw}\n\n"
                    f"## Candidate's Work Experience (structured)\n"
                    + _format_experience(resume)
                    + f"\n\n## Additional Evidence from Resume\n{evidence_ctx}\n\n"
                    f"## Candidate Summary (original)\n{resume.summary}\n\n"
                    "Rewrite the bullets and summary for this role."
                )
            ),
        ]

        report: BulletRewriteReport = self._llm.invoke(messages)  # type: ignore

        total_bullets = sum(len(r.bullets) for r in report.roles)
        logger.info(
            "BulletRewriterAgent: rewrote %d bullets across %d roles",
            total_bullets,
            len(report.roles),
        )
        return report


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _format_experience(resume: ResumeProfile) -> str:
    lines = []
    for exp in resume.work_experience:
        lines.append(f"\n### {exp.title} @ {exp.company} ({exp.duration})")
        for b in exp.bullets:
            lines.append(f"  - {b}")
    return "\n".join(lines) if lines else "(no work experience found)"
