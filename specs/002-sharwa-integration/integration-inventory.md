---
description: "Structured system inventory of everything integrated in Phase 002 (INT-001 → INT-049) — the reference for API docs, user guides and 003-documentation-roadmap.md"
source: "specs/002-sharwa-integration/integration-tasks.md (all 49 tasks [x], 2026-10-24 → 2026-10-26)"
---

# Integration Inventory — Sharwa Phase 002 (جرد الدمج الهيكلي)

**What this file is**: the 49 completed integration tasks of `integration-tasks.md`, regrouped by system area instead of by build phase, with every technical detail carried over (routes, payloads, gates, rules, mappings, migrations, background jobs, bugs fixed, frontend changes, tests, open items). Nothing was summarised away: each task keeps its own full entry inside its domain, and the cross-cutting facts that were scattered across tasks are additionally collected in Part A.

**How to read it**:
- **Part A — Cross-cutting architecture**: the adapter patterns, the live/mock switch and every module key, identities and sessions, the gate order, plan features and permission keys, money rules, idempotency and optimistic locking, background jobs, migrations, environment/dependencies, infrastructure fixes, test suites, and the open items / known inconsistencies.
- **Part B — Domains 1–16**: per domain, an overview table (task · module · live switch · Django provider · routes), then one structured entry per task: *Before* (what existed), *Django provider*, *Routes & payloads*, *Gates*, *Rules*, *Mapping*, *Gaps closed / migrations*, *Bugs fixed*, *Frontend*, *Tests*, *Out of scope / open*.
- **Part C — Traceability matrix**: INT id → domain → module → live key, for all 49 tasks.

Conventions: paths are relative to each repo (`sharwa_saas` = Django, `sharwa-frontend` = Next.js). Django routes are under `/api/v1/` unless written otherwise; BFF routes are under `/api/bff/`. Arabic strings in «…» are the exact server/UI sentences.

## Table of contents

- Part A — Cross-cutting architecture
  - A.1 Integration protocol
  - A.2 Next.js ↔ Django adapter patterns
  - A.3 Live/mock switch — every module key
  - A.4 Identities, sessions and CSRF
  - A.5 Gate order, plan features, permission keys
  - A.6 Money, currencies and formatting
  - A.7 Idempotency and optimistic locking
  - A.8 Background jobs (Celery tasks and Beat schedules)
  - A.9 Migrations ledger
  - A.10 Environment, dependencies and management commands
  - A.11 Cross-cutting infrastructure fixes
  - A.12 Test suites
  - A.13 Open items, legacy-only features and known inconsistencies
- Part B — Domains
  1. Public site, onboarding & tenant resolution (الصفحة الترويجية والتسجيل وحلّ المستأجر) — INT-001, INT-002, INT-004
  2. Dashboard shell, auth, overview, search, notifications & multi-store (هيكل اللوحة والمصادقة) — INT-003, INT-008, INT-009, INT-049
  3. Core catalog & advanced products (الكتالوج الأساسي والمنتجات المتقدمة) — INT-005, INT-006, INT-045
  4. Order management & returns (إدارة الطلبات والمرتجعات) — INT-007, INT-026
  5. Storefront, purchase journey & PWA (واجهة المتجر ورحلة الشراء وتطبيق PWA) — INT-011 → INT-016, INT-029
  6. Customers, customer wallets & loyalty (العملاء ومحافظ العملاء والولاء) — INT-017, INT-028
  7. Marketing, storefront design & partners (التسويق والتصميم والمسوّقون) — INT-018, INT-019, INT-034
  8. Finance: payments, merchant wallet, expenses & Sharwa Pay (المالية والمحفظة) — INT-020, INT-043, INT-048
  9. B2B wholesale (البيع بالجملة B2B) — INT-044
  10. Inventory, locations & procurement (المخزون والمواقع والمشتريات) — INT-024, INT-025, INT-035
  11. Shipping, couriers & Sharwa Ship (الشحن والمندوبون وشروة شيب) — INT-021, INT-046, INT-047
  12. Store settings, staff & permissions, domains & integrations (الإعدادات والفريق والتكاملات) — INT-010, INT-022, INT-023
  13. Sales channels & operations: inbox, marketplaces, dropshipping, POS, bookings (القنوات ونقطة البيع والحجوزات) — INT-037, INT-038, INT-039, INT-033, INT-036
  14. Apps, AI & automation, support (التطبيقات والذكاء الاصطناعي والدعم) — INT-040, INT-041, INT-042
  15. Reports & analytics (التقارير) — INT-027
  16. Platform owner console (لوحة مالك المنصة) — INT-030, INT-031, INT-032
- Part C — Traceability matrix

---
# Part A — Cross-cutting architecture

## A.1 Integration protocol

Every task followed the 4-step mock-adapter pipeline of the project instructions:

1. **Diagnose** — the frontend Data Contract (Zod schemas in `src/features/<module>/schemas.ts` + the fixture in `src/mocks/<module>`) is the immutable source of truth.
2. **BFF adapter** — `liveOrMock(request, "<module>", "/api/v1/…", mock)` with the module toggled in `SHARWA_LIVE_MODULES` (or a Django-first adapter for rows that were already served by Django — A.2).
3. **Django provider** — services → DRF views (+ serializers where used) → `api/urls.py` → migrations → tests. Field names are mapped server-side so the JSON matches the contract exactly.
4. **Wiring & QA** — `npm run lint`, `npx tsc --noEmit`, the module's mock E2E script (`scripts/<module>-check.ts`), the Django test suites, and a live run with the module switched on. A task was ticked only after its Step 4 passed.

Out of scope of Phase 002 (no module ids): Phase 1 (Setup), Phase 2 (Foundational: BFF core, `upstream.ts`, `api-client`, mock runtime — already in place), Phase 8 (Polish).

Live status when the roadmap was created (2026-10-24): `SHARWA_LIVE_MODULES=reports,catalog,products`; M05 live-tested and committed; M04 Steps 1–3 committed; merchant auth endpoints (M03) built.

## A.2 Next.js ↔ Django adapter patterns

| Pattern | Where it lives | Behaviour | Used by |
|---|---|---|---|
| **`liveOrMock` switch** | `src/lib/bff/live-route.ts` (`liveOrMock`, `forwardLive`) | Mock mode → the fixture handler unchanged (`x-sharwa-mock: 1`). Live mode (`SHARWA_MOCKS=off`, or the module named in `SHARWA_LIVE_MODULES`, `*` = all) → transparent passthrough to `upstreamPath` on Django: query string, cookies, CSRF header, status and body forwarded verbatim; Django answers 401/403 itself (no Next-side session gate runs). Write bodies are **buffered** (Content-Length; 8 MB max = `DATA_UPLOAD_MAX_MEMORY_SIZE`). A successful live write on a store host drops that store's cached storefront reads (`revalidateTag(storeTag(store))`), like `mockRoute` in mock mode. | All dashboard/console modules (A.3) |
| **Products rule tables** | `src/lib/bff/live-products.ts` (`PRODUCTS_LIVE_RULES`, `B2B_LIVE_RULES`, `ADVANCED_LIVE_RULES`), called first by `mockRoute` through `dispatchLiveProducts` | Maps each products BFF row one-to-one onto its Django route, each table on its own switch (`products`, `b2b`, `advanced_products`), independent of each other. | INT-005, INT-044, INT-045 |
| **Platform catch-all grouping** | `app/api/bff/platform/[...path]` | One catch-all route, live per row group: `platform` (M20), `platform_money` (`dues`, `sharwa-pay`, `sharwa-ship`), `platform_billing` (M46 rows). | INT-030 → INT-032 |
| **Django-first server fetchers** | `getPublicJson`, `getProduct()`, `getTracking()`, `probeStore()`, server fetchers of the landing page | Django answers win as soon as they exist; the fixture only on 404/405/501 or Django down. No switch. | INT-001, INT-002, INT-011, INT-012, INT-015 |
| **`storefrontAdapter`** | storefront BFF rows | Django-first BFF adapter for storefront rows (same fallback rule). No switch. | INT-011 → INT-015, INT-028 (5 storefront rows), INT-029, INT-034 (referral), INT-036 (buyer rows), INT-045 (storefront auction + bids) |
| **`tryTarget` / `tryStoreTarget` / legacy adapter** | onboarding and dashboard BFF rows | Django-first; fixture only when the route is missing or Django is down. | INT-003 (counters/overview/refresh), INT-004 (onboarding) |
| **`/api/v1/*` transparent passthrough** | Next passthrough route | Rows marked «Ready» in `ready-api-v1.md` go straight to Django; fixture fallback on 404/unreachable. Writes only reach Django with a body since the `upstream.ts` buffering fix (A.11). | cart `/api/v1/cart*` (INT-013), PWA rows #11–#14 (INT-016), returns «Ready» rows (INT-026), B2B draft rows (INT-044), the five courier actions (INT-046) |

Mock runtime (`src/mocks/runtime.ts`): `isMocksOn()` (`SHARWA_MOCKS=on|off`, default on outside production), `isModuleLive(module)`, `notAvailable()` (501 «غير متاح بعد.» when mocks are off and no endpoint exists), every mocked response carries `x-sharwa-mock: 1`. Mock E2E scripts must run with `SHARWA_LIVE_MODULES=none` (in Windows cmd: `set SHARWA_LIVE_MODULES=none&& npm run dev` — `set X=` deletes the variable); `scripts/b2b-check.ts` has a `requireMocks()` preflight that checks the `x-sharwa-mock` header.

## A.3 Live/mock switch — every module key

| Key (`SHARWA_LIVE_MODULES`) | Task | Module | BFF rows switched |
|---|---|---|---|
| `reports` | INT-027 | M25 Reports | 9 rows → `api/views_reports.py` (first live module, pre-Phase 002) |
| `catalog` | INT-006 | M05 Catalog Organization | 15 rows → `api/views_catalog.py` |
| `products` | INT-005 | M04 Products (Phase A) | every Phase A row via `PRODUCTS_LIVE_RULES` |
| `orders` | INT-007 | M06 Orders | 11 rows (print reuses the detail row) |
| `search` | INT-008 | M48 Command Palette | `/api/bff/search` |
| `notifications` | INT-009 | M49 Notification Center | 4 rows |
| `settings` | INT-010 | M34 Store Settings | `settings` + 9 section rows (`settingsWrite(upstream, …)`) |
| `pwa` | INT-016 | M44 PWA | new `push/stats` + `push/test` rows (other PWA rows are passthrough) |
| `customers` | INT-017 | M07 Customers | 13 rows |
| `design` | INT-018 | M08 Theme Customizer | 6 rows (multipart forwarded as-is) |
| `marketing` | INT-019 | M13 Marketing | 18 rows |
| `payments` | INT-020 | M14 Payments & Merchant Wallet | 11 rows |
| `shipping` | INT-021 | M15 Shipping | 25 rows (incl. Sharwa Ship zones list) |
| `staff` | INT-022 | M18 Staff & Permissions | 25 rows + the new reset-password row |
| `integrations` | INT-023 | M19 Domains & Integrations | 13 rows |
| `inventory` | INT-024 | M21 Inventory | 8 handlers |
| `locations` | INT-025 | M22 Locations | 14 handlers |
| `returns` | INT-026 | M24 Returns & RMA | 4 rows |
| `wallets` | INT-028 | M35 Customer Wallets & Loyalty | 7 merchant rows (5 storefront rows are Django-first) |
| `platform` | INT-030 | M20 Console | the M20 row group of the catch-all |
| `platform_money` | INT-031 | M45 Dues & Sharwa Pay admin | `dues`, `sharwa-pay`, `sharwa-ship` rows |
| `platform_billing` | INT-032 | M46 Plans/Features/Subscriptions | the M46 rows |
| `pos` | INT-033 | M16 POS | `api/bff/pos/[...path]` (`__reset` stays fixture-only) |
| `affiliates` | INT-034 | M17 Affiliates & Influencers | both BFF catch-alls (`/api/v1/<kind>/<path>/`) |
| `procurement` | INT-035 | M23 Suppliers & POs | both BFF catch-alls (`/api/v1/<resource>/<path>/`) |
| `bookings` | INT-036 | M26 Bookings (merchant rows) | `api/bff/bookings/[...path]` |
| `channels` | INT-037 | M27 Inbox & Social Channels | `api/bff/inbox/[...path]` + `api/bff/channels/[[...path]]` (`inbox/_mock/*` fixture-only) |
| `marketplaces` | INT-038 | M28 Marketplaces | `api/bff/marketplaces/[[...path]]` |
| `dropshipping` | INT-039 | M29 Dropshipping | `api/bff/dropshipping/[[...path]]` |
| `apps` | INT-040 | M30 App Store | `api/bff/apps/[[...path]]` (except `sharwa-ai/*`) |
| `sharwa_ai` | INT-041 | M31 Sharwa AI | `api/bff/apps/sharwa-ai/*` |
| `support` | INT-042 | M32 Support | `api/bff/support/[...path]` |
| `expenses` | INT-043 | M33 Expenses | `api/bff/expenses/[[...path]]` |
| `b2b` | INT-044 | M36 B2B | `api/bff/b2b/options` + tier prices via `B2B_LIVE_RULES` (`_test/bump` stays fixture) |
| `advanced_products` | INT-045 | M37 Advanced Products | `ADVANCED_LIVE_RULES` (extras, import ×3, `export.csv`) |
| `courier` | INT-046 | M38 Courier App | `api/bff/agent/[...path]` (4 reads) |
| `sharwa_ship` | INT-047 | M39 Sharwa Ship | 7 `/api/bff/shipping/{sharwa-ship,shipments,awb-queue,rate-cards,supervisor,agents,agent-shifts}` routes |
| `sharwa_pay` | INT-048 | M40 Sharwa Pay | `/api/bff/sharwa-pay/*` (platform origin only) |
| `rollup` | INT-049 | M43 Multi-Store Rollup | `/api/bff/merchant/stores` |

**No switch (Django-first by construction)**: INT-001 landing, INT-002 tenant probe/status, INT-003 counters/overview/refresh + auth, INT-004 onboarding, INT-011 → INT-015 storefront, INT-016 PWA passthrough rows, INT-028/INT-029/INT-034/INT-036/INT-045 storefront rows, INT-044 B2B draft rows, INT-046 courier actions.

## A.4 Identities, sessions and CSRF

| Identity | How it is established | Used by |
|---|---|---|
| **Storefront visitor** | anonymous Django session on the store host (cart, `wishlist_phone`, holds, OTP keys) | Domain 5, storefront rows of 6/13/7 |
| **Store owner** | session `is_merchant_authenticated` + `auth_tenant_schema` pinned to the store (`TenantHeaderOverrideMiddleware` refuses switching a bound session to another store); `MerchantSessionAuthentication` enforces CSRF on every write | every dashboard module; owner-only areas listed per domain |
| **Staff member** | `auth/staff/login/` (phone + password, `StaffSession`, session pinned to the store, 15-min lockout, roster enforcement since INT-022); `request.staff` / `resolve_request_staff`; permissions from `permission_resolver` | every dashboard module with M18 keys |
| **Courier agent** | a staff session whose `shipping_provider_profile` is the agent (owner → 403 in the agent app) | INT-046 |
| **Platform console user** | Django admin session on the **public** schema: superuser = «مالك المنصة», `is_staff` = «مشرف تشغيلي»; `ConsoleSessionAuthentication` (401 with `WWW-Authenticate: Session`) | INT-030 → INT-032 |
| **Sharwa Pay customer** | WhatsApp OTP on the **platform origin**, Django session key `sharwa_pay_auth_phone` (shared with the legacy page), `cycle_key()` on login | INT-048 |
| **Multi-store owner** | the store-owner session + the `MerchantAccount` linked to the current store | INT-049 |

CSRF: Django `CSRF_COOKIE_HTTPONLY=True`; the browser never reads cookies — `GET /api/bff/auth/csrf` → Django `GET /api/v1/auth/csrf/` (`{csrfToken}` via `get_token`, Set-Cookie forwarded so the pair matches); `api-client.ts` sends `X-CSRFToken` on unsafe methods and refreshes the token once + retries on a CSRF 403. The `(admin)` layout bootstraps CSRF like the dashboard (INT-030); console login answers the rotated `csrf_token`. Sharwa Pay enforces CSRF on every write including the OTP login (INT-048).

## A.5 Gate order, plan features, permission keys

**Gate order** used across the API: session (401) → plan feature (403, e.g. `{detail, code: feature_disabled}` on POS) → M18 permission key (403) → owner-only (403) → resource state (404/409). The owner implicitly holds every permission key.

**Plan features** checked by the API (the legacy `require_feature` / `settings_feature_enabled` codes): `contact_info`, `store_policies`, `shipping_settings`, `currency_settings`, `seo_settings`, `coupon`, `multi_location` (INT-010, INT-025); `storefront_design` (INT-018); `abandoned_carts`, `campaigns`, `timeline`, `loyalty_settings`, `gift_settings` (INT-019, INT-028); `payment_gateways`, `local_wallets`, `bank_transfers`, `merchantwallet` (INT-020); `shipping_companies`, `pickuplocation`, `shipping_providers` (INT-021, INT-047); `staff_rbac` (INT-022); `tracking_tools` (INT-023); `inventory` (INT-024); `refunds` (INT-026); `customer_wallets` (INT-028); `pos` (new, INT-033 — `requires_plan=True`, open to all while subscriptions are off); `social_channels` (INT-037); `marketplaces` (INT-038); `dropshipping` (INT-039); `app_marketplace` (INT-040, INT-041); `bookings` (INT-036); `sharwa_ship` (INT-030, INT-047). No plan feature by design: dues and `store/payments` (INT-020), procurement (INT-035), support (INT-042), expenses (INT-043). Single decision source: `billing.models.resolve_feature_decision` → `(enabled, decided_by)` (INT-030).

**M18 permission keys** used by the API: `orders.view`, `orders.update_status`, `orders.process_returns`, `orders.refund`, `orders.create_b2b`, `orders.approve_b2b`, `customers.view`, `customers.edit_profile`, `catalog.manage`, `discounts.apply`, `discounts.manage`, `inventory.view`, `inventory.adjust`, `inventory.writeoff`, `reports.view`, `reports.sales.view`, `reports.export`, `staff.view`, `staff.manage`, `staff.manage_roles`, `staff.manage_assignments`, `staff.view_sessions`, `suppliers.manage`, `suppliers.approve`, `channels.inbox.access`, `channels.marketplaces.manage`, `channels.dropshipping.manage`, `support.takeover_session`, `expenses.manage` (new — INT-043, category «المالية», seeded to «مدير المتجر» + «مدير الفرع»). Role-based extras: `Role.max_discount_percent` (POS ceiling), approver roles on `ApprovalRequest`, «مدير الفرع|المتجر» for POS variance.

**Owner-only areas**: store settings money/structure sections, design (M08), carts/campaigns/timeline/loyalty/gifting (M13), payments & merchant wallet (M14), shipping settings (M15), locations structure (M22), domains & integrations (M19), affiliate/influencer writes (M17), channel settings (M27), app installs and template edits (M30), Sharwa AI writes/console token (M31), Sharwa Ship writes + supervision (M39), the multi-store rollup (M43), the push broadcast (M44).

## A.6 Money, currencies and formatting

- Every amount crosses the API as a server-formatted string (`display_*`) produced by `products.models.base.format_money`: SAR → «1,250 ر.س» for an integral value, «12.50 ر.س» otherwise; USD → «$1» / «$12.50»; YER_OLD / YER_NEW → rounded integer «… ر.ي». The browser never parses, sums or re-formats money (`displayMoney = z.string()`).
- Currencies: `SAR`, `USD`, `YER_OLD` («ريال يمني (صنعاء)»), `YER_NEW` («ريال يمني (عدن)»). Totals are given per currency and never summed across currencies (INT-020 dues «2.50 ر.س · $1», INT-033 POS store currency, INT-043 expenses month totals, INT-048 four Sharwa Pay rows).
- Conversion: storefront money via `_convert_value_to_target` in `?currency=` (INT-012); free-shipping threshold compared in the dashboard currency (`build_order_invoice`, INT-013); FX rates stored with 4 decimals (`0217`, INT-010); POS converts to the store currency (INT-033); dropshipping uses `StoreSetting.usd_to_sar` as the «daily» rate (INT-039); affiliate amounts stored in SAR, shown in the store currency (INT-034).

## A.7 Idempotency and optimistic locking

**Idempotency**: checkout `client_uuid` → unique `Order.idempotency_key` inside the reservation transaction (INT-014); merchant withdrawal `Idempotency-Key` (INT-020); customer wallet top-up `Idempotency-Key` header/body (INT-028, unique `WalletTransaction.idempotency_key`); POS `PosIdempotencyKey` inserted first in the write transaction (INT-033); inbox reply `client_id` unique or `Idempotency-Key` (INT-037); support reply `client_id` unique per session (INT-042); campaign send flips status under a row lock first (INT-019); webhooks per (order, kind) push throttle 6 h (INT-016).

**Optimistic locking / conflicts (409)**: orders `select_for_update` + `version` → `{detail, current_version, order}` (INT-007); theme `version` → `{detail, current_version}` (INT-018); convert-to-pickup order `version` → `{detail, current_version, status}` (INT-021); approvals `ApprovalRequest.resolve()` (INT-022); returns `{detail, current_version}` (INT-026); POS shift `version` (INT-033); purchase orders `version` «حُدِّث الأمر من مستخدم آخر.» (INT-035); support session `version` → `{detail, session}` (INT-042); Sharwa Ship detail `version` = accepted transitions + 1 (INT-047, no column). Row locks before every money decision: console dues/top-ups/withdrawals (INT-031), merchant withdrawal decisions (INT-020), auctions (INT-045), Sharwa Pay `SharwaPayWalletManager` (INT-048), import jobs (INT-045).

## A.8 Background jobs (Celery tasks and Beat schedules)

| Job | Kind | Task |
|---|---|---|
| `send_order_push` (on_commit, one per (order, kind) per 6 h) | task | INT-016 |
| `send_campaign` (chunks) / Beat `dispatch_scheduled_campaigns` every 5 min per tenant (new — scheduled campaigns were never sent) | task + Beat | INT-019 |
| `deliver_webhook` (3 attempts: now, +60 s, +300 s; auto-disable after 10 consecutive failures) / Beat `dispatch-low-stock-webhooks` every 15 min | task + Beat | INT-023 |
| `queue_provisioning` / `provision_tenant_schema` (re-provision = `pending` + queue), the provisioning sweeper thresholds (pending > 5 min / provisioning > 20 min) | task | INT-030 |
| `process_carrier_webhook_event` (run synchronously on console retry, same idempotency key `products.tasks.shipping.carrier_idempotency_key`) | task | INT-030 |
| POS force-close task (bumps `version`, raises `force_close_notice_seen`) | task | INT-033 |
| `dispatch_channel_message(message_id=…)` (updates the queued row), `sync_channel_catalog`, new `sync_channel_product`, channel health task (`connection_health`) | tasks | INT-037 |
| marketplace jobs: single/bulk push (Feeds above 20 on Amazon), `order_pull`, `fba_inventory`, `retry_failed_confirmation` | tasks | INT-038 |
| dropshipping self-chaining jobs (`catalog_pull`, `price_sync`, `inventory_sync`, `product_import`, `feed_import`), hourly catalog beat (now also periodic re-pricing), `fetch_scheduled_feeds_for_tenant` (honours `schedule_interval_min`, 5-min slack) | tasks + Beat | INT-039 |
| `dispatch_whatsapp_message`, `send_whatsapp_notification_async`, `order_events.notify_sharwaconnect_of_order_event` | tasks | INT-040 |
| `deliver_staff_reply` (new), `send_staff_reply_message` (shared delivery helper) | tasks | INT-042 |
| `retry_pending_awb_issuance_for_tenant` (queued on commit by AWB retry) | task | INT-047 |
| None: CSV product import runs in 200-row chunks on run/poll (no Celery) | — | INT-045 |

## A.9 Migrations ledger

| Migration | Task | Content |
|---|---|---|
| `products/0211`–`0215` | INT-005 | Products Phase A (Steps 1–3, 2026-10-22) |
| `products/0216_notifications` | INT-009 | `Notification`, `NotificationRead` |
| `products/0217_storesetting_fx_rate_precision` | INT-010 | FX rates 4 decimals |
| `products/0218_customer_crm` | INT-017 | `CustomerNote`; `CustomerReliabilityRecord.cod_status_reason/updated_at/updated_by`; `ProductReview.customer_phone` |
| `products/0219_theme_version_section_label` | INT-018 | `StoreSetting.theme_version` + `theme_updated_at`; `StoreSection.label` |
| `products/0220_marketing_api` | INT-019 | `MarketingCampaign.sent_at`; `PromotionalOffer.buy_condition_type` + `all`/`min_items` |
| `products/0221_merchant_wallet_api` | INT-020 | `MerchantWalletTransaction.kind` + `reference_kind/reference_id` (backfilled); `MerchantWithdrawalRequest.payout_account` + `idempotency_key` |
| `products/0222_shipping_api` | INT-021 | `Order.delivery_latitude/longitude` + `zone_review_resolved_at`; `RestrictedZonePolygon.reason`; `DeliverySLARule.delivery_method` (+ `source_location` optional) |
| `products/0223_staff_api` | INT-022 | `StaffSession.device_label`; `PersonalAccessToken.name/last_used_at`; `TrustedDevice.staff/last_seen_at`; `RosterSchedule.location` nullable; `BehaviorAlert.value/limit` |
| `tenants/0026_customdomain` | INT-023 | public `CustomDomain` |
| `products/0224_webhooks` | INT-023 | `WebhookEndpoint`, `WebhookDelivery` |
| `products/0225_inventory_api` | INT-024 | `StockMovement.actor/quantity_after/reference_type/reference_id`; `InventoryItem.location/order`; `ApprovalRequest.payload` + nullable `location` |
| `products/0226_locations_api` | INT-025 | `Location.external_refs`; `LockerDetails.provider_name/locker_code`; `VehicleDetails.driver_phone` |
| `products/0227_wallets_api` | INT-028 | `WalletTransaction.actor` + unique `idempotency_key`; `CustomerPointsTransaction.wallet_transaction` |
| `products/0228_engagement_api` | INT-029 | `StoreReview.rating` (nullable); `ProductReview.is_approved` |
| `tenants/0027_platform_console_api` | INT-030 | `TenantDeactivationRecord.reinstated_at/actor/updated_at`; `PendingWebhookEvent.resolved_at`; `PlatformActionLog` |
| `billing/0012_tenantfeatureoverride_updated_at` | INT-030 | `TenantFeatureOverride.updated_at` |
| `sharwapay/0003_console_review_fields` | INT-031 | `SharwaPayTopupRequest.bank_name/claimed_phone/reviewed_by`; `SharwaPayWithdrawalRequest.reviewed_by` (backfill) |
| `appstore/0007_app_icon_name` | INT-032 | `App.icon_name` |
| `products/0229_pos_api` | INT-033 | `Shift.opened_by`/`ShiftCashMovement.created_by` nullable, `Shift.version/approval/force_close_notice_seen`, `ShiftCashMovement.note`, `PosReceipt`, `PosIdempotencyKey`, `StoreSetting.pos_refund_otp_threshold/pos_manager_code_hash` |
| `billing/0013_seed_pos_feature` | INT-033 | `Feature(pos, requires_plan=True)` |
| `products/0230_procurement_api` | INT-035 | `Supplier.address/tax_number` (phone optional); `PurchaseOrder.notes/version/updated_at` |
| `products/0231_inbox_api` | INT-037 | `Conversation.source_platform`; `Message.status 'queued'/error_detail/client_id/product`; `ChannelCatalogSync.last_run_at`; `ChannelReplyTemplate` |
| `products/0232_dropshipping_api` | INT-039 | `SupplierConnection.catalog_sync_interval_min/price_sync_interval_min/last_price_sync_at`; `FeedMapping.schedule_interval_min` |
| `products/0233_app_store_api` | INT-040 | `AppUsageLog.order` |
| `products/0234_support_api` | INT-042 | `SupportSession.version`; `SupportMessage.sender_name/client_id`; `SupportTicket.description/updated_at/created_by/customer_phone` |
| `products/0235_seed_expenses_permission` | INT-043 | permission `expenses.manage` |
| `products/0236_advanced_products_api` | INT-045 | `OrderItem.personalization`; `ProductImportJob` |

No migration: INT-001 → INT-004, INT-006 → INT-008, INT-011 → INT-016 (none stated for 011–014; 015 and 016 explicit), INT-026, INT-027, INT-034, INT-036, INT-038, INT-041, INT-044, INT-046 → INT-049 (INT-048 changed `apply_credit_if_approved` logic only).

## A.10 Environment, dependencies and management commands

- `SHARWA_MOCKS`, `SHARWA_LIVE_MODULES` (Next.js — A.3).
- `dnspython`, `SHARWA_EDGE_IP`, `SHARWA_EDGE_CNAME` (custom domains, INT-023; TLS issuance is the ops step in `deploy/README`).
- `SHARWA_AI_MAX_CONSECUTIVE_BOT_REPLIES` (default 4), `SHARWA_AI_CONSOLE_URL` + SSO keys (503 when missing) (INT-041).
- `NOON_MARKETPLACE_ADAPTER` (fake noon adapter, INT-038).
- `manage.py set_pos_manager_code --schema=… <code>`; under DEBUG `2468` works as manager code while none is set and `123456` as refund OTP (INT-033).
- `normalize_media_filenames` management step + `sharwa.bat` UTF-8 console (INT-020).
- `DATA_UPLOAD_MAX_MEMORY_SIZE` = 8 MB bounds BFF buffering and multipart publishes (INT-005 decision; INT-018 note).

## A.11 Cross-cutting infrastructure fixes

- **Request body buffering** (`src/lib/bff/upstream.ts` + `forwardLive`): streamed bodies went out chunked with no Content-Length and Django read an EMPTY body (every `/api/v1/*` passthrough write answered 400 «required field», e.g. `POST /api/v1/pwa/install-event/`). Bodies are now buffered (`null` when empty or already used; `duplex: "half"` only for an explicit stream). Referenced by INT-044 and INT-046 ("their POSTs only reach Django with a body since the same-day `upstream.ts` buffering fix").
- **Local media on Windows** (INT-020): `DevMediaMiddleware` resolves double-encoded paths, NFC/NFD and case variants of Arabic names and logs misses ASCII-safe; `urls_public` serves `MEDIA_URL` under DEBUG; `tenant_upload_path` stores non-ASCII uploads under a uuid name.
- **Forwarded headers**: `x-export-rows` added to the BFF response headers (INT-017).
- **CSRF bootstrap** in the `(admin)` layout (INT-030); `getAdminSession()` reads Django `auth/me/` when live.
- **Savepoints** around every tenant-schema read from the console (a missing schema never poisons the request — INT-030), `UNION ALL` counts across store schemas with per-schema savepoint fallback (INT-031, INT-032).
- **Shared Arabic normalization** (`src/lib/i18n/normalize.ts` ↔ Python, PostgreSQL `lower(translate(…))`) used by search, catalog, inventory, locations, customers (INT-008 first).
- **Phone normalisation**: `clean_phone_number`; `customer_key` (+ `966` for 9-digit Saudi mobiles, Arabic digits) for CRM and staff (INT-017, INT-022); Sharwa Pay mirrors the frontend `normalizePhone` (INT-048).

## A.12 Test suites (Django)

`api/test_public_api.py` (001) · `test_tenant_guard_api.py` (002) · `test_dashboard_api.py` (003) · `test_onboarding_api.py` (004) · `test_products_api.py` (005) · `test_catalog_api.py`, `test_catalog_serializers.py` (006) · `test_orders_api.py` (007) · `test_search_api.py` (008) · `test_notifications_api.py` (009) · `test_settings_api.py` (010) · `test_storefront_catalog_api.py` (011) · `test_storefront_product_api.py` (012) · `test_storefront_cart_api.py` (013) · `test_storefront_checkout_api.py` (014) · `test_order_tracking_api.py` (015) · `test_pwa_push_api.py` (016; legacy `products/test_push_notifications.py`, `test_pwa_install_tracking.py` unchanged) · `test_customers_api.py` (017) · `test_design_api.py` (018) · `test_marketing_api.py` (019) · `test_payments_api.py` (020) · `test_shipping_api.py` (021, 9) · `test_staff_api.py` (022, 9; 101 incl. legacy suites) · `test_integrations_api.py` (023, 21) · `test_inventory_api.py` (024, 9) · `test_locations_api.py` (025, 8) · `test_returns_api.py` (026, 8) · `test_reports_api.py` + `ReportsLocationFilterTests` (027, 3) · `test_wallets_api.py` (028, 5) · `test_engagement_api.py` (029, 4) · `test_platform_console_api.py` (030, 14) · `test_platform_money_api.py` (031, 7) · `test_platform_billing_api.py` (032, 7) · `test_pos_api.py` (033, 17) · `test_partners_api.py` (034, 8) · `test_procurement_api.py` (035, 9) · `test_bookings_api.py` (036, 9) · `test_channels_api.py` (037, 10) · `test_marketplaces_api.py` (038, 9) · `test_dropshipping_api.py` (039, 11) · `test_apps_api.py` (040, 7) · `test_sharwa_ai_api.py` (041, 6) · `test_support_api.py` (042, 6) · `test_expenses_api.py` (043, 8) · `test_b2b_api.py` (044, 8) · `test_product_extras_api.py` (045, 10) · `test_courier_api.py` (046, 6) · `test_sharwa_ship_api.py` (047, 7) · `test_sharwa_pay_api.py` (048, 9) · `test_rollup_api.py` (049, 4).

Mock E2E scripts touched during integration: `scripts/admin-stores-check.ts`, `reports-check.ts`, `marketplaces-check.ts`, `dropshipping-check.ts`, `expenses-check.ts`, `b2b-check.ts`, `bundles-check.ts`, `sharwa-ship-check.ts`, `sharwa-pay-check.ts`, `rollup-check.ts` (plus the per-module scripts in `scripts/`).

## A.13 Open items, legacy-only features and known inconsistencies

**Not built / open (Django rule kept)**:
- IP allow-list addresses for `enforce_ip_whitelist` — no model; toggle and warning unchanged (INT-022).
- Meta catalog sync needs a Meta category mapping but no screen offers it (only TikTok); TikTok categories = static starter list (INT-037).
- `bundle_selection` in cart actions not wired; merchant order detail does not show a line's personalization (no M06 field) (INT-045).
- Haggling drafts (`NegotiationDraft`) — no screen, not wired (INT-044).
- Verifying the pickup code at the counter (M15/M22/POS) (INT-015).
- `CentralCustomerTrust` is a merchant signal only: `cod_allowed` always true unless the store disabled the phone (INT-014/INT-017).
- smsa carrier `test_connection` not wired yet (INT-021).

**Legacy-only (outside the contracts)**: dropshipping order address correction / poll now / cancel at supplier, cost-rise alerts + manual price unlock, feed delimiter/encoding/price-unit/currency-column options, live stock check at checkout (INT-039); WhatsApp QR-pairing proxy and monthly sent counter (INT-040); per-product pricing rules `scope='product'` (INT-039); the HTML pages kept alongside each API (e.g. `merchant/master-dashboard/`, `sharwa-pay/`).

**Known inconsistencies to fix in Phase 003 documentation**:
- The `.env.example` sample line of `SHARWA_LIVE_MODULES` does not list `inventory`, `locations`, `returns`, `wallets` although INT-024/025/026/028 switch those keys (A.3 is authoritative).
- The old `account/stores` BFF route has no consumer (superseded by `merchant/stores`, INT-003/INT-049).
- `ready-api-v1.md` rows #11/#13 were updated in INT-016; other «Ready» rows changed shape in INT-026/INT-044/INT-046 — the Ready list should be re-audited.

---
# Part B — Domains

## Domain 1 — Public site, onboarding & tenant resolution (الصفحة الترويجية والتسجيل وحلّ المستأجر)

| Task | Module | Live switch | Django provider | Routes |
|---|---|---|---|---|
| INT-001 | M01 Marketing Landing Page | none (Django-first) | `api/views_public.py` | `public/plans/`, `public/stats/` |
| INT-002 | M47 Tenant Resolution & Guard | none (direct probe) | middleware + legacy views | `config/`, `/register/status/<token>/`, `HEAD` passthrough |
| INT-004 | M02 Onboarding Wizard | none (Django-first) | `api/views_onboarding.py` + legacy | `market-categories`, `register`, `verify-otp`, `resend-otp`, `/register/check-subdomain/`, `/register/status/<token>/` |

**Domain relationship**: everything here is reachable without a merchant session and was already Django-first (server fetchers, `tryTarget`, legacy adapter); the fixture only answers when the route is missing or Django is down. Tenant resolution is enforced by Django middleware (`TenantHeaderOverrideMiddleware`, `TenantProvisioningGuardMiddleware`) and probed by Next (`probeStore()`).

### INT-001 — M01 Marketing Landing Page (public plans, public stats) — 2026-10-24
- **Django provider**: `api/views_public.py` — `public/plans/`, `public/stats/` (cached 1 h).
- **Frontend**: adapters already existed (server fetchers + BFF fallback); free-plan features fall back to `freePlanHighlights` when a live plan lists none.
- **Tests**: `api/test_public_api.py`.

### INT-002 — M47 Tenant Resolution & Guard (config probe, provisioning status) — 2026-10-24
- **Status**: Already Integrated.
- **Relationship**: `probeStore()` hits Django `/api/v1/config/` directly — 404/403/503 come from `TenantHeaderOverrideMiddleware` + `TenantProvisioningGuardMiddleware`; the BFF status route reads `/register/status/<token>/` (setup_token, forwarded host); the passthrough serves `HEAD`.
- **Tests added**: `api/test_tenant_guard_api.py` locks the probe contract.
- **Hand-over of the optional `/config/` extensions** (`[NEEDS BACKEND]` in `store-config.ts`) to their owners: INT-010 M34 (currency, SEO, contact, policies, timezone, week start, announcement styling/banner flags, free-shipping threshold), INT-019 M13 (gifting, loyalty), INT-023 M19 (tracking). All three were later served (see Domains 12 and 7).

### INT-004 — M02 Onboarding Wizard (market categories, register, OTP verify/resend, provisioning) — 2026-10-24
- **Status**: Already Integrated.
- **Django provider**: `api/views_onboarding.py` (market-categories, register, verify-otp, resend-otp) + legacy `/register/check-subdomain/` and `/register/status/<token>/` (INT-002).
- **Relationship**: every BFF row is Django-first (`tryTarget` / legacy adapter), fixture only when the route is missing or Django is down.
- **Contract**: matches field for field — statuses 400 `{field}` / `{code}`, 410, 429 + `Retry-After`, 502.
- **UX gap fixed** (`otp-form.tsx`): a resend answered 410 (pending registration past Django's 30 min) now returns to panel 01 with the draft kept instead of a dead end.
- **Tests**: `api/test_onboarding_api.py`.

---

## Domain 2 — Dashboard shell, auth, overview, search, notifications & multi-store (هيكل اللوحة والمصادقة والإشعارات)

| Task | Module | Live switch | Django provider | Routes |
|---|---|---|---|---|
| INT-003 | M03 Dashboard Shell, Auth & Overview | none (Django-first `tryStoreTarget`) | `api/views_auth.py`, `api/views_dashboard.py`, `products/services/dashboard_service.py` | auth (login/logout/me/csrf/setup-password, staff login, forgot/reset), `dashboard/overview/`, `overview/refresh/`, `dashboard/counters/` |
| INT-008 | M48 Command Palette | `search` | `products/services/search_service.py`, `api/views_search.py` | `search/` |
| INT-009 | M49 Notification Center | `notifications` | `products/models/notifications.py`, `products/services/notification_service.py`, `api/views_notifications.py` | `notifications/`, `summary/`, `read-all/`, `<id>/read/` |
| INT-049 | M43 Multi-Store Rollup | `rollup` | `tenants/merchant_rollup.py`, `api/views_rollup.py` | `merchant/stores/` |

**Domain relationship**: the merchant/staff session is the root of every dashboard call (A.4). Counters/overview are Django-first; search, notifications and the multi-store rollup are on their own switches. The topbar store switcher and ⌘K consume INT-049's `merchant/stores/` (`useLinkedStores`).

### INT-003 — M03 Dashboard Shell, Auth & Overview (session, login/logout, overview, counters, account stores) — 2026-10-24
- **Already live before the task**: merchant login, logout, me, csrf, setup-password.
- **Added in Django**:
  - `auth/staff/login/` — `StaffSession` + session pinned to the store + 15-min lockout; phone matched across 967…/0…/local forms (roster enforcement added later by INT-022).
  - `auth/merchant/forgot-password/` + `auth/merchant/reset-password/` — WhatsApp code to the store number, HMAC in cache, 3 sends / 10 min, lock after 3 wrong codes.
  - `dashboard/overview/` + `overview/refresh/` + `dashboard/counters/` (`products/services/dashboard_service.py`): today = `DailyStoreMetrics`; refresh shares the M25 5-min cooldown (same cache key as the reports refresh); low stock = `product_service.low_stock_count()`; staff blocks zeroed per permission; refresh needs `reports.sales.view` for staff.
- **Frontend**: counters/overview/refresh BFF routes are Django-first (`tryStoreTarget`), fixture only when the route is missing or Django is down; `/dashboard/me` only flags fixture sessions as mock.
- **Superseded**: `account/stores` was superseded by M43's `/merchant/stores/` (switcher + ⌘K use `useLinkedStores`) → integrated with INT-049; the old BFF route has no consumer.
- **Tests**: `api/test_dashboard_api.py`.

### INT-008 — M48 Command Palette (aggregated search) — 2026-10-24
- **Before**: Django had no search row.
- **Django provider**: `products/services/search_service.py` + `api/views_search.py` — `GET /api/v1/search/?q&types&limit` → `{orders, products, customers, pages: [], actions: []}` (shape = `searchResultSchema`).
- **Rules**: Arabic normalization FR-48.05 on both sides — the query in Python (same rules and code-point ranges as `src/lib/i18n/normalize.ts`), the columns in PostgreSQL via `lower(translate(…))`; no index, no migration; ≥ 2 chars, limit 5, max 10.
- **Gates / trimming (M48 §10, server-side)**: orders need `orders.view`; customers need `customers.view` (phone groups from orders, name from the latest order — no tenant customer model); products for every active member; archived products sort last.
- **Frontend**: BFF `/api/bff/search` → `liveOrMock(…, "search", …)`; pages/actions stay the palette's own index (`navigation.ts`).
- **Tests**: `api/test_search_api.py`.

### INT-009 — M49 Notification Center (summary, list, read, read-all) — 2026-10-24
- **Before**: Django had no notification model or API.
- **Model** (`products/models/notifications.py`, migration `0216_notifications`): `Notification` with `dedupe_key`, audience fields `permission` / `merchant_only` / `audience_role` / `audience_staff`, `resolved_at`; `NotificationRead` per reader `owner` | `staff:<id>`.
- **Django provider**: `products/services/notification_service.py`, `api/views_notifications.py` — `notifications/`, `summary/`, `read-all/`, `<id>/read/`.
- **Generation**: a throttled (20 s / store), idempotent sync from the M49 §5 sources — no legacy write path touched: `order_new` (status new, 72 h), `payment_review` (awaiting_payment | payment_review), `approval_pending` (approver role only), `behavior_alert` (unread warning/critical), `inbox_unread` (reopens on new messages), `low_stock`, `sync_failed` (marketplace + supplier jobs), `awb_failed`, `export_ready` (requester only), `billing_notice` (suspended / expiring ≤ 7 d), `provisioning_notice` (empty ready store).
- **Rules**: stateful kinds resolve when their source does (read for everyone, so the bell matches the sidebar — FR-49.11) and reopen if it comes back; reads are per reader (owner and each staff member independently); list = 30-day panel window (`history=1` for the full page), unread system notices pinned.
- **Frontend**: all 4 BFF rows → `liveOrMock(…, "notifications", …)`; mock links fixed to real routes (`/dashboard/staff/alerts`, `/channels/marketplaces/jobs`, `/reports/exports`).
- **Tests**: `api/test_notifications_api.py`.

### INT-049 — M43 Multi-Store Rollup — 2026-10-26
- **Before**: the one §7 row (`GET merchant/stores/?from&to`, feeding both «متاجري» and the topbar switcher `useLinkedStores`) was `[NEEDS BACKEND]`; Django had the domain in public schema (`MerchantAccount` + `MerchantAccountClient`, daily `TenantStatsSnapshot` with orders/completed/refunded/revenue_sar) behind the HTML `merchant/master-dashboard/` only — all-time sums, no range, no per-store completed/refunded, no last snapshot, no availability, one aggregate query per store.
- **Django provider**: `tenants/merchant_rollup.py` + `api/views_rollup.py` (`merchant/stores/`).
- **Payload**: `{has_account, current_schema, from, to, stores: [{name, schema, domain, orders, completed, refunded, display_revenue_sar, last_snapshot_date, is_available}], totals: {orders, completed, refunded, display_revenue_sar}}`.
- **Gates**: owner only — staff 403 «هذه الصفحة لمالك المتجر فقط.», no owner session bound to this store 401.
- **Account rule**: the account is the `MerchantAccount` LINKED to the current store (preferring the one whose `owner_phone` matches `merchant_phone`, raw or cleaned) — the HTML page matched the phone only, so a store sharing the phone but never linked could list an account's stores; not linked ⇒ `has_account:false` + zero totals (mock US-43.3).
- **Range**: `from`/`to` ISO dates; invalid ⇒ default (last 30 days ending today, store timezone); reversed ⇒ swapped; the applied range is echoed back.
- **Per store**: in-range sums; `last_snapshot_date` = latest snapshot overall (not range-bound, as the mock); `domain` = primary domain (any domain as fallback) or `#`; `is_available` = `is_active` AND `provisioning_status=ready` (numbers stay visible for an unavailable store). Rows sorted by revenue desc then name; totals and every `display_revenue_sar` formatted server-side (FR-43.03).
- **Performance**: fixed query count (one grouped sum + one grouped max), whatever the number of stores; no live cross-schema query. No migration; the HTML page is untouched.
- **Frontend**: `/api/bff/merchant/stores` → `liveOrMock(…, "rollup", "/api/v1/merchant/stores/")`, mock kept behind its owner gate; hooks, schemas and the screen unchanged; `.env.example` adds `rollup`. The legacy `account/stores` BFF route (superseded, see INT-003) has no consumer.
- **Tests**: `api/test_rollup_api.py` (4).

---
## Domain 3 — Core catalog & advanced products (الكتالوج الأساسي والمنتجات المتقدمة)

| Task | Module | Live switch | Django provider | Routes |
|---|---|---|---|---|
| INT-005 | M04 Products (Phase A) | `products` (`PRODUCTS_LIVE_RULES`) | `api/views_products.py`, `api/serializers_products.py`, product/variant/template services | every Phase A row |
| INT-006 | M05 Catalog Organization | `catalog` | `api/views_catalog.py` | categories + reorder, brands, tags + merge, collections + products add/reorder/remove, badges (15 BFF routes) |
| INT-045 | M37 Advanced Products + Products Phase B | `advanced_products` (`ADVANCED_LIVE_RULES`) | `products/services/product_extras_service.py`, `api/views_product_extras.py`, `products/services/product_import_service.py`, `products/services/storefront_auction_service.py` | extras, import, export, storefront auction/bids |

**Domain relationship**: three independent switches over one product model — `products` (core editor), `b2b` (tier prices, Domain 9) and `advanced_products` (extras + CSV) — all dispatched by `src/lib/bff/live-products.ts` before any mock gate. Storefront auction rows are Django-first (no switch). Storefront product reads are Domain 5.

### INT-005 — M04 Products (list, editor, variants, dictionary, templates, sectors, images, stock, bulk) — 2026-10-24
- **Phase A integrated** (Django Steps 1–3, 2026-10-22): `api/views_products.py`, `serializers_products.py`, product/variant/template services, migrations `0211`–`0215`.
- **Adapter**: `src/lib/bff/live-products.ts` maps every Phase A BFF row to its Django route one-to-one (toggle `products` in `SHARWA_LIVE_MODULES`); «تطبيق على منتجات» stays BFF-orchestrated (decision D7).
- **Mock aligned to Django**: variant-sum stock mirror, `<sku>-<n>` variant SKUs.
- **Live-QA gap fixed** (`product-editor.tsx`): a saved product sends `stock` only when edited — echoing the loaded value reset backorders to 0 and was refused for variant/serial/location products.
- **Decision**: BFF write bodies bounded by `DATA_UPLOAD_MAX_MEMORY_SIZE` (8 MB).
- **Out of scope**: Phase B (CSV import/export, `extras/**`) is M37 scope → INT-045.
- **Tests**: `api/test_products_api.py`.

### INT-006 — M05 Catalog Organization (categories, brands, tags, collections, badges) — 2026-10-24
- **Status**: Already Integrated (live-tested and committed 2026-10-22). No changes.
- **Relationship**: all 15 BFF routes use `liveOrMock(…, "catalog", …)` and map one-to-one onto Django `api/views_catalog.py` — categories + reorder, brands, tags + merge, collections + products add/reorder/remove, badges.
- **Tests**: `api/test_catalog_api.py`, `api/test_catalog_serializers.py`.

### INT-045 — M37 Advanced Products (bundles, compatibility, personalization, auctions/bids, serials, formula preview, CSV import/export) — 2026-10-26
- **Before**: every M37 §7 editor row and the products Phase B (CSV import/export) were `[NEEDS BACKEND]`; Django had the models (`BundleComponent`, `CompatibilityRule`, `PersonalizationField`, `Auction`, `AuctionBid`, `InventoryItem`) behind the HTML `ProductForm` only, a one-step HTML CSV import, and the storefront auction + bids answered 404 (fixture). Formula preview was already live (`products`).
- **Django provider**: `products/services/product_extras_service.py` + `api/views_product_extras.py`.
- **Editor routes** (reads `inventory.view`, writes `catalog.manage`; every write answers the resource's new state and logs the mock's change-log field under the actor):
  - `products/<id>/bundle-components/[<cid>/]` — GET/POST · PATCH/DELETE; `display_bundle_total` = mandatory components converted to the bundle's currency + build fee.
  - `compatibility-rules/[<rid>/]` — operators equals · not_equals · in; a 2nd attribute OR a value.
  - `personalization-fields/[reorder/|<fid>/]` — 9 types; select/multi_select need options; delete renumbers.
  - `auction/` GET (a draft row is created on first read like the mock; an active auction past `end_at` is closed on read) / PUT (all the mock's rules; stock forced to 1 by `Product.save`).
  - `auction/bids/` (newest first).
  - `serials/` GET/POST `{codes}` — duplicates inside the paste and against existing codes → 400 `{codes, duplicates}`; stock = available units, with a stock movement.
- **CSV import/export**:
  - `products/import/` multipart → 201 `{job_id, columns, preview (20), total_rows, suggested_mapping, row_errors}` — read with the dropshipping `FeedReader`: csv/tsv/txt/xlsx, UTF-8 or Windows-1256, delimiter sniffed; ≤ 20,000 rows.
  - `import/<job>/run/` `{mapping}` — name + price required; 409 once run.
  - `import/<job>/` — processed in chunks of 200 under the job's row lock on run and on every poll (real progress, no Celery, short requests); imported products are drafts; category by exact name only.
  - `products/export/` — the list's filters + ordering, mock columns, BOM.
- **Storefront auction** (Django-first, no switch): `catalog/products/<id>/auction/?currency` (never `reserve`; `reserve_met` only once ended) and the bid at both `…/auction/bids/` and the decided `…/bids/` `{bidder_name, bidder_phone, amount, currency}` → 200 the auction / 400 per field / 409 `{detail, auction}` (draft · ended · below the next bid); compared in the buyer's currency with the product's own rate; auction row locked; anti-sniping extension; buy-now ends it.
- **Gaps closed**: the cart now adds the filled personalization surcharges per unit (the PDP showed «+X», checkout never charged it — `tier_pricing.personalization_extra`, like the mock), and checkout copies the buyer's values to the new `OrderItem.personalization` (they were lost) — migration `0236_advanced_products_api` (+ `ProductImportJob`).
- **Frontend**: `lib/bff/live-products.ts` `ADVANCED_LIVE_RULES` (module `advanced_products`: the M37 extras, import ×3, `export.csv` → `/api/v1/products/export/`), independent of `products`/`b2b`; the storefront auction rows need no switch (Django-first adapter); `.env.example` lists `advanced_products`. `scripts/bundles-check.ts` screenshots use `caret: "initial"` (Playwright wrote inline `caret-color` before hydration → hydration warning).
- **Not wired**: `bundle_selection` in cart actions (the PDP does not send it); the merchant order detail does not show a line's personalization yet (no field in the M06 contract).
- **Tests**: `api/test_product_extras_api.py` (10).

---

## Domain 4 — Order management & returns (إدارة الطلبات والمرتجعات)

| Task | Module | Live switch | Django provider | Routes |
|---|---|---|---|---|
| INT-007 | M06 Orders | `orders` | `products/services/order_api_service.py`, `api/serializers_orders.py`, `api/views_orders.py` | 11 routes |
| INT-026 | M24 Returns & RMA | `returns` | `products/services/returns_api_service.py`, `api/views_returns.py` | returns, RMA, refunds log, options |

**Domain relationship**: the dashboard orders API reuses the legacy order engine (no parallel state machine); every write takes a row lock and an optimistic `version`. Returns were «Ready» passthrough rows whose shapes did not match the contract — rewritten behind the same URLs. Timelines for both live in the append-only `AuditLog` (no new tables). B2B drafts are Domain 9; storefront order rows (public, track) are Domain 5; convert-to-pickup is Domain 11.

### INT-007 — M06 Orders (list, detail, statuses, manual order, refunds, print) — 2026-10-24
- **Before**: Django had no dashboard orders JSON API (only HTML views + `orders/b2b-draft*`).
- **Django provider**: `products/services/order_api_service.py` — reuses `Order.set_fulfillment_status` / `cancel_order` / `release_reserved_stock`, `process_order_refund`, `process_order_merchant_credit`, marketplace `order_guard`, `create_b2b_draft_order`, `convert_order_to_pickup`; transitions copied from `update_order_status` / `confirm_payment_received` / `adjudicate_*`; legacy screens untouched. `api/serializers_orders.py`, `api/views_orders.py`.
- **Routes (11)**: `orders/`, `orders/counters/`, `orders/form-options/`, `orders/<id>/` GET+PATCH, `fulfillment-status/`, `status/`, `payment/<confirm|approve|reject>/`, `refunds/`, `order-statuses/` + `<id>/` + `reorder/`.
- **Rules**: optimistic lock on every write (`select_for_update` + `version` → 409 `{detail, current_version, order}`); timeline built from created + `AuditLog(order.*)` + `ShipmentEvent` + `OrderRefund` (no new model, no migration).
- **Server-side differences from the mock (Django is the authority)**: a `releases_stock` fulfilment status restocks without forcing `cancelled`; rejecting a `payment_review` cancels + restocks (legacy adjudication); B2B drafts need a staff session (`ApprovalRequest.requested_by`); gift message max 300 (model).
- **Frontend**: all 11 BFF rows switched to `liveOrMock(…, "orders", …)`; print reuses the detail row.
- **Out of scope**: `orders/refunds/` list (M24 → INT-026), `orders/<id>/convert-to-pickup/` shipping-ops row (M15, INT-021), storefront `orders/public|track` (INT-014/INT-015).
- **Tests**: `api/test_orders_api.py`.

### INT-026 — M24 Returns & RMA (returns, RMA, refunds) — 2026-10-25
- **Before**: the «Ready» rows already went to Django through the `/api/v1/*` passthrough, but Django's shapes did not match the contract: `ReturnRequestSerializer` had no `customer_name` / `lines_count` / `display_amount` / `location` / `timeline` / `decision_note` and sent decimal strings for `quantity`/`remaining` (Zod numbers); the RMA rows answered `{rma_id, status}` with QA `approve|reject`; RMA had no permission check — so the live screens failed parsing.
- **Rewritten** behind the SAME URLs and class names (re-exported from `api/views.py` for `api/tests.py` / `products/test_returns_b2b_api.py`): `products/services/returns_api_service.py` + `api/views_returns.py`.
- **New rows**: `returns/options/` (active locations, `refunds` gate only — works without the M22 `multi_location` feature), `returns/rma/` (`?status&q&page&page_size` + `counts` per status), `returns/rma/<pk>/`, `orders/refunds/` (read-only `OrderRefund` log, actor from the M06 order audit).
- **Gates**: plan feature `refunds` (legacy `require_feature`) + `orders.process_returns`; scan/QA also `inventory.adjust`; the refund log `orders.refund`.
- **Behaviour**:
  - per-line errors `{line_items:[{quantity_returned:[…]}]}` aligned to the request; remaining ignores rejected returns; reject needs a note (stored as `decision_note`); a decided or stale return answers 409 `{detail, current_version}`.
  - approve restocks every `restock` line to the chosen `location_id` (else its fulfilment's location) through the new `return_service.restock_to_location` — the location row as before, the product/variant stock directly when multi-location is off (the mirror signal skipped those stores), and a `refund_restock` movement referenced `إرجاع #id` in the M21 ledger.
  - `wallet` / `store_credit` then credit the customer wallet via `process_order_refund('wallet_credit')` (cap / `refunded` status / merchant-wallet reversal / loyalty claw-back / webhook as in M06); any money failure rolls the whole approval back; status `completed`.
  - cash without drawer liquidity = 400 `CashLiquidityError: …` (the screen's verbatim banner; 409 stays for conflicts).
  - RMA: create with field errors, events `requested → in_transit_back`; scan accepts `RMA-12`, locked destination (400), re-scan 409, quarantine; QA `restocked` moves quarantine → on-hand (+ product stock off multi-location) with a `RMA-<id>` ledger movement = `restock_movement_id`.
- **Storage**: return timelines and RMA events live in the append-only `AuditLog` (like the M06 order timeline — no new tables, no migration; pre-INT-026 rows derive theirs from their timestamps); every create/decision also lands on the order timeline.
- **Frontend**: the 4 BFF rows go through `liveOrMock(…, "returns", …)`; the decision toasts treat any non-`rejected` result as approved (Django completes in one step).
- **Legacy tests updated**: feature patch; cash = 400; paid order for the wallet credit.
- **Tests**: `api/test_returns_api.py` (8).

---
## Domain 5 — Storefront, purchase journey & PWA (واجهة المتجر ورحلة الشراء وتطبيق PWA)

| Task | Module | Live switch | Django provider | Routes |
|---|---|---|---|---|
| INT-011 | M09 Storefront Home & Catalog Listing | none (Django-first) | `products/services/storefront_catalog_service.py`, `api/views_storefront.py` | `config/`, sections, `catalog/categories/`, `catalog/products/`, `catalog/facets/`, `catalog/offers/` |
| INT-012 | M10 Product Detail Page | none | `products/services/storefront_product_service.py` (via `ProductDetailSerializer`) | product detail, `…/reviews/`, `…/quote/` |
| INT-013 | M11 Cart | none (`/api/v1/cart*` passthrough + Django-first BFF) | `products/services/storefront_cart_service.py` | `cart/`, `cart/actions/`, `cart/coupon/`, `cart/contact/`, `cart/restore/` |
| INT-014 | M12 Checkout | none | `products/services/storefront_checkout_service.py`, `api/views_checkout.py` | `checkout/*`, `orders/public/<uuid>/`, `orders/<uuid>/receipt/` |
| INT-015 | M41 Order Tracking | none | `products/services/order_tracking_service.py`, `api/views_tracking.py` | `orders/track/<public_uuid>/` |
| INT-016 | M44 PWA | `pwa` (new merchant rows only) | `api/views.py` PWA rows, `products/services/order_push_service.py`, `api/views_push.py` | `pwa/install-event/`, `push/*`, `push/stats/`, `push/test/` |
| INT-029 | M42 Wishlist & Reviews | none (Django-first) | `products/services/engagement_service.py`, `api/views_engagement.py` | `shopper/phone/`, `wishlist/*`, back-in-stock, `store-reviews/`, `customers/otp/send/`, product review POST |

**Domain relationship**: the whole buyer journey is Django-first (`getPublicJson`, `getProduct()`, `getTracking()`, `storefrontAdapter`, the `/api/v1/*` passthrough): the fixture only answers on 404/405/501 or when Django is down, so Django answers win as soon as they exist and no switch is needed. The storefront session (anonymous) carries the cart, coupons, OTP keys, `wishlist_phone`, holds and buy-now carts. Manifest, `/icon` and `/sw.js` stay Next-owned from `/config/`. Related storefront rows in other domains: wallet/loyalty (Domain 6, INT-028), referral (Domain 7, INT-034), booking slots (Domain 13, INT-036), auction (Domain 3, INT-045), tier prices in the cart (Domain 9, INT-044).

### INT-011 — M09 Storefront Home & Catalog Listing (config, sections, categories, search) — 2026-10-24
- **Before**: the storefront reads were already Django-first (`getPublicJson` → fixture only on 404/405/501 or Django down; `storefrontAdapter` for the BFF rows), and `/config/` + sections match the contract (section types identical; the M34 extensions landed in INT-010).
- **Gaps closed in Django**:
  - `catalog/categories/` now carries `image` (absolute).
  - `catalog/products/` cards carry `image_url`, `badges[{name,color}]`, `slug`; a parent `category` includes its sub-categories; `search` matches name/name_en with the shared Arabic normalization (+ description as before); `ordering` = `-created_at` · `price` · `-price` · `name`.
- **New rows**: `catalog/facets/` (brand/tag/collection counts on the same visible set, each dimension ignoring its own filter) and `catalog/offers/` (active offers in their validity window, `-priority`, max 6, links mapped to `/p/<id>` · `/c/<id>` · `/products`) — `products/services/storefront_catalog_service.py`, `api/views_storefront.py`.
- **Frontend**: no switch needed (Django answers win as soon as they exist); `[NEEDS BACKEND]` notes updated.
- **Tests**: `api/test_storefront_catalog_api.py`.

### INT-012 — M10 Product Detail Page (variants, reviews, related, bundles, personalization, slots) — 2026-10-24
- **Before**: `getProduct()` and the PDP sub-rows were already Django-first; Django's #4 only served the card + description/sizes/colours/deposit.
- **Django provider**: `products/services/storefront_product_service.py`, merged by `ProductDetailSerializer.to_representation`: images, video, unit + quantity limits, backorder, template/type, variant display style, used attributes/options (swatch colour + image) + variants with effective prices, tier prices, formula, bundle (components, compatibility rules, total of mandatory parts + build fee, first unavailable mandatory component), personalization fields, refundable deposit, bookable/auction flags, category path (root → leaf), brand, related/upsell/cross-sell (merchant `RelatedProduct` links first, else the mock's automatic rules), reviews summary, SEO, JSON-LD `structured` — all money via `_convert_value_to_target` in `?currency=`.
- **New rows**: `catalog/products/<id>/reviews/` GET (5/page, `?rating`, summary) and `…/quote/?value=` (formula unit price × value — what the cart charges).
- **Fix**: card `display_price` / `display_old_price` now use `format_money` (the legacy `get_formatted_price` drops the «ر.ي» symbol for YER).
- **Left on the fixture at the time (their own tasks)**: review POST with OTP + moderation and back-in-stock → INT-029 (done); auction + bids → INT-045 (done); slots + hold → INT-036 (done). Django answered 404/405 there meanwhile, so the storefront kept working.
- **Tests**: `api/test_storefront_product_api.py`.

### INT-013 — M11 Cart (cart actions, coupon, abandoned-cart phone capture) — 2026-10-24
- **Before**: the cart already went through the transparent `/api/v1/cart*` passthrough (Ready #5–#7) and the BFF coupon/contact/restore rows were Django-first, but Django only answered the bare cart and `add` ignored variants/quantity.
- **Django provider**: `products/services/storefront_cart_service.py` (the same `products/cart.py` session cart + `pricing.build_order_invoice` the checkout uses).
- **`GET cart/`** now returns every item extension (image, variant, slug, max/stock, auction, booking start, availability; hidden products listed but unpriced) plus `coupon_code`, `display_discount`, `applied_offers`, `display_total`, free-shipping flag/remaining/progress.
- **`cart/actions/`** honours `variant_id` (required when the product has variants, must belong to it), `quantity`; caps at stock (unless backorder) / `max_quantity` / 1 for auctions; refused bookable services at the time (slots = M26, completed by INT-036); stores `personalization` on the line (charged since INT-045); keeps the abandoned-cart snapshot.
- **New rows**: `cart/coupon/` POST/DELETE (session `applied_coupon_id`, `Coupon.is_valid` + `calculate_discount` messages verbatim); `cart/contact/` (WhatsApp → `AbandonedCart` via `attach_cart_customer`, 204); `cart/restore/` (signed 7-day token, merges lines + the reminder coupon).
- **Frontend**: `/cart/restore/<token>` (the link Django puts in reminders) redirects to `/cart?restore=<token>`.
- **Unit fix**: the free-shipping threshold is compared by Django in the dashboard currency (`build_order_invoice`) — settings display/labels (M34 + M15 screens) and the cart mock now say so instead of YER_NEW (noor fixture 30000 → 300).
- **Tests**: `api/test_storefront_cart_api.py`.

### INT-014 — M12 Checkout (delivery/payment options, quote, OTP, place order, success) — 2026-10-24
- **Before**: Django only had the HTML checkout (`products/views/cart_checkout.py::checkout` over `products/services/checkout_service.py`).
- **Django provider**: `products/services/storefront_checkout_service.py` + `api/views_checkout.py` — a JSON layer over the SAME core: `quote_checkout` → `validate_payment_method` → `prepare_direct_payment` → wallet / Sharwa Pay / COD OTP guards → `preflight_supplier_stock` → `reserve_and_create_order` → `charge_direct_payment` → merchant credit, abandoned-cart recovery, server tracking, `notify_order_created`; legacy screens untouched.
- **Routes**:
  - `checkout/delivery-options/` — methods in the cart currency from YER_NEW, Sharwa Ship hidden when the plan lacks it, active pickup points, default fee, free-shipping flag.
  - `checkout/payment-options/` — store caps + complete gateways, gateway `fields` for the buyer's `purchase_code`/`pin`, payout accounts.
  - `checkout/quote/` — `build_order_invoice`; explicit 400 for a stale delivery method / pickup; wallet preview split like the reservation.
  - `checkout/cod-otp/send|verify/` — device tracker in public + session/phone limits; device id derived from the session when the client sends none.
  - `checkout/sharwa-pay/otp/send/` (+ `display_balance`).
  - `checkout/` (multipart) — `client_uuid` stored as the unique `Order.idempotency_key` inside the reservation transaction ⇒ retries and concurrent double clicks return the first order; 409 `{detail, changed}` for hidden/out-of-stock lines; 429 within a minute of the last order; field errors before any OTP is consumed; pickup ⇒ zero delivery fee + `Order.pickup_location`; buy-now = the isolated `buy_now_cart`.
  - `orders/public/<uuid>/` and `orders/<uuid>/receipt/` — success page + late receipt for transfer orders awaiting confirmation; timeline event.
- **Mapping (Django is the authority)**: UI `cod` = Django `manual` without receipt — offered only when nothing is due upfront, behind the WhatsApp OTP; UI `manual` = transfer WITH receipt + amount (required — a transfer without proof is a COD order; the receipt replaces the OTP); gateways charge directly (no redirect) with the buyer's code; receipts JPEG/PNG only (`validate_receipt_image`) — frontend accept lists, BFF + mock checks aligned; `cod_allowed` is always true (Django has no auto-refusal; `CentralCustomerTrust` is a merchant signal) — later refined by INT-017 (store-disabled phones refused).
- **Frontend**: gateway code/PIN inputs from `fields`; transfer receipt + amount required before submit; mock aligned (COD off with deposits, receipt required).
- **Left for their tasks (all done later)**: loyalty redemption + wallet preview / wallet OTP send (INT-028 — Django answered `redeem_points` with a 400 meanwhile); bookable lines in buy-now (INT-036); `shopper/phone` (INT-029).
- **Tests**: `api/test_storefront_checkout_api.py`.

### INT-015 — M41 Order Tracking — 2026-10-24
- **Before**: the frontend was already Django-first (`getTracking()` server fetch + BFF `orders/track/[uuid]` via `storefrontAdapter`); Django only had the legacy HTML `orders/track/<uuid>/` page (`order_status_public_view`, no shipments).
- **Django provider**: `products/services/order_tracking_service.py` + `api/views_tracking.py` → `GET /api/v1/orders/track/<public_uuid>/` (shape = `TrackingSchema`, no auth, `Cache-Control: no-store` + `X-Robots-Tag: noindex`, unknown UUID = 404 `{detail}`; the tenant schema isolates other stores). Read-only over existing models, no migration.
- **Content**: the two axes (financial `status` + merchant `fulfillment_status` name/colour); one card per `Fulfillment` (items from `FulfillmentItem`), or — the common case, `Fulfillment` rows only exist with location routing/dropship — ONE card derived from the order (order-level AWB, `shipped_at`); finished order = delivered, cancelled = cancelled; latest non-cancelled `ShipmentOrder` with its non-rejected `ShipmentEvent`s (newest first, no geo/actor/cost); carrier name from the 3PL registry (`sharwa_ship` = «شروة شيب»); explanation on returned/cancelled/compensated_lost; courier (name + phone) only while picked_up/in_transit and only for the store's own fleet / Sharwa Ship (assigned `ShippingProvider`, else the agent-app staff's provider profile); gift orders carry no amounts and no buyer data; deposit split from `upfront_required`; return-policy excerpt from `StoreSetting.return_policy`.
- **Mapping (Django is the authority)**: Django `ready_for_pickup` means «ready for pickup OR shipping» → a pickup order shows «جاهز للاستلام» + code, a delivery order shows `preparing` «جاهز للشحن»; a `pending_pickup` AWB on a simple order reads the same.
- **Gap closed**: `PickupCode` existed but nothing issued it — `ensure_pickup_code()` (6 unique digits, 30 days, idempotent) is now called by `fulfillment_service.mark_fulfillment_prepared` for pickup orders and lazily by the tracking read; hidden after `picked_up_at`. Orders without `Fulfillment` rows cannot hold a code (model FK) — they show the pickup point only.
- **Frontend**: `[NEEDS BACKEND]` notes updated (route, schema, api, BFF README); mock aligned to Django (prepared delivery = «جاهز للشحن», pickup code only once ready, returned explanation text).
- **Out of scope**: verifying the code at the counter (M15/M22/POS); push-on-status (M44 → INT-016, done).
- **Tests**: `api/test_order_tracking_api.py`.

### INT-016 — M44 PWA (manifest, install event, push subscription) — 2026-10-24
- **Before**: the storefront PWA rows were already Django-first through the `/api/v1/*` passthrough (Ready #11–#14: `pwa/install-event/`, `push/vapid-public-key/`, `push/subscribe/`, `push/unsubscribe/` in `api/views.py`); manifest, `/icon` and `/sw.js` stay Next-owned from `/config/` (R-16), and the SW `push` handler reads exactly Django's payload `{title, body, url}`.
- **Gap 1 — order status pushes**: the success-page promise «سنُنبّهك عند تغيّر حالة طلبك» had no sender (only a manual broadcast existed). New `products/services/order_push_service.py` + Celery `send_order_push`: targeted pushes to active subscriptions with the order's phone (`clean_phone_number`), link `/track/<uuid>`, store name in the title; hooked into the single order-event entry point `order_events.notify_sharwaconnect_of_order_event` (SHIPPED / DELIVERED / CANCELLED / PAYMENT_RECEIVED — not CREATED), accepted `apply_shipment_transition` (picked_up / in_transit / delivered / returned) and `mark_fulfillment_prepared` for pickup orders (ready_for_pickup); no subscribers ⇒ no task; on_commit; never raises; one push per (order, kind) per 6 h (cache).
- **Gap 2 — anti-impersonation**: a phone typed by the client could receive another number's order updates — `push/subscribe/` now takes `order_uuid` and derives the phone from that order; `customer_phone` alone is ignored (anonymous = broadcast only); an anonymous re-subscribe keeps the linked phone; unknown order 400 `{order_uuid}`.
- **Gap 3 — CGNAT stance**: install-event per-IP limit 30/min → 300/min; subscribe gets a loose 120/min ceiling; public PWA views `authentication_classes = []`.
- **Gap 4 — merchant JSON successor of the HTML `send_test_push_notification`** (M44 US-44.5): `api/views_push.py` → `GET push/stats/` `{active_subscribers}` (owner or `reports.view`), `POST push/test/` `{title≤60, body≤200}` → 202 `{queued_for}` (owner only, 400 without subscribers, 429 + `Retry-After` within 60 s).
- **No migration**.
- **Frontend**: `PushSubscribe` sends `order_uuid`, re-links an existing browser subscription and offers «إيقاف التنبيهات» (US-44.4.3 → `unsubscribe`); new BFF `push/stats` + `push/test` via `liveOrMock(…, "pwa", …)` and the «إشعارات المتصفح» card on `/dashboard/reports` (count for reports viewers, broadcast form for the owner); mock aligned (order-derived phone, 300/min, same messages); `ready-api-v1.md` rows #11/#13 updated.
- **Tests**: `api/test_pwa_push_api.py` (legacy `products/test_push_notifications.py`, `test_pwa_install_tracking.py` unchanged).

### INT-029 — M42 Wishlist & Reviews (storefront engagement, back-in-stock, store reviews) — 2026-10-25
- **Before**: the 7 storefront rows were already Django-first (`storefrontAdapter`) but Django had only the HTML views (`products/views/customer_engagement.py`, the store-review form) and answered 404/405, so the fixtures served them.
- **Django provider**: `products/services/engagement_service.py` + `api/views_engagement.py` (public session views, `Retry-After` on 429):
  - `shopper/phone/` GET/POST — the session's `wishlist_phone` (same key as the legacy views; no OTP, FR-42.01).
  - `wishlist/` — `ProductListSerializer` cards at live prices in `?currency` + `allow_backorder`/`is_available`; an unpublished product stays as «لم يعد متاحاً», an archived one is left out.
  - `wishlist/toggle/` — session phone, body phone as fallback, 409 without either; saving needs a visible product, removing always works.
  - `catalog/products/<id>/back-in-stock/` — 201 first / 200 repeat; a subscription already notified is re-armed.
  - `store-reviews/` GET/POST — published at once, 3 per session/hour.
  - `customers/otp/send/` — purposes `review|auction|wishlist|back_in_stock`, 60 s resend → 429.
  - product-review POST on `catalog/products/<id>/reviews/` — fields checked before the code; the WhatsApp code is consumed; stored with the buyer's `customer_key`.
- **Gaps closed** (migration `products/0228_engagement_api`): `StoreReview.rating` (nullable — legacy comments without stars stay out of the average and the widget, nothing invented) and `ProductReview.is_approved` (default True keeps existing/legacy reviews visible; API reviews start False → hidden from the PDP list, the summary and the legacy HTML page until approved).
- **Moderation end to end**: the contract promised «سيظهر تقييمك بعد المراجعة» and the M07 tab showed «بانتظار المراجعة», but nothing could approve — `PATCH reviews/<id>/` now accepts `{approved}` (alone or with `admin_reply`), Django's `approved` is real, and the M07 reviews tab has an «اعتماد» button (`useApproveReview`; mock aligned).
- **Tests**: `api/test_engagement_api.py` (4).

---
## Domain 6 — Customers, customer wallets & loyalty (العملاء ومحافظ العملاء والولاء)

| Task | Module | Live switch | Django provider | Routes |
|---|---|---|---|---|
| INT-017 | M07 Customers | `customers` | `products/services/customer_service.py`, `api/views_customers.py` | 14 routes |
| INT-028 | M35 Customer Wallets & Loyalty Points | `wallets` (merchant) · none (storefront) | `products/services/wallet_service.py`, `api/views_wallets.py`, `products/services/storefront_wallet_service.py` | merchant wallets/points, storefront wallet/loyalty, checkout redemption |

**Domain relationship**: Sharwa has no tenant customer model — a customer is DERIVED from a normalized phone (`customer_key`) across every table (FR-07.01). The customer wallet is always SAR (FR-07.04) and is the same ledger used by refunds (Domain 4) and checkout (Domain 5). Platform trust (`CentralCustomerTrust`, public) and store trust (`CustomerReliabilityRecord`) are never merged.

### INT-017 — M07 Customers (list, profile, orders, wallet, points, wishlist, reviews, notes, COD, export, segments) — 2026-10-24
- **Before**: Django had only the HTML `customer_report`.
- **Django provider**: `products/services/customer_service.py` + `api/views_customers.py`.
- **Routes (14)**: `customers/`, `segments/count/`, `export.csv`, `<phone>/`, `<phone>/{orders,wallet/transactions,points,wishlist,reviews,notes,cod}/`, `notes/<id>/`, `reviews/<id>/` PATCH.
- **Derived customer (FR-07.01)**: key = `customer_key` (`clean_phone_number` + `966` for 9-digit Saudi mobiles, Arabic digits accepted) so `77…`/`077…`/`96777…` merge into one customer in every table (orders, wallets, points, reliability, wishlist, back-in-stock, abandoned carts, reviews); two grouped queries (raw phone × currency, raw phone × name) merged in Python — no SQL phone expression.
- **Rules**: placed orders = every status but `pending_payment`; `orders_count` counts them all, `display_total_spent` only the non-cancelled ones (the legacy LTV rule), converted to the dashboard currency; wallet always SAR (FR-07.04); marketplace-only customers ⇒ `phone_available=false` (blank in the CSV). Name = latest order's, `other_names` the rest.
- **Segments**: `AUDIENCE_TYPE` verbatim; `segments/count` calls the campaign resolver itself (`campaigns._resolve_raw_recipients`, `dormant_days=90`) so the count is exactly M13's audience.
- **Trust**: platform trust = sum of the phone's `CentralCustomerTrust` rows in public (chunked IN), store trust = `CustomerReliabilityRecord` — never merged (FR-07.03).
- **Staff usage tracking**: profile views → `view_volume`, exports → `export_volume`; export 429 on the hard limit or a critical alert today; audited (`customers.export`).
- **Gaps closed** (migration `0218_customer_crm`): new `CustomerNote` (author or owner deletes — FR-07.08); `CustomerReliabilityRecord.cod_status_reason/updated_at/updated_by` (manual decision with reason, audited `customers.cod_disabled|enabled`, 409 when unchanged; auto-disable after refusals reads «أُوقف تلقائياً بعد N مرات»); `ProductReview.customer_phone` (reviews tab — filled by the M42 OTP review flow, INT-029; legacy name-only reviews stay unattributed; `approved` was always true until M42 added moderation).
- **COD enforcement**: the storefront checkout never read `cod_disabled` — `verify_cod_otp` now answers `cod_allowed:false` with the mock's sentence and `checkout/` refuses `payment_method=cod` for a disabled phone.
- **Frontend**: all 13 BFF rows → `liveOrMock(…, "customers", …)` (orders tab = Django `customers/<phone>/orders/`, gated by `customers.view` not `orders.view`); `x-export-rows` added to the forwarded headers; fixture spend excludes cancelled orders like Django.
- **Note handed to INT-019**: a campaign created from the «خامل» segment must carry `dormant_days=90` (the model default is 30) — applied in INT-019.
- **Tests**: `api/test_customers_api.py`.

### INT-028 — M35 Customer Wallets & Loyalty Points — 2026-10-25
- **Before**: Django had the models + HTML screens (`products/views/{wallets,loyalty}.py`) but no JSON API, and the checkout answered `redeem_points` with a 400 since INT-014.
- **Merchant provider** (`products/services/wallet_service.py` + `api/views_wallets.py`):
  - `customers/wallets/` — `?q` phone (local `0777…` matches) or normalized name, `sort=balance|last_transaction_at`, `totals`; POST (phone → `clean_phone_number`, the same key as checkout/refunds; name from the latest order).
  - `<pk>/`; `<pk>/transactions/` (signed `amount`, `reference` = the `OrderRefund` that credited it, else the order).
  - `<pk>/topup/` — manual_topup / reward / adjustment; a debit only as adjustment with a note; insufficient balance 400; `Idempotency-Key` header/body = one transaction.
  - `customers/loyalty-program/` — read-only for `customers.view` (M13's `loyalty/program/` stays owner-only).
  - `loyalty/points/` (highest first, wallet link, last earn); `loyalty/points/<phone>/transactions/`.
  - **Gates**: plan features `customer_wallets` / `loyalty_settings` (as the sidebar) + `customers.view` / `customers.edit_profile`.
- **Storefront provider** (`products/services/storefront_wallet_service.py`, public session views): `wallet/balance-preview/`, `wallet/otp/send/`, `loyalty/balance/`, `loyalty/otp/send/` (= the legacy views, same WALLET_OTP session keys), `loyalty/redeem/` (consumes the code and marks the phone verified for 10 min — nothing moves yet).
- **Checkout**: `redeem_points` now validated (program on, min, balance, wallet not disabled) and shown as `display_loyalty_discount` (applied before the wallet, upfront first); at placement the loyalty check runs before any other OTP is consumed, then `redeem_points_to_wallet` converts the points INSIDE the order transaction (a failed order restores them) and the wallet debit is capped to that credit unless the buyer also chose «use wallet» (`OrderDraft.wallet_cap_sar`) — an existing balance is never spent without consent; the points + wallet transactions get the order.
- **Migration** `products/0227_wallets_api`: `WalletTransaction.actor` (from `acting_as`, else «النظام») + unique `idempotency_key`; `CustomerPointsTransaction.wallet_transaction` (set by `redeem_points_to_wallet`).
- **Frontend**: the 7 merchant BFF rows go through `liveOrMock(…, "wallets", …)`; the 5 storefront rows were already Django-first (`storefrontAdapter`).
- **Tests**: `api/test_wallets_api.py` (5).

---

## Domain 7 — Marketing, storefront design & partners (التسويق والتصميم والمسوّقون والمؤثرون)

| Task | Module | Live switch | Django provider | Routes |
|---|---|---|---|---|
| INT-018 | M08 Theme Customizer | `design` | `products/services/design_service.py`, `api/views_design.py` | `store/theme/`, `store/theme/presets/`, `store/announcement/`, `admin/sections/*` |
| INT-019 | M13 Marketing | `marketing` | `products/services/marketing_service.py`, `api/views_marketing.py` | 18 routes under `promotions/` + `loyalty/program/` |
| INT-034 | M17 Affiliates & Influencers | `affiliates` | `products/services/partners_service.py`, `api/views_partners.py` | per kind `affiliates`/`influencers` + `storefront/referral/` |

**Domain relationship**: marketing writes go to the SAME models the cart/checkout engine reads (no parallel pricing); design and most marketing areas are owner-only; affiliate attribution happens at checkout through the `sharwa_aff` cookie, now captured on the Next storefront.

### INT-018 — M08 Theme Customizer (theme, presets, sections, announcement) — 2026-10-24
- **Before**: Django had the HTML «تصميم المتجر» (`StorefrontDesignForm` + `AnnouncementBarForm`) and `admin/sections` behind `IsAdminUser` (platform superuser only — the merchant could never use it).
- **Django provider**: `products/services/design_service.py` + `api/views_design.py` — owner session only (staff 403 «تصميم المتجر مقصور على مالك المتجر.»); plan feature = the legacy `require_feature`: `storefront_design`, announcement `coupon` as in M34.
- **Routes**:
  - `store/theme/` GET/PATCH — JSON or multipart `logo`; data URL logo accepted; `null` clears; colours upper-cased `#RRGGBB`; fonts = `GOOGLE_FONT_CHOICES`; design styles; preset key or `custom`; optimistic lock — stale `version` ⇒ 409 `{detail, current_version}`.
  - `store/theme/presets/` — `products/theme_presets.py` verbatim.
  - `store/announcement/` — the nine fields through `settings_service.patch_announcement` (one row and one validation with M34).
  - `admin/sections/` GET (seeds the default singletons) / POST; `<pk>/` PATCH/DELETE (singleton: no duplicate, no delete; type immutable; 204); `reorder/` (every id, full order). The `AdminStoreSectionViewSet` and its router entry are removed.
- **Validation = the frontend contract (FR-08.06)** with its own error keys: `label` ≤ 80, `limit` 1–50, `product_grid` existing `category_id`, `slider`/`banner_grid` 1–12 items each with a title or an image, `items.<i>.image|title|link`, hero `title`/`subtitle`/`cta_text`/`link` (`/` or `https://`). Item images arrive as data URLs (jpg/png/webp/gif ≤ 5 MB) and are stored as files under `<schema>/store_sections/` — `content_data` keeps an absolute URL, never base64 (the old serializer demanded an image on every item).
- **Gaps closed** (migration `0219_theme_version_section_label`): `StoreSetting.theme_version` + `theme_updated_at` (the contract's `version`/`updated_at` and the 409), `StoreSection.label` (the editor's custom section name; `/config/` returns it, else the type name as before).
- **Frontend**: the six BFF rows → `liveOrMock(…, "design", …)` (multipart forwarded as-is); docs updated.
- **Note**: a publish with many new slider images in one PATCH is bounded by `DATA_UPLOAD_MAX_MEMORY_SIZE` (8 MB, INT-005 decision).
- **Tests**: `api/test_design_api.py`.

### INT-019 — M13 Marketing (coupons, offers, abandoned carts, campaigns, timeline, loyalty, gifting) — 2026-10-24
- **Before**: Django had only HTML screens.
- **Django provider**: `products/services/marketing_service.py` + `api/views_marketing.py` — 18 routes under `/api/v1/promotions/…`: `summary`, `coupons` · `<pk>`, `offers` · `<pk>` (multipart `image`), `abandoned-carts` · `<pk>` · `remind`, `abandoned-cart-settings`, `campaigns` · `channels` · `<pk>` · `preview` · `send`, `timeline` · `<pk>`, `gift-settings`; + `/api/v1/loyalty/program/`.
- **Gates**: coupons/offers/summary by `discounts.apply` (read) / `discounts.manage` (write); carts, campaigns, timeline, loyalty, gifting owner-only (M13 §2); plan features = the legacy `require_feature` (`coupon`, `abandoned_carts`, `campaigns`, `timeline`, `loyalty_settings`, `gift_settings`). Over the SAME models the cart/checkout engine reads — no parallel pricing.
- **Coupons**: code upper-cased + unique; percent integer 1–100; temporal state computed like the UI; influencer coupons keep their code and cannot be deleted here.
- **Offers — condition mapping**: the frontend's `buy_condition_type` / `buy_category` / `buy_product` / `min_total_items` now mean the condition of EVERY offer type: Django `condition_type` / `category` / `product` / `min_total_items` for discount & free shipping (the frontend form had no condition for them — **added** «شرط التطبيق» to `offer-form.tsx` + schema validation + mock), and the «buy X» condition for buy_x_get_y.
- **Engine gap closed**: `_buy_x_get_y_discount` handled only category/product — now also `all` (every cart unit) and `min_items` (same, once the cart reaches the minimum); priority follows Django (higher first — UI hint fixed).
- **Abandoned carts**: lazy promotion, counters, items priced at the product's current price in the cart's currency; manual «remind» = the next step through the SAME `_send_one_reminder` as the scheduled command (template, channel, step-2 coupon) — 400 when no channel can deliver; settings validate the template variables per reminder.
- **Campaigns**: draft → preview (`campaigns.resolve_audience`, channel-aware count + rendered message) → send now (`send_campaign` Celery chunks; status flipped to sent under a row lock first, so a double click cannot send twice) or `{schedule_at}` (future only; `PATCH {status:"draft"}` cancels); unconnected channel ⇒ 400 (WhatsApp/social = active app installation; SMS/e-mail have no real provider yet ⇒ not connected); API-created campaigns carry `dormant_days=90` (M07).
- **Gaps closed** (migration `0220_marketing_api`): `MarketingCampaign.sent_at`; `PromotionalOffer.buy_condition_type` + `all`/`min_items`; **scheduled campaigns were never sent** — new Beat task `dispatch_scheduled_campaigns` (every 5 min, per tenant).
- **Timeline**: events with optional campaign/offer links, `?from&to` overlap. **Loyalty / gifting / summary**: as the contract. The `/config/` gifting/loyalty extensions handed over by INT-002 belong here.
- **Frontend**: all 18 BFF rows → `liveOrMock(…, "marketing", …)`; docs updated.
- **Tests**: `api/test_marketing_api.py`.

### INT-034 — M17 Affiliates & Influencers — 2026-10-25
- **Before**: every §7 row was `[NEEDS BACKEND]`; Django had the models (`Affiliate`, `AffiliateClick`, `AffiliateSale` OneToOne per order, `Influencer`, `InfluencerSale`, `Coupon.influencer`), attribution at checkout (`create_affiliate_sale` via the `sharwa_aff` cookie, `create_influencer_sale` via `Order.coupon_code`) and HTML screens only. No migration needed.
- **Django provider**: `products/services/partners_service.py` + `api/views_partners.py` — per kind (`affiliates`, `influencers`): list `?q&sort&has_pending` (q = name / phone|contact / code; sort name · pending · sales_count · clicks_count · last_sale_at, `-` = desc) + POST, `summary/`, `<id>/` GET/PATCH (`is_active` = stop), `<id>/sales/?payout_status`, `<id>/sales/mark-paid/` `{sale_ids, dry_run?}`.
- **Gates**: session 401 (staff may read) → plan feature 403 with the mock sentences → every write owner-only 403 «إدارة المسوّقين والمؤثرين ومستحقاتهم لمالك المتجر.».
- **Money rules (Django is the authority — `products/views/affiliates.py`)**: «المستحق» = pending commissions of PAID, non-cancelled/refunded orders minus commissions already paid for orders refunded later (clawback; may be negative); `has_pending` = owed > 0; mark-paid pays only eligible selected sales, oldest first, within the net allowance (no partial record); `dry_run` previews the same computation without writing; `pending → paid` only; audit log `affiliate.payout` / `influencer.payout`.
- **Fixed for influencers**: the legacy «تم الدفع» paid every pending sale incl. unpaid/cancelled orders — the API applies the affiliate guard to both.
- **Units**: amounts stored in SAR (model decision) shown in the store currency; a fixed commission is entered and shown in SAR («المبلغ (ر.س)»); percent value as «10». Affiliate phone normalized to digits, `^(967|966)\d{9}$`, unique among affiliates. Sales: `order_state` active/cancelled/refunded from the order; influencer `coupon_code` = the order's coupon.
- **Gap closed — referral links on the Next storefront**: the share link `<store origin>/?aff_id=` opened the Next storefront, which captured nothing (no clicks, no attribution). New `POST /api/v1/storefront/referral/` `{code}` → `{recorded}` (public; same rule as `storefront.py`: active affiliate + code ≠ current cookie ⇒ `AffiliateClick` + HttpOnly `sharwa_aff` 30 days), `api/bff/storefront/referral` (Django-first `storefrontAdapter`, mock counts the click) and `ReferralCapture` in the storefront layout (once per tab session, inert in `?preview=1`) — the JSON checkout already reads the cookie.
- **Frontend**: both BFF catch-alls → `liveOrMock(…, "affiliates", "/api/v1/<kind>/<path>/")`; `.env.example` adds `affiliates`; mock aligned (owed = live orders minus clawback, eligible-only oldest-first mark-paid).
- **Tests**: `api/test_partners_api.py` (8) + marketing/checkout/reports suites green.

---
## Domain 8 — Finance: payments, merchant wallet, expenses & Sharwa Pay (المالية والمحفظة)

| Task | Module | Live switch | Django provider | Routes |
|---|---|---|---|---|
| INT-020 | M14 Payments & Merchant Wallet | `payments` | `products/services/payments_service.py`, `api/views_payments.py` | 11 routes |
| INT-043 | M33 Expenses | `expenses` | `products/services/expenses_api_service.py`, `api/views_expenses.py` | `expenses/`, `expenses/<id>/` |
| INT-048 | M40 Sharwa Pay (customer side) | `sharwa_pay` | `sharwapay/customer_api.py`, `api/views_sharwa_pay.py` | 8 routes under `sharwa-pay/` |

**Domain relationship**: three money ledgers — the merchant wallet (store schema, `MerchantWalletTransaction`), operating expenses (store schema), and the cross-store Sharwa Pay wallet (public schema, platform origin). Every balance change goes through an atomic manager with a row lock and an audit row; withdrawals are debited at request time and refunded on rejection (merchant wallet: by the merchant's admin action via `decide_withdrawal`; Sharwa Pay: by the platform console, INT-031). Platform dues collection (debit of the merchant's Sharwa Pay wallet) is Domain 16. Customer wallets are Domain 6.

### INT-020 — M14 Payments & Merchant Wallet (gateways, payout accounts, wallet, withdrawals, dues) — 2026-10-24
- **Before**: Django had only HTML forms (`GatewayCredentialForm`, payout add/toggle/delete, the wallet page + withdrawal form, admin actions).
- **Django provider**: `products/services/payments_service.py` + `api/views_payments.py`.
- **Routes (11)**: `payments/gateways/` · `<code>/` · `<code>/credentials/`, `store/payments/`, `payments/payout-accounts/` · `<pk>/` · `reorder/`, `wallet/`, `wallet/transactions/`, `wallet/withdrawals/`, `wallet/dues/`.
- **Gates**: owner only (staff → 403, M14 §2). Plan features = the legacy `require_feature`: `payment_gateways` (banks) / `local_wallets` (jeeb) per gateway — the list omits gateways outside the plan; `bank_transfers` for payout accounts; `merchantwallet` for wallet/withdrawals; dues and `store/payments` ungated.
- **Gateways**: fields come from `GATEWAY_REGISTRY.credential_fields` (Django is the authority — `merchant_id/base_url/api_key/api_secret` for jeeb, `merchant_code/base_url/api_key/api_secret` for kuraimi; the screen renders whatever descriptors arrive). No secret value leaves the service: `masked_hint` = «••••» + last 4, `value` only for non-secret fields. PUT keeps any empty field (the form sends them all); partial saving is allowed (GatewayCredentialForm rule) — only *enabling* needs every required field (Django's «لا يمكن تفعيل … قبل تعبئة: …»); `base_url` validated as a URL.
- **«At least one payment method»** guard on `store/payments` (reuses `settings_service.patch_payments`) and on disabling the last enabled gateway.
- **Payout accounts**: `{count, counts, results}` banks first; duplicate numbers ignore spaces/dashes and Arabic digits; reorder takes every account of one type; delete → 400 `has_pending_withdrawal` while a pending withdrawal points at it.
- **Wallet (Django rule kept)**: a withdrawal is debited immediately (anti double-spend) and refunded on rejection, so the contract is derived: `available` = stored balance, `display_reserved` = pending sum, `display_balance` = available + reserved. `Idempotency-Key` → a retried POST returns the same request (200) with no second debit.
- **Gaps closed** (migration `0221_merchant_wallet_api`): `MerchantWalletTransaction.kind` + `reference_kind/reference_id` (ledger types and links, written by `merchant_credit_service` (order_payment), `refund_service` (refund), order cancellation (adjustment), withdrawals; backfilled from the fixed description wording); `MerchantWithdrawalRequest.payout_account` (FK SET_NULL, `payout_destination` kept as snapshot) + `idempotency_key`.
- **Concurrency fix**: admin approve/reject now goes through `payments_service.decide_withdrawal` (row lock + pending guard — two concurrent «reject» clicks used to refund twice).
- **Dues**: `PlatformCommissionRecord` / `AppBillingCharge`, totals per currency without summing currencies («2.50 ر.س · $1»), `commission_enabled` from `PlatformBillingSettings`.
- **Frontend**: the 11 BFF rows → `liveOrMock(…, "payments", …)`; `.env.example` adds `payments`.
- **Also in this batch — local media 404 (Windows)**: `DevMediaMiddleware` resolves double-encoded paths, NFC/NFD and case variants of Arabic names and logs misses ASCII-safe; `urls_public` serves `MEDIA_URL` under DEBUG; `tenant_upload_path` stores non-ASCII uploads under a uuid name; `normalize_media_filenames` renames the existing Arabic-named files and rewrites their FileField rows; `sharwa.bat` sets a UTF-8 console.
- **Tests**: `api/test_payments_api.py`.

### INT-043 — M33 Expenses — 2026-10-26
- **Before**: both M33 §7 rows were `[NEEDS BACKEND]`; Django had the model (`OperatingExpense`: 4 categories, Decimal(14,2), `currency`, indexed `expense_date`, `note`, `created_by` → StaffMember, ordering `-expense_date, -id`), the HTML `operating_expenses_view` (list + `OperatingExpenseForm` POST, session only) and the M25 `operating_expenses` report — no JSON and no permission key, so the frontend kept the screen owner-only although the contract carries `created_by_name`.
- **Django provider**: `products/services/expenses_api_service.py` + `api/views_expenses.py` — 2 routes under `/api/v1/expenses/`:
  - `GET ?category&currency&from&to&page` → `{count, months:[{month, totals:[{currency, display_total}], rows:[{id, category, display_amount, currency, expense_date, note, created_by_name}]}]}` — 50 a page; each month on the page carries the WHOLE filtered month's total per currency (one `TruncMonth` × currency `Sum` in the database, `format_money`, never a mixed total — FR-33.03); invalid filter values are ignored (`2026-02-30` included).
  - `POST {category, amount, currency, expense_date, note}` → 201 the row (`created_by` = the request's staff, `null` = the owner; currency defaults to SAR; a future date is accepted, §8) / 400 `{field:[msg]}` with the mock's messages verbatim (+ note ≤ 500).
  - `<id>/` → 405 (FR-33.06 — expenses are not edited or deleted).
- **Gap closed in Django**: new permission `expenses.manage` (category «المالية») seeded to «مدير المتجر» + «مدير الفرع» — migration `0235_seed_expenses_permission` (same pattern as `0210`; re-assignable from «الأدوار والصلاحيات», the owner implicitly); gate = session (401) → `expenses.manage` (403); the legacy `operating_expenses_view` now carries `@requires_permission('expenses.manage')` so both surfaces agree. No plan feature (FR-33.07).
- **Frontend extended to Django**: `PERMISSION_KEYS` += `expenses.manage` (mock permission catalogue + «المالية» category, manager fixture holds it); the sidebar/⌘K entry `wallet.expenses` flips from `ownerOnly` to `permission: "expenses.manage"`; the screen gates on the permission instead of `session.kind`; the mock answers 403 without the key and records the member's `full_name` as `created_by_name`; the mock validates the note length like Django. Mobile «مصروف جديد» bar moved to `fixed inset-x-0 bottom-16 z-30` with page padding `pb-36` (the shell's bottom nav covered it).
- **Scripts**: `scripts/expenses-check.ts` — the manager enters an expense under her own name, the owner's row stays `null`, the cashier gets no form and a 403; per-run `RUN` tag in notes (idempotent re-runs).
- **Adapter**: `api/bff/expenses/[[...path]]` → `liveOrMock(…, "expenses", "/api/v1/expenses/[<path>/]", …)`; `.env.example` lists `expenses`.
- **Tests**: `api/test_expenses_api.py` (8).

### INT-048 — M40 Sharwa Pay (OTP login, wallet, top-up, withdrawal) — 2026-10-26
- **Before**: every M40 §7 row was `[NEEDS BACKEND]`; Django had the whole domain (public `sharwapay` app: `SharwaPayWallet` with four currency balances, `SharwaPayWalletManager.credit/debit` — row lock + audit row in one transaction, `apply_credit_if_approved` behind the `credited_at` guard, withdrawal debit-at-request + console reversal from INT-031) behind the legacy HTML page `tenants/sharwa_pay_views.py` only (OTP re-entered per action, no transactions/requests list, no JSON).
- **Django provider**: `sharwapay/customer_api.py` + `api/views_sharwa_pay.py` — 8 routes under `/api/v1/sharwa-pay/`: `otp/send/` · `otp/verify/` · `logout/` · `wallet/` · `transactions/` · `requests/` · `topups/` · `withdrawals/`.
- **Payloads**: `otp/send {phone}` → `{ok, phone, expires_in: 600}`; `otp/verify {phone, code}` → `{ok, phone}`; `logout` → 204; `wallet` → `{customer_phone, customer_name, is_active, exists, balances[4]: {currency, display_balance, balance}}`; `transactions?currency&reason&page` → `{count, results[20]}` with `{id, transaction_type, reason, display_amount, currency, display_balance_after, source_tenant_schema, source_store_name, source_store_available, source_order_id, related_request, created_at}`; `requests` → `{topups[], withdrawals[]}`; `topups` multipart → 201 `{id, status: "pending"}`; `withdrawals {amount, currency, payout_destination}` → 201 `{id, status, display_balance_after}`.
- **Rules**:
  - public schema only (404 on a store host / `X-Store-Domain`, on top of the BFF's platform-origin gate);
  - CSRF on every write, login included (the client refreshes the token once on the CSRF 403);
  - the wallet session is Django's `sessionid` with the legacy page's key `sharwa_pay_auth_phone` (both stay in sync), `cycle_key()` on login;
  - the code is bound to the session that asked for it and stored as an HMAC, never plain;
  - 3 sends / 10 min per NUMBER (cache, not session), 5 wrong codes → 5-min lock per number, both 429 with `retry_after` + `Retry-After`; WhatsApp failure → 502; reasons `no_code` / `expired` / `invalid` as the mock;
  - phone normalised exactly like the frontend `normalizePhone` (local Yemeni → 967…, 966/967 kept);
  - login does NOT create a wallet (`exists:false` + four zero rows); the first top-up does;
  - wallet suspended → 403 «المحفظة موقوفة — تواصل مع الدعم.» on top-up/withdrawal, `is_active:false` on the read;
  - no session → 401 «سجّل الدخول برقم جوالك.»; every response `Cache-Control: no-store`.
- **Mapping**: `display_balance_after` = the audit row's real `balance_after` (the mock replayed it); `source_store_name/available` from `tenants.Client` by `source_tenant_schema` (missing or suspended store → «متجر غير متاح»); `related_request` parsed from the transaction description `#<id>` and checked against this wallet's own requests; a Kuraimi transfer with no wallet yet (`wallet=None`, `claimed_phone`) is listed to its number's owner; `rejection_reason` only on rejected rows.
- **Top-up**: multipart, receipt = jpg/jpeg/png/webp/gif ≤ 5 MB AND a real image (Pillow); `bank_transaction_id` unique at DB level (a rejected request's number cannot be reused — the mock allowed it); status `pending`; no credit here — approval stays the console's (INT-031).
- **Withdrawal**: request row + `debit(... 'withdrawal')` in one atomic block; the description now carries `#<request id>` (links the debit to its request); insufficient / no wallet → 400 `{amount:[«الرصيد غير كافٍ.»]}` with no orphan request.
- **Bug fixed**: `apply_credit_if_approved` labelled ANY top-up carrying a bank transaction id as `topup_auto` — app top-ups now carry the customer's id too, so «auto» = a transaction id with NO receipt (the Kuraimi webhook only); customer top-ups credit as `topup_manual` («شحن بمراجعة»). No migration.
- **Frontend**: `/api/bff/sharwa-pay/*` → `liveOrMock(…, "sharwa_pay", "/api/v1/sharwa-pay/<path>/")` behind the existing platform-origin 404; hooks, schemas and screens unchanged; `.env.example` adds `sharwa_pay`.
- **Out of scope**: the store checkout's «pay with Sharwa Pay» (INT-014, already live) and the console approvals (INT-031).
- **Tests**: `api/test_sharwa_pay_api.py` (9).

---

## Domain 9 — B2B wholesale (البيع بالجملة B2B)

| Task | Module | Live switch | Django provider | Routes |
|---|---|---|---|---|
| INT-044 | M36 B2B Wholesale | `b2b` (options + tier prices via `B2B_LIVE_RULES`) · none (draft rows via passthrough) | `products/services/b2b_api_service.py`, `api/views_b2b.py`, `products/services/tier_pricing.py`, `api/views.py` (drafts) | `orders/b2b-options/`, `products/<id>/tier-prices/[<tier_id>/]`, `orders/b2b-draft/`, `orders/b2b-drafts/`, `orders/b2b-draft/<approval_id>/resolve/` |

**Domain relationship**: B2B drafts are approval-gated orders (`ApprovalRequest`, M18 queue — Domain 12) created by staff; quantity (tier) prices are a catalog extension charged by the cart/checkout (Domain 5). The draft rows were already Django's through the passthrough; the options and tier-price editor rows are on the `b2b` switch, independent of `products`.

### INT-044 — M36 B2B Wholesale (B2B drafts/approvals, tier prices, haggling) — 2026-10-26
- **Before**: the three draft rows (`orders/b2b-draft/` POST · `orders/b2b-drafts/` · `orders/b2b-draft/<approval_id>/resolve/`) were already Django's through the `/api/v1/*` passthrough (their POSTs only reach Django with a body since the same-day `upstream.ts` buffering fix); `[NEEDS BACKEND]`: the form's choices (`/api/bff/b2b/options`) and the editor's quantity prices (`extras/tier-prices`); Django already sent `tier_prices` on the storefront PDP. Haggling drafts (`NegotiationDraft`) have no screen (§10 keeps them hidden) — not wired.
- **Django provider**: `products/services/b2b_api_service.py` + `api/views_b2b.py`:
  - `GET orders/b2b-options/` → `{roles (active, system roles first), locations (active), multi_location, default_currency}` for `orders.create_b2b` or `orders.approve_b2b`.
  - `products/<id>/tier-prices/` GET (`inventory.view`) / POST `{min_quantity, price}` → 201 the new list (`catalog.manage`); `…/tier-prices/<tier_id>/` DELETE → the new list / 404 «السعر غير موجود.».
  - Rows `{id, min_quantity, price, display_price}` ascending (`format_money` in the product's currency); the mock's messages verbatim («أدخل عدداً صحيحاً موجباً.» · «يوجد سعر لهذه الكمية مسبقاً.» — also on the unique-constraint race · «أدخل سعراً صحيحاً.»); each add/delete writes a `tier_prices` row to the product change log under the actor's name.
- **Gaps closed in Django**:
  1. Quantity prices were shown on the PDP but never charged — new `products/services/tier_pricing.py` (`unit_price`: variant price ?? formula ?? highest tier ≤ quantity ?? base, like the PDP) used by `Cart.__iter__` (so cart, `/api/v1/cart/` and checkout charge it; `tier_prices` prefetched; local import inside `__iter__` to avoid a circular import) and by the B2B draft (each line = the tier price converted from the product's currency to the draft's — it used to store the raw product number in another currency).
  2. The drafts list was `orders.create_b2b`-only, so an approver holding `orders.approve_b2b` alone could not see what to approve — either key now.
  3. The list adds `created_by_name` (requester, else `created_by_staff`) and `escalated_at`, escalated first then newest (§8).
  4. Create refuses an unsupported currency («عملة غير مدعومة.») and, in a multi-branch store, a draft without a branch (it silently took the first one); only active branches are accepted.
  5. Resolve on an unknown approval → 404 «طلب الموافقة غير موجود.».
- **No migration**.
- **Frontend**: `api/bff/b2b/[[...path]]` → `options` via `liveOrMock(…, "b2b", "/api/v1/orders/b2b-options/", …)` (the mock-only `_test/bump` hook stays on the fixture); `lib/bff/live-products.ts` `B2B_LIVE_RULES` sends `products/<id>/extras/tier-prices[/<tier_id>]` to Django when `b2b` is live, independently of `products` (the other extras moved with INT-045); the mock refuses an unsupported currency like Django; `.env.example` lists `b2b`. `scripts/b2b-check.ts` gained a `requireMocks()` preflight.
- **Related**: approvals are resolved through M18 `resolve_order_approval` so the linked order follows the decision (INT-022); B2B drafts need a staff session (INT-007).
- **Tests**: `api/test_b2b_api.py` (8).

---
## Domain 10 — Inventory, locations & procurement (المخزون والمواقع والمشتريات)

| Task | Module | Live switch | Django provider | Routes |
|---|---|---|---|---|
| INT-024 | M21 Inventory | `inventory` | `products/services/inventory_service.py`, `api/views_inventory.py` | 8 routes |
| INT-025 | M22 Locations | `locations` | `products/services/location_service.py`, `api/views_locations.py` | 14 routes |
| INT-035 | M23 Suppliers & Purchase Orders | `procurement` | `products/services/procurement_service.py`, `api/views_procurement.py` | suppliers, purchase orders, form options, products |

**Domain relationship**: one stock ledger (`StockMovement`) fed by adjustments, write-offs, sales, returns, POS and PO receiving. With multi-location on, `LocationInventory` rows are the source and a mirror signal rewrites variant/product stock; otherwise variant stock → `recalculate_stock_from_variants`. Write-offs and purchase orders are approval-gated through the M18 queue (Domain 12). Returns restock (Domain 4) and POS sales (Domain 13) write into the same ledger.

### INT-024 — M21 Inventory (stock, movements, items, reservations, write-offs) — 2026-10-25
- **Before**: Django had only the HTML `inventory_hub_view` + `update_product_stock` (no JSON API).
- **Django provider**: `products/services/inventory_service.py` + `api/views_inventory.py` — 8 routes:
  - `inventory/` — one row per product, variants under it; parent = variant sum + worst status `out › backorder › low › in_stock`; status on location `available` when `?location` and multi-location is on; `q` with the shared Arabic normalization over name/SKU/barcode/variant SKUs; filters `status`/`category`/`is_serialized`; `reserved_total` = active unexpired `InventoryReservation`.
  - `counters/` (+ `pending_writeoffs`).
  - `export.csv` — BOM, one line per sellable unit, `reports.export`, audit-logged.
  - `adjustments/` — delta or `new_quantity`; reasons `manual_adjust`/`restock` only; note required when decreasing; no negative unless backorder; serialized/bundle/auction refused with the mock's messages; multi-location ⇒ `location_id` required and the `LocationInventory` row is the source (the existing mirror signal rewrites variant/product stock); otherwise variant → `recalculate_stock_from_variants`.
  - `movements/` — `net_delta`; filters product/variant/location/reason/from/to.
  - `items/`.
  - `reservations/` — an expired active hold is shown `released` (self-healing #33); ref `order:N` → order, `b2b:N` → b2b_draft, else cart.
  - `writeoffs/` GET/POST.
- **Gates**: plan feature `inventory` (legacy `require_feature`) + `inventory.view` / `inventory.adjust` / `inventory.writeoff`.
- **Gaps closed** (migration `products/0225_inventory_api`): `StockMovement.actor` / `quantity_after` / `reference_type` / `reference_id` (`record_stock_movement` fills actor from `acting_as` else «النظام» and the balance at write time; legacy rows: reference parsed from the note «طلب #N»/«أمر شراء #N», balance derived backwards from current stock; PO receiving now stores its reference + actor); `InventoryItem.location` / `order` (falls back to `meta.order_id`); `ApprovalRequest.payload` (write-off snapshot) and `ApprovalRequest.location` nullable (single-location stores — decided by the approver role at any location).
- **Write-off = approval**: POST creates `stock_writeoff` for «مدير المتجر», nothing deducted; M18 `approvals/<id>/resolve/` approved ⇒ `apply_writeoff` deducts in the same transaction (`manual_adjust`, reference `approval`), and if stock no longer covers it the decision is refused (400) and the request stays pending; the M18 approvals list now shows the quantity/note summary.
- **Frontend**: the 8 BFF handlers go through `liveOrMock(…, "inventory", …)`; the mock now pages `items`/`reservations` like Django (the tables use manual pagination).
- **Tests**: `api/test_inventory_api.py` (9).

### INT-025 — M22 Locations (locations, location inventory, location staff, routing rules) — 2026-10-25
- **Before**: Django had only the HTML screens (`products/views/locations.py`: list/form/toggle/mode, location inventory, staff) over the existing models.
- **Django provider**: `products/services/location_service.py` + `api/views_locations.py` — 14 routes:
  - `locations/` GET (`?q` Arabic-normalized over name/code/city, `flag`, `ownership`, `is_active`; parents first, each child right after its parent; `products_count` = distinct products with on-hand > 0; `multi_location_enabled`) · POST.
  - `locations/mode/` — the M34 `settings_service.set_multi_location` (409 + `conflicts` unless `merge`).
  - `staff-options/` (active `StaffMember`).
  - `routing-rules/` · `<pk>/` · `reorder/` (full id set only) · `preview/`.
  - `locations/<pk>/` GET/PATCH; `deactivation-impact/` (on-hand sum + open `Fulfillment`s pending/preparing/ready).
  - `inventory/` (below reorder point first; the reorder point falls back to the product's low-stock threshold); `inventory/adjust/` (INT-024 `inventory_service.adjust` with `location_id` forced); `inventory/<unit>/` PATCH (`p<pid>` | `v<vid>-<pid>`; creates the row; quarantine may not exceed on-hand − reserved).
  - `staff/` · `staff/<aid>/` — one operational role per staff per location (re-assigning replaces it).
- **Gates**: plan feature `multi_location` (legacy `require_feature`); defining locations/rules/mode is owner-only («إدارة المواقع مقصورة على مالك المتجر.»); reads any session; location stock `inventory.view`/`inventory.adjust`; assignments `staff.manage_assignments` and never on yourself (as M18).
- **Gaps closed** (migration `products/0226_locations_api`): `Location.external_refs` (generic `[{system, ref}]`, separate from the 3PL `LocationExternalRef` snapshot), `LockerDetails.provider_name` / `locker_code` (capacity ↔ `compartment_count`), `VehicleDetails.driver_phone` (falls back to the linked driver's phone).
- **Mapping**: franchise `contract_ends_at` ↔ `contract_end` (`contract_start` = creation day); supplier `contact` stored by channel (whatsapp → `supplier_contact_phone`, email → `supplier_email`, api_webhook → `api_endpoint_url`, http(s) only); conditional sections dropped when their trigger is off (a legacy `is_transient` locker is kept); virtual ⇒ no coordinates; parent cycles refused; routing priorities always renumbered 1..n, rule `name` generated, preview = first active matching rule (`location_routing_service._rule_matches`) else the first active shipping location. `display_type` stays Django's `Location.display_type` — the mock's derivation had drifted and now ports it verbatim.
- **Frontend**: the 14 BFF handlers go through `liveOrMock(…, "locations", …)`.
- **Tests**: `api/test_locations_api.py` (8).

### INT-035 — M23 Suppliers & Purchase Orders — 2026-10-25
- **Before**: every §7 row was `[NEEDS BACKEND]`; Django had `Supplier`, `PurchaseOrder`, `PurchaseOrderLineItem`, the approval/receive core (`purchase_order_service`: `po_approval` request, `StockMovement(po_received)`, `LocationInventory` or flat stock) and HTML screens only.
- **Django provider**: `products/services/procurement_service.py` + `api/views_procurement.py`:
  - `suppliers/` GET `?q&page` · POST; `suppliers/<id>/` GET/PATCH/DELETE.
  - `purchase-orders/` GET `?status&supplier&location&from&to&q&page&page_size` (q = supplier name, line SKU, or the number `PO-0012`/`12`) · POST draft; `form-options/`; `products/?q` (products + variants, cost converted to the store currency; serialized/bundle/auction excluded).
  - `<id>/` GET (lines, approval {status, approver, approver_role}, approver, timeline) · PATCH (draft only, optional `version`).
  - `<id>/submit|resolve|receive|cancel/` with `version` (409 «حُدِّث الأمر من مستخدم آخر.» + current version).
- **Gates (FR-23.01)**: read `suppliers.manage` OR `suppliers.approve`; writes `suppliers.manage`; the decision `suppliers.approve` (self-approval 403 from `ApprovalRequest.resolve`); no plan feature (the legacy screens have none).
- **Gaps closed** (migration `0230_procurement_api`): `Supplier.address` / `tax_number`, phone optional (`SupplierForm`); `PurchaseOrder.notes` / `version` / `updated_at` (backfilled from created_at); `number` = `PO-0001` (derived, also used by the M18 approvals card).
- **Timeline (FR-23.08)**: `AuditLog` `po.<kind>` events written by the shared service (created/updated/submitted/approved/rejected/received with quantities/cancelled); legacy orders get a derived «created».
- **Rules changed in the shared service** (legacy screens + M18 queue follow): reject → `draft` (spec §5; Django cancelled it); every transition bumps `version`; cancel allowed from any non-final status (FR-23.04) and closes a pending `po_approval` as rejected «أُلغي أمر الشراء.» (the legacy cancel keeps its draft-only limit); receive checks the LOCKED row's status.
- **Bug fixed**: receiving a variant line in flat-stock mode left `Product.stock` stale (no `recalculate_stock_from_variants`).
- **Other rules**: supplier name unique case-insensitively; delete refused 409 while ANY order references it (PROTECT — deactivate instead; mock aligned); quantities whole numbers, unit cost ≤ 2 decimals in the order currency (store currency at creation); single-location stores use the first active location.
- **Frontend**: both BFF catch-alls → `liveOrMock(…, "procurement", "/api/v1/<resource>/<path>/")`; `.env.example` adds `procurement`; mock aligned (unique name, delete blocked by any order).
- **Tests**: `api/test_procurement_api.py` (9) + the three legacy supplier suites (reject test updated) + staff/inventory/reports green.

---

## Domain 11 — Shipping, couriers & Sharwa Ship (الشحن والمندوبون وشروة شيب)

| Task | Module | Live switch | Django provider | Routes |
|---|---|---|---|---|
| INT-021 | M15 Shipping | `shipping` | `products/services/shipping_service.py`, `api/views_shipping.py` | 25 routes |
| INT-046 | M38 Courier App | `courier` (4 reads) · none (5 actions via passthrough) | `products/services/courier_app_service.py`, `api/views_courier.py`, `api/views.py` (actions) | `agent/*` |
| INT-047 | M39 Sharwa Ship | `sharwa_ship` | `products/services/sharwa_ship_api_service.py`, `api/views_sharwa_ship.py` | 12 routes under `shipping/` |

**Domain relationship**: M15 configures delivery (methods, pickup points, own fleet providers, 3PL carriers, zones, packaging, restrictions, SLAs); M39 operates the platform's own carrier «شروة شيب» (waybills charged to the merchant's Sharwa Pay wallet, shipments state machine, AWB queue, rate cards, courier supervision); M38 is the courier's mobile app. All shipment status changes go through the single gate `apply_shipment_transition`; shifts and custody move with `transfer_shift` / `transfer_custody`. Platform-level Sharwa Ship zones are administered in the console (Domain 16, INT-031) and read here.

### INT-021 — M15 Shipping (settings, delivery methods, pickup locations, providers, carriers, zones, packaging, edge cases) — 2026-10-24
- **Before**: Django had only HTML screens (`shipping_companies`, `shipping_providers`, `pickup_locations`, `carrier_settings`, `packaging_profiles`, `zone_review`, `update_address_in_transit`, `convert_order_to_pickup`).
- **Django provider**: `products/services/shipping_service.py` + `api/views_shipping.py` — 25 routes: `shipping/settings/` (the M34 row via `settings_service.patch_shipping`), `shipping/delivery-methods/` · `<pk>/`, `shipping/pickup-locations/` · `<pk>/` · `reorder/` (+ M22 `pickup_point_locations` hint), `shipping/providers/` · `<pk>/` · `staff-options/`, `shipping/carriers/` · `<code>/` · `credentials/` · `test/`, `shipping/sharwa-ship/zones/` (public `SharwaShipZone`, read-only), `shipping/packaging-profiles/` · `<pk>/`, `shipping/zone-review/` · `<order_id>/resolve/`, `shipping/restricted-zones/` · `<pk>/`, `shipping/sla-rules/` · `<pk>/`, `shipping/edge-cases/`, `shipments/<pk>/address/`, `orders/<pk>/convert-to-pickup/`.
- **Gates**: owner only for settings (staff 403 «إعدادات الشحن مقصورة على مالك المتجر.»); edge cases `orders.view`; address/convert `orders.update_status`; plan features = the legacy `require_feature`: `shipping_settings`, `shipping_companies` (methods), `pickuplocation`, `shipping_providers`.
- **Rules kept from Django (frontend aligned)**: the official «شروة شيب» method is editable for price/time/active only — name fixed, delete 403, a disabled one leaves the merchant's list (`shipping_companies_view`) — `delivery-methods.tsx` now opens it with a read-only name, delete stays blocked; a provider with past orders → 409 (disable instead); `staff_account` is OneToOne (one staff ↔ one agent, never a terminated one, never on a carrier company); carrier `credential_fields` come from `CARRIER_REGISTRY` (aramex: username/password/account_number/account_pin; smsa: username/password — mock aligned) and live in `ThirdPartyLogisticsClientAgreement` (`merchant_own`): no secret ever leaves the service (`value` only for non-secret fields; the platform's shared account is never exposed), an empty secret keeps the stored one, `test` = new `CarrierAdapter.test_connection()` (aramex: server reachability; smsa: not wired yet) and a failure flips the carrier to `error` for 24 h.
- **Bugs fixed**: `resolve_carrier_credentials` and `carrier_settings_save_view` read `connection.schema_name` inside `schema_context('public')` → the merchant's own credentials were never found / were saved against the public tenant; aramex `account_pin` is now a secret (SC-15.4); `convert_order_to_pickup` also cancels `label_pending` waybills (allowed transition, they stayed active).
- **Gaps closed** (migration `0222_shipping_api`): `Order.delivery_latitude/longitude` (the checkout now stores the buyer's coordinates) + `zone_review_resolved_at`; `RestrictedZonePolygon.reason`; `DeliverySLARule` by zone and/or delivery method (`source_location` optional, new `delivery_method` FK — origin rules keep serving `resolve_delivery_sla`).
- **Mapping**: polygons `[[lat,lng]]` ⇄ Django `[{lat,lng}]` (what `point_in_polygon` reads); packaging grams ⇄ `box_weight_kg`; zone review = open, unresolved, not-yet-picked-up delivery orders inside an active restricted polygon (`restricted_polygon`), or flagged by a deactivated zone / outside every active Sharwa Ship zone for an official-method order (`outside_zone`); resolve `confirm` · `convert_pickup` (same path as `PATCH orders/<id>/`) · `cancel` = cancel the not-yet-picked-up waybills (fees waived), order kept; edge cases = `ShipmentEvent` flags (`out_of_order` / `flagged_for_review` / `is_rejected`, readable notes from `rejection_reason` / geofence payload) + SLA breach (open waybills past `created_at + sla_hours`: zone+method ⟵ zone ⟵ method ⟵ 72 h); address update only `in_transit`, writes a `merchant_manual` event + order timeline + `version`; convert-to-pickup uses the order `version` (409 `{detail, current_version, status}`), blocked from `picked_up` on.
- **Frontend**: the 25 M15 BFF rows → `liveOrMock(…, "shipping", …)`; schemas: provider limits nullable (legacy rows show «—»), review `latitude/longitude` nullable (listed, not drawn), carrier `credential_source` / `platform_enabled` (notes on the carrier screen; save disabled until the platform enables the carrier); zones without a centre are not drawn; `.env.example` adds `shipping`.
- **Out of scope (their tasks)**: Sharwa Ship ops — shipments, AWB queue, rate cards, supervisor, agent shifts (INT-046/INT-047, done).
- **Tests**: `api/test_shipping_api.py` (9, plus the carrier/zone/orders/checkout/settings/tracking suites re-run green).

### INT-046 — M38 Courier App (agent shipments, shifts, custody) — 2026-10-26
- **Before**: the five actions (`agent/shifts/start/` · `end-and-handover/` · `shipments/<id>/status/` · `fulfillments/<id>/scan-pickup/` · `partial-delivery/`) were Ready through the `/api/v1/*` passthrough (their POSTs reach Django with a body since the same-day `upstream.ts` fix); the four reads were `[NEEDS BACKEND]`: Django had `ShipmentOrder` + `ShipmentEvent`, `CourierShift`, `CourierCustodyLedger` (`get_courier_balance`) and HTML screens only.
- **Django provider**: `products/services/courier_app_service.py` + `api/views_courier.py`:
  - `agent/me/` → `{agent:{id,name}, open_shift, display_balance, currency}`.
  - `agent/shipments/?status` → `{count, counts (4 tabs + other), results}` (= shipments whose `Fulfillment.shipping_provider` is me — what `transfer_shift` moves on handover; `display_cod_amount` = the fulfillment's lines × price in the order's currency, what `finalize_partial_delivery` records).
  - `agent/shipments/<id>/` (+ items with delivered quantity/reason, `allowed_transitions` from `ALLOWED_TRANSITIONS`, events newest first with the actor's name; 404 for another agent's shipment).
  - `agent/custody/?page` (50/page, `sign` from the entry type, linked waybill).
- **Identity** = the mock gate verbatim: no session 401, owner 403 «هذا التطبيق لحسابات المندوبين…», staff without a provider profile 403, inactive profile 403; a multi-currency ledger shows one total per currency.
- **Contract fixes on the Ready rows** (Zod would reject them): start → `agent: {id, name}` + `closed_previous_shift_id`; handover → `handed_over_to: {id, name}`; partial delivery → `display_collected_amount`, `status`, numbers (not null) on a duplicate (`format_money` used).
- **Gaps closed (security)**: an agent could end/hand over ANY shift, move ANY shipment, scan or deliver ANY fulfillment — now only his own (404 otherwise, `_agent_owns`); the owner keeps acting for any agent via `agent_id`; a closed shift cannot be ended again; handover to oneself or to an inactive agent is refused; an inactive agent profile cannot act (`_resolve_agent`).
- **No migration**.
- **Related test fix**: `products/test_cod_collection.py` stale assertion now expects the service's string `'10.00'`.
- **Frontend**: `api/bff/agent/[...path]` → `liveOrMock(…, "courier", "/api/v1/agent/<path>/", …)` with the previous fixture behind it (non-GET → 405 in mock); `.env.example` lists `courier`.
- **Tests**: `api/test_courier_api.py` (6).

### INT-047 — M39 Sharwa Ship (shipments, AWB queue, rate cards, supervision) — 2026-10-26
- **Before**: every M39 §7 row was `[NEEDS BACKEND]` except the zones list (live on `shipping` since INT-021); Django had the whole domain — `issue_waybill` (Sharwa Pay charge atomic with the AWB, weight + split + hazard + marketplace guards, `WaybillRegistry`), `ShipmentOrder`/`ShipmentEvent` behind `apply_shipment_transition`, `PendingAWBQueue` + its Celery retry, `CarrierRateCardSnapshot`, shifts/custody + `transfer_shift`/`transfer_custody` — with HTML screens only.
- **Django provider**: `products/services/sharwa_ship_api_service.py` + `api/views_sharwa_ship.py` — 12 routes under `/api/v1/shipping/`:
  - `sharwa-ship/pending-orders/` — orders without any waybill in a pending status (new / awaiting_payment / payment_review / pending_payment), newest 50, weight preview + expected AWB count from `calculate_chargeable_weight` / `split_fulfillment_into_awbs`.
  - `sharwa-ship/orders/<id>/waybill/` `{zone_code}` — 201 the detail; `WaybillError` / weight / hazard → 400 `{detail}`; Django SPLITS a heavy fulfillment into a master + children where the mock refused it.
  - `shipments/` — masters only, filters `status · billing_status · carrier · q · from · to`, counts.
  - `shipments/<id>/` — children, items + unit prices, COD, events newest first with the actor's name and geo, allowed transitions; `version` = accepted transitions + 1 (no version column).
  - `shipments/<id>/status/` — `merchant_manual` through the single transition gate: 200 with `accepted:false` + reason on a refused move.
  - `shipments/<id>/assign/` `{agent_id}` — `transfer_custody` on the fulfillment.
  - `awb-queue/` + `<id>/retry/` — failed only, 409 otherwise; queues the tenant retry task (`retry_pending_awb_issuance_for_tenant`) on commit.
  - `rate-cards/` — drift vs the last confirmed price; never confirmed = awaiting.
  - `supervisor/` — agents = providers without a carrier code: open shift, active fulfillments, balance; Sharwa Ship waybills without an agent; the last 100 COD reversals.
  - `agents/<id>/emergency-reassign/` `{new_agent_id}` — `transfer_shift`: fulfillments + custody, `{detail, moved_shipments, display_balance_moved}`.
  - `agent-shifts/`.
- **Gates** = the mock router: feature `sharwa_ship` (the courier-supervision rows also open with `shipping_providers`, Phase 7 decision 3); reads `orders.view`; writes + supervision the owner. Messages: «ميزة شروة شيب غير مفعّلة لمتجرك.», «الإشراف على المندوبين يتطلب «شروة شيب» أو التوصيل المحلي.», «ليست لديك صلاحية لعرض الشحنات.», «هذا الإجراء مقصور على مالك المتجر.».
- **Mapping**: `zone_code` is derived from the snapshotted zone name (no stored code on the waybill).
- **No migration**.
- **Frontend**: the seven `/api/bff/shipping/{sharwa-ship,shipments,awb-queue,rate-cards,supervisor,agents,agent-shifts}` adapters → `liveOrMock(…, "sharwa_ship", "/api/v1/shipping/<path>/", …)` with the fixture behind the switch; `.env.example` lists `sharwa_ship`.
- **Note**: issuing a real waybill debits the fee from the store's Sharwa Pay wallet.
- **Tests**: `api/test_sharwa_ship_api.py` (7).

---
## Domain 12 — Store settings, staff & permissions, domains & integrations (الإعدادات والفريق والصلاحيات والتكاملات)

| Task | Module | Live switch | Django provider | Routes |
|---|---|---|---|---|
| INT-010 | M34 Store Settings | `settings` | `products/services/settings_service.py`, `api/views_settings.py`, `StoreConfigSerializer` | `settings/`, 8 section PATCHes, `settings/multi-location/`, `/config/` extensions |
| INT-022 | M18 Staff & Permissions | `staff` | `products/services/staff_service.py`, `api/views_staff.py` | 26 routes |
| INT-023 | M19 Domains & Integrations | `integrations` | `api/views_integrations.py` over `domain_service.py`, `integrations_service.py`, `webhook_service.py` | 13 routes |

**Domain relationship**: settings are the single row other modules reuse (`patch_shipping` by M15, `patch_announcement` by M08, `patch_payments` by M14, `set_multi_location` by M22); M18 is the authority for every permission key, the approvals queue (write-offs, POs, B2B, POS shortages/discounts) and staff identity; M19 owns custom domains (public `CustomDomain` → `tenants.Domain`), tracking pixels (also served by `/config/`) and outgoing webhooks wired into order/shipment/product/inventory events.

### INT-010 — M34 Store Settings (identity, contact, policies, shipping, currency/FX, SEO, announcement, payments, multi-location) — 2026-10-24
- **Before**: Django had only the seven HTML forms + two toggle views.
- **Django provider**: `products/services/settings_service.py` + `api/views_settings.py`:
  - `GET settings/` — the whole row = `settingsSchema`, no `admin_password`; `display_*` in YER_NEW; `fx_preview` for 100 SAR; `store_url` from the tenant's primary domain; `pending_payment_orders`.
  - `PATCH settings/<identity|contact|policies|shipping|currency|seo|announcement|payments>/` and `POST settings/multi-location/` — each write returns the full row; field errors `{field:[msg]}` with the mock's messages.
- **Rules kept from Django**: plan feature per section = the legacy `require_feature` (contact_info, store_policies, shipping_settings, currency_settings, seo_settings, coupon, multi_location); «at least one payment method» guard (manual + Sharwa Pay + gateways); owner-only money/structure; text sections for owner or `catalog.manage`.
- **SEO image**: `Base64ImageField` (data URL in, absolute URL out, existing URL = unchanged, null = remove).
- **Announcement**: an enabled bar needs text (checked on the merged row).
- **Multi-location off** with stock in > 1 location → readable 409 `{detail, conflicts}` unless `merge: true` (Product.stock already mirrors the location sum, so nothing moves).
- **Gap closed in the model**: FX rates widened to 4 decimals (`0217_storesetting_fx_rate_precision`) — the contract accepts e.g. `3.7525`.
- **`/api/v1/config/` extensions handed over by INT-002 now served** by `StoreConfigSerializer`: card border, announcement colours/speed/page flags, free-shipping threshold, currency, SEO (+ absolute OG image), contact links, about/return policy, timezone, week start (gifting/loyalty → INT-019, tracking → INT-023).
- **Frontend**: BFF `settings` + 9 section rows → `liveOrMock(…, "settings", …)` via `settingsWrite(upstream, …)`; the mock's multi-location 409 text now matches Django.
- **Tests**: `api/test_settings_api.py`.

### INT-022 — M18 Staff & Permissions (staff, roles, permissions, approvals, audit log, behavior alerts) — 2026-10-25
- **Before**: Django had only the HTML screens (`staff_list_view`, `roles_list_view`, `staff_detail_view` + end sessions, `approval_requests_view` / `resolve_approval_view`, `audit_log_view` / `verify_audit_chain_view`, `behavior_alerts_view`).
- **Django provider**: `products/services/staff_service.py` + `api/views_staff.py` — 26 routes: `staff/` · `counters/` · `<pk>/` · `terminate/` · `revoke-sessions/` · `reset-password/` · `assignments/` · `overrides/` (+`<oid>/`) · `effective-permissions/` · `sessions/` (+`<sid>/`) · `tokens/` (+`<tid>/`) · `devices/` (+`<did>/`) · `roster/`, `permissions/`, `roles/` · `<pk>/`, `approvals/` · `<pk>/resolve/`, `audit-log/` · `verify/`, `behavior-alerts/` · `<pk>/read/`.
- **Gates**: plan feature `staff_rbac` (legacy `require_feature`), then the M18 keys exactly as the BFF mocks (`staff.view` · `staff.manage` · `staff.manage_roles` · `staff.manage_assignments` · `staff.view_sessions`); audit log = `staff.view_sessions` OR `reports.sales.view` (the legacy `audit_log_view` key); a member can never edit their own assignments/overrides (403) nor terminate themselves.
- **Rules kept from Django**:
  - staff = phone + `auth.User` (username = phone, `customer_key` normalisation so 077…/77…/96777… is one number, duplicates checked across forms);
  - termination is soft (`terminated_at`, `is_active=False`, `token_version+1`, sessions + tokens revoked, audited `staff.terminate`);
  - effective permissions = the `permission_resolver` order (active location roles ∪, then global + that location's overrides) — verified equal to `resolve_context()`;
  - approvals through `ApprovalRequest.resolve()` (optimistic lock → 409, self-approval → 403), PO via `resolve_purchase_order` and B2B via `resolve_order_approval` so the linked order/PO follows the decision (the legacy HTML resolve skipped that for B2B); a staff decider must hold the request's `approver_role` at its location or `staff.manage`;
  - deleting a role assigned to staff → 403 + the staff list; used as an approver role → 409 (PROTECT);
  - `AuditLog` read-only + `verify_chain()` (`broken_at` = row number in insert order).
- **Frontend rule kept**: system roles read-only (FR-18.04) — the legacy roles screen let the owner edit them.
- **Gaps closed**:
  1. Staff sign in with phone + PASSWORD (`auth/staff/login/`, INT-003) but the form had no password («رمز تحقق» text was wrong) → create returns a `temporary_password` ONCE and the new «كلمة مرور مؤقتة جديدة» action (`reset-password/`, ends every session) issues another — new `PasswordOnceDialog`, sheet copy fixed, mock + BFF row added.
  2. `enforce_roster_schedule` was never enforced → `auth/staff/login/` now refuses a login outside the weekly roster (store timezone, 0 = Sunday; no roster rows = no restriction).
  3. Migration `0223_staff_api`: `StaffSession.device_label` («Chrome · Android», filled at both logins), `PersonalAccessToken.name/last_used_at` (raw `shw_pat_…` returned once, SHA-256 stored, 90-day expiry), `TrustedDevice.staff/last_seen_at` (removal = deactivate), `RosterSchedule.location` nullable (the dashboard grid is store-wide), `BehaviorAlert.value/limit` (written by `behavior_service`; legacy rows parsed from `detail`).
- **Mapping**: permission categories seeded in English (`orders`, `staff`…) are served in Arabic; `ApprovalRequest` has no snapshot → `payload` / `summary` / `entity` derived from `target_ref` + `amount` (order, PO, shift, product; `available=false` when gone/cancelled); owner actions show «مالك المتجر»; alerts whose member row is gone come back with `staff_id: null` (schema nullable, actions hidden).
- **Not built (no Django model)**: IP allow-list addresses for `enforce_ip_whitelist` — the toggle and its warning stay as they are.
- **Later extensions of the approvals queue**: write-offs (INT-024), POS shortages and discount exceptions (INT-033), purchase orders (INT-035), B2B (INT-044).
- **Frontend**: the 25 M18 BFF rows + the new reset-password row → `liveOrMock(…, "staff", …)`; `.env.example` adds `staff`.
- **Tests**: `api/test_staff_api.py` (9, plus auth/notifications/dashboard/customers/orders/suppliers/staff legacy suites re-run green — 101).

### INT-023 — M19 Domains & Integrations (domains, tracking pixels, webhooks, integration status) — 2026-10-25
- **Before**: Django had only `TrackingSettings` + its HTML form and the `_tracking_scripts.html` partial — no custom-domain flow, no outgoing webhooks, no status overview.
- **Django provider**: `api/views_integrations.py` (13 routes, owner-only per FR-19.09 — a staff session gets 403 `<what> مقصورة على مالك المتجر.`) over three services.
- **Domains** (`products/services/domain_service.py` + public model `tenants.CustomDomain`, migration `tenants/0026_customdomain`):
  - the merchant's claim lives apart from `tenants.Domain` so nobody can squat a hostname before proving it;
  - `GET domains/` = subdomain row `id 0` (read-only, primary when no custom domain is) + claims;
  - `POST` validates with the frontend's `domainFormatError` text, refuses duplicates / another store's domain / > 5;
  - records = CNAME (sub) or A (apex) to `SHARWA_EDGE_CNAME`/`SHARWA_EDGE_IP` + TXT `_sharwa.<host>`;
  - `verify/` checks TXT + routing via dnspython (503 if unavailable) → `failed` with a reason, or creates the `tenants.Domain` row → `verifying` → `active` once HTTPS answers (TLS issuance stays the ops step in `deploy/README`);
  - `set-primary/` only for `active` (0 = back to the subdomain) and mirrors `StoreSetting.custom_domain` for the legacy consumers;
  - DELETE refuses the subdomain and the primary.
- **Tracking** (`integrations_service.py`): `GET|PATCH store/tracking/` behind feature `tracking_tools`; CAPI tokens write-only (`has_*`; empty keeps, null clears, < 10 or > 255 refused); ids ≤ 50 / Ads label ≤ 100 with no whitespace or `<>"'`.
- **`/config/` extension handed over by INT-002 now served**: `tracking` = public ids only (null when off or not in the plan).
- **Gap closed in the storefront**: nothing injected pixels — added `features/storefront/components/tracking-scripts.tsx` (the same GTM/Meta/TikTok/Snap/gtag snippets as Django, ids JSON-escaped, page-view on client navigation, inert in the theme-preview frame) in the storefront layout, plus the Google Ads purchase conversion on `checkout/success/[public_uuid]` (once per order).
- **Webhooks** (`webhook_service.py` + `WebhookEndpoint` / `WebhookDelivery`, migration `0224_webhooks`):
  - https-only + SSRF guard (internal hosts and non-global IPs refused at save and re-checked at send, no redirects);
  - secret `whsec_…` encrypted and returned once (create/rotate);
  - signature `X-Sharwa-Signature: t=<ts>,v1=HMAC-SHA256(secret, "<ts>.<body>")` + `X-Sharwa-Event` / `X-Sharwa-Delivery`;
  - Celery `deliver_webhook` with 3 automatic attempts (60 s, 300 s), auto-disable after 10 consecutive failures (re-enable resets);
  - log with status/event/date filters; redeliver = new attempt for failed rows only; synchronous test event.
  - **Events wired**: `order.created` / `order.status_changed` (order_events), `order.fulfillment_changed` (`Order.set_fulfillment_status`), `order.refunded` (refund_service), `shipment.event` (accepted transitions), `product.updated` (change log, stock-only excluded), `inventory.low_stock` (Beat `dispatch-low-stock-webhooks` every 15 min, once per entry into the low range — stock moves via `F()` and never hits `save()`).
- **Status** `GET integrations/status/`: 13 rows aggregated read-only from app installations, channel health, marketplace/supplier connections and carrier state; a staff member sees only the rows they hold the permission for; out-of-plan rows `available:false`.
- **Frontend**: 13 routes → `liveOrMock(…, "integrations", …)`; parity — tracking input limits = Django columns, `store-config.tracking` nullable + Ads fields, mock subdomain id 0, mock tracking limits.
- **New deps/env**: `dnspython`, `SHARWA_EDGE_IP`, `SHARWA_EDGE_CNAME`.
- **Tests**: `api/test_integrations_api.py` (21).

---
## Domain 13 — Sales channels & operations: inbox, marketplaces, dropshipping, POS, bookings (القنوات والأسواق والدروبشيبينغ ونقطة البيع والحجوزات)

| Task | Module | Live switch | Django provider | Routes |
|---|---|---|---|---|
| INT-037 | M27 Unified Inbox & Social Channels | `channels` | `products/services/social_channels/{inbox_api_service,channels_api_service}.py`, `api/views_channels.py` | 21 routes (`inbox/*`, `channels/*`) |
| INT-038 | M28 Marketplaces | `marketplaces` | `products/services/marketplaces/api_service.py`, `api/views_marketplaces.py` | 14 routes |
| INT-039 | M29 Dropshipping | `dropshipping` | `products/services/suppliers/api_service.py`, `api/views_dropshipping.py` | 27 routes under `dropshipping/` |
| INT-033 | M16 Point of Sale | `pos` | `products/services/pos_service.py`, `api/views_pos.py` | 15 routes under `pos/` |
| INT-036 | M26 Bookings | `bookings` (merchant) · none (buyer rows) | `products/services/booking_service.py`, `api/views_bookings.py` | `bookings/*`, `catalog/products/<id>/slots/*` |

**Domain relationship**: every external channel already had its Django domain (encrypted `StoreAppInstallation` credentials + public bridge indexes, adapters, Celery jobs); the APIs expose them without a second engine — the legacy HTML screens and the new APIs call the same services. Orders created by channels (chat-to-order, marketplace orders, dropship forwarding, POS sales, booked services) are real M06 orders (Domain 4) with their `sales_channel`. OAuth flows started from Next come back with `?connected=<code>` or `?oauth_error=<reason>` and store a validated same-store `/dashboard/…` return URL (no open redirect).

### INT-037 — M27 Unified Inbox & Social Channels — 2026-10-25
- **Before**: every §7 row was `[NEEDS BACKEND]`; Django had the domain (`Conversation`, `Message`, `ConversationKeywordTrigger`, `ChannelCatalogSync` / `ChannelCategoryMapping` / `ChannelProductLink`, `StaffChannelAccess`, `ChannelOrderRoutingSettings`), the encrypted `StoreAppInstallation` + public `ChannelSessionIndex` bridge, webhooks → `process_inbound_channel_message`, outbound `dispatch_channel_message` and HTML screens only.
- **Django provider**: `products/services/social_channels/{inbox_api_service,channels_api_service}.py` + `api/views_channels.py` — 21 routes: `inbox/counters|conversations|conversations/<id>|…/messages?after|…/convert-to-order|products`, `channels/`, `channels/telegram/connect`, `channels/<code>/disconnect`, `channels/<code>/oauth/start?return=`, `channels/keywords[/<id>]`, `channels/templates[/<id>]`, `channels/<meta|tiktok>/catalog-sync[/run]`, `channels/<code>/products[?sync_status]`, `…/products/<id>/resync`, `channels/tiktok/categories`, `channels/tiktok/category-mapping`, `channels/staff-access`.
- **Gates (FR-27.01 = the mock)**: session 401 → plan feature `social_channels` 403 → inbox for `channels.inbox.access` (owner always) then `StaffChannelAccess` inside the service (no rows = every channel, first row = whitelist; hidden conversation = 404; `can_reply` false = 403) → channel settings owner-only 403 «إعدادات القنوات لمالك المتجر فقط.», except the template list for every inbox member (`/` picker).
- **Code mapping (one place)**: UI `meta · tiktok · telegram (+whatsapp)` ⇄ Django `meta_social_commerce · tiktok_shop · telegram_bot · whatsapp`; conversation channel `facebook|instagram` from the new `Conversation.source_platform` (Meta webhook `object=page|instagram`; legacy rows = facebook); unknown codes never listed.
- **Rules (Django is the authority)**:
  - a reply is saved at once as `Message(staff, status='queued')` → API `status: null` («جارٍ الإرسال») and dispatched on the channel's queue with the same `AppUsageLog`; `dispatch_channel_message(message_id=…)` now updates THAT row (`sent` + external id, or `failed` + the provider's reason in `error_detail` — e.g. Meta's 24 h window, shown verbatim) instead of adding a «bot» row;
  - `client_id` unique (body or `Idempotency-Key`) ⇒ a retry returns the first message (200); a template fills an empty text; `product_id` = product card (`compose_product_message` text + image sent, `Message.product` shown); channel disconnected ⇒ 409 «القناة غير مربوطة — لا يمكن الردّ.»;
  - a new inbound message reopens a `resolved`/`pending` conversation (US-27.3.2 — Django never did);
  - convert-to-order = the legacy `chat_to_order_service` (stock locked + decremented, shortage ⇒ `is_backordered` not refused, `sales_channel='chat'`, channel traffic source, channel default fulfilment status) + 409 «المحادثة مرتبطة بالطلب #…» + confirmation message in the thread;
  - telegram connect = getMe → setWebhook → install + bridge (400 `{bot_token}`); disconnect clears the encrypted credentials + bridge rows and deactivates (conversations stay read-only);
  - OAuth start builds the same provider URL as the legacy screen, stores a validated return URL (same store host, `/dashboard/…` — no open redirect) and the callback comes back with `?connected=<code>` or `?oauth_error=<reason>` (legacy hub flow unchanged);
  - connection error = the health task's `connection_health='unhealthy'`; secrets never returned (FR-27.08).
- **Catalog sync**: run = 409 when not connected / unhealthy, else `last_run_at` + the existing Celery `sync_channel_catalog`; report = `ChannelProductLink` counts per status; per-product resync = new task `sync_channel_product`; keywords unique case-insensitively whatever the match type (Django `unique`); staff-access save writes the staff's 4 rows at once (one toggle no longer silently hides the other channels) and folds reply-without-view.
- **Gaps closed** (migration `0231_inbox_api`): `Conversation.source_platform`, `Message.status 'queued'` + `error_detail` + `client_id` + `product`, `ChannelCatalogSync.last_run_at`, `ChannelReplyTemplate` (staff quick replies — Django only had system notification templates).
- **Bugs fixed**: chat-to-order wrote every order in a fixed 'SAR' summing each product's own-currency price (now the store currency, prices converted like M06) and wrote no timeline event.
- **Open (Django rule kept, pinned by `test_social_channels_phase2`)**: a product syncs to Meta only with a Meta category mapping, but neither the legacy screens nor the contract offer a Meta mapping screen (only TikTok) — Meta sync reports every unmapped product as «لا يوجد ربط تصنيف…». TikTok categories = static starter list (Django has no TikTok category API client yet) + any code saved from the legacy free-text screen.
- **Frontend**: `api/bff/inbox/[...path]` + `api/bff/channels/[[...path]]` → `liveOrMock(…, "channels", "/api/v1/<inbox|channels>/<path>/")` (`inbox/_mock/*` stays fixture-only); `.env.example` adds `channels`; `whatsapp` added to the conversation channels and the staff-access matrix (a WhatsApp conversation would have failed the list's Zod parse); OAuth link passes `?return=` and the page toasts `?oauth_error=`; Telegram with an error shows the token form (no OAuth for Telegram); mock aligned (keyword unique per word, WhatsApp access rows).
- **Tests**: `api/test_channels_api.py` (10) + the 8 legacy `products.test_social_channels_phase*` suites.

### INT-038 — M28 Marketplaces (Amazon/Noon listings, sync jobs, orders) — 2026-10-26
- **Before**: every §7 row was `[NEEDS BACKEND]`; Django had the full domain (`MarketplaceSettings`, `MarketplaceListing`, `MarketplaceSyncJob`, `MarketplaceFeed`, `MarketplaceOrderDetail`), the encrypted install + public bridge (`connection_service`), Amazon SP-API OAuth + the noon adapter (fake by `NOON_MARKETPLACE_ADAPTER`), single/bulk push (`listing_service`, `bulk_sync_service` Feeds above 20), order pull / FBA inventory (one live job per market), automatic shipment confirmation and HTML screens only. No migration needed.
- **Django provider**: `products/services/marketplaces/api_service.py` + `api/views_marketplaces.py` — 14 routes: `marketplaces/`, `amazon/oauth/start?return=`, `noon/connect`, `<market>/disconnect|settings|listings|listings/<id>|listings/push|jobs`, `jobs/`, `jobs/<id>/`, `jobs/<id>/errors.csv/`, `orders/`, `orders/<order_id>/confirm-shipment/`.
- **Gates (FR-28.01 = legacy + mock)**: session 401 → M18 `channels.marketplaces.manage` 403 → plan feature `marketplaces` 403 «ميزة الأسواق الإلكترونية غير مفعّلة في خطتك.».
- **Rules (Django is the authority — same services as the legacy screens)**:
  - a listing row per available product/variant per market — Django creates them lazily: `materialize_listings` bulk-creates the missing ones as `needs_identifier`/unpublished (no auto-push effect);
  - price = override, else store price → SAR → × fx → × (1 + markup) (`compute_effective_price`); `display_computed_price` the same without override;
  - identifier = a type the market's adapter supports (Amazon asin/ean/upc/gtin, noon nsku/ean/gtin) + the contract's format check (ASIN `B0…`, EAN 13, UPC 12, GTIN 8–14, NSKU) → `set_identifier` (unpublished until pushed);
  - push = 409 when not connected / re-auth; listings without an identifier recorded in the same job as `NO-ID` errors; the rest marked published and pushed (bulk Feeds job above 20 on Amazon — 409 while one runs — else one task per listing on the job);
  - `order_pull` / `fba_inventory` = the legacy start functions (409 when one is live; FBA only where the adapter supports it);
  - job view = counters + `triggered_by` label + summary (order pull created/updated/skipped, general error) + CSV link (the legacy streamed CSV + the NO-ID rows);
  - marketplace orders = `MarketplaceOrderDetail` (`status_class`, fulfilment, confirmation mapped `'' → not_required`, `needs_tracking|queued → pending`);
  - «إعادة تأكيد الشحنة» = Django's `retry_failed_confirmation` only (confirmation is automatic on tracking entry — 409 unless failed, 409 for marketplace-fulfilled / already confirmed).
- **Gaps closed**: noon connect needs the seller id + country (SA/AE → market currency) — the frontend only sent the API key (dialog + mock aligned); `import_marketplace_fulfilled_orders` had no frontend toggle (added to the contract + settings); `auto_push` relabelled to what Django does (re-send price/stock changes of published listings, not «publish new products»); Amazon OAuth from Next stores a validated return URL and the callback pins amazon.sa automatically (the legacy «confirm, not choose» step) then returns `?connected=amazon` or `?oauth_error=` (toast) — the legacy hub flow is unchanged.
- **Frontend**: `api/bff/marketplaces/[[...path]]` → `liveOrMock(…, "marketplaces", "/api/v1/marketplaces/<path>/")`; `.env.example` adds `marketplaces`; `scripts/marketplaces-check.ts` follows the new noon dialog.
- **Tests**: `api/test_marketplaces_api.py` (9) + the 5 legacy `products.test_marketplaces_phase*` suites.

### INT-039 — M29 Dropshipping (supplier connections, pricing rules, feeds, supplier orders) — 2026-10-26
- **Before**: every §7 row was `[NEEDS BACKEND]`; Django had the full card (`SupplierConnection`, `SupplierSyncJob`, `PricingRule`, `SupplierProduct` / `SupplierVariant`, `FeedMapping`, `DropshipStockHold`, `SupplierWebhookEvent`, `SupplierOrder`), the adapter registry (CJ real · مخازن/قنوات fake · flat feed), the pricing engine, catalog/import/inventory/feed/order-forward services, self-chaining Celery jobs and HTML screens only.
- **Django provider**: `products/services/suppliers/api_service.py` + `api/views_dropshipping.py` — 27 routes under `/api/v1/dropshipping/`:
  - `meta/`;
  - `suppliers/` (+ `attention_total`) · `suppliers/<code>/` (+ `categories`) · `connect/` `{credentials}` (verified by the adapter first; missing/rejected key → `credentials.<field>` 400, rate limit 429) · `disconnect/` · `settings/` GET/PUT · `sync-inventory/` 202 · `webhook/rotate/` (URL **and** signing secret, once, `no-store`) · `catalog/?q&category&import_status&page` · `import/` 202 `{job_id, count}`;
  - `pricing-rules/` CRUD · `simulate/` · `<id>/apply/`;
  - `feeds/` (multipart file or `{url}`) · `<id>/` GET/PATCH · `mapping/` · `preview/` · `approve/` · `run/` · `errors.csv/`;
  - `orders/?status&supplier&attention&page` · `orders/<id>/resubmit/`;
  - `jobs/?supplier&status&job_type&page` · `jobs/<id>/` · `retry/` · `errors.csv/`.
- **Gate**: session (401) → `channels.dropshipping.manage` (403) → plan feature `dropshipping` (403).
- **Contract translation (one source of truth — every number from the existing services)**:
  - pricing rules `scope_type` all/supplier/category ↔ `PricingRule.scope` + `supplier_code` / `category_prefix`; `fx_source` daily ↔ `store_setting` (the daily rate shown = `StoreSetting.usd_to_sar`); the UI priority «الأصغر أولاً» = `1000 − PricingRule.priority` (Django «الأعلى أولاً»); `scope='product'` rules (assigned per product on the legacy screen) stay out of the contract;
  - simulation = the same `RuleBook` / `compute_sell_price` with the draft rule inserted (affected = imported, unlocked products the chain would give to it); apply = a `price_sync` job on exactly those products;
  - jobs `catalog_pull → products · price_sync → prices · inventory_sync → inventory · product_import → import · feed_import → feed` (`order_*` job types are never created and stay out); retry restarts per type (failed import rows + fetch failures, the whole batch after an auth failure, feed re-run, inventory/catalog/reprice);
  - feeds: the owner-approved 20 M29 keys ↔ `FeedMapping.column_map` (`sku` → `external_product_id`; `variant_sku` switches on `parent_column` grouping with `sku` → `parent_id`); legacy-only keys (`currency`, `image_url_2..5`) survive a save from Next.js; a column used twice is refused (`mapping.<key>`); status draft/mapped/approved/running/completed… is derived from the mapping version + the feed's latest job; preview = `validate_feed` + the first rows' raw values with their error messages; approve needs `approvable` (≤ 5 % errors, contiguous parents) and no longer starts the import (Run does);
  - CJ (`catalog_mode=search`) browses live: page = CJ page (24 = the table size), a hit not stored yet has id `ext:<pid>`; «importing» is computed from the supplier's live import job (the model never stores it).
- **Gaps closed in Django (frontend fields that had no backend)** — migration `0232_dropshipping_api`:
  - `SupplierConnection.catalog_sync_interval_min` (replaces the fixed 6 h — same default) and `price_sync_interval_min` + `last_price_sync_at` (periodic re-pricing of unlocked products at the merchant's interval, piggy-backed on the hourly catalog beat; the first pass only sets the baseline);
  - `FeedMapping.schedule_interval_min` (60/360/720/1440… for link feeds; `fetch_scheduled_feeds_for_tenant` honours it with the same 5-minute slack);
  - six feed fields added to `FEED_FIELDS` (no auto-suggest synonyms, so the legacy wizard's suggestions are unchanged) and implemented in `feed_engine` / `import_service`: `gtin` = barcode fallback, `extra_images` = several URLs in one cell, `brand` → `Product.brand` (created by name), `price` = the supplier's fixed selling price (≥ cost; locks the price against re-pricing), `compare_at_price` → `Product.old_price` (when above the price), `supplier_url` kept on the supplier product.
- **Frontend extended to Django**: the connect form renders Django's `credential_fields` (مخازن asks for one API token — the mock's invented `store_id` is gone); `webhook_supported` / `inventory_sync_supported` hide the webhook section / «مزامنة المخزون الآن» where the adapter has neither; `reauth_required` shows «يتطلب إعادة الربط»; the rotated webhook shows its signing secret; the supplier settings gain «إحالة الطلبات» (auto-forward, COD auto-forward, default country, shipping method) and interval hints (products/prices ≥ 60, inventory ≥ 15); pricing rules gain shipping estimate / fixed add / min margin %; the feed schedule is offered for link feeds only (an uploaded file never changes by itself; Django refuses it); jobs accept `supplier_code: all`. Mock aligned (credentials, bounds, secret, capabilities, engine formula, file-schedule refusal).
- **Adapter**: `api/bff/dropshipping/[[...path]]` → `liveOrMock(…, "dropshipping", "/api/v1/dropshipping/<path>/", …)`; `.env.example` lists `dropshipping`; `scripts/dropshipping-check.ts` updated.
- **Legacy-only (not in the M29 contract)**: order address correction / poll now / cancel at supplier, cost-rise alerts + manual price unlock on «منتجاتي», feed delimiter/encoding/price-unit/currency-column options, live stock check at checkout.
- **Tests**: `api/test_dropshipping_api.py` (11).

### INT-033 — M16 Point of Sale (registers, shifts, cash movements, OTP step-up) — 2026-10-25
- **Before**: every §7 row was `[NEEDS BACKEND]`; Django had the models (`CashRegister`, `Shift`, `ShiftCashMovement`, `OTPChallenge`) and HTML-only screens (`products/views/staff_pos.py`), no `pos` plan feature.
- **Django provider**: `products/services/pos_service.py` + `api/views_pos.py` — 15 routes under `/api/v1/pos/`: `context/`, `registers/?location`, `shifts/` POST (200 = your own live shift on that register; 409 «لديك وردية قائمة على …» / «الجهاز مشغول بوردية …»; disabled register 400), `shifts/current/`, `shifts/pending/`, `shifts/<id>/movements/` · `close/` · `resolve-variance/`, `products/?q&barcode&location`, `quote/`, `discount-approvals/`, `orders/` GET/POST, `orders/<id>/`, `orders/<id>/refund/`.
- **Gates in order**: session 401 → plan feature `pos` 403 `{detail, code: feature_disabled}` → locations = active `StaffLocationRole` ∩ `has_pos_terminal` (owner: all) → M18 keys (`discounts.apply`, `orders.refund`; variance = owner / `staff.manage` / «مدير الفرع|المتجر»).
- **Shift rules (spec §5 = the mock; the legacy screens now call the same service)**: overage or zero → `closed`; shortage only → `pending_manager_approval` + `ApprovalRequest(shift_shortage)` in the M18 queue; the manager's decision (approve OR reject) closes the shift — on the device (`resolve-variance`, shift `version`, no self-approval) or from the approvals screen (`staff_service.resolve_approval` → `settle_shift_for_approval`). Before: Django parked any variance and «reject» reopened the shift. `Shift.variance` keeps its legacy meaning (expected − actual); `display_variance` = actual − expected as in the contract.
- **Sale** = a real M06 order (`sales_channel=pos`, `completed`/`paid`, `payment_method` `pos_cash`|`pos_sharwa_pay`, `source_location` = the register's) + `PosReceipt` snapshot (number `POS-<shift>-<seq>`, lines with discount %, `discount_allocated` per item incl. the cart share); prices converted to the store currency (Django authority — no «mixed currencies» error live); stock leaves the register's location through `inventory_service._apply_delta` (`LocationInventory` when multi-location, else product/variant) + `StockMovement(sale)`; serialized units marked sold; cash → `ShiftCashMovement(sale)`; Sharwa Pay = recorded outside the drawer, no wallet debit (no customer identity at the till — M40/INT-048). Bundles hidden from the POS grid with bookable/auction (bundle pricing = INT-045).
- **Idempotency (SC-16.3)**: `PosIdempotencyKey` inserted first in the write transaction (header `Idempotency-Key` or body) — a replay or a concurrent double click returns the first receipt/movement/refund (200).
- **Discount ceiling**: highest `Role.max_discount_percent` among the staff's roles granting `discounts.apply` at the register's location (NULL = none, owner none); over it → 403 `discount_exceeds_limit`; `manager_code` = the store's hashed `StoreSetting.pos_manager_code_hash` (`manage.py set_pos_manager_code --schema=… <code>`; 5 wrong / 15 min lock per register; under DEBUG `2468` works while none is set) → an approved `discount_exception`; or `approval_id` from `discount-approvals/` (pending 409, rejected 403, covers ONE receipt — reuse 409, mock aligned).
- **Refund**: `refund_service.process_order_refund(method='manual')` + `ShiftCashMovement(refund)` for cash receipts, needs your open shift; over `StoreSetting.pos_refund_otp_threshold` (200.00 default, store currency) without a code → 428 + `OTPChallenge(large_refund)` bound to receipt + amount, sent to the store WhatsApp (3 sends/10 min); 3 wrong codes → 429 lock 15 min; under DEBUG `123456`.
- **Force close**: the Celery task bumps `version` and raises the notice (`force_close_notice_seen`), cleared when the cashier opens a new shift.
- **Gaps closed** (migrations `products/0229_pos_api`, `billing/0013_seed_pos_feature`): `Shift.opened_by` / `ShiftCashMovement.created_by` nullable (NULL = owner), `Shift.version` / `approval` / `force_close_notice_seen` (old rows marked seen), `ShiftCashMovement.note`, `PosReceipt`, `PosIdempotencyKey`, `StoreSetting.pos_refund_otp_threshold` / `pos_manager_code_hash`, `Feature(pos, requires_plan=True)` (open to all while subscriptions are off). M18 approvals render POS discount requests («خصم 15% في نقطة البيع يتجاوز حد الدور (10%)»).
- **Frontend**: `api/bff/pos/[...path]` → `liveOrMock(…, "pos", "/api/v1/pos/<path>/")` (`__reset` stays fixture-only); `.env.example` adds `pos`; contract comments updated; mock aligned (one receipt per discount approval).
- **Tests**: `api/test_pos_api.py` (17) + staff/orders/inventory/auth/dashboard/tasks suites re-run green.

### INT-036 — M26 Bookings (services, availability, slots, holds) — 2026-10-25
- **Before**: every merchant §7 row was `[NEEDS BACKEND]`; Django had `ServiceAvailability` (0 = Monday, several windows a day, `is_active`), `BookingSlot` (partial unique `(product, start_datetime)` on held/booked, `session_key`, `held_until`, `order`), HTML screens, the legacy `available_slots_api` (HH:MM list) and `book_appointment` (hold + `cart_bookings` in the session); the buyer rows `catalog/products/<id>/slots/` and `…/slots/hold/` answered 404 so the storefront ran on the fixture. No migration needed.
- **Django provider**: `products/services/booking_service.py` + `api/views_bookings.py`:
  - `bookings/services/` (bookable, non-archived; `availability_count` = ACTIVE windows; image);
  - `bookings/services/<id>/availability/` GET/PUT — full replacement of the active windows, server re-validation — per-row `{results: [{field: [msg]}]}` for end ≤ start / overlap / weekday ∉ 0–6; windows paused on the legacy screen are left untouched;
  - `bookings/slots/?from&to&product&status` — store-zone day bounds, `to` inclusive; default held+booked; `is_expired`; customer from the order, else «زائر المتجر»;
  - `bookings/slots/<id>/cancel/` — 409 «هذا الحجز ملغى مسبقاً.»; `order_effect` names the untouched order; `AuditLog booking.cancel`;
  - buyer `catalog/products/<id>/slots/?date` → `{date, timezone, slots[{start_datetime, end_datetime, status}], next_available_date}` (21-day scan) and `…/slots/hold/` `{start_datetime, release_slot_id?}` → 201 `{slot_id, start_datetime, held_until}` · 409 «لم يعد هذا الموعد متاحاً.» · 400 `{start_datetime}` · 429 past 10 live holds per session.
- **Gates**: session 401 → plan feature `bookings` 403 «ميزة الحجوزات غير مفعّلة في خطتك.» (merchant AND buyer rows); no M18 key (any member who sees the module).
- **Rules (Django is the authority — one source now, the legacy screens call the same service)**: candidates every 30 min of `booking_duration_minutes` inside each active window; a candidate overlapping a booking = `booked`, a live hold = `held`; past times dropped; all times in `StoreSetting.timezone` (the legacy view used the server zone) as ISO with offset; hold 15 min (legacy `BOOKING_HOLD_MINUTES`); a live hold of the same session at the same time is returned as is; the race stays on the partial unique (IntegrityError ⇒ 409).
- **Bugs fixed**: an expired hold stayed `held` forever — it blocked the time for everyone (partial unique), stayed in the cart and failed checkout; now it never counts, drops out of the cart (FR-26.07) and is released (`cancelled`) when the same time is held again. `book_appointment` accepted any instant (past, outside the windows) — now only a time the availability computation offers. Buy-now included the session's cart bookings (charged + confirmed them with another product) — now each mode has its own list (`cart_bookings` / `buy_now_bookings`, gift none) and `booking_slot_ids` come from the effective cart lines (legacy HTML checkout too). `manage_service_availability` was the only bookings screen without `require_feature('bookings')`.
- **Cart / checkout (closes the INT-014 leftover)**: `cart/actions/` add of a bookable product needs `start_datetime` → the session's live hold for it (or a fresh hold, same rules) joins `cart_bookings` (quantity 1; 409 when taken); decrease/remove_line releases the hold; `cart_count` / `product_qty` count bookings like `GET cart/`; clearing the cart releases its holds; checkout buy-now of a service holds `start_datetime` into `buy_now_bookings` (409 `{detail, changed}` when taken); checkout turns the holds `booked` on the order (existing `reserve_and_create_order`). Storefront product `is_bookable` is false while the feature is off (FR-26.01).
- **Frontend**: `api/bff/bookings/[...path]` → `liveOrMock(…, "bookings", "/api/v1/bookings/<path>/")`; `.env.example` adds `bookings`; buyer rows already Django-first (`storefrontAdapter`); mock aligned (15-min hold, 30-min step, overlap ⇒ held/booked); cart «+» disabled on an appointment line (one booking per line).
- **Tests**: `api/test_bookings_api.py` (9).

---
## Domain 14 — Apps, AI & automation, support (التطبيقات والذكاء الاصطناعي والأتمتة والدعم)

| Task | Module | Live switch | Django provider | Routes |
|---|---|---|---|---|
| INT-040 | M30 App Store | `apps` | `products/services/apps_api_service.py`, `api/views_apps.py` | 12 routes under `apps/` |
| INT-041 | M31 Sharwa AI | `sharwa_ai` | `products/services/sharwa_ai_api_service.py`, `api/views_sharwa_ai.py` | 4 routes under `apps/sharwa-ai/` |
| INT-042 | M32 Support | `support` | `products/services/support_api_service.py`, `api/views_support.py` | 11 routes under `support/` |

**Domain relationship**: the platform app catalogue (`appstore.App`, managed in the console — Domain 16) is installed per store (`StoreAppInstallation`); WhatsApp messaging (SharwaConnect) and the Sharwa AI support bot are apps gated by `app_marketplace` and by being installed AND effectively active. The AI bot hands conversations to humans through the support sessions lock service (M32). Both the AI gateway and SharwaConnect report back through public-schema webhooks (`tenants/webhooks_ai.py`, `tenants/webhooks.py`) routed by public session indexes.

### INT-040 — M30 App Store (catalog, installations, events, fees, WhatsApp) — 2026-10-26
- **Before**: every §7 row was `[NEEDS BACKEND]`; Django had the platform catalogue (`appstore.App` + `AppBillingOverride`, managed by the M46 console since INT-032), the per-store install (`StoreAppInstallation`, `AppInstallationEvent`, `AppUsageLog`, `AppTemplate`, `AppBillingCharge`), the lifecycle service (`app_marketplace_service`: install/activate — silently refused while `suspended_by_platform` — /deactivate), the template registry (`template_service.TEMPLATE_REGISTRY`), SharwaConnect (`sharwaconnect_client`) and HTML screens only (`views/apps.py`, a hard-coded two-app catalogue).
- **Django provider**: `products/services/apps_api_service.py` + `api/views_apps.py` — 12 routes under `/api/v1/apps/`:
  - `''` — listed apps + installed ones the platform delisted since, flagged `is_listed:false` (§8);
  - `<code>/` — + `install_preview` from `App.is_billed_for_client`, `suspension_reason` from the latest suspension event;
  - `<code>/install|activate|deactivate/` — 409 duplicate / already in that state, 403 while suspended, 404 delisted for a new install;
  - `<code>/events/` · `<code>/charges/`;
  - `whatsapp/usage/?status&event_type&from&to&page&page_size` · `whatsapp/summary/` · `whatsapp/templates/` · `whatsapp/templates/<id>/` GET/PATCH;
  - `whatsapp/connect-url/` — the legacy SharwaConnect register-once + `create_store_invite`, live `connected` best-effort, `no-store`.
- **Gate**: session (401) → plan feature `app_marketplace` (403) → writes (install/activate/deactivate, template edits) for the store owner only (403); WhatsApp rows need the app installed and effectively active (409).
- **Contract translation**: the WhatsApp app is `whatsapp` in every model/task (`is_app_active('whatsapp')`, `order_events`, `dispatch_whatsapp_message`) and `whatsapp_bot` in the contract — `/dashboard/apps/whatsapp` is the app's own panel and would shadow `/dashboard/apps/[code]` — translated both ways in one place; price/billing per store = `is_billed_for_client` (store overrides beat the global switches; not billed → «مجاني», no preview); templates = the six WhatsApp entries of `TEMPLATE_REGISTRY` with fixed ids 1–6, `{var}` stored ↔ `{{var}}` in the editor, preview rendered by `render_template_safe` with sample values + the store name; usage events `ORDER_CREATED → order_new · ORDER_SHIPPED → order_shipping_update · ORDER_DELIVERED → order_delivered · ORDER_CANCELLED → order_cancelled · PAYMENT_RECEIVED → payment_confirmed` (legacy free keys pass through, unknown → manual).
- **Gaps closed in Django**: `AppUsageLog.order` (nullable FK, `SET_NULL`) filled by `create_pending_usage_log(order=…)` from both send paths (`order_events.notify_sharwaconnect_of_order_event`, `whatsapp_service.send_whatsapp_notification_async`) so each usage row links its order — migration `0233_app_store_api`; required template variables (`TEMPLATE_REGISTRY[…]['required']`: `order_id`, + `status_label` for shipping updates) enforced on save, unknown variables refused, the 1024-char WhatsApp limit; an empty body restores the platform default (the legacy screen's semantics).
- **Frontend extended to Django**: usage events gain `order_delivered`, `order_cancelled`, `payment_failed`; templates carry `key` + `is_custom` (the editor shows «نصّك المخصَّص / النص الافتراضي» and «استعادة النص الافتراضي»); delisted installs show «لم يعد متاحاً للتثبيت» and cannot be reinstalled. Mock aligned (template default/revert, delisted installs).
- **Adapter**: `api/bff/apps/[[...path]]` → `liveOrMock(…, "apps", "/api/v1/apps/<path>/", …)` with `sharwa-ai/*` on its own switch `sharwa_ai`; `.env.example` lists `apps`.
- **Legacy-only (not in the M30 contract)**: the QR-pairing proxy (`whatsapp_qr_start/poll`, superseded by the SharwaConnect panel) and the monthly sent counter on the old dashboard.
- **Tests**: `api/test_apps_api.py` (7).

### INT-041 — M31 Sharwa AI (status, settings, SSO) — 2026-10-26
- **Before**: the three M31 §7 rows of this task were `[NEEDS BACKEND]`; Django had the HTML hub only (`views/sharwa_ai_hub.py`: pairing page + QR poll via the sharwa_ai gateway `services/sharwa_ai_client`, random `ai_session_id` indexed in public `WhatsAppSessionIndex`, `SupportBotSettings` form), the `session-status` webhook (`tenants/webhooks_ai.py`, stored `wa_session_status` only) and the RS256 console SSO (`services/sharwa_ai_sso.py` + the launch page's postMessage handshake).
- **Django provider**: `products/services/sharwa_ai_api_service.py` + `api/views_sharwa_ai.py` — 4 routes under `/api/v1/apps/sharwa-ai/` (wired before `apps/<str:code>/`):
  - `status/` GET → `{connected, connecting, error, connected_at, connected_phone_number, qr_image}` — the first call after the install starts the gateway session exactly like the legacy pairing page; later calls ask the gateway live; a gateway outage never drops a known connection (the error shows only while not connected); DISCONNECTED / SESSION_EXPIRED / LOGGED_OUT / BANNED / FAILED map to Arabic messages.
  - `reconnect/` POST — same session id, fresh QR; 409 while connected.
  - `settings/` GET/PUT — `SupportBotSettings`; all-or-nothing; `ai_enabled` boolean; override 1–50 or null; `platform_default_max_replies` = `SHARWA_AI_MAX_CONSECUTIVE_BOT_REPLIES` setting/env, default 4.
  - `console-token/` POST → `{console_url, token, expires_in}` — `issue_console_token(tenant_ref=schema, sub=merchant:<schema>, role=merchant_admin)`, session pinned to this store via `auth_tenant_schema` like the launch page, 503 when `SHARWA_AI_CONSOLE_URL` / SSO keys are missing, `Cache-Control: no-store` + `Referrer-Policy: no-referrer`.
- **Gate**: the M30 gate (session 401 → `app_marketplace` 403 → writes/reconnect/console token owner-only 403) + the app installed and effectively active (409).
- **Gaps closed in Django**: `ai_connected_at` recorded once on the first CONNECTED (poll or webhook) and cleared with the phone on any failure state — one rule (`record_status`) shared by the poll and `sharwa_ai_session_status_webhook`, which now also keeps the paired number; connected aliases are normalised to `CONNECTED`.
- **Security fix in Next.js**: the console button put the SSO token in the URL (`?token=`), which Django and the engine forbid — it now opens the console's plain URL, waits for `sharwa-console-ready` from that window and that origin, and posts the token once (`sharwa-console-token`) to the console origin only; an unclaimed token is dropped at `expires_in` or unmount. The trusted origin for refresh messages is derived from `console_url` instead of the hard-coded `https://ai.sharwa.app`.
- **Frontend extended to Django**: the pairing QR (with how-to-scan) shows while «جارٍ الربط», the paired number shows when connected, and the error state has «إعادة الربط» for the owner; the override form refuses > 50 like the server. Mock aligned (QR + phone, reconnect, 409 when not usable on status too, all-or-nothing settings, default 4, 900 s token).
- **Adapter**: `api/bff/apps/[[...path]]` already routes `sharwa-ai/*` to the live switch `sharwa_ai`; `.env.example` lists it.
- **Hand-over**: the live sessions rows of M31 §7 belong to INT-042 (M32).
- **Tests**: `api/test_sharwa_ai_api.py` (6).

### INT-042 — M32 Support (sessions, tickets) — 2026-10-26
- **Before**: every M32 §7 row and the M31 §7 session rows were `[NEEDS BACKEND]`; Django had the models (`SupportSession` with the lock fields, `SupportMessage`, `BotToolCallLog`, `SupportTicket`), the lock service (`support_lock_service`: `staff_takeover/release/send_reply`, `escalate_session`, all `select_for_update`), the HTML screens (`views/support_hub.py`, `views/operations.support_tickets_view`) and the Celery reply task.
- **Django provider**: `products/services/support_api_service.py` + `api/views_support.py` — 11 routes under `/api/v1/support/`:
  - `sessions/?status&session_type&assigned_to_me&q&page` — escalated → human_locked → bot_active → closed, then latest activity (the legacy list's order); `q` matches the phone or the party's name; `ai:{installed, enabled}`;
  - `sessions/counters/`;
  - `sessions/<id>/?after=<cursor>` (`can_takeover`, `ai`);
  - `sessions/<id>/takeover|release|close/ {version}` — 409 `{detail, session}` naming who got there first or on a stale version;
  - `sessions/<id>/messages/ {text, client_id}` — 201; the same `client_id` again → the same row, 200; the gateway send is queued on commit;
  - `tickets/?status&assigned_to=me|none|<id>&q&page` (+ `counters`) · `tickets/` POST · `tickets/counters/` · `tickets/<id>/` GET/PATCH;
  - `assignees/` — active staff, so a member without `staff.view` can still assign (the contract's `GET /staff/` would need it).
- **Gate**: session (401) for reading and tickets (FR-32.01, no plan feature); takeover/release/close/reply need `support.takeover_session`, the owner implicitly (403).
- **Contract translation**: the timeline merges two tables — ids `2×message_id` / `2×tool_call_id+1`, ordered by time, opaque cursor `"<last message>.<last tool call>"` (a numeric id still decodes); party name = latest order's customer name for the phone / the affiliate / the staff member (Sharwa has no customer model, FR-07.01), else the phone; the owner's lock → `{id: null, name: «مالك المتجر»}`; tool-call inputs and outputs have token/secret/password/api-key/OTP/PIN/card values redacted server-side (FR-31.07) and `{"error": …}` results surface as `error`; tickets `title ↔ subject`, `created_at ↔ opened_at`.
- **Gaps closed in Django** (migration `0234_support_api`): `SupportSession.version` (bumped inside the lock service on takeover/release/escalate/close; checked under the same row lock) · `staff_close` (new; refuses a session another member holds) · release/close now log a system row like takeover · `SupportMessage.sender_name` + `client_id` (unique per session) so staff replies keep their author and are idempotent; the reply is written synchronously under the lock and the new `deliver_staff_reply` task sends it (`send_staff_reply_message` shares the same delivery helper) · `SupportTicket.description`, `updated_at`, `created_by` (also set by the legacy screen) and an optional `customer_phone`; `closed_at` follows the status (reopen clears it — the legacy view's rule and the close-time report's input).
- **Frontend extended to Django**: `system` timeline rows render as quiet events (takeover/release/close); customer media shows «فتح المرفق» (signed URL); the timeline polls with the server cursor and sorts by time; tickets carry the optional customer phone (form + detail), `closed_at`, and a deactivated assignee shows «غير نشط» in the row and stays selectable in the detail with a re-assign hint (§8). Mock aligned (system events, cursor, phone/closed_at/inactive assignee, ticket views).
- **Adapter**: `api/bff/support/[...path]` → `liveOrMock(…, "support", "/api/v1/support/<path>/", …)`; `.env.example` lists `support`.
- **Tests**: `api/test_support_api.py` (6).

---

## Domain 15 — Reports & analytics (التقارير والتحليلات)

| Task | Module | Live switch | Django provider | Routes |
|---|---|---|---|---|
| INT-027 | M25 Reports | `reports` | `api/views_reports.py` (`reports_contract.py`, `ReportExportJobSerializer`, `ScheduledReportSerializer`) | 9 BFF rows (registry, report data, exports, schedules) |

**Domain relationship**: the first live module (pre-Phase 002). Reports read precomputed daily metrics (`DailyStoreMetrics`, `compute_day_metrics`) and per-report builders; the dashboard «today» refresh (INT-003) shares the 5-min cooldown key with the reports refresh; the push stats card (INT-016) lives on `/dashboard/reports`; the platform rollups use public `TenantStatsSnapshot` (Domains 2 and 16).

### INT-027 — M25 Reports (registry, report data, exports, schedules) — 2026-10-25
- **Audit**: already integrated before Phase 002 (`reports` was the first live module): all 9 BFF rows go through `liveOrMock(…, "reports", …)` to `api/views_reports.py` (`reports_contract.py` + `ReportExportJobSerializer` / `ScheduledReportSerializer`); shapes match the Zod schemas field for field; the 42 registry codes/categories/order are identical.
- **Gap closed 1 — location dimension**: Django always answered `has_locations: false`, so the screen's location filter never appeared; now `sales_overview`, `orders`, `store_overview`, `best_sellers` carry `has_locations` + the active `locations` when multi-location is on, and `?location` (an id from that list, else ignored) recomputes them live from the location's orders (`Order.source_location`, or a line's `OrderItem.source_location` for split orders — id subquery, no double counting) via `compute_day_metrics(day, location_id)` only for the days that have such orders, past days cached 1 h; other reports keep `has_locations: false` (the screen drops the param, §8).
- **Gap closed 2 — exports**: exports keep the `location` param and now write EVERY table page (`export_table` stopped at the first 1000 rows).
- **Mock aligned to Django**: report statuses (`ai_forecasting` = `coming_soon`, `whatsapp_costs` = `available` — Django has its builder; 6 disabled rows; `scripts/reports-check.ts` updated) and `has_locations` only on the 4 order-derived reports.
- **No migration**.
- **Tests**: `api/test_reports_api.py` + `ReportsLocationFilterTests` (3).

---
## Domain 16 — Platform owner console (لوحة مالك المنصة `console.<base>`)

| Task | Module | Live switch | Django provider | Routes |
|---|---|---|---|---|
| INT-030 | M20 Platform Admin Console | `platform` | `tenants/console_service.py`, `api/views_platform.py` | 21 routes under `platform/` |
| INT-031 | M45 Platform Dues & Sharwa Pay Administration | `platform_money` | `tenants/console_money_service.py` + `api/views_platform.py` | 10 routes (`dues/*`, `sharwa-pay/*`, `sharwa-ship/zones/*`) |
| INT-032 | M46 Plans, Features & Subscriptions | `platform_billing` | `tenants/console_billing_service.py` + `api/views_platform.py` | 13 routes |

**Domain relationship**: the console runs on the **public schema only** (404 on a store host or with `X-Store-Domain`) with a Django admin session (superuser = «مالك المنصة», `is_staff` = «مشرف تشغيلي» who reads everything and writes dues / Sharwa Pay only — FR-20.09). One BFF catch-all (`platform/[...path]`) goes live per row group (`platform`, `platform_money`, `platform_billing`). Store-schema reads are wrapped in savepoints; cross-store counts use one `UNION ALL` with a per-schema savepoint fallback. Every console action is recorded in `PlatformActionLog` («من نفّذ», FR-20.07). Phase 6 (US4 — platform owner) is complete on Django.

### INT-030 — M20 Platform Admin Console (stores, re-provisioning, feature overrides, deactivation, webhook events) — 2026-10-25
- **Before**: every console row was `[NEEDS BACKEND]` (mock router only); Django had only the admin actions (`tenants/admin.py`: re-provision, Sharwa Ship tasks, bulk feature manager) + the HTML `master-dashboard`.
- **Django provider**: `tenants/console_service.py` + `api/views_platform.py` — 21 routes under `/api/v1/platform/` on the public schema only:
  - `auth/login|logout|me` — Django admin session on public; no session = 401 via `WWW-Authenticate: Session`; CSRF on login and every write; lock after 5 failures per username / 15 min, per-IP only a loose CGNAT ceiling (100); login answers the rotated `csrf_token`; operator writes outside dues/Sharwa Pay → 403 «هذا الإجراء لمالك المنصة فقط.».
  - `overview/` — sum of `TenantStatsSnapshot` like the old master dashboard, failed/stalled counts, pending top-ups/withdrawals/DLQ, last 50 stores.
  - `stores/` — `status` incl. `stalled` (the sweeper's thresholds pending > 5 min / provisioning > 20 min), `plan` incl. `none`, `is_active`, `q` name/schema/domain/phone with `0777…` local form, `ordering`, paging.
  - `clients/`.
  - `stores/reprovision/` — failed or stalled only — the admin action verbatim: `pending` + `queue_provisioning`; per-store reasons.
  - `stores/<schema>/` — domains, current + history subscriptions, installations read from the store schema, override count, last 20 actions.
  - `stores/<schema>/sharwa-ship/` — truth = `DeliveryMethod.is_sharwa_official` in the store schema; «قيد التفعيل/الإلغاء» = a 10-min cache marker until the real state matches; refused up front when the `sharwa_ship` feature is off for the store (the task skipped it silently).
  - `stores/<schema>/features/` GET/PUT per store (`source` = the deciding step).
  - `stores/<schema>/domains/` + `domains/<id>/` — reserved-name validator, primary switch.
  - `stores/<schema>/deactivation/` GET/POST.
  - `features/` catalog + PATCH (kill switch / requires_plan / name); `features/<code>/resolve/`.
  - `feature-overrides/` list · `bulk/` · `<id>/` DELETE (the stores screen's bulk dialog and the overrides screen use them, so the whole override family moved with M20).
  - `webhook-events/` + `<id>/retry|discard/`.
- **Single decision source**: `billing.models.resolve_feature_decision` returns `(enabled, decided_by)` and `_resolve_feature_enabled` now takes `[0]` from it.
- **Gaps closed** (migrations `tenants/0027_platform_console_api`, `billing/0012_tenantfeatureoverride_updated_at`):
  - `TenantDeactivationRecord.reinstated_at` / `actor` / `updated_at` — «إعادة التفعيل» closes the record instead of deleting it (the mock deleted it; both guards — waybill issue + edge-cases banner — now also filter `reinstated_at__isnull`); custody «مسوّاة» = no open shipments, no pending platform dues, zero merchant Sharwa Pay balance.
  - `PendingWebhookEvent.resolved_at` — retry runs `process_carrier_webhook_event` synchronously with the SAME idempotency key as the receiving view (extracted to `products.tasks.shipping.carrier_idempotency_key`, `CarrierWebhookView` uses it); a failure bumps `attempts` and keeps the event pending.
  - `PlatformActionLog` (FR-20.07 «من نفّذ», read-only in Django admin); `TenantFeatureOverride.updated_at`.
- **Robustness**: every tenant-schema read is wrapped in a savepoint (a missing schema never poisons the request).
- **Frontend**: the catch-all `platform/[...path]` BFF route goes live per row group (`liveOrMock` semantics, module `platform`); M45/M46 rows were mocked until INT-031/032 (done); `getAdminSession()` reads Django `auth/me/` when live; the `(admin)` layout bootstraps CSRF like the dashboard; `reinstated_at` added to the record schema + «أُعيد التفعيل» in the history; stores/detail screens also poll on `pending` (Django re-queues as pending); notes limit 255 (Django column); DLQ source filter gains `sharwa_ship`. Mock aligned (reinstate keeps history, reprovision reasons, stall thresholds, Sharwa Ship feature guard; `scripts/admin-stores-check.ts` updated).
- **Known until INT-032 (resolved)**: the stores screen's plan filter options came from the M46 plans list (then mocked).
- **Tests**: `api/test_platform_console_api.py` (14, incl. a real tenant-schema read and a missing-schema store).

### INT-031 — M45 Platform Dues & Sharwa Pay Administration (dues actions, top-ups, withdrawals, wallets, Sharwa Ship zones) — 2026-10-25
- **Before**: every row was mock-only; Django had the HTML `master-dashboard/dues/` (the 8 POST actions) and the `sharwapay/admin.py` bulk actions.
- **Django provider**: `tenants/console_money_service.py` + 10 routes in `api/views_platform.py` (same public-only console session as INT-030; `dues` / `sharwa_pay` writable by operators, zones owner-only):
  - `dues/overview/` — `period` today/7d/30d = sum of `TenantStatsSnapshot` over the window, latest snapshot date, merchant Sharwa Pay balances, `pending_count` from ONE `UNION ALL` count across every store schema (per-schema savepoint fallback if a schema is broken); ready + active stores, highest revenue first.
  - `dues/<schema>/` — pending commissions with `collectable`, pending + waived charges, uninvoiced billable installations for the current period with `already_generated`, installations with `expired`, per-currency totals, wallet, snapshot.
  - `dues/<schema>/actions/` — `collect_commission|waive_commission|collect_charge|waive_charge|unwaive_charge|generate_charge|suspend_app|reactivate_app` → `{detail, level, entry}`; the legacy model methods verbatim — `.collect()` is still the only debit, from the merchant's Sharwa Pay wallet; row locked first; 409 «… تم التعامل معه مسبقاً»; 400 `{detail, level:error}` with the server's money sentence.
  - `sharwa-pay/topups/` + `<id>/approve|reject/` — approve = `apply_credit_if_approved()` (the `credited_at` guard — never a double credit); reject needs a note; duplicate approved bank transaction → error naming the earlier request.
  - `sharwa-pay/withdrawals/` + `<id>/confirm|reject/` — the amount was debited at request time; reject credits `withdrawal_reversal` in the same transaction.
  - `sharwa-pay/wallets/<phone>/` — `0777…` local form accepted; last 100 movements.
  - `sharwa-ship/zones/` GET/POST + `<id>/` PATCH/DELETE.
- **Gaps closed**: migration `sharwapay/0003_console_review_fields` — `SharwaPayTopupRequest.bank_name` / `claimed_phone` / `reviewed_by`, `SharwaPayWithdrawalRequest.reviewed_by` (backfill: every bank-webhook top-up = «كريمي»; the claimed phone is parsed from the legacy note «الرقم الوارد: X»); the Kuraimi webhook now stores both. A top-up that matched no wallet is linked on approval to the wallet of its claimed phone if that wallet exists by then — never a wallet created for an unproven number (400 otherwise).
- **Dues of a suspended store stay reachable** (the legacy page required `is_active`, which would have dead-locked INT-030's «close only after dues are settled»).
- **Zones**: Django's code is an immutable slug referenced by issued waybills — a new zone uses `SAN-01`, an existing one (even a legacy `sanaa_inner_city`) keeps its code (PATCH refuses a change; the form locks the field and sends no code — new `zoneUpdateSchema`); geo bounds are optional but all-or-none (Django allows a zone without a circle — the schema is now nullable, the map skips such zones, the table shows «بلا حدود»); 7-decimal coordinates.
- **Bug fixed in existing code**: `generate_billing_charge` caught `IntegrityError` without a savepoint, poisoning any surrounding transaction (TransactionManagementError) — the create is now wrapped in `atomic()`.
- **Frontend**: the BFF catch-all routes `dues|sharwa-pay|sharwa-ship` to module `platform_money`; the top-up detail renders the uploaded receipt (`/media/…`, same-origin proxy) and falls back to the text figure. Mock aligned (immutable code, optional geo).
- **Follow-up**: customer-side Sharwa Pay (the requests these screens approve) integrated by INT-048; its `topup_auto` labelling fix changed `apply_credit_if_approved` (auto = transaction id without receipt).
- **Tests**: `api/test_platform_money_api.py` (7 — dues against a real tenant schema with real wallet debits).

### INT-032 — M46 Plans, Features & Subscriptions (plans, feature matrix, subscriptions, apps, billing settings, market categories) — 2026-10-25
- **Before**: mock-only rows over Django models administered only through Django admin (`billing/admin.py`, `appstore`, `marketing`).
- **Django provider**: `tenants/console_billing_service.py` + 13 routes in `api/views_platform.py` (console session; owner-only writes, operators read):
  - `plans/` GET/POST · `<id>/` PATCH/DELETE — `display_price`, `display_commission` «—» / «2.50%» / money, `current_subscriptions`; `Plan.save()` keeps a single default; the code is fixed once created (PATCH refuses a change); the default free plan must be free AND active since registration assigns it; delete: 409 with `current_subscriptions` when current subscribers exist, and 409 «عطّلها بدل الحذف» when only historical ones do (`Subscription.plan` is PROTECT, the history is never erased).
  - `plan-features/` GET/PUT — one cell, `update_or_create`.
  - `subscriptions/` (`schema|status|current|plan|q`, paged) · `assign/` — `Subscription.assign_plan` is the only assignment point; the previous current subscription is now marked `cancelled` with its date instead of staying «active» off-current; `current_period_end` date → end of day; notes ≤ 255.
  - `billing-settings/` GET/PATCH — `stores_without_subscription` counts ready stores with no current plan.
  - `apps/` GET/POST · `<code>/` PATCH — code fixed; `installations` from ONE `UNION ALL` count over every ready store schema, per-schema savepoint fallback.
  - `app-billing-overrides/` GET/POST · `<id>/` DELETE — one per app × store.
  - `market-categories/` GET/POST · `reorder/` (full id set) · `<id>/` PATCH/DELETE — `stores_count` = stores that ticked it at registration; a used category: 409 «عطّلها بدل الحذف».
- **Gaps closed**:
  1. The settings screen promised that switching plans ON assigns the default free plan to every store without a subscription, but Django never did (its help text said «لا يؤثر بأثر رجعي») — so turning the gate on would have instantly denied every `requires_plan` feature to those stores (no plan ⇒ step 5 «غير متاحة»). Enabling now assigns the active default free plan to every ready store without one, in the same transaction, note «إسناد تلقائي عند تفعيل الباقات», and refuses (400) when no active default free plan exists.
  2. Migration `appstore/0007_app_icon_name` — `App.icon_name` (the console names an icon from the UI library, no brand marks; the legacy `icon` image stays for the old templates).
- **Frontend**: the BFF catch-all routes the M46 rows to module `platform_billing` — every console row now has a Django provider; notes limits 255 (Django columns). Mock aligned (fixed plan code, PROTECT on historical subscriptions, active default plan, icon names).
- **Tests**: `api/test_platform_billing_api.py` (7, incl. a real tenant-schema installation count).

---

# Part C — Traceability matrix

| INT | Module | Name | Domain | Live key | Date |
|---|---|---|---|---|---|
| INT-001 | M01 | Marketing Landing Page | 1 | — (Django-first) | 2026-10-24 |
| INT-002 | M47 | Tenant Resolution & Guard | 1 | — | 2026-10-24 |
| INT-003 | M03 | Dashboard Shell, Auth & Overview | 2 | — | 2026-10-24 |
| INT-004 | M02 | Onboarding Wizard | 1 | — | 2026-10-24 |
| INT-005 | M04 | Products | 3 | `products` | 2026-10-24 |
| INT-006 | M05 | Catalog Organization | 3 | `catalog` | 2026-10-24 |
| INT-007 | M06 | Orders | 4 | `orders` | 2026-10-24 |
| INT-008 | M48 | Command Palette | 2 | `search` | 2026-10-24 |
| INT-009 | M49 | Notification Center | 2 | `notifications` | 2026-10-24 |
| INT-010 | M34 | Store Settings | 12 | `settings` | 2026-10-24 |
| INT-011 | M09 | Storefront Home & Catalog Listing | 5 | — | 2026-10-24 |
| INT-012 | M10 | Product Detail Page | 5 | — | 2026-10-24 |
| INT-013 | M11 | Cart | 5 | — | 2026-10-24 |
| INT-014 | M12 | Checkout | 5 | — | 2026-10-24 |
| INT-015 | M41 | Order Tracking | 5 | — | 2026-10-24 |
| INT-016 | M44 | PWA | 5 | `pwa` (merchant rows) | 2026-10-24 |
| INT-017 | M07 | Customers | 6 | `customers` | 2026-10-24 |
| INT-018 | M08 | Theme Customizer | 7 | `design` | 2026-10-24 |
| INT-019 | M13 | Marketing | 7 | `marketing` | 2026-10-24 |
| INT-020 | M14 | Payments & Merchant Wallet | 8 | `payments` | 2026-10-24 |
| INT-021 | M15 | Shipping | 11 | `shipping` | 2026-10-24 |
| INT-022 | M18 | Staff & Permissions | 12 | `staff` | 2026-10-25 |
| INT-023 | M19 | Domains & Integrations | 12 | `integrations` | 2026-10-25 |
| INT-024 | M21 | Inventory | 10 | `inventory` | 2026-10-25 |
| INT-025 | M22 | Locations | 10 | `locations` | 2026-10-25 |
| INT-026 | M24 | Returns & RMA | 4 | `returns` | 2026-10-25 |
| INT-027 | M25 | Reports | 15 | `reports` | 2026-10-25 |
| INT-028 | M35 | Customer Wallets & Loyalty Points | 6 | `wallets` (merchant) | 2026-10-25 |
| INT-029 | M42 | Wishlist & Reviews | 5 | — | 2026-10-25 |
| INT-030 | M20 | Platform Admin Console | 16 | `platform` | 2026-10-25 |
| INT-031 | M45 | Platform Dues & Sharwa Pay Administration | 16 | `platform_money` | 2026-10-25 |
| INT-032 | M46 | Plans, Features & Subscriptions | 16 | `platform_billing` | 2026-10-25 |
| INT-033 | M16 | Point of Sale | 13 | `pos` | 2026-10-25 |
| INT-034 | M17 | Affiliates & Influencers | 7 | `affiliates` | 2026-10-25 |
| INT-035 | M23 | Suppliers & Purchase Orders | 10 | `procurement` | 2026-10-25 |
| INT-036 | M26 | Bookings | 13 | `bookings` (merchant) | 2026-10-25 |
| INT-037 | M27 | Unified Inbox & Social Channels | 13 | `channels` | 2026-10-25 |
| INT-038 | M28 | Marketplaces | 13 | `marketplaces` | 2026-10-26 |
| INT-039 | M29 | Dropshipping | 13 | `dropshipping` | 2026-10-26 |
| INT-040 | M30 | App Store | 14 | `apps` | 2026-10-26 |
| INT-041 | M31 | Sharwa AI | 14 | `sharwa_ai` | 2026-10-26 |
| INT-042 | M32 | Support | 14 | `support` | 2026-10-26 |
| INT-043 | M33 | Expenses | 8 | `expenses` | 2026-10-26 |
| INT-044 | M36 | B2B Wholesale | 9 | `b2b` | 2026-10-26 |
| INT-045 | M37 | Advanced Products | 3 | `advanced_products` | 2026-10-26 |
| INT-046 | M38 | Courier App | 11 | `courier` | 2026-10-26 |
| INT-047 | M39 | Sharwa Ship | 11 | `sharwa_ship` | 2026-10-26 |
| INT-048 | M40 | Sharwa Pay | 8 | `sharwa_pay` | 2026-10-26 |
| INT-049 | M43 | Multi-Store Rollup | 2 | `rollup` | 2026-10-26 |

**Totals**: 49 tasks · 49 modules (M01–M49) · 16 domains · 39 live module keys (A.3) · 28 migrations (A.9) · 49 task test suites (A.12).

**Phase checkpoints (from the roadmap)**: US1 — `/` → store → product → completed order on Django without mocks; US2 — a full buying session on Django; US3 — every P2 module runs on Django alone; US4 — re-provision a store, enable a feature, approve a wallet top-up, collect a due — on Django; US5 — every P3 module on Django without state conflicts with M06/M21.
