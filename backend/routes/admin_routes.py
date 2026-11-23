import re
from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, request, jsonify
from sqlalchemy import or_, and_
from sqlalchemy.orm import aliased
from models.schema_models import (
    db, User, ProviderProfile, Booking, Review, TrustMetric,
    ProviderNoShow, ProviderPortfolio, AdminAuditLog, log_admin_action, Payment
)
from routes.auth_routes import token_required
from routes.provider_routes import calculate_provider_reliability
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
    Returns platform-wide summary statistics and live operational metrics
    for the admin overview dashboard.
    """
    # Customer metrics
    total_customers = User.query.filter_by(role='customer').filter(User.account_status != 'deleted').count()
    active_customers = User.query.filter_by(role='customer', account_status='active').count()
    suspended_customers = User.query.filter_by(role='customer', account_status='suspended').count()

    # Provider metrics
    total_providers = User.query.filter_by(role='provider').filter(User.account_status != 'deleted').count()
    verified_providers = db.session.query(ProviderProfile).join(User, ProviderProfile.user_id == User.id)\
        .filter(User.role == 'provider', User.account_status != 'deleted', ProviderProfile.verification_status == 'verified').count()
    pending_verifications = db.session.query(ProviderProfile).join(User, ProviderProfile.user_id == User.id)\
        .filter(User.role == 'provider', User.account_status != 'deleted', ProviderProfile.verification_status == 'pending').count()
    rejected_providers = db.session.query(ProviderProfile).join(User, ProviderProfile.user_id == User.id)\
        .filter(User.role == 'provider', User.account_status != 'deleted', ProviderProfile.verification_status == 'rejected').count()
    suspended_providers = User.query.filter_by(role='provider', account_status='suspended').count()

    # Booking metrics
    total_bookings = Booking.query.count()
    pending_bookings = Booking.query.filter_by(status='pending').count()
    accepted_bookings = Booking.query.filter_by(status='accepted').count()
    in_progress_bookings = Booking.query.filter_by(status='in_progress').count()
    completed_bookings = Booking.query.filter_by(status='completed').count()
    cancelled_bookings = Booking.query.filter_by(status='cancelled').count()

    # Review metrics
    total_reviews = Review.query.count()
    flagged_reviews_count = Review.query.filter_by(is_suspicious=True, is_approved_by_admin=False, is_deleted=False).count()
    approved_reviews_count = Review.query.filter_by(is_approved_by_admin=True, is_deleted=False).count()
    removed_reviews_count = Review.query.filter_by(is_deleted=True).count()

    # No-show metrics
    pending_no_shows_count = ProviderNoShow.query.filter_by(status='reported').count()
    total_no_shows_count = ProviderNoShow.query.count()

    # Recent admin activity (last 8 actions)
    recent_logs = AdminAuditLog.query.order_by(AdminAuditLog.created_at.desc()).limit(8).all()
    recent_activity = []
    for l in recent_logs:
        admin_user = User.query.get(l.admin_id) if l.admin_id else None
        recent_activity.append({
            'id': l.id,
            'admin_id': l.admin_id,
            'admin_name': admin_user.full_name if admin_user else 'System Admin',
            'action': l.action,
            'target_type': l.target_type,
            'target_id': l.target_id,
            'details': l.details,
            'created_at': l.created_at.isoformat() if l.created_at else None
        })

    return jsonify({
        'success': True,
        'stats': {
            'total_customers': total_customers,
            'active_customers': active_customers,
            'suspended_customers': suspended_customers,
            'total_providers': total_providers,
            'verified_providers': verified_providers,
            'pending_verifications': pending_verifications,
            'rejected_providers': rejected_providers,
            'suspended_providers': suspended_providers,
            'total_bookings': total_bookings,
            'pending_bookings': pending_bookings,
            'accepted_bookings': accepted_bookings,
            'in_progress_bookings': in_progress_bookings,
            'completed_bookings': completed_bookings,
            'cancelled_bookings': cancelled_bookings,
            'total_reviews': total_reviews,
            'flagged_reviews_count': flagged_reviews_count,
            'approved_reviews_count': approved_reviews_count,
            'removed_reviews_count': removed_reviews_count,
            'pending_no_shows_count': pending_no_shows_count,
            'total_no_shows_count': total_no_shows_count
        },
        'recent_activity': recent_activity
    }), 200


@admin_bp.route('/providers', methods=['GET'])
@admin_bp.route('/providers/', methods=['GET'])
@admin_required
def list_providers(current_user):
    """
    Lists providers with search, verification and account status filters, pagination, and KPI stats.
    Compatible with existing pending verification queries.
    """
    search = request.args.get('search', '').strip()
    status_filter = (request.args.get('status') or request.args.get('verification_status') or 'all').strip().lower()
    account_filter = request.args.get('account_status', 'all').strip().lower()

    query = db.session.query(ProviderProfile, User)\
        .join(User, ProviderProfile.user_id == User.id)\
        .filter(User.role == 'provider')

    if status_filter != 'all':
        query = query.filter(ProviderProfile.verification_status == status_filter)

    if account_filter != 'all':
        query = query.filter(User.account_status == account_filter)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                User.full_name.ilike(term),
                User.email.ilike(term),
                User.phone.ilike(term),
                ProviderProfile.service_category.ilike(term)
            )
        )

    total_count = query.count()

    # Pagination
    page = max(1, int(request.args.get('page', 1)))
    per_page_param = request.args.get('limit', request.args.get('per_page', 20))
    try:
        per_page = int(per_page_param)
    except (ValueError, TypeError):
        per_page = 20

    if per_page > 0:
        results = query.order_by(ProviderProfile.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
        total_pages = max(1, (total_count + per_page - 1) // per_page)
    else:
        results = query.order_by(ProviderProfile.created_at.desc()).all()
        total_pages = 1

    providers_list = []
    for profile, user in results:
        trust = TrustMetric.query.filter_by(provider_id=user.id).first()
        total_b = Booking.query.filter_by(provider_id=user.id).count()
        comp_b = Booking.query.filter_by(provider_id=user.id, status='completed').count()

        providers_list.append({
            'id': user.id,
            'user_id': user.id,
            'full_name': user.full_name,
            'email': user.email,
            'phone': user.phone,
            'role': user.role,
            'account_status': getattr(user, 'account_status', 'active') or 'active',
            'service_category': profile.service_category,
            'experience_years': profile.experience_years,
            'hourly_rate': float(profile.hourly_rate) if profile.hourly_rate else 0.0,
            'bio': profile.bio,
            'service_address': profile.service_address,
            'is_available': profile.is_available,
            'verification_status': profile.verification_status,
            'trust_score': float(trust.trust_score) if trust and trust.trust_score else 50.0,
            'total_bookings': total_b,
            'completed_bookings': comp_b,
            'created_at': profile.created_at.isoformat() if profile.created_at else None
        })

    # Summary KPI stats
    total_providers = User.query.filter_by(role='provider').count()
    verified_providers = ProviderProfile.query.filter_by(verification_status='verified').count()
    pending_verifications = ProviderProfile.query.filter_by(verification_status='pending').count()
    rejected_providers = ProviderProfile.query.filter_by(verification_status='rejected').count()
    suspended_providers = User.query.filter(User.role == 'provider', User.account_status == 'suspended').count()

    stats = {
        'total_providers': total_providers,
        'verified_providers': verified_providers,
        'pending_verifications': pending_verifications,
        'rejected_providers': rejected_providers,
        'suspended_providers': suspended_providers
    }

    return jsonify({
        'success': True,
        'count': len(providers_list),
        'total_count': total_count,
        'page': page,
        'limit': per_page,
        'total_pages': total_pages,
        'stats': stats,
        'providers': providers_list
    }), 200


@admin_bp.route('/providers/<int:provider_id>', methods=['GET'])
@admin_bp.route('/providers/<int:provider_id>/', methods=['GET'])
@admin_required
def get_provider_detail(current_user, provider_id):
    """
    Returns complete details of a single provider for admin review:
    profile, portfolio, bookings, reliability, trust score, and audit history.
    """
    user = User.query.filter_by(id=provider_id, role='provider').first()
    if not user:
        return jsonify({'success': False, 'message': 'Provider not found.'}), 404

    profile = ProviderProfile.query.filter_by(user_id=provider_id).first()
    trust = TrustMetric.query.filter_by(provider_id=provider_id).first()
    portfolios = ProviderPortfolio.query.filter_by(provider_id=provider_id).order_by(ProviderPortfolio.created_at.desc()).all()
    reliability = calculate_provider_reliability(provider_id)

    bookings = Booking.query.filter_by(provider_id=provider_id).order_by(Booking.created_at.desc()).all()
    bookings_data = []
    for b in bookings:
        cust = User.query.get(b.customer_id)
        bookings_data.append({
            'id': b.id,
            'customer_id': b.customer_id,
            'customer_name': cust.full_name if cust else 'Customer',
            'customer_email': cust.email if cust else None,
            'service_title': b.service_title,
            'service_category': b.service_category,
            'booking_date': b.booking_date.isoformat() if b.booking_date else None,
            'booking_time': b.booking_time.strftime('%H:%M') if b.booking_time else None,
            'end_time': b.end_time.strftime('%H:%M') if b.end_time else None,
            'agreed_price': float(b.agreed_price) if b.agreed_price else 0.0,
            'status': b.status,
            'cancelled_by': b.cancelled_by,
            'cancellation_reason': b.cancellation_reason,
            'created_at': b.created_at.isoformat() if b.created_at else None
        })

    booking_stats = {
        'total': len(bookings),
        'completed': sum(1 for b in bookings if b.status == 'completed'),
        'cancelled': sum(1 for b in bookings if b.status == 'cancelled'),
        'pending': sum(1 for b in bookings if b.status in ['pending', 'accepted', 'in_progress'])
    }

    logs = AdminAuditLog.query.filter_by(target_type='provider', target_id=provider_id)\
        .order_by(AdminAuditLog.created_at.desc()).limit(15).all()

    return jsonify({
        'success': True,
        'provider': {
            'id': user.id,
            'full_name': user.full_name,
            'email': user.email,
            'phone': user.phone,
            'account_status': getattr(user, 'account_status', 'active') or 'active',
            'role': user.role,
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'updated_at': user.updated_at.isoformat() if user.updated_at else None
        },
        'profile': profile.to_dict() if profile else None,
        'trust_metric': trust.to_dict() if trust else None,
        'reliability': reliability,
        'portfolio': [p.to_dict() for p in portfolios],
        'bookings': bookings_data,
        'booking_stats': booking_stats,
        'audit_logs': [l.to_dict() for l in logs]
    }), 200


@admin_bp.route('/providers/<int:provider_id>', methods=['PATCH'])
@admin_bp.route('/providers/<int:provider_id>/', methods=['PATCH'])
@admin_required
def update_provider_profile(current_user, provider_id):
    """
    Updates editable fields of a provider profile and user record.
    Prevents role escalation and sensitive field modification.
    """
    user = User.query.filter_by(id=provider_id, role='provider').first()
    if not user:
        return jsonify({'success': False, 'message': 'Provider not found.'}), 404

    profile = ProviderProfile.query.filter_by(user_id=provider_id).first()
    if not profile:
        return jsonify({'success': False, 'message': 'Provider profile not found.'}), 404

    data = request.get_json(silent=True) or {}
    changes = {}

    if 'full_name' in data:
        name = data['full_name'].strip()
        if len(name) < 2:
            return jsonify({'success': False, 'message': 'Full name must be at least 2 characters.'}), 400
        user.full_name = name
        changes['full_name'] = name

    if 'phone' in data:
        raw_phone = data['phone']
        if raw_phone:
            clean_phone = re.sub(r'[\s\-\+]', '', raw_phone)
            if len(clean_phone) < 10:
                return jsonify({'success': False, 'message': 'Phone number must be at least 10 digits.'}), 400
            user.phone = raw_phone.strip()
            changes['phone'] = user.phone
        else:
            user.phone = None
            changes['phone'] = None

    if 'service_category' in data:
        cat = data['service_category'].strip()
        if cat:
            profile.service_category = cat
            changes['service_category'] = cat

    if 'experience_years' in data:
        try:
            exp = int(data['experience_years'])
            if exp < 0:
                return jsonify({'success': False, 'message': 'Experience years must be >= 0.'}), 400
            profile.experience_years = exp
            changes['experience_years'] = exp
        except (ValueError, TypeError):
            return jsonify({'success': False, 'message': 'Invalid experience years.'}), 400

    if 'hourly_rate' in data:
        try:
            rate = float(data['hourly_rate'])
            if rate < 0:
                return jsonify({'success': False, 'message': 'Hourly rate must be >= 0.'}), 400
            profile.hourly_rate = rate
            changes['hourly_rate'] = rate
        except (ValueError, TypeError):
            return jsonify({'success': False, 'message': 'Invalid hourly rate.'}), 400

    if 'bio' in data:
        profile.bio = data['bio'].strip() if data['bio'] else None
        changes['bio'] = profile.bio

    if 'service_address' in data:
        profile.service_address = data['service_address'].strip() if data['service_address'] else None
        changes['service_address'] = profile.service_address

    if 'is_available' in data:
        profile.is_available = bool(data['is_available'])
        changes['is_available'] = profile.is_available

    if not changes:
        return jsonify({'success': False, 'message': 'No editable fields provided.'}), 400

    try:
        db.session.commit()
        log_admin_action(
            admin_id=current_user.id,
            action='edit_provider_profile',
            target_type='provider',
            target_id=provider_id,
            details=changes
        )
        return jsonify({
            'success': True,
            'message': f'Provider #{provider_id} updated successfully.',
            'provider': user.to_dict(),
            'profile': profile.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@admin_bp.route('/providers/<int:provider_id>/verify', methods=['PATCH', 'POST'])
@admin_bp.route('/providers/<int:provider_id>/verify/', methods=['PATCH', 'POST'])
@admin_required
def update_provider_verification(current_user, provider_id):
    """
    Updates a provider's verification status to 'verified' or 'rejected'.
    Records decision and reason in the admin audit log.
    """
    data = request.get_json(silent=True) or {}
    new_status = data.get('status', '').strip().lower()
    reason = data.get('reason', '').strip()

    if new_status not in ['verified', 'rejected']:
        return jsonify({'success': False, 'message': "Status must be 'verified' or 'rejected'."}), 400

    profile = ProviderProfile.query.filter_by(user_id=provider_id).first()
    if not profile:
        return jsonify({'success': False, 'message': 'Provider profile not found.'}), 404

    try:
        profile.verification_status = new_status
        if new_status == 'rejected':
            profile.is_available = False
        db.session.commit()

        action = 'approve_provider' if new_status == 'verified' else 'reject_provider'
        log_admin_action(
            admin_id=current_user.id,
            action=action,
            target_type='provider',
            target_id=provider_id,
            details={'status': new_status, 'reason': reason or ('Approved by administrator' if new_status == 'verified' else 'Rejected by administrator')}
        )

        return jsonify({
            'success': True,
            'message': f"Provider #{provider_id} verification status set to '{new_status}'.",
            'verification_status': profile.verification_status
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@admin_bp.route('/providers/<int:provider_id>/suspend', methods=['POST', 'PATCH'])
@admin_bp.route('/providers/<int:provider_id>/suspend/', methods=['POST', 'PATCH'])
@admin_required
def suspend_provider(current_user, provider_id):
    """
    Suspends a provider account. Suspended providers cannot accept/complete jobs,
    modify availability, upload portfolio items, or send messages.
    """
    user = User.query.filter_by(id=provider_id, role='provider').first()
    if not user:
        return jsonify({'success': False, 'message': 'Provider not found.'}), 404

    if getattr(user, 'account_status', 'active') == 'suspended':
        return jsonify({'success': False, 'message': 'Provider is already suspended.'}), 400

    data = request.get_json(silent=True) or {}
    reason = data.get('reason', 'Administrative policy suspension').strip()

    try:
        user.account_status = 'suspended'
        profile = ProviderProfile.query.filter_by(user_id=provider_id).first()
        if profile:
            profile.is_available = False
        db.session.commit()

        log_admin_action(
            admin_id=current_user.id,
            action='suspend_provider',
            target_type='provider',
            target_id=provider_id,
            details={'reason': reason}
        )
        return jsonify({
            'success': True,
            'message': f'Provider #{provider_id} ({user.full_name}) has been suspended.',
            'account_status': 'suspended'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@admin_bp.route('/providers/<int:provider_id>/reactivate', methods=['POST', 'PATCH'])
@admin_bp.route('/providers/<int:provider_id>/reactivate/', methods=['POST', 'PATCH'])
@admin_required
def reactivate_provider(current_user, provider_id):
    """
    Reactivates a suspended provider account.
    """
    user = User.query.filter_by(id=provider_id, role='provider').first()
    if not user:
        return jsonify({'success': False, 'message': 'Provider not found.'}), 404

    if getattr(user, 'account_status', 'active') == 'active':
        return jsonify({'success': False, 'message': 'Provider is already active.'}), 400

    try:
        user.account_status = 'active'
        profile = ProviderProfile.query.filter_by(user_id=provider_id).first()
        # Reactivation only restores user status. If the provider was not verified,
        # they MUST NOT be made available or have verification requirements bypassed.
        if profile and profile.verification_status == 'verified':
            profile.is_available = True
        elif profile:
            profile.is_available = False
        db.session.commit()

        log_admin_action(
            admin_id=current_user.id,
            action='reactivate_provider',
            target_type='provider',
            target_id=provider_id
        )
        return jsonify({
            'success': True,
            'message': f'Provider #{provider_id} ({user.full_name}) has been reactivated.',
            'account_status': 'active'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@admin_bp.route('/providers/<int:provider_id>', methods=['DELETE'])
@admin_bp.route('/providers/<int:provider_id>/', methods=['DELETE'])
@admin_required
def delete_provider_safely(current_user, provider_id):
    """
    Safely deletes/anonymizes a provider account.
    Prevents destructive cascading deletion so booking, review, and financial history remain intact.
    """
    user = User.query.filter_by(id=provider_id, role='provider').first()
    if not user:
        return jsonify({'success': False, 'message': 'Provider not found.'}), 404

    try:
        orig_email = user.email
        user.account_status = 'deleted'
        user.full_name = f'Deleted Provider #{provider_id}'
        user.email = f'deleted_provider_{provider_id}_{int(datetime.utcnow().timestamp())}@trustnear.local'
        user.phone = None
        user.password_hash = 'ACCOUNT_DELETED_ANONYMIZED'

        profile = ProviderProfile.query.filter_by(user_id=provider_id).first()
        if profile:
            profile.is_available = False
            profile.bio = 'Account deleted and anonymized.'

        db.session.commit()
        log_admin_action(
            admin_id=current_user.id,
            action='anonymize_delete_provider',
            target_type='provider',
            target_id=provider_id,
            details={'original_email': orig_email}
        )
        return jsonify({
            'success': True,
            'message': f'Provider #{provider_id} account safely anonymized and removed. Historical records preserved.'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


# ---------------------------------------------------------------------------
# BOOKING MANAGEMENT (Admin only)
# ---------------------------------------------------------------------------

@admin_bp.route('/bookings', methods=['GET'])
@admin_bp.route('/bookings/', methods=['GET'])
@admin_required
def list_admin_bookings(current_user):
    """
    Lists all platform bookings with pagination, search, status filtering,
    date filtering, and special issue filtering (cancelled, disputed, incomplete).
    """
    search_q = request.args.get('q', '').strip() or request.args.get('search', '').strip()
    status_filter = request.args.get('status', 'all').strip().lower()
    date_filter = request.args.get('date', '').strip()
    issue_filter = request.args.get('issue', 'all').strip().lower()

    try:
        page = max(1, int(request.args.get('page', 1)))
        limit = max(1, min(100, int(request.args.get('limit', 20))))
    except ValueError:
        page = 1
        limit = 20

    # Summary metrics across all bookings
    total_bookings = Booking.query.count()
    pending_bookings = Booking.query.filter_by(status='pending').count()
    accepted_bookings = Booking.query.filter_by(status='accepted').count()
    in_progress_bookings = Booking.query.filter_by(status='in_progress').count()
    completed_bookings = Booking.query.filter_by(status='completed').count()
    cancelled_bookings = Booking.query.filter_by(status='cancelled').count()

    # Query builder
    query = Booking.query

    # Status filter
    if status_filter in ['pending', 'accepted', 'in_progress', 'completed', 'cancelled']:
        query = query.filter(Booking.status == status_filter)

    # Date filter (YYYY-MM-DD)
    if date_filter:
        try:
            parsed_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
            query = query.filter(Booking.booking_date == parsed_date)
        except ValueError:
            pass

    # Issue filter: cancelled, disputed (has no_show report), incomplete/overdue
    if issue_filter == 'cancelled':
        query = query.filter(Booking.status == 'cancelled')
    elif issue_filter == 'disputed':
        disputed_ids = db.session.query(ProviderNoShow.booking_id).distinct().subquery()
        query = query.filter(Booking.id.in_(disputed_ids))
    elif issue_filter == 'incomplete':
        today = datetime.utcnow().date()
        query = query.filter(
            Booking.status.in_(['pending', 'accepted', 'in_progress']),
            Booking.booking_date < today
        )

    # Search filter (booking id, customer name/email, provider name/email, service_title, service_category)
    if search_q:
        if search_q.isdigit():
            booking_id_num = int(search_q)
            query = query.filter(Booking.id == booking_id_num)
        else:
            search_pat = f"%{search_q}%"
            cust_u = aliased(User)
            prov_u = aliased(User)
            query = query.join(cust_u, Booking.customer_id == cust_u.id)\
                         .join(prov_u, Booking.provider_id == prov_u.id)\
                         .filter(
                             or_(
                                 Booking.service_title.ilike(search_pat),
                                 Booking.service_category.ilike(search_pat),
                                 cust_u.full_name.ilike(search_pat),
                                 cust_u.email.ilike(search_pat),
                                 prov_u.full_name.ilike(search_pat),
                                 prov_u.email.ilike(search_pat)
                             )
                         )

    total_count = query.count()
    total_pages = max(1, (total_count + limit - 1) // limit)
    bookings_page = query.order_by(Booking.booking_date.desc(), Booking.booking_time.desc())\
                         .offset((page - 1) * limit).limit(limit).all()

    page_booking_ids = [b.id for b in bookings_page]
    no_show_bookings = set(
        r[0] for r in db.session.query(ProviderNoShow.booking_id)
        .filter(ProviderNoShow.booking_id.in_(page_booking_ids)).all()
    ) if page_booking_ids else set()

    bookings_data = []
    for b in bookings_page:
        cust = User.query.get(b.customer_id)
        prov = User.query.get(b.provider_id)
        b_dict = b.to_dict()
        b_dict['customer_name'] = cust.full_name if cust else 'Customer'
        b_dict['customer_email'] = cust.email if cust else ''
        b_dict['customer_phone'] = cust.phone if cust else ''
        b_dict['provider_name'] = prov.full_name if prov else 'Provider'
        b_dict['provider_email'] = prov.email if prov else ''
        b_dict['provider_phone'] = prov.phone if prov else ''
        b_dict['has_no_show'] = b.id in no_show_bookings
        bookings_data.append(b_dict)

    return jsonify({
        'success': True,
        'stats': {
            'total_bookings': total_bookings,
            'pending_bookings': pending_bookings,
            'accepted_bookings': accepted_bookings,
            'in_progress_bookings': in_progress_bookings,
            'completed_bookings': completed_bookings,
            'cancelled_bookings': cancelled_bookings
        },
        'bookings': bookings_data,
        'total_count': total_count,
        'page': page,
        'limit': limit,
        'total_pages': total_pages
    }), 200


@admin_bp.route('/bookings/<int:booking_id>', methods=['GET'])
@admin_bp.route('/bookings/<int:booking_id>/', methods=['GET'])
@admin_required
def get_admin_booking_detail(current_user, booking_id):
    """
    Returns full details of a specific booking for administrative inspection.
    Includes booking data, customer, provider, review (if any), no-show reports,
    and admin audit log entries.
    """
    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({'success': False, 'message': 'Booking not found.'}), 404

    cust = User.query.get(booking.customer_id)
    prov = User.query.get(booking.provider_id)
    prov_profile = ProviderProfile.query.filter_by(user_id=booking.provider_id).first()

    review = Review.query.filter_by(booking_id=booking.id).first()
    no_shows = ProviderNoShow.query.filter_by(booking_id=booking.id).all()
    audit_logs = AdminAuditLog.query.filter_by(target_type='booking', target_id=booking.id)\
        .order_by(AdminAuditLog.created_at.desc()).all()

    return jsonify({
        'success': True,
        'booking': booking.to_dict(),
        'customer': {
            'id': cust.id if cust else None,
            'full_name': cust.full_name if cust else 'Unknown',
            'email': cust.email if cust else '',
            'phone': cust.phone if cust else '',
            'account_status': getattr(cust, 'account_status', 'active') if cust else 'active'
        },
        'provider': {
            'id': prov.id if prov else None,
            'full_name': prov.full_name if prov else 'Unknown',
            'email': prov.email if prov else '',
            'phone': prov.phone if prov else '',
            'trade_category': prov_profile.service_category if prov_profile else None,
            'verification_status': prov_profile.verification_status if prov_profile else None
        },
        'review': review.to_dict() if review else None,
        'no_show_reports': [ns.to_dict() for ns in no_shows],
        'audit_history': [al.to_dict() for al in audit_logs]
    }), 200


@admin_bp.route('/bookings/<int:booking_id>/status', methods=['PATCH'])
@admin_bp.route('/bookings/<int:booking_id>/status/', methods=['PATCH'])
@admin_required
def admin_correct_booking_status(current_user, booking_id):
    """
    Safely corrects the status of a booking with mandatory administrative reason.
    Records the correction in AdminAuditLog.
    Does NOT delete booking history.
    """
    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({'success': False, 'message': 'Booking not found.'}), 404

    data = request.get_json(silent=True) or {}
    new_status = data.get('status', '').strip().lower()
    reason = data.get('reason', '').strip()

    valid_statuses = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled']
    if new_status not in valid_statuses:
        return jsonify({
            'success': False,
            'message': f"Invalid status '{new_status}'. Must be one of: {', '.join(valid_statuses)}."
        }), 400

    if not reason:
        return jsonify({
            'success': False,
            'message': 'A justification reason is required for administrative status corrections.'
        }), 400

    if booking.status == new_status:
        return jsonify({
            'success': False,
            'message': f'Booking is already in status "{new_status}".'
        }), 400

    old_status = booking.status

    try:
        booking.status = new_status
        if new_status == 'cancelled':
            booking.cancellation_reason = f"[Admin Correction] {reason}"
            booking.cancelled_by = current_user.id
        elif old_status == 'cancelled':
            booking.cancellation_reason = None
            booking.cancelled_by = None

        db.session.commit()

        if old_status in ['completed', 'cancelled'] or new_status in ['completed', 'cancelled']:
            recalculate_provider_trust(booking.provider_id)

        log_admin_action(
            admin_id=current_user.id,
            action='admin_correct_booking_status',
            target_type='booking',
            target_id=booking.id,
            details={
                'previous_status': old_status,
                'new_status': new_status,
                'reason': reason
            }
        )

        return jsonify({
            'success': True,
            'message': f'Booking status successfully changed from {old_status} to {new_status}.',
            'booking': booking.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


# ---------------------------------------------------------------------------
# REVIEW MANAGEMENT & MODERATION (Admin only)
# ---------------------------------------------------------------------------

@admin_bp.route('/reviews', methods=['GET'])
@admin_bp.route('/reviews/', methods=['GET'])
@admin_required
def list_admin_reviews(current_user):
    """
    Returns reviews with pagination, status filtering (all, flagged, approved, removed),
    and search. Also returns review count statistics.
    """
    status_filter = request.args.get('status', 'all').strip().lower()
    search_q = request.args.get('q', '').strip() or request.args.get('search', '').strip()

    try:
        page = max(1, int(request.args.get('page', 1)))
        limit = max(1, min(100, int(request.args.get('limit', 20))))
    except ValueError:
        page = 1
        limit = 20

    total_reviews = Review.query.count()
    flagged_reviews_count = Review.query.filter_by(is_suspicious=True, is_approved_by_admin=False, is_deleted=False).count()
    approved_reviews_count = Review.query.filter_by(is_approved_by_admin=True, is_deleted=False).count()
    removed_reviews_count = Review.query.filter_by(is_deleted=True).count()

    query = Review.query

    if status_filter == 'flagged':
        query = query.filter(Review.is_suspicious == True, Review.is_approved_by_admin == False, Review.is_deleted == False)
    elif status_filter == 'approved':
        query = query.filter(Review.is_approved_by_admin == True, Review.is_deleted == False)
    elif status_filter == 'removed':
        query = query.filter(Review.is_deleted == True)

    if search_q:
        search_pat = f"%{search_q}%"
        cust_alias = aliased(User)
        prov_alias = aliased(User)
        query = query.join(cust_alias, Review.customer_id == cust_alias.id)\
                     .join(prov_alias, Review.provider_id == prov_alias.id)\
                     .filter(
                         or_(
                             Review.review_text.ilike(search_pat),
                             Review.flag_reason.ilike(search_pat),
                             cust_alias.full_name.ilike(search_pat),
                             cust_alias.email.ilike(search_pat),
                             prov_alias.full_name.ilike(search_pat),
                             prov_alias.email.ilike(search_pat)
                         )
                     )

    total_count = query.count()
    total_pages = max(1, (total_count + limit - 1) // limit)
    reviews_page = query.order_by(Review.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    reviews_data = []
    for r in reviews_page:
        customer = User.query.get(r.customer_id)
        provider = User.query.get(r.provider_id)
        booking = Booking.query.get(r.booking_id)

        flag_reasons = [fr.strip() for fr in r.flag_reason.split(' | ')] if r.flag_reason else []
        sim_score = None
        if r.flag_reason:
            m = re.search(r'([\d\.]+)%\s+TF-IDF\s+similarity', r.flag_reason)
            if m:
                try:
                    sim_score = round(float(m.group(1)) / 100.0, 4)
                except ValueError:
                    pass

        reviews_data.append({
            'id': r.id,
            'booking_id': r.booking_id,
            'service_title': booking.service_title if booking else 'Service',
            'customer_id': r.customer_id,
            'customer_name': customer.full_name if customer else 'Customer',
            'customer_email': customer.email if customer else '',
            'provider_id': r.provider_id,
            'provider_name': provider.full_name if provider else 'Provider',
            'provider_email': provider.email if provider else '',
            'rating': r.rating,
            'review_text': r.review_text,
            'sentiment_score': float(r.sentiment_score) if r.sentiment_score is not None else 0.0,
            'is_suspicious': r.is_suspicious,
            'flag_reason': r.flag_reason,
            'flag_reasons': flag_reasons,
            'similarity_score': sim_score,
            'is_approved_by_admin': r.is_approved_by_admin,
            'is_deleted': r.is_deleted,
            'moderation_reason': r.moderation_reason,
            'created_at': r.created_at.isoformat() if r.created_at else None
        })

    return jsonify({
        'success': True,
        'stats': {
            'total_reviews': total_reviews,
            'flagged_reviews_count': flagged_reviews_count,
            'approved_reviews_count': approved_reviews_count,
            'removed_reviews_count': removed_reviews_count
        },
        'reviews': reviews_data,
        'total_count': total_count,
        'page': page,
        'limit': limit,
        'total_pages': total_pages
    }), 200


@admin_bp.route('/reviews/flagged', methods=['GET'])
@admin_bp.route('/reviews/flagged/', methods=['GET'])
@admin_required
def list_flagged_reviews(current_user):
    """
    Backwards-compatible endpoint for reviews flagged by NLP for admin moderation.
    """
    reviews = Review.query.filter_by(is_approved_by_admin=False, is_deleted=False)\
        .order_by(Review.created_at.desc()).all()

    flagged_list = []
    for r in reviews:
        customer = User.query.get(r.customer_id)
        provider = User.query.get(r.provider_id)
        booking = Booking.query.get(r.booking_id)

        flag_reasons = [fr.strip() for fr in r.flag_reason.split(' | ')] if r.flag_reason else []
        sim_score = None
        if r.flag_reason:
            m = re.search(r'([\d\.]+)%\s+TF-IDF\s+similarity', r.flag_reason)
            if m:
                try:
                    sim_score = round(float(m.group(1)) / 100.0, 4)
                except ValueError:
                    pass

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
            'flag_reasons': flag_reasons,
            'similarity_score': sim_score,
            'is_approved_by_admin': r.is_approved_by_admin,
            'is_deleted': r.is_deleted,
            'moderation_reason': r.moderation_reason,
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
    Allows admin to 'approve', 'remove', or 'restore' a review.
    Preserves review records in the database instead of permanently deleting them.
    Requires a reason for removal and records each action in AdminAuditLog.
    """
    data = request.get_json(silent=True) or {}
    action = data.get('action', '').strip().lower()
    reason = data.get('reason', '').strip() or data.get('moderation_reason', '').strip()

    valid_actions = ['approve', 'remove', 'restore', 'delete']
    if action not in valid_actions:
        return jsonify({
            'success': False,
            'message': "Action must be one of: approve, remove, restore."
        }), 400

    review = Review.query.get(review_id)
    if not review:
        return jsonify({'success': False, 'message': 'Review not found.'}), 404

    provider_id = review.provider_id

    # 'delete' is accepted as an alias for 'remove' but soft-removes the record safely
    if action in ['remove', 'delete']:
        if not reason:
            return jsonify({
                'success': False,
                'message': 'A reason is required to remove a review.'
            }), 400

        review.is_deleted = True
        review.is_approved_by_admin = False
        review.moderation_reason = reason
        audit_action = 'remove_review'
        msg = 'Review removed and archived with reason.'

    elif action == 'restore':
        review.is_deleted = False
        review.is_approved_by_admin = True
        review.is_suspicious = False
        review.moderation_reason = reason or 'Restored by administrator.'
        audit_action = 'restore_review'
        msg = 'Review successfully restored.'

    elif action == 'approve':
        review.is_deleted = False
        review.is_approved_by_admin = True
        review.is_suspicious = False
        review.moderation_reason = reason or 'Approved by administrator.'
        audit_action = 'approve_review'
        msg = 'Review approved and published.'

    try:
        db.session.commit()
        recalculate_provider_trust(provider_id)

        log_admin_action(
            admin_id=current_user.id,
            action=audit_action,
            target_type='review',
            target_id=review.id,
            details={
                'provider_id': provider_id,
                'booking_id': review.booking_id,
                'action': action,
                'reason': review.moderation_reason
            }
        )

        return jsonify({
            'success': True,
            'message': msg,
            'review': review.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


# ---------------------------------------------------------------------------
# NO-SHOW MANAGEMENT (Admin only)
# ---------------------------------------------------------------------------

@admin_bp.route('/no-shows', methods=['GET'])
@admin_bp.route('/no-shows/', methods=['GET'])
@admin_required
def list_no_shows(current_user):
    """
    Returns no-show reports with optional status filtering, search, and pagination.
    Includes rich customer, provider, and booking metadata.
    """
    status_filter = request.args.get('status', 'all').strip().lower()
    search_q = request.args.get('q', '').strip() or request.args.get('search', '').strip()

    try:
        page = max(1, int(request.args.get('page', 1)))
        limit = max(1, min(100, int(request.args.get('limit', 20))))
    except ValueError:
        page = 1
        limit = 20

    total_no_shows = ProviderNoShow.query.count()
    pending_no_shows = ProviderNoShow.query.filter_by(status='reported').count()
    confirmed_no_shows = ProviderNoShow.query.filter_by(status='confirmed').count()
    dismissed_no_shows = ProviderNoShow.query.filter_by(status='dismissed').count()

    query = ProviderNoShow.query

    if status_filter in ['reported', 'confirmed', 'dismissed']:
        query = query.filter(ProviderNoShow.status == status_filter)

    if search_q:
        search_pat = f"%{search_q}%"
        prov_alias = aliased(User)
        cust_alias = aliased(User)
        query = query.join(prov_alias, ProviderNoShow.provider_id == prov_alias.id)\
                     .join(cust_alias, ProviderNoShow.customer_id == cust_alias.id)\
                     .filter(
                         or_(
                             ProviderNoShow.reason.ilike(search_pat),
                             prov_alias.full_name.ilike(search_pat),
                             prov_alias.email.ilike(search_pat),
                             cust_alias.full_name.ilike(search_pat),
                             cust_alias.email.ilike(search_pat)
                         )
                     )

    total_count = query.count()
    total_pages = max(1, (total_count + limit - 1) // limit)
    reports_page = query.order_by(ProviderNoShow.reported_at.desc()).offset((page - 1) * limit).limit(limit).all()

    no_shows_data = []
    for r in reports_page:
        booking = Booking.query.get(r.booking_id)
        customer = User.query.get(r.customer_id)
        provider = User.query.get(r.provider_id)

        item = r.to_dict()
        item['customer_name'] = customer.full_name if customer else 'Customer'
        item['customer_email'] = customer.email if customer else ''
        item['customer_phone'] = customer.phone if customer else ''
        item['provider_name'] = provider.full_name if provider else 'Provider'
        item['provider_email'] = provider.email if provider else ''
        item['provider_phone'] = provider.phone if provider else ''
        item['service_title'] = booking.service_title if booking else 'Service'
        item['booking_date'] = booking.booking_date.isoformat() if (booking and booking.booking_date) else None
        item['booking_time'] = booking.booking_time.strftime('%H:%M') if (booking and booking.booking_time) else None
        no_shows_data.append(item)

    return jsonify({
        'success': True,
        'stats': {
            'total_no_shows': total_no_shows,
            'pending_no_shows': pending_no_shows,
            'confirmed_no_shows': confirmed_no_shows,
            'dismissed_no_shows': dismissed_no_shows
        },
        'no_shows': no_shows_data,
        'total_count': total_count,
        'page': page,
        'limit': limit,
        'total_pages': total_pages
    }), 200


@admin_bp.route('/no-shows/<int:report_id>/confirm', methods=['PATCH'])
@admin_bp.route('/no-shows/<int:report_id>/confirm/', methods=['PATCH'])
@admin_required
def confirm_no_show(current_user, report_id):
    """
    Admin confirms a provider no-show. The status transitions from
    'reported' → 'confirmed'.
    Prevents duplicate confirmation or dismissal.
    Updates provider reliability calculations without altering ML Trust Score.
    Records decision in AdminAuditLog.
    """
    report = ProviderNoShow.query.get(report_id)
    if not report:
        return jsonify({'success': False, 'message': 'No-show report not found.'}), 404

    if report.status != 'reported':
        return jsonify({
            'success': False,
            'message': f'Report is already {report.status}. Duplicate actions are prohibited.'
        }), 409

    try:
        report.status = 'confirmed'
        db.session.commit()

        log_admin_action(
            admin_id=current_user.id,
            action='confirm_no_show',
            target_type='no_show',
            target_id=report.id,
            details={
                'provider_id': report.provider_id,
                'booking_id': report.booking_id
            }
        )

        return jsonify({
            'success': True,
            'message': 'No-show report confirmed. Provider reliability metric updated.',
            'report': report.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@admin_bp.route('/no-shows/<int:report_id>/dismiss', methods=['PATCH'])
@admin_bp.route('/no-shows/<int:report_id>/dismiss/', methods=['PATCH'])
@admin_required
def dismiss_no_show(current_user, report_id):
    """
    Admin dismisses a no-show report. Status transitions from 'reported' → 'dismissed'.
    Requires an administrative dismissal reason.
    Prevents duplicate confirmation or dismissal.
    Records decision in AdminAuditLog.
    """
    report = ProviderNoShow.query.get(report_id)
    if not report:
        return jsonify({'success': False, 'message': 'No-show report not found.'}), 404

    if report.status != 'reported':
        return jsonify({
            'success': False,
            'message': f'Report is already {report.status}. Duplicate actions are prohibited.'
        }), 409

    data = request.get_json(silent=True) or {}
    reason = data.get('reason', '').strip()

    if not reason:
        return jsonify({
            'success': False,
            'message': 'A justification reason is required to dismiss a no-show report.'
        }), 400

    try:
        report.status = 'dismissed'
        db.session.commit()

        log_admin_action(
            admin_id=current_user.id,
            action='dismiss_no_show',
            target_type='no_show',
            target_id=report.id,
            details={
                'provider_id': report.provider_id,
                'booking_id': report.booking_id,
                'reason': reason
            }
        )

        return jsonify({
            'success': True,
            'message': 'No-show report dismissed. No penalty applied to provider.',
            'report': report.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


# ---------------------------------------------------------------------------
# CUSTOMER MANAGEMENT (Admin only)
# ---------------------------------------------------------------------------

@admin_bp.route('/customers', methods=['GET'])
@admin_bp.route('/customers/', methods=['GET'])
@admin_required
def list_customers(current_user):
    """
    Lists customers with optional search, account_status filter, and pagination.
    Also returns overview stats: total, active, suspended, and recent.
    """
    search_q = request.args.get('q', '').strip()
    status_filter = request.args.get('status', 'all').strip().lower()
    
    try:
        page = max(1, int(request.args.get('page', 1)))
        limit = max(1, min(100, int(request.args.get('limit', 20))))
    except ValueError:
        page = 1
        limit = 20

    base_cust_query = User.query.filter_by(role='customer')

    # High-level stats
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    total_customers = base_cust_query.filter(User.account_status != 'deleted').count()
    active_customers = base_cust_query.filter_by(account_status='active').count()
    suspended_customers = base_cust_query.filter_by(account_status='suspended').count()
    recent_customers = base_cust_query.filter(User.created_at >= thirty_days_ago, User.account_status != 'deleted').count()

    # Apply status filter
    query = base_cust_query
    if status_filter in ['active', 'suspended', 'deleted']:
        query = query.filter(User.account_status == status_filter)
    elif status_filter == 'all':
        query = query.filter(User.account_status != 'deleted')

    # Apply search filter (name, email, phone)
    if search_q:
        search_pattern = f"%{search_q}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.phone.ilike(search_pattern)
            )
        )

    total_count = query.count()
    total_pages = max(1, (total_count + limit - 1) // limit)
    customers_page = query.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    customer_results = []
    for c in customers_page:
        total_b = Booking.query.filter_by(customer_id=c.id).count()
        completed_b = Booking.query.filter_by(customer_id=c.id, status='completed').count()
        cancelled_b = Booking.query.filter_by(customer_id=c.id, status='cancelled').count()
        
        customer_results.append({
            'id': c.id,
            'full_name': c.full_name,
            'email': c.email,
            'phone': c.phone,
            'account_status': getattr(c, 'account_status', 'active') or 'active',
            'created_at': c.created_at.isoformat() if c.created_at else None,
            'total_bookings': total_b,
            'completed_bookings': completed_b,
            'cancelled_bookings': cancelled_b
        })

    return jsonify({
        'success': True,
        'stats': {
            'total_customers': total_customers,
            'active_customers': active_customers,
            'suspended_customers': suspended_customers,
            'recent_customers': recent_customers
        },
        'customers': customer_results,
        'total_count': total_count,
        'page': page,
        'limit': limit,
        'total_pages': total_pages
    }), 200


@admin_bp.route('/customers/<int:customer_id>', methods=['GET'])
@admin_bp.route('/customers/<int:customer_id>/', methods=['GET'])
@admin_required
def get_customer_details(current_user, customer_id):
    """
    Returns full customer details and historical booking records.
    Never exposes passwords, hashes or tokens.
    """
    customer = User.query.filter_by(id=customer_id, role='customer').first()
    if not customer:
        return jsonify({'success': False, 'message': 'Customer not found.'}), 404

    bookings = Booking.query.filter_by(customer_id=customer_id).order_by(Booking.created_at.desc()).all()

    total_spent = sum(float(b.agreed_price) for b in bookings if b.status == 'completed' and b.agreed_price)
    completed_b = sum(1 for b in bookings if b.status == 'completed')
    cancelled_b = sum(1 for b in bookings if b.status == 'cancelled')

    bookings_data = []
    for b in bookings:
        provider_user = User.query.get(b.provider_id)
        bookings_data.append({
            'id': b.id,
            'service_title': b.service_title,
            'service_category': b.service_category,
            'booking_date': b.booking_date.isoformat() if b.booking_date else None,
            'booking_time': b.booking_time.strftime('%H:%M') if b.booking_time else None,
            'end_time': b.end_time.strftime('%H:%M') if b.end_time else None,
            'customer_address': b.customer_address,
            'agreed_price': float(b.agreed_price) if b.agreed_price else None,
            'status': b.status,
            'cancellation_reason': b.cancellation_reason,
            'cancelled_by': b.cancelled_by,
            'provider_id': b.provider_id,
            'provider_name': provider_user.full_name if provider_user else 'Provider',
            'created_at': b.created_at.isoformat() if b.created_at else None
        })

    return jsonify({
        'success': True,
        'customer': {
            'id': customer.id,
            'full_name': customer.full_name,
            'email': customer.email,
            'phone': customer.phone,
            'account_status': getattr(customer, 'account_status', 'active') or 'active',
            'created_at': customer.created_at.isoformat() if customer.created_at else None,
            'updated_at': customer.updated_at.isoformat() if customer.updated_at else None
        },
        'booking_metrics': {
            'total_bookings': len(bookings),
            'completed_bookings': completed_b,
            'cancelled_bookings': cancelled_b,
            'total_spent': total_spent
        },
        'bookings': bookings_data
    }), 200


@admin_bp.route('/customers/<int:customer_id>', methods=['PATCH'])
@admin_bp.route('/customers/<int:customer_id>/', methods=['PATCH'])
@admin_required
def update_customer_profile(current_user, customer_id):
    """
    Edits permitted customer profile fields (full_name, phone).
    Strictly forbids modifying system fields such as role, password_hash, or email here.
    """
    customer = User.query.filter_by(id=customer_id, role='customer').first()
    if not customer:
        return jsonify({'success': False, 'message': 'Customer not found.'}), 404

    data = request.get_json(silent=True) or {}
    changes = {}

    if 'full_name' in data:
        name = data['full_name'].strip()
        if len(name) < 2:
            return jsonify({'success': False, 'message': 'Full name must be at least 2 characters.'}), 400
        customer.full_name = name
        changes['full_name'] = name

    if 'phone' in data:
        raw_phone = data['phone']
        if raw_phone:
            clean_phone = re.sub(r'[\s\-\+]', '', raw_phone)
            if len(clean_phone) < 10:
                return jsonify({'success': False, 'message': 'Phone number must be at least 10 digits.'}), 400
            customer.phone = raw_phone.strip()
            changes['phone'] = customer.phone
        else:
            customer.phone = None
            changes['phone'] = None

    if not changes:
        return jsonify({'success': False, 'message': 'No editable fields provided.'}), 400

    try:
        db.session.commit()
        log_admin_action(
            admin_id=current_user.id,
            action='edit_customer_profile',
            target_type='customer',
            target_id=customer_id,
            details=changes
        )
        return jsonify({
            'success': True,
            'message': f'Customer #{customer_id} updated successfully.',
            'customer': customer.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@admin_bp.route('/customers/<int:customer_id>/suspend', methods=['POST', 'PATCH'])
@admin_bp.route('/customers/<int:customer_id>/suspend/', methods=['POST', 'PATCH'])
@admin_required
def suspend_customer(current_user, customer_id):
    """
    Suspends a customer account. Suspended customers cannot make new bookings.
    """
    customer = User.query.filter_by(id=customer_id, role='customer').first()
    if not customer:
        return jsonify({'success': False, 'message': 'Customer not found.'}), 404

    if getattr(customer, 'account_status', 'active') == 'suspended':
        return jsonify({'success': False, 'message': 'Customer is already suspended.'}), 400

    data = request.get_json(silent=True) or {}
    reason = data.get('reason', 'Administrative policy suspension').strip()

    try:
        customer.account_status = 'suspended'
        db.session.commit()
        log_admin_action(
            admin_id=current_user.id,
            action='suspend_customer',
            target_type='customer',
            target_id=customer_id,
            details={'reason': reason}
        )
        return jsonify({
            'success': True,
            'message': f'Customer #{customer_id} ({customer.full_name}) has been suspended.',
            'account_status': 'suspended'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@admin_bp.route('/customers/<int:customer_id>/reactivate', methods=['POST', 'PATCH'])
@admin_bp.route('/customers/<int:customer_id>/reactivate/', methods=['POST', 'PATCH'])
@admin_required
def reactivate_customer(current_user, customer_id):
    """
    Reactivates a suspended customer account.
    """
    customer = User.query.filter_by(id=customer_id, role='customer').first()
    if not customer:
        return jsonify({'success': False, 'message': 'Customer not found.'}), 404

    if getattr(customer, 'account_status', 'active') == 'active':
        return jsonify({'success': False, 'message': 'Customer is already active.'}), 400

    try:
        customer.account_status = 'active'
        db.session.commit()
        log_admin_action(
            admin_id=current_user.id,
            action='reactivate_customer',
            target_type='customer',
            target_id=customer_id
        )
        return jsonify({
            'success': True,
            'message': f'Customer #{customer_id} ({customer.full_name}) has been reactivated.',
            'account_status': 'active'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@admin_bp.route('/customers/<int:customer_id>', methods=['DELETE'])
@admin_bp.route('/customers/<int:customer_id>/', methods=['DELETE'])
@admin_required
def delete_customer_safely(current_user, customer_id):
    """
    Safely deletes/anonymizes a customer account.
    Prevents destructive cascading deletion so booking and financial history remain intact.
    """
    customer = User.query.filter_by(id=customer_id, role='customer').first()
    if not customer:
        return jsonify({'success': False, 'message': 'Customer not found.'}), 404

    try:
        orig_email = customer.email
        customer.account_status = 'deleted'
        customer.full_name = f'Deleted Customer #{customer_id}'
        customer.email = f'deleted_customer_{customer_id}_{int(datetime.utcnow().timestamp())}@trustnear.local'
        customer.phone = None
        customer.password_hash = 'ACCOUNT_DELETED_ANONYMIZED'
        
        db.session.commit()
        log_admin_action(
            admin_id=current_user.id,
            action='anonymize_delete_customer',
            target_type='customer',
            target_id=customer_id,
            details={'original_email': orig_email}
        )
        return jsonify({
            'success': True,
            'message': f'Customer #{customer_id} account safely anonymized and removed. Historical records preserved.'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@admin_bp.route('/audit-logs', methods=['GET'])
@admin_bp.route('/audit-logs/', methods=['GET'])
@admin_required
def get_audit_logs(current_user):
    """
    Returns administrative actions from the audit log with pagination,
    filtering by action, target_type, and search.
    """
    action_filter = request.args.get('action', '').strip()
    target_type_filter = request.args.get('target_type', '').strip()
    search_q = request.args.get('q', '').strip() or request.args.get('search', '').strip()

    try:
        page = max(1, int(request.args.get('page', 1)))
        limit = max(1, min(100, int(request.args.get('limit', 20))))
    except ValueError:
        page = 1
        limit = 20

    query = AdminAuditLog.query

    if action_filter and action_filter != 'all':
        query = query.filter(AdminAuditLog.action == action_filter)

    if target_type_filter and target_type_filter != 'all':
        query = query.filter(AdminAuditLog.target_type == target_type_filter)

    if search_q:
        search_pat = f"%{search_q}%"
        admin_alias = aliased(User)
        query = query.outerjoin(admin_alias, AdminAuditLog.admin_id == admin_alias.id)\
                     .filter(
                         or_(
                             AdminAuditLog.action.ilike(search_pat),
                             AdminAuditLog.target_type.ilike(search_pat),
                             admin_alias.full_name.ilike(search_pat),
                             admin_alias.email.ilike(search_pat)
                         )
                     )

    total_count = query.count()
    total_pages = max(1, (total_count + limit - 1) // limit)
    logs = query.order_by(AdminAuditLog.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    log_data = []
    for l in logs:
        admin_user = User.query.get(l.admin_id) if l.admin_id else None
        log_data.append({
            'id': l.id,
            'admin_id': l.admin_id,
            'admin_name': admin_user.full_name if admin_user else 'System Admin',
            'action': l.action,
            'target_type': l.target_type,
            'target_id': l.target_id,
            'details': l.details,
            'created_at': l.created_at.isoformat() if l.created_at else None
        })

    return jsonify({
        'success': True,
        'count': len(log_data),
        'total_count': total_count,
        'page': page,
        'limit': limit,
        'total_pages': total_pages,
        'audit_logs': log_data
    }), 200

# ==============================================================================
# ADMIN PAYMENT MANAGEMENT ENDPOINTS
# ==============================================================================

@admin_bp.route('/payments', methods=['GET'])
@admin_required
def admin_list_payments(current_user):
    """
    GET /api/admin/payments
    Paginated list of all payment records with summary stats.
    Query params: page, limit, search (booking_id), status
    """
    from sqlalchemy import func

    page  = int(request.args.get('page', 1))
    limit = min(int(request.args.get('limit', 20)), 100)
    search = request.args.get('search', '').strip()
    status_filter = request.args.get('status', '').strip()

    query = db.session.query(Payment).join(Booking, Payment.booking_id == Booking.id)

    if search:
        try:
            bid = int(search)
            query = query.filter(Payment.booking_id == bid)
        except ValueError:
            # search by customer/provider name via sub-queries
            customer_ids = db.session.query(User.id).filter(
                User.full_name.ilike(f'%{search}%')
            ).subquery()
            provider_ids = db.session.query(User.id).filter(
                User.full_name.ilike(f'%{search}%')
            ).subquery()
            query = query.filter(
                or_(
                    Booking.customer_id.in_(customer_ids),
                    Booking.provider_id.in_(provider_ids),
                )
            )

    if status_filter:
        query = query.filter(Payment.payment_status == status_filter)

    # Aggregate stats (across all records, ignoring pagination)
    stats_q = db.session.query(
        func.count(Payment.id).label('total_records'),
        func.coalesce(func.sum(Payment.amount_paid), 0).label('total_collected'),
        func.coalesce(
            func.sum(
                db.case(
                    (Payment.payment_status == 'partially_paid', Payment.balance_amount),
                    else_=0
                )
            ), 0
        ).label('pending_balances'),
        func.sum(
            db.case(
                (Payment.payment_status == 'fully_paid', 1),
                else_=0
            )
        ).label('fully_paid_count'),
        func.sum(
            db.case(
                (Payment.payment_status == 'refunded', 1),
                else_=0
            )
        ).label('refunded_count'),
    ).one()

    total_count = query.count()
    total_pages = max(1, (total_count + limit - 1) // limit)
    payments = query.order_by(Payment.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    result = []
    for p in payments:
        b = p.booking
        customer = User.query.get(b.customer_id) if b else None
        provider = User.query.get(b.provider_id) if b else None
        row = p.to_dict()
        row['booking_status'] = b.status if b else None
        row['service_title']  = b.service_title if b else None
        row['customer_name']  = customer.full_name if customer else None
        row['provider_name']  = provider.full_name if provider else None
        result.append(row)

    return jsonify({
        'success': True,
        'payments': result,
        'page': page,
        'limit': limit,
        'total_count': total_count,
        'total_pages': total_pages,
        'stats': {
            'total_records':    int(stats_q.total_records   or 0),
            'total_collected':  float(stats_q.total_collected or 0),
            'pending_balances': float(stats_q.pending_balances or 0),
            'fully_paid_count': int(stats_q.fully_paid_count or 0),
            'refunded_count':   int(stats_q.refunded_count  or 0),
        }
    }), 200


@admin_bp.route('/payments/<int:payment_id>/refund', methods=['PATCH'])
@admin_required
def admin_refund_payment(current_user, payment_id):
    """
    PATCH /api/admin/payments/<id>/refund
    Mark a payment as refunded (admin only).
    Allowed only when payment_status is 'partially_paid' (advance paid, booking cancelled)
    or 'fully_paid'. Prevents duplicate refund.
    Body: {"reason": "...", "refund_status": "processed" (optional)}
    """
    payment = Payment.query.get(payment_id)
    if not payment:
        return jsonify({'success': False, 'message': 'Payment record not found.'}), 404

    if payment.payment_status == 'unpaid':
        return jsonify({'success': False, 'message': 'No payment has been made; nothing to refund.'}), 400

    if payment.payment_status == 'refunded':
        return jsonify({'success': False, 'message': 'This payment has already been refunded.'}), 409

    data = request.get_json(silent=True) or {}
    reason = (data.get('reason') or '').strip()
    if not reason:
        return jsonify({'success': False, 'message': 'A refund reason is required.'}), 400

    new_refund_status = data.get('refund_status', 'processed')

    payment.payment_status = 'refunded'
    payment.refund_reason   = reason
    payment.refund_status   = new_refund_status
    db.session.commit()

    log_admin_action(
        admin_id=current_user.id,
        action='payment_refund',
        target_type='payment',
        target_id=payment.id,
        details=f"Admin refund for booking #{payment.booking_id}. Reason: {reason}"
    )

    return jsonify({
        'success': True,
        'message': 'Refund recorded successfully.',
        'payment': payment.to_dict()
    }), 200
