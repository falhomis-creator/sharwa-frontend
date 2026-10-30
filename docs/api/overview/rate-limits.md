# Rate limits and lockouts

> **Source**: DOC-035 · inventory A.4, A.11 · INT-003, INT-014, INT-016, INT-029, INT-030, INT-033, INT-036, INT-039, INT-048
> **Code**: `products/utils.py` (`rate_limit_attempt`, `cache_rate_limit`, `phone_cache_rate_limited`, `session_creation_rate_limited`) · `api/views_auth.py` · `api/views_onboarding.py` · `api/views_platform.py` · `api/views.py` · `api/views_push.py` · `api/views_reports.py` · `api/views_dashboard.py` · `api/views_customers.py` · `api/authentication.py` · `products/services/{storefront_checkout,storefront_wallet,checkout,engagement,pos,booking,behavior}_service.py` · `sharwapay/customer_api.py` · `tenants/views.py` · `config/middleware.py` · `config/settings.py` (`REST_FRAMEWORK`)
> **Frontend**: `src/lib/api-client.ts`, `src/lib/api-error.ts` (error parsing; how the BFF passes a `429` on is in `bff.md`)
> **Last verified against code**: 2026-10-27 (step 04)

Every limit that can answer `429` is listed here with its number, what it is counted by, and how long it lasts. OTP-specific rules (codes, expiry, resend) are in [`otp.md`](otp.md); who may sign in and how sessions work are in [`auth.md`](auth.md). Error bodies are in [`conventions.md`](conventions.md) and `errors.md`.

All numbers are the values in code on the review date. Where a number can be changed from Django settings, the setting is named.

## 1. The stance: limit the person, not the network

<a id="cgnat"></a>

Internet providers in Yemen put thousands of real users behind one public IP address (CGNAT). A strict per-IP limit would lock out honest customers because of strangers. So the platform follows this rule (owner decision of 2026-10-21):

1. **The real protection is per phone number, per session, per username or per device.** A phone is the thing an attacker must change to get around the limit.
2. **Per-IP limits are loose ceilings** against automated floods (hundreds per hour), never a tight cap on a person. The tight ones that remain (staff and merchant sign-in) count **failures**, not requests.
3. **A client must not treat a `429` as proof of abuse.** Show the wait time and let the person retry later.

`RealIpMiddleware` (`config/middleware.py`) makes the per-IP counters meaningful behind the reverse proxy. It replaces `REMOTE_ADDR` with the address that **our own proxy** appended to `X-Forwarded-For` (counted from the right), and only when the connection really came from a trusted proxy (`REAL_IP_TRUSTED_PROXIES`). A client cannot choose its own address by sending that header.

Every per-IP counter on this page (sign-in, onboarding, provisioning poll, setup-password, auction bid, install-event, push subscribe) reads `REMOTE_ADDR`, so all of them depend on that middleware. Without a correct trusted-proxy setting every visitor would share the proxy's address and one counter, which is the failure the middleware's own comment describes. Which address the Next.js BFF forwards upstream is described in `bff.md`.

## 2. How a limit answers

A limited call answers `429 Too Many Requests` with a JSON body. Three details differ between routes, so read them from this table and do not assume.

| Signal | Where it appears | What to do |
|---|---|---|
| `Retry-After` header (seconds) | sign-in lockouts, setup-password, owner reset, onboarding, reports and dashboard refresh, push test, Sharwa Pay, buyer OTP send | prefer it |
| `retry_after` field in the body (seconds) | Sharwa Pay (also in the header), buyer OTP resend and send limit (the server moves it into the header and removes it from the body on the engagement routes) | use it if no header |
| neither | the OTP session/phone limits on checkout, wallet and loyalty; the 60 s order limit; booking holds; customer export; POS refund and manager code; supplier connect and fetch; review posting; auction bid, install-event and push subscribe | show the `detail` text and let the person retry later |

The body is `{"detail": "<Arabic message>"}` on almost every route. Exceptions: `{"otp": [...]}` on checkout when the code check is what is limited; `{"status": "throttled"}` on the provisioning poll; `{"ok": false, "error": "..."}` on the legacy Django storefront pages (section 6, last note).

> ⚠️ Discrepancy — the roadmap describes one `429` shape with `Retry-After`. In code only some routes set the header. Treat `Retry-After` as optional on every route, and fall back to a fixed wait you choose (60 s is safe for every limit below except the sign-in lockouts, which are 15 minutes).

A limit that counts in the shared cache (Redis in production) applies to every server process at once. A limit that counts in the session (section 3, "session") lasts as long as that browser session and is not shared between devices.

## 3. Shared building blocks

Four helpers do most of the work. Knowing them explains why the same OTP route can be limited in more than one way at the same time.

| Helper | Counts by | Default | Storage | Notes |
|---|---|---|---|---|
| `rate_limit_attempt(request, key)` | **session** + the key (usually action + phone) | 3 per 600 s | the session record | trips for that session only. Clearing cookies resets it, which is why the phone limit below also exists |
| `phone_cache_rate_limited(request, action, phone)` | **phone** + action, per store | 3 per 600 s | cache | ignores the session, so a new session does not help. Reset to zero by a successful verification of the same action |
| `cache_rate_limit(key, max, window)` | any key | per call | cache | atomic add-then-increment, safe under parallel requests |
| `session_creation_rate_limited` | session | 2 per 3600 s | cache | used only by the legacy Django store-creation page (`tenants/views.py`) |

Routes that use both of the first two return `429` as soon as **either** trips. In practice a person gets three sends and three verification tries per phone in ten minutes.

## 4. Sign-in and password lockouts

These count **failures**. The counter is checked **before** the password is checked, so a correct password is also refused while the lock is on. A successful merchant or console sign-in clears the per-phone (or per-username) counter.

| Route | Counted by | Limit | Lock | Response |
|---|---|---|---|---|
| `POST auth/merchant/login/` | phone, and IP | 5 failures per phone, 20 per IP | 900 s window | `429`, `Retry-After: 900` |
| `POST auth/staff/login/` | phone, and IP | 5 failures per phone, 20 per IP | 900 s window | `429`, `Retry-After: 900` |
| `POST platform/auth/login/` (console) | username, and IP | 5 failures per username, 100 per IP | 900 s window | `429`, `Retry-After: 900` |
| `POST auth/merchant/setup-password/` | IP | 10 calls per 900 s (every call counts) | 900 s | `429` `{"detail": "محاولات كثيرة، حاول بعد 900 ثانية"}`, `Retry-After: 900` |
| `POST auth/merchant/forgot-password/` | store phone | 3 sends per 600 s | 600 s | `429` through `too_many`, `Retry-After` |
| `POST auth/merchant/reset-password/` | store phone | the **3rd** wrong code starts the lock and discards the pending reset (the first two answer `400`) | 600 s | `429` through `too_many`, `Retry-After` is the time left |

Notes:

- The failure message for a wrong phone and a wrong password is the same (no account enumeration). The lock message is `تم تجاوز عدد محاولات الدخول المسموح بها. يرجى المحاولة بعد 15 دقيقة.` for merchant and staff.
- The window is a fixed 15 minutes from the first counted failure. It is not extended by more failures.
- The per-IP ceiling is 100 for the console and 20 for merchant and staff sign-in. Both count failures only; a successful sign-in does not clear the IP counter.

See [`auth.md`](auth.md) for the sign-in flow and [`otp.md`](otp.md#owner-reset) for the reset code.

## 5. Public onboarding

Routes under `public/register/` and the provisioning poll. Phone limits are strict; IP limits are loose ceilings (section 1).

| Action | Counted by | Limit | Response |
|---|---|---|---|
| Resend a code | the pending registration | one resend per **30 s** (`RESEND_COOLDOWN_SECONDS`), checked before the send limits | `429`, `Retry-After` is the time left |
| Send a code (register and resend together) | phone | **3 per 600 s**; every attempt counts, including one the IP ceiling then refuses | `429`, `Retry-After: 600` |
| Send a code | IP | **1500 per 3600 s** (setting `ONBOARDING_SENDS_PER_IP_PER_HOUR`) | `429`, `Retry-After: 3600` |
| Wrong codes | phone | the **3rd** wrong code starts a 600 s lock (`VERIFY_FAILURES_PER_PHONE`, `VERIFY_LOCK_SECONDS`); the first two answer `400` `{"code": [...]}` | `429`, `Retry-After` is the lock time left |
| Create the store | IP | **500 per 3600 s** (setting `ONBOARDING_CREATIONS_PER_IP_PER_HOUR`) | `429` `{"detail": "تم الوصول للحد الأقصى من عمليات إنشاء المتاجر خلال ساعة. يرجى المحاولة لاحقاً."}`, `Retry-After: 3600` |
| Poll `register/status/<token>/` while the store is being prepared | IP | **3000 per 60 s** (setting `PROVISIONING_STATUS_POLLS_PER_IP_PER_MINUTE`) | `429` `{"status": "throttled"}` (no `detail`) |

The status page is polled about every 3 seconds, so a single browser stays far below the ceiling even behind a shared address. When you receive `{"status": "throttled"}` keep polling after a short pause; the store is not affected.

> ⚠️ Discrepancy — comments in `api/views_onboarding.py` still show the old strict values (two stores per hour, ten sends per ten minutes per IP). The constants are the loose ones above. This page follows the constants.

## 6. Storefront (customers, not merchants)

Public routes, identified by a session cookie and a phone number. All of them use the session + phone pair from section 3 unless the row says otherwise. For what each code does, see [`otp.md`](otp.md).

| Action | Route | Limit | Response |
|---|---|---|---|
| Send the cash-on-delivery code | `POST checkout/cod-otp/send/` | 3 per 600 s per session and per phone, **and** a per-device counter (the `client_uuid` in the body): 3 sends, reset after 600 s without a request, and a device flagged as blocked is refused until it is cleared | `429` (three messages: device blocked, 3 attempts used, try shortly) |
| Verify the cash-on-delivery code | `POST checkout/cod-otp/verify/` | 3 per 600 s per session and per phone; success resets the phone counter | `429` |
| Send the Sharwa Pay checkout code | `POST checkout/sharwa-pay/otp/send/` | 3 per 600 s per session and per phone | `429` |
| Wallet or Sharwa Pay code checked at checkout | `POST checkout/` (field `otp`) | 3 per 600 s per session and per phone | `429` `{"otp": ["…"]}` |
| Wallet and loyalty codes | `POST wallet/otp/send/`, `POST loyalty/otp/send/`, loyalty verify | 3 per 600 s per session and per phone | `429` |
| Place the order | `POST checkout/` | **one order per 60 s per session**, checked **after** the idempotency lookup | `429` `{"detail": "لقد أرسلت طلباً قبل قليل. يرجى الانتظار دقيقة قبل إرسال طلب جديد."}` |
| Buyer code send (field `purpose`) | `POST customers/otp/send/` | one send per **60 s** per phone and purpose (`OTP_RESEND_SECONDS`); then 3 per 600 s per session and per phone | `429`, `retry_after`, `Retry-After` |
| Buyer code verify | by the route that consumes the code | 5 wrong tries per code (`OTP_MAX_WRONG`), or 3 per 600 s per phone | `429` |
| Post a store review | `POST store-reviews/` | **3 per 3600 s per session** | `429` |
| Hold a booking slot | `POST catalog/products/<id>/slots/hold/` | **10 live holds per session** (`MAX_LIVE_HOLDS_PER_SESSION`). A hold expires on its own; letting old holds expire frees room | `429` |
| Auction bid | `POST catalog/products/<id>/auction/bids/` | **300 per minute per IP** | `429` `{"detail": "طلبات كثيرة جداً، حاول لاحقاً."}` |
| Install-event ping | `POST pwa/install-event/` | **300 per minute per IP** | `429` same text |
| Push subscription | `POST push/subscribe/` | **120 per minute per IP** | `429` same text |

Two rules for the checkout row:

- **The 60 s order limit does not block a retry of the same order.** A retry with the same `client_uuid` finds the existing order first and gets `200` with the first result (see [`idempotency.md`](idempotency.md#checkout)). Only a **different** order inside 60 s is refused.
- A shopper who really places a second, different order within a minute must wait. Show the message and enable the button after about 60 s. The counter is per session, so it is not shared between devices.

The older Django storefront pages (`products/views/{cart_checkout,wallets,loyalty}.py`, `tenants/sharwa_pay_views.py`) apply the same OTP limits but answer `429` with `{"ok": false, "error": "..."}` instead of `detail`. New clients call the `/api/v1/` routes above and never see that shape.

## 7. Customer wallets: Sharwa Pay

The Sharwa Pay customer API (`sharwapay/customer_api.py`) has its own send and verify counters, kept in the shopper's session, and always tells the caller how long to wait.

| Action | Limit | Response |
|---|---|---|
| `POST sharwa-pay/otp/send/` | **3 sends per 600 s** (`SEND_LIMIT`, `SEND_WINDOW_SECONDS`) | `429` `{"detail": "طلبات كثيرة — حاول لاحقاً.", "retry_after": <s>}` and `Retry-After` |
| `POST sharwa-pay/otp/verify/` | **5 wrong codes**, then a **300 s** lock (`VERIFY_LIMIT`, `VERIFY_LOCK_SECONDS`) | `429` `{"detail": "محاولات كثيرة — أُقفل التحقق مؤقتاً.", "retry_after": <s>}` and `Retry-After` |

`retry_after` is the time **left**, rounded up, never less than 1.

## 8. Merchant dashboard: actions with a cooldown or a daily cap

These guard expensive work or sensitive data. They are per store (or per staff member), not per IP.

| Action | Route | Limit | Response |
|---|---|---|---|
| Refresh today's metrics (dashboard) | `POST dashboard/overview/refresh/` | one per **300 s per store** | `429`, `Retry-After: 300` |
| Refresh today's metrics (reports) | `POST reports/refresh-today/` | one per **300 s per store**; the same counter as the dashboard route | `429`, `Retry-After: 300` |
| Send a test push to all subscribers | `POST push/test/` | one per **60 s per store** (`COOLDOWN`). A call with no active subscriber answers `400` and does not start the cooldown | `429`, `Retry-After: 60` |
| Export customers | `GET customers/export.csv` | **5000 rows per staff member per day** (hard limit), refused outright after a critical `export_volume` alert that day; an alert fires at 1000 | `429` `{"detail": "تجاوزت حدّ التصدير اليومي، راجع مدير المتجر."}` |
| Staff behaviour counters | audit and alerts | `customers.view` alerts at 5000, `message.send` alerts at 200 and has a hard limit of 500 | see the discrepancy below |

The two refresh routes share one cache key per store, so a refresh from the dashboard blocks the reports page for five minutes and the reverse.

The export limit is checked only when the request resolves to a **staff member** (`request.staff`). When there is none (the owner session), nothing is counted or refused. Each successful export adds the number of rows exported to that day's total.

> ⚠️ Discrepancy — `message.send` has an alert threshold (200) and a hard limit (500) defined in `behavior_service.py`, but nothing calls `record_usage` for it and no route checks `is_rate_limited` for it, so the limit never fires. Do not build a client around a message cap. Only `customers.export` is enforced.

## 9. Point of sale

These limits are per receipt or per approver code, so a busy till does not lock out the others.

| Action | Limit | Response |
|---|---|---|
| Send a large-refund code (`POST pos/orders/<pk>/refund/` without a code) | **3 per 600 s per receipt** | `429` `{"detail": "أُرسلت رموز تحقق كثيرة لهذا الإيصال — انتظر 10 دقائق."}` |
| Wrong refund code | **3 attempts per receipt**, then locked for **900 s** (`OTP_MAX_ATTEMPTS`, `OTP_LOCK_SECONDS`). The answer shows how many tries are left until the last one | `400` with `{"otp_code": ["… المتبقي N …"]}` while tries remain, then `429` |
| Wrong manager discount code | **5 failures per register**, then locked for **900 s** (`MANAGER_CODE_MAX_FAILS`, `MANAGER_CODE_LOCK_SECONDS`). Each wrong code answers `400` `{"manager_code": ["رمز المدير غير صحيح."]}` | `429` `{"detail": "أُقفل رمز المدير مؤقتاً بعد 5 محاولات خاطئة. حاول بعد 15 دقيقة أو أرسل طلب اعتماد."}`. The cashier can send an approval request instead (see [`permissions.md`](permissions.md#41-pos-discount-ceiling-and-approver-roles)). A correct code clears the counter |

A successful refund clears the failure counter for that receipt.

## 10. Supplier and marketplace limits

These protect the supplier's service. Some are answered to the dashboard as `429`, others are absorbed by a background job that waits and retries by itself.

| Situation | What the dashboard sees |
|---|---|
| Connect a dropshipping supplier and the supplier asks us to slow down | `429` `{"detail": "<supplier name> يطلب الانتظار قليلاً قبل محاولة ربط جديدة — أعد المحاولة بعد دقائق."}` (no header) |
| The same supplier throttles a later request | `429` `{"detail": "المورد يطلب الانتظار قليلاً — أعد المحاولة بعد لحظات."}` |
| Add a product feed by URL and the per-store `fetch_url` bucket is empty | `429` `{"detail": "جلبٌ آخر جرى للتو — انتظر دقيقتين ثم أعد المحاولة."}`. The feed row is removed, so the caller must submit it again |
| A background import, order forward or order pull hits a supplier or marketplace limit | no `429` to the dashboard. The job asks to be rescheduled after the supplier's own wait (`reschedule` seconds) and tries again by itself |

Outbound limiters (the token bucket in `marketplace_rate_limit.py`) are not API limits. They keep **our** calls to Noon and similar services under their quotas. After a real `429` from a marketplace the bucket lowers its own ceiling by half for ten minutes. No client action is needed; a job simply takes longer.

## 11. The generic API throttle

`REST_FRAMEWORK` sets one default throttle, DRF `AnonRateThrottle`, at **120 requests per minute per address**, for unauthenticated callers of class-based DRF views that do not override it.

- It counts by IP, which behind a proxy is the real address only because of `RealIpMiddleware` (section 1).
- **It does not apply to signed-in merchants and staff.** Dashboard views authenticate with `MerchantSessionAuthentication`, which returns a user whose `is_authenticated` is true, and `AnonRateThrottle` skips such requests. The sign-in, setup-password, reset, console and Sharwa Pay views also switch the throttle off (`throttle_classes = []`) because they have their own counters.
- `DEFAULT_AUTHENTICATION_CLASSES` is empty, so a public storefront view (no `authentication_classes`) always counts as anonymous.
- It does apply to anonymous storefront reads such as `catalog/products/`. A shared mobile network with many shoppers on one address could reach it on a busy sale day; a `429` from it is a plain DRF body `{"detail": "Request was throttled. Expected available in N seconds."}` with `Retry-After`.

> ⚠️ Discrepancy — this DRF body is English and has a different shape from the Arabic `detail` messages everywhere else. A client that shows `detail` to a shopper should replace it with its own wait message when `Retry-After` is present on a read route.

## 12. Rules for callers

1. Treat every `429` as "wait, then retry the same request". Never retry in a tight loop.
2. Use `Retry-After` if present, else `retry_after` in the body, else a wait you chose (60 s for OTP limits, 300 s for the dashboard refresh, 900 s for sign-in).
3. Disable the button and show a countdown for the OTP resend cooldowns (30 s onboarding, 60 s buyer, per-phone 600 s windows). Do not keep sending to find out when it opens.
4. Do not show the number of failures that remain unless the server says it (only the POS refund code does).
5. A lock on a phone is not cleared by changing the session or the device. A real person who is locked out waits for the window or asks the owner.
6. The sign-in lockouts also refuse the correct password. Do not tell the user their password is wrong when the status is `429`.
7. Idempotent retries (same key) are not new attempts for the order limit, but they **are** new requests for the generic and IP counters.

## 13. Not covered here

- Plan-feature and permission refusals (`403`) are in [`conventions.md`](conventions.md#gates).
- The shape of every error body is in `errors.md`.
- The BFF's own behaviour when upstream answers `429` (does it pass `Retry-After` through) is in `bff.md`.
