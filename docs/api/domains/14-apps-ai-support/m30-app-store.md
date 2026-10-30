# App Store API — M30 (متجر التطبيقات)

> **Source**: DOC-253, DOC-254, DOC-255, DOC-256 · INT-040 (M30) · inventory Domain 14, A.3, A.8, A.9, A.12, A.13
> **Live key**: `apps` (`SHARWA_LIVE_MODULES`) — one catch-all `api/bff/apps/[[...path]]` for the whole module; `sharwa-ai/*` rides the same catch-all on its own key `sharwa_ai` (M31).
> **Django provider**: `sharwa_saas/products/services/apps_api_service.py` (whole file) + `api/views_apps.py` (12 routes) · single source of truth reused verbatim: the catalogue is `appstore.App` (managed by the console, M46), lifecycle is `app_marketplace_service`, templates are `template_service.TEMPLATE_REGISTRY` + `AppTemplate`, billing is `App.is_billed_for_client` + `AppBillingCharge`
> **Frontend contract**: `sharwa-frontend/src/features/apps/schemas.ts` (`appSchema`, `appDetailSchema`, `usageRowSchema`, template schemas) · fixtures `src/mocks/apps/` · BFF `src/app/api/bff/apps/[[...path]]/route.ts`
> **Tests**: `sharwa_saas/api/test_apps_api.py` (7 `def test_` methods) · mock E2E `scripts/apps-support-check.ts`
> **Last verified against code**: 2026-10-28 (step 43)

## 1. Overview

The merchant's app store: browse the platform catalogue, install an app, activate/deactivate it, read its lifecycle events and its billing charges, and — for the WhatsApp app — manage message templates, read the usage log and open the SharwaConnect pairing panel. Before INT-040 this was an HTML screen with a hard-coded two-app catalogue; the API now serves the real `appstore.App` catalogue the console manages.

**One code translation, in one place**: models and tasks call the WhatsApp app `'whatsapp'` (`is_app_active('whatsapp')`, `order_events`, Celery tasks), but the contract uses **`whatsapp_bot`** — because `/dashboard/apps/whatsapp` is the WhatsApp panel's own route in Next.js and would shadow `/dashboard/apps/[code]`. `CONTRACT_CODES` / `MODEL_CODES` in `apps_api_service.py:27-29` translate both directions; every other code passes through unchanged.

## 2. Access — gate chain

All twelve routes share one gate (`AppsAPIMixin.guard`, `views_apps.py:34-42`); the first failure answers.

| # | Gate | Requirement | Failure |
|---|---|---|---|
| 1 | Session | owner or staff session | `401` |
| 2 | Plan feature | `app_marketplace` | `403` `{"detail": "متجر التطبيقات غير مفعّل في خطتك."}` |
| 3 | Owner-only | every write (install/activate/deactivate, template PATCH) | `403` `{"detail": "إدارة التطبيقات لمالك المتجر فقط."}` |
| 4 | Resource state | WhatsApp rows need the app installed **and** effectively active (not suspended) | `409` `{"detail": "تطبيق الواتساب غير مثبَّت أو غير مفعّل."}` |

Reads (catalogue, detail, events, charges, usage, templates, connect-url) are open to staff too. Effectively active = installed, `is_active`, and not `suspended_by_platform`.

## 3. Endpoint summary — the 12 routes

Declared in `api/urls.py:633-664`; `apps/sharwa-ai/*` (M31) is declared **before** `apps/<str:code>/` so the generic route cannot swallow it.

| Method | Django path (`/api/v1/…`) | Purpose | Gate (beyond read) |
|---|---|---|---|
| `GET` | `apps/` | catalogue + installation state | — |
| `GET` | `apps/<code>/` | app detail + billing preview + suspension reason | — |
| `POST` | `apps/<code>/install/` | install → 201 `{installation}` | owner |
| `POST` | `apps/<code>/activate/` | activate → `{installation}` | owner |
| `POST` | `apps/<code>/deactivate/` | deactivate (keeps data) → `{installation}` | owner |
| `GET` | `apps/<code>/events/` | installation lifecycle events | — |
| `GET` | `apps/<code>/charges/` | the app's billing charges | — |
| `GET` | `apps/whatsapp/usage/` | WhatsApp usage log (paged) | installed+active |
| `GET` | `apps/whatsapp/summary/` | last-7-days counters | installed+active |
| `GET` | `apps/whatsapp/templates/` | the six editable templates | installed+active |
| `GET`, `PATCH` | `apps/whatsapp/templates/<id>/` | one template / save `{body}` | PATCH owner |
| `GET` | `apps/whatsapp/connect-url/` | one-time SharwaConnect invite | installed+active |

## 4. Endpoint groups

### 4.1 Catalogue and detail

#### `GET /api/v1/apps/`

Listed apps **plus** apps this store installed that the platform delisted since — the latter stay visible with `is_listed: false` so the merchant keeps their panel (§8); they cannot be reinstalled (§4.2). Ordered by name. Row (`app_view`, `apps_api_service.py:105-118`):

```json
{
  "code": "telegram",
  "name": "تيليجرام",
  "description": "بوت تيليجرام لمتجرك",
  "icon": "send",
  "is_free": true,
  "display_price": null,
  "billing_interval": "monthly",
  "billing_enabled": false,
  "is_listed": true,
  "installation": {
    "is_active": true,
    "suspended_by_platform": false,
    "subscription_expires_at": null,
    "installed_at": "2026-10-20T08:00:00+00:00"
  }
}
```

`installation` is `null` when the app is not installed. **Billing fields reflect this store** (`App.is_billed_for_client` — store overrides beat the global switches, see [the console's apps page](../16-platform-console/m46-plans-billing.md#44-getpost-apps--patch-appscode--getpost-app-billing-overrides--delete-app-billing-overridesid)): not billed → `is_free` as configured, `display_price: null`, `billing_enabled: false`; billed → `display_price` as a money string and `billing_enabled: true` (even a globally free app shows `is_free: false` here when a store override bills it).

#### `GET /api/v1/apps/<code>/`

Everything above plus two detail-only fields:

- **`install_preview`** — present only when the app is **not installed and billed for this store**: `{display_price, interval_label («شهرياً» / «سنوياً»), note: «تُضاف الرسوم شهرياً إلى مستحقات المنصة وتُحصَّل منها؛ لا دفع من هذه الصفحة.»}` (the interval word follows the app's cycle). Not billed → no preview: the app simply shows «مجاني».
- **`suspension_reason`** — when the installation is suspended by the platform, the `detail` of the latest `suspended_by_platform` event (what the console wrote).

Unknown code (not listed and not installed) → `404` `{"detail": "التطبيق غير موجود."}`.

### 4.2 Lifecycle actions, events and charges

#### `POST apps/<code>/install/` · `activate/` · `deactivate/` — owner only

| Action | Success | Errors |
|---|---|---|
| `install` | `201 {installation}` | `404` «التطبيق غير موجود.» · `404` `{"detail": "التطبيق لم يعد متاحاً للتثبيت."}` (delisted) · `409` `{"detail": "التطبيق مثبَّت مسبقاً."}` |
| `activate` | `{installation}` | `404` «التطبيق غير مثبَّت.» · **`403` `{"detail": "التطبيق معلَّق من المنصة — تواصل مع الدعم."}`** while suspended (before INT-040 activate on a suspended installation was *silently* refused) · `409` `{"detail": "التطبيق مفعّل مسبقاً."}` |
| `deactivate` | `{installation}` | `404` «التطبيق غير مثبَّت.» · `403` (suspended, as above) · `409` `{"detail": "التطبيق معطّل مسبقاً."}` |

All three delegate to `app_marketplace_service` — the same functions the legacy screens and the platform console dues screen call — so events (`installed`, `activated`, `deactivated`, `suspended_by_platform`, …) and suspension flags stay consistent everywhere.

#### `GET apps/<code>/events/`

The latest 200 `AppInstallationEvent` rows for this store's installation (newest first): `{event, created_at, note}` — `note` is the event's `detail` (e.g. the suspension reason). Not installed → `[]`.

#### `GET apps/<code>/charges/`

The installation's `AppBillingCharge` rows, newest first: `{id, period_label ("2026-10"), display_amount, status (pending|collected|waived), created_at}`. Read-only on purpose — collection and waivers happen in the platform console's dues screen ([Domain 16](../16-platform-console/m45-dues-sharwa-pay-admin.md)).

### 4.3 The WhatsApp panel

Every WhatsApp row needs the app installed and effectively active (gate 4, `409` «تطبيق الواتساب غير مثبَّت أو غير مفعّل.»).

#### `GET apps/whatsapp/usage/?status&event_type&from&to&page&page_size`

The `AppUsageLog` for this store, newest first, DRF-style envelope `{count, next, previous, results}`; `page_size` defaults to 20, caps at 100. Row: `{id, event_type, recipient_phone, status, order_id, error, created_at}` — `order_id` links the message to the order that triggered it (`AppUsageLog.order`, migration `0233`). `status` is one of `queued · sent · delivered · read · failed · skipped`.

**Event mapping** — the log stores the writer's keys; the contract always shows the M30 names (`EVENT_SOURCES`, `apps_api_service.py:36-47`):

| Contract `event_type` | Stored `AppUsageLog.event_type` |
|---|---|
| `order_new` | `order_new` or `ORDER_CREATED` |
| `order_shipping_update` | `order_shipping_update` or `ORDER_SHIPPED` |
| `order_delivered` | `order_delivered` or `ORDER_DELIVERED` |
| `order_cancelled` | `order_cancelled` or `ORDER_CANCELLED` |
| `payment_confirmed` | `payment_confirmed` or `PAYMENT_RECEIVED` |
| `payment_failed` | `payment_failed` |
| `abandoned_cart_reminder` | `abandoned_cart_reminder` |
| `otp` | `otp` |
| `manual` | `manual` (also the fallback for unknown stored keys) |

`order_events.notify_sharwaconnect_of_order_event` writes the `ORDER_*` names; the free-form `whatsapp_service` keys pass through unchanged; filtering by `event_type` accepts the contract name and matches both spellings. `from`/`to` are `YYYY-MM-DD` dates (else `400` `{key: ["تاريخ بصيغة YYYY-MM-DD."]}`).

#### `GET apps/whatsapp/summary/`

`{last_7_days, delivered, failed, queued}` over the last 7 days — `delivered` counts `delivered` + `read`.

#### `GET apps/whatsapp/templates/` · `GET|PATCH apps/whatsapp/templates/<id>/`

The six WhatsApp entries of `TEMPLATE_REGISTRY` with **fixed numeric ids 1–6** (the editor routes on them). Variables are stored `{var}` (render engine) and shown `{{var}}` (editor) — translated both ways by the service. Row:

```json
{
  "id": 4,
  "key": "order_shipping_update",
  "event_type": "order_shipping_update",
  "name": "تحديث حالة الشحن للعميل",
  "body": "مرحباً، تم تحديث حالة طلبك {{order_id}} في متجر {{store_name}} إلى: {{status_label}}.",
  "variables": ["order_id", "store_name", "status_label"],
  "required": ["order_id", "status_label"],
  "preview": "مرحباً، تم تحديث حالة طلبك #1042 …",
  "is_custom": false,
  "updated_at": "2026-10-20T08:00:00+00:00"
}
```

The six templates:

| id | key | label | variables | required |
|---|---|---|---|---|
| 1 | `merchant_new_order` | «تنبيه التاجر بطلب جديد» | `order_id, order_total, order_currency` | `order_id` |
| 2 | `customer_order_confirmation` | «تأكيد الطلب للعميل» | `store_name, order_id` | `order_id` |
| 3 | `payment_review` | «تنبيه مراجعة دفع يدوية (للتاجر)» | `order_id` | `order_id` |
| 4 | `order_shipping_update` | «تحديث حالة الشحن للعميل» | `order_id, store_name, status_label` | `order_id, status_label` |
| 5 | `payment_confirmed` | «تأكيد استلام الدفع» | `order_id` | `order_id` |
| 6 | `payment_failed` | «تعذّر تأكيد الدفع» | `order_id` | `order_id` |

`preview` is `render_template_safe(body, **sample)` with fixed sample values (`order_id 1042`, `order_total 185.00`, `status_label «قيد الشحن»`, …) plus the store's real `store_name`. `is_custom` tells the editor «نصّك المخصَّص» vs the default and offers «استعادة النص الافتراضي».

**`PATCH {body}`** (owner only):

| Outcome | Body |
|---|---|
| empty `body` | the customization is deactivated — the platform default returns (the custom row is kept but flagged off, like the legacy screen) |
| success | the refreshed template row (same shape as the GET) |
| `400` `{"body": ["1024 حرفاً كحد أقصى (حد واتساب)."]}` | longer than 1024 chars |
| `400` `{"body": ["متغير غير معروف: {{var}}."]}` | a variable not in `variables` |
| `400` `{"body": ["المتغير {{var}} إلزامي في هذا القالب."]}` | a `required` variable missing |
| `404` `{"detail": "القالب غير موجود."}` | id outside 1–6 |

#### `GET apps/whatsapp/connect-url/`

The **one-time** SharwaConnect pairing link: `{url, connected}`. Server-side it registers the store with SharwaConnect once (the legacy `whatsapp_open_sharwaconnect` path) then calls `create_store_invite`; `connected` is the live pairing status, best-effort — a status failure does not block the link. Failures: `502` with the SharwaConnect error, or `{"detail": "تعذّر إنشاء رابط الدخول للوحة شروة كونكت. حاول مجدداً."}`. The response carries `Cache-Control: no-store` — the invite must never be cached.

**Celery behind the scenes** — `dispatch_whatsapp_message` and `send_whatsapp_notification_async` deliver the messages; `order_events.notify_sharwaconnect_of_order_event` reacts to order status changes. All three create their `AppUsageLog` row through `create_pending_usage_log(order=…)` **before** sending (one row per message, whatever happens later).

## 5. Gaps closed, bugs fixed and migrations

- **Migration `products/0233_app_store_api`** — one field: `AppUsageLog.order`, a nullable FK to `Order` with `on_delete = SET_NULL` (the log row survives its order's deletion; the usage table gains its `order_id` link).
- **Bug fixed — activate while suspended**: silently refused before; now an explicit `403` «التطبيق معلَّق من المنصة — تواصل مع الدعم.».
- **Delisted-but-installed apps stay visible** with `is_listed: false` (§8) instead of disappearing from the store with their panels.

## 6. Open items and legacy-only behaviour

- **QR-pairing proxy** (`whatsapp_qr_start` / `qr_poll`, `config/urls_tenant.py`) — the old WhatsApp pairing by QR scan; superseded by the SharwaConnect panel (`connect-url`), kept for the legacy HTML screen only.
- **Monthly sent counter** on the old dashboard is legacy-only; the JSON contract exposes `summary/` instead.
- The mock router mirrors all twelve rows including the code translation and the template rules.

## 7. Related pages

- [`m31-sharwa-ai.md`](m31-sharwa-ai.md) — the Sharwa AI app (rides the same BFF catch-all on the `sharwa_ai` key).
- [`m32-support.md`](m32-support.md) — support sessions and tickets.
- [`../16-platform-console/m46-plans-billing.md`](../16-platform-console/m46-plans-billing.md) — how the platform prices apps (catalogue + billing overrides) · [`../16-platform-console/m45-dues-sharwa-pay-admin.md`](../16-platform-console/m45-dues-sharwa-pay-admin.md) — collecting the charges shown by `charges/`.
