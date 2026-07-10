"""JWT and password security helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import bcrypt
import jwt
from jwt import InvalidTokenError

from core.config import settings


def _password_bytes(password: str) -> bytes:
    password_value = password.encode("utf-8")
    if len(password_value) > 72:
        raise ValueError("bcrypt password must not exceed 72 bytes")
    return password_value


def encrypt_password(password: str) -> str:
    return bcrypt.hashpw(_password_bytes(password), bcrypt.gensalt()).decode("utf-8")


def hash_password(password: str) -> str:
    return encrypt_password(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(_password_bytes(plain_password), hashed_password.encode("utf-8"))


def create_access_token(
    subject: str | int,
    extra_claims: Optional[dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    now = datetime.now(timezone.utc)
    expire_at = now + (expires_delta or timedelta(minutes=settings.jwt_expire_minutes))

    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": expire_at,
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def parse_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except InvalidTokenError as exc:
        raise ValueError("invalid token") from exc


def verify_token(token: str) -> bool:
    try:
        parse_token(token)
        return True
    except ValueError:
        return False
