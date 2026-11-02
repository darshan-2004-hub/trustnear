import os
import sys
import unittest

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from ml.trust_engine import trust_engine
from ml.price_estimator import price_estimator
from ml.ranker import personalize_ranking
from ml.ai_assistant import VALID_CATEGORIES

class TestTrustNearAuditFixes(unittest.TestCase):

    def test_01_trust_engine_signature_support(self):
        """Test Finding 1: trust_engine handles dict metrics, positional args, and kwargs without TypeError"""
        metrics = {
            'completed_jobs': 25,
            'cancellation_rate': 2.0,
            'avg_response_minutes': 15,
            'review_sentiment_avg': 0.8
        }
        # 1. Dict invocation (recalculator & seed_data style)
        res_dict = trust_engine.calculate_and_explain(metrics)
        self.assertIn('trust_score', res_dict)
        self.assertIsInstance(res_dict['shap_factors'], list)
        self.assertGreaterEqual(res_dict['trust_score'], 10.0)

        # 2. Positional invocation
        res_pos = trust_engine.calculate_and_explain(25, 2.0, 15, 0.8)
        self.assertEqual(res_pos['trust_score'], res_dict['trust_score'])

        # 3. Kwargs invocation
        res_kwargs = trust_engine.calculate_and_explain(
            completed_jobs=25,
            cancellation_rate=2.0,
            avg_response_minutes=15,
            review_sentiment_avg=0.8
        )
        self.assertEqual(res_kwargs['trust_score'], res_dict['trust_score'])

    def test_02_price_estimator_parameter_support(self):
        """Test Finding 2: price_estimator handles both category and category_name and aliases"""
        # Keyword 'category' (as called by provider_routes.py and frontend)
        est_cat = price_estimator.estimate_price_range(category='Electrical', duration_hours=2.0, is_emergency=False)
        self.assertIn('estimated_price', est_cat)
        self.assertIn('fair_range_min', est_cat)
        self.assertIn('fair_range_max', est_cat)
        self.assertGreater(est_cat['fair_range_max'], est_cat['fair_range_min'])

        # Keyword 'category_name'
        est_name = price_estimator.estimate_price_range(category_name='Plumbing', duration_hours=1.5)
        self.assertGreater(est_name['estimated_price'], 0)

        # Alias 'Home Cleaning' -> maps to Cleaning index
        est_alias = price_estimator.estimate_price_range(category='Home Cleaning', duration_hours=1.5)
        self.assertGreater(est_alias['estimated_price'], 0)

    def test_03_ranker_edge_cases(self):
        """Test Finding 3: ranker handles empty lists, single provider, uniform metrics, and missing fields"""
        # 1. Empty list
        self.assertEqual(personalize_ranking([]), [])

        # 2. Single provider
        single = [{'id': 1, 'full_name': 'Test Pro', 'trust_score': 85.0, 'hourly_rate': 300.0, 'avg_response_minutes': 20}]
        res_single = personalize_ranking(single, priority='trust')
        self.assertEqual(len(res_single), 1)
        self.assertEqual(res_single[0]['match_percentage'], 100.0)
        self.assertEqual(res_single[0]['match_score'], 1.0)
        self.assertEqual(res_single[0]['active_priority'], 'trust')

        # 3. Identical metrics (uniform values guard against division by zero)
        identical = [
            {'id': 1, 'full_name': 'Pro A', 'trust_score': 80.0, 'hourly_rate': 350.0, 'avg_response_minutes': 20},
            {'id': 2, 'full_name': 'Pro B', 'trust_score': 80.0, 'hourly_rate': 350.0, 'avg_response_minutes': 20}
        ]
        res_id = personalize_ranking(identical, priority='price')
        self.assertEqual(len(res_id), 2)
        for r in res_id:
            self.assertGreater(r['match_percentage'], 0)

        # 4. Null / Missing fields
        missing = [
            {'id': 1, 'full_name': 'Pro A', 'trust_score': None, 'hourly_rate': None, 'avg_response_minutes': None},
            {'id': 2, 'full_name': 'Pro B', 'trust_score': 92.0, 'hourly_rate': 250.0, 'avg_response_minutes': 10}
        ]
        res_missing = personalize_ranking(missing, priority='trust')
        self.assertEqual(len(res_missing), 2)
        self.assertEqual(res_missing[0]['id'], 2) # Pro B with higher trust should rank first

    def test_04_category_taxonomy_alignment(self):
        """Test Finding 8: Standardized categories are aligned across all systems"""
        expected_categories = {'Plumbing', 'Electrical', 'Carpentry', 'Cleaning', 'Appliance Repair', 'Painting'}
        self.assertTrue(expected_categories.issubset(set(VALID_CATEGORIES)))

if __name__ == '__main__':
    unittest.main()
