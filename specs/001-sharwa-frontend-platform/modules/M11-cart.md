# M11 — السلة الجانبية والسلة الصغيرة (Slide-over Cart & Mini-Cart)

**Route group**: `(storefront)/[store]` · **Priority**: P1 · **Backend status**: Ready (`GET/DELETE /api/v1/cart/`, `POST /api/v1/cart/actions/` بالـ session cookie)؛ الكوبون، العروض التلقائية، التقاط السلة المتروكة، وحقول السطر الإضافية HTML-only `[NEEDS BACKEND]`
**Discovery refs**: `03-api-payments-shipping-theme-integrations.md` §1 (CartView, CartActionView), §2 (session cookie, currency sticky, same-origin BFF), §7 (sw network-only للسلة) · `02-products-domain-model.md` §4 (cart shape, abandoned carts), §5 (Coupon errors, PromotionalOffer), §11 (`free_shipping_threshold`) · **Benchmarks**: Farfetch/Ounass (slide-over هادئ بصورة كبيرة وملخص ثابت أسفله)، Shopify (تحديث فوري للكمية، ملاحظة الشحن المجاني، زر checkout واحد)، Apple Bag (مساحة بيضاء، لا ضجيج)

## 1. الهدف (Purpose)

إبقاء المشتري في سياق التصفّح أثناء مراجعة سلته: إضافة من أي صفحة تفتح لوحة جانبية فوراً بتحديث متفائل، تعديل الكميات بلا إعادة تحميل، ورؤية الإجمالي كما يحسبه الخادم، ثم زر واحد إلى الـ checkout. يُقاس بنسبة الانتقال من «أضف إلى السلة» إلى الـ checkout وبصفر تضارب بين العدّاد والمحتوى.

## 2. الفاعلون (Actors)

- **المشتري**: يضيف، يزيد/ينقص، يحذف، يبدّل العملة، يدخل كوبوناً، ينتقل إلى الدفع؛ قد يعود بعد ساعات من رابط استرداد السلة.
- **النظام (Django)**: مصدر الحقيقة للسلة (session) والأسعار والعملة والعروض التلقائية؛ يلتقط السلة المتروكة بعد 2 ساعة.
- **التاجر**: يضبط `free_shipping_threshold` والكوبونات والعروض في M13/E-34؛ يرى السلات المتروكة في M13.

## 3. قصص المستخدم (User Stories)

### US-11.1 — الإضافة تفتح السلة الجانبية فوراً (P1)
بعد الضغط على «أضف إلى السلة» في M09/M10 تنزلق لوحة من طرف الشاشة تعرض السطر المضاف أولاً، وتتحدث فوراً قبل استجابة الخادم.
**Independent Test**: شبكة بطيئة 3G مُحاكاة → اللوحة تظهر بالسطر والعدّاد المتفائل خلال < 100ms، ثم تتوافق مع استجابة `{cart_count, product_qty}`؛ فشل الخادم → يُرجَع السطر وتظهر Sonner «لم نستطع الإضافة».
**Acceptance**:
1. **Given** منتج بـ `size='L'`, `color='أزرق'`، **When** يُضاف، **Then** يُرسل `POST /api/v1/cart/actions/` `{product_id, size, color, action_type:'add'}` بـ `credentials:'include'`، ويُعاد جلب `GET /api/v1/cart/` ليحل محل الحالة المتفائلة.
2. **Given** نفس المنتج والمتغير مضاف سابقاً، **Then** يزداد `quantity` للسطر نفسه (مفتاح السطر `product_id + size + color` أو `variant_id`) ولا يُنشأ سطر جديد.
3. **Given** الديسكتوب، **Then** اللوحة Sheet بعرض 420px من جهة النهاية (inline-end) بخلفية معتمة خفيفة؛ **Given** الجوال، **Then** drawer سفلي من Vaul يرتفع إلى 92% مع مقبض سحب.
4. **Given** اللوحة مفتوحة، **When** يُضغط `Esc` أو الخلفية، **Then** تُغلق ويُعاد التركيز إلى الزر الذي فتحها.

### US-11.2 — تعديل الكميات والحذف (P1)
**Acceptance**:
1. **Given** سطر بكمية 2، **When** يُضغط «+»، **Then** `action_type:'add'`؛ «−» → `action_type:'decrease'`؛ «−» عند كمية 1 → تأكيد مضمّن «إزالة؟» ثم `action_type:'remove_line'`.
2. **Given** ضغطات متتابعة سريعة على «+» ×3، **Then** تُجمَّع محلياً وتُرسل متسلسلة (queue) بلا تضارب، والعدّاد النهائي يطابق `cart_count` الأخير.
3. **Given** استجابة `product_qty` أقل من المطلوب (حدّ مخزون)، **Then** تُعرض ملاحظة تحت السطر «الكمية المتاحة N فقط» وتُثبَّت الكمية على قيمة الخادم.
4. **Given** «إفراغ السلة»، **Then** يُطلب تأكيد ثم `DELETE /api/v1/cart/` → 204 → حالة الفراغ.

### US-11.3 — الملخص والإجمالي والعملة (P1)
**Acceptance**:
1. **Given** `display_subtotal` و`currency` من الخادم، **Then** يُعرض الإجمالي الفرعي بخط Mono كما هو، وسطر «الشحن يُحسب في الخطوة التالية» بلا رقم.
2. **Given** تبديل العملة من الرأس (M09)، **When** يُستدعى `GET /api/v1/cart/?currency=USD`، **Then** تتحدث كل `display_price`/`display_subtotal` في السلة من الاستجابة؛ لا تحويل محلي.
3. **Given** `free_shipping_threshold` متاح، **Then** يُعرض شريط تقدّم رفيع (1px حد + تعبئة zinc) ونص «أضف <display_remaining> للشحن المجاني» أو «حصلت على شحن مجاني» بلون `emerald-600` نصياً.

### US-11.4 — الكوبون والعروض التلقائية (P2)
**Acceptance**:
1. **Given** حقل «كود الخصم» مطويّ افتراضياً، **When** يُدخل كود ويُطبَّق، **Then** يُعرض سطر خصم بقيمة الخادم ورمز الكود مع زر إزالة؛ الأخطاء تُعرض نصياً كما يرسلها الخادم («هذا الكوبون غير مُفعَّل حالياً» / «لم يبدأ هذا الكوبون بعد» / «انتهت صلاحية هذا الكوبون» / «تم استخدام هذا الكوبون الحد الأقصى من المرات»).
2. **Given** عرض تلقائي `buy_x_get_y` أو `free_shipping` مطبَّق من الخادم، **Then** يُعرض سطر «عرض: <name>» بقيمته بلا إمكانية إزالة.

### US-11.5 — السلة المتروكة والاسترداد (P2)
**Acceptance**:
1. **Given** المشتري أدخل هاتفه (في الـ checkout أو حقل «احفظ سلتي») ثم غادر، **Then** يملك الخادم `customer_phone` لإرسال التذكير؛ الواجهة تُرسل الهاتف مرة واحدة فقط.
2. **Given** رابط `cart_url` من رسالة واتساب، **When** يُفتح، **Then** تُستعاد السلة إلى الـ session الحالية وتُفتح اللوحة مع رسالة «استعدنا سلتك» وكود الخصم إن وُجد مُعبَّأً.

### US-11.6 — حالة الفراغ (P1)
**Acceptance**:
1. **Given** `items=[]`، **Then** تُعرض «سلتك فارغة» وجملة واحدة ورابطان: «تصفّح الأقسام» و«المفضلة» (إن كانت غير فارغة)؛ لا رسم توضيحي.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-11.01**: السلة MUST تُقرأ من `GET /api/v1/cart/` عبر TanStack Query بمفتاح `['store', <store>, 'cart']` مشترك مع عدّاد الرأس (M09) وصفحة الـ checkout (M12)؛ مصدر الحقيقة الخادم.
- **FR-11.02**: كل استدعاءات السلة MUST تمرّ عبر الـ BFF نفس الأصل بـ `credentials:'include'`؛ يُمنع تخزين محتوى السلة في localStorage (الـ session cookie هو الهوية).
- **FR-11.03**: التحديثات MUST تكون متفائلة (optimistic) مع تراجع آلي عند الفشل ورسالة Sonner؛ حالة الفتح/الإغلاق والصف الطابور في Zustand.
- **FR-11.04**: الأرقام MUST تُعرض من `display_price`/`display_subtotal` حرفياً بخط Mono `tabular-nums`؛ يُمنع حساب الإجمالي محلياً حتى في الحالة المتفائلة (يُعرض «…» أو القيمة السابقة بتعتيم).
- **FR-11.05**: السطر MUST يعرض: الصورة (حين تتوفر)، الاسم (رابط إلى M10)، تسمية المتغير (`size`/`color` أو `variant_label`)، السعر، منتقي الكمية، الإجمالي الفرعي، زر الحذف بـ `aria-label`.
- **FR-11.06**: زر «إتمام الطلب» MUST يكون العنصر الوحيد المسيطر بصرياً، ثابتاً أسفل اللوحة، ويُعطَّل عند السلة الفارغة أو أثناء تزامن معلَّق.
- **FR-11.07**: اللوحة MUST تدعم `inert` للمحتوى الخلفي، حصر التركيز (focus trap)، و`Esc`؛ على الجوال سحب لأسفل يغلق.
- **FR-11.08**: العملة الملتصقة MUST تُقرأ من `currency` في الاستجابة وتُزامن مبدّل الرأس؛ تبديلها يُعيد جلب السلة والمنتجات.
- **FR-11.09**: `/sw.js` MUST يعامل `/api/v1/cart*` كـ network-only (لا كاش) — قرار M47.
- **FR-11.10**: اللوحة MUST تعرض «تغيّر السعر» بجانب السطر إذا اختلف `display_price` عن القيمة المعروضة قبل آخر تزامن.
- **FR-11.11**: الكوبون MUST يُحفظ خادمياً (session) لا في الرابط؛ الواجهة تعرض فقط ما يعيده الخادم.

## 5. الكيانات والحالات (Key Entities & States)

- **Cart** (من `/api/v1/cart/`): `items[]`, `count`, `currency` (`SAR` · `USD` · `YER_OLD` · `YER_NEW`), `display_subtotal`. حالات العرض: فارغة · تحتوي عناصر · تزامن معلَّق · خطأ.
- **CartItem**: `product_id`, `name`, `size`, `color`, `quantity`, `display_price`, `display_subtotal`. المفتاح الخادمي `"{product_id}_v{variant_id}"` أو `"{product_id}_{size}_{color}"`. حالات السطر: عادي · متفائل (مُعتَّم) · مقيَّد بالمخزون · تغيّر سعره · قيد الحذف.
- **CartAction**: `action_type` ∈ `add` · `decrease` · `remove_line` مع `product_id`, `size`, `color` → `{cart_count, product_qty}`.
- **Coupon** (عرض فقط): `code`, `discount_type` (`percent` · `fixed`), `apply_to` (`all` · `category` · `product`), `min_order_amount`. **PromotionalOffer** (عرض فقط): `name`, `offer_type` (`discount` · `free_shipping` · `buy_x_get_y`).
- **AbandonedCart**: `status` (`active` · `abandoned` · `recovered`), `session_key`, `customer_phone`, `customer_name`, `reminder_discount_coupon`؛ عتبة الترك 2 ساعة؛ تُدار خادمياً.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: لوحة جانبية (Sheet من جهة النهاية) تُفتح من زر السلة في الرأس أو بعد الإضافة · drawer سفلي (Vaul) على الجوال · صفحة `/cart` كاملة بنفس المكوّن للروابط المباشرة وروابط الاسترداد · Mini-cart: شارة العدّاد على أيقونة الرأس (Mono، تُخفى عند 0).
- **الحالات البصرية**: skeleton 3 أسطر بأبعاد السطر · فارغة (نص + رابطان) · خطأ شبكة («لم نستطع تحميل سلتك» + إعادة) · سطر مقيَّد بالمخزون · كوبون غير صالح (نص تحت الحقل بلون `red-600`) · «استعدنا سلتك».
- **الجوال (390px)**: drawer 92%، صورة السطر 64px، منتقي الكمية 44px لكل زر، الملخص وزر الدفع ثابتان أسفل الـ drawer فوق الشريط السفلي.
- **اختصارات**: `Esc` إغلاق · `Tab` يتنقّل بين الأسطر ومنتقي الكمية · لا اختصارات حرفية (صفحة عامة).

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| قراءة السلة | `GET /api/v1/cart/?currency=` → `{items[], count, currency, display_subtotal}` | Ready |
| إضافة / تقليل / حذف سطر | `POST /api/v1/cart/actions/` `{product_id, size, color, action_type}` → `{cart_count, product_qty}` | Ready |
| إفراغ السلة | `DELETE /api/v1/cart/` → 204 | Ready |
| صورة السطر، `variant_id`, `variant_label`, رابط المنتج، حد المخزون | غير مُصدَّرة في `items[]` | `[NEEDS BACKEND]` → توسيع كل عنصر بـ `image, variant_id, variant_label, product_slug, max_quantity, stock` |
| ضبط كمية مباشرة (إدخال رقم) | — | `[NEEDS BACKEND]` → `action_type:'set_quantity'` + `quantity`؛ حتى توفره يُرسل فرق `add`/`decrease` متسلسلاً |
| تطبيق/إزالة كوبون | `POST /cart/apply-coupon/`, `/cart/remove-coupon/` HTML | `[NEEDS BACKEND]` → `POST /api/v1/cart/coupon/` `{code}` → `{coupon_code, display_discount, display_subtotal, display_total}` / 400 `{detail}`؛ `DELETE /api/v1/cart/coupon/` |
| العروض التلقائية والإجمالي بعد الخصم | `pricing.py` داخل الـ checkout فقط | `[NEEDS BACKEND]` → إضافة `applied_offers:[{name, offer_type, display_discount}]`, `display_discount`, `display_total` إلى استجابة السلة |
| حد الشحن المجاني والمتبقي | `StoreSetting.free_shipping_threshold` | `[NEEDS BACKEND]` → `free_shipping_threshold` في `/config/` (مشترك مع M09) + `display_free_shipping_remaining` في السلة |
| التقاط هاتف المشتري للسلة المتروكة | `AbandonedCart` بـ `session_key` خادمياً | `[NEEDS BACKEND]` → `POST /api/v1/cart/contact/` `{phone, name?}` → 204 |
| استرداد سلة من رابط التذكير | `restore_abandoned_cart` HTML (`cart_url`) | `[NEEDS BACKEND]` → `POST /api/v1/cart/restore/` `{token}` → السلة + `{coupon_code?}` |
| عدّاد الرأس | `count` من `GET /api/v1/cart/` | Ready |

## 8. الحالات الحدّية (Edge Cases)

- الـ session cookie مرفوضة (متصفح يحجب كوكيز الطرف الثالث): الـ BFF نفس الأصل يجعلها first-party؛ إن فشلت رغم ذلك تُعرض «فعّل الكوكيز لاستخدام السلة» بدل سلة صامتة فارغة.
- منتج في السلة أصبح غير متاح/محذوفاً: الخادم يعيده أو يحذفه؛ إن عاد بـ `display_price` فارغ يُعرض السطر معتَّماً مع «غير متاح الآن — أزِله للمتابعة» وزر الدفع معطَّل.
- استجابة `GET /api/v1/cart/` 503 (المتجر قيد التجهيز) أو 403 (session مرتبطة بمتجر آخر): يُفوَّض إلى M47؛ الحالة الثانية تمسح الكوكي وتعيد المحاولة مرة واحدة.
- تبديل العملة أثناء طلب إضافة معلَّق: يُنتظر اكتمال الطابور ثم يُعاد الجلب بالعملة الجديدة.
- تبويبان مفتوحان: تغيير في أحدهما يظهر في الآخر عند `focus` (refetchOnWindowFocus) بلا WebSocket.
- كمية بأرقام هندية «٣»: تُحوَّل إلى 3 قبل الإرسال.
- سلة تحوي منتج مزاد (`is_auction`): الكمية مُثبَّتة على 1 ومنتقي الكمية مخفي.
- سلة تحوي منتج قابل للحجز: يُعرض `start_datetime` تحت الاسم بـ `Intl.DateTimeFormat('ar')`؛ تغييره يُحيل إلى M10.

## 9. معايير النجاح (Success Criteria)

- **SC-11.1**: اللوحة تظهر بالسطر الجديد في ≤ 100ms من الضغط على 90% من الأجهزة المتوسطة.
- **SC-11.2**: 0 تضارب بين شارة العدّاد و`count` بعد اكتمال أي تزامن.
- **SC-11.3**: 100% من المبالغ المعروضة مصدرها `display_*` (فحص كود: لا `Intl.NumberFormat` بعملة في الوحدة).
- **SC-11.4**: نسبة الانتقال من فتح السلة إلى الـ checkout ≥ 60% في الاختبار الموجَّه؛ خطوة واحدة (زر واحد).
- **SC-11.5**: اللوحة قابلة للاستخدام كاملاً بلوحة المفاتيح وبقارئ الشاشة (تسمية كل زر كمية باسم المنتج).
- **SC-11.6**: 0 أخطاء console/hydration عند الفتح والإغلاق المتكرر 20 مرة.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M47 (BFF، كوكيز، `/sw.js` network-only)، M09 (الرأس، العملة، بطاقة المنتج)، M10 (مصدر الإضافة والمتغيرات)، M12 (الوجهة)، M13 (كوبونات/عروض/سلات متروكة).
- افتراض: الـ BFF يُمرِّر `Set-Cookie` من Django كما هو (sessionid على أصل المتجر)؛ لا حاجة لـ `SameSite=None`.
- افتراض: الشحن يُحسب في M12 فقط؛ السلة تعرض الإجمالي الفرعي والخصومات دون شحن.
- افتراض: حتى توسيع `items[]`، تُستكمل الصورة والرابط من كاش تفاصيل المنتج (`['store', <store>, 'product', id]`) إن وُجد، وإلا يُعرض مربع بحد 1px بالاسم.
- افتراض: الكوبون يُدخل في السلة وفي الـ checkout معاً بنفس المكوّن؛ مصدر الحقيقة الـ session.
- افتراض: السلة الجانبية تنزلق من جهة النهاية (اليسار في RTL) لتبقى أيقونة السلة في الرأس مرئية فوقها.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I (Anti-AI): لا رسم توضيحي لحالة الفراغ، لا شريط تقدّم ملون للشحن المجاني (zinc + نص دلالي فقط)، زر دفع واحد مصمت والبقية outline/نص؛ لا رسوم متحركة احتفالية.
- II (RTL): اللوحة من جهة النهاية بـ `inset-inline-end`؛ منتقي الكمية «−/+» بترتيب منطقي لا فيزيائي؛ الأسعار Mono محاذاة نهاية؛ أيقونة الإغلاق في البداية.
- IV (Visual check): لقطات `docs/visual-checks/11-cart/{desktop,tablet,mobile,mobile-dark}.png` للسلة الممتلئة (3 أسطر بمتغيرات)، الفارغة، سطر مقيَّد بالمخزون، كوبون خاطئ، و`/cart` الكاملة.
- VIII: مفتاح الكاش `['store', <store>, 'cart']`؛ لا يُشارك مع لوحة التاجر.
- IX: Zustand للحالة اللحظية (مفتوح/طابور)، TanStack Query للسلة، Zod على `/cart/` و`/cart/actions/`؛ أهداف لمس ≥ 44px.
