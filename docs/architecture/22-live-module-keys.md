# Live-module key register

> **Source**: DOC-459 · inventory A.3 · Part C traceability matrix
> **Code**: `sharwa-frontend/src/mocks/runtime.ts` (`isModuleLive`) · `src/lib/bff/live-route.ts` (`liveOrMock`) · `src/lib/bff/live-products.ts` (`dispatchLiveProducts`) · `src/app/api/bff/**/route.ts` (108 files call `liveOrMock`) · `src/app/api/bff/platform/[...path]/route.ts` · `.env.example`
> **Last verified against code**: 2026-10-27 (official Step 07)

## 1. Purpose

One row per key that `SHARWA_LIVE_MODULES` understands: which integration task added it, which module and BFF rows it switches, and which Django prefix those rows reach. Operators use it to switch a module live ([`../ops/runbooks/switch-module-live.md`](../ops/runbooks/switch-module-live.md)); developers use it to know which rows a mock script depends on ([`21-mock-runtime.md`](21-mock-runtime.md)).

What a key does at run time — `liveOrMock` forwards the row to Django when the key is in the list, or when `SHARWA_MOCKS=off` — is in [`20-bff.md#liveormock`](20-bff.md#liveormock). Rows that have **no** key (Django-first by construction) are listed in §4.

## 2. How the register was verified

- **Key set — from code.** Every literal second argument of `liveOrMock(request, "<key>", …)` in `src/app/api/bff/**` (36 keys), plus `b2b` and `advanced_products` in `dispatchLiveProducts` (`src/lib/bff/live-products.ts:107`), plus `products` (`live-products.ts:114`), plus the three `platform*` groups selected by prefix in `platform/[...path]` (`isModuleLive(liveModule)`), plus `apps` / `sharwa_ai` chosen by the first path segment in `apps/[[...path]]`. Total: **39 keys**, no key in code missing from the register, no register key missing from code.
- **Upstream prefixes — from code.** Copied from the `upstreamPath` argument of each `liveOrMock` call.
- **Row counts — from [`../api/overview/bff.md#live-keys`](../api/overview/bff.md#live-keys) (run 06).** Counted per `route.ts` file. Route files nested deeper than the staging limit were counted by path prefix and are shown as `+n deep`; with them every roadmap figure reconciles.

## 3. The 39 keys

| # | Key | Task · Module | BFF rows switched | BFF location (`/api/bff/…`) | Django upstream (`/api/v1/…`) | Provider (`sharwa_saas/api/`) |
|---|---|---|---|---|---|---|
| 1 | `reports` | INT-027 · M25 (first live module) | 9 (8 + 1 deep) | `reports`, `reports/[code]`, `reports/exports/**`, `reports/refresh-today`, `reports/schedules/**` | `reports/`, `reports/<code>/`, `reports/exports/…`, `reports/refresh-today/`, `reports/schedules/…` | `views_reports.py` |
| 2 | `catalog` | INT-006 · M05 | 15 (13 + 2 deep) | `categories` (+`[id]`, `reorder`), `brands` (+`[id]`), `tags` (+`[id]`, `merge`), `collections` (+`[id]`, `[id]/products/**`), `badges` (+`[id]`) | `categories/`, `brands/`, `tags/`, `tags/merge/`, `collections/…`, `badges/` | `views_catalog.py` |
| 3 | `products` | INT-005 · M04 | every Phase A row through `PRODUCTS_LIVE_RULES` | `products/**` via `mockRoute` → `dispatchLiveProducts` | `products/…` ([`20-bff.md#products-rules`](20-bff.md#products-rules)) | `views_products.py` |
| 4 | `orders` | INT-007 · M06 | 11 (10 + 1 deep); print reuses the detail row | `orders`, `orders/[id]/**`, `orders/counters`, `orders/form-options`, `order-statuses/**` | `orders/…`, `order-statuses/…` | `views_orders.py` |
| 5 | `search` | INT-008 · M48 | 1 | `search` | `search/` | `views_search.py` |
| 6 | `notifications` | INT-009 · M49 | 4 | `notifications`, `notifications/summary`, `notifications/read-all`, `notifications/[id]/read` | `notifications/…` | `views_notifications.py` |
| 7 | `settings` | INT-010 · M34 | 1 read + 9 section writes | `settings`; `settings/{identity, currency, policies, announcement, shipping, contact, seo, multi-location, payments}` via `settingsWrite(upstream, …)` | `settings/…` | `views_settings.py` |
| 8 | `pwa` | INT-016 · M44 (merchant card) | 2 | `push/stats`, `push/test` | `push/stats/`, `push/test/` | `views_push.py` |
| 9 | `customers` | INT-017 · M07 | 13 (11 + 2 deep) | `customers`, `customers/[phone]/**`, `customers/export.csv`, `reviews/[id]` | `customers/…`, `customers/export.csv`, `reviews/<id>/` | `views_customers.py` |
| 10 | `design` | INT-018 · M08 | 6 (multipart forwarded as is) | `admin/sections` (+`[id]`, `reorder`), `store/announcement`, `store/theme`, `store/theme/presets` | `admin/sections/…`, store theme rows | `views_design.py` |
| 11 | `marketing` | INT-019 · M13 | 18 (15 + 3 deep) | `marketing/**` | `promotions/{summary, coupons, offers, abandoned-carts, campaigns, timeline, gift-settings}/…`, `loyalty/program/` | `views_marketing.py` |
| 12 | `payments` | INT-020 · M14 | 11 (10 + 1 deep) | `payments/gateways/**`, `payments/payout-accounts/**`, `store/payments`, `wallet`, `wallet/{dues, transactions, withdrawals}` | `payments/…`, `wallet/…` | `views_payments.py` |
| 13 | `shipping` | INT-021 · M15 | 25 (22 + 3 deep), incl. the Sharwa Ship **zones list** | `shipping/**` except the seven `sharwa_ship` rows; `orders/[id]/convert-to-pickup`; `shipments/[id]/address` | `shipping/{settings, delivery-methods, pickup-locations, providers, carriers, packaging-profiles, restricted-zones, sla-rules, edge-cases, …}/` | `views_shipping.py` |
| 14 | `staff` | INT-022 · M18 | 26 (22 + 4 deep) = 25 + the reset-password row | `staff/**`, `roles/**`, `permissions`, `approvals/**`, `audit-log` (+`verify`), `behavior-alerts/**` | `staff/…`, `roles/…`, `permissions/`, `approvals/…`, `audit-log/…`, `behavior-alerts/…` | `views_staff.py` |
| 15 | `integrations` | INT-023 · M19 | 13 (9 + 4 deep) | `domains/**`, `integrations/status`, `store/tracking`, `webhooks/**` | `domains/…`, `integrations/status/`, tracking and webhook rows | `views_integrations.py` |
| 16 | `inventory` | INT-024 · M21 | 8 handlers | `inventory`, `inventory/{counters, items, movements, reservations, adjustments, writeoffs, export.csv}` | `inventory/…` | `views_inventory.py` |
| 17 | `locations` | INT-025 · M22 | 14 (11 + 3 deep) | `locations`, `locations/[id]/**`, `locations/{mode, routing-rules, staff-options}` | `locations/…` | `views_locations.py` |
| 18 | `returns` | INT-026 · M24 | 4 | `returns/options`, `returns/rma`, `returns/rma/[id]`, `orders/refunds` | `returns/options/`, `returns/rma/…`, `orders/refunds/` | `views_returns.py` |
| 19 | `wallets` | INT-028 · M35 (merchant rows) | 7 (4 + 3 deep) | `customers/wallets/**`, `loyalty/points/**`, `loyalty/program` | `customers/wallets/…`, `loyalty/points/…`, `customers/loyalty-program/` | `views_wallets.py` |
| 20 | `platform` | INT-030 · M20 | catch-all, prefix group `M20_ROWS` | `platform/{auth, overview, stores, clients, webhook-events, features, feature-overrides}/**` in `platform/[...path]` ([`20-bff.md#adapters`](20-bff.md#adapters)) | `platform/<path>/` | `views_platform.py` |
| 21 | `platform_money` | INT-031 · M45 | same catch-all, `M45_ROWS` | `platform/{dues, sharwa-pay, sharwa-ship}/**` | `platform/<path>/` | `views_platform.py` |
| 22 | `platform_billing` | INT-032 · M46 | same catch-all, `M46_ROWS` | `platform/{plans, plan-features, subscriptions, billing-settings, apps, app-billing-overrides, market-categories}/**` | `platform/<path>/` | `views_platform.py` |
| 23 | `pos` | INT-033 · M16 | 1 catch-all (not `__reset`) | `pos/[...path]` | `pos/<path>/` | `views_pos.py` |
| 24 | `affiliates` | INT-034 · M17 | 2 catch-alls | `affiliates/[[...path]]`, `influencers/[[...path]]` | `affiliates/<path>/`, `influencers/<path>/` | `views_partners.py` |
| 25 | `procurement` | INT-035 · M23 | 2 catch-alls | `suppliers/[[...path]]`, `purchase-orders/[[...path]]` | `suppliers/<path>/`, `purchase-orders/<path>/` | `views_procurement.py` |
| 26 | `bookings` | INT-036 · M26 (merchant rows) | 1 catch-all | `bookings/[...path]` | `bookings/<path>/` | `views_bookings.py` |
| 27 | `channels` | INT-037 · M27 | 2 catch-alls | `inbox/[...path]` (not `_mock/*`), `channels/[[...path]]` | `inbox/<path>/`, `channels/<path>/` | `views_channels.py` |
| 28 | `marketplaces` | INT-038 · M28 | 1 catch-all | `marketplaces/[[...path]]` | `marketplaces/<path>/` | `views_marketplaces.py` |
| 29 | `dropshipping` | INT-039 · M29 | 1 catch-all | `dropshipping/[[...path]]` | `dropshipping/<path>/` | `views_dropshipping.py` |
| 30 | `apps` | INT-040 · M30 | shared catch-all | `apps/[[...path]]` when the first segment is not `sharwa-ai` | `apps/<path>/` | `views_apps.py` |
| 31 | `sharwa_ai` | INT-041 · M31 | same file | `apps/[[...path]]` when the first segment is `sharwa-ai` | `apps/sharwa-ai/<path>/` | `views_sharwa_ai.py` |
| 32 | `support` | INT-042 · M32 | 1 catch-all | `support/[...path]` | `support/<path>/` | `views_support.py` |
| 33 | `expenses` | INT-043 · M33 | 1 catch-all | `expenses/[[...path]]` | `expenses/<path>/` | `views_expenses.py` |
| 34 | `b2b` | INT-044 · M36 | 1 row + 2 rules | `b2b/options`; tier prices via `B2B_LIVE_RULES` | `orders/b2b-options/`, `products/<id>/tier-prices/…` | `views_b2b.py` |
| 35 | `advanced_products` | INT-045 · M37 | 14 rules | `ADVANCED_LIVE_RULES` in `live-products.ts` (extras, import × 3, `export.csv`) | `products/<id>/{bundle-components, compatibility-rules, personalization-fields, auction, serials}/…`, `products/import/…`, `products/export/` | `views_product_extras.py` |
| 36 | `courier` | INT-046 · M38 | 1 catch-all, four reads | `agent/[...path]` | `agent/{me, shipments, shipments/<id>, custody}/` | `views_courier.py` |
| 37 | `sharwa_ship` | INT-047 · M39 | 7 | `shipping/{sharwa-ship, shipments, awb-queue, rate-cards, supervisor, agents, agent-shifts}` | `shipping/{…}/` | `views_sharwa_ship.py` |
| 38 | `sharwa_pay` | INT-048 · M40 | 1 catch-all, **platform origin only** | `sharwa-pay/[...path]` | `sharwa-pay/<path>/` | `views_sharwa_pay.py` |
| 39 | `rollup` | INT-049 · M43 | 1 | `merchant/stores` | `merchant/stores/` | `views_rollup.py` |

Notes:

- `b2b`, `advanced_products` and `products` are three **independent** switches over `products/**`; `dispatchLiveProducts` checks `b2b` and `advanced_products` rules first, then `products` ([`20-bff.md#products-rules`](20-bff.md#products-rules)).
- The same Django resource can be reached by two keys: `marketing/loyalty` (`marketing`) reaches `loyalty/program/`, while `loyalty/program` (`wallets`) reaches `customers/loyalty-program/`.
- The Sharwa Ship **zones list** (`shipping/sharwa-ship/zones`) stays on `shipping`, not `sharwa_ship`.

## 4. Rows with no key (Django-first by construction)

These rows ask Django first on every request and use the fixture only when Django is down or lacks the route (`404`/`405`/`501`), and only while mocks are on. `SHARWA_LIVE_MODULES` does not affect them, so they cannot be "rolled back" by the switch.

| Rows | Task |
|---|---|
| Landing `public/plans`, `public/stats` and the landing server fetchers | INT-001 |
| Tenant probe (`probeStore()`), `/api/v1/config/` | INT-002 |
| `dashboard/{overview, overview/refresh, counters}`, the merchant `auth/*` rows | INT-003 |
| `public/{register, register/verify-otp, register/resend-otp, market-categories, check-subdomain, provisioning/[token]}` | INT-004 |
| Storefront catalogue, product page, cart, checkout, tracking | INT-011 → INT-015 |
| PWA buyer rows #11–#14 (`/api/v1/*` passthrough) | INT-016 |
| Storefront `loyalty/*`, `wallet/otp/send`, `wallet/balance-preview` | INT-028 |
| `shopper/phone`, `wishlist*`, `store-reviews`, `customers/otp/send` | INT-029 |
| `storefront/referral` | INT-034 |
| `catalog/products/<id>/slots` (buyer bookings) | INT-036 |
| `catalog/products/<id>/auction`, `auction/bids` (storefront auction) | INT-045 |
| B2B draft rows #19–#21 (`/api/v1/*` passthrough) | INT-044 |
| Courier actions #22–#26 (`/api/v1/agent/*` passthrough) | INT-046 |

Adapter patterns and fallback rules: [`20-bff.md#adapters`](20-bff.md#adapters).

## 5. Values by environment

| Environment | `SHARWA_MOCKS` | `SHARWA_LIVE_MODULES` | Effect |
|---|---|---|---|
| **Production** | `off` | ignored | every keyed row is live; every Django-first row calls Django only; a row with no Django route answers `501` «غير متاح بعد.» |
| Staging / staged rollout | `on` | the keys already verified on that environment, e.g. `reports,catalog,products` (the 2026-10-24 state) | listed modules live, the rest on fixtures; one module can be rolled back by removing its key |
| Staging, everything live but fixtures kept as fallback | `on` | `*` | all 39 keys live; Django-first rows still fall back to fixtures when Django is down |
| Local development (default) | `on` (unset) | empty or `none` | everything on fixtures except Django-first rows, which use Django when it runs |
| Mock E2E scripts | `on` | `none` | see [`21-mock-runtime.md#4-flows`](21-mock-runtime.md#4-flows) |

The full 39-key sample line is in [`../ops/environment.md#live-modules`](../ops/environment.md#live-modules).

## 6. Parity with `.env.example`

`.env.example:79` holds the sample line (commented):

```
# SHARWA_LIVE_MODULES=reports,catalog,products,orders,search,notifications,settings,pwa,customers,design,marketing,payments,shipping,staff,integrations,platform,platform_money,platform_billing,pos,affiliates,procurement,bookings,channels,marketplaces,dropshipping,apps,sharwa_ai,support,expenses,b2b,advanced_products,courier,sharwa_ship,sharwa_pay,rollup
```

| # | Key | In code | In `.env.example:79` | Described in the comment block (`.env.example:18–78`) |
|---|---|---|---|---|
| 1 | `reports` | ✓ | ✓ | named only |
| 2 | `catalog` | ✓ | ✓ | ✓ |
| 3 | `products` | ✓ | ✓ | ✓ |
| 4 | `orders` | ✓ | ✓ | ✓ |
| 5 | `search` | ✓ | ✓ | ✓ |
| 6 | `notifications` | ✓ | ✓ | ✓ |
| 7 | `settings` | ✓ | ✓ | ✓ |
| 8 | `pwa` | ✓ | ✓ | ✓ |
| 9 | `customers` | ✓ | ✓ | ✓ |
| 10 | `design` | ✓ | ✓ | ✓ |
| 11 | `marketing` | ✓ | ✓ | ✓ |
| 12 | `payments` | ✓ | ✓ | ✓ |
| 13 | `shipping` | ✓ | ✓ | ✓ |
| 14 | `staff` | ✓ | ✓ | ✓ |
| 15 | `integrations` | ✓ | ✓ | — |
| 16 | `inventory` | ✓ | ✓ (Step 52) | — |
| 17 | `locations` | ✓ | ✓ (Step 52) | — |
| 18 | `returns` | ✓ | ✓ (Step 52) | — |
| 19 | `wallets` | ✓ | ✓ (Step 52) | — |
| 20 | `platform` | ✓ | ✓ | ✓ |
| 21 | `platform_money` | ✓ | ✓ | ✓ |
| 22 | `platform_billing` | ✓ | ✓ | ✓ |
| 23 | `pos` | ✓ | ✓ | ✓ |
| 24 | `affiliates` | ✓ | ✓ | ✓ |
| 25 | `procurement` | ✓ | ✓ | ✓ |
| 26 | `bookings` | ✓ | ✓ | ✓ |
| 27 | `channels` | ✓ | ✓ | ✓ |
| 28 | `marketplaces` | ✓ | ✓ | ✓ |
| 29 | `dropshipping` | ✓ | ✓ | ✓ |
| 30 | `apps` | ✓ | ✓ | ✓ |
| 31 | `sharwa_ai` | ✓ | ✓ | ✓ |
| 32 | `support` | ✓ | ✓ | ✓ |
| 33 | `expenses` | ✓ | ✓ | ✓ |
| 34 | `b2b` | ✓ | ✓ | ✓ |
| 35 | `advanced_products` | ✓ | ✓ | ✓ |
| 36 | `courier` | ✓ | ✓ | ✓ |
| 37 | `sharwa_ship` | ✓ | ✓ | ✓ |
| 38 | `sharwa_pay` | ✓ | ✓ | ✓ |
| 39 | `rollup` | ✓ | ✓ | ✓ |
| | **Total** | **39** | **35** | |

> ⚠️ Discrepancy — roadmap says the register "matches `src/lib/bff` source and `.env.example` line by line" / the register matches the code (39 keys), but `.env.example:79` lists 35: `inventory`, `locations`, `returns` and `wallets` (INT-024, INT-025, INT-026, INT-028) are missing, and the comment block above it describes none of them nor `integrations`. Anyone who copies the sample line switches 35 modules and leaves those four on fixtures. `.env.example` is configuration, not documentation: it is **not** edited in this step; the fix is DOC-461, scheduled for Step 52 with the other A.13 fixes. The correct line is in [`../ops/environment.md#live-modules`](../ops/environment.md#live-modules). Reported in official Step 07. **Fixed in official Step 52 (2026-10-30)**: `.env.example` now lists all 39 keys (KI-01, DOC-461). The table above now reads ✓ in the `.env.example` column for all four keys.

## 7. Configuration

| Variable | Rule |
|---|---|
| `SHARWA_LIVE_MODULES` | comma-separated, case-insensitive, spaces trimmed; `*` = all; unknown words are accepted and match nothing (`src/env.ts` checks characters only) |
| `SHARWA_MOCKS` | `off` makes every key live and the list irrelevant |

## 8. Failure modes and fixes

| Failure | Symptom | Cause | Handling |
|---|---|---|---|
| Inventory, locations, returns or wallet screens stay on fixtures after copying the sample line | `x-sharwa-mock: 1` on `/api/bff/inventory/*` etc. | the four keys were missing from `.env.example:79` before Step 52 (an old copy of the file) | use the 39-key line from [`../ops/environment.md#live-modules`](../ops/environment.md#live-modules) |
| A key "does nothing" | row stays on the fixture | typo; the list is not validated against key names | compare with §3 |
| Sharwa Ship zones list stays on fixtures with `sharwa_ship` live | zones table shows fixture data | the zones list is a `shipping` row | add `shipping` |
| Sharwa Pay rows `404` on a store host | `404` | `sharwa_pay` rows answer only on the platform origin | open them on the platform origin |
| Console rows `404` «غير موجود.» | `404` on `/api/bff/platform/*` | the catch-all answers only on the console host (`console.<base>`) | open the console on its own host |

## 9. Open items

- ~~`.env.example` sample line and comment block (§6)~~ — fixed in Step 52 (DOC-461, 2026-10-30).
- Key names are not validated at boot; a typo is silent.

## 10. Related pages

- [`20-bff.md`](20-bff.md) — `liveOrMock`, products rules, adapters
- [`21-mock-runtime.md`](21-mock-runtime.md) — what "not live" means
- [`01-domain-map.md`](01-domain-map.md) — keys per domain
- [`../api/overview/bff.md#live-keys`](../api/overview/bff.md#live-keys) — the API-level row map
- [`../ops/environment.md#live-modules`](../ops/environment.md#live-modules) — sample line and parity check
- [`../ops/runbooks/switch-module-live.md`](../ops/runbooks/switch-module-live.md) — switch a module live / roll it back
