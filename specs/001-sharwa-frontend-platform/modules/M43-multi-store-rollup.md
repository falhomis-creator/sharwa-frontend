# M43 — لوحة مالك المتاجر المتعددة (Multi-store Owner Rollup)

**Route group**: `(dashboard)` · **Priority**: P3 · **Backend status**: HTML-only `[NEEDS BACKEND]` (`merchant_master_dashboard` على `/merchant/master-dashboard/`؛ يقرأ من public schema عبر `schema_context`)
**Discovery refs**: `01-tenants-dashboard-admin.md` §2.1 (`MerchantAccount`, `MerchantAccountClient`, `TenantStatsSnapshot`), §3.2 (`merchant_master_dashboard`), §8 (`/merchant/master-dashboard/`), §9 (الفجوة: لا store switcher) · `00-module-map.md` E-43 · **Benchmarks**: BigCommerce multi-storefront (جدول متاجر بأرقام مقارنة)، Shopify Plus organization (تبديل متجر من الرأس بلا خروج)، Vercel teams switcher (قائمة بسيطة بحد 1px)

## 1. الهدف (Purpose)

تمكين المالك الذي يملك أكثر من متجر على المنصة من رؤية أداء كل متاجره في جدول واحد (الطلبات، المكتملة، المستردة، الإيراد بالريال السعودي) مع المجاميع، والانتقال إلى أي متجر بنقرة من مبدّل المتاجر في الرأس (M03). يُقاس بزمن الانتقال بين متجرَين وبدقة المجاميع مقابل اللقطات.

## 2. الفاعلون (Actors)

- **مالك متاجر متعددة**: `MerchantAccount.owner_phone` يطابق `Client.merchant_phone` للمتجر الحالي؛ المتاجر المرتبطة عبر `MerchantAccountClient`.
- **مالك متجر واحد**: لا `MerchantAccount` ⇒ `has_account=false`؛ يرى حالة فراغ موجِّهة.
- **النظام**: مهمة `aggregate_tenant_stats` تملأ `TenantStatsSnapshot` يومياً.
- **Super Admin**: يربط المتاجر بالحساب من Django admin (M46/M20)؛ خارج هذه الواجهة.

## 3. قصص المستخدم (User Stories)

### US-43.1 — جدول المتاجر والمجاميع (P1)
يفتح المالك «كل متاجري» فيرى صفاً لكل متجر (الاسم، النطاق، الطلبات، المكتملة، المستردة، الإيراد ر.س) وسطر مجاميع في الأسفل، مع فلتر نطاق تاريخ في الرابط.
**Independent Test**: حساب بمتجرَين ولقطات 30 يوماً؛ مجموع عمود الطلبات في الواجهة يطابق `totals.orders` من الخادم حرفياً.
**Acceptance**:
1. **Given** حساب بـ 3 متاجر، **When** تُفتح الصفحة، **Then** تظهر 3 صفوف مرتبة بالإيراد تنازلياً وسطر مجاميع بخط Mono من `totals`.
2. **Given** نطاق تاريخ `from=2026-09-01&to=2026-09-30`, **When** يُشارك الرابط، **Then** نفس الأرقام.
3. **Given** متجر بلا لقطات، **Then** يُعرض بصفر في كل الأعمدة مع تلميح «لا بيانات مجمَّعة بعد».

### US-43.2 — التبديل بين المتاجر (P1)
من مبدّل المتاجر في رأس لوحة التاجر (M03) يختار المالك متجراً فيُنقل إلى `https://<domain>/dashboard` بجلسة ذلك المتجر.
**Acceptance**:
1. **Given** متجر مختار، **When** يُضغط، **Then** يُفتح نطاقه الأساسي (`is_primary`) في نفس التبويب؛ وإن لم تكن جلسة فيُعرض `merchant_login` لذلك المتجر.
2. **Given** مالك متجر واحد، **Then** يُخفى المبدّل ويُعرض اسم المتجر فقط.

### US-43.3 — حالة بلا حساب متعدد (P2)
مالك بلا `MerchantAccount` يرى «هذه الصفحة لمالكي أكثر من متجر — تواصل مع الدعم لربط متاجرك» بلا جدول.
**Acceptance**:
1. **Given** `has_account=false`, **Then** لا يظهر عنصر الشريط «كل متاجري» أصلاً.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-43.01**: الوحدة MUST تظهر في الشريط/المبدّل فقط عندما `has_account=true` و`stores.length > 1`.
- **FR-43.02**: الجدول MUST يعرض الأعمدة من `TenantStatsSnapshot`: `orders_count`, `completed_orders_count`, `refunded_orders_count`, `revenue_sar` (كنص `display_revenue_sar`) مرتبة بالإيراد تنازلياً، وسطر مجاميع من الخادم.
- **FR-43.03**: المجاميع MUST تأتي من الخادم (`totals`); يُمنع جمع الأعمدة في المتصفح.
- **FR-43.04**: نطاق التاريخ MUST يعيش في الرابط عبر `nuqs` (افتراضي 30 يوماً).
- **FR-43.05**: مبدّل المتاجر MUST يُغذَّى من نفس عقد `stores[]` ويُعرض في رأس M03؛ المتجر الحالي مُعلَّم.
- **FR-43.06**: الانتقال بين المتاجر MUST يكون بتوجيه كامل إلى نطاق المتجر (جلسات منفصلة لكل مخطط)؛ يُمنع تمرير معرّف المتجر في query string.
- **FR-43.07**: الصفحة MUST تعرض تاريخ آخر لقطة لكل متجر (`last_snapshot_date`) لتوضيح حداثة البيانات.

## 5. الكيانات والحالات (Key Entities & States)

- **MerchantAccount** (public): `owner_phone` (فريد)، `owner_identity`. **MerchantAccountClient**: حساب ↔ `Client`.
- **Client**: `name`, `schema_name`, `merchant_phone`, `is_active`, `provisioning_status`; **Domain**: `domain`, `is_primary`.
- **TenantStatsSnapshot**: `client`, `date`, `orders_count`, `completed_orders_count`, `refunded_orders_count`, `revenue_sar`.
- **RollupRow** (مشتق): `name`, `schema`, `domain`, `orders`, `completed`, `refunded`, `display_revenue_sar`, `last_snapshot_date`, `is_current`.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/stores` (الجدول + المجاميع + فلتر التاريخ) · مبدّل المتاجر في رأس `(dashboard)` (قائمة منسدلة بحد 1px: اسم المتجر، النطاق Mono، علامة الحالي).
- **الحالات البصرية**: skeleton 3 صفوف · فراغ «لمالكي أكثر من متجر» · خطأ شبكة · بلا جلسة تاجر → `merchant_login`.
- **الجوال**: الجدول → قائمة صفوف (الاسم، الإيراد Mono، الطلبات/المكتملة/المستردة في سطر ثانٍ)؛ المبدّل في drawer سفلي من رأس الصفحة.
- **اختصارات**: `⌘K` → «الانتقال إلى متجر…» يعرض المتاجر المرتبطة.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| ملخص المتاجر + المجاميع | `merchant_master_dashboard` HTML → `{has_account, stores:[{name, schema, domain, orders, revenue}], totals:{orders, revenue, completed}}` | `[NEEDS BACKEND]` → `GET /api/v1/merchant/stores/?from&to` → `{has_account, current_schema, stores:[{name, schema, domain, orders, completed, refunded, display_revenue_sar, last_snapshot_date}], totals:{orders, completed, refunded, display_revenue_sar}}` (يضيف `completed`/`refunded` لكل متجر من نفس اللقطات) |
| مبدّل المتاجر (M03) | غير موجود (لا topbar) | نفس العقد أعلاه بلا فلتر تاريخ؛ يُخزَّن في كاش M03 بمفتاح المستأجر |

## 8. الحالات الحدّية (Edge Cases)

- متجر مرتبط لكنه `provisioning_status != 'ready'` أو `is_active=false`: يُعرض الصف بشارة «غير متاح» وبلا رابط.
- `owner_phone` للحساب لا يطابق `merchant_phone` للمتجر الحالي (دخول من متجر غير مرتبط): `has_account=false` لهذا المتجر؛ تُعرض حالة الفراغ.
- متجر بلا نطاق أساسي: يُعرض `#` من الخادم ⇒ الواجهة تعرض «بلا نطاق» وتُعطّل الانتقال.
- فروقات بين الإيراد هنا (لقطة يومية بالريال) وتقارير M25 (عملة المتجر): تلميح «قيم مجمَّعة بالريال السعودي من لقطات يومية».
- لقطات ناقصة لأيام: تُعرض كما هي؛ لا استيفاء.

## 9. معايير النجاح (Success Criteria)

- **SC-43.1**: مجاميع الواجهة تطابق `totals` الخادم 100%.
- **SC-43.2**: الانتقال من متجر إلى آخر ≤ 2 نقرات.
- **SC-43.3**: الجدول بـ 20 متجراً يُرسم في < 500ms.
- **SC-43.4**: 0 حالات يُمرَّر فيها معرّف المتجر في query string.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M03 (الرأس والمبدّل)، M25 (تعريف الإيراد)، M46/M20 (ربط المتاجر بالحساب من الإدمن).
- افتراض: التسجيل يفرض متجراً واحداً لكل هاتف؛ تعدد المتاجر يُنشأ إدارياً عبر `MerchantAccountClient`؛ لا واجهة ذاتية لإضافة متجر هنا.
- افتراض: الجلسة لكل متجر منفصلة (schema)؛ المبدّل يوجّه بالنطاق ولا يشارك الجلسة.
- افتراض: فلتر التاريخ يُطبَّق في الخادم على `TenantStatsSnapshot.date`؛ حتى توفره تُعرض كل اللقطات.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا 4 بطاقات KPI أعلى الجدول؛ المجاميع سطر أخير بخط Mono. لا رسوم بيانية هنا (التقارير في M25).
- II: الأعمدة الرقمية Mono محاذاة نهاية؛ النطاقات داخل `<bdi>` LTR؛ المبدّل يفتح من الجهة المنطقية البداية.
- IV: لقطات `docs/visual-checks/43-stores/{desktop,tablet,mobile,desktop-dark}.png` تشمل حالة الفراغ والمبدّل المفتوح.
- VIII: مفاتيح الكاش بمعرّف المستأجر الحالي؛ الانتقال بين المتاجر بتوجيه كامل إلى الـ host؛ لا كاش مشترك بين المتاجر.
