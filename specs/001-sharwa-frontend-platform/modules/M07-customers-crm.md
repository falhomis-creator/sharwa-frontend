# M07 — العملاء وإدارة العلاقات (Customers & CRM)

**Route group**: `(dashboard)` · **Priority**: P1 · **Backend status**: HTML-only (`customer_report`, `customer_wallets_list`, `staff_export_customers`) `[NEEDS BACKEND]`؛ لا جدول عملاء — الكيان مُشتق من الطلبات
**Discovery refs**: `01-tenants-dashboard-admin.md` §2.4 (`CentralCustomerTrust`)، §3.2 (Customers)، §4 (مجموعة «العملاء») · `02-products-domain-model.md` §5 (`AUDIENCE_TYPE`، `CustomerPoints`)، §7 (`CustomerReliabilityRecord`)، §10 (`customers.*`, `BehaviorAlert`)، §12 (`Wallet`, `WalletTransaction`)، §13 (`ProductReview`, `WishlistItem`, `BackInStockNotification`) · `03-*.md` §2 (العملاء بلا حسابات، تطبيع الهاتف) · **Benchmarks**: Shopify Customers (ملف عميل بجدول زمني وملاحظات وشرائح)، Stripe Customers (قائمة كثيفة، بحث فوري، أرقام Mono)، Intercom (ملاحظات داخلية خفيفة)

## 1. الهدف (Purpose)

إعطاء التاجر صورة واحدة لكل عميل مُعرَّف برقم هاتفه — طلباته، ثقته في الدفع عند الاستلام، محفظته، نقاطه، أمنياته، تقييماته — ليقرّر بسرعة: هل أقبل طلب COD هذا؟ من أراسله في الحملة؟ تُقاس بزمن الوصول إلى ملف العميل من أي سياق وبدقة قرارات COD.

## 2. الفاعلون (Actors)

- **مالك المتجر**: كل شيء بما فيه التصدير.
- **موظف** بصلاحيات `customers.view` / `customers.edit_profile` / `customers.manage_tier` / `customers.export`.
- **النظام**: يحدّث `CentralCustomerTrust` (عبر المتاجر)، `CustomerReliabilityRecord` (داخل المتجر)، `CustomerPoints`، ويرصد `BehaviorAlert` (`export_volume`, `view_volume`).
- **العميل** (غير مباشر): لا حساب؛ هاتف + OTP واتساب في المتجر.

## 3. قصص المستخدم (User Stories)

### US-07.1 — قائمة العملاء كجدول عمل (P1)
يفتح التاجر «العملاء» فيرى جدولاً كثيفاً: الاسم (آخر اسم مستخدم)، الهاتف Mono، عدد الطلبات Mono، إجمالي الإنفاق Mono، آخر طلب (نسبي)، ثقة COD (نسبة Mono + كلمة)، رصيد المحفظة، النقاط؛ مع بحث بالهاتف/الاسم وفلاتر الشريحة.
**Independent Test**: 2000 عميل وهمي، بحث `77084`، فلتر «خامل» → النتائج والرابط قابلان للمشاركة.
**Acceptance**:
1. **Given** 2000 عميل، **When** تُفتح القائمة، **Then** أول 50 في < 1s بعد skeleton، والبحث بالهاتف يقبل `0770841802` ويطابق `967770841802`.
2. **Given** فلتر الشريحة `dormant` (لم يشترِ منذ 90 يوماً)، **Then** يتغيّر الرابط والعدد، ويمكن «إنشاء حملة لهذه الشريحة» → M13 بنفس الفلتر.
3. **Given** صف، **When** يُضغط Enter، **Then** يُفتح ملف العميل كـ sheet جانبي؛ `⌘K` ورقم هاتف يفتحه مباشرة.

### US-07.2 — ملف العميل (P1)
يرى الموظف: رأس (الاسم، الهاتف Mono مع زر واتساب، أول/آخر طلب)، شريط أرقام (الطلبات، الإنفاق، المسترد، متوسط السلة)، مؤشر ثقة COD، ثم تبويبات: الطلبات، المحفظة، النقاط، الأمنيات، التقييمات، الملاحظات.
**Acceptance**:
1. **Given** `CentralCustomerTrust{successful_cod_orders:12, failed_cod_orders:3, risk_percentage:20}`، **Then** يُعرض «ثقة الدفع عند الاستلام: 80% — 12 ناجح / 3 فاشل عبر المنصة» بلون دلالي للنسبة فقط، مع تمييز «عبر المنصة» عن «في متجرك» (`CustomerReliabilityRecord.cod_refusals_count`).
2. **Given** `cod_disabled=true`، **Then** شارة نصّية «الدفع عند الاستلام موقوف لهذا العميل» وزر «إعادة التفعيل» لمن يملك `customers.edit_profile`.
3. **Given** تبويب الطلبات، **Then** صفوف M06 المصغّرة (رقم Mono، الإجمالي، المحورَان) تفتح الطلب في sheet M06.
4. **Given** تبويب المحفظة، **Then** الرصيد بالريال السعودي Mono كما يرسله الخادم، وآخر 10 حركات (`manual_topup` · `refund` · `reward` · `order_payment` · `adjustment` · `loyalty_redeem`) ورابط «إدارة المحفظة» → M35.
5. **Given** تبويب النقاط، **Then** `balance` Mono وحركات `earn`/`redeem` وما يعادله بالريال من قواعد `LoyaltyProgram` (`points_per_riyal_redemption`).
6. **Given** تبويب التقييمات، **Then** كل `ProductReview` (`rating` 1–5 كأرقام لا نجوم ملونة كبيرة، النص، `admin_reply`) مع حقل ردّ.

### US-07.3 — الملاحظات الداخلية (P2)
**Acceptance**:
1. **Given** ملاحظة جديدة، **When** تُحفظ، **Then** تظهر في الأعلى باسم الكاتب والوقت، ولا تظهر للعميل في أي مكان.

### US-07.4 — التصدير المُراقَب (P2)
**Acceptance**:
1. **Given** موظف بلا `customers.export`، **Then** زر التصدير مخفي.
2. **Given** موظف يملكها، **When** يصدّر، **Then** حوار يوضّح «يُسجَّل هذا التصدير في سجل التدقيق ويخضع لتنبيهات الحجم» ثم CSV بالفلاتر الحالية.
3. **Given** `BehaviorAlert` بمستوى `critical` لهذا الموظف من نوع `export_volume`، **Then** يُعطَّل التصدير مع «تجاوزت حدّ التصدير اليومي، راجع مدير المتجر».

### US-07.5 — الشرائح (P2)
**Acceptance**:
1. **Given** الشرائح المتاحة (`all` · `abandoned_carts` · `dormant` · `bought_product`)، **When** تُختار `bought_product`، **Then** يظهر حقل اختيار منتج (بحث M04) ويُحدَّث العدد فوراً.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-07.01**: الوحدة MUST تعامل العميل ككيان مُشتق مفتاحه `customer_phone` المطبَّع؛ لا إنشاء عميل يدوي بلا طلب (لا نموذج `Customer` في الباك إند).
- **FR-07.02**: القائمة MUST تدعم ترقيماً خادمياً (50)، ترتيباً، بحثاً بالهاتف (بتطبيع `0X… → 967X…`) والاسم، وفلاتر: الشريحة، نطاق آخر طلب، حد الإنفاق، ثقة COD (`< 50%`، `50–80%`، `> 80%`)، له محفظة، له نقاط؛ كلها في الرابط.
- **FR-07.03**: ثقة COD MUST تُعرض دائماً بمصدرَيها منفصلَين: المنصة (`CentralCustomerTrust`) والمتجر (`CustomerReliabilityRecord`)؛ يُمنع دمجهما في رقم واحد.
- **FR-07.04**: المبالغ MUST تُعرض كما يرسلها الخادم (`display_*`) Mono محاذاة نهاية؛ رصيد المحفظة بالريال السعودي فقط (`Wallet` SAR).
- **FR-07.05**: ملف العميل MUST يعمل كـ sheet من القائمة وكصفحة كاملة `/dashboard/customers/[phone]` بنفس المكوّن.
- **FR-07.06**: الهاتف MUST يُعرض بصيغته المطبَّعة Mono مع زر «واتساب» يفتح `wa.me/<phone>` في تبويب جديد وزر نسخ.
- **FR-07.07**: التصدير MUST يُقيَّد بـ `customers.export`، ويُعطَّل عند `BehaviorAlert critical` من نوع `export_volume`، ويُسجَّل في `AuditLog`.
- **FR-07.08**: الملاحظات MUST تكون داخلية فقط، مرتبة زمنياً، بكاتب ووقت، قابلة للحذف من كاتبها أو المالك.
- **FR-07.09**: الشرائح MUST تطابق `AUDIENCE_TYPE` حرفياً وتُمرَّر إلى M13 كمعاملات حملة بلا إعادة تعريف.
- **FR-07.10**: إعادة تفعيل COD (`cod_disabled=false`) MUST تتطلب `customers.edit_profile` وتأكيداً نصّياً وتُسجَّل في التدقيق.
- **FR-07.11**: الوحدة MUST تحترم الصلاحيات: بلا `customers.view` لا تظهر في الشريط؛ `customers.manage_tier` يظهر قسم «الفئة/الجملة» (M36) داخل الملف.
- **FR-07.12**: عرض الملفات MUST يُحسب ضمن `view_volume`؛ عند تنبيه `warning` يُعرض شريط هادئ للموظف «نشاطك مرتفع اليوم» دون منع.

## 5. الكيانات والحالات (Key Entities & States)

- **Customer** (مُشتق): `phone` (مفتاح، مطبَّع)، `name` (آخر طلب)، `email?`, `orders_count`, `display_total_spent`, `display_refunded`, `first_order_at`, `last_order_at`, `segment_flags[]`.
- **CentralCustomerTrust** (منصة): `phone_number`, `successful_cod_orders`, `failed_cod_orders`, `risk_percentage`.
- **CustomerReliabilityRecord** (متجر): `cod_refusals_count`, `cod_disabled`.
- **Wallet** (SAR): `display_balance`؛ **WalletTransaction**: `reason` ∈ `manual_topup` · `refund` · `reward` · `order_payment` · `adjustment` · `loyalty_redeem`.
- **CustomerPoints**: `balance`؛ **CustomerPointsTransaction**: `earn` · `redeem`.
- **WishlistItem** (بالهاتف): المنتج، التاريخ. **BackInStockNotification**: المنتج، أُرسل؟
- **ProductReview**: `rating` 1–5، النص، `admin_reply`.
- **CustomerNote** (مقترح `[NEEDS BACKEND]`): `body`, `author`, `created_at`.
- **Segment**: `all` الكل · `abandoned_carts` سلات متروكة · `dormant` خامل · `bought_product` اشترى منتجاً.
- **BehaviorAlert**: `level` `warning` · `critical`؛ النوع `export_volume` · `view_volume` · `message_volume`.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/customers` (قائمة + sheet) · `/dashboard/customers/[phone]` (ملف كامل بتبويبات `?tab=orders|wallet|points|wishlist|reviews|notes`) · `/dashboard/customers/wallets` (قائمة المحافظ، تملكها M35 وتُربط من هنا).
- **الحالات البصرية**: skeleton صفوف 44px · فراغ «لا عملاء بعد — يظهر العميل بعد أول طلب» · خطأ شبكة · بلا صلاحية · فلتر بلا نتائج · ميزة `customer_report` معطّلة (تُخفى القائمة من الشريط) · تنبيه سلوكي `warning`/`critical`.
- **الجوال**: الجدول → بطاقات (اسم، هاتف Mono، طلبات، ثقة COD)، الفلاتر في drawer سفلي، الملف صفحة كاملة بتبويبات قابلة للتمرير أفقياً.
- **اختصارات**: `⌘K` بحث برقم هاتف · `J/K` تنقّل · `Enter` فتح · `W` واتساب · `N` ملاحظة جديدة.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| قائمة العملاء المشتقة | `customer_report` HTML | `[NEEDS BACKEND]` → `GET /api/v1/customers/?q&segment&product_id&last_order_from&last_order_to&min_spent&trust&has_wallet&has_points&ordering&page&page_size` → `{count, results:[{phone, name, orders_count, display_total_spent, last_order_at, trust:{platform_risk_percentage}, display_wallet_balance, points_balance}]}` |
| ملف العميل | `customer_report` HTML (تفاصيل) | `[NEEDS BACKEND]` → `GET /api/v1/customers/<phone>/` → `{phone, name, email, first_order_at, last_order_at, orders_count, display_total_spent, display_refunded, display_avg_basket, trust:{platform:{successful_cod_orders, failed_cod_orders, risk_percentage}, store:{cod_refusals_count, cod_disabled}}, wallet:{display_balance}, points:{balance}}` |
| طلبات العميل | `order_list?q=<phone>` HTML | `[NEEDS BACKEND]` → `GET /api/v1/orders/?customer_phone=<phone>` (عقد M06) |
| حركات المحفظة | `wallet_detail` HTML | `[NEEDS BACKEND]` → `GET /api/v1/customers/<phone>/wallet/transactions/?page` → `[{reason, display_amount, display_balance_after, created_at}]` (M35) |
| حركات النقاط | `CustomerPointsTransaction` (نموذج) | `[NEEDS BACKEND]` → `GET /api/v1/customers/<phone>/points/` → `{balance, transactions:[{type, points, order_id?, created_at}]}` |
| الأمنيات وإشعارات التوفر | `WishlistItem`, `BackInStockNotification` (نماذج) | `[NEEDS BACKEND]` → `GET /api/v1/customers/<phone>/wishlist/` → `[{product:{id,name,image,display_price,stock}, added_at, back_in_stock_requested}]` |
| التقييمات والردّ | `ProductReview.admin_reply` عبر HTML | `[NEEDS BACKEND]` → `GET /api/v1/customers/<phone>/reviews/`؛ `PATCH /api/v1/reviews/<id>/` `{admin_reply}` |
| الملاحظات | غير موجود | `[NEEDS BACKEND]` → `GET/POST /api/v1/customers/<phone>/notes/` `{body}`؛ `DELETE /notes/<id>/` |
| إعادة تفعيل/إيقاف COD | `CustomerReliabilityRecord` (نموذج) | `[NEEDS BACKEND]` → `POST /api/v1/customers/<phone>/cod/` `{cod_disabled: bool, reason}` → 200 (صلاحية `customers.edit_profile`) |
| التصدير | `staff_export_customers` | `[NEEDS BACKEND]` → `GET /api/v1/customers/export.csv?<نفس الفلاتر>` → CSV / 403 / 429 عند `critical` |
| عدد الشريحة الحيّ | ضمن `CampaignForm` | `[NEEDS BACKEND]` → `GET /api/v1/customers/segments/count/?segment&product_id` → `{count}` |
| حالة التنبيهات السلوكية للموظف الحالي | `behavior_alerts` HTML | `[NEEDS BACKEND]` → ضمن `GET /api/v1/auth/me/` (M03) حقل `behavior:{export: none|warning|critical, view: …}` |

## 8. الحالات الحدّية (Edge Cases)

- عميل بأسماء مختلفة في طلبات مختلفة: يُعرض آخر اسم مع تلميح «أسماء أخرى مستخدمة: …».
- هاتف بصيغ متعددة في الطلبات القديمة (غير مطبَّعة): الخادم يطبّع عند التجميع؛ الواجهة تبحث بالصيغة المطبَّعة فقط.
- عميل بلا `CentralCustomerTrust` (لم يطلب COD قط): يُعرض «لا بيانات ثقة بعد» لا 0%.
- محفظة غير موجودة: «لا محفظة» مع زر «إنشاء محفظة» → M35 (مع `customer_wallets`).
- `LoyaltyProgram.is_enabled=false`: تبويب النقاط يُعرض للقراءة مع «برنامج الولاء غير مفعّل».
- عميل من قناة سوق خارجي (`amazon`/`noon`) بهاتف مقنَّع: يُعرض «هاتف غير متاح من السوق» وتُعطَّل أزرار واتساب.
- تصدير أثناء `warning`: يُسمح مع تذكير؛ أثناء `critical`: يُمنع.
- حذف ملاحظة من كاتب آخر: مخفي لغير المالك.

## 9. معايير النجاح (Success Criteria)

- **SC-07.1**: الوصول إلى ملف عميل من رقم هاتف ≤ 5 ثوانٍ عبر ⌘K.
- **SC-07.2**: 100% من عروض ثقة COD تُظهر المصدرَين منفصلَين؛ 0 أرقام مدمجة.
- **SC-07.3**: القائمة بـ 50 صفاً في < 1s؛ البحث بالهاتف يرد في < 400ms من كاش دافئ.
- **SC-07.4**: 0 تصديرات من موظفين بلا `customers.export`؛ 100% من التصديرات مسجّلة.
- **SC-07.5**: رابط شريحة مشترك يُنتج نفس العدد والنتائج على جهاز آخر.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M03 (الهيكل، `/auth/me/` مع حالة التنبيهات)، M06 (صفوف الطلبات وsheet)، M13 (الحملات والشرائح)، M18 (الصلاحيات، التدقيق، التنبيهات السلوكية)، M35 (المحافظ)، M36 (فئات الجملة)، M42 (مصدر الأمنيات والتقييمات)، M48 (⌘K).
- افتراض: «خامل» = لا طلب منذ 90 يوماً (قيمة واجهة قابلة للضبط؛ الباك إند يعرّف `dormant` بلا رقم موثَّق).
- افتراض: الملاحظات كيان جديد مقترح؛ حتى توفره تُخفى التبويبة (لا تخزين محلي لبيانات العملاء).
- افتراض: `customers.manage_tier` يخص فئات الجملة (M36) لا ثقة COD؛ إيقاف/تفعيل COD تحت `customers.edit_profile`.
- افتراض: كل الأرقام المالية في القائمة والملف تأتي منسّقة من الخادم؛ لا حساب متوسط سلة محلياً.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I (Anti-AI): لا بطاقات KPI متماثلة في رأس الملف؛ شريط أرقام Mono واحد مفصول بحدود 1px. ثقة COD نسبة Mono + كلمة بلون دلالي للنص فقط، لا مقياس دائري ولا شريط تقدم ملون. التقييم أرقام `4/5` لا نجوم ذهبية كبيرة. لا avatar بأحرف على خلفية ملونة (دائرة بحد 1px ورمز Lucide `user`).
- II (RTL): الهاتف ورقم الطلب والمبالغ والنقاط بخط Geist Mono `tabular-nums`، الهاتف في `dir="ltr"` معزول، أعمدة الجدول تبدأ من اليمين، أيقونة «فتح في واتساب» الخارجية تنعكس.
- IV (Visual check): لقطات `docs/visual-checks/07-customers/` للقائمة (فارغة/ممتلئة/فلتر)، الملف بالتبويبات الست، حالة `cod_disabled`، تنبيه `critical`، الجوال، الداكن.
- IX (State): الفلاتر والشريحة والتبويب في الرابط عبر nuqs؛ TanStack Query بمفاتيح المستأجر ومفتاح الهاتف المطبَّع؛ لا بيانات عملاء في localStorage؛ Zod على كل استجابة؛ الهاتف لا يمرّ أبداً في query string إلا كمعامل بحث `q` من إدخال المستخدم.
