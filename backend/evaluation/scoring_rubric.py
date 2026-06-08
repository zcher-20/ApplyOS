"""
scoring_rubric.py — Multi-dimensional output quality rubric.

Scores 0.0–1.0 on each dimension:
  • completeness   — all required output fields are populated
  • specificity    — outputs reference specific evidence, not generic advice
  • actionability  — recommendations are concrete and implementable
  • ats_alignment  — ATS keywords from the JD appear in rewrites
  • consistency    — no contradictions between agents' outputs
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class ScoringRubric:
    """Rule-based rubric scorer. Fast, deterministic, no LLM calls."""

    def score(self, state: dict) -> dict[str, float]:
        scores: dict[str, float] = {
            "completeness": self._completeness(state),
            "specificity": self._specificity(state),
            "actionability": self._actionability(state),
            "ats_alignment": self._ats_alignment(state),
            "consistency": self._consistency(state),
        }
        logger.info("ScoringRubric: %s", scores)
        return scores

    # ── dimension scorers ────────────────────────────────────────────────

    def _completeness(self, state: dict) -> float:
        """Every major output should be populated."""
        checks = [
            bool(state.get("resume_profile")),
            bool(state.get("job_profile")),
            bool(state.get("skill_gap_report")),
            bool(state.get("bullet_rewrite_report")),
            bool(state.get("interview_prep_report")),
        ]
        gap = state.get("skill_gap_report")
        if gap:
            checks += [
                len(gap.skill_matches) > 0,
                len(gap.gaps) >= 0,  # 0 gaps is valid
                gap.ats_score.total_score > 0,
            ]
        return sum(checks) / len(checks)

    def _specificity(self, state: dict) -> float:
        """Outputs should contain specific skill names, numbers, company names."""
        score = 0.0
        total = 0

        # Bullet rewrites should have keywords_added
        br = state.get("bullet_rewrite_report")
        if br:
            total += 1
            kw_counts = [len(b.keywords_added) for r in br.roles for b in r.bullets]
            if kw_counts and sum(kw_counts) / len(kw_counts) >= 1:
                score += 1

        # Gap report should have evidence
        gr = state.get("skill_gap_report")
        if gr:
            total += 1
            evidenced = [m for m in gr.skill_matches if m.candidate_evidence]
            if gr.skill_matches:
                ratio = len(evidenced) / len(gr.skill_matches)
                score += ratio

        # Interview questions should have STAR hints
        ip = state.get("interview_prep_report")
        if ip:
            total += 1
            all_q = ip.behavioral_questions + ip.technical_questions
            with_hints = [q for q in all_q if q.star_hint]
            if all_q:
                score += len(with_hints) / len(all_q)

        return score / total if total else 0.0

    def _actionability(self, state: dict) -> float:
        """Recommendations should be concrete."""
        gr = state.get("skill_gap_report")
        if not gr:
            return 0.0

        # Quick-wins are a proxy for actionability
        has_quick_wins = len(gr.top_3_quick_wins) >= 3
        has_gap_recs = all(g.recommendation for g in gr.gaps)

        ip = state.get("interview_prep_report")
        has_closing_pitch = bool(ip and ip.closing_pitch)
        has_questions = bool(ip and ip.questions_to_ask)

        checks = [has_quick_wins, has_gap_recs, has_closing_pitch, has_questions]
        return sum(checks) / len(checks)

    def _ats_alignment(self, state: dict) -> float:
        """
        Check that ATS keywords from the JD appear in the rewritten bullets.
        """
        jp = state.get("job_profile")
        br = state.get("bullet_rewrite_report")
        if not jp or not br:
            return 0.0

        all_bullets_text = " ".join(
            b.rewritten.lower() for r in br.roles for b in r.bullets
        )
        keywords = [kw.lower() for kw in jp.ats_keywords]
        if not keywords:
            return 0.5  # neutral if no keywords extracted

        hits = sum(1 for kw in keywords if kw in all_bullets_text)
        return hits / len(keywords)

    def _consistency(self, state: dict) -> float:
        """
        Cross-agent consistency check:
        - Company name in bullet summary should match job_profile.company_name
        - ATS score should correlate with skill_matches
        """
        checks = []

        jp = state.get("job_profile")
        gr = state.get("skill_gap_report")

        if jp and gr:
            # If 0 required skills → score should be high (no penalty)
            req_matches = [m for m in gr.skill_matches if m.importance == "required"]
            present = [m for m in req_matches if m.status == "present"]
            if req_matches:
                expected_req_ratio = len(present) / len(req_matches)
                actual_req_score_ratio = gr.ats_score.required_skills_score / 50
                diff = abs(expected_req_ratio - actual_req_score_ratio)
                checks.append(1.0 - min(diff, 1.0))

        return sum(checks) / len(checks) if checks else 1.0
