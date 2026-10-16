# M09 — واجهة المتجر: الصفحة الرئيسية وصفحات التصفّح (Customer Storefront Home & Listing)

**Route group**: `(storefront)/[store]` · **Priority**: P1 · **Backend status**: Ready (`GET /api/v1/config/`, `GET /api/v1/catalog/categories/`, `GET /api/v1/catalog/products/`)؛ حقول ثيم/إعلان/SEO ناقصة في `/config/` وخيارات الفلاتر بلا endpoint `[NEEDS BACKEND]`
**Discovery refs**: `03-api-payments-shipping-theme-integrations.md` §1, §2, §5, §7, §9 · `02-products-domain-model.md` §1, §2, §11 · `01-tenants-dashboard-admin.md` §3.2 (Storefront), §5 (`themes/default/` partials) · **Benchmarks**: Apple Store (المساحة البيضاء، صورة المنتج هي الزخرفة الوحيدة)، Farfetch/Ounass (فلاتر جانبية ذكية بعدّادات، RTL أصيل في Ounass)، Noon (سرعة الجوال، شريط أقسام أفقي، تنقّل سفلي ثابت)

## 1. الهدف (Purpose)

تحويل ما اختاره التاجر في Theme Customizer (ألوان، خطوط، أقسام الصفحة) إلى متجر يفتح على جوال المشتري في أقل من 2.5 ثانية ويقوده من الصفحة الرئيسية إلى بطاقة المنتج في نقرة واحدة، مع تصفّح بالفلاتر يحتفظ بحالته في الرابط. يُقاس بـ LCP على الجوال ونسبة الجلسات التي تصل إلى PDP (M10) أو تضيف إلى السلة (M11).

## 2. الفاعلون (Actors)

- **المشتري (زائر بلا حساب)**: يصل من رابط واتساب/تيك توك غالباً على الجوال، لا يملك حساباً (العملاء بالهاتف + OTP فقط)، يريد السعر والتوفر فوراً.
- **التاجر**: يتوقع أن يرى اختياراته (preset، خطوط، ترتيب الأقسام) منعكسة فوراً بعد الحفظ في M08.
- **محركات البحث والمعاينات الاجتماعية**: تقرأ العناوين والـ Open Graph وJSON-LD.
- **النظام**: يلتقط `?aff_id=` و`utm_*` و`traffic_source` عبر الـ BFF (الكوكيز تُمرَّر إلى Django).

## 3. قصص المستخدم (User Stories)

### US-09.1 — الصفحة الرئيسية بأقسام التاجر وترتيبه (P1)
يفتح المشتري `https://<store>.<base>/` فيرى أقسام الصفحة بالترتيب الذي رتّبه التاجر، كلٌّ بإعداداته (`settings{title, category_id, limit, show_on_mobile}`) ومحتواه (`content_data`)، وتُخفى الأقسام غير الفعّالة أو ذات `show_on_mobile=false` على الجوال.
**Independent Test**: Mock لـ `/config/` بـ 8 أقسام بترتيب عشوائي → الصفحة تعرضها بنفس `order`؛ تعطيل قسم → يختفي بلا فراغ؛ `show_on_mobile=false` → يختفي على 390px فقط.
**Acceptance**:
1. **Given** `sections[]` فيها `hero` ثم `category_strip` ثم `featured_products`، **When** تُحمَّل الصفحة، **Then** يُعرض `hero` أولاً كصورة/عنوان بحد `1px` بلا تدرج، ثم شريط أقسام أفقي قابل للتمرير، ثم شبكة المنتجات المميزة من `GET /catalog/products/?is_featured=true&page_size=<limit>`.
2. **Given** قسم `product_grid` بـ `content_data{category_id, limit, title}`، **When** يُعرض، **Then** يُجلب `GET /catalog/products/?category=<id>&page_size=<limit>` ويُعرض العنوان من `content_data.title` ثم `settings.title` كاحتياط، ورابط «عرض الكل» إلى صفحة التصنيف.
3. **Given** قسم `slider` أو `banner_grid` بـ `items:[{image, title, link}]`، **When** يُعرض، **Then** يُعرض كـ Bento غير متماثل (banner_grid) أو كسلايدر بتمرير يدوي ونقاط تنقّل (slider) مع `next/image` و`alt=title`، ولا يتحرك آلياً إن كان `prefers-reduced-motion`.
4. **Given** `sections[]` فارغة، **When** تُحمَّل الصفحة، **Then** يُعرض ترتيب افتراضي: أحدث المنتجات (`latest_products`) ثم شريط الأقسام، لا صفحة فارغة.

### US-09.2 — ثيم التاجر كرموز تصميمية (P1)
تُقرأ ألوان التاجر وخطوطه من `/config/` وتُطبَّق كمتغيرات CSS على جذر مجموعة `(storefront)` فقط؛ لوحة التاجر والصفحة الترويجية لا تتأثر.
**Independent Test**: فتح متجرَين بألوان مختلفة في تبويبَين → كلٌّ بألوانه؛ فتح `/dashboard` من نفس الأصل → لوحة zinc بلا لون brand.
**Acceptance**:
1. **Given** `primary_color` و`brand_shades{50..900}`، **When** يُرسم الجذر، **Then** تُعيَّن `--brand-50..--brand-900` و`--background` من `background_color` و`--foreground` من `text_color` و`--secondary` من `secondary_color` كـ inline style على عنصر جذر المتجر، والمكونات تستهلكها عبر فئات دلالية فقط.
2. **Given** `heading_font='Cairo'` و`body_font='Almarai'`، **When** تُحمَّل الصفحة، **Then** يُحمَّل الخطّان فقط من الـ 11 المسموح بها عبر `next/font/google` بـ `display: swap`، وأي قيمة خارج القائمة تسقط إلى IBM Plex Sans Arabic.
3. **Given** `theme_preset` من التسعة (`modern_trust` · `luxury_boutique` · `organic_earth` · `tech_cyber` · `bold_streetwear` · `aurora_glass` · `neo_brutalism` · `cinematic_silk` · `clay_zen`) أو `custom`، و`design_style` (افتراضي `fluid`)، **When** يُرسم الجذر، **Then** يُوضع `data-preset` و`data-style` على الجذر ويُفسَّر كلٌّ كخريطة رموز (نصف قطر، كثافة، سماكة حدود، نمط الأزرار) بلا تدرجات أو هالات حتى في `aurora_glass` (طبقة شفافية واحدة على الرأس فقط).
4. **Given** لون brand فاتح جداً، **When** يُرسم زر أساسي، **Then** يُختار لون نص الزر (`#09090B` أو `#FAFAFA`) آلياً لضمان تباين AA.

### US-09.3 — الرأس والتنقّل والعملة (P1)
يرى المشتري رأساً ثابتاً: الشعار (`logo` أو `store_name` نصياً)، بحث، مبدّل العملة، المفضلة، السلة بعدّادها؛ وعلى الجوال شريطاً سفلياً ثابتاً وورقة أقسام (sheet).
**Acceptance**:
1. **Given** `?currency=USD` أو اختيار من المبدّل (`SAR` ريال سعودي · `USD` دولار أمريكي · `YER_OLD` يمني صنعاء · `YER_NEW` يمني عدن)، **When** يُبدَّل، **Then** يُستدعى `GET /api/v1/cart/?currency=USD` لتثبيتها في الـ session ثم تُعاد كل استعلامات المنتجات بـ `?currency=USD`، وتُعرض الأسعار كما أرسلها الخادم (`display_price`).
2. **Given** كتابة في البحث، **When** يُضغط Enter، **Then** يُنقل إلى `/search?q=` التي تستدعي `?search=`؛ والاقتراحات أثناء الكتابة تستخدم نفس الـ endpoint بـ `page_size=5` بعد 2 حرفَين وتأخير 200ms.
3. **Given** الجوال، **When** تُفتح أي صفحة، **Then** يظهر شريط سفلي (الرئيسية · الأقسام · البحث · السلة · المفضلة) بأهداف لمس ≥ 44px، وزر «الأقسام» يفتح sheet من Vaul بشجرة `categories` (الجذور ثم `subcategories`).
4. **Given** `whatsapp_number` موجود، **When** تُعرض الصفحة، **Then** يظهر زر تواصل ثابت (أيقونة Lucide `message-circle` بلا لون صاخب) يفتح `wa.me/<number>`.

### US-09.4 — صفحة التصنيف/القائمة بالفلاتر الذكية (P1)
يتصفّح المشتري `/c/[categoryId]` أو `/products` مع فلاتر جانبية (التصنيف الفرعي، الماركة، الوسم، المجموعة، «مميز») وترقيم خادمي، وكل الحالة في الرابط.
**Independent Test**: تطبيق 3 فلاتر + صفحة 2 → نسخ الرابط → فتحه في تبويب خاص → نفس النتائج والعدّاد.
**Acceptance**:
1. **Given** `GET /catalog/products/?category=3&brand=2&page=2`، **When** تُحمَّل، **Then** يُعرض `count` كنص «48 منتجاً» بخط Mono، و20 بطاقة (أو `page_size` حتى 50)، وترقيم من `next/previous`.
2. **Given** فلتر لا يُنتج نتائج، **Then** تُعرض «لا منتجات تطابق الفلاتر» مع زر «مسح الفلاتر» وبقاء الفلاتر الأخرى ظاهرة بعدّاداتها (إن توفرت).
3. **Given** الجوال، **When** يُضغط «فلترة»، **Then** تُفتح الفلاتر في drawer سفلي بزر «عرض N منتجاً» يُطبِّق دفعة واحدة.
4. **Given** تصنيف له `subcategories`، **Then** تُعرض كشرائح (chips) أفقية أعلى القائمة قبل الفلاتر.

### US-09.5 — بطاقة المنتج (P1)
بطاقة موحّدة تُستخدم في كل الأقسام والقوائم: الصورة (نسبة ثابتة لمنع CLS)، الاسم، `display_price`، `display_old_price` مشطوباً، الشارات، «شحن مجاني»، وسياسة الدفع.
**Acceptance**:
1. **Given** `display_old_price` موجود، **Then** يُعرض مشطوباً بلون muted قبل السعر الحالي، مع شارة «تخفيض» نصية.
2. **Given** `stock=0`، **Then** تُعرض شارة «نفدت الكمية» وتُعتَّم الصورة قليلاً ويبقى الرابط إلى PDP (للاشتراك في إشعار التوفر).
3. **Given** `payment_policy='deposit'`، **Then** يُعرض سطر صغير «عربون مقدماً والباقي عند الاستلام»؛ `cod` → «الدفع عند الاستلام»؛ `full` → «الدفع كاملاً مقدماً».
4. **Given** `is_free_shipping=true`، **Then** يُعرض «شحن مجاني» كنص بلون `emerald-600` لا كخلفية ملونة.

### US-09.6 — شريط الإعلان (P2)
**Acceptance**:
1. **Given** `enable_announcement_bar=true` و`announcement_text`، **Then** يُعرض شريط أعلى الرأس بسطر واحد؛ يتحرك أفقياً فقط إذا تجاوز العرض وبسرعة `slow|medium|fast` ويتوقف عند `prefers-reduced-motion` أو التحويم.
2. **Given** أعلام `show_banner_on_home/_products/_product_detail/_checkout`، **Then** يُعرض فقط في الصفحات المفعَّلة؛ حتى توفرها في `/config/` يُعرض في الرئيسية فقط.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-09.01**: الصفحة الرئيسية MUST تُرسم خادمياً (RSC) من `GET /api/v1/config/` و`/catalog/*` عبر الـ BFF نفس الأصل، مع `credentials: include` في أي استدعاء من المتصفح.
- **FR-09.02**: الأقسام MUST تُعرض حسب `order` و`is_active` و`settings.show_on_mobile`، بمكوّن واحد لكل `section_type` من الثمانية؛ نوع غير معروف يُتجاهل بتحذير في الـ console فقط.
- **FR-09.03**: رموز الثيم MUST تُطبَّق كمتغيرات CSS على جذر `(storefront)` فقط، وMUST NOT تُكتب قيم hex في المكونات.
- **FR-09.04**: الخطوط MUST تُحصر في الـ 11 المسموحة؛ يُحمَّل خطّان كحد أقصى لكل متجر.
- **FR-09.05**: حالة الفلاتر والبحث والترقيم MUST تعيش في الرابط عبر `nuqs` بالمفاتيح `category, brand, tag, collection, search, is_featured, page, page_size`.
- **FR-09.06**: الأسعار MUST تُعرض من `display_price`/`display_old_price` كما هي بخط Mono `tabular-nums`؛ يُمنع أي تنسيق عملة محلي.
- **FR-09.07**: العملة المختارة MUST تُثبَّت في الـ session عبر `GET /api/v1/cart/?currency=` وتُمرَّر لكل استعلام منتجات؛ وتُحفظ محلياً كتفضيل عرض فقط.
- **FR-09.08**: بطاقة المنتج MUST تكون مكوّناً واحداً مشتركاً بين الأقسام والقوائم والبحث والمرتبطة في M10.
- **FR-09.09**: كل الصور MUST تمرّ عبر `next/image` بنِسب ثابتة؛ الأولى فوق الطيّ `priority`، والبقية `loading="lazy"`؛ يُفضَّل `image_url` الخارجي إن وُجد.
- **FR-09.10**: الصفحة MUST تضم `title`/`description`/Open Graph من `store_name` (و`seo_*` حين تتوفر) وJSON-LD من نوع `Store` + `ItemList` للقوائم.
- **FR-09.11**: الرأس MUST يعرض عدّاد السلة من `count` في `GET /api/v1/cart/` (مفتاح TanStack Query مشترك مع M11) بلا استدعاء مكرر.
- **FR-09.12**: البحث المباشر MUST يُلغي الطلب السابق (AbortController) ويُسجَّل الاستعلام الفارغ النتائج محلياً فقط (الخادم يسجّل `ZeroResultSearchLog` من جهته).
- **FR-09.13**: الشريط السفلي وورقة الأقسام MUST يظهرا فقط < 768px؛ على الديسكتوب تظهر شجرة الأقسام في قائمة منسدلة من الرأس.
- **FR-09.14**: كل مفاتيح الكاش MUST تبدأ بـ `['store', <store>, …]`؛ ولا يُستورد أي مكوّن من `(dashboard)`.

## 5. الكيانات والحالات (Key Entities & States)

- **StoreConfig** (من `/config/`): `store_name`, `logo`, `whatsapp_number`, `primary_color`, `secondary_color`, `background_color`, `text_color`, `heading_font`, `body_font`, `design_style`, `theme_preset`, `theme_choice`, `brand_shades{'50'..'900'}`, `enable_announcement_bar`, `announcement_text`, `sections[]`.
- **StoreSection**: `id`, `section_type` (`hero` البانر الرئيسي · `category_strip` شريط تصفّح الأقسام · `featured_products` · `latest_products` · `slider` سلايدر · `banner_grid` شبكة بنرات · `product_grid` شبكة منتجات حسب تصنيف · `promotional_offers`), `label`, `order`, `is_active`, `settings{title, category_id, limit, show_on_mobile}`, `content_data` (`{items:[{image,title,link}]}` للسلايدر والبنرات؛ `{category_id, limit, title}` لشبكة المنتجات). الأنواع الأربعة الأولى و`promotional_offers` مفردة؛ `slider`/`banner_grid`/`product_grid` قابلة للتكرار.
- **ProductCard**: `id`, `name`, `image`, `category`, `display_price`, `display_old_price`, `stock`, `is_featured`, `is_free_shipping`, `payment_policy` (`cod` · `deposit` · `full`). حالات مشتقة: متوفر · نفدت الكمية (`stock=0`) · مخفَّض (`display_old_price` موجود).
- **Category**: `id`, `name`, `subcategories[]` (شجرة بلا ترقيم).
- **Currency**: `SAR` · `USD` · `YER_OLD` · `YER_NEW`؛ الحالة: مُثبَّتة في session (مصدر الحقيقة) + تفضيل محلي للعرض قبل أول استجابة.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/` (الأقسام) · `/c/[categoryId]` (تصنيف + فلاتر) · `/products` (كل المنتجات + فلاتر) · `/search?q=` · `/about` (`about_us` حين يتوفر في `/config/`). الرأس: شريط إعلان → شعار/اسم → بحث → العملة → المفضلة → السلة (يفتح M11).
- **الحالات البصرية**: skeleton لكل قسم بنفس أبعاده النهائية (صفر CLS) · فراغ «لا منتجات في هذا التصنيف بعد» · خطأ شبكة بزر إعادة · متجر بلا أقسام (ترتيب افتراضي) · صورة مفقودة (مربع بحد 1px واسم المنتج، لا أيقونة عامة).
- **الجوال (390px)**: عمود واحد للبطاقات (أو عمودان لـ `product_grid` حسب كثافة الـ preset)، شريط أقسام أفقي بتمرير snap، فلاتر في drawer سفلي (Vaul)، شريط تنقّل سفلي ثابت، البحث يفتح شاشة كاملة.
- **اختصارات**: `/` يركّز البحث · `Esc` يغلق الورقة/الـ drawer · أسهم لوحة المفاتيح تتنقّل في السلايدر.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| إعدادات المتجر + الثيم + الأقسام الفعّالة | `GET /api/v1/config/` | Ready |
| `card_border_color`, `announcement_bg_color`, `announcement_text_color`, `announcement_scroll_speed`, `show_banner_on_*`, `free_shipping_threshold`, `currency` (الافتراضية), `seo_*`, روابط التواصل, `about_us`, `contact_email` | `StoreSetting` غير مُصدَّرة في `/config/` | `[NEEDS BACKEND]` → توسيع `GET /api/v1/config/` بالحقول نفسها بأسمائها |
| شجرة التصنيفات | `GET /api/v1/catalog/categories/` → `[{id, name, subcategories[]}]` | Ready (صورة التصنيف لشريط الأقسام: `[NEEDS BACKEND]` إضافة `image`) |
| قائمة المنتجات مفلترة ومرقّمة | `GET /api/v1/catalog/products/?category&brand&tag&collection&search&is_featured=true&currency&page&page_size` | Ready |
| خيارات الفلاتر بأسمائها وعدّاداتها | `Brand`/`Tag`/`Collection` بلا endpoint | `[NEEDS BACKEND]` → `GET /api/v1/catalog/facets/?category=` → `{brands:[{id,name,slug,count}], tags:[…], collections:[…]}` |
| ترتيب القائمة (الأحدث/السعر) | ترتيب ضمني فقط | `[NEEDS BACKEND]` → `?ordering=-created_at\|price\|-price` |
| شارات التاجر و«وصل حديثاً» على البطاقة | `active_badges` في الموديل فقط | `[NEEDS BACKEND]` → إضافة `badges:[{name, color}]` لعناصر القائمة؛ حتى توفرها تُشتق «نفدت الكمية»/«تخفيض» محلياً من `stock`/`display_old_price` |
| محتوى قسم `promotional_offers` | `PromotionalOffer` HTML فقط | `[NEEDS BACKEND]` → `GET /api/v1/catalog/offers/` → `[{id, name, offer_type, description, image, cta_text, valid_until}]` |
| تثبيت العملة | `GET /api/v1/cart/?currency=` (sticky في session) | Ready |
| المفضلة (عدّاد الرأس) | `toggle_wishlist` HTML (بالهاتف) | `[NEEDS BACKEND]` (E-42) → `GET/POST /api/v1/wishlist/`؛ حتى توفره: قائمة محلية مفتوحة بالمستأجر |
| بكسلات التتبع | `TrackingSettings` غير مُصدَّرة | `[NEEDS BACKEND]` (M19) → `tracking{meta_pixel_id, tiktok_pixel_id, snapchat_pixel_id, gtm_container_id, ga4_measurement_id}` ضمن `/config/` |
| manifest + قياس التثبيت | `POST /api/v1/pwa/install-event/` بـ `source='nextjs_app'` | Ready (E-44) |

## 8. الحالات الحدّية (Edge Cases)

- `sections[]` تحوي `product_grid` بـ `category_id` لتصنيف محذوف: الخادم يعيد 0 نتائج → يُخفى القسم كاملاً بلا عنوان يتيم.
- `brand_shades` ناقصة أو `primary_color` غير صالح: تسقط الرموز إلى zinc الافتراضية ويُسجَّل تحذير؛ لا تنكسر الصفحة.
- `background_color` و`text_color` بتباين < 4.5: يُحترم اختيار التاجر للمساحات، ويُرفع تباين النص الثانوي آلياً إلى الحد الأدنى AA.
- خط من القائمة غير متاح في Google Fonts وقت البناء: fallback فوري إلى IBM Plex Sans Arabic بلا طلب شبكي فاشل.
- `?currency=YER_OLD` في الرابط لمتجر لا يعرض هذه العملة: الخادم يحدد؛ تُعرض الاستجابة كما هي ويُحدَّث المبدّل ليطابق `currency` المُعاد.
- `page` أكبر من المتاح: 404 من الخادم → تُعرض آخر صفحة مع تصحيح الرابط.
- `/api/v1/config/` يعيد 503 (المتجر قيد التجهيز) أو 404/403: يُفوَّض إلى M47.
- صورة `image_url` خارجية بنطاق غير مُعرَّف في `next.config` images: تُعرض عبر `unoptimized` كاستثناء موثَّق لا بكسر الصفحة.

## 9. معايير النجاح (Success Criteria)

- **SC-09.1**: LCP ≤ 2.5s وCLS ≤ 0.1 على جوال 4G للصفحة الرئيسية وصفحة التصنيف؛ Lighthouse Performance ≥ 90.
- **SC-09.2**: تغيير التاجر لأي رمز ثيم في M08 يظهر في المتجر خلال ≤ 10 ثوانٍ من الحفظ (إعادة تحقق الكاش بالوسم `store:<store>`).
- **SC-09.3**: رابط فلاتر مشترك يُعيد نفس النتائج على جهاز آخر 100%.
- **SC-09.4**: 0 قيم hex خارج ملف الرموز وطبقة تطبيق ثيم المتجر (فحص lint).
- **SC-09.5**: 0 تمرير أفقي على 320–1920px و100% من عناصر الشريط السفلي ≥ 44px.
- **SC-09.6**: الزمن من فتح الصفحة الرئيسية إلى فتح أول PDP ≤ 1 نقرة و≤ 8 ثوانٍ في اختبار 5 مستخدمين على الجوال.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M47 (حل المستأجر، BFF، 503/404/403)، M11 (عدّاد السلة والعملة)، M10 (وجهة البطاقة)، M08 (مصدر الثيم والأقسام)، E-44 (PWA)، M19 (البكسلات).
- افتراض: `/config/` يعيد الأقسام الفعّالة فقط مرتبةً بـ `order`؛ إن أعاد غير الفعّالة تُفلتر محلياً بـ `is_active`.
- افتراض: `latest_products` يعتمد ترتيب الخادم الافتراضي (الأحدث أولاً) حتى يتوفر `?ordering=`.
- افتراض: الـ 9 presets تُفسَّر كخرائط رموز مقيَّدة بالمبدأ I؛ أي تأثير زخرفي في الأصل (glass مكدَّس، تدرجات) يُستبدل بمكافئ مسطّح، ويُوثَّق ذلك في M08.
- افتراض: عناصر الشريط السفلي الخمسة ثابتة في الإصدار الأول (الرئيسية · الأقسام · البحث · السلة · المفضلة)؛ لا «حسابي» لأن العملاء بلا حسابات.
- افتراض: المفضلة محلية (localStorage مفتوح بالمستأجر) حتى يتوفر endpoint E-42.
- افتراض: `/c/[categoryId]` بالمعرّف الرقمي لأن `Category` بلا `slug`؛ يُضاف اسم مُحسَّن للقراءة كجزء اختياري بعد المعرّف.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I (Anti-AI): لا hero مركزي بتدرج، لا شبكة بطاقات منتجات بظلال ملونة؛ الفصل بحدود `1px` بلون `card_border_color` (أو zinc-200)؛ شارات نصية لا خلفيات صاخبة؛ `aurora_glass` و`neo_brutalism` يُترجمان إلى رموز مسطّحة. لا إيموجي في الشريط السفلي أو الشارات.
- II (RTL): شريط الأقسام والسلايدر يبدآن من اليمين وأسهمهما `rtl:rotate-180`؛ الأسعار Mono `tabular-nums` بالأرقام الغربية والعملة بعد الرقم كما يرسلها الخادم؛ شريط الإعلان يتحرك من اليسار إلى اليمين في RTL.
- IV (Visual check): لقطات `docs/visual-checks/09-storefront-home/{desktop,tablet,mobile,mobile-dark}.png` للرئيسية بـ 8 أقسام، صفحة تصنيف بفلاتر مفتوحة، حالة «لا نتائج»، ومتجرَين بثيمَين مختلفَين في نفس الجلسة.
- VII (Design Tokens): رموز التاجر (`--brand-*`, `--background`, `--foreground`, `--secondary`, خطوط) تُكتب مرة واحدة كـ inline style على جذر `(storefront)/[store]` layout فقط؛ `(dashboard)` و`(marketing)` تبقى zinc. لا قيم خام في المكونات.
- VIII (Tenant isolation): مفاتيح TanStack Query ووسوم `fetch` تبدأ بـ `store:<store>`؛ لا استيراد من `src/features/dashboard-*`.
- IX (Budgets): `next/image` فقط، خطّان عبر `next/font`، Zod على `/config/` و`/catalog/*`، الفلاتر في الرابط عبر `nuqs`.
