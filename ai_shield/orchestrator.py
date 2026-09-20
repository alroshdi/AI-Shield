"""Orchestrator — runs a scan's full lifecycle: authorize, load attacks, dispatch the
Attacker Agent per attack, aggregate the Judge's verdicts into findings, and (on request)
rescan a single finding to verify a fix. See docs/ARCHITECTURE.md.
"""

from __future__ import annotations

from ai_shield import manifest as manifest_mod
from ai_shield import remediation, severity
from ai_shield.adapters.base import TargetAdapter
from ai_shield.adapters.http_adapter import HTTPAdapter
from ai_shield.agents.attacker import run_attack
from ai_shield.corpus.loader import load_packs
from ai_shield.models import AttackDef, Finding, ScanReport, TrialResult


class AuthorizationError(Exception):
    """Raised when a scan is refused because the target has no confirmed authorization.

    This is a hard gate, not a nice-to-have (docs/RESPONSIBLE-USE.md, PRD requirement S1):
    no assertion, no scan.
    """


def build_adapter(target_config: dict) -> TargetAdapter:
    adapter_type = target_config.get("adapter", "http")
    if adapter_type == "http":
        return HTTPAdapter(
            base_url=target_config["base_url"],
            chat_endpoint=target_config.get("chat_endpoint", "/chat"),
            reset_endpoint=target_config.get("reset_endpoint", "/admin/reset"),
        )
    raise ValueError(f"Unknown adapter type: {adapter_type!r}")


def _require_authorization(target_config: dict) -> None:
    if not target_config.get("authorization", {}).get("confirmed"):
        raise AuthorizationError(
            "Target config has no confirmed authorization. Set authorization.confirmed: true "
            "only for a target you own or have written permission to test — see docs/RESPONSIBLE-USE.md."
        )


def _aggregate(attack: AttackDef, trial_results: list[TrialResult]) -> Finding:
    vulnerable_trials = [t for t in trial_results if t.verdict.vulnerable]
    asr = len(vulnerable_trials) / len(trial_results) if trial_results else 0.0
    confidences = [t.verdict.confidence for t in trial_results]
    confidence_avg = sum(confidences) / len(confidences) if confidences else 0.0
    needs_review = any(t.verdict.tier == 3 and t.verdict.confidence == 0.0 for t in trial_results)

    score, band = severity.score(asr, attack.severity_prior, len(attack.turns))
    example_source = vulnerable_trials[0] if vulnerable_trials else trial_results[0]

    return Finding(
        attack_id=attack.id,
        name=attack.name,
        pack=attack.pack,
        vuln_class=attack.vuln_class,
        owasp=attack.owasp,
        mitre_atlas=attack.mitre_atlas,
        attack_success_rate=round(asr, 2),
        trials_run=len(trial_results),
        trials_vulnerable=len(vulnerable_trials),
        severity_score=score,
        severity_band=band,
        confidence_avg=round(confidence_avg, 2),
        needs_review=needs_review,
        remediation=remediation.suggest(attack.vuln_class),
        example_transcript=example_source.target_response.raw_turns,
        status="new" if asr > 0 else "not_vulnerable",
    )


def security_score(findings: list[Finding]) -> int:
    """100 minus the average severity across every attack, counting a not-vulnerable attack
    as zero risk. Deliberately not just "count of findings" — see docs/METRICS.md: that
    metric is trivially gameable and optimizing for it destroys precision.

    Public so a rescan can recompute the whole report's score after one finding changes.
    """
    if not findings:
        return 100
    risk_values = [f.severity_score if f.attack_success_rate > 0 else 0 for f in findings]
    return max(0, round(100 - sum(risk_values) / len(risk_values)))


def run_scan(target_config: dict, packs: list[str] | None, trials: int, authorized_by: str) -> ScanReport:
    _require_authorization(target_config)

    attacks = load_packs(packs)
    if not attacks:
        raise ValueError(f"No attacks found for packs={packs!r}")

    scan_manifest = manifest_mod.build(
        target_name=target_config.get("name", "unnamed target"),
        target_config=target_config,
        packs=sorted({a.pack for a in attacks}),
        trials_per_attack=trials,
        authorized_by=authorized_by,
    )

    adapter = build_adapter(target_config)
    findings = [_aggregate(attack, run_attack(adapter, attack, trials)) for attack in attacks]

    return ScanReport(
        manifest=scan_manifest,
        findings=findings,
        security_score=security_score(findings),
        attacks_run=len(attacks),
    )


def rescan_finding(target_config: dict, report: ScanReport, attack_id: str, trials: int | None = None) -> Finding:
    """Re-run just one attack against the (presumably now-fixed) target. The other half of the
    closed loop: a finding without a verified rescan is only a claim.
    """
    _require_authorization(target_config)

    packs_needed = sorted({f.pack for f in report.findings if f.attack_id == attack_id} or {f.pack for f in report.findings})
    attacks = load_packs(packs_needed)
    attack = next((a for a in attacks if a.id == attack_id), None)
    if attack is None:
        raise ValueError(f"Unknown attack id: {attack_id!r}")

    adapter = build_adapter(target_config)
    trial_results = run_attack(adapter, attack, trials or report.manifest.trials_per_attack)
    finding = _aggregate(attack, trial_results)
    finding.status = "fixed" if finding.attack_success_rate == 0 else "still_vulnerable"
    return finding
