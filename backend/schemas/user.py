"""User module request schemas."""

from __future__ import annotations

import re
from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator


PHONE_PATTERN = re.compile(r"^1[3-9]\d{9}$")
ACCOUNT_PATTERN = re.compile(r"^[A-Za-z0-9_]+$")
ACCOUNT_MIN_LENGTH = 4
ACCOUNT_MAX_LENGTH = 20


class UserRegisterRequest(BaseModel):
    account: str = Field(..., min_length=ACCOUNT_MIN_LENGTH, max_length=ACCOUNT_MAX_LENGTH, description="账号")
    password: str = Field(..., min_length=6, max_length=32, description="密码")
    nickname: Optional[str] = Field(default=None, min_length=2, max_length=20, description="昵称")
    college: Optional[str] = Field(default="未填写", min_length=2, max_length=50, description="学院")
    phone: Optional[str] = Field(default=None, description="手机号")

    @field_validator("account")
    @classmethod
    def validate_account(cls, value: str) -> str:
        if not ACCOUNT_PATTERN.match(value):
            raise ValueError("account only supports letters, numbers and underscores")
        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not PHONE_PATTERN.match(value):
            raise ValueError("invalid phone number")
        return value


class UserLoginRequest(BaseModel):
    account: str = Field(..., min_length=ACCOUNT_MIN_LENGTH, max_length=ACCOUNT_MAX_LENGTH, description="账号")
    password: str = Field(..., min_length=6, max_length=32, description="密码")

    @field_validator("account")
    @classmethod
    def validate_login_account(cls, value: str) -> str:
        if not ACCOUNT_PATTERN.match(value):
            raise ValueError("account only supports letters, numbers and underscores")
        return value


class UserUpdateRequest(BaseModel):
    phone: Optional[str] = Field(default=None, description="手机号")
    username: Optional[str] = Field(default=None, min_length=2, max_length=20, description="昵称")
    college: Optional[str] = Field(default=None, min_length=2, max_length=50, description="学院")

    @field_validator("phone")
    @classmethod
    def validate_optional_phone(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not PHONE_PATTERN.match(value):
            raise ValueError("invalid phone number")
        return value

    @model_validator(mode="after")
    def require_update_field(self) -> "UserUpdateRequest":
        if self.phone is None and self.username is None and self.college is None:
            raise ValueError("at least one field is required")
        return self
