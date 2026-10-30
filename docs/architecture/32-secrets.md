# Secrets handling and credential storage

> **Source**: DOC-468 · INT-020 (M14), INT-021 (M15), INT-022 (M18), INT-023 (M19), INT-033 (M16), INT-037 (M27), INT-038 (M28), INT-039 (M29), INT-040 (M30), INT-041 (M31)
> **Code**: `sharwa_saas/django_cryptography/` (vendored, patched) · `sharwa_saas/config/settings.py` (`SECRET_KEY`, `CRYPTOGRAPHY_KEY`) · `products/payments/{registry,base,jeeb,kuraimi}.py` · `products/services/payments_service.py` · `products/carriers/{registry,base,aramex,smsa}.py` · `products/services/{shipping_service,carrier_service}.py` · `tenants/models.py` (`ThirdPartyLogisticsProvider`, `ThirdPartyLogisticsClientAgreement`, `ChannelSessionIndex`, `WhatsAppSessionIndex`) · `products/models/apps.py` (`StoreAppInstallation`) · `products/services/social_channels/{channels_api_service,bridge_service}.py` · `products/services/marketplaces/connection_service.py` · `products/services/suppliers/connection_service.py` · `products/models/webhooks.py` + `products/services/webhook_service.py` · `products/models/staff_sessions.py` + `products/services/staff_service.py` · `products/services/integrations_service.py` + `products/models/store_settings.py` (`TrackingSettings`, `StoreSetting.pos_manager_code_hash`, `StoreSetting.admin_password`) · `products/management/commands/set_pos_manager_code.py` · `products/services/sharwa_ai_sso.py` + `sharwa_ai_api_service.py` · test `products/test_cryptography_freeze.py`
> **Last verified against code**: 2026-10-27 (official Step 08)

## 1. Purpose

Sharwa stores four kinds of secret on behalf of merchants and the platform: **third-party credentials** the platform must read back to call an outside service (gateways, carriers, channels, marketplaces, suppliers), **signing secrets** it shares with a receiver (outgoing webhooks, supplier webhooks), **verifiers** it never needs to read back (passwords, access tokens, the POS manager code), and **platform keys** that live only in the environment (encryption, SSO signing). This page lists every one with where it is stored, how a response masks it, and how it is rotated or cleared, then describes the encryption scheme they share.

The rule every service follows: **a secret goes in, and only a hint comes out.** A response carries at most `has_*`, `is_secret`, a `masked_hint` (last four characters), or `has_value`. The only exceptions are values the caller must copy **once** (new webhook secrets, a new access token, a temporary password, the SSO token); those responses are listed in §4.3.

Out of scope: OTP codes and their HMACs (→ [`33-otp.md`](33-otp.md)), session cookies and CSRF (→ [`30-security.md`](30-security.md)), redaction of secrets in logs (→ [`37-audit.md`](37-audit.md)).

## 2. Components

| Component | Location | Role |
|---|---|---|
| `encrypt(field)` | `django_cryptography/fields.py` | Wraps a model field so the value is pickled, encrypted and authenticated before it reaches the database (`bytea`), and decrypted on read. Transparent to the ORM |
| `FernetBytes` | `django_cryptography/utils/crypto.py` | AES-256-CBC + HMAC-SHA256 implementation used by `encrypt()` (not standard Fernet, see §3.2) |
| `CryptographyConf` | `django_cryptography/conf.py` | Derives the AES key from `CRYPTOGRAPHY_KEY` with PBKDF2 at import time |
| `GATEWAY_REGISTRY` / `CredentialField` | `products/payments/registry.py`, `base.py` | Declares each gateway's credential fields and which are secret |
| `CARRIER_REGISTRY` / `credential_fields` | `products/carriers/registry.py`, `aramex.py`, `smsa.py` | Same for carriers: `(name, label, secret, required)` tuples |
| Bridge indexes | `tenants.ChannelSessionIndex`, `tenants.WhatsAppSessionIndex` (public schema) | Map an external id (page id, bot id, supplier bridge token, SharwaConnect session) to a store schema, so a webhook that lands on the platform host can be routed. They hold **no** credentials |
| `django.contrib.auth.hashers` | Django | `make_password` / `check_password` for the owner password, staff passwords and the POS manager code |

## 3. Design

### 3.1 Three storage patterns

| Pattern | Used for | Why |
|---|---|---|
| **Encrypted at rest** (`encrypt(...)`) | credentials the platform must replay to an outside API; webhook signing secrets | the plaintext is needed later; a database dump alone must not reveal it |
| **One-way hash** | passwords, personal access tokens, POS manager code | only verification is needed; nothing can be recovered |
| **Environment only** | `SECRET_KEY`, `CRYPTOGRAPHY_KEY`, SSO private key, carrier / platform webhook verification secrets, VAPID private key, database password | platform-wide, never stored in a tenant table |

One JSON column per integration instead of one column per field: `PaymentCredential.credentials_encrypted`, `StoreAppInstallation.config_encrypted` and the two 3PL tables each hold a single encrypted JSON document, exposed to code as a `dict` property (`credentials` / `config`). Adding a gateway, carrier or channel field is a code change in its adapter, not a migration.

### 3.2 The encryption scheme (frozen format)

`django_cryptography/` is a **locally patched copy of django-cryptography 1.1** (the PyPI release imports `django.utils.baseconv`, which Django 5 removed). Its on-disk format is pinned by `products/test_cryptography_freeze.py`, because every encrypted secret in production depends on it:

```
0x80 | timestamp (8 bytes, big-endian) | IV (16 bytes) | AES-256-CBC ciphertext (PKCS7) | HMAC-SHA256 (32 bytes)
```

| Element | Value |
|---|---|
| Plaintext | `pickle.dumps(<python value>)` — for the JSON columns, the JSON string |
| AES key | `PBKDF2-HMAC-SHA256(CRYPTOGRAPHY_KEY, salt=b'django-cryptography', iterations=30000, length=32)`. The vendored `AppConf` (`proxy = True`) **replaces** `settings.CRYPTOGRAPHY_KEY` with this derived key at import time |
| HMAC key | `settings.SECRET_KEY` (raw bytes), over version + timestamp + IV + ciphertext |
| TTL | none on any field — the timestamp is never enforced |
| Start-up guard | `CRYPTOGRAPHY_KEY` has **no default**: `settings.py` raises `ImproperlyConfigured` «CRYPTOGRAPHY_KEY غير مضبوط في متغيرات البيئة. بدونه لا يمكن فك تشفير بيانات بوابات الدفع المحفوظة — لا تشغّل النظام بمفتاح مفقود أو مؤقت.» when it is missing, so a copy of the code never runs with a silent default key |

Because the value is authenticated before `pickle.loads` runs, a tampered row raises `BadSignature` instead of being unpickled.

> ⚠️ Discrepancy — the comment above `CRYPTOGRAPHY_KEY` in `config/settings.py` (lines 41-43) says it is a key "independent of `SECRET_KEY`" / code binds every encrypted value to **both**: the AES key comes from `CRYPTOGRAPHY_KEY`, but the HMAC key is `SECRET_KEY` (pinned by `test_hmac_is_bound_to_django_secret_key` in `products/test_cryptography_freeze.py`). Rotating Django's `SECRET_KEY` alone makes every stored gateway, carrier, channel, marketplace, supplier and webhook secret unreadable. Reported in official Step 08.

**Key rotation.** No re-encryption command exists. Changing either `CRYPTOGRAPHY_KEY` or `SECRET_KEY` requires a one-off script that reads every encrypted row with the old pair and writes it with the new pair, run before the new values go live. Until such a tool exists, treat both values as fixed for the life of the database; see [`../ops/environment.md`](../ops/environment.md).

### 3.3 Encrypted columns

| Model (schema) | Column | Holds |
|---|---|---|
| `PaymentCredential` (store) | `credentials_encrypted` (`encrypt(TextField)`) | one row per gateway code (`gateway_code` unique) |
| `StoreAppInstallation` (store) | `config_encrypted` | channel, marketplace, supplier, WhatsApp and Sharwa AI configuration, including tokens |
| `WebhookEndpoint` (store) | `secret` (`encrypt(CharField(100))`) | the `whsec_…` signing secret |
| `ThirdPartyLogisticsProvider` (public) | `credentials_encrypted` | the platform's **shared** carrier account |
| `ThirdPartyLogisticsClientAgreement` (public) | `credentials_encrypted` | a store's **own** carrier account (`credential_source = 'merchant_own'`) |

Migrations `products/0035`–`0037` introduced `credentials_encrypted` for gateways and encrypted the existing plaintext rows (`0036_encrypt_existing_payment_credentials`) before dropping the old column.

## 4. The secrets register

### 4.1 One row per secret type

| # | Secret | Stored in (schema) | Protection | Response shows | Write / rotate / clear |
|---|---|---|---|---|---|
| 1 | **Payment gateway credentials** — Jeeb: `merchant_id`, `base_url`, `api_key`🔒, `api_secret`🔒 · Kuraimi: `merchant_code`, `base_url`, `api_key`🔒, `api_secret`🔒 (`CredentialField(..., secret=True)`) | `PaymentCredential.credentials_encrypted` (store) | encrypted | per field: `is_secret`; secret fields `masked_hint` = `'••••' + value[-4:]` (or `'••••'` when ≤ 4 chars) and `value: null`; non-secret fields `value` (`payments_service._mask`, `_gateway_view`) | `PUT payments/gateways/<code>/credentials/`: every non-empty field replaces the stored one, an empty or absent field **keeps** it (secret or not); max 500 chars; `base_url` must be http(s) («أدخل رابطاً صحيحاً يبدأ بـ https://»); written under a row lock. There is no API to clear a single field: disable the gateway instead. Owner-only, plan feature `payment_gateways` / `local_wallets` |
| 2 | **Carrier credentials** — Aramex: `username`🔒, `password`🔒, `account_number`, `account_pin`🔒 (secret since INT-021, SC-15.4) · SMSA: `username`🔒, `password`🔒 | merchant account: `ThirdPartyLogisticsClientAgreement.credentials_encrypted` (public, `credential_source='merchant_own'`); platform account: `ThirdPartyLogisticsProvider.credentials_encrypted` (public) | encrypted | per field `is_secret`, `required`, `has_value`; `value` only for non-secret fields; **no masked hint**. The platform shared account is never shown | `PUT shipping/carriers/<code>/credentials/`: a secret left empty keeps the stored one (required and never set ⇒ «هذا الحقل مطلوب.»), max 500 chars; `credential_source: "platform_shared"` **wipes** the store's own credentials. The audit log records only `changed_fields` and the source, never a value (`shipping.carrier_credentials`). The read path `resolve_carrier_credentials` captures the store schema **before** switching to public (INT-021 fix) |
| 3 | **Social channel credentials** — Meta: `access_token`, `page_id`, `ig_business_id` · TikTok Shop: `access_token`, `shop_id` · Telegram: `bot_token`, `bot_id`, `secret_token` (webhook secret) | `StoreAppInstallation.config_encrypted` (store) + routing rows in `ChannelSessionIndex` (public: `channel_code`, `external_ref`, `schema_name`) | encrypted; the bridge row holds ids only | `has_credentials`-style booleans and display names (`page_name`, `bot_username`); **never** a token (FR-27.08) | reconnect overwrites; `disconnect()` pops every credential key, deletes the bridge rows, deactivates the app without deleting it (conversations stay readable). Owner-only |
| 4 | **Marketplace credentials** — Amazon: `refresh_token`, `selling_partner_id`, marketplace ids · Noon: `api_key`, `seller_id` | `StoreAppInstallation.config_encrypted` | encrypted | connection state, health, `connected_at`; no token | reconnect overwrites; disconnect pops `CREDENTIAL_KEYS` (`marketplaces/connection_service.py:38-43`). Permission `channels.marketplaces.manage` |
| 5 | **Supplier (dropshipping) credentials** — `api_key`, `access_token`, `refresh_token`, `client_secret`, plus the inbound `webhook_secret` and `bridge_token` (`SECRET_KEYS`, `suppliers/connection_service.py:43`) | `StoreAppInstallation.config_encrypted` + `ChannelSessionIndex(channel_code=<supplier>, external_ref=<bridge_token>)` | encrypted | `account_label`, `webhook_configured: bool`, health; no secret | **Rotate** `POST dropshipping/suppliers/<code>/webhook/rotate/`: a new `bridge_token` (24 bytes) and `webhook_secret` (32 bytes, `secrets.token_urlsafe`) replace the old ones in one transaction, the old bridge row is deleted (the old URL stops at once), and the response `{webhook_url, webhook_secret, base_url_missing}` is shown **once** with `Cache-Control: no-store`. Disconnect pops `CREDENTIAL_KEYS`, removes the bridge row, deactivates the app and the supplier location |
| 6 | **WhatsApp (SharwaConnect)** — session reference | `StoreAppInstallation.config_encrypted` + `WhatsAppSessionIndex` (public: `session_id` → `schema_name`) | encrypted; index holds ids only | `connected` state; the one-time connect link from `GET apps/whatsapp/connect-url/` is sent with `Cache-Control: no-store` | reconnect / disconnect through the app store; owner-only |
| 7 | **Outgoing webhook signing secret** `whsec_<token_urlsafe(24)>` | `WebhookEndpoint.secret` (store) | encrypted | `has_secret: bool` | returned **once** on `POST webhooks/endpoints/` and on `POST webhooks/endpoints/<pk>/rotate-secret/`; rotation replaces it immediately (no grace period — the next delivery is signed with the new secret: `X-Sharwa-Signature: t=<unix>,v1=<HMAC-SHA256(secret, "<t>.<body>")>`). Owner-only |
| 8 | **Personal access tokens** `shw_pat_<token_urlsafe(32)>` | `PersonalAccessToken.token_hash` = SHA-256 hex (store); `name`, `last_used_at`, `expires_at` (90 days, `TOKEN_TTL_DAYS`), `revoked_at`, `token_version_at_issue` | hash only — "the raw token is never stored" | list: `id`, `name`, `created_at`, `last_used_at` | raw value returned **once** on creation (`staff.manage`); refused for inactive or terminated staff («لا تُصدر مفاتيح لموظف غير نشط.»); revoke sets `revoked_at`; termination revokes all. **No route accepts a PAT today** (see [`../api/overview/auth.md`](../api/overview/auth.md), DOC-024) |
| 9 | **Staff temporary password** (10 characters, unambiguous letters + digits, `staff_service.temporary_password`) | the staff member's Django `User` password (hashed) | Django password hash | `temporary_password` returned **once** by `POST staff/` and `POST staff/<pk>/reset-password/` | reset bumps `token_version` and ends every session of that member |
| 10 | **Owner password** (dashboard login with the store WhatsApp phone) | `StoreSetting.admin_password` (store) | `make_password` | never | set at first login with the signed setup token, or reset by the WhatsApp OTP flow ([`33-otp.md`](33-otp.md)); `check_password` runs even for a wrong phone to equalise timing |
| 11 | **Conversions API tokens** — `meta_conversions_api_token`, `tiktok_events_api_token` | `TrackingSettings` (store) — plain `CharField(255)` | **not encrypted**; write-only through the API | `has_meta_conversions_api_token`, `has_tiktok_events_api_token` | `PATCH store/tracking/`: absent ⇒ untouched, empty ⇒ **keeps** the stored token, `null` ⇒ **clears** it, < 10 chars «الرمز أقصر من المعتاد — انسخه كاملاً من مدير الأعمال.», > 255 «الرمز أطول من المسموح (255).». `/config/` exposes the public pixel ids only (`TrackingApiTests.test_config_exposes_public_ids_only`) |
| 12 | **POS manager code** (4–8 digits) | `StoreSetting.pos_manager_code_hash` (store) | `make_password` — "the raw code is never stored" | never | **no API**: set or cleared by `python manage.py set_pos_manager_code <code> --schema <schema>` / `--clear`. Checked with `check_password`; 5 wrong codes lock the register 15 min (`429` «أُقفل رمز المدير مؤقتاً بعد 5 محاولات خاطئة. حاول بعد 15 دقيقة أو أرسل طلب اعتماد.»). When no code is set: `400` «لم يُعيَّن رمز مدير لنقطة البيع بعد — أرسل طلب اعتماد للمدير.», except under `DEBUG`, where a fixed development code (`DEBUG_MANAGER_CODE`) is accepted |
| 13 | **Sharwa AI SSO signing key** | environment: `SHARWA_AI_SSO_PRIVATE_KEY_PEM` (RSA ≥ 2048 bits, `\n` accepted literally), `SHARWA_AI_SSO_KID`, `SHARWA_AI_JWT_ISSUER`, `SHARWA_AI_JWT_AUDIENCE`, `SHARWA_AI_SSO_TTL_S` (60–3600, default 900) | never leaves the process; never logged | the **token** is returned once by `POST apps/sharwa-ai/console-token/` (`{console_url, token, expires_in}`, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, owner-only); the public key is published at `/.well-known/sharwa-ai-jwks.json` (platform host) | rotation: new key with a new `kid`; the previous public key stays in the JWKS through `SHARWA_AI_SSO_PREVIOUS_PUBLIC_KEY_PEM` + `SHARWA_AI_SSO_PREVIOUS_KID` until its longest-lived token has expired. Missing configuration ⇒ `503` «الدخول الموحد إلى لوحة شروه AI غير مهيأ بعد.» |
| 14 | **Sharwa AI console URL** | environment `SHARWA_AI_CONSOLE_URL` | not a secret, but required | `console_url` in the token response | missing ⇒ `503` «رابط لوحة شروه AI غير مضبوط بعد (SHARWA_AI_CONSOLE_URL).» |

🔒 = declared secret by the adapter (`secret=True` / third tuple element `True`).

### 4.2 Platform secrets kept in the environment

Names only; values are set per environment ([`../ops/environment.md`](../ops/environment.md)).

| Setting | Used for | Failure when missing |
|---|---|---|
| `SECRET_KEY` | Django signing, sessions, CSRF, **and the HMAC of every encrypted column** (§3.2) | start-up fails (`os.environ['SECRET_KEY']`) |
| `CRYPTOGRAPHY_KEY` | AES key derivation for encrypted columns | start-up fails (`ImproperlyConfigured`) |
| `DB_PASSWORD` | PostgreSQL | start-up fails |
| `CARRIER_ARAMEX_SECRET`, `CARRIER_SMSA_SECRET`, `CARRIER_SHARWA_SHIP_SECRET` (`settings.CARRIER_WEBHOOK_SECRETS`) | one shared secret **per carrier** for verifying inbound carrier webhooks (`X-Carrier-Signature`, `api.views.CarrierWebhookView`) — leaking or rotating one does not affect the others | no default: that carrier's webhooks are refused (no signature can match) |
| `PLATFORM_WEBHOOK_SECRET` (+ `SHARWA_AI_WEBHOOK_URL`) | HMAC-SHA256 signature of the **outgoing** cart events published to the Sharwa AI engine; must equal the engine's value | either one missing ⇒ the publisher is a no-op |
| `VAPID_PRIVATE_KEY` (+ `VAPID_PUBLIC_KEY`) | Web Push signing (M44) | default empty — pushes cannot be signed |
| `SHARWA_AI_SSO_*`, `SHARWA_AI_CONSOLE_URL` | row 13–14 above | `503` on the console-token route |
| `SENTRY_DSN` | error reporting | reporting off |

### 4.3 Responses that carry a secret once

| Route | Field | `Cache-Control: no-store` set by Django |
|---|---|---|
| `POST dropshipping/suppliers/<code>/webhook/rotate/` | `webhook_secret`, `webhook_url` | yes (`views_dropshipping.py:139`) |
| `POST apps/sharwa-ai/console-token/` | `token` | yes, plus `Referrer-Policy: no-referrer` |
| `GET apps/whatsapp/connect-url/` | one-time SharwaConnect link | yes |
| `POST webhooks/endpoints/`, `POST webhooks/endpoints/<pk>/rotate-secret/` | `secret` | **no** |
| `POST staff/<pk>/tokens/` | `token` | **no** |
| `POST staff/`, `POST staff/<pk>/reset-password/` | `temporary_password` | **no** |

Through the dashboard the browser is still protected: the BFF stamps `no-store` on every response it forwards ([`20-bff.md#liveormock`](20-bff.md#liveormock)). A client calling `/api/v1/` directly gets no such header on the last three rows (§8).

## 5. Invariants

| Invariant | Enforced by |
|---|---|
| A secret field is never serialised back | per-service view builders: `payments_service._gateway_view` (`value: None if f.secret`), `shipping_service.carrier_view`, channel / marketplace / supplier `connection_view`, `webhook_service.endpoint_view` (`has_secret`), `integrations_service` (`has_*`), `staff_service._token_view` |
| Saving a form with an empty secret never erases it | gateways, carriers, CAPI tokens: empty ⇒ keep; only an explicit action clears (carrier `platform_shared`, CAPI `null`, disconnect) |
| Credential changes are audited without values | carrier `write_audit_log(... after={'credential_source', 'changed_fields'})`; staff token events log the token **name** only |
| An encrypted value is authenticated before it is decoded | `FernetBytes.decrypt` verifies the HMAC before `pickle.loads` |
| The process refuses to start without an encryption key | `config/settings.py` `ImproperlyConfigured` |
| Raw access tokens, passwords and the POS code are unrecoverable | SHA-256 (`token_hash`) and Django password hashes |
| The schema in a bridge row comes from the server, never from input | `register_channel_session(..., connection.schema_name)` |

## 8. Failure modes and fixes

| Failure | Symptom | Cause | Handling / fix |
|---|---|---|---|
| `SECRET_KEY` rotated | every integration fails to decrypt (`BadSignature`): gateways disabled, carriers unreachable, channels disconnected | HMAC key of the encrypted columns is `SECRET_KEY` (§3.2) | **Do not rotate** without a re-encryption script. Pinned by `test_hmac_is_bound_to_django_secret_key` |
| `CRYPTOGRAPHY_KEY` lost or changed | same as above | AES key derives from it | same |
| Aramex `account_pin` echoed in responses (before INT-021) | the PIN was readable in the carrier form | it was declared non-secret | **Fixed** in INT-021 (SC-15.4): `secret=True` |
| Merchant carrier credentials never used (before INT-021) | shipments used the platform account even for `merchant_own` | `resolve_carrier_credentials` read `connection.schema_name` inside `schema_context('public')` | **Fixed** in INT-021 (schema captured before the switch). The same bug class survives in two waybill writers, see [`10-multi-tenancy.md#schemas`](10-multi-tenancy.md#schemas) |
| Conversions API tokens readable from a database dump | Meta / TikTok server tokens in plaintext | `TrackingSettings` uses plain `CharField`s | **Open** (§9) |
| One-time secrets without `no-store` on direct API calls | an intermediary could cache the body | Django sets `no-store` only on three of six one-time responses | **Open**, mitigated by the BFF's blanket `no-store` |
| A bridge row re-pointed to another store | inbound webhooks for an external id go to the store that linked it last | `register_channel_session` uses `update_or_create` on `(channel_code, external_ref)` by design, so re-linking moves the route | Intended (a store re-linking the same page or bot takes over its webhooks); linking requires the credential itself (page token, bot token, supplier key) |

## 9. Open items

- **Encrypt the Conversions API tokens.** `meta_conversions_api_token` and `tiktok_events_api_token` are the only third-party credentials stored in clear text; wrapping them with `encrypt()` needs a data migration like `0036`.
- **Add `Cache-Control: no-store`** to the webhook create / rotate, PAT create, staff create and reset-password responses (§4.3).
- **Write a key-rotation command** that re-encrypts every encrypted column under a new `CRYPTOGRAPHY_KEY` / `SECRET_KEY` pair, and document it in an ops runbook.
- **No API sets the POS manager code**; merchants depend on an operator running `set_pos_manager_code`. Decide whether the owner should set it from the dashboard (a code change).
- **Gateway fields cannot be cleared individually** (empty keeps the stored value). Acceptable while disabling the gateway is the way to stop using it.
- **Personal access tokens are issued but not accepted** by any authentication class. Either wire them in or stop issuing them ([`../api/overview/auth.md`](../api/overview/auth.md)).

## 10. Related pages

- [`30-security.md`](30-security.md) — identities, sessions, CSRF
- [`31-authorization.md`](31-authorization.md) — who may read or change each secret (owner-only areas)
- [`33-otp.md`](33-otp.md) — OTP codes and HMACs
- [`35-outbound-and-redirect-safety.md`](35-outbound-and-redirect-safety.md) — webhook delivery safety, SSO handshake in the browser
- [`37-audit.md`](37-audit.md) — redaction in logs and audit rows
- [`10-multi-tenancy.md`](10-multi-tenancy.md) — public vs store schema placement
- API: [`../api/overview/auth.md`](../api/overview/auth.md) · [`../api/overview/conventions.md#headers`](../api/overview/conventions.md#headers)
- Ops: [`../ops/environment.md`](../ops/environment.md)
