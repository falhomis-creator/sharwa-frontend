# One-time codes (OTP) — cross-reference

> **Source**: DOC-025 · inventory A.4 · INT-002, INT-003, INT-022, INT-030, INT-041, INT-046, INT-048
> **Code**: `sharwa_saas/api/views_onboarding.py` · `api/views_auth.py` · `products/services/{storefront_checkout_service,storefront_wallet_service,engagement_service,pos_service,checkout_service}.py` · `sharwapay/customer_api.py` · `products/models/staff_pos.py` (`OTPChallenge`)
> **Frontend**: `sharwa-frontend/src/lib/{api-client,api-error}.ts` · `src/lib/bff/auth-adapter.ts`
> **Tests**: `api/test_onboarding_api.py` (28) · `api/test_dashboard_api.py::ForgotResetApiTests` · `api/test_storefront_checkout_api.py` (10) · `api/test_wallets_api.py` (5) · `api/test_engagement_api.py` (4) · `api/test_pos_api.py` (17) · `api/test_sharwa_pay_api.py` (9)
> **Last verified against code**: 2026-10-27 (step 03)

Every WhatsApp code the platform issues, in one table. If a route asks the caller for a code, it is listed here; if it is not listed, it does not use one. Identity and session rules are in [`auth.md`](auth.md); the CSRF handshake that precedes every `POST` below is in [`csrf.md`](csrf.md); error shapes are in [`conventions.md`](conventions.md).

Fixture values only: the DEBUG static code is `123456`; phones are `9677XXXXXXXX` placeholders.

## 1. One row per family

| # | Family | Routes (under `/api/v1/`) | Channel | Code storage | Send limits | Verify lock | Key error codes | Test |
|---|---|---|---|---|---|---|---|---|
| 1 | [Onboarding](#onboarding) | `public/register/` (send) · `public/register/verify-otp/` · `public/register/resend-otp/` | WhatsApp to the owner phone | cache `onboarding:pending:<token>` (30 min); code is **HMAC** (`salted_hmac("sharwa.onboarding.otp", token:code)`) | 30 s resend cooldown · 3 / 600 s per phone · per-IP cap `ONBOARDING_SENDS_PER_IP_PER_HOUR` (1500) | 3 wrong → 600 s lock per phone | 410 expired · 400 `code` wrong · 429 + `Retry-After` · 502 resend failure | `test_onboarding_api.py` |
| 2 | [Owner password reset](#owner-reset) | `auth/forgot-password/` · `auth/reset-password/` | WhatsApp to the owner phone | cache `auth:reset:<schema>:<token>`, **HMAC** | 3 sends / 10 min | 3 wrong → 600 s lock | 429 (always reports 600 s) · 400 | `test_dashboard_api.py::ForgotResetApiTests` |
| 3 | [Checkout — COD](#cod) | `checkout/cod-otp/send/` · `checkout/cod-otp/verify/` (+ order placement) | WhatsApp to the buyer phone | **plain** in the session (`cod_otp`, `cod_otp_phone`, `cod_otp_created_at`), TTL 600 s | device tracker (3) + session bucket + phone cache 3 / 600 s | device blocked → 429 | 400 · 429 · 502 | `test_storefront_checkout_api.py` |
| 4 | [Checkout — Sharwa Pay](#checkout-pay) | `checkout/sharwa-pay/otp/send/` (+ order placement) | WhatsApp | **plain** in the session (`sharwa_pay_otp*`), TTL 600 s | session bucket + phone cache 3 / 600 s | 429 at order time | 400 no balance · 429 · 502 | `test_storefront_checkout_api.py` |
| 5 | [Wallet & loyalty](#wallet-loyalty) | `wallet/otp/send/` · `loyalty/otp/send/` · `loyalty/redeem/` (+ order placement) | WhatsApp | **plain** in the session (`wallet_checkout_otp*`), TTL 600 s | session bucket + phone cache 3 / 600 s | 429 on verify | 400 · 404 · 429 | `test_wallets_api.py` |
| 6 | [Engagement (buyer)](#engagement) | `customers/otp/send/` · `catalog/products/<id>/reviews/` (`otp` field) | WhatsApp | **plain** in the session (`buyer_otp:<purpose>`), TTL 600 s | 60 s resend · 3 / 600 s per purpose | 5 wrong → 429 | 400 · 429 + `retry_after` | `test_engagement_api.py` |
| 7 | [POS large refund](#pos-refund) | `pos/orders/<pk>/refund/` | WhatsApp to the **store** number | `OTPChallenge` row, **hashed** (`make_password`), TTL 300 s | 3 / 600 s per receipt | 3 wrong → 900 s lock per order | **428** `otp_required` · 400 · 429 · 502 | `test_pos_api.py` |
| 8 | [Sharwa Pay customer](#sharwa-pay-otp) | `sharwa-pay/otp/send/` · `sharwa-pay/otp/verify/` | WhatsApp | session `sharwa_pay_api_otp`, **HMAC** | 3 / 600 s per phone | 5 wrong → 300 s lock | 429 · 400 | `test_sharwa_pay_api.py` |
| — | [Auction bids](#auctions) | `catalog/auctions/…/bids/` | none | — | — | — | — | — |

## 2. Details per family

<a id="onboarding"></a>
### 2.1 Onboarding (new store registration)

Public schema only; on a store host every route answers **404** «غير موجود.».

1. `public/register/` validates the form and stores the pending request in the cache for 30 minutes (`onboarding:pending:<token>`), sends the code and returns the token.
2. `public/register/verify-otp/` checks the code against the HMAC. A code is valid for 600 s from sending.
3. `public/register/resend-otp/` re-sends (30 s cooldown).

| Case | Status | Body |
|---|---|---|
| Pending request gone (verify) or code older than 10 min | 410 | «انتهت صلاحية الرمز» |
| Pending request gone (resend) | 410 | «انتهت صلاحية الطلب، ابدأ من جديد.» |
| Wrong code | 400 | `{"code":["الرمز غير صحيح"]}` |
| Too many sends / locked | 429 | «محاولات كثيرة، حاول بعد N ثانية» + `Retry-After` |
| First send fails | 400 | `{"merchant_phone":[MSG_SEND_FAILED]}` |
| Resend fails | 502 | send-failure message |
| Store-creation rate limit | 429 | `MSG_CREATION_LIMIT` |

Limits: 3 sends / 600 s per phone (`rl:public:onboarding_send:phone:<phone>`); 3 wrong verifies lock the phone for 600 s (`rl:public:onboarding_verify:lock:<phone>`). With `DEBUG` the code is the static `123456`.

> ⚠️ Discrepancy — the two 410 messages mean different things: «انتهت صلاحية الرمز» can mean either "the pending request expired (30 min)" or "the code is older than 10 min", while resend uses a separate wording. Clients should treat any 410 as "start again or resend".

<a id="owner-reset"></a>
### 2.2 Owner password reset

Documented in full at [`m03-auth.md#password-reset`](../domains/02-dashboard-shell/m03-auth.md#password-reset). Summary: the code is an HMAC kept in the cache under `auth:reset:<schema>:<token>`; 3 sends per 10 minutes per phone; 3 wrong codes lock the token for 600 s. Reset does not revoke the owner's other sessions.

<a id="cod"></a>
### 2.3 Checkout — cash on delivery

`checkout/cod-otp/send/` then `checkout/cod-otp/verify/`; the proof is consumed once at order placement.

- **Send guards** (in order): device tracker `OTPRequestTracker` in the public schema (device id = `client_uuid`, else `uuid5` of the session key) → blocked device 429 «تم حظر جهازك مؤقتاً بسبب طلبات متكررة. يرجى المحاولة لاحقاً.»; `request_count >= 3` 429 «تم تجاوز عدد محاولات إرسال الرمز (3 محاولات). يرجى المحاولة بعد قليل.»; then the session bucket `rate_limit_attempt` and `phone_cache_rate_limited` (3 per 600 s per phone).
- **Request bodies**: send `{phone}` → `{ok: true}` (invalid phone → 400 `{"phone":["رقم واتساب غير صحيح."]}`); verify `{phone, otp}`.
- **Verify**: 400 «يرجى إرسال رمز التحقق عبر واتساب أولاً.» (nothing sent) · 400 «انتهت صلاحية رمز التحقق. يرجى إعادة إرساله.» · 400 «رمز التحقق غير صحيح.» · 429 «تم تجاوز عدد محاولات التحقق. يرجى المحاولة بعد قليل.». Success: `{ok: true, cod_allowed: true|false, reason}`; the session then holds `cod_otp_verified_phone`.
- **At order time** (`check_cod_otp`): missing proof → «يرجى إدخال رمز التحقق المرسل عبر واتساب لتأكيد الطلب عند الاستلام.».
- Send failure: 502 «تعذّر إرسال رمز التحقق عبر واتساب. يرجى المحاولة مرة أخرى.».

<a id="checkout-pay"></a>
### 2.4 Checkout — Sharwa Pay wallet payment

`checkout/sharwa-pay/otp/send/` requires an active wallet with a positive balance, otherwise 400 «لا يوجد رصيد شروة باي متاح لهذا الرقم.». Returns `{ok, display_balance}`. Verification happens inside order placement (`check_sharwa_pay_otp`): «يرجى إرسال رمز التحقق عبر واتساب أولاً للدفع بشروة باي.», «رمز التحقق من شروة باي غير صحيح.», «تم تجاوز عدد محاولات التحقق من شروة باي. يرجى المحاولة بعد قليل.». Send failure: 502 «تعذّر إرسال رمز التحقق. يرجى المحاولة مرة أخرى.».

<a id="wallet-loyalty"></a>
### 2.5 Store wallet and loyalty points

`wallet/otp/send/` and `loyalty/otp/send/` share the session keys `wallet_checkout_otp`, `wallet_checkout_otp_phone`, `wallet_checkout_otp_created_at`.

- Send needs a wallet with balance — 400 «لا يوجد رصيد متاح لهذا الرقم.» — or points — 400 «لا توجد نقاط متاحة لهذا الرقم.». Loyalty disabled → 404 «برنامج الولاء غير مفعّل في هذا المتجر.».
- Limits: session bucket + phone cache 3 / 600 s; 429 «تم تجاوز عدد محاولات إرسال رمز التحقق. يرجى المحاولة بعد قليل.» (verify: «تم تجاوز عدد محاولات التحقق. يرجى المحاولة بعد قليل.»).
- `loyalty/redeem/` (`LoyaltyRedeemView` → `verify_loyalty_otp`) returns `{ok, points}` and stores `loyalty_redeem_verified {phone, at}` valid 600 s; it is consumed at order placement.
- Order-time wallet check (`check_wallet_otp`): «يرجى إرسال رمز التحقق عبر واتساب أولاً لاستخدام رصيد المحفظة.», «رمز التحقق من المحفظة غير صحيح.», «تم تجاوز عدد محاولات التحقق من رمز المحفظة. يرجى المحاولة بعد قليل.».

<a id="engagement"></a>
### 2.6 Engagement (reviews, auctions, wishlist, back-in-stock)

`customers/otp/send/` takes a `purpose` of `review | auction | wishlist | back_in_stock`; anything else is 400 `{"purpose":["غرض غير معروف."]}`.

- Session key `buyer_otp:<purpose>` = `{phone, code, at, wrong, verified}`; TTL 600 s.
- Resend before 60 s → 429 `{"detail": «حاول بعد N ثانية.», "retry_after": N}`. Sends: session + `buyer_otp_send_<purpose>` 3 / 600 s. 5 wrong codes → 429 «محاولات كثيرة، اطلب رمزاً جديداً بعد قليل.».
- Only the review `POST` (`catalog/products/<id>/reviews/` with an `otp` field) consumes a code: 400 `{"otp":[«اطلب رمز التأكيد أولاً.» | «انتهت صلاحية الرمز، اطلب رمزاً جديداً.» | «الرمز غير صحيح.»]}`.

> ⚠️ Discrepancy — purposes `auction`, `wishlist` and `back_in_stock` can be issued but no route consumes them. Roadmap/inventory imply they gate those actions; the code does not.

<a id="pos-refund"></a>
### 2.7 POS large refund

`pos/orders/<pk>/refund/` with an amount above the store setting `pos_refund_otp_threshold` and no `otp_code`:

1. An `OTPChallenge(purpose='large_refund')` is created and sent to the **store** WhatsApp number.
2. The response is **428** `{"code":"otp_required","detail":«استرجاع كبير — أدخل رمز التحقق المرسل إلى جوال مالك المتجر.»,"challenge":"large_refund","sent_to":…}`.
3. The client repeats the request with `otp_code`.

The challenge is bound to the receipt and amount through `target_ref = pos_refund:<order_id>:<amount>`; TTL 300 s. `OTPChallenge.code_hash` stores `make_password(code)` — the raw code is never stored. With `DEBUG` the code is `123456`.

| Case | Status | Body |
|---|---|---|
| 3 sends / 600 s per receipt exceeded | 429 | «أُرسلت رموز تحقق كثيرة لهذا الإيصال — انتظر 10 دقائق.» |
| 3 wrong codes (lock 900 s, cache `pos:refund_otp_fail:<schema>:<order_id>`) | 429 | «أُقفل الاسترجاع مؤقتاً بعد 3 محاولات خاطئة. حاول بعد 15 دقيقة أو راجع المدير.» |
| Wrong code | 400 | `{"otp_code":["رمز التحقق غير صحيح. المتبقي N محاولتان/محاولة."]}` |
| Store has no WhatsApp number | 400 | «لا يوجد رقم واتساب مسجَّل للمتجر لإرسال رمز التحقق — راجع المالك.» |
| Send failed | 502 | «تعذّر إرسال رمز التحقق إلى واتساب المتجر. حاول مرة أخرى.» |

<a id="sharwa-pay-otp"></a>
### 2.8 Sharwa Pay customer login

`sharwa-pay/otp/send/` / `otp/verify/`: 3 sends per 600 s per phone, 5 wrong codes lock for 300 s, code kept as HMAC in the session key `sharwa_pay_api_otp`. Full flow and error table: [`auth.md#sharwa-pay`](auth.md#sharwa-pay) and [`m40-sharwa-pay.md#auth`](../domains/08-finance/m40-sharwa-pay.md#auth).

<a id="auctions"></a>
### 2.9 Auction bids — no OTP

Bids are accepted with name + phone only (decision recorded in M37; see the comment in `api/urls.py`). The `auction` purpose in §2.6 is therefore unused.

## 3. Storage: plain vs hashed

| Storage | Families | Note |
|---|---|---|
| HMAC (cache or session) | onboarding, owner reset, Sharwa Pay customer | code cannot be read back from the store |
| Hashed DB row (`make_password`) | POS refund (`OTPChallenge`) | the only family with a persisted, auditable challenge row |
| **Plain text in the session** | COD, checkout Sharwa Pay, wallet/loyalty, engagement | session table is per tenant; anyone with DB read access can see live codes (TTL 600 s) |

> ⚠️ Discrepancy / decision — storefront codes are stored in plain text in the session; checkout and wallet 429 responses carry no `Retry-After` header (the engagement family returns `retry_after` in the body instead; onboarding sets the header). Raised as a decision for fares.

## 4. Rules shared by all families

- Every send is a `POST` and needs the normal CSRF handshake where the caller is an authenticated owner/staff; storefront routes are CSRF-exempt (see [`csrf.md`](csrf.md)).
- Codes are delivered by WhatsApp only (no SMS/e-mail channel exists).
- `DEBUG` swaps the random code for `123456` in onboarding and POS refund; never rely on it outside local development.
- Legacy Django HTML OTP screens (`products/views/auth_security.py`, `tenants/views.py`) are not part of the API contract and are not documented here.

## 5. Reproduce (curl, fixture host)

```bash
# 1. get a CSRF cookie + token (needed by owner/staff routes; harmless for storefront)
curl -s -c jar.txt http://noor.localhost:8000/api/v1/auth/csrf/
# 2. request a COD code (storefront, no token enforced)
curl -s -b jar.txt -c jar.txt -H 'Content-Type: application/json' \
  -d '{"phone":"9677XXXXXXXX"}' http://noor.localhost:8000/api/v1/checkout/cod-otp/send/
# 3. verify (DEBUG code)
curl -s -b jar.txt -H 'Content-Type: application/json' \
  -d '{"phone":"9677XXXXXXXX","otp":"<code received on WhatsApp>"}' http://noor.localhost:8000/api/v1/checkout/cod-otp/verify/
```

Request fields: `phone` on send; `phone` + `otp` on verify (the field is `otp`, not `code`). Send answers `{"ok": true}`; an invalid phone answers 400 `{"phone":["رقم واتساب غير صحيح."]}`. Outside `DEBUG` the code arrives on WhatsApp only — the `123456` fixture applies to onboarding and POS refund.
