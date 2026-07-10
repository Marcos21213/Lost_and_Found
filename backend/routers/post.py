"""Post module API routes."""

from __future__ import annotations

import json
from typing import Literal, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status

from core.response import success_response
from db.sqlite import db_connection
from dependencies.auth import get_current_user
from mcp_client import llm_content_check
from schemas.post import PostCreateRequest, PostUpdateRequest
from services.post_vector import delete_post_vector, upsert_post_vector
from utils.file_upload import save_upload_image


router = APIRouter(prefix="/api/post", tags=["帖子模块"])


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


async def _save_post_images(files: Optional[list[UploadFile]]) -> list[str]:
    if not files:
        return []
    if len(files) > 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="最多上传3张图片")

    image_urls: list[str] = []
    for file in files:
        try:
            image_info = await save_upload_image(file, sub_dir="posts")
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        image_urls.append(image_info["url"])
    return image_urls


async def _ensure_content_passed(text: str) -> dict:
    check_result = await llm_content_check(text)
    if not check_result.get("passed", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "content check failed",
                "reason": check_result.get("reason"),
                "labels": check_result.get("labels", []),
            },
        )
    return check_result


@router.post("", summary="发布帖子")
async def create_post(
    post_type: Literal["lost", "found"] = Form(..., description="帖子类型：lost/found"),
    goods_name: str = Form(..., description="物品名称"),
    category: str = Form(..., description="物品分类"),
    location: str = Form(..., description="地点"),
    happen_time: str = Form(..., description="发生时间"),
    description: str = Form(..., description="描述"),
    contact: str = Form(..., description="联系方式"),
    files: Optional[list[UploadFile]] = File(default=None, description="帖子图片，最多3张，单图最大2MB"),
    current_user: dict = Depends(get_current_user),
):
    """登录用户发布失物/招领帖子，先做 Pydantic 表单校验和 MCP 内容合规检测，再入库。"""
    payload = PostCreateRequest(
        post_type=post_type,
        goods_name=goods_name,
        category=category,
        location=location,
        happen_time=happen_time,
        description=description,
        contact=contact,
    )
    check_text = "\n".join([payload.goods_name, payload.category, payload.location, payload.description, payload.contact])
    check_result = await _ensure_content_passed(check_text)
    image_urls = await _save_post_images(files)

    with db_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO post(
                user_id, post_type, goods_name, category, location, happen_time,
                description, img_list, contact, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                current_user["id"],
                payload.post_type,
                payload.goods_name,
                payload.category,
                payload.location,
                payload.happen_time,
                payload.description,
                json.dumps(image_urls, ensure_ascii=False),
                payload.contact,
                "pending",
            ),
        )
        row = connection.execute("SELECT * FROM post WHERE id = ?", (cursor.lastrowid,)).fetchone()

    await upsert_post_vector(row["id"], row["post_type"], row["category"], row["description"])
    return success_response({"post": _post_to_dict(row), "content_check": check_result}, message="post created")


@router.post("/upload-images", summary="批量上传帖子图片")
async def upload_post_images(
    files: list[UploadFile] = File(..., description="帖子图片，最多3张，单文件2MB，仅支持 jpg/png/webp"),
    current_user: dict = Depends(get_current_user),
):
    """独立批量图片上传接口，只负责校验和保存图片，不创建帖子。"""
    image_urls = await _save_post_images(files)
    return success_response({"img_list": image_urls}, message="images uploaded")


@router.get("/list", summary="分页查询帖子列表")
async def list_posts(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=50, description="每页数量"),
    post_type: Optional[Literal["lost", "found"]] = Query(default=None, description="帖子类型筛选"),
    keyword: Optional[str] = Query(default=None, max_length=100, description="关键词搜索"),
    current_user: dict = Depends(get_current_user),
):
    """登录后分页查询已审核通过的帖子列表，可按 lost/found 和关键词筛选。"""
    offset = (page - 1) * page_size
    params: list[object] = []
    where_sql = "WHERE status = 'open'"
    if post_type:
        where_sql += " AND post_type = ?"
        params.append(post_type)
    if keyword:
        keyword_text = f"%{keyword.strip()}%"
        where_sql += """
            AND (
                goods_name LIKE ?
                OR category LIKE ?
                OR location LIKE ?
                OR happen_time LIKE ?
                OR description LIKE ?
                OR contact LIKE ?
            )
        """
        params.extend([keyword_text] * 6)

    with db_connection() as connection:
        total = connection.execute(f"SELECT COUNT(*) AS count FROM post {where_sql}", params).fetchone()["count"]
        rows = connection.execute(
            f"""
            SELECT * FROM post
            {where_sql}
            ORDER BY create_time DESC, id DESC
            LIMIT ? OFFSET ?
            """,
            [*params, page_size, offset],
        ).fetchall()

    return success_response(
        {
            "items": [_post_to_dict(row) for row in rows],
            "page": page,
            "page_size": page_size,
            "total": total,
        }
    )


@router.get("/statistics", summary="首页帖子统计")
async def get_post_statistics(current_user: dict = Depends(get_current_user)):
    """统计已审核通过帖子的总数和寻物/招领数量，供首页展示。"""
    with db_connection() as connection:
        total = connection.execute("SELECT COUNT(*) AS count FROM post WHERE status = ?", ("open",)).fetchone()["count"]
        lost = connection.execute(
            "SELECT COUNT(*) AS count FROM post WHERE status = ? AND post_type = ?",
            ("open", "lost"),
        ).fetchone()["count"]
        found = connection.execute(
            "SELECT COUNT(*) AS count FROM post WHERE status = ? AND post_type = ?",
            ("open", "found"),
        ).fetchone()["count"]

    return success_response({"all": total, "lost": lost, "found": found})


@router.get("/{post_id}", summary="查询帖子详情")
async def get_post_detail(post_id: int, current_user: dict = Depends(get_current_user)):
    """根据帖子 ID 查询详情，需登录。"""
    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT
                p.*,
                u.username AS author_username,
                u.avatar AS author_avatar,
                EXISTS(
                    SELECT 1
                    FROM collect c
                    WHERE c.post_id = p.id AND c.user_id = ?
                ) AS collected
            FROM post p
            LEFT JOIN user u ON u.id = p.user_id
            WHERE p.id = ?
            """,
            (current_user["id"], post_id),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="post not found")

    post = _post_to_dict(row)
    post["author"] = {
        "id": row["user_id"],
        "username": row["author_username"] or "校园用户",
        "avatar": row["author_avatar"] or "",
    }
    post["collected"] = bool(row["collected"])
    return success_response(post)


@router.put("/{post_id}", summary="编辑本人帖子")
async def update_post(post_id: int, payload: PostUpdateRequest, current_user: dict = Depends(get_current_user)):
    """仅允许帖子发布者编辑本人帖子；如修改描述，会再次进行 MCP 内容合规检测。"""
    update_data = payload.model_dump(exclude_none=True)
    should_update_vector = any(key in update_data for key in ("post_type", "category", "description"))
    if "description" in update_data:
        await _ensure_content_passed(update_data["description"])
    if "img_list" in update_data:
        update_data["img_list"] = json.dumps(update_data["img_list"], ensure_ascii=False)

    with db_connection() as connection:
        row = connection.execute("SELECT * FROM post WHERE id = ?", (post_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="post not found")
        if row["user_id"] != current_user["id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="only owner can edit post")

        assignments = ", ".join(f"{key} = ?" for key in update_data)
        connection.execute(f"UPDATE post SET {assignments} WHERE id = ?", [*update_data.values(), post_id])
        updated = connection.execute("SELECT * FROM post WHERE id = ?", (post_id,)).fetchone()

    if should_update_vector and updated["status"] != "offline":
        await upsert_post_vector(updated["id"], updated["post_type"], updated["category"], updated["description"])
    return success_response(_post_to_dict(updated), message="post updated")


@router.patch("/{post_id}/offline", summary="手动下架本人帖子")
async def offline_post(post_id: int, current_user: dict = Depends(get_current_user)):
    """仅允许帖子发布者将本人帖子状态改为 offline。"""
    with db_connection() as connection:
        row = connection.execute("SELECT * FROM post WHERE id = ?", (post_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="post not found")
        if row["user_id"] != current_user["id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="only owner can offline post")

        connection.execute("UPDATE post SET status = ? WHERE id = ?", ("offline", post_id))
        updated = connection.execute("SELECT * FROM post WHERE id = ?", (post_id,)).fetchone()

    delete_post_vector(post_id)
    return success_response(_post_to_dict(updated), message="post offline")


@router.delete("/{post_id}", summary="删除本人帖子")
async def delete_post(post_id: int, current_user: dict = Depends(get_current_user)):
    """仅允许帖子发布者删除本人帖子，并同步删除 ChromaDB 中绑定的帖子向量。"""
    with db_connection() as connection:
        row = connection.execute("SELECT * FROM post WHERE id = ?", (post_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="post not found")
        if row["user_id"] != current_user["id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="only owner can delete post")

        connection.execute("DELETE FROM post WHERE id = ?", (post_id,))

    delete_post_vector(post_id)
    return success_response({"post_id": post_id}, message="post deleted")
