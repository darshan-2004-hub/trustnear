import math
from flask import Blueprint, request, jsonify
from sqlalchemy import func
from models.schema_models import db, User, ProviderProfile, TrustMetric, Review
from ml.ai_assistant import ai_assistant
from ml.ranker import personalize_ranking

ai_bp = Blueprint('ai_bp', __name__)

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

@ai_bp.route('', methods=['GET', 'POST'])
@ai_bp.route('/', methods=['GET', 'POST'])
@ai_bp.route('/chat', methods=['GET', 'POST'])
@ai_bp.route('/chat/', methods=['GET', 'POST'])
def ai_chat():
    if request.method == 'GET':
        return jsonify({
            'status': 'online',
            'endpoint': 'TrustNear AI Natural Language Assistant',
            'instruction': 'Send a POST request with JSON body {"message": "describe your problem"}'
        }), 200

    data = request.get_json() or {}
    user_message = data.get('message', '').strip()

    if not user_message:
        return jsonify({'success': False, 'message': 'Please provide a message.'}), 400

    # 1. Process query with Gemini LLM / Heuristic Engine
    analysis = ai_assistant.process_user_query(user_message)
    filters = analysis['extracted_filters']

    # 2. Query matching providers from database
    query = db.session.query(ProviderProfile, User, TrustMetric)\
        .join(User, ProviderProfile.user_id == User.id)\
        .outerjoin(TrustMetric, ProviderProfile.user_id == TrustMetric.provider_id)\
        .filter(ProviderProfile.verification_status == 'verified')\
        .filter(ProviderProfile.is_available == True)

    target_category = filters.get('category')
    if target_category and target_category != 'All':
        if target_category.lower() in ['cleaning', 'home cleaning']:
            query = query.filter(ProviderProfile.service_category.ilike("%cleaning%"))
        else:
            query = query.filter(ProviderProfile.service_category.ilike(f"%{target_category}%"))

    target_loc = filters.get('location')
    if target_loc:
        query = query.filter(ProviderProfile.service_address.ilike(f"%{target_loc}%"))

    results = query.all()

    # Query authentic review statistics
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

    user_lat = data.get('lat') or data.get('latitude')
    user_lon = data.get('lon') or data.get('longitude')
    try:
        user_lat = float(user_lat) if user_lat is not None else None
        user_lon = float(user_lon) if user_lon is not None else None
    except (ValueError, TypeError):
        user_lat, user_lon = None, None

    matched_providers = []

    for profile, user, trust in results:
        prov_lat = float(profile.latitude) if profile.latitude else None
        prov_lon = float(profile.longitude) if profile.longitude else None

        distance = None
        if user_lat is not None and user_lon is not None and prov_lat and prov_lon:
            distance = haversine_distance(user_lat, user_lon, prov_lat, prov_lon)

        r_stats = review_stats_map.get(user.id, {'rating': None, 'reviews_count': 0})

        matched_providers.append({
            'id': profile.id,
            'user_id': user.id,
            'full_name': user.full_name,
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

    # If emergency, prioritize speed; if budget was specified, prioritize price; otherwise trust
    if filters.get('urgency') == 'emergency':
        priority_mode = 'speed'
    elif filters.get('budget_inr') is not None:
        priority_mode = 'price'
    else:
        priority_mode = 'trust'

    ranked_matches = personalize_ranking(matched_providers, priority=priority_mode, filters=filters)

    return jsonify({
        'success': True,
        'ai_reply': analysis['conversational_reply'],
        'extracted_filters': filters,
        'engine': analysis.get('engine', 'Gemini AI'),
        'match_count': len(ranked_matches),
        'matched_providers': ranked_matches
    }), 200
