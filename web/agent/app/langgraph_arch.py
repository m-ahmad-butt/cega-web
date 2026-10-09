"""LangGraph StateGraph mirroring the hand-drawn agent architecture.

Runtime chat uses `graph.run_turn` (interrupt/resume across HTTP turns).
This compiled graph documents the same control flow for demos/judges.
"""

from __future__ import annotations

from typing import Any, TypedDict

from langgraph.graph import END, StateGraph


class ArchState(TypedDict, total=False):
    need_difficulty: bool
    valid_schedule: bool
    accepted: bool
    step: str


def _chat_content(state: ArchState) -> ArchState:
    return {**state, "step": "chat_content"}


def _gate_difficulty(state: ArchState) -> ArchState:
    return {**state, "step": "need_difficulty"}


def _ask_student(state: ArchState) -> ArchState:
    return {**state, "step": "ask_student"}


def _rank_prefs(state: ArchState) -> ArchState:
    return {**state, "step": "rank_preferences"}


def _generate(state: ArchState) -> ArchState:
    return {**state, "step": "generate_schedule"}


def _show_plan(state: ArchState) -> ArchState:
    return {**state, "step": "show_proposed_datesheet"}


def _explain(state: ArchState) -> ArchState:
    return {**state, "step": "explain_conflicts_reask"}


def _apply(state: ArchState) -> ArchState:
    return {**state, "step": "apply"}


def _route_difficulty(state: ArchState) -> str:
    return "ask_student" if state.get("need_difficulty") else "rank_preferences"


def _route_valid(state: ArchState) -> str:
    return "show_plan" if state.get("valid_schedule") else "explain"


def _route_accept(state: ArchState) -> str:
    return "apply" if state.get("accepted") else "explain"


def build_architecture_graph():
    # Node names must not collide with ArchState keys (LangGraph constraint).
    g = StateGraph(ArchState)
    g.add_node("chat_content", _chat_content)
    g.add_node("gate_difficulty", _gate_difficulty)
    g.add_node("ask_student", _ask_student)
    g.add_node("rank_preferences", _rank_prefs)
    g.add_node("generate", _generate)
    g.add_node("show_plan", _show_plan)
    g.add_node("explain", _explain)
    g.add_node("apply_plan", _apply)

    g.set_entry_point("chat_content")
    g.add_edge("chat_content", "gate_difficulty")
    g.add_conditional_edges(
        "gate_difficulty",
        _route_difficulty,
        {
            "ask_student": "ask_student",
            "rank_preferences": "rank_preferences",
        },
    )
    g.add_edge("ask_student", "rank_preferences")
    g.add_edge("rank_preferences", "generate")
    g.add_conditional_edges(
        "generate",
        _route_valid,
        {
            "show_plan": "show_plan",
            "explain": "explain",
        },
    )
    g.add_conditional_edges(
        "show_plan",
        _route_accept,
        {
            "apply": "apply_plan",
            "explain": "explain",
        },
    )
    g.add_edge("explain", "rank_preferences")
    g.add_edge("apply_plan", END)
    return g.compile()


architecture_graph = build_architecture_graph()


def describe_architecture() -> dict[str, Any]:
    return {
        "entry": "chat_content",
        "nodes": [
            "chat_content",
            "gate_difficulty",
            "ask_student",
            "rank_preferences",
            "generate",
            "show_plan",
            "explain",
            "apply_plan",
        ],
        "loops": ["explain -> rank_preferences"],
    }
