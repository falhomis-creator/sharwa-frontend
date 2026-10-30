<!--
TEMPLATE — Track 2 user guide (Arabic, RTL). Copy to docs/guides/<audience>/NN-<slug>/<page>.md
(audience = merchant | buyer | courier | sharwa-pay | console).
Rules: UI labels and messages exactly as on screen, in «…», copied from the code; one term per
concept (docs/glossary.md); Western digits; money exactly as displayed; fixture data only in
examples and screenshots; screenshots in docs/guides/_assets/<audience>/<NN-slug>/<page>-<n>.png
captured in mock mode (SHARWA_LIVE_MODULES=none). Keep the blank line after <div dir="rtl">.
Delete these comments and any section that does not apply.
-->

<div dir="rtl">

# <عنوان المهمة بصيغة فعل، مثل: إضافة منتج جديد>

> **المصدر**: DOC-XXX · INT-0xx (MXX) · آخر مراجعة على الكود: YYYY-MM-DD (الخطوة NN)

## لمن هذه الصفحة؟

| | |
|---|---|
| **الجمهور** | مالك المتجر / «مدير المتجر» / «مدير الفرع» / «كاشير» / «أمين مخزن» / زائر المتجر / المندوب / عميل شروة باي / «مالك المنصة» / «مشرف تشغيلي» |
| **الصلاحية المطلوبة** | `orders.view` — يملكها افتراضياً: «مدير المتجر»، «مدير الفرع» … (مالك المتجر يملك كل الصلاحيات) |
| **ميزة الباقة** | `<feature_code>` — إن لم تكن مفعّلة تظهر: «…» |
| **لمالك المتجر فقط؟** | نعم / لا |
| **مكانها** | القائمة الجانبية ← «…» ← «…» (`/dashboard/<path>`) |

## قبل أن تبدأ

المتطلبات المسبقة، مثل: ربط قناة أو تفعيل تعدد المواقع أو وجود وردية مفتوحة.

## الخطوات

1. افتح «…».
2. اضغط «…».
3. …

![وصف اللقطة](../../_assets/<audience>/<NN-slug>/<page>-1.png) <!-- capture: /dashboard/<path>, desktop 1440, mock mode -->

## الحقول

| الحقل | إلزامي؟ | القيود | ملاحظات |
|---|---|---|---|

## ما يحدث بعد ذلك

ما يجري في الخلفية ويهمّ المستخدم، مثل: «يُخصم مبلغ السحب فوراً ويُعاد إن رُفض الطلب».

## الرسائل التي قد تظهر لك

| الرسالة | السبب | ماذا تفعل |
|---|---|---|
| «…» | | |

## حدود يجب معرفتها

الأعداد والأحجام والمؤقتات وفترات القفل، مثل: «3 محاولات خلال 10 دقائق».

## قيود معروفة

ما لم يُبنَ بعد (إن وُجد)، بلغة المستخدم.

## صفحات ذات صلة

- [عنوان](../NN-<slug>/<page>.md)

</div>
