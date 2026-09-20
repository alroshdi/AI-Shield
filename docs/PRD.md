# AI Shield — Product Requirements (v0.1)

Owner: TBD · Status: Draft for review · Date: 2026-09-20

## 1. Problem

Teams ship LLM agents with no equivalent of a pentest. Security review is manual, ad hoc, and done by people who are not prompt-injection specialists. The failure modes are non-obvious (an agent can be perfectly "safe" in 99 conversations and exfiltrate a secret in the 100th) and non-deterministic, so ordinary QA does not catch them.

## 2. Who it is for

**Primary (build for this person): the AI application engineer.** Owns an agent, ships weekly, has no security team, needs to know "is this safe to launch" and "how do I fix it." Buys tools that run in CI and produce a diff-able artifact.

**Secondary: the AppSec engineer** who has just inherited five LLM features and no methodology. Needs OWASP/ATLAS-mapped findings and an exportable report for the risk register.

**Not yet:** compliance/GRC buyers. They want attestation and evidence trails — a different, heavier product. Revisit post-PMF.

## 3. Scope

### 3.1 Vulnerability classes

| # | Class | MVP? | Notes |
|---|---|---|---|
| V1 | Direct prompt injection / instruction override | ✅ | Table stakes, must be excellent. |
| V2 | System prompt & config extraction | ✅ | Cheap to test, easy to verify objectively — good first oracle. |
| V3 | Indirect prompt injection (poisoned document / tool output / retrieved content) | ✅ | **Our wedge.** Requires the harness to control a data source. |
| V4 | Tool & permission abuse (unauthorized call, scope escalation, destructive action, chaining) | ✅ | **Our wedge.** Requires a tool-calling target adapter. |
| V5 | Sensitive data leakage (secrets, other users' data, PII in context) | ⬜ v1.1 | Needs a seeded-canary design to verify objectively. |
| V6 | Jailbreaks / safety-policy bypass | ⬜ v1.1 | Most crowded, weakest differentiation, hardest to judge. Deliberately *not* first. |
| V7 | Memory poisoning, cross-session persistence | ⬜ v2 | |
| V8 | Denial-of-wallet / resource exhaustion | ⬜ v2 | |

**PM call:** the original concept listed jailbreaks near the front. I am moving them back. They are the most commoditized class, the most subjective to judge, and the least tied to our positioning. V3 and V4 are where we win.

### 3.2 In scope for MVP
- Target adapters: HTTP/JSON endpoint; OpenAI-compatible chat API; a Python callable (for local agents).
- Seeded, versioned attack corpus + LLM-driven mutation of that corpus.
- Multi-turn attack execution (bounded depth).
- Verdict engine: rule/canary checks first, LLM judge second, with a confidence score.
- N-run sampling per attack → **attack success rate**, not pass/fail.
- Severity scoring with an explicit, documented rubric.
- Remediation output: concrete, copy-pasteable fix per finding.
- Report: JSON (machine) + HTML (human). Deterministic re-run via scan manifest.
- CLI, and CI exit codes with a configurable failure threshold.

### 3.3 Explicitly out of scope for MVP
Runtime guardrails/WAF · model weight or supply-chain scanning · multimodal attacks · fine-tuning/data-poisoning attacks · SaaS multi-tenant dashboard · SSO/RBAC · scanning targets the user does not control.

## 4. Requirements

### 4.1 Functional
- **F1** Define a target in one config file (endpoint, auth, request/response shape, declared tools, declared data sources).
- **F2** Run a scan selecting attack packs by vuln class, severity, or tag.
- **F3** Every attack runs N times (default 5); report success rate and variance.
- **F4** Each finding carries: class, OWASP LLM / MITRE ATLAS mapping, severity, success rate, full reproducing transcript, judge rationale, confidence.
- **F5** Each finding carries at least one concrete remediation, and states which of our checks would verify it.
- **F6** `rescan --finding <id>` re-runs only that attack and reports fixed / still-vulnerable / inconclusive.
- **F7** A scan manifest (corpus version, seeds, model versions, config hash) makes a scan re-runnable and auditable.
- **F8** Redaction: any secret or canary the scan recovers is masked in reports by default.

### 4.2 Non-functional
- **N1** Default scan of a small agent completes in < 15 min and < $5 of model spend. Cost estimate shown *before* the scan runs.
- **N2** Judge precision ≥ 0.90 and recall ≥ 0.80 on the internal labeled set before any public claim about accuracy. Gate on this.
- **N3** Concurrency limits and rate limiting per target, with a hard global cap. We must never be the reason a customer's production endpoint falls over.
- **N4** Transcripts encrypted at rest; default retention 30 days; one-command purge.
- **N5** No attack payload that is a genuine uplift for real-world harm (working malware, CBRN synthesis, CSAM) ships in the corpus, in any pack, ever. See `RESPONSIBLE-USE.md`.

### 4.3 Safety & authorization (hard gates, not nice-to-haves)
- **S1** Scanning requires an explicit, recorded authorization assertion naming the target. No assertion, no scan.
- **S2** Destructive tool-abuse tests run only against a target flagged non-production, or with a per-scan `--i-understand` acknowledgement.
- **S3** Every scan writes an immutable audit record: who, what target, which packs, when.
- **S4** The attack corpus is a sensitive asset. Access-controlled, licensed for defensive use, never published raw.

## 5. Success metrics
See `METRICS.md`. Headline: judge precision, attack success rate stability across runs, cost per scan, and **finding→fix→verified-rescan rate** (our real value proof).

## 6. Open questions
1. Do we test the *model* or the *application*? (Recommended: application. The model is the vendor's problem; the system prompt, tools, and data flow are the customer's.)
2. CLI-first OSS core with a paid platform, or closed from day one? This decides the whole GTM.
3. Do design partners actually have tool-calling agents in production yet, or still just RAG chatbots? **If mostly the latter, our V3/V4 wedge is early and the roadmap order changes.** Highest-value thing to learn in the next two weeks.
4. Who writes and maintains the attack corpus after launch? This is a permanent role, not a project task.
