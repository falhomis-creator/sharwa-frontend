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
