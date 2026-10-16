# M24 — المرتجعات والخدمات اللوجستية العكسية (Returns & Reverse Logistics / RMA)

**Route group**: `(dashboard)` · **Priority**: P2 · **Backend status**: **Ready** لـ `ReturnRequest` (`/api/v1/returns/*`) ولإنشاء RMA والمسح وقرار QA (`/api/v1/returns/rma/create/`, `/api/v1/warehouse/returns/*`)؛ قوائم RMA وسجل `OrderRefund` وسجل موثوقية العميل HTML-only `[NEEDS BACKEND]`
**Discovery refs**: `03-api-payments-shipping-theme-integrations.md` §1 (جدول endpoints الصفوف 482–666 و1183–1249), §2 (المصادقة، 409), §4 (Returns enums) · `02-products-domain-model.md` §3 (`OrderRefund`), §7 (Returns), §8 (`FulfillmentItem`), §10 (`orders.process_returns`, `orders.refund`) · `01-tenants-dashboard-admin.md` §4 (سجل الاسترجاعات / الاسترجاعات (الفروع) `[refunds]`، المرتجعات → `reverse_logistics`) · **Benchmarks**: Shopify Returns (إنشاء من الطلب، كميات متبقية، restock لكل سطر)، Loop Returns (مسار RMA بحالات واضحة وقرار QA)، Stripe (دقة المبالغ)

## 1. الهدف (Purpose)

إدارة الإرجاع من لحظة طلب العميل حتى عودة المخزون أو إعدامه، بمسارَين موحَّدَي الواجهة: الاسترجاع المالي للطلب (`ReturnRequest` بسطور مرتبطة بعناصر التنفيذ) والمسار اللوجستي (`ReturnAuthorization` من الطلب إلى المستودع إلى قرار الجودة). يُقاس بزمن الموافقة على المرتجع ونسبة المرتجعات التي أُعيد مخزونها بلا تدخل يدوي.

## 2. الفاعلون (Actors)

- **موظف المرتجعات** (`orders.process_returns`): يُنشئ ويعتمد/يرفض `ReturnRequest`.
- **موظف مالي** (`orders.refund`): يرى سجل `OrderRefund` القديم وينفّذ استرجاع المبلغ من M06.
- **أمين مخزن / عامل مستودع**: يمسح المرتجع عند الوصول ويُصدر قرار QA.
- **مالك المتجر**: يرى سجل موثوقية العميل (رفض COD) ويعطّل COD له.
- **النظام**: يكتب `refund_restock` في دفتر M21 ويحدّث `payment_status`.

## 3. قصص المستخدم (User Stories)

### US-24.1 — قائمة طلبات الإرجاع (P1)
يفتح الموظف «الاسترجاعات (الفروع)» فيرى جدول `ReturnRequest`: الرقم، الطلب (Mono)، العميل، عدد السطور، المبلغ (من الخادم)، طريقة الاسترجاع، الحالة، الموقع، التاريخ؛ مع فلتر `status` وبحث `q`.
**Independent Test**: `GET /api/v1/returns/?status=requested&q=0777` يُعيد نفس الصفوف التي تعرضها الواجهة؛ الرابط يحمل الفلترَين.
**Acceptance**:
1. **Given** 5 حالات، **When** يُختار `requested`، **Then** يُحدَّث الرابط ويُعرض العدد في شريط نصّي (مطلوب / معتمد / قيد المعالجة / مكتمل / مرفوض).
2. **Given** صف، **When** يُضغط، **Then** تُفتح التفاصيل في sheet من `GET /api/v1/returns/<pk>/` بالسطور والقرار.

### US-24.2 — إنشاء إرجاع من الطلب (P1)
من تفاصيل الطلب (M06) أو من «إرجاع جديد»: يُدخل الموظف رقم الطلب فتُحمَّل العناصر القابلة للإرجاع (`remaining`, `unit_refund_amount`, `location_name`)، يختار الكميات، يحدّد `restock` لكل سطر، السبب، وطريقة الاسترجاع.
**Acceptance**:
1. **Given** عنصر `quantity=3, remaining=1`، **When** يُدخل 2، **Then** يُمنع محلياً «المتبقي 1» قبل الإرسال.
2. **Given** سطران محددان، **Then** يُعرض المجموع المتوقع كنص من `unit_refund_amount × quantity_returned` مُعلَّماً «تقديري — المبلغ النهائي من الخادم» وبخط Mono.
3. **Given** الإرسال، **When** 201، **Then** يُنقل إلى تفاصيل الطلب الجديد بحالة `requested`؛ **When** 400 `{line_items:[…]}`، **Then** تُعرض الأخطاء على السطور المعنيّة.

### US-24.3 — اعتماد/رفض بقفل تفاؤلي (P1)
في تفاصيل الإرجاع بحالة `requested`: زرا «اعتماد» و«رفض»؛ الاعتماد يطلب `location_id` (موقع إعادة المخزون) حين يوجد سطر `restock=true`.
**Acceptance**:
1. **Given** `version=3` محلياً و`version=4` على الخادم، **When** يُعتمد، **Then** 409 → رسالة «حُدِّث الطلب من مستخدم آخر» مع زر «تحديث ثم إعادة المحاولة» (لا إعادة تلقائية).
2. **Given** `refund_method=cash` وصندوق الموقع لا يكفي، **When** يُعتمد، **Then** يُعرض خطأ `CashLiquidityError` كما أرسله الخادم في `{detail}` مع اقتراح «غيّر الطريقة إلى محفظة العميل أو اختر موقعاً آخر».
3. **Given** الرفض، **Then** تُطلب ملاحظة وتُعرض الحالة `rejected` وتُقفل الأزرار.

### US-24.4 — مسار RMA اللوجستي (P2)
ينشئ الموظف `ReturnAuthorization` من عنصر تنفيذ (سبب من 4، موقع وجهة، كمية)، ثم يمسحه عامل المستودع عند الوصول، ثم يُصدر قرار QA (إعادة للمخزون أو إعدام).
**Acceptance**:
1. **Given** RMA بحالة `in_transit_back`، **When** يُمسح بـ `{rma_id, location_id}`، **Then** تنتقل إلى `received_at_warehouse` ثم `qa_pending` وتُعرض الخطوات كمسار أفقي من 7 نقاط.
2. **Given** قرار QA، **When** يُرسل `{decision}`، **Then** تُعرض `restocked` (مع رابط حركة `refund_restock` في M21) أو `rejected_disposal`.
3. **Given** `fee_payer`، **Then** يُعرض كنص «رسوم الإرجاع على: العميل / التاجر / المنصة».

### US-24.5 — سجل الاسترجاعات المالية القديم (P2)
يرى الموظف المالي سجل `OrderRefund` (الطلب، المبلغ، الطريقة `wallet` · `sharwa_pay` · `manual` · `wallet_credit`، السبب، النقاط المسحوبة) للقراءة؛ الإنشاء من M06 فقط.

### US-24.6 — موثوقية العميل في COD (P2)
في تفاصيل الإرجاع/العميل يُعرض `CustomerReliabilityRecord`: عدد رفض COD و`cod_disabled`، مع مفتاح تعطيل/تمكين COD للعميل بتأكيد.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-24.01**: القائمة MUST تستهلك `GET /api/v1/returns/?status&q` كما هو، مع ترقيم DRF الافتراضي (20) وحالة الفلاتر في الرابط.
- **FR-24.02**: الإنشاء MUST يرسل بالضبط `{order_id, reason, refund_method, line_items:[{fulfillment_item_id, quantity_returned, restock}]}` ويمنع `quantity_returned > remaining` محلياً.
- **FR-24.03**: الاعتماد MUST يرسل `{decision: approve|reject, version, location_id?}` ويعالج 409 تفاعلياً دون إعادة تلقائية.
- **FR-24.04**: كل الطلبات الكاتبة MUST تحمل `X-CSRFToken` وجلسة التاجر (`credentials: 'include'`).
- **FR-24.05**: المبالغ MUST تُعرض كما يرسلها الخادم؛ أي مجموع محلي يُعلَّم «تقديري».
- **FR-24.06**: مسار RMA MUST يعرض الحالات السبع بالترتيب كمسار تقدم، والحالة الحالية بنقطة مصمتة والمتجاوزة بخط.
- **FR-24.07**: زر «مسح الاستلام» MUST يدعم إدخال `rma_id` بالقارئ (إدخال لوحة مفاتيح سريع ينتهي بـ Enter) وباليد.
- **FR-24.08**: الوحدة MUST تُخفى بلا `features.refunds`؛ الأزرار الكاتبة تُعطَّل مع تلميح بلا `orders.process_returns`.
- **FR-24.09**: `rejected` و`completed` و`closed` و`rejected_disposal` MUST تكون نهائية في الواجهة (لا أزرار).
- **FR-24.10**: الجدول الزمني للإرجاع MUST يُغذّي جدول الطلب الزمني في M06 (نفس المكوّن).
- **FR-24.11**: تعطيل COD للعميل MUST يطلب تأكيداً ويعرض السبب (عدد مرات الرفض) من الخادم.

## 5. الكيانات والحالات (Key Entities & States)

- **ReturnRequest**: `order`, `reason`, `refund_method`, `version`, `location`; `status` ∈ `requested` مطلوب · `approved` معتمد · `rejected` مرفوض · `processing` قيد المعالجة · `completed` مكتمل. `refund_method` ∈ `original_payment` طريقة الدفع الأصلية · `cash` نقداً · `wallet` محفظة العميل · `store_credit` رصيد متجر. انتقالات الواجهة: `requested → approved|rejected` (بقرار)، `approved → processing → completed` (نظام).
- **ReturnLineItem**: `fulfillment_item`, `quantity_returned`, `refund_amount_allocated`, `restock`.
- **ReturnableItem** (استجابة): `fulfillment_item_id`, `product_name`, `quantity`, `remaining`, `unit_refund_amount`, `location_name`.
- **ReturnAuthorization (RMA)**: `reason` ∈ `customer_rejected` رفض العميل · `damaged` تالف · `wrong_item` صنف خاطئ · `bundle_partial_return` إرجاع جزئي لحزمة. `status` ∈ `requested` مطلوب · `in_transit_back` في طريق العودة · `received_at_warehouse` وصل المستودع · `qa_pending` بانتظار الفحص · `restocked` أُعيد للمخزون · `rejected_disposal` مرفوض/إعدام · `closed` مُغلق. `fee_payer` ∈ `customer` · `merchant` · `platform`.
- **OrderRefund** (قديم): `method` ∈ `wallet` · `sharwa_pay` · `manual` · `wallet_credit`; `amount`, `reason`, `loyalty_points_clawed_back`.
- **CustomerReliabilityRecord**: `cod_refusals_count`, `cod_disabled`.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/returns` (قائمة + sheet) · `/dashboard/returns/new?order=` · `/dashboard/returns/[id]` · `/dashboard/returns/rma` (قائمة RMA + مسار التقدم) · `/dashboard/returns/rma/scan` (شاشة مسح بحقل واحد كبير) · `/dashboard/returns/refunds-log` (سجل `OrderRefund`).
- **الحالات البصرية**: skeleton · فراغ «لا طلبات إرجاع — تُنشأ من تفاصيل الطلب» · خطأ · 409 (شريط تحذير داخل الـ sheet) · بلا صلاحية · الميزة معطّلة.
- **الجوال**: القائمة بطاقات؛ شاشة المسح ملء الشاشة بحقل إدخال مركَّز تلقائياً وأزرار ≥ 44px؛ مسار RMA عمودي.
- **اختصارات**: `⌘K` «إرجاع: #<order>» · `A` اعتماد · `R` رفض · `Enter` في شاشة المسح يرسل.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| قائمة الإرجاعات | `GET /api/v1/returns/?status&q` (perm `orders.process_returns`) | Ready |
| إنشاء إرجاع | `POST /api/v1/returns/` `{order_id, reason, refund_method, line_items:[{fulfillment_item_id, quantity_returned, restock}]}` | Ready |
| العناصر القابلة للإرجاع | `GET /api/v1/returns/order/<order_id>/items/` → `[{fulfillment_item_id, product_name, quantity, remaining, unit_refund_amount, location_name}]` | Ready |
| تفاصيل الإرجاع | `GET /api/v1/returns/<pk>/` | Ready |
| اعتماد/رفض | `POST /api/v1/returns/<pk>/approve/` `{decision: approve\|reject, version, location_id?}` → 200 / 409 / `{detail}` (منها `CashLiquidityError`) | Ready |
| إنشاء RMA | `POST /api/v1/returns/rma/create/` `{order_id, fulfillment_item_id, destination_location_id, quantity?, reason}` | Ready |
| مسح الاستلام | `POST /api/v1/warehouse/returns/scan/` `{rma_id, location_id}` | Ready |
| قرار QA | `POST /api/v1/warehouse/returns/<rma_id>/qa-decision/` `{decision}` | Ready |
| قائمة/تفاصيل RMA | `reverse_logistics`, `rma_*` HTML | `[NEEDS BACKEND]` → `GET /api/v1/returns/rma/?status&q&page`, `GET /api/v1/returns/rma/<id>/` → `{id, order_id, fulfillment_item, reason, status, fee_payer, destination_location, quantity, events:[{to_status, at, actor}]}` |
| سجل الاسترجاعات المالية | `order_refunds_list` HTML | `[NEEDS BACKEND]` → `GET /api/v1/orders/refunds/?method&from&to&q&page` → `{count, results:[{id, order_id, display_amount, method, reason, loyalty_points_clawed_back, created_at}]}` |
| موثوقية العميل | نموذج فقط | `[NEEDS BACKEND]` → `GET /api/v1/customers/<phone>/reliability/` → `{cod_refusals_count, cod_disabled}`, `PATCH` `{cod_disabled}` |

## 8. الحالات الحدّية (Edge Cases)

- طلب بلا عناصر تنفيذ (قديم قبل `Fulfillment`): `items/` يعيد `[]` → فراغ «لا عناصر قابلة للإرجاع — استخدم استرجاع المبلغ من الطلب».
- عنصر `remaining=0`: يُعرض معطّلاً مع «أُرجع بالكامل».
- `refund_method=wallet` لعميل بلا محفظة: الخادم يرد 400؛ الواجهة تعرض الرسالة وتقترح `store_credit`.
- `restock=true` على عنصر منتجه حُذف: يُعرض من اللقطة مع شارة «محذوف» ويبقى الاسترجاع المالي ممكناً.
- RMA وصل موقعاً غير الوجهة: الخادم يرد 400/409؛ تُعرض الرسالة ويبقى الحقل مركَّزاً للمسح التالي.
- انقطاع الشبكة بعد الإرسال: لا إعادة تلقائية للكتابة؛ تُعرض «تحقق من الحالة» مع إعادة تحميل التفاصيل.

## 9. معايير النجاح (Success Criteria)

- **SC-24.1**: من فتح الطلب إلى إنشاء إرجاع بسطرَين ≤ 45 ثانية.
- **SC-24.2**: 100% من حالات 409 تُعرض برسالة مقروءة وزر تحديث، بلا فقدان الاختيارات.
- **SC-24.3**: 0 كميات تتجاوز `remaining` تصل إلى الخادم.
- **SC-24.4**: شاشة المسح تقبل 20 مسحاً متتابعاً بلا نقرة فأرة.
- **SC-24.5**: المبالغ المعروضة تطابق الخادم حرفياً في 100% من الصفوف.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M06 (نقطة الدخول والجدول الزمني)، M21 (`refund_restock`)، M22 (المواقع)، M18 (الصلاحيات)، M07 (ملف العميل).
- افتراض: `CashLiquidityError` يصل كـ 409/400 بنص عربي في `{detail}`؛ الواجهة لا تفسّره بل تعرضه وتقترح بدائل.
- افتراض: لا endpoint لإدخال العميل طلب إرجاع من المتجر؛ نقطة الدخول العامة (M41) رابط واتساب حتى توفره.
- افتراض: ترقيم `/api/v1/returns/` هو DRF الافتراضي (20/صفحة) حتى يُضاف `page_size`.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: مسار RMA نقاط وخطوط رفيعة بلون `foreground`/`muted`، لا شريط تقدم ملون؛ لا بطاقات إحصاء متماثلة؛ الحالات نص + نقطة دلالية.
- II: أرقام الطلبات والمبالغ والكميات Mono محاذاة نهاية؛ مسار RMA يتقدم من اليمين إلى اليسار؛ أسهم «التالي» تنعكس.
- IV: لقطات `docs/visual-checks/24-returns/` للقائمة، نموذج الإنشاء، حالة 409، شاشة المسح، الجوال، الداكن.
- IX: مفاتيح الكاش `[tenant, 'returns', …]`؛ invalidation لتفاصيل الطلب في M06 بعد الاعتماد؛ Zod على كل استجابة `/api/v1/returns/*`.
