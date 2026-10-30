# Idempotency: retrying a write without doing it twice

> **Source**: DOC-032 · inventory A.7 · INT-014, INT-016, INT-019, INT-020, INT-028, INT-033, INT-035, INT-037, INT-042, INT-046, INT-047
> **Code**: `products/services/{storefront_checkout,pos,wallet,inbox_api,support_api,courier_app,sharwa_ship_api,marketing,order_push}_service.py` · `api/views_{pos,wallets,payments,channels,support}.py` · `products/models/*` (unique keys) · `products/services/product_api_errors.py`
> **Frontend**: `src/lib/api-client.ts` (`idempotencyKey` option) · `src/lib/bff/upstream.ts` (forwarded request headers)
> **Last verified against code**: 2026-10-27 (step 04)

A client retries a write when it does not know whether the first try worked: a dropped connection, a timeout, a double tap. For the writes below Django remembers the first try under a **key** the client chose, and answers a retry with the first result instead of acting again. This page lists every mechanism with the name of the key, where it goes, what the retry gets back, and what happens when the key is misused. Conflicts caused by two different users are a different problem: see [`conflicts.md`](conflicts.md).

## 1. The rules that hold everywhere

1. **The client makes the key.** One key per user intention (one tap on "Pay", one withdrawal form), reused for every retry of that intention, never for a second intention. A fresh UUID per attempt defeats the whole mechanism.
2. **A replay returns the first result.** In the wallet top-up the key is looked up before the body is validated, so a retry that changed the body still gets the first answer. Do not edit a form and resend with the same key.
3. **First write and replay use different status codes where it matters.** First `201`, replay `200` (checkout, POS, withdrawals, inbox, support). Wallet top-up answers `200` both times.
4. **The key is tied to one subject.** A key reused for another operation or another object is refused with `409` where Django can tell (POS), or silently returns the first object's result where it cannot (wallet, withdrawal). Never share a key across screens.
5. **The BFF forwards the `Idempotency-Key` request header** to Django ([`conventions.md#headers`](conventions.md#headers)). `apiFetch` in `src/lib/api-client.ts` takes an `idempotencyKey` option and sets that header. Keys that travel in the body (`client_uuid`, `client_id`, `client_generated_uuid`, `idempotency_key`) pass through unchanged.

> The review copy of `src/` has the `idempotencyKey` option in `api-client.ts` but no screen that sets it. The feature code that makes keys for POS, withdrawals and top-ups was not found there; check the domain pages when they are written.

## 2. Every mechanism

| # | Operation | Route (under `/api/v1/`) | Key | Where | Unique column / scope | First | Replay | Domain page |
|---|---|---|---|---|---|---|---|---|
| 1 | [Checkout — place order](#checkout) | `POST checkout/` | `client_uuid` | body | `Order.idempotency_key` | `201` | `200` + the placed order | [`m12-checkout.md`](../domains/05-storefront/m12-checkout.md) |
| 2 | [POS sale](#pos) | `POST pos/orders/` | `Idempotency-Key` or `idempotency_key` | header or body | `PosIdempotencyKey.key` with `kind = order` | `201` | `200` + the receipt | [`m16-pos.md`](../domains/13-channels-operations/m16-pos.md) |
| 3 | POS cash movement | `POST pos/shifts/<pk>/movements/` | same | header or body | `PosIdempotencyKey`, `kind = movement` | `201` | `200` + the shift | [`m16-pos.md`](../domains/13-channels-operations/m16-pos.md) |
| 4 | POS refund | `POST pos/orders/<pk>/refund/` | same (optional here) | header or body | `PosIdempotencyKey`, `kind = refund` | per refund | `200` | [`m16-pos.md`](../domains/13-channels-operations/m16-pos.md) |
| 5 | [Merchant withdrawal](#withdrawal) | `POST wallet/withdrawals/` | `Idempotency-Key` | header | the withdrawal request | `201` + `{id, status}` | `200` + `{id, status}` | [`m14-payments-wallet.md`](../domains/08-finance/m14-payments-wallet.md) |
| 6 | [Customer wallet top-up](#topup) | `POST customers/wallets/<pk>/topup/` | `Idempotency-Key` or `idempotency_key` | header or body | `WalletTransaction.idempotency_key`, per wallet | `200` | `200`, same body | [`m35-wallets-loyalty.md`](../domains/06-customers-wallets/m35-wallets-loyalty.md) |
| 7 | [Inbox reply](#inbox) | `POST inbox/conversations/<pk>/messages/` | `client_id` (body) or `Idempotency-Key` | body, header as fallback | `Message.client_id` | `201` | `200` | [`m27-inbox-channels.md`](../domains/13-channels-operations/m27-inbox-channels.md) |
| 8 | [Support reply](#support) | `POST support/sessions/<pk>/messages/` | `client_id` | body, 64 characters | unique per session | `201` | `200` | [`m32-support.md`](../domains/14-apps-ai-support/m32-support.md) |
| 9 | [Courier shipment status](#courier) | `POST agent/shipments/<id>/status/` | `client_generated_uuid` (required, 64 characters at most) | body | `ShipmentEvent.idempotency_key = "<shipment>:<status>:<uuid>"` | `200` | `200` | [`m38-courier-app.md`](../domains/11-shipping/m38-courier-app.md) |
| 10 | Courier partial delivery | `POST agent/fulfillments/<id>/partial-delivery/` | `client_generated_uuid` (required) | body | `pd-<fulfillment>-<uuid>` | `200` + `duplicate: false` | `200` + `duplicate: true` | [`m38-courier-app.md`](../domains/11-shipping/m38-courier-app.md) |
| 11 | Carrier webhook | `POST webhooks/carrier/<code>/` | built by the server from the payload: `carrier_idempotency_key(carrier, payload, waybill, status, event_time)` | server | `ShipmentEvent.idempotency_key` | `202` `{received: true}` | `202` | [`m15-shipping.md`](../domains/11-shipping/m15-shipping.md) |
| 12 | Sharwa Ship status (dashboard) | `POST shipping/shipments/<pk>/status/` | `client_generated_uuid` (required, 64 characters at most) | body | `ShipmentEvent.idempotency_key = "<pk>:<to_status>:<uuid>"` | `200` | `200` | [`m39-sharwa-ship.md`](../domains/11-shipping/m39-sharwa-ship.md) |
| 13 | Supplier order forward | internal (dropshipping) | `idempotency_key_for(fulfillment_id)` | server → supplier | one per fulfilment | n/a | n/a | [`m29-dropshipping.md`](../domains/13-channels-operations/m29-dropshipping.md) |
| 14 | [Campaign send](#campaign) | `POST promotions/campaigns/<pk>/send/` | none: row lock + status flip | server | `MarketingCampaign.status` | `200` | **`400`** | [`m13-marketing.md`](../domains/07-marketing-design-partners/m13-marketing.md) |
| 15 | [Order push notification](#order-push) | internal (order and shipment events) | `(schema, order, kind)` | server | cache key, 6 hours | sent | skipped silently | [`m44-pwa.md`](../domains/05-storefront/m44-pwa.md) |

Rows 11 and 13 are server-to-server: a browser client sends nothing for them.

<a id="checkout"></a>
## 3. Checkout: `client_uuid`

- The storefront puts one UUID per checkout attempt in `client_uuid`. It is saved on `Order.idempotency_key` (unique) inside the stock-reservation transaction, so two concurrent submissions cannot both reserve stock.
- First placement: `201` with the placed order view. A retry with the same `client_uuid`: `200` with the **same** order view.
- A malformed value: `400` «طلب غير مكتمل، أعد تحميل الصفحة.»
- If payment fails hard (the gateway refuses), Django rewrites the stored key of the failed order to a fresh UUID. The customer can then retry with the **same** `client_uuid` and get a new attempt instead of the dead order.
- Separate rule, not idempotency: one order per session per minute. A second order inside 60 s gets `429` «لقد أرسلت طلباً قبل قليل. يرجى الانتظار دقيقة قبل إرسال طلب جديد.» ([`rate-limits.md`](rate-limits.md)).
- `client_uuid` is also read by the COD OTP routes as the device identifier ([`otp.md`](otp.md)).

<a id="pos"></a>
## 4. POS: `Idempotency-Key`

Three POS writes take a key: the sale (required), the cash movement and the refund (optional). The key is read from the `Idempotency-Key` header, or from `idempotency_key` in the body.

| Check | Result |
|---|---|
| Key missing on a sale | `400` `{"idempotency_key": ["مفتاح منع التكرار مطلوب."]}` |
| Key malformed (`^[A-Za-z0-9_\-]{8,64}$` fails) | `400` `{"idempotency_key": ["مفتاح منع التكرار غير صالح."]}` |
| First use | the write happens; the key row is inserted **first** in the write transaction (`_claim`), so two simultaneous requests with one key serialise on the unique index |
| Same key, same operation | `200` with the earlier result (the receipt for a sale, the shift for a movement) |
| Same key, other operation or other object | `409` «مفتاح منع التكرار مستخدم لعملية أخرى.» |
| Same key, the first request left no object yet | `409` with the same sentence |

Use 16–36 characters from a UUID. Hyphens and underscores are allowed; spaces and dots are not.

<a id="withdrawal"></a>
## 5. Merchant withdrawal: `Idempotency-Key`

`POST wallet/withdrawals/` reads the `Idempotency-Key` header and cuts it to 64 characters. The wallet row is locked (`select_for_update`) before the debit. A retry with the same key returns `200` `{id, status}` of the first request and does **not** debit again. If two requests with the same key race, the loser hits the unique constraint and also returns the first request.

Without a key the route still works, but a retry is a second withdrawal. Always send one.

<a id="topup"></a>
## 6. Customer wallet top-up: `Idempotency-Key`

`POST customers/wallets/<pk>/topup/` takes the key from the header or from `idempotency_key` in the body, trimmed and cut to 64 characters. The lookup runs **before** any validation: if a transaction with that key already exists on that wallet, the response is the current `{display_balance, transaction}` with the stored transaction, status `200`. A race of two requests with the same key resolves in the unique constraint: the loser returns the winner's transaction.

The key is looked up per wallet. The same key on another wallet is a new operation.

<a id="inbox"></a>
## 7. Inbox reply: `client_id`

`POST inbox/conversations/<pk>/messages/` takes `client_id` in the body. If it is missing the `Idempotency-Key` header is used instead. A first send answers `201`; a duplicate answers `200` with the stored message. The column `Message.client_id` is unique.

<a id="support"></a>
## 8. Support reply: `client_id`

`POST support/sessions/<pk>/messages/` takes `client_id` (64 characters at most). It is unique per session. First send `201`; duplicate `200` with the same item. A reply without taking over the session first gets `409` «استلم الجلسة أولاً لتتمكن من الردّ.» ([`conflicts.md`](conflicts.md)).

<a id="courier"></a>
## 9. Courier and shipment writes: `client_generated_uuid`

The courier app works on flaky mobile networks, so its writes carry a UUID made on the device when the courier taps.

- `agent/shipments/<id>/status/` (courier) and `shipping/shipments/<pk>/status/` (merchant dashboard) both take `{to_status, client_generated_uuid, event_time?}`. The server derives `"<shipment_id>:<to_status>:<client_generated_uuid>"` as the unique `ShipmentEvent` key, so the same transition with the same UUID is applied once. A missing UUID is a `400` field error («هذا الحقل مطلوب.»); more than 64 characters is also `400`. The `200` body is `{shipment_id, waybill_number, status, accepted, rejection_reason, flagged_for_review}`; `accepted: false` means the state machine refused the transition (it is not an HTTP error).
- `agent/fulfillments/<id>/partial-delivery/`: `client_generated_uuid` is **required**: `400` «client_generated_uuid مطلوب.» The change is keyed `pd-<fulfillment_id>-<uuid>`. The reply carries `duplicate: true` on a replay and does not count the lines again (`delivered` and `rejected` are numbers, never null). A delivery the rules refuse answers `409` `{detail: "رُفض التسليم.", rejection_reason}`.
- `CourierCustodyLedger` rows carry a unique `idempotency_key`, so a repeated custody entry is not written twice.
- `webhooks/carrier/<code>/` accepts the carrier's call, answers `202` `{received: true}` at once and processes in a background task. The server builds the key from the carrier code, the payload, the waybill number, the status and the event time, so a carrier that sends the same event again is absorbed. A bad `X-Carrier-Signature` is `401` «غير مصرح.»; a missing `waybill_number` or `status` is `400`.

The client reuses the same UUID for every retry of the same tap.

<a id="campaign"></a>
## 10. Campaign send: a status flip, not a key

There is no client key. `dispatch_campaign` locks the campaign row (`select_for_update`), checks the status, and sets it to `sent` in the same transaction, **before** any recipient is queued. Two clicks, or a click and the scheduler, cannot both send.

The second caller does not get a replay:

| Case | Response |
|---|---|
| First send | `200` with the campaign view |
| Campaign already `sent` | `400` «أُرسلت هذه الحملة من قبل.» |
| Channel not connected | `400` «القناة غير مربوطة — اربطها أولاً.» |
| `schedule_at` in the past | `400` `{"schedule_at": ["اختر وقتاً في المستقبل."]}` |

Treat the `400` as "already done" and refresh the campaign.

<a id="order-push"></a>
## 11. Order push notifications: one per order and kind

Browser push messages about an order (confirmed, shipped, out for delivery…) are throttled by a cache key `order-push:<schema>:<order id>:<kind>` that lives 6 hours (`DEDUPE_TTL`). If the same event fires twice inside that window the second call returns `0` sent. This guards against repeated status saves and webhook retries. It is not client-facing.

## 12. Choosing and storing a key

| Question | Answer |
|---|---|
| Format | a UUID v4. POS accepts 8–64 characters of `A-Z a-z 0-9 _ -`. Wallet and withdrawal accept anything but cut it to 64 characters |
| When to create it | when the user starts the action (opens the dialog), not when they press send |
| When to keep it | until the response arrives. Reuse it for every retry, including after a reload if the action was in flight |
| When to drop it | after a success (`2xx`) or after a `4xx` the user has to correct (new input = new intention). Create a new key for the corrected submission |
| After `409` with the key-reused sentence | a programming error: two operations share one key. Generate a new key and fix the caller |
| After `5xx` or a network error | retry with the **same** key |
| After `429` | wait for `Retry-After`, then retry with the same key |

## 13. What is not covered

A write that is not in the table has no key. Sending it twice acts twice unless the route is protected another way (an optimistic `version` check, see [`conflicts.md`](conflicts.md), or a state check). The client should disable the control until the response arrives. The domain pages say which protection each route has.
