# AI Shield

**Security testing for AI agents.**

AI Shield attacks your LLM application the way a real adversary would — through poisoned documents, manipulated tool outputs, and multi-turn pressure — then tells you how *reliably* each attack works, how bad it is, and exactly how to fix it.

> **Status: working MVP.** A full scan → finding → fix → rescan loop runs end to end against the included deliberately-vulnerable demo agent. See Quickstart below. Product/engineering planning lives in [`docs/`](docs/).

## Quickstart

Requires Python 3.11+.

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate        macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

# 1. Start the deliberately vulnerable demo agent ("VulnBot")
uvicorn demo_target.app:app --port 8000

# 2. In another shell: run a scan against it
python -m ai_shield scan --target targets/vulnbot.yaml --authorized-by "you@example.com"

# 3. Open the report
#   scans/report.html  (human-readable)
#   scans/report.json  (machine-readable, source of truth)

# 4. Close the loop: apply the suggested fix, then verify it
curl -X POST http://localhost:8000/admin/harden
python -m ai_shield rescan --target targets/vulnbot.yaml --report scans/report.json --finding pi-001
```

Or with Docker: `docker compose up --build`, then `docker compose exec ai-shield python -m ai_shield scan --target targets/vulnbot.docker.yaml`.

Everything above runs fully offline — no API key, no network calls, no cost — by design. `demo_target/persona.py` is a deterministic, rule-based stand-in for an LLM-backed support agent, seeded with exactly the vulnerabilities the corpus tests for, so the whole loop is 100% reproducible for development, CI, and live demos. See its docstring for why.

## Web dashboard

The CLI writes JSON/HTML reports; the dashboard (`frontend/`) is a React SPA that reads
scan history live from a small FastAPI wrapper around the same engine (`ai_shield/api.py`)
— it doesn't re-implement scanning, only exposes `orchestrator.run_scan` /
`rescan_finding` over HTTP.

```bash
# 1. Demo agent (port 8000, same as the CLI quickstart)
uvicorn demo_target.app:app --port 8000

# 2. AI Shield web API (port 8001 — 8000 is reserved for the demo agent)
python -m ai_shield serve

# 3. Frontend dev server (proxies /api to :8001)
cd frontend && npm install && npm run dev
```

Open the printed local URL. From there you can browse scan history and trends, drill into
a finding's transcript/remediation/OWASP+MITRE ATLAS mapping, trigger a new scan against
any configured target, and rescan a single finding to verify a fix — all against the real
engine, not mock data. `npm run build` in `frontend/` produces a static `dist/` you can
serve from anywhere that also proxies `/api` to `ai-shield serve`.

## What it tests today

| Attack pack | Class | Judge tier | OWASP LLM mapping |
|---|---|---|---|
| `prompt_injection` | Direct instruction override / roleplay jailbreak framing | Tier 2 (regex) | LLM01 |
| `system_prompt_extraction` | Getting the agent to leak its own instructions | Tier 1 (canary) | LLM06 |
| `data_leakage` | Getting the agent to leak a seeded secret | Tier 1 (canary) | LLM06 |
| `tool_abuse` | Getting the agent to call a sensitive tool without authorization | Tier 1 (forbidden tool call) | LLM08 |

Every attack runs multiple trials (`--trials`, default 3) and reports an **attack success rate**, not a single pass/fail — LLM behavior is stochastic. Every finding ships with a concrete remediation and a `rescan` that verifies whether a fix actually held.

**Not yet implemented** (see [`docs/ROADMAP.md`](docs/ROADMAP.md)): indirect prompt injection via a poisoned retrieved document, the adaptive/LLM-driven attack-mutation loop, and the Tier 3 LLM judge for subjective classes like jailbreaks — see the roadmap doc for why those are the deliberate MVP cut. A first web dashboard now exists (below) alongside the CLI + JSON/HTML report.

## Three principles

1. **Deterministic first.** A seeded canary that either appeared or didn't beats an LLM's opinion. The LLM judge is the last resort, not the default — and we publish its measured precision.
2. **Rates, not verdicts.** LLMs are stochastic. Every attack runs N times and reports an attack success rate. "Pass/fail" on a single run is a lie.
3. **A finding without a fix is noise.** Every finding ships with a concrete remediation and a rescan that proves the fix held.

## Project layout

```
ai_shield/            the engine: adapters, agents (attacker/judge), severity, remediation, orchestrator, CLI, web API
demo_target/           VulnBot — the deliberately vulnerable demo agent used for dev, tests, and demos
targets/               target configs (which agent to scan, and the authorization assertion)
frontend/              React + TypeScript dashboard (Vite) — scan history, findings, corpus, targets
tests/                 unit tests for the judge/severity, plus a full end-to-end scan test
docs/                  product & engineering planning: PRD, architecture, roadmap, risks, methodology
```

## Documentation

| Doc | What's in it |
|---|---|
| [PRD](docs/PRD.md) | Scope, users, requirements, safety gates, open questions |
| [Architecture](docs/ARCHITECTURE.md) | Pipeline, components, key decisions and why |
| [Roadmap](docs/ROADMAP.md) | Milestones with exit gates |
| [Metrics](docs/METRICS.md) | What we measure, and what we refuse to measure |
| [Risks](docs/RISKS.md) | Risk register; the three that matter most |
| [Competitive landscape](docs/COMPETITIVE-LANDSCAPE.md) | Who else is here, and where the gap actually is |
| [Responsible use](docs/RESPONSIBLE-USE.md) | Authorization, corpus limits, data handling |

## Responsible use

AI Shield is a defensive security tool. **Only scan systems you own or have written permission to test.** A scan is refused unless the target config explicitly confirms authorization (see `targets/vulnbot.yaml`). The attack corpus never includes payloads that would produce genuinely harmful output on success — testing whether a system can be manipulated does not require a dangerous prize. See [`docs/RESPONSIBLE-USE.md`](docs/RESPONSIBLE-USE.md).
