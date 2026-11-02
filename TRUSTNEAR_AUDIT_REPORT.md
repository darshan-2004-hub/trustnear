# TrustNear Platform — Comprehensive Technical Audit & Forensic Remediation Report
**Project:** TrustNear (AI-Assisted Smart Local Service Discovery & Recommendation Platform)  
**Date:** November 2026  
**Auditor:** Senior Full-Stack Engineer  
**Status:** Audit Completed — Implementation Phase Ready

---

## 1. Executive Summary

A deep-dive technical audit of the **TrustNear** repository (`frontend/`, `backend/`, `database/`) was performed to evaluate runtime stability, algorithmic correctness, API schema fidelity, data integrity, and application security. 

TrustNear is designed as an autonomous local service discovery platform leveraging Machine Learning (Gradient Boosting Regressors for Trust Scores and Fair Price Estimation, SHAP attribution, and NLP VADER/TF-IDF fraud screening). However, forensic analysis identified **critical runtime bugs, signature mismatches, security escalation vectors, and client-side data fabrications** that undermine production readiness and academic credibility.

### Key Audit Highlights:
1. **Critical ML Runtime Failures:** `trust_engine.py` signature mismatch causes catastrophic `TypeError` exceptions upon review submission and automated trust recalculation. `price_estimator.py` keyword parameter mismatch causes HTTP 500 errors on the `/api/providers/estimate-price` endpoint.
2. **Recommendation Engine Edge Cases:** `ranker.py` fails with zero-division or produces unranked payloads when providers share identical metrics or when a single provider is returned.
3. **Privilege Escalation Vulnerability:** The public registration endpoint (`POST /api/auth/register`) accepted `role: "admin"`, allowing any external client to obtain administrator privileges without verification.
4. **Data Fabrication:** The frontend contained multiple hardcoded fallback values (`4.9` rating, `24` jobs, `88` trust score, `142` completed jobs, synthetic SHAP attribution factors, `94.2` provider trust) that masked database empty states and presented artificial statistics.
5. **Taxonomy & Category Discrepancies:** Category naming was mismatched across modules (`Home Cleaning` in database seed data vs `Cleaning` in filter components), breaking query routing and price regression.
6. **Authorization & Provider Verification Gaps:** Customers were able to place bookings with unverified (`pending` or `rejected`) and unavailable providers.

---

## 2. Comprehensive Forensic Findings

### Finding 1: `trust_engine.py` Signature & Type Mismatch
- **Location:** `backend/ml/trust_engine.py` (Line 65) vs `backend/ml/recalculator.py` (Line 54) & `backend/ml/seed_data.py` (Line 116)
- **Problem Description:**  
  `TrustEngine.calculate_and_explain` was defined with four positional parameters:
  ```python
  def calculate_and_explain(self, completed_jobs, cancellation_rate, avg_response_minutes, review_sentiment_avg):
  ```
  However, both `recalculator.py` and `seed_data.py` invoked this method passing a single dictionary:
  ```python
  result = trust_engine.calculate_and_explain(metrics)
  ```
- **Runtime Impact:**  
  Triggers `TypeError: TrustEngine.calculate_and_explain() missing 3 required positional arguments`. Whenever a customer completes a job and submits a review via `POST /api/reviews`, the backend fails with HTTP 500 during step 5 (`recalculate_provider_trust`), preventing review storage and trust recalculation.
- **Remediation:**  
  Update `calculate_and_explain` to flexibly accept either a single dictionary containing metric keys OR positional/keyword arguments, with default fallbacks and strict numeric casting.

---

### Finding 2: `price_estimator.py` Keyword Argument Mismatch
- **Location:** `backend/ml/price_estimator.py` (Line 30) vs `backend/routes/provider_routes.py` (Lines 90–94)
- **Problem Description:**  
  In `price_estimator.py`, the parameter was declared as `category_name`:
  ```python
  def estimate_price_range(self, category_name, duration_hours, is_emergency=False):
  ```
  In `provider_routes.py`, the route called:
  ```python
  estimation = price_estimator.estimate_price_range(
      category=category,  # Unexpected keyword 'category'
      duration_hours=duration_hours,
      is_emergency=is_emergency
  )
  ```
- **Runtime Impact:**  
  Triggers `TypeError: estimate_price_range() got an unexpected keyword argument 'category'` whenever `POST /api/providers/estimate-price` is called, breaking the Fair Price Calculator modal in the frontend.
- **Remediation:**  
  Update `estimate_price_range` signature to accept `category=None, category_name=None`, resolving category name gracefully, and support case-insensitive category lookups with aliases (`Cleaning` vs `Home Cleaning`).

---

### Finding 3: `ranker.py` Recommendation Engine Edge Cases
- **Location:** `backend/ml/ranker.py` (Lines 17–19, 29–35, 40–43)
- **Problem Description:**  
  1. **Single Provider Bypass:** When `len(providers) <= 1`, the function returned `providers` without setting `personalized_score`, `match_percentage`, or `active_priority`. Any caller expecting `provider['match_percentage']` received `undefined`.
  2. **Zero Division & Uniform Values:** When all providers possess identical values for a metric (e.g., all have `hourly_rate = 350`), `max_val == min_val`. While `normalize` had a guard, returning `1.0` unconditionally inverted price and speed calculations counter-intuitively.
  3. **Null Field Crash:** If any provider dictionary has `None` for `trust_score`, `hourly_rate`, or `avg_response_minutes`, `min()` and `max()` fail with `TypeError: '<' not supported between instances of NoneType and float`.
- **Remediation:**  
  Sanitize all input dictionaries with safe defaults (`hourly_rate=0.0`, `trust_score=50.0`, `avg_response_minutes=30`), handle `len(providers) == 1` by returning `100.0%` match, and guard min-max bounds safely.

---

### Finding 4: Security Vulnerability — Public Admin Registration
- **Location:** `backend/routes/auth_routes.py` (Lines 54, 61)
- **Problem Description:**  
  ```python
  role = data.get('role', 'customer').strip().lower()
  if role not in ['customer', 'provider', 'admin']:  # Allows public admin signup!
      return jsonify({'success': False, 'message': 'Invalid role.'}), 400
  ```
  Any public client could dispatch `POST /api/auth/register` with `{"role": "admin"}` and obtain a verified administrator JWT token, granting immediate access to the `/api/admin` console, provider approvals, and review moderation.
- **Remediation:**  
  Restrict public registration strictly to `['customer', 'provider']`. Explicitly reject any registration request specifying `admin` with HTTP 403 Forbidden. Admin creation must only occur via dedicated administrative seeding (`seed_admin.py`) or superadmin promotion.

---

### Finding 5: Booking Authorization & Provider Verification Deficiencies
- **Location:** `backend/routes/booking_routes.py` (Lines 36–39)
- **Problem Description:**  
  When creating a booking:
  ```python
  provider = User.query.filter_by(id=provider_id, role='provider').first()
  ```
  The endpoint never checked `ProviderProfile.verification_status` or `ProviderProfile.is_available`. Consequently:
  - Customers could book providers whose identity/credentials were rejected or pending.
  - Customers could book providers marked as unavailable.
- **Remediation:**  
  Join or verify `ProviderProfile.query.filter_by(user_id=provider_id).first()`. Enforce `verification_status == 'verified'` and `is_available == True` before confirming booking creation.

---

### Finding 6: Fabricated Data & Artificial Fallbacks in Frontend
- **Locations:**
  - `frontend/src/components/ProviderCard.jsx` (Lines 8–12):
    ```javascript
    const rating = provider.rating || 4.9; // Fabricated rating
    const reviewsCount = provider.completed_jobs || provider.reviews_count || 24; // Fabricated 24
    const hourlyRate = provider.hourly_rate || 350; // Hardcoded 350
    const trustScore = provider.trust_score || provider.trust_metrics?.trust_score || 88; // Hardcoded 88
    ```
  - `frontend/src/components/TrustBadge.jsx` (Lines 83–98):
    Hardcoded SHAP list displaying `+18.4 Completed Jobs`, `+12.1 Low Cancellation Ratio`, and `+8.5 NLP Review Sentiment` whenever real SHAP factors were empty or baseline.
  - `frontend/src/pages/Home.jsx` (Lines 47, 75, 85):
    `totalCompletedJobs: totalJobs > 0 ? totalJobs : 142` (Fake 142 completed jobs fallback) and `avgRating: '4.8'`.
  - `frontend/src/pages/Bookings.jsx` (Line 121):
    `const providerTrustScore = user?.trust_metrics?.trust_score || 94.2;` (Fake 94.2 trust score).
  - `frontend/src/components/InvoiceModal.jsx` (Line 34):
    `const agreedPrice = parseFloat(booking.agreed_price) || 350;` (Fake 350 default).
  - `frontend/src/pages/AdminDashboard.jsx` (Lines 18–25):
    Initial fake stats `{ total_customers: 3, total_providers: 7, ... }`.
  - `frontend/src/components/ProviderMap.jsx` (Line 78):
    `★ {p.rating || 4.9}`.
- **Remediation:**  
  Remove all fake numeric fallbacks across every component. Replace with authentic database values, clear `"New Provider"` / `"No reviews yet"` indicators, and baseline transparency notices.

---

### Finding 7: API Field Standardization (Rating & Review Metrics)
- **Location:** `backend/routes/provider_routes.py` (Lines 48–67)
- **Problem Description:**  
  The backend `get_providers` query retrieved `ProviderProfile`, `User`, and `TrustMetric`, but **omitted aggregated review ratings and counts**. Thus `provider.rating` and `provider.reviews_count` were always `undefined`, directly triggering the frontend fallbacks.
- **Remediation:**  
  Aggregate `Review.rating` (`func.avg`) and `func.count(Review.id)` for approved non-suspicious reviews in `get_providers` and `get_provider_details`, returning exact numeric ratings (or `null` if no reviews exist) and verified review counts.

---

### Finding 8: Service Category Standardization
- **Location:** DB schema, `backend/ml/seed_data.py`, `backend/ml/price_estimator.py`, `frontend/src/pages/Home.jsx`, `frontend/src/pages/SearchProviders.jsx`
- **Problem Description:**  
  In `Home.jsx`, the category was named `'Home Cleaning'`. In `SearchProviders.jsx` and `price_estimator.py`, it was `'Cleaning'`. In `seed_data.py`, it was `'Home Cleaning'`. When navigating from Home to Search, the active category chip was desynchronized. Furthermore, `Painting` was missing from `ai_assistant.py` valid categories.
- **Remediation:**  
  Standardize canonical category names across all systems:
  - `Plumbing`
  - `Electrical`
  - `Carpentry`
  - `Cleaning`
  - `Appliance Repair`
  - `Painting`  
  Provide bidirectional aliases in backend routes (`Cleaning` <-> `Home Cleaning`) so existing records remain fully compatible.

---

### Finding 9: Frontend Search Integration & Match Score Binding
- **Location:** `frontend/src/pages/SearchProviders.jsx` (Line 192)
- **Problem Description:**  
  `SearchProviders.jsx` looked for `provider.match_score`, while `backend/ml/ranker.py` returned `match_percentage` and `personalized_score`. Consequently, the match percentage pill never rendered.
- **Remediation:**  
  Populate both `match_percentage` and `match_score` in `ranker.py` and bind both in `SearchProviders.jsx`. Support both `/providers` and `/search` URL paths seamlessly.

---

### Finding 10: Security, CORS, JWT & Environment Validation
- **Location:** `backend/config.py`, `backend/app.py`, `.gitignore`
- **Problem Description:**  
  1. Default JWT secret fallback was `"fallback-secret-key"`. In production or staging, an unconfigured secret should generate a secure transient secret or explicitly warn.
  2. CORS was configured with wildcard `origins: "*"` without configurable environment support.
  3. `.gitignore` lacked explicit entries for `.env.*` and nested virtual environments.
- **Remediation:**  
  Improve `config.py` environment parsing, add robust `.gitignore` rules, and enforce strict input validation on registration and booking fields.

---

## 3. Detailed File Remediation Matrix

| Target File | Component | Action Required |
|---|---|---|
| `backend/ml/trust_engine.py` | ML Engine | Allow dictionary or 4 positional args in `calculate_and_explain`. Add strict float/int casting. |
| `backend/ml/price_estimator.py` | ML Engine | Accept both `category` and `category_name`. Add category aliases (`Home Cleaning` -> `Cleaning`). |
| `backend/ml/ranker.py` | ML Ranker | Handle `len(providers) <= 1`, null values, and zero division. Populate `match_percentage` & `match_score`. |
| `backend/ml/ai_assistant.py` | ML Engine | Add `Painting` to `VALID_CATEGORIES` and NLP keyword heuristics. Support `Cleaning`. |
| `backend/routes/auth_routes.py` | API Auth | Block `admin` role in `POST /api/auth/register`. Validate phone format and password length. |
| `backend/routes/provider_routes.py` | API Providers | Aggregate and return real `rating` and `reviews_count`. Support `id` or `user_id` in provider details. |
| `backend/routes/booking_routes.py` | API Bookings | Enforce provider verification check (`verification_status == 'verified'`) and availability (`is_available == True`). |
| `backend/config.py` | Backend Config | Improve JWT secret handling and configurable CORS origins. |
| `backend/app.py` | Flask App | Use configurable CORS origins with localhost fallbacks. |
| `.gitignore` | Git Config | Ensure `.env`, `.env.*`, `*.pyc`, `venv/`, and `__pycache__/` are thoroughly ignored without exposing secrets. |
| `frontend/src/components/ProviderCard.jsx` | UI Component | Remove fake `4.9`, `24`, `350`, `88` fallbacks; display authentic `"New"` or real DB values. |
| `frontend/src/components/TrustBadge.jsx` | UI Component | Remove synthetic SHAP factors; display authentic `"Baseline Trust"` explanatory state. |
| `frontend/src/pages/Home.jsx` | UI Page | Remove fake `142` completed jobs fallback and `4.8` average rating. Standardize category names. |
| `frontend/src/pages/SearchProviders.jsx` | UI Page | Standardize category list (`Cleaning`), bind `match_percentage`, sync query params. |
| `frontend/src/pages/Bookings.jsx` | UI Page | Remove fake `94.2` provider trust fallback; display actual provider trust score. |
| `frontend/src/pages/AdminDashboard.jsx` | UI Page | Replace fake initial stats with `0` defaults. |
| `frontend/src/components/InvoiceModal.jsx` | UI Component | Remove fake `350` agreed price fallback; show real booking price or `0.00`. |
| `frontend/src/components/ProviderMap.jsx` | UI Component | Remove fake `4.9` rating fallback in map popup. |
| `frontend/src/components/ReviewModal.jsx` | UI Component | Correctly reference `result.review?.sentiment_score` and `booking.counterpart?.full_name`. |

---

## 4. Verification and Testing Strategy

1. **Unit & Integration Test Suite (`backend/tests/test_audit_fixes.py`):**
   - Test `trust_engine.calculate_and_explain` with single dictionary and multiple positional arguments.
   - Test `price_estimator.estimate_price_range` with `category="Plumbing"` and `category_name="Plumbing"`.
   - Test `ranker.personalize_ranking` with empty list, single provider, uniform metrics, and mixed priorities (`trust`, `price`, `speed`).
   - Test `auth_routes.py` to assert that registration with `role="admin"` returns HTTP 403 Forbidden.
   - Test `booking_routes.py` to assert that booking an unverified or unavailable provider returns an error.
2. **Database Seeding Execution (`backend/ml/seed_data.py`):**
   - Execute seed script to ensure `trust_engine` works end-to-end with real database insertion and zero runtime errors.
3. **Frontend Static Syntax & Build Verification:**
   - Verify that all modified React JSX files are syntactically valid and free of broken bindings.

---
*Report generated for TrustNear repository audit.*
