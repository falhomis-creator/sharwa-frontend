# M46 — إدارة الباقات والاشتراكات وأعلام الميزات (Plans, Subscriptions & Feature Flags Admin)

**Route group**: `(admin)` · **Priority**: P3 · **Backend status**: Absent كـ API — Django admin فقط `[NEEDS BACKEND]` (`billing` admin: Plan + PlanFeature inline، Subscription، PlatformBillingSettings، Feature، TenantFeatureOverride؛ `appstore` admin: App، AppBillingOverride؛ `ClientAdmin` إجراء «إدارة ميزات المتاجر المحددة»)
**Discovery refs**: `01-tenants-dashboard-admin.md` §2.2 (billing models + feature-gate order), §2.3 (App, AppBillingOverride), §7 (39 feature keys), §8 (admin actions) · `02-products-domain-model.md` §1 (`CURRENCY_CHOICES`) · **Benchmarks**: Stripe products/prices (باقة = كائن واحد بسعر وفترة واضحَين)، LaunchDarkly flags (مفتاح عالمي + استثناءات مستهدفة — بلا رسوم)، Linear settings (جداول مصفوفة كثيفة بمفاتيح تبديل صغيرة)

## 1. الهدف (Purpose)

تمكين مالك المنصة من إدارة نموذج العمل من مكان واحد: الباقات وأسعارها وحدودها، مصفوفة الميزات لكل باقة عبر 39 مفتاحاً، مفتاح الإيقاف الطارئ لكل ميزة، الاستثناءات لكل متجر (بالجملة)، اشتراكات المتاجر، كتالوج التطبيقات واستثناءات تسعيرها، والمفتاحَين الرئيسيَّن — مع فهم واضح لترتيب حسم «هل الميزة متاحة لهذا المتجر؟». يُقاس بزمن تعطيل ميزة معطوبة لكل المنصة (هدف ≤ 10 ثوانٍ) وبصفر تضارب في تفسير الحسم.

## 2. الفاعلون (Actors)

- **مالك المنصة (superuser)**: الوحيد المصرَّح؛ جلسة Django admin على public schema.
- **التاجر**: يرى أثر القرارات في شريطه الجانبي (إخفاء العناصر `[feature]`) وفي M01 (الأسعار)؛ لا وصول هنا.
- **النظام**: يُسند الباقة الافتراضية عند التسجيل فقط إذا `subscriptions_enabled=true`; `Subscription.assign_plan` يُنهي الاشتراك الحالي ويُنشئ جديداً.

## 3. قصص المستخدم (User Stories)

### US-46.1 — الباقات ومصفوفة الميزات (P1)
يرى المالك الباقات جدولاً (الكود، الاسم، السعر، العملة، الفترة، العمولة، حد المنتجات، حد الطلبات/شهر، افتراضية مجانية، نشطة، الترتيب) ويحرّر باقة في sheet جانبي؛ ثم مصفوفة «الباقات × 39 ميزة» بمفاتيح تبديل.
**Independent Test**: إنشاء باقة `pro` شهرية، تفعيل 5 ميزات، وتعيينها افتراضية مجانية → رفض لأن `is_free=false`.
**Acceptance**:
1. **Given** محاولة تعيين `is_default_free` لباقة غير مجانية، **Then** يُمنع محلياً برسالة تحت الحقل.
2. **Given** ميزة `requires_plan=false`, **Then** تُعرض في المصفوفة بصف `muted` وتلميح «متاحة لكل الباقات — لا أثر للمفاتيح».
3. **Given** تبديل خلية في المصفوفة، **Then** يُحفظ فوراً (`PlanFeature.is_enabled`) مع تراجع عند الخطأ.

### US-46.2 — الميزات والإيقاف الطارئ (P1)
جدول الميزات مجمَّع بـ `module_group`: الكود، الاسم، `is_active_globally`, `requires_plan`, وعدد الاستثناءات.
**Acceptance**:
1. **Given** تعطيل `is_active_globally` لميزة، **Then** حوار تأكيد «سيُوقف لكل التجار فوراً إلا من له استثناء صريح» ثم تنفيذ.
2. **Given** تفعيل `requires_plan`, **Then** تحذير «ستُحجَب عن المتاجر بلا صف PlanFeature صريح عند تفعيل الباقات».

### US-46.3 — استثناءات المتاجر بالجملة (P1)
يختار المالك متاجر متعددة وميزة ويضبط `is_enabled` مع ملاحظة؛ يرى جدول الاستثناءات القائمة ويحذف منها.
**Acceptance**:
1. **Given** 5 متاجر وميزة `sharwa_ship` بـ `is_enabled=true`, **Then** تُنشأ/تُحدَّث 5 صفوف ويُعرض ملخص «5 استثناءات».
2. **Given** استثناء قائم، **Then** يُعرض في صف المتجر مع «يفوز على الإيقاف العالمي والباقة».

### US-46.4 — الاشتراكات والمفاتيح الرئيسية (P2)
جدول الاشتراكات (المتجر، الباقة، الحالة، الحالي، البداية، نهاية الفترة) مع «تغيير الباقة» (`assign_plan`); وشاشة المفاتيح `subscriptions_enabled` / `commission_enabled` مع شرح ترتيب الحسم.
**Acceptance**:
1. **Given** تغيير باقة متجر، **Then** يُنهى الاشتراك الحالي (`is_current=false`) ويُنشأ جديد؛ السجل التاريخي يبقى ظاهراً.
2. **Given** `subscriptions_enabled=false`, **Then** تُعرض ملاحظة ثابتة «الباقات غير مفعَّلة — كل الميزات ذات `requires_plan` تُعتبر متاحة» في أعلى المصفوفة.

### US-46.5 — كتالوج التطبيقات واستثناءات التسعير (P2)
جدول التطبيقات (الكود، الاسم، مُدرَج، مجاني، السعر، العملة، الفترة `monthly|yearly`, الفوترة مفعَّلة) + استثناءات `AppBillingOverride` (التطبيق، المتجر، `is_billed`, ملاحظة).
**Acceptance**:
1. **Given** استثناء مكرر لنفس (تطبيق، متجر)، **Then** يُمنع محلياً (قيد فريد) ويُقترح تعديل القائم.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-46.01**: الوحدة MUST تعمل في `(admin)` على أصل المنصة فقط.
- **FR-46.02**: حقول الباقة MUST تقتصر على: `code`, `name`, `description`, `is_free`, `price`, `currency` (`SAR` · `USD` · `YER_OLD` · `YER_NEW`)، `billing_interval` (`monthly` · `yearly` · `lifetime`)، `commission_type` (`none` · `percentage` · `fixed`)، `commission_value`, `max_products`, `max_orders_per_month`, `is_active`, `is_default_free`, `display_order`.
- **FR-46.03**: المصفوفة MUST تعرض 39 مفتاحاً ثابتاً مجمَّعة بمجموعات الشريط الجانبي؛ يُمنع إضافة مفاتيح من الواجهة (الكتالوج من الباك إند).
- **FR-46.04**: شاشة الحسم MUST تعرض الترتيب نصّاً مرقَّماً: (1) `TenantFeatureOverride` → (2) `is_active_globally=false` ⇒ لا → (3) `requires_plan=false` ⇒ نعم → (4) `subscriptions_enabled=false` ⇒ نعم → (5) `PlanFeature.is_enabled` للباقة الحالية (الغياب = لا).
- **FR-46.05**: أداة «افحص متجراً» MUST تعرض لميزة ومتجر محددَين أي خطوة حسمت النتيجة (من الخادم).
- **FR-46.06**: تغيير المفاتيح الرئيسية MUST يطلب تأكيداً يذكر الأثر («لا يؤثر بأثر رجعي على المتاجر المسجَّلة»).
- **FR-46.07**: الأسعار MUST تُعرض من `display_price` الخادم بخط Mono؛ الإدخال رقمي خام يُرسل كما هو.
- **FR-46.08**: كل القوائم MUST تدعم البحث والفلاتر في الرابط.

## 5. الكيانات والحالات (Key Entities & States)

- **Plan**: الحقول في FR-46.02؛ `is_default_free` واحدة فقط فعلياً.
- **PlanFeature**: `plan`, `feature`, `is_enabled`.
- **Feature**: `code`, `name`, `description`, `module_group`, `is_active_globally` (افتراضي True — kill switch)، `requires_plan` (افتراضي False).
- **TenantFeatureOverride**: `feature`, `client`, `is_enabled`, `notes`.
- **Subscription**: `client`, `plan`, `status`: `active` نشط · `cancelled` ملغي · `expired` منتهٍ؛ `is_current`, `started_at`, `current_period_end`, `cancelled_at`, `notes`.
- **PlatformBillingSettings** (pk=1): `subscriptions_enabled`, `commission_enabled` (كلاهما False افتراضياً).
- **App**: `code`, `name`, `description`, `icon`, `is_listed`, `is_free`, `price`, `currency`, `billing_interval` (`monthly` · `yearly`)، `billing_enabled`. **AppBillingOverride**: `app`, `client`, `is_billed`, `notes` (فريد لكل زوج).
- **مفاتيح الميزات (39)** بمجموعات الشريط: الطلبات `refunds` · المنتجات `inventory`, `bulk_upload`, `multi_location`, `product_report` · التسويق `marketing`, `coupon`, `abandoned_carts`, `tracking_tools`, `influencers`, `promotions`, `campaigns`, `timeline`, `affiliates`, `loyalty_settings`, `gift_settings` · الحجوزات `bookings` · المتجر `storefront_design`, `contact_info`, `store_policies` · القنوات `social_channels`, `marketplaces`, `dropshipping` · العملاء `customer_report`, `customer_wallets` · الموظفون `staff_rbac` · التقارير `reports` · الشحن `shipping_settings`, `pickuplocation`, `shipping_companies`, `shipping_providers`, `sharwa_ship` · الدفع `payment_gateways`, `local_wallets`, `bank_transfers` · الأدوات `currency_settings`, `seo_settings` · المحفظة `merchantwallet` · التطبيقات `app_marketplace`.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/master-dashboard/plans` (جدول + sheet تحرير) · `/master-dashboard/plans/matrix` (الباقات × الميزات) · `/master-dashboard/features` (الميزات بالمجموعات + kill switch) · `/master-dashboard/features/overrides` (استثناءات + محرّر جماعي) · `/master-dashboard/subscriptions` · `/master-dashboard/billing-settings` (المفاتيح + شرح الحسم + «افحص متجراً») · `/master-dashboard/apps` (+ `overrides`).
- **الحالات البصرية**: skeleton · فراغ «لا باقات — أنشئ الباقة المجانية الافتراضية أولاً» · خطأ · 401/403 → دخول الإدمن · تأكيد الإجراءات الحساسة · حفظ متفائل مع تراجع.
- **الجوال**: المصفوفة تتمرر أفقياً داخل حاويتها بعمود الميزة ثابت؛ الباقي قوائم.
- **اختصارات**: `⌘K` → «أوقف ميزة…» (مع تأكيد) · «افحص متجراً».

## 7. عقد البيانات (Data Contract)

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

## 8. الحالات الحدّية (Edge Cases)

- باقتان بـ `is_default_free=true`: الخادم مرجع؛ الواجهة تحذّر وتعرض أيهما ستُسنَد.
- حذف باقة لها اشتراكات حالية: يُمنع مع عدد الاشتراكات وزر «نقل إلى باقة أخرى».
- تعطيل ميزة عالمياً مع استثناءات `is_enabled=true`: تُعرض قائمة المتاجر التي ستبقى تعمل.
- `requires_plan=true` بلا أي `PlanFeature`: تحذير «ستُحجَب عن الجميع عند تفعيل الباقات».
- تطبيق `is_free=true` مع `billing_enabled=true`: تلميح تعارض؛ لا منع (قرار الباك إند).
- ميزة في الباك إند غير موجودة في قائمة الـ 39: تُعرض في مجموعة «أخرى» لا تُخفى.

## 9. معايير النجاح (Success Criteria)

- **SC-46.1**: تعطيل ميزة لكل المنصة ≤ 10 ثوانٍ (⌘K → تأكيد).
- **SC-46.2**: «افحص متجراً» يطابق نتيجة الخادم 100%.
- **SC-46.3**: المصفوفة 39 × 5 باقات تُرسم في < 500ms وتبديل الخلية يُحفظ في < 300ms.
- **SC-46.4**: 0 حقول في النماذج خارج حقول الـ Models.
- **SC-46.5**: إسناد باقة لمتجر ≤ 3 نقرات.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M20 (قشرة `(admin)` والمصادقة وقائمة المتاجر)، M45 (العمولات والتطبيقات)، M01 (الأسعار العامة)، M03 (أثر الميزات في الشريط).
- افتراض: المصادقة الإدارية عبر جلسة Django admin حتى يُعرَّف عقد `/api/v1/admin/*`؛ الواجهة تُبنى على Mock بنفس العقد.
- افتراض: كتالوج الميزات (39) يُقرأ من الخادم؛ القائمة في §5 مرجع للفحص لا مصدر إنشاء.
- افتراض: الحسم يُنفَّذ في الخادم فقط؛ الواجهة تشرحه وتستعرضه ولا تعيد حسابه.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: المصفوفة جدول كثيف بمفاتيح تبديل صغيرة محايدة؛ لا بطاقات باقات بتدرج أو «الأكثر شيوعاً». الحالة بنقطة دلالية صغيرة ونص.
- II: الأكواد (`code`, `schema_name`) داخل `<bdi>` LTR بخط Mono؛ الأسعار Mono محاذاة نهاية؛ عمود الميزة الثابت في المصفوفة في الجهة المنطقية البداية.
- IV: لقطات `docs/visual-checks/46-plans/{desktop,tablet,mobile,desktop-dark}.png` للجدول والمصفوفة وشاشة الحسم وحوار الإيقاف الطارئ.
- VIII: مجموعة `(admin)` معزولة؛ لا استيراد من مكونات لوحة التاجر؛ مفاتيح الكاش بـ `schema_name` عند الفحص والاستثناءات.
