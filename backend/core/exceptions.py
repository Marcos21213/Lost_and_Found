"""Global exception response registration."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from core.response import error_response


logger = logging.getLogger(__name__)


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return error_response(
        message=str(exc.detail),
        code=exc.status_code,
        status_code=exc.status_code,
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return error_response(
        message="request validation failed",
        code=422,
        data=exc.errors(),
        status_code=422,
    )


async def pydantic_validation_exception_handler(request: Request, exc: ValidationError):
    return error_response(
        message="request validation failed",
        code=422,
        data=exc.errors(),
        status_code=422,
    )


async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled application exception: %s", exc)
    return error_response(
        message="internal server error",
        code=500,
        status_code=500,
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(ValidationError, pydantic_validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
