# M19 — النطاقات وأدوات التتبع والـ Webhooks والتكاملات (Domains, Webhooks & Integrations)

**Route group**: `(dashboard)` · **Priority**: P2 · **Backend status**: النطاقات **Absent** للتاجر (`Domain` admin-only) `[NEEDS BACKEND]` · أدوات التتبع HTML-only `[NEEDS BACKEND]` · Webhooks الصادرة **Absent** `[NEEDS BACKEND]` · حالة التكاملات الواردة HTML-only (تُجمَّع من M27–M31)
**Discovery refs**: `01-tenants-dashboard-admin.md` §1 (Domain, `TENANT_BASE_DOMAIN`, reserved subdomains), §2.1, §9 (Gaps) · `02-products-domain-model.md` §11 (`custom_domain`, TrackingSettings) · `03-api-payments-shipping-theme-integrations.md` §2 (tenant resolution), §6 (Integrations: pixels, inbound/outbound webhooks) · **Benchmarks**: Vercel Domains (سجلات DNS للنسخ، حالات التحقق الواضحة)، Stripe Webhooks (نقاط نهاية + أحداث مختارة + سجل تسليم بإعادة الإرسال + سرّ يُعرض مرة)، Shopify Pixels (معرّفات بسيطة مع حالة تفعيل)

## 1. الهدف (Purpose)

إعطاء التاجر مكاناً واحداً لربط نطاقه الخاص بتعليمات DNS وحالة تحقق صريحة، وإدخال معرّفات التتبع الإعلاني بأمان، والاشتراك في أحداث متجره عبر Webhooks صادرة لأنظمته الخاصة، ورؤية حالة كل تكامل وارد (واتساب، Sharwa AI، القنوات، الأسواق، الموردون) بنظرة واحدة. يُقاس بنسبة المتاجر على نطاق مخصص نشط وبنسبة تسليم الـ Webhooks الناجحة.

## 2. الفاعلون (Actors)

- **مالك المتجر**: النطاقات، التتبع (الميزة `tracking_tools`)، Webhooks، نظرة التكاملات.
- **موظف** بـ`channels.inbox.access` / `channels.marketplaces.manage` / `channels.dropshipping.manage`: يرى حالة التكاملات المرتبطة بصلاحياته فقط، لا النطاقات ولا التتبع ولا Webhooks.
- **مالك المنصة (M20)**: يُدير صفوف `Domain` اليوم؛ يبقى قادراً على التدخل.
- **النظام**: يتحقق من DNS دورياً، يُسلِّم الـ Webhooks ويُعيد المحاولة.

## 3. قصص المستخدم (User Stories)

### US-19.1 — ربط نطاق مخصص (P1)
يُدخل التاجر نطاقه (`shop.example.com` أو `example.com`)، يرى سجلات DNS المطلوبة للنسخ، ويتابع حالة التحقق حتى يصير النطاق أساسياً.
**Independent Test**: إدخال نطاق صالح → تظهر تعليمات DNS بخط Mono وأزرار نسخ؛ الحالة تبدأ `pending_dns` وتتحدث كل 30 ثانية حتى `active`.
**Acceptance**:
1. **Given** صفحة النطاقات، **Then** يُعرض النطاق الفرعي الحالي `<subdomain>.<TENANT_BASE_DOMAIN>` بشارة «أساسي» وللقراءة، وقائمة النطاقات المخصصة.
2. **Given** إدخال نطاق، **When** يُرسل، **Then** يُتحقق محلياً من الصيغة (أحرف لاتينية، نقاط، بلا بروتوكول أو مسار) ويُرفض أي نطاق تحت `TENANT_BASE_DOMAIN`.
3. **Given** نطاق مضاف، **Then** تُعرض السجلات المطلوبة (نوع، اسم، قيمة) كما يرسلها الخادم، كل قيمة بزر نسخ، وزر «تحقّق الآن».
4. **Given** نطاق `active`, **When** يُختار «اجعله أساسياً»، **Then** يُطلب تأكيد «سيُحوَّل العميل من النطاق الفرعي إلى النطاق الجديد» ويُحدَّث `is_primary`.
5. **Given** نطاق `failed`, **Then** يُعرض سبب الفشل من الخادم وخطوة الإصلاح المقترحة.

### US-19.2 — أدوات التتبع (P1)
يُفعِّل التاجر التتبع ويُدخل معرّفات Meta وTikTok وSnapchat وGTM وGA4 وGoogle Ads، ورموز CAPI مقنَّعة.
**Acceptance**:
1. **Given** النموذج، **Then** الحقول: `is_tracking_enabled`, `meta_pixel_id`, `tiktok_pixel_id`, `snapchat_pixel_id`, `gtm_container_id`, `ga4_measurement_id`, `google_ads_conversion_id`, `google_ads_conversion_label`, `meta_conversions_api_token`, `tiktok_events_api_token`.
2. **Given** الرمزان `*_api_token`, **Then** مقنَّعان وللكتابة فقط («اتركه فارغاً للإبقاء»)، ولا يُعادان في أي استجابة.
3. **Given** معرّف بصيغة غير متوقعة (مثل `G-` لـ GA4، `GTM-` لـ GTM، `AW-` لـ Google Ads)، **Then** تحذير محلي «الصيغة غير معتادة» بلا منع.
4. **Given** `is_tracking_enabled=false`, **Then** الحقول تبقى قابلة للتحرير مع شارة «معطّل — لن تُحمَّل أي سكربتات في المتجر».

### US-19.3 — Webhooks الصادرة (P2)
يُضيف التاجر نقطة نهاية (URL) ويختار الأحداث، يستلم السرّ مرة واحدة، ويرى سجل التسليم مع إعادة الإرسال.
**Acceptance**:
1. **Given** إضافة نقطة نهاية، **Then** `url` (https فقط)، `events[]` من قائمة يرسلها الخادم، `is_active`، ووصف اختياري.
2. **Given** الإنشاء، **Then** يُعرض `secret` مرة واحدة مع زر نسخ وتحذير «لن يُعرض مجدداً»؛ لاحقاً يتاح «تدوير السرّ» فقط.
3. **Given** سجل التسليم، **Then** جدول: الحدث، الوقت، رمز الاستجابة (Mono)، المدة، المحاولة n، و«إعادة الإرسال» للفاشلة.
4. **Given** زر «إرسال حدث تجريبي»، **Then** يُرسل حمولة اختبار وتُعرض النتيجة.

### US-19.4 — نظرة التكاملات (P2)
يرى التاجر حالة كل تكامل وارد في قائمة واحدة مع رابط إدارته.
**Acceptance**:
1. **Given** الصفحة، **Then** صفوف: واتساب (SharwaConnect) · Sharwa AI · Meta · TikTok · Telegram · Amazon · noon · موردو الدروبشيبينغ (`cj` · `makhazen` · `knawat` · `flat_feed`) · ناقلو الشحن (`aramex` · `smsa`)؛ لكل صف الحالة (مربوط/غير مربوط/خطأ)، آخر حدث وارد، ورابط إلى وحدته (M30/M31/M27/M28/M29/M15).
2. **Given** تكامل بلا صلاحية للمستخدم الحالي، **Then** الصف مخفي.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-19.01**: النطاق MUST يُتحقق محلياً من صيغته، ويُمنع النطاق المحجوز أو تحت `TENANT_BASE_DOMAIN`؛ رسائل الخادم تُعرض تحت الحقل.
- **FR-19.02**: حالة النطاق MUST تُستطلع (poll) كل 30 ثانية أثناء `pending_dns`/`verifying` فقط، وتتوقف عند `active`/`failed`.
- **FR-19.03**: تعليمات DNS MUST تأتي من الخادم (قد تختلف بين الجذر والفرعي)؛ لا تُخترع قيم في الواجهة.
- **FR-19.04**: الرموز السرّية (CAPI، Webhook secret) MUST لا تُعرض بعد الحفظ/الإنشاء؛ الواجهة تقرأ `has_*`/قناعاً فقط.
- **FR-19.05**: الواجهة MUST لا تُحمِّل أي سكربت تتبع داخل لوحة التاجر؛ التحميل في المتجر (M09) حسب `is_tracking_enabled`.
- **FR-19.06**: قائمة أحداث الـ Webhook MUST تُقرأ من الخادم؛ يُقترح الحد الأدنى: `order.created` · `order.status_changed` · `order.fulfillment_changed` · `order.refunded` · `shipment.event` · `product.updated` · `inventory.low_stock`.
- **FR-19.07**: سجل التسليم MUST يدعم فلاتر الحالة والحدث والنطاق الزمني في الرابط وترقيماً خادمياً.
- **FR-19.08**: نظرة التكاملات MUST تُجمِّع حالات القراءة من وحداتها بلا منطق خاص؛ عند غياب عقد لوحدة تُعرض «غير متاح» لا خطأ.
- **FR-19.09**: الوحدة MUST تُخفي أدوات التتبع حين `tracking_tools` معطّلة؛ النطاقات والـ Webhooks للمالك فقط.

## 5. الكيانات والحالات (Key Entities & States)

- **Domain** (موجود، admin-only): `domain`, `tenant`, `is_primary`. **StoreSetting.custom_domain** (حقل نصي قديم؛ مرجعي). حالات التحقق المقترحة للعقد الجديد: `pending_dns` بانتظار DNS · `verifying` جارٍ التحقق · `active` نشط · `failed` فشل.
- **TrackingSettings** (مفرد): الحقول العشرة في US-19.2؛ حالات العرض: معطّل · مفعّل بلا معرّفات · مفعّل.
- **WebhookEndpoint** (مقترح): `id`, `url`, `events[]`, `is_active`, `description`, `has_secret`, `created_at`, `last_delivery_at`, `failure_count`.
- **WebhookDelivery** (مقترح): `event`, `status` `pending` · `delivered` · `failed`, `response_code`, `duration_ms`, `attempt`, `created_at`.
- **IntegrationStatus** (تجميعي، قراءة): `code`, `name`, `status` `connected` · `disconnected` · `error`, `last_event_at`, `manage_href`.
- انتقالات النطاق: `pending_dns → verifying → active|failed`؛ `failed → verifying` عند «تحقّق الآن».

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/settings/domains` (النطاق الفرعي + قائمة المخصصة + sheet الإضافة بتعليمات DNS) · `/dashboard/marketing/tracking` (أدوات التتبع؛ يبقى تحت التسويق كما في الشريط الجانبي) · `/dashboard/settings/webhooks` + `/[id]` (الأحداث + السرّ + سجل التسليم) · `/dashboard/settings/integrations` (النظرة التجميعية).
- **الحالات البصرية**: skeleton · فراغ («لا نطاق مخصص — متجرك يعمل على النطاق الفرعي» / «لا نقاط نهاية بعد») · خطأ · بلا صلاحية · الميزة معطّلة · `[NEEDS BACKEND]` حتى توفر العقد: تُعرض الشاشة بـ Mock محلي وشارة «قيد التكامل» غير قابلة للنشر.
- **الجوال**: سجلات DNS كقائمة عمودية (نوع/اسم/قيمة) بأزرار نسخ كبيرة؛ سجل التسليم → بطاقات؛ النماذج صفحة كاملة.
- **اختصارات**: `⌘K` → «ربط نطاق» / «Webhooks» / «أدوات التتبع» · `C` نسخ القيمة المحددة في جدول DNS.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| النطاق الفرعي الحالي | `Domain(is_primary)` + `TENANT_BASE_DOMAIN` | `[NEEDS BACKEND]` → `GET /api/v1/domains/` → `{base_domain, results:[{id, domain, is_primary, kind: subdomain|custom, status, dns_records:[{type,name,value}], failure_reason?, verified_at?}]}` |
| إضافة نطاق مخصص | Absent (admin-only) | `[NEEDS BACKEND]` → `POST /api/v1/domains/` `{domain}` → 201 بالكيان وحالة `pending_dns` |
| تحقّق / أساسي / حذف | Absent | `[NEEDS BACKEND]` → `POST /api/v1/domains/<id>/verify/`, `POST /<id>/set-primary/`, `DELETE /<id>/` (الأساسي لا يُحذف) |
| أدوات التتبع | `tracking_tools` HTML (`TrackingSettingsForm`) | `[NEEDS BACKEND]` → `GET/PATCH /api/v1/store/tracking/` → الحقول العشرة مع `has_meta_conversions_api_token`, `has_tiktok_events_api_token` بدل القيم |
| قائمة أحداث Webhook | Absent | `[NEEDS BACKEND]` → `GET /api/v1/webhooks/events/` → `[{code, name, description}]` |
| نقاط النهاية CRUD | Absent | `[NEEDS BACKEND]` → `GET/POST /api/v1/webhooks/endpoints/` (POST يُعيد `secret` مرة)، `PATCH/DELETE /<id>/`, `POST /<id>/rotate-secret/`, `POST /<id>/test/` |
| سجل التسليم | Absent | `[NEEDS BACKEND]` → `GET /api/v1/webhooks/endpoints/<id>/deliveries/?status&event&from&to&page`, `POST /deliveries/<did>/redeliver/` |
| حالة التكاملات | متفرقة في M27–M31 HTML | `[NEEDS BACKEND]` → `GET /api/v1/integrations/status/` → `[{code, name, status, last_event_at, manage_href}]`؛ حتى توفره تُجمَّع من عقود الوحدات حين تتوفر |

## 8. الحالات الحدّية (Edge Cases)

- نطاق مضاف على متجر آخر في المنصة: الخادم يرفض؛ تُعرض «هذا النطاق مرتبط بمتجر آخر».
- التاجر يحذف النطاق المخصص الأساسي: الحذف محجوب؛ يُطلب جعل آخر أساسياً أولاً.
- DNS صحيح لكن الشهادة لم تُصدر بعد: حالة `verifying` مع نص «جارٍ إصدار الشهادة».
- `is_tracking_enabled=true` بلا أي معرّف: تحذير «لن يعمل التتبع بلا معرّف واحد على الأقل».
- نقطة نهاية ترد بـ 5xx 10 مرات متتالية: الخادم يُعطِّلها؛ تُعرض شارة «معطّلة تلقائياً» مع «إعادة التفعيل».
- سرّ الـ Webhook ضاع: لا استرجاع؛ «تدوير السرّ» فقط مع تحذير أثره على النظام الخارجي.

## 9. معايير النجاح (Success Criteria)

- **SC-19.1**: من إدخال النطاق إلى رؤية تعليمات DNS ≤ 10 ثوانٍ.
- **SC-19.2**: 100% من حالات النطاق تُعرض بنص مقروء وخطوة تالية.
- **SC-19.3**: 0 رموز سرّية في أي استجابة أو DOM بعد الحفظ.
- **SC-19.4**: 0 سكربتات تتبع محمَّلة داخل لوحة التاجر (فحص شبكة آلي).
- **SC-19.5**: إعادة إرسال Webhook فاشل ≤ 2 نقرات مع نتيجة ظاهرة خلال 5 ثوانٍ.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M03، M09 (تحميل البكسلات في المتجر)، M15 (ناقلو الشحن)، M27/M28/M29/M30/M31 (حالات التكاملات)، M20 (إدارة `Domain` من المنصة)، M34 (بقية الإعدادات).
- افتراض: حالات النطاق (`pending_dns` · `verifying` · `active` · `failed`) وكيانات الـ Webhook هي عقد مقترح من الواجهة؛ تُعدَّل لتطابق ما يُنفَّذ في الخادم.
- افتراض: الخادم هو من يُصدر الشهادات ويفحص DNS؛ الواجهة تعرض فقط.
- افتراض: أدوات التتبع تبقى تحت مسار التسويق ليتطابق مع الشريط الجانبي الحالي، مع رابط من صفحة التكاملات.
- افتراض: `StoreSetting.custom_domain` القديم لا يُعرض؛ المصدر هو `Domain`.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا شعارات منصات إعلانية ملونة كبيرة — أسماء نصية وحالة دلالية؛ لا بطاقات تكاملات متماثلة بل قائمة صفوف كثيفة؛ تعليمات DNS جدول نظيف بخط Mono.
- II: النطاقات والمعرّفات وقيم DNS ورموز الاستجابة بخط Mono مع `dir="ltr"` داخل التخطيط RTL؛ أزرار النسخ في جهة النهاية.
- IV: لقطات `docs/visual-checks/19-domains/` للنطاقات (تعليمات DNS، حالة `active`)، أدوات التتبع مقنَّعة، نقطة نهاية مع سجل تسليم، نظرة التكاملات، الجوال، الداكن.
