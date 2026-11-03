import os
import json
import re
import google.generativeai as genai

VALID_CATEGORIES = ['Plumbing', 'Electrical', 'Carpentry', 'Cleaning', 'Appliance Repair', 'Painting']

# Extended Mangaluru locality list for location detection
MANGALURU_LOCALITIES = [
    'kadri', 'kodialbail', 'bejai', 'valencia', 'bunder', 'kankanady',
    'hampankatta', 'mangalore', 'mangaluru', 'urwa', 'attavar', 'falnir',
    'pandeshwar', 'lalbagh', 'kottara', 'bondel', 'pumpwell', 'kuloor',
    'bikarnakatte', 'jeppu', 'dongerkery', 'barke', 'kavoor', 'surathkal',
    'mulki', 'bajpe', 'derebail', 'nanthoor', 'padil', 'katipalla'
]

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
        Always includes budget_inr in extracted_filters (None if not mentioned).
        """
        if not user_message or not user_message.strip():
            return {
                'conversational_reply': "How can I help you today? You can describe any repair or home maintenance issue.",
                'extracted_filters': {
                    'category': 'All',
                    'urgency': 'normal',
                    'location': None,
                    'budget_inr': None
                }
            }

        # If Gemini API is available and active
        if self.client_available:
            try:
                prompt = f"""
You are TrustNear's Smart Service Matching Assistant for Mangaluru, India.
The user is describing a home service problem. Analyze and extract structured intent.

Valid Service Categories: {json.dumps(VALID_CATEGORIES)}

Return ONLY a valid JSON object matching this exact schema (no markdown, no extra text):
{{
  "category": "one of the valid categories or 'All' if ambiguous",
  "urgency": "emergency if flooding/sparks/power outage/gas leak/fire, otherwise normal",
  "location": "extracted Mangaluru locality or area name if mentioned, otherwise null",
  "budget_inr": null or integer (extract from phrases like 'under 500', 'budget 300', 'max 1000', 'cheap', 'affordable' — if 'cheap'/'affordable' with no number use 400, otherwise null),
  "conversational_reply": "A helpful 1-2 sentence response acknowledging their issue, giving a safety tip if dangerous, and confirming you found matching verified providers."
}}

Few-shot examples:
User: "My kitchen pipe is leaking near kadri, need someone urgently"
{{"category": "Plumbing", "urgency": "emergency", "location": "Kadri", "budget_inr": null, "conversational_reply": "I've detected an urgent plumbing issue — please turn off your main water valve immediately. I've prioritized the fastest verified plumbers near Kadri for you."}}

User: "Looking for a painter under 500 rupees per hour in kodialbail"
{{"category": "Painting", "urgency": "normal", "location": "Kodialbail", "budget_inr": 500, "conversational_reply": "Great! I've found verified painters near Kodialbail within your INR 500/hr budget."}}

User: "affordable electrician please"
{{"category": "Electrical", "urgency": "normal", "location": null, "budget_inr": 400, "conversational_reply": "I've matched budget-friendly verified electricians available in your area."}}

User: "someone to clean my sofa, max budget 800"
{{"category": "Cleaning", "urgency": "normal", "location": null, "budget_inr": 800, "conversational_reply": "I've found verified cleaning professionals within your INR 800 budget."}}

User message: "{user_message}"
JSON output:
"""
                response = self.model.generate_content(prompt)
                raw_text = response.text.strip()

                # Clean potential markdown fences (```json ... ```)
                json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group(0))

                    # Validate and normalize category
                    matched_category = parsed.get('category', 'All')
                    if matched_category not in VALID_CATEGORIES and matched_category != 'All':
                        matched_category = 'All'

                    # Validate budget_inr: must be a positive integer or None
                    raw_budget = parsed.get('budget_inr')
                    budget_inr = None
                    if raw_budget is not None:
                        try:
                            b = int(float(raw_budget))
                            if b > 0:
                                budget_inr = b
                        except (ValueError, TypeError):
                            budget_inr = None

                    return {
                        'conversational_reply': parsed.get(
                            'conversational_reply',
                            "I've analyzed your request and matched verified providers for you below."
                        ),
                        'extracted_filters': {
                            'category': matched_category,
                            'urgency': parsed.get('urgency', 'normal'),
                            'location': parsed.get('location'),
                            'budget_inr': budget_inr
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
        budget_inr = None

        # --- Category keyword matching ---
        if any(w in lower for w in ['pipe', 'leak', 'drain', 'water', 'tap', 'flush', 'sink', 'toilet']):
            category = 'Plumbing'
        elif any(w in lower for w in ['spark', 'shock', 'switch', 'wiring', 'fuse', 'light', 'fan', 'power', 'electric']):
            category = 'Electrical'
        elif any(w in lower for w in ['fridge', 'refrigerator', 'washing machine', 'microwave', 'oven', 'appliance', 'ac', 'cooler']):
            category = 'Appliance Repair'
        elif any(w in lower for w in ['clean', 'sweep', 'mop', 'sanitize', 'dust', 'sofa', 'carpet']):
            category = 'Cleaning'
        elif any(w in lower for w in ['wood', 'door', 'lock', 'furniture', 'cupboard', 'table', 'chair', 'carpenter']):
            category = 'Carpentry'
        elif any(w in lower for w in ['paint', 'wall', 'primer', 'color', 'distemper', 'waterproof', 'painting']):
            category = 'Painting'

        # --- Urgency detection ---
        if any(w in lower for w in ['emergency', 'urgent', 'immediately', 'asap', 'now', 'flooding', 'burst', 'danger', 'sparks', 'fire', 'gas leak']):
            urgency = 'emergency'

        # --- Location heuristic for Mangaluru localities ---
        for loc in MANGALURU_LOCALITIES:
            if loc in lower:
                location = loc.capitalize()
                break

        # --- Budget extraction ---
        # Explicit number patterns: "under 500", "max 1000", "budget 300", "less than 800", "within 600"
        budget_patterns = [
            r'under\s+(\d+)',
            r'below\s+(\d+)',
            r'less\s+than\s+(\d+)',
            r'max(?:imum)?\s+(?:budget\s+)?(\d+)',
            r'budget\s+(?:of\s+)?(\d+)',
            r'within\s+(\d+)',
            r'upto?\s+(\d+)',
            r'not\s+more\s+than\s+(\d+)',
            r'(\d+)\s*(?:rupees?|rs\.?|inr)\s+(?:per\s+hour|/\s*hr|per\s+hr)',
        ]
        for pattern in budget_patterns:
            match = re.search(pattern, lower)
            if match:
                try:
                    val = int(match.group(1))
                    if val > 0:
                        budget_inr = val
                        break
                except (ValueError, IndexError):
                    pass

        # Soft budget signals — no number given, user signals price-sensitivity
        if budget_inr is None and any(w in lower for w in ['cheap', 'affordable', 'budget', 'low cost', 'inexpensive', 'economical']):
            budget_inr = 400  # conservative default for Mangaluru market

        # --- Build reply ---
        reply = f"I understood you need assistance with {category.lower() if category != 'All' else 'general home services'}."
        if urgency == 'emergency':
            reply += " Since this is urgent, I've prioritized the fastest responding local providers for you."
        elif budget_inr:
            reply += f" I've filtered providers within your INR {budget_inr}/hr budget."
        else:
            reply += " Here are the highest-rated verified professionals ready to help."

        return {
            'conversational_reply': reply,
            'extracted_filters': {
                'category': category,
                'urgency': urgency,
                'location': location,
                'budget_inr': budget_inr
            },
            'engine': 'TrustNear Offline Heuristic NLP'
        }

ai_assistant = AIAssistant()
