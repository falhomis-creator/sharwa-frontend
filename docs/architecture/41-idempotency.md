# Idempotency mechanisms — register

> **Source**: DOC-475 · inventory A.7 (idempotency) · INT-014, INT-016, INT-019, INT-020, INT-028, INT-031, INT-033, INT-037, INT-039, INT-042, INT-046, INT-047, INT-048, INT-009
> **Code**: `sharwa_saas/products/services/storefront_checkout_service.py` · `checkout_service.py` · `payments_service.py` · `wallet_service.py` (+ `products/models/wallets.py` managers) · `pos_service.py` (`_claim`) · `social_channels/inbox_api_service.py` · `support_api_service.py` / `support_lock_service.py` · `shipment_state_service.py` (`_create_event`) · `cod_collection_service.py` · `sharwa_ship_api_service.py` · `products/tasks/shipping.py` (`carrier_idempotency_key`) · `suppliers/order_forward_service.py` (`idempotency_key_for`) · `marketing_service.py` (`dispatch_campaign`) · `order_push_service.py` · `order_tracking_service.py` (`ensure_pickup_code`) · `notification_service.py` · `merchant_credit_service.py` · `commission_service.py` · `sharwapay/models.py` · `tenants/webhooks.py` · `tenants/console_money_service.py` · `products/tasks/support.py`
> **Last verified against code**: 2026-10-27 (official Step 08)

The client-facing rules — how to make, keep and drop a key, and every route's first and replay status — are in the API page [`../api/overview/idempotency.md`](../api/overview/idempotency.md). This page is the **register** of every mechanism in the code, including the server-to-server and internal guards a browser never sees, with the uniqueness scope that actually backs each one.

## 1. Purpose

A write can arrive twice: a double tap, a retried request after a timeout, an offline courier app re-syncing, a bank or carrier re-sending a webhook, a Celery retry. Sharwa protects every write that **moves money, stock or a shipment state, or sends a message** with one of four patterns:

| Pattern | Idea | Used by |
|---|---|---|
| **A. Client key + unique column** | the caller sends a key; the first write stores it in a column with a unique constraint; a retry finds the row and answers with it | checkout, withdrawal, wallet top-up, POS, inbox, support, courier, Sharwa Ship |
| **B. Server-derived key + unique column** | the server builds a deterministic key from the event (carrier event id, schema + fulfilment id, bank transaction id) | carrier webhook, supplier order forward, supplier webhooks, Sharwa Pay bank transfers, inbound support messages |
| **C. Guard flag or existence check under a row lock** | the row that the money hangs on is locked, a flag/timestamp/sibling row is checked, then set in the same transaction | merchant credit, platform commission, Sharwa Pay `credited_at`, campaign send, pickup code |
| **D. Cache key with TTL** | `cache.add` lets the first caller through for a time window | order push notifications, notification sync throttle |

Out of scope: conflicts between **two different users** (optimistic locking, see [`42-concurrency.md`](42-concurrency.md)) and rate limits ([`34-rate-limits.md`](34-rate-limits.md)).

## 2. Components

| Component | Location | Role |
|---|---|---|
| `Order.idempotency_key` | `products/models/orders.py` (`UUIDField`, `default=uuid4`, `unique=True`) | checkout key; every order has one, checkout overwrites it with `client_uuid` |
| `MerchantWithdrawalRequest.idempotency_key` | `products/models/wallets.py` (`CharField(64)`, `unique`, nullable; migration `0221_merchant_wallet_api`) | withdrawal key |
| `WalletTransaction.idempotency_key` | `products/models/wallets.py` (`CharField(64)`, `unique`, nullable; migration `0227_wallets_api`) | customer-wallet top-up key |
| `PosIdempotencyKey` (`key` unique 64, `kind` order/movement/refund, `object_id`) | `products/models/staff_pos.py` (migration `0229_pos_api`) | POS keys, claimed **first** in the write transaction |
| `Message.client_id` | `products/models/social_channels_inbox.py` (`CharField(64)`, `unique`, nullable; migration `0231_inbox_api`) | inbox reply key |
| `SupportMessage.client_id` + constraint `support_message_client_id_once` (`session`, `client_id`) where `client_id IS NOT NULL` | `products/models/support.py` (migration `0234_support_api`) | support reply key, unique per session |
| `ShipmentEvent.idempotency_key` (`CharField(200)`, `unique`) | `products/models/shipping.py` (migration `0160_shipmentevent`) | every shipment state transition from any source |
| `CourierCustodyLedger.idempotency_key` (`CharField(200)`, `unique`) | `products/models/courier.py` (migration `0167`) | courier cash custody / partial delivery |
| `SupplierOrder.idempotency_key` (`CharField(64)`, `unique`) | `products/models/suppliers_dropship.py` | one supplier order per fulfilment |
| `SupplierWebhookEvent` constraint `uniq_supplier_webhook_event` (`supplier_code`, `event_id`) | `products/models/suppliers_dropship.py` | inbound supplier webhooks |
| `SharwaPayTopupRequest.bank_transaction_id` (`CharField(100)`, `unique`, nullable) + `credited_at` | `sharwapay/models.py` (public schema) | bank transfer identity + double-credit guard |
| `Notification.dedupe_key` (`CharField(160)`, `unique`) + `NotificationRead` constraint `notification_read_once_per_reader` | `products/models/notifications.py` (migration `0216_notifications`) | notification identity per source |
| `PickupCode.fulfillment` (`OneToOneField`) + `code` unique | `products/models/locations.py` | one pickup code per fulfilment |
| `Order.is_merchant_credited` | `products/models/orders.py` | merchant-wallet credit guard |
| `PlatformCommissionRecord.order` (`OneToOneField`) | `products/models/billing.py` | one platform commission per order |
| `AppBillingCharge` constraint `unique_app_charge_per_period` (`installation`, `period_label`) | `products/models/billing.py` | one app invoice per period |

## 3. The register

Status codes are the API status of the first write and of a replay. "Server" means no browser is involved.

| # | Mechanism | Pattern | Key source | Uniqueness scope (what really backs it) | Replay response | Code (file : function) | Test |
|---|---|---|---|---|---|---|---|
| 1 | Storefront checkout — place order (INT-014) | A | body `client_uuid` (UUID; malformed ⇒ `400` «طلب غير مكتمل، أعد تحميل الصفحة.») | `Order.idempotency_key` unique, written inside the stock-reservation transaction; lookup filters `sales_channel='online'` | first `201`; replay `200` + the same placed-order view; a concurrent twin hits the unique index ⇒ `200` with the winner. A hard gateway failure rewrites the key to a fresh UUID so the same `client_uuid` can retry | `storefront_checkout_service.py` : `place_order` (650–812) | `api/test_storefront_checkout_api.py::test_cod_otp_and_place_order` |
| 2 | Direct-payment gateway call | B | `str(order.idempotency_key)` passed as `PaymentRequest.idempotency_key` | per order (gateway side) | gateway's own behaviour | `checkout_service.py` : `charge_direct_payment` (775) | — |
| 3 | POS sale (INT-033) | A | header `Idempotency-Key` or body `idempotency_key`, `^[A-Za-z0-9_\-]{8,64}$`, **required** | `PosIdempotencyKey.key` unique, `kind='order'`; row inserted first (`_claim`) so a twin waits on the index | `201` / `200` + the receipt; other kind or unbound key ⇒ `409` «مفتاح منع التكرار مستخدم لعملية أخرى.» | `pos_service.py` : `_claim`, `_bind`, sale | `api/test_pos_api.py::test_quote_and_sale` |
| 4 | POS cash movement | A | same, optional | `PosIdempotencyKey`, `kind='movement'` | `201` / `200` + the shift | `pos_service.py` : `add_movement` | `test_pos_api.py::test_movements_idempotent` |
| 5 | POS refund | A | same, optional | `PosIdempotencyKey`, `kind='refund'` (`seen` checked before the OTP step) | `200` with the earlier refund | `pos_service.py` : refund (1257) | `test_pos_api.py::test_refund_and_otp` |
| 6 | Merchant withdrawal (INT-020) | A | header `Idempotency-Key`, cut to 64 | `MerchantWithdrawalRequest.idempotency_key` unique (**global**) — wallet row locked before the debit | `201` `{id, status}` / `200` same; twin ⇒ `IntegrityError` ⇒ replay | `payments_service.py` : `create_withdrawal`, `_replay` | `api/test_payments_api.py::test_wallet_withdrawal_idempotent_and_reject_refunds` |
| 7 | Customer wallet top-up / adjustment (INT-028) | A | header `Idempotency-Key` or body `idempotency_key`, cut to 64 | `WalletTransaction.idempotency_key` unique (**global**); the pre-check filters by wallet | `200` `{display_balance, transaction}` both times; the pre-check runs **before** validation | `wallet_service.py` : `topup`; `WalletManager.credit/debit` | `api/test_wallets_api.py::test_create_topup_idempotency_and_ledger` |
| 8 | Inbox reply (INT-037) | A | body `client_id`, else header `Idempotency-Key`, cut to 64 | `Message.client_id` unique (**global**); the pre-check filters by conversation | `201` / `200` + the stored message | `inbox_api_service.py` : `send_message` | `api/test_channels_api.py::test_messages_send_idempotent_template_product` |
| 9 | Support staff reply (INT-042) | A | body `client_id`, cut to 64 | constraint `support_message_client_id_once` (`session`, `client_id`) | `201` / `200` + the same item | `support_api_service.py` → `support_lock_service.staff_send_reply` | `api/test_support_api.py::test_staff_reply_dedup_and_lock` |
| 10 | Inbound support message from the WhatsApp gateway | B | `gateway_message_id` | unique on `SupportMessage.gateway_message_id`; insert in its own savepoint | duplicate silently ignored (logged) | `products/tasks/support.py` : `process_support_inbound_message` | — |
| 11 | Courier shipment status (INT-046) | A | body `client_generated_uuid` (required, ≤ 64) | `ShipmentEvent.idempotency_key = "<shipment>:<to_status>:<uuid>"`; pre-check, then `_create_event` absorbs a racing `IntegrityError` and returns the existing event | `200` both times, same body | `courier_app_service.py` → `shipment_state_service.apply_shipment_transition`, `_create_event` | — (the courier tests exercise the route, not the replay) |
| 12 | Courier partial delivery / custody (INT-046) | A | body `client_generated_uuid` (required: «client_generated_uuid مطلوب.») | `CourierCustodyLedger.idempotency_key = "pd-<fulfillment>-<uuid>"` | `200` + `duplicate: true`, lines not counted again | `cod_collection_service.py` : `finalize_partial_delivery` | — |
| 13 | Sharwa Ship manual status (INT-047) | A | body `client_generated_uuid` (required) | `ShipmentEvent.idempotency_key = "<pk>:<to_status>:<uuid>"` | `200` both times | `sharwa_ship_api_service.py` (315) | — (`test_list_detail_and_manual_status` exercises the route, not the replay) |
| 14 | Carrier webhook and console re-play (INT-021, INT-030) | B | `carrier_idempotency_key(carrier, payload, waybill, to_status, event_time)` = `wh:<carrier>:<event_id>` when the carrier sends an `event_id`, else `wh:<carrier>:<waybill>:<to_status>:<event_time>` | `ShipmentEvent.idempotency_key` | `202` `{received: true}`; the task applies once; a DLQ re-play from the console carries the **same** key | `products/tasks/shipping.py` : `carrier_idempotency_key`; `tenants/console_service.py` (980) | `api/test_platform_console_api.py::test_carrier_webhook_uses_the_shared_idempotency_key` |
| 15 | Server-made shipment events (address change, convert to pickup, label verify, manual actions) | B | `addr-<id>-<uuid4>`, `convert-pickup-<id>-<timestamp>`, `verify-label-<id>`, `<kind>-<id>-<uuid4>` | `ShipmentEvent.idempotency_key` | random parts make each call a **new** event (only `verify-label-<id>` is idempotent) | `shipment_operations_service.py`, `shipping_service.py`, `tasks/shipping.py` | — |
| 16 | Supplier order forward (INT-039) | B | `idempotency_key_for(fulfillment_id)` = `sha256("<schema>:<fulfillment_id>")` | `SupplierOrder.idempotency_key` unique; same key sent to the supplier's `create_order` | supplier answers the existing order; retries never create a second supplier order | `suppliers/order_forward_service.py` | — |
| 17 | Supplier webhooks | B | `(supplier_code, event_id)` from the payload | constraint `uniq_supplier_webhook_event` | each event created in its own savepoint; a duplicate counts as `duplicates` and is not applied again; payload kept 7 days on failure (`purge_supplier_webhook_payloads`) | `tenants/webhooks_suppliers.py` | — |
| 18 | Sharwa Pay customer top-up request (INT-048) | B | body `bank_transaction_id` | `SharwaPayTopupRequest.bank_transaction_id` unique (public); pre-check + `IntegrityError` | `400` `{"bank_transaction_id": ["رقم العملية مستخدم مسبقاً."]}` | `sharwapay/customer_api.py` (369–397) | `api/test_sharwa_pay_api.py::test_topup_validation_and_create` |
| 19 | Kuraimi bank webhook | B | payload transaction id | same column | `200` `{"ok": true, "status": "duplicate_ignored"}` (pre-check and race) | `tenants/webhooks.py` (88–131) | — |
| 20 | Sharwa Pay credit on approval (console or admin) (INT-031) | C | — | `SharwaPayTopupRequest` row locked (`select_for_update`), `credited_at` checked and stamped in the same transaction; the console also refuses to approve a request whose bank number is already on another **approved** request: `400` `{detail: «رقم الحوالة <n> مستخدم في طلب مقبول سابق (#<id>).», duplicate_of}` | a second approval credits nothing | `sharwapay/models.py` : `apply_credit_if_approved`; `tenants/console_money_service.py` : `topup_action` | `api/test_platform_money_api.py::test_topup_approve_reject_and_unmatched` |
| 21 | Merchant-wallet credit for a paid order | C | — | `Order` row locked; `is_merchant_credited` checked then set | second call is a no-op | `merchant_credit_service.py` : `process_order_merchant_credit` (refund resets the flag) | — |
| 22 | Platform commission per order | C | — | `Order` row locked; `PlatformCommissionRecord` existence check; `order` is one-to-one | second call is a no-op | `commission_service.py` : `_record_platform_commission` | — |
| 23 | Campaign send (INT-019) | C | none | `MarketingCampaign` row locked, status flipped to `sent` **before** recipients are queued | `200` first; then **`400`** «أُرسلت هذه الحملة من قبل.» (not a replay) | `marketing_service.py` : `dispatch_campaign` | `api/test_marketing_api.py::test_campaign_lifecycle` |
| 24 | Pickup code (INT-023) | C | — | `PickupCode.fulfillment` one-to-one; existence check, then create in a savepoint, `IntegrityError` ⇒ return the winner (8 attempts against `code` collisions) | the same code every time | `order_tracking_service.py` : `ensure_pickup_code` (called by `fulfillment_service`) | — |
| 25 | Order push notification (INT-016) | D | `order-push:<schema>:<order_id>:<kind>` | `cache.add`, TTL `DEDUPE_TTL` = 6 h | second call sends nothing (returns `0`) | `order_push_service.py` | `api/test_pwa_push_api.py::test_order_event_pushes_to_that_phone_only_once` |
| 26 | Notification sync (INT-009) | C + D | `dedupe_key` per source row (e.g. `provisioning:ready`) | `Notification.dedupe_key` unique; sync throttled by `cache.add` for `SYNC_INTERVAL` = 20 s per store | the row is updated in place (reopened if the source returns), never duplicated | `notification_service.py` : `upsert`, `sync` | `api/test_notifications_api.py::test_resolution_and_reopen` |
| 27 | Notification read | A (server) | `(notification, reader)` with reader `owner` or `staff:<id>` | constraint `notification_read_once_per_reader`; `get_or_create` | read twice = one row | `notification_service.py` : `mark_read` | `test_notifications_api.py::test_read_and_read_all` |
| 28 | App billing charge per period (INT-032) | C | `(installation, period_label)` | constraint `unique_app_charge_per_period` | a second charge for the same period is refused by the index | `products/services/app_marketplace_service.py` : `generate_billing_charge`; console `tenants/console_money_service.py` : `_generate_charge` (see [`13-cross-schema-access.md`](13-cross-schema-access.md) for the `atomic()` fix) | — |

**Count reconciliation.** [`idempotency.md`](../api/overview/idempotency.md) lists **15** client-visible mechanisms (rows 1, 3–9, 11–14, 16, 23, 25 here). This register has **28** rows: the 13 extra rows are server-to-server or internal guards (2, 10, 15, 17–22, 24, 26–28) that a browser never sends a key for. Rows 3–5 match API rows 2–4 one to one.

```mermaid
sequenceDiagram
  participant C as Client (retrying)
  participant D as Django service
  participant DB as PostgreSQL
  C->>D: POST … key=K
  D->>DB: SELECT … WHERE key=K
  alt found
    DB-->>D: row
    D-->>C: 200 + first result
  else not found
    D->>DB: BEGIN; lock rows; INSERT … key=K; money/stock write; COMMIT
    alt unique violation (twin request committed first)
      DB-->>D: IntegrityError
      D->>DB: SELECT … WHERE key=K
      D-->>C: 200 + winner's result
    else ok
      D-->>C: 201 + new result
    end
  end
```

## 4. Invariants

| Invariant | Where enforced |
|---|---|
| A key is stored **in the same transaction** as the effect it protects; a failed transaction leaves no key | rows 1, 3–9, 11–13 (the key column is on the row the transaction writes) |
| The database constraint, not the pre-check, is the real guard; every pattern-A writer catches `IntegrityError` and re-reads | `create_withdrawal`, `topup`, `send_message`, `place_order`, `_claim`, `_create_event`, `ensure_pickup_code`, Kuraimi webhook |
| A replay never re-runs validation side effects: the lookup runs before any write | rows 1, 6, 7, 8, 12 |
| A refund or rejection is never applied twice | row locks + status check in `decide_withdrawal` and the console Sharwa Pay withdrawal action ([`42-concurrency.md`](42-concurrency.md)) |
| A Sharwa Pay deposit is credited at most once per request | `credited_at` stamped under row lock (row 20); the Kuraimi webhook stamps it at creation (row 19) |

## 5. Background work

Rows 10, 14, 16 and 17 run inside Celery tasks; their keys make task retries safe. A carrier event that exhausts its retries lands in `PendingWebhookEvent` (public schema) and is re-played from the console with the same key (row 14). See [`50-background-jobs.md`](50-background-jobs.md).

## 6. Configuration

| Item | Value |
|---|---|
| POS key format | `^[A-Za-z0-9_\-]{8,64}$` |
| Other client keys | trimmed, cut to 64 characters, any characters |
| `DEDUPE_TTL` (order push) | 6 h |
| `SYNC_INTERVAL` (notifications) | 20 s per store |
| `PICKUP_CODE_TTL` | 30 days |
| Cache backend | must be shared by all workers for rows 25–26 to hold across processes (see [`../ops/environment.md`](../ops/environment.md)) |

## 7. Failure modes and fixes

| Failure | Symptom | Cause | Handling / fix |
|---|---|---|---|
| Double debit of the merchant wallet | network retry of a withdrawal created two requests | no key | `Idempotency-Key` + unique column (INT-020, migration `0221`) |
| Courier partial delivery counted twice | offline re-sync | the key was received and **ignored** (`cod_collection_service` docstring) | key mandatory and stored on `CourierCustodyLedger` |
| 500 on two identical shipment events | race on the unique index | pre-check only | `_create_event` savepoint + re-read |
| Carrier event applied twice after a DLQ re-play | console re-play built a different key | two key builders | single `carrier_idempotency_key` shared by the view and the console (INT-030) |
| Sharwa Pay deposit credited twice | admin save after a bank webhook saw "approved, not credited" | status used as the guard | `credited_at` guard under row lock; webhook stamps `credited_at` at creation |
| Two supplier orders for one fulfilment | retry after a timeout | random key | `sha256(schema:fulfillment)` |

> ⚠️ Discrepancy — [`idempotency.md`](../api/overview/idempotency.md) §6 says a top-up key "is looked up per wallet; the same key on another wallet is a new operation" / code: the column `WalletTransaction.idempotency_key` is unique **globally** (`products/models/wallets.py:132`). A key already used on wallet A, sent for wallet B, passes the per-wallet pre-check (`wallet_service.py:211`), fails on the unique index, and the race branch re-reads the key globally (`:243-247`): the response is `200` with wallet B's balance and **wallet A's** transaction, and nothing is credited. Reported in official Step 08.

> ⚠️ Discrepancy — roadmap says the inbox reply key is "`client_id` unique" (implying per message thread) / code: `Message.client_id` is unique **globally** while the pre-check is per conversation (`inbox_api_service.py:325-329`). A `client_id` reused in another conversation hits `IntegrityError`, and the handler returns `200` with the message of the **other** conversation (`:362-368`) — the reply is not sent. Clients that make one UUID per tap never hit this. Reported in official Step 08.

## 8. Open items

- **Notification upsert has no race guard of its own.** `NotificationSync.upsert` does a check-then-create without catching `IntegrityError` (`notification_service.py:73-75`). It relies on the 20 s `cache.add` throttle letting only one sync run per store; a forced sync running beside a throttled one, or a non-shared cache, could raise a `500` on a duplicate `dedupe_key`.
- **Server-made shipment events with random keys** (row 15) are not idempotent by design: a repeated address change or convert-to-pickup request creates a second event. They are protected by the order `version` instead ([`42-concurrency.md`](42-concurrency.md)).
- **Keys are never purged.** `PosIdempotencyKey` rows and stored keys on transactions live forever; no clean-up job exists. Low volume today.
- **No browser code sets `Idempotency-Key` yet** in the review copy of `src/` (noted in `idempotency.md` §1); the BFF forwards the header and `apiFetch` supports it.

## 9. Related pages

- API: [`idempotency.md`](../api/overview/idempotency.md) (client rules, status codes) · [`conflicts.md`](../api/overview/conflicts.md)
- Architecture: [`42-concurrency.md`](42-concurrency.md) · [`43-ledgers.md`](43-ledgers.md) · [`46-timelines-and-notifications.md`](46-timelines-and-notifications.md) · [`50-background-jobs.md`](50-background-jobs.md) · [`13-cross-schema-access.md`](13-cross-schema-access.md)
