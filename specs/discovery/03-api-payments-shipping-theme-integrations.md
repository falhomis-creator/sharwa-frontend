# Discovery 03 — API Surface, Payments, Shipping, Theme Engine, Integrations, Legacy Frontend

> Source: read-only sweep of `C:\sharwa_saas` on 2026-10-17. Nothing in the original project was modified.
> Backend stack: Django 6.1 + django-tenants 3.14 (schema-per-tenant PostgreSQL), DRF 3.18, drf-spectacular, Celery/Redis.

---

## 1. API Endpoint Table (`/api/v1/*`)

Routes: `api/urls.py`; views: `api/views.py`; serializers: `api/serializers.py`. The same include is mounted on the tenant URLConf (`config/urls_tenant.py:726`) **and** the public URLConf (`config/urls_public.py:82`).

| METHOD | Path | View | Purpose | Auth | Key request / response fields |
|---|---|---|---|---|---|
| GET | `/api/v1/config/` | `StoreConfigView` (`api/views.py:74`) | Store identity + theme + active home sections | None (`HasTenantContext`) | → `store_name, primary_color, secondary_color, background_color, text_color, heading_font, body_font, design_style, theme_preset, brand_shades{50..900}, theme_choice, logo, whatsapp_number, announcement_text, enable_announcement_bar, sections[]` |
| GET | `/api/v1/catalog/categories/` | `CategoryListView` (`:87`) | Category tree (roots + nested `subcategories`), no pagination | None | → `[{id, name, subcategories[]}]` |
| GET | `/api/v1/catalog/products/` | `ProductListView` (`:106`) | Product list + filters + search + pagination | None | `?category, brand, tag, collection, search, is_featured=true, currency, page, page_size` (20, max 50) → `{count, next, previous, results:[{id, name, image, category, display_price, display_old_price, stock, is_featured, is_free_shipping, payment_policy}]}` |
| GET | `/api/v1/catalog/products/<id>/` | `ProductDetailView` (`:164`) | Single product | None | list fields + `description, sizes_list[], colors_list[], deposit_required` |
| GET | `/api/v1/cart/` | `CartView` (`:223`) | Session cart | None, **session cookie** | `?currency` (sticky in session) → `{items:[{product_id,name,size,color,quantity,display_price,display_subtotal}], count, currency, display_subtotal}` |
| DELETE | `/api/v1/cart/` | `CartView.delete` | Empty cart | None | 204 |
| POST | `/api/v1/cart/actions/` | `CartActionView` (`:249`) | add / decrease / remove_line | None | ← `{product_id, size, color, action_type}` → `{cart_count, product_qty}` |
| GET/POST | `/api/v1/admin/sections/` | `AdminStoreSectionViewSet` (`:278`) | Home sections list/create | `IsAdminUser` + SessionAuth | `[{id, section_type, label, order, is_active, settings{}, content_data{}}]` |
| PATCH/PUT/DELETE | `/api/v1/admin/sections/<pk>/` | same | Update/delete | `IsAdminUser` | validated per `section_type` |
| POST | `/api/v1/admin/sections/reorder/` | `.reorder` (`:308`) | Bulk reorder | `IsAdminUser` | ← `{ordered_ids:[int]}` → `{ok, reordered}` |
| POST | `/api/v1/pwa/install-event/` | `PWAInstallEventView` (`:356`) | Install funnel tracking | None, 30/min/IP | ← `{event_type: prompt_shown\|ios_hint_shown\|accepted\|dismissed\|installed, source: django_storefront\|nextjs_app}` |
| GET | `/api/v1/push/vapid-public-key/` | `PushVapidPublicKeyView` (`:389`) | VAPID key | None | → `{publicKey}` |
| POST | `/api/v1/push/subscribe/` | `PushSubscribeView` (`:405`) | Store push subscription | None | ← `{endpoint, keys:{p256dh, auth}, customer_phone?}` |
| POST | `/api/v1/push/unsubscribe/` | `PushUnsubscribeView` (`:431`) | Deactivate | None | ← `{endpoint}` |
| GET/POST | `/api/v1/returns/` | `ReturnRequestListCreateView` (`:482`) | Merchant returns | merchant session + CSRF, perm `orders.process_returns` | `?status, q`; POST ← `{order_id, reason, refund_method, line_items:[{fulfillment_item_id, quantity_returned, restock}]}` |
| GET | `/api/v1/returns/order/<order_id>/items/` | `ReturnableItemsView` (`:604`) | Returnable lines | same | → `[{fulfillment_item_id, product_name, quantity, remaining, unit_refund_amount, location_name}]` |
| GET | `/api/v1/returns/<pk>/` | `ReturnRequestDetailView` (`:650`) | Return detail | same | |
| POST | `/api/v1/returns/<pk>/approve/` | `ReturnRequestApproveView` (`:666`) | Approve/reject, optimistic lock | same | ← `{decision: approve\|reject, version, location_id?}` → 409 on conflict |
| POST | `/api/v1/orders/b2b-draft/` | `B2BDraftCreateView` (`:737`) | B2B draft order | staff session, perm `orders.create_b2b` | ← `{customer_name, customer_phone, address, items:[{product_id, quantity}], approver_role_id?, location_id?, currency?}` |
| GET | `/api/v1/orders/b2b-drafts/` | `B2BDraftListView` (`:854`) | Pending drafts | perm `orders.create_b2b` | |
| POST | `/api/v1/orders/b2b-draft/<pk>/resolve/` | `B2BDraftResolveView` (`:873`) | Resolve approval | perm `orders.approve_b2b` | ← `{decision: approved\|rejected, version}` |
| POST | `/api/v1/agent/shipments/<id>/status/` | `AgentShipmentStatusView` (`:908`) | Courier status transition (idempotent) | staff session + CSRF | ← `{to_status, client_generated_uuid, event_time?, geo_lat?, geo_lng?, geo_accuracy_m?}` |
| POST | `/api/v1/webhooks/carrier/<carrier_code>/` | `CarrierWebhookView` (`:998`) | 3PL webhook | `X-Carrier-Signature` | ← `{waybill_number, status, event_time?, event_id?}` → 202 |
| POST | `/api/v1/agent/shifts/start/` | `AgentShiftStartView` (`:1046`) | Start courier shift | staff session | |
| POST | `/api/v1/agent/shifts/end-and-handover/` | `AgentShiftEndHandoverView` (`:1065`) | End / hand over shift | staff session | |
| POST | `/api/v1/agent/fulfillments/<id>/scan-pickup/` | `AgentScanPickupView` (`:1102`) | Barcode pickup | staff session | ← `{scanned_code}` |
| POST | `/api/v1/agent/fulfillments/<id>/partial-delivery/` | `AgentPartialDeliveryView` (`:1122`) | Partial delivery + COD | staff session | ← `{line_items, client_generated_uuid, geo_lat?, geo_lng?}` |
| POST | `/api/v1/returns/rma/create/` | `ReturnAuthorizationCreateView` (`:1183`) | Create RMA | staff session | ← `{order_id, fulfillment_item_id, destination_location_id, quantity?, reason}` |
| POST | `/api/v1/warehouse/returns/scan/` | `ReturnReceiptScanView` (`:1219`) | Scan return in | staff session | ← `{rma_id, location_id}` |
| POST | `/api/v1/warehouse/returns/<rma_id>/qa-decision/` | `ReturnQADecisionView` (`:1249`) | QA approve/reject | staff session | ← `{decision}` |
| GET | `/api/schema/`, `/api/docs/`, `/api/redoc/` | drf-spectacular | OpenAPI | None | prefix `/api/v1` |

### Critical gap — `[NEEDS BACKEND]`
No `/api/v1` endpoint exists for: customer auth, checkout/order creation, order list/detail, order tracking, coupons, shipping quotes, wallets, loyalty, payments, tracking-pixel IDs, or any merchant dashboard CRUD (products, orders, customers, staff…). Those exist only as Django HTML/AJAX views on the tenant URLConf, e.g.:

- `POST /checkout/` → `products.views.cart_checkout.checkout`
- `POST /cart/calculate-shipping/`, `/cart/apply-coupon/`, `/cart/remove-coupon/`
- `POST /checkout/cod-otp/send/`, `/checkout/cod-otp/verify/` (JSON `{ok, error}`)
- `POST /wallet/balance-preview/`, `/wallet/otp/send/`, `/loyalty/otp/send/`, `/loyalty/redeem/`
- `GET /orders/track/<uuid:public_uuid>/` → HTML order tracking (`products/views/storefront.py:644`)
- `GET /product/<id>/available-slots/`, `POST /product/<id>/book/` (bookings)
- `GET /theme.css` (dynamic per-store CSS), `GET /manifest.webmanifest`, `GET /sw.js`

The new frontend must either proxy these (BFF) or new `/api/v1` endpoints must be added. Each spec marks such dependencies `[NEEDS BACKEND]`.

---

## 2. Auth & Tenant Resolution Contract

### Tenant resolution (`api/middleware.py`, `config/settings.py:252-265`)
1. **Default**: subdomain → `tenants.Domain` → `tenants.Client.schema_name`. Stores live at `<subdomain>.<TENANT_BASE_DOMAIN>`.
2. **Header override**: `X-Store-Domain: <domain>` honoured **only under `/api/`**. 404 unknown domain, 403 inactive tenant, 403 if session already bound to another store.
3. `HasTenantContext` permission rejects with 403 on the public schema (Arabic message: استخدم النطاق الفرعي للمتجر أو أرسل ترويسة X-Tenant/X-Store-Domain).
4. `TenantProvisioningGuardMiddleware` returns **503 + Retry-After: 10** while `provisioning_status != 'ready'`. Enum: `pending | provisioning | ready | failed`. Poll `GET /register/status/<signed token>/` → `{status}`.

### Authentication — no JWT, no API key for storefront
```python
REST_FRAMEWORK = {
  'DEFAULT_AUTHENTICATION_CLASSES': [],
  'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
  'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
  'PAGE_SIZE': 20,
  'DEFAULT_THROTTLE_RATES': {'anon': '120/minute'},
}
```
- **Public storefront API**: no auth; isolation = DB schema. Cart identity = Django session cookie → client must send `credentials: 'include'`. Currency sticky in `session['user_currency']`.
- **Merchant dashboard API**: `MerchantSessionAuthentication` (`api/authentication.py`) — `session['is_merchant_authenticated']` or `request.staff`; **CSRF enforced** (`X-CSRFToken`). Store owner has **no `auth.User` row** (password in `StoreSetting.admin_password`). Permissions via `permission_code` + `products/services/permission_resolver.py`.
- **Section admin viewset**: DRF SessionAuth + `IsAdminUser` (tenant-schema superuser).
- Login/logout are HTML POST views: `/dashboard/login/`, `/dashboard/logout/`, `/dashboard/setup-password/`, `/dashboard/forgot-password/`, `/dashboard/reset-password/`, staff `/dashboard/staff/login/`.
- **Customers have no accounts** — phone + WhatsApp OTP everywhere (`0770841802 → 967770841802`).

### Error format
DRF defaults: `{"detail": "<Arabic>"}` or `{"field": ["msg"]}`. Status conventions: 400 validation, 401 no session, 403 permission/tenant/inactive, 404, **409 concurrency/business conflict**, 429 throttle, 503 provisioning.

### CORS / CSRF (`config/settings.py:47-81`)
- `CORS_ALLOWED_ORIGINS` from env (never `*`), `CORS_ALLOW_CREDENTIALS=True`; `corsheaders` optional (design assumes same-origin Next.js proxy).
- `CSRF_TRUSTED_ORIGINS` + auto `https://[*.]<TENANT_BASE_DOMAIN>`.
- `SESSION_COOKIE_SAMESITE` default `Lax`, `CSRF_COOKIE_HTTPONLY=True` → CSRF token must come from a server-rendered value (legacy used `<meta name="csrf-token">`).

### Pagination & filtering
`?page=`/`?page_size=`; hand-rolled filters (no django-filter). Money is returned **pre-formatted** (`display_price`) — never format currency client-side.

---

## 3. Payments / Wallets / Payouts — exact enums

### Currencies (`sharwapay/constants.py`)
`WALLET_CURRENCY_CHOICES = [('SAR','ريال سعودي'), ('USD','دولار أمريكي'), ('YER_OLD','يمني صنعاء'), ('YER_NEW','يمني عدن')]` — multi-currency with **no conversion**.

### SharwaPay (public schema, `sharwapay/models.py`)
- `SharwaPayWallet`: `customer_phone` (unique), `customer_name`, 4 balances `Decimal(12,2)`, `is_active`. Only write path: `SharwaPayWalletManager.credit/debit` (atomic + select_for_update + audit row).
- `SharwaPayWalletTransaction` (append-only): `TRANSACTION_TYPE = ['credit','debit']`; `REASON = ['topup_manual','topup_auto','purchase','purchase_refund','withdrawal','withdrawal_reversal','platform_fee']`; `source_tenant_schema`, `source_order_id`, `balance_after`.
- `SharwaPayTopupRequest`: `STATUS = ['pending' قيد المراجعة, 'approved' مقبول, 'rejected' مرفوض]`; `bank_transaction_id` unique; `receipt_image`; `credited_at`.
- `SharwaPayWithdrawalRequest`: `STATUS = ['pending', 'approved' مُنفَّذ, 'rejected']`; amount debited immediately on request, reversed on reject.
- Customer flows (HTML, `tenants/sharwa_pay_views.py`): `/sharwa-pay/`, `/sharwa-pay/otp/send/`, `/topup/`, `/withdraw/`, `/logout/`. SW caches nothing.

### Tenant-side payments (`products/models/orders.py`, `store_settings.py`, `products/payments/`)
- `Order.PAYMENT_METHOD_CHOICES = ['manual','sharwa_pay']` (field accepts any gateway code)
- `Order.STATUS_CHOICES = ['pending_payment','new','awaiting_payment','payment_review','completed','cancelled','refunded']`
- `Order.PAYMENT_STATUS_CHOICES = ['unpaid','pending','partial','paid','failed','indeterminate']`
- `Order.SALES_CHANNEL_CHOICES = ['online','pos','b2b_draft','phone']`
- `Order.TRAFFIC_SOURCES`: tiktok / whatsapp / instagram / snapchat / facebook / telegram / direct
- `Order.fulfillment_status` → FK to merchant-defined `OrderStatus` (name, colour, `releases_stock`, `marks_completed`)
- `OrderRefund.METHOD_CHOICES = ['wallet','sharwa_pay','manual','wallet_credit']`
- `PaymentIntent.METHOD = ['wallet','gateway','cod','gift_card']`; `STATUS = ['pending','completed','failed','refunded']`
- `PaymentCredential`: per-store `gateway_code` unique, `credentials_encrypted` (Fernet)
- `PayoutAccount.ACCOUNT_TYPE = ['bank','wallet']` (display-only)
- Gateway registry: `GATEWAY_REGISTRY = {jeeb, kuraimi}`
- Customer `Wallet`/`WalletTransaction` (per store, SAR only): `REASON = ['manual_topup','refund','reward','order_payment','adjustment','loyalty_redeem']`
- `MerchantWallet` (singleton pk=1, multi-currency) + `MerchantWithdrawalRequest`
- Platform dues: `PlatformCommissionRecord` / `AppBillingCharge` → `.collect()` → debit SharwaPay `platform_fee` (manual admin action only)
- Bank webhook: `POST /webhooks/kuraimi/topup/` with `X-Kuraimi-Token`

---

## 4. Shipping — exact enums

### Platform pricing (public, `sharwa_ship/models.py`)
`SharwaShipZone`: `code`, `name`, `price` (merchant cost per waybill), `currency`, `volumetric_divisor` (5000), `center_latitude/longitude`, `radius_km`, `is_active`, `sort_order`.

### Waybill (tenant, `products/models/shipping.py`)
`ShipmentOrder` (FK Order, 1:1 Fulfillment, `waybill_number` `SHW-<ts>`, `carrier_code` default `sharwa_ship`, snapshots, `master_waybill_number`, `parent_shipment`):
```
STATUS = ['label_pending','pending_pickup','picked_up','in_transit','delivered','returned','cancelled','compensated_lost']
BILLING_STATUS = ['pending','collected','waived']
```
`ShipmentEvent` (immutable, `idempotency_key`): `SOURCE = ['webhook','agent_app','merchant_manual','system']`, `from_status`, `to_status`, geo, `is_rejected`, `out_of_order`, `flagged_for_review`.
`PackagingProfile`, `PendingAWBQueue.STATUS = ['pending','processing','issued','failed']`, `CarrierRateCardSnapshot`.

### Courier fleet (`products/models/courier.py`)
`CourierShift`; `CourierCustodyLedger.ENTRY_TYPE = ['collected_cod','handed_over','lost','written_off','reversed']`.

### Returns (`products/models/returns.py`, `reverse_logistics.py`)
`ReturnRequest.STATUS = ['requested','approved','rejected','processing','completed']`; `REFUND_METHOD = ['original_payment','cash','wallet','store_credit']`; `version` optimistic lock. `ReturnLineItem` → `FulfillmentItem`.
`ReturnAuthorization.REASON = ['customer_rejected','damaged','wrong_item','bundle_partial_return']`; `STATUS = ['requested','in_transit_back','received_at_warehouse','qa_pending','restocked','rejected_disposal','closed']`; `FEE_PAYER = ['customer','merchant','platform']`.

### Carriers (`products/carriers/`)
`CARRIER_REGISTRY = {aramex, smsa}`; `CarrierAdapter` ABC (`create_shipment/track/cancel/get_label_url`, `credential_fields`). Webhook secrets `CARRIER_WEBHOOK_SECRETS = {aramex, smsa, sharwa_ship}`. Public `tenants.WaybillRegistry` routes waybills to schemas.

---

## 5. Theme Engine (`docs/THEME_ENGINE_ARCHITECTURE.md`)

Zero new tables — fields on `StoreSetting` singleton (`products/models/store_settings.py:102`):

| Field | Default | Notes |
|---|---|---|
| `primary_color` | `#4F46E5` | derives 10-step `brand_shades` `'50'..'900'` |
| `secondary_color` | `#1E293B` | |
| `background_color` / `text_color` / `card_border_color` | `#f8fafc` / `#0f172a` / `#e2e8f0` | |
| `heading_font` / `body_font` | `Tajawal` | 11 RTL fonts: Alexandria, Tajawal, Cairo, Almarai, IBM Plex Sans Arabic, Changa, Reem Kufi, El Messiri, Noto Kufi Arabic, Amiri, Rubik |
| `theme_preset` | `modern_trust` | free text; `custom` when edited |
| `design_style` | `fluid` | `<body data-style>` |
| `theme_choice` | `default` | template dir |
| announcement bar | | `enable_announcement_bar`, `announcement_text`, `_bg_color`, `_text_color`, `_scroll_speed (slow\|medium\|fast)`, `show_banner_on_home/_products/_product_detail/_checkout` |
| FX & currency | | `sar_to_yer_old` 140, `sar_to_yer_new` 520, `usd_to_sar` 3.75, `currency` |
| `timezone` `Asia/Aden`, `week_start_day` `sunday\|monday` | | |
| commerce flags | | `free_shipping_threshold`, `default_delivery_fee`, `multi_location_enabled`, `enable_manual_payment`, `enable_sharwa_pay` |
| SEO/social | | `seo_title/description/keywords/og_image`, `contact_email`, `facebook_link`, `instagram_link`, `tiktok_link`, `snapchat_link`, `about_us`, `return_policy` |

Presets (`products/theme_presets.py`): `modern_trust`, `luxury_boutique`, `organic_earth`, `tech_cyber`, `bold_streetwear`, `aurora_glass`, `neo_brutalism`, `cinematic_silk`, `clay_zen`.

Sections (`StoreSection`): `SECTION_TYPE = ['hero','category_strip','featured_products','latest_products','slider','banner_grid','product_grid','promotional_offers']`; singleton types = first four + `promotional_offers`; addable = `slider, banner_grid, product_grid`. `settings{title, category_id, limit, show_on_mobile}`; `content_data`: slider/banner_grid `{items:[{image, title, link}]}`, product_grid `{category_id, limit, title}`.

CSS delivery: `GET /theme.css` emits `--color-primary-50..900`, `--color-secondary`, `--color-bg`, `--color-text`, `--color-card-border`. Merchant editing: `/dashboard/design/` (POST) + AJAX section endpoints `/dashboard/design/sections/*`.

---

## 6. Integrations

### Tracking pixels — `TrackingSettings` singleton (`store_settings.py:571`)
`is_tracking_enabled`, `meta_pixel_id`, `tiktok_pixel_id`, `snapchat_pixel_id`, `gtm_container_id`, `ga4_measurement_id`, `google_ads_conversion_id`, `google_ads_conversion_label`, `meta_conversions_api_token`, `tiktok_events_api_token`. UI `/dashboard/tracking-tools/`. **Not on `/api/v1`** `[NEEDS BACKEND]`.

### Inbound webhooks (public schema)
`/webhooks/kuraimi/topup/`, `/webhooks/sharwaconnect/` (WhatsApp, HMAC), `/webhooks/sharwa-ai/session-status/` + `/inbound-message/`, `/webhooks/meta/`, `/webhooks/tiktok-shop/`, `/webhooks/telegram/<bot_id>/`, `/webhooks/suppliers/<code>/<token>/`, `/api/v1/webhooks/carrier/<code>/`. Routing via `WhatsAppSessionIndex`, `ChannelSessionIndex`, `WaybillRegistry`.

### Outbound
Only Sharwa-AI cart publisher (`SHARWA_AI_WEBHOOK_URL`). **No general merchant webhook subscriptions** `[NEEDS BACKEND]` for module 19.

### Dashboard integration modules (`config/urls_tenant.py`)
- WhatsApp app `/dashboard/apps/whatsapp/*`
- Sharwa AI support `/dashboard/apps/sharwa-ai/*` (+ SSO console via RS256 JWKS)
- Social channels `/dashboard/social-channels/*` (Meta, TikTok OAuth, Telegram), unified inbox `/dashboard/conversations/`, keyword triggers
- Marketplaces `/dashboard/marketplaces/*` (Amazon SP-API, noon)
- Dropshipping `/dashboard/dropshipping/*` (CJ suppliers, pricing rules, feeds, supplier orders)
- App marketplace: `appstore.App`, `AppBillingOverride`, `StoreAppInstallation`, `AppInstallationEvent`, `AppUsageLog`, `AppTemplate`
- Web Push: `PushSubscription` + VAPID

---

## 7. Legacy Frontend (`C:\sharwa_saas\frontend`) — PWA proof-of-concept only

- Next 15.1.6, React 19, RTK Query, Tailwind 3. Routes: `/` placeholder, `/manifest` dynamic per-store manifest (fetches `/api/v1/config/` with forwarded Host / `X-Store-Domain`).
- `ThemeProvider` derives shadcn vars from `primary_color`; `PushSubscribeButton` reads CSRF from `<meta>`.
- API client: same-origin `/api/v1` via `next.config.js` rewrites → `API_PROXY_URL || API_INTERNAL_URL || http://localhost:8000`. **No token storage**.
- `public/sw.js`: network-only for `/api/v1/cart` and `/config`; network-first for other API; cache-first images/fonts.
- Token-naming mismatch: backend emits `--color-primary-N`, legacy app derives `--primary` etc. New frontend should map `brand_shades` → its own tokens.

---

## 8. Settings & Env Vars (names only)

- Tenancy: `TENANT_MODEL='tenants.Client'`, `TENANT_DOMAIN_MODEL='tenants.Domain'`, `ROOT_URLCONF='config.urls_tenant'`, `PUBLIC_SCHEMA_URLCONF='config.urls_public'`. SHARED_APPS: tenants, core, billing, sharwapay, appstore, marketing, sharwa_ship. TENANT_APPS: products, api.
- i18n: `LANGUAGE_CODE='ar-sa'`, `TIME_ZONE='Asia/Riyadh'`; UI Arabic/RTL only.
- Media served by Django only when `DEBUG`; product images prefer external `image_url`.
- Frontend-relevant env: `TENANT_BASE_DOMAIN`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `VAPID_PUBLIC_KEY`, `META_APP_ID`, `TIKTOK_APP_KEY`, `SHARWA_AI_CONSOLE_URL`, `AMAZON_SP_APP_ID`; Next side `API_PROXY_URL`, `API_INTERNAL_URL`.

---

## 9. Implications for the new frontend

1. Honour the stable contract: `/api/v1/config/`, `/catalog/*`, `/cart*`, `/push/*`, `/pwa/install-event/`. Generate a typed client from `/api/schema/`.
2. Tenant resolution: run storefront on `<store>.<TENANT_BASE_DOMAIN>` (Host routing) or use `X-Store-Domain` under `/api/` only.
3. **Cookies are load-bearing** (cart, currency, merchant session, CSRF). Keep a same-origin BFF proxy (`next.config` rewrites) or fix CORS + SameSite. CSRF token must be server-rendered.
4. Expect to add endpoints: checkout, orders, tracking, coupons, shipping quotes, wallets, loyalty, pixels, and all dashboard CRUD.
5. Money: use server `display_*` strings; `?currency=` ∈ `SAR | USD | YER_NEW | YER_OLD`.
6. `/sw.js` ownership per origin must be decided (storefront SW vs SharwaPay SW vs Next SW).
