"""Unit tests for ai_shield/api.py: auth dependency, concurrency guard, target admin
actions (harden/unharden), and scan listing/deletion — calling the route functions
directly (FastAPI routes are plain callables) rather than spinning up an HTTP server.
Server lifecycle and persona reset fixtures live in tests/conftest.py.
"""

import asyncio
import json

import pytest
import yaml
from fastapi import HTTPException

from ai_shield import api as api_module
from demo_target.app import persona as vulnbot_persona
from tests.conftest import BASE_URL


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


def test_require_api_key_blocks_when_key_configured_and_missing(monkeypatch):
    monkeypatch.setattr(api_module, "API_KEY", "secret123")
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(api_module.require_api_key(x_api_key=None))
    assert exc_info.value.status_code == 401


def test_require_api_key_blocks_when_key_configured_and_wrong(monkeypatch):
    monkeypatch.setattr(api_module, "API_KEY", "secret123")
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(api_module.require_api_key(x_api_key="wrong"))
    assert exc_info.value.status_code == 401


def test_require_api_key_allows_matching_key(monkeypatch):
    monkeypatch.setattr(api_module, "API_KEY", "secret123")
    asyncio.run(api_module.require_api_key(x_api_key="secret123"))  # must not raise


def test_require_api_key_allows_anything_when_unconfigured(monkeypatch):
    monkeypatch.setattr(api_module, "API_KEY", None)
    asyncio.run(api_module.require_api_key(x_api_key=None))  # must not raise


# ---------------------------------------------------------------------------
# Concurrency guard
# ---------------------------------------------------------------------------


def _write_target(tmp_path, name="t.yaml", **fields):
    data = {"name": "t", "base_url": BASE_URL, "authorization": {"confirmed": True}, **fields}
    (tmp_path / name).write_text(yaml.safe_dump(data), encoding="utf-8")


def _write_scan(dir_path, scan_id):
    data = {
        "manifest": {
            "scan_id": scan_id, "target_name": "t", "corpus_version": "x", "packs": ["data_leakage"],
            "trials_per_attack": 1, "started_at": "2026-01-01T00:00:00+00:00", "config_hash": "x",
            "authorized_by": "t",
        },
        "security_score": 100, "attacks_run": 0, "findings": [],
    }
    (dir_path / f"{scan_id}.json").write_text(json.dumps(data), encoding="utf-8")


def test_run_scan_rejects_a_second_request_while_one_is_running(tmp_path, monkeypatch):
    _write_target(tmp_path)
    monkeypatch.setattr(api_module, "TARGETS_DIR", tmp_path)

    assert api_module._scan_lock.acquire(blocking=False)
    try:
        with pytest.raises(HTTPException) as exc_info:
            api_module.run_scan(api_module.RunScanRequest(target="t.yaml", trials=1))
        assert exc_info.value.status_code == 429
    finally:
        api_module._scan_lock.release()


def test_rescan_rejects_a_second_request_while_one_is_running(tmp_path, monkeypatch):
    _write_target(tmp_path)
    _write_scan(tmp_path, "abc123")
    monkeypatch.setattr(api_module, "TARGETS_DIR", tmp_path)
    monkeypatch.setattr(api_module, "SCANS_DIR", tmp_path)

    assert api_module._scan_lock.acquire(blocking=False)
    try:
        with pytest.raises(HTTPException) as exc_info:
            api_module.rescan("abc123", api_module.RescanRequest(target="t.yaml", finding="dl-001"))
        assert exc_info.value.status_code == 429
    finally:
        api_module._scan_lock.release()


# ---------------------------------------------------------------------------
# Target admin actions (Apply Fix / revert)
# ---------------------------------------------------------------------------


def test_harden_target_requires_a_declared_endpoint(tmp_path, monkeypatch):
    _write_target(tmp_path)  # no harden_endpoint declared
    monkeypatch.setattr(api_module, "TARGETS_DIR", tmp_path)

    with pytest.raises(HTTPException) as exc_info:
        api_module.harden_target("t.yaml")
    assert exc_info.value.status_code == 400


def test_harden_target_calls_the_declared_endpoint(tmp_path, monkeypatch):
    _write_target(tmp_path, harden_endpoint="/admin/harden")
    monkeypatch.setattr(api_module, "TARGETS_DIR", tmp_path)

    assert vulnbot_persona.hardened is False
    result = api_module.harden_target("t.yaml")

    assert result.status == "ok"
    assert vulnbot_persona.hardened is True


def test_unharden_target_calls_the_declared_endpoint(tmp_path, monkeypatch):
    _write_target(tmp_path, unharden_endpoint="/admin/unharden")
    monkeypatch.setattr(api_module, "TARGETS_DIR", tmp_path)

    vulnbot_persona.harden()
    result = api_module.unharden_target("t.yaml")

    assert result.status == "ok"
    assert vulnbot_persona.hardened is False


# ---------------------------------------------------------------------------
# Scan listing / deletion
# ---------------------------------------------------------------------------


def test_list_scans_is_empty_when_no_scans_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(api_module, "SCANS_DIR", tmp_path / "does-not-exist")
    assert api_module.list_scans() == []


def test_list_scans_returns_summaries(tmp_path, monkeypatch):
    _write_scan(tmp_path, "abc123")
    monkeypatch.setattr(api_module, "SCANS_DIR", tmp_path)

    summaries = api_module.list_scans()

    assert len(summaries) == 1
    assert summaries[0]["scan_id"] == "abc123"


def test_delete_scan_endpoint_removes_the_scan(tmp_path, monkeypatch):
    _write_scan(tmp_path, "abc123")
    monkeypatch.setattr(api_module, "SCANS_DIR", tmp_path)

    result = api_module.delete_scan_endpoint("abc123")

    assert result == {"status": "deleted", "scan_id": "abc123"}
    assert not (tmp_path / "abc123.json").exists()


def test_delete_scan_endpoint_404s_when_not_found(tmp_path, monkeypatch):
    monkeypatch.setattr(api_module, "SCANS_DIR", tmp_path)
    with pytest.raises(HTTPException) as exc_info:
        api_module.delete_scan_endpoint("does-not-exist")
    assert exc_info.value.status_code == 404
