# M23 — الموردون وأوامر الشراء (Suppliers & Purchase Orders)

**Route group**: `(dashboard)` · **Priority**: P3 · **Backend status**: HTML-only `[NEEDS BACKEND]` (`supplier_list`, `purchase_order_list|create|detail|cancel|submit|resolve|receive`)
**Discovery refs**: `02-products-domain-model.md` §14.D (Supplier, PurchaseOrder, PurchaseOrderLineItem), §10 (Approvals `po_approval`, صلاحيات `suppliers.manage` · `suppliers.approve`), §9 (`StockMovement.po_received`), §8 (LocationInventory) · `01-tenants-dashboard-admin.md` §3.2, §4 («الموردون وأوامر الشراء») · **Benchmarks**: Linear (لوحة حالات بأعمدة وتنقّل بلوحة المفاتيح)، Shopify Purchase Orders (سطور مطلوب/مستلَم، استلام جزئي، تكلفة الوحدة)، Stripe (جدول واضح للمبالغ)

## 1. الهدف (Purpose)

تمكين التاجر وأمين المخزن من تسجيل الموردين وإنشاء أوامر شراء تمرّ بموافقة ثم تُستلم كلياً أو جزئياً فتُحدَّث الكميات تلقائياً في المخزون. يُقاس بزمن إنشاء أمر الشراء وبنسبة الأوامر المستلَمة بلا تعديل يدوي للمخزون.

## 2. الفاعلون (Actors)

- **موظف بصلاحية `suppliers.manage`** (أمين مخزن/مدير): CRUD الموردين، إنشاء مسودات، إرسالها للموافقة، تسجيل الاستلام.
- **معتمِد بصلاحية `suppliers.approve`**: يقبل/يرفض `ApprovalRequest(po_approval)`.
- **مالك المتجر**: كل ما سبق.
- **النظام**: يسجّل `StockMovement(reason=po_received)` عند الاستلام.

## 3. قصص المستخدم (User Stories)

### US-23.1 — إدارة الموردين (P1)
يُنشئ الموظف مورداً ويُعدّله، ويرى أوامر الشراء المرتبطة به.
**Independent Test**: إنشاء مورد ثم فتح تفاصيله يعرض 0 أوامر وزر «أمر شراء جديد» بالمورد مُعبَّأ.
**Acceptance**:
1. **Given** نموذج المورد (حقول `SupplierForm`) صالح، **When** يُحفظ، **Then** يظهر في القائمة فوراً ويمكن البحث باسمه.
2. **Given** مورد له أوامر غير ملغاة، **When** يُحاول حذفه، **Then** يُمنع مع تلميح عدد الأوامر المرتبطة.

### US-23.2 — إنشاء أمر شراء وإرساله للموافقة (P1)
يختار الموظف المورد وموقع الاستلام ويضيف سطوراً (منتج/متغير، كمية مطلوبة، تكلفة الوحدة) ثم يحفظ مسودة أو يُرسلها للموافقة.
**Independent Test**: مسودة بسطرَين تُرسل → تظهر في لوحة الحالات تحت «بانتظار الموافقة» وفي M18 كطلب `po_approval`.
**Acceptance**:
1. **Given** مسودة بلا سطور، **When** يُضغط «إرسال للموافقة»، **Then** يُمنع مع «أضف سطراً واحداً على الأقل».
2. **Given** مسودة صالحة، **When** تُرسل، **Then** تصير `pending_approval` ويُعرض معرّف الموافقة؛ التعديل يُقفل.
3. **Given** إجمالي الأمر، **Then** يُعرض كما يرسله الخادم (`display_total`) لا محسوباً محلياً.

### US-23.3 — الموافقة أو الرفض (P1)
يرى المعتمِد الأمر كاملاً ويقرّر؛ الرفض يعيده مسودة قابلة للتعديل.
**Acceptance**:
1. **Given** `pending_approval` ومستخدم بـ`suppliers.approve`, **When** يضغط «اعتماد»، **Then** تصير `approved` ويظهر اسم المعتمِد والوقت في الجدول الزمني.
2. **Given** تضارب `version`, **When** يُرسل القرار، **Then** تُعرض «حُدِّث الأمر من مستخدم آخر» مع إعادة التحميل.

### US-23.4 — الاستلام الكلي أو الجزئي (P1)
يسجّل أمين المخزن الكميات المستلَمة لكل سطر؛ الخادم يحدّث المخزون ويقرر `partially_received` أو `received`.
**Independent Test**: أمر بسطر كمية 10، استلام 4 → `partially_received` وسطر `StockMovement(po_received, 4)` ظاهر في M21.
**Acceptance**:
1. **Given** أمر `approved`, **When** تُفتح شاشة الاستلام، **Then** لكل سطر: المطلوب، المستلَم سابقاً، حقل «المستلَم الآن» بحد أقصى المتبقي.
2. **Given** استلام كل المتبقي، **When** يُرسل، **Then** تصير `received` وتُقفل.
3. **Given** استلام جزئي، **Then** يُعرض شريط تقدّم نصي «استُلم 4 من 10» لكل سطر.

### US-23.5 — لوحة حالات أوامر الشراء (P2)
يرى التاجر الأوامر في أعمدة بحسب الحالة (نمط Linear) أو كجدول، مع فلترة بالمورد والموقع والنطاق الزمني.
**Acceptance**:
1. **Given** 40 أمراً، **When** تُفتح اللوحة، **Then** 6 أعمدة بعدّاد Mono لكل عمود، والبطاقة تعرض الرقم Mono والمورد والإجمالي وتاريخ الإنشاء.
2. **Given** التبديل جدول/لوحة، **Then** يُحفظ في الرابط.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-23.01**: الوحدة MUST تظهر في الشريط تحت «المنتجات → الموردون وأوامر الشراء» لمن يحمل `suppliers.manage` أو `suppliers.approve`.
- **FR-23.02**: الموردون MUST يُداروا بجدول + sheet جانبي (React Hook Form + Zod) بحقول `SupplierForm` كما يعرّفها الخادم.
- **FR-23.03**: أمر الشراء MUST يُنشأ بنموذج سطور قابلة للإضافة/الحذف بالبحث عن المنتج/المتغير (SKU، اسم) وكمية وتكلفة وحدة؛ يُسمح بالحفظ كمسودة بلا إرسال.
- **FR-23.04**: الانتقالات MUST تُقيَّد بالأزرار المتاحة لكل حالة: `draft` → إرسال/إلغاء · `pending_approval` → اعتماد/رفض (للمعتمِد) أو إلغاء · `approved`/`partially_received` → استلام/إلغاء · `received`/`cancelled` للقراءة فقط.
- **FR-23.05**: كل قرار موافقة MUST يُرسل `version` ويعالج 409 تفاعلياً.
- **FR-23.06**: شاشة الاستلام MUST تمنع تجاوز المتبقي محلياً وتُعيد التحقق على الخادم؛ وتُظهر الموقع الذي سيُحدَّث مخزونه.
- **FR-23.07**: المبالغ (تكلفة الوحدة، إجمالي السطر، إجمالي الأمر) MUST تُعرض من `display_*` الخادم Mono محاذاة نهاية.
- **FR-23.08**: التفاصيل MUST تضم جدولاً زمنياً: إنشاء، إرسال، قرار الموافقة (مع المعتمِد)، كل استلام (كميات + موظف)، إلغاء.
- **FR-23.09**: الفلاتر (الحالة، المورد، الموقع، التاريخ، `q`) ونمط العرض MUST تعيش في الرابط.

## 5. الكيانات والحالات (Key Entities & States)

- **Supplier**: حقول `SupplierForm` (الاسم وبيانات التواصل كما في الخادم).
- **PurchaseOrder**: `supplier`, الموقع المستلِم, `status`: `draft` مسودة · `pending_approval` بانتظار الموافقة · `approved` معتمد · `partially_received` مستلَم جزئياً · `received` مستلَم · `cancelled` ملغي؛ `version`.
- **PurchaseOrderLineItem**: المنتج/المتغير، الكمية المطلوبة، الكمية المستلَمة، تكلفة الوحدة.
- **ApprovalRequest** (`po_approval`): `pending` · `approved` · `rejected`؛ `approver_role`, `version`.
- **StockMovement** (`po_received`): يُنشأ لكل كمية مستلَمة (يُعرض في M21).
- قواعد: الرفض يعيد الأمر `draft`؛ `cancelled` نهائي؛ الاستلام متاح من `approved` و`partially_received` فقط.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/suppliers` (الموردون + sheet) · `/dashboard/suppliers/[id]` · `/dashboard/purchase-orders` (لوحة أعمدة/جدول) · `/dashboard/purchase-orders/new` · `/dashboard/purchase-orders/[id]` (تفاصيل + جدول زمني) · `/dashboard/purchase-orders/[id]/receive`.
- **الحالات البصرية**: skeleton · فراغ «لا موردين بعد» / «لا أوامر شراء — أنشئ أول أمر» · خطأ · بلا صلاحية (المعتمِد يرى القائمة للقراءة بلا إنشاء) · عمود فارغ في اللوحة بنص «لا شيء هنا».
- **الجوال**: اللوحة → تبويبات حالة أفقية قابلة للتمرير مع قائمة بطاقات؛ شاشة الاستلام حقول كبيرة بأزرار ± للكمية.
- **اختصارات**: `⌘K` → «أمر شراء #…»؛ `N` أمر جديد؛ `J/K` تنقّل بين البطاقات.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| الموردون CRUD | `supplier_list` HTML + `SupplierForm` | `[NEEDS BACKEND]` → `GET/POST /api/v1/suppliers/`, `GET/PATCH/DELETE /api/v1/suppliers/<id>/` |
| قائمة أوامر الشراء مفلترة | `purchase_order_list` HTML | `[NEEDS BACKEND]` → `GET /api/v1/purchase-orders/?status&supplier&location&from&to&q&page` → `{count, results:[{id, number, supplier:{id,name}, location:{id,name}, status, display_total, lines_count, created_at}]}` |
| إنشاء/تعديل مسودة | `purchase_order_create` POST + `PurchaseOrderForm` | `[NEEDS BACKEND]` → `POST /api/v1/purchase-orders/` `{supplier_id, location_id, notes?, lines:[{product_id, variant_id?, quantity_ordered, unit_cost}]}`, `PATCH /<id>/` للمسودة فقط |
| تفاصيل الأمر + الجدول الزمني | `purchase_order_detail` HTML | `[NEEDS BACKEND]` → `GET /api/v1/purchase-orders/<id>/` → `{…, version, lines:[{id, product_name, sku, quantity_ordered, quantity_received, display_unit_cost, display_line_total}], approval:{id,status,approver}?, timeline:[]}` |
| إرسال للموافقة | `purchase_order_submit` POST | `[NEEDS BACKEND]` → `POST /api/v1/purchase-orders/<id>/submit/` → `{status, approval_id}` |
| قرار الموافقة | `purchase_order_resolve` POST / `resolve_approval` | `[NEEDS BACKEND]` → `POST /api/v1/purchase-orders/<id>/resolve/` `{decision: approve\|reject, version}` → 200/409 |
| تسجيل الاستلام | `purchase_order_receive` POST | `[NEEDS BACKEND]` → `POST /api/v1/purchase-orders/<id>/receive/` `{lines:[{line_id, quantity_received_now}], version}` → `{status, lines:[…]}` |
| إلغاء | `purchase_order_cancel` POST | `[NEEDS BACKEND]` → `POST /api/v1/purchase-orders/<id>/cancel/` `{version}` |
| بحث منتجات للسطور | `/api/v1/catalog/products/?search` | Ready جزئياً؛ يحتاج المتغيرات وSKU → يُوحَّد مع M04 |

## 8. الحالات الحدّية (Edge Cases)

- المتجر بلا `multi_location_enabled`: يُخفى اختيار الموقع ويُستخدم الافتراضي.
- منتج حُذف بعد إنشاء الأمر: يُعرض السطر من اللقطة مع شارة «محذوف» ويبقى الاستلام ممكناً حسب الخادم.
- كمية مستلَمة تتجاوز المطلوب (فائض من المورد): مرفوضة في الواجهة؛ تُعدَّل الكمية المطلوبة أولاً إن سمح الخادم (مسودة فقط).
- أمر `pending_approval` ومعتمِده عُطِّل: يبقى معلقاً؛ يُعرض تنبيه «لا معتمِد نشط لهذا الدور» من الخادم إن توفّر.
- تكلفة وحدة بعملة مختلفة عن المتجر: تُعرض كما يرسلها الخادم.

## 9. معايير النجاح (Success Criteria)

- **SC-23.1**: إنشاء أمر شراء بـ 3 سطور وإرساله ≤ 90 ثانية.
- **SC-23.2**: 100% من عمليات الاستلام تُنتج تحديث مخزون ظاهراً في M21 بلا تعديل يدوي.
- **SC-23.3**: صفر انتقالات حالة غير قانونية ممكنة من الواجهة (الأزرار مقيّدة بالحالة والصلاحية).
- **SC-23.4**: اللوحة بـ 100 أمر تُرسم في < 1s.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M04 (المنتجات/المتغيرات)، M21 (سجل المخزون)، M22 (المواقع)، M18 (الموافقات والصلاحيات)، M03 (الشريط).
- افتراض: حقول `Supplier` التفصيلية تُؤخذ من `SupplierForm` عند بناء العقد؛ الواجهة لا تفترض حقولاً إضافية.
- افتراض: الرفض يعيد الأمر إلى `draft` (لا حالة `rejected` منفصلة في enum الأمر).
- افتراض: الأمر يستلم في موقع واحد؛ الاستلام متعدد المواقع خارج النطاق.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لوحة الأعمدة بحدود 1px وبطاقات نصية بلا ألوان خلفية للحالة (نقطة دلالية + اسم)؛ لا أيقونات مورد في دوائر؛ شريط تقدّم الاستلام نصي أو خط 2px بلا تدرج.
- II: أرقام الأوامر والكميات والتكاليف Mono محاذاة نهاية؛ تمرير أعمدة اللوحة يبدأ من اليمين؛ أسهم «السابق/التالي» في المعالج تنعكس.
- IV: لقطات `docs/visual-checks/23-purchase-orders/{desktop,tablet,mobile,desktop-dark}.png` للوحة الأعمدة، التفاصيل، وشاشة الاستلام الجزئي.
