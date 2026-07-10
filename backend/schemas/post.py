"""Post module request schemas."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class PostCreateRequest(BaseModel):
    post_type: Literal["lost", "found"] = Field(..., description="帖子类型：lost/found")
    goods_name: str = Field(..., min_length=1, max_length=50, description="物品名称")
    category: str = Field(..., min_length=1, max_length=30, description="物品分类")
    location: str = Field(..., min_length=1, max_length=100, description="地点")
    happen_time: str = Field(..., min_length=1, max_length=50, description="发生时间")
    description: str = Field(..., min_length=5, max_length=1000, description="描述")
    contact: str = Field(..., min_length=2, max_length=100, description="联系方式")

    @field_validator("goods_name", "category", "location", "happen_time", "description", "contact")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class PostUpdateRequest(BaseModel):
    post_type: Optional[Literal["lost", "found"]] = Field(default=None, description="帖子类型")
    goods_name: Optional[str] = Field(default=None, min_length=1, max_length=50, description="物品名称")
    category: Optional[str] = Field(default=None, min_length=1, max_length=30, description="物品分类")
    location: Optional[str] = Field(default=None, min_length=1, max_length=100, description="地点")
    happen_time: Optional[str] = Field(default=None, min_length=1, max_length=50, description="发生时间")
    description: Optional[str] = Field(default=None, min_length=5, max_length=1000, description="描述")
    contact: Optional[str] = Field(default=None, min_length=2, max_length=100, description="联系方式")
    img_list: Optional[list[str]] = Field(default=None, max_length=3, description="图片 URL 列表")

    @field_validator("goods_name", "category", "location", "happen_time", "description", "contact")
    @classmethod
    def strip_optional_text(cls, value: Optional[str]) -> Optional[str]:
        return value.strip() if value is not None else value

    @model_validator(mode="after")
    def require_update_field(self) -> "PostUpdateRequest":
        if not self.model_dump(exclude_none=True):
            raise ValueError("at least one field is required")
        return self
