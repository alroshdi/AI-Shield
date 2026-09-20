"""Target Adapter interface — normalizes "the thing under test" to one shape.

An adapter's job is exactly two operations: reset a session, and send a sequence of
user turns and get back what the target said and did (text + any tool calls it made).
Everything upstream (Attacker Agent, Judge, Orchestrator) only ever talks to this
interface, never to a specific target's real API — that's what lets AI Shield test any
agent behind one small adapter, per docs/ARCHITECTURE.md.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from ai_shield.models import TargetResponse


class TargetAdapter(ABC):
    @abstractmethod
    def reset(self) -> None:
        """Start a fresh conversation/session, so trials don't leak state into each other."""

    @abstractmethod
    def send_turns(self, turns: list[str]) -> TargetResponse:
        """Send `turns` as sequential user messages; return the target's combined response."""
