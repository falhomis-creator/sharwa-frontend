# Outbound-request and redirect safety

> **Source**: DOC-471 · INT-023 (M19 webhooks), INT-037 (M27 channels), INT-038 (M28 marketplaces), INT-041 (M31 Sharwa AI)
> **Code**: `sharwa_saas/products/services/webhook_service.py` (`url_error`, `_host_is_public`, `send`, `deliver_with_retry`) · `products/models/webhooks.py` (`AUTO_DISABLE_AFTER`) · `api/views_channels.py` (`_safe_return`, `ChannelOAuthStartView`) · `products/views/social_channels_connect.py` (Meta/TikTok callbacks, `_finish`) · `api/views_marketplaces.py` (`AmazonOAuthStartView`) · `products/views/marketplaces_connect.py` (`amazon_oauth_callback`, `_back`) · `products/services/marketplaces/api_service.py` (`amazon_return_finish_hook`) · `products/services/sharwa_ai_sso.py` · `products/services/sharwa_ai_api_service.py` (`console_token`) · `api/views_sharwa_ai.py` (`SharwaAiConsoleTokenView`) · `products/services/social_channels/{channels_api_service,channel_clients}.py` (Telegram) · `tenants/webhooks_channels.py` (inbound Telegram secret) · `sharwa-frontend/src/features/apps/components/sharwa-ai-screen.tsx` (`ConsoleButton`)
> **Last verified against code**: 2026-10-27 (official Step 08)

## 1. Purpose

Every place where Sharwa either **calls a URL someone else chose** (merchant webhooks, Telegram bot registration) or **sends the browser somewhere** (OAuth return URLs, the Sharwa AI console hand-off). For each surface: the validation rule, where it is enforced, and the test that pins it. Inbound webhook receivers (carriers, payment gateways, Meta/TikTok, Kuraimi) and their signatures belong to the integrator specs; secrets used here (webhook signing secret, bot token, SSO key) are catalogued in [`32-secrets.md`](32-secrets.md).

## 2. Components

| Surface | Direction | Who chooses the target | Guard |
|---|---|---|---|
| Merchant webhooks (`webhooks/endpoints/`) | Django → merchant URL | store owner | https-only + internal-host refusal at save and again at send, no redirects, timeouts, auto-disable |
| Meta / TikTok OAuth (`channels/<code>/oauth/start/`) | browser → provider → Django → browser | Next.js passes `?return=` | `_safe_return`: same store host, path under `/dashboard/`, `state` in session |
| Amazon SP-API OAuth (`marketplaces/amazon/oauth/start/`) | same | same | same `_safe_return` + `state`; callback pins the Saudi marketplace |
| Sharwa AI console SSO (`apps/sharwa-ai/console-token/`) | Django → browser → console window | Django setting `SHARWA_AI_CONSOLE_URL` | RS256 token in the body only (`no-store`, `no-referrer`), owner session pinned to the store, `postMessage` only to the window opened and its origin |
| Telegram connect (`channels/telegram/connect/`) | Django → `api.telegram.org` | fixed host | token format check → `getMe` → random `secret_token` → `setWebhook` to our own public base URL |

## 3. Data model

| Model / store | Schema | Fields that matter here |
|---|---|---|
| `WebhookEndpoint` | store | `url` (≤ 500 chars), `secret` (`whsec_…`), `events`, `is_active`, `failure_count`, `auto_disabled` |
| `WebhookDelivery` | store | `event_id`, `attempt`, `status`, `response_code`, `duration_ms`, `error` |
| Session keys | store | `social_oauth_return`, `marketplace_oauth_return` (validated return URL), `meta_oauth_state`, `tiktok_oauth_state`, `amazon_oauth_state` |
| `StoreAppInstallation.config` (encrypted) | store | Telegram `bot_token`, `bot_id`, `bot_username`, `secret_token`; Amazon `marketplace_ids`, `default_marketplace_id` |

## 4. Flows and rules per surface

### 4.1 Merchant webhooks — https-only, SSRF guard, no redirects

**At save** (`url_error`, called by create and patch):

| Check | Answer (`400 {"url": [...]}`) |
|---|---|
| empty | «أدخل عنوان نقطة النهاية.» |
| scheme is not `https` | «العنوان يجب أن يبدأ بـ https://» |
| host `localhost` or ending `.local` / `.internal` / `.localhost` | «لا تُقبل العناوين الداخلية — استخدم عنواناً عاماً.» |
| no dot and no colon in the host, or URL longer than 500 | «عنوان غير صالح.» |
| host is an IP literal that is not `is_global` | internal message |
| host name resolves (port 443) to any address that is private, loopback, link-local, reserved, multicast or unspecified | internal message |
| host name does not resolve now | **accepted** (`_host_is_public` returns `None`); refused at send time |

Other save rules: at most 10 endpoints per store (`MAX_ENDPOINTS`; the 11th answers `400` «الحد الأقصى 10 نقاط نهاية لكل متجر.»), at least one known event.

**At send** (`send`, one attempt):

```mermaid
sequenceDiagram
  participant T as Celery task deliver_with_retry
  participant S as webhook_service.send
  participant DNS as DNS
  participant M as Merchant endpoint
  T->>S: delivery (pending)
  S->>DNS: getaddrinfo(host, 443)
  alt unresolvable or any non-public address
    S-->>T: failed «تعذّر الوصول للعنوان أو أنه عنوان داخلي.» (no request made)
  else public
    S->>M: POST JSON, X-Sharwa-Signature t=…,v1=HMAC-SHA256, timeout (3 s, 10 s), allow_redirects=False
    M-->>S: status
  end
  S->>S: 2xx ⇒ delivered, failure_count=0; else failed, failure_count+1 (row lock)
  S->>S: failure_count ≥ 10 (AUTO_DISABLE_AFTER) ⇒ is_active=False, auto_disabled=True
  T->>T: failed and attempt < 3 ⇒ new attempt after 60 s, then 300 s
```

- A 3xx answer is a **failure** (`allow_redirects=False`): a public endpoint cannot bounce the request to an internal address.
- Timeouts `(3, 10)` seconds (connect, read); network errors are recorded as «تعذّر الاتصال: <exception name>» without the body.
- Signature: `X-Sharwa-Signature: t=<unix>,v1=<hex HMAC-SHA256 over "<t>." + body>` with the endpoint secret; also `X-Sharwa-Event`, `X-Sharwa-Delivery`, `User-Agent: Sharwa-Webhooks/1.0`.

> ⚠️ Discrepancy — roadmap says "internal hosts and non-global IPs refused at save and re-checked at send" / code does: only **IP literals** are tested with `is_global`. A **host name** is tested against a narrower list (private, loopback, link-local, reserved, multicast, unspecified — `webhook_service.py:67-76`), so a name that resolves into the shared address space `100.64.0.0/10` (neither private nor global in Python's `ipaddress`) passes at save **and** at send. A name that does not resolve at save is accepted and only refused when sent. Reported in official Step 08.

Tests: `api/test_integrations_api.py::WebhookApiTests::test_events_and_validation` (http refused, `localhost` and `10.0.0.5` refused, a name resolving internally refused with `_host_is_public` mocked to `False`), `test_test_event_signed` (asserts `allow_redirects=False` and the signature), `test_auto_disable_and_reenable`, `test_emit_and_retry`; mock E2E `scripts/domains-check.ts` (https only, events required, secret shown once). No test exercises the **send-time** refusal.

### 4.2 OAuth return URLs (Meta, TikTok, Amazon)

The Next.js dashboard starts OAuth with `GET /api/v1/channels/<meta|tiktok>/oauth/start/?return=<url>` or `GET /api/v1/marketplaces/amazon/oauth/start/?return=<url>`.

`_safe_return(request, raw)` (`api/views_channels.py:156-174`, reused by marketplaces) accepts the return URL only when **all** hold, else it is dropped (`None`):

1. it parses, scheme `http` or `https`, has a host;
2. its path starts with `/dashboard/`;
3. its host equals one of: the request host, the first `X-Forwarded-Host` value, or `X-Store-Domain` (ports stripped, lower-case).

```mermaid
sequenceDiagram
  participant B as Browser (dashboard)
  participant D as Django (store host)
  participant P as Provider (Meta / TikTok / Amazon)
  B->>D: GET …/oauth/start/?return=https://<store>/dashboard/channels/social
  D->>D: _safe_return → target or None; owner/permission + feature gate
  alt gate or config error
    D-->>B: 302 target?oauth_error=<reason> (or JSON 4xx when no target)
  end
  D->>D: session[*_oauth_state]=random; session[*_oauth_return]=target
  D-->>B: 302 provider consent URL (state)
  B->>P: consent
  P-->>B: 302 Django callback ?code&state
  B->>D: callback
  D->>D: state equal to session value? (popped) else oauth_error
  D->>D: exchange code, store encrypted credentials
  D-->>B: 302 target?connected=<meta|tiktok|amazon>  or  target?oauth_error=<reason>
```

- `?connected=` carries the **UI** code (`meta`, `tiktok`, `amazon`), not the Django install code.
- **State** is a 16-byte `secrets.token_urlsafe`, kept in the session and popped on use; a mismatch answers «فشل التحقق من أمان عملية الربط (state). أعد المحاولة.».
- **Amazon pins Saudi**: when the flow started from Next.js, the callback calls `amazon_return_finish_hook()`, which sets `marketplace_ids = [SAUDI_MARKETPLACE_ID]` and `default_marketplace_id` if the seller participates there, else returns «حساب البائع غير مشارك في سوق أمازون السعودية — لا يمكن تثبيت الربط.» as `oauth_error`.
- **Legacy hub flow unchanged**: starting from the Django HTML hub pops the stored return key, so the callback falls back to the old confirmation page and hub (`social_channels_connect.py:120`, `marketplaces_connect.py:92`).

Tests: `api/test_channels_api.py::ChannelsApiTests::test_channels_telegram_and_oauth` (a foreign `http://evil.example/dashboard/x` return is dropped and the error comes back as JSON `400`; a same-host return gets `302` with `oauth_error=`), `api/test_marketplaces_api.py::MarketplacesApiTests::test_amazon_oauth_start_not_configured`, `test_amazon_return_hook_pins_saudi`.

### 4.3 Sharwa AI console SSO

**Django side** (`POST apps/sharwa-ai/console-token/`):

| Rule | Where |
|---|---|
| Owner only (write guard) **and** the session's `auth_tenant_schema` equals the current schema, else `401` «انتهت جلستك، سجّل الدخول مجدداً.» | `api/views_sharwa_ai.py:50-61` |
| Token: RS256 JWT, header `{alg: RS256, typ: JWT, kid}`, claims `iss`, `aud`, `sub = merchant:<schema>`, `tenant = <schema>`, `role = merchant_admin`, `iat`, `exp = iat + ttl` | `sharwa_ai_sso.issue_console_token` |
| TTL `SHARWA_AI_SSO_TTL_S`, default 900 s, must be 60–3600; RSA key ≥ 2048 bits; `tenant_ref` may not be `public` | `sharwa_ai_sso._config`, `issue_console_token` |
| Answer `{console_url, token, expires_in}`; `Cache-Control: no-store`, `Referrer-Policy: no-referrer` on every answer (including `401`) | view |
| Missing `SHARWA_AI_CONSOLE_URL` → `503` «رابط لوحة شروه AI غير مضبوط بعد (SHARWA_AI_CONSOLE_URL).»; SSO keys missing → `503` «الدخول الموحد إلى لوحة شروه AI غير مهيأ بعد.» (fail closed) | `sharwa_ai_api_service.console_token` |
| Public key published as JWKS at `/.well-known/sharwa-ai-jwks.json` on the platform host; previous key kept during rotation (`SHARWA_AI_SSO_PREVIOUS_*`) | `config/urls_public.py:96`, `sharwa_ai_sso.jwks` |

**Next side** (`ConsoleButton` in `sharwa-ai-screen.tsx`) — the token never appears in a URL:

```mermaid
sequenceDiagram
  participant U as Owner (click)
  participant N as Dashboard tab
  participant D as Django
  participant C as Console window
  U->>N: «افتح وحدة تحكم شروة AI»
  N->>C: window.open("about:blank") (inside the click, so popups are allowed)
  N->>D: POST console-token (BFF)
  D-->>N: {console_url, token, expires_in}
  N->>N: origin = new URL(console_url).origin; arm timer(expires_in)
  N->>C: location = console_url (plain, no token)
  C-->>N: postMessage {type: "sharwa-console-ready"}
  N->>N: accept only if e.source === that window AND e.origin === origin
  N->>C: postMessage {type: "sharwa-console-token", token}, targetOrigin = origin
  N->>N: forget token, remove listener (once)
  Note over N: no ready message before expires_in, or screen unmounts ⇒ token dropped
```

- The trusted origin is **derived from `console_url`**, never hard-coded. The same origin filters later "refresh" messages from the console (`sharwa-ai-screen.tsx:52-66`).
- A failure closes the blank window and shows the API error text (or «تعذّر فتح وحدة التحكم.»); a blocked popup shows «المتصفح منع فتح النافذة؛ اسمح بالنوافذ المنبثقة لهذا الموقع.».
- The legacy Django launch page (`products/views/sharwa_ai_sso.py`) uses the same token and `postMessage` contract.

Tests: `api/test_sharwa_ai_api.py::SharwaAiApiTests::test_console_token` (503 without URL, 503 when SSO is not configured, 200 body, `no-store`, `no-referrer`, the exact `issue_console_token` arguments, 401 for a session pinned to another store). The browser hand-off has no automated test (`scripts/apps-support-check.ts` skips the AI checks when `sharwa_ai` is not in the catalogue).

### 4.4 Telegram connect

`POST channels/telegram/connect/ {bot_token}` → `connect_telegram`:

1. Format check `^\d{6,12}:[A-Za-z0-9_-]{30,}$`, else `400 {"bot_token": ["رمز البوت غير صحيح — انسخه كما يعطيه @BotFather."]}`.
2. `getMe` on the fixed host `https://api.telegram.org/bot<token>/getMe` → `bot_id`, `username`.
3. `secret_token = secrets.token_urlsafe(32)`.
4. `setWebhook` with `url = <TELEGRAM_WEBHOOK_BASE_URL>/webhooks/telegram/<bot_id>/` and `secret_token`. The base URL comes from the environment (the public route lives in `urls_public.py` and cannot be reversed from a store schema); missing ⇒ «تعذّر تحديد نطاق الويبهوك العام لتيليجرام.».
5. Install `telegram_bot`, store token + secret encrypted, register the public bridge row `bot_id → schema`.
6. Inbound updates are accepted only with the matching `X-Telegram-Bot-Api-Secret-Token` (`tenants/webhooks_channels.py:141`).

Provider failures map to `400 {"bot_token": [...]}` with a generic Arabic text («تعذّر الوصول لخدمة القناة حالياً. يرجى المحاولة لاحقاً.» / «رفض مزوّد القناة تنفيذ العملية.»); the raw provider body stays in `internal_detail` for logs only. Timeouts: 10 s connect, 20 s read.

Test: `api/test_channels_api.py::ChannelsApiTests::test_channels_telegram_and_oauth` (bad token `400`, mocked `getMe`/`setWebhook`, token never echoed in `channels/`, disconnect).

## 5. Invariants

| Invariant | Enforced in |
|---|---|
| No merchant-controlled request leaves over plain HTTP | `url_error` (`https` only) |
| A webhook never follows a redirect | `requests.post(…, allow_redirects=False)` |
| A webhook host is re-checked immediately before each attempt | `send` → `_host_is_public` |
| A failing endpoint stops after 10 consecutive failures | `AUTO_DISABLE_AFTER = 10` under row lock |
| OAuth never redirects off the store host or outside `/dashboard/` | `_safe_return` |
| OAuth callbacks require the state issued to the same session | `*_oauth_state` popped and compared |
| The console token is never written to a URL, log, cache or `Referer` | body only + `no-store` + `no-referrer`; Next posts it once to one window and one origin |
| A session signed in on store A cannot mint a console token on store B | `auth_tenant_schema` comparison |

## 6. Background work

| Task | Trigger | Retry |
|---|---|---|
| `deliver_with_retry(delivery_id)` | `emit()` creates one delivery per subscribed active endpoint in `transaction.on_commit`; manual test / redeliver | up to 3 attempts (`AUTO_RETRIES`) at +60 s and +300 s (`RETRY_DELAYS`); a disabled endpoint fails the delivery except `webhook.test` |
| `low_stock_scan` | Beat entry `dispatch-low-stock-webhooks` (`products.tasks.dispatch_low_stock_webhooks`, `config/settings.py:650`) | emits `inventory.low_stock` once per entry (`test_low_stock_scan_once_per_entry`; see [`50-background-jobs.md`](50-background-jobs.md)) |

## 7. Configuration

| Setting | Use |
|---|---|
| `SHARWA_AI_CONSOLE_URL` | console URL and trusted `postMessage` origin; empty ⇒ `503` |
| `SHARWA_AI_SSO_PRIVATE_KEY_PEM`, `SHARWA_AI_SSO_KID`, `SHARWA_AI_JWT_ISSUER`, `SHARWA_AI_JWT_AUDIENCE`, `SHARWA_AI_SSO_TTL_S` (60–3600, default 900), `SHARWA_AI_SSO_PREVIOUS_PUBLIC_KEY_PEM`, `SHARWA_AI_SSO_PREVIOUS_KID` | SSO signing and rotation |
| `TELEGRAM_WEBHOOK_BASE_URL` | public base for Telegram webhooks |
| `META_APP_ID` (+ secret), TikTok and `AMAZON_SP_APP_ID`, `AMAZON_SP_LWA_CLIENT_ID`, `AMAZON_SP_LWA_CLIENT_SECRET` | OAuth apps; missing ⇒ `oauth_error` / `400` |

Storage and rotation of these values: [`32-secrets.md`](32-secrets.md); environment reference: [`../ops/environment.md`](../ops/environment.md).

## 8. Failure modes and fixes

| Failure | Symptom | Cause | Handling / fix |
|---|---|---|---|
| Open redirect after OAuth | browser sent to another site | return URL taken as given | `_safe_return` (INT-037 / INT-038) |
| Token in a URL | token visible in history, logs, `Referer` | old launch pattern | token in body only; Next `postMessage` hand-off (INT-041) |
| Console origin hard-coded | hand-off fails on staging, or posts to the wrong origin | fixed production URL in the client | origin derived from `console_url` (INT-041) |
| Webhook to an internal service | SSRF | URL not validated | `url_error` at save + `_host_is_public` at send + no redirects (INT-023) |
| DNS changes between check and request | request may reach an address that was not checked | `getaddrinfo` in `send` and the resolver inside `requests` run separately | open item §9 |

## 9. Open items

- **Hostname check narrower than the literal-IP check** (call-out in §4.1): use `not ip.is_global` for resolved addresses too.
- **DNS rebinding window**: `send` resolves the host, then `requests` resolves it again. Pinning the checked address (connect to the IP with the original `Host`/SNI) would close it.
- **Unresolvable host accepted at save**: harmless (refused at send) but surprising for the owner; consider a soft warning.
- **`_safe_return` allows `http`** and trusts `X-Forwarded-Host` / `X-Store-Domain` from the request. Top-level browser navigations cannot set those headers, so this is not exploitable through a link; restricting to `https` in production would still be cleaner.
- **No test for the send-time refusal** and **no browser test for the console hand-off**.

## 10. Related pages

- Secrets used by these surfaces: [`32-secrets.md`](32-secrets.md) · identities and CSRF: [`30-security.md`](30-security.md)
- Webhook contract for integrators: [`../api/integrators/README.md`](../api/integrators/README.md)
- Rate limits on outbound marketplace calls: [`34-rate-limits.md`](34-rate-limits.md) §8
- Background jobs: [`50-background-jobs.md`](50-background-jobs.md) · audit of console-token and webhook-rotate answers: [`37-audit.md`](37-audit.md)
