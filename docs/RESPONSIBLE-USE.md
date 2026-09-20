# Responsible Use & Safety Policy

AI Shield is a security testing tool. It generates and sends adversarial input to AI systems. That is legitimate, well-established defensive work — the same category as a web vulnerability scanner — and it carries the same obligations.

## Authorization
Only scan systems you own or have **written permission** to test. Every scan records an authorization assertion naming the target. Unauthorized scanning of third-party systems may be illegal in your jurisdiction and is a violation of these terms.

## Hard limits on the attack corpus
These are product invariants, not guidelines. They do not get relaxed for a customer, a demo, or a benchmark.

1. **No real-world uplift.** No payload that, if it succeeds, yields genuinely dangerous output — working malware or exploit code, weapons or CBRN synthesis, CSAM, or targeted harassment of a real person. We test *whether a system can be manipulated*, which does not require dangerous content as the prize. A canary string works exactly as well as a real secret.
2. **Canaries, not real secrets.** Data-leakage tests use seeded synthetic markers. We never require a customer to load real credentials or real PII to be tested.
3. **Non-destructive by default.** Tool-abuse tests assert *intent* — that the agent attempted a forbidden call — rather than letting the call execute. Destructive execution requires a non-production target flag and an explicit acknowledgement.
4. **Corpus is controlled.** Attack packs are access-controlled and licensed for defensive use. We do not publish raw payload libraries.

## Data handling
Scan transcripts may contain your system prompt and anything an attack successfully extracted. They are encrypted at rest, redacted by default in reports, retained 30 days by default, and purgeable on command. They are never used to train models without explicit, separate, opt-in consent.

## Disclosure
If a scan reveals a vulnerability in a **third-party model or platform** rather than in the customer's own configuration, we follow coordinated disclosure with that vendor before any publication.

## Reporting misuse
security@ — TBD before launch. A published contact is a launch blocker.
