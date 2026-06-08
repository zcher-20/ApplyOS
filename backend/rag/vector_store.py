"""
vector_store.py — Pluggable vector store with Chroma (default), FAISS, Pinecone, Weaviate.
All stores expose the same VectorStoreClient interface so agents never touch
provider-specific code.
"""

from __future__ import annotations

import os
from abc import ABC, abstractmethod
from typing import List, Optional

from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_openai import OpenAIEmbeddings


# ──────────────────────────────────────────────────────────────────────────────
# Abstract interface
# ──────────────────────────────────────────────────────────────────────────────

class VectorStoreClient(ABC):
    """Minimal interface every backend must implement."""

    @abstractmethod
    def add_documents(self, docs: List[Document], namespace: str) -> None: ...

    @abstractmethod
    def similarity_search(
        self,
        query: str,
        namespace: str,
        k: int = 5,
        filter: Optional[dict] = None,
    ) -> List[Document]: ...

    @abstractmethod
    def delete_namespace(self, namespace: str) -> None: ...


# ──────────────────────────────────────────────────────────────────────────────
# Chroma (default — zero-config, local)
# ──────────────────────────────────────────────────────────────────────────────

class ChromaStore(VectorStoreClient):
    """
    Persistent Chroma store.  Each `namespace` maps to a Chroma collection so
    that resume, job description, and company docs stay separated.
    """

    def __init__(self, embeddings: Embeddings, persist_dir: str):
        import chromadb
        from langchain_community.vectorstores import Chroma

        self._embeddings = embeddings
        self._persist_dir = persist_dir
        self._client = chromadb.PersistentClient(path=persist_dir)
        self._Chroma = Chroma

    def _store(self, namespace: str):
        return self._Chroma(
            client=self._client,
            collection_name=namespace,
            embedding_function=self._embeddings,
        )

    def add_documents(self, docs: List[Document], namespace: str) -> None:
        store = self._store(namespace)
        store.add_documents(docs)

    def similarity_search(
        self,
        query: str,
        namespace: str,
        k: int = 5,
        filter: Optional[dict] = None,
    ) -> List[Document]:
        store = self._store(namespace)
        return store.similarity_search(query, k=k, filter=filter)

    def delete_namespace(self, namespace: str) -> None:
        self._client.delete_collection(namespace)


# ──────────────────────────────────────────────────────────────────────────────
# FAISS (in-memory, great for CI / testing)
# ──────────────────────────────────────────────────────────────────────────────

class FAISSStore(VectorStoreClient):
    """
    In-memory FAISS store.  Namespaces are kept as separate FAISS indices in a
    dict.  Not persistent across restarts — ideal for demos and testing.
    """

    def __init__(self, embeddings: Embeddings):
        from langchain_community.vectorstores import FAISS

        self._embeddings = embeddings
        self._FAISS = FAISS
        self._stores: dict[str, FAISS] = {}

    def add_documents(self, docs: List[Document], namespace: str) -> None:
        if namespace in self._stores:
            self._stores[namespace].add_documents(docs)
        else:
            self._stores[namespace] = self._FAISS.from_documents(
                docs, self._embeddings
            )

    def similarity_search(
        self,
        query: str,
        namespace: str,
        k: int = 5,
        filter: Optional[dict] = None,
    ) -> List[Document]:
        if namespace not in self._stores:
            return []
        return self._stores[namespace].similarity_search(query, k=k)

    def delete_namespace(self, namespace: str) -> None:
        self._stores.pop(namespace, None)


# ──────────────────────────────────────────────────────────────────────────────
# Pinecone
# ──────────────────────────────────────────────────────────────────────────────

class PineconeStore(VectorStoreClient):
    """
    Pinecone serverless store.  Each namespace maps to a Pinecone namespace
    within a single index (cheaper than one index per namespace).
    """

    def __init__(self, embeddings: Embeddings, index_name: str):
        import pinecone
        from langchain_community.vectorstores import Pinecone as LCPinecone

        pinecone.init(
            api_key=os.environ["PINECONE_API_KEY"],
            environment=os.environ["PINECONE_ENVIRONMENT"],
        )
        self._embeddings = embeddings
        self._index_name = index_name
        self._LCPinecone = LCPinecone

    def add_documents(self, docs: List[Document], namespace: str) -> None:
        self._LCPinecone.from_documents(
            docs,
            self._embeddings,
            index_name=self._index_name,
            namespace=namespace,
        )

    def similarity_search(
        self,
        query: str,
        namespace: str,
        k: int = 5,
        filter: Optional[dict] = None,
    ) -> List[Document]:
        store = self._LCPinecone.from_existing_index(
            self._index_name,
            self._embeddings,
            namespace=namespace,
        )
        return store.similarity_search(query, k=k, filter=filter)

    def delete_namespace(self, namespace: str) -> None:
        import pinecone

        index = pinecone.Index(self._index_name)
        index.delete(delete_all=True, namespace=namespace)


# ──────────────────────────────────────────────────────────────────────────────
# Factory
# ──────────────────────────────────────────────────────────────────────────────

def build_vector_store(backend: str | None = None) -> VectorStoreClient:
    """
    Return the right VectorStoreClient based on VECTOR_STORE env var (or arg).

    Supported values: chroma (default), faiss, pinecone
    """
    backend = backend or os.getenv("VECTOR_STORE", "chroma")
    embeddings = OpenAIEmbeddings(model=os.getenv("EMBEDDING_MODEL", "text-embedding-3-small"))

    if backend == "faiss":
        return FAISSStore(embeddings=embeddings)
    elif backend == "pinecone":
        return PineconeStore(
            embeddings=embeddings,
            index_name=os.getenv("PINECONE_INDEX_NAME", "applyos"),
        )
    else:  # default: chroma
        persist_dir = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma_db")
        os.makedirs(persist_dir, exist_ok=True)
        return ChromaStore(embeddings=embeddings, persist_dir=persist_dir)
