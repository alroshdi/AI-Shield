"""AI Shield web API — serves scan reports, target configs, and the attack corpus to the
React dashboard (frontend/), and lets the dashboard trigger a scan or a single-finding rescan.

Run it:
    python -m ai_shield serve --port 8000

This sits next to the CLI (ai_shield/cli.py) as a second entry point onto the same engine
(orchestrator.py) — it does not duplicate scan logic, only exposes it over HTTP.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import yaml
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai_shield import orchestrator
from ai_shield import report as report_mod
from ai_shield.corpus.loader import available_packs, load_packs
from ai_shield.models import Finding, ScanManifest, ScanReport

ROOT = Path(__file__).resolve().parent.parent
SCANS_DIR = ROOT / "scans"
TARGETS_DIR = ROOT / "targets"

app = FastAPI(title="AI Shield API", version="0.1.0")

# The dashboard is a separate Vite dev server (localhost:5173) in development, so it needs CORS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Report (de)serialization — mirrors ai_shield/cli.py's _load_report.
# ---------------------------------------------------------------------------


def _dict_to_report(data: dict) -> ScanReport:
    manifest = ScanManifest(**data["manifest"])
    findings = [Finding(**f) for f in data["findings"]]
    return ScanReport(manifest=manifest, findings=findings, security_score=data["security_score"], attacks_run=data["attacks_run"])


def _read_report_file(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _all_report_files() -> list[Path]:
    if not SCANS_DIR.exists():
        return []
    return sorted(SCANS_DIR.glob("*.json"))


def _find_report_path(scan_id: str) -> Path:
    for path in _all_report_files():
        try:
            data = _read_report_file(path)
        except (json.JSONDecodeError, OSError):
            continue
        if data.get("manifest", {}).get("scan_id") == scan_id:
            return path
    raise HTTPException(status_code=404, detail=f"No scan found with id {scan_id!r}")


def _summarize(data: dict) -> dict:
    findings = data.get("findings", [])
    vulnerable = [f for f in findings if f.get("attack_success_rate", 0) > 0]
    band_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for f in vulnerable:
        band = f.get("severity_band", "Low")
        band_counts[band] = band_counts.get(band, 0) + 1
    return {
        "scan_id": data["manifest"]["scan_id"],
        "target_name": data["manifest"]["target_name"],
        "started_at": data["manifest"]["started_at"],
        "packs": data["manifest"]["packs"],
        "trials_per_attack": data["manifest"]["trials_per_attack"],
        "authorized_by": data["manifest"]["authorized_by"],
        "security_score": data["security_score"],
        "attacks_run": data["attacks_run"],
        "findings_count": len(findings),
        "vulnerable_count": len(vulnerable),
        "severity_counts": band_counts,
    }


# ---------------------------------------------------------------------------
# Scans
# ---------------------------------------------------------------------------


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/scans")
def list_scans():
    summaries = []
    for path in _all_report_files():
        try:
            data = _read_report_file(path)
        except (json.JSONDecodeError, OSError):
            continue
        summaries.append(_summarize(data))
    summaries.sort(key=lambda s: s["started_at"], reverse=True)
    return summaries


@app.get("/api/scans/{scan_id}")
def get_scan(scan_id: str):
    path = _find_report_path(scan_id)
    return _read_report_file(path)


@app.get("/api/scans/{scan_id}/findings/{attack_id}")
def get_finding(scan_id: str, attack_id: str):
    path = _find_report_path(scan_id)
    data = _read_report_file(path)
    for f in data["findings"]:
        if f["attack_id"] == attack_id:
            return {"finding": f, "scan": _summarize(data)}
    raise HTTPException(status_code=404, detail=f"No finding {attack_id!r} in scan {scan_id!r}")


class RunScanRequest(BaseModel):
    target: str  # filename under targets/, e.g. "vulnbot.yaml"
    packs: Optional[list[str]] = None
    trials: int = 3
    authorized_by: str = "unknown"


@app.post("/api/scans")
def run_scan(req: RunScanRequest):
    target_path = TARGETS_DIR / req.target
    if not target_path.exists():
        raise HTTPException(status_code=404, detail=f"No target config {req.target!r} in targets/")
    target_config = yaml.safe_load(target_path.read_text(encoding="utf-8"))

    try:
        scan_report = orchestrator.run_scan(target_config, req.packs, req.trials, req.authorized_by)
    except orchestrator.AuthorizationError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except Exception as exc:  # target unreachable, bad config, etc.
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    SCANS_DIR.mkdir(parents=True, exist_ok=True)
    out_base = SCANS_DIR / scan_report.manifest.scan_id
    report_mod.write_json(scan_report, out_base.with_suffix(".json"))
    report_mod.write_html(scan_report, out_base.with_suffix(".html"))

    return report_mod.to_json(scan_report)


class RescanRequest(BaseModel):
    target: str
    finding: str  # attack id
    trials: Optional[int] = None


@app.post("/api/scans/{scan_id}/rescan")
def rescan(scan_id: str, req: RescanRequest):
    path = _find_report_path(scan_id)
    scan_report = _dict_to_report(_read_report_file(path))

    target_path = TARGETS_DIR / req.target
    if not target_path.exists():
        raise HTTPException(status_code=404, detail=f"No target config {req.target!r} in targets/")
    target_config = yaml.safe_load(target_path.read_text(encoding="utf-8"))

    try:
        updated = orchestrator.rescan_finding(target_config, scan_report, req.finding, req.trials)
    except orchestrator.AuthorizationError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    for i, f in enumerate(scan_report.findings):
        if f.attack_id == updated.attack_id:
            scan_report.findings[i] = updated
            break
    scan_report.security_score = orchestrator.security_score(scan_report.findings)

    report_mod.write_json(scan_report, path)
    report_mod.write_html(scan_report, path.with_suffix(".html"))

    return report_mod.to_json(scan_report)


# ---------------------------------------------------------------------------
# Targets & corpus — reference data the "New scan" screen needs.
# ---------------------------------------------------------------------------


@app.get("/api/targets")
def list_targets():
    targets = []
    if TARGETS_DIR.exists():
        for path in sorted(TARGETS_DIR.glob("*.yaml")):
            try:
                data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
            except yaml.YAMLError:
                continue
            targets.append(
                {
                    "file": path.name,
                    "name": data.get("name", path.stem),
                    "base_url": data.get("base_url"),
                    "adapter": data.get("adapter", "http"),
                    "authorization": data.get("authorization", {}),
                }
            )
    return targets


@app.get("/api/corpus")
def corpus():
    packs = {}
    for pack_name in available_packs():
        attacks = load_packs([pack_name])
        packs[pack_name] = [
            {
                "id": a.id,
                "name": a.name,
                "vuln_class": a.vuln_class,
                "owasp": a.owasp,
                "mitre_atlas": a.mitre_atlas,
                "severity_prior": a.severity_prior,
                "turn_count": len(a.turns),
            }
            for a in attacks
        ]
    return packs
