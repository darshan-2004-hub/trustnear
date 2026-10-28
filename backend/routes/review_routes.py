from flask import Blueprint, request, jsonify
from models.schema_models import db, User, Booking, Review
from routes.auth_routes import token_required
from ml.nlp_engine import nlp_engine
from ml.recalculator import recalculate_provider_trust

review_bp = Blueprint('review_bp', __name__)

@review_bp.route('', methods=['POST'])
@token_required
def submit_review(current_user):
    """
    Submits a review for a completed booking. Restricted to the customer of that booking.
    """
    if current_user.role != 'customer':
        return jsonify({'success': False, 'message': 'Only customers can submit reviews.'}), 403

    data = request.get_json() or {}
    booking_id = data.get('booking_id')
    rating = data.get('rating')
    review_text = data.get('review_text', '').strip()

    if not booking_id or not rating or not review_text:
        return jsonify({'success': False, 'message': 'booking_id, rating (1-5), and review_text are required.'}), 400

    try:
        rating = int(rating)
        if rating < 1 or rating > 5:
            return jsonify({'success': False, 'message': 'Rating must be an integer between 1 and 5.'}), 400
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid rating format.'}), 400

    # 1. Booking Integrity Check
    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({'success': False, 'message': 'Booking does not exist.'}), 404

    if booking.customer_id != current_user.id:
        return jsonify({'success': False, 'message': 'You can only review bookings you requested.'}), 403

    if booking.status != 'completed':
        return jsonify({
            'success': False,
            'message': f"Reviews are locked until the booking is marked 'completed'. Current status: '{booking.status}'."
        }), 400

    # 2. Prevent Duplicate Reviews for the Same Booking
    existing_for_booking = Review.query.filter_by(booking_id=booking.id).first()
    if existing_for_booking:
        return jsonify({'success': False, 'message': 'You have already submitted a review for this booking.'}), 409

    # 3. Fetch past reviews across the platform to check for duplicate spam patterns
    past_reviews = Review.query.filter(Review.review_text != '').limit(50).all()
    past_reviews_data = [{'review_text': r.review_text} for r in past_reviews]

    # 4. Run NLP Fraud & Sentiment Screening Pipeline
    screening_result = nlp_engine.screen_review(
        review_text=review_text,
        rating=rating,
        existing_reviews=past_reviews_data
    )

    try:
        new_review = Review(
            booking_id=booking.id,
            customer_id=current_user.id,
            provider_id=booking.provider_id,
            rating=rating,
            review_text=review_text,
            sentiment_score=screening_result['sentiment_score'],
            is_suspicious=screening_result['is_suspicious'],
            flag_reason=screening_result['flag_reason'],
            # If suspicious, hold for admin moderation; if genuine, auto-approve
            is_approved_by_admin=not screening_result['is_suspicious']
        )
        db.session.add(new_review)
        db.session.commit()

        # 5. Dynamically Recalculate Provider's Trust Score
        updated_trust = recalculate_provider_trust(booking.provider_id)

        return jsonify({
            'success': True,
            'message': 'Review submitted successfully.' if not screening_result['is_suspicious'] else 'Review flagged for admin moderation due to suspicious patterns.',
            'review': {
                'id': new_review.id,
                'rating': new_review.rating,
                'sentiment_score': float(new_review.sentiment_score),
                'is_suspicious': new_review.is_suspicious,
                'flag_reason': new_review.flag_reason,
                'is_approved_by_admin': new_review.is_approved_by_admin
            },
            'updated_trust_metrics': updated_trust
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@review_bp.route('/provider/<int:provider_id>', methods=['GET'])
def get_provider_reviews(provider_id):
    """
    Returns all approved reviews for a provider, along with an extractive AI summary.
    """
    reviews = Review.query.filter_by(
        provider_id=provider_id,
        is_approved_by_admin=True
    ).order_by(Review.created_at.desc()).all()

    reviews_list = []
    text_corpus = []

    for r in reviews:
        customer = User.query.get(r.customer_id)
        reviews_list.append({
            'id': r.id,
            'customer_name': customer.full_name if customer else 'Verified Customer',
            'rating': r.rating,
            'review_text': r.review_text,
            'sentiment_score': float(r.sentiment_score) if r.sentiment_score else None,
            'created_at': r.created_at.isoformat()
        })
        text_corpus.append(r.review_text)

    # Generate Extractive TF-IDF Review Summary
    summary = nlp_engine.summarize_reviews(text_corpus)

    return jsonify({
        'success': True,
        'count': len(reviews_list),
        'summary': summary,
        'reviews': reviews_list
    }), 200