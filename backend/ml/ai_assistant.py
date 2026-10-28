import os
import json
import re
import google.generativeai as genai

VALID_CATEGORIES = ['Plumbing', 'Electrical', 'Appliance Repair', 'Home Cleaning', 'Carpentry']

class AIAssistant:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.client_available = False
        self._configure_client()

    def _configure_client(self):
        if self.api_key and not self.api_key.startswith("AIzaSyYourCopiedKey"):
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-1.5-flash')
                self.client_available = True
            except Exception as e:
                print(f"[AIAssistant] Failed to initialize Gemini API: {e}")
                self.client_available = False
        else:
            self.client_available = False

    def process_user_query(self, user_message: str) -> dict:
        """
        Sends the user request to Gemini with few-shot instructions to return valid JSON.
        Falls back to local NLP heuristic parser if offline or API key missing.
        """
        if not user_message or not user_message.strip():
            return {
                'conversational_reply': "How can I help you today? You can describe any repair or home maintenance issue.",
                'extracted_filters': {'category': 'All', 'urgency': 'normal', 'location': None}
            }

        # If Gemini API is available and active
        if self.client_available:
            try:
                prompt = f"""
You are TrustNear's Smart Service Matching Assistant.
The user is describing a problem in their home. Analyze their request and extract structured intent.

Valid Service Categories: ["Plumbing", "Electrical", "Appliance Repair", "Home Cleaning", "Carpentry"]

Return ONLY a valid JSON object matching this schema:
{{
  "category": "one of the valid categories or 'All' if ambiguous",
  "urgency": "emergency" (if flooding, sparks, power outage, gas leak) or "normal",
  "location": "extracted locality or area name if mentioned, otherwise null",
  "conversational_reply": "A helpful 1-2 sentence response acknowledging their issue, giving a quick safety tip if dangerous, and telling them you found matching verified providers."
}}

User message: "{user_message}"
JSON output:
"""
                response = self.model.generate_content(prompt)
                raw_text = response.text.strip()

                # Clean potential markdown fences (```json ... ```)
                json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    # Validate category
                    matched_category = parsed.get('category', 'All')
                    if matched_category not in VALID_CATEGORIES and matched_category != 'All':
                        matched_category = 'All'

                    return {
                        'conversational_reply': parsed.get('conversational_reply', "I've analyzed your request and matched verified providers for you below."),
                        'extracted_filters': {
                            'category': matched_category,
                            'urgency': parsed.get('urgency', 'normal'),
                            'location': parsed.get('location')
                        },
                        'engine': 'Google Gemini 1.5 Flash'
                    }
            except Exception as err:
                print(f"[AIAssistant] Gemini call failed, engaging NLP fallback: {err}")

        # Resilient Offline Heuristic NLP Fallback (No internet / API quota safety)
        return self._local_nlp_fallback(user_message)

    def _local_nlp_fallback(self, text: str) -> dict:
        lower = text.lower()
        category = 'All'
        urgency = 'normal'
        location = None

        # Category keyword matching
        if any(w in lower for w in ['pipe', 'leak', 'drain', 'water', 'tap', 'flush', 'sink', 'toilet']):
            category = 'Plumbing'
        elif any(w in lower for w in ['spark', 'shock', 'switch', 'wiring', 'fuse', 'light', 'fan', 'power', 'electric']):
            category = 'Electrical'
        elif any(w in lower for w in ['fridge', 'refrigerator', 'washing machine', 'microwave', 'oven', 'appliance', 'ac', 'cooler']):
            category = 'Appliance Repair'
        elif any(w in lower for w in ['clean', 'sweep', 'mop', 'sanitize', 'dust', 'sofa', 'carpet']):
            category = 'Home Cleaning'
        elif any(w in lower for w in ['wood', 'door', 'lock', 'furniture', 'cupboard', 'table', 'chair', 'carpenter']):
            category = 'Carpentry'

        # Urgency detection
        if any(w in lower for w in ['emergency', 'urgent', 'immediately', 'now', 'flooding', 'burst', 'danger', 'sparks']):
            urgency = 'emergency'

        # Location heuristic for common Mangaluru areas
        for loc in ['kadri', 'kodialbail', 'bejai', 'valencia', 'bunder', 'kankanady', 'hampankatta']:
            if loc in lower:
                location = loc.capitalize()
                break

        reply = f"I understood you need assistance with {category.lower() if category != 'All' else 'general home services'}."
        if urgency == 'emergency':
            reply += " Since this is urgent, I've prioritized the fastest responding local providers for you."
        else:
            reply += " Here are the highest-rated verified professionals ready to help."

        return {
            'conversational_reply': reply,
            'extracted_filters': {
                'category': category,
                'urgency': urgency,
                'location': location
            },
            'engine': 'TrustNear Offline Heuristic NLP'
        }

ai_assistant = AIAssistant()