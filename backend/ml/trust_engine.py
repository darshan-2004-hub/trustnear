import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
import shap

class TrustEngine:
    """
    Gradient Boosting Machine Learning Engine with SHAP (SHapley Additive exPlanations)
    for transparent, explainable provider trust evaluation.
    """
    def __init__(self):
        # Features used to calculate the Trust Score (0 - 100 scale)
        self.feature_names = [
            'completed_jobs',
            'cancellation_rate',
            'avg_response_minutes',
            'review_sentiment_avg'
        ]
        
        # Gradient Boosting Regressor: Sequential residual learning
        self.model = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.08,
            max_depth=3,
            subsample=0.85,
            random_state=42
        )
        self.explainer = None
        self._train_baseline_model()

    def _train_baseline_model(self):
        """
        Trains the Gradient Boosting Regressor on synthetic historical service records.
        """
        np.random.seed(42)
        n_samples = 400

        completed_jobs = np.random.exponential(scale=25, size=n_samples).astype(int)
        cancellation_rate = np.random.beta(a=1.5, b=8, size=n_samples) * 100
        avg_response_minutes = np.random.gamma(shape=2, scale=15, size=n_samples).astype(int)
        review_sentiment_avg = np.random.uniform(low=-0.2, high=1.0, size=n_samples)

        # Ground-truth mathematical formula with realistic real-world trade dynamics
        trust_scores = (
            50.0  # Baseline neutral score
            + np.clip(completed_jobs * 0.85, 0, 30)      # Volume reward (up to +30)
            - (cancellation_rate * 0.55)                  # Cancellation penalty
            - np.clip(avg_response_minutes * 0.18, 0, 15) # Delay penalty
            + (review_sentiment_avg * 20.0)               # Verified NLP sentiment reward
        )
        trust_scores = np.clip(trust_scores, 15.0, 99.0)

        X = pd.DataFrame({
            'completed_jobs': completed_jobs,
            'cancellation_rate': cancellation_rate,
            'avg_response_minutes': avg_response_minutes,
            'review_sentiment_avg': review_sentiment_avg
        })
        y = trust_scores

        self.model.fit(X, y)
        # TreeExplainer works out-of-the-box with GradientBoostingRegressor
        self.explainer = shap.TreeExplainer(self.model)

    def calculate_and_explain(self, completed_jobs, cancellation_rate, avg_response_minutes, review_sentiment_avg):
        """
        Computes the Trust Score and generates SHAP factor explanations.
        """
        df_input = pd.DataFrame([{
            'completed_jobs': int(completed_jobs),
            'cancellation_rate': float(cancellation_rate),
            'avg_response_minutes': int(avg_response_minutes),
            'review_sentiment_avg': float(review_sentiment_avg)
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