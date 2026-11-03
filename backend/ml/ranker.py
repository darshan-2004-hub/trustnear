import statistics

def normalize(value, min_val, max_val, invert=False):
    """
    Min-Max normalizes a value into [0.0, 1.0].
    If invert=True, lower values yield higher scores (e.g. price, response time, distance).
    Safely handles edge cases where max_val == min_val or values are non-numeric.
    """
    try:
        val = float(value)
        min_v = float(min_val)
        max_v = float(max_val)
    except (TypeError, ValueError):
        return 0.5

    if max_v <= min_v:
        # Uniform population — mid-score for all
        return 0.75

    norm = (val - min_v) / (max_v - min_v)
    if invert:
        norm = 1.0 - norm
    return max(0.0, min(1.0, norm))


def _build_recommendation_reason(p, priority, s_trust, s_price, s_speed, s_rating, s_distance) -> str:
    """
    Generates a human-readable explanation for why this provider was recommended.
    Picks the top 2 strongest signals based on the active priority.
    """
    raw_trust = p.get('trust_score')
    try:
        trust_score = float(raw_trust) if raw_trust is not None else 50.0
    except (ValueError, TypeError):
        trust_score = 50.0

    raw_rating = p.get('rating')
    try:
        rating = float(raw_rating) if raw_rating is not None else None
    except (ValueError, TypeError):
        rating = None

    raw_rate = p.get('hourly_rate')
    try:
        rate = float(raw_rate) if raw_rate is not None else None
    except (ValueError, TypeError):
        rate = None

    raw_speed = p.get('avg_response_minutes')
    try:
        speed = float(raw_speed) if raw_speed is not None else None
    except (ValueError, TypeError):
        speed = None

    raw_dist = p.get('distance_km')
    try:
        dist = float(raw_dist) if raw_dist is not None else None
    except (ValueError, TypeError):
        dist = None

    raw_reviews = p.get('reviews_count') or p.get('completed_jobs') or 0
    try:
        reviews = int(raw_reviews)
    except (ValueError, TypeError):
        reviews = 0

    parts = []

    # --- Primary signal based on priority ---
    if priority == 'trust':
        if s_trust >= 0.75:
            parts.append(f"top trust score of {trust_score:.1f}/100")
        elif s_trust >= 0.5:
            parts.append(f"solid trust score of {trust_score:.1f}/100")
        else:
            parts.append(f"trust score of {trust_score:.1f}/100")
    elif priority == 'price':
        if rate is not None:
            parts.append(f"competitive rate of INR {int(rate)}/hr")
        else:
            parts.append("competitive pricing")
    elif priority == 'speed':
        if speed is not None:
            parts.append(f"fast {int(speed)}-minute avg response time")
        else:
            parts.append("quick response availability")

    # --- Secondary signals (top 1 remaining) ---
    secondary_scores = []
    if priority != 'rating' and rating and rating > 0:
        secondary_scores.append(('rating', s_rating, f"{rating:.1f}-star rating ({reviews} reviews)" if reviews else f"{rating:.1f}-star rating"))
    if priority != 'price' and rate is not None:
        secondary_scores.append(('price', s_price, f"INR {int(rate)}/hr rate"))
    if priority != 'speed' and speed is not None:
        secondary_scores.append(('speed', s_speed, f"{int(speed)}-min response time"))
    if priority != 'distance' and dist is not None:
        secondary_scores.append(('distance', s_distance, f"{dist:.1f} km away"))

    secondary_scores.sort(key=lambda x: x[1], reverse=True)
    if secondary_scores:
        parts.append(secondary_scores[0][2])

    if not parts:
        return "Verified local provider available for your service request."

    if len(parts) == 1:
        return f"Recommended for their {parts[0]}."

    return f"Recommended for their {parts[0]} and {parts[1]}."


def personalize_ranking(providers: list, priority: str = 'trust', filters: dict = None) -> list:
    """
    Re-ranks providers using a 5-feature composite score:
      trust_score, rating, hourly_rate, avg_response_minutes, distance_km.

    Parameters
    ----------
    providers : list of dicts — provider records from DB
    priority  : 'trust' | 'price' | 'speed'  (default: 'trust')
    filters   : optional dict with keys:
                  budget_inr (int|None) — exclude providers whose hourly_rate > budget_inr * 1.5
                  (other filter keys are ignored here; they are applied upstream in ai_routes)

    Returns list of provider dicts with added keys:
      personalized_score, match_score, match_percentage, active_priority, recommendation_reason
    """
    if not providers:
        return []

    filters = filters or {}
    budget_inr = filters.get('budget_inr')

    # --- Budget pre-filter: exclude providers whose rate is clearly over budget ---
    if budget_inr and budget_inr > 0:
        cutoff = float(budget_inr) * 1.5
        affordable = [p for p in providers if p.get('hourly_rate') is None or float(p.get('hourly_rate', 0)) <= cutoff]
        # Only apply filter if at least one provider survives
        if affordable:
            providers = affordable

    # --- Priority weight distributions (5 features) ---
    priority_clean = str(priority).strip().lower()
    if priority_clean == 'price':
        w_trust, w_rating, w_price, w_speed, w_distance = 0.25, 0.10, 0.45, 0.15, 0.05
    elif priority_clean == 'speed':
        w_trust, w_rating, w_price, w_speed, w_distance = 0.25, 0.10, 0.15, 0.45, 0.05
    else:  # default 'trust'
        priority_clean = 'trust'
        w_trust, w_rating, w_price, w_speed, w_distance = 0.50, 0.20, 0.15, 0.10, 0.05

    # --- Edge case: single provider after filtering ---
    if len(providers) == 1:
        p_copy = dict(providers[0])
        p_copy['personalized_score'] = 1.0
        p_copy['match_score'] = 1.0
        p_copy['match_percentage'] = 100.0
        p_copy['active_priority'] = priority_clean
        p_copy['recommendation_reason'] = "Top local provider for your service request."
        return [p_copy]

    # --- Helper: safely extract numeric field with fallback ---
    def get_num(p, key, fallback):
        val = p.get(key)
        if val is None:
            return None  # Return None to distinguish "missing" from "zero"
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    # --- Extract raw values (None = missing) ---
    trust_vals = [get_num(p, 'trust_score', None) for p in providers]
    rating_vals = [get_num(p, 'rating', None) for p in providers]
    price_vals = [get_num(p, 'hourly_rate', None) for p in providers]
    speed_vals = [get_num(p, 'avg_response_minutes', None) for p in providers]
    dist_vals = [get_num(p, 'distance_km', None) for p in providers]

    # --- Baseline domain defaults for missing values ---
    DEFAULT_TRUST = 50.0
    DEFAULT_RATING = 3.5
    DEFAULT_PRICE = 350.0
    DEFAULT_SPEED = 25.0

    # Impute missing values with conservative domain defaults (ensures unrated/missing providers don't borrow top metrics)
    trust_imputed = [v if v is not None else DEFAULT_TRUST for v in trust_vals]
    rating_imputed = [v if v is not None else DEFAULT_RATING for v in rating_vals]
    price_imputed = [v if v is not None else DEFAULT_PRICE for v in price_vals]
    speed_imputed = [v if v is not None else DEFAULT_SPEED for v in speed_vals]

    # For distance: if no distances at all, disable the distance feature (weight falls to trust)
    valid_distances = [v for v in dist_vals if v is not None]
    dist_feature_available = len(valid_distances) > 0
    fallback_dist = max(valid_distances) if dist_feature_available else 0.0
    dist_imputed = [v if v is not None else fallback_dist for v in dist_vals] if dist_feature_available else [0.0] * len(providers)

    # --- Compute bounds for normalization ---
    min_trust, max_trust = min(trust_imputed), max(trust_imputed)
    min_rating, max_rating = min(rating_imputed), max(rating_imputed)
    min_price, max_price = min(price_imputed), max(price_imputed)
    min_speed, max_speed = min(speed_imputed), max(speed_imputed)
    min_dist = min(dist_imputed) if dist_feature_available else 0.0
    max_dist = max(dist_imputed) if dist_feature_available else 0.0

    # Redistribute distance weight to trust if no distance data available
    eff_w_trust = w_trust + (w_distance if not dist_feature_available else 0.0)
    eff_w_distance = w_distance if dist_feature_available else 0.0

    ranked = []
    for i, p in enumerate(providers):
        t_val = trust_imputed[i]
        r_val = rating_imputed[i]
        pr_val = price_imputed[i]
        sp_val = speed_imputed[i]
        di_val = dist_imputed[i]

        # Normalize each feature
        s_trust    = normalize(t_val,  min_trust,  max_trust,  invert=False)
        s_rating   = normalize(r_val,  min_rating, max_rating, invert=False)
        s_price    = normalize(pr_val, min_price,  max_price,  invert=True)   # lower rate = better
        s_speed    = normalize(sp_val, min_speed,  max_speed,  invert=True)   # lower time = better
        s_distance = normalize(di_val, min_dist,   max_dist,   invert=True) if dist_feature_available else 0.75

        composite_score = (
            eff_w_trust    * s_trust +
            w_rating       * s_rating +
            w_price        * s_price +
            w_speed        * s_speed +
            eff_w_distance * s_distance
        )
        composite_score = max(0.0, min(1.0, composite_score))
        match_percentage = round(composite_score * 100.0, 1)

        reason = _build_recommendation_reason(
            p, priority_clean, s_trust, s_price, s_speed, s_rating, s_distance
        )

        p_copy = dict(p)
        p_copy['personalized_score']    = round(composite_score, 4)
        p_copy['match_score']           = round(composite_score, 4)
        p_copy['match_percentage']      = match_percentage
        p_copy['active_priority']       = priority_clean
        p_copy['recommendation_reason'] = reason
        ranked.append(p_copy)

    # Sort descending by composite score
    ranked.sort(key=lambda x: x['personalized_score'], reverse=True)
    return ranked
