"""Mem0-style long-term memory backed by Redis.

Stores per-student facts (difficulties, preferences) and thread chat state.
Compatible shape with Mem0 add/search for a future swap-in.
"""

from __future__ import annotations

import json
import os
from typing import Any, Optional

import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://:123123123@redis:6379")

_client: Optional[redis.Redis] = None


def get_redis() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(REDIS_URL, decode_responses=True)
    return _client


def _fact_key(student_id: str) -> str:
    return f"examslot:mem0:facts:{student_id}"


def _thread_key(student_id: str, thread_id: str) -> str:
    return f"examslot:mem0:thread:{student_id}:{thread_id}"


class Memory:
    """Simple Mem0-compatible memory layer."""

    def add(self, student_id: str, text: str, metadata: Optional[dict] = None) -> None:
        r = get_redis()
        entry = {"text": text, "metadata": metadata or {}}
        r.lpush(_fact_key(student_id), json.dumps(entry))
        r.ltrim(_fact_key(student_id), 0, 99)

    def search(self, student_id: str, query: str = "", limit: int = 10) -> list[dict]:
        r = get_redis()
        raw = r.lrange(_fact_key(student_id), 0, limit - 1)
        results = []
        q = (query or "").lower()
        for item in raw:
            try:
                entry = json.loads(item)
            except json.JSONDecodeError:
                continue
            if not q or q in (entry.get("text") or "").lower():
                results.append(entry)
        return results

    def get_thread(self, student_id: str, thread_id: str) -> dict[str, Any]:
        r = get_redis()
        raw = r.get(_thread_key(student_id, thread_id))
        if not raw:
            return {}
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}

    def save_thread(self, student_id: str, thread_id: str, state: dict[str, Any]) -> None:
        r = get_redis()
        r.set(_thread_key(student_id, thread_id), json.dumps(state), ex=60 * 60 * 24 * 7)

    def clear_thread(self, student_id: str, thread_id: str) -> None:
        r = get_redis()
        r.delete(_thread_key(student_id, thread_id))


memory = Memory()
