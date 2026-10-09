from __future__ import annotations

import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.graph import run_turn
from app.langgraph_arch import describe_architecture
from app.memory import memory
from app.schemas import ChatRequest, ChatResponse, ResetRequest, ProposedRow

AGENT_SECRET = os.getenv("AGENT_SECRET", "examslot-agent-secret")

app = FastAPI(title="ExamSlot Schedule Agent", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def require_secret(x_agent_secret: Optional[str] = Header(default=None, alias="X-Agent-Secret")):
    if x_agent_secret != AGENT_SECRET:
        raise HTTPException(status_code=401, detail="Invalid agent secret")


@app.get("/health")
def health():
    return {"status": "OK", "service": "examslot-agent"}


@app.get("/v1/architecture")
def architecture():
    return describe_architecture()


@app.post("/v1/chat", response_model=ChatResponse, dependencies=[Depends(require_secret)])
def chat(body: ChatRequest):
    courses = [c.model_dump() for c in body.courses]
    result = run_turn(
        student_id=body.studentId,
        thread_id=body.threadId or "default",
        message=body.message or "",
        courses=courses,
        preferences=body.preferences or [],
        action=body.action,
    )
    rows = result.get("proposedRows")
    return ChatResponse(
        reply=result.get("reply") or "",
        phase=result.get("phase") or "",
        awaitingUser=bool(result.get("awaitingUser")),
        proposedSelections=result.get("proposedSelections"),
        proposedRows=[ProposedRow(**r) for r in rows] if rows else None,
        conflictReport=result.get("conflictReport"),
        pendingQuestions=result.get("pendingQuestions"),
        difficulties=result.get("difficulties"),
        preferences=result.get("preferences"),
    )


@app.post("/v1/reset", dependencies=[Depends(require_secret)])
def reset(body: ResetRequest):
    memory.clear_thread(body.studentId, body.threadId or "default")
    return {"ok": True}
