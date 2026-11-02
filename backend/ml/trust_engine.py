import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
import shap

SAVED_MODELS_DIR = os.path.join(os.path.dirname(__file__), 'saved_models')

class TrustEngine:
    """
    Gradient Boosting Machine Learning Engine with SHAP (SHapley Additive exPlanations)
    for transparent, explainable provider trust evaluation.
    Loads pre-trained model and explainer from serialized joblib artifacts to avoid training on startup.
    """
    def __init__(self):
        self.feature_names = [
            'completed_jobs',
            'cancellation_rate',
            'avg_response_minutes',
            'review_sentiment_avg'
        ]
        self.model = None
        self.explainer = None
        self._load_or_initialize_model()

    def _load_or_initialize_model(self):
        """Loads serialized model if available; falls back to initial baseline training once."""
        model_path = os.path.join(SAVED_MODELS_DIR, 'trust_model.joblib')
        explainer_path = os.path.join(SAVED_MODELS_DIR, 'trust_explainer.joblib')

        if os.path.exists(model_path) and os.path.exists(explainer_path):
            try:
                self.model = joblib.load(model_path)
                self.explainer = joblib.load(explainer_path)
                return
            except Exception as e:
                print(f"[TrustEngine] Warning: Could not load serialized model: {e}")

        # Fallback initialization (only runs if saved model is missing)
        self._train_and_save_fallback()

    def _train_and_save_fallback(self):
        """Trains baseline model on synthetic benchmark data and serializes to disk."""
        from ml.datasets import generate_synthetic_trust_data
        df = generate_synthetic_trust_data(n_samples=400)
        X = df[self.feature_names]
        y = df['trust_score']

        self.model = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.08,
            max_depth=3,
            subsample=0.85,
            random_state=42
        )
        self.model.fit(X, y)
        self.explainer = shap.TreeExplainer(self.model)

        os.makedirs(SAVED_MODELS_DIR, exist_ok=True)
        model_path = os.path.join(SAVED_MODELS_DIR, 'trust_model.joblib')
        explainer_path = os.path.join(SAVED_MODELS_DIR, 'trust_explainer.joblib')
        try:
            joblib.dump(self.model, model_path)
            joblib.dump(self.explainer, explainer_path)
        except Exception:
            pass

    def calculate_and_explain(self, completed_jobs=0, cancellation_rate=0.0, avg_response_minutes=25, review_sentiment_avg=0.0, **kwargs):
        """
        Computes the Trust Score and generates SHAP factor explanations.
        Supports passing a dictionary of metrics or individual parameters.
        """
        if isinstance(completed_jobs, dict):
            metrics_dict = completed_jobs
            completed_jobs = metrics_dict.get('completed_jobs', 0)
            cancellation_rate = metrics_dict.get('cancellation_rate', 0.0)
            avg_response_minutes = metrics_dict.get('avg_response_minutes', 25)
            review_sentiment_avg = metrics_dict.get('review_sentiment_avg', 0.0)
        else:
            completed_jobs = kwargs.get('completed_jobs', completed_jobs)
            cancellation_rate = kwargs.get('cancellation_rate', cancellation_rate)
            avg_response_minutes = kwargs.get('avg_response_minutes', avg_response_minutes)
            review_sentiment_avg = kwargs.get('review_sentiment_avg', review_sentiment_avg)

        # Sanitize numeric values
        completed_jobs = int(completed_jobs or 0)
        cancellation_rate = float(cancellation_rate or 0.0)
        avg_response_minutes = int(avg_response_minutes or 25)
        review_sentiment_avg = float(review_sentiment_avg or 0.0)

        df_input = pd.DataFrame([{
            'completed_jobs': completed_jobs,
            'cancellation_rate': cancellation_rate,
            'avg_response_minutes': avg_response_minutes,
            'review_sentiment_avg': review_sentiment_avg
        }])

        pred_score = float(self.model.predict(df_input)[0])
        pred_score = round(max(10.0, min(99.0, pred_score)), 2)

        shap_values = self.explainer.shap_values(df_input)
        shap_row = shap_values[0]

        shap_factors = []
        descriptions = {
            'completed_jobs': f"{completed_jobs} verified completed jobs",
            'cancellation_rate': f"{cancellation_rate:.1f}% cancellation ratio",
            'avg_response_minutes': f"{avg_response_minutes}m avg response window",
            'review_sentiment_avg': f"{review_sentiment_avg:+.2f} NLP sentiment score"
        }

        for idx, col in enumerate(self.feature_names):
            impact = round(float(shap_row[idx]), 2)
            shap_factors.append({
                'feature': col,
                'description': descriptions[col],
                'impact': impact,
                'type': 'positive' if impact >= 0 else 'negative'
            })

        shap_factors.sort(key=lambda x: abs(x['impact']), reverse=True)

        return {
            'trust_score': pred_score,
            'shap_factors': shap_factors,
            'algorithm': 'GradientBoostingRegressor (Ensemble Boosting)'
        }

trust_engine = TrustEngine()
