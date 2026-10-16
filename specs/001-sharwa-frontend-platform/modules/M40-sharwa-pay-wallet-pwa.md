# M40 — محفظة شروة باي للعملاء PWA (Sharwa Pay Customer Wallet PWA)

**Route group**: `(pay)` على أصل المنصة (public schema) `/sharwa-pay/*` · **Priority**: P3 · **Backend status**: HTML-only `[NEEDS BACKEND]` (`tenants/sharwa_pay_views.py`: `/sharwa-pay/`, `/sharwa-pay/otp/send/`, `/sharwa-pay/topup/`, `/sharwa-pay/withdraw/`, `/sharwa-pay/logout/`, `manifest.json`, `sw.js`)
**Discovery refs**: `03-api-payments-shipping-theme-integrations.md` §3 (SharwaPay models, currencies, SW caches nothing) · `01-tenants-dashboard-admin.md` §3.1 (المسارات العامة)، §8 (موافقات الإدمن) · `02-products-domain-model.md` §1 (`CURRENCY_CHOICES`) · **Benchmarks**: Wise (أرصدة متعددة العملات كقائمة لا بطاقات، حركات بوضوح الاتجاه)، STC Pay (دخول بالهاتف وOTP، شحن بإيصال — منظَّف من الزخرفة)، Revolut (حركات بتجميع يومي)

## 1. الهدف (Purpose)

إتاحة محفظة مسبقة الدفع واحدة للعميل عبر كل متاجر «شروه»: يدخل برقم هاتفه وOTP واتساب، يرى أرصدته الأربعة بلا تحويل، يطلب شحناً بإيصال بنكي، ويطلب سحباً يُخصم فوراً ويُعكس عند الرفض — كتطبيق قابل للتثبيت لا يخزّن أي بيانات مالية في الكاش. يُقاس بنسبة إتمام OTP ونسبة طلبات الشحن المقبولة من أول مرة.

## 2. الفاعلون (Actors)

- **العميل**: بلا حساب؛ هويته رقم الهاتف (`0770841802 → 967770841802`). يملك محفظة واحدة (`customer_phone` فريد).
- **مراجع شروة باي (Super Admin)**: يقبل/يرفض الشحن والسحب من Django admin (M20)؛ خارج هذه الواجهة.
- **النظام**: يُنشئ حركات `credit`/`debit` حصراً عبر `SharwaPayWalletManager`؛ webhook كُريمي يولّد `topup_auto`.
- **المتاجر**: تخصم `purchase` وتعيد `purchase_refund` من M12/M24؛ المنصة تخصم `platform_fee` من محافظ التجار (M45).

## 3. قصص المستخدم (User Stories)

### US-40.1 — الدخول بالهاتف وOTP (P1)
يكتب العميل رقمه، يستلم رمزاً عبر واتساب، يدخله خلال 10 دقائق، فيُفتح لوحة محفظته.
**Independent Test**: إرسال OTP، الانتظار 11 دقيقة، إدخال الرمز → رسالة انتهاء الصلاحية مع زر «إرسال رمز جديد».
**Acceptance**:
1. **Given** رقم بصيغة محلية، **When** يُرسل، **Then** يُطبَّع في الخادم ويُعرض للعميل بالصيغة الدولية التي سيستلم عليها.
2. **Given** تجاوز حد الإرسال لنفس الهاتف، **Then** يُعرض «طلبات كثيرة — حاول لاحقاً» مع عدّاد تنازلي بلا كشف الحد.
3. **Given** محاولات تحقق خاطئة متكررة، **Then** يُقفل التحقق مؤقتاً برسالة الخادم ويبقى حقل الرمز معطّلاً حتى انتهاء المهلة.

### US-40.2 — الأرصدة والحركات (P1)
يرى العميل أرصدته الأربعة (`SAR` · `USD` · `YER_OLD` · `YER_NEW`) كقائمة عمودية بخط Mono، ثم حركاته (credit/debit) بالسبب والمتجر المصدر ورقم الطلب والرصيد بعد الحركة.
**Acceptance**:
1. **Given** رصيد صفري في عملتَين، **Then** تُعرض العملات الأربع دائماً (الصفر صفر)؛ لا إخفاء ولا «إجمالي محوَّل».
2. **Given** حركة `purchase` من متجر، **Then** يُعرض اسم/نطاق المتجر من `source_tenant_schema` ورقم الطلب `source_order_id`.
3. **Given** حركة `withdrawal_reversal`, **Then** تُعرض بوصف «استرجاع مبلغ سحب مرفوض» مرتبطة بطلب السحب.

### US-40.3 — طلب شحن بإيصال (P1)
يدخل العميل المبلغ والعملة ورقم عملية البنك ويرفع صورة الإيصال؛ يرى طلبه `pending` حتى يُراجع.
**Acceptance**:
1. **Given** `bank_transaction_id` مستخدم سابقاً، **Then** يُعرض خطأ الخادم تحت الحقل («رقم العملية مستخدم») ولا يُنشأ طلب.
2. **Given** طلب `approved` بلا `credited_at`, **Then** تُعرض شارة «مقبول — بانتظار الإيداع».
3. **Given** طلب `rejected`, **Then** يُعرض `rejection_reason` نصّاً.

### US-40.4 — طلب سحب (P2)
يدخل العميل المبلغ والعملة وبيانات الحساب المستقبِل؛ يُخصم المبلغ فوراً ويظهر الطلب `pending`.
**Acceptance**:
1. **Given** مبلغ أكبر من رصيد العملة، **Then** يُمنع محلياً («الرصيد غير كافٍ») ويُعاد التحقق في الخادم.
2. **Given** رفض الطلب، **Then** تظهر حركة `withdrawal_reversal` ويعود الرصيد؛ الواجهة تعرض الرابط بين الطلب والحركتَين.
3. **Given** طلب `approved`, **Then** يُعرض بالتسمية «مُنفَّذ».

### US-40.5 — التثبيت كتطبيق (P2)
يرى العميل زر «أضف إلى الشاشة الرئيسية» (أو إرشاد iOS) ويُثبَّت التطبيق بأيقونته واسمه «محفظتي».
**Acceptance**:
1. **Given** تثبيت ناجح، **When** يُفتح بلا شبكة، **Then** تُعرض صفحة «لا اتصال — لا نعرض رصيداً قديماً» ولا أي رصيد مخبّأ.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-40.01**: الواجهة MUST تعمل على أصل المنصة (`<base>/sharwa-pay/*`) لا على نطاق متجر؛ لا معرّف مستأجر.
- **FR-40.02**: OTP: TTL 600 ثانية (`SHARWA_PAY_OTP_TTL_SECONDS`)؛ حدّ إرسال لكل هاتف وحدّ محاولات تحقق من الخادم؛ الواجهة تعرض عدّاد صلاحية الرمز وتُعطّل الإرسال أثناء الحدّ.
- **FR-40.03**: الأرصدة MUST تُعرض كما يرسلها الخادم (`display_balance_*`) للعملات الأربع دائماً؛ يُمنع التحويل أو الجمع.
- **FR-40.04**: الحركات MUST تعرض: الاتجاه (`credit` إيداع · `debit` خصم)، السبب من 7 قيم بتسميات عربية، المبلغ، `balance_after`, المتجر المصدر، رقم الطلب، الوقت.
- **FR-40.05**: نموذج الشحن MUST يرسل `{amount ≥ 0.01, currency, bank_transaction_id, reference_note?, receipt_image}` (امتدادات `jpg,jpeg,png,webp,gif`)؛ نموذج السحب `{amount ≥ 0.01, currency, payout_destination}`.
- **FR-40.06**: Service Worker MUST لا يخزّن أي استجابة (تمرير `fetch` للطلبات GET فقط)، يُقدَّم من الجذر `/sw.js` بترويسة `Service-Worker-Allowed: /` و`Cache-Control: no-cache`; وجوده شرط التثبيت فقط.
- **FR-40.07**: Manifest MUST يحوي: `name` «محفظة شروة»، `short_name` «محفظتي»، `start_url` `/sharwa-pay/`, `scope` `/`, `display` `standalone`, `orientation` `portrait`, `lang` `ar`, `dir` `rtl`, أيقونات 192/512 + maskable؛ `theme_color`/`background_color` من رموز التصميم (zinc) لا من ألوان المتاجر.
- **FR-40.08**: تسجيل الخروج MUST يمسح الجلسة ويعيد إلى شاشة الهاتف؛ لا توكنات في التخزين المحلي.
- **FR-40.09**: كل الصفحات MUST تضع `Cache-Control: no-store` وتمنع الفهرسة (`noindex`).

## 5. الكيانات والحالات (Key Entities & States)

- **SharwaPayWallet**: `customer_phone` (فريد)، `customer_name`, `balance_sar`, `balance_usd`, `balance_yer_old`, `balance_yer_new` (Decimal 12,2)، `is_active`.
- **SharwaPayWalletTransaction** (append-only): `transaction_type`: `credit` إيداع · `debit` خصم؛ `reason`: `topup_manual` شحن بمراجعة · `topup_auto` شحن تلقائي (بنك) · `purchase` شراء · `purchase_refund` استرجاع شراء · `withdrawal` سحب · `withdrawal_reversal` عكس سحب مرفوض · `platform_fee` رسوم المنصة؛ `amount`, `currency`, `balance_after`, `source_tenant_schema`, `source_order_id`, `created_at`.
- **SharwaPayTopupRequest**: `amount`, `currency`, `bank_transaction_id` (فريد)، `reference_note`, `receipt_image`, `status`: `pending` قيد المراجعة · `approved` مقبول · `rejected` مرفوض؛ `rejection_reason`, `reviewed_at`, `credited_at`.
- **SharwaPayWithdrawalRequest**: `amount`, `currency`, `payout_destination`, `status`: `pending` قيد المراجعة · `approved` مُنفَّذ · `rejected` مرفوض؛ `rejection_reason`, `reviewed_at`. قاعدة: الخصم فوري عند الطلب؛ العكس عند الرفض.
- **OTP session**: `phone`, `created_at` (TTL 600s)، حدود الإرسال والتحقق في الكاش الخادمي.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/sharwa-pay` (الهاتف → OTP → اللوحة بنفس المسار حسب الجلسة) · `/sharwa-pay/transactions?currency=&reason=` · `/sharwa-pay/topup` · `/sharwa-pay/withdraw` · `/sharwa-pay/requests` (طلبات الشحن والسحب بحالاتها) · `/sharwa-pay/offline`.
- **الحالات البصرية**: skeleton للأرصدة (4 صفوف) · فراغ «لا حركات بعد» · خطأ شبكة · OTP منتهٍ/محدود · محفظة `is_active=false` «المحفظة موقوفة — تواصل مع الدعم» · غير متصل (بلا أرصدة).
- **الجوال أولاً (390px)**: عمود واحد؛ الأرصدة قائمة؛ زرا «شحن» و«سحب» ثابتان أسفل الشاشة 48px؛ الديسكتوب بعرض أقصى 480px وسط الصفحة.
- **اختصارات**: لا؛ إدخال OTP بحقول رقمية تلقائية الانتقال مع `autocomplete="one-time-code"`.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| إرسال OTP | `POST /sharwa-pay/otp/send/` (HTML form) | `[NEEDS BACKEND]` → `POST /api/v1/sharwa-pay/otp/send/` `{phone}` → `{ok, expires_in:600}`؛ 429 `{detail}` |
| تحقق OTP + جلسة | `POST /sharwa-pay/` | `[NEEDS BACKEND]` → `POST /api/v1/sharwa-pay/otp/verify/` `{phone, code}` → `{ok}` (كوكي جلسة)؛ 400 منتهٍ/خاطئ؛ 429 محدود |
| المحفظة | `sharwa_pay_wallet_page_view` HTML (`_dashboard_context`) | `[NEEDS BACKEND]` → `GET /api/v1/sharwa-pay/wallet/` → `{customer_phone, customer_name, is_active, balances:[{currency, display_balance}]}` |
| الحركات | ضمن الصفحة | `[NEEDS BACKEND]` → `GET /api/v1/sharwa-pay/transactions/?currency&reason&page` → `{count, results:[{id, transaction_type, reason, display_amount, currency, display_balance_after, source_tenant_schema, source_store_name, source_order_id, created_at}]}` |
| طلب شحن | `POST /sharwa-pay/topup/` (multipart) | `[NEEDS BACKEND]` → `POST /api/v1/sharwa-pay/topups/` multipart `{amount, currency, bank_transaction_id, reference_note?, receipt_image}` → 201 `{id, status}`؛ 400 `{field:[msg]}` |
| طلب سحب | `POST /sharwa-pay/withdraw/` | `[NEEDS BACKEND]` → `POST /api/v1/sharwa-pay/withdrawals/` `{amount, currency, payout_destination}` → 201 `{id, status, display_balance_after}`؛ 400 رصيد غير كافٍ |
| طلباتي | ضمن الصفحة | `[NEEDS BACKEND]` → `GET /api/v1/sharwa-pay/requests/` → `{topups:[{id, display_amount, currency, bank_transaction_id, status, rejection_reason, credited_at, created_at}], withdrawals:[{id, display_amount, currency, payout_destination, status, rejection_reason, created_at}]}` |
| خروج | `POST /sharwa-pay/logout/` | `[NEEDS BACKEND]` → `POST /api/v1/sharwa-pay/logout/` → 204 |
| Manifest / SW | `sharwa_pay_manifest`, `sharwa_pay_service_worker` | تُولَّد في Next (`app/(pay)/manifest.webmanifest`, `/sw.js` بسياسة «لا كاش») — انظر قرار ملكية `/sw.js` في M44 |

## 8. الحالات الحدّية (Edge Cases)

- هاتف بلا محفظة بعد: الدخول ينجح وتُعرض أرصدة صفرية مع دعوة «اشحن محفظتك».
- محفظة `is_active=false`: قراءة فقط؛ أزرار الشحن والسحب معطّلة بتلميح.
- صورة إيصال > الحد: يُعرض الخطأ قبل الرفع مع الحد المسموح.
- طلب سحب ثم تحديث الصفحة قبل الاستجابة: الرصيد المحدَّث من الخادم هو المرجع؛ لا تخمين محلي.
- `source_tenant_schema` لمتجر مُعطَّل: يُعرض اسم المخطط كما هو مع «متجر غير متاح».
- فتح الرابط من داخل متجر: يُحوَّل إلى أصل المنصة؛ لا تضمين داخل نطاق المتجر.

## 9. معايير النجاح (Success Criteria)

- **SC-40.1**: من إدخال الهاتف إلى رؤية الأرصدة ≤ 45 ثانية (شامل استلام OTP).
- **SC-40.2**: 0 بايت من الاستجابات المالية في Cache Storage (فحص DevTools بعد التنقل).
- **SC-40.3**: 0 حالات تحويل أو جمع عملات في الواجهة.
- **SC-40.4**: Lighthouse PWA installable = pass؛ Accessibility ≥ 95.
- **SC-40.5**: 100% من حالات الطلبات (6) تُعرض بتسميتها العربية الصحيحة (`approved` للسحب = «مُنفَّذ»).

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M12 (الدفع بشروة باي في المتاجر — مصدر `purchase`)، M24 (`purchase_refund`)، M45 (`platform_fee` لمحافظ التجار)، M20 (موافقات الإدمن)، M44 (قرار `/sw.js`).
- افتراض: تجار المنصة يملكون محافظ شروة باي بنفس رقم `merchant_phone`؛ يرون حركات `platform_fee` هنا.
- افتراض: الكوكي الجلسي على أصل المنصة يختلف عن جلسات المتاجر؛ `credentials: 'include'` على نفس الأصل.
- افتراض: `theme_color` يُستبدل من `#4f46e5` القديم إلى رمز `--background` بحسب المبدأ I/VII.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا «بطاقة بنكية» بتدرج لوني؛ الأرصدة قائمة نصّية بأرقام Mono كبيرة؛ لا أيقونات في دوائر لأنواع الحركات — إشارة `+`/`−` ونص. لا بنفسجي.
- II: المبالغ `tabular-nums` والعملة بعد الرقم بفاصل غير قابل للكسر؛ أرقام الهواتف وأرقام العمليات داخل `<bdi>` LTR؛ حقول OTP تتقدم من اليمين إلى اليسار بصرياً بترتيب منطقي صحيح.
- IV: لقطات `docs/visual-checks/40-sharwa-pay/{mobile,mobile-dark,tablet,desktop}.png` تشمل شاشة OTP، الأرصدة، نموذج الشحن، وحالة غير متصل.
- IX: Zod على كل استجابة؛ لا Zustand persist لأي بيانات مالية؛ TanStack Query بـ `gcTime: 0` للأرصدة.
