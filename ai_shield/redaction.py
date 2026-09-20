"""Redacts known secrets out of a finding's transcript before it is ever returned or
written to disk — PRD requirement F8: "any secret or canary the scan recovers is masked
in reports by default."

Only values the corpus itself declared as canaries are masked — never anything inferred
from response content — so remediation text and unrelated transcript content are never
touched, and nothing gets over-redacted based on a guess.
"""

from __future__ import annotations

from ai_shield.models import AttackDef, Finding, SuccessType

MASK = "[REDACTED]"


def collect_known_secrets(attacks: list[AttackDef]) -> list[str]:
    """Every canary value declared by this batch of attacks' success criteria."""
    return sorted({a.success.value for a in attacks if a.success.type == SuccessType.CANARY and a.success.value})


def redact_findings(findings: list[Finding], secrets: list[str]) -> None:
    """Masks every declared secret out of each finding's example_transcript, in place."""
    if not secrets:
        return
    for finding in findings:
        finding.example_transcript = [
            {**turn, "content": _mask(turn.get("content", ""), secrets)} for turn in finding.example_transcript
        ]


def _mask(text: str, secrets: list[str]) -> str:
    for secret in secrets:
        text = text.replace(secret, MASK)
    return text
