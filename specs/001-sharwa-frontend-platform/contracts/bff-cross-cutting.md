# Contract — Proxy, BFF, Auth/CSRF, Errors, Money, Cache keys, Env, Mocks

**Status**: Normative for all 49 modules · **Backend**: Django 6.1 + DRF (read-only, `C:\sharwa_saas`) · **Source**: discovery 03 §1–2, §7–9; M47; constitution V, VIII, IX.

---

## 1. Tenant resolution (`src/proxy.ts` + `src/lib/tenant.ts`)

Input: `Host` header only (normalized: lowercase, port stripped). No I/O.

```
resolveTenant(host, base = env.TENANT_BASE_DOMAIN):
  host == base || host == `www.${base}`            → { kind:'platform' }
  host == `console.${base}`                        → { kind:'reserved', group:'admin' }
  host == `admin.${base}`                          → 308 → https://console.<base>/
  host endsWith `.${base}`:
      sub = host.slice(0, -(base.length+1))
      sub ∉ /^[a-z0-9]+$/ (incl. multi-level)      → not_found (404 page, platform palette)
      sub ∈ RESERVED_SUBDOMAINS                     → table: www→platform, console→admin, others→404
      else                                          → { kind:'subdomain', store: sub, storeHost: host }
  otherwise                                         → { kind:'custom_domain', store: host, storeHost: host }
```

Rewrite table: see `research.md` R-03. Internal prefixes `/_s /_d /_p /_c /_a` are rejected (404) when they arrive from the network. The resolved store is also set as request header `x-sharwa-store` for RSC `headers()`.

`RESERVED_SUBDOMAINS` (verbatim from `tenants/validators.py`): `www, admin, administrator, root, api, dashboard, mail, email, support, help, app, sharwa, sharrwah, static, media, test, demo, staging, public, localhost, ai, console`.

Store existence/state is **not** checked in the proxy. The group layout performs the probe `GET /api/v1/config/` and maps: 200 → render · 404 → `store-not-found` · 403 → `store-inactive` (if reason = session bound elsewhere: clear `sessionid` for this origin and retry once) · 503 → `store-provisioning` (response carries `Retry-After: 10`).

## 2. Same-origin BFF

### 2.1 Passthrough — `src/app/api/v1/[...path]/route.ts`
| Direction | Rule |
|---|---|
| Upstream URL | `${API_INTERNAL_URL}/api/v1/${path}${search}` |
| Request headers added | `X-Store-Domain: <storeHost>` (storefront/dashboard hosts only), `X-Forwarded-Host: <host>`, `X-Forwarded-Proto`, `X-Real-IP` |
| Request headers forwarded | `Cookie`, `Content-Type`, `Accept`, `Accept-Language`, `X-CSRFToken` (if client sent), `Idempotency-Key` |
| Unsafe methods (POST/PUT/PATCH/DELETE) | If `X-CSRFToken` missing, inject server-held token for this session (see §3) |
| Response | Status + body streamed unchanged; `Set-Cookie` forwarded verbatim (Django sets no `Domain` → first-party on the store origin); `Retry-After` forwarded |
| Never | No caching (`dynamic`), no body transformation, no error rewriting |

### 2.2 Adapters — `src/app/api/bff/**/route.ts`
Next-owned endpoints with the **proposed** shapes from module §7. Two implementation modes per endpoint, switchable without touching UI:

| Mode | When | Behaviour |
|---|---|---|
| `legacy` | Django has an HTML/JSON view but no `/api/v1` route (e.g. `/register/check-subdomain/`, `/register/status/<token>/`, `/dashboard/login/`) | Handler calls the legacy URL on `API_INTERNAL_URL` with forwarded `Host`, translates the response to the §7 shape |
| `mock` | Row is `[NEEDS BACKEND]` | Handler serves from `src/mocks/<module>/*.ts` (deterministic fixtures, Arabic text, `display_*` strings), adds `x-sharwa-mock: 1`; in dev the shell shows a 1px amber indicator «بيانات تجريبية» |

Path convention: `/api/bff/<module-slug>/<resource>` mirrors the proposed `/api/v1/<resource>` so the final switch is a one-line base-path change in `src/lib/api-client.ts`.

## 3. Authentication & CSRF

- **Storefront**: anonymous. Cart identity = Django `sessionid` cookie. All browser calls use `credentials: 'include'` (same origin → automatic).
- **Merchant/staff**: Django session (`is_merchant_authenticated` / `request.staff`) + CSRF (`X-CSRFToken`). Login/logout are legacy HTML POSTs → BFF adapters `POST /api/bff/auth/merchant/login`, `/staff/login`, `/logout` until `/api/v1/auth/*` ships.
- **CSRF token acquisition** (`CSRF_COOKIE_HTTPONLY=True`): the dashboard layout (RSC) calls `GET ${API_INTERNAL_URL}/dashboard/login/` through the BFF, reads `Set-Cookie: csrftoken=…`, forwards that cookie to the browser, and passes the token value as a prop to `ApiClientProvider` (also `<meta name="csrf-token">`). **Forbidden**: reading `csrftoken` from `document.cookie`.
- **Refresh**: a 403 whose `detail` contains `CSRF` → re-acquire once → retry once → else surface.
- **Session invalidation**: 401, or 403 after `token_version` change → redirect to `/dashboard/login?next=…` with message «انتهت جلستك».
- **Customers** have no accounts: phone + WhatsApp OTP per flow; the frontend never stores OTP codes.
- **Super admin** (`console.<base>`): Django admin session on `/api/v1/platform/*` and `/api/v1/admin/*` — `[NEEDS BACKEND]`; until then `(admin)` runs fully on mocks.

## 4. Error envelope (DRF defaults) → `ApiError`

| HTTP | Body | Frontend handling |
|---|---|---|
| 400 | `{field: [msg]}` or `{detail}` | map to RHF field errors / inline message |
| 401 | `{detail}` | redirect to login |
| 403 | `{detail}` | CSRF → refresh+retry once; tenant inactive → `store-inactive`; permission → «ليست لديك صلاحية» in place |
| 404 | `{detail}` | store probe → `store-not-found`; entity → `not-found.tsx` of the group |
| 409 | `{detail}` (+ `version` conflicts) | «تعارض نسخة» panel: reload entity, re-apply once with user confirmation |
| 428 | `{detail}` | OTP step-up dialog (POS refunds) |
| 429 | `{detail}` + `Retry-After` | disable action for `Retry-After` seconds, show countdown (Mono) |
| 503 | `Retry-After: 10` | provisioning wait page (M47) |

All messages are Arabic as sent by the server; the client adds no English fallbacks.

## 5. Money, numbers, dates
- Money is **never** formatted or summed client-side. Render `display_*` strings in `<Money>` (`font-mono tabular-nums`, `dir="ltr"`). Currency codes: `SAR | USD | YER_OLD | YER_NEW`, no FX conversion.
- Inputs for amounts are decimal strings; `currency` sent explicitly where the API takes it.
- Dates: `Intl.DateTimeFormat('ar', { numberingSystem: 'latn', timeZone: store.timezone })` in `src/lib/format.ts`; relative times via `Intl.RelativeTimeFormat('ar')`.

## 6. Pagination, filtering, URL state
- Server: `?page=&page_size=` (default 20, storefront max 50) → `{count, next, previous, results}`; hand-rolled filters per endpoint (see module §7).
- Client: every list state (page, filters, sort, q, density) lives in the URL via `nuqs`; keys are stable English slugs.

## 7. Cache isolation
- `'use cache'` functions take `store` as first argument and call `cacheTag(\`store:${store}\`)`; revalidation targets that tag only.
- TanStack Query keys: `['store', store, <feature>, ...params]`. Hydration boundaries never cross groups.
- Service worker (store origin only): network-only for `/api/v1/cart*`, `/api/v1/config/`; network-first for other `/api/*`; cache-first for images/fonts with the host in the cache name. Platform origin registers no SW; `(pay)` has its own scoped at `/sharwa-pay/`.

## 8. Environment (validated by `src/env.ts` with `@t3-oss/env-nextjs` + Zod; build fails if missing)
| Var | Side | Required | Notes |
|---|---|---|---|
| `TENANT_BASE_DOMAIN` | server + `NEXT_PUBLIC_` mirror | yes | `localhost` in dev, `sharwaah.com` prod |
| `API_INTERNAL_URL` | server | yes | Django origin reachable from Next (`http://localhost:8000`) |
| `API_PROXY_URL` | server | no | overrides `API_INTERNAL_URL` for split environments |
| `NEXT_PUBLIC_PLATFORM_WHATSAPP` | public | yes | support button on 403/failed pages |
| `SHARWA_MOCKS` | server | no (`on` in dev) | `on` → BFF adapters serve mocks for `[NEEDS BACKEND]` rows; `off` → 501 `{detail:'غير متاح بعد'}` |
| `VAPID_PUBLIC_KEY` | public | no | fallback when `/api/v1/push/vapid-public-key/` unreachable |

Nothing server-side is exposed to the browser; `API_*` never appear in client bundles (`server-only` import guard in `src/lib/bff/*`).

## 9. Headers summary (browser ⇄ Next ⇄ Django)
```
Browser → Next   : Cookie, X-CSRFToken (optional), Idempotency-Key (optional)
Next → Django    : + X-Store-Domain, X-Forwarded-Host, X-Forwarded-Proto, X-Real-IP, X-CSRFToken (injected if absent on unsafe methods)
Django → Next    : Set-Cookie (verbatim), Retry-After (verbatim), Content-Type
Next → Browser   : same + x-sharwa-mock: 1 (adapters in mock mode only)
```
