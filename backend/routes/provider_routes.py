import math
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from sqlalchemy import func
from models.schema_models import db, User, ProviderProfile, TrustMetric, Review, Booking
from routes.auth_routes import token_required
from ml.price_estimator import price_estimator
from ml.ranker import personalize_ranking

provider_bp = Blueprint('provider_bp', __name__)

def haversine_distance(lat1, lon1, lat2, lon2):
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None
    R = 6371.0
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (math.sin(dLat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dLon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

@provider_bp.route('', methods=['GET'])
def get_providers():
    category = request.args.get('category', '').strip()
    priority = request.args.get('priority', 'trust').strip().lower()  # 'trust', 'price', 'speed'
    user_lat = request.args.get('lat', type=float)
    user_lon = request.args.get('lon', type=float)

    query = db.session.query(ProviderProfile, User, TrustMetric)\
        .join(User, ProviderProfile.user_id == User.id)\
        .outerjoin(TrustMetric, ProviderProfile.user_id == TrustMetric.provider_id)\
        .filter(ProviderProfile.verification_status == 'verified')\
        .filter(ProviderProfile.is_available == True)

    if category and category.lower() != 'all':
        # Support aliases like 'Home Cleaning' vs 'Cleaning'
        if category.lower() in ['cleaning', 'home cleaning']:
            query = query.filter(
                (ProviderProfile.service_category.ilike("%cleaning%"))
            )
        else:
            query = query.filter(ProviderProfile.service_category.ilike(f"%{category}%"))

    results = query.all()

    # Aggregate authentic reviews count and average rating per provider from database
    review_stats = db.session.query(
        Review.provider_id,
        func.avg(Review.rating).label('avg_rating'),
        func.count(Review.id).label('review_count')
    ).filter(
        Review.is_approved_by_admin == True,
        Review.is_suspicious == False
    ).group_by(Review.provider_id).all()

    review_stats_map = {
        row.provider_id: {
            'rating': round(float(row.avg_rating), 1),
            'reviews_count': int(row.review_count)
        }
        for row in review_stats
    }

    providers_list = []

    for profile, user, trust in results:
        prov_lat = float(profile.latitude) if profile.latitude else None
        prov_lon = float(profile.longitude) if profile.longitude else None

        distance = None
        if user_lat is not None and user_lon is not None and prov_lat and prov_lon:
            distance = haversine_distance(user_lat, user_lon, prov_lat, prov_lon)

        r_stats = review_stats_map.get(user.id, {'rating': None, 'reviews_count': 0})

        providers_list.append({
            'id': profile.id,
            'user_id': user.id,
            'full_name': user.full_name,
            'email': user.email,
            'phone': user.phone,
            'service_category': profile.service_category,
            'experience_years': profile.experience_years,
            'hourly_rate': float(profile.hourly_rate),
            'bio': profile.bio,
            'service_address': profile.service_address,
            'latitude': prov_lat,
            'longitude': prov_lon,
            'distance_km': distance,
            'trust_score': float(trust.trust_score) if trust and trust.trust_score else 50.0,
            'completed_jobs': trust.completed_jobs if trust else 0,
            'cancellation_rate': float(trust.cancellation_rate) if trust else 0.0,
            'avg_response_minutes': trust.avg_response_minutes if trust else 25,
            'shap_factors': trust.shap_factors if trust else None,
            'rating': r_stats['rating'],
            'reviews_count': r_stats['reviews_count']
        })

    # Apply Personalized Re-ranking (Trust vs. Price vs. Speed)
    ranked_providers = personalize_ranking(providers_list, priority=priority)

    return jsonify({
        'success': True,
        'count': len(ranked_providers),
        'active_priority': priority,
        'providers': ranked_providers
    }), 200


@provider_bp.route('/estimate-price', methods=['POST'])
def estimate_price():
    """
    Computes fair market pricing for a given service category, duration, and urgency.
    """
    data = request.get_json() or {}
    category = data.get('category') or data.get('category_name') or 'Plumbing'
    try:
        duration_hours = float(data.get('duration_hours', 1.5))
    except (ValueError, TypeError):
        duration_hours = 1.5
    is_emergency = bool(data.get('is_emergency', False))

    estimation = price_estimator.estimate_price_range(
        category=category,
        duration_hours=duration_hours,
        is_emergency=is_emergency
    )

    return jsonify({
        'success': True,
        'estimation': estimation
    }), 200


@provider_bp.route('/dashboard/analytics', methods=['GET'])
@token_required
def get_provider_dashboard_analytics(current_user):
    """
    Returns dedicated analytics and performance KPIs for the authenticated provider.
    Enforces role-based access and provider data ownership.
    """
    if current_user.role != 'provider':
        return jsonify({'success': False, 'message': 'Forbidden: Provider access required.'}), 403

    provider_id = current_user.id
    profile = ProviderProfile.query.filter_by(user_id=provider_id).first()
    if not profile:
        return jsonify({'success': False, 'message': 'Provider profile not found.'}), 404

    # 1. Query all bookings for this provider
    bookings = Booking.query.filter_by(provider_id=provider_id)\
        .order_by(Booking.booking_date.asc(), Booking.created_at.asc()).all()

    total_bookings = len(bookings)
    pending_count = sum(1 for b in bookings if b.status == 'pending')
    accepted_count = sum(1 for b in bookings if b.status == 'accepted')
    in_progress_count = sum(1 for b in bookings if b.status == 'in_progress')
    active_count = accepted_count + in_progress_count
    completed_count = sum(1 for b in bookings if b.status == 'completed')
    cancelled_count = sum(1 for b in bookings if b.status == 'cancelled')

    # Total earnings from completed bookings only, using actual agreed prices
    total_earnings = sum(
        float(b.agreed_price) for b in bookings
        if b.status == 'completed' and b.agreed_price is not None
    )

    # Status distribution with counts and percentages
    status_distribution = {
        'pending': pending_count,
        'accepted': accepted_count,
        'in_progress': in_progress_count,
        'active': active_count,
        'completed': completed_count,
        'cancelled': cancelled_count,
        'percentages': {
            'pending': round((pending_count / total_bookings * 100), 1) if total_bookings > 0 else 0.0,
            'active': round((active_count / total_bookings * 100), 1) if total_bookings > 0 else 0.0,
            'completed': round((completed_count / total_bookings * 100), 1) if total_bookings > 0 else 0.0,
            'cancelled': round((cancelled_count / total_bookings * 100), 1) if total_bookings > 0 else 0.0,
        }
    }

    # 2. Monthly Earnings & Booking Trends
    today = datetime.now(timezone.utc).date()
    month_keys = []
    for i in range(5, -1, -1):
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1
        m_date = datetime(year, month, 1).date()
        month_keys.append(m_date.strftime('%Y-%m'))

    for b in bookings:
        if b.booking_date:
            b_key = b.booking_date.strftime('%Y-%m')
            if b_key not in month_keys:
                month_keys.append(b_key)

    month_keys.sort()
    if len(month_keys) > 12:
        month_keys = month_keys[-12:]

    monthly_stats = {
        m_key: {
            'month_key': m_key,
            'month': datetime.strptime(m_key, '%Y-%m').strftime('%b %Y'),
            'short_month': datetime.strptime(m_key, '%Y-%m').strftime('%b'),
            'earnings': 0.0,
            'completed_count': 0,
            'total_bookings': 0,
            'cancelled_count': 0,
            'active_count': 0
        }
        for m_key in month_keys
    }

    for b in bookings:
        if b.booking_date:
            b_key = b.booking_date.strftime('%Y-%m')
            if b_key in monthly_stats:
                monthly_stats[b_key]['total_bookings'] += 1
                if b.status == 'completed':
                    monthly_stats[b_key]['completed_count'] += 1
                    if b.agreed_price is not None:
                        monthly_stats[b_key]['earnings'] += float(b.agreed_price)
                elif b.status == 'cancelled':
                    monthly_stats[b_key]['cancelled_count'] += 1
                elif b.status in ['accepted', 'in_progress', 'pending']:
                    monthly_stats[b_key]['active_count'] += 1

    monthly_series = [monthly_stats[k] for k in month_keys]

    # 3. Trust Score, Evidence & Performance Metrics
    trust_record = TrustMetric.query.filter_by(provider_id=provider_id).first()

    reviews_all = Review.query.filter_by(
        provider_id=provider_id,
        is_approved_by_admin=True,
        is_suspicious=False
    ).order_by(Review.created_at.desc()).all()

    review_count = len(reviews_all)
    avg_rating = round(sum(r.rating for r in reviews_all) / review_count, 1) if review_count > 0 else None

    recent_reviews = []
    for r in reviews_all[:5]:
        cust = User.query.get(r.customer_id)
        b_item = Booking.query.get(r.booking_id)
        recent_reviews.append({
            'id': r.id,
            'rating': r.rating,
            'review_text': r.review_text,
            'sentiment_score': float(r.sentiment_score) if r.sentiment_score is not None else None,
            'customer_name': cust.full_name if cust else 'Verified Customer',
            'service_title': b_item.service_title if b_item else 'Home Service',
            'created_at': r.created_at.strftime('%d %b %Y') if r.created_at else None
        })

    if trust_record:
        trust_score = float(trust_record.trust_score) if trust_record.trust_score is not None else None
        cancellation_rate = float(trust_record.cancellation_rate) if trust_record.cancellation_rate is not None else 0.0
        avg_response_minutes = trust_record.avg_response_minutes
        shap_factors = trust_record.shap_factors
    else:
        trust_score = None
        cancellation_rate = 0.0
        avg_response_minutes = None
        shap_factors = None

    if completed_count > 0 and review_count > 0:
        data_source = 'real'
        evidence_note = f"Score computed from {completed_count} verified booking(s) and {review_count} real community review(s)."
    elif completed_count > 0 or review_count > 0:
        data_source = 'hybrid'
        evidence_note = f"Score based on {completed_count} completed job(s) and {review_count} review(s), augmented with local benchmark data."
    else:
        data_source = 'synthetic'
        evidence_note = "Baseline score — provider has no completed jobs or reviews yet. Metric will update automatically as services are delivered."

    return jsonify({
        'success': True,
        'profile': {
            'user_id': current_user.id,
            'full_name': current_user.full_name,
            'email': current_user.email,
            'phone': current_user.phone,
            'service_category': profile.service_category,
            'experience_years': profile.experience_years,
            'hourly_rate': float(profile.hourly_rate),
            'service_address': profile.service_address,
            'verification_status': profile.verification_status,
            'is_available': profile.is_available,
        },
        'kpis': {
            'total_bookings': total_bookings,
            'pending_requests': pending_count,
            'active_jobs': active_count,
            'completed_jobs': completed_count,
            'cancelled_jobs': cancelled_count,
            'total_earnings': round(total_earnings, 2),
            'trust_score': trust_score,
            'evidence_note': evidence_note,
            'data_source': data_source,
            'shap_factors': shap_factors,
            'avg_rating': avg_rating,
            'reviews_count': review_count,
            'avg_response_minutes': avg_response_minutes,
            'cancellation_rate': cancellation_rate,
        },
        'analytics': {
            'monthly_series': monthly_series,
            'status_distribution': status_distribution,
        },
        'recent_reviews': recent_reviews
    }), 200


@provider_bp.route('/<int:provider_id>', methods=['GET'])
def get_provider_details(provider_id):
    # Support querying by either ProviderProfile.id or ProviderProfile.user_id
    profile = ProviderProfile.query.filter(
        (ProviderProfile.id == provider_id) | (ProviderProfile.user_id == provider_id)
    ).first()

    if not profile:
        return jsonify({'success': False, 'message': 'Provider not found.'}), 404

    user = User.query.get(profile.user_id)
    trust = TrustMetric.query.filter_by(provider_id=profile.user_id).first()
    
    reviews = Review.query.filter_by(provider_id=profile.user_id, is_approved_by_admin=True)\
        .order_by(Review.created_at.desc()).limit(10).all()

    reviews_data = [{
        'id': r.id,
        'rating': r.rating,
        'review_text': r.review_text,
        'sentiment_score': float(r.sentiment_score) if r.sentiment_score is not None else None,
        'created_at': r.created_at.isoformat()
    } for r in reviews]

    avg_rating = db.session.query(func.avg(Review.rating)).filter(
        Review.provider_id == profile.user_id,
        Review.is_approved_by_admin == True,
        Review.is_suspicious == False
    ).scalar()

    review_count = db.session.query(func.count(Review.id)).filter(
        Review.provider_id == profile.user_id,
        Review.is_approved_by_admin == True,
        Review.is_suspicious == False
    ).scalar()

    return jsonify({
        'success': True,
        'provider': {
            'id': profile.id,
            'user_id': user.id,
            'full_name': user.full_name,
            'email': user.email,
            'phone': user.phone,
            'service_category': profile.service_category,
            'experience_years': profile.experience_years,
            'hourly_rate': float(profile.hourly_rate),
            'bio': profile.bio,
            'service_address': profile.service_address,
            'latitude': float(profile.latitude) if profile.latitude else None,
            'longitude': float(profile.longitude) if profile.longitude else None,
            'trust_score': float(trust.trust_score) if trust and trust.trust_score else 50.0,
            'completed_jobs': trust.completed_jobs if trust else 0,
            'cancellation_rate': float(trust.cancellation_rate) if trust else 0.0,
            'avg_response_minutes': trust.avg_response_minutes if trust else 25,
            'shap_factors': trust.shap_factors if trust else None,
            'rating': round(float(avg_rating), 1) if avg_rating else None,
            'reviews_count': int(review_count) if review_count else 0,
            'reviews': reviews_data
        }
    }), 200
