# Feature Specification: Sharwa Frontend Platform — منصة «شروه» (الواجهة الأمامية الكاملة)

**Feature Branch**: `001-sharwa-frontend-platform`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "بناء المواصفات لـ 49 وحدة (الأساسية + المكتشفة) اعتماداً على `specs/discovery/` — واجهة أمامية مستقلة بـ Next.js لمنصة شروه (Multi-tenant E-commerce SaaS) تغطي الصفحة الترويجية، تأسيس المتجر، لوحة التاجر، متجر المشتري، نقاط البيع، تطبيق المندوب، شروة باي، ولوحة إدارة المنصة."

> **هيكل هذه المواصفة**: هذا الملف هو المواصفة الأم (platform-level). كل وحدة من الـ 49 لها مواصفة تفصيلية مستقلة في `modules/M[NN]-<slug>.md` بنفس بنية `modules/_TEMPLATE.md` (قصص مستخدم، متطلبات، كيانات وحالات، واجهة، عقد بيانات، حالات حدّية، معايير نجاح، افتراضات، قيود الدستور). الفهرس في §«Module Index». الاكتشاف المرجعي (قراءة فقط من الباك إند) في `specs/discovery/00..03`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - التاجر يُطلق متجره ويبيع أول طلب (Priority: P1)

تاجر عربي يصل للصفحة الترويجية من جواله، يفهم العرض خلال ثوانٍ، يُدخل اسم متجره ورقم واتسابه، يتحقق بـ OTP، ينتظر تجهيز المتجر (أقل من دقيقة)، يضع كلمة مروره، يضيف أول منتج بخياراته وصوره، يشارك رابط متجره، فيصله أول طلب في لوحته ويغيّر حالته حتى «مكتمل».

**Why this priority**: هذه هي سلسلة القيمة الكاملة للمنصة؛ بدونها لا معنى لأي وحدة أخرى. تغطي M01, M02, M03, M04, M05, M06, M34, M47.

**Independent Test**: يُنفَّذ كاملاً على بيئة تجريبية: من `/` إلى أول طلب «مكتمل» في ≤ 10 دقائق بدون قراءة وثائق، مع لقطات الفحص البصري على 3 مقاسات.

**Acceptance Scenarios**:

1. **Given** زائر جديد على الجوال، **When** يُدخل اسم متجر ورقماً صالحين ويتحقق بالـ OTP، **Then** يرى شاشة انتظار بحالة التجهيز وتصل إلى «ready» ويُنقل لتعيين كلمة المرور في أقل من 60 ثانية (قياس من الإرسال إلى `ready`).
2. **Given** تاجر داخل لوحته بلا منتجات، **When** يفتح «المنتجات»، **Then** يرى حالة فراغ بنص فعلي وزر «أضف منتجك الأول» يفتح نموذجاً سريعاً (اسم، سعر، صورة، مخزون) يُحفظ في ≤ 4 حقول إلزامية.
3. **Given** منتج بخيار مقاس/لون، **When** يُولَّد جدول المتغيرات، **Then** تُنشأ التوليفات مع SKU ومخزون قابلَين للتحرير جماعياً.
4. **Given** طلب جديد وصل، **When** يفتح التاجر «الطلبات»، **Then** يرى الطلب في أعلى الجدول بعدّاد «جديد» في الشريط الجانبي، ويغيّر حالة التنفيذ من قائمة الحالات التي يعرّفها هو، وتبقى الحالة المالية منفصلة وواضحة.

---

### User Story 2 - المشتري يتصفح ويشتري من متجر التاجر (Priority: P1)

مشترٍ يفتح `store.sharwa…` من رابط واتساب على جواله، يرى متجراً بهوية التاجر (ألوانه وخطوطه وأقسامه)، يفتح منتجاً، يختار خياراته، يضيفه للسلة الجانبية بلا إعادة تحميل، ويُكمل الدفع في صفحة واحدة (توصيل/استلام، دفع عند الاستلام مع OTP أو تحويل أو شروة باي)، ثم يحصل على رقم طلب ورابط تتبع.

**Why this priority**: المتجر هو ما يراه عميل التاجر؛ سرعته وثقته تحددان إيراد التاجر. يغطي M09, M10, M11, M12, M41, M44.

**Independent Test**: جلسة شراء كاملة على 390px في ≤ 90 ثانية، LCP ≤ 2.5s، صفر تمرير أفقي، سلة تعمل بالكوكي عبر الصفحات.

**Acceptance Scenarios**:

1. **Given** متجر بثيم `luxury_boutique` وخط `Almarai`، **When** تُفتح الصفحة الرئيسية، **Then** تُطبَّق ألوانه وخطوطه داخل مجموعة المتجر فقط (لا تلمس لوحة التاجر)، وتُعرض الأقسام بترتيب التاجر وتُخفى الأقسام ذات `show_on_mobile=false` على الجوال.
2. **Given** منتج بسياسة دفع «عربون»، **When** يُضاف للسلة ويُفتح الدفع، **Then** تعرض الفاتورة «المطلوب الآن» و«المستحق عند الاستلام» بالقيم المنسّقة من الخادم.
3. **Given** مشترٍ يختار «الدفع عند الاستلام»، **When** يُرسل، **Then** يُطلب OTP واتساب ويُعرض الطلب بعد التحقق، ويُنقل إلى صفحة نجاح برقم الطلب ورابط تتبع عام.
4. **Given** مشترٍ غيّر العملة إلى `USD`، **When** يتنقل بين الصفحات، **Then** تبقى العملة ثابتة في الجلسة وتُعرض الأسعار كما يرسلها الخادم.

---

### User Story 3 - التاجر يُدير متجره يومياً على نطاق أوسع (Priority: P2)

تاجر بعشرات الطلبات يومياً يستخدم: العملاء، التسويق (كوبونات، عروض، سلات متروكة، حملات)، الشحن (طرق توصيل، مندوبون، شروة شيب، شركات خارجية)، الدفع (بوابات، محفظة، سحوبات)، المخزون والمواقع، المرتجعات، التقارير، الموظفين والصلاحيات، مخصّص الثيم، النطاقات والبيكسل، لوحة الأوامر `⌘K`، ومركز التنبيهات.

**Why this priority**: يحوّل المنصة من «متجر يعمل» إلى «نظام تشغيل للتجارة» ويقابل سلة/زد/Shopify. يغطي M07, M08, M13, M14, M15, M18, M19, M21, M22, M24, M25, M35, M42, M48, M49.

**Independent Test**: كل وحدة تُفحص وحدها عبر قصصها؛ المعيار المشترك: أي قائمة ≥ 500 صف تُفتح < 1s بفلاتر محفوظة في الرابط، وأي إجراء محجوب يُعرض بسبب مقروء.

**Acceptance Scenarios**:

1. **Given** موظف بصلاحية `orders.view` فقط، **When** يدخل اللوحة، **Then** يرى الطلبات للقراءة فقط ولا يرى المنتجات أو الإعدادات في الشريط ولا في `⌘K`.
2. **Given** ميزة `marketplaces` معطّلة للمتجر، **When** يُفتح الشريط، **Then** لا يظهر عنصر الأسواق، وأي رابط مباشر إليه يعرض صفحة «الميزة غير مفعّلة» مع كيفية التفعيل.
3. **Given** تاجر يغيّر لون المتجر الأساسي في المخصّص، **When** يُعاين، **Then** تتحدّث المعاينة الحية فوراً ولا يُنشر شيء قبل «نشر».
4. **Given** 1200 طلب، **When** يبحث التاجر برقم هاتف في `⌘K`، **Then** يرى الطلبات والعميل مجمَّعين في < 500ms ويفتح أيّها بـ Enter.

---

### User Story 4 - مالك المنصة يُدير التجار والباقات والمستحقات (Priority: P2)

مالك «شروه» يفتح لوحة الإدارة العليا ليرى إجمالي المتاجر والمبيعات والطلبات، يراجع المتاجر الفاشلة التجهيز ويعيد تجهيزها، يفعّل ميزات لمتجر محدد، يراجع طلبات شحن/سحب شروة باي، ويحصّل مستحقات العمولات والتطبيقات من محافظ التجار.

**Why this priority**: بدونها يبقى المالك على Django admin الخام. يغطي M20, M45, M46.

**Independent Test**: من لوحة الإدارة: إعادة تجهيز متجر فاشل، تفعيل ميزة لمتجر، قبول طلب شحن محفظة، تحصيل مستحق — كلها بدون فتح Django admin.

**Acceptance Scenarios**:

1. **Given** متجر بحالة `failed`، **When** يُختار «إعادة التجهيز»، **Then** تتغير الحالة إلى `provisioning` ثم `ready` مع تحديث حي، ويُسجَّل الإجراء.
2. **Given** مستحق عمولة `pending` لمتجر رصيد محفظته أقل من المبلغ، **When** يُحاول التحصيل، **Then** يُعرض سبب الرفض (رصيد غير كافٍ) ويبقى `pending` مع خيار «إعفاء».

---

### User Story 5 - قنوات وامتدادات البيع المتقدمة (Priority: P3)

تاجر متقدم يفعّل نقاط البيع لفرعه، يربط واتساب وقنوات التواصل (Meta/TikTok/Telegram) في صندوق وارد موحَّد، يربط أمازون/نون، يستورد منتجات دروبشيبينغ، يدير الموردين وأوامر الشراء، يفتح الحجوزات، يتابع المسوقين بالعمولة والمؤثرين، ويستخدم مندوبوه تطبيق التوصيل؛ وعملاؤه يستخدمون محفظة شروة باي.

**Why this priority**: تمييز تنافسي، لكنها تعتمد على استقرار P1/P2. يغطي M16, M17, M23, M26–M33, M36–M40, M43.

**Independent Test**: كل وحدة تُفحص وحدها؛ المعيار المشترك: تكامل الحالات مع M06 (الطلبات) وM21 (المخزون) دون تضارب.

**Acceptance Scenarios**:

1. **Given** كاشير بوردية مفتوحة، **When** يبيع منتجاً بالباركود ويقبض نقداً، **Then** يُنشأ طلب بقناة `pos` وموقع الفرع وتُسجَّل حركة `sale` في درج الكاش.
2. **Given** مندوب في وردية، **When** يمسح باركود شحنة ويُسلّمها جزئياً مع تحصيل COD، **Then** تتغير حالة الشحنة وتُسجَّل عهدة `collected_cod` ويرفض الخادم التكرار بنفس `client_generated_uuid`.

---

### Edge Cases

- **متجر غير مجهَّز (503)**: أي صفحة متجر أو لوحة تعرض شاشة انتظار موحَّدة تستطلع الحالة كل 3 ثوانٍ (M47)، لا صفحة خطأ خام.
- **نطاق غير موجود أو محجوز**: صفحة 404 خاصة بالمنصة مع رابط إنشاء متجر.
- **تضارب نسخة (409)** في الطلبات/الموافقات/المرتجعات: إعادة تحميل تفاعلية ثم إعادة المحاولة؛ لا كتابة عمياء.
- **انقطاع الشبكة أثناء إجراء جماعي**: نتائج جزئية + إعادة محاولة للفاشلة فقط.
- **عملات متعددة بلا تحويل** (`SAR | USD | YER_OLD | YER_NEW`): كل مبلغ يُعرض بعملته كما يرسله الخادم؛ لا جمع عبر العملات في الواجهة.
- **موظف فُصل أثناء جلسته** (`token_version` تغيّر): أول طلب تالٍ يعيده لتسجيل الدخول برسالة واضحة.
- **ميزة معطّلة بعد أن كانت مفعّلة**: الروابط المحفوظة تعرض صفحة «الميزة غير مفعّلة» لا 404.
- **RTL/LTR مختلط**: أرقام الهواتف وSKU والعناوين الإنجليزية تُعرض بـ `dir="ltr"` داخل سياق RTL بلا انقلاب.
- **صور منتجات خارجية (`image_url`) معطوبة**: بديل بحد 1px واسم المنتج، لا أيقونة مكسورة.
- **الوضع الداكن**: يحتفظ بالتباين الحاد ولوحة zinc؛ ثيم المتجر يبقى بألوان التاجر ولا يُطبَّق عليه الوضع الداكن إلا إن اختاره التاجر.

## Requirements *(mandatory)*

### Functional Requirements

**هيكل وتوجيه**
- **FR-001**: النظام MUST يقسّم الواجهة إلى مجموعات مسار معزولة: `(marketing)` الصفحة الترويجية، `(onboarding)` التأسيس، `(dashboard)` لوحة التاجر، `(storefront)/[store]` المتجر، `(admin)` إدارة المنصة، `(pos)` نقاط البيع، `(courier)` تطبيق المندوب، `(pay)` شروة باي.
- **FR-002**: النظام MUST يحلّ المستأجر من الـ Host (subdomain أو نطاق مخصص) ويمرّره للخادم، ويتعامل مع 404/403/503 (التجهيز) بصفحات مخصصة.
- **FR-003**: النظام MUST يعمل كعميل Headless للباك إند الحالي عبر وكيل same-origin يحافظ على الكوكي (الجلسة، السلة، CSRF)؛ يُمنع اختراع آليات مصادقة غير موجودة.
- **FR-004**: كل حاجة بيانات غير متوفرة في `/api/v1` MUST تُعلَّم `[NEEDS BACKEND]` في مواصفة الوحدة مع عقد مقترح، وتُبنى الواجهة على Mock بنفس العقد.

**الهوية واللغة**
- **FR-005**: كل الواجهات MUST تُعرض بالعربية RTL افتراضياً بخط IBM Plex Sans Arabic للنص وGeist Mono للأرقام/الأسعار/المعرّفات.
- **FR-006**: لوحة التاجر والصفحة الترويجية وإدارة المنصة MUST تلتزم بلوحة zinc أحادية التباين الحاد بحدود 1px؛ ألوان التاجر تُطبَّق على مجموعة المتجر فقط.
- **FR-007**: المبالغ MUST تُعرض كما يرسلها الخادم (`display_*`)؛ يُمنع تنسيق العملة في العميل.

**الصلاحيات والميزات**
- **FR-008**: الشريط الجانبي ولوحة الأوامر وكل الصفحات MUST تحترم 39 مفتاح ميزة و35 مفتاح صلاحية: إخفاء ما ليس له ميزة، تعطيل مع تلميح ما ليس له صلاحية.
- **FR-009**: أي إجراء يرفضه الخادم (حالة، صلاحية، تضارب نسخة، سوق خارجي) MUST يُعرض بسبب مقروء بالعربية في مكانه.

**القوائم والبيانات**
- **FR-010**: كل قائمة MUST تدعم ترقيماً خادمياً، ترتيباً، فلاتر، وبحثاً، وحالتها كاملة في الرابط (قابلة للمشاركة).
- **FR-011**: كل قائمة ونموذج MUST يملك حالات: تحميل (skeleton)، فراغ بنص فعلي وإجراء، خطأ مع إعادة محاولة، بلا صلاحية، ميزة معطّلة.
- **FR-012**: الإجراءات الجماعية MUST تُظهر معاينة بالعدد وتقريراً بالنتائج.
- **FR-013**: مفاتيح الكاش MUST تُفتح بمعرّف المستأجر؛ لا تسرب بيانات بين المتاجر في نفس المتصفح.

**التنقل والإنتاجية**
- **FR-014**: لوحة التاجر وإدارة المنصة MUST توفر لوحة أوامر `Ctrl+K/⌘K` للتنقل والبحث والإجراءات، ومركز تنبيهات في شريط علوي.
- **FR-015**: كل عنصر تفاعلي MUST يُدار بلوحة المفاتيح مع `focus-visible` وأهداف لمس ≥ 44px على الجوال.

**الوحدات**
- **FR-016**: النظام MUST ينفّذ الـ 49 وحدة المفهرسة أدناه بترتيب أولوياتها، كل وحدة وفق مواصفتها في `modules/`.

### Key Entities *(include if feature involves data)*

- **Tenant/Store (Client)**: المتجر؛ `provisioning_status` (`pending` · `provisioning` · `ready` · `failed`)، `is_active`، النطاقات، الخطة الحالية، الميزات المفعّلة.
- **StoreSetting**: هوية المتجر، رموز الثيم (5 ألوان، خطّان، preset، design_style)، شريط الإعلان، العملة وأسعار الصرف، التوقيت، أعلام التجارة.
- **Product / ProductVariant / VariantAttribute / VariantOption / ProductTemplate**: الكتالوج ثلاثي الطبقات بأنواع المنتج (`physical` · `digital` · `service`) وسياسات الدفع (`cod` · `deposit` · `full`).
- **Category / Brand / Tag / Collection / ProductBadge**: التنظيم والاكتشاف.
- **Order / OrderItem / Fulfillment / PaymentIntent / OrderRefund / OrderStatus**: الطلب بمحورَي حالة (مالي 7 قيم، تنفيذ يعرّفه التاجر)، تنفيذ لكل موقع، مدفوعات متعددة، استرجاعات.
- **Cart (session)**: سطور بالمنتج/المتغير/الكمية، عملة الجلسة.
- **Customer (phone-keyed)**: لا حسابات؛ ثقة COD، محفظة SAR، نقاط ولاء، قائمة أمنيات، تقييمات.
- **Coupon / PromotionalOffer / AbandonedCart / MarketingCampaign / MarketingEvent / LoyaltyProgram / Affiliate / Influencer**: التسويق.
- **DeliveryMethod / PickupLocation / ShippingProvider / ShipmentOrder / ShipmentEvent / SharwaShipZone / PackagingProfile**: الشحن (8 حالات شحنة، آلة حالات صريحة).
- **ReturnRequest / ReturnLineItem / ReturnAuthorization**: المرتجعات المالية والمادية.
- **Location / LocationInventory / StockMovement / InventoryItem / InventoryReservation**: المواقع والمخزون.
- **StaffMember / Role / Permission / StaffLocationRole / PermissionOverride / ApprovalRequest / AuditLog / BehaviorAlert / Shift / CashRegister**: الموظفون والصلاحيات ونقاط البيع.
- **Wallets**: `Wallet` (عميل، SAR)، `MerchantWallet` (4 عملات)، `SharwaPayWallet` (منصة، 4 عملات)، طلبات شحن/سحب (`pending` · `approved` · `rejected`).
- **Plan / Subscription / Feature / PlanFeature / TenantFeatureOverride / PlatformBillingSettings / App / AppBillingOverride**: الباقات والميزات والتطبيقات.
- **PlatformCommissionRecord / AppBillingCharge**: مستحقات المنصة (`pending` · `collected` · `waived`).
- **Conversation / Message / MarketplaceListing / SupplierConnection / SupplierOrder / PurchaseOrder / BookingSlot / SupportSession**: القنوات والامتدادات.
- **Report registry**: 42 تقريراً في 10 فئات، مهام تصدير، اشتراكات مجدولة.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: تاجر جديد يُنشئ متجره من الصفحة الترويجية إلى لوحة التحكم في ≤ 60 ثانية (وسيط) و≤ 3 دقائق (90%).
- **SC-002**: مشترٍ يُكمل شراءً كاملاً على الجوال في ≤ 90 ثانية بدون حساب.
- **SC-003**: صفحات المتجر والـ PDP والصفحة الترويجية: LCP ≤ 2.5s وCLS ≤ 0.1 على الجوال؛ Lighthouse Performance ≥ 90 وAccessibility ≥ 95.
- **SC-004**: أي قائمة في لوحة التاجر (≤ 100 صف/صفحة) تُرسم في < 1s ويُشارك رابط فلترها فيعطي نفس النتيجة.
- **SC-005**: 0 حالات تمرير أفقي على 320–1920px عبر كل الوحدات المُسلَّمة.
- **SC-006**: 100% من الإجراءات المحجوبة تعرض سبباً مقروءاً بالعربية (لا أخطاء خام).
- **SC-007**: مراجعة المالك البصرية لكل وحدة: 0 مخالفات لقائمة المبدأ I (Anti-AI) قبل وسم `*-after`.
- **SC-008**: 100% من الوحدات لها لقطات فحص بصري على 3 مقاسات + داكن في `docs/visual-checks/`.
- **SC-009**: صفر تسرب بيانات بين متجرين في نفس المتصفح (اختبار تبديل متجر مع كاش ساخن).
- **SC-010**: 90% من المستخدمين الجدد (5 تجار اختبار) يُكملون «إضافة منتج» و«تغيير حالة طلب» من أول محاولة بلا مساعدة.

## Assumptions

- السوق الأول: التاجر العربي في الخليج واليمن؛ العملة الافتراضية للعرض `SAR`، مع دعم `USD`, `YER_OLD`, `YER_NEW` كما في الباك إند.
- الإصدار الأول عربي RTL فقط؛ الإنجليزية LTR لاحقاً عبر نفس المكونات (مفتاح اللغة يُخفى حتى توفر الترجمة).
- الباك إند الحالي يبقى كما هو؛ الواجهة تتصل عبر وكيل same-origin يحافظ على الكوكي، وكل ما يغيب من `/api/v1` يُبنى على Mock بنفس العقد المقترح ويُعلَّم `[NEEDS BACKEND]`.
- العملاء بلا حسابات (هاتف + OTP واتساب) — لا تُبنى صفحات تسجيل/دخول للمشترين.
- لوحة إدارة المنصة (M20/M45/M46) لوحة تشغيلية تغطي العمليات اليومية؛ Django admin يبقى للعمليات النادرة منخفضة المستوى.
- الاشتراكات والعمولات معطّلة حالياً في المنصة (`subscriptions_enabled=false`)؛ الواجهة تتعامل مع الحالتين.
- ترتيب التنفيذ: P1 أولاً (M01 ثم M47/M03 ثم M02 ثم M04/M05/M06 ثم M09–M12 ثم M34)، ثم P2، ثم P3؛ كل وحدة بنقطتي استعادة قبل/بعد.
- يعتمد على: الوصول للباك إند التجريبي (`API_PROXY_URL`)، ومتغيرات `TENANT_BASE_DOMAIN`, `VAPID_PUBLIC_KEY`.

## Module Index — فهرس الوحدات الـ 49

| # | Module spec | الوحدة | Group | P | Backend |
|---|---|---|---|---|---|
| M01 | [modules/M01-landing-page.md](modules/M01-landing-page.md) | الصفحة الترويجية | (marketing) | P1 | n/a |
| M02 | [modules/M02-merchant-onboarding.md](modules/M02-merchant-onboarding.md) | معالج تأسيس المتجر | (onboarding) | P1 | HTML-only |
| M03 | [modules/M03-dashboard-shell-overview.md](modules/M03-dashboard-shell-overview.md) | هيكل اللوحة + الرئيسية | (dashboard) | P1 | HTML-only |
| M04 | [modules/M04-products-variants.md](modules/M04-products-variants.md) | المنتجات والمتغيرات | (dashboard) | P1 | HTML-only |
| M05 | [modules/M05-categories-collections.md](modules/M05-categories-collections.md) | التصنيفات والعلامات والمجموعات | (dashboard) | P1 | جزئي |
| M06 | [modules/M06-orders-fulfillment.md](modules/M06-orders-fulfillment.md) | الطلبات والتنفيذ | (dashboard) | P1 | جزئي |
| M07 | [modules/M07-customers-crm.md](modules/M07-customers-crm.md) | العملاء | (dashboard) | P1 | HTML-only |
| M08 | [modules/M08-theme-customizer.md](modules/M08-theme-customizer.md) | مخصّص الثيم | (dashboard) | P2 | جزئي (sections Ready) |
| M09 | [modules/M09-storefront-home.md](modules/M09-storefront-home.md) | واجهة المتجر | (storefront) | P1 | Ready |
| M10 | [modules/M10-product-detail-page.md](modules/M10-product-detail-page.md) | صفحة المنتج | (storefront) | P1 | Ready جزئياً |
| M11 | [modules/M11-cart.md](modules/M11-cart.md) | السلة الجانبية | (storefront) | P1 | Ready |
| M12 | [modules/M12-checkout.md](modules/M12-checkout.md) | إتمام الطلب | (storefront) | P1 | HTML-only |
| M13 | [modules/M13-marketing-hub.md](modules/M13-marketing-hub.md) | التسويق | (dashboard) | P2 | HTML-only |
| M14 | [modules/M14-payments-wallets-payouts.md](modules/M14-payments-wallets-payouts.md) | الدفع والمحافظ | (dashboard) | P2 | HTML-only |
| M15 | [modules/M15-shipping-zones-couriers.md](modules/M15-shipping-zones-couriers.md) | الشحن والتوصيل | (dashboard) | P2 | HTML-only |
| M16 | [modules/M16-pos-interface.md](modules/M16-pos-interface.md) | نقاط البيع | (pos) | P3 | HTML-only |
| M17 | [modules/M17-affiliates-influencers.md](modules/M17-affiliates-influencers.md) | المسوقون والمؤثرون | (dashboard) | P3 | HTML-only |
| M18 | [modules/M18-staff-rbac.md](modules/M18-staff-rbac.md) | الموظفون والصلاحيات | (dashboard) | P2 | HTML-only |
| M19 | [modules/M19-domains-webhooks-integrations.md](modules/M19-domains-webhooks-integrations.md) | النطاقات والربط | (dashboard) | P2 | Absent/HTML |
| M20 | [modules/M20-super-admin-portal.md](modules/M20-super-admin-portal.md) | إدارة المنصة | (admin) | P2 | HTML-only |
| M21 | [modules/M21-inventory-stock-ledger.md](modules/M21-inventory-stock-ledger.md) | المخزون | (dashboard) | P2 | HTML-only |
| M22 | [modules/M22-locations-warehouses.md](modules/M22-locations-warehouses.md) | المواقع والمستودعات | (dashboard) | P2 | HTML-only |
| M23 | [modules/M23-suppliers-purchase-orders.md](modules/M23-suppliers-purchase-orders.md) | الموردون وأوامر الشراء | (dashboard) | P3 | HTML-only |
| M24 | [modules/M24-returns-reverse-logistics.md](modules/M24-returns-reverse-logistics.md) | المرتجعات | (dashboard) | P2 | Ready |
| M25 | [modules/M25-reports-hub.md](modules/M25-reports-hub.md) | التقارير | (dashboard) | P2 | HTML-only |
| M26 | [modules/M26-bookings-appointments.md](modules/M26-bookings-appointments.md) | الحجوزات | (dashboard)+(storefront) | P3 | HTML-only |
| M27 | [modules/M27-inbox-social-channels.md](modules/M27-inbox-social-channels.md) | الصندوق الموحَّد والقنوات | (dashboard) | P3 | HTML-only |
| M28 | [modules/M28-marketplaces.md](modules/M28-marketplaces.md) | الأسواق (أمازون/نون) | (dashboard) | P3 | HTML-only |
| M29 | [modules/M29-dropshipping-supplier-feeds.md](modules/M29-dropshipping-supplier-feeds.md) | الدروبشيبينغ | (dashboard) | P3 | HTML-only |
| M30 | [modules/M30-app-store.md](modules/M30-app-store.md) | متجر التطبيقات | (dashboard) | P3 | HTML-only |
| M31 | [modules/M31-sharwa-ai-console.md](modules/M31-sharwa-ai-console.md) | شروة AI | (dashboard) | P3 | HTML-only |
| M32 | [modules/M32-support-tickets-sessions.md](modules/M32-support-tickets-sessions.md) | الدعم | (dashboard) | P3 | HTML-only |
| M33 | [modules/M33-operating-expenses.md](modules/M33-operating-expenses.md) | المصروفات | (dashboard) | P3 | HTML-only |
| M34 | [modules/M34-store-settings-hub.md](modules/M34-store-settings-hub.md) | إعدادات المتجر | (dashboard) | P1 | HTML-only |
| M35 | [modules/M35-customer-wallets-loyalty.md](modules/M35-customer-wallets-loyalty.md) | محافظ العملاء والولاء | (dashboard) | P2 | HTML-only |
| M36 | [modules/M36-b2b-wholesale.md](modules/M36-b2b-wholesale.md) | الجملة B2B | (dashboard) | P3 | Ready |
| M37 | [modules/M37-bundles-personalization-auctions.md](modules/M37-bundles-personalization-auctions.md) | الحزم والتخصيص والمزادات | (dashboard)+(storefront) | P3 | HTML-only |
| M38 | [modules/M38-courier-agent-app.md](modules/M38-courier-agent-app.md) | تطبيق المندوب | (courier) | P3 | Ready |
| M39 | [modules/M39-sharwa-ship-waybills.md](modules/M39-sharwa-ship-waybills.md) | شروة شيب | (dashboard) | P3 | HTML-only |
| M40 | [modules/M40-sharwa-pay-wallet-pwa.md](modules/M40-sharwa-pay-wallet-pwa.md) | شروة باي | (pay) | P3 | HTML-only |
| M41 | [modules/M41-order-tracking-public.md](modules/M41-order-tracking-public.md) | تتبع الطلب العام | (storefront) | P2 | HTML-only |
| M42 | [modules/M42-wishlist-reviews-engagement.md](modules/M42-wishlist-reviews-engagement.md) | الأمنيات والتقييمات | (storefront) | P2 | HTML-only |
| M43 | [modules/M43-multi-store-rollup.md](modules/M43-multi-store-rollup.md) | تجميع المتاجر المتعددة | (dashboard) | P3 | HTML-only |
| M44 | [modules/M44-pwa-web-push.md](modules/M44-pwa-web-push.md) | PWA والإشعارات | (storefront) | P3 | Ready |
| M45 | [modules/M45-platform-dues-console.md](modules/M45-platform-dues-console.md) | مستحقات المنصة | (admin) | P3 | HTML-only |
| M46 | [modules/M46-plans-features-admin.md](modules/M46-plans-features-admin.md) | الباقات والميزات | (admin) | P3 | Absent |
| M47 | [modules/M47-tenant-resolution-provisioning.md](modules/M47-tenant-resolution-provisioning.md) | حلّ المستأجر والتجهيز | middleware | P1 | Ready |
| M48 | [modules/M48-command-palette-search.md](modules/M48-command-palette-search.md) | لوحة الأوامر والبحث | cross-cutting | P1 | Absent |
| M49 | [modules/M49-notifications-center.md](modules/M49-notifications-center.md) | مركز التنبيهات | cross-cutting | P2 | Absent |
