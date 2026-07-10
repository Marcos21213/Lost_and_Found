"""Admin module request schemas."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, field_validator


class AdminRejectPostRequest(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=200, description="违规下架原因")

    @field_validator("reason")
    @classmethod
    def strip_reason(cls, value: Optional[str]) -> Optional[str]:
        return value.strip() if value else value


class AdminDisableUserRequest(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=200, description="禁用原因")

    @field_validator("reason")
    @classmethod
    def strip_reason(cls, value: Optional[str]) -> Optional[str]:
        return value.strip() if value else value
