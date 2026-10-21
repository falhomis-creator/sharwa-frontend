# `/api/bff/*` — Next-owned adapters

Contract: `specs/001-sharwa-frontend-platform/contracts/bff-cross-cutting.md` §2.2.

- Path convention mirrors the proposed `/api/v1/<resource>` from each module's §7, under `/api/bff/<module>/<resource>`; switching to the real endpoint later is a base-path change in `src/lib/api-client.ts` callers (or deleting the adapter).
- Each `route.ts` runs in one of two modes:
  - **legacy** — Django has an HTML/JSON view but no `/api/v1` route: call it through `upstreamFetch()` and translate to the §7 shape.
  - **mock** — the row is `[NEEDS BACKEND]`: answer from `src/mocks/<module>/*.ts` via `mockJson()` (adds `x-sharwa-mock: 1`). When `SHARWA_MOCKS=off`, return `notAvailable()` (501).
- Adapters never cache: with Cache Components, route handlers that read the request are dynamic automatically (do NOT export `dynamic`; it is rejected by `cacheComponents`).
- Never invent authentication: merchant/staff endpoints forward the browser's cookies and `X-CSRFToken` exactly like the `/api/v1` passthrough.

| Adapter | Mode | Module |
|---|---|---|
| `public/check-subdomain` | legacy → mock fallback | M01, M02 |
| `public/plans`, `public/stats` | target → mock fallback | M01 |
| `public/provisioning/[token]` | legacy (`/register/status/<token>/`) → mock; unknown token → 404; clears `sharwa_prov` on `ready` | M47, M02 |
| `public/market-categories` | target (`/api/v1/public/market-categories/`) → mock | M02 |
| `public/register`, `public/register/verify-otp`, `public/register/resend-otp` | target (`/api/v1/public/register/…`) → mock; verify sets `sharwa_prov` | M02 |
| `public/reset-store-session` | local (expires a foreign `sessionid`) | M47 US-47.2.3 |
| `auth/csrf` | legacy (`Set-Cookie: csrftoken` of `GET /dashboard/login/`) → mock | M47, M03 |
| `auth/merchant/login`, `auth/staff/login`, `auth/logout` | target → mock | M03 |
| `auth/setup-password`, `auth/forgot-password`, `auth/reset-password` | target → mock | M03 |
| `dashboard/me`, `dashboard/overview`, `dashboard/overview/refresh`, `dashboard/counters` | mock | M03 |
| `account/stores` | mock | M03, M43 |
| `products`, `products/[id]`, `products/quick`, `products/bulk`, `products/export.csv`, `products/[id]/{stock,images,variants/generate,variants/bulk,changes}`, `products/variant-attributes/**`, `products/templates/**`, `products/global-templates`, `products/import/**` | mock (`[NEEDS BACKEND]` — M04 §7) | M04 |
| `categories/**` (incl. `reorder`, `DELETE ?reassign_to&children`), `brands/**`, `tags/**` (incl. `merge`), `collections/**` (incl. `products`, `products/[pid]`, `products/reorder`), `badges/**` | **integrated** (module `catalog`, 2026-10-21) — `liveOrMock` passthrough to `/api/v1/{categories,brands,tags,collections,badges}/…` on Django, fixture when not live. Reads: any member; writes: `catalog.manage` (owner implicit). Live writes revalidate the store tag | M05 |
| `orders` (GET list · POST manual/B2B), `orders/[id]` (GET · PATCH pickup/gift), `orders/[id]/{fulfillment-status,status,payment/[action],refunds}` (versioned, 409 on stale `version`), `orders/counters`, `orders/form-options` (methods + pickups read from the M15 shipping state since 2026-10-19) | mock (`[NEEDS BACKEND]` — M06 §7) | M06 |
| `order-statuses/**` (incl. `reorder`) | mock (`[NEEDS BACKEND]`) | M06 |
| `search` (`?q&types&limit`, groups trimmed by permission) | mock (`[NEEDS BACKEND]` — M48 §7) | M48 |
| `notifications`, `notifications/summary`, `notifications/[id]/read`, `notifications/read-all` | mock (`[NEEDS BACKEND]` — M49 §7) | M49 |
| `catalog/facets`, `catalog/offers` | target (`/api/v1/catalog/{facets,offers}/`) → mock | M09 |
| `catalog/products/[id]/{reviews,auction,auction/bids,available-slots,quote,back-in-stock}` | target → mock (`[NEEDS BACKEND]` — M10 §7) | M10 |
| `wishlist/toggle` | target → mock (the list itself is local until a buyer session exists) | M10 |
| `cart/coupon` (POST · DELETE), `cart/contact`, `cart/restore` | target → mock; the cart is the passthrough `/api/v1/cart/*` (Ready) | M11 |
| `checkout` (POST multipart, idempotent on `client_uuid`, invalidates the store tag), `checkout/{delivery-options,payment-options,quote}`, `checkout/cod-otp/{send,verify}`, `checkout/sharwa-pay/otp/send` | target → mock (`[NEEDS BACKEND]` — M12 §7) | M12 |
| `wallet/{balance-preview,otp/send}`, `loyalty/{balance,otp/send,redeem}` | target → mock | M12 |
| `customers/otp/send` | target → mock — **proposed** endpoint (buyer OTP outside checkout: reviews, back-in-stock) | M10, M12 |
| `orders/public/[uuid]`, `orders/public/[uuid]/receipt` (multipart) | target → mock | M12 |
| `orders/track/[uuid]` | target (`/api/v1/orders/track/<uuid>/`) → mock; another store's UUID = 404 | M41 |
| `storefront/currency` | local (sets the display-preference cookie `sharwa_currency`; the cart currency is pinned through `/api/v1/cart/?currency=`) | M09, M11 |
| `settings` (GET the whole `StoreSetting` row, no secrets), `settings/{identity,contact,policies,shipping,currency,seo,announcement,payments}` (PATCH → full row), `settings/multi-location` (POST `{enabled, merge?}` → 200 / readable 409) | mock (`[NEEDS BACKEND]` — M34 §7); shipping/currency/payments/multi-location owner-only. **`PATCH settings/payments` is unused since 2026-10-19**: the toggles are edited only through `store/payments` (M14); the M34 section is a read-only summary | M34 |
| `customers` (list `?q&segment&product_id&last_order_from&last_order_to&min_spent&trust&has_wallet&has_points&ordering&page`), `customers/[phone]`, `[phone]/{orders,wallet/transactions,points,wishlist,reviews}`, `[phone]/notes` (GET · POST) · `notes/[id]` (DELETE), `[phone]/cod` (POST), `customers/export.csv` (403 without `customers.export`; 429 on critical), `customers/segments/count`, `reviews/[id]` (PATCH reply) | mock (`[NEEDS BACKEND]`) | M07 |
| `store/theme` (GET · PATCH JSON or multipart with `logo`; 409 on stale `version`), `store/theme/presets`, `store/announcement` (same M34 row) | mock (`[NEEDS BACKEND]`) | M08 |
| `admin/sections` (GET · POST), `admin/sections/[id]` (PATCH · DELETE), `admin/sections/reorder` (POST `{ordered_ids}`) | mock — Ready upstream pending owner-session auth (today `IsAdminUser`) | M08 |
| `marketing/summary`, `marketing/coupons` · `[id]`, `marketing/offers` · `[id]` (JSON or multipart) | mock (`[NEEDS BACKEND]`) — read `discounts.apply`, write `discounts.manage` | M13 |
| `marketing/abandoned-carts` · `[id]` · `[id]/remind`, `marketing/abandoned-carts/settings`, `marketing/campaigns` · `[id]` · `[id]/preview` · `[id]/send` · `channels`, `marketing/timeline` · `[id]`, `marketing/loyalty`, `marketing/gifting` | mock (`[NEEDS BACKEND]`) — owner only | M13 |
| `payments/gateways` · `[code]` (PATCH `{is_enabled}`) · `[code]/credentials` (PUT, 204; empty secret keeps value; secrets never returned) | mock (`[NEEDS BACKEND]`) — owner only | M14 |
| `store/payments` (GET · PATCH `{enable_sharwa_pay, enable_manual_payment}`, writes the M34 row), `payments/payout-accounts` · `[id]` · `reorder` (400 when tied to a pending withdrawal) | mock (`[NEEDS BACKEND]`) — owner only | M14 |
| `wallet`, `wallet/transactions`, `wallet/withdrawals` (GET · POST with idempotency key), `wallet/dues` | mock (`[NEEDS BACKEND]`) — owner only | M14 |
| `shipping/settings` (M34 row), `shipping/delivery-methods` · `[id]`, `shipping/pickup-locations` · `[id]` · `reorder`, `shipping/providers` · `[id]` · `staff-options`, `shipping/carriers` · `[code]` · `[code]/credentials` · `[code]/test`, `shipping/sharwa-ship/zones`, `shipping/packaging-profiles` · `[id]`, `shipping/zone-review` · `[orderId]/resolve`, `shipping/restricted-zones` · `[id]`, `shipping/sla-rules` · `[id]` | mock (`[NEEDS BACKEND]`) — owner only. Active methods/pickups are also the source for `checkout/*`, `orders/form-options` and tracking (`checkoutDeliveryMethods` / `checkoutPickups` / `findPickup`) | M15 |
| `shipping/edge-cases` (`orders.view`), `shipments/[id]/address` · `orders/[id]/convert-to-pickup` (POST, `orders.update_status`; 409 on stale `version`) | mock (`[NEEDS BACKEND]`) | M15 |
| `staff` · `[id]` · `[id]/terminate` · `[id]/revoke-sessions`, `staff/counters`, `staff/[id]/{assignments,overrides,effective-permissions,sessions,tokens,devices,roster}` (+ item routes) | mock (`[NEEDS BACKEND]`) | M18 |
| `roles` · `[id]` (DELETE in use → 403 with the staff list), `permissions`, `approvals` · `[id]/resolve` (409 stale `version`; 403 self-approval), `audit-log` · `verify`, `behavior-alerts` · `[id]/read` | mock (`[NEEDS BACKEND]`) | M18 |
| `domains` · `[id]` · `[id]/verify` · `[id]/set-primary`, `store/tracking` (`has_*` only, tokens write-only), `webhooks/events`, `webhooks/endpoints` · `[id]` · `rotate-secret` · `test` · `deliveries`, `webhooks/deliveries/[id]/redeliver` | mock (`[NEEDS BACKEND]`) — owner only | M19 |
| `integrations/status` | mock (`[NEEDS BACKEND]`) — any member; rows filtered by `channels.*` | M19 |
| `inventory` (list), `inventory/counters`, `inventory/export.csv`, `inventory/adjustments`, `inventory/movements`, `inventory/items`, `inventory/reservations`, `inventory/writeoffs` (creates an M18 approval) | mock (`[NEEDS BACKEND]`) — `inventory.view` / `inventory.adjust` | M21 |
| `locations` · `[id]` (writes owner only; `code` uniqueness 400), `locations/mode` (mirrors `settings/multi-location`), `[id]/deactivation-impact`, `[id]/inventory` · `adjust` · `[unit]`, `[id]/staff` · `[aid]`, `locations/staff-options`, `locations/routing-rules` · `[id]` · `reorder` · `preview` | mock (`[NEEDS BACKEND]`) | M22 |
| `/api/v1/returns/` (GET · POST), `returns/<pk>/`, `returns/order/<id>/items/`, `returns/<pk>/approve/` (`{decision, version, location_id?, note?}`; 409; `CashLiquidityError`), `returns/rma/create/`, `warehouse/returns/scan/`, `warehouse/returns/<rma_id>/qa-decision/` | passthrough (dev fixture `src/mocks/returns/passthrough.ts`) | M24 |
| `returns/rma` · `[id]`, `orders/refunds` (legacy OrderRefund log), `returns/options` (active M22 locations for the warehouse keeper) | mock (`[NEEDS BACKEND]`) | M24 |
| `reports` (index), `reports/[code]`, `reports/[code]/exports`, `reports/exports` · `[job]` · `[job]/download?token=` (410 when expired), `reports/schedules` · `[id]`, `reports/refresh-today` | mock (`[NEEDS BACKEND]`) — feature `reports` | M25 |
| `customers/wallets` · `[id]` · `[id]/topup` (idempotency key) · `[id]/transactions`, `loyalty/program`, `loyalty/points` · `[phone]/transactions` | mock (`[NEEDS BACKEND]`) | M35 |
| `shopper/phone` (GET · POST, bound to the cart session), `wishlist` (GET by phone, current prices), `wishlist/toggle` (409 without a phone), `store-reviews` (GET · POST), `catalog/products/[id]/reviews?rating=`, `catalog/products/[id]/back-in-stock` (201 then 200) | storefront adapter → mock (`[NEEDS BACKEND]`) | M42 |

All Phase 3D adapters go through `src/lib/bff/mock-route.ts` (`mockRoute`): 401 without a
session → 501 when mocks are off (no fabricated data against a real backend) → 403 when
the member lacks the row's permission → the per-store fixture (`globalThis`, so route
handlers and Server Components share one state). The Ready rows (`/api/v1/returns/*`,
`/api/v1/orders/b2b-draft*`, `/api/v1/catalog/*`) keep using the transparent passthrough.

**Storefront adapters (Phase 4).** Every storefront row goes through `storefrontAdapter()`
(`src/lib/bff/storefront-adapter.ts`): it calls the documented `/api/v1/...` target first
with the browser's cookies and `X-Store-Domain`, and answers from `src/mocks/storefront/*`
only while that target is 404/405/501 or unreachable (`x-sharwa-mock: 1`); with mocks off it
returns 501. The mock cart identity is the dev-only cookie `sharwa_mock_cart`, standing in for
Django's session cart. Writes that change what a cached storefront read returns (an order
decrements stock) call `revalidateTag(storeTag(store), { expire: 0 })`.

**Why the auth adapters are `target` and not `legacy`.** All seven auth rows are
`[NEEDS BACKEND]`. Django exposes only HTML form POSTs (`/dashboard/login/` and friends),
and their form field names are not in `specs/discovery/**`; scraping the templates to learn
them would copy backend logic into the frontend (constitution V). So each adapter calls the
documented target route `/api/v1/auth/<path>/` and falls back to the fixture while that
route answers 404/405/501. CSRF is the exception and IS implemented against the legacy page,
because reading `Set-Cookie: csrftoken` needs no field names.

**Local session marker.** While `SHARWA_MOCKS=on` the login adapters set a dev-only cookie
`sharwa_mock_session=merchant|staff|manager` that stands in for Django's `sessionid`; `getSession()`
reads it and `auth/logout` clears it. The fixture credentials live in
`src/mocks/dashboard/auth.ts` (one merchant password, one staff phone, one inactive staff
phone, one OTP code). With mocks off, only a real Django session is consulted.


## Platform console — `/api/bff/platform/*` (Phase 6 · M20 / M45 / M46)

ONE catch-all adapter, `platform/[...path]/route.ts`, maps `/api/bff/platform/<path>` to the
proposed `/api/v1/platform/<path>/` one-to-one; the mock server is `src/mocks/platform/router.ts`.
It answers on `console.<base>` only (404 on store, custom and marketing hosts — FR-20.01) and
reads the dev marker `sharwa_mock_admin=superuser|operator` (local users `admin` / `ops`,
password as the other mocked logins). Gates in order: 401 without a console session → 403
when `operator` writes anything but dues / Sharwa Pay (FR-20.09) → the row's own 400/404/409.
M45/M46 proposed `/api/v1/admin/*` for some rows; they are unified under `platform/` here
(`/api/bff/admin/*` is M08's storefront sections).

| Rows (after `platform/`) | Spec |
|---|---|
| `auth/login` (POST), `auth/logout` (POST), `auth/me` | M20 §7 «المصادقة» |
| `overview` | US-20.1 |
| `stores` (`?status=pending\|provisioning\|ready\|failed\|stalled&plan&is_active&q&ordering&page`), `stores/<schema>`, `stores/reprovision` (POST `{schemas}` → per-store report), `stores/<schema>/sharwa-ship` (POST `{active}`, async «قيد التفعيل»), `stores/<schema>/domains` (POST) · `domains/<id>` (POST = make primary), `stores/<schema>/deactivation` (GET options with reasons · POST `{action: suspend\|deactivate\|close\|reinstate, reason, grace_period_ends_at}`), `clients?q` | US-20.2, US-20.7 |
| `stores/<schema>/features` (GET resolved 39 · PUT `{overrides:[{code, is_enabled\|null, notes}]}`), `feature-overrides` (`?feature&schema`) · `bulk` (POST `{feature_code, schema_names, is_enabled\|null, notes}`) · `<id>` (DELETE) | US-20.2 a4, US-46.3 |
| `plans` · `<id>` (PATCH/DELETE — 409 with the current-subscription count), `plan-features` (GET · PUT one cell), `features` · `<code>` (PATCH kill switch / `requires_plan`) · `<code>/resolve?schema` (`decided_by`), `subscriptions` (`?schema&status&current&q`) · `assign` (POST), `billing-settings` (GET/PATCH) | US-20.3, M46 |
| `apps` · `<code>`, `app-billing-overrides` · `<id>`, `market-categories` · `<id>` · `reorder`, `sharwa-ship/zones` · `<id>`, `webhook-events` (`?status&source`) · `<id>/retry\|discard` | US-20.6, US-20.7, US-46.5 |
| `dues/overview` (`?q&period`), `dues/<schema>`, `dues/<schema>/actions` (POST `{action, record_id\|installation_id}` — the 8 FR-45.03 values; 200 `{detail, level, entry}`, 400 «تعذّر التحصيل: …», 409 «… تم التعامل معه مسبقاً») | M45 |
| `sharwa-pay/topups` · `<id>/approve\|reject`, `sharwa-pay/withdrawals` · `<id>/confirm\|reject`, `sharwa-pay/wallets/<phone>` | US-20.5 |

**One source of truth.** `src/mocks/platform/state.ts` resolves every store's features with the
FR-46.04 order (`resolveFeature`) and the merchant session (`/api/bff/dashboard/me`) reads it, so
the console and the merchant sidebar cannot disagree (SC-20.4). The Sharwa Ship zones M15 reads
and the market categories the M02 wizard reads are the console's rows too.


## Phase 7 — channels and extensions (M16 M17 M23 M26–M33 M36–M40 M43)

Every row below is `[NEEDS BACKEND]` (mock adapter, 501 with mocks off) unless marked
**Ready** — those are fixtures on the `/api/v1/*` passthrough registry that answer only while
Django is down or 404s. Each module is ONE catch-all (`[...path]`, or `[[...path]]` when the bare
collection root is a row) whose path after the prefix is the proposed upstream path verbatim.
Gates, in order: session 401 → plan feature 403 → permission / owner-only 403 → the row's own
400/404/409/428.

| BFF | Upstream (proposed) | Mock | Module |
|---|---|---|---|
| `pos/*` | `/api/v1/pos/{context,registers,shifts,shifts/current,shifts/pending,shifts/<id>/{movements,close,resolve-variance},products,quote,discount-approvals,orders,orders/<id>,orders/<id>/refund}` (+ mock-only `__reset`) | `src/mocks/pos` | M16 |
| `merchant/stores` (`?from&to`) | `/api/v1/merchant/stores/` — owner only | `src/mocks/rollup` | M43 |
| `affiliates/[[...]]`, `influencers/[[...]]` | `/api/v1/{affiliates,influencers}/*`; writes owner-only; `mark-paid` takes `dry_run` (server preview) | `src/mocks/affiliates` | M17 |
| `expenses/[[...]]` | `/api/v1/expenses/*`; owner-only; edit/delete 405 | `src/mocks/expenses` | M33 |
| `b2b/[[...]]` (`options`; mock-only `_test/bump/<id>`) · **Ready** `orders/b2b-draft/`, `orders/b2b-drafts/`, `orders/b2b-draft/<id>/resolve/` | M36 | `src/mocks/b2b` | M36 |
| `suppliers/[[...]]`, `purchase-orders/[[...]]` (+ mock-only `form-options`, `products`) | `/api/v1/{suppliers,purchase-orders}/*` | `src/mocks/procurement` | M23 |
| `marketplaces/[[...]]` | `/api/v1/marketplaces/*` | `src/mocks/marketplaces` | M28 |
| `dropshipping/[[...]]` (+ mock-only `meta`) | `/api/v1/dropshipping/*` | `src/mocks/dropshipping` | M29 |
| `bookings/*`; `catalog/products/<id>/slots` (GET · POST hold) | `/api/v1/bookings/*`; `/api/v1/catalog/products/<id>/slots/{,hold/}`; slots/availability envelope `{timezone, week_start_day, results}` | `src/mocks/bookings` | M26 |
| `products/<id>/extras/*`, `products/formula-preview` | `/api/v1/products/<id>/{tier-prices,bundle-components,compatibility-rules,personalization-fields,auction,serials}/`, `/api/v1/products/formula-preview/` | `src/mocks/product-extras` | M36 · M37 |
| `inbox/*`, `channels/[[...]]` (+ `:code/oauth/start` → 302) | `/api/v1/{inbox,channels}/*` (mock-only `products`, `_mock/*`) | `src/mocks/inbox` | M27 |
| `apps/[[...]]` | `/api/v1/apps/*` — catalogue + installations ARE the console's rows | `src/mocks/apps` | M30 · M31 |
| `support/*` | `/api/v1/support/*` (mock-only `assignees`, `_mock/*`) | `src/mocks/support` | M31 · M32 |
| `agent/*` (`me`, `shipments`, `shipments/<id>`, `custody`) · **Ready** `/api/v1/agent/*` actions | M38 — staff session + shipping-provider profile | `src/mocks/courier` | M38 |
| `shipping/{sharwa-ship,shipments,awb-queue,rate-cards,supervisor,agents,agent-shifts}/*` | `/api/v1/shipping/*` — the same `ShipmentOrder` rows as M15 and M38 | `src/mocks/shipping/sharwa-ship*.ts` | M39 |
| `sharwa-pay/*` (`otp/send`, `otp/verify`, `wallet`, `transactions`, `requests`, `topups` multipart, `withdrawals`, `logout`) | `/api/v1/sharwa-pay/*` — platform origin only (404 elsewhere); dev marker `sharwa_mock_pay=<phone>`; wallets/top-ups/withdrawals ARE the console's rows | `src/mocks/sharwa-pay` | M40 |
