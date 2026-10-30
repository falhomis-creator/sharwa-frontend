# Dropshipping API — M29 (الدروبشيبينغ)

> **Source**: DOC-235, DOC-236, DOC-237, DOC-238, DOC-239, DOC-240, DOC-241 · INT-039 (M29) · inventory Domain 13, A.3, A.6, A.8, A.9, A.12, A.13
> **Live key**: `dropshipping` (`SHARWA_LIVE_MODULES`) — one optional catch-all `api/bff/dropshipping/[[...path]]` for the whole module.
> **Django provider**: `sharwa_saas/products/services/suppliers/api_service.py` (translation-only contract layer) + `api/views_dropshipping.py` (27 routes) · reused verbatim: `connection_service`, `pricing_engine` / `pricing_service`, `catalog_service` / `import_service` / `inventory_service`, `feed_engine` + `feed_reader` (shared with the CSV product import), `order_forward_service`, `jobs` — the same services the legacy HTML screens call · adapters picked by `registry.py` (`SUPPLIER_ADAPTER_MODES`: CJ real, «مخازن»/«قنوات» fake until official docs, flat feed always real)
> **Frontend contract**: `sharwa-frontend/src/features/dropshipping/schemas.ts` · fixtures `src/mocks/dropshipping/` · BFF `src/app/api/bff/dropshipping/[[...path]]/route.ts`
> **Tests**: `sharwa_saas/api/test_dropshipping_api.py` (11 test methods incl. `SupplierBeatIntervalTests`) · legacy `products/test_dropshipping_phase1.py` … `phase5.py` (5 suites) · mock E2E `scripts/dropshipping-check.ts`
> **Last verified against code**: 2026-10-29 (step 45)

## 1. Overview

Source products from dropshipping suppliers — the live CJ Dropshipping catalogue, the regional «مخازن» (`makhazen`) and «قنوات» (`knawat`) suppliers (fake adapters until their official documentation lands), and any supplier via a flat CSV/Excel file or URL — import chosen items as real store products, price them by rule, keep stock/prices synchronized, forward customer orders to the supplier automatically, and follow up in one jobs ledger. The API layer **translates names only**: every price comes from the same `compute_sell_price` engine, every job from the same self-chaining Celery machinery, every connection from the same encrypted-installation service the legacy screens use — no second engine. The caller is the owner or a staff member holding the M18 key, through the Next BFF.

## 2. Access — gate chain

All 27 routes share `DropshippingAPIMixin.guard` (`views_dropshipping.py:43-49`) — like M28, the permission key is checked **before** the plan feature.

| # | Gate | Requirement | Failure |
|---|---|---|---|
| 1 | Session | owner or staff session | `401` `{"detail": "انتهت جلستك، سجّل الدخول مجدداً."}` |
| 2 | Permission key | `channels.dropshipping.manage` (owner has every key implicitly) | `403` `{"detail": "ليست لديك صلاحية لهذا الإجراء."}` |
| 3 | Plan feature | `dropshipping` | `403` `{"detail": "ميزة الدروبشيبينغ غير مفعّلة في خطتك."}` |

Beyond the gates, supplier-scoped routes answer `404` «المورد غير موجود.» for an unknown/unavailable supplier code (`cj · makhazen · knawat · flat_feed`), and write routes on an unconnected supplier answer `409` «المورد غير مربوط.» (`MSG_NOT_CONNECTED`).

## 3. Endpoint summary — the 27 routes

Declared in `api/urls.py:604-630`; literal segments (`pricing-rules/simulate/`, feeds sub-paths) are declared before their `<int:pk>/` counterparts.

| Method | Django path (`/api/v1/dropshipping/…`) | Purpose | Doc |
|---|---|---|---|
| `GET` | `meta/` | the 20 feed keys + allowed extensions | §7 |
| `GET` | `suppliers/` | connections + `attention_total` | §4 |
| `GET` | `suppliers/<code>/` | one supplier + its catalogue categories | §4 |
| `POST` | `suppliers/<code>/connect/` | connect `{credentials}` (adapter verifies first) | §4 |
| `POST` | `suppliers/<code>/disconnect/` | disconnect (imported products stay) | §4 |
| `GET`, `PUT` | `suppliers/<code>/settings/` | sync toggles, intervals, stock buffer, order forwarding | §4 |
| `POST` | `suppliers/<code>/sync-inventory/` | inventory sync now → `202 {job_id}` | §5 |
| `POST` | `suppliers/<code>/webhook/rotate/` | new webhook URL **and** secret — shown once | §5 |
| `GET` | `suppliers/<code>/catalog/` | browse/import-status catalogue (`?q&category&import_status&page`) | §5 |
| `POST` | `suppliers/<code>/import/` | import supplier products → `202 {job_id, count}` | §5 |
| `GET`, `POST` | `pricing-rules/` | rules list · create | §6 |
| `PATCH`, `DELETE` | `pricing-rules/<id>/` | edit · delete (204) | §6 |
| `POST` | `pricing-rules/simulate/` | preview a draft rule with the real engine | §6 |
| `POST` | `pricing-rules/<id>/apply/` | re-price the affected products → `{updated, job_id}` | §6 |
| `GET`, `POST` | `feeds/` | feeds list · create (multipart file or `{url}`) | §7 |
| `GET`, `PATCH` | `feeds/<id>/` | one feed · rename / reschedule | §7 |
| `PUT` | `feeds/<id>/mapping/` | column mapping | §7 |
| `GET` | `feeds/<id>/preview/` | first rows after conversion + error count | §7 |
| `POST` | `feeds/<id>/approve/` | approve the mapping | §7 |
| `POST` | `feeds/<id>/run/` | start the import → `202 {job_id}` | §7 |
| `GET` | `feeds/<id>/errors.csv/` | last run's errors (UTF-8 + BOM) | §7 |
| `GET` | `orders/` | supplier orders (`?status&supplier&attention&page`) | §8 |
| `POST` | `orders/<id>/resubmit/` | resend a held/failed order | §8 |
| `GET` | `jobs/` | sync jobs (`?supplier&status&job_type&page`) | §9 |
| `GET` | `jobs/<id>/` | one job | §9 |
| `POST` | `jobs/<id>/retry/` | retry a failed job → `202 {job_id}` | §9 |
| `GET` | `jobs/<id>/errors.csv/` | the job's errors (UTF-8 + BOM) | §9 |

## 4. Suppliers, connections and settings — DOC-235

### 4.1 List and detail

#### `GET /api/v1/dropshipping/suppliers/`

One row per available supplier + `attention_total` (supplier orders in `failed · rejected · held`). Row (`connection_view`):

```json
{
  "supplier_code": "makhazen",
  "connected": true,
  "account_label": "مخازن",
  "connected_at": "2026-10-20T08:00:00+00:00",
  "last_sync_at": "2026-10-29T06:23:00+00:00",
  "last_error": null,
  "settings": {"sync_products": true, "sync_prices": true, "sync_inventory": true,
               "intervals": {"products_minutes": 360, "prices_minutes": 360, "inventory_minutes": 60},
               "stock_buffer": 0, "hide_when_out_of_stock": false,
               "orders": {"forward_enabled": true, "forward_cod": false, "default_country_code": "SA", "shipping_method": ""}},
  "webhook_configured": true,
  "attention_count": 0,
  "products_count": 142,
  "reauth_required": false,
  "webhook_supported": true,
  "inventory_sync_supported": true,
  "credential_fields": [{"name": "api_key", "label": "رمز الربط (API Token)", "type": "password", "help": "…"}]
}
```

**Capability flags come from the adapter** — `webhook_supported` (`supports_webhooks`) and `inventory_sync_supported` (`supports_inventory_sync`); `reauth_required` mirrors the health flag («يتطلب إعادة الربط» in the UI). **The connect form renders Django's `credential_fields`** — each supplier declares its own fields in the registry; «مخازن» asks for exactly one API token («رمز الربط (API Token)»), CJ one «مفتاح API» — the mock's invented `store_id` field is gone. `GET suppliers/<code>/` adds `categories` — up to 200 distinct category paths of the stored (non-discontinued) catalogue, joined with ` > `.

### 4.2 Connect, disconnect

#### `POST /api/v1/dropshipping/suppliers/<code>/connect/`

Body `{credentials: {<field>: value}}` — only the declared fields are read (≤ 500 chars each). Missing field → `400` on `credentials.<field>`; the message is ``أدخل «<التسمية>».`` — «أدخل», the registry label inside «», then the period (shown as code because the message itself contains «…»). The **adapter verifies the credentials first**; results:

| Adapter result | HTTP |
|---|---|
| rejected (`SupplierAuthError`) | `400` on the first credential field with the adapter's message |
| rate limited (`SupplierRateLimitError`) | `429` `{"detail": "<اسم المورد> يطلب الانتظار قليلاً قبل محاولة ربط جديدة — أعد المحاولة بعد دقائق."}` — f-string of the supplier name |
| other supplier error | `502` with the adapter message |
| not implemented (real adapter missing) | `400` with the adapter's explanation |

Success stores the encrypted credentials and returns the refreshed supplier row. `flat_feed` has no credential fields — it connects with an empty body.

#### `POST /api/v1/dropshipping/suppliers/<code>/disconnect/`

Drops the connection; **imported products stay** in the catalogue. Returns the supplier row (`connected: false`).

### 4.3 Settings

#### `GET · PUT /api/v1/dropshipping/suppliers/<code>/settings/` — PUT needs a connected supplier (`409` «المورد غير مربوط.»)

The `settings` object of §4.1. PUT validation (all errors field-keyed):

| Field | Bounds | Error |
|---|---|---|
| `intervals.products_minutes` / `prices_minutes` | 60 – 10080 (slow lanes, hourly beat) | `{"intervals.products_minutes": ["الفاصل بين 60 و10080 دقيقة."]}` (f-string of the bounds) |
| `intervals.inventory_minutes` | max(15, adapter `min_sync_interval_min`) – 1440 | same pattern («الفاصل بين 15 و1440 دقيقة.») |
| `stock_buffer` | integer 0 – 100000 | `{"stock_buffer": ["عدد صحيح غير سالب."]}` |
| `orders.default_country_code` | two Latin letters or empty | `{"orders.default_country_code": ["رمز دولة من حرفين لاتينيين (مثل YE أو SA)."]}` |

**«إحالة الطلبات» (order forwarding)** lives under `orders`: `forward_enabled`, `forward_cod` (auto-forward COD orders — off by default: a COD order waits for review so the merchant never pays a supplier for a bogus order), `default_country_code` (ISO-2 used when the order address has none), `shipping_method` (empty = cheapest available at send time). The intervals replace the fixed 6-hour cadence — defaults stay 360 minutes (§10).

## 5. Inventory sync, webhook rotation, catalogue, import — DOC-236

### 5.1 Inventory sync now

#### `POST /api/v1/dropshipping/suppliers/<code>/sync-inventory/` → `202 {job_id}`

Adapter without live inventory sync → `409` «هذا المورد لا يدعم مزامنة المخزون المباشرة — المخزون يتحدّث مع الكتالوج/الملف.»; not connected → `409` «المورد غير مربوط.»; nothing imported yet → `409` «لا منتجات مستورَدة من هذا المورد بعد.».

### 5.2 Webhook rotation

#### `POST /api/v1/dropshipping/suppliers/<code>/webhook/rotate/`

Returns `{webhook_url, webhook_secret, base_url_missing}` — the URL **and the signing secret, shown once**; the response carries `Cache-Control: no-store` (set by the view, `views_dropshipping.py:139`). The secret is stored hashed server-side; only this rotation response ever shows the plain value. `base_url_missing` flags a platform base-url misconfiguration. See [inbound webhooks](../../integrators/webhooks-inbound.md) for the receiver side (idempotency, `SupplierWebhookEvent`, the retry/discard console).

### 5.3 Catalogue

#### `GET /api/v1/dropshipping/suppliers/<code>/catalog/?q&category&import_status&page`

Two shapes, chosen by the adapter's `catalog_mode`:

- **CJ (`catalog_mode='search'`) browses live** — no mirror: the UI's page number **is** the CJ page (`SEARCH_PAGE 24` = the table's page size), `count` comes from CJ (or is estimated from the cursor). A hit not stored yet carries id **`ext:<pid>`** — the external product id prefixed, so the row can be passed straight to `import/`. Filtering by `imported · importing · failed` (or any non-search supplier) falls back to the **local** stored catalogue. Adapter errors: auth → `409` «<رسالة> أعد الربط من صفحة الموردين.» (f-string), rate limit → `429` «المورد يطلب الانتظار قليلاً — أعد المحاولة بعد لحظات.», other → `502`.
- **Local catalogue** (`makhazen`/`knawat`/`flat_feed`, and CJ when filtering): rows from `SupplierProduct`, page size 24.

Row: `{id, name, image, category, display_cost, display_suggested_price, variants_count, import_status, import_error, product_id}` — `display_suggested_price` is what the rule chain (§6) would price it at today; both money fields are server display strings. **`importing` is computed, never stored**: a product counts as importing when it sits in the supplier's **active import job** (the job payload's remaining external ids — or its query prefix for bulk imports) and has no local product yet. Statuses otherwise: `imported` (has `product_id`), `failed` (last import failed — `import_error` shows the reason), `not_imported`.

### 5.4 Import

#### `POST /api/v1/dropshipping/suppliers/<code>/import/` → `202 {job_id, count}`

Body `{supplier_product_ids: […]}` — stored row ids (ints) and/or live-search ids `ext:<pid>`; already-imported externals are skipped. More than 500 (`MAX_IMPORT_BATCH`) → `400` `{"supplier_product_ids": ["الحد الأقصى 500 منتج في الدفعة الواحدة."]}` (f-string of the constant); nothing to import → `400` `{"supplier_product_ids": ["حدد منتجات غير مستوردة."]}`; an import already running for this supplier → `409` «استيراد آخر جارٍ لهذا المورد — انتظر اكتماله ثم أعد المحاولة.». The job imports in self-chaining chunks, prices each product through the rule chain and downloads images on the sync queue.

## 6. Pricing rules — DOC-237

### 6.1 The engine (one truth)

`compute_sell_price` (`pricing_engine.py:120-138`), given the chosen rule:

```
cost_sar   = cost converted to SAR (fixed rule rate, or the store's daily rate)
price      = (cost_sar + shipping_estimate) × (1 + markup% / 100) + fixed_add
floor      = cost_sar × (1 + min_margin% / 100)
price      = rounding(max(price, floor))        # e.g. end_99
```

`fx_source: daily` reads `StoreSetting.usd_to_sar` (shown in the row as `fx_rate`, fallback 3.75); `fixed` uses the rule's own rate. Rounding codes: `none · nearest_1 · end_99 (default) · end_95 · end_00`. **Selection chain** (`RuleBook.select`): product override → category rule → supplier rule → the supplier's default rule (`SupplierConnection.default_pricing_rule`) → the platform default (margin 30%, min margin 10%, `end_99`).

### 6.2 CRUD — `GET · POST pricing-rules/` · `PATCH · DELETE pricing-rules/<id>/`

Rule row: `{id, name, scope_type, scope_value, markup_percent, rounding, fx_source, fx_rate, priority, is_active, fixed_add, shipping_estimate, min_margin_percent}`. **Translation** between the contract and `PricingRule`:

| Contract | Model |
|---|---|
| `scope_type: all / supplier / category` + `scope_value` | `scope: supplier` with empty/`supplier_code` — or `scope: category` + `category_prefix`; `scope='product'` rules (legacy per-product assignments) are **excluded from the contract** |
| `fx_source: daily / fixed` | `store_setting / fixed` (+ `fx_rate`) |
| `priority` — UI «الأصغر أولاً» | `1000 − priority` — Django orders **«الأعلى أولاً»** (bigger = wins); the contract inverts so smaller UI numbers win. Example: a UI priority of `1` stores `999` and beats a UI priority of `50` (stored `950`) |

Validation (`400`, contract field names): name required «اسم القاعدة مطلوب.» ≤ 100 «100 حرف كحد أقصى.»; scope «النطاق غير صالح.» / «اختر المورد.» / «اختر الفئة.»; markup 0–1000 two decimals «نسبة الهامش رقم بين 0 و1000 حتى خانتين.»; rounding «التقريب غير صالح.»; fx «مصدر الصرف غير صالح.» / «سعر صرف موجب حتى 4 خانات.»; priority 1–100000 «الأولوية عدد صحيح موجب (الأصغر أولاً).»; the new fields `fixed_add`/`shipping_estimate` (0–100000) and `min_margin_percent` (0–1000, default 10) — «رقم بين 0 و<high> حتى خانتين.». Unknown id → `404` «القاعدة غير موجودة.».

### 6.3 Simulate and apply

#### `POST /api/v1/dropshipping/pricing-rules/simulate/`

Body `{rule: {…}, id?}` (or the rule fields inline). Runs **the same `RuleBook` / `compute_sell_price`** with the draft rule inserted (replacing rule `id` if given): `{sample: [8 rows {product, display_cost, display_current, display_after, below_cost}], affected_count, below_cost_count, overlaps}`. `affected_count` = the imported, **unlocked** products the chain would hand this rule — exactly what `apply` re-prices; the sample mixes imported and staged products and flags quotes that would land below cost.

#### `POST /api/v1/dropshipping/pricing-rules/<id>/apply/`

Starts a `price_sync` job over **exactly those products** (imported, unlocked, chain-selected) → `{updated, job_id}` (`{updated: 0, job_id: null}` when nothing matches). Inactive rule → `409` «القاعدة غير مفعّلة.». Locked products (`price_locked`, e.g. a feed's fixed selling price) are never touched by rules — the explicit unlock is legacy-HTML only (§8).

## 7. Flat feeds — DOC-238

### 7.1 Create and list

#### `GET · POST /api/v1/dropshipping/feeds/`

Create accepts a **multipart file** or JSON `{url}` (a link feed). The reader is `FeedReader` — the same engine as the CSV product import. Errors: no file and no url → `400` `{"file": ["اختر ملفاً أو أدخل رابطاً."]}`; wrong extension (allowed `csv · tsv · txt · xlsx`) → `400` with «الامتدادات المسموحة: <القائمة>» (f-string of the joined list); a fetch/read failure → `400` «تعذّر قبول الملف: <reason>» and the feed row is deleted; a feed fetch that just happened → `429` «جلبٌ آخر جرى للتو — انتظر دقيقتين ثم أعد المحاولة.»; more than 20 active feeds (`MAX_FEEDS`) → `409` «الحد الأقصى 20 ملفاً نشطاً — عطّل ملفاً قديماً أولاً.» (f-string of `MAX_FEEDS`). On creation the header row is detected and a mapping **auto-suggested** (synonyms incl. the new fields' lists — no auto-suggest for a column already used).

### 7.2 The 20-key mapping

`GET meta/` returns the keys; `PUT feeds/<id>/mapping/` takes `{mapping: {key: column}}`. Contract key → model field (`FeedMapping.column_map`):

| Key | Required | Model field | Notes |
|---|---|---|---|
| `sku` | ✓ | `external_product_id` — or `parent_id` in variant mode | |
| `name` | ✓ | `title` | |
| `cost` | ✓ | `cost` | |
| `stock` | ✓ | `stock` | |
| `price` | | `price` | supplier's fixed selling price (SAR-converted); applied **only if ≥ cost** — and it **locks** the product against rule re-pricing (`price_locked`) |
| `compare_at_price` | | `compare_at_price` | becomes `Product.old_price` only when above the final price |
| `description` | | `description` | |
| `barcode` | | `barcode` | |
| `gtin` | | (fallback) | used when `barcode` is empty |
| `brand` | | `brand` | `Product.brand`, the brand created by name if new |
| `category` | | `category_path` | |
| `image_url` | | `image_url_1` | |
| `extra_images` | | several URLs in one cell | split, validated, capped per row |
| `weight` | | `weight_kg` | |
| `variant_sku` | | `external_product_id` | **its presence switches variant grouping on**: rows group by the `sku` column → `parent_id`, each variant by `variant_sku` → `external_product_id` |
| `option1_name` / `option1_value` | | `option_1_name` / `option_1_value` | |
| `option2_name` / `option2_value` | | `option_2_name` / `option_2_value` | |
| `supplier_url` | | `supplier_url` | kept on the supplier product row |

Mapping validation: required key missing → `{"mapping.sku": ["حقل إلزامي."]}`; column not in the file → «العمود غير موجود في الملف.»; **a column used twice → `mapping.<key>` «العمود مستخدم في حقل آخر (<key>).»**. Legacy-only keys (`currency`, `image_url_2` … `image_url_5`) — mapped by the old screen, no contract equivalent — **survive a save from Next.js** as long as their column still exists.

### 7.3 Status machine, preview, approve, run, schedule

`feed_view.status` is derived: **`draft`** (a required key unmapped) → **`mapped`** (complete, not approved) → **`approved`** (`is_approved` and `approved_version == version`) → **`running`** / a job status (the latest `feed_import` job's status when it ran this version). Any mapping change bumps `version`, which re-marks an approved feed as `mapped`.

- **`GET feeds/<id>/preview/`** — `validate_feed` + the first 10 rows' **raw values** per mapped key with per-row error texts (`«<field>»: <reason>`), plus `{errors_count, total_rows, fields}`. Unmapped required keys → `409` «اربط الحقول الإلزامية أولاً.»; a fatal report → `409` with its message.
- **`POST feeds/<id>/approve/`** — records the owner's approval only. Needs `approvable` (**≤ 5 % error rows and contiguous parent rows** in variant mode) → otherwise `409` «لا يمكن الاعتماد: الأخطاء تتجاوز 5% من الصفوف أو صفوف المنتج الأب غير متتالية — راجع المعاينة.». **Approve no longer starts the import — `run/` does.**
- **`POST feeds/<id>/run/`** → `202 {job_id}` — requires approval of the current version («اعتمد الملف قبل التشغيل.») and a still-approvable validation («التحقق الأخير لا يسمح بالاستيراد — راجع المعاينة.»); a live job for the feed is returned instead of a second one.
- **`PATCH feeds/<id>/`** — rename and/or `schedule_interval` (minutes 60–10080, or null/off): **link feeds only** — an uploaded file cannot reschedule itself → `400` `{"schedule_interval": ["الجدولة لملفات الروابط فقط — الملف المرفوع لا يتغيّر من تلقاء نفسه."]}` / «الفاصل بين 60 و10080 دقيقة.». The Beat task `fetch_scheduled_feeds` (hourly at :37) fetches a link feed when due — **5-minute slack** (hourly = 55 min, daily = 23 h 55 m) so the fetch never skips a cycle.
- **`GET feeds/<id>/errors.csv/`** — the last run's errors (or the last validation report's when never run); `404` `{"detail": "لا أخطاء لتنزيلها."}` when clean.

## 8. Supplier orders — DOC-239

#### `GET /api/v1/dropshipping/orders/?status&supplier&attention&page`

Row (`order_view`): `{id, order_id, order_number "#<id>", supplier_code, status, supplier_reference, tracking_number, display_cost (products + shipping snapshot), last_error (error or hold reason), can_resubmit, updated_at}`. Filters: `status` (raw `SupplierOrder.status`), `supplier`, `attention=1|0` (in/out of `failed · rejected · held`).

#### `POST /api/v1/dropshipping/orders/<id>/resubmit/`

Re-runs the **order-forward service** (`send_now`) for a `held` or `failed` order — otherwise `409` «لا يمكن إعادة إرسال هذا الطلب — ليس بانتظار المراجعة ولا فاشلاً.»; unknown → `404` «طلب المورد غير موجود.».

> ⚠️ **Legacy-only (HTML only — not in this contract)**: order **address correction**, **poll now**, **cancel at the supplier**; **cost-rise alerts + the manual price unlock** on the «منتجاتي» screen; the feed **delimiter / encoding / price-unit / currency-column** options; the **live stock check at checkout**. These remain on the legacy screens only (inventory A.13).

## 9. Jobs — DOC-240

#### `GET /api/v1/dropshipping/jobs/?supplier&status&job_type&page`

`supplier` accepts a supplier code or **`all`** (the periodic re-price jobs run under `supplier_code='all'`). **Job type mapping** — the contract shows the front keys, the model stores the legacy names:

| Contract `job_type` | Stored `SupplierSyncJob.job_type` |
|---|---|
| `products` | `catalog_pull` **or** `catalog_search` |
| `prices` | `price_sync` |
| `inventory` | `inventory_sync` |
| `import` | `product_import` |
| `feed` | `feed_import` |

The `order_forward` / `order_status_poll` types are **never created by these routes and excluded** from the listing (they exist for the forwarding machinery only). Row (`job_view`): `{id, supplier_code, job_type (mapped), status, created_at, started_at, finished_at, duration_seconds, processed, errors_count, errors_csv_url, last_error, feed_id}` — `last_error` only for a `failed` job (the last general error); CSV url `/api/bff/dropshipping/jobs/<id>/errors.csv`. Unknown → `404` «المهمة غير موجودة.».

#### `GET jobs/<id>/errors.csv/`

Columns «المرجع» · «الرمز» · «الرسالة» — one row per error entry (a product ref, a code like `NO-ID`, the message); formula-injection-safe (`'` prefix on `= + - @`); `404` «لا أخطاء لتنزيلها.» when the job has no errors.

#### `POST jobs/<id>/retry/` → `202 {job_id}` — only `failed` / `completed_with_errors` jobs («إعادة التشغيل للمهام الفاشلة أو المكتملة بأخطاء فقط.»). Per type:

| Type | Retry behaviour |
|---|---|
| `import` | a fresh import of the **failed rows** + the job's fetch failures; after an auth failure (job `failed` with a batch payload) the **whole un-imported batch** is retried; a live import for the supplier blocks («استيراد آخر جارٍ لهذا المورد — انتظر اكتماله.»); nothing failed → «لا منتجات فاشلة لإعادة استيرادها.» |
| `feed` | re-runs the feed (`run_feed`) — deleted/disabled feed → «الملف حُذف أو عُطّل.» |
| `inventory` | same as `sync-inventory/` |
| `prices` | `start_reprice_job` over the same scope (`supplier_code=''` when `all`), locked products excluded unless the original job included them |
| `products` | a fresh catalog job for the supplier — nothing to update → «لا شيء لتحديثه لدى هذا المورد بعد.» |

**Background machinery** (unchanged, `products/tasks/suppliers.py`): self-chaining chunk jobs (each chunk re-enqueues itself with the lock guarding a single chain per store), the hourly catalog Beat (minute 23) that honours each supplier's `catalog_sync_interval_min` (default 6 h) and **also runs the periodic re-pricing** on the `price_sync_interval_min` cadence — the **first pass only sets the baseline** (`last_price_sync_at`) so deployment day triggers no store-wide re-price wave; inventory sync every 5 min (minute 3–59/5) for due suppliers, order polling at :09/:39, webhook-payload purge daily 03:17, connection health at :11/:26/:41/:56.

## 10. Migrations, BFF wiring and tests — DOC-241

**Migration `products/0232_dropshipping_api`**: `SupplierConnection.catalog_sync_interval_min` (default 360 — replaces the fixed 6-hour constant) · `price_sync_interval_min` (default 360) · `last_price_sync_at`; `FeedMapping.schedule_interval_min`. No other schema change — everything else rides the existing M29 models.

**Mock aligned** with the contract: the supplier credentials (no invented `store_id`), the interval bounds, the one-time webhook secret, the capability flags, the engine formula, and the file-schedule refusal. **BFF**: `src/app/api/bff/dropshipping/[[...path]]/route.ts` — optional catch-all, `liveOrMock(request, "dropshipping", …)`, multipart feed uploads and both errors CSVs pass through; `.env.example` lists `dropshipping` in `SHARWA_LIVE_MODULES`; `scripts/dropshipping-check.ts` updated for the new flows. **Tests**: `api/test_dropshipping_api.py` — 11 methods (gates; connect/settings/webhook/disconnect; catalogue filters + `importing` + `ext:<pid>` import; pricing CRUD/simulate/apply incl. the priority inversion; the feed wizard + the six new fields; variant mapping + link schedule; orders attention/resubmit; jobs/CSV/retry; meta; the Beat-interval test).

## 11. Open items and legacy-only behaviour

- **The «مخازن» (`makhazen`) and «قنوات» (`knawat`) adapters are fake** (`SUPPLIER_ADAPTER_MODES` default) until official documentation arrives — switching is a settings change only (registry, §1).
- The legacy-only order/feed features listed in §8 (address correction, poll now, supplier cancel, cost-rise alerts + price unlock on «منتجاتي», delimiter/encoding/price-unit/currency options, checkout live-stock check) stay HTML-only.
- `scope='product'` pricing rules (per-product assignments from the legacy screen) exist in the model but are invisible to this contract (§6.2).
- The webhook receiver, `SupplierWebhookEvent` retention and rotation are documented with the [inbound webhooks](../../integrators/webhooks-inbound.md).

## 12. Related pages

- Same domain: [`m27-inbox-channels.md`](m27-inbox-channels.md) · [`m28-marketplaces.md`](m28-marketplaces.md) · POS/bookings pages (Step 46)
- Guide: `../../../guides/merchant/13-sales-channels/` (Step 48)
- Inbound webhooks: `../../integrators/webhooks-inbound.md` (supplier receivers + `suppliers/<code>/webhook/rotate/`)
- Conventions: `../../overview/conventions.md` · `../../overview/money.md` · `../../overview/idempotency.md`
