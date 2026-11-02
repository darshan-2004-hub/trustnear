import os
import sys
import numpy as np
import pandas as pd

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

CATEGORY_CODE_MAP = {
    'plumbing': 0,
    'electrical': 1,
    'carpentry': 2,
    'cleaning': 3,
    'home cleaning': 3,
    'appliance repair': 4,
    'painting': 5
}

def ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)

# ==============================================================================
# 1. SYNTHETIC DATASET GENERATION (Clearly Labeled)
# ==============================================================================

def generate_synthetic_trust_data(n_samples: int = 600, random_state: int = 42) -> pd.DataFrame:
    """
    Generates clearly labeled synthetic historical records for provider trust training.
    """
    np.random.seed(random_state)

    completed_jobs = np.random.exponential(scale=25, size=n_samples).astype(int)
    cancellation_rate = np.round(np.random.beta(a=1.5, b=8, size=n_samples) * 100, 2)
    avg_response_minutes = np.random.gamma(shape=2, scale=15, size=n_samples).astype(int)
    review_sentiment_avg = np.round(np.random.uniform(low=-0.2, high=1.0, size=n_samples), 4)

    # Domain formula for ground-truth benchmark
    trust_scores = (
        50.0
        + np.clip(completed_jobs * 0.85, 0, 30)
        - (cancellation_rate * 0.55)
        - np.clip(avg_response_minutes * 0.18, 0, 15)
        + (review_sentiment_avg * 20.0)
    )
    trust_scores = np.round(np.clip(trust_scores, 15.0, 99.0), 2)

    df = pd.DataFrame({
        'completed_jobs': completed_jobs,
        'cancellation_rate': cancellation_rate,
        'avg_response_minutes': avg_response_minutes,
        'review_sentiment_avg': review_sentiment_avg,
        'trust_score': trust_scores,
        'is_synthetic': True,
        'data_source': 'synthetic_benchmark_v1'
    })
    return df

def generate_synthetic_price_data(n_samples: int = 800, random_state: int = 42) -> pd.DataFrame:
    """
    Generates clearly labeled synthetic market transactions for service price regression.
    """
    np.random.seed(random_state)

    cat_map = {0: 'Plumbing', 1: 'Electrical', 2: 'Carpentry', 3: 'Cleaning', 4: 'Appliance Repair', 5: 'Painting'}
    base_rates = {0: 350, 1: 400, 2: 450, 3: 300, 4: 450, 5: 380}

    categories = np.random.choice([0, 1, 2, 3, 4, 5], size=n_samples)
    duration = np.round(np.random.uniform(0.5, 6.0, size=n_samples), 1)
    emergency = np.random.choice([0, 1], size=n_samples, p=[0.8, 0.2])

    prices = [
        round(max(150.0, (base_rates[cat] * dur) + (150.0 * em) + float(np.random.normal(0, 25))), 2)
        for cat, dur, em in zip(categories, duration, emergency)
    ]

    df = pd.DataFrame({
        'cat': categories,
        'category_name': [cat_map[c] for c in categories],
        'duration': duration,
        'emergency': emergency,
        'price': prices,
        'is_synthetic': True,
        'data_source': 'synthetic_benchmark_v1'
    })
    return df

# ==============================================================================
# 2. REAL MYSQL DATASET EXTRACTION (Providers, Bookings, Reviews, Prices)
# ==============================================================================

def fetch_real_mysql_trust_metrics() -> pd.DataFrame:
    """
    Retrieves genuine TrustMetric records from MySQL.
    Clearly labeled with is_synthetic=False and data_source='mysql_production'.
    """
    try:
        from app import app
        from models.schema_models import TrustMetric
        with app.app_context():
            records = TrustMetric.query.all()
            if not records:
                return pd.DataFrame()

            data = [{
                'completed_jobs': int(r.completed_jobs or 0),
                'cancellation_rate': float(r.cancellation_rate or 0.0),
                'avg_response_minutes': int(r.avg_response_minutes or 25),
                'review_sentiment_avg': float(r.review_sentiment_avg or 0.0),
                'trust_score': float(r.trust_score or 50.0),
                'is_synthetic': False,
                'data_source': 'mysql_production'
            } for r in records]
            return pd.DataFrame(data)
    except Exception as e:
        print(f"[ML Datasets Notice] Could not read TrustMetric from MySQL: {e}")
        return pd.DataFrame()

def fetch_real_mysql_service_prices() -> pd.DataFrame:
    """
    Retrieves genuine completed/agreed service pricing from Bookings and Provider profiles in MySQL.
    Clearly labeled with is_synthetic=False and data_source='mysql_production'.
    """
    try:
        from app import app
        from models.schema_models import Booking, ProviderProfile
        with app.app_context():
            # 1. From agreed bookings
            bookings = Booking.query.filter(Booking.agreed_price.isnot(None), Booking.agreed_price > 0).all()
            rows = []
            for b in bookings:
                cat_norm = str(b.service_category).strip().lower()
                cat_code = CATEGORY_CODE_MAP.get(cat_norm, 0)
                # Default duration estimate if not tracked on booking
                rows.append({
                    'cat': cat_code,
                    'category_name': b.service_category,
                    'duration': 1.5,
                    'emergency': 0,
                    'price': float(b.agreed_price),
                    'is_synthetic': False,
                    'data_source': 'mysql_production_bookings'
                })

            # 2. From verified provider hourly rates
            providers = ProviderProfile.query.filter(ProviderProfile.hourly_rate > 0).all()
            for p in providers:
                cat_norm = str(p.service_category).strip().lower()
                cat_code = CATEGORY_CODE_MAP.get(cat_norm, 0)
                rows.append({
                    'cat': cat_code,
                    'category_name': p.service_category,
                    'duration': 1.0,
                    'emergency': 0,
                    'price': float(p.hourly_rate),
                    'is_synthetic': False,
                    'data_source': 'mysql_production_rates'
                })

            return pd.DataFrame(rows) if rows else pd.DataFrame()
    except Exception as e:
        print(f"[ML Datasets Notice] Could not read service prices from MySQL: {e}")
        return pd.DataFrame()

def fetch_real_mysql_providers() -> pd.DataFrame:
    """Retrieves all provider profiles from MySQL with full credentials."""
    try:
        from app import app
        from models.schema_models import ProviderProfile, User
        with app.app_context():
            results = ProviderProfile.query.join(User, ProviderProfile.user_id == User.id).all()
            if not results:
                return pd.DataFrame()
            data = [{
                'provider_id': p.user_id,
                'full_name': p.user.full_name,
                'email': p.user.email,
                'service_category': p.service_category,
                'experience_years': p.experience_years,
                'hourly_rate': float(p.hourly_rate),
                'verification_status': p.verification_status,
                'is_available': p.is_available,
                'is_synthetic': False,
                'data_source': 'mysql_production'
            } for p in results]
            return pd.DataFrame(data)
    except Exception as e:
        print(f"[ML Datasets Notice] Could not read providers from MySQL: {e}")
        return pd.DataFrame()

def fetch_real_mysql_reviews() -> pd.DataFrame:
    """Retrieves all reviews from MySQL."""
    try:
        from app import app
        from models.schema_models import Review
        with app.app_context():
            reviews = Review.query.all()
            if not reviews:
                return pd.DataFrame()
            data = [{
                'review_id': r.id,
                'booking_id': r.booking_id,
                'provider_id': r.provider_id,
                'rating': r.rating,
                'sentiment_score': float(r.sentiment_score) if r.sentiment_score is not None else None,
                'is_suspicious': r.is_suspicious,
                'is_approved_by_admin': r.is_approved_by_admin,
                'is_synthetic': False,
                'data_source': 'mysql_production'
            } for r in reviews]
            return pd.DataFrame(data)
    except Exception as e:
        print(f"[ML Datasets Notice] Could not read reviews from MySQL: {e}")
        return pd.DataFrame()

# ==============================================================================
# 3. ROBUST DATASET LOADERS (Handles Missing / Insufficient Real Data Safely)
# ==============================================================================

def load_trust_dataset(source_preference: str = 'hybrid', min_real_samples: int = 20) -> pd.DataFrame:
    """
    Loads provider trust dataset.
    source_preference: 'hybrid' | 'real_only' | 'synthetic_only'
    Safely handles missing or insufficient real data without crashing.
    """
    ensure_data_dir()
    real_df = pd.DataFrame()

    if source_preference in ['hybrid', 'real_only']:
        real_df = fetch_real_mysql_trust_metrics()

    if source_preference == 'real_only':
        if len(real_df) >= min_real_samples:
            return real_df
        elif len(real_df) > 0:
            print(f"[ML Notice] Only {len(real_df)} real trust samples found (min={min_real_samples}). Returning available real data.")
            return real_df
        else:
            print("[ML Notice] Zero real trust records in MySQL. Falling back to synthetic benchmark.")
            return generate_synthetic_trust_data()

    if source_preference == 'hybrid':
        synthetic_df = generate_synthetic_trust_data()
        if len(real_df) >= min_real_samples:
            print(f"[ML Data] Using {len(real_df)} production MySQL trust records.")
            return real_df
        elif len(real_df) > 0:
            print(f"[ML Data Hybrid] Augmenting {len(real_df)} real MySQL records with {len(synthetic_df)} benchmark records.")
            combined = pd.concat([synthetic_df, real_df], ignore_index=True)
            return combined
        else:
            print("[ML Data] Real MySQL trust records empty. Using labeled synthetic benchmark.")
            return synthetic_df

    # Default synthetic_only
    return generate_synthetic_trust_data()


def load_price_dataset(source_preference: str = 'hybrid', min_real_samples: int = 20) -> pd.DataFrame:
    """
    Loads service pricing dataset.
    source_preference: 'hybrid' | 'real_only' | 'synthetic_only'
    Safely handles missing or insufficient real data without crashing.
    """
    ensure_data_dir()
    real_df = pd.DataFrame()

    if source_preference in ['hybrid', 'real_only']:
        real_df = fetch_real_mysql_service_prices()

    if source_preference == 'real_only':
        if len(real_df) >= min_real_samples:
            return real_df
        elif len(real_df) > 0:
            print(f"[ML Notice] Only {len(real_df)} real price samples found (min={min_real_samples}). Returning available real data.")
            return real_df
        else:
            print("[ML Notice] Zero real price records in MySQL. Falling back to synthetic benchmark.")
            return generate_synthetic_price_data()

    if source_preference == 'hybrid':
        synthetic_df = generate_synthetic_price_data()
        if len(real_df) >= min_real_samples:
            print(f"[ML Data] Using {len(real_df)} production MySQL price records.")
            return real_df
        elif len(real_df) > 0:
            print(f"[ML Data Hybrid] Augmenting {len(real_df)} real MySQL records with {len(synthetic_df)} benchmark records.")
            feature_cols = ['cat', 'category_name', 'duration', 'emergency', 'price', 'is_synthetic', 'data_source']
            real_aligned = real_df[feature_cols] if all(c in real_df.columns for c in feature_cols) else real_df
            combined = pd.concat([synthetic_df, real_aligned], ignore_index=True)
            return combined
        else:
            print("[ML Data] Real MySQL price records empty. Using labeled synthetic benchmark.")
            return synthetic_df

    return generate_synthetic_price_data()

def export_all_datasets_to_csv():
    """Exports both benchmark and any available production tables to disk."""
    ensure_data_dir()
    df_trust = load_trust_dataset(source_preference='hybrid')
    df_trust.to_csv(os.path.join(DATA_DIR, 'trust_metrics_dataset.csv'), index=False)

    df_price = load_price_dataset(source_preference='hybrid')
    df_price.to_csv(os.path.join(DATA_DIR, 'service_prices_dataset.csv'), index=False)

    df_providers = fetch_real_mysql_providers()
    if not df_providers.empty:
        df_providers.to_csv(os.path.join(DATA_DIR, 'providers_production.csv'), index=False)

    df_reviews = fetch_real_mysql_reviews()
    if not df_reviews.empty:
        df_reviews.to_csv(os.path.join(DATA_DIR, 'reviews_production.csv'), index=False)

    return True
