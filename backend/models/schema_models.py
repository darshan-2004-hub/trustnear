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
    account_status = db.Column(db.Enum('active', 'suspended', 'deleted'), nullable=False, default='active')
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
            "account_status": self.account_status or "active",
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
    end_time = db.Column(db.Time, nullable=True)
    customer_address = db.Column(db.String(255), nullable=False)
    customer_latitude = db.Column(db.Numeric(10, 8), nullable=True)
    customer_longitude = db.Column(db.Numeric(11, 8), nullable=True)
    agreed_price = db.Column(db.Numeric(10, 2), nullable=True)
    status = db.Column(db.Enum('pending', 'accepted', 'in_progress', 'completed', 'cancelled'), nullable=False, default='pending')
    cancellation_reason = db.Column(db.String(255), nullable=True)
    cancelled_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "provider_id": self.provider_id,
            "service_title": self.service_title,
            "service_category": self.service_category,
            "booking_date": self.booking_date.isoformat() if self.booking_date else None,
            "booking_time": self.booking_time.strftime('%H:%M') if self.booking_time else None,
            "end_time": self.end_time.strftime('%H:%M') if self.end_time else None,
            "customer_address": self.customer_address,
            "customer_latitude": float(self.customer_latitude) if self.customer_latitude else None,
            "customer_longitude": float(self.customer_longitude) if self.customer_longitude else None,
            "agreed_price": float(self.agreed_price) if self.agreed_price else None,
            "status": self.status,
            "cancellation_reason": self.cancellation_reason,
            "cancelled_by": self.cancelled_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class ProviderPortfolio(db.Model):
    __tablename__ = 'provider_portfolios'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    provider_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    service_category = db.Column(db.String(80), nullable=False)
    description = db.Column(db.Text, nullable=False)
    before_image_url = db.Column(db.String(255), nullable=True)
    after_image_url = db.Column(db.String(255), nullable=True)
    completion_date = db.Column(db.Date, nullable=False)
    authorized_for_display = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    provider = db.relationship('User', backref=db.backref('portfolio_entries', lazy=True, cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            "id": self.id,
            "provider_id": self.provider_id,
            "title": self.title,
            "service_category": self.service_category,
            "description": self.description,
            "before_image_url": self.before_image_url,
            "after_image_url": self.after_image_url,
            "completion_date": self.completion_date.isoformat() if self.completion_date else None,
            "authorized_for_display": self.authorized_for_display,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class ProviderAvailability(db.Model):
    __tablename__ = 'provider_availabilities'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    provider_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    working_days = db.Column(db.JSON, nullable=False)
    daily_start_time = db.Column(db.Time, nullable=False, default=datetime.strptime('09:00:00', '%H:%M:%S').time())
    daily_end_time = db.Column(db.Time, nullable=False, default=datetime.strptime('18:00:00', '%H:%M:%S').time())
    slot_duration_minutes = db.Column(db.Integer, nullable=False, default=60)
    unavailable_dates = db.Column(db.JSON, nullable=True)
    is_accepting_bookings = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    provider = db.relationship('User', backref=db.backref('availability', uselist=False, cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            "id": self.id,
            "provider_id": self.provider_id,
            "working_days": self.working_days,
            "daily_start_time": self.daily_start_time.strftime('%H:%M') if self.daily_start_time else '09:00',
            "daily_end_time": self.daily_end_time.strftime('%H:%M') if self.daily_end_time else '18:00',
            "slot_duration_minutes": self.slot_duration_minutes,
            "unavailable_dates": self.unavailable_dates or [],
            "is_accepting_bookings": self.is_accepting_bookings,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class ProviderNoShow(db.Model):
    __tablename__ = 'provider_no_shows'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id', ondelete='CASCADE'), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.Enum('reported', 'confirmed', 'dismissed'), nullable=False, default='reported')
    admin_notes = db.Column(db.Text, nullable=True)
    reported_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    booking = db.relationship('Booking', backref=db.backref('no_show_report', uselist=False, cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            "id": self.id,
            "booking_id": self.booking_id,
            "customer_id": self.customer_id,
            "provider_id": self.provider_id,
            "reason": self.reason,
            "status": self.status,
            "admin_notes": self.admin_notes,
            "reported_at": self.reported_at.isoformat() if self.reported_at else None,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None
        }



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
    is_deleted = db.Column(db.Boolean, nullable=False, default=False)
    moderation_reason = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "booking_id": self.booking_id,
            "customer_id": self.customer_id,
            "provider_id": self.provider_id,
            "rating": self.rating,
            "review_text": self.review_text,
            "sentiment_score": float(self.sentiment_score) if self.sentiment_score is not None else None,
            "is_suspicious": self.is_suspicious,
            "flag_reason": self.flag_reason,
            "is_approved_by_admin": self.is_approved_by_admin,
            "is_deleted": self.is_deleted,
            "moderation_reason": self.moderation_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id', ondelete='SET NULL'), nullable=True)
    content = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)


class AdminAuditLog(db.Model):
    __tablename__ = 'admin_audit_logs'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    action = db.Column(db.String(80), nullable=False)
    target_type = db.Column(db.String(50), nullable=False)
    target_id = db.Column(db.Integer, nullable=True)
    details = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    admin = db.relationship('User', foreign_keys=[admin_id], backref='audit_logs_performed')

    def to_dict(self):
        return {
            "id": self.id,
            "admin_id": self.admin_id,
            "action": self.action,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "details": self.details,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


def log_admin_action(admin_id, action, target_type, target_id, details=None):
    """
    Records an administrative action in the AdminAuditLog.
    Safe and non-throwing; logs errors without breaking primary workflows.
    """
    try:
        log_entry = AdminAuditLog(
            admin_id=admin_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details
        )
        db.session.add(log_entry)
        db.session.commit()
        return log_entry
    except Exception as e:
        db.session.rollback()
        print(f"[Audit Log Error] Could not record {action} on {target_type} #{target_id}: {e}")
        return None


class Payment(db.Model):
    """
    Single payments record per booking.
    Tracks simulated advance (20%) and balance (80%) payments.
    Amounts are always calculated from booking.agreed_price — never trusted from client.
    """
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id', ondelete='CASCADE'), unique=True, nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    advance_amount = db.Column(db.Numeric(10, 2), nullable=False)   # 20% of total
    balance_amount = db.Column(db.Numeric(10, 2), nullable=False)   # 80% of total
    amount_paid = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    payment_status = db.Column(
        db.Enum('unpaid', 'partially_paid', 'fully_paid', 'refunded'),
        nullable=False, default='unpaid'
    )
    advance_transaction_id = db.Column(db.String(64), nullable=True)
    balance_transaction_id = db.Column(db.String(64), nullable=True)
    refund_reason = db.Column(db.String(255), nullable=True)
    refund_status = db.Column(db.String(50), nullable=True)   # 'pending' | 'processed'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    booking = db.relationship('Booking', backref=db.backref('payment', uselist=False))

    def to_dict(self):
        return {
            "id": self.id,
            "booking_id": self.booking_id,
            "total_amount": float(self.total_amount) if self.total_amount is not None else 0.0,
            "advance_amount": float(self.advance_amount) if self.advance_amount is not None else 0.0,
            "balance_amount": float(self.balance_amount) if self.balance_amount is not None else 0.0,
            "amount_paid": float(self.amount_paid) if self.amount_paid is not None else 0.0,
            "payment_status": self.payment_status,
            "advance_transaction_id": self.advance_transaction_id,
            "balance_transaction_id": self.balance_transaction_id,
            "refund_reason": self.refund_reason,
            "refund_status": self.refund_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


def run_db_migrations(app):
    """
    Safe, backward-compatible, idempotent schema migration.
    Guarantees that existing databases receive new tables and columns
    without altering or dropping existing rows or data.
    """
    from sqlalchemy import inspect, text
    with app.app_context():
        # 1. Create any missing tables (idempotent, won't overwrite existing tables)
        db.create_all()

        # 2. Add missing columns to users & bookings table if running on an existing DB
        try:
            inspector = inspect(db.engine)
            table_names = inspector.get_table_names()

            # Migrate users table
            if 'users' in table_names:
                user_cols = {col['name'] for col in inspector.get_columns('users')}
                if 'account_status' not in user_cols:
                    try:
                        with db.engine.connect() as conn:
                            conn.execute(text("ALTER TABLE users ADD COLUMN account_status ENUM('active', 'suspended', 'deleted') NOT NULL DEFAULT 'active'"))
                            conn.commit()
                        print("[Migration] Added column 'account_status' to users table.")
                    except Exception as e:
                        print(f"[Migration Notice] account_status: {e}")

            # Migrate bookings table
            if 'bookings' in table_names:
                existing_cols = {col['name'] for col in inspector.get_columns('bookings')}

                # Add end_time if missing
                if 'end_time' not in existing_cols:
                    try:
                        with db.engine.connect() as conn:
                            conn.execute(text("ALTER TABLE bookings ADD COLUMN end_time TIME NULL"))
                            conn.commit()
                        print("[Migration] Added column 'end_time' to bookings table.")
                    except Exception as e:
                        print(f"[Migration Notice] end_time: {e}")

                # Add cancelled_by if missing
                if 'cancelled_by' not in existing_cols:
                    try:
                        with db.engine.connect() as conn:
                            conn.execute(text("ALTER TABLE bookings ADD COLUMN cancelled_by INT NULL"))
                            conn.commit()
                        print("[Migration] Added column 'cancelled_by' to bookings table.")
                    except Exception as e:
                        print(f"[Migration Notice] cancelled_by: {e}")

            # Migrate reviews table
            if 'reviews' in table_names:
                rev_cols = {col['name'] for col in inspector.get_columns('reviews')}
                if 'is_deleted' not in rev_cols:
                    try:
                        with db.engine.connect() as conn:
                            conn.execute(text("ALTER TABLE reviews ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE"))
                            conn.commit()
                        print("[Migration] Added column 'is_deleted' to reviews table.")
                    except Exception as e:
                        print(f"[Migration Notice] is_deleted: {e}")

                if 'moderation_reason' not in rev_cols:
                    try:
                        with db.engine.connect() as conn:
                            conn.execute(text("ALTER TABLE reviews ADD COLUMN moderation_reason VARCHAR(255) NULL"))
                            conn.commit()
                        print("[Migration] Added column 'moderation_reason' to reviews table.")
                    except Exception as e:
                        print(f"[Migration Notice] moderation_reason: {e}")
        except Exception as e:
            print(f"[Migration Notice] Schema inspection: {e}")