# M38 — تطبيق مندوب التوصيل (Courier / Delivery Agent App)

**Route group**: `(courier)` · **Priority**: P3 · **Backend status**: Ready للإجراءات (`/api/v1/agent/shifts/start/`, `/shifts/end-and-handover/`, `/shipments/<id>/status/`, `/fulfillments/<id>/scan-pickup/`, `/fulfillments/<id>/partial-delivery/`)؛ القوائم (شحناتي، دفتر العهدة، تفاصيل الشحنة) HTML-only `[NEEDS BACKEND]`
**Discovery refs**: `03-api-payments-shipping-theme-integrations.md` §1 (agent rows), §4 (ShipmentOrder/ShipmentEvent/Custody) · `02-products-domain-model.md` §6 (آلة الحالات)، §8 (`Fulfillment`, `FulfillmentItem`, دور `driver`) · `01-tenants-dashboard-admin.md` §3.2 (`agent_shipment_*`, `agent_shift*`) · **Benchmarks**: Onfleet driver app (قائمة مهام بحالة واضحة، إجراء واحد كبير لكل شاشة)، Uber Eats courier (شريط إجراء سفلي ثابت — بلا خرائط مزدحمة)، Linear mobile (قوائم كثيفة بأهداف لمس كبيرة)

## 1. الهدف (Purpose)

تمكين المندوب من إدارة مناوبته وشحناته من جواله في الميدان: يبدأ المناوبة، يمسح الباركود عند الاستلام، ينقل الحالات وفق آلة الحالات، يسلّم جزئياً مع تحصيل COD، ويسلّم عهدته عند الانتهاء — مع عمل متقطع الشبكة بإعادة إرسال آمنة (idempotent). يُقاس بنسبة الأحداث المقبولة من أول إرسال وبزمن إقفال المناوبة.

## 2. الفاعلون (Actors)

- **المندوب**: موظف (`StaffMember`) مرتبط بملف `ShippingProvider` عبر `shipping_provider_profile`؛ يعمل باسمه فقط. بلا ارتباط ⇒ 403 «حساب الموظف هذا غير مرتبط بأي ملف مندوب شحن.».
- **مالك المتجر**: يستطيع تنفيذ الإجراءات باسم مندوب صريح عبر `agent_id` (جلسة `is_merchant_authenticated`)؛ يُستخدم في شاشة الإشراف (M39) لا في هذا التطبيق.
- **النظام**: يبني `idempotency_key` من `(shipment_id, to_status, client_generated_uuid)` ويرفض الأحداث غير القانونية/القديمة بتسجيلها مرفوضة لا بحذفها.

## 3. قصص المستخدم (User Stories)

### US-38.1 — بدء المناوبة وإنهاؤها وتسليم العهدة (P1)
يفتح المندوب التطبيق فيرى مناوبته المفتوحة أو زر «ابدأ المناوبة» (مع مرجع المركبة اختيارياً)؛ عند الانتهاء يضغط «إنهاء» أو «تسليم إلى مندوب آخر» فيُنقل رصيد عهدته.
**Independent Test**: بدء مناوبة، تسليمها لمندوب ثانٍ، والتأكد أن الاستجابة تحوي `new_shift_id` و`balance` وأن المناوبة الأولى أُغلقت.
**Acceptance**:
1. **Given** لا مناوبة مفتوحة، **When** يُضغط «ابدأ»، **Then** تُعرض `started_at` و`agent` من الاستجابة ويُفعَّل باقي التطبيق.
2. **Given** مناوبة مفتوحة أخرى لنفس المندوب، **When** يبدأ جديدة، **Then** يُغلق الخادم القديمة تلقائياً وتُعرض ملاحظة «أُغلقت المناوبة السابقة».
3. **Given** إنهاء بلا `new_agent_id`, **Then** تُعرض `ended_at` ويُقفل التطبيق على شاشة «لا مناوبة».

### US-38.2 — شحناتي حسب الحالة (P1)
يرى المندوب شحناته مجمَّعة بتبويبات الحالة (`pending_pickup` · `picked_up` · `in_transit` · `delivered` · أخرى) مع رقم البوليصة، العميل، العنوان، والمبلغ المطلوب تحصيله.
**Acceptance**:
1. **Given** 20 شحنة، **When** تُفتح القائمة، **Then** تظهر خلال < 1s مع عدّاد لكل تبويب، والمبالغ كما أرسلها الخادم.
2. **Given** الجهاز بلا شبكة، **Then** تُعرض آخر قائمة محمَّلة بشارة «غير متصل — آخر تحديث {وقت}».

### US-38.3 — مسح الاستلام ونقل الحالة (P1)
عند الاستلام من المخزن يمسح المندوب الباركود؛ يطابقه الخادم مع `waybill_number` (أو `fulfillment.id` إن لم توجد بوليصة). ثم ينقل الحالة بزر واحد كبير يعرض فقط الانتقالات المسموحة من الحالة الحالية.
**Acceptance**:
1. **Given** كود لا يطابق، **When** يُرسل، **Then** يُعرض 400 `{detail, scan_mismatch:true}` بشريط `red` ثابت «عدم تطابق الباركود» ويُمنع الاستمرار.
2. **Given** شحنة `in_transit`, **Then** يظهر زرا «تم التسليم» و«مُعاد» فقط؛ `cancelled` غير متاح.
3. **Given** استجابة `accepted:false` مع `rejection_reason='stale_event'`, **Then** يُعرض «حدث أقدم من آخر حدث مسجَّل — أُرشِف بلا تغيير» ولا تُغيَّر الحالة محلياً.
4. **Given** شحنة `compensated_lost`, **When** يُمسح باركودها، **Then** يُعرض سبب `compensated_lost_scan` مع توجيه «تواصل مع المشرف».
5. **Given** `flagged_for_review:true`, **Then** تظهر شارة «قيد المراجعة» على الشحنة.

### US-38.4 — تسليم جزئي وتحصيل COD (P1)
يفتح المندوب الشحنة، يحدد لكل بند الكمية المسلَّمة وسبب الرفض إن وُجد، فيعرض الخادم المبلغ المحصَّل والعملة ويسجّل `collected_cod` في دفتر العهدة.
**Acceptance**:
1. **Given** إعادة إرسال نفس `client_generated_uuid` بعد انقطاع، **Then** تعود الاستجابة بـ `duplicate:true` ونفس `collected_amount` بلا تسجيل مزدوج.
2. **Given** 409 `{detail:'رُفض التسليم.', rejection_reason}`, **Then** يُعرض السبب ويُترك النموذج للتعديل.
3. **Given** كل البنود مرفوضة، **Then** يُطلب تأكيد «سيُسجَّل كتسليم فاشل» قبل الإرسال.

### US-38.5 — دفتر العهدة (P2)
يرى المندوب رصيده الحالي وحركاته (`collected_cod` · `handed_over` · `lost` · `written_off` · `reversed`) مع الشحنة والمناوبة المرتبطتَين.
**Acceptance**:
1. **Given** حركة `reversed`, **Then** تُعرض بلون `amber` وبإشارة إلى الحركة الأصلية.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-38.01**: التطبيق MUST يعمل بجلسة الموظف (`/dashboard/staff/login/` من M18) مع `X-CSRFToken` على كل POST؛ لا توكنات محلية.
- **FR-38.02**: كل إجراء ميداني MUST يولّد `client_generated_uuid` (≤ 64 حرفاً) لحظة الضغط ويخزّنه مع الطلب في طابور محلي (IndexedDB) حتى تأكيد الخادم؛ إعادة الإرسال تستخدم نفس المعرّف.
- **FR-38.03**: `event_time` MUST يُرسل بوقت الضغط الفعلي (ISO 8601) لا وقت المزامنة؛ و`geo_lat`/`geo_lng`/`geo_accuracy_m` عند توفر الإذن.
- **FR-38.04**: أزرار الحالة MUST تُشتق من آلة الحالات: `label_pending→{pending_pickup, cancelled}` · `pending_pickup→{picked_up, cancelled}` · `picked_up→{in_transit, returned, cancelled}` · `in_transit→{delivered, returned}` · `delivered→{returned}`؛ النهائية `returned` · `cancelled` · `compensated_lost` بلا أزرار.
- **FR-38.05**: الواجهة MUST تعامل `accepted:false` كرفض مقروء بحسب `rejection_reason` (`invalid_transition` · `stale_event` · `order_already_reversed` · `compensated_lost_scan`) وتحتفظ بالحالة من الاستجابة `status`.
- **FR-38.06**: المسح MUST يدعم الكاميرا (BarcodeDetector مع بديل إدخال يدوي) ويُرسل `scanned_code` كما هو.
- **FR-38.07**: التسليم الجزئي MUST يُرسل `line_items:[{fulfillment_item_id, delivered_quantity, rejection_reason}]` لكل بنود الشحنة.
- **FR-38.08**: الطابور المحلي MUST يُعاد إرساله بالترتيب عند عودة الشبكة، ويعرض شارة «n إجراءات بانتظار المزامنة».
- **FR-38.09**: كل أهداف اللمس MUST ≥ 48px؛ الإجراء الأساسي في شريط سفلي ثابت؛ لا تفاعلات hover.
- **FR-38.10**: المبالغ (`collected_amount`, الرصيد) MUST تُعرض كنصوص الخادم بخط Mono؛ لا جمع محلي.

## 5. الكيانات والحالات (Key Entities & States)

- **CourierShift**: `agent`, `vehicle_ref`, `started_at`, `ended_at`, `handed_over_to`. مفتوحة = `ended_at` فارغ.
- **ShipmentOrder**: `waybill_number`, `status`: `label_pending` بانتظار تأكيد الملصق · `pending_pickup` بانتظار الاستلام من التاجر · `picked_up` تم الاستلام · `in_transit` قيد التوصيل · `delivered` تم التسليم · `returned` مُعاد · `cancelled` ملغي · `compensated_lost` شحنة مُعوَّضة.
- **ShipmentEvent** (نتيجة كل إرسال): `accepted`, `rejection_reason`, `flagged_for_review`, `source='agent_app'`.
- **Fulfillment / FulfillmentItem**: `quantity`, `delivered_quantity`, `rejection_reason`.
- **CourierCustodyLedger**: `entry_type`: `collected_cod` تحصيل COD · `handed_over` تسليم عهدة · `lost` فقدان عهدة · `written_off` شطب/إتلاف · `reversed` تراجع تحصيل؛ `amount`, `currency`, `related_shipment`, `related_shift`. الرصيد = مجموع الحركات (في الخادم).
- **OfflineAction** (محلي): `uuid`, `endpoint`, `payload`, `created_at`, `attempts`, `state`: `queued` · `sending` · `done` · `failed`.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/courier` (المناوبة: بدء/إنهاء/تسليم + الرصيد) · `/courier/shipments?status=` (تبويبات) · `/courier/shipments/[id]` (تفاصيل + مسح + أزرار الحالة + تسليم جزئي) · `/courier/custody` (دفتر العهدة) · `/courier/queue` (الإجراءات المعلّقة).
- **الحالات البصرية**: skeleton · فراغ «لا شحنات في هذه الحالة» · غير متصل · 401 → تسجيل دخول الموظف · 403 بلا ملف مندوب (نص + «تواصل مع مالك المتجر») · مرفوض (`accepted:false`) · `scan_mismatch`.
- **الجوال أولاً (390px)**: عمود واحد؛ شريط إجراء سفلي ثابت؛ تبويبات قابلة للتمرير أفقياً داخل حاويتها؛ الديسكتوب يعرض نفس التخطيط بعرض أقصى 480px.
- **اختصارات**: لا اختصارات لوحة مفاتيح؛ زر الكاميرا بحجم 56px.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| بدء مناوبة | `POST /api/v1/agent/shifts/start/` ← `{vehicle_ref?, agent_id? (المالك فقط)}` → `{shift_id, agent, started_at}`؛ 401 بلا جلسة؛ 403 موظف بلا ملف مندوب | Ready |
| إنهاء/تسليم | `POST /api/v1/agent/shifts/end-and-handover/` ← `{shift_id, new_agent_id?, vehicle_ref?}` → إنهاء `{shift_id, ended_at}` أو تسليم `{new_shift_id, handed_over_to, balance}`؛ 400 `shift_id`/`new_agent_id` غير صالح؛ 404 مناوبة/مندوب | Ready |
| نقل حالة | `POST /api/v1/agent/shipments/<id>/status/` ← `{to_status, client_generated_uuid(≤64), event_time?, geo_lat?, geo_lng?, geo_accuracy_m?}` → 200 `{shipment_id, waybill_number, status, accepted, rejection_reason, flagged_for_review}` (الرفض يعود 200 بـ `accepted:false`)؛ 400 تحقق؛ 404 | Ready |
| مسح الاستلام | `POST /api/v1/agent/fulfillments/<id>/scan-pickup/` ← `{scanned_code}` → `{ok:true, fulfillment_id}`؛ 400 `{detail, scan_mismatch:true}` | Ready |
| تسليم جزئي | `POST /api/v1/agent/fulfillments/<id>/partial-delivery/` ← `{line_items:[{fulfillment_item_id, delivered_quantity, rejection_reason}], client_generated_uuid, geo_lat?, geo_lng?, geo_accuracy_m?}` → `{collected_amount, currency, delivered, rejected, duplicate}`؛ 400 بلا بنود/بلا uuid/خطأ عهدة؛ 409 `{detail:'رُفض التسليم.', rejection_reason}` | Ready |
| شحناتي | `agent_shipment_list` HTML | `[NEEDS BACKEND]` → `GET /api/v1/agent/shipments/?status` → `[{id, waybill_number, status, customer_name, address, display_cod_amount, fulfillment_id, items:[{fulfillment_item_id, product_name, quantity}]}]` |
| تفاصيل شحنة + أحداثها | `agent_shipment_detail` HTML | `[NEEDS BACKEND]` → `GET /api/v1/agent/shipments/<id>/` → الشحنة + `events[]` |
| المناوبة الحالية + الرصيد | `agent_shift` HTML (`get_courier_balance`) | `[NEEDS BACKEND]` → `GET /api/v1/agent/me/` → `{agent:{id,name}, open_shift:{id, started_at, vehicle_ref}|null, display_balance, currency}` |
| دفتر العهدة | Model فقط | `[NEEDS BACKEND]` → `GET /api/v1/agent/custody/?page` → `[{entry_type, display_amount, currency, related_shipment, related_shift, created_at}]` |

## 8. الحالات الحدّية (Edge Cases)

- إرسال حالة بعد تغييرها من التاجر يدوياً: يعود `accepted:false` بـ `invalid_transition`; الواجهة تعرض الحالة الفعلية من `status`.
- ساعة الجهاز خاطئة: `event_time` قد يُرفض كـ `stale_event`; يُعرض تلميح «تحقق من وقت الجهاز».
- إذن الموقع مرفوض: تُرسل الأحداث بلا geo بلا منع.
- طابور يحوي إجراءين لنفس الشحنة بترتيب معكوس: يُرسل بالترتيب الزمني؛ الثاني قد يُرفض ويُعرض.
- تسليم مندوب إلى نفسه: يُمنع محلياً قبل الإرسال.
- `balance` بعد التسليم بعملات متعددة: الخادم يعيد نصّاً واحداً؛ يُعرض كما هو.
- انتهاء جلسة الموظف أثناء المزامنة: يتوقف الطابور بحالة `failed` مع «سجّل الدخول ثم أعد المحاولة»؛ لا تُحذف الإجراءات.

## 9. معايير النجاح (Success Criteria)

- **SC-38.1**: ≥ 98% من الإجراءات المعاد إرسالها بعد انقطاع تُقبل بلا تكرار (`duplicate` أو نفس المفتاح).
- **SC-38.2**: نقل حالة شحنة ≤ 2 نقرات من قائمة الشحنات.
- **SC-38.3**: 0 عناصر لمس أقل من 48px (فحص Playwright على 390px).
- **SC-38.4**: 100% من الرفضات تُعرض بسبب مقروء بالعربية.
- **SC-38.5**: التطبيق يعمل للقراءة من آخر بيانات محمَّلة بلا شبكة.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M18 (تسجيل دخول الموظف ودور `driver`)، M39 (البوليصات والإشراف)، M06 (الطلب)، M44 (Service Worker للعمل دون اتصال على أصل المتجر).
- افتراض: التطبيق يعمل على أصل المتجر `<store>.<base>/courier` بجلسة الموظف ونفس CSRF؛ لا تطبيق أصلي.
- افتراض: ربط الموظف بملف المندوب (`shipping_provider_profile`) يتم من M15/M18؛ هنا يُعرض 403 فقط.
- افتراض: الطابور المحلي يحتفظ بالإجراءات 7 أيام ثم يُعلَّم `failed`.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا خريطة بألوان صاخبة؛ قائمة نصّية بحالة ونقطة دلالية. زر الإجراء الأساسي أسود/أبيض بتباين حاد؛ الألوان الدلالية للنص فقط. لا رسوم «نجاح» متحركة.
- II: أرقام البوليصات والمبالغ Mono؛ العناوين والهواتف داخل `<bdi>`؛ أسهم التنقل تنعكس؛ تبويبات الحالة تبدأ من اليمين.
- IV: لقطات `docs/visual-checks/38-courier/{mobile,mobile-dark,tablet,desktop}.png` تشمل حالة غير متصل وحالة `scan_mismatch`.
- IX: Zod على كل استجابة؛ الطابور في IndexedDB عبر Zustand persist؛ مفاتيح الكاش بمعرّف المستأجر والمندوب.
