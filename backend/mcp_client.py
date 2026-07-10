"""MCP-style LLM and embedding client with local fallbacks."""

from __future__ import annotations

import hashlib
import math
import re
from typing import Any
from uuid import uuid4

import httpx

from core.config import settings


SENSITIVE_KEYWORDS = {
    "广告",
    "推广",
    "加群",
    "返利",
    "刷单",
    "赌博",
    "诈骗",
    "色情",
    "暴力",
    "违禁",
}

GOODS_CATEGORY_KEYWORDS: dict[str, set[str]] = {
    "证件": {"身份证", "学生证", "校园卡", "一卡通", "证件", "卡"},
    "电子产品": {"手机", "电脑", "平板", "耳机", "充电器", "鼠标", "键盘", "u盘", "相机"},
    "书籍资料": {"书", "教材", "笔记", "资料", "试卷", "讲义"},
    "生活用品": {"杯子", "水杯", "雨伞", "钥匙", "钱包", "包", "衣服", "帽子"},
    "交通出行": {"车钥匙", "自行车", "电动车", "头盔"},
}


class MCPClient:
    """Small JSON-RPC style MCP client wrapper.

    The remote endpoint is optional. When it is not configured or unavailable,
    the public helper methods keep returning deterministic local results so
    backend workflows can continue in offline development.
    """

    def __init__(self, session_id: str | None = None) -> None:
        self.session_id = session_id or uuid4().hex

    def _truncate_context(self, text: str) -> str:
        text_value = re.sub(r"\s+", " ", text or "").strip()
        max_chars = settings.mcp_context_max_chars
        if len(text_value) <= max_chars:
            return text_value

        keep_head = max_chars // 2
        keep_tail = max_chars - keep_head
        return f"{text_value[:keep_head]}\n...[context truncated]...\n{text_value[-keep_tail:]}"

    def _headers(self, api_key: str) -> dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            settings.mcp_session_header: self.session_id,
            "X-MCP-Client": "lost-found-backend",
        }
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        return headers

    async def _call_tool(
        self,
        tool_name: str,
        arguments: dict[str, Any],
        api_key: str,
        model_name: str = "",
    ) -> Any:
        if not settings.mcp_api_base_url or not api_key:
            raise RuntimeError("MCP endpoint or key is not configured")

        payload = {
            "jsonrpc": "2.0",
            "id": uuid4().hex,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "model": model_name,
                "arguments": arguments,
            },
        }
        async with httpx.AsyncClient(timeout=settings.mcp_timeout_seconds) as client:
            response = await client.post(
                settings.mcp_api_base_url,
                headers=self._headers(api_key),
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        if data.get("error"):
            raise RuntimeError(str(data["error"]))
        return data.get("result")

    @staticmethod
    def _extract_text(result: Any, default: str) -> str:
        if isinstance(result, str):
            return result.strip() or default
        if isinstance(result, dict):
            for key in ("text", "content", "message", "result"):
                value = result.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()
            content = result.get("content")
            if isinstance(content, list):
                chunks = [
                    item.get("text", "")
                    for item in content
                    if isinstance(item, dict) and isinstance(item.get("text"), str)
                ]
                joined = "\n".join(chunk for chunk in chunks if chunk.strip()).strip()
                if joined:
                    return joined
        return default

    @staticmethod
    def _normalize_check_result(result: Any) -> dict[str, Any]:
        if isinstance(result, dict):
            passed = bool(result.get("passed", result.get("safe", True)))
            labels = result.get("labels") if isinstance(result.get("labels"), list) else []
            reason = str(result.get("reason", "content check passed" if passed else "content check failed"))
            return {"passed": passed, "reason": reason, "labels": labels}
        if isinstance(result, str):
            blocked = any(word in result for word in ("不通过", "违规", "广告", "敏感"))
            return {
                "passed": not blocked,
                "reason": result.strip() or ("content check failed" if blocked else "content check passed"),
                "labels": ["remote_text_result"] if blocked else [],
            }
        return {"passed": True, "reason": "content check passed", "labels": []}

    @staticmethod
    def _fallback_polish(text: str) -> str:
        text_value = re.sub(r"\s+", " ", text or "").strip()
        if not text_value:
            return ""
        return text_value if text_value.endswith(("。", "！", "？")) else f"{text_value}。"

    @staticmethod
    def _fallback_classify(text: str) -> str:
        text_value = (text or "").lower()
        for category, keywords in GOODS_CATEGORY_KEYWORDS.items():
            if any(keyword.lower() in text_value for keyword in keywords):
                return category
        return "其他"

    @staticmethod
    def _fallback_content_check(text: str) -> dict[str, Any]:
        text_value = text or ""
        labels = [keyword for keyword in SENSITIVE_KEYWORDS if keyword in text_value]
        return {
            "passed": not labels,
            "reason": "content check passed" if not labels else "content contains restricted keywords",
            "labels": labels,
        }

    @staticmethod
    def _fallback_embedding(text: str, dimension: int) -> list[float]:
        vector = [0.0 for _ in range(max(dimension, 1))]
        tokens = re.findall(r"[\w\u4e00-\u9fff]+", (text or "").lower())
        for token in tokens or [""]:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % len(vector)
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign

        norm = math.sqrt(sum(value * value for value in vector))
        if norm == 0:
            return vector
        return [value / norm for value in vector]

    async def llm_text_polish(self, raw_text: str) -> str:
        text = self._truncate_context(raw_text)
        try:
            result = await self._call_tool(
                "llm_text_polish",
                {"text": text},
                settings.llm_key,
                settings.llm_model_name,
            )
            return self._extract_text(result, self._fallback_polish(text))
        except Exception:
            return self._fallback_polish(text)

    async def llm_classify_goods(self, goods_description: str) -> str:
        text = self._truncate_context(goods_description)
        try:
            result = await self._call_tool(
                "llm_classify_goods",
                {"text": text},
                settings.llm_key,
                settings.llm_model_name,
            )
            return self._extract_text(result, self._fallback_classify(text))
        except Exception:
            return self._fallback_classify(text)

    async def llm_content_check(self, content: str) -> dict[str, Any]:
        text = self._truncate_context(content)
        try:
            result = await self._call_tool(
                "llm_content_check",
                {"text": text},
                settings.llm_key,
                settings.llm_model_name,
            )
            return self._normalize_check_result(result)
        except Exception:
            return self._fallback_content_check(text)

    async def embedding_text(self, text: str) -> list[float]:
        text_value = self._truncate_context(text)
        try:
            result = await self._call_tool(
                "embedding_text",
                {"text": text_value, "dimension": settings.embedding_dimension},
                settings.embedding_key,
                settings.embedding_model_name or settings.vector_model_name,
            )
            if isinstance(result, dict):
                embedding = result.get("embedding") or result.get("vector")
            else:
                embedding = result
            if isinstance(embedding, list) and all(isinstance(value, (int, float)) for value in embedding):
                return [float(value) for value in embedding]
        except Exception:
            pass

        return self._fallback_embedding(text_value, settings.embedding_dimension)


def create_mcp_client(session_id: str | None = None) -> MCPClient:
    return MCPClient(session_id=session_id)


async def llm_text_polish(raw_text: str, session_id: str | None = None) -> str:
    return await create_mcp_client(session_id).llm_text_polish(raw_text)


async def llm_classify_goods(goods_description: str, session_id: str | None = None) -> str:
    return await create_mcp_client(session_id).llm_classify_goods(goods_description)


async def llm_content_check(content: str, session_id: str | None = None) -> dict[str, Any]:
    return await create_mcp_client(session_id).llm_content_check(content)


async def embedding_text(text: str, session_id: str | None = None) -> list[float]:
    return await create_mcp_client(session_id).embedding_text(text)
