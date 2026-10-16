# M18 — الموظفون والأدوار والصلاحيات (Staff & RBAC)

**Route group**: `(dashboard)` · **Priority**: P2 · **Backend status**: HTML-only لكل الشاشات `[NEEDS BACKEND]`
**Discovery refs**: `02-products-domain-model.md` §8 (StaffMember, LocationStaffAssignment), §10 (RBAC, Sessions, Approvals, Audit, Behavior) · `01-tenants-dashboard-admin.md` §3.2 (Staff/RBAC views), §4 (الموظفون والصلاحيات), §2 (`StaffSessionMiddleware`) · `03-api-payments-shipping-theme-integrations.md` §2 (مصادقة الموظف، `permission_code`) · **Benchmarks**: Linear Members (قائمة أعضاء كثيفة، أدوار كقيم نصية)، Vercel Teams (مصفوفة الوصول، الرموز الشخصية، الأجهزة)، Shopify Staff (صلاحيات مجمَّعة بمربعات اختيار واضحة)

## 1. الهدف (Purpose)

تمكين مالك المتجر من إضافة موظفيه برقم الهاتف، تعيين أدوارهم لكل موقع، ضبط الصلاحيات الدقيقة والاستثناءات، إنهاء الجلسات والأجهزة، معالجة طلبات الموافقة، ومراجعة سجل تدقيق لا يُزوَّر. يُقاس بزمن إضافة موظف وتفعيله وبنسبة الإجراءات الحساسة التي مرّت عبر موافقة.

## 2. الفاعلون (Actors)

- **مالك المتجر**: كل شيء (الميزة `staff_rbac`).
- **موظف** بصلاحيات `staff.view` · `staff.manage` · `staff.manage_roles` · `staff.manage_assignments` · `staff.view_sessions`.
- **المعتمِد**: صاحب `approver_role` لطلبات الموافقة (مثل `orders.approve_b2b`, `suppliers.approve`).
- **النظام**: يُنتج تنبيهات سلوكية، يُصعِّد الموافقات (`escalated_at`)، يُلزم الجدول (`enforce_roster_schedule`) وقائمة IP.

## 3. قصص المستخدم (User Stories)

### US-18.1 — قائمة الموظفين وإضافة موظف (P1)
يرى المالك جدول موظفيه بالاسم والهاتف والأدوار/المواقع والحالة وآخر نشاط، ويُضيف موظفاً برقم هاتفه.
**Independent Test**: إضافة موظف برقم `0770841802` → يُطبَّع إلى `967770841802` كما يفعل الخادم ويظهر في الجدول بحالة «نشط» بلا تعيينات.
**Acceptance**:
1. **Given** نموذج الإضافة، **Then** الحقول: `full_name`, `phone` (فريد)، `is_active`, `enforce_ip_whitelist`, `enforce_roster_schedule`؛ التكرار يُعرض برسالة الخادم تحت الحقل.
2. **Given** موظف نشط، **When** يُختار «إنهاء الخدمة»، **Then** يُطلب تأكيد، ويُعيَّن `terminated_at` وتُلغى كل جلساته؛ الصف يبقى بشارة «مُنهى» ولا يُحذف.
3. **Given** موظف، **When** يُختار «إبطال كل الجلسات»، **Then** يُرفع `token_version` وتُعرض رسالة «سيُطلب من الموظف الدخول مجدداً على كل أجهزته».

### US-18.2 — الأدوار والصلاحيات (P1)
يرى المالك الأدوار النظامية الأربعة ويُنشئ أدواراً مخصصة بصلاحيات مجمَّعة وحد خصم.
**Acceptance**:
1. **Given** قائمة الأدوار، **Then** تظهر الأدوار النظامية (`is_system_role=true`) للقراءة: مدير المتجر (الكل) · مدير الفرع (الكل، `max_discount_percent` 20) · كاشير (`orders.view`, `orders.update_status`, `customers.view`, `inventory.view`, `discounts.apply`؛ 10%) · أمين مخزن (`orders.view`, `inventory.view`, `inventory.adjust`, `inventory.writeoff`, `reports.view`)، مع زر «نسخ كدور مخصص».
2. **Given** نموذج دور مخصص، **Then** `name`, `max_discount_percent`, ومصفوفة الصلاحيات مجمَّعة حسب `category` بمربعات اختيار مع «تحديد الكل» لكل مجموعة، وعدّاد «n من 35» بخط Mono.
3. **Given** مجموعة التقارير، **When** يُحدَّد `reports.profit.view`, **Then** يُقترح تلقائياً `reports.view` (الأصل) مع إمكانية الرفض.

### US-18.3 — مصفوفة الموظف × الموقع × الدور (P1)
في تفاصيل الموظف، يُعيِّن المالك دوراً لكل موقع، ويُضيف استثناءات صلاحيات فردية.
**Acceptance**:
1. **Given** تفاصيل موظف، **Then** جدول صفوفه المواقع (M22) وأعمدته: الدور (`StaffLocationRole`) ودور الموقع التشغيلي (`LocationStaffAssignment.role`: `manager` · `cashier` · `warehouse_operator` · `driver` · `pickup_agent`)، وزر «إزالة».
2. **Given** `PermissionOverride`, **When** تُضاف، **Then** يُختار مفتاح صلاحية و«سماح/منع» ويُعرض الأثر الفعلي «الصلاحية النهائية» بجانب كل مفتاح (من الدور + الاستثناء).
3. **Given** موظف بلا أي تعيين، **Then** تنبيه «لن يستطيع الدخول إلى أي موقع».

### US-18.4 — الجلسات والرموز والأجهزة والجدول (P2)
**Acceptance**:
1. **Given** تبويب الجلسات (`staff.view_sessions`), **Then** جدول `StaffSession` (الجهاز، IP، آخر نشاط) مع «إنهاء» لكل جلسة و«إنهاء الكل».
2. **Given** `PersonalAccessToken`, **Then** قائمة بالاسم وتاريخ الإنشاء وآخر استخدام و«إبطال»؛ قيمة الرمز لا تُعرض أبداً بعد الإنشاء.
3. **Given** `TrustedDevice`, **Then** قائمة الأجهزة الموثوقة مع «إزالة».
4. **Given** `RosterSchedule` و`enforce_roster_schedule=true`, **Then** شبكة أسبوعية (0 = الأحد) لساعات السماح بالدخول.

### US-18.5 — طلبات الموافقة (P1)
يرى المعتمِد الطلبات المعلّقة بنوعها وطالبها وتفاصيلها ويوافق/يرفض مع ملاحظة.
**Acceptance**:
1. **Given** طلب `pending` من نوع `refund` · `shift_shortage` · `stock_writeoff` · `discount_exception` · `order_approval` · `po_approval`, **When** يُفتح، **Then** تُعرض لقطة الطلب (المبلغ/العنصر/السبب) ورابط الكيان المرتبط (M06/M16/M21/M23).
2. **Given** الطالب هو المستخدم الحالي، **Then** زرّا القرار معطّلان بتلميح «لا يمكنك الموافقة على طلبك».
3. **Given** قرار مع `version` قديم، **Then** 409 → «حُسم الطلب من مستخدم آخر» مع إعادة التحميل.
4. **Given** طلب `escalated_at` غير فارغ، **Then** شارة «مُصعَّد» وترتيبه أعلى القائمة.

### US-18.6 — سجل التدقيق والتنبيهات السلوكية (P2)
**Acceptance**:
1. **Given** سجل التدقيق، **Then** جدول `action_code`، الفاعل، الوقت، مع «قبل/بعد» (`before_snapshot`/`after_snapshot`) كفرق مضغوط، و`row_hash` مختصر بخط Mono.
2. **Given** زر «التحقق من سلامة السجل»، **When** يُضغط، **Then** يُعرض نتيجة `verify_chain()`: «السجل سليم» أو «انقطاع في السلسلة عند السطر n» بلون دلالي.
3. **Given** تنبيه سلوكي `warning` · `critical` (أنواع `export_volume` · `view_volume` · `message_volume`), **Then** يُعرض مع الموظف والقيمة مقابل الحد، وزر «تعليم كمقروء» ورابط الجلسات للإنهاء الفوري.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-18.01**: الموظف يُعرَّف بالهاتف فقط (لا بريد ولا كلمة مرور في النموذج)؛ التطبيع يطابق الخادم.
- **FR-18.02**: الإنهاء MUST يكون soft (`terminated_at`) ولا يُحذف الموظف؛ الحذف غير متاح في الواجهة.
- **FR-18.03**: مصفوفة الصلاحيات MUST تُبنى من قائمة المفاتيح التي يرسلها الخادم (`Permission.code/name/category`)، لا من قائمة ثابتة؛ تُجمَّع بالـ`category`.
- **FR-18.04**: الأدوار النظامية MUST تكون للقراءة فقط مع إمكانية النسخ.
- **FR-18.05**: الصلاحية النهائية لكل مفتاح MUST تُحسب وتُعرض (دور الموقع ∪ … ثم الاستثناء) بنفس ترتيب `permission_resolver` في الخادم؛ عند الشك تُعرض قيمة الخادم.
- **FR-18.06**: قرارات الموافقة MUST تُرسل `version` وتعالج 409؛ المنع الذاتي يُطبَّق في الواجهة والخادم.
- **FR-18.07**: الواجهة MUST لا تعرض قيم الرموز الشخصية إلا مرة واحدة عند الإنشاء، مع زر نسخ.
- **FR-18.08**: كل القوائم MUST تحمل فلاترها في الرابط وتدعم ترقيماً خادمياً؛ سجل التدقيق بلا تعديل أو حذف.
- **FR-18.09**: عناصر الشريط الجانبي MUST تُخفى حسب المفاتيح (`staff.view` للقائمة، `staff.manage_roles` للأدوار، `staff.view_sessions` للجلسات)؛ وتُخفى الوحدة حين `staff_rbac` معطّلة.
- **FR-18.10**: عدّاد الموافقات المعلّقة والتنبيهات غير المقروءة MUST يظهر في الشريط الجانبي ويُحدَّث كل 60 ثانية.

## 5. الكيانات والحالات (Key Entities & States)

- **StaffMember**: `full_name`, `phone` (فريد), `token_version`, `is_active`, `terminated_at`, `enforce_ip_whitelist`, `enforce_roster_schedule`. حالات العرض: نشط · معطّل · مُنهى.
- **Role**: `name`, `is_system_role`, `max_discount_percent`؛ **RolePermission**؛ **Permission**: `code`, `name`, `category`.
- **مفاتيح الصلاحيات** (كما وثَّقها الاكتشاف): `orders.view` · `orders.update_status` · `orders.refund` · `orders.delete` · `orders.process_returns` · `orders.create_b2b` · `orders.approve_b2b` · `staff.view` · `staff.manage` · `staff.manage_roles` · `staff.manage_assignments` · `staff.view_sessions` · `customers.view` · `customers.edit_profile` · `customers.manage_tier` · `customers.export` · `inventory.view` · `inventory.adjust` · `inventory.writeoff` · `reports.view` · `reports.export` · `reports.sales.view` · `reports.profit.view` · `reports.inventory.view` · `reports.customers.view` · `reports.staff_performance.view` · `discounts.apply` · `discounts.manage` · `suppliers.manage` · `suppliers.approve` · `support.takeover_session` · `channels.inbox.access` · `channels.marketplaces.manage` · `channels.dropshipping.manage`.
- **StaffLocationRole** (موظف × موقع × دور) · **LocationStaffAssignment.role**: `manager` · `cashier` · `warehouse_operator` · `driver` · `pickup_agent` · **PermissionOverride** (مفتاح + سماح/منع).
- **StaffSession**, **PersonalAccessToken**, **TrustedDevice**, **RosterSchedule** (0 = الأحد).
- **ApprovalRequest**: `request_type` (6)، `status` `pending` · `approved` · `rejected`، `approver_role`, `version`, `escalated_at`.
- **AuditLog** (append-only): `action_code`, `before_snapshot`, `after_snapshot`, `prev_hash`, `row_hash`؛ `verify_chain()`.
- **BehaviorAlert**: `level` `warning` · `critical`؛ النوع `export_volume` · `view_volume` · `message_volume`؛ **StaffDailyUsage**.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/staff` (الجدول + sheet إضافة) · `/dashboard/staff/[id]` (تبويبات: التعيينات · الاستثناءات · الجلسات والأجهزة · الجدول) · `/dashboard/staff/roles` + `/new` + `/[id]` (مصفوفة الصلاحيات) · `/dashboard/staff/approvals` (+ sheet التفاصيل) · `/dashboard/staff/audit-log` · `/dashboard/staff/alerts`.
- **الحالات البصرية**: skeleton صفوف 44px · فراغ («لا موظفين بعد — أضف أول موظف برقم هاتفه» / «لا طلبات معلّقة» / «لا تنبيهات») · خطأ · بلا صلاحية · الميزة معطّلة · 409 تعارض.
- **الجوال**: الجدول → بطاقات (اسم، هاتف، أدوار كنص)؛ مصفوفة الصلاحيات → أكورديون لكل مجموعة؛ الموافقات → قائمة بأزرار كبيرة ≥ 44px.
- **اختصارات**: `⌘K` → «موظف جديد» / «طلبات الموافقة» · `A` موافقة · `R` رفض داخل sheet الطلب · `/` بحث.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| قائمة/إضافة موظفين | `staff_list` HTML | `[NEEDS BACKEND]` → `GET/POST /api/v1/staff/?status&q&page` → `{count, results:[{id, full_name, phone, is_active, terminated_at, roles_summary, last_seen_at}]}` |
| تفاصيل/تعديل/إنهاء | `staff_detail` | `[NEEDS BACKEND]` → `GET/PATCH /api/v1/staff/<id>/`, `POST /<id>/terminate/`, `POST /<id>/revoke-sessions/` (يرفع `token_version`) |
| قائمة الصلاحيات | `Permission` (نماذج) | `[NEEDS BACKEND]` → `GET /api/v1/permissions/` → `[{code, name, category}]` |
| الأدوار CRUD | `staff_roles` | `[NEEDS BACKEND]` → `GET/POST /api/v1/roles/`, `PATCH/DELETE /<id>/` `{name, max_discount_percent, permission_codes[]}`؛ النظامية ترفض التعديل 403 |
| التعيينات | `staff.manage_assignments` HTML | `[NEEDS BACKEND]` → `GET/PUT /api/v1/staff/<id>/assignments/` `[{location_id, role_id, location_role}]` |
| الاستثناءات | `PermissionOverride` | `[NEEDS BACKEND]` → `GET/POST/DELETE /api/v1/staff/<id>/overrides/` `{permission_code, allow}`؛ `GET /<id>/effective-permissions/?location_id` |
| الجلسات/الرموز/الأجهزة/الجدول | `end_staff_session(s)` | `[NEEDS BACKEND]` → `GET/DELETE /api/v1/staff/<id>/sessions/[<sid>/]`, `GET/POST/DELETE /tokens/`, `GET/DELETE /devices/`, `GET/PUT /roster/` |
| طلبات الموافقة | `approval_requests`, `resolve_approval` POST | `[NEEDS BACKEND]` → `GET /api/v1/approvals/?status&type&page`, `POST /<id>/resolve/` `{decision: approved|rejected, note?, version}` → 200/409 |
| سجل التدقيق | `audit_log`, `verify_audit_chain` | `[NEEDS BACKEND]` → `GET /api/v1/audit-log/?actor&action&from&to&page`, `POST /api/v1/audit-log/verify/` → `{ok, broken_at?}` |
| التنبيهات السلوكية | `behavior_alerts` | `[NEEDS BACKEND]` → `GET /api/v1/behavior-alerts/?level&unread`, `POST /<id>/read/` |
| العدّادات | ضمن الشريط الجانبي | `[NEEDS BACKEND]` → `GET /api/v1/staff/counters/` → `{pending_approvals, unread_alerts}` |

## 8. الحالات الحدّية (Edge Cases)

- موظف مُنهى له جلسة نشطة قديمة: الخادم يرفضها بـ`token_version`؛ الواجهة تعرض «مُنهى» وتُخفي زر الإنهاء.
- دور مخصص بـ`max_discount_percent` أعلى من دور مدير الفرع: يُسمح مع تحذير.
- حذف دور مُعيَّن لموظفين: الخادم يرفض؛ تُعرض قائمة الموظفين المتأثرين.
- طلب موافقة مرتبط بكيان حُذف/أُلغي: يُعرض من اللقطة بشارة «الكيان غير متاح».
- نتيجة التحقق من السلسلة «انقطاع»: تُعرض بلون الخطأ مع السطر، بلا زر إصلاح (قراءة فقط).
- تنبيه `critical` لموظف مُنهى: يُعرض مع شارة الإنهاء وتُخفى أزرار الإجراء.
- `enforce_ip_whitelist=true` بلا عناوين محددة في الخادم: تحذير «سيُمنع الدخول حتى تُضاف عناوين».

## 9. معايير النجاح (Success Criteria)

- **SC-18.1**: إضافة موظف وتعيينه على موقع بدور ≤ 60 ثانية.
- **SC-18.2**: 0 حالات يستطيع فيها المستخدم الموافقة على طلبه (فحص آلي).
- **SC-18.3**: 100% من المفاتيح المعروضة في المصفوفة تأتي من الخادم وتطابق عددها عدّاد «n من N».
- **SC-18.4**: زمن حسم طلب موافقة من الفتح ≤ 2 نقرات.
- **SC-18.5**: 0 قيم رموز شخصية في DOM بعد إغلاق حوار الإنشاء.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M03، M22 (المواقع)، M16 (الورديات — خارج هذه الوحدة)، M06/M21/M23 (كيانات الموافقات)، M49 (مركز الإشعارات للعدّادات).
- افتراض: الاكتشاف يوثّق 34 مفتاحاً بالاسم والباك إند يذكر 35؛ المصفوفة تُبنى من `GET /api/v1/permissions/` فلا يُخترع المفتاح الناقص.
- افتراض: الصلاحية النهائية تُعرض كما يحسبها الخادم (`effective-permissions`)؛ الحساب المحلي للمعاينة فقط.
- افتراض: الورديات ودرج الكاش والأدوار التشغيلية لـ POS في M16؛ هنا التعيين فقط.
- افتراض: الأسماء العربية لمفاتيح الصلاحيات تأتي من `Permission.name` في الخادم.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا صور رمزية (avatars) ملونة بأحرف أولى عشوائية — دائرة رمادية بحد 1px؛ لا بطاقات أدوار متماثلة بل جدول كثيف؛ الحالات نص دلالي لا شارات ملونة ممتلئة.
- II: أرقام الهواتف وقيم hash والنِسب بخط Mono مع `dir="ltr"` للهاتف والـ hash؛ مصفوفة الصلاحيات تبدأ أعمدتها من اليمين؛ أسهم الأكورديون تنعكس.
- IV: لقطات `docs/visual-checks/18-staff/` للقائمة، مصفوفة الصلاحيات، تفاصيل موظف (التعيينات)، الموافقات، سجل التدقيق مع نتيجة التحقق، الجوال، الداكن.
