import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor

class FairPriceEstimator:
    """
    Estimates fair local market prices using Gradient Boosting Regression.
    """
    def __init__(self):
        self.model = GradientBoostingRegressor(n_estimators=80, learning_rate=0.1, random_state=42)
        self._train_historical_model()

    def _train_historical_model(self):
        np.random.seed(42)
        n = 500
        categories = np.random.choice([0, 1, 2, 3, 4, 5], size=n) # Encoded categories
        duration = np.random.uniform(0.5, 6.0, size=n)
        emergency = np.random.choice([0, 1], size=n, p=[0.8, 0.2])

        base_rates = {0: 350, 1: 400, 2: 450, 3: 300, 4: 450, 5: 380}
        prices = [
            (base_rates[cat] * dur) + (150 * em) + np.random.normal(0, 30)
            for cat, dur, em in zip(categories, duration, emergency)
        ]

        X = pd.DataFrame({'cat': categories, 'duration': duration, 'emergency': emergency})
        y = np.maximum(150, prices)
        self.model.fit(X, y)

    def estimate_price_range(self, category_name, duration_hours, is_emergency=False):
        cat_map = {'Plumbing': 0, 'Electrical': 1, 'Carpentry': 2, 'Cleaning': 3, 'Appliance Repair': 4, 'Painting': 5}
        cat_idx = cat_map.get(category_name, 0)
        
        X_val = pd.DataFrame([{
            'cat': cat_idx, 
            'duration': float(duration_hours), 
            'emergency': 1 if is_emergency else 0
        }])
        
        pred = float(self.model.predict(X_val)[0])
        # Calculate dynamic ±12% fair market confidence bound
        min_p = round(pred * 0.88, -1)
        max_p = round(pred * 1.12, -1)

        return {
            'estimated_price': round(pred),
            'fair_range_min': int(min_p),
            'fair_range_max': int(max_p),
            'algorithm': 'GradientBoostingRegressor'
        }

price_estimator = FairPriceEstimator()