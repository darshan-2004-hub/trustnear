import sys
import os
import unittest

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from ml.ai_assistant import ai_assistant, AIAssistant
from ml.ranker import personalize_ranking, normalize


class TestPhase3IntentAndRanking(unittest.TestCase):

    def test_local_nlp_extraction_categories_and_urgency(self):
        """Verify heuristic intent extraction detects categories and emergency signals."""
        res_plumbing = ai_assistant._local_nlp_fallback("Burst pipe flooding kitchen floor in Kadri immediately!")
        self.assertEqual(res_plumbing['extracted_filters']['category'], 'Plumbing')
        self.assertEqual(res_plumbing['extracted_filters']['urgency'], 'emergency')
        self.assertEqual(res_plumbing['extracted_filters']['location'], 'Kadri')

        res_elec = ai_assistant._local_nlp_fallback("Short circuit and sparks in bedroom switchboard")
        self.assertEqual(res_elec['extracted_filters']['category'], 'Electrical')
        self.assertEqual(res_elec['extracted_filters']['urgency'], 'emergency')

        res_paint = ai_assistant._local_nlp_fallback("Need someone to paint interior wall in Valencia")
        self.assertEqual(res_paint['extracted_filters']['category'], 'Painting')
        self.assertEqual(res_paint['extracted_filters']['urgency'], 'normal')
        self.assertEqual(res_paint['extracted_filters']['location'], 'Valencia')

    def test_local_nlp_budget_extraction(self):
        """Verify explicit and soft budget extraction."""
        # Explicit number
        res1 = ai_assistant._local_nlp_fallback("Looking for a carpenter under 450 rupees in Bejai")
        self.assertEqual(res1['extracted_filters']['budget_inr'], 450)
        self.assertEqual(res1['extracted_filters']['category'], 'Carpentry')
        self.assertEqual(res1['extracted_filters']['location'], 'Bejai')

        # 'max budget 600'
        res2 = ai_assistant._local_nlp_fallback("Need sofa cleaner, max budget 600")
        self.assertEqual(res2['extracted_filters']['budget_inr'], 600)
        self.assertEqual(res2['extracted_filters']['category'], 'Cleaning')

        # Soft budget cues
        res3 = ai_assistant._local_nlp_fallback("Need an affordable electrician")
        self.assertIsNotNone(res3['extracted_filters']['budget_inr'])
        self.assertGreater(res3['extracted_filters']['budget_inr'], 0)

        # No budget
        res4 = ai_assistant._local_nlp_fallback("Fix my tap in Kodialbail")
        self.assertIsNone(res4['extracted_filters']['budget_inr'])

    def test_empty_or_whitespace_query(self):
        """Safe handling of empty queries."""
        res = ai_assistant.process_user_query("   ")
        self.assertIn('extracted_filters', res)
        filters = res['extracted_filters']
        self.assertIn('budget_inr', filters)
        self.assertIn('category', filters)
        self.assertIn('urgency', filters)
        self.assertIn('location', filters)

    def test_ranker_backward_compatibility(self):
        """Verify personalize_ranking works with standard positional arguments."""
        providers = [
            {'id': 1, 'full_name': 'Pro A', 'trust_score': 85.0, 'hourly_rate': 300, 'avg_response_minutes': 15},
            {'id': 2, 'full_name': 'Pro B', 'trust_score': 70.0, 'hourly_rate': 250, 'avg_response_minutes': 30}
        ]
        ranked = personalize_ranking(providers)
        self.assertEqual(len(ranked), 2)
        for p in ranked:
            self.assertIn('personalized_score', p)
            self.assertIn('match_score', p)
            self.assertIn('match_percentage', p)
            self.assertIn('recommendation_reason', p)

    def test_ranker_5_features_and_missing_data(self):
        """Verify ranker handles missing ratings, missing distance, and None values safely."""
        providers = [
            {
                'id': 1, 'full_name': 'Provider 1',
                'trust_score': 90.0,
                'rating': None,         # missing rating
                'hourly_rate': 400.0,
                'avg_response_minutes': 10,
                'distance_km': None     # missing distance
            },
            {
                'id': 2, 'full_name': 'Provider 2',
                'trust_score': None,    # missing trust
                'rating': 4.8,
                'hourly_rate': 300.0,
                'avg_response_minutes': None,  # missing response time
                'distance_km': 2.5
            },
            {
                'id': 3, 'full_name': 'Provider 3',
                'trust_score': 65.0,
                'rating': 3.9,
                'hourly_rate': None,    # missing rate
                'avg_response_minutes': 25,
                'distance_km': 8.0
            }
        ]
        ranked = personalize_ranking(providers, priority='trust')
        self.assertEqual(len(ranked), 3)
        for p in ranked:
            self.assertTrue(0.0 <= p['personalized_score'] <= 1.0)
            self.assertTrue(0.0 <= p['match_percentage'] <= 100.0)
            self.assertTrue(len(p['recommendation_reason']) > 0)

    def test_ranker_budget_filter(self):
        """Verify ranker pre-filters providers when budget is specified."""
        providers = [
            {'id': 1, 'full_name': 'Cheap Pro', 'trust_score': 70, 'hourly_rate': 300, 'avg_response_minutes': 20},
            {'id': 2, 'full_name': 'Expensive Pro', 'trust_score': 95, 'hourly_rate': 900, 'avg_response_minutes': 10}
        ]
        # With budget 400, cutoff is 400 * 1.5 = 600. Pro 2 (900) should be excluded
        ranked = personalize_ranking(providers, priority='price', filters={'budget_inr': 400})
        self.assertEqual(len(ranked), 1)
        self.assertEqual(ranked[0]['id'], 1)

    def test_ranker_edge_cases(self):
        """Verify ranker handles empty lists and single provider."""
        self.assertEqual(personalize_ranking([]), [])

        single = [{'id': 1, 'full_name': 'Solo Pro', 'trust_score': 80}]
        ranked_single = personalize_ranking(single)
        self.assertEqual(len(ranked_single), 1)
        self.assertEqual(ranked_single[0]['match_percentage'], 100.0)
        self.assertIn('recommendation_reason', ranked_single[0])


if __name__ == '__main__':
    unittest.main()
