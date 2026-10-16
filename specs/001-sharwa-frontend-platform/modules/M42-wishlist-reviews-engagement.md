# M42 — قائمة الأمنيات والتقييمات والتنبيه بالتوفر (Wishlist, Reviews & Back-in-stock)

**Route group**: `(storefront)/[store]` · **Priority**: P2 · **Backend status**: HTML-only `[NEEDS BACKEND]` (`toggle_wishlist`, `wishlist`, `submit_review`, `subscribe_back_in_stock` قوالب/POST Django؛ `ProductDetailView` لا يعيد التقييمات) · `/api/v1/catalog/products/*` Ready للبيانات الأساسية
**Discovery refs**: `02-products-domain-model.md` §13 (`ProductReview` rating 1–5 + `admin_reply`, `WishlistItem` by phone, `BackInStockNotification`), §2 (`Product.average_rating`, `rating_distribution`, `is_available`, `allow_backorder`, `StoreReview`), §12 (تقارير `ratings`, `wishlists`) · `03-api-payments-shipping-theme-integrations.md` §1 (`ProductDetailView` fields), §2 (لا حسابات للعملاء؛ throttle anon 120/min) · `01-tenants-dashboard-admin.md` §3.2 (Storefront views), §5 (`wishlist.html`) · **Benchmarks**: Amazon Reviews (توزيع النجوم كأشرطة أفقية رصينة، رد البائع مميَّز)، Noon (قائمة أمنيات بلا حساب إلزامي، تنبيه التوفر بحقل واحد)، Apple (تقييم بلا زخرفة)

## 1. الهدف (Purpose)

رفع العودة والتحويل في المتجر بثلاث أدوات خفيفة لا تتطلب حساباً: حفظ المنتج للاحقاً (مفتاحه رقم الهاتف)، تقييم صادق مع رد التاجر، وتنبيه بالتوفر عند نفاد المخزون. يُقاس بنسبة المنتجات المحفوظة التي تُشترى خلال 30 يوماً، وبعدد التقييمات لكل 100 طلب.

## 2. الفاعلون (Actors)

- **المشتري**: يحفظ، يقيّم، يطلب تنبيهاً؛ هويته رقم هاتف يُدخله مرة واحدة ويُحفظ في الجلسة.
- **التاجر** (في M07/M04): يرد على التقييمات (`admin_reply`) ويرى قوائم الأمنيات في تقرير M25.
- **النظام**: يرسل تنبيه التوفر عبر واتساب عند عودة المخزون (خادمياً).

## 3. قصص المستخدم (User Stories)

### US-42.1 — حفظ منتج في قائمة الأمنيات (P1)
يضغط المشتري أيقونة الحفظ على بطاقة المنتج أو في PDP؛ إن لم يُعرَف هاتفه بعد تُفتح لوحة سفلية صغيرة تطلب الرقم مرة واحدة (بلا OTP)، ثم يُحفظ ويتغير شكل الأيقونة.
**Independent Test**: حفظ 3 منتجات بهاتف، فتح `/[store]/wishlist` في نفس الجلسة → 3 عناصر؛ جلسة جديدة بنفس الهاتف → نفس القائمة بعد إدخال الرقم.
**Acceptance**:
1. **Given** هاتف محفوظ في الجلسة، **When** يُضغط الحفظ، **Then** يُبدَّل فوراً (optimistic) ويُرسل، ويُعرض toast «أُضيف إلى قائمتك» مع رابط القائمة.
2. **Given** الحفظ بلا هاتف، **Then** تُطلب الصيغة المحلية (`07…`) وتُطبَّع خادمياً (`0770841802 → 967770841802`)، وتُعرض كما أعادها الخادم.
3. **Given** `prefers-reduced-motion`، **Then** تبديل الأيقونة بلا حركة.

### US-42.2 — صفحة قائمة الأمنيات (P1)
يفتح المشتري `/[store]/wishlist` فيرى منتجاته المحفوظة ببطاقات المتجر نفسها (M09) مع السعر الحالي من الخادم، حالة التوفر، وزر «أضف إلى السلة» (M11) وإزالة.
**Acceptance**:
1. **Given** منتج نفد (`stock=0` و`allow_backorder=false`)، **Then** يُستبدل زر السلة بـ «نبّهني عند التوفر».
2. **Given** منتج لم يعد ظاهراً (`is_available=false` أو مؤرشف)، **Then** يُعرض باهتاً بنص «لم يعد متاحاً» وزر إزالة فقط.
3. **Given** القائمة فارغة، **Then** نص «لم تحفظ شيئاً بعد» ورابط «تصفّح المنتجات»، بلا رسم.

### US-42.3 — عرض التقييمات في PDP (P1)
في PDP (M10) يرى المشتري المتوسط (رقم Mono كبير مثل `4.3`) وتوزيع النجوم كخمسة أشرطة أفقية رفيعة بعدد كل منها، ثم قائمة التقييمات (اسم أول، تاريخ، نجوم، نص) ورد التاجر مُميَّزاً بحد بداية 2px ونص «رد المتجر».
**Acceptance**:
1. **Given** 0 تقييمات، **Then** يُعرض «لا تقييمات بعد — كن أول من يقيّم» وزر التقييم.
2. **Given** 40 تقييماً، **Then** تُعرض 5 أولاً مع «عرض المزيد» (ترقيم خادمي)، وفلتر بالنجوم اختياري في الرابط.

### US-42.4 — إرسال تقييم (P1)
يضغط المشتري «أضف تقييماً» فيُدخل: النجوم (1–5، إلزامي)، تعليق (اختياري، ≤ 1000 حرف)، اسمه وهاتفه (الهاتف من الجلسة إن وُجد)، ويُرسل.
**Acceptance**:
1. **Given** إرسال ناجح، **Then** يُعرض «شكراً، سيظهر تقييمك بعد المراجعة إن لزم» ويُغلق النموذج؛ لا يُعرض التقييم محلياً حتى يعيده الخادم.
2. **Given** 429 (throttle)، **Then** رسالة «حاول بعد دقيقة» بلا إعادة تلقائية.
3. **Given** النجوم غير محددة، **Then** يُمنع الإرسال مع رسالة تحت الحقل، والنجوم قابلة للاختيار بالأسهم (radiogroup).

### US-42.5 — تنبيه بالتوفر (P1)
في PDP أو قائمة الأمنيات لمنتج نافد: زر «نبّهني عند التوفر» يطلب الهاتف (من الجلسة إن وُجد) ويُسجّل `BackInStockNotification`.
**Acceptance**:
1. **Given** تسجيل ناجح، **Then** يتحول الزر إلى «سنُنبّهك عبر واتساب» معطّلاً؛ وإعادة الضغط لا تُنشئ تكراراً (الخادم idempotent أو 200 مكرر).
2. **Given** متغير محدد نافد ومنتج أبوه متوفر، **Then** يُسجَّل التنبيه على مستوى المنتج (كيان الباك إند) ويُوضَّح ذلك نصاً.

### US-42.6 — تقييم المتجر (P2)
في «من نحن» (M34) أو تذييل المتجر: نموذج `StoreReview` بنجوم وتعليق، وملخص المتوسط إن توفر.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-42.01**: هوية المشتري MUST تكون رقم الهاتف المُطبَّع المُخزَّن في جلسة الباك إند (كوكي) ومرآته في `localStorage` للعرض فقط؛ لا OTP لهذه الوحدة.
- **FR-42.02**: كل الطلبات MUST تُرسل بـ `credentials: 'include'` (نفس كوكي السلة) وتحترم throttle anon 120/min.
- **FR-42.03**: حفظ/إزالة الأمنيات MUST يكون optimistic مع تراجع عند الفشل.
- **FR-42.04**: الأسعار في قائمة الأمنيات MUST تُقرأ من `display_price`/`display_old_price` الحالية (ليس لقطة وقت الحفظ).
- **FR-42.05**: التقييمات MUST تُعرض كما يعيدها الخادم (بما فيها `admin_reply`)؛ يُمنع إدراج تقييم محلي قبل تأكيد الخادم.
- **FR-42.06**: مكوّن النجوم MUST يكون `radiogroup` قابلاً للوصول بلوحة المفاتيح مع `aria-label` «التقييم من 5».
- **FR-42.07**: توزيع النجوم MUST يُعرض كأشرطة أفقية بلون `foreground` على `muted` بلا ألوان دلالية (ليس حالة).
- **FR-42.08**: تنبيه التوفر MUST يُعرض فقط حين `stock ≤ 0` و`allow_backorder=false` و`is_available=true`.
- **FR-42.09**: أيقونة الحفظ MUST تحمل `aria-pressed` وحالة `focus-visible` واضحة؛ حجم اللمس ≥ 44px على بطاقة المنتج.
- **FR-42.10**: الوحدة MUST تحترم ثيم المتجر (رموز `(storefront)`) ولا تستورد مكونات لوحة التاجر.
- **FR-42.11**: نص التقييم MUST يُعرض كنص عادي (escape) بلا HTML.

## 5. الكيانات والحالات (Key Entities & States)

- **WishlistItem**: `customer_phone` (مفتاح), `product`, `created_at`. الحالة المشتقة للعرض: متاح · نفد · لم يعد متاحاً.
- **ProductReview**: `product`, `customer_name`, `customer_phone`, `rating` (1–5), `comment`, `admin_reply`, `created_at`. مشتقات المنتج: `average_rating`, `rating_distribution` {1..5: count}.
- **BackInStockNotification**: `product`, `customer_phone`, `created_at`, حالة الإرسال (خادمية).
- **StoreReview**: `customer_name`, `rating`, `comment`, `created_at`.
- **ShopperIdentity** (واجهة): `phone_normalized` في الجلسة؛ `has_phone` يحدد ظهور لوحة الإدخال.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/[store]/wishlist` · مكوّن «حفظ» على بطاقة المنتج (M09) وفي PDP (M10) · قسم التقييمات داخل PDP · لوحة سفلية «رقم هاتفك» (Vaul) · لوحة «أضف تقييماً» · زر «نبّهني عند التوفر» · نموذج تقييم المتجر في M34.
- **الحالات البصرية**: skeleton لبطاقات الأمنيات والتقييمات · فراغ نصّي (أمنيات/تقييمات) · خطأ شبكة · 429 · «لم يعد متاحاً» · مُسجَّل مسبقاً للتنبيه.
- **الجوال**: كل النماذج لوحات سفلية؛ النجوم بحجم 32px للمس؛ قائمة الأمنيات عمودان 390px.
- **اختصارات**: لا شيء عام؛ النجوم بالأسهم، `Esc` يغلق اللوحات.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| بيانات المنتج الأساسية | `GET /api/v1/catalog/products/<id>/` → `stock, display_price, display_old_price, is_featured, …` | Ready (بلا تقييمات/`allow_backorder`/`is_available`) |
| تعريف الهاتف للجلسة | ضمن POST views | `[NEEDS BACKEND]` → `POST /api/v1/shopper/phone/` `{phone}` → `{phone_normalized}` (يُخزَّن في الجلسة) |
| قائمة الأمنيات | `wishlist` HTML, `toggle_wishlist` POST | `[NEEDS BACKEND]` → `GET /api/v1/wishlist/` → `{phone_normalized?, items:[{product:{id, name, image, display_price, display_old_price, stock, allow_backorder, is_available}, created_at}]}`; `POST /api/v1/wishlist/toggle/` `{product_id}` → `{saved: bool}` |
| تقييمات منتج | غير معروضة في API | `[NEEDS BACKEND]` → `GET /api/v1/catalog/products/<id>/reviews/?rating&page` → `{average_rating, rating_distribution:{1..5}, count, results:[{id, customer_name, rating, comment, admin_reply, created_at}]}` |
| إرسال تقييم | `submit_review` POST | `[NEEDS BACKEND]` → `POST /api/v1/catalog/products/<id>/reviews/` `{customer_name, customer_phone, rating, comment}` → 201 `{status: published\|pending}` / 400 / 429 |
| تنبيه التوفر | `subscribe_back_in_stock` POST | `[NEEDS BACKEND]` → `POST /api/v1/catalog/products/<id>/back-in-stock/` `{phone}` → 201/200 `{subscribed: true}` |
| تقييم المتجر | نموذج `StoreReview` | `[NEEDS BACKEND]` → `GET/POST /api/v1/store-reviews/` `{customer_name, rating, comment}` → `{average_rating, count, results[]}` |

## 8. الحالات الحدّية (Edge Cases)

- المشتري يغيّر الهاتف في الجلسة: تُعرض قائمة الهاتف الجديد؛ القديمة تبقى على الخادم بلا دمج.
- كوكي الجلسة محجوبة (Safari ITP أو وضع خاص): يُعرض تنويه «فعّل الكوكيز لحفظ قائمتك» وتُعطَّل الوحدة بهدوء؛ لا تسقط صفحة المنتج.
- منتج حُذف نهائياً: يُستبعد من استجابة الخادم؛ الواجهة لا تعرض عنصراً معطوباً.
- تقييم من شخص لم يشترِ: مسموح (لا endpoint للتحقق من الشراء)؛ شارة «مشترٍ موثَّق» غير معروضة حتى يوفرها الخادم.
- `rating_distribution` مجموعه لا يساوي `count` (تقييمات قيد المراجعة): تُعرض الأرقام كما وردت.
- متجر معطَّلة فيه التقييمات (قرار التاجر مستقبلاً): يُخفى القسم إن أعاد الخادر 404/403 لمسار التقييمات.

## 9. معايير النجاح (Success Criteria)

- **SC-42.1**: حفظ منتج بعد أول إدخال للهاتف = نقرة واحدة في 100% من المرات اللاحقة.
- **SC-42.2**: إرسال تقييم بثلاث نجوم وتعليق ≤ 20 ثانية من فتح PDP.
- **SC-42.3**: 0 تقييمات معروضة محلياً قبل تأكيد الخادم.
- **SC-42.4**: مكوّن النجوم يحقق AA ويُشغَّل بلوحة المفاتيح فقط في فحص Playwright.
- **SC-42.5**: صفحة الأمنيات LCP ≤ 2.5s على 4G بـ 12 منتجاً.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M09 (بطاقة المنتج والثيم)، M10 (PDP)، M11 (السلة)، M34 (صفحة من نحن)، M44 (PWA/Push اختياري لاحقاً)، M07/M25 (جانب التاجر).
- افتراض: الهاتف يُخزَّن في جلسة الباك إند (نفس كوكي السلة) لا في JWT؛ `localStorage` مرآة عرض فقط.
- افتراض: الخادم يحدد هل يُنشر التقييم فوراً أو بعد مراجعة (`status`)؛ الواجهة تعرض الرسالة المناسبة.
- افتراض: إشعار التوفر يُرسل من الباك إند عبر واتساب (SharwaConnect)؛ الواجهة لا ترسل.
- افتراض: `allow_backorder` و`is_available` تُضاف إلى استجابة التفاصيل أو تُقرأ من endpoint الأمنيات؛ حتى ذلك يُعتمد على `stock` فقط.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا نجوم صفراء ممتلئة كبيرة؛ النجوم بخط رفيع بلون `foreground` والممتلئة مصمتة بنفس اللون. لا بطاقات شهادات متماثلة. التوزيع أشرطة zinc. لا إيموجي ولا قلوب حمراء؛ أيقونة الحفظ Lucide `bookmark` بحالتَين.
- II: المتوسط والأعداد Mono؛ أشرطة التوزيع تمتد من اليمين؛ ترتيب النجوم 1→5 من اليمين؛ حد «رد المتجر» في جهة البداية (`border-s-2`).
- IV: لقطات `docs/visual-checks/42-engagement/` لقائمة الأمنيات (فارغة/ممتلئة/نافد)، قسم التقييمات في PDP، لوحة الهاتف على الجوال، الداكن.
- IX: مفاتيح الكاش `[tenant, 'wishlist']`, `[tenant, 'reviews', productId, page]`؛ optimistic toggle عبر TanStack Query؛ Zod لكل استجابة؛ `next/image` للصور.
