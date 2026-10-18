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
| `settings` (GET the whole `StoreSetting` row, no secrets), `settings/{identity,contact,policies,shipping,currency,seo,announcement,payments}` (PATCH → full row), `settings/multi-location` (POST `{enabled, merge?}` → 200 / readable 409) | mock (`[NEEDS BACKEND]` — M34 §7); shipping/currency/payments/multi-location owner-only | M34 |

All Phase 3D adapters go through `src/lib/bff/mock-route.ts` (`mockRoute`): 401 without a
session → 501 when mocks are off (no fabricated data against a real backend) → 403 when
the member lacks the row's permission → the per-store fixture (`globalThis`, so route
handlers and Server Components share one state). The Ready rows (`/api/v1/returns/*`,
`/api/v1/orders/b2b-draft*`, `/api/v1/catalog/*`) keep using the transparent passthrough.

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
