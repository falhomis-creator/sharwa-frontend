# Glossary — المسرد

> Source: DOC-003 (Step 01) · inventory Part A (A.4 identities, A.5 features & permissions, A.6 currencies) + Domains 1–16 + Part C.
> One Arabic term per concept ([language policy](README.md#4-language-policy)). Every term used in a heading of a Track 1–3 page must appear here. A page that needs a new term adds it here in the same change.

**How to read the "Arabic" column**
- **✓** — the exact string was found in the code during Step 01. The file is named in the *Where* column.
- **«…»** without ✓ — quoted from an Arabic server or UI sentence recorded in the Phase 002 inventory. Re-check it against the code when the page that uses it is written.
- *(مقترح)* — the documentation's proposed Arabic term; no UI label was found yet. Replace it with the UI label when the page for that screen is written. Track 4 (DOC-534) checks consistency.
- **✓ (UI)** — the label shown on the screens, confirmed by the Arabic guides glossary [`guides/_glossary.md`](guides/_glossary.md) (DOC-284) and adopted here in Step 52 (DOC-534). Where it differs from the earlier proposal, the UI label wins.

---

## 1. Platform & architecture

| English | Arabic | Meaning in Sharwa | Where |
|---|---|---|---|
| Tenant / store | المتجر | One merchant's store. Each store is a PostgreSQL **schema** created by django-tenants. | `tenants.Client` |
| Store schema (tenant schema) | مخطّط المتجر *(مقترح)* | The per-store PostgreSQL schema: products, orders, customers, staff… | django-tenants |
| Public schema | المخطّط العام *(مقترح)* | Shared, cross-store schema: tenants/domains, billing (plans, features, subscriptions), app catalogue, Sharwa Pay, `SharwaShipZone`, `CentralCustomerTrust`, `MerchantAccount`, `TenantStatsSnapshot`, console logs. | A.4, Domain 16 |
| Store host | نطاق المتجر | `<subdomain>.<base>` or a verified custom domain. It resolves the tenant. Under `/api/`, `X-Store-Domain` may name the store instead. | `TenantHeaderOverrideMiddleware` |
| Platform origin | أصل المنصة *(مقترح)* | The bare base domain (landing, registration, Sharwa Pay `/sharwa-pay/*`). Public schema. | M01, M02, M40 |
| Console | لوحة مالك المنصة | `console.<base>` — platform owner/operator UI, public schema only (404 on a store host). | M20, M45, M46 |
| Subdomain | النطاق الفرعي | Store address chosen at registration, **3–50 characters** (shared validator + `SUBDOMAIN_MAX`). | M02 |
| Custom domain | النطاق المخصّص *(مقترح)* | Merchant-owned hostname. Claimed in `tenants.CustomDomain`, verified by DNS TXT `_sharwa.<host>`, then becomes a `tenants.Domain`. | M19 |
| Provisioning | التجهيز | Background creation of a store schema. Statuses `pending · provisioning · ready · failed` (+ console-derived `stalled`). | M47, M20 |
| Setup token | رمز الإعداد *(مقترح)* | Short-lived signed token on the dashboard link after provisioning. Required to set a new store's first password. | M02 |
| BFF (Backend-for-Frontend) | — | Next.js route handlers under `/api/bff/*`. They forward to Django (`liveOrMock`, Django-first adapters, `/api/v1/*` passthrough) or answer from fixtures. | A.2 |
| Live/mock switch | مفتاح التشغيل الحي/التجريبي *(مقترح)* | `SHARWA_MOCKS=on|off` + `SHARWA_LIVE_MODULES=<keys>|*|none`. Decides per module whether a BFF row is served by Django or by the fixture. | A.3 |
| Live module key | مفتاح الوحدة *(مقترح)* | One of 39 keys (`orders`, `catalog`, `sharwa_pay`, …) listed in `SHARWA_LIVE_MODULES`. | A.3, [§4](#4-modules-m01m49) |
| Mock / fixture | بيانات تجريبية *(مقترح)* | In-memory data in `src/mocks/<module>` served when a module is not live. Every mocked response carries `x-sharwa-mock: 1`. | `src/mocks/runtime.ts` |
| Data Contract | عقد البيانات *(مقترح)* | The Zod schema `src/features/<module>/schemas.ts` + its fixture. The frontend's immutable source of truth for response shapes. Django maps its fields to match. | A.1 |
| Django-first adapter | — | BFF/server fetcher that asks Django first and uses the fixture only on 404/405/501 or when Django is down. No switch. | A.2 |
| «Ready» passthrough row | — | A row listed as Ready in `specs/001-…/contracts/ready-api-v1.md`, forwarded verbatim through `/api/v1/*`. | A.2 |
| `[NEEDS BACKEND]` | — | Phase 001 marker for a frontend row that had no Django endpoint. All rows were closed in Phase 002 except the open items in A.13. | A.13 |
| Plan feature | ميزة الباقة | A `billing.Feature` code (e.g. `pos`, `inventory`, `sharwa_ship`) enabled or disabled per store by plan, override or kill switch. Decision source `resolve_feature_decision`. | A.5 |
| Permission key | مفتاح الصلاحية *(مقترح)* | An M18 dotted key (e.g. `orders.view`, `catalog.manage`, `expenses.manage`). The owner implicitly holds all of them. | A.5 |
| Gate order | ترتيب البوابات *(مقترح)* | session (401) → plan feature (403) → permission key (403) → owner-only (403) → resource state (404/409). | A.5 |
| Owner-only | لمالك المتجر فقط | An area that staff cannot use whatever their permissions: «هذه الصفحة لمالك المتجر فقط.» ✓ | `sharwa_saas/api/views_rollup.py` |
| Idempotency key | مفتاح عدم التكرار *(مقترح)* | Client-sent key (`Idempotency-Key`, `client_uuid`, `client_id`). A retry returns the first result instead of acting twice. | A.7 |
| Optimistic lock / `version` | — | Row version checked on write. A stale write gets 409 with the current version. | A.7 |
| Approval request | طلب موافقة — «طلبات الموافقة المعلّقة» ✓ (UI) | `ApprovalRequest` in the M18 queue: write-offs, purchase orders, B2B drafts, POS shortages and discount exceptions. | M18 |
| Audit log | «سجل التدقيق» ✓ (UI) | Append-only `AuditLog` (hash chain, `verify_chain()`). Also stores order/return/PO timelines. | M18 |
| Platform action log | سجل إجراءات المنصة — «من نفّذ» ✓ | `PlatformActionLog`: who did what in the console (FR-20.07). | `sharwa_saas/tenants/console_service.py` |
| Celery task / Beat | مهمة خلفية / جدولة *(مقترح)* | Background job / periodic schedule (A.8). | A.8 |

---

## 2. Identities & roles

| English | Arabic | Meaning | Where |
|---|---|---|---|
| Storefront visitor / buyer | زائر المتجر | Anonymous Django session on a store host: cart, coupons, OTP keys, `wishlist_phone`, booking holds. No customer accounts. | A.4 |
| Store owner | مالك المتجر ✓ | The merchant. Logs in with the store's WhatsApp phone + password. Holds every permission and the owner-only areas. | `api/views_rollup.py` |
| Staff member | «موظف» · «الموظفون» ✓ (UI) | `StaffMember` (phone + password), session pinned to one store, roles per location. | M18 |
| System role «مدير المتجر» | مدير المتجر ✓ | Seeded system role with all permissions, no discount ceiling. | `products/migrations/0144_seed_staff_rbac.py` |
| System role «مدير الفرع» | مدير الفرع ✓ | Seeded system role with all permissions, POS discount ceiling 20 %. | `0144_seed_staff_rbac.py` |
| System role «كاشير» | كاشير ✓ | Seeded: `orders.view`, `orders.update_status`, `customers.view`, `inventory.view`, `discounts.apply`; POS discount ceiling 10 %. | `0144_seed_staff_rbac.py` |
| System role «أمين مخزن» | أمين مخزن ✓ | Seeded: `orders.view`, `inventory.view`, `inventory.adjust`, `inventory.writeoff`, `reports.view`. | `0144_seed_staff_rbac.py` |
| Custom role | «الأدوار المخصصة» ✓ (UI) | Merchant-created role (system roles are read-only, FR-18.04). | M18 |
| Courier agent | المندوب | Staff session whose `shipping_provider_profile` is a delivery agent. Uses the courier app `(courier)`. The owner gets 403 there. | M38 |
| Platform owner | مالك المنصة ✓ | Django superuser on the public schema. Full console rights. | `sharwa_saas/api/views_platform.py` |
| Platform operator | مشرف تشغيلي ✓ | Django `is_staff` user without superuser. Reads everything; writes dues and Sharwa Pay only (FR-20.09). | `api/views_platform.py` |
| Sharwa Pay customer | عميل شروة باي *(مقترح)* — the UI names only the wallet: «محفظة شروة باي» ✓ (UI) | Phone holder logged in with a WhatsApp OTP on the platform origin (session key `sharwa_pay_auth_phone`). | M40 |
| Multi-store owner | مالك المتاجر المتعددة | Store owner whose `MerchantAccount` links several stores («متاجري»). | M43 |
| System actor | «النظام» | Actor recorded for automatic stock/wallet movements when nobody is acting. | A.9 (`0225`, `0227`) |
| Personal access token | «الرموز الشخصية» · «إنشاء رمز» ✓ (UI) | `shw_pat_…`, shown once, SHA-256 stored, 90-day expiry. | M18 |

---

## 3. Currencies and money

| Code | Arabic label shown in the frontend | Django label (`CURRENCY_CHOICES`) | Server format (`format_money`) |
|---|---|---|---|
| `SAR` | ريال سعودي ✓ | ريال سعودي ✓ | `1,250 ر.س` for a whole amount, `12.50 ر.س` otherwise |
| `USD` | دولار أمريكي ✓ | دولار أمريكي ✓ | `$1` / `$12.50` |
| `YER_OLD` | ريال يمني (صنعاء) ✓ | يمني صنعاء ✓ | rounded whole number `… ر.ي` |
| `YER_NEW` | ريال يمني (عدن) ✓ | يمني عدن ✓ | rounded whole number `… ر.ي` |

Where: `sharwa-frontend/src/lib/schemas/money.ts` (`CURRENCY_LABELS`), `sharwa_saas/products/models/base.py` (`CURRENCY_CHOICES`, `format_money`).

> ⚠️ Discrepancy — the frontend labels the Yemeni currencies «ريال يمني (صنعاء)» / «ريال يمني (عدن)»; Django's `CURRENCY_CHOICES` says «يمني صنعاء» / «يمني عدن». Users see whichever side renders the label. Guides use the frontend label (the one on the dashboard and storefront). Reported in Step 01.

> ⚠️ Discrepancy — the constitution (principle II) gives the money example `1,250.00 ر.س`, but Django's `format_money` drops the decimals for whole amounts (`1,250 ر.س`). Pages follow the code. Reported in Step 01.

| English | Arabic | Meaning |
|---|---|---|
| Display money (`display_*`) | — | Server-formatted amount string. The browser never parses, sums or re-formats it (`displayMoney = z.string()`). |
| Per-currency totals | الإجماليات حسب العملة *(مقترح)* | Totals are given per currency and never summed across currencies (e.g. «2.50 ر.س · $1»). |
| Dashboard / store currency | عملة المتجر *(مقترح)* | `StoreSetting` currency used for conversions (free-shipping threshold, POS, chat-to-order). |
| FX rate | سعر الصرف | Stored with 4 decimals (`0217`). The dropshipping "daily" rate = `StoreSetting.usd_to_sar`. |
| Customer wallet | «محفظة العميل» · «محافظ العملاء» ✓ (UI) | Per-phone store wallet, always SAR (FR-07.04). Refunds and checkout use it. |
| Loyalty points | نقاط الولاء | `CustomerPoints`; redeemed into the wallet inside the order transaction. |
| Merchant wallet | «محفظة المتجر» ✓ (UI) — not «محفظة التاجر» | Store-schema `MerchantWallet`. Withdrawals are debited at request and refunded on rejection. |
| Sharwa Pay wallet | محفظة شروة باي | Public-schema cross-store wallet with four currency balances. Also pays platform dues and Sharwa Ship waybills. |
| Platform dues | مستحقات المنصة | Commission records + app billing charges collected from the merchant's Sharwa Pay wallet. |
| Commission owed (affiliates) | «المستحق» | Pending commissions of paid, non-cancelled orders minus clawbacks. May be negative. |
| Top-up reviewed | «شحن بمراجعة» | Sharwa Pay top-up with a receipt (`topup_manual`), approved in the console. |

---

## 4. Modules (M01–M49)

Arabic and English names as in the module specs (`specs/001-sharwa-frontend-platform/modules/`, via `docs/DELIVERY-REPORT.md`). Domain numbers follow [README §2.1](README.md#21-domain-slugs-shared-by-tracks-13).

| Module | INT | الاسم العربي | English name | Domain | Live key (`SHARWA_LIVE_MODULES`) | Route group |
|---|---|---|---|---|---|---|
| M01 | INT-001 | الصفحة الترويجية للمنصة | SaaS Landing Page | 01 | — (Django-first, no switch) | `(marketing)` |
| M02 | INT-004 | معالج تأسيس المتجر | Merchant Onboarding Wizard | 01 | — (Django-first, no switch) | `(onboarding)` |
| M03 | INT-003 | هيكل لوحة التاجر والنظرة العامة | Dashboard Shell + Overview | 02 | — (Django-first, no switch) | `(dashboard)` |
| M04 | INT-005 | إدارة المنتجات والمتغيرات | Product & Variant Manager | 03 | `products` | `(dashboard)` |
| M05 | INT-006 | التصنيفات والماركات والوسوم والمجموعات والشارات | Categories, Brands, Tags, Collections, Badges | 03 | `catalog` | `(dashboard)` |
| M06 | INT-007 | مركز الطلبات والتنفيذ | Orders & Fulfillment Pipeline | 04 | `orders` | `(dashboard)` |
| M07 | INT-017 | العملاء وإدارة العلاقات | Customers & CRM | 06 | `customers` | `(dashboard)` |
| M08 | INT-018 | مخصِّص ثيم المتجر | Storefront Theme Customizer | 07 | `design` | `(dashboard)` |
| M09 | INT-011 | واجهة المتجر: الصفحة الرئيسية وصفحات التصفّح | Customer Storefront Home & Listing | 05 | — (Django-first, no switch) | `(storefront)/[store]` |
| M10 | INT-012 | صفحة تفاصيل المنتج | Product Detail Page | 05 | — (Django-first, no switch) | `(storefront)/[store]` |
| M11 | INT-013 | السلة الجانبية والسلة الصغيرة | Slide-over Cart & Mini-Cart | 05 | — (Django-first, no switch) | `(storefront)/[store]` |
| M12 | INT-014 | إتمام الطلب بلا احتكاك | Frictionless Checkout | 05 | — (Django-first, no switch) | `(storefront)/[store]` |
| M13 | INT-019 | مركز التسويق | Marketing Hub: Coupons, Offers, Abandoned Carts, Campaigns, Timeline, Loyalty, Gifting | 07 | `marketing` | `(dashboard)` |
| M14 | INT-020 | المدفوعات والمحافظ والتحويلات | Payments, Wallets & Payouts | 08 | `payments` | `(dashboard)` |
| M15 | INT-021 | إعدادات الشحن والمناطق والمندوبين | Shipping Zones & Couriers | 11 | `shipping` | `(dashboard)` |
| M16 | INT-033 | نقاط البيع | POS Interface | 13 | `pos` | `(pos)` |
| M17 | INT-034 | التسويق بالعمولة والمؤثرون | Affiliates & Influencers | 07 | `affiliates` | `(dashboard)` |
| M18 | INT-022 | الموظفون والأدوار والصلاحيات | Staff & RBAC | 12 | `staff` | `(dashboard)` |
| M19 | INT-023 | النطاقات وأدوات التتبع والـ Webhooks والتكاملات | Domains, Webhooks & Integrations | 12 | `integrations` | `(dashboard)` |
| M20 | INT-030 | بوابة مالك المنصة | Super Admin SaaS Portal | 16 | `platform` | `(admin)` |
| M21 | INT-024 | مركز المخزون ودفتر الحركات | Inventory Hub & Stock Ledger | 10 | `inventory` | `(dashboard)` |
| M22 | INT-025 | المواقع والمستودعات والفروع | Locations / Warehouses / Branches | 10 | `locations` | `(dashboard)` |
| M23 | INT-035 | الموردون وأوامر الشراء | Suppliers & Purchase Orders | 10 | `procurement` | `(dashboard)` |
| M24 | INT-026 | المرتجعات والخدمات اللوجستية العكسية | Returns & Reverse Logistics / RMA | 04 | `returns` | `(dashboard)` |
| M25 | INT-027 | مركز التقارير والتصدير والتقارير المجدولة | Reports Hub, Exports & Scheduled Reports | 15 | `reports` | `(dashboard)` |
| M26 | INT-036 | الحجوزات والمواعيد | Bookings & Appointments | 13 | `bookings` (merchant rows; buyer rows Django-first) | `(dashboard)` + `(storefront)/[store]` |
| M27 | INT-037 | صندوق المحادثات الموحَّد وقنوات التواصل | Unified Inbox & Social Channels | 13 | `channels` | `(dashboard)` |
| M28 | INT-038 | الأسواق الإلكترونية: أمازون ونون | Marketplaces | 13 | `marketplaces` | `(dashboard)` |
| M29 | INT-039 | الدروبشيبينغ وملفات الموردين | Dropshipping & Supplier Feeds | 13 | `dropshipping` | `(dashboard)` |
| M30 | INT-040 | متجر التطبيقات | App Store | 14 | `apps` | `(dashboard)` |
| M31 | INT-041 | وحدة تحكم شروة AI للدعم | Sharwa AI Support Console | 14 | `sharwa_ai` | `(dashboard)` |
| M32 | INT-042 | تذاكر الدعم وجلسات الدعم الفني | Support Tickets & Live Support Sessions | 14 | `support` | `(dashboard)` |
| M33 | INT-043 | المصروفات التشغيلية | Operating Expenses | 08 | `expenses` | `(dashboard)` |
| M34 | INT-010 | مركز إعدادات المتجر | Store Settings Hub | 12 | `settings` | `(dashboard)` |
| M35 | INT-028 | محافظ العملاء ونقاط الولاء | Customer Wallets & Loyalty Points — merchant side | 06 | `wallets` (merchant rows; storefront rows Django-first) | `(dashboard)` |
| M36 | INT-044 | البيع بالجملة B2B | B2B Wholesale: Tier Prices, Drafts, Negotiation | 09 | `b2b` | `(dashboard)` |
| M37 | INT-045 | أنواع المنتجات المتقدمة: الحزم، التخصيص، المزادات، التسعير بالمعادلة | Bundles, Personalization, Auctions, Formula Pricing | 03 | `advanced_products` | `(dashboard)` لوحات التحرير داخل M04 + `(storefront)` سلوك العرض داخل M10 |
| M38 | INT-046 | تطبيق مندوب التوصيل | Courier / Delivery Agent App | 11 | `courier` | `(courier)` |
| M39 | INT-047 | شروة شيب: البوليصات وأحداث الشحن | Sharwa Ship Waybills & Shipment Events | 11 | `sharwa_ship` | `(dashboard)` |
| M40 | INT-048 | محفظة شروة باي للعملاء PWA | Sharwa Pay Customer Wallet PWA | 08 | `sharwa_pay` | `(pay)` على أصل المنصة (public schema) `/sharwa-pay/*` |
| M41 | INT-015 | صفحة تتبّع الطلب العامة | Public Order Tracking Page | 05 | — (Django-first, no switch) | `(storefront)/[store]` |
| M42 | INT-029 | قائمة الأمنيات والتقييمات والتنبيه بالتوفر | Wishlist, Reviews & Back-in-stock | 05 | — (Django-first, no switch) | `(storefront)/[store]` |
| M43 | INT-049 | لوحة مالك المتاجر المتعددة | Multi-store Owner Rollup | 02 | `rollup` | `(dashboard)` |
| M44 | INT-016 | تطبيق المتجر PWA وإشعارات المتصفح | PWA & Web Push | 05 | `pwa` (merchant rows; storefront rows passthrough) | `(storefront)/[store]` |
| M45 | INT-031 | لوحة مستحقات المنصة | Platform Dues Console | 16 | `platform_money` | `(admin)` |
| M46 | INT-032 | إدارة الباقات والاشتراكات وأعلام الميزات | Plans, Subscriptions & Feature Flags Admin | 16 | `platform_billing` | `(admin)` |
| M47 | INT-002 | حلّ المستأجر وحارس التجهيز | Tenant Resolution & Provisioning Guard | 01 | — (Django-first, no switch) | `middleware.ts` + `(onboarding)` + صفحات خطأ عامة |
| M48 | INT-008 | لوحة الأوامر والبحث الشامل | Command Palette ⌘K & Global Search | 02 | `search` | `(dashboard)` cross-cutting (تُركَّب في layout اللوحة وتُستخدم من `(pos)` لاحقاً) |
| M49 | INT-009 | مركز الإشعارات | Notifications Center — topbar bell | 02 | `notifications` | `(dashboard)` cross-cutting |

Live-key notes: `platform`, `platform_money` and `platform_billing` share one BFF catch-all (`/api/bff/platform/[...path]`). `products`, `b2b` and `advanced_products` are three independent rule tables in `src/lib/bff/live-products.ts`. 39 keys in total (A.3).

---

## 5. Commerce terms by domain

### Catalog (03)
| English | Arabic | Meaning |
|---|---|---|
| Product template / sector | قالب المنتج / القطاع | Blueprint chosen in the editor; drives attributes and variants (35 central sectors/templates). |
| Variant | متغيّر | Option combination with its own price/stock (`<sku>-<n>` SKU). |
| Category · brand · tag · collection · badge | التصنيف · الماركة · الوسم · المجموعة · الشارة | M05 organization objects; category `sort_order` is global. |
| Bundle | الحزمة | Product made of components (mandatory/optional) + build fee. |
| Compatibility rule | قاعدة التوافق *(مقترح)* | `equals · not_equals · in` constraint between bundle components. |
| Personalization field | حقل التخصيص *(مقترح)* | Buyer-filled field (9 types) with an optional surcharge per unit. |
| Auction · bid | المزاد · المزايدة | Single-unit sale by bidding; anti-sniping extension; buy-now ends it. |
| Serialized unit | وحدة برقم تسلسلي *(مقترح)* | `InventoryItem` with a serial code; stock = available units. |
| Formula pricing | التسعير بالمعادلة | Unit price × buyer value (`…/quote/?value=`). |
| Tier (quantity) price | سعر الكمية *(مقترح)* | Price that applies from a minimum quantity; charged by cart/checkout (M36). |
| Product import job | مهمة الاستيراد *(مقترح)* | CSV/XLSX import processed in 200-row chunks; imported products are drafts. |

### Orders & returns (04)
| English | Arabic | Meaning |
|---|---|---|
| Financial status | الحالة المالية — column «المالية» ✓ (UI) | `Order.status` (e.g. `pending_payment`, `payment_review`, `completed`, `cancelled`). |
| Fulfilment status | حالة التنفيذ — column «التنفيذ» ✓ (UI) | Merchant-defined `OrderStatus` workflow; may restock (`releases_stock`). |
| Timeline | السجل الزمني *(مقترح)* | Order/return/PO history built from `AuditLog` + shipment events + refunds. |
| Refund | الاسترجاع — «سجل الاسترجاعات» ✓ (UI) | `OrderRefund` (cash, wallet credit, store credit…). |
| Return request · RMA | «المرتجعات» · «مسار RMA» ✓ (UI) | Return decision flow; RMA = reverse logistics with scan and QA (`RMA-12`). |
| Quarantine | الحجر — «بانتظار الفحص» ✓ (UI) | Returned stock held before QA moves it to on-hand. |

### Storefront (05)
| English | Arabic | Meaning |
|---|---|---|
| Cart · buy-now cart | السلة · الشراء الفوري *(مقترح)* | Session cart; buy-now uses an isolated `buy_now_cart`. |
| COD (UI `cod`) | الدفع عند الاستلام | Django `manual` without receipt, behind a WhatsApp OTP, offered only when nothing is due upfront. |
| Bank transfer (UI `manual`) | التحويل البنكي *(مقترح)* | Transfer with receipt + amount (receipt replaces the OTP). |
| Pickup code | رمز الاستلام *(مقترح)* | 6 digits, 30 days, issued when a pickup order is prepared. |
| «جاهز للاستلام» / «جاهز للشحن» | — | Tracking labels for Django `ready_for_pickup` on pickup vs delivery orders. |
| Back-in-stock alert | التنبيه عند التوفر | Phone subscription per product. |
| Review moderation | «بانتظار المراجعة» / «اعتماد» | API reviews start unapproved; the merchant approves them in M07. |
| Referral link | رابط الإحالة *(مقترح)* | `?aff_id=` link that sets the 30-day `sharwa_aff` cookie. |

### Customers & marketing (06–07)
| English | Arabic | Meaning |
|---|---|---|
| Derived customer | العميل | No customer model: a customer = a normalized phone (`customer_key`) across all tables (FR-07.01). |
| Platform trust vs store trust | الثقة على مستوى المنصة / المتجر *(مقترح)* | `CentralCustomerTrust` (public, signal only) vs `CustomerReliabilityRecord` (store, can disable COD). Never merged. |
| Segment / audience | «الشريحة» ✓ (UI) | Campaign audience (`AUDIENCE_TYPE`); «خامل» = dormant 90 days. |
| Coupon · offer | الكوبون · العرض | Code discount vs automatic promotion (discount, free shipping, buy X get Y). |
| Abandoned cart | السلة المتروكة | Captured cart with a phone; reminders (template, channel, step-2 coupon). |
| Campaign | الحملة | Draft → preview → send now / scheduled (`dispatch_scheduled_campaigns`). |
| Affiliate · influencer | المسوّق بالعمولة · المؤثّر | Link-based vs coupon-based partner commissions. |
| Theme · section · announcement bar | الثيم · القسم · شريط الإعلانات *(مقترح)* | M08 storefront design objects (`theme_version` lock). |

### Inventory, locations, procurement (10)
| English | Arabic | Meaning |
|---|---|---|
| Stock movement / ledger | حركة المخزون · دفتر الحركات | `StockMovement` with actor, balance after, reference. |
| Reservation | حجز المخزون — «الحجوزات» on the inventory screen ✓ (UI); always say which «حجز» is meant | `InventoryReservation` hold (`order:N`, `b2b:N`, cart). |
| Write-off | «طلب إعدام» · «طلبات الإعدام» ✓ (UI); permission name «إتلاف مخزون» | Stock decrease approved through the M18 queue (`stock_writeoff`). |
| Location (warehouse, branch, locker, vehicle) | الموقع (مستودع، فرع، خزانة، مركبة) | `Location` with capability flags and ownership type. |
| Multi-location mode | «تعدد المواقع» ✓ (UI) | Plan feature `multi_location`; `LocationInventory` becomes the stock source. |
| Routing rule | «قواعد التوجيه» · «قاعدة جديدة» ✓ (UI) | Chooses the fulfilling location; priorities 1..n. |
| Supplier · purchase order | المورّد · أمر الشراء | `PO-0001`; approval → receive → stock movement `po_received`. |

### Shipping (11)
| English | Arabic | Meaning |
|---|---|---|
| Delivery method | طريقة التوصيل | Includes the official «شروة شيب» method (name fixed). |
| Sharwa Ship | شروة شيب ✓ | Platform-run carrier; waybill fees debited from the store's Sharwa Pay wallet. (`tenants/console_service.py`) |
| Waybill / AWB · master/child | البوليصة · رئيسية/فرعية | `ShipmentOrder`; heavy fulfilments split into a master + children. |
| Shipment event · transition | حدث الشحنة · الانتقال *(مقترح)* | Every status change goes through `apply_shipment_transition`. |
| AWB queue | «طابور AWB» · «طابور إصدار AWB» ✓ (UI) | `PendingAWBQueue` of failed issuances (retry). |
| Rate card | بطاقة الأسعار *(مقترح)* | `CarrierRateCardSnapshot`; drift vs last confirmed price. |
| Shift (courier) · custody ledger | «المناوبة» · «العهدة» ✓ (UI) — «الوردية» is the POS shift only | `CourierShift`, `CourierCustodyLedger` (COD collected). |
| Zone · restricted zone · SLA | «مناطق شروة شيب» · «النطاقات المحظورة» · «قواعد SLA» ✓ (UI) | Sharwa Ship zones (console), restricted polygons, SLA rules (default 72 h). |
| 3PL carrier | «شركات الشحن» · «الناقلون الخارجيون» ✓ (UI) | `aramex`, `smsa` via `CARRIER_REGISTRY`. |

### Channels & operations (13)
| English | Arabic | Meaning |
|---|---|---|
| Unified inbox · conversation | صندوق المحادثات · المحادثة | Meta (Facebook/Instagram), TikTok, Telegram, WhatsApp threads. |
| Chat-to-order | تحويل المحادثة إلى طلب *(مقترح)* | Creates a real M06 order with `sales_channel='chat'`. |
| Marketplace listing · sync job | عرض في السوق · مهمة مزامنة *(مقترح)* | Amazon/Noon listing per product/variant; push / order pull / FBA jobs. |
| Supplier connection · feed · pricing rule | ربط المورّد · ملف المورّد · قاعدة التسعير *(مقترح)* | Dropshipping (CJ, مخازن, قنوات, flat feeds). |
| Register · shift · receipt (POS) | الصندوق *(مقترح)* · «الوردية» · «الورديات ودرج الكاش» ✓ (UI) · الإيصال *(مقترح)* | `CashRegister`, `Shift` (`version`), `PosReceipt` `POS-<shift>-<seq>`. |
| Variance (shortage / overage) | الفرق (عجز / زيادة) *(مقترح)* | Shortage → manager approval; `display_variance` = actual − expected. |
| Manager code | رمز المدير *(مقترح)* | Hashed `pos_manager_code_hash`; unlocks a discount above the role ceiling. |
| Service · availability · slot · hold | الخدمة · أوقات التوفر · الموعد · الحجز المؤقت *(مقترح)* | Bookable product; 30-min candidates; 15-min hold. |

### Apps, AI, support (14)
| English | Arabic | Meaning |
|---|---|---|
| App installation | تثبيت التطبيق *(مقترح)* | `StoreAppInstallation` (install / activate / deactivate; suspended by platform). |
| WhatsApp app (SharwaConnect) | تطبيق واتساب | Code `whatsapp` in Django, `whatsapp_bot` in the contract. |
| Message template | قالب الرسالة *(مقترح)* | Six WhatsApp templates (ids 1–6), `{var}` ↔ `{{var}}`. |
| Sharwa AI | شروة AI | WhatsApp support bot app; console SSO. |
| Support session · takeover | جلسة الدعم · الاستلام اليدوي *(مقترح)* | Bot/human lock (`version`); `support.takeover_session`. |
| Support ticket | تذكرة الدعم | `SupportTicket`. |

### Platform console (16)
| English | Arabic | Meaning |
|---|---|---|
| Plan · subscription | الباقة · الاشتراك | `billing.Plan`, `Subscription.assign_plan`; default free plan. |
| Feature override · kill switch | استثناء الميزة · إيقاف عام *(مقترح)* | Per-store override / global switch in the feature decision. |
| Re-provision | «🔁 إعادة تجهيز» ✓ | Re-queue a failed or stalled store. (`tenants/console_service.py`) |
| Deactivation · reinstatement | الإيقاف · «أُعيد التفعيل» | `TenantDeactivationRecord` (closed with `reinstated_at`). |
| Dead-letter webhook event | حدث ويب هوك معلّق *(مقترح)* | `PendingWebhookEvent` (retry / discard). |
| Market category | فئة السوق *(مقترح)* | Category a store ticks at registration. |

---

## 6. Status words used in the docs

| Term | Meaning |
|---|---|
| **Django-first** | Served by Django when the route exists; the fixture is only a fallback. |
| **Live** | Module listed in `SHARWA_LIVE_MODULES` (or `SHARWA_MOCKS=off`). The BFF forwards to Django. |
| **Legacy HTML** | Django server-rendered screen kept alongside the API. Both call the same services. |
| **Open item** | Behaviour not built or not wired, kept as recorded in inventory A.13. |
