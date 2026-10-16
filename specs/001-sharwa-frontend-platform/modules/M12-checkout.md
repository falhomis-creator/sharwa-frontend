# M12 — إتمام الطلب بلا احتكاك (Frictionless Checkout)

**Route group**: `(storefront)/[store]` · **Priority**: P1 · **Backend status**: HTML-only `[NEEDS BACKEND]` — `POST /checkout/` وكل مساعديه (الكوبون، حساب الشحن، COD-OTP، المحفظة، الولاء، الحجز) على الـ tenant URLConf بلا `/api/v1`؛ تُقترح عقود JSON أدناه
**Discovery refs**: `02-products-domain-model.md` §3 (Order, OrderItem, PaymentIntent, DeliveryMethod, PickupLocation), §4 (Checkout POST fields, OrderInvoice), §5 (Coupon, Loyalty, GiftSettings), §7 (CustomerReliabilityRecord) · `03-api-payments-shipping-theme-integrations.md` §1 (الفجوة الحرجة), §2 (الهاتف + OTP، الأخطاء), §3 (العملات، البوابات، المحافظ) · `01-tenants-dashboard-admin.md` §2.4 (`CentralCustomerTrust`), §3.2 (Cart/Checkout views) · **Benchmarks**: Shopify Shop Pay (صفحة واحدة، حقول قليلة، ملخص لاصق)، Lemon Squeezy (هدوء بصري، خطأ واحد في وقته)، Salla (أنماط عربية: الهاتف أولاً، الدفع عند الاستلام بـ OTP، خريطة الموقع)

## 1. الهدف (Purpose)

تحويل سلة إلى طلب في شاشة واحدة بأقل عدد حقول (الهاتف أولاً، لا حساب)، مع عرض كل مكونات الفاتورة كما يحسبها الخادم، ودعم طرق الدفع المحلية (تحويل بنكي بإيصال، شروة باي بـ OTP، بوابات، الدفع عند الاستلام بـ OTP واتساب) والمحفظة والولاء والهدايا والحجوزات بلا تفرّع في المسار. يُقاس بنسبة إكمال الـ checkout وبزمن الإكمال وبصفر طلبات مكررة.

## 2. الفاعلون (Actors)

- **المشتري**: يُدخل بياناته، يختار التوصيل أو الاستلام، يختار الدفع، يُحقق OTP عند الحاجة، ويؤكد.
- **النظام (Django)**: يحسب `OrderInvoice`، يتحقق من الكوبون والمحفظة والولاء، يقيّم مخاطر COD من `CentralCustomerTrust`، يُنشئ `Order` + `PaymentIntent`، ويُرسل واتساب.
- **التاجر**: يضبط طرق التوصيل ونقاط الاستلام (M15)، البوابات والتحويل البنكي وشروة باي (M14)، الولاء والهدايا (M13)؛ يرى الطلب في M06.
- **بوابة الدفع** (`jeeb` · `kuraimi`): تستلم التحويل وتعيد المشتري إلى صفحة النتيجة.

## 3. قصص المستخدم (User Stories)

### US-12.1 — بيانات الاتصال والعنوان (P1)
يبدأ المشتري برقم الهاتف (واتساب) والاسم، ثم العنوان نصياً مع تثبيت اختياري على الخريطة؛ البريد اختياري.
**Independent Test**: إدخال `0770841802` → يُعرض مُطبَّعاً «+967 77 084 1802» تحت الحقل كتأكيد؛ العنوان بلا خريطة يمرّ؛ مع خريطة تُرسل `latitude`/`longitude`.
**Acceptance**:
1. **Given** حقل الهاتف، **When** يُدخل رقم بأرقام هندية أو بمسافات، **Then** يُحوَّل محلياً إلى أرقام غربية ويُعرض التطبيع المتوقع؛ الخادم هو الحكم النهائي (`0770841802 → 967770841802`).
2. **Given** زيارة سابقة، **Then** تُعبَّأ `name`/`phone`/`address` من تخزين محلي مفتوح بالمستأجر مع زر «مسح».
3. **Given** زر «تحديد موقعي»، **When** يُسمح بالموقع، **Then** يُثبَّت دبّوس على خريطة مضمَّنة ويُملأ `latitude`/`longitude`؛ رفض الإذن لا يمنع الإكمال.

### US-12.2 — التوصيل أو الاستلام (P1)
**Acceptance**:
1. **Given** `delivery_methods[]` فعّالة، **Then** تُعرض كقائمة radio: الاسم، `display_price`، `estimated_time`، وشارة نصية «شروة شيب» لـ `is_sharwa_official`؛ الاختيار يحدّث سطر «التوصيل» في الفاتورة من الخادم.
2. **Given** `pickup_locations[]` فعّالة، **Then** يُعرض تبويب «استلام من الفرع» بالاسم والعنوان والهاتف، واختياره يجعل التوصيل 0 ويُخفي العنوان.
3. **Given** السلة كلها `is_free_shipping` أو تجاوزت `free_shipping_threshold`، **Then** يعرض الخادم التوصيل «مجاني» ويُظهر سطراً بلون `emerald-600` نصياً.
4. **Given** لا طرق توصيل ولا نقاط استلام، **Then** يُطبَّق `default_delivery_fee` من الخادم ويُعرض كسطر واحد بلا اختيار.

### US-12.3 — طرق الدفع المحلية (P1)
**Acceptance**:
1. **Given** `enable_manual_payment=true`، **When** يُختار «تحويل بنكي/محفظة»، **Then** تُعرض حسابات التاجر (`PayoutAccount`: `provider_name`, `account_number` بخط Mono مع زر نسخ, `account_name`)، وحقل `transfer_amount_reported` ورفع `receipt_image` (`jpg,jpeg,png,webp,pdf`)؛ الطلب يُنشأ بحالة `awaiting_payment`.
2. **Given** `enable_sharwa_pay=true`، **When** يُختار «شروة باي»، **Then** يُطلب OTP (`sharwa_pay_otp`) على هاتف المشتري بعد «إرسال الرمز»، ويُعرض الرصيد المتاح إن أعاده الخادم؛ رصيد غير كافٍ → رسالة الخادم تحت الخيار.
3. **Given** بوابة مفعَّلة (`jeeb` أو `kuraimi`)، **When** تُختار ويُؤكَّد، **Then** يُنشأ الطلب `pending_payment` ويُحوَّل المتصفح إلى `redirect_url`؛ العودة إلى `/checkout/result?order=<public_uuid>` تعرض الحالة الفعلية من الخادم.
4. **Given** كل منتجات السلة بـ `payment_policy='cod'` أو `deposit`، **Then** يظهر «الدفع عند الاستلام»؛ **When** يُختار، **Then** يُطلب OTP واتساب (`otp`) عبر «إرسال رمز التأكيد»، ويُعرض تنبيه هادئ إن أعاد الخادم `cod_disabled` أو `risk_percentage` عالياً («التوصيل بالدفع عند الاستلام غير متاح لهذا الرقم — اختر طريقة أخرى»).
5. **Given** منتج `payment_policy='full'` في السلة، **Then** يُخفى خيار COD وتُعرض ملاحظة «هذا الطلب يتطلب الدفع مقدماً».

### US-12.4 — المحفظة والولاء والكوبون (P2)
**Acceptance**:
1. **Given** مفتاح `use_wallet`، **When** يُفعَّل، **Then** يُطلب الهاتف (إن لم يُدخل) ويُعرض `display_balance` و`display_applicable` من معاينة الرصيد، ثم OTP (`wallet_otp`)؛ الفاتورة تعرض «من المحفظة» وتُعيد حساب «المتبقي للدفع».
2. **Given** `LoyaltyProgram.is_enabled` و`balance ≥ min_points_to_redeem`، **Then** يُعرض «استبدال N نقطة = <display_value>» مع OTP؛ النجاح يُضيف سطر خصم من الخادم.
3. **Given** كوبون مُطبَّق من M11، **Then** يظهر مُعبَّأً مع زر إزالة؛ إدخال كود جديد يستبدله وتُعرض أخطاء الخادم نصياً.

### US-12.5 — الهدية والحجز والشراء المباشر (P2)
**Acceptance**:
1. **Given** `GiftSettings.is_enabled`، **When** يُفعَّل `is_gift`، **Then** تظهر `recipient_name`, `recipient_phone`, `gift_message` (≤ 200 حرف بعدّاد Mono)؛ العنوان يصبح عنوان المستلم؛ معطَّل → `gift_unavailable` لا يُعرض الخيار أصلاً.
2. **Given** سطر بمنتج قابل للحجز، **Then** يُعرض `start_datetime` المختار في M10 بـ `Intl.DateTimeFormat('ar')` مع رابط «تغيير» إلى M10؛ يُرسل مع الطلب.
3. **Given** الوصول من «اشترِ الآن» (M10)، **Then** `checkout_mode` يشير إلى الشراء المباشر وتُرسل `size`/`color`/`variant_id` مع الطلب، وتُعرض السلة الفعلية جانباً بلا مزج.

### US-12.6 — الفاتورة والتأكيد والنجاح (P1)
**Acceptance**:
1. **Given** أي تغيير في التوصيل/الدفع/الكوبون/المحفظة، **Then** تُحدَّث الفاتورة من الخادم وتعرض بالترتيب: المجموع الفرعي · الخصم · العروض الترويجية (`applied_offers`) · الكوبون · التوصيل · المحفظة المستخدمة · **الإجمالي**؛ ولسياسة `deposit`: «المطلوب الآن» (`upfront_required`) و«عند الاستلام» (`amount_on_delivery`) كصفَّين بارزَين.
2. **Given** ضغط «تأكيد الطلب»، **Then** يُرسل مرة واحدة مع `client_uuid` ثابت للجلسة؛ النقر المكرر لا يُنشئ طلباً ثانياً ويُعطَّل الزر مع مؤشر.
3. **Given** نجاح، **Then** تُعرض `/checkout/success/[public_uuid]`: رقم الطلب Mono، الحالة بالعربية (`new` جديد · `awaiting_payment` بانتظار تأكيد الدفع · `pending_payment` قيد تنفيذ الدفع)، الإجمالي، التعليمات التالية (إرفاق إيصال/انتظار البوابة)، ورابط «تتبّع طلبك» إلى E-41 بـ `public_uuid`، وزر واتساب التاجر.
4. **Given** 400 `{field:[msg]}`، **Then** تُعرض كل رسالة تحت حقلها ويُمرَّر إلى أولها؛ `{detail}` يُعرض أعلى زر التأكيد.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-12.01**: الـ checkout MUST يكون صفحة واحدة `/checkout` بعمودَين على الديسكتوب (النموذج 7/12، الفاتورة 5/12 لاصقة) وعموداً واحداً بفاتورة قابلة للطيّ أعلى الصفحة على الجوال.
- **FR-12.02**: النموذج MUST يُبنى بـ React Hook Form + Zod بالحقول: `name`, `phone`, `email?`, `address`, `latitude?`, `longitude?`, `delivery_method_id | pickup_location_id`, `payment_method`, `coupon_code?`, `use_wallet`, `wallet_otp?`, `sharwa_pay_otp?`, `otp?`, `transfer_amount_reported?`, `receipt_image?`, `is_gift`, `recipient_name?`, `recipient_phone?`, `gift_message?`, `start_datetime?`, `checkout_mode`, `client_uuid`, `size?`, `color?`, `variant_id?`.
- **FR-12.03**: كل مبالغ الفاتورة MUST تُعرض من حقول `display_*` التي يعيدها الخادم؛ يُمنع أي جمع محلي؛ أثناء إعادة الحساب تُعتَّم القيم السابقة بلا تغيير.
- **FR-12.04**: `client_uuid` MUST يُولَّد مرة واحدة لكل سلة ويُرسل مع كل محاولة تأكيد (idempotency)؛ يُجدَّد بعد النجاح.
- **FR-12.05**: خيارات الدفع MUST تُعرض حسب أعلام المتجر (`enable_manual_payment`, `enable_sharwa_pay`, البوابات المفعَّلة) وسياسة دفع المنتجات؛ الخيار الممنوع يُعطَّل مع سبب نصي لا يُخفى إلا إذا كان غير مفعَّل أصلاً.
- **FR-12.06**: OTPs (`otp`, `wallet_otp`, `sharwa_pay_otp`, الولاء) MUST تستخدم مكوّناً واحداً: 6 خانات Mono، إعادة إرسال بعد 60 ثانية بعدّاد، ورسالة الخادم عند الخطأ؛ 429 → «حاول بعد قليل».
- **FR-12.07**: رفع `receipt_image` MUST يكون multipart مع معاينة وحذف، بحد 5MB وامتدادات `jpg,jpeg,png,webp,pdf`؛ يُسمح بإرفاقه لاحقاً من صفحة النجاح.
- **FR-12.08**: الصفحة MUST تلتقط الهاتف فور التحقق منه لصالح السلة المتروكة (M11 §7) مرة واحدة.
- **FR-12.09**: الخريطة MUST تُحمَّل lazy بعد التفاعل فقط (لا تؤثر على LCP)، ولا يُرسل أي إحداثي دون إذن المستخدم.
- **FR-12.10**: التحويل إلى البوابة MUST يحدث فقط بعد استجابة الخادم بـ `next_action.type='redirect_gateway'`؛ العودة تعرض الحالة من الخادم لا من الرابط.
- **FR-12.11**: الصفحة MUST تمنع الفهرسة (`noindex`) وتُعطِّل شريط الإعلان إلا إذا `show_banner_on_checkout=true`.
- **FR-12.12**: الـ UTM و`traffic_source` و`aff_id` MUST تصل الخادم عبر الكوكيز التي يمرّرها الـ BFF؛ الواجهة لا تُرسلها كحقول.
- **FR-12.13**: عند 409 (تغيّر السعر/المخزون أثناء الإكمال)، الصفحة MUST تُعيد تحميل السلة والفاتورة وتُبرز ما تغيّر قبل السماح بالتأكيد.

## 5. الكيانات والحالات (Key Entities & States)

- **CheckoutDraft** (محلي): الحقول أعلاه + حالة كل OTP (`idle` · `sent` · `verified` · `failed`).
- **DeliveryMethod**: `id`, `name`, `display_price`, `estimated_time`, `is_sharwa_official`. **PickupLocation**: `id`, `name`, `address`, `phone`.
- **PaymentMethod**: `manual` تحويل بنكي/محفظة محلية · `sharwa_pay` شروة باي · `jeeb` · `kuraimi` (بوابات) · `cod` الدفع عند الاستلام. **PayoutAccount**: `account_type` (`bank` · `wallet`), `provider_name`, `account_number`, `account_name`.
- **OrderInvoice** (من الخادم): `display_subtotal`, `display_discount`, `display_promotion_discount`, `applied_offers[]`, `coupon_code`, `display_delivery_fee`, `display_wallet_amount_used`, `display_total`, `display_deposit_amount`, `display_upfront_required`, `display_amount_on_delivery`, `currency`.
- **Order** (نتيجة): `id`, `public_uuid`, `status` (`pending_payment` · `new` · `awaiting_payment` · `payment_review` · …), `payment_status` (`unpaid` · `pending` · `partial` · `paid` · `failed` · `indeterminate`), `payment_method`, `display_total`. **PaymentIntent**: `method` (`wallet` · `gateway` · `cod` · `gift_card`), `status` (`pending` · `completed` · `failed` · `refunded`).
- **Wallet** (عميل، SAR): `display_balance`. **CustomerPoints**: `balance`; **LoyaltyProgram**: `is_enabled`, `min_points_to_redeem`, `points_per_riyal_redemption`. **CentralCustomerTrust**: `risk_percentage`; **CustomerReliabilityRecord**: `cod_disabled`.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/checkout` (صفحة واحدة) · `/checkout/success/[public_uuid]` · `/checkout/result?order=` (عودة البوابة) · لوحات داخلية: OTP (dialog/drawer)، الخريطة (sheet)، حسابات التحويل (accordion).
- **الحالات البصرية**: skeleton للفاتورة وخيارات التوصيل · سلة فارغة («لا يمكن إتمام طلب بسلة فارغة» + رابط) · إعادة حساب (تعتيم القيم) · خطأ حقل تحت الحقل · خطأ عام أعلى الزر · OTP مرسَل/خاطئ/منتهٍ · تأكيد قيد الإرسال (زر معطَّل بمؤشر) · نجاح · فشل بوابة («لم يُكتمل الدفع» + إعادة المحاولة بنفس الطلب).
- **الجوال (390px)**: الفاتورة شريط قابل للطيّ أعلى الصفحة يعرض «الإجمالي <display_total>» Mono دائماً؛ زر التأكيد لاصق أسفل الشاشة مع الإجمالي؛ الخريطة وOTP في drawer من Vaul.
- **اختصارات**: `Enter` في حقل OTP يُحقق؛ `Esc` يغلق الـ drawer؛ لا اختصارات حرفية.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| خيارات التوصيل والاستلام + رسوم افتراضية | `calculate_shipping` HTML، `DeliveryMethod`/`PickupLocation` | `[NEEDS BACKEND]` → `GET /api/v1/checkout/delivery-options/` → `{delivery_methods:[{id, name, display_price, estimated_time, is_sharwa_official}], pickup_locations:[{id, name, address, phone}], display_default_delivery_fee, free_shipping_applies}` |
| طرق الدفع المتاحة وحسابات التحويل | `enable_manual_payment`, `enable_sharwa_pay`, `PaymentCredential.is_enabled`, `PayoutAccount` | `[NEEDS BACKEND]` → `GET /api/v1/checkout/payment-options/` → `{methods:[{code, label, enabled, reason?}], payout_accounts:[{account_type, provider_name, account_number, account_name}]}` |
| معاينة الفاتورة قبل التأكيد | `build_order_invoice` داخل `POST /checkout/` فقط | `[NEEDS BACKEND]` → `POST /api/v1/checkout/quote/` `{delivery_method_id?, pickup_location_id?, payment_method, coupon_code?, use_wallet, phone?, redeem_points?}` → `OrderInvoice` بحقول `display_*` |
| إنشاء الطلب | `POST /checkout/` HTML (multipart) | `[NEEDS BACKEND]` → `POST /api/v1/checkout/` (multipart، كل حقول FR-12.02) → `{order_id, public_uuid, status, payment_status, display_total, next_action:{type: none\|redirect_gateway\|show_transfer_instructions, url?}}` / 400 `{field:[msg]}` / 409 |
| COD OTP | `POST /checkout/cod-otp/send/`, `/verify/` JSON `{ok, error}` | HTML-only `[NEEDS BACKEND]` → `POST /api/v1/checkout/cod-otp/send/` `{phone}`؛ `/verify/` `{phone, otp}` → `{ok, cod_allowed, reason?}` |
| معاينة رصيد المحفظة + OTP | `POST /wallet/balance-preview/`, `/wallet/otp/send/` | `[NEEDS BACKEND]` → `POST /api/v1/wallet/balance-preview/` `{phone}` → `{display_balance, display_applicable}`؛ `POST /api/v1/wallet/otp/send/` `{phone}` |
| شروة باي OTP | `sharwa_pay_checkout_otp_send` | `[NEEDS BACKEND]` → `POST /api/v1/checkout/sharwa-pay/otp/send/` `{phone}` → `{display_balance?}` |
| الولاء: الرصيد + OTP + الاستبدال | `/loyalty/otp/send/`, `/loyalty/redeem/` | `[NEEDS BACKEND]` → `GET /api/v1/loyalty/balance/?phone=` → `{balance, min_points_to_redeem, display_value}`؛ `POST /api/v1/loyalty/otp/send/`؛ `POST /api/v1/loyalty/redeem/` `{phone, otp, points}` |
| الكوبون | `apply_coupon`/`remove_coupon` | `[NEEDS BACKEND]` (M11 §7) `POST/DELETE /api/v1/cart/coupon/` |
| إعدادات الهدايا والولاء | `GiftSettings.is_enabled`, `LoyaltyProgram.is_enabled` | `[NEEDS BACKEND]` → ضمن `GET /api/v1/config/` `{gifting_enabled, loyalty_enabled}` |
| إرفاق إيصال لاحقاً | — | `[NEEDS BACKEND]` → `POST /api/v1/orders/<public_uuid>/receipt/` multipart `{receipt_image, transfer_amount_reported}` |
| صفحة النجاح / نتيجة البوابة | `order_success` HTML | `[NEEDS BACKEND]` → `GET /api/v1/orders/public/<public_uuid>/` → `{status, payment_status, display_total, payment_method, items:[{product_name, variant_label, quantity, display_price}], created_at}` (مشترك مع E-41) |
| الحجز | `start_datetime` في `POST /checkout/`؛ `book_appointment` | يُضمَّن في `POST /api/v1/checkout/` نفسه |

## 8. الحالات الحدّية (Edge Cases)

- السلة تغيّرت في تبويب آخر أثناء الإكمال: `refetchOnWindowFocus` يُحدّث الفاتورة ويُظهر «تحدّثت سلتك» قبل التأكيد.
- OTP صحيح ثم انتهاء الجلسة قبل التأكيد: الخادم يرفض → يُعاد طلب OTP بلا فقد بقية الحقول.
- المشتري يغلق الصفحة بعد التحويل إلى البوابة: الطلب `pending_payment`؛ العودة لاحقاً عبر رابط التتبع تعرض الحالة الفعلية.
- `use_wallet` يغطي الإجمالي كاملاً: يُخفى اختيار طريقة دفع أخرى ويُعرض «مدفوع بالكامل من المحفظة»؛ المحفظة SAR فقط — بعملة أخرى يُعطَّل الخيار بسبب نصي.
- سلة تمزج `deposit` و`cod`: الخادم يحسب `upfront_required` للعربون و`amount_on_delivery` للباقي؛ تُعرض الصفَّان دائماً حين يختلف أحدهما عن الصفر.
- `recipient_phone` = هاتف المشتري: يُقبل مع تنبيه هادئ «المستلم هو أنت».
- `delivery_method_id` أصبح غير فعّال بين الاختيار والتأكيد: 400 على الحقل → يُعاد جلب الخيارات ويُركَّز عليها.
- شبكة تنقطع بعد الإرسال وقبل الاستجابة: إعادة المحاولة بنفس `client_uuid` تعيد الطلب الموجود لا طلباً جديداً.
- متجر بلا أي طريقة دفع مفعَّلة: تُعرض «المتجر لا يستقبل طلبات حالياً — تواصل عبر واتساب» وزر واتساب، بلا زر تأكيد.

## 9. معايير النجاح (Success Criteria)

- **SC-12.1**: متوسط زمن الإكمال (من فتح `/checkout` إلى النجاح) ≤ 90 ثانية لعميل عائد و≤ 150 ثانية لعميل جديد بـ COD + OTP.
- **SC-12.2**: 0 طلبات مكررة في اختبار النقر المتكرر وانقطاع الشبكة (idempotency).
- **SC-12.3**: 100% من المبالغ المعروضة من `display_*`؛ 0 عمليات حسابية مالية في كود الوحدة.
- **SC-12.4**: نسبة إكمال الـ checkout ≥ 55% من الجلسات التي تفتحه (مقارنة بالقالب القديم).
- **SC-12.5**: 100% من أخطاء الخادم تُعرض تحت حقلها أو في موضع واحد واضح، بلا alert خام.
- **SC-12.6**: LCP ≤ 2.5s على الجوال مع الخريطة lazy؛ 0 تمرير أفقي.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M11 (السلة والكوبون)، M10 (الشراء المباشر، `start_datetime`)، M47 (BFF، كوكيز، UTM)، M14 (أعلام الدفع والبوابات)، M15 (طرق التوصيل ونقاط الاستلام)، M13 (الولاء، الهدايا)، E-41 (التتبع العام)، E-40 (شروة باي).
- افتراض: `checkout_mode` يميّز «من السلة» عن «شراء مباشر» (منتج واحد بـ `size`/`color`/`variant_id`)؛ القيم الدقيقة تُثبَّت مع عقد `POST /api/v1/checkout/`.
- افتراض: `receipt_image` حقل ملف في نموذج الـ checkout الأصلي (الإيصال يظهر للتاجر في M06 §US-06.4)؛ يُرسل multipart.
- افتراض: `action_type` في POST الأصلي داخلي للقالب القديم ولا يُحتاج في العقد الجديد.
- افتراض: الخادم يحدد أهلية COD (`cod_disabled`/`risk_percentage`) ويعيد سبباً مقروءاً؛ الواجهة لا تحسب مخاطر.
- افتراض: رسوم التوصيل المخزَّنة بـ `YER_NEW` يحوّلها الخادم إلى عملة الطلب ويعيدها `display_price`؛ الواجهة لا تحوّل.
- افتراض: بيانات الاتصال المحفوظة محلياً تُخزَّن بمفتاح مفتوح بالمستأجر وتُحذف بزر «مسح»؛ لا يُخزَّن OTP أو إيصال محلياً.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I (Anti-AI): لا خطوات بأرقام في دوائر ملونة، لا شارات «آمن 100%» بأيقونات؛ الثقة تُبنى بوضوح الفاتورة وسطر «يتم التواصل عبر واتساب»؛ طرق الدفع بطاقات radio بحد 1px بلا شعارات ملونة كبيرة؛ زر تأكيد واحد مصمت.
- II (RTL): الهاتف ورقم الحساب و`display_*` بخط Mono `tabular-nums` بالأرقام الغربية؛ حقل OTP يُعرض LTR داخلياً (`dir="ltr"`) مع محاذاة بداية؛ الفاتورة تسميات في البداية وقيم في النهاية؛ أسهم «رجوع» تنعكس.
- IV (Visual check): لقطات `docs/visual-checks/12-checkout/{desktop,tablet,mobile,mobile-dark}.png` لصفحة كاملة بـ COD + OTP، تحويل بنكي بإيصال، سلة بعربون (صفّا المطلوب الآن/عند الاستلام)، هدية مفعَّلة، أخطاء حقول، وصفحة النجاح.
- V: كل الحقول من `cart_checkout.py` وموديلات `Order`؛ كل endpoint مقترح مُعلَّم `[NEEDS BACKEND]` مع Mock محلي بنفس العقد.
- IX: React Hook Form + Zod؛ TanStack Query للخيارات والفاتورة؛ لا حالة مالية في Zustand؛ الخريطة dynamic import.
