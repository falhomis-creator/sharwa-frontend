# تقرير التسليم — واجهة منصة شروة (المراحل 1–8)

> مولَّد بـ `scripts/delivery-report.ts` (2026-10-19). كل الوحدات الـ 49 مبنية على **mocks** بنفس عقود المواصفات (`x-sharwa-mock: 1`)، والباك إند للقراءة فقط.

## الحالة

- **البوابات (المرحلة 8):** `npm run lint` · `npx tsc --noEmit` · `scripts/rtl-audit.ts` · `scripts/anti-ai-audit.ts` · `scripts/tenant-isolation-check.ts` (10 متاجر) · `scripts/needs-backend-inventory.ts --check` · `npm run build` من بيئة نظيفة — النتائج في `execution_log.md` «Phase 8».
- **الوسوم:** لا وسوم `rp/*` منذ المرحلة 5 — سياسة المالك تاريخ خطي بلا وسوم؛ نقطة الاستعادة هي الـ commit. لذلك عمود «الوسم» = —.
- **اللقطات:** 974 لقطة تحت `docs/visual-checks/` (desktop 1440 · tablet 768/834 · mobile 390 · داكن). تدقيق المبدأ I الكامل في `docs/visual-checks/ANTI-AI-AUDIT.md`.
- **`[NEEDS BACKEND]`:** 362 صفاً من §7 تستهلكها الواجهة اليوم عبر الـ mocks؛ الفهرس الكامل + إضافات قرارات المالك في `specs/001-sharwa-frontend-platform/contracts/needs-backend-inventory.md`.

## لكل وحدة

| الوحدة | المرحلة | مجموعة المسار | الشاشات (اللقطات) | ما فحصها | الوسم | صفوف `[NEEDS BACKEND]` |
|---|---|---|---|---|---|---|
| [M01](../specs/001-sharwa-frontend-platform/modules/M01-landing-page.md) الصفحة الترويجية للمنصة (SaaS Landing Page) | 3 · US1 | `(marketing)` | `01-landing/` `01-foundation/` (14) | `visual-check` | — | 2 |
| [M02](../specs/001-sharwa-frontend-platform/modules/M02-merchant-onboarding.md) معالج تأسيس المتجر (Merchant Onboarding Wizard) | 3 · US1 | `(onboarding)` | `02-onboarding/` (25) | `onboarding-check` `tenant-isolation-check` | — | 5 |
| [M03](../specs/001-sharwa-frontend-platform/modules/M03-dashboard-shell-overview.md) هيكل لوحة التاجر والنظرة العامة (Dashboard Shell + Overview) | 3 · US1 | `(dashboard)` | `03-dashboard-shell/` (19) | `tenant-shell-check` | — | 12 |
| [M04](../specs/001-sharwa-frontend-platform/modules/M04-products-variants.md) إدارة المنتجات والمتغيرات (Product & Variant Manager) | 3 · US1 | `(dashboard)` | `04-products/` (17) | `catalog-orders-check` | — | 14 |
| [M05](../specs/001-sharwa-frontend-platform/modules/M05-categories-collections.md) التصنيفات والماركات والوسوم والمجموعات والشارات (Categories, Brands, Tags, Collections, Badges) | 3 · US1 | `(dashboard)` | `05-organization/` (22) | `catalog-orders-check` | — | 6 |
| [M06](../specs/001-sharwa-frontend-platform/modules/M06-orders-fulfillment.md) مركز الطلبات والتنفيذ (Orders & Fulfillment Pipeline) | 3 · US1 | `(dashboard)` | `06-orders/` (24) | `b2b-check` `catalog-orders-check` `phase5-decisions-check` `pos-check` `returns-check` | — | 8 |
| [M07](../specs/001-sharwa-frontend-platform/modules/M07-customers-crm.md) العملاء وإدارة العلاقات (Customers & CRM) | 5 · US3 | `(dashboard)` | `07-customers/` (50) | `customers-check` | — | 12 |
| [M08](../specs/001-sharwa-frontend-platform/modules/M08-theme-customizer.md) مخصِّص ثيم المتجر (Storefront Theme Customizer) | 5 · US3 | `(dashboard)` | `08-theme/` (27) | `theme-check` | — | 3 |
| [M09](../specs/001-sharwa-frontend-platform/modules/M09-storefront-home.md) واجهة المتجر: الصفحة الرئيسية وصفحات التصفّح (Customer Storefront Home & Listing) | 4 · US2 | `(storefront)/[store]` | `09-storefront-home/` (16) | `storefront-check` | — | 7 |
| [M10](../specs/001-sharwa-frontend-platform/modules/M10-product-detail-page.md) صفحة تفاصيل المنتج (Product Detail Page) | 4 · US2 | `(storefront)/[store]` | `10-pdp/` (22) | `storefront-check` | — | 13 |
| [M11](../specs/001-sharwa-frontend-platform/modules/M11-cart.md) السلة الجانبية والسلة الصغيرة (Slide-over Cart & Mini-Cart) | 4 · US2 | `(storefront)/[store]` | `11-cart/` (8) | `storefront-check` | — | 7 |
| [M12](../specs/001-sharwa-frontend-platform/modules/M12-checkout.md) إتمام الطلب بلا احتكاك (Frictionless Checkout) | 4 · US2 | `(storefront)/[store]` | `12-checkout/` (13) | `bookings-check` `storefront-check` | — | 12 |
| [M13](../specs/001-sharwa-frontend-platform/modules/M13-marketing-hub.md) مركز التسويق (Marketing Hub: Coupons, Offers, Abandoned Carts, Campaigns, Timeline, Loyalty, Gifting) | 5 · US3 | `(dashboard)` | `13-marketing/` (27) | `customers-check` `marketing-check` | — | 10 |
| [M14](../specs/001-sharwa-frontend-platform/modules/M14-payments-wallets-payouts.md) المدفوعات والمحافظ والتحويلات (Payments, Wallets & Payouts) | 5 · US3 | `(dashboard)` | `14-payments/` (48) | `payments-check` | — | 10 |
| [M15](../specs/001-sharwa-frontend-platform/modules/M15-shipping-zones-couriers.md) إعدادات الشحن والمناطق والمندوبين (Shipping Zones & Couriers) | 5 · US3 | `(dashboard)` | `15-shipping/` (82) | `admin-shell-check` `phase5-decisions-check` `sharwa-ship-check` `shipping-check` | — | 12 |
| [M16](../specs/001-sharwa-frontend-platform/modules/M16-pos-interface.md) نقاط البيع (POS Interface) | 7 · US5 | `(pos)` | `16-pos/` (14) | `pos-check` | — | 9 |
| [M17](../specs/001-sharwa-frontend-platform/modules/M17-affiliates-influencers.md) التسويق بالعمولة والمؤثرون (Affiliates & Influencers) | 7 · US5 | `(dashboard)` | `17-affiliates/` (7) | `affiliates-check` | — | 7 |
| [M18](../specs/001-sharwa-frontend-platform/modules/M18-staff-rbac.md) الموظفون والأدوار والصلاحيات (Staff & RBAC) | 5 · US3 | `(dashboard)` | `18-staff/` (47) | `b2b-check` `courier-check` `pos-check` `procurement-check` `staff-check` | — | 11 |
| [M19](../specs/001-sharwa-frontend-platform/modules/M19-domains-webhooks-integrations.md) النطاقات وأدوات التتبع والـ Webhooks والتكاملات (Domains, Webhooks & Integrations) | 5 · US3 | `(dashboard)` | `19-domains/` (64) | `domains-check` | — | 8 |
| [M20](../specs/001-sharwa-frontend-platform/modules/M20-super-admin-portal.md) بوابة مالك المنصة (Super Admin SaaS Portal) | 6 · US4 | `(admin)` | `20-admin/` (27) | `admin-money-check` `admin-shell-check` `admin-stores-check` | — | 13 |
| [M21](../specs/001-sharwa-frontend-platform/modules/M21-inventory-stock-ledger.md) مركز المخزون ودفتر الحركات (Inventory Hub & Stock Ledger) | 5 · US3 | `(dashboard)` | `21-inventory/` (19) | `inventory-check` `procurement-check` | — | 7 |
| [M22](../specs/001-sharwa-frontend-platform/modules/M22-locations-warehouses.md) المواقع والمستودعات والفروع (Locations / Warehouses / Branches) | 5 · US3 | `(dashboard)` | `22-locations/` (32) | `locations-check` `shipping-check` `staff-check` | — | 8 |
| [M23](../specs/001-sharwa-frontend-platform/modules/M23-suppliers-purchase-orders.md) الموردون وأوامر الشراء (Suppliers & Purchase Orders) | 7 · US5 | `(dashboard)` | `23-procurement/` (8) | `procurement-check` | — | 8 |
| [M24](../specs/001-sharwa-frontend-platform/modules/M24-returns-reverse-logistics.md) المرتجعات والخدمات اللوجستية العكسية (Returns & Reverse Logistics / RMA) | 5 · US3 | `(dashboard)` | `24-returns/` (48) | `returns-check` | — | 3 |
| [M25](../specs/001-sharwa-frontend-platform/modules/M25-reports-hub.md) مركز التقارير والتصدير والتقارير المجدولة (Reports Hub, Exports & Scheduled Reports) | 5 · US3 | `(dashboard)` | `25-reports/` (36) | `reports-check` | — | 8 |
| [M26](../specs/001-sharwa-frontend-platform/modules/M26-bookings-appointments.md) الحجوزات والمواعيد (Bookings & Appointments) | 7 · US5 | `(dashboard)` + `(storefront)/[store]` | `26-bookings/` (8) | `bookings-check` | — | 6 |
| [M27](../specs/001-sharwa-frontend-platform/modules/M27-inbox-social-channels.md) صندوق المحادثات الموحَّد وقنوات التواصل (Unified Inbox & Social Channels) | 7 · US5 | `(dashboard)` | `27-inbox/` (8) | `inbox-check` | — | 12 |
| [M28](../specs/001-sharwa-frontend-platform/modules/M28-marketplaces.md) الأسواق الإلكترونية: أمازون ونون (Marketplaces) | 7 · US5 | `(dashboard)` | `28-marketplaces/` (8) | `marketplaces-check` | — | 10 |
| [M29](../specs/001-sharwa-frontend-platform/modules/M29-dropshipping-supplier-feeds.md) الدروبشيبينغ وملفات الموردين (Dropshipping & Supplier Feeds) | 7 · US5 | `(dashboard)` | `29-dropshipping/` (9) | `dropshipping-check` | — | 10 |
| [M30](../specs/001-sharwa-frontend-platform/modules/M30-app-store.md) متجر التطبيقات (App Store) | 7 · US5 | `(dashboard)` | `30-apps/` (6) | `apps-support-check` | — | 7 |
| [M31](../specs/001-sharwa-frontend-platform/modules/M31-sharwa-ai-console.md) وحدة تحكم شروة AI للدعم (Sharwa AI Support Console) | 7 · US5 | `(dashboard)` | `31-ai/` (3) | `apps-support-check` | — | 8 |
| [M32](../specs/001-sharwa-frontend-platform/modules/M32-support-tickets-sessions.md) تذاكر الدعم وجلسات الدعم الفني (Support Tickets & Live Support Sessions) | 7 · US5 | `(dashboard)` | `32-support/` (4) | `apps-support-check` | — | 6 |
| [M33](../specs/001-sharwa-frontend-platform/modules/M33-operating-expenses.md) المصروفات التشغيلية (Operating Expenses) | 7 · US5 | `(dashboard)` | `33-expenses/` (6) | `expenses-check` | — | 3 |
| [M34](../specs/001-sharwa-frontend-platform/modules/M34-store-settings-hub.md) مركز إعدادات المتجر (Store Settings Hub) | 3 · US1 | `(dashboard)` | `34-settings/` (41) | `payments-check` `settings-check` | — | 10 |
| [M35](../specs/001-sharwa-frontend-platform/modules/M35-customer-wallets-loyalty.md) محافظ العملاء ونقاط الولاء (Customer Wallets & Loyalty Points — merchant side) | 5 · US3 | `(dashboard)` | `35-wallets/` (21) | `wallets-check` | — | 7 |
| [M36](../specs/001-sharwa-frontend-platform/modules/M36-b2b-wholesale.md) البيع بالجملة B2B (B2B Wholesale: Tier Prices, Drafts, Negotiation) | 7 · US5 | `(dashboard)` | `36-b2b/` (7) | `b2b-check` `bundles-check` | — | 4 |
| [M37](../specs/001-sharwa-frontend-platform/modules/M37-bundles-personalization-auctions.md) أنواع المنتجات المتقدمة: الحزم، التخصيص، المزادات، التسعير بالمعادلة (Bundles, Personalization, Auctions, Formula Pricing) | 7 · US5 | `(dashboard)` لوحات التحرير داخل M04 + `(storefront)` سلوك العرض داخل M10 | `37-advanced-products/` (8) | `bundles-check` | — | 10 |
| [M38](../specs/001-sharwa-frontend-platform/modules/M38-courier-agent-app.md) تطبيق مندوب التوصيل (Courier / Delivery Agent App) | 7 · US5 | `(courier)` | `38-courier/` (7) | `courier-check` | — | 4 |
| [M39](../specs/001-sharwa-frontend-platform/modules/M39-sharwa-ship-waybills.md) شروة شيب: البوليصات وأحداث الشحن (Sharwa Ship Waybills & Shipment Events) | 7 · US5 | `(dashboard)` | `39-sharwa-ship/` (8) | `sharwa-ship-check` | — | 9 |
| [M40](../specs/001-sharwa-frontend-platform/modules/M40-sharwa-pay-wallet-pwa.md) محفظة شروة باي للعملاء PWA (Sharwa Pay Customer Wallet PWA) | 7 · US5 | `(pay)` على أصل المنصة (public schema) `/sharwa-pay/*` | `40-sharwa-pay/` (9) | `sharwa-pay-check` | — | 8 |
| [M41](../specs/001-sharwa-frontend-platform/modules/M41-order-tracking-public.md) صفحة تتبّع الطلب العامة (Public Order Tracking Page) | 4 · US2 | `(storefront)/[store]` | `41-tracking/` (8) | `storefront-check` | — | 2 |
| [M42](../specs/001-sharwa-frontend-platform/modules/M42-wishlist-reviews-engagement.md) قائمة الأمنيات والتقييمات والتنبيه بالتوفر (Wishlist, Reviews & Back-in-stock) | 5 · US3 | `(storefront)/[store]` | `42-engagement/` (14) | `engagement-check` | — | 6 |
| [M43](../specs/001-sharwa-frontend-platform/modules/M43-multi-store-rollup.md) لوحة مالك المتاجر المتعددة (Multi-store Owner Rollup) | 7 · US5 | `(dashboard)` | `43-stores/` (6) | `rollup-check` | — | 1 |
| [M44](../specs/001-sharwa-frontend-platform/modules/M44-pwa-web-push.md) تطبيق المتجر PWA وإشعارات المتصفح (PWA & Web Push) | 4 · US2 | `(storefront)/[store]` | `44-pwa/` (5) | `storefront-check` | — | 2 |
| [M45](../specs/001-sharwa-frontend-platform/modules/M45-platform-dues-console.md) لوحة مستحقات المنصة (Platform Dues Console) | 6 · US4 | `(admin)` | `45-dues/` (10) | `admin-money-check` | — | 3 |
| [M46](../specs/001-sharwa-frontend-platform/modules/M46-plans-features-admin.md) إدارة الباقات والاشتراكات وأعلام الميزات (Plans, Subscriptions & Feature Flags Admin) | 6 · US4 | `(admin)` | `46-plans/` (36) | `admin-billing-check` `marketplaces-check` | — | 9 |
| [M47](../specs/001-sharwa-frontend-platform/modules/M47-tenant-resolution-provisioning.md) حلّ المستأجر وحارس التجهيز (Tenant Resolution & Provisioning Guard) | 3 · US1 | `middleware.ts` + `(onboarding)` + صفحات خطأ عامة | `47-tenant-guard/` (15) | `tenant-isolation-check` `tenant-shell-check` | — | 1 |
| [M48](../specs/001-sharwa-frontend-platform/modules/M48-command-palette-search.md) لوحة الأوامر والبحث الشامل (Command Palette ⌘K & Global Search) | 3 · US1 | `(dashboard)` cross-cutting (تُركَّب في layout اللوحة وتُستخدم من `(pos)` لاحقاً) | `48-command-palette/` (6) | `catalog-orders-check` | — | 5 |
| [M49](../specs/001-sharwa-frontend-platform/modules/M49-notifications-center.md) مركز الإشعارات (Notifications Center — topbar bell) | 3 · US1 | `(dashboard)` cross-cutting | `49-notifications/` (5) | `catalog-orders-check` | — | 4 |

## ما بقي خارج الواجهة

1. شحن صفوف `[NEEDS BACKEND]` في Django — كل محوِّل BFF يصير passthrough بملف واحد (`src/app/api/bff/README.md`).
2. قرارات المالك المفتوحة في `execution_log.md` (آلية رمز مدير POS والحد، قائمة مندوبين لتسليم المناوبة، حقل اختيار مكوّنات الحزمة …).
3. Lighthouse على بيئة الإنتاج الحقيقية (الأرقام هنا من `next start` محلياً على mocks) — `docs/lighthouse/`.
