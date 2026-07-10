"""SQLite connection utilities and schema initialization."""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Optional

from core.config import settings


CREATE_TABLES_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    phone TEXT,
    college TEXT,
    avatar TEXT,
    is_admin INTEGER NOT NULL DEFAULT 0,
    is_disabled INTEGER NOT NULL DEFAULT 0,
    create_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_type TEXT NOT NULL,
    goods_name TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    happen_time TEXT NOT NULL,
    description TEXT NOT NULL,
    img_list TEXT NOT NULL DEFAULT '[]',
    contact TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    create_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    create_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collect (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    create_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_collect_user_post
ON collect(user_id, post_id);

CREATE INDEX IF NOT EXISTS idx_post_user_id ON post(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_post_id ON comment(post_id);
CREATE INDEX IF NOT EXISTS idx_collect_user_id ON collect(user_id);
"""


def _column_exists(connection: sqlite3.Connection, table_name: str, column_name: str) -> bool:
    rows = connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    return any(row["name"] == column_name for row in rows)


def _ensure_schema_migrations(connection: sqlite3.Connection) -> None:
    if not _column_exists(connection, "user", "is_disabled"):
        connection.execute("ALTER TABLE user ADD COLUMN is_disabled INTEGER NOT NULL DEFAULT 0")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_user_is_disabled ON user(is_disabled)")


def _ensure_default_accounts(connection: sqlite3.Connection) -> None:
    from utils.security import encrypt_password

    default_accounts = [
        ("user001", "user123456", "计算机学院 2026 级", 0),
        ("admin001", "admin123456", "校园服务中心", 1),
    ]

    for username, password, college, is_admin in default_accounts:
        exists = connection.execute("SELECT id FROM user WHERE username = ?", (username,)).fetchone()

        if exists:
            continue

        connection.execute(
            """
            INSERT INTO user(username, password, phone, college, avatar, is_admin)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (username, encrypt_password(password), None, college, "", is_admin),
        )


def get_db_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    database_file = db_path or settings.database_file
    database_file.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(database_file)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON;")
    return connection


def close_db_connection(connection: Optional[sqlite3.Connection]) -> None:
    if connection is not None:
        connection.close()


@contextmanager
def db_connection(db_path: Optional[Path] = None) -> Iterator[sqlite3.Connection]:
    connection = get_db_connection(db_path)
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        close_db_connection(connection)


def init_database() -> None:
    with db_connection() as connection:
        connection.executescript(CREATE_TABLES_SQL)
        _ensure_schema_migrations(connection)
        _ensure_default_accounts(connection)
