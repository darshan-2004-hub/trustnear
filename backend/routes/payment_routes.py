"""
TrustNear – Demo Payment Routes
================================
Simulated payment flow (no real gateway). Amounts are always calculated
server-side from booking.agreed_price. Frontend supplies only
{"simulate": "success" | "failure"} — never monetary amounts.

Endpoints
---------
Customer / Provider
  GET  /api/payments/booking/<id>          – get payment record for a booking

Customer only
  POST /api/payments/booking/<id>/advance  – simulate 20% advance payment
  POST /api/payments/booking/<id>/balance  – simulate 80% balance payment

Admin only (via admin_routes blueprint)
  GET  /api/admin/payments                 – paginated list + stats
  PATCH /api/admin/payments/<id>/refund    – mark refund processed
"""

import uuid
from flask import Blueprint, jsonify, request
from models.schema_models import db, Booking, Payment, User
from routes.auth_routes import token_required

payment_bp = Blueprint('payment_bp', __name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _gen_txn() -> str:
    """Generate a unique transaction reference."""
    return f"TXN-{uuid.uuid4().hex[:16].upper()}"


def _get_or_create_payment(booking: Booking) -> Payment:
    """
    Lazily create or synchronize a Payment row for a booking.
    Amounts are always derived from booking.agreed_price.
    Guarantees:
      - advance_amount + balance_amount == total_amount (no penny-rounding drift)
      - If agreed_price changes before payment, amounts resynchronize
      - If agreed_price changes after advance (partially_paid), balance adjusts accordingly
    """
    payment = Payment.query.filter_by(booking_id=booking.id).first()
    total = float(booking.agreed_price or 0)
    advance = round(total * 0.20, 2)
    balance = round(total - advance, 2)

    if payment is None:
        payment = Payment(
            booking_id=booking.id,
            total_amount=total,
            advance_amount=advance,
            balance_amount=balance,
            amount_paid=0.00,
            payment_status='unpaid',
        )
        db.session.add(payment)
        db.session.commit()
    else:
        # Check if agreed_price was updated and synchronize
        needs_commit = False
        if payment.payment_status == 'unpaid':
            if float(payment.total_amount or 0) != total:
                payment.total_amount = total
                payment.advance_amount = advance
                payment.balance_amount = balance
                needs_commit = True
        elif payment.payment_status == 'partially_paid':
            if float(payment.total_amount or 0) != total:
                payment.total_amount = total
                payment.balance_amount = max(0.0, round(total - float(payment.amount_paid or 0), 2))
                needs_commit = True
        if needs_commit:
            db.session.commit()

    return payment


def _booking_accessible(booking: Booking, current_user: User) -> bool:
    """Customer or provider of the booking, or admin, may view payment."""
    if current_user.role == 'admin':
        return True
    if current_user.role == 'customer' and booking.customer_id == current_user.id:
        return True
    if current_user.role == 'provider' and booking.provider_id == current_user.id:
        return True
    return False


# ---------------------------------------------------------------------------
# GET /api/payments/booking/<booking_id>
# ---------------------------------------------------------------------------

@payment_bp.route('/booking/<int:booking_id>', methods=['GET'])
@token_required
def get_payment(current_user, booking_id):
    """Return the payment record for a booking (customer, provider, or admin)."""
    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({'success': False, 'message': 'Booking not found.'}), 404

    if not _booking_accessible(booking, current_user):
        return jsonify({'success': False, 'message': 'Access denied.'}), 403

    # Only create a payment record if the booking has an agreed price
    if not booking.agreed_price:
        return jsonify({'success': False, 'message': 'No agreed price on this booking.'}), 400

    payment = _get_or_create_payment(booking)
    return jsonify({'success': True, 'payment': payment.to_dict()}), 200


# ---------------------------------------------------------------------------
# POST /api/payments/booking/<booking_id>/advance
# ---------------------------------------------------------------------------

@payment_bp.route('/booking/<int:booking_id>/advance', methods=['POST'])
@token_required
def pay_advance(current_user, booking_id):
    """
    Simulate the 20% advance payment.
    Rules:
      - Customer only (must own the booking).
      - Suspended or deleted customers are blocked.
      - Booking must be in 'accepted' status.
      - Advance must not already be paid.
      - Body: {"simulate": "success" | "failure"}
    """
    if current_user.role != 'customer':
        return jsonify({'success': False, 'message': 'Only customers can make payments.'}), 403

    if getattr(current_user, 'account_status', 'active') == 'suspended':
        return jsonify({'success': False, 'message': 'Your account is suspended. You cannot make payments.'}), 403
    if getattr(current_user, 'account_status', 'active') == 'deleted':
        return jsonify({'success': False, 'message': 'Account is inactive.'}), 403

    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({'success': False, 'message': 'Booking not found.'}), 404

    if booking.customer_id != current_user.id:
        return jsonify({'success': False, 'message': 'Access denied – not your booking.'}), 403

    # Provider status verification
    provider = User.query.get(booking.provider_id)
    if provider and getattr(provider, 'account_status', 'active') == 'suspended':
        return jsonify({'success': False, 'message': 'Service provider is currently suspended. Payment cannot be processed.'}), 400
    if provider and getattr(provider, 'account_status', 'active') == 'deleted':
        return jsonify({'success': False, 'message': 'Service provider is no longer active.'}), 400

    if booking.status != 'accepted':
        return jsonify({
            'success': False,
            'message': 'Advance payment is only allowed after the provider accepts the booking.'
        }), 400

    if not booking.agreed_price:
        return jsonify({'success': False, 'message': 'Booking has no agreed price.'}), 400

    payment = _get_or_create_payment(booking)

    if payment.advance_transaction_id:
        return jsonify({
            'success': False,
            'message': 'Advance payment has already been completed.',
            'payment': payment.to_dict()
        }), 409

    data = request.get_json(silent=True) or {}
    simulate = data.get('simulate', 'success')

    if simulate == 'failure':
        return jsonify({
            'success': False,
            'payment_success': False,
            'message': '[DEMO] Payment simulation failed. Please try again.',
            'payment': payment.to_dict()
        }), 200  # HTTP 200 – the API itself succeeded; the payment flow failed

    # --- Simulate success ---
    txn_id = _gen_txn()
    payment.advance_transaction_id = txn_id
    payment.amount_paid = float(payment.advance_amount)
    payment.payment_status = 'partially_paid'
    db.session.commit()

    return jsonify({
        'success': True,
        'payment_success': True,
        'message': f'[DEMO] Advance payment of ₹{payment.advance_amount:.2f} recorded successfully.',
        'transaction_id': txn_id,
        'payment': payment.to_dict()
    }), 200


# ---------------------------------------------------------------------------
# POST /api/payments/booking/<booking_id>/balance
# ---------------------------------------------------------------------------

@payment_bp.route('/booking/<int:booking_id>/balance', methods=['POST'])
@token_required
def pay_balance(current_user, booking_id):
    """
    Simulate the 80% balance payment.
    Rules:
      - Customer only (must own the booking).
      - Suspended or deleted customers are blocked.
      - Booking must be 'completed'.
      - Advance must already be paid.
      - Balance must not already be paid.
      - Body: {"simulate": "success" | "failure"}
    """
    if current_user.role != 'customer':
        return jsonify({'success': False, 'message': 'Only customers can make payments.'}), 403

    if getattr(current_user, 'account_status', 'active') == 'suspended':
        return jsonify({'success': False, 'message': 'Your account is suspended. You cannot make payments.'}), 403
    if getattr(current_user, 'account_status', 'active') == 'deleted':
        return jsonify({'success': False, 'message': 'Account is inactive.'}), 403

    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({'success': False, 'message': 'Booking not found.'}), 404

    if booking.customer_id != current_user.id:
        return jsonify({'success': False, 'message': 'Access denied – not your booking.'}), 403

    # Provider status verification
    provider = User.query.get(booking.provider_id)
    if provider and getattr(provider, 'account_status', 'active') == 'deleted':
        return jsonify({'success': False, 'message': 'Service provider is no longer active.'}), 400

    if booking.status != 'completed':
        return jsonify({
            'success': False,
            'message': 'Balance payment is only allowed after the service is completed.'
        }), 400

    if not booking.agreed_price:
        return jsonify({'success': False, 'message': 'Booking has no agreed price.'}), 400

    payment = _get_or_create_payment(booking)

    if not payment.advance_transaction_id:
        return jsonify({
            'success': False,
            'message': 'Please complete the 20% advance payment first.'
        }), 400

    if payment.balance_transaction_id:
        return jsonify({
            'success': False,
            'message': 'Balance payment has already been completed.',
            'payment': payment.to_dict()
        }), 409

    data = request.get_json(silent=True) or {}
    simulate = data.get('simulate', 'success')

    if simulate == 'failure':
        return jsonify({
            'success': False,
            'payment_success': False,
            'message': '[DEMO] Payment simulation failed. Please try again.',
            'payment': payment.to_dict()
        }), 200

    # --- Simulate success ---
    txn_id = _gen_txn()
    payment.balance_transaction_id = txn_id
    payment.amount_paid = float(payment.total_amount)
    payment.payment_status = 'fully_paid'
    db.session.commit()

    return jsonify({
        'success': True,
        'payment_success': True,
        'message': f'[DEMO] Balance payment of ₹{payment.balance_amount:.2f} recorded. Fully paid!',
        'transaction_id': txn_id,
        'payment': payment.to_dict()
    }), 200
