"""
Stage 6 Task 5 – Admin Operations Tests
Tests:
1. Admin Booking Management (listing, pagination, search, status/issue filtering, detail view, safe administrative status correction with mandatory reason, audit logging, no destructive deletion).
2. Review Moderation (listing, status filters, approve, remove with reason, restore, soft-removal preservation, audit logging).
3. No-Show Management (listing, confirm, dismiss with mandatory reason, duplicate action prevention with 409, no ML trust tampering, audit logging).
4. Platform Overview Stats & Metrics (live booking breakdown, review metrics, pending no-shows, recent audit activity).
5. Unified Audit Log (action and target_type filtering, pagination).
"""
import unittest
import json
import time
from datetime import datetime, date, time as dtime
from app import create_app
from models.schema_models import (
    db, User, Booking, Review, ProviderProfile,
    ProviderNoShow, AdminAuditLog, TrustMetric
)


def get_token(client, email, password):
    res = client.post(
        '/api/auth/login',
        json={'email': email, 'password': password},
        content_type='application/json'
    )
    data = json.loads(res.data)
    return data.get('token')


class TestAdminOperations(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.app, _ = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()

        cls.admin_token = get_token(cls.client, 'admin@trustnear.com', 'AdminPass123')
        cls.customer_token = get_token(cls.client, 'alice@example.com', 'Password123')
        cls.provider_token = get_token(cls.client, 'ramesh.electrician@example.com', 'ProviderPass123')

        assert cls.admin_token, "Admin token required"
        assert cls.customer_token, "Customer token required"
        assert cls.provider_token, "Provider token required"

    def _admin_headers(self):
        return {'Authorization': f'Bearer {self.admin_token}'}

    def _customer_headers(self):
        return {'Authorization': f'Bearer {self.customer_token}'}

    def _provider_headers(self):
        return {'Authorization': f'Bearer {self.provider_token}'}

    def _make_booking(self):
        with self.app.app_context():
            cust = User.query.filter_by(role='customer').first()
            prov = User.query.filter_by(role='provider').first()
            b = Booking(
                customer_id=cust.id,
                provider_id=prov.id,
                service_title='Unique Test Booking',
                service_category='Electrician',
                booking_date=date.today(),
                booking_time=dtime(12, 0),
                customer_address='Test Address',
                agreed_price=350.0,
                status='accepted'
            )
            db.session.add(b)
            db.session.commit()
            return b.id, cust.id, prov.id

    # =========================================================================
    # 1. OVERVIEW STATS & OPERATIONAL METRICS
    # =========================================================================

    def test_01_stats_unauthorized(self):
        res = self.client.get('/api/admin/stats')
        self.assertEqual(res.status_code, 401)

    def test_02_stats_forbidden_for_non_admin(self):
        res = self.client.get('/api/admin/stats', headers=self._customer_headers())
        self.assertEqual(res.status_code, 403)

        res2 = self.client.get('/api/admin/stats', headers=self._provider_headers())
        self.assertEqual(res2.status_code, 403)

    def test_03_stats_success_with_live_breakdown(self):
        res = self.client.get('/api/admin/stats', headers=self._admin_headers())
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data.get('success'))
        stats = data.get('stats', {})
        self.assertIn('total_customers', stats)
        self.assertIn('total_providers', stats)
        self.assertIn('total_bookings', stats)
        self.assertIn('pending_bookings', stats)
        self.assertIn('completed_bookings', stats)
        self.assertIn('cancelled_bookings', stats)
        self.assertIn('total_reviews', stats)
        self.assertIn('flagged_reviews_count', stats)
        self.assertIn('approved_reviews_count', stats)
        self.assertIn('removed_reviews_count', stats)
        self.assertIn('pending_no_shows_count', stats)
        self.assertIn('recent_activity', data)

    # =========================================================================
    # 2. ADMIN BOOKING MANAGEMENT
    # =========================================================================

    def test_04_bookings_list_auth_guards(self):
        res = self.client.get('/api/admin/bookings')
        self.assertEqual(res.status_code, 401)

        res2 = self.client.get('/api/admin/bookings', headers=self._customer_headers())
        self.assertEqual(res2.status_code, 403)

    def test_05_bookings_list_success(self):
        res = self.client.get('/api/admin/bookings?page=1&limit=10', headers=self._admin_headers())
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data.get('success'))
        self.assertIn('bookings', data)
        self.assertIn('total_count', data)
        self.assertIn('total_pages', data)
        self.assertIn('stats', data)
        if len(data['bookings']) > 0:
            first = data['bookings'][0]
            self.assertIn('customer_name', first)
            self.assertIn('provider_name', first)
            self.assertIn('service_title', first)
            self.assertIn('has_no_show', first)

    def test_06_bookings_list_status_filter(self):
        res = self.client.get('/api/admin/bookings?status=completed', headers=self._admin_headers())
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        for b in data['bookings']:
            self.assertEqual(b['status'], 'completed')

    def test_07_bookings_detail_and_not_found(self):
        # 404 for invalid ID
        res_404 = self.client.get('/api/admin/bookings/99999999', headers=self._admin_headers())
        self.assertEqual(res_404.status_code, 404)

        # Find any existing booking
        with self.app.app_context():
            booking = Booking.query.first()
        if booking:
            res = self.client.get(f'/api/admin/bookings/{booking.id}', headers=self._admin_headers())
            self.assertEqual(res.status_code, 200)
            data = json.loads(res.data)
            self.assertTrue(data.get('success'))
            self.assertEqual(data['booking']['id'], booking.id)
            self.assertIn('customer', data)
            self.assertIn('provider', data)
            self.assertIn('audit_history', data)

    def test_08_booking_status_correction_validation(self):
        with self.app.app_context():
            booking = Booking.query.first()
        self.assertIsNotNone(booking)

        # Missing reason
        res = self.client.patch(
            f'/api/admin/bookings/{booking.id}/status',
            headers=self._admin_headers(),
            json={'status': 'completed', 'reason': ''}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn('reason is required', json.loads(res.data)['message'].lower())

        # Invalid status
        res2 = self.client.patch(
            f'/api/admin/bookings/{booking.id}/status',
            headers=self._admin_headers(),
            json={'status': 'unknown_status', 'reason': 'Testing invalid status'}
        )
        self.assertEqual(res2.status_code, 400)

        # Same status
        res3 = self.client.patch(
            f'/api/admin/bookings/{booking.id}/status',
            headers=self._admin_headers(),
            json={'status': booking.status, 'reason': 'Setting to same status'}
        )
        self.assertEqual(res3.status_code, 400)

    def test_09_booking_status_correction_success_and_audit(self):
        with self.app.app_context():
            # Create a test booking specifically for correction
            cust = User.query.filter_by(role='customer').first()
            prov = User.query.filter_by(role='provider').first()
            test_booking = Booking(
                customer_id=cust.id,
                provider_id=prov.id,
                service_title='Test Status Correction Service',
                service_category='Electrician',
                booking_date=date.today(),
                booking_time=dtime(10, 0),
                customer_address='123 Test Lane',
                agreed_price=500.0,
                status='pending'
            )
            db.session.add(test_booking)
            db.session.commit()
            booking_id = test_booking.id

        # Admin corrects status from pending -> in_progress
        reason_text = "Administrative override: Customer confirmed work began on time."
        res = self.client.patch(
            f'/api/admin/bookings/{booking_id}/status',
            headers=self._admin_headers(),
            json={'status': 'in_progress', 'reason': reason_text}
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data.get('success'))
        self.assertEqual(data['booking']['status'], 'in_progress')

        # Verify DB and audit log
        with self.app.app_context():
            b = Booking.query.get(booking_id)
            self.assertEqual(b.status, 'in_progress')

            log = AdminAuditLog.query.filter_by(
                target_type='booking',
                target_id=booking_id,
                action='admin_correct_booking_status'
            ).order_by(AdminAuditLog.created_at.desc()).first()
            self.assertIsNotNone(log)
            self.assertEqual(log.details.get('previous_status'), 'pending')
            self.assertEqual(log.details.get('new_status'), 'in_progress')
            self.assertEqual(log.details.get('reason'), reason_text)

    def test_10_booking_arbitrary_deletion_prohibited(self):
        # DELETE /api/admin/bookings/<id> must return 405 Method Not Allowed
        res = self.client.delete('/api/admin/bookings/1', headers=self._admin_headers())
        self.assertEqual(res.status_code, 405)

    # =========================================================================
    # 3. REVIEW MODERATION
    # =========================================================================

    def test_11_reviews_list_auth_guards(self):
        res = self.client.get('/api/admin/reviews')
        self.assertEqual(res.status_code, 401)

        res2 = self.client.get('/api/admin/reviews', headers=self._customer_headers())
        self.assertEqual(res2.status_code, 403)

    def test_12_reviews_list_success(self):
        res = self.client.get('/api/admin/reviews?status=all', headers=self._admin_headers())
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data.get('success'))
        self.assertIn('reviews', data)
        self.assertIn('stats', data)
        self.assertIn('total_count', data)

    def test_13_review_removal_requires_reason(self):
        with self.app.app_context():
            rev = Review.query.filter_by(is_deleted=False).first()
        if rev:
            res = self.client.patch(
                f'/api/admin/reviews/{rev.id}/moderate',
                headers=self._admin_headers(),
                json={'action': 'remove', 'reason': ''}
            )
            self.assertEqual(res.status_code, 400)
            self.assertIn('reason is required', json.loads(res.data)['message'].lower())

    def test_14_review_soft_removal_preserves_record_and_audits(self):
        with self.app.app_context():
            # Create a test review to moderate
            booking = Booking.query.filter_by(status='completed').first()
            if not booking:
                booking = Booking.query.first()
            
            # Delete any existing review on this booking for test isolation
            Review.query.filter_by(booking_id=booking.id).delete()
            db.session.commit()

            test_rev = Review(
                booking_id=booking.id,
                customer_id=booking.customer_id,
                provider_id=booking.provider_id,
                rating=1,
                review_text="Test malicious fraud review text for moderation verification.",
                is_suspicious=True,
                flag_reason="NLP detected extreme negative sentiment discrepancy",
                is_approved_by_admin=False,
                is_deleted=False
            )
            db.session.add(test_rev)
            db.session.commit()
            rev_id = test_rev.id

        remove_reason = "Confirmed fake competitor review with false defamatory statements."
        res = self.client.patch(
            f'/api/admin/reviews/{rev_id}/moderate',
            headers=self._admin_headers(),
            json={'action': 'remove', 'reason': remove_reason}
        )
        self.assertEqual(res.status_code, 200)

        # Check soft-deletion & record preservation
        with self.app.app_context():
            r = Review.query.get(rev_id)
            self.assertIsNotNone(r, "Review must NOT be permanently deleted from database")
            self.assertTrue(r.is_deleted)
            self.assertFalse(r.is_approved_by_admin)
            self.assertEqual(r.moderation_reason, remove_reason)

            # Audit log check
            log = AdminAuditLog.query.filter_by(
                target_type='review',
                target_id=rev_id,
                action='remove_review'
            ).first()
            self.assertIsNotNone(log)
            self.assertEqual(log.details.get('reason'), remove_reason)

        # Now test restoring the review
        res_restore = self.client.patch(
            f'/api/admin/reviews/{rev_id}/moderate',
            headers=self._admin_headers(),
            json={'action': 'restore', 'reason': 'Appealed by customer with receipt.'}
        )
        self.assertEqual(res_restore.status_code, 200)

        with self.app.app_context():
            r2 = Review.query.get(rev_id)
            self.assertFalse(r2.is_deleted)
            self.assertTrue(r2.is_approved_by_admin)

            log2 = AdminAuditLog.query.filter_by(
                target_type='review',
                target_id=rev_id,
                action='restore_review'
            ).first()
            self.assertIsNotNone(log2)

    # =========================================================================
    # 4. NO-SHOW MANAGEMENT
    # =========================================================================

    def test_15_no_shows_list_auth_guards(self):
        res = self.client.get('/api/admin/no-shows')
        self.assertEqual(res.status_code, 401)

        res2 = self.client.get('/api/admin/no-shows', headers=self._customer_headers())
        self.assertEqual(res2.status_code, 403)

    def test_16_no_shows_list_success(self):
        res = self.client.get('/api/admin/no-shows', headers=self._admin_headers())
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data.get('success'))
        self.assertIn('no_shows', data)
        self.assertIn('stats', data)

    def test_17_no_show_dismissal_requires_reason(self):
        b_id, c_id, p_id = self._make_booking()
        with self.app.app_context():
            ns = ProviderNoShow(
                provider_id=p_id,
                booking_id=b_id,
                customer_id=c_id,
                reason="Test no show reason",
                status='reported'
            )
            db.session.add(ns)
            db.session.commit()
            ns_id = ns.id

        # Missing reason on dismiss
        res = self.client.patch(
            f'/api/admin/no-shows/{ns_id}/dismiss',
            headers=self._admin_headers(),
            json={'reason': ''}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn('reason is required', json.loads(res.data)['message'].lower())

    def test_18_no_show_confirm_and_prevent_duplicate_actions(self):
        b_id, c_id, p_id = self._make_booking()
        with self.app.app_context():
            ns = ProviderNoShow(
                provider_id=p_id,
                booking_id=b_id,
                customer_id=c_id,
                reason="Provider never arrived at service site",
                status='reported'
            )
            db.session.add(ns)
            db.session.commit()
            ns_id = ns.id

            # Check provider's ML trust metric before
            trust_before = TrustMetric.query.filter_by(provider_id=p_id).first()
            score_before = float(trust_before.trust_score) if trust_before else None

        # Confirm no-show
        res = self.client.patch(
            f'/api/admin/no-shows/{ns_id}/confirm',
            headers=self._admin_headers()
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data.get('success'))
        self.assertEqual(data['report']['status'], 'confirmed')

        # Check DB status and audit log
        with self.app.app_context():
            rec = ProviderNoShow.query.get(ns_id)
            self.assertEqual(rec.status, 'confirmed')

            log = AdminAuditLog.query.filter_by(
                target_type='no_show',
                target_id=ns_id,
                action='confirm_no_show'
            ).first()
            self.assertIsNotNone(log)

            # ML Trust Score must NOT be modified by no-show confirmation
            trust_after = TrustMetric.query.filter_by(provider_id=p_id).first()
            score_after = float(trust_after.trust_score) if trust_after else None
            if score_before is not None and score_after is not None:
                self.assertEqual(score_before, score_after, "ML Trust Score must not be directly altered by no-shows")

        # Duplicate confirmation must return 409 Conflict
        res_dup = self.client.patch(
            f'/api/admin/no-shows/{ns_id}/confirm',
            headers=self._admin_headers()
        )
        self.assertEqual(res_dup.status_code, 409)

        # Trying to dismiss an already-confirmed report must also return 409 Conflict
        res_conflict = self.client.patch(
            f'/api/admin/no-shows/{ns_id}/dismiss',
            headers=self._admin_headers(),
            json={'reason': 'Trying to dismiss confirmed'}
        )
        self.assertEqual(res_conflict.status_code, 409)

    def test_19_no_show_dismiss_and_prevent_duplicate_actions(self):
        b_id, c_id, p_id = self._make_booking()
        with self.app.app_context():
            ns = ProviderNoShow(
                provider_id=p_id,
                booking_id=b_id,
                customer_id=c_id,
                reason="Provider was 5 minutes late",
                status='reported'
            )
            db.session.add(ns)
            db.session.commit()
            ns_id = ns.id

        dismiss_reason = "Provider arrived within 5 minute grace period with client agreement."
        res = self.client.patch(
            f'/api/admin/no-shows/{ns_id}/dismiss',
            headers=self._admin_headers(),
            json={'reason': dismiss_reason}
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data.get('success'))
        self.assertEqual(data['report']['status'], 'dismissed')

        with self.app.app_context():
            rec = ProviderNoShow.query.get(ns_id)
            self.assertEqual(rec.status, 'dismissed')

            log = AdminAuditLog.query.filter_by(
                target_type='no_show',
                target_id=ns_id,
                action='dismiss_no_show'
            ).first()
            self.assertIsNotNone(log)
            self.assertEqual(log.details.get('reason'), dismiss_reason)

        # Duplicate dismiss returns 409
        res_dup = self.client.patch(
            f'/api/admin/no-shows/{ns_id}/dismiss',
            headers=self._admin_headers(),
            json={'reason': 'Dismiss again'}
        )
        self.assertEqual(res_dup.status_code, 409)

    # =========================================================================
    # 5. UNIFIED AUDIT LOGS
    # =========================================================================

    def test_20_audit_logs_auth_guards(self):
        res = self.client.get('/api/admin/audit-logs')
        self.assertEqual(res.status_code, 401)

        res2 = self.client.get('/api/admin/audit-logs', headers=self._customer_headers())
        self.assertEqual(res2.status_code, 403)

    def test_21_audit_logs_pagination_and_filtering(self):
        res = self.client.get('/api/admin/audit-logs?page=1&limit=10', headers=self._admin_headers())
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data.get('success'))
        self.assertIn('audit_logs', data)
        self.assertIn('total_count', data)
        self.assertIn('page', data)
        self.assertIn('limit', data)

        # Test filter by target_type
        res_booking = self.client.get('/api/admin/audit-logs?target_type=booking', headers=self._admin_headers())
        self.assertEqual(res_booking.status_code, 200)
        data_b = json.loads(res_booking.data)
        for log in data_b['audit_logs']:
            self.assertEqual(log['target_type'], 'booking')


if __name__ == '__main__':
    unittest.main()
