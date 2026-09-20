"""Append-only audit log for every scan/rescan the engine runs.

PRD requirement S3: "Every scan writes an immutable audit record: who, what target,
which packs, when." Appending one JSON Line per event to a single file isn't
cryptographically tamper-proof, but it is the right MVP shape: never rewritten, never
reordered, trivial to ship to a real log sink (SIEM, S3, ...) later without touching
any call site.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from ai_shield.models import ScanManifest

AUDIT_LOG_PATH = Path(__file__).resolve().parent.parent / "scans" / "audit.log"


def record(event: str, manifest: ScanManifest, extra: dict | None = None, path: Path | None = None) -> None:
    """`event` is "scan" or "rescan". Never raises on a write failure — an audit log that
    can crash a scan would be worse than one that occasionally misses an entry.

    `path` defaults to the module-level AUDIT_LOG_PATH, resolved at call time (not
    bound as a mutable default) so tests can monkeypatch `audit.AUDIT_LOG_PATH` and
    have every caller — including orchestrator.py, which never passes `path` itself
    — honor the override instead of writing into the real project's scans/ directory.
    """
    path = path or AUDIT_LOG_PATH
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
        "scan_id": manifest.scan_id,
        "target_name": manifest.target_name,
        "packs": manifest.packs,
        "authorized_by": manifest.authorized_by,
        **(extra or {}),
    }
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except OSError:
        pass


def read_entries(limit: int = 200, path: Path | None = None) -> list[dict]:
    path = path or AUDIT_LOG_PATH
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8").splitlines()
    entries = []
    for line in lines[-limit:]:
        try:
            entries.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    entries.reverse()
    return entries
