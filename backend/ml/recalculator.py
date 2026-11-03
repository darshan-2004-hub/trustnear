from models.schema_models import db, User, Booking, Review, TrustMetric, ProviderProfile
from ml.trust_engine import trust_engine

def recalculate_provider_trust(provider_id: int) -> dict | None:
    """
    Gathers verified transaction and review evidence from MySQL for a provider,
    runs the GradientBoosting trust model, and upserts trust_metrics.

    Data provenance
    ---------------
    'real'     — provider has >= 1 completed booking AND >= 1 approved review
    'hybrid'   — provider has some real activity but not both signals
    'synthetic' — no real booking or review data yet (baseline only)

    Returns None if the provider profile does not exist.
    """
    profile = ProviderProfile.query.filter_by(user_id=provider_id).first()
    if not profile:
        return None

    # -----------------------------------------------------------------------
    # 1. Completed bookings (real signal)
    # -----------------------------------------------------------------------
    completed_jobs = Booking.query.filter_by(
        provider_id=provider_id,
        status='completed'
    ).count()

    # -----------------------------------------------------------------------
    # 2. Cancellation rate — only provider-initiated cancellations count
    # -----------------------------------------------------------------------
    total_bookings = Booking.query.filter_by(provider_id=provider_id).count()
    cancelled_by_provider = Booking.query.filter(
        Booking.provider_id == provider_id,
        Booking.status == 'cancelled',
        Booking.cancellation_reason.ilike('%provider%')
    ).count()

    cancellation_rate = 0.0
    if total_bookings > 0:
        cancellation_rate = round((cancelled_by_provider / total_bookings) * 100.0, 2)

    # -----------------------------------------------------------------------
    # 3. Average response time in minutes
    #    Approximated as average minutes between booking creation and acceptance
    #    for bookings that moved past 'pending' status.
    #    Falls back to 20-minute benchmark if no accepted/in_progress/completed bookings.
    # -----------------------------------------------------------------------
    responded_bookings = Booking.query.filter(
        Booking.provider_id == provider_id,
        Booking.status.in_(['accepted', 'in_progress', 'completed'])
    ).all()

    if responded_bookings:
        # Use updated_at minus created_at as a proxy for response latency
        response_deltas = []
        for b in responded_bookings:
            if b.updated_at and b.created_at and b.updated_at > b.created_at:
                delta_minutes = (b.updated_at - b.created_at).total_seconds() / 60.0
                if 0 < delta_minutes < 1440:   # Cap at 24 hours — outlier guard
                    response_deltas.append(delta_minutes)

        if response_deltas:
            avg_response_minutes = int(round(sum(response_deltas) / len(response_deltas)))
            avg_response_minutes = max(1, min(avg_response_minutes, 1440))
        else:
            avg_response_minutes = 20   # benchmark default
    else:
        avg_response_minutes = 20   # no response data yet

    # -----------------------------------------------------------------------
    # 4. Review sentiment average — approved, non-suspicious reviews only
    # -----------------------------------------------------------------------
    approved_reviews = Review.query.filter_by(
        provider_id=provider_id,
        is_approved_by_admin=True,
        is_suspicious=False
    ).all()

    review_count = len(approved_reviews)
    if review_count > 0:
        sentiments = [
            float(r.sentiment_score)
            for r in approved_reviews
            if r.sentiment_score is not None
        ]
        avg_sentiment = round(sum(sentiments) / len(sentiments), 4) if sentiments else 0.0
    else:
        avg_sentiment = 0.0

    # -----------------------------------------------------------------------
    # 5. Experience years from provider profile
    # -----------------------------------------------------------------------
    experience_years = int(profile.experience_years or 0)

    # -----------------------------------------------------------------------
    # 6. Determine data provenance label
    # -----------------------------------------------------------------------
    has_real_bookings = completed_jobs > 0
    has_real_reviews  = review_count > 0

    if has_real_bookings and has_real_reviews:
        data_source = 'real'
    elif has_real_bookings or has_real_reviews:
        data_source = 'hybrid'
    else:
        data_source = 'synthetic'

    # -----------------------------------------------------------------------
    # 7. Build feature dict and run trust model
    # -----------------------------------------------------------------------
    metrics = {
        'completed_jobs':       completed_jobs,
        'cancellation_rate':    cancellation_rate,
        'avg_response_minutes': avg_response_minutes,
        'review_sentiment_avg': avg_sentiment,
        'experience_years':     experience_years,
        'data_source':          data_source
    }

    result = trust_engine.calculate_and_explain(metrics)

    # -----------------------------------------------------------------------
    # 8. Upsert TrustMetric record in MySQL
    # -----------------------------------------------------------------------
    trust_record = TrustMetric.query.filter_by(provider_id=provider_id).first()
    if not trust_record:
        trust_record = TrustMetric(provider_id=provider_id)
        db.session.add(trust_record)

    trust_record.trust_score          = result['trust_score']
    trust_record.completed_jobs       = completed_jobs
    trust_record.cancellation_rate    = cancellation_rate
    trust_record.avg_response_minutes = avg_response_minutes
    trust_record.review_sentiment_avg = avg_sentiment
    trust_record.shap_factors         = result['shap_factors']

    db.session.commit()

    return {
        'provider_id':   provider_id,
        'trust_score':   result['trust_score'],
        'shap_factors':  result['shap_factors'],
        'data_source':   result['data_source'],
        'evidence_note': result['evidence_note'],
        'metrics':       metrics
    }
