import sys
import os

# Add parent directory to path so we can import app and models
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from werkzeug.security import generate_password_hash
from app import create_app
from models.schema_models import db, User, ProviderProfile, TrustMetric
from ml.trust_engine import trust_engine

app, _ = create_app()

sample_providers = [
    {
        "full_name": "Rajesh Rao",
        "email": "rajesh.electric@example.com",
        "phone": "+919845012345",
        "service_category": "Electrical",
        "experience_years": 8,
        "hourly_rate": 350.00,
        "service_address": "Kodialbail, Mangaluru",
        "bio": "Certified industrial and residential master electrician. Emergency short-circuit and wiring expert.",
        "latitude": 12.8732,
        "longitude": 74.8427,
        "metrics": {"completed_jobs": 94, "cancellation_rate": 2.1, "avg_response_minutes": 15, "review_sentiment_avg": 0.82, "experience_years": 8}
    },
    {
        "full_name": "Suresh Poojary",
        "email": "suresh.plumbing@example.com",
        "phone": "+919845098765",
        "service_category": "Plumbing",
        "experience_years": 12,
        "hourly_rate": 300.00,
        "service_address": "Kadri, Mangaluru",
        "bio": "Specialist in pipe leak detection, bathroom fittings, and solar water heater installation.",
        "latitude": 12.8804,
        "longitude": 74.8560,
        "metrics": {"completed_jobs": 142, "cancellation_rate": 1.4, "avg_response_minutes": 12, "review_sentiment_avg": 0.91, "experience_years": 12}
    },
    {
        "full_name": "Anil D'Souza",
        "email": "anil.appliances@example.com",
        "phone": "+919845034567",
        "service_category": "Appliance Repair",
        "experience_years": 5,
        "hourly_rate": 400.00,
        "service_address": "Valencia, Mangaluru",
        "bio": "Trained technician for washing machines, microwave ovens, and double-door refrigerators.",
        "latitude": 12.8598,
        "longitude": 74.8524,
        "metrics": {"completed_jobs": 58, "cancellation_rate": 5.2, "avg_response_minutes": 35, "review_sentiment_avg": 0.64, "experience_years": 5}
    },
    {
        "full_name": "Pooja Hegde",
        "email": "pooja.cleaners@example.com",
        "phone": "+919845065432",
        "service_category": "Home Cleaning",
        "experience_years": 4,
        "hourly_rate": 250.00,
        "service_address": "Bejai, Mangaluru",
        "bio": "Deep home sanitization, kitchen chimney degreasing, and eco-friendly floor buffing.",
        "latitude": 12.8887,
        "longitude": 74.8449,
        "metrics": {"completed_jobs": 37, "cancellation_rate": 8.1, "avg_response_minutes": 40, "review_sentiment_avg": 0.52, "experience_years": 4}
    },
    {
        "full_name": "Ibrahim Sheikh",
        "email": "ibrahim.carpenter@example.com",
        "phone": "+919845077889",
        "service_category": "Carpentry",
        "experience_years": 15,
        "hourly_rate": 450.00,
        "service_address": "Bunder, Mangaluru",
        "bio": "Custom wooden furniture repair, modular kitchen fitting, and lock repairs.",
        "latitude": 12.8622,
        "longitude": 74.8361,
        "metrics": {"completed_jobs": 118, "cancellation_rate": 2.5, "avg_response_minutes": 20, "review_sentiment_avg": 0.88, "experience_years": 15}
    }
]

def seed_database():
    with app.app_context():
        print("Starting TrustNear Database Seeding with ML Trust Scores...")
        for pdata in sample_providers:
            existing = User.query.filter_by(email=pdata["email"]).first()
            if existing:
                print(f"Skipping {pdata['email']} (already exists)")
                continue

            user = User(
                full_name=pdata["full_name"],
                email=pdata["email"],
                password_hash=generate_password_hash("Password123", method='scrypt'),
                role='provider',
                phone=pdata["phone"]
            )
            db.session.add(user)
            db.session.flush()

            profile = ProviderProfile(
                user_id=user.id,
                service_category=pdata["service_category"],
                experience_years=pdata["experience_years"],
                hourly_rate=pdata["hourly_rate"],
                bio=pdata["bio"],
                service_address=pdata["service_address"],
                latitude=pdata["latitude"],
                longitude=pdata["longitude"],
                is_available=True,
                verification_status='verified'
            )
            db.session.add(profile)

            # Compute ML Trust Score & SHAP factors
            result = trust_engine.calculate_and_explain(pdata["metrics"])

            trust = TrustMetric(
                provider_id=user.id,
                trust_score=result["trust_score"],
                completed_jobs=pdata["metrics"]["completed_jobs"],
                cancellation_rate=pdata["metrics"]["cancellation_rate"],
                avg_response_minutes=pdata["metrics"]["avg_response_minutes"],
                review_sentiment_avg=pdata["metrics"]["review_sentiment_avg"],
                shap_factors=result["shap_factors"]
            )
            db.session.add(trust)
            print(f"Added {pdata['full_name']} | ML Trust Score: {result['trust_score']}")

        db.session.commit()
        print("Database Seeding Completed Successfully!")

if __name__ == '__main__':
    seed_database()