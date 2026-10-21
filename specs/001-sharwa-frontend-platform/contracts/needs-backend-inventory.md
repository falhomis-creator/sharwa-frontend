# Backend Gap Inventory — عقود البيانات المجمَّعة من الوحدات الـ 49

> مولَّد آلياً بـ `scripts/needs-backend-inventory.ts` من §7 «عقد البيانات» في كل `modules/M*.md` (2026-10-19). المصدر الحاكم هو ملف الوحدة؛ هذا الملف فهرس تجميعي لفريق الباك إند. لا تحرّره يدوياً — عدّل الوحدة وأعد التوليد.
> **Ready** = موجود اليوم على `/api/v1` ويُستهلك مباشرة عبر الـ BFF. **`[NEEDS BACKEND]`** = يُبنى على Mock محلي بنفس العقد تحت `src/mocks/` ويُعلَّم في الواجهة (`x-sharwa-mock: 1`).

## Summary

| Module | Rows | Ready | `[NEEDS BACKEND]` | n/a / local |
|---|---|---|---|---|
| [M01](../modules/M01-landing-page.md) | 3 | 1 | 2 | 0 |
| [M02](../modules/M02-merchant-onboarding.md) | 8 | 7 | 0 | 1 |
| [M03](../modules/M03-dashboard-shell-overview.md) | 12 | 4 | 8 | 0 |
| [M04](../modules/M04-products-variants.md) | 15 | 1 | 14 | 0 |
| [M05](../modules/M05-categories-collections.md) | 9 | 2 | 6 | 1 |
| [M06](../modules/M06-orders-fulfillment.md) | 11 | 3 | 8 | 0 |
| [M07](../modules/M07-customers-crm.md) | 12 | 0 | 12 | 0 |
| [M08](../modules/M08-theme-customizer.md) | 9 | 6 | 3 | 0 |
| [M09](../modules/M09-storefront-home.md) | 12 | 5 | 7 | 0 |
| [M10](../modules/M10-product-detail-page.md) | 15 | 2 | 13 | 0 |
| [M11](../modules/M11-cart.md) | 11 | 4 | 7 | 0 |
| [M12](../modules/M12-checkout.md) | 13 | 0 | 12 | 1 |
| [M13](../modules/M13-marketing-hub.md) | 11 | 1 | 10 | 0 |
| [M14](../modules/M14-payments-wallets-payouts.md) | 10 | 0 | 10 | 0 |
| [M15](../modules/M15-shipping-zones-couriers.md) | 13 | 1 | 12 | 0 |
| [M16](../modules/M16-pos-interface.md) | 10 | 1 | 9 | 0 |
| [M17](../modules/M17-affiliates-influencers.md) | 9 | 1 | 7 | 1 |
| [M18](../modules/M18-staff-rbac.md) | 11 | 0 | 11 | 0 |
| [M19](../modules/M19-domains-webhooks-integrations.md) | 8 | 0 | 8 | 0 |
| [M20](../modules/M20-super-admin-portal.md) | 13 | 0 | 13 | 0 |
| [M21](../modules/M21-inventory-stock-ledger.md) | 8 | 0 | 7 | 1 |
| [M22](../modules/M22-locations-warehouses.md) | 8 | 0 | 8 | 0 |
| [M23](../modules/M23-suppliers-purchase-orders.md) | 9 | 1 | 8 | 0 |
| [M24](../modules/M24-returns-reverse-logistics.md) | 11 | 8 | 3 | 0 |
| [M25](../modules/M25-reports-hub.md) | 8 | 0 | 8 | 0 |
| [M26](../modules/M26-bookings-appointments.md) | 8 | 1 | 6 | 1 |
| [M27](../modules/M27-inbox-social-channels.md) | 14 | 2 | 12 | 0 |
| [M28](../modules/M28-marketplaces.md) | 11 | 1 | 10 | 0 |
| [M29](../modules/M29-dropshipping-supplier-feeds.md) | 11 | 1 | 10 | 0 |
| [M30](../modules/M30-app-store.md) | 7 | 0 | 7 | 0 |
| [M31](../modules/M31-sharwa-ai-console.md) | 8 | 0 | 8 | 0 |
| [M32](../modules/M32-support-tickets-sessions.md) | 6 | 0 | 6 | 0 |
| [M33](../modules/M33-operating-expenses.md) | 4 | 0 | 3 | 1 |
| [M34](../modules/M34-store-settings-hub.md) | 12 | 0 | 10 | 2 |
| [M35](../modules/M35-customer-wallets-loyalty.md) | 7 | 0 | 7 | 0 |
| [M36](../modules/M36-b2b-wholesale.md) | 7 | 3 | 4 | 0 |
| [M37](../modules/M37-bundles-personalization-auctions.md) | 10 | 0 | 10 | 0 |
| [M38](../modules/M38-courier-agent-app.md) | 9 | 5 | 4 | 0 |
| [M39](../modules/M39-sharwa-ship-waybills.md) | 11 | 1 | 9 | 1 |
| [M40](../modules/M40-sharwa-pay-wallet-pwa.md) | 9 | 0 | 8 | 1 |
| [M41](../modules/M41-order-tracking-public.md) | 4 | 1 | 2 | 1 |
| [M42](../modules/M42-wishlist-reviews-engagement.md) | 7 | 1 | 6 | 0 |
| [M43](../modules/M43-multi-store-rollup.md) | 2 | 0 | 1 | 1 |
| [M44](../modules/M44-pwa-web-push.md) | 7 | 5 | 2 | 0 |
| [M45](../modules/M45-platform-dues-console.md) | 4 | 0 | 3 | 1 |
| [M46](../modules/M46-plans-features-admin.md) | 10 | 0 | 9 | 1 |
| [M47](../modules/M47-tenant-resolution-provisioning.md) | 11 | 7 | 1 | 3 |
| [M48](../modules/M48-command-palette-search.md) | 8 | 0 | 5 | 3 |
| [M49](../modules/M49-notifications-center.md) | 7 | 2 | 4 | 1 |
| **Total** | **453** | **78** | **353** | **22** |

## Frontend additions after the module specs (owner decisions)

عقود أو بوابات أضافتها الواجهة بقرار المالك بعد كتابة المواصفات؛ كلها `[NEEDS BACKEND]` ما لم يُذكر غير ذلك.

| Module | Need | Contract | Decision |
|---|---|---|---|
| M16 · M46 | مفتاح ميزة نقطة البيع | `FeatureFlag(code="pos", requires_plan=True)` يظهر في `features[]` لـ `GET /api/v1/auth/me/` وفي كتالوج M46؛ `/api/v1/pos/*` يجيب 403 `{detail, code:"feature_disabled"}` حين يكون معطّلاً | 2026-10-19 · المرحلة 7 · 1 |
| M16 | رمز المدير وحد OTP الاسترجاع | يبقيان mock (`2468`، `200.00`) حتى يحدّد الباك إند الآلية (PIN/OTP) والحد | 2026-10-19 · المرحلة 7 · 1 |
| M03 · M23 | بوابة شريط «أوامر الشراء» | لا عقد جديد — الواجهة تقبل قائمة صلاحيات (أيّها): `suppliers.manage` أو `suppliers.approve`؛ الخادم يقرأ بأيٍّ منهما (FR-23.01) | 2026-10-19 · المرحلة 7 · 2 |
| M39 · M15 | إشراف المندوبين بلا شروة شيب | `GET /api/v1/shipping/supervisor/`، `GET /api/v1/shipping/agent-shifts/`، `POST /api/v1/shipping/agents/<id>/emergency-reassign/`، `POST /api/v1/shipping/shipments/<id>/assign/` `{agent_id}` تُفتح بـ `sharwa_ship` **أو** `shipping_providers`؛ بلا شروة شيب تعود `unassigned_new_orders` فارغة من شحنات شروة شيب | 2026-10-19 · المرحلة 7 · 3 |
| M37 · M10 | هوية المزايد | `POST /api/v1/catalog/products/<id>/bids/` `{bidder_name, bidder_phone, amount}` بلا OTP → 200 المزاد / 400 `{bidder_name|bidder_phone|amount:[msg]}` / 409 `{detail, auction}` | 2026-10-19 · المرحلة 7 · 4 |
| M29 | حقول ربط ملف المورد | `FeedMapping` بالحقول الـ 20 كما في `GET /api/v1/dropshipping/meta/` → `feed_fields`؛ الإلزامية `sku, name, cost, stock` (معتمدة) | 2026-10-19 · المرحلة 7 · 5 |
| M05/M14/M15/M19/M22 | شاشات المالك فقط | لا مفاتيح صلاحية جديدة؛ تبقى الشاشات بلا مفتاح للمالك وحده و403 للموظفين حتى يضيف Django مفاتيح مثل `settings.manage` | 2026-10-19 · المرحلة 5 · 1 |
| M18 | دور «مدير المتجر» | مجموعة الصلاحيات الافتراضية كما في `MOCK_MANAGER_PERMISSIONS` (`src/mocks/dashboard/me.ts`) | 2026-10-19 · المرحلة 5 · 2 |

## Per-module rows

### M01 — الصفحة الترويجية للمنصة (SaaS Landing Page)

| Need | Backend today | Status |
|---|---|---|
| الخطط العامة للعرض | `billing.Plan` عبر Django admin فقط | `[NEEDS BACKEND]` → `GET /api/v1/public/plans/` → `[{code, name, is_free, price, currency, billing_interval, max_products, max_orders_per_month, features:[code]}]` |
| إحصاءات الإثبات | `TenantStatsSnapshot` (داخلي) | `[NEEDS BACKEND]` → `GET /api/v1/public/stats/` → `{stores, orders_30d}`؛ حتى توفره تُستخدم قيم ثابتة مُعلَّمة في المحتوى |
| التحقق من وجود متجر (دخول التاجر) | `GET /register/check-subdomain/` (JSON `{available, reason}`) | Ready (المعنى معكوس: `available=false` + `reason='مستخدم بالفعل'` ⇒ المتجر موجود) |

### M02 — معالج تأسيس المتجر (Merchant Onboarding Wizard)

| Need | Backend today | Status |
|---|---|---|
| قائمة القطاعات | `MarketCategory` + `api/views_onboarding.py` (2026-10-21) | Ready — `GET /api/v1/public/market-categories/` → `[{id, name}]` (النشطة مرتبة بـ `display_order`) |
| فحص النطاق الفرعي | `GET /register/check-subdomain/?subdomain=` → `{available, reason}` | Ready (الأسباب بالعربية + قاعدة الطول 3–50، قرار 2026-10-21) |
| إرسال التسجيل وبدء OTP | `POST /register/` HTML + `api/views_onboarding.py` (2026-10-21) | Ready — `POST /api/v1/public/register/` `{store_name, merchant_phone, subdomain, interested_categories[], agree_terms}` → `{otp_token, ttl_seconds: 600, masked_phone}` أو 400 `{field:[msg]}` / 429 + `Retry-After` (3 إرسالات لكل رقم كل 10 دقائق) |
| التحقق من الرمز وإنشاء المتجر | `POST /register/verify-otp/` HTML + `api/views_onboarding.py` (2026-10-21) | Ready — `POST /api/v1/public/register/verify-otp/` `{otp_token, code}` → `{status_token, status_url}` / 400 رمز خاطئ أو حقل مأخوذ / 410 منتهٍ / 429 (قفل 10 دقائق بعد 3 رموز خاطئة) |
| إعادة إرسال الرمز | `api/views_onboarding.py` (2026-10-21) | Ready — `POST /api/v1/public/register/resend-otp/` `{otp_token}` → `{ttl_seconds}` / 429 + `Retry-After` (فاصل 30 ثانية) / 410 |
| حالة التجهيز | `GET /register/status/<token>/` → `{status}` (+ `store_url`, `dashboard_url`, `setup_token` عند `ready`) | Ready (الروابط تتبع مضيف الواجهة من X-Forwarded-Host/Proto؛ `setup_token` قرار 2026-10-21) |
| تعيين كلمة المرور الأولى | `setup_admin_password` HTML + `api/views_auth.py` (2026-10-21) | Ready — `POST /api/v1/auth/merchant/setup-password/` `{password, password_confirm, setup_token}` → 204 (يُوثَّق في M03) |
| نص الشروط | ثابت في القالب | n/a — ملف محتوى في المستودع `onboarding.content.ts` |

### M03 — هيكل لوحة التاجر والنظرة العامة (Dashboard Shell + Overview)

| Need | Backend today | Status |
|---|---|---|
| رمز CSRF للطلبات | `<meta name="csrf-token">` في القوالب؛ `CSRF_COOKIE_HTTPONLY=True` | `[NEEDS BACKEND]` → `GET /api/v1/auth/csrf/` → `{csrfToken}` (أو حقنه SSR من BFF) |
| دخول المالك | `merchant_login` HTML POST + `api/views_auth.py` (2026-10-20) | Ready — `POST /api/v1/auth/merchant/login/` `{phone, password}` → 204 + cookie جلسة / 400 / 409 `setup_required` / 429 قفل 15 دقيقة (قرار 2026-10-20: هاتف واتساب المتجر يبقى شرطاً كشاشة Django) |
| دخول الموظف | `staff_login` HTML POST | `[NEEDS BACKEND]` → `POST /api/v1/auth/staff/login/` `{phone, password}` → 204 / 400 / 403 غير مفعّل |
| الخروج | `merchant_logout`, `staff_logout` + `api/views_auth.py` (2026-10-20) | Ready — `POST /api/v1/auth/logout/` → 204 (مالك أو موظف) |
| نسيت/إعادة تعيين كلمة المرور | `forgot_password`, `reset_password` HTML | `[NEEDS BACKEND]` → `POST /api/v1/auth/merchant/forgot-password/` → `{otp_token, ttl_seconds}`؛ `POST /api/v1/auth/merchant/reset-password/` `{otp_token, code, password}` → 204 |
| تعيين كلمة المرور الأولى | `setup_admin_password` HTML + `api/views_auth.py` (2026-10-21) | Ready — `POST /api/v1/auth/merchant/setup-password/` `{password, password_confirm, setup_token}` → 204 + جلسة / 400 / 403 `setup_token_invalid` / 409 `already_set` (قرار 2026-10-21: `setup_token` الموقَّع من حالة `ready` يمر عبر `?setup=` — متجر جديد لا يُفتح لمن يصله أولاً) |
| الجلسة الحالية + الصلاحيات + الميزات | `request.staff`, `permission_resolver`, `feature_flags` + `api/views_auth.py` (2026-10-20) | Ready — `GET /api/v1/auth/me/` → `{kind, store_name, store_host, staff?:{full_name, roles[], permissions[], locations[]}, features[]}` / 401 (`behavior` لم يُبنَ بعد — اختياري في العقد) |
| النظرة العامة | `dashboard_home` HTML | `[NEEDS BACKEND]` → `GET /api/v1/dashboard/overview/` → `{today:{orders_count, completed_orders_count, cancelled_orders_count, refunded_orders_count, display_gross_revenue, display_net_revenue, refreshed_at}, new_orders:[…M06 row], attention:{pending_approvals, unread_behavior_alerts:{warning, critical}, low_stock_products, unread_conversations}, top_products:[{id, name, image, qty, display_revenue}], traffic_sources:{tiktok, whatsapp, …}}` |
| تحديث أرقام اليوم | `refresh_today_metrics` POST | `[NEEDS BACKEND]` → `POST /api/v1/dashboard/overview/refresh/` → نفس `today` |
| عدّادات الشريط | ضمن قوالب الشريط | `[NEEDS BACKEND]` → `GET /api/v1/dashboard/counters/` → `{new_orders, unread_conversations, pending_approvals, unread_behavior_alerts}` |
| متاجر المالك (المبدّل) | `merchant_master_dashboard` HTML (`MerchantAccount`) | `[NEEDS BACKEND]` → `GET /api/v1/account/stores/` → `[{name, host, is_current, provisioning_status}]` |
| شجرة التقارير للشريط | `report_groups` context processor | `[NEEDS BACKEND]` → `GET /api/v1/reports/registry/` (يُوثَّق في M25) |

### M04 — إدارة المنتجات والمتغيرات (Product & Variant Manager)

| Need | Backend today | Status |
|---|---|---|
| قائمة المنتجات للتاجر | `product_list_hub` HTML؛ القراءة العامة `GET /api/v1/catalog/products/` (حقول متجر فقط) | `[NEEDS BACKEND]` → `GET /api/v1/products/?q&status&stock&category&brand&tag&collection&product_type&flags&ordering&page&page_size` → `{count, results:[{id, name, sku, image, display_price, display_old_price, stock, unit, is_low_stock, category:{id,name}, status, has_variants, updated_at}]}` |
| تفاصيل/إنشاء/تعديل/حذف | `add_product`, `edit_product`, `delete_product` HTML | `[NEEDS BACKEND]` → `POST /api/v1/products/`، `GET/PATCH/DELETE /api/v1/products/<id>/` (كل حقول `ProductForm`) → 200/400 `{field:[msg]}` |
| الإضافة السريعة | `product_quick_add` HTML | `[NEEDS BACKEND]` → `POST /api/v1/products/quick/` (حقول `ProductQuickAddForm`) → `{id}` |
| الصور | ضمن `ProductForm` | `[NEEDS BACKEND]` → `POST /api/v1/products/<id>/images/` multipart، `DELETE /images/<iid>/`، `POST /images/reorder/` `{ordered_ids}` |
| تعديل المخزون في مكانه | `update_product_stock` POST | `[NEEDS BACKEND]` → `POST /api/v1/products/<id>/stock/` `{stock, reason:'manual_adjust', location_id?}` → `{stock}` (M21) |
| قاموس السمات والقيم | `variant_hub`, variant attribute/option CRUD | `[NEEDS BACKEND]` → `GET/POST /api/v1/variant-attributes/`، `PATCH/DELETE /<id>/`، `GET/POST /<id>/options/`، `PATCH/DELETE /options/<oid>/` |
| توليد وتحرير المتغيرات | ضمن `edit_product` | `[NEEDS BACKEND]` → `POST /api/v1/products/<id>/variants/generate/` `{attribute_ids[], exclude:[[option_ids]]}` → `[{id, options[], sku, extra_price, stock}]`؛ `PATCH /variants/<vid>/`؛ `POST /variants/bulk/` |
| القوالب (المخططات) | `product_template_*`, `template_attributes_api`, attach/detach | `[NEEDS BACKEND]` → `GET/POST /api/v1/product-templates/`، `PATCH/DELETE /<id>/`، `POST /<id>/apply/` `{product_ids[]}` → `{applied, skipped}` |
| القطاعات العالمية | `apply_variant_template` (GlobalVariantTemplate) | `[NEEDS BACKEND]` → `GET /api/v1/global-variant-templates/` → `[{id, name, attributes[]}]`؛ `POST /api/v1/product-templates/<id>/apply-global/` `{global_template_id}` |
| إجراءات جماعية | غير موجود | `[NEEDS BACKEND]` → `POST /api/v1/products/bulk/` `{ids[], action: publish |
| تصدير CSV | `export_products_csv` | `[NEEDS BACKEND]` → `GET /api/v1/products/export.csv?<نفس فلاتر القائمة>` |
| استيراد CSV | `import_products_csv` POST | `[NEEDS BACKEND]` → `POST /api/v1/products/import/` multipart → `{job_id, preview:[…], columns[]}`؛ `POST /import/<job_id>/run/` `{mapping}`؛ `GET /import/<job_id>/` → `{status, done, failed:[{row, msg}]}` |
| الرفع السريع | `bulk_upload_products` | `[NEEDS BACKEND]` → `POST /api/v1/products/bulk-upload/` multipart صور → `[{id}]` (مسودات) |
| سجل التغييرات | `ProductChangeLog` (نموذج فقط) | `[NEEDS BACKEND]` → `GET /api/v1/products/<id>/changes/?page` → `[{field, before, after, actor, at}]` |
| التصنيفات/الماركات/الوسوم/المجموعات/الشارات للاختيار | `GET /api/v1/catalog/categories/` Ready؛ البقية HTML | Ready للتصنيفات؛ البقية في M05 |

### M05 — التصنيفات والماركات والوسوم والمجموعات والشارات (Categories, Brands, Tags, Collections, Badges)

| Need | Backend today | Status |
|---|---|---|
| شجرة التصنيفات (قراءة) | `GET /api/v1/catalog/categories/` → `[{id, name, subcategories[]}]` | Ready للهيكل؛ يُوسَّع `[NEEDS BACKEND]` → `GET /api/v1/categories/` → `[{id, name, parent_id, sort_order, image, products_count, meta_title, meta_description, meta_keywords, og_image}]` |
| إنشاء/تعديل/حذف تصنيف | `add_category` HTML | `[NEEDS BACKEND]` → `POST /api/v1/categories/`، `PATCH/DELETE /api/v1/categories/<id>/?reassign_to=<id>` |
| ترتيب/تداخل | غير موجود | `[NEEDS BACKEND]` → `POST /api/v1/categories/reorder/` `{moves:[{id, parent_id, sort_order}]}` → `{ok}` / 400 دورة |
| الماركات CRUD | `organization` HTML | `[NEEDS BACKEND]` → `GET/POST /api/v1/brands/`، `PATCH/DELETE /<id>/` (multipart للشعار) |
| الوسوم CRUD + دمج | `organization` HTML | `[NEEDS BACKEND]` → `GET/POST /api/v1/tags/`، `PATCH/DELETE /<id>/`، `POST /api/v1/tags/merge/` `{from_id, into_id}` |
| المجموعات CRUD | `organization` HTML | `[NEEDS BACKEND]` → `GET/POST /api/v1/collections/`، `PATCH/DELETE /<id>/`، `POST /<id>/products/` `{product_ids[]}`، `DELETE /<id>/products/<pid>/`، `POST /<id>/products/reorder/` `{ordered_ids}` |
| الشارات CRUD | `organization` HTML | `[NEEDS BACKEND]` → `GET/POST /api/v1/badges/`، `PATCH/DELETE /<id>/` |
| بحث منتجات للإضافة إلى مجموعة | `GET /api/v1/catalog/products/?search=` | Ready (حقول متجر: `id, name, image, display_price`)؛ يُستكمل من M04 بالـ `sku` |
| عدد المنتجات لكل كيان | ضمن قوالب HTML | يُضمَّن في استجابات القوائم أعلاه (`products_count`) |

### M06 — مركز الطلبات والتنفيذ (Orders & Fulfillment Pipeline)

| Need | Backend today | Status |
|---|---|---|
| قائمة الطلبات مفلترة | `order_list` HTML | `[NEEDS BACKEND]` → `GET /api/v1/orders/?status&payment_status&fulfillment_status&channel&location&from&to&q&page&page_size` → `{count, results:[{id, customer_name, customer_phone, display_total, status, payment_status, fulfillment_status:{id,name,color}, sales_channel, created_at}]}` |
| تفاصيل الطلب | `order_detail_api` JSON | Ready جزئياً؛ يُوحَّد تحت `GET /api/v1/orders/<id>/` |
| تغيير حالة التنفيذ | `update_order_fulfillment_status` POST | `[NEEDS BACKEND]` → `POST /api/v1/orders/<id>/fulfillment-status/` `{status_id, version}` → 200/409 |
| تغيير الحالة المالية | `update_order_status` POST | `[NEEDS BACKEND]` → `POST /api/v1/orders/<id>/status/` `{status, version}` |
| تأكيد دفع / مراجعة | `confirm_payment_received`, `adjudicate_payment_*` | `[NEEDS BACKEND]` → `POST /api/v1/orders/<id>/payment/{confirm |
| حالات التنفيذ CRUD | `order_statuses`, add/delete/set_default | `[NEEDS BACKEND]` → `GET/POST /api/v1/order-statuses/`, `PATCH/DELETE /<id>/`, `POST /reorder/` |
| إنشاء طلب يدوي | `create_order` POST | `[NEEDS BACKEND]` → `POST /api/v1/orders/` |
| مسودات B2B | `/api/v1/orders/b2b-draft/`, `/b2b-drafts/`, `/<pk>/resolve/` | Ready |
| الاسترجاعات | `/api/v1/returns/*` | Ready |
| استرجاع مبلغ (مالي) | `order_refund_form` POST | `[NEEDS BACKEND]` → `POST /api/v1/orders/<id>/refunds/` `{amount, method, reason}` |
| عدّاد الطلبات الجديدة | ضمن `dashboard_home` | `[NEEDS BACKEND]` → `GET /api/v1/orders/counters/` |

### M07 — العملاء وإدارة العلاقات (Customers & CRM)

| Need | Backend today | Status |
|---|---|---|
| قائمة العملاء المشتقة | `customer_report` HTML | `[NEEDS BACKEND]` → `GET /api/v1/customers/?q&segment&product_id&last_order_from&last_order_to&min_spent&trust&has_wallet&has_points&ordering&page&page_size` → `{count, results:[{phone, name, orders_count, display_total_spent, last_order_at, trust:{platform_risk_percentage}, display_wallet_balance, points_balance}]}` |
| ملف العميل | `customer_report` HTML (تفاصيل) | `[NEEDS BACKEND]` → `GET /api/v1/customers/<phone>/` → `{phone, name, email, first_order_at, last_order_at, orders_count, display_total_spent, display_refunded, display_avg_basket, trust:{platform:{successful_cod_orders, failed_cod_orders, risk_percentage}, store:{cod_refusals_count, cod_disabled}}, wallet:{display_balance}, points:{balance}}` |
| طلبات العميل | `order_list?q=<phone>` HTML | `[NEEDS BACKEND]` → `GET /api/v1/orders/?customer_phone=<phone>` (عقد M06) |
| حركات المحفظة | `wallet_detail` HTML | `[NEEDS BACKEND]` → `GET /api/v1/customers/<phone>/wallet/transactions/?page` → `[{reason, display_amount, display_balance_after, created_at}]` (M35) |
| حركات النقاط | `CustomerPointsTransaction` (نموذج) | `[NEEDS BACKEND]` → `GET /api/v1/customers/<phone>/points/` → `{balance, transactions:[{type, points, order_id?, created_at}]}` |
| الأمنيات وإشعارات التوفر | `WishlistItem`, `BackInStockNotification` (نماذج) | `[NEEDS BACKEND]` → `GET /api/v1/customers/<phone>/wishlist/` → `[{product:{id,name,image,display_price,stock}, added_at, back_in_stock_requested}]` |
| التقييمات والردّ | `ProductReview.admin_reply` عبر HTML | `[NEEDS BACKEND]` → `GET /api/v1/customers/<phone>/reviews/`؛ `PATCH /api/v1/reviews/<id>/` `{admin_reply}` |
| الملاحظات | غير موجود | `[NEEDS BACKEND]` → `GET/POST /api/v1/customers/<phone>/notes/` `{body}`؛ `DELETE /notes/<id>/` |
| إعادة تفعيل/إيقاف COD | `CustomerReliabilityRecord` (نموذج) | `[NEEDS BACKEND]` → `POST /api/v1/customers/<phone>/cod/` `{cod_disabled: bool, reason}` → 200 (صلاحية `customers.edit_profile`) |
| التصدير | `staff_export_customers` | `[NEEDS BACKEND]` → `GET /api/v1/customers/export.csv?<نفس الفلاتر>` → CSV / 403 / 429 عند `critical` |
| عدد الشريحة الحيّ | ضمن `CampaignForm` | `[NEEDS BACKEND]` → `GET /api/v1/customers/segments/count/?segment&product_id` → `{count}` |
| حالة التنبيهات السلوكية للموظف الحالي | `behavior_alerts` HTML | `[NEEDS BACKEND]` → ضمن `GET /api/v1/auth/me/` (M03) حقل `behavior:{export: none |

### M08 — مخصِّص ثيم المتجر (Storefront Theme Customizer)

| Need | Backend today | Status |
|---|---|---|
| قراءة الهوية والأقسام المنشورة | `GET /api/v1/config/` | Ready |
| قائمة الأقسام (كل الحالات) | `GET /api/v1/admin/sections/` | Ready — تحفّظ: المصادقة `IsAdminUser` (superuser) لا `MerchantSessionAuthentication` → `[NEEDS BACKEND]` توحيد الصلاحية لجلسة المالك |
| إضافة/تعديل/حذف قسم | `POST /api/v1/admin/sections/`, `PATCH/DELETE /<pk>/` | Ready (نفس التحفّظ) |
| إعادة ترتيب | `POST /api/v1/admin/sections/reorder/` `{ordered_ids}` → `{ok, reordered}` | Ready |
| حفظ الهوية (ألوان/خطوط/قالب/نمط/شعار) | `storefront_design` POST (`StorefrontDesignForm`) | `[NEEDS BACKEND]` → `PATCH /api/v1/store/theme/` multipart `{theme_preset, primary_color, secondary_color, background_color, text_color, card_border_color, heading_font, body_font, design_style, logo?}` → الكيان كاملاً + `brand_shades` |
| قوالب الثيم بقيمها | `products/theme_presets.py` | `[NEEDS BACKEND]` → `GET /api/v1/store/theme/presets/` → `[{code, name, tokens{...}, heading_font, body_font, design_style}]`؛ حتى توفره تُنسخ القيم إلى ملف بيانات محلي يُعلَّم بالمصدر |
| شريط الإعلانات | `AnnouncementBarForm` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/store/announcement/` |
| التصنيفات لمنتقي `product_grid` | `GET /api/v1/catalog/categories/` | Ready |
| CSS الثيم للمعاينة | `GET /theme.css` | Ready (تُستخدم فقط لمقارنة الإخراج؛ المعاينة تطبّق الرموز مباشرة) |

### M09 — واجهة المتجر: الصفحة الرئيسية وصفحات التصفّح (Customer Storefront Home & Listing)

| Need | Backend today | Status |
|---|---|---|
| إعدادات المتجر + الثيم + الأقسام الفعّالة | `GET /api/v1/config/` | Ready |
| `card_border_color`, `announcement_bg_color`, `announcement_text_color`, `announcement_scroll_speed`, `show_banner_on_*`, `free_shipping_threshold`, `currency` (الافتراضية), `seo_*`, روابط التواصل, `about_us`, `contact_email` | `StoreSetting` غير مُصدَّرة في `/config/` | `[NEEDS BACKEND]` → توسيع `GET /api/v1/config/` بالحقول نفسها بأسمائها |
| شجرة التصنيفات | `GET /api/v1/catalog/categories/` → `[{id, name, subcategories[]}]` | Ready (صورة التصنيف لشريط الأقسام: `[NEEDS BACKEND]` إضافة `image`) |
| قائمة المنتجات مفلترة ومرقّمة | `GET /api/v1/catalog/products/?category&brand&tag&collection&search&is_featured=true&currency&page&page_size` | Ready |
| خيارات الفلاتر بأسمائها وعدّاداتها | `Brand`/`Tag`/`Collection` بلا endpoint | `[NEEDS BACKEND]` → `GET /api/v1/catalog/facets/?category=` → `{brands:[{id,name,slug,count}], tags:[…], collections:[…]}` |
| ترتيب القائمة (الأحدث/السعر) | ترتيب ضمني فقط | `[NEEDS BACKEND]` → `?ordering=-created_at\|price\|-price` |
| شارات التاجر و«وصل حديثاً» على البطاقة | `active_badges` في الموديل فقط | `[NEEDS BACKEND]` → إضافة `badges:[{name, color}]` لعناصر القائمة؛ حتى توفرها تُشتق «نفدت الكمية»/«تخفيض» محلياً من `stock`/`display_old_price` |
| محتوى قسم `promotional_offers` | `PromotionalOffer` HTML فقط | `[NEEDS BACKEND]` → `GET /api/v1/catalog/offers/` → `[{id, name, offer_type, description, image, cta_text, valid_until}]` |
| تثبيت العملة | `GET /api/v1/cart/?currency=` (sticky في session) | Ready |
| المفضلة (عدّاد الرأس) | `toggle_wishlist` HTML (بالهاتف) | `[NEEDS BACKEND]` (E-42) → `GET/POST /api/v1/wishlist/`؛ حتى توفره: قائمة محلية مفتوحة بالمستأجر |
| بكسلات التتبع | `TrackingSettings` غير مُصدَّرة | `[NEEDS BACKEND]` (M19) → `tracking{meta_pixel_id, tiktok_pixel_id, snapchat_pixel_id, gtm_container_id, ga4_measurement_id}` ضمن `/config/` |
| manifest + قياس التثبيت | `POST /api/v1/pwa/install-event/` بـ `source='nextjs_app'` | Ready (E-44) |

### M10 — صفحة تفاصيل المنتج (Product Detail Page)

| Need | Backend today | Status |
|---|---|---|
| تفاصيل المنتج الأساسية | `GET /api/v1/catalog/products/<id>/?currency=` | Ready |
| حقول إضافية (`name_en`, `description_en`, `unit`, `min/max_quantity`, `allow_variable_quantity`, `low_stock_threshold`, `allow_backorder`, `delivery_duration`, `product_template`, `product_type`, `meta_*`) | على `Product` غير مُصدَّرة | `[NEEDS BACKEND]` → ضمّها إلى نفس الاستجابة بأسمائها |
| المعرض | `ProductImage` + `video_url` | `[NEEDS BACKEND]` → `images:[{url, alt, sort_order}]`, `video_url` |
| المتغيرات 3-tier | `VariantAttribute`/`VariantOption`/`ProductVariant` | `[NEEDS BACKEND]` → `variant_display_style`, `attributes:[{id, name, field_type, is_required, options:[{id, value, image}]}]`, `variants:[{id, option_ids[], display_effective_price, stock, sku, image}]` |
| أسعار الشرائح | `ProductTierPrice`, `get_tier_price(qty)` | `[NEEDS BACKEND]` → `tier_prices:[{min_quantity, display_price}]` |
| التسعير بالصيغة | `pricing_type`, `formula_*` | `[NEEDS BACKEND]` → `formula:{unit, display_unit_price, coefficient, display_fixed_extra}` + `GET …/quote/?value=` → `{display_price}` |
| الحزم | `BundleComponent`, `bundle_build_fee` | `[NEEDS BACKEND]` → `bundle:{display_build_fee, components:[{product_id, name, image, quantity, is_optional}]}` |
| التخصيص | `PersonalizationField` | `[NEEDS BACKEND]` → `personalization_fields:[{id, label, field_type, is_required, options[], display_price_add}]` |
| المزاد والمزايدة | `Auction`, `AuctionBid` HTML | `[NEEDS BACKEND]` → `GET …/auction/` → `{status, display_current_bid, display_bid_step, display_buy_now, end_at, anti_sniping_seconds, bids_count}`؛ `POST …/auction/bids/` `{amount, phone, otp}` → 200/409 |
| الفترات المتاحة | `GET /product/<id>/available-slots/` JSON (HTML URLConf) | HTML-only `[NEEDS BACKEND]` → `GET /api/v1/catalog/products/<id>/available-slots/?date=` → `{slots:[{start_datetime, end_datetime, status}]}` |
| التقييمات | `submit_review` HTML, `ProductReview` | `[NEEDS BACKEND]` → `GET …/reviews/?page` → `{average_rating, rating_distribution{1..5}, results:[{rating, comment, customer_name, created_at, admin_reply}]}`؛ `POST …/reviews/` `{rating, comment, phone, otp}` |
| المرتبطة | `RelatedProduct` | `[NEEDS BACKEND]` → `related:{related:[card], upsell:[card], cross_sell:[card]}` |
| المفضلة / إشعار التوفر | `toggle_wishlist`, `subscribe_back_in_stock` HTML | `[NEEDS BACKEND]` (E-42) → `POST /api/v1/wishlist/toggle/` `{product_id, phone}`؛ `POST …/back-in-stock/` `{phone}` |
| إضافة إلى السلة | `POST /api/v1/cart/actions/` `{product_id, size, color, action_type}` → `{cart_count, product_qty}` | Ready جزئياً؛ `[NEEDS BACKEND]` → قبول `variant_id`, `quantity`, `personalization{}`, `start_datetime` |
| JSON-LD | — | `[NEEDS BACKEND]` → `structured:{price, currency, sku, brand, availability}` قيم خام للـ SEO فقط |

### M11 — السلة الجانبية والسلة الصغيرة (Slide-over Cart & Mini-Cart)

| Need | Backend today | Status |
|---|---|---|
| قراءة السلة | `GET /api/v1/cart/?currency=` → `{items[], count, currency, display_subtotal}` | Ready |
| إضافة / تقليل / حذف سطر | `POST /api/v1/cart/actions/` `{product_id, size, color, action_type}` → `{cart_count, product_qty}` | Ready |
| إفراغ السلة | `DELETE /api/v1/cart/` → 204 | Ready |
| صورة السطر، `variant_id`, `variant_label`, رابط المنتج، حد المخزون | غير مُصدَّرة في `items[]` | `[NEEDS BACKEND]` → توسيع كل عنصر بـ `image, variant_id, variant_label, product_slug, max_quantity, stock` |
| ضبط كمية مباشرة (إدخال رقم) | — | `[NEEDS BACKEND]` → `action_type:'set_quantity'` + `quantity`؛ حتى توفره يُرسل فرق `add`/`decrease` متسلسلاً |
| تطبيق/إزالة كوبون | `POST /cart/apply-coupon/`, `/cart/remove-coupon/` HTML | `[NEEDS BACKEND]` → `POST /api/v1/cart/coupon/` `{code}` → `{coupon_code, display_discount, display_subtotal, display_total}` / 400 `{detail}`؛ `DELETE /api/v1/cart/coupon/` |
| العروض التلقائية والإجمالي بعد الخصم | `pricing.py` داخل الـ checkout فقط | `[NEEDS BACKEND]` → إضافة `applied_offers:[{name, offer_type, display_discount}]`, `display_discount`, `display_total` إلى استجابة السلة |
| حد الشحن المجاني والمتبقي | `StoreSetting.free_shipping_threshold` | `[NEEDS BACKEND]` → `free_shipping_threshold` في `/config/` (مشترك مع M09) + `display_free_shipping_remaining` في السلة |
| التقاط هاتف المشتري للسلة المتروكة | `AbandonedCart` بـ `session_key` خادمياً | `[NEEDS BACKEND]` → `POST /api/v1/cart/contact/` `{phone, name?}` → 204 |
| استرداد سلة من رابط التذكير | `restore_abandoned_cart` HTML (`cart_url`) | `[NEEDS BACKEND]` → `POST /api/v1/cart/restore/` `{token}` → السلة + `{coupon_code?}` |
| عدّاد الرأس | `count` من `GET /api/v1/cart/` | Ready |

### M12 — إتمام الطلب بلا احتكاك (Frictionless Checkout)

| Need | Backend today | Status |
|---|---|---|
| خيارات التوصيل والاستلام + رسوم افتراضية | `calculate_shipping` HTML، `DeliveryMethod`/`PickupLocation` | `[NEEDS BACKEND]` → `GET /api/v1/checkout/delivery-options/` → `{delivery_methods:[{id, name, display_price, estimated_time, is_sharwa_official}], pickup_locations:[{id, name, address, phone}], display_default_delivery_fee, free_shipping_applies}` |
| طرق الدفع المتاحة وحسابات التحويل | `enable_manual_payment`, `enable_sharwa_pay`, `PaymentCredential.is_enabled`, `PayoutAccount` | `[NEEDS BACKEND]` → `GET /api/v1/checkout/payment-options/` → `{methods:[{code, label, enabled, reason?}], payout_accounts:[{account_type, provider_name, account_number, account_name}]}` |
| معاينة الفاتورة قبل التأكيد | `build_order_invoice` داخل `POST /checkout/` فقط | `[NEEDS BACKEND]` → `POST /api/v1/checkout/quote/` `{delivery_method_id?, pickup_location_id?, payment_method, coupon_code?, use_wallet, phone?, redeem_points?}` → `OrderInvoice` بحقول `display_*` |
| إنشاء الطلب | `POST /checkout/` HTML (multipart) | `[NEEDS BACKEND]` → `POST /api/v1/checkout/` (multipart، كل حقول FR-12.02) → `{order_id, public_uuid, status, payment_status, display_total, next_action:{type: none\|redirect_gateway\|show_transfer_instructions, url?}}` / 400 `{field:[msg]}` / 409 |
| COD OTP | `POST /checkout/cod-otp/send/`, `/verify/` JSON `{ok, error}` | HTML-only `[NEEDS BACKEND]` → `POST /api/v1/checkout/cod-otp/send/` `{phone}`؛ `/verify/` `{phone, otp}` → `{ok, cod_allowed, reason?}` |
| معاينة رصيد المحفظة + OTP | `POST /wallet/balance-preview/`, `/wallet/otp/send/` | `[NEEDS BACKEND]` → `POST /api/v1/wallet/balance-preview/` `{phone}` → `{display_balance, display_applicable}`؛ `POST /api/v1/wallet/otp/send/` `{phone}` |
| شروة باي OTP | `sharwa_pay_checkout_otp_send` | `[NEEDS BACKEND]` → `POST /api/v1/checkout/sharwa-pay/otp/send/` `{phone}` → `{display_balance?}` |
| الولاء: الرصيد + OTP + الاستبدال | `/loyalty/otp/send/`, `/loyalty/redeem/` | `[NEEDS BACKEND]` → `GET /api/v1/loyalty/balance/?phone=` → `{balance, min_points_to_redeem, display_value}`؛ `POST /api/v1/loyalty/otp/send/`؛ `POST /api/v1/loyalty/redeem/` `{phone, otp, points}` |
| الكوبون | `apply_coupon`/`remove_coupon` | `[NEEDS BACKEND]` (M11 §7) `POST/DELETE /api/v1/cart/coupon/` |
| إعدادات الهدايا والولاء | `GiftSettings.is_enabled`, `LoyaltyProgram.is_enabled` | `[NEEDS BACKEND]` → ضمن `GET /api/v1/config/` `{gifting_enabled, loyalty_enabled}` |
| إرفاق إيصال لاحقاً | — | `[NEEDS BACKEND]` → `POST /api/v1/orders/<public_uuid>/receipt/` multipart `{receipt_image, transfer_amount_reported}` |
| صفحة النجاح / نتيجة البوابة | `order_success` HTML | `[NEEDS BACKEND]` → `GET /api/v1/orders/public/<public_uuid>/` → `{status, payment_status, display_total, payment_method, items:[{product_name, variant_label, quantity, display_price}], created_at}` (مشترك مع E-41) |
| الحجز | `start_datetime` في `POST /checkout/`؛ `book_appointment` | يُضمَّن في `POST /api/v1/checkout/` نفسه |

### M13 — مركز التسويق (Marketing Hub: Coupons, Offers, Abandoned Carts, Campaigns, Timeline, Loyalty, Gifting)

| Need | Backend today | Status |
|---|---|---|
| أرقام المركز | ضمن `marketing_hub` HTML | `[NEEDS BACKEND]` → `GET /api/v1/marketing/summary/` → `{active_coupons, active_offers, abandoned_today, last_campaign:{id,status,sent_at}}` |
| الكوبونات CRUD | `merchant_offers`, coupon CRUD HTML | `[NEEDS BACKEND]` → `GET/POST /api/v1/marketing/coupons/?status&q&page`, `PATCH/DELETE /<id>/` |
| العروض الترويجية CRUD | `promotions_list`, `edit_promotional_offer` | `[NEEDS BACKEND]` → `GET/POST /api/v1/marketing/offers/`, `PATCH/DELETE /<id>/` (multipart للصورة) |
| السلات المتروكة | `abandoned_carts` HTML | `[NEEDS BACKEND]` → `GET /api/v1/marketing/abandoned-carts/?status&from&to&page` → `{count, results:[{id, customer_name, customer_phone, display_total, items_count, status, reminder_step, last_interaction_at, last_reminder_sent_at, recovered_order_id}]}` |
| تذكير يدوي | `send_abandoned_cart_reminder` POST | `[NEEDS BACKEND]` → `POST /api/v1/marketing/abandoned-carts/<id>/remind/` |
| إعدادات الاسترداد | `abandoned_cart_settings` (`AbandonedCartSettingsForm`) | `[NEEDS BACKEND]` → `GET/PATCH /api/v1/marketing/abandoned-carts/settings/` |
| الحملات | `campaigns_*`, `campaign_send_preview` | `[NEEDS BACKEND]` → `GET/POST /api/v1/marketing/campaigns/`, `PATCH /<id>/`, `GET /<id>/preview/` → `{recipients_count, rendered_message}`, `POST /<id>/send/` `{schedule_at?}` |
| الجدول الزمني | `timeline_*` (`TimelineEventForm`) | `[NEEDS BACKEND]` → `GET/POST /api/v1/marketing/timeline/?from&to`, `PATCH/DELETE /<id>/` |
| الولاء / الإهداء | `loyalty_settings`, `gift_settings` | `[NEEDS BACKEND]` → `GET/PATCH /api/v1/marketing/loyalty/`, `GET/PATCH /api/v1/marketing/gifting/` |
| شريط التسويق | `marketing_bar` (`AnnouncementBarForm`) | `[NEEDS BACKEND]` → نفس `PATCH /api/v1/store/announcement/` في M08 |
| منتقي التصنيفات/المنتجات | `GET /api/v1/catalog/categories/`, `/catalog/products/?search` | Ready |

### M14 — المدفوعات والمحافظ والتحويلات (Payments, Wallets & Payouts)

| Need | Backend today | Status |
|---|---|---|
| قائمة البوابات وحالتها | `payment_gateways` HTML | `[NEEDS BACKEND]` → `GET /api/v1/payments/gateways/` → `[{gateway_code, name, is_enabled, has_credentials, fields:[{name, label, is_secret, required, masked_hint?}]}]` |
| حفظ اعتمادات بوابة | `GatewayCredentialForm` POST | `[NEEDS BACKEND]` → `PUT /api/v1/payments/gateways/<code>/credentials/` `{<field>: value}` (الحقول الفارغة تُبقي القيمة) → 204 |
| تفعيل/تعطيل بوابة | ضمن نفس النموذج | `[NEEDS BACKEND]` → `PATCH /api/v1/payments/gateways/<code>/` `{is_enabled}` |
| مفتاح Sharwa Pay | `save_sharwa_pay_toggle` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/store/payments/` `{enable_sharwa_pay}` |
| مفتاح التحويل اليدوي | `save_manual_payment_toggle` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/store/payments/` `{enable_manual_payment}` |
| حسابات التحويل CRUD | `bank_transfers`, `local_wallets`, payout accounts CRUD | `[NEEDS BACKEND]` → `GET/POST /api/v1/payments/payout-accounts/?account_type`, `PATCH/DELETE /<id>/`, `POST /reorder/` `{ordered_ids}` |
| أرصدة المحفظة | `merchant_wallet` HTML | `[NEEDS BACKEND]` → `GET /api/v1/wallet/` → `{balances:[{currency, display_balance, display_available}]}` |
| حركات المحفظة | ضمن `merchant_wallet` | `[NEEDS BACKEND]` → `GET /api/v1/wallet/transactions/?currency&type&from&to&page` → `{count, results:[{id, type, reason, reference:{kind,id}, display_amount, display_balance_after, created_at}]}` |
| طلبات السحب | `merchant_withdrawal_request` POST | `[NEEDS BACKEND]` → `GET/POST /api/v1/wallet/withdrawals/` `{currency, amount, payout_account_id}` → `{id, status}` |
| المستحقات للمنصة | Django admin / `master-dashboard/dues` | `[NEEDS BACKEND]` → `GET /api/v1/wallet/dues/?kind=commission |

### M15 — إعدادات الشحن والمناطق والمندوبين (Shipping Zones & Couriers)

| Need | Backend today | Status |
|---|---|---|
| رسوم الشحن العامة | `shipping_settings` (`ShippingSettingsForm`) | `[NEEDS BACKEND]` → `GET/PATCH /api/v1/shipping/settings/` `{default_delivery_fee, free_shipping_threshold}` → مع `display_*` |
| طرق التوصيل CRUD | ضمن `shipping_settings` | `[NEEDS BACKEND]` → `GET/POST /api/v1/shipping/delivery-methods/`, `PATCH/DELETE /<id>/` |
| نقاط الاستلام CRUD | `pickup_locations` | `[NEEDS BACKEND]` → `GET/POST /api/v1/shipping/pickup-locations/`, `PATCH/DELETE /<id>/`, `POST /reorder/` `{ordered_ids}` |
| المندوبون/شركات الشحن CRUD | `shipping_providers`, `shipping_companies` | `[NEEDS BACKEND]` → `GET/POST /api/v1/shipping/providers/?carrier_code`, `PATCH/DELETE /<id>/` |
| إعدادات الناقلين | `carrier_settings` | `[NEEDS BACKEND]` → `GET /api/v1/shipping/carriers/` → `[{carrier_code, name, is_connected, fields:[{name,label,is_secret,required}], webhook_url, last_event_at}]`؛ `PUT /<code>/credentials/`؛ `POST /<code>/test/` |
| webhook الناقل (وارد) | `POST /api/v1/webhooks/carrier/<carrier_code>/` + `X-Carrier-Signature` | Ready (يُعرض الرابط فقط) |
| مناطق شروة شيب | `sharwa_ship.SharwaShipZone` (Django admin) | `[NEEDS BACKEND]` → `GET /api/v1/shipping/sharwa-ship/zones/` (قراءة) |
| ملفات التغليف | `packaging_profiles` | `[NEEDS BACKEND]` → `GET/POST /api/v1/shipping/packaging-profiles/`, `PATCH/DELETE /<id>/` |
| مراجعة المناطق | `zone_review` | `[NEEDS BACKEND]` → `GET /api/v1/shipping/zone-review/?status&page`, `POST /<order_id>/resolve/` `{action: confirm |
| النطاقات المحظورة / SLA | `zones.py` (نماذج) | `[NEEDS BACKEND]` → `GET/POST/PATCH/DELETE /api/v1/shipping/restricted-zones/`, `/api/v1/shipping/sla-rules/` |
| الحالات الحدّية | `edge_cases` | `[NEEDS BACKEND]` → `GET /api/v1/shipping/edge-cases/?kind=out_of_order |
| تحديث عنوان أثناء النقل | `update_address_in_transit` POST | `[NEEDS BACKEND]` → `POST /api/v1/shipments/<id>/address/` `{address, latitude?, longitude?}` |
| تحويل إلى استلام | `convert_order_to_pickup` POST | `[NEEDS BACKEND]` → `POST /api/v1/orders/<id>/convert-to-pickup/` `{pickup_location_id, version}` → 200/409 |

### M16 — نقاط البيع (POS Interface)

| Need | Backend today | Status |
|---|---|---|
| أجهزة الكاش لموقع الموظف | ضمن `shift_hub` HTML | `[NEEDS BACKEND]` → `GET /api/v1/pos/registers/?location` → `[{id, name, is_active, open_shift:{id, staff_name, opened_at}\|null}]` |
| فتح وردية | `open_shift` POST | `[NEEDS BACKEND]` → `POST /api/v1/pos/shifts/` `{register_id, opening_float}` → `{id, status, opened_at}` |
| الوردية الحالية + ملخصها | `cash_drawer` HTML | `[NEEDS BACKEND]` → `GET /api/v1/pos/shifts/current/` → `{id, status, register, display_opening_float, display_expected_closing, movements:[{id, movement_type, display_amount, note, created_at}]}` |
| إضافة حركة كاش | `add_cash_movement` POST | `[NEEDS BACKEND]` → `POST /api/v1/pos/shifts/<id>/movements/` `{movement_type, amount, note, idempotency_key}` |
| إغلاق وردية | `close_shift` POST | `[NEEDS BACKEND]` → `POST /api/v1/pos/shifts/<id>/close/` `{actual_closing}` → `{status, display_variance, approval_id?}` |
| حلّ فرق الوردية (مدير) | `resolve_shift_variance` POST | `[NEEDS BACKEND]` → `POST /api/v1/pos/shifts/<id>/resolve-variance/` `{decision, version}` |
| بحث منتجات للبيع (باركود/SKU/اسم) | `product_list_hub` HTML؛ `/api/v1/catalog/products/?search` عام | Ready جزئياً؛ يُضاف `?barcode=` و`stock` للموقع → `GET /api/v1/pos/products/?q&barcode&location` |
| إنشاء إيصال POS | `create_order` POST | `[NEEDS BACKEND]` → `POST /api/v1/pos/orders/` `{register_id, items:[{product_id, variant_id?, quantity, discount_percent?}], cart_discount_percent?, payment_method, idempotency_key}` → `{id, display_total, receipt}` |
| استرجاع من POS + OTP | `order_refund_form` POST | `[NEEDS BACKEND]` → `POST /api/v1/pos/orders/<id>/refund/` `{amount, otp_code?}` → 428 عند الحاجة لـ OTP |
| حد الخصم للدور الفعّال | `Role.max_discount_percent` | `[NEEDS BACKEND]` → ضمن `GET /api/v1/me/` (M18) `{permissions:[], max_discount_percent}` |

### M17 — التسويق بالعمولة والمؤثرون (Affiliates & Influencers)

| Need | Backend today | Status |
|---|---|---|
| قائمة المسوّقين + أداء | `affiliates_list` HTML | `[NEEDS BACKEND]` → `GET /api/v1/affiliates/?q&sort&has_pending` → `[{id, name, phone, referral_code, is_active, commission_type, commission_value, clicks_count, sales_count, display_sales_total, display_pending, display_paid, last_sale_at}]` |
| إنشاء/تعديل/تعطيل مسوّق | `affiliates_list` POST (`AffiliateForm`) | `[NEEDS BACKEND]` → `POST /api/v1/affiliates/`, `PATCH /api/v1/affiliates/<id>/` `{…, is_active}` |
| مبيعات مسوّق | — | `[NEEDS BACKEND]` → `GET /api/v1/affiliates/<id>/sales/?payout_status` → `[{id, order_id, order_number, display_order_total, display_commission, payout_status, created_at}]` |
| تعليم مبيعات مسوّق مدفوعة | — | `[NEEDS BACKEND]` → `POST /api/v1/affiliates/<id>/sales/mark-paid/` `{sale_ids:[]}` → `{updated, display_total}` |
| قائمة المؤثرين + أداء | `influencers` HTML | `[NEEDS BACKEND]` → `GET /api/v1/influencers/` → `[{id, name, contact, referral_code, is_active, commission_type, commission_value, coupons:[{code, used_count, max_uses, is_active}], sales_count, display_pending, display_paid}]` |
| إنشاء/تعديل مؤثر | `influencers` POST (`InfluencerForm`) | `[NEEDS BACKEND]` → `POST /api/v1/influencers/`, `PATCH /api/v1/influencers/<id>/` |
| مبيعات مؤثر + تعليم مدفوعة | — | `[NEEDS BACKEND]` → `GET /api/v1/influencers/<id>/sales/`, `POST /api/v1/influencers/<id>/sales/mark-paid/` |
| نطاق المتجر لبناء الرابط | `GET /api/v1/config/` | Ready (يُستخدم الـ host الحالي) |
| تقرير المسوّقين | `report_detail/affiliates` HTML | يُعرض من M25 (رابط فقط) |

### M18 — الموظفون والأدوار والصلاحيات (Staff & RBAC)

| Need | Backend today | Status |
|---|---|---|
| قائمة/إضافة موظفين | `staff_list` HTML | `[NEEDS BACKEND]` → `GET/POST /api/v1/staff/?status&q&page` → `{count, results:[{id, full_name, phone, is_active, terminated_at, roles_summary, last_seen_at}]}` |
| تفاصيل/تعديل/إنهاء | `staff_detail` | `[NEEDS BACKEND]` → `GET/PATCH /api/v1/staff/<id>/`, `POST /<id>/terminate/`, `POST /<id>/revoke-sessions/` (يرفع `token_version`) |
| قائمة الصلاحيات | `Permission` (نماذج) | `[NEEDS BACKEND]` → `GET /api/v1/permissions/` → `[{code, name, category}]` |
| الأدوار CRUD | `staff_roles` | `[NEEDS BACKEND]` → `GET/POST /api/v1/roles/`, `PATCH/DELETE /<id>/` `{name, max_discount_percent, permission_codes[]}`؛ النظامية ترفض التعديل 403 |
| التعيينات | `staff.manage_assignments` HTML | `[NEEDS BACKEND]` → `GET/PUT /api/v1/staff/<id>/assignments/` `[{location_id, role_id, location_role}]` |
| الاستثناءات | `PermissionOverride` | `[NEEDS BACKEND]` → `GET/POST/DELETE /api/v1/staff/<id>/overrides/` `{permission_code, allow}`؛ `GET /<id>/effective-permissions/?location_id` |
| الجلسات/الرموز/الأجهزة/الجدول | `end_staff_session(s)` | `[NEEDS BACKEND]` → `GET/DELETE /api/v1/staff/<id>/sessions/[<sid>/]`, `GET/POST/DELETE /tokens/`, `GET/DELETE /devices/`, `GET/PUT /roster/` |
| طلبات الموافقة | `approval_requests`, `resolve_approval` POST | `[NEEDS BACKEND]` → `GET /api/v1/approvals/?status&type&page`, `POST /<id>/resolve/` `{decision: approved |
| سجل التدقيق | `audit_log`, `verify_audit_chain` | `[NEEDS BACKEND]` → `GET /api/v1/audit-log/?actor&action&from&to&page`, `POST /api/v1/audit-log/verify/` → `{ok, broken_at?}` |
| التنبيهات السلوكية | `behavior_alerts` | `[NEEDS BACKEND]` → `GET /api/v1/behavior-alerts/?level&unread`, `POST /<id>/read/` |
| العدّادات | ضمن الشريط الجانبي | `[NEEDS BACKEND]` → `GET /api/v1/staff/counters/` → `{pending_approvals, unread_alerts}` |

### M19 — النطاقات وأدوات التتبع والـ Webhooks والتكاملات (Domains, Webhooks & Integrations)

| Need | Backend today | Status |
|---|---|---|
| النطاق الفرعي الحالي | `Domain(is_primary)` + `TENANT_BASE_DOMAIN` | `[NEEDS BACKEND]` → `GET /api/v1/domains/` → `{base_domain, results:[{id, domain, is_primary, kind: subdomain |
| إضافة نطاق مخصص | Absent (admin-only) | `[NEEDS BACKEND]` → `POST /api/v1/domains/` `{domain}` → 201 بالكيان وحالة `pending_dns` |
| تحقّق / أساسي / حذف | Absent | `[NEEDS BACKEND]` → `POST /api/v1/domains/<id>/verify/`, `POST /<id>/set-primary/`, `DELETE /<id>/` (الأساسي لا يُحذف) |
| أدوات التتبع | `tracking_tools` HTML (`TrackingSettingsForm`) | `[NEEDS BACKEND]` → `GET/PATCH /api/v1/store/tracking/` → الحقول العشرة مع `has_meta_conversions_api_token`, `has_tiktok_events_api_token` بدل القيم |
| قائمة أحداث Webhook | Absent | `[NEEDS BACKEND]` → `GET /api/v1/webhooks/events/` → `[{code, name, description}]` |
| نقاط النهاية CRUD | Absent | `[NEEDS BACKEND]` → `GET/POST /api/v1/webhooks/endpoints/` (POST يُعيد `secret` مرة)، `PATCH/DELETE /<id>/`, `POST /<id>/rotate-secret/`, `POST /<id>/test/` |
| سجل التسليم | Absent | `[NEEDS BACKEND]` → `GET /api/v1/webhooks/endpoints/<id>/deliveries/?status&event&from&to&page`, `POST /deliveries/<did>/redeliver/` |
| حالة التكاملات | متفرقة في M27–M31 HTML | `[NEEDS BACKEND]` → `GET /api/v1/integrations/status/` → `[{code, name, status, last_event_at, manage_href}]`؛ حتى توفره تُجمَّع من عقود الوحدات حين تتوفر |

### M20 — بوابة مالك المنصة (Super Admin SaaS Portal)

| Need | Backend today | Status |
|---|---|---|
| النظرة العامة | `platform_master_dashboard` HTML | `[NEEDS BACKEND]` → `GET /api/v1/platform/overview/` → `{total_stores, display_total_sales, total_orders, failed_stores, recent_stores:[...]}` |
| المتاجر | `ClientAdmin` | `[NEEDS BACKEND]` → `GET /api/v1/platform/stores/?status&plan&is_active&q&page`, `GET /<schema>/` |
| إعادة التجهيز / شروة شيب | admin actions | `[NEEDS BACKEND]` → `POST /api/v1/platform/stores/reprovision/` `{schemas[]}`, `POST /<schema>/sharwa-ship/` `{active}` |
| تجاوزات الميزات | `TenantFeatureOverride` admin (bulk) | `[NEEDS BACKEND]` → `GET /api/v1/platform/stores/<schema>/features/` → `[{code, effective, source, override?}]`, `PUT /features/` `{overrides:[{code, is_enabled |
| الخطط / الميزات / المفاتيح | Billing admin | `[NEEDS BACKEND]` → `GET/POST/PATCH /api/v1/platform/plans/`, `/plans/<code>/features/`, `GET/PATCH /api/v1/platform/features/<code>/`, `GET/PATCH /api/v1/platform/billing-settings/` |
| المستحقات (8 إجراءات) | `platform_dues_dashboard` POST | `[NEEDS BACKEND]` → `GET /api/v1/platform/dues/?kind&status&schema&from&to&page`; `POST /api/v1/platform/dues/commissions/<id>/{collect |
| Sharwa Pay | SharwaPay admin | `[NEEDS BACKEND]` → `GET /api/v1/platform/sharwa-pay/topups/?status`, `POST /<id>/{approve |
| مناطق شروة شيب | SharwaShip admin | `[NEEDS BACKEND]` → `GET/POST/PATCH/DELETE /api/v1/platform/sharwa-ship/zones/` |
| التطبيقات | Appstore admin | `[NEEDS BACKEND]` → `GET/POST/PATCH /api/v1/platform/apps/`, `/apps/<code>/overrides/` |
| فئات السوق | `MarketCategory` admin | `[NEEDS BACKEND]` → `GET/POST/PATCH/DELETE /api/v1/platform/market-categories/`, `POST /reorder/` |
| أحداث Webhook المعلّقة | `PendingWebhookEvent` admin | `[NEEDS BACKEND]` → `GET /api/v1/platform/webhook-events/?status`, `POST /<id>/{retry |
| دورة حياة التعطيل | `TenantDeactivationRecord` (نموذج فقط) | `[NEEDS BACKEND]` → `GET/POST /api/v1/platform/stores/<schema>/deactivation/` `{action: suspend |
| المصادقة | جلسة Django admin | `[NEEDS BACKEND]` → مصادقة جلسة superuser/staff على `/api/v1/platform/*` + CSRF |

### M21 — مركز المخزون ودفتر الحركات (Inventory Hub & Stock Ledger)

| Need | Backend today | Status |
|---|---|---|
| جدول المخزون | `inventory_hub` HTML | `[NEEDS BACKEND]` → `GET /api/v1/inventory/?q&status&location&category&is_serialized&page&page_size` → `{count, results:[{product_id, variant_id, name, variant_label, sku, barcode, unit, stock, low_stock_threshold, allow_backorder, is_serialized, location:{on_hand, reserved, quarantine, available}?}]}` |
| تعديل يدوي | `update_product_stock` POST | `[NEEDS BACKEND]` → `POST /api/v1/inventory/adjustments/` `{product_id, variant_id?, location_id?, delta?, new_quantity?, reason: manual_adjust\|restock, note}` → `{stock, movement_id}` / 400 `{field:[msg]}` |
| دفتر الحركات | غير معروض (نموذج فقط) | `[NEEDS BACKEND]` → `GET /api/v1/inventory/movements/?product&variant&location&reason&from&to&page` → `{count, results:[{id, product_name, variant_label, location_name, delta, quantity_after, reason, reference:{type, id, label}, actor, created_at}]}` |
| الوحدات المسلسلة | نموذج `InventoryItem` فقط | `[NEEDS BACKEND]` → `GET /api/v1/inventory/items/?product&status&q` |
| الحجوزات | نموذج `InventoryReservation` فقط | `[NEEDS BACKEND]` → `GET /api/v1/inventory/reservations/?status&product` |
| طلب إعدام | `approval_requests` HTML | `[NEEDS BACKEND]` → `POST /api/v1/approvals/` `{request_type: stock_writeoff, product_id, variant_id?, location_id?, quantity, note}` (مشترك مع M18) |
| عدّاد المنخفض | ضمن `inventory_hub` | `[NEEDS BACKEND]` → `GET /api/v1/inventory/counters/` → `{low, out, pending_writeoffs}` |
| مخزون الموقع | `location_inventory` HTML | انظر M22 |

### M22 — المواقع والمستودعات والفروع (Locations / Warehouses / Branches)

| Need | Backend today | Status |
|---|---|---|
| تبديل الوضع | `toggle_multi_location_mode` POST | `[NEEDS BACKEND]` → `POST /api/v1/locations/mode/` `{enabled}` → `{multi_location_enabled}` |
| قائمة المواقع | `location_list` HTML | `[NEEDS BACKEND]` → `GET /api/v1/locations/?q&flag&ownership&is_active` → `[{id, code, name, city, display_type, ownership, is_active, parent_location, flags{…8}, products_count}]` |
| إنشاء/تعديل/تعطيل | `location_form` POST | `[NEEDS BACKEND]` → `POST /api/v1/locations/`, `PATCH /api/v1/locations/<id>/` (يشمل `operating_hours[]`, `locker`, `franchise`, `dropship_supplier`, `vehicle`, `external_refs[]` شرطياً) → الكائن مع `display_type` |
| مخزون الموقع | `location_inventory` HTML | `[NEEDS BACKEND]` → `GET /api/v1/locations/<id>/inventory/?q&below_reorder&page` → `{count, results:[{product_id, variant_id, name, sku, on_hand, reserved, quarantine, available, reorder_point}]}` |
| تعيين كمية | `set_location_inventory` POST | `[NEEDS BACKEND]` → عبر `POST /api/v1/inventory/adjustments/` (M21) + `PATCH /api/v1/locations/<id>/inventory/<variant_or_product>/` `{reorder_point, quarantine_quantity}` |
| موظفو الموقع | `location_staff` HTML | `[NEEDS BACKEND]` → `GET/POST /api/v1/locations/<id>/staff/` `{staff_id, role}`, `DELETE /<assignment_id>/` |
| قواعد التوجيه | `location_routing_rules` HTML | `[NEEDS BACKEND]` → `GET/POST /api/v1/locations/routing-rules/`, `PATCH/DELETE /<id>/`, `POST /reorder/` `{ordered_ids:[int]}` → `{ok, reordered}` |
| تحذير التعطيل | — | `[NEEDS BACKEND]` → `GET /api/v1/locations/<id>/deactivation-impact/` → `{on_hand_total, open_fulfillments}` |

### M23 — الموردون وأوامر الشراء (Suppliers & Purchase Orders)

| Need | Backend today | Status |
|---|---|---|
| الموردون CRUD | `supplier_list` HTML + `SupplierForm` | `[NEEDS BACKEND]` → `GET/POST /api/v1/suppliers/`, `GET/PATCH/DELETE /api/v1/suppliers/<id>/` |
| قائمة أوامر الشراء مفلترة | `purchase_order_list` HTML | `[NEEDS BACKEND]` → `GET /api/v1/purchase-orders/?status&supplier&location&from&to&q&page` → `{count, results:[{id, number, supplier:{id,name}, location:{id,name}, status, display_total, lines_count, created_at}]}` |
| إنشاء/تعديل مسودة | `purchase_order_create` POST + `PurchaseOrderForm` | `[NEEDS BACKEND]` → `POST /api/v1/purchase-orders/` `{supplier_id, location_id, notes?, lines:[{product_id, variant_id?, quantity_ordered, unit_cost}]}`, `PATCH /<id>/` للمسودة فقط |
| تفاصيل الأمر + الجدول الزمني | `purchase_order_detail` HTML | `[NEEDS BACKEND]` → `GET /api/v1/purchase-orders/<id>/` → `{…, version, lines:[{id, product_name, sku, quantity_ordered, quantity_received, display_unit_cost, display_line_total}], approval:{id,status,approver}?, timeline:[]}` |
| إرسال للموافقة | `purchase_order_submit` POST | `[NEEDS BACKEND]` → `POST /api/v1/purchase-orders/<id>/submit/` → `{status, approval_id}` |
| قرار الموافقة | `purchase_order_resolve` POST / `resolve_approval` | `[NEEDS BACKEND]` → `POST /api/v1/purchase-orders/<id>/resolve/` `{decision: approve\|reject, version}` → 200/409 |
| تسجيل الاستلام | `purchase_order_receive` POST | `[NEEDS BACKEND]` → `POST /api/v1/purchase-orders/<id>/receive/` `{lines:[{line_id, quantity_received_now}], version}` → `{status, lines:[…]}` |
| إلغاء | `purchase_order_cancel` POST | `[NEEDS BACKEND]` → `POST /api/v1/purchase-orders/<id>/cancel/` `{version}` |
| بحث منتجات للسطور | `/api/v1/catalog/products/?search` | Ready جزئياً؛ يحتاج المتغيرات وSKU → يُوحَّد مع M04 |

### M24 — المرتجعات والخدمات اللوجستية العكسية (Returns & Reverse Logistics / RMA)

| Need | Backend today | Status |
|---|---|---|
| قائمة الإرجاعات | `GET /api/v1/returns/?status&q` (perm `orders.process_returns`) | Ready |
| إنشاء إرجاع | `POST /api/v1/returns/` `{order_id, reason, refund_method, line_items:[{fulfillment_item_id, quantity_returned, restock}]}` | Ready |
| العناصر القابلة للإرجاع | `GET /api/v1/returns/order/<order_id>/items/` → `[{fulfillment_item_id, product_name, quantity, remaining, unit_refund_amount, location_name}]` | Ready |
| تفاصيل الإرجاع | `GET /api/v1/returns/<pk>/` | Ready |
| اعتماد/رفض | `POST /api/v1/returns/<pk>/approve/` `{decision: approve\|reject, version, location_id?}` → 200 / 409 / `{detail}` (منها `CashLiquidityError`) | Ready |
| إنشاء RMA | `POST /api/v1/returns/rma/create/` `{order_id, fulfillment_item_id, destination_location_id, quantity?, reason}` | Ready |
| مسح الاستلام | `POST /api/v1/warehouse/returns/scan/` `{rma_id, location_id}` | Ready |
| قرار QA | `POST /api/v1/warehouse/returns/<rma_id>/qa-decision/` `{decision}` | Ready |
| قائمة/تفاصيل RMA | `reverse_logistics`, `rma_*` HTML | `[NEEDS BACKEND]` → `GET /api/v1/returns/rma/?status&q&page`, `GET /api/v1/returns/rma/<id>/` → `{id, order_id, fulfillment_item, reason, status, fee_payer, destination_location, quantity, events:[{to_status, at, actor}]}` |
| سجل الاسترجاعات المالية | `order_refunds_list` HTML | `[NEEDS BACKEND]` → `GET /api/v1/orders/refunds/?method&from&to&q&page` → `{count, results:[{id, order_id, display_amount, method, reason, loyalty_points_clawed_back, created_at}]}` |
| موثوقية العميل | نموذج فقط | `[NEEDS BACKEND]` → `GET /api/v1/customers/<phone>/reliability/` → `{cod_refusals_count, cod_disabled}`, `PATCH` `{cod_disabled}` |

### M25 — مركز التقارير والتصدير والتقارير المجدولة (Reports Hub, Exports & Scheduled Reports)

| Need | Backend today | Status |
|---|---|---|
| الفهرس | `merchant_reports` HTML + `report_groups` context | `[NEEDS BACKEND]` → `GET /api/v1/reports/` → `[{category, title, reports:[{code, title, description, status, permission, allowed}]}]` |
| بيانات تقرير | `report_detail/<code>` HTML | `[NEEDS BACKEND]` → `GET /api/v1/reports/<code>/?from&to&compare_from&compare_to&location&page` → `{summary:[{key, label, display_value, compare_display_value, delta_pct}], series:[{label, points:[{x, y, display_y}]}], table:{columns:[{key, label, type}], rows:[…], count}}` |
| إنشاء تصدير | `enqueue_report_export` POST | `[NEEDS BACKEND]` → `POST /api/v1/reports/<code>/exports/` `{format: csv\|xlsx, params}` → `{job_id, status}` |
| حالة التصدير | `report_export_status` JSON | `[NEEDS BACKEND]` → `GET /api/v1/reports/exports/<job_id>/` → `{status, download_token, expires_at, error}` |
| تنزيل | `report_export_download` | `[NEEDS BACKEND]` → `GET /api/v1/reports/exports/<job_id>/download/?token=` (ملف) |
| تصديراتي | `my_exports` HTML | `[NEEDS BACKEND]` → `GET /api/v1/reports/exports/?page` |
| المجدولة | `scheduled_reports` HTML | `[NEEDS BACKEND]` → `GET/POST /api/v1/reports/schedules/` `{report_code, frequency, email}`, `PATCH/DELETE /<id>/` |
| تحديث اليوم | `refresh_today_metrics` POST | `[NEEDS BACKEND]` → `POST /api/v1/reports/refresh-today/` → `{refreshed_at}` |

### M26 — الحجوزات والمواعيد (Bookings & Appointments)

| Need | Backend today | Status |
|---|---|---|
| الخدمات القابلة للحجز | `booking_services_list` HTML | `[NEEDS BACKEND]` → `GET /api/v1/bookings/services/` → `[{id, name, booking_duration_minutes, availability_count, image}]` |
| نوافذ التوفر لخدمة | `manage_service_availability` HTML (`ServiceAvailabilityForm`) | `[NEEDS BACKEND]` → `GET/PUT /api/v1/bookings/services/<id>/availability/` `[{weekday, start_time, end_time}]` (استبدال كامل) |
| حجوزات نطاق زمني | `bookings_calendar` HTML | `[NEEDS BACKEND]` → `GET /api/v1/bookings/slots/?from&to&product&status` → `[{id, product:{id,name}, start_datetime, end_datetime, status, held_until, customer_name, customer_phone, order_id}]` |
| إلغاء حجز (تاجر) | — | `[NEEDS BACKEND]` → `POST /api/v1/bookings/slots/<id>/cancel/` |
| المواعيد المتاحة للمشتري | `GET /product/<id>/available-slots/` JSON | Ready (يُوحَّد لاحقاً تحت `GET /api/v1/catalog/products/<id>/slots/?date`) |
| احتجاز موعد | `POST /product/<id>/book/` HTML | `[NEEDS BACKEND]` → `POST /api/v1/catalog/products/<id>/slots/hold/` `{start_datetime}` → `{slot_id, held_until}` |
| تمرير الموعد للدفع | حقل `start_datetime` في checkout POST | يُغطّى في M12 |
| منطقة وقت المتجر وبداية الأسبوع | `StoreSetting.timezone`, `week_start_day` | `[NEEDS BACKEND]` → ضمن `GET /api/v1/config/` أو M34 |

### M27 — صندوق المحادثات الموحَّد وقنوات التواصل (Unified Inbox & Social Channels)

| Need | Backend today | Status |
|---|---|---|
| حالة القنوات | `social_channels_hub` HTML | `[NEEDS BACKEND]` → `GET /api/v1/channels/` → `[{channel_code, connected, account_name, error, connected_at}]` |
| بدء OAuth Meta/TikTok | مسارات OAuth HTML | Ready كمسارات تحويل خادمية (تُفتح بالمتصفح وتعود إلى `/dashboard/channels`) |
| ربط/فصل تيليجرام | `telegram_connect` POST | `[NEEDS BACKEND]` → `POST /api/v1/channels/telegram/connect/` `{bot_token}` → `{bot_username}`؛ `POST /api/v1/channels/<code>/disconnect/` |
| قائمة المحادثات | `channel_inbox_list` HTML + poll JSON | `[NEEDS BACKEND]` → `GET /api/v1/inbox/conversations/?status&channel&assigned&unread&q&page` → `{count, results:[{id, channel_code, contact_name, external_contact_id, last_message_preview, last_message_at, unread_count, status, assigned_staff:{id,name}, order_id}]}` |
| رسائل محادثة + استطلاع | `channel_inbox_detail` + poll JSON | Ready جزئياً (poll) → `GET /api/v1/inbox/conversations/<id>/messages/?after=<id>` → `[{id, direction, sender_type, sender_name, text, media:[{url,type}], status, created_at}]` |
| إرسال ردّ | `channel_inbox_*` POST | `[NEEDS BACKEND]` → `POST /api/v1/inbox/conversations/<id>/messages/` `{text?, template_id?, product_id?, client_id}` |
| إسناد / حالة / تعليم مقروء | — | `[NEEDS BACKEND]` → `PATCH /api/v1/inbox/conversations/<id>/` `{status?, assigned_staff_id?, mark_read?}` |
| تحويل إلى طلب | `convert_conversation_to_order` POST | `[NEEDS BACKEND]` → `POST /api/v1/inbox/conversations/<id>/convert-to-order/` → `{order_id}` (أو تمرير السياق إلى `POST /api/v1/orders/` M06) |
| المحفّزات CRUD | `channel_keywords_*` | `[NEEDS BACKEND]` → `GET/POST /api/v1/channels/keywords/`, `PATCH/DELETE /<id>/` |
| القوالب CRUD | templates views | `[NEEDS BACKEND]` → `GET/POST /api/v1/channels/templates/`, `PATCH/DELETE /<id>/` |
| مزامنة الكتالوج + حالة المنتجات | catalog settings/sync views | `[NEEDS BACKEND]` → `GET/PUT /api/v1/channels/<code>/catalog-sync/` `{scope, category_ids, price_adjustment_percent, stock_shield_enabled}`؛ `POST /run/`؛ `GET /api/v1/channels/<code>/products/?sync_status` |
| ربط فئات تيك توك | `tiktok_category_mapping` | `[NEEDS BACKEND]` → `GET/PUT /api/v1/channels/tiktok/category-mapping/` `[{category_id, external_category_id}]` |
| وصول الموظفين | `channel_staff_access` | `[NEEDS BACKEND]` → `GET/PUT /api/v1/channels/staff-access/` `[{staff_id, channel_code, can_view, can_reply}]` |
| عدّاد غير المقروء للشريط | ضمن sidebar context | `[NEEDS BACKEND]` → `GET /api/v1/inbox/counters/` → `{unread}` |

### M28 — الأسواق الإلكترونية: أمازون ونون (Marketplaces)

| Need | Backend today | Status |
|---|---|---|
| حالة الأسواق | `marketplaces_hub` HTML | `[NEEDS BACKEND]` → `GET /api/v1/marketplaces/` → `[{marketplace, connected, account_label, connected_at, last_job:{id,job_type,status,finished_at}}]` |
| ربط أمازون (OAuth) | مسار OAuth HTML | Ready كتحويل خادمي يعود إلى `/dashboard/marketplaces` |
| ربط/فصل نون | `noon_connect` POST | `[NEEDS BACKEND]` → `POST /api/v1/marketplaces/noon/connect/` `{api_key}`؛ `POST /api/v1/marketplaces/<market>/disconnect/` |
| إعدادات السوق | settings views | `[NEEDS BACKEND]` → `GET/PUT /api/v1/marketplaces/<market>/settings/` `{currency, markup_percent, fx_rate, auto_push, inventory_sync, stock_buffer, order_pull, default_order_status_id}` → + `preview:{display_sample_price}` |
| القوائم مفلترة | `marketplace_listings*` HTML | `[NEEDS BACKEND]` → `GET /api/v1/marketplaces/<market>/listings/?sync_status&identifier_type&q&page` → `{count, results:[{id, product:{id,name,sku,image}, identifier_type, identifier_value, display_market_price, price_override, sync_status, last_error, last_synced_at}]}` |
| تحرير معرّف / تجاوز سعر | `marketplace_listings*` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/marketplaces/<market>/listings/<id>/` `{identifier_type?, identifier_value?, price_override?}` |
| دفع فردي/جماعي | `marketplace_listings*` POST | `[NEEDS BACKEND]` → `POST /api/v1/marketplaces/<market>/listings/push/` `{listing_ids:[]}` → `{job_id}` |
| سجل المهام + تفاصيل | `marketplace_sync_jobs*` HTML | `[NEEDS BACKEND]` → `GET /api/v1/marketplaces/jobs/?market&job_type&status&page`, `GET /jobs/<id>/` → `{…, success_count, error_count, errors_csv_url, triggered_by}` |
| سحب الطلبات الآن / مخزون FBA | `marketplace_pull_orders_now`, `marketplace_refresh_fba_inventory` POST | `[NEEDS BACKEND]` → `POST /api/v1/marketplaces/<market>/jobs/` `{job_type: order_pull\|fba_inventory}` → `{job_id}` |
| طلبات الأسواق | ضمن `order_list` بـ `traffic_source` | `[NEEDS BACKEND]` → `GET /api/v1/marketplaces/orders/?market&fulfillment&status&page` → `[{order_id, order_number, marketplace, external_order_id, fulfillment, marketplace_status, shipment_confirm_status, display_total, created_at}]` |
| إعادة تأكيد الشحنة | — | `[NEEDS BACKEND]` → `POST /api/v1/marketplaces/orders/<order_id>/confirm-shipment/` |

### M29 — الدروبشيبينغ وملفات الموردين (Dropshipping & Supplier Feeds)

| Need | Backend today | Status |
|---|---|---|
| حالة الموردين | `dropshipping_hub` HTML | `[NEEDS BACKEND]` → `GET /api/v1/dropshipping/suppliers/` → `[{supplier_code, connected, last_sync_at, settings:{…}, attention_count}]` |
| ربط/فصل/إعدادات | connect/disconnect/settings POST | `[NEEDS BACKEND]` → `POST /api/v1/dropshipping/suppliers/<code>/connect/` `{credentials}`؛ `POST /disconnect/`؛ `GET/PUT /settings/` `{sync_products, sync_prices, sync_inventory, intervals, stock_buffer, hide_when_out_of_stock}` |
| مزامنة المخزون الآن | inventory sync POST | `[NEEDS BACKEND]` → `POST /api/v1/dropshipping/suppliers/<code>/sync-inventory/` → `{job_id}` |
| تدوير رمز Webhook | webhook rotate POST | `[NEEDS BACKEND]` → `POST /api/v1/dropshipping/suppliers/<code>/webhook/rotate/` → `{webhook_url}` (مرة واحدة) |
| قواعد التسعير CRUD | pricing rules views | `[NEEDS BACKEND]` → `GET/POST /api/v1/dropshipping/pricing-rules/`, `PATCH/DELETE /<id>/` |
| محاكاة / تطبيق قاعدة | — | `[NEEDS BACKEND]` → `POST /api/v1/dropshipping/pricing-rules/simulate/` `{rule}` → `{sample:[{product, display_cost, display_current, display_after}], affected_count}`؛ `POST /<id>/apply/` → `{updated}` |
| كتالوج المورد | catalog views | `[NEEDS BACKEND]` → `GET /api/v1/dropshipping/suppliers/<code>/catalog/?q&category&import_status&page` → `{count, results:[{id, name, image, display_cost, display_suggested_price, variants_count, import_status, product_id}]}` |
| استيراد منتجات | products views POST | `[NEEDS BACKEND]` → `POST /api/v1/dropshipping/suppliers/<code>/import/` `{supplier_product_ids:[]}` → `{job_id}` |
| ملفات: إنشاء/ربط/معاينة/اعتماد/تشغيل/أخطاء/جدولة | feeds new/mapping/preview/approve/run/errors | `[NEEDS BACKEND]` → `POST /api/v1/dropshipping/feeds/` (multipart أو `{url}`) → `{feed_id, columns:[]}`؛ `PUT /feeds/<id>/mapping/` `{mapping:{field: column}}`؛ `GET /feeds/<id>/preview/` → `{rows:[], errors_count}`؛ `POST /feeds/<id>/approve/`؛ `POST /feeds/<id>/run/` → `{job_id}`؛ `GET /feeds/<id>/errors.csv`؛ `PATCH /feeds/<id>/` `{schedule_interval}` |
| طلبات الموردين | orders views | `[NEEDS BACKEND]` → `GET /api/v1/dropshipping/orders/?status&supplier&attention&page` → `{count, results:[{id, order_id, order_number, supplier_code, status, supplier_reference, tracking_number, display_cost, last_error, updated_at}]}` |
| مهام المزامنة + حالة | job status JSON | Ready جزئياً → `GET /api/v1/dropshipping/jobs/?supplier&status`, `GET /jobs/<id>/`, `POST /jobs/<id>/retry/` |

### M30 — متجر التطبيقات (App Store)

| Need | Backend today | Status |
|---|---|---|
| كتالوج التطبيقات + حالة التثبيت | `app_marketplace` HTML | `[NEEDS BACKEND]` → `GET /api/v1/apps/` → `[{code, name, description, icon, is_free, display_price, billing_interval, billing_enabled, installation:{is_active, suspended_by_platform, subscription_expires_at}\|null}]` |
| تثبيت / تفعيل / تعطيل | `app_marketplace` POST | `[NEEDS BACKEND]` → `POST /api/v1/apps/<code>/install/`, `POST /activate/`, `POST /deactivate/` → `{installation}` |
| أحداث التثبيت | — | `[NEEDS BACKEND]` → `GET /api/v1/apps/<code>/events/` → `[{event, created_at, note}]` |
| سجل استخدام الواتساب | `whatsapp_app_*` HTML | `[NEEDS BACKEND]` → `GET /api/v1/apps/whatsapp/usage/?status&event_type&from&to&page` → `{count, results:[{id, event_type, recipient_phone, status, order_id, error, created_at}]}` |
| قوالب الواتساب | `whatsapp_app_*` HTML | `[NEEDS BACKEND]` → `GET /api/v1/apps/whatsapp/templates/`, `PATCH /<id>/` `{body}` → `{…, variables:[], preview}` |
| رابط SharwaConnect | `whatsapp_app_*` | `[NEEDS BACKEND]` → `GET /api/v1/apps/whatsapp/connect-url/` → `{url, connected}` |
| رسوم التطبيق | `AppBillingCharge` (admin dues) | `[NEEDS BACKEND]` → `GET /api/v1/apps/<code>/charges/` → `[{period_start, period_end, display_amount, status}]` |

### M31 — وحدة تحكم شروة AI للدعم (Sharwa AI Support Console)

| Need | Backend today | Status |
|---|---|---|
| حالة الربط (استطلاع) | `sharwa_ai_*` HTML + webhook `session-status` | `[NEEDS BACKEND]` → `GET /api/v1/apps/sharwa-ai/status/` → `{connected: bool, connecting: bool, error, connected_at}` |
| الإعدادات | `sharwa_ai_*` POST | `[NEEDS BACKEND]` → `GET/PUT /api/v1/apps/sharwa-ai/settings/` `{ai_enabled, max_consecutive_bot_replies_override}` → + `{platform_default_max_replies}` |
| قائمة الجلسات | `sharwa_ai_*` / `support_sessions_list` HTML | `[NEEDS BACKEND]` → `GET /api/v1/support/sessions/?status&session_type&assigned_to_me&q&page` → `{count, results:[{id, session_type, status, party:{name, phone}, assigned_staff:{id,name}\|null, messages_count, last_activity_at, version}]}` |
| تفاصيل الجلسة + الخط الزمني | `support_session_detail` HTML | `[NEEDS BACKEND]` → `GET /api/v1/support/sessions/<id>/?after=<cursor>` → `{session, timeline:[{kind: message\|tool_call, sender_type?, sender_name?, text?, tool_name?, input_summary?, output_summary?, error?, created_at}]}` |
| استيلاء / إفراج / إغلاق | — | `[NEEDS BACKEND]` → `POST /api/v1/support/sessions/<id>/takeover/`, `/release/`, `/close/` `{version}` → 200/409 (perm `support.takeover_session`) |
| ردّ الموظف | — | `[NEEDS BACKEND]` → `POST /api/v1/support/sessions/<id>/messages/` `{text, client_id}` |
| رمز SSO قصير العمر | SSO console (RS256 JWKS) | `[NEEDS BACKEND]` → `POST /api/v1/apps/sharwa-ai/console-token/` → `{console_url, token, expires_in}` |
| عدّاد الجلسات المُصعَّدة | — | `[NEEDS BACKEND]` → `GET /api/v1/support/sessions/counters/` → `{escalated, human_locked_mine}` |

### M32 — تذاكر الدعم وجلسات الدعم الفني (Support Tickets & Live Support Sessions)

| Need | Backend today | Status |
|---|---|---|
| قائمة التذاكر مفلترة | `support_tickets` HTML | `[NEEDS BACKEND]` → `GET /api/v1/support/tickets/?status&assigned_to&q&page` → `{count, results:[{id, title, status, assigned_to:{id,name}\|null, created_at, updated_at}], counters:{open, in_progress, closed}}` |
| إنشاء تذكرة | `support_tickets` POST (`SupportTicketForm`) | `[NEEDS BACKEND]` → `POST /api/v1/support/tickets/` `{title, description, assigned_to_id?}` |
| تفاصيل / تعديل / حالة / إسناد | — | `[NEEDS BACKEND]` → `GET /api/v1/support/tickets/<id>/`, `PATCH /api/v1/support/tickets/<id>/` `{status?, assigned_to_id?, title?, description?}` |
| الموظفون النشطون للإسناد | `staff_list` HTML | `[NEEDS BACKEND]` → `GET /api/v1/staff/?is_active=true` (M18) |
| قائمة الجلسات + تفاصيل (قراءة) | `support_sessions_list`, `support_session_detail` HTML | `[NEEDS BACKEND]` → نفس عقد M31: `GET /api/v1/support/sessions/`, `GET /api/v1/support/sessions/<id>/` |
| عدّادات الشريط | — | `[NEEDS BACKEND]` → `GET /api/v1/support/tickets/counters/` → `{open, in_progress}`؛ الجلسات من `GET /api/v1/support/sessions/counters/` (M31) |

### M33 — المصروفات التشغيلية (Operating Expenses)

| Need | Backend today | Status |
|---|---|---|
| قائمة المصروفات مجمَّعة بالشهر | `operating_expenses_view` HTML (ترتيب `-expense_date, -id`) | `[NEEDS BACKEND]` → `GET /api/v1/expenses/?category&currency&from&to&page` → `{count, months:[{month, totals:[{currency, display_total}], rows:[{id, category, display_amount, currency, expense_date, note, created_by_name}]}]}` |
| إنشاء مصروف | `operating_expenses_view` POST (`OperatingExpenseForm`) | `[NEEDS BACKEND]` → `POST /api/v1/expenses/` `{category, amount, currency, expense_date, note}` → 201 الصف؛ 400 `{field:[msg]}` |
| رابط التقرير | `report_detail/operating_expenses` HTML | يُعالَج في M25؛ هنا رابط فقط |
| تعديل/حذف | غير موجود | `[NEEDS BACKEND]` (خارج النطاق الحالي؛ لا أزرار حتى توفره) |

### M34 — مركز إعدادات المتجر (Store Settings Hub)

| Need | Backend today | Status |
|---|---|---|
| قراءة كل الإعدادات | `store_settings` + 6 صفحات HTML؛ جزئياً `GET /api/v1/config/` (عام) | `[NEEDS BACKEND]` → `GET /api/v1/settings/` → كل حقول §5 (بلا `admin_password` ولا أسرار) + `display_default_delivery_fee`, `display_free_shipping_threshold`, `fx_preview:[{currency, display_100_sar}]` |
| الهوية | `store_settings` POST (`StoreIdentityForm`) | `[NEEDS BACKEND]` → `PATCH /api/v1/settings/identity/` `{store_name?, about_us?, timezone?, week_start_day?}` → 200 / 400 |
| التواصل | `contact_info` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/settings/contact/` `{whatsapp_number?, contact_email?, facebook_link?, instagram_link?, tiktok_link?, snapchat_link?}` (`custom_domain` للقراءة) |
| السياسات | `store_policies` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/settings/policies/` `{return_policy}` |
| الشحن الافتراضي | `shipping_settings` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/settings/shipping/` `{default_delivery_fee, free_shipping_threshold}` → 200 مع `display_*` |
| العملات وأسعار الصرف | `currency_settings` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/settings/currency/` `{currency?, usd_to_sar?, sar_to_yer_old?, sar_to_yer_new?}` → 200 مع `fx_preview` |
| SEO | `seo_settings` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/settings/seo/` multipart (`seo_og_image`) |
| شريط الإعلانات | `marketing_bar` POST (`AnnouncementBarForm`) | `[NEEDS BACKEND]` → `PATCH /api/v1/settings/announcement/` (الحقول التسعة) |
| مفتاح الدفع اليدوي | `save_manual_payment_toggle` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/settings/payments/` `{enable_manual_payment?, enable_sharwa_pay?}` |
| مفتاح شروة باي | `save_sharwa_pay_toggle` POST | ضمن السطر أعلاه |
| تعدد المواقع | `toggle_multi_location_mode` POST | `[NEEDS BACKEND]` → `POST /api/v1/settings/multi-location/` `{enabled: bool}` → 200 / 409 إن وُجدت مواقع متعارضة |
| قائمة المناطق الزمنية | غير موجود | n/a — `Intl.supportedValuesOf('timeZone')` محلياً |

### M35 — محافظ العملاء ونقاط الولاء (Customer Wallets & Loyalty Points — merchant side)

| Need | Backend today | Status |
|---|---|---|
| قائمة المحافظ | `customer_wallets_list` HTML | `[NEEDS BACKEND]` → `GET /api/v1/customers/wallets/?q&sort&page&page_size` → `{count, totals:{display_balance_sum, active_count}, results:[{id, customer_phone, customer_name, display_balance, is_active, last_transaction_at, transactions_count}]}` |
| إنشاء محفظة | `wallet_create` POST | `[NEEDS BACKEND]` → `POST /api/v1/customers/wallets/` `{customer_phone, customer_name?}` → 201 / 400 `{customer_phone:[msg]}` |
| تفاصيل | `wallet_detail` HTML | `[NEEDS BACKEND]` → `GET /api/v1/customers/wallets/<id>/` → `{…wallet, points:{balance}?}` |
| تعبئة/تسوية | `wallet_topup` POST | `[NEEDS BACKEND]` → `POST /api/v1/customers/wallets/<id>/topup/` `{amount, reason: manual_topup\|reward\|adjustment, note, idempotency_key?}` → `{display_balance, transaction:{…}}` |
| حركات المحفظة | ضمن `wallet_detail` | `[NEEDS BACKEND]` → `GET /api/v1/customers/wallets/<id>/transactions/?reason&from&to&page` → `{count, results:[{id, amount, display_amount, reason, reference:{type, id, label}, display_balance_after, actor, created_at}]}` |
| إعدادات الولاء (قراءة) | `loyalty_settings` HTML | `[NEEDS BACKEND]` → `GET /api/v1/loyalty/program/` → `{is_enabled, riyals_per_point, points_per_riyal_redemption, min_points_to_redeem}` (مشترك مع M13) |
| نقاط العميل | نموذج فقط | `[NEEDS BACKEND]` → `GET /api/v1/loyalty/points/?q&page`, `GET /api/v1/loyalty/points/<phone>/transactions/?type&page` → `{balance, results:[{id, type, points, order_id, created_at}]}` |

### M36 — البيع بالجملة B2B (B2B Wholesale: Tier Prices, Drafts, Negotiation)

| Need | Backend today | Status |
|---|---|---|
| إنشاء مسودة | `POST /api/v1/orders/b2b-draft/` ← `{customer_name, customer_phone, address, items:[{product_id, quantity}], approver_role_id?, location_id?, currency?}` → 201 `{detail, order_id, approval_id}`؛ 400 `{detail}` (عميل ناقص / منتج غير صالح / كمية / دور المعتمد / الفرع)؛ 403 بلا موظف | Ready (صلاحية `orders.create_b2b`) |
| قائمة المعلّقة | `GET /api/v1/orders/b2b-drafts/` → `[{id, customer_name, customer_phone, total_price, currency, created_at, sales_channel, approval_id, approval_version, items_count}]` | Ready (فلتر خادمي: `pending_approval__status='pending'`) |
| حسم الموافقة | `POST /api/v1/orders/b2b-draft/<approval_id>/resolve/` ← `{decision: approved\|rejected, version}` → 200 `{detail:'حُسمت الموافقة بنجاح.', decision}`؛ 400 قرار/إصدار غير صالح؛ 403 اعتماد ذاتي؛ 409 تضارب إصدار | Ready (صلاحية `orders.approve_b2b`) |
| أدوار المعتمدين (لقائمة `approver_role_id`) | `staff_roles` HTML | `[NEEDS BACKEND]` → `GET /api/v1/roles/` → `[{id, name}]` (يُشترك مع M18) |
| أسعار الكميات CRUD | tier prices HTML تحت `edit_product` | `[NEEDS BACKEND]` → `GET/POST /api/v1/products/<id>/tier-prices/`, `DELETE /<tier_id>/` `{min_quantity, price}` |
| أسعار الكميات في PDP | `get_tier_price` داخل القالب | `[NEEDS BACKEND]` → إضافة `tier_prices:[{min_quantity, display_price}]` إلى `GET /api/v1/catalog/products/<id>/` |
| مسودات المساومة | Model + Serializer بلا view | `[NEEDS BACKEND]` → `GET/POST /api/v1/orders/negotiations/`, `POST /<id>/submit/` → `{status, approval_id}` |

### M37 — أنواع المنتجات المتقدمة: الحزم، التخصيص، المزادات، التسعير بالمعادلة (Bundles, Personalization, Auctions, Formula Pricing)

| Need | Backend today | Status |
|---|---|---|
| مكوّنات الحزمة CRUD | bundle components HTML تحت `edit_product` | `[NEEDS BACKEND]` → `GET/POST /api/v1/products/<id>/bundle-components/`, `PATCH/DELETE /<cid>/` `{component_id, quantity, is_optional}` → + `display_bundle_total` |
| قواعد التوافق CRUD | compatibility rules HTML | `[NEEDS BACKEND]` → `GET/POST /api/v1/products/<id>/compatibility-rules/` `{attribute_a_id, operator, attribute_b_id?, value?}` |
| حقول التخصيص CRUD | ضمن `ProductForm` | `[NEEDS BACKEND]` → `GET/POST /api/v1/products/<id>/personalization-fields/`, `PATCH/DELETE /<fid>/`, `POST /reorder/` |
| إعدادات المزاد | `auction_*` في `ProductForm` | `[NEEDS BACKEND]` → `PUT /api/v1/products/<id>/auction/` `{status, start_bid, bid_step, reserve, buy_now, end_at, anti_sniping_seconds}` |
| العطاءات (تاجر) | Model فقط | `[NEEDS BACKEND]` → `GET /api/v1/products/<id>/auction/bids/` → `[{bidder_name, bidder_phone, display_amount, created_at}]` |
| المزايدة (متجر) | غير موجود | `[NEEDS BACKEND]` → `POST /api/v1/catalog/products/<id>/bids/` `{bidder_name, bidder_phone, amount}` → `{display_highest_bid, display_min_next_bid, end_at}`؛ 409 عطاء منخفض/مزاد منتهٍ |
| تفاصيل PDP الموسّعة | `GET /api/v1/catalog/products/<id>/` (بلا هذه الحقول) | `[NEEDS BACKEND]` → إضافة `bundle:{components, rules, display_total}`, `personalization_fields[]`, `auction:{status, display_highest_bid, display_min_next_bid, display_buy_now, end_at}` (بلا `reserve`), `display_formula_price`, `deposit:{display_amount, refund_rule}` |
| إضافة للسلة بتخصيص/تركيبة | `POST /api/v1/cart/actions/` `{product_id, size, color, action_type}` | `[NEEDS BACKEND]` → توسيع الحمولة بـ `personalization:{field_id: value}`, `bundle_selection:[{component_id, variant_id?}]` |
| الأكواد التسلسلية | `serial_codes` في `ProductForm` | `[NEEDS BACKEND]` → `GET/POST /api/v1/products/<id>/serials/` `{codes:[string]}` → `[{code, status}]` |
| معاينة المعادلة | `calculate_formula_unit_price` في الـ Model | `[NEEDS BACKEND]` → `POST /api/v1/products/formula-preview/` `{formula_unit_price, formula_coefficient, formula_fixed_extra}` → `{display_price}` |

### M38 — تطبيق مندوب التوصيل (Courier / Delivery Agent App)

| Need | Backend today | Status |
|---|---|---|
| بدء مناوبة | `POST /api/v1/agent/shifts/start/` ← `{vehicle_ref?, agent_id? (المالك فقط)}` → `{shift_id, agent, started_at}`؛ 401 بلا جلسة؛ 403 موظف بلا ملف مندوب | Ready |
| إنهاء/تسليم | `POST /api/v1/agent/shifts/end-and-handover/` ← `{shift_id, new_agent_id?, vehicle_ref?}` → إنهاء `{shift_id, ended_at}` أو تسليم `{new_shift_id, handed_over_to, balance}`؛ 400 `shift_id`/`new_agent_id` غير صالح؛ 404 مناوبة/مندوب | Ready |
| نقل حالة | `POST /api/v1/agent/shipments/<id>/status/` ← `{to_status, client_generated_uuid(≤64), event_time?, geo_lat?, geo_lng?, geo_accuracy_m?}` → 200 `{shipment_id, waybill_number, status, accepted, rejection_reason, flagged_for_review}` (الرفض يعود 200 بـ `accepted:false`)؛ 400 تحقق؛ 404 | Ready |
| مسح الاستلام | `POST /api/v1/agent/fulfillments/<id>/scan-pickup/` ← `{scanned_code}` → `{ok:true, fulfillment_id}`؛ 400 `{detail, scan_mismatch:true}` | Ready |
| تسليم جزئي | `POST /api/v1/agent/fulfillments/<id>/partial-delivery/` ← `{line_items:[{fulfillment_item_id, delivered_quantity, rejection_reason}], client_generated_uuid, geo_lat?, geo_lng?, geo_accuracy_m?}` → `{collected_amount, currency, delivered, rejected, duplicate}`؛ 400 بلا بنود/بلا uuid/خطأ عهدة؛ 409 `{detail:'رُفض التسليم.', rejection_reason}` | Ready |
| شحناتي | `agent_shipment_list` HTML | `[NEEDS BACKEND]` → `GET /api/v1/agent/shipments/?status` → `[{id, waybill_number, status, customer_name, address, display_cod_amount, fulfillment_id, items:[{fulfillment_item_id, product_name, quantity}]}]` |
| تفاصيل شحنة + أحداثها | `agent_shipment_detail` HTML | `[NEEDS BACKEND]` → `GET /api/v1/agent/shipments/<id>/` → الشحنة + `events[]` |
| المناوبة الحالية + الرصيد | `agent_shift` HTML (`get_courier_balance`) | `[NEEDS BACKEND]` → `GET /api/v1/agent/me/` → `{agent:{id,name}, open_shift:{id, started_at, vehicle_ref} |
| دفتر العهدة | Model فقط | `[NEEDS BACKEND]` → `GET /api/v1/agent/custody/?page` → `[{entry_type, display_amount, currency, related_shipment, related_shift, created_at}]` |

### M39 — شروة شيب: البوليصات وأحداث الشحن (Sharwa Ship Waybills & Shipment Events)

| Need | Backend today | Status |
|---|---|---|
| طلبات بلا بوليصة + معاينة الوزن + المناطق | `waybill_list_view` HTML (`calculate_chargeable_weight`, `split_fulfillment_into_awbs`, `SharwaShipZone.is_active`) | `[NEEDS BACKEND]` → `GET /api/v1/shipping/sharwa-ship/pending-orders/` → `[{order_id, customer_name, fulfillment_id, weight_preview:{actual, volumetric, chargeable} |
| إصدار بوليصة | `issue_waybill_view` POST `{zone_code}` | `[NEEDS BACKEND]` → `POST /api/v1/shipping/sharwa-ship/orders/<order_id>/waybill/` `{zone_code}` → 201 الشحنة؛ 400 `{detail}` |
| قائمة البوليصات | ضمن `waybill_list_view` | `[NEEDS BACKEND]` → `GET /api/v1/shipping/shipments/?status&billing_status&carrier&q&from&to&page` → `{count, results:[{id, waybill_number, order_id, customer_name, carrier_code, zone_name_snapshot, display_cost, actual_weight_snapshot, status, billing_status, master_waybill_number, created_at}]}` |
| تفاصيل + أحداث | `shipment_events_view` HTML (ترتيب `-event_time, -id`) | `[NEEDS BACKEND]` → `GET /api/v1/shipping/shipments/<id>/` → الشحنة + `events:[{event_time, received_at, from_status, to_status, source, actor_type, actor_id, is_rejected, rejection_reason, out_of_order, flagged_for_review, geo}]` |
| تعديل يدوي للحالة | `agent_shipment_detail` POST | `[NEEDS BACKEND]` → `POST /api/v1/shipping/shipments/<id>/status/` `{to_status, client_generated_uuid, event_time}` (مصدر `merchant_manual`) → نفس استجابة M38 |
| webhook الناقل | `POST /api/v1/webhooks/carrier/<carrier_code>/` ← `{waybill_number, status, event_time?, event_id?}` + `X-Carrier-Signature` → 202 `{received:true}` | Ready (للعرض في الخط الزمني فقط) |
| طابور AWB + إعادة محاولة | Model + Celery | `[NEEDS BACKEND]` → `GET /api/v1/shipping/awb-queue/`, `POST /<id>/retry/` |
| لقطات التسعيرة | Model | `[NEEDS BACKEND]` → `GET /api/v1/shipping/rate-cards/` → `[{carrier_code, zone_code, display_expected_price, display_last_confirmed_price, currency, updated_at}]` |
| الإشراف | `courier_supervisor_view` HTML | `[NEEDS BACKEND]` → `GET /api/v1/shipping/supervisor/` → `{agents:[{id, name, open_shift}], unassigned_new_orders[], reversals[]}` |
| إعادة إسناد طارئة | `emergency_reassign_view` POST `{new_agent_id}` | `[NEEDS BACKEND]` → `POST /api/v1/shipping/agents/<agent_id>/emergency-reassign/` `{new_agent_id}` → `{moved_shipments, display_balance_moved}` |
| طباعة | `order_waybill` (`waybill_print.html`) | يُعالَج في M06 FR-06.10 |

### M40 — محفظة شروة باي للعملاء PWA (Sharwa Pay Customer Wallet PWA)

| Need | Backend today | Status |
|---|---|---|
| إرسال OTP | `POST /sharwa-pay/otp/send/` (HTML form) | `[NEEDS BACKEND]` → `POST /api/v1/sharwa-pay/otp/send/` `{phone}` → `{ok, expires_in:600}`؛ 429 `{detail}` |
| تحقق OTP + جلسة | `POST /sharwa-pay/` | `[NEEDS BACKEND]` → `POST /api/v1/sharwa-pay/otp/verify/` `{phone, code}` → `{ok}` (كوكي جلسة)؛ 400 منتهٍ/خاطئ؛ 429 محدود |
| المحفظة | `sharwa_pay_wallet_page_view` HTML (`_dashboard_context`) | `[NEEDS BACKEND]` → `GET /api/v1/sharwa-pay/wallet/` → `{customer_phone, customer_name, is_active, balances:[{currency, display_balance}]}` |
| الحركات | ضمن الصفحة | `[NEEDS BACKEND]` → `GET /api/v1/sharwa-pay/transactions/?currency&reason&page` → `{count, results:[{id, transaction_type, reason, display_amount, currency, display_balance_after, source_tenant_schema, source_store_name, source_order_id, created_at}]}` |
| طلب شحن | `POST /sharwa-pay/topup/` (multipart) | `[NEEDS BACKEND]` → `POST /api/v1/sharwa-pay/topups/` multipart `{amount, currency, bank_transaction_id, reference_note?, receipt_image}` → 201 `{id, status}`؛ 400 `{field:[msg]}` |
| طلب سحب | `POST /sharwa-pay/withdraw/` | `[NEEDS BACKEND]` → `POST /api/v1/sharwa-pay/withdrawals/` `{amount, currency, payout_destination}` → 201 `{id, status, display_balance_after}`؛ 400 رصيد غير كافٍ |
| طلباتي | ضمن الصفحة | `[NEEDS BACKEND]` → `GET /api/v1/sharwa-pay/requests/` → `{topups:[{id, display_amount, currency, bank_transaction_id, status, rejection_reason, credited_at, created_at}], withdrawals:[{id, display_amount, currency, payout_destination, status, rejection_reason, created_at}]}` |
| خروج | `POST /sharwa-pay/logout/` | `[NEEDS BACKEND]` → `POST /api/v1/sharwa-pay/logout/` → 204 |
| Manifest / SW | `sharwa_pay_manifest`, `sharwa_pay_service_worker` | تُولَّد في Next (`app/(pay)/manifest.webmanifest`, `/sw.js` بسياسة «لا كاش») — انظر قرار ملكية `/sw.js` في M44 |

### M41 — صفحة تتبّع الطلب العامة (Public Order Tracking Page)

| Need | Backend today | Status |
|---|---|---|
| بيانات التتبع | `GET /orders/track/<public_uuid>/` HTML | `[NEEDS BACKEND]` → `GET /api/v1/orders/track/<public_uuid>/` (بلا مصادقة، throttle anon) → `{order_number, created_at, status, status_label, payment_status, fulfillment_status:{name, color}, rollup_label, display_total, display_amount_on_delivery, display_deposit_amount, delivery_method_name, is_gift, recipient_name, gift_message, customer_name, customer_phone_masked, address_text, pickup_location:{name, address, phone}?, items:[{product_name, variant_label, quantity, image}], fulfillments:[{id, status, items:[…], pickup_code?, shipment:{waybill_number, carrier_code, status, status_label, courier:{name, phone}?, events:[{to_status, event_time}]}?}], return_policy_excerpt}` → 404 `{detail}` |
| هوية المتجر وواتساب | `GET /api/v1/config/` → `store_name, logo, whatsapp_number, primary_color…` | Ready |
| طلب إرجاع من العميل | لا شيء | `[NEEDS BACKEND]` (لاحق) → `POST /api/v1/orders/track/<public_uuid>/return-intent/` `{items:[{fulfillment_item_id, quantity}], reason}`؛ حتى توفره: رابط واتساب مُعبَّأ |
| تحديث حيّ | لا شيء | استطلاع `GET` كل 60 ثانية (لا WebSocket في الإصدار الأول) |

### M42 — قائمة الأمنيات والتقييمات والتنبيه بالتوفر (Wishlist, Reviews & Back-in-stock)

| Need | Backend today | Status |
|---|---|---|
| بيانات المنتج الأساسية | `GET /api/v1/catalog/products/<id>/` → `stock, display_price, display_old_price, is_featured, …` | Ready (بلا تقييمات/`allow_backorder`/`is_available`) |
| تعريف الهاتف للجلسة | ضمن POST views | `[NEEDS BACKEND]` → `POST /api/v1/shopper/phone/` `{phone}` → `{phone_normalized}` (يُخزَّن في الجلسة) |
| قائمة الأمنيات | `wishlist` HTML, `toggle_wishlist` POST | `[NEEDS BACKEND]` → `GET /api/v1/wishlist/` → `{phone_normalized?, items:[{product:{id, name, image, display_price, display_old_price, stock, allow_backorder, is_available}, created_at}]}`; `POST /api/v1/wishlist/toggle/` `{product_id}` → `{saved: bool}` |
| تقييمات منتج | غير معروضة في API | `[NEEDS BACKEND]` → `GET /api/v1/catalog/products/<id>/reviews/?rating&page` → `{average_rating, rating_distribution:{1..5}, count, results:[{id, customer_name, rating, comment, admin_reply, created_at}]}` |
| إرسال تقييم | `submit_review` POST | `[NEEDS BACKEND]` → `POST /api/v1/catalog/products/<id>/reviews/` `{customer_name, customer_phone, rating, comment}` → 201 `{status: published\|pending}` / 400 / 429 |
| تنبيه التوفر | `subscribe_back_in_stock` POST | `[NEEDS BACKEND]` → `POST /api/v1/catalog/products/<id>/back-in-stock/` `{phone}` → 201/200 `{subscribed: true}` |
| تقييم المتجر | نموذج `StoreReview` | `[NEEDS BACKEND]` → `GET/POST /api/v1/store-reviews/` `{customer_name, rating, comment}` → `{average_rating, count, results[]}` |

### M43 — لوحة مالك المتاجر المتعددة (Multi-store Owner Rollup)

| Need | Backend today | Status |
|---|---|---|
| ملخص المتاجر + المجاميع | `merchant_master_dashboard` HTML → `{has_account, stores:[{name, schema, domain, orders, revenue}], totals:{orders, revenue, completed}}` | `[NEEDS BACKEND]` → `GET /api/v1/merchant/stores/?from&to` → `{has_account, current_schema, stores:[{name, schema, domain, orders, completed, refunded, display_revenue_sar, last_snapshot_date}], totals:{orders, completed, refunded, display_revenue_sar}}` (يضيف `completed`/`refunded` لكل متجر من نفس اللقطات) |
| مبدّل المتاجر (M03) | غير موجود (لا topbar) | نفس العقد أعلاه بلا فلتر تاريخ؛ يُخزَّن في كاش M03 بمفتاح المستأجر |

### M44 — تطبيق المتجر PWA وإشعارات المتصفح (PWA & Web Push)

| Need | Backend today | Status |
|---|---|---|
| حدث تثبيت | `POST /api/v1/pwa/install-event/` ← `{event_type: prompt_shown\|ios_hint_shown\|accepted\|dismissed\|installed, source:'nextjs_app'}` → 201 `{ok:true}`؛ 429 `{detail:'طلبات كثيرة جداً، حاول لاحقاً.'}` (30/دقيقة/IP) | Ready |
| مفتاح VAPID | `GET /api/v1/push/vapid-public-key/` → `{publicKey}` | Ready |
| اشتراك | `POST /api/v1/push/subscribe/` ← `{endpoint, keys:{p256dh, auth}, customer_phone?}` → 201 `{ok:true}` | Ready |
| إلغاء | `POST /api/v1/push/unsubscribe/` ← `{endpoint}` → `{ok:true}`؛ 400 `{detail:'endpoint مطلوب.'}` | Ready |
| بيانات الـ manifest | `GET /api/v1/config/` (`store_name`, `primary_color`, `background_color`, `logo`) | Ready (يُولَّد الـ manifest في Next) |
| إشعار تجريبي + عدد المشتركين | `send_test_push_notification` POST `{title, body}` HTML | `[NEEDS BACKEND]` → `GET /api/v1/push/stats/` → `{active_subscribers}`؛ `POST /api/v1/push/test/` `{title, body}` → `{queued_for}` |
| أيقونات المتجر 192/512 | ثابتة في `static/pwa/icons/` | يُولَّد في Next من `logo` بـ `next/og` أو أيقونة افتراضية zinc؛ `[NEEDS BACKEND]` لا يلزم |

### M45 — لوحة مستحقات المنصة (Platform Dues Console)

| Need | Backend today | Status |
|---|---|---|
| النظرة العامة | `platform_dues_dashboard` GET → `overview:[{tenant, snapshot, wallet}]` (مرتبة بالإيراد) | `[NEEDS BACKEND]` → `GET /api/v1/admin/dues/overview/?q&period` → `[{schema_name, name, merchant_phone, snapshot:{date, orders_count, display_revenue_sar} |
| تفاصيل متجر | GET `?schema=` → `entry{pending_commissions, pending_charges, uninvoiced, waived_charges, has_dues, wallet, snapshot}` | `[NEEDS BACKEND]` → `GET /api/v1/admin/dues/<schema>/` → `{pending_commissions:[{id, order_id, plan_name_snapshot, commission_type, commission_value, display_amount, currency, created_at}], pending_charges:[{id, app_code, app_name_snapshot, period_label, display_price, currency, created_at}], uninvoiced:[{installation_id, app_code, app_name, period_label}], waived_charges:[{id, app_name_snapshot, period_label, display_price}], totals:[{currency, display_commissions, display_charges}], wallet, has_dues}` |
| الإجراءات (8) | POST `{action, schema, record_id | app_code}` + Django messages |
| مصادقة الإدمن | جلسة Django admin `/sharwa-secure-gate/` | `[NEEDS BACKEND]` → عقد جلسة إدارية لـ `/api/v1/admin/*` (يُوحَّد مع M20/M46) |

### M46 — إدارة الباقات والاشتراكات وأعلام الميزات (Plans, Subscriptions & Feature Flags Admin)

| Need | Backend today | Status |
|---|---|---|
| الباقات CRUD | Django admin `Plan` | `[NEEDS BACKEND]` → `GET/POST /api/v1/admin/plans/`, `PATCH/DELETE /<id>/` (حقول FR-46.02 + `display_price`) |
| مصفوفة الميزات | `PlanFeature` inline | `[NEEDS BACKEND]` → `GET /api/v1/admin/plan-features/` → `[{plan_id, feature_code, is_enabled}]`؛ `PUT /api/v1/admin/plan-features/` `{plan_id, feature_code, is_enabled}` |
| الميزات | Django admin `Feature` | `[NEEDS BACKEND]` → `GET /api/v1/admin/features/`, `PATCH /<code>/` `{is_active_globally?, requires_plan?, name?, description?, module_group?}` |
| الاستثناءات (جماعي) | `ClientAdmin` action + `TenantFeatureOverride` admin | `[NEEDS BACKEND]` → `GET /api/v1/admin/feature-overrides/?feature&schema`, `POST /bulk/` `{feature_code, schema_names:[…], is_enabled, notes}`, `DELETE /<id>/` |
| فحص الحسم | `Feature.is_enabled_for_client()` | `[NEEDS BACKEND]` → `GET /api/v1/admin/features/<code>/resolve/?schema=` → `{enabled, decided_by: override\|global_kill\|no_plan_required\|subscriptions_disabled\|plan_feature\|plan_feature_missing}` |
| الاشتراكات | Django admin `Subscription` + `assign_plan` | `[NEEDS BACKEND]` → `GET /api/v1/admin/subscriptions/?schema&status`, `POST /api/v1/admin/subscriptions/assign/` `{schema_name, plan_id, status?, current_period_end?, notes?}` |
| المفاتيح الرئيسية | `PlatformBillingSettings` admin | `[NEEDS BACKEND]` → `GET/PATCH /api/v1/admin/billing-settings/` `{subscriptions_enabled, commission_enabled}` |
| التطبيقات + الاستثناءات | `App`, `AppBillingOverride` admin | `[NEEDS BACKEND]` → `GET/POST/PATCH /api/v1/admin/apps/`, `GET/POST/DELETE /api/v1/admin/app-billing-overrides/` |
| المتاجر (لاختيار الأهداف) | `ClientAdmin` | `[NEEDS BACKEND]` → `GET /api/v1/admin/clients/?q` → `[{schema_name, name, merchant_phone, current_plan}]` (يُشترك مع M20) |
| الخطط العامة لـ M01 | — | يُشتق من `GET /api/v1/public/plans/` المقترح في M01 §7 |

### M47 — حلّ المستأجر وحارس التجهيز (Tenant Resolution & Provisioning Guard)

| Need | Backend today | Status |
|---|---|---|
| حلّ المستأجر من Host | `TenantMainMiddleware` → `tenants.Domain` | Ready (Next يوازيه محلياً للتوجيه فقط) |
| تجاوز الحلّ بالترويسة | `X-Store-Domain` تحت `/api/` فقط (404 مجهول، 403 موقوف/جلسة لمتجر آخر) | Ready |
| التحقق من وجود/حالة المتجر | `GET /api/v1/config/` → 200 / 404 / 403 / 503 | Ready (يُستخدم كمسبار) |
| حالة التجهيز | `GET /register/status/<token>/` → `{status, store_url?, dashboard_url?}` (JSON على URLConf عام) | Ready؛ يُنقل اختيارياً إلى `GET /api/v1/public/provisioning/<token>/` |
| حارس 503 | `TenantProvisioningGuardMiddleware` → 503 + `Retry-After: 10` | Ready |
| CSRF token للتاجر | `CSRF_COOKIE_HTTPONLY=True`، لا endpoint | `[NEEDS BACKEND]` → `GET /api/v1/auth/csrf/` → `{csrfToken}` (يضبط الكوكي أيضاً)؛ حتى توفره يقرأ الـ BFF `csrftoken` من `Set-Cookie` لاستجابة `GET /dashboard/login/` |
| النطاقات المخصصة | `Domain(is_primary)` admin-only | Ready للحلّ؛ إدارة التاجر → M19 `[NEEDS BACKEND]` |
| قائمة المحجوزات | `tenants/validators.py` (ثابتة) | تُنسخ كثابت في `src/lib/tenant.ts`؛ `GET /register/check-subdomain/` يبقى الحكم في M02 |
| manifest | `GET /manifest.webmanifest` Django | يُولَّد في Next من `/config/` — Ready |
| `/sw.js` | `pwa_service_worker` Django | قرار: Next يملك `/sw.js` على أصل المتجر؛ Django لا يُمرَّر |
| قياس تثبيت PWA | `POST /api/v1/pwa/install-event/` `source='nextjs_app'` | Ready |

### M48 — لوحة الأوامر والبحث الشامل (Command Palette ⌘K & Global Search)

| Need | Backend today | Status |
|---|---|---|
| بحث موحَّد مجمَّع | لا شيء (`order_list?q=` HTML فقط) | `[NEEDS BACKEND]` → `GET /api/v1/search/?q=&types=orders,products,customers&limit=5` → `{orders:[{id, customer_name, customer_phone, display_total, status, fulfillment_status:{name,color}, created_at}], products:[{id, name, name_en, sku, image, display_price, stock}], customers:[{phone, name, orders_count}], pages:[{key, title, path}], actions:[{key, title}]}`؛ المجموعات تُقصّ حسب صلاحيات الجلسة خادمياً أيضاً |
| فهرس الوجهات | الشريط الجانبي HTML (`_sidebar.html`) | محلي: `navigation.ts` (مصدر واحد مع M03) |
| أعلام الميزات (39) والصلاحيات (35) للجلسة | context processors HTML | `[NEEDS BACKEND]` (M03/M18) → `GET /api/v1/me/` → `{staff:{id, full_name}, permissions:[code], features:{code:bool}, store:{name, store_url}}` |
| قائمة حالات التنفيذ للأمر السياقي | `order_statuses` HTML | `[NEEDS BACKEND]` (M06 §7) → `GET /api/v1/order-statuses/` |
| تغيير حالة التنفيذ | `update_order_fulfillment_status` | `[NEEDS BACKEND]` (M06 §7) → `POST /api/v1/orders/<id>/fulfillment-status/` `{status_id, version}` |
| مبدّل المتاجر | `MerchantAccount`/`MerchantAccountClient`، `merchant_master_dashboard` HTML | `[NEEDS BACKEND]` → `GET /api/v1/me/stores/` → `[{name, subdomain, store_url, dashboard_url, is_current}]` |
| العناصر الأخيرة | — | محلي (localStorage مفتوح بالمتجر والموظف) |
| تبديل الثيم/اللغة | — | محلي (next-themes، i18n) |

### M49 — مركز الإشعارات (Notifications Center — topbar bell)

| Need | Backend today | Status |
|---|---|---|
| ملخص العدّادات | عدّادات متفرقة في قوالب الشريط | `[NEEDS BACKEND]` → `GET /api/v1/notifications/summary/` → `{unread_total, by_kind:{…}, has_critical}` |
| قائمة الإشعارات | لا شيء | `[NEEDS BACKEND]` → `GET /api/v1/notifications/?unread=1&kind&page&page_size` → `{count, results:[{id, kind, severity, title, body, link, group_key, count, created_at, read_at, source_ref}]}` (مفلترة بصلاحيات الجلسة) |
| تعليم مقروء | لا شيء | `[NEEDS BACKEND]` → `POST /api/v1/notifications/<id>/read/` → `{read_at}` |
| تعليم الكل | لا شيء | `[NEEDS BACKEND]` → `POST /api/v1/notifications/read-all/` `{kind?}` → `{updated}` |
| مفتاح VAPID | `GET /api/v1/push/vapid-public-key/` → `{publicKey}` | Ready |
| اشتراك/إلغاء Push | `POST /api/v1/push/subscribe/` `{endpoint, keys:{p256dh, auth}}`, `POST /api/v1/push/unsubscribe/` `{endpoint}` | Ready |
| مصادر العدّادات القديمة | `approval_requests` count، `behavior_alerts` unread، `channel_inbox_list` unread (HTML context) | تُستبدل بـ `summary` |
