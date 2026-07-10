"""AI semantic search API routes."""

from __future__ import annotations

from math import ceil

from fastapi import APIRouter

from core.config import settings
from core.response import success_response
from db.sqlite import db_connection
from mcp_client import embedding_text
from schemas.search import SemanticSearchRequest
from vector.chroma import similarity_search


router = APIRouter(prefix="/api/search", tags=["AI语义搜索"])


def _parse_img_list(value: str | None) -> list[str]:
    import json

    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


def _post_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "post_type": row["post_type"],
        "goods_name": row["goods_name"],
        "category": row["category"],
        "location": row["location"],
        "happen_time": row["happen_time"],
        "description": row["description"],
        "img_list": _parse_img_list(row["img_list"]),
        "contact": row["contact"],
        "status": row["status"],
        "create_time": row["create_time"],
    }


def _preprocess_search_text(keyword: str) -> str:
    return " ".join(keyword.strip().split())


@router.post("", summary="AI语义相似度搜索")
async def semantic_search(payload: SemanticSearchRequest):
    """文本预处理后调用 MCP Embedding，查询 ChromaDB Top15，再回表组装分页帖子数据。"""
    query_text = _preprocess_search_text(payload.keyword)
    query_embedding = await embedding_text(query_text)
    try:
        vector_results = similarity_search(query_embedding, top_n=15)
    except Exception:
        vector_results = []
    vector_results = [
        item
        for item in vector_results
        if item.get("post_id") is not None and item.get("similarity", 0) >= settings.vector_similarity_threshold
    ]

    post_ids = [int(item["post_id"]) for item in vector_results]
    if not post_ids:
        return success_response(
            {
                "items": [],
                "page": payload.page,
                "page_size": payload.page_size,
                "total": 0,
                "total_pages": 0,
            }
        )

    placeholders = ",".join("?" for _ in post_ids)
    similarity_map = {int(item["post_id"]): float(item["similarity"]) for item in vector_results}
    with db_connection() as connection:
        rows = connection.execute(
            f"""
            SELECT * FROM post
            WHERE id IN ({placeholders}) AND status = ?
            """,
            [*post_ids, "open"],
        ).fetchall()

    items = []
    for row in rows:
        item = _post_to_dict(row)
        item["similarity"] = similarity_map[item["id"]]
        items.append(item)

    items.sort(key=lambda item: item["similarity"], reverse=True)
    total = len(items)
    start = (payload.page - 1) * payload.page_size
    end = start + payload.page_size

    return success_response(
        {
            "items": items[start:end],
            "page": payload.page,
            "page_size": payload.page_size,
            "total": total,
            "total_pages": ceil(total / payload.page_size) if total else 0,
        }
    )
