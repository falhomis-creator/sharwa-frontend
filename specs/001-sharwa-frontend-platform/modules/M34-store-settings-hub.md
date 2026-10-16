# M34 — مركز إعدادات المتجر (Store Settings Hub)

**Route group**: `(dashboard)` · **Priority**: P1 · **Backend status**: HTML-only (7 نماذج + 3 مفاتيح تبديل POST) `[NEEDS BACKEND]`؛ قراءة جزئية عامة عبر `GET /api/v1/config/` Ready
**Discovery refs**: `02-products-domain-model.md` §11 (`StoreSetting` singleton، شريط الإعلانات، التجارة)، §15 (النماذج السبعة) · `01-*.md` §3.2 (Settings، `save_manual_payment_toggle`, `save_sharwa_pay_toggle`, `toggle_multi_location_mode`)، §4 (التذييل «الإعدادات»، «الأدوات المساعدة»، «المتجر الإلكتروني») · `03-*.md` §5 (جدول الحقول والافتراضيات)، §1 (`/api/v1/config/`) · **Benchmarks**: Linear Settings (تنقّل عمودي ثابت، أقسام مفصولة بحدود، حفظ فوري هادئ)، Notion (إعدادات كصفوف «تسمية — وصف — عنصر تحكم»)، Vercel Settings (بطاقة واحدة لكل إعداد خطير بحد أحمر نحيف، شريط «تغييرات غير محفوظة»)

## 1. الهدف (Purpose)

جمع كل ما يُعرِّف المتجر (الهوية، التواصل، السياسات، الشحن الافتراضي، العملات، SEO، شريط الإعلانات، مفاتيح الدفع، تعدد المواقع) في مركز واحد بتنقّل عمودي، يحفظ تلقائياً ما يمكن حفظه بأمان ويطلب تأكيداً صريحاً لما يمسّ المال أو البنية. تُقاس بزمن الوصول لأي إعداد (≤ 2 نقرات) وبصفر حفظ ضائع.

## 2. الفاعلون (Actors)

- **مالك المتجر**: كل الإعدادات.
- **موظف** بدور «مدير المتجر» النظامي: الهوية والتواصل والسياسات وSEO وشريط الإعلانات؛ لا العملات ولا مفاتيح الدفع ولا تعدد المواقع (قرار واجهة، انظر §10).
- **النظام**: يُطبِّق `timezone` و`week_start_day` على التقارير، وأسعار الصرف على عرض العملات في المتجر، و`multi_location_enabled` على نموذج المخزون.

## 3. قصص المستخدم (User Stories)

### US-34.1 — التنقّل بين أقسام الإعدادات (P1)
يفتح التاجر «الإعدادات» فيرى تنقّلاً عمودياً ثابتاً عند البداية (الهوية، التواصل، السياسات، الشحن، العملات، SEO، شريط الإعلانات، الدفع، المواقع) ومحتوى القسم المحدد بعرض أقصى 720px.
**Independent Test**: فتح `/dashboard/settings/currency` مباشرة → القسم محدد في التنقّل والمحتوى ظاهر؛ على 390px التنقّل يصير قائمة أعلى الصفحة.
**Acceptance**:
1. **Given** قسم ميزته معطّلة (مثال `seo_settings`)، **Then** لا يظهر في التنقّل ولا يُفتح من الرابط (يُحوَّل إلى الهوية مع إشعار).
2. **Given** قسم فيه تغييرات غير محفوظة، **When** يُضغط قسم آخر، **Then** يُعرض شريط سفلي ثابت «لديك تغييرات غير محفوظة» مع «حفظ» و«تجاهل»، ولا يُنتقل قبل الاختيار.
3. **Given** `⌘K` وكتابة «المنطقة الزمنية»، **Then** يُفتح قسم الهوية والحقل في حالة تركيز.

### US-34.2 — الهوية (P1)
**Acceptance**:
1. **Given** `StoreIdentityForm`، **Then** الحقول: `store_name`، `about_us` (نص طويل)، `timezone` (قائمة بحث، الافتراضي `Asia/Aden`)، `week_start_day` (`sunday` الأحد · `monday` الاثنين).
2. **Given** تغيير `store_name`، **When** يُحفظ، **Then** يتحدّث اسم المتجر في الشريط الجانبي والعلوي فوراً (M03) دون إعادة تحميل.
3. **Given** تغيير `week_start_day`، **Then** تلميح «يؤثر على التقارير الأسبوعية من الأسبوع القادم».

### US-34.3 — التواصل (P1)
**Acceptance**:
1. **Given** `ContactInfoForm`، **Then** الحقول: `whatsapp_number` (مطبَّع Mono)، `contact_email`، `custom_domain` (للقراءة مع رابط «إدارة النطاقات» → M19)، والروابط الأربعة `facebook_link`, `instagram_link`, `tiktok_link`, `snapchat_link` بتحقق URL.
2. **Given** `whatsapp_number` فارغ، **Then** تحذير نصّي «زر واتساب في المتجر سيُخفى».

### US-34.4 — السياسات والشحن (P1)
**Acceptance**:
1. **Given** `StorePoliciesForm`، **Then** حقل `return_policy` بمحرّر نص بسيط (عناوين/فقرات/قوائم) ومعاينة «كما يراها المشتري» في صفحة سياسة الاسترجاع.
2. **Given** `ShippingSettingsForm`، **Then** `default_delivery_fee` و`free_shipping_threshold` بخط Mono مع تسمية العملة الصريحة «ريال يمني (عدن)» لأن القيمتَين تُخزَّنان بـ `YER_NEW`، ومعاينة «الشحن مجاني للطلبات فوق X» بالقيمة المنسّقة من الخادم.

### US-34.5 — العملات وأسعار الصرف (P1)
**Acceptance**:
1. **Given** `CurrencySettingsForm`، **Then** `currency` (عملة العرض: `SAR` ريال سعودي · `USD` دولار أمريكي · `YER_OLD` يمني صنعاء · `YER_NEW` يمني عدن) وثلاثة أسعار: `usd_to_sar` (3.75)، `sar_to_yer_old` (140)، `sar_to_yer_new` (520) Mono مع جدول معاينة «100 ر.س = …» لكل عملة من حساب الخادم.
2. **Given** تغيير أي سعر صرف، **When** يُحفظ، **Then** حوار تأكيد «سيتغيّر عرض الأسعار في المتجر فوراً؛ الطلبات السابقة لا تتأثر (`exchange_rate_locked`)»، ولا حفظ تلقائي.
3. **Given** `multi_location_enabled` أو مفاتيح الدفع، **Then** نفس قاعدة التأكيد الصريح.

### US-34.6 — SEO وشريط الإعلانات (P2)
**Acceptance**:
1. **Given** `SEOSettingsForm`، **Then** `seo_title`, `seo_description`, `seo_keywords`, `seo_og_image` بعدّادات أحرف ومعاينة نتيجة بحث نصّية (عنوان، رابط Mono، وصف) بلا شعارات محركات.
2. **Given** `AnnouncementBarForm`، **Then** `enable_announcement_bar`، `announcement_text`، `announcement_bg_color`/`announcement_text_color` (hex Mono + مربع 16px)، `announcement_scroll_speed` (`slow` بطيء · `medium` متوسط · `fast` سريع)، وأربعة مفاتيح `show_banner_on_home` / `_products` / `_product_detail` / `_checkout`؛ مع معاينة حيّة للشريط بأبعاد المتجر الفعلية تحترم `prefers-reduced-motion`.
3. **Given** تباين ضعيف بين لونَي الشريط، **Then** تحذير نصّي «تباين أقل من AA» دون منع.

### US-34.7 — الدفع والمواقع (P1)
**Acceptance**:
1. **Given** قسم الدفع، **Then** مفتاحان فقط: `enable_manual_payment` (التحويل البنكي/الدفع اليدوي) و`enable_sharwa_pay` (شروة باي) بوصف سطر واحد لكل منهما، ورابط «إعدادات البوابات والحسابات» → M14.
2. **Given** إيقاف `enable_manual_payment` وهو الوسيلة الوحيدة المفعّلة، **Then** تحذير «لن يستطيع المشترون الدفع إلا عند الاستلام» وتأكيد.
3. **Given** `multi_location_enabled` من `false` إلى `true`، **Then** حوار يشرح «سيُدار المخزون لكل موقع؛ المخزون الحالي يُنقل إلى الموقع الافتراضي» ورابط M22؛ العكس يحذّر من دمج الكميات.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-34.01**: المركز MUST يُنفَّذ كصفحة واحدة بتنقّل عمودي عند البداية وأقسام بمسارات مستقلة `/dashboard/settings/<section>`؛ التنقّل ثابت (sticky) على الديسكتوب.
- **FR-34.02**: الحقول MUST تطابق النماذج السبعة حرفياً: `StoreIdentityForm` (`store_name`, `about_us`, `timezone`, `week_start_day`)، `ContactInfoForm` (`whatsapp_number`, `contact_email`, `custom_domain`, 4 روابط)، `StorePoliciesForm` (`return_policy`)، `ShippingSettingsForm` (`default_delivery_fee`, `free_shipping_threshold`)، `CurrencySettingsForm` (3 أسعار + `currency`)، `SEOSettingsForm` (4 حقول)، `AnnouncementBarForm` (9 حقول)؛ يُمنع إضافة حقول.
- **FR-34.03**: الحفظ التلقائي (debounce 800ms بعد آخر تغيير، أو عند مغادرة الحقل) MUST يُطبَّق على: الهوية، التواصل، السياسات، SEO، شريط الإعلانات؛ مع مؤشر نصّي صغير «يُحفظ…» → «تم الحفظ 12:40» بخط Mono قرب عنوان القسم.
- **FR-34.04**: الحفظ الصريح مع تأكيد MUST يُطبَّق على: العملات وأسعار الصرف، `default_delivery_fee`/`free_shipping_threshold`، مفتاحَي الدفع، `multi_location_enabled`؛ زر «حفظ التغييرات» معطّل حتى يتغيّر شيء.
- **FR-34.05**: شريط «تغييرات غير محفوظة» MUST يظهر ثابتاً أسفل المحتوى عند وجود تغييرات غير محفوظة في قسم صريح، ويمنع التنقّل حتى الحفظ أو التجاهل، ويحذّر عند إغلاق التبويب (`beforeunload`).
- **FR-34.06**: كل حقل MUST يعرض خطأ الخادم `{field:[msg]}` تحته، ويُعاد التركيز إلى أول حقل خاطئ.
- **FR-34.07**: المبالغ MUST تُعرض بالعملة الصريحة في التسمية؛ `default_delivery_fee` و`free_shipping_threshold` يُعلَّمان «يمني عدن (YER_NEW)» لأن التخزين بهذه العملة؛ معاينات التحويل من الخادم فقط.
- **FR-34.08**: `custom_domain` MUST يُعرض للقراءة فقط مع رابط إلى M19؛ لا تحرير من هنا.
- **FR-34.09**: `logo` والألوان والخطوط MUST لا تظهر هنا (تملكها M08 عبر `StorefrontDesignForm`)؛ يُعرض رابط «تصميم المتجر».
- **FR-34.10**: معاينة شريط الإعلانات MUST تستخدم المكوّن الفعلي من `src/components/ui` المشترك بنفس السرعات الثلاث، وتتجمّد عند `prefers-reduced-motion`.
- **FR-34.11**: الأقسام MUST تُخفى وفق مفاتيح الميزات: التواصل `contact_info`، السياسات `store_policies`، الشحن `shipping_settings`، العملات `currency_settings`، SEO `seo_settings`، شريط الإعلانات `coupon` (كما في الشريط الأصلي)، المواقع `multi_location`؛ الهوية والدفع دائماً.
- **FR-34.12**: بعد أي حفظ MUST يُبطَل كاش `/api/v1/config/` (المتجر) و`/auth/me/` (اسم المتجر في الهيكل).
- **FR-34.13**: `timezone` MUST يُختار من قائمة IANA قابلة للبحث مع عرض الوقت الحالي بالمنطقة المختارة Mono.

## 5. الكيانات والحالات (Key Entities & States)

- **StoreSetting** (singleton) — المجموعات المعنية هنا: الهوية (`store_name`, `about_us`, `timezone`=`Asia/Aden`, `week_start_day` ∈ `sunday` · `monday`)؛ التواصل (`whatsapp_number`, `contact_email`, `custom_domain`, `facebook_link`, `instagram_link`, `tiktok_link`, `snapchat_link`)؛ السياسات (`return_policy`)؛ الشحن (`default_delivery_fee` YER_NEW, `free_shipping_threshold`)؛ العملات (`currency` ∈ `SAR` · `USD` · `YER_OLD` · `YER_NEW`, `usd_to_sar` 3.75, `sar_to_yer_old` 140, `sar_to_yer_new` 520)؛ SEO (`seo_title`, `seo_description`, `seo_keywords`, `seo_og_image`)؛ شريط الإعلانات (`enable_announcement_bar`, `announcement_text`, `announcement_bg_color`, `announcement_text_color`, `announcement_scroll_speed` ∈ `slow` · `medium` · `fast`, `show_banner_on_home`, `show_banner_on_products`, `show_banner_on_product_detail`, `show_banner_on_checkout`)؛ الدفع (`enable_manual_payment`, `enable_sharwa_pay`)؛ البنية (`multi_location_enabled`).
- **حالة القسم** (محلية): `clean` · `dirty` · `saving` · `saved(at)` · `error(fields)`؛ الأقسام التلقائية تنتقل `dirty → saving → saved` بلا تدخل؛ الصريحة تبقى `dirty` حتى زر الحفظ.
- خارج هذه الوحدة: `logo`, الألوان, الخطوط, `theme_preset`, `design_style` (M08)؛ `merchant_balance` (M14)؛ `admin_password` (M03).

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/settings` (يُحوَّل إلى `/identity`) · `/dashboard/settings/identity` · `/contact` · `/policies` · `/shipping` · `/currency` · `/seo` · `/announcement` · `/payments` · `/locations`.
- **التخطيط**: تنقّل عمودي 220px بحد نهاية 1px، محتوى 720px؛ كل إعداد صف «تسمية + وصف قصير» عند البداية و«عنصر التحكم» عند النهاية، الصفوف مفصولة بحدود أفقية 1px؛ الإعدادات الخطيرة (العملات، الدفع، المواقع) داخل إطار بحد 1px بلون `red-600` بعرض كامل بلا تعبئة ملونة.
- **الحالات البصرية**: skeleton صفوف الإعدادات · خطأ تحميل مع إعادة محاولة · بلا صلاحية (الأقسام الحساسة للقراءة فقط مع تلميح) · ميزة معطّلة (القسم غائب من التنقّل) · «يُحفظ…/تم الحفظ» · شريط التغييرات غير المحفوظة · حوار التأكيد.
- **الجوال**: التنقّل يصير قائمة منسدلة لاصقة أعلى المحتوى؛ الصفوف تتحول إلى عمود (تسمية فوق عنصر التحكم)؛ شريط التغييرات فوق الشريط السفلي للهيكل.
- **اختصارات**: `⌘S` حفظ القسم الصريح · `⌘K` «إعداد: …» يفتح القسم والحقل · `Esc` يغلق حوار التأكيد.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| قراءة كل الإعدادات | `store_settings` + 6 صفحات HTML؛ جزئياً `GET /api/v1/config/` (عام) | `[NEEDS BACKEND]` → `GET /api/v1/settings/` → كل حقول §5 (بلا `admin_password` ولا أسرار) + `display_default_delivery_fee`, `display_free_shipping_threshold`, `fx_preview:[{currency, display_100_sar}]` |
| الهوية | `store_settings` POST (`StoreIdentityForm`) | `[NEEDS BACKEND]` → `PATCH /api/v1/settings/identity/` `{store_name?, about_us?, timezone?, week_start_day?}` → 200 / 400 |
| التواصل | `contact_info` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/settings/contact/` `{whatsapp_number?, contact_email?, facebook_link?, instagram_link?, tiktok_link?, snapchat_link?}` (`custom_domain` للقراءة) |
| السياسات | `store_policies` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/settings/policies/` `{return_policy}` |
| الشحن الافتراضي | `shipping_settings` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/settings/shipping/` `{default_delivery_fee, free_shipping_threshold}` → 200 مع `display_*` |
| العملات وأسعار الصرف | `currency_settings` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/settings/currency/` `{currency?, usd_to_sar?, sar_to_yer_old?, sar_to_yer_new?}` → 200 مع `fx_preview` |
| SEO | `seo_settings` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/settings/seo/` multipart (`seo_og_image`) |
| شريط الإعلانات | `marketing_bar` POST (`AnnouncementBarForm`) | `[NEEDS BACKEND]` → `PATCH /api/v1/settings/announcement/` (الحقول التسعة) |
| مفتاح الدفع اليدوي | `save_manual_payment_toggle` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/settings/payments/` `{enable_manual_payment?, enable_sharwa_pay?}` |
| مفتاح شروة باي | `save_sharwa_pay_toggle` POST | ضمن السطر أعلاه |
| تعدد المواقع | `toggle_multi_location_mode` POST | `[NEEDS BACKEND]` → `POST /api/v1/settings/multi-location/` `{enabled: bool}` → 200 / 409 إن وُجدت مواقع متعارضة |
| قائمة المناطق الزمنية | غير موجود | n/a — `Intl.supportedValuesOf('timeZone')` محلياً |

## 8. الحالات الحدّية (Edge Cases)

- حفظ تلقائي فشل (شبكة): يبقى القسم `dirty` مع «لم يُحفظ — إعادة المحاولة» ولا تُفقد القيم؛ إعادة المحاولة آلية مرة واحدة بعد 5 ثوانٍ.
- تعديلان من تبويبَين: الخادم يرد بأحدث قيمة؛ تُعرض «حُدِّث هذا الإعداد من جلسة أخرى» مع القيمة الجديدة وخيار إعادة التطبيق.
- `whatsapp_number` بصيغة محلية: يُعرض المطبَّع Mono قبل الحفظ؛ الخادم المرجع.
- سعر صرف 0 أو سالب: رفض محلي «يجب أن يكون أكبر من صفر».
- `free_shipping_threshold` أقل من `default_delivery_fee`: يُسمح مع تحذير «الشحن المجاني سيُطبَّق على معظم الطلبات».
- إيقاف `enable_sharwa_pay` مع طلبات `pending_payment` قائمة: تحذير «الطلبات الجارية لا تتأثر».
- `announcement_text` طويل (> 200 حرف): تحذير بالطول، المعاينة تُظهر التمرير الفعلي.
- `seo_og_image` بصيغة غير مسموحة: رفض محلي بالصيغ `jpg, jpeg, png, webp, gif`.
- موظف يفتح قسماً حساساً: الحقول للقراءة مع «تحتاج صلاحية مالك المتجر».

## 9. معايير النجاح (Success Criteria)

- **SC-34.1**: الوصول لأي إعداد ≤ 2 نقرات أو أمر ⌘K واحد.
- **SC-34.2**: 0 تغييرات ضائعة في اختبار: تحرير 3 أقسام، تبديل، إغلاق التبويب → كل شيء محفوظ أو مُنذَر به.
- **SC-34.3**: الحفظ التلقائي يكتمل في < 800ms من كاش دافئ؛ مؤشر «تم الحفظ» يظهر خلال < 1s.
- **SC-34.4**: 100% من التغييرات على العملات/الدفع/المواقع تمرّ بحوار تأكيد؛ 0 حفظ تلقائي لها.
- **SC-34.5**: الأقسام تطابق النماذج السبعة حرفياً (0 حقول زائدة أو ناقصة في فحص آلي).

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M03 (الهيكل، اسم المتجر، `/auth/me/`)، M08 (الشعار والثيم)، M14 (البوابات والحسابات)، M19 (النطاقات)، M22 (المواقع)، M09 (معاينة الشريط وسياسة الاسترجاع بمكوّنات المتجر عبر `src/components/ui` فقط)، M48 (⌘K).
- افتراض: تقسيم «تلقائي/صريح» قرار واجهة مستند إلى أثر الإعداد (نصّي وقابل للتراجع ↔ مالي/بنيوي)؛ لا تمييز في الباك إند.
- افتراض: تقييد الأقسام الحساسة على المالك قرار واجهة لعدم وجود مفتاح `settings.*` بين الـ 35؛ يُؤكَّد مع الباك إند.
- افتراض: شريط الإعلانات يعيش هنا وفي M13 معاً (الشريط الأصلي يضعه تحت «العروض والكوبونات»)؛ نموذج واحد مشترك ومسار واحد.
- افتراض: `fx_preview` يُحسب على الخادم؛ لا تحويل عملات في الواجهة.
- افتراض: حتى توفر endpoints، Mock بنفس العقد مع محاكاة 400 لكل حقل و409 لتعدد المواقع.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I (Anti-AI): لا بطاقات إعدادات متماثلة بأيقونات في دوائر؛ صفوف مفصولة بحدود 1px وتنقّل نصّي. المناطق الخطيرة بحد 1px أحمر نحيف لا خلفية حمراء. مفاتيح التبديل بلا لون brand (أسود/أبيض بالتباين الحاد). معاينة SEO نصّية بلا شعار Google. لا إيموجي في أوصاف الإعدادات.
- II (RTL): الأرقام (أسعار الصرف، الرسوم، العدّادات، الوقت الحالي) بخط Geist Mono `tabular-nums`؛ الروابط والنطاقات والبريد وhex في `dir="ltr"` معزول؛ عنصر التحكم عند النهاية (`ms-auto`)؛ معاينة الشريط تتحرك بالاتجاه الصحيح في RTL.
- IV (Visual check): لقطات `docs/visual-checks/34-settings/` لكل قسم من التسعة، شريط التغييرات غير المحفوظة، حوار تأكيد العملات، حالة القراءة فقط للموظف، الجوال (التنقّل المنسدل)، الداكن.
- IX (State): الإعدادات في TanStack Query بمفتاح المستأجر مع تحديث تفاؤلي للأقسام التلقائية وإبطال `/api/v1/config/` و`/auth/me/` بعد الحفظ؛ حالة `dirty` لكل قسم في Zustand؛ القسم في الرابط؛ React Hook Form + Zod لكل نموذج، لا `any`.
