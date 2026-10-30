# Dependencies and external services

> **Source**: DOC-512 · inventory A.10 · INT-014, INT-023, INT-037, INT-038, INT-039, INT-040, INT-041
> **Code**: `sharwa_saas/requirements.txt` · `sharwa-frontend/package.json` · `products/services/{domain_service,messaging,sharwaconnect_client,sharwa_ai_client,sharwa_ai_sso,push_service,media_service}.py` · `products/services/{social_channels,marketplaces,suppliers}/` · `products/payments/` · `products/carriers/` · `tenants/webhooks*.py` · `deploy/`
> **Last verified against code**: 2026-10-27 (official Step 09)

## 1. Purpose

What the platform needs besides its own code: software packages, infrastructure services and the third-party systems it calls or that call it. For every external system this page gives **who issues the credential, where the credential lives, and what happens when the system is down**. The variables themselves are in [`environment.md`](environment.md).

"Owner" below means the party that runs the system and can fix an outage or issue a new credential, not the person who wrote the integration. Where the repository does not name that party, the column says so instead of guessing; fares confirms those cells (reported in official Step 09).

## 2. Runtime platform

| Component | Version in the repository | Used for | Notes |
|---|---|---|---|
| Python | 3.13 (`python:3.13-slim` image; CI `PYTHON_VERSION`) | Django, Celery | Django 6.1 needs ≥ 3.12. |
| PostgreSQL | 16 (CI service image and the compose `with-db` profile) | One database, one schema per store (django-tenants), `public` for platform tables | Every store schema needs the tenant migrations: [`migrations/`](migrations/README.md). |
| Redis | not pinned (`redis>=5.2,<6` client) | Database 0 = Django cache; database 1 = Celery broker; the Sharwa AI rate limiter also uses the broker database | A dev machine needs one running (Memurai, Docker or WSL). |
| Nginx | not pinned | TLS, wildcard store hosts, `/media/`, 55 MB request bodies | Files in `deploy/nginx/`; limits in [`upload-limits.md`](upload-limits.md). |
| Gunicorn | `>=23,<24` | WSGI server, sync workers | `deploy/gunicorn.conf.py`. |
| Celery worker + one Beat | `celery>=5.3,<6` | Background tasks and the Beat schedule | Never run two Beats (every periodic task would run twice): `deploy/README.md`. |
| Node.js + Next.js | Next 16.4.2, React 19.3.0 (`package.json`); the Node version is not pinned (only `@types/node ^20`) | Dashboard, storefront, BFF | |
| Docker / systemd | — | Two supported ways to run the above | `deploy/docker-compose.prod.yml`, `deploy/systemd/`. |
| Browser for QA scripts | Playwright `^1.64.1` | Frontend QA | [`testing/frontend-qa.md`](testing/frontend-qa.md). |

## 3. Python packages (`requirements.txt`)

| Package | Pin | Used for | When it is missing or fails |
|---|---|---|---|
| `Django` | `==6.1` | Framework | — |
| `django-tenants` | `==3.14.0` | Schema-per-store | — |
| `djangorestframework`, `drf-spectacular` | `==3.18.0`, `==0.30.0` | API and its schema | — |
| `django-ratelimit` | `==4.1.0` | Rate limits | — |
| `django-cors-headers` | `>=4.4,<5` | CORS (explicit origins only) | **Optional by design**: `settings.py` catches `ImportError` and runs without CORS (the dashboard uses the same-origin BFF). |
| `cryptography`, `django-appconf` | `==50.0.1`, `==1.2.0` | Encrypted columns, SSO signing | Per the comment in `requirements.txt`, a patched copy of `django-cryptography` lives in the repository (`django_cryptography/`) because the PyPI release imports a removed Django module. |
| `python-dotenv` | `==1.2.3` | Loads `.env` | — |
| `psycopg2` | `==2.9.12` | PostgreSQL driver (needs `libpq-dev` to build) | — |
| **`Pillow`** | `==12.3.0` | Real-image checks: Sharwa Pay receipts (`forms.ImageField().clean`), product gallery, category / badge / section images (format + decompression-bomb guard), PWA icons (`generate_sharwa_pay_icons`) | Image uploads that run the check fail with the validator's message; the PWA icon command cannot run. |
| `requests` | `==2.34.2` | Every outbound HTTP call below | — |
| `redis` | `>=5.2,<6` | Cache, broker, AI rate limiter | — |
| `celery` | `>=5.3,<6` | Tasks | — |
| `gunicorn` | `>=23,<24` | Web server | — |
| `boto3` | `>=1.35,<2` | MinIO / S3 pre-signed links (imported lazily so a missing library does not stop start-up) | `get_media_presigned_url` returns `None`. |
| `defusedxml` | `>=0.7.1,<0.8` | Safe XLSX parsing of supplier / import feeds (blocks XXE and entity expansion) | Feed upload fails. |
| `python-json-logger`, `sentry-sdk` | `>=3.1,<4`, `>=2.20,<3` | JSON logs; optional Sentry | Sentry is active only when `SENTRY_DSN` is set. |
| `pywebpush` | `==2.0.3` | Browser push (VAPID) | `push_service` logs «pywebpush غير مثبّت — تعذّر إرسال إشعار الدفع.» and returns `False`. |
| **`dnspython`** | `>=2.6,<3` | Custom-domain verification: TXT `_sharwa.<domain>`, A / CNAME routing, 5-second lifetime (`domain_service.lookup`) | `DnsUnavailable` → the «تحقّق الآن» call answers **503** «فحص DNS غير متاح على الخادم الآن — حاول لاحقاً.» An NXDOMAIN / timeout is *not* an error: it returns an empty answer and the domain stays `pending_dns` / `failed` with a next step. |

Optional packages the code only imports when selected: `django-jazzmin`, `django-unfold` (`ADMIN_UI_PACKAGE`).

## 4. Frontend packages (`package.json`)

| Group | Packages | Notes |
|---|---|---|
| Framework | `next` 16.4.2, `react` / `react-dom` 19.3.0 | `typescript.ignoreBuildErrors` is **true** in `next.config.ts`, so `next build` does not catch type errors — `npx tsc --noEmit` is the only gate ([`testing/ci.md`](testing/ci.md)). |
| Validation / env | `zod` ^4.6.7, `@t3-oss/env-nextjs` ^0.13.11 | Data Contract schemas and [`environment.md`](environment.md) §2. |
| Data / forms / state | `@tanstack/react-query`, `@tanstack/react-table`, `react-hook-form`, `@hookform/resolvers`, `zustand`, `nuqs` | |
| UI | `@base-ui/react`, `shadcn`, `cmdk`, `sonner`, `lucide-react`, `recharts`, `motion`, `@dnd-kit/*`, `next-themes`, Tailwind 4 | |
| Dev / QA | `eslint` 9 + `eslint-config-next`, `typescript` 5, `@playwright/test`, `tsx` | |

## 5. External services

Credentials are never in the repository. "Env" = process environment (`.env` / service environment); "per store" = a record created by the merchant in the dashboard; secret fields are write-only in the API and are never returned.

| Service | Direction and purpose | Credential location | Owner | Outage behaviour |
|---|---|---|---|---|
| **SharwaConnect** (WhatsApp session gateway, Node/Baileys) | Out: create sessions, QR, send messages (HMAC-signed requests, 10 s connect / 20 s read). In: delivery, status and inbound-message webhooks to `/webhooks/sharwaconnect/`. | Env: `WA_GATEWAY_BASE_URL`, `WA_GATEWAY_API_KEY` (out), `WA_GATEWAY_WEBHOOK_SECRET` (in), `SHARWACONNECT_PLATFORM_STORE_SLUG` + `SHARWACONNECT_PLATFORM_WEBHOOK_SECRET` (platform welcome event). The API key must be one of the keys configured on the gateway. | SharwaConnect team (`.env.example`: "values from the SharwaConnect team") | Transient errors (timeout, connection loss, 5xx) raise `SharwaConnectTransientError`: `dispatch_whatsapp_message` retries up to **5** times with exponential back-off capped at 300 s, then the usage-log row is marked failed «فشل نهائي بعد استنفاد إعادة المحاولات: …». A 4xx is permanent (no retry). Interactive calls (QR, status) fail with a `SharwaConnectError` whose message is shown to the merchant; with the base URL or key missing it reads «تعذّر الاتصال بخدمة الواتساب حالياً. يرجى المحاولة لاحقاً أو التواصل مع الدعم.» Inbound events with an empty secret are all rejected. |
| **Green API** (legacy WhatsApp sender) | Out: OTP codes and a few direct messages (`WhatsAppService.send_message`, 10 s timeout). | Env: `GREEN_API_URL`, `GREEN_API_INSTANCE`, `GREEN_API_TOKEN`. | Not named in the repository — confirm (the instance is in a Green API account). | No retry: the call returns `False` and logs status and response body (phone masked to the last four digits). Store sign-up answers 502, POS large refund answers 502. |
| **Sharwa AI engine** (gateway, console, cart events, commerce API) | Out: WhatsApp gateway calls (10 s / 20 s), cart-event publisher (5 s / 10 s), SSO tokens for the console. In: gateway webhook, signed `/sharwa-ai/commerce/*`, JWKS at `/.well-known/sharwa-ai-jwks.json`. | Env: `SHARWA_AI_GATEWAY_*`, `SHARWA_AI_GATEWAY_WEBHOOK_SECRET`, `SHARWA_AI_WEBHOOK_URL` + `PLATFORM_WEBHOOK_SECRET`, `SHARWA_AI_COMMERCE_API_SECRET`, `SHARWA_AI_SSO_*`, `SHARWA_AI_JWT_*`, `SHARWA_AI_CONSOLE_URL`. Each secret must equal its twin on the engine. | Sharwa AI engine project (`sharwa-ai` repository) | Missing config or HTTP errors → `SharwaAIError` with the Arabic sentences in [`environment.md`](environment.md) §3.6. Console launch without the SSO keys or URL → **503** (two different sentences). The cart publisher is a **no-op** when its URL or secret is empty, and a down engine never blocks a cart. The commerce API refuses everything while its secret is empty. |
| **DeepSeek** (auto-reply model) | Out: chat completions with tool calls (`ai_reply_service.py`). | Env: `DEEPSEEK_API_KEY`, `DEEPSEEK_API_BASE_URL`, `DEEPSEEK_MODEL`. | DeepSeek account holder — confirm | `generate_reply` returns `None` on any failure: no automatic answer is produced. Per-phone and per-store limits (`SHARWA_AI_RATE_LIMIT_PER_MINUTE` 5, `…TENANT…` 60) and the consecutive-reply cap (4) bound the cost; the limiters **fail open** when Redis is unreachable. |
| **MinIO / S3** | Out: pre-signed GET links for media the AI gateway stored. | Env: `MINIO_*`. | Shared with the engine (same server, separate variables) | Incomplete config → warning and no link (`None`); the media simply has no URL. |
| **Meta** (Facebook, Instagram, official WhatsApp) | Out: OAuth, Graph calls. In: `/webhooks/meta/` signed with `X-Hub-Signature-256`. | Env: `META_APP_ID`, `META_APP_SECRET` (platform app); per store: the connection created by OAuth. | Platform Meta developer app (fares) — confirm | Calls raise `ChannelClientError` (10 s / 20 s); the channel tasks auto-retry up to 5 times with back-off; Beat `check-channel-connection-health` runs every 15 minutes. With `META_APP_SECRET` empty the webhook refuses every event. |
| **TikTok Shop** | OAuth + webhook `/webhooks/tiktok-shop/` (`X-Tt-Webhook-Signature`; the signature format is marked as assumed in the code). | Env: `TIKTOK_APP_KEY`, `TIKTOK_APP_SECRET`; per store: connection. | Platform TikTok app — confirm | Same pattern as Meta; empty secret disables the webhook. |
| **Telegram Bot API** | Out: bot calls; webhook registration to `<TELEGRAM_WEBHOOK_BASE_URL>/webhooks/telegram/<bot_id>/`. | Per store: the bot token (write-only). Env: `TELEGRAM_WEBHOOK_BASE_URL`. | The merchant owns the bot | Missing base URL → «تعذّر تحديد نطاق الويبهوك العام لتيليجرام.»; otherwise as Meta. |
| **Amazon SP-API** | Out: Login-with-Amazon OAuth, listings, FBA inventory, orders (10 s / 30 s). | Env: `AMAZON_SP_APP_ID`, `AMAZON_SP_LWA_CLIENT_ID`, `AMAZON_SP_LWA_CLIENT_SECRET`, `AMAZON_SP_OAUTH_BETA`; per store: the authorisation from OAuth. Seller Central roles needed are listed in `.env.example`; reading the buyer address needs Amazon's restricted-data approval, without which FBM order pulls fail and are logged in the sync log. | Platform Seller Central application (fares) — confirm | Failures land in the sync log; Beat `poll-marketplace-orders` (every 5 minutes), `poll-fba-inventory` (hourly at :41), `check-marketplace-connection-health` (four times an hour) keep trying. Marketplace tasks use the `marketplaces_amazon` queue. |
| **noon** | Adapter chosen by `NOON_MARKETPLACE_ADAPTER`. | None while `fake`. | — | `fake` (default) makes **no** external call. Any value other than `fake` selects the real adapter ([`environment.md`](environment.md) §3.7). |
| **CJ Dropshipping** (real adapter) | Out: Open API (10 s / 30 s); supplier webhooks `/webhooks/suppliers/<code>/<token>/` (body ≤ 1 MiB). | Per store: supplier credentials (write-only); env `CJ_API_BASE_URL`. | CJ account of each merchant | Health check every 15 minutes (`check-supplier-connection-health`), order polling twice an hour, inventory sync every 5 minutes. |
| **مخازن (`makhazen`) and `knawat`** (the roadmap writes «قنوات»; the code key is `knawat`) | Registry default mode **fake** for both (`DEFAULT_MODES`); `SUPPLIER_ADAPTER_MODES` can switch a supplier to `real`. | — while fake | — | Fake adapters make no external call. |
| **Payment gateways Jeeb and Kuraimi** (customer-facing card of the store) | Out: charge calls from `products/payments/{jeeb,kuraimi}.py`. Paths, field names and error codes are marked in the code as **assumed**, pending the banks' official documents («طابقها مع وثائق البنك قبل الإطلاق»). | Per store: `PaymentCredential.credentials_encrypted`, encrypted with `CRYPTOGRAPHY_KEY`. | Each merchant's bank agreement | A success reply **without** a transaction reference raises `PaymentIndeterminateError` («تمت العملية لكن لم يصلنا رقم مرجعي. تواصل مع المتجر للتأكيد.») and the order is not cancelled; a decline raises `PaymentDeclinedError`. An order whose payment outcome is undecided sits in `payment_review`, and `release_stuck_orders` never cancels it because money may already have left the customer ([`management-commands.md`](management-commands.md)). |
| **Kuraimi bank webhook** (Sharwa Pay top-ups) | In: `kuraimi_topup_webhook`; credits the Sharwa Pay wallet. | Env: `KURAIMI_WEBHOOK_TOKEN` (header `X-Kuraimi-Token`), `SHARWA_ESCROW_ACCOUNT`. | The bank and fares | Token empty → **503** `webhook_not_configured`; wrong token → 403; wrong escrow account → 400; a replayed transaction id → 200 `duplicate_ignored`. The bank retries are not part of this code. |
| **Carriers Aramex, SMSA** (and Sharwa Ship) | Out: shipment creation / tracking through `products/carriers/`. In: carrier webhooks signed with `X-Carrier-Signature`. | Per store: carrier credentials (secret fields write-only). Env: one webhook secret per carrier (`CARRIER_*_SECRET`). **Aramex also needs `ARAMEX_API_URL` in Django settings, which does not exist** — see the discrepancy in [`environment.md`](environment.md) §3.4. | The carrier accounts of each merchant; the platform for Sharwa Ship | `CarrierUnavailableError` queues the waybill: Beat `retry-pending-awb-issuance` (every 15 minutes) retries and `verify-label-availability` (every 10 minutes) checks labels. A carrier without a webhook secret is disabled (401). |
| **Browser push services** (FCM, Mozilla, Apple) through `pywebpush` | Out: Web Push with one platform VAPID key pair. | Env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CLAIMS_EMAIL`. | The push vendors; the key pair belongs to the platform | 404 / 410 deactivate that subscription; any other failure is a logged transient and the subscription stays active. Broadcast runs as a Celery task so a slow vendor never blocks a request. |
| **DNS resolvers** (through `dnspython`) and **certificate authority** | Custom-domain ownership and routing checks; TLS issuance is an operator step (certbot): wildcard certificate by DNS-01, per-domain certificates by HTTP-01. | None in the app; the edge targets are `SHARWA_EDGE_IP` / `SHARWA_EDGE_CNAME`. | fares (operations) | See §3 for the 503. Until a certificate exists a custom domain stays `verifying` and the catch-all server block refuses it (444): [`runbooks/custom-domain-tls.md`](runbooks/custom-domain-tls.md). |
| **Google Fonts** | Storefront theme: 11 Arabic-capable families are allowed (`StoreSetting.GOOGLE_FONT_CHOICES`: Alexandria, Tajawal, Cairo, Almarai, IBM Plex Sans Arabic, Changa, Reem Kufi, El Messiri, Noto Kufi Arabic, Amiri, Rubik); Django rejects any other name. At most two store fonts are fetched per page (`storefront-check.ts`). | None. | Google | How the page behaves while Google is unreachable depends on the Next.js font loading, which this step did not read. |
| **Tracking pixels and tag managers** (Meta pixel, TikTok pixel, Snapchat pixel, GTM, GA4 / gtag, Google Ads) | Browser-side scripts on the **storefront** only (the dashboard loads none — asserted by `domains-check.ts`). Public IDs and two server-side API tokens (Meta Conversions API, TikTok Events API) are merchant settings (`integrations_service.py`). | Per store, in tracking settings; the two tokens are write-only and never appear in a response or the DOM. | Each merchant's ad accounts | A blocked or failing pixel affects only that script; a malformed ID produces a warning in the form and does not block saving. |
| **Sentry** (optional) | Out: error reports, no PII (`send_default_pii=False`). | Env: `SENTRY_DSN` (+ `SENTRY_*`). | fares | Empty DSN disables it; the application never depends on it. |

> Domain-level detail for each integration (screens, states, error sentences) lives in the API domain pages: [`../api/domains/13-channels-operations/`](../api/domains/13-channels-operations/README.md), [`../api/domains/14-apps-ai-support/`](../api/domains/14-apps-ai-support/README.md) and the Track 3 integration pages written in later steps.

## 6. Failure modes and fixes

| Failure | Symptom | Cause | Fix |
|---|---|---|---|
| WhatsApp messages never leave | `usage log` rows end failed after five retries | SharwaConnect down or `WA_GATEWAY_*` wrong | Fix the gateway / variables; resend manually — failed rows are not re-queued. |
| Inbound WhatsApp events missing | No message / session status updates | `WA_GATEWAY_WEBHOOK_SECRET` empty or different from the gateway's | Set the same secret on both sides. |
| Custom domain always «تحقّق الآن» → 503 | `dnspython` missing on the server | `pip install -r requirements.txt` not run on the last release | Re-run the release pipeline (`deploy/deploy.sh` installs requirements). |
| Auto-replies stop | No bot answer, no error | DeepSeek key / quota; Redis limiter is fail-open so it is not the limiter | Check `DEEPSEEK_API_KEY`; the session will escalate to a human after the reply cap. |
| Meta / TikTok webhooks do nothing | Logs: «ويبهوك Meta معطَّل: META_APP_SECRET غير مضبوط.» | Empty app secret | Set `META_APP_SECRET` / `TIKTOK_APP_SECRET`. |
| Sharwa AI console button answers 503 | Two possible sentences | SSO keys incomplete, or `SHARWA_AI_CONSOLE_URL` empty | [`environment.md`](environment.md) §3.6. |
| Payment stuck in `payment_review` | Order never cancels | Bank reply was undecided | Resolve from the payment-review screen; never by the cron command. |

## 7. Open items

- Owner names for the cells marked "confirm" (Green API account, DeepSeek account, Meta / TikTok / Amazon platform applications).
- Jeeb and Kuraimi request formats are still assumptions until the banks' documents arrive.
- Google Fonts and pixel outage behaviour need a read of the Next.js storefront theme code (a later Track 3 page).

## 8. Related pages

- [`environment.md`](environment.md) — every variable named above
- [`management-commands.md`](management-commands.md) — commands that touch these services
- [`upload-limits.md`](upload-limits.md) — Nginx and Django body limits
- [`../architecture/32-secrets.md`](../architecture/32-secrets.md) — secrets and encrypted columns
- [`../architecture/35-outbound-and-redirect-safety.md`](../architecture/35-outbound-and-redirect-safety.md) — outbound call safety
