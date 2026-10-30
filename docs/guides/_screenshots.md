<div dir="rtl">

# مسار لقطات الشاشة للأدلة

> **المصدر**: DOC-285 (والقائمة موسّعة في الخطوة 14) · الجرد A.2 (التشغيل التجريبي)، A.12 (نصوص الفحص الآلي)، INT-045 (`caret: "initial"`)، INT-044 (`requireMocks()`) · آخر مراجعة على الكود: 2026-10-27 (الخطوة 10)
> **الأداة**: `scripts/guide-screenshots.ts` · **القائمة**: [`_assets/shots.json`](_assets/shots.json)

كل صورة في الأدلة تُلتقط آلياً من **البيانات التجريبية** بأمر واحد، فلا تحمل بيانات حقيقية، وتُعاد كلها حين يتغيّر تصميم الواجهة. هذه الصفحة لكتّاب الأدلة: كيف تشغّل المسار، وكيف تضيف لقطة، وما القواعد التي تحكم الصور.

## 1. الأمر الواحد

بعد تشغيل خادم التطوير في الوضع التجريبي (القسم 2)، من جذر المستودع `C:\sharwa_front\sharwa-frontend`:

```cmd
npx tsx scripts/guide-screenshots.ts
```

يقرأ الأمر كل مدخلات `docs/guides/_assets/shots.json` ويكتب الصور في `docs/guides/_assets/`. خيارات إضافية:

| الخيار | ما يفعله |
|---|---|
| `3100` (رقم وحده) | منفذ آخر غير `3000` |
| `--only merchant/12` | يلتقط المدخلات التي يبدأ معرّفها بهذا النص فقط |
| `--list` | يعرض المدخلات دون التقاط |
| `set SHARWA_CHROMIUM=<مسار chrome.exe>` قبل الأمر | يستخدم متصفح Chromium موجوداً على الجهاز إن لم يكن متصفح Playwright مثبّتاً (نفس خيار نصوص الفحص) |

ينتهي الأمر برمز خروج 1 إن كانت وحدة ما تعمل حيّاً، أو فشل تحميل صفحة، أو لم يظهر العنصر المنتظر، أو فشلت وصفة. أخطاء وحدة التحكم في المتصفح تُطبع تحذيراً فقط، لأن نصوص الفحص هي المسؤولة عنها.

## 2. تشغيل الخادم في الوضع التجريبي

1. أوقف Django. الشاشات التي تسأل Django أولاً (الصفحة الترويجية، واجهة المتجر، التسجيل) تعرض بياناته الحقيقية إن كان يعمل، ولا تعود إلى البيانات التجريبية إلا إن لم تجده.
2. في `cmd` شغّل الخادم بلا أي وحدة حيّة:

   ```cmd
   set SHARWA_LIVE_MODULES=none&& npm run dev
   ```

   لا تضع مسافة قبل `&&`، وإلا صارت القيمة `none ` بمسافة. القيمة `none` كلمة لا تطابق أي وحدة، فتبقى كل الوحدات تجريبية. أما `set SHARWA_LIVE_MODULES=` (بلا قيمة) فيحذف المتغير من الجلسة، فيعود الخادم إلى القيمة المكتوبة في `.env.local` إن وُجدت، وقد تكون فيها وحدات حيّة. لذلك استخدم `none`. تفاصيل المتغيرات في [`ops/environment.md`](../ops/environment.md#live-modules).
3. **أعد تشغيل الخادم قبل كل تشغيل كامل.** البيانات التجريبية تعيش في ذاكرة الخادم، والوصفة التي تغيّر طلباً تعمل على ما تركه التشغيل السابق.

قبل أي التقاط يفحص الأمر أن كل طلب تجريبي يحمل الترويسة `x-sharwa-mock: 1` (نمط `requireMocks()` في `scripts/b2b-check.ts`): ثلاثة مسارات ثابتة لكل متجر مستخدم (`/api/bff/orders`، `/api/bff/staff`، `/api/bff/settings`) وأي مسار تضيفه اللقطة في `probe`. إن أجاب أحدها من Django يتوقف الأمر ويطبع اسم المسار وطريقة إعادة التشغيل.

## 3. ما يحدث لكل صورة

| القاعدة | التنفيذ |
|---|---|
| الحجمان | سطح المكتب 1440×900 دائماً. والجوال 390×844 حين تطلبه اللقطة (`"viewports": ["desktop", "mobile"]`)، وفيه شريط التنقل السفلي «القائمة». |
| إخفاء أدوات التطوير | يُخفى شريط «بيانات تجريبية» الكهرماني ومؤشر Next.js في زاوية الشاشة، بخيار `style` في Playwright وقت الالتقاط فقط، دون تعديل الصفحة. |
| إخفاء البيانات الشخصية | كل نص يشبه رقم هاتف يمني أو سعودي (`967…`، `966…`، `07…`، `05…`) وكل رمز وصول شخصي (`shw_pat_…`) يُغطّى بمستطيل رمادي. البيانات التجريبية تحتوي أرقاماً تبدو حقيقية، لذلك التغطية إلزامية. |
| المؤشر النصي | `caret: "initial"`. الإعداد الافتراضي في Playwright يكتب `caret-color` داخل عناصر الصفحة فيعترض React على عدم تطابق الترطيب (hydration)، كما يشرح `scripts/bundles-check.ts`. |
| الحركة | `animations: "disabled"` لثبات الصورة. |

## 4. تسمية الصور

```text
docs/guides/_assets/<الجمهور>/<NN-المجال>/<اسم-الصفحة>-<n>.png          ← سطح المكتب
docs/guides/_assets/<الجمهور>/<NN-المجال>/<اسم-الصفحة>-<n>-mobile.png   ← الجوال
```

- `<الجمهور>/<NN-المجال>/<اسم-الصفحة>` هو مسار الدليل الذي يستخدم الصورة، و`<n>` ترتيبها في الصفحة (1، 2، …).
- الأمر يرفض أي معرّف لا يطابق هذا الشكل، ويرفض المعرّف المكرر.
- الدليل في `docs/guides/<الجمهور>/<NN-المجال>/<الصفحة>.md` يربط الصورة هكذا:

  ```markdown
  ![وصف عربي لما في اللقطة](../../_assets/merchant/12-settings-staff-integrations/permissions-matrix-1.png)
  ```

## 5. إضافة لقطة جديدة

1. أضف مدخلاً إلى `docs/guides/_assets/shots.json`:

   ```json
   {
     "id": "merchant/12-settings-staff-integrations/permissions-matrix-1",
     "host": "noor",
     "session": "merchant",
     "path": "/dashboard/staff/roles",
     "waitFor": "text=الأدوار النظامية",
     "viewports": ["desktop", "mobile"],
     "note": "ما تُظهره الصورة وأي دليل يستخدمها"
   }
   ```

2. التقطها وحدها: `npx tsx scripts/guide-screenshots.ts --only merchant/12-settings-staff-integrations/permissions-matrix-1`
3. افتح الصورة وتأكد أنها تُظهر ما يصفه الدليل، ثم اربطها من الدليل.

حقول المدخل:

| الحقل | إلزامي؟ | المعنى |
|---|---|---|
| `id` | نعم | مسار الصورة بلا `.png` (القسم 4). |
| `host` | نعم | المتجر التجريبي: `noor` (متجر كامل البيانات)، `shop` (متجر فارغ)، `glow`؛ أو `""` لموقع المنصة (الصفحة الترويجية، شروة باي). |
| `session` | لا | جلسة لوحة التحكم التجريبية: `merchant` (مالك المتجر)، `manager` («مدير المتجر»)، `staff` («كاشير»). بلا جلسة للشاشات العامة. |
| `path` | نعم | مسار الصفحة كما يظهر في شريط العنوان. |
| `waitFor` | لا | محدِّد Playwright يثبت أن الشاشة اكتملت، مثل `[data-testid=fx-preview]` أو `text=…`. |
| `steps` | لا | خطوات قبل الالتقاط: `{"click": "…"}`، `{"fill": "…", "value": "…"}`، `{"hover": "…"}`، `{"waitFor": "…"}`، `{"wait": 500}`. |
| `recipe` | لا | حالة مبرمجة لا تصلها الخطوات البسيطة (القسم 6). |
| `element` | لا | التقاط عنصر واحد بدل الشاشة كاملة. |
| `fullPage` | لا | `true` لالتقاط الصفحة بطولها. القائمة الجانبية ثابتة فلا تمتد معها؛ فضّل `element`. |
| `viewports` | لا | `["desktop"]` افتراضياً. |
| `probe` | لا | مسارات إضافية يجب أن تجيب من البيانات التجريبية. |
| `note` | لا | لكاتب الدليل: ما تُظهره الصورة وأين تُستخدم. |

## 6. الوصفات

بعض الحالات تحتاج تسلسلاً لا تكفيه الخطوات، مثل تعارض بين مستخدمَين. هذه تُكتب دالةً في `RECIPES` داخل `scripts/guide-screenshots.ts` ويشير إليها المدخل باسمها.

| الوصفة | ما تُظهره | أثرها على البيانات التجريبية |
|---|---|---|
| `order-conflict` | لوحة التعارض في صفحة الطلب «حُدِّث الطلب #… من مستخدم آخر» بعد أن غيّر مستخدم آخر الطلب نفسه أولاً (التسلسل نفسه في الخطوة 4 من `scripts/catalog-orders-check.ts`) | تغيّر حالة طلب «جديد» في كل تشغيل. حين تنفد الطلبات المناسبة أعد تشغيل الخادم. |

## 7. الصور الحالية

| الصورة | الدليل | ما تُظهره |
|---|---|---|
| `merchant/02-dashboard-shell/plan-features-1` (+ الجوال) | [ما المتاح في باقتي](merchant/02-dashboard-shell/plan-features.md) | شاشة ميزة غير مفعّلة في الباقة («الحجوزات» لمتجر لا تشملها باقته) |
| `merchant/02-dashboard-shell/troubleshooting-access-1` | [لماذا تظهر لي رسالة منع؟](merchant/02-dashboard-shell/troubleshooting-access.md) | شاشة بلا صلاحية، وعناصر القائمة غير المتاحة باهتة |
| `merchant/02-dashboard-shell/troubleshooting-access-2` | [لماذا تظهر لي رسالة منع؟](merchant/02-dashboard-shell/troubleshooting-access.md) | لوحة تعارض الطلب |
| `merchant/12-settings-staff-integrations/permissions-matrix-1` (+ الجوال) | [من يستطيع ماذا](merchant/12-settings-staff-integrations/permissions-matrix.md) | «الأدوار والصلاحيات» |
| `merchant/12-settings-staff-integrations/permissions-matrix-2` | [من يستطيع ماذا](merchant/12-settings-staff-integrations/permissions-matrix.md) | تبويب «الاستثناءات» و«الصلاحية النهائية» لموظف |
| `merchant/08-finance/money-display-1` | [كيف تُعرض المبالغ](merchant/08-finance/money-display.md) | قسم «العملات» في الإعدادات ومعاينة 100 ر.س |
| `merchant/08-finance/money-display-2` | [كيف تُعرض المبالغ](merchant/08-finance/money-display.md) | «المصروفات التشغيلية» بإجمالي لكل عملة |
| `merchant/01-public-onboarding/landing-and-plans-1` (+ الجوال) | [التعرّف على منصة شروة](merchant/01-public-onboarding/landing-and-plans.md) | الصفحة الرئيسية لموقع المنصة |
| `merchant/01-public-onboarding/landing-and-plans-2` | [التعرّف على منصة شروة](merchant/01-public-onboarding/landing-and-plans.md) | «دخول التاجر» بحقل «نطاق متجرك» |
| `merchant/01-public-onboarding/register-store-1` (+ الجوال) | [تسجيل متجر جديد](merchant/01-public-onboarding/register-store.md) | نموذج «أنشئ متجرك» مملوءاً ببيانات تجريبية |
| `merchant/01-public-onboarding/register-store-2` | [تسجيل متجر جديد](merchant/01-public-onboarding/register-store.md) | حالة «محجوز للنظام» داخل حقل «رابط المتجر» |
| `merchant/01-public-onboarding/verify-otp-1` | [رمز التحقق عند التسجيل](merchant/01-public-onboarding/verify-otp.md) | «أدخل رمز التحقق» بخاناته الست |
| `merchant/01-public-onboarding/provisioning-and-first-password-1` | [تجهيز المتجر وأول كلمة مرور](merchant/01-public-onboarding/provisioning-and-first-password.md) | صفحة التجهيز أثناء العمل |
| `merchant/01-public-onboarding/provisioning-and-first-password-2` | [تجهيز المتجر وأول كلمة مرور](merchant/01-public-onboarding/provisioning-and-first-password.md) | «اختر كلمة مرور متجرك» |
| `merchant/02-dashboard-shell/owner-login-1` | [دخول مالك المتجر](merchant/02-dashboard-shell/owner-login.md) | «تسجيل الدخول» لمالك المتجر |
| `merchant/02-dashboard-shell/owner-login-2` | [دخول مالك المتجر](merchant/02-dashboard-shell/owner-login.md) | «نسيت كلمة المرور» |
| `merchant/02-dashboard-shell/owner-login-3` | [دخول مالك المتجر](merchant/02-dashboard-shell/owner-login.md) | «إعادة تعيين كلمة المرور» |
| `merchant/02-dashboard-shell/staff-login-1` | [دخول الموظفين](merchant/02-dashboard-shell/staff-login.md) | «دخول الموظفين» |
| `merchant/02-dashboard-shell/overview-1` (+ الجوال) | [النظرة العامة](merchant/02-dashboard-shell/overview.md) | «النظرة العامة»؛ والجوال بالشريط السفلي |
| `merchant/02-dashboard-shell/command-palette-1` | [لوحة الأوامر](merchant/02-dashboard-shell/command-palette.md) | ⌘K بنتائج من بيانات المتجر |
| `merchant/02-dashboard-shell/notifications-1` | [مركز الإشعارات](merchant/02-dashboard-shell/notifications.md) | لوحة الإشعارات من الجرس |
| `merchant/02-dashboard-shell/my-stores-1` (+ الجوال) | [متاجري](merchant/02-dashboard-shell/my-stores.md) | «كل متاجري» بالنطاق المطبَّق والمجموع |
| `merchant/02-dashboard-shell/my-stores-2` | [متاجري](merchant/02-dashboard-shell/my-stores.md) | مبدّل المتاجر مفتوحاً |
| `buyer/05-storefront/browse-and-search-1` (+ الجوال) | [التسوّق في المتجر](buyer/05-storefront/browse-and-search.md) | الصفحة الرئيسية للمتجر بأقسامها |
| `buyer/05-storefront/browse-and-search-2` | [التسوّق في المتجر](buyer/05-storefront/browse-and-search.md) | صفحة قسم مع لوحة التصفية والترتيب |
| `buyer/05-storefront/product-page-1` (+ الجوال) | [صفحة المنتج](buyer/05-storefront/product-page.md) | منتج بخيارات المقاس واللون |
| `buyer/05-storefront/cart-1` | [السلة والكوبونات](buyer/05-storefront/cart.md) | «سلتك» بكود خصم مطبَّق |
| `buyer/05-storefront/checkout-delivery-1` | [إتمام الطلب: التوصيل](buyer/05-storefront/checkout-delivery.md) | «إتمام الطلب»: البيانات والتوصيل |
| `buyer/05-storefront/checkout-payment-1` | [إتمام الطلب: الدفع](buyer/05-storefront/checkout-payment.md) | قسم «الدفع» مع التحويل البنكي |
| `buyer/05-storefront/order-success-1` | [صفحة نجاح الطلب](buyer/05-storefront/order-success.md) | «تم استلام طلبك» لطلب دفع عند الاستلام |
| `buyer/05-storefront/track-order-1` | [تتبّع الطلب](buyer/05-storefront/track-order.md) | «تتبّع الطلب» لطلب توصيل |
| `buyer/05-storefront/app-and-notifications-1` | [تطبيق المتجر والتنبيهات](buyer/05-storefront/app-and-notifications.md) | زر «نبّهني عند تغيّر حالة طلبي» في صفحة نجاح الطلب |
| `buyer/05-storefront/wishlist-1` (+ الجوال) | [المفضلة](buyer/05-storefront/wishlist.md) | «المفضلة» بمنتج محفوظ |
| `buyer/05-storefront/reviews-1` | [التقييمات](buyer/05-storefront/reviews.md) | نموذج تقييم المنتج |
| `buyer/05-storefront/reviews-2` | [التقييمات](buyer/05-storefront/reviews.md) | «تقييم المتجر» في صفحة «من نحن» |
| `merchant/03-catalog/add-product-1` | [إضافة منتج جديد](merchant/03-catalog/add-product.md) | محرر «منتج جديد» بالبطاقات وشريط الحفظ |
| `merchant/03-catalog/add-product-2` | [إضافة منتج جديد](merchant/03-catalog/add-product.md) | جدول «المتغيرات قبل الحفظ» لمنتج من قالب |
| `merchant/03-catalog/add-product-3` | [إضافة منتج جديد](merchant/03-catalog/add-product.md) | الحفظ مع نقص: الحقول المعلّمة بالأحمر |
| `merchant/03-catalog/edit-product-and-variants-1` (+ الجوال) | [تعديل المنتجات](merchant/03-catalog/edit-product-and-variants.md) | قائمة «المنتجات» بالفلاتر |
| `merchant/03-catalog/edit-product-and-variants-2` | [تعديل المنتجات](merchant/03-catalog/edit-product-and-variants.md) | «مصفوفة المتغيرات» لمنتج محفوظ |
| `merchant/03-catalog/edit-product-and-variants-3` | [تعديل المنتجات](merchant/03-catalog/edit-product-and-variants.md) | «سجل التغييرات» |
| `merchant/03-catalog/organization-1` | [تنظيم الكتالوج](merchant/03-catalog/organization.md) | شجرة «التصنيفات» |
| `merchant/03-catalog/organization-2` | [تنظيم الكتالوج](merchant/03-catalog/organization.md) | تبويب «الماركات» |
| `merchant/03-catalog/organization-3` | [تنظيم الكتالوج](merchant/03-catalog/organization.md) | محرر مجموعة «هدايا العيد» |
| `merchant/03-catalog/organization-4` | [تنظيم الكتالوج](merchant/03-catalog/organization.md) | تبويب «الشارات» والمعاينة |
| `merchant/03-catalog/bundles-and-compatibility-1` | [الحزم وقواعد التوافق](merchant/03-catalog/bundles-and-compatibility.md) | قسم «الحزمة» لـ«طقم فناجين» |
| `merchant/03-catalog/bundles-and-compatibility-2` | [الحزم وقواعد التوافق](merchant/03-catalog/bundles-and-compatibility.md) | «قواعد التوافق» |
| `merchant/03-catalog/personalization-1` | [حقول التخصيص](merchant/03-catalog/personalization.md) | «حقول التخصيص» لـ«خاتم فضة» |
| `merchant/03-catalog/auctions-1` | [المزادات](merchant/03-catalog/auctions.md) | قسم «المزاد» و«العطاءات» لـ«مسبحة كهرمان» |
| `merchant/03-catalog/serials-and-formula-1` | [الأرقام التسلسلية والمعادلة](merchant/03-catalog/serials-and-formula.md) | لصق أكواد مع «أكواد مكررة:» |
| `merchant/03-catalog/serials-and-formula-2` | [الأرقام التسلسلية والمعادلة](merchant/03-catalog/serials-and-formula.md) | «تسعير بالمعادلة» لـ«زعفران» مع «السعر الناتج:» |
| `merchant/03-catalog/tier-prices-1` | [أسعار الكميات](merchant/03-catalog/tier-prices.md) | «أسعار الكميات» بثلاث شرائح |
| `merchant/03-catalog/import-products-1` | [استيراد المنتجات](merchant/03-catalog/import-products.md) | مرحلة «رفع الملف» |
| `merchant/03-catalog/export-products-1` | [تصدير المنتجات](merchant/03-catalog/export-products.md) | قائمة «المزيد» وفيها «تصدير CSV بالفلاتر الحالية» |
| `merchant/04-orders-returns/orders-list-1` | [قائمة الطلبات](merchant/04-orders-returns/orders-list.md) | العدّادات والفلاتر والجدول |
| `merchant/04-orders-returns/order-detail-1` | [تفاصيل الطلب](merchant/04-orders-returns/order-detail.md) | صفحة الطلب 10480 كاملة |
| `merchant/04-orders-returns/order-detail-2` | [تفاصيل الطلب](merchant/04-orders-returns/order-detail.md) | «الجدول الزمني» |
| `merchant/04-orders-returns/order-detail-3` | [تفاصيل الطلب](merchant/04-orders-returns/order-detail.md) | صفحة الطباعة |
| `merchant/04-orders-returns/order-statuses-1` | [حالات الطلب](merchant/04-orders-returns/order-statuses.md) | قائمة تغيير حالة التنفيذ مفتوحة |
| `merchant/04-orders-returns/order-statuses-2` | [حالات الطلب](merchant/04-orders-returns/order-statuses.md) | شاشة «حالات الطلب» |
| `merchant/04-orders-returns/payment-review-1` | [تأكيد الدفع](merchant/04-orders-returns/payment-review.md) | قسم مراجعة الدفع مع الإيصال و«الفرق» |
| `merchant/04-orders-returns/manual-order-1` | [إنشاء طلب يدوي](merchant/04-orders-returns/manual-order.md) | نموذج «طلب يدوي» |
| `merchant/04-orders-returns/refunds-1` | [الاسترجاع المالي](merchant/04-orders-returns/refunds.md) | نافذة «استرجاع مبلغ» |
| `merchant/04-orders-returns/refunds-2` | [الاسترجاع المالي](merchant/04-orders-returns/refunds.md) | «سجل الاسترجاعات» |
| `merchant/04-orders-returns/returns-1` | [المرتجعات](merchant/04-orders-returns/returns.md) | قائمة «المرتجعات» و«ملخص المرتجعات» |
| `merchant/04-orders-returns/returns-2` | [المرتجعات](merchant/04-orders-returns/returns.md) | الاعتماد مع «موقع إعادة المخزون» |
| `merchant/04-orders-returns/rma-1` | [RMA](merchant/04-orders-returns/rma.md) | «مسار RMA» و«حالات RMA» |
| `merchant/04-orders-returns/rma-2` | [RMA](merchant/04-orders-returns/rma.md) | شاشة «مسح الاستلام» |
| `merchant/04-orders-returns/rma-3` | [RMA](merchant/04-orders-returns/rma.md) | RMA-804 و«قرار الفحص» |
| `merchant/06-customers-wallets/customers-list-1` | [قائمة العملاء](merchant/06-customers-wallets/customers-list.md) | «العملاء» بالفلاتر والجدول |
| `merchant/06-customers-wallets/customers-list-2` | [قائمة العملاء](merchant/06-customers-wallets/customers-list.md) | سطر الشريحة «خامل» وعددها |
| `merchant/06-customers-wallets/customer-profile-1` | [ملف العميل](merchant/06-customers-wallets/customer-profile.md) | ملف 967770841802 كاملاً |
| `merchant/06-customers-wallets/customer-profile-2` | [ملف العميل](merchant/06-customers-wallets/customer-profile.md) | قسم «التقييمات» |
| `merchant/06-customers-wallets/cod-control-1` | [إيقاف الدفع عند الاستلام](merchant/06-customers-wallets/cod-control.md) | نافذة «إيقاف الدفع عند الاستلام» |
| `merchant/06-customers-wallets/cod-control-2` | [إيقاف الدفع عند الاستلام](merchant/06-customers-wallets/cod-control.md) | عميل موقوف مع «إعادة التفعيل» |
| `merchant/06-customers-wallets/export-customers-1` | [تصدير العملاء](merchant/06-customers-wallets/export-customers.md) | نافذة «تصدير العملاء» |
| `merchant/06-customers-wallets/customer-wallets-1` | [محافظ العملاء](merchant/06-customers-wallets/customer-wallets.md) | قائمة «محافظ العملاء» |
| `merchant/06-customers-wallets/customer-wallets-2` | [محافظ العملاء](merchant/06-customers-wallets/customer-wallets.md) | نافذة «تعبئة محفظة …» |
| `merchant/06-customers-wallets/loyalty-points-1` | [نقاط الولاء](merchant/06-customers-wallets/loyalty-points.md) | أرصدة «نقاط الولاء» |
| `merchant/07-marketing-design-partners/theme-1` | [تخصيص هوية المتجر](merchant/07-marketing-design-partners/theme.md) | تبويب «الهوية» والقوالب الجاهزة والمعاينة |
| `merchant/07-marketing-design-partners/theme-2` | [تخصيص هوية المتجر](merchant/07-marketing-design-partners/theme.md) | لوحة الهوية: الألوان والخطوط والنمط و«الشعار» |
| `merchant/07-marketing-design-partners/sections-1` | [أقسام الصفحة الرئيسية](merchant/07-marketing-design-partners/sections.md) | تبويب «الأقسام» وترتيبها |
| `merchant/07-marketing-design-partners/sections-2` | [أقسام الصفحة الرئيسية](merchant/07-marketing-design-partners/sections.md) | محرر قسم «سلايدر» جديد وعناصره |
| `merchant/07-marketing-design-partners/announcement-bar-1` | [شريط الإعلانات](merchant/07-marketing-design-partners/announcement-bar.md) | تبويب «شريط الإعلانات» مع المعاينة |
| `merchant/07-marketing-design-partners/coupons-1` | [الكوبونات](merchant/07-marketing-design-partners/coupons.md) | «مركز التسويق» والملخص |
| `merchant/07-marketing-design-partners/coupons-2` | [الكوبونات](merchant/07-marketing-design-partners/coupons.md) | نموذج «كوبون جديد» |
| `merchant/07-marketing-design-partners/coupons-3` | [الكوبونات](merchant/07-marketing-design-partners/coupons.md) | قائمة «الكوبونات» وحالاتها |
| `merchant/07-marketing-design-partners/offers-1` | [العروض الترويجية](merchant/07-marketing-design-partners/offers.md) | نموذج «عرض جديد» و«شرط التطبيق» والمعاينة |
| `merchant/07-marketing-design-partners/offers-2` | [العروض الترويجية](merchant/07-marketing-design-partners/offers.md) | عرض «اشترِ X واحصل على Y» |
| `merchant/07-marketing-design-partners/offers-3` | [العروض الترويجية](merchant/07-marketing-design-partners/offers.md) | قائمة «العروض الترويجية» |
| `merchant/07-marketing-design-partners/abandoned-carts-1` (+ الجوال) | [السلات المتروكة](merchant/07-marketing-design-partners/abandoned-carts.md) | القائمة والعدادات |
| `merchant/07-marketing-design-partners/abandoned-carts-2` | [السلات المتروكة](merchant/07-marketing-design-partners/abandoned-carts.md) | تفاصيل سلة و«إرسال تذكير» |
| `merchant/07-marketing-design-partners/abandoned-carts-3` | [السلات المتروكة](merchant/07-marketing-design-partners/abandoned-carts.md) | «إعدادات تذكير السلات» |
| `merchant/07-marketing-design-partners/campaigns-1` | [الحملات](merchant/07-marketing-design-partners/campaigns.md) | نموذج «حملة جديدة» |
| `merchant/07-marketing-design-partners/campaigns-2` | [الحملات](merchant/07-marketing-design-partners/campaigns.md) | «معاينة الحملة» |
| `merchant/07-marketing-design-partners/campaigns-3` | [الحملات](merchant/07-marketing-design-partners/campaigns.md) | قائمة «الحملات» |
| `merchant/07-marketing-design-partners/timeline-loyalty-gifting-1` | [الجدول الزمني والولاء والإهداء](merchant/07-marketing-design-partners/timeline-loyalty-gifting.md) | «الجدول الزمني» بالأشهر |
| `merchant/07-marketing-design-partners/timeline-loyalty-gifting-2` | [الجدول الزمني والولاء والإهداء](merchant/07-marketing-design-partners/timeline-loyalty-gifting.md) | «نقاط الولاء» والمثال |
| `merchant/07-marketing-design-partners/timeline-loyalty-gifting-3` | [الجدول الزمني والولاء والإهداء](merchant/07-marketing-design-partners/timeline-loyalty-gifting.md) | «الإهداء» |
| `merchant/07-marketing-design-partners/affiliates-1` (+ الجوال) | [المسوّقون بالعمولة](merchant/07-marketing-design-partners/affiliates.md) | شريط الأداء وقائمة المسوّقين |
| `merchant/07-marketing-design-partners/affiliates-2` | [المسوّقون بالعمولة](merchant/07-marketing-design-partners/affiliates.md) | معاينة «تعليم المستحقات كمدفوعة» |
| `merchant/07-marketing-design-partners/influencers-1` | [المؤثرون](merchant/07-marketing-design-partners/influencers.md) | صفحة المؤثر: الكوبونات المرتبطة والمبيعات |
| `merchant/08-finance/payment-gateways-1` | [ربط بوابات الدفع](merchant/08-finance/payment-gateways.md) | قسم «ربط بوابات الدفع» |
| `merchant/08-finance/payment-gateways-2` | [ربط بوابات الدفع](merchant/08-finance/payment-gateways.md) | نموذج بيانات «حاسب الكريمي» |
| `merchant/08-finance/payment-methods-1` | [طرق الدفع](merchant/08-finance/payment-methods.md) | «طرق الدفع الأخرى» |
| `merchant/08-finance/payout-accounts-1` | [حسابات الاستلام](merchant/08-finance/payout-accounts.md) | «حسابات الاستلام» و«كما يراها العميل» |
| `merchant/08-finance/merchant-wallet-1` | [محفظة المتجر](merchant/08-finance/merchant-wallet.md) | الأرصدة الأربعة و«سجل الحركات» |
| `merchant/08-finance/merchant-wallet-2` | [محفظة المتجر](merchant/08-finance/merchant-wallet.md) | نموذج «طلب سحب» |
| `merchant/08-finance/platform-dues-1` | [المستحقات للمنصة](merchant/08-finance/platform-dues.md) | «المستحقات للمنصة» |
| `merchant/08-finance/expenses-1` (+ الجوال) | [المصروفات التشغيلية](merchant/08-finance/expenses.md) | النموذج والدفتر بالشهر |
| `merchant/10-inventory-locations-procurement/inventory-hub-1` (+ الجوال) | [شاشة المخزون](merchant/10-inventory-locations-procurement/inventory-hub.md) | الجدول والعدادات |
| `merchant/10-inventory-locations-procurement/inventory-hub-2` | [شاشة المخزون](merchant/10-inventory-locations-procurement/inventory-hub.md) | العرض حسب الموقع |
| `merchant/10-inventory-locations-procurement/adjust-stock-1` | [تعديل الكمية](merchant/10-inventory-locations-procurement/adjust-stock.md) | لوحة «تعديل المخزون» |
| `merchant/10-inventory-locations-procurement/movements-and-reservations-1` | [سجل الحركات والحجوزات](merchant/10-inventory-locations-procurement/movements-and-reservations.md) | «سجل الحركات» |
| `merchant/10-inventory-locations-procurement/movements-and-reservations-2` | [سجل الحركات والحجوزات](merchant/10-inventory-locations-procurement/movements-and-reservations.md) | «الوحدات المسلسلة» |
| `merchant/10-inventory-locations-procurement/movements-and-reservations-3` | [سجل الحركات والحجوزات](merchant/10-inventory-locations-procurement/movements-and-reservations.md) | «الحجوزات» |
| `merchant/10-inventory-locations-procurement/writeoffs-1` | [طلبات الإعدام](merchant/10-inventory-locations-procurement/writeoffs.md) | نموذج «طلب إعدام مخزون» |
| `merchant/10-inventory-locations-procurement/writeoffs-2` | [طلبات الإعدام](merchant/10-inventory-locations-procurement/writeoffs.md) | طلب إعدام في صندوق الموافقات |
| `merchant/10-inventory-locations-procurement/export-inventory-1` | [تصدير المخزون](merchant/10-inventory-locations-procurement/export-inventory.md) | زر «تصدير CSV» |
| `merchant/10-inventory-locations-procurement/locations-1` | [المواقع](merchant/10-inventory-locations-procurement/locations.md) | نموذج «موقع جديد» |
| `merchant/10-inventory-locations-procurement/locations-2` (+ الجوال) | [المواقع](merchant/10-inventory-locations-procurement/locations.md) | قائمة «المواقع» |
| `merchant/10-inventory-locations-procurement/multi-location-mode-1` | [تعدد المواقع](merchant/10-inventory-locations-procurement/multi-location-mode.md) | شاشة التفعيل |
| `merchant/10-inventory-locations-procurement/multi-location-mode-2` | [تعدد المواقع](merchant/10-inventory-locations-procurement/multi-location-mode.md) | تعارض الإيقاف |
| `merchant/10-inventory-locations-procurement/location-inventory-1` | [مخزون الموقع](merchant/10-inventory-locations-procurement/location-inventory.md) | تبويب «المخزون» للموقع |
| `merchant/10-inventory-locations-procurement/location-inventory-2` | [مخزون الموقع](merchant/10-inventory-locations-procurement/location-inventory.md) | التعديل والحدود |
| `merchant/10-inventory-locations-procurement/location-staff-1` | [موظفو الموقع](merchant/10-inventory-locations-procurement/location-staff.md) | تبويب «الموظفون» |
| `merchant/10-inventory-locations-procurement/routing-rules-1` | [قواعد التوجيه](merchant/10-inventory-locations-procurement/routing-rules.md) | «قواعد التوجيه» و«جرّب التوجيه» |
| `merchant/10-inventory-locations-procurement/suppliers-1` | [الموردون](merchant/10-inventory-locations-procurement/suppliers.md) | القائمة و«مورد جديد» |
| `merchant/10-inventory-locations-procurement/suppliers-2` | [الموردون](merchant/10-inventory-locations-procurement/suppliers.md) | صفحة المورد |
| `merchant/10-inventory-locations-procurement/purchase-orders-1` | [أوامر الشراء](merchant/10-inventory-locations-procurement/purchase-orders.md) | نموذج «أمر شراء جديد» |
| `merchant/10-inventory-locations-procurement/purchase-orders-2` | [أوامر الشراء](merchant/10-inventory-locations-procurement/purchase-orders.md) | «تسجيل الاستلام» |
| `merchant/10-inventory-locations-procurement/purchase-orders-3` | [أوامر الشراء](merchant/10-inventory-locations-procurement/purchase-orders.md) | صفحة الأمر والجدول الزمني |
| `merchant/11-shipping/shipping-settings-1` | [رسوم التوصيل](merchant/11-shipping/shipping-settings.md) | قسم «الرسوم العامة» |
| `merchant/11-shipping/delivery-methods-1` | [طرق التوصيل](merchant/11-shipping/delivery-methods.md) | القائمة و«كما يراها العميل» |
| `merchant/11-shipping/delivery-methods-2` | [طرق التوصيل](merchant/11-shipping/delivery-methods.md) | نموذج طريقة «شروة شيب» الرسمية |
| `merchant/11-shipping/pickup-locations-1` | [نقاط الاستلام](merchant/11-shipping/pickup-locations.md) | القائمة بالترتيب |
| `merchant/11-shipping/delivery-providers-1` | [المندوبون وشركات الشحن](merchant/11-shipping/delivery-providers.md) | تبويب «المندوبون» ونموذج المندوب |
| `merchant/11-shipping/carriers-1` | [الناقلون الخارجيون](merchant/11-shipping/carriers.md) | صفحة أرامكس |
| `merchant/11-shipping/zones-packaging-sla-1` | [المناطق والتغليف وSLA](merchant/11-shipping/zones-packaging-sla.md) | «مناطق شروة شيب» والمخطط |
| `merchant/11-shipping/zones-packaging-sla-2` | [المناطق والتغليف وSLA](merchant/11-shipping/zones-packaging-sla.md) | «نطاق محظور جديد» والمعاينة |
| `merchant/11-shipping/zones-packaging-sla-3` | [المناطق والتغليف وSLA](merchant/11-shipping/zones-packaging-sla.md) | تبويب «قواعد SLA» |
| `merchant/11-shipping/zone-review-and-edge-cases-1` | [مراجعة المناطق والحالات الحدّية](merchant/11-shipping/zone-review-and-edge-cases.md) | «مراجعة المناطق» بالمخطط |
| `merchant/11-shipping/zone-review-and-edge-cases-2` | [مراجعة المناطق والحالات الحدّية](merchant/11-shipping/zone-review-and-edge-cases.md) | «الحالات الحدّية» وتبويباتها |
| `merchant/11-shipping/address-and-convert-to-pickup-1` | [تحديث العنوان والتحويل إلى استلام](merchant/11-shipping/address-and-convert-to-pickup.md) | «تحديث العنوان أثناء النقل» |
| `merchant/11-shipping/address-and-convert-to-pickup-2` | [تحديث العنوان والتحويل إلى استلام](merchant/11-shipping/address-and-convert-to-pickup.md) | نافذة التحويل إلى استلام |
| `merchant/11-shipping/sharwa-ship-issue-waybill-1` | [إصدار بوليصات شروة شيب](merchant/11-shipping/sharwa-ship-issue-waybill.md) | «بانتظار الإصدار» |
| `merchant/11-shipping/sharwa-ship-issue-waybill-2` | [إصدار بوليصات شروة شيب](merchant/11-shipping/sharwa-ship-issue-waybill.md) | نافذة «إصدار بوليصة» |
| `merchant/11-shipping/sharwa-ship-shipments-1` | [بوليصات شروة شيب](merchant/11-shipping/sharwa-ship-shipments.md) | تبويب «البوليصات» |
| `merchant/11-shipping/sharwa-ship-shipments-2` | [بوليصات شروة شيب](merchant/11-shipping/sharwa-ship-shipments.md) | صفحة البوليصة 716 |
| `merchant/11-shipping/awb-queue-and-rate-cards-1` | [طابور AWB ولقطات التسعيرة](merchant/11-shipping/awb-queue-and-rate-cards.md) | «طابور إصدار AWB» |
| `merchant/11-shipping/awb-queue-and-rate-cards-2` | [طابور AWB ولقطات التسعيرة](merchant/11-shipping/awb-queue-and-rate-cards.md) | «لقطات تسعيرة الناقلين» |
| `merchant/11-shipping/courier-supervision-1` | [الإشراف على المندوبين](merchant/11-shipping/courier-supervision.md) | «إشراف المندوبين» |
| `merchant/11-shipping/courier-supervision-2` | [الإشراف على المندوبين](merchant/11-shipping/courier-supervision.md) | نافذة «إعادة إسناد طارئة» |
| `merchant/11-shipping/courier-supervision-3` | [الإشراف على المندوبين](merchant/11-shipping/courier-supervision.md) | «مناوبات المندوبين» |
| `courier/11-shipping/sign-in-and-home-1` (الجوال) | [دخول تطبيق المندوب](courier/11-shipping/sign-in-and-home.md) | الشاشة الرئيسية |
| `courier/11-shipping/sign-in-and-home-2` (الجوال) | [دخول تطبيق المندوب](courier/11-shipping/sign-in-and-home.md) | حساب بلا ملف مندوب |
| `courier/11-shipping/shifts-1` (الجوال) | [المناوبات](courier/11-shipping/shifts.md) | «تسليم إلى مندوب آخر» |
| `courier/11-shipping/shipments-1` (الجوال) | [شحناتي](courier/11-shipping/shipments.md) | تبويب «قيد التوصيل» |
| `courier/11-shipping/shipments-2` (الجوال) | [شحناتي](courier/11-shipping/shipments.md) | صفحة الشحنة 710 |
| `courier/11-shipping/shipments-3` (الجوال) | [شحناتي](courier/11-shipping/shipments.md) | نموذج «تسليم وتحصيل» |
| `courier/11-shipping/custody-1` (الجوال) | [العهدة](courier/11-shipping/custody.md) | الرصيد والحركات |
| `merchant/12-settings-staff-integrations/settings-identity-contact-policies-1` | [الهوية والتواصل والسياسات](merchant/12-settings-staff-integrations/settings-identity-contact-policies.md) | قسم «الهوية» |
| `merchant/12-settings-staff-integrations/settings-identity-contact-policies-2` | [الهوية والتواصل والسياسات](merchant/12-settings-staff-integrations/settings-identity-contact-policies.md) | قسم «التواصل» |
| `merchant/12-settings-staff-integrations/settings-identity-contact-policies-3` | [الهوية والتواصل والسياسات](merchant/12-settings-staff-integrations/settings-identity-contact-policies.md) | قسم «السياسات» والمعاينة |
| `merchant/12-settings-staff-integrations/settings-currency-seo-1` | [العملة وSEO والمنطقة الزمنية](merchant/12-settings-staff-integrations/settings-currency-seo.md) | قسم «العملات» ومعاينة 100 ر.س |
| `merchant/12-settings-staff-integrations/settings-currency-seo-2` | [العملة وSEO والمنطقة الزمنية](merchant/12-settings-staff-integrations/settings-currency-seo.md) | قسم SEO ومعاينة نتيجة البحث |
| `merchant/12-settings-staff-integrations/staff-members-1` | [الموظفون](merchant/12-settings-staff-integrations/staff-members.md) | قائمة «الموظفون» |
| `merchant/12-settings-staff-integrations/staff-members-2` | [الموظفون](merchant/12-settings-staff-integrations/staff-members.md) | «إضافة موظف» |
| `merchant/12-settings-staff-integrations/staff-members-3` | [الموظفون](merchant/12-settings-staff-integrations/staff-members.md) | كلمة المرور المؤقتة |
| `merchant/12-settings-staff-integrations/roles-and-assignments-1` | [الأدوار والتعيينات](merchant/12-settings-staff-integrations/roles-and-assignments.md) | «الأدوار والصلاحيات» |
| `merchant/12-settings-staff-integrations/roles-and-assignments-2` | [الأدوار والتعيينات](merchant/12-settings-staff-integrations/roles-and-assignments.md) | نموذج الدور المخصص |
| `merchant/12-settings-staff-integrations/roles-and-assignments-3` | [الأدوار والتعيينات](merchant/12-settings-staff-integrations/roles-and-assignments.md) | تبويب «التعيينات» |
| `merchant/12-settings-staff-integrations/roles-and-assignments-4` | [الأدوار والتعيينات](merchant/12-settings-staff-integrations/roles-and-assignments.md) | «الاستثناءات» و«الصلاحية النهائية» |
| `merchant/12-settings-staff-integrations/sessions-tokens-devices-roster-1` | [الجلسات والرموز والأجهزة والجدول](merchant/12-settings-staff-integrations/sessions-tokens-devices-roster.md) | «الجلسات والأجهزة» |
| `merchant/12-settings-staff-integrations/sessions-tokens-devices-roster-2` | [الجلسات والرموز والأجهزة والجدول](merchant/12-settings-staff-integrations/sessions-tokens-devices-roster.md) | «الجدول» |
| `merchant/12-settings-staff-integrations/approvals-1` | [طلبات الموافقة](merchant/12-settings-staff-integrations/approvals.md) | القائمة |
| `merchant/12-settings-staff-integrations/approvals-2` | [طلبات الموافقة](merchant/12-settings-staff-integrations/approvals.md) | لوحة الطلب |
| `merchant/12-settings-staff-integrations/audit-and-alerts-1` | [سجل التدقيق والتنبيهات](merchant/12-settings-staff-integrations/audit-and-alerts.md) | «سجل التدقيق» |
| `merchant/12-settings-staff-integrations/audit-and-alerts-2` | [سجل التدقيق والتنبيهات](merchant/12-settings-staff-integrations/audit-and-alerts.md) | «تنبيهات السلوك» |
| `merchant/12-settings-staff-integrations/custom-domain-1` | [ربط نطاق خاص](merchant/12-settings-staff-integrations/custom-domain.md) | سجلات DNS |
| `merchant/12-settings-staff-integrations/custom-domain-2` | [ربط نطاق خاص](merchant/12-settings-staff-integrations/custom-domain.md) | قائمة «النطاقات» |
| `merchant/12-settings-staff-integrations/tracking-pixels-1` | [أدوات التتبع](merchant/12-settings-staff-integrations/tracking-pixels.md) | النموذج |
| `merchant/12-settings-staff-integrations/webhooks-1` | [Webhooks](merchant/12-settings-staff-integrations/webhooks.md) | «نقطة نهاية جديدة» |
| `merchant/12-settings-staff-integrations/webhooks-2` | [Webhooks](merchant/12-settings-staff-integrations/webhooks.md) | القائمة |
| `merchant/12-settings-staff-integrations/webhooks-3` | [Webhooks](merchant/12-settings-staff-integrations/webhooks.md) | «سجل التسليم» |
| `merchant/12-settings-staff-integrations/integrations-status-1` | [حالة التكاملات](merchant/12-settings-staff-integrations/integrations-status.md) | الصفحة |
| `merchant/15-reports/reports-overview-1` | [فهرس التقارير](merchant/15-reports/reports-overview.md) | الفهرس |
| `merchant/15-reports/reports-overview-2` | [فهرس التقارير](merchant/15-reports/reports-overview.md) | «المبيعات» مع «الموقع» |
| `merchant/15-reports/exports-and-schedules-1` | [التصدير والتقارير المجدولة](merchant/15-reports/exports-and-schedules.md) | «تصديراتي» |
| `merchant/15-reports/exports-and-schedules-2` | [التصدير والتقارير المجدولة](merchant/15-reports/exports-and-schedules.md) | «اشتراك جديد» |
| `merchant/15-reports/browser-notifications-1` | [إشعارات المتصفح](merchant/15-reports/browser-notifications.md) | البطاقة |
| `merchant/09-b2b/create-draft-1` | [إنشاء مسودة طلب جملة](merchant/09-b2b/create-draft.md) | نموذج «مسودة جملة جديدة» |
| `merchant/09-b2b/approve-drafts-1` | [اعتماد مسودات الجملة ورفضها](merchant/09-b2b/approve-drafts.md) | قائمة «مسودات الجملة» |
| `merchant/09-b2b/approve-drafts-2` | [اعتماد مسودات الجملة ورفضها](merchant/09-b2b/approve-drafts.md) | تفاصيل المسودة ونافذة الاعتماد |
| `merchant/14-apps-ai-support/app-store-1` | [متجر التطبيقات](merchant/14-apps-ai-support/app-store.md) | الكتالوج |
| `merchant/14-apps-ai-support/app-store-2` | [متجر التطبيقات](merchant/14-apps-ai-support/app-store.md) | صفحة تطبيق |
| `merchant/14-apps-ai-support/whatsapp-app-1` | [تطبيق الواتساب](merchant/14-apps-ai-support/whatsapp-app.md) | «ربط الجهاز» و«آخر 7 أيام» |
| `merchant/14-apps-ai-support/whatsapp-app-2` | [تطبيق الواتساب](merchant/14-apps-ai-support/whatsapp-app.md) | «سجل الاستخدام» |
| `merchant/14-apps-ai-support/whatsapp-templates-1` | [قوالب رسائل الواتساب](merchant/14-apps-ai-support/whatsapp-templates.md) | المحرر والمعاينة |
| `merchant/14-apps-ai-support/sharwa-ai-pairing-1` | [شروة AI: الربط والحالة](merchant/14-apps-ai-support/sharwa-ai-pairing.md) | «جارٍ الربط…» ورمز QR |
| `merchant/14-apps-ai-support/sharwa-ai-pairing-2` | [شروة AI: الربط والحالة](merchant/14-apps-ai-support/sharwa-ai-pairing.md) | «مربوط» |
| `merchant/14-apps-ai-support/sharwa-ai-pairing-3` | [شروة AI: الربط والحالة](merchant/14-apps-ai-support/sharwa-ai-pairing.md) | «تعذّر الربط» و«إعادة الربط» |
| `merchant/14-apps-ai-support/sharwa-ai-settings-console-1` | [إعدادات شروة AI ووحدة التحكم](merchant/14-apps-ai-support/sharwa-ai-settings-console.md) | «الإعدادات» |
| `merchant/14-apps-ai-support/sharwa-ai-settings-console-2` | [إعدادات شروة AI ووحدة التحكم](merchant/14-apps-ai-support/sharwa-ai-settings-console.md) | «وحدة التحكم» |
| `merchant/14-apps-ai-support/support-sessions-1` | [جلسات الدعم الفني](merchant/14-apps-ai-support/support-sessions.md) | القائمة |
| `merchant/14-apps-ai-support/support-sessions-2` | [جلسات الدعم الفني](merchant/14-apps-ai-support/support-sessions.md) | الخط الزمني لجلسة |
| `merchant/14-apps-ai-support/support-tickets-1` | [تذاكر الدعم](merchant/14-apps-ai-support/support-tickets.md) | القائمة |
| `merchant/14-apps-ai-support/support-tickets-2` | [تذاكر الدعم](merchant/14-apps-ai-support/support-tickets.md) | تفاصيل التذكرة |
| `sharwa-pay/08-finance/sign-in-1` | [الدخول برمز واتساب](sharwa-pay/08-finance/sign-in.md) | «رقم الجوال» (الجوال) |
| `sharwa-pay/08-finance/sign-in-2` | [الدخول برمز واتساب](sharwa-pay/08-finance/sign-in.md) | «أدخل الرمز» (الجوال) |
| `sharwa-pay/08-finance/wallet-and-transactions-1` | [الرصيد والحركات](sharwa-pay/08-finance/wallet-and-transactions.md) | المحفظة (الجوال) |
| `sharwa-pay/08-finance/wallet-and-transactions-2` | [الرصيد والحركات](sharwa-pay/08-finance/wallet-and-transactions.md) | «الحركات» (الجوال) |
| `sharwa-pay/08-finance/topup-and-withdraw-1` | [الشحن والسحب](sharwa-pay/08-finance/topup-and-withdraw.md) | «شحن المحفظة» (الجوال) |
| `sharwa-pay/08-finance/topup-and-withdraw-2` | [الشحن والسحب](sharwa-pay/08-finance/topup-and-withdraw.md) | «سحب من المحفظة» (الجوال) |
| `sharwa-pay/08-finance/topup-and-withdraw-3` | [الشحن والسحب](sharwa-pay/08-finance/topup-and-withdraw.md) | «طلباتي» (الجوال) |
| `merchant/13-channels-operations/inbox-1` | [صندوق المحادثات](merchant/13-channels-operations/inbox.md) | قائمة المحادثات |
| `merchant/13-channels-operations/inbox-2` | [صندوق المحادثات](merchant/13-channels-operations/inbox.md) | محادثة فيها بطاقة منتج |
| `merchant/13-channels-operations/chat-to-order-1` | [تحويل المحادثة إلى طلب](merchant/13-channels-operations/chat-to-order.md) | نافذة التحويل |
| `merchant/13-channels-operations/connect-channels-1` | [ربط قنوات التواصل](merchant/13-channels-operations/connect-channels.md) | صفحة القنوات |
| `merchant/13-channels-operations/connect-channels-2` | [ربط قنوات التواصل](merchant/13-channels-operations/connect-channels.md) | نموذج تيليجرام |
| `merchant/13-channels-operations/keywords-templates-access-1` | [المحفّزات والقوالب والوصول](merchant/13-channels-operations/keywords-templates-access.md) | المحفّزات |
| `merchant/13-channels-operations/keywords-templates-access-2` | [المحفّزات والقوالب والوصول](merchant/13-channels-operations/keywords-templates-access.md) | قوالب الردود |
| `merchant/13-channels-operations/keywords-templates-access-3` | [المحفّزات والقوالب والوصول](merchant/13-channels-operations/keywords-templates-access.md) | مصفوفة الوصول |
| `merchant/13-channels-operations/catalog-sync-1` | [مزامنة الكتالوج](merchant/13-channels-operations/catalog-sync.md) | الإعدادات وتقرير المنتجات |
| `merchant/13-channels-operations/catalog-sync-2` | [مزامنة الكتالوج](merchant/13-channels-operations/catalog-sync.md) | ربط فئات تيك توك |
| `merchant/13-channels-operations/marketplaces-connect-1` | [ربط أمازون ونون](merchant/13-channels-operations/marketplaces-connect.md) | صفحة الأسواق |
| `merchant/13-channels-operations/marketplaces-connect-2` | [ربط أمازون ونون](merchant/13-channels-operations/marketplaces-connect.md) | نافذة ربط نون |
| `merchant/13-channels-operations/marketplaces-connect-3` | [ربط أمازون ونون](merchant/13-channels-operations/marketplaces-connect.md) | الإعدادات ومعاينة السعر |
| `merchant/13-channels-operations/marketplaces-listings-1` | [قوائم الأسواق](merchant/13-channels-operations/marketplaces-listings.md) | جدول القوائم |
| `merchant/13-channels-operations/marketplaces-listings-2` | [قوائم الأسواق](merchant/13-channels-operations/marketplaces-listings.md) | نافذة الدفع |
| `merchant/13-channels-operations/marketplaces-jobs-orders-1` | [مهام الأسواق وطلباتها](merchant/13-channels-operations/marketplaces-jobs-orders.md) | مهام المزامنة |
| `merchant/13-channels-operations/marketplaces-jobs-orders-2` | [مهام الأسواق وطلباتها](merchant/13-channels-operations/marketplaces-jobs-orders.md) | طلبات الأسواق |
| `merchant/13-channels-operations/dropshipping-suppliers-1` | [ربط الموردين](merchant/13-channels-operations/dropshipping-suppliers.md) | صفحة الموردين |
| `merchant/13-channels-operations/dropshipping-suppliers-2` | [ربط الموردين](merchant/13-channels-operations/dropshipping-suppliers.md) | نموذج الربط |
| `merchant/13-channels-operations/dropshipping-suppliers-3` | [ربط الموردين](merchant/13-channels-operations/dropshipping-suppliers.md) | إعدادات المورد |
| `merchant/13-channels-operations/dropshipping-catalog-1` | [كتالوج المورد](merchant/13-channels-operations/dropshipping-catalog.md) | الكتالوج |
| `merchant/13-channels-operations/dropshipping-pricing-1` | [قواعد التسعير](merchant/13-channels-operations/dropshipping-pricing.md) | النموذج والمحاكاة |
| `merchant/13-channels-operations/dropshipping-pricing-2` | [قواعد التسعير](merchant/13-channels-operations/dropshipping-pricing.md) | نافذة التطبيق |
| `merchant/13-channels-operations/dropshipping-feeds-1` | [ملفات الدروبشيبينغ](merchant/13-channels-operations/dropshipping-feeds.md) | قائمة الملفات |
| `merchant/13-channels-operations/dropshipping-feeds-2` | [ملفات الدروبشيبينغ](merchant/13-channels-operations/dropshipping-feeds.md) | ربط الأعمدة |
| `merchant/13-channels-operations/dropshipping-feeds-3` | [ملفات الدروبشيبينغ](merchant/13-channels-operations/dropshipping-feeds.md) | المعاينة |
| `merchant/13-channels-operations/dropshipping-feeds-4` | [ملفات الدروبشيبينغ](merchant/13-channels-operations/dropshipping-feeds.md) | جدولة الرابط |
| `merchant/13-channels-operations/dropshipping-orders-jobs-1` | [طلبات الموردين ومهامهم](merchant/13-channels-operations/dropshipping-orders-jobs.md) | طلبات الموردين |
| `merchant/13-channels-operations/dropshipping-orders-jobs-2` | [طلبات الموردين ومهامهم](merchant/13-channels-operations/dropshipping-orders-jobs.md) | مهام المزامنة |
| `merchant/13-channels-operations/pos-open-shift-1` | [فتح وردية نقطة البيع](merchant/13-channels-operations/pos-open-shift.md) | اختيار الجهاز |
| `merchant/13-channels-operations/pos-open-shift-2` | [فتح وردية نقطة البيع](merchant/13-channels-operations/pos-open-shift.md) | الرصيد الافتتاحي |
| `merchant/13-channels-operations/pos-sell-1` | [البيع والإيصالات](merchant/13-channels-operations/pos-sell.md) | شبكة المنتجات |
| `merchant/13-channels-operations/pos-sell-2` | [البيع والإيصالات](merchant/13-channels-operations/pos-sell.md) | السلة والدفع |
| `merchant/13-channels-operations/pos-sell-3` | [البيع والإيصالات](merchant/13-channels-operations/pos-sell.md) | إيصال البيع |
| `merchant/13-channels-operations/pos-sell-4` | [البيع والإيصالات](merchant/13-channels-operations/pos-sell.md) | إيصالات الوردية |
| `merchant/13-channels-operations/pos-discounts-1` | [الخصومات واعتمادها](merchant/13-channels-operations/pos-discounts.md) | تجاوز الحد |
| `merchant/13-channels-operations/pos-discounts-2` | [الخصومات واعتمادها](merchant/13-channels-operations/pos-discounts.md) | طلب اعتماد |
| `merchant/13-channels-operations/pos-refunds-1` | [الاسترجاع](merchant/13-channels-operations/pos-refunds.md) | لوحة الاسترجاع |
| `merchant/13-channels-operations/pos-refunds-2` | [الاسترجاع](merchant/13-channels-operations/pos-refunds.md) | رمز التحقق |
| `merchant/13-channels-operations/pos-close-shift-1` | [درج الكاش وإغلاق الوردية](merchant/13-channels-operations/pos-close-shift.md) | درج الكاش |
| `merchant/13-channels-operations/pos-close-shift-2` | [درج الكاش وإغلاق الوردية](merchant/13-channels-operations/pos-close-shift.md) | معاينة الإغلاق |
| `merchant/13-channels-operations/pos-close-shift-3` | [درج الكاش وإغلاق الوردية](merchant/13-channels-operations/pos-close-shift.md) | نتيجة العجز |
| `merchant/13-channels-operations/bookings-services-1` | [الخدمات وساعات التوفر](merchant/13-channels-operations/bookings-services.md) | قائمة الخدمات |
| `merchant/13-channels-operations/bookings-services-2` | [الخدمات وساعات التوفر](merchant/13-channels-operations/bookings-services.md) | ساعات التوفر |
| `merchant/13-channels-operations/bookings-slots-1` | [تقويم الحجوزات](merchant/13-channels-operations/bookings-slots.md) | التقويم الأسبوعي |
| `merchant/13-channels-operations/bookings-slots-2` | [تقويم الحجوزات](merchant/13-channels-operations/bookings-slots.md) | تأكيد الإلغاء |

<!-- Step 14 — the 16 entries for domains 01 and 02 are registered in shots.json but were NOT captured in step 14 (no shell on the device). Run `npx tsx scripts/guide-screenshots.ts --only merchant/01` and `--only merchant/02` in mock mode, then check each image. -->
<!-- Step 15 — the 8 buyer/05-storefront entries are registered but NOT captured (no shell on the device). Run `npx tsx scripts/guide-screenshots.ts --only buyer/05` in mock mode. order-success-1 and track-order-1 place a COD order with the mock OTP 123456. Left open: product-page bundle and service (fixture ids unknown), the place-order changed-items warning (no storefront recipe), and the pickup tracking card (needs a merchant-prepared Fulfillment). -->
<!-- Step 16 — 4 more buyer/05-storefront entries are registered but NOT captured (no shell on the device). app-and-notifications-1 places a COD order (mock OTP 123456) and needs a VAPID key in the mock; reviews-2 needs an about page for the noor fixture. Left open: the install bar (beforeinstallprompt / iOS user agent), back-in-stock (sold-out fixture id), book-appointment and auction-bidding (fixture ids in src/mocks/product-extras), wallet-and-points 1–2 (fixture phones with balance / points). -->
<!-- Step 29 — 19 merchant/03-catalog entries are registered but NOT captured (no shell on the device). Run `npx tsx scripts/guide-screenshots.ts --only merchant/03` in mock mode. Fixture ids from src/mocks/catalog/seed.ts (1001 + row index): 1013 «ساعة ذكية» (serials), 1017 «خاتم فضة» (personalization), 1018 «مسبحة كهرمان» (auction), 1035 «تمر سكري فاخر 1كغ» (tiers), 1043 «زعفران» (formula), 1044 «طقم فناجين» (bundle). serials-and-formula-1 fills the paste box only (nothing is saved). Left open: import-products-2 and -3 (the pipeline has no file-upload step), export-products-2 (the CSV opened in Excel — outside the browser). -->
<!-- Step 30 — 15 merchant/04-orders-returns entries are registered but NOT captured (no shell on the device). Run `npx tsx scripts/guide-screenshots.ts --only merchant/04` in mock mode. Fixture ids: orders 10_480 - i (10480 is the newest, «جديد»); payment-review-1 and refunds-1 open the first row of a status-filtered list because the older statuses are shuffled; return 5001 is «مطلوب» with cash; RMA-804 is «بانتظار الفحص» (src/mocks/returns/state.ts). refunds-2, returns-* and rma-* need the plan feature refunds. Left open: a scan result line (the pipeline has no Enter-key step) and the return conflict panel. -->
<!-- Step 31 — 18 entries (merchant/06-customers-wallets, merchant/08-finance) are registered but NOT captured (no shell on the device). Run `npx tsx scripts/guide-screenshots.ts --only merchant/06` and `--only merchant/08` in mock mode. Fixtures: 967770841802 (M42 demo shopper, src/mocks/customers/state.ts DEMO_PHONE), 967770000099 (RISKY_PHONE, COD disabled), customer wallet 1 (wallet 7 is inactive, src/mocks/wallets/state.ts). No dialog is confirmed, so no fixture state changes. Left open: a customer profile per tab beyond reviews (the roadmap asks for each tab), the gateway credential form on mobile (page route /dashboard/payments/gateways/<code>), and the withdrawal confirm dialog. -->
<!-- Step 32 — 23 merchant/07-marketing-design-partners entries are registered but NOT captured (the device shell was unavailable; files were staged, written in the cloud workspace and committed back). Run `npx tsx scripts/guide-screenshots.ts --only merchant/07` in mock mode. Fixtures: offer 1 «البخور 3 بـ 2» (buy X get Y), campaign 3 (scheduled), influencer 7 «سارة المؤثرة» with coupon SARA20 (src/mocks/marketing/state.ts, src/mocks/affiliates/state.ts). sections-2 adds a draft slider and never publishes; abandoned-carts-2 and affiliates-2 open dialogs without confirming, so no fixture state changes. affiliates-2 needs an affiliate with pending sales — the seed is random-but-seeded, check id 1 first. Left open: the theme conflict banner (needs a two-session recipe, `?simulateConflict=1` exists in the editor), the announcement section of «الإعدادات», and the mobile design drawer. -->
<!-- Step 33 — 22 merchant/10-inventory-locations-procurement entries are registered but NOT captured (the device shell was unavailable; files were staged, written in the cloud workspace and committed back). Run `npx tsx scripts/guide-screenshots.ts --only merchant/10` in mock mode. Fixtures: locations 1 «المستودع الرئيسي» and 2 «فرع الرياض» (src/mocks/locations/state.ts, mode on for noor), POs 1–7 draft, 8–13 pending, 14–21 approved, 22–27 partially received, 28–36 received, 37–40 cancelled (src/mocks/procurement/state.ts); supplier 1. No dialog is confirmed and nothing is saved. Check before trusting: multi-location-mode-1 uses the empty store `shop` (the multi_location plan feature must be on there), multi-location-mode-2 uses text selectors for the save/confirm buttons, writeoffs-2 needs staff_rbac and a pending write-off in the mock. -->
<!-- Step 34 — 29 entries are registered but NOT captured (the device shell was unavailable; files were staged, written in the cloud workspace and committed back): 22 merchant/11-shipping (session merchant) and 7 courier/11-shipping (mobile only; session staff = سارة الحربي #2 linked to agent 1, and manager = منى القحطاني #4 for the no-profile screen). Run `npx tsx scripts/guide-screenshots.ts --only merchant/11` and `--only courier/11` in mock mode. Fixtures: delivery method 1 is the official «شروة شيب» method, provider 1 is agent 1, waybill 716 is a master with children 717–718, courier shipment 710 is in transit with COD (src/mocks/shipping/state.ts, sharwa-ship.ts). No dialog is confirmed, nothing is issued, sent or saved. Check before trusting: address-and-convert-to-pickup-1 needs an in-transit row in the flagged tab (else switch to the out-of-order tab), the courier pages need the `/agent` route group to accept the staff mock cookie on the noor host, and a mock heavy order is refused instead of split (no split screenshot). -->
<!-- Step 35 — 25 merchant/12-settings-staff-integrations entries are registered but NOT captured (the device shell was unavailable; files were staged, written in the cloud workspace and committed back). Run `npx tsx scripts/guide-screenshots.ts --only merchant/12` in mock mode (excluding the step-10 permissions-matrix entries, already listed). Fixtures: staff #2 سارة الحربي (src/mocks/staff/state.ts), webhook endpoint 1 and a custom domain in src/mocks/integrations/. Nothing is saved except staff-members-3, which creates one fixture member (phone 0771999001) — run it last or reset mocks. Check before trusting: roles/new?from=3 assumes role 3 exists, custom-domain-1 needs a custom domain in the noor fixture, webhooks-3 needs endpoint 1, and no auto-saved settings field is typed into. -->
<!-- Step 36 — 5 merchant/15-reports entries are registered but NOT captured (the device shell was unavailable; files were staged, written in the cloud workspace and committed back). Run `npx tsx scripts/guide-screenshots.ts --only merchant/15` in mock mode. reports-overview-2 needs multi-location on in the noor mock (the «الموقع» select only renders when has_locations is true); browser-notifications-1 shows the form only for the owner session and is disabled with 0 mock subscribers. Nothing is created: the schedule dialog is opened, not submitted. Mock report and category titles differ from Django (m25 §8.2); the guides use the Django titles. -->
<!-- Step 47 — 24 entries are registered but NOT captured (the device shell was unavailable; files were staged, written in the cloud workspace and committed back): 3 merchant/09-b2b, 14 merchant/14-apps-ai-support, 7 sharwa-pay/08-finance (mobile only, platform origin host ""). Run `npx tsx scripts/guide-screenshots.ts --only merchant/09`, `--only merchant/14` and `--only sharwa-pay/08` in mock mode. create-draft-1 uses the manager session (a staff session, so the owner notice is absent). The Sharwa Pay shots sign in with the fake local number 0770000111 and the mock OTP 123456 (src/mocks/sharwa-pay/state.ts MOCK_PAY_OTP); pick a fixture phone that has a wallet and movements for wallet-and-transactions-1/2 and topup-and-withdraw-3. sharwa-ai-pairing-1 (connecting) and -3 (error) need a fixture state or a recipe; app-store-2 and whatsapp-app-1/2 need whatsapp_bot installed and active in the noor fixture. Nothing is submitted in any shot. -->
<!-- Step 48 — 23 merchant/13-channels-operations entries are registered but NOT captured (the device shell was unavailable; files were staged, written in the cloud workspace and committed back). Run `npx tsx scripts/guide-screenshots.ts --only merchant/13` in mock mode (session merchant = owner; the channels settings pages are owner-only). Fixture ids from src/mocks/inbox, marketplaces and dropshipping state.ts: conversation 1 (ريم الأحمد), Amazon connected / Noon not, CJ connected / مخازن not. inbox-2 sends a product card in the mock; chat-to-order-1, marketplaces-listings-2 and dropshipping-pricing-2 open dialogs without confirming. The `jobs-table`, `listings-table`, `market-orders-table`, `catalog-table` and `sync-products` selectors are DataTable `testId` props — check the rendered attribute before the first run. -->

<!-- Step 49 — 23 merchant/13-channels-operations entries are registered but NOT captured (the device shell was unavailable; files were staged, written in the cloud workspace and committed back). Run `npx tsx scripts/guide-screenshots.ts --only merchant/13` in mock mode. Sessions: dropshipping and bookings use merchant (owner); POS uses staff («كاشير», location 2, register «كاشير 1») and manager («مدير المتجر», location 3, register «الكاشير الرئيسي»). The POS steps reopen a shift in every shot because the mock state is per browser run. Selectors taken from the components' data-testid; `supplier-orders-table`, `drop-jobs-table` and `pos-cart-discount` are DataTable/Field props — check the rendered attribute (and whether the discount input is nested) before the first run. pos-refunds-1/2 need a sale above the 200 refund threshold: raise the line quantity if one product is cheaper. The manager's «ورديات بانتظار اعتمادك» list has no mock seed, so it is not pictured. -->

<!-- Step 52 (DOC-534) — docs/_tools/check_links.py lists 279 image references in the guides with no file yet: 256 are registered in shots.json (run the pipeline above), 23 are NOT in the manifest and need a manual capture: the 20 console/16-platform-console images (the pipeline has no console session type — Session is merchant | staff | manager) and merchant/03-catalog import-products-2, import-products-3, export-products-2 (file upload / Excel, outside the browser). Each of the 23 carries a `<!-- capture: … -->` comment with the exact screen. -->

## 8. متى تُعاد الصور؟

- **عند كل تغيير في التصميم أو في نص شاشة** يظهر في صورة: أعد تشغيل الخادم ثم شغّل الأمر كاملاً، وراجع الفرق في `git status` قبل الحفظ.
- **عند تغيير البيانات التجريبية** التي تظهر في صورة.
- قبل التحقق النهائي للأدلة (DOC-531) يُشغَّل الأمر كاملاً مرة واحدة.
- لا تحرّر صورة يدوياً ولا تضف صورة غير مسجّلة في `shots.json`: الصورة التي لا يعيدها الأمر تتقادم بصمت.

## 9. حدود يجب معرفتها

> **قيد معروف:** البيانات التجريبية تعرض المبالغ دائماً بخانتين عشريتين وتضع رمز الدولار بعد الرقم («100.00 ر.س»، «26.67 $»، «14,000.00 ر.ي»). الخادم الحقيقي يكتب «100 ر.س» و«$26.67» و«14,000 ر.ي». الصور تُظهر صيغة البيانات التجريبية؛ نص الدليل يكتب صيغة الخادم ([دليل الأسلوب §6](_style-guide.md#6-المال-والأرقام-والتواريخ)).
<!-- ⚠️ Discrepancy — mock `displayMoney()` (src/mocks/_fixtures.ts:98) claims to mirror Django `format_money()` / it always prints two decimals and a trailing `$`; Django drops decimals on whole amounts, prefixes `$`, rounds YER to an integer (products/models/base.py:75-93). Reported in step 10. -->

> **قيد معروف:** أسماء الصلاحيات وعدد صلاحيات الأدوار في الصور من البيانات التجريبية، وتختلف عن متجر حقيقي. مثلاً تُظهر الصورة «مدير المتجر» بـ «36 من 36 صلاحية» وصلاحية باسم «حذف الطلبات»، بينما الخادم يمنح «مدير المتجر» 29 صلاحية ويسمّي الصلاحية «حذف طلب». في نص الدليل اعتمد أسماء الخادم ([من يستطيع ماذا](merchant/12-settings-staff-integrations/permissions-matrix.md)).
<!-- ⚠️ Discrepancy — mock roles/permissions (src/mocks/staff/state.ts) show «مدير المتجر» with all 36 keys and paraphrased key names / Django seeds 29 keys to the manager roles (products/migrations/0144, 0159, 0182–0235) and names them as in the seeds. Reported in step 10. -->

<!-- ⚠️ Discrepancy — roadmap says reuse the `scripts/*-check.ts` Playwright scripts to capture guide images / those scripts assert behaviour, change mock state on every run and write into `docs/visual-checks/` (design evidence that README §5.4 says guides must not link). The pipeline is a separate manifest-driven script that reuses their conventions (mock session cookie, store hosts, `requireMocks()`, `caret: "initial"`, `SHARWA_CHROMIUM`) and one of their flows as a recipe. Reported in step 10. -->

## صفحات ذات صلة

- [دليل أسلوب أدلة المستخدم](_style-guide.md)
- [صور الأدلة](_assets/README.md)
- [بوابات الجودة ونصوص الفحص التجريبي للواجهة](../ops/testing/frontend-qa.md)

</div>
