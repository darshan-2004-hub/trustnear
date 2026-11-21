import unittest
import json
import io
from datetime import datetime, date, time, timezone, timedelta
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from models.schema_models import (
    db, User, ProviderProfile, Booking, TrustMetric, Review,
    ProviderPortfolio, ProviderAvailability, ProviderNoShow
)
from routes.provider_routes import calculate_provider_reliability, IST
import jwt

class Stage5FeaturesTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app, cls.socketio = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()

    def _generate_token(self, user):
        payload = {
            'user_id': user.id,
            'role': user.role,
            'exp': (datetime.now(timezone.utc) + timedelta(hours=2)).timestamp()
        }
        return jwt.encode(payload, self.app.config['JWT_SECRET_KEY'], algorithm='HS256')

    def setUp(self):
        with self.app.app_context():
            providers = User.query.filter_by(role='provider').all()
            if len(providers) < 2:
                self.skipTest("Need at least 2 providers in DB for full isolation testing.")
            self.provider_a = providers[0]
            self.provider_b = providers[1]

            customers = User.query.filter_by(role='customer').all()
            if len(customers) < 2:
                self.skipTest("Need at least 2 customers in DB for concurrency testing.")
            self.customer_a = customers[0]
            self.customer_b = customers[1]

            self.token_provider_a = self._generate_token(self.provider_a)
            self.token_provider_b = self._generate_token(self.provider_b)
            self.token_customer_a = self._generate_token(self.customer_a)
            self.token_customer_b = self._generate_token(self.customer_b)

    def test_01_portfolio_crud(self):
        """Task 1: Provider portfolio create, read, update, and delete with authorization flag."""
        headers = {'Authorization': f'Bearer {self.token_provider_a}'}

        # 1. Create portfolio entry
        payload = {
            'title': 'Master Bathroom Remodel',
            'service_category': 'Plumbing',
            'description': 'Full copper piping replacement and custom shower valve installation.',
            'completion_date': '2026-04-10',
            'authorized_for_display': True,
            'before_image_url': '/api/uploads/portfolio/test_before.jpg',
            'after_image_url': '/api/uploads/portfolio/test_after.jpg'
        }
        res = self.client.post('/api/providers/portfolio', json=payload, headers=headers)
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        item_id = data['portfolio_item']['id']
        self.assertEqual(data['portfolio_item']['title'], 'Master Bathroom Remodel')

        # 2. Public Read
        res_get = self.client.get(f'/api/providers/{self.provider_a.id}/portfolio')
        self.assertEqual(res_get.status_code, 200)
        get_data = json.loads(res_get.data)
        self.assertTrue(get_data['success'])
        item_ids = [item['id'] for item in get_data['portfolio']]
        self.assertIn(item_id, item_ids)

        # 3. Update entry
        res_put = self.client.put(f'/api/providers/portfolio/{item_id}', json={
            'title': 'Master Bathroom Remodel - Premium',
            'description': 'Updated description with premium chrome fittings.'
        }, headers=headers)
        self.assertEqual(res_put.status_code, 200)
        put_data = json.loads(res_put.data)
        self.assertEqual(put_data['portfolio_item']['title'], 'Master Bathroom Remodel - Premium')

        # 4. Delete entry
        res_del = self.client.delete(f'/api/providers/portfolio/{item_id}', headers=headers)
        self.assertEqual(res_del.status_code, 200)

        # Verify no longer returned
        res_verify = self.client.get(f'/api/providers/{self.provider_a.id}/portfolio')
        verify_ids = [i['id'] for i in json.loads(res_verify.data)['portfolio']]
        self.assertNotIn(item_id, verify_ids)

    def test_02_provider_isolation(self):
        """Task 1 & Task 6: Provider B cannot update or delete Provider A's portfolio."""
        headers_a = {'Authorization': f'Bearer {self.token_provider_a}'}
        headers_b = {'Authorization': f'Bearer {self.token_provider_b}'}

        res = self.client.post('/api/providers/portfolio', json={
            'title': 'Isolation Test Entry',
            'service_category': 'Electrical',
            'description': 'Testing cross-provider access boundaries.',
            'completion_date': '2026-05-01',
            'authorized_for_display': True
        }, headers=headers_a)
        self.assertEqual(res.status_code, 201)
        item_id = json.loads(res.data)['portfolio_item']['id']

        try:
            # Provider B tries to update Provider A's entry
            res_bad_update = self.client.put(f'/api/providers/portfolio/{item_id}', json={
                'title': 'Hacked Title'
            }, headers=headers_b)
            self.assertEqual(res_bad_update.status_code, 403)

            # Provider B tries to delete Provider A's entry
            res_bad_delete = self.client.delete(f'/api/providers/portfolio/{item_id}', headers=headers_b)
            self.assertEqual(res_bad_delete.status_code, 403)
        finally:
            # Clean up
            self.client.delete(f'/api/providers/portfolio/{item_id}', headers=headers_a)

    def test_03_image_upload_validation(self):
        """Task 1: Secure upload rejects invalid file extensions and oversized files."""
        headers_prov = {'Authorization': f'Bearer {self.token_provider_a}'}
        headers_cust = {'Authorization': f'Bearer {self.token_customer_a}'}

        # 1. Customer cannot upload to provider portfolio
        res_cust = self.client.post('/api/providers/portfolio/upload', data={
            'file': (io.BytesIO(b'dummy'), 'test.jpg')
        }, headers=headers_cust, content_type='multipart/form-data')
        self.assertEqual(res_cust.status_code, 403)

        # 2. Reject unsupported extension
        res_bad_ext = self.client.post('/api/providers/portfolio/upload', data={
            'file': (io.BytesIO(b'malicious code'), 'script.sh')
        }, headers=headers_prov, content_type='multipart/form-data')
        self.assertEqual(res_bad_ext.status_code, 400)

        # 3. Reject spoofed extension with invalid magic byte binary content
        res_spoofed = self.client.post('/api/providers/portfolio/upload', data={
            'file': (io.BytesIO(b'#!/bin/bash\necho bad_script'), 'photo.jpg')
        }, headers=headers_prov, content_type='multipart/form-data')
        self.assertEqual(res_spoofed.status_code, 400)
        self.assertIn('signature', json.loads(res_spoofed.data)['message'].lower())

        # 4. Reject file > 5MB
        big_content = b'0' * (5 * 1024 * 1024 + 1024)
        res_oversized = self.client.post('/api/providers/portfolio/upload', data={
            'file': (io.BytesIO(big_content), 'huge.png')
        }, headers=headers_prov, content_type='multipart/form-data')
        self.assertEqual(res_oversized.status_code, 400)

        # 5. Valid PNG image (valid magic bytes) succeeds
        res_valid_png = self.client.post('/api/providers/portfolio/upload', data={
            'file': (io.BytesIO(b'\x89PNG\r\n\x1a\n' + b'fake image data'), 'sample.png')
        }, headers=headers_prov, content_type='multipart/form-data')
        self.assertEqual(res_valid_png.status_code, 201)
        data_png = json.loads(res_valid_png.data)
        self.assertTrue(data_png['success'])
        self.assertTrue(data_png['image_url'].startswith('/api/uploads/portfolio/'))

        # 6. Valid JPEG image (valid magic bytes) succeeds
        res_valid_jpg = self.client.post('/api/providers/portfolio/upload', data={
            'file': (io.BytesIO(b'\xff\xd8\xff' + b'valid_jpeg_binary_stream'), 'sample.jpg')
        }, headers=headers_prov, content_type='multipart/form-data')
        self.assertEqual(res_valid_jpg.status_code, 201)
        data_jpg = json.loads(res_valid_jpg.data)
        self.assertTrue(data_jpg['success'])
        self.assertTrue(data_jpg['image_url'].startswith('/api/uploads/portfolio/'))

    def test_04_provider_availability_save_and_retrieve(self):
        """Task 2: Provider can save availability and retrieve slots."""
        headers = {'Authorization': f'Bearer {self.token_provider_a}'}

        update_payload = {
            'working_days': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            'daily_start_time': '09:00',
            'daily_end_time': '17:00',
            'slot_duration_minutes': 60,
            'unavailable_dates': ['2026-12-25'],
            'is_accepting_bookings': True
        }
        res = self.client.put('/api/providers/availability', json=update_payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['availability']['slot_duration_minutes'], 60)

        # Public retrieval
        res_get = self.client.get(f'/api/providers/{self.provider_a.id}/availability')
        self.assertEqual(res_get.status_code, 200)
        get_data = json.loads(res_get.data)
        self.assertEqual(get_data['availability']['daily_start_time'], '09:00')
        self.assertEqual(get_data['availability']['daily_end_time'], '17:00')

    def test_05_slot_generation_no_past_slots(self):
        """Task 2: Past dates and past slots are not offered."""
        # 1. Past date returns empty slots
        res_past = self.client.get(f'/api/providers/{self.provider_a.id}/slots?date=2020-01-01')
        self.assertEqual(res_past.status_code, 200)
        data = json.loads(res_past.data)
        self.assertEqual(len(data['slots']), 0)

        # 2. Future date returns valid working slots
        future_date = (datetime.now(IST).date() + timedelta(days=10))
        # Ensure it's a weekday
        while future_date.strftime('%A') not in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']:
            future_date += timedelta(days=1)

        date_str = future_date.strftime('%Y-%m-%d')
        res_future = self.client.get(f'/api/providers/{self.provider_a.id}/slots?date={date_str}')
        self.assertEqual(res_future.status_code, 200)
        fut_data = json.loads(res_future.data)
        self.assertTrue(fut_data['is_working_day'])
        self.assertGreater(len(fut_data['slots']), 0)
        self.assertTrue(any(s['available'] for s in fut_data['slots']))

    def test_06_booking_outside_availability_rejected(self):
        """Task 2 & 3: Booking outside working days, hours or on holiday is rejected."""
        headers = {'Authorization': f'Bearer {self.token_customer_a}'}

        # Find next Sunday
        target_date = datetime.now(IST).date() + timedelta(days=1)
        while target_date.strftime('%A') != 'Sunday':
            target_date += timedelta(days=1)

        # Provider A only works Mon-Fri from test_04
        bad_booking = {
            'provider_id': self.provider_a.id,
            'service_title': 'Sunday Plumbing Fix',
            'service_category': 'Plumbing',
            'booking_date': target_date.strftime('%Y-%m-%d'),
            'booking_time': '10:00',
            'customer_address': '123 Main Street, Mangaluru'
        }
        res = self.client.post('/api/bookings', json=bad_booking, headers=headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn('Provider does not operate on Sundays', json.loads(res.data)['message'])

    def test_07_slot_conflict_prevention_409(self):
        """Task 3: Concurrent overlapping bookings return 409 Conflict."""
        headers_cust_a = {'Authorization': f'Bearer {self.token_customer_a}'}
        headers_cust_b = {'Authorization': f'Bearer {self.token_customer_b}'}

        # Choose a safe future working day
        future_date = datetime.now(IST).date() + timedelta(days=15)
        while future_date.strftime('%A') not in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']:
            future_date += timedelta(days=1)
        date_str = future_date.strftime('%Y-%m-%d')

        booking_payload = {
            'provider_id': self.provider_a.id,
            'service_title': 'Emergency Leak Repair',
            'service_category': 'Plumbing',
            'booking_date': date_str,
            'booking_time': '11:00',
            'end_time': '12:00',
            'customer_address': 'Bunder, Mangaluru',
            'agreed_price': 500
        }

        # First booking succeeds
        res1 = self.client.post('/api/bookings', json=booking_payload, headers=headers_cust_a)
        self.assertEqual(res1.status_code, 201)
        booking1_id = json.loads(res1.data)['booking_id']

        try:
            # Second booking for the exact same slot must be rejected with 409 Conflict
            res2 = self.client.post('/api/bookings', json=booking_payload, headers=headers_cust_b)
            self.assertEqual(res2.status_code, 409)

            # Slot endpoint must reflect this slot as unavailable
            slots_res = self.client.get(f'/api/providers/{self.provider_a.id}/slots?date={date_str}')
            slots = json.loads(slots_res.data)['slots']
            booked_slot = next((s for s in slots if s['start_time'] == '11:00'), None)
            self.assertIsNotNone(booked_slot)
            self.assertFalse(booked_slot['available'])
            self.assertEqual(booked_slot['reason'], 'booked')
        finally:
            # Clean up booking1
            with self.app.app_context():
                b = Booking.query.get(booking1_id)
                if b:
                    db.session.delete(b)
                    db.session.commit()

    def test_08_cancellation_releases_slot(self):
        """Task 3: Cancellation releases the slot and records cancelled_by."""
        headers_cust_a = {'Authorization': f'Bearer {self.token_customer_a}'}
        headers_cust_b = {'Authorization': f'Bearer {self.token_customer_b}'}

        future_date = datetime.now(IST).date() + timedelta(days=20)
        while future_date.strftime('%A') not in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']:
            future_date += timedelta(days=1)
        date_str = future_date.strftime('%Y-%m-%d')

        payload = {
            'provider_id': self.provider_a.id,
            'service_title': 'Pipe Replacement',
            'service_category': 'Plumbing',
            'booking_date': date_str,
            'booking_time': '14:00',
            'end_time': '15:00',
            'customer_address': 'Kankanady, Mangaluru'
        }

        # 1. Customer A books slot
        res1 = self.client.post('/api/bookings', json=payload, headers=headers_cust_a)
        self.assertEqual(res1.status_code, 201)
        b_id = json.loads(res1.data)['booking_id']

        try:
            # 2. Customer A cancels booking
            res_cancel = self.client.patch(f'/api/bookings/{b_id}/status', json={
                'status': 'cancelled',
                'cancellation_reason': 'Changed my schedule'
            }, headers=headers_cust_a)
            self.assertEqual(res_cancel.status_code, 200)

            # Check that cancelled_by is recorded
            with self.app.app_context():
                b = Booking.query.get(b_id)
                self.assertEqual(b.cancelled_by, self.customer_a.id)

            # 3. Customer B can now book that released slot
            res2 = self.client.post('/api/bookings', json=payload, headers=headers_cust_b)
            self.assertEqual(res2.status_code, 201)
            b2_id = json.loads(res2.data)['booking_id']

            with self.app.app_context():
                b2 = Booking.query.get(b2_id)
                if b2:
                    db.session.delete(b2)
                    db.session.commit()
        finally:
            with self.app.app_context():
                b = Booking.query.get(b_id)
                if b:
                    db.session.delete(b)
                    db.session.commit()

    def test_09_booking_ownership_and_status_permissions(self):
        """Task 3 & 5: Customer cannot mark a booking accepted/completed; only provider can."""
        headers_cust_a = {'Authorization': f'Bearer {self.token_customer_a}'}

        future_date = datetime.now(IST).date() + timedelta(days=25)
        while future_date.strftime('%A') not in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']:
            future_date += timedelta(days=1)

        res = self.client.post('/api/bookings', json={
            'provider_id': self.provider_a.id,
            'service_title': 'Wiring Check',
            'service_category': 'Electrical',
            'booking_date': future_date.strftime('%Y-%m-%d'),
            'booking_time': '10:00',
            'customer_address': 'Kadri, Mangaluru'
        }, headers=headers_cust_a)
        self.assertEqual(res.status_code, 201)
        b_id = json.loads(res.data)['booking_id']

        try:
            # Customer attempts to accept own booking
            res_bad = self.client.patch(f'/api/bookings/{b_id}/status', json={'status': 'accepted'}, headers=headers_cust_a)
            self.assertEqual(res_bad.status_code, 403)
        finally:
            with self.app.app_context():
                b = Booking.query.get(b_id)
                if b:
                    db.session.delete(b)
                    db.session.commit()

    def test_10_reliability_metrics_calculation(self):
        """Task 4: Reliability calculation isolates customer cancellations & reported no-shows."""
        with self.app.app_context():
            # Test direct reliability helper function
            rel = calculate_provider_reliability(self.provider_a.id)
            self.assertIn('reliability_rate', rel)
            self.assertIn('status_label', rel)
            self.assertIn('breakdown', rel)
            self.assertIn('customer_cancellations', rel['breakdown'])
            self.assertIn('provider_cancellations', rel['breakdown'])
            self.assertIn('confirmed_no_shows', rel['breakdown'])
            self.assertIn('reported_no_shows', rel['breakdown'])

    def test_11_insufficient_history_display(self):
        """Task 4: Provider with < 3 trackable events shows 'Not enough booking history'."""
        with self.app.app_context():
            # Create a mock new provider with 0 bookings
            test_user = User(
                email=f'newprov_{datetime.utcnow().timestamp()}@example.com',
                password_hash='dummyhash',
                full_name='New Test Provider',
                role='provider'
            )
            db.session.add(test_user)
            db.session.commit()

            try:
                rel = calculate_provider_reliability(test_user.id)
                self.assertIsNone(rel['reliability_rate'])
                self.assertEqual(rel['status_label'], 'Not enough booking history')
                self.assertIn('at least 3', rel['explanation'].lower())
            finally:
                db.session.delete(test_user)
                db.session.commit()

    def test_12_concurrent_slot_booking_mutual_exclusion(self):
        """Task 3: Concurrent simultaneous booking requests for the exact same slot result in exactly 1 success (201) and 1 conflict (409)."""
        import concurrent.futures

        headers_a = {'Authorization': f'Bearer {self.token_customer_a}'}
        headers_b = {'Authorization': f'Bearer {self.token_customer_b}'}

        future_date = datetime.now(IST).date() + timedelta(days=40)
        while future_date.strftime('%A') not in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']:
            future_date += timedelta(days=1)
        date_str = future_date.strftime('%Y-%m-%d')

        payload = {
            'provider_id': self.provider_a.id,
            'service_title': 'Concurrent Wiring Test',
            'service_category': 'Electrical',
            'booking_date': date_str,
            'booking_time': '16:00',
            'end_time': '17:00',
            'customer_address': 'Mangaluru Central'
        }

        created_booking_ids = []

        def send_booking(headers):
            res = self.client.post('/api/bookings', json=payload, headers=headers)
            return res.status_code, json.loads(res.data)

        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                future1 = executor.submit(send_booking, headers_a)
                future2 = executor.submit(send_booking, headers_b)
                results = [future1.result(), future2.result()]

            statuses = [r[0] for r in results]
            for status, data in results:
                if status == 201:
                    created_booking_ids.append(data['booking_id'])

            # Exactly one request must succeed with 201, and one must receive 409 Conflict
            self.assertIn(201, statuses)
            self.assertIn(409, statuses)
        finally:
            with self.app.app_context():
                for bid in created_booking_ids:
                    b = Booking.query.get(bid)
                    if b:
                        db.session.delete(b)
                db.session.commit()

    def test_13_no_show_does_not_modify_ml_trust_score(self):
        """Task 4: Confirming a no-show updates provider reliability but does NOT alter the ML Trust Score."""
        with self.app.app_context():
            admin = User.query.filter_by(role='admin').first()
            if not admin:
                self.skipTest("No admin user in database.")
            token_admin = self._generate_token(admin)

            # Get provider's existing ML Trust Metric
            tm = TrustMetric.query.filter_by(provider_id=self.provider_a.id).first()
            original_score = float(tm.trust_score) if tm and tm.trust_score is not None else None

            # Create a mock reported no-show
            mock_booking = Booking(
                customer_id=self.customer_a.id,
                provider_id=self.provider_a.id,
                service_title='No Show Test Service',
                service_category='Plumbing',
                booking_date=datetime.now(IST).date() - timedelta(days=2),
                booking_time=time(10, 0),
                customer_address='Test St',
                status='accepted'
            )
            db.session.add(mock_booking)
            db.session.commit()

            no_show = ProviderNoShow(
                booking_id=mock_booking.id,
                customer_id=self.customer_a.id,
                provider_id=self.provider_a.id,
                reason='Provider failed to show up for scheduled slot',
                status='reported'
            )
            db.session.add(no_show)
            db.session.commit()
            ns_id = no_show.id

            try:
                # Admin confirms the no-show
                res_confirm = self.client.patch(
                    f'/api/admin/no-shows/{ns_id}/confirm',
                    headers={'Authorization': f'Bearer {token_admin}'}
                )
                self.assertEqual(res_confirm.status_code, 200)

                # Verify ML Trust Score is UNCHANGED
                tm_after = TrustMetric.query.filter_by(provider_id=self.provider_a.id).first()
                after_score = float(tm_after.trust_score) if tm_after and tm_after.trust_score is not None else None
                self.assertEqual(original_score, after_score)

                # Verify Provider Reliability reflects the confirmed no show
                rel = calculate_provider_reliability(self.provider_a.id)
                self.assertGreaterEqual(rel['breakdown']['confirmed_no_shows'], 1)
            finally:
                # Clean up
                with self.app.app_context():
                    ns = ProviderNoShow.query.get(ns_id)
                    if ns:
                        db.session.delete(ns)
                    b = Booking.query.get(mock_booking.id)
                    if b:
                        db.session.delete(b)
                    db.session.commit()

if __name__ == '__main__':
    unittest.main()
