# M36 — البيع بالجملة B2B (B2B Wholesale: Tier Prices, Drafts, Negotiation)

**Route group**: `(dashboard)` · **Priority**: P3 · **Backend status**: Ready للمسودات (`POST /api/v1/orders/b2b-draft/`, `GET /orders/b2b-drafts/`, `POST /orders/b2b-draft/<pk>/resolve/`)؛ أسعار الكميات ومسودات المساومة HTML-only/Model-only `[NEEDS BACKEND]`
**Discovery refs**: `03-api-payments-shipping-theme-integrations.md` §1 (B2B rows) · `02-products-domain-model.md` §2 (`ProductTierPrice`, `ProductTemplateTierPrice`, `get_tier_price`), §5 (`NegotiationDraft`), §10 (`ApprovalRequest`, صلاحيات `orders.create_b2b` / `orders.approve_b2b`) · **Benchmarks**: Shopify B2B (قوائم أسعار بالكمية، مسودات تنتظر الموافقة)، Faire (طلب جملة بعميل واحد وسطور واضحة)، Linear (موافقات بنقرة مع سبب الرفض ظاهراً)

## 1. الهدف (Purpose)

تمكين موظف المبيعات من إنشاء طلب جملة لعميل تاجر بأسعار كمية محددة مسبقاً أو بسعر مُتفاوَض عليه، وتمريره لمعتمد بدور معيّن يوافق أو يرفض بنقرة واحدة دون أن يعتمد أحد طلبه بنفسه؛ ثم يتحول الطلب إلى `Order` عادي بقناة `b2b_draft`. يُقاس بزمن الدورة من المسودة إلى القرار ونسبة تضارب الإصدارات.

## 2. الفاعلون (Actors)

- **موظف مبيعات** بصلاحية `orders.create_b2b`: يُنشئ المسودات ويرى قائمتها المعلّقة. (الباك إند يرفض المالك بلا حساب موظف: 403 «يتطلب إنشاء طلب الجملة تسجيل دخول موظف.»)
- **معتمد** بصلاحية `orders.approve_b2b` وبالدور `approver_role`: يحسم الموافقة؛ لا يستطيع اعتماد طلبه الخاص (403).
- **مالك المتجر**: يدير أسعار الكميات على المنتج والنموذج (M04)؛ يرى كل المسودات.
- **عميل الجملة**: لا حساب؛ يُسجَّل بالاسم والهاتف والعنوان فقط. يرى جدول أسعار الكميات على صفحة المنتج (M10).

## 3. قصص المستخدم (User Stories)

### US-36.1 — إنشاء مسودة جملة (P1)
يختار الموظف عميلاً (اسم/هاتف/عنوان)، يضيف منتجات بكميات، يختار دور المعتمد والفرع والعملة، ويرسل؛ يرى معرّف الطلب ومعرّف الموافقة ورسالة «أُنشئت المسودة وهي الآن بانتظار موافقة المدير.».
**Independent Test**: إرسال مسودة بمنتجَين عبر الـ API الحقيقي والتأكد من ظهورها في `GET /orders/b2b-drafts/` بـ `items_count=2`.
**Acceptance**:
1. **Given** حقل عميل ناقص، **When** يُرسل، **Then** يُعرض `detail` الخادم «اسم العميل وهاتفه وعنوانه مطلوبة.» تحت النموذج بلا إعادة تحميل.
2. **Given** متجر متعدد الفروع بلا `location_id`, **When** يُرسل، **Then** يُعرض «لا يوجد فرع متاح — أنشئ فرعاً أولاً أو حدّد location_id.» مع رابط إلى M22.
3. **Given** سطور المسودة، **When** تُعرض قبل الإرسال، **Then** تُعرض الأسعار كمعاينة فقط بعلامة «السعر النهائي من الخادم» لأن الباك إند يأخذ `product.price` من قاعدة البيانات حصراً (صفر ثقة).

### US-36.2 — قائمة المسودات المعلّقة والموافقة (P1)
يفتح المعتمد «مسودات الجملة» فيرى جدولاً بالمسودات المعلّقة (العميل، الهاتف، الإجمالي، العملة، عدد العناصر، التاريخ) ويضغط «اعتماد» أو «رفض» مع إرسال `version` الموافقة.
**Acceptance**:
1. **Given** مسودة أنشأها المعتمد نفسه، **When** يضغط «اعتماد»، **Then** يُعرض 403 الخادم كرسالة مقروءة وتبقى المسودة معلّقة.
2. **Given** معتمد آخر حسم المسودة قبل ثانية، **When** يُرسل القرار بـ `version` قديم، **Then** يُعرض 409 «حُدِّثت الموافقة من مستخدم آخر» مع زر «تحديث القائمة».
3. **Given** قرار ناجح، **Then** تُزال المسودة من القائمة ويُعرض «حُسمت الموافقة بنجاح.» مع القرار (`approved` · `rejected`) ورابط للطلب في M06.

### US-36.3 — أسعار الكميات على المنتج والنموذج (P2)
يعرّف المالك صفوف `min_quantity → price` على المنتج (M04) أو على نموذج المنتج (تُنسخ عند الإنشاء)، ويرى جدولها على صفحة المنتج في المتجر (M10).
**Acceptance**:
1. **Given** صفوف 3→90 و10→80 وكمية 12، **Then** تعرض معاينة الواجهة «يُطبَّق سعر 10+» (أعلى عتبة لا تتجاوز الكمية، كما في `get_tier_price`).
2. **Given** صفّان بنفس `min_quantity`, **Then** يُمنع الحفظ محلياً برسالة تحت الحقل.

### US-36.4 — مسودة مساومة (P3)
يسجّل الموظف طلب تفاوض: عميل، منتج، كمية، `proposed_unit_price` مقابل لقطة السعر الأصلي، ملاحظات؛ ثم يقدّمه للموافقة. (نموذج موجود بلا view أو API — انظر §7.)
**Acceptance**:
1. **Given** سعر مقترح أقل من اللقطة، **When** تُعرض المسودة، **Then** يظهر الفرق بالنسبة المئوية من الخادم ملوَّناً دلالياً (`amber` ≤ 20%، `red` أكثر).

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-36.01**: إنشاء المسودة MUST يُرسل حمولة `POST /api/v1/orders/b2b-draft/` كما هي: `{customer_name, customer_phone, address, items:[{product_id, quantity}], approver_role_id?, location_id?, currency?}` مع `X-CSRFToken`؛ لا يُرسل أي سعر.
- **FR-36.02**: الواجهة MUST تعرض `detail` الخادم حرفياً في أخطاء 400/403؛ يُمنع استبدالها بنصوص عامة.
- **FR-36.03**: قائمة المسودات MUST تُقرأ من `GET /api/v1/orders/b2b-drafts/` وتُحدَّث كل 60 ثانية أو عند التركيز على النافذة.
- **FR-36.04**: الحسم MUST يُرسل `{decision: approved|rejected, version}` إلى `/orders/b2b-draft/<approval_id>/resolve/` باستخدام `approval_id` و`approval_version` من القائمة (لا `order.id`).
- **FR-36.05**: الواجهة MUST تُخفي زرَي الحسم بلا `orders.approve_b2b`، وتُعطّلهما مع تلميح «لا يمكنك اعتماد طلبك» إن كان المستخدم هو المُنشئ.
- **FR-36.06**: أسعار الكميات MUST تُعرض جدولاً مرتّباً تصاعدياً بـ `min_quantity` مع المبلغ من `display_price`؛ لا حساب خصم في المتصفح.
- **FR-36.07**: الطلب الناتج MUST يظهر في M06 بقناة `b2b_draft` وحالة `new`/`unpaid` وشارة «بانتظار الموافقة» ما دام `pending_approval.status='pending'`.
- **FR-36.08**: الوحدة MUST تظهر في الشريط تحت «الطلبات» كعنصر «مسودات الجملة» مع عدّاد المعلّق (من طول القائمة).

## 5. الكيانات والحالات (Key Entities & States)

- **Order (b2b)**: `sales_channel='b2b_draft'`, `status='new'`, `payment_status='unpaid'`, `created_by_staff`, `source_location`, `pending_approval` (FK)، `subtotal = total_price` (بلا رسوم توصيل بعد). الأسعار من `product.price` وقت الإنشاء.
- **ApprovalRequest**: `request_type='order_approval'`, `status`: `pending` بانتظار الموافقة · `approved` مقبول · `rejected` مرفوض؛ `approver_role`, `requested_by`, `version`, `escalated_at`. قواعد: لا اعتماد ذاتي (403)؛ تضارب `version` (409).
- **B2BDraft (قراءة)**: `id, customer_name, customer_phone, total_price, currency, created_at, sales_channel, approval_id, approval_version, items_count`.
- **ProductTierPrice** / **ProductTemplateTierPrice**: `min_quantity` (عدد صحيح موجب)، `price`؛ ترتيب `min_quantity`.
- **NegotiationDraft**: `customer_name`, `customer_phone`, `product`, `quantity` (Decimal 10,3)، `proposed_unit_price`, `original_unit_price_snapshot`, `notes`, `status`: `draft` مسودة · `submitted` مُقدَّم للموافقة · `approved` مقبول · `rejected` مرفوض؛ `created_by_staff`, `approval`.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/orders/b2b` (قائمة المسودات المعلّقة + sheet تفاصيل) · `/dashboard/orders/b2b/new` (نموذج المسودة: عميل → سطور → معتمد/فرع/عملة) · `/dashboard/orders/b2b/negotiations` (مسودات المساومة، تُخفى حتى توفر العقد) · لوحة «أسعار الكميات» داخل محرّر المنتج M04 · جدول «أسعار الجملة» في PDP M10.
- **الحالات البصرية**: skeleton صفوف 44px · فراغ «لا مسودات معلّقة» · خطأ 401 → تسجيل دخول موظف · بلا صلاحية (نص لا إخفاء الصفحة عند `create_b2b` دون `approve_b2b`) · 409 مع زر تحديث.
- **الجوال**: سطور المسودة كقائمة بطاقات مضغوطة؛ زرا «اعتماد/رفض» أسفل الشاشة بارتفاع 44px.
- **اختصارات**: `⌘K` → «مسودة جملة جديدة» · `A` اعتماد · `R` رفض (مع تأكيد).

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| إنشاء مسودة | `POST /api/v1/orders/b2b-draft/` ← `{customer_name, customer_phone, address, items:[{product_id, quantity}], approver_role_id?, location_id?, currency?}` → 201 `{detail, order_id, approval_id}`؛ 400 `{detail}` (عميل ناقص / منتج غير صالح / كمية / دور المعتمد / الفرع)؛ 403 بلا موظف | Ready (صلاحية `orders.create_b2b`) |
| قائمة المعلّقة | `GET /api/v1/orders/b2b-drafts/` → `[{id, customer_name, customer_phone, total_price, currency, created_at, sales_channel, approval_id, approval_version, items_count}]` | Ready (فلتر خادمي: `pending_approval__status='pending'`) |
| حسم الموافقة | `POST /api/v1/orders/b2b-draft/<approval_id>/resolve/` ← `{decision: approved\|rejected, version}` → 200 `{detail:'حُسمت الموافقة بنجاح.', decision}`؛ 400 قرار/إصدار غير صالح؛ 403 اعتماد ذاتي؛ 409 تضارب إصدار | Ready (صلاحية `orders.approve_b2b`) |
| أدوار المعتمدين (لقائمة `approver_role_id`) | `staff_roles` HTML | `[NEEDS BACKEND]` → `GET /api/v1/roles/` → `[{id, name}]` (يُشترك مع M18) |
| أسعار الكميات CRUD | tier prices HTML تحت `edit_product` | `[NEEDS BACKEND]` → `GET/POST /api/v1/products/<id>/tier-prices/`, `DELETE /<tier_id>/` `{min_quantity, price}` |
| أسعار الكميات في PDP | `get_tier_price` داخل القالب | `[NEEDS BACKEND]` → إضافة `tier_prices:[{min_quantity, display_price}]` إلى `GET /api/v1/catalog/products/<id>/` |
| مسودات المساومة | Model + Serializer بلا view | `[NEEDS BACKEND]` → `GET/POST /api/v1/orders/negotiations/`, `POST /<id>/submit/` → `{status, approval_id}` |

## 8. الحالات الحدّية (Edge Cases)

- منتج حُذف بعد إنشاء المسودة: القائمة تعرض `items_count` فقط؛ التفاصيل من M06 تعرض لقطة الاسم.
- `currency` غير مُرسَلة: الخادم يفترض `SAR`؛ الواجهة تُظهر العملة المختارة دائماً قبل الإرسال.
- مسودة بـ `approval_id=null` (بيانات قديمة): تُعرض للقراءة فقط بلا أزرار حسم.
- موافقة مُصعَّدة (`escalated_at`): تُعرض شارة «مُصعَّدة» بلون `amber` وتُرتَّب أولاً.
- رفض المسودة: يبقى الطلب `b2b_draft` في M06 بشارة «مرفوض»؛ لا حذف تلقائي.

## 9. معايير النجاح (Success Criteria)

- **SC-36.1**: إنشاء مسودة بـ 5 سطور ≤ 60 ثانية.
- **SC-36.2**: 100% من أخطاء 400/403/409 تُعرض برسالة الخادم أو ترجمة مقروءة، لا خطأ خام.
- **SC-36.3**: 0 حالات يُرسل فيها سعر من المتصفح إلى الخادم.
- **SC-36.4**: من فتح القائمة إلى حسم موافقة ≤ 2 نقرات.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M06 (عرض الطلب الناتج)، M18 (الأدوار والصلاحيات وجلسة الموظف)، M22 (الفروع)، M04 (محرّر المنتج لأسعار الكميات)، M10 (جدول الأسعار في PDP)، M49 (تنبيهات الموافقات).
- افتراض: الباك إند يسعّر سطور المسودة بـ `product.price` لا بسعر الكمية؛ تطبيق أسعار الكميات على مسودات الجملة يُقترح تعديلاً باك إند مستقبلياً ويُوثَّق في `plan.md`.
- افتراض: دور المعتمد يُختار من قائمة أدوار المتجر؛ حتى توفر العقد تُستخدم قائمة من Mock.
- افتراض: مسودات المساومة تبقى مخفية في الإصدار الأول حتى توفر endpoint.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا بطاقات «إجمالي المسودات/المعتمدة/المرفوضة» متماثلة؛ عدّاد نصّي واحد في العنوان. أزرار الحسم بلون النص الدلالي لا بخلفيات ملونة.
- II: المبالغ والهواتف والمعرّفات Mono محاذاة نهاية؛ سهم «فتح الطلب» ينعكس في RTL؛ جدول الأسعار يبدأ من اليمين.
- IV: لقطات `docs/visual-checks/36-b2b/` للقائمة (فارغة/ممتلئة)، نموذج المسودة، حالة 409، الجوال، الداكن.
- IX: مفاتيح الكاش مفتوحة بمعرّف المستأجر؛ Zod على استجابات الـ API الثلاث؛ الحالة في الرابط عبر nuqs.
