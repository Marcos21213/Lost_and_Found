"""Comment and collect interaction API routes."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.response import success_response
from db.sqlite import db_connection
from dependencies.auth import get_current_user
from schemas.interact import CommentCreateRequest


router = APIRouter(prefix="/api/interact", tags=["留言收藏互动"])


def _parse_img_list(value: str | None) -> list[str]:
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


def _comment_to_dict(row) -> dict:
    item = {
        "id": row["id"],
        "post_id": row["post_id"],
        "user_id": row["user_id"],
        "content": row["content"],
        "create_time": row["create_time"],
    }
    if "username" in row.keys():
        item["user"] = {
            "id": row["user_id"],
            "username": row["username"] or "校园用户",
            "avatar": row["avatar"] or "",
        }
    return item


def _pagination(page: int, page_size: int) -> tuple[int, int]:
    return page_size, (page - 1) * page_size


@router.get("/comments/{post_id}", summary="帖子留言列表")
async def list_post_comments(
    post_id: int,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    current_user: dict = Depends(get_current_user),
):
    """分页查询指定帖子的留言，并返回留言用户公开信息。"""
    limit, offset = _pagination(page, page_size)
    with db_connection() as connection:
        total = connection.execute("SELECT COUNT(*) AS count FROM comment WHERE post_id = ?", (post_id,)).fetchone()["count"]
        rows = connection.execute(
            """
            SELECT c.*, u.username, u.avatar
            FROM comment c
            LEFT JOIN user u ON u.id = c.user_id
            WHERE c.post_id = ?
            ORDER BY c.create_time ASC, c.id ASC
            LIMIT ? OFFSET ?
            """,
            (post_id, limit, offset),
        ).fetchall()

    return success_response(
        {
            "items": [_comment_to_dict(row) for row in rows],
            "page": page,
            "page_size": page_size,
            "total": total,
        }
    )


@router.post("/comment", summary="新增留言")
async def create_comment(payload: CommentCreateRequest, current_user: dict = Depends(get_current_user)):
    """登录用户给未下架帖子新增留言，留言内容使用 Pydantic 校验长度和空值。"""
    with db_connection() as connection:
        post = connection.execute("SELECT id FROM post WHERE id = ? AND status = ?", (payload.post_id, "open")).fetchone()
        if post is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="post not found or not approved")

        cursor = connection.execute(
            "INSERT INTO comment(post_id, user_id, content) VALUES (?, ?, ?)",
            (payload.post_id, current_user["id"], payload.content),
        )
        row = connection.execute(
            """
            SELECT c.*, u.username, u.avatar
            FROM comment c
            LEFT JOIN user u ON u.id = c.user_id
            WHERE c.id = ?
            """,
            (cursor.lastrowid,),
        ).fetchone()

    return success_response(_comment_to_dict(row), message="comment created")


@router.delete("/comment/{comment_id}", summary="删除本人留言")
async def delete_comment(comment_id: int, current_user: dict = Depends(get_current_user)):
    """仅允许留言作者删除自己的留言，防止越权删除。"""
    with db_connection() as connection:
        row = connection.execute("SELECT * FROM comment WHERE id = ?", (comment_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="comment not found")
        if row["user_id"] != current_user["id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="only owner can delete comment")

        connection.execute("DELETE FROM comment WHERE id = ?", (comment_id,))

    return success_response({"comment_id": comment_id}, message="comment deleted")


@router.post("/collect/{post_id}", summary="收藏帖子")
async def collect_post(post_id: int, current_user: dict = Depends(get_current_user)):
    """收藏未下架帖子，依赖 collect(user_id, post_id) 联合唯一索引防止重复收藏。"""
    with db_connection() as connection:
        post = connection.execute("SELECT id FROM post WHERE id = ? AND status = ?", (post_id, "open")).fetchone()
        if post is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="post not found or not approved")

        connection.execute(
            "INSERT OR IGNORE INTO collect(user_id, post_id) VALUES (?, ?)",
            (current_user["id"], post_id),
        )
        row = connection.execute(
            "SELECT * FROM collect WHERE user_id = ? AND post_id = ?",
            (current_user["id"], post_id),
        ).fetchone()

    return success_response(
        {"id": row["id"], "user_id": row["user_id"], "post_id": row["post_id"], "create_time": row["create_time"]},
        message="post collected",
    )


@router.delete("/collect/{post_id}", summary="取消收藏帖子")
async def cancel_collect_post(post_id: int, current_user: dict = Depends(get_current_user)):
    """取消当前登录用户对指定帖子的收藏。"""
    with db_connection() as connection:
        row = connection.execute(
            "SELECT id FROM collect WHERE user_id = ? AND post_id = ?",
            (current_user["id"], post_id),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="collect not found")

        connection.execute("DELETE FROM collect WHERE id = ?", (row["id"],))

    return success_response({"post_id": post_id}, message="collect canceled")


@router.get("/my-posts", summary="我的发布列表")
async def list_my_posts(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=50, description="每页数量"),
    current_user: dict = Depends(get_current_user),
):
    """分页查询当前登录用户发布过的帖子。"""
    limit, offset = _pagination(page, page_size)
    with db_connection() as connection:
        total = connection.execute("SELECT COUNT(*) AS count FROM post WHERE user_id = ?", (current_user["id"],)).fetchone()["count"]
        rows = connection.execute(
            "SELECT * FROM post WHERE user_id = ? ORDER BY create_time DESC, id DESC LIMIT ? OFFSET ?",
            (current_user["id"], limit, offset),
        ).fetchall()

    return success_response({"items": [_post_to_dict(row) for row in rows], "page": page, "page_size": page_size, "total": total})


@router.get("/my-collects", summary="我的收藏列表")
async def list_my_collects(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=50, description="每页数量"),
    current_user: dict = Depends(get_current_user),
):
    """分页查询当前登录用户收藏的帖子，返回收藏时间和帖子信息。"""
    limit, offset = _pagination(page, page_size)
    with db_connection() as connection:
        total = connection.execute("SELECT COUNT(*) AS count FROM collect WHERE user_id = ?", (current_user["id"],)).fetchone()["count"]
        rows = connection.execute(
            """
            SELECT c.id AS collect_id, c.create_time AS collect_time, p.*
            FROM collect c
            JOIN post p ON p.id = c.post_id
            WHERE c.user_id = ?
            ORDER BY c.create_time DESC, c.id DESC
            LIMIT ? OFFSET ?
            """,
            (current_user["id"], limit, offset),
        ).fetchall()

    items = []
    for row in rows:
        post = _post_to_dict(row)
        post["collect_id"] = row["collect_id"]
        post["collect_time"] = row["collect_time"]
        items.append(post)

    return success_response({"items": items, "page": page, "page_size": page_size, "total": total})


@router.get("/my-comments", summary="我的留言列表")
async def list_my_comments(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=50, description="每页数量"),
    current_user: dict = Depends(get_current_user),
):
    """分页查询当前登录用户发表过的留言，并附带对应帖子摘要。"""
    limit, offset = _pagination(page, page_size)
    with db_connection() as connection:
        total = connection.execute("SELECT COUNT(*) AS count FROM comment WHERE user_id = ?", (current_user["id"],)).fetchone()["count"]
        rows = connection.execute(
            """
            SELECT
                c.id AS comment_id, c.post_id AS comment_post_id, c.user_id AS comment_user_id,
                c.content AS comment_content, c.create_time AS comment_create_time,
                p.*
            FROM comment c
            LEFT JOIN post p ON p.id = c.post_id
            WHERE c.user_id = ?
            ORDER BY c.create_time DESC, c.id DESC
            LIMIT ? OFFSET ?
            """,
            (current_user["id"], limit, offset),
        ).fetchall()

    items = []
    for row in rows:
        post = _post_to_dict(row) if row["id"] is not None else None
        items.append(
            {
                "id": row["comment_id"],
                "post_id": row["comment_post_id"],
                "user_id": row["comment_user_id"],
                "content": row["comment_content"],
                "create_time": row["comment_create_time"],
                "post": post,
            }
        )

    return success_response({"items": items, "page": page, "page_size": page_size, "total": total})
