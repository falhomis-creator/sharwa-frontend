# M25 — مركز التقارير والتصدير والتقارير المجدولة (Reports Hub, Exports & Scheduled Reports)

**Route group**: `(dashboard)` · **Priority**: P2 · **Backend status**: HTML-only `[NEEDS BACKEND]` (`merchant_reports`, `report_detail/<code>`, `enqueue_report_export`, `report_export_status`, `report_export_download`, `my_exports`, `scheduled_reports`, `refresh_today_metrics`) · **Feature**: `reports`
**Discovery refs**: `02-products-domain-model.md` §12 (`REPORT_REGISTRY` 42 تقريراً / 10 فئات، `ReportExportJob`, `ScheduledReportSubscription`, `DailyStoreMetrics`), §10 (صلاحيات `reports.*`) · `01-tenants-dashboard-admin.md` §1 (context processor `report_groups`), §3.2 (Reports), §4 (التقارير `[reports]` accordion «قريباً») · **Benchmarks**: Zid Reports (فئات واضحة ونطاق زمني موحَّد)، Stripe Sigma (تصدير غير متزامن بروابط مؤقتة وجداول دقيقة)، Linear Insights (رسوم رصينة بلون واحد، أرقام كبيرة)

## 1. الهدف (Purpose)

إعطاء التاجر إجابة رقمية موثوقة في أقل من 10 ثوانٍ لأي سؤال تشغيلي أو مالي («كم بعت هذا الأسبوع مقارنة بالماضي؟ أي منتج يُهدر مخزوناً؟»)، مع تصدير ثقيل لا يجمّد المتصفح وتقارير تصل بريدياً دون فتح اللوحة. يُقاس بعدد التقارير المفتوحة أسبوعياً ونسبة التصديرات المكتملة.

## 2. الفاعلون (Actors)

- **مالك المتجر**: كل التقارير بما فيها الحساسة (`reports.profit.view`).
- **موظف** بصلاحيات `reports.view` (أساس) + مفاتيح الفئات: `reports.sales.view` · `reports.profit.view` · `reports.inventory.view` · `reports.customers.view` · `reports.staff_performance.view` · `reports.export`.
- **النظام**: يُنتج `DailyStoreMetrics` ليلياً، ينفّذ `ReportExportJob` عبر Celery، ويرسل التقارير المجدولة.

## 3. قصص المستخدم (User Stories)

### US-25.1 — فهرس التقارير (P1)
يفتح التاجر «التقارير» فيرى الفئات العشر كأقسام عمودية، تحت كل فئة قائمة تقاريرها بسطر واحد (العنوان، وصف قصير، حالة الإتاحة)؛ غير المتاح يظهر معطّلاً بنص «غير متاح بعد» لا مخفياً.
**Independent Test**: عدّ العناصر = 42؛ المعطّلة = 7؛ المخفية بسبب الصلاحيات تُعدّ من الـ Mock.
**Acceptance**:
1. **Given** موظف بـ `reports.view` فقط، **When** يفتح الفهرس، **Then** تظهر تقارير `core` غير الحساسة فقط، وتُعرض ملاحظة «تقارير إضافية تتطلب صلاحيات».
2. **Given** تقرير `status=not_yet_available`، **Then** الصف معطّل مع تلميح ولا يُفتح.
3. **Given** بحث في الفهرس «مرتجعات»، **Then** تُفلتر القائمة محلياً عبر العنوان والكود.

### US-25.2 — صفحة تقرير بنطاق زمني ومقارنة (P1)
يفتح التاجر تقريراً فيرى: شريط التحكم (نطاق زمني مع اختصارات اليوم/7 أيام/30 يوماً/هذا الشهر/مخصص، مقارنة بالفترة السابقة، الموقع إن فُعِّل `multi_location`)، ثم أرقام ملخَّص كبيرة بخط Mono مع الفرق %، ثم رسم واحد، ثم جدول تفصيلي.
**Acceptance**:
1. **Given** نطاق 1–30 الشهر الماضي ومقارنة مفعَّلة، **When** يُحمَّل، **Then** يعيش النطاق في الرابط، ويظهر الفرق بإشارة ونسبة بلون دلالي للنص فقط (`emerald`/`red`).
2. **Given** الرسم، **Then** سلسلة واحدة بلون `zinc-900`/`zinc-100` وسلسلة المقارنة بـ `zinc-400` متقطعة؛ لا تدرجات ولا تظليل تحت الخط.
3. **Given** الجدول، **Then** الأعمدة الرقمية محاذاة نهاية Mono والمبالغ كما أرسلها الخادم (`display_*`).
4. **Given** `prefers-reduced-motion`، **Then** لا حركة رسم للخط.

### US-25.3 — تصدير غير متزامن (P1)
يضغط الموظف «تصدير CSV/XLSX» فيُنشأ `ReportExportJob` ويُعرض في شريط «تصديراتي» بحالته؛ عند `ready` يظهر زر تنزيل برمز مؤقت.
**Acceptance**:
1. **Given** تصدير مُنشأ، **Then** تُعرض الحالات `queued → processing → ready` بالاستطلاع كل 5 ثوانٍ وتوقفه عند حالة نهائية.
2. **Given** `failed`، **Then** يُعرض سبب الخادم وزر «إعادة المحاولة» يُنشئ مهمة جديدة.
3. **Given** `expired`، **Then** يُعطَّل التنزيل مع «انتهت صلاحية الملف — أعد التصدير».
4. **Given** بلا `reports.export`، **Then** الزر معطّل بتلميح.

### US-25.4 — التقارير المجدولة (P2)
يضيف التاجر اشتراكاً: التقرير، التكرار (`daily` · `weekly` · `monthly`)، البريد المستلم؛ ويرى قائمة اشتراكاته مع إيقاف/حذف.
**Acceptance**:
1. **Given** اشتراك أسبوعي، **Then** يُعرض «يُرسل كل أسبوع — التالي: <تاريخ من الخادم>» بـ `Intl.DateTimeFormat('ar')`.

### US-25.5 — تحديث مقاييس اليوم (P2)
في تقارير `core` يظهر زر «تحديث بيانات اليوم» يستدعي `refresh_today_metrics` ويعرض وقت آخر تحديث.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-25.01**: الفهرس MUST يُعرض الفئات العشر بترتيب السجل والتقارير الـ 42 كلها (المتاح/غير المتاح/قريباً)؛ الإخفاء فقط للصلاحيات.
- **FR-25.02**: فتح التقرير MUST يحترم مفتاح الصلاحية الخاص به؛ 403 من الخادم تُعرض كصفحة «بلا صلاحية» لا كخطأ عام.
- **FR-25.03**: نطاق التاريخ والمقارنة والموقع MUST تعيش في الرابط (`from`, `to`, `compare`, `location`).
- **FR-25.04**: كل الأرقام المالية MUST تُعرض كنصوص الخادم؛ النِّسب تُعرض كما يرسلها الخادم أو تُحسب محلياً فقط للفرق بين قيمتَين عدديتَين غير ماليتَين (عدد الطلبات).
- **FR-25.05**: الرسوم MUST تكون Recharts بلوحة zinc وهيوٍ دلالي واحد كحدٍّ أقصى؛ نوعان فقط: خط وأعمدة؛ لا دوائر/كعك.
- **FR-25.06**: التصدير MUST يكون غير متزامن عبر `ReportExportJob`، والاستطلاع يتوقف عند `ready|failed|expired`، والتنزيل عبر `download_token`.
- **FR-25.07**: صفحة «تصديراتي» MUST تعرض آخر 50 مهمة بحالاتها وتُتاح من أي تقرير.
- **FR-25.08**: الاشتراكات المجدولة MUST تتحقق محلياً من البريد وتعرض التكرار بالعربية.
- **FR-25.09**: الفهرس MUST يُقرأ من الخادم (لا قائمة ثابتة في الواجهة) ليعكس تغيّر الإتاحة.
- **FR-25.10**: الجدول التفصيلي MUST يدعم الترتيب بالأعمدة محلياً حتى 1,000 صف، وخادمياً فوقها.
- **FR-25.11**: الوحدة MUST تُخفى بلا `features.reports`؛ تقارير `inventory` تتطلب أيضاً `features.inventory`.

## 5. الكيانات والحالات (Key Entities & States)

- **ReportDefinition** (من `REPORT_REGISTRY`): `code`, `category`, `title`, `status` ∈ `available` متاح · `not_yet_available` غير متاح بعد · `coming_soon` قريباً, `permission`. الفئات والتقارير (العناوين العربية للعرض؛ `*` = `not_yet_available`):
  - `core` الأساسية: `sales_overview` نظرة عامة على المبيعات · `best_sellers` الأكثر مبيعاً · `orders` الطلبات · `store_overview` نظرة عامة على المتجر · `inventory_overview` نظرة عامة على المخزون.
  - `customers` العملاء: `customers_vip` العملاء المميزون · `abandoned_carts` السلات المتروكة · `visits`* الزيارات · `ratings` التقييمات.
  - `finance` المالية: `payment_gateways` بوابات الدفع · `taxes` الضرائب · `coupons` الكوبونات · `refunds` الاسترجاعات · `wallet_custody` عهدة المحافظ · `invoices_settlements`* الفواتير والتسويات · `platform_commissions` عمولات المنصة.
  - `shipping` الشحن: `third_party_logistics` شركات الشحن الخارجية · `couriers` المندوبون · `returns` المرتجعات · `zones` المناطق.
  - `inventory` المخزون: `categories` التصنيفات · `variants` المتغيرات · `stock_movements` حركات المخزون · `suppliers` الموردون.
  - `operations` العمليات: `staff_performance` أداء الموظفين · `audit_log` سجل التدقيق · `customer_service` خدمة العملاء · `system_performance`* أداء النظام · `marketing_utm` مصادر التسويق (UTM) · `ai_forecasting`* التنبؤ الذكي.
  - `local_market` السوق المحلي: `currencies` العملات · `pos` نقاط البيع · `operating_expenses` المصروفات التشغيلية.
  - `advanced_behavior` السلوك المتقدم: `failed_searches` عمليات البحث بلا نتائج · `wishlists` قوائم الأمنيات · `loyalty` الولاء.
  - `marketing` التسويق: `affiliates` التسويق بالعمولة · `bundles`* الحزم · `subscriptions`* الاشتراكات.
  - `infrastructure` البنية: `export_engine` محرك التصدير · `scheduled_reports` التقارير المجدولة · `whatsapp_costs` تكاليف واتساب.
- **خريطة الصلاحيات** (واجهة): `core`/`marketing`/`local_market`/`advanced_behavior`/`infrastructure` → `reports.view`؛ `sales_overview`, `best_sellers`, `orders`, `pos`, `coupons`, `payment_gateways` → `reports.sales.view`؛ `store_overview`, `taxes`, `platform_commissions`, `wallet_custody`, `operating_expenses`, `currencies` → `reports.profit.view` (حسّاس)؛ فئة `inventory` + `inventory_overview` → `reports.inventory.view`؛ فئة `customers` + `wishlists`, `loyalty` → `reports.customers.view`؛ `staff_performance`, `audit_log` → `reports.staff_performance.view`؛ أي تصدير → `reports.export`.
- **ReportExportJob**: `status` ∈ `queued` في الانتظار · `processing` قيد التنفيذ · `ready` جاهز · `failed` فشل · `expired` منتهٍ; `download_token`, `format`, `report_code`, `params`, `created_at`, `expires_at`.
- **ScheduledReportSubscription**: `report_code`, `frequency` ∈ `daily` يومي · `weekly` أسبوعي · `monthly` شهري, `email`, `is_active`, `next_run_at`.
- **DailyStoreMetrics**: `orders_count`, `completed_orders_count`, `cancelled_orders_count`, `refunded_orders_count`, `gross_revenue`, `net_revenue`, `top_products_snapshot`, `traffic_source_breakdown` (مصدر تقارير `core`).

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/reports` (الفهرس) · `/dashboard/reports/[code]` (التقرير) · `/dashboard/reports/exports` (تصديراتي) · `/dashboard/reports/scheduled` (المجدولة).
- **الحالات البصرية**: skeleton (شريط أرقام + مستطيل رسم + صفوف) · فراغ «لا بيانات في هذا النطاق — جرّب 30 يوماً» · خطأ · بلا صلاحية (صفحة كاملة) · الميزة معطّلة · تقرير غير متاح (صفحة «غير متاح بعد» مع رابط الفهرس).
- **الجوال**: أرقام الملخّص عمود واحد؛ الرسم بارتفاع 200px؛ الجدول يتمرر أفقياً داخل حاويته؛ شريط التحكم في drawer سفلي.
- **اختصارات**: `⌘K` «تقرير: <عنوان>» · `D` نطاق اليوم · `W` 7 أيام · `M` 30 يوماً · `C` تبديل المقارنة · `E` تصدير.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| الفهرس | `merchant_reports` HTML + `report_groups` context | `[NEEDS BACKEND]` → `GET /api/v1/reports/` → `[{category, title, reports:[{code, title, description, status, permission, allowed}]}]` |
| بيانات تقرير | `report_detail/<code>` HTML | `[NEEDS BACKEND]` → `GET /api/v1/reports/<code>/?from&to&compare_from&compare_to&location&page` → `{summary:[{key, label, display_value, compare_display_value, delta_pct}], series:[{label, points:[{x, y, display_y}]}], table:{columns:[{key, label, type}], rows:[…], count}}` |
| إنشاء تصدير | `enqueue_report_export` POST | `[NEEDS BACKEND]` → `POST /api/v1/reports/<code>/exports/` `{format: csv\|xlsx, params}` → `{job_id, status}` |
| حالة التصدير | `report_export_status` JSON | `[NEEDS BACKEND]` → `GET /api/v1/reports/exports/<job_id>/` → `{status, download_token, expires_at, error}` |
| تنزيل | `report_export_download` | `[NEEDS BACKEND]` → `GET /api/v1/reports/exports/<job_id>/download/?token=` (ملف) |
| تصديراتي | `my_exports` HTML | `[NEEDS BACKEND]` → `GET /api/v1/reports/exports/?page` |
| المجدولة | `scheduled_reports` HTML | `[NEEDS BACKEND]` → `GET/POST /api/v1/reports/schedules/` `{report_code, frequency, email}`, `PATCH/DELETE /<id>/` |
| تحديث اليوم | `refresh_today_metrics` POST | `[NEEDS BACKEND]` → `POST /api/v1/reports/refresh-today/` → `{refreshed_at}` |

## 8. الحالات الحدّية (Edge Cases)

- نطاق زمني > 366 يوماً: يُمنع محلياً مع «الحد الأقصى سنة واحدة» (التصدير يبقى متاحاً للنطاق الكامل عبر المهمة).
- مقارنة بفترة لا بيانات فيها: يُعرض الفرق «—» لا «+100%».
- تقرير حساس (`reports.profit.view`) مفتوح من رابط مشترك لموظف بلا صلاحية: صفحة «بلا صلاحية» مع اسم التقرير فقط، بلا تسريب أرقام في العنوان.
- `multi_location` معطّل: فلتر الموقع مخفي ويُحذف المعامل من الرابط.
- تصدير ضخم يتجاوز حد الخادم: `failed` مع سبب؛ يُقترح تقسيم النطاق.
- المنطقة الزمنية: النطاقات تُرسل بتواريخ ISO بلا وقت ويفسّرها الخادم بـ `StoreSetting.timezone`؛ يُعرض اسم المنطقة الزمنية في تلميح النطاق.

## 9. معايير النجاح (Success Criteria)

- **SC-25.1**: من الفهرس إلى قراءة رقم الملخّص الأول ≤ 2 نقرات / ≤ 3 ثوانٍ على اتصال 4G.
- **SC-25.2**: 42/42 تقريراً ظاهرة في الفهرس للمالك؛ 7 معطّلة بنص واضح.
- **SC-25.3**: 0 تجميد للمتصفح أثناء التصدير (كله خادمي).
- **SC-25.4**: 100% من الرسوم تمر بقائمة المبدأ I (لون واحد، لا تدرج، لا كعك).
- **SC-25.5**: رابط تقرير مع نطاق ومقارنة يُنتج نفس الشاشة على جهاز آخر 100%.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M03 (الشريط والـ accordion)، M18 (الصلاحيات)، M21/M22 (فلتر الموقع)، M48 (⌘K)، M49 (إشعار اكتمال التصدير).
- افتراض: العناوين العربية في §5 تسميات عرض مقترحة مشتقة من الأكواد؛ تُستبدل بعناوين `REPORT_REGISTRY` الحرفية عند توفر `GET /api/v1/reports/`.
- افتراض: `coming_soon` قيمة حالة في السجل لتقارير مخططة؛ الاكتشاف الحالي يُعلِّم 7 تقارير `not_yet_available` فقط.
- افتراض: خريطة الصلاحيات في §5 قرار واجهة يُطبَّق كطبقة أولى؛ الخادم هو المرجع النهائي (403).
- افتراض: الاستطلاع كل 5 ثوانٍ يُستبدل بإشعار M49 عند توفره.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا لوحة KPI بأربع بطاقات متماثلة؛ أرقام الملخّص صف نصّي واحد بأحجام مختلفة (الأول 32px والباقي 20px). الرسوم: سلسلة بـ `foreground`، مقارنة بـ `zinc-400`، شبكة أفقية فقط، لا ألوان brand.
- II: الأرقام والنِّسب Mono محاذاة نهاية؛ محور X الزمني يتقدم من اليمين لليسار في RTL (Recharts `reversed`)؛ التواريخ بـ `Intl.DateTimeFormat('ar')`.
- IV: لقطات `docs/visual-checks/25-reports/` للفهرس، تقرير بمقارنة، تصديراتي بحالاتها، الجوال، الداكن.
- IX: مفاتيح الكاش `[tenant, 'reports', code, params]` مع `staleTime` 5 دقائق؛ الاستطلاع عبر `refetchInterval` شرطي؛ معاملات النطاق عبر nuqs؛ Zod لكل استجابة.
