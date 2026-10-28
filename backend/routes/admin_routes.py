from functools import wraps
from flask import Blueprint, request, jsonify
from models.schema_models import db, User, ProviderProfile, Booking, Review, TrustMetric
from routes.auth_routes import token_required
from ml.recalculator import recalculate_provider_trust

admin_bp = Blueprint('admin_bp', __name__)

def admin_required(f):
    @wraps(f)
    @token_required
    def decorated(current_user, *args, **kwargs):
        if current_user.role != 'admin':
            return jsonify({'success': False, 'message': 'Forbidden: Administrator privileges required.'}), 403
        return f(current_user, *args, **kwargs)
    return decorated


@admin_bp.route('', methods=['GET'])
@admin_bp.route('/', methods=['GET'])
@admin_bp.route('/stats', methods=['GET'])
@admin_bp.route('/stats/', methods=['GET'])
@admin_required
def get_platform_stats(current_user):
    """
    Returns platform-wide summary statistics for the admin overview dashboard.
    """
    total_customers = User.query.filter_by(role='customer').count()
    total_providers = User.query.filter_by(role='provider').count()
    pending_verifications = ProviderProfile.query.filter_by(verification_status='pending').count()
    total_bookings = Booking.query.count()
    completed_bookings = Booking.query.filter_by(status='completed').count()
    flagged_reviews_count = Review.query.filter_by(is_suspicious=True, is_approved_by_admin=False).count()

    return jsonify({
        'success': True,
        'stats': {
            'total_customers': total_customers,
            'total_providers': total_providers,
            'pending_verifications': pending_verifications,
            'total_bookings': total_bookings,
            'completed_bookings': completed_bookings,
            'flagged_reviews_count': flagged_reviews_count
        }
    }), 200


@admin_bp.route('/providers', methods=['GET'])
@admin_bp.route('/providers/', methods=['GET'])
@admin_required
def list_providers_for_verification(current_user):
    """
    Lists providers filtered by verification status (default: 'pending').
    """
    status_filter = request.args.get('status', 'pending').strip().lower()

    query = db.session.query(ProviderProfile, User)\
        .join(User, ProviderProfile.user_id == User.id)

    if status_filter != 'all':
        query = query.filter(ProviderProfile.verification_status == status_filter)

    results = query.order_by(ProviderProfile.created_at.desc()).all()

    providers_list = []
    for profile, user in results:
        providers_list.append({
            'user_id': user.id,
            'full_name': user.full_name,
            'email': user.email,
            'phone': user.phone,
            'service_category': profile.service_category,
            'experience_years': profile.experience_years,
            'hourly_rate': float(profile.hourly_rate),
            'bio': profile.bio,
            'service_address': profile.service_address,
            'verification_status': profile.verification_status,
            'created_at': profile.created_at.isoformat() if profile.created_at else None
        })

    return jsonify({
        'success': True,
        'count': len(providers_list),
        'providers': providers_list
    }), 200


@admin_bp.route('/providers/<int:user_id>/verify', methods=['PATCH'])
@admin_bp.route('/providers/<int:user_id>/verify/', methods=['PATCH'])
@admin_required
def update_provider_verification(current_user, user_id):
    """
    Updates a provider's verification status to 'verified' or 'rejected'.
    """
    data = request.get_json() or {}
    new_status = data.get('status', '').strip().lower()

    if new_status not in ['verified', 'rejected']:
        return jsonify({'success': False, 'message': "Status must be 'verified' or 'rejected'."}), 400

    profile = ProviderProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        return jsonify({'success': False, 'message': 'Provider profile not found.'}), 404

    try:
        profile.verification_status = new_status
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f"Provider #{user_id} verification status set to '{new_status}'.",
            'verification_status': profile.verification_status
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@admin_bp.route('/reviews/flagged', methods=['GET'])
@admin_bp.route('/reviews/flagged/', methods=['GET'])
@admin_required
def list_flagged_reviews(current_user):
    """
    Lists all reviews flagged by NLP for admin moderation.
    """
    reviews = Review.query.filter_by(is_approved_by_admin=False)\
        .order_by(Review.created_at.desc()).all()

    flagged_list = []
    for r in reviews:
        customer = User.query.get(r.customer_id)
        provider = User.query.get(r.provider_id)
        booking = Booking.query.get(r.booking_id)

        flagged_list.append({
            'id': r.id,
            'booking_id': r.booking_id,
            'service_title': booking.service_title if booking else 'Service',
            'customer_name': customer.full_name if customer else 'Customer',
            'customer_email': customer.email if customer else '',
            'provider_name': provider.full_name if provider else 'Provider',
            'rating': r.rating,
            'review_text': r.review_text,
            'sentiment_score': float(r.sentiment_score) if r.sentiment_score is not None else 0.0,
            'flag_reason': r.flag_reason,
            'created_at': r.created_at.isoformat() if r.created_at else None
        })

    return jsonify({
        'success': True,
        'count': len(flagged_list),
        'flagged_reviews': flagged_list
    }), 200


@admin_bp.route('/reviews/<int:review_id>/moderate', methods=['PATCH'])
@admin_bp.route('/reviews/<int:review_id>/moderate/', methods=['PATCH'])
@admin_required
def moderate_review(current_user, review_id):
    """
    Allows admin to either 'approve' (override NLP flag) or 'delete' a flagged review.
    """
    data = request.get_json() or {}
    action = data.get('action', '').strip().lower()

    if action not in ['approve', 'delete']:
        return jsonify({'success': False, 'message': "Action must be 'approve' or 'delete'."}), 400

    review = Review.query.get(review_id)
    if not review:
        return jsonify({'success': False, 'message': 'Review not found.'}), 404

    provider_id = review.provider_id

    try:
        if action == 'approve':
            review.is_approved_by_admin = True
            review.is_suspicious = False
            db.session.commit()
            recalculate_provider_trust(provider_id)
            return jsonify({'success': True, 'message': 'Review approved and published.'}), 200

        elif action == 'delete':
            db.session.delete(review)
            db.session.commit()
            recalculate_provider_trust(provider_id)
            return jsonify({'success': True, 'message': 'Suspicious review permanently removed.'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500
