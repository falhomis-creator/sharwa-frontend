# Wishlist, reviews & buyer code API — M42 (المفضلة والتقييمات)

> **Source**: DOC-118 → DOC-123 · INT-029 (M42), INT-017 (M07) · inventory Domain 5 + Domain 6
> **Live key**: *Django-first, no switch* — BFF rows through `storefrontAdapter` ([`README.md#django-first`](README.md#django-first)). The merchant row `reviews/[id]` is a `liveOrMock(…, "customers", …)` row (Domain 6).
> **Django provider**: `sharwa_saas/products/services/engagement_service.py` · views `api/views_engagement.py` (`_EngagementView`, a `_PublicView` that also turns `retry_after` into a `Retry-After` header) · `ProductReviewsView.post` in `api/views_storefront.py` delegates to `submit_review_response` · merchant side `products/services/customer_service.py::reply_to_review` via `api/views_customers.py::ReviewReplyView` · models `products/models/customer_interactions.py` (`ProductReview`, `WishlistItem`, …), `products/models/catalog.py` (`StoreReview`)
> **Frontend contract**: `sharwa-frontend/src/features/engagement/{api.ts,schemas.ts}` · BFF `src/app/api/bff/{shopper/phone,wishlist,wishlist/toggle,store-reviews,customers/otp/send}/route.ts` and `reviews/[id]/route.ts`
> **Tests**: `sharwa_saas/api/test_engagement_api.py` (4 tests: `test_shopper_phone_and_wishlist`, `test_back_in_stock_idempotent`, `test_store_reviews`, `test_buyer_otp_and_product_review_moderation`)
> **Last verified against code**: 2026-10-27 (step 13)

## 1. Overview

Before INT-029 the Next.js storefront already called seven engagement rows Django-first through `storefrontAdapter`, but Django had only HTML views (`products/views/customer_engagement.py` and the store-review form), so every call ended in `404` / `405` and the **fixtures** answered. `engagement_service.py` and `api/views_engagement.py` now provide the JSON rows. They follow the checkout pattern: **public**, no authentication (`authentication_classes = []`, `HasTenantContext`), the shopper is the **anonymous Django session** ([`README.md#identity`](README.md#identity)), and all logic lives in the service.

| Method | Django path (`/api/v1/…`) | Section |
|---|---|---|
| `GET` · `POST` | `shopper/phone/` | [§2](#shopper-phone) |
| `GET` | `wishlist/?currency=` | [§3](#wishlist) |
| `POST` | `wishlist/toggle/` | [§3](#wishlist) |
| `POST` | `catalog/products/<id>/back-in-stock/` | [§4](#back-in-stock) |
| `GET` · `POST` | `store-reviews/` | [§5](#store-reviews) |
| `POST` | `customers/otp/send/` | [§6](#customer-otp) |
| `POST` | `catalog/products/<id>/reviews/` | [§7](#product-reviews) |
| `PATCH` | `reviews/<id>/` (merchant) | [§7](#product-reviews) |

Error bodies are `{"detail": "…"}` or DRF-style `{"<field>": ["…"]}`; `ProductApiError` becomes the response.

## 2. Shopper phone <a id="shopper-phone"></a>

The shopper's phone identifies a **wishlist**, not a payment, so it needs **no OTP** (FR-42.01). It is stored in the session under `wishlist_phone` — the same key the legacy HTML screens use.

### `GET /api/v1/shopper/phone/`

**Response `200`**: `{"phone_normalized": "967700000001"}` or `{"phone_normalized": null}` when the session has no phone (or a stored value that no longer validates).

### `POST /api/v1/shopper/phone/`

**Request**: `{"phone": "0700000001"}` — normalised with `clean_phone_number` and accepted only if it matches `^(967|966)\d{9}$`.

**Response `200`**: `{"phone_normalized": "967700000001"}` and the session now carries it. Invalid → `400` `{"phone": ["رقم واتساب غير صحيح."]}`.

Test: `test_shopper_phone_and_wishlist` (null, `12` → `400`, `0771234567` → `967771234567`).

Frontend: `useShopperPhone` / `useSetShopperPhone` (5-minute stale time); after a successful `POST` the wishlist query is invalidated and the id mirror in the `useWishlist` store gets the phone.

## 3. Wishlist <a id="wishlist"></a>

### `GET /api/v1/wishlist/?currency=SAR`

**Query**: `currency` — display currency; default order is `?currency`, then `session["user_currency"]`, then `StoreSetting.currency`, then `SAR`.

**Response `200`**

```json
{
  "phone_normalized": "967700000001",
  "items": [
    {
      "product": { "id": 12, "name": "عطر", "display_price": "100 ر.س", "allow_backorder": false, "is_available": true },
      "created_at": "2026-10-27T09:30:00+00:00"
    }
  ]
}
```

The `product` object is the **catalog card** (`ProductListSerializer`, the same serializer as the product list — [`m09-storefront-home-catalog.md`](m09-storefront-home-catalog.md)) built at the **live price** in the requested currency, plus two fields added by the wishlist: `allow_backorder` (boolean) and `is_available`. The example shows only a few card fields (the card also carries `stock`, which the frontend uses).

No phone in the session → `{"phone_normalized": null, "items": []}`. Items are newest first (`created_at`, then `id`).

| Product situation | In the list? | `is_available` |
|---|---|---|
| visible and `is_available` | yes | `true` |
| out of stock but visible (and not back-orderable) | yes | `true` — the card's `stock` and `allow_backorder` give the «sold out» state to the frontend |
| unpublished / hidden / `is_available = false` | **yes**, kept so the shopper can remove it | `false` — shown as «لم يعد متاحاً» |
| archived (`archived_at` set) | **no** (left out of the query) | — |

Frontend state helper `wishlistItemState`: `unavailable` when `!is_available`, `sold_out` when `stock <= 0` and not back-orderable, else `available`.

### `POST /api/v1/wishlist/toggle/`

**Request**: `{"product_id": 12}` (optionally `"phone"`).

**Response `200`**: `{"saved": true}` when the product was added, `{"saved": false}` when it was removed.

| Rule | Detail |
|---|---|
| Phone | the **session phone** first; a `phone` in the body is only a fallback. Neither → `409` `{"detail": "أدخل رقم هاتفك أولاً لحفظ قائمتك."}` |
| Product id | not an integer → `400` `{"product_id": ["منتج غير صالح."]}` |
| Remove | an existing row is deleted **always**, even for a product that is no longer visible |
| Add | needs a visible product, else `404` `{"detail": "المنتج غير موجود."}`; two simultaneous clicks are safe (a unique-constraint race counts as saved) |

Frontend: `useToggleWishlist` updates optimistically and rolls back on error; a `409` opens the phone panel and keeps the product as the pending action. Toasts «أُضيف إلى قائمتك» / «أُزيل من قائمتك».

Tests: `test_shopper_phone_and_wishlist` (409 without phone, three saved, `404` for id `999999`, hidden product kept with `is_available: false`, archived product dropped, removal of the hidden one → `{"saved": false}`).

## 4. Back in stock <a id="back-in-stock"></a>

### `POST /api/v1/catalog/products/<id>/back-in-stock/`

«أعلمني عند التوفر». BFF path `/api/bff/catalog/products/<id>/back-in-stock` (its route file is nested deeper than this step could read — behaviour taken from the Django provider).

**Request**: `{"phone": "0700000001"}` — optional; the body phone is used first, then the session's shopper phone. There is **no OTP** and no stock check (the product may be in stock).

| Status | Body | When |
|---|---|---|
| `201` | `{"subscribed": true, "already": false}` | first subscription of this phone to this product |
| `200` | `{"subscribed": true, "already": true}` | the subscription already exists and has not been notified yet |
| `201` | `{"subscribed": true, "already": false}` | the subscription had been **notified** earlier; it is **re-armed** (`notified_at` set back to `null`) because the product ran out again |
| `400` | `{"phone": ["رقم واتساب غير صحيح."]}` | no valid phone in the body or the session |
| `404` | `{"detail": "المنتج غير موجود."}` | product not visible or the id is not an integer |

Storage: `BackInStockNotification` with `(customer_phone, product)` unique (`get_or_create`). Test: `test_back_in_stock_idempotent` (400 without a phone, 201, 200 + `already: true`, 201 after `notified_at` was set with `notified_at` back to `None`, 404).

## 5. Store reviews <a id="store-reviews"></a>

### `GET /api/v1/store-reviews/`

**Response `200`**

```json
{
  "average_rating": 4.5,
  "count": 2,
  "results": [
    { "id": 7, "customer_name": "سارة", "rating": 5, "comment": "ممتاز", "created_at": "2026-10-27T09:30:00+00:00" }
  ]
}
```

- Only reviews **with stars** count: `StoreReview.rating` became **nullable** (migration `products/0228_engagement_api`, as stated by the roadmap — the migration file itself was not read). Legacy comments written by the old screen have no stars; they stay out of the average, the count and the list — **nothing is invented for them**.
- `results` are the newest 10 (`created_at`, then `id`); `average_rating` is rounded to one decimal (`0` when there are none); `admin_reply` is not part of this payload.

### `POST /api/v1/store-reviews/`

**Request**: `{"customer_name": "سارة", "rating": 5, "comment": "ممتاز"}`

| Field | Rule | Error |
|---|---|---|
| `rating` | integer 1–5 | «اختر تقييماً من 1 إلى 5.» |
| `comment` | ≤ 1000 characters (may be empty) | «التعليق طويل جداً (1000 حرف كحد أقصى).» |
| `customer_name` | required, kept to 100 characters | «اكتب اسمك.» |

**Response `201`**: `{"status": "published"}` — the review is **published at once** (no moderation), like the mock.

**Rate limit**: 3 posts per hour per session (`rate_limit_attempt(request, "store_review_post", 3, 3600)`, kept in the session) → `429` `{"detail": "أرسلت تقييمات كثيرة، حاول لاحقاً."}`. Validation runs **before** the limit, so an invalid post does not use an attempt. The limit is per session, not per phone or IP. (The service does not set a `Retry-After` value here.)

Test: `test_store_reviews` — legacy comment without stars ignored; `rating: 9` → errors for `rating` and `customer_name`; two reviews (5, 4) give `average_rating 4.5`, `count 2`; a third post is accepted; the **fourth** is `429`.

## 6. Buyer code outside checkout <a id="customer-otp"></a>

### `POST /api/v1/customers/otp/send/`

The standard WhatsApp-code endpoint for buyer actions that are **not** part of checkout (checkout has its own codes — [`m12-checkout.md#cod-otp`](m12-checkout.md#cod-otp)). BFF path `/api/bff/customers/otp/send`.

**Request**: `{"phone": "0700000001", "purpose": "review"}`

| `purpose` | Used by |
|---|---|
| `review` | product review submission ([§7](#product-reviews)) — **the only purpose verified by this service** |
| `auction` | auction bids (Domain 3, [`../03-catalog/m37-advanced-products.md`](../03-catalog/m37-advanced-products.md)) |
| `wishlist` | accepted; nothing in `engagement_service` checks it (wishlist needs no code, [§2](#shopper-phone)) |
| `back_in_stock` | accepted; nothing in `engagement_service` checks it ([§4](#back-in-stock)) |

**Response `200`**: `{"ok": true}`.

**Flow**: purpose in the list → phone valid → **60-second resend rule** → rate limits → code → WhatsApp.

1. Unknown purpose → `400` `{"purpose": ["غرض غير معروف."]}` (checked first); invalid phone → `400` `{"phone": ["رقم واتساب غير صحيح."]}`.
2. **Resend**: the session keeps one entry per purpose under `buyer_otp:<purpose>` = `{phone, code, at, wrong, verified}`. If the previous code was sent **to the same phone**, is not verified and is younger than 60 s → `429` `{"detail": "حاول بعد N ثانية."}` with header **`Retry-After: N`**. (`retry_after` is removed from the body by `_EngagementView.run` and turned into the header.)
3. **Limits**: `rate_limit_attempt("buyer_otp_send:<purpose>:<phone>")` (session, 3 per 600 s) **or** `phone_cache_rate_limited("buyer_otp_send_<purpose>", phone)` (phone only, 3 per 600 s) → `429` `{"detail": "تم تجاوز عدد محاولات إرسال الرمز. يرجى المحاولة بعد قليل."}` with `Retry-After: 60`.
4. A 6-digit code (`secrets.randbelow(900000) + 100000`) replaces the entry (`wrong = 0`, `verified = false`) and is sent. A failed send removes the entry → `502` `{"detail": "تعذّر إرسال رمز التحقق عبر واتساب. يرجى المحاولة مرة أخرى."}`.

Message (verbatim; `{store_name}` is `StoreSetting.store_name`):

```text
🔐 *متجر {store_name}*

رمز التأكيد:
*{code}*

لا تشارك هذا الرمز مع أحد. صالح لمدة 10 دقائق.
```

**Verification** (`check_buyer_otp`, used by [§7](#product-reviews)) — every failure is under the key `otp` except the rate limit:

| Status | Body | When |
|---|---|---|
| `400` | `{"otp": ["اطلب رمز التأكيد أولاً."]}` | no entry for this purpose, or sent to another phone |
| `400` | `{"otp": ["انتهت صلاحية الرمز، اطلب رمزاً جديداً."]}` | older than 600 s (entry removed) |
| `429` | `{"detail": "محاولات كثيرة، اطلب رمزاً جديداً بعد قليل."}` | 5 wrong guesses on this code, **or** the phone limit `buyer_otp_verify_<purpose>` (3 per 600 s) |
| `400` | `{"otp": ["الرمز غير صحيح."]}` | wrong code (the entry's `wrong` counter increases) |

On success the verify counter of the phone is reset and the entry is removed (a code works once).

> Observation — the phone limit counts **every** verification call (it is incremented before the code is compared), so at most three attempts per phone and purpose fit in 10 minutes; the per-code limit of 5 wrong guesses is therefore only reached if the phone counter allows it. Found by reading `check_buyer_otp` and `cache_rate_limit`; not run.

Test: `test_buyer_otp_and_product_review_moderation` (purpose `cod` → `400`; first send `{ok: true}`; immediate resend `429` with a non-empty `Retry-After`; the code is in the WhatsApp message and in the session entry).

## 7. Product reviews and moderation <a id="product-reviews"></a>

### `POST /api/v1/catalog/products/<id>/reviews/`

Submission of a product review (the `GET` of the same URL — summary and pages of **approved** reviews — belongs to the product page, [`m10-product-detail.md`](m10-product-detail.md)). BFF path `/api/bff/catalog/products/<id>/reviews` (route file not readable in this step).

**Request**: `{"rating": 5, "comment": "رائع جداً", "phone": "0700000001", "otp": "123456", "name": "منى"}`

| Field | Rule | Error |
|---|---|---|
| `rating` | integer 1–5 | «اختر تقييماً من 1 إلى 5.» |
| `comment` | 3–1000 characters | «اكتب تعليقاً قصيراً.» (too short) · «التعليق طويل جداً (1000 حرف كحد أقصى).» |
| `phone`, `otp` | the number that received the `review` code ([§6](#customer-otp)) and the code | the `otp` / `phone` errors of [§6](#customer-otp) |
| `name` | optional, 100 characters; «عميل» when empty | — |

**Order**: product must be visible (`404` `{"detail": "المنتج غير موجود."}`) → **fields are checked first** (a `400` field map; the code is **not** consumed by an incomplete form) → the WhatsApp code is verified **and consumed** → the review is stored.

**Response `201`**: `{"detail": "شكراً، سيظهر تقييمك بعد المراجعة."}`.

Storage: `ProductReview(product, rating, comment, customer_name, customer_phone = customer_key(phone), is_approved = False)`. `customer_phone` holds the buyer's normalised `customer_key` (INT-017, migration `0218` per the roadmap), which is what ties the review to the customer profile tab «التقييمات» of M07 ([`../06-customers-wallets/README.md`](../06-customers-wallets/README.md)).

### Visibility: `ProductReview.is_approved`

| Review | `is_approved` | Where it shows |
|---|---|---|
| existing reviews and those written by the legacy form | `True` (the field default, migration `0228` per the roadmap) | unchanged |
| reviews submitted through this API | **`False`** | **not** in the product page review list, **not** in the rating summary — both storefront queries (`reviews_page` and the summary in `storefront_product_service`) filter `is_approved=True`; the roadmap also says the legacy HTML page hides them, which was **not verified** (the legacy view file is not among the files read) |

The merchant sees every review, with an `approved` flag, in the customer profile tab (`customers/<phone>/reviews/` → `review_view`: `{id, product:{id,name}, rating, comment, created_at, admin_reply, approved}`).

### `PATCH /api/v1/reviews/<id>/` (merchant)

The moderation row that was missing: the contract promised «سيظهر تقييمك بعد المراجعة» and the M07 tab displayed «بانتظار المراجعة» (roadmap wording; that screen text is not in the files read), but nothing could approve a review. `reply_to_review(review_id, data)` (route `ReviewReplyView.patch`, same gate as the other customer edits — Domain 6) now accepts:

| Body | Effect |
|---|---|
| `{"approved": true}` / `{"approved": false}` | publishes / hides the review |
| `{"admin_reply": "نص"}` | the store's public reply (≤ 1000 characters; empty or `null` clears it) |
| both keys | both are applied in one save |

| Status | Body | When |
|---|---|---|
| `200` | the `review_view` object above | success |
| `404` | `{"detail": "التقييم غير موجود."}` | unknown id |
| `400` | `{"admin_reply": ["نص الرد مطلوب."]}` | neither `admin_reply` nor `approved` in the body, or `admin_reply` is not a string |
| `400` | `{"approved": ["قيمة غير صالحة."]}` | `approved` is not a JSON boolean |
| `400` | `{"admin_reply": ["الرد أطول من 1000 حرف."]}` | reply too long |

BFF: `PATCH /api/bff/reviews/[id]` → `liveOrMock(…, "customers", "/api/v1/reviews/<id>/", …)` with permission `customers.edit_profile` in mock mode.

Frontend: the roadmap lists an «اعتماد» button on the M07 reviews tab (`useApproveReview`, mock aligned). It was **not found** in the files read for this step (see the discrepancy below).

**End-to-end** (`test_buyer_otp_and_product_review_moderation`): send `review` code → invalid fields (`rating: 0`, short comment) → `400 {rating, comment}` without using the code → wrong code `400 {otp: ["الرمز غير صحيح."]}` → `201` → reusing the code `400 {otp: ["اطلب رمز التأكيد أولاً."]}` → stored with `is_approved = False`, the buyer's name and `customer_phone` `967771234567` → `GET …/reviews/` shows `count: 0` → merchant tab shows `approved: false` → `PATCH {approved: true}` `200` with `approved: true` → `GET …/reviews/` shows `count: 1` and the buyer's name.

> ⚠️ Discrepancy — roadmap says the merchant `PATCH reviews/<id>/` accepts `{approved}` (alone or with `admin_reply`) and the M07 tab has an «اعتماد» button (`useApproveReview`) / code does: Django accepts `{approved}` as described, but the BFF route comment (`src/app/api/bff/reviews/[id]/route.ts`) still documents only `{admin_reply}` (M07 US-07.2.6), and no `useApproveReview` was found in the frontend files staged for this step. Whether the button exists is therefore unverified.

## 8. Open items

- The BFF route files for `catalog/products/[id]/back-in-stock` and `catalog/products/[id]/reviews` are nested deeper than the file-transfer tool reads; their behaviour here comes from the Django provider and the roadmap.
- The `purpose` values `wishlist` and `back_in_stock` of the buyer code have no verifier in `engagement_service` ([§6](#customer-otp)).
- The phone-limit behaviour of `check_buyer_otp` ([§6](#customer-otp) observation) was not run.
- The store-review limit is per session; clearing cookies resets it ([§5](#store-reviews)).
- The legacy HTML page's handling of `is_approved` ([§7](#product-reviews)) and migrations `0218`, `0228` were not read.

## 9. Related pages

- Domain overview: [`README.md`](README.md)
- Product page (review read side, quote, slots): [`m10-product-detail.md`](m10-product-detail.md)
- Checkout codes: [`m12-checkout.md`](m12-checkout.md)
- Customer profile (reviews tab, wallets): [`../06-customers-wallets/README.md`](../06-customers-wallets/README.md)
