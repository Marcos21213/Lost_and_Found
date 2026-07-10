"""Application settings loaded from the backend .env file."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _get_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _get_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    return int(value)


def _get_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    return float(value)


def _resolve_path(path_value: str) -> Path:
    path = Path(path_value)
    if path.is_absolute():
        return path
    return BASE_DIR / path


def _get_cors_origins() -> list[str]:
    raw_value = os.getenv("CORS_ORIGINS", os.getenv("FRONTEND_ORIGIN", "http://localhost:3000"))
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


@dataclass(frozen=True)
class Settings:
    base_dir: Path
    app_name: str
    app_env: str
    debug: bool
    cors_origins: list[str]
    database_path: str
    chroma_persist_dir: str
    chroma_collection_name: str
    jwt_secret_key: str
    jwt_algorithm: str
    jwt_expire_minutes: int
    upload_image_dir: str
    upload_image_url_prefix: str
    max_image_size_mb: int
    llm_key: str
    embedding_key: str
    mcp_api_base_url: str
    mcp_session_header: str
    mcp_context_max_chars: int
    mcp_timeout_seconds: int
    llm_model_name: str
    vector_model_name: str
    embedding_model_name: str
    embedding_dimension: int
    vector_similarity_threshold: float

    @property
    def database_file(self) -> Path:
        return _resolve_path(self.database_path)

    @property
    def chroma_persist_dir_path(self) -> Path:
        return _resolve_path(self.chroma_persist_dir)

    @property
    def upload_image_dir_path(self) -> Path:
        return _resolve_path(self.upload_image_dir)

    @property
    def max_image_size_bytes(self) -> int:
        return self.max_image_size_mb * 1024 * 1024


settings = Settings(
    base_dir=BASE_DIR,
    app_name=os.getenv("APP_NAME", "Lost and Found Backend"),
    app_env=os.getenv("APP_ENV", "development"),
    debug=_get_bool("DEBUG", True),
    cors_origins=_get_cors_origins(),
    database_path=os.getenv("DATABASE_PATH", "data/lost_found.db"),
    chroma_persist_dir=os.getenv("CHROMA_PERSIST_DIR", "data/chroma"),
    chroma_collection_name=os.getenv("CHROMA_COLLECTION_NAME", "lost_found_collection"),
    jwt_secret_key=os.getenv("JWT_SECRET_KEY", "change-this-secret-key"),
    jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
    jwt_expire_minutes=_get_int("JWT_EXPIRE_MINUTES", 60 * 24 * 7),
    upload_image_dir=os.getenv("UPLOAD_IMAGE_DIR", "static/images"),
    upload_image_url_prefix=os.getenv("UPLOAD_IMAGE_URL_PREFIX", "/static/images"),
    max_image_size_mb=_get_int("MAX_IMAGE_SIZE_MB", 2),
    llm_key=os.getenv("LLM_KEY", ""),
    embedding_key=os.getenv("EMBEDDING_KEY", ""),
    mcp_api_base_url=os.getenv("MCP_API_BASE_URL", ""),
    mcp_session_header=os.getenv("MCP_SESSION_HEADER", "X-MCP-Session-ID"),
    mcp_context_max_chars=_get_int("MCP_CONTEXT_MAX_CHARS", 4000),
    mcp_timeout_seconds=_get_int("MCP_TIMEOUT_SECONDS", 30),
    llm_model_name=os.getenv("LLM_MODEL_NAME", ""),
    vector_model_name=os.getenv("VECTOR_MODEL_NAME", ""),
    embedding_model_name=os.getenv("EMBEDDING_MODEL_NAME", ""),
    embedding_dimension=_get_int("EMBEDDING_DIMENSION", 384),
    vector_similarity_threshold=_get_float("VECTOR_SIMILARITY_THRESHOLD", 0.6),
)
