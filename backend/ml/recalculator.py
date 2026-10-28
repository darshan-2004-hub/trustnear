from models.schema_models import db, User, Booking, Review, TrustMetric, ProviderProfile
from ml.trust_engine import trust_engine

def recalculate_provider_trust(provider_id: int):
    """
    Gathers fresh transaction and review data from MySQL for a provider,
    runs the Scikit-learn Random Forest model, and updates trust_metrics.
    """
    profile = ProviderProfile.query.filter_by(user_id=provider_id).first()
    if not profile:
        return None

    # 1. Total Completed Bookings
    completed_jobs = Booking.query.filter_by(provider_id=provider_id, status='completed').count()

    # 2. Total Bookings and Cancellation Rate
    total_bookings = Booking.query.filter_by(provider_id=provider_id).count()
    cancelled_by_provider = Booking.query.filter(
        Booking.provider_id == provider_id,
        Booking.status == 'cancelled',
        Booking.cancellation_reason.ilike('%provider%')
    ).count()

    cancellation_rate = 0.0
    if total_bookings > 0:
        cancellation_rate = round((cancelled_by_provider / total_bookings) * 100.0, 2)

    # 3. Average Review Sentiment of Approved Non-Suspicious Reviews
    approved_reviews = Review.query.filter_by(
        provider_id=provider_id,
        is_approved_by_admin=True,
        is_suspicious=False
    ).all()

    if approved_reviews and len(approved_reviews) > 0:
        sentiments = [float(r.sentiment_score) for r in approved_reviews if r.sentiment_score is not None]
        avg_sentiment = round(sum(sentiments) / len(sentiments), 4) if sentiments else 0.0
    else:
        avg_sentiment = 0.0

    # 4. Realistic Average Response Time in Minutes
    avg_response_minutes = 20  # Default benchmark

    # 5. Build feature vector
    metrics = {
        'completed_jobs': completed_jobs,
        'cancellation_rate': cancellation_rate,
        'avg_response_minutes': avg_response_minutes,
        'review_sentiment_avg': avg_sentiment,
        'experience_years': profile.experience_years
    }

    # 6. Predict new Trust Score & SHAP feature contributions
    result = trust_engine.calculate_and_explain(metrics)

    # 7. Update or create TrustMetric in MySQL
    trust_record = TrustMetric.query.filter_by(provider_id=provider_id).first()
    if not trust_record:
        trust_record = TrustMetric(provider_id=provider_id)
        db.session.add(trust_record)

    trust_record.trust_score = result['trust_score']
    trust_record.completed_jobs = completed_jobs
    trust_record.cancellation_rate = cancellation_rate
    trust_record.avg_response_minutes = avg_response_minutes
    trust_record.review_sentiment_avg = avg_sentiment
    trust_record.shap_factors = result['shap_factors']

    db.session.commit()

    return {
        'provider_id': provider_id,
        'trust_score': result['trust_score'],
        'shap_factors': result['shap_factors'],
        'metrics': metrics
    }