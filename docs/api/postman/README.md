# Postman — collection and environments

> **Source**: DOC-010 (collection) · DOC-011 (environments) · DOC-012 (CSRF script) · inventory Part C, A.3, A.4, A.10 · INT-002, INT-030, INT-033, INT-048
> **Files**: [`sharwa.postman_collection.json`](sharwa.postman_collection.json) (generated) · [`environments/`](environments/README.md) · [`csrf-pre-request.js`](csrf-pre-request.js)
> **Last verified against code**: 2026-10-27 (step 02)

## 1. What is in the collection

The collection is **generated** by `python scripts/openapi/postman.py` from [`../openapi/sharwa-v1.yaml`](../openapi/sharwa-v1.yaml), so it always holds exactly the routes of `sharwa_saas/api/urls.py`. Do not edit it in Postman and re-export it; change the OpenAPI fragments and regenerate.

| | |
|---|---|
| Requests | **641**, one per Django operation (501 routes) |
| Folders | 3 origin folders → 18 domain folders (all 16 domains; D01 and D08 appear under two origins) → 49 module folders |
| Saved responses | 45, on the documented operations: fixture examples (success + error) and the verbatim Arabic error answers |
| Collection script | [`csrf-pre-request.js`](csrf-pre-request.js) — CSRF token + `Idempotency-Key` on every unsafe request |

### 1.1 Folder tree

```
Sharwa API — /api/v1
├── 1 · Store host — <store>.<base>          ← environment local-store / staging-store
│   ├── D01 … (M47 config)
│   ├── D02 … D15   → module folders (M03, M43, M48, M49 · M04, M05, M37 · … · M25)
│   └── (every store-schema route: storefront visitor, owner/staff dashboard, courier app)
├── 2 · Platform origin — <base> (public schema) ← local-platform / staging-platform
│   ├── D01 Public site, onboarding … (M01, M02)
│   └── D08 Finance … (M40 Sharwa Pay)
└── 3 · Platform console API — public schema    ← local-console / staging-console
    └── D16 Platform owner console (M20, M45, M46)
```

The three origin folders exist so that **cookies never mix** (inventory A.4). The store session, the console admin session and the Sharwa Pay session are three different Django sessions. A store-bound session is refused on another store (403), and the console and Sharwa Pay answer 404 on a store host or with `X-Store-Domain`.

Each **module folder description** carries the module, its INT task and its live key. Each **request description** carries:
- `x-sharwa-status`: `documented`, or `stub` = route and methods only, documented by its domain step;
- the live key;
- the security (session scheme + CSRF);
- the Django view;
- the docs page.

### 1.2 Variables

| Variable | Set by | Used for |
|---|---|---|
| `base_url` | environment | origin of the Django server for the selected origin |
| `x_store_domain` | environment (store only) | `X-Store-Domain` header — empty = store resolved from the host |
| `csrf_token` | pre-request script (and the console login test script) | `X-CSRFToken` on unsafe methods |
| `idempotency_key` | pre-request script | `Idempotency-Key` — a new UUID per send |
| `merchant_phone`, `merchant_password`, `staff_phone`, `staff_password`, `console_username`, `console_password`, `sharwa_pay_phone` | you, locally (type *secret*, empty in the files) | the login request bodies |

Never commit filled-in environments: the files in this folder must keep their secrets empty.

## 2. Environments (DOC-011)

| File | Origin | `base_url` | Notes |
|---|---|---|---|
| [`local-store.json`](environments/local-store.json) | store host | `http://noor.localhost:8000` | Replace `noor` with a store of your local Django (a `tenants.Domain` row `<sub>.localhost`). Or set `base_url=http://localhost:8000` + `x_store_domain=<sub>.localhost` (`TenantHeaderOverrideMiddleware`). |
| [`local-platform.json`](environments/local-platform.json) | platform origin (public schema) | `http://localhost:8000` | Landing/onboarding rows and Sharwa Pay. `x_store_domain` must stay empty. |
| [`local-console.json`](environments/local-console.json) | console API (public schema) | `http://localhost:8000` | `/api/v1/platform/*`. `x_store_domain` must stay empty. |
| `staging-store.json`, `staging-platform.json`, `staging-console.json` | same, staging | placeholders `https://<store>.<base>`, `https://<base>`, `https://<django-public-host>` | Replace the placeholders. DEBUG-only values are absent. |

**Behaviour the environments rely on (from the code):**
- **Store resolution.** Django resolves the tenant from the `Host` (django-tenants `TenantMainMiddleware`; no public fallback is configured, so an unknown host is a 404). Under `/api/`, `X-Store-Domain: <domain>` selects a store explicitly:
  - unknown domain → 404 «لا يوجد متجر مرتبط بالنطاق "<domain>" في ترويسة X-Store-Domain.»;
  - inactive store → 403 «هذا المتجر غير نشط حالياً.»;
  - a session already bound to another store (`auth_tenant_schema`) → 403 «الجلسة الحالية موثَّقة على متجر مختلف — لا يمكن التحويل إلى متجر آخر بهذه الجلسة.»
- **Public-schema-only routes.** Sharwa Pay (`/api/v1/sharwa-pay/*`) answers 404 «غير موجود.» on a store host or with `X-Store-Domain` (INT-048). The console (`/api/v1/platform/*`) answers 404 there too (INT-030).
- **One cookie jar locally.** Locally, `local-platform` and `local-console` point at the same host (`localhost:8000`), so Postman keeps one cookie jar and Django one session for both. Clear the `localhost` cookies (Postman → *Cookies*) when switching between console and Sharwa Pay runs, or give the console a second public-tenant domain.
- **DEBUG-only values** (`local-store` / `local-platform` only, flagged in their descriptions — **never valid in production**):
  - `pos_manager_code_debug = 2468`: accepted as the POS manager code while the store has no `pos_manager_code_hash` and `settings.DEBUG` is on (`products/services/pos_service.py`, `DEBUG_MANAGER_CODE`). Set a real code with `python manage.py set_pos_manager_code --schema=<schema> <code>` (INT-033).
  - `otp_debug = 123456`: `DEBUG_STATIC_OTP` (`api/views_onboarding.py`), accepted by the onboarding OTP verify and the POS large-refund OTP under `DEBUG`. The Sharwa Pay OTP has no such bypass.

## 3. Using it

1. Import `sharwa.postman_collection.json` and the environments (*Import* → select the files).
2. Select an environment, fill its secret variables locally, and check `base_url`.
3. Sign in with the login request of the origin folder:

| Origin | Request | Body |
|---|---|---|
| Store, owner | `POST /api/v1/auth/merchant/login/` (D02 › M03) | `{"phone": "{{merchant_phone}}", "password": "{{merchant_password}}"}` → 204 + session cookie |
| Store, staff | `POST /api/v1/auth/staff/login/` (D02 › M03) | `{"phone": "{{staff_phone}}", "password": "{{staff_password}}"}` |
| Console | `POST /api/v1/platform/auth/login/` (D16 › M20) | `{"username": "{{console_username}}", "password": "{{console_password}}"}` — its test script stores the rotated `csrf_token` |
| Sharwa Pay | `POST /api/v1/sharwa-pay/otp/send/` then `…/otp/verify/` (D08 › M40) | `{"phone": "{{sharwa_pay_phone}}"}`, then `{"phone": …, "code": "<WhatsApp code>"}` |

4. Call any route of the same origin folder. Cookies travel with Postman's cookie jar, and the CSRF header is added for you ([csrf.md › Postman](../overview/csrf.md#postman)).

Login bodies of stub operations are `{}` until Step 03 documents them; type the body shown above.

**Smoke run with Newman** (no install needed):

```bash
# a login + one authenticated GET per origin (DOC-011 acceptance), from sharwa-frontend
npx newman run docs/api/postman/sharwa.postman_collection.json -e docs/api/postman/environments/local-store.json --folder "M25 Reports" --env-var merchant_phone=<phone> --env-var merchant_password=<password>
```

## 4. Regenerating

```bash
python scripts/openapi/build.py      # after a fragment or a Django route changes
python scripts/openapi/postman.py    # then the collection
python scripts/openapi/postman.py --check   # CI: fails if the committed collection is stale
```

Request and folder ids are deterministic (UUID v5 of the operation id), so regenerating does not churn the file.
