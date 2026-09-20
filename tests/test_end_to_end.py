"""End-to-end test: runs the real engine (Attacker Agent, tiered Judge, severity scoring,
remediation) against the real deliberately-vulnerable demo target, served by a real local
uvicorn server for the duration of the test session — no external network, no API key,
fully deterministic. This is what proves the MVP loop actually works, not just its parts.

Server lifecycle and persona reset fixtures live in tests/conftest.py and apply here
automatically (autouse=True).
"""

import pytest

from ai_shield import orchestrator
from demo_target.app import persona as vulnbot_persona
from tests.conftest import AUTHORIZED_TARGET


def test_unauthorized_target_is_refused():
    unauthorized = {**AUTHORIZED_TARGET, "authorization": {"confirmed": False}}
    with pytest.raises(orchestrator.AuthorizationError):
        orchestrator.run_scan(unauthorized, packs=None, trials=1, authorized_by="tester")


def test_scan_finds_all_four_seeded_vulnerability_classes():
    report = orchestrator.run_scan(AUTHORIZED_TARGET, packs=None, trials=3, authorized_by="tester")

    vulnerable_classes = {f.vuln_class for f in report.findings if f.attack_success_rate > 0}
    assert vulnerable_classes == {"prompt_injection", "system_prompt_extraction", "data_leakage", "tool_abuse"}
    assert 0 < report.security_score < 100

    for f in report.findings:
        if f.attack_success_rate > 0:
            assert f.remediation
            assert f.owasp and f.mitre_atlas


def test_deterministic_tiers_are_fully_confident():
    report = orchestrator.run_scan(
        AUTHORIZED_TARGET, packs=["data_leakage", "tool_abuse"], trials=2, authorized_by="tester"
    )
    for f in report.findings:
        assert f.confidence_avg == 1.0  # canary + forbidden_tool_call are Tier 1, ground truth
        assert not f.needs_review


def test_closed_loop_apply_fix_then_rescan_resolves_finding():
    report = orchestrator.run_scan(AUTHORIZED_TARGET, packs=["prompt_injection"], trials=3, authorized_by="tester")
    vulnerable = [f for f in report.findings if f.attack_success_rate > 0]
    assert vulnerable, "expected the unhardened persona to fail at least one prompt-injection attack"
    target_finding = vulnerable[0]

    vulnbot_persona.harden()  # simulates clicking "Apply Fix"

    updated = orchestrator.rescan_finding(AUTHORIZED_TARGET, report, target_finding.attack_id, trials=3)

    assert updated.status == "fixed"
    assert updated.attack_success_rate == 0.0


def test_rescan_of_a_still_vulnerable_finding_reports_still_vulnerable():
    report = orchestrator.run_scan(AUTHORIZED_TARGET, packs=["data_leakage"], trials=2, authorized_by="tester")
    vulnerable = [f for f in report.findings if f.attack_success_rate > 0]
    assert vulnerable

    # No fix applied — persona stays vulnerable.
    updated = orchestrator.rescan_finding(AUTHORIZED_TARGET, report, vulnerable[0].attack_id, trials=2)

    assert updated.status == "still_vulnerable"
    assert updated.attack_success_rate > 0
