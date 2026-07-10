"""Interaction module request schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class CommentCreateRequest(BaseModel):
    post_id: int = Field(..., ge=1, description="帖子 ID")
    content: str = Field(..., min_length=1, max_length=500, description="留言内容")

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("comment content is required")
        return text
