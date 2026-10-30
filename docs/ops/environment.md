# Environment

> **Source**: DOC-461 (§1) · DOC-511 (§2–§7) · inventory A.3, A.10, A.13 · INT-023, INT-024, INT-025, INT-026, INT-028, INT-038, INT-041
> **Code**: `sharwa-frontend/.env.example` · `src/env.ts` · `src/mocks/runtime.ts` · `src/lib/bff/upstream.ts` · `next.config.ts` · `sharwa_saas/config/settings.py` · `sharwa_saas/.env.example` · `sharwa_saas/deploy/{gunicorn.conf.py,celery.env,docker-compose.prod.yml}`
> **Last verified against code**: 2026-10-27 (official Steps 07 and 09)
>
> **Page status**: §1 `#live-modules` (DOC-461, Step 07) and §2–§7 (DOC-511, Step 09) are written. DOC-461 closed in Step 52 (2026-10-30): `.env.example` now carries the 39 keys and a comment for every module (§1.2). The other Step 09 pages: [`dependencies.md`](dependencies.md), [`management-commands.md`](management-commands.md), [`upload-limits.md`](upload-limits.md).

<a id="live-modules"></a>

## 1. Live modules — `SHARWA_MOCKS` and `SHARWA_LIVE_MODULES`

Two variables on the **Next.js** side decide, per module, whether a BFF row is answered by Django or by its fixture. Design and the full per-key register: [`../architecture/22-live-module-keys.md`](../architecture/22-live-module-keys.md); what "not live" means: [`../architecture/21-mock-runtime.md`](../architecture/21-mock-runtime.md).

| Variable | Values | Default | Rule |
|---|---|---|---|
| `SHARWA_MOCKS` | `on` · `off` | `on` in `next dev`, `off` when `NODE_ENV=production` (`src/env.ts`, `isMocksOn()`) | `off` = every keyed module live, the list below is ignored, rows without Django answer `501` «غير متاح بعد.» |
| `SHARWA_LIVE_MODULES` | comma list of keys · `*` = all | empty (no module live) | read only while `SHARWA_MOCKS=on`; case-insensitive, spaces trimmed; unknown words match nothing and are **not** reported |

### 1.1 The correct sample line (all 39 keys)

```dotenv
# Production: every module live.
SHARWA_MOCKS=off

# Staging / development with fixtures as fallback — list the modules to call Django for,
# or "*" for all. The full list of the 39 keys:
# SHARWA_LIVE_MODULES=reports,catalog,products,orders,search,notifications,settings,pwa,customers,design,marketing,payments,shipping,staff,integrations,inventory,locations,returns,wallets,platform,platform_money,platform_billing,pos,affiliates,procurement,bookings,channels,marketplaces,dropshipping,apps,sharwa_ai,support,expenses,b2b,advanced_products,courier,sharwa_ship,sharwa_pay,rollup
```

Key order follows the integration tasks (INT-027 `reports` was the first live module; the rest by INT number, with the four keys INT-024/025/026/028 in their place after `integrations`).

### 1.2 What the current `.env.example` omits

**Fixed in Step 52 (2026-10-30)** — the sample line (now `.env.example:86`) lists all 39 keys, in the order of §1.1, and the comment block gained a line for `integrations`, `inventory`, `locations`, `returns` and `wallets`. Before the fix it listed **35** keys. Missing were:

| Key | Task · Module | Rows it switches |
|---|---|---|
| `inventory` | INT-024 · M21 | 8 handlers under `/api/bff/inventory/*` |
| `locations` | INT-025 · M22 | 14 rows under `/api/bff/locations/**` |
| `returns` | INT-026 · M24 | `returns/options`, `returns/rma`, `returns/rma/[id]`, `orders/refunds` |
| `wallets` | INT-028 · M35 | merchant `customers/wallets/**`, `loyalty/points/**`, `loyalty/program` |

The comment block above the line (`.env.example:18–78`) also has no description for `integrations`, `inventory`, `locations`, `returns` and `wallets`. Anyone who copies the commented line today switches 35 modules and leaves inventory, locations, returns and the merchant wallet screens on fixtures without noticing (the sidebar looks the same).

> Step 07 note (kept for the record): `.env.example` was left unchanged then, because the execution plan allows configuration edits only in Step 52. Step 52 applied the fix. DOC-461 stayed open until the file is fixed and the parity check below passes. Reported in official Step 07.

### 1.3 Keys added during integration

The sample line grew task by task: every key belongs to one integration task. `reports`, `catalog` and `products` were already live when Phase 002 tracking began (`SHARWA_LIVE_MODULES=reports,catalog,products` on 2026-10-24, see [`../architecture/03-phase-history.md`](../architecture/03-phase-history.md)); the others were added by their task. Key → task: `reports` (INT-027, first), `catalog` (INT-006), `products` (INT-005), `orders` (INT-007), `search` (INT-008), `notifications` (INT-009), `settings` (INT-010), `pwa` (INT-016), `customers` (INT-017), `design` (INT-018), `marketing` (INT-019), `payments` (INT-020), `shipping` (INT-021), `staff` (INT-022), `integrations` (INT-023), `inventory` (INT-024), `locations` (INT-025), `returns` (INT-026), `wallets` (INT-028), `platform` (INT-030), `platform_money` (INT-031), `platform_billing` (INT-032), `pos` (INT-033), `affiliates` (INT-034), `procurement` (INT-035), `bookings` (INT-036), `channels` (INT-037), `marketplaces` (INT-038), `dropshipping` (INT-039), `apps` (INT-040), `sharwa_ai` (INT-041), `support` (INT-042), `expenses` (INT-043), `b2b` (INT-044), `advanced_products` (INT-045), `courier` (INT-046), `sharwa_ship` (INT-047), `sharwa_pay` (INT-048), `rollup` (INT-049). The four omitted keys were added to the code by their tasks but never appended to the sample line.

### 1.4 Parity check — `.env.example` vs the keys used in code

Run from `sharwa-frontend`. The script collects every key the code switches on (`liveOrMock(request, "<key>", …)`, `isModuleLive("<key>")`, the two extra product rule tables, the three console row groups and the `apps` / `sharwa_ai` split) and compares it with the sample line in `.env.example`. Exit code `0` = parity, `1` = a difference (printed).

**bash / Git Bash**

```bash
node - <<'JS'
const fs = require("fs"), path = require("path");
const keys = new Set();
const patterns = [
  /liveOrMock\(\s*request\s*,\s*"([a-z0-9_]+)"/g,               // liveOrMock(request, "orders", …)
  /isModuleLive\("([a-z0-9_]+)"\)/g,                            // isModuleLive("products")
  /\["([a-z0-9_]+)",\s*[A-Z0-9_]+_LIVE_RULES\]/g,                  // ["b2b", B2B_LIVE_RULES]
  /M\d+_ROWS\.test\(path\)\) return "([a-z0-9_]+)"/g,           // platform row groups
  /liveModule = [^;\n]*?"([a-z0-9_]+)" : "([a-z0-9_]+)"/g,         // apps / sharwa_ai
];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(p)) {
      const src = fs.readFileSync(p, "utf8");
      for (const re of patterns) for (const m of src.matchAll(re)) m.slice(1).forEach((k) => k && keys.add(k));
    }
  }
})("src");
const line = fs.readFileSync(".env.example", "utf8").match(/^#?\s*SHARWA_LIVE_MODULES=(.*)$/m);
const sample = new Set((line ? line[1] : "").split(",").map((k) => k.trim()).filter(Boolean));
const missing = [...keys].filter((k) => !sample.has(k)).sort();
const extra = [...sample].filter((k) => !keys.has(k)).sort();
console.log(`code: ${keys.size} keys · .env.example: ${sample.size} keys`);
console.log(`missing from .env.example: ${missing.join(", ") || "none"}`);
console.log(`in .env.example but not in code: ${extra.join(", ") || "none"}`);
process.exit(missing.length || extra.length ? 1 : 0);
JS
```

**Windows PowerShell** (`cmd` has no here-document; use PowerShell or Git Bash)

```powershell
@'
const fs = require("fs"), path = require("path");
const keys = new Set();
const patterns = [
  /liveOrMock\(\s*request\s*,\s*"([a-z0-9_]+)"/g,               // liveOrMock(request, "orders", …)
  /isModuleLive\("([a-z0-9_]+)"\)/g,                            // isModuleLive("products")
  /\["([a-z0-9_]+)",\s*[A-Z0-9_]+_LIVE_RULES\]/g,                  // ["b2b", B2B_LIVE_RULES]
  /M\d+_ROWS\.test\(path\)\) return "([a-z0-9_]+)"/g,           // platform row groups
  /liveModule = [^;\n]*?"([a-z0-9_]+)" : "([a-z0-9_]+)"/g,         // apps / sharwa_ai
];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(p)) {
      const src = fs.readFileSync(p, "utf8");
      for (const re of patterns) for (const m of src.matchAll(re)) m.slice(1).forEach((k) => k && keys.add(k));
    }
  }
})("src");
const line = fs.readFileSync(".env.example", "utf8").match(/^#?\s*SHARWA_LIVE_MODULES=(.*)$/m);
const sample = new Set((line ? line[1] : "").split(",").map((k) => k.trim()).filter(Boolean));
const missing = [...keys].filter((k) => !sample.has(k)).sort();
const extra = [...sample].filter((k) => !keys.has(k)).sort();
console.log(`code: ${keys.size} keys · .env.example: ${sample.size} keys`);
console.log(`missing from .env.example: ${missing.join(", ") || "none"}`);
console.log(`in .env.example but not in code: ${extra.join(", ") || "none"}`);
process.exit(missing.length || extra.length ? 1 : 0);
'@ | node -
```

Output on 2026-10-27, before the fix:

```
code: 39 keys · .env.example: 35 keys
missing from .env.example: inventory, locations, returns, wallets
in .env.example but not in code: none
```

After the Step 52 fix (2026-10-30) it must print `code: 39 keys · .env.example: 39 keys`, `none` twice, and exit `0`. If a future task adds a key, the check fails until the sample line is updated — run it as part of the integration QA gate ([`../architecture/02-integration-protocol.md`](../architecture/02-integration-protocol.md)).

### 1.5 Setting the values per shell

Shell variables win over `.env.local`; deleting one lets `.env.local` decide again. Details and the `cmd` pitfalls (no space before `&&`, `set X=` deletes `X`): [`../architecture/21-mock-runtime.md`](../architecture/21-mock-runtime.md) §4.4.

| Goal | Windows `cmd` | PowerShell | bash |
|---|---|---|---|
| Everything on fixtures (mock scripts) | `set SHARWA_LIVE_MODULES=none&& npm run dev` | `$env:SHARWA_LIVE_MODULES="none"; npm run dev` | `SHARWA_LIVE_MODULES=none npm run dev` |
| One module live | `set SHARWA_LIVE_MODULES=orders&& npm run dev` | `$env:SHARWA_LIVE_MODULES="orders"; npm run dev` | `SHARWA_LIVE_MODULES=orders npm run dev` |
| Everything live | `set SHARWA_MOCKS=off&& npm run dev` | `$env:SHARWA_MOCKS="off"; npm run dev` | `SHARWA_MOCKS=off npm run dev` |

Restart `next dev` after changing a shell variable — a running process does not see it. `src/env.ts` validates both variables when the server starts.

<a id="later-sections"></a>

<a id="nextjs"></a>

## 2. Next.js variables

Source of truth: `src/env.ts` (`@t3-oss/env-nextjs` + zod). `next.config.ts` imports it (`import "./src/env"`), so `npm run dev`, `npm run build` and `npm start` all stop with the message below before serving anything when a required value is missing or malformed. Values come from the shell first, then `.env.local` (copy of `.env.example`; never commit real values). `emptyStringAsUndefined` is on: `KEY=` counts as "not set".

| Variable | Required | Default | Effect | Missing / malformed |
|---|---|---|---|---|
| `TENANT_BASE_DOMAIN` | yes (server) | — | Base domain of tenant resolution: a store lives at `<store>.<TENANT_BASE_DOMAIN>` (`resolveTenant(host, env.TENANT_BASE_DOMAIN)` in `src/lib/bff/upstream.ts`). Must be the same value as Django's `TENANT_BASE_DOMAIN` (§3.1) — both sides build store hosts from it. | Empty → «TENANT_BASE_DOMAIN مطلوب (مثال: localhost أو sharwaah.com)». A value outside `[a-z0-9.-]` (upper case, `https://`, a port) → «TENANT_BASE_DOMAIN يجب أن يكون نطاقاً صغير الأحرف بلا بروتوكول». The build/start stops; there is no `localhost` fallback. |
| `NEXT_PUBLIC_TENANT_BASE_DOMAIN` | yes (client) | — | The same domain for browser code. `NEXT_PUBLIC_*` values are inlined at build time, so changing it needs a rebuild. Nothing checks that it equals `TENANT_BASE_DOMAIN`. | `z.string().min(1)` fails → validation error naming the variable. |
| `API_INTERNAL_URL` | yes | — | Django origin reachable from the Next **server** (not from browsers). Every BFF call goes to `UPSTREAM_ORIGIN = (API_PROXY_URL ?? API_INTERNAL_URL)` without the trailing `/`; the same origin serves the `/media/:path*` rewrite in `next.config.ts`. | Not an absolute URL → «API_INTERNAL_URL يجب أن يكون رابطاً كاملاً (مثال: http://localhost:8000)». |
| `API_PROXY_URL` | no | unset → `API_INTERNAL_URL` | Overrides the upstream origin for split environments. | Not a URL → zod error. See the note below the table about an empty line. |
| `NEXT_PUBLIC_PLATFORM_WHATSAPP` | yes (client) | — | Platform support WhatsApp number, digits only, international format, no `+`. Shown to merchants; the sample value in `.env.example` is a placeholder. | Not 9–15 digits → «رقم واتساب المنصة بصيغة دولية بلا + (مثال: 967700000000)». |
| `SHARWA_MOCKS` | no | `on` in `next dev`, `off` when `NODE_ENV=production` | Fixture fallback switch — full rules in [§1](#live-modules). | Anything but `on` / `off` → zod enum error at start. (`isMocksOn()` in `src/mocks/runtime.ts` re-reads `process.env` and treats an unknown value like "unset".) |
| `SHARWA_LIVE_MODULES` | no | empty | Per-module live list while `SHARWA_MOCKS=on` — [§1](#live-modules). | A character outside `A–Z a–z 0–9 _ * , - whitespace` → «SHARWA_LIVE_MODULES قائمة وحدات مفصولة بفواصل (مثال: reports)». A well-formed but unknown word matches nothing and is not reported. `none` is such a word — it is a convention, not a keyword. |
| `SKIP_ENV_VALIDATION` | no | unset | `1` skips every check above (`skipValidation`). The standard t3-env switch for steps that run without the real values. | With it set, a missing variable is not caught and shows up later as `undefined` (for example `API_INTERNAL_URL` → fetches to `undefined/...`). Keep it out of `.env.local`. |
| `NODE_ENV` | set by Next | `development` for `next dev`, `production` for `next build` / `next start` | Only effects here: the default of `SHARWA_MOCKS`, and `mockJson` skips its simulated latency when it is `test`. | — |

> **Note — empty `API_PROXY_URL=`.** `src/env.ts` reads an empty line as unset, so the BFF falls back to `API_INTERNAL_URL`. `next.config.ts` reads `process.env` directly with `??`, and an empty string is not nullish: the `/media/` rewrite then has an empty upstream and is **not registered** (`upstream ? [...] : []`), while the BFF still works. Comment the line out instead of leaving it empty.

**Variables used only by the QA scripts** (never by the app): `SHARWA_CHROMIUM` — path of a Chrome/Chromium executable, used when the file exists, otherwise Playwright's own browser; `PLAYWRIGHT_BROWSERS_PATH` — read by `visual-check.ts`, `onboarding-check.ts` and `tenant-shell-check.ts` to find installed browsers, falling back to `<LOCALAPPDATA or HOME/AppData/Local>/ms-playwright`. See [`testing/frontend-qa.md`](testing/frontend-qa.md).

> ⚠️ Discrepancy — roadmap (DOC-511) and the project's mock-adapter protocol name `NEXT_PUBLIC_USE_MOCKS` / `USE_MOCKS` / `apiFetch` / a per-module service / code does none of that. The switch is `SHARWA_MOCKS` (+ `SHARWA_LIVE_MODULES`), read **on the server** inside the BFF route handlers (`liveOrMock(request, "<key>", …)` and `isModuleLive("<key>")`, `src/lib/bff/*` and `src/mocks/runtime.ts`); there is no `NEXT_PUBLIC_` variant, so the choice never reaches the browser bundle. `NEXT_PUBLIC_USE_MOCKS` appears in no `.env*` file, not in `src/env.ts`, not in `src/` or `scripts/`. Reported in official Step 09.

<a id="django"></a>

## 3. Django variables

Read when `config/settings.py` is imported (and, for a few service modules, at first use). `load_dotenv()` loads the repository's `.env` first; a variable already present in the process environment wins (python-dotenv default). Every value is fixed at process start: after changing one, restart Gunicorn, the Celery worker **and** Beat ([`runbooks/celery.md`](runbooks/celery.md), DOC-507). The template with every key the backend team lists is `sharwa_saas/.env.example`; variables the code reads that the template does not carry (Gunicorn, Celery, compose, `DJANGO_TESTING`) are in §3.9. Never put real values in the example file — secrets stay empty there on purpose (a placeholder text would be accepted as a configured secret).

Notation: "Required: yes" = the process (or the feature named) cannot start/run without it.

<a id="django-core"></a>

### 3.1 Core and security

| Variable | Required | Default | Effect | Missing / wrong |
|---|---|---|---|---|
| `SECRET_KEY` | yes | — | Django signing key (sessions, signed tokens). | `KeyError: 'SECRET_KEY'` when `settings` is imported — no `manage.py` command, Gunicorn or Celery process starts. |
| `DEBUG` | no | `False` | `True` only for the exact text `True`; any other value (`true`, `1`) is `False`. Turns on the DEBUG-only behaviours of [§6](#debug-only) and turns **off** the production hardening block (secure cookies, HTTPS redirect, HSTS). | — `.env.example` ships `DEBUG=True`: copying it to a server unchanged leaves debug on, including the static OTP and manager codes. |
| `ALLOWED_HOSTS` | yes | — | `os.environ['ALLOWED_HOSTS'].split(',')` — **no whitespace trimming**, so write `a.com,b.com`, not `a.com, b.com`. Must cover every host Nginx forwards (store subdomains, platform, console). | `KeyError: 'ALLOWED_HOSTS'` at import (deliberate: no `*` default). A host not matched → Django answers 400 for that request. Custom-domain hosts: [`deployment/topology.md`](deployment/topology.md) (DOC-515). |
| `TENANT_BASE_DOMAIN` | no | `localhost` | Trimmed and lower-cased. Store hosts are `<subdomain>.<TENANT_BASE_DOMAIN>`; with a value other than `localhost` Django also trusts `https://<base>` and `https://*.<base>` for CSRF; store provisioning builds `http://…:8000` while `DEBUG` and `https://…` otherwise; the Sharwa AI link label uses it. Must equal the Next.js value (§2). | Not a valid bare domain → `ImproperlyConfigured` «TENANT_BASE_DOMAIN غير صالح: '…' — اسم نطاق فقط مثل sharwaah.com (بلا https:// ولا منفذ ولا نقطة في البداية أو النهاية).» **Absent** → silently `localhost` (unlike Next.js, which refuses to start), so a production server that forgets it creates stores under `.localhost`. |
| `CRYPTOGRAPHY_KEY` | yes | — | Key of the encrypted columns (payment-gateway credentials, `PaymentCredential`). No default on purpose. | Empty → `ImproperlyConfigured` «CRYPTOGRAPHY_KEY غير مضبوط في متغيرات البيئة. بدونه لا يمكن فك تشفير بيانات بوابات الدفع المحفوظة — لا تشغّل النظام بمفتاح مفقود أو مؤقت.» Replacing the value makes rows encrypted with the old one unreadable; see [`../architecture/32-secrets.md`](../architecture/32-secrets.md) for how secrets relate to each other. |
| `CSRF_TRUSTED_ORIGINS` | no | empty | Comma list (trimmed) **plus** always `http://localhost:8000` and `http://127.0.0.1:8000`, plus the two `https://` origins derived from `TENANT_BASE_DOMAIN` (above), plus extra `localhost:3000` origins while `DEBUG`. | An origin that is missing → 403 on POSTs from it. |
| `CORS_ALLOWED_ORIGINS` | no | empty | Comma list (trimmed), credentials allowed, never `*`. Effective because `django-cors-headers` is in `requirements.txt`. With `DEBUG` it also admits `http://localhost:3000`, `http://127.0.0.1:3000` and `^http://.*\.localhost:3000$`. | Production normally leaves it empty: the dashboard talks to Django through the same-origin Next.js BFF. |
| `SESSION_COOKIE_SAMESITE` | no | `Lax` | Session cookie policy. `Strict` breaks the Amazon / Meta / TikTok OAuth return (the session cookie is not sent on that top-level navigation); decision of 2026-10-14. | — |
| `REAL_IP_TRUSTED_PROXIES` | no | `127.0.0.1,::1` | **Exact** addresses (not CIDR ranges) whose `X-Forwarded-For` / `X-Real-IP` `RealIpMiddleware` believes. The Next.js server is such a proxy for Django. Docker compose sets it to Nginx's fixed address `172.28.0.10`. | Too narrow or wrong → every visitor looks like the proxy, so one per-IP limit locks out the whole platform (see the comment at `clientIp` in `src/lib/bff/upstream.ts`). Too wide → clients can forge their IP. |
| `REAL_IP_PROXY_COUNT` | no | `1` | Number of proxies in the chain: `1` for Nginx alone, `2` behind a CDN / load balancer. | Not an integer → `ValueError` at import. |

Fixed, not configurable (documented because the roadmap asks): `CSRF_COOKIE_HTTPONLY = True` (browser JavaScript cannot read the CSRF cookie — the BFF injects `X-CSRFToken` itself, see [`../architecture/30-security.md`](../architecture/30-security.md) `#csrf`); `SESSION_COOKIE_HTTPONLY = True`; `SESSION_EXPIRE_AT_BROWSER_CLOSE = True`; `CSRF_COOKIE_SAMESITE = 'Lax'`; `DATA_UPLOAD_MAX_MEMORY_SIZE = 8 MB` ([`upload-limits.md`](upload-limits.md)); with `DEBUG=False`: `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')`, `SECURE_SSL_REDIRECT`, secure CSRF / session cookies, `SECURE_HSTS_SECONDS = 31536000` with subdomains, `X_FRAME_OPTIONS = 'DENY'`, `SECURE_CONTENT_TYPE_NOSNIFF`. The proxy header setting is safe only because Nginx **always** writes `X-Forwarded-Proto` itself.

<a id="django-data"></a>

### 3.2 Database, cache and queue

| Variable | Required | Default | Effect | Missing / wrong |
|---|---|---|---|---|
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | yes | — | PostgreSQL (`django_tenants.postgresql_backend`). No default password. | `KeyError` at import. |
| `DB_HOST`, `DB_PORT` | no | `localhost`, `5432` | — | Unreachable → every request that touches the database fails. In Docker compose `DB_HOST` is overridden to `db` (or `DOCKER_DB_HOST`). |
| `CONN_MAX_AGE` | no | `60` | Persistent connection lifetime in seconds. | Not an integer → `ValueError` at import. |
| `REDIS_CACHE_URL` | no | `redis://localhost:6379/0` | Django cache (database **0**): OTP hashes, throttles, cooldowns, idempotency markers, POS lockouts. Key prefix `sharwa`; connect and socket timeouts 2 s. | Redis down → cache calls fail fast (about 2 s), so OTP / throttle paths error instead of hanging. Dev machines need a running Redis (Memurai, Docker or WSL); `manage.py test` does not (`DJANGO_TESTING`, §3.9). |
| `CELERY_BROKER_URL` | no | `redis://localhost:6379/1` | Celery broker (database **1** — keep it different from the cache). Results are not stored; tasks are acknowledged late and re-queued if a worker dies. | Broker down → tasks cannot be queued; the Beat entry `retry-stalled-tenant-provisioning` (every 5 minutes) re-sends store provisioning that stalled for this reason. |

<a id="django-domains"></a>

### 3.3 Custom domains and public URLs

| Variable | Required | Default | Effect | Missing / wrong |
|---|---|---|---|---|
| `SHARWA_EDGE_CNAME` | no | `TENANT_BASE_DOMAIN` | Target of the **CNAME** record shown to a merchant for a sub-domain (`shop.example.com`), and the fallback for the root-domain A record (`domain_service.dns_records`). Empty counts as "use the base domain". | Wrong value → merchants are told to point DNS at the wrong target and verification never reaches `verifying`. |
| `SHARWA_EDGE_IP` | no | empty | Value of the **A** record shown for a root domain (`example.com`). Empty → the page shows the CNAME target in the A row. | Empty in production with root domains in use → the merchant is shown a host name where an IP is required. TLS issuance itself is an operator step: [`runbooks/custom-domain-tls.md`](runbooks/custom-domain-tls.md) (DOC-516). |
| `TELEGRAM_WEBHOOK_BASE_URL` | no | empty | Public origin of the platform (for example `https://sharwaah.com`) used to register Telegram bot webhooks (`<base>/webhooks/telegram/<bot_id>/`), and as the fallback for supplier webhook links. | Empty → connecting a Telegram bot fails with «تعذّر تحديد نطاق الويبهوك العام لتيليجرام.» |
| `SUPPLIER_WEBHOOK_BASE_URL` | no | empty → `TELEGRAM_WEBHOOK_BASE_URL` | Origin used to build the supplier webhook URL shown in the dropshipping screen. | Both empty → only the path is shown, with a warning. |

<a id="django-messaging"></a>

### 3.4 WhatsApp, payments and carrier webhooks

| Variable | Required | Default | Effect | Missing / wrong |
|---|---|---|---|---|
| `GREEN_API_INSTANCE`, `GREEN_API_TOKEN` | yes, for `WhatsAppService.send_message` | — | Legacy Green API sender (`products/services/messaging.py`): OTP codes, order and refund messages. | Either missing → logs "Missing crucial environment variable" and the send **returns `False`**. Store sign-up then answers 502 «تعذّر إرسال رمز التحقق إلى هذا الرقم على واتساب. تأكد من الرقم وحاول مرة أخرى.»; a POS large refund answers 502 «تعذّر إرسال رمز التحقق إلى واتساب المتجر. حاول مرة أخرى.»; other callers just skip the message. |
| `GREEN_API_URL` | no | `https://7107.api.greenapi.com` (with a warning) | Host of the Green API instance. | Wrong host → 404 from Green API; set it to the value shown in the Green API console. |
| `WA_GATEWAY_BASE_URL`, `WA_GATEWAY_API_KEY` | yes, for SharwaConnect | — | SharwaConnect (WhatsApp session gateway: QR, send). Requests are HMAC-signed with the key. | Either missing → `SharwaConnectError` «تعذّر الاتصال بخدمة الواتساب حالياً. يرجى المحاولة لاحقاً أو التواصل مع الدعم.» (the variable names go to the log only). |
| `WA_GATEWAY_WEBHOOK_SECRET` | yes, in production | empty | **Inbound** HMAC secret for `/webhooks/sharwaconnect/`. Must equal the value on the SharwaConnect server. | Empty → every inbound event is rejected silently: message and session status never arrive. |
| `SHARWACONNECT_PLATFORM_STORE_SLUG`, `SHARWACONNECT_PLATFORM_WEBHOOK_SECRET` | no | empty | **Outbound** platform events (the merchant welcome message after sign-up, `tenants/platform_events.py`). A different secret from the previous row. | Either empty → the welcome message is skipped with a warning; sign-up still completes. |
| `KURAIMI_WEBHOOK_TOKEN` | yes, to receive top-ups | empty | Token the bank sends in `X-Kuraimi-Token` to `kuraimi_topup_webhook` (Sharwa Pay wallet top-ups). Compared in constant time. | Empty → the endpoint answers **503** `{"ok": false, "error": "webhook_not_configured"}`; wrong token → **403** `{"ok": false, "error": "Forbidden"}`. |
| `SHARWA_ESCROW_ACCOUNT` | yes, to receive top-ups | empty | Escrow account number the payload must name. | A different account in the payload → 400 `invalid_escrow_account` (a warning is logged). With the variable empty, no real payload can match. |
| `CARRIER_ARAMEX_SECRET`, `CARRIER_SMSA_SECRET`, `CARRIER_SHARWA_SHIP_SECRET` | per carrier | unset | One signing secret per carrier for `X-Carrier-Signature` on `CarrierWebhookView`. | A carrier without a secret stays disabled: its webhooks are refused with 401. |
| `ARAMEX_API_URL` | no | not defined anywhere | `AramexAdapter` reads `getattr(settings, 'ARAMEX_API_URL', '')`. | See the discrepancy below. |

> ⚠️ Discrepancy — roadmap lists no Aramex endpoint variable / code reads `ARAMEX_API_URL` from Django **settings** (`products/carriers/aramex.py:28`), but `config/settings.py` never defines it and neither `.env.example` nor any `os.environ` read provides it. `test_connection()` therefore always answers «واجهة أرامكس غير مهيأة على المنصة بعد — تواصل مع دعم شروة.» and the error detail says «ARAMEX_API_URL غير مُهيَّأ في البيئة.» until a settings line is added (a code change, out of scope for documentation steps). `products/carriers/smsa.py` reads no endpoint setting. Reported in official Step 09.

<a id="django-push"></a>

### 3.5 Web Push

| Variable | Required | Default | Effect | Missing / wrong |
|---|---|---|---|---|
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | yes, for push | empty | One VAPID key pair for the whole platform (not per store). The public key is exposed by the API; the private key is used only by `push_service.py` and never logged. Generate with the one-liner in `.env.example` (`py_vapid`). | Empty → every send fails inside `pywebpush`, a warning is logged and the send returns `False`; subscriptions stay active (the exact exception class depends on the library version). A 404 / 410 from the push service deactivates that subscription. |
| `VAPID_CLAIMS_EMAIL` | no | `admin@sharwaah.com` | `mailto:` claim sent with each push. | Use an address you own. |

<a id="django-ai"></a>

### 3.6 Sharwa AI, DeepSeek and MinIO

| Variable | Required | Default | Effect | Missing / wrong |
|---|---|---|---|---|
| `SHARWA_AI_GATEWAY_BASE_URL`, `SHARWA_AI_GATEWAY_API_KEY` | yes, for the AI gateway | — | WhatsApp gateway of the Sharwa AI engine (create sessions, send). Timeouts 10 s connect / 20 s read. | Missing → `SharwaAIError` «تعذّر الاتصال بخدمة الدعم الفني الذكي حالياً. يرجى المحاولة لاحقاً.»; a transport error → «تعذّر الوصول لخدمة الدعم الفني الذكي حالياً.»; HTTP ≥ 400 → «تعذّر تنفيذ العملية على بوابة الدعم الفني الذكي.» |
| `SHARWA_AI_GATEWAY_WEBHOOK_SECRET` | yes, in production | empty | Inbound HMAC secret of the gateway webhook (`tenants/webhooks_ai.py`), shared with the engine. | Empty → inbound gateway events rejected. |
| `SHARWA_AI_WEBHOOK_URL`, `PLATFORM_WEBHOOK_SECRET` | no (both or neither) | empty | Cart-event publisher to the engine (HMAC-SHA256, the secret must equal the engine's `PLATFORM_WEBHOOK_SECRET`). | Either empty → the publisher is a complete no-op (no network call, no extra query). |
| `SHARWA_AI_WEBHOOK_CONNECT_TIMEOUT`, `SHARWA_AI_WEBHOOK_READ_TIMEOUT` | no | `5`, `10` (seconds) | Publisher timeouts. | Not integers → `ValueError` at import. |
| `SHARWA_AI_COMMERCE_API_SECRET` | yes, for `/sharwa-ai/commerce/*` | empty | Signing secret of the engine's commerce API; must equal `COMMERCE_API_SECRET` on the engine. | Empty → the interface refuses every request and logs «sharwa_ai_commerce: SHARWA_AI_COMMERCE_API_SECRET غير مضبوط — الواجهة مغلقة». |
| `SHARWA_AI_SSO_PRIVATE_KEY_PEM`, `SHARWA_AI_SSO_KID`, `SHARWA_AI_JWT_ISSUER`, `SHARWA_AI_JWT_AUDIENCE` | all four, for single sign-on | empty | RS256 token for the engine console (JWKS at `/.well-known/sharwa-ai-jwks.json`). A literal `\n` inside the PEM value is accepted. The key must be RSA, at least 2048 bits. Issuer and audience must equal the engine's `JWT_ISSUER` / `JWT_AUDIENCE`. | Any of the four empty or the key invalid → SSO is "not configured": the launch endpoint answers **503** «الدخول الموحد إلى لوحة شروه AI غير مهيأ بعد.» |
| `SHARWA_AI_SSO_PREVIOUS_PUBLIC_KEY_PEM`, `SHARWA_AI_SSO_PREVIOUS_KID` | no | empty | Rotation only: the previous public key stays in the JWKS until its tokens expire (ignored when its `kid` equals the current one). | — |
| `SHARWA_AI_SSO_TTL_S` | no | `900` | Token lifetime in seconds; must be between 60 and 3600. | Outside the range or not an integer → SSO "not configured" (503 above). |
| `SHARWA_AI_CONSOLE_URL` | yes, for the launch page | empty | Engine console URL, for example `https://ai.sharwaah.com/console/`. | Empty → **503** «رابط لوحة شروه AI غير مضبوط بعد (SHARWA_AI_CONSOLE_URL).» |
| `SHARWA_AI_MAX_CONSECUTIVE_BOT_REPLIES` | no | `4` | Bot replies in a row before the conversation is handed to a human. A per-store override (1–50, Sharwa AI settings screen) wins over it. Read in two places (`sharwa_ai_api_service.py`: an invalid or `< 1` value falls back to 4; `tasks/support.py`: plain `int()`). | A non-integer makes the support task raise `ValueError` when it runs. |
| `SHARWA_AI_RATE_LIMIT_PER_MINUTE` | no | `5` | Automatic replies per phone number per minute (fixed 60-second window, counted in the **broker** Redis). | Invalid → default; Redis unreachable → **fail-open** (allow), a warning is logged. |
| `SHARWA_AI_TENANT_RATE_LIMIT_PER_MINUTE` | no | `60` | Same limit per store (all its customers together). Only a commented line in `.env.example`. | Same as above. |
| `DEEPSEEK_API_KEY` | no | empty | Auto-reply model key (`ai_reply_service.py`). | — |
| `DEEPSEEK_API_BASE_URL`, `DEEPSEEK_MODEL` | no | `https://api.deepseek.com`, `deepseek-chat` | — | — |
| `MINIO_ENDPOINT_URL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET_NAME` | all four, for media links | empty (`.env.example` suggests `http://localhost:9000` and `sharwa-ai`) | Time-limited GET links for media stored by the AI gateway (`get_media_presigned_url`; links are not stored). | Any empty → warning «MinIO غير مكوّن بالكامل — تعذّر توليد رابط موقّت …» and the link is `None`. |
| `MINIO_USE_SSL` | no | `false` | `true` (any case) enables TLS. | — |
| `NOON_MARKETPLACE_ADAPTER` | no | `fake` | `fake` = the approved simulated noon adapter (decision 2026-10-09, official docs unavailable). **Any other value** selects the real `NoonAdapter` (`registry.py` tests only `== 'fake'`). | A typo such as `Fake` or `faked` silently selects the real adapter; keep it exactly `fake` until the real adapter is accepted. |

<a id="django-channels"></a>

### 3.7 Social channels, marketplaces, suppliers

| Variable | Required | Default | Effect | Missing / wrong |
|---|---|---|---|---|
| `META_APP_ID`, `META_APP_SECRET` | yes, for Facebook / Instagram / WhatsApp connect | empty | OAuth start and token exchange; the secret also verifies `X-Hub-Signature-256` on `/webhooks/meta/`. | Empty → connect fails with «إعدادات فيسبوك غير مكتملة.»; the webhook is disabled ("ويبهوك Meta معطَّل: META_APP_SECRET غير مضبوط.", all events refused). |
| `TIKTOK_APP_KEY`, `TIKTOK_APP_SECRET` | yes, for TikTok Shop | empty | OAuth and `X-Tt-Webhook-Signature` verification on `/webhooks/tiktok-shop/`. | Empty → «إعدادات تيك توك غير مكتملة.»; the webhook is disabled. |
| `AMAZON_SP_APP_ID`, `AMAZON_SP_LWA_CLIENT_ID`, `AMAZON_SP_LWA_CLIENT_SECRET` | yes, for Amazon | empty | Platform application in Seller Central (Login with Amazon). | `get_lwa_credentials()` returns empty strings; the code comment calls the absence "a clear configuration error for the merchant, not a silent disable". |
| `AMAZON_SP_OAUTH_BETA` | no | empty | `1` while the application is a draft in Seller Central: adds `version=beta` to the consent link. | Leave empty for a published application. |
| `CJ_API_BASE_URL` | no | `https://developers.cjdropshipping.com/api2.0/v1` | CJ Open API base; point it at the sandbox for tests. | — |
| `SUPPLIER_ADAPTER_MODES` | no | empty → registry defaults | `code:mode,code:mode` with mode `real` or `fake`. Registry defaults: `cj` real, `makhazen` fake, `knawat` fake, `flat_feed` real. `.env.example` sets `cj:real,makhazen:fake`. | A pair without `:` is ignored silently. |
| `SHARWA_CAMPAIGN_CHUNK_SIZE` | no | `50` | Recipients per broadcast chunk (one Celery task each). | Not an integer → `ValueError` at import of `products/campaigns.py`. |

<a id="django-ops"></a>

### 3.8 Admin UI, logging, Sentry

| Variable | Required | Default | Effect | Missing / wrong |
|---|---|---|---|---|
| `ADMIN_UI_PACKAGE` | no | `django` | `django` / `jazzmin` / `unfold` for the Django admin look. | `jazzmin` or `unfold` without the package installed → `ImproperlyConfigured` naming the pip package. |
| `LOG_FORMAT` | no | `json` when `DEBUG=False`, `text` when `DEBUG=True` | One JSON object per line on stdout for `docker logs` / journald. | — |
| `LOG_LEVEL` | no | `INFO` (`WARNING` while `DJANGO_TESTING=1`) | — | — |
| `SENTRY_DSN` | no | empty | Empty disables Sentry entirely. Also disabled when `DJANGO_TESTING=1`. `send_default_pii=False`. | — |
| `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` | no | `development` if `DEBUG` else `production`; none | Sentry labels. | — |
| `SENTRY_TRACES_SAMPLE_RATE` | no | `0` | Float 0–1; `0` = errors only. | Not a float → `ValueError` at import. |

<a id="django-process"></a>

### 3.9 Process, test and deployment variables

| Variable | Where | Default | Effect |
|---|---|---|---|
| `DJANGO_TESTING` | `manage.py`, `settings.py` | set to `1` by `manage.py` only for the `test` command | `LocMemCache` instead of Redis, `CELERY_TASK_ALWAYS_EAGER` and `CELERY_TASK_EAGER_PROPAGATES` (tasks run inline), `LOG_LEVEL` warning, Sentry off. Not for `.env`. CI sets it explicitly for its non-test jobs ([`testing/ci.md`](testing/ci.md)). |
| `DJANGO_SETTINGS_MODULE` | `manage.py`, `config/celery.py` | `config.settings` (`setdefault`) | — |
| `GUNICORN_BIND` | `deploy/gunicorn.conf.py` | `127.0.0.1:8000` | Listen address. |
| `GUNICORN_WORKERS`, `GUNICORN_MAX_WORKERS` | same | `min(2 × CPUs + 1, 9)` | Sync workers, one thread each. |
| `GUNICORN_TIMEOUT`, `GUNICORN_GRACEFUL_TIMEOUT`, `GUNICORN_KEEPALIVE` | same | `60`, `30`, `5` seconds | Nginx waits 65 s upstream, Gunicorn gives up at 60 s. |
| `GUNICORN_MAX_REQUESTS`, `GUNICORN_MAX_REQUESTS_JITTER` | same | `1000`, `100` | Worker recycling. |
| `GUNICORN_FORWARDED_ALLOW_IPS` | same | `127.0.0.1,::1` | Who may set `X-Forwarded-*`; must list the same proxy address as `REAL_IP_TRUSTED_PROXIES`. |
| `GUNICORN_ACCESS_LOG`, `GUNICORN_ERROR_LOG`, `GUNICORN_LOG_LEVEL` | same | `-`, `-`, `info` | stdout / stderr. |
| `CELERY_QUEUES`, `CELERY_WORKER_CONCURRENCY`, `CELERY_MAX_TASKS_PER_CHILD`, `CELERY_LOG_LEVEL` | `deploy/celery.env` (read by the systemd unit and the compose `worker`) | queues `default,whatsapp,support,channels_meta,channels_tiktok,channels_telegram,channels_broadcast,marketplaces_amazon,marketplaces_noon,suppliers_sync,suppliers_orders`; `4`; `200`; `info` | The single source of truth for the worker's `-Q` list. `deploy/check_celery_queues.py` fails the build when code uses a queue that is not listed (a missing queue is otherwise silent: tasks are accepted and never run). |
| `SHARWA_DOMAIN`, `DOCKER_DB_HOST`, `DOCKER_DB_PORT`, `SHARWA_IMAGE_TAG` | `deploy/docker-compose.prod.yml` | `sharwaah.com`, —, —, — | Read by compose only. |

Process variables of the bare-metal pipeline: `DEPLOY_BRANCH` (default `main`) and `SKIP_PULL=1` for `deploy/deploy.sh` ([`deployment/`](deployment/README.md)).

<a id="matrix"></a>

## 4. Per-environment matrix

The repository defines no staging-specific file: staging is "production with its own secrets and hosts". The "Staging" column is therefore the recommendation of this page, not something code enforces. **R** = required, **O** = optional, **E** = leave empty or unset.

| Variable / group | Dev (Windows, `sharwa.bat` + `npm run dev`) | Staging | Production |
|---|---|---|---|
| Django `DEBUG` | `True` | `False` | `False` — never `True` (§6) |
| `SECRET_KEY`, `CRYPTOGRAPHY_KEY`, `DB_*` | R, throw-away values | R, unique to staging | R, unique, backed up (a lost `CRYPTOGRAPHY_KEY` loses gateway credentials) |
| `ALLOWED_HOSTS` | R: `.localhost,127.0.0.1,…` (copy the example) | R: staging store and console hosts | R: all production hosts, no spaces |
| `TENANT_BASE_DOMAIN` (both sides) | `localhost` | staging domain | `sharwaah.com`; must match on both sides |
| `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS` | O: example values | O | O: usually empty (same-origin BFF) |
| `REDIS_CACHE_URL`, `CELERY_BROKER_URL` | R: local Redis must run (cache DB 0, broker DB 1) | R | R |
| `REAL_IP_*`, `GUNICORN_*` | E / default | R: match the proxy | R: match Nginx (or the compose proxy address) |
| `SHARWA_EDGE_IP`, `SHARWA_EDGE_CNAME` | E | O | R if merchants use custom root domains |
| WhatsApp (`GREEN_API_*`, `WA_GATEWAY_*`) | E — `DEBUG` logs codes instead of sending | R for the flows under test | R, plus `WA_GATEWAY_WEBHOOK_SECRET` |
| `KURAIMI_WEBHOOK_TOKEN`, `SHARWA_ESCROW_ACCOUNT` | E | O | R if Sharwa Pay top-ups are on |
| `CARRIER_*_SECRET` | E | per carrier under test | per enabled carrier |
| `VAPID_*` | O | R if push is tested | R |
| Sharwa AI (`SHARWA_AI_*`, `PLATFORM_WEBHOOK_SECRET`, `DEEPSEEK_*`, `MINIO_*`) | E | O | R when the AI add-on is sold; SSO needs all four keys + console URL |
| `META_*`, `TIKTOK_*`, `AMAZON_SP_*`, `TELEGRAM_WEBHOOK_BASE_URL` | E | O | R per channel offered |
| `NOON_MARKETPLACE_ADAPTER`, `SUPPLIER_ADAPTER_MODES` | `fake` / defaults | `fake` | `fake` until the real adapters are accepted |
| `SENTRY_DSN` | E | O | R (recommended) |
| Next.js `TENANT_BASE_DOMAIN`, `NEXT_PUBLIC_TENANT_BASE_DOMAIN`, `API_INTERNAL_URL`, `NEXT_PUBLIC_PLATFORM_WHATSAPP` | R: from `.env.example` | R | R — build fails without the first and third |
| `SHARWA_MOCKS` | `on` (default) | `on` with a `SHARWA_LIVE_MODULES` list, or `off` | `off` |
| `SHARWA_LIVE_MODULES` | any list; `none` for mock scripts | the modules being verified | ignored (mocks off) |
| `SKIP_ENV_VALIDATION` | E | E | E (only for a build step without real values) |

<a id="startup-failures"></a>

## 5. What stops a process at start

| Symptom | Cause | Fix |
|---|---|---|
| `KeyError: 'SECRET_KEY'` / `'ALLOWED_HOSTS'` / `'DB_NAME'` / `'DB_USER'` / `'DB_PASSWORD'` on any `manage.py` command | Required variable absent | Set it (`.env` or the service environment). |
| `ImproperlyConfigured: CRYPTOGRAPHY_KEY …` | Empty `CRYPTOGRAPHY_KEY` | Set the production key — never a temporary one. |
| `ImproperlyConfigured: TENANT_BASE_DOMAIN غير صالح …` | Scheme, port or leading/trailing dot in the value | Bare domain only. |
| `ImproperlyConfigured: ADMIN_UI_PACKAGE='jazzmin' …` | Package not installed | `pip install` it or set `django`. |
| `ValueError: invalid literal for int()` / `could not convert string to float` at import | A numeric variable (`CONN_MAX_AGE`, `REAL_IP_PROXY_COUNT`, `SHARWA_AI_WEBHOOK_*_TIMEOUT`, `SHARWA_CAMPAIGN_CHUNK_SIZE`, `SENTRY_TRACES_SAMPLE_RATE`) holds text | Fix the value. |
| Next.js: «TENANT_BASE_DOMAIN مطلوب …» / «API_INTERNAL_URL يجب أن يكون رابطاً كاملاً …» | Missing or malformed Next.js variable | §2. |
| Gunicorn starts but every request is 400 | Host header not in `ALLOWED_HOSTS` (or spaces after commas) | §3.1. |
| Login works, then every POST is 403 | Origin missing from `CSRF_TRUSTED_ORIGINS`, or `X-Forwarded-Proto` not written by Nginx behind `SECURE_SSL_REDIRECT` (redirect loop) | §3.1 and [`../architecture/30-security.md`](../architecture/30-security.md). |

<a id="debug-only"></a>

## 6. Behaviour that exists only while `DEBUG=True`

None of these may be reachable in production; [`deployment/go-live-checklist.md`](deployment/go-live-checklist.md) (DOC-517) repeats this as a gate. The three codes are explained in [`management-commands.md`](management-commands.md#debug-codes).

| Behaviour | Code | Production (`DEBUG=False`) |
|---|---|---|
| Store sign-up: the OTP `123456` is accepted at the verify step, and the generated code is written to the log instead of being sent by WhatsApp | `api/views_onboarding.py:85, 129, 321` | Real code sent by WhatsApp; only the real code verifies. |
| POS: the manager code `2468` is accepted while the store has **no** manager code set | `products/services/pos_service.py:74, 885` | Rejected with «لم يُعيَّن رمز مدير لنقطة البيع بعد — أرسل طلب اعتماد للمدير.» |
| POS large refund: `123456` is accepted once a challenge exists, and the code is logged instead of sent | `pos_service.py:1201, 1232` | Sent to the store's WhatsApp; a failed send answers 502 «تعذّر إرسال رمز التحقق إلى واتساب المتجر. حاول مرة أخرى.» |
| `DevMediaMiddleware` (resolves double-encoded and Arabic file names under `MEDIA_ROOT`) and `MEDIA_URL` served by `urls_public` | `config/settings.py:282`, `config/urls_public.py:100` | Not installed — Nginx serves `/media/`. |
| Dev origins for CORS / CSRF (`localhost:3000`, `*.localhost:3000`, `*.localhost`) | `config/settings.py:805-` | Not added. |
| DRF `BrowsableAPIRenderer` next to JSON | `config/settings.py:529` | JSON only. |
| Secure cookies, HTTPS redirect, HSTS, `X_FRAME_OPTIONS=DENY`, proxy SSL header | `config/settings.py:494-508` | All on. |
| Store provisioning URL `http://<sub>.<base>:8000`; `LOG_FORMAT=text`; `SENTRY_ENVIRONMENT=development` | `tenants/provisioning.py:50-52`; `settings.py:413, 488` | `https://…`, JSON logs, `production`. |

## 7. Related pages

- [`../architecture/22-live-module-keys.md`](../architecture/22-live-module-keys.md) — the 39-key register and `.env.example` parity table
- [`../architecture/21-mock-runtime.md`](../architecture/21-mock-runtime.md) — fixtures, `x-sharwa-mock`, mock scripts
- [`../architecture/32-secrets.md`](../architecture/32-secrets.md) — where each secret lives and who can read it
- [`dependencies.md`](dependencies.md) — external services behind the credentials above
- [`management-commands.md`](management-commands.md) — commands and debug-only codes
- [`upload-limits.md`](upload-limits.md) — `DATA_UPLOAD_MAX_MEMORY_SIZE` and Nginx limits
- [`runbooks/switch-module-live.md`](runbooks/switch-module-live.md) — switch one module live / roll it back
- [`../api/overview/bff.md#live-keys`](../api/overview/bff.md#live-keys) — API-level row map
