"""Report generation — JSON (the source of truth, and what `rescan` reads back in) and a
self-contained HTML render for humans (no external assets, safe to hand to a security team
or drop into a demo).
"""

from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

from jinja2 import BaseLoader, Environment

from ai_shield.models import ScanReport

_BAND_COLOR = {"Critical": "#b91c1c", "High": "#c2410c", "Medium": "#a16207", "Low": "#4b5563"}

_HTML_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>AI Shield report — {{ report.manifest.target_name }}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Helvetica, Arial, sans-serif; max-width: 960px;
         margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; background: #fafafa; }
  h1 { margin-bottom: 0; }
  .meta { color: #555; font-size: 0.9rem; margin-bottom: 1.5rem; }
  .score { display: inline-block; font-size: 2.5rem; font-weight: 700; padding: 0.25rem 1rem;
           border-radius: 0.5rem; background: #111827; color: #fff; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0 2rem; }
  th, td { text-align: left; padding: 0.5rem 0.6rem; border-bottom: 1px solid #ddd; font-size: 0.92rem; }
  th { background: #f0f0f0; }
  .band { color: #fff; padding: 0.1rem 0.5rem; border-radius: 0.3rem; font-size: 0.8rem; font-weight: 600; }
  details { margin: 0.4rem 0 1rem; border: 1px solid #ddd; border-radius: 0.4rem; padding: 0.5rem 0.8rem;
            background: #fff; }
  summary { cursor: pointer; font-weight: 600; }
  pre { white-space: pre-wrap; background: #f5f5f5; padding: 0.6rem; border-radius: 0.3rem; font-size: 0.85rem; }
  .tag { display: inline-block; background: #e5e7eb; border-radius: 0.3rem; padding: 0 0.4rem;
         font-size: 0.78rem; margin-right: 0.3rem; }
  .remediation { background: #ecfdf5; border-left: 3px solid #10b981; padding: 0.5rem 0.8rem; margin-top: 0.5rem; }
</style>
</head>
<body>
  <h1>AI Shield report</h1>
  <div class="meta">
    Target: <strong>{{ report.manifest.target_name }}</strong> &middot;
    Scan {{ report.manifest.scan_id }} &middot;
    {{ report.manifest.started_at }} &middot;
    Corpus {{ report.manifest.corpus_version }} &middot;
    Authorized by {{ report.manifest.authorized_by }}
  </div>

  <div class="score">{{ report.security_score }}/100</div>
  <p>{{ report.attacks_run }} attacks run, {{ vulnerable_count }} vulnerable, {{ report.manifest.trials_per_attack }} trials each.</p>

  <table>
    <tr><th>ID</th><th>Vulnerability class</th><th>ASR</th><th>Severity</th><th>Status</th><th>Name</th></tr>
    {% for f in sorted_findings %}
    <tr>
      <td>{{ f.attack_id }}</td>
      <td>{{ f.vuln_class }}</td>
      <td>{{ (f.attack_success_rate * 100) | round | int }}%</td>
      <td><span class="band" style="background:{{ band_color(f.severity_band) }}">{{ f.severity_band }}</span></td>
      <td>{{ f.status }}</td>
      <td>{{ f.name }}</td>
    </tr>
    {% endfor %}
  </table>

  <h2>Findings</h2>
  {% for f in sorted_findings %}
  <details {% if f.attack_success_rate > 0 %}open{% endif %}>
    <summary>[{{ f.severity_band }}] {{ f.name }} ({{ f.attack_id }}) &mdash; ASR {{ (f.attack_success_rate * 100) | round | int }}%</summary>
    <p>
      <span class="tag">{{ f.owasp }}</span>
      <span class="tag">{{ f.mitre_atlas }}</span>
      <span class="tag">confidence {{ f.confidence_avg }}</span>
      {% if f.needs_review %}<span class="tag" style="background:#fde68a">needs review</span>{% endif %}
    </p>
    <p>{{ f.trials_vulnerable }} / {{ f.trials_run }} trials vulnerable.</p>
    <pre>{% for turn in f.example_transcript %}{{ turn.role }}: {{ turn.content }}
{% endfor %}</pre>
    <div class="remediation"><strong>Suggested fix:</strong> {{ f.remediation }}</div>
  </details>
  {% endfor %}
</body>
</html>
"""


def to_json(report: ScanReport) -> dict:
    return {
        "manifest": asdict(report.manifest),
        "security_score": report.security_score,
        "attacks_run": report.attacks_run,
        "findings": [asdict(f) for f in report.findings],
    }


def write_json(report: ScanReport, path: Path) -> None:
    path.write_text(json.dumps(to_json(report), indent=2), encoding="utf-8")


def write_html(report: ScanReport, path: Path) -> None:
    order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    sorted_findings = sorted(report.findings, key=lambda f: (order.get(f.severity_band, 4), -f.attack_success_rate))
    vulnerable_count = sum(1 for f in report.findings if f.attack_success_rate > 0)

    env = Environment(loader=BaseLoader())
    template = env.from_string(_HTML_TEMPLATE)
    html = template.render(
        report=report,
        sorted_findings=sorted_findings,
        vulnerable_count=vulnerable_count,
        band_color=lambda b: _BAND_COLOR.get(b, "#4b5563"),
    )
    path.write_text(html, encoding="utf-8")
