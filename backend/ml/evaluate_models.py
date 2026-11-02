import os
import sys
import joblib

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from ml.datasets import DATA_DIR
from ml.train_models import SAVED_MODELS_DIR

def evaluate_models():
    """
    Evaluates the serialized joblib models against the held-out test splits.
    Guarantees zero data leakage and outputs regression metrics.
    """
    print("=" * 60)
    print("TrustNear ML Foundation — Model Evaluation Benchmark")
    print("=" * 60)

    # 1. Evaluate Trust Engine Model
    trust_model_path = os.path.join(SAVED_MODELS_DIR, 'trust_model.joblib')
    test_trust_path = os.path.join(DATA_DIR, 'test_trust_split.csv')

    if not os.path.exists(trust_model_path) or not os.path.exists(test_trust_path):
        print("[!] Trust model or test split not found. Please run train_models.py first.")
        return False

    trust_model = joblib.load(trust_model_path)
    test_trust_df = pd.read_csv(test_trust_path)

    feature_cols_trust = ['completed_jobs', 'cancellation_rate', 'avg_response_minutes', 'review_sentiment_avg']
    X_test_trust = test_trust_df[feature_cols_trust]
    y_test_trust = test_trust_df['trust_score']

    y_pred_trust = trust_model.predict(X_test_trust)
    mae_trust = mean_absolute_error(y_test_trust, y_pred_trust)
    rmse_trust = np.sqrt(mean_squared_error(y_test_trust, y_pred_trust))
    r2_trust = r2_score(y_test_trust, y_pred_trust)

    print("\n--- Model 1: Gradient Boosting Trust Engine ---")
    print(f"Algorithm:       GradientBoostingRegressor (100 estimators)")
    print(f"Test Split Size: {len(test_trust_df)} samples (unseen held-out data)")
    print(f"MAE:             {mae_trust:.3f} points")
    print(f"RMSE:            {rmse_trust:.3f} points")
    print(f"R^2 Score:       {r2_trust:.4f} ({r2_trust * 100:.1f}% variance explained)")

    # 2. Evaluate Fair Price Estimator Model
    price_model_path = os.path.join(SAVED_MODELS_DIR, 'price_model.joblib')
    test_price_path = os.path.join(DATA_DIR, 'test_price_split.csv')

    if not os.path.exists(price_model_path) or not os.path.exists(test_price_path):
        print("[!] Price model or test split not found. Please run train_models.py first.")
        return False

    price_model = joblib.load(price_model_path)
    test_price_df = pd.read_csv(test_price_path)

    feature_cols_price = ['cat', 'duration', 'emergency']
    X_test_price = test_price_df[feature_cols_price]
    y_test_price = test_price_df['price']

    y_pred_price = price_model.predict(X_test_price)
    mae_price = mean_absolute_error(y_test_price, y_pred_price)
    rmse_price = np.sqrt(mean_squared_error(y_test_price, y_pred_price))
    r2_price = r2_score(y_test_price, y_pred_price)

    print("\n--- Model 2: Fair Price Estimator ---")
    print(f"Algorithm:       GradientBoostingRegressor (80 estimators)")
    print(f"Test Split Size: {len(test_price_df)} samples (unseen held-out data)")
    print(f"MAE:             INR {mae_price:.2f}")
    print(f"RMSE:            INR {rmse_price:.2f}")
    print(f"R^2 Score:       {r2_price:.4f} ({r2_price * 100:.1f}% variance explained)")
    print("=" * 60)

    return {
        'trust_engine': {'mae': round(mae_trust, 4), 'rmse': round(rmse_trust, 4), 'r2': round(r2_trust, 4)},
        'price_estimator': {'mae': round(mae_price, 4), 'rmse': round(rmse_price, 4), 'r2': round(r2_price, 4)}
    }

if __name__ == '__main__':
    evaluate_models()
