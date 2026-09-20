# AI Shield — Architecture (v0.1)

## Pipeline

```
 target.yaml ─┐
              ▼
        ┌───────────┐   ┌───────────┐   ┌──────────┐   ┌─────────┐   ┌────────┐
        │ Target    │◄──│ Attack    │◄──│ Corpus   │   │ Verdict │   │ Report │
        │ Adapter   │──▶│ Engine    │──▶│ + Mutator│──▶│ Engine  │──▶│        │
        └───────────┘   └───────────┘   └──────────┘   └─────────┘   └────────┘
             │                │                             │
      the customer's     multi-turn,              canaries → rules → LLM judge
      agent / endpoint   N-run sampling                (cheapest first)
```

## Components

**Target Adapter** — normalizes "the thing under test" to one interface: send turns, receive text + observed tool calls. Implementations: HTTP/JSON, OpenAI-compatible, Python callable. It also owns the two things that make our wedge possible:
- a **data-source hook** (we supply the "retrieved document" / tool response) → enables V3 indirect injection;
- a **tool observation channel** (declared tool schema + what the agent actually tried to call) → enables V4 tool abuse.
If a target cannot provide these, we degrade to chatbot-only testing and say so loudly in the report.

**Corpus** — versioned, signed attack packs. A pack = metadata (class, OWASP/ATLAS mapping, severity prior, tags) + seed payloads + success criteria (canary string, forbidden tool call, regex, or judge rubric). Packs are data, not code; they ship on their own release cadence — treat this like virus definitions.

**Mutator** — LLM-driven variation of seeds (encoding, roleplay framing, language switching, multi-turn decomposition). Bounded by budget and depth. Deterministic under a fixed seed so scans reproduce.

**Attack Engine** — schedules attacks, manages multi-turn state, enforces concurrency/rate limits and the budget ceiling, runs each attack N times.

**Verdict Engine** — the hardest and most important part. Three tiers, cheapest first:
1. **Deterministic** — did the seeded canary appear? was a forbidden tool called? This is ground truth and needs no LLM. *Design attacks to be deterministically checkable wherever possible.*
2. **Rules** — regex/structural checks against known leak shapes.
3. **LLM judge** — only for the genuinely subjective classes, with a written rubric, structured output, and a confidence score. Low-confidence verdicts are surfaced as "needs review," never silently asserted.

**Severity** = f(class prior, attack success rate, impact of the capability reached, attacker effort). Documented formula, not vibes.

**Reporter** — JSON is the source of truth; HTML renders from it. Every finding embeds its reproducing transcript and its remediation.

## Key decisions (and why)

| Decision | Choice | Reason |
|---|---|---|
| Attack ↔ engine coupling | Corpus is declarative data | Content ships without a release; non-engineers can contribute packs. |
| Verdicts | Tiered, deterministic-first | LLM-judging everything is expensive and unfalsifiable. Canaries are free and provable. |
| Result shape | Success rate over N runs | LLM behavior is stochastic; a single pass/fail is a lie. |
| Scan identity | Manifest with corpus version + seeds + config hash | Without this, "we fixed it" is unverifiable and rescan is meaningless. |
| MVP surface | CLI | The buyer is an engineer in CI. A dashboard before PMF is wasted quarters. |
| Judge model | Pluggable, different from the target's model where possible | Avoids a model grading its own family's failures. |

## Risks baked into this design
- The mutator generating attacks with an LLM will hit provider safety refusals. Expect it; design the corpus so deterministic seeds carry the MVP and mutation is an enhancement, not a dependency.
- Judge cost scales with corpus size × N. Tier 1/2 must catch the majority of cases or unit economics break.
