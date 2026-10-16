# M10 — صفحة تفاصيل المنتج (Product Detail Page)

**Route group**: `(storefront)/[store]` · **Priority**: P1 · **Backend status**: Ready للأساس (`GET /api/v1/catalog/products/<id>/`)؛ المعرض، المتغيرات، أسعار الشرائح، التقييمات، المزاد، الحجز، المرتبطة، المفضلة HTML-only `[NEEDS BACKEND]`
**Discovery refs**: `03-api-payments-shipping-theme-integrations.md` §1 (ProductDetailView, CartActionView, الفجوة الحرجة) · `02-products-domain-model.md` §1, §2 (Product, 3-tier variants, other catalog models), §13 (bookings, reviews, wishlist, back-in-stock) · **Benchmarks**: Apple (معرض نظيف بمساحة بيضاء، صندوق شراء ثابت)، Amazon (Buy Box واضح: السعر، التوفر، التسليم، زر واحد مسيطر)، Shopify Dawn (منتقي متغيرات بثلاثة أنماط، زر إضافة لاصق على الجوال)

## 1. الهدف (Purpose)

إعطاء المشتري كل ما يحتاجه لقرار الشراء في شاشة واحدة بلا تمرير مُربك: الصورة، السعر الفعلي للمتغير المختار، التوفر، سياسة الدفع، وزر إضافة واحد مسيطر؛ مع دعم أنواع المنتجات الخاصة في «شروه» (حزم، تخصيص، مزادات، حجوزات، تسعير بالصيغة) داخل نفس القالب. يُقاس بنسبة الإضافة إلى السلة من زيارات PDP وبصفر أخطاء اختيار متغير.

## 2. الفاعلون (Actors)

- **المشتري**: يقارن، يختار المتغير والكمية، يضيف إلى السلة أو يشتري مباشرة، يقيّم، يحفظ في المفضلة، يشترك في إشعار التوفر، يزايد، أو يحجز موعداً.
- **التاجر**: يعتمد على أن `variant_display_style` و`product_template` و`payment_policy` التي ضبطها في M04 تظهر كما قصد.
- **محركات البحث**: تقرأ JSON-LD `Product` مع `Offer` وتقييمات مجمَّعة.

## 3. قصص المستخدم (User Stories)

### US-10.1 — المعرض وصندوق الشراء (P1)
يفتح المشتري `/p/[id]` فيرى معرض الصور (صورة رئيسية + مصغّرات، فيديو إن وُجد) وبجانبه صندوق شراء ثابت: الاسم، التصنيف، السعر وما قبل التخفيض، التوفر، سياسة الدفع، منتقي الكمية، وزر «أضف إلى السلة».
**Independent Test**: Mock منتج بـ 5 صور وسعر قديم → المعرض يتنقّل بالأسهم ولوحة المفاتيح والسحب، والصندوق يبقى ظاهراً أثناء التمرير على 1440px ولاصقاً أسفل الشاشة على 390px.
**Acceptance**:
1. **Given** `display_old_price` موجود، **When** يُعرض الصندوق، **Then** يظهر مشطوباً بلون muted قبل `display_price` بخط Mono، مع «تخفيض» نصية؛ لا نسبة محسوبة محلياً.
2. **Given** `stock ≤ low_stock_threshold` (افتراضي 3) و`stock > 0`، **Then** يُعرض «بقي N فقط» بلون `amber-600`؛ `stock=0` و`allow_backorder=true` → «متاح للطلب المسبق» وزر الإضافة يبقى فعّالاً؛ `stock=0` بلا backorder → الزر يصير «أعلمني عند التوفر».
3. **Given** `payment_policy='deposit'` و`deposit_required`، **Then** يُعرض سطر «عربون مقدماً: <display_deposit> والباقي عند الاستلام»؛ `cod` → «الدفع عند الاستلام»؛ `full` → «الدفع كاملاً مقدماً».
4. **Given** `min_quantity`/`max_quantity`/`allow_variable_quantity`، **Then** يُقيَّد منتقي الكمية بهما ويُعرض `unit` (مثل «كيلوغرام») بجانب الكمية حين يختلف عن `piece`.

### US-10.2 — المتغيرات ثلاثية المستوى والسعر الفعلي (P1)
يختار المشتري قيم السمات (المقاس/اللون/الخامة…) فيتحدد `ProductVariant` واحد ويتحدث السعر والمخزون والصورة.
**Acceptance**:
1. **Given** `variant_display_style='swatches'`، **When** تُعرض سمة لون بخيارات لها `image`/قيمة لون، **Then** تُعرض كمربعات 44px بحد `1px` والمختار بحلقة `ring`؛ `dropdown` → Select من Shadcn؛ `radio` → مجموعة أزرار نصية.
2. **Given** اختيار «أحمر» بينما لا يوجد متغير «أحمر + XL»، **Then** يُعطَّل خيار XL (شطب + `aria-disabled`) لا يُخفى، مع تلميح «غير متوفر بهذا اللون».
3. **Given** متغير مُحدَّد بـ `display_effective_price`، **Then** يحلّ محل سعر المنتج فوراً (< 100ms) ويُحدَّث `stock` و`sku` والصورة في المعرض.
4. **Given** منتج قديم بـ `sizes_list[]`/`colors_list[]` فقط بلا `variants[]`، **Then** يُعرض منتقيان بسيطان (مقاس/لون) وتُرسل `size`/`color` كما يقبلها `POST /api/v1/cart/actions/`.
5. **Given** إضافة بلا اختيار سمة مطلوبة، **Then** يُركَّز على السمة الناقصة مع رسالة تحت الحقل، ولا يُرسل الطلب.

### US-10.3 — التسعير الخاص: شرائح، صيغة، حزمة، تخصيص (P1)
**Acceptance**:
1. **Given** `tier_prices[]`، **Then** يُعرض جدول «الكمية من — سعر الوحدة» بخط Mono محاذاة نهاية، ويُظلَّل الصف المطابق للكمية الحالية، ويتحدث السعر الإجمالي التقديري من قيمة الخادم للشريحة.
2. **Given** `pricing_type='formula'`، **Then** يُعرض مُدخل القيمة (بالوحدة) ومعادلة مقروءة «سعر الوحدة × المعامل + إضافة ثابتة» بقيم الخادم المنسَّقة، والسعر النهائي يُطلب من الخادم لا يُحسب محلياً.
3. **Given** `is_bundle=true` و`bundle_components[]`، **Then** تُعرض قائمة المكونات بصورها وكمياتها، والاختيارية (`is_optional`) بمربعات اختيار، و`display_build_fee` كسطر منفصل.
4. **Given** `is_personalizable=true`، **Then** تُعرض `personalization_fields[]` بأنواعها التسعة (`text` · `textarea` · `number` · `select` · `multi_select` · `date` · `checkbox` · `file` · `image`) بتحقق `is_required` و`display_price_add` بجانب كل حقل له إضافة سعرية؛ الملفات/الصور بامتدادات `jpg,jpeg,png,webp,gif`/`pdf` فقط.

### US-10.4 — المزاد (P2)
**Acceptance**:
1. **Given** `auction.status='active'`، **Then** تُعرض لوحة: المزايدة الحالية، `display_bid_step`، عدّاد تنازلي لـ `end_at` بخط Mono، عدد المزايدات، وزر «زايد» بمبلغ مقترح = الحالية + الخطوة؛ `display_buy_now` كزر ثانوي إن وُجد.
2. **Given** مزايدة خلال آخر `anti_sniping_seconds`، **Then** يُعرض تنبيه «سيُمدَّد المزاد عند أي مزايدة في الثواني الأخيرة» ويُحدَّث `end_at` من استجابة الخادم.
3. **Given** `status='ended'` أو `draft`، **Then** يُعطَّل الزر مع «انتهى المزاد»/«لم يبدأ بعد»؛ المخزون ثابت 1.

### US-10.5 — الحجز بالمواعيد (P2)
**Acceptance**:
1. **Given** `is_bookable=true` و`booking_duration_minutes`، **Then** يُعرض تقويم أسبوعي يجلب الفترات المتاحة ليوم مختار، وكل فترة بحالتها (`held` · `booked` · `cancelled` تُخفى، المتاحة قابلة للاختيار)، والمختارة تُمرَّر كـ `start_datetime` إلى M12.
2. **Given** يوم بلا فترات، **Then** يُعرض «لا مواعيد متاحة في هذا اليوم» مع أقرب يوم متاح.

### US-10.6 — التقييمات والثقة (P2)
**Acceptance**:
1. **Given** `reviews_summary{average_rating, rating_distribution}`، **Then** يُعرض المتوسط بخط Mono وتوزيع 5 أشرطة أفقية رفيعة (zinc، لا ألوان) وعدد التقييمات؛ `admin_reply` يظهر متداخلاً تحت التقييم.
2. **Given** زر «أضف تقييمك»، **Then** يُطلب الهاتف + OTP واتساب (لا حسابات) ثم `rating` 1–5 ونص؛ النجاح يُعرض «شكراً، سيظهر تقييمك بعد المراجعة».

### US-10.7 — المرتبطة، المفضلة، إشعار التوفر، المشاركة، SEO (P2)
**Acceptance**:
1. **Given** `related{related, upsell, cross_sell}`، **Then** تُعرض ثلاثة صفوف أفقية بعناوين «قد يعجبك» / «الأفضل منه» / «يُكمِله» بنفس بطاقة M09، ويُخفى الصف الفارغ.
2. **Given** ضغط «المفضلة»، **Then** يُحدَّث محلياً فوراً ويُطلب الهاتف عند أول مزامنة خادمية فقط.
3. **Given** `product_template='landing_page'`، **Then** يُعرض قالب عمود واحد: معرض كامل العرض، وصف غني، صندوق شراء لاصق، بلا شريط أقسام ولا مرتبطة.
4. **Given** أي منتج، **Then** يُولَّد JSON-LD `Product` (`name`, `image[]`, `sku`, `brand`, `offers{price, priceCurrency, availability}`, `aggregateRating`) من قيم خام مخصصة للـ structured data فقط، لا من `display_*`.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-10.01**: الصفحة MUST تُرسم خادمياً من `GET /api/v1/catalog/products/<id>/?currency=` مع `generateMetadata` (العنوان، الوصف، OG من الصورة الأولى)؛ 404 من الخادم → `notFound()` بصفحة «هذا المنتج غير متاح».
- **FR-10.02**: السعر المعروض MUST يكون دائماً من `display_price` أو `display_effective_price` للمتغير أو `display_price` للشريحة؛ يُمنع أي جمع/ضرب محلي للعرض.
- **FR-10.03**: منتقي المتغيرات MUST يدعم الأنماط الثلاثة (`swatches` · `dropdown` · `radio`) بنفس الحالة الداخلية، ويُعطِّل التوليفات غير المتوفرة بدل إخفائها.
- **FR-10.04**: الإضافة إلى السلة MUST تستدعي `POST /api/v1/cart/actions/` بـ `{product_id, size, color, action_type:'add'}` اليوم، وتُمرِّر `variant_id`, `quantity`, `personalization`, `start_datetime` حين يتوفر العقد الموسَّع؛ النجاح يفتح M11 ويُحدِّث `cart_count`.
- **FR-10.05**: «اشترِ الآن» MUST يُحوِّل إلى M12 بوضع الشراء المباشر حاملاً `size`/`color`/`variant_id`/`start_datetime` دون المرور بالسلة.
- **FR-10.06**: زر الإضافة MUST يكون لاصقاً أسفل الشاشة على الجوال مع السعر الحالي، ويختفي عندما يكون الصندوق الأصلي ظاهراً.
- **FR-10.07**: الصفحة MUST تعرض `delivery_duration` و`is_free_shipping` وسياسة الإرجاع (رابط إلى `return_policy`) في «معلومات التسليم» تحت الزر.
- **FR-10.08**: الحقول الاختيارية الغائبة (`video_url`, `tier_prices`, `auction`, …) MUST تُخفي كتلتها كاملة، لا placeholder.
- **FR-10.09**: كل تفاعل (تغيير متغير، كمية، مزايدة) MUST يحترم `prefers-reduced-motion` ويحدّث `aria-live="polite"` للسعر والتوفر.
- **FR-10.10**: `views_count` يُحتسب خادمياً عند GET؛ الواجهة MUST NOT ترسل أحداث عرض إضافية.
- **FR-10.11**: الصفحة MUST تضم `breadcrumb` من `category` (مثال «إلكترونيات ⟵ هواتف») وJSON-LD `BreadcrumbList`.
- **FR-10.12**: المشاركة MUST تستخدم Web Share API حين تتوفر، وإلا نسخ الرابط + زر واتساب.

## 5. الكيانات والحالات (Key Entities & States)

- **ProductDetail** (Ready اليوم): `id`, `name`, `image`, `category`, `display_price`, `display_old_price`, `stock`, `is_featured`, `is_free_shipping`, `payment_policy` (`cod` · `deposit` · `full`), `description`, `sizes_list[]`, `colors_list[]`, `deposit_required`. المطلوب لاحقاً: `name_en`, `description_en`, `images[]`, `video_url`, `unit` (14 قيمة)، `min_quantity`, `max_quantity`, `allow_variable_quantity`, `low_stock_threshold`, `allow_backorder`, `delivery_duration`, `product_template` (`standard` · `landing_page`), `variant_display_style`, `pricing_type` (`fixed` · `formula`), `product_type` (`physical` · `digital` · `service`).
- **VariantAttribute / VariantOption / ProductVariant**: السمة (`name`, `field_type`: `select` · `radio` · `multi_select` · `swatches` · `text` · `numeric` · `date`, `is_required`, `sort_order`) → الخيار (`value`, `image`) → المتغير (`options[]`, `display_effective_price`, `stock`, `sku`, `image`). حالات الخيار: متاح · غير متوفر بالتوليفة · مختار.
- **ProductTierPrice**: `min_quantity`, `display_price`. **Formula**: `formula_unit_price`, `formula_coefficient`, `formula_fixed_extra`, `live_rate_ref`.
- **BundleComponent**: `product`, `quantity`, `is_optional`; `bundle_build_fee`. **PersonalizationField**: `label`, `field_type` (9), `is_required`, `options_csv`, `price_add`.
- **Auction**: `status` (`draft` · `active` · `ended`), `start_bid`, `bid_step`, `reserve`, `buy_now`, `end_at`, `anti_sniping_seconds`; **AuctionBid**. **BookingSlot**: `start_datetime`, `status` (`held` · `booked` · `cancelled`).
- **ProductReview**: `rating` 1–5, نص, `admin_reply`. **RelatedProduct**: `cross_sell` · `upsell` · `related`. **WishlistItem**/**BackInStockNotification**: بالهاتف.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/p/[id]` (قالب `standard`: معرض 7/12 + صندوق شراء 5/12 لاصق) · `/p/[id]` بقالب `landing_page` (عمود واحد) · لوحات داخلية: منتقي المواعيد (sheet)، نموذج التقييم (dialog/drawer)، نموذج إشعار التوفر، لوحة المزاد.
- **الحالات البصرية**: skeleton بنفس أبعاد المعرض والصندوق · منتج غير موجود/مؤرشف (404 بنص ورابط إلى التصنيف) · نفدت الكمية · طلب مسبق · قيد المزاد/انتهى · لا تقييمات بعد («كن أول من يقيّم») · خطأ إضافة إلى السلة (Sonner أسفل-البداية مع إعادة المحاولة).
- **الجوال (390px)**: معرض كامل العرض بتمرير snap ومؤشر «2/5» Mono، الصندوق يصير محتوى الصفحة وزر لاصق أسفلها، التقييمات والمرتبطة بتمرير أفقي، منتقي المواعيد drawer من Vaul.
- **اختصارات**: `←/→` تنقّل المعرض (معكوسة في RTL) · `Esc` يغلق المعرض المكبَّر · `Enter` على المتغير يختاره.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| تفاصيل المنتج الأساسية | `GET /api/v1/catalog/products/<id>/?currency=` | Ready |
| حقول إضافية (`name_en`, `description_en`, `unit`, `min/max_quantity`, `allow_variable_quantity`, `low_stock_threshold`, `allow_backorder`, `delivery_duration`, `product_template`, `product_type`, `meta_*`) | على `Product` غير مُصدَّرة | `[NEEDS BACKEND]` → ضمّها إلى نفس الاستجابة بأسمائها |
| المعرض | `ProductImage` + `video_url` | `[NEEDS BACKEND]` → `images:[{url, alt, sort_order}]`, `video_url` |
| المتغيرات 3-tier | `VariantAttribute`/`VariantOption`/`ProductVariant` | `[NEEDS BACKEND]` → `variant_display_style`, `attributes:[{id, name, field_type, is_required, options:[{id, value, image}]}]`, `variants:[{id, option_ids[], display_effective_price, stock, sku, image}]` |
| أسعار الشرائح | `ProductTierPrice`, `get_tier_price(qty)` | `[NEEDS BACKEND]` → `tier_prices:[{min_quantity, display_price}]` |
| التسعير بالصيغة | `pricing_type`, `formula_*` | `[NEEDS BACKEND]` → `formula:{unit, display_unit_price, coefficient, display_fixed_extra}` + `GET …/quote/?value=` → `{display_price}` |
| الحزم | `BundleComponent`, `bundle_build_fee` | `[NEEDS BACKEND]` → `bundle:{display_build_fee, components:[{product_id, name, image, quantity, is_optional}]}` |
| التخصيص | `PersonalizationField` | `[NEEDS BACKEND]` → `personalization_fields:[{id, label, field_type, is_required, options[], display_price_add}]` |
| المزاد والمزايدة | `Auction`, `AuctionBid` HTML | `[NEEDS BACKEND]` → `GET …/auction/` → `{status, display_current_bid, display_bid_step, display_buy_now, end_at, anti_sniping_seconds, bids_count}`؛ `POST …/auction/bids/` `{amount, phone, otp}` → 200/409 |
| الفترات المتاحة | `GET /product/<id>/available-slots/` JSON (HTML URLConf) | HTML-only `[NEEDS BACKEND]` → `GET /api/v1/catalog/products/<id>/available-slots/?date=` → `{slots:[{start_datetime, end_datetime, status}]}` |
| التقييمات | `submit_review` HTML, `ProductReview` | `[NEEDS BACKEND]` → `GET …/reviews/?page` → `{average_rating, rating_distribution{1..5}, results:[{rating, comment, customer_name, created_at, admin_reply}]}`؛ `POST …/reviews/` `{rating, comment, phone, otp}` |
| المرتبطة | `RelatedProduct` | `[NEEDS BACKEND]` → `related:{related:[card], upsell:[card], cross_sell:[card]}` |
| المفضلة / إشعار التوفر | `toggle_wishlist`, `subscribe_back_in_stock` HTML | `[NEEDS BACKEND]` (E-42) → `POST /api/v1/wishlist/toggle/` `{product_id, phone}`؛ `POST …/back-in-stock/` `{phone}` |
| إضافة إلى السلة | `POST /api/v1/cart/actions/` `{product_id, size, color, action_type}` → `{cart_count, product_qty}` | Ready جزئياً؛ `[NEEDS BACKEND]` → قبول `variant_id`, `quantity`, `personalization{}`, `start_datetime` |
| JSON-LD | — | `[NEEDS BACKEND]` → `structured:{price, currency, sku, brand, availability}` قيم خام للـ SEO فقط |

## 8. الحالات الحدّية (Edge Cases)

- منتج `is_available=false` أو `archived_at` أو `published_at` مستقبلي: الخادم يعيد 404 → صفحة «غير متاح» مع بحث ورابط التصنيف؛ لا تُعرض بيانات من الكاش.
- منتج `is_auction=true`: المخزون 1 ومنتقي الكمية مخفي وزر الإضافة يُستبدل بالمزايدة؛ `buy_now` يُحوِّل إلى M12 مباشرة.
- `sale_end_at` انتهى بين التحميل والإضافة: الخادم يعيد السعر الجديد في السلة → تُعرض ملاحظة «تغيّر السعر» في M11.
- `variants[]` كلها `stock=0` بينما `product.stock > 0`: يُعرض «نفدت الكمية» على مستوى المنتج لأن حقيقة المخزون في المتغير.
- منتج `product_type='digital'` أو `service`: تُخفى كتلة التسليم والشحن؛ `service` مع `is_bookable` يُظهر التقويم مكان منتقي الكمية.
- حقل تخصيص `file` بحجم كبير: يُرفض محلياً فوق 5MB برسالة تحت الحقل قبل أي رفع.
- عدّاد المزاد مع انحراف ساعة الجهاز: يُحسب الفرق من `Date` الخادم في ترويسة الاستجابة، لا من ساعة المتصفح وحدها.
- `?currency=` مختلفة عن عملة السلة الحالية: الخادم يُثبِّت الأخيرة؛ تُعرض الاستجابة كما هي ويُحدَّث المبدّل في الرأس.

## 9. معايير النجاح (Success Criteria)

- **SC-10.1**: LCP ≤ 2.5s وCLS ≤ 0.1 على الجوال؛ الصورة الأولى `priority` والبقية lazy.
- **SC-10.2**: تغيير المتغير يحدّث السعر والصورة والتوفر في ≤ 100ms بلا طلب شبكي إضافي.
- **SC-10.3**: 0 حالات تُرسل فيها إضافة بلا سمة مطلوبة؛ 100% من التوليفات غير المتوفرة تُعرض معطَّلة بسبب مقروء.
- **SC-10.4**: الإضافة إلى السلة من الفتح ≤ 2 نقرات (متغير + زر) على الجوال؛ ≤ 6 ثوانٍ في اختبار 5 مستخدمين.
- **SC-10.5**: JSON-LD يمرّ Rich Results Test بلا أخطاء لمنتج عادي ومنتج بتقييمات.
- **SC-10.6**: الصفحة قابلة للتشغيل كاملة بلوحة المفاتيح (معرض، متغيرات، كمية، زر) مع `focus-visible`.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M09 (بطاقة المنتج، الرأس، الثيم)، M11 (فتح السلة بعد الإضافة)، M12 (الشراء المباشر، `start_datetime`)، M47 (BFF/كوكيز)، E-37 (مصدر الحزم/التخصيص/المزاد)، E-26 (الحجوزات)، E-42 (المفضلة/التقييمات/إشعار التوفر).
- افتراض: `/p/[id]` بالمعرّف الرقمي مع جزء اختياري من `slug` بعده للقراءة فقط؛ الخادم يحلّ بالمعرّف.
- افتراض: حتى توسيع العقد تُبنى الواجهة على Mock بنفس أسماء حقول الموديلات، وتُعرض كتل الميزات المفقودة مخفية (لا placeholder) على البيانات الحقيقية.
- افتراض: التقييم والمزايدة والمفضلة الخادمية تطلب هاتفاً + OTP واتساب بنفس نمط الـ checkout (العملاء بلا حسابات)؛ الهاتف يُحفظ محلياً بعد أول تحقق.
- افتراض: الأسبوع في منتقي المواعيد يبدأ من الأحد للعرض، مع تحويل داخلي لأن `ServiceAvailability.weekday` يبدأ من الاثنين (0=Mon).
- افتراض: السعر الخام في `structured{}` يُستخدم حصراً لـ JSON-LD ويُمنع رسمه في الواجهة.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I (Anti-AI): لا شارات ملونة كبيرة ولا «ثقة» بأيقونات في دوائر؛ معلومات التسليم كقائمة نصية بحدود أفقية؛ توزيع التقييمات أشرطة zinc رفيعة؛ زر إضافة واحد مسيطر وبقية الأزرار outline. لا كونفيتي عند الإضافة.
- II (RTL): أسهم المعرض ومؤشر «2/5» تنعكس؛ جدول الشرائح أعماده من اليمين والأرقام Mono محاذاة نهاية؛ عدّاد المزاد Mono `tabular-nums`؛ `start_datetime` يُعرض عبر `Intl.DateTimeFormat('ar')`.
- IV (Visual check): لقطات `docs/visual-checks/10-pdp/{desktop,tablet,mobile,mobile-dark}.png` لمنتج بمتغيرات swatches، منتج بشرائح وحزمة، منتج مزاد، منتج قابل للحجز، قالب `landing_page`، وحالة نفدت الكمية.
- VII: ألوان الثيم من رموز `(storefront)` فقط؛ لون الـ swatch هو القيمة الوحيدة المسموح بها كـ inline style لأنه بيانات لا تصميم.
- IX: Zod على التفاصيل وكل الاستجابات الفرعية؛ حالة المتغير المختار في Zustand لحظياً؛ الكمية والمتغير يُعكسان في الرابط (`?v=`) ليصلح للمشاركة.
