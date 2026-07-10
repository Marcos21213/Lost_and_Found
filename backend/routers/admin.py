"""Admin backend API routes."""

from __future__ import annotations

from datetime import datetime
import json
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.response import success_response
from db.sqlite import db_connection
from dependencies.auth import get_current_admin
from schemas.admin import AdminDisableUserRequest, AdminRejectPostRequest
from services.post_vector import delete_post_vector, upsert_post_vector


router = APIRouter(prefix="/api/admin", tags=["管理员后台"])


def _parse_img_list(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


def _post_to_dict(row) -> dict:
    item = {
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
    if "author_username" in row.keys():
        item["author"] = {
            "id": row["user_id"],
            "username": row["author_username"] or "校园用户",
            "avatar": row["author_avatar"] or "",
        }
    return item


def _user_to_dict(row) -> dict:
    row_data = dict(row)
    return {
        "id": row_data["id"],
        "username": row_data["username"],
        "phone": row_data["phone"],
        "college": row_data["college"],
        "avatar": row_data["avatar"],
        "is_admin": bool(row_data["is_admin"]),
        "is_disabled": bool(row_data.get("is_disabled", 0)),
        "create_time": row_data["create_time"],
    }


@router.get("/posts", summary="管理员帖子审核列表")
async def list_admin_posts(
    status_filter: Literal["pending", "open", "offline", "matched", "closed"] = Query("pending", alias="status", description="帖子状态"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=50, description="每页数量"),
    current_admin: dict = Depends(get_current_admin),
):
    """管理员分页查看指定状态帖子，默认查看待审核 pending 列表。"""
    offset = (page - 1) * page_size
    with db_connection() as connection:
        total = connection.execute("SELECT COUNT(*) AS count FROM post WHERE status = ?", (status_filter,)).fetchone()["count"]
        rows = connection.execute(
            """
            SELECT p.*, u.username AS author_username, u.avatar AS author_avatar
            FROM post p
            LEFT JOIN user u ON u.id = p.user_id
            WHERE p.status = ?
            ORDER BY p.create_time DESC, p.id DESC
            LIMIT ? OFFSET ?
            """,
            (status_filter, page_size, offset),
        ).fetchall()

    return success_response({"items": [_post_to_dict(row) for row in rows], "page": page, "page_size": page_size, "total": total})


@router.patch("/posts/{post_id}/approve", summary="待审核帖子一键通过")
async def approve_post(post_id: int, current_admin: dict = Depends(get_current_admin)):
    """管理员将帖子状态置为 open，并确保 ChromaDB 中存在该帖子描述向量。"""
    with db_connection() as connection:
        row = connection.execute("SELECT * FROM post WHERE id = ?", (post_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="post not found")

        connection.execute("UPDATE post SET status = ? WHERE id = ?", ("open", post_id))
        updated = connection.execute("SELECT * FROM post WHERE id = ?", (post_id,)).fetchone()

    await upsert_post_vector(updated["id"], updated["post_type"], updated["category"], updated["description"])
    return success_response(_post_to_dict(updated), message="post approved")


@router.patch("/posts/{post_id}/reject", summary="违规帖子下架")
async def reject_post(
    post_id: int,
    payload: AdminRejectPostRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """管理员将违规帖子状态置为 offline，并同步删除 ChromaDB 中的帖子向量。"""
    with db_connection() as connection:
        row = connection.execute("SELECT * FROM post WHERE id = ?", (post_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="post not found")

        connection.execute("UPDATE post SET status = ? WHERE id = ?", ("offline", post_id))
        updated = connection.execute("SELECT * FROM post WHERE id = ?", (post_id,)).fetchone()

    delete_post_vector(post_id)
    return success_response({"post": _post_to_dict(updated), "reason": payload.reason}, message="post rejected")


@router.get("/users", summary="管理员用户列表")
async def list_admin_users(
    keyword: Optional[str] = Query(default=None, max_length=50, description="按昵称或手机号搜索"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=50, description="每页数量"),
    current_admin: dict = Depends(get_current_admin),
):
    """管理员分页查看用户，可按昵称或手机号模糊搜索。"""
    offset = (page - 1) * page_size
    params: list[object] = []
    where_sql = ""
    if keyword:
        where_sql = "WHERE username LIKE ? OR phone LIKE ?"
        params.extend([f"%{keyword}%", f"%{keyword}%"])

    with db_connection() as connection:
        total = connection.execute(f"SELECT COUNT(*) AS count FROM user {where_sql}", params).fetchone()["count"]
        rows = connection.execute(
            f"SELECT * FROM user {where_sql} ORDER BY create_time DESC, id DESC LIMIT ? OFFSET ?",
            [*params, page_size, offset],
        ).fetchall()

    return success_response({"items": [_user_to_dict(row) for row in rows], "page": page, "page_size": page_size, "total": total})


@router.patch("/users/{user_id}/disable", summary="禁用违规用户账号")
async def disable_user(
    user_id: int,
    payload: AdminDisableUserRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """管理员禁用违规用户；禁用后用户无法继续登录或访问鉴权接口。"""
    if user_id == current_admin["id"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="admin cannot disable self")

    with db_connection() as connection:
        row = connection.execute("SELECT * FROM user WHERE id = ?", (user_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")

        connection.execute("UPDATE user SET is_disabled = ? WHERE id = ?", (1, user_id))
        updated = connection.execute("SELECT * FROM user WHERE id = ?", (user_id,)).fetchone()

    return success_response({"user": _user_to_dict(updated), "reason": payload.reason}, message="user disabled")


@router.get("/statistics", summary="后台数据统计")
async def get_statistics(current_admin: dict = Depends(get_current_admin)):
    """统计发帖、状态、分类和月度趋势数据，供后台与管理员个人中心展示。"""
    completed_statuses = ("matched", "completed", "closed", "finished")
    placeholders = ",".join("?" for _ in completed_statuses)
    month_keys = []
    now = datetime.now()
    current_month_index = now.year * 12 + now.month - 1
    for offset in range(11, -1, -1):
        month_index = current_month_index - offset
        year = month_index // 12
        month = month_index % 12 + 1
        month_keys.append(f"{year:04d}-{month:02d}")

    with db_connection() as connection:
        total_posts = connection.execute("SELECT COUNT(*) AS count FROM post").fetchone()["count"]
        pending_posts = connection.execute("SELECT COUNT(*) AS count FROM post WHERE status = ?", ("pending",)).fetchone()["count"]
        open_posts = connection.execute("SELECT COUNT(*) AS count FROM post WHERE status = ?", ("open",)).fetchone()["count"]
        offline_posts = connection.execute("SELECT COUNT(*) AS count FROM post WHERE status = ?", ("offline",)).fetchone()["count"]
        today_posts = connection.execute(
            "SELECT COUNT(*) AS count FROM post WHERE DATE(create_time) = DATE('now', 'localtime')"
        ).fetchone()["count"]
        total_users = connection.execute("SELECT COUNT(*) AS count FROM user").fetchone()["count"]
        matched_posts = connection.execute(
            f"SELECT COUNT(*) AS count FROM post WHERE status IN ({placeholders})",
            completed_statuses,
        ).fetchone()["count"]
        category_rows = connection.execute(
            """
            SELECT category, COUNT(*) AS count
            FROM post
            GROUP BY category
            ORDER BY count DESC, category ASC
            """
        ).fetchall()
        post_type_rows = connection.execute(
            """
            SELECT post_type, COUNT(*) AS count
            FROM post
            GROUP BY post_type
            ORDER BY count DESC, post_type ASC
            """
        ).fetchall()
        status_rows = connection.execute(
            """
            SELECT status, COUNT(*) AS count
            FROM post
            GROUP BY status
            ORDER BY count DESC, status ASC
            """
        ).fetchall()
        monthly_rows = connection.execute(
            """
            SELECT strftime('%Y-%m', create_time) AS month, COUNT(*) AS count
            FROM post
            WHERE strftime('%Y-%m', create_time) IN ({})
            GROUP BY month
            ORDER BY month ASC
            """.format(",".join("?" for _ in month_keys)),
            month_keys,
        ).fetchall()

    monthly_count_map = {row["month"]: row["count"] for row in monthly_rows}

    return success_response(
        {
            "total_posts": total_posts,
            "pending_posts": pending_posts,
            "open_posts": open_posts,
            "offline_posts": offline_posts,
            "today_posts": today_posts,
            "total_users": total_users,
            "matched_posts": matched_posts,
            "category_stats": [{"category": row["category"], "count": row["count"]} for row in category_rows],
            "post_type_stats": [{"post_type": row["post_type"], "count": row["count"]} for row in post_type_rows],
            "status_stats": [{"status": row["status"], "count": row["count"]} for row in status_rows],
            "monthly_stats": [
                {
                    "month": month_key,
                    "label": f"{int(month_key[-2:])}月",
                    "count": monthly_count_map.get(month_key, 0),
                }
                for month_key in month_keys
            ],
        }
    )
