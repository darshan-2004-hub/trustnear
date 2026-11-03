import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
import shap

SAVED_MODELS_DIR = os.path.join(os.path.dirname(__file__), 'saved_models')

class TrustEngine:
    """
    Gradient Boosting ML Engine with SHAP (SHapley Additive exPlanations) for
    transparent, explainable provider trust evaluation.

    Features used (5):
        completed_jobs          — number of verified completed bookings
        cancellation_rate       — provider-initiated cancellation % (lower = better)
        avg_response_minutes    — average minutes to accept/respond to a booking
        review_sentiment_avg    — VADER compound sentiment average of approved reviews
        experience_years        — declared years of professional experience

    Loads a pre-trained model and explainer from disk; falls back to a
    synthetic-data baseline only if no saved model exists.
    """

    FEATURE_NAMES = [
        'completed_jobs',
        'cancellation_rate',
        'avg_response_minutes',
        'review_sentiment_avg',
        'experience_years'
    ]

    # Human-readable label templates for SHAP factor explanations
    _LABEL_TEMPLATES = {
        'completed_jobs':       "{value} verified completed job(s)",
        'cancellation_rate':    "{value:.1f}% provider cancellation rate",
        'avg_response_minutes': "{value}min average response time",
        'review_sentiment_avg': "{value:+.2f} average review sentiment (VADER)",
        'experience_years':     "{value} year(s) professional experience"
    }

    # Direction hint for each feature (positive = higher value is better for trust)
    _FEATURE_DIRECTION = {
        'completed_jobs':       'positive',
        'cancellation_rate':    'negative',   # higher cancellation rate hurts trust
        'avg_response_minutes': 'negative',   # slower response hurts trust
        'review_sentiment_avg': 'positive',
        'experience_years':     'positive'
    }

    def __init__(self):
        self.model = None
        self.explainer = None
        self._load_or_initialize_model()

    def _load_or_initialize_model(self):
        """Loads serialized model if available; falls back to one-time synthetic training."""
        model_path = os.path.join(SAVED_MODELS_DIR, 'trust_model.joblib')
        explainer_path = os.path.join(SAVED_MODELS_DIR, 'trust_explainer.joblib')

        if os.path.exists(model_path) and os.path.exists(explainer_path):
            try:
                self.model = joblib.load(model_path)
                self.explainer = joblib.load(explainer_path)
                # Migrate old 4-feature explainer/model if needed
                if hasattr(self.model, 'n_features_in_') and self.model.n_features_in_ != len(self.FEATURE_NAMES):
                    print(f"[TrustEngine] Saved model has {self.model.n_features_in_} features; "
                          f"expected {len(self.FEATURE_NAMES)}. Retraining fallback.")
                    self._train_and_save_fallback()
                return
            except Exception as e:
                print(f"[TrustEngine] Warning: Could not load serialized model: {e}")

        self._train_and_save_fallback()

    def _train_and_save_fallback(self):
        """Trains baseline model on synthetic data and serializes to disk."""
        from ml.datasets import generate_synthetic_trust_data
        df = generate_synthetic_trust_data(n_samples=400)

        # Ensure experience_years column exists in synthetic data
        if 'experience_years' not in df.columns:
            rng = np.random.default_rng(42)
            df['experience_years'] = rng.integers(0, 20, size=len(df))

        X = df[self.FEATURE_NAMES]
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
        try:
            joblib.dump(self.model, os.path.join(SAVED_MODELS_DIR, 'trust_model.joblib'))
            joblib.dump(self.explainer, os.path.join(SAVED_MODELS_DIR, 'trust_explainer.joblib'))
        except Exception as e:
            print(f"[TrustEngine] Warning: Could not save model: {e}")

    def calculate_and_explain(
        self,
        completed_jobs=0,
        cancellation_rate=0.0,
        avg_response_minutes=25,
        review_sentiment_avg=0.0,
        experience_years=0,
        data_source: str = 'synthetic',
        **kwargs
    ) -> dict:
        """
        Computes the Trust Score and generates ordered SHAP factor explanations.

        Accepts either individual keyword arguments OR a single dict as the first
        positional argument (backward-compatible with recalculator.py dict-passing style).

        Parameters
        ----------
        completed_jobs          : int
        cancellation_rate       : float  (percentage, e.g. 12.5 for 12.5%)
        avg_response_minutes    : int
        review_sentiment_avg    : float  in [-1.0, +1.0]
        experience_years        : int
        data_source             : 'real' | 'hybrid' | 'synthetic'
                                  Label to distinguish evidence quality in explanations.

        Returns
        -------
        dict:
            trust_score      : float in [10.0, 99.0]
            shap_factors     : list[dict] sorted by |impact| descending
            algorithm        : str
            data_source      : str  — provenance label for UI display
            evidence_note    : str  — human-readable data quality note
        """
        # Backward-compatible: allow passing a dict as the first argument
        if isinstance(completed_jobs, dict):
            metrics_dict = completed_jobs
            completed_jobs       = metrics_dict.get('completed_jobs', 0)
            cancellation_rate    = metrics_dict.get('cancellation_rate', 0.0)
            avg_response_minutes = metrics_dict.get('avg_response_minutes', 25)
            review_sentiment_avg = metrics_dict.get('review_sentiment_avg', 0.0)
            experience_years     = metrics_dict.get('experience_years', 0)
            data_source          = metrics_dict.get('data_source', data_source)

        # Sanitize numeric values — defend against None / wrong types
        try:
            completed_jobs = int(completed_jobs or 0)
        except (ValueError, TypeError):
            completed_jobs = 0

        try:
            cancellation_rate = float(cancellation_rate or 0.0)
        except (ValueError, TypeError):
            cancellation_rate = 0.0

        try:
            avg_response_minutes = int(avg_response_minutes or 25)
        except (ValueError, TypeError):
            avg_response_minutes = 25

        try:
            review_sentiment_avg = float(review_sentiment_avg or 0.0)
        except (ValueError, TypeError):
            review_sentiment_avg = 0.0

        try:
            experience_years = int(experience_years or 0)
        except (ValueError, TypeError):
            experience_years = 0

        # Feature DataFrame for model prediction + SHAP
        feature_values = {
            'completed_jobs':       completed_jobs,
            'cancellation_rate':    cancellation_rate,
            'avg_response_minutes': avg_response_minutes,
            'review_sentiment_avg': review_sentiment_avg,
            'experience_years':     experience_years
        }
        df_input = pd.DataFrame([feature_values])

        # Handle old 4-feature models still on disk (graceful degradation)
        if hasattr(self.model, 'n_features_in_') and self.model.n_features_in_ == 4:
            df_input_compat = df_input[self.FEATURE_NAMES[:4]]
            pred_score = float(self.model.predict(df_input_compat)[0])
            shap_values = self.explainer.shap_values(df_input_compat)
            active_features = self.FEATURE_NAMES[:4]
        else:
            pred_score = float(self.model.predict(df_input)[0])
            shap_values = self.explainer.shap_values(df_input)
            active_features = self.FEATURE_NAMES

        pred_score = round(max(10.0, min(99.0, pred_score)), 2)
        shap_row = shap_values[0]

        # Build SHAP factor list with human-readable descriptions
        shap_factors = []
        for idx, col in enumerate(active_features):
            raw_val = feature_values[col]
            template = self._LABEL_TEMPLATES.get(col, col)
            try:
                description = template.format(value=raw_val)
            except (KeyError, ValueError):
                description = f"{col}: {raw_val}"

            impact = round(float(shap_row[idx]), 2)
            # Determine display type: use domain direction to label consistently
            domain_dir = self._FEATURE_DIRECTION.get(col, 'positive')
            if domain_dir == 'negative':
                display_type = 'negative' if raw_val > 0 else 'positive'
            else:
                display_type = 'positive' if impact >= 0 else 'negative'

            shap_factors.append({
                'feature':     col,
                'description': description,
                'impact':      impact,
                'type':        display_type
            })

        # Sort by absolute SHAP impact — most influential factors first
        shap_factors.sort(key=lambda x: abs(x['impact']), reverse=True)

        # Evidence note to display in UI alongside trust score
        source_clean = str(data_source).strip().lower()
        if source_clean == 'real':
            evidence_note = (
                f"Score computed from {completed_jobs} verified booking(s) and "
                f"{len([f for f in shap_factors if f['impact'] != 0])} real activity signals."
            )
        elif source_clean == 'hybrid':
            evidence_note = (
                f"Score based on {completed_jobs} real booking(s) augmented with benchmark data. "
                "More activity will improve accuracy."
            )
        else:
            evidence_note = (
                "Baseline score — provider is newly registered with no booking history. "
                "Score will update as verified jobs and reviews are recorded."
            )

        return {
            'trust_score':   pred_score,
            'shap_factors':  shap_factors,
            'algorithm':     'GradientBoostingRegressor + SHAP (TreeExplainer)',
            'data_source':   source_clean,
            'evidence_note': evidence_note
        }

trust_engine = TrustEngine()
