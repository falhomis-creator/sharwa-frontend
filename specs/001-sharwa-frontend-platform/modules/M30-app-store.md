# M30 — متجر التطبيقات (App Store)

**Route group**: `(dashboard)` · **Priority**: P3 · **Backend status**: HTML-only `[NEEDS BACKEND]` (`app_marketplace`, `whatsapp_app_*`, `sharwa_ai_*`)
**Discovery refs**: `01-tenants-dashboard-admin.md` §2.3 (App, AppBillingOverride, StoreAppInstallation, AppUsageLog, AppInstallationEvent, AppTemplate, AppBillingCharge), §3.2 (Apps), §4 («متجر التطبيقات»), §7 (ميزة `app_marketplace`), §8 (beat: expired app subscriptions; dues console suspend/reactivate app) · `02-products-domain-model.md` §14.E (أنواع أحداث AppUsageLog), §12 (`WhatsAppMessageCostLog`, `AppBillingCharge`) · `03-*.md` §6 (`/dashboard/apps/whatsapp/*`, SharwaConnect webhook) · **Benchmarks**: Zid Apps (قائمة تطبيقات بسيطة بحالة التثبيت)، Shopify App Store (صفحة التطبيق: الوصف، السعر، تثبيت — بنسخة مقتضبة بلا تقييمات ولا شارات ترويجية)

## 1. الهدف (Purpose)

تمكين التاجر من اكتشاف تطبيقات المنصة (الواتساب عبر SharwaConnect، شروة AI)، تثبيتها وتفعيلها/تعطيلها، ومراقبة استخدامها وقوالبها وحالة اشتراكها ورسومها في مكان واحد. يُقاس بنسبة التثبيتات النشطة وبوضوح سبب أي تعليق.

## 2. الفاعلون (Actors)

- **مالك المتجر**: يثبّت، يفعّل/يعطّل، يحرّر القوالب، يراجع سجل الاستخدام والرسوم.
- **المنصة (Super Admin)**: تُعلّق/تُعيد تفعيل التطبيق للمتجر (`suspended_by_platform`) وتُدير الرسوم (M45).
- **النظام**: يسجّل `AppUsageLog` لكل رسالة/حدث، ويُنهي الاشتراكات المنتهية.

## 3. قصص المستخدم (User Stories)

### US-30.1 — كتالوج التطبيقات والتثبيت (P1)
يرى التاجر التطبيقات المدرجة (`is_listed`) باسمها ووصفها وسعرها (أو «مجاني») وحالة التثبيت، ويفتح صفحة التطبيق ليثبّته.
**Independent Test**: تطبيق غير مثبَّت → زر «تثبيت»؛ بعد التثبيت تظهر حالة «مفعّل» وزر «افتح».
**Acceptance**:
1. **Given** الكتالوج، **When** يُفتح، **Then** يُعرض كل تطبيق كصفّ/بطاقة بحجم مختلف حسب المحتوى (اسم، سطر وصف، السعر `display_*` + `billing_interval` أو «مجاني»، الحالة).
2. **Given** تطبيق مدفوع و`billing_enabled`, **When** يُضغط «تثبيت»، **Then** تُعرض معاينة الرسوم ودورة الفوترة من الخادم قبل التأكيد.
3. **Given** تثبيت نجح، **Then** يظهر `AppInstallationEvent(installed)` في سجل التطبيق ورابط لوحته.

### US-30.2 — حالة التثبيت والتحكم (P1)
يرى التاجر في صفحة التطبيق المثبَّت: `is_active`، `suspended_by_platform`، `subscription_expires_at`، ويفعّل/يعطّل.
**Acceptance**:
1. **Given** `suspended_by_platform=true`, **Then** شريط «معلَّق من المنصة» مع السبب إن أُرجع، وأزرار التفعيل معطَّلة مع تلميح «تواصل مع الدعم».
2. **Given** `subscription_expires_at` خلال 7 أيام، **Then** تنبيه هادئ بالتاريخ المنسَّق `Intl` بلا عدّ تنازلي صاخب.
3. **Given** `is_active=true`, **When** يُضغط «تعطيل»، **Then** تأكيد يوضّح الأثر (توقف الرسائل الآلية) ثم `deactivated`.

### US-30.3 — لوحة تطبيق الواتساب (P1)
يفتح التاجر لوحة الواتساب: فتح SharwaConnect (ربط الجهاز)، سجل الاستخدام بالحالات الست وأنواع الأحداث، وتحرير القوالب.
**Independent Test**: فلتر `status=failed` يعرض الرسائل الفاشلة بسبب الخادم؛ القالب المحرَّر يُحفظ ويُعاين بمتغيراته.
**Acceptance**:
1. **Given** سجل الاستخدام، **When** يُفتح، **Then** جدول: الوقت، نوع الحدث بالعربية، المستلم (هاتف Mono)، الحالة (نقطة + نص)، رقم الطلب إن وُجد.
2. **Given** قالب `order_new`, **When** يُحرَّر، **Then** تُعرض المتغيرات المتاحة كشارات قابلة للإدراج ومعاينة نصية بقيم مثال من الخادم.
3. **Given** زر «افتح SharwaConnect», **Then** يُفتح في تبويب جديد بالرابط الذي يرسله الخادم.

### US-30.4 — رسوم التطبيقات (P2)
يرى التاجر رسوم التطبيقات (`AppBillingCharge`) بحالتها للقراءة فقط.
**Acceptance**:
1. **Given** رسوم `pending`, **Then** تُعرض بالمبلغ `display_*` والفترة والحالة؛ لا زر دفع (الجمع من المنصة).

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-30.01**: الوحدة MUST تُخفى حين تكون ميزة `app_marketplace` معطّلة.
- **FR-30.02**: الكتالوج MUST يعرض التطبيقات `is_listed` فقط، بتخطيط غير متماثل (لا شبكة بطاقات متساوية)، بلا تقييمات أو شارات «الأكثر شيوعاً».
- **FR-30.03**: صفحة التطبيق MUST تعرض الحالات الثلاث (`is_active`, `suspended_by_platform`, `subscription_expires_at`) نصياً مع أزرار مقيَّدة بها؛ التعليق من المنصة يعطّل كل التحكم.
- **FR-30.04**: سجل `AppInstallationEvent` MUST يُعرض كجدول زمني نصي (7 أنواع أحداث بتسميات عربية ثابتة).
- **FR-30.05**: سجل الاستخدام MUST يدعم ترقيماً خادمياً وفلاتر `status` و`event_type` ونطاق تاريخ، بحالة في الرابط.
- **FR-30.06**: تحرير القوالب MUST يحافظ على المتغيرات بصيغتها الخادمية ويمنع حذف الإلزامية محلياً مع إعادة التحقق على الخادم.
- **FR-30.07**: الأسعار والرسوم MUST تُعرض من `display_*` الخادم؛ لا حساب دورة فوترة محلياً.
- **FR-30.08**: لوحة شروة AI MUST تُحال إلى M31؛ هذه الوحدة تعرض فقط حالة التثبيت ورابط «افتح».

## 5. الكيانات والحالات (Key Entities & States)

- **App** (كتالوج المنصة): `code` (`whatsapp` الواتساب · `sharwa_ai` شروة AI), `name`, `description`, `icon`, `is_listed`, `is_free`, `price`, `currency`, `billing_interval` `monthly` شهري · `yearly` سنوي, `billing_enabled`.
- **StoreAppInstallation**: `app_code`, `is_active` مفعّل/معطّل, `suspended_by_platform` معلَّق من المنصة, `subscription_expires_at`.
- **AppInstallationEvent.event**: `installed` تثبيت · `activated` تفعيل · `deactivated` تعطيل · `subscription_renewed` تجديد · `subscription_expired` انتهاء · `suspended_by_platform` تعليق · `reactivated_by_platform` إعادة تفعيل.
- **AppUsageLog**: `event_type` `order_new` طلب جديد · `order_shipping_update` تحديث شحن · `payment_confirmed` تأكيد دفع · `abandoned_cart_reminder` تذكير سلة · `otp` رمز تحقق · `manual` يدوي؛ `status` `queued` · `sent` · `delivered` · `read` · `failed` · `skipped`.
- **AppTemplate**: قالب رسالة لكل نوع حدث بمتغيراته. **AppBillingCharge.status**: `pending` · `collected` · `waived`.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/apps` (الكتالوج) · `/dashboard/apps/[code]` (صفحة التطبيق: الوصف، السعر، الحالة، الأحداث، الرسوم) · `/dashboard/apps/whatsapp/dashboard` (SharwaConnect، ملخص نصي للاستخدام) · `/dashboard/apps/whatsapp/usage` · `/dashboard/apps/whatsapp/templates` + `/templates/[id]` · `/dashboard/apps/sharwa-ai` → M31.
- **الحالات البصرية**: skeleton · فراغ «لا تطبيقات مدرجة حالياً» / «لا استخدام بعد» · خطأ · الميزة معطّلة · معلَّق من المنصة (شريط ثابت) · اشتراك منتهٍ (شريط + زر «تجديد» إن أتاحه الخادم).
- **الجوال**: الكتالوج عمود واحد؛ سجل الاستخدام بطاقات مضغوطة؛ محرّر القالب ملء الشاشة.
- **اختصارات**: `⌘K` → «تطبيق: الواتساب».

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| كتالوج التطبيقات + حالة التثبيت | `app_marketplace` HTML | `[NEEDS BACKEND]` → `GET /api/v1/apps/` → `[{code, name, description, icon, is_free, display_price, billing_interval, billing_enabled, installation:{is_active, suspended_by_platform, subscription_expires_at}\|null}]` |
| تثبيت / تفعيل / تعطيل | `app_marketplace` POST | `[NEEDS BACKEND]` → `POST /api/v1/apps/<code>/install/`, `POST /activate/`, `POST /deactivate/` → `{installation}` |
| أحداث التثبيت | — | `[NEEDS BACKEND]` → `GET /api/v1/apps/<code>/events/` → `[{event, created_at, note}]` |
| سجل استخدام الواتساب | `whatsapp_app_*` HTML | `[NEEDS BACKEND]` → `GET /api/v1/apps/whatsapp/usage/?status&event_type&from&to&page` → `{count, results:[{id, event_type, recipient_phone, status, order_id, error, created_at}]}` |
| قوالب الواتساب | `whatsapp_app_*` HTML | `[NEEDS BACKEND]` → `GET /api/v1/apps/whatsapp/templates/`, `PATCH /<id>/` `{body}` → `{…, variables:[], preview}` |
| رابط SharwaConnect | `whatsapp_app_*` | `[NEEDS BACKEND]` → `GET /api/v1/apps/whatsapp/connect-url/` → `{url, connected}` |
| رسوم التطبيق | `AppBillingCharge` (admin dues) | `[NEEDS BACKEND]` → `GET /api/v1/apps/<code>/charges/` → `[{period_start, period_end, display_amount, status}]` |

## 8. الحالات الحدّية (Edge Cases)

- تطبيق مُثبَّت ثم أُزيل من الإدراج (`is_listed=false`): يبقى ظاهراً في «المثبَّتة» مع شارة «لم يعد متاحاً للتثبيت».
- انتهاء الاشتراك أثناء الاستخدام: `subscription_expired` في السجل وشريط في اللوحة؛ الرسائل تُسجَّل `skipped` بسبب الخادم.
- SharwaConnect غير مربوط: زر «افتح SharwaConnect» بارز وسجل الاستخدام يعرض `failed` مع سبب الربط.
- قالب بلا متغير إلزامي: يُرفض محلياً برسالة تحت المحرّر.
- `billing_enabled=false` على المنصة: يُعرض «مجاني الآن» بدل السعر.

## 9. معايير النجاح (Success Criteria)

- **SC-30.1**: تثبيت تطبيق ≤ 3 نقرات؛ فهم سبب التعليق من الشاشة الأولى بلا تواصل مع الدعم في 100% من حالات `suspended_by_platform`.
- **SC-30.2**: تشخيص رسالة واتساب فاشلة (سبب + طلب) ≤ 2 نقرات.
- **SC-30.3**: تحرير قالب ومعاينته ≤ 60 ثانية.
- **SC-30.4**: 0 مخالفات للمبدأ I في الكتالوج (لا شبكة بطاقات متماثلة، لا شارات ترويجية).

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M03 (الشريط)، M31 (لوحة شروة AI)، M45 (رسوم المنصة)، M06 (رابط الطلب في السجل)، M13 (تذكيرات السلة تستخدم الواتساب).
- افتراض: أيقونة التطبيق (`icon`) تُعرض بحجم 20px أحادية اللون أو تُستبدل بالحرف الأول داخل مربع بحد 1px.
- افتراض: متغيرات القوالب ومعاينتها تأتي من الخادم؛ الواجهة لا تملك قائمة ثابتة.
- افتراض: التجديد اليدوي للاشتراك غير متاح في الواجهة حتى يوفّره الخادم؛ يُعرض الوضع فقط.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا شبكة بطاقات متساوية بأيقونات في دوائر ملونة؛ تخطيط Bento بحجمَين على الأكثر؛ لا شارات «جديد/الأكثر شيوعاً» ولا نجوم تقييم؛ الحالات نص + نقطة.
- II: الهواتف والأسعار والتواريخ Mono؛ التواريخ `Intl.DateTimeFormat('ar')`؛ متغيرات القوالب اللاتينية (`{order_number}`) داخل `dir="ltr"` معزولة في نص عربي.
- IV: لقطات `docs/visual-checks/30-app-store/{desktop,tablet,mobile,desktop-dark}.png` للكتالوج، صفحة تطبيق معلَّق، وسجل استخدام الواتساب.
