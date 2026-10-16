# M15 — إعدادات الشحن والمناطق والمندوبين (Shipping Zones & Couriers)

**Route group**: `(dashboard)` · **Priority**: P2 · **Backend status**: HTML-only لكل الإعدادات `[NEEDS BACKEND]`؛ webhook الناقل `POST /api/v1/webhooks/carrier/<code>/` Ready (وارد للخادم)
**Discovery refs**: `02-products-domain-model.md` §3 (PickupLocation, DeliveryMethod, ShippingProvider), §6 (Shipping & Logistics, Zones, Carriers), §11 (`default_delivery_fee`, `free_shipping_threshold`) · `03-api-payments-shipping-theme-integrations.md` §1 (carrier webhook), §4 (SharwaShipZone, carriers, webhook secrets) · `01-tenants-dashboard-admin.md` §3.2 (Shipping/Settings views), §4 (الشحن والتوصيل) · **Benchmarks**: Shopify Shipping (طرق التوصيل والأسعار، ملفات التغليف، نقاط الاستلام)، Zid (ربط شركات الشحن المحلية بحقول اعتماد واضحة وحالة ربط)

## 1. الهدف (Purpose)

تمكين التاجر من ضبط كل ما يسبق إصدار الشحنة: رسوم وطرق التوصيل، نقاط الاستلام، المندوبون وشركات الشحن وحدودهم، ربط الناقلين الخارجيين، ملفات التغليف، مراجعة المناطق والنطاقات المحظورة وقواعد SLA، ومعالجة الحالات الحدّية (تحديث عنوان أثناء النقل، التحويل إلى استلام). يُقاس بنسبة الشحنات التي تصدر بلا تدخل يدوي وبزمن ضبط الشحن لأول مرة.

## 2. الفاعلون (Actors)

- **مالك المتجر**: كل الشاشات (الميزات `shipping_settings` · `pickuplocation` · `shipping_companies` · `shipping_providers` · `sharwa_ship`).
- **موظف** بصلاحية `orders.update_status`: الحالات الحدّية فقط (تحديث العنوان/التحويل إلى استلام).
- **المندوب** (M38): يستلم أثر هذه الإعدادات (الحدود، المناطق) ولا يحررها.
- **النظام/الناقل**: يرسل أحداث التتبع عبر webhook؛ المنصة تُدير مناطق Sharwa Ship (M20).

## 3. قصص المستخدم (User Stories)

### US-15.1 — رسوم وطرق التوصيل (P1)
يضبط التاجر الرسوم الافتراضية وحد الشحن المجاني، ويُدير طرق التوصيل بسعرها ومدتها المتوقعة.
**Independent Test**: إضافة طريقة «توصيل سريع» بسعر 1,500 → تظهر في القائمة بسعرها كما يرسله الخادم، وتظهر في صفحة الدفع (M12) فوراً.
**Acceptance**:
1. **Given** إعدادات الشحن، **Then** الحقول: `default_delivery_fee` (تُخزَّن `YER_NEW`), `free_shipping_threshold`؛ تُعرض العملة المخزَّنة صريحة بجانب الحقل.
2. **Given** طريقة توصيل، **Then** الحقول: `name`, `price` (بـ`YER_NEW`), `estimated_time`, `is_active`؛ الطرق ذات `is_sharwa_official=true` تُعرض بشارة «شروة شيب» وللقراءة فقط.
3. **Given** طريقة معطّلة، **Then** لا تظهر في معاينة «كما يراها العميل» بجانب القائمة.

### US-15.2 — نقاط الاستلام (P1)
**Acceptance**:
1. **Given** نقطة استلام، **Then** الحقول: `name`, `address`, `phone`, `is_active`, `sort_order`؛ إعادة الترتيب بالسحب.
2. **Given** موقع (M22) بعلم `is_pickup_point`, **Then** يُعرض تلميح «هذا الموقع نقطة استلام أيضاً» مع رابط، بلا تكرار البيانات.

### US-15.3 — المندوبون وشركات الشحن (P1)
يُدير التاجر مندوبيه الداخليين (شروة شيب) وشركات الشحن الخارجية بحدود كل جهة.
**Acceptance**:
1. **Given** إضافة مندوب/شركة، **Then** الحقول: `name`, `phone_number`, `is_active`, `max_weight_per_awb`, `max_items_per_awb`, `accepts_hazardous`, `volumetric_divisor`, `carrier_code` (فارغ = شروة شيب، وإلا من `aramex` · `smsa`)، `staff_account` (ربط بموظف من M18 للمندوب الداخلي).
2. **Given** `carrier_code` فارغ، **Then** يُصنَّف «مندوب شروة شيب» ويظهر في تبويب المندوبين؛ وإلا في تبويب شركات الشحن مع حالة ربط الناقل من US-15.4.
3. **Given** منتج خطر (`is_hazardous`) في طلب، **Then** تُعرض في M06 فقط الجهات ذات `accepts_hazardous=true` — تُوثَّق القاعدة هنا وتُنفَّذ هناك.

### US-15.4 — ربط الناقلين الخارجيين (P1)
يُدخل التاجر اعتمادات `aramex` و`smsa` في نموذج ديناميكي من `credential_fields`، ويرى رابط webhook الوارد وحالته.
**Acceptance**:
1. **Given** ناقل، **When** يُفتح، **Then** يُعرض نموذج من `credential_fields` الخاصة بالمحوّل، الحقول السرّية مقنَّعة وللكتابة فقط.
2. **Given** ناقل مربوط، **Then** يُعرض رابط `POST /api/v1/webhooks/carrier/<carrier_code>/` للنسخ مع ملاحظة «يُوقَّع بـ `X-Carrier-Signature`»، وآخر حدث وارد (تاريخ ورقم بوليصة) بلا كشف السرّ.
3. **Given** زر «اختبار الاتصال»، **Then** يُعرض نجاح/فشل بسبب مقروء من الخادم.

### US-15.5 — مناطق شروة شيب وملفات التغليف (P2)
**Acceptance**:
1. **Given** مناطق المنصة، **Then** جدول للقراءة فقط: `code`, `name`, `price` (تكلفة التاجر لكل بوليصة بعملتها), `volumetric_divisor`, `radius_km`, `is_active`؛ وخريطة بسيطة بدوائر `center_latitude/longitude` + `radius_km`.
2. **Given** ملف تغليف، **Then** CRUD بالحقول التي يعرّفها الخادم (الاسم، الأبعاد، الوزن الفارغ) ويُستخدم افتراضياً عند إصدار البوليصة (M39).

### US-15.6 — مراجعة المناطق، النطاقات المحظورة، وSLA (P2)
**Acceptance**:
1. **Given** مراجعة المناطق، **Then** قائمة الطلبات التي عنوانها خارج أي منطقة أو داخل نطاق محظور، مع إجراء «تأكيد/تحويل إلى استلام/إلغاء».
2. **Given** نطاق محظور (`RestrictedZonePolygon`), **Then** يُرسم من `polygon_points` ويُحرَّر بالنقاط على الخريطة أو بإدخال الإحداثيات.
3. **Given** قاعدة SLA (`DeliverySLARule`), **Then** `sla_hours` لكل منطقة/طريقة كما يعرّفها الخادم، وتُعرض الشحنات المتجاوزة في الحالات الحدّية.

### US-15.7 — الحالات الحدّية التشغيلية (P2)
**Acceptance**:
1. **Given** شاشة الحالات الحدّية، **Then** تبويبات: أحداث خارج الترتيب (`out_of_order`)، أحداث معلَّمة للمراجعة (`flagged_for_review`)، أحداث مرفوضة (`is_rejected`)، تجاوز SLA؛ كل صف يفتح الشحنة في M39.
2. **Given** شحنة `in_transit`, **When** يُختار «تحديث العنوان»، **Then** يُعرض العنوان الحالي والجديد مع تأكيد، ويُسجَّل حدث `merchant_manual`.
3. **Given** طلب لم يُستلم بعد (`pending_pickup` أو قبله)، **When** يُختار «تحويل إلى استلام»، **Then** تُختار نقطة استلام نشطة ويُؤكَّد؛ الحالات اللاحقة تُعطَّل مع تلميح السبب.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-15.01**: كل الأسعار والرسوم MUST تُعرض كما يرسلها الخادم مع عملتها الصريحة (`YER_NEW` للتوصيل، عملة المنطقة لشروة شيب)؛ لا تحويل في الواجهة.
- **FR-15.02**: نموذج الناقل MUST يُبنى من `credential_fields` التي يرسلها الخادم؛ الحقول السرّية للكتابة فقط ومقنَّعة.
- **FR-15.03**: تبويب «المندوبون» = `carrier_code` فارغ؛ «شركات الشحن» = `carrier_code` محدَّد؛ نفس الكيان ونفس النموذج.
- **FR-15.04**: مناطق شروة شيب MUST تُعرض للقراءة فقط مع رابط «تُدار من المنصة».
- **FR-15.05**: تحديث العنوان أثناء النقل والتحويل إلى استلام MUST يحترمان آلة حالات `ShipmentOrder` (التحويل فقط قبل `picked_up`)، وتُعطَّل الخيارات المحجوبة مع السبب.
- **FR-15.06**: كل القوائم MUST تحمل فلاترها في الرابط (nuqs) وتدعم ترقيماً خادمياً.
- **FR-15.07**: الوحدة MUST تحترم مفاتيح الميزات لكل شاشة وتُخفي ما هو معطّل.
- **FR-15.08**: الخرائط MUST تعمل بلا مفاتيح خارجية في الإصدار الأول (بلاطات مفتوحة) وتحترم `prefers-reduced-motion`.

## 5. الكيانات والحالات (Key Entities & States)

- **StoreSetting (shipping)**: `default_delivery_fee` (YER_NEW), `free_shipping_threshold`.
- **DeliveryMethod**: `name`, `price` (YER_NEW), `estimated_time`, `is_active`, `is_sharwa_official`.
- **PickupLocation**: `name`, `address`, `phone`, `is_active`, `sort_order`.
- **ShippingProvider**: `name`, `phone_number`, `is_active`, `max_weight_per_awb`, `max_items_per_awb`, `accepts_hazardous`, `volumetric_divisor`, `carrier_code` (فارغ = شروة شيب · `aramex` · `smsa`), `staff_account`.
- **Carrier (aramex/smsa)**: `credential_fields` من المحوّل؛ أسرار webhook في `CARRIER_WEBHOOK_SECRETS` (خادمية). حالات العرض: غير مربوط · مربوط · خطأ اتصال.
- **SharwaShipZone** (منصة، قراءة): `code`, `name`, `price`, `currency`, `volumetric_divisor`, `center_latitude`, `center_longitude`, `radius_km`, `is_active`, `sort_order`.
- **PackagingProfile**: حقول حسب الخادم. **RestrictedZonePolygon**: `polygon_points` JSON. **DeliverySLARule**: `sla_hours`.
- **ShipmentOrder** (مرجعي لآلة الحالات): `label_pending` بانتظار تأكيد الملصق · `pending_pickup` بانتظار الاستلام من التاجر · `picked_up` تم الاستلام · `in_transit` قيد التوصيل · `delivered` تم التسليم · `returned` مُعاد · `cancelled` ملغي · `compensated_lost` شحنة مُعوَّضة. **ShipmentEvent.source**: `webhook` · `agent_app` · `merchant_manual` · `system`؛ أعلام `is_rejected`, `out_of_order`, `flagged_for_review`.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/shipping` (رسوم + طرق التوصيل + معاينة العميل) · `/dashboard/shipping/pickup-locations` · `/dashboard/shipping/providers` (تبويبا مندوبون/شركات + sheet النموذج) · `/dashboard/shipping/carriers/[code]` · `/dashboard/shipping/zones` (مناطق شروة شيب للقراءة) · `/dashboard/shipping/packaging` · `/dashboard/shipping/zone-review` (+ النطاقات المحظورة + SLA كتبويبات) · `/dashboard/shipping/edge-cases` · إجراءات «تحديث العنوان» و«تحويل إلى استلام» كـ dialogs من M06/M39.
- **الحالات البصرية**: skeleton · فراغ بنص فعلي («لا طرق توصيل — أضف طريقة ليتمكن العميل من الطلب») · خطأ · بلا صلاحية · الميزة معطّلة · ناقل غير مربوط.
- **الجوال**: الجداول → بطاقات؛ الخرائط بارتفاع 50vh مع قائمة تحتها؛ النماذج صفحة كاملة.
- **اختصارات**: `⌘K` → «إعدادات الشحن» / «الحالات الحدّية» · `N` إضافة في القائمة الحالية.

## 7. عقد البيانات (Data Contract)

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
| مراجعة المناطق | `zone_review` | `[NEEDS BACKEND]` → `GET /api/v1/shipping/zone-review/?status&page`, `POST /<order_id>/resolve/` `{action: confirm|convert_pickup|cancel, pickup_location_id?}` |
| النطاقات المحظورة / SLA | `zones.py` (نماذج) | `[NEEDS BACKEND]` → `GET/POST/PATCH/DELETE /api/v1/shipping/restricted-zones/`, `/api/v1/shipping/sla-rules/` |
| الحالات الحدّية | `edge_cases` | `[NEEDS BACKEND]` → `GET /api/v1/shipping/edge-cases/?kind=out_of_order|flagged|rejected|sla_breach&page` |
| تحديث عنوان أثناء النقل | `update_address_in_transit` POST | `[NEEDS BACKEND]` → `POST /api/v1/shipments/<id>/address/` `{address, latitude?, longitude?}` |
| تحويل إلى استلام | `convert_order_to_pickup` POST | `[NEEDS BACKEND]` → `POST /api/v1/orders/<id>/convert-to-pickup/` `{pickup_location_id, version}` → 200/409 |

## 8. الحالات الحدّية (Edge Cases)

- متجر بعملة عرض `SAR` ورسوم مخزَّنة `YER_NEW`: تُعرض الرسوم بعملتها المخزَّنة مع تلميح «تُحوَّل للعميل حسب أسعار الصرف (M34)».
- مندوب بـ`staff_account` موظفٍ مُنهى (`terminated_at`): شارة «الحساب مُنهى» وتُقترح إعادة الربط.
- ناقل بمفاتيح صالحة لكن webhook لم يصل منذ 7 أيام: شارة تحذير «لا أحداث واردة».
- طلب في مراجعة المناطق أُلغي من M06 أثناء المراجعة: يختفي من القائمة مع إشعار.
- `polygon_points` بأقل من 3 نقاط: يُرفض محلياً.
- تحويل إلى استلام لطلب `in_transit`: الخيار معطّل بتلميح «الشحنة قيد التوصيل — استخدم تحديث العنوان».

## 9. معايير النجاح (Success Criteria)

- **SC-15.1**: ضبط الشحن لأول مرة (رسوم + طريقة + نقطة استلام) ≤ 3 دقائق.
- **SC-15.2**: 0 حالات تُعرض فيها رسوم بلا عملة صريحة.
- **SC-15.3**: 100% من الإجراءات المحجوبة بآلة الحالات تُعرض بسبب مقروء.
- **SC-15.4**: 0 أسرار ناقلين في أي استجابة أو DOM.
- **SC-15.5**: شاشة الحالات الحدّية تُظهر كل حدث معلَّم خلال ≤ 60 ثانية من وقوعه (تحديث دوري).

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M03، M06 (الطلبات)، M18 (`staff_account`)، M22 (المواقع ونقاط الاستلام)، M39 (البوالص والأحداث)، M38 (تطبيق المندوب)، M20 (مناطق شروة شيب)، M34 (أسعار الصرف).
- افتراض: شاشتا `shipping_companies` و`shipping_providers` تعرضان نفس كيان `ShippingProvider` مقسوماً بـ`carrier_code`.
- افتراض: حقول `PackagingProfile` تُؤخذ من الخادم عند توفر العقد؛ لا تُخترع.
- افتراض: الخرائط ببلاطات مفتوحة بلا مفتاح API في الإصدار الأول.
- افتراض: الـ 3PL على مستوى المنصة (`ThirdPartyLogisticsProvider` + `ClientAgreement`) تُعرض لاحقاً عند توفر عقد؛ خارج هذا الإصدار.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا شعارات ناقلين ملونة كبيرة — اسم نصّي وحالة دلالية؛ الخريطة بأسلوب رمادي هادئ بدوائر بحد 1px لا تعبئة صاخبة؛ لا بطاقات KPI متماثلة أعلى الحالات الحدّية بل شريط أرقام Mono قابل للنقر كفلتر.
- II: الأوزان والحدود والأسعار والإحداثيات بخط Mono محاذاة نهاية؛ أرقام الهواتف LTR داخل RTL (`dir="ltr"` على الحقل)؛ أسهم السحب والتنقل تنعكس.
- IV: لقطات `docs/visual-checks/15-shipping/` للرسوم مع معاينة العميل، المندوبين/الشركات، ناقل مربوط (مقنَّع)، مراجعة المناطق بالخريطة، الجوال، الداكن.
