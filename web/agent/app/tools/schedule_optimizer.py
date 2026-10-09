"""Deterministic conflict-free exam slot optimizer."""

from __future__ import annotations

import itertools
from datetime import datetime
from typing import Any, Optional


DIFF_WEIGHT = {"hard": 3, "medium": 2, "easy": 1}


def _parse_date(d: str) -> datetime:
    return datetime.fromisoformat(d.replace("Z", "")[:10])


def _minutes(t: str) -> int:
    parts = (t or "00:00").split(":")
    return int(parts[0]) * 60 + int(parts[1] if len(parts) > 1 else 0)


def _end_minutes(slot: dict) -> int:
    if slot.get("endTime"):
        return _minutes(slot["endTime"])
    return _minutes(slot.get("startTime", "00:00")) + 180


def slot_available(slot: dict) -> bool:
    cap = int(slot.get("capacity") or 0)
    booked = int(slot.get("booked") or 0)
    if cap <= 0:
        return True
    return booked < cap


def overlaps(a: dict, b: dict) -> bool:
    if a.get("date", "")[:10] != b.get("date", "")[:10]:
        return False
    a0, a1 = _minutes(a.get("startTime", "00:00")), _end_minutes(a)
    b0, b1 = _minutes(b.get("startTime", "00:00")), _end_minutes(b)
    return a0 < b1 and b0 < a1


def _combo_valid(slots: list[dict]) -> bool:
    for i, j in itertools.combinations(range(len(slots)), 2):
        if overlaps(slots[i], slots[j]):
            return False
    return True


def _gap_hours(sorted_slots: list[dict]) -> float:
    if len(sorted_slots) < 2:
        return 0.0
    first = sorted_slots[0]
    last = sorted_slots[-1]
    t0 = _parse_date(first["date"]).timestamp() + _minutes(first.get("startTime", "00:00")) * 60
    t1 = _parse_date(last["date"]).timestamp() + _end_minutes(last) * 60
    return max(0.0, (t1 - t0) / 3600.0)


def _pairwise_gaps(sorted_slots: list[dict]) -> list[float]:
    gaps = []
    for i in range(len(sorted_slots) - 1):
        a, b = sorted_slots[i], sorted_slots[i + 1]
        t0 = _parse_date(a["date"]).timestamp() + _end_minutes(a) * 60
        t1 = _parse_date(b["date"]).timestamp() + _minutes(b.get("startTime", "00:00")) * 60
        gaps.append(max(0.0, (t1 - t0) / 3600.0))
    return gaps


def score_combo(
    course_slots: list[tuple[dict, dict]],
    preferences: list[str],
    difficulties: dict[str, dict],
) -> float:
    """Higher is better."""
    prefs = set(preferences or [])
    slots = [s for _, s in course_slots]
    ordered = sorted(
        course_slots,
        key=lambda cs: (_parse_date(cs[1]["date"]), _minutes(cs[1].get("startTime", "00:00"))),
    )
    sorted_slots = [s for _, s in ordered]
    score = 1000.0

    span = _gap_hours(sorted_slots)
    gaps = _pairwise_gaps(sorted_slots)
    distinct_days = len({s["date"][:10] for s in sorted_slots})

    avg_start = sum(_minutes(s.get("startTime", "12:00")) for s in sorted_slots) / max(1, len(sorted_slots))
    if "morning" in prefs:
        score += max(0, 14 * 60 - avg_start) / 10
    if "afternoon" in prefs:
        score += max(0, avg_start - 12 * 60) / 10

    if "min_gap" in prefs:
        score -= span * 2
    if "max_gap" in prefs:
        score += span

    if "fewer_visits" in prefs:
        score -= distinct_days * 40

    # difficulty-aware ordering
    levels = [
        (difficulties.get(c["id"]) or {}).get("level", "medium")
        for c, _ in ordered
    ]
    weights = [DIFF_WEIGHT.get(l, 2) for l in levels]

    if "hardest_first" in prefs and weights:
        # prefer higher difficulty earlier
        inv = 0
        for i in range(len(weights)):
            for j in range(i + 1, len(weights)):
                if weights[i] < weights[j]:
                    inv += 1
        score -= inv * 25

    if "alternate_difficulty" in prefs and len(weights) >= 2:
        alt_score = 0
        for i in range(len(weights) - 1):
            if weights[i] != weights[i + 1]:
                alt_score += 15
            else:
                alt_score -= 10
        score += alt_score

    if "hard_more_gap" in prefs and gaps:
        for i, g in enumerate(gaps):
            # gap after course i
            lvl = weights[i] if i < len(weights) else 2
            if lvl >= 3:
                score += min(g, 48) * 1.5
            else:
                score += min(g, 24) * 0.3

    return score


def optimize(
    courses: list[dict],
    preferences: list[str],
    difficulties: dict[str, dict],
    max_combos: int = 8000,
) -> tuple[Optional[dict[str, str]], Optional[list[dict]], Optional[str]]:
    """
    Returns (selections map, rows, conflict_report).
    selections: courseId -> slotId
    """
    options: list[list[tuple[dict, dict]]] = []
    blocked = []

    for c in courses:
        avail = [s for s in (c.get("slots") or []) if slot_available(s)]
        if not avail:
            blocked.append(f"{c.get('courseCode') or c['id']}: no open slots")
            continue
        options.append([(c, s) for s in avail])

    if blocked:
        return None, None, "Some courses have no available slots:\n" + "\n".join(blocked)

    if not options:
        return None, None, "No courses/slots available."

    # Cap explosion: if too many, take top N slots per course by morning preference
    trimmed = []
    for opts in options:
        if len(opts) > 6:
            opts = sorted(opts, key=lambda cs: _minutes(cs[1].get("startTime", "12:00")))[:6]
        trimmed.append(opts)
    options = trimmed

    total = 1
    for o in options:
        total *= len(o)
        if total > max_combos:
            break

    best_score = float("-inf")
    best: Optional[list[tuple[dict, dict]]] = None
    checked = 0
    valid_found = 0

    for combo in itertools.product(*options):
        checked += 1
        if checked > max_combos:
            break
        slots = [s for _, s in combo]
        if not _combo_valid(slots):
            continue
        valid_found += 1
        sc = score_combo(list(combo), preferences, difficulties)
        if sc > best_score:
            best_score = sc
            best = list(combo)

    if not best:
        return (
            None,
            None,
            f"No conflict-free combination found after checking {checked} options "
            f"({valid_found} valid). Try fewer_visits off, or relax time-of-day prefs.",
        )

    selections = {c["id"]: s["id"] for c, s in best}
    rows = []
    for c, s in sorted(best, key=lambda cs: (_parse_date(cs[1]["date"]), _minutes(cs[1].get("startTime", "00:00")))):
        rows.append(
            {
                "courseId": c["id"],
                "courseCode": c.get("courseCode", ""),
                "title": c.get("title", ""),
                "slotId": s["id"],
                "date": (s.get("date") or "")[:10],
                "startTime": s.get("startTime", ""),
                "endTime": s.get("endTime"),
                "difficulty": (difficulties.get(c["id"]) or {}).get("level"),
            }
        )
    return selections, rows, None
