# Product detail API — M10 (صفحة تفاصيل المنتج)

> **Source**: DOC-095, DOC-096, DOC-097 · INT-012 (M10), INT-029 (M42), INT-036 (M26), INT-044 (M36), INT-045 · inventory Domain 5 + A.6
> **Live key**: *Django-first, no switch* — read server-side by `getProduct()` (no cookie, cached); reviews and quote through the `/api/v1/*` passthrough ([`../../overview/bff.md#django-first`](../../overview/bff.md#django-first))
> **Django provider**: `sharwa_saas/api/views.py` (`ProductDetailView`) · `api/serializers.py` (`ProductListSerializer`, `ProductDetailSerializer.to_representation`) · `products/services/storefront_product_service.py` (`detail_extensions`, `reviews_page`, `reviews_summary`, `formula_quote`) · `api/views_storefront.py` (`ProductReviewsView`, `ProductQuoteView`) · wired in `api/urls.py` (names `product-detail`, `product-reviews`, `product-quote`)
> **Frontend contract**: `sharwa-frontend/src/features/storefront/schemas/catalog.ts` (`ProductDetailSchema`, `ReviewsPageSchema`, `QuoteSchema`) · fetcher `features/storefront/api/catalog.ts` (`getProduct`) · fixtures `src/mocks/storefront/catalog.ts`
> **Tests**: `sharwa_saas/api/test_storefront_product_api.py` — `StorefrontProductTests` (5 tests: extensions and types, used variant options, formula/bundle/personalization, related products, reviews page and summary)
> **Last verified against code**: 2026-10-27 (step 12)

## 1. Overview

The product page reads three public rows: the **detail** of one product (`catalog/products/<id>/`), its **reviews** (`…/reviews/`) and, for formula-priced goods sold by weight or length, a **price quote** (`…/quote/?value=`). All three are public: no login, no CSRF for the `GET`s, only a resolved store ([`m09-storefront-home-catalog.md#2-access--gate-chain`](m09-storefront-home-catalog.md)). A product that is not sold — draft, archived or scheduled in the future — answers `404` on all three, and the storefront shows its "not found" page.

Before INT-012 the detail row served only the list card plus `description`, `sizes_list`, `colors_list` and `deposit_required` (ready-api-v1 row #4). INT-012 added 35 keys on top of those, all with the field names of the Django models, and every amount as a `display_*` string in the buyer's currency. The same endpoint also feeds the add-to-cart panel, so the numbers on this page are the numbers the cart will charge ([`m11-cart.md`](m11-cart.md)).

## 2. Access — gate chain

| # | Gate | Requirement | Failure |
|---|---|---|---|
| 1 | Tenant | the host resolves to an active, provisioned store | `404` / `403` / `503` — [`../01-public-onboarding/m47-tenant-guard.md`](../01-public-onboarding/m47-tenant-guard.md) |
| 2 | Tenant context | `HasTenantContext` | `403` «لم يتم تحديد المتجر المطلوب. استخدم النطاق الفرعي للمتجر أو أرسل ترويسة X-Store-Domain.» |
| 3 | Session · CSRF · plan feature · permission key | none on `GET` (`reviews/` `POST` is described in [`m42-wishlist-reviews.md`](m42-wishlist-reviews.md)) | — |
| 4 | Resource state | `Product.objects.visible()` | `404` — detail: DRF's default not-found body (`{"detail": …}`); reviews and quote: `{"detail": "المنتج غير موجود."}` |

## 3. Endpoint summary

| Method | Django path (`/api/v1/…`) | BFF path | Purpose |
|---|---|---|---|
| `GET` | `catalog/products/<id>/` | none — `getProduct(store, storeHost, id, currency)` | the product page payload ([§4](#detail)) |
| `GET` | `catalog/products/<id>/reviews/` | none — passthrough | approved reviews, paged ([§5](#reviews)) |
| `GET` | `catalog/products/<id>/quote/?value=` | none — passthrough | price of `value` units of a formula product ([§6](#formula-quote)) |

The auction (`…/auction/`, `…/bids/`), booking (`…/slots/`, `…/slots/hold/`) and back-in-stock (`…/back-in-stock/`) rows share the prefix; they belong to Domains 3, 13 and 5 part B and are not described here.

## 4. Product detail <a id="detail"></a>

### `GET /api/v1/catalog/products/<id>/`

**Path**: `<id>` is the integer product id.

**Query parameters**

| Name | Type | Default | Notes |
|---|---|---|---|
| `currency` | `SAR` · `USD` · `YER_NEW` · `YER_OLD` | `SAR` | every amount on the page is converted with `_convert_value_to_target` — the function the cart and checkout price with, so there is no parallel calculation. Not validated against the choices list. The default is the literal `SAR`, **not** the store currency |

**How the payload is built.** `ProductDetailSerializer` extends the card serializer ([`m09-storefront-home-catalog.md#products`](m09-storefront-home-catalog.md)) with `description`, `sizes_list`, `colors_list` and `deposit_required` (the raw decimal). Its `to_representation` then merges the dictionary returned by `storefront_product_service.detail_extensions(…)`. The server fetcher `getProduct()` is Django-first: `200` parses with `ProductDetailSchema` (a body that does not parse throws), `404` returns `null` (the page shows not-found), the fixture answers only on `405`/`501` or Django down with mocks on.

### 4.1 The payload, block by block

**Card and legacy keys** (before INT-012): `id`, `name`, `image`, `image_url`, `category`, `display_price`, `display_old_price`, `stock`, `is_featured`, `is_free_shipping`, `payment_policy`, `badges`, `slug`, `description`, `sizes_list`, `colors_list`, `deposit_required`. `sizes_list` and `colors_list` are the comma-separated `sizes` / `colors` text split and trimmed.

**Extension keys** (INT-012). The test pins all 35: `display_deposit name_en description_en images video_url unit min_quantity max_quantity allow_variable_quantity low_stock_threshold allow_backorder delivery_duration product_template product_type variant_display_style attributes variants tier_prices pricing_type formula is_bundle bundle is_personalizable personalization_fields refundable_deposit is_auction is_bookable booking_duration_minutes category_path brand related reviews_summary meta_title meta_description structured`.

| Block | Keys | Rules |
|---|---|---|
| Names and text | `name_en`, `description_en`, `video_url`, `delivery_duration` | `null` when empty |
| Images | `images[]` `{url, alt, sort_order}` | the gallery rows with a file, as absolute URLs; `alt` is the product name. With no gallery row the main image is returned as a single item with `sort_order: 0`; no image at all gives `[]` |
| Unit and limits | `unit`, `min_quantity`, `max_quantity`, `allow_variable_quantity`, `low_stock_threshold`, `allow_backorder` | `min_quantity` and `max_quantity` are decimals in the model (weight and length products) but are sent as **integers** (`_int_or_none` → `int(value)`), or `null`. A fraction is therefore truncated: `0.5` is sent as `0` (see the open items) |
| Template and type | `product_template`, `product_type`, `variant_display_style` | as stored |
| Variants | `attributes[]`, `variants[]` | see [§4.2](#variants) |
| Tier prices | `tier_prices[]` `{min_quantity, display_price}` | the product's tiers as stored. The cart **charges** them since INT-044 ([`m11-cart.md`](m11-cart.md)): the highest threshold not above the line quantity; a variant line or a formula product ignores them even though the list is still sent |
| Pricing type and formula | `pricing_type` (`fixed` when empty), `formula` | see [§4.3](#formula) |
| Bundle | `is_bundle`, `bundle` | see [§4.4](#bundle) |
| Personalization | `is_personalizable`, `personalization_fields[]` | see [§4.5](#personalization) |
| Deposit | `display_deposit`, `refundable_deposit` | `display_deposit` only when `payment_policy = deposit` and a deposit is set. `refundable_deposit` `{display_amount, refund_rule, return_event}` only when the product has a refundable deposit with an amount; otherwise `null` |
| Auction and booking | `is_auction`, `is_bookable`, `booking_duration_minutes` | `is_bookable` is `false` while the plan feature `bookings` is off for the store (FR-26.01, INT-036): no slot picker is shown. `is_auction` is a flag only — the auction rows are in Domain 3 (INT-045) |
| Category path | `category_path[]` `{id, name}` | from the root to the product's category; follows `parent`, guarded against cycles |
| Brand | `brand` `{id, name}` | `null` without a brand |
| Related | `related` `{related, upsell, cross_sell}` | lists of **cards** ([§4.6](#related)) |
| Reviews | `reviews_summary` `{average_rating, count, rating_distribution}` | `null` when there is no approved review ([§5](#reviews)) |
| SEO | `meta_title`, `meta_description` | `null` when empty |
| JSON-LD values | `structured` `{price, currency, sku, brand, availability}` | `price` is the converted price with two decimals (`"100.00"`); `currency` is the ISO code (`YER_OLD` and `YER_NEW` both become `YER`); `sku`, `brand` may be `null`; `availability` is `InStock` when `stock > 0`, else `PreOrder` when backorder is allowed, else `OutOfStock`. Raw values — the page builds the JSON-LD from them |

**Currency conversion (`?currency=`).** `display_price`, `display_old_price`, `display_deposit`, every `display_*` inside the blocks above and the `structured.price` are produced from the product's own currency through the store's rates (`StoreSetting`), rounded by the target currency: two decimals for `SAR` and `USD`, whole numbers for the two Yemeni rials. `test_extensions_present_and_typed` shows a product of 100 SAR printed «52,000 ر.ي» with `?currency=YER_NEW` and `structured.currency = "YER"`.

**Example** (abbreviated; values from `test_extensions_present_and_typed`, a shirt in «قمصان» under «ملابس», brand «نور», one tier price)

```json
{
  "id": 12,
  "name": "قميص",
  "display_price": "100 ر.س",
  "display_old_price": null,
  "payment_policy": "cod",
  "min_quantity": 1,
  "max_quantity": null,
  "tier_prices": [{ "min_quantity": 10, "display_price": "90 ر.س" }],
  "category_path": [
    { "id": 1, "name": "ملابس" },
    { "id": 2, "name": "قمصان" }
  ],
  "brand": { "id": 1, "name": "نور" },
  "reviews_summary": null,
  "meta_title": "قميص قطني",
  "structured": { "price": "100.00", "currency": "SAR", "sku": "SH-1", "brand": "نور", "availability": "InStock" }
}
```

### 4.2 Variants <a id="variants"></a>

`attributes[]` lists only the attributes **used by at least one variant** of this product, each with only the options actually used (not the whole dictionary of attribute options):

| Field | Type | Meaning |
|---|---|---|
| `id` · `name` | integer · string | the attribute (for example «اللون») |
| `field_type` | string | as stored |
| `is_required` | boolean | always `true` here |
| `options[]` | array | `{id, value, image, color}` — `image` is an absolute URL or `null`; `color` is the swatch colour or `null`. Sorted by `value`. Attributes are sorted by `sort_order`, then name |

`variants[]` has one row per `ProductVariant`: `id`, `option_ids` (sorted option ids), `display_effective_price` (the product price plus the variant's extra price, converted), `stock` (a number), `sku` (`''` when empty) and `image`. A product without variants returns `attributes: []` and `variants: []`. `test_variants_only_used_options` pins the "used options only" rule and a variant of 100 + 10 shown as «110 ر.س».

### 4.3 Formula <a id="formula"></a>

`formula` is `null` unless `pricing_type = formula` and a unit price is set. Otherwise `{unit, display_unit_price, coefficient, display_fixed_extra}`: `unit` is the display name of the unit (for example gram), `coefficient` the multiplier as plain text without trailing zeros (`"0.875"`, default `"1"`), `display_fixed_extra` the fixed extra or `null`. The unit price of the formula is `unit price × coefficient + fixed extra`, rounded to two decimals.

### 4.4 Bundle <a id="bundle"></a>

`bundle` is `null` unless the product is a bundle with at least one component row.

| Field | Type | Meaning |
|---|---|---|
| `display_build_fee` | string \| null | the bundle's build fee, `null` when zero |
| `display_total` | string | build fee **plus** `price × quantity` of every **mandatory** component; optional components are not counted |
| `unavailable_component` | string \| null | name of the first mandatory component that is out of stock and not on backorder |
| `components[]` | array | `{product_id, name, image, quantity, is_optional, in_stock, display_price, choice}` — `choice` is always `null` here |
| `rules[]` | array | compatibility rules `{id, attribute_a_id, attribute_a_name, operator, attribute_b_id, value}` |

`test_formula_bundle_personalization`: components 2 × «قطعة» at 40 (out of stock) and one optional at 10, build fee 5 → `display_total` «85 ر.س» and `unavailable_component` «قطعة».

> Open item (inventory A.13) — the PDP does not send `bundle_selection` to the cart, so a bundle's chosen options are not carried to the order (INT-045). See [`m11-cart.md`](m11-cart.md).

### 4.5 Personalization <a id="personalization"></a>

`personalization_fields[]` (empty unless `is_personalizable`) is ordered by `sort_order`, then `id`: `{id, label, field_type, is_required, options[], display_price_add}`. `options` is the comma-separated `options_csv` split and trimmed; `display_price_add` is the surcharge per unit, or `null` when zero. Since INT-045 the cart **charges** these surcharges for the fields the buyer filled ([`m11-cart.md`](m11-cart.md)).

### 4.6 Related products <a id="related"></a>

`related`, `upsell` and `cross_sell` are lists of cards of visible products (the product itself is excluded), at most **8**, **4** and **4** items. For each list the merchant's manual `RelatedProduct` links of that type come first, in `sort_order`; **only when the merchant set none for that type** the server derives the list the way the mock did:

| List | Automatic rule | Order |
|---|---|---|
| `related` | same category | newest first (`-created_at`, `-id`) |
| `upsell` | same category and a **higher** price | newest first |
| `cross_sell` | products of the same collections, from a **different** category | newest first |

A product without a category has no automatic `related` or `upsell`; one without collections has no automatic `cross_sell`. `test_related_manual_then_automatic` pins both modes.

## 5. Reviews <a id="reviews"></a>

### `GET /api/v1/catalog/products/<id>/reviews/`

**Query parameters**

| Name | Type | Default | Notes |
|---|---|---|---|
| `page` | integer | `1` | not a number or below 1 → `1`. A page past the end returns an empty `results` and `next: null`, never `404` |
| `rating` | `1`–`5` | all | any other value is ignored (no filter) |

**Response `200`** — the summary block plus one page of **5** reviews, newest first (`-created_at`, `-id`):

```json
{
  "average_rating": 3.6,
  "count": 7,
  "rating_distribution": { "1": 1, "2": 1, "3": 1, "4": 1, "5": 3 },
  "next": "?page=2",
  "results": [
    {
      "id": 21,
      "rating": 5,
      "comment": "جيد",
      "customer_name": "عميل 4",
      "created_at": "2026-10-27T09:30:00+00:00",
      "admin_reply": null
    }
  ]
}
```

The summary figures are those of `test_reviews_page_filter_and_summary` (seven reviews rated 5, 5, 4, 2, 5, 3, 1); the review row and its date are fixture values.

| Field | Type | Meaning |
|---|---|---|
| `average_rating` | number | average of the approved reviews, one decimal; `0` when none |
| `count` | integer | number of approved reviews — **not** filtered by `rating` |
| `rating_distribution` | object | counts for `"1"`…`"5"`, always all five keys |
| `next` | string \| null | the **query string** of the next page (`"?page=2"`), not a URL; `null` on the last page. The server fetches one row more than the page size to know |
| `results[]` | array | `{id, rating, comment, customer_name, created_at (ISO 8601), admin_reply}` — `admin_reply` is `null` when empty |

The summary (`average_rating`, `count`, `rating_distribution`) always covers **all** approved reviews; only `results` follows the `rating` filter (the test: filter `rating=5` returns 3 rows while `count` stays 7).

**Only approved reviews** are counted and listed (`ProductReview.is_approved`, INT-029). Reviews that existed before the moderation feature default to approved. The product page's `reviews_summary` is the same summary, or `null` when the count is `0`.

**Errors**

| Status | Body | When |
|---|---|---|
| `404` | `{"detail": "المنتج غير موجود."}` | the product is not visible |

**The `POST` on the same URL** submits a review (`{rating, comment, phone, otp, name?}`; stored pending the merchant's approval) and is documented with INT-029 in [`m42-wishlist-reviews.md`](m42-wishlist-reviews.md).

## 6. Formula quote <a id="formula-quote"></a>

### `GET /api/v1/catalog/products/<id>/quote/?value=`

Prices `value` units of a **formula** product (gold by the gram, fabric by the metre).

**Query parameters**

| Name | Type | Default | Notes |
|---|---|---|---|
| `value` | decimal | required | must be finite and greater than zero |
| `currency` | `SAR` · `USD` · `YER_NEW` · `YER_OLD` | the store's currency, else `SAR` | **differs from the detail row**, whose default is the literal `SAR` |

**Response `200`**

```json
{ "display_price": "437.50 ر.س" }
```

The amount is `250 × 0.875 × 2` from `test_formula_bundle_personalization` (unit price 250, coefficient 0.875, value 2): the unit price 218.75 times 2 is 437.5, printed by `format_money` with two decimals because it is not a whole number ([`../../overview/money.md`](../../overview/money.md)).

**Errors**

| Status | Body | When |
|---|---|---|
| `400` | `{"value": ["أدخل قيمة أكبر من صفر."]}` | missing, not a number, not finite, zero or negative |
| `400` | `{"detail": "هذا المنتج بسعر ثابت."}` | the product is not formula-priced (also a bundle with a fixed price) |
| `404` | `{"detail": "المنتج غير موجود."}` | the product is not visible |

**The "same price as the cart" rule.** The quote is the unit price from the same function the cart uses (`Product.calculate_formula_unit_price`, the formula result rounded to two decimals) multiplied by `value`, then converted to the target currency. The cart prices a formula line with `get_converted_price` (convert the unit price, round it, multiply by the line quantity).

> ⚠️ Discrepancy — roadmap says "formula unit price × `value` = exactly what the cart charges" / code does: this holds exactly only when the target currency is the product currency. The quote converts **after** multiplying, the cart converts the unit price **before** multiplying (`products/models/catalog.py`, `_convert_value_to_target` rounds to whole numbers for the Yemeni rials and two decimals otherwise), so in a converted currency the two can differ by up to the quantity times half a rounding step. Also, the quote takes a decimal `value`, but the cart quantity is an integer (`Cart.add` does `int(quantity)`, and `apply_action` falls back to `1` for a value such as `2.5`). Found by reading the code, not by running it. Reported in step 12.

**History.** When INT-012 shipped, some PDP rows were still on the fixture: the review `POST` and back-in-stock (now INT-029), the auction and bids (INT-045), the slots and the hold (INT-036). Django answered `404`/`405` for them in the meantime, so the storefront kept working; all of them are served by Django now. The test docstring still says "POST = 405 until M42"; the test itself was updated and expects `400` for an empty `POST`.

## 7. Gaps closed and fixes (Phase 002)

| Item | Change | Task |
|---|---|---|
| Detail payload | 35 extension keys merged by `ProductDetailSerializer.to_representation` | INT-012 |
| Card price text | `format_money` instead of `get_formatted_price` | INT-012 |
| Reviews | only approved reviews listed and counted | INT-029 |
| Tier prices | the cart charges the tier price shown on the page | INT-044 |
| Personalization surcharges | the cart charges them | INT-045 |
| `is_bookable` | `false` while the `bookings` feature is off | INT-036 |

No migration belongs to the three rows themselves; the model fields they read come from earlier migrations ([`../03-catalog/m04-products.md`](../03-catalog/m04-products.md)).

## 8. Open items

- `bundle_selection` is not sent by the PDP (INT-045), see [`m11-cart.md`](m11-cart.md).
- `currency` is not validated on the detail row.
- `min_quantity` / `max_quantity` are truncated to integers in the payload while the model keeps decimals (decision of 2026-10-22: min/max quantities are decimals for weight and length products). A fractional minimum such as `0.5` reaches the storefront as `0`. Found by reading `_int_or_none` in `storefront_product_service.py`; not run. Decision needed from fares.

## 9. Related pages

- Domain overview: [`README.md`](README.md)
- Listing, facets, offers: [`m09-storefront-home-catalog.md`](m09-storefront-home-catalog.md)
- Cart (how these prices are charged): [`m11-cart.md`](m11-cart.md)
- Product model and editor API: [`../03-catalog/m04-products.md`](../03-catalog/m04-products.md), [`../03-catalog/m37-advanced-products.md`](../03-catalog/m37-advanced-products.md)
