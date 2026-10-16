# M08 — مخصِّص ثيم المتجر (Storefront Theme Customizer)

**Route group**: `(dashboard)` · **Priority**: P2 · **Backend status**: Sections API **Ready** (`/api/v1/admin/sections/` + `reorder`) بتحفّظ على المصادقة؛ نموذج الهوية (`StorefrontDesignForm`, `AnnouncementBarForm`) HTML-only `[NEEDS BACKEND]`
**Discovery refs**: `02-products-domain-model.md` §11 (StoreSetting theme, StoreSection), §15 (`StorefrontDesignForm`) · `03-api-payments-shipping-theme-integrations.md` §1 (admin sections), §5 (Theme Engine, presets, `/theme.css`) · `01-tenants-dashboard-admin.md` §3.2 (Theme views), §4 (المتجر الإلكتروني) · **Benchmarks**: Shopify Theme Editor (لوحة يسار + معاينة حيّة + نشر/تجاهل)، Webflow (محرر الرموز الدقيق، تبديل الأجهزة)، Framer (سحب الأقسام بسلاسة، معاينة فورية بلا إعادة تحميل)

## 1. الهدف (Purpose)

تمكين التاجر من تشكيل هوية متجره (ألوان، خطوط، شعار، نمط تصميم، شريط إعلانات) وترتيب أقسام الصفحة الرئيسية بمحرر بصري واحد يعرض النتيجة حيّة على المعاينة قبل النشر، بدل 7 نماذج Django متفرقة. يُقاس بزمن الوصول إلى «نشر» أول ثيم وبنسبة المتاجر التي تغادر الإعدادات الافتراضية.

## 2. الفاعلون (Actors)

- **مالك المتجر**: الوحيد الذي يعدّل الهوية والأقسام (الميزة `storefront_design`).
- **موظف** بلا صلاحية مخصصة: لا يرى الوحدة (لا مفتاح صلاحية لها في الـ 35؛ تُحجب لغير المالك).
- **المتجر (M09)**: يستهلك نتيجة النشر عبر `GET /api/v1/config/` و`sections[]`.

## 3. قصص المستخدم (User Stories)

### US-08.1 — اختيار قالب والتعديل مع معاينة حيّة (P1)
يفتح التاجر «تصميم المتجر» فيرى معاينة متجره الفعلي (M09) في إطار داخل الصفحة، ولوحة في جهة البداية تضم القوالب الجاهزة ورموز الألوان والخطوط؛ أي تغيير ينعكس في المعاينة فوراً دون حفظ.
**Independent Test**: اختيار `luxury_boutique` ثم تعديل `primary_color` → المعاينة تتغير خلال < 300ms، ويتحول `theme_preset` إلى `custom`، ولا يُرسل أي طلب شبكة قبل «نشر».
**Acceptance**:
1. **Given** التاجر على `/dashboard/design`, **When** تُحمَّل الصفحة، **Then** تظهر 9 قوالب (`modern_trust` · `luxury_boutique` · `organic_earth` · `tech_cyber` · `bold_streetwear` · `aurora_glass` · `neo_brutalism` · `cinematic_silk` · `clay_zen`) كصفوف مصغّرة مرسومة من رموزها الفعلية (دوائر الألوان + اسم الخط) لا كصور جاهزة، والقالب الحالي محدَّد.
2. **Given** قالب محدَّد، **When** يُعدَّل أي رمز من الخمسة (`primary_color`, `secondary_color`, `background_color`, `text_color`, `card_border_color`) أو أحد الخطَّين، **Then** يُعلَّم القالب `custom` وتظهر شارة «غير منشور» مع زرّي «نشر» و«تجاهل».
3. **Given** معاينة، **When** يُضغط مفتاح «جوال/سطح المكتب»، **Then** يتبدّل عرض الإطار بين 390px و1280px بحركة ≤ 200ms دون إعادة تحميل.

### US-08.2 — الخطوط ونمط التصميم والشعار (P1)
يختار التاجر خط العناوين وخط النص من 11 خطاً عربياً، ونمط التصميم (`design_style`)، ويرفع شعاراً.
**Acceptance**:
1. **Given** قائمة الخطوط، **When** تُفتح، **Then** يُعرض كل اسم بخطّه الفعلي (Alexandria · Tajawal · Cairo · Almarai · IBM Plex Sans Arabic · Changa · Reem Kufi · El Messiri · Noto Kufi Arabic · Amiri · Rubik) مع جملة عربية تجريبية.
2. **Given** ملف شعار `svg`, **When** يُرفع، **Then** يُرفض محلياً برسالة «الصيغ المسموحة: jpg, jpeg, png, webp, gif» قبل أي إرسال.

### US-08.3 — بناء الأقسام بالسحب والإفلات (P1)
في تبويب «الأقسام» يرى التاجر قائمة أقسام الصفحة الرئيسية بترتيبها، يسحب لإعادة الترتيب، يُفعِّل/يُعطِّل، يُضيف أقساماً جديدة من الأنواع القابلة للإضافة، ويحرّر محتوى كل قسم.
**Independent Test**: سحب `slider` من الموضع 5 إلى 2 → يُرسل `POST reorder {ordered_ids}` ويُطابق ترتيب المعاينة.
**Acceptance**:
1. **Given** زر «إضافة قسم»، **When** يُفتح، **Then** تظهر ثلاثة أنواع فقط: `slider` سلايدر · `banner_grid` شبكة بنرات · `product_grid` شبكة منتجات حسب تصنيف؛ الأنواع المفردة (`hero` · `category_strip` · `featured_products` · `latest_products` · `promotional_offers`) تظهر معطّلة مع تلميح «قسم مفرد موجود مسبقاً».
2. **Given** قسم `product_grid`, **When** يُحرَّر، **Then** يظهر نموذج `{title, category_id, limit}` مع منتقي تصنيفات من `GET /api/v1/catalog/categories/`.
3. **Given** قسم `slider` أو `banner_grid`, **When** يُحرَّر، **Then** يُدار `items[{image, title, link}]` كقائمة قابلة للسحب مع معاينة الصورة.
4. **Given** قسم مع `show_on_mobile=false`, **When** تُبدَّل المعاينة إلى الجوال، **Then** يُخفى القسم من الإطار ويُعلَّم في القائمة بأيقونة «مخفي على الجوال».
5. **Given** محاولة حذف قسم مفرد، **Then** يُعرض «عطّله بدلاً من حذفه» والحذف متاح فقط للأنواع القابلة للإضافة.

### US-08.4 — شريط الإعلانات (P2)
يُفعِّل التاجر شريط الإعلانات ويكتب نصه ويختار ألوانه وسرعة التمرير والصفحات التي يظهر فيها.
**Acceptance**:
1. **Given** `enable_announcement_bar=true`, **When** يُكتب النص، **Then** يظهر فوراً أعلى المعاينة بسرعة `slow` · `medium` · `fast` المختارة، ويحترم `prefers-reduced-motion` (بلا تمرير).
2. **Given** مربعات الصفحات (`show_banner_on_home` · `_products` · `_product_detail` · `_checkout`), **When** تُغيَّر، **Then** تنعكس في المعاينة عند التنقل داخل الإطار.

### US-08.5 — النشر والتجاهل (P1)
**Acceptance**:
1. **Given** تغييرات غير منشورة، **When** يُضغط «نشر»، **Then** تُرسل الهوية والأقسام، وتظهر رسالة «نُشر الثيم» مع رابط «عرض المتجر».
2. **Given** تغييرات غير منشورة، **When** يُحاول التاجر مغادرة الصفحة، **Then** يُطلب تأكيد «لديك تغييرات غير منشورة».

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-08.01**: المحرر MUST يعمل بنموذج مسودة محلية (Draft) تُطبَّق على المعاينة فقط؛ لا كتابة للخادم إلا عند «نشر».
- **FR-08.02**: المعاينة MUST تكون واجهة M09 الحقيقية داخل `iframe` تستقبل الرموز المؤقتة عبر `postMessage`، لا نسخة مرسومة منفصلة.
- **FR-08.03**: تغيير أي رمز لوني أو خط MUST يحوّل `theme_preset` إلى `custom`؛ اختيار قالب MUST يُعيد الرموز الخمسة والخطَّين و`design_style` إلى قيم القالب.
- **FR-08.04**: الألوان MUST تُدخل بحقل hex مع منتقي لون وفحص تباين WCAG بين `text_color` و`background_color` (تحذير إن < 4.5:1، بلا منع).
- **FR-08.05**: الأقسام MUST تحترم قاعدة المفرد/القابل للإضافة من الباك إند؛ `reorder` MUST يُرسل كل المعرّفات بترتيبها الكامل.
- **FR-08.06**: محرر محتوى كل نوع MUST يتحقق محلياً بنفس شكل `content_data` الذي يتحققه الخادم لكل `section_type`.
- **FR-08.07**: رفع الصور (الشعار، عناصر السلايدر) MUST يقبل `jpg, jpeg, png, webp, gif` فقط ويعرض الحجم قبل الرفع.
- **FR-08.08**: أي تعارض عند النشر (تعديل من تبويب آخر) MUST يُعرض «حُدِّث الثيم من جلسة أخرى» مع خيار إعادة التحميل.
- **FR-08.09**: الوحدة MUST تُخفى بالكامل حين الميزة `storefront_design` معطّلة، مع صفحة «الميزة غير متاحة في خطتك».

## 5. الكيانات والحالات (Key Entities & States)

- **StoreSetting (Theme)**: `theme_preset` (9 قوالب + `custom`)، `primary_color` (يشتق `brand_shades` 50..900 في الخادم)، `secondary_color`, `background_color`, `text_color`, `card_border_color`, `heading_font`, `body_font` (11 خطاً)، `design_style` (افتراضي `fluid`)، `theme_choice`, `logo`.
- **StoreSetting (Announcement)**: `enable_announcement_bar`, `announcement_text`, `announcement_bg_color`, `announcement_text_color`, `announcement_scroll_speed` (`slow` · `medium` · `fast`), `show_banner_on_home` · `show_banner_on_products` · `show_banner_on_product_detail` · `show_banner_on_checkout`.
- **StoreSection**: `id`, `section_type`, `label`, `order`, `is_active`, `settings{title, category_id, limit, show_on_mobile}`, `content_data`. مفرد: `hero` البانر الرئيسي · `category_strip` شريط تصفّح الأقسام · `featured_products` · `latest_products` · `promotional_offers`؛ قابل للإضافة: `slider` · `banner_grid` · `product_grid`.
- **ThemeDraft** (محلي فقط): نسخة من الكيانين أعلاه + `isDirty`؛ الحالات: `clean` · `dirty` · `publishing` · `conflict`.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/design` (تخطيط ثلاثي: لوحة البداية 320px بتبويبات «الهوية / الأقسام / شريط الإعلانات» · معاينة مركزية بإطار نافذة بحد 1px · شريط علوي فيه مفتاح الجهاز وزرّا نشر/تجاهل) · `/dashboard/design/sections/[id]` (لوحة تحرير القسم تنزلق فوق لوحة البداية).
- **الحالات البصرية**: skeleton للوحة والمعاينة · فراغ الأقسام «لا أقسام مفعّلة — أضف قسماً أو فعّل البانر الرئيسي» · خطأ تحميل المعاينة مع «إعادة المحاولة» · الميزة معطّلة · تعارض نشر.
- **الجوال**: المعاينة تملأ الشاشة؛ اللوحة تتحول إلى drawer سفلي (Vaul) بارتفاع 60%؛ السحب بالأسهم بدل الإصبع الطويل؛ الزرّان ثابتان أسفل.
- **اختصارات**: `⌘S` نشر · `Esc` إغلاق محرر القسم · `⌘K` → «تصميم المتجر».

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| قراءة الهوية والأقسام المنشورة | `GET /api/v1/config/` | Ready |
| قائمة الأقسام (كل الحالات) | `GET /api/v1/admin/sections/` | Ready — تحفّظ: المصادقة `IsAdminUser` (superuser) لا `MerchantSessionAuthentication` → `[NEEDS BACKEND]` توحيد الصلاحية لجلسة المالك |
| إضافة/تعديل/حذف قسم | `POST /api/v1/admin/sections/`, `PATCH/DELETE /<pk>/` | Ready (نفس التحفّظ) |
| إعادة ترتيب | `POST /api/v1/admin/sections/reorder/` `{ordered_ids}` → `{ok, reordered}` | Ready |
| حفظ الهوية (ألوان/خطوط/قالب/نمط/شعار) | `storefront_design` POST (`StorefrontDesignForm`) | `[NEEDS BACKEND]` → `PATCH /api/v1/store/theme/` multipart `{theme_preset, primary_color, secondary_color, background_color, text_color, card_border_color, heading_font, body_font, design_style, logo?}` → الكيان كاملاً + `brand_shades` |
| قوالب الثيم بقيمها | `products/theme_presets.py` | `[NEEDS BACKEND]` → `GET /api/v1/store/theme/presets/` → `[{code, name, tokens{...}, heading_font, body_font, design_style}]`؛ حتى توفره تُنسخ القيم إلى ملف بيانات محلي يُعلَّم بالمصدر |
| شريط الإعلانات | `AnnouncementBarForm` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/store/announcement/` |
| التصنيفات لمنتقي `product_grid` | `GET /api/v1/catalog/categories/` | Ready |
| CSS الثيم للمعاينة | `GET /theme.css` | Ready (تُستخدم فقط لمقارنة الإخراج؛ المعاينة تطبّق الرموز مباشرة) |

## 8. الحالات الحدّية (Edge Cases)

- `theme_preset` في قاعدة البيانات قيمة غير معروفة (نص حر): تُعرض كـ`custom` مع الرموز الحالية بلا خطأ.
- التاجر يختار ألواناً بتباين ضعيف: تحذير مرئي لا منع (قراره)، ويُسجَّل في المعاينة بشارة «تباين منخفض».
- `product_grid` يشير إلى `category_id` محذوف: يُعرض «تصنيف محذوف — اختر آخر» ويُمنع النشر حتى الإصلاح.
- فشل تحميل الإطار (503 أثناء التجهيز أو شبكة): تُعرض رسالة داخل إطار المعاينة مع إعادة المحاولة، وتبقى اللوحة قابلة للتحرير.
- إعادة ترتيب أثناء انقطاع الشبكة: يبقى الترتيب المحلي، وتظهر شارة «لم يُحفظ الترتيب» مع إعادة المحاولة.
- صورة سلايدر > 5MB: تُرفض محلياً مع الحجم المسموح.

## 9. معايير النجاح (Success Criteria)

- **SC-08.1**: زمن انعكاس تغيير لون على المعاينة ≤ 300ms.
- **SC-08.2**: 0 طلبات كتابة قبل الضغط على «نشر».
- **SC-08.3**: من فتح الصفحة إلى نشر أول قالب ≤ 60 ثانية في اختبار 5 تجار.
- **SC-08.4**: 100% من عمليات السحب تُنتج ترتيباً مطابقاً بين القائمة والمعاينة والمتجر المنشور.
- **SC-08.5**: المحرر نفسه يمرّ قائمة المبدأ I بـ 0 مخالفات بصرف النظر عن الثيم الذي يختاره التاجر.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M03 (هيكل اللوحة)، M09 (المعاينة الحقيقية + استقبال `postMessage`)، M05 (التصنيفات)، M34 (باقي إعدادات المتجر: SEO، التواصل، السياسات — ليست هنا).
- افتراض: الباك إند سيُعيد تسمية/توحيد مصادقة `admin/sections` لتقبل جلسة المالك؛ حتى ذلك يُستخدم Mock بنفس العقد.
- افتراض: قيم القوالب الـ 9 تُقرأ من `theme_presets.py` وتُنسخ كبيانات محلية مؤقتة؛ لا تُخترع قيم.
- افتراض: `theme_choice` يبقى `default` ولا يُعرض للتاجر في الإصدار الأول (مجلد قوالب خادمي).
- افتراض: شريط الإعلانات يُحرَّر هنا وفي M13 (شريط التسويق) عبر نفس المكوّن ونفس العقد.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: واجهة المحرر zinc بلا لون brand؛ لا صور مصغّرة جاهزة للقوالب — تُرسم من الرموز الفعلية؛ لا بطاقات متماثلة للقوالب بل صفوف كثيفة قابلة للاختيار.
- II: منتقي الخطوط يعرض عينات عربية RTL؛ مفتاح الجهاز وأسهم السحب تنعكس؛ قيم hex تُعرض بخط Mono.
- IV: لقطات `docs/visual-checks/08-theme/` للمحرر (هوية، أقسام، محرر قسم)، معاينة جوال، الداكن، وحالة «غير منشور».
- VII: رموز الثيم التي يختارها التاجر تُطبَّق حصراً على جذر إطار المعاينة ومجموعة `(storefront)`؛ لوحة التاجر لا تستهلكها. قيم hex الواردة من البيانات هي الاستثناء الوحيد للمبدأ VII وتُمرَّر كمتغيرات CSS على الجذر لا داخل المكونات.
