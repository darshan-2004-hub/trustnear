import re
import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from models.schema_models import db, User, ProviderProfile, TrustMetric

auth_bp = Blueprint('auth_bp', __name__)

EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

def generate_jwt(user_id, role):
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=current_app.config['JWT_EXPIRATION_HOURS'])
    }
    return jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'success': False, 'message': 'Authorization header is missing.'}), 401

        parts = auth_header.split(' ')
        if len(parts) != 2 or parts[0] != 'Bearer':
            return jsonify({'success': False, 'message': 'Invalid token format. Format must be Bearer <token>'}), 401

        token = parts[1]
        try:
            data = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'success': False, 'message': 'User associated with token no longer exists.'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token has expired. Please log in again.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token.'}), 401

        return f(current_user, *args, **kwargs)
    return decorated


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}

    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', 'customer').strip().lower()
    phone = data.get('phone', '').strip() if data.get('phone') else None

    # 1. Required fields & role check
    if not full_name or not email or not password:
        return jsonify({'success': False, 'message': 'full_name, email, and password are required fields.'}), 400

    if role not in ['customer', 'provider', 'admin']:
        return jsonify({'success': False, 'message': 'Invalid role. Choose from: customer, provider, admin.'}), 400

    # 2. Email format validation
    if not EMAIL_REGEX.match(email):
        return jsonify({'success': False, 'message': 'Invalid email address format.'}), 400

    # 3. Password length validation
    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters long.'}), 400

    # 4. Check for existing email in database
    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'An account with this email already exists.'}), 409

    try:
        # Create user
        new_user = User(
            full_name=full_name,
            email=email,
            password_hash=generate_password_hash(password, method='scrypt'),
            role=role,
            phone=phone
        )
        db.session.add(new_user)
        db.session.flush()

        # If role is provider, validate and create profile & initial trust metrics
        if role == 'provider':
            category = data.get('service_category', 'General Maintenance').strip()
            exp_years = int(data.get('experience_years', 0))
            hourly_rate = float(data.get('hourly_rate', 0.00))
            bio = data.get('bio', '').strip()
            address = data.get('service_address', '').strip()
            lat = data.get('latitude', None)
            lon = data.get('longitude', None)

            if hourly_rate < 50:
                db.session.rollback()
                return jsonify({'success': False, 'message': 'Provider hourly rate must be at least ₹50.'}), 400

            if not address:
                db.session.rollback()
                return jsonify({'success': False, 'message': 'Service address is required for providers.'}), 400

            provider_profile = ProviderProfile(
                user_id=new_user.id,
                service_category=category,
                experience_years=exp_years,
                hourly_rate=hourly_rate,
                bio=bio,
                service_address=address,
                latitude=lat,
                longitude=lon,
                verification_status='pending'
            )
            db.session.add(provider_profile)

            initial_trust = TrustMetric(
                provider_id=new_user.id,
                trust_score=50.00,
                completed_jobs=0,
                cancellation_rate=0.00,
                avg_response_minutes=0,
                review_sentiment_avg=0.0000,
                shap_factors={"baseline": 50.0, "status": "new_provider"}
            )
            db.session.add(initial_trust)

        db.session.commit()
        token = generate_jwt(new_user.id, new_user.role)

        return jsonify({
            'success': True,
            'message': f'User registered successfully as {role}.',
            'token': token,
            'user': new_user.to_dict()
        }), 201

    except Exception as err:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(err)}'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'success': False, 'message': 'Email and password are required.'}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'success': False, 'message': 'Invalid email or password.'}), 401

    token = generate_jwt(user.id, user.role)

    user_info = user.to_dict()
    extra_info = {}

    if user.role == 'provider' and user.provider_profile:
        extra_info['provider_profile'] = user.provider_profile.to_dict()
        if user.trust_metric:
            extra_info['trust_metrics'] = user.trust_metric.to_dict()

    return jsonify({
        'success': True,
        'message': 'Login successful.',
        'token': token,
        'user': {**user_info, **extra_info}
    }), 200


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    user_info = current_user.to_dict()
    if current_user.role == 'provider' and current_user.provider_profile:
        user_info['provider_profile'] = current_user.provider_profile.to_dict()
        if current_user.trust_metric:
            user_info['trust_metrics'] = current_user.trust_metric.to_dict()

    return jsonify({
        'success': True,
        'user': user_info
    }), 200