# M35 — محافظ العملاء ونقاط الولاء (Customer Wallets & Loyalty Points — merchant side)

**Route group**: `(dashboard)` · **Priority**: P2 · **Backend status**: HTML-only `[NEEDS BACKEND]` (`customer_wallets_list`, `wallet_create`, `wallet_detail`, `wallet_topup`, `loyalty_settings`؛ لا endpoint في `/api/v1`) · **Features**: `customer_wallets`, `loyalty_settings`
**Discovery refs**: `02-products-domain-model.md` §5 (Loyalty: `LoyaltyProgram`, `CustomerPoints`, `CustomerPointsTransaction`), §12 (Wallets: `Wallet`, `WalletTransaction`), §3 (`OrderRefund.method=wallet|wallet_credit`, `Order.wallet_amount_used`) · `03-api-payments-shipping-theme-integrations.md` §3 (Customer `Wallet` SAR only، `REASON` 6 قيم) · `01-tenants-dashboard-admin.md` §3.2 (Customers), §4 (محافظ العملاء `[customer_wallets]`) · **Benchmarks**: Stripe Customer Balances (دفتر رصيد append-only بسبب لكل سطر، رصيد بعد كل حركة)، Shopify Store Credit (إضافة رصيد بسبب وملاحظة)، Linear (جدول نظيف بلا بطاقات)

## 1. الهدف (Purpose)

تمكين التاجر من إدارة الرصيد المسبق لعملائه (المحفظة بالريال السعودي، مفتاحها رقم الهاتف) ونقاط الولاء من مكان واحد: من يملك رصيداً، من أين جاء، وأين أُنفق؛ مع تعبئة يدوية موثَّقة ومسار قراءة لنقاط الولاء. يُقاس بنسبة الحركات التي لها سبب واضح (100%) وزمن تعبئة محفظة.

## 2. الفاعلون (Actors)

- **مالك المتجر**: يُنشئ المحافظ، يعبّئ، يرى كل الحركات والنقاط، ويعدّل إعدادات الولاء (M13).
- **موظف** بصلاحية `customers.view`: قراءة الأرصدة والحركات؛ بصلاحية `customers.edit_profile`: تعبئة يدوية (انظر §10).
- **العميل** (غير مباشر): يستخدم رصيده في الدفع (`use_wallet` + OTP في M12) ويكسب/يستبدل النقاط.
- **النظام**: يكتب `order_payment` · `refund` · `loyalty_redeem` تلقائياً من الطلبات والاسترجاعات.

## 3. قصص المستخدم (User Stories)

### US-35.1 — قائمة المحافظ (P1)
يفتح التاجر «محافظ العملاء» فيرى جدولاً: الهاتف (Mono)، اسم العميل، الرصيد (من الخادم، Mono)، آخر حركة، عدد الحركات؛ مع بحث بالهاتف/الاسم وترتيب بالرصيد.
**Independent Test**: 300 محفظة وهمية؛ بحث `0777` يُعيد المطابقات فقط؛ الرابط يحمل `q` و`sort`.
**Acceptance**:
1. **Given** محافظ، **When** تُفتح القائمة، **Then** يظهر شريط نصّي أعلى الجدول: «مجموع الأرصدة» و«محافظ نشطة» كنصوص من الخادم بخط Mono، لا بطاقات.
2. **Given** صف، **When** يُضغط، **Then** تُفتح التفاصيل في sheet دون مغادرة القائمة.

### US-35.2 — إنشاء محفظة وتعبئة يدوية (P1)
يضغط التاجر «محفظة جديدة» فيُدخل الهاتف (يُطبَّع إلى الصيغة الدولية كما في الباك إند: `0770841802 → 967770841802`) واسماً اختيارياً؛ ثم من التفاصيل يعبّئ بمبلغ وسبب (`manual_topup` · `reward` · `adjustment`) وملاحظة.
**Acceptance**:
1. **Given** هاتف له محفظة، **When** يُنشئ، **Then** يرد الخادم 400 وتُعرض «توجد محفظة لهذا الرقم» مع رابط فتحها.
2. **Given** تعبئة 50 بسبب `manual_topup`، **When** تُرسل، **Then** يُحدَّث الرصيد من الاستجابة وتظهر الحركة أولاً في الدفتر مع `balance_after`.
3. **Given** سبب `adjustment` بمبلغ سالب، **Then** الملاحظة إلزامية ويُطلب تأكيد «سيُخصم من رصيد العميل».
4. **Given** بلا صلاحية التعبئة، **Then** الزر معطّل بتلميح.

### US-35.3 — دفتر حركات المحفظة (P1)
في التفاصيل يرى التاجر `WalletTransaction` مرتبة زمنياً: النوع (إضافة/خصم)، المبلغ، السبب (6)، المرجع (طلب/استرجاع)، الرصيد بعد، الفاعل، التاريخ؛ مع فلتر بالسبب.
**Acceptance**:
1. **Given** حركة `order_payment`، **When** يُضغط المرجع، **Then** يُفتح الطلب في M06.
2. **Given** فلتر `reason=refund`، **Then** يعيش في الرابط ويُعرض العدد.

### US-35.4 — نقاط الولاء للعميل (P2)
في تبويب «النقاط» يرى التاجر رصيد `CustomerPoints` للهاتف نفسه وحركاته (`earn` · `redeem`) مع المرجع؛ وفي أعلى الصفحة ملخص إعدادات البرنامج (مفعّل؟، ريالات لكل نقطة، نقاط لكل ريال استبدال، الحد الأدنى) للقراءة مع رابط «تعديل في برنامج الولاء» (M13).
**Acceptance**:
1. **Given** `LoyaltyProgram.is_enabled=false`، **Then** يُعرض التبويب برسالة «برنامج الولاء غير مفعّل» ورابط التفعيل، وتبقى الحركات التاريخية مقروءة.
2. **Given** حركة `redeem`، **Then** تُعرض مع حركة المحفظة المقابلة `loyalty_redeem` إن وُجدت (رابط متبادل).

### US-35.5 — قائمة أرصدة النقاط (P2)
صفحة مستقلة تعرض كل `CustomerPoints` بالهاتف والرصيد وآخر كسب، مع بحث؛ للقراءة فقط (الكسب والاستبدال من النظام).

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-35.01**: القائمة MUST تدعم ترقيماً خادمياً (50/صفحة)، بحث `q` (هاتف/اسم)، ترتيب `sort` (`balance`, `last_transaction_at`)؛ كلها في الرابط.
- **FR-35.02**: الأرصدة والمبالغ MUST تُعرض كما يرسلها الخادم (`display_balance`, `display_amount`)؛ العملة ثابتة `SAR` ولا يُعرض محوّل عملات.
- **FR-35.03**: التعبئة اليدوية MUST ترسل `{amount, reason, note}` مع `reason` ∈ {`manual_topup`, `reward`, `adjustment`} فقط؛ الأسباب النظامية (`refund`, `order_payment`, `loyalty_redeem`) للقراءة.
- **FR-35.04**: الهاتف MUST يُتحقق محلياً من الصيغة ويُعرض بالصيغة الدولية المُطبَّعة من الخادم بعد الحفظ.
- **FR-35.05**: دفتر الحركات MUST يكون append-only في الواجهة: لا تعديل ولا حذف لأي سطر.
- **FR-35.06**: الوحدة MUST تُخفى بلا `features.customer_wallets`؛ تبويب النقاط يُخفى بلا `features.loyalty_settings`.
- **FR-35.07**: التفاصيل MUST تعمل كـ sheet من القائمة وكصفحة كاملة بنفس المكوّن.
- **FR-35.08**: ملخص إعدادات الولاء MUST يُقرأ من الخادم ويُعرض للقراءة فقط هنا؛ التعديل في M13.
- **FR-35.09**: التعبئة MUST تكون idempotent من جهة الواجهة (تعطيل الزر حتى الاستجابة؛ مفتاح `idempotency_key` إن وفّره الخادم).
- **FR-35.10**: ملف العميل (M07) MUST يعرض رصيد المحفظة والنقاط برابط إلى هذه الوحدة.

## 5. الكيانات والحالات (Key Entities & States)

- **Wallet** (لكل متجر، SAR فقط): `customer_phone` (مفتاح)، `customer_name`, `balance`, `is_active`, `created_at`.
- **WalletTransaction** (append-only): `wallet`, `amount` (±)، `reason` ∈ `manual_topup` تعبئة يدوية · `refund` استرجاع · `reward` مكافأة · `order_payment` دفع طلب · `adjustment` تسوية · `loyalty_redeem` استبدال نقاط؛ `balance_after`, `reference` (طلب/استرجاع)، `actor`, `created_at`.
- **LoyaltyProgram** (singleton): `is_enabled`, `riyals_per_point` (افتراضي 10), `points_per_riyal_redemption` (افتراضي 10), `min_points_to_redeem`.
- **CustomerPoints**: `customer_phone`, `balance`. **CustomerPointsTransaction**: `type` ∈ `earn` كسب · `redeem` استبدال؛ `points`, `order`, `created_at`.
- قواعد: الرصيد لا يُحسب محلياً من الحركات؛ `adjustment` السالب لا يُسمح له بتجاوز الرصيد (الخادم يرد 400).

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/customers/wallets` (قائمة + sheet) · `/dashboard/customers/wallets/new` · `/dashboard/customers/wallets/[id]` (تبويبات: الحركات / النقاط) · `/dashboard/customers/points` (قائمة النقاط).
- **الحالات البصرية**: skeleton · فراغ «لا محافظ بعد — أنشئ محفظة لعميل أو فعّل الدفع بالمحفظة» · بحث بلا نتائج · خطأ · بلا صلاحية · الميزة معطّلة · الولاء غير مفعّل (داخل التبويب).
- **الجوال**: القائمة بطاقات (هاتف Mono، اسم، رصيد كبير Mono)؛ التعبئة في drawer سفلي بلوحة أرقام؛ التبويبات تمرير أفقي.
- **اختصارات**: `⌘K` «محفظة: <هاتف>» · `T` تعبئة من التفاصيل · `N` محفظة جديدة.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| قائمة المحافظ | `customer_wallets_list` HTML | `[NEEDS BACKEND]` → `GET /api/v1/customers/wallets/?q&sort&page&page_size` → `{count, totals:{display_balance_sum, active_count}, results:[{id, customer_phone, customer_name, display_balance, is_active, last_transaction_at, transactions_count}]}` |
| إنشاء محفظة | `wallet_create` POST | `[NEEDS BACKEND]` → `POST /api/v1/customers/wallets/` `{customer_phone, customer_name?}` → 201 / 400 `{customer_phone:[msg]}` |
| تفاصيل | `wallet_detail` HTML | `[NEEDS BACKEND]` → `GET /api/v1/customers/wallets/<id>/` → `{…wallet, points:{balance}?}` |
| تعبئة/تسوية | `wallet_topup` POST | `[NEEDS BACKEND]` → `POST /api/v1/customers/wallets/<id>/topup/` `{amount, reason: manual_topup\|reward\|adjustment, note, idempotency_key?}` → `{display_balance, transaction:{…}}` |
| حركات المحفظة | ضمن `wallet_detail` | `[NEEDS BACKEND]` → `GET /api/v1/customers/wallets/<id>/transactions/?reason&from&to&page` → `{count, results:[{id, amount, display_amount, reason, reference:{type, id, label}, display_balance_after, actor, created_at}]}` |
| إعدادات الولاء (قراءة) | `loyalty_settings` HTML | `[NEEDS BACKEND]` → `GET /api/v1/loyalty/program/` → `{is_enabled, riyals_per_point, points_per_riyal_redemption, min_points_to_redeem}` (مشترك مع M13) |
| نقاط العميل | نموذج فقط | `[NEEDS BACKEND]` → `GET /api/v1/loyalty/points/?q&page`, `GET /api/v1/loyalty/points/<phone>/transactions/?type&page` → `{balance, results:[{id, type, points, order_id, created_at}]}` |

## 8. الحالات الحدّية (Edge Cases)

- هاتف بصيغة محلية مختلفة (`+967`, `00967`, `0770…`): يُطبَّع محلياً للعرض ويُرسل كما أُدخل؛ الخادم المرجع للتطبيع والتفرد.
- محفظة `is_active=false`: تُعرض بشارة «معطّلة» والتعبئة محجوبة بتلميح.
- حركة `refund` بمرجع طلب محذوف/مؤرشف: يُعرض المرجع نصاً بلا رابط.
- عميل له نقاط بلا محفظة: صفحة النقاط تعرضه، وصفحة المحافظ تقترح «إنشاء محفظة» من هناك.
- تعبئة أثناء انقطاع الشبكة: لا إعادة تلقائية؛ تُعرض «تحقق من الدفتر قبل إعادة المحاولة» مع إعادة تحميل الحركات.
- عملة لوحة التاجر غير SAR: يُعرض تنويه ثابت «محافظ العملاء بالريال السعودي فقط» في رأس الصفحة.

## 9. معايير النجاح (Success Criteria)

- **SC-35.1**: تعبئة محفظة من القائمة ≤ 4 نقرات / ≤ 15 ثانية.
- **SC-35.2**: 100% من الحركات لها سبب من الستة ومرجع أو فاعل.
- **SC-35.3**: 0 أرصدة محسوبة أو منسَّقة محلياً تختلف عن الخادم.
- **SC-35.4**: البحث بالهاتف يُظهر النتيجة الأولى في < 500ms على 300 محفظة.
- **SC-35.5**: 0 عمليات تعبئة مكررة في اختبار النقر المزدوج.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M03، M07 (ملف العميل)، M13 (إعدادات الولاء)، M12 (الدفع بالمحفظة)، M06/M24 (مراجع الطلب والاسترجاع)، M18 (الصلاحيات).
- افتراض: لا مفتاح صلاحية مخصص للمحافظ ضمن المفاتيح الـ 35؛ تُحجب التعبئة في الواجهة على `customers.edit_profile` والقراءة على `customers.view`، والخادم المرجع النهائي.
- افتراض: الخادم يعيد `display_*` للمبالغ كما في بقية الواجهة؛ لا تنسيق محلي.
- افتراض: `idempotency_key` اختياري حتى يعتمده الخادم؛ تعطيل الزر هو الحماية الأولى.
- افتراض: محافظ SharwaPay (M40) كيان مستقل على المخطط العام؛ هذه الوحدة لمحافظ المتجر فقط.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا بطاقات «مجموع الأرصدة / محافظ نشطة / نقاط» متماثلة؛ شريط نصّي Mono واحد. الإضافة/الخصم بعلامة ونص دلالي (`emerald`/`red`) لا بخلفيات.
- II: الهواتف والمبالغ والنقاط Mono محاذاة نهاية؛ العملة بعد الرقم كما يرسلها الخادم؛ أسهم فتح التفاصيل تنعكس.
- IV: لقطات `docs/visual-checks/35-wallets/` للقائمة، التفاصيل بالدفتر، drawer التعبئة على الجوال، تبويب النقاط، الداكن.
- IX: مفاتيح الكاش `[tenant, 'wallets', …]`؛ invalidation للقائمة والتفاصيل بعد التعبئة؛ الفلاتر عبر nuqs؛ Zod لكل استجابة.
