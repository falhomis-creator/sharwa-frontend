# M20 — بوابة مالك المنصة (Super Admin SaaS Portal)

**Route group**: `(admin)` · **Priority**: P2 · **Backend status**: HTML-only (`/master-dashboard/*`, `/master-dashboard/dues/`) + Django admin (`/sharwa-secure-gate/`) `[NEEDS BACKEND]`
**Discovery refs**: `01-tenants-dashboard-admin.md` §2.1 (Client, Domain, TenantStatsSnapshot, PendingWebhookEvent, TenantDeactivationRecord), §2.2 (Plan, Subscription, PlatformBillingSettings, Feature, PlanFeature, TenantFeatureOverride), §2.3 (App, AppBillingOverride, dues), §2.5 (MarketCategory), §7 (39 feature keys), §8 (Super-Admin capabilities) · `03-api-payments-shipping-theme-integrations.md` §3 (SharwaPay topup/withdrawal), §4 (SharwaShipZone) · **Benchmarks**: Stripe Dashboard (جداول كثيفة، أرقام Mono، إجراءات بتأكيد)، Supabase Studio (لوحة مشاريع وإعدادات مفاتيح بوضوح)، Retool (لوحات تشغيلية داخلية بلا زخرفة)

## 1. الهدف (Purpose)

إعطاء مالك المنصة لوحة واحدة سريعة لمراقبة كل المتاجر، إدارة الخطط والميزات والتجاوزات، تحصيل المستحقات، الموافقة على حركات Sharwa Pay، إدارة مناطق شروة شيب وكتالوج التطبيقات وفئات السوق، ومراجعة أحداث الـ Webhook المعلّقة ودورة حياة تعطيل المتاجر — بدل التنقل بين Django admin وصفحتَي HTML. يُقاس بزمن تنفيذ إجراء تشغيلي (تحصيل/موافقة) وبعدد المتاجر الفاشلة في التجهيز المعالَجة يومياً.

## 2. الفاعلون (Actors)

- **مالك المنصة (superuser)**: كل الإجراءات؛ جلسة Django admin على النطاق العام (public schema).
- **مشرف تشغيلي**: قراءة + إجراءات Sharwa Pay والمستحقات فقط (يُقترح تمييزه بصلاحيات Django staff).
- **النظام**: `aggregate_tenant_stats`, `provision_tenant_schema`, `retry_stalled_tenant_provisioning`, مهام beat (انتهاء اشتراكات التطبيقات، إلخ).

## 3. قصص المستخدم (User Stories)

### US-20.1 — نظرة عامة على المنصة (P1)
يفتح المالك البوابة فيرى إجمالي المتاجر والمبيعات والطلبات وآخر المتاجر المُنشأة بحالة تجهيزها.
**Independent Test**: الصفحة تُحمَّل بـ skeleton ثم أرقام Mono كبيرة من `TenantStatsSnapshot`؛ قائمة آخر 50 متجراً بنقطة حالة `provisioning_status`.
**Acceptance**:
1. **Given** `/admin`, **Then** شريط أرقام نصّي: `total_stores`, `total_sales` (كما يرسلها الخادم)، `total_orders`، ومتاجر `failed` كرقم دلالي قابل للنقر كفلتر.
2. **Given** قائمة المتاجر الأخيرة، **Then** الأعمدة: الاسم، `schema_name` (Mono)، النطاق، `merchant_phone`, `provisioning_status`, `created_on`.

### US-20.2 — جدول المتاجر وإجراءاتها (P1)
يبحث المالك ويفلتر المتاجر بالحالة والخطة والنشاط وينفّذ إجراءات فردية أو جماعية.
**Acceptance**:
1. **Given** الجدول، **Then** الأعمدة: `name`, `schema_name`, النطاق الأساسي، `merchant_phone`, `provisioning_status` (`pending` · `provisioning` · `ready` · `failed`), الخطة الحالية (`current_plan`), `is_active`, `created_on`؛ الفلاتر في الرابط.
2. **Given** متاجر `failed` محددة، **When** يُختار «إعادة التجهيز»، **Then** معاينة بالعدد ثم تنفيذ وتقرير بالنتائج.
3. **Given** متجر، **When** يُختار «تفعيل/إلغاء شروة شيب»، **Then** يُطلب تأكيد ويُستدعى `activate_sharwa_ship_task`؛ تُعرض الحالة «قيد التفعيل» حتى الإتمام.
4. **Given** متجر، **When** يُفتح «إدارة الميزات»، **Then** تُعرض الـ 39 ميزة مجمَّعة بـ`module_group` مع ثلاث حالات لكل ميزة: موروثة (من الخطة/العام) · تجاوز تفعيل · تجاوز تعطيل، وحقل `notes` للتجاوز؛ ويُدعم التطبيق الجماعي على متاجر محددة.
5. **Given** صف المتجر، **When** يُفتح، **Then** صفحة تفاصيل: الاشتراك الحالي (`Subscription.status` `active` · `cancelled` · `expired`)، النطاقات (`Domain` مع إضافة/أساسي)، التجاوزات، التثبيتات، سجل التعطيل.

### US-20.3 — الخطط والميزات والمفاتيح الرئيسية (P1)
**Acceptance**:
1. **Given** الخطط، **Then** CRUD بالحقول: `name`, `code`, `description`, `is_free`, `price`, `currency` (`SAR` · `USD` · `YER_OLD` · `YER_NEW`), `billing_interval` (`monthly` · `yearly` · `lifetime`), `commission_type` (`none` · `percentage` · `fixed`), `commission_value`, `max_products`, `max_orders_per_month`, `is_active`, `is_default_free`, `display_order`؛ ومصفوفة `PlanFeature` (ميزة × خطة) بمربعات اختيار.
2. **Given** الميزات، **Then** جدول الـ 39 مفتاحاً: `code`, `name`, `description`, `module_group`, `is_active_globally` (مفتاح قتل عام)، `requires_plan`.
3. **Given** `PlatformBillingSettings`, **Then** مفتاحان `subscriptions_enabled` و`commission_enabled` مع تحذير صريح عند التفعيل: «ستُفعَّل بوابة الخطط على كل المتاجر» / «ستبدأ سجلات العمولة».
4. **Given** أي ميزة، **Then** يُعرض ترتيب الحسم كتلميح ثابت: تجاوز المتجر → المفتاح العام → `requires_plan=false` → `subscriptions_enabled=false` → `PlanFeature`.

### US-20.4 — لوحة المستحقات (P1)
**Acceptance**:
1. **Given** `/admin/dues`, **Then** تبويبان: سجلات العمولة (`PlatformCommissionRecord`) ورسوم التطبيقات (`AppBillingCharge`) بحالات `pending` · `collected` · `waived`، فلترة بالمتجر والحالة والفترة، ومجاميع Mono لكل حالة كما يرسلها الخادم.
2. **Given** سجل عمولة `pending`, **Then** إجراءان: «تحصيل» (يخصم من Sharwa Pay بسبب `platform_fee`) و«إعفاء»؛ كلٌّ بتأكيد.
3. **Given** رسم تطبيق، **Then** إجراءات: «تحصيل» · «إعفاء» · «إلغاء الإعفاء» · «توليد رسم» · «تعليق التطبيق» · «إعادة تفعيل التطبيق» — ثمانية إجراءات إجمالاً مع تحصيل/إعفاء العمولة، تُعطَّل غير المنطبقة مع السبب.
4. **Given** تطبيق مُعلَّق (`suspended_by_platform`), **Then** يُعرض في صف التثبيت بشارة وزر إعادة التفعيل.

### US-20.5 — موافقات Sharwa Pay (P1)
**Acceptance**:
1. **Given** طلبات الشحن (`SharwaPayTopupRequest`) `pending` قيد المراجعة، **When** يُفتح طلب، **Then** يُعرض `customer_phone`, المبلغ والعملة، `bank_transaction_id`, صورة `receipt_image` مكبَّرة، وزرّا «قبول» (`approved` مقبول) / «رفض» (`rejected` مرفوض) بتأكيد.
2. **Given** طلبات السحب (`SharwaPayWithdrawalRequest`) `pending`, **Then** «تأكيد التنفيذ» (`approved` مُنفَّذ) / «رفض» (`rejected` — يُعاد المبلغ) مع تنبيه «المبلغ مخصوم مسبقاً».
3. **Given** `bank_transaction_id` مكرَّر، **Then** الخادم يرفض؛ تُعرض الرسالة مع رابط الطلب السابق.
4. **Given** محفظة عميل، **Then** تُعرض أرصدتها الأربع وحركاتها للقراءة فقط (`SharwaPayWalletTransaction` بالأسباب `topup_manual` · `topup_auto` · `purchase` · `purchase_refund` · `withdrawal` · `withdrawal_reversal` · `platform_fee`).

### US-20.6 — مناطق شروة شيب، كتالوج التطبيقات، فئات السوق (P2)
**Acceptance**:
1. **Given** المناطق، **Then** CRUD: `code`, `name`, `price`, `currency`, `volumetric_divisor` (5000), `center_latitude`, `center_longitude`, `radius_km`, `is_active`, `sort_order`؛ معاينة الدوائر على خريطة بسيطة.
2. **Given** التطبيقات، **Then** CRUD `App`: `code`, `name`, `description`, `icon`, `is_listed`, `is_free`, `price`, `currency`, `billing_interval` (`monthly` · `yearly`), `billing_enabled`؛ و`AppBillingOverride` لكل متجر.
3. **Given** فئات السوق (`MarketCategory`), **Then** `name`, `display_order`, `is_active` بإعادة ترتيب بالسحب.

### US-20.7 — أحداث Webhook المعلّقة ودورة حياة التعطيل (P2)
**Acceptance**:
1. **Given** `PendingWebhookEvent` بحالة `pending` · `resolved` · `discarded`, **Then** جدول بالمصدر والحمولة (قابلة للطيّ، Mono) وسبب التعليق، وإجراءا «إعادة المعالجة» و«تجاهل».
2. **Given** متجر، **When** يُختار «تعليق»، **Then** يُنشأ `TenantDeactivationRecord` بحالة `suspended` مع `reason` و`grace_period_ends_at`؛ ثم `deactivated` ثم `closed` بعد `settled_custody`؛ كل انتقال بتأكيد، والانتقالات غير القانونية معطّلة بالسبب.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-20.01**: البوابة MUST تعمل على النطاق العام للمنصة فقط (public schema) وتُرفض على نطاقات المتاجر؛ لا معرّف متجر في الـ query string.
- **FR-20.02**: كل إجراء كتابة MUST يمرّ بتأكيد يذكر المتجر والأثر؛ الإجراءات الجماعية تُظهر معاينة بالعدد وتقريراً بالنتائج.
- **FR-20.03**: كل الجداول MUST تدعم ترقيماً خادمياً، ترتيباً، وفلاتر في الرابط؛ العمود الرقمي Mono محاذاة نهاية.
- **FR-20.04**: المبالغ (مبيعات، مستحقات، أرصدة) MUST تُعرض كما يرسلها الخادم؛ لا جمع بين عملات.
- **FR-20.05**: مصفوفة الميزات MUST تُظهر الحالة الفعلية لكل ميزة لكل متجر كما يحسبها الخادم وفق ترتيب الحسم، وتُميّز بصرياً الموروث عن المتجاوَز.
- **FR-20.06**: الإجراءات المحجوبة (تحصيل سجل `collected`، تعليق تطبيق معلَّق، إغلاق متجر بلا تسوية) MUST تُعطَّل مع تلميح لا تُخفى.
- **FR-20.07**: البوابة MUST تُسجّل من نفّذ كل إجراء (يُعرض في تفاصيل المتجر «آخر الإجراءات»).
- **FR-20.08**: `⌘K` MUST يبحث في المتاجر بالاسم/`schema_name`/الهاتف/النطاق وينتقل مباشرة.
- **FR-20.09**: البوابة MUST تحترم تبويباً للأدوار: superuser كل شيء؛ staff غير superuser قراءة + Sharwa Pay + المستحقات.

## 5. الكيانات والحالات (Key Entities & States)

- **Client**: `name`, `schema_name`, `merchant_phone`, `interested_categories`, `terms_accepted_at`, `is_active`, `created_on`, `provisioning_status` (`pending` · `provisioning` · `ready` · `failed`), `provisioning_error`, `provisioned_at`; `current_subscription`, `current_plan`. **Domain**: `domain`, `is_primary`.
- **Plan** (حقول US-20.3) · **Subscription**: `status` `active` · `cancelled` · `expired`, `is_current`, `current_period_end` · **PlatformBillingSettings**: `subscriptions_enabled`, `commission_enabled` · **Feature** (39) · **PlanFeature**: `is_enabled` · **TenantFeatureOverride**: `is_enabled`, `notes`.
- **مفاتيح الميزات (39)**: `refunds` · `inventory` · `bulk_upload` · `marketing` · `campaigns` · `promotions` · `coupon` · `tracking_tools` · `timeline` · `abandoned_carts` · `influencers` · `affiliates` · `bookings` · `storefront_design` · `contact_info` · `store_policies` · `customer_wallets` · `reports` · `shipping_settings` · `shipping_companies` · `shipping_providers` · `payment_gateways` · `local_wallets` · `bank_transfers` · `currency_settings` · `seo_settings` · `gift_settings` · `loyalty_settings` · `merchantwallet` · `app_marketplace` · `pickuplocation` · `sharwa_ship` · `customer_report` · `product_report` · `multi_location` · `staff_rbac` · `social_channels` · `marketplaces` · `dropshipping`.
- **PlatformCommissionRecord** / **AppBillingCharge**: `pending` · `collected` · `waived` · **StoreAppInstallation**: `is_active`, `suspended_by_platform`, `subscription_expires_at`.
- **App**, **AppBillingOverride** · **SharwaPayTopupRequest** / **SharwaPayWithdrawalRequest**: `pending` · `approved` · `rejected` · **SharwaShipZone** · **MarketCategory**.
- **TenantStatsSnapshot**: `date`, `orders_count`, `completed_orders_count`, `refunded_orders_count`, `revenue_sar` · **PendingWebhookEvent**: `pending` · `resolved` · `discarded` · **TenantDeactivationRecord**: `suspended` · `deactivated` · `closed`, `grace_period_ends_at`, `settled_custody`, `reason`.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/admin` (النظرة العامة) · `/admin/stores` (+ `/[schema]` تفاصيل بتبويبات: الاشتراك · النطاقات · الميزات · التطبيقات · التعطيل · الإجراءات) · `/admin/plans` (+ `/[code]`) · `/admin/features` · `/admin/billing-settings` · `/admin/dues` · `/admin/sharwa-pay/topups` · `/admin/sharwa-pay/withdrawals` · `/admin/sharwa-pay/wallets/[phone]` · `/admin/sharwa-ship/zones` · `/admin/apps` · `/admin/market-categories` · `/admin/webhook-events` · رابط «Django admin» في التذييل للنماذج غير المغطاة.
- **الحالات البصرية**: skeleton · فراغ («لا متاجر فاشلة» / «لا طلبات معلّقة») · خطأ · بلا صلاحية (staff غير superuser) · إجراء قيد التنفيذ (Celery) بشارة «قيد المعالجة» وتحديث دوري.
- **الجوال**: البوابة مكتبية أولاً؛ على 390px تبقى القوائم قابلة للقراءة كبطاقات، والإجراءات الحساسة متاحة بتأكيد.
- **اختصارات**: `⌘K` بحث المتاجر · `G then S` المتاجر · `G then D` المستحقات · `A`/`R` قبول/رفض في طلبات Sharwa Pay.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| النظرة العامة | `platform_master_dashboard` HTML | `[NEEDS BACKEND]` → `GET /api/v1/platform/overview/` → `{total_stores, display_total_sales, total_orders, failed_stores, recent_stores:[...]}` |
| المتاجر | `ClientAdmin` | `[NEEDS BACKEND]` → `GET /api/v1/platform/stores/?status&plan&is_active&q&page`, `GET /<schema>/` |
| إعادة التجهيز / شروة شيب | admin actions | `[NEEDS BACKEND]` → `POST /api/v1/platform/stores/reprovision/` `{schemas[]}`, `POST /<schema>/sharwa-ship/` `{active}` |
| تجاوزات الميزات | `TenantFeatureOverride` admin (bulk) | `[NEEDS BACKEND]` → `GET /api/v1/platform/stores/<schema>/features/` → `[{code, effective, source, override?}]`, `PUT /features/` `{overrides:[{code, is_enabled|null, notes}]}`, `POST /api/v1/platform/features/bulk-override/` `{schemas[], overrides[]}` |
| الخطط / الميزات / المفاتيح | Billing admin | `[NEEDS BACKEND]` → `GET/POST/PATCH /api/v1/platform/plans/`, `/plans/<code>/features/`, `GET/PATCH /api/v1/platform/features/<code>/`, `GET/PATCH /api/v1/platform/billing-settings/` |
| المستحقات (8 إجراءات) | `platform_dues_dashboard` POST | `[NEEDS BACKEND]` → `GET /api/v1/platform/dues/?kind&status&schema&from&to&page`; `POST /api/v1/platform/dues/commissions/<id>/{collect|waive}/`; `POST /api/v1/platform/dues/charges/<id>/{collect|waive|unwaive}/`; `POST /api/v1/platform/dues/charges/generate/` `{schema, app_code}`; `POST /api/v1/platform/apps/installations/<id>/{suspend|reactivate}/` |
| Sharwa Pay | SharwaPay admin | `[NEEDS BACKEND]` → `GET /api/v1/platform/sharwa-pay/topups/?status`, `POST /<id>/{approve|reject}/`; `GET /withdrawals/?status`, `POST /<id>/{confirm|reject}/`; `GET /wallets/<phone>/` |
| مناطق شروة شيب | SharwaShip admin | `[NEEDS BACKEND]` → `GET/POST/PATCH/DELETE /api/v1/platform/sharwa-ship/zones/` |
| التطبيقات | Appstore admin | `[NEEDS BACKEND]` → `GET/POST/PATCH /api/v1/platform/apps/`, `/apps/<code>/overrides/` |
| فئات السوق | `MarketCategory` admin | `[NEEDS BACKEND]` → `GET/POST/PATCH/DELETE /api/v1/platform/market-categories/`, `POST /reorder/` |
| أحداث Webhook المعلّقة | `PendingWebhookEvent` admin | `[NEEDS BACKEND]` → `GET /api/v1/platform/webhook-events/?status`, `POST /<id>/{retry|discard}/` |
| دورة حياة التعطيل | `TenantDeactivationRecord` (نموذج فقط) | `[NEEDS BACKEND]` → `GET/POST /api/v1/platform/stores/<schema>/deactivation/` `{action: suspend|deactivate|close, reason?, grace_period_ends_at?}` |
| المصادقة | جلسة Django admin | `[NEEDS BACKEND]` → مصادقة جلسة superuser/staff على `/api/v1/platform/*` + CSRF |

## 8. الحالات الحدّية (Edge Cases)

- متجر `provisioning` منذ > 30 دقيقة: شارة «متعثّر» واقتراح إعادة التجهيز (يطابق `retry_stalled_tenant_provisioning`).
- تفعيل `subscriptions_enabled` بينما متاجر بلا اشتراك: تحذير بالعدد وتعيين الخطة `is_default_free` لها.
- تحصيل عمولة من محفظة بلا رصيد كافٍ: الخادم يرفض؛ تُعرض الرسالة ويبقى `pending`.
- رفض سحب بعد مرور وقت طويل: يُعرض تنبيه أن المبلغ سيُعاد (`withdrawal_reversal`).
- إغلاق (`closed`) متجر دون `settled_custody`: محجوب بالسبب.
- حدث Webhook معلّق لمتجر حُذف: «تجاهل» فقط.
- Celery متوقف: الإجراءات غير المتزامنة تُعرض «قيد المعالجة» مع تحذير بعد 60 ثانية بلا تغيير.

## 9. معايير النجاح (Success Criteria)

- **SC-20.1**: من فتح البوابة إلى تحصيل عمولة ≤ 3 نقرات.
- **SC-20.2**: جدول 1,000 متجر يُرسم (50/صفحة) في < 1s مع فلترة في الرابط.
- **SC-20.3**: 100% من الإجراءات الحساسة تمرّ بتأكيد يذكر المتجر والأثر.
- **SC-20.4**: 0 حالات تُعرض فيها حالة ميزة مختلفة عن حساب الخادم.
- **SC-20.5**: 0 تسرب لبيانات متجر إلى مسار متجر آخر (مفاتيح الكاش مفتوحة بـ`schema_name`).

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M02 (حالات التجهيز)، M14 (المستحقات من جهة التاجر)، M15 (مناطق شروة شيب للقراءة)، M19 (`Domain`)، M30 (التطبيقات)، M40 (Sharwa Pay للعميل)، M45/M46 (تُدمَجان هنا كشاشات).
- افتراض: البوابة تُستضاف على النطاق العام (`TENANT_BASE_DOMAIN` بلا subdomain أو `admin.`)؛ `admin` ضمن النطاقات المحجوزة.
- افتراض: مصادقة البوابة هي جلسة Django admin نفسها (superuser) مع CSRF؛ لا نظام مستخدمين جديد.
- افتراض: الصفحات غير المغطاة (CentralCustomerTrust، OTPRequestTracker، محاكي كريمي) تبقى في Django admin مع رابط.
- افتراض: الباك إند سيعرض الكيانات بنفس أسماء الحقول؛ حتى ذلك Mock محلي بنفس العقد.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا بطاقات KPI أربع متماثلة في النظرة العامة — شريط أرقام Mono نصّي؛ لا رسوم بيانية زخرفية؛ الحالات نص دلالي ونقاط صغيرة؛ لا شعارات تطبيقات ملونة كبيرة.
- II: `schema_name`، الهواتف، المعرّفات، المبالغ بخط Mono مع `dir="ltr"` حيث يلزم؛ الجداول تبدأ من اليمين؛ أسهم التنقل تنعكس.
- IV: لقطات `docs/visual-checks/20-admin/` للنظرة العامة، جدول المتاجر، مصفوفة الميزات لمتجر، لوحة المستحقات، طلب شحن Sharwa Pay بإيصال، الداكن.
- VIII: مجموعة `(admin)` بتخطيطها وحالتها المستقلة على النطاق العام؛ لا استيراد من مكونات لوحة التاجر أو المتجر (المشترك في `src/components/ui` و`src/lib` فقط)؛ مفاتيح TanStack Query مفتوحة بـ`platform` + `schema_name`؛ يُمنع تمرير المتجر عبر query string للمستخدم.
