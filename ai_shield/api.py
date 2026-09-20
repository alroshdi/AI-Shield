"""AI Shield web API — serves scan reports, target configs, and the attack corpus to the
React dashboard (frontend/), and lets the dashboard trigger a scan, a single-finding
rescan, or apply/revert a target's fix.

Run it:
    python -m ai_shield serve --port 8001

This sits next to the CLI (ai_shield/cli.py) as a second entry point onto the same engine
(orchestrator.py) — it does not duplicate scan logic, only exposes it over HTTP.

Security posture (see AI_SHIELD_DOCUMENTATION_AR.md §33 / README "Security"):
  - Set AI_SHIELD_API_KEY to require an `X-API-Key` header on every request. Unset (the
    default) keeps today's zero-config local-dev experience — fine on localhost, not for
    anything reachable beyond it.
  - AI_SHIELD_CORS_ORIGINS (comma-separated) restricts which browser origins may call this
    API directly; irrelevant to the Vite dev proxy (same-origin from the browser's view)
    but matters once frontend and API are served from different origins in production.
  - A single global lock serializes scan/rescan execution: the demo target (and most
    simple targets) hold session state in one place, so two scans running at once would
    corrupt each other's conversation state. A second request gets 429, not silent corruption.
"""

from __future__ import annotations

import json
import logging
import os
import threading
from pathlib import Path
from typing import Optional

import httpx
import yaml
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai_shield import audit, orchestrator, retention
from ai_shield import report as report_mod
from ai_shield.corpus.loader import available_packs, load_packs
from ai_shield.models import Finding, ScanManifest, ScanReport

logger = logging.getLogger("ai_shield.api")

ROOT = Path(__file__).resolve().parent.parent
SCANS_DIR = ROOT / "scans"
TARGETS_DIR = ROOT / "targets"

# ---------------------------------------------------------------------------
# Auth — off by default (local dev), on the moment an operator sets an API key.
# ---------------------------------------------------------------------------

API_KEY = os.environ.get("AI_SHIELD_API_KEY")

if not API_KEY:
    logger.warning(
        "AI_SHIELD_API_KEY is not set — this API has no authentication. Fine for local "
        "development; set AI_SHIELD_API_KEY before exposing it beyond localhost."
    )


async def require_api_key(x_api_key: Optional[str] = Header(default=None)) -> None:
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Missing or invalid X-API-Key header.")


app = FastAPI(title="AI Shield API", version="0.2.0", dependencies=[Depends(require_api_key)])

_cors_origins = os.environ.get("AI_SHIELD_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serializes scan/rescan execution — see module docstring.
_scan_lock = threading.Lock()


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


def _load_target_config(file_name: str) -> dict:
    target_path = TARGETS_DIR / file_name
    if not target_path.exists():
        raise HTTPException(status_code=404, detail=f"No target config {file_name!r} in targets/")
    return yaml.safe_load(target_path.read_text(encoding="utf-8"))


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
    return {"status": "ok", "auth_required": bool(API_KEY)}


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


@app.delete("/api/scans/{scan_id}")
def delete_scan_endpoint(scan_id: str):
    """One-command purge of a single scan (PRD N4 / RISKS.md R5)."""
    if not retention.delete_scan(SCANS_DIR, scan_id):
        raise HTTPException(status_code=404, detail=f"No scan found with id {scan_id!r}")
    return {"status": "deleted", "scan_id": scan_id}


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
    redact: bool = True


@app.post("/api/scans")
def run_scan(req: RunScanRequest):
    target_config = _load_target_config(req.target)

    if not _scan_lock.acquire(blocking=False):
        raise HTTPException(status_code=429, detail="A scan is already running. Wait for it to finish before starting another.")
    try:
        try:
            scan_report = orchestrator.run_scan(target_config, req.packs, req.trials, req.authorized_by, redact=req.redact)
        except orchestrator.AuthorizationError as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc
        except Exception as exc:  # target unreachable, bad config, etc.
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    finally:
        _scan_lock.release()

    SCANS_DIR.mkdir(parents=True, exist_ok=True)
    out_base = SCANS_DIR / scan_report.manifest.scan_id
    report_mod.write_json(scan_report, out_base.with_suffix(".json"))
    report_mod.write_html(scan_report, out_base.with_suffix(".html"))

    return report_mod.to_json(scan_report)


class RescanRequest(BaseModel):
    target: str
    finding: str  # attack id
    trials: Optional[int] = None
    redact: bool = True


@app.post("/api/scans/{scan_id}/rescan")
def rescan(scan_id: str, req: RescanRequest):
    path = _find_report_path(scan_id)
    scan_report = _dict_to_report(_read_report_file(path))
    target_config = _load_target_config(req.target)

    if not _scan_lock.acquire(blocking=False):
        raise HTTPException(status_code=429, detail="A scan is already running. Wait for it to finish before starting another.")
    try:
        try:
            updated = orchestrator.rescan_finding(target_config, scan_report, req.finding, req.trials, redact=req.redact)
        except orchestrator.AuthorizationError as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
    finally:
        _scan_lock.release()

    for i, f in enumerate(scan_report.findings):
        if f.attack_id == updated.attack_id:
            scan_report.findings[i] = updated
            break
    scan_report.security_score = orchestrator.security_score(scan_report.findings)

    report_mod.write_json(scan_report, path)
    report_mod.write_html(scan_report, path.with_suffix(".html"))

    return report_mod.to_json(scan_report)


# ---------------------------------------------------------------------------
# Targets, corpus & audit log — reference data and traceability the dashboard needs.
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
                    "can_apply_fix": bool(data.get("harden_endpoint")),
                    "supports_indirect_injection": bool(data.get("document_endpoint")),
                }
            )
    return targets


class TargetActionResult(BaseModel):
    status: str
    detail: Optional[str] = None


def _call_target_admin_endpoint(target_file: str, config_key: str) -> TargetActionResult:
    target_config = _load_target_config(target_file)
    endpoint = target_config.get(config_key)
    if not endpoint:
        raise HTTPException(status_code=400, detail=f"Target {target_file!r} does not declare a {config_key!r}.")
    base_url = target_config["base_url"].rstrip("/")
    try:
        resp = httpx.post(f"{base_url}{endpoint}", timeout=10.0)
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach target: {exc}") from exc
    return TargetActionResult(status="ok", detail=f"POST {endpoint} succeeded")


@app.post("/api/targets/{target_file}/harden", response_model=TargetActionResult)
def harden_target(target_file: str):
    """"Apply Fix" from the dashboard: POSTs to the target's declared harden_endpoint.
    This is the step the target itself defines as "the fix" — AI Shield only verifies it
    via rescan, it never invents what the fix is for an arbitrary real target."""
    return _call_target_admin_endpoint(target_file, "harden_endpoint")


@app.post("/api/targets/{target_file}/unharden", response_model=TargetActionResult)
def unharden_target(target_file: str):
    """Revert a demo target to its vulnerable state, for re-running a demo."""
    return _call_target_admin_endpoint(target_file, "unharden_endpoint")


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
                "uses_injected_document": bool(a.injected_document),
            }
            for a in attacks
        ]
    return packs


@app.get("/api/audit")
def audit_log(limit: int = 200):
    return audit.read_entries(limit=limit)
