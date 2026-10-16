# Discovery 01 — Multi-tenancy, Merchant Dashboard, Onboarding, Plans, Super Admin

> Source: read-only sweep of `C:\sharwa_saas` on 2026-10-17. Nothing in the original project was modified.
> Backend: Django 6.1 + PostgreSQL + django-tenants (schema-per-tenant). All current UI = server-rendered Django templates + Tailwind CDN, RTL Arabic.

---

## 1. Multi-tenancy & Routing

| Aspect | Value | File |
|---|---|---|
| Isolation | PostgreSQL schema-per-tenant | `config/settings.py:113-115` |
| Tenant / Domain models | `tenants.Client` / `tenants.Domain` | `config/settings.py:205-206` |
| URLconfs | tenant `config.urls_tenant`, public `config.urls_public` | `config/settings.py:288-289` |
| Base domain | `TENANT_BASE_DOMAIN` (default `localhost`, prod `sharwaah.com`) | `config/settings.py:30-33` |
| Store domain | `<subdomain>.<TENANT_BASE_DOMAIN>` | `tenants/validators.py:53-55` |
| Custom domains | `Domain` rows (`is_primary`) — **admin-only, no merchant UI** | `tenants/admin.py:271-277` |
| Admin URL | `/sharwa-secure-gate/` on public (platform) and tenant (per-store) | |
| Shared apps | tenants, core, billing, sharwapay, appstore, marketing, sharwa_ship, rest_framework, drf_spectacular | |
| Tenant apps | products, api | |

**Middleware chain**: `RealIpMiddleware` → `TenantMainMiddleware` → `TenantHeaderOverrideMiddleware` (`X-Store-Domain` under `/api/`) → `TenantProvisioningGuardMiddleware` (503 + `Retry-After: 10` while not `ready`) → Session/UTM/CSRF/Auth → `StaffSessionMiddleware`.

**Reserved subdomains** (`tenants/validators.py:17-22`):
```
www, admin, administrator, root, api, dashboard, mail, email, support, help,
app, sharwa, sharrwah, static, media, test, demo, staging, public, localhost, ai, console
```
Format: `^[a-z0-9]+$`.

Context processors: `products.context_processors.report_groups` (Reports sidebar tree), `billing.context_processors.feature_flags` (lazy `features`).

---

## 2. Models

### 2.1 `tenants/models.py` (public)
| Model | Purpose | Key fields | Enums |
|---|---|---|---|
| `Client` | Store/tenant | `name`, `schema_name`, `merchant_phone` (unique), `interested_categories` M2M, `terms_accepted_at`, `is_active`, `created_on`, `provisioning_status`, `provisioning_started_at`, `provisioned_at`, `provisioning_error`; props `is_provisioned`, `current_subscription`, `current_plan` | `provisioning_status`: `pending, provisioning, ready, failed` |
| `Domain` | subdomain/custom domain | `domain`, `tenant`, `is_primary` | |
| `MerchantAccount` | owner of multiple stores | `owner_phone` (unique), `owner_identity` | |
| `MerchantAccountClient` | account ↔ client | | |
| `WhatsAppSessionIndex` / `ChannelSessionIndex` | webhook routing to schema | `session_id` / (`channel_code`, `external_ref`) → `schema_name` | |
| `ThirdPartyLogisticsProvider` / `…ClientAgreement` | 3PL registry | `carrier_code`, `credentials_encrypted`, `commission_rate` | `credential_source`: `platform_shared, merchant_own` |
| `TenantStatsSnapshot` | daily per-store stats | `date`, `orders_count`, `completed_orders_count`, `refunded_orders_count`, `revenue_sar` | |
| `WaybillRegistry` | waybill → schema | | |
| `PendingWebhookEvent` | dead-letter queue | | `status`: `pending, resolved, discarded` |
| `TenantDeactivationRecord` | suspension lifecycle | `grace_period_ends_at`, `settled_custody`, `reason` | `status`: `suspended, deactivated, closed` |

### 2.2 `billing/models.py`
| Model | Key fields | Enums |
|---|---|---|
| `Plan` | `name`, `code`, `description`, `is_free`, `price`, `currency`, `billing_interval`, `commission_type`, `commission_value`, `max_products`, `max_orders_per_month`, `is_active`, `is_default_free`, `display_order` | `billing_interval`: `monthly, yearly, lifetime`; `commission_type`: `none, percentage, fixed`; `currency`: `SAR, USD, YER_OLD, YER_NEW` |
| `Subscription` | `client`, `plan`, `status`, `is_current`, `started_at`, `current_period_end`, `cancelled_at`; `assign_plan()` | `status`: `active, cancelled, expired` |
| `PlatformBillingSettings` (pk=1) | `subscriptions_enabled` (False), `commission_enabled` (False) | |
| `Feature` | `code`, `name`, `description`, `module_group`, `is_active_globally`, `requires_plan` | |
| `PlanFeature` | `plan`, `feature`, `is_enabled` | |
| `TenantFeatureOverride` | `feature`, `client`, `is_enabled`, `notes` | |

**Feature-gate order** (`billing/models.py:176-196`): override → global kill switch → `requires_plan=False` ⇒ True → `subscriptions_enabled=False` ⇒ True → `PlanFeature`.

### 2.3 `appstore/models.py` + tenant counterparts
`App` (`code`, `name`, `description`, `icon`, `is_listed`, `is_free`, `price`, `currency`, `billing_interval` `monthly|yearly`, `billing_enabled`), `AppBillingOverride`.
Tenant: `StoreAppInstallation` (`app_code`, `is_active`, `suspended_by_platform`, `subscription_expires_at`), `AppUsageLog.status` `queued, sent, delivered, read, failed, skipped`; `AppInstallationEvent.event` `installed, activated, deactivated, subscription_renewed, subscription_expired, suspended_by_platform, reactivated_by_platform`; `AppTemplate`.
Dues: `PlatformCommissionRecord.status` / `AppBillingCharge.status` = `pending, collected, waived`.

### 2.4 `core/models.py`
`CentralCustomerTrust` (cross-store COD trust: `phone_number`, `successful_cod_orders`, `failed_cod_orders`, `risk_percentage`), `OTPRequestTracker`.
`core/uploads.py`: paths `<schema>/<base>/<file>`; `IMAGE_EXTENSIONS = jpg,jpeg,png,webp,gif` (no SVG); `DOCUMENT_EXTENSIONS = pdf,jpg,jpeg,png,webp`; `FEED_EXTENSIONS = csv,tsv,txt,xlsx`.

### 2.5 `marketing/models.py`
`MarketCategory` (`name`, `display_order`, `is_active`) — signup sector checkboxes only.

### 2.6 `products/models/` — 38 modules
`audit, base, behavior, billing, bookings, carts_recovery, catalog, courier, customer_interactions, locations, loyalty, marketing, marketplaces, negotiation, operations, orders, pwa, reports, returns, reverse_logistics, shipping, social_channels_catalog, social_channels_inbox, social_channels_keywords, social_channels_routing, staff_approvals, staff_pos, staff_rbac, staff_sessions, stock, store_settings, suppliers, suppliers_dropship, support, wallets, zones` (details in Discovery 02).

---

## 3. URL Route Groups

### 3.1 PUBLIC (`config/urls_public.py`)
| Module | Pattern | View |
|---|---|---|
| Super admin | `sharwa-secure-gate/` | admin |
| Landing | `/` | `public_home` |
| Onboarding | `register/`, `register/check-subdomain/`, `register/verify-otp/`, `register/status/<token>/` | `register_tenant`, `check_subdomain_availability`, `verify_tenant_otp`, `tenant_provisioning_status` |
| Super Admin dashboards | `master-dashboard/`, `master-dashboard/dues/` | `platform_master_dashboard`, `platform_dues_dashboard` |
| Sharwa Pay PWA | `sharwa-pay/`, `/otp/send/`, `/topup/`, `/withdraw/`, `/logout/`, `manifest.json`, `sw.js` | |
| Webhooks | kuraimi, sharwaconnect, sharwa-ai, meta, tiktok-shop, telegram, suppliers | |
| API | `api/v1/`, `api/schema/`, `api/docs/`, `api/redoc/` | |
| Sharwa AI | `sharwa-ai/commerce/*`, `.well-known/sharwa-ai-jwks.json` | |

### 3.2 TENANT (`config/urls_tenant.py`) — grouped view names
- **Storefront**: `product_list` (`/`), `product_detail`, `toggle_wishlist`, `submit_review`, `subscribe_back_in_stock`, `wishlist`, `about_us`, `order_status_public`, `theme_css`, `pwa_manifest`, `pwa_service_worker`, `set_currency`.
- **Cart/Checkout**: `cart_detail`, `add_to_cart`, `clear_cart`, `apply_coupon`, `remove_coupon`, `calculate_shipping`, `restore_abandoned_cart`, `checkout`, `gift_checkout`, `send_cod_otp`, `verify_cod_otp`, `book_appointment`, `available_slots_api`, `wallet_balance_preview`, `wallet_otp_send`, `sharwa_pay_checkout_otp_send`, `loyalty_otp_send`, `redeem_loyalty_points`.
- **Dashboard auth**: `setup_admin_password`, `merchant_login`, `merchant_logout`, `forgot_password`, `reset_password`, `staff_login`, `staff_logout`, `staff_home`.
- **Overview/Orders**: `merchant_dashboard`, `order_list`, `create_order`, `order_statuses` (+add/delete/set_default), `update_order_status`, `update_order_fulfillment_status`, `confirm_payment_received`, `adjudicate_payment_approve/_reject`, `order_detail_api`, `order_refunds_list`, `return_requests_list`, `order_refund_form`, `gift_notice`, `assign_order_shipping`, `order_waybill`, `merchant_master_dashboard`.
- **Products/Variants/Templates**: `product_list_hub`, `add_product`, `edit_product`, `delete_product`, `product_template_*`, `template_attributes_api`, attach/detach template attribute, tier prices, related products, bundle components, compatibility rules, `variant_hub`, variant attribute/option CRUD, `apply_variant_template`, `add_category`, `organization`, `export_products_csv`, `import_products_csv`, `bulk_upload_products`, `product_report`.
- **Inventory/Locations**: `inventory_hub`, `update_product_stock`, `product_analytics`, `location_*`, `toggle_multi_location_mode`, `location_inventory`, `set_location_inventory`, `location_staff`, `location_routing_rules`.
- **Suppliers/POs**: `supplier_list`, `purchase_order_list|create|detail|cancel|submit|resolve|receive`.
- **Customers**: `customer_report`, `customer_wallets_list`, `wallet_create`, `wallet_detail`, `wallet_topup`.
- **Marketing**: `marketing_hub`, `merchant_offers`, coupon CRUD, `marketing_bar`, `abandoned_carts`, `abandoned_cart_settings`, `send_abandoned_cart_reminder`, `tracking_tools`, `influencers`, `affiliates_list`, `promotions_list`, `campaigns_*`, `timeline_*`, `loyalty_settings`, `gift_settings`.
- **Theme**: `storefront_design`, `save_store_sections`, `save_store_section_settings`, `save_store_theme_preset`, `add_store_section`, `delete_store_section`, `save_store_section_content`.
- **Settings**: `store_settings`, `contact_info`, `store_policies`, `shipping_settings`, `currency_settings`, `seo_settings`.
- **Payments**: `payment_gateways`, `save_sharwa_pay_toggle`, `local_wallets`, `bank_transfers`, `save_manual_payment_toggle`, payout accounts CRUD, `merchant_wallet`, `merchant_withdrawal_request`.
- **Shipping**: `pickup_locations`, `shipping_companies`, `shipping_providers`, `sharwa_ship_waybills`, `issue_sharwa_ship_waybill`, `sharwa_ship_shipment_events`, `agent_shipment_*`, `agent_shift*`, `courier_supervisor`, `emergency_reassign`, `carrier_settings`, `reverse_logistics`, `rma_*`, `edge_cases`, `packaging_profiles`, `zone_review`, `update_address_in_transit`, `convert_order_to_pickup`.
- **Staff/RBAC/POS**: `staff_list`, `staff_roles`, `staff_detail`, `end_staff_session(s)`, `shift_hub`, `open_shift`, `close_shift`, `cash_drawer`, `add_cash_movement`, `resolve_shift_variance`, `approval_requests`, `resolve_approval`, `audit_log`, `verify_audit_chain`, `behavior_alerts`, `staff_export_customers`.
- **Reports**: `merchant_reports`, `refresh_today_metrics`, `my_exports`, `enqueue_report_export`, `report_export_status`, `report_export_download`, `scheduled_reports`, `report_detail/<code>`, `send_test_push_notification`.
- **Operations/Support**: `operating_expenses`, `support_tickets`, `support_sessions_*`.
- **Bookings**: `bookings_calendar`, `booking_services_list`, `manage_service_availability`.
- **Apps**: `app_marketplace`, `whatsapp_app_*`, `sharwa_ai_*`.
- **Social channels**: `social_channels_hub`, Meta/TikTok OAuth, `telegram_connect`, catalog settings/sync, `tiktok_category_mapping`, templates, `channel_inbox_*`, `convert_conversation_to_order`, `channel_keywords_*`, `channel_staff_access`.
- **Marketplaces**: `marketplaces_hub`, Amazon OAuth, `noon_connect`, settings, `marketplace_pull_orders_now`, `marketplace_refresh_fba_inventory`, `marketplace_listings*`, `marketplace_sync_jobs*`.
- **Dropshipping**: `dropshipping_hub`, pricing rules, feeds (new/mapping/preview/approve/run/errors), connect/disconnect, settings, inventory sync, webhook rotate, orders, catalog, products, job status.

---

## 4. Merchant Dashboard Sidebar (verbatim, `products/templates/products/partials/_sidebar.html`)

```
Header: 🏪 {{ store_name|default:"متجري" }} → merchant_dashboard
Quick search (q) → order_list — "ابحث… رقم الطلب أو اسم العميل"

1. الطلبات
   ├─ كل الطلبات → order_list
   ├─ إنشاء طلب جديد → create_order
   ├─ حالات الطلب → order_statuses
   ├─ سجل الاسترجاعات → order_refunds_list [refunds]
   └─ الاسترجاعات (الفروع) → return_requests_list [refunds]
1ب. المحادثات (+unread badge) → channel_inbox_list [social_channels]
2. المنتجات
   ├─ جميع المنتجات → product_list_hub
   ├─ نماذج المنتجات → product_template_list
   ├─ نماذج المتغيرات → variant_hub
   ├─ التصنيفات → product_list_hub?tab=categories
   ├─ التنظيم والاكتشاف → organization
   ├─ استيراد CSV → import_products_csv
   ├─ المخزون → inventory_hub [inventory]
   ├─ الموردون وأوامر الشراء → supplier_list
   ├─ المواقع → location_list [multi_location]
   ├─ تقرير المنتج → product_report [product_report]
   └─ الرفع السريع → bulk_upload_products [bulk_upload]
3. التسويق → marketing_hub
   ├─ العروض والكوبونات وشريط الإعلانات → merchant_offers [coupon]
   ├─ السلات المتروكة والاسترداد الآلي → abandoned_carts [abandoned_carts]
   ├─ أدوات التتبع → tracking_tools [tracking_tools]
   ├─ المؤثرين → influencers [influencers]
   ├─ العروض الترويجية → promotions_list [promotions]
   ├─ الحملات التسويقية → campaigns_list [campaigns]
   ├─ الجدول الزمني → timeline_list [timeline]
   ├─ التسويق بالعمولة → affiliates_list [affiliates]
   ├─ برنامج الولاء → loyalty_settings [loyalty_settings]
   └─ الإهداء → gift_settings [gift_settings]
📅 الحجوزات → bookings_calendar [bookings]
   ├─ تقويم الحجوزات
   └─ الخدمات القابلة للحجز وساعات توفرها → booking_services_list
4. المتجر الإلكتروني
   ├─ تصميم المتجر → storefront_design [storefront_design]
   ├─ ترتيب الأقسام → storefront_design#sections-builder
   ├─ معلومات التواصل → contact_info [contact_info]
   └─ الصفحات الإضافية (سياسة الاسترجاع) → store_policies [store_policies]
5. قنوات البيع
   ├─ التواصل الاجتماعي والمحادثات → social_channels_hub [social_channels]
   ├─ الأسواق الإلكترونية (أمازون، نون) → marketplaces_hub [marketplaces]
   └─ استيراد المنتجات والدروبشيبينغ → dropshipping_hub [dropshipping]
6. العملاء
   ├─ تقرير العميل → customer_report [customer_report]
   └─ محافظ العملاء → customer_wallets_list [customer_wallets]
7. الموظفون والصلاحيات [staff_rbac]
   ├─ الموظفون → staff_list
   ├─ الأدوار والصلاحيات → staff_roles
   ├─ الورديات ودرج الكاش → shift_hub
   ├─ طلبات الموافقة المعلّقة (+count) → approval_requests
   ├─ سجل التدقيق → audit_log
   └─ التنبيهات السلوكية (+unread) → behavior_alerts
8. التقارير [reports] — dynamic accordion: 10 categories × 42 reports («قريباً» for unavailable)
9. مركز الدعم
   └─ جلسات الدعم الفني → support_sessions_list
10. الشحن والتوصيل
   ├─ رسوم التوصيل → shipping_settings [shipping_settings]
   ├─ نقاط الاستلام → pickup_locations [pickuplocation]
   ├─ شركات الشحن → shipping_companies [shipping_companies]
   ├─ مندوبو الشحن → shipping_providers [shipping_providers]
   ├─ شروة شيب → sharwa_ship_waybills [sharwa_ship]
   ├─ ملفات التغليف → packaging_profiles
   ├─ مراجعة المناطق → zone_review
   ├─ مندوبو الشحن (إشراف) → courier_supervisor
   ├─ شركات الشحن الخارجية → carrier_settings
   ├─ المرتجعات → reverse_logistics
   ├─ الحالات الحدّية → edge_cases
   └─ مناوبات المندوبين → agent_shift
11. الدفع
   ├─ ربط بوابات الدفع → payment_gateways [payment_gateways]
   ├─ المحافظ المحلية → local_wallets [local_wallets]
   └─ التحويل البنكي → bank_transfers [bank_transfers]
12. الأدوات المساعدة
   ├─ أسعار الصرف → currency_settings [currency_settings]
   └─ إعدادات SEO → seo_settings [seo_settings]
13. السجلات «قريباً» (disabled)
14. محفظة المتجر → merchant_wallet [merchantwallet]
    المصروفات التشغيلية → operating_expenses
    تذاكر الدعم → support_tickets
15. متجر التطبيقات → app_marketplace [app_marketplace]
FOOTER: الإعدادات → store_settings
```
Notes: no desktop topbar (no user menu, store switcher, notification bell). Mobile = right-side drawer.

---

## 5. Dashboard Page Templates by Module (`products/templates/products/`)
- **Layout**: `base.html`, `base_dashboard.html`, `partials/_sidebar.html`, `_inline_guidance`, `_tracking_scripts`, dropship partials, `_storefront_pagination`.
- **Auth**: `merchant_login`, `setup_password`, `forgot_password`, `reset_password`, `staff_login`.
- **Overview**: `dashboard_home.html`.
- **Orders**: `order_list`, `create_order`, `order_statuses`, `order_refunds_list`, `order_refund_form`, `return_requests_list`, `gift_notice`, `waybill_print`.
- **Products**: `product_list`, `product_form`, `add_product`, `product_quick_add`, `product_templates_list`, `product_template_form`, `variant_hub`, `variant_attribute_form`, `organization`, `import_products`, `bulk_upload`, `product_report`, `product_analytics`.
- **Inventory/Locations**: `inventory_hub`, `location_list`, `location_form`, `location_inventory`, `location_staff`, `location_routing_rules`.
- **Suppliers**: `suppliers`, `purchase_orders`, `purchase_order_form`, `purchase_order_detail`.
- **Customers**: `customer_report`, `customer_wallets_list`, `wallet_detail`.
- **Marketing**: `marketing_hub`, `offers_management`, `edit_coupon`, `marketing_bar`, `abandoned_carts`, `abandoned_cart_settings`, `tracking_tools`, `influencers`, `affiliates_list`, `promotions_list`, `edit_promotional_offer`, `campaigns_list`, `campaign_form`, `campaign_send_preview`, `marketing_timeline`, `timeline_event_form`, `loyalty_settings`, `gift_settings`.
- **Bookings**: `bookings_calendar`, `booking_services_list`, `booking_service_availability`.
- **Theme**: `storefront_design`, `theme_settings`.
- **Settings**: `settings`, `general_settings`, `contact_info`, `store_policies`, `shipping_settings`, `currency_settings`, `seo_settings`.
- **Payments**: `payment_gateways`, `gateways`, `local_wallets`, `bank_transfers`, `merchant_wallet`.
- **Shipping**: `pickup_locations`, `shipping_companies`, `shipping_providers`, `shipping_waybill_list`, `shipment_events`, `agent_shipment_list/detail`, `agent_shift`, `courier_supervisor`, `carrier_settings`, `reverse_logistics`, `edge_cases`, `packaging_profiles`, `zone_review_list`, `update_address_in_transit`.
- **Staff/POS**: `staff_list`, `staff_detail`, `staff_home`, `roles_list`, `shift_hub`, `cash_drawer`, `approvals`, `audit_log`, `behavior_alerts`.
- **Reports**: `merchant_reports`, `report_detail`, `my_exports`, `scheduled_reports`.
- **Ops/Support**: `operating_expenses`, `support_tickets`, `support/support_sessions_list`, `support/support_session_detail`.
- **Apps**: `app_marketplace`, `whatsapp_*`, `sharwa_ai_*`.
- **Social/Marketplaces/Dropshipping**: hubs, inbox, settings, listings, sync jobs, feeds, etc.
- **Storefront** (`themes/default/`): `product_list`, `product_detail`, `product_landing`, `cart`, `checkout`, `order_success`, `about_us`, `wishlist`, `gift_unavailable` + section partials (`_section_hero`, `_section_slider`, `_section_banner_grid`, `_section_category_strip`, `_section_featured_products`, `_section_latest_products`, `_section_product_grid`, `_section_promotional_offers`, `_product_card`, `_mobile_bottom_nav`, `_categories_sheet_modal`); `order_status_public.html`.
- **Platform** (`tenants/templates/tenants/`): `home.html`, `register.html`, `verify_otp.html`, `provisioning.html`, `success.html`, `store_provisioning_wait.html`, `platform_master_dashboard.html`, `platform_dues_dashboard.html`, `merchant_master_dashboard.html`, `sharwa_pay_login.html`, `sharwa_pay_dashboard.html`, `kuraimi_simulator.html`.

---

## 6. Onboarding Flow (exact)
1. Landing `/` → `home_view`.
2. `GET/POST /register/` — `TenantRegistrationForm`: `store_name` (3–100, globally unique), `merchant_phone` (WhatsApp, normalized, unique → **one store per phone**), `subdomain` (`^[a-z0-9]+$`, not reserved/taken), `interested_categories` (optional M2M), `agree_terms` (required).
3. Live check `GET /register/check-subdomain/` → `{available, reason}`; reasons: `فارغ`, `أحرف إنجليزية وأرقام فقط`, `محجوز للنظام`, `مستخدم بالفعل`.
4. OTP via WhatsApp (pending data in session, TTL `OTP_TTL_SECONDS`).
5. `GET/POST /register/verify-otp/` — TTL → rate limit → code match → uniqueness re-check → creation rate limit.
6. Atomic creation: `Client(provisioning_status='pending')` + `Domain(is_primary=True)` + categories + conditional `Subscription.assign_plan` (only if `subscriptions_enabled`).
7. Waiting page `tenants/provisioning.html`, polls `/register/status/<token>/` every ~3s. Headings: «جارٍ تجهيز متجرك {store_name}» / «تهانينا! تم إنشاء متجرك بنجاح 🎉» / «تعذّر تجهيز متجرك تلقائياً».
8. Celery `provision_tenant_schema` → `run_provisioning()` → CREATE SCHEMA + migrations → `_init_store_settings()` → `ready` → welcome WhatsApp (`MERCHANT_WELCOME`).
9. Status response `{status}` (+ `store_url`, `dashboard_url` on ready).
10. Failure: `failed` + retry sweeper / admin action.
11. First entry: `/dashboard/setup-password/` → `/dashboard/login/` (session `is_merchant_authenticated`).

---

## 7. Feature Keys (39)
`refunds, inventory, bulk_upload, marketing, campaigns, promotions, coupon, tracking_tools, timeline, abandoned_carts, influencers, affiliates, bookings, storefront_design, contact_info, store_policies, customer_wallets, reports, shipping_settings, shipping_companies, shipping_providers, payment_gateways, local_wallets, bank_transfers, currency_settings, seo_settings, gift_settings, loyalty_settings, merchantwallet, app_marketplace, pickuplocation, sharwa_ship, customer_report, product_report, multi_location, staff_rbac, social_channels, marketplaces, dropshipping`.

Both master switches (`subscriptions_enabled`, `commission_enabled`) default **False** → all features currently open.

---

## 8. Super-Admin Capabilities
- Admin site `/sharwa-secure-gate/` — header «لوحة إدارة منصة شروة». `ADMIN_UI_PACKAGE ∈ django|jazzmin|unfold`.
- `ClientAdmin` actions: تفعيل/إلغاء شروة شيب, إدارة ميزات المتاجر المحددة (bulk `TenantFeatureOverride`), إعادة تجهيز المتاجر الفاشلة.
- Billing admin: Plan (+PlanFeature inline), Subscription, PlatformBillingSettings, Feature, TenantFeatureOverride.
- Appstore admin: App, AppBillingOverride. SharwaPay admin: wallets, transactions (RO), topup approve/reject, withdrawal confirm/reject. SharwaShip zones. MarketCategory. CentralCustomerTrust, OTPRequestTracker.
- Custom pages: `/master-dashboard/` (total_stores, total_sales, total_orders from `TenantStatsSnapshot`, last 50 stores); `/master-dashboard/dues/` (8 POST actions: collect/waive commission, collect/waive/unwaive/generate charge, suspend/reactivate app); `/internal/kuraimi-simulator/`; `/merchant/master-dashboard/` (multi-store owner rollup).
- Celery: `activate_sharwa_ship_task`, `aggregate_tenant_stats`, `provision_tenant_schema`, `retry_stalled_tenant_provisioning`, plus beat jobs (expired app subscriptions, force-close shifts, escalate approvals, expire carts, SLA breaches, retry AWB).

---

## 9. ADDITIONAL MODULES beyond the 20-module baseline
1. Bookings / Appointments (`bookings`)
2. Reports Hub — 42 reports in 10 categories (`core, customers, finance, shipping, inventory, operations, local_market, advanced_behavior, marketing, infrastructure`)
3. Async report exports + scheduled reports
4. Suppliers & Purchase Orders
5. Multi-Location / Warehouses + routing rules
6. Social Sales Channels + Unified Inbox (Meta, TikTok, Telegram)
7. Marketplaces (Amazon SP-API, noon)
8. Dropshipping / supplier feeds
9. App Store (installs + app billing)
10. SharwaConnect WhatsApp app
11. Sharwa AI (support agent, SSO console, commerce API)
12. Sharwa Pay — cross-store prepaid wallet PWA
13. Sharwa Ship — first-party logistics (zones, waybills)
14. Courier / delivery-agent PWA (shifts, custody, scan, partial delivery)
15. 3rd-party carrier integrations (aramex, smsa)
16. Reverse logistics / RMA
17. Edge Cases operational screen
18. Packaging profiles
19. Geo zone review & in-transit interventions
20. Two returns systems (legacy `OrderRefund` + `ReturnRequest`)
21. Loyalty program
22. Gifting
23. Product Templates + Variant Attribute factory
24. B2B wholesale (tier pricing, drafts, negotiation)
25. Bundles / kits / compatibility rules
26. Operating expenses
27. Support tickets + live support sessions
28. Audit log with hash-chain verification
29. Behavioral anomaly alerts
30. Approvals workflow
31. Dynamic order-status engine
32. Organization & Discovery (tags, badges, collections)
33. Multi-store owner rollup dashboard
34. Platform dues console
35. Plans / subscriptions / feature flags system
36. PWA + Web Push
37. Headless REST API + OpenAPI docs
38. Page-builder sections API
39. Multi-currency (SAR, USD, YER_OLD, YER_NEW)
40. Central customer trust / COD risk + COD OTP
41. Provisioning state machine + waiting page
42. Tenant deactivation lifecycle (model only)
43. Marketing timeline
44. Bank transfer / manual payment toggles + payout accounts
45. Kuraimi bank webhook + simulator

### Gaps the new frontend will expose
- No merchant-facing **domain management** UI (admin only) → module 19 must be built from scratch `[NEEDS BACKEND]`.
- No merchant-facing **webhook/integration manager** `[NEEDS BACKEND]`.
- No **desktop topbar** (user menu, store switcher, notifications).
- «السجلات» sidebar group is a disabled placeholder.
- **Dashboard CRUD has no REST API** — new DRF endpoints required `[NEEDS BACKEND]`.
