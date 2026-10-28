import re
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Ensure VADER lexicon is available
nltk.download('vader_lexicon', quiet=True)

class NLPEngine:
    def __init__(self):
        self.sia = SentimentIntensityAnalyzer()

    def analyze_sentiment(self, text: str) -> float:
        """
        Calculates compound sentiment score between -1.0 (extremely negative) and +1.0 (extremely positive).
        """
        if not text or not text.strip():
            return 0.0
        scores = self.sia.polarity_scores(text)
        return round(float(scores['compound']), 4)

    def screen_review(self, review_text: str, rating: int, existing_reviews: list) -> dict:
        """
        Screens an incoming review for fraud/manipulation patterns:
        1. Rating vs. Sentiment conflict
        2. TF-IDF near-duplicate/templated text
        """
        sentiment = self.analyze_sentiment(review_text)
        is_suspicious = False
        flag_reasons = []

        # Check 1: Sentiment vs. Star Rating Discrepancy
        # E.g. 5 stars but strongly negative text (<= -0.3)
        if rating >= 4 and sentiment <= -0.3:
            is_suspicious = True
            flag_reasons.append(
                f"Rating-Sentiment Conflict: High rating ({rating} stars) with strongly negative text (sentiment: {sentiment})."
            )
        # E.g. 1 or 2 stars but strongly positive text (>= +0.5)
        elif rating <= 2 and sentiment >= 0.5:
            is_suspicious = True
            flag_reasons.append(
                f"Rating-Sentiment Conflict: Low rating ({rating} stars) with glowing positive text (sentiment: {sentiment})."
            )

        # Check 2: TF-IDF & Cosine Similarity (Duplicate/Templated Text Check)
        if existing_reviews and len(existing_reviews) > 0 and len(review_text.strip()) > 20:
            corpus = [r['review_text'] for r in existing_reviews] + [review_text]
            try:
                vectorizer = TfidfVectorizer(stop_words='english', min_df=1)
                tfidf_matrix = vectorizer.fit_transform(corpus)
                # Compute cosine similarity between the incoming review (last index) and all prior reviews
                similarities = cosine_similarity(tfidf_matrix[-1], tfidf_matrix[:-1])[0]

                max_sim = float(similarities.max()) if len(similarities) > 0 else 0.0
                if max_sim >= 0.85:
                    is_suspicious = True
                    flag_reasons.append(
                        f"Templated/Duplicate Text: {round(max_sim * 100, 1)}% cosine similarity with existing review."
                    )
            except Exception:
                pass

        return {
            'sentiment_score': sentiment,
            'is_suspicious': is_suspicious,
            'flag_reason': " | ".join(flag_reasons) if flag_reasons else None
        }

    def summarize_reviews(self, review_texts: list) -> dict:
        """
        Extracts key positive and critical highlight sentences from approved reviews using TF-IDF sentence scoring.
        """
        if not review_texts or len(review_texts) == 0:
            return {'positive_highlights': [], 'critical_highlights': []}

        # Break reviews into individual sentences
        sentences = []
        for text in review_texts:
            raw_sentences = re.split(r'[.!?]+', text)
            for s in raw_sentences:
                clean_s = s.strip()
                if len(clean_s.split()) >= 4:  # Meaningful sentence length
                    sentences.append(clean_s)

        if len(sentences) == 0:
            return {'positive_highlights': [], 'critical_highlights': []}

        # Score sentences by sentiment
        scored_sentences = []
        for s in sentences:
            score = self.analyze_sentiment(s)
            scored_sentences.append({'sentence': s, 'sentiment': score})

        # Top positive sentences
        positive = [s['sentence'] for s in sorted(scored_sentences, key=lambda x: x['sentiment'], reverse=True) if s['sentiment'] > 0.2][:2]

        # Top critical sentences
        critical = [s['sentence'] for s in sorted(scored_sentences, key=lambda x: x['sentiment']) if s['sentiment'] < -0.1][:2]

        return {
            'positive_highlights': positive,
            'critical_highlights': critical
        }

nlp_engine = NLPEngine()