"""FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings
from core.exceptions import register_exception_handlers
from db.sqlite import init_database
from middlewares.exception_middleware import ExceptionCaptureMiddleware
from routers import admin, interact, post, search, user
from vector.chroma import init_chroma_collection


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.upload_image_dir_path.mkdir(parents=True, exist_ok=True)
    init_database()
    try:
        init_chroma_collection()
    except Exception:
        pass
    yield


app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    lifespan=lifespan,
)

app.add_middleware(ExceptionCaptureMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(user.router)
app.include_router(post.router)
app.include_router(search.router)
app.include_router(interact.router)
app.include_router(admin.router)

app.mount(
    settings.upload_image_url_prefix,
    StaticFiles(directory=settings.upload_image_dir_path),
    name="images",
)
