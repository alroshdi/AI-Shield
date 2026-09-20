# AI Shield — Roadmap

Each milestone has an **exit gate**. If the gate fails, we fix that milestone rather than starting the next one. This is the main defense against R8 (scope creep) and R1 (shipping a scanner nobody trusts).

---

## M0 — Validate (now → ~4 weeks)
*No platform code. The goal is to find out whether this business exists.*

- 8–10 design-partner interviews. The decisive question: **do they run agents with tools in production, or RAG chatbots?** Our wedge depends on the answer.
- Run garak and promptfoo against two real targets ourselves. Document precisely where they fall short. If they don't, we have no product.
- Hand-build ~30 attacks for V1–V4 and run them manually. Learn the oracle problem before automating it.
- Build the **labeled verdict set** (~300 pairs). This asset outlives every other artifact here.

**Gate:** ≥ 5 partners confirm the pain *and* we can name ≥ 3 concrete things existing tools miss on their targets.

---

## M1 — Trustworthy core (~6 weeks)
*One thing, done properly: a scan whose verdicts can be trusted.*

- Target adapters: HTTP/JSON + OpenAI-compatible.
- Corpus format + seed packs for **V1 (direct injection)** and **V2 (system prompt extraction)** — the two classes with the most objective oracles.
- Attack engine with N-run sampling, rate limits, budget ceiling.
- Verdict engine: Tier 1 canaries + Tier 2 rules + Tier 3 judge with confidence.
- JSON + HTML report, scan manifest, `rescan`.
- Authorization assertion + audit log (S1/S3 — ship with the first scan, not later).

**Gate:** judge precision ≥ 0.90, recall ≥ 0.80 on the labeled set. Scan < 15 min, < $5. **No gate pass, no M2.**

---

## M2 — The wedge (~8 weeks)
*The reason to choose us over a free tool.*

- Data-source hook → **V3 indirect prompt injection** (poisoned document / tool output / retrieved content).
- Tool observation channel → **V4 tool & permission abuse** (unauthorized call, scope escalation, chaining), intent-assertion based.
- Multi-turn attack chains.
- Remediation engine: concrete fix per finding + verifying rescan.
- OWASP LLM / MITRE ATLAS mapping on every finding.
- CI integration with a configurable failure threshold.

**Gate:** on a partner's real agent, we surface ≥ 3 findings garak does not, and ≥ 1 gets fixed and verified by rescan.

---

## M3 — Make it a product (~8 weeks)
- V5 data leakage (canary-seeded) and V6 jailbreak packs.
- Corpus release pipeline + freshness tracking (R6).
- Scan history, trend view, finding lifecycle (new / fixed / regressed / accepted).
- Team accounts, RBAC, retention controls.

**Gate:** 3 paying design partners scanning ≥ 2×/month in CI.

---

## Deferred beyond M3
Runtime guardrails · multimodal attacks · memory poisoning (V7) · denial-of-wallet (V8) · model supply-chain scanning · compliance/attestation reporting.

**Runtime guardrails is the big one.** It is a larger business with better recurring revenue, and several competitors have already migrated there. Do not start it before M3 — but revisit the decision at every gate, because if partners keep asking for prevention rather than detection, that is the signal to pivot.
