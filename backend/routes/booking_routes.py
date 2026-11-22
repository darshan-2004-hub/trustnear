from datetime import datetime, timezone, timedelta, time
from flask import Blueprint, request, jsonify
from models.schema_models import (
  db, User, Booking, ProviderProfile, Message,
  ProviderAvailability, ProviderNoShow
)
from routes.auth_routes import token_required
from ml.recalculator import recalculate_provider_trust

booking_bp = Blueprint('booking_bp', __name__)

IST = timezone(timedelta(hours=5, minutes=30))

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

  if getattr(current_user, 'account_status', 'active') == 'suspended':
    return jsonify({'success': False, 'message': 'Your account is currently suspended. You cannot create new service bookings.'}), 403
  if getattr(current_user, 'account_status', 'active') == 'deleted':
    return jsonify({'success': False, 'message': 'Account is inactive.'}), 403

  data = request.get_json() or {}
  provider_id = data.get('provider_id')
  service_title = data.get('service_title', '').strip()
  service_category = data.get('service_category', '').strip()
  booking_date_str = data.get('booking_date', '').strip()
  booking_time_str = data.get('booking_time', '').strip()
  end_time_str = data.get('end_time', '').strip()
  customer_address = data.get('customer_address', '').strip()
  agreed_price = data.get('agreed_price')
  lat = data.get('customer_latitude')
  lon = data.get('customer_longitude')

  if not provider_id or not service_title or not service_category or not booking_date_str or not booking_time_str or not customer_address:
    return jsonify({'success': False, 'message': 'Missing required booking fields.'}), 400

  provider = User.query.filter_by(id=provider_id, role='provider').first()
  if not provider:
    return jsonify({'success': False, 'message': 'Selected provider does not exist.'}), 404

  if getattr(provider, 'account_status', 'active') == 'suspended':
    return jsonify({'success': False, 'message': 'This service provider is currently suspended and cannot accept new bookings.'}), 400
  if getattr(provider, 'account_status', 'active') == 'deleted':
    return jsonify({'success': False, 'message': 'Selected provider is inactive.'}), 400

  profile = ProviderProfile.query.filter_by(user_id=provider.id).first()
  if not profile:
    return jsonify({'success': False, 'message': 'Provider profile does not exist.'}), 404

  if profile.verification_status != 'verified':
    return jsonify({
      'success': False,
      'message': f'Cannot book this provider. Provider verification status is currently "{profile.verification_status}".'
    }), 400

  if not profile.is_available:
    return jsonify({
      'success': False,
      'message': 'This provider is currently marked as unavailable for new bookings.'
    }), 400

  try:
    b_date = datetime.strptime(booking_date_str, '%Y-%m-%d').date()
    b_time = datetime.strptime(booking_time_str, '%H:%M').time()
  except ValueError:
    return jsonify({'success': False, 'message': 'Invalid date format (use YYYY-MM-DD) or time format (use HH:MM).'}), 400

  # Check provider availability settings
  avail = ProviderAvailability.query.filter_by(provider_id=provider.id).first()
  slot_duration = avail.slot_duration_minutes if avail else 60

  if end_time_str:
    try:
      b_end_time = datetime.strptime(end_time_str, '%H:%M').time()
    except ValueError:
      b_end_time = (datetime.combine(b_date, b_time) + timedelta(minutes=slot_duration)).time()
  else:
    b_end_time = (datetime.combine(b_date, b_time) + timedelta(minutes=slot_duration)).time()

  # Validation: No booking in the past
  now_ist = datetime.now(IST)
  today_ist = now_ist.date()
  slot_start_dt = datetime.combine(b_date, b_time)
  if b_date < today_ist or (b_date == today_ist and b_time <= now_ist.time()):
    return jsonify({'success': False, 'message': 'Cannot book an appointment slot in the past.'}), 400

  # Availability rules validation
  if avail:
    if not avail.is_accepting_bookings:
      return jsonify({'success': False, 'message': 'This provider is currently not accepting new bookings.'}), 400

    day_name = b_date.strftime('%A')
    if avail.working_days and day_name not in avail.working_days:
      return jsonify({'success': False, 'message': f'Provider does not operate on {day_name}s.'}), 400

    if avail.unavailable_dates and booking_date_str in avail.unavailable_dates:
      return jsonify({'success': False, 'message': 'Provider has marked this date as unavailable.'}), 400

    if b_time < avail.daily_start_time or b_end_time > avail.daily_end_time:
      return jsonify({'success': False, 'message': 'Requested appointment slot is outside provider operating hours.'}), 400

  try:
    # Atomic Slot Reservation:
    # 1. Lock the provider's user record (which ALWAYS exists) using SELECT FOR UPDATE.
    # This serializes concurrent booking requests for this provider at the DB engine level,
    # preventing race conditions when zero bookings currently exist for this date.
    try:
      _ = User.query.filter_by(id=provider.id).with_for_update().first()
    except Exception:
      # In-memory SQLite during local mock tests may ignore with_for_update safely
      pass

    # 2. Query any existing bookings for this provider on this date using with_for_update()
    # In MySQL REPEATABLE READ, a locking read breaks through consistent read snapshots
    # to guarantee visibility of recently committed bookings across concurrent requests.
    overlapping_bookings = Booking.query.filter(
      Booking.provider_id == provider.id,
      Booking.booking_date == b_date,
      Booking.status.in_(['pending', 'accepted', 'in_progress'])
    ).with_for_update().all()

    for ob in overlapping_bookings:
      ob_start = ob.booking_time
      ob_end = ob.end_time if ob.end_time else (datetime.combine(b_date, ob.booking_time) + timedelta(minutes=slot_duration)).time()

      # Overlap: (b_time < ob_end) and (b_end_time > ob_start)
      if (b_time < ob_end) and (b_end_time > ob_start):
        db.session.rollback()
        return jsonify({
          'success': False,
          'message': 'This appointment slot was just reserved by another customer or is no longer available. Please select another slot.'
        }), 409

    new_booking = Booking(
      customer_id=current_user.id,
      provider_id=provider.id,
      service_title=service_title,
      service_category=service_category,
      booking_date=b_date,
      booking_time=b_time,
      end_time=b_end_time,
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
      'status': new_booking.status,
      'booking_date': new_booking.booking_date.isoformat(),
      'booking_time': new_booking.booking_time.strftime('%H:%M'),
      'end_time': new_booking.end_time.strftime('%H:%M') if new_booking.end_time else None
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
  now_ist_dt = datetime.now(IST).replace(tzinfo=None)

  bookings_data = []
  for booking, counterpart in results:
    # Calculate unread messages intended for this specific logged-in user
    unread_count = Message.query.filter_by(
      booking_id=booking.id,
      receiver_id=current_user.id,
      is_read=False
    ).count()

    # Direct contact details are shared only for confirmed / active / completed bookings
    contact_permitted = booking.status in ['accepted', 'in_progress', 'completed']

    # Check if appointment is overdue for no-show reporting
    apt_datetime = datetime.combine(booking.booking_date, booking.booking_time)
    is_overdue = apt_datetime < now_ist_dt
    no_show = ProviderNoShow.query.filter_by(booking_id=booking.id).first()
    can_report_no_show = (
      current_user.role == 'customer' and
      booking.status in ['accepted', 'in_progress', 'pending'] and
      is_overdue and
      no_show is None
    )

    bookings_data.append({
      'id': booking.id,
      'service_title': booking.service_title,
      'service_category': booking.service_category,
      'booking_date': booking.booking_date.isoformat(),
      'booking_time': booking.booking_time.strftime('%H:%M'),
      'end_time': booking.end_time.strftime('%H:%M') if booking.end_time else None,
      'customer_address': booking.customer_address,
      'agreed_price': float(booking.agreed_price) if booking.agreed_price else None,
      'status': booking.status,
      'cancellation_reason': booking.cancellation_reason,
      'cancelled_by': booking.cancelled_by,
      'can_report_no_show': can_report_no_show,
      'no_show_status': no_show.status if no_show else None,
      'unread_count': unread_count,
      'created_at': booking.created_at.isoformat(),
      'counterpart': {
        'id': counterpart.id,
        'full_name': counterpart.full_name,
        'email': counterpart.email if contact_permitted else None,
        'phone': counterpart.phone if contact_permitted else None,
        'role': counterpart.role,
        'contact_permitted': contact_permitted
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

  # Suspended/deleted users may not modify bookings
  if current_user.role == 'customer':
    if getattr(current_user, 'account_status', 'active') == 'suspended':
      return jsonify({'success': False, 'message': 'Your account is suspended. You cannot modify bookings.'}), 403
    if getattr(current_user, 'account_status', 'active') == 'deleted':
      return jsonify({'success': False, 'message': 'Account is inactive.'}), 403
  elif current_user.role == 'provider':
    if getattr(current_user, 'account_status', 'active') == 'suspended':
      return jsonify({'success': False, 'message': 'Your provider account is suspended. You cannot accept or modify bookings.'}), 403
    if getattr(current_user, 'account_status', 'active') == 'deleted':
      return jsonify({'success': False, 'message': 'Account is inactive.'}), 403

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
      booking.cancelled_by = current_user.id
      booking.cancellation_reason = cancellation_reason or f"Cancelled by {current_user.role}"

    db.session.commit()

    # Dynamically recalculate provider trust metrics upon job completion or cancellation
    if new_status in ['completed', 'cancelled']:
      try:
        recalculate_provider_trust(booking.provider_id)
      except Exception as recalc_err:
        print(f"[TrustRecalculator] Post-booking update notice: {recalc_err}")

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


@booking_bp.route('/<int:booking_id>/report-no-show', methods=['POST'])
@token_required
def report_booking_no_show(current_user, booking_id):
  """
  Allows a customer to report a no-show if a scheduled booking was not fulfilled
  and the scheduled appointment time has passed.
  """
  if current_user.role != 'customer':
    return jsonify({'success': False, 'message': 'Forbidden: Only customers can report provider no-shows.'}), 403

  if getattr(current_user, 'account_status', 'active') == 'suspended':
    return jsonify({'success': False, 'message': 'Your account is suspended. You cannot submit no-show reports.'}), 403
  if getattr(current_user, 'account_status', 'active') == 'deleted':
    return jsonify({'success': False, 'message': 'Account is inactive.'}), 403

  booking = Booking.query.get(booking_id)
  if not booking:
    return jsonify({'success': False, 'message': 'Booking not found.'}), 404

  if booking.customer_id != current_user.id:
    return jsonify({'success': False, 'message': 'Forbidden: You are not the customer for this booking.'}), 403

  if booking.status == 'completed':
    return jsonify({'success': False, 'message': 'Cannot report a no-show for a completed booking.'}), 400

  now_ist_dt = datetime.now(IST).replace(tzinfo=None)
  apt_datetime = datetime.combine(booking.booking_date, booking.booking_time)
  if apt_datetime >= now_ist_dt:
    return jsonify({'success': False, 'message': 'Cannot report a no-show before the scheduled appointment time.'}), 400

  existing_report = ProviderNoShow.query.filter_by(booking_id=booking.id).first()
  if existing_report:
    return jsonify({'success': False, 'message': 'A no-show report has already been submitted for this booking.'}), 400

  data = request.get_json() or {}
  reason = data.get('reason', '').strip() or 'Provider did not arrive for scheduled appointment.'

  try:
    report = ProviderNoShow(
      booking_id=booking.id,
      customer_id=current_user.id,
      provider_id=booking.provider_id,
      reason=reason,
      status='reported'
    )
    db.session.add(report)
    db.session.commit()

    return jsonify({
      'success': True,
      'message': 'No-show report submitted successfully for administrative review.',
      'report': report.to_dict()
    }), 201
  except Exception as e:
    db.session.rollback()
    return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500

