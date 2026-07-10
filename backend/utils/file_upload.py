"""Image upload validation, storage, and path helpers."""

from __future__ import annotations

import re
from io import BytesIO
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

from core.config import settings


ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def _safe_path_part(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]", "", value)


def normalize_upload_sub_dir(sub_dir: Optional[str]) -> Path:
    if not sub_dir:
        return Path()

    safe_parts = [_safe_path_part(part) for part in Path(sub_dir).parts]
    safe_parts = [part for part in safe_parts if part]
    return Path(*safe_parts) if safe_parts else Path()


def image_url_from_path(file_path: Path) -> str:
    relative_path = file_path.relative_to(settings.upload_image_dir_path).as_posix()
    return f"{settings.upload_image_url_prefix.rstrip('/')}/{relative_path}"


async def validate_image_file(upload_file: UploadFile) -> bytes:
    if not upload_file.filename:
        raise ValueError("image filename is required")

    suffix = Path(upload_file.filename).suffix.lower()
    if suffix not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValueError("unsupported image extension")

    content_type = (upload_file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise ValueError("unsupported image content type")

    content = await upload_file.read()
    await upload_file.seek(0)

    if len(content) > settings.max_image_size_bytes:
        raise ValueError(f"single image must not exceed {settings.max_image_size_mb}MB")

    try:
        with Image.open(BytesIO(content)) as image:
            image.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("invalid image file") from exc

    return content


async def save_upload_image(upload_file: UploadFile, sub_dir: Optional[str] = None) -> dict[str, Any]:
    content = await validate_image_file(upload_file)
    suffix = Path(upload_file.filename or "").suffix.lower()

    target_dir = settings.upload_image_dir_path / normalize_upload_sub_dir(sub_dir)
    target_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid4().hex}{suffix}"
    file_path = target_dir / filename
    file_path.write_bytes(content)

    return {
        "filename": filename,
        "path": str(file_path),
        "url": image_url_from_path(file_path),
        "size": len(content),
    }
