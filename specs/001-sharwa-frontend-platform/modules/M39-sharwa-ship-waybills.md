# M39 — شروة شيب: البوليصات وأحداث الشحن (Sharwa Ship Waybills & Shipment Events)

**Route group**: `(dashboard)` · **Priority**: P3 · **Backend status**: HTML-only `[NEEDS BACKEND]` (`waybill_list_view`, `issue_waybill_view` POST، `shipment_events_view`, `courier_supervisor_view`, `emergency_reassign_view`) + Ready لـ webhook الناقل `POST /api/v1/webhooks/carrier/<carrier_code>/` (يستهلكه الناقل لا الواجهة)
**Discovery refs**: `03-api-payments-shipping-theme-integrations.md` §1 (carrier webhook), §4 (SharwaShipZone, ShipmentOrder, ShipmentEvent, PendingAWBQueue, CarrierRateCardSnapshot) · `02-products-domain-model.md` §6 (آلة الحالات)، §12 (تقارير `shipping`) · `01-tenants-dashboard-admin.md` §4 (الشريط: المجموعة 10 `[sharwa_ship]`) · **Benchmarks**: Shippo (إصدار ملصق من الطلب بخطوة واحدة مع معاينة التكلفة)، Aramex portal (جدول بوليصات بحالة وتحصيل منفصلَين — منظَّف)، Linear (خط زمني للأحداث بمصدر وفاعل)

## 1. الهدف (Purpose)

تمكين التاجر من إصدار بوليصة شروة شيب لطلب بمعاينة الوزن القابل للاحتساب وتكلفة المنطقة قبل الإصدار، ومتابعة كل بوليصة بمحورَين منفصلَين (أين الشحنة؟ وهل حُصِّلت تكلفتها؟)، وقراءة الخط الزمني الكامل للأحداث بما فيها المرفوضة والمتأخرة، مع الإشراف على المندوبين وإعادة الإسناد الطارئة. يُقاس بزمن الإصدار ونسبة الأحداث المرفوضة التي فُهم سببها.

## 2. الفاعلون (Actors)

- **مالك المتجر** بميزة `sharwa_ship` مفعَّلة: يُصدر البوليصات، يعيد الإسناد، يعدّل الحالة يدوياً (`merchant_manual`).
- **موظف** بصلاحية `orders.view`/`orders.update_status`: يرى البوليصات ويطبعها.
- **المندوب**: يولّد أحداث `agent_app` من M38.
- **الناقل الخارجي** (`aramex` · `smsa`): يولّد أحداث `webhook` موقّعة بـ `X-Carrier-Signature`.
- **النظام**: أحداث `system` (طوابير AWB، إعادة المحاولة، تعليق تغيّر التسعيرة).

## 3. قصص المستخدم (User Stories)

### US-39.1 — إصدار بوليصة من طلب (P1)
يفتح التاجر «شروة شيب» فيرى الطلبات بلا بوليصة مع معاينة الوزن (فعلي/حجمي/قابل للاحتساب) ومناطق الشحن النشطة؛ يختار منطقة ويُصدر؛ تظهر البوليصة برقم `SHW-…` وتكلفة المنطقة كلقطة.
**Independent Test**: طلب بعنصرَين وملف تغليف؛ إصدار بوليصة بمنطقة `sanaa_inner_city`؛ التأكد من ظهور `zone_name_snapshot` و`cost_snapshot` و`actual_weight_snapshot`.
**Acceptance**:
1. **Given** طلب بلا `zone_code`, **When** يُضغط إصدار، **Then** يُعرض «يرجى تحديد منطقة الشحن.» تحت الحقل ولا يُرسل.
2. **Given** خطأ خدمة (مثل وزن يتجاوز `max_weight_per_awb` للمندوب)، **Then** يُعرض `detail` الخادم ويُقترح «تقسيم الشحنة» عند توفر خطة التقسيم (`split_fulfillment_into_awbs`).
3. **Given** ميزة `sharwa_ship` معطّلة، **Then** تُعرض حالة «الميزة غير مفعَّلة لمتجرك» بلا جدول.

### US-39.2 — قائمة البوليصات بمحورَين (P1)
جدول كثيف: رقم البوليصة (Mono)، الطلب، العميل، الناقل، المنطقة، التكلفة (لقطة)، الوزن، الحالة (8)، حالة التحصيل (3)، التاريخ؛ فلاتر في الرابط.
**Acceptance**:
1. **Given** بوليصة `delivered` و`billing_status='pending'`, **Then** يظهر العمودان منفصلَين؛ يُمنع دمجهما.
2. **Given** فلتر `status=in_transit&billing=pending`, **When** يُشارك الرابط، **Then** نفس النتيجة.
3. **Given** بوليصة بـ `master_waybill_number`, **Then** تُعرض مجمَّعة تحت البوليصة الرئيسة مع عدّاد الفرعية.

### US-39.3 — الخط الزمني للأحداث (P1)
يفتح التاجر بوليصة فيرى أحداثها مرتبة بـ `event_time` تنازلياً: من→إلى، المصدر، الفاعل، وقت الحدث مقابل وقت الوصول، الموقع الجغرافي إن وُجد، وشارات `مرفوض` · `خارج الترتيب` · `قيد المراجعة`.
**Acceptance**:
1. **Given** حدث `is_rejected` بسبب `stale_event`, **Then** يُعرض بلون `muted` مع سبب مقروء ولا يؤثر على الحالة الحالية.
2. **Given** `event_time` أقدم من `received_at` بأكثر من 5 دقائق، **Then** يُعرض تلميح «مزامنة متأخرة من الجهاز».
3. **Given** `delivered → returned`, **Then** تظهر شارة «ارتداد بعد التسليم — يتطلب مراجعة مالية».

### US-39.4 — طابور AWB ولقطات التسعيرة (P2)
يرى التاجر طلبات إصدار 3PL المعلّقة (`PendingAWBQueue`) بعدد المحاولات وآخر خطأ، ويعيد المحاولة يدوياً؛ ويرى لقطات تسعيرة الناقل لكل منطقة مع انحراف السعر المتوقع عن آخر مؤكَّد.
**Acceptance**:
1. **Given** عنصر `failed`, **When** يُضغط «إعادة المحاولة»، **Then** يتحول إلى `pending` وتُعرض المحاولة الجديدة.
2. **Given** انحراف فوق العتبة، **Then** تُعرض شارة «بانتظار تأكيد التسعيرة» بلون `amber`.

### US-39.5 — إشراف المندوبين وإعادة الإسناد الطارئة (P2)
شاشة المشرف: المندوبون النشطون مع مناوباتهم المفتوحة، الطلبات الجديدة بلا إسناد، آخر 100 حركة `reversed`; وزر «إعادة إسناد طارئة» ينقل كل شحنات مندوب وعهدته إلى آخر.
**Acceptance**:
1. **Given** مندوب بلا مناوبة مفتوحة، **When** تُطلب إعادة الإسناد، **Then** تُنفَّذ على الشحنات وتُعرض رسالة الخادم «أُعيد إسناد كل شحنات «{أ}» إلى «{ب}» (شحنات + عهدة).».
2. **Given** `new_agent_id` غير صالح، **Then** «يرجى اختيار مندوب آخر صالح.».

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-39.01**: الوحدة MUST تُخفى من الشريط عند `features.sharwa_ship=false` وتعرض حالة الميزة المعطّلة عند الوصول المباشر.
- **FR-39.02**: الإصدار MUST يُرسل `{zone_code}` فقط؛ التكلفة والوزن لقطات من الخادم؛ يُمنع إدخال التكلفة يدوياً.
- **FR-39.03**: معاينة الوزن MUST تعرض `actual_weight`, `volumetric_weight` (ط×ع×ا ÷ `volumetric_divisor` 5000 افتراضياً)، `chargeable_weight = max(actual, volumetric)` كما يرسلها الخادم.
- **FR-39.04**: الجدول MUST يعرض `status` و`billing_status` عمودَين دائماً، بألوان دلالية للنقاط فقط.
- **FR-39.05**: الخط الزمني MUST يعرض كل الأحداث بما فيها `is_rejected=true`؛ يُمنع إخفاؤها (سجل تدقيق).
- **FR-39.06**: التعديل اليدوي للحالة MUST يُقيَّد بآلة الحالات (`ALLOWED_TRANSITIONS`) ويُرسل `client_generated_uuid` و`event_time`؛ يُسجَّل بمصدر `merchant_manual`.
- **FR-39.07**: الطباعة MUST تستخدم تخطيط `waybill_print` RTL بحجم A6/A4 عبر `/dashboard/orders/[id]/print` (M06) مع الباركود ورقم البوليصة.
- **FR-39.08**: كل الفلاتر والترقيم MUST تعيش في الرابط.
- **FR-39.09**: إعادة الإسناد الطارئة MUST تطلب تأكيداً يذكر عدد الشحنات ورصيد العهدة المنقول.

## 5. الكيانات والحالات (Key Entities & States)

- **SharwaShipZone** (منصة): `code`, `name`, `price` (تكلفة التاجر/بوليصة)، `currency`, `volumetric_divisor`, `center_latitude/longitude`, `radius_km`, `is_active`, `sort_order`.
- **ShipmentOrder**: `order`, `fulfillment` (1:1)، `waybill_number` (`SHW-<ts>`, فريد)، `carrier_code` (افتراضي `sharwa_ship`)، `zone_name_snapshot`, `cost_snapshot`, `currency`, `actual_weight_snapshot`, `master_waybill_number`, `parent_shipment`, `created_at`, `collected_at`, `delivered_at`. `status`: `label_pending` بانتظار تأكيد الملصق · `pending_pickup` بانتظار الاستلام من التاجر · `picked_up` تم الاستلام · `in_transit` قيد التوصيل · `delivered` تم التسليم · `returned` مُعاد · `cancelled` ملغي · `compensated_lost` شحنة مُعوَّضة. `billing_status`: `pending` · `collected` · `waived`.
- الانتقالات: `label_pending→{pending_pickup, cancelled}` · `pending_pickup→{picked_up, cancelled}` · `picked_up→{in_transit, returned, cancelled}` · `in_transit→{delivered, returned}` · `delivered→{returned}`؛ نهائية: `returned` · `cancelled` · `compensated_lost`.
- **ShipmentEvent**: `event_time`, `received_at`, `from_status`, `to_status`, `source`: `webhook` Webhook شركة شحن · `agent_app` تطبيق المندوب · `merchant_manual` تعديل يدوي من التاجر · `system` نظامي؛ `actor_type`, `actor_id`, `idempotency_key`, `is_rejected`, `rejection_reason` (`invalid_transition` · `stale_event` · `order_already_reversed` · `compensated_lost_scan`)، `out_of_order`, `flagged_for_review`, geo.
- **PendingAWBQueue**: `fulfillment`, `carrier_code`, `status`: `pending` معلّق — سيُعاد المحاولة · `processing` قيد المعالجة · `issued` صدرت · `failed` فشل نهائي؛ `attempts`, `error_detail`.
- **CarrierRateCardSnapshot**: `carrier_code`, `zone_code`, `currency`, `expected_price`, `last_confirmed_price`, `updated_at`.
- **PackagingProfile**: `name`, `box_weight_kg`, `box_length_cm/width/height`, `location?` (تُدار في M15).

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/shipping/sharwa-ship` (تبويبان: «بانتظار الإصدار» و«البوليصات») · `/dashboard/shipping/sharwa-ship/[id]` (تفاصيل + خط زمني + تعديل يدوي + طباعة) · `/dashboard/shipping/sharwa-ship/queue` (طابور AWB) · `/dashboard/shipping/sharwa-ship/rate-cards` · `/dashboard/shipping/supervisor` (الإشراف + إعادة إسناد).
- **الحالات البصرية**: skeleton · فراغ «لا طلبات بانتظار بوليصة» / «لا بوليصات بعد» · خطأ · بلا صلاحية · الميزة معطّلة · طابور فارغ «لا طلبات إصدار معلّقة».
- **الجوال**: الجدول → بطاقات مضغوطة (البوليصة، العميل، نقطتا الحالة/التحصيل)؛ الخط الزمني عمود واحد؛ الإصدار في drawer.
- **اختصارات**: `⌘K` بحث برقم بوليصة · `P` طباعة · `E` تعديل الحالة.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| طلبات بلا بوليصة + معاينة الوزن + المناطق | `waybill_list_view` HTML (`calculate_chargeable_weight`, `split_fulfillment_into_awbs`, `SharwaShipZone.is_active`) | `[NEEDS BACKEND]` → `GET /api/v1/shipping/sharwa-ship/pending-orders/` → `[{order_id, customer_name, fulfillment_id, weight_preview:{actual, volumetric, chargeable}|null, awb_plan_count}]` + `GET /api/v1/shipping/sharwa-ship/zones/` → `[{code, name, display_price, currency}]` |
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

## 8. الحالات الحدّية (Edge Cases)

- طلب بلا `Fulfillment`: معاينة الوزن `null` ويُعرض «—» مع إبقاء الإصدار متاحاً (بوليصة على مستوى الطلب).
- منتج بلا وزن/أبعاد: الحجمي 0 ويُستخدم الفعلي؛ تلميح «أضف أبعاد المنتج لدقة أعلى».
- بوليصة 3PL بـ `label_pending`: تُعرض «بانتظار تأكيد الملصق» مع رابط لطابور AWB.
- حدث webhook لبوليصة غير موجودة: لا يصل للواجهة (الخادم يحوّله لـ `PendingWebhookEvent`).
- `compensated_lost`: كل الأزرار معطّلة مع «حالة نهائية مقفلة».
- تعديل يدوي يحاول انتقالاً غير مسموح: الخيار معطّل مع تلميح، لا إرسال.
- `billing_status='waived'`: يُعرض بلون `muted` مع «مُعفاة».

## 9. معايير النجاح (Success Criteria)

- **SC-39.1**: إصدار بوليصة من قائمة الطلبات ≤ 3 نقرات.
- **SC-39.2**: 0 حالات تُعرض فيها الحالة والتحصيل في عمود واحد.
- **SC-39.3**: 100% من الأحداث المرفوضة ظاهرة في الخط الزمني بسبب مقروء.
- **SC-39.4**: الجدول بـ 50 بوليصة يُرسم في < 1s.
- **SC-39.5**: صفر فلاتر خارج الرابط.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M06 (الطلب والطباعة)، M15 (المندوبون، ملفات التغليف، الناقلون)، M38 (أحداث المندوب)، M22 (المواقع)، M46 (ميزة `sharwa_ship`).
- افتراض: مناطق شروة شيب تُدار من Super Admin فقط (M46/Django admin)؛ هنا قراءة.
- افتراض: التعديل اليدوي للحالة يستخدم نفس خدمة الانتقال بمصدر `merchant_manual`؛ حتى توفر العقد يُعرض زر معطّل.
- افتراض: الباركود المطبوع = `waybill_number` ليطابق مسح M38.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا خريطة بطاقات حالة ملونة؛ شريط أرقام نصّي Mono (بانتظار الاستلام / قيد التوصيل / تم التسليم) قابل للنقر كفلتر. الخط الزمني خط رفيع 1px ونقاط دلالية صغيرة.
- II: أرقام البوليصات والأوزان والتكاليف Mono محاذاة نهاية؛ `SHW-…` داخل `<bdi>`؛ أعمدة الجدول تبدأ من اليمين؛ طباعة RTL.
- IV: لقطات `docs/visual-checks/39-sharwa-ship/` للتبويبَين، الخط الزمني (بحدث مرفوض)، الطباعة، الجوال، الداكن.
- IX: مفاتيح الكاش بمعرّف المستأجر؛ nuqs للفلاتر؛ Zod على الاستجابات.
