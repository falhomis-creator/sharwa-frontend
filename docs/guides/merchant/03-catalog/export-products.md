<div dir="rtl">

# تصدير المنتجات إلى ملف CSV

> **المصدر**: DOC-309 · INT-045 (M37) · الجرد: المجال 3 · آخر مراجعة على الكود: 2026-10-28 (الخطوة 29)

التصدير ينزّل قائمة منتجاتك ملفاً تفتحه في Excel أو Google Sheets، للمراجعة أو الجرد أو المشاركة. يصدّر المنتجات التي تطابق الفلاتر المختارة الآن في القائمة. المصطلحات في [مسرد الأدلة](../../_glossary.md).

## لمن هذه الصفحة؟

| | |
|---|---|
| **الجمهور** | مالك المتجر، ومن يملك صلاحية إدارة الكتالوج |
| **الصلاحية المطلوبة** | زر التصدير يظهر لمن يملك «إدارة الكتالوج (التصنيفات والعلامات والوسوم والتشكيلات والشارات)» `catalog.manage` — يملكها افتراضياً «مدير المتجر» و«مدير الفرع». الملف نفسه يحتاج «عرض المخزون» `inventory.view` |
| **ميزة الباقة** | — |
| **لمالك المتجر فقط؟** | لا |
| **مكانها** | القائمة الجانبية ← «المنتجات» ← «جميع المنتجات» (`/dashboard/products`) ← «المزيد» ← «تصدير CSV بالفلاتر الحالية» |

## الخطوات

1. افتح قائمة المنتجات.
2. اختر الفلاتر التي تريدها (الحالة، المخزون، التصنيف، الماركة، الوسم، المجموعة، النوع، الأعلام)، أو اكتب في البحث. بلا فلاتر تُصدَّر كل المنتجات.
3. اضغط «المزيد» ثم «تصدير CSV بالفلاتر الحالية».
4. يُنزَّل الملف `products.csv` إلى جهازك.

![قائمة «المزيد» وفيها «تصدير CSV بالفلاتر الحالية»](../../_assets/merchant/03-catalog/export-products-1.png) <!-- capture: /dashboard/products, click the «المزيد» menu, desktop 1440, mock mode -->

## ما في الملف

يضم **كل** المنتجات المطابقة، لا صفحة القائمة الظاهرة فقط. الأعمدة تسعة، بهذا الترتيب:

| العمود | ما فيه | مثال |
|---|---|---|
| `id` | رقم المنتج | `17` |
| `name` | اسم المنتج | `كوب` |
| `sku` | SKU (فارغ إن لم يوجد) | `IMP-1` |
| `price` | السعر الفعلي مع العملة، كما يعرضه المتجر (سعر المعادلة للمنتج بالمعادلة) | `12.50 ر.س` |
| `stock` | المخزون بثلاث خانات عشرية | `10.000` |
| `unit` | رمز الوحدة | `piece` |
| `category` | اسم التصنيف (فارغ إن لم يوجد) | `أدوات` |
| `status` | الحالة برمزها الإنجليزي | `draft` |
| `updated_at` | آخر تعديل | `2026-10-27T10:00:00+00:00` |

رموز الحالة: `published` = «منشور»، `draft` = «مسودة»، `scheduled` = «مجدول»، `archived` = «مؤرشف».

![ملف التصدير مفتوحاً في Excel والعربية ظاهرة](../../_assets/merchant/03-catalog/export-products-2.png) <!-- capture: manual — products.csv opened in Excel; not producible by the mock screenshot pipeline -->

## العربية في Excel

الملف بترميز UTF-8 **مع علامة BOM** في أوله، فيفتحه Excel مباشرة بالنقر المزدوج وتظهر الأسماء العربية صحيحة، دون خطوة استيراد.

## ما يحدث بعد ذلك

- التصدير قراءة فقط: لا يغيّر شيئاً في المنتجات.
- عمود `price` نص فيه رمز العملة، لا رقم. إن أردت حساباً عليه في Excel فاحذف رمز العملة أولاً. الأسعار من 1,000 فأكثر فيها فاصلة الآلاف.
- الملف لا يصلح للاستيراد كما هو: أعمدة الاستيراد مختلفة ([استيراد المنتجات](import-products.md)).

## الرسائل التي قد تظهر لك

| الرسالة | السبب | ماذا تفعل |
|---|---|---|
| «تعذّر تصدير الملف.» | انقطع الاتصال أو لا تملك `inventory.view` | أعد المحاولة، أو اطلب الصلاحية. |

## قيود معروفة

> **قيد معروف:** ترتيب الصفوف في الملف دائماً من الأحدث تعديلاً إلى الأقدم، حتى لو رتّبت القائمة بعمود آخر. رتّب الملف في Excel إن احتجت ترتيباً آخر.

<!-- ⚠️ Discrepancy — roadmap (DOC-309) says "export follows the list's current filters and ordering" / code: Django's export honours `ordering` (product_import_service.export_csv → filter_products), but the dashboard never sends it: ProductsScreen.exportCsv (products-screen.tsx:62-79) passes the URL filters only, and the list's sort lives in the table state (`table.ordering`, products-table.tsx:93), not in the URL filters. The file is therefore always in the default `-updated_at` order. Reported in step 29. -->
<!-- ⚠️ Discrepancy — code vs code: the export button sits in the «المزيد» menu, rendered only when the member has catalog.manage (products-screen.tsx: `access.canManage ? …`), while the route itself needs only inventory.view (views_product_extras ProductExportView). A cashier or store keeper with inventory.view cannot reach it from the UI. Reported in step 29. -->
<!-- Note — cells starting with =, +, -, @ are not neutralised (open item, step 18 m37 §4.6); not a user-facing behaviour of normal data, left to the register. -->

## صفحات ذات صلة

- [استيراد المنتجات](import-products.md)
- [تعديل المنتجات والمخزون والمتغيرات](edit-product-and-variants.md)
- [مسرد الأدلة](../../_glossary.md)

</div>
