# PWA and browser push API — M44 (تطبيق الويب والإشعارات)

> **Source**: DOC-115, DOC-116, DOC-117 · INT-016 (M44) · inventory Domain 5 + A.3, A.5, A.8, A.11
> **Live key**: `pwa` — **only** the two merchant rows `push/stats` and `push/test` (via `liveOrMock(request, "pwa", …)`, [`../../overview/bff.md#live-keys`](../../overview/bff.md#live-keys)). The storefront rows are Django-first through the `/api/v1/*` passthrough ([`README.md#django-first`](README.md#django-first)).
> **Django provider**: `sharwa_saas/api/views.py` (`PWAInstallEventView`, `PushVapidPublicKeyView`, `PushSubscribeView`, `PushUnsubscribeView`) · `api/views_push.py` (`PushStatsView`, `PushTestView`) · `products/services/order_push_service.py` · `products/services/push_service.py` · Celery tasks `send_order_push` and `send_push_broadcast` in `products/tasks/operations.py` · serializers `PWAInstallEventSerializer`, `PushSubscriptionSerializer` in `api/serializers.py` · models `products/models/pwa.py` (`PWAInstallEvent`, `PushSubscription`) · routes `api/urls.py` lines 107–113
> **Frontend contract**: `sharwa-frontend/src/features/pwa/schemas.ts` · `install-events.ts` (`sendInstallEvent`) · `api.ts` (`usePushStats`, `useSendTestPush`) · components `push-subscribe.tsx` (success page) and `push-broadcast.tsx` (reports page) · BFF `src/app/api/bff/push/{stats,test}/route.ts`
> **Tests**: `sharwa_saas/api/test_pwa_push_api.py` (class `PwaPushTests`, 11 tests); legacy `products/test_push_notifications.py` and `products/test_pwa_install_tracking.py` are unchanged and were not read in this step
> **Last verified against code**: 2026-10-27 (step 13)

## 1. Overview

Domain 5 serves the PWA shell from Next.js (manifest, `/icon`, `/sw.js` — [`README.md#next-owned`](README.md#next-owned)). Django provides three things around it:

| Part | Rows | Audience | Section |
|---|---|---|---|
| Install tracking and push subscription | `pwa/install-event/`, `push/vapid-public-key/`, `push/subscribe/`, `push/unsubscribe/` | anonymous visitor | [§2](#storefront-rows) |
| Order-status pushes (no endpoint — a server-side sender) | Celery `send_order_push` | buyers who subscribed from the success page | [§3](#order-push) |
| Merchant broadcast panel | `push/stats/`, `push/test/` | store owner / staff | [§4](#merchant-push) |

One **platform-wide VAPID key pair** identifies the sending server to the push services (Google / Mozilla / Apple); it is read from Django settings (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CLAIMS_EMAIL`), not stored per merchant. The private key never appears in any response or log.

## 2. Storefront rows <a id="storefront-rows"></a>

All four are **public** (`permission_classes = [HasTenantContext]`, `authentication_classes = []`). They are "Ready" rows #11–#14 of `ready-api-v1.md` served by `api/views.py`; the browser calls them straight through the `/api/v1/*` passthrough (no BFF file).

> Roadmap note: the POSTs depend on the passthrough buffering the request body so Django sees `Content-Length` (the `upstream.ts` fix, inventory A.11); before it `POST /api/v1/pwa/install-event/` answered `400` «required field». The buffering rule itself is documented in [`README.md#django-first`](README.md#django-first); the historical `400` was not reproduced here.

### `POST /api/v1/pwa/install-event/`

Records one step of the install funnel.

**Request**: `{"event_type": "prompt_shown", "source": "nextjs_app"}`

| Field | Allowed values (`PWAInstallEvent` choices) |
|---|---|
| `event_type` | `prompt_shown`, `ios_hint_shown`, `accepted`, `dismissed`, `installed` |
| `source` | `django_storefront`, `nextjs_app` — the Next.js storefront always sends `nextjs_app` (`sendInstallEvent`) |

The session key and the `User-Agent` are filled **by the server** (`request.session.session_key`, `HTTP_USER_AGENT`); anything the client might send for them is ignored.

**Response `201`**: `{"ok": true}` (`test_install_event_from_nextjs`). A value outside the choices → `400` (DRF field errors).

**Limit**: `django-ratelimit` group `pwa_install_event`, key `ip`, **300 / minute**, `POST`, incremented per call → `429` `{"detail": "طلبات كثيرة جداً، حاول لاحقاً."}`. The old limit was 30/min; Yemeni ISPs share one public IP among thousands of users (CGNAT), which dropped real events, so the ceiling only prevents table flooding now.

The frontend call is fire-and-forget (`keepalive`, errors swallowed).

> ⚠️ Discrepancy — a comment in `src/features/pwa/install-events.ts` says «a 429 (30/min/IP)» / code does: Django's limit is 300/min since INT-016. The comment is stale; the behaviour (swallow the error) is unaffected.

### `GET /api/v1/push/vapid-public-key/`

**Response `200`**: `{"publicKey": "<VAPID public key>"}`. Only the public key is returned. If the platform has no key configured the value is empty and `PushSubscribe` hides itself («[pwa] VAPID public key is empty — push disabled»).

### `POST /api/v1/push/subscribe/`

Saves or refreshes one browser subscription.

**Request** — the browser's standard `PushSubscription.toJSON()` plus the order:

```json
{
  "endpoint": "https://push.example.com/send/abc123",
  "keys": { "p256dh": "<public key>", "auth": "<secret>" },
  "order_uuid": "3f0c9a52-6d5e-4b8e-9d51-0d2f4a7a1c10",
  "customer_phone": "967700000000"
}
```

| Field | Rule |
|---|---|
| `endpoint` | URL, ≤ 500 characters; the unique identity of the subscription |
| `keys` | object with non-empty `p256dh` **and** `auth` (`validate_keys`), otherwise `400` «keys يجب أن يحتوي على p256dh و auth.» |
| `order_uuid` | optional UUID — the **public id of the order that makes the subscription targetable** |
| `customer_phone` | accepted for compatibility (≤ 20 characters) and **ignored** |

**Anti-impersonation rule (INT-016 gap 2).** A targeted push carries the order number and the tracking link, so linking a subscription to a phone typed by the client would let anyone receive another number's order updates. The phone is therefore **derived from the order** whose `public_uuid` was sent (a value only the person who completed the order knows): `clean_phone_number(order.customer_phone)`. Consequences, all pinned by tests:

| Case | Result |
|---|---|
| `order_uuid` of an existing order | subscription saved with the order's phone in the canonical form (`0771234567` ⇒ `967771234567`), whatever `customer_phone` says (`test_subscribe_binds_phone_from_order_only`) |
| no `order_uuid` | anonymous subscription: `customer_phone` stays `null`, so it receives **broadcasts only** (`test_free_phone_without_order_is_ignored`) |
| unknown `order_uuid` | `400` `{"order_uuid": ["لم نجد هذا الطلب."]}` and nothing is saved (`test_unknown_order_uuid_is_400`) |
| later anonymous re-subscribe of the same browser | the linked phone is **kept** (an anonymous call never clears it) |

The record is written with `update_or_create(endpoint=…)`: the same endpoint updates keys and user agent and is set `is_active = true` again instead of creating a duplicate.

**Response `201`**: `{"ok": true}`.

**Limit**: group `push_subscribe`, key `ip`, **120 / minute** → `429` `{"detail": "طلبات كثيرة جداً، حاول لاحقاً."}` — a loose flood ceiling that never blocks a genuine buyer behind a shared IP (CGNAT stance).

### `POST /api/v1/push/unsubscribe/`

**Request**: `{"endpoint": "https://push.example.com/send/abc123"}`. The matching subscriptions get `is_active = false` (soft disable — the history is kept). **Response `200`**: `{"ok": true}`; also `200` for an unknown endpoint. Missing `endpoint` → `400` `{"detail": "endpoint مطلوب."}` (`test_unsubscribe`). There is no rate limit and no ownership check beyond knowing the endpoint URL.

### Frontend behaviour

`PushSubscribe` is shown **only on the order success page**, after a purchase (permission is never asked earlier):

- hidden when the browser has no Push API, when the permission is `denied`, or when VAPID is not configured;
- on click: `Notification.requestPermission()` → `GET push/vapid-public-key/` → `pushManager.subscribe` → `POST push/subscribe/` with `{…toJSON(), order_uuid, customer_phone}`; success toast «سنُنبّهك عند تغيّر الحالة», failure toast «تعذّر تفعيل التنبيهات على هذا المتصفح.»;
- when the permission is already granted and the browser is already subscribed, it **re-links the existing subscription to the new order** (a second `push/subscribe/` with the new `order_uuid`) and shows the confirmation «سنُنبّهك عند تغيّر حالة طلبك.»;
- the confirmation offers «إيقاف التنبيهات» (US-44.4.3): `POST push/unsubscribe/` then `subscription.unsubscribe()`, toast «أُوقفت التنبيهات على هذا المتصفح.»; on failure «تعذّر إيقاف التنبيهات، حاول مجدداً.»;
- the mock was aligned with Django (phone derived from the order, 300/min, the same messages).

**Service worker.** The `push` handler in `/sw.js` is expected to read exactly the payload Django builds, `{title, body, url}` (plus `icon` only when a caller passes one). `push_service.send_push_to_subscription` builds that JSON; the service-worker route file itself could not be read in this step (see [§6](#open-items)).

## 3. Order-status push notifications <a id="order-push"></a>

**The gap (INT-016 gap 1).** The success page promises «سنُنبّهك عند تغيّر حالة طلبك», but until INT-016 Django only stored the subscription and could send a manual broadcast. `products/services/order_push_service.py` and the Celery task `send_order_push` now send **targeted** pushes.

### 3.1 Who gets it

Active `PushSubscription` rows whose `customer_phone` equals the order's phone (`order_phone` = `clean_phone_number(order.customer_phone)`). No subscription for that phone ⇒ nothing is enqueued.

### 3.2 Triggers

| Hook | When | Push `kind` |
|---|---|---|
| `order_events.notify_sharwaconnect_of_order_event` → `push_for_order_event` — the single order-event point used by every path | `ORDER_SHIPPED` | `shipped` |
| | `ORDER_DELIVERED` | `delivered` |
| | `ORDER_CANCELLED` | `cancelled` |
| | `PAYMENT_RECEIVED` | `payment_received` |
| | `ORDER_CREATED` | **none** (the buyer is on the success page) |
| `shipment_state_service.apply_shipment_transition` → `push_for_shipment` — **accepted** transitions only (`event.is_rejected` false) | to `picked_up` | `shipped` |
| | to `in_transit` | `in_transit` |
| | to `delivered` | `delivered` |
| | to `returned` | `returned` |
| `fulfillment_service.mark_fulfillment_prepared` — **pickup orders only** | the row becomes `ready_for_pickup` | `ready_for_pickup` |

`test_accepted_shipment_transition_pushes`: a `pending_pickup → picked_up` transition sends one push, a rejected `picked_up → delivered` sends none.

### 3.3 Messages

`MESSAGES[kind] = (title, body)`; `{n}` is the order number (`order.pk`). When the store has a name (`StoreSetting.store_name`) the title becomes `«<store name> — <title>»`.

| `kind` | Title | Body |
|---|---|---|
| `payment_received` | تم تأكيد الدفع | تم تأكيد دفع طلبك رقم {n}. |
| `shipped` | طلبك في الطريق | شُحن طلبك رقم {n} — تابع رحلته من صفحة التتبع. |
| `in_transit` | طلبك قيد التوصيل | طلبك رقم {n} في الطريق إليك الآن. |
| `ready_for_pickup` | طلبك جاهز للاستلام | طلبك رقم {n} جاهز للاستلام — أظهر رمز الاستلام من صفحة التتبع. |
| `delivered` | تم التسليم | تم تسليم طلبك رقم {n}. شكراً لتسوقك معنا. |
| `returned` | تعذّر التسليم | تعذّر تسليم طلبك رقم {n} — تواصل مع المتجر لإعادة الإرسال. |
| `cancelled` | أُلغي الطلب | أُلغي طلبك رقم {n}. تواصل مع المتجر لأي استفسار. |

**Payload** sent to the push service (JSON, `ensure_ascii=False`): `{"title": "…", "body": "…", "url": "/track/<public_uuid>"}`. The link is the tracking page ([`m41-order-tracking.md`](m41-order-tracking.md)).

### 3.4 Delivery guarantees

- **Never breaks the caller.** `push_order_update` swallows every error (logged) and returns `False`; a missing Celery broker is caught inside the `on_commit` callback.
- **After commit.** The task is enqueued with `transaction.on_commit`; the task `send_order_push(schema_name, order_id, kind)` re-enters the tenant with `schema_context` and calls `deliver_order_push`.
- **No subscribers ⇒ no task** (`test_no_subscribers_no_task_and_created_is_silent`).
- **De-duplication.** `deliver_order_push` takes a cache key `order-push:<schema>:<order_id>:<kind>` with `cache.add(…, 6 h)`; a second push of the same kind for the same order inside 6 hours sends nothing. Several sources of the same event (courier assignment and waybill pick-up both mean *shipped*; the waybill and the «completed» status both mean *delivered*) therefore produce **one** push (`test_order_event_pushes_to_that_phone_only_once`: two events, one send, to the matching phone only, with `url = /track/<uuid>`, a title containing «تم التسليم» and the order number in the body). The key is taken when the task **runs**, not when it is enqueued.
- **Dead subscriptions.** `send_push_to_subscription` sets `is_active = false` when the push service answers `404` or `410`; any other failure is logged and the subscription stays active. A missing `pywebpush` package logs an error and sends nothing.
- No migration.

## 4. Merchant push rows <a id="merchant-push"></a>

The JSON successor of the legacy HTML action `send_test_push_notification` (M44 US-44.5) for the «إشعارات المتصفح» card of `/dashboard/reports`. Both rows use `ProductsAPIMixin` (`MerchantSessionAuthentication`, JSON bodies only) and the gate `gate(request, permission)`: no merchant session and no staff → `401` `{"detail": "انتهت جلستك، سجّل الدخول مجدداً."}`; a staff member without the permission → `403` `{"detail": "ليست لديك صلاحية لهذا الإجراء."}`.

### `GET /api/v1/push/stats/`

**Access**: the owner, or a staff member with `reports.view`.

**Response `200`**: `{"active_subscribers": 12}` — the number of `PushSubscription` rows with `is_active = true` in this store (anonymous and order-linked alike). Test: `401` without a session, `{"active_subscribers": 0}`, then `1` after one subscription.

### `POST /api/v1/push/test/`

Broadcasts a message to **every** active subscriber of the store. **Owner only**: any staff member gets `403` `{"detail": "إرسال الإشعارات لكل المشتركين للمالك وحده."}` (`test_staff_cannot_broadcast`).

**Request**: `{"title": "عرض", "body": "خصم 20%"}`

| Field | Rule | Errors |
|---|---|---|
| `title` | required, trimmed, **≤ 60** characters | «أدخل عنوان الإشعار.» · «العنوان 60 حرفاً على الأكثر.» |
| `body` | required, trimmed, **≤ 200** characters | «أدخل نص الإشعار.» · «النص 200 حرف على الأكثر.» |

**Response `202`**: `{"queued_for": 12}` — the subscriber count at the time of the call. The send itself runs asynchronously (`send_push_to_all_subscribers` → Celery `send_push_broadcast`, which loops over the active subscriptions inside the tenant schema; one failing subscription does not stop the rest).

| Status | Body | When |
|---|---|---|
| `400` | `{"title": […], "body": […]}` | validation (both keys can be present) |
| `400` | `{"detail": "لا يوجد مشتركون نشطون لإشعارات المتصفح بعد."}` | no active subscriber |
| `401` / `403` | see above | gate |
| `429` | `{"detail": "أُرسل إشعار قبل قليل — انتظر دقيقة قبل الإرسال مجدداً."}` + header `Retry-After: 60` | another broadcast was accepted in the last 60 s (cache key `push-test:<schema>`, `cache.add` with a 60 s timeout) |

Order of checks: gate → owner only → validation → subscriber count → cooldown → send. The cooldown is only taken after a valid request with subscribers, so a rejected request does not start the minute (`test_merchant_stats_and_test_push` calls `send_push_to_all_subscribers` exactly once across two requests).

### BFF and screen

- `GET /api/bff/push/stats` and `POST /api/bff/push/test` use `liveOrMock(request, "pwa", "/api/v1/push/stats/" | "/api/v1/push/test/", …)`: with the live key `pwa` on, the request goes to Django; otherwise the mock answers with the same rules (`permission: "reports.view"` for the count, owner-only 403 with the same sentence, 429 with `retry-after: 60`).
- The reports page card shows the count («مشترك نشط في إشعارات المتصفح»), the empty state «لا يوجد مشتركون نشطون لإشعارات المتصفح بعد.» and, for the owner, the form (labels «عنوان الإشعار» and «نص الإشعار», limits `PUSH_TITLE_MAX = 60` / `PUSH_BODY_MAX = 200`, button «أرسل إشعاراً تجريبياً لكل المشتركين»).

Tests: `test_merchant_stats_and_test_push`, `test_staff_cannot_broadcast`.

## 5. Tests at a glance

| Test (`PwaPushTests`) | Covers |
|---|---|
| `test_install_event_from_nextjs` | `201 {ok:true}`, invalid `event_type` → `400` |
| `test_subscribe_binds_phone_from_order_only` | phone from order, anonymous re-subscribe keeps it |
| `test_free_phone_without_order_is_ignored` | `customer_phone` alone ignored |
| `test_unknown_order_uuid_is_400` | `order_uuid` error, nothing saved |
| `test_unsubscribe` | soft disable, missing endpoint `400` |
| `test_order_event_pushes_to_that_phone_only_once` | targeting, link, 6-hour de-dup |
| `test_no_subscribers_no_task_and_created_is_silent` | no task without subscribers; `ORDER_CREATED` silent |
| `test_accepted_shipment_transition_pushes` | only accepted transitions |
| `test_ready_for_pickup_pushes` | pickup order prepared |
| `test_merchant_stats_and_test_push` | 401, counts, 400s, 202, 429 + `Retry-After` |
| `test_staff_cannot_broadcast` | staff `403` |

## 6. Open items <a id="open-items"></a>

- The service worker route (`/sw.js`) and the Next.js manifest/icon files could not be read; the `push` handler's use of `{title, body, url}` is taken from Django's payload and the roadmap.
- The 300/min and 120/min ceilings are per IP through `django-ratelimit` (`key='ip'`); how the client IP is resolved behind a proxy was not checked here.
- Whether the reports card hides the form from a non-owner was not verified (the Django `403` is the enforcement).
- `push/unsubscribe/` accepts any endpoint without proof of ownership (the endpoint URL is itself unguessable); there is no rate limit on it.
- `PushSubscribeView` looks the order up by `public_uuid` without checking its sales channel.
- Legacy suites `products/test_push_notifications.py` and `products/test_pwa_install_tracking.py` were not read.

## 7. Related pages

- Domain overview: [`README.md`](README.md)
- Tracking page the pushes link to: [`m41-order-tracking.md`](m41-order-tracking.md)
- Where the opt-in is offered: [`m12-checkout.md#success-and-late-receipt`](m12-checkout.md#success-and-late-receipt)
- BFF live keys: [`../../overview/bff.md#live-keys`](../../overview/bff.md#live-keys)
