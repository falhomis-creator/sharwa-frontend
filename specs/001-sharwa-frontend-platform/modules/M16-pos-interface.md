# M16 — نقاط البيع (POS Interface)

**Route group**: `(pos)` · **Priority**: P3 · **Backend status**: HTML-only `[NEEDS BACKEND]` (`shift_hub`, `open_shift`, `close_shift`, `cash_drawer`, `add_cash_movement`, `resolve_shift_variance`, `create_order`)
**Discovery refs**: `02-products-domain-model.md` §10 (POS, RBAC, Approvals), §8 (`Location.has_pos_terminal`, `LocationStaffAssignment`), §3 (`Order.sales_channel`), §2 (`Product.barcode`) · `01-tenants-dashboard-admin.md` §3.2 (Staff/RBAC/POS), §8 (beat: force-close shifts) · **Benchmarks**: Shopify POS (شاشة بيع بشبكة منتجات، سلة جانبية ثابتة، درج كاش)، Square (فتح/إغلاق الوردية، تقرير الفرق، أهداف لمس كبيرة)، Linear (اختصارات لوحة المفاتيح على الديسكتوب)

## 1. الهدف (Purpose)

تمكين الكاشير في الفرع من بيع المنتجات خلال ثوانٍ على جهاز لمس أو ديسكتوب، داخل وردية محاسَبة بدرج كاش واضح، مع ضبط الخصومات والاسترجاعات بالصلاحيات. يُقاس بزمن إتمام عملية البيع وبنسبة الورديات المغلقة بلا فرق غير مُبرَّر.

## 2. الفاعلون (Actors)

- **كاشير** (دور نظامي «كاشير»: `orders.view` · `orders.update_status` · `customers.view` · `inventory.view` · `discounts.apply`, `max_discount_percent` 10%): يفتح وردية، يبيع، يسجّل حركات كاش، يغلق.
- **مدير الفرع** (`max_discount_percent` 20%): يعتمد طلبات `shift_shortage` وخصومات تتجاوز حد الكاشير (`discount_exception`)، يحلّ فرق الوردية.
- **مالك المتجر**: يعرّف `CashRegister` لكل موقع، يراجع الورديات من لوحة التاجر (`shift_hub`).
- **النظام**: يغلق الورديات المنسية قسرياً (`force_closed`) عبر Celery beat.

## 3. قصص المستخدم (User Stories)

### US-16.1 — فتح وردية على جهاز كاش (P1)
يسجّل الكاشير دخوله (`staff_login`)، يختار الموقع ثم جهاز الكاش (`CashRegister`) المتاح، يُدخل الرصيد الافتتاحي (`opening_float`) ويبدأ البيع.
**Independent Test**: جهاز كاش عليه وردية `open` لموظف آخر → يُعرض كـ«مشغول» ولا يُفتح ثانٍ.
**Acceptance**:
1. **Given** كاشير معيَّن على موقع `has_pos_terminal=true`, **When** يفتح `/pos`, **Then** تظهر أجهزة الكاش النشطة لذلك الموقع فقط بحالة كلٍّ منها (متاح / مشغول باسم الموظف).
2. **Given** جهاز متاح، **When** يُدخل `opening_float` ويضغط «فتح الوردية»، **Then** تُنشأ `Shift(status=open)` وتُفتح شاشة البيع مباشرة.
3. **Given** وردية مفتوحة له مسبقاً، **When** يعود للجهاز، **Then** يُستكمل عليها بلا فتح جديدة.

### US-16.2 — البيع السريع (P1)
يبحث الكاشير بالباركود أو الاسم أو SKU، يضيف العناصر بالكمية والمتغير، يرى الإجمالي كبيراً بخط Mono، يختار طريقة الدفع ويُصدر الإيصال.
**Independent Test**: مسح باركود صالح يضيف العنصر في < 300ms بلا نقرة إضافية؛ باركود غير معروف يُظهر «لا منتج بهذا الباركود» مع خيار البحث بالاسم.
**Acceptance**:
1. **Given** حقل البحث مركَّز، **When** يُمسح `barcode` بقارئ (إدخال + Enter)، **Then** يُضاف المنتج أو يُفتح اختيار المتغير إن كان `has_variants`.
2. **Given** منتج `is_serialized` أو `min_quantity`/`max_quantity`, **When** تُغيَّر الكمية، **Then** تُفرض الحدود مع رسالة تحت الحقل.
3. **Given** سلة بعناصر، **When** يُضغط «إتمام»، **Then** يُنشأ `Order(sales_channel=pos, source_location, created_by_staff)` ويُعرض الإيصال بالقيم المنسّقة من الخادم وتُسجَّل `ShiftCashMovement(sale)` للدفع النقدي.
4. **Given** الطلب اكتمل، **When** تُعرض شاشة الإيصال، **Then** تتاح: طباعة، إرسال واتساب (إن كان تطبيق الواتساب مفعّلاً M30)، «بيع جديد».

### US-16.3 — الخصومات والاسترجاع بحدود الصلاحية (P2)
يطبّق الكاشير خصماً على عنصر أو على السلة ضمن `max_discount_percent` لدوره؛ تجاوزه يطلب اعتماد مدير. الاسترجاع الكبير يتطلب خطوة تحقق إضافية (`OTPChallenge: large_refund`).
**Acceptance**:
1. **Given** كاشير بحد 10%, **When** يُدخل خصم 15%, **Then** يُعرض «يتجاوز حدّك (10%) — طلب اعتماد المدير» ويُنشأ `ApprovalRequest(discount_exception)` أو يُدخل المدير رمزه على نفس الجهاز.
2. **Given** استرجاع يتجاوز حد المتجر، **When** يُبدأ، **Then** تُعرض خطوة OTP ولا يُسجَّل `ShiftCashMovement(refund)` قبل نجاحها.

### US-16.4 — درج الكاش وإغلاق الوردية (P1)
يسجّل الكاشير إدخال/سحب نقد بسبب، ويغلق الورديه بعدّ فعلي؛ يحسب الخادم `expected_closing` و`variance`؛ العجز يُحوَّل لاعتماد المدير.
**Acceptance**:
1. **Given** وردية مفتوحة، **When** يُضاف `cash_in` أو `cash_out` بمبلغ وملاحظة، **Then** يظهر في جدول الحركات فوراً مع نوعه بالعربية ويتحدّث الرصيد المتوقع.
2. **Given** إغلاق بـ`actual_closing` أقل من المتوقع، **When** يُرسل، **Then** تصير الوردية `pending_manager_approval` ويُعرض الفرق بلون دلالي مع «بانتظار اعتماد المدير» (`ApprovalRequest(shift_shortage)`).
3. **Given** فرق صفر أو زيادة، **When** يُرسل، **Then** تُغلق `closed` ويُعرض ملخص الوردية (مبيعات، استرجاعات، إدخال/سحب، تعديل تقريب).
4. **Given** وردية `force_closed` من النظام، **When** يفتح الكاشير الجهاز، **Then** يرى إشعاراً بالإغلاق القسري ويبدأ وردية جديدة.

### US-16.5 — متانة أمام الشبكة (P2)
تبقى السلة الجارية محفوظة محلياً إن انقطع الاتصال، ويُعاد إرسال «إتمام» عند العودة بمفتاح `idempotency_key` واحد.
**Acceptance**:
1. **Given** انقطاع أثناء «إتمام»، **When** تعود الشبكة، **Then** يُعاد الإرسال مرة واحدة بنفس المفتاح ولا يتكرر الطلب.
2. **Given** الجهاز بلا اتصال، **When** يُحاول فتح/إغلاق وردية، **Then** يُمنع مع شريط «غير متصل» ثابت.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-16.01**: مجموعة المسار `(pos)` MUST تكون بتخطيط مستقل بلا شريط لوحة التاجر الجانبي، بوضع ملء الشاشة، وأهداف لمس ≥ 48px.
- **FR-16.02**: البيع MUST يُمنع ما لم توجد `Shift(status=open)` للموظف على جهاز الكاش الحالي؛ شاشة البيع تعرض اسم الجهاز والموقع ووقت فتح الوردية.
- **FR-16.03**: البحث MUST يدعم `barcode` · `sku` · `name` · `name_en` ويُعطي الأولوية للتطابق التام بالباركود (إضافة فورية).
- **FR-16.04**: السلة MUST تعيش في Zustand مع persistence محلي مُفتاح بـ(المستأجر، الجهاز، الوردية) وتُمسح بعد إتمام الطلب أو إغلاق الوردية.
- **FR-16.05**: الخصومات MUST تُقيَّد محلياً بـ`max_discount_percent` للدور الفعّال، ويُعاد التحقق على الخادم؛ التجاوز يفتح مسار اعتماد لا رفضاً صامتاً.
- **FR-16.06**: الاسترجاع الكبير MUST يمرّ بـ`OTPChallenge(large_refund)` قبل تسجيل الحركة.
- **FR-16.07**: الإيصال MUST يعرض `display_*` من الخادم فقط؛ يُمنع جمع أو تنسيق المبالغ في العميل؛ يُعرض الإجمالي الجاري من الخادم عند كل تغيير (أو من حساب خادمي مُخبَّأ).
- **FR-16.08**: حركات الكاش MUST تُعرض بالأنواع الخمسة بتسميات عربية ثابتة وبعمود مبلغ Mono محاذاة نهاية مع إشارة الاتجاه.
- **FR-16.09**: إغلاق الوردية MUST يُظهر قبل الإرسال معاينة (الافتتاحي، المبيعات النقدية، الاسترجاعات، الإدخال، السحب، المتوقع) ثم حقل العدّ الفعلي.
- **FR-16.10**: كل إرسال طلب/حركة MUST يحمل `idempotency_key` ويُعاد تلقائياً مرة واحدة عند فشل الشبكة.
- **FR-16.11**: الواجهة MUST تعمل بلوحة مفاتيح كاملة على الديسكتوب: `F2` بحث، `+`/`-` كمية، `F9` إتمام، `Esc` إلغاء، مع عرضها كتلميحات.
- **FR-16.12**: صلاحيات الكاشير MUST تُحترم: بلا `discounts.apply` تُخفى حقول الخصم؛ بلا `orders.refund` يُخفى مسار الاسترجاع.

## 5. الكيانات والحالات (Key Entities & States)

- **CashRegister**: `location`, `name`, `is_active`. وردية مفتوحة واحدة لكل جهاز.
- **Shift**: `status`: `open` مفتوحة · `pending_manager_approval` بانتظار اعتماد المدير · `closed` مغلقة · `force_closed` مغلقة قسرياً. حقول: `opening_float`, `expected_closing`, `actual_closing`, `variance`. الانتقال: `open → closed` (فرق ≥ 0) · `open → pending_manager_approval` (عجز) · `pending_manager_approval → closed` (قرار المدير) · `open → force_closed` (النظام).
- **ShiftCashMovement**: `movement_type`: `sale` بيع · `cash_in` إدخال نقد · `cash_out` سحب نقد · `refund` استرجاع · `rounding_adjustment` تعديل تقريب.
- **OTPChallenge**: `shift_step_up` · `large_refund` · `customer_phone_change`.
- **Order (إيصال POS)**: `sales_channel=pos`, `source_location`, `created_by_staff`, `idempotency_key`, `payment_status`, `display_total`.
- **ApprovalRequest**: `shift_shortage` · `discount_exception` بحالات `pending` · `approved` · `rejected`.
- **Role.max_discount_percent**: سقف الخصم للدور.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/pos` (دخول الموظف + اختيار الموقع/الجهاز + فتح الوردية) · `/pos/sell` (بحث أعلى، شبكة نتائج/تصنيفات في المنتصف، سلة ثابتة بالجهة البادئة بإجمالي كبير Mono) · `/pos/drawer` (حركات الكاش + إضافة حركة) · `/pos/shift/close` (معاينة ثم عدّ فعلي) · `/pos/receipts` (إيصالات الوردية الحالية بحث برقم) · `/pos/receipts/[id]` (إيصال/طباعة/استرجاع).
- **الحالات البصرية**: skeleton للشبكة · فراغ «لا نتائج لهذا البحث» · «لا أجهزة كاش في هذا الموقع — أضفها من المواقع» · خطأ شبكة مع شريط «غير متصل» ثابت · بلا صلاحية · وردية `pending_manager_approval` تقفل البيع وتعرض سببه.
- **الجوال/التابلت**: 768px هو الهدف الأول (تابلت أفقي: شبكة + سلة جنباً إلى جنب)؛ على 390px السلة ورقة سفلية (Vaul) بشارة عدد العناصر.
- **اختصارات**: `F2` · `F9` · `Esc` · `Ctrl+K` بحث منتج/إيصال.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| أجهزة الكاش لموقع الموظف | ضمن `shift_hub` HTML | `[NEEDS BACKEND]` → `GET /api/v1/pos/registers/?location` → `[{id, name, is_active, open_shift:{id, staff_name, opened_at}\|null}]` |
| فتح وردية | `open_shift` POST | `[NEEDS BACKEND]` → `POST /api/v1/pos/shifts/` `{register_id, opening_float}` → `{id, status, opened_at}` |
| الوردية الحالية + ملخصها | `cash_drawer` HTML | `[NEEDS BACKEND]` → `GET /api/v1/pos/shifts/current/` → `{id, status, register, display_opening_float, display_expected_closing, movements:[{id, movement_type, display_amount, note, created_at}]}` |
| إضافة حركة كاش | `add_cash_movement` POST | `[NEEDS BACKEND]` → `POST /api/v1/pos/shifts/<id>/movements/` `{movement_type, amount, note, idempotency_key}` |
| إغلاق وردية | `close_shift` POST | `[NEEDS BACKEND]` → `POST /api/v1/pos/shifts/<id>/close/` `{actual_closing}` → `{status, display_variance, approval_id?}` |
| حلّ فرق الوردية (مدير) | `resolve_shift_variance` POST | `[NEEDS BACKEND]` → `POST /api/v1/pos/shifts/<id>/resolve-variance/` `{decision, version}` |
| بحث منتجات للبيع (باركود/SKU/اسم) | `product_list_hub` HTML؛ `/api/v1/catalog/products/?search` عام | Ready جزئياً؛ يُضاف `?barcode=` و`stock` للموقع → `GET /api/v1/pos/products/?q&barcode&location` |
| إنشاء إيصال POS | `create_order` POST | `[NEEDS BACKEND]` → `POST /api/v1/pos/orders/` `{register_id, items:[{product_id, variant_id?, quantity, discount_percent?}], cart_discount_percent?, payment_method, idempotency_key}` → `{id, display_total, receipt}` |
| استرجاع من POS + OTP | `order_refund_form` POST | `[NEEDS BACKEND]` → `POST /api/v1/pos/orders/<id>/refund/` `{amount, otp_code?}` → 428 عند الحاجة لـ OTP |
| حد الخصم للدور الفعّال | `Role.max_discount_percent` | `[NEEDS BACKEND]` → ضمن `GET /api/v1/me/` (M18) `{permissions:[], max_discount_percent}` |

## 8. الحالات الحدّية (Edge Cases)

- موظف معيَّن على موقعَين: يختار الموقع أولاً؛ الأجهزة تُفلتر به.
- جهاز الكاش عُطِّل (`is_active=false`) أثناء وردية مفتوحة: تستمر الوردية حتى الإغلاق ويُمنع فتح جديدة عليه.
- منتج `allow_backorder=false` ومخزون الموقع صفر: يُعرض معطَّلاً مع «نفد في هذا الفرع».
- منتج `is_bookable` أو `is_auction`: مخفي من شبكة POS (لا يُباع من الكاشير).
- عملة الطلب تختلف عن عملة المتجر: يُعرض ما يرسله الخادم بلا تحويل محلي.
- إغلاق المتصفح مع وردية مفتوحة: تبقى مفتوحة على الخادم؛ عند العودة تُستكمل.
- OTP فشل 3 مرات: يُقفل الاسترجاع مؤقتاً بالرسالة التي يرسلها الخادم.

## 9. معايير النجاح (Success Criteria)

- **SC-16.1**: من مسح الباركود إلى ظهور العنصر في السلة ≤ 300ms؛ عملية بيع كاملة بـ 3 عناصر ≤ 20 ثانية.
- **SC-16.2**: 100% من عناصر التفاعل ≥ 48px على التابلت؛ صفر تمرير أفقي على 768–1440px.
- **SC-16.3**: صفر طلبات مكررة عند انقطاع الشبكة في اختبار 20 محاولة.
- **SC-16.4**: كل تجاوز حد خصم يُنتج مسار اعتماد مقروءاً (لا خطأ خام) في 100% من الحالات.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M18 (تسجيل الموظف، الصلاحيات، الموافقات)، M22 (المواقع وأجهزة الكاش)، M04 (المنتجات)، M06 (الإيصال = Order)، M30 (إرسال الإيصال عبر الواتساب).
- افتراض: حد «الاسترجاع الكبير» الذي يستدعي OTP يحدده الخادم (يُرجع 428) لا العميل.
- افتراض: الدفع في POS نقدي أو عبر `sharwa_pay`/بوابة حسب ما يفعّله المتجر؛ البطاقات الفيزيائية خارج النطاق حالياً.
- افتراض: الإجمالي الجاري يُحسب على الخادم عبر endpoint معاينة؛ حتى توفره يُعرض مجموع مبدئي بعلامة «تقديري» ويُستبدل بإيصال الخادم.
- افتراض: الوردية مرتبطة بجهاز الكاش وبالموظف؛ لا تناوب موظفَين على وردية واحدة.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا شبكة منتجات ببطاقات متماثلة بأيقونات؛ البطاقات نص + سعر Mono + صورة فعلية بحد 1px. لا ألوان صاخبة لأزرار الدفع؛ زر «إتمام» أسود/أبيض بحجم كبير. حالات الوردية بنص ونقطة دلالية فقط.
- II: الإجمالي والمبالغ Mono محاذاة نهاية؛ السلة في الجهة البادئة (يمين RTL)؛ أرقام الإيصال والـ SKU Mono؛ أسهم «السابق/التالي» في اختيار المتغير تنعكس.
- IV: لقطات `docs/visual-checks/16-pos/{tablet,desktop,mobile,tablet-dark}.png` لشاشة البيع (فارغة/ممتلئة)، درج الكاش، وإغلاق الوردية بعجز.
- IX: السلة في Zustand مع persistence مُفتاح بالمستأجر؛ كل استجابة عبر Zod؛ لا `any`.
