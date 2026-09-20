# AI Shield — Risk Register

Scored L(ikelihood) × I(mpact), 1–5. Owner TBD on all. Reviewed at each milestone gate.

| # | Risk | L | I | Mitigation | Trigger to escalate |
|---|---|---|---|---|---|
| R1 | **The oracle problem.** We cannot reliably tell a vulnerability from a harmless response. False positives destroy trust; false negatives are dangerous. | 5 | 5 | Deterministic canaries first, LLM judge last. Labeled set + published precision/recall. Confidence scores; "needs review" state. | Precision < 0.85 after two tuning cycles → pause feature work, fix the judge. |
| R2 | **Crowded market, no differentiation.** Feature parity with a free tool (garak) and several funded startups. | 5 | 5 | Narrow to agents: indirect injection + tool abuse. Track novel-finding rate vs garak. | Design partners say "we already run garak and it's enough." |
| R3 | **Non-determinism** makes results unreproducible and undermines "we fixed it." | 5 | 4 | N-run sampling, report ASR not pass/fail. Scan manifest pins corpus/seeds/model versions. | ASR variance > 20% across identical scans. |
| R4 | **We are building an offensive tool.** Misuse against systems the user does not own; the corpus itself is dangerous content. | 3 | 5 | Mandatory authorization assertion; audit log; rate limits; corpus access control; no real-world-uplift payloads ever. See `RESPONSIBLE-USE.md`. | Any evidence of use against a third-party target. |
| R5 | **We hold the customer's crown jewels** — scan transcripts contain their system prompts and any data the attack successfully leaked. A breach of AI Shield is worse than a breach of the customer. | 3 | 5 | Encrypt at rest, redact by default, 30-day default retention, one-command purge, tenant isolation, no transcripts in logs or telemetry. | Any plan to centralize transcripts for "model improvement." Requires explicit opt-in, or don't. |
| R6 | **Corpus decay.** Attacks stop working as providers patch. The product silently becomes useless. | 5 | 4 | Continuous content pipeline, staffed. Freshness metric on the dashboard. Budget it as an ongoing cost from day one. | Freshness < 60%. |
| R7 | **Cost per scan** makes the product unsellable or unprofitable. | 4 | 3 | Tier verdicts; pre-scan cost estimate; hard budget ceiling per scan; cache mutations. | Median scan > $10. |
| R8 | **Scope creep.** 8 vuln classes × platform × dashboard × integrations before anything is good. | 4 | 4 | MVP is 4 classes, CLI only. Everything else is explicitly deferred in the PRD. | Any milestone adding a class before the previous one hits its precision gate. |
| R9 | **Provider ToS / safety refusals** on LLM-generated attacks. Our own mutator gets blocked. | 4 | 3 | Deterministic seed corpus carries the MVP; mutation is an enhancement. Review provider acceptable-use terms for security-testing carve-outs before committing to a vendor. | Mutator refusal rate > 30%. |
| R10 | **We break a customer's production system** with load or a destructive tool call. | 3 | 5 | Rate limits, concurrency caps, non-prod flag required for destructive packs, kill switch. | Any incident. One is too many. |
| R11 | **Point-in-time purchase.** Scanners are bought once; guardrails are bought monthly. Weak recurring revenue. | 4 | 3 | Land in CI so every PR is a scan. Corpus subscription as the recurring unit. | Scans-per-target-per-month < 2. |
| R12 | **Regulatory drift** (EU AI Act and successors) changes what evidence customers need. | 3 | 3 | Map findings to OWASP LLM / MITRE ATLAS / NIST AI RMF from day one — cheap now, expensive to retrofit. | — |

## The three I would actually lose sleep over
**R1 (oracle)** — it is the product. **R2 (differentiation)** — it is the business. **R5 (data custody)** — it is the thing that ends the company if we get it wrong.
