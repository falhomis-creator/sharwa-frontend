# M04 — إدارة المنتجات والمتغيرات (Product & Variant Manager)

**Route group**: `(dashboard)` · **Priority**: P1 · **Backend status**: HTML-only لكل CRUD `[NEEDS BACKEND]`؛ قراءة عامة محدودة للمتجر عبر `/api/v1/catalog/products/` Ready
**Discovery refs**: `02-products-domain-model.md` §1 (العملات، SEO mixin، `LOW_STOCK_THRESHOLD`)، §2 (Product، المتغيرات ثلاثية الطبقات، القوالب، `ProductChangeLog`)، §15 (`ProductForm`, `ProductQuickAddForm`, `ProductTemplateForm`, `VariantAttributeForm`) · `01-*.md` §3.2 (مسارات المنتجات)، §4 (مجموعة «المنتجات») · `03-*.md` §1 (قراءة الكتالوج) · **Benchmarks**: Shopify (محرّر منتج بأقسام، مولّد المتغيرات، الإجراءات الجماعية)، Saleor (أنواع المنتجات/السمات كقاموس متجر)، Medusa (قائمة كثيفة سريعة ومحرّر متغيرات جدولي)

## 1. الهدف (Purpose)

تمكين التاجر من إضافة منتج بسيط في أقل من 30 ثانية (الإضافة السريعة)، ومن إدارة منتج معقّد (80+ حقلاً، متغيرات، قوالب، تسعير بصيغة، عربون) دون أن تظهر له الحقول التي لا يحتاجها. تُقاس بزمن إضافة المنتج الأول وبنسبة المنتجات المنشورة بصور وسعر وتصنيف صحيحين.

## 2. الفاعلون (Actors)

- **مالك المتجر**: كل العمليات.
- **موظف** بصلاحية `inventory.view` (قراءة) / `inventory.adjust` (تعديل المخزون) / `discounts.manage` (السعر القديم ونافذة التخفيض). إنشاء/تعديل المنتج نفسه يبقى للمالك ومدير المتجر/الفرع (أدوار نظامية).
- **النظام**: يولّد `sku` (`SHW-XXXXXXXX`) و`slug`، يحسب `is_on_sale`/`is_low_stock`، يسجّل `ProductChangeLog`، يزامن المخزون من `LocationInventory` (M22) ومن القنوات (M27/M28/M29).

## 3. قصص المستخدم (User Stories)

### US-04.1 — قائمة المنتجات كجدول عمل (P1)
يفتح التاجر «جميع المنتجات» فيرى جدولاً كثيفاً (صورة مصغّرة، الاسم، SKU Mono، السعر Mono، المخزون Mono مع تحذير دلالي، التصنيف، الحالة، آخر تعديل) قابلاً للفلترة والبحث، والفلاتر في الرابط.
**Independent Test**: 1000 منتج وهمي، فلتر «منخفض المخزون» + تصنيف، نسخ الرابط إلى تبويب جديد → نفس النتيجة.
**Acceptance**:
1. **Given** 1000 منتج، **When** تُفتح القائمة، **Then** تظهر أول 50 في < 1s بعد skeleton؛ الفلاتر: الحالة (`منشور` · `مسودة` · `مجدول` · `مؤرشف`)، المخزون (`متاح` · `منخفض` · `نفد`)، التصنيف، الماركة، الوسم، المجموعة، النوع (`physical` · `digital` · `service`)، الأعلام (متغيرات/حزمة/مزاد/قابل للحجز).
2. **Given** 20 منتجاً محددة، **When** يُختار «نشر» أو «أرشفة» أو «تغيير التصنيف» أو «إضافة وسم» أو «حذف»، **Then** تُعرض معاينة بالعدد ثم تقرير «18 نجحت، 2 مرفوضة (مزاد نشط)».
3. **Given** خلية المخزون أو السعر، **When** يُضغط عليها نقرتَين، **Then** تُحرَّر في مكانها وتُحفظ بـ Enter مع `ProductChangeLog`.
4. **Given** `⌘K` وكتابة اسم أو SKU، **Then** يُفتح المنتج مباشرة.

### US-04.2 — الإضافة السريعة (P1)
من زر «إضافة سريعة» تُفتح لوحة جانبية بحقول `ProductQuickAddForm` فقط: `name`, `name_en`, `image`, `price`, `stock`, `unit`, `blueprint`, `pricing_type` (وحقول الصيغة إن اختيرت)، `is_serialized`, `is_bundle`, `is_auction`, `is_personalizable`.
**Acceptance**:
1. **Given** اسم وسعر وصورة فقط، **When** يُحفظ، **Then** يُنشأ المنتج منشوراً (`is_available=true`) بوحدة `piece` و`sku` مولَّد، ويظهر إشعار Sonner مع زر «تحرير كامل».
2. **Given** اختيار `blueprint`، **When** يُحفظ، **Then** تُطبَّق قيم القالب (`apply_to()`) ويُعرض ملخص «طُبِّق قالب {name}: 33 حقلاً».
3. **Given** `is_auction` محدد، **Then** يُثبَّت `stock=1` ويُعطَّل الحقل مع تلميح.

### US-04.3 — محرّر المنتج الكامل (P1)
يفتح التاجر منتجاً فيرى محرّراً بعمود رئيسي (المحتوى، الوسائط، التسعير، المخزون، المتغيرات، الشحن، SEO) وعمود جانبي (الحالة والنشر، التنظيم، الأعلام)، مع تنقّل داخلي لاصق وزر حفظ ثابت يظهر عند وجود تغييرات.
**Acceptance**:
1. **Given** تغيير `price` دون حفظ ومحاولة المغادرة، **Then** يُعرض شريط «تغييرات غير محفوظة» مع «حفظ» و«تجاهل».
2. **Given** `payment_policy=deposit`، **Then** يظهر `deposit_required` إلزامياً؛ وإن اختير `cod` أو `full` يُخفى.
3. **Given** `pricing_type=formula`، **Then** تظهر `live_rate_ref`, `formula_unit_price`, `formula_coefficient`, `formula_fixed_extra` مع معاينة حيّة للسعر الناتج Mono (وحدة × معامل + ثابت).
4. **Given** `old_price` أكبر من `price`، **When** تُضبط `sale_start_at`/`sale_end_at`، **Then** تُعرض حالة «تخفيض مجدول/نشط/منتهٍ» نصّياً؛ وإن كان `old_price ≤ price` تُعرض رسالة تحقق.
5. **Given** `has_refundable_deposit`، **Then** يظهر `refundable_deposit_amount` وقواعد الاسترجاع.
6. **Given** `is_taxable`، **Then** يظهر `tax_rate` ومعاينة السعر شامل الضريبة Mono.
7. **Given** `cost_price` مضبوط، **Then** يُعرض هامش الربح (`profit_margin_percent`) كرقم Mono صغير تحت السعر للمالك فقط.

### US-04.4 — معرض الوسائط (P1)
**Acceptance**:
1. **Given** 6 صور، **When** تُسحب صورة إلى الموضع الأول، **Then** تصير الصورة الرئيسية ويُحفظ `sort_order` فوراً.
2. **Given** رفع `svg`، **Then** يُرفض محلياً برسالة «الصيغ المسموحة: jpg, jpeg, png, webp, gif».
3. **Given** `image_url` خارجي و`video_url`، **Then** يُعرضان كعناصر في المعرض بشارة «رابط».

### US-04.5 — المتغيرات ثلاثية الطبقات (P1)
يختار التاجر سمات من قاموس المتجر (`VariantAttribute`: المقاس/اللون/الخامة…)، يحدد قيمها (`VariantOption`)، فيولّد النظام مصفوفة `ProductVariant` قابلة للتحرير جدولياً (`extra_price`, `stock`, `sku`, `image`).
**Acceptance**:
1. **Given** سمتان (المقاس 3 قيم × اللون 4 قيم)، **When** يُضغط «توليد»، **Then** تُعرض 12 صفاً مع تحذير إن تجاوزت 100 تركيبة، ويمكن استثناء تركيبات قبل الحفظ.
2. **Given** سمة `field_type=swatches` بقيم لها `image`، **Then** تُعرض كمربعات صور في المحرّر وكـ swatches في المتجر.
3. **Given** سمة `data_type=number` بـ `unit` و`min_value`/`max_value`، **When** تُدخل قيمة خارج المدى، **Then** رسالة تحقق تحت الحقل.
4. **Given** متغير بسعر إضافي 20، **Then** يُعرض `effective_price = price + extra_price` Mono في عمود للقراءة.
5. **Given** `variant_display_style`، **Then** يُختار `swatches` · `dropdown` · `radio` بمعاينة صغيرة لكل نمط.

### US-04.6 — القوالب والقطاعات (P2)
يُنشئ التاجر `ProductTemplate` (مخطط) من منتج قائم أو من `GlobalVariantTemplate` (35 قطاعاً مركزياً)، ويطبّقه على منتجات جديدة أو قائمة.
**Acceptance**:
1. **Given** قطاع عالمي «ملابس»، **When** يُطبَّق على قالب، **Then** تُنسخ سماته إلى قاموس المتجر دون تكرار الموجود.
2. **Given** تطبيق قالب على 15 منتجاً محدداً، **Then** معاينة الحقول التي ستُستبدل ثم تقرير النتائج.

### US-04.7 — الاستيراد والتصدير (P2)
**Acceptance**:
1. **Given** ملف CSV، **When** يُرفع، **Then** تُعرض معاينة أول 20 صفاً مع مطابقة الأعمدة والأخطاء لكل صف قبل التأكيد.
2. **Given** تصدير بالفلاتر الحالية، **Then** يُحمَّل CSV بنفس الأعمدة المعروضة.
3. **Given** ميزة `bulk_upload` مفعّلة، **Then** يظهر «الرفع السريع» (صور متعددة → منتجات مسودة) وإلا يُخفى.

### US-04.8 — سجل التغييرات (P2)
**Acceptance**:
1. **Given** تغيير السعر من 100 إلى 120، **Then** يظهر في تبويب «السجل» صف: الحقل، القيمة قبل/بعد Mono، من، متى.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-04.01**: القائمة MUST تدعم ترقيماً خادمياً (50/صفحة)، ترتيباً بالأعمدة، بحثاً في `name`/`name_en`/`sku`/`barcode`، وفلاتر الحالة/المخزون/التصنيف/الماركة/الوسم/المجموعة/النوع/الأعلام؛ كلها في الرابط.
- **FR-04.02**: حالة المنتج MUST تُشتق كما في الباك إند: `منشور` = `is_available ∧ archived_at=null ∧ (published_at=null ∨ ≤ now)`؛ `مجدول` = `published_at > now`؛ `مؤرشف` = `archived_at≠null`؛ `مسودة` = `is_available=false`.
- **FR-04.03**: المحرّر MUST يعرض مجموعات الحقول بالترتيب: الهوية (`name`, `name_en`, `slug`, `sku`, `barcode`)، التسعير (`price`, `old_price`, `sale_start_at`, `sale_end_at`, `cost_price`, `currency`, `payment_policy`, `deposit_required`, `is_taxable`, `tax_rate`)، التسعير بصيغة، العربون القابل للاسترجاع، الأعلام (`is_serialized`, `is_bundle`+`bundle_build_fee`, `is_auction`, `is_personalizable`, `is_bookable`+`booking_duration_minutes`)، المخزون (`stock` Decimal(12,3), `unit`, `low_stock_threshold`, `allow_backorder`, `min_quantity`, `max_quantity`, `allow_variable_quantity`)، المحتوى (`description`, `description_en`, المعرض, `image_url`, `video_url`, `variant_display_style`, `product_template`)، الشحن (`is_free_shipping`, `delivery_duration`, `weight`, `length/width/height`, `is_hazardous`, `hazard_class`)، SEO (`meta_title` 70, `meta_description` 160, `meta_keywords` 255, `og_image`).
- **FR-04.04**: الحقول الشرطية MUST تُخفى لا تُعطَّل: `deposit_required` مع `deposit`؛ حقول الصيغة مع `formula`؛ `hazard_class` مع `is_hazardous`؛ `booking_duration_minutes` مع `is_bookable`؛ `tax_rate` مع `is_taxable`.
- **FR-04.05**: `product_type=digital|service` MUST يُخفي مجموعة الشحن ويُعرض «لا يتطلب شحناً».
- **FR-04.06**: `is_serialized` MUST يُحوّل حقل المخزون إلى رابط «إدارة الأرقام التسلسلية» (`InventoryItem`, M21) ويعرض العدد `available` للقراءة.
- **FR-04.07**: `is_bundle` / `is_auction` / `is_personalizable` MUST تُظهر تبويبات تُملك تفاصيلها M37 (مكوّنات الحزمة، المزاد، حقول التخصيص) داخل نفس المحرّر؛ أسعار الجملة (`ProductTierPrice`) تبويب تملكه M36.
- **FR-04.08**: المعرض MUST يدعم السحب والإفلات (@dnd-kit) للترتيب، الرفع المتعدد، صيغ `jpg, jpeg, png, webp, gif` فقط، وحذفاً مع تراجع 5 ثوانٍ.
- **FR-04.09**: مولّد المتغيرات MUST يعرض عدد التركيبات قبل التوليد، يسمح باستثناء تركيبات، ويحرّر المصفوفة جدولياً مع لصق أعمدة (مثل جدول بيانات).
- **FR-04.10**: `VariantAttribute` MUST يُحرَّر بـ `name`, `field_type` (`select` · `radio` · `multi_select` · `swatches` · `text` · `numeric` · `date`), `data_type` (`text` · `number` · `unit` · `bool` · `date` · `file` · `image`), `unit`, `min_value`, `max_value`, `is_required`, `sort_order`؛ و`VariantOption` بالعمود المطابق لـ `data_type`.
- **FR-04.11**: الحفظ MUST يكون صريحاً (زر) للمحرّر الكامل، وفورياً للتحرير في مكانه بالقائمة وللترتيب في المعرض؛ كل كتابة تحمل `X-CSRFToken`.
- **FR-04.12**: الإجراءات الجماعية MUST تعرض معاينة بالعدد وتقريراً بالنتائج (ناجح/مرفوض مع السبب).
- **FR-04.13**: الاستيراد MUST يمرّ بثلاث مراحل: رفع → معاينة ومطابقة أعمدة → تنفيذ كمهمة بحالة قابلة للاستطلاع؛ الصيغ `csv, tsv, txt, xlsx`.
- **FR-04.14**: المبالغ MUST تُدخل كأرقام خام بعملة المنتج وتُعرض Mono؛ أي معاينة منسّقة تأتي من الخادم (`display_*`) أو تُعلَّم «تقديرية».
- **FR-04.15**: الشارات الديناميكية (`active_badges`: «نفدت الكمية» · «تخفيض» · «وصل حديثاً») MUST تُعرض للقراءة فقط في المحرّر مع شرح سبب كل منها.
- **FR-04.16**: الوحدة MUST تحترم الصلاحيات: بلا `inventory.view` لا تظهر القائمة؛ بلا `inventory.adjust` خلية المخزون للقراءة؛ بلا `discounts.manage` حقول التخفيض للقراءة.

## 5. الكيانات والحالات (Key Entities & States)

- **Product**: الحقول في FR-04.03 + التصنيف (`category`, `brand`, `tags[]`, `badges[]`, `collections[]`, `blueprint`) + الدورة (`is_available`, `published_at`, `archived_at`, `is_featured`) + تحليلات للقراءة (`views_count`, `add_to_cart_count`). الحالة المشتقة: `منشور` · `مسودة` · `مجدول` · `مؤرشف`. Enums: `PAYMENT_POLICY` `cod` الدفع عند الاستلام · `deposit` عربون مقدماً والباقي عند الاستلام · `full` الدفع كاملاً مقدماً؛ `UNIT` 14 قيمة (`piece` قطعة … `roll`)؛ `PRODUCT_TYPE` `physical` · `digital` · `service`؛ `PRICING_TYPE` `fixed` · `formula`؛ `HAZARD_CLASS` `none` · `flammable` · `liquid` · `fragile`؛ `VARIANT_DISPLAY_STYLE` `swatches` · `dropdown` · `radio`؛ `PRODUCT_TEMPLATE` `standard` · `landing_page`؛ `currency` `SAR` · `USD` · `YER_OLD` · `YER_NEW`.
- **ProductImage**: `image`, `sort_order`.
- **VariantAttribute** → **VariantOption** → **ProductVariant** (`options[]`, `extra_price`, `stock`, `sku`, `image`, `effective_price`).
- **ProductTemplate**: `global_template`, `variant_attributes[]`, ~33 حقلاً عددياً منسوخاً (`BLUEPRINT_SCALAR_FIELDS`)، `ProductTemplateTierPrice`, `ProductTemplateRelatedProduct`.
- **GlobalVariantTemplate**: 35 قطاعاً مركزياً للقراءة فقط من جهة التاجر.
- **ProductChangeLog**: الحقل، قبل/بعد، الفاعل، الوقت — للحقول المتعقَّبة (`name`, `price`, `old_price`, `cost_price`, `stock`, `currency`, `is_available`, `payment_policy`…).
- **ImportJob** (مقترح): `uploaded` · `previewed` · `running` · `done` · `failed`.
- قواعد: `is_auction ⇒ stock=1`؛ `is_serialized ⇒` المخزون من `InventoryItem`؛ حقيقة المخزون: `LocationInventory → ProductVariant.stock → Product.stock`.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/products` (قائمة + لوحة إضافة سريعة) · `/dashboard/products/new` و`/dashboard/products/[id]` (المحرّر) · `/dashboard/products/[id]/history` (السجل كتبويب) · `/dashboard/products/variants` (قاموس السمات: `variant_hub`) · `/dashboard/products/templates` و`/templates/[id]` · `/dashboard/products/import` · `/dashboard/products/bulk-upload` (مع `bulk_upload`) · `/dashboard/products/report` (مع `product_report`، يملكه M25).
- **الحالات البصرية**: skeleton صفوف 44px · فراغ «لا منتجات بعد» مع زرَّي «إضافة سريعة» و«استيراد CSV» · خطأ شبكة · بلا صلاحية · فلتر بلا نتائج مع «مسح الفلاتر» · ميزة معطّلة (الاستيراد السريع/التقرير مخفيان).
- **الجوال**: القائمة → بطاقات مضغوطة (صورة، اسم، سعر Mono، مخزون)؛ المحرّر عمود واحد مع تنقّل أقسام لاصق أعلى؛ مولّد المتغيرات يُعرض كقائمة بطاقات لكل تركيبة بدل الجدول.
- **اختصارات**: `⌘K` بحث منتج · `N` منتج جديد · `Q` إضافة سريعة · `J/K` تنقّل الصفوف · `E` تحرير · `⌘S` حفظ في المحرّر · `Esc` إغلاق اللوحة.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| قائمة المنتجات للتاجر | `product_list_hub` HTML؛ القراءة العامة `GET /api/v1/catalog/products/` (حقول متجر فقط) | `[NEEDS BACKEND]` → `GET /api/v1/products/?q&status&stock&category&brand&tag&collection&product_type&flags&ordering&page&page_size` → `{count, results:[{id, name, sku, image, display_price, display_old_price, stock, unit, is_low_stock, category:{id,name}, status, has_variants, updated_at}]}` |
| تفاصيل/إنشاء/تعديل/حذف | `add_product`, `edit_product`, `delete_product` HTML | `[NEEDS BACKEND]` → `POST /api/v1/products/`، `GET/PATCH/DELETE /api/v1/products/<id>/` (كل حقول `ProductForm`) → 200/400 `{field:[msg]}` |
| الإضافة السريعة | `product_quick_add` HTML | `[NEEDS BACKEND]` → `POST /api/v1/products/quick/` (حقول `ProductQuickAddForm`) → `{id}` |
| الصور | ضمن `ProductForm` | `[NEEDS BACKEND]` → `POST /api/v1/products/<id>/images/` multipart، `DELETE /images/<iid>/`، `POST /images/reorder/` `{ordered_ids}` |
| تعديل المخزون في مكانه | `update_product_stock` POST | `[NEEDS BACKEND]` → `POST /api/v1/products/<id>/stock/` `{stock, reason:'manual_adjust', location_id?}` → `{stock}` (M21) |
| قاموس السمات والقيم | `variant_hub`, variant attribute/option CRUD | `[NEEDS BACKEND]` → `GET/POST /api/v1/variant-attributes/`، `PATCH/DELETE /<id>/`، `GET/POST /<id>/options/`، `PATCH/DELETE /options/<oid>/` |
| توليد وتحرير المتغيرات | ضمن `edit_product` | `[NEEDS BACKEND]` → `POST /api/v1/products/<id>/variants/generate/` `{attribute_ids[], exclude:[[option_ids]]}` → `[{id, options[], sku, extra_price, stock}]`؛ `PATCH /variants/<vid>/`؛ `POST /variants/bulk/` |
| القوالب (المخططات) | `product_template_*`, `template_attributes_api`, attach/detach | `[NEEDS BACKEND]` → `GET/POST /api/v1/product-templates/`، `PATCH/DELETE /<id>/`، `POST /<id>/apply/` `{product_ids[]}` → `{applied, skipped}` |
| القطاعات العالمية | `apply_variant_template` (GlobalVariantTemplate) | `[NEEDS BACKEND]` → `GET /api/v1/global-variant-templates/` → `[{id, name, attributes[]}]`؛ `POST /api/v1/product-templates/<id>/apply-global/` `{global_template_id}` |
| إجراءات جماعية | غير موجود | `[NEEDS BACKEND]` → `POST /api/v1/products/bulk/` `{ids[], action: publish|archive|unarchive|delete|set_category|add_tag|remove_tag, payload?}` → `{succeeded[], failed:[{id, reason}]}` |
| تصدير CSV | `export_products_csv` | `[NEEDS BACKEND]` → `GET /api/v1/products/export.csv?<نفس فلاتر القائمة>` |
| استيراد CSV | `import_products_csv` POST | `[NEEDS BACKEND]` → `POST /api/v1/products/import/` multipart → `{job_id, preview:[…], columns[]}`؛ `POST /import/<job_id>/run/` `{mapping}`؛ `GET /import/<job_id>/` → `{status, done, failed:[{row, msg}]}` |
| الرفع السريع | `bulk_upload_products` | `[NEEDS BACKEND]` → `POST /api/v1/products/bulk-upload/` multipart صور → `[{id}]` (مسودات) |
| سجل التغييرات | `ProductChangeLog` (نموذج فقط) | `[NEEDS BACKEND]` → `GET /api/v1/products/<id>/changes/?page` → `[{field, before, after, actor, at}]` |
| التصنيفات/الماركات/الوسوم/المجموعات/الشارات للاختيار | `GET /api/v1/catalog/categories/` Ready؛ البقية HTML | Ready للتصنيفات؛ البقية في M05 |

## 8. الحالات الحدّية (Edge Cases)

- منتج `is_auction` نشط (`Auction.status=active`): تحرير السعر والمخزون محجوب مع سبب.
- منتج بمتغيرات ومخزون على مستوى المنتج: يُعرض مجموع مخزون المتغيرات للقراءة مع تلميح «المخزون يُدار على المتغيرات».
- `multi_location_enabled=true`: خلية المخزون تفتح توزيعاً حسب الموقع (M22) بدل رقم واحد.
- تغيير `currency` لمنتج له طلبات: تحذير «لا يؤثر على الطلبات السابقة (`exchange_rate_locked`)».
- حذف سمة مستخدمة في متغيرات: يُمنع مع عدد المنتجات المتأثرة ورابط لها.
- حذف منتج له طلبات: أرشفة بدل حذف مع توضيح؛ الطلبات تحتفظ باللقطات.
- مصفوفة متغيرات > 100 تركيبة: تحذير أداء ومطالبة بالاستثناء أو التقسيم.
- CSV بترميز غير UTF-8 أو بأعمدة مجهولة: تُعرض الأعمدة غير المطابقة للمطابقة اليدوية، ولا يُنفَّذ شيء قبل التأكيد.
- `slug` مكرر: يقترح الخادم لاحقة ويُعرض الاقتراح قابلاً للتعديل.
- حقل `image_url` خارجي معطوب: صورة بديلة بحد 1px ونص «تعذّر تحميل الصورة».

## 9. معايير النجاح (Success Criteria)

- **SC-04.1**: إضافة سريعة لمنتج بصورة وسعر ≤ 30 ثانية و≤ 5 حقول.
- **SC-04.2**: القائمة بـ 50 صفاً تُرسم في < 1s والتمرير 60fps؛ التحرير في مكانه يُحفظ في < 500ms.
- **SC-04.3**: 0 حقول من الـ 80+ تظهر في سياق لا ينطبق (الشرطية مخفية بصحة 100% في اختبار المصفوفة).
- **SC-04.4**: توليد 12 متغيراً وحفظها ≤ 3 نقرات.
- **SC-04.5**: استيراد 500 صف مع معاينة أخطاء لكل صف قبل أي كتابة؛ 0 كتابات قبل التأكيد.
- **SC-04.6**: 100% من رسائل التحقق تظهر تحت الحقل المعني بالعربية.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M03 (الهيكل والصلاحيات)، M05 (التصنيفات/الماركات/الوسوم/المجموعات/الشارات)، M21 (المخزون والأرقام التسلسلية)، M22 (المواقع)، M36 (أسعار الجملة)، M37 (الحزم/المزادات/التخصيص)، M26 (الخدمات القابلة للحجز)، M48 (⌘K).
- افتراض: إنشاء/تعديل المنتج مقصور على المالك والأدوار النظامية «مدير المتجر/مدير الفرع» لعدم وجود مفتاح `products.*` في الـ 35؛ يُؤكَّد مع الباك إند.
- افتراض: الاستيراد يُنفَّذ كمهمة غير متزامنة بثلاث مراحل؛ الشكل المقترح في §7.
- افتراض: `live_rate_ref` يُختار من قائمة مرجعية يوفّرها الخادم مع المنتج (لا endpoint مستقل حتى الآن).
- افتراض: الحد الأقصى المحذِّر لتركيبات المتغيرات 100 (قرار واجهة، لا قيد خادم).
- افتراض: حتى توفر endpoints، تُبنى الواجهة على Mock بنفس العقد وبيانات تغطي كل الأعلام الشرطية.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I (Anti-AI): لا بطاقات ملخص متماثلة أعلى القائمة؛ شريط أرقام نصّي Mono (منشور / مسودة / منخفض المخزون / نفد) قابل للنقر كفلتر. المحرّر أقسام مفصولة بحدود 1px لا بطاقات بظلال؛ الأعلام كمفاتيح تبديل مع وصف سطر واحد لا أيقونات في دوائر؛ لا شارات ملونة بمساحات كبيرة (الشارات نص بنقطة ملونة).
- II (RTL): `sku`, `barcode`, `slug`, الأسعار، الأبعاد، الوزن بخط Geist Mono `tabular-nums` ومحاذاة نهاية؛ `slug` و`image_url` و`video_url` في `dir="ltr"` معزول؛ أعمدة الجدول تبدأ من اليمين؛ مقابض السحب في المعرض عند البداية.
- IV (Visual check): لقطات `docs/visual-checks/04-products/` للقائمة (فارغة/ممتلئة/فلتر بلا نتائج)، الإضافة السريعة، المحرّر (كل الأعلام مفعّلة وكلها معطّلة)، مولّد المتغيرات، معاينة الاستيراد، الجوال، الداكن.
- IX (State): الفلاتر والبحث والترقيم في الرابط عبر nuqs؛ حالة السحب والإفلات والمصفوفة قبل الحفظ في Zustand؛ TanStack Query بمفاتيح المستأجر مع تحديث تفاؤلي للتحرير في مكانه؛ Zod schema لـ Product مُشتقّ منه النوع، `strict`، لا `any`.
