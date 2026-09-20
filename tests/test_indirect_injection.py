"""Tests for the V3 indirect prompt injection data-source hook — the payload arrives
inside a seeded 'retrieved document', not the user's own chat turn. Server lifecycle and
persona reset fixtures live in tests/conftest.py and apply here automatically.
"""

from ai_shield import orchestrator
from demo_target.app import persona as vulnbot_persona
from tests.conftest import AUTHORIZED_TARGET, AUTHORIZED_TARGET_WITH_HOOKS


def test_indirect_injection_pack_is_vulnerable_when_unhardened():
    report = orchestrator.run_scan(
        AUTHORIZED_TARGET_WITH_HOOKS, packs=["indirect_prompt_injection"], trials=2, authorized_by="tester"
    )
    assert report.attacks_run == 3
    vulnerable = [f for f in report.findings if f.attack_success_rate > 0]
    assert vulnerable, "expected the unhardened persona to fall for at least one indirect-injection attack"
    assert all(f.vuln_class == "indirect_prompt_injection" for f in vulnerable)


def test_indirect_injection_is_blocked_once_hardened():
    vulnbot_persona.harden()
    report = orchestrator.run_scan(
        AUTHORIZED_TARGET_WITH_HOOKS, packs=["indirect_prompt_injection"], trials=2, authorized_by="tester"
    )
    assert all(f.attack_success_rate == 0.0 for f in report.findings)


def test_indirect_injection_never_succeeds_without_a_document_endpoint():
    """A target that doesn't declare document_endpoint gets a silent no-op from
    inject_document() — the honest result is 'not vulnerable', never an error."""
    report = orchestrator.run_scan(
        AUTHORIZED_TARGET, packs=["indirect_prompt_injection"], trials=2, authorized_by="tester"
    )
    assert all(f.attack_success_rate == 0.0 for f in report.findings)
