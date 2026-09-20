"""Builds the scan manifest — corpus version, seeds, and target config hash — so a scan is
reproducible and a later "we fixed it" rescan is verifiable against the same conditions.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone

from ai_shield.corpus.loader import corpus_version_hash
from ai_shield.models import ScanManifest


def build(target_name: str, target_config: dict, packs: list[str], trials_per_attack: int, authorized_by: str) -> ScanManifest:
    config_hash = hashlib.sha256(json.dumps(target_config, sort_keys=True).encode()).hexdigest()[:12]
    return ScanManifest(
        scan_id=str(uuid.uuid4())[:8],
        target_name=target_name,
        corpus_version=corpus_version_hash(),
        packs=packs,
        trials_per_attack=trials_per_attack,
        started_at=datetime.now(timezone.utc).isoformat(),
        config_hash=config_hash,
        authorized_by=authorized_by,
    )
