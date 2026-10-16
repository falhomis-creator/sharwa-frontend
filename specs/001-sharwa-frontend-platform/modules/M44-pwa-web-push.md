# M44 — تطبيق المتجر PWA وإشعارات المتصفح (PWA & Web Push)

**Route group**: `(storefront)/[store]` · **Priority**: P3 · **Backend status**: Ready (`POST /api/v1/pwa/install-event/`, `GET /api/v1/push/vapid-public-key/`, `POST /api/v1/push/subscribe/`, `POST /api/v1/push/unsubscribe/`)؛ الإشعار التجريبي للتاجر HTML-only `[NEEDS BACKEND]`
**Discovery refs**: `03-api-payments-shipping-theme-integrations.md` §1 (pwa/push rows), §7 (legacy SW policy, manifest), §9.6 (ملكية `/sw.js`) · `02-products-domain-model.md` §14.F (`PWAInstallEvent`, `PushSubscription`), §16.7 (`source='nextjs_app'`) · `01-tenants-dashboard-admin.md` §3.2 (`pwa_manifest`, `pwa_service_worker`, `send_test_push_notification`) · **Benchmarks**: Noon PWA (تثبيت غير مزعج بعد قيمة فعلية)، Twitter Lite (كاش أصول جريء مع بيانات حيّة دائماً)، Starbucks PWA (manifest بهوية العلامة)

## 1. الهدف (Purpose)

تحويل متجر كل تاجر إلى تطبيق قابل للتثبيت بهويته (اسم، لون، أيقونة) على جوال المشتري، مع تتبّع قمع التثبيت ومنح المتجر قناة إشعارات متصفح يختارها المشتري بعد أول طلب — دون أن يرى المشتري سلة أو إعدادات قديمة من الكاش. يُقاس بمعدل التحويل من `prompt_shown` إلى `installed` ونسبة الاشتراك في الإشعارات بعد الطلب.

## 2. الفاعلون (Actors)

- **المشتري**: يرى مطالبة التثبيت أو إرشاد iOS، ويقرر الاشتراك في الإشعارات بعد الطلب.
- **التاجر**: يرى عدد المشتركين ويُرسل إشعاراً تجريبياً من لوحة التقارير (`send_test_push_notification`).
- **النظام**: يُسجّل أحداث التثبيت (30/دقيقة/IP)، يخزّن الاشتراكات (upsert على `endpoint`)، ويعطّل (لا يحذف) الاشتراكات المنتهية.

## 3. قصص المستخدم (User Stories)

### US-44.1 — مطالبة التثبيت وإرشاد iOS (P1)
بعد تفاعل فعلي (زيارة ثانية أو إضافة للسلة) يرى المشتري شريطاً سفلياً صغيراً «أضف {اسم المتجر} إلى شاشتك الرئيسية»؛ على Safari iOS يرى إرشاداً مصوَّراً نصّياً لخطوة «مشاركة ← إضافة إلى الشاشة الرئيسية».
**Independent Test**: فتح المتجر على Chrome Android مرتَين؛ ظهور الشريط؛ القبول؛ التأكد من أحداث `prompt_shown` → `accepted` → `installed` بمصدر `nextjs_app`.
**Acceptance**:
1. **Given** حدث `beforeinstallprompt` مؤجَّل، **When** يُعرض الشريط، **Then** يُرسل `{event_type:'prompt_shown', source:'nextjs_app'}`.
2. **Given** رفض المشتري، **Then** يُرسل `dismissed` ولا يُعاد العرض قبل 14 يوماً (ذاكرة محلية).
3. **Given** iOS Safari بلا `beforeinstallprompt`, **Then** يُعرض الإرشاد مرة واحدة ويُرسل `ios_hint_shown`.
4. **Given** `appinstalled`, **Then** يُرسل `installed` ويُخفى الشريط نهائياً.

### US-44.2 — Manifest لكل متجر (P1)
يُخدَم manifest بهوية المتجر من `GET /api/v1/config/`: الاسم، الاسم المختصر، لون السمة من `primary_color`، لون الخلفية من `background_color`، أيقونات 192/512 + maskable، `dir=rtl`, `lang=ar`, `display=standalone`.
**Acceptance**:
1. **Given** `store_name` أطول من 12 حرفاً، **Then** `short_name` = أول 11 حرفاً + «…» (كما في الباك إند).
2. **Given** تغيير `primary_color` من M08، **Then** `theme_color` يتغير عند إعادة تحميل الـ manifest بلا نشر.

### US-44.3 — سياسة الكاش في Service Worker (P1)
يعمل المتجر بسرعة على الزيارات التالية بلا بيانات قديمة: السلة والإعدادات شبكة فقط؛ باقي API شبكة أولاً؛ الصور والخطوط كاش أولاً.
**Acceptance**:
1. **Given** انقطاع الشبكة، **When** تُفتح السلة، **Then** تُعرض حالة «لا اتصال» لا سلة مخبّأة.
2. **Given** صورة منتج محمَّلة سابقاً، **Then** تُخدَم من الكاش فوراً وتُحدَّث خلفياً.
3. **Given** نشر إصدار جديد، **Then** يُحذف كاش الإصدارات السابقة عند `activate`.

### US-44.4 — الاشتراك في الإشعارات بعد الطلب (P2)
على صفحة نجاح الطلب (M12) يرى المشتري «نبّهني عند تغيّر حالة طلبي» فيُطلب إذن المتصفح ويُرسل الاشتراك مع هاتفه.
**Acceptance**:
1. **Given** إذن ممنوح، **Then** يُرسل `{endpoint, keys:{p256dh, auth}, customer_phone}` ويُعرض «سنُنبّهك عند تغيّر الحالة».
2. **Given** إذن مرفوض، **Then** يُخفى الزر بلا إعادة طلب في نفس الجلسة.
3. **Given** إلغاء من إعدادات المتجر، **Then** يُرسل `{endpoint}` إلى `unsubscribe`.

### US-44.5 — إشعار تجريبي من التاجر (P3)
يُدخل التاجر عنواناً ونصاً ويُرسل لكل المشتركين النشطين؛ يرى العدد.
**Acceptance**:
1. **Given** 0 مشتركين، **Then** «لا يوجد مشتركون نشطون لإشعارات المتصفح بعد.» وزر الإرسال معطّل.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-44.01**: أحداث التثبيت MUST تُرسل إلى `POST /api/v1/pwa/install-event/` بـ `source:'nextjs_app'` دائماً و`event_type` من القيم الخمس؛ تُعامل 429 بصمت.
- **FR-44.02**: Manifest MUST يُولَّد لكل متجر على مسار `/manifest.webmanifest` تحت أصل المتجر من بيانات `/api/v1/config/`؛ `start_url`/`scope` = أصل المتجر `/`.
- **FR-44.03**: Service Worker MUST يُسجَّل من `/sw.js` على أصل المتجر بسياسة: network-only لـ `/api/v1/cart*` و`/api/v1/config/`؛ network-first لباقي `/api/v1/*`؛ cache-first للصور والخطوط (`png|jpe?g|webp|gif|svg|woff2?`) باسم كاش مُصدَّر؛ لا كاش لأي صفحة تحوي بيانات شخصية (الدفع، التتبع).
- **FR-44.04**: الاشتراك MUST يجلب المفتاح من `GET /api/v1/push/vapid-public-key/` (`{publicKey}`) ويُحوّله إلى `Uint8Array` قبل `pushManager.subscribe({userVisibleOnly:true})`.
- **FR-44.05**: الاشتراك MUST يُرسل `PushSubscription.toJSON()` كما هو (`endpoint`, `keys.p256dh`, `keys.auth`) مع `customer_phone` عند معرفته (بعد الطلب فقط).
- **FR-44.06**: شريط التثبيت MUST لا يظهر في أول زيارة ولا فوق محتوى الدفع؛ ارتفاعه ≤ 56px وبحد 1px، وقابل للإغلاق بلوحة المفاتيح.
- **FR-44.07**: استقبال الإشعار في SW MUST يعرض `title`/`body` ويفتح `url` من الحمولة عند النقر؛ بلا صوت أو أيقونات ملونة مخصصة.
- **FR-44.08**: الوحدة MUST تحترم `prefers-reduced-motion` في ظهور الشريط.

## 5. الكيانات والحالات (Key Entities & States)

- **PWAInstallEvent**: `event_type`: `prompt_shown` ظهرت مطالبة التثبيت · `ios_hint_shown` ظهر إرشاد آيفون اليدوي · `accepted` وافق الزبون على التثبيت · `dismissed` رفض الزبون التثبيت · `installed` تم التثبيت فعلياً؛ `source`: `django_storefront` · `nextjs_app` (المستخدم).
- **PushSubscription**: `endpoint` (فريد)، `p256dh`, `auth`, `user_agent`, `customer_phone?`, `is_active`, `created_at`. upsert على `endpoint`; التعطيل لا الحذف عند 404/410.
- **InstallPromptState** (محلي): `deferred` · `shown` · `dismissed_until` · `installed`.
- **Manifest**: `name`, `short_name`, `start_url`, `scope`, `display:'standalone'`, `dir:'rtl'`, `lang:'ar'`, `background_color`, `theme_color`, `icons[192, 512, 512-maskable]`.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: شريط تثبيت سفلي في تخطيط `(storefront)/[store]` · ورقة إرشاد iOS (Vaul) · زر الاشتراك في صفحة نجاح الطلب (M12) · قسم «إشعارات المتصفح» في M25/M34 للتاجر (عدد المشتركين + إشعار تجريبي) · `/manifest.webmanifest` · `/sw.js` · صفحة `/offline`.
- **الحالات البصرية**: الشريط (ظاهر/مخفي) · إرشاد iOS · إذن مرفوض · غير متصل · نجاح الاشتراك (Sonner).
- **الجوال**: الشريط فوق شريط التنقل السفلي للمتجر بلا تداخل؛ هدف الإغلاق 44px.
- **اختصارات**: `Esc` يغلق الشريط/الورقة.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| حدث تثبيت | `POST /api/v1/pwa/install-event/` ← `{event_type: prompt_shown\|ios_hint_shown\|accepted\|dismissed\|installed, source:'nextjs_app'}` → 201 `{ok:true}`؛ 429 `{detail:'طلبات كثيرة جداً، حاول لاحقاً.'}` (30/دقيقة/IP) | Ready |
| مفتاح VAPID | `GET /api/v1/push/vapid-public-key/` → `{publicKey}` | Ready |
| اشتراك | `POST /api/v1/push/subscribe/` ← `{endpoint, keys:{p256dh, auth}, customer_phone?}` → 201 `{ok:true}` | Ready |
| إلغاء | `POST /api/v1/push/unsubscribe/` ← `{endpoint}` → `{ok:true}`؛ 400 `{detail:'endpoint مطلوب.'}` | Ready |
| بيانات الـ manifest | `GET /api/v1/config/` (`store_name`, `primary_color`, `background_color`, `logo`) | Ready (يُولَّد الـ manifest في Next) |
| إشعار تجريبي + عدد المشتركين | `send_test_push_notification` POST `{title, body}` HTML | `[NEEDS BACKEND]` → `GET /api/v1/push/stats/` → `{active_subscribers}`؛ `POST /api/v1/push/test/` `{title, body}` → `{queued_for}` |
| أيقونات المتجر 192/512 | ثابتة في `static/pwa/icons/` | يُولَّد في Next من `logo` بـ `next/og` أو أيقونة افتراضية zinc؛ `[NEEDS BACKEND]` لا يلزم |

## 8. الحالات الحدّية (Edge Cases)

- متجر بنطاق مخصص: `scope`/`start_url` من أصل الطلب الحالي لا من النطاق الفرعي.
- `/sw.js` مطلوب أيضاً لشروة باي (M40) على أصل المنصة: الأصلان مختلفان فلا تعارض؛ على أصل المنصة لا يُسجَّل SW المتجر.
- متصفح بلا Push API (iOS < 16.4 خارج التثبيت): يُخفى زر الاشتراك.
- `publicKey` فارغ (VAPID غير مضبوط): يُخفى الاشتراك مع تحذير console فقط.
- تغيير مفاتيح الاشتراك من المتصفح: إعادة الإرسال تُحدَّث بـ upsert على `endpoint`.
- نشر SW جديد أثناء جلسة دفع: `skipWaiting` مؤجَّل حتى مغادرة الدفع.

## 9. معايير النجاح (Success Criteria)

- **SC-44.1**: Lighthouse PWA installable = pass على كل متجر؛ Performance ≥ 90 محافظ عليه.
- **SC-44.2**: 0 حالات تُخدَم فيها `/api/v1/cart*` أو `/config/` من الكاش (فحص DevTools).
- **SC-44.3**: 100% من أحداث التثبيت بمصدر `nextjs_app`.
- **SC-44.4**: الزيارة الثانية تعرض أول صورة منتج في < 300ms من الكاش.
- **SC-44.5**: الشريط لا يظهر أبداً في أول زيارة أو داخل الدفع (فحص Playwright).

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M09 (تخطيط المتجر و`/config/`)، M12 (صفحة النجاح)، M08 (الألوان)، M25/M34 (قسم التاجر)، M40 (أصل منفصل).
- افتراض: قرار ملكية `/sw.js` (الفجوة D.6): Next يملك `/sw.js` على أصل المتجر وعلى أصل المنصة بسياستَين مختلفتَين؛ Django لا يخدمه بعد التحويل.
- افتراض: الاشتراك في الإشعارات يُعرض بعد أول طلب فقط (قيمة فعلية قبل الإذن).
- افتراض: الأيقونات تُولَّد من شعار المتجر عند توفره، وإلا أيقونة حرفية بلون `foreground` على `background`.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: شريط التثبيت نصّي بحد 1px بلا أيقونات ملونة ولا «✨»؛ لا نوافذ منبثقة مركزية. الإرشاد iOS نص مرقَّم لا رسم توضيحي.
- II: الشريط RTL مع زر الإغلاق في النهاية المنطقية؛ `dir:'rtl'` و`lang:'ar'` في الـ manifest؛ عدد المشتركين Mono.
- IV: لقطات `docs/visual-checks/44-pwa/{mobile,mobile-dark}.png` للشريط وورقة iOS وصفحة غير متصل؛ فحص console خالٍ من أخطاء SW.
- VII/VIII: `theme_color` من رموز المتجر فقط (تجاوز على جذر `(storefront)`)؛ SW مُسجَّل على أصل المتجر وحده؛ لا كاش مشترك بين المتاجر.
