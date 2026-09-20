"""Shared pytest fixtures: one real VulnBot server for the whole test session, reset to
a clean, unhardened state before every test. Used by every test module in this package.
"""

import threading
import time

import httpx
import pytest
import uvicorn

from demo_target.app import app as vulnbot_app
from demo_target.app import persona as vulnbot_persona

TEST_PORT = 18765
BASE_URL = f"http://127.0.0.1:{TEST_PORT}"

AUTHORIZED_TARGET = {
    "name": "VulnBot (test)",
    "adapter": "http",
    "base_url": BASE_URL,
    "authorization": {"confirmed": True},
}

# Same as AUTHORIZED_TARGET but with the optional data-source/harden hooks declared,
# for tests that need V3 indirect injection or the apply-fix endpoints.
AUTHORIZED_TARGET_WITH_HOOKS = {
    **AUTHORIZED_TARGET,
    "document_endpoint": "/admin/seed_document",
    "harden_endpoint": "/admin/harden",
    "unharden_endpoint": "/admin/unharden",
}


@pytest.fixture(scope="session", autouse=True)
def vulnbot_server():
    config = uvicorn.Config(vulnbot_app, host="127.0.0.1", port=TEST_PORT, log_level="warning")
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    for _ in range(50):
        try:
            httpx.get(f"{BASE_URL}/health", timeout=0.2)
            break
        except httpx.TransportError:
            time.sleep(0.1)
    else:
        raise RuntimeError("VulnBot demo server did not start in time")

    yield

    server.should_exit = True
    thread.join(timeout=5)


@pytest.fixture(autouse=True)
def clean_persona():
    vulnbot_persona.unharden()
    vulnbot_persona.reset()
    yield
    vulnbot_persona.unharden()
    vulnbot_persona.reset()


@pytest.fixture(autouse=True)
def isolate_audit_log(tmp_path, monkeypatch):
    """Every orchestrator.run_scan/rescan_finding call writes an audit entry. Without
    this, running the test suite would append real-looking entries to the project's
    actual scans/audit.log. audit.record()/read_entries() resolve AUDIT_LOG_PATH at
    call time specifically so this monkeypatch is honored everywhere, including calls
    from orchestrator.py that never pass `path` themselves."""
    from ai_shield import audit

    monkeypatch.setattr(audit, "AUDIT_LOG_PATH", tmp_path / "audit.log")
