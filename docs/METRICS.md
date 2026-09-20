# AI Shield — Metrics

## The one that decides whether this product works

**Judge precision** on an internal labeled set of ~300 hand-labeled (attack, response) pairs.

A scanner that cries wolf gets uninstalled in week two. Precision ≥ 0.90 / recall ≥ 0.80 is the gate before we make any public accuracy claim or ship to a design partner. Measure it every time the corpus, judge prompt, or judge model changes. Treat a regression here as a P0.

## Product quality
- **Attack success rate (ASR)** per attack, per target — the unit of a finding.
- **ASR stability** — variance across repeated identical scans. High variance means our N is too low.
- **Corpus freshness** — % of packs validated against current frontier models in the last 90 days. Jailbreaks decay; this number decays with them.
- **Novel-finding rate** — findings we surface that a garak run on the same target does not. This is the quantitative form of "why not just use the free tool."

## Product usage
- **Time to first scan** (install → first finding). Target < 10 minutes. This is the adoption bottleneck.
- **Finding → fix → verified rescan rate.** The single best proxy for real value delivered. If people read findings and never rescan, we are producing reports, not security.
- Scans per target per month (are we in CI, or a one-time curiosity?).

## Economics
- Model spend per scan (target + mutator + judge, broken out).
- % of verdicts resolved at Tier 1/2 without an LLM judge call. Higher is cheaper and more trustworthy.

## Deliberately not tracked as a success metric
**Number of findings.** It is trivially gameable by lowering the verdict threshold, and optimizing for it directly destroys precision.
