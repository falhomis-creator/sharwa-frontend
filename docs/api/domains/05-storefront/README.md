# Storefront, purchase journey & PWA — واجهة المتجر ورحلة الشراء وتطبيق PWA

> Domain 05 — modules M09, M10, M11, M12, M41, M42, M44 · INT-011 → INT-016 and INT-029
> **Source**: DOC-089 · inventory Domain 5 + A.2 (adapter patterns) + A.4 (identities, sessions, CSRF)
> **Last verified against code**: 2026-10-27 (steps 12 and 13 — every row of the domain)

## 1. What this domain is

Domain 5 is the **buyer journey** of a store: home → catalog → product page → cart → checkout → order tracking, plus the PWA shell and the engagement rows (wishlist, reviews, back-in-stock). Every row is **public**: the visitor has no account; the visitor is an anonymous Django session on the store host ([§4](#identity)).

The page you are reading is the map. Each module has its own page; this page tells you, for every route of the domain, **who provides it, which adapter reaches it from Next.js, and what answers when Django cannot**.

## 2. Domain table <a id="table"></a>

| INT | Module | Django provider (`sharwa_saas/…`) | Routes (`/api/v1/…`) | Live switch | Page |
|---|---|---|---|---|---|
| INT-011 | M09 Storefront home & catalog listing | `products/services/storefront_catalog_service.py`, `api/views_storefront.py` (`CatalogFacetsView`, `CatalogOffersView`), `api/views.py` (`StoreConfigView`, `CategoryListView`, `ProductListView`) | `config/` (sections inside), `catalog/categories/`, `catalog/products/`, `catalog/facets/`, `catalog/offers/` | none (Django-first) | [`m09-storefront-home-catalog.md`](m09-storefront-home-catalog.md) |
| INT-012 | M10 Product detail page | `products/services/storefront_product_service.py` via `ProductDetailSerializer` | `catalog/products/<id>/`, `…/reviews/`, `…/quote/` | none (Django-first) | [`m10-product-detail.md`](m10-product-detail.md) |
| INT-013 | M11 Cart | `products/services/storefront_cart_service.py` over `products/cart.py` | `cart/`, `cart/actions/`, `cart/coupon/`, `cart/contact/`, `cart/restore/` | none (Django-first) | [`m11-cart.md`](m11-cart.md) |
| INT-014 | M12 Checkout | `products/services/storefront_checkout_service.py`, `api/views_checkout.py` | `checkout/*`, `orders/public/<uuid>/`, `orders/<uuid>/receipt/` | none (Django-first) | [`m12-checkout.md`](m12-checkout.md) |
| INT-015 | M41 Order tracking | `products/services/order_tracking_service.py`, `api/views_tracking.py` | `orders/track/<public_uuid>/` | none (Django-first) | [`m41-order-tracking.md`](m41-order-tracking.md) |
| INT-016 | M44 PWA | `api/views.py` PWA rows, `products/services/order_push_service.py`, `api/views_push.py` | `pwa/install-event/`, `push/vapid-public-key/`, `push/subscribe/`, `push/unsubscribe/`, `push/stats/`, `push/test/` | `pwa` — **only** the merchant rows `push/stats` and `push/test`; the storefront rows are Django-first | [`m44-pwa.md`](m44-pwa.md) |
| INT-029 | M42 Wishlist & reviews | `products/services/engagement_service.py`, `api/views_engagement.py` | `shopper/phone/`, `wishlist/`, `wishlist/toggle/`, `catalog/products/<id>/back-in-stock/`, `store-reviews/`, `customers/otp/send/`, product review `POST` | none (Django-first) | [`m42-wishlist-reviews.md`](m42-wishlist-reviews.md) |

Routes registered in `api/urls.py` (lines 58–113, 120). The roadmap checkbox of each `DOC-XXX` is the source of truth for status.

## 3. Django-first and the fallback rule <a id="django-first"></a>

None of the journey rows needs a live switch. The Next.js side asks Django first and uses its **fixture** only when Django cannot answer:

- the fixture answers only on a Django **404, 405 or 501**, or when Django is **down**, and only when `SHARWA_MOCKS=on`; with `SHARWA_MOCKS=off` such a row answers `501` (comment of `storefront-adapter.ts`);
- any other Django answer (including `400`, `409`, `429`, `5xx` with a body) is passed through unchanged, so Django answers win as soon as they exist;
- the exception is the `pwa` switch of the two merchant push rows (INT-016), which follow the dashboard live-key rule ([`../../overview/bff.md#live-keys`](../../overview/bff.md#live-keys)).

Four adapters are involved ([`../../overview/bff.md#django-first`](../../overview/bff.md#django-first)):

| Adapter | Where | Used for | Notes |
|---|---|---|---|
| `getPublicJson` | server-side fetcher (`src/features/storefront/api/upstream.ts`) | `config/`, `catalog/*` reads rendered on the server | sends **no cookie**; `"use cache"`, `cacheLife("minutes")`, `cacheTag(storeTag(store))`; so a cached read can never depend on a visitor |
| `getProduct()` | `src/features/storefront/api/catalog.ts` | the product page | same rule: Django first, fixture on 404/405/501 or down |
| `getTracking()` | `src/features/tracking/api.ts` (server-only, `no-store`) | the first render of the tracking page | `fetch` of `orders/track/<uuid>/` with the store host header; fixture on 404/405/501 or down, only with mocks on ([`m41-order-tracking.md#endpoint`](m41-order-tracking.md#endpoint)) |
| `storefrontAdapter` | `src/lib/bff/storefront-adapter.ts` (BFF rows under `/api/bff/*`) | `cart/coupon`, `cart/contact`, `cart/restore`, `checkout`, `checkout/quote`, `checkout/delivery-options`, `checkout/payment-options`, `catalog/facets`, `catalog/offers` | tries the documented `/api/v1/…` route first with the store header and the buyer's cookies, so the session is the buyer's identity |
| `/api/v1/*` transparent passthrough | `src/app/api/v1/[...path]/route.ts` | rows marked «Ready» in `ready-api-v1.md`: `cart/`, `cart/actions/`, and the other pass-through reads | no caching, no transformation, cookies forwarded; request bodies are buffered so Django sees `Content-Length` (inventory A.11) |

## 4. Storefront visitor identity <a id="identity"></a>

There are no buyer accounts. The visitor is an **anonymous Django session** on the store host (inventory A.4). The session carries:

| Session data | Used by |
|---|---|
| the cart (`products/cart.py`) with line keys `"<product>_v<variant>"` / `"<product>_<size>_<color>"` | M11, M12 |
| `applied_coupon_id` | cart, quote, checkout |
| OTP keys (COD, Sharwa Pay, wallet, loyalty ownership) | M12 and the loyalty rows |
| `wishlist_phone` | M42 |
| booking holds — `cart_bookings` and `buy_now_bookings` | cart, checkout (INT-036) |
| the isolated `buy_now_cart` | M12 "buy now" |
| `user_currency` | every `display_*` string ([§6](#money)) |
| `last_order_time`, traffic and UTM fields | checkout double-submit guard and order attribution |

The consequence for cache design: anything cacheable (`getPublicJson`) never carries the cookie; anything session-bound goes through the BFF or the passthrough.

## 5. Next-owned assets <a id="next-owned"></a>

The web manifest, the app icon route `/icon` and the service worker `/sw.js` are **owned by Next.js** and built from `GET /api/v1/config/` (R-16). Django serves no manifest. The push and install rows (`pwa/*`, `push/*`) are separate Django endpoints documented with M44.

## 6. Money <a id="money"></a>

All amounts the buyer sees are **server-formatted `display_*` strings** produced by `format_money` — the browser never formats or adds money (FR-12.03). Examples from the tests: «100 ر.س», «437.50 ر.س» (whole numbers have no decimals, otherwise two), «52,000 ر.ي» for the Yemeni rial. Conversion uses `_convert_value_to_target` and the store's own rates (`StoreSetting`), with the `?currency=` query parameter or the session's `user_currency` choosing the target (inventory A.6). The rules are in [`../../overview/money.md`](../../overview/money.md).

## 7. Rows documented in other domains <a id="cross-domain"></a>

| Storefront row | Domain | Task / page |
|---|---|---|
| Customer wallet and loyalty points (preview in the quote, redemption at checkout) | Domain 6 | INT-028 — [`../06-customers-wallets/m35-wallets-loyalty.md`](../06-customers-wallets/m35-wallets-loyalty.md) |
| Referral | Domain 7 | INT-034 |
| Booking slots (`catalog/products/<id>/slots/`, `…/slots/hold/`) | Domain 13 | INT-036 |
| Auction (`catalog/products/<id>/auction/`, `…/bids/`) | Domain 3 | INT-045 — [`../03-catalog/m37-advanced-products.md`](../03-catalog/m37-advanced-products.md) |
| Tier prices as charged by the cart | Domain 9 | INT-044 |
| Sharwa Pay (checkout method and merchant credit) | Domain 8 | INT-048 — [`../08-finance/m40-sharwa-pay.md`](../08-finance/m40-sharwa-pay.md) |
| Abandoned-cart reminders that use the cart contact and restore rows | Domain 7 | INT-019 — [`../07-marketing-design-partners/m13-marketing.md#abandoned-carts`](../07-marketing-design-partners/m13-marketing.md#abandoned-carts) |

## 8. Tests <a id="tests"></a>

All under `sharwa_saas/api/` unless noted.

| Suite | Tests | Covers |
|---|---|---|
| `test_storefront_catalog_api.py` | 6 | M09 |
| `test_storefront_product_api.py` | 5 | M10 |
| `test_storefront_cart_api.py` | 8 | M11 |
| `test_storefront_checkout_api.py` | 10 | M12 |
| `test_order_tracking_api.py` | 12 | M41 |
| `test_pwa_push_api.py` | 11 | M44 |
| `products/test_push_notifications.py`, `products/test_pwa_install_tracking.py` | legacy, unchanged | M44 |
| `test_engagement_api.py` | 4 | M42 |

The counts were read from the test files in steps 12 and 13. The two legacy suites under `products/` were not read.

## 9. Find a route <a id="find-a-route"></a>

1. Find the route in the [domain table](#table) → the **provider file** and the **page**.
2. The row's adapter is in [§3](#django-first): reads of public data go through `getPublicJson`, `getProduct()` or `getTracking()`; session-bound writes go through `storefrontAdapter` or the `/api/v1/*` passthrough.
3. The fallback is the same for every row: fixture only on 404/405/501 or Django down, and only with `SHARWA_MOCKS=on`.

## 10. Pages

| Page | DOC | Status |
|---|---|---|
| [`m09-storefront-home-catalog.md`](m09-storefront-home-catalog.md) | DOC-090 → 094 | written in step 12 |
| [`m10-product-detail.md`](m10-product-detail.md) | DOC-095 → 097 | written in step 12 |
| [`m11-cart.md`](m11-cart.md) | DOC-098 → 102 | written in step 12 |
| [`m12-checkout.md`](m12-checkout.md) | DOC-103 → 111 | DOC-103 → 106 written in step 12, DOC-107 → 111 in step 13 |
| [`m41-order-tracking.md`](m41-order-tracking.md) | DOC-112 → 114 | written in step 13 |
| [`m44-pwa.md`](m44-pwa.md) | DOC-115 → 117 | written in step 13 |
| [`m42-wishlist-reviews.md`](m42-wishlist-reviews.md) | DOC-118 → 123 | written in step 13 |

Back to the [domains index](../README.md) · [documentation home](../../../README.md).
