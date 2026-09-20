"""AI Shield CLI.

    python -m ai_shield scan   --target targets/vulnbot.yaml --packs prompt_injection,tool_abuse --trials 3
    python -m ai_shield rescan --target targets/vulnbot.yaml --report scans/report.json --finding pi-001
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import yaml

from ai_shield import orchestrator
from ai_shield import report as report_mod
from ai_shield.models import Finding, ScanManifest, ScanReport


def _load_target(path: str) -> dict:
    return yaml.safe_load(Path(path).read_text(encoding="utf-8"))


def _load_report(path: str) -> ScanReport:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    manifest = ScanManifest(**data["manifest"])
    findings = [Finding(**f) for f in data["findings"]]
    return ScanReport(manifest=manifest, findings=findings, security_score=data["security_score"], attacks_run=data["attacks_run"])


def _print_findings_table(findings: list[Finding]) -> None:
    order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    rows = sorted(findings, key=lambda f: (order.get(f.severity_band, 4), -f.attack_success_rate))
    print(f"\n{'ID':<8} {'CLASS':<24} {'ASR':<6} {'SEVERITY':<10} {'STATUS':<16} NAME")
    print("-" * 100)
    for f in rows:
        asr_pct = f"{round(f.attack_success_rate * 100)}%"
        print(f"{f.attack_id:<8} {f.vuln_class:<24} {asr_pct:<6} {f.severity_band:<10} {f.status:<16} {f.name}")


def cmd_scan(args: argparse.Namespace) -> None:
    target_config = _load_target(args.target)
    packs = args.packs.split(",") if args.packs else None

    try:
        scan_report = orchestrator.run_scan(target_config, packs, args.trials, args.authorized_by)
    except orchestrator.AuthorizationError as exc:
        print(f"Refused: {exc}", file=sys.stderr)
        sys.exit(2)

    out_base = Path(args.out)
    out_base.parent.mkdir(parents=True, exist_ok=True)
    json_path = out_base.with_suffix(".json")
    html_path = out_base.with_suffix(".html")
    report_mod.write_json(scan_report, json_path)
    report_mod.write_html(scan_report, html_path)

    vulnerable = [f for f in scan_report.findings if f.attack_success_rate > 0]
    print(
        f"Scan {scan_report.manifest.scan_id} complete — {scan_report.attacks_run} attacks run, "
        f"{len(vulnerable)} vulnerable, security score {scan_report.security_score}/100"
    )
    _print_findings_table(scan_report.findings)
    print(f"\nReport written to {json_path} and {html_path}")


def cmd_rescan(args: argparse.Namespace) -> None:
    target_config = _load_target(args.target)
    scan_report = _load_report(args.report)

    try:
        updated = orchestrator.rescan_finding(target_config, scan_report, args.finding, args.trials)
    except orchestrator.AuthorizationError as exc:
        print(f"Refused: {exc}", file=sys.stderr)
        sys.exit(2)

    for i, f in enumerate(scan_report.findings):
        if f.attack_id == updated.attack_id:
            scan_report.findings[i] = updated
            break

    scan_report.security_score = orchestrator.security_score(scan_report.findings)

    out_path = Path(args.report)
    report_mod.write_json(scan_report, out_path)
    report_mod.write_html(scan_report, out_path.with_suffix(".html"))

    print(f"Rescan of {updated.attack_id}: {updated.status} (attack success rate {updated.attack_success_rate})")
    print(f"Updated security score: {scan_report.security_score}/100")
    print(f"Report updated at {out_path}")


def cmd_serve(args: argparse.Namespace) -> None:
    import uvicorn

    uvicorn.run("ai_shield.api:app", host=args.host, port=args.port, reload=args.reload)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="ai-shield", description="AI Shield — security testing for AI agents.")
    sub = parser.add_subparsers(dest="command", required=True)

    p_scan = sub.add_parser("scan", help="Run a scan against a target.")
    p_scan.add_argument("--target", required=True, help="Path to a target config YAML.")
    p_scan.add_argument("--packs", default=None, help="Comma-separated attack pack names (default: all).")
    p_scan.add_argument("--trials", type=int, default=3, help="Trials per attack (default 3).")
    p_scan.add_argument("--out", default="scans/report", help="Output path prefix (default scans/report).")
    p_scan.add_argument("--authorized-by", default="unknown", help="Who is asserting authorization to test this target.")
    p_scan.set_defaults(func=cmd_scan)

    p_rescan = sub.add_parser("rescan", help="Re-run one finding's attack and update the report.")
    p_rescan.add_argument("--target", required=True)
    p_rescan.add_argument("--report", required=True, help="Path to a previous scan's JSON report.")
    p_rescan.add_argument("--finding", required=True, help="Attack id to re-run, e.g. pi-001.")
    p_rescan.add_argument("--trials", type=int, default=None)
    p_rescan.set_defaults(func=cmd_rescan)

    p_serve = sub.add_parser("serve", help="Run the web API that backs the React dashboard (frontend/).")
    p_serve.add_argument("--host", default="127.0.0.1")
    p_serve.add_argument("--port", type=int, default=8001, help="Default 8001 — 8000 is reserved for the demo target agent.")
    p_serve.add_argument("--reload", action="store_true", help="Auto-reload on code changes (development only).")
    p_serve.set_defaults(func=cmd_serve)

    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
