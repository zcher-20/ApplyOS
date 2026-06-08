# ApplyOS 
### Agentic Resume + Job Intelligence Platform

> **Multi-agent RAG system** using Python, LangChain, and LangGraph that analyzes job postings, retrieves evidence from resume and company documents, scores candidate-role alignment, and generates structured resume and interview outputs with source-grounded reasoning.

---

## ✨ What It Does

| Output | Description |
|--------|-------------|
|  **ATS Match Score** | 0–100 score with sub-score breakdown (required skills, preferred skills, keyword density, experience alignment) |
|  **Skill Gap Analysis** | Per-skill match status with evidence from the resume; prioritized gap remediation with effort tiers |
|  **Tailored Resume Bullets** | Rewrites every bullet to embed ATS keywords, front-load action verbs, and quantify impact |
|  **Interview Prep** | Behavioral + technical + company-specific questions with STAR scaffolds |
|  **Company Talking Points** | RAG-grounded evidence from company docs / notes |
|  **Quality Evaluation** | Hallucination checker (LLM judge) + rule-based rubric across 5 dimensions |

---

## 🏗️ Architecture

<img width="719" height="416" alt="Screenshot 2026-06-07 at 9 57 56 PM" src="https://github.com/user-attachments/assets/71497b2b-84c7-4941-8542-1818216d7ac0" />

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Orchestration** | LangGraph `StateGraph` (parallel nodes, typed state) |
| **Agents** | LangChain + GPT-4o (structured output via function calling) |
| **RAG** | Multi-namespace ChromaDB · `text-embedding-3-small` |
| **Alt Vector DBs** | FAISS (in-memory) · Pinecone (serverless) |
| **Document Parsing** | pypdf · python-docx · unstructured |
| **Text Splitting** | `RecursiveCharacterTextSplitter` (512 tokens, 64 overlap) |
| **Structured Outputs** | Pydantic v2 schemas per agent |
| **Backend** | FastAPI · Uvicorn · SQLAlchemy · PostgreSQL |
| **Evaluation** | LLM judge (GPT-4o-mini) + rule-based rubric (5 dimensions) |
| **Frontend** | React + Syne/JetBrains Mono fonts |

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/yourname/applyos
cd applyos

# 2. Install
pip install -r requirements.txt

# 3. Configure
cp .env.example .env
# → add your OPENAI_API_KEY

# 4. Start backend
uvicorn backend.main:app --reload --port 8000

# 5. Open frontend
# Open frontend/App.jsx in your React dev server (Vite / CRA)
```

---

## 📡 API Reference

### `POST /analyze`
Run the full multi-agent pipeline.

**Body:**
```json
{
  "job_description": "Senior Software Engineer at Stripe...",
  "resume_text": "John Doe\njohn@example.com\n...",
  "session_id": null
}
```

**Response:** Full `AnalyzeResponse` with all agent outputs.

### `POST /upload/resume`
Upload a resume PDF/DOCX. Returns `session_id`.

### `GET /sessions`
List saved application sessions.

### `GET /sessions/{id}`
Get detailed results for a session.

---

## 📈 Evaluation Metrics

| Dimension | Method | Target |
|-----------|--------|--------|
| **Completeness** | Rule: all fields populated | > 0.95 |
| **Specificity** | Rule: evidence quotes, keyword counts | > 0.80 |
| **Actionability** | Rule: quick-wins, recs with effort tiers | > 0.85 |
| **ATS Alignment** | Rule: keyword overlap resume↔bullets | > 0.70 |
| **Consistency** | Rule: sub-score math, cross-agent facts | > 0.90 |
| **Hallucination** | LLM judge (GPT-4o-mini) | 0 flags |

---

## 📁 Project Structure

```
ApplyOS/
├── backend/
│   ├── main.py                     # FastAPI app
│   ├── graph.py                    # LangGraph StateGraph
│   ├── agents/
│   │   ├── resume_parser_agent.py  # Structured resume extraction
│   │   ├── job_analyzer_agent.py   # JD analysis + ATS keyword extraction
│   │   ├── skill_gap_agent.py      # ATS scoring + gap analysis
│   │   ├── bullet_rewriter_agent.py # Resume bullet optimization
│   │   └── interview_prep_agent.py  # Interview Q&A generation
│   ├── rag/
│   │   ├── ingest.py               # Document loading + chunking
│   │   ├── retriever.py            # Multi-namespace RAG retriever
│   │   └── vector_store.py         # Pluggable vector store (Chroma/FAISS/Pinecone)
│   ├── evaluation/
│   │   ├── hallucination_checker.py # LLM judge
│   │   └── scoring_rubric.py        # Rule-based quality scoring
│   └── database/
│       └── models.py               # SQLAlchemy ORM
├── frontend/
│   └── App.jsx                     # React UI (5-tab results dashboard)
├── data/
│   ├── uploads/                    # User-uploaded files (per session)
│   └── chroma_db/                  # Persistent vector store
├── tests/
├── requirements.txt
├── .env.example
└── README.md
```

---

## 🔑 Key Technical Decisions

**Why LangGraph over a simple LangChain chain?**
LangGraph enables a proper stateful DAG with parallel node execution — `parse_resume` and `analyze_job` run concurrently, then `skill_gap` waits for both. This cuts wall-clock time vs sequential chains and gives us retry/interrupt semantics at the node level.

**Why multi-namespace RAG?**
Keeping resume, job description, and company docs in separate Chroma collections prevents cross-contamination — the bullet rewriter retrieves only from the resume namespace, while talking-point generation retrieves only from company docs.

**Why Pydantic structured outputs?**
Each agent returns a typed schema via GPT-4o function calling. Downstream agents consume typed objects — no prompt engineering to parse free text, no silent failures from malformed JSON.

---

*Built for the ApplyOS portfolio · MIT License*
