# M14 — المدفوعات والمحافظ والتحويلات (Payments, Wallets & Payouts)

**Route group**: `(dashboard)` · **Priority**: P2 · **Backend status**: HTML-only لكل الشاشات `[NEEDS BACKEND]`
**Discovery refs**: `03-api-payments-shipping-theme-integrations.md` §3 (العملات، SharwaPay، PaymentCredential، PayoutAccount، GATEWAY_REGISTRY) · `02-products-domain-model.md` §11 (PaymentCredential/PayoutAccount، أعلام StoreSetting), §12 (MerchantWallet، MerchantWithdrawalRequest، PlatformCommissionRecord/AppBillingCharge), §15 (`GatewayCredentialForm`) · `01-tenants-dashboard-admin.md` §3.2 (Payments views), §4 (الدفع، محفظة المتجر) · **Benchmarks**: Stripe Dashboard (أرقام Mono، جداول معاملات نظيفة، إدارة مفاتيح مقنَّعة)، Polar (محفظة وسحب ببساطة ووضوح الحالة)

## 1. الهدف (Purpose)

تمكين التاجر من ربط بوابات الدفع وتفعيل Sharwa Pay والتحويل اليدوي، وإدارة حساباته البنكية/المحفظية المعروضة للعميل، ومتابعة محفظة متجره بأربع عملات وطلبات السحب والمستحقات للمنصة، من مكان واحد بلا كشف أي سرّ. يُقاس بزمن ربط أول بوابة ونسبة طلبات السحب المرفوضة لأخطاء إدخال.

## 2. الفاعلون (Actors)

- **مالك المتجر**: الوحيد المخوَّل (الميزات `payment_gateways` · `local_wallets` · `bank_transfers` · `merchantwallet`).
- **الموظفون**: لا وصول (لا مفتاح صلاحية مالي ضمن الـ 35).
- **مالك المنصة (M20)**: يوافق/يرفض طلبات السحب، ويُحصِّل/يُعفي المستحقات.
- **النظام**: يُحدِّث أرصدة المحفظة من الطلبات والاسترجاعات والعمولات.

## 3. قصص المستخدم (User Stories)

### US-14.1 — ربط بوابة دفع (P1)
يفتح التاجر «ربط بوابات الدفع» فيرى البوابات المتاحة (`jeeb`, `kuraimi`) وحالة كل منها، ويُدخل بيانات الاعتماد في نموذج ديناميكي بحقول البوابة، ويُفعِّلها.
**Independent Test**: فتح `kuraimi` → تُعرض الحقول المعرَّفة في الخادم بأسمائها؛ بعد الحفظ تُعرض الحقول السرّية كـ `••••••••` مع «آخر 4 أحرف» فقط ولا تُعاد القيمة أبداً.
**Acceptance**:
1. **Given** بوابة بلا اعتمادات، **When** تُفتح، **Then** يُعرض النموذج فارغاً مع شارة «غير مربوطة» ومفتاح `is_enabled` معطّل حتى الحفظ.
2. **Given** بوابة مربوطة، **When** تُفتح، **Then** الحقول السرّية مقنَّعة وللكتابة فقط («اتركه فارغاً للإبقاء على القيمة الحالية»)، والحقول غير السرّية مقروءة.
3. **Given** `is_enabled` مفعَّل لبوابة، **When** يُعطَّل، **Then** يُطلب تأكيد «ستختفي البوابة من صفحة الدفع فوراً».

### US-14.2 — Sharwa Pay والتحويل اليدوي (P1)
يُفعِّل التاجر قبول محفظة Sharwa Pay (`enable_sharwa_pay`) وقبول التحويل اليدوي بإيصال (`enable_manual_payment`).
**Acceptance**:
1. **Given** `enable_manual_payment=true` ولا حساب تحويل نشط، **When** يُحفظ، **Then** يُعرض تحذير «أضف حساباً بنكياً أو محفظة ليراها العميل» مع رابط.
2. **Given** `enable_sharwa_pay`, **When** يُبدَّل، **Then** يُعرض شرح مختصر: «يدفع العميل من رصيد Sharwa Pay برمز OTP؛ يُقيَّد المبلغ في محفظة متجرك».

### US-14.3 — حسابات التحويل والمحافظ المحلية (P1)
يُدير التاجر الحسابات التي تُعرض للعميل عند التحويل اليدوي: بنكية أو محفظة محلية، باسم المزوّد ورقم الحساب واسم صاحبه وترتيب العرض.
**Acceptance**:
1. **Given** إضافة حساب، **Then** الحقول: `account_type` (`bank` بنك · `wallet` محفظة)، `provider_name`, `account_number`, `account_name`, `is_active`, `sort_order`.
2. **Given** قائمة الحسابات، **When** تُسحب، **Then** يتغيّر `sort_order` وتُعرض معاينة «كما يراها العميل» بجانب القائمة.
3. **Given** حساب غير نشط، **Then** لا يظهر في المعاينة ويبقى في القائمة بشارة «مخفي».

### US-14.4 — محفظة المتجر (P1)
يرى التاجر أرصدته في أربع عملات منفصلة بلا تحويل، وسجل الحركات، ويُقدِّم طلب سحب بعملة محددة.
**Independent Test**: رصيد `SAR 1,250.00` و`YER_NEW 0` → يُعرض كل رصيد في صفّه بخط Mono، ولا يُعرض «إجمالي» مُحوَّل.
**Acceptance**:
1. **Given** المحفظة، **When** تُفتح، **Then** تُعرض 4 صفوف `SAR` ريال سعودي · `USD` دولار أمريكي · `YER_OLD` يمني صنعاء · `YER_NEW` يمني عدن بالقيم المنسّقة من الخادم، ويُمنع أي جمع أو تحويل في الواجهة.
2. **Given** طلب سحب، **When** يُفتح النموذج، **Then** تُختار العملة من الأربع والمبلغ ≤ الرصيد المتاح وحساب الاستلام من حسابات التحويل النشطة، مع تأكيد قبل الإرسال.
3. **Given** طلبات السحب، **Then** تُعرض بحالاتها `pending` قيد المراجعة · `approved` مُنفَّذ · `rejected` مرفوض مع التاريخ وسبب الرفض إن وُجد.
4. **Given** سجل الحركات، **Then** جدول: التاريخ، النوع، المرجع (رقم طلب/عمولة/سحب كرابط)، المبلغ Mono محاذاة نهاية بإشارة، الرصيد بعد.

### US-14.5 — مستحقات المنصة (P2)
يرى التاجر للقراءة فقط سجلات العمولة (`PlatformCommissionRecord`) ورسوم التطبيقات (`AppBillingCharge`) بحالاتها.
**Acceptance**:
1. **Given** المستحقات، **Then** تبويبان (عمولات / رسوم تطبيقات) بحالات `pending` مستحق · `collected` محصَّل · `waived` مُعفى، وشريط أرقام Mono للمجاميع لكل حالة كما يرسلها الخادم.
2. **Given** `commission_enabled=false` على المنصة، **Then** تُعرض ملاحظة «العمولات غير مفعّلة حالياً» بدل جدول فارغ.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-14.01**: الواجهة MUST لا تستلم ولا تعرض أي قيمة سرّية؛ تقرأ فقط `has_credentials` وأسماء الحقول وقناعاً مختصراً يرسله الخادم.
- **FR-14.02**: نموذج الاعتماد MUST يُبنى من وصف الحقول الذي يرسله الخادم لكل `gateway_code` (اسم، نوع، سرّي/غير سرّي، إلزامي)، لا من قائمة ثابتة في الواجهة.
- **FR-14.03**: كل المبالغ والأرصدة MUST تُعرض كما يرسلها الخادم (`display_*`) بخط Mono؛ يُمنع الجمع أو التحويل بين العملات في الواجهة.
- **FR-14.04**: طلب السحب MUST يتحقق محلياً أن المبلغ ≤ الرصيد المتاح للعملة المختارة وأن حساب الاستلام نشط، ويُطلب تأكيد صريح.
- **FR-14.05**: المفاتيح (`enable_sharwa_pay`, `enable_manual_payment`, `is_enabled` للبوابة) MUST تُحفظ فوراً عند التبديل مع Toast وإمكانية التراجع خلال 5 ثوانٍ.
- **FR-14.06**: سجل الحركات والمستحقات MUST يدعم فلاتر العملة/النوع/النطاق الزمني في الرابط وترقيماً خادمياً.
- **FR-14.07**: الوحدة MUST تُخفي كل شاشة ميزتُها معطّلة، وتعرض «الميزة غير متاحة» عند الوصول المباشر.
- **FR-14.08**: الحقول السرّية MUST تكون `type=password` مع زر إظهار مؤقت أثناء الإدخال فقط، و`autocomplete="off"`.

## 5. الكيانات والحالات (Key Entities & States)

- **PaymentCredential**: `gateway_code` (من `GATEWAY_REGISTRY`: `jeeb` · `kuraimi`)، `is_enabled`, `credentials_encrypted` (لا يُعرض). حالات العرض: غير مربوطة · مربوطة معطّلة · مربوطة مفعّلة.
- **StoreSetting (payments)**: `enable_sharwa_pay`, `enable_manual_payment`, `merchant_balance` (قديم؛ يُستبدل بالمحفظة).
- **PayoutAccount**: `account_type` (`bank` · `wallet`), `provider_name`, `account_number`, `account_name`, `is_active`, `sort_order`. للعرض للعميل فقط.
- **MerchantWallet** (مفرد pk=1): أربعة أرصدة بعملات `SAR` · `USD` · `YER_OLD` · `YER_NEW` بلا تحويل.
- **MerchantWithdrawalRequest**: `status` `pending` · `approved` · `rejected`؛ المبلغ، العملة، الحساب، التاريخ.
- **PlatformCommissionRecord** / **AppBillingCharge**: `status` `pending` · `collected` · `waived`؛ للقراءة فقط.
- **Order.payment_method** (مرجعي): `manual` · `sharwa_pay` + أكواد البوابات.
- انتقالات: السحب `pending → approved|rejected` من M20 فقط؛ المستحقات تُغيَّر من M20 فقط.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/payments` (نظرة عامة: البوابات + المفتاحان) · `/dashboard/payments/gateways/[code]` (sheet النموذج الديناميكي) · `/dashboard/payments/accounts` (حسابات التحويل والمحافظ المحلية بتبويبَي `bank` / `wallet` + معاينة العميل) · `/dashboard/wallet` (الأرصدة + الحركات) · `/dashboard/wallet/withdrawals` + `/new` · `/dashboard/wallet/dues` (عمولات / رسوم تطبيقات).
- **الحالات البصرية**: skeleton · فراغ («لا حركات بعد» / «لا طلبات سحب» / «لا حسابات — أضف حساباً») · خطأ مع إعادة المحاولة · الميزة معطّلة · العمولات غير مفعّلة.
- **الجوال**: البوابات قائمة صفوف؛ النموذج صفحة كاملة؛ الأرصدة الأربعة قائمة عمودية؛ جدول الحركات → بطاقات (نوع، مبلغ، تاريخ).
- **اختصارات**: `⌘K` → «محفظة المتجر» / «طلب سحب» · `W` طلب سحب من صفحة المحفظة.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| قائمة البوابات وحالتها | `payment_gateways` HTML | `[NEEDS BACKEND]` → `GET /api/v1/payments/gateways/` → `[{gateway_code, name, is_enabled, has_credentials, fields:[{name, label, is_secret, required, masked_hint?}]}]` |
| حفظ اعتمادات بوابة | `GatewayCredentialForm` POST | `[NEEDS BACKEND]` → `PUT /api/v1/payments/gateways/<code>/credentials/` `{<field>: value}` (الحقول الفارغة تُبقي القيمة) → 204 |
| تفعيل/تعطيل بوابة | ضمن نفس النموذج | `[NEEDS BACKEND]` → `PATCH /api/v1/payments/gateways/<code>/` `{is_enabled}` |
| مفتاح Sharwa Pay | `save_sharwa_pay_toggle` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/store/payments/` `{enable_sharwa_pay}` |
| مفتاح التحويل اليدوي | `save_manual_payment_toggle` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/store/payments/` `{enable_manual_payment}` |
| حسابات التحويل CRUD | `bank_transfers`, `local_wallets`, payout accounts CRUD | `[NEEDS BACKEND]` → `GET/POST /api/v1/payments/payout-accounts/?account_type`, `PATCH/DELETE /<id>/`, `POST /reorder/` `{ordered_ids}` |
| أرصدة المحفظة | `merchant_wallet` HTML | `[NEEDS BACKEND]` → `GET /api/v1/wallet/` → `{balances:[{currency, display_balance, display_available}]}` |
| حركات المحفظة | ضمن `merchant_wallet` | `[NEEDS BACKEND]` → `GET /api/v1/wallet/transactions/?currency&type&from&to&page` → `{count, results:[{id, type, reason, reference:{kind,id}, display_amount, display_balance_after, created_at}]}` |
| طلبات السحب | `merchant_withdrawal_request` POST | `[NEEDS BACKEND]` → `GET/POST /api/v1/wallet/withdrawals/` `{currency, amount, payout_account_id}` → `{id, status}` |
| المستحقات للمنصة | Django admin / `master-dashboard/dues` | `[NEEDS BACKEND]` → `GET /api/v1/wallet/dues/?kind=commission|app_charge&status&page` → `{totals:{pending, collected, waived}, results:[...]}` |

## 8. الحالات الحدّية (Edge Cases)

- الخادم يُعيد بوابة غير معروفة للواجهة: تُعرض بالاسم من الخادم ونموذجها الديناميكي بلا أيقونة مخصصة.
- رصيد صفر في عملة: الصف يبقى ظاهراً بـ`0.00` وزر السحب معطّل بتلميح.
- طلب سحب `pending` قائم بنفس العملة: يُسمح بطلب جديد لكن يُعرض تحذير بالمبلغ المحجوز.
- حذف حساب تحويل مرتبط بطلب سحب `pending`: الخادم يرفض؛ تُعرض الرسالة ويُقترح التعطيل.
- `credentials_encrypted` موجودة لكن `is_enabled=false`: شارة «مربوطة — معطّلة» لا «غير مربوطة».
- انقطاع أثناء حفظ الاعتمادات: لا يُفترض الحفظ؛ تُعرض إعادة المحاولة والحقول السرّية تبقى في الذاكرة حتى الخروج فقط.

## 9. معايير النجاح (Success Criteria)

- **SC-14.1**: 0 قيم سرّية في أي استجابة شبكة أو في DOM بعد الحفظ (فحص آلي).
- **SC-14.2**: ربط بوابة من الفتح إلى التفعيل ≤ 90 ثانية.
- **SC-14.3**: 100% من المبالغ تُعرض بنفس السلسلة الواردة من الخادم (لا تنسيق محلي).
- **SC-14.4**: 0 حالات تُعرض فيها أرصدة عملات مختلفة مجموعة في رقم واحد.
- **SC-14.5**: طلب سحب خاطئ (مبلغ > الرصيد) يُمنع محلياً 100% قبل الإرسال.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M03، M06 (مراجع الطلبات في الحركات)، M20 (الموافقات والمستحقات)، M12 (أثر المفاتيح على صفحة الدفع)، M40 (Sharwa Pay للعميل).
- افتراض: «المحافظ المحلية» (`local_wallets`) = حسابات `PayoutAccount` بنوع `wallet`، و«التحويل البنكي» = نوع `bank` + مفتاح `enable_manual_payment`؛ تُعرضان كتبويبَين في شاشة واحدة.
- افتراض: وصف حقول كل بوابة (`credential_fields`) يُعرَّف في الخادم ويُرسل للواجهة؛ لا تُخترع أسماء حقول.
- افتراض: `merchant_balance` القديم على `StoreSetting` لا يُعرض؛ المصدر الوحيد هو `MerchantWallet`.
- افتراض: الحقل الرقمي لمبلغ السحب يُرسل كسلسلة عشرية بلا تنسيق.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا بطاقات أرصدة أربع متماثلة؛ الأرصدة قائمة صفوف كثيفة بعملة ورقم Mono كبير؛ لا شعارات بوابات ملونة كبيرة — اسم نصّي وحالة دلالية.
- II: الأرقام، أرقام الحسابات، المعرّفات بخط Mono `tabular-nums` محاذاة نهاية؛ رموز العملات بعد الرقم كما يرسلها الخادم؛ أعمدة الجدول من اليمين.
- IV: لقطات `docs/visual-checks/14-payments/` للبوابات (غير مربوطة/مربوطة مقنَّعة)، حسابات التحويل مع معاينة العميل، المحفظة، طلب سحب، الجوال، الداكن.
