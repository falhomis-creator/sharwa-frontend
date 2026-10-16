# M21 — مركز المخزون ودفتر الحركات (Inventory Hub & Stock Ledger)

**Route group**: `(dashboard)` · **Priority**: P2 · **Backend status**: HTML-only `[NEEDS BACKEND]` (`inventory_hub`, `update_product_stock`, `product_analytics` قوالب Django؛ لا endpoint في `/api/v1`)
**Discovery refs**: `02-products-domain-model.md` §1 (`LOW_STOCK_THRESHOLD = 3`), §2 (حقول المخزون في `Product`/`ProductVariant`), §8 (`LocationInventory` وسلسلة الحقيقة), §9 (`stock.py`), §10 (صلاحيات `inventory.*`، موافقة `stock_writeoff`), §16 (Gotcha 3) · `01-tenants-dashboard-admin.md` §3.2 (Inventory/Locations), §4 (المخزون `[inventory]`) · **Benchmarks**: Shopify Inventory (جدول كمية واحد بتحرير سطري + سجل تعديلات لكل تغيير بسبب)، Saleor Stocks (مخزون لكل warehouse مع reserved/allocated منفصلَين)، Linear (كثافة الجدول والاختصارات)

## 1. الهدف (Purpose)

إعطاء التاجر وأمين المخزن رقماً واحداً صادقاً لكل منتج/متغير/موقع («كم لديّ فعلاً، وكم محجوز، وكم متاح للبيع») مع تاريخ كامل لكل تغيير وسببه، بحيث لا يُعدَّل مخزون قطّ بلا أثر. يُقاس بعدد التعديلات اليدوية بلا سبب (= صفر) وبزمن اكتشاف المنتج المنخفض.

## 2. الفاعلون (Actors)

- **مالك المتجر**: كل الصلاحيات، يرى الربحية (`cost_price`) ويعتمد الإعدام.
- **أمين مخزن** (دور نظامي: `orders.view, inventory.view, inventory.adjust, inventory.writeoff, reports.view`): يعدّل الكميات ويطلب الإعدام.
- **كاشير** (`inventory.view`): قراءة فقط لمخزون فرعه.
- **النظام**: يكتب حركات `sale` · `cancel_restock` · `refund_restock` · `po_received` من الطلبات (M06)، المرتجعات (M24)، وأوامر الشراء (M23).

## 3. قصص المستخدم (User Stories)

### US-21.1 — جدول المخزون كمصدر حقيقة واحد (P1)
يفتح أمين المخزن «المخزون» فيرى كل المنتجات ومتغيراتها في جدول كثيف: الكمية الفعلية، المحجوز، المتاح، وحدة القياس، حد التنبيه، والحالة (متوفر / منخفض / نفد / backorder مسموح)؛ مع فلترة بالموقع (إن فُعِّل `multi_location`)، التصنيف، والحالة، وبحث بالاسم/SKU/الباركود.
**Independent Test**: تحميل 1,000 منتج و3 مواقع وهمية، تطبيق فلتر «منخفض» على موقع واحد، مطابقة العدد مع الـ Mock.
**Acceptance**:
1. **Given** منتج بمتغيرات، **When** يُعرض الصف، **Then** يظهر صف الأب بالمجموع قابلاً للتوسيع إلى صفوف المتغيرات، وكل كمية بخط Mono محاذاة نهاية بثلاث منازل عشرية فقط إن كانت `unit` غير `piece`.
2. **Given** `multi_location_enabled=true`، **When** يُختار موقع، **Then** تُعرض أعمدة `quantity_on_hand` · `quantity_reserved` · `quarantine_quantity` · `quantity_available` لذلك الموقع، ويُوضَّح في رأس الجدول «المصدر: مخزون الموقع».
3. **Given** `multi_location_enabled=false`، **Then** يُعرض `ProductVariant.stock` ثم `Product.stock` فقط دون أعمدة الموقع.

### US-21.2 — تعديل يدوي بسبب وملاحظة (P1)
يضغط أمين المخزن على كمية صفّ فتُفتح لوحة تعديل: الكمية الجديدة أو الفرق (±)، السبب (`manual_adjust` · `restock`)، ملاحظة إلزامية عند النقصان، والموقع إن وُجد.
**Acceptance**:
1. **Given** صلاحية `inventory.adjust`، **When** يُرسل تعديل +12 بسبب `restock`، **Then** يتحدث الصف فوراً (optimistic) وتظهر الحركة في الدفتر خلال ثانية، ويُعرض toast «تم تحديث المخزون».
2. **Given** تعديل بالنقصان بلا ملاحظة، **Then** يُمنع الإرسال مع رسالة تحت الحقل «الملاحظة مطلوبة عند تخفيض الكمية».
3. **Given** بلا `inventory.adjust`، **Then** الكمية نص غير قابل للنقر مع تلميح «تحتاج صلاحية تعديل المخزون».

### US-21.3 — دفتر الحركات (P1)
يفتح التاجر «سجل الحركات» فيرى كل `StockMovement` مرتبة زمنياً: المنتج/المتغير، الموقع، الفرق (+/−)، الكمية بعد، السبب، المرجع (رقم طلب/أمر شراء/مرتجع)، من قام بها.
**Acceptance**:
1. **Given** فلتر `reason=sale` ونطاق أسبوع، **When** يُطبَّق، **Then** يعيش في الرابط ويُعرض عدد الحركات ومجموع الفرق في شريط نصّي فوق الجدول.
2. **Given** حركة مرجعها طلب، **When** يُضغط المرجع، **Then** يُفتح الطلب في M06 (sheet) دون مغادرة الدفتر.

### US-21.4 — المخزون المنخفض (P2)
يرى التاجر عدّاد «منخفض» في الشريط الجانبي وفي أعلى الجدول؛ الضغط يفلتر الجدول على `stock ≤ low_stock_threshold` (الافتراضي 3، قابل للتعديل لكل منتج).
**Acceptance**:
1. **Given** منتج `low_stock_threshold=10` ومخزونه 8، **Then** يظهر بحالة «منخفض» بنقطة `amber`؛ ومخزون 0 مع `allow_backorder=true` يظهر «نفد — يقبل الحجز» بنقطة `sky`، وبلا backorder «نفد» بنقطة `red`.

### US-21.5 — الوحدات المسلسلة (P2)
لمنتج `is_serialized=true` يرى أمين المخزن قائمة `InventoryItem` (رقم تسلسلي، الحالة `available` · `reserved` · `sold`، الموقع، الطلب المرتبط) مع بحث بالرقم التسلسلي.
**Acceptance**:
1. **Given** منتج مسلسل، **When** يُحاول تعديل الكمية رقمياً، **Then** يُمنع مع تلميح «المنتجات المسلسلة تُدار بالوحدات» وزر «إدارة الوحدات».

### US-21.6 — الحجوزات النشطة (P2)
يرى التاجر `InventoryReservation` (`active` · `consumed` · `released`) لفهم الفرق بين الفعلي والمتاح، مع المرجع (طلب/سلة/مسودة B2B).

### US-21.7 — إعدام مخزون عبر موافقة (P2)
أمين المخزن بصلاحية `inventory.writeoff` يطلب إعدام كمية (تالف/مفقود) بملاحظة؛ تُنشأ `ApprovalRequest` من نوع `stock_writeoff` ولا يُخصم المخزون حتى الاعتماد في M18.
**Acceptance**:
1. **Given** طلب إعدام مُرسل، **Then** يظهر الصف بشارة «بانتظار الموافقة» والكمية غير مُخصومة، ويظهر العدّاد في «طلبات الموافقة المعلّقة».

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-21.01**: الجدول MUST يدعم ترقيماً خادمياً (50/صفحة)، بحثاً `q` (اسم/SKU/باركود)، وفلاتر `status` (`in_stock` · `low` · `out` · `backorder`)، `location`، `category`، `is_serialized`؛ كلها في الرابط.
- **FR-21.02**: الكميات MUST تُعرض كما يرسلها الخادم (Decimal حتى 3 منازل) بخط Mono محاذاة نهاية؛ يُمنع التقريب محلياً.
- **FR-21.03**: مصدر الكمية MUST يتبع سلسلة الحقيقة `LocationInventory → ProductVariant.stock → Product.stock`؛ ويُعرض اسم المصدر في تلميح رأس العمود.
- **FR-21.04**: كل تعديل يدوي MUST يحمل `reason` ∈ {`manual_adjust`, `restock`} وملاحظة (إلزامية عند النقصان) و`location_id` حين `multi_location`.
- **FR-21.05**: الأسباب النظامية (`sale`, `cancel_restock`, `refund_restock`, `po_received`) MUST تظهر في الدفتر للقراءة فقط ولا تُتاح في نموذج التعديل.
- **FR-21.06**: الإعدام MUST يمرّ عبر `ApprovalRequest(stock_writeoff)` ولا يُخصم قبل `approved`.
- **FR-21.07**: التحرير السطري MUST يكون optimistic مع تراجع تلقائي عند 4xx/409 ورسالة من `{detail}`.
- **FR-21.08**: المنتجات المسلسلة MUST تُدار على مستوى `InventoryItem` فقط؛ الكمية المجمَّعة للعرض.
- **FR-21.09**: الوحدة MUST تُخفى من الشريط حين `features.inventory=false`، وتُعرض للقراءة فقط بلا `inventory.adjust`.
- **FR-21.10**: عدّاد «منخفض» MUST يُحدَّث كل 60 ثانية ويُغذّي M49.
- **FR-21.11**: تصدير CSV للجدول الحالي MUST يتاح بصلاحية `reports.export` عبر محرك M25.
- **FR-21.12**: `cost_price` وهامش الربح MUST يُخفيان بلا `reports.profit.view`.

## 5. الكيانات والحالات (Key Entities & States)

- **Product (مخزون)**: `stock` Decimal(12,3)، `unit` (14: `piece` قطعة · `gram` · `kilogram` · `milliliter` · `liter` · `meter` · `centimeter` · `square_meter` · `dozen` · `box` · `bundle` · `pair` · `set` · `roll`)، `low_stock_threshold` (افتراضي 3)، `allow_backorder`، `is_serialized`، `is_auction` (يفرض stock=1)، `sku`، `barcode`؛ مشتق `is_low_stock`.
- **ProductVariant**: `stock`, `sku`, `options`؛ مرآة للمتغيّر.
- **LocationInventory** (M22): `quantity_on_hand`, `quantity_reserved`, `quarantine_quantity`, `reorder_point`؛ `quantity_available = on_hand − reserved − quarantine`.
- **StockMovement**: `reason` ∈ `sale` بيع · `cancel_restock` إعادة بعد إلغاء · `refund_restock` إعادة بعد استرجاع · `manual_adjust` تعديل يدوي · `restock` إعادة تعبئة · `po_received` استلام أمر شراء. دفتر append-only.
- **InventoryItem**: وحدة مسلسلة؛ `status` ∈ `available` متاح · `reserved` محجوز · `sold` مُباع. انتقال: `available → reserved → sold`؛ `reserved → available` عند الإفراج.
- **InventoryReservation**: `status` ∈ `active` نشط · `consumed` مُستهلك · `released` مُفرَج.
- **ApprovalRequest** (M18): `request_type=stock_writeoff`، `pending` · `approved` · `rejected`، `version`.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/inventory` (الجدول + لوحة تعديل جانبية) · `/dashboard/inventory/movements` (الدفتر) · `/dashboard/inventory/items?product=` (الوحدات المسلسلة) · `/dashboard/inventory/reservations` · `/dashboard/inventory/writeoffs` (طلباتي المعلّقة).
- **الحالات البصرية**: skeleton صفوف 44px · فراغ «لا منتجات بعد — أضف منتجك الأول» (رابط M04) · فلتر بلا نتائج «لا منتجات تطابق الفلاتر» + مسح · خطأ شبكة مع إعادة المحاولة · بلا صلاحية · الميزة معطّلة «المخزون غير مفعّل في خطتك».
- **الجوال**: الجدول → بطاقات (اسم، SKU، متاح/فعلي بخط Mono، نقطة الحالة)؛ التعديل في drawer سفلي (Vaul) بأزرار ± كبيرة ≥ 44px.
- **اختصارات**: `⌘K` «مخزون: <اسم>» · `A` تعديل الصف المحدد · `L` تبديل فلتر «منخفض» · `J/K` تنقل.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| جدول المخزون | `inventory_hub` HTML | `[NEEDS BACKEND]` → `GET /api/v1/inventory/?q&status&location&category&is_serialized&page&page_size` → `{count, results:[{product_id, variant_id, name, variant_label, sku, barcode, unit, stock, low_stock_threshold, allow_backorder, is_serialized, location:{on_hand, reserved, quarantine, available}?}]}` |
| تعديل يدوي | `update_product_stock` POST | `[NEEDS BACKEND]` → `POST /api/v1/inventory/adjustments/` `{product_id, variant_id?, location_id?, delta?, new_quantity?, reason: manual_adjust\|restock, note}` → `{stock, movement_id}` / 400 `{field:[msg]}` |
| دفتر الحركات | غير معروض (نموذج فقط) | `[NEEDS BACKEND]` → `GET /api/v1/inventory/movements/?product&variant&location&reason&from&to&page` → `{count, results:[{id, product_name, variant_label, location_name, delta, quantity_after, reason, reference:{type, id, label}, actor, created_at}]}` |
| الوحدات المسلسلة | نموذج `InventoryItem` فقط | `[NEEDS BACKEND]` → `GET /api/v1/inventory/items/?product&status&q` |
| الحجوزات | نموذج `InventoryReservation` فقط | `[NEEDS BACKEND]` → `GET /api/v1/inventory/reservations/?status&product` |
| طلب إعدام | `approval_requests` HTML | `[NEEDS BACKEND]` → `POST /api/v1/approvals/` `{request_type: stock_writeoff, product_id, variant_id?, location_id?, quantity, note}` (مشترك مع M18) |
| عدّاد المنخفض | ضمن `inventory_hub` | `[NEEDS BACKEND]` → `GET /api/v1/inventory/counters/` → `{low, out, pending_writeoffs}` |
| مخزون الموقع | `location_inventory` HTML | انظر M22 |

## 8. الحالات الحدّية (Edge Cases)

- منتج `is_auction=true`: الكمية ثابتة 1 وتعديلها معطّل بتلميح.
- منتج `is_bundle=true`: يُعرض «محسوب من المكوّنات» ولا يُعدَّل مباشرة.
- تعديل متزامن من موظفَين: الخادم يرد 409 → تراجع optimistic وتحميل القيمة الحالية ثم إعادة المحاولة بيد المستخدم.
- كمية سالبة نتيجة بيع مع `allow_backorder`: تُعرض بالسالب بخط Mono مع شارة «حجز مسبق»، لا تُصفَّر محلياً.
- `multi_location` مُفعَّل لكن المنتج بلا صف `LocationInventory`: يُعرض «—» في أعمدة الموقع ويُقترح «تعيين مخزون في M22».
- وحدة `gram`/`milliliter` بكميات عشرية: حقل التعديل يقبل 3 منازل، ويرفض أكثر محلياً قبل الإرسال.

## 9. معايير النجاح (Success Criteria)

- **SC-21.1**: 100% من تغييرات المخزون اليدوية لها سبب وفاعل في الدفتر.
- **SC-21.2**: من فتح الجدول إلى حفظ تعديل ≤ 3 نقرات / ≤ 8 ثوانٍ.
- **SC-21.3**: الجدول بـ 50 صفاً يُرسم في < 1s والتوسيع للمتغيرات بلا طلب شبكة إضافي.
- **SC-21.4**: 0 حالات تُعرض فيها كمية مُقرَّبة أو مُنسَّقة محلياً تختلف عن الخادم.
- **SC-21.5**: المنتج المنخفض يظهر في العدّاد خلال ≤ 60 ثانية من البيع.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M03 (الهيكل)، M04 (المنتجات)، M18 (الموافقات والصلاحيات)، M22 (المواقع)، M23 (أوامر الشراء)، M24 (استرجاع المخزون)، M25 (التصدير)، M49 (العدّاد).
- افتراض: الباك إند سيعرض الكميات كنصوص Decimal دون تنسيق؛ الواجهة تعرضها حرفياً بخط Mono.
- افتراض: الحركات النظامية تُكتب من الباك إند عند انتقالات الطلب؛ الواجهة لا تُنشئها.
- افتراض: الـ Mock المحلي يطابق العقد أعلاه حتى توفر الـ endpoints.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا بطاقات KPI متماثلة أعلى الجدول؛ شريط نصّي بخط Mono (متوفر / منخفض / نفد) قابل للنقر كفلتر. الحالات نقاط صغيرة بلون دلالي، لا خلفيات ملونة.
- II: الكميات وSKU والباركود Mono محاذاة نهاية؛ علامة الفرق (+/−) تُعرض بعلامات ASCII في خط Mono لتجنب انعكاس الاتجاه؛ أسهم توسيع المتغيرات تنعكس.
- IV: لقطات `docs/visual-checks/21-inventory/` للجدول (فارغ/ممتلئ/منخفض)، لوحة التعديل، الدفتر، الجوال، الداكن.
- IX: مفاتيح الكاش `[tenant, 'inventory', filters]`؛ الفلاتر عبر nuqs؛ Zod على كل استجابة؛ التحديث optimistic عبر TanStack Query mutation.
