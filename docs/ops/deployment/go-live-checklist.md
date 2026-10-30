# Runbook — go-live checklist (switching `SHARWA_MOCKS=off`)

> **Source**: DOC-517 · inventory A.3, A.8, A.9, A.10, A.13 · Part C checkpoints (`specs/002-sharwa-integration/integration-inventory.md`, Part C) · INT-023, INT-033
> **Owner**: fares · **Last dry run**: not dry-run in step 39 (no staging environment was available; nothing below was executed)

> **NOT signed off on staging.** DOC-517 is done only when "the checklist is signed off on staging". It has not been: no staging run happened, and the sign-off table in the last section is empty on purpose. Every "Expected" value below is read from code or configuration; commands marked **derived** were written from the code but not run. The five user-story checkpoints (US1-US5) are recorded in the specs as "all tasks ticked", never as an end-to-end run ([`../../architecture/03-phase-history.md`](../../architecture/03-phase-history.md) §5.1); this checklist makes them a gate but does not claim they pass.

## When to use

Before the production Next.js server is started with `SHARWA_MOCKS=off` (every integrated module answered by Django, `SHARWA_LIVE_MODULES` ignored, rows without a Django provider answer `501` «غير متاح بعد.»), and again on **staging** as the rehearsal that earns the sign-off. Run it top to bottom; a gate that fails stops the go-live.

Switching a single module in a development or staging environment is a different procedure: [`../runbooks/switch-module-live.md`](../runbooks/switch-module-live.md).

## Impact and risk

- `SHARWA_MOCKS=off` is global for the Next.js process: there is no per-module fallback to fixtures in production afterwards (see [`rollback.md`](rollback.md) for what that means for rollback).
- A production server started from a copied development `.env` is the most likely failure: `sharwa_saas/.env.example` ships `DEBUG=True` (line 2), which leaves the static OTP `123456` and the POS manager code `2468` working, and the frontend `.env.example` ships `SHARWA_MOCKS=on` (line 16).
- Most gates are read-only checks. Migrations (G6) and setting manager codes (G12) change data, and G2/G4/G5 involve setting values and restarting; take a database backup first — the repository has no backup tooling (`deploy/deploy.sh`, `docker-compose.prod.yml` contain none).
- Duration: about half a day for a first pass on staging, mostly the US1-US5 walk-throughs.

## Prerequisites

- Access: shell on the Django host(s) with the service `.env`; the Next.js host; a platform-owner account for the console; a store merchant account for the checkpoints.
- Running: Django (Gunicorn), PostgreSQL, Redis, Celery worker **and** Beat, Next.js, Nginx ([`topology.md`](topology.md)).
- Values: `<BASE>` (platform domain), `noor` (a test store), `<SCHEMA>` (its schema), `<EDGE_IP>`.

## Steps

### Gate list

"Verify" says how; the detailed commands are in the section named in the last column. **Status today** is what the repository shows on 2026-10-28, not a run.

| # | Roadmap item | Verify | Expected | Status today | Detail |
|---|---|---|---|---|---|
| G1 | `.env.example` parity | frontend parity script; backend scan | frontend `code: 39 keys · .env.example: 39 keys`; backend: no key read by code and absent from the template | **open**: frontend template lists 35 of 39 (missing `inventory`, `locations`, `returns`, `wallets`); backend: `SHARWA_CHANNELS_RATE_LIMIT_PER_MINUTE` is read by code and absent | G1 |
| G2 | Mocks off in Next.js | start Next.js with `SHARWA_MOCKS=off`, read a BFF response header | no `x-sharwa-mock` header on any row | not run | G2 |
| G3 | DEBUG off (no `2468` / `123456`) | `settings.DEBUG`, `check --deploy`, behavioural probes | `False`; probes rejected | not run | G3 |
| G4 | Required environment present (edge, secrets, hosts) | `check --deploy`, explicit value check | all set, `TENANT_BASE_DOMAIN` = `<BASE>` on both sides | not run | G4 |
| G5 | Env: edge | `SHARWA_EDGE_IP`, `SHARWA_EDGE_CNAME` | real edge values | not run | G5 |
| G6 | All migrations applied (shared + tenants) | `migrate_schemas`, leaf-migration SQL, `makemigrations --check` | every leaf in the table; no output from the check | not run | G6 |
| G7 | Public tenant and platform hosts | shell query | `public` client + one `Domain` per host Django receives without `X-Store-Domain` | **unverified** (nothing in code creates them) | G7 |
| G8 | Celery worker, all queues | `inspect active_queues`, `check_celery_queues.py` | 11 queues consumed | not run | G8 |
| G9 | Exactly one Beat firing | process count, log line | 1 process; `retry-stalled-tenant-provisioning` sent every 5 min | not run | G9 |
| G10 | Env: AI console / SSO | JWKS URL, launch endpoint | JWKS `200` with keys; launch not `503` | not run | G10 |
| G11 | Env: VAPID, gateways, webhooks | push key endpoint, Kuraimi probe, secrets present | non-empty `publicKey`; webhook `403` (not `503`) without token | not run | G11 |
| G12 | POS manager codes per store | shell loop, till probe | every store that uses the till has a code | not run | G12 |
| G13 | Default free plan active before plans are enabled | console billing settings | `default_free_plan` not null | not run | G13 |
| G14 | Feature catalog reviewed | console features screen / shell count | 40 codes, kill switches as intended | not run | G14 |
| G15 | Mock-only hooks unreachable | three `curl` probes | `401`, or `501` with a session; never `2xx` | guard found in code (see G15) | G15 |
| G16 | Frontend quality gates | `npm run lint`, `npx tsc --noEmit`, `npm run build` | exit 0 | not run | G16 |
| G17 | US1-US5 checkpoints | walk-throughs on staging | each passes with no `x-sharwa-mock: 1` | **not run** | US table below |

### G1. `.env.example` parity

Frontend (the parity script of [`../environment.md`](../environment.md) §1.4 — run from `sharwa-frontend`; use the bash or PowerShell form given there). Expected after the template is fixed: `code: 39 keys · .env.example: 39 keys`, `none`, `none`, exit `0`.

**Step 52 (2026-10-30)**: `.env.example` now lists all 39 keys (DOC-461), so the parity script should exit `0`. Earlier state, kept for the record: `.env.example:79` listed 35 keys; the 39-key line is in `../environment.md` §1.1. The script was **not** run on the full source in step 39 (only part of `src/` was available; it printed a meaningless result there). `inventory` and `returns` were confirmed in code (`src/app/api/bff/inventory/export.csv/route.ts:19`, `src/app/api/bff/returns/rma/route.ts:18`); `locations` and `wallets` come from the same page.

In production with `SHARWA_MOCKS=off` the list is ignored, so a short template does not break the production switch; it does break staging runs that use `SHARWA_MOCKS=on` plus a list (four modules silently stay on fixtures).

Backend: a scan of the template against the keys the code reads (run in the Django repository root; reads literal `os.environ.get('X')`, `os.environ['X']` and `os.getenv('X')` only):

```bash
python - <<'PY'
import re, pathlib
used = set()
for p in pathlib.Path('.').rglob('*.py'):
    s = str(p)
    if any(x in s for x in ('/migrations/', 'venv', '/test')) or p.name.startswith('test_'):
        continue
    for m in re.finditer(r"os\.environ(?:\.get\(|\[)\s*['\"]([A-Z0-9_]+)['\"]|os\.getenv\(\s*['\"]([A-Z0-9_]+)['\"]", p.read_text(encoding='utf-8', errors='ignore')):
        used.add(m.group(1) or m.group(2))
tpl = {m.group(1) for l in open('.env.example', encoding='utf-8') if (m := re.match(r"\s*#?\s*([A-Z][A-Z0-9_]+)=", l))}
print('read by code, absent from .env.example:', sorted(used - tpl))
PY
```

Windows PowerShell: save the Python lines to `parity.py` and run `python parity.py`. On the portion of the repository available in step 39 it printed `DJANGO_TESTING`, six `GUNICORN_*` names (process variables, read by `deploy/gunicorn.conf.py`, not by Django settings — expected) and `SHARWA_CHANNELS_RATE_LIMIT_PER_MINUTE` (`products/services/social_channels/channel_rate_limit.py`): the last one is a real gap. The scan does not see keys read through helper functions.

### G2. Next.js runs with mocks off

Set in the Next.js service environment (never in a committed file): `SHARWA_MOCKS=off`. When `NODE_ENV=production` and the variable is unset the default is also off (`src/env.ts:19`, `src/mocks/runtime.ts:7-12`); set it explicitly anyway. Restart Next.js (environment is read at start; `NEXT_PUBLIC_*` values need a rebuild).

```bash
curl -s -D - -o /dev/null -H "Cookie: <MERCHANT_SESSION_COOKIES>" https://noor.<BASE>/api/bff/orders/refunds | grep -i "x-sharwa-mock"
```

Expected: no output (no header). In mock mode every fixture response carries `x-sharwa-mock: 1` (`src/mocks/runtime.ts:28`). With a valid session cookie a row that has no Django endpoint answers `501` with `x-sharwa-mock: 0` (`src/mocks/runtime.ts:59`) and «غير متاح بعد.» — that is correct, not a fixture.

### G3. `DEBUG` is off

```bash
grep -nE "^DEBUG=" /srv/sharwa/.env        # expect no line, or DEBUG=False
python manage.py shell -c "from django.conf import settings; print(settings.DEBUG)"      # expect False
python manage.py check --deploy --fail-level ERROR                                         # expect exit 0 (also run by deploy.sh:35)
```

The plain `check --deploy` also prints about 980 `drf_spectacular.W001/W002` warnings (unresolved type hints in the schema generator). They are expected; read only the `security.*` lines ([`../_verification.md`](../_verification.md#o-1)).

Only the exact text `True` enables it (`config/settings.py:21`). Behaviour that exists only with `DEBUG=True`, and must not be reachable:

| Behaviour | Code |
|---|---|
| Store registration: OTP `123456` accepted; the real code is logged instead of sent | `api/views_onboarding.py:85, 129, 321` |
| Merchant password reset: the code is logged instead of sent; `123456` accepted | `api/views_auth.py:376, 460` |
| POS: manager code `2468` accepted when the store has no code | `products/services/pos_service.py:74, 885` |
| POS large refund: code logged instead of sent; `123456` accepted | `products/services/pos_service.py:1201, 1232` |
| Dev media middleware, dev CORS/CSRF origins, browsable API, `http://…:8000` provisioning URL | `config/settings.py:282, 805, 531`; `tenants/provisioning.py:50-52` |

> ⚠️ Discrepancy — roadmap (and [`../environment.md`](../environment.md) §6) name the OTP `123456` in registration and POS only / code accepts `123456` in four more places: the merchant password-reset send and verify steps (`api/views_auth.py:376, 460`) as well as registration (`api/views_onboarding.py:129, 321`) and the POS refund challenge (`pos_service.py:1201, 1232`). All are gated by `settings.DEBUG`, so the single `DEBUG=False` gate covers them; the environment page's list is incomplete. Reported in step 39.

Behavioural probes on staging with `DEBUG=False` (**derived**):

1. Register a throw-away store and answer the OTP step with `123456`: it must be refused; only the WhatsApp code verifies.
2. At the till of a store without a manager code, enter `2468`: it must answer «لم يُعيَّن رمز مدير لنقطة البيع بعد — أرسل طلب اعتماد للمدير.»
3. On the password-reset flow, `123456` must not verify.

### G4. Required environment is present

The process refuses to start without `SECRET_KEY`, `ALLOWED_HOSTS`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `CRYPTOGRAPHY_KEY` (`config/settings.py:20, 24, 44, 108-110`); `manage.py check --deploy` above proves it. These are **not** enforced and must be checked by eye:

- `TENANT_BASE_DOMAIN` — absent on the Django side silently becomes `localhost` (`settings.py:30`) while Next.js refuses to start; both must equal `<BASE>`.
- `ALLOWED_HOSTS` (no spaces after commas; includes the internal address the BFF calls and the platform/store hosts Nginx forwards), `CSRF_TRUSTED_ORIGINS`, `REDIS_CACHE_URL`, `CELERY_BROKER_URL` (databases 0 and 1 — different), `REAL_IP_TRUSTED_PROXIES` (the Next.js server's address and/or Nginx's), `DB_HOST`.
- Next.js: `TENANT_BASE_DOMAIN`, `NEXT_PUBLIC_TENANT_BASE_DOMAIN`, `API_INTERNAL_URL`, `NEXT_PUBLIC_PLATFORM_WHATSAPP` (`src/env.ts:13-31`).

Full tables: [`../environment.md`](../environment.md) §2-§5.

### G5. Edge values

`SHARWA_EDGE_IP` (A record for merchants' apex domains — must be set before any apex domain is used, otherwise the dashboard shows a host name where an IP is required, `domain_service.py:84`) and `SHARWA_EDGE_CNAME` (default `TENANT_BASE_DOMAIN`). Check against the real edge: `dig +short A <BASE>` equals `<EDGE_IP>`. TLS procedure for custom domains: [`../runbooks/custom-domain-tls.md`](../runbooks/custom-domain-tls.md).

### G6. All migrations applied (shared and every store schema)

```bash
python manage.py migrate_schemas --shared      # deploy.sh:40 / compose release
python manage.py migrate_schemas --tenant      # deploy.sh:42 — every store schema
python manage.py makemigrations --check --dry-run     # models and migrations in sync (CI gate); expect no changes
```

Confirm in the database. Shared apps live in `public`; `products` lives in each store schema (`config/settings.py:121-160`):

```sql
-- shared apps (public)
SET search_path TO public;
SELECT DISTINCT ON (app) app, name FROM django_migrations
 WHERE app IN ('tenants','billing','sharwapay','appstore','core','marketing','sharwa_ship')
 ORDER BY app, id DESC;

-- a store
SET search_path TO <SCHEMA>;
SELECT name FROM django_migrations WHERE app = 'products' ORDER BY id DESC LIMIT 1;
```

Latest migration in the code tree on 2026-10-28 (the expected result; re-derive with `ls <app>/migrations` if the tree moved):

| App | Schema | Latest migration |
|---|---|---|
| `products` | each store | `0236_advanced_products_api` |
| `tenants` | `public` | `0027_platform_console_api` |
| `billing` | `public` | `0013_seed_pos_feature` |
| `sharwapay` | `public` | `0003_console_review_fields` |
| `appstore` | `public` | `0007_app_icon_name` |
| `core` | `public` | `0001_initial` |
| `marketing` | `public` | `0001_initial` |
| `sharwa_ship` | `public` | `0003_sharwashipzone_center_latitude_and_more` |

Every store must be on `0236`: repeat the `products` query per schema, or list stores first with `SELECT schema_name, provisioning_status FROM tenants_client ORDER BY 1;`. The migrations added in Phase 002 (`products` 0208-0236, `tenants` 0025-0027, `billing` 0011-0013, `sharwapay` 0002-0003, `appstore` 0006-0007) are in [`../migrations/phase-002-ledger.md`](../migrations/phase-002-ledger.md) (DOC-508). Take a backup first; reversing is covered in [`rollback.md`](rollback.md). "Matches `showmigrations` on a fresh database" was **not** done.

### G7. Public tenant and platform hosts

Requests without `X-Store-Domain` are routed by `Host` through `tenants.Domain`; `SHOW_PUBLIC_IF_NO_TENANT_FOUND` is not set, so an unknown host is a `404` from django-tenants. The `public` `Client` and a `Domain` for every host Django sees on platform traffic must therefore exist: the platform host(s) and the host in `API_INTERNAL_URL` ([`topology.md`](topology.md) §9).

```bash
python manage.py shell -c "from tenants.models import Client, Domain; print(list(Client.objects.filter(schema_name='public').values('id','name'))); print(sorted(Domain.objects.filter(tenant__schema_name='public').values_list('domain', flat=True)))"
```

Expected: one `public` client and its domains (**derived**). **Unverified**: nothing in the repository creates them (only the tests do); record here how production was initialised. Also expected: no store stuck in provisioning — `python manage.py shell -c "from tenants.models import Client; print(list(Client.objects.exclude(provisioning_status='ready').exclude(schema_name='public').values_list('schema_name','provisioning_status')))"` prints `[]`.

### G8. Celery worker consumes every queue

```bash
python deploy/check_celery_queues.py                      # exit 0: every queue used in code is in deploy/celery.env
celery -A config inspect active_queues                    # lists the 11 queues on worker@<host>
sudo systemctl status celery-sharwa                       # Docker: docker compose -f deploy/docker-compose.prod.yml ps worker
```

Expected queues: `default, whatsapp, support, channels_meta, channels_tiktok, channels_telegram, channels_broadcast, marketplaces_amazon, marketplaces_noon, suppliers_sync, suppliers_orders` (`deploy/celery.env:16`). Store registration depends on the worker: a new store builds its schema in Celery and answers `503` until then.

### G9. Exactly one Beat, and it fires

```bash
sudo systemctl status celery-sharwa-beat
pgrep -fc "celery.* beat"                                  # expect 1 (docker: docker compose ... ps beat shows one container)
journalctl -u celery-sharwa-beat --since "10 min ago" | grep -i "retry-stalled-tenant-provisioning"     # docker: docker compose ... logs beat
```

Expected: one process; the entry `retry-stalled-tenant-provisioning` ("Sending due task") at least every 5 minutes (`crontab(minute='2-59/5')`). Two Beats fire every periodic task twice ([`../runbooks/celery.md`](../runbooks/celery.md)).

### G10. Sharwa AI console and single sign-on

Variables: `SHARWA_AI_CONSOLE_URL`, the four SSO keys `SHARWA_AI_SSO_PRIVATE_KEY_PEM`, `SHARWA_AI_SSO_KID`, `SHARWA_AI_JWT_ISSUER`, `SHARWA_AI_JWT_AUDIENCE` (RSA ≥ 2048 bits), plus the gateway and webhook secrets ([`../environment.md`](../environment.md) §3.6).

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<BASE>/.well-known/sharwa-ai-jwks.json     # expect 200 (503 with {"keys": []} = SSO not configured)
```

`products/views/sharwa_ai_sso.py:70-77`. The merchant launch endpoint (`/api/v1/apps/sharwa-ai/console-token/`) answers `503` «الدخول الموحد إلى لوحة شروه AI غير مهيأ بعد.» when SSO is incomplete and «رابط لوحة شروه AI غير مضبوط بعد (SHARWA_AI_CONSOLE_URL).» when the URL is empty. Skip G10 only if the AI add-on is not sold at launch, and write that down.

### G11. VAPID, gateways and webhook secrets

```bash
curl -s https://noor.<BASE>/api/v1/push/vapid-public-key/                  # expect {"publicKey":"<non-empty>"}; an empty string means VAPID is not configured
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://<BASE>/webhooks/kuraimi/topup/     # 403 = token configured; 503 webhook_not_configured = KURAIMI_WEBHOOK_TOKEN empty
```

`api/views.py:286` (key endpoint returns the setting as is, even when empty); `tenants/webhooks.py:41-43`. Also confirm by reading `.env` (without printing values): `GREEN_API_INSTANCE`, `GREEN_API_TOKEN`, `WA_GATEWAY_BASE_URL`, `WA_GATEWAY_API_KEY`, `WA_GATEWAY_WEBHOOK_SECRET` (empty ⇒ every inbound gateway event is rejected silently), `SHARWA_AI_GATEWAY_WEBHOOK_SECRET`, `SHARWA_ESCROW_ACCOUNT`, per-carrier `CARRIER_*_SECRET`, `VAPID_CLAIMS_EMAIL` (an address you own), `SENTRY_DSN`. WhatsApp sending is exercised for real only by the registration OTP in the US1 walk-through.

### G12. POS manager codes, per store

A store that will use the till needs its own code (the production path never accepts `2468`). Command and rules: [`../management-commands.md`](../management-commands.md#set_pos_manager_code).

```bash
python manage.py set_pos_manager_code --schema=<SCHEMA> <CODE>        # 4-8 digits, stored hashed, different per store
```

Find stores without one (**derived**):

```bash
python manage.py shell
>>> from django_tenants.utils import schema_context
>>> from tenants.models import Client
>>> from products.models import StoreSetting
>>> for c in Client.objects.filter(provisioning_status='ready').exclude(schema_name='public').order_by('schema_name'):
...     with schema_context(c.schema_name):
...         s = StoreSetting.objects.first()
...         print(c.schema_name, 'code set' if s and s.pos_manager_code_hash else 'NO CODE')
```

Expected: no `NO CODE` for a store that uses POS. The code lands in shell history — run it yourself and hand the code to the manager privately.

### G13. Default free plan is active before plans are enabled

The plan system is off by default (`PlatformBillingSettings.subscriptions_enabled = False`, `billing/models.py:140-148`); while it is off every feature is open. Turning it on without an active default plan removes plan-gated features (today `pos`) from every store that has no subscription.

1. In the console (Plans) create a free plan and mark it default and active (`Plan.is_free`, `is_default_free`, `is_active`; the console refuses a default that is not free or not active).
2. Check `GET /api/v1/platform/billing-settings/` → `default_free_plan` is a name, not `null`, and read `stores_without_subscription`.
3. Enable plans **from the console** (`PATCH platform/billing-settings/`): it refuses with «لا باقة مجانية افتراضية نشطة — أنشئها أولاً.» when no default exists, and in the same transaction assigns the default plan to every ready store without a subscription (`tenants/console_billing_service.py:311-337`).

> ⚠️ Discrepancy — roadmap says the default free plan must be active before plans are enabled, as a rule of the system / code enforces it only on the console path. The Django admin page of the singleton (`billing/admin.py:86-98`) has no such check and assigns nothing to existing stores, and registration only logs a warning when no default exists (`tenants/registration.py:57-66`). Enable plans from the console, not the admin. Reported in step 39.

### G14. Feature catalog reviewed

Open the console feature catalogue (`GET /api/v1/platform/features/`, or Console → Features). Expected per [`../../architecture/15-plans-and-features.md`](../../architecture/15-plans-and-features.md) §2: 40 codes seeded by `billing/0003-0011` and `0013`; five are seeded globally off (`multi_location`, `staff_rbac`, `social_channels`, `marketplaces`, `dropshipping`) and appear only for stores with an override. Review each: `is_active_globally`, `requires_plan`, and — if plans are on — the plan matrix. A feature code used in code but missing from the catalogue is **off** for everyone; shipping a gated module needs a seeding migration. Count check (**derived**): `python manage.py shell -c "from billing.models import Feature; print(Feature.objects.count())"` prints `40`. This page did not verify the count (only `billing/0001`, `0011`-`0013` were available).

### G15. Mock-only hooks are unreachable in production

Three BFF paths exist only for the QA scripts:

| Path | Route file | Routed to the fixture by |
|---|---|---|
| `/api/bff/pos/__reset` | `src/app/api/bff/pos/[...path]/route.ts:22` | `if (joined === "__reset") return mock();` |
| `/api/bff/inbox/_mock/*` | `src/app/api/bff/inbox/[...path]/route.ts:18` | `if (segs[0] === "_mock") return mock();` |
| `/api/bff/b2b/_test/bump/<approval_id>` | `src/app/api/bff/b2b/[[...path]]/route.ts:16-18` | any path other than `options` falls to `mock()` |

Where they are guarded: nowhere in the route files themselves. The guard is the shared `mockRoute` (`src/lib/bff/mock-route.ts:28-40`): it first requires a session (`401` «انتهت جلستك، سجّل الدخول مجدداً.»), then `if (!isMocksOn()) return notAvailable();` → `501` «غير متاح بعد.» **before** any fixture handler runs. `isMocksOn()` is false when `SHARWA_MOCKS=off`, or when the variable is unset and `NODE_ENV=production` (`src/mocks/runtime.ts:7-12`). So the hooks are unreachable **only because mocks are off** — there is no `NODE_ENV` check and no allow-list; with `SHARWA_MOCKS=on` in production all three would run (`__reset` would reset POS fixture state).

> ⚠️ Discrepancy — roadmap says the mock-only hooks must be "unreachable in production" as if a separate guard exists / code has none of its own: the three hooks are routed to the fixture before the live check and are stopped only by `mockRoute`'s `isMocksOn()` test (`src/lib/bff/mock-route.ts:40`). `SHARWA_MOCKS=off` is therefore the only protection. Reported in step 39.

```bash
for p in pos/__reset inbox/_mock/anything b2b/_test/bump/1; do
  curl -s -o /dev/null -w "$p %{http_code}\n" -X POST "https://noor.<BASE>/api/bff/$p"
done
```

Expected: `401` for each (no session). Repeat with a logged-in cookie (`-H "Cookie: …"`): `501`. Never `200`/`204`, and never an `x-sharwa-mock: 1` header.

### G16. Frontend quality gates

`next.config.ts:22-24` sets `typescript.ignoreBuildErrors: true`, so `next build` passes even with type errors. Run all three, from `sharwa-frontend`:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Expected: exit 0 each.

### User-story checkpoints (US1-US5)

Run each on **staging** with `SHARWA_MOCKS=off` and Django running with all migrations applied. A run counts only if **no response carries `x-sharwa-mock: 1`**. The definition of each checkpoint is the goal line in `specs/002-sharwa-integration/integration-tasks.md`; the Django suites, mock scripts and walk-through for each are in [`../../architecture/03-phase-history.md`](../../architecture/03-phase-history.md) §5.3 (re-verify commands: `python manage.py test …` lists per story).

| Checkpoint | Defined in | Goal (spec text) | Walk-through | Result |
|---|---|---|---|---|
| **US1** | `specs/002-sharwa-integration/integration-tasks.md:56` | «`/` → متجر → منتج → طلب مكتمل على Django بلا mocks.» | landing → register a store (OTP) → wait for provisioning → set first password → create a product → buy it on the storefront → move the order to completed | not run |
| **US2** | `…/integration-tasks.md:75` | «جلسة شراء كاملة على Django.» | storefront → category → product (variant) → cart → checkout (OTP) → success → tracking | not run |
| **US3** | `…/integration-tasks.md:108` | «كل وحدة P2 تعمل على Django وحدها.» | each P2 key alone with `SHARWA_MOCKS=on` and `SHARWA_LIVE_MODULES=<key>` (12 keys), then once with mocks off | not run |
| **US4** | `…/integration-tasks.md:121` | «إعادة تجهيز متجر، تفعيل ميزة، قبول شحن محفظة، تحصيل مستحق — على Django.» | on `console.<BASE>`: re-provision a failed store, enable a feature, approve a wallet top-up once, collect a due | not run |
| **US5** | `…/integration-tasks.md:162` | «كل وحدة P3 تعمل على Django دون تضارب حالات مع M06/M21.» | each P3 channel creates an order that appears in M06 with its channel; M21 shows one stock movement per change | not run |
| Isolation | `scripts/tenant-isolation-check.ts` | 10 stores in one process compare `store_name` in every response | re-run with `SHARWA_MOCKS=off` | not run |

> ⚠️ Discrepancy — roadmap says "verification by US1-US5 checkpoints" as existing results / the specs hold only the goal line of each checkpoint and "all tasks ticked"; no dated run is recorded anywhere (`integration-tasks.md` lines 56, 75, 108, 121, 162; [`../../architecture/03-phase-history.md`](../../architecture/03-phase-history.md) §5.1). The table above is therefore a to-do for staging, not evidence. Reported in step 39.

## Verify

The go-live is ready when: every gate G1-G16 is ticked with the command output attached; US1-US5 each pass on staging; `curl -I https://noor.<BASE>/` and `https://<BASE>/` answer over valid TLS; a test order placed on staging appears in the dashboard; the worker log shows the order's background jobs; no response during the walk-throughs carried `x-sharwa-mock: 1`.

## Roll back

Switching back is not a one-line change in production; read [`rollback.md`](rollback.md) **before** go-live and agree the rollback level in advance. In short: code rollback (Django, Next.js) first; per-module switch-off needs `SHARWA_MOCKS=on` plus a 38-key list and is an emergency measure; migrations are not reversed in routine rollbacks.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Every row answers `501` «غير متاح بعد.» after the switch | mocks off and the module has no Django provider, or the module key is not wired | expected for rows without a provider; list them with [`../../architecture/22-live-module-keys.md`](../../architecture/22-live-module-keys.md) |
| Mock indicator still shows | Next.js started before the variable was set, or `SHARWA_MOCKS=on` somewhere in its environment | restart Next.js; check the process environment |
| Gunicorn answers `400` to every request | host missing from `ALLOWED_HOSTS` | [`../environment.md`](../environment.md) §5 |
| Stores answer `503` for minutes | worker or Beat not running | G8, G9 |
| Registration OTP never arrives | `GREEN_API_*` empty (the send returns `False`; sign-up answers `502`) | G11 |
| Plan-gated feature vanished after enabling plans | plans enabled from the Django admin without assigning the default plan | assign the default plan to the stores (console Subscriptions) |
| Login fine on one store, `403` on a custom domain | `CSRF_TRUSTED_ORIGINS` lacks the domain | [`../runbooks/custom-domain-tls.md`](../runbooks/custom-domain-tls.md) step 4 |

## Sign-off

Left empty: the staging run has not happened.

| Gate | Verified by | Date | Environment | Evidence (log / screenshot reference) |
|---|---|---|---|---|
| G1-G16 | | | | |
| US1 | | | | |
| US2 | | | | |
| US3 | | | | |
| US4 | | | | |
| US5 | | | | |
| Approved for production | | | | |

## Related

- [`topology.md`](topology.md) · [`rollback.md`](rollback.md) · [`../runbooks/custom-domain-tls.md`](../runbooks/custom-domain-tls.md)
- [`../environment.md`](../environment.md) · [`../management-commands.md`](../management-commands.md) · [`../runbooks/celery.md`](../runbooks/celery.md) · [`../runbooks/switch-module-live.md`](../runbooks/switch-module-live.md)
- [`../../architecture/03-phase-history.md`](../../architecture/03-phase-history.md) · [`../../architecture/15-plans-and-features.md`](../../architecture/15-plans-and-features.md) · [`../../architecture/21-mock-runtime.md`](../../architecture/21-mock-runtime.md) · [`../../architecture/22-live-module-keys.md`](../../architecture/22-live-module-keys.md)
- [`../migrations/phase-002-ledger.md`](../migrations/phase-002-ledger.md)
