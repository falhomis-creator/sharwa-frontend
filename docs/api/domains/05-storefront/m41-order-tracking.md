# Order tracking API — M41 (تتبّع الطلب)

> **Source**: DOC-112, DOC-113, DOC-114 · INT-015 (M41), INT-016 (push on status) · inventory Domain 5 + A.13
> **Live key**: *Django-first, no switch* — server fetcher `getTracking()` and BFF row `orders/track/[uuid]` through `storefrontAdapter` ([`README.md#django-first`](README.md#django-first))
> **Django provider**: `sharwa_saas/products/services/order_tracking_service.py` (`track_order`, `tracking_view`, `ensure_pickup_code`) · view `api/views_tracking.py` (`OrderTrackingView`) · route `api/urls.py` line 104 (name `orders-track`)
> **Frontend contract**: `sharwa-frontend/src/features/tracking/schemas.ts` (`TrackingSchema`, `ShipmentSchema`) · `src/features/tracking/api.ts` (`getTracking`) · `src/features/tracking/components/tracking-view.tsx` · BFF `src/app/api/bff/orders/track/[uuid]/route.ts` · fixture `src/mocks/storefront/tracking.ts`
> **Tests**: `sharwa_saas/api/test_order_tracking_api.py` (12 tests)
> **Last verified against code**: 2026-10-27 (step 13)

## 1. Endpoint <a id="endpoint"></a>

### `GET /api/v1/orders/track/<public_uuid>/`

The public order-tracking page `/track/<public_uuid>` of the storefront. There is **no authentication** (`authentication_classes = []`, `permission_classes = [HasTenantContext]`): the random `Order.public_uuid` is the only key, which is why the response never carries a full phone number, coordinates, staff identities, waybill costs or internal location names ([§2](#content-rules)).

**Before INT-015.** The frontend was already Django-first (`getTracking()` and the BFF row both ask Django before using a fixture), but Django only had the legacy HTML view `order_status_public_view`, which knows nothing about shipments. Every request therefore ended in a fixture. INT-015 added the JSON provider; **no migration** was needed — the service reads existing models (`Order`, `OrderItem`, `Fulfillment`, `FulfillmentItem`, `ShipmentOrder`, `ShipmentEvent`, `PickupCode`, `PickupLocation`, `ShippingProvider`, `StoreSetting`). Its only write is issuing a pickup code ([§3.2](#pickup-code)).

**Request**: path parameter `public_uuid` (the route uses the `<uuid:…>` converter), no query, no body.

**Response `200`** (`TrackingSchema`; the key set is pinned by the test)

```json
{
  "order_number": "1042",
  "public_uuid": "3f0c9a52-6d5e-4b8e-9d51-0d2f4a7a1c10",
  "created_at": "2026-10-27T09:30:00+00:00",
  "status": "new",
  "status_label": "جديد",
  "payment_status": "unpaid",
  "fulfillment_status": { "name": "قيد التغليف", "color": "#2563eb" },
  "rollup_label": "قيد التنفيذ",
  "display_total": "200 ر.س",
  "display_amount_on_delivery": null,
  "display_deposit_amount": null,
  "delivery_method_name": "مندوب المتجر",
  "is_gift": false,
  "recipient_name": null,
  "gift_message": null,
  "customer_name": "منى",
  "customer_phone_masked": "967•••••567",
  "address_text": "صنعاء — حدة",
  "pickup_location": null,
  "items": [
    { "product_name": "عطر", "variant_label": "50 مل", "quantity": 2, "image": null }
  ],
  "fulfillments": [
    {
      "id": 1042,
      "status": "pending",
      "status_label": "بانتظار التجهيز",
      "items": [
        { "product_name": "عطر", "variant_label": "50 مل", "quantity": 2, "image": null }
      ],
      "pickup_code": null,
      "shipment": null
    }
  ],
  "return_policy_excerpt": "يمكنك إرجاع المنتج خلال 7 أيام من الاستلام."
}
```

(Fixture values; shape, labels and the excerpt follow `test_contract_shape_and_headers`.)

| Field | Type | Meaning |
|---|---|---|
| `order_number` | string | `str(order.pk)` |
| `public_uuid` | string | the key |
| `created_at` | string | ISO 8601 |
| `status`, `status_label` | string | the **financial / system** axis ([§2.1](#axes)); labels in [§3.1](#mapping) |
| `payment_status` | string | raw value, for example `unpaid` |
| `fulfillment_status` | `{name, color}` \| `null` | the **merchant-defined** axis ([§2.1](#axes)): name and colour only |
| `rollup_label` | string | summary of all cards ([§2.2](#cards)) |
| `display_total` | string \| `null` | `null` for gift orders |
| `display_deposit_amount`, `display_amount_on_delivery` | string \| `null` | set only when the order has an upfront part (`upfront_required > 0`) and is not a gift |
| `delivery_method_name` | string \| `null` | the name stored on the order; empty → `null` |
| `is_gift`, `recipient_name`, `gift_message` | | gift data; the last two only when `is_gift` |
| `customer_name`, `customer_phone_masked` | string \| `null` | `null` for gift orders; the mask keeps 3 + 3 digits («967•••••567») |
| `address_text` | string \| `null` | the delivery address trimmed; empty (pickup orders) → `null` |
| `pickup_location` | `{name, address, phone}` \| `null` | the pickup point (`address` `""` and `phone` `null` when empty) |
| `items[]` | array | `{product_name, variant_label (null when empty), quantity, image}`; `image` is the item's `product_image_snapshot`, else the product `image_url`, else the uploaded image made absolute with `request.build_absolute_uri`, else `null` |
| `fulfillments[]` | array | one card per shipment ([§2.2](#cards)) |
| `return_policy_excerpt` | string \| `null` | first real paragraph of `StoreSetting.return_policy` ([§2.5](#privacy)) |

**Headers** (set on every answer of this view, success or error)

| Header | Value | Why |
|---|---|---|
| `Cache-Control` | `no-store` | an order changes; the page polls every 60 s while a shipment moves |
| `X-Robots-Tag` | `noindex, nofollow` | FR-41.10 — tracking pages must not be indexed |

**Errors**

| Status | Body | When |
|---|---|---|
| `404` | `{"detail": "لم نجد هذا الطلب."}` | no order with this UUID **in this store's schema**. A UUID that belongs to another tenant gives the same answer (US-41.5): the tenant schema is selected from the store host, so the lookup cannot see other stores |
| `404` | Django's default not-found page | the path segment is not a UUID (`orders/track/not-a-uuid/` matches no route) — the test pins the status only |

The lookup does not filter by `sales_channel`, so an order of any sales channel can be shown by its UUID.

**How the storefront calls it**

- `getTracking(store, storeHost, uuid)` (server, first render): `fetch` of `${UPSTREAM_ORIGIN}/api/v1/orders/track/<uuid>/` with `x-store-domain`, `cache: "no-store"`. A `200` is validated with `TrackingSchema.safeParse` (invalid ⇒ `null`); `404`, `405` and `501` fall through to the fixture **only when mocks are on** (`isMocksOn()`), any other status ⇒ `null`; a network error also falls through to the fixture.
- `GET /api/bff/orders/track/<uuid>` (browser polling): `storefrontAdapter` with the same fallback rule. `TrackingView` re-fetches every **60 s** only while some card's shipment status is one of `picked_up`, `in_transit`, `pending_pickup`, `label_pending`.

Tests: `test_contract_shape_and_headers`, `test_unknown_uuid_is_404`.

> ⚠️ Discrepancy — roadmap says the response carries `X-Robots-Tag: noindex` / code does: `noindex, nofollow` (`views_tracking.py`). The test asserts `assertIn('noindex', …)`.

## 2. Content rules <a id="content-rules"></a>

### 2.1 Two axes that are never merged <a id="axes"></a>

| Axis | Field | Source | Who defines it |
|---|---|---|---|
| Financial / system | `status` + `status_label` | `Order.status` mapped by `STATUS_LABELS` | the platform (fixed list, [§3.1](#mapping)) |
| Merchant workflow | `fulfillment_status` `{name, color}` | `Order.fulfillment_status` (an `OrderStatus` row) | the merchant (free names and colours, for example «قيد التغليف» `#2563eb`); `null` when the order has none |

The tracking page shows both; nothing derives one from the other (FR-41.02).

### 2.2 One card per shipment <a id="cards"></a>

`fulfillments[]` always has at least one entry. A card is `{id, status, status_label, items, pickup_code, shipment}`.

**Case A — the order has `Fulfillment` rows** (only created with location routing or dropshipping): one card per row. `id` = `Fulfillment.pk`; `items` = its `FulfillmentItem` lines (`order_item` + the quantity of that line, not of the order); `status` is the row's status after [§3.1](#mapping); `shipment` is the latest non-cancelled `ShipmentOrder` linked to that row, or — if the order has exactly one row and none is linked — the order-level one. Test `test_split_order_partial_rollup`: two warehouses, quantities `[1, 2]`, first card delivered with `shipment: null`, second `shipped` with an `in_transit` shipment, and no warehouse name anywhere in the body.

**Case B — the common case, no `Fulfillment` row**: ONE card derived from the order. `id` = `order.pk`; `items` = all order items; `pickup_code` = `null` (a `PickupCode` needs a `Fulfillment` row); `shipment` from the order-level `ShipmentOrder`. The raw state is derived by `_derived_state`:

| Order-level shipment | Derived raw state |
|---|---|
| latest non-cancelled one is `delivered` | `delivered` |
| `label_pending` or `pending_pickup` | `ready_for_pickup` (which reads «جاهز للشحن» for a delivery order, [§3.1](#mapping)) |
| any other non-cancelled one (`picked_up`, `in_transit`, `returned`, `compensated_lost`) | `shipped` |
| none (or only cancelled), `order.shipped_at` set | `shipped` |
| none | `pending` |

Then `_public_state` applies the order-level overrides: `cancelled` order ⇒ `cancelled` «ملغي»; `completed` or `refunded` ⇒ `delivered` «تم التسليم» (finished order = delivered).

**Roll-up** (`rollup_label`):

| Condition | Text |
|---|---|
| order `cancelled` | «أُلغي الطلب» |
| every card `delivered` | «مكتمل بالكامل» |
| some, not all, delivered | «قيد التنفيذ الجزئي (N من M شحنات وصلت)» |
| otherwise | «قيد التنفيذ» |

### 2.3 Shipment (`shipment` object) <a id="shipment"></a>

```json
{
  "waybill_number": "SHW-0000001",
  "carrier_code": "sharwa_ship",
  "carrier_name": "شروة شيب",
  "status": "in_transit",
  "status_label": "قيد التوصيل",
  "explanation": null,
  "courier": { "name": "عبدالله", "phone": "967700000000" },
  "events": [
    { "to_status": "in_transit", "event_time": "2026-10-27T08:00:00+00:00" },
    { "to_status": "picked_up", "event_time": "2026-10-27T06:00:00+00:00" },
    { "to_status": "pending_pickup", "event_time": "2026-10-27T04:00:00+00:00" }
  ]
}
```

(Fixture values; the structure and the event order follow `test_simple_order_shipment_timeline_and_courier`.)

- **Which shipment**: the most recent `ShipmentOrder` that is **not** `cancelled` (by `created_at`, then `pk`); a cancelled one is shown only when it is the only one left (`test_returned_shipment_explains_and_cancelled_awb_is_hidden`). A pickup order (`pickup_location` set) never has a `shipment`.
- **Events**: the shipment's `ShipmentEvent` rows **excluding rejected ones** (`is_rejected`), newest first (`event_time`, then `pk`), reduced to `{to_status, event_time}` — no geo coordinates, no actor, no source, no cost, no idempotency key. `waybill_number` is the AWB the buyer can quote to the carrier.
- **Carrier name**: `carrier_code` is `sharwa_ship` when empty; the name is «شروة شيب» for `sharwa_ship` (or empty), otherwise the `display_name` of the class in the 3PL carrier registry (`carriers.registry.get_carrier_class`; the test expects «أرامكس» for `aramex`), `null` if the class has none.
- **Explanation** (only for three states):

| `status` | `explanation` |
|---|---|
| `returned` | «تعذّر التسليم وأُعيدت الشحنة إلى المتجر؛ تواصل مع المتجر لإعادة الإرسال.» |
| `cancelled` | «أُلغيت هذه البوليصة؛ تواصل مع المتجر لمعرفة التفاصيل.» |
| `compensated_lost` | «فُقدت الشحنة أثناء النقل وعُوِّض المتجر عنها؛ تواصل مع المتجر لإعادة الإرسال.» |

- **Shipment status labels** (`SHIPMENT_LABELS`): `label_pending` «بانتظار تأكيد الملصق», `pending_pickup` «بانتظار الاستلام من التاجر», `picked_up` «تم الاستلام», `in_transit` «قيد التوصيل», `delivered` «تم التسليم», `returned` «مُعاد», `cancelled` «ملغي», `compensated_lost` «شحنة مُعوَّضة».

### 2.4 Courier visibility <a id="courier"></a>

`courier` is `{name, phone}` or `null`, and is filled only when **all** hold:

1. the shipment status is `picked_up` or `in_transit` (`COURIER_VISIBLE`) — after `delivered` it disappears (the test flips the status and the courier turns `null`);
2. the carrier is the store's own fleet or Sharwa Ship (`carrier_code` empty or `sharwa_ship`) — **never** an external carrier;
3. a `ShippingProvider` with a phone is found: the card's `Fulfillment.shipping_provider`, else `Order.shipping_provider`, else — for a Sharwa Ship courier — the provider whose `staff_account` is the actor of the newest accepted `agent_app` event with actor type `staff` (the agent-app staff's provider profile);
4. the phone cleans to a valid number (`clean_phone_number`; `771234000` ⇒ `967771234000` in the test).

### 2.5 Privacy <a id="privacy"></a>

- **Gift orders** (`is_gift`): `display_total`, `display_amount_on_delivery`, `display_deposit_amount`, `customer_name` and `customer_phone_masked` are `null`; the recipient sees `recipient_name` and `gift_message` only (FR-41.04). `test_gift_hides_amounts_and_buyer` also checks that the buyer's name appears nowhere in the body.
- **Buyer phone** is masked on every other order; the full number is never in the payload (the test searches the raw body for the middle digits).
- **Deposit split**: `display_deposit_amount` = `upfront_required`, `display_amount_on_delivery` = `amount_on_delivery`, both only when `upfront_required > 0` (`test_deposit_split`: «50 ر.س» / «150 ر.س»).
- **Return policy**: `return_policy_excerpt` is the first paragraph of `StoreSetting.return_policy` (paragraphs split on blank lines) after removing leading `#` marks, skipping any paragraph that starts with «سياسة», cut at 400 characters with «…». For the test policy it returns «يمكنك إرجاع المنتج خلال 7 أيام من الاستلام.» (the heading «## سياسة الاسترجاع» is skipped). `null` when nothing qualifies.
- **No internal data**: no location or warehouse names, no waybill cost, no coordinates, no staff, no rejected events (FR-41.04/05).

## 3. Status mapping and pickup code <a id="mapping-and-pickup-code"></a>

### 3.1 Status mapping <a id="mapping"></a>

**Financial axis** (`STATUS_LABELS`): `pending_payment` «قيد تنفيذ الدفع», `new` «جديد», `awaiting_payment` «بانتظار تأكيد الدفع», `payment_review` «يتطلب مراجعة دفع», `completed` «مكتمل», `cancelled` «ملغي», `refunded` «مسترد»; any other raw status is returned as its own label.

**Card status** (`FULFILLMENT_LABELS` after `_public_state`):

| Raw state (from `Fulfillment.status` or [§2.2](#cards)) | Order | Shown `status` | Shown `status_label` |
|---|---|---|---|
| any | `cancelled` | `cancelled` | «ملغي» |
| any | `completed` / `refunded` | `delivered` | «تم التسليم» |
| `ready_for_pickup` or `shipped` | **pickup order** (`pickup_location` set) | `ready_for_pickup` | «جاهز للاستلام» |
| `ready_for_pickup` | delivery order | `preparing` | «جاهز للشحن» |
| `pending` | | `pending` | «بانتظار التجهيز» |
| `preparing` | | `preparing` | «قيد التجهيز» |
| `shipped` | delivery order | `shipped` | «تم الشحن» |
| `delivered` | | `delivered` | «تم التسليم» |
| `forwarded_to_supplier` | | `forwarded_to_supplier` | «حُوِّل إلى المورد» |

Why: Django's `ready_for_pickup` means «ready for pickup **or** shipping». For a pickup order it is the moment the buyer can come and collect; for a delivery order it must not read «ready for pickup», so it is shown as `preparing` with the dedicated label «جاهز للشحن» (`READY_TO_SHIP_LABEL`), which keeps the promise «سنُشعرك عند الشحن» true. On a simple order, a `pending_pickup` (or `label_pending`) AWB is read the same way (`test_pending_pickup_awb_reads_ready_to_ship`: `preparing` / «جاهز للشحن»). `shipped` on a pickup order is also shown as ready for pickup, because a pickup order has no carrier leg.

### 3.2 Pickup code lifecycle <a id="pickup-code"></a>

**The gap that was closed.** The model `PickupCode` (one-to-one with `Fulfillment`: `code` ≤ 12 characters, unique; `compartment_number`; `expires_at`; `picked_up_at`) existed for lockers / pickup points, but **no code path issued it**, so `pickup_code` could never be non-null.

| Rule | Detail |
|---|---|
| Issued by | `order_tracking_service.ensure_pickup_code(fulfillment)` |
| Format | 6 digits, `secrets.randbelow(1_000_000)` zero-padded, **unique** (up to 8 attempts on `IntegrityError`; if a concurrent request created the row meanwhile that row is returned) |
| Validity | `expires_at = now + 30 days` (`PICKUP_CODE_TTL`) |
| Idempotent | an existing row is returned, never replaced (`test_pickup_order_issues_code_once`: `PickupCode.objects.count() == 1` after repeated reads) |
| Eager trigger | `fulfillment_service.mark_fulfillment_prepared` sets the row to `ready_for_pickup` and, **for pickup orders only**, calls `ensure_pickup_code` and sends the push «ready_for_pickup» ([`m44-pwa.md#order-push`](m44-pwa.md#order-push)) |
| Lazy trigger | the tracking read issues it for a card whose public state is `ready_for_pickup` (covers rows prepared before the hook existed — `test_ready_fulfillment_prepared_before_hook_gets_code_lazily`) |
| Shown | only on a card whose public state is `ready_for_pickup`; an unprepared pickup order shows `pickup_code: null` |
| Hidden | once `picked_up_at` is set the field is `null` again (`test_pickup_order_issues_code_once`) |
| Delivery orders | never get a code (`test_delivery_order_prepared_has_no_code`: `PickupCode.objects.exists()` is false) |
| Orders without `Fulfillment` rows | **cannot** hold a code (the model needs a `Fulfillment`): they show «جاهز للاستلام» (when ready) with `pickup_location` but `pickup_code: null` |

The pickup order response also carries `pickup_location` (name, address, phone) and `address_text: null`.

**Frontend.** `TrackingView` shows the first non-null `pickup_code` of the cards. According to the roadmap, INT-015 also updated the `[NEEDS BACKEND]` notes of the route, schema, `api.ts` and the BFF README and aligned the fixture (prepared delivery = «جاهز للشحن», a pickup code only once the card is ready, the returned-shipment explanation text); the BFF route comment and `api.ts` were read and agree, the README was not.

**Open / out of scope.**

- **Verifying the code at the counter** (marking `picked_up_at`) is not implemented by this row; it belongs to the pickup-point, locker and POS modules (M15 / M22 / POS). No code in the files read for this step sets `picked_up_at`.
- Push on status change was the missing half of the promise «سنُنبّهك عند تغيّر حالة طلبك»; it is delivered by INT-016 ([`m44-pwa.md#order-push`](m44-pwa.md#order-push)).
- `compartment_number` is stored on `PickupCode` but is **not** part of the tracking payload.

Tests: `test_pickup_order_issues_code_once`, `test_ready_fulfillment_prepared_before_hook_gets_code_lazily`, `test_delivery_order_prepared_has_no_code`, `test_pending_pickup_awb_reads_ready_to_ship`, `test_finished_and_cancelled_orders`.

## 4. Open items

- The `404` for a non-UUID path is Django's default page, not the JSON `detail` ([§1](#endpoint)).
- The lookup is not restricted to online orders ([§1](#endpoint)).
- No test covers a Sharwa Ship courier found through the agent-app staff account ([§2.4](#courier) rule 3, third branch); it is read from the code only.
- `compartment_number` of a locker pickup is not exposed ([§3.2](#pickup-code)).

## 5. Related pages

- Domain overview: [`README.md`](README.md)
- Checkout success page that links here: [`m12-checkout.md#success-and-late-receipt`](m12-checkout.md#success-and-late-receipt)
- Status push notifications: [`m44-pwa.md`](m44-pwa.md)
