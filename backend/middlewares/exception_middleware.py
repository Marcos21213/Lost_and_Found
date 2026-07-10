"""Top-level exception capture middleware."""

from __future__ import annotations

import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from core.response import error_response


logger = logging.getLogger(__name__)


class ExceptionCaptureMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as exc:
            logger.exception("Unhandled middleware exception: %s", exc)
            return error_response(
                message="internal server error",
                code=500,
                status_code=500,
            )
