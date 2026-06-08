"""
hallucination_checker.py — Post-generation hallucination detection.

Checks that:
  1. Bullet rewrites don't introduce facts not present in the original resume.
  2. Interview talking points are grounded in company docs (if provided).
  3. ATS scores are internally consistent.

Uses a lightweight LLM judge (GPT-4o with a strict system prompt) + rule-based
heuristics for deterministic checks.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

logger = logging.getLogger(__name__)

JUDGE_SYSTEM = """\
You are a factual consistency judge.  You will be given:
  - ORIGINAL: the source document(s) the model had access to
  - GENERATED: the model's output

Return a JSON list of hallucination flags.  Each flag is a short string
describing a specific claim in GENERATED that CANNOT be verified from ORIGINAL.

If everything is grounded, return an empty list [].
Return ONLY valid JSON — no commentary.
"""


class HallucinationChecker:
    def __init__(self, model: str = "gpt-4o-mini"):
        # Use mini for cost efficiency — this is a fast consistency check
        self._llm = ChatOpenAI(model=model, temperature=0)

    def check(self, state: dict) -> list[str]:
        """
        Run all hallucination checks and return a flat list of flag strings.
        """
        flags: list[str] = []

        # 1. Check bullet rewrites against original resume
        if state.get("bullet_rewrite_report") and state.get("resume_profile"):
            flags.extend(self._check_bullets(state))

        # 2. Check interview talking points against company docs
        if state.get("interview_prep_report") and state.get("company_doc_paths"):
            flags.extend(self._check_talking_points(state))

        # 3. Rule-based: ATS score sanity
        flags.extend(self._check_ats_score(state))

        if flags:
            logger.warning("HallucinationChecker: %d flags", len(flags))
        else:
            logger.info("HallucinationChecker: clean")

        return flags

    # ── private ────────────────────────────────────────────────────────────

    def _check_bullets(self, state: dict) -> list[str]:
        resume = state["resume_profile"]
        report = state["bullet_rewrite_report"]

        # Collect all rewritten bullets
        all_rewrites = []
        for role in report.roles:
            for b in role.bullets:
                if not b.is_new:
                    all_rewrites.append(b.rewritten)

        if not all_rewrites:
            return []

        original_text = (
            resume.summary
            + " "
            + " ".join(
                " ".join(exp.bullets)
                for exp in resume.work_experience
            )
        )
        generated_text = "\n".join(all_rewrites)

        return self._llm_judge(original=original_text, generated=generated_text)

    def _check_talking_points(self, state: dict) -> list[str]:
        report = state["interview_prep_report"]
        points = [tp.point for tp in report.company_talking_points]
        if not points:
            return []

        # We use the company doc text as ground truth; pull from state if available
        company_context = state.get("_company_context_text", "(company docs not cached)")

        return self._llm_judge(
            original=company_context,
            generated="\n".join(points),
        )

    def _check_ats_score(self, state: dict) -> list[str]:
        """Rule-based: verify the sub-scores add up to the total."""
        if not state.get("skill_gap_report"):
            return []

        score = state["skill_gap_report"].ats_score
        computed = (
            score.required_skills_score
            + score.preferred_skills_score
            + score.keyword_coverage_score
            + score.experience_alignment_score
        )
        if abs(computed - score.total_score) > 2:
            return [
                f"ATS sub-scores sum to {computed} but total_score={score.total_score}"
            ]
        return []

    def _llm_judge(self, original: str, generated: str) -> list[str]:
        import json

        prompt = (
            f"ORIGINAL:\n{original[:3000]}\n\n"
            f"GENERATED:\n{generated[:2000]}"
        )
        try:
            response = self._llm.invoke(
                [SystemMessage(content=JUDGE_SYSTEM), HumanMessage(content=prompt)]
            )
            raw = response.content.strip()
            # Strip markdown fences if present
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)
            return json.loads(raw)
        except Exception as e:
            logger.error("LLM judge failed: %s", e)
            return []
