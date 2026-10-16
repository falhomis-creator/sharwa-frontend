# M13 — مركز التسويق (Marketing Hub: Coupons, Offers, Abandoned Carts, Campaigns, Timeline, Loyalty, Gifting)

**Route group**: `(dashboard)` · **Priority**: P2 · **Backend status**: HTML-only لكل الشاشات `[NEEDS BACKEND]`
**Discovery refs**: `02-products-domain-model.md` §5 (Coupon, PromotionalOffer, MarketingCampaign, MarketingEvent, Loyalty, GiftSettings), §4 (AbandonedCart + Settings), §15 (النماذج) · `01-tenants-dashboard-admin.md` §3.2 (Marketing views), §4 (التسويق), §7 (feature keys) · **Benchmarks**: Shopify Discounts (منشئ الخصم بشروط مركّبة، قائمة واحدة لكل أنواع الخصم)، Klaviyo (حملات بمعاينة وجمهور — بتقشّف بصري)، Linear (تقويم/جدول زمني هادئ بأشرطة رفيعة)

## 1. الهدف (Purpose)

جمع أدوات التسويق السبع في مركز واحد بحيث يُنشئ التاجر كوبوناً أو عرضاً تلقائياً أو حملة واتساب في أقل من دقيقة، ويستعيد السلات المتروكة آلياً، ويرى خطته التسويقية على جدول زمني واحد. يُقاس بعدد الكوبونات/العروض المفعّلة وبنسبة استرداد السلات المتروكة.

## 2. الفاعلون (Actors)

- **مالك المتجر**: كل الأدوات حسب مفاتيح الميزات `marketing` · `coupon` · `promotions` · `abandoned_carts` · `campaigns` · `timeline` · `loyalty_settings` · `gift_settings`.
- **موظف** بصلاحية `discounts.manage` (إنشاء/تعديل الكوبونات والعروض) أو `discounts.apply` (قراءة فقط هنا).
- **النظام**: يرصد السلات المتروكة (عتبة 2 ساعة) ويرسل التذكيرات ويعلّم `recovered`.

## 3. قصص المستخدم (User Stories)

### US-13.1 — الكوبونات (P1)
يُنشئ التاجر كوبوناً بكود ونوع خصم ونطاق تطبيق وحدود استخدام وتاريخَي بداية وانتهاء، ويرى في القائمة الاستخدام الفعلي مقابل الحد.
**Independent Test**: إنشاء كوبون `percent` 10% على `category` بحد 50 استخداماً → يظهر في القائمة بشريط استخدام `0 / 50` بخط Mono.
**Acceptance**:
1. **Given** نموذج كوبون، **When** يُختار `discount_type=percent`, **Then** يُحدَّد `discount_value` بين 1 و100؛ و`fixed` يعرض العملة بعد الرقم كما يرسلها الخادم.
2. **Given** `apply_to=category|product`, **When** يُختار، **Then** يظهر منتقي التصنيف/المنتج؛ `all` يخفيه.
3. **Given** كوبون منتهٍ (`expires_at` < الآن) أو `used_count ≥ max_uses`, **When** تُعرض القائمة، **Then** تظهر شارة نصية «منتهٍ» / «استُهلك» بلون دلالي، لا لون خلفية.
4. **Given** كوبون مرتبط بـ`influencer`, **Then** يُعرض اسم المؤثر كرابط إلى M17 ويُمنع تغيير الكود.

### US-13.2 — العروض الترويجية التلقائية (P1)
يُعرِّف التاجر عرضاً يُطبَّق آلياً في السلة: خصم، شحن مجاني، أو «اشترِ X واحصل على Y»، مع شرط وأولوية ومدة.
**Acceptance**:
1. **Given** `offer_type=buy_x_get_y`, **When** يُختار، **Then** تظهر الحقول `buy_quantity`, `buy_condition_type` (`all` · `category` · `product` · `min_items`), `buy_category`/`buy_product`, `get_product`, `get_quantity`, `get_discount_percent`؛ وتُخفى لغيره.
2. **Given** عرضان نشطان متداخلان، **When** تُعرض القائمة، **Then** تُرتَّب بـ`priority` ويظهر تلميح «الأعلى أولوية يُطبَّق أولاً».
3. **Given** عرض بصورة و`cta_text`, **Then** تُعرض معاينة مصغّرة لكيفية ظهوره في قسم `promotional_offers` بالمتجر.

### US-13.3 — السلات المتروكة والاسترداد الآلي (P1)
يرى التاجر قائمة السلات المتروكة بقيمتها وعناصرها وخطوة التذكير، ويرسل تذكيراً يدوياً أو يضبط التذكيرين الآليين.
**Acceptance**:
1. **Given** سلة `status=abandoned`, **When** تُفتح، **Then** تُعرض `customer_name`, `customer_phone`, `total_amount` (كما يرسلها الخادم), `items_count`, `last_interaction_at`, `reminder_step`, `last_reminder_sent_at`, وعناصرها من اللقطة.
2. **Given** إعدادات الاسترداد، **When** تُفتح، **Then** تظهر `is_enabled`, `min_cart_value`, قنوات `channel_whatsapp` (مفعّل) و`channel_email` و`channel_sms` معطّلتان بشارة «قريباً»، `channel_conversational_enabled`, التذكير الأول (`reminder_1_delay_hours` افتراضي 2، `reminder_1_message` بمتغيرات `{customer_name}` `{cart_url}`)، التذكير الثاني (`reminder_2_delay_hours` 24، `reminder_2_message` بـ `{discount_percent}` `{discount_code}` `{cart_url}`)، `discount_percent`, `discount_validity_hours` 24.
3. **Given** رسالة تذكير، **When** يُكتب متغير غير مدعوم، **Then** يُعلَّم محلياً بتحذير «متغير غير معروف».
4. **Given** سلة `recovered`, **Then** يُعرض رابط `recovered_order` إلى M06.

### US-13.4 — الحملات التسويقية (P2)
يُنشئ التاجر حملة بقناة وجمهور ورسالة، يعاينها ثم يرسلها الآن أو يجدولها.
**Acceptance**:
1. **Given** منتقي القناة، **Then** تظهر 6 قنوات: `sms` · `email` · `whatsapp` · `meta_social_commerce` · `tiktok_shop` · `telegram_bot`؛ القنوات غير المربوطة (M27/M30) تظهر معطّلة مع رابط «اربط القناة».
2. **Given** منتقي الجمهور، **Then** 4 خيارات: `all` الكل · `abandoned_carts` السلات المتروكة · `dormant` العملاء الخاملون · `bought_product` من اشترى منتجاً (يُظهر منتقي المنتج).
3. **Given** حملة `draft`, **When** يُضغط «معاينة الإرسال»، **Then** يُعرض عدد المستلمين المتوقع ونص الرسالة كما ستصل، ثم «إرسال الآن» أو «جدولة».
4. **Given** حملة `sent`, **Then** تُعرض نسب المستلمين `pending` · `sent` · `failed` كأرقام Mono في صف واحد، والحملة للقراءة فقط.

### US-13.5 — الجدول الزمني التسويقي (P2)
يرى التاجر أحداثه الموسمية والمخططة على شريط زمني شهري، ويربط كل حدث بحملة أو عرض.
**Acceptance**:
1. **Given** حدث `event_type` من `seasonal` · `holiday` · `campaign_plan` · `custom` بلون من `indigo` · `emerald` · `amber` · `rose` · `sky`, **When** يُعرض، **Then** يظهر كشريط رفيع (2px حد بداية باللون) على صف الشهر بين `start_date` و`end_date`، لا كبطاقة ملونة.
2. **Given** حدث بـ`linked_campaign` أو `linked_offer`, **Then** يُعرض رابط مباشر إليهما وحالتهما.

### US-13.6 — إعدادات الولاء والإهداء وشريط التسويق (P2)
**Acceptance**:
1. **Given** برنامج الولاء، **Then** تُعرض `is_enabled`, `riyals_per_point` (10), `points_per_riyal_redemption` (10), `min_points_to_redeem` مع مثال حسابي حيّ «100 ر.س = 10 نقاط» من القيم المدخلة.
2. **Given** الإهداء، **Then** مفتاح واحد `is_enabled` مع شرح أثره على صفحة الدفع (M12).
3. **Given** شريط التسويق، **Then** يُحرَّر عبر نفس مكوّن شريط الإعلانات في M08 (نفس الحقول والعقد).

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-13.01**: المركز MUST يعرض صفحة دخول واحدة `/dashboard/marketing` بأرقام حيّة (كوبونات نشطة، عروض نشطة، سلات متروكة اليوم، آخر حملة) كشريط نصّي Mono لا بطاقات متماثلة.
- **FR-13.02**: كل قائمة (كوبونات، عروض، سلات، حملات) MUST تدعم فلاتر الحالة والبحث في الرابط (nuqs) وترقيماً خادمياً.
- **FR-13.03**: نماذج الكوبون والعرض MUST تُظهر/تُخفي الحقول الشرطية حسب النوع وتتحقق محلياً (Zod) بنفس قواعد الباك إند (قيم موجبة، تاريخ النهاية بعد البداية).
- **FR-13.04**: الحالات الزمنية (لم يبدأ / نشط / منتهٍ / مستهلك) MUST تُحسب في العرض من `start_date` و`expires_at` و`used_count`/`max_uses` وتُعرض كنص دلالي.
- **FR-13.05**: إرسال تذكير يدوي MUST يُطلب تأكيده ويعرض آخر وقت إرسال لمنع الإزعاج.
- **FR-13.06**: الحملة `sent` MUST تكون للقراءة فقط؛ `scheduled` تسمح بالإلغاء إلى `draft`.
- **FR-13.07**: كل شاشة MUST تُخفى حين مفتاح ميزتها معطّل، وتظهر صفحة «الميزة غير متاحة».
- **FR-13.08**: الكتابة MUST تتطلب `discounts.manage` للكوبونات والعروض؛ غيرها للمالك فقط.
- **FR-13.09**: المبالغ (`min_order_amount`, `total_amount`, `discount_value` الثابت) MUST تُعرض كما يرسلها الخادم.

## 5. الكيانات والحالات (Key Entities & States)

- **Coupon**: `code`, `discount_type` (`percent` · `fixed`), `discount_value`, `apply_to` (`all` · `category` · `product`), `min_order_amount`, `influencer`, `start_date`, `expires_at`, `is_active`, `max_uses`, `used_count`. رسائل الخادم: «هذا الكوبون غير مُفعَّل حالياً» · «لم يبدأ هذا الكوبون بعد» · «انتهت صلاحية هذا الكوبون» · «تم استخدام هذا الكوبون الحد الأقصى من المرات».
- **PromotionalOffer**: `name`, `offer_type` (`discount` · `free_shipping` · `buy_x_get_y`), `discount_type`, `discount_value`, `min_order_amount`, `description`, `image`, `cta_text`, `buy_quantity`, `buy_condition_type` (`all` · `category` · `product` · `min_items`), `buy_category`, `buy_product`, `get_product`, `get_quantity`, `get_discount_percent`, `min_total_items`, `priority`, `valid_from`, `valid_until`, `is_active`.
- **AbandonedCart**: `status` `active` · `abandoned` · `recovered`؛ `session_key`, `customer_phone`, `customer_name`, `total_amount`, `currency`, `items_count`, `last_interaction_at`, `recovered_order`, `reminder_step`, `last_reminder_sent_at`, `reminder_discount_coupon`؛ **AbandonedCartItem** لقطة. **AbandonedCartSettings** (مفرد) بالحقول في US-13.3.
- **MarketingCampaign**: `channel` (6)، `audience_type` (4)، `status` `draft` · `scheduled` · `sent`؛ **CampaignRecipient** `pending` · `sent` · `failed`.
- **MarketingEvent**: `title`, `event_type` (`seasonal` · `holiday` · `campaign_plan` · `custom`), `color` (`indigo` · `emerald` · `amber` · `rose` · `sky`), `start_date`, `end_date`, `linked_campaign`, `linked_offer`.
- **LoyaltyProgram** (مفرد): `is_enabled`, `riyals_per_point`, `points_per_riyal_redemption`, `min_points_to_redeem`. **GiftSettings**: `is_enabled`.
- انتقالات: `draft → scheduled → sent` (و`scheduled → draft` بالإلغاء)؛ `active → abandoned` بعد 2 ساعة خمول؛ `abandoned → recovered` عند إنشاء طلب من الرابط.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/marketing` (المركز) · `/dashboard/marketing/coupons` + `/new` + `/[id]` · `/dashboard/marketing/offers` + `/new` + `/[id]` · `/dashboard/marketing/abandoned-carts` + `/settings` · `/dashboard/marketing/campaigns` + `/new` + `/[id]` (+ معاينة الإرسال كـ sheet) · `/dashboard/marketing/timeline` (+ sheet للحدث) · `/dashboard/marketing/loyalty` · `/dashboard/marketing/gifting` · `/dashboard/marketing/bar`.
- **الحالات البصرية**: skeleton صفوف 44px · فراغ بنص فعلي («لا كوبونات بعد — أنشئ أول كوبون» / «لا سلات متروكة في آخر 7 أيام») · خطأ مع إعادة المحاولة · بلا صلاحية (قراءة فقط) · الميزة معطّلة.
- **الجوال**: القوائم → بطاقات مضغوطة؛ النماذج صفحة كاملة بخطوات؛ الجدول الزمني → قائمة أحداث مرتبة بالتاريخ مع شريط اللون 2px.
- **اختصارات**: `⌘K` → «كوبون جديد» / «حملة جديدة» · `N` إنشاء في القائمة الحالية · `/` بحث.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| أرقام المركز | ضمن `marketing_hub` HTML | `[NEEDS BACKEND]` → `GET /api/v1/marketing/summary/` → `{active_coupons, active_offers, abandoned_today, last_campaign:{id,status,sent_at}}` |
| الكوبونات CRUD | `merchant_offers`, coupon CRUD HTML | `[NEEDS BACKEND]` → `GET/POST /api/v1/marketing/coupons/?status&q&page`, `PATCH/DELETE /<id>/` |
| العروض الترويجية CRUD | `promotions_list`, `edit_promotional_offer` | `[NEEDS BACKEND]` → `GET/POST /api/v1/marketing/offers/`, `PATCH/DELETE /<id>/` (multipart للصورة) |
| السلات المتروكة | `abandoned_carts` HTML | `[NEEDS BACKEND]` → `GET /api/v1/marketing/abandoned-carts/?status&from&to&page` → `{count, results:[{id, customer_name, customer_phone, display_total, items_count, status, reminder_step, last_interaction_at, last_reminder_sent_at, recovered_order_id}]}` |
| تذكير يدوي | `send_abandoned_cart_reminder` POST | `[NEEDS BACKEND]` → `POST /api/v1/marketing/abandoned-carts/<id>/remind/` |
| إعدادات الاسترداد | `abandoned_cart_settings` (`AbandonedCartSettingsForm`) | `[NEEDS BACKEND]` → `GET/PATCH /api/v1/marketing/abandoned-carts/settings/` |
| الحملات | `campaigns_*`, `campaign_send_preview` | `[NEEDS BACKEND]` → `GET/POST /api/v1/marketing/campaigns/`, `PATCH /<id>/`, `GET /<id>/preview/` → `{recipients_count, rendered_message}`, `POST /<id>/send/` `{schedule_at?}` |
| الجدول الزمني | `timeline_*` (`TimelineEventForm`) | `[NEEDS BACKEND]` → `GET/POST /api/v1/marketing/timeline/?from&to`, `PATCH/DELETE /<id>/` |
| الولاء / الإهداء | `loyalty_settings`, `gift_settings` | `[NEEDS BACKEND]` → `GET/PATCH /api/v1/marketing/loyalty/`, `GET/PATCH /api/v1/marketing/gifting/` |
| شريط التسويق | `marketing_bar` (`AnnouncementBarForm`) | `[NEEDS BACKEND]` → نفس `PATCH /api/v1/store/announcement/` في M08 |
| منتقي التصنيفات/المنتجات | `GET /api/v1/catalog/categories/`, `/catalog/products/?search` | Ready |

## 8. الحالات الحدّية (Edge Cases)

- كوبون بـ`max_uses` فارغ: يُعرض «غير محدود» بدل `0 / —`.
- عرض `free_shipping` مع `min_order_amount` فارغ: يُعرض «لكل الطلبات».
- حملة على قناة فُصلت بعد الجدولة: تُعرض شارة «القناة غير مربوطة» وتُمنع من الإرسال حتى الربط.
- حدث جدول زمني يمتد عبر شهرين: يُقسم بصرياً على الصفَّين مع استمرار الشريط.
- سلة متروكة بلا `customer_phone`: لا زر تذكير، تُعرض كـ«زائر».
- برنامج الولاء مفعّل والقيم صفر: يُمنع الحفظ محلياً برسالة «القيمة يجب أن تكون أكبر من صفر».

## 9. معايير النجاح (Success Criteria)

- **SC-13.1**: إنشاء كوبون كامل ≤ 45 ثانية / ≤ 6 حقول إلزامية.
- **SC-13.2**: 100% من حالات الكوبون/العرض (لم يبدأ/نشط/منتهٍ/مستهلك) مقروءة نصياً بلا الحاجة لفتح السجل.
- **SC-13.3**: معاينة الحملة تُظهر عدد المستلمين قبل أي إرسال 100% من المرات.
- **SC-13.4**: الجدول الزمني بـ 30 حدثاً يُرسم في < 500ms بلا تمرير أفقي على 390px.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M03، M05 (تصنيفات/منتجات)، M08 (مكوّن شريط الإعلانات)، M17 (المؤثرون — خارج هذه الوحدة)، M19 (أدوات التتبع — خارج هذه الوحدة)، M27/M30 (حالة ربط القنوات)، M35 (نقاط العملاء).
- افتراض: «شريط التسويق» (`marketing_bar`) هو نفس حقول شريط الإعلانات على `StoreSetting`.
- افتراض: الأسماء العربية لقيم enums غير الموثَّقة في الاكتشاف هي نصوص واجهة فقط، لا تُرسل للخادم.
- افتراض: الباك إند سيعرض الكيانات بنفس أسماء حقول الـ Models؛ حتى ذلك تُبنى على Mock.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا بطاقات متماثلة في مركز التسويق؛ ألوان `MarketingEvent` (indigo…sky) هي بيانات التاجر وتُعرض كنقطة/حد 2px فقط لا كخلفيات؛ لا إيموجي في قوالب الرسائل الافتراضية.
- II: أكواد الكوبونات والنِسب والعدّادات (`used_count / max_uses`) بخط Mono محاذاة نهاية؛ الجدول الزمني يتدفق من اليمين (الأشهر الأحدث في البداية) وأسهم التنقل تنعكس.
- IV: لقطات `docs/visual-checks/13-marketing/` للمركز، نموذج العرض `buy_x_get_y`، السلات المتروكة، الجدول الزمني (جوال + داكن).
