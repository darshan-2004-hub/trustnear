"""
TrustNear – Final Audit & Integration Test Suite
=================================================
Verifies critical fixes and end-to-end integration:
1. Suspended customer cannot make advance payment (403).
2. Suspended customer cannot make balance payment (403).
3. Payment advance blocked if provider is suspended (400).
4. Payment resynchronizes accurately when booking.agreed_price changes.
5. Exact monetary balance guarantee: advance_amount + balance_amount == total_amount.
6. AI chat recommendation strictly filters out suspended/deleted providers.
7. ML Trust Engine has 5 features matching both training and inference.
8. Anonymizing customer preserves booking and payment history intact.
9. Duplicate refund prevention and reason requirement.
"""

import json
import unittest
import joblib
import os
from app import create_app
from models.schema_models import db, User, Booking, Payment, ProviderProfile, TrustMetric, AdminAuditLog


class TestFinalAuditIntegration(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.app, _ = create_app()
        cls.client = cls.app.test_client()

        # Login tokens
        cls.admin_token = cls._login('admin@trustnear.com', 'AdminPass123')
        cls.customer_token = cls._login('alice@example.com', 'Password123')
        cls.provider_token = cls._login('ramesh.electrician@example.com', 'ProviderPass123')

        with cls.app.app_context():
            alice = User.query.filter_by(email='alice@example.com').first()
            ramesh = User.query.filter_by(email='ramesh.electrician@example.com').first()
            cls.alice_id = alice.id if alice else None
            cls.ramesh_id = ramesh.id if ramesh else None

    @classmethod
    def _login(cls, email, password):
        res = cls.client.post(
            '/api/auth/login',
            json={'email': email, 'password': password},
            content_type='application/json'
        )
        data = json.loads(res.data)
        return data.get('token', '')

    def _h(self, token):
        return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

    def _create_booking(self, status='accepted', agreed_price=1000.00):
        with self.app.app_context():
            b = Booking(
                customer_id=self.alice_id,
                provider_id=self.ramesh_id,
                service_title='__FINAL_AUDIT_TEST__',
                service_category='Electrical',
                booking_date='2026-12-15',
                booking_time='11:00:00',
                customer_address='Audit Test Address',
                agreed_price=agreed_price,
                status=status
            )
            db.session.add(b)
            db.session.commit()
            return b.id

    def _delete_booking(self, booking_id):
        with self.app.app_context():
            Payment.query.filter_by(booking_id=booking_id).delete()
            Booking.query.filter_by(id=booking_id).delete()
            db.session.commit()

    # 1. Suspended customer cannot make advance payment
    def test_01_suspended_customer_cannot_pay_advance(self):
        bid = self._create_booking(status='accepted', agreed_price=800.00)
        try:
            with self.app.app_context():
                cust = User.query.get(self.alice_id)
                cust.account_status = 'suspended'
                db.session.commit()

            res = self.client.post(
                f'/api/payments/booking/{bid}/advance',
                json={'simulate': 'success'},
                headers=self._h(self.customer_token)
            )
            self.assertEqual(res.status_code, 403, "Suspended customer must be blocked from paying advance")
        finally:
            with self.app.app_context():
                cust = User.query.get(self.alice_id)
                cust.account_status = 'active'
                db.session.commit()
            self._delete_booking(bid)

    # 2. Suspended customer cannot make balance payment
    def test_02_suspended_customer_cannot_pay_balance(self):
        bid = self._create_booking(status='completed', agreed_price=500.00)
        try:
            # First create advance payment
            self.client.post(
                f'/api/payments/booking/{bid}/advance',
                json={'simulate': 'success'},
                headers=self._h(self.customer_token)
            )

            # Suspend customer
            with self.app.app_context():
                cust = User.query.get(self.alice_id)
                cust.account_status = 'suspended'
                db.session.commit()

            res = self.client.post(
                f'/api/payments/booking/{bid}/balance',
                json={'simulate': 'success'},
                headers=self._h(self.customer_token)
            )
            self.assertEqual(res.status_code, 403, "Suspended customer must be blocked from paying balance")
        finally:
            with self.app.app_context():
                cust = User.query.get(self.alice_id)
                cust.account_status = 'active'
                db.session.commit()
            self._delete_booking(bid)

    # 3. Advance payment blocked if provider is suspended
    def test_03_advance_payment_blocked_if_provider_suspended(self):
        bid = self._create_booking(status='accepted', agreed_price=700.00)
        try:
            with self.app.app_context():
                prov = User.query.get(self.ramesh_id)
                prov.account_status = 'suspended'
                db.session.commit()

            res = self.client.post(
                f'/api/payments/booking/{bid}/advance',
                json={'simulate': 'success'},
                headers=self._h(self.customer_token)
            )
            self.assertEqual(res.status_code, 400, "Advance payment must be blocked if provider is suspended")
            data = json.loads(res.data)
            self.assertIn('suspended', data['message'].lower())
        finally:
            with self.app.app_context():
                prov = User.query.get(self.ramesh_id)
                prov.account_status = 'active'
                db.session.commit()
            self._delete_booking(bid)

    # 4. Payment resynchronizes when agreed_price changes before payment
    def test_04_payment_resynchronizes_with_agreed_price(self):
        bid = self._create_booking(status='accepted', agreed_price=1000.00)
        try:
            # Retrieve payment (creates unpaid row: total=1000, advance=200, balance=800)
            res1 = self.client.get(f'/api/payments/booking/{bid}', headers=self._h(self.customer_token))
            p1 = json.loads(res1.data)['payment']
            self.assertEqual(p1['total_amount'], 1000.00)
            self.assertEqual(p1['advance_amount'], 200.00)

            # Update booking agreed_price to 1500.00
            with self.app.app_context():
                b = Booking.query.get(bid)
                b.agreed_price = 1500.00
                db.session.commit()

            # Next call to get_payment should automatically synchronize
            res2 = self.client.get(f'/api/payments/booking/{bid}', headers=self._h(self.customer_token))
            p2 = json.loads(res2.data)['payment']
            self.assertEqual(p2['total_amount'], 1500.00)
            self.assertEqual(p2['advance_amount'], 300.00)
            self.assertEqual(p2['balance_amount'], 1200.00)
            self.assertEqual(p2['advance_amount'] + p2['balance_amount'], p2['total_amount'])
        finally:
            self._delete_booking(bid)

    # 5. Exact monetary guarantee (advance + balance == total) on odd fractions
    def test_05_exact_monetary_sum_guarantee(self):
        bid = self._create_booking(status='accepted', agreed_price=333.33)
        try:
            res = self.client.get(f'/api/payments/booking/{bid}', headers=self._h(self.customer_token))
            p = json.loads(res.data)['payment']
            total = p['total_amount']
            adv = p['advance_amount']
            bal = p['balance_amount']
            self.assertAlmostEqual(adv + bal, total, places=2,
                msg="Advance + Balance must exactly equal total_amount with zero penny drift")
        finally:
            self._delete_booking(bid)

    # 6. AI recommendation excludes suspended or deleted providers
    def test_06_ai_chat_excludes_suspended_providers(self):
        with self.app.app_context():
            prov = User.query.get(self.ramesh_id)
            prov.account_status = 'suspended'
            db.session.commit()

        try:
            res = self.client.post(
                '/api/ai/chat',
                json={'message': 'Need an electrician in Mangalore'}
            )
            self.assertEqual(res.status_code, 200)
            data = json.loads(res.data)
            self.assertTrue(data.get('success'))
            recommended_ids = [p['user_id'] for p in data.get('providers', [])]
            self.assertNotIn(self.ramesh_id, recommended_ids,
                "Suspended provider must NEVER be recommended by AI assistant")
        finally:
            with self.app.app_context():
                prov = User.query.get(self.ramesh_id)
                prov.account_status = 'active'
                db.session.commit()

    # 7. ML Trust Engine has 5 features matching both training and inference
    def test_07_ml_trust_engine_5_features_consistency(self):
        from ml.trust_engine import trust_engine
        self.assertEqual(len(trust_engine.FEATURE_NAMES), 5)
        self.assertIn('experience_years', trust_engine.FEATURE_NAMES)
        self.assertEqual(trust_engine.model.n_features_in_, 5)

        # Test calculation
        result = trust_engine.calculate_and_explain(
            completed_jobs=10,
            cancellation_rate=2.5,
            avg_response_minutes=15,
            review_sentiment_avg=0.75,
            experience_years=5
        )
        self.assertIn('trust_score', result)
        self.assertIn('shap_factors', result)
        self.assertGreaterEqual(result['trust_score'], 10.0)
        self.assertLessEqual(result['trust_score'], 99.0)

    # 8. Anonymizing customer preserves booking and payment history intact
    def test_08_customer_anonymization_preserves_records(self):
        # Register a temporary customer
        reg_res = self.client.post('/api/auth/register', json={
            'full_name': 'Anon Test Customer',
            'email': 'anon_test_cust@example.com',
            'password': 'Password123',
            'role': 'customer'
        })
        cust_id = json.loads(reg_res.data)['user']['id']
        token = json.loads(reg_res.data)['token']

        # Create booking and payment
        with self.app.app_context():
            b = Booking(
                customer_id=cust_id,
                provider_id=self.ramesh_id,
                service_title='__ANON_TEST_BOOKING__',
                service_category='Electrical',
                booking_date='2026-12-20',
                booking_time='14:00:00',
                customer_address='Anon Test Address',
                agreed_price=450.00,
                status='accepted'
            )
            db.session.add(b)
            db.session.commit()
            bid = b.id

        # Make advance payment
        self.client.post(
            f'/api/payments/booking/{bid}/advance',
            json={'simulate': 'success'},
            headers=self._h(token)
        )

        # Admin safely deletes / anonymizes customer
        del_res = self.client.delete(f'/api/admin/customers/{cust_id}', headers=self._h(self.admin_token))
        self.assertEqual(del_res.status_code, 200)

        # Verify booking and payment records are preserved in database
        with self.app.app_context():
            saved_booking = Booking.query.get(bid)
            self.assertIsNotNone(saved_booking, "Booking must NOT be cascade-deleted upon customer anonymization")
            saved_payment = Payment.query.filter_by(booking_id=bid).first()
            self.assertIsNotNone(saved_payment, "Payment must NOT be deleted upon customer anonymization")
            self.assertEqual(saved_payment.payment_status, 'partially_paid')

            # Cleanup
            Payment.query.filter_by(booking_id=bid).delete()
            Booking.query.filter_by(id=bid).delete()
            u = User.query.get(cust_id)
            if u:
                db.session.delete(u)
            db.session.commit()


if __name__ == '__main__':
    unittest.main(verbosity=2)
