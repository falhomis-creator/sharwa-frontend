# M47 — حلّ المستأجر وحارس التجهيز (Tenant Resolution & Provisioning Guard)

**Route group**: `middleware.ts` + `(onboarding)` + صفحات خطأ عامة · **Priority**: P1 · **Backend status**: Ready للحلّ (Host/`X-Store-Domain`، 404/403/503، `GET /register/status/<token>/`)؛ CSRF token عبر API `[NEEDS BACKEND]`
**Discovery refs**: `01-tenants-dashboard-admin.md` §1 (routing, middleware chain, reserved subdomains), §2.1 (`Client`, `Domain`), §6 (provisioning flow) · `03-api-payments-shipping-theme-integrations.md` §2 (tenant resolution, auth, CORS/CSRF), §7 (legacy proxy, sw.js), §8 (env), §9 · `00-module-map.md` §C, §D.6 · **Benchmarks**: Medusa (headless بعقد واضح بين الواجهة والخادم)، BigCommerce Multi-Storefront (تعدد الواجهات على نطاقات مختلفة بكاش معزول)، Vercel Platforms Starter (middleware يعيد كتابة المسار من الـ host بلا كشف المستأجر في الرابط)

## 1. الهدف (Purpose)

ضمان أن كل طلب — صفحة أو API — يُنسب إلى متجر واحد صحيح من الـ host قبل أي رسم، وأن يُعامَل المتجر غير الموجود/الموقوف/قيد التجهيز بصفحات واضحة بدل أخطاء خام، مع إبقاء الكوكيز (السلة، العملة، جلسة التاجر، CSRF) عاملة عبر proxy نفس الأصل. يُقاس بصفر تسرب كاش بين متجرَين وبزمن الانتظار المرئي أثناء التجهيز.

## 2. الفاعلون (Actors)

- **المشتري**: يفتح `<store>.<base>` أو نطاقاً مخصصاً؛ لا يعرف شيئاً عن المستأجرين.
- **التاجر الجديد**: ينتهي من M02 ويُحوَّل إلى متجره بينما `provisioning_status` لم يبلغ `ready`.
- **التاجر/الموظف**: يدخل `/dashboard` على نطاق متجره؛ جلسته cookie + CSRF.
- **النظام**: `middleware.ts` في Next يحلّ المستأجر ويعيد كتابة المسار؛ الـ BFF يمرّر الطلبات إلى Django مع `X-Store-Domain` والكوكيز.
- **Super Admin**: يدخل من نطاق محجوز (`console.<base>`).

## 3. قصص المستخدم (User Stories)

### US-47.1 — حلّ المتجر من الـ host وإعادة كتابة المسار (P1)
يصل طلب إلى `https://mystore.<base>/p/12` فيحدد الـ middleware أن المستأجر `mystore` ويعيد كتابة المسار داخلياً إلى `/(storefront)/mystore/p/12` بلا تغيير الرابط الظاهر.
**Independent Test**: طلبات إلى `mystore.<base>/`, `www.<base>/`, `<base>/register`, `shop.example.com/` → كلٌّ يُعاد كتابته إلى مجموعة المسار الصحيحة؛ لا يظهر `?store=` في أي رابط.
**Acceptance**:
1. **Given** host `mystore.<TENANT_BASE_DOMAIN>` و`mystore` يطابق `^[a-z0-9]+$` وليس محجوزاً، **Then** تُعاد الكتابة إلى `(storefront)/[store]` ويُمرَّر المستأجر عبر ترويسة داخلية `x-sharwa-store: mystore` إلى RSC.
2. **Given** host = `<base>` أو `www.<base>`، **Then** يُخدم `(marketing)` و`(onboarding)` (`/register/*`)؛ أي مسار متجر عليهما → 404 المنصة.
3. **Given** subdomain محجوز (`www, admin, administrator, root, api, dashboard, mail, email, support, help, app, sharwa, sharrwah, static, media, test, demo, staging, public, localhost, ai, console`)، **Then** لا يُعامَل كمتجر: `console` → `(admin)`، والبقية → صفحة المنصة أو 404 حسب جدول ثابت.
4. **Given** host لا ينتهي بـ `<base>` (نطاق مخصص)، **Then** يُمرَّر الـ host كاملاً كقيمة المستأجر ويُستخدم كـ `X-Store-Domain` في الـ BFF؛ Django يحلّه من `Domain` (`is_primary`).
5. **Given** مسار `/dashboard/*` على نطاق متجر، **Then** تُعاد الكتابة إلى `(dashboard)` بنفس المستأجر؛ `/pos/*` → `(pos)`؛ `/agent/*` → `(courier)`.

### US-47.2 — المتجر غير موجود أو موقوف (P1)
**Acceptance**:
1. **Given** أول استدعاء `GET /api/v1/config/` يعيد 404، **Then** تُعرض صفحة «لم نجد متجراً بهذا العنوان» (HTTP 404) بنص واحد ورابط «أنشئ متجرك على شروه» إلى `<base>/register`، بلا رسم توضيحي.
2. **Given** 403 (`is_active=false`)، **Then** تُعرض «هذا المتجر غير متاح حالياً» (HTTP 403) مع زر واتساب المنصة؛ لا تفاصيل داخلية.
3. **Given** 403 بسبب جلسة مرتبطة بمتجر آخر، **Then** يُمسح cookie الجلسة لهذا الأصل وتُعاد المحاولة مرة واحدة قبل عرض الخطأ.
4. **Given** صفحة 404/403، **Then** تُعاد بـ `noindex` وبدون تطبيق ثيم التاجر (zinc).

### US-47.3 — انتظار التجهيز (P1)
التاجر أنهى OTP في M02 ووصل إلى `mystore.<base>` بينما Django يعيد 503 + `Retry-After: 10`.
**Independent Test**: Mock يعيد 503 ثم `{status:'provisioning'}` ×3 ثم `{status:'ready', store_url, dashboard_url}` → الصفحة تنتقل آلياً إلى `dashboard_url`.
**Acceptance**:
1. **Given** استجابة 503 من `/api/v1/config/`، **Then** تُعرض صفحة انتظار (HTTP 503 + `Retry-After: 10`) بعنوان «جارٍ تجهيز متجرك» ومؤشر تقدّم غير محدد رفيع (1px) وخطوات نصية (إنشاء القاعدة · الإعدادات الأولية · التفعيل) بلا نسب مئوية مزيفة.
2. **Given** token موقَّع متاح (من M02 عبر cookie قصيرة العمر على `<base>` ثم تُمرَّر بالرابط `?t=` مرة واحدة وتُحفظ في sessionStorage)، **Then** تستطلع `GET /register/status/<token>/` كل 3 ثوانٍ (backoff حتى 10) وتتعامل مع `pending` · `provisioning` · `ready` · `failed`.
3. **Given** `ready`، **Then** يُعرض «تم إنشاء متجرك بنجاح» ثانيتَين ثم تحويل إلى `dashboard_url` (أو `store_url` للزائر).
4. **Given** `failed`، **Then** تُعرض «تعذّر تجهيز متجرك تلقائياً — سنتواصل معك» مع زر واتساب الدعم وإيقاف الاستطلاع.
5. **Given** زائر بلا token، **Then** يُستطلع `HEAD /api/v1/config/` كل 10 ثوانٍ حتى 200 ثم تحويل؛ بعد 5 دقائق تُعرض رسالة «يستغرق التجهيز وقتاً أطول من المعتاد».

### US-47.4 — BFF نفس الأصل للكوكيز وCSRF (P1)
**Acceptance**:
1. **Given** استدعاء من المتصفح إلى `/api/v1/cart/` على `mystore.<base>`، **Then** يمرّره Next (rewrite/route handler) إلى `API_INTERNAL_URL` مع `X-Store-Domain: mystore.<base>`, `X-Forwarded-Host`, `X-Real-IP`, وكل الكوكيز؛ ويعيد `Set-Cookie` كما هي (نفس الأصل → first-party).
2. **Given** تسجيل دخول التاجر (`POST /dashboard/login/`)، **Then** يُرسل `X-CSRFToken` من قيمة قرأها الخادم (RSC) من `Set-Cookie: csrftoken` لاستجابة GET سابقة، لأن `CSRF_COOKIE_HTTPONLY=True` يمنع قراءتها في المتصفح.
3. **Given** أي POST/PATCH/DELETE إلى API التاجر، **Then** يُرفق `X-CSRFToken` آلياً من `api-client`؛ 403 بسبب CSRF → تجديد التوكن وإعادة المحاولة مرة واحدة.
4. **Given** استجابة Django بـ `{detail}` أو `{field:[msg]}` أو 409/429/503، **Then** تمرّ بلا تحويل ليعالجها `api-client` الموحَّد.

### US-47.5 — عزل الكاش وملكية `/sw.js` (P1)
**Acceptance**:
1. **Given** متجران في نفس عملية Next، **Then** كل `fetch` خادمي يحمل وسم `store:<store>` وكل مفتاح TanStack Query يبدأ بـ `['store', <store>]`؛ إعادة التحقق لمتجر لا تلمس الآخر.
2. **Given** `/sw.js` و`/manifest.webmanifest` على أصل المتجر، **Then** يملكهما Next: الـ manifest يُولَّد من `/config/` (الاسم، الأيقونة، `theme_color` من `primary_color`)، والـ SW يعامل `/api/v1/cart*` و`/api/v1/config/` network-only، وبقية API network-first، والصور/الخطوط cache-first بمفتاح يتضمن الـ host؛ لا يُمرَّر `pwa_service_worker` من Django.
3. **Given** أصل المنصة `<base>`، **Then** لا يُسجَّل SW للمتجر؛ شروة باي (E-40) يحتفظ بـ SW مستقل بنطاق `/sharwa-pay/`.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-47.01**: `middleware.ts` MUST يحلّ المستأجر من `Host` فقط (لا من query ولا من cookie) ويعيد كتابة المسار إلى مجموعة المسار الصحيحة، ويُمرِّره عبر ترويسة داخلية تُقرأ بـ `headers()` في RSC.
- **FR-47.02**: الحلّ MUST يكون خالصاً (بلا I/O) في الـ middleware؛ التحقق من وجود المتجر وحالته يحدث عند أول `GET /api/v1/config/` في الـ layout ويُحوَّل إلى 404/403/503 بمكونات مخصصة.
- **FR-47.03**: قائمة المحجوزات وصيغة `^[a-z0-9]+$` MUST تعيش في `src/lib/tenant.ts` كمصدر واحد تستخدمه M01/M02 أيضاً.
- **FR-47.04**: كل استدعاءات `/api/*` من المتصفح MUST تمرّ عبر نفس الأصل؛ يُمنع استدعاء Django مباشرة من المتصفح (لا CORS cross-origin).
- **FR-47.05**: الـ BFF MUST يضيف `X-Store-Domain` تحت `/api/` فقط (حيث يحترمه Django) ويمرّر `Host` الأصلي للمسارات HTML المؤقتة (`/register/status/`, `/dashboard/login/`).
- **FR-47.06**: CSRF token MUST يُقرأ خادمياً ويُحقن في `<meta name="csrf-token">` أو كـ prop للـ `api-client`؛ يُمنع أي محاولة لقراءة `csrftoken` من `document.cookie`.
- **FR-47.07**: صفحة 503 MUST تعيد `Retry-After: 10` وتوقف أي prefetch/SW تسجيل حتى `ready`.
- **FR-47.08**: صفحات 404/403/503 الخاصة بالمستأجر MUST تُرسم بلوحة zinc بلا ثيم التاجر، بالعربية RTL، وبـ `noindex`.
- **FR-47.09**: كل مفاتيح الكاش (TanStack، `fetch` tags، `unstable_cache`) MUST تتضمن المستأجر؛ فحص lint مخصص يرفض مفتاحاً يبدأ بغيره داخل `(storefront)` و`(dashboard)`.
- **FR-47.10**: الوحدة MUST تدعم التطوير المحلي على `*.localhost:3000` (Chrome يحلّها بلا hosts) مع `TENANT_BASE_DOMAIN=localhost`.
- **FR-47.11**: الـ middleware MUST يُمرِّر الملفات الثابتة و`_next/*` بلا حلّ، ويُجيب `/robots.txt` و`/sitemap.xml` لكل متجر من بياناته.
- **FR-47.12**: الوحدة MUST تسجّل (خادمياً فقط) كل حلّ فاشل (host غير معروف) بلا بيانات شخصية لتغذية M20.

## 5. الكيانات والحالات (Key Entities & States)

- **TenantContext** (محلي): `store` (subdomain أو host مخصص), `kind` (`subdomain` · `custom_domain` · `platform` · `reserved`), `group` (`marketing` · `onboarding` · `storefront` · `dashboard` · `pos` · `courier` · `admin`).
- **Client** (Django): `name`, `schema_name`, `is_active`, `provisioning_status` (`pending` · `provisioning` · `ready` · `failed`), `provisioned_at`, `provisioning_error`. **Domain**: `domain`, `tenant`, `is_primary`.
- **ProvisioningStatus** (استجابة): `{status}` + `store_url`, `dashboard_url` عند `ready`. انتقالات العرض: 503 → انتظار → (`ready` → تحويل) | (`failed` → رسالة نهائية).
- **ResolutionOutcome**: `ok` · `not_found` (404) · `inactive` (403) · `session_bound_elsewhere` (403، إعادة محاولة واحدة) · `provisioning` (503).
- **CsrfToken**: قيمة خادمية قصيرة العمر مرتبطة بجلسة التاجر؛ حالات: غائب · صالح · مرفوض (تجديد).

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/_errors/store-not-found` (404) · `/_errors/store-inactive` (403) · `/_errors/store-provisioning` (503، مع `?t=` اختياري) — تُخدم من `(onboarding)` كتخطيط zinc مستقل بلا رأس متجر؛ لا مسارات أخرى مرئية (الـ middleware شفاف).
- **الحالات البصرية**: الانتظار (مؤشر غير محدد 1px + خطوات نصية + الزمن المنقضي Mono) · نجاح قصير قبل التحويل · فشل نهائي · «يستغرق وقتاً أطول» · 404 · 403 · خطأ شبكة في الاستطلاع (يستمر بصمت حتى 3 إخفاقات ثم يُظهر «تحقق من اتصالك»).
- **الجوال (390px)**: نفس الصفحات بعمود واحد؛ النص ≤ 25 كلمة لكل حالة؛ زر واتساب 44px.
- **اختصارات**: لا شيء؛ صفحات انتقالية.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| حلّ المستأجر من Host | `TenantMainMiddleware` → `tenants.Domain` | Ready (Next يوازيه محلياً للتوجيه فقط) |
| تجاوز الحلّ بالترويسة | `X-Store-Domain` تحت `/api/` فقط (404 مجهول، 403 موقوف/جلسة لمتجر آخر) | Ready |
| التحقق من وجود/حالة المتجر | `GET /api/v1/config/` → 200 / 404 / 403 / 503 | Ready (يُستخدم كمسبار) |
| حالة التجهيز | `GET /register/status/<token>/` → `{status, store_url?, dashboard_url?}` (JSON على URLConf عام) | Ready؛ يُنقل اختيارياً إلى `GET /api/v1/public/provisioning/<token>/` |
| حارس 503 | `TenantProvisioningGuardMiddleware` → 503 + `Retry-After: 10` | Ready |
| CSRF token للتاجر | `CSRF_COOKIE_HTTPONLY=True`، لا endpoint | `[NEEDS BACKEND]` → `GET /api/v1/auth/csrf/` → `{csrfToken}` (يضبط الكوكي أيضاً)؛ حتى توفره يقرأ الـ BFF `csrftoken` من `Set-Cookie` لاستجابة `GET /dashboard/login/` |
| النطاقات المخصصة | `Domain(is_primary)` admin-only | Ready للحلّ؛ إدارة التاجر → M19 `[NEEDS BACKEND]` |
| قائمة المحجوزات | `tenants/validators.py` (ثابتة) | تُنسخ كثابت في `src/lib/tenant.ts`؛ `GET /register/check-subdomain/` يبقى الحكم في M02 |
| manifest | `GET /manifest.webmanifest` Django | يُولَّد في Next من `/config/` — Ready |
| `/sw.js` | `pwa_service_worker` Django | قرار: Next يملك `/sw.js` على أصل المتجر؛ Django لا يُمرَّر |
| قياس تثبيت PWA | `POST /api/v1/pwa/install-event/` `source='nextjs_app'` | Ready |

## 8. الحالات الحدّية (Edge Cases)

- host بأحرف كبيرة أو منفذ (`MyStore.<base>:3000`): يُطبَّع إلى أحرف صغيرة ويُزال المنفذ قبل الحلّ.
- subdomain متعدد المستويات (`a.b.<base>`): لا يُطابق الصيغة → 404 المتجر.
- نطاق مخصص يشير إلى Next لكن Django لا يعرفه: 404 من `/config/` → صفحة «لم نجد متجراً» مع ملاحظة للمالك في console الخادم.
- `TENANT_BASE_DOMAIN` غائب في البيئة: فشل البناء برسالة واضحة، لا سقوط صامت إلى `localhost` في الإنتاج.
- 503 أثناء تصفّح مشترٍ لمتجر كان `ready` (إعادة تجهيز): تُعرض صفحة الانتظار بنص عام «المتجر قيد الصيانة» وتعاود الاستطلاع.
- token الحالة منتهٍ أو مزوَّر: الخادم يعيد 400/404 → السقوط إلى وضع الزائر (مسبار `/config/`).
- تبويب قديم بعد `ready`: الاستطلاع يتوقف ويُحوَّل عند `focus`.
- كوكي `sessionid` من أصل المنصة تتسرب إلى متجر (نفس الجهاز): Django يرفض بـ 403 «جلسة لمتجر آخر» → مسح وإعادة محاولة واحدة (US-47.2.3).
- طلبات `/api/` من بوت بلا `Host` صالح: 404 بلا رسم صفحة كاملة (استجابة JSON مختصرة).

## 9. معايير النجاح (Success Criteria)

- **SC-47.1**: 0 تسرب كاش بين متجرَين في اختبار يفتح 10 متاجر متناوبة في نفس العملية (مقارنة `store_name` في كل استجابة).
- **SC-47.2**: زمن الـ middleware ≤ 2ms (p95) لأنه خالص بلا I/O.
- **SC-47.3**: 100% من حالات 404/403/503 تُعرض بصفحة مخصصة بالعربية؛ 0 صفحات خطأ خام من Django أو Next.
- **SC-47.4**: التحويل بعد `ready` يحدث خلال ≤ 5 ثوانٍ من تغيّر الحالة في 95% من الحالات.
- **SC-47.5**: تسجيل دخول التاجر وإضافة إلى السلة يعملان على Safari iOS وChrome Android بلا إعدادات كوكيز خاصة (first-party فقط).
- **SC-47.6**: `?store=` أو أي معرّف مستأجر لا يظهر في أي رابط مرئي (فحص Playwright على 20 صفحة).

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M02 (مصدر token الحالة)، M01 (الجذر العام)، M03 (جلسة التاجر وCSRF)، M09/M11/M12 (مستهلكو الـ BFF)، E-44 (SW/manifest)، M19 (إدارة النطاقات لاحقاً)، M20 (سجل الفشل).
- افتراض: Super Admin يُخدم من `console.<base>` (محجوز) وليس من المنصة العامة؛ `admin.<base>` يُحوَّل إليه.
- افتراض: `API_INTERNAL_URL` يشير إلى Django داخلياً و`API_PROXY_URL` للبيئات المنفصلة؛ لا يُكشف أي منهما للمتصفح.
- افتراض: token الحالة يُمرَّر من `<base>/register` إلى `mystore.<base>` عبر `?t=` مرة واحدة ثم sessionStorage؛ لا يُحفظ في cookie عبر النطاقات.
- افتراض: الـ SW الخاص بالمتجر لا يكاش أي استجابة من `/api/v1/cart*` أو `/config/`؛ قرار نهائي وليس خياراً لكل متجر.
- افتراض: المسارات HTML المؤقتة (`/register/status/`, `/dashboard/login/`) تُمرَّر عبر الـ BFF حتى تتوفر بدائلها على `/api/v1`.
- افتراض: Django يرسل `Set-Cookie` بلا `Domain` صريح، فتلتصق بأصل المتجر الذي خدمها الـ BFF.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I (Anti-AI): صفحات 404/403/503 نص فقط بلا رسوم توضيحية أو «روبوت حزين»؛ مؤشر الانتظار خط 1px غير محدد؛ لا نسب مئوية مزيفة ولا كونفيتي عند `ready`.
- II (RTL): الصفحات الانتقالية `lang="ar" dir="rtl"`؛ الزمن المنقضي Mono؛ روابط النطاق (`mystore.sharwaah.com`) تُعرض LTR داخل `<span dir="ltr">`.
- IV (Visual check): لقطات `docs/visual-checks/47-tenant-guard/{desktop,mobile,mobile-dark}.png` للانتظار، النجاح، الفشل، 404، 403، واختبار Playwright يفتح متجرَين متناوبين ويقارن `store_name`.
- V: الـ BFF لا يُعيد تنفيذ منطق Django (الحلّ النهائي والحارس في الخادم)؛ Next يوازي الحلّ للتوجيه فقط.
- VIII (Tenant isolation): المستأجر من `Host` في `middleware.ts` ويُمرَّر كترويسة داخلية؛ ممنوع عبر query؛ مفاتيح الكاش مفتوحة بالمستأجر؛ مجموعات المسار معزولة بتخطيطاتها.
- IX (Budgets): middleware بلا I/O؛ Zod على `{status}` و`/config/`؛ `tsc --noEmit` يفشل إن غاب `TENANT_BASE_DOMAIN` من schema البيئة.
