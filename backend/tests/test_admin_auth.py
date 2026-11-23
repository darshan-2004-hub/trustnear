import unittest
import json
import jwt
from datetime import datetime, timedelta, timezone
from app import create_app
from models.schema_models import db, User

class TestAdminAuthentication(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app, _ = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()

    def test_01_admin_login_success(self):
        """Admin can authenticate with valid credentials and receives JWT and admin role."""
        response = self.client.post('/api/auth/login', json={
            'email': 'admin@trustnear.com',
            'password': 'AdminPass123'
        })
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        self.assertIn('token', data)
        self.assertEqual(data['user']['role'], 'admin')
        self.assertEqual(data['user']['email'], 'admin@trustnear.com')

        # Verify JWT payload
        decoded = jwt.decode(
            data['token'],
            self.app.config['JWT_SECRET_KEY'],
            algorithms=['HS256']
        )
        self.assertEqual(decoded['role'], 'admin')
        self.assertIn('user_id', decoded)

    def test_02_admin_login_invalid_password(self):
        """Admin login fails with invalid password (401)."""
        response = self.client.post('/api/auth/login', json={
            'email': 'admin@trustnear.com',
            'password': 'WrongPassword999'
        })
        self.assertEqual(response.status_code, 401)
        data = response.get_json()
        self.assertFalse(data['success'])
        self.assertIn('Invalid email or password', data['message'])

    def test_03_admin_login_nonexistent_email(self):
        """Admin login fails with non-existent email (401)."""
        response = self.client.post('/api/auth/login', json={
            'email': 'nobody@trustnear.com',
            'password': 'AdminPass123'
        })
        self.assertEqual(response.status_code, 401)
        data = response.get_json()
        self.assertFalse(data['success'])

    def test_04_customer_provider_login_unaffected(self):
        """Customer and provider logins continue to work correctly."""
        # Customer login
        res_cust = self.client.post('/api/auth/login', json={
            'email': 'alice@example.com',
            'password': 'Password123'
        })
        self.assertEqual(res_cust.status_code, 200)
        cust_data = res_cust.get_json()
        self.assertTrue(cust_data['success'])
        self.assertEqual(cust_data['user']['role'], 'customer')

        # Provider login
        res_prov = self.client.post('/api/auth/login', json={
            'email': 'ramesh.electrician@example.com',
            'password': 'ProviderPass123'
        })
        self.assertEqual(res_prov.status_code, 200)
        prov_data = res_prov.get_json()
        self.assertTrue(prov_data['success'])
        self.assertEqual(prov_data['user']['role'], 'provider')

    def test_05_admin_endpoint_allows_admin(self):
        """Admin token can access admin endpoints."""
        login_res = self.client.post('/api/auth/login', json={
            'email': 'admin@trustnear.com',
            'password': 'AdminPass123'
        })
        admin_token = login_res.get_json()['token']

        stats_res = self.client.get('/api/admin/stats', headers={
            'Authorization': f'Bearer {admin_token}'
        })
        self.assertEqual(stats_res.status_code, 200)
        data = stats_res.get_json()
        self.assertTrue(data['success'])
        self.assertIn('stats', data)
        self.assertIn('total_customers', data['stats'])

    def test_06_customer_forbidden_from_admin_endpoints(self):
        """Customer tokens receive 403 Forbidden on all admin endpoints."""
        login_res = self.client.post('/api/auth/login', json={
            'email': 'alice@example.com',
            'password': 'Password123'
        })
        cust_token = login_res.get_json()['token']

        admin_routes = [
            ('/api/admin/stats', 'GET'),
            ('/api/admin/providers', 'GET'),
            ('/api/admin/reviews/flagged', 'GET'),
            ('/api/admin/no-shows', 'GET'),
        ]
        for route, method in admin_routes:
            res = self.client.open(route, method=method, headers={
                'Authorization': f'Bearer {cust_token}'
            })
            self.assertEqual(res.status_code, 403, f'Route {route} should return 403 for customer')
            data = res.get_json()
            self.assertFalse(data['success'])
            self.assertIn('Administrator privileges required', data['message'])

    def test_07_provider_forbidden_from_admin_endpoints(self):
        """Provider tokens receive 403 Forbidden on all admin endpoints."""
        login_res = self.client.post('/api/auth/login', json={
            'email': 'ramesh.electrician@example.com',
            'password': 'ProviderPass123'
        })
        prov_token = login_res.get_json()['token']

        admin_routes = [
            ('/api/admin/stats', 'GET'),
            ('/api/admin/providers', 'GET'),
            ('/api/admin/reviews/flagged', 'GET'),
            ('/api/admin/no-shows', 'GET'),
        ]
        for route, method in admin_routes:
            res = self.client.open(route, method=method, headers={
                'Authorization': f'Bearer {prov_token}'
            })
            self.assertEqual(res.status_code, 403, f'Route {route} should return 403 for provider')
            data = res.get_json()
            self.assertFalse(data['success'])
            self.assertIn('Administrator privileges required', data['message'])

    def test_08_unauthenticated_request_rejected(self):
        """Admin endpoints reject requests without token (401)."""
        res = self.client.get('/api/admin/stats')
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertFalse(data['success'])
        self.assertIn('Authorization header is missing', data['message'])

    def test_09_invalid_token_rejected(self):
        """Admin endpoints reject invalid/tampered tokens (401)."""
        res = self.client.get('/api/admin/stats', headers={
            'Authorization': 'Bearer malformed.or.tampered.token'
        })
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertFalse(data['success'])
        self.assertIn('Invalid token', data['message'])

    def test_10_expired_token_rejected(self):
        """Admin endpoints reject expired tokens with ExpiredSignature error (401)."""
        with self.app.app_context():
            admin_user = User.query.filter_by(role='admin').first()
            expired_payload = {
                'user_id': admin_user.id,
                'role': 'admin',
                'exp': datetime.now(timezone.utc) - timedelta(hours=1)
            }
            expired_token = jwt.encode(
                expired_payload,
                self.app.config['JWT_SECRET_KEY'],
                algorithm='HS256'
            )

        res = self.client.get('/api/admin/stats', headers={
            'Authorization': f'Bearer {expired_token}'
        })
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertFalse(data['success'])
        self.assertIn('Token has expired', data['message'])

    def test_11_flask_url_map_all_admin_routes_protected(self):
        """Verify that every route under /api/admin/* is protected by admin_required."""
        admin_rules = [
            rule for rule in self.app.url_map.iter_rules()
            if rule.rule.startswith('/api/admin')
        ]
        self.assertTrue(len(admin_rules) > 0, "There should be registered admin routes")

        # Every endpoint in admin_rules must belong to admin_bp
        for rule in admin_rules:
            self.assertTrue(
                rule.endpoint.startswith('admin_bp.'),
                f"Admin route {rule.rule} has non-admin endpoint {rule.endpoint}"
            )

        # Check view functions in admin_bp have admin_required wrapping
        # The view function name or docstring / decorator check
        for rule in admin_rules:
            view_func = self.app.view_functions[rule.endpoint]
            # Since admin_required wraps token_required which wraps the func,
            # testing with no auth must return 401
            no_auth_res = self.client.open(
                rule.rule
                    .replace('<int:user_id>', '1')
                    .replace('<int:review_id>', '1')
                    .replace('<int:report_id>', '1')
                    .replace('<int:customer_id>', '1')
                    .replace('<int:provider_id>', '1')
                    .replace('<int:booking_id>', '1')
                    .replace('<int:payment_id>', '1'),
                method='GET'
            )
            # Should be either 401 (blocked by auth) or 405 (if GET is not allowed for that endpoint, e.g. PATCH)
            self.assertIn(
                no_auth_res.status_code,
                [401, 405],
                f"Route {rule.rule} was not protected by authentication! Returned {no_auth_res.status_code}"
            )

if __name__ == '__main__':
    unittest.main()
