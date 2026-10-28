def normalize(value, min_val, max_val, invert=False):
    """
    Min-Max normalizes a value into [0, 1]. If invert=True, lower values yield higher scores.
    """
    if max_val == min_val:
        return 1.0
    norm = (value - min_val) / (max_val - min_val)
    if invert:
        norm = 1.0 - norm
    return max(0.0, min(1.0, norm))

def personalize_ranking(providers: list, priority: str = 'trust') -> list:
    """
    Re-ranks a list of providers by weighting Trust Score, Hourly Rate, and Response Time.
    Available priorities: 'trust' (Reliability), 'price' (Budget), 'speed' (Fastest Availability).
    """
    if not providers or len(providers) <= 1:
        return providers

    # Weights configuration
    if priority == 'price':
        w_price, w_trust, w_speed = 0.65, 0.20, 0.15
    elif priority == 'speed':
        w_speed, w_trust, w_price = 0.65, 0.20, 0.15
    else:  # default 'trust'
        w_trust, w_price, w_speed = 0.65, 0.20, 0.15

    # Extract bounds for normalization
    trust_scores = [p['trust_score'] for p in providers]
    hourly_rates = [p['hourly_rate'] for p in providers]
    response_times = [p['avg_response_minutes'] for p in providers]

    min_trust, max_trust = min(trust_scores), max(trust_scores)
    min_price, max_price = min(hourly_rates), max(hourly_rates)
    min_time, max_time = min(response_times), max(response_times)

    ranked = []
    for p in providers:
        # Normalize: Trust (higher is better), Price (lower is better), Response Time (lower is better)
        s_trust = normalize(p['trust_score'], min_trust, max_trust, invert=False)
        s_price = normalize(p['hourly_rate'], min_price, max_price, invert=True)
        s_speed = normalize(p['avg_response_minutes'], min_time, max_time, invert=True)

        composite_score = (w_trust * s_trust) + (w_price * s_price) + (w_speed * s_speed)
        match_percentage = round(composite_score * 100.0, 1)

        p_copy = dict(p)
        p_copy['personalized_score'] = round(composite_score, 4)
        p_copy['match_percentage'] = match_percentage
        p_copy['active_priority'] = priority
        ranked.append(p_copy)

    # Sort descending by composite score
    ranked.sort(key=lambda x: x['personalized_score'], reverse=True)
    return ranked