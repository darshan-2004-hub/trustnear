import math
from flask import Blueprint, request, jsonify
from sqlalchemy import func
from models.schema_models import db, User, ProviderProfile, TrustMetric, Review
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