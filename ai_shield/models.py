"""Shared data model for a scan: attack definitions, target responses, verdicts, findings.

These are the vocabulary every other module (adapters, agents, orchestrator, report) shares.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class SuccessType(str, Enum):
    """How a trial's outcome is decided. Ordered cheapest/most-trustworthy first — see
    docs/METRICS.md and the Verdict Engine in the roadmap: deterministic checks (CANARY,
    FORBIDDEN_TOOL_CALL) beat rules (REGEX), which beat an LLM's opinion (LLM_JUDGE)."""

    CANARY = "canary"
    REGEX = "regex"
    FORBIDDEN_TOOL_CALL = "forbidden_tool_call"
    LLM_JUDGE = "llm_judge"


@dataclass
class ToolCallObserved:
    name: str
    arguments: dict
    authorized: bool


@dataclass
class TargetResponse:
    """What came back from the target for one full attack (all of its turns)."""

    transcript_text: str
    tool_calls: list[ToolCallObserved] = field(default_factory=list)
    raw_turns: list[dict] = field(default_factory=list)  # [{"role": "user"|"assistant", "content": str}]


@dataclass
class SuccessCriterion:
    type: SuccessType
    value: Optional[str] = None  # canary string, or regex pattern
    forbidden_tool: Optional[str] = None
    rubric: Optional[str] = None  # instructions for the Tier 3 LLM judge


@dataclass
class AttackDef:
    id: str
    name: str
    pack: str
    vuln_class: str
    owasp: str
    mitre_atlas: str
    severity_prior: str  # critical | high | medium | low
    turns: list[str]
    success: SuccessCriterion
    # V3 indirect injection: content seeded into a "retrieved document" via the adapter's
    # data-source hook (TargetAdapter.inject_document) before `turns` are sent — the payload
    # arrives through data the target reads, not through the user's own chat message.
    injected_document: Optional[str] = None


@dataclass
class Verdict:
    vulnerable: bool
    tier: int  # 1 = deterministic, 2 = rule-based, 3 = LLM judge
    confidence: float  # 0..1
    rationale: str


@dataclass
class TrialResult:
    attack_id: str
    trial_index: int
    target_response: TargetResponse
    verdict: Verdict


@dataclass
class Finding:
    attack_id: str
    name: str
    pack: str
    vuln_class: str
    owasp: str
    mitre_atlas: str
    attack_success_rate: float
    trials_run: int
    trials_vulnerable: int
    severity_score: int
    severity_band: str
    confidence_avg: float
    needs_review: bool
    remediation: str
    example_transcript: list[dict]
    status: str = "new"  # new | fixed | still_vulnerable | needs_review


@dataclass
class ScanManifest:
    scan_id: str
    target_name: str
    corpus_version: str
    packs: list[str]
    trials_per_attack: int
    started_at: str
    config_hash: str
    authorized_by: str


@dataclass
class ScanReport:
    manifest: ScanManifest
    findings: list[Finding]
    security_score: int
    attacks_run: int
