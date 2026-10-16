# M37 — أنواع المنتجات المتقدمة: الحزم، التخصيص، المزادات، التسعير بالمعادلة (Bundles, Personalization, Auctions, Formula Pricing)

**Route group**: `(dashboard)` لوحات التحرير داخل M04 + `(storefront)` سلوك العرض داخل M10 · **Priority**: P3 · **Backend status**: HTML-only `[NEEDS BACKEND]` (كل الحقول في `ProductForm`/`ProductQuickAddForm`؛ bundle components وcompatibility rules عبر views HTML؛ لا JSON للمزايدة أو التخصيص)
**Discovery refs**: `02-products-domain-model.md` §2 (Product: Formula pricing, Refundable deposit, Flags; `BundleComponent`, `CompatibilityRule`, `Auction`, `AuctionBid`, `PersonalizationField`), §9 (`InventoryItem`), §15 (الحقول في النماذج) · **Benchmarks**: Apple configurator (خطوات واضحة، منع التركيبات المتعارضة بسبب مقروء)، eBay auctions (عطاء حالي كبير، عدّاد زمني، زيادة دنيا — بلا زخرفة)، Shopify Bundles (مكوّنات بكميات واختياري)

## 1. الهدف (Purpose)

إتاحة ستّة أنماط منتج تتجاوز «سعر ثابت × كمية» للتاجر العربي: حزم مركّبة بقواعد توافق، مدخلات تخصيص لا تستهلك مخزوناً، قطع فريدة تُباع بالمزاد، تسعير بالمعادلة (ذهب/عملات)، وديعة قابلة للاسترداد، ومخزون تسلسلي بأكواد فريدة — مع إدارتها من محرّر المنتج وعرضها الصحيح في المتجر. يُقاس بنسبة المنتجات المنشورة بهذه الأنماط دون أخطاء تحقق.

## 2. الفاعلون (Actors)

- **مالك المتجر / موظف كتالوج**: يفعّل الأعلام (`is_bundle`, `is_personalizable`, `is_auction`, `is_serialized`, `pricing_type='formula'`, `has_refundable_deposit`) ويحرّر لوحاتها داخل M04.
- **المشتري**: يبني التركيبة، يملأ حقول التخصيص، يزايد أو يشتري فوراً، يرى السعر المحسوب من الخادم (M10/M11).
- **النظام**: يحسب سعر الحزمة والمعادلة والعطاء الصالح؛ يفرض `stock=1` للمزاد ويمدّد `end_at` ضد القنص.

## 3. قصص المستخدم (User Stories)

### US-37.1 — بناء حزمة بقواعد توافق (P1)
يفعّل التاجر `is_bundle`، يضيف مكوّنات (منتج، كمية كسرية، اختياري/إلزامي)، يحدد رسوم التجميع، ويعرّف قواعد توافق بين خصائص المتغيرات (`attribute_a` مقابل `attribute_b` أو `value`). في المتجر يرى المشتري السعر الكلي من الخادم ويُمنع من تركيبة متعارضة بسبب مقروء.
**Independent Test**: حزمة من 3 مكوّنات (أحدها اختياري) وقاعدة `not_equals`؛ اختيار تركيبة متعارضة في PDP يُظهر رسالة الرفض ويُعطّل زر الإضافة.
**Acceptance**:
1. **Given** مكوّن اختياري غير مُختار، **When** يُعرض السعر، **Then** يساوي مجموع الإلزامي × الكمية + `bundle_build_fee` كما يرسله الخادم (`display_bundle_total`).
2. **Given** قاعدة `in` بقيم محددة، **When** يُختار متغير خارجها، **Then** يُعرض «هذا الخيار غير متوافق مع {attribute_a}» ويُبرز الحقلان.
3. **Given** مكوّن مخزونه 0 وإلزامي، **Then** تُعرض الحزمة «غير متاحة حالياً» مع اسم المكوّن الناقص.

### US-37.2 — حقول التخصيص (P1)
يضيف التاجر حقولاً (9 أنواع) بسعر إضافي اختياري وإلزامية وخيارات CSV؛ المشتري يملؤها في PDP وتُلحق بالطلب دون خصم مخزون.
**Acceptance**:
1. **Given** حقل `select` إلزامي بخيارات «ذهبي,فضي»، **When** لا يُختار، **Then** يُمنع «أضف إلى السلة» برسالة تحت الحقل.
2. **Given** حقل `file`/`image`, **When** يُرفع ملف بامتداد غير مسموح (الصور: jpg/jpeg/png/webp/gif)، **Then** يُرفض محلياً قبل الإرسال.
3. **Given** حقول بـ `price_add`, **Then** يُعرض سطر «إضافات التخصيص» في ملخص السعر من الخادم.

### US-37.3 — مزاد قطعة فريدة (P2)
يفعّل التاجر `is_auction` فيُثبَّت المخزون على 1 وتظهر لوحة المزاد (`start_bid`, `bid_step`, `reserve` مخفي، `buy_now`, `end_at`, `anti_sniping_seconds`) وحالته. في PDP يرى المشتري أعلى عطاء، الزيادة الدنيا، العدّاد، وزر «اشترِ الآن» إن وُجد؛ ويزايد باسمه وهاتفه.
**Acceptance**:
1. **Given** مزاد `active` وعطاء أقل من (الأعلى + `bid_step`)، **Then** يُمنع الإرسال برسالة «الحد الأدنى للعطاء {display_min_bid}» من الخادم.
2. **Given** عطاء خلال نافذة `anti_sniping_seconds`, **Then** يُعرض `end_at` الجديد من الاستجابة ويُحدَّث العدّاد.
3. **Given** `reserve` غير مبلوغ عند الانتهاء، **Then** تُعرض «انتهى المزاد دون بلوغ السعر الاحتياطي» ولا يُفصح عن قيمته أبداً.
4. **Given** مزاد `draft`, **Then** PDP تعرض «المزاد لم يبدأ» بلا زر مزايدة.

### US-37.4 — تسعير بالمعادلة ووديعة ومخزون تسلسلي (P2)
يختار التاجر `pricing_type='formula'` فيُدخل `formula_unit_price` × `formula_coefficient` + `formula_fixed_extra` ومرجع `live_rate_ref`; يفعّل الوديعة بمبلغها وقاعدة الاسترداد وحدث الإرجاع; يُلصق أكواد تسلسلية (`serial_codes`) للمنتجات `is_serialized`.
**Acceptance**:
1. **Given** معادلة مكتملة، **When** تُعرض المعاينة في المحرّر، **Then** تُعرض النتيجة من الخادم (`display_formula_price`) مع المعادلة نصّاً بخط Mono؛ لا حساب محلي.
2. **Given** `has_refundable_deposit`, **Then** يظهر في PDP وملخص السلة سطر «وديعة قابلة للاسترداد» منفصل مع قاعدة الاسترداد نصّاً.
3. **Given** أكواد تسلسلية مكررة في اللصق، **Then** تُبرز المكررات محلياً ويُمنع الحفظ.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-37.01**: لوحات هذه الوحدة MUST تظهر داخل محرّر المنتج (M04) كأقسام قابلة للطيّ تُفعَّل بأعلام المنتج، لا كصفحات مستقلة.
- **FR-37.02**: كل سعر مشتق (حزمة، معادلة، أدنى عطاء، إضافات تخصيص) MUST يأتي من الخادم كنص `display_*`؛ يُمنع الحساب في المتصفح.
- **FR-37.03**: محرّك التوافق في PDP MUST يطبّق `equals` · `not_equals` · `in` على خيارات المتغيرات المختارة ويُعطّل الخيارات المتعارضة (لا يُخفيها) مع سبب.
- **FR-37.04**: حقول التخصيص MUST تُرسم حسب `field_type` التسعة بمكوّنات النماذج المعتمدة؛ `options_csv` تُفصل بفاصلة وتُقلَّم.
- **FR-37.05**: صفحة المزاد MUST تُحدَّث كل 10 ثوانٍ أو عند التركيز، وتعرض `end_at` بالتوقيت المحلي عبر `Intl.DateTimeFormat('ar')` وعدّاداً تنازلياً بخط Mono.
- **FR-37.06**: `reserve` MUST لا يُرسل للمتجر أبداً ولا يظهر في أي استجابة عامة؛ يُحقق Zod ذلك برفض الحقل في مخطط PDP.
- **FR-37.07**: المزاد MUST يفرض `stock=1` في المحرّر (حقل الكمية معطّل مع تلميح) ويعرض حالته `draft` · `active` · `ended`.
- **FR-37.08**: الأكواد التسلسلية MUST تُعرض بخط Mono مع حالاتها (`available` · `reserved` · `sold`) وعدّادات.
- **FR-37.09**: كل تغيير على أعلام المنتج MUST يُسجَّل في `ProductChangeLog` من الخادم ويظهر في سجل المنتج (M04).

## 5. الكيانات والحالات (Key Entities & States)

- **Product (أعلام)**: `is_bundle` + `bundle_build_fee` · `is_personalizable` · `is_auction` (يفرض stock=1) · `is_serialized` · `pricing_type` (`fixed` · `formula`) + `live_rate_ref`, `formula_unit_price` (12,4)، `formula_coefficient` (8,4)، `formula_fixed_extra` · `has_refundable_deposit`, `refundable_deposit_amount`, `refundable_deposit_refund_rule`, `refundable_deposit_return_event`.
- **BundleComponent**: `bundle`, `component`, `quantity` (Decimal 12,3، افتراضي 1)، `is_optional`. السعر = Σ(إلزامي × كمية) + `bundle_build_fee`؛ المخزون يُخصم من كل مكوّن.
- **CompatibilityRule**: `bundle`, `attribute_a` (VariantAttribute)، `attribute_b`؟ أو `value`، `operator`: `equals` يساوي · `not_equals` لا يساوي · `in` ضمن القيم.
- **PersonalizationField**: `field_type`: `text` نص قصير · `textarea` نص طويل · `number` رقم · `select` قائمة منسدلة · `multi_select` اختيار متعدد · `date` تاريخ · `checkbox` خيار نعم/لا · `file` ملف مرفق · `image` صورة؛ `price_add`, `is_required`, `options_csv`, `applies_to_order` (دائماً True).
- **Auction**: `status`: `draft` مسودة · `active` نشط · `ended` منتهي؛ `start_bid`, `bid_step`, `reserve` (مخفي)، `buy_now`, `end_at`, `anti_sniping_seconds`. **AuctionBid**: `bidder_name`, `bidder_phone`, `amount`, `created_at`.
- **InventoryItem**: `status`: `available` · `reserved` · `sold` (للمنتجات `is_serialized`).

## 6. واجهة المستخدم (UI Surface)

- **الشاشات (لوحة التاجر داخل M04)**: `/dashboard/products/[id]#bundle` (مكوّنات + قواعد) · `#personalization` (حقول قابلة للترتيب بـ dnd-kit) · `#auction` (إعدادات + قائمة العطاءات للقراءة) · `#pricing` (معادلة + معاينة) · `#deposit` · `#serials` (لصق أكواد + جدول حالات).
- **الشاشات (المتجر داخل M10)**: مُركِّب الحزمة (خطوات عمودية: مكوّن → خيار → ملخص) · حقول التخصيص فوق زر الإضافة · لوحة المزاد (أعلى عطاء كبير Mono، عدّاد، نموذج اسم/هاتف/مبلغ) · سطر الوديعة في الملخص.
- **الحالات البصرية**: skeleton · فراغ «لا مكوّنات بعد — أضف أول مكوّن» · خطأ · مزاد منتهٍ (قفل الحقول) · مكوّن غير متاح · الميزة معطّلة (لا مفتاح ميزة مخصص؛ تتبع إتاحة المنتج).
- **الجوال**: المُركِّب خطوة بخطوة بشريط تقدم نصّي «2/3»؛ نموذج المزايدة في drawer سفلي.
- **اختصارات**: داخل المحرّر `⌘S` حفظ القسم؛ في قائمة العطاءات `J/K`.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| مكوّنات الحزمة CRUD | bundle components HTML تحت `edit_product` | `[NEEDS BACKEND]` → `GET/POST /api/v1/products/<id>/bundle-components/`, `PATCH/DELETE /<cid>/` `{component_id, quantity, is_optional}` → + `display_bundle_total` |
| قواعد التوافق CRUD | compatibility rules HTML | `[NEEDS BACKEND]` → `GET/POST /api/v1/products/<id>/compatibility-rules/` `{attribute_a_id, operator, attribute_b_id?, value?}` |
| حقول التخصيص CRUD | ضمن `ProductForm` | `[NEEDS BACKEND]` → `GET/POST /api/v1/products/<id>/personalization-fields/`, `PATCH/DELETE /<fid>/`, `POST /reorder/` |
| إعدادات المزاد | `auction_*` في `ProductForm` | `[NEEDS BACKEND]` → `PUT /api/v1/products/<id>/auction/` `{status, start_bid, bid_step, reserve, buy_now, end_at, anti_sniping_seconds}` |
| العطاءات (تاجر) | Model فقط | `[NEEDS BACKEND]` → `GET /api/v1/products/<id>/auction/bids/` → `[{bidder_name, bidder_phone, display_amount, created_at}]` |
| المزايدة (متجر) | غير موجود | `[NEEDS BACKEND]` → `POST /api/v1/catalog/products/<id>/bids/` `{bidder_name, bidder_phone, amount}` → `{display_highest_bid, display_min_next_bid, end_at}`؛ 409 عطاء منخفض/مزاد منتهٍ |
| تفاصيل PDP الموسّعة | `GET /api/v1/catalog/products/<id>/` (بلا هذه الحقول) | `[NEEDS BACKEND]` → إضافة `bundle:{components, rules, display_total}`, `personalization_fields[]`, `auction:{status, display_highest_bid, display_min_next_bid, display_buy_now, end_at}` (بلا `reserve`), `display_formula_price`, `deposit:{display_amount, refund_rule}` |
| إضافة للسلة بتخصيص/تركيبة | `POST /api/v1/cart/actions/` `{product_id, size, color, action_type}` | `[NEEDS BACKEND]` → توسيع الحمولة بـ `personalization:{field_id: value}`, `bundle_selection:[{component_id, variant_id?}]` |
| الأكواد التسلسلية | `serial_codes` في `ProductForm` | `[NEEDS BACKEND]` → `GET/POST /api/v1/products/<id>/serials/` `{codes:[string]}` → `[{code, status}]` |
| معاينة المعادلة | `calculate_formula_unit_price` في الـ Model | `[NEEDS BACKEND]` → `POST /api/v1/products/formula-preview/` `{formula_unit_price, formula_coefficient, formula_fixed_extra}` → `{display_price}` |

## 8. الحالات الحدّية (Edge Cases)

- حزمة تحوي نفسها كمكوّن: يُمنع محلياً («لا يمكن إضافة الحزمة إلى نفسها») وقبل الإرسال.
- قاعدة توافق تشير إلى خاصية حُذفت: تُعرض مُعطَّلة بشارة «خاصية محذوفة» مع زر حذف القاعدة.
- مزاد `active` بلا `end_at`: يُعرض «مفتوح حتى إشعار آخر» بلا عدّاد.
- عطاء يساوي `buy_now`: يُعرض خيار «اشترِ الآن» بدل المزايدة.
- `live_rate_ref` بلا سعر حي متاح: يبقى `formula_unit_price` المُدخل يدوياً ويُعرض تحذير «السعر المرجعي غير محدَّث».
- ملف تخصيص كبير: الحد من الخادم؛ الواجهة تعرض التقدم وتمنع الإرسال المزدوج.
- منتج `is_serialized` بأكواد أقل من `stock`: يُعرض تحذير بالفرق بلا منع.

## 9. معايير النجاح (Success Criteria)

- **SC-37.1**: 0 تركيبات متعارضة تصل إلى السلة (فحص بقواعد `equals`/`not_equals`/`in`).
- **SC-37.2**: 0 حالات يُفصح فيها عن `reserve` في أي استجابة أو DOM.
- **SC-37.3**: بناء حزمة من 3 مكوّنات في المتجر ≤ 4 نقرات على الجوال.
- **SC-37.4**: 100% من الأسعار المعروضة تطابق نصوص الخادم (لا حساب محلي).
- **SC-37.5**: عدّاد المزاد يبقى صحيحاً ±1s بعد تمديد anti-sniping.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M04 (محرّر المنتج ومتغيراته)، M10 (PDP)، M11 (السلة)، M21 (المخزون التسلسلي)، M12 (الوديعة في الدفع).
- افتراض: الوديعة تُحصَّل وتُرجَع عبر مسار الدفع/الاسترجاع الحالي؛ الواجهة تعرضها فقط.
- افتراض: هوية المزايد = اسم + هاتف بلا OTP في الإصدار الأول (العملاء بلا حسابات)؛ يُراجع عند توفر العقد.
- افتراض: الصور في حقول التخصيص تتبع امتدادات `IMAGE_EXTENSIONS` والملفات `DOCUMENT_EXTENSIONS`.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لوحة المزاد بلا عدّاد ملوّن نابض أو شارات «حار»؛ أعلى عطاء رقم كبير Mono على أرضية محايدة. مُركِّب الحزمة قائمة خطوات لا بطاقات متماثلة بأيقونات.
- II: المعادلة تُكتب LTR داخل `<bdi>` بخط Mono؛ العدّاد والمبالغ `tabular-nums`؛ ترتيب خطوات المُركِّب يبدأ من اليمين.
- IV: لقطات `docs/visual-checks/37-advanced-products/` لمُركِّب الحزمة (توافق/تعارض)، حقول التخصيص، المزاد (نشط/منتهٍ)، الجوال، الداكن.
- VII: ثيم المتجر يُطبَّق على PDP فقط؛ لوحات المحرّر بلوحة zinc.
