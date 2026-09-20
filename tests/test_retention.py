"""Unit tests for scan retention/purge — no server, no persona, pure file operations
against a tmp_path so these never touch the project's real scans/ directory.
"""

import json
from datetime import datetime, timedelta, timezone

from ai_shield.retention import delete_scan, purge_old_scans


def _write_scan(dir_path, scan_id, started_at):
    data = {
        "manifest": {
            "scan_id": scan_id, "target_name": "t", "corpus_version": "x", "packs": [],
            "trials_per_attack": 1, "started_at": started_at.isoformat(), "config_hash": "x",
            "authorized_by": "t",
        },
        "security_score": 100, "attacks_run": 0, "findings": [],
    }
    (dir_path / f"{scan_id}.json").write_text(json.dumps(data), encoding="utf-8")
    (dir_path / f"{scan_id}.html").write_text("<html></html>", encoding="utf-8")


def test_purge_removes_only_scans_older_than_cutoff(tmp_path):
    now = datetime.now(timezone.utc)
    _write_scan(tmp_path, "old", now - timedelta(days=40))
    _write_scan(tmp_path, "recent", now - timedelta(days=1))

    removed = purge_old_scans(tmp_path, older_than_days=30)

    assert removed == ["old"]
    assert not (tmp_path / "old.json").exists()
    assert not (tmp_path / "old.html").exists()
    assert (tmp_path / "recent.json").exists()
    assert (tmp_path / "recent.html").exists()


def test_purge_ignores_malformed_scan_files(tmp_path):
    (tmp_path / "broken.json").write_text("not json", encoding="utf-8")
    removed = purge_old_scans(tmp_path, older_than_days=0)
    assert removed == []
    assert (tmp_path / "broken.json").exists()


def test_delete_scan_removes_matching_json_and_html(tmp_path):
    _write_scan(tmp_path, "target-id", datetime.now(timezone.utc))
    assert delete_scan(tmp_path, "target-id") is True
    assert not (tmp_path / "target-id.json").exists()
    assert not (tmp_path / "target-id.html").exists()


def test_delete_scan_returns_false_when_not_found(tmp_path):
    assert delete_scan(tmp_path, "does-not-exist") is False
