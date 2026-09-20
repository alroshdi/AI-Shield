"""VulnBot — a deliberately vulnerable demo agent for developing and demoing AI Shield.

Run it:
    uvicorn demo_target.app:app --port 8000

This is a single-process, single-conversation demo target: fine for local development,
testing, and a live demo, not a multi-tenant service. `hardened` simulates a remediation
having been applied (e.g. clicking "Apply Fix" after a scan finding); `/admin/reset`
starts a fresh conversation so each attack trial runs from a clean state.

DO NOT deploy this outside a local sandbox — it is intentionally insecure.
"""

from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

from demo_target.persona import VulnBotPersona

app = FastAPI(title="VulnBot (AI Shield demo target)")
persona = VulnBotPersona()


class ChatRequest(BaseModel):
    message: str


class ToolCallOut(BaseModel):
    name: str
    arguments: dict
    authorized: bool


class ChatResponse(BaseModel):
    reply: str
    tool_calls: list[ToolCallOut] = []


class SeedDocumentRequest(BaseModel):
    content: str


@app.get("/health")
def health():
    return {"status": "ok", "hardened": persona.hardened}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    result = persona.respond(req.message)
    return ChatResponse(
        reply=result.reply,
        tool_calls=[
            ToolCallOut(name=tc.name, arguments=tc.arguments, authorized=tc.authorized)
            for tc in result.tool_calls
        ],
    )


@app.post("/admin/reset")
def reset():
    """Start a fresh conversation (called by the Attacker Agent before each trial)."""
    persona.reset()
    return {"status": "reset"}


@app.post("/admin/seed_document")
def seed_document(req: SeedDocumentRequest):
    """V3 indirect-injection data-source hook: seeds a 'retrieved document' the next
    /chat turn may reference, simulating a RAG lookup or tool response."""
    persona.seed_document(req.content)
    return {"status": "seeded"}


@app.post("/admin/harden")
def harden():
    """Simulate applying an AI Shield remediation (e.g. the 'Apply Fix' step)."""
    persona.harden()
    return {"status": "hardened"}


@app.post("/admin/unharden")
def unharden():
    """Revert to the vulnerable configuration — useful for re-demoing."""
    persona.unharden()
    return {"status": "unhardened"}


@app.get("/admin/status")
def status():
    return {"hardened": persona.hardened}
