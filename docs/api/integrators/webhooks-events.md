# Outgoing webhook events — catalogue, triggers and payloads (integrator reference)

> **Source**: DOC-219 · INT-023 (M19) · inventory Domain 12, A.8
> **Live key**: *Django-first, no switch of its own* (see [`webhooks-outgoing.md`](webhooks-outgoing.md)).
> **Django provider**: `sharwa_saas/products/services/webhook_service.py` (`EVENTS`, `build_payload`, `order_data`, `emit`, `emit_order`, `low_stock_scan`) · emit sites `products/order_events.py`, `products/models/orders.py`, `products/services/refund_service.py`, `products/services/shipment_state_service.py`, `products/models/catalog.py`, `products/tasks/operations.py`
> **Frontend contract**: the dashboard reads the same list from `GET /api/v1/webhooks/events/` (`webhookEventListSchema`, see [M19 §6.1](../domains/12-settings-staff-integrations/m19-domains-integrations.md#webhooks-events))
> **Tests**: `sharwa_saas/api/test_integrations_api.py` — `test_events_and_validation`, `test_emit_and_retry`, `test_low_stock_scan_once_per_entry`
> **Last verified against code**: 2026-10-27 (step 28)

<a id="overview"></a>

## 1. Overview

An endpoint subscribes to one or more of **7 events** (plus the unsubscribable `webhook.test`). Every event arrives in the same envelope; only `data` differs. The envelope, headers, signature, retries and idempotency are specified in [`webhooks-outgoing.md`](webhooks-outgoing.md). This page tells you **when** each event fires, **what** `data` contains, and which situations do **not** fire it.

| Code | Arabic name (`EVENTS`) | Fires when (summary) | Section |
|---|---|---|---|
| `order.created` | طلب جديد | A customer order is placed from the storefront or the cart checkout | [§3.1](#order-created) |
| `order.status_changed` | تغيّر حالة الطلب | One of four lifecycle moments: shipped, completed, cancelled, payment received | [§3.2](#order-status) |
| `order.fulfillment_changed` | تغيّر حالة التجهيز | The merchant's workflow status of an order is set | [§3.3](#order-fulfillment) |
| `order.refunded` | استرداد طلب | A full or partial refund is recorded | [§3.4](#order-refunded) |
| `shipment.event` | حدث شحنة | A shipment status transition is accepted | [§4](#shipment) |
| `product.updated` | تحديث منتج | A tracked product field (not stock alone) changes | [§5](#product) |
| `inventory.low_stock` | مخزون منخفض | A product enters the low-stock range (checked every 15 minutes) | [§6](#low-stock) |
| `webhook.test` | *(not listed)* | The owner presses the test button | [§7](#test) |

The Arabic descriptions in the dashboard list are, verbatim: «عند إنشاء طلب من المتجر أو الكاشير أو القنوات.», «عند نقل الطلب إلى حالة جديدة.», «عند تغيّر التجهيز أو الشحن للطلب.», «عند استرداد كامل أو جزئي لمبلغ طلب.», «كل تحديث تتبع مقبول على بوليصة.», «عند تعديل السعر أو البيانات أو الظهور.», «عند وصول كمية منتج إلى حد التنبيه.». Several of them are broader than the code — see the [discrepancies](#discrepancies).

<a id="envelope"></a>

## 2. Envelope common to all events

```json
{
  "id": "evt_4c1b0a7e9d2f4f8c8a31b6d5e2a90c11",
  "event": "order.created",
  "created_at": "2026-10-27T09:12:41.318402+00:00",
  "store": { "schema": "demo_store", "name": "متجر العود" },
  "data": { "…": "event-specific, see below" }
}
```

| Field | Meaning |
|---|---|
| `id` | Unique event id; the same in every attempt of the event — **use it to deduplicate** |
| `event` | One of the codes above |
| `created_at` | When the event was built (`timezone.now()` at the emit call), ISO-8601 with offset |
| `store.schema` | The store's schema name (a stable technical id); `store.name` its display name |

All samples below show only the full envelope for the first event and the **`data` object** for the others, to save space. The bytes on the wire are compact JSON (no indentation) — see [`webhooks-outgoing.md` §5.2](webhooks-outgoing.md#request). Values in the samples are illustrative; field names, types and formats come from the code.

> **Money and numbers** — amounts are **strings** with two decimals (`"125.00"`), stock quantities are strings with up to three decimals, ids are integers. Parse money with a decimal type, not a float.

<a id="orders"></a>

## 3. Order events

`order.created`, `order.status_changed`, `order.fulfillment_changed` and `order.refunded` share one `data` shape, built by `order_data(order)` at the moment of the emit call. Refunds add three fields and `order.created` / `order.status_changed` add one.

| Field | Type | Meaning |
|---|---|---|
| `order_id` | integer | The order number shown to the merchant |
| `public_uuid` | string (UUID) | The order's public identifier (safe to show to the customer) |
| `status` | string | Financial/system status: `pending_payment`, `new`, `awaiting_payment`, `payment_review`, `completed`, `cancelled` or `refunded` |
| `payment_status` | string | `unpaid`, `pending`, `partial`, `paid`, `failed` or `indeterminate` |
| `fulfillment_status` | string \| null | The **name** of the merchant-defined workflow status (free text in the store's language); `null` if none is set |
| `total_price` | string | Order total, two decimals |
| `currency` | string | Currency code, e.g. `SAR` |
| `customer_name` | string | |
| `customer_phone` | string | As stored by the store — typically a local number **without** a country code (the WhatsApp notification path normalizes it, the webhook does not) |
| `sales_channel` | string | `online`, `pos`, `b2b_draft` or `phone` |
| `created_at` | string \| null | When the order was created (ISO-8601) |

The data is read from the in-memory order object when the event is **emitted**, not when it is delivered. A retry therefore re-sends the original snapshot even if the order has changed since; fetch the current order when you need the latest state.

<a id="order-created"></a>

### 3.1 `order.created`

* **Trigger**: `notify_order_created()` in `checkout_service.py`, called by the storefront checkout (`storefront_checkout_service.py`) and by the cart checkout view (`views/cart_checkout.py`) once the order exists. It reaches `emit_order('order.created', …)` through `notify_sharwaconnect_of_order_event(order, 'ORDER_CREATED')` in `order_events.py`.
* **Timing**: queued at commit of the checkout transaction; usually delivered within seconds.
* **Extra field**: `source_event` — always `"ORDER_CREATED"`.
* **Not fired for**: orders created by other code paths (see [discrepancy](#discrepancies)).

```json
{
  "id": "evt_4c1b0a7e9d2f4f8c8a31b6d5e2a90c11",
  "event": "order.created",
  "created_at": "2026-10-27T09:12:41.318402+00:00",
  "store": { "schema": "demo_store", "name": "متجر العود" },
  "data": {
    "order_id": 1042,
    "public_uuid": "b3f1c2a4-7d58-4e0a-9c11-2f6a8d9e0b73",
    "status": "new",
    "payment_status": "unpaid",
    "fulfillment_status": "قيد الانتظار",
    "total_price": "125.00",
    "currency": "SAR",
    "customer_name": "سارة أحمد",
    "customer_phone": "771234567",
    "sales_channel": "online",
    "created_at": "2026-10-27T09:12:40.902117+00:00",
    "source_event": "ORDER_CREATED"
  }
}
```

<a id="order-status"></a>

### 3.2 `order.status_changed`

* **Trigger**: the same `emit_order` call in `order_events.py`, for the four lifecycle moments the platform already notifies customers about. The extra field `source_event` tells you which:

| `source_event` | When | Callers |
|---|---|---|
| `ORDER_SHIPPED` | The merchant assigns a real shipping provider to the order (clearing the provider does not fire) | `views/shipping.py` |
| `ORDER_DELIVERED` | The order's `status` is set to `completed` | dashboard status change, `order_api_service.change_status` |
| `ORDER_CANCELLED` | `status` becomes `cancelled`, including the rejection of a payment proof that was under review | same callers, `payment_action('reject')` |
| `PAYMENT_RECEIVED` | A payment is accepted or confirmed (the order moves to `new` / paid) | `payment_action('approve' / 'confirm')` in `order_api_service.py`, and the dashboard's accept-payment view in `views/merchant_dashboard.py` |

* **Timing**: after the status is saved, delivered at commit.
* **Not in `data`**: the cancellation reason and the amount paid, even though the internal notification carries them. Read the order if you need them.
* **Other status changes** (for example into `payment_review` or `awaiting_payment`) fire **nothing**.

```json
{
  "order_id": 1042, "public_uuid": "b3f1c2a4-7d58-4e0a-9c11-2f6a8d9e0b73",
  "status": "completed", "payment_status": "paid", "fulfillment_status": "تم التسليم",
  "total_price": "125.00", "currency": "SAR",
  "customer_name": "سارة أحمد", "customer_phone": "771234567",
  "sales_channel": "online", "created_at": "2026-10-27T09:12:40.902117+00:00",
  "source_event": "ORDER_DELIVERED"
}
```

<a id="order-fulfillment"></a>

### 3.3 `order.fulfillment_changed`

* **Trigger**: every call of `Order.set_fulfillment_status(new_status)` (`products/models/orders.py`) — the dashboard's fulfillment dropdown and the API route that sets it.
* **Timing**: right after the order is saved.
* **`data`**: the common order object, **no extra field**. `fulfillment_status` holds the new name, or `null` when the merchant clears it. `status` may have changed in the same call: a fulfillment status flagged "marks completed" moves `status` to `completed`, and you see that in this event.
* **Fires even when nothing changed** on the dashboard path (choosing the same status again emits again).
* **Does not also fire `order.status_changed`** when it completes the order this way (see [discrepancy](#discrepancies)).

```json
{
  "order_id": 1042, "public_uuid": "b3f1c2a4-7d58-4e0a-9c11-2f6a8d9e0b73",
  "status": "new", "payment_status": "unpaid", "fulfillment_status": "قيد التجهيز",
  "total_price": "125.00", "currency": "SAR",
  "customer_name": "سارة أحمد", "customer_phone": "771234567",
  "sales_channel": "online", "created_at": "2026-10-27T09:12:40.902117+00:00"
}
```

<a id="order-refunded"></a>

### 3.4 `order.refunded`

* **Trigger**: `process_order_refund()` in `refund_service.py`, after the refund and the wallet/loyalty side effects are recorded in the same transaction.
* **Timing**: delivered when that transaction commits.
* **Extra fields**:

| Field | Type | Meaning |
|---|---|---|
| `refund_amount` | string | The amount of **this** refund, two decimals |
| `refund_method` | string | `wallet`, `sharwa_pay`, `manual` or `wallet_credit` |
| `full_refund` | boolean | `true` when this refund completes the full refund of the order |

* A partial refund fires the event too, with `full_refund: false`. Two partial refunds produce two events with different `id`s.
* The common order fields are read from the order object as it stands when the refund code reaches the emit call (the same transaction, after the refund row is saved).

```json
{
  "order_id": 1042, "public_uuid": "b3f1c2a4-7d58-4e0a-9c11-2f6a8d9e0b73",
  "status": "completed", "payment_status": "paid", "fulfillment_status": "تم التسليم",
  "total_price": "125.00", "currency": "SAR",
  "customer_name": "سارة أحمد", "customer_phone": "771234567",
  "sales_channel": "online", "created_at": "2026-10-27T09:12:40.902117+00:00",
  "refund_amount": "25.00", "refund_method": "wallet", "full_refund": false
}
```

<a id="shipment"></a>

## 4. `shipment.event`

* **Trigger**: `apply_shipment_transition()` in `shipment_state_service.py` — the single gate for every shipment status change (carrier webhooks, the merchant's manual change, the courier app, cash-on-delivery collection).
* **Timing**: when the transition is accepted and saved.
* **Fires only for accepted transitions.** Not fired for: a transition that is not allowed from the current status, delivery of an order that is already cancelled/refunded, a stale out-of-order event, a courier-app delivery without GPS, and a **duplicate** of an event already recorded (the duplicate returns the earlier record without side effects). A delivery flagged for manual review (outside the geofence) **is** accepted and does fire.

| Field | Type | Meaning |
|---|---|---|
| `shipment_id` | integer | Internal shipment id |
| `waybill` | string | Waybill number |
| `order_id` | integer | The order the shipment belongs to |
| `carrier_code` | string | `sharwa_ship`, `aramex`, `smsa`… |
| `from_status` | string | Status before the transition |
| `to_status` | string | Status after: `label_pending`, `pending_pickup`, `picked_up`, `in_transit`, `delivered`, `returned`, `cancelled` or `compensated_lost` |
| `source` | string | Who caused it: `webhook` (carrier), `merchant_manual`, `agent_app`… |
| `event_time` | string | The time the event happened at its source (ISO-8601) — may be earlier than `created_at` |

```json
{
  "shipment_id": 318,
  "waybill": "SHW-2026-000318",
  "order_id": 1042,
  "carrier_code": "sharwa_ship",
  "from_status": "picked_up",
  "to_status": "in_transit",
  "source": "webhook",
  "event_time": "2026-10-27T10:05:00+00:00"
}
```

<a id="product"></a>

## 5. `product.updated`

* **Trigger**: `Product._log_field_changes()` (`products/models/catalog.py`), called by a **full** `Product.save()` of an existing product (not `save(update_fields=…)`, not bulk `update()`, not creation).
* **Timing**: when the save's transaction commits.
* **Fires only when a tracked field other than `stock` changed.** Tracked fields (the `changed_fields` vocabulary): `name`, `price`, `old_price`, `cost_price`, `currency`, `is_available`, `payment_policy`, `deposit_required`, `description`, `has_refundable_deposit`, `refundable_deposit_amount`, `refundable_deposit_refund_rule`, `refundable_deposit_return_event`, `is_serialized`, `is_bundle`, `bundle_build_fee`, `is_auction`. Fields outside this list (category, images, slug, SKU, variants…) fire nothing. A change of `stock` alone fires nothing (test `test_emit_and_retry`); if `stock` changes together with another tracked field, the event fires and `changed_fields` omits `stock`.

| Field | Type | Meaning |
|---|---|---|
| `product_id` | integer | |
| `name`, `sku` | string | Current values |
| `price` | string | Current price, two decimals |
| `currency` | string | |
| `is_available` | boolean | Whether the product is shown for sale |
| `changed_fields` | string[] | Sorted names of the tracked fields that changed (never contains `stock`) |

`changed_fields` tells you **which** tracked fields changed, not their old values. `data` carries only the current name, SKU, price, currency and availability; fetch the product if you need `description`, `cost_price` or any other field.

```json
{
  "product_id": 57,
  "name": "عطر العود",
  "sku": "SHW-3F9A21BC",
  "price": "10.00",
  "currency": "SAR",
  "is_available": true,
  "changed_fields": ["name"]
}
```

<a id="low-stock"></a>

## 6. `inventory.low_stock`

* **Trigger**: not an event in the shop flow. Stock is decremented with `F()` expressions during checkout, which never call `save()`, so a periodic job looks for products in the low range. Celery Beat entry `dispatch-low-stock-webhooks` runs every **15 minutes** (`crontab(minute='*/15')`) → `dispatch_low_stock_webhooks` → one `dispatch_low_stock_webhooks_for_tenant` task per store → `low_stock_scan()`.
* **Low range**: `0 < stock <= low_stock_threshold` (the threshold is per product, default 3). A product with `stock = 0` is **not** low-stock for this event.
* **Once per entry**: the scan keeps the set of product ids already reported in the cache (key `webhook_low_stock:<schema>`, 30 days). It emits one event per product that is in the range now and was not in the previous scan. A product that stays low is not repeated; it is reported again only after it left the range (restocked above the threshold, or sold out to 0) and re-enters.
* **Timing**: up to 15 minutes after the stock actually crossed the threshold, plus delivery time. The scan does nothing for stores that have no active endpoint subscribed to this event.
* **First scan** after subscribing reports **every** product that is already low at that time (the cache has no memory yet).

| Field | Type | Meaning |
|---|---|---|
| `product_id` | integer | |
| `name`, `sku` | string | |
| `stock` | string | Quantity at scan time, up to three decimals |
| `low_stock_threshold` | integer | The product's alert threshold |

```json
{
  "product_id": 57,
  "name": "قلم",
  "sku": "SHW-7C20D1E4",
  "stock": "1.000",
  "low_stock_threshold": 5
}
```

<a id="test"></a>

## 7. `webhook.test`

Sent only by the owner's test button ([`webhooks-outgoing.md` §8.1](webhooks-outgoing.md#test-event)). It is **not** in the subscribable list and is sent whatever events the endpoint has. `data` is `{"message": "حدث تجريبي من شروة — تحقّق من التوقيع ثم أعد 2xx."}`. Handle it like any other event: verify, deduplicate on `id`, answer `2xx`.

<a id="handling"></a>

## 8. Handling guidance

* **Route on `X-Sharwa-Event`** (or `event`) and ignore codes you do not know with a `200`; new codes can be added.
* **Order matters little**: events are independent tasks and are not delivered in order. For orders, trust `data.status` and `created_at` of the freshest event, or re-read the order.
* **Several events for one action are normal**: a checkout can produce `order.created` and, later, `order.fulfillment_changed`; completing an order from the dashboard produces `order.status_changed` (`ORDER_DELIVERED`) and possibly a `shipment.event`.
* **A merchant can subscribe to only some events**; do not assume that you see every change of an order.

<a id="discrepancies"></a>

## 9. Discrepancies and open items

> ⚠️ Discrepancy — roadmap says `order.status_changed` is emitted "from `order_events`" for status changes, and the dashboard description says «عند نقل الطلب إلى حالة جديدة.» / code does: it fires **only** for the four `source_event` moments (`ORDER_SHIPPED`, `ORDER_DELIVERED`, `ORDER_CANCELLED`, `PAYMENT_RECEIVED`). Moves into `payment_review` or `awaiting_payment`, a refund, or a status change that is not one of those four do not fire it. There is no generic "any status change" hook.

> ⚠️ Discrepancy — the dashboard description of `order.created` says «عند إنشاء طلب من المتجر أو الكاشير أو القنوات.» (store, cashier or channels) / code does: `order.created` is emitted only through `notify_order_created`, whose callers in the sources read are the storefront checkout and the cart checkout view. No call from the POS (`sales_channel = 'pos'`), the B2B draft, the manual phone order or the social/marketplace channel ingestion path was found in those sources, so those orders do not fire it. The flagged callers were found by searching for `notify_order_created` and `notify_sharwaconnect_of_order_event`; code outside the staged sources was not searched.

> ⚠️ Discrepancy — the dashboard description of `order.fulfillment_changed` says «عند تغيّر التجهيز أو الشحن للطلب.» (fulfillment **or shipping**) / code does: only `Order.set_fulfillment_status` emits it. Assigning a shipping provider fires `order.status_changed` (`ORDER_SHIPPED`), and shipment progress fires `shipment.event`; neither fires `order.fulfillment_changed`.

> ⚠️ Discrepancy — a fulfillment status that "marks completed" sets `status = completed` inside `set_fulfillment_status`, which emits **only** `order.fulfillment_changed`. The dashboard and API paths that call it do not call `notify_sharwaconnect_of_order_event`, so no `order.status_changed` with `ORDER_DELIVERED` is sent for that completion. A receiver that wants to know "the order is now completed" must also look at `data.status` of `order.fulfillment_changed`.

> ⚠️ Discrepancy — the dashboard description of `product.updated` says «عند تعديل السعر أو البيانات أو الظهور.» (price, data or visibility) / code does: only the 17 tracked fields listed in [§5](#product) (the model tracks 18; `stock` alone is excluded) count, and only a full `save()` of an existing product emits. Creation, `save(update_fields=…)`, bulk `update()`, category/image/variant edits do not.

Open items:

* **Low-stock memory is a cache**: if the cache is flushed, the next scan re-reports every low product. Cache keys last 30 days.
* **Out-of-stock is silent**: a product that goes from low straight to 0 produces no event (the range excludes 0).
* **`product.updated` is built before the row is written**: the event is built inside `Product.save()` before `super().save()`. Inside a transaction (the usual case) delivery waits for commit; outside a transaction the delivery rows would be created immediately. The data is taken from the object being saved, so it is correct either way.
* **Snapshot semantics**: `data` is taken when the event is emitted. A delayed retry or manual redelivery re-sends that old snapshot with the same `id`.
* **`customer_phone` is not normalized** (no country code), unlike the number Sharwa passes to WhatsApp.

<a id="related"></a>

## 10. Related pages

* Delivery, signature, retries: [`webhooks-outgoing.md`](webhooks-outgoing.md)
* Verification code: [`webhooks-verify-samples.md`](webhooks-verify-samples.md)
* Owner routes and the `GET /api/v1/webhooks/events/` list: [M19 §6.1](../domains/12-settings-staff-integrations/m19-domains-integrations.md#webhooks-events)
* Folder index: [`README.md`](README.md)
