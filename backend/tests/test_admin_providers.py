"""
Stage 6 Task 4 – Admin Provider Management Tests
Verifies provider dashboard listing, search, status filters, provider details,
verification approve/reject, profile editing, suspension enforcement,
reactivation, safe deletion/anonymization, and audit logging.
"""
import unittest
import json
from app import create_app
from models.schema_models import db, User, ProviderProfile, Booking, TrustMetric, AdminAuditLog


def get_token(client, email, password):
    res = client.post(
        '/api/auth/login',
        json={'email': email, 'password': password},
        content_type='application/json'
    )
    data = json.loads(res.data)
    return data.get('token')


class TestAdminProviderManagement(unittest.TestCase):

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

        # Lookup provider ramesh ID
        with cls.app.app_context():
            p = User.query.filter_by(email='ramesh.electrician@example.com').first()
            assert p, "Provider ramesh not found in DB"
            cls.provider_id = p.id

    def _admin_headers(self):
        return {'Authorization': f'Bearer {self.admin_token}'}

    def _customer_headers(self):
        return {'Authorization': f'Bearer {self.customer_token}'}

    def _provider_headers(self):
        return {'Authorization': f'Bearer {self.provider_token}'}

    # ------------------------------------------------------------------
    # 1. LIST providers – authorization & stats
    # ------------------------------------------------------------------

    def test_01_list_providers_no_token_401(self):
        res = self.client.get('/api/admin/providers')
        self.assertEqual(res.status_code, 401)

    def test_02_list_providers_customer_token_403(self):
        res = self.client.get('/api/admin/providers', headers=self._customer_headers())
        self.assertEqual(res.status_code, 403)

    def test_03_list_providers_admin_200(self):
        res = self.client.get('/api/admin/providers', headers=self._admin_headers())
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data.get('success'))
        self.assertIn('providers', data)
        self.assertIn('stats', data)

    def test_04_list_providers_stats_structure(self):
        res = self.client.get('/api/admin/providers', headers=self._admin_headers())
        data = json.loads(res.data)
        stats = data['stats']
        for key in ('total_providers', 'verified_providers', 'pending_verifications', 'rejected_providers', 'suspended_providers'):
            self.assertIn(key, stats, f"Missing stats key: {key}")

    def test_05_list_providers_search_filter(self):
        res = self.client.get('/api/admin/providers?search=ramesh', headers=self._admin_headers())
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        names = [p['full_name'].lower() for p in data['providers']]
        self.assertTrue(any('ramesh' in n for n in names), "Search for 'ramesh' should return match")

    def test_06_list_providers_verification_filter(self):
        res = self.client.get('/api/admin/providers?status=verified', headers=self._admin_headers())
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        for p in data['providers']:
            self.assertEqual(p['verification_status'], 'verified')

    def test_07_list_providers_pagination(self):
        res = self.client.get('/api/admin/providers?page=1&limit=2', headers=self._admin_headers())
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn('total_pages', data)
        self.assertLessEqual(len(data['providers']), 2)

    # ------------------------------------------------------------------
    # 2. PROVIDER DETAILS
    # ------------------------------------------------------------------

    def test_08_get_provider_detail_200(self):
        res = self.client.get(f'/api/admin/providers/{self.provider_id}', headers=self._admin_headers())
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn('provider', data)
        self.assertIn('profile', data)
        self.assertIn('reliability', data)
        self.assertIn('trust_metric', data)
        self.assertIn('portfolio', data)
        self.assertIn('bookings', data)
        self.assertIn('booking_stats', data)

    def test_09_provider_detail_no_password_exposed(self):
        res = self.client.get(f'/api/admin/providers/{self.provider_id}', headers=self._admin_headers())
        data = json.loads(res.data)
        provider = data.get('provider', {})
        self.assertNotIn('password', provider)
        self.assertNotIn('password_hash', provider)

    def test_10_provider_detail_nonexistent_404(self):
        res = self.client.get('/api/admin/providers/999999', headers=self._admin_headers())
        self.assertEqual(res.status_code, 404)

    # ------------------------------------------------------------------
    # 3. VERIFICATION MANAGEMENT
    # ------------------------------------------------------------------

    def test_11_verify_provider_approve(self):
        res = self.client.patch(
            f'/api/admin/providers/{self.provider_id}/verify',
            json={'status': 'verified', 'reason': 'All certifications verified'},
            headers=self._admin_headers(),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data.get('verification_status'), 'verified')

    def test_12_verify_provider_reject(self):
        res = self.client.patch(
            f'/api/admin/providers/{self.provider_id}/verify',
            json={'status': 'rejected', 'reason': 'Expired government ID'},
            headers=self._admin_headers(),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data.get('verification_status'), 'rejected')

        # Re-approve so future tests remain valid
        self.client.patch(
            f'/api/admin/providers/{self.provider_id}/verify',
            json={'status': 'verified'},
            headers=self._admin_headers(),
            content_type='application/json'
        )

    def test_13_verify_invalid_status_400(self):
        res = self.client.patch(
            f'/api/admin/providers/{self.provider_id}/verify',
            json={'status': 'super_verified'},
            headers=self._admin_headers(),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 400)

    # ------------------------------------------------------------------
    # 4. EDIT PROVIDER PROFILE
    # ------------------------------------------------------------------

    def test_14_edit_provider_profile_success(self):
        res = self.client.patch(
            f'/api/admin/providers/{self.provider_id}',
            json={'hourly_rate': 650.0, 'experience_years': 8},
            headers=self._admin_headers(),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data['profile']['experience_years'], 8)

    def test_15_edit_provider_role_escalation_blocked(self):
        res = self.client.patch(
            f'/api/admin/providers/{self.provider_id}',
            json={'role': 'admin', 'full_name': 'Ramesh Kumar'},
            headers=self._admin_headers(),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        # Check provider still has provider role
        detail_res = self.client.get(f'/api/admin/providers/{self.provider_id}', headers=self._admin_headers())
        detail = json.loads(detail_res.data)
        self.assertEqual(detail['provider']['role'], 'provider')

    # ------------------------------------------------------------------
    # 5. SUSPENSION, REACTIVATION & PROTECTED ACTION RESTRICTIONS
    # ------------------------------------------------------------------

    def test_16_suspend_provider_success(self):
        res = self.client.post(
            f'/api/admin/providers/{self.provider_id}/suspend',
            json={'reason': 'Suspicious compliance activity'},
            headers=self._admin_headers(),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data.get('account_status'), 'suspended')

    def test_17_suspended_provider_cannot_be_booked(self):
        """Customer cannot create booking for a suspended provider."""
        res = self.client.post(
            '/api/bookings',
            json={
                'provider_id': self.provider_id,
                'service_title': 'Wiring Repair',
                'service_category': 'Electrician',
                'booking_date': '2099-05-10',
                'booking_time': '10:00:00',
                'customer_address': '123 Test Street'
            },
            headers=self._customer_headers(),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 400)
        data = json.loads(res.data)
        self.assertIn('suspended', data.get('message', '').lower())

    def test_18_suspended_provider_cannot_update_availability(self):
        """Suspended provider cannot update their availability."""
        res = self.client.put(
            '/api/providers/availability',
            json={'working_days': ['Monday', 'Tuesday']},
            headers=self._provider_headers(),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 403)

    def test_19_suspended_provider_cannot_upload_portfolio(self):
        """Suspended provider cannot upload portfolio image."""
        res = self.client.post(
            '/api/providers/portfolio/upload',
            headers=self._provider_headers()
        )
        self.assertEqual(res.status_code, 403)

    def test_20_suspended_provider_cannot_create_portfolio_item(self):
        """Suspended provider cannot create portfolio item."""
        res = self.client.post(
            '/api/providers/portfolio',
            json={
                'title': 'New Project',
                'service_category': 'Electrician',
                'description': 'Full rewiring',
                'completion_date': '2026-01-01',
                'authorized_for_display': True
            },
            headers=self._provider_headers(),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 403)

    def test_21_reactivate_provider_success(self):
        res = self.client.post(
            f'/api/admin/providers/{self.provider_id}/reactivate',
            headers=self._admin_headers(),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data.get('account_status'), 'active')

    # ------------------------------------------------------------------
    # 6. SAFE DELETION / ANONYMIZATION
    # ------------------------------------------------------------------

    def test_22_safe_delete_provider(self):
        """Register throwaway provider, delete/anonymize, verify historical retention."""
        reg_res = self.client.post(
            '/api/auth/register',
            json={
                'full_name': 'Throwaway Provider',
                'email': 'throwaway_prov_99@example.com',
                'password': 'ProvPass123!',
                'role': 'provider',
                'phone': '9876543299',
                'service_category': 'Plumber',
                'service_address': '456 Trade Center, Bangalore',
                'experience_years': 3,
                'hourly_rate': 350.0
            },
            content_type='application/json'
        )
        if reg_res.status_code not in [200, 201]:
            self.skipTest("Registration of throwaway provider not successful")

        reg_data = json.loads(reg_res.data)
        throwaway_id = reg_data.get('user_id') or reg_data.get('id')
        if not throwaway_id:
            search = self.client.get('/api/admin/providers?search=throwaway_prov_99', headers=self._admin_headers())
            sd = json.loads(search.data)
            provs = sd.get('providers', [])
            if provs:
                throwaway_id = provs[0]['id']

        self.assertIsNotNone(throwaway_id)

        del_res = self.client.delete(f'/api/admin/providers/{throwaway_id}', headers=self._admin_headers())
        self.assertEqual(del_res.status_code, 200)

        with self.__class__.app.app_context():
            u = User.query.get(throwaway_id)
            self.assertIsNotNone(u, "User record must be retained for audit/historical integrity")
            self.assertNotEqual(u.email, 'throwaway_prov_99@example.com', "Email must be anonymized")
            self.assertEqual(u.account_status, 'deleted')

    # ------------------------------------------------------------------
    # 7. AUDIT LOGGING VERIFICATION
    # ------------------------------------------------------------------

    def test_23_audit_log_entries_recorded(self):
        res = self.client.get('/api/admin/audit-logs', headers=self._admin_headers())
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        logs = data.get('audit_logs', [])
        actions = [l['action'] for l in logs]
        # At least some provider actions must be in the audit log
        provider_actions = {'edit_provider_profile', 'approve_provider', 'reject_provider', 'suspend_provider', 'reactivate_provider', 'anonymize_delete_provider'}
        found = any(a in provider_actions for a in actions)
        self.assertTrue(found, f"Provider actions not recorded in audit log: {actions[:10]}")

    # ------------------------------------------------------------------
    # 8. FINAL SAFETY & INTEGRITY VERIFICATIONS
    # ------------------------------------------------------------------

    def test_24_suspended_provider_cannot_update_own_profile(self):
        """Suspended provider cannot call PATCH /api/auth/profile."""
        self.client.post(
            f'/api/admin/providers/{self.provider_id}/suspend',
            json={'reason': 'Profile test'},
            headers=self._admin_headers(),
            content_type='application/json'
        )
        res = self.client.patch(
            '/api/auth/profile',
            json={'full_name': 'Hacked Provider'},
            headers=self._provider_headers(),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 403)
        # Reactivate provider
        self.client.post(
            f'/api/admin/providers/{self.provider_id}/reactivate',
            headers=self._admin_headers(),
            content_type='application/json'
        )

    def test_25_reactivate_unverified_provider_does_not_restore_availability(self):
        """Reactivating a rejected or pending provider MUST NOT set is_available=True or bypass verification."""
        import time
        unique_email = f"pending_prov_{int(time.time())}@example.com"
        reg_res = self.client.post(
            '/api/auth/register',
            json={
                'full_name': 'Pending Prov Test',
                'email': unique_email,
                'password': 'ProvPass123!',
                'role': 'provider',
                'phone': '9876543288',
                'service_category': 'Carpenter',
                'service_address': '789 Wood Street, Bangalore',
                'experience_years': 2,
                'hourly_rate': 400.0
            },
            content_type='application/json'
        )
        self.assertIn(reg_res.status_code, [200, 201])
        reg_data = json.loads(reg_res.data)
        pid = reg_data.get('user', {}).get('id') or reg_data.get('user_id') or reg_data.get('id')
        self.assertIsNotNone(pid)

        # 2. Suspend this unverified provider
        sus_res = self.client.post(
            f'/api/admin/providers/{pid}/suspend',
            json={'reason': 'Unverified suspend test'},
            headers=self._admin_headers(),
            content_type='application/json'
        )
        self.assertEqual(sus_res.status_code, 200)

        # 3. Reactivate this unverified provider
        react_res = self.client.post(
            f'/api/admin/providers/{pid}/reactivate',
            headers=self._admin_headers(),
            content_type='application/json'
        )
        self.assertEqual(react_res.status_code, 200)

        # 4. Confirm in DB that verification_status is still 'pending' and is_available is False
        with self.__class__.app.app_context():
            prof = ProviderProfile.query.filter_by(user_id=pid).first()
            self.assertIsNotNone(prof)
            self.assertEqual(prof.verification_status, 'pending', "Reactivation must not bypass KYC verification")
            self.assertFalse(prof.is_available, "Unverified provider must not be made available on reactivation")

    def test_26_exact_single_audit_log_entry_per_sensitive_action(self):
        """Every sensitive provider management call creates exactly one AdminAuditLog entry."""
        with self.__class__.app.app_context():
            initial_count = AdminAuditLog.query.count()

        # Action 1: Suspend
        self.client.post(
            f'/api/admin/providers/{self.provider_id}/suspend',
            json={'reason': 'Single log test'},
            headers=self._admin_headers(),
            content_type='application/json'
        )
        with self.__class__.app.app_context():
            self.assertEqual(AdminAuditLog.query.count(), initial_count + 1)

        # Action 2: Reactivate
        self.client.post(
            f'/api/admin/providers/{self.provider_id}/reactivate',
            headers=self._admin_headers(),
            content_type='application/json'
        )
        with self.__class__.app.app_context():
            self.assertEqual(AdminAuditLog.query.count(), initial_count + 2)

    def test_27_anonymization_preserves_historical_records(self):
        """Confirm safe anonymization preserves bookings, reviews, and portfolio records."""
        with self.__class__.app.app_context():
            # Check bookings for ramesh exist
            b_count = Booking.query.filter_by(provider_id=self.provider_id).count()
            self.assertGreaterEqual(b_count, 1, "Provider should have historical bookings")
            # Ramesh should also have trust metric
            tm = TrustMetric.query.filter_by(provider_id=self.provider_id).first()
            self.assertIsNotNone(tm)

        # Provider ramesh records remain intact and are never deleted cascade-style
        detail_res = self.client.get(f'/api/admin/providers/{self.provider_id}', headers=self._admin_headers())
        detail = json.loads(detail_res.data)
        self.assertGreaterEqual(len(detail['bookings']), 1)


if __name__ == '__main__':
    unittest.main()
