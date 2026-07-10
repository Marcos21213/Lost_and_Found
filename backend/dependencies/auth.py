"""JWT authentication dependencies."""

from __future__ import annotations

from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from db.sqlite import db_connection
from utils.security import parse_token


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/user/login", auto_error=False)


def _public_user(row: Any) -> dict[str, Any]:
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


async def get_current_user(token: str | None = Depends(oauth2_scheme)) -> dict[str, Any]:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="not authenticated")

    try:
        payload = parse_token(token)
        user_id = int(payload.get("sub", 0))
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token")

    with db_connection() as connection:
        row = connection.execute("SELECT * FROM user WHERE id = ?", (user_id,)).fetchone()

    if row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user not found")

    user = _public_user(row)
    if user["is_disabled"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="user account is disabled")

    return user


async def get_current_admin(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin permission required")
    return current_user
