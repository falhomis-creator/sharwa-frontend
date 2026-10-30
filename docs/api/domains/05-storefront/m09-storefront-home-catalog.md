# Storefront home & catalog API — M09 (واجهة المتجر: الصفحة الرئيسية وصفحات التصفّح)

> **Source**: DOC-090, DOC-091, DOC-092, DOC-093, DOC-094 · INT-011 (M09), INT-010 (M34 extensions), INT-018 (M08), INT-019 (M13), INT-023 (M19), INT-002 hand-over · inventory Domain 5 + A.2 + A.11
> **Live key**: *Django-first, no switch* — server fetchers `getPublicJson` (no cookie) and the BFF rows through `storefrontAdapter`; fixtures only on `404`/`405`/`501` or Django down with `SHARWA_MOCKS=on` ([`../../overview/bff.md#django-first`](../../overview/bff.md#django-first))
> **Django provider**: `sharwa_saas/api/views.py` (`StoreConfigView`, `CategoryListView`, `ProductListView`, `ProductPagination`) · `api/views_storefront.py` (`CatalogFacetsView`, `CatalogOffersView`) · `products/services/storefront_catalog_service.py` (`filter_visible`, `ordered`, `facets`, `active_offers`, `offer_link`) · serializers `api/serializers.py` (`StoreConfigSerializer`, `StoreSectionSerializer`, `CategorySerializer`, `ProductListSerializer`) · wired in `api/urls.py` (names `store-config`, `category-list`, `product-list`, `catalog-facets`, `catalog-offers`)
> **Frontend contract**: `sharwa-frontend/src/features/storefront/schemas/config.ts` (re-exports `storeConfigSchema` from `src/lib/schemas/store-config.ts`) · `schemas/catalog.ts` (`CategoryTreeSchema`, `ProductPageSchema`, `FacetsSchema`, `OffersSchema`, `PRODUCT_QUERY_KEYS`) · fetchers `features/storefront/api/{config,catalog,upstream}.ts` · BFF rows `src/app/api/bff/catalog/facets/route.ts`, `catalog/offers/route.ts` · fixtures `src/mocks/storefront/{config,catalog}.ts`
> **Tests**: `sharwa_saas/api/test_storefront_catalog_api.py` — `StorefrontCatalogTests` (6 tests: category tree, card shape, search/ordering/pages, hidden products, facet counts, offers window and links)
> **Last verified against code**: 2026-10-27 (step 12)

## 1. Overview

This page covers the five public reads that draw the storefront home page and the product listing pages: the store config with its home sections, the category tree, the product list, the filter facets and the promotional offers. All five are **public**: no login, no CSRF (they are `GET`s), and the buyer's identity (an anonymous Django session) plays no part. They only need a store — the host or `X-Store-Domain` must resolve to a ready store, otherwise the tenant guard answers first ([`../01-public-onboarding/m47-tenant-guard.md`](../01-public-onboarding/m47-tenant-guard.md)).

Before INT-011 the `/config/`, `categories/` and `products/` rows already existed (ready-api-v1 rows #1–#3). INT-011 closed four gaps: `image` on every category, three new fields on the product card (`image_url`, `badges`, `slug`), `search` with Arabic normalization plus `ordering`, and two new rows, `catalog/facets/` and `catalog/offers/`. The list and the facets share **one** rule set (`storefront_catalog_service.filter_visible`), so a facet count is always the number of cards the buyer sees after picking that facet.

Every price on these pages is a server string (`display_price`, `display_old_price`). The browser never formats money ([`../../overview/money.md`](../../overview/money.md)).

## 2. Access — gate chain

| # | Gate | Requirement | Failure |
|---|---|---|---|
| 1 | Tenant | the host (or `X-Store-Domain`) resolves to an active, provisioned store | `404` / `403` / `503` from the middlewares — [`m47-tenant-guard.md`](../01-public-onboarding/m47-tenant-guard.md) |
| 2 | Tenant context | `HasTenantContext`: the connection is not on the `public` schema | `403` `{"detail": "لم يتم تحديد المتجر المطلوب. استخدم النطاق الفرعي للمتجر أو أرسل ترويسة X-Store-Domain."}` |
| 3 | Session · CSRF · plan feature · permission key | none. `facets/` and `offers/` set `authentication_classes = []`; the other three rows use the project default authentication but need no identity | — |
| 4 | Resource state | products are read through `Product.objects.visible()`: published, not archived, and `published_at` not in the future | hidden products simply never appear |

## 3. Endpoint summary

| Method | Django path (`/api/v1/…`) | BFF path (`/api/bff/…`) | Read by (server) | Purpose |
|---|---|---|---|---|
| `GET` | `config/` | none | `getStoreConfig(store, storeHost)` | store identity, colours, announcement bar, home sections ([§4](#config-and-sections)) |
| `GET` | `catalog/categories/` | none | `getCategories(store, storeHost)` | category tree for the strip and the menus ([§5](#categories)) |
| `GET` | `catalog/products/` | none | `getProducts(store, storeHost, query, currency)` | paginated product cards ([§6](#products)) |
| `GET` | `catalog/facets/` | `catalog/facets` | `getFacets(store, storeHost, query)` | brand, tag and collection counts ([§7](#facets)) |
| `GET` | `catalog/offers/` | `catalog/offers` | `getOffers(store, storeHost)` | active promotional offers ([§8](#offers)) |

Rows without a BFF path are reached from the browser through the transparent same-origin passthrough `/api/v1/*` (`src/app/api/v1/[...path]/route.ts`), which adds no caching and no transformation. The two BFF rows use `storefrontAdapter` (Django first, fixture on `404`/`405`/`501` or Django down).

### 3.1 Read path and fallback rule <a id="read-path"></a>

The server fetchers call `getPublicJson(path, storeHost)` (`features/storefront/api/upstream.ts`): a plain `fetch` to Django with `x-store-domain` and `x-forwarded-host`, **no cookie** (a cookie would make a `'use cache'` entry per-visitor, research R-02) and `redirect: "manual"`. It returns `{status, data, isMockable}` where `isMockable` is true for `404`, `405` and `501`, or `null` when Django is unreachable.

| Django answer | `getStoreConfig` | `getCategories` | `getProducts` | `getFacets` · `getOffers` |
|---|---|---|---|---|
| `200` and the body parses | the parsed value | the parsed value | the page | the parsed value |
| `200` and the body does **not** parse | throws `StorefrontUnavailableError` (`502`) | throws (`502`) | throws (`502`) | the empty value (`{brands: [], tags: [], collections: []}` / `[]`) — never the fixture |
| `404`/`405`/`501` or unreachable, `SHARWA_MOCKS=on` | the fixture | the fixture | the fixture (`listPublicProducts`) | the fixture |
| the same, mocks off | throws | `[]` | `404` becomes the result `{ok: false, status: 404}`, anything else throws | `{brands: [], tags: [], collections: []}` / `[]` |

Failures **throw** and are therefore never cached. Every fetcher is `"use cache"` with `cacheLife("minutes")` and `cacheTag(storeTag(store))`, where `store` is an explicit first argument so two stores can never share an entry. A successful write from a store host revalidates the `store:<store>` tag, so a merchant's change shows at once ([`../../overview/bff.md`](../../overview/bff.md)).

> Observation — with `SHARWA_MOCKS=on` a `404` from Django is treated as "row not shipped", so a page past the end of the list is answered by the fixture, not by Django's `404`. With mocks off (production) the Django `404` becomes the `{ok: false, status: 404}` result and the listing page corrects the URL. The two environments therefore differ on this edge only.

## 4. Store config and home sections <a id="config-and-sections"></a>

### `GET /api/v1/config/`

The full description of this row (gate chain, caching, every field and its owner, the `tracking` block) is in [`../01-public-onboarding/config.md`](../01-public-onboarding/config.md). This section records what the **storefront home** reads from it and which task put each field there.

**Query parameters**: none. **Request body**: none. The response is not paginated and carries no money field except the free-shipping threshold ([§4.3](#free-shipping-threshold)).

**What was already live and what was added**

| Layer | Fields | Owner |
|---|---|---|
| Matched the contract before INT-011 | `store_name`, the four colours, `heading_font`, `body_font`, `design_style`, `theme_preset`, `brand_shades`, `theme_choice`, `logo`, `whatsapp_number`, `announcement_text`, `enable_announcement_bar`, `sections[]` (section types were already identical) | INT-002 (M47) |
| Extensions landed in INT-010 | `card_border_color`, `announcement_bg_color`, `announcement_text_color`, `announcement_scroll_speed`, `show_banner_on_home`, `show_banner_on_products`, `show_banner_on_product_detail`, `show_banner_on_checkout`, `free_shipping_threshold`, `currency`, `seo_title`, `seo_description`, `seo_keywords`, `seo_og_image` (absolute URL), `contact_email`, `facebook_link`, `instagram_link`, `tiktok_link`, `snapchat_link`, `about_us`, `return_policy`, `timezone`, `week_start_day` | INT-010 (M34) |
| Added by the view, not the serializer | `tracking` — public pixel ids only; `null` when the feature `tracking_tools` is missing from the plan, tracking is switched off or no id is filled | INT-023 (M19) |
| Section label | `sections[].label` | INT-018 (M08) |
| Gifting and loyalty | `gifting_enabled`, `loyalty_enabled` exist in the Zod schema but are **not** emitted by Django (see below) | INT-019 (M13) |

The serializer emits 39 fields (the 16 base ones plus the 23 listed in the INT-010 row) and the view adds `tracking`, 40 in all.

> ⚠️ Discrepancy — roadmap says "the M34 extensions landed in INT-010 … gifting/loyalty via INT-019" / code does: `StoreConfigSerializer.Meta.fields` (`api/serializers.py` lines 82–93) lists 39 names and none of them is `gifting_enabled` or `loyalty_enabled`; `StoreConfigView.get` (`api/views.py` lines 78–85) adds only `tracking`. The storefront reads `config.gifting_enabled ?? false`, so with Django live both flags are always `false` and the gift option and the loyalty UI are never offered from `/config/`. (`checkout/` still honours gifts through `GiftSettings.is_enabled`, see [`m12-checkout.md`](m12-checkout.md).) Same finding as in [`config.md`](../01-public-onboarding/config.md) §4.2. Decision needed from fares: either emit the two flags from `StoreConfigView` or remove them from the contract.

**Sections.** `sections` is `StoreSection.get_or_seed_defaults(store_setting).filter(is_active=True)` through `StoreSectionSerializer`: `id`, `section_type`, `label`, `order`, `is_active`, `settings`, `content_data`. `label` is the custom name set in the M08 editor, otherwise the display name of the section type (INT-018) — never empty. The storefront's `readSection` (`schemas/config.ts`) normalizes one section:

| Reads | From | Rule |
|---|---|---|
| `title` | `content_data.title`, then `settings.title` | `content_data` wins (US-09.1.2) |
| `categoryId` | `content_data.category_id`, then `settings.category_id` | `product_grid` needs it |
| `limit` | `content_data.limit`, then `settings.limit`, default `8` | a positive integer, at most `50` |
| `showOnMobile` | `settings.show_on_mobile` | default `true` |
| `subtitle`, `image`, `link`, `ctaText` | `content_data` | the hero's own copy; the hero falls back to the store name |
| `items[]` | `content_data.items` | `slider` and `banner_grid`: `{image, title, link}` |

Order is the merchant's (`order` ascending). An empty `sections` list falls back to the documented default: `latest_products`, then `category_strip` (US-09.1.4). A malformed blob degrades to defaults and never breaks the page; an unknown `section_type` is dropped with a `console.warn` ([`config.md`](../01-public-onboarding/config.md)).

**Read path.** `getStoreConfig` (rendering) and `probeStore()` (status authority) — see [§3.1](#read-path). The `[NEEDS BACKEND]` notes on these fields in `src/lib/schemas/store-config.ts` were updated when INT-010 and INT-018 landed.

### 4.3 The free-shipping threshold <a id="free-shipping-threshold"></a>

`free_shipping_threshold` is `"%.2f"` of the stored value (`"0.00"` means disabled, `null` when unset).

> ⚠️ Discrepancy — roadmap (DOC-098) says the threshold is compared "in the dashboard currency instead of YER_NEW" / code does: the serializer's comment (`api/serializers.py`, `get_free_shipping_threshold`) still says «بالريال اليمني الجديد كما هو مخزَّن» (in new Yemeni rial as stored), and [`config.md`](../01-public-onboarding/config.md) repeats it. The only consumer that compares the value, `pricing.build_order_invoice` (`products/pricing.py` lines 130–134), treats it as an amount in `store_setting.currency` and converts it into the cart currency with `convert_amount(threshold, store_setting.currency, cart_currency, …)`. The value in `/config/` is therefore in the store currency (`currency` field of the same payload). `config.md` was corrected in this step. Reported in step 12.

## 5. Categories <a id="categories"></a>

### `GET /api/v1/catalog/categories/`

**Query parameters**: none. **Request body**: none. **Pagination**: none (`pagination_class = None`).

**Response `200`** — the tree of root categories, each with its sub-categories nested recursively (`CategorySerializer`):

```json
[
  {
    "id": 1,
    "name": "عطور",
    "image": "https://noor.sharwa.example/media/categories/perfumes.png",
    "subcategories": [
      { "id": 2, "name": "عود", "image": null, "subcategories": [] }
    ]
  }
]
```

The values follow `test_category_tree_has_image_key` (root «عطور» with child «عود»); the image URL is a fixture value.

| Field | Type | Meaning |
|---|---|---|
| `id` | integer | `Category.pk` |
| `name` | string | category name |
| `image` | string \| null | **absolute** URL built from the request (`request.build_absolute_uri(obj.image.url)`), `null` without an image or without a request. Added by INT-011 for the home category strip |
| `subcategories` | array | the same object, recursively; `[]` for a leaf |

**Rules**

- The roots are `Category.objects.filter(parent__isnull=True)`; the children come from `obj.subcategories.all()`. Neither query sets an order of its own, so the order is `Category.Meta.ordering = ['sort_order', 'name', 'id']`. `sort_order` is the merchant's **global** drag-and-drop order from the dashboard ([`../03-catalog/m05-organization.md`](../03-catalog/m05-organization.md)), so the strip, the menus and the Django pages all show the same sequence.
- The tree is **not** filtered by visibility: a category with no visible product is still returned.

**Read path**: `getCategories` — a `200` that does not parse throws; other failures return `[]` (or the fixture, [§3.1](#read-path)).

## 6. Products <a id="products"></a>

### `GET /api/v1/catalog/products/`

**Query parameters**

| Name | Type | Default | Notes |
|---|---|---|---|
| `category` | integer | — | a **parent** category includes all its descendants (`descendant_ids` walks the whole tree). A non-numeric value is ignored |
| `brand` | integer | — | `Product.brand_id`; ignored when not numeric |
| `tag` | integer | — | `tags__id` |
| `collection` | integer | — | `collections__id`. The result is made `distinct()` when `tag` or `collection` is set |
| `search` | string | — | trimmed; see below |
| `is_featured` | `true` | — | only the exact text `true` (any case) filters |
| `ordering` | enum | `-created_at` | `-created_at` · `price` · `-price` · `name`. `created_at` (ascending) is also accepted by the code. Any other value falls back to the default. Ties break on `id` |
| `page` | integer | `1` | an invalid page, or one past the last page, answers `404` |
| `page_size` | integer | `20` | at most `50` (`ProductPagination`) |
| `currency` | `SAR` · `USD` · `YER_NEW` · `YER_OLD` | `SAR` | converts every price on the card with the store's rates. **Not** validated: an unknown code yields the unconverted value and a display string built by `format_money` for that code |

**Search.** `search` matches `name` or `name_en` after the shared Arabic normalization (`normalize_arabic` in `products/services/search_service.py`, mirrored by `src/lib/i18n/normalize.ts`; PostgreSQL side `lower(translate(…))`) with a *contains* test, **plus** `description` with a plain case-insensitive *contains* (the behaviour that existed before INT-011 is kept). A query that returns no product after all filters is written to `ZeroResultSearchLog(query_text, results_count=0)`; a failure to write it never breaks the search.

**Response `200`** — DRF page-number pagination:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 7,
      "name": "دهن عود",
      "image": null,
      "image_url": null,
      "category": "عود",
      "display_price": "100 ر.س",
      "display_old_price": null,
      "stock": "5.000",
      "is_featured": false,
      "is_free_shipping": false,
      "payment_policy": "cod",
      "badges": [{ "name": "الأكثر مبيعاً", "color": "#ff0000" }],
      "slug": "dahn-oud"
    }
  ]
}
```

Shape and badge values follow `test_card_shape_and_parent_category` (a product in «عود», listed by its parent «عطور»); the price, slug and ids are fixture values. The exact key set of a card is pinned by the test: `id name image image_url category display_price display_old_price stock is_featured is_free_shipping payment_policy badges slug`.

| Card field | Type | Meaning |
|---|---|---|
| `id` | integer | `Product.pk` |
| `name` | string | product name |
| `image` | string \| null | `image_url` first when set, else the local file as an absolute URL, else `null` |
| `image_url` | string \| null | the external image link kept apart (FR-09.09). INT-011 |
| `category` | string \| null | the category **name** (`source='category.name'`), not an object |
| `display_price` | string | `format_money` of the converted price, for example «100 ر.س». INT-012 fix: the legacy `get_formatted_price` printed Yemeni rial as a bare number («52,000»); the card now carries the symbol («52,000 ر.ي») like every other `display_*` |
| `display_old_price` | string \| null | only when `old_price > price` **and** `is_on_sale` |
| `stock` | decimal | current stock (`DecimalField`, 3 decimal places, so weight and length products can have fractions; the Zod schema coerces it to a number) |
| `is_featured` · `is_free_shipping` | boolean | merchant flags |
| `payment_policy` | enum | `full` · `cod` · `deposit` |
| `badges` | array | the merchant's manual badges `{name, color}`. INT-011 |
| `slug` | string | the readable URL part used after the id (M10 §10). INT-011 |

**Errors**

| Status | Body | When |
|---|---|---|
| `404` | `{"detail": "…"}` (DRF's invalid-page message) | `page` past the last page or not a valid page number |

**Visibility.** `Product.objects.visible()` only: published (`is_available`), not archived, `published_at` null or in the past. `test_hidden_products_never_listed` pins this for a draft, an archived and a scheduled product.

**Read path**: `getProducts` — a `404` is a *result* ([§3.1](#read-path)); the query keys the URL keeps are exactly `PRODUCT_QUERY_KEYS` (`category brand tag collection search is_featured page page_size ordering`), and the fetcher always adds `currency`.

## 7. Facets <a id="facets"></a>

### `GET /api/v1/catalog/facets/`

**Query parameters**: `category`, `brand`, `tag`, `collection`, `search`, `is_featured` — the same names and meaning as the list ([§6](#products)). `ordering`, `page`, `page_size` and `currency` are not read.

**Response `200`**

```json
{
  "brands": [
    { "id": 1, "name": "نور", "slug": "", "count": 2 },
    { "id": 2, "name": "أمل", "slug": "", "count": 1 }
  ],
  "tags": [{ "id": 1, "name": "هدايا", "slug": "", "count": 1 }],
  "collections": [{ "id": 1, "name": "الصيف", "slug": "", "count": 2 }]
}
```

Counts follow `test_facets_counts` (brand «نور» on two products, «أمل» on one; one tagged product; a collection of two); ids are fixture values and `slug` is whatever the row stores (`''` when empty).

| Field | Type | Meaning |
|---|---|---|
| `brands[]` · `tags[]` · `collections[]` | array | `{id, name, slug, count}` — `slug` is `''` when empty; each list is ordered by `name` |
| `count` | integer | number of **distinct** visible products carrying that value, after the filters below |

**Counting rule (disjunctive faceting).** The three dimensions are counted over the same visible product set as the list, with these filters applied: `category` (and its descendants), `search` and `is_featured` always; the other two of `brand`/`tag`/`collection` as chosen; **but each dimension ignores its own filter** (`filter_visible(params, omit=…)`). Choosing a brand therefore keeps the other brands on screen with their counts, while the tags and collections shrink to that brand. Values with a count of `0` are not listed. A `category` filter restricts all three dimensions (`test_facets_counts`: choosing the parent category leaves only brand «نور», count 1).

With no visible product the answer is `{"brands": [], "tags": [], "collections": []}`.

**Provider**: `products/services/storefront_catalog_service.py` (`facets`) behind `api/views_storefront.py` (`CatalogFacetsView`). **Read path**: `getFacets` and the BFF row `catalog/facets` ([§3.1](#read-path)).

## 8. Offers <a id="offers"></a>

### `GET /api/v1/catalog/offers/`

**Query parameters**: none.

**Response `200`** — an array, at most **6** items (`OFFERS_LIMIT`):

```json
[
  {
    "id": 3,
    "name": "خصم العود",
    "offer_type": "discount",
    "description": null,
    "image": null,
    "cta_text": null,
    "link": "/p/7",
    "valid_until": null
  }
]
```

Names and link rule follow `test_offers_active_window_and_links`; ids are fixture values. The key set is pinned by the test: `id name offer_type description image cta_text link valid_until`.

| Field | Type | Meaning |
|---|---|---|
| `offer_type` | enum | `discount` · `free_shipping` · `buy_x_get_y` |
| `description` · `cta_text` | string \| null | `null` when empty |
| `image` | string \| null | absolute URL or `null` |
| `link` | string | the storefront route the offer points to ([below](#offer-links)) |
| `valid_until` | ISO 8601 \| null | end of validity, `null` when open-ended |

**Which offers.** `PromotionalOffer` rows with `is_active = true`, inside their window (`valid_from` null or in the past, `valid_until` null or not yet passed), ordered `-priority` then `id`, first 6. The test creates an offer past its `valid_until` and a stopped one; neither is returned.

<a id="offer-links"></a>**Link mapping** (`offer_link`, the same rule as `PromotionalOffer.get_target_url` but with the Next.js routes):

| Offer | Link |
|---|---|
| `buy_x_get_y`, `buy_condition_type = product` and a buy product | `/p/<buy_product_id>` |
| `buy_x_get_y` with a buy category | `/c/<buy_category_id>` |
| `buy_x_get_y` otherwise | `/products` |
| other types, `condition_type = product` and a product | `/p/<product_id>` |
| other types, `condition_type = category` and a category | `/c/<category_id>` |
| anything else | `/products` |

The `promotional_offers` home section hides itself when the list is empty. **Read path**: `getOffers` and the BFF row `catalog/offers`.

## 9. Gaps closed and fixes (Phase 002)

| Item | Change | Task |
|---|---|---|
| Category image | `image` added to every node (absolute URL or `null`) | INT-011 |
| Card fields | `image_url`, `badges`, `slug` added | INT-011 |
| Parent category filter | a parent includes its descendants | INT-011 |
| Search | Arabic normalization on `name`/`name_en`; description kept | INT-011 |
| Ordering | `?ordering=` with four public values | INT-011 |
| New rows | `catalog/facets/`, `catalog/offers/` | INT-011 |
| Card price text | `format_money` instead of `get_formatted_price` (Yemeni rial keeps its symbol) | INT-012 |
| Config extensions | 23 fields from `StoreSetting` | INT-010 |
| Section label | `label` = custom name or type name | INT-018 |
| `tracking` block | public ids only, plan-gated | INT-023 |

No migration belongs to this page.

## 10. Open items

- `gifting_enabled` / `loyalty_enabled` are in the contract but not emitted by `/config/` (see [§4](#config-and-sections)).
- The `currency` query parameter of the list is not validated against `CURRENCY_CHOICES` ([§6](#products)).

## 11. Related pages

- Overview of the domain: [`README.md`](README.md)
- Product detail, reviews and the formula quote: [`m10-product-detail.md`](m10-product-detail.md)
- The full config payload: [`../01-public-onboarding/config.md`](../01-public-onboarding/config.md)
- Catalog organization (categories, brands, tags, collections, badges): [`../03-catalog/m05-organization.md`](../03-catalog/m05-organization.md)
- Money formatting and conversion: [`../../overview/money.md`](../../overview/money.md)
- BFF and the Django-first rule: [`../../overview/bff.md`](../../overview/bff.md)
