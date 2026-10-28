import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

CATEGORY_BASE_RATES = {
    'plumbing': 300.0,
    'electrical': 350.0,
    'appliance repair': 400.0,
    'home cleaning': 250.0,
    'carpentry': 350.0
}

CATEGORY_MAP = {
    'plumbing': 0,
    'electrical': 1,
    'appliance repair': 2,
    'home cleaning': 3,
    'carpentry': 4
}

class PriceEstimator:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self._train_historical_model()

    def _train_historical_model(self):
        """
        Trains the regression model on simulated historical job records.
        Features: [category_code, duration_hours, is_emergency]
        Target: total_cost
        """
        np.random.seed(42)
        n_samples = 1200

        categories = np.random.choice(list(CATEGORY_MAP.keys()), n_samples)
        cat_codes = np.array([CATEGORY_MAP[c] for c in categories])
        duration = np.random.uniform(0.5, 5.0, n_samples)  # 30 mins to 5 hours
        is_emergency = np.random.choice([0, 1], n_samples, p=[0.75, 0.25])

        # Realistic pricing equation with stochastic noise
        base_rates = np.array([CATEGORY_BASE_RATES[c] for c in categories])
        cost = (base_rates * duration) + (is_emergency * 150.0) + np.random.normal(0, 25, n_samples)
        cost = np.clip(cost, 150.0, 3000.0)

        df = pd.DataFrame({
            'cat_code': cat_codes,
            'duration': duration,
            'is_emergency': is_emergency,
            'cost': cost
        })

        X = df[['cat_code', 'duration', 'is_emergency']]
        y = df['cost']
        self.model.fit(X, y)

    def estimate_price_range(self, category: str, duration_hours: float = 1.5, is_emergency: bool = False) -> dict:
        """
        Predicts expected fair market price and gives a realistic +/- 15% range.
        """
        clean_cat = category.strip().lower()
        cat_code = CATEGORY_MAP.get(clean_cat, 0)

        input_data = pd.DataFrame([[
            cat_code,
            max(0.5, float(duration_hours)),
            1 if is_emergency else 0
        ]], columns=['cat_code', 'duration', 'is_emergency'])

        predicted_price = float(self.model.predict(input_data)[0])
        predicted_price = round(predicted_price, -1)  # Round to nearest 10

        # Fair margin bounds (+/- 15%)
        min_fair = round(predicted_price * 0.85, -1)
        max_fair = round(predicted_price * 1.15, -1)

        return {
            'category': category,
            'duration_hours': duration_hours,
            'is_emergency': is_emergency,
            'estimated_price': predicted_price,
            'fair_range_min': min_fair,
            'fair_range_max': max_fair,
            'currency': 'INR'
        }

price_estimator = PriceEstimator()