from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


DifficultyLevel = Literal["easy", "medium", "hard"]


class SlotIn(BaseModel):
    id: str
    date: str
    startTime: str
    endTime: Optional[str] = None
    capacity: int = 0
    booked: int = 0


class CourseIn(BaseModel):
    id: str
    courseCode: str = ""
    title: str = ""
    slots: list[SlotIn] = Field(default_factory=list)


class ChatRequest(BaseModel):
    studentId: str
    threadId: str = "default"
    message: str = ""
    courses: list[CourseIn] = Field(default_factory=list)
    preferences: list[str] = Field(default_factory=list)
    action: Optional[Literal["accept", "reject", "reset"]] = None


class ProposedRow(BaseModel):
    courseId: str
    courseCode: str = ""
    title: str = ""
    slotId: str
    date: str = ""
    startTime: str = ""
    endTime: Optional[str] = None
    difficulty: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    phase: str
    awaitingUser: bool = True
    proposedSelections: Optional[dict[str, str]] = None
    proposedRows: Optional[list[ProposedRow]] = None
    conflictReport: Optional[str] = None
    pendingQuestions: Optional[list[str]] = None
    difficulties: Optional[dict[str, Any]] = None
    preferences: Optional[list[str]] = None


class ResetRequest(BaseModel):
    studentId: str
    threadId: str = "default"
