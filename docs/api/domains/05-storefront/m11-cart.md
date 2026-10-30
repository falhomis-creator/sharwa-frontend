# Cart API — M11 (السلة الجانبية والسلة الصغيرة)

> **Source**: DOC-098, DOC-099, DOC-100, DOC-101, DOC-102 · INT-013 (M11), INT-019 (M13), INT-036 (M26), INT-044 (M36), INT-045 · inventory Domain 5 + Domain 13 + A.11
> **Live key**: *Django-first, no switch* — `GET|DELETE cart/` and `POST cart/actions/` through the transparent `/api/v1/*` passthrough (ready-api-v1 rows #5–#7); `cart/coupon`, `cart/contact`, `cart/restore` through `storefrontAdapter` BFF rows ([`../../overview/bff.md#django-first`](../../overview/bff.md#django-first))
> **Django provider**: `sharwa_saas/products/services/storefront_cart_service.py` (`serialize`, `apply_action`, `clear`, `apply_coupon`, `remove_coupon`, `save_contact`, `restore`) over the session cart `products/cart.py` (`Cart`) and the pricing engine `products/pricing.py` (`build_order_invoice`) · views `api/views.py` (`CartView`, `CartActionView`) and `api/views_storefront.py` (`CartCouponView`, `CartContactView`, `CartRestoreView`) · errors `products/services/product_api_errors.py` (`ProductApiError`) · wired in `api/urls.py` (names `cart-detail`, `cart-actions`, `cart-coupon`, `cart-contact`, `cart-restore`)
> **Frontend contract**: `sharwa-frontend/src/features/storefront/schemas/cart.ts` (`CartSchema`, `CartItemSchema`, `CartActionResultSchema`, `lineKey`) · hooks `src/features/cart/api.ts` (`useCart`, `useCartAction`, `useClearCart`, `useCoupon`) · page `src/features/cart/components/cart-page.tsx` · BFF rows `src/app/api/bff/cart/{coupon,contact,restore}/route.ts` · fixtures `src/mocks/storefront/cart.ts`
> **Tests**: `sharwa_saas/api/test_storefront_cart_api.py` — `StorefrontCartTests` (8 tests: add and shape, stock cap/auction/hidden, variant rules, clear, coupon messages, free-shipping progress, contact capture, restore with coupon)
> **Last verified against code**: 2026-10-27 (step 12)

## 1. Overview

The storefront cart lives **in the visitor's Django session**: there are no customer accounts, and the session cookie on the store host is the buyer's identity. The same cart feeds the header badge, the slide-over panel, the `/cart` page and checkout, under one client-side query key `['store', store, 'cart']`. The server is the source of truth; the browser applies updates optimistically and rolls back on failure, and runs cart actions strictly one after another.

INT-013 gave the ready rows (`GET|DELETE cart/`, `POST cart/actions/`) their full contract and added three more: `cart/coupon/`, `cart/contact/` and `cart/restore/`. There is **no second pricing engine**: the cart is the same `products/cart.py` session cart that checkout reads, and the totals come from `pricing.build_order_invoice`, which checkout uses too, so the progress bar, the discount and the total shown in the panel are the ones checkout will apply (automatic offers first, then the coupon, then free shipping).

**Transport.** The five rows are reached through the transparent same-origin passthrough `/api/v1/cart*` (no caching, no transformation, cookies forwarded) and the three BFF rows. Writes reach Django with a body only since the `upstream.ts` buffering fix (inventory A.11): a streamed body went out chunked with no `Content-Length`, Django read an empty body and every write through the passthrough answered `400` «required field». `upstreamFetch` now buffers the incoming body (8 MB at most, the same bound as `DATA_UPLOAD_MAX_MEMORY_SIZE`).

## 2. Access — gate chain

| # | Gate | Requirement | Failure |
|---|---|---|---|
| 1 | Tenant | the host resolves to a ready store — [`../01-public-onboarding/m47-tenant-guard.md`](../01-public-onboarding/m47-tenant-guard.md) | `404` / `403` / `503` |
| 2 | Tenant context | `HasTenantContext` | `403` «لم يتم تحديد المتجر المطلوب. استخدم النطاق الفرعي للمتجر أو أرسل ترويسة X-Store-Domain.» |
| 3 | Identity | the anonymous session. `coupon/`, `contact/` and `restore/` set `authentication_classes = []`; `CartView` and `CartActionView` declare no `authentication_classes`, so they use the project default (`REST_FRAMEWORK` settings, not part of the files read in this step) | — |
| 4 | Plan feature · permission key · owner-only | none | — |
| 5 | CSRF | not re-verified for these rows in this step; the platform rules are in [`../../overview/csrf.md`](../../overview/csrf.md) | — |

## 3. Endpoint summary

| Method | Django path (`/api/v1/…`) | BFF path (`/api/bff/…`) | Purpose |
|---|---|---|---|
| `GET` | `cart/` | passthrough | read the cart ([§4](#get-cart)) |
| `DELETE` | `cart/` | passthrough | empty the cart → `204` |
| `POST` | `cart/actions/` | passthrough | add, decrease or remove a line ([§5](#cart-actions)) |
| `POST` `DELETE` | `cart/coupon/` | `cart/coupon` | apply / remove a coupon ([§6](#coupon)) |
| `POST` | `cart/contact/` | `cart/contact` | save the buyer's WhatsApp number for the reminder ([§7](#contact)) |
| `POST` | `cart/restore/` | `cart/restore` | restore an abandoned cart from a reminder link ([§8](#restore)) |

## 4. Read the cart <a id="get-cart"></a>

### `GET /api/v1/cart/`

**Query parameters**

| Name | Type | Default | Notes |
|---|---|---|---|
| `currency` | `SAR` · `USD` · `YER_NEW` · `YER_OLD` | the session's `user_currency`, else `SAR` | sets `session['user_currency']` **before** the cart is built, so it stays for the rest of the session (every cart and checkout answer then uses it). Not validated against the choices list |

The currency must be written before the `Cart` object is created, because `Cart.__init__` reads `target_currency` from the session once.

**Response `200`**

```json
{
  "items": [
    {
      "product_id": 7,
      "name": "عطر",
      "size": null,
      "color": null,
      "quantity": 2,
      "display_price": "100 ر.س",
      "display_subtotal": "200 ر.س",
      "image": null,
      "variant_id": null,
      "variant_label": null,
      "product_slug": "perfume",
      "max_quantity": 3,
      "stock": 5.0,
      "is_auction": false,
      "start_datetime": null,
      "is_available": true
    }
  ],
  "count": 2,
  "currency": "SAR",
  "display_subtotal": "200 ر.س",
  "coupon_code": null,
  "display_discount": null,
  "applied_offers": [],
  "display_total": "200 ر.س",
  "free_shipping_applies": false,
  "display_free_shipping_remaining": null,
  "free_shipping_progress": null
}
```

The line follows `test_add_with_quantity_and_shape` (a product of 100 ر.س, `max_quantity` 3, quantity 2: «100 ر.س» each, «200 ر.س» subtotal, total «200 ر.س»); the id, slug and image are fixture values. The test pins the exact key sets of the cart (`items count currency display_subtotal coupon_code display_discount applied_offers display_total free_shipping_applies display_free_shipping_remaining free_shipping_progress`) and of an item (`product_id name size color quantity display_price display_subtotal image variant_id variant_label product_slug max_quantity stock is_auction start_datetime is_available`).

**Cart-level fields**

| Field | Type | Meaning |
|---|---|---|
| `items[]` | array | one object per line, product lines first, then booking lines |
| `count` | integer | pieces in the cart: the sum of line quantities **plus** the live booking lines (the badge number) |
| `currency` | enum | the session currency (`cart.target_currency`) |
| `display_subtotal` | string | sum of the **available** lines' subtotals (hidden products are excluded) |
| `coupon_code` | string \| null | the applied coupon's code |
| `display_discount` | string \| null | the **coupon** discount, `null` when zero |
| `applied_offers[]` | array | automatic promotional offers that applied: `{name, offer_type, display_discount}`; `offer_type` is `discount`, `free_shipping` or `buy_x_get_y`; `display_discount` is always `null` here |
| `display_total` | string | `max(0, subtotal − promotion discount − coupon discount)`. Delivery fees are **not** in the cart total; checkout adds them |
| `free_shipping_applies` | boolean | `invoice.has_free_shipping` (a product with free shipping, the threshold reached, or a free-shipping offer) **and** the cart is not empty |
| `display_free_shipping_remaining` | string \| null | `max(0, threshold − subtotal)`; `null` when the store has no threshold |
| `free_shipping_progress` | integer \| null | `min(100, int(subtotal / threshold × 100))`, `null` without a threshold. Server-computed so the browser never divides money |

**Line fields**

| Field | Type | Meaning |
|---|---|---|
| `product_id` · `name` | integer · string | |
| `size` · `color` | string \| null | the legacy text options of the line; `null` when empty |
| `quantity` | integer | |
| `display_price` · `display_subtotal` | string \| null | unit price and line subtotal in the session currency; **`null` for a line whose product is no longer visible** |
| `image` | string \| null | `image_url`, else the first gallery image, else the main image (absolute URL) |
| `variant_id` · `variant_label` | integer \| null · string \| null | the variant and its option values joined with ` / ` |
| `product_slug` | string \| null | |
| `max_quantity` | integer \| null | the product's per-order cap |
| `stock` | number | the variant's stock for a variant line, else the product's |
| `is_auction` | boolean | |
| `start_datetime` | ISO 8601 \| null | booking lines only: the slot start in the **store's time zone** with its offset (INT-036), not UTC |
| `is_available` | boolean | `false` for a product that is no longer visible (it is listed but not priced); booking lines are always available |

### 4.1 Where the pricing comes from <a id="pricing"></a>

The cart is built from `Cart.__iter__` plus the live booking lines (`get_booking_cart_items`), then priced by `build_order_invoice(priced_lines, subtotal, currency, store_setting, coupon_id)` with `coupon_id = session['applied_coupon_id']`.

- **Unit price precedence** (`products/cart.py`, `products/services/tier_pricing.py`, INT-044): a line with a **variant** is charged the variant's effective price (product price plus extra price), converted; otherwise a **formula** product is charged its formula price with no tiers; otherwise the **highest tier price whose `min_quantity` does not exceed the line quantity**; otherwise the base price.
- **Personalization surcharge** (INT-045): for every personalization field the buyer filled and that has a `price_add`, the surcharge is added **per unit** (`tier_pricing.personalization_extra`), on top of whichever price won above. The values are copied to the order item at checkout.
- **Order of discounts** (`pricing.build_order_invoice`): automatic offers first (capped at the subtotal), then the coupon on the remainder, each result floored at zero; free shipping is then decided; the wallet never enters here.
- **Free shipping.** The threshold `StoreSetting.free_shipping_threshold` is an amount in the **store currency** (`store_setting.currency`); Django converts it into the cart currency with `convert_amount` before comparing it with the subtotal (`build_order_invoice` and `serialize` both do this), so the bar counts what checkout will apply.

> Note — the roadmap (DOC-098) says the threshold is "compared by Django in the dashboard currency" instead of YER_NEW. That matches the code: `build_order_invoice` reads `StoreSetting.free_shipping_threshold` as money in `store_setting.currency` and converts it into the cart currency before comparing it with the subtotal (`products/pricing.py` lines 130–134). What does **not** match is an older comment in `StoreConfigSerializer.get_free_shipping_threshold` («بالريال اليمني الجديد كما هو مخزَّن») and the earlier text of `config.md`; both are described in [`m09-storefront-home-catalog.md#free-shipping-threshold`](m09-storefront-home-catalog.md#free-shipping-threshold), and `config.md` was corrected in step 12.

> Observation (code vs code) — the module docstring of `storefront_cart_service.py` (lines 14–15) still says (in Arabic) that personalization fields are stored with the line and are not priced there, because checkout does not charge them yet. `Cart.__iter__` has charged them since INT-045 (`personalization_extra`, `products/cart.py` lines 145–149). The behaviour is right and the docstring is stale; this page follows the behaviour. Reported in step 12.

### 4.2 Bookings in the cart <a id="bookings"></a>

A bookable service is not stored in the session cart; it is a live **hold** of a slot (`cart_bookings` in the session, INT-036). `GET cart/` appends those holds as lines of quantity `1` with `start_datetime`; `count` counts them like products. A hold that has expired drops out of the cart on the next read (FR-26.07).

### 4.3 Hidden products and the coupon <a id="hidden"></a>

A product that is no longer visible stays in the list with `is_available: false` and `null` prices, but it is excluded from the subtotal and from the pricing engine. If the session holds a coupon that is no longer valid (expired, or the minimum is no longer met), `serialize` **removes** it from the session (`applied_coupon_id`) — the same behaviour as the legacy cart screen.

### `DELETE /api/v1/cart/`

Empties the session cart, releases the booking holds of the cart and removes the applied coupon. Response `204`, no body (`storefront_cart_service.clear`; `test_clear`).

> Observation — the automatic-offer discount is subtracted from `display_total` but is not shown anywhere in the cart payload: `display_discount` carries the coupon only and `applied_offers[].display_discount` is always `null` (checkout's quote does show it as `display_promotion_discount`). With an automatic offer the cart total therefore equals subtotal minus `display_discount` minus an amount the response does not state. Found by reading `serialize` (lines 109–126); see the open items.

## 5. Cart actions <a id="cart-actions"></a>

### `POST /api/v1/cart/actions/`

**Request body** (`application/json`; a body that is not an object is treated as `{}`)

| Field | Type | Required | Rules |
|---|---|---|---|
| `product_id` | integer | yes | digits only, otherwise `400` |
| `action_type` | enum | no | `add` (default) · `decrease` · `remove_line` |
| `size` · `color` | string | no | part of the line key for products without variants; an empty string counts as none |
| `variant_id` | integer | when the product has variants | must belong to the product |
| `quantity` | integer | no | `add` only; at least `1`; not a whole number or missing counts as `1` |
| `personalization` | object | no | `{field_id: value}` stored on the line (charged since INT-045) |
| `start_datetime` | ISO 8601 | bookable products | the slot to hold |

**Line key** (`Cart._get_key`): `"<product_id>_v<variant_id>"` for a variant line, otherwise `"<product_id>_<size>_<color>"` with trailing underscores stripped. The same rule is `lineKey` in `schemas/cart.ts`. Omitting `size`/`color` for a product that has them targets a different line.

**Response `200`**

```json
{ "cart_count": 2, "product_qty": 2 }
```

`cart_count` is the whole cart (products plus live booking holds); `product_qty` is the quantity of **this product** across its lines. The response is the same after `add`, `decrease` and `remove_line`. `test_add_with_quantity_and_shape` walks `add ×2 → {2, 2}`, `add ×5` (cap 3) `→ product_qty 3`, `decrease → 2`, `remove_line → cart_count 0`.

**`add` rules** (equal to `cartAction` in the mock)

1. The product must be **visible**; otherwise `404`.
2. A **bookable** product takes the booking path ([below](#booking-add)).
3. `variant_id` given: the variant must belong to the product (`400` otherwise). Not given and the product has variants: `400`.
4. The target quantity is *current line quantity + requested*, then capped in this order: an **auction** is `1`; `max_quantity` caps it; unless **backorder** is allowed, the stock caps it — the variant's stock for a variant line, otherwise the product stock **minus what other lines of the same product already hold**.
5. If the capped target is `0` or less nothing is added and the answer is the unchanged counts. The cap is **not an error**: the client compares `product_qty` with what it expected and shows «وصلت للحد المتاح» (US-11.2.3).
6. The line is set to the capped quantity (`update_quantity=True`), the `personalization` object is stored on the line, and the product's `add_to_cart_count` is incremented once (analytics).

`decrease` lowers the line by one (removing it at zero; if the exact key is missing it lowers the first line of the same product). `remove_line` deletes the line. Neither needs the product to be visible.

After a non-booking action the abandoned-cart snapshot is refreshed (`capture_cart`, saving the session first when a new visitor has no key yet), so the dashboard's «السلات المتروكة» list stays current.

**Errors**

| Status | Body | When |
|---|---|---|
| `400` | `{"product_id": ["منتج غير صالح."]}` | `product_id` is not digits |
| `400` | `{"action_type": ["إجراء غير معروف."]}` | any other action |
| `404` | `{"detail": "هذا المنتج غير متاح."}` | `add` of a product that is not visible |
| `400` | `{"detail": "المتغيّر المحدد لا يخص هذا المنتج."}` | `variant_id` of another product |
| `400` | `{"detail": "اختر المقاس واللون أولاً."}` | the product has variants and none was sent |
| `400` | `{"detail": "اختر موعداً أولاً لهذه الخدمة."}` | bookable product without `start_datetime` |
| `404` | `{"detail": "هذا المنتج غير متاح."}` | bookable product while the plan feature `bookings` is off |
| `409` | from `booking_service.hold` | the slot was taken by someone else (INT-036; the rule is documented with the booking rows in Domain 13) |

### 5.1 Bookable services <a id="booking-add"></a>

Originally refused (slots belong to M26), completed by INT-036. `add` of a bookable product needs `start_datetime`: the session's live hold for that slot — or a fresh hold under the same rules (`booking_service.hold`) — joins `cart_bookings` as a line of quantity `1`; `409` when the slot is taken. `decrease` and `remove_line` of a bookable product release the hold for `start_datetime`. Emptying the cart releases all of its holds. `add_to_cart_count` is incremented only the first time a given slot enters the cart.

### 5.2 Not wired <a id="not-wired"></a>

`bundle_selection` is **not** read by `apply_action`, and the PDP does not send it (INT-045 open item): the options chosen inside a bundle do not reach the cart line.

## 6. Coupon <a id="coupon"></a>

### `POST /api/v1/cart/coupon/`

**Request body**: `{"code": "<text>"}` (the code is trimmed and matched case-insensitively, `code__iexact`).

**Response `200`**: the **whole cart** (the same object as `GET cart/`) with `coupon_code`, `display_discount` and `display_total` updated. `test_coupon_messages_minimum_and_removal`: a 10 % coupon on a 100 ر.س cart gives `coupon_code "WELCOME10"`, `display_discount «10 ر.س»`, `display_total «90 ر.س»`.

**Errors** — the messages come from `Coupon.is_valid` and `CheckoutService.calculate_discount` and are returned **verbatim**, the same sentence the buyer sees at checkout

| Status | Body | When |
|---|---|---|
| `400` | `{"code": ["أدخل كود الخصم."]}` | empty code |
| `400` | `{"detail": "عذراً، كود الكوبون غير صحيح."}` | no coupon with that code |
| `400` | `{"detail": "هذا الكوبون غير مُفعَّل حالياً."}` | `is_active` is false |
| `400` | `{"detail": "لم يبدأ هذا الكوبون بعد."}` | `start_date` in the future |
| `400` | `{"detail": "انتهت صلاحية هذا الكوبون."}` | `expires_at` passed |
| `400` | `{"detail": "تم استخدام هذا الكوبون الحد الأقصى من المرات."}` | `used_count ≥ max_uses` |
| `400` | `{"detail": "الحد الأدنى لتطبيق هذا الكوبون هو <min_order_amount> <currency code>"}` | the cart subtotal is below the coupon's minimum (the minimum is in the store currency and converted for the comparison). The text prints the store currency **code** (for example `SAR`), not a symbol |
| `400` | `{"detail": "هذا الكوبون لا يشمل المنتجات في سلتك."}` | a category- or product-scoped coupon with no matching line |

**How it is stored.** The coupon id goes to `session['applied_coupon_id']`, never into the URL (FR-11.11). Before answering, the service runs `build_order_invoice` with the new coupon; if the invoice reports a coupon error the **previous** coupon is put back (or the key removed) and the error is returned, so a rejected code never replaces a good one.

### `DELETE /api/v1/cart/coupon/`

Removes `applied_coupon_id` and returns the whole cart (`coupon_code: null`, `display_total` back to the undiscounted value). Calling it with no coupon is harmless.

## 7. Abandoned-cart phone capture <a id="contact"></a>

### `POST /api/v1/cart/contact/`

**Request body**: `{"phone": "<WhatsApp number>", "name": "<optional>"}`.

| Field | Rules |
|---|---|
| `phone` | cleaned by `clean_phone_number`, then must match `^(967|966)\d{9}$`. `0771234567` becomes `967771234567`. Anything else: `400` `{"phone": ["رقم واتساب غير صحيح."]}` |
| `name` | trimmed, cut to 150 characters, may be empty |

**Response**: `204`, no body.

**Effect.** The cart snapshot is refreshed (`capture_cart`), then `attach_cart_customer` stores the name and the phone on the session's `AbandonedCart` row (`customer_name`, `customer_phone`; an empty name is stored as `NULL`). That row is the target of the abandoned-cart reminders of the marketing hub (M13, INT-019: templates, channel, the step-2 coupon), documented in [`../07-marketing-design-partners/m13-marketing.md#abandoned-carts`](../07-marketing-design-partners/m13-marketing.md#abandoned-carts). When the Sharwa-AI cart publisher is enabled and a phone is present, a `cart.updated` event is published with the full cart. `attach_cart_customer` swallows its own errors (it logs them), so the answer is `204` even if the row could not be updated; with an **empty** cart there is no snapshot row to update. `test_contact_capture` pins the invalid phone body, the `204` and the stored `('967771234567', 'منى')`.

## 8. Restore an abandoned cart <a id="restore"></a>

### `POST /api/v1/cart/restore/`

**Request body**: `{"token": "<signed token>"}`.

**Response `200`**: the whole cart (like `GET cart/`), now containing the restored lines and, if there is one, the reminder coupon.

**Token.** A Django signed value (`signing.dumps({'cart_id': id}, salt='abandoned-cart-restore')`, built by `build_cart_restore_token`) accepted for **7 days** (`RESTORE_MAX_AGE = 7 × 24 × 3600`). A bad signature, an expired token or a cart that no longer exists all give the same answer:

| Status | Body |
|---|---|
| `404` | `{"detail": "رابط استرداد السلة غير صالح أو انتهت صلاحيته."}` |

**What it does** (`storefront_cart_service.restore`, the same logic as the legacy `restore_abandoned_cart`)

1. For every item of the abandoned cart that still has a product, the session cart gets a line under the key `"<product_id>_<size>_<color>"` with the stored quantity, size and colour and `variant_id: null`. A line that already has the same key in the session is **replaced** (its quantity becomes the abandoned quantity, it is not added to). Other session lines are kept — it is a merge by key.
2. If the abandoned cart has a `reminder_discount_coupon` and the coupon is still valid (`is_valid()[0]`), it becomes the session's `applied_coupon_id`, replacing any coupon applied before. An invalid coupon is silently skipped.
3. The restore does not check visibility or stock: a product that is gone shows later in `GET cart/` as an unavailable, unpriced line.

`test_restore_with_coupon` pins `404` for a bad token and, for a valid one, `count 2` and `coupon_code "BACK1"`.

### The `/cart/restore/<token>` redirect <a id="restore-redirect"></a>

The link a reminder carries goes to the storefront page `/cart/restore/<token>` (`src/app/(storefront)/_s/[store]/cart/restore/[token]/page.tsx`), which sends the visitor to `/cart?restore=<token>`. The `/cart` page (`CartPage`) calls `POST /api/bff/cart/restore` with the token, writes the returned cart into the cart query, shows the toast «استعدنا سلتك» (with «وطبّقنا كود الخصم <code>.» when a coupon came back), and then replaces the URL with `/cart` so the token leaves the address bar. On failure it shows the server's message, or «تعذّر استرداد السلة.» when there is none.

> Note — the redirect page file itself (643 bytes, eight folders below the connected folder) could not be read in this step: the file bridge stages at most seven levels. The redirect target `/cart?restore=<token>` is taken from the roadmap and from `CartPage`, which reads exactly that parameter. Reported in step 12.

## 9. Gaps closed and fixes (Phase 002)

| Item | Change | Task |
|---|---|---|
| `add` | honours `variant_id` and `quantity` (it used to ignore them) | INT-013 |
| Stock and limits | the cap logic of [§5](#cart-actions) | INT-013 |
| Cart contract | line extensions, coupon, offers, free-shipping fields | INT-013 |
| New rows | `cart/coupon/`, `cart/contact/`, `cart/restore/` | INT-013 |
| Abandoned-cart snapshot | kept after every action | INT-013 |
| Passthrough body | request bodies buffered so writes carry a body | A.11 |
| Free-shipping unit | threshold treated as store-currency money; settings labels and the cart mock say so (noor fixture 30000 → 300) | INT-013 / INT-010 / INT-021 |
| Tier prices | the cart charges the tier shown on the product page | INT-044 |
| Personalization | surcharge per unit charged | INT-045 |
| Bookings | add with a slot, release on decrease/remove/clear, count in the badge, hold expiry | INT-036 |

No migration belongs to the cart rows.

## 10. Open items

- `bundle_selection` is not wired ([§5.2](#not-wired)).
- The cart payload does not expose the automatic-offer discount amount ([§4.3](#hidden), the observation after `DELETE`).
- `?currency=` is stored in the session without validation ([§4](#get-cart)).
- The stale docstring in `storefront_cart_service.py` about personalization ([§4.1](#pricing)).

## 11. Related pages

- Domain overview: [`README.md`](README.md)
- Product page prices: [`m10-product-detail.md`](m10-product-detail.md)
- Checkout, which reads this cart: [`m12-checkout.md`](m12-checkout.md)
- Money formatting: [`../../overview/money.md`](../../overview/money.md)
