# Inbound webhook receivers — reference (engineering)

> **Source**: DOC-221 · INT-021, INT-030, INT-031, INT-037, INT-039, INT-040, INT-041, INT-048 · inventory Domains 11, 13, 14, 16
> **Live key**: *Django-first, no switch* — these are server-to-server endpoints; the Next.js frontend never calls them.
> **Django provider**: `config/urls_public.py` (routes) · `tenants/webhooks.py` (Kuraimi, SharwaConnect) · `tenants/webhooks_ai.py` (Sharwa AI) · `tenants/webhooks_channels.py` (Meta, TikTok Shop, Telegram) · `tenants/webhooks_suppliers.py` (suppliers) · `tenants/webhook_replay.py` (replay guard) · `api/views.py::CarrierWebhookView` (carriers) · `products/tasks/{shipping,channels,suppliers}.py` (downstream tasks) · `tenants/console_service.py` (dead-letter console)
> **Frontend contract**: none for the receivers. The dead-letter console of [§5](#dlq) is the platform console (`sharwa-frontend/src/features/platform-admin`, INT-030).
> **Tests**: `sharwa_saas/tenants/test_webhook_replay.py` (24 tests — replay guard, SharwaConnect and Sharwa AI). Tests of the other receivers were not in the sources read for this page.
> **Last verified against code**: 2026-10-27 (step 28)

<a id="overview"></a>

## 1. Overview

Sharwa receives events from outside systems: a bank crediting the escrow account, shipping carriers, the WhatsApp gateways, Meta, TikTok Shop, Telegram bots and dropshipping suppliers. This page lists every such receiver with its **URL, the schema it runs in, how it authenticates the caller, how it avoids processing the same event twice, and which task does the work**. It is for engineers who maintain or integrate with the receivers. The opposite direction — events Sharwa sends to merchants — is in [`webhooks-outgoing.md`](webhooks-outgoing.md).

| # | Receiver | Method and path | Authentication | Replay / idempotency | Downstream |
|---|---|---|---|---|---|
| 1 | Kuraimi bank top-up | `POST /webhooks/kuraimi/topup/` | static token `X-Kuraimi-Token` | `bank_transaction_id` unique | none (synchronous wallet credit) |
| 2 | Carriers | `POST /api/v1/webhooks/carrier/<carrier_code>/` | shared secret `X-Carrier-Signature` per carrier | idempotency key → `ShipmentEvent` | `process_carrier_webhook_event` |
| 3 | SharwaConnect (WhatsApp) | `POST /webhooks/sharwaconnect/` | HMAC-SHA256 of the body, `X-SharwaConnect-Signature` | ±300 s window + nonce | none (status) / `process_inbound_channel_message` (messages) |
| 4 | Sharwa AI — session status | `POST /webhooks/sharwa-ai/session-status/` | HMAC-SHA256 of `ts.body`, `X-Signature` + `X-Timestamp` | ±300 s window + nonce | none (`record_status`) |
| 5 | Sharwa AI — inbound message | `POST /webhooks/sharwa-ai/inbound-message/` | same as 4 | same, nonce = `message_id` | signal `incoming_whatsapp_message` |
| 6 | Meta (Facebook / Instagram) | `POST /webhooks/meta/` | HMAC-SHA256 of the body, `X-Hub-Signature-256` | none at the door; unique keys downstream | `dispatch_instagram_comment_auto_reply`, `ingest_channel_order_task`, `process_inbound_channel_message` |
| 7 | TikTok Shop | `POST /webhooks/tiktok-shop/` | HMAC-SHA256 of the body, `X-Tt-Webhook-Signature` | none at the door; unique link downstream | `ingest_channel_order_task` |
| 8 | Telegram bot | `POST /webhooks/telegram/<bot_id>/` | per-bot secret token `X-Telegram-Bot-Api-Secret-Token` | none at the door | `dispatch_telegram_start`, `dispatch_telegram_callback`, `process_inbound_channel_message` |
| 9 | Dropshipping suppliers | `POST /webhooks/suppliers/<supplier_code>/<bridge_token>/` | per-store HMAC-SHA256 of the body (CJ: `CJ-Signature`) | unique `(supplier_code, event_id)` | `process_supplier_webhook_task` |

All paths except #2 are on the **platform host** (the public schema). Path #2 is in `api/urls.py` and the same `api/v1/` tree is mounted on the platform host in `config/urls_public.py:84`.

<a id="common"></a>

## 2. What every receiver has in common

### 2.1 Where they run: the public schema, then one hop into the tenant

A provider knows only the platform domain. Every receiver therefore starts in the **public schema**, authenticates the call, finds the owning store through a **public index table**, and only then switches into that store's schema (`schema_context`). The schema name is **never** read from the request.

| Index (public schema) | Key → value | Used by |
|---|---|---|
| `tenants.WhatsAppSessionIndex` | `session_id` (unique) → `schema_name` | #3, #4, #5 |
| `tenants.ChannelSessionIndex` | `(channel_code, external_ref)` (unique) → `schema_name` | #6 (`meta_social_commerce`, external id = page/Instagram id), #7 (`tiktok_shop`, `shop_id`), #8 (`telegram_bot`, bot id), #9 (supplier code, bridge token) |
| `tenants.WaybillRegistry` | `waybill_number` (unique) → `tenant_schema_name`, `carrier_code` | #2 |

Rows are written inside the store's own flow when the link is completed (the `schema_name` comes from the connection, never from user input). The writers for the WhatsApp, Meta, TikTok and Telegram links are in `products/views/apps.py` and the channel services, which were not part of the sources read; the supplier writer is `register_channel_session` in `connection_service.py`.

### 2.2 Order of checks

1. **Authenticate on the raw bytes before parsing** — secret/token missing or wrong → reject. A secret that is not configured in the environment is never treated as "accept all".
2. Parse the JSON.
3. (#3, #4, #5) **Replay guard** — only after a valid signature, so unauthenticated callers cannot burn nonces.
4. Look up the index; an unknown id is answered **`200`** with a status text such as `unknown_session_ignored` / `unknown_channel_ignored`, not `404`, so the provider does not retry forever for a link Sharwa no longer knows.
5. Do the minimum inside the request (record, set a status, send a signal or `.delay()` a task) and answer fast.

### 2.3 The replay guard (`tenants/webhook_replay.py`)

Used by SharwaConnect and Sharwa AI only.

| Rule | Value |
|---|---|
| Time window | `REPLAY_WINDOW_S = 300` — the timestamp must be within ±300 s of the server clock; seconds or milliseconds are accepted (values above 10^11 are treated as milliseconds) |
| Nonce | `cache.add` (atomic) of `webhook-nonce:<namespace>:<nonce>`; lifetime `REPLAY_NONCE_TTL_S = 600` s (twice the window, so a request that arrived early cannot be repeated late) |
| Rejections | `403 {"ok": false, "error": "stale_or_missing_timestamp"}` · `400 missing_event_id` · `409 replay_detected` · `503 replay_guard_unavailable` (the cache is down: **fail closed**, the provider retries) |
| Namespaces | `sharwaconnect`, `sharwa_ai.session_status`, `sharwa_ai.inbound_message` |

The timestamp is only meaningful if it is signed: SharwaConnect carries it as the JSON field `timestamp` (inside the signed body), Sharwa AI as the header `X-Timestamp` (inside the signed string).

### 2.4 Secrets (environment only)

| Variable | Used by |
|---|---|
| `KURAIMI_WEBHOOK_TOKEN`, `SHARWA_ESCROW_ACCOUNT` | #1 |
| `CARRIER_ARAMEX_SECRET`, `CARRIER_SMSA_SECRET`, `CARRIER_SHARWA_SHIP_SECRET` (setting `CARRIER_WEBHOOK_SECRETS`) | #2 |
| `WA_GATEWAY_WEBHOOK_SECRET` | #3 |
| `SHARWA_AI_GATEWAY_WEBHOOK_SECRET` | #4, #5 |
| `META_APP_SECRET` | #6 |
| `TIKTOK_APP_SECRET` | #7 |
| *(per bot, in the encrypted installation config)* `secret_token` | #8 |
| *(per store, in the encrypted installation config)* `webhook_secret`, `bridge_token` | #9 |
| `SUPPLIER_WEBHOOK_BASE_URL` (fallback `TELEGRAM_WEBHOOK_BASE_URL`) | URL shown by the rotate route of #9 |

If the secret of #1 is missing the receiver answers `503 webhook_not_configured`; for #3–#7 a missing secret simply fails the signature check (`403`), so a misconfigured environment looks like a bad signature.

<a id="bank"></a>

## 3. Receivers

### 3.1 Kuraimi bank webhook — Sharwa Pay top-ups (#1)

* **URL**: `POST /webhooks/kuraimi/topup/` (`kuraimi_topup_webhook`, public schema, `@csrf_exempt`, POST only).
* **Auth**: header `X-Kuraimi-Token` compared in constant time with `KURAIMI_WEBHOOK_TOKEN`. No signature, no timestamp, no replay guard — the token is the only credential.
* **Body** (JSON): `transaction_id`, `escrow_account`, `customer_note` (the customer's phone number), `amount`, optional `currency` (default `SAR`, must be one of the wallet currencies).
* **Processing**, in order: token → JSON → required fields → positive `Decimal` amount → known currency → `escrow_account` must equal `SHARWA_ESCROW_ACCOUNT` → duplicate check on `transaction_id`.
  * **Wallet found** (the cleaned `customer_note` equals a wallet's `customer_phone`): one atomic block creates a `SharwaPayTopupRequest` with `status = approved`, `bank_name = «كريمي»`, `reviewed_at` and **`credited_at` already stamped**, then credits the wallet with reason `topup_auto` and description «شحن آلي - عملية {transaction_id}».
  * **No wallet**: creates a `pending` request with `wallet = NULL`, `bank_name = «كريمي»`, `claimed_phone` (the received number, up to 20 characters, INT-031) and `rejection_reason = «رقم الهاتف غير مسجَّل — يتطلب مراجعة يدوية وربط بمحفظة صحيحة.»`. The platform operator links it to a wallet by hand in the console (see the Sharwa Pay top-up routes of M20).
* **`topup_auto` and the double-credit guard (INT-048)**: `credited_at` is the only guard against crediting twice. The webhook stamps it itself because it credits in the same transaction; an admin who later saves the approved request finds `credited_at` set and nothing is credited again. Requests that follow the other path — approved by an operator, credited by `SharwaPayTopupRequest.apply_credit_if_approved()` — take the reason from the data: **`topup_auto` when the request has a bank `transaction_id` and no receipt image, otherwise `topup_manual`**. The method re-reads the row with `select_for_update()` and returns without crediting if `status` is not `approved`, `credited_at` is set, or there is no wallet.
* **Idempotency**: `bank_transaction_id` is `UNIQUE`. An existing id answers `200 {"ok": true, "status": "duplicate_ignored"}`; a lost race (`IntegrityError`) gives the same answer, so the bank may retry safely.
* **Responses**: `200 {"ok": true}` · `403 {"ok": false, "error": "Forbidden"}` · `503 webhook_not_configured` · `400` with `invalid_json`, `missing_fields`, `invalid_amount`, `invalid_currency`, `invalid_escrow_account` or `internal_error` (any unexpected exception is logged and answered `400`).
* **Downstream task**: none; the credit is synchronous. The URL `internal/kuraimi-simulator/` is an admin-only simulator of this notification, not a receiver.

### 3.2 Carrier webhooks (#2)

* **URL**: `POST /api/v1/webhooks/carrier/<carrier_code>/` (`CarrierWebhookView`, no session or permission classes). `carrier_code` is one of the keys of `CARRIER_WEBHOOK_SECRETS`: `aramex`, `smsa`, `sharwa_ship`.
* **Auth**: header `X-Carrier-Signature` must equal the configured secret of that carrier (`hmac.compare_digest`). It is a **shared secret, not an HMAC of the body**; the view's own docstring says a full per-carrier HMAC is later work. An unknown carrier or a carrier without a configured secret answers `401 {"detail": "غير مصرح."}`.
* **Body** (JSON): `waybill_number` (required), `status` (required, the target shipment status), `event_time` (ISO-8601, defaults to now), `event_id` (optional carrier event id).
* **Validation**: missing `waybill_number` or `status` → `400 {"detail": "waybill_number وstatus إلزاميان."}`.
* **Idempotency key** — `products.tasks.shipping.carrier_idempotency_key`: `wh:<carrier>:<event_id>` when the carrier sends `event_id`, otherwise `wh:<carrier>:<waybill>:<status>:<event_time>`. The same function is used by the console retry ([§5](#dlq)), so a replayed dead-letter event carries the identical key and cannot apply a transition twice.
* **Processing**: the view calls `process_carrier_webhook_event.delay(waybill, status, carrier_code, '', payload, event_time, key)` and answers **`202 {"received": true}`** at once.
* **Task** `products.tasks.process_carrier_webhook_event` (Celery, automatic retry for transient errors):
  1. the store is found in `WaybillRegistry` (public) — an unknown waybill raises `CarrierWebhookPermanentError`;
  2. inside the store's schema the `ShipmentOrder` is read — not yet visible (creation race) raises `CarrierWebhookTransientError`;
  3. `carrier_code` is stamped on the shipment if it differs;
  4. `apply_shipment_transition(..., source='webhook', actor_type='carrier', actor_id=<carrier>, idempotency_key=key, event_time=…)`. A repeated key returns the earlier `ShipmentEvent` with no side effect; an invalid transition is **recorded as a rejected event**, not raised.
  * Transient errors retry with exponential backoff (`retry_backoff`, cap 120 s, jitter, `max_retries = 8`).
* **Dead letter (INT-030)**: when the task fails for good (permanent error, or transient errors beyond 8 retries) the `_WebhookDLQTask.on_failure` hook writes a `tenants.PendingWebhookEvent` in the public schema with the waybill, carrier, store schema, raw payload and error text. The platform console lists, retries or discards it — see [§5](#dlq).

### 3.3 SharwaConnect (WhatsApp gateway) (#3)

* **URL**: `POST /webhooks/sharwaconnect/` (`sharwaconnect_webhook`). One endpoint for all event types, dispatched on the JSON field `event`.
* **Auth**: header `X-SharwaConnect-Signature` = lowercase hex `HMAC-SHA256(WA_GATEWAY_WEBHOOK_SECRET, raw body)`. Secret unset → every call fails with `403 {"ok": false, "error": "invalid_signature"}`.
* **Replay**: JSON field `timestamp` (signed) within ±300 s; nonce `msg:<message_id>` for a `message.received` event that has a `message_id`, otherwise `sig:<signature>`. Successive `message.status` events of one message (delivered, then read) are therefore **not** treated as replays.
* **Routing**: JSON field `session_id` → `WhatsAppSessionIndex` → schema. Missing → `400 missing_session_id`; unknown → `200 {"ok": true, "status": "unknown_session_ignored"}`.
* **Events** (all run inside the store's schema; payload field names are marked *assumed* in the code, pending confirmation with the gateway team):

| `event` | Effect |
|---|---|
| `message.status` | sets `AppUsageLog.status` (`delivered`, `read` or `failed`) on the row whose `gateway_message_id` equals `message_id`; other values are ignored |
| `session.status` | writes `wa_session_status` (upper-cased `status`) into the config of the `whatsapp` installation; on `DISCONNECTED` or `SESSION_EXPIRED` it also removes `connected_phone_number`. It never changes `is_active` — that is the merchant's choice |
| `message.received` | needs `from_phone`; sends the signal `incoming_channel_message` (`channel_code='whatsapp'`, `external_contact_id=from_phone`, `message_body=text`, `external_message_id=message_id`, `media_object_key`, `media_type`, `sender_name`) |
| anything else | logged, answered `200 {"ok": true}` |

* **Downstream task**: `handle_incoming_channel_message` (the only receiver of the signal, `products/signals_channels.py`) calls `process_inbound_channel_message.delay(...)` ([§4](#sink)). Status events have no task.
* **Response**: `200 {"ok": true}`; `403` bad signature; `400 invalid_json`; the replay errors of [§2.3](#common).

### 3.4 Sharwa AI — session status (#4)

* **URL**: `POST /webhooks/sharwa-ai/session-status/` (`sharwa_ai_session_status_webhook`, `tenants/webhooks_ai.py`). This gateway is independent of SharwaConnect: the support-bot traffic comes only from Sharwa AI.
* **Auth**: headers `X-Signature` and `X-Timestamp`; `X-Signature` = hex `HMAC-SHA256(SHARWA_AI_GATEWAY_WEBHOOK_SECRET, "<X-Timestamp>." + raw body)`. Either header missing, or the secret unset → `403 invalid_signature`.
* **Replay**: `X-Timestamp` (signed) ±300 s; nonce `sig:<X-Signature>`, namespace `sharwa_ai.session_status`.
* **Routing**: `session_id` in the body → `WhatsAppSessionIndex` (same table as SharwaConnect).
* **Effect**: finds the `sharwa_ai` installation in the store's schema and calls **`record_status(config, status, phone=connected_phone_number)`** — the same function the status poll uses (`sharwa_ai_api_service.py`). Statuses `CONNECTED`, `ACTIVE`, `READY`, `OPEN`, `AUTHENTICATED` are stored as `CONNECTED`; on the first connection `ai_connected_at` is set and `connected_phone_number` is stored (INT-041); a failure status (`DISCONNECTED`, `SESSION_EXPIRED`, `LOGGED_OUT`, `BANNED`, `FAILED`, `ERROR`) removes both. An absent installation is ignored.
* **Response**: `200 {"ok": true}`.

### 3.5 Sharwa AI — inbound message (#5)

* **URL**: `POST /webhooks/sharwa-ai/inbound-message/` (`sharwa_ai_inbound_message_webhook`). Same signature, headers, routing and replay window as #4; namespace `sharwa_ai.inbound_message`, and the nonce is `msg:<message_id>` when the body has one, otherwise `sig:<signature>`.
* **Body**: `session_id`, `from` (customer phone), `message_text`, `message_id`, optional `media_object_key`, `media_type`.
* **Effect**: inside the store's schema, if the `sharwa_ai` installation is **not effectively active** (inactive or subscription expired) the call is recorded as an `AppUsageLog` row (`inbound_message_ignored`, status `skipped`) and nothing else happens. Otherwise it sends the signal `incoming_whatsapp_message` (`products/signals_chatbot.py`) with the installation, the phone, the text, `gateway_message_id`, the time and the media fields.
* **Response**: `200 {"ok": true}` in both cases.

### 3.6 Meta — Facebook and Instagram (#6)

* **URL**: `POST /webhooks/meta/` (`meta_channel_webhook`).
* **Auth**: header `X-Hub-Signature-256: sha256=<hex>` where hex = `HMAC-SHA256(META_APP_SECRET, raw body)`. One app secret for the whole platform. Not `sha256=`-prefixed or secret unset → `403 invalid_signature`.
* **Routing**: the payload's `object` must be `page` or `instagram`; the page or Instagram account id is `entry[0].id`; looked up in `ChannelSessionIndex(channel_code='meta_social_commerce')`. Unrecognised payload → `200 unrecognized_payload`; unknown id → `200 unknown_channel_ignored`.
* **Three independent extractors** run on the same payload, each enqueuing work only (no processing in the request):

| Detected | Task or signal | `Conversation.source_platform` |
|---|---|---|
| Instagram comment: `entry[].changes[]` with `field = "comments"` (`text`, `from.id`) | `dispatch_instagram_comment_auto_reply.delay(schema, comment_text, commenter_ig_id)` — keyword auto-reply, retried on `ChannelClientError` (up to 5) | — |
| Commerce order: `changes[]` with `field = "commerce_orders"` (format **assumed**) | `ingest_channel_order_task.delay(schema, 'meta_social_commerce', order)` | — |
| Chat message: `entry[].messaging[]`, echoes skipped | signal `incoming_channel_message` → `process_inbound_channel_message` | `instagram` if `object == "instagram"`, otherwise `facebook` (INT-037) |

* **Response**: `200 {"ok": true}`.

### 3.7 TikTok Shop (#7)

* **URL**: `POST /webhooks/tiktok-shop/` (`tiktok_shop_channel_webhook`).
* **Auth**: header `X-Tt-Webhook-Signature` = hex `HMAC-SHA256(TIKTOK_APP_SECRET, raw body)`. The header name and format are marked *assumed* in the code, pending the official documentation.
* **Routing**: `shop_id` (top level or under `data`) → `ChannelSessionIndex(channel_code='tiktok_shop')`.
* **Effect**: if `data.order_id` and `data.line_items` (or `items`) are present, `ingest_channel_order_task.delay(schema, 'tiktok_shop', order)`. Nothing else is extracted: TikTok has no chat path here.
* **Response**: `200 {"ok": true}` (or `unrecognized_payload` / `unknown_channel_ignored`).

### 3.8 Telegram bots (#8)

* **URL**: `POST /webhooks/telegram/<bot_id>/` (`telegram_channel_webhook`). The bot id in the path is the routing key.
* **Auth**: each bot has its own `secret_token` (set when the Telegram webhook is registered) stored encrypted in the installation config. The header `X-Telegram-Bot-Api-Secret-Token` must match it (`compare_digest`); empty or wrong → `403 invalid_secret`. The index and the installation are looked up first (to find the secret); an unknown bot or a missing installation answers `200 unknown_channel_ignored`.
* **Effect** (after authentication and JSON parsing): `callback_query` (inline button) → `dispatch_telegram_callback.delay(schema, chat_id, callback_query_id, callback_data)`; a text starting with `/start` → `dispatch_telegram_start.delay(schema, chat_id)`; any other message with text, caption or a photo, document, voice or video → signal `incoming_channel_message` (`channel_code='telegram_bot'`, `external_contact_id=str(chat_id)`, `external_message_id=str(message_id)`). Media are flagged by `media_type` only; no download link is built yet.
* **Response**: `200 {"ok": true}`.

### 3.9 Dropshipping supplier webhooks (#9)

* **URL**: `POST /webhooks/suppliers/<supplier_code>/<bridge_token>/` (`supplier_webhook`). `bridge_token` is a random per-store token, the routing key.
* **Which suppliers**: only adapters with `supports_webhooks = True` — in the sources read, CJ (`cj`) and the test double. Otherwise `404 unknown_supplier` or `404 webhooks_not_supported`.
* **Auth**: the store's own secret `webhook_secret` (from the installation config). CJ verifies the header `CJ-Signature`, with or without a `sha256=` prefix, as `HMAC-SHA256(webhook_secret, raw body)` in hex. A token of store A signed with the secret of store B fails with `401`. A wrong or missing signature → `401 invalid_signature`, plus an audit row (`signature_valid = false`, event id `invalid:<uuid>`, no payload), capped at **50 per supplier per hour**.
* **Order**: supplier known → index lookup (unknown token: `200 unknown_channel_ignored`) → body size at most 1 MiB (`413 payload_too_large`) → installation must be effectively active (`200 inactive_ignored`) → signature → parse (`400 unparseable`).
* **Idempotency**: the model `SupplierWebhookEvent` has a unique constraint on `(supplier_code, event_id)`. Each event of the call (**at most 200**; the rest are dropped) is inserted; a duplicate is counted, not an error. The answer is `200 {"ok": true, "accepted": n, "duplicates": m}` so the supplier does not resend forever.
* **Downstream**: for each accepted row `enqueue_supplier_webhook` queues `products.tasks.process_supplier_webhook_task(schema, supplier_code, event_pk)`. The task takes a per-event lock, skips rows already processed, and runs `process_webhook_event`; a "rate-limited or busy" signal reschedules up to `WEBHOOK_MAX_ATTEMPTS = 5` (then «المورد مشغول — استنفدت محاولات المعالجة.»); an authentication failure marks the connection `reauth_required` and opens the circuit. On success the raw payload is cleared. A 5-minute Beat job re-queues valid, unprocessed rows (without an error) older than 5 minutes and newer than one day; the payload of rows is cleared after 7 days and rows are deleted after 90 days.
* **CJ event types** (`parse_webhook`): `STOCK`/`INVENTORY` → `inventory` (list of `vid` + stock), `PRODUCT` → `product` (`pid`), `ORDER` → `order`, anything else → `unknown`. The event id is the message's `messageId` or `id`.
* **Getting the URL and secret — `POST /api/v1/dropshipping/suppliers/<code>/webhook/rotate/`** (INT-039): generates a new bridge token (`token_urlsafe(24)`) and a new secret (`token_urlsafe(32)`) together, unregisters the old token **at once** and registers the new one. The response — always with `Cache-Control: no-store` — is `{"webhook_url": "…", "webhook_secret": "…", "base_url_missing": false}`; the secret is shown **once** and is not stored in the session or logs. `webhook_url` is the platform base URL (`SUPPLIER_WEBHOOK_BASE_URL`) plus the path; if no base URL is configured only the path is returned and `base_url_missing` is `true`. Errors are `409` with «اربط المورد أولاً ثم فعّل الإشعارات الفورية.» (supplier not connected) or «هذا المورد لا يرسل إشعارات فورية — المزامنة الدورية تكفي.» (adapter without webhooks). The access gates of this route belong to the dropshipping API page, which was not read for this one.

<a id="sink"></a>

## 4. The shared chat sink — `process_inbound_channel_message`

SharwaConnect (#3), Meta (#6) and Telegram (#8) deliver chat messages through the Django signal `incoming_channel_message` (`products/signals_channels.py`). Its single receiver `handle_incoming_channel_message` ignores a call with a missing `schema_name`, `channel_code` or `external_contact_id` and otherwise calls `process_inbound_channel_message.delay(...)` (Celery queue `default`). The task, inside the store's schema:

1. If the channel's installation is not effectively active: writes an `AppUsageLog` row `skipped` and stops (no conversation, no message).
2. Gets or creates the `Conversation` for `(channel_code, external_contact_id)` (a unique constraint settles races); `source_platform` is stored on creation.
3. For a new conversation on a channel that has a welcome template, sends the welcome message through `dispatch_channel_message`.
4. Creates the inbound `Message`. **Duplicate protection**: `external_message_id` is unique; a repeat raises `IntegrityError` inside a savepoint and the task returns quietly, so a resent webhook creates no second message and no second unread count.
5. If the message has a remote media URL and no stored object key, queues `upload_inbound_channel_media_task`.
6. If the text matches an active keyword trigger, sends the auto-reply through the same dispatch path.

<a id="dlq"></a>

## 5. Failed carrier events — the dead-letter console (INT-030)

`tenants.PendingWebhookEvent` (public schema) holds carrier events whose task failed for good: `waybill_number`, `tenant_schema_name`, `carrier_code`, `payload`, `error_detail`, `attempts`, `status` (`pending`, `resolved`, `discarded`), `created_at`, `resolved_at`. It is shown in the platform console (public schema only; `404` on a store host).

| Route | Purpose |
|---|---|
| `GET /api/v1/platform/webhook-events/?status&source&page&page_size` | List newest first. `status` ∈ `pending`, `resolved`, `discarded`; `source` filters on the carrier code. Each row: `id`, `source`, `event_type` (the payload's `status`, `event_type` or `event`), `schema_name`, `store_name`, `store_missing`, `status`, `reason`, `payload` (pretty JSON text), `attempts`, `received_at`, `resolved_at` |
| `POST /api/v1/platform/webhook-events/<id>/retry/` | Re-runs `process_carrier_webhook_event` **synchronously** with the same arguments and the same idempotency key. Success → `resolved`; failure → stays `pending`, `attempts` + 1, `error_detail` updated, `400` |
| `POST /api/v1/platform/webhook-events/<id>/discard/` | Marks the row `discarded` |

Both actions require the **platform owner** (superuser); an operator can read but not write (`OWNER_ONLY` «هذا الإجراء لمالك المنصة فقط.»). Each action writes an audit entry (`webhook_event.retry` / `webhook_event.discard`). Messages: success «أُعيدت معالجة الحدث بنجاح.» and «تم تجاهل الحدث.»; `409` «الحدث غير موجود أو تم التعامل معه مسبقاً.» for a row that is missing or no longer `pending`; `404` «الإجراء غير موجود.» for another action word; retry refused with «المتجر لم يعد موجوداً — التجاهل فقط.» (the store was deleted) or «الحدث بلا حالة مستهدفة في حمولته — التجاهل فقط.» (no `status` in the payload).

Only the Celery task of the **carrier** receiver writes to this table. Events rejected at the door (wrong secret, missing fields) never reach it, and the other receivers have no dead-letter store: Kuraimi and the channel receivers rely on the provider retrying a non-`2xx`, and suppliers keep the unprocessed row in `SupplierWebhookEvent`.

<a id="discrepancies"></a>

## 6. Discrepancies and open items

> ⚠️ Discrepancy — roadmap says "Sharwa AI `tenants/webhooks_ai.py` `sharwa_ai_session_status_webhook`" (one receiver) / code does: `tenants/webhooks_ai.py` has **two** public receivers, `sharwa_ai_session_status_webhook` and `sharwa_ai_inbound_message_webhook` (`/webhooks/sharwa-ai/session-status/` and `/webhooks/sharwa-ai/inbound-message/`). Both are documented above (#4, #5).

> ⚠️ Discrepancy — roadmap says "Meta / TikTok / Telegram channel webhooks → `process_inbound_channel_message`" / code does: the three views never call that task. They `.delay()` other tasks directly (`dispatch_instagram_comment_auto_reply`, `ingest_channel_order_task`, `dispatch_telegram_start`, `dispatch_telegram_callback`) or send the signal `incoming_channel_message`, whose only receiver calls `process_inbound_channel_message`. TikTok Shop reaches `ingest_channel_order_task` only and has no chat message path. The same signal is also used by SharwaConnect (#3).

> ⚠️ Discrepancy — roadmap says carrier failures "land in `PendingWebhookEvent`" / code does: only a **task failure** does (permanent error, or transient errors after 8 retries). Requests refused by the view (`401`, `400`) are not stored. In addition, `on_failure` always writes `attempts = max_retries` (8), also for a permanent error that was never retried, so `attempts` in the console is not a count of real tries.

> ⚠️ Discrepancy — roadmap says "`topup_auto` = a transaction id with NO receipt (INT-048 fix to `apply_credit_if_approved`)" / code does: that rule is applied only inside `apply_credit_if_approved`. The bank webhook itself does not call that method; it credits directly with the fixed reason `topup_auto` and stamps `credited_at` itself. The two paths agree on the outcome (a bank-only request is `topup_auto`) but are separate code.

Open items (observed behaviour, not roadmap conflicts):

* **Kuraimi has only a static token** — no body signature, no timestamp, no replay guard; a leaked token lets anyone post a credit for a matching phone number with a fresh `transaction_id`. The escrow-account check and the unique transaction id are the only other barriers.
* **Carriers use a plain shared secret**, not a body HMAC, and there is no replay window. The view's docstring records this as accepted for now.
* **Meta**: there is no `GET` handler for Meta's subscription handshake (`hub.challenge`) — the route is `POST` only and no handler for it was found in the sources read. Only the **first** `messaging` event and the **first** `entry` of a batched payload are processed; additional messages or entries in the same call are not routed or read. The `commerce_orders` format (Meta) and the whole TikTok format are marked *assumed* in the code.
* **No replay window or nonce** for Meta, TikTok, Telegram, Kuraimi and carriers. Duplicates are absorbed downstream (`Message.external_message_id`, the channel order link, `ShipmentEvent` idempotency key). For Instagram comments the auto-reply task's own de-duplication was not read.
* **Sharwa AI inbound messages**: the signal `incoming_whatsapp_message` is declared in `products/signals_chatbot.py`; no `@receiver` for it was found in the files read (the staged source tree is partial), so the consumer is not documented here.
* **A missing secret looks like a bad signature** (`403`) for #3–#7, whereas #1 answers `503`. The branch `missing_event_id` of the replay guard cannot be reached by SharwaConnect and Sharwa AI because their nonce is never empty.
* **Non-ASCII header values**: the signature checks compare header text with `hmac.compare_digest`, which raises `TypeError` for a `str` containing non-ASCII characters. The Kuraimi view catches it and answers `400 internal_error`; the other views do not wrap that call, so such a header would raise inside the view (a server error unless a middleware handles it) instead of answering `403`. Harmless for security (the call is not accepted) but noisy. Not exercised by a test here.
* **Carrier input**: an unknown `status` string is accepted by the view and ends as a *rejected* `ShipmentEvent`, not a dead letter; an unparsable `event_time` raises inside the task and is dead-lettered after the first attempt.
* **Suppliers**: a call with an unknown bridge token is answered `200` on purpose (a revoked URL does not reveal itself); more than 200 events in one call are silently truncated.
* The routes `sharwa-ai/commerce/*` and `.well-known/sharwa-ai-jwks.json` in `urls_public.py` are signed calls **from the Sharwa AI engine to Sharwa**, not webhooks, and are outside this page.

<a id="related"></a>

## 7. Related pages

* Outgoing webhooks: [`webhooks-outgoing.md`](webhooks-outgoing.md), [`webhooks-events.md`](webhooks-events.md), [`webhooks-verify-samples.md`](webhooks-verify-samples.md)
* Owner webhook routes: [M19 §6](../domains/12-settings-staff-integrations/m19-domains-integrations.md#webhooks)
* Folder index: [`README.md`](README.md)
