# M27 — صندوق المحادثات الموحَّد وقنوات التواصل (Unified Inbox & Social Channels)

**Route group**: `(dashboard)` · **Priority**: P3 · **Backend status**: HTML-only `[NEEDS BACKEND]` + poll JSON (`channel_inbox_*`); OAuth Meta/TikTok و`telegram_connect` HTML
**Discovery refs**: `02-products-domain-model.md` §14.A (Conversation, Message, ConversationKeywordTrigger, ChannelCatalogSync, ChannelCategoryMapping, ChannelProductLink, ChannelOrderRoutingSettings, ChannelOrderLink, StaffChannelAccess), §10 (صلاحية `channels.inbox.access`) · `01-tenants-dashboard-admin.md` §3.2 (Social channels), §4 («المحادثات» + شارة غير المقروء، «التواصل الاجتماعي والمحادثات»), §7 (ميزة `social_channels`), §2.1 (`ChannelSessionIndex`) · `03-*.md` §6 (webhooks meta/tiktok-shop/telegram، `META_APP_ID`, `TIKTOK_APP_KEY`) · **Benchmarks**: Intercom Inbox (ثلاثة أعمدة: قوائم/محادثة/سياق العميل — بنسخة مقتضبة)، Linear (فلاتر وحالات بلوحة المفاتيح، كثافة عالية)

## 1. الهدف (Purpose)

جمع محادثات فيسبوك/إنستغرام وتيك توك شوب وتيليجرام في صندوق واحد يردّ منه الموظفون ويحوّلون المحادثة إلى طلب، مع مزامنة الكتالوج إلى القنوات وردود آلية بالكلمات المفتاحية. يُقاس بزمن أول ردّ وبنسبة المحادثات المحوَّلة إلى طلبات.

## 2. الفاعلون (Actors)

- **مالك المتجر**: يربط/يفصل القنوات، يضبط مزامنة الكتالوج وربط الفئات، يُدير القوالب والمحفّزات ووصول الموظفين.
- **موظف بصلاحية `channels.inbox.access`** مع `StaffChannelAccess` (`can_view` / `can_reply`): يقرأ ويردّ ويُسند ويحوّل إلى طلب.
- **العميل** (على القناة): يرسل رسائل ووسائط.
- **البوت**: يردّ عبر `ConversationKeywordTrigger`.
- **النظام**: يستقبل webhooks ويحدّث حالات الرسائل.

## 3. قصص المستخدم (User Stories)

### US-27.1 — ربط القنوات (P1)
يربط التاجر صفحة Meta (FB/IG) عبر OAuth، وحساب TikTok Shop عبر OAuth، وبوت تيليجرام بالتوكن، ويرى حالة كل قناة ويفصلها عند الحاجة.
**Independent Test**: صفحة القنوات تعرض ثلاث صفوف بحالة (غير مربوط/مربوط باسم الحساب/خطأ) وزر مناسب لكل حالة.
**Acceptance**:
1. **Given** قناة غير مربوطة، **When** يُضغط «ربط»، **Then** يُحوَّل إلى مسار OAuth الخادمي ويعود إلى الصفحة بحالة محدَّثة ورسالة Sonner.
2. **Given** تيليجرام، **When** يُدخل التوكن ويُحفظ، **Then** يُعرض اسم البوت ورابطه؛ التوكن لا يُعرض مجدداً.
3. **Given** قناة مربوطة، **When** يُضغط «فصل»، **Then** يُطلب تأكيد يوضّح أثره على المحادثات المفتوحة.

### US-27.2 — صندوق المحادثات (P1)
يرى الموظف قائمة المحادثات مفلترة بالحالة والقناة والمُسنَد إليه وغير المقروء، يفتح محادثة فيرى الرسائل بالاتجاه والمرسِل والحالة، ويردّ نصاً أو بقالب أو بمنتج.
**Independent Test**: فتح محادثة بـ `unread_count=3` يُصفّر العدّاد في القائمة وفي شارة الشريط خلال دورة الاستطلاع التالية.
**Acceptance**:
1. **Given** 100 محادثة، **When** يُفتح الصندوق، **Then** عمود القائمة (اسم/معرّف الاتصال، القناة كنص مختصر، آخر رسالة، الوقت النسبي، عدّاد Mono) وعمود المحادثة وعمود السياق (الطلب المرتبط، بيانات الاتصال).
2. **Given** رسالة صادرة، **Then** تُعرض حالتها نصاً صغيراً: مُرسَلة · تم التوصيل · مقروءة · فشلت (مع زر إعادة المحاولة للفاشلة).
3. **Given** موظف `can_view` بلا `can_reply`, **Then** حقل الردّ مُعطَّل مع تلميح.
4. **Given** محادثة مفتوحة، **When** تصل رسالة جديدة، **Then** تظهر خلال ≤ 5 ثوانٍ (استطلاع) بلا قفز في التمرير إن كان المستخدم يقرأ الأعلى.
5. **Given** رسالة بوسائط (صورة/ملف)، **Then** تُعرض معاينة بحد 1px مع فتح مكبَّر؛ إرسال وسائط حسب ما يسمح الخادم.

### US-27.3 — إسناد وحالة وتحويل إلى طلب (P1)
يُسند الموظف المحادثة لزميل، يغيّر حالتها (`open` · `pending` · `resolved`)، ويحوّلها إلى طلب بعناصر وعنوان مأخوذَين من السياق.
**Acceptance**:
1. **Given** محادثة `open`, **When** يُضغط «تحويل إلى طلب»، **Then** يُفتح نموذج طلب (M06 يدوي) مُعبَّأ بالاسم/الهاتف إن وُجدا، وبعد الحفظ يظهر رقم الطلب في عمود السياق (`ChannelOrderLink`).
2. **Given** `resolved`, **When** تصل رسالة جديدة، **Then** تعود `open` (سلوك الخادم) وتُعرض في «المفتوحة».

### US-27.4 — المحفّزات بالكلمات المفتاحية والقوالب (P2)
يُعرّف التاجر كلمات (`contains` / `exact`) وردّاً (`text` / `product_card` / `catalog_link`)، وقوالب ردود جاهزة للموظفين.
**Acceptance**:
1. **Given** محفّز `exact: "الأسعار"` → `catalog_link`, **When** يُحفظ، **Then** يظهر في الجدول مع نوع المطابقة ونوع الردّ ومفتاح تفعيل.
2. **Given** قالب ردّ، **When** يُختار من حقل الردّ بـ`/`, **Then** يُدرج نصه قابلاً للتعديل قبل الإرسال.

### US-27.5 — مزامنة الكتالوج وربط الفئات (P2)
يختار التاجر لكل قناة: كل المنتجات أو فئات محددة، تعديل سعر بنسبة، درع مخزون، ويرى حالة كل منتج على القناة؛ لتيك توك يربط فئات متجره بفئات المنصة.
**Acceptance**:
1. **Given** `selected_categories`, **When** تُحفظ ثلاث فئات، **Then** تُعرض كشارات قابلة للإزالة ويُعرض عدد المنتجات المشمولة من الخادم.
2. **Given** جدول حالة المنتجات، **Then** الحالات: `pending` · `synced` · `error` (مع الرسالة) · `hidden_out_of_stock`، مع فلتر وزر «إعادة المزامنة».

### US-27.6 — وصول الموظفين للقنوات (P2)
يحدّد التاجر لكل موظف وقناة: عرض / ردّ.
**Acceptance**:
1. **Given** مصفوفة موظفون × قنوات، **When** تُبدَّل خانة، **Then** تُحفظ فوراً (autosave) مع تأكيد Sonner.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-27.01**: الوحدة MUST تُخفى حين تكون ميزة `social_channels` معطّلة؛ الصندوق يظهر لمن يحمل `channels.inbox.access` فقط، والإعدادات لمالك المتجر.
- **FR-27.02**: الصندوق MUST يكون تخطيط 3 أعمدة على الديسكتوب (قائمة 320px · محادثة · سياق 280px) وعمود واحد بتنقّل متدرّج على الجوال.
- **FR-27.03**: الفلاتر (`status`, `channel_code`, `assigned_staff`, `unread`, `q`) والمحادثة المفتوحة MUST تعيش في الرابط.
- **FR-27.04**: التحديث MUST يكون باستطلاع كل 5 ثوانٍ للمحادثة المفتوحة وكل 15 ثانية للقائمة وشارة غير المقروء، مع إيقافه حين يكون التبويب مخفياً.
- **FR-27.05**: الرسائل MUST تُعرض بالاتجاه (`inbound` بداية، `outbound` نهاية) والمرسِل (`customer` · `staff` باسمه · `bot`) والحالة؛ يُمنع تلوين الفقاعات بألوان brand؛ حدود 1px وخلفية `muted` للصادر.
- **FR-27.06**: إرسال الردّ MUST يُظهر الرسالة تفاؤلياً بحالة «جارٍ الإرسال» ثم يُحدَّث من الخادم؛ الفشل يُبقي النص للمحاولة مجدداً.
- **FR-27.07**: حقل الردّ MUST يدعم: نص متعدد الأسطر (`Enter` إرسال، `Shift+Enter` سطر)، إدراج قالب بـ`/`، إرفاق منتج كـ `product_card`.
- **FR-27.08**: التوكنات والأسرار MUST لا تُعرض بعد الحفظ؛ الواجهة تعرض حالة الربط فقط.
- **FR-27.09**: مزامنة الكتالوج MUST تعرض معاينة الأثر (عدد المنتجات) قبل التشغيل وتقريراً بعده بالحالات الأربع.
- **FR-27.10**: شارة «المحادثات» في الشريط MUST تعرض مجموع `unread_count` للمحادثات التي يملك الموظف `can_view` عليها.

## 5. الكيانات والحالات (Key Entities & States)

- **Channel connection**: `channel_code` (Meta FB/IG · TikTok Shop · Telegram) بحالة ربط، معرّف خارجي (`ChannelSessionIndex`).
- **Conversation**: `channel_code`, `external_contact_id`, `assigned_staff`, `unread_count`, `order`, `status`: `open` مفتوحة · `pending` معلّقة · `resolved` محلولة.
- **Message**: `direction` `inbound` واردة · `outbound` صادرة؛ `sender_type` `customer` · `staff` · `bot`؛ `status` `sent` مُرسَلة · `delivered` تم التوصيل · `read` مقروءة · `failed` فشلت؛ وسائط.
- **ConversationKeywordTrigger**: مطابقة `contains` يحتوي · `exact` مطابق؛ ردّ `text` نص · `product_card` بطاقة منتج · `catalog_link` رابط الكتالوج.
- **ChannelCatalogSync**: نطاق `all` · `selected_categories`؛ `price_adjustment_percent`, `stock_shield_enabled`. **ChannelCategoryMapping** (تيك توك). **ChannelProductLink.sync_status**: `pending` · `synced` · `error` · `hidden_out_of_stock`.
- **ChannelOrderRoutingSettings**, **ChannelOrderLink** (محادثة ↔ طلب). **StaffChannelAccess**: `can_view`, `can_reply`. قوالب الرسائل.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/inbox` (3 أعمدة؛ `?c=<id>` للمحادثة) · `/dashboard/channels` (القنوات وحالة الربط) · `/dashboard/channels/catalog` (مزامنة + جدول حالة المنتجات) · `/dashboard/channels/tiktok/categories` (ربط الفئات) · `/dashboard/channels/keywords` · `/dashboard/channels/templates` · `/dashboard/channels/staff-access`.
- **الحالات البصرية**: skeleton قائمة/رسائل · فراغ «لا محادثات — اربط قناة لتبدأ» مع رابط القنوات · «لا محادثات تطابق الفلاتر» · خطأ استطلاع (شريط هادئ «انقطع التحديث — إعادة المحاولة») · بلا صلاحية · الميزة معطّلة · قناة بخطأ ربط (نص الخطأ من الخادم وزر «إعادة الربط»).
- **الجوال**: قائمة → محادثة (صفحة كاملة، زر رجوع منعكس) → السياق في ورقة سفلية؛ حقل الردّ ثابت أسفل.
- **اختصارات**: `J/K` بين المحادثات · `E` حلّ · `A` إسناد · `O` تحويل إلى طلب · `/` قالب · `⌘K` بحث اتصال/هاتف.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| حالة القنوات | `social_channels_hub` HTML | `[NEEDS BACKEND]` → `GET /api/v1/channels/` → `[{channel_code, connected, account_name, error, connected_at}]` |
| بدء OAuth Meta/TikTok | مسارات OAuth HTML | Ready كمسارات تحويل خادمية (تُفتح بالمتصفح وتعود إلى `/dashboard/channels`) |
| ربط/فصل تيليجرام | `telegram_connect` POST | `[NEEDS BACKEND]` → `POST /api/v1/channels/telegram/connect/` `{bot_token}` → `{bot_username}`؛ `POST /api/v1/channels/<code>/disconnect/` |
| قائمة المحادثات | `channel_inbox_list` HTML + poll JSON | `[NEEDS BACKEND]` → `GET /api/v1/inbox/conversations/?status&channel&assigned&unread&q&page` → `{count, results:[{id, channel_code, contact_name, external_contact_id, last_message_preview, last_message_at, unread_count, status, assigned_staff:{id,name}, order_id}]}` |
| رسائل محادثة + استطلاع | `channel_inbox_detail` + poll JSON | Ready جزئياً (poll) → `GET /api/v1/inbox/conversations/<id>/messages/?after=<id>` → `[{id, direction, sender_type, sender_name, text, media:[{url,type}], status, created_at}]` |
| إرسال ردّ | `channel_inbox_*` POST | `[NEEDS BACKEND]` → `POST /api/v1/inbox/conversations/<id>/messages/` `{text?, template_id?, product_id?, client_id}` |
| إسناد / حالة / تعليم مقروء | — | `[NEEDS BACKEND]` → `PATCH /api/v1/inbox/conversations/<id>/` `{status?, assigned_staff_id?, mark_read?}` |
| تحويل إلى طلب | `convert_conversation_to_order` POST | `[NEEDS BACKEND]` → `POST /api/v1/inbox/conversations/<id>/convert-to-order/` → `{order_id}` (أو تمرير السياق إلى `POST /api/v1/orders/` M06) |
| المحفّزات CRUD | `channel_keywords_*` | `[NEEDS BACKEND]` → `GET/POST /api/v1/channels/keywords/`, `PATCH/DELETE /<id>/` |
| القوالب CRUD | templates views | `[NEEDS BACKEND]` → `GET/POST /api/v1/channels/templates/`, `PATCH/DELETE /<id>/` |
| مزامنة الكتالوج + حالة المنتجات | catalog settings/sync views | `[NEEDS BACKEND]` → `GET/PUT /api/v1/channels/<code>/catalog-sync/` `{scope, category_ids, price_adjustment_percent, stock_shield_enabled}`؛ `POST /run/`؛ `GET /api/v1/channels/<code>/products/?sync_status` |
| ربط فئات تيك توك | `tiktok_category_mapping` | `[NEEDS BACKEND]` → `GET/PUT /api/v1/channels/tiktok/category-mapping/` `[{category_id, external_category_id}]` |
| وصول الموظفين | `channel_staff_access` | `[NEEDS BACKEND]` → `GET/PUT /api/v1/channels/staff-access/` `[{staff_id, channel_code, can_view, can_reply}]` |
| عدّاد غير المقروء للشريط | ضمن sidebar context | `[NEEDS BACKEND]` → `GET /api/v1/inbox/counters/` → `{unread}` |

## 8. الحالات الحدّية (Edge Cases)

- قناة فُصلت ومحادثاتها مفتوحة: تبقى للقراءة مع شريط «القناة غير مربوطة — لا يمكن الردّ».
- رسالة `failed` بسبب نافذة الـ 24 ساعة (Meta): يُعرض سبب الخادم كما هو بلا تفسير محلي.
- موظفان يردّان معاً: الترتيب الزمني من الخادم؛ الاستطلاع يدمج بلا تكرار (بمعرّف الرسالة).
- محادثة محوَّلة لطلب أُلغي: يبقى الربط ويُعرض وضع الطلب.
- وسائط كبيرة أو نوع غير مدعوم: رسالة تحت حقل الإرفاق قبل الرفع.
- `hidden_out_of_stock` مع درع المخزون: يُشرح بالتلميح «مخفي تلقائياً حتى يتوفر المخزون».

## 9. معايير النجاح (Success Criteria)

- **SC-27.1**: فتح المحادثة والردّ ≤ 2 نقرات؛ ظهور الرسالة الجديدة ≤ 5 ثوانٍ.
- **SC-27.2**: عدّاد غير المقروء في الشريط يطابق مجموع القائمة 100% بعد كل دورة.
- **SC-27.3**: تحويل محادثة إلى طلب ≤ 60 ثانية مع تعبئة الاسم/الهاتف تلقائياً حين يتوفران.
- **SC-27.4**: صفر أسرار (توكنات) ظاهرة في الواجهة أو الشبكة بعد الحفظ.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M03 (الشريط والشارة)، M18 (الموظفون والصلاحيات)، M06 (إنشاء الطلب)، M04/M05 (المنتجات والفئات)، M49 (مركز الإشعارات لاحقاً).
- افتراض: الاستطلاع كافٍ لهذا الإصدار؛ لا WebSocket/SSE حتى يوفّرها الخادم.
- افتراض: قوالب الرسائل كيان خادمي قائم ضمن views القوالب؛ حقوله تُؤخذ من العقد عند توفره.
- افتراض: حقول `Message` للوسائط (رابط ونوع) يوفّرها الخادم ضمن العقد.
- افتراض: Meta تمثّل FB وIG كقناة ربط واحدة مع تمييز المصدر في `channel_code`.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا فقاعات ملونة بلون brand؛ الوارد بحد 1px والصادر بخلفية `muted`؛ لا أيقونات قنوات ملونة كبيرة — اسم القناة نصاً صغيراً أو أيقونة Lucide أحادية؛ لا avatars مولَّدة بتدرجات؛ عمود السياق نصي بلا بطاقات متماثلة.
- II: الوارد يبدأ من اليمين والصادر من اليسار في RTL (منطقي start/end)؛ الأوقات والعدّادات Mono؛ زر الرجوع في الجوال منعكس؛ نص رسائل LTR (روابط/أكواد) يُعزل بـ `dir="auto"`.
- IV: لقطات `docs/visual-checks/27-inbox/{desktop,tablet,mobile,desktop-dark}.png` للصندوق (فارغ/ممتلئ)، شاشة القنوات، ومزامنة الكتالوج.
- IX: الاستطلاع عبر TanStack Query بمفاتيح مُفتاحة بالمستأجر و`refetchInterval` موقوف عند إخفاء التبويب.
