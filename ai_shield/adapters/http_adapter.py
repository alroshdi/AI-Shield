"""HTTP adapter — speaks the minimal JSON contract implemented by demo_target/app.py.

    POST {reset_endpoint}                              -> (any 2xx)
    POST {chat_endpoint}  {"message": "<user text>"}    -> {"reply": "...", "tool_calls": [
        {"name": "...", "arguments": {...}, "authorized": true|false}, ...
    ]}

Any real target can be scanned this way by fronting it with a thin shim that speaks
this same contract — the adapter itself never needs to change.
"""

from __future__ import annotations

import httpx

from ai_shield.adapters.base import TargetAdapter
from ai_shield.models import TargetResponse, ToolCallObserved


class HTTPAdapter(TargetAdapter):
    def __init__(
        self,
        base_url: str,
        chat_endpoint: str = "/chat",
        reset_endpoint: str | None = "/admin/reset",
        timeout: float = 30.0,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        """`transport` lets tests point this adapter directly at an in-process ASGI app
        (httpx.ASGITransport) instead of a real network call — same code path either way.
        """
        self.base_url = base_url.rstrip("/")
        self.chat_endpoint = chat_endpoint
        self.reset_endpoint = reset_endpoint
        self._client = httpx.Client(timeout=timeout, transport=transport)

    def reset(self) -> None:
        if self.reset_endpoint:
            resp = self._client.post(f"{self.base_url}{self.reset_endpoint}")
            resp.raise_for_status()

    def send_turns(self, turns: list[str]) -> TargetResponse:
        replies: list[str] = []
        tool_calls: list[ToolCallObserved] = []
        raw_turns: list[dict] = []

        for turn in turns:
            raw_turns.append({"role": "user", "content": turn})
            resp = self._client.post(f"{self.base_url}{self.chat_endpoint}", json={"message": turn})
            resp.raise_for_status()
            data = resp.json()
            reply = data.get("reply", "")
            replies.append(reply)
            raw_turns.append({"role": "assistant", "content": reply})
            for tc in data.get("tool_calls", []) or []:
                tool_calls.append(
                    ToolCallObserved(
                        name=tc["name"],
                        arguments=tc.get("arguments", {}),
                        authorized=bool(tc.get("authorized", False)),
                    )
                )

        return TargetResponse(transcript_text="\n".join(replies), tool_calls=tool_calls, raw_turns=raw_turns)

    def close(self) -> None:
        self._client.close()
