import unittest
import json
from datetime import datetime, date, timezone, timedelta
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from models.schema_models import db, User, ProviderProfile, Booking, TrustMetric, Review
import jwt

class ProviderAnalyticsTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app, cls.socketio = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()

    def _generate_token(self, user):
        payload = {
            'user_id': user.id,
            'role': user.role,
            'exp': (datetime.now(timezone.utc) + timedelta(hours=1)).timestamp()
        }
        return jwt.encode(payload, self.app.config['JWT_SECRET_KEY'], algorithm='HS256')

    def test_unauthorized_access(self):
        """Should reject unauthenticated requests with 401."""
        res = self.client.get('/api/providers/dashboard/analytics')
        self.assertEqual(res.status_code, 401)

    def test_customer_access_forbidden(self):
        """Should reject customer role with 403 Forbidden."""
        with self.app.app_context():
            customer = User.query.filter_by(role='customer').first()
            if not customer:
                self.skipTest("No customer found in DB")
            token = self._generate_token(customer)

        res = self.client.get(
            '/api/providers/dashboard/analytics',
            headers={'Authorization': f'Bearer {token}'}
        )
        self.assertEqual(res.status_code, 403)
        data = json.loads(res.data)
        self.assertFalse(data['success'])

    def test_provider_analytics_success(self):
        """Authenticated provider receives comprehensive analytics and KPIs."""
        with self.app.app_context():
            provider = User.query.filter_by(role='provider').first()
            if not provider:
                self.skipTest("No provider found in DB")
            token = self._generate_token(provider)
            provider_id = provider.id

        res = self.client.get(
            '/api/providers/dashboard/analytics',
            headers={'Authorization': f'Bearer {token}'}
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])

        # Verify KPI structure
        kpis = data['kpis']
        self.assertIn('total_bookings', kpis)
        self.assertIn('pending_requests', kpis)
        self.assertIn('active_jobs', kpis)
        self.assertIn('completed_jobs', kpis)
        self.assertIn('total_earnings', kpis)
        self.assertIn('trust_score', kpis)
        self.assertIn('evidence_note', kpis)
        self.assertIn('data_source', kpis)
        self.assertIn('avg_rating', kpis)
        self.assertIn('cancellation_rate', kpis)

        # Verify Analytics structure
        analytics = data['analytics']
        self.assertIn('monthly_series', analytics)
        self.assertIn('status_distribution', analytics)
        self.assertIsInstance(analytics['monthly_series'], list)
        self.assertGreaterEqual(len(analytics['monthly_series']), 6)

        # Verify monthly series item structure
        first_month = analytics['monthly_series'][0]
        self.assertIn('month', first_month)
        self.assertIn('month_key', first_month)
        self.assertIn('earnings', first_month)
        self.assertIn('total_bookings', first_month)
        self.assertIn('completed_count', first_month)

        # Verify Earnings match completed bookings only
        with self.app.app_context():
            completed_bookings = Booking.query.filter_by(
                provider_id=provider_id,
                status='completed'
            ).all()
            expected_earnings = sum(float(b.agreed_price) for b in completed_bookings if b.agreed_price)
            self.assertAlmostEqual(kpis['total_earnings'], round(expected_earnings, 2))

if __name__ == '__main__':
    unittest.main()
