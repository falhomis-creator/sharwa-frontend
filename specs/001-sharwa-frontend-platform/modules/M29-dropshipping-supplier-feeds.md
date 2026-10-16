# M29 — الدروبشيبينغ وملفات الموردين (Dropshipping & Supplier Feeds)

**Route group**: `(dashboard)` · **Priority**: P3 · **Backend status**: HTML-only `[NEEDS BACKEND]` (`dropshipping_hub`, pricing rules, feeds new/mapping/preview/approve/run/errors, connect/disconnect, settings, inventory sync, webhook rotate, orders, catalog, products, job status)
**Discovery refs**: `02-products-domain-model.md` §14.C (SUPPLIER_CODE, SupplierConnection, SupplierSyncJob, PricingRule, SupplierProduct, SupplierVariant, FeedMapping, DropshipStockHold, SupplierOrder), §8 (`Fulfillment.forwarded_to_supplier`, `DropshipForwardLog`, `Location.ownership=dropship_supplier`), §10 (صلاحية `channels.dropshipping.manage`) · `01-tenants-dashboard-admin.md` §2.4 (`FEED_EXTENSIONS = csv,tsv,txt,xlsx`), §3.2 (Dropshipping), §4 («استيراد المنتجات والدروبشيبينغ»), §7 (ميزة `dropshipping`) · `03-*.md` §6 (`/webhooks/suppliers/<code>/<token>/`) · **Benchmarks**: Shopify DSers/Oberlo (استعراض كتالوج المورد والاستيراد بنقرة — بنسخة منظَّفة بلا زخرفة)، Linear (خطوات معالج واضحة مرقَّمة، حالات نصية)

## 1. الهدف (Purpose)

تمكين التاجر من ربط موردي دروبشيبينغ (CJ، مخازن، كنوات، أو ملف مسطّح)، استيراد منتجاتهم بقواعد تسعير واضحة، ومتابعة طلبات الموردين من الإرسال إلى التسليم، مع معالج ملفات يحوّل أي CSV/XLSX إلى منتجات. يُقاس بزمن استيراد أول 50 منتجاً وبنسبة طلبات الموردين التي تحتاج تدخلاً.

## 2. الفاعلون (Actors)

- **مالك المتجر / موظف بصلاحية `channels.dropshipping.manage`**: يربط الموردين، يضبط التسعير، يستورد، يُدير الملفات، يتابع طلبات الموردين.
- **النظام**: يشغّل المزامنة بفواصلها، يُطبّق قواعد التسعير، يُحيل التنفيذ إلى المورد (`forwarded_to_supplier`)، يستقبل webhooks الموردين.
- **المورد**: يقبل/يرفض/يشحن طلبات الموردين.

## 3. قصص المستخدم (User Stories)

### US-29.1 — ربط مورد وضبط المزامنة (P1)
يربط التاجر مورداً (`cj` · `makhazen` · `knawat`) ببيانات اعتماده أو يُنشئ اتصال `flat_feed`، ويضبط مفاتيح المزامنة (المنتجات/الأسعار/المخزون) وفواصلها واحتياطي المخزون وإخفاء النافد.
**Independent Test**: بعد الربط تظهر بطاقة المورد بحالة «مربوط»، آخر مزامنة، وأزرار «مزامنة المخزون الآن» و«فصل».
**Acceptance**:
1. **Given** مورد غير مربوط، **When** تُدخل بيانات الاعتماد وتُحفظ، **Then** يُعرض «مربوط» ولا تُعرض الأسرار مجدداً.
2. **Given** `hide_when_out_of_stock` مفعّل، **Then** تلميح «سيُخفى المنتج من المتجر عند نفاد مخزون المورد».
3. **Given** زر «تدوير رمز Webhook», **When** يُضغط، **Then** تأكيد ثم يُعرض الرابط الجديد `/webhooks/suppliers/<code>/<token>/` مرة واحدة مع زر نسخ.

### US-29.2 — قواعد التسعير مع المحاكاة (P1)
يُعرّف التاجر قواعد (نطاق، نسبة هامش، تقريب، مصدر سعر الصرف) ويحاكي أثرها على عيّنة قبل التطبيق.
**Independent Test**: قاعدة هامش 30% وتقريب `end_99` → المحاكاة تعرض أسعاراً «قبل/بعد» من الخادم وتنتهي بـ .99.
**Acceptance**:
1. **Given** قاعدة جديدة، **When** يُضغط «محاكاة»، **Then** جدول عيّنة (المنتج، تكلفة المورد، السعر الحالي، السعر بعد القاعدة) بقيم `display_*` من الخادم.
2. **Given** المحاكاة مقبولة، **When** يُضغط «تطبيق»، **Then** معاينة بعدد المنتجات المتأثرة ثم تقرير بعد التطبيق.
3. **Given** قاعدتان متداخلتان في النطاق، **Then** يُعرض ترتيب الأولوية كما يحدده الخادم.

### US-29.3 — استعراض كتالوج المورد والاستيراد (P1)
يتصفح التاجر منتجات المورد بالبحث والفئة، يرى حالة الاستيراد لكل منتج، ويستورد فردياً أو جماعياً.
**Acceptance**:
1. **Given** كتالوج المورد، **When** يُفتح، **Then** شبكة/جدول بالمنتج، تكلفة المورد (`display_*`)، السعر المقترح بعد القواعد، المتغيرات (عدد)، الحالة (`not_imported` · `importing` · `imported` · `failed`).
2. **Given** 40 منتجاً محدداً، **When** يُضغط «استيراد»، **Then** معاينة بالعدد ثم تتحوّل الحالات إلى `importing` وتُستطلع حتى الانتهاء.
3. **Given** `imported`, **Then** رابط «افتح في المنتجات» (M04).

### US-29.4 — معالج الملفات (Feed Wizard) (P1)
يرفع التاجر ملفاً (`csv` · `tsv` · `txt` · `xlsx`) أو يُدخل رابطاً، يربط أعمدته بالحقول العشرين، يرى معاينة، يعتمد، يشغّل، ينزّل أخطاء CSV، ويضبط جدولة للتكرار.
**Independent Test**: ملف بـ 5 أعمدة تُربط 3 منها → المعاينة تعرض 10 صفوف محوَّلة وتُعلّم الأعمدة الإلزامية الناقصة.
**Acceptance**:
1. **Given** الخطوة 1 (المصدر)، **When** يُرفع ملف بامتداد غير مدعوم، **Then** يُرفض محلياً برسالة الامتدادات المسموحة.
2. **Given** الخطوة 2 (الربط)، **Then** لكل حقل من العشرين قائمة اختيار عمود مع اكتشاف تلقائي بالاسم، والإلزامية مُعلَّمة؛ لا يُتاح «التالي» قبل ربط الإلزامية.
3. **Given** الخطوة 3 (المعاينة)، **Then** أول 10 صفوف بعد التحويل من الخادم مع عدّاد الأخطاء Mono.
4. **Given** الخطوة 4 (الاعتماد والتشغيل)، **When** يُشغَّل، **Then** تُعرض مهمة بحالتها وعند الانتهاء زر «تنزيل أخطاء CSV» وخيار جدولة (تكرار بفاصل).

### US-29.5 — طلبات الموردين (P1)
يرى التاجر طلبات الموردين بحالاتها العشر مع مجموعة «تحتاج انتباهاً» في الأعلى، ويفتح الطلب الأصلي في M06.
**Acceptance**:
1. **Given** طلبات `held` · `rejected` · `failed`, **Then** تُجمع في قسم «تحتاج انتباهاً» بعدّاد Mono وسبب الخادم لكل منها.
2. **Given** طلب `shipped` برقم تتبع من المورد، **Then** يُعرض الرقم Mono قابلاً للنسخ.

### US-29.6 — مهام المزامنة (P2)
يرى التاجر سجل `SupplierSyncJob` بالنوع والحالة والمدة، ويُعيد تشغيل الفاشل.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-29.01**: الوحدة MUST تُخفى حين تكون ميزة `dropshipping` معطّلة وتُقيَّد بصلاحية `channels.dropshipping.manage`.
- **FR-29.02**: شاشة الموردين MUST تعرض الموردين الأربعة كصفوف بحالة الربط (لا 4 بطاقات متماثلة بشعارات).
- **FR-29.03**: أسرار الاعتماد ورموز Webhook MUST لا تُعرض بعد الحفظ؛ الرمز الجديد يُعرض مرة واحدة بعد التدوير.
- **FR-29.04**: قواعد التسعير MUST تمرّ بـ محاكاة → تطبيق؛ كل الأسعار المعروضة من `display_*` الخادم؛ يُمنع تطبيق الهامش/التقريب محلياً.
- **FR-29.05**: كتالوج المورد MUST يدعم ترقيماً خادمياً وبحثاً وفلاتر الحالة، واستيراداً جماعياً بمعاينة واستطلاع الحالات حتى الانتهاء.
- **FR-29.06**: معالج الملفات MUST يكون 4 خطوات مرقَّمة (المصدر · الربط · المعاينة · التشغيل) بحالة الخطوة في الرابط، ويمنع التقدّم قبل اكتمال الإلزامي، ويحفظ `FeedMapping` لإعادة الاستخدام.
- **FR-29.07**: التحقق من امتداد الملف MUST يكون محلياً وفق `FEED_EXTENSIONS` ثم يُعاد على الخادم.
- **FR-29.08**: طلبات الموردين MUST تُعرض بالحالات العشر بتسميات عربية ثابتة، مع مجموعة الانتباه (`held` · `rejected` · `failed`) مفصولة في الأعلى وفلاتر في الرابط.
- **FR-29.09**: المهام الجارية MUST تُستطلع كل 10 ثوانٍ وتتوقف عند الانتهاء أو إخفاء التبويب.
- **FR-29.10**: كل خطأ من المورد MUST يُعرض كما يرسله الخادم بلا تفسير محلي.

## 5. الكيانات والحالات (Key Entities & States)

- **SupplierConnection**: `supplier_code` `cj` · `makhazen` مخازن · `knawat` كنوات · `flat_feed` ملف مسطّح؛ مفاتيح مزامنة وفواصلها، `stock_buffer`, `hide_when_out_of_stock`, رمز webhook.
- **PricingRule**: النطاق، `markup_percent`, التقريب `none` بلا · `nearest_1` لأقرب 1 · `end_99` ينتهي بـ .99 · `end_95` ينتهي بـ .95 · `end_00` ينتهي بـ .00، مصدر سعر الصرف.
- **SupplierProduct**: `import_status` `not_imported` غير مستورد · `importing` قيد الاستيراد · `imported` مستورد · `failed` فشل؛ **SupplierVariant**.
- **FeedMapping**: المصدر (ملف/رابط)، ربط 20 عموداً، الجدولة. **SupplierSyncJob**: نوع، حالة، مدة، أخطاء CSV.
- **DropshipStockHold**: حجز مخزون المورد لطلب جارٍ.
- **SupplierOrder.status**: `queued` في الانتظار · `held` محجوز · `submitted` مُرسَل · `accepted` مقبول · `processing` قيد المعالجة · `shipped` شُحن · `delivered` سُلِّم · `cancelled` ملغي · `rejected` مرفوض · `failed` فشل. مجموعة الانتباه: `held` · `rejected` · `failed`.
- **Fulfillment.forwarded_to_supplier** + **DropshipForwardLog**: أثر الإحالة في M06.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/dropshipping` (الموردون + آخر المهام + عدّاد الانتباه) · `/dashboard/dropshipping/suppliers/[code]` (الإعدادات، webhook) · `/dashboard/dropshipping/pricing-rules` (+ sheet محاكاة) · `/dashboard/dropshipping/catalog/[code]` · `/dashboard/dropshipping/feeds` + `/feeds/new?step=1..4` + `/feeds/[id]` · `/dashboard/dropshipping/orders` · `/dashboard/dropshipping/jobs`.
- **الحالات البصرية**: skeleton · فراغ «لم تربط مورداً بعد» / «لا قواعد تسعير — ستُستورد المنتجات بتكلفة المورد» / «لا طلبات موردين» · خطأ ربط · بلا صلاحية · الميزة معطّلة · ملف قيد المعالجة (نص + نقطة نابضة).
- **الجوال**: المعالج خطوة واحدة لكل شاشة بشريط خطوات نصي «2 من 4»؛ الكتالوج بطاقات؛ ربط الأعمدة قائمة عمودية.
- **اختصارات**: `⌘K` → «طلب مورد #…» / «مورد: CJ»؛ `N` ملف جديد.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| حالة الموردين | `dropshipping_hub` HTML | `[NEEDS BACKEND]` → `GET /api/v1/dropshipping/suppliers/` → `[{supplier_code, connected, last_sync_at, settings:{…}, attention_count}]` |
| ربط/فصل/إعدادات | connect/disconnect/settings POST | `[NEEDS BACKEND]` → `POST /api/v1/dropshipping/suppliers/<code>/connect/` `{credentials}`؛ `POST /disconnect/`؛ `GET/PUT /settings/` `{sync_products, sync_prices, sync_inventory, intervals, stock_buffer, hide_when_out_of_stock}` |
| مزامنة المخزون الآن | inventory sync POST | `[NEEDS BACKEND]` → `POST /api/v1/dropshipping/suppliers/<code>/sync-inventory/` → `{job_id}` |
| تدوير رمز Webhook | webhook rotate POST | `[NEEDS BACKEND]` → `POST /api/v1/dropshipping/suppliers/<code>/webhook/rotate/` → `{webhook_url}` (مرة واحدة) |
| قواعد التسعير CRUD | pricing rules views | `[NEEDS BACKEND]` → `GET/POST /api/v1/dropshipping/pricing-rules/`, `PATCH/DELETE /<id>/` |
| محاكاة / تطبيق قاعدة | — | `[NEEDS BACKEND]` → `POST /api/v1/dropshipping/pricing-rules/simulate/` `{rule}` → `{sample:[{product, display_cost, display_current, display_after}], affected_count}`؛ `POST /<id>/apply/` → `{updated}` |
| كتالوج المورد | catalog views | `[NEEDS BACKEND]` → `GET /api/v1/dropshipping/suppliers/<code>/catalog/?q&category&import_status&page` → `{count, results:[{id, name, image, display_cost, display_suggested_price, variants_count, import_status, product_id}]}` |
| استيراد منتجات | products views POST | `[NEEDS BACKEND]` → `POST /api/v1/dropshipping/suppliers/<code>/import/` `{supplier_product_ids:[]}` → `{job_id}` |
| ملفات: إنشاء/ربط/معاينة/اعتماد/تشغيل/أخطاء/جدولة | feeds new/mapping/preview/approve/run/errors | `[NEEDS BACKEND]` → `POST /api/v1/dropshipping/feeds/` (multipart أو `{url}`) → `{feed_id, columns:[]}`؛ `PUT /feeds/<id>/mapping/` `{mapping:{field: column}}`؛ `GET /feeds/<id>/preview/` → `{rows:[], errors_count}`؛ `POST /feeds/<id>/approve/`؛ `POST /feeds/<id>/run/` → `{job_id}`؛ `GET /feeds/<id>/errors.csv`؛ `PATCH /feeds/<id>/` `{schedule_interval}` |
| طلبات الموردين | orders views | `[NEEDS BACKEND]` → `GET /api/v1/dropshipping/orders/?status&supplier&attention&page` → `{count, results:[{id, order_id, order_number, supplier_code, status, supplier_reference, tracking_number, display_cost, last_error, updated_at}]}` |
| مهام المزامنة + حالة | job status JSON | Ready جزئياً → `GET /api/v1/dropshipping/jobs/?supplier&status`, `GET /jobs/<id>/`, `POST /jobs/<id>/retry/` |

## 8. الحالات الحدّية (Edge Cases)

- منتج مستورد حُذف من كتالوج المورد: يُعرض في M04 بشارة «غير متوفر لدى المورد» حسب الخادم؛ هنا `imported` مع تلميح.
- ملف XLSX بأوراق متعددة: يُستخدم ما يُرجعه الخادم؛ الواجهة تعرض اسم الورقة إن أُرجع.
- عمود واحد مربوط بحقلَين: يُمنع محلياً («العمود مستخدم في حقل آخر»).
- رابط ملف يتطلب مصادقة: خطأ الخادم كما هو مع «جرّب الرفع المباشر».
- طلب مورد `held` بسبب `DropshipStockHold` منتهٍ: يُعرض سبب الخادم وزر «إعادة الإرسال» إن أتاحه.
- قاعدة تسعير تُنتج سعراً أقل من التكلفة: الخادم يرفض أو يحذّر؛ الواجهة تعرض التحذير بلون دلالي.

## 9. معايير النجاح (Success Criteria)

- **SC-29.1**: استيراد 50 منتجاً من كتالوج مورد ≤ 3 دقائق بما فيها المحاكاة.
- **SC-29.2**: إكمال معالج الملفات لملف صحيح ≤ 5 دقائق؛ كل خطأ ربط يُعرض قبل التشغيل.
- **SC-29.3**: 100% من الأسعار المعروضة من الخادم؛ صفر تقريب محلي.
- **SC-29.4**: مجموعة الانتباه تطابق عدد `held+rejected+failed` من الخادم 100%.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M04 (المنتجات المستوردة)، M06 (الطلبات والإحالة إلى المورد)، M21 (المخزون)، M22 (موقع `dropship_supplier`)، M18 (الصلاحيات)، M03.
- افتراض: قيم «نطاق القاعدة» و«مصدر سعر الصرف» و«نوع مهمة المزامنة» تُؤخذ كما يرسلها الخادم في العقد؛ الواجهة لا تفترض enum لها.
- افتراض: الحقول العشرون للربط تُقرأ من الخادم (قائمة بأسمائها وإلزاميتها) لا من ثابت محلي.
- افتراض: الجدولة بفاصل زمني بسيط (يومي/أسبوعي أو ساعات) كما يدعمه الخادم.
- افتراض: الاستيراد يُنشئ منتجات بـ `ownership=dropship_supplier` موقعاً مرتبطاً؛ تفاصيل ذلك على الخادم.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا بطاقات موردين أربع متماثلة بشعارات؛ صفوف نصية بحالة؛ شريط خطوات المعالج نصي مرقَّم بخط Mono (01/02/03/04) بلا دوائر ملونة متصلة؛ حالات الطلبات نص + نقطة دلالية؛ لا صور منتجات مكدّسة بزخرفة.
- II: التكاليف والأسعار وأرقام التتبع Mono محاذاة نهاية؛ أسماء الأعمدة اللاتينية في الربط داخل `dir="ltr"`؛ أسهم «التالي/السابق» في المعالج تنعكس.
- IV: لقطات `docs/visual-checks/29-dropshipping/{desktop,tablet,mobile,desktop-dark}.png` لصفحة الموردين، خطوة الربط في المعالج، ومحاكاة التسعير، وطلبات الموردين مع مجموعة الانتباه.
- IX: رفع الملف عبر multipart مع تقدّم نصي؛ استطلاع المهام عبر TanStack Query؛ حالة المعالج في الرابط عبر nuqs.
