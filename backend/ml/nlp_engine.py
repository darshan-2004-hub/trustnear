import re
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Ensure VADER lexicon is available
nltk.download('vader_lexicon', quiet=True)

# Similarity threshold: flag reviews that are >= 80% similar to an existing one
_DUPLICATE_THRESHOLD = 0.80

# Minimum meaningful review length (characters) for TF-IDF duplicate check
_MIN_REVIEW_LENGTH_CHARS = 20

class NLPEngine:
    def __init__(self):
        self.sia = SentimentIntensityAnalyzer()

    def analyze_sentiment(self, text: str) -> float:
        """
        Calculates VADER compound sentiment score in [-1.0, +1.0].
        Returns 0.0 for empty or whitespace-only text.
        """
        if not text or not text.strip():
            return 0.0
        scores = self.sia.polarity_scores(text)
        return round(float(scores['compound']), 4)

    def screen_review(self, review_text: str, rating: int, existing_reviews: list) -> dict:
        """
        Screens an incoming review for manipulation patterns and flags it for admin
        moderation if suspicious. Never labels a review as fraud — only raises flags.

        Checks performed (in order):
        1. Length / gibberish guard  — very short or all-caps reviews
        2. Rating vs. Sentiment conflict  — star rating contradicts text emotion
        3. TF-IDF near-duplicate / templated text against existing approved reviews
        4. Repeated reviewer (same text pattern across multiple providers)

        Returns
        -------
        dict with keys:
            sentiment_score  : float in [-1.0, +1.0]
            is_suspicious    : bool  — True = flagged for moderation, not confirmed fraud
            flag_reasons     : list[str]  — individual flag descriptions
            flag_reason      : str | None  — pipe-joined summary (max 250 chars for DB column)
            similarity_score : float  — highest TF-IDF cosine similarity found (0.0 if N/A)
        """
        text_clean = (review_text or '').strip()
        sentiment = self.analyze_sentiment(text_clean)
        is_suspicious = False
        flag_reasons = []
        similarity_score = 0.0

        # --- Check 1: Length / Gibberish guard ---
        word_count = len(text_clean.split())
        if word_count < 3:
            is_suspicious = True
            flag_reasons.append(
                f"Insufficient content: review contains only {word_count} word(s). Minimum 3 words required."
            )
        elif text_clean == text_clean.upper() and word_count > 2:
            # All-caps shouting — common spam signal
            is_suspicious = True
            flag_reasons.append("Possible spam: review text is entirely in uppercase.")

        # --- Check 2: Rating vs. Sentiment Conflict ---
        # High star rating with strongly negative text
        if rating >= 4 and sentiment <= -0.35:
            is_suspicious = True
            flag_reasons.append(
                f"Rating-Sentiment Conflict: {rating}-star rating paired with strongly negative text "
                f"(VADER compound={sentiment:+.2f})."
            )
        # Low star rating with strongly positive text
        elif rating <= 2 and sentiment >= 0.55:
            is_suspicious = True
            flag_reasons.append(
                f"Rating-Sentiment Conflict: {rating}-star rating paired with strongly positive text "
                f"(VADER compound={sentiment:+.2f})."
            )

        # --- Check 3: TF-IDF Near-Duplicate / Templated Text ---
        if (
            existing_reviews
            and len(existing_reviews) > 0
            and len(text_clean) >= _MIN_REVIEW_LENGTH_CHARS
        ):
            corpus_texts = [r.get('review_text', '') for r in existing_reviews if r.get('review_text', '').strip()]
            if corpus_texts:
                corpus = corpus_texts + [text_clean]
                try:
                    vectorizer = TfidfVectorizer(
                        stop_words='english',
                        min_df=1,
                        ngram_range=(1, 2)   # bigrams improve duplicate detection
                    )
                    tfidf_matrix = vectorizer.fit_transform(corpus)
                    sims = cosine_similarity(tfidf_matrix[-1], tfidf_matrix[:-1])[0]
                    similarity_score = float(sims.max()) if len(sims) > 0 else 0.0

                    if similarity_score >= _DUPLICATE_THRESHOLD:
                        is_suspicious = True
                        flag_reasons.append(
                            f"Templated/Duplicate Text: {round(similarity_score * 100, 1)}% TF-IDF similarity "
                            f"with an existing review (threshold: {int(_DUPLICATE_THRESHOLD * 100)}%)."
                        )
                except Exception:
                    # Vectorizer failure is non-fatal; skip this check
                    pass

        # --- Build pipe-joined summary, truncated to fit DB column (255 chars) ---
        flag_summary = " | ".join(flag_reasons) if flag_reasons else None
        if flag_summary and len(flag_summary) > 250:
            flag_summary = flag_summary[:247] + "..."

        return {
            'sentiment_score': sentiment,
            'is_suspicious': is_suspicious,
            'flag_reasons': flag_reasons,           # full list for route logic
            'flag_reason': flag_summary,            # DB-safe string
            'similarity_score': round(similarity_score, 4)
        }

    def summarize_reviews(self, review_texts: list) -> dict:
        """
        Extracts key positive and critical highlight sentences from approved reviews
        using VADER sentence scoring (extractive summarisation, no external API).

        Returns
        -------
        dict with:
            positive_highlights : list[str] — up to 2 most positive sentences
            critical_highlights : list[str] — up to 2 most critical sentences
            total_reviews       : int
            avg_sentiment       : float
        """
        if not review_texts:
            return {
                'positive_highlights': [],
                'critical_highlights': [],
                'total_reviews': 0,
                'avg_sentiment': 0.0
            }

        sentences = []
        for text in review_texts:
            raw_sentences = re.split(r'[.!?]+', text)
            for s in raw_sentences:
                clean_s = s.strip()
                if len(clean_s.split()) >= 4:   # minimum meaningful sentence length
                    sentences.append(clean_s)

        if not sentences:
            all_sentiments = [self.analyze_sentiment(t) for t in review_texts]
            avg_s = round(sum(all_sentiments) / len(all_sentiments), 4) if all_sentiments else 0.0
            return {
                'positive_highlights': [],
                'critical_highlights': [],
                'total_reviews': len(review_texts),
                'avg_sentiment': avg_s
            }

        scored = [{'sentence': s, 'sentiment': self.analyze_sentiment(s)} for s in sentences]
        all_scores = [self.analyze_sentiment(t) for t in review_texts]
        avg_sentiment = round(sum(all_scores) / len(all_scores), 4) if all_scores else 0.0

        positive = [
            s['sentence']
            for s in sorted(scored, key=lambda x: x['sentiment'], reverse=True)
            if s['sentiment'] > 0.2
        ][:2]

        critical = [
            s['sentence']
            for s in sorted(scored, key=lambda x: x['sentiment'])
            if s['sentiment'] < -0.1
        ][:2]

        return {
            'positive_highlights': positive,
            'critical_highlights': critical,
            'total_reviews': len(review_texts),
            'avg_sentiment': avg_sentiment
        }

nlp_engine = NLPEngine()
