# M03 — هيكل لوحة التاجر والنظرة العامة (Dashboard Shell + Overview)

**Route group**: `(dashboard)` · **Priority**: P1 · **Backend status**: HTML-only للدخول والنظرة العامة `[NEEDS BACKEND]`؛ الشريط العلوي (topbar) غائب كلياً في الباك إند `[NEEDS BACKEND]`
**Discovery refs**: `01-tenants-dashboard-admin.md` §3.2 (Dashboard auth، Overview)، §4 (الشريط الجانبي حرفياً)، §7 (مفاتيح الميزات 39)، §9 (الفجوات: لا topbar) · `02-products-domain-model.md` §10 (مفاتيح الصلاحيات 35)، §12 (`DailyStoreMetrics`) · `03-*.md` §2 (جلسة التاجر، CSRF، 503) · **Benchmarks**: Shopify Polaris (شريط جانبي مجمّع + Home بتنبيهات قابلة للتنفيذ)، Linear (كثافة، اختصارات، ⌘K في كل مكان)، Stripe Dashboard (أرقام Mono كبيرة في شريط واحد، لا بطاقات متماثلة)

## 1. الهدف (Purpose)

إعطاء التاجر وموظفيه إطاراً واحداً ثابتاً (شريط جانبي، شريط علوي، لوحة أوامر) تعيش فيه كل وحدات اللوحة، وصفحةً أولى تجيب خلال 3 ثوانٍ عن «ماذا حدث اليوم وما الذي يحتاج تدخلي الآن». تُقاس بزمن الوصول لأي وحدة (≤ 2 نقرات) وبنسبة التنبيهات المُعالَجة من الصفحة الأولى.

## 2. الفاعلون (Actors)

- **مالك المتجر**: يدخل بكلمة مرور المتجر (`StoreSetting.admin_password`)، يرى كل شيء.
- **موظف** (`StaffMember`): يدخل بهاتفه وكلمة مروره، يرى ما تسمح به الأدوار والصلاحيات (35 مفتاحاً) ومواقعه.
- **مالك متعدد المتاجر** (`MerchantAccount`): يبدّل بين متاجره من الشريط العلوي.
- **النظام**: يُحدّث عدّادات الشريط (طلبات جديدة، محادثات غير مقروءة، موافقات معلّقة، تنبيهات سلوكية).

## 3. قصص المستخدم (User Stories)

### US-03.1 — تسجيل الدخول (P1)
يفتح التاجر `/dashboard/login` على نطاق متجره فيرى اسم متجره وحقل كلمة مرور واحداً (المتجر محلول من الـ host). الموظف يستخدم `/dashboard/staff/login` بهاتف وكلمة مرور.
**Independent Test**: دخول ناجح يُحوّل إلى `/dashboard`؛ كلمة خاطئة تُظهر رسالة تحت الحقل؛ 503 أثناء التجهيز يُحوّل إلى M02.
**Acceptance**:
1. **Given** كلمة مرور صحيحة، **When** يُرسل، **Then** تُنشأ جلسة `is_merchant_authenticated` ويُحوَّل إلى `/dashboard` خلال < 1s مع skeleton الهيكل.
2. **Given** موظف `is_active=false` أو `terminated_at` مضبوط، **When** يحاول الدخول، **Then** تُعرض «هذا الحساب غير مفعّل، تواصل مع مدير المتجر».
3. **Given** «نسيت كلمة المرور»، **When** يُطلب، **Then** يُرسل رمز واتساب إلى `merchant_phone` المسجّل وتُفتح شاشة إعادة التعيين بنفس مكوّن OTP من M02.
4. **Given** جلسة منتهية أثناء العمل، **When** يردّ أي طلب بـ 401، **Then** تُفتح شاشة الدخول كطبقة فوق الصفحة الحالية وتُستكمل العملية بعد الدخول دون فقد النموذج.

### US-03.2 — الشريط الجانبي المُجمَّع والمُصفَّى (P1)
يرى المستخدم المجموعات الـ 15 من الاكتشاف §4 بنفس الترتيب والعناوين؛ تُخفى العناصر التي ميزتها معطّلة أو التي لا يملك صلاحيتها، وتُطوى المجموعات مع حفظ حالة الطيّ.
**Acceptance**:
1. **Given** ميزة `social_channels` معطّلة، **When** يُرسم الشريط، **Then** لا تظهر «المحادثات» ولا «التواصل الاجتماعي والمحادثات» إطلاقاً (لا نص «قريباً»).
2. **Given** موظف بدور «كاشير»، **When** يُرسم الشريط، **Then** تظهر الطلبات والعملاء والمخزون فقط، وتُخفى المجموعات الأخرى.
3. **Given** 12 طلباً جديداً و3 موافقات معلّقة، **Then** تظهر عدّادات Mono بجانب «كل الطلبات» و«طلبات الموافقة المعلّقة» وتُحدَّث كل 60 ثانية.
4. **Given** الشريط مطوي (icon rail)، **When** يُحوَّم على أيقونة، **Then** يُعرض اسم المجموعة كتلميح وتُفتح العناصر في لوحة طافية بحد 1px.

### US-03.3 — الشريط العلوي (P1)
شريط ارتفاعه 48px يحوي: اسم المتجر مع مبدّل المتاجر (إن كان المالك يملك أكثر من متجر)، زر ⌘K بنص «بحث أو أمر… ⌘K»، جرس الإشعارات بعدّاد، رابط «عرض المتجر»، قائمة المستخدم (الاسم، الدور، الوضع الداكن، اللغة، الإعدادات، خروج).
**Acceptance**:
1. **Given** مالك بثلاثة متاجر، **When** يفتح المبدّل، **Then** تُعرض المتاجر بأسمائها ونطاقاتها Mono والمتجر الحالي معلَّماً؛ الاختيار يحوّل إلى نطاق المتجر الآخر.
2. **Given** موظف، **Then** لا يظهر مبدّل المتاجر ويظهر اسمه ودوره واسم موقعه.
3. **Given** `Ctrl+K`/`⌘K`، **Then** تُفتح لوحة الأوامر (M48) من أي صفحة.

### US-03.4 — النظرة العامة: أرقام اليوم (P1)
يرى التاجر في أعلى `/dashboard` شريطاً رقمياً واحداً كثيفاً (لا بطاقات): الطلبات · المكتملة · الملغاة · المستردة · الإيراد الإجمالي · الإيراد الصافي، من `DailyStoreMetrics` لليوم، مع زر «تحديث» يستدعي `refresh_today_metrics` ووقت آخر تحديث.
**Acceptance**:
1. **Given** بيانات اليوم، **Then** تُعرض 6 قيم في صف واحد بخط Mono 32px مفصولة بحدود عمودية 1px، وتحتها تسمية 12px، والمبالغ كما يرسلها الخادم (`display_*`).
2. **Given** ضغط «تحديث»، **When** يُستدعى، **Then** تتبدّل الأرقام بحركة 150ms ويُحدَّث «آخر تحديث قبل n ثانية».
3. **Given** متجر جديد بلا طلبات، **Then** تُعرض أصفار Mono مع سطر «لا طلبات اليوم بعد — شارك رابط متجرك» وزر نسخ الرابط.

### US-03.5 — النظرة العامة: Bento غير متماثل (P1)
تحت الشريط الرقمي شبكة 12 عموداً: «طلبات جديدة» (8 أعمدة، آخر 8 طلبات `status=new`) + «يحتاج تدخلك» (4 أعمدة: موافقات معلّقة، تنبيهات سلوكية غير مقروءة، منتجات منخفضة المخزون، محادثات غير مقروءة)، ثم «الأكثر مبيعاً» (4 أعمدة من `top_products_snapshot`) + «مصادر الزيارات» (8 أعمدة، أشرطة أفقية من `traffic_source_breakdown`).
**Acceptance**:
1. **Given** 9 مصادر زيارات محتملة (`tiktok · whatsapp · instagram · snapchat · facebook · telegram · amazon · noon · direct`)، **Then** تُعرض غير الصفرية فقط كأشرطة أفقية بلون `foreground` ونسبة Mono، لا مخطط دائري.
2. **Given** صف في «طلبات جديدة»، **When** يُضغط، **Then** يُفتح الطلب في sheet M06 دون مغادرة الصفحة.
3. **Given** عنصر في «يحتاج تدخلك» بعدد 0، **Then** يُخفى السطر؛ وإن كانت كلها صفراً تُعرض «لا شيء يحتاج تدخلك الآن».

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-03.01**: الهيكل MUST يُقدَّم كـ layout واحد لمجموعة `(dashboard)` يحوي الشريط الجانبي، الشريط العلوي، منطقة المحتوى، ومزوّد ⌘K؛ كل الوحدات M04–M49 تُرسم داخله.
- **FR-03.02**: الشريط الجانبي MUST يطابق الاكتشاف §4 ترتيباً وعناوين (15 مجموعة + التذييل «الإعدادات»)، ويُخفي كل عنصر مرتبط بمفتاح ميزة معطّل من المفاتيح الـ 39.
- **FR-03.03**: الشريط MUST يُطبِّق بوابة الصلاحيات للموظفين وفق المفاتيح الـ 35 (مثال: «الطلبات» تتطلب `orders.view`، «العملاء» `customers.view`، «المخزون» `inventory.view`، «التقارير» `reports.view`، «الموظفون» `staff.view`)؛ المالك يرى كل شيء.
- **FR-03.04**: مجموعة «السجلات» MUST لا تُرسم (placeholder معطّل في الباك إند)؛ مجموعة «التقارير» تُبنى من `REPORT_REGISTRY` (M25) مع تعليم غير المتاح «قريباً» معطّلاً لا مخفياً.
- **FR-03.05**: الشريط العلوي MUST يحوي: مبدّل المتاجر (شرط وجود أكثر من متجر)، زر ⌘K، جرس الإشعارات (M49)، «عرض المتجر» (يفتح نطاق المتجر في تبويب جديد)، قائمة المستخدم.
- **FR-03.06**: الوضع الداكن MUST يُحفظ عبر `next-themes` (`system` افتراضياً) ويُبدَّل من قائمة المستخدم؛ لا يلمس ثيم المتجر.
- **FR-03.07**: شاشات الدخول MUST تكون: `merchant_login` (كلمة مرور فقط)، `staff_login` (هاتف + كلمة مرور)، `forgot_password` (OTP واتساب)، `reset_password`، `setup_password` (الدخول الأول من M02)؛ بتخطيط عمود واحد 400px بلا رسوم.
- **FR-03.08**: رمز CSRF MUST يُجلب من الخادم ويُرسل في `X-CSRFToken` مع كل طلب كتابة؛ 401 يفتح الدخول كطبقة، 403 يُعرض «لا تملك صلاحية»، 503 يُحوّل إلى M02.
- **FR-03.09**: النظرة العامة MUST تعرض الشريط الرقمي (6 قيم) من `DailyStoreMetrics`: `orders_count`, `completed_orders_count`, `cancelled_orders_count`, `refunded_orders_count`, `gross_revenue`, `net_revenue`؛ وزر «تحديث» يستدعي `refresh_today_metrics`.
- **FR-03.10**: الـ Bento MUST تلتزم تخطيط 8/4 ثم 4/8؛ يُمنع أي صف ببطاقات متساوية العرض.
- **FR-03.11**: «يحتاج تدخلك» MUST تجمع: موافقات `pending` (`ApprovalRequest`)، `BehaviorAlert` غير مقروءة بمستواها (`warning` · `critical`)، منتجات `is_low_stock` (حد المتجر أو `LOW_STOCK_THRESHOLD=3`)، `Conversation.unread_count`؛ كل سطر رابط مباشر لوحدته.
- **FR-03.12**: عدّادات الشريط الجانبي MUST تُجلب في طلب واحد كل 60 ثانية وتتوقف عند إخفاء التبويب.
- **FR-03.13**: الجوال MUST يستبدل الشريط الجانبي بـ drawer من جهة البداية (Vaul) وشريطاً سفلياً بأربعة مداخل: النظرة العامة، الطلبات، المنتجات، القائمة.
- **FR-03.14**: مفاتيح الكاش في TanStack Query MUST تُفتح بمعرّف المستأجر (الـ host) في جذر الهيكل؛ تبديل المتجر يُفرغ الكاش بالكامل.

## 5. الكيانات والحالات (Key Entities & States)

- **Session** (مشتق): `kind`: `merchant` · `staff`؛ `store_name`, `store_host`, `staff{full_name, roles[], permissions[], locations[]}`, `features[]` (المفعّل من المفاتيح الـ 39)، `csrf_token`.
- **Feature** (39 مفتاحاً): `refunds, inventory, bulk_upload, marketing, campaigns, promotions, coupon, tracking_tools, timeline, abandoned_carts, influencers, affiliates, bookings, storefront_design, contact_info, store_policies, customer_wallets, reports, shipping_settings, shipping_companies, shipping_providers, payment_gateways, local_wallets, bank_transfers, currency_settings, seo_settings, gift_settings, loyalty_settings, merchantwallet, app_marketplace, pickuplocation, sharwa_ship, customer_report, product_report, multi_location, staff_rbac, social_channels, marketplaces, dropshipping`. ترتيب الحسم: override → kill switch عام → `requires_plan=false` → `subscriptions_enabled=false` → `PlanFeature`.
- **Permission** (35 مفتاحاً بنقاط) — الفئات: `orders.*`, `staff.*`, `customers.*`, `inventory.*`, `reports.*`, `discounts.*`, `suppliers.*`, `support.*`, `channels.*`.
- **DailyStoreMetrics**: `orders_count`, `completed_orders_count`, `cancelled_orders_count`, `refunded_orders_count`, `gross_revenue`, `net_revenue`, `top_products_snapshot`, `traffic_source_breakdown`؛ تجميع ليلي + تحديث يدوي لليوم.
- **SidebarCounters**: `new_orders`, `unread_conversations`, `pending_approvals`, `unread_behavior_alerts`.
- **Shell UI state** (محلي): `sidebar: expanded | rail | drawer`, `collapsedGroups[]`, `theme`.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/login` · `/dashboard/staff/login` · `/dashboard/forgot-password` · `/dashboard/reset-password` · `/dashboard/setup-password` · `/dashboard` (النظرة العامة) · layout مشترك لكل `/dashboard/*`.
- **الهيكل**: شريط جانبي 256px (أو 56px rail) بحد نهاية 1px، شريط علوي 48px بحد أسفل 1px، محتوى بعرض أقصى 1440px وحاشية 24px؛ لا ظلال.
- **الحالات البصرية**: skeleton للهيكل (شريط + 6 أرقام + Bento) · فراغ متجر جديد · خطأ شبكة في النظرة العامة مع «إعادة المحاولة» لكل كتلة مستقلة · بلا صلاحية (صفحة داخل الهيكل) · 503 تجهيز (خارج الهيكل).
- **الجوال**: drawer بداية، شريط سفلي 4 مداخل، الشريط الرقمي يتحوّل إلى شبكة 2×3 بنفس الخط Mono، الـ Bento عمود واحد بارتفاعات مختلفة.
- **اختصارات**: `⌘K` لوحة الأوامر · `G O` الطلبات · `G P` المنتجات · `G C` العملاء · `[` طيّ الشريط · `?` قائمة الاختصارات · `Esc` إغلاق أي طبقة.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| رمز CSRF للطلبات | `<meta name="csrf-token">` في القوالب؛ `CSRF_COOKIE_HTTPONLY=True` | `[NEEDS BACKEND]` → `GET /api/v1/auth/csrf/` → `{csrfToken}` (أو حقنه SSR من BFF) |
| دخول المالك | `merchant_login` HTML POST | `[NEEDS BACKEND]` → `POST /api/v1/auth/merchant/login/` `{password}` → 204 + cookie جلسة / 400 |
| دخول الموظف | `staff_login` HTML POST | `[NEEDS BACKEND]` → `POST /api/v1/auth/staff/login/` `{phone, password}` → 204 / 400 / 403 غير مفعّل |
| الخروج | `merchant_logout`, `staff_logout` | `[NEEDS BACKEND]` → `POST /api/v1/auth/logout/` → 204 |
| نسيت/إعادة تعيين كلمة المرور | `forgot_password`, `reset_password` HTML | `[NEEDS BACKEND]` → `POST /api/v1/auth/merchant/forgot-password/` → `{otp_token, ttl_seconds}`؛ `POST /api/v1/auth/merchant/reset-password/` `{otp_token, code, password}` → 204 |
| تعيين كلمة المرور الأولى | `setup_admin_password` HTML | `[NEEDS BACKEND]` → `POST /api/v1/auth/merchant/setup-password/` `{password, password_confirm}` → 204 |
| الجلسة الحالية + الصلاحيات + الميزات | `request.staff`, `permission_resolver`, `feature_flags` context processor | `[NEEDS BACKEND]` → `GET /api/v1/auth/me/` → `{kind, store_name, store_host, staff?:{full_name, roles[], permissions[], locations[]}, features[]}` |
| النظرة العامة | `dashboard_home` HTML | `[NEEDS BACKEND]` → `GET /api/v1/dashboard/overview/` → `{today:{orders_count, completed_orders_count, cancelled_orders_count, refunded_orders_count, display_gross_revenue, display_net_revenue, refreshed_at}, new_orders:[…M06 row], attention:{pending_approvals, unread_behavior_alerts:{warning, critical}, low_stock_products, unread_conversations}, top_products:[{id, name, image, qty, display_revenue}], traffic_sources:{tiktok, whatsapp, …}}` |
| تحديث أرقام اليوم | `refresh_today_metrics` POST | `[NEEDS BACKEND]` → `POST /api/v1/dashboard/overview/refresh/` → نفس `today` |
| عدّادات الشريط | ضمن قوالب الشريط | `[NEEDS BACKEND]` → `GET /api/v1/dashboard/counters/` → `{new_orders, unread_conversations, pending_approvals, unread_behavior_alerts}` |
| متاجر المالك (المبدّل) | `merchant_master_dashboard` HTML (`MerchantAccount`) | `[NEEDS BACKEND]` → `GET /api/v1/account/stores/` → `[{name, host, is_current, provisioning_status}]` |
| شجرة التقارير للشريط | `report_groups` context processor | `[NEEDS BACKEND]` → `GET /api/v1/reports/registry/` (يُوثَّق في M25) |

## 8. الحالات الحدّية (Edge Cases)

- موظف بصلاحيات تُشير إلى وحدات ميزاتها معطّلة: الميزة تحسم؛ لا يظهر العنصر.
- تغيّرت صلاحيات الموظف أثناء الجلسة (`token_version`): أول 403 يُعيد جلب `/auth/me/` ويُعاد رسم الشريط دون خروج.
- `DailyStoreMetrics` اليوم غير موجود بعد (قبل التجميع): تُعرض أصفار مع «لم تُجمَّع أرقام اليوم بعد — حدّث».
- مالك بمتجر واحد: لا مبدّل، اسم المتجر نص ثابت.
- متجر `provisioning_status != ready` في المبدّل: يُعرض معطّلاً مع «قيد التجهيز».
- عرض ضيق 1024px: الشريط يصبح rail تلقائياً مع حفظ اختيار المستخدم عند التوسيع.
- `prefers-reduced-motion`: لا حركة لتبدّل الأرقام أو انزلاق الـ drawer.

## 9. معايير النجاح (Success Criteria)

- **SC-03.1**: الوصول من النظرة العامة إلى أي وحدة في الشريط ≤ 2 نقرات، أو ≤ 1 أمر ⌘K.
- **SC-03.2**: رسم الهيكل + الشريط الرقمي من كاش دافئ < 300ms؛ أول تحميل بارد < 1.5s على 4G.
- **SC-03.3**: صفر عناصر شريط جانبي ظاهرة لميزة معطّلة أو صلاحية مفقودة (فحص آلي على 39×35).
- **SC-03.4**: 100% من التنبيهات في «يحتاج تدخلك» تقود إلى الشاشة المعنية بنقرة واحدة.
- **SC-03.5**: مراجعة المبدأ I: لا بطاقات KPI متماثلة؛ الشريط الرقمي والـ Bento يجتازان قائمة الفحص بصفر مخالفات.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M02 (الدخول الأول و503)، M06 (صفوف الطلبات الجديدة وsheet)، M18 (الصلاحيات والموافقات والتنبيهات السلوكية)، M21 (المخزون المنخفض)، M25 (شجرة التقارير)، M27 (المحادثات غير المقروءة)، M43 (المبدّل)، M48 (⌘K)، M49 (الجرس).
- افتراض: دخول المالك بكلمة مرور فقط لأن المتجر محلول من الـ host ولا يوجد `auth.User`؛ دخول الموظف بالهاتف لأن `StaffMember.phone` فريد.
- افتراض: ربط المجموعات بمفاتيح الصلاحيات (FR-03.03) قرار واجهة مستند إلى الأدوار النظامية الأربعة؛ يُؤكَّد مع الباك إند.
- افتراض: الشريط الجانبي يُقرأ من ملف تعريف واحد `dashboard.nav.ts` يحمل لكل عنصر `feature?` و`permission?` و`counter?`.
- افتراض: الجلسة cookie نفسها عبر BFF same-origin (rewrites) لتبقى الكوكيز صالحة؛ لا JWT.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I (Anti-AI): يُمنع صف من 4 بطاقات KPI متماثلة؛ البديل شريط رقمي واحد مفصول بحدود 1px ثم Bento 8/4 و4/8. لا أيقونات داخل دوائر ملونة في الشريط الجانبي (Lucide 16px بلون `muted-foreground`)، لا مخطط دائري لمصادر الزيارات، لا avatar بتدرج لوني.
- II (RTL): الشريط الجانبي عند البداية (يمين)، chevrons الطيّ تنعكس، الأرقام Mono `tabular-nums`، نطاقات المتاجر في المبدّل `dir="ltr"` معزولة، التواريخ بـ `Intl.DateTimeFormat('ar')`.
- IV (Visual check): لقطات `docs/visual-checks/03-shell/` للدخول (مالك/موظف)، النظرة العامة (ممتلئة/فارغة)، الشريط موسّع/rail، الجوال مع drawer، والداكن لكل منها؛ فحص `Tab` عبر الشريط و`Esc` و`⌘K`.
- IX (State): `/auth/me/` و`/features/` في TanStack Query بمفتاح المستأجر مع `staleTime` طويل؛ حالة الطيّ والثيم في Zustand/localStorage؛ العدّادات `refetchInterval: 60_000` مع `refetchIntervalInBackground: false`؛ Zod على كل استجابة.
