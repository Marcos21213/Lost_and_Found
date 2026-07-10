"""Post-to-vector synchronization helpers."""

from __future__ import annotations

from mcp_client import embedding_text
from vector.chroma import add_vector, delete_vector_by_post_id


async def upsert_post_vector(post_id: int, post_type: str, category: str, description: str) -> str:
    """Generate an embedding for a post description and upsert it into ChromaDB."""
    embedding = await embedding_text(description)
    try:
        return add_vector(
            post_id=post_id,
            embedding=embedding,
            post_type=post_type,
            category=category,
            document=description,
        )
    except Exception:
        return ""


def delete_post_vector(post_id: int) -> None:
    """Delete the ChromaDB vector bound to a post id."""
    try:
        delete_vector_by_post_id(post_id)
    except Exception:
        return
