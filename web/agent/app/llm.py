from __future__ import annotations

import json
import os
import re
from typing import Any

from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "openai/gpt-oss-20b")
VISION_MODEL = os.getenv("VISION_MODEL", "qwen/qwen3.8-27b")

_client: Groq | None = None


def get_client() -> Groq:
    global _client
    if _client is None:
        if not GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is not set")
        _client = Groq(api_key=GROQ_API_KEY)
    return _client


def chat(messages: list[dict[str, Any]], temperature: float = 0.3, json_mode: bool = False) -> str:
    kwargs: dict[str, Any] = {
        "model": LLM_MODEL,
        "messages": messages,
        "temperature": temperature,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    completion = get_client().chat.completions.create(**kwargs)
    return (completion.choices[0].message.content or "").strip()


def extract_json(text: str) -> Any:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}|\[[\s\S]*\]", text)
        if match:
            return json.loads(match.group(0))
        raise


HARD_HINTS = (
    "data structure", "algorithm", "compiler", "operating system", "os ",
    "discrete", "calculus", "linear algebra", "database", "network",
    "machine learning", "ai ", "artificial", "theory of computation",
    "assembly", "numerical", "cryptograph", "distributed",
)
EASY_HINTS = (
    "communication", "english", "islamiat", "pakistan studies", "ethics",
    "soft skill", "introduction to computing", "ict", "professional practice",
)


def heuristic_difficulty(title: str, code: str = "") -> tuple[str, float]:
    blob = f"{code} {title}".lower()
    if any(h in blob for h in HARD_HINTS):
        return "hard", 0.85
    if any(h in blob for h in EASY_HINTS):
        return "easy", 0.8
    return "medium", 0.55


def infer_difficulties(courses: list[dict]) -> dict[str, dict]:
    """Auto-tag difficulties; use LLM when available, else heuristics."""
    result: dict[str, dict] = {}
    for c in courses:
        level, conf = heuristic_difficulty(c.get("title", ""), c.get("courseCode", ""))
        result[c["id"]] = {
            "level": level,
            "confidence": conf,
            "source": "heuristic",
            "title": c.get("title", ""),
            "courseCode": c.get("courseCode", ""),
        }

    if not GROQ_API_KEY:
        return result

    catalog = [
        {"id": c["id"], "code": c.get("courseCode", ""), "title": c.get("title", "")}
        for c in courses
    ]
    try:
        raw = chat(
            [
                {
                    "role": "system",
                    "content": (
                        "You label university course difficulty for exam scheduling. "
                        "Return JSON: {\"items\":[{\"id\":\"...\",\"level\":\"easy|medium|hard\",\"confidence\":0-1}]}. "
                        "Hard = theory-heavy / technical (e.g. Data Structures). Easy = soft / intro."
                    ),
                },
                {"role": "user", "content": json.dumps({"courses": catalog})},
            ],
            temperature=0.1,
            json_mode=True,
        )
        data = extract_json(raw)
        items = data.get("items", data if isinstance(data, list) else [])
        for item in items:
            cid = item.get("id")
            if cid in result and item.get("level") in ("easy", "medium", "hard"):
                conf = float(item.get("confidence", 0.7))
                result[cid]["level"] = item["level"]
                result[cid]["confidence"] = conf
                result[cid]["source"] = "llm"
    except Exception as exc:  # noqa: BLE001
        print(f"[llm] infer_difficulties fallback: {exc}")

    return result


def explain_plan(rows: list[dict], preferences: list[str], difficulties: dict) -> str:
    lines = ["Here is a proposed date sheet based on your preferences:\n"]
    for r in rows:
        diff = (difficulties.get(r["courseId"]) or {}).get("level", "?")
        end = f" to {r['endTime']}" if r.get("endTime") else ""
        lines.append(
            f"{r.get('courseCode') or r['courseId']} ({diff}): "
            f"{r.get('date', '')[:10]} {r.get('startTime', '')}{end}"
        )
    if preferences:
        lines.append(f"\nPreferences applied: {', '.join(preferences)}.")
    lines.append("\nAccept this plan, or reject it and tell me what to change.")
    return "\n".join(lines)


def explain_conflicts(report: str, preferences: list[str]) -> str:
    return (
        "I could not build a valid schedule with the current preferences.\n\n"
        f"{report}\n\n"
        "Please adjust your preferences (e.g. relax min-gap, allow afternoons, "
        "or change difficulty) and I will try again.\n"
        f"Current preferences: {', '.join(preferences) if preferences else '(none)'}."
    )
