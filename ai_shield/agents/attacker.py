"""Attacker Agent — MVP version: replays an attack's static seed turns N times against a
freshly reset session each time, sampling the target's stochastic behavior into an attack
success rate rather than a single pass/fail (docs/METRICS.md).

Adaptive, LLM-driven payload mutation (refining a payload based on the target's own prior
response, bounded to a few turns) is the documented Phase 2 stretch goal — deliberately not
required for this MVP loop to run end to end, so the engine works with zero extra API cost
or provider-refusal risk.
"""

from __future__ import annotations

from ai_shield.adapters.base import TargetAdapter
from ai_shield.agents.judge import evaluate
from ai_shield.models import AttackDef, TrialResult


def run_attack(adapter: TargetAdapter, attack: AttackDef, trials: int) -> list[TrialResult]:
    results: list[TrialResult] = []
    for i in range(trials):
        adapter.reset()
        if attack.injected_document:
            # V3 indirect injection: seed the poisoned "retrieved document" fresh for
            # every trial, right after reset() so it never leaks into another attack's session.
            adapter.inject_document(attack.injected_document)
        response = adapter.send_turns(attack.turns)
        verdict = evaluate(attack, response)
        results.append(TrialResult(attack_id=attack.id, trial_index=i, target_response=response, verdict=verdict))
    return results
