# Competitive Landscape — AI Shield

Status: PM assessment, 2026-09-20. Verify every claim before it goes in a pitch deck; this is written from working knowledge, not a fresh market scan.

## Honest summary

The problem is real and the market is growing. **It is also crowded, and the feature list in the original concept — prompt injection, jailbreaks, data leakage, system prompt extraction, tool abuse — is table stakes, not differentiation.** At least a dozen funded companies and several mature open-source projects already ship exactly that list. A new entrant that only does that list loses.

The product is still worth building, but only on a narrower wedge. See "Where the gap is" below.

## Who is already here

**Open source (free, and good)**
| Project | Shape | Why it matters to us |
|---|---|---|
| garak (NVIDIA) | CLI vulnerability scanner, very large probe library | Our closest free substitute. "Why not just run garak?" is the #1 question we must answer. |
| PyRIT (Microsoft) | Python red-team orchestration framework | Multi-turn attack orchestration; framework not product. |
| promptfoo | Evals + red-team module, dev-workflow-native | Strongest CI/dev-loop story; commercial tier too. |
| Giskard | LLM/ML testing + scanning | Quality + security blend. |
| Agent-focused scanners | Emerging, MCP/tool-graph analysis | Closest to our intended wedge — watch closely. |

**Commercial**
Lakera, HiddenLayer, Mindgard, SplxAI, CalypsoAI, Haize Labs, Repello, Adversa, plus the acquired players now inside big security vendors (Robust Intelligence → Cisco, Protect AI → Palo Alto). Several have shifted from testing toward runtime guardrails, because guardrails carry recurring revenue and testing tends to be a point-in-time purchase.

**Adjacent standards we must map to, not compete with**
OWASP Top 10 for LLM Applications, MITRE ATLAS, NIST AI RMF, EU AI Act obligations. Findings that do not carry these identifiers are much harder to get into an enterprise risk register.

## Where the gap actually is

Most existing tools are strongest at **single-turn, text-in/text-out chatbot probing**. They are weakest at:

1. **Agents with tools.** Does the agent call a dangerous tool it should not? Can an attacker get it to chain tools, escalate permission scope, or spend money? This is under-served and is exactly where production risk is moving.
2. **Indirect prompt injection.** The payload arrives inside a retrieved document, a web page, an email, an MCP tool response — not from the user. Testing this needs the harness to control the agent's *data sources*, not just its chat input. Few tools do this well.
3. **Multi-turn and memory.** Attacks that only succeed over 5–20 turns, or that poison persistent memory and detonate in a later session.
4. **The verdict problem.** Nearly every tool tells you "attack succeeded." Almost none tell you *how reliably*, or prove their judge is accurate. Trust here is a real, defensible differentiator (see `METRICS.md`).
5. **Remediation that is actually applied.** Most tools stop at a finding. A concrete patch — a rewritten system prompt, a tool-permission diff, a guardrail rule, and a rescan that proves it worked — is where the buyer's pain actually ends.

## Recommended positioning

> **AI Shield tests AI agents, not chatbots.** It attacks your agent through the channels a real attacker uses — retrieved documents, tool outputs, multi-turn manipulation — reports how *reliably* each attack works rather than a binary pass/fail, and closes the loop with a patch and a rescan that proves the fix held.

Three claims we must be able to defend on day one:
1. We test indirect injection and tool abuse, not just prompt text.
2. Our verdicts are measured — we publish our judge's precision and recall.
3. Every finding ships with a fix, and the rescan proves it.

## What would make me kill or pivot this

- We cannot beat garak on finding quality within one quarter *and* have no agent/indirect-injection story.
- Design partners tell us they want a runtime guardrail, not a scanner. (Likely for some. If it is most, pivot.)
- Judge precision plateaus below ~0.85 on our labeled set. A noisy scanner is worse than none; teams stop reading the reports.
