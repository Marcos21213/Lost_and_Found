"""ChromaDB collection initialization and vector operations."""

from __future__ import annotations

from typing import Any, Sequence

from core.config import settings


_client: Any = None
_collection: Any = None


def _vector_id(post_id: int) -> str:
    return f"post_{post_id}"


def get_chroma_client():
    global _client

    if _client is None:
        try:
            import chromadb
        except ImportError as exc:
            raise RuntimeError("chromadb is not installed. Install dependencies from requirements.txt.") from exc

        settings.chroma_persist_dir_path.mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(path=str(settings.chroma_persist_dir_path))
    return _client


def get_vector_collection():
    global _collection

    if _collection is None:
        client = get_chroma_client()
        _collection = client.get_or_create_collection(
            name=settings.chroma_collection_name,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def init_chroma_collection():
    return get_vector_collection()


def build_vector_metadata(post_id: int, post_type: str, category: str) -> dict[str, Any]:
    return {
        "post_id": int(post_id),
        "post_type": str(post_type),
        "category": str(category),
    }


def add_vector(
    post_id: int,
    embedding: Sequence[float],
    post_type: str,
    category: str,
    document: str = "",
) -> str:
    collection = get_vector_collection()
    vector_id = _vector_id(post_id)

    collection.upsert(
        ids=[vector_id],
        embeddings=[list(embedding)],
        metadatas=[build_vector_metadata(post_id, post_type, category)],
        documents=[document],
    )
    return vector_id


def delete_vector_by_post_id(post_id: int) -> None:
    collection = get_vector_collection()
    collection.delete(where={"post_id": int(post_id)})


def similarity_search(query_embedding: Sequence[float], top_n: int = 5) -> list[dict[str, Any]]:
    if top_n <= 0:
        return []

    collection = get_vector_collection()
    raw_results = collection.query(
        query_embeddings=[list(query_embedding)],
        n_results=top_n,
        include=["metadatas", "distances", "documents"],
    )

    ids = (raw_results.get("ids") or [[]])[0]
    metadatas = (raw_results.get("metadatas") or [[]])[0]
    distances = (raw_results.get("distances") or [[]])[0]
    documents = (raw_results.get("documents") or [[]])[0]

    results: list[dict[str, Any]] = []
    for index, vector_id in enumerate(ids):
        distance = distances[index] if index < len(distances) else None
        similarity = 1 - float(distance) if distance is not None else 0.0

        if similarity < settings.vector_similarity_threshold:
            continue

        metadata = metadatas[index] if index < len(metadatas) and metadatas[index] else {}
        document = documents[index] if index < len(documents) else ""
        results.append(
            {
                "id": vector_id,
                "post_id": metadata.get("post_id"),
                "post_type": metadata.get("post_type"),
                "category": metadata.get("category"),
                "similarity": similarity,
                "distance": distance,
                "document": document,
                "metadata": metadata,
            }
        )

    return results
