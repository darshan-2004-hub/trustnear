import os
import sys
import json
import joblib

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import shap

from ml.datasets import load_trust_dataset, load_price_dataset, DATA_DIR

SAVED_MODELS_DIR = os.path.join(os.path.dirname(__file__), 'saved_models')

def ensure_models_dir():
    os.makedirs(SAVED_MODELS_DIR, exist_ok=True)

def train_trust_model(source_preference: str = 'hybrid'):
    """
    Trains the Trust Score Gradient Boosting Regressor and SHAP TreeExplainer.
    Prevents data leakage by splitting into train (80%) and test (20%).
    Supports real, synthetic, and hybrid datasets safely.
    Saves trained artifacts using joblib.
    """
    print(f"[1/2] Training Provider Trust Engine Model (preference='{source_preference}')...")
    df = load_trust_dataset(source_preference=source_preference)

    # Safe fallback if real data is insufficient (< 5 samples)
    if len(df) < 5:
        print(f"  [!] Warning: Only {len(df)} samples available. Safely augmenting with synthetic benchmark.")
        df = load_trust_dataset(source_preference='hybrid')

    real_count = int((df['is_synthetic'] == False).sum())
    synthetic_count = int((df['is_synthetic'] == True).sum())
    sources = list(df['data_source'].unique())

    print(f"  Dataset composition: {real_count} real records, {synthetic_count} synthetic records (Sources: {sources})")

    feature_cols = ['completed_jobs', 'cancellation_rate', 'avg_response_minutes', 'review_sentiment_avg']
    X = df[feature_cols]
    y = df['trust_score']

    # Strict Train/Test Split (Prevent Data Leakage)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )

    # Save held-out test split for independent evaluation
    test_split_path = os.path.join(DATA_DIR, 'test_trust_split.csv')
    test_df = X_test.copy()
    test_df['trust_score'] = y_test
    test_df.to_csv(test_split_path, index=False)

    model = GradientBoostingRegressor(
        n_estimators=100,
        learning_rate=0.08,
        max_depth=3,
        subsample=0.85,
        random_state=42
    )
    model.fit(X_train, y_train)

    # Precompute SHAP TreeExplainer on training data
    explainer = shap.TreeExplainer(model)

    # Evaluate on held-out test data
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    print(f"  Trust Model Test MAE:  {mae:.3f} points")
    print(f"  Trust Model Test RMSE: {rmse:.3f} points")
    print(f"  Trust Model Test R^2:  {r2:.4f}")

    # Save to disk using joblib
    ensure_models_dir()
    model_path = os.path.join(SAVED_MODELS_DIR, 'trust_model.joblib')
    explainer_path = os.path.join(SAVED_MODELS_DIR, 'trust_explainer.joblib')

    joblib.dump(model, model_path)
    joblib.dump(explainer, explainer_path)
    print(f"  Saved Trust Model -> {model_path}")

    return {
        'model_path': model_path,
        'explainer_path': explainer_path,
        'test_metrics': {'mae': round(mae, 4), 'rmse': round(rmse, 4), 'r2': round(r2, 4)},
        'train_samples': len(X_train),
        'test_samples': len(X_test),
        'real_samples': real_count,
        'synthetic_samples': synthetic_count,
        'data_sources': sources
    }

def train_price_model(source_preference: str = 'hybrid'):
    """
    Trains the Fair Market Price Gradient Boosting Regressor.
    Prevents data leakage with train/test split (80/20).
    Saves trained model using joblib.
    """
    print(f"[2/2] Training Fair Price Estimator Model (preference='{source_preference}')...")
    df = load_price_dataset(source_preference=source_preference)

    # Safe fallback if real data is insufficient (< 5 samples)
    if len(df) < 5:
        print(f"  [!] Warning: Only {len(df)} samples available. Safely augmenting with synthetic benchmark.")
        df = load_price_dataset(source_preference='hybrid')

    real_count = int((df['is_synthetic'] == False).sum())
    synthetic_count = int((df['is_synthetic'] == True).sum())
    sources = list(df['data_source'].unique())

    print(f"  Dataset composition: {real_count} real records, {synthetic_count} synthetic records (Sources: {sources})")

    feature_cols = ['cat', 'duration', 'emergency']
    X = df[feature_cols]
    y = df['price']

    # Strict Train/Test Split (Prevent Data Leakage)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )

    # Save held-out test split for independent evaluation
    test_split_path = os.path.join(DATA_DIR, 'test_price_split.csv')
    test_df = X_test.copy()
    test_df['price'] = y_test
    test_df.to_csv(test_split_path, index=False)

    model = GradientBoostingRegressor(
        n_estimators=80,
        learning_rate=0.10,
        random_state=42
    )
    model.fit(X_train, y_train)

    # Evaluate on held-out test data
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    print(f"  Price Model Test MAE:  INR {mae:.2f}")
    print(f"  Price Model Test RMSE: INR {rmse:.2f}")
    print(f"  Price Model Test R^2:  {r2:.4f}")

    # Save to disk using joblib
    ensure_models_dir()
    model_path = os.path.join(SAVED_MODELS_DIR, 'price_model.joblib')
    joblib.dump(model, model_path)
    print(f"  Saved Price Model -> {model_path}")

    return {
        'model_path': model_path,
        'test_metrics': {'mae': round(mae, 4), 'rmse': round(rmse, 4), 'r2': round(r2, 4)},
        'train_samples': len(X_train),
        'test_samples': len(X_test),
        'real_samples': real_count,
        'synthetic_samples': synthetic_count,
        'data_sources': sources
    }

def train_all_models(source_preference: str = 'hybrid'):
    ensure_models_dir()
    trust_results = train_trust_model(source_preference=source_preference)
    price_results = train_price_model(source_preference=source_preference)

    metadata = {
        'trained_at': datetime.now(timezone.utc).isoformat(),
        'source_preference': source_preference,
        'trust_model': trust_results,
        'price_model': price_results
    }
    meta_path = os.path.join(SAVED_MODELS_DIR, 'training_metadata.json')
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)

    print(f"\nAll models successfully trained and serialized to {SAVED_MODELS_DIR}!")
    return metadata

if __name__ == '__main__':
    train_all_models()
