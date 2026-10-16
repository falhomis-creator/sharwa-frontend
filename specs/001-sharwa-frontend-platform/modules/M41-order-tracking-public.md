# M41 — صفحة تتبّع الطلب العامة (Public Order Tracking Page)

**Route group**: `(storefront)/[store]` · **Priority**: P2 · **Backend status**: HTML-only `[NEEDS BACKEND]` (`order_status_public` → `GET /orders/track/<uuid:public_uuid>/` يعيد HTML؛ لا JSON) · `/api/v1/config/` Ready (رقم واتساب المتجر)
**Discovery refs**: `03-api-payments-shipping-theme-integrations.md` §1 (الفجوة: order tracking غير موجود في `/api/v1`؛ `/orders/track/<uuid>/` HTML `storefront.py:644`), §4 (`ShipmentOrder` 8 حالات، `ShipmentEvent`) · `02-products-domain-model.md` §3 (`Order.status`, `public_uuid`, `fulfillment_status`, rollup display), §6 (آلة حالات الشحنة), §8 (`Fulfillment` 7 حالات، `PickupCode`), §3 (`ShippingProvider.phone_number`), §11 (`StoreSetting.whatsapp_number`, `return_policy`) · **Benchmarks**: Shopify Order Status (مسار عمودي واحد، آخر حدث أولاً، بلا تسجيل دخول)، Noon Tracking (تقسيم الطلب إلى شحنات مستقلة بوضوح)، Apple Order Status (هدوء بصري وأرقام كبيرة)

## 1. الهدف (Purpose)

إجابة سؤال العميل الوحيد «أين طلبي؟» في شاشة واحدة بلا تسجيل دخول، عبر رابط `public_uuid` الذي وصله بالواتساب، بما يقلّل رسائل «وين الطلب» على التاجر. يُقاس بنسبة الزيارات التي لا تتبعها رسالة دعم خلال 24 ساعة، وبزمن الفهم (أول حالة مقروءة فوق الطيّ).

## 2. الفاعلون (Actors)

- **العميل**: يفتح الرابط من الجوال غالباً؛ لا حساب (الهاتف + OTP فقط في المتجر).
- **مستلم الهدية** (`is_gift`): يرى حالة التسليم دون بيانات المشتري المالية.
- **التاجر**: يرسل الرابط من M06 ويريد أن تمثّل الصفحة متجره (ثيم المتجر).
- **النظام**: يحدّث الحالات من المندوب (`agent_app`)، شركات الشحن (`webhook`)، والتاجر (`merchant_manual`).

## 3. قصص المستخدم (User Stories)

### US-41.1 — حالة الطلب فوق الطيّ (P1)
يفتح العميل الرابط فيرى في الشاشة الأولى: رقم الطلب (Mono)، الحالة المالية بالعربية، حالة التنفيذ التي عرّفها التاجر (اسم + نقطة بلونه)، وجملة تلخيص واحدة («قيد التوصيل — 1 من 2 شحنات وصلت»).
**Independent Test**: فتح 7 طلبات وهمية بكل قيمة `Order.status` على 390px؛ الحالة مقروءة بلا تمرير.
**Acceptance**:
1. **Given** طلب `status=new` و`fulfillment_status={name:'قيد التجهيز', color:'#3b82f6'}`، **Then** يُعرض الاسم مع نقطة بلون التاجر، والحالة المالية «جديد» كنص `muted`.
2. **Given** `status=awaiting_payment` أو `payment_review`، **Then** تُعرض ملاحظة «بانتظار تأكيد الدفع» مع المبلغ المطلوب كما أرسله الخادم (`display_total`).
3. **Given** `status=cancelled|refunded`، **Then** يُعرض المسار منتهياً بحالة ملغي/مسترد ولا تظهر خطوات شحن مستقبلية.

### US-41.2 — تقدّم كل شحنة على حدة (P1)
لطلب بعناصر من موقعَين يرى العميل بطاقة لكل `Fulfillment` تحتوي: العناصر (اسم، متغير، كمية، صورة صغيرة)، حالة التنفيذ (7)، وإن وُجدت شحنة: رقم البوليصة (Mono)، شركة الشحن، حالة الشحنة (8)، وجدول أحداثها مرتباً من الأحدث.
**Acceptance**:
1. **Given** شحنة `in_transit` بثلاثة أحداث، **Then** يُعرض مسار عمودي من 5 خطوات (`pending_pickup → picked_up → in_transit → delivered`) بالخطوات المنجزة مصمتة والحالية بنبضة خفيفة (150ms، تحترم `prefers-reduced-motion`)، والأحداث تحت المسار بوقتها عبر `Intl.DateTimeFormat('ar')`.
2. **Given** شحنة `returned` أو `compensated_lost`، **Then** يُعرض المسار منتهياً بتلك الحالة بنص دلالي (`amber`/`red`) وجملة الشرح من الخادم.
3. **Given** `fulfillment.status=forwarded_to_supplier`، **Then** يُعرض «يُجهَّز من المورد» بلا تفاصيل المورد.
4. **Given** `ShipmentEvent.source`, **Then** لا يُعرض المصدر ولا `is_rejected`/`out_of_order`/`flagged_for_review` ولا الإحداثيات للعميل.

### US-41.3 — الاستلام من الفرع ورمز الاستلام (P1)
لطلب بطريقة استلام (`pickup_location`) أو تنفيذ `ready_for_pickup`: يرى العميل اسم نقطة الاستلام وعنوانها وهاتفها، و`PickupCode` كبيراً بخط Mono مع زر «نسخ».
**Acceptance**:
1. **Given** `ready_for_pickup`، **Then** يُعرض الرمز بحجم 32px Mono وتلميح «أظهر هذا الرمز عند الاستلام»؛ وبعد `delivered` يُخفى الرمز.

### US-41.4 — التواصل والإرجاع (P2)
أسفل الصفحة: زر «تواصل مع المتجر عبر واتساب» (رقم المتجر من `/api/v1/config/` برسالة مُعبَّأة برقم الطلب)، وزر «اتصل بالمندوب» حين تكون الشحنة `picked_up|in_transit` ولها `ShippingProvider.phone_number`، ورابط «طلب إرجاع» يفتح واتساب برسالة مُعبَّأة ورابط سياسة الاسترجاع.
**Acceptance**:
1. **Given** شحنة `delivered`، **Then** يُخفى زر المندوب ويبقى زر المتجر و«طلب إرجاع».
2. **Given** `whatsapp_number` فارغ، **Then** يُخفى الزر بلا فراغ في التخطيط.

### US-41.5 — رابط غير صالح أو منتهٍ (P2)
فتح UUID غير موجود يعرض صفحة «لم نجد هذا الطلب» مع زر «العودة إلى المتجر»، بلا تسريب هل الـ UUID موجود في متجر آخر.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-41.01**: الصفحة MUST تُعرض بلا مصادقة عبر `public_uuid` فقط، ضمن ثيم المتجر (رموز `(storefront)` من `/api/v1/config/`).
- **FR-41.02**: المحورَان MUST يُعرضا منفصلَين: الحالة المالية (`Order.status` بالعربية) وحالة التنفيذ (اسم ولون التاجر)؛ يُمنع دمجهما.
- **FR-41.03**: المسار الزمني MUST يُبنى من ثلاث طبقات بالترتيب: `Order.status` → `Fulfillment.status` لكل تنفيذ → `ShipmentOrder.status` + `ShipmentEvent` لكل شحنة.
- **FR-41.04**: الصفحة MUST لا تعرض أي بيانات لم يُدخلها العميل بنفسه: الاسم كما أُدخل، الهاتف مُقنَّعاً (آخر 3 أرقام)، العنوان النصّي كما أُدخل؛ يُمنع عرض `fraud_score`, `created_by_staff`, `source_location` الداخلي, `cost_price`, الإحداثيات، أو هاتف المشتري لمستلم الهدية.
- **FR-41.05**: لطلب `is_gift` MUST تُعرض نسخة المستلم (اسم المستلم، رسالة الهدية، الحالة) وتُخفى الفاتورة والمبالغ.
- **FR-41.06**: المبالغ (`display_total`, `display_amount_on_delivery`, `display_deposit_amount`) MUST تُعرض كما أرسلها الخادم Mono.
- **FR-41.07**: الصفحة MUST تُحدَّث تلقائياً كل 60 ثانية أثناء الشحنة النشطة (`picked_up|in_transit`) وتتوقف عند الحالات النهائية.
- **FR-41.08**: روابط واتساب MUST تُبنى بـ `https://wa.me/<number>?text=` بنص يحمل رقم الطلب فقط، لا الهاتف ولا العنوان.
- **FR-41.09**: الصفحة MUST تحقق LCP ≤ 2.5s على 4G، بلا صور كبيرة (صور العناصر 48px عبر `next/image`).
- **FR-41.10**: الصفحة MUST تحمل `noindex` ولا تُدرج في خريطة الموقع.
- **FR-41.11**: زر «نسخ رمز الاستلام» MUST يعمل بلوحة المفاتيح ويعلن النسخ عبر `aria-live`.

## 5. الكيانات والحالات (Key Entities & States)

- **Order (عام)**: `public_uuid`, رقم الطلب, `status` ∈ `pending_payment` قيد تنفيذ الدفع · `new` جديد · `awaiting_payment` بانتظار تأكيد الدفع · `payment_review` يتطلب مراجعة دفع · `completed` مكتمل · `cancelled` ملغي · `refunded` مسترد; `payment_status`, `fulfillment_status{name, color}`, `delivery_method_name`, `pickup_location`, `is_gift`, `recipient_name`, `gift_message`, `created_at`, `display_*`. تلخيص الخادم: «مكتمل بالكامل» / «قيد التنفيذ الجزئي (n من m شحنات وصلت)» / «قيد التنفيذ».
- **Fulfillment**: `status` ∈ `pending` بانتظار التجهيز · `preparing` قيد التجهيز · `ready_for_pickup` جاهز للاستلام · `shipped` تم الشحن · `delivered` تم التسليم · `forwarded_to_supplier` أُحيل للمورد · `cancelled` ملغي; عناصر `{product_name, variant_label, quantity, image}`; `pickup_code?`.
- **ShipmentOrder**: `waybill_number` (Mono), `carrier_code`, `status` ∈ `label_pending` بانتظار تأكيد الملصق · `pending_pickup` بانتظار الاستلام من التاجر · `picked_up` تم الاستلام · `in_transit` قيد التوصيل · `delivered` تم التسليم · `returned` مُعاد · `cancelled` ملغي · `compensated_lost` شحنة مُعوَّضة. المسار المعروض: `pending_pickup → picked_up → in_transit → delivered`؛ `label_pending` يُدمج في الخطوة الأولى؛ النهائيات غير السعيدة تُعرض كخاتمة.
- **ShipmentEvent (عام)**: `to_status`, `event_time` فقط (بلا `source`/geo/أعلام).
- **Courier contact**: `{name, phone}` من `ShippingProvider` حين الشحنة نشطة.
- **StoreConfig** (Ready): `store_name`, `logo`, `whatsapp_number`, رموز الثيم.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/[store]/orders/track/[public_uuid]` (صفحة واحدة): رأس المتجر المختصر (شعار + اسم) · ملخص الحالة · بطاقات التنفيذ/الشحنات · الاستلام ورمزه · العناصر · ملخص المبالغ (مخفي للهدية) · التواصل والإرجاع · تذييل بسياسة الاسترجاع.
- **الحالات البصرية**: skeleton (رأس + مسار + صفَّان) · غير موجود (404 نصّي) · خطأ شبكة مع إعادة المحاولة · طلب ملغي/مسترد (مسار منتهٍ) · بلا شحنة بعد («سنُشعرك عند الشحن»).
- **الجوال**: عمود واحد؛ رمز الاستلام ثابت أسفل الشاشة حين `ready_for_pickup`؛ أزرار التواصل بعرض كامل ≥ 44px.
- **اختصارات**: لا شيء (صفحة عامة)؛ `Tab` يمر على الأزرار الثلاثة بترتيب منطقي.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| بيانات التتبع | `GET /orders/track/<public_uuid>/` HTML | `[NEEDS BACKEND]` → `GET /api/v1/orders/track/<public_uuid>/` (بلا مصادقة، throttle anon) → `{order_number, created_at, status, status_label, payment_status, fulfillment_status:{name, color}, rollup_label, display_total, display_amount_on_delivery, display_deposit_amount, delivery_method_name, is_gift, recipient_name, gift_message, customer_name, customer_phone_masked, address_text, pickup_location:{name, address, phone}?, items:[{product_name, variant_label, quantity, image}], fulfillments:[{id, status, items:[…], pickup_code?, shipment:{waybill_number, carrier_code, status, status_label, courier:{name, phone}?, events:[{to_status, event_time}]}?}], return_policy_excerpt}` → 404 `{detail}` |
| هوية المتجر وواتساب | `GET /api/v1/config/` → `store_name, logo, whatsapp_number, primary_color…` | Ready |
| طلب إرجاع من العميل | لا شيء | `[NEEDS BACKEND]` (لاحق) → `POST /api/v1/orders/track/<public_uuid>/return-intent/` `{items:[{fulfillment_item_id, quantity}], reason}`؛ حتى توفره: رابط واتساب مُعبَّأ |
| تحديث حيّ | لا شيء | استطلاع `GET` كل 60 ثانية (لا WebSocket في الإصدار الأول) |

## 8. الحالات الحدّية (Edge Cases)

- طلب قديم بلا `Fulfillment` ولا `ShipmentOrder` (قبل الهيكل الجديد): يُعرض المحوران فقط مع `tracking_number`/`shipping_provider` القديمَين إن وُجدا.
- طلب بعملة غير عملة المتجر: المبالغ كما أرسلها الخادم بعملتها؛ لا تحويل.
- شحنة `label_pending` فقط: الخطوة الأولى «يُجهَّز للشحن» بلا رقم بوليصة.
- أحداث `out_of_order=true` (وصلت بترتيب خاطئ): الخادم يرسلها مرتبة؛ الواجهة تعرض ترتيب الخادم ولا تعيد الترتيب.
- عنصر منتجه حُذف: يُعرض من اللقطة (`product_name`, `product_image_snapshot`).
- الصفحة مفتوحة من متجر آخر (host مختلف): 404 موحَّد بلا تمييز.
- `Retry-After` 503 (المتجر قيد التجهيز): صفحة انتظار M47.

## 9. معايير النجاح (Success Criteria)

- **SC-41.1**: LCP ≤ 2.0s على 4G للجوال؛ CLS ≤ 0.05.
- **SC-41.2**: 0 حقول داخلية/حساسة في استجابة أو شاشة التتبع (مراجعة قائمة FR-41.04).
- **SC-41.3**: في اختبار 5 مستخدمين، 5/5 يحددون حالة الطلب الحالية خلال ≤ 5 ثوانٍ بلا تمرير.
- **SC-41.4**: 0 تمرير أفقي على 320–1920px؛ تباين AA لنص الحالة بلون التاجر (يُستبدل بـ `foreground` إن فشل التباين).
- **SC-41.5**: صفحة الهدية لا تعرض أي مبلغ في 100% من الحالات.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M09 (تخطيط المتجر والثيم)، M06 (مصدر الرابط)، M39 (أحداث الشحن)، M24 (مسار الإرجاع)، M44 (إشعارات push اختيارية لاحقاً)، M47 (503).
- افتراض: الخادم يعيد الملخّص `rollup_label` وتسميات الحالات بالعربية؛ الواجهة تحتفظ بخريطة احتياطية للحالات الثابتة فقط.
- افتراض: تقنيع الهاتف يُنفَّذ خادمياً (`customer_phone_masked`)؛ الواجهة لا تستلم الهاتف الكامل.
- افتراض: طلب الإرجاع من العميل عبر واتساب حتى توفر endpoint؛ لا نموذج مزيَّف.
- افتراض: لون التاجر لحالة التنفيذ يُستخدم للنقطة فقط، والنص بـ `foreground` لضمان التباين.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا رسم توضيحي لشاحنة/صندوق، لا خريطة ديكورية، لا شريط تقدم بتدرج؛ مسار عمودي بنقاط وخط 1px. لون التاجر نقطة فقط. لا إيموجي في الحالات.
- II: رقم الطلب والبوليصة ورمز الاستلام والمبالغ Mono؛ المسار العمودي نقاطه في جهة البداية (`ps-`)؛ التواريخ `Intl.DateTimeFormat('ar')`؛ أيقونة «العودة للمتجر» تنعكس.
- IV: لقطات `docs/visual-checks/41-tracking/` لحالات: جديد، قيد التوصيل بشحنتَين، جاهز للاستلام (رمز)، ملغي، هدية، 404؛ جوال + داكن.
- IX: مفاتيح الكاش `[tenant, 'track', public_uuid]` مع `refetchInterval` شرطي؛ `next/image` للصور؛ Zod على الاستجابة؛ `noindex`.
