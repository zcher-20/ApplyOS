"""
tests/test_pipeline.py — Integration + unit tests for ApplyOS.

Run with: pytest tests/ -v
"""

import json
import pytest
from unittest.mock import MagicMock, patch
from langchain_core.documents import Document


# ──────────────────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────────────────

SAMPLE_RESUME = """
Jane Smith | jane@example.com | github.com/janesmith
Senior Software Engineer with 7 years building high-scale distributed systems in Python.

EXPERIENCE
Acme Corp — Software Engineer II (2020–2024)
- Reduced P99 query latency by 60% on a 50M-row PostgreSQL database
- Led migration of Python monolith to 12 microservices
- Built REST APIs serving 10M daily requests

StartupXYZ — Junior Engineer (2018–2020)
- Shipped 3 major product features in Django/React stack

SKILLS
Python, PostgreSQL, Docker, Redis, REST APIs, Git, AWS, System Design

EDUCATION
BS Computer Science — State University (2018)
"""

SAMPLE_JD = """
Senior Software Engineer — Stripe (San Francisco, CA)

We are looking for a Senior Software Engineer to join our Payments Infrastructure team.

Required:
- 5+ years Python or Go
- Experience with distributed systems and microservices
- PostgreSQL or other relational databases at scale
- Strong API design skills
- Kubernetes production experience
- gRPC

Preferred:
- Experience with Kafka or similar message queues
- Go language
- SLO/SLI experience

You will be responsible for designing and maintaining payment processing systems
that handle millions of transactions per day.
"""


@pytest.fixture
def mock_vector_store():
    vs = MagicMock()
    vs.similarity_search.return_value = [
        Document(page_content=SAMPLE_RESUME[:500], metadata={"doc_type": "resume", "source": "test.pdf", "chunk_index": 0}),
    ]
    return vs


@pytest.fixture
def mock_retriever(mock_vector_store):
    from backend.rag.retriever import MultiNamespaceRetriever
    r = MultiNamespaceRetriever(mock_vector_store, session_id="test-session")
    return r


# ──────────────────────────────────────────────────────────────────────────────
# RAG tests
# ──────────────────────────────────────────────────────────────────────────────

class TestRetriever:
    def test_retrieve_returns_docs(self, mock_retriever):
        docs = mock_retriever.retrieve("python skills", doc_types=["resume"], k=3)
        assert isinstance(docs, list)
        assert len(docs) <= 3

    def test_format_context_non_empty(self, mock_retriever):
        docs = mock_retriever.retrieve("skills", k=2)
        ctx = mock_retriever.format_context(docs)
        assert "[1]" in ctx

    def test_format_context_empty(self, mock_retriever):
        ctx = mock_retriever.format_context([])
        assert "no relevant context" in ctx

    def test_deduplicate_identical_docs(self, mock_vector_store):
        from backend.rag.retriever import _deduplicate
        doc = Document(page_content="hello world", metadata={})
        result = _deduplicate([doc, doc, doc])
        assert len(result) == 1


class TestIngest:
    def test_ingest_text(self, mock_vector_store):
        from backend.rag.ingest import ingest_text
        chunks = ingest_text(
            text=SAMPLE_RESUME,
            doc_type="resume",
            session_id="test-session",
            vector_store=mock_vector_store,
        )
        assert len(chunks) > 0
        assert all(c.metadata["doc_type"] == "resume" for c in chunks)
        assert all("chunk_index" in c.metadata for c in chunks)

    def test_ingest_text_metadata(self, mock_vector_store):
        from backend.rag.ingest import ingest_text
        chunks = ingest_text(
            text="Short text for testing",
            doc_type="job_description",
            session_id="sess-123",
            vector_store=mock_vector_store,
            source_label="my_jd",
        )
        assert chunks[0].metadata["session_id"] == "sess-123"
        assert chunks[0].metadata["source"] == "my_jd"

    def test_namespace_format(self):
        from backend.rag.ingest import _namespace
        # Private helper — test the namespace format
        ns = _namespace("abc", "resume")
        assert ns == "abc__resume"


# ──────────────────────────────────────────────────────────────────────────────
# Agent tests (mocked LLM)
# ──────────────────────────────────────────────────────────────────────────────

class TestSkillGapAgent:
    def test_ats_score_bounds(self):
        """ATS total should never exceed 100 or go below 0."""
        from backend.agents.skill_gap_agent import ATSScoreBreakdown

        score = ATSScoreBreakdown(
            required_skills_score=50,
            preferred_skills_score=25,
            keyword_coverage_score=15,
            experience_alignment_score=10,
            total_score=100,
        )
        assert score.total_score == 100
        total = (
            score.required_skills_score
            + score.preferred_skills_score
            + score.keyword_coverage_score
            + score.experience_alignment_score
        )
        assert total == 100

    def test_gap_effort_values(self):
        from backend.agents.skill_gap_agent import GapItem
        # Should not raise for valid effort values
        g = GapItem(skill="gRPC", importance="required",
                    recommendation="Build a toy service", effort="quick-win")
        assert g.effort == "quick-win"


# ──────────────────────────────────────────────────────────────────────────────
# Evaluation tests
# ──────────────────────────────────────────────────────────────────────────────

class TestScoringRubric:
    def test_completeness_all_present(self):
        from backend.evaluation.scoring_rubric import ScoringRubric
        from backend.agents.resume_parser_agent import ResumeProfile
        from backend.agents.job_analyzer_agent import JobProfile
        from backend.agents.skill_gap_agent import SkillGapReport, ATSScoreBreakdown

        rubric = ScoringRubric()
        state = {
            "resume_profile": ResumeProfile(full_name="Jane"),
            "job_profile": JobProfile(job_title="SWE", company_name="Stripe"),
            "skill_gap_report": SkillGapReport(
                ats_score=ATSScoreBreakdown(
                    required_skills_score=30, preferred_skills_score=15,
                    keyword_coverage_score=10, experience_alignment_score=8,
                    total_score=63
                ),
                skill_matches=[],
                gaps=[],
                keyword_hits=[],
                keyword_misses=[],
                overall_verdict="Test",
                top_3_quick_wins=["a", "b", "c"],
            ),
            "bullet_rewrite_report": None,
            "interview_prep_report": None,
        }
        scores = rubric.score(state)
        assert "completeness" in scores
        assert 0.0 <= scores["completeness"] <= 1.0

    def test_ats_alignment_no_job(self):
        from backend.evaluation.scoring_rubric import ScoringRubric
        rubric = ScoringRubric()
        score = rubric._ats_alignment({"job_profile": None, "bullet_rewrite_report": None})
        assert score == 0.0


class TestHallucinationChecker:
    def test_ats_score_sanity_pass(self):
        from backend.evaluation.hallucination_checker import HallucinationChecker
        from backend.agents.skill_gap_agent import SkillGapReport, ATSScoreBreakdown

        checker = HallucinationChecker()
        state = {
            "skill_gap_report": SkillGapReport(
                ats_score=ATSScoreBreakdown(
                    required_skills_score=40,
                    preferred_skills_score=20,
                    keyword_coverage_score=12,
                    experience_alignment_score=8,
                    total_score=80,  # matches sum
                ),
                skill_matches=[], gaps=[], keyword_hits=[], keyword_misses=[],
                overall_verdict="ok", top_3_quick_wins=[],
            ),
            "bullet_rewrite_report": None,
            "interview_prep_report": None,
            "company_doc_paths": [],
        }
        flags = checker._check_ats_score(state)
        assert len(flags) == 0

    def test_ats_score_sanity_fail(self):
        from backend.evaluation.hallucination_checker import HallucinationChecker
        from backend.agents.skill_gap_agent import SkillGapReport, ATSScoreBreakdown

        checker = HallucinationChecker()
        state = {
            "skill_gap_report": SkillGapReport(
                ats_score=ATSScoreBreakdown(
                    required_skills_score=40,
                    preferred_skills_score=20,
                    keyword_coverage_score=12,
                    experience_alignment_score=8,
                    total_score=99,  # wrong!
                ),
                skill_matches=[], gaps=[], keyword_hits=[], keyword_misses=[],
                overall_verdict="ok", top_3_quick_wins=[],
            ),
        }
        flags = checker._check_ats_score(state)
        assert len(flags) == 1
        assert "sub-scores" in flags[0]


# ──────────────────────────────────────────────────────────────────────────────
# Database model tests
# ──────────────────────────────────────────────────────────────────────────────

class TestModels:
    def test_init_db_sqlite(self, tmp_path):
        from backend.database.models import init_db, get_engine, Base
        url = f"sqlite:///{tmp_path}/test.db"
        init_db(url)
        engine = get_engine(url)
        # Tables should now exist
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        assert "application_sessions" in tables
        assert "analysis_results" in tables
        assert "user_feedback" in tables
