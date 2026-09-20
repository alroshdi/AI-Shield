from ai_shield.severity import score


def test_full_asr_critical_impact_single_turn_is_critical():
    value, band = score(attack_success_rate=1.0, severity_prior="critical", turns_count=1)
    assert value == 100
    assert band == "Critical"


def test_zero_asr_is_low_regardless_of_impact():
    value, band = score(attack_success_rate=0.0, severity_prior="critical", turns_count=1)
    assert band == "Low"


def test_more_turns_lowers_the_ease_component():
    easy, _ = score(attack_success_rate=0.5, severity_prior="high", turns_count=1)
    hard, _ = score(attack_success_rate=0.5, severity_prior="high", turns_count=5)
    assert hard < easy


def test_unknown_severity_prior_falls_back_to_medium_impact():
    value, _ = score(attack_success_rate=0.5, severity_prior="not-a-real-value", turns_count=1)
    # impact defaults to 0.5; with asr=0.5 and 1 turn: 0.4*0.5 + 0.4*0.5 + 0.2*1 = 0.6 -> 60
    assert value == 60


def test_zero_asr_is_always_zero_regardless_of_impact_or_ease():
    value, band = score(attack_success_rate=0.0, severity_prior="critical", turns_count=1)
    assert value == 0
    assert band == "Low"
