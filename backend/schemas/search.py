"""Semantic search request schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class SemanticSearchRequest(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=500, description="搜索文本")
    page: int = Field(default=1, ge=1, description="页码")
    page_size: int = Field(default=10, ge=1, le=15, description="每页数量，最大 15")

    @field_validator("keyword")
    @classmethod
    def strip_keyword(cls, value: str) -> str:
        text = " ".join(value.strip().split())
        if not text:
            raise ValueError("keyword is required")
        return text
