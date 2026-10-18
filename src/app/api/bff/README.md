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
| `categories/**` (incl. `reorder`, `DELETE ?reassign_to&children`), `brands/**`, `tags/**` (incl. `merge`), `collections/**` (incl. `products`, `products/[pid]`, `products/reorder`), `badges/**` | mock (`[NEEDS BACKEND]` — M05 §7) | M05 |
| `orders` (GET list · POST manual/B2B), `orders/[id]` (GET · PATCH pickup/gift), `orders/[id]/{fulfillment-status,status,payment/[action],refunds}` (versioned, 409 on stale `version`), `orders/counters`, `orders/form-options` | mock (`[NEEDS BACKEND]` — M06 §7) | M06 |
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
| `settings` (GET the whole `StoreSetting` row, no secrets), `settings/{identity,contact,policies,shipping,currency,seo,announcement,payments}` (PATCH → full row), `settings/multi-location` (POST `{enabled, merge?}` → 200 / readable 409) | mock (`[NEEDS BACKEND]` — M34 §7); shipping/currency/payments/multi-location owner-only | M34 |

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
`sharwa_mock_session=merchant|staff` that stands in for Django's `sessionid`; `getSession()`
reads it and `auth/logout` clears it. The fixture credentials live in
`src/mocks/dashboard/auth.ts` (one merchant password, one staff phone, one inactive staff
phone, one OTP code). With mocks off, only a real Django session is consulted.
