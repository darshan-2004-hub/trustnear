from datetime import datetime
from flask import Blueprint, request, jsonify
from models.schema_models import db, User, Booking, ProviderProfile, Message
from routes.auth_routes import token_required

booking_bp = Blueprint('booking_bp', __name__)

VALID_STATUS_TRANSITIONS = {
    'pending': ['accepted', 'cancelled'],
    'accepted': ['in_progress', 'cancelled'],
    'in_progress': ['completed', 'cancelled'],
    'completed': [],
    'cancelled': []
}

@booking_bp.route('', methods=['POST'])
@token_required
def create_booking(current_user):
    if current_user.role != 'customer':
        return jsonify({'success': False, 'message': 'Only registered customers can book service providers.'}), 403

    data = request.get_json() or {}
    provider_id = data.get('provider_id')
    service_title = data.get('service_title', '').strip()
    service_category = data.get('service_category', '').strip()
    booking_date_str = data.get('booking_date', '').strip()
    booking_time_str = data.get('booking_time', '').strip()
    customer_address = data.get('customer_address', '').strip()
    agreed_price = data.get('agreed_price')
    lat = data.get('customer_latitude')
    lon = data.get('customer_longitude')

    if not provider_id or not service_title or not service_category or not booking_date_str or not booking_time_str or not customer_address:
        return jsonify({'success': False, 'message': 'Missing required booking fields.'}), 400

    provider = User.query.filter_by(id=provider_id, role='provider').first()
    if not provider:
        return jsonify({'success': False, 'message': 'Selected provider does not exist.'}), 404

    try:
        b_date = datetime.strptime(booking_date_str, '%Y-%m-%d').date()
        b_time = datetime.strptime(booking_time_str, '%H:%M').time()
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date format (use YYYY-MM-DD) or time format (use HH:MM).'}), 400

    try:
        new_booking = Booking(
            customer_id=current_user.id,
            provider_id=provider.id,
            service_title=service_title,
            service_category=service_category,
            booking_date=b_date,
            booking_time=b_time,
            customer_address=customer_address,
            customer_latitude=lat,
            customer_longitude=lon,
            agreed_price=float(agreed_price) if agreed_price else None,
            status='pending'
        )
        db.session.add(new_booking)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Booking request submitted successfully.',
            'booking_id': new_booking.id,
            'status': new_booking.status
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@booking_bp.route('', methods=['GET'])
@token_required
def get_user_bookings(current_user):
    status_filter = request.args.get('status')

    if current_user.role == 'customer':
        query = db.session.query(Booking, User)\
            .join(User, Booking.provider_id == User.id)\
            .filter(Booking.customer_id == current_user.id)
    else:  # provider
        query = db.session.query(Booking, User)\
            .join(User, Booking.customer_id == User.id)\
            .filter(Booking.provider_id == current_user.id)

    if status_filter:
        query = query.filter(Booking.status == status_filter)

    results = query.order_by(Booking.created_at.desc()).all()

    bookings_data = []
    for booking, counterpart in results:
        # Calculate unread messages intended for this specific logged-in user
        unread_count = Message.query.filter_by(
            booking_id=booking.id,
            receiver_id=current_user.id,
            is_read=False
        ).count()

        bookings_data.append({
            'id': booking.id,
            'service_title': booking.service_title,
            'service_category': booking.service_category,
            'booking_date': booking.booking_date.isoformat(),
            'booking_time': booking.booking_time.strftime('%H:%M'),
            'customer_address': booking.customer_address,
            'agreed_price': float(booking.agreed_price) if booking.agreed_price else None,
            'status': booking.status,
            'cancellation_reason': booking.cancellation_reason,
            'unread_count': unread_count,
            'created_at': booking.created_at.isoformat(),
            'counterpart': {
                'id': counterpart.id,
                'full_name': counterpart.full_name,
                'email': counterpart.email,
                'phone': counterpart.phone,
                'role': counterpart.role
            }
        })

    return jsonify({
        'success': True,
        'count': len(bookings_data),
        'bookings': bookings_data
    }), 200


@booking_bp.route('/<int:booking_id>/status', methods=['PATCH'])
@token_required
def update_booking_status(current_user, booking_id):
    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({'success': False, 'message': 'Booking not found.'}), 404

    if current_user.id not in [booking.customer_id, booking.provider_id]:
        return jsonify({'success': False, 'message': 'You are not authorized to update this booking.'}), 403

    data = request.get_json() or {}
    new_status = data.get('status', '').strip().lower()
    cancellation_reason = data.get('cancellation_reason', '').strip()

    if new_status not in VALID_STATUS_TRANSITIONS.get(booking.status, []):
        return jsonify({
            'success': False,
            'message': f"Cannot transition booking from '{booking.status}' to '{new_status}'."
        }), 400

    if new_status in ['accepted', 'in_progress', 'completed'] and current_user.id != booking.provider_id:
        return jsonify({'success': False, 'message': 'Only the service provider can accept, start, or complete this job.'}), 403

    try:
        booking.status = new_status
        if new_status == 'cancelled':
            booking.cancellation_reason = cancellation_reason or f"Cancelled by {current_user.role}"

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f"Booking status updated to '{new_status}'.",
            'status': booking.status
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@booking_bp.route('/<int:booking_id>/messages', methods=['GET'])
@token_required
def get_booking_messages(current_user, booking_id):
    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({'success': False, 'message': 'Booking not found.'}), 404

    if current_user.id not in [booking.customer_id, booking.provider_id]:
        return jsonify({'success': False, 'message': 'Not authorized to view messages for this booking.'}), 403

    messages = Message.query.filter_by(booking_id=booking_id).order_by(Message.sent_at.asc()).all()

    messages_data = [{
        'id': m.id,
        'sender_id': m.sender_id,
        'receiver_id': m.receiver_id,
        'content': m.content,
        'is_read': m.is_read,
        'sent_at': m.sent_at.isoformat()
    } for m in messages]

    return jsonify({
        'success': True,
        'count': len(messages_data),
        'messages': messages_data
    }), 200


@booking_bp.route('/<int:booking_id>/messages/read', methods=['PATCH'])
@token_required
def mark_messages_as_read(current_user, booking_id):
    """
    Marks all unread messages received by the current user in this booking as READ.
    """
    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({'success': False, 'message': 'Booking not found.'}), 404

    try:
        Message.query.filter_by(
            booking_id=booking_id,
            receiver_id=current_user.id,
            is_read=False
        ).update({'is_read': True})

        db.session.commit()
        return jsonify({'success': True, 'message': 'Messages marked as read.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500