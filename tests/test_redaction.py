"""Unit tests for the redaction layer, plus an end-to-end check that a scan's own
transcript never carries a raw secret. Server lifecycle and persona reset fixtures live
in tests/conftest.py and apply here automatically.
"""

from ai_shield import orchestrator
from ai_shield.models import AttackDef, Finding, SuccessCriterion, SuccessType
from ai_shield.redaction import collect_known_secrets, redact_findings
from tests.conftest import AUTHORIZED_TARGET


def _attack(success: SuccessCriterion) -> AttackDef:
    return AttackDef(
        id="t-1", name="test", pack="test", vuln_class="test", owasp="", mitre_atlas="",
        severity_prior="high", turns=["hi"], success=success,
    )


def test_collect_known_secrets_only_includes_canary_values():
    attacks = [
        _attack(SuccessCriterion(type=SuccessType.CANARY, value="SECRET-1")),
        _attack(SuccessCriterion(type=SuccessType.REGEX, value="foo")),
        _attack(SuccessCriterion(type=SuccessType.FORBIDDEN_TOOL_CALL, forbidden_tool="bar")),
    ]
    assert collect_known_secrets(attacks) == ["SECRET-1"]


def test_redact_findings_masks_known_secret_in_transcript():
    finding = Finding(
        attack_id="a", name="a", pack="p", vuln_class="v", owasp="", mitre_atlas="",
        attack_success_rate=1.0, trials_run=1, trials_vulnerable=1, severity_score=80,
        severity_band="Critical", confidence_avg=1.0, needs_review=False, remediation="fix",
        example_transcript=[{"role": "assistant", "content": "the code is SECRET-1 today"}],
        status="new",
    )
    redact_findings([finding], ["SECRET-1"])
    assert finding.example_transcript[0]["content"] == "the code is [REDACTED] today"


def test_redact_findings_is_a_noop_with_no_known_secrets():
    finding = Finding(
        attack_id="a", name="a", pack="p", vuln_class="v", owasp="", mitre_atlas="",
        attack_success_rate=0.0, trials_run=1, trials_vulnerable=0, severity_score=0,
        severity_band="Low", confidence_avg=1.0, needs_review=False, remediation="fix",
        example_transcript=[{"role": "assistant", "content": "nothing to see here"}],
        status="not_vulnerable",
    )
    redact_findings([finding], [])
    assert finding.example_transcript[0]["content"] == "nothing to see here"


def test_scan_report_never_carries_the_raw_canary_once_leaked():
    report = orchestrator.run_scan(AUTHORIZED_TARGET, packs=["data_leakage"], trials=1, authorized_by="tester")
    vulnerable = [f for f in report.findings if f.attack_success_rate > 0]
    assert vulnerable, "expected the unhardened persona to leak the canary at least once"

    transcript_text = " ".join(t["content"] for f in report.findings for t in f.example_transcript)
    assert "CANARY-7734-SECRET" not in transcript_text
    assert "[REDACTED]" in transcript_text


def test_redact_false_keeps_the_raw_secret_for_debugging():
    report = orchestrator.run_scan(
        AUTHORIZED_TARGET, packs=["data_leakage"], trials=1, authorized_by="tester", redact=False
    )
    vulnerable = [f for f in report.findings if f.attack_success_rate > 0]
    assert vulnerable
    transcript_text = " ".join(t["content"] for f in report.findings for t in f.example_transcript)
    assert "CANARY-7734-SECRET" in transcript_text
