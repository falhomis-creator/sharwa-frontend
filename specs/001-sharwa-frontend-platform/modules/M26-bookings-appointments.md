# M26 — الحجوزات والمواعيد (Bookings & Appointments)

**Route group**: `(dashboard)` + `(storefront)/[store]` · **Priority**: P3 · **Backend status**: HTML-only `[NEEDS BACKEND]` للتاجر (`bookings_calendar`, `booking_services_list`, `manage_service_availability`)؛ المواعيد المتاحة للمشتري JSON موجود (`available_slots_api`)؛ الحجز `book_appointment` HTML POST
**Discovery refs**: `02-products-domain-model.md` §13 (ServiceAvailability weekday 0=Monday، BookingSlot), §2 (`is_bookable`, `booking_duration_minutes`, `PRODUCT_TYPE service`), §3 (`OrderItem.booking_slot`), §4 (checkout `start_datetime`), §16.4 (تضارب ترميز أيام الأسبوع) · `01-tenants-dashboard-admin.md` §3.2 (Bookings), §4 («الحجوزات»), §7 (ميزة `bookings`) · `03-*.md` §1 (`/product/<id>/available-slots/`, `/product/<id>/book/`) · **Benchmarks**: Cal.com (نوافذ التوفر بالأيام، اختيار الموعد بعمودَين تاريخ/وقت)، Square Appointments (تقويم يوم/أسبوع للتاجر، حالات الموعد)

## 1. الهدف (Purpose)

تمكين تاجر الخدمات من تحديد ساعات توفر كل خدمة قابلة للحجز ورؤية مواعيده في تقويم، وتمكين المشتري من اختيار موعد متاح أثناء الشراء. يُقاس بنسبة الحجوزات المكتملة بلا تعارض وبزمن اختيار الموعد.

## 2. الفاعلون (Actors)

- **مالك المتجر / موظف**: يُعلّم المنتجات كقابلة للحجز، يضبط نوافذ التوفر، يراقب التقويم ويلغي حجوزات.
- **المشتري**: يختار موعداً في صفحة المنتج (M10) ويُكمل الشراء (M12).
- **النظام**: يحتجز الموعد (`held`) أثناء الشراء ويُحرّره عند انتهاء `held_until`.

## 3. قصص المستخدم (User Stories)

### US-26.1 — الخدمات القابلة للحجز وساعات توفرها (P1)
يرى التاجر قائمة المنتجات ذات `is_bookable=true` مع مدة الموعد، ويضبط لكل خدمة نوافذ توفر بحسب يوم الأسبوع (عدة نوافذ لليوم الواحد).
**Independent Test**: إضافة نافذتَين للاثنين (09:00–12:00، 16:00–20:00) ثم فتح منتقي المشتري لذلك اليوم يعرض مواعيد داخل النافذتَين فقط.
**Acceptance**:
1. **Given** خدمة بلا نوافذ، **When** تُفتح صفحتها، **Then** تظهر 7 أيام فارغة بنص «غير متاح» وزر «أضف نافذة» لكل يوم.
2. **Given** نافذة `end_time ≤ start_time` أو متداخلة مع أخرى في نفس اليوم، **When** تُحفظ، **Then** تُرفض محلياً برسالة تحت الحقل.
3. **Given** أيام الأسبوع، **Then** يُعرض الترتيب وفق `week_start_day` للمتجر، مع تحويل داخلي صحيح إلى ترميز الخادم (0 = الاثنين).

### US-26.2 — تقويم الحجوزات للتاجر (P1)
يرى التاجر مواعيده في عرض يوم أو أسبوع، بفلترة الخدمة، ويفتح أي حجز لرؤية العميل والطلب المرتبط.
**Acceptance**:
1. **Given** عرض الأسبوع، **When** يُفتح، **Then** تُعرض الأعمدة من يوم بداية الأسبوع للمتجر، والمواعيد ككتل بحدود 1px بنص: الوقت Mono، اسم الخدمة، اسم العميل؛ `held` بحدود متقطعة، `booked` صلبة.
2. **Given** حجز `booked`, **When** يُفتح، **Then** يُعرض رابط الطلب (M06) ورقم العميل وزر «إلغاء الحجز» مع تأكيد.
3. **Given** التنقل بين الأسابيع، **Then** التاريخ في الرابط ويُنسَّق عبر `Intl.DateTimeFormat('ar')`.

### US-26.3 — اختيار الموعد في المتجر (P1)
في صفحة منتج قابل للحجز يرى المشتري منتقي تاريخ ثم قائمة أوقات متاحة، يختار واحداً فيُحتجز ويُمرَّر مع السلة إلى الدفع.
**Independent Test**: اختيار موعد ثم إعادة تحميل الصفحة خلال مدة الاحتجاز يعرض الموعد نفسه «محتجز لك حتى …».
**Acceptance**:
1. **Given** منتج `is_bookable`, **When** تُفتح PDP، **Then** يظهر منتقي مواعيد مكان زر الإضافة المباشر، بأيام متاحة قابلة للنقر فقط.
2. **Given** يوم محدد، **When** يُختار، **Then** تُحمَّل الأوقات من الخادم وتُعرض Mono بطول `booking_duration_minutes`.
3. **Given** موعد اختير، **When** يُضغط «احجز وتابع»، **Then** يُحتجز وتُعرض مهلة `held_until` كعدّ تنازلي نصي، ويُمرَّر `start_datetime` إلى M12.
4. **Given** موعد صار `booked` لعميل آخر أثناء التصفح، **When** يُختار، **Then** يُعرض «لم يعد هذا الموعد متاحاً» وتُحدَّث القائمة.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-26.01**: الوحدة MUST تُخفى بالكامل (الشريط، الشاشات، منتقي PDP) حين تكون ميزة `bookings` معطّلة.
- **FR-26.02**: شاشة التوفر MUST تحوّل بين عرض أيام الأسبوع للمستخدم وترميز الخادم (0 = الاثنين … 6 = الأحد) في طبقة واحدة مُختبَرة؛ يُمنع تسريب ترميز المواقع (0 = الأحد).
- **FR-26.03**: نوافذ التوفر MUST تدعم عدة نوافذ لليوم، مع منع التداخل محلياً وإعادة التحقق على الخادم.
- **FR-26.04**: التقويم MUST يدعم عرضَي اليوم والأسبوع، فلترة الخدمة، وحالة التاريخ/العرض في الرابط؛ لا سحب وإفلات في هذا الإصدار.
- **FR-26.05**: كتل المواعيد MUST تميّز `held` عن `booked` بالحدود (متقطع/صلب) لا بالألوان المساحية؛ `cancelled` يُخفى افتراضياً مع مفتاح إظهار.
- **FR-26.06**: منتقي المشتري MUST يقرأ الأوقات من الخادم فقط (لا توليد محلي للمواعيد) ويعرضها بمنطقة وقت المتجر (`timezone`) مع إشارة واضحة.
- **FR-26.07**: احتجاز الموعد MUST يُعرض بعدّ تنازلي حتى `held_until` وبعد انتهائه يُعاد المشتري إلى اختيار الموعد.
- **FR-26.08**: كل الأوقات MUST تُعرض Mono بصيغة 24 ساعة أو 12 ساعة وفق `Intl` للغة العربية، والتواريخ بأسماء الأيام العربية.
- **FR-26.09**: إلغاء الحجز من التاجر MUST يطلب تأكيداً ويُعرض أثره على الطلب كما يرسله الخادم.

## 5. الكيانات والحالات (Key Entities & States)

- **Product (خدمة)**: `is_bookable`, `booking_duration_minutes`, `product_type` (`service` عادةً).
- **ServiceAvailability**: `product`, `weekday` (0 = الاثنين … 6 = الأحد)، `start_time`, `end_time`؛ عدة صفوف لليوم الواحد.
- **BookingSlot**: `product`, `start_datetime`, `status`: `held` محتجز · `booked` محجوز · `cancelled` ملغي؛ `held_until`؛ فريد جزئياً على `(product, start_datetime)`.
- **OrderItem.booking_slot**: ربط عنصر الطلب بالموعد.
- الانتقال: `held → booked` (إتمام الدفع) · `held → cancelled` (انتهاء المهلة/إلغاء) · `booked → cancelled` (التاجر).

## 6. واجهة المستخدم (UI Surface)

- **الشاشات (التاجر)**: `/dashboard/bookings` (تقويم يوم/أسبوع) · `/dashboard/bookings/services` (الخدمات القابلة للحجز) · `/dashboard/bookings/services/[id]/availability` (شبكة 7 أيام × نوافذ). **(المتجر)**: منتقي المواعيد داخل `/[store]/products/[id]` (M10) كمكوّن مستقل.
- **الحالات البصرية**: skeleton شبكة التقويم · فراغ «لا حجوزات هذا الأسبوع» / «لا خدمات قابلة للحجز — فعّل «قابل للحجز» في منتج» · خطأ · الميزة معطّلة · في PDP: «لا مواعيد متاحة في هذا اليوم» و«انتهت مهلة الاحتجاز».
- **الجوال**: التقويم → عرض اليوم افتراضياً مع تمرير أفقي للأيام؛ منتقي PDP بعمود واحد (تاريخ ثم أوقات كأزرار ≥ 44px).
- **اختصارات**: `T` اليوم · `←/→` أسبوع سابق/تالٍ (منعكس في RTL) · `⌘K` → «حجز: <عميل>».

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| الخدمات القابلة للحجز | `booking_services_list` HTML | `[NEEDS BACKEND]` → `GET /api/v1/bookings/services/` → `[{id, name, booking_duration_minutes, availability_count, image}]` |
| نوافذ التوفر لخدمة | `manage_service_availability` HTML (`ServiceAvailabilityForm`) | `[NEEDS BACKEND]` → `GET/PUT /api/v1/bookings/services/<id>/availability/` `[{weekday, start_time, end_time}]` (استبدال كامل) |
| حجوزات نطاق زمني | `bookings_calendar` HTML | `[NEEDS BACKEND]` → `GET /api/v1/bookings/slots/?from&to&product&status` → `[{id, product:{id,name}, start_datetime, end_datetime, status, held_until, customer_name, customer_phone, order_id}]` |
| إلغاء حجز (تاجر) | — | `[NEEDS BACKEND]` → `POST /api/v1/bookings/slots/<id>/cancel/` |
| المواعيد المتاحة للمشتري | `GET /product/<id>/available-slots/` JSON | Ready (يُوحَّد لاحقاً تحت `GET /api/v1/catalog/products/<id>/slots/?date`) |
| احتجاز موعد | `POST /product/<id>/book/` HTML | `[NEEDS BACKEND]` → `POST /api/v1/catalog/products/<id>/slots/hold/` `{start_datetime}` → `{slot_id, held_until}` |
| تمرير الموعد للدفع | حقل `start_datetime` في checkout POST | يُغطّى في M12 |
| منطقة وقت المتجر وبداية الأسبوع | `StoreSetting.timezone`, `week_start_day` | `[NEEDS BACKEND]` → ضمن `GET /api/v1/config/` أو M34 |

## 8. الحالات الحدّية (Edge Cases)

- خدمة `booking_duration_minutes` أطول من النافذة: لا مواعيد تُولَّد؛ تُعرض ملاحظة في شاشة التوفر «النافذة أقصر من مدة الموعد».
- المشتري في منطقة وقت مختلفة: تُعرض أوقات المتجر صريحة «بتوقيت المتجر (Asia/Aden)».
- حجز بلا طلب (`held` منتهٍ لم يُنظَّف بعد): يُعرض بشارة «منتهٍ» ولا يُحتسب.
- `week_start_day=sunday` مع ترميز الخادم 0 = الاثنين: الترتيب البصري يبدأ بالأحد والقيم تُرسل صحيحة (اختبار وحدة إلزامي).
- منتج `is_bookable` و`has_variants`: المتغير يُختار أولاً ثم الموعد (الموعد على مستوى المنتج).

## 9. معايير النجاح (Success Criteria)

- **SC-26.1**: ضبط توفر خدمة لأسبوع كامل ≤ 2 دقيقة.
- **SC-26.2**: صفر أخطاء في مطابقة يوم الأسبوع بين الواجهة والخادم في اختبارات الوحدة (7/7 أيام × بدايتَي أسبوع).
- **SC-26.3**: اختيار موعد في PDP ≤ 3 نقرات؛ عرض الأوقات بعد اختيار اليوم ≤ 500ms.
- **SC-26.4**: 100% من كتل التقويم تميّز `held`/`booked` بلا اعتماد على اللون وحده.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M04 (حقول `is_bookable`)، M10 (PDP)، M12 (الدفع و`start_datetime`)، M06 (رابط الطلب)، M34 (`timezone`, `week_start_day`).
- افتراض: مدة الاحتجاز (`held_until`) يحددها الخادم؛ الواجهة تعرضها فقط.
- افتراض: لا موظف/مورد مُعيَّن لكل موعد (التوفر على مستوى الخدمة فقط).
- افتراض: شكل استجابة `available_slots_api` الحالي يُغلَّف بـ Zod كما هو حتى توحيده تحت `/api/v1`.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: التقويم بخطوط شبكة 1px zinc بلا تلوين مساحي للمواعيد؛ تمييز الحالة بالحدود؛ لا أيقونات تقويم زخرفية؛ العدّ التنازلي نص Mono لا دائرة متحركة.
- II: شبكة الأسبوع تبدأ من اليمين؛ أسهم التنقل تنعكس (`rtl:rotate-180`)؛ الأوقات Mono `tabular-nums`؛ التواريخ `Intl.DateTimeFormat('ar')`.
- IV: لقطات `docs/visual-checks/26-bookings/{desktop,tablet,mobile,desktop-dark}.png` لعرض الأسبوع (فارغ/ممتلئ)، شاشة التوفر، ومنتقي PDP على الجوال.
