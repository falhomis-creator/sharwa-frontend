<div dir="rtl">

# حالة التكاملات في مكان واحد

> **المصدر**: DOC-397 · INT-023 (M19) · الجرد: المجال 12 · آخر مراجعة على الكود: 2026-10-28 (الخطوة 35)

«التكاملات»: «حالة كل ربط خارجي لمتجرك في مكان واحد. الإدارة تتم من صفحة كل تكامل.» الصفحة تقرأ فقط؛ لا تغيّر أي ربط. المصطلحات في [مسرد الأدلة](../../_glossary.md).

## لمن هذه الصفحة؟

| | |
|---|---|
| **الجمهور** | مالك المتجر يرى كل الصفوف؛ الموظف يرى الصفوف التي يملك صلاحيتها |
| **الصلاحية المطلوبة** | لفتح الصفحة: أي جلسة. لكل صف صلاحيته (الجدول أدناه) |
| **ميزة الباقة** | الصفحة بلا ميزة؛ لكل صف ميزته |
| **لمالك المتجر فقط؟** | لا |
| **مكانها** | «الإعدادات» ← «التكاملات» (`/dashboard/settings/integrations`)، أو القائمة الجانبية ← «الأدوات المساعدة» ← «التكاملات» |

## الصفوف الثلاثة عشر

| المجموعة | الصف | من يراه من الموظفين | ميزة الباقة | أين تديره |
|---|---|---|---|---|
| «التطبيقات» | واتساب (SharwaConnect) | `channels.inbox.access` | «متجر التطبيقات» `app_marketplace` | التطبيقات |
| «التطبيقات» | Sharwa AI | مالك المتجر وحده | «متجر التطبيقات» `app_marketplace` | التطبيقات |
| «قنوات التواصل» | Meta (فيسبوك وإنستغرام) | `channels.inbox.access` | «قنوات البيع» `social_channels` | [ربط القنوات](../13-channels-operations/connect-channels.md) |
| «قنوات التواصل» | TikTok | `channels.inbox.access` | «قنوات البيع» `social_channels` | [ربط القنوات](../13-channels-operations/connect-channels.md) |
| «قنوات التواصل» | Telegram | `channels.inbox.access` | «قنوات البيع» `social_channels` | [ربط القنوات](../13-channels-operations/connect-channels.md) |
| «الأسواق الإلكترونية» | Amazon | `channels.marketplaces.manage` | `marketplaces` | [ربط الأسواق](../13-channels-operations/marketplaces-connect.md) |
| «الأسواق الإلكترونية» | noon | `channels.marketplaces.manage` | `marketplaces` | [ربط الأسواق](../13-channels-operations/marketplaces-connect.md) |
| «موردو الدروبشيبينغ» | CJ Dropshipping | `channels.dropshipping.manage` | `dropshipping` | [موردو الدروبشيبينغ](../13-channels-operations/dropshipping-suppliers.md) |
| «موردو الدروبشيبينغ» | مخازن | `channels.dropshipping.manage` | `dropshipping` | [موردو الدروبشيبينغ](../13-channels-operations/dropshipping-suppliers.md) |
| «موردو الدروبشيبينغ» | Knawat | `channels.dropshipping.manage` | `dropshipping` | [موردو الدروبشيبينغ](../13-channels-operations/dropshipping-suppliers.md) |
| «موردو الدروبشيبينغ» | موجز ملفات (CSV/XML) | `channels.dropshipping.manage` | `dropshipping` | [موجزات الملفات](../13-channels-operations/dropshipping-feeds.md) |
| «ناقلو الشحن» | Aramex | مالك المتجر وحده | «شركات الشحن» `shipping_companies` | [الناقلون الخارجيون](../11-shipping/carriers.md) |
| «ناقلو الشحن» | SMSA Express | مالك المتجر وحده | «شركات الشحن» `shipping_companies` | [الناقلون الخارجيون](../11-shipping/carriers.md) |

زر «إدارة» في كل صف يفتح صفحة التكامل.

![صفحة «التكاملات»](../../_assets/merchant/12-settings-staff-integrations/integrations-status-1.png) <!-- capture: /dashboard/settings/integrations, desktop 1440, mock mode -->

## ما يظهر في كل صف

| ما يظهر | معناه |
|---|---|
| «مربوط» | يعمل |
| «غير مربوط» | لم يُربط بعد، أو أُوقف |
| «خطأ» | يحتاج تدخلك؛ السبب تحت الاسم |
| «غير متاح في خطتك» | الميزة خارج باقتك؛ لا يُقرأ الربط أصلاً |
| «آخر حدث (الوقت)» أو «لا أحداث» | آخر ما وصل من هذا التكامل: رسالة، أو سحب طلبات، أو مزامنة، أو حدث تتبع |

### أسباب «خطأ»

| السبب | ماذا تفعل |
|---|---|
| «أوقفته المنصة — تواصل مع دعم شروة.» | تواصل مع دعم شروة. |
| «انتهى الاشتراك — جدّده من متجر التطبيقات.» | جدّد اشتراك التطبيق. |
| «انتهت صلاحية الربط — أعد الربط من صفحة القنوات.» | أعد ربط القناة. |
| «خطأ في الاتصال.» | افتح صفحة التكامل وراجعه. |
| «تعذّر قراءة الحالة الآن.» | خطأ مؤقت في قراءة هذا الصف وحده؛ حدّث الصفحة. |
| رسالة الناقل أو المورد أو السوق | كما تظهر في صفحة ذلك التكامل. |

## الربط الصادر والتتبع

لمالك المتجر في آخر الصفحة قسم «الربط الصادر والتتبع»:

- «النطاقات»: «نطاقك الخاص وسجلات DNS.» ([ربط نطاق خاص](custom-domain.md))
- «Webhooks»: «أرسل أحداث متجرك إلى أنظمتك.» ([Webhooks](webhooks.md))
- «أدوات التتبع»: «بكسلات Meta وTikTok وSnapchat وGoogle — تُحمَّل في المتجر فقط.» ([أدوات التتبع](tracking-pixels.md))، إن كانت في باقتك.

## الرسائل التي قد تظهر لك

| الرسالة | السبب | ماذا تفعل |
|---|---|---|
| «لا تكاملات ضمن صلاحياتك» | لا تملك صلاحية أي صف | «تظهر هنا التكاملات المرتبطة بصلاحياتك (المحادثات، الأسواق، الموردون). اطلبها من مالك المتجر.» |

## حدود يجب معرفتها

- الصفحة تقرأ فقط. الربط وفكّه وإصلاحه من صفحة كل تكامل.
- صفوف Sharwa AI وAramex وSMSA Express لا تظهر لأي موظف، مهما كانت صلاحياته.
- خطأ في صف واحد لا يؤثر في الصفوف الأخرى.

<!-- ⚠️ Discrepancy — roadmap/step 27: m19 says 13 URL patterns are "owner-only" in the roadmap but integrations/status/ is open to staff (rows filtered by permission). Rows with "owner only" (sharwa_ai, aramex, smsa) are never shown to staff (can(None) false) (m19 §7.1). The «قيد التكامل» tag on this screen: see tracking-pixels.md (step 35). -->
<!-- Note — sources per row and the detail texts: m19 §7.2; unavailable rows force status disconnected and skip the source; the UI shows «غير متاح في خطتك» instead of the status. -->

## صفحات ذات صلة

- [ربط القنوات](../13-channels-operations/connect-channels.md)
- [الناقلون الخارجيون](../11-shipping/carriers.md)
- [Webhooks](webhooks.md)
- [مسرد الأدلة](../../_glossary.md)

</div>
