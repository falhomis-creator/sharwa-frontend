# Research — Sharwa Frontend Platform (001)

**Date**: 2026-10-17 · **Input**: `spec.md` + 49 module specs + `specs/discovery/00..03` + `.specify/memory/constitution.md` v1.0.0 · **Verified against**: `node_modules/next/dist/docs/` (Next.js 16.4.2), shadcn CLI 4.22 registry (`npx shadcn view`), npm registry (2026-10-17).

كل بند أدناه قرار تقني واحد بصيغة **Decision / Rationale / Alternatives**. لا يبقى أي `NEEDS CLARIFICATION`.

---

## R-01 — إصدار Next.js وتسمية طبقة الطلبات (`proxy.ts` لا `middleware.ts`)

- **Decision**: Next.js **16.4.2** (المثبَّت) + React 19.3 + TypeScript 5 strict. طبقة ما-قبل-الطلب تُكتب في `src/proxy.ts` (الاسم الرسمي منذ Next 16؛ `middleware.ts` مهجور). كل ذكر لـ `middleware.ts` في المواصفات (M47، الدستور VIII) يُقرأ على أنه `proxy.ts` بنفس الوظيفة.
- **Rationale**: وثائق `01-getting-started/16-proxy.md`: «Starting with Next.js 16, Middleware is now called Proxy… functionality remains the same». ملف واحد فقط مسموح؛ المنطق يُجزَّأ في `src/lib/tenant.ts` ويُستورد.
- **Alternatives**: الإبقاء على `middleware.ts` (يعمل مع تحذير deprecation، يُكسر في الإصدار التالي) — مرفوض.

## R-02 — Cache Components والـ Partial Prefetching

- **Decision**: إبقاء `cacheComponents: true` و`partialPrefetching: true` (موجودان في `next.config.ts`). القاعدة: `'use cache'` + `cacheLife()` + `cacheTag('store:<store>')` **فقط** للقراءات العامة في مجموعة المتجر (`/api/v1/config/`, `/catalog/categories/`, `/catalog/products*`) وللمحتوى الثابت (الصفحة الترويجية). كل ما يعتمد على كوكي (السلة، جلسة التاجر، لوحة الإدارة) **غير مُكاش** ويُغلَّف بـ `<Suspense>` بهيكل skeleton.
- **Rationale**: `08-caching.md`: الدوال المكاشة تأخذ مفاتيحها من وسائطها → تمرير `store` كوسيط صريح يضمن عزل المستأجرين (الدستور VIII، M47 FR-47.09). `headers()`/`cookies()` غير متاحة داخل `'use cache'`، لذا يُحلّ المستأجر خارجها ويُمرَّر.
- **Alternatives**: تعطيل Cache Components والعودة لنموذج `fetch` cache القديم — يفقد الـ static shell للصفحة الترويجية وصفحات المتجر (SC-003 LCP).
- **Gotchas (مُكتشفة في Phase 2)**: (1) `export const dynamic = 'force-dynamic'` **مرفوض** مع `cacheComponents` — الـ Route Handlers التي تقرأ الطلب ديناميكية تلقائياً؛ (2) Next يعيد توجيه `/api/v1/config/` إلى بلا شرطة بـ 308 افتراضياً، لذا ضُبط `skipTrailingSlashRedirect: true` ليصل مسار Django كما هو إلى الـ BFF.

## R-03 — حلّ المستأجر وإعادة كتابة المسار

- **Decision**: `src/proxy.ts` خالص بلا I/O (SC-47.2 ≤ 2ms):
  1. يُطبِّع `Host` (أحرف صغيرة، حذف المنفذ).
  2. يصنّفه عبر `resolveTenant(host)` من `src/lib/tenant.ts` إلى `platform` · `reserved` · `subdomain` · `custom_domain`.
  3. يعيد الكتابة داخلياً:

  | Host | المسار الوارد | إعادة الكتابة إلى | مجموعة المسار |
  |---|---|---|---|
  | `<base>` / `www.<base>` | `/`, `/register/*`, `/login`, `/sharwa-pay/*` | كما هو | `(marketing)`, `(onboarding)`, `(pay)` |
  | `console.<base>` (و`admin.<base>` → redirect) | `/*` | `/_a/*` | `(admin)/_a` |
  | `<store>.<base>` أو نطاق مخصص | `/dashboard/*` | `/_d/<store>/dashboard/*` | `(dashboard)/_d/[store]` |
  | نفسه | `/pos/*` | `/_p/<store>/pos/*` | `(pos)/_p/[store]` |
  | نفسه | `/agent/*` | `/_c/<store>/agent/*` | `(courier)/_c/[store]` |
  | نفسه | أي مسار آخر | `/_s/<store>/*` | `(storefront)/_s/[store]` |
  | أي host | `/_s/*`, `/_d/*`, `/_p/*`, `/_c/*`, `/_a/*` مباشرةً من المتصفح | 404 | — |
  | أي host | `/_next/*`, `/api/*`, ملفات `public/` | يمرّ بلا حلّ (matcher) | — |

  المستأجر يُمرَّر أيضاً كترويسة داخلية `x-sharwa-store` (تُقرأ بـ `headers()` في RSC خارج الكاش) و**ليس** في query string أبداً.
- **Rationale**: بادئات `_s/_d/_p/_c/_a` تمنع تصادم `[store]` الديناميكي مع مسارات المنصة الثابتة (`/register`) وتمنع وصول المستخدم إلى الشكل الداخلي للرابط (SC-47.6)؛ هذا هو نمط Vercel Platforms Starter الذي تستشهد به M47. وضع `[store]` في المسار (لا الترويسة فقط) يجعله وسيطاً صريحاً للدوال المكاشة (R-02).
- **Alternatives**: الاعتماد على الترويسة وحدها (يكسر `'use cache'`)؛ تطبيقات Next منفصلة لكل مجموعة (multi-zones) — تعقيد تشغيلي بلا حاجة في الإصدار الأول.
- **Dev**: `TENANT_BASE_DOMAIN=localhost` و`*.localhost:3000` (Chrome وEdge يحلّانها بلا `hosts`).

## R-04 — الـ BFF نفس الأصل (الكوكيز وCSRF)

- **Decision**: Route Handlers لا `rewrites`:
  - `src/app/api/v1/[...path]/route.ts`: تمرير شفاف إلى `${API_INTERNAL_URL}/api/v1/<path>` مع: كل كوكيز المتصفح، `X-Store-Domain: <store-host>` (Django يحترمها تحت `/api/` فقط)، `X-Forwarded-Host`, `X-Real-IP`؛ وإعادة `Set-Cookie` كما هي (first-party). الطرق غير الآمنة تُرفق `X-CSRFToken` من القيمة التي قرأها الخادم.
  - `src/app/api/bff/**/route.ts`: محوّلات Next-owned للمسارات HTML/JSON القديمة على Django (`/register/check-subdomain/`, `/register/status/<token>/`, `/dashboard/login/`…) **ولكل عقد `[NEEDS BACKEND]`**: الـ handler يخدم من `src/mocks/` بنفس الشكل المقترح في §7 ويضيف ترويسة `x-sharwa-mock: 1`؛ حين يتوفر الـ endpoint الحقيقي يُستبدل جسم الـ handler بتمرير دون تغيير العقد أو الواجهة.
  - رمز CSRF: يُجلب خادمياً (RSC) من `Set-Cookie: csrftoken` لاستجابة `GET /dashboard/login/` عبر الـ BFF (حتى يتوفر `GET /api/v1/auth/csrf/`) ويُحقن كـ prop إلى `ApiClientProvider`؛ **يُمنع** `document.cookie` (الكوكي `HttpOnly`).
- **Rationale**: `rewrites` لا تستطيع حساب ترويسة لكل طلب من الـ Host ولا التقاط `Set-Cookie` لقراءة CSRF؛ `02-guides/backend-for-frontend.md` يعتمد Route Handlers لهذا النمط. نفس الأصل يُغني عن CORS و`SameSite=None` (SC-47.5 على Safari iOS).
- **Alternatives**: `next.config` rewrites (كما في الـ PoC القديم) — لا تحقق FR-47.05/06؛ استدعاء Django مباشرة من المتصفح — ممنوع (FR-47.04).

## R-05 — shadcn/ui (base-nova) وRTL

- **Decision**: `components.json` → `"rtl": true` (CLI 4.22 يدعم `--rtl` ويولّد خصائص منطقية `ps-/pe-/ms-/me-`). المكوّن الوحيد المولَّد حالياً (`button.tsx`) يحوي `pr-2`/`pl-2` فيزيائية → يُعاد توليده بعد التبديل. كل مكوّن يُضاف بـ `npx shadcn@latest add <name>` ثم يُراجع لـ RTL والرموز قبل الاعتماد (الدستور II).
- **Rationale**: base-nova مبني على `@base-ui/react` (موجود) ويلتزم بالرموز في `globals.css`؛ العلم `rtl` هو الطريقة الرسمية لتوليد فئات منطقية.
- **Alternatives**: تعديل يدوي لكل مكوّن — هشّ ويتكرر عند كل `add`.

## R-06 — الحزم المتبقية (الترسانة المعتمدة في الدستور)

| الحاجة | الحزمة | الإصدار (2026-10-17) | ملاحظة |
|---|---|---|---|
| حالة الخادم | `@tanstack/react-query` | ^5.104 | مفاتيح تبدأ بـ `['store', store]` |
| جداول | `@tanstack/react-table` | **^8** (أحدث 8.x) | الدستور يعتمد v8؛ v9.3 موجود ويُقيَّم لاحقاً بتعديل دستوري |
| حالة لحظية | `zustand` | ^5.0 | سلة، لوحة الأوامر، سحب/إفلات |
| تحقق | `zod` | ^4.6 | شِيمات كل استجابة API (`src/features/*/schemas`) |
| نماذج | `react-hook-form` + `@hookform/resolvers` | ^7.90 / ^5.9 | resolver Zod v4 |
| حالة الرابط | `nuqs` | ^2.10 | `NuqsAdapter` لـ App Router |
| تنبيهات | `sonner` + `next-themes` | ^2.0 / ^0.4 | عبر `npx shadcn add sonner` (يسحبهما) |
| لوحة أوامر | `cmdk` | ^1.1 | عبر `npx shadcn add command` |
| قوائم سفلية | **shadcn `drawer` (Base UI)** | — | بديل Vaul؛ انظر Complexity Tracking في `plan.md` |
| حركة | `motion` | ^14.3 | `motion/react` + `useReducedMotion` |
| سحب/إفلات | `@dnd-kit/core` + `@dnd-kit/sortable` | ^6.3 / ^10.0 | ترتيب الأقسام/الصور/الحالات |
| رسوم | `recharts` | ^3.10 | أحادية اللون؛ Tremor لاحقاً عند الحاجة |
| بيئة | `@t3-oss/env-nextjs` | ^0.13 | يفشل البناء إن غاب `TENANT_BASE_DOMAIN` |
| خادم فقط | `server-only` | 0.0.1 | حراسة ملفات الـ BFF |
| فحص بصري | `@playwright/test` (dev) | ^1.64 | `scripts/visual-check.ts` للقطات الثلاث + داكن |

- **Decision**: تثبيت ما سبق الآن (مرحلة التأسيس) مع `legacy-peer-deps=true` في `.npmrc` لأن `@hookform/resolvers@5.9` يحمل peer **اختيارياً** (`@typeschema/zod`) يطلب Zod 3 بينما المشروع على Zod 4 (المسار المستعمل هو `zodResolver` المباشر الداعم لـ Zod 4)؛ Aceternity/Magic UI **لا تُثبَّت كحزمة** بل تُنسخ مكوّناتها عند الحاجة ويُعاد تلوينها بالرموز (الدستور VII).
- **Alternatives**: Jotai بدل Zustand، SWR بدل TanStack Query — خارج الترسانة المعتمدة.

## R-07 — الخطوط

- **Decision** (مُحدَّث 2026-10-17 أثناء Phase 1): `next/font/local` بملفات مُستضافة ذاتياً في `src/assets/fonts/`: IBM Plex Sans Arabic 400/500/600 (ملف كامل الحروف لكل وزن) و Geist Mono متغير 100–900، `display: 'swap'`, المتغيران `--font-ibm-plex-arabic` و`--font-geist-mono` يغذيان `--font-sans`/`--font-mono` في `globals.css`. الأرقام المالية/المعرّفات عبر `font-mono tabular-nums` حصراً (مكوّن `<Money>`/`<Mono>`).
- **Rationale**: الخطة الأصلية كانت `next/font/google`؛ لكن في `next dev` يطبّق محمّل Google مهلة صلبة 3 ثوانٍ لكل ملف (`fetch-resource.js`)، ومع 18 ملف subset متزامناً من هذه الشبكة فشل التحميل («Module not found: @vercel/turbopack-next/internal/font/google/font») رغم أن `curl` ينجح في ~1s. الاستضافة الذاتية حتمية في dev وCI وتعمل بلا شبكة؛ الترخيص OFL 1.1 (موثَّق في `src/assets/fonts/README.md`). يحقق الدستور II وIX (`next/font` + swap).
- **Alternatives**: `next/font/google` (مرفوض للسبب أعلاه)؛ `@font-face` يدوي في CSS (يفقد تحسينات `next/font` لإزاحة التخطيط).

## R-08 — الرموز التصميمية

- **Decision**: إعادة كتابة `:root`/`.dark` في `src/app/globals.css` بقيم الدستور حرفياً: `--background #FAFAFA`/`#09090B`, `--foreground` معكوسهما, `--border` zinc-200/zinc-800, `--muted-foreground` zinc-500, `--radius: 0.5rem`, ألوان دلالية `--success emerald-600`, `--warning amber-600`, `--destructive red-600`, `--info sky-600`؛ حذف `--sidebar-primary` البنفسجي الحالي في `.dark`. ثيم المتجر يُطبَّق بتجاوز نفس المتغيرات على جذر `(storefront)/_s/[store]/layout.tsx` عبر `style={{'--primary': …}}` مشتقة من `brand_shades` في `/config/`.
- **Rationale**: الدستور I/VII؛ القيم الحالية (oklch رمادي + `--radius 0.625rem` + sidebar بنفسجي) تخالفه.
- **Alternatives**: الاحتفاظ بـ oklch neutral — قريب لكن ليس القيم المعتمدة.

## R-09 — الوضع الداكن والثيم

- **Decision**: `next-themes` بـ `attribute="class"`, `defaultTheme="system"`, `enableSystem` في جذر `(marketing)`, `(dashboard)`, `(admin)`؛ مجموعة `(storefront)` **لا** تُفعّل الوضع الداكن إلا إذا اختاره التاجر (حالة مستقبلية في M08)، فتُثبَّت `forcedTheme="light"` هناك مع ألوان التاجر.
- **Rationale**: Edge case في `spec.md` («ثيم المتجر يبقى بألوان التاجر»).

## R-10 — إدارة الحالة والنماذج والقوائم

- **Decision**: TanStack Query لكل بيانات الخادم بـ `QueryClientProvider` واحد لكل مجموعة مسار ومفاتيح `['store', store, 'orders', filters]`؛ Zustand للسلة الجانبية/لوحة الأوامر/السحب؛ `nuqs` لكل فلتر/بحث/ترقيم (FR-010)؛ RHF + Zod للنماذج مع تسمية فوق الحقل ورسائل تحت الحقل.
- **Rationale**: الدستور IX؛ `nuqs` يحقق «الرابط القابل للمشاركة».

## R-11 — المحتوى والترجمة

- **Decision**: عربي RTL فقط في الإصدار الأول (`<html lang="ar" dir="rtl">` في الجذر). كل نص واجهة في ملفات بيانات `src/features/<module>/<module>.content.ts` (M01 FR-01.04). الإنجليزية لاحقاً عبر `dir` ديناميكي ونفس المكوّنات (لا تفرّع).
- **Alternatives**: `next-intl` الآن — عبء بلا ترجمة متاحة؛ يُؤجَّل.

## R-12 — الفحص البصري والجودة

- **Decision**: (أ) Playwright MCP للفحص التفاعلي أثناء التنفيذ؛ (ب) `scripts/visual-check.ts` بـ `@playwright/test` يلتقط `docs/visual-checks/<NN>-<slug>/{desktop,tablet,mobile,desktop-dark}.png` بالمقاسات 1440×900 / 768×1024 / 390×844 ويفشل عند أي خطأ console أو تحذير hydration أو تمرير أفقي (`document.scrollingElement.scrollWidth > clientWidth`); (ج) `npm run lint` + `tsc --noEmit` قبل أي وسم `*-after`؛ (د) قواعد ESLint مخصصة (`no-restricted-syntax`) ترفض الفئات الفيزيائية (`\b(ml|mr|pl|pr|left|right|text-left|text-right)-`) وقيم hex/oklch خام في `className`/`style` خارج `globals.css`.
- **Rationale**: الدستور IV, IX؛ M47 FR-47.09 (فحص مفاتيح الكاش يُضاف كمهمة لاحقة).
- **Alternatives**: Vitest/RTL للوحدات — اختياري وغير مطلوب في المواصفة؛ يُضاف عند أول منطق غير بصري معقد (محرك الفاتورة محلي؟ لا — الفاتورة خادمية).

## R-13 — المال والأرقام والتواريخ

- **Decision**: لا تنسيق عملة في العميل إطلاقاً؛ يُعرض `display_*` كما يصل داخل `<Money value="1,250.00 ر.س" />` (`font-mono tabular-nums`, `dir="ltr"` للرقم داخل سياق RTL). التواريخ عبر `Intl.DateTimeFormat('ar', {numberingSystem:'latn'})` في `src/lib/format.ts`.
- **Rationale**: FR-007 والـ discovery 03 §9.5.

## R-14 — أخطاء الـ API الموحَّدة

- **Decision**: `src/lib/api-client.ts` يحوّل كل استجابة غير 2xx إلى `ApiError{status, detail?, fields?, retryAfter?}` من الأشكال `{detail}` / `{field:[msg]}`؛ خرائط خاصة: 401 → إعادة توجيه لتسجيل الدخول، 403 CSRF → تجديد وإعادة محاولة مرة، 409 → مكوّن «تعارض نسخة» مع إعادة تحميل، 429 → `Retry-After`, 503 → صفحة التجهيز (M47). كل الرسائل عربية في مكانها (FR-009).

## R-15 — الفرع والنقاط الاستعادية

- **Decision**: العمل يبقى على `master` (الفرع الحالي؛ لا يوجد فرع `001-sharwa-frontend-platform`؛ `setup_plan.py` اشتق الاسم من مجلد المواصفة). نقاط الاستعادة عبر وسوم `rp/NN-<slug>-before|after` حسب الدستور III وتُسجَّل في `.specify/memory/restore-points.md`.
- **Rationale**: الدستور لا يفرض فرع ميزة؛ الوسوم هي آلية التراجع المعتمدة («استعادة»).

## R-16 — ملكية `/sw.js` والـ manifest

- **Decision**: Next يملك `src/app/(storefront)/_s/[store]/manifest.webmanifest/route.ts` و`public`-free SW مولَّد عبر route `sw.js` على أصل المتجر (network-only لـ `/api/v1/cart*` و`/config/`؛ network-first لباقي API؛ cache-first للصور/الخطوط بمفتاح يتضمن الـ host). شروة باي (`(pay)`) بـ SW مستقل تحت `/sharwa-pay/`. لا يُمرَّر `pwa_service_worker` من Django.
- **Rationale**: M47 US-47.5، M44، M40.
