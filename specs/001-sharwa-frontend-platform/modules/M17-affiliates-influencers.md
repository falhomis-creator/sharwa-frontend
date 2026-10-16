# M17 — التسويق بالعمولة والمؤثرون (Affiliates & Influencers)

**Route group**: `(dashboard)` · **Priority**: P3 · **Backend status**: HTML-only `[NEEDS BACKEND]` (`affiliates_list`, `influencers`, `AffiliateForm`, `InfluencerForm`)
**Discovery refs**: `02-products-domain-model.md` §5 (Influencer, Affiliate, AffiliateClick, AffiliateSale, InfluencerSale, Coupon.influencer), §12 (تقرير `affiliates`) · `01-tenants-dashboard-admin.md` §4 (التسويق: المؤثرين، التسويق بالعمولة), §7 (ميزتا `affiliates`, `influencers`) · **Benchmarks**: Lemon Squeezy Affiliates (جدول أداء واحد نظيف، نسخ الرابط بنقرة)، Shopify Collabs (ملف المؤثر + كوبونه + مستحقاته)، Stripe (دقة أعمدة المبالغ)

## 1. الهدف (Purpose)

تمكين التاجر من تجنيد مسوّقين بالعمولة (رابط `?aff_id=`) ومؤثرين (كوبون)، ومعرفة من جلب أي طلب، وكم يستحق كلٌّ منهم، وتسوية المستحقات بنقرة. يُقاس بعدد الطلبات المنسوبة وبزمن تسوية المستحقات.

## 2. الفاعلون (Actors)

- **مالك المتجر / موظف بصلاحية التسويق**: يُنشئ المسوّقين والمؤثرين، يراقب الأداء، يُعلّم المستحقات مدفوعة.
- **المسوّق بالعمولة (Affiliate)**: يتلقى رابطه ورمزه `aff_xxxxxxxx` عبر واتساب؛ لا يدخل اللوحة.
- **المؤثر (Influencer)**: يُروّج كوبوناً مرتبطاً به؛ لا يدخل اللوحة.
- **النظام**: يسجّل `AffiliateClick` عند الزيارة و`AffiliateSale`/`InfluencerSale` عند إتمام الطلب.

## 3. قصص المستخدم (User Stories)

### US-17.1 — إضافة مسوّق ونسخ رابطه (P1)
يُنشئ التاجر مسوّقاً (اسم، هاتف، نوع وقيمة العمولة) فيحصل على رمز `aff_xxxxxxxx` ورابط متجر جاهز للنسخ والإرسال.
**Independent Test**: بعد الحفظ يظهر الرابط `https://<store>/?aff_id=aff_xxxxxxxx` وزر «نسخ» ينسخه فعلياً ويعرض تنبيه Sonner.
**Acceptance**:
1. **Given** نموذج مسوّق صالح، **When** يُحفظ، **Then** يظهر في الجدول بالرمز Mono والرابط وزر نسخ وزر «إرسال عبر واتساب» (رابط `wa.me` بالهاتف).
2. **Given** هاتف مكرر، **When** يُحفظ، **Then** يُعرض خطأ الخادم تحت الحقل.

### US-17.2 — إضافة مؤثر وربط كوبونه (P1)
يُنشئ التاجر مؤثراً (اسم، وسيلة تواصل، عمولة) ويحصل على رمز `inf_xxxxxxxx`، ثم يربط كوبوناً به من M13 (`Coupon.influencer`).
**Acceptance**:
1. **Given** مؤثر محفوظ، **When** تُفتح تفاصيله، **Then** تُعرض كوبوناته المرتبطة (الكود، `used_count`/`max_uses`، الحالة) ورابط «إنشاء كوبون لهذا المؤثر» يفتح M13 بالمؤثر مُعبَّأ.
2. **Given** مؤثر بلا كوبون، **Then** يظهر تنبيه هادئ «لا كوبون مرتبط — لن تُنسب له مبيعات».

### US-17.3 — جدول الأداء والمستحقات (P1)
يرى التاجر لكل مسوّق/مؤثر: النقرات (للمسوّقين)، الطلبات المنسوبة، إجمالي المبيعات، العمولة المستحقة (`pending`) والمدفوعة (`paid`)، وآخر عملية.
**Independent Test**: فرز الجدول بعمود «المستحق» تنازلياً وفلترة «لديه مستحقات فقط» تُحفظان في الرابط.
**Acceptance**:
1. **Given** 30 مسوّقاً، **When** تُفتح القائمة، **Then** تظهر الأعمدة بالمبالغ `display_*` من الخادم Mono محاذاة نهاية، والنقرات/الطلبات أعداداً Mono.
2. **Given** صف مسوّق، **When** يُوسَّع، **Then** تُعرض مبيعاته (`AffiliateSale`: رقم الطلب، التاريخ، إجمالي الطلب، العمولة، حالة الصرف) مع رابط للطلب في M06.

### US-17.4 — تسوية المستحقات (P2)
يُعلّم التاجر مبيعات `pending` كمدفوعة فردياً أو جماعياً لمسوّق/مؤثر واحد، مع معاينة المجموع قبل التأكيد.
**Acceptance**:
1. **Given** 5 مبيعات `pending` محددة لمسوّق، **When** يُضغط «تعليم كمدفوعة»، **Then** تُعرض معاينة «5 عمليات — المجموع X» من الخادم ثم تُحدَّث الحالة إلى `paid` بتاريخ.
2. **Given** مبيعة `paid`, **Then** لا يتاح التراجع من الواجهة (قرار نهائي؛ يُوضَّح بالتلميح).

### US-17.5 — تعطيل مسوّق أو مؤثر (P2)
يُوقف التاجر مسوّقاً فتبقى بياناته ومستحقاته ويتوقف احتساب جديد.
**Acceptance**:
1. **Given** مسوّق نشط، **When** يُعطَّل، **Then** يظهر بشارة «موقوف» ويبقى رابطه يفتح المتجر بلا نسب جديد (سلوك الخادم).

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-17.01**: الوحدة MUST تظهر في الشريط فقط حين تكون ميزة `affiliates` و/أو `influencers` مفعّلة؛ كل تبويب مرتبط بميزته.
- **FR-17.02**: القائمة MUST تكون جدولاً واحداً بتبويبَين (المسوّقون · المؤثرون) بنفس المكوّن، مع بحث بالاسم/الهاتف/الرمز وفرز بالأعمدة وحالة في الرابط.
- **FR-17.03**: رمز الإحالة MUST يُعرض Mono مع زر نسخ؛ للمسوّقين يُعرض الرابط الكامل مبنياً من نطاق المتجر الفعلي (من `/api/v1/config/`) + `?aff_id=`.
- **FR-17.04**: نوع العمولة MUST يُعرض كنص «نسبة %» أو «مبلغ ثابت» مع القيمة؛ النسبة بخط Mono والمبلغ `display_*` من الخادم.
- **FR-17.05**: كل مبالغ المبيعات والعمولات MUST تأتي منسّقة من الخادم؛ يُمنع الجمع المحلي حتى في المعاينات الجماعية.
- **FR-17.06**: تعليم المدفوع MUST يكون إجراءً جماعياً بمعاينة عدد/مجموع ثم تقرير نتائج.
- **FR-17.07**: نماذج الإنشاء/التعديل MUST تعمل كـ sheet جانبي من القائمة (React Hook Form + Zod) بالحقول الفعلية فقط: المسوّق (`name`, `phone`, نوع/قيمة العمولة)، المؤثر (`name`, `contact`, `commission_type`, `commission_value`).
- **FR-17.08**: الوحدة MUST تربط كل مبيعة برقم طلبها القابل للنقر نحو M06 وكل كوبون نحو M13.
- **FR-17.09**: لقطة أداء أعلى القائمة MUST تكون شريطاً نصياً (إجمالي المستحق · المدفوع هذا الشهر · طلبات منسوبة 30 يوماً) لا بطاقات.

## 5. الكيانات والحالات (Key Entities & States)

- **Affiliate**: `name`, `phone`, `referral_code` (`aff_xxxxxxxx`), العمولة؛ **AffiliateClick** (زيارة عبر `?aff_id=`)؛ **AffiliateSale** واحدة لكل طلب (OneToOne) بحالة صرف `pending` مستحقة · `paid` مدفوعة.
- **Influencer**: `name`, `contact`, `referral_code` (`inf_xxxxxxxx`), `commission_type` `percent` نسبة · `fixed` مبلغ ثابت, `commission_value`؛ **InfluencerSale** بـ `PAYOUT_STATUS` `pending` مستحقة · `paid` مدفوعة.
- **Coupon.influencer**: الرابط بين الكوبون والمؤثر (يُدار في M13).
- الانتقال: `pending → paid` فقط، لا عكس.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/marketing/affiliates` (تبويب المسوّقين) · `/dashboard/marketing/affiliates?tab=influencers` · sheet إنشاء/تعديل · `/dashboard/marketing/affiliates/[id]` (تفاصيل: الرمز/الرابط، الكوبونات، جدول المبيعات، إجراء التسوية).
- **الحالات البصرية**: skeleton صفوف · فراغ «لا مسوّقين بعد — أضف أول مسوّق وشارك رابطه» · خطأ · بلا صلاحية · الميزة معطّلة («فعّل التسويق بالعمولة من باقتك»).
- **الجوال**: الجدول → بطاقات (اسم، رمز Mono، مستحق، زر نسخ)؛ النماذج ورقة سفلية.
- **اختصارات**: `⌘K` → «مسوّق: <اسم>»؛ `N` مسوّق جديد.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| قائمة المسوّقين + أداء | `affiliates_list` HTML | `[NEEDS BACKEND]` → `GET /api/v1/affiliates/?q&sort&has_pending` → `[{id, name, phone, referral_code, is_active, commission_type, commission_value, clicks_count, sales_count, display_sales_total, display_pending, display_paid, last_sale_at}]` |
| إنشاء/تعديل/تعطيل مسوّق | `affiliates_list` POST (`AffiliateForm`) | `[NEEDS BACKEND]` → `POST /api/v1/affiliates/`, `PATCH /api/v1/affiliates/<id>/` `{…, is_active}` |
| مبيعات مسوّق | — | `[NEEDS BACKEND]` → `GET /api/v1/affiliates/<id>/sales/?payout_status` → `[{id, order_id, order_number, display_order_total, display_commission, payout_status, created_at}]` |
| تعليم مبيعات مسوّق مدفوعة | — | `[NEEDS BACKEND]` → `POST /api/v1/affiliates/<id>/sales/mark-paid/` `{sale_ids:[]}` → `{updated, display_total}` |
| قائمة المؤثرين + أداء | `influencers` HTML | `[NEEDS BACKEND]` → `GET /api/v1/influencers/` → `[{id, name, contact, referral_code, is_active, commission_type, commission_value, coupons:[{code, used_count, max_uses, is_active}], sales_count, display_pending, display_paid}]` |
| إنشاء/تعديل مؤثر | `influencers` POST (`InfluencerForm`) | `[NEEDS BACKEND]` → `POST /api/v1/influencers/`, `PATCH /api/v1/influencers/<id>/` |
| مبيعات مؤثر + تعليم مدفوعة | — | `[NEEDS BACKEND]` → `GET /api/v1/influencers/<id>/sales/`, `POST /api/v1/influencers/<id>/sales/mark-paid/` |
| نطاق المتجر لبناء الرابط | `GET /api/v1/config/` | Ready (يُستخدم الـ host الحالي) |
| تقرير المسوّقين | `report_detail/affiliates` HTML | يُعرض من M25 (رابط فقط) |

## 8. الحالات الحدّية (Edge Cases)

- طلب أُلغي أو استُرجع بعد تسجيل `AffiliateSale`: تُعرض حالة الطلب بجانب العمولة بشارة «ملغي/مسترد» (قرار الخصم على الخادم).
- نقرات بلا مبيعات: يُعرض معدّل التحويل «0 من N» بلا رسم.
- مؤثر مرتبط بأكثر من كوبون: تُجمع المبيعات على مستوى المؤثر مع تفصيل بالكوبون.
- رمز إحالة يُلصق في المتجر عبر نطاق مخصص: الرابط المعروض يستخدم النطاق الفعلي للمتجر لا النطاق الفرعي الافتراضي.
- الميزة مفعّلة للمسوّقين ومعطّلة للمؤثرين: يُعرض تبويب واحد فقط.

## 9. معايير النجاح (Success Criteria)

- **SC-17.1**: إضافة مسوّق ونسخ رابطه ≤ 30 ثانية و≤ 4 نقرات.
- **SC-17.2**: 100% من المبالغ في الجدول مطابقة نصياً لقيم الخادم (لا تنسيق محلي).
- **SC-17.3**: تسوية 20 مبيعة جماعياً بنقرتَين مع معاينة المجموع.
- **SC-17.4**: رابط فلتر/فرز مشترك يُنتج نفس النتيجة على جهاز آخر 100%.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M03 (الشريط)، M13 (الكوبونات وربط المؤثر)، M06 (رابط الطلب)، M25 (تقرير `affiliates`)، M18 (الصلاحيات).
- افتراض: حقل تعطيل (`is_active`) وتاريخ الصرف يوفّرهما الخادم ضمن العقد المقترح؛ إن غاب `is_active` يُخفى زر التعطيل.
- افتراض: نسب الطلب للمسوّق يتم على الخادم عند الإتمام (كوكي `aff_id`)؛ المتجر الجديد (M09) يُمرّر `?aff_id=` إلى الخادم بلا معالجة محلية.
- افتراض: العمولة للمسوّق بنفس نموذج `percent|fixed` للمؤثر.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا بطاقات KPI أربع متماثلة؛ شريط أرقام نصّي Mono. لا أيقونات اجتماعية ملونة أمام أسماء المؤثرين؛ نص وسيلة التواصل فقط. حالات الصرف نص + نقطة دلالية.
- II: الرموز `aff_/inf_` والمبالغ والنقرات Mono محاذاة نهاية؛ الرابط المنسوخ LTR داخل حقل `dir="ltr"` معزول؛ أيقونة «نسخ» بلا اتجاه.
- IV: لقطات `docs/visual-checks/17-affiliates/{desktop,tablet,mobile,desktop-dark}.png` للقائمة (فارغة/ممتلئة) والتفاصيل مع معاينة التسوية.
