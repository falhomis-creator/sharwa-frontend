# Products API — M04 (المنتجات)

> **Source**: DOC-060, DOC-061, DOC-062, DOC-063, DOC-064 · INT-005 (M04) · A.9 (`0211`–`0215`) · inventory Domain 3
> **Live key**: `products` (`SHARWA_LIVE_MODULES`) — Phase A only. Phase B is **not** under this key: quantity prices → `b2b` (INT-044), bundles / compatibility / personalization / auction / serials / CSV import-export → `advanced_products` (INT-045). Categories, brands, tags, collections and badges are a different key, `catalog` ([`m05-organization.md`](m05-organization.md)).
> **Django provider**: `sharwa_saas/api/views_products.py` (gate + routing only) · `sharwa_saas/api/serializers_products.py` (contract ⇄ model mapping, cross-field rules) · `sharwa_saas/products/services/{product_service,variant_service,product_template_service,sector_seed_service,change_actor,product_api_errors}.py` · `sharwa_saas/products/blueprint.py` · `sharwa_saas/products/sector_catalog.py` · wired in `api/urls.py`
> **Frontend contract**: `sharwa-frontend/src/features/products/schemas/{product,variants,templates,enums}.ts` · fixture `src/mocks/catalog/products.ts` · adapter table `src/lib/bff/live-products.ts` (`PRODUCTS_LIVE_RULES`) · BFF `src/app/api/bff/products/**`
> **Tests**: `sharwa_saas/api/test_products_api.py` (30 tests in 5 classes) · mock scripts `scripts/product-minimum-check.ts`, `scripts/product-editor-ux-check.ts`, `scripts/catalog-orders-check.ts`
> **Last verified against code**: 2026-10-27 (step 07)

<a id="overview"></a>
## 1. Overview

The merchant dashboard's product screens — the list with its filters and in-place edits, the full editor, the quick-add dialog, the variant builder, the variant dictionary and the template screen — are served by one Django module. It exposes:

- **products**: list, detail, create, partial update, delete (or archive), quick add, bulk actions, change log, list stock edit, formula preview;
- **gallery**: upload, reorder, delete;
- **variants**: generate the combination matrix, bulk-edit combinations;
- **variant dictionary**: attributes and their typed options (`variant-attributes/**`);
- **product templates** (blueprints) and the 35 central **sectors**.

All of it lives on the **store host** and is called by the owner or a staff member through the BFF ([`../../overview/auth.md`](../../overview/auth.md)). The shapes are copied from the Zod schemas of the frontend, which are the Data Contract; Django renames fields in `serializers_products.py` and changes nothing in the frontend. Quantity prices, bundles, auctions, serial numbers and CSV import/export belong to Phase B ([`m37-advanced-products.md`](m37-advanced-products.md), [`../09-b2b/m36-b2b-wholesale.md`](../09-b2b/m36-b2b-wholesale.md)).

### 1.1 Provider files

| File | Role |
|---|---|
| `api/views_products.py` | Session + permission gate, parsing, delegation to services. Wraps `ProductApiError` into `Response(exc.body, exc.status)`. |
| `api/serializers_products.py` | Output shapes (`product_list_item`, `product_detail`, `variant_repr`, `attribute_repr`, `option_repr`, `template_repr`, `change_repr`, `image_repr`), input rules (`ProductWriteSerializer`, `QuickAddSerializer`), `changed_discount_fields`. |
| `products/services/product_service.py` | List filters and ordering, summary, create / update / delete, stock guard and `StockMovement`, quick add, bulk, formula preview, gallery. |
| `products/services/variant_service.py` | Dictionary CRUD, the 409 guards (decision D5), variant generation and bulk patch. |
| `products/services/product_template_service.py` | Templates, `apply_global`, the central sectors read. (Not `template_service.py`: that name is taken by the WhatsApp message templates.) |
| `products/services/sector_seed_service.py` | `seed_sectors()`: the 35 sectors. Called by `run_provisioning` for every new store before it is marked ready (`tenants/provisioning.py`) and by the existing management command; it does not reset the attributes of an existing sector template. |
| `products/services/change_actor.py` | `acting_as(name)` context variable that tells `Product.save()` who changed a field. Owner → «مالك المتجر»; staff → `full_name`, else «موظف». |
| `products/services/product_api_errors.py` | `ProductApiError(status, body)`; helpers `not_found`, `conflict`, `plural_products`. |
| `products/blueprint.py` | The template JSON rules (46 allowed keys). |

### 1.2 The adapter: `PRODUCTS_LIVE_RULES`

With `SHARWA_LIVE_MODULES=…,products` (or `SHARWA_MOCKS=off`) every Phase A products route goes to Django; anything else keeps the fixture. The BFF does **not** use `liveOrMock` in each route file. All products routes pass through `mockRoute()`, which asks `dispatchLiveProducts(request)` first, and that function consults one table: `PRODUCTS_LIVE_RULES` in `src/lib/bff/live-products.ts`. The 21 rows are mapped **one-to-one** to the Django routes in §3 (20 pass-through rows and one handler). The full row table, the dispatch order and the three independent tables (`b2b`, `advanced_products`, `products`) are in [`../../overview/bff.md#products-rules`](../../overview/bff.md#products-rules); this page gives the BFF path of each row in §3 and does not repeat the regexes.

Two points the adapter table makes that matter for callers:

- **«تطبيق على منتجات» is BFF-orchestrated (decision D7).** There is no Django `apply` route. Row 20 (`/templates/{id}/apply`) is the handler `applyTemplateLive`: it reads the template with `GET product-templates/<id>/`, then sends one `PATCH products/<id>/` per product with exactly the template's `fields` plus `blueprint_id`, one after the other. Details and the result shape are in [§6.7](#variants-apply).
- **Images go one file per request.** The editor uploads sequentially because production Nginx caps a request at 8 MB (`client_max_body_size 8M`); see [§7.2](#images-limits).

### 1.3 Body size, Phase B boundary and tests

- **8 MB bound.** `DATA_UPLOAD_MAX_MEMORY_SIZE = 8 * 1024 * 1024` (`config/settings.py:368`, with the comment that production Nginx `client_max_body_size 8M` must match). It bounds the JSON write bodies of this page — including the base64 images of quick add and variant options. Each decoded base64 image is further limited to 5 MB; each gallery file to 5 MB ([§7.2](#images-limits)). See also [`../../overview/conventions.md#uploads`](../../overview/conventions.md#uploads).
- **Phase B (decision D6).** Not served here: `products/<id>/tier-prices/**` (`b2b`), `products/<id>/{bundle-components,compatibility-rules,personalization-fields,auction,serials}/**`, `products/import/**` and `products/export/` (`advanced_products`). A compatibility rule or a bundle component can still make a Phase A route answer `409` ([§6.3](#variants-409)).
- **Tests.** `api/test_products_api.py` — 30 tests: `ProductApiTests` (12), `ProductImagesApiTests` (3), `VariantApiTests` (4), `TemplateApiTests` (6), `MinimumPayloadTests` (5). With `PRODUCTS_CONTRACT_DUMP=<file>` the tests write the real responses so a frontend script can validate them with the Zod schemas themselves. Run with `python manage.py test api.test_products_api`.

> ⚠️ Discrepancy — the Step 3 project note (`claude/m04-products-step3-django.md`) says "25 tests" / code has 30 (the 5 extra tests are `MinimumPayloadTests`, the editor's minimum payload). Reported in step 07.

## 2. Access — gate chain

Evaluated in this order. The first failing gate answers. The module header of `views_products.py` states the rule: permissions are **keys**, never role names (FR-04.16).

| # | Gate | Requirement | Failure |
|---|---|---|---|
| 1 | Tenant | `HasTenantContext` | tenant guard answer ([`../01-public-onboarding/m47-tenant-guard.md`](../01-public-onboarding/m47-tenant-guard.md)) |
| 2 | Session | `MerchantSessionAuthentication`: an owner session (`is_merchant_authenticated`) **or** a staff member (`resolve_request_staff`) | `401` `{"detail": "انتهت جلستك، سجّل الدخول مجدداً."}` |
| 3 | CSRF | `enforce_csrf` on every write ([`../../overview/csrf.md`](../../overview/csrf.md)) | `403` (CSRF failure) |
| 4 | Permission key (staff only; the owner holds every key) | see the table below | `403` `{"detail": "ليست لديك صلاحية لهذا الإجراء."}` |
| 5 | Discount keys | `discounts.manage`, only when `old_price`, `sale_start_at` or `sale_end_at` **actually changes** | `403` `{"detail": "ليست لديك صلاحية تعديل الخصومات (السعر القديم وفترة التخفيض)."}` |
| 6 | Resource state | product exists; active auction; dependencies | `404` / `400` / `409` (per route) |

| Operation | Key |
|---|---|
| `GET products/`, `GET products/<id>/`, `GET products/<id>/changes/` | `inventory.view` |
| `POST products/`, `PATCH`/`DELETE products/<id>/`, `quick/`, `bulk/`, gallery routes, `variants/*`, writes on `variant-attributes/**` and `product-templates/**` | `catalog.manage` |
| `POST products/<id>/stock/` | `inventory.adjust` |
| `GET variant-attributes/`, `GET product-templates/`, `GET product-templates/<id>/`, `GET global-variant-templates/`, `POST products/formula-preview/` | any session (no key) |

`PATCH products/<id>/` with `stock` in the body is checked against `catalog.manage` only; the separate `inventory.adjust` key guards the list's in-place stock route. Plan feature: none on these routes (the module is core). Keys and their seeding are in [`../../overview/permissions.md`](../../overview/permissions.md#2-the-keys) (§2.3).

## 3. Endpoint summary — all Phase A routes

Every row below was checked against `api/urls.py` (lines 268–307) and against `PRODUCTS_LIVE_RULES`. **BFF** paths are under `/api/bff/products` (the base is `/api/bff/products`); **Django** paths are under `/api/v1/`.

| # | Method | Django path | BFF path | Purpose | Key | Section |
|---|---|---|---|---|---|---|
| 1 | `GET` | `products/` | `` | list + filters + summary | `inventory.view` | [§4](#list) |
| 2 | `POST` | `products/` | `` | create (full editor) | `catalog.manage` | [§5](#editor) |
| 3 | `POST` | `products/quick/` | `/quick` | quick add | `catalog.manage` | [§5](#editor) |
| 4 | `POST` | `products/bulk/` | `/bulk` | bulk action | `catalog.manage` | [§4.2](#bulk) |
| 5 | `POST` | `products/formula-preview/` | `/formula-preview` | formula price preview | any session | [§7.4](#formula-preview) |
| 6 | `GET` | `products/<id>/` | `/{id}` | full detail | `inventory.view` | [§5](#editor) |
| 7 | `PATCH` | `products/<id>/` | `/{id}` | partial update (also template apply, D7) | `catalog.manage` | [§5](#editor) |
| 8 | `DELETE` | `products/<id>/` | `/{id}` | delete, or archive if it has orders | `catalog.manage` | [§5](#editor) |
| 9 | `GET` | `products/<id>/changes/` | `/{id}/changes` | change log (20 per page) | `inventory.view` | [§5](#editor) |
| 10 | `POST` | `products/<id>/stock/` | `/{id}/stock` | list stock edit | `inventory.adjust` | [§7.3](#stock-route) |
| 11 | `POST` | `products/<id>/images/` | `/{id}/images` | upload (multipart `images`) | `catalog.manage` | [§7.1](#gallery) |
| 12 | `POST` | `products/<id>/images/reorder/` | `/{id}/images/reorder` | reorder | `catalog.manage` | [§7.1](#gallery) |
| 13 | `DELETE` | `products/<id>/images/<image_id>/` | `/{id}/images/{imageId}` | delete one image | `catalog.manage` | [§7.1](#gallery) |
| 14 | `POST` | `products/<id>/variants/generate/` | `/{id}/variants/generate` | generate the matrix | `catalog.manage` | [§6.1](#variants-generate) |
| 15 | `POST` | `products/<id>/variants/bulk/` | `/{id}/variants/bulk` | edit many variants | `catalog.manage` | [§6.2](#variants-bulk) |
| 16 | `GET` | `variant-attributes/` | `/variant-attributes` | dictionary | any session | [§6.4](#dictionary) |
| 17 | `POST` | `variant-attributes/` | `/variant-attributes` | create attribute | `catalog.manage` | [§6.4](#dictionary) |
| 18 | `PATCH` | `variant-attributes/<id>/` | `/variant-attributes/{id}` | edit attribute | `catalog.manage` | [§6.4](#dictionary) |
| 19 | `DELETE` | `variant-attributes/<id>/` | `/variant-attributes/{id}` | delete attribute (`409` if used) | `catalog.manage` | [§6.4](#dictionary) |
| 20 | `POST` | `variant-attributes/<id>/options/` | `/variant-attributes/{id}/options` | add option | `catalog.manage` | [§6.4](#dictionary) |
| 21 | `PATCH` | `variant-attributes/options/<id>/` | `/variant-attributes/options/{id}` | edit option | `catalog.manage` | [§6.4](#dictionary) |
| 22 | `DELETE` | `variant-attributes/options/<id>/` | `/variant-attributes/options/{id}` | delete option (`409` if used) | `catalog.manage` | [§6.4](#dictionary) |
| 23 | `GET` | `product-templates/` | `/templates` | templates | any session | [§6.5](#templates) |
| 24 | `POST` | `product-templates/` | `/templates` | create template | `catalog.manage` | [§6.5](#templates) |
| 25 | `GET` | `product-templates/<id>/` | `/templates/{id}` | one template (read by «تطبيق على منتجات») | any session | [§6.5](#templates) |
| 26 | `PATCH` | `product-templates/<id>/` | `/templates/{id}` | edit template | `catalog.manage` | [§6.5](#templates) |
| 27 | `DELETE` | `product-templates/<id>/` | `/templates/{id}` | delete template | `catalog.manage` | [§6.5](#templates) |
| 28 | `POST` | `product-templates/<id>/apply-global/` | `/templates/{id}/apply-global` | link a template to a sector | `catalog.manage` | [§6.6](#sectors) |
| 29 | — | *(no Django route)* | `/templates/{id}/apply` (handler `applyTemplateLive`) | «تطبيق على منتجات» (D7) | `catalog.manage` (through each `PATCH`) | [§6.7](#variants-apply) |
| 30 | `GET` | `global-variant-templates/` | `/global-templates` | the 35 central sectors | any session | [§6.6](#sectors) |

The Step 3 project note (`claude/m04-products-step3-django.md`) says that every path the BFF table forwards now exists but does not list the routes, so the table above is taken from `api/urls.py` and `PRODUCTS_LIVE_RULES` themselves.

> ⚠️ Discrepancy — roadmap (DOC-060 "Done when") says the route list is "copied from the Step 3 doc" / the Step 3 doc contains no route list (only files, migrations and behaviour); the list in this section was built from the code. Reported in step 07.

There is **no** `GET products/<id>/images/` and **no** `GET products/<id>/variants/`: the gallery and the variants come inside the product detail (`images[]`, `variants[]`).

<a id="list"></a>
## 4. Product list and bulk actions

### 4.1 `GET /api/v1/products/`

**Query parameters** (the browser keeps the same names in its URL — `use-product-filters.ts` — so the list request is a straight copy)

| Name | Type | Default | Notes |
|---|---|---|---|
| `q` | string | — | Case-insensitive `contains` on `name`, `name_en`, `sku`, `barcode` (trimmed). |
| `status` | `published` \| `draft` \| `scheduled` \| `archived` | — | Derived state ([Rules](#list-rules)). Any other value is ignored. |
| `stock` | `in_stock` \| `low` \| `out` | — | `out`: `stock ≤ 0`. `low`: `0 < stock ≤ low_stock_threshold`. `in_stock`: `stock > 0` and not low. |
| `category` | integer | — | The category **and all its descendants**. |
| `brand` | integer | — | |
| `tag` | integer | — | |
| `collection` | integer | — | |
| `product_type` | `physical` \| `digital` \| `service` | — | |
| `flags` | comma list of `variants`, `bundle`, `auction`, `bookable` | — | Each flag narrows further (AND). Unknown flags are ignored. |
| `ordering` | `name`, `price`, `stock`, `updated_at`, `sku`, optionally prefixed by `-` | `-updated_at` | Nulls last; ties broken by `-id`. An unknown column falls back to `-updated_at`. |
| `page` | integer ≥ 1 | `1` | Invalid → `1`. |
| `page_size` | integer | `50` | Clamped to `1…100`. |

Integer filters that are not positive integers are ignored. The result is `distinct()`, so a product with several tags is listed once.

**Request examples**

```text
GET /api/v1/products/?ordering=-updated_at&page_size=10
GET /api/v1/products/?q=عباية&status=published&stock=low&category=3&flags=variants,bundle&ordering=price&page=2
```

**Response `200`** (values as asserted in `ProductApiTests.test_create_full_editor_payload_and_detail_contract` and `test_list_filters_status_and_stock`; the product is a fixture)

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 41,
      "name": "عباية سوداء",
      "sku": "SHW-DEMO01",
      "image": null,
      "display_price": "120 ر.س",
      "display_old_price": null,
      "stock": "7.000",
      "unit": "piece",
      "is_low_stock": false,
      "category": { "id": 3, "name": "أزياء" },
      "status": "published",
      "has_variants": false,
      "updated_at": "2026-10-27T09:14:02.511234+03:00",
      "is_serialized": false,
      "is_auction_active": false,
      "price": "120.00"
    }
  ],
  "summary": { "published": 1, "draft": 0, "scheduled": 0, "archived": 0, "low_stock": 0, "out_of_stock": 0 }
}
```

| Field | Type | Meaning |
|---|---|---|
| `count`, `next`, `previous` | number, string \| null | Paging. `next` / `previous` are **relative query fragments** — `?page=3`, `?page=1` — not URLs (see [`../../overview/pagination.md`](../../overview/pagination.md)). |
| `results[].display_price` | string | `format_money(effective price, product currency)`. For a formula product the effective price is the formula result. |
| `results[].display_old_price` | string \| null | Only while the sale is **active**; otherwise `null`. |
| `results[].stock` | string | `Decimal(12,3)` as text. A negative stock (backorder) is shown as `"0.000"` because the contract accepts only non-negative decimals. |
| `results[].is_low_stock` | boolean | `0 < stock ≤ low_stock_threshold`. |
| `results[].image` | string \| null | First gallery image, else the legacy `Product.image`, absolute URL. |
| `results[].has_variants` | boolean | From the annotated variant count. |
| `results[].is_auction_active` | boolean | The product has an auction with status `active`. |
| `results[].price` | string | Raw `"120.00"` for the in-place edit cell. |
| `summary` | object | Counts over **all** products, not the filtered list. The four status counts use the same derivation as the filter; `low_stock` and `out_of_stock` exclude archived products. `low_stock` is `product_service.low_stock_count()`, the number the dashboard overview shows as «low stock» ([`../02-dashboard-shell/m03-overview.md`](../02-dashboard-shell/m03-overview.md)), so the two never differ. |

<a id="list-rules"></a>
**Rules**

- **Derived status** (`status_of`): `archived_at` set → `archived`; else `is_available = false` → `draft`; else `published_at` in the future → `scheduled`; else `published`.
- Gate: `inventory.view`; no write permission is needed to read.
- Pure read; no side effects.

**Errors**

| Status | Body | When |
|---|---|---|
| `401` | `{"detail": "انتهت جلستك، سجّل الدخول مجدداً."}` | no session |
| `403` | `{"detail": "ليست لديك صلاحية لهذا الإجراء."}` | staff without `inventory.view` |

**Mapping** — BFF `GET /api/bff/products`: row 1 of `PRODUCTS_LIVE_RULES`. In mock mode `listProducts(store, searchParams)` answers from `src/mocks/catalog/products.ts` with the same filter names, and the Next gate checks `inventory.view`.

<a id="bulk"></a>
### 4.2 `POST /api/v1/products/bulk/`

**Request body** (`application/json`)

| Field | Type | Required | Rules |
|---|---|---|---|
| `ids` | integer[] | yes | Positive integers, duplicates dropped. Empty → `400`. |
| `action` | string | yes | One of `publish`, `archive`, `unarchive`, `delete`, `set_category`, `add_tag`, `remove_tag`. |
| `payload` | object | for `set_category` (`category_id`), `add_tag` / `remove_tag` (`tag_id`) | Ignored by the other actions. |

**Response `200`** — always `200` once the request is valid, even if every product failed. Each product runs in **its own transaction**; the actor of the change log is the caller.

```json
{
  "succeeded": [12],
  "failed": [
    { "id": 13, "reason": "مؤرشف — ألغِ الأرشفة أولاً" },
    { "id": 999999, "reason": "غير موجود" }
  ]
}
```

(Example from `test_bulk_actions_report_reasons`: `publish` over a draft, an archived product and an unknown id.)

| `action` | Effect | Per-product refusal (`reason`) |
|---|---|---|
| `publish` | `is_available = true`, `published_at = null` | «مؤرشف — ألغِ الأرشفة أولاً» when archived |
| `archive` | `archived_at = now` | «مزاد نشط» when the auction is active |
| `unarchive` | `archived_at = null` | — |
| `delete` | deletes | «مزاد نشط»; if the product has orders it is **archived instead** and reported as «له طلبات — أُرشف بدل الحذف» (in `failed`) |
| `set_category` | `category_id = payload.category_id` | — |
| `add_tag` | adds the tag, touches `updated_at` | «لم يُحدَّد وسم» when `payload.tag_id` is missing |
| `remove_tag` | removes the tag, touches `updated_at` | — |
| *(any)* | | «غير موجود» when the id does not exist |

**Examples of every action** (each runs per product; fixture ids)

```json
// publish — as above
{ "ids": [12, 13, 999999], "action": "publish" }

// archive — «مزاد نشط» is reported in `failed` for a product in an active auction
{ "ids": [12, 14], "action": "archive" }
// 200 → { "succeeded": [12], "failed": [ { "id": 14, "reason": "مزاد نشط" } ] }

// unarchive
{ "ids": [13], "action": "unarchive" }
// 200 → { "succeeded": [13], "failed": [] }

// delete — a product with orders is archived instead and reported in `failed`
{ "ids": [15, 16], "action": "delete" }
// 200 → { "succeeded": [15], "failed": [ { "id": 16, "reason": "له طلبات — أُرشف بدل الحذف" } ] }

// set_category
{ "ids": [12, 13], "action": "set_category", "payload": { "category_id": 3 } }
// 200 → { "succeeded": [12, 13], "failed": [] }

// add_tag / remove_tag
{ "ids": [12], "action": "add_tag", "payload": { "tag_id": 5 } }
// 200 → { "succeeded": [12], "failed": [] }
{ "ids": [12], "action": "remove_tag", "payload": { "tag_id": 5 } }
// 200 → { "succeeded": [12], "failed": [] }

// unknown action
{ "ids": [12], "action": "explode" }
// 400 → { "action": ["إجراء غير معروف."] }
```

**Errors**

| Status | Body | When |
|---|---|---|
| `400` | `{"ids": ["اختر منتجاً واحداً على الأقل."]}` | no valid id |
| `400` | `{"action": ["إجراء غير معروف."]}` | unknown action |
| `400` | `{"payload": ["التصنيف غير موجود."]}` | `set_category` with a `category_id` that does not exist |
| `400` | `{"payload": ["الوسم غير موجود."]}` | `add_tag` / `remove_tag` with a `tag_id` that does not exist |
| `403` | `{"detail": "ليست لديك صلاحية لهذا الإجراء."}` | staff without `catalog.manage` |

**Rules**

- `set_category` with a missing or non-positive `category_id` is **not** an error: the value becomes `None` and every selected product loses its category. The editor always sends a category id; other clients should do the same.
- `remove_tag` without a `tag_id` succeeds without removing anything.
- An active auction blocks `archive` and `delete` but **not** `publish`, `unarchive`, `set_category` or the tag actions.

**Mapping** — BFF row 3 (`/bulk`). The result shape is `bulkResultSchema`.

> ⚠️ Discrepancy — roadmap (DOC-061) says "gates (`catalog.manage` for writes, reads per session)" / code gates reads with `inventory.view` (`views_products.py`, `INVENTORY_VIEW`), not "per session"; only the dictionary, templates, sectors and formula preview are readable by any session. Reported in step 07.

<a id="editor"></a>
## 5. Product create, update and delete (the editor)

### 5.1 Payload and mandatory fields

`ProductWriteSerializer` is the body of `POST products/` and `PATCH products/<id>/` (`formToPayload` in the frontend). The editor sends all the keys it knows; any other client may send only what it needs.

| Group | Fields (type · limit) |
|---|---|
| Identity | `name` (≤ 200, **required**) · `name_en` (≤ 200) · `slug` (≤ 255, optional, normalised) · `sku` (≤ 64) · `barcode` (≤ 64) · `product_type` (`physical` \| `digital` \| `service`) |
| Taxonomy | `category_id` · `brand_id` · `blueprint_id` (all must exist) · `tag_ids[]` · `badge_ids[]` · `collection_ids[]` (all must exist) |
| Price | `price` (`Decimal(10,2)`, **required** unless a formula computes it) · `old_price` · `sale_start_at` · `sale_end_at` · `cost_price` · `currency` (`SAR`, `USD`, `YER_OLD`, `YER_NEW`) · `payment_policy` (`cod` \| `deposit` \| `full`) · `deposit_required` · `is_taxable` · `tax_rate` (`Decimal(5,2)`) |
| Formula pricing | `pricing_type` (`fixed` \| `formula`) · `live_rate_ref` (≤ 50) · `formula_unit_price` (`Decimal(12,4)`) · `formula_coefficient` (`Decimal(8,4)`) · `formula_fixed_extra` (`Decimal(10,2)`) |
| Refundable deposit | `has_refundable_deposit` · `refundable_deposit_amount` · `refundable_deposit_refund_rule` · `refundable_deposit_return_event` (≤ 255) |
| Flags | `is_serialized` · `is_bundle` · `bundle_build_fee` · `is_auction` · `is_personalizable` · `is_bookable` · `booking_duration_minutes` |
| Stock | `stock` (`Decimal(12,3)`) · `unit` (14 values, e.g. `piece`, `kilogram`) · `low_stock_threshold` · `allow_backorder` · `min_quantity` · `max_quantity` (`Decimal(12,3)`) · `allow_variable_quantity` |
| Content | `description` · `description_en` · `image_url` (≤ 500, `http(s)://`) · `video_url` (≤ 500, `http(s)://`) · `variant_display_style` · `product_template` (`standard` \| `landing_page`) · `is_available` · `published_at` · `is_featured` |
| Shipping | `is_free_shipping` · `delivery_duration` (≤ 100) · `weight` (`Decimal(8,3)`) · `length` · `width` · `height` (`Decimal(8,2)`) · `is_hazardous` · `hazard_class` (`none` \| `flammable` \| `liquid` \| `fragile`) |
| SEO | `meta_title` (≤ 70) · `meta_description` (≤ 160) · `meta_keywords` (≤ 255) |

**Mandatory versus optional**

| | Server (Django) | Editor form (Zod, `productFormSchema`) |
|---|---|---|
| `name` | required: «أدخل اسم المنتج.» | required: «أدخل اسم المنتج.» |
| `price` | required: «أدخل سعر المنتج.» — **unless** `pricing_type = formula` with a unit price: the server then computes it | required (same exception) |
| category | **optional** | required: «اختر تصنيف المنتج (أو أنشئ تصنيفاً بزر +).» |
| `unit` | optional (default `piece`) | required |
| everything else | optional; a missing key uses the model default | optional, may be empty (the Save button is never disabled; invalid fields are highlighted) |

> ⚠️ Discrepancy — roadmap (DOC-062) says the mandatory fields are "title, base price, category/template, unit" / the editor form requires `name`, `price`, `category_id`, `unit` (`PRODUCT_REQUIRED_FIELDS` in `schemas/product.ts:219`; there is no "template" requirement), but Django requires only `name` and `price`. The category comment in `serializers_products.py` says it is required "in the editor only"; quick add, template apply and other clients stay unconstrained. Reported in step 07.

Sparse defaults: a body `{"name": "منتج", "price": "10"}` creates a product with `stock = 0`, `unit = piece`, `currency = SAR`, `is_available = true` (`test_sparse_api_body_uses_model_defaults`).

**Images in the editor.** The create/update body carries no image bytes: `image_url` is only a link (≤ 500 characters, `http(s)://`). Pictures go to the gallery with multipart uploads, one file per request, 5 MB each ([§7.1](#gallery)); base64 images exist only in quick add and in dictionary option images, 5 MB decoded, inside a JSON body bounded by 8 MB ([§7.2](#images-limits)).

> ⚠️ Discrepancy — roadmap (DOC-062) says "Image payloads base64 bounded by 8 MB" / code: the editor's images are multipart files (5 MB each, `views_products.py:57-60`), base64 is limited to 5 MB decoded (`serializers_catalog.py:44-49`) and 8 MB is the request-body bound (Nginx `client_max_body_size 8M`, `config/settings.py:368`). Reported in step 07.

**Cross-field rules** run on the merged state (current values + body), but **only when one of their fields is in the body**, so an in-place price `PATCH` is never blocked by an unrelated legacy field.

| Field | Message |
|---|---|
| `old_price` | «السعر القديم يجب أن يكون أكبر من السعر الحالي.» |
| `deposit_required` (policy `deposit`) | «أدخل قيمة العربون المطلوب.» |
| `tax_rate` (taxable) | «أدخل نسبة الضريبة.» |
| `formula_unit_price` / `formula_coefficient` (pricing `formula`) | «أدخل سعر الوحدة.» / «أدخل المعامل.» |
| `refundable_deposit_amount` | «أدخل مبلغ العربون القابل للاسترجاع.» |
| `booking_duration_minutes` (bookable) | «أدخل مدة الحجز بالدقائق.» |
| `hazard_class` (physical + hazardous) | «اختر فئة الخطورة.» |
| `min_quantity` / `max_quantity` (decision D3: fractional needs `allow_variable_quantity`) | «الكمية الكسرية تتطلب تفعيل «كمية متغيرة».» |
| `max_quantity` | «الحد الأعلى أقل من الحد الأدنى.» |
| `sale_end_at` | «نهاية التخفيض قبل بدايته.» |

Field-level messages: «الاسم 200 حرف على الأكثر.» · «حتى {n} حرف.» · «أدخل السعر كرقم (مثال: 120.00).» · «أدخل رقماً صحيحاً.» · «القيمة لا تكون سالبة.» · «رقم حتى {n} خانات صحيحة.» · «حتى {n} خانات عشرية.» · «المخزون رقم حتى 3 خانات عشرية.» · «أدخل كمية (حتى 3 خانات عشرية، مثال: 1.5).» · «اختر قيمة صحيحة.» · «تاريخ ووقت غير صالحين.» · «أرسل قائمة معرّفات.» · «رابط يبدأ بـ http:// أو https://» · «التصنيف غير موجود.» · «الماركة غير موجودة.» · «القالب غير موجود.» · «وسم غير موجود.» · «شارة غير موجودة.» · «تشكيلة غير موجودة.» · «SKU مستخدم لمنتج آخر.». Errors come back as `{field: [message, …]}` with every missing mandatory field in one response.

### 5.2 `POST /api/v1/products/` (create)

**Response `201`** — the full detail ([§5.4](#detail)). Example: the sparse body above, or the editor's body from `test_create_full_editor_payload_and_detail_contract`:

```json
// POST /api/v1/products/   (trimmed: the editor sends every key of the table above, see `payload()` in the tests)
{
  "name": "عباية سوداء", "name_en": "Black abaya", "slug": "black-abaya", "sku": "",
  "product_type": "physical", "category_id": 3, "tag_ids": [5],
  "price": "120.00", "old_price": null, "cost_price": "80.00", "currency": "SAR",
  "payment_policy": "cod", "pricing_type": "fixed",
  "stock": "7", "unit": "piece", "min_quantity": null, "max_quantity": null,
  "is_available": true, "weight": "0.400"
}
```

```json
// 201 (excerpt — the full body is `productDetailSchema`; the SKU is generated, `SHW-…`, the id is a fixture)
{
  "id": 41, "name": "عباية سوداء", "slug": "black-abaya", "sku": "SHW-DEMO01",
  "category_id": 3, "tag_ids": [5], "blueprint_id": null,
  "price": "120.00", "old_price": null, "currency": "SAR",
  "deposit_required": null, "min_quantity": "1", "max_quantity": null,
  "stock": "7.000", "unit": "piece", "status": "published",
  "display_price": "120 ر.س", "profit_margin_percent": "33.3",
  "images": [], "variants": [], "has_variants": false, "has_orders": false,
  "live_rate_refs": [], "updated_at": "2026-10-27T09:14:02.511234+03:00"
}
```

**Rules**

- **Identity.** An empty `slug` is generated from the name; any loose text is turned into a valid slug (`"My Product!! 2026"` → `"my-product-2026"`, Arabic is kept) and made unique with `-2`, `-3`…. An empty `sku` keeps the generated one (`SHW-…`); a duplicate SKU → `400` `{"sku": ["SKU مستخدم لمنتج آخر."]}`.
- **Template** (`blueprint_id`, decision D1): the template's keys are copied first (`apply_to`, present keys only), then what the merchant sent wins, then template tags / badges / collections / quantity prices / related products are copied for whatever the body did not send. Everything runs in one transaction.
- **Normalisation** (`_normalize`, after every write): empty `deposit_required` / `refundable_deposit_amount` / `bundle_build_fee` / `formula_fixed_extra` → `0.00`; `min_quantity` empty → `1.000`; non-physical → `is_free_shipping = false`; payment policy not `deposit` → deposit `0`; not hazardous → `hazard_class = none`; not taxable → `tax_rate = null`; pricing not `formula` → formula fields cleared and `live_rate_ref = ""`; no refundable deposit → amount `0`; not a bundle → build fee `0`; **auction → `stock = 1` and `allow_backorder = false`**.
- **Output nulls.** Features that are off return `null` (`deposit_required`, `refundable_deposit_amount`, `bundle_build_fee`, `formula_fixed_extra`), nullable text is `""`, quantities have no trailing zeros (`"0.5"`, `"1"`), `live_rate_refs` is always `[]` (decision D4).
- **Discounts.** `old_price` or the sale window in the body → `discounts.manage` is required, otherwise `403` with the message of gate 5.
- **Side effects.** A `ProductChangeLog` row per changed field with `actor`; a `StockMovement(manual_adjust)` only on update when stock changes ([§7.3](#stock-route)).

### 5.3 `PATCH /api/v1/products/<id>/` (partial update)

Only the keys sent are touched. Three callers use it: the full editor, the in-place **price** cell of the list (`{"price": "90.00"}`), and the template apply of decision D7 (`{…template.fields, "blueprint_id": <id>}`; other fields stay as they were — `test_blueprint_copies_only_its_keys_and_d7_patch`).

```json
// PATCH /api/v1/products/41/
{ "price": "90.00" }
// 200 → the full detail with "price": "90.00"; one ProductChangeLog row (field "price", actor «مالك المتجر»)
```

```json
// PATCH /api/v1/products/41/   (staff holding catalog.manage but not discounts.manage)
{ "old_price": "150.00" }
// 403 → {"detail": "ليست لديك صلاحية تعديل الخصومات (السعر القديم وفترة التخفيض)."}
```

**Errors (besides the field errors of §5.1)**

| Status | Body | When |
|---|---|---|
| `404` | `{"detail": "المنتج غير موجود."}` | unknown id |
| `400` | `{"price": ["لا يمكن تعديل السعر أثناء مزاد نشط."]}` | active auction and `price` changes |
| `400` | `{"detail": "لا يمكن تطبيق قالب على منتج في مزاد نشط."}` | active auction and `blueprint_id` changes |
| `400` | `{"stock": ["<reason>"]}` | stock changes and the stock guard refuses ([§7.3](#stock-route)) |
| `400` | `{"sku": ["SKU مستخدم لمنتج آخر."]}` | duplicate SKU |

**The `stock` rule (live-QA fix, INT-005).** A saved product must send `stock` **only when the merchant changed it**. Django shows a backordered (negative) stock as `0`, so echoing the loaded value reset the backorder to `0` on every unrelated save, and was refused outright for products whose stock lives on variants, serial numbers or locations. Fix in `src/features/products/components/editor/product-editor.tsx` (lines 386–390): `if (product && Number(payload.stock ?? 0) === Number(initial.stock || 0)) delete payload.stock;`, and `payload.stock = "0"` when the variant builder is active — a **new** product only (`builderActive`), because its stock will live on the variants. On the server the same idea holds: a `stock` equal to the stored value never reaches the guard (`test_stock_endpoint_records_movement_and_refuses_managed_stock`: the same value is accepted for a serialized product, a different one is `400`).

### 5.4 `GET /api/v1/products/<id>/` (detail) <a id="detail"></a>

The response is `productDetailSchema`: every editor field plus read-only derived fields. The derived ones: `status`, `display_price`, `display_old_price`, `display_price_with_tax`, `profit_margin_percent`, `is_on_sale`, `sale_state` (`none` / `scheduled` / `active` / `ended`), `active_badges[]` (manual badges plus «نفدت الكمية» at stock 0, «تخفيض» during an active sale, «وصل حديثاً» for 7 days), `has_variants`, `variants_stock_total`, `serial_available`, `auction_status`, `has_orders`, `variant_attribute_ids`, `variants[]`, `images[]`, `views_count`, `add_to_cart_count`, `created_at`, `updated_at`. `404` `{"detail": "المنتج غير موجود."}` for an unknown id.

### 5.5 Quick add — `POST /api/v1/products/quick/`

Only the fields of the quick-add dialog (`quickAddSchema`).

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | yes | «أدخل اسم المنتج.»; ≤ 200 «الاسم 200 حرف على الأكثر.» |
| `price` | decimal text | yes | «أدخل السعر كرقم (مثال: 120.00).» |
| `image` | data URL \| null | no | **base64**, decoded ≤ 5 MB ([§7.2](#images-limits)); goes to the gallery as image 0 |
| `stock` | decimal text | no | empty → `0` |
| `unit`, `blueprint_id`, `pricing_type`, `formula_*`, `is_serialized`, `is_bundle`, `is_auction`, `is_personalizable`, `name_en` | | no | formula pricing needs «أدخل سعر الوحدة.» and «أدخل المعامل.» |

**Response `201`** — `{"id": 57, "applied_template": {"name": "توابل", "fields_count": 5}}` (`applied_template` is `null` without a template).

**Rules** — the template is applied first, then the dialog's values; the dialog's unit, pricing type and flags win over the template **only when they differ from the dialog defaults** (`piece`, `fixed`, `false`) — the same rule as the legacy Django screen — so a template's «كيلوغرام» is not wiped by the dialog's default «قطعة». Name, price and stock always come from the dialog. The product is **published immediately** (`is_available = true`). An unknown `blueprint_id` → `400` `{"blueprint_id": ["القالب غير موجود."]}`.

### 5.6 `DELETE /api/v1/products/<id>/`

| Case | Response |
|---|---|
| Product without orders | `200` `{"archived": false}` — deleted |
| Product with orders | `200` `{"archived": true}` — **archived**, not deleted so the order history keeps its product (service rule, M04 §8). The legacy HTML `delete_product` view does the same. |
| Product in an active auction | `409` `{"detail": "لا يمكن حذف منتج في مزاد نشط."}` |
| Unknown id | `404` `{"detail": "المنتج غير موجود."}` |

### 5.7 `GET /api/v1/products/<id>/changes/`

Query: `page` (20 rows per page, newest first). Gate `inventory.view`.

```json
{
  "count": 1, "next": null, "previous": null,
  "results": [
    { "id": 9, "field": "price", "field_label": "السعر الحالي", "before": "100.00", "after": "90.00", "actor": "مالك المتجر", "at": "2026-10-27T09:20:11.002+03:00" }
  ]
}
```

`field_label` is the model field's `verbose_name`; `actor` is «مالك المتجر», the staff member's `full_name`, or «—» for older rows and automatic changes (migration `0212`). Unknown product → `404` «المنتج غير موجود.».

<a id="variants"></a>
## 6. Variants, attribute dictionary, templates and sectors

Three groups share one rule: **a variant, an attribute or an option that real data depends on is never removed silently** (decision D5). Django answers `409` with an Arabic sentence the UI shows as it is ([§6.3](#variants-409)).

There is no `GET` route for variants. They come inside the product detail as `variants[]` (and `variant_attribute_ids`, the attributes the variants use, in dictionary order; for a product without variants, the attributes of its template).

**Variant object** (`variant_repr`, `productVariantSchema`)

| Field | Type | Meaning |
|---|---|---|
| `id` | number | |
| `option_ids` | number[] | The option of each attribute, in dictionary order (`sort_order`, name, id). |
| `label` | string | The option values joined by ` / `, e.g. «S / أحمر». |
| `sku` | string | `""` when empty. |
| `extra_price` | string | `"5.00"` — added to the product price. |
| `stock` | string | `"4.000"`. |
| `image` | string \| null | Absolute URL. |
| `display_effective_price` | string | `format_money(product price + extra_price)`, e.g. «105 ر.س». |

<a id="variants-generate"></a>
### 6.1 `POST /api/v1/products/<id>/variants/generate/`

Builds the combination matrix. Key `catalog.manage`.

| Field | Type | Required | Rules |
|---|---|---|---|
| `attribute_ids` | integer[] | yes | Attributes of the matrix. Unknown ids are ignored. **An empty list (or only unknown ids) removes every variant** (with the same guard as below). |
| `option_ids` | integer[] | no | The values that take part. Absent → all the values of each attribute. Each attribute needs at least one participating value. |
| `exclude` | integer[][] | no | Combinations to leave out, each one a list of option ids (the order inside does not matter). |

**Response `200`** — the whole variant list of the product, ordered by `id`.

**Rules**

- The matrix is the Cartesian product of the participating values, one group per attribute in dictionary order.
- **A combination that already exists stays untouched** — same `id`, stock, SKU, extra price and image. Only the new ones are created: `stock = 0.000`, `extra_price = 0.00`, SKU `<product sku>-<n>` (`P<product id>-<n>` when the product has no SKU), where `<n>` is the first number that makes the SKU unused among **all** variant SKUs of the store. The frontend mock builds the same pattern, `${p.sku}-${n}` (`src/mocks/catalog/products.ts`).
- Combinations that dropped out of the matrix are deleted **after** the guard of [§6.3](#variants-409) accepts. A variant with no options (legacy data) counts as dropped.
- `Product.stock` is recomputed as the **sum of the variant stocks** (the mirror); `updated_at` is touched. Everything is one transaction on a locked product row.

**Errors**

| Status | Body | When |
|---|---|---|
| `404` | `{"detail": "المنتج غير موجود."}` | unknown product |
| `400` | `{"detail": "اختر قيمة واحدة على الأقل لكل سمة."}` | an attribute has no participating value (`test_generate_requires_a_value_per_attribute`) |
| `409` | see [§6.3](#variants-409) | a variant to remove is tied to reservations, serials, location stock or an open order |

**Example** (`VariantApiTests`: size S/M and colour red/blue, the combination M + blue excluded; ids are fixtures)

```json
// POST /api/v1/products/31/variants/generate/
{ "attribute_ids": [8, 7], "option_ids": [71, 72, 81, 82], "exclude": [[72, 82]] }
```

```json
// 200 — 3 variants; the labels follow the dictionary order (size sort_order 0, colour 1)
[
  { "id": 101, "option_ids": [71, 81], "label": "S / أحمر",  "sku": "SHW-DEMO01-1", "extra_price": "0.00", "stock": "0.000", "image": null, "display_effective_price": "100 ر.س" },
  { "id": 102, "option_ids": [71, 82], "label": "S / أزرق",  "sku": "SHW-DEMO01-2", "extra_price": "0.00", "stock": "0.000", "image": null, "display_effective_price": "100 ر.س" },
  { "id": 103, "option_ids": [72, 81], "label": "M / أحمر",  "sku": "SHW-DEMO01-3", "extra_price": "0.00", "stock": "0.000", "image": null, "display_effective_price": "100 ر.س" }
]
```

Regenerating with only `S` and `red` keeps variant 101 (and its stock and extra price) and removes the other two:

```json
// POST /api/v1/products/31/variants/generate/
{ "attribute_ids": [7, 8], "option_ids": [71, 81], "exclude": [] }
// 200 → [{ "id": 101, "label": "S / أحمر", "stock": "4.000", "extra_price": "5.00", … }]
```

<a id="variants-bulk"></a>
### 6.2 `POST /api/v1/products/<id>/variants/bulk/`

Edits SKU, extra price and stock of many variants at once. Key `catalog.manage`. **All or nothing**: any error rejects the whole request and nothing is saved.

```json
// POST /api/v1/products/31/variants/bulk/
{ "variants": [ { "id": 101, "stock": "4", "extra_price": "5.00" } ] }
// 200 → the whole variant list; Product.stock is now 4.000 (the sum of the variants)
```

| Row field | Rule | Message |
|---|---|---|
| `id` | A variant of this product. Rows with an unknown, foreign or non-numeric `id` are skipped silently, and so are rows that are not objects. | — |
| `extra_price` | `^\d+(\.\d{1,2})?$`, at most 8 integer digits. `null`/absent = unchanged. | «رقم غير صالح.» |
| `stock` | `^\d+(\.\d{1,3})?$`, at most 9 integer digits. | «رقم غير صالح.» |
| `sku` | At most 100 characters; empty text clears it (stored as null). Unique among all variants of the store, and unique inside the request. | «SKU حتى 100 حرف.» · «SKU مستخدم لمتغير آخر.» |
| `stock` (location-managed) | A variant that has a `LocationInventory` row refuses a stock value different from the current one. | «مخزون هذا المتغيّر يُدار حسب المواقع — عدّله من شاشة المخزون.» |

Errors come back as `400` with keys **`variants.<variant id>.<field>`**:

```json
// POST /api/v1/products/31/variants/bulk/   (the SKU already belongs to variant 101)
{ "variants": [ { "id": 102, "sku": "SHW-DEMO01-1" } ] }
// 400
{ "variants.102.sku": ["SKU مستخدم لمتغير آخر."] }
```

A changed stock writes `StockMovement(manual_adjust)` for the variant (note «تعديل مخزون متغيّر من محرر المنتج») and then recomputes the `Product.stock` mirror. Non-array `variants` → `400` `{"variants": ["أرسل قائمة المتغيرات."]}`. Unknown product → `404` «المنتج غير موجود.».

<a id="variants-409"></a>
### 6.3 The `409` conflicts (decision D5)

Every `409` of this module has the shape `{"detail": "<Arabic sentence>", …extra}`. The legacy HTML delete screens call the same guards (`test_html_delete_uses_the_same_guard`).

| Operation | Message (`detail`) | Extra keys |
|---|---|---|
| `DELETE variant-attributes/<id>/` — the attribute is used by variants | «لا يمكن حذف السمة: مستخدمة في متغيرات {n} {منتج \| منتجات}.» (`منتج` when `n = 1`) | `products_count` |
| `DELETE variant-attributes/<id>/` — a bundle compatibility rule points at it (Phase B data) | «لا يمكن حذف السمة: مستخدمة في {n} من قواعد توافق الحزم.» | `rules_count` |
| `DELETE variant-attributes/options/<id>/` — the option is used by variants | «القيمة مستخدمة في متغيرات {n} {منتج \| منتجات}.» | `products_count` |
| `POST products/<id>/variants/generate/` — a variant to remove is tied to data | «لا يمكن إزالة متغيرات مرتبطة ببيانات قائمة: «{label}» ({reasons}) … أبقِ هذه التركيبات أو صفِّ ارتباطاتها أولاً.» | `variants: [{id, label, reasons[]}]` |
| `DELETE products/<id>/` — the product is in an active auction | «لا يمكن حذف منتج في مزاد نشط.» | — |

The reasons that block the removal of a variant (`reasons[]`, joined with «، »; at most 5 variants are named in the sentence, the rest as « و{k} غيرها»):

| Reason | The variant has |
|---|---|
| «حجز مخزون نشط» | an `active` inventory reservation that has not expired |
| «وحدات تسلسلية» | serial-number units (`InventoryItem`, Phase B) |
| «مخزون في موقع» | `quantity_on_hand > 0` in some location |
| «طلب مفتوح» | an order line of an order in `pending_payment`, `new`, `awaiting_payment` or `payment_review` (cancelling such an order returns stock to the variant) |

```json
// POST /api/v1/products/31/variants/generate/   (variant 102 "M / أحمر" has an active reservation)
// 409
{
  "detail": "لا يمكن إزالة متغيرات مرتبطة ببيانات قائمة: «M / أحمر» (حجز مخزون نشط). أبقِ هذه التركيبات أو صفِّ ارتباطاتها أولاً.",
  "variants": [ { "id": 102, "label": "M / أحمر", "reasons": ["حجز مخزون نشط"] } ]
}
```

```json
// DELETE /api/v1/variant-attributes/7/   (used by the variants of one product)
// 409
{ "detail": "لا يمكن حذف السمة: مستخدمة في متغيرات 1 منتج.", "products_count": 1 }
```

A `409` changes nothing (the whole call is one transaction). Completed, cancelled or refunded orders do **not** block: they keep a text snapshot (`variant_label`).

<a id="dictionary"></a>
### 6.4 Attribute dictionary — `variant-attributes/**`

Reads need any session; writes need `catalog.manage`. The list is **not paged**.

**Attribute object** (`attribute_repr`, `variantAttributeSchema`): `id`, `name`, `field_type`, `data_type` (`"text"` when empty), `unit`, `min_value`, `max_value` (decimal text or `null`), `is_required`, `sort_order`, `options[]`, `products_count` (distinct products whose variants use it). Ordered by `sort_order`, `name`, `id`.

**Option object** (`option_repr`, `variantOptionSchema`): `id`, `attribute_id`, `value` (the display text), the typed columns `text_value`, `numeric_value`, `unit_value`, `boolean_value`, `date_value` (`null` when not used), `image` (absolute URL or `null`), `color` (`#rrggbb` or `null`).

| Route | Body | Success |
|---|---|---|
| `GET variant-attributes/` | — | `200` array of attributes with their options |
| `POST variant-attributes/` | `name`, `field_type`, `data_type`, `unit`, `min_value`, `max_value`, `is_required`, `sort_order` | `201` attribute |
| `PATCH variant-attributes/<id>/` | any of the above; rules run on the merged state | `200` attribute |
| `DELETE variant-attributes/<id>/` | — | `204` (empty) or `409` |
| `POST variant-attributes/<id>/options/` | `value` (required), `color`, `image` | `201` option |
| `PATCH variant-attributes/options/<id>/` | `value`, `color`, `image` | `200` option |
| `DELETE variant-attributes/options/<id>/` | — | `204` (empty) or `409` |

**Attribute rules and messages**

| Field | Rule | Message |
|---|---|---|
| `name` | required, ≤ 100, unique **after normalisation** | «أدخل اسم السمة.» · «اسم السمة 100 حرف على الأكثر.» · «سمة بهذا الاسم موجودة.» |
| `field_type` | one of the model's `FIELD_TYPE_CHOICES` (e.g. `select`, `swatches`) | «اختر نوع الحقل.» |
| `data_type` | one of `DATA_TYPE_CHOICES` (`text`, `number`, `unit`, `date`, …) | «اختر نوع البيانات.» |
| `unit` | required when `data_type = unit`; ≤ 30 | «أدخل الوحدة (مثال: سم، غ).» · «الوحدة 30 حرفاً على الأكثر.» |
| `min_value`, `max_value` | decimal text, ≤ 9 integer and 3 decimal digits; `max ≥ min` | «رقم صحيح أو عشري.» · «رقم حتى 9 خانات صحيحة و3 عشرية.» · «الحد الأعلى أقل من الحد الأدنى.» |
| `is_required` | only the boolean `true` turns it on | — |
| `sort_order` | integer; empty → the number of existing attributes (POST) or `0` (PATCH) | «عدد صحيح.» |

**Normalisation of names.** Two names clash when they are equal after: NFKC, removing diacritics (tashkeel), `أ إ آ → ا`, `ى → ي`, `ة → ه`, collapsing the spaces around `/`, collapsing repeated spaces, trimming. So «اللون  (إختبار)» is refused when «اللون (اختبار)» exists (`test_dictionary_contract_normalized_names_and_409_guards`).

**Option rules and messages** (the value is validated and stored typed by the attribute's `data_type`)

| Field | Rule | Message |
|---|---|---|
| `value` | required, ≤ 255 | «أدخل القيمة.» · «القيمة 255 حرفاً على الأكثر.» |
| `value` (`number`, `unit`) | `^-?\d+(\.\d+)?$`, within the attribute's min/max | «القيمة رقم.» · «أقل قيمة مسموحة {n}.» · «أعلى قيمة مسموحة {n}.» |
| `value` (`date`) | `YYYY-MM-DD` | «تاريخ بصيغة YYYY-MM-DD.» |
| `value` | unique within the attribute | «القيمة موجودة.» |
| `color` | `#` + 6 hex digits | «أدخل لوناً بصيغة HEX مثل #18181b.» |
| `image` | base64 data URL, see [§7.2](#images-limits); on `PATCH` `null` removes it and an existing `http(s)://` or `/` URL leaves it unchanged | under `{"image": [...]}`: «الصيغ المسموحة: jpg, jpeg, png, webp, gif» · «حجم الصورة 5MB على الأكثر.» · «أبعاد الصورة كبيرة جداً.» |

`PATCH` with a new `value` re-types the option (the typed columns are reset first). Unknown ids → `404` «السمة غير موجودة.» / «القيمة غير موجودة.». The `409` of the two `DELETE` routes is in [§6.3](#variants-409).

```json
// POST /api/v1/variant-attributes/7/options/
{ "value": "أحمر", "color": "#ff0000" }
// 201 → { "id": 81, "attribute_id": 7, "value": "أحمر", "color": "#ff0000", "image": null, … }

// POST /api/v1/variant-attributes/9/options/   (attribute 9 has data_type "number")
{ "value": "ثقيل" }
// 400 → { "value": ["القيمة رقم."] }
```

<a id="templates"></a>
### 6.5 Product templates — `product-templates/**`

A template (decision D1) is a **blueprint**: a JSON dictionary `fields` of product fields (46 allowed keys, `products/blueprint.py`) plus a list of variant attributes. Reads need any session; writes need `catalog.manage`. The list is not paged, ordered by `name`.

**Template object** (`template_repr`, `productTemplateSchema`): `id`, `name`, `global_template_id` (the linked sector or `null`), `variant_attribute_ids`, `fields`, `products_count`, `updated_at`.

| Route | Success | Notes |
|---|---|---|
| `GET product-templates/` | `200` array | |
| `GET product-templates/<id>/` | `200` template | `404` «القالب غير موجود.». This is also the read «تطبيق على منتجات» uses ([§6.7](#variants-apply)). |
| `POST product-templates/` | `201` template | |
| `PATCH product-templates/<id>/` | `200` template | `fields` and `variant_attribute_ids`, when sent, **replace** the stored values completely. |
| `DELETE product-templates/<id>/` | `204` | The products built on it stay as they are (`blueprint` becomes `NULL`). |

**`POST` body**

| Field | Rule | Message |
|---|---|---|
| `name` | required, ≤ 200, unique | «أدخل اسم القالب.» · «اسم القالب 200 حرف على الأكثر.» · «قالب بهذا الاسم موجود.» |
| `fields` | only allowed keys, every value valid for its field | `400` `{"fields": [<one message per problem>]}` |
| `variant_attribute_ids` | ids that do not exist are dropped silently | — |
| `global_template_id` | a sector id, or `null`; only **links** (does not copy its attributes) | «القطاع غير موجود.» |
| `from_product_id` | optional; a missing product is ignored | — |

**Rules**

- *From scratch*: the 9 scratch defaults (`product_type`, `unit`, `currency`, `payment_policy`, `is_taxable`, `low_stock_threshold`, `variant_display_style`, `is_free_shipping`, `delivery_duration`) are overlaid by the posted `fields`.
- *From a product* (`from_product_id`): the posted `fields` are overlaid by the 14 fields copied from that product (`product_type`, `unit`, `currency`, `payment_policy`, `deposit_required`, `is_taxable`, `tax_rate`, `low_stock_threshold`, `variant_display_style`, `is_free_shipping`, `delivery_duration`, `weight`, `is_hazardous`, `hazard_class`); the attributes used by the product's variants are **merged** into the selected ones.
- Values are normalised on save (`"tax_rate": "15"` is stored and returned as `"15.00"`).
- The columns of `ProductTemplate` stay as a mirror for the legacy Django template screen only; `apply_to()` reads the JSON, so a product receives exactly the keys that are present.

```json
// POST /api/v1/product-templates/
{ "name": "ملابس", "variant_attribute_ids": [7, 99999], "fields": { "is_taxable": true, "tax_rate": "15", "weight": "0.4" } }
// 201 (excerpt: `fields` = the 9 scratch defaults overlaid by the posted keys)
{ "id": 4, "name": "ملابس", "global_template_id": null, "variant_attribute_ids": [7],
  "fields": { "product_type": "physical", "unit": "piece", "currency": "SAR", "payment_policy": "cod",
              "is_taxable": true, "tax_rate": "15.00", "weight": "…" },
  "products_count": 0, "updated_at": "…" }
```

```json
// PATCH /api/v1/product-templates/4/   (fields are replaced, not merged)
{ "fields": { "unit": "kilogram" }, "variant_attribute_ids": [] }
// 200 → "fields": { "unit": "kilogram" }, "variant_attribute_ids": []
```

A name that exists answers `400` `{"name": ["قالب بهذا الاسم موجود."]}`; `{"fields": {"nope": 1, "unit": "bag"}}` answers `400` with two messages under `fields`.

<a id="sectors"></a>
### 6.6 Central sectors and `apply-global`

`GET /api/v1/global-variant-templates/` (any session) lists the active **sectors** — 35 after `seed_sectors()` — ordered by `id`:

```json
[
  { "id": 1, "name": "الملابس والأحذية",
    "attributes": [ { "attribute_id": 7, "name": "المقاس (…)", "field_type": "select", "data_type": "text", "values": ["S", "M", "L", "XL"] } ] }
]
```

A sector points at rows of the store's own dictionary, so `values` are **all the current values of that attribute in this store** (in entry order), not values specific to the sector. `attribute_id` lets the frontend match by id, not by name. `seed_sectors()` is idempotent (the second run reports `(0, 0, 0, 0)`) and also creates one `ProductTemplate` per sector, named like the sector, with the 15 model defaults (`DEFAULT_SECTOR_BLUEPRINT`).

`POST /api/v1/product-templates/<id>/apply-global/` (key `catalog.manage`) links a template to a sector and adds the sector's attributes it does not have yet. **It never removes a link.**

```json
// POST /api/v1/product-templates/4/apply-global/
{ "global_template_id": 1 }
// 200 — the second call answers added_attributes: []
{ "added_attributes": ["المقاس (…)", "اللون (…)"], "existing_attributes": [] }
```

| Status | Body | When |
|---|---|---|
| `400` | `{"global_template_id": ["اختر قطاعاً."]}` | missing or non-numeric |
| `404` | `{"detail": "القالب أو القطاع غير موجود."}` | either id unknown |

<a id="variants-apply"></a>
### 6.7 «تطبيق على منتجات» — BFF-orchestrated (decision D7)

There is **no Django route** for applying a template to existing products. In live mode the BFF row 20 (`POST /api/bff/products/templates/{id}/apply`, handler `applyTemplateLive`) does it ([`../../overview/bff.md#products-rules`](../../overview/bff.md#products-rules)):

1. `product_ids` is read from the body: unique positive integers. None → `400` `{"product_ids": ["اختر منتجاً واحداً على الأقل."]}`.
2. `GET product-templates/<id>/`. A failure is returned as it is; a body that does not match `productTemplateSchema` → `502` `{"detail": "تعذّرت قراءة القالب من الخادم."}`.
3. For each product, **one after the other**, `PATCH products/<id>/` with `{…template.fields, "blueprint_id": <id>}`. Each PATCH is atomic and keeps its own validation: the same permission gates ([§2](#2-access--gate-chain)) and the active-auction refusal «لا يمكن تطبيق قالب على منتج في مزاد نشط.».

```json
// POST /api/bff/products/templates/4/apply
{ "product_ids": [12, 13, 999999] }
// 200 — the whole run is not transactional: some are applied, some skipped
{ "applied": 2, "skipped": [ { "id": 999999, "reason": "غير موجود" } ], "fields": ["product_type", "unit", "…"] }
```

Only the template's keys and `blueprint_id` are written; every other field of the product stays (`test_blueprint_copies_only_its_keys_and_d7_patch`: description and cost price untouched; the template's `products_count` grows). `reason` is the `detail` of Django's answer, else the first field message, else «ليست لديك صلاحية» (for `403`) or «تعذّر التطبيق»; `404` is «غير موجود».

### 6.8 Mock ⇄ Django alignment

The mock (`src/mocks/catalog/products.ts`, `dictionary.ts`) and Django follow the same rules, and the Django service docstrings cite the mock functions they mirror (`generateVariants`, `bulkPatchVariants`, `createTemplate`, `validateAttribute`, `optionValueErrors`): the variant-sum stock mirror, the variant SKU pattern `<sku>-<n>`, the attribute-name normalisation, the template and sector reads. The mock checks are `scripts/product-minimum-check.ts`, `scripts/product-editor-ux-check.ts` and `scripts/catalog-orders-check.ts`; the real Django responses are validated by the frontend Zod schemas with `PRODUCTS_CONTRACT_DUMP` (§1.3).

<a id="images-stock"></a>
## 7. Product images and stock routes

<a id="gallery"></a>
### 7.1 Gallery — upload, reorder, delete

Decision D2: **`ProductImage` is the one image list of a product**; the first image is the main one. `Product.image` is only a mirror of the first image (the same file, no copy) that the storefront reads. All three routes need `catalog.manage` and answer with **the whole gallery** after the change: `[{ "id", "url", "sort_order" }]` (`image_repr`, `url` absolute). The gallery also appears as `images[]` in the product detail, and the first image as `image` in the list.

| Route | Body | Success |
|---|---|---|
| `POST products/<id>/images/` | `multipart/form-data`, field `images` (one or more files) | `201` gallery |
| `POST products/<id>/images/reorder/` | JSON `{"ordered_ids": [imageId, …]}` | `200` gallery |
| `DELETE products/<id>/images/<image_id>/` | — | `200` gallery (not `204`) |

**Upload checks** (each file; all are validated before anything is saved)

| Check | Message (`{"images": [...]}`) |
|---|---|
| no file in `images` | «اختر صورة واحدة على الأقل.» |
| extension not in `.jpg .jpeg .png .webp .gif` (so never SVG) | «الصيغ المسموحة: jpg, jpeg, png, webp, gif» |
| size > 5 MB | «حجم الصورة أكبر من 5MB.» |
| content that Pillow cannot open and verify, or a format other than JPEG / PNG / WEBP / GIF | «الصيغ المسموحة: jpg, jpeg, png, webp, gif» |

New files are appended at the end (`sort_order` continues), then `Product.image` is synchronised with the first image.

**Reorder.** Ids that are not in this gallery are ignored; images missing from the list keep their relative order at the end; the new first image becomes the main one. **Delete.** The remaining images are renumbered `0…n-1`; the next first image becomes the main one; deleting the last one clears `Product.image`. Unknown ids → `404` «المنتج غير موجود.» / «الصورة غير موجودة.».

```text
POST /api/v1/products/41/images/        (multipart, images = a.png)   → 201 [{ "id": 5, "url": "https://shop.example.test/media/…/a.png", "sort_order": 0 }]
POST /api/v1/products/41/images/        (multipart, images = b.png)   → 201 [{ "id": 5, … "sort_order": 0 }, { "id": 6, … "sort_order": 1 }]
```

```json
// POST /api/v1/products/41/images/reorder/
{ "ordered_ids": [6, 5] }
// 200 → [ { "id": 6, "url": "…", "sort_order": 0 }, { "id": 5, "url": "…", "sort_order": 1 } ]   (Product.image is now image 6's file)

// DELETE /api/v1/products/41/images/6/
// 200 → [ { "id": 5, "url": "…", "sort_order": 0 } ]
```

The legacy Django HTML screens that still upload `Product.image` directly call `ensure_main_image_in_gallery`, which puts that file at the start of the gallery (the same rule as migration `0215`). In the full editor a **new** product is created first, then the pending images are uploaded one request each (`uploadPending`).

<a id="images-limits"></a>
### 7.2 Image channels and size limits

| Channel | Where | Format | Per-image limit | Request bound |
|---|---|---|---|---|
| Gallery | `POST products/<id>/images/` | multipart file | 5 MB (the route), Pillow-verified | one file per request from the browser; production Nginx `client_max_body_size 8M` |
| Quick add | `image` in `POST products/quick/` | base64 data URL inside JSON | 5 MB decoded | the JSON body ≤ 8 MB (`DATA_UPLOAD_MAX_MEMORY_SIZE`, `config/settings.py:368`) |
| Option image | `image` in `POST`/`PATCH variant-attributes/**/options/**` | base64 data URL inside JSON | 5 MB decoded | same |

The base64 field (`Base64ImageField`): `data:image/<type>;base64,<payload>`; the size is estimated before decoding; the real format comes from the **content** (JPEG, PNG, WEBP, GIF), never from the declared MIME; more than 40 000 000 pixels is refused. Errors: «الصيغ المسموحة: jpg, jpeg, png, webp, gif» · «حجم الصورة 5MB على الأكثر.» · «أبعاد الصورة كبيرة جداً.». `null` or `""` means "no image / remove"; an existing URL (`http://`, `https://` or `/…`) means "unchanged". A 5 MB image is about 6.7 MB as base64, which is why it fits the 8 MB body bound. The frontend compresses an image above 5 MB before sending. The full editor's own create/update body carries no image bytes (`image_url` is only a link).

<a id="stock-route"></a>
### 7.3 Stock — `POST /api/v1/products/<id>/stock/`

The in-place stock edit of the list. Key **`inventory.adjust`**.

| Field | Type | Rules |
|---|---|---|
| `stock` | decimal text | `^\d{1,9}(\.\d{1,3})?$` (so no negative number). Checked **before** the product is looked up. |
| `reason` | string | The UI sends `"manual_adjust"`; the server always records `manual_adjust` and ignores the value. |

**Response `200`** — `{"stock": "2.500", "is_low_stock": true}`.

**Errors**

| Status | Body | When |
|---|---|---|
| `400` | `{"stock": ["المخزون رقم حتى 3 خانات عشرية."]}` | bad format (`-1`, `abc`, 4 decimals) |
| `404` | `{"detail": "المنتج غير موجود."}` | unknown product |
| `400` | `{"detail": "<reason>"}` | the stock guard below refuses |
| `403` | `{"detail": "ليست لديك صلاحية لهذا الإجراء."}` | staff without `inventory.adjust` |

**Stock guard** — the first rule that matches answers (`_stock_guard`, shared with `PATCH products/<id>/`):

| # | Product state | Message | Where its stock lives instead |
|---|---|---|---|
| 1 | active auction | «المخزون محجوب أثناء مزاد نشط.» | forced to `1` by the auction rules |
| 2 | `is_serialized` | «مخزون هذا المنتج يُدار بالأرقام التسلسلية.» | the serial units (Phase B, [`m37-advanced-products.md`](m37-advanced-products.md)) |
| 3 | has variants | «المخزون يُدار على المتغيرات.» | each variant: `POST variants/bulk/` ([§6.2](#variants-bulk)); `Product.stock` is their sum |
| 4 | has a location stock row for the product itself | «مخزون هذا المنتج يُدار حسب المواقع — عدّله من شاشة المخزون.» | the locations module: stock adjustments and locations are in [`../10-inventory-locations-procurement/m21-inventory.md`](../10-inventory-locations-procurement/m21-inventory.md) (INT-024) and [`../10-inventory-locations-procurement/m22-locations.md`](../10-inventory-locations-procurement/m22-locations.md) |

A variant with location stock refuses a different stock in `variants/bulk/` with its own message ([§6.2](#variants-bulk)).

**Side effects.** An accepted edit saves the product and writes `StockMovement(manual_adjust)` with the **signed difference** (`quantity_change`) and the note «تعديل سريع من قائمة المنتجات»; the same value writes no movement. The change log row of `stock` carries the caller as `actor`. A negative stock (backorder) is shown as `"0.000"`.

**Same field in the editor.** `PATCH products/<id>/` with `stock` goes through the same guard **only when the value differs from the stored one**, answers `400` `{"stock": ["<reason>"]}` and records the note «تعديل من محرر المنتج»; the key is `catalog.manage`. That is why the editor sends `stock` only when edited ([§5.3](#editor)).

```json
// POST /api/v1/products/41/stock/   (product with stock 5)
{ "stock": "2.5", "reason": "manual_adjust" }
// 200 — one StockMovement: quantity_change -2.5, reason manual_adjust
{ "stock": "2.500", "is_low_stock": true }
```

```json
// POST /api/v1/products/58/stock/   (a serialized product)
{ "stock": "3" }
// 400
{ "detail": "مخزون هذا المنتج يُدار بالأرقام التسلسلية." }
```

<a id="formula-preview"></a>
### 7.4 Formula preview — `POST /api/v1/products/formula-preview/`

For a product with `pricing_type = formula` the frontend never computes the price: it asks this route, which runs `Product.calculate_formula_unit_price` itself. It belongs to the `products` key (live before INT-045) and needs **any session** (no permission key); it is a `POST`, so the CSRF rule applies. Nothing is saved.

| Field | Rule | Message |
|---|---|---|
| `formula_unit_price` | required, `^\d{1,8}(\.\d{1,4})?$` | «أدخل سعر الوحدة (حتى 4 منازل).» |
| `formula_coefficient` | required, `^\d{1,4}(\.\d{1,4})?$` | «أدخل المعامل (حتى 4 منازل).» |
| `formula_fixed_extra` | optional (empty = `0`), `^\d{1,8}(\.\d{1,2})?$` | «أدخل مبلغاً صحيحاً.» |
| `currency` | a product currency code; anything else = `SAR` | — |

`price = unit_price × coefficient + fixed_extra`, rounded half-up to 2 decimals.

```json
// POST /api/v1/products/formula-preview/
{ "formula_unit_price": "250.5", "formula_coefficient": "0.875", "formula_fixed_extra": "15", "currency": "SAR" }
// 200
{ "price": "234.19", "display_price": "234.19 ر.س", "expression": "250.5 × 0.875 + 15" }
```

`{"formula_unit_price": "x"}` answers `400` with the messages above. BFF row 4 (`/api/bff/products/formula-preview`).

## 8. Migrations `products/0211`–`0215`

All additive (Steps 1–3, 2026-10-22).

| Migration | Change |
|---|---|
| `0211` | `Product.updated_at` (`auto_now`, indexed); existing rows start from `created_at`. |
| `0212` | `ProductChangeLog.actor`, filled through `acting_as(...)`: «مالك المتجر» or the staff member's `full_name`. Old rows show «—». |
| `0213` | `VariantOption.color` (HEX). |
| `0214` | `ProductTemplate.blueprint_fields` (JSON) and a one-time data migration: every non-empty value of the 33 legacy columns is kept (`null` and `""` are dropped; decimals as text, quantities without trailing zeros, dates as ISO text); templates that already have a JSON are skipped. The columns are not dropped. A seeded sector template therefore gets its 15 model defaults. |
| `0215` | Main image → first gallery image (the same file; the other images move one place; idempotent). `Product.image` is unchanged. |

On the server: `python manage.py migrate_schemas`; optionally `python manage.py seed_variant_templates` for stores that never had the sectors (new stores get them at provisioning); tests: `python manage.py test api.test_products_api tenants.test_provisioning products.test_product_templates`.

## 9. Related pages

- Categories, brands, tags, collections, badges (`catalog` key): [`m05-organization.md`](m05-organization.md)
- Phase B extras (tier prices, bundles, compatibility, personalization, auctions, serials, CSV): [`m37-advanced-products.md`](m37-advanced-products.md), [`../09-b2b/m36-b2b-wholesale.md`](../09-b2b/m36-b2b-wholesale.md)
- Inventory adjustments and locations (INT-024): [`../10-inventory-locations-procurement/m21-inventory.md`](../10-inventory-locations-procurement/m21-inventory.md), [`../10-inventory-locations-procurement/m22-locations.md`](../10-inventory-locations-procurement/m22-locations.md)
- BFF adapter table: [`../../overview/bff.md#products-rules`](../../overview/bff.md#products-rules) · errors: [`../../overview/errors.md`](../../overview/errors.md) · paging: [`../../overview/pagination.md`](../../overview/pagination.md) · money: [`../../overview/money.md`](../../overview/money.md) · conventions: [`../../overview/conventions.md`](../../overview/conventions.md)
