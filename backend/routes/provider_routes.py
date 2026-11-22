import os
import uuid
import math
from datetime import datetime, timezone, timedelta, time
from flask import Blueprint, request, jsonify
from sqlalchemy import func
from werkzeug.utils import secure_filename
from models.schema_models import (
    db, User, ProviderProfile, TrustMetric, Review, Booking,
    ProviderPortfolio, ProviderAvailability, ProviderNoShow
)
from routes.auth_routes import token_required
from ml.price_estimator import price_estimator
from ml.ranker import personalize_ranking

provider_bp = Blueprint('provider_bp', __name__)

IST = timezone(timedelta(hours=5, minutes=30))
ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}
ALLOWED_MIMETYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5MB
PORTFOLIO_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads', 'portfolio')

DEFAULT_AVAILABILITY = {
    'working_days': ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    'daily_start_time': '09:00',
    'daily_end_time': '18:00',
    'slot_duration_minutes': 60,
    'unavailable_dates': [],
    'is_accepting_bookings': True
}

def resolve_provider_user_id(provider_id):
    """Resolves whether the ID is a ProviderProfile.id or User.id, returning User.id."""
    profile = ProviderProfile.query.filter(
        (ProviderProfile.id == provider_id) | (ProviderProfile.user_id == provider_id)
    ).first()
    if profile:
        return profile.user_id
    user = User.query.filter_by(id=provider_id, role='provider').first()
    if user:
        return user.id
    return None

def calculate_provider_reliability(provider_user_id):
    """
    Transparent reliability indicator derived strictly from genuine records:
    - completed bookings
    - provider-initiated cancellations
    - confirmed no-shows (from provider_no_shows table)
    Customer-initiated cancellations do NOT penalize the provider.
    Providers with fewer than 3 trackable events display 'Not enough booking history'.
    """
    completed = Booking.query.filter_by(provider_id=provider_user_id, status='completed').count()
    provider_cancellations = Booking.query.filter(
        Booking.provider_id == provider_user_id,
        Booking.status == 'cancelled',
        Booking.cancelled_by == provider_user_id
    ).count()
    customer_cancellations = Booking.query.filter(
        Booking.provider_id == provider_user_id,
        Booking.status == 'cancelled',
        (Booking.cancelled_by != provider_user_id) | (Booking.cancelled_by.is_(None))
    ).count()
    confirmed_no_shows = ProviderNoShow.query.filter_by(
        provider_id=provider_user_id,
        status='confirmed'
    ).count()
    reported_no_shows = ProviderNoShow.query.filter_by(
        provider_id=provider_user_id,
        status='reported'
    ).count()

    total_trackable = completed + provider_cancellations + confirmed_no_shows
    MIN_TRACKABLE_EVENTS = 3

    if total_trackable < MIN_TRACKABLE_EVENTS:
        reliability_rate = None
        status_label = "Not enough booking history"
        explanation = "Provider needs at least 3 completed bookings or attendance events to calculate an official reliability rating."
    else:
        reliability_rate = round((completed / total_trackable) * 100, 1)
        if reliability_rate >= 90.0:
            status_label = "High Reliability"
        elif reliability_rate >= 75.0:
            status_label = "Moderate Reliability"
        else:
            status_label = "Needs Improvement"
        explanation = f"Calculated strictly from {completed} completed booking(s), {provider_cancellations} provider cancellation(s), and {confirmed_no_shows} confirmed no-show(s). Customer-initiated cancellations do not affect this score."

    return {
        'provider_id': provider_user_id,
        'reliability_rate': reliability_rate,
        'status_label': status_label,
        'explanation': explanation,
        'breakdown': {
            'completed_bookings': completed,
            'provider_cancellations': provider_cancellations,
            'customer_cancellations': customer_cancellations,
            'confirmed_no_shows': confirmed_no_shows,
            'reported_no_shows': reported_no_shows,
            'total_trackable_events': total_trackable,
            'min_events_required': MIN_TRACKABLE_EVENTS
        }
    }


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
        .filter(User.account_status == 'active')\
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
            'reliability': calculate_provider_reliability(current_user.id),
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
    
    reviews = Review.query.filter_by(
        provider_id=profile.user_id,
        is_approved_by_admin=True,
        is_suspicious=False
    ).order_by(Review.created_at.desc()).limit(15).all()

    reviews_data = []
    for r in reviews:
        cust = User.query.get(r.customer_id)
        b_item = Booking.query.get(r.booking_id) if r.booking_id else None
        reviews_data.append({
            'id': r.id,
            'rating': r.rating,
            'review_text': r.review_text,
            'sentiment_score': float(r.sentiment_score) if r.sentiment_score is not None else None,
            'customer_name': cust.full_name if cust else 'Verified Customer',
            'service_title': b_item.service_title if b_item else None,
            'created_at': r.created_at.isoformat() if r.created_at else None
        })

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

    completed_count = Booking.query.filter_by(
        provider_id=profile.user_id,
        status='completed'
    ).count()

    # Evidence note & data source determination
    real_reviews_count = int(review_count) if review_count else 0
    if completed_count > 0 and real_reviews_count > 0:
        data_source = 'real'
        evidence_note = f"Score computed from {completed_count} verified booking(s) and {real_reviews_count} genuine community review(s)."
    elif completed_count > 0 or real_reviews_count > 0:
        data_source = 'hybrid'
        evidence_note = f"Score based on {completed_count} completed job(s) and {real_reviews_count} review(s), augmented with platform benchmark data."
    else:
        data_source = 'synthetic'
        evidence_note = "Baseline score — provider has no completed jobs or community reviews yet."

    trust_score_val = float(trust.trust_score) if trust and trust.trust_score is not None else None
    reliability_data = calculate_provider_reliability(profile.user_id)

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
            'verification_status': profile.verification_status,
            'is_available': profile.is_available,
            'trust_score': trust_score_val,
            'evidence_note': evidence_note,
            'data_source': data_source,
            'completed_jobs': completed_count if completed_count > 0 else (trust.completed_jobs if trust else 0),
            'cancellation_rate': float(trust.cancellation_rate) if trust and trust.cancellation_rate is not None else 0.0,
            'avg_response_minutes': trust.avg_response_minutes if trust else 25,
            'shap_factors': trust.shap_factors if trust else None,
            'rating': round(float(avg_rating), 1) if avg_rating else None,
            'reviews_count': real_reviews_count,
            'reviews': reviews_data,
            'reliability': reliability_data
        }
    }), 200


# ==========================================
# STAGE 5: PROVIDER PORTFOLIO ENDPOINTS
# ==========================================

@provider_bp.route('/portfolio/upload', methods=['POST'])
@token_required
def upload_portfolio_image(current_user):
    """
    Handles secure image upload for provider past work portfolio.
    Validates file extension, MIME type, and size (<= 5MB).
    """
    if current_user.role != 'provider':
        return jsonify({'success': False, 'message': 'Forbidden: Only providers can upload portfolio images.'}), 403

    if getattr(current_user, 'account_status', 'active') == 'suspended':
        return jsonify({'success': False, 'message': 'Your provider account is suspended. You cannot upload portfolio images.'}), 403
    if getattr(current_user, 'account_status', 'active') == 'deleted':
        return jsonify({'success': False, 'message': 'Account is inactive.'}), 403

    if 'file' not in request.files and 'image' not in request.files:
        return jsonify({'success': False, 'message': 'No image file provided in request.'}), 400

    file = request.files.get('file') or request.files.get('image')
    if not file or file.filename == '':
        return jsonify({'success': False, 'message': 'Selected file is empty.'}), 400

    # Validate extension
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return jsonify({
            'success': False,
            'message': f'Unsupported file type. Allowed formats: {", ".join(ALLOWED_IMAGE_EXTENSIONS)}.'
        }), 400

    # Read bytes to validate MIME type and size
    file_bytes = file.read()
    if len(file_bytes) > MAX_UPLOAD_SIZE:
        return jsonify({'success': False, 'message': 'File size exceeds maximum limit of 5MB.'}), 400

    # Validate MIME type if provided
    content_type = file.content_type or ''
    if content_type and content_type.lower() not in ALLOWED_MIMETYPES:
        return jsonify({'success': False, 'message': f'Invalid image format {content_type}.'}), 400

    # Verify actual file content via binary magic signatures (deep content inspection)
    is_valid_signature = False
    if len(file_bytes) >= 12:
        if ext in ['jpg', 'jpeg'] and file_bytes[:3] == b'\xff\xd8\xff':
            is_valid_signature = True
        elif ext == 'png' and file_bytes[:8] == b'\x89PNG\r\n\x1a\n':
            is_valid_signature = True
        elif ext == 'webp' and file_bytes[:4] == b'RIFF' and file_bytes[8:12] == b'WEBP':
            is_valid_signature = True

    if not is_valid_signature:
        return jsonify({
            'success': False,
            'message': 'Invalid file content: Binary signature does not match a valid JPEG, PNG, or WEBP image.'
        }), 400

    # Ensure upload directory exists
    os.makedirs(PORTFOLIO_UPLOAD_DIR, exist_ok=True)

    # Generate secure filename (hex UUID + validated ext prevents any path traversal)
    filename = f"{uuid.uuid4().hex}.{ext}"
    dest_path = os.path.abspath(os.path.join(PORTFOLIO_UPLOAD_DIR, filename))
    if not dest_path.startswith(os.path.abspath(PORTFOLIO_UPLOAD_DIR)):
        return jsonify({'success': False, 'message': 'Invalid upload path destination.'}), 400

    with open(dest_path, 'wb') as f:
        f.write(file_bytes)

    image_url = f"/api/uploads/portfolio/{filename}"
    return jsonify({
        'success': True,
        'message': 'Image uploaded successfully.',
        'image_url': image_url,
        'filename': filename
    }), 201


@provider_bp.route('/<int:provider_id>/portfolio', methods=['GET'])
def get_provider_portfolio(provider_id):
    """
    Publicly exposes verified past work portfolio for the requested provider.
    """
    user_id = resolve_provider_user_id(provider_id)
    if not user_id:
        return jsonify({'success': False, 'message': 'Provider not found.'}), 404

    items = ProviderPortfolio.query.filter_by(
        provider_id=user_id,
        authorized_for_display=True
    ).order_by(ProviderPortfolio.completion_date.desc(), ProviderPortfolio.created_at.desc()).all()

    return jsonify({
        'success': True,
        'provider_id': user_id,
        'count': len(items),
        'portfolio': [item.to_dict() for item in items]
    }), 200


@provider_bp.route('/portfolio', methods=['POST'])
@token_required
def create_portfolio_item(current_user):
    """
    Allows a verified provider to add a new previous work showcase entry.
    Requires title, category, description, completion date, and authorization confirmation.
    """
    if current_user.role != 'provider':
        return jsonify({'success': False, 'message': 'Forbidden: Only providers can create portfolio entries.'}), 403

    if getattr(current_user, 'account_status', 'active') == 'suspended':
        return jsonify({'success': False, 'message': 'Your provider account is suspended. You cannot create portfolio entries.'}), 403
    if getattr(current_user, 'account_status', 'active') == 'deleted':
        return jsonify({'success': False, 'message': 'Account is inactive.'}), 403

    data = request.get_json() or {}
    title = data.get('title', '').strip()
    service_category = data.get('service_category', '').strip()
    description = data.get('description', '').strip()
    completion_date_str = data.get('completion_date', '').strip()
    before_image_url = data.get('before_image_url', '').strip() or None
    after_image_url = data.get('after_image_url', '').strip() or None
    authorized = data.get('authorized_for_display', data.get('is_authorized', False))

    if not title:
        return jsonify({'success': False, 'message': 'Project title is required.'}), 400
    if not service_category:
        return jsonify({'success': False, 'message': 'Service category is required.'}), 400
    if not description:
        return jsonify({'success': False, 'message': 'Project description is required.'}), 400
    if not completion_date_str:
        return jsonify({'success': False, 'message': 'Completion date is required.'}), 400
    if not authorized:
        return jsonify({'success': False, 'message': 'You must confirm authorization to showcase this client work.'}), 400

    try:
        comp_date = datetime.strptime(completion_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid completion date format. Use YYYY-MM-DD.'}), 400

    try:
        new_entry = ProviderPortfolio(
            provider_id=current_user.id,
            title=title,
            service_category=service_category,
            description=description,
            before_image_url=before_image_url,
            after_image_url=after_image_url,
            completion_date=comp_date,
            authorized_for_display=True
        )
        db.session.add(new_entry)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Portfolio work added successfully.',
            'portfolio_item': new_entry.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@provider_bp.route('/portfolio/<int:item_id>', methods=['PUT'])
@token_required
def update_portfolio_item(current_user, item_id):
    """
    Updates an existing portfolio entry. Enforces provider ownership.
    """
    if current_user.role != 'provider':
        return jsonify({'success': False, 'message': 'Forbidden: Only providers can update portfolio entries.'}), 403

    if getattr(current_user, 'account_status', 'active') == 'suspended':
        return jsonify({'success': False, 'message': 'Your provider account is suspended. You cannot update portfolio entries.'}), 403
    if getattr(current_user, 'account_status', 'active') == 'deleted':
        return jsonify({'success': False, 'message': 'Account is inactive.'}), 403

    item = ProviderPortfolio.query.get(item_id)
    if not item:
        return jsonify({'success': False, 'message': 'Portfolio item not found.'}), 404

    if item.provider_id != current_user.id:
        return jsonify({'success': False, 'message': 'Forbidden: You do not own this portfolio item.'}), 403

    data = request.get_json() or {}
    if 'title' in data:
        t = data['title'].strip()
        if not t:
            return jsonify({'success': False, 'message': 'Title cannot be empty.'}), 400
        item.title = t

    if 'service_category' in data:
        cat = data['service_category'].strip()
        if not cat:
            return jsonify({'success': False, 'message': 'Service category cannot be empty.'}), 400
        item.service_category = cat

    if 'description' in data:
        desc = data['description'].strip()
        if not desc:
            return jsonify({'success': False, 'message': 'Description cannot be empty.'}), 400
        item.description = desc

    if 'completion_date' in data and data['completion_date']:
        try:
            item.completion_date = datetime.strptime(data['completion_date'].strip(), '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid completion date format. Use YYYY-MM-DD.'}), 400

    if 'before_image_url' in data:
        item.before_image_url = data['before_image_url'].strip() or None
    if 'after_image_url' in data:
        item.after_image_url = data['after_image_url'].strip() or None
    if 'authorized_for_display' in data:
        item.authorized_for_display = bool(data['authorized_for_display'])

    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Portfolio item updated successfully.',
            'portfolio_item': item.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@provider_bp.route('/portfolio/<int:item_id>', methods=['DELETE'])
@token_required
def delete_portfolio_item(current_user, item_id):
    """
    Deletes a portfolio entry. Enforces provider ownership.
    """
    if current_user.role != 'provider':
        return jsonify({'success': False, 'message': 'Forbidden: Only providers can delete portfolio entries.'}), 403

    if getattr(current_user, 'account_status', 'active') == 'suspended':
        return jsonify({'success': False, 'message': 'Your provider account is suspended. You cannot delete portfolio entries.'}), 403
    if getattr(current_user, 'account_status', 'active') == 'deleted':
        return jsonify({'success': False, 'message': 'Account is inactive.'}), 403

    item = ProviderPortfolio.query.get(item_id)
    if not item:
        return jsonify({'success': False, 'message': 'Portfolio item not found.'}), 404

    if item.provider_id != current_user.id:
        return jsonify({'success': False, 'message': 'Forbidden: You do not own this portfolio item.'}), 403

    try:
        db.session.delete(item)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Portfolio item deleted successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


# ==========================================
# STAGE 5: PROVIDER AVAILABILITY & SLOTS
# ==========================================

@provider_bp.route('/<int:provider_id>/availability', methods=['GET'])
def get_provider_availability(provider_id):
    """
    Returns working schedule and slot configuration for the provider.
    """
    user_id = resolve_provider_user_id(provider_id)
    if not user_id:
        return jsonify({'success': False, 'message': 'Provider not found.'}), 404

    avail = ProviderAvailability.query.filter_by(provider_id=user_id).first()
    if avail:
        return jsonify({'success': True, 'availability': avail.to_dict()}), 200

    # Default fallback
    default_data = dict(DEFAULT_AVAILABILITY)
    default_data['provider_id'] = user_id
    default_data['id'] = None
    return jsonify({'success': True, 'availability': default_data}), 200


@provider_bp.route('/availability', methods=['PUT'])
@token_required
def update_provider_availability(current_user):
    """
    Allows a provider to configure their working days, hours, slot duration, and unavailable dates.
    """
    if current_user.role != 'provider':
        return jsonify({'success': False, 'message': 'Forbidden: Only providers can update availability.'}), 403

    if getattr(current_user, 'account_status', 'active') == 'suspended':
        return jsonify({'success': False, 'message': 'Your provider account is suspended. You cannot modify availability.'}), 403
    if getattr(current_user, 'account_status', 'active') == 'deleted':
        return jsonify({'success': False, 'message': 'Account is inactive.'}), 403

    data = request.get_json() or {}
    working_days = data.get('working_days')
    daily_start_time_str = data.get('daily_start_time', '').strip()
    daily_end_time_str = data.get('daily_end_time', '').strip()
    slot_duration = data.get('slot_duration_minutes', 60)
    unavailable_dates = data.get('unavailable_dates', [])
    is_accepting_bookings = data.get('is_accepting_bookings', True)

    VALID_DAYS = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}
    if working_days is not None:
        if not isinstance(working_days, list) or not all(d in VALID_DAYS for d in working_days):
            return jsonify({'success': False, 'message': 'Invalid working days specified.'}), 400

    try:
        start_t = datetime.strptime(daily_start_time_str, '%H:%M').time() if daily_start_time_str else time(9, 0)
        end_t = datetime.strptime(daily_end_time_str, '%H:%M').time() if daily_end_time_str else time(18, 0)
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid time format. Use HH:MM.'}), 400

    if start_t >= end_t:
        return jsonify({'success': False, 'message': 'Daily start time must be earlier than daily end time.'}), 400

    try:
        slot_duration = int(slot_duration)
    except (ValueError, TypeError):
        slot_duration = 60

    if slot_duration not in [30, 45, 60, 90, 120]:
        return jsonify({'success': False, 'message': 'Slot duration must be 30, 45, 60, 90, or 120 minutes.'}), 400

    # Clean unavailable dates
    cleaned_unavailable = []
    if isinstance(unavailable_dates, list):
        for ud in unavailable_dates:
            try:
                datetime.strptime(str(ud).strip(), '%Y-%m-%d')
                cleaned_unavailable.append(str(ud).strip())
            except ValueError:
                pass

    try:
        avail = ProviderAvailability.query.filter_by(provider_id=current_user.id).first()
        if not avail:
            avail = ProviderAvailability(provider_id=current_user.id)
            db.session.add(avail)

        if working_days is not None:
            avail.working_days = working_days
        else:
            avail.working_days = DEFAULT_AVAILABILITY['working_days']
        avail.daily_start_time = start_t
        avail.daily_end_time = end_t
        avail.slot_duration_minutes = slot_duration
        avail.unavailable_dates = cleaned_unavailable
        avail.is_accepting_bookings = bool(is_accepting_bookings)

        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Availability settings saved successfully.',
            'availability': avail.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@provider_bp.route('/<int:provider_id>/slots', methods=['GET'])
def get_provider_available_slots(provider_id):
    """
    Returns generated slots for a given date, respecting provider's working days,
    hours, unavailable dates, past time filtering, and active booking conflicts.
    """
    user_id = resolve_provider_user_id(provider_id)
    if not user_id:
        return jsonify({'success': False, 'message': 'Provider not found.'}), 404

    date_str = request.args.get('date', '').strip()
    if not date_str:
        return jsonify({'success': False, 'message': 'Query parameter "date" (YYYY-MM-DD) is required.'}), 400

    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date format. Use YYYY-MM-DD.'}), 400

    now_ist = datetime.now(IST)
    today_ist = now_ist.date()

    avail = ProviderAvailability.query.filter_by(provider_id=user_id).first()
    working_days = avail.working_days if avail else DEFAULT_AVAILABILITY['working_days']
    start_time = avail.daily_start_time if avail else time(9, 0)
    end_time = avail.daily_end_time if avail else time(18, 0)
    duration_mins = avail.slot_duration_minutes if avail else 60
    unavailable_dates = avail.unavailable_dates or [] if avail else []
    is_accepting = avail.is_accepting_bookings if avail else True

    # 1. Past Date check
    if target_date < today_ist:
        return jsonify({
            'success': True,
            'date': date_str,
            'slots': [],
            'slot_duration_minutes': duration_mins,
            'is_working_day': False,
            'message': 'Date is in the past.'
        }), 200

    # 2. Provider accepting bookings check
    if not is_accepting:
        return jsonify({
            'success': True,
            'date': date_str,
            'slots': [],
            'slot_duration_minutes': duration_mins,
            'is_accepting_bookings': False,
            'message': 'Provider is currently not accepting new bookings.'
        }), 200

    # 3. Working day check
    day_name = target_date.strftime('%A')
    if day_name not in working_days:
        return jsonify({
            'success': True,
            'date': date_str,
            'slots': [],
            'slot_duration_minutes': duration_mins,
            'is_working_day': False,
            'message': f'{day_name} is not a working day for this provider.'
        }), 200

    # 4. Unavailable specific date check
    if date_str in unavailable_dates:
        return jsonify({
            'success': True,
            'date': date_str,
            'slots': [],
            'slot_duration_minutes': duration_mins,
            'is_unavailable_date': True,
            'message': 'Provider has marked this specific date as unavailable.'
        }), 200

    # 5. Fetch existing active bookings for this provider on this date
    active_bookings = Booking.query.filter(
        Booking.provider_id == user_id,
        Booking.booking_date == target_date,
        Booking.status.in_(['pending', 'accepted', 'in_progress'])
    ).all()

    # Generate time slots
    slots = []
    slot_dt = datetime.combine(target_date, start_time)
    end_dt = datetime.combine(target_date, end_time)
    step = timedelta(minutes=duration_mins)

    while slot_dt + step <= end_dt:
        slot_start_time = slot_dt.time()
        slot_end_time = (slot_dt + step).time()

        is_available = True
        unavailable_reason = None

        # Check past slot for today
        if target_date == today_ist and slot_start_time <= now_ist.time():
            is_available = False
            unavailable_reason = 'past'
        else:
            # Check overlap with any active booking
            for b in active_bookings:
                b_start = b.booking_time
                if b.end_time:
                    b_end = b.end_time
                else:
                    # Backward compatibility for bookings without end_time
                    b_end = (datetime.combine(target_date, b.booking_time) + step).time()

                # Overlap condition: startA < endB and endA > startB
                if (slot_start_time < b_end) and (slot_end_time > b_start):
                    is_available = False
                    unavailable_reason = 'booked'
                    break

        slots.append({
            'start_time': slot_start_time.strftime('%H:%M'),
            'end_time': slot_end_time.strftime('%H:%M'),
            'available': is_available,
            'reason': unavailable_reason
        })

        slot_dt += step

    return jsonify({
        'success': True,
        'date': date_str,
        'day_of_week': day_name,
        'slot_duration_minutes': duration_mins,
        'is_working_day': True,
        'is_accepting_bookings': True,
        'slots': slots
    }), 200


@provider_bp.route('/<int:provider_id>/reliability', methods=['GET'])
def get_provider_reliability_endpoint(provider_id):
    """
    Returns the transparent reliability metrics breakdown for a provider.
    """
    user_id = resolve_provider_user_id(provider_id)
    if not user_id:
        return jsonify({'success': False, 'message': 'Provider not found.'}), 404

    reliability = calculate_provider_reliability(user_id)
    return jsonify({
        'success': True,
        'reliability': reliability
    }), 200

