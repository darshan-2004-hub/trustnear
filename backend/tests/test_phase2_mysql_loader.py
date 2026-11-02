import os
import sys
import unittest
import pandas as pd

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from ml.datasets import (
    fetch_real_mysql_providers,
    fetch_real_mysql_trust_metrics,
    fetch_real_mysql_service_prices,
    fetch_real_mysql_reviews,
    load_trust_dataset,
    load_price_dataset,
    generate_synthetic_trust_data,
    generate_synthetic_price_data
)
from ml.train_models import train_trust_model, train_price_model

class TestPhase2DatasetLoader(unittest.TestCase):

    def test_01_real_vs_synthetic_distinguishability(self):
        """Verify real and synthetic records are clearly distinguishable by flags and provenance"""
        synth_trust = generate_synthetic_trust_data(n_samples=10)
        self.assertTrue((synth_trust['is_synthetic'] == True).all())
        self.assertEqual(synth_trust['data_source'].iloc[0], 'synthetic_benchmark_v1')

        synth_price = generate_synthetic_price_data(n_samples=10)
        self.assertTrue((synth_price['is_synthetic'] == True).all())
        self.assertEqual(synth_price['data_source'].iloc[0], 'synthetic_benchmark_v1')

    def test_02_mysql_extraction(self):
        """Test extraction of providers, trust metrics, service prices, and reviews from MySQL"""
        real_providers = fetch_real_mysql_providers()
        print(f"\n[Test Result] Real MySQL providers extracted: {len(real_providers)} rows")
        if not real_providers.empty:
            self.assertTrue((real_providers['is_synthetic'] == False).all())
            self.assertEqual(real_providers['data_source'].iloc[0], 'mysql_production')

        real_trust = fetch_real_mysql_trust_metrics()
        print(f"[Test Result] Real MySQL trust metrics extracted: {len(real_trust)} rows")
        if not real_trust.empty:
            self.assertTrue((real_trust['is_synthetic'] == False).all())
            self.assertEqual(real_trust['data_source'].iloc[0], 'mysql_production')

        real_prices = fetch_real_mysql_service_prices()
        print(f"[Test Result] Real MySQL service prices extracted: {len(real_prices)} rows")
        if not real_prices.empty:
            self.assertTrue((real_prices['is_synthetic'] == False).all())

        real_reviews = fetch_real_mysql_reviews()
        print(f"[Test Result] Real MySQL reviews extracted: {len(real_reviews)} rows")

    def test_03_safe_fallback_on_insufficient_real_data(self):
        """Verify model training does not crash when real data is small or insufficient"""
        # Load with source_preference='hybrid'
        df_hybrid_trust = load_trust_dataset(source_preference='hybrid')
        self.assertGreater(len(df_hybrid_trust), 10)
        self.assertIn('is_synthetic', df_hybrid_trust.columns)

        # Load with source_preference='real_only'
        df_real_trust = load_trust_dataset(source_preference='real_only', min_real_samples=1000)
        self.assertGreater(len(df_real_trust), 0)

        # Train with hybrid loader
        res_trust = train_trust_model(source_preference='hybrid')
        self.assertIn('test_metrics', res_trust)
        self.assertGreater(res_trust['train_samples'], 0)

        res_price = train_price_model(source_preference='hybrid')
        self.assertIn('test_metrics', res_price)
        self.assertGreater(res_price['train_samples'], 0)

if __name__ == '__main__':
    unittest.main()
