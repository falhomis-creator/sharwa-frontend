# M22 — المواقع والمستودعات والفروع (Locations / Warehouses / Branches)

**Route group**: `(dashboard)` · **Priority**: P2 · **Backend status**: HTML-only `[NEEDS BACKEND]` (`location_list|form|inventory|staff|routing_rules`, `toggle_multi_location_mode`, `set_location_inventory`؛ لا endpoint في `/api/v1`) · **Feature**: `multi_location`
**Discovery refs**: `02-products-domain-model.md` §8 (`Location`، أعلام القدرة، الملكية، جداول التفاصيل، `LocationInventory`، `LocationRoutingRule`، `LocationStaffAssignment`), §11 (`StoreSetting.multi_location_enabled`), §16 (Gotcha 4: weekday 0=Sunday) · `01-tenants-dashboard-admin.md` §3.2, §4 (المواقع `[multi_location]`) · **Benchmarks**: Shopify Locations (قائمة بسيطة + «fulfillment priority» بالسحب)، Saleor Warehouses (shipping zones ↔ warehouse، كمية لكل مستودع)، Linear (نموذج إعدادات بأقسام قابلة للطيّ لا tabs متعددة)

## 1. الهدف (Purpose)

تمكين التاجر الذي يبيع من أكثر من مكان (مستودع، فرع، خزانة استلام، مركبة، مورد دروبشيبينج) من تعريف كل موقع بما يستطيع فعله لا بنوع جامد، وتوزيع المخزون والموظفين وقواعد التوجيه عليه. يُقاس بنسبة الطلبات التي تُوجَّه آلياً للموقع الصحيح دون تدخل.

## 2. الفاعلون (Actors)

- **مالك المتجر**: يفعّل `multi_location`، يُنشئ المواقع ويعرّف الموظفين والقواعد.
- **مدير الفرع** (دور نظامي، كل الصلاحيات بحد خصم 20%): يرى مواقعه ويعدّل مخزونها.
- **أمين مخزن** (`inventory.view/adjust/writeoff`): يعيّن مخزون الموقع.
- **النظام**: يختار `source_location` للطلب وفق قواعد التوجيه (M06).

## 3. قصص المستخدم (User Stories)

### US-22.1 — تفعيل وضع المواقع المتعددة (P1)
يفتح التاجر «المواقع» لأول مرة فيرى الحالة الحالية (`multi_location_enabled`) وشرحاً من سطرَين لما سيتغير (أعمدة مخزون لكل موقع، توجيه الطلبات)، ثم يفعّل بمفتاح واحد مع تأكيد.
**Independent Test**: تبديل المفتاح → يظهر فوراً عمود الموقع في M21 ويختفي عند الإلغاء.
**Acceptance**:
1. **Given** `multi_location_enabled=false`، **When** تُفتح الصفحة، **Then** تُعرض حالة فراغ نصّية مع زر «تفعيل المواقع المتعددة» وموقع افتراضي واحد «المستودع الرئيسي» للقراءة.
2. **Given** التفعيل، **When** يُؤكَّد، **Then** يُرسل التبديل ويُحدَّث `StoreSetting` وتظهر قائمة المواقع فارغة مع «أضف موقعاً».

### US-22.2 — قائمة المواقع (P1)
يرى التاجر جدولاً: الكود (Mono مثل `WH-01`، `BR-JED-02`)، الاسم، المدينة، نوع العرض المحسوب من الخادم (مثل «فرع تجزئة»، «خزانة PUDO»)، الملكية، نشط/معطّل، وعدد المنتجات المخزّنة.
**Acceptance**:
1. **Given** 12 موقعاً، **When** يُفلتر بـ «يشحن للعميل» أو «نقطة استلام»، **Then** يُطبَّق فلتر الأعلام في الرابط ويُعرض العدد.
2. **Given** موقع له `parent_location`، **Then** يُعرض بمسافة بادئة تحت الأب مع خط رفيع، لا بأيقونة شجرة.

### US-22.3 — إنشاء/تعديل موقع بأعلام القدرة (P1)
في نموذج واحد بأقسام: الهوية (اسم، كود، نشط، الأب)، العنوان (نص، مدينة، إحداثيات، هاتف)، القدرات (8 مفاتيح)، الملكية (4 خيارات)، ثم أقسام تفصيلية تظهر شرطياً: ساعات العمل (0=الأحد)، تفاصيل الخزانة، الامتياز، مورد الدروبشيبينج، المركبة، المراجع الخارجية.
**Acceptance**:
1. **Given** `is_pickup_point=true`، **Then** يظهر قسم «ساعات العمل» مع 7 صفوف تبدأ بالأحد (weekday 0) وحقول من/إلى وزر «مغلق».
2. **Given** `ownership=dropship_supplier`، **Then** يظهر قسم «مورد الدروبشيبينج» بقناة التواصل (`whatsapp` · `email` · `api_webhook`) ويُخفى قسم POS.
3. **Given** `is_mobile=true`، **Then** يظهر قسم «المركبة»؛ و`is_virtual=true` يعطّل حقول الإحداثيات بتلميح.
4. **Given** الحفظ، **Then** يُعرض «نوع العرض» المحسوب من الخادم في رأس الصفحة فور الاستجابة (لا يُحسب محلياً).

### US-22.4 — مخزون الموقع (P1)
يفتح أمين المخزن تبويب «المخزون» لموقع فيرى جدول المنتجات/المتغيرات بأعمدة `on_hand` · `reserved` · `quarantine` · `available` · `reorder_point`، ويعدّل `on_hand` و`quarantine` و`reorder_point` سطرياً بسبب وملاحظة (نفس قواعد M21).
**Acceptance**:
1. **Given** تعديل `on_hand` من 10 إلى 7، **Then** يُحدَّث `available` من استجابة الخادم لا بالطرح المحلي، وتُسجَّل حركة `manual_adjust` في دفتر M21.
2. **Given** `available < reorder_point`، **Then** يُعلَّم الصف بنقطة `amber` «أقل من نقطة إعادة الطلب».

### US-22.5 — موظفو الموقع (P2)
يعيّن التاجر موظفين للموقع بدور تشغيلي (`manager` · `cashier` · `warehouse_operator` · `driver` · `pickup_agent`) من قائمة الموظفين في M18.
**Acceptance**:
1. **Given** موظف معيَّن بدور `cashier` في موقعَين، **Then** يظهر في كلٍّ منهما، وإزالته من أحدهما لا تمس الآخر.

### US-22.6 — قواعد التوجيه بالسحب (P2)
يرتّب التاجر قواعد `LocationRoutingRule` (الأولوية، التصنيف، المدينة → الموقع المفضَّل) بالسحب والإفلات؛ أول قاعدة مطابقة تفوز.
**Acceptance**:
1. **Given** 5 قواعد، **When** تُسحب القاعدة الخامسة للأعلى، **Then** تُعاد ترقيم `priority` من الخادم وتُعرض المعاينة «طلب من جدة لتصنيف عطور → BR-JED-02».
2. **Given** `prefers-reduced-motion`، **Then** السحب يعمل بلا حركة انتقالية، مع أزرار «أعلى/أسفل» بديلة للوحة المفاتيح.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-22.01**: الوحدة MUST تُخفى من الشريط حين `features.multi_location=false`؛ وحين الميزة متاحة لكن `multi_location_enabled=false` تُعرض شاشة التفعيل فقط.
- **FR-22.02**: نموذج الموقع MUST يعرض الأعلام الثمانية كمفاتيح مستقلة بلا «نوع» مسبق؛ `display_type` يُقرأ من الخادم.
- **FR-22.03**: الأقسام التفصيلية MUST تظهر شرطياً حسب الأعلام/الملكية ولا تُرسل حين مخفية.
- **FR-22.04**: ساعات العمل MUST تستخدم ترميز `weekday 0 = الأحد` وتُعرض بترتيب الأسبوع المحلي (`week_start_day`) دون تغيير الترميز المُرسَل.
- **FR-22.05**: كمية الموقع المتاحة MUST تُعرض من الخادم (`quantity_available`) ولا تُحسب محلياً.
- **FR-22.06**: تعديلات مخزون الموقع MUST تمر عبر عقد تعديلات M21 (`reason`, `note`, `location_id`).
- **FR-22.07**: إعادة ترتيب قواعد التوجيه MUST تُرسل كقائمة معرّفات مرتبة وتُطبَّق optimistic مع تراجع عند الفشل.
- **FR-22.08**: تعطيل موقع له مخزون أو طلبات مفتوحة MUST يعرض تحذيراً بالأعداد من الخادم قبل التأكيد.
- **FR-22.09**: الإحداثيات MUST تُدخل يدوياً أو بلصق «lat,lng» مع تحقق محلي للنطاق؛ لا خريطة في الإصدار الأول.
- **FR-22.10**: الكود `code` MUST يُعرض Mono، وتفرده يُتحقق من الخادم (400 `{code:[msg]}`).
- **FR-22.11**: تعيين الموظفين MUST يقرأ قائمة الموظفين من M18 ويحترم `staff.manage_assignments`.

## 5. الكيانات والحالات (Key Entities & States)

- **Location**: `name`, `code`, `is_active`, `address_text`, `city`, `latitude/longitude`, `phone`, `parent_location`. أعلام: `stores_inventory` يخزّن · `ships_to_customer` يشحن للعميل · `is_transient` عبور · `is_mobile` متنقّل · `is_virtual` افتراضي · `serves_walk_in_customers` يخدم زوّاراً · `has_pos_terminal` نقطة بيع · `is_pickup_point` نقطة استلام. `ownership` ∈ `owned` مملوك · `franchise` امتياز · `third_party_3pl` مستودع طرف ثالث · `dropship_supplier` مورد دروبشيبينج. نوع العرض (محسوب): مورد دروبشيبينج / مركبة متنقلة / مستودع مشترك (3PL) / خزانة PUDO / موقع هجين / مستودع مغلق / فرع تجزئة / نقطة استلام.
- **LocationOperatingHours**: `weekday` (0=الأحد … 6=السبت)، من/إلى، مغلق. **LockerDetails**, **FranchiseDetails**, **DropshipSupplierDetails** (قناة: `whatsapp` · `email` · `api_webhook`), **VehicleDetails**, **LocationExternalRef**.
- **LocationInventory**: `quantity_on_hand`, `quantity_reserved`, `quarantine_quantity`, `reorder_point`, `quantity_available` (محسوب خادمياً).
- **LocationStaffAssignment**: `role` ∈ `manager` مدير · `cashier` كاشير · `warehouse_operator` عامل مستودع · `driver` سائق · `pickup_agent` موظف استلام.
- **LocationRoutingRule**: `priority`, `applies_to_category`, `applies_to_city`, `preferred_location`.
- **StoreSetting.multi_location_enabled**: مفتاح الوضع.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/locations` (قائمة أو شاشة التفعيل) · `/dashboard/locations/new` · `/dashboard/locations/[id]` (نموذج بأقسام + تبويبات: المخزون / الموظفون) · `/dashboard/locations/routing` (قواعد بالسحب).
- **الحالات البصرية**: skeleton · فراغ «لا مواقع بعد — أضف المستودع الرئيسي» · خطأ · بلا صلاحية · الميزة معطّلة «المواقع المتعددة غير متاحة في خطتك» · الوضع غير مفعّل (شاشة التفعيل).
- **الجوال**: القائمة → بطاقات (كود Mono، اسم، نوع العرض، نقطة نشط)؛ النموذج أقسام accordion؛ قواعد التوجيه بأزرار أعلى/أسفل بدل السحب.
- **اختصارات**: `⌘K` «موقع: <اسم>» · `N` موقع جديد · `S` حفظ النموذج.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| تبديل الوضع | `toggle_multi_location_mode` POST | `[NEEDS BACKEND]` → `POST /api/v1/locations/mode/` `{enabled}` → `{multi_location_enabled}` |
| قائمة المواقع | `location_list` HTML | `[NEEDS BACKEND]` → `GET /api/v1/locations/?q&flag&ownership&is_active` → `[{id, code, name, city, display_type, ownership, is_active, parent_location, flags{…8}, products_count}]` |
| إنشاء/تعديل/تعطيل | `location_form` POST | `[NEEDS BACKEND]` → `POST /api/v1/locations/`, `PATCH /api/v1/locations/<id>/` (يشمل `operating_hours[]`, `locker`, `franchise`, `dropship_supplier`, `vehicle`, `external_refs[]` شرطياً) → الكائن مع `display_type` |
| مخزون الموقع | `location_inventory` HTML | `[NEEDS BACKEND]` → `GET /api/v1/locations/<id>/inventory/?q&below_reorder&page` → `{count, results:[{product_id, variant_id, name, sku, on_hand, reserved, quarantine, available, reorder_point}]}` |
| تعيين كمية | `set_location_inventory` POST | `[NEEDS BACKEND]` → عبر `POST /api/v1/inventory/adjustments/` (M21) + `PATCH /api/v1/locations/<id>/inventory/<variant_or_product>/` `{reorder_point, quarantine_quantity}` |
| موظفو الموقع | `location_staff` HTML | `[NEEDS BACKEND]` → `GET/POST /api/v1/locations/<id>/staff/` `{staff_id, role}`, `DELETE /<assignment_id>/` |
| قواعد التوجيه | `location_routing_rules` HTML | `[NEEDS BACKEND]` → `GET/POST /api/v1/locations/routing-rules/`, `PATCH/DELETE /<id>/`, `POST /reorder/` `{ordered_ids:[int]}` → `{ok, reordered}` |
| تحذير التعطيل | — | `[NEEDS BACKEND]` → `GET /api/v1/locations/<id>/deactivation-impact/` → `{on_hand_total, open_fulfillments}` |

## 8. الحالات الحدّية (Edge Cases)

- موقع واحد فقط والوضع مفعَّل: قواعد التوجيه تُعرض مع ملاحظة «كل الطلبات تُوجَّه للموقع الوحيد».
- قاعدة توجيه تشير إلى موقع مُعطَّل: تُعلَّم بشارة `amber` «الموقع معطّل» وتبقى في الترتيب.
- `is_virtual=true` مع `stores_inventory=true`: مسموح (مستودع افتراضي لمورد)؛ تُخفى الإحداثيات فقط.
- `week_start_day=monday` في الإعدادات: الترتيب البصري يبدأ بالاثنين لكن `weekday` المُرسَل يبقى 0=الأحد.
- إلغاء `multi_location` ومخزون موزَّع على مواقع: الخادم يرد بتحذير `{detail}`؛ الواجهة تعرضه وتطلب تأكيداً ثانياً.
- كود مكرر: 400 `{code:["…"]}` يُعرض تحت الحقل مباشرة.

## 9. معايير النجاح (Success Criteria)

- **SC-22.1**: إنشاء موقع كامل (هوية + قدرات + ساعات) ≤ 90 ثانية.
- **SC-22.2**: 100% من قيم «نوع العرض» تطابق الخادم (لا حساب محلي).
- **SC-22.3**: إعادة ترتيب القواعد تنعكس في الواجهة < 100ms وفي الخادم < 1s.
- **SC-22.4**: 0 أخطاء ترميز أيام الأسبوع في فحص 7×2 (sunday/monday start).
- **SC-22.5**: السحب والإفلات قابل للاستبدال بالكامل بلوحة المفاتيح.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M03، M18 (الموظفون والصلاحيات)، M21 (عقد التعديلات)، M06 (`source_location`)، M15 (نقاط الاستلام القديمة `PickupLocation` تبقى منفصلة).
- افتراض: `display_type` يُحسب في الباك إند من الأعلام والملكية ويُعاد كنص عربي؛ الواجهة لا تملك جدول اشتقاق.
- افتراض: `PickupLocation` (M15) و`Location(is_pickup_point)` كيانان مختلفان في الإصدار الأول؛ لا دمج.
- افتراض: لا خريطة تفاعلية في الإصدار الأول؛ الإحداثيات نصية.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا بطاقات «أنواع المواقع» الثمانية بأيقونات في دوائر؛ القدرات مفاتيح نصية في قائمة واحدة. القائمة جدول بحدود أفقية، نوع العرض نص لا badge ملون.
- II: الكود والكميات والإحداثيات Mono؛ ترتيب أيام الأسبوع يبدأ من اليمين؛ مقبض السحب في جهة البداية (`ps-`)؛ سهم الأب/الابن ينعكس.
- IV: لقطات `docs/visual-checks/22-locations/` لشاشة التفعيل، القائمة، النموذج (قسم ساعات العمل)، قواعد التوجيه، الجوال، الداكن.
- IX: مفاتيح الكاش `[tenant, 'locations', …]`؛ حالة السحب اللحظية في Zustand ثم mutation؛ الفلاتر عبر nuqs.
