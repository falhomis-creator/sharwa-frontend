# Legacy-only features and legacy HTML surfaces

> **Source**: DOC-527 · inventory A.13 "Legacy-only" · Domains 1–16 "Before" lines of `specs/002-sharwa-integration/integration-inventory.md`
> **Code**: `sharwa_saas/config/urls_tenant.py` · `sharwa_saas/config/urls_public.py` · `sharwa_saas/products/views/*.py` · `sharwa_saas/api/urls.py` · `sharwa_saas/products/services/`
> **Last verified against code**: 2026-10-29 (step 50)

## 1. Purpose

Before the Next.js dashboard and storefront existed, Django rendered every screen itself. The integration phase (INT-001 → INT-049) added a JSON API under `/api/v1/` for each screen **without removing the HTML pages**. This register answers two questions for a maintainer:

1. **Which behaviours exist only in the legacy HTML pages** and have no API route (so Next.js cannot offer them) — §3.
2. **Which HTML surface sits next to which API surface**, domain by domain, so a page can be retired only when its successor is known — §4 to §6.

It also states the rule that holds the two surfaces together (§7) and recommends a deprecation policy (§9). Open product decisions stay in [`90-open-items.md`](90-open-items.md); wording that disagrees between the roadmap and the code is flagged inline with a `⚠️ Discrepancy` call-out and indexed in §8.

## 2. How the counts were made

- **Legacy routes** are the `path(...)` entries of `config/urls_tenant.py` (357 entries). Five are not HTML pages — `sharwa-secure-gate/` (tenant Django admin), `api/v1/`, `api/schema/`, `api/docs/`, `api/redoc/` — which leaves **352 legacy page routes**, grouped by URL prefix in §4. A route that several views share is counted once per `path(...)`.
- **Public-schema routes** (registration, platform pages, Sharwa Pay pages, webhooks) are the 101-line `config/urls_public.py`, listed in §5.
- **API successors** are cited as line ranges of `api/urls.py` (502 `path(...)` entries match the pattern `path('…', views_x.View…)`; the router include is counted separately).
- Domain numbers follow the 16-domain split of the inventory (Part B).

## 3. Legacy-only features register (outside the API contracts)

These behaviours work in the HTML pages today and have **no** API route. A merchant using only the Next.js dashboard cannot reach them.

| ID | Feature | Legacy implementation | Why there is no API successor | Domain · task |
|---|---|---|---|---|
| LF-01 | Dropshipping **order address correction** (edit the shipping address of a supplier order, validated by the adapter) | `products/views/dropshipping_orders.py:136` `dropshipping_order_address` (uses `ADDRESS_FIELDS` from `services/suppliers/address_service`, imported at `:22`); route `dashboard/dropshipping/<supplier_code>/orders/<so_id>/address/` | the M29 contract has only a *resubmit* route: `SupplierOrderResubmitView` (`api/views_dropshipping.py:243`) | 13 · INT-039 |
| LF-02 | Dropshipping **poll now** (refresh a supplier order's status on demand) | `dropshipping_orders.py:94` `dropshipping_order_action`, branch `action == 'refresh'` (`:112`) → `enqueue_supplier_order_poll` | no on-demand poll route in `api/urls.py:604-630`; the status is refreshed only by the periodic task | 13 · INT-039 |
| LF-03 | Dropshipping **cancel at supplier** (local cancel that releases the stock hold, or a cancel request sent to the supplier) | `dropshipping_orders.py` `action == 'cancel'` (`:119`) → `forward.mark_cancelled_locally`, else `enqueue_supplier_order_cancel` | not in the M29 contract; the API only resubmits | 13 · INT-039 |
| LF-04 | **Cost-rise alerts and manual price unlock** on the supplier-product list («منتجاتي») | `products/views/dropshipping_catalog.py:345` (the `manual_price` filter: `price_locked=True` or a product price that differs from `computed_price`), `:367` (`is_price_locked`), `:503` (`unlocked_count`) | the import service locks a price (`price_locked`, asserted in `api/test_dropshipping_api.py:271`) but no API route unlocks it | 13 · INT-039 |
| LF-05 | **Feed options**: delimiter, encoding, price unit, currency mode / fixed currency, header flag | `products/views/dropshipping_feeds.py:153-172` (saves `price_unit`, `delimiter`, `encoding`, `has_header`), `:196` (choices lists `DELIMITER_CHOICES`, `ENCODING_CHOICES`) | `services/suppliers/api_service.py` translates only the 20 M29 field keys and the job names; none of these options appears in it or in `api/views_dropshipping.py`; the engine (`feed_engine.py:162`, `:219`, `:407`, `:457`) reads them from the stored `FeedMapping` | 13 · INT-039 |
| LF-06 | **Per-product pricing rules** (`scope = 'product'`) assigned by hand from the old product screen | model choice «منتجات محددة فقط (تُسنَد يدوياً)» (`products/models/suppliers_dropship.py:193`) | `services/suppliers/api_service.py:9` states that these rules "do not appear in the contract" and `:406` excludes them (`PricingRule.objects.exclude(scope='product')`); the UI priority «الأصغر أولاً» is mapped as `1000 − PricingRule.priority` (`api_service.py:6-8`) | 13 · INT-039 |
| LF-07 | **Live stock check at checkout** for stale supplier products (3-second network check, never raises) | `checkout_service.preflight_supplier_stock` (`products/services/checkout_service.py:314`), called by the legacy view at `products/views/cart_checkout.py:664` | ⚠️ see the discrepancy below — the API checkout reaches the same function | 13 · INT-039 |
| LF-08 | **WhatsApp QR-pairing proxy** (start and poll a QR pairing session) | `products/views/apps.py:360` `whatsapp_qr_start`, `:413` `whatsapp_qr_poll`; routes `dashboard/apps/whatsapp/qr/start/` and `…/qr/poll/` (`config/urls_tenant.py:483-484`) | superseded by the SharwaConnect panel; the API exposes `apps/whatsapp/connect-url/` instead (`api/urls.py:638`) | 14 · INT-040 |
| LF-09 | **Monthly sent counter** on the old WhatsApp dashboard | `products/views/apps.py:45` `_monthly_sent_count` (counts `AppUsageLog` rows with `status='sent'` since the first of the month at request time; no stored counter), rendered as `monthly_sent_count` at `:192` | the API offers `apps/whatsapp/usage/` and `apps/whatsapp/summary/` (`api/urls.py:634-635`); `monthly_sent_count` appears in neither `api/views_apps.py` nor `apps_api_service.py` | 14 · INT-040 |

> ⚠️ Discrepancy — roadmap says "live stock check at checkout" is a legacy-only feature outside the contracts / code does: the check lives in the **shared** checkout core, not in the legacy view. `checkout_service.preflight_supplier_stock` (`checkout_service.py:314`) is called by the legacy page (`cart_checkout.py:664`) **and** by the JSON checkout service `storefront_checkout_service.py:738`, whose docstring (`:1-10`) lists `preflight_supplier_stock` in the chain it shares with the legacy page. The feature is therefore reachable from Next.js; what is "outside the contract" is only that no M29 route exposes or configures it. Treat LF-07 as **shared behaviour, not a parity gap**. (The module that wires `storefront_checkout_service` into a route is not among the files audited for this step.)

**Accepted-loss candidates.** LF-01 → LF-03 and LF-04 are operational tools a dropshipper needs when a supplier rejects an order or raises a cost; they are the strongest reasons to keep the dropshipping HTML pages until an API route exists. LF-05, LF-06, LF-08 and LF-09 have a working replacement or are rarely used and are candidates for an explicit "accepted loss" decision in [`90-open-items.md`](90-open-items.md).

## 4. Tenant-schema HTML surfaces and their API successors, by domain

Each row lists the legacy surface (URL prefix, view module, number of `path(...)` entries) and the API surface that replaces it. **Relationship**: *parallel* = both work and call the same service layer where §7 says so; *browser-only* = the page is the product (no API by design).

| # | Domain | Legacy HTML surface (routes) | API successor (`api/urls.py`) | Relationship |
|---|---|---|---|---|
| 1 | Public site, onboarding | public-schema only — see §5 | `public/*` `:231-236` | parallel |
| 2 | Dashboard shell, auth, overview, multi-store | 7 routes: `dashboard/` (`dashboard_home`), `dashboard/login/`, `logout/`, `forgot-password/`, `reset-password/`, `setup-password/`, and `merchant/master-dashboard/` (`merchant_master_dashboard`) | `auth/*` `:216-223`, `dashboard/*` `:226-228`, `merchant/stores` rollup `:215`, search `:177`, notifications `:180-183` | parallel; the master dashboard is superseded by the rollup (INT-003 / INT-049) |
| 3 | Core catalog and advanced products | 40 routes: `dashboard/products/`, `product/add\|edit\|delete`, `product-templates/*`, `variants/*`, `category/add/`, tier-price / related / bundle / rule sub-forms, CSV `export-csv` / `import-csv` / `bulk-upload` (`products/views/product_hub.py`, `product_templates.py`, `global_variants.py`, `csv_io.py`) | catalog `:252-266`, products `:270-284`, extras `:286-299`, variants and templates `:300-307` | parallel; the CSV import is one-step in HTML and staged (`products/import/<token>/…`) in the API |
| 4 | Order management and returns | 16 routes: `dashboard/orders/`, `orders/new/`, `order-status/<id>/<status>/`, `fulfillment-status`, `confirm-payment`, `adjudicate/approve\|reject`, `orders/refunds/`, `returns/`, `refund`, `gift-notice`, `details/` (`order_detail_api`, a JSON helper), `order-statuses/*` | orders `:157-171`, order statuses `:172-174`, returns `:146-154`, `:209-211` | parallel |
| 5 | Storefront, purchase journey, PWA | 30 routes: `''` (`product_list`), `product/<id>/*`, `wishlist/`, `about-us/`, `orders/track/<uuid>/` (`order_status_public_view`), `theme.css`, `manifest.webmanifest`, `sw.js`, `cart/*` (7), `checkout/*` (incl. gift and COD-OTP), `wallet/*`, `loyalty/*`, `set-currency/` (`products/views/storefront.py`, `cart_checkout.py`, `customer_engagement.py`, `pwa.py`, `theming.py`) | config `:58`, catalog `:61-82`, cart `:85-90`, checkout `:93-101`, tracking `:104`, PWA / push `:107-113` | parallel; the Next.js storefront is the buyer-facing product, the HTML storefront remains the server-rendered fallback |
| 6 | Customers, wallets, loyalty | 7 routes: `dashboard/customers/report/` (`customer_report_view`), `…/autocomplete/`, `dashboard/wallets/*` (4), `dashboard/loyalty/` | customers `:116-143`, wallets and loyalty `:122-133`, `:335` | parallel |
| 7 | Marketing, storefront design, partners | 35 routes: `marketing/`, `marketing-bar/`, `abandoned-carts/*`, `tracking-tools/`, `influencers/*`, `affiliates/*`, `promotions/*`, `campaigns/*`, `timeline/*`, `offers/`, `coupon/*`, `design/*` (design forms for sections, theme, content) | promotions and campaigns `:318-334`, design `:310-315`, partners `:537-547`, domains and tracking `:421-425` | parallel; `admin/sections` moved from `IsAdminUser` to the merchant session in INT-018 (comment at `api/urls.py:54`) |
| 8 | Finance: payments, merchant wallet, expenses | 11 routes: `payment-gateways/*`, `local-wallets/`, `bank-transfers/*`, `payout/*`, `merchant-wallet/*`, `operating-expenses/` (`operating_expenses_view`) | payments `:338-348`, expenses `:658-659`, Sharwa Pay `:463-470` | parallel |
| 9 | B2B wholesale | **no HTML surface** — the draft routes were API-first | `orders/b2b-draft*` `:161`, `:283-284` | API only |
| 10 | Inventory, locations, procurement | 29 routes: `inventory/*` (3, `inventory_hub_view`), `locations/*` (17), `suppliers/*` (2), `purchase-orders/*` (7) | inventory `:436-444`, locations `:447-460`, procurement `:550-556` | parallel; locations and inventory do **not** share the service layer (§7) |
| 11 | Shipping, couriers, Sharwa Ship | 39 routes: `shipping-settings/`, `shipping-companies/*`, `shipping-providers/*`, `pickup-locations/*`, `carrier-settings/*`, `packaging-profile*`, `zone-review/`, `sharwa-ship/*`, `shipping-agent/*`, `courier-supervisor/*`, `reverse-logistics/*`, `edge-cases/`, and four order sub-actions (`assign-shipping`, `waybill`, `update-address-in-transit`, `convert-to-pickup`) | shipping `:352-388`, Sharwa Ship `:367-378`, courier agent `:191-206`, order shipping `:389` | parallel |
| 12 | Store settings, staff, integrations | 22 routes: `settings/`, `contact-info/`, `store-policies/`, `currency-settings/`, `seo/`, `gifting/`, `staff/*` (login, roles, sessions), `approvals/*`, `audit-log/*`, `behavior-alerts/*`, `organization/` | settings `:186-188`, staff `:393-418`, integrations and webhooks `:421-433` | parallel |
| 13 | Channels, marketplaces, dropshipping, POS, bookings | 83 routes: `social-channels/*` (13), `marketplaces/*` (20), `dropshipping/*` (32), `conversations/*` and `channels/*` (9), `bookings/*` (3), `shifts/*` (6, POS cash drawer) | inbox `:565-570`, channels `:571-585`, marketplaces `:588-601`, dropshipping `:604-630`, POS `:521-534`, bookings `:559-562` | parallel, with the LF-01 → LF-06 gaps in §3 |
| 14 | Apps, AI, support | 24 routes: `apps/` (`app_marketplace_view`), `apps/whatsapp/*` (9), `apps/sharwa-ai/*` (7), `support-sessions/*` (6), `support-tickets/` | apps `:633-644`, `:660-664`, Sharwa AI `:640-643`, support `:646-656` | parallel, with LF-08 and LF-09 |
| 15 | Reports and analytics | 9 routes under `dashboard/reports/*` (index, exports create/status/download, scheduled, refresh-today, send-test-push, `<report_code>`) | reports `:240-248` | parallel; the HTML index (`merchant_reports_view`) and the API both read `reports_aggregation` |
| 16 | Platform owner console | public-schema only — see §5 | `platform/*` `:473-518` | parallel |

Row totals: 7 + 40 + 16 + 30 + 7 + 35 + 11 + 29 + 39 + 22 + 83 + 24 + 9 = **352**, the legacy page routes counted in §2 (domains 1, 9 and 16 contribute none to the tenant schema).

## 5. Public-schema surfaces (`config/urls_public.py`)

| Surface | Routes | Domain | API successor | Note |
|---|---|---|---|---|
| Promotional home and registration | `''` (`home_view`), `register/`, `register/check-subdomain/`, `register/verify-otp/`, `register/status/<token>/` (`urls_public.py:35-40`) | 1 | `public/*` (`api/urls.py:231-236`) | parallel; the registration form is the same provisioning flow |
| Platform master dashboard and dues | `master-dashboard/` (`platform_master_dashboard`), `master-dashboard/dues/` (`platform_dues_dashboard`) (`:41-44`) | 16 | `platform/overview/` and `platform/dues/*` (`api/urls.py:476`, `:495-497`) | superseded by the console API (INT-030 / INT-031) |
| Sharwa Pay wallet pages | `sharwa-pay/`, `otp/send/`, `topup/`, `withdraw/`, `logout/`, plus `manifest.json` and `sw.js` (`:48-56`) | 8 | `sharwa-pay/*` (`api/urls.py:463-470`) | parallel; the PWA manifest and service worker are served by the page and have no API counterpart |
| Django admin (platform) | `sharwa-secure-gate/` (`:34`) | 16 | `platform/*` | kept; see §6 |
| Inbound webhooks | `webhooks/kuraimi/topup/`, `webhooks/sharwaconnect/`, `webhooks/sharwa-ai/session-status/`, `…/inbound-message/`, `webhooks/meta/`, `webhooks/tiktok-shop/`, `webhooks/telegram/<bot_id>/`, `webhooks/suppliers/<supplier_code>/<bridge_token>/` (`:61-73`) | 8, 13, 14 | none needed | **not legacy** — external systems call them; they must survive any HTML retirement |
| Service endpoints | `sharwa-ai/commerce/changes`, `order_lookup`, `stock_observation`, `.well-known/sharwa-ai-jwks.json` (`:92-96`) | 14 | none needed | **not legacy** — machine-to-machine |
| Test aid | `internal/kuraimi-simulator/` (`:74`) | 8 | none | internal simulator, not a product surface |

The same `path(...)` file also mounts `api/v1/` (`:84`) and the OpenAPI schema, Swagger and ReDoc routes (`:85-87`).

## 6. Django admin actions (both schemas)

The Django admin remains a third operating surface. It exposes **17** `@admin.action` methods, all of which move money, change a store's provisioning or alter the catalogue in bulk:

| Admin module | Actions | API successor |
|---|---|---|
| `tenants/admin.py` (4) | `reprovision_tenants`, `activate_sharwa_ship`, `deactivate_sharwa_ship`, `manage_tenant_features` | `platform/stores/reprovision/`, `platform/stores/<schema>/sharwa-ship/`, `platform/stores/<schema>/features/` (`api/urls.py:479-482`) |
| `sharwapay/admin.py` (4) | `approve_topup`, `reject_topup`, `approve_withdrawal`, `reject_withdrawal` | `platform/sharwa-pay/topups/<pk>/<action>/`, `…/withdrawals/<pk>/<action>/` (`:498-501`) |
| `products/admin.py` (9) | `archive_products`, `unarchive_products`; `approve_withdrawal`, `reject_withdrawal` (merchant wallet); `collect_commissions`, `waive_commissions`; `generate_current_period_charge`; `collect_charges`, `waive_charges` | withdrawals and dues through `platform/dues/<schema>/actions/` (`:497`); product archiving through the products routes (`:270-284`) — the exact one-to-one mapping of the commission and charge actions is **not** verified in the audited files |

The tenant admin is mounted at `sharwa-secure-gate/` inside each store schema (`config/urls_tenant.py:227`) through `tenant_admin_site`.

## 7. The shared-service rule — what holds and what does not

The roadmap states that the HTML and API surfaces call the same services. The code supports this **where the INT task moved logic into a service**, and does not where the legacy view still holds the logic.

| Area | Legacy view | API side | Shared? |
|---|---|---|---|
| Checkout | `cart_checkout.py:34,506,621-664` → `checkout_service` | `storefront_checkout_service.py` (docstring: "on top of the same core") | **yes** |
| POS shifts | `staff_pos.py:106,192` (lazy `pos_service`) | `api/views_pos.py` → `pos_service` | **yes** |
| Dropshipping | `dropshipping_*.py` → `services.suppliers` (`order_forward_service`, `address_service`) | `api/views_dropshipping.py` → `suppliers` (`api_service`) | **yes**, with legacy-only helpers (LF-01 → LF-05) |
| Marketplaces | `marketplaces_*.py`, `marketplace_listings.py` → `marketplaces.*` | `api/views_marketplaces.py` → `marketplaces` | **yes** |
| Apps / Sharwa AI | `apps.py`, `sharwa_ai_hub.py` → `install_app`, `activate_app` (`app_marketplace_service`) | `apps_api_service.py:24`, `sharwa_ai_api_service.py:22` import the same module | **yes** |
| Procurement | `suppliers.py:26` → `purchase_order_service` | `procurement_service.py:28` | **yes** |
| Staff | `staff_sessions.py` → `staff_service`, `staff_rbac.py` / `staff_approvals.py` → `audit_service` | `api/views_staff.py` → `staff_service` | **yes** |
| Shipping billing and courier | `shipping_billing.py` → `shipping_billing_service`; `shipping_agent.py:11`, `courier_supervisor.py:10` → `get_courier_balance`, `start_shift`, `transfer_shift` | `sharwa_ship_api_service.py:272`, `:457` import the same | **yes** |
| Support sessions | `support_hub.py` → `support_lock_service`, `media_service` | `support_api_service.py:33`, `:234` | **yes** |
| Reports | `merchant_settings.py:1140` `merchant_reports_view` → `reports_aggregation` | `api/views_reports.py` → `reports_aggregation`, `reports_contract` | **yes** |
| Inventory | `inventory.py:43` → `record_stock_movement` only; the hub view (`:88`) queries the models itself | `inventory_service.py:37` imports `stock_movement` | **partly** — the stock-movement writer is shared, the hub logic is not |
| Locations | `locations.py` imports **no** service module | `location_service` | **no** |
| Operating expenses, customer report | `operations.py:17`, `customer_report.py:88` — models and forms directly | API view modules not among the audited files | **not verified** |

> ⚠️ Discrepancy — roadmap says "both surfaces call the same services" / code does: true for 11 of the 14 rows above, only partly true for inventory and **false for locations** (the HTML location screens carry their own rules, so a rule fixed in `location_service` does not reach `dashboard/locations/*`). Until the three exceptions are moved into services or their pages retired, every behaviour change to inventory or locations must be applied in two places.

## 8. Discrepancies indexed

| # | Roadmap / inventory says | Code does | Where |
|---|---|---|---|
| 1 | Live stock check at checkout is legacy-only (A.13) | shared by the legacy and the JSON checkout through `checkout_service.preflight_supplier_stock` | §3, LF-07 |
| 2 | Both surfaces call the same services | holds for most areas; inventory partly, locations not at all | §7 |
| 3 | The execution plan names the register `open-items.md` | the roadmap (and the files in this repository) use `90-open-items.md`, `91-legacy-surfaces.md`, `92-inconsistencies.md` | [`90-open-items.md`](90-open-items.md) |

## 9. Deprecation policy recommendation

This is a recommendation for the owner to decide; no code change is implied and none is scheduled.

1. **Freeze.** From now on, a new capability lands in a service and an API route first; the HTML page may call it but receives no feature that the API lacks. This stops the §3 register from growing.
2. **Parity gate per surface.** A legacy page may be retired only when (a) every row of §3 that belongs to it is either built in the API or recorded as an accepted loss in [`90-open-items.md`](90-open-items.md), and (b) the shared-service rule of §7 holds for it (locations and inventory first).
3. **Order of retirement** (lowest risk first): domain 2 master dashboard (already superseded), domain 16 platform pages, domain 15 report pages, domains 10 / 12 forms, then domains 3, 4, 6, 7, 8, and last domains 11 and 13 (the dropshipping gaps).
4. **Never retire** the inbound webhooks, the service endpoints, the PWA manifest and service worker, the OpenAPI routes, and the public order-tracking page until the Next.js tracking page covers every shipment state (the page predates shipments, per the INT-015 "Before" line).
5. **Mechanics.** Retire in two releases: first redirect the HTML route to the Next.js equivalent and log the hit, then delete the route and its view module together with its template and tests. Keep the Django admin actions of §6 until the console routes are confirmed to cover each one.
6. **Security note.** The legacy pages authenticate through the session flag `is_merchant_authenticated` (`products/views/apps.py:40`); the API uses its own gates. Retiring a page removes one more path that must be kept consistent with [`30-security.md`](30-security.md).

## 10. Related pages

- [`90-open-items.md`](90-open-items.md) — product decisions and "not built" items, including the accepted-loss decisions suggested in §3.
- [`92-inconsistencies.md`](92-inconsistencies.md) — repository inconsistencies and their fix tasks.
- [`23-ready-api-v1-audit.md`](23-ready-api-v1-audit.md) — the «Ready» passthrough audit.
- [`30-security.md`](30-security.md) — gates and session model.
- [`data-model/README.md`](data-model/README.md) — the data-model index (domains 9–16 pages 09 → 16).
