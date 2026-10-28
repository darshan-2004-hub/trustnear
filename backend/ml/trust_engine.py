import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import shap

class TrustEngine:
    def __init__(self):
        self.features = [
            'completed_jobs',
            'cancellation_rate',
            'avg_response_minutes',
            'review_sentiment_avg',
            'experience_years'
        ]
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.explainer = None
        self._train_baseline_model()

    def _train_baseline_model(self):
        """
        Trains an initial regression model on simulated baseline performance vectors.
        Computes a non-linear Trust Score on a 0 - 100 scale.
        """
        np.random.seed(42)
        n_samples = 600

        completed = np.random.randint(0, 150, n_samples)
        cancellation = np.random.uniform(0.0, 30.0, n_samples)
        response_time = np.random.randint(5, 180, n_samples)
        sentiment = np.random.uniform(-0.8, 1.0, n_samples)
        experience = np.random.randint(1, 20, n_samples)

        # Formula defining ground truth trust dynamics
        # High completion & high sentiment reward trust; high cancellation & slow response penalize it.
        score = (
            40.0
            + (completed * 0.25)
            - (cancellation * 0.85)
            - (response_time * 0.08)
            + (sentiment * 22.0)
            + (experience * 0.7)
        )
        score = np.clip(score, 10.0, 99.0)

        df = pd.DataFrame({
            'completed_jobs': completed,
            'cancellation_rate': cancellation,
            'avg_response_minutes': response_time,
            'review_sentiment_avg': sentiment,
            'experience_years': experience,
            'trust_score': score
        })

        X = df[self.features]
        y = df['trust_score']
        self.model.fit(X, y)
        self.explainer = shap.TreeExplainer(self.model)

    def calculate_and_explain(self, metrics: dict):
        """
        Accepts a dictionary of metrics for a provider, computes the Trust Score,
        and generates exact SHAP feature attributions.
        """
        input_df = pd.DataFrame([[
            metrics.get('completed_jobs', 0),
            metrics.get('cancellation_rate', 0.0),
            metrics.get('avg_response_minutes', 30),
            metrics.get('review_sentiment_avg', 0.0),
            metrics.get('experience_years', 1)
        ]], columns=self.features)

        # Predict Trust Score
        predicted_score = float(self.model.predict(input_df)[0])
        predicted_score = round(max(10.0, min(99.0, predicted_score)), 2)

        # Compute SHAP values
        shap_values = self.explainer.shap_values(input_df)
        if isinstance(shap_values, list):
            shap_values = shap_values[0]

        factors = []
        for feature_name, value in zip(self.features, shap_values[0]):
            impact_val = round(float(value), 2)
            factors.append({
                'feature': feature_name,
                'impact': impact_val,
                'description': self._format_explanation(feature_name, impact_val, input_df[feature_name].iloc[0])
            })

        # Sort factors by magnitude of impact
        factors.sort(key=lambda x: abs(x['impact']), reverse=True)

        return {
            'trust_score': predicted_score,
            'shap_factors': factors
        }

    def _format_explanation(self, feature, impact, raw_value):
        prefix = "+" if impact >= 0 else ""
        if feature == 'completed_jobs':
            return f"{prefix}{impact} impact from having {int(raw_value)} completed jobs."
        elif feature == 'cancellation_rate':
            return f"{prefix}{impact} impact from {raw_value}% cancellation rate."
        elif feature == 'avg_response_minutes':
            return f"{prefix}{impact} impact based on {int(raw_value)} min average response time."
        elif feature == 'review_sentiment_avg':
            return f"{prefix}{impact} impact from review sentiment score ({raw_value:.2f})."
        elif feature == 'experience_years':
            return f"{prefix}{impact} impact from {int(raw_value)} years of trade experience."
        return f"{prefix}{impact} impact from {feature}."

# Export a singleton instance
trust_engine = TrustEngine()