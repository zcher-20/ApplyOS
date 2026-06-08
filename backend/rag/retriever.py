"""
retriever.py — Multi-namespace retriever for the ApplyOS RAG pipeline.

Agents call `retrieve()` with a query and a list of doc_types.  Results from
all requested namespaces are merged, deduplicated, and ranked by relevance
before being returned as a flat list.
"""

from __future__ import annotations

import logging
from typing import List

from langchain_core.documents import Document

from .vector_store import VectorStoreClient

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Retriever
# ──────────────────────────────────────────────────────────────────────────────

class MultiNamespaceRetriever:
    """
    Retrieve from one or more namespaces and fuse the results.

    Parameters
    ----------
    vector_store : VectorStoreClient
        The pluggable vector store backend.
    session_id : str
        Isolates this user's documents from all others.
    k_per_namespace : int
        Number of chunks to pull from each namespace before fusion.
    """

    def __init__(
        self,
        vector_store: VectorStoreClient,
        session_id: str,
        k_per_namespace: int = 5,
    ):
        self._store = vector_store
        self._session_id = session_id
        self._k = k_per_namespace

    # ── public ──────────────────────────────────────────────────────────────

    def retrieve(
        self,
        query: str,
        doc_types: List[str] | None = None,
        k: int | None = None,
    ) -> List[Document]:
        """
        Search across the given doc_types and return fused, deduplicated chunks.

        Parameters
        ----------
        query : str
            The search query (natural language).
        doc_types : list[str], optional
            Subset of ["resume", "job_description", "company_doc"].
            Defaults to all three.
        k : int, optional
            Final number of chunks to return.  Defaults to k_per_namespace.
        """
        doc_types = doc_types or ["resume", "job_description", "company_doc"]
        final_k = k or self._k

        all_docs: List[Document] = []
        for doc_type in doc_types:
            namespace = f"{self._session_id}__{doc_type}"
            try:
                results = self._store.similarity_search(
                    query, namespace=namespace, k=self._k
                )
                all_docs.extend(results)
            except Exception as exc:
                # Namespace might not exist yet (no docs of that type uploaded)
                logger.debug("Namespace %s not found or empty: %s", namespace, exc)

        deduped = _deduplicate(all_docs)
        ranked = deduped[:final_k]

        logger.debug(
            "retrieve: query=%r types=%s raw=%d deduped=%d returned=%d",
            query[:60],
            doc_types,
            len(all_docs),
            len(deduped),
            len(ranked),
        )
        return ranked

    def retrieve_resume(self, query: str, k: int = 5) -> List[Document]:
        return self.retrieve(query, doc_types=["resume"], k=k)

    def retrieve_job(self, query: str, k: int = 5) -> List[Document]:
        return self.retrieve(query, doc_types=["job_description"], k=k)

    def retrieve_company(self, query: str, k: int = 5) -> List[Document]:
        return self.retrieve(query, doc_types=["company_doc"], k=k)

    def format_context(self, docs: List[Document]) -> str:
        """
        Format a list of Document chunks into a numbered context block
        suitable for inclusion in an LLM prompt.
        """
        if not docs:
            return "(no relevant context found)"

        sections = []
        for i, doc in enumerate(docs, start=1):
            meta = doc.metadata
            label = (
                f"[{i}] Source: {meta.get('source', 'unknown')} "
                f"| Type: {meta.get('doc_type', '?')} "
                f"| Chunk: {meta.get('chunk_index', '?')}"
            )
            sections.append(f"{label}\n{doc.page_content.strip()}")

        return "\n\n---\n\n".join(sections)


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _deduplicate(docs: List[Document]) -> List[Document]:
    """Remove exact-duplicate chunks (same page_content)."""
    seen: set[str] = set()
    unique: List[Document] = []
    for doc in docs:
        key = doc.page_content.strip()
        if key not in seen:
            seen.add(key)
            unique.append(doc)
    return unique
