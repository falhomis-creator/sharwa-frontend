# M49 — مركز الإشعارات (Notifications Center — topbar bell)

**Route group**: `(dashboard)` cross-cutting · **Priority**: P2 · **Backend status**: Absent `[NEEDS BACKEND]` (لا نموذج إشعارات؛ توجد عدّادات متفرقة في قوالب الشريط الجانبي: المحادثات غير المقروءة، طلبات الموافقة المعلّقة، التنبيهات السلوكية غير المقروءة) · Web Push Ready (`/api/v1/push/*`)
**Discovery refs**: `00-module-map.md` §B E-49, §D.5 · `01-tenants-dashboard-admin.md` §4 (شارات الشريط: `channel_inbox_list` unread، `approval_requests` count، `behavior_alerts` unread؛ «no desktop topbar… notification bell»), §9 (Gaps) · `02-products-domain-model.md` §3 (`Order.status` `payment_review`/`awaiting_payment`), §10 (`ApprovalRequest`, `BehaviorAlert.LEVEL`), §14 (`MarketplaceSyncJob.STATUS`, `SupplierSyncJob`, `PendingAWBQueue`), §6 (`PendingAWBQueue.failed`) · `01` §2.3 (`StoreAppInstallation.suspended_by_platform`, `AppInstallationEvent`), §2.1 (`provisioning_status`) · `03` §1 (`/api/v1/push/*`) · **Benchmarks**: Linear Inbox (قائمة واحدة مرتبة زمنياً، تمييز مقروء/غير مقروء بنقطة، اختصارات)، GitHub Notifications (تجميع بالمصدر، «تم» للأرشفة، فلاتر جانبية)، Vercel (شارة عدد صغيرة بلا لون brand)

## 1. الهدف (Purpose)

جمع كل ما يحتاج التاجر وموظفوه الانتباه إليه الآن في مكان واحد (جرس في الشريط العلوي + لوحة)، بدل تصيّد الشارات عبر 15 قسماً في الشريط الجانبي؛ مع روابط عميقة تنقل مباشرة إلى الإجراء. يُقاس بزمن الوصول من الإشعار إلى الإجراء وبنسبة الإشعارات التي تُقرأ خلال ساعة.

## 2. الفاعلون (Actors)

- **مالك المتجر**: يرى كل الأنواع.
- **موظف**: يرى الأنواع المطابقة لصلاحياته فقط (الطلبات بـ `orders.view`، المخزون بـ `inventory.view`، المحادثات بـ `channels.inbox.access`، الموافقات حين دوره هو `approver_role`…).
- **النظام**: يُنتج الإشعارات من أحداث الطلبات، الموافقات، التنبيهات السلوكية، المحادثات، المخزون، مهام المزامنة، الدفع، التجهيز والفوترة.

## 3. قصص المستخدم (User Stories)

### US-49.1 — الجرس والعدّاد (P1)
يرى المستخدم في الشريط العلوي (M03) أيقونة جرس بعدّاد غير المقروء (Mono، `99+` حدّاً)؛ الضغط يفتح لوحة جانبية بعرض 400px بالإشعارات مرتبة زمنياً.
**Independent Test**: Mock بـ 7 إشعارات غير مقروءة → العدّاد 7؛ قراءة واحد → 6 دون إعادة تحميل.
**Acceptance**:
1. **Given** 0 غير مقروء، **Then** الجرس بلا عدّاد ولا نقطة.
2. **Given** إشعار `severity=critical` غير مقروء، **Then** نقطة `red` صغيرة بجوار العدّاد؛ غير ذلك العدّاد بلون `foreground`.
3. **Given** اللوحة مفتوحة، **When** `Esc`، **Then** تُغلق ويعود التركيز إلى الجرس.

### US-49.2 — التجميع والفلترة (P1)
داخل اللوحة تبويبات نصية: «الكل» · «غير المقروء» · ثم فلاتر بالنوع (طلبات، دفع، موافقات، مخزون، محادثات، مزامنة، نظام). الإشعارات المتكررة من نفس النوع والمصدر تُجمَّع في سطر واحد بعدد («4 طلبات جديدة»).
**Acceptance**:
1. **Given** 4 إشعارات `order_new` خلال 10 دقائق، **Then** تُعرض كسطر واحد «4 طلبات جديدة» برابط إلى قائمة الطلبات بفلتر `status=new`؛ التوسيع يعرضها فرادى.
2. **Given** فلتر «موافقات»، **Then** يعيش في الرابط (`?kind=approval_pending`) ويُعرض العدد.

### US-49.3 — القراءة والروابط العميقة (P1)
الضغط على إشعار يعلّمه مقروءاً وينقل إلى وجهته (طلب، موافقة، محادثة، منتج منخفض، مهمة مزامنة، تقرير تصدير)؛ زر «تعليم الكل كمقروء» في رأس اللوحة.
**Acceptance**:
1. **Given** إشعار `low_stock` لمنتج، **When** يُضغط، **Then** يُفتح `/dashboard/inventory?status=low&q=<sku>` ويُعلَّم مقروءاً optimistic.
2. **Given** إشعار وجهته تتطلب صلاحية لا يملكها الموظف، **Then** لا يصل الإشعار أصلاً (فلترة خادمية)؛ وإن وصل من كاش قديم يُعرض «بلا صلاحية» في الوجهة.
3. **Given** «تعليم الكل»، **Then** يُطبَّق optimistic ويُحدَّث العدّاد فوراً مع تراجع عند الفشل.

### US-49.4 — صفحة كاملة وسجل (P2)
`/dashboard/notifications` تعرض كل الإشعارات بترقيم خادمي مع نفس الفلاتر، لمن يفضّل الصفحة على اللوحة وللرجوع إلى القديم.

### US-49.5 — الاشتراك في Web Push (P2)
من رأس اللوحة أو الإعدادات: «تفعيل إشعارات المتصفح» يستخدم `/api/v1/push/vapid-public-key/` و`/api/v1/push/subscribe/` (M44) للجهاز الحالي؛ إلغاء عبر `/unsubscribe/`.
**Acceptance**:
1. **Given** المتصفح رفض الإذن، **Then** يُعرض «الإذن مرفوض — فعّله من إعدادات المتصفح» ويُخفى الزر.
2. **Given** اشتراك ناجح، **Then** يُعرض «مفعّل على هذا الجهاز» بلا إرسال إشعار اختباري من الواجهة.

### US-49.6 — إشعارات النظام والفوترة (P2)
إشعارات `billing_notice` (انتهاء اشتراك تطبيق، تعليق تطبيق من المنصة، تجاوز حد الخطة) و`provisioning_notice` تُعرض بشارة «نظام» وتبقى في الأعلى حتى تُقرأ.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-49.01**: العدّاد MUST يُجلب كل 60 ثانية (`GET /summary/`) وعند عودة التركيز للنافذة؛ اللوحة تُجلب عند الفتح.
- **FR-49.02**: الإشعارات MUST تُفلتر خادمياً حسب صلاحيات المستخدم؛ الواجهة لا تملك منطق تصفية بالصلاحيات سوى إخفاء فلاتر الأنواع غير المتاحة.
- **FR-49.03**: التجميع MUST يعتمد `group_key` من الخادم؛ الواجهة لا تجمّع بالاستدلال.
- **FR-49.04**: كل إشعار MUST يحمل `link` نسبياً داخل `(dashboard)`؛ الروابط الخارجية تُرفض.
- **FR-49.05**: تعليم القراءة MUST يكون optimistic مع تراجع؛ `read-all` يُحدَّث العدّاد محلياً ثم يُعاد الجلب.
- **FR-49.06**: الأنواع العشرة MUST تُعرض بتسمية عربية ثابتة وأيقونة Lucide واحدة (16px) لكل نوع، بلا ألوان نوع؛ الشدة فقط دلالية (`info` بلا لون · `warning` `amber` · `critical` `red`) على النقطة.
- **FR-49.07**: اللوحة MUST تكون `role="dialog"` مع تركيز محصور، و`aria-live="polite"` للعدّاد.
- **FR-49.08**: Web Push MUST يستخدم عقد M44 كما هو مع `source='nextjs_app'` حيث ينطبق؛ لا SW جديد خارج قرار M44.
- **FR-49.09**: الوحدة MUST تعمل بلا تحميل كامل عند غياب الخادم (`[NEEDS BACKEND]`): الجرس بلا عدّاد ولوحة بنص «الإشعارات غير متاحة حالياً»، لا خطأ أحمر.
- **FR-49.10**: الإشعارات الأقدم من 30 يوماً MUST تُعرض في الصفحة الكاملة فقط (ترقيم خادمي)، لا في اللوحة.
- **FR-49.11**: عدّادات الشريط الجانبي القديمة (طلبات جديدة، محادثات، موافقات، تنبيهات) MUST تُقرأ من `GET /summary/` نفسه لتجنب تضارب الأرقام.

## 5. الكيانات والحالات (Key Entities & States)

- **Notification** (مقترح): `id`, `kind`, `severity` ∈ `info` · `warning` · `critical`, `title`, `body`, `link`, `group_key`, `count`, `created_at`, `read_at` (null = غير مقروء), `source_ref{type, id}`.
- **kind** (10، مع مصدره في الباك إند): `order_new` طلب جديد (`Order.status=new`) · `payment_review` دفع يحتاج مراجعة (`Order.status ∈ awaiting_payment|payment_review`) · `approval_pending` طلب موافقة معلّق (`ApprovalRequest.status=pending` بأنواعه `refund` · `shift_shortage` · `stock_writeoff` · `discount_exception` · `order_approval` · `po_approval`) · `behavior_alert` تنبيه سلوكي (`BehaviorAlert.level ∈ warning|critical`) · `inbox_unread` محادثة غير مقروءة (`Conversation.unread_count>0`) · `low_stock` مخزون منخفض (`is_low_stock`) · `sync_failed` فشل مزامنة (`MarketplaceSyncJob.status ∈ failed|completed_with_errors`, `SupplierSyncJob`) · `awb_failed` فشل إصدار بوليصة (`PendingAWBQueue.status=failed`) · `export_ready` تصدير جاهز/فاشل (`ReportExportJob.status ∈ ready|failed`) · `billing_notice`/`provisioning_notice` إشعار نظام (`StoreAppInstallation.suspended_by_platform`, `subscription_expires_at`, `AppInstallationEvent`, `provisioning_status`).
- **Summary**: `{unread_total, by_kind:{kind: count}, has_critical}`.
- **PushSubscription** (M44): `endpoint`, `keys{p256dh, auth}`؛ حالة الجهاز: غير مدعوم · مرفوض · غير مشترك · مشترك.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: جرس في topbar (M03) · لوحة جانبية 400px (Sheet من جهة البداية في RTL) · `/dashboard/notifications` (صفحة كاملة بفلاتر في الرابط) · قسم «إشعارات المتصفح» في الإعدادات (M34).
- **الحالات البصرية**: skeleton 5 صفوف · فراغ «لا إشعارات — كل شيء تحت السيطرة» (نص فقط) · فلتر بلا نتائج · خطأ/غير متاح (نص هادئ) · بلا دعم Push.
- **الجوال**: اللوحة صفحة كاملة (Vaul full-height)؛ الجرس في الشريط السفلي/العلوي للجوال؛ أهداف ≥ 44px؛ السحب لليسار (في RTL) يعلّم مقروءاً.
- **اختصارات**: `N` فتح/إغلاق اللوحة · `J/K` تنقل · `Enter` فتح الوجهة · `E` تعليم مقروء · `Shift+E` تعليم الكل · `⌘K` «الإشعارات».

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| ملخص العدّادات | عدّادات متفرقة في قوالب الشريط | `[NEEDS BACKEND]` → `GET /api/v1/notifications/summary/` → `{unread_total, by_kind:{…}, has_critical}` |
| قائمة الإشعارات | لا شيء | `[NEEDS BACKEND]` → `GET /api/v1/notifications/?unread=1&kind&page&page_size` → `{count, results:[{id, kind, severity, title, body, link, group_key, count, created_at, read_at, source_ref}]}` (مفلترة بصلاحيات الجلسة) |
| تعليم مقروء | لا شيء | `[NEEDS BACKEND]` → `POST /api/v1/notifications/<id>/read/` → `{read_at}` |
| تعليم الكل | لا شيء | `[NEEDS BACKEND]` → `POST /api/v1/notifications/read-all/` `{kind?}` → `{updated}` |
| مفتاح VAPID | `GET /api/v1/push/vapid-public-key/` → `{publicKey}` | Ready |
| اشتراك/إلغاء Push | `POST /api/v1/push/subscribe/` `{endpoint, keys:{p256dh, auth}}`, `POST /api/v1/push/unsubscribe/` `{endpoint}` | Ready |
| مصادر العدّادات القديمة | `approval_requests` count، `behavior_alerts` unread، `channel_inbox_list` unread (HTML context) | تُستبدل بـ `summary` |

## 8. الحالات الحدّية (Edge Cases)

- الموظف فقد صلاحية بعد تحميل اللوحة: الوجهة تعرض «بلا صلاحية»؛ الجلب التالي يُسقط الإشعار.
- 500+ إشعار غير مقروء (متجر مهمل): العدّاد `99+`؛ «تعليم الكل» يُنفَّذ خادمياً دفعة واحدة.
- تبويبان مفتوحان: القراءة في أحدهما تنعكس في الآخر عند الجلب التالي أو عودة التركيز؛ لا WebSocket في الإصدار الأول.
- إشعار يشير إلى كيان حُذف: الوجهة 404 → تُعرض رسالة «لم يعد موجوداً» ويُعلَّم مقروءاً.
- Push على iOS بلا PWA مثبَّتة: يُعرض «ثبّت التطبيق أولاً» (M44).
- الخادم غائب (`[NEEDS BACKEND]` لم يُنفَّذ): FR-49.09؛ لا سجل أخطاء في console (تحذير واحد فقط).

## 9. معايير النجاح (Success Criteria)

- **SC-49.1**: من رؤية الإشعار إلى فتح وجهته ≤ 2 نقرات / ≤ 3 ثوانٍ.
- **SC-49.2**: العدّاد يطابق مجموع عدّادات الشريط الجانبي 100% (مصدر واحد).
- **SC-49.3**: اللوحة تُفتح وتُرسم في < 300ms مع كاش دافئ.
- **SC-49.4**: 0 إشعارات تُعرض لمستخدم بلا صلاحية وجهتها (فحص Mock بثلاثة أدوار).
- **SC-49.5**: اللوحة قابلة للاستخدام بالكامل بلوحة المفاتيح مع تركيز محصور في فحص Playwright.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M03 (topbar — غير موجود في الباك إند الحالي ويُبنى هنا)، M18 (الصلاحيات)، M44 (Push)، ووجهات: M06، M14، M18، M21، M25، M27، M28، M29، M39، M30.
- افتراض: الباك إند سيُولّد الإشعارات من الأحداث (signals/Celery) ويخزّنها في جدول لكل مستأجر مع فلترة بالصلاحيات؛ الواجهة لا تُركّب إشعارات من عدّادات متفرقة سوى كـ Mock انتقالي.
- افتراض: الأنواع العشرة في §5 عقد مقترح؛ إضافة نوع جديد لا تكسر الواجهة (نوع غير معروف يُعرض بأيقونة عامة وتسمية «إشعار»).
- افتراض: الاستطلاع كل 60 ثانية كافٍ للإصدار الأول؛ البث الحي يُقيَّم لاحقاً.
- افتراض: ملكية `/sw.js` تُقرَّر في M44؛ هذه الوحدة لا تسجّل SW.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: الجرس Lucide `bell` 20px بلا تعبئة؛ العدّاد نص Mono صغير بحد 1px لا دائرة حمراء ممتلئة؛ لا أيقونات نوع داخل دوائر ملونة؛ الشدة نقطة 6px فقط. لا toast لكل إشعار جديد (العدّاد يكفي).
- II: اللوحة تنزلق من جهة البداية؛ النقطة غير المقروء في جهة البداية (`ps-`)؛ الأوقات نسبية بالعربية مع المطلق عند التحويم (`Intl.RelativeTimeFormat('ar')`)؛ أسهم «فتح» تنعكس.
- IV: لقطات `docs/visual-checks/49-notifications/` للجرس بعدّاد/بلا، اللوحة (مجمَّعة/مفلترة/فارغة)، الصفحة الكاملة، الجوال، الداكن، وحالة «غير متاح».
- IX: مفاتيح الكاش `[tenant, 'notifications', 'summary']` بـ `refetchInterval` 60s و`refetchOnWindowFocus`؛ `[tenant, 'notifications', filters]` للقائمة؛ optimistic read عبر mutation مع rollback؛ فلاتر الصفحة الكاملة عبر nuqs؛ Zod لكل استجابة.
