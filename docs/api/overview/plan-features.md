# Plan features

> **Source**: DOC-027 · inventory A.5 · INT-022, INT-030, INT-032, INT-033, INT-037, INT-038, INT-039
> **Code**: `billing/models.py` (`Feature`, `PlanFeature`, `TenantFeatureOverride`, `resolve_feature_decision`) · `billing/migrations/0003`–`0013` (seeding) · `billing/context_processors.py` (`FeatureFlags`) · `api/views_auth.py` (`_enabled_features`) · `api/views_*.py` (one gate per module) · `products/services/{settings,integrations,payments,booking}_service.py`
> **Last verified against code**: 2026-10-27 (step 04; shipping rows, Arabic names of four codes and the migration note corrected in official Step 10)

A **plan feature** is a `billing.Feature` row identified by a short code (`inventory`, `pos`, `sharwa_ship`…). The platform switches it on or off per store. This page lists all 40 seeded codes, the routes each one gates, and the codes that no API route checks. The place of the feature gate in the request chain is in [`conventions.md#gates`](conventions.md#gates). The decision rule (the five steps) is in [`conventions.md#gates`](conventions.md#gates), section "Single decision source for plan features". Permission keys are a different gate: see [`permissions.md`](permissions.md).

## 1. How a client learns what is on

| Where | What it returns |
|---|---|
| `GET /api/v1/auth/me/` | `features[]`: the codes of every `Feature` that is enabled for this store right now, ordered by code. `_enabled_features(tenant)` reads `FeatureFlags(tenant)[code]` for each catalogue row, so it follows the same decision as the route gates. Details of the session shape are in [`auth.md`](auth.md). |
| `GET /api/v1/integrations/status` | One row per integration with `available`. `available` is the plan feature of that integration (`app_marketplace`, `social_channels`, `marketplaces`, `dropshipping`, `shipping_companies`). The route does not answer `403` for a missing feature: it answers `status: "disconnected"` and `available: false`. See [`m19-domains-integrations.md`](../domains/12-settings-staff-integrations/m19-domains-integrations.md). |
| `GET /api/v1/reports/…` (registry) | Each report row has `has_feature`, `has_permission` and `visible = has_permission and has_feature`. The registry supports a per-report `feature_code`, but **no registry entry sets one today**, so `has_feature` is always `true`. See [`m25-reports.md`](../domains/15-reports/m25-reports.md). |
| Any gated route | `403` with the module's feature sentence (the sentence table is in [`conventions.md#gates`](conventions.md#gates)). |

The frontend hides a menu entry when its code is missing from `features[]`. That is a convenience, not a guard: Django answers `403` regardless of what the menu showed.

A store cannot choose its own features. The merchant dashboard has no write route for them. The console edits plans, overrides and the global switch ([`m46-plans-billing.md`](../domains/16-platform-console/m46-plans-billing.md)).

<a id="seeding"></a>
## 2. Seeding: what is on by default

`Feature` has three fields that matter here:

| Field | Meaning |
|---|---|
| `is_active_globally` | the platform kill switch. `false` turns the feature off for every store without an override |
| `requires_plan` | `false`: every plan has it. `true`: the store's plan must include an enabled `PlanFeature` row, **and only while subscriptions are on** |
| `module_group` | grouping label used by the console (`merchant_sections`, `shipping`, `customers`, `products`) |

`billing/0001` (initial schema) and `0012` (`TenantFeatureOverride.updated_at`) seed no `Feature` row, so the count of 40 is final (checked against the full migration set in official Step 10).

A code that is **missing from the catalogue counts as off** for every store, so shipping a gated module means seeding its code in a migration. Every migration below uses `get_or_create`, so re-running is safe.

| Migration | Codes | `is_active_globally` | `requires_plan` | `module_group` |
|---|---|---|---|---|
| `billing/0003` | `sharwa_ship` | on | no | `shipping` |
| `billing/0004` | the 31 codes in section 3 marked "0004" | on | no | `merchant_sections` |
| `billing/0005` | `customer_report` | on | no | `customers` |
| `billing/0006` | `product_report` | on | no | `products` |
| `billing/0007` | `multi_location` | **off** | no | `merchant_sections` |
| `billing/0008` | `staff_rbac` | **off** | no | `merchant_sections` |
| `billing/0009` | `social_channels` | **off** | no | `merchant_sections` |
| `billing/0010` | `marketplaces` | **off** | no | `merchant_sections` |
| `billing/0011` | `dropshipping` | **off** | no | `merchant_sections` |
| `billing/0013` | `pos` | on | **yes** | `merchant_sections` |

Consequences:

- **35 codes** are on for every store from day one. **Five** (`multi_location`, `staff_rbac`, `social_channels`, `marketplaces`, `dropshipping`) are off for every store until a `TenantFeatureOverride` with `is_enabled = true` exists for that store. The override wins over the global switch (step 1 runs before step 2).
- `pos` is the only code with `requires_plan = true`. While `PlatformBillingSettings.subscriptions_enabled` is `false` (the default) it is on for everyone. Once subscriptions are turned on, only plans that contain an enabled `PlanFeature(pos)` row get it.
- Every other code ignores the plan matrix entirely. Putting such a code in a `PlanFeature` row changes nothing, because step 3 of the decision returns `no_plan_required` first.

> ⚠️ Discrepancy — roadmap lists 32 codes / the code seeds **40** (31 + `sharwa_ship` + `customer_report` + `product_report` + five off-by-default + `pos`). The roadmap omits eight codes: `bulk_upload`, `marketing`, `promotions`, `reports`, `influencers`, `affiliates`, `customer_report`, `product_report`. Three of those (`reports`, `influencers`, `affiliates`) are checked by API routes, so a page that omitted them would be wrong.

## 3. The 40 codes

"Gate" is the part of the API that checks the code. Route groups are under `/api/v1/`. The domain page is where the endpoints are documented in full.

### 3.1 Commerce and catalogue

| Code | Seeded in | Arabic name | Gate | Domain page |
|---|---|---|---|---|
| `inventory` | 0004 | المخزون | `inventory/*` (all nine routes) | [`m21-inventory.md`](../domains/10-inventory-locations-procurement/m21-inventory.md) |
| `refunds` | 0004 | سجل الاسترجاعات | `returns/*` and `orders/refunds/` (the refund log) in `views_returns.py`. The per-order refund route `orders/<pk>/refunds/` is in `views_orders.py` and has no plan gate | [`m24-returns.md`](../domains/04-orders-returns/m24-returns.md) |
| `bookings` | 0004 | الحجوزات | `bookings/*` (dashboard) and `catalog/products/<id>/slots/…` (storefront). Checked by `bookings_enabled(request)` | [`m26-bookings.md`](../domains/13-channels-operations/m26-bookings.md) |
| `customer_wallets` | 0004 | محافظ العملاء | `customers/wallets/*`. Also `loyalty/points/*` with `loyalty_settings` | [`m35-wallets-loyalty.md`](../domains/06-customers-wallets/m35-wallets-loyalty.md) |
| `reports` | 0004 | التقارير | `reports/*` (`ReportsAPIMixin.gate`) | [`m25-reports.md`](../domains/15-reports/m25-reports.md) |
| `pos` | 0013 | نقطة البيع (الكاشير والورديات) | `pos/*` (`PosAPIMixin.run`). The only family that adds `code: "feature_disabled"` to the `403` body | [`m16-pos.md`](../domains/13-channels-operations/m16-pos.md) |
| `multi_location` | 0007 | المواقع والفروع | `locations/*` and `settings/multi-location` | [`m22-locations.md`](../domains/10-inventory-locations-procurement/m22-locations.md) |
| `bulk_upload` | 0004 | الرفع السريع للمنتجات | **no API route** (see 3.8) | [`m04-products.md`](../domains/03-catalog/m04-products.md) |
| `product_report` | 0006 | تقرير المنتج | **no API route** (see 3.8) | — |
| `customer_report` | 0005 | تقرير العميل | **no API route** (see 3.8) | — |

### 3.2 Marketing and design

| Code | Seeded in | Arabic name | Gate | Domain page |
|---|---|---|---|---|
| `coupon` | 0004 | الكوبونات | `promotions/coupons*`, `promotions/offers*`; also `store/announcement` and the settings section `announcement` | [`m13-marketing.md`](../domains/07-marketing-design-partners/m13-marketing.md) |
| `campaigns` | 0004 | الحملات التسويقية | `promotions/campaigns*` | [`m13-marketing.md`](../domains/07-marketing-design-partners/m13-marketing.md) |
| `abandoned_carts` | 0004 | السلات المتروكة | `promotions/abandoned-carts*`, `promotions/abandoned-cart-settings` | [`m13-marketing.md`](../domains/07-marketing-design-partners/m13-marketing.md) |
| `timeline` | 0004 | الخط الزمني | `promotions/timeline*` | [`m13-marketing.md`](../domains/07-marketing-design-partners/m13-marketing.md) |
| `gift_settings` | 0004 | الهدايا | `promotions/gift-settings` | [`m13-marketing.md`](../domains/07-marketing-design-partners/m13-marketing.md) |
| `loyalty_settings` | 0004 | نقاط الولاء | `loyalty/program`; also the program and points reads in `views_wallets.py` | [`m35-wallets-loyalty.md`](../domains/06-customers-wallets/m35-wallets-loyalty.md) |
| `storefront_design` | 0004 | تصميم الواجهة | `store/theme`, `admin/sections*` | [`m08-theme-customizer.md`](../domains/07-marketing-design-partners/m08-theme-customizer.md) |
| `affiliates` | 0004 | المسوقون بالعمولة | `affiliates/*` (`views_partners.py`, chosen by the partner `kind`) | [`m17-affiliates-influencers.md`](../domains/07-marketing-design-partners/m17-affiliates-influencers.md) |
| `influencers` | 0004 | المؤثرون | `influencers/*` | [`m17-affiliates-influencers.md`](../domains/07-marketing-design-partners/m17-affiliates-influencers.md) |
| `marketing` | 0004 | مركز التسويق | **no API route** (see 3.8) | [`m13-marketing.md`](../domains/07-marketing-design-partners/m13-marketing.md) |
| `promotions` | 0004 | العروض الترويجية | **no API route** (see 3.8) | [`m13-marketing.md`](../domains/07-marketing-design-partners/m13-marketing.md) |

### 3.3 Payments and finance

| Code | Seeded in | Arabic name | Gate | Domain page |
|---|---|---|---|---|
| `payment_gateways` | 0004 | بوابات الدفع | `payments/gateways*` for every gateway except local wallets (`gateway_feature(code)`) | [`m14-payments-wallet.md`](../domains/08-finance/m14-payments-wallet.md) |
| `local_wallets` | 0004 | المحافظ المحلية | `payments/gateways*` when the gateway code is in `LOCAL_WALLET_GATEWAY_CODES` (today only `jeeb`) | [`m14-payments-wallet.md`](../domains/08-finance/m14-payments-wallet.md) |
| `bank_transfers` | 0004 | التحويل البنكي | `payments/payout-accounts*` | [`m14-payments-wallet.md`](../domains/08-finance/m14-payments-wallet.md) |
| `merchantwallet` | 0004 | محفظة المتجر | `wallet/` (balance), `wallet/transactions`, `wallet/withdrawals`. `wallet/dues` is **not** gated (section 4) | [`m14-payments-wallet.md`](../domains/08-finance/m14-payments-wallet.md) |

### 3.4 Shipping

| Code | Seeded in | Arabic name | Gate | Domain page |
|---|---|---|---|---|
| `shipping_settings` | 0004 | رسوم التوصيل | `shipping/settings` and the settings section `shipping` | [`m15-shipping.md`](../domains/11-shipping/m15-shipping.md) |
| `shipping_companies` | 0004 | شركات الشحن | `shipping/delivery-methods*` (`MethodListView`/`MethodDetailView`, `views_shipping.py:108-111`). The external carriers routes `shipping/carriers*` carry **no** feature (owner-only only), although the frontend hides «شركات الشحن الخارجية» behind this code (corrected in official Step 10) | [`m15-shipping.md`](../domains/11-shipping/m15-shipping.md) |
| `shipping_providers` | 0004 | مندوبو الشحن | `shipping/providers*`; also unlocks Sharwa Ship courier supervision (`sharwa_ship` **or** `shipping_providers`) | [`m15-shipping.md`](../domains/11-shipping/m15-shipping.md) |
| `pickuplocation` | 0004 | نقاط الاستلام | `shipping/pickup-locations*` | [`m15-shipping.md`](../domains/11-shipping/m15-shipping.md) |
| `sharwa_ship` | 0003 | شروة شيب | `shipping/sharwa-ship`, `shipping/shipments*`, `shipping/awb-queue*`, `shipping/rate-cards`, `shipping/supervisor`, `shipping/agents`, `shipping/agent-shifts` | [`m39-sharwa-ship.md`](../domains/11-shipping/m39-sharwa-ship.md) |

### 3.5 Store settings

These four have no route of their own. The generic route `settings/<section>` reads the section table (`settings_service.SECTIONS`) and checks the feature named there.

| Code | Seeded in | Arabic name | Settings section | Owner-only section? | Domain page |
|---|---|---|---|---|---|
| `contact_info` | 0004 | معلومات التواصل | `contact` | no | [`m34-store-settings.md`](../domains/12-settings-staff-integrations/m34-store-settings.md) |
| `store_policies` | 0004 | الصفحات الإضافية | `policies` | no | [`m34-store-settings.md`](../domains/12-settings-staff-integrations/m34-store-settings.md) |
| `seo_settings` | 0004 | إعدادات SEO | `seo` | no | [`m34-store-settings.md`](../domains/12-settings-staff-integrations/m34-store-settings.md) |
| `currency_settings` | 0004 | أسعار الصرف | `currency` | **yes** | [`m34-store-settings.md`](../domains/12-settings-staff-integrations/m34-store-settings.md) |

The full section table (feature, owner flag) is:

| Section | Feature | Owner-only |
|---|---|---|
| `identity` | none (any plan) | no |
| `contact` | `contact_info` | no |
| `policies` | `store_policies` | no |
| `shipping` | `shipping_settings` | yes |
| `currency` | `currency_settings` | yes |
| `seo` | `seo_settings` | no |
| `announcement` | `coupon` | no |
| `payments` | none (any plan) | yes |
| `multi-location` | `multi_location` | yes |

### 3.6 Integrations and apps

| Code | Seeded in | Arabic name | Gate | Domain page |
|---|---|---|---|---|
| `tracking_tools` | 0004 | أدوات التتبع | `store/tracking` only. Also decides whether the public `config/` payload carries the `tracking` block (`public_tracking(request, feature_enabled)`) | [`m19-domains-integrations.md`](../domains/12-settings-staff-integrations/m19-domains-integrations.md) |
| `app_marketplace` | 0004 | متجر التطبيقات | `apps/*` (store and installed apps), Sharwa AI (`views_sharwa_ai.py`) | [`m30-app-store.md`](../domains/14-apps-ai-support/m30-app-store.md) · [`m31-sharwa-ai.md`](../domains/14-apps-ai-support/m31-sharwa-ai.md) |

`domains/*`, `webhooks/*` and `integrations/status` carry **no feature**. They are owner-only (the status route is open to staff and filters rows by permission).

### 3.7 Channels (off by default)

| Code | Seeded in | Arabic name | Gate | Domain page |
|---|---|---|---|---|
| `staff_rbac` | 0008 | الموظفون والصلاحيات | `staff/*`, `roles/*`, `permissions/`, `approvals/*`, `audit-log/*`, `behavior-alerts/*` | [`m18-staff-permissions.md`](../domains/12-settings-staff-integrations/m18-staff-permissions.md) |
| `social_channels` | 0009 | قنوات البيع | `channels/*`, `inbox/*` | [`m27-inbox-channels.md`](../domains/13-channels-operations/m27-inbox-channels.md) |
| `marketplaces` | 0010 | الأسواق الإلكترونية (أمازون، نون) | `marketplaces/*` | [`m28-marketplaces.md`](../domains/13-channels-operations/m28-marketplaces.md) |
| `dropshipping` | 0011 | استيراد المنتجات والدروبشيبينغ (مخازن، CJ، وغيرها) | `dropshipping/*` | [`m29-dropshipping.md`](../domains/13-channels-operations/m29-dropshipping.md) |

For these four and `multi_location`, a store sees `403` on every route until the console grants an override. For `marketplaces` and `dropshipping` the permission key is checked **before** the feature (see the order table in [`conventions.md#gates-per-module`](conventions.md#gates-per-module)).

<a id="ungated"></a>
### 3.8 Codes that no API route checks

| Code | What the catalogue row is for today |
|---|---|
| `bulk_upload` | the legacy page `dashboard/products/bulk-upload/`. The API import (`products/import/*`) has **no** feature gate |
| `product_report` | the legacy page `dashboard/products/report/` |
| `customer_report` | the legacy page `dashboard/customers/report/` |
| `marketing` | the legacy marketing hub. Nothing in `/api/v1` reads it (`reports_registry.py` uses the word only as a category) |
| `promotions` | the legacy promotions menu. The API routes under `promotions/` are gated by `coupon`, `campaigns`, `abandoned_carts`, `timeline` and `gift_settings` instead |

Turning one of these off in the console hides a legacy Django page. It has no effect on `/api/v1`. A frontend that wants to honour them has to read `features[]` from `auth/me/`.

## 4. Modules with no plan gate

These groups answer to the session and the permission key only (the order is in [`conventions.md#gates-per-module`](conventions.md#gates-per-module)):

| Module | Why |
|---|---|
| Orders, customers, catalogue, products, product extras (bundles, auctions, personalization, serials), B2B, search, notifications, push stats | the core of every store |
| Procurement (`suppliers`, `purchase-orders`) | gated by the permissions `suppliers.manage` / `suppliers.approve`, not by a plan |
| Support (`support/*`) | gated by `support.takeover_session` for takeover |
| Expenses (`expenses/*`) | gated by `expenses.manage` |
| Dues (`wallet/dues`) and `store/payments` | the platform bills the merchant here. They share a mixin with the gated payment routes but pass no feature. A store cannot be locked out of paying |
| Sharwa Pay (`sharwa-pay/*`) | public schema, customer-facing, no store plan |
| Console (`platform/*`) | public schema, platform staff |

Dues, store payments, procurement, support and expenses are ungated **by design**. They have no `Feature` row to seed.

## 5. Quick reference for callers

| You see | It means | What to do |
|---|---|---|
| `403` + «هذه الميزة غير متاحة في باقتك الحالية» or a module sentence | the code is off for this store | hide the entry. Do not retry. The merchant must ask the platform for the feature |
| `403` + `code: "feature_disabled"` | POS only | same, and use `code` to tell it from a permission refusal |
| `features[]` lacks a code but the route still answers `200` | the route has no plan gate (section 4) or the code is one of section 3.8 | nothing to do |
| `403` owner sentence on a plan without the feature | the order is owner → feature (shipping, design, payments, settings writes) | show the owner message first. The feature may or may not be on |

See [`errors.md`](errors.md) for how the BFF turns these into toasts and redirects.
