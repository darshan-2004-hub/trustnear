from flask import Blueprint, request, jsonify
from models.schema_models import db, User, ProviderProfile, TrustMetric
from ml.ai_assistant import ai_assistant
from ml.ranker import personalize_ranking

ai_bp = Blueprint('ai_bp', __name__)

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
        query = query.filter(ProviderProfile.service_category.ilike(f"%{target_category}%"))

    target_loc = filters.get('location')
    if target_loc:
        query = query.filter(ProviderProfile.service_address.ilike(f"%{target_loc}%"))

    results = query.all()
    matched_providers = []

    for profile, user, trust in results:
        matched_providers.append({
            'id': profile.id,
            'user_id': user.id,
            'full_name': user.full_name,
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
            'shap_factors': trust.shap_factors if trust else None
        })

    # If emergency, personalize ranking by speed; otherwise by trust
    priority_mode = 'speed' if filters.get('urgency') == 'emergency' else 'trust'
    ranked_matches = personalize_ranking(matched_providers, priority=priority_mode)

    return jsonify({
        'success': True,
        'ai_reply': analysis['conversational_reply'],
        'extracted_filters': filters,
        'engine': analysis.get('engine', 'Gemini AI'),
        'match_count': len(ranked_matches),
        'matched_providers': ranked_matches
    }), 200
