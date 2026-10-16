# M45 — لوحة مستحقات المنصة (Platform Dues Console)

**Route group**: `(admin)` · **Priority**: P3 · **Backend status**: HTML-only `[NEEDS BACKEND]` (`platform_dues_dashboard` على `/master-dashboard/dues/`: GET نظرة عامة من public schema، GET `?schema=` تفاصيل متجر، POST 8 إجراءات بـ `action`)
**Discovery refs**: `01-tenants-dashboard-admin.md` §2.3 (dues statuses), §8 (`/master-dashboard/dues/` 8 إجراءات) · `02-products-domain-model.md` §12 (`PlatformCommissionRecord`, `AppBillingCharge`) · `03-api-payments-shipping-theme-integrations.md` §3 (`.collect()` → debit SharwaPay `platform_fee`) · **Benchmarks**: Stripe Billing (فواتير بحالة واحدة واضحة وإجراء لكل صف)، Polar (لوحة مستحقات بسيطة بالعملة)، Linear (إجراءات بتأكيد يذكر الأثر)

## 1. الهدف (Purpose)

تمكين مالك المنصة من رؤية كل مستحقات كل المتاجر (عمولات مبيعات وفواتير تطبيقات) في شاشة واحدة بحساب المنصة، وتحصيلها من محفظة شروة باي للتاجر أو إعفائها أو توليد فاتورة الدورة أو تعليق تطبيق حتى السداد — يدوياً وبقرار صريح لكل صف. يُقاس بزمن تحصيل متجر كامل وبصفر أخطاء «تم التعامل معه مسبقاً».

## 2. الفاعلون (Actors)

- **مالك المنصة (superuser)**: جلسة Django admin على `/sharwa-secure-gate/` في public schema؛ الوحيد المصرَّح.
- **التاجر**: يرى أثر التحصيل كحركة `platform_fee` في محفظته (M40) وحالة التطبيق المعلَّق في M30؛ لا يستطيع رفع التعليق بنفسه.
- **النظام**: `aggregate_tenant_stats` للقطات؛ beat لانتهاء اشتراكات التطبيقات؛ لا تحصيل تلقائي.

## 3. قصص المستخدم (User Stories)

### US-45.1 — النظرة العامة لكل المتاجر (P1)
يفتح المالك اللوحة فيرى صفاً لكل متجر نشط جاهز: الاسم، آخر لقطة (الطلبات، الإيراد ر.س)، أرصدة محفظة شروة باي للتاجر بالعملات الأربع، مرتبة بالإيراد تنازلياً؛ يبحث بالاسم ويفلتر بالفترة.
**Independent Test**: 10 متاجر؛ الصفوف مرتبة تنازلياً بالإيراد؛ متجر بلا لقطة في الأسفل بـ «—».
**Acceptance**:
1. **Given** متجر بلا `merchant_phone` أو بلا محفظة، **Then** تُعرض خانة المحفظة «لا محفظة» بلون `muted`.
2. **Given** فلتر `q=`/`period=`, **Then** يعيش في الرابط.

### US-45.2 — تفاصيل مستحقات متجر (P1)
يضغط المالك متجراً فيرى: عمولات `pending` (رقم الطلب، الباقة وقت البيع، نوع/قيمة العمولة، المبلغ، العملة)، فواتير تطبيقات `pending` (التطبيق، الدورة، السعر)، فواتير «لم تُولَّد بعد» لتثبيتات نشطة مدفوعة، فواتير الدورة المُعفاة، ورصيد المحفظة؛ مع مجاميع لكل عملة.
**Acceptance**:
1. **Given** `has_dues=false`, **Then** تُعرض «لا مستحقات على هذا المتجر» مع رصيد المحفظة.
2. **Given** تثبيت تطبيق `billing_enabled` بلا فاتورة للدورة الحالية، **Then** يظهر في «لم تُولَّد» بزر «توليد فاتورة».

### US-45.3 — الإجراءات الثمانية بتأكيد (P1)
لكل صف إجراء واحد أساسي وآخر ثانوي: عمولة → «تحصيل» / «إعفاء»؛ فاتورة `pending` → «تحصيل» / «إعفاء»؛ فاتورة `waived` → «تراجع عن الإعفاء»؛ تطبيق → «توليد فاتورة»، «تعليق حتى السداد» / «إعادة تفعيل».
**Acceptance**:
1. **Given** «تحصيل عمولة» ورصيد كافٍ، **Then** تُعرض رسالة الخادم «تم تحصيل عمولة الطلب #{id} من محفظة شروة باي للتاجر.» ويتحول الصف إلى `collected`.
2. **Given** رصيد غير كافٍ، **Then** «تعذّر التحصيل: {error}» ويبقى `pending`.
3. **Given** سجل حُسم من تبويب آخر، **Then** «سجل العمولة غير موجود أو تم التعامل معه مسبقاً.» مع تحديث القائمة.
4. **Given** «تعليق التطبيق»، **Then** حوار تأكيد يذكر: اسم التطبيق، المتجر، «لا يقدر التاجر رفع التعليق بنفسه».
5. **Given** «تراجع عن الإعفاء»، **Then** تعود الفاتورة `pending` برسالة الخادم ويظهر زر «تحصيل».

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-45.01**: الوحدة MUST تعمل في مجموعة `(admin)` على أصل المنصة فقط ولا تُحمَّل في أي تخطيط آخر.
- **FR-45.02**: النظرة العامة MUST تُقرأ من public schema فقط (لقطات + محافظ) بعدد استعلامات ثابت؛ التفاصيل تُحمَّل لمتجر واحد عند الطلب (`?schema=`).
- **FR-45.03**: كل إجراء MUST يُرسل `{action, schema, record_id | app_code}` فقط بالقيم: `collect_commission` · `waive_commission` · `collect_charge` · `waive_charge` · `unwaive_charge` · `generate_charge` · `suspend_app` · `reactivate_app`.
- **FR-45.04**: الواجهة MUST تعرض رسائل الخادم حرفياً (نجاح/تحذير/خطأ) عبر Sonner وتُحدّث الصف لا الصفحة.
- **FR-45.05**: المجاميع لكل عملة MUST تأتي من الخادم كنصوص؛ يُمنع الجمع المحلي أو التحويل بين العملات.
- **FR-45.06**: الإجراءات ذات الأثر المالي أو التعليق MUST تطلب تأكيداً يذكر الأثر؛ الإعفاء يذكر «بلا أي خصم».
- **FR-45.07**: الفلاتر (`q`, `schema`, `period`, `status`) MUST تعيش في الرابط.
- **FR-45.08**: `generate_charge` MUST يُعطَّل عندما توجد فاتورة لنفس `(installation, period_label)` مع تلميح (القيد الفريد).
- **FR-45.09**: الصفحة MUST تعرض `period_label` بصيغة الخادم (`YYYY-MM` للشهري، `YYYY` للسنوي).

## 5. الكيانات والحالات (Key Entities & States)

- **PlatformCommissionRecord** (tenant): `order` (1:1)، `plan_name_snapshot`, `commission_type` (`none` · `percentage` · `fixed`)، `commission_value`, `amount`, `currency`, `status`: `pending` مستحقة · `collected` محصَّلة · `waived` مُعفاة؛ `created_at`, `collected_at`, `notes`.
- **AppBillingCharge** (tenant): `installation` (StoreAppInstallation)، `app_name_snapshot`, `period_label`, `price_snapshot`, `currency`, `status`: `pending` · `collected` · `waived`؛ `collected_at`, `notes`. فريد `(installation, period_label)`.
- **StoreAppInstallation**: `app_code`, `is_active`, `suspended_by_platform`, `subscription_expires_at`; **AppInstallationEvent**: `suspended_by_platform` · `reactivated_by_platform` …
- **SharwaPayWallet** للتاجر (`customer_phone = merchant_phone`): الخصم بسبب `platform_fee`.
- **DuesOverviewRow**: `tenant{name, schema_name, merchant_phone}`, `snapshot{date, orders_count, revenue_sar}|null`, `wallet{balances}|null`.
- **TenantDuesEntry**: `pending_commissions[]`, `pending_charges[]`, `uninvoiced:[{installation, app, period_label}]`, `waived_charges[]`, `has_dues`, `wallet`, `snapshot`.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/master-dashboard/dues` (جدول المتاجر + بحث + فترة) · `/master-dashboard/dues?schema=<schema>` (تفاصيل: 4 أقسام مطوية بعدّادات، مجاميع بالعملة، رصيد المحفظة) · حوارات تأكيد الإجراءات.
- **الحالات البصرية**: skeleton · فراغ «لا متاجر جاهزة» / «لا مستحقات» · خطأ · 401/403 → تسجيل دخول الإدمن · «متجر غير معروف أو غير جاهز.» عند `schema` خاطئ · إجراء قيد التنفيذ (زر معطّل مع مؤشر).
- **الجوال**: الجدول → قائمة (المتجر، الإيراد، المحفظة)؛ التفاصيل أقسام عمودية؛ أزرار الإجراء 44px.
- **اختصارات**: `⌘K` بحث متجر بالاسم/المخطط · `C` تحصيل الصف المحدد (مع تأكيد).

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| النظرة العامة | `platform_dues_dashboard` GET → `overview:[{tenant, snapshot, wallet}]` (مرتبة بالإيراد) | `[NEEDS BACKEND]` → `GET /api/v1/admin/dues/overview/?q&period` → `[{schema_name, name, merchant_phone, snapshot:{date, orders_count, display_revenue_sar}|null, wallet:[{currency, display_balance}]|null}]` |
| تفاصيل متجر | GET `?schema=` → `entry{pending_commissions, pending_charges, uninvoiced, waived_charges, has_dues, wallet, snapshot}` | `[NEEDS BACKEND]` → `GET /api/v1/admin/dues/<schema>/` → `{pending_commissions:[{id, order_id, plan_name_snapshot, commission_type, commission_value, display_amount, currency, created_at}], pending_charges:[{id, app_code, app_name_snapshot, period_label, display_price, currency, created_at}], uninvoiced:[{installation_id, app_code, app_name, period_label}], waived_charges:[{id, app_name_snapshot, period_label, display_price}], totals:[{currency, display_commissions, display_charges}], wallet, has_dues}` |
| الإجراءات (8) | POST `{action, schema, record_id|app_code}` + Django messages | `[NEEDS BACKEND]` → `POST /api/v1/admin/dues/<schema>/actions/` `{action, record_id?, app_code?}` → 200 `{detail, level: success|warning|error, record?}`؛ 409 «تم التعامل معه مسبقاً»؛ 400 «تعذّر التحصيل: …» |
| مصادقة الإدمن | جلسة Django admin `/sharwa-secure-gate/` | `[NEEDS BACKEND]` → عقد جلسة إدارية لـ `/api/v1/admin/*` (يُوحَّد مع M20/M46) |

## 8. الحالات الحدّية (Edge Cases)

- `schema=public` أو متجر غير جاهز: يُرفض من الخادم؛ الواجهة تعرض الرسالة وتعود للنظرة العامة.
- عمولة بعملة غير `SAR` ومحفظة التاجر برصيد `SAR` فقط: التحصيل يفشل بعملة العمولة؛ تُعرض رسالة الخادم بلا اقتراح تحويل.
- `commission_type='none'` بسجل `amount=0`: يُعرض بـ «إعفاء» فقط.
- تثبيت تطبيق انتهى اشتراكه (`subscription_expires_at` ماضٍ): لا يظهر في «لم تُولَّد»؛ تلميح.
- تعليق تطبيق معلَّق أصلاً: الزر يتحول إلى «إعادة تفعيل».
- حذف متجر أثناء العرض: 404 → رسالة وعودة للقائمة.

## 9. معايير النجاح (Success Criteria)

- **SC-45.1**: تحصيل كل مستحقات متجر بـ 5 سجلات ≤ 90 ثانية.
- **SC-45.2**: 0 إجراءات تُرسل بلا تأكيد عندما يكون لها أثر مالي أو تعليق.
- **SC-45.3**: 100% من رسائل الخادم تُعرض حرفياً.
- **SC-45.4**: النظرة العامة بـ 200 متجر تُرسم في < 1s.
- **SC-45.5**: 0 عمليات جمع عملات في المتصفح.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M20 (قشرة `(admin)` والمصادقة)، M46 (الباقات والتطبيقات)، M40 (أثر `platform_fee`)، M30 (تعليق التطبيقات في لوحة التاجر).
- افتراض: المصادقة الإدارية تبقى جلسة Django admin حتى يُعرَّف عقد `/api/v1/admin/*`؛ تُبنى الواجهة على Mock بنفس العقد.
- افتراض: لا تحصيل تلقائي؛ كل إجراء يدوي بنقرة واحدة لكل سجل (لا إجراءات جماعية في الإصدار الأول).
- افتراض: `commission_enabled` و`subscriptions_enabled` قد يكونان `False`؛ اللوحة تعمل مع السجلات القائمة بغض النظر.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا بطاقات «إجمالي المستحقات» ملونة؛ مجاميع نصّية Mono لكل عملة. أزرار الإجراء نصّية بلون دلالي (تحصيل = foreground، إعفاء = muted، تعليق = red نص).
- II: أرقام الطلبات والمبالغ والمخططات Mono؛ `period_label` و`schema_name` داخل `<bdi>` LTR؛ الأعمدة تبدأ من اليمين.
- IV: لقطات `docs/visual-checks/45-dues/{desktop,tablet,mobile,desktop-dark}.png` للنظرة العامة والتفاصيل وحوار تأكيد.
- VIII: المجموعة `(admin)` معزولة بتخطيطها وحالتها؛ لا استيراد من مكونات لوحة التاجر؛ مفاتيح الكاش مفتوحة بـ `schema_name` المستهدف.
