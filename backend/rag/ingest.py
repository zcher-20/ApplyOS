"""
ingest.py — Document ingestion pipeline.

Handles:
  • PDF resumes (via pypdf / unstructured)
  • Plain-text job descriptions
  • Company web pages / markdown notes
  • DOCX files

Each document is split into chunks, enriched with metadata, and upserted
into the vector store under a session-scoped namespace so multiple users
never bleed into each other.
"""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path
from typing import List, Literal

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from .vector_store import VectorStoreClient

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Splitter config
# ──────────────────────────────────────────────────────────────────────────────

SPLITTER = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=64,
    separators=["\n\n", "\n", ". ", " ", ""],
)

DocType = Literal["resume", "job_description", "company_doc"]


# ──────────────────────────────────────────────────────────────────────────────
# Loaders
# ──────────────────────────────────────────────────────────────────────────────

def _load_pdf(path: Path) -> str:
    """Extract text from PDF using pypdf with unstructured fallback."""
    try:
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        if len(text.strip()) > 100:
            return text
    except Exception as e:
        logger.warning("pypdf failed (%s), falling back to unstructured", e)

    # Fallback: unstructured handles scanned / image PDFs
    from unstructured.partition.pdf import partition_pdf

    elements = partition_pdf(str(path))
    return "\n".join(str(el) for el in elements)


def _load_docx(path: Path) -> str:
    from docx import Document as DocxDocument

    doc = DocxDocument(str(path))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def _load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def _load_file(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _load_pdf(path)
    elif suffix in (".docx", ".doc"):
        return _load_docx(path)
    else:
        return _load_text(path)


# ──────────────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────────────

def ingest_file(
    path: str | Path,
    doc_type: DocType,
    session_id: str,
    vector_store: VectorStoreClient,
    extra_metadata: dict | None = None,
) -> List[Document]:
    """
    Load, chunk, annotate, and store a file.

    Returns the list of Document chunks that were upserted.
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    raw_text = _load_file(path)
    doc_hash = hashlib.md5(raw_text.encode()).hexdigest()[:8]

    base_meta = {
        "doc_type": doc_type,
        "session_id": session_id,
        "source": path.name,
        "doc_hash": doc_hash,
        **(extra_metadata or {}),
    }

    chunks = SPLITTER.create_documents(
        texts=[raw_text],
        metadatas=[{**base_meta, "chunk_index": i} for i in range(1)],
    )

    # Fix chunk_index after splitting (create_documents collapses to 1 meta)
    for i, chunk in enumerate(chunks):
        chunk.metadata["chunk_index"] = i

    namespace = _namespace(session_id, doc_type)
    vector_store.add_documents(chunks, namespace=namespace)

    logger.info(
        "Ingested %d chunks | file=%s type=%s session=%s",
        len(chunks),
        path.name,
        doc_type,
        session_id,
    )
    return chunks


def ingest_text(
    text: str,
    doc_type: DocType,
    session_id: str,
    vector_store: VectorStoreClient,
    source_label: str = "inline",
    extra_metadata: dict | None = None,
) -> List[Document]:
    """Ingest raw text (e.g. job description pasted into the UI)."""
    doc_hash = hashlib.md5(text.encode()).hexdigest()[:8]

    base_meta = {
        "doc_type": doc_type,
        "session_id": session_id,
        "source": source_label,
        "doc_hash": doc_hash,
        **(extra_metadata or {}),
    }

    chunks = SPLITTER.create_documents(texts=[text], metadatas=[base_meta])
    for i, chunk in enumerate(chunks):
        chunk.metadata["chunk_index"] = i

    namespace = _namespace(session_id, doc_type)
    vector_store.add_documents(chunks, namespace=namespace)

    logger.info(
        "Ingested %d chunks | source=%s type=%s session=%s",
        len(chunks),
        source_label,
        doc_type,
        session_id,
    )
    return chunks


def clear_session(session_id: str, vector_store: VectorStoreClient) -> None:
    """Delete all namespaces for a session (e.g. on reset)."""
    for doc_type in ("resume", "job_description", "company_doc"):
        vector_store.delete_namespace(_namespace(session_id, doc_type))
    logger.info("Cleared session %s", session_id)


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _namespace(session_id: str, doc_type: str) -> str:
    """Stable namespace string for a (session, doc_type) pair."""
    return f"{session_id}__{doc_type}"
