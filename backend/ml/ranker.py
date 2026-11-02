def normalize(value, min_val, max_val, invert=False):
    """
    Min-Max normalizes a value into [0.0, 1.0]. If invert=True, lower values yield higher scores.
    Safely handles edge cases where max_val == min_val or values are non-numeric.
    """
    try:
        val = float(value)
        min_v = float(min_val)
        max_v = float(max_val)
    except (TypeError, ValueError):
        return 0.5

    if max_v <= min_v:
        # Uniform population fallback
        return 0.85

    norm = (val - min_v) / (max_v - min_v)
    if invert:
        norm = 1.0 - norm
    return max(0.0, min(1.0, norm))

def personalize_ranking(providers: list, priority: str = 'trust') -> list:
    """
    Re-ranks a list of providers by weighting Trust Score, Hourly Rate, and Response Time.
    Available priorities: 'trust' (Reliability), 'price' (Budget), 'speed' (Fastest Availability).
    Gracefully handles edge cases: empty lists, single-element lists, missing fields, and identical metrics.
    """
    if not providers:
        return []

    # Priority weight distributions
    priority_clean = str(priority).strip().lower()
    if priority_clean == 'price':
        w_price, w_trust, w_speed = 0.65, 0.20, 0.15
    elif priority_clean == 'speed':
        w_speed, w_trust, w_price = 0.65, 0.20, 0.15
    else:  # default 'trust'
        priority_clean = 'trust'
        w_trust, w_price, w_speed = 0.65, 0.20, 0.15

    # Edge Case: Single Provider
    if len(providers) == 1:
        p_copy = dict(providers[0])
        p_copy['personalized_score'] = 1.0
        p_copy['match_score'] = 1.0
        p_copy['match_percentage'] = 100.0
        p_copy['active_priority'] = priority_clean
        return [p_copy]

    # Extract bounds with fallback defaults for missing/None values
    def get_num(p, key, fallback):
        val = p.get(key)
        if val is None:
            return fallback
        try:
            return float(val)
        except (ValueError, TypeError):
            return fallback

    trust_scores = [get_num(p, 'trust_score', 50.0) for p in providers]
    hourly_rates = [get_num(p, 'hourly_rate', 350.0) for p in providers]
    response_times = [get_num(p, 'avg_response_minutes', 25.0) for p in providers]

    min_trust, max_trust = min(trust_scores), max(trust_scores)
    min_price, max_price = min(hourly_rates), max(hourly_rates)
    min_time, max_time = min(response_times), max(response_times)

    ranked = []
    for p in providers:
        p_trust = get_num(p, 'trust_score', 50.0)
        p_price = get_num(p, 'hourly_rate', 350.0)
        p_speed = get_num(p, 'avg_response_minutes', 25.0)

        # Normalize: Trust (higher is better), Price (lower is better), Response Time (lower is better)
        s_trust = normalize(p_trust, min_trust, max_trust, invert=False)
        s_price = normalize(p_price, min_price, max_price, invert=True)
        s_speed = normalize(p_speed, min_time, max_time, invert=True)

        composite_score = (w_trust * s_trust) + (w_price * s_price) + (w_speed * s_speed)
        composite_score = max(0.0, min(1.0, composite_score))
        match_percentage = round(composite_score * 100.0, 1)

        p_copy = dict(p)
        p_copy['personalized_score'] = round(composite_score, 4)
        p_copy['match_score'] = round(composite_score, 4)
        p_copy['match_percentage'] = match_percentage
        p_copy['active_priority'] = priority_clean
        ranked.append(p_copy)

    # Sort descending by composite score
    ranked.sort(key=lambda x: x['personalized_score'], reverse=True)
    return ranked