import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor

SAVED_MODELS_DIR = os.path.join(os.path.dirname(__file__), 'saved_models')

class FairPriceEstimator:
    """
    Estimates fair local market prices using Gradient Boosting Regression.
    Loads pre-trained model from disk using joblib to avoid training on startup.
    """
    def __init__(self):
        self.model = None
        self._load_or_initialize_model()

    def _load_or_initialize_model(self):
        model_path = os.path.join(SAVED_MODELS_DIR, 'price_model.joblib')
        if os.path.exists(model_path):
            try:
                self.model = joblib.load(model_path)
                return
            except Exception as e:
                print(f"[FairPriceEstimator] Warning: Could not load serialized model: {e}")

        self._train_and_save_fallback()

    def _train_and_save_fallback(self):
        """Trains baseline model on synthetic benchmark data and serializes to disk."""
        from ml.datasets import generate_synthetic_price_data
        df = generate_synthetic_price_data(n_samples=500)
        X = df[['cat', 'duration', 'emergency']]
        y = df['price']

        self.model = GradientBoostingRegressor(n_estimators=80, learning_rate=0.1, random_state=42)
        self.model.fit(X, y)

        os.makedirs(SAVED_MODELS_DIR, exist_ok=True)
        model_path = os.path.join(SAVED_MODELS_DIR, 'price_model.joblib')
        try:
            joblib.dump(self.model, model_path)
        except Exception:
            pass

    def estimate_price_range(self, category_name=None, duration_hours=1.0, is_emergency=False, category=None, **kwargs):
        resolved_category = category or category_name or 'Plumbing'
        cat_map = {
            'plumbing': 0,
            'electrical': 1,
            'carpentry': 2,
            'cleaning': 3,
            'home cleaning': 3,
            'appliance repair': 4,
            'painting': 5
        }
        normalized_cat = str(resolved_category).strip().lower()
        cat_idx = cat_map.get(normalized_cat, 0)
        
        dur = float(duration_hours if duration_hours is not None else 1.0)
        em = 1 if is_emergency else 0

        X_val = pd.DataFrame([{
            'cat': cat_idx, 
            'duration': max(0.5, dur), 
            'emergency': em
        }])
        
        pred = float(self.model.predict(X_val)[0])
        # Calculate dynamic ±12% fair market confidence bound
        min_p = round(pred * 0.88, -1)
        max_p = round(pred * 1.12, -1)

        return {
            'category': resolved_category,
            'estimated_price': round(pred),
            'fair_range_min': int(min_p),
            'fair_range_max': int(max_p),
            'algorithm': 'GradientBoostingRegressor'
        }

price_estimator = FairPriceEstimator()
