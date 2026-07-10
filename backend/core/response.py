"""Unified API response body helpers."""

from __future__ import annotations

from typing import Any

from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ApiResponse(BaseModel):
    code: int = 0
    message: str = "success"
    data: Any = None


def _to_dict(response: ApiResponse) -> dict[str, Any]:
    if hasattr(response, "model_dump"):
        return response.model_dump()
    return response.dict()


def success_response(
    data: Any = None,
    message: str = "success",
    code: int = 0,
    status_code: int = 200,
) -> JSONResponse:
    response = ApiResponse(code=code, message=message, data=data)
    return JSONResponse(status_code=status_code, content=_to_dict(response))


def error_response(
    message: str = "error",
    code: int = 500,
    data: Any = None,
    status_code: int = 500,
) -> JSONResponse:
    response = ApiResponse(code=code, message=message, data=data)
    return JSONResponse(status_code=status_code, content=_to_dict(response))
