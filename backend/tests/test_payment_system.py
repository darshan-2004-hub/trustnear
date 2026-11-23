"""
TrustNear – Payment System Tests (Stage 6, Task 6)
====================================================
Covers all 11 required verification points:

 1. Customer cannot pay advance before provider acceptance (must be 'accepted').
 2. Correct 20% advance amount calculated from agreed_price.
 3. Simulated success and failure both work correctly.
 4. Customer cannot pay another customer's booking (403).
 5. Duplicate advance payment is prevented (409).
 6. Balance payment unavailable before booking completion (400).
 7. Correct 80% balance amount calculated from agreed_price.
 8. Payment status becomes 'fully_paid' after both payments.
 9. Provider cannot modify payment records (403).
10. Admin-only refund management + duplicate refund prevention (409).
11. Regression: existing 136+ tests still pass (run separately).
"""

import json
import unittest
from app import create_app
from models.schema_models import db, User, Booking, Payment, ProviderProfile


class TestPaymentSystem(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.app, _ = create_app()
        cls.client = cls.app.test_client()

        # Obtain tokens
        cls.admin_token    = cls._login('admin@trustnear.com',              'AdminPass123')
        cls.customer_token = cls._login('alice@example.com',                'Password123')
        cls.provider_token = cls._login('ramesh.electrician@example.com',   'ProviderPass123')

        # Resolve IDs
        with cls.app.app_context():
            alice   = User.query.filter_by(email='alice@example.com').first()
            ramesh  = User.query.filter_by(email='ramesh.electrician@example.com').first()
            cls.alice_id  = alice.id  if alice  else None
            cls.ramesh_id = ramesh.id if ramesh else None

    @classmethod
    def tearDownClass(cls):
        """Clean up any test payment/booking rows created during the run."""
        with cls.app.app_context():
            Payment.query.filter(
                Payment.booking_id.in_(
                    db.session.query(Booking.id).filter(
                        Booking.service_title == '__TEST_PAYMENT_BOOKING__'
                    )
                )
            ).delete(synchronize_session=False)
            Booking.query.filter_by(service_title='__TEST_PAYMENT_BOOKING__').delete()
            db.session.commit()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

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

    def _create_test_booking(self, status='pending', agreed_price=1000.00):
        """
        Create a booking directly in the DB (bypassing business logic)
        so we can set any status we need for payment tests.
        """
        with self.app.app_context():
            # Find provider_id from ProviderProfile
            pp = ProviderProfile.query.filter_by(user_id=self.ramesh_id).first()
            provider_id = pp.user_id if pp else self.ramesh_id

            booking = Booking(
                customer_id=self.alice_id,
                provider_id=provider_id,
                service_title='__TEST_PAYMENT_BOOKING__',
                service_category='Electrical',
                booking_date='2025-12-31',
                booking_time='10:00:00',
                customer_address='123 Test St',
                agreed_price=agreed_price,
                status=status,
            )
            db.session.add(booking)
            db.session.commit()
            return booking.id

    def _delete_booking(self, booking_id):
        with self.app.app_context():
            Payment.query.filter_by(booking_id=booking_id).delete()
            Booking.query.filter_by(id=booking_id).delete()
            db.session.commit()

    # ==================================================================
    # TEST 1 – Cannot pay advance before 'accepted' status
    # ==================================================================
    def test_01_advance_blocked_before_acceptance(self):
        bid = self._create_test_booking(status='pending', agreed_price=500.00)
        try:
            res = self.client.post(
                f'/api/payments/booking/{bid}/advance',
                json={'simulate': 'success'},
                headers=self._h(self.customer_token)
            )
            self.assertEqual(res.status_code, 400,
                "Should return 400 when booking is not yet accepted")
            data = json.loads(res.data)
            self.assertFalse(data['success'])
        finally:
            self._delete_booking(bid)

    # ==================================================================
    # TEST 2 – Correct 20% advance calculation
    # ==================================================================
    def test_02_advance_amount_is_20_percent(self):
        bid = self._create_test_booking(status='accepted', agreed_price=1000.00)
        try:
            res = self.client.post(
                f'/api/payments/booking/{bid}/advance',
                json={'simulate': 'success'},
                headers=self._h(self.customer_token)
            )
            self.assertEqual(res.status_code, 200)
            data = json.loads(res.data)
            self.assertTrue(data.get('payment_success'), "Payment_success should be True")
            payment = data['payment']
            self.assertAlmostEqual(payment['advance_amount'], 200.00, places=2,
                msg="Advance should be 20% of 1000")
            self.assertAlmostEqual(payment['balance_amount'], 800.00, places=2,
                msg="Balance should be 80% of 1000")
            self.assertAlmostEqual(payment['amount_paid'],    200.00, places=2)
            self.assertEqual(payment['payment_status'], 'partially_paid')
        finally:
            self._delete_booking(bid)

    # ==================================================================
    # TEST 3 – Simulate success and failure both work
    # ==================================================================
    def test_03_simulate_success_and_failure(self):
        # Success path
        bid = self._create_test_booking(status='accepted', agreed_price=800.00)
        try:
            res = self.client.post(
                f'/api/payments/booking/{bid}/advance',
                json={'simulate': 'success'},
                headers=self._h(self.customer_token)
            )
            data = json.loads(res.data)
            self.assertTrue(data.get('payment_success'))
            self.assertIn('TXN-', data.get('transaction_id', ''))
        finally:
            self._delete_booking(bid)

        # Failure path
        bid2 = self._create_test_booking(status='accepted', agreed_price=600.00)
        try:
            res2 = self.client.post(
                f'/api/payments/booking/{bid2}/advance',
                json={'simulate': 'failure'},
                headers=self._h(self.customer_token)
            )
            self.assertEqual(res2.status_code, 200)
            data2 = json.loads(res2.data)
            self.assertFalse(data2.get('payment_success'),
                "Payment_success should be False on simulated failure")
            # Payment row must remain unpaid
            payment2 = data2['payment']
            self.assertEqual(payment2['payment_status'], 'unpaid')
            self.assertIsNone(payment2.get('advance_transaction_id'))
        finally:
            self._delete_booking(bid2)

    # ==================================================================
    # TEST 4 – Customer cannot pay another customer's booking
    # ==================================================================
    def test_04_cross_customer_payment_blocked(self):
        bid = self._create_test_booking(status='accepted', agreed_price=700.00)
        try:
            # Register & login a second customer
            reg = self.client.post(
                '/api/auth/register',
                json={
                    'full_name': 'Other Customer',
                    'email': 'other_customer_pay_test@example.com',
                    'password': 'OtherPass123',
                    'role': 'customer'
                }
            )
            other_token = self._login('other_customer_pay_test@example.com', 'OtherPass123')

            res = self.client.post(
                f'/api/payments/booking/{bid}/advance',
                json={'simulate': 'success'},
                headers=self._h(other_token)
            )
            self.assertEqual(res.status_code, 403,
                "Another customer should get 403 for a booking they don't own")
        finally:
            self._delete_booking(bid)
            # Cleanup test user
            with self.app.app_context():
                u = User.query.filter_by(email='other_customer_pay_test@example.com').first()
                if u:
                    db.session.delete(u)
                    db.session.commit()

    # ==================================================================
    # TEST 5 – Duplicate advance payment is prevented
    # ==================================================================
    def test_05_duplicate_advance_prevented(self):
        bid = self._create_test_booking(status='accepted', agreed_price=900.00)
        try:
            # First payment
            self.client.post(
                f'/api/payments/booking/{bid}/advance',
                json={'simulate': 'success'},
                headers=self._h(self.customer_token)
            )
            # Second attempt
            res2 = self.client.post(
                f'/api/payments/booking/{bid}/advance',
                json={'simulate': 'success'},
                headers=self._h(self.customer_token)
            )
            self.assertEqual(res2.status_code, 409,
                "Duplicate advance payment should return 409 Conflict")
            data2 = json.loads(res2.data)
            self.assertFalse(data2['success'])
        finally:
            self._delete_booking(bid)

    # ==================================================================
    # TEST 6 – Balance unavailable before completion
    # ==================================================================
    def test_06_balance_blocked_before_completion(self):
        bid = self._create_test_booking(status='accepted', agreed_price=1200.00)
        try:
            # Pay advance first
            self.client.post(
                f'/api/payments/booking/{bid}/advance',
                json={'simulate': 'success'},
                headers=self._h(self.customer_token)
            )
            # Try balance while still 'accepted'
            res = self.client.post(
                f'/api/payments/booking/{bid}/balance',
                json={'simulate': 'success'},
                headers=self._h(self.customer_token)
            )
            self.assertEqual(res.status_code, 400,
                "Balance payment should be blocked if booking is not completed")
        finally:
            self._delete_booking(bid)

    # ==================================================================
    # TEST 7 – Correct 80% balance calculation
    # ==================================================================
    def test_07_balance_amount_is_80_percent(self):
        bid = self._create_test_booking(status='completed', agreed_price=2000.00)
        try:
            # First inject an advance payment record directly (booking is already 'completed')
            with self.app.app_context():
                from models.schema_models import Payment as P
                p = P(
                    booking_id=bid,
                    total_amount=2000.00,
                    advance_amount=400.00,
                    balance_amount=1600.00,
                    amount_paid=400.00,
                    payment_status='partially_paid',
                    advance_transaction_id='TXN-TESTADVANCE001',
                )
                db.session.add(p)
                db.session.commit()

            res = self.client.post(
                f'/api/payments/booking/{bid}/balance',
                json={'simulate': 'success'},
                headers=self._h(self.customer_token)
            )
            self.assertEqual(res.status_code, 200)
            data = json.loads(res.data)
            self.assertTrue(data.get('payment_success'))
            payment = data['payment']
            self.assertAlmostEqual(payment['amount_paid'],  2000.00, places=2)
            self.assertAlmostEqual(payment['balance_amount'], 1600.00, places=2)
            self.assertEqual(payment['payment_status'], 'fully_paid')
        finally:
            self._delete_booking(bid)

    # ==================================================================
    # TEST 8 – Full workflow: status becomes 'fully_paid'
    # ==================================================================
    def test_08_full_workflow_fully_paid(self):
        bid = self._create_test_booking(status='accepted', agreed_price=500.00)
        try:
            # Step 1: advance
            r1 = self.client.post(
                f'/api/payments/booking/{bid}/advance',
                json={'simulate': 'success'},
                headers=self._h(self.customer_token)
            )
            d1 = json.loads(r1.data)
            self.assertTrue(d1.get('payment_success'))
            self.assertEqual(d1['payment']['payment_status'], 'partially_paid')

            # Move booking to completed in DB
            with self.app.app_context():
                b = Booking.query.get(bid)
                b.status = 'completed'
                db.session.commit()

            # Step 2: balance
            r2 = self.client.post(
                f'/api/payments/booking/{bid}/balance',
                json={'simulate': 'success'},
                headers=self._h(self.customer_token)
            )
            d2 = json.loads(r2.data)
            self.assertTrue(d2.get('payment_success'))
            self.assertEqual(d2['payment']['payment_status'], 'fully_paid')
            self.assertAlmostEqual(d2['payment']['amount_paid'], 500.00, places=2)
            self.assertIsNotNone(d2['payment']['balance_transaction_id'])
        finally:
            self._delete_booking(bid)

    # ==================================================================
    # TEST 9 – Provider cannot modify payment records
    # ==================================================================
    def test_09_provider_cannot_make_payments(self):
        bid = self._create_test_booking(status='accepted', agreed_price=400.00)
        try:
            res = self.client.post(
                f'/api/payments/booking/{bid}/advance',
                json={'simulate': 'success'},
                headers=self._h(self.provider_token)
            )
            self.assertEqual(res.status_code, 403,
                "Provider should not be able to make payments")
        finally:
            self._delete_booking(bid)

    # ==================================================================
    # TEST 10 – Admin refund management + duplicate prevention
    # ==================================================================
    def test_10_admin_refund_and_duplicate_prevention(self):
        bid = self._create_test_booking(status='accepted', agreed_price=600.00)
        try:
            # Create a partially-paid state via advance
            self.client.post(
                f'/api/payments/booking/{bid}/advance',
                json={'simulate': 'success'},
                headers=self._h(self.customer_token)
            )

            # Get the payment id
            with self.app.app_context():
                payment = Payment.query.filter_by(booking_id=bid).first()
                self.assertIsNotNone(payment)
                pid = payment.id

            # Admin issues refund
            res = self.client.patch(
                f'/api/admin/payments/{pid}/refund',
                json={'reason': 'Booking cancelled by admin for testing.'},
                headers=self._h(self.admin_token)
            )
            self.assertEqual(res.status_code, 200)
            data = json.loads(res.data)
            self.assertTrue(data['success'])
            self.assertEqual(data['payment']['payment_status'], 'refunded')
            self.assertEqual(data['payment']['refund_reason'], 'Booking cancelled by admin for testing.')

            # Duplicate refund attempt
            res2 = self.client.patch(
                f'/api/admin/payments/{pid}/refund',
                json={'reason': 'Second refund attempt'},
                headers=self._h(self.admin_token)
            )
            self.assertEqual(res2.status_code, 409,
                "Duplicate refund should return 409 Conflict")

        finally:
            self._delete_booking(bid)

    # ==================================================================
    # TEST 10b – Non-admin cannot call refund endpoint
    # ==================================================================
    def test_10b_non_admin_cannot_refund(self):
        bid = self._create_test_booking(status='accepted', agreed_price=300.00)
        try:
            # Create payment
            self.client.post(
                f'/api/payments/booking/{bid}/advance',
                json={'simulate': 'success'},
                headers=self._h(self.customer_token)
            )
            with self.app.app_context():
                payment = Payment.query.filter_by(booking_id=bid).first()
                pid = payment.id if payment else 999

            # Customer tries to refund
            res = self.client.patch(
                f'/api/admin/payments/{pid}/refund',
                json={'reason': 'Unauthorized refund attempt'},
                headers=self._h(self.customer_token)
            )
            self.assertIn(res.status_code, [401, 403],
                "Customer should not be able to call admin refund endpoint")
        finally:
            self._delete_booking(bid)

    # ==================================================================
    # TEST 11 – GET payment info (customer and provider can view)
    # ==================================================================
    def test_11_get_payment_accessible_by_parties(self):
        bid = self._create_test_booking(status='accepted', agreed_price=750.00)
        try:
            # Customer view
            res_c = self.client.get(
                f'/api/payments/booking/{bid}',
                headers=self._h(self.customer_token)
            )
            self.assertEqual(res_c.status_code, 200)
            d_c = json.loads(res_c.data)
            self.assertTrue(d_c['success'])
            self.assertAlmostEqual(d_c['payment']['total_amount'], 750.00, places=2)

            # Provider view
            res_p = self.client.get(
                f'/api/payments/booking/{bid}',
                headers=self._h(self.provider_token)
            )
            self.assertEqual(res_p.status_code, 200)

            # Admin view
            res_a = self.client.get(
                f'/api/payments/booking/{bid}',
                headers=self._h(self.admin_token)
            )
            self.assertEqual(res_a.status_code, 200)
        finally:
            self._delete_booking(bid)

    # ==================================================================
    # TEST 12 – Admin payment list returns stats
    # ==================================================================
    def test_12_admin_payment_list_stats(self):
        res = self.client.get(
            '/api/admin/payments',
            headers=self._h(self.admin_token)
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        self.assertIn('stats', data)
        stats = data['stats']
        for key in ['total_records', 'total_collected', 'pending_balances',
                    'fully_paid_count', 'refunded_count']:
            self.assertIn(key, stats, f"Stats should include '{key}'")

    # ==================================================================
    # TEST 13 – Refund requires a reason
    # ==================================================================
    def test_13_refund_requires_reason(self):
        bid = self._create_test_booking(status='accepted', agreed_price=400.00)
        try:
            self.client.post(
                f'/api/payments/booking/{bid}/advance',
                json={'simulate': 'success'},
                headers=self._h(self.customer_token)
            )
            with self.app.app_context():
                payment = Payment.query.filter_by(booking_id=bid).first()
                pid = payment.id

            res = self.client.patch(
                f'/api/admin/payments/{pid}/refund',
                json={'reason': ''},          # empty reason
                headers=self._h(self.admin_token)
            )
            self.assertEqual(res.status_code, 400)
            data = json.loads(res.data)
            self.assertFalse(data['success'])
        finally:
            self._delete_booking(bid)


if __name__ == '__main__':
    unittest.main(verbosity=2)
