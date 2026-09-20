"""Loads attack packs (versioned, declarative YAML — data, not code, per docs/ARCHITECTURE.md)."""

from __future__ import annotations

import hashlib
from pathlib import Path

import yaml

from ai_shield.models import AttackDef, SuccessCriterion, SuccessType

PACKS_DIR = Path(__file__).parent / "packs"


def load_pack(path: Path) -> list[AttackDef]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    attacks: list[AttackDef] = []
    for a in data["attacks"]:
        s = a["success"]
        success = SuccessCriterion(
            type=SuccessType(s["type"]),
            value=s.get("value"),
            forbidden_tool=s.get("forbidden_tool"),
            rubric=s.get("rubric"),
        )
        attacks.append(
            AttackDef(
                id=a["id"],
                name=a["name"],
                pack=data["pack"],
                vuln_class=data["vuln_class"],
                owasp=data["owasp"],
                mitre_atlas=data["mitre_atlas"],
                severity_prior=a.get("severity_prior", "medium"),
                turns=a["turns"],
                success=success,
            )
        )
    return attacks


def load_packs(pack_names: list[str] | None = None, packs_dir: Path = PACKS_DIR) -> list[AttackDef]:
    """Load every attack in `pack_names` (by file stem, e.g. "prompt_injection"), or all packs
    if `pack_names` is None/empty."""
    all_attacks: list[AttackDef] = []
    for f in sorted(packs_dir.glob("*.yaml")):
        if pack_names and f.stem not in pack_names:
            continue
        all_attacks.extend(load_pack(f))
    return all_attacks


def available_packs(packs_dir: Path = PACKS_DIR) -> list[str]:
    return sorted(f.stem for f in packs_dir.glob("*.yaml"))


def corpus_version_hash(packs_dir: Path = PACKS_DIR) -> str:
    """A short, stable hash of every pack file's bytes — recorded in the scan manifest so a
    scan is reproducible and "we fixed it" is verifiable (docs/ARCHITECTURE.md)."""
    h = hashlib.sha256()
    for f in sorted(packs_dir.glob("*.yaml")):
        h.update(f.read_bytes())
    return h.hexdigest()[:12]
