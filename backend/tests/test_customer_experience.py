import unittest
import json
from datetime import datetime, date, time, timezone, timedelta
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from models.schema_models import db, User, ProviderProfile, Booking, TrustMetric, Review
import jwt

class CustomerExperienceTestCase(unittest.TestCase):
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

    def test_provider_detail_endpoint(self):
        """GET /api/providers/<id> returns rich profile, evidence note, data source, and reviews."""
        with self.app.app_context():
            provider = User.query.filter_by(role='provider').first()
            if not provider:
                self.skipTest("No provider found in DB")
            provider_id = provider.id

        res = self.client.get(f'/api/providers/{provider_id}')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        p = data['provider']
        self.assertEqual(p['user_id'], provider_id)
        self.assertIn('evidence_note', p)
        self.assertIn('data_source', p)
        self.assertIn('verification_status', p)
        self.assertIn('is_available', p)
        self.assertIn('reviews', p)
        self.assertIsInstance(p['reviews'], list)

    def test_customer_profile_update(self):
        """PATCH /api/auth/profile updates customer full_name and phone."""
        with self.app.app_context():
            customer = User.query.filter_by(role='customer').first()
            if not customer:
                self.skipTest("No customer found in DB")
            token = self._generate_token(customer)
            orig_name = customer.full_name
            orig_phone = customer.phone

        # 1. Successful update
        res = self.client.patch(
            '/api/auth/profile',
            headers={'Authorization': f'Bearer {token}'},
            json={'full_name': 'Alice Updated', 'phone': '9876543210'}
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['user']['full_name'], 'Alice Updated')
        self.assertEqual(data['user']['phone'], '9876543210')

        # 2. Validation: Empty name
        res_empty = self.client.patch(
            '/api/auth/profile',
            headers={'Authorization': f'Bearer {token}'},
            json={'full_name': '   '}
        )
        self.assertEqual(res_empty.status_code, 400)

        # 3. Validation: Invalid phone length
        res_phone = self.client.patch(
            '/api/auth/profile',
            headers={'Authorization': f'Bearer {token}'},
            json={'phone': '123'}
        )
        self.assertEqual(res_phone.status_code, 400)

        # Revert back to original
        with self.app.app_context():
            c = User.query.get(customer.id)
            c.full_name = orig_name
            c.phone = orig_phone
            db.session.commit()

    def test_customer_password_update_validation(self):
        """PATCH /api/auth/profile rejects password change with invalid current password."""
        with self.app.app_context():
            customer = User.query.filter_by(role='customer').first()
            if not customer:
                self.skipTest("No customer found in DB")
            token = self._generate_token(customer)

        res = self.client.patch(
            '/api/auth/profile',
            headers={'Authorization': f'Bearer {token}'},
            json={
                'current_password': 'WrongPassword123!',
                'new_password': 'NewSecretPassword456!'
            }
        )
        self.assertEqual(res.status_code, 400)
        data = json.loads(res.data)
        self.assertFalse(data['success'])
        self.assertIn('Current password does not match', data['message'])

    def test_booking_privacy_and_cancellation_flow(self):
        """
        Verify that:
        1. Pending bookings withhold direct contact info (contact_permitted = False).
        2. Accepted bookings reveal direct contact info (contact_permitted = True).
        3. Cancellation stores reason and updates status.
        """
        with self.app.app_context():
            customer = User.query.filter_by(role='customer').first()
            provider = User.query.filter_by(role='provider').first()
            if not customer or not provider:
                self.skipTest("Customer or provider missing in DB")

            customer_token = self._generate_token(customer)
            provider_token = self._generate_token(provider)
            provider_phone = provider.phone

            # Create test booking
            test_booking = Booking(
                customer_id=customer.id,
                provider_id=provider.id,
                service_title='Test Customer Experience Pipe Fix',
                service_category='Plumbing',
                booking_date=date.today() + timedelta(days=2),
                booking_time=time(14, 30),
                customer_address='Kadri Road, Mangaluru',
                agreed_price=600.0,
                status='pending'
            )
            db.session.add(test_booking)
            db.session.commit()
            booking_id = test_booking.id

        # 1. Customer checks pending booking: contact info should NOT be permitted
        res_pending = self.client.get(
            '/api/bookings',
            headers={'Authorization': f'Bearer {customer_token}'}
        )
        self.assertEqual(res_pending.status_code, 200)
        b_data = next((b for b in json.loads(res_pending.data)['bookings'] if b['id'] == booking_id), None)
        self.assertIsNotNone(b_data)
        self.assertFalse(b_data['counterpart']['contact_permitted'])
        self.assertIsNone(b_data['counterpart']['phone'])
        self.assertIsNone(b_data['counterpart']['email'])

        # 2. Provider accepts booking: contact info should be permitted
        res_accept = self.client.patch(
            f'/api/bookings/{booking_id}/status',
            headers={'Authorization': f'Bearer {provider_token}'},
            json={'status': 'accepted'}
        )
        self.assertEqual(res_accept.status_code, 200)

        res_accepted_cust = self.client.get(
            '/api/bookings',
            headers={'Authorization': f'Bearer {customer_token}'}
        )
        b_data_acc = next((b for b in json.loads(res_accepted_cust.data)['bookings'] if b['id'] == booking_id), None)
        self.assertIsNotNone(b_data_acc)
        self.assertTrue(b_data_acc['counterpart']['contact_permitted'])
        if provider_phone:
            self.assertEqual(b_data_acc['counterpart']['phone'], provider_phone)

        # 3. Customer cancels booking with explicit reason
        res_cancel = self.client.patch(
            f'/api/bookings/{booking_id}/status',
            headers={'Authorization': f'Bearer {customer_token}'},
            json={
                'status': 'cancelled',
                'cancellation_reason': 'Schedule conflict / Change of plans'
            }
        )
        self.assertEqual(res_cancel.status_code, 200)

        # 4. Clean up test booking
        with self.app.app_context():
            b = Booking.query.get(booking_id)
            self.assertEqual(b.status, 'cancelled')
            self.assertEqual(b.cancellation_reason, 'Schedule conflict / Change of plans')
            db.session.delete(b)
            db.session.commit()

if __name__ == '__main__':
    unittest.main()
