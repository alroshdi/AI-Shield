"""Scan retention and purge — PRD N4 / RISKS.md R5: default 30-day retention, and a
one-command purge, so AI Shield doesn't become an indefinite store of a customer's
system prompts and any secret an attack successfully recovered.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path


def _delete_pair(json_path: Path) -> None:
    json_path.unlink()
    html_path = json_path.with_suffix(".html")
    if html_path.exists():
        html_path.unlink()


def purge_old_scans(scans_dir: Path, older_than_days: int) -> list[str]:
    """Deletes every scan (JSON + HTML) started before the cutoff. Returns the scan_ids removed."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=older_than_days)
    removed: list[str] = []
    for path in sorted(Path(scans_dir).glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            started_at = datetime.fromisoformat(data["manifest"]["started_at"])
        except (json.JSONDecodeError, KeyError, ValueError, OSError):
            continue
        if started_at < cutoff:
            scan_id = data["manifest"]["scan_id"]
            _delete_pair(path)
            removed.append(scan_id)
    return removed


def delete_scan(scans_dir: Path, scan_id: str) -> bool:
    """Deletes one scan (JSON + HTML) by id. Returns whether a match was found."""
    for path in sorted(Path(scans_dir).glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        if data.get("manifest", {}).get("scan_id") == scan_id:
            _delete_pair(path)
            return True
    return False
