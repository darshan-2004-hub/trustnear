import sys
import os
import unittest

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from ml.nlp_engine import nlp_engine
from ml.trust_engine import trust_engine


class TestPhase4TrustAndReviews(unittest.TestCase):

    # -----------------------------------------------------------------------
    # NLP Engine: Suspicious review screening
    # -----------------------------------------------------------------------

    def test_nlp_sentiment_positive(self):
        score = nlp_engine.analyze_sentiment("Excellent work! Very professional and punctual.")
        self.assertGreater(score, 0.3)

    def test_nlp_sentiment_negative(self):
        score = nlp_engine.analyze_sentiment("Terrible experience. Never coming back.")
        self.assertLess(score, -0.2)

    def test_nlp_screen_rating_sentiment_conflict_high_stars_negative_text(self):
        result = nlp_engine.screen_review(
            review_text="Absolutely terrible service. Would never recommend to anyone.",
            rating=5,
            existing_reviews=[]
        )
        self.assertTrue(result['is_suspicious'])
        self.assertIn('flag_reasons', result)
        self.assertTrue(len(result['flag_reasons']) > 0)
        self.assertIn('Rating-Sentiment Conflict', result['flag_reasons'][0])

    def test_nlp_screen_rating_sentiment_conflict_low_stars_positive_text(self):
        result = nlp_engine.screen_review(
            review_text="Absolutely wonderful! Perfect job, very happy and satisfied.",
            rating=1,
            existing_reviews=[]
        )
        self.assertTrue(result['is_suspicious'])
        self.assertTrue(any('Rating-Sentiment Conflict' in r for r in result['flag_reasons']))

    def test_nlp_screen_gibberish_short_review(self):
        result = nlp_engine.screen_review(
            review_text="ok",
            rating=4,
            existing_reviews=[]
        )
        self.assertTrue(result['is_suspicious'])
        self.assertTrue(any('Insufficient content' in r for r in result['flag_reasons']))

    def test_nlp_screen_duplicate_review(self):
        existing = [
            {'review_text': "Very professional and quick service. Fixed the pipe in no time. Highly recommended."},
        ]
        # Near-identical review
        result = nlp_engine.screen_review(
            review_text="Very professional and quick service. Fixed the pipe in no time. Highly recommended.",
            rating=5,
            existing_reviews=existing
        )
        self.assertTrue(result['is_suspicious'])
        self.assertTrue(any('Duplicate' in r or 'Templated' in r for r in result['flag_reasons']))
        self.assertGreater(result['similarity_score'], 0.79)

    def test_nlp_screen_clean_review(self):
        result = nlp_engine.screen_review(
            review_text="The electrician arrived on time and fixed the wiring issue efficiently. Will call again.",
            rating=5,
            existing_reviews=[]
        )
        self.assertFalse(result['is_suspicious'])
        self.assertEqual(result['flag_reasons'], [])
        self.assertIsNone(result['flag_reason'])

    def test_nlp_screen_flag_reason_length_safe(self):
        """flag_reason must be None or <= 255 chars (DB column constraint)."""
        result = nlp_engine.screen_review(
            review_text="ok",
            rating=5,
            existing_reviews=[]
        )
        if result['flag_reason'] is not None:
            self.assertLessEqual(len(result['flag_reason']), 255)

    def test_nlp_summarize_reviews_returns_correct_keys(self):
        texts = [
            "Excellent service! Very professional and fast.",
            "Poor quality work. The issue was not resolved.",
            "Arrived on time and did a great job. Very happy."
        ]
        summary = nlp_engine.summarize_reviews(texts)
        self.assertIn('positive_highlights', summary)
        self.assertIn('critical_highlights', summary)
        self.assertIn('total_reviews', summary)
        self.assertIn('avg_sentiment', summary)
        self.assertEqual(summary['total_reviews'], 3)

    def test_nlp_summarize_empty(self):
        summary = nlp_engine.summarize_reviews([])
        self.assertEqual(summary['positive_highlights'], [])
        self.assertEqual(summary['critical_highlights'], [])

    # -----------------------------------------------------------------------
    # Trust Engine: scoring, SHAP, data source labels
    # -----------------------------------------------------------------------

    def test_trust_engine_score_range(self):
        result = trust_engine.calculate_and_explain(
            completed_jobs=15,
            cancellation_rate=5.0,
            avg_response_minutes=12,
            review_sentiment_avg=0.6,
            experience_years=5
        )
        self.assertIn('trust_score', result)
        self.assertGreaterEqual(result['trust_score'], 10.0)
        self.assertLessEqual(result['trust_score'], 99.0)

    def test_trust_engine_shap_factors_structure(self):
        result = trust_engine.calculate_and_explain(
            completed_jobs=8,
            cancellation_rate=2.0,
            avg_response_minutes=20,
            review_sentiment_avg=0.4,
            experience_years=3
        )
        factors = result['shap_factors']
        self.assertIsInstance(factors, list)
        self.assertGreater(len(factors), 0)
        for f in factors:
            self.assertIn('feature', f)
            self.assertIn('description', f)
            self.assertIn('impact', f)
            self.assertIn('type', f)
            self.assertIn(f['type'], ['positive', 'negative'])

    def test_trust_engine_dict_passing_backward_compatible(self):
        """Verify recalculator-style dict-as-first-arg still works."""
        metrics = {
            'completed_jobs': 10,
            'cancellation_rate': 0.0,
            'avg_response_minutes': 15,
            'review_sentiment_avg': 0.5,
            'experience_years': 4,
            'data_source': 'real'
        }
        result = trust_engine.calculate_and_explain(metrics)
        self.assertIn('trust_score', result)
        self.assertEqual(result['data_source'], 'real')

    def test_trust_engine_data_source_label_real(self):
        result = trust_engine.calculate_and_explain(
            completed_jobs=20, cancellation_rate=3.0,
            avg_response_minutes=10, review_sentiment_avg=0.7,
            experience_years=6, data_source='real'
        )
        self.assertEqual(result['data_source'], 'real')
        self.assertIn('evidence_note', result)
        self.assertIn('20', result['evidence_note'])

    def test_trust_engine_data_source_label_synthetic(self):
        result = trust_engine.calculate_and_explain(
            completed_jobs=0, cancellation_rate=0.0,
            avg_response_minutes=25, review_sentiment_avg=0.0,
            experience_years=0, data_source='synthetic'
        )
        self.assertEqual(result['data_source'], 'synthetic')
        self.assertIn('Baseline', result['evidence_note'])

    def test_trust_engine_none_values_safe(self):
        """All-None inputs must not crash."""
        result = trust_engine.calculate_and_explain(
            completed_jobs=None,
            cancellation_rate=None,
            avg_response_minutes=None,
            review_sentiment_avg=None,
            experience_years=None
        )
        self.assertIn('trust_score', result)
        self.assertGreaterEqual(result['trust_score'], 10.0)

    def test_trust_engine_shap_sorted_by_abs_impact(self):
        result = trust_engine.calculate_and_explain(
            completed_jobs=12, cancellation_rate=1.5,
            avg_response_minutes=8, review_sentiment_avg=0.65,
            experience_years=7
        )
        factors = result['shap_factors']
        abs_impacts = [abs(f['impact']) for f in factors]
        self.assertEqual(abs_impacts, sorted(abs_impacts, reverse=True))


if __name__ == '__main__':
    unittest.main()
