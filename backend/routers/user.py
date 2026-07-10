"""User module API routes."""

from __future__ import annotations

import sqlite3

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from core.response import success_response
from db.sqlite import db_connection
from dependencies.auth import get_current_user
from schemas.user import UserLoginRequest, UserRegisterRequest, UserUpdateRequest
from utils.file_upload import save_upload_image
from utils.security import create_access_token, encrypt_password, verify_password


router = APIRouter(prefix="/api/user", tags=["用户模块"])


def _public_user(row) -> dict:
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


@router.post("/register", summary="用户注册")
async def register_user(payload: UserRegisterRequest):
    """校验账号和密码，密码使用 bcrypt 加密后写入 SQLite。"""
    with db_connection() as connection:
        if payload.phone:
            exists = connection.execute(
                "SELECT id FROM user WHERE username = ? OR phone = ?",
                (payload.account, payload.phone),
            ).fetchone()
        else:
            exists = connection.execute("SELECT id FROM user WHERE username = ?", (payload.account,)).fetchone()

        if exists:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="account already exists")

        try:
            cursor = connection.execute(
                """
                INSERT INTO user(username, password, phone, college, avatar, is_admin)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    payload.account,
                    encrypt_password(payload.password),
                    payload.phone,
                    payload.college or "未填写",
                    "",
                    0,
                ),
            )
        except sqlite3.IntegrityError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="account already exists") from exc

        row = connection.execute("SELECT * FROM user WHERE id = ?", (cursor.lastrowid,)).fetchone()

    return success_response(_public_user(row), message="register success")


@router.post("/login", summary="用户登录")
async def login_user(payload: UserLoginRequest):
    """支持账号登录，校验密码后签发 JWT 令牌。"""
    with db_connection() as connection:
        row = connection.execute(
            "SELECT * FROM user WHERE username = ?",
            (payload.account,),
        ).fetchone()

    if row is None or not verify_password(payload.password, row["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid account or password")
    if bool(dict(row).get("is_disabled", 0)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="user account is disabled")

    user = _public_user(row)
    token = create_access_token(subject=row["id"], extra_claims={"username": row["username"]})
    return success_response({"token": token, "token_type": "bearer", "user": user}, message="login success")


@router.get("/me", summary="获取当前登录用户信息")
async def get_me(current_user: dict = Depends(get_current_user)):
    """根据 Authorization Bearer Token 返回当前用户公开信息。"""
    return success_response(current_user)


@router.put("/profile", summary="修改个人资料")
async def update_profile(payload: UserUpdateRequest, current_user: dict = Depends(get_current_user)):
    """修改昵称、手机号、学院，写入前检查昵称和手机号是否已被其他用户使用。"""
    update_data = payload.model_dump(exclude_none=True)
    with db_connection() as connection:
        if "username" in update_data or "phone" in update_data:
            username = update_data.get("username", current_user["username"])
            phone = update_data.get("phone", current_user["phone"])
            exists = connection.execute(
                "SELECT id FROM user WHERE id != ? AND (username = ? OR phone = ?)",
                (current_user["id"], username, phone),
            ).fetchone()
            if exists:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="username or phone already exists")

        assignments = ", ".join(f"{key} = ?" for key in update_data)
        values = [*update_data.values(), current_user["id"]]
        connection.execute(f"UPDATE user SET {assignments} WHERE id = ?", values)
        row = connection.execute("SELECT * FROM user WHERE id = ?", (current_user["id"],)).fetchone()

    return success_response(_public_user(row), message="profile updated")


@router.post("/avatar", summary="上传头像")
async def upload_avatar(
    file: UploadFile = File(..., description="头像图片，单图最大 2MB，仅支持 jpg/png/webp"),
    current_user: dict = Depends(get_current_user),
):
    """校验头像图片格式和大小，保存到 static/images/avatars 并更新用户头像 URL。"""
    try:
        image_info = await save_upload_image(file, sub_dir="avatars")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    with db_connection() as connection:
        connection.execute("UPDATE user SET avatar = ? WHERE id = ?", (image_info["url"], current_user["id"]))
        row = connection.execute("SELECT * FROM user WHERE id = ?", (current_user["id"],)).fetchone()

    return success_response({"avatar": image_info["url"], "user": _public_user(row)}, message="avatar uploaded")
