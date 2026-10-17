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
| `public/provisioning/[token]` | legacy (`/register/status/<token>/`) → mock | M47, M02 |
| `public/reset-store-session` | local (expires a foreign `sessionid`) | M47 US-47.2.3 |
| `auth/csrf` | legacy (`Set-Cookie: csrftoken` of `GET /dashboard/login/`) → mock | M47, M03 |
| `auth/merchant/login`, `auth/staff/login`, `auth/logout` | target → mock | M03 |
| `auth/setup-password`, `auth/forgot-password`, `auth/reset-password` | target → mock | M03 |
| `dashboard/me`, `dashboard/overview`, `dashboard/overview/refresh`, `dashboard/counters` | mock | M03 |
| `account/stores` | mock | M03, M43 |

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
