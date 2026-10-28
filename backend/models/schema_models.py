from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('customer', 'provider', 'admin'), nullable=False, default='customer')
    phone = db.Column(db.String(25), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    provider_profile = db.relationship('ProviderProfile', backref='user', uselist=False, cascade="all, delete-orphan")
    trust_metric = db.relationship('TrustMetric', backref='user', uselist=False, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role,
            "phone": self.phone,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class ProviderProfile(db.Model):
    __tablename__ = 'provider_profiles'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    service_category = db.Column(db.String(80), nullable=False)
    experience_years = db.Column(db.Integer, nullable=False, default=0)
    hourly_rate = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    bio = db.Column(db.Text, nullable=True)
    service_address = db.Column(db.String(255), nullable=True)
    latitude = db.Column(db.Numeric(10, 8), nullable=True)
    longitude = db.Column(db.Numeric(11, 8), nullable=True)
    is_available = db.Column(db.Boolean, nullable=False, default=True)
    verification_status = db.Column(db.Enum('pending', 'verified', 'rejected'), nullable=False, default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "service_category": self.service_category,
            "experience_years": self.experience_years,
            "hourly_rate": float(self.hourly_rate) if self.hourly_rate else 0.0,
            "bio": self.bio,
            "service_address": self.service_address,
            "latitude": float(self.latitude) if self.latitude else None,
            "longitude": float(self.longitude) if self.longitude else None,
            "is_available": self.is_available,
            "verification_status": self.verification_status
        }


class TrustMetric(db.Model):
    __tablename__ = 'trust_metrics'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    provider_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    trust_score = db.Column(db.Numeric(5, 2), nullable=False, default=50.00)
    completed_jobs = db.Column(db.Integer, nullable=False, default=0)
    cancellation_rate = db.Column(db.Numeric(5, 2), nullable=False, default=0.00)
    avg_response_minutes = db.Column(db.Integer, nullable=False, default=0)
    review_sentiment_avg = db.Column(db.Numeric(5, 4), nullable=False, default=0.0000)
    shap_factors = db.Column(db.JSON, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "provider_id": self.provider_id,
            "trust_score": float(self.trust_score) if self.trust_score else 50.0,
            "completed_jobs": self.completed_jobs,
            "cancellation_rate": float(self.cancellation_rate) if self.cancellation_rate else 0.0,
            "avg_response_minutes": self.avg_response_minutes,
            "review_sentiment_avg": float(self.review_sentiment_avg) if self.review_sentiment_avg else 0.0,
            "shap_factors": self.shap_factors,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class Booking(db.Model):
    __tablename__ = 'bookings'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    service_title = db.Column(db.String(150), nullable=False)
    service_category = db.Column(db.String(80), nullable=False)
    booking_date = db.Column(db.Date, nullable=False)
    booking_time = db.Column(db.Time, nullable=False)
    customer_address = db.Column(db.String(255), nullable=False)
    customer_latitude = db.Column(db.Numeric(10, 8), nullable=True)
    customer_longitude = db.Column(db.Numeric(11, 8), nullable=True)
    agreed_price = db.Column(db.Numeric(10, 2), nullable=True)
    status = db.Column(db.Enum('pending', 'accepted', 'in_progress', 'completed', 'cancelled'), nullable=False, default='pending')
    cancellation_reason = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Review(db.Model):
    __tablename__ = 'reviews'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id', ondelete='CASCADE'), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    review_text = db.Column(db.Text, nullable=False)
    sentiment_score = db.Column(db.Numeric(5, 4), nullable=True)
    is_suspicious = db.Column(db.Boolean, nullable=False, default=False)
    flag_reason = db.Column(db.String(255), nullable=True)
    is_approved_by_admin = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id', ondelete='SET NULL'), nullable=True)
    content = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)