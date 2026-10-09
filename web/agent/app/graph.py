"""LangGraph-style schedule agent matching the hand-drawn architecture.

Flow:
  chat → need difficulty? → ask student (optional)
       → rank preferences → generate schedule
       → valid? → show proposed date sheet → accept → apply
                → else explain conflicts & reask prefs (loop)
"""

from __future__ import annotations

import re
from typing import Any, TypedDict

from app.llm import explain_conflicts, explain_plan, infer_difficulties
from app.memory import memory
from app.tools.schedule_optimizer import optimize

CONFIDENCE_THRESHOLD = 0.7
# LangGraph StateGraph is available for expansion; run_turn implements the
# interrupt/resume control flow from the hand-drawn architecture.

PREF_ALIASES = {
    "morning": "morning",
    "afternoon": "afternoon",
    "evening": "afternoon",
    "min_gap": "min_gap",
    "minimum gap": "min_gap",
    "tight": "min_gap",
    "max_gap": "max_gap",
    "more rest": "max_gap",
    "rest": "max_gap",
    "hardest_first": "hardest_first",
    "hardest first": "hardest_first",
    "hard first": "hardest_first",
    "alternate_difficulty": "alternate_difficulty",
    "alternate": "alternate_difficulty",
    "hard easy": "alternate_difficulty",
    "hard_more_gap": "hard_more_gap",
    "more gap hard": "hard_more_gap",
    "fewer_visits": "fewer_visits",
    "fewer campus": "fewer_visits",
    "fewer visits": "fewer_visits",
    "pack": "fewer_visits",
}


class AgentState(TypedDict, total=False):
    student_id: str
    thread_id: str
    messages: list
    courses: list
    difficulties: dict
    preferences: list
    proposed_selections: dict | None
    proposed_rows: list | None
    conflict_report: str | None
    phase: str
    awaiting_user: bool
    reply: str
    pending_questions: list
    user_message: str
    action: str | None


def _course_lookup(courses: list[dict]) -> dict[str, dict]:
    by_id = {c["id"]: c for c in courses}
    by_code = {(c.get("courseCode") or "").lower(): c for c in courses if c.get("courseCode")}
    by_title = {(c.get("title") or "").lower(): c for c in courses if c.get("title")}
    return {"id": by_id, "code": by_code, "title": by_title}


def _parse_difficulty_answers(text: str, courses: list[dict], difficulties: dict) -> dict:
    """Parse replies like 'DS is hard, English easy'."""
    updated = {**difficulties}
    lookup = _course_lookup(courses)
    lower = text.lower()

    # pattern: <course hint> ... (easy|medium|hard)
    for course in courses:
        cid = course["id"]
        hints = [
            (course.get("courseCode") or "").lower(),
            (course.get("title") or "").lower(),
            *[(w) for w in (course.get("title") or "").lower().split() if len(w) > 3],
        ]
        hints = [h for h in hints if h]
        level = None
        for hint in hints:
            if not hint or hint not in lower:
                continue
            # find level near hint
            idx = lower.find(hint)
            window = lower[max(0, idx - 20) : idx + len(hint) + 30]
            if re.search(r"\bhard\b", window):
                level = "hard"
            elif re.search(r"\beasy\b", window):
                level = "easy"
            elif re.search(r"\bmedium\b|\bmid\b", window):
                level = "medium"
            if level:
                break
        if level:
            entry = {**(updated.get(cid) or {})}
            entry.update({"level": level, "confidence": 1.0, "source": "user"})
            updated[cid] = entry

    # global: "all hard" / "everything is medium"
    if re.search(r"\ball\b.*\bhard\b|\beverything\b.*\bhard\b", lower):
        for cid in updated:
            updated[cid] = {**updated[cid], "level": "hard", "confidence": 1.0, "source": "user"}
    return updated


def _extract_prefs_from_text(text: str, existing: list[str]) -> list[str]:
    prefs = list(existing or [])
    lower = text.lower()
    for alias, canonical in PREF_ALIASES.items():
        if alias in lower and canonical not in prefs:
            prefs.append(canonical)
    return prefs


def _uncertain_courses(difficulties: dict) -> list[dict]:
    uncertain = []
    for cid, meta in (difficulties or {}).items():
        if meta.get("source") in ("user", "memory"):
            continue
        if float(meta.get("confidence") or 0) < CONFIDENCE_THRESHOLD:
            uncertain.append({"id": cid, **meta})
    return uncertain


def node_ingest(state: AgentState) -> AgentState:
    facts = memory.search(state["student_id"], limit=20)
    difficulties = dict(state.get("difficulties") or {})

    # restore remembered difficulties
    for fact in facts:
        meta = fact.get("metadata") or {}
        if meta.get("type") == "difficulty" and meta.get("courseId"):
            cid = meta["courseId"]
            if cid not in difficulties or difficulties[cid].get("source") != "user":
                difficulties[cid] = {
                    "level": meta.get("level", "medium"),
                    "confidence": 1.0,
                    "source": "memory",
                    "title": meta.get("title", ""),
                    "courseCode": meta.get("courseCode", ""),
                }

    prefs = list(state.get("preferences") or [])
    for fact in facts:
        meta = fact.get("metadata") or {}
        if meta.get("type") == "preference" and meta.get("pref") and meta["pref"] not in prefs:
            prefs.append(meta["pref"])

    phase = state.get("phase") or "need_difficulty"
    return {
        **state,
        "difficulties": difficulties,
        "preferences": prefs,
        "phase": phase,
        "awaiting_user": False,
    }


def node_infer_difficulty(state: AgentState) -> AgentState:
    courses = state.get("courses") or []
    existing = dict(state.get("difficulties") or {})
    inferred = infer_difficulties(courses)
    for cid, meta in inferred.items():
        if cid not in existing or existing[cid].get("source") not in ("user", "memory"):
            existing[cid] = meta
        else:
            # keep user/memory but fill title/code
            existing[cid] = {**meta, **existing[cid]}
    return {**state, "difficulties": existing, "phase": "need_difficulty"}


def node_need_difficulty_gate(state: AgentState) -> AgentState:
    uncertain = _uncertain_courses(state.get("difficulties") or {})
    if uncertain:
        lines = [
            "I fetched your registered courses and auto-tagged most of them.",
            "I am unsure about these — please reply with easy / medium / hard for each:\n",
        ]
        questions = []
        for u in uncertain:
            q = f"{u.get('courseCode') or u['id']}: {u.get('title') or ''} (guess: {u.get('level')})"
            lines.append(q)
            questions.append(q)
        lines.append("\nExample: \"CS301 is hard, ENG101 is easy\"")
        return {
            **state,
            "phase": "ask_difficulty",
            "awaiting_user": True,
            "reply": "\n".join(lines),
            "pending_questions": questions,
        }
    return {
        **state,
        "phase": "rank_prefs",
        "awaiting_user": False,
        "pending_questions": [],
    }


def node_absorb_difficulty_reply(state: AgentState) -> AgentState:
    msg = (state.get("user_message") or "").strip()
    if not msg:
        return {
            **state,
            "awaiting_user": True,
            "reply": "Please tell me the difficulty for the uncertain courses (easy / medium / hard).",
            "phase": "ask_difficulty",
        }
    updated = _parse_difficulty_answers(msg, state.get("courses") or [], state.get("difficulties") or {})
    for cid, meta in updated.items():
        if meta.get("source") == "user":
            memory.add(
                state["student_id"],
                f"Course {meta.get('courseCode')} difficulty is {meta['level']}",
                {
                    "type": "difficulty",
                    "courseId": cid,
                    "level": meta["level"],
                    "courseCode": meta.get("courseCode"),
                    "title": meta.get("title"),
                },
            )
    still = _uncertain_courses(updated)
    # if user answered something, bump remaining heuristic mediums to accepted
    if still and any(m.get("source") == "user" for m in updated.values()):
        for u in still:
            # keep asking only if zero user answers matched
            pass
    user_touched = any(m.get("source") == "user" for m in updated.values())
    if not user_touched:
        return {
            **state,
            "difficulties": updated,
            "phase": "ask_difficulty",
            "awaiting_user": True,
            "reply": "I could not match your answer to courses. Try: \"Data Structures is hard, Communication Skills is easy\".",
        }

    # Treat remaining low-confidence as accepted guesses after user engaged
    for cid, meta in updated.items():
        if float(meta.get("confidence") or 0) < CONFIDENCE_THRESHOLD:
            updated[cid] = {**meta, "confidence": 0.75, "source": meta.get("source") or "accepted_guess"}

    return {
        **state,
        "difficulties": updated,
        "phase": "rank_prefs",
        "awaiting_user": False,
        "pending_questions": [],
    }


def node_rank_preferences(state: AgentState) -> AgentState:
    prefs = list(state.get("preferences") or [])
    msg = (state.get("user_message") or "").strip()
    action = state.get("action")

    if msg and state.get("phase") in ("rank_prefs", "resolve", "ask_difficulty", "need_difficulty", "show_plan"):
        prefs = _extract_prefs_from_text(msg, prefs)

    # If coming fresh with no prefs and no actionable message → ask
    if not prefs and not action and state.get("phase") != "generate":
        # If message looks like free-text prefs request empty, prompt chips
        if state.get("phase") in ("rank_prefs", "need_difficulty") or not prefs:
            return {
                **state,
                "preferences": prefs,
                "phase": "rank_prefs",
                "awaiting_user": True,
                "reply": (
                    "Got it. Now pick your scheduling preferences (you can tap chips or type):\n\n"
                    "morning / afternoon\n"
                    "min_gap (pack exams) / max_gap (more rest)\n"
                    "hardest_first\n"
                    "alternate_difficulty (hard-easy-hard-easy)\n"
                    "hard_more_gap (extra rest around hard courses)\n"
                    "fewer_visits (fewer campus days)\n\n"
                    "Example: morning, hardest first, fewer visits"
                ),
            }

    for p in prefs:
        memory.add(state["student_id"], f"Preference {p}", {"type": "preference", "pref": p})

    return {
        **state,
        "preferences": prefs,
        "phase": "generate",
        "awaiting_user": False,
    }


def node_generate(state: AgentState) -> AgentState:
    selections, rows, report = optimize(
        state.get("courses") or [],
        state.get("preferences") or [],
        state.get("difficulties") or {},
    )
    if not selections:
        return {
            **state,
            "proposed_selections": None,
            "proposed_rows": None,
            "conflict_report": report or "No valid schedule.",
            "phase": "resolve",
            "awaiting_user": False,
        }
    return {
        **state,
        "proposed_selections": selections,
        "proposed_rows": rows,
        "conflict_report": None,
        "phase": "show_plan",
        "awaiting_user": False,
    }


def node_show_plan(state: AgentState) -> AgentState:
    rows = state.get("proposed_rows") or []
    reply = explain_plan(rows, state.get("preferences") or [], state.get("difficulties") or {})
    return {
        **state,
        "reply": reply,
        "phase": "show_plan",
        "awaiting_user": True,
    }


def node_resolve(state: AgentState) -> AgentState:
    report = state.get("conflict_report") or "Schedule conflict."
    reply = explain_conflicts(report, state.get("preferences") or [])
    return {
        **state,
        "reply": reply,
        "phase": "resolve",
        "awaiting_user": True,
        "proposed_selections": None,
        "proposed_rows": None,
    }


def node_handle_accept_reject(state: AgentState) -> AgentState:
    action = state.get("action")
    msg = (state.get("user_message") or "").lower()
    if action == "accept" or re.search(r"\b(accept|yes|apply|looks good|ok)\b", msg):
        return {
            **state,
            "phase": "apply",
            "awaiting_user": False,
            "reply": "Great — apply this plan to lock your date sheet.",
        }
    if action == "reject" or re.search(r"\b(reject|no|change|different)\b", msg):
        prefs = _extract_prefs_from_text(state.get("user_message") or "", state.get("preferences") or [])
        return {
            **state,
            "preferences": prefs,
            "phase": "resolve",
            "conflict_report": "You rejected the proposed date sheet. Tell me what to change.",
            "awaiting_user": False,
            "proposed_selections": None,
            "proposed_rows": None,
        }
    # unclear — stay on plan
    return {
        **state,
        "phase": "show_plan",
        "awaiting_user": True,
        "reply": "Please Accept or Reject the proposed date sheet (or say yes/no).",
    }


def run_turn(
    student_id: str,
    thread_id: str,
    message: str,
    courses: list[dict],
    preferences: list[str] | None = None,
    action: str | None = None,
) -> dict[str, Any]:
    saved = memory.get_thread(student_id, thread_id)
    phase = saved.get("phase") or "need_difficulty"
    difficulties = saved.get("difficulties") or {}
    prefs = list(preferences or saved.get("preferences") or [])
    if preferences:
        for p in preferences:
            if p not in prefs:
                prefs.append(p)

    state: AgentState = {
        "student_id": student_id,
        "thread_id": thread_id,
        "messages": saved.get("messages") or [],
        "courses": courses,
        "difficulties": difficulties,
        "preferences": prefs,
        "proposed_selections": saved.get("proposed_selections"),
        "proposed_rows": saved.get("proposed_rows"),
        "conflict_report": saved.get("conflict_report"),
        "phase": phase,
        "awaiting_user": False,
        "reply": "",
        "pending_questions": [],
        "user_message": message or "",
        "action": action,
    }

    if action == "reset":
        memory.clear_thread(student_id, thread_id)
        state["phase"] = "need_difficulty"
        state["difficulties"] = {}
        state["preferences"] = []
        phase = "need_difficulty"

    # Route by current phase (interrupt/resume style)
    if phase in ("need_difficulty", None, "") or action == "reset" or not saved:
        state = node_ingest(state)
        state = node_infer_difficulty(state)
        state = node_need_difficulty_gate(state)
        if state.get("phase") == "ask_difficulty" and state.get("awaiting_user"):
            _persist(state)
            return _response(state)
        state = node_rank_preferences(state)
        if state.get("awaiting_user"):
            _persist(state)
            return _response(state)
        state = node_generate(state)
        if state.get("phase") == "resolve":
            state = node_resolve(state)
        else:
            state = node_show_plan(state)
        _persist(state)
        return _response(state)

    if phase == "ask_difficulty":
        state = node_absorb_difficulty_reply(state)
        if state.get("phase") == "ask_difficulty":
            _persist(state)
            return _response(state)
        state = node_rank_preferences(state)
        if state.get("awaiting_user"):
            _persist(state)
            return _response(state)
        state = node_generate(state)
        state = node_resolve(state) if state.get("phase") == "resolve" else node_show_plan(state)
        _persist(state)
        return _response(state)

    if phase == "rank_prefs" or phase == "resolve":
        # merge new prefs from message / chips then regenerate
        state["phase"] = "rank_prefs"
        state = node_rank_preferences(state)
        if state.get("awaiting_user") and not prefs and not message and not preferences:
            _persist(state)
            return _response(state)
        # if still awaiting because empty prefs but user sent message, rank_preferences may still wait
        if state.get("awaiting_user") and not state.get("preferences"):
            _persist(state)
            return _response(state)
        state = node_generate(state)
        state = node_resolve(state) if state.get("phase") == "resolve" else node_show_plan(state)
        _persist(state)
        return _response(state)

    if phase == "show_plan":
        state = node_handle_accept_reject(state)
        if state.get("phase") == "resolve":
            state = node_resolve(state)
            _persist(state)
            return _response(state)
        if state.get("phase") == "apply":
            _persist(state)
            return _response(state)
        _persist(state)
        return _response(state)

    if phase == "apply":
        state["reply"] = "Plan is ready — use Apply on the UI to save your date sheet."
        state["awaiting_user"] = True
        _persist(state)
        return _response(state)

    # fallback restart
    state["phase"] = "need_difficulty"
    memory.save_thread(student_id, thread_id, dict(state))
    return run_turn(student_id, thread_id, message, courses, preferences, action)


def _persist(state: AgentState) -> None:
    memory.save_thread(
        state["student_id"],
        state["thread_id"],
        {
            "phase": state.get("phase"),
            "difficulties": state.get("difficulties"),
            "preferences": state.get("preferences"),
            "proposed_selections": state.get("proposed_selections"),
            "proposed_rows": state.get("proposed_rows"),
            "conflict_report": state.get("conflict_report"),
            "messages": state.get("messages") or [],
        },
    )


def _plain_text(text: str) -> str:
    """Strip markdown so the chat UI always shows normal text."""
    import re

    if not text:
        return ""
    out = text
    out = re.sub(r"\*\*(.+?)\*\*", r"\1", out)
    out = re.sub(r"__(.+?)__", r"\1", out)
    out = re.sub(r"(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)", r"\1", out)
    out = re.sub(r"(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)", r"\1", out)
    out = re.sub(r"`([^`]+)`", r"\1", out)
    out = re.sub(r"^#{1,6}\s*", "", out, flags=re.MULTILINE)
    out = re.sub(r"^\s*[-*•]\s+", "", out, flags=re.MULTILINE)
    out = out.replace("**", "").replace("__", "")
    return out.strip()


def _response(state: AgentState) -> dict[str, Any]:
    return {
        "reply": _plain_text(state.get("reply") or ""),
        "phase": state.get("phase") or "",
        "awaitingUser": bool(state.get("awaiting_user")),
        "proposedSelections": state.get("proposed_selections"),
        "proposedRows": state.get("proposed_rows"),
        "conflictReport": _plain_text(state.get("conflict_report") or "") or None,
        "pendingQuestions": state.get("pending_questions"),
        "difficulties": state.get("difficulties"),
        "preferences": state.get("preferences"),
    }
