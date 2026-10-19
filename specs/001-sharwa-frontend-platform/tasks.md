---

description: "Task list — Sharwa Frontend Platform (001)"
---

# Tasks: Sharwa Frontend Platform — منصة «شروه»

**Input**: Design documents from `specs/001-sharwa-frontend-platform/` (plan.md, research.md, data-model.md, contracts/, quickstart.md, spec.md + modules/M01..M49)

**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/ ✅ · constitution v1.0.0 ✅

**Tests**: لم تُطلب اختبارات وحدات في المواصفة. بوابة الجودة لكل مرحلة = `npm run lint` + `tsc --noEmit` + فحص بصري Playwright (3 مقاسات + داكن) + وسمَا استعادة (الدستور III/IV/IX). تُدرَج هذه كمهام صريحة في نهاية كل مرحلة.

**Organization**: مرحلة تأسيس → مرحلة أساسيات مشتركة → قصص المستخدم الخمس من `spec.md` بترتيب أولويتها. US1 (P1) مقسّمة إلى 5 أجزاء تنفيذية لأنها تغطي 8 وحدات؛ **الجزء 3A (M01 الصفحة الترويجية) هو «المهمة 1» لـ `/speckit-implement 1`**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: قابلة للتوازي (ملفات مختلفة، بلا اعتماد على مهمة غير منجزة)
- **[Story]**: US1…US5 حسب `spec.md`
- كل مهمة تذكر المسار الفعلي للملف

## Path Conventions

مشروع Next.js واحد: `src/app/(group)/…` للمسارات، `src/features/<module>/{components,hooks,api,schemas,<module>.content.ts}` لمنطق الوحدات، `src/components/{ui,shared}`، `src/lib`، `src/mocks/<module>`، `src/stores`، `scripts/`, `docs/visual-checks/<NN>-<slug>/`. البادئات الداخلية `_s/_d/_p/_c/_a` حسب research R-03.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: رموز التصميم، الخطوط، RTL، البيئة، أدوات الجودة. **Restore tags**: `rp/01-foundation-before` → `rp/01-foundation-after`.

- [X] T001 وسم الاستعادة `rp/01-foundation-before` (commit الحالة ثم `git tag -a`) وتسجيله في `.specify/memory/restore-points.md`
- [X] T002 إعادة كتابة رموز التصميم في `src/app/globals.css`: `:root` و`.dark` بقيم الدستور حرفياً (`--background #FAFAFA/#09090B`, `--foreground` معكوسهما, `--border` zinc-200/zinc-800, `--muted-foreground` zinc-500, `--radius: 0.5rem`, ألوان دلالية `--success emerald-600`, `--warning amber-600`, `--destructive red-600`, `--info sky-600` + `--color-*` في `@theme inline`)؛ حذف `--sidebar-primary` البنفسجي؛ `--font-sans: var(--font-ibm-plex-arabic)`, `--font-mono: var(--font-geist-mono)`؛ `html{font-family: var(--font-sans)}` و`.font-mono{font-feature-settings:"tnum"}`
- [X] T003 [P] الخطوط والجذر في `src/app/layout.tsx`: `IBM_Plex_Sans_Arabic` (400/500/600, subsets arabic+latin, swap, `--font-ibm-plex-arabic`) + `Geist_Mono` (`--font-geist-mono`)؛ `<html lang="ar" dir="rtl" suppressHydrationWarning>`؛ `ThemeProvider` من `next-themes` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`)؛ metadata افتراضية (`metadataBase` من `NEXT_PUBLIC_TENANT_BASE_DOMAIN`)
- [X] T004 [P] مخطط البيئة في `src/env.ts` بـ `@t3-oss/env-nextjs` + Zod: `TENANT_BASE_DOMAIN` (required), `API_INTERNAL_URL` (url, required), `API_PROXY_URL?` (url), `SHARWA_MOCKS` (`'on'|'off'`, default `on` في dev / `off` في prod), `NEXT_PUBLIC_TENANT_BASE_DOMAIN`, `NEXT_PUBLIC_PLATFORM_WHATSAPP`; ملف `.env.example` بنفس المفاتيح؛ استيراده في `next.config.ts` ليفشل البناء مبكراً
- [X] T005 [P] قواعد ESLint في `eslint.config.mjs`: `no-restricted-syntax` على `Literal`/`TemplateElement` داخل `JSXAttribute[name.name="className"]` ترفض `\b(ml|mr|pl|pr|left|right|text-left|text-right|rounded-l|rounded-r|border-l|border-r)-`؛ ترفض `#[0-9a-fA-F]{3,8}\b` و`oklch\(` في `*.tsx` خارج `src/app/globals.css`؛ `no-restricted-imports`: `src/app/(storefront)/**` و`src/features/storefront*/**` لا تستورد من `src/features/dashboard*/**` وبالعكس؛ قاعدة `@typescript-eslint/no-explicit-any: error`
- [X] T006 [P] مكوّنات shadcn الأساسية (rtl=true): `npx shadcn@latest add input label separator skeleton sheet drawer dialog badge tabs accordion sonner tooltip --yes` ثم مراجعة كل ملف في `src/components/ui/` لعدم وجود فئات فيزيائية أو hex خام (grep) وضبط `--radius` تلقائياً من الرموز
- [X] T007 [P] سكربت الفحص البصري `scripts/visual-check.ts` بـ `@playwright/test` (CLI: `--slug <NN-slug> --url <url> [--dark]`): يلتقط `desktop 1440×900`, `tablet 768×1024`, `mobile 390×844`, `desktop-dark` (emulate `prefers-color-scheme: dark` + class) إلى `docs/visual-checks/<slug>/*.png`؛ يفشل (exit 1) عند أي `console.error`/`warning` يحوي `hydration`، أو `document.scrollingElement.scrollWidth > clientWidth` على أي مقاس، أو عنصر تفاعلي < 44px على mobile؛ سكربت npm `"visual-check": "npx tsx scripts/visual-check.ts"` (إضافة `tsx` dev-dep)؛ `docs/visual-checks/.gitkeep`
- [X] T008 [P] تنظيف القالب: حذف `public/{next,vercel,file,globe,window}.svg`؛ استبدال `src/app/page.tsx` بصفحة مؤقتة نصية؛ تحديث `README.md` بأوامر quickstart §2–§4؛ تحديث `.gitignore` بـ `docs/visual-checks/**/*.tmp.png` و`playwright-report/` و`test-results/`
- [X] T009 بوابة الجودة: `npm run lint` + `npx tsc --noEmit` + `npm run visual-check -- --slug 01-foundation --url http://localhost:3000/` ثم commit + `rp/01-foundation-after` + سطر في `restore-points.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: حلّ المستأجر، BFF، عميل API، المزوّدون، المكوّنات المشتركة، نظام الـ mocks. **Restore tags**: `rp/02-core-before` → `rp/02-core-after`.

**⚠️ CRITICAL**: لا تبدأ أي قصة مستخدم قبل اكتمال هذه المرحلة.

- [X] T010 وسم `rp/02-core-before`
- [X] T011 [P] `src/lib/tenant.ts` (خالص، بلا I/O): `RESERVED_SUBDOMAINS` (الـ 23 حرفياً من discovery 01 §1), `SUBDOMAIN_RE = /^[a-z0-9]+$/`, `normalizeHost(host)` (lowercase + strip port), `resolveTenant(host, base): TenantContext` (`platform|reserved|subdomain|custom_domain` + `group` + `storeHost`), `buildStoreUrl(sub, base, proto)`, `internalPrefixFor(group)` (`_s|_d|_p|_c|_a`); أنواع `TenantContext` من data-model §1
- [X] T012 `src/proxy.ts` (يعتمد T011): `config.matcher` يستثني `_next/*`, `api/*`, الملفات الثابتة؛ يرفض `/_s|/_d|/_p|/_c|/_a` الواردة من الشبكة بـ 404؛ جدول إعادة الكتابة R-03 (`/dashboard/*→/_d/<store>/dashboard/*`, `/pos/*→/_p/…`, `/agent/*→/_c/…`, باقي مسارات المتجر→`/_s/<store>/*`, `console.<base>`→`/_a/*`, `admin.<base>`→308 إلى console)؛ يضع ترويسة طلب `x-sharwa-store`؛ مسارات المنصة تمرّ كما هي
- [X] T013 [P] `src/lib/api-error.ts`: صنف `ApiError{status, detail?, fields?, retryAfter?, isMock}` + `parseApiError(res)` من `{detail}`/`{field:[msg]}`/`Retry-After` (contracts/bff-cross-cutting §4)
- [X] T014 [P] `src/lib/bff/upstream.ts` (`import 'server-only'`): `upstreamFetch(path, init, {storeHost, csrfToken?})` يبني `${API_PROXY_URL ?? API_INTERNAL_URL}${path}`، ينسخ الكوكيز والترويسات المسموحة، يضيف `X-Store-Domain`/`X-Forwarded-Host`/`X-Forwarded-Proto`/`X-Real-IP`، يحقن `X-CSRFToken` للطرق غير الآمنة؛ `forwardResponse(res)` يعيد الجسم stream مع `Set-Cookie`/`Retry-After`/`Content-Type` كما هي
- [X] T015 `src/app/api/v1/[...path]/route.ts` (يعتمد T014): GET/POST/PUT/PATCH/DELETE تمرير شفاف لكل `/api/v1/*`؛ `export const dynamic = 'force-dynamic'`؛ لا كاش، لا تحويل
- [X] T016 [P] نظام الـ mocks في `src/mocks/runtime.ts`: `mockResponse(data, {status, delay})` يضيف `x-sharwa-mock: 1`؛ `isMocksOn()` من `env.SHARWA_MOCKS`؛ `notAvailable()` → 501 `{detail:'غير متاح بعد'}` حين `off`؛ مولّد fixtures عربي ثابت (seeded) في `src/mocks/_fixtures.ts` (أسماء، هواتف `9677…`, `display_price` بصيغة `1,250.00 ر.س`)
- [X] T017 [P] `src/lib/api-client.ts` (client + server): `apiFetch<T>(path, schema: ZodType<T>, init)` نحو نفس الأصل (`/api/v1/*` أو `/api/bff/*`) مع `credentials:'include'`، تحقق Zod، تحويل الأخطاء إلى `ApiError`، إعادة محاولة واحدة عند 403 CSRF عبر `refreshCsrf()`؛ `ApiClientProvider` (client) يحمل `csrfToken` من prop خادمي؛ لا قراءة لـ `document.cookie`
- [X] T018 [P] `src/lib/query-keys.ts` (`storeKey(store, ...parts)` → `['store', store, ...parts]`) + `src/lib/cache.ts` (`storeTag(store)` → `store:<store>`) + `src/components/providers/query-provider.tsx` (`QueryClientProvider` + `NuqsAdapter` من `nuqs/adapters/next/app`; defaults `staleTime 30s`, `retry 1`)
- [X] T019 [P] `src/lib/format.ts`: `formatDate(iso, {timeZone})` بـ `Intl.DateTimeFormat('ar',{numberingSystem:'latn'})`, `formatRelative`, `normalizePhone` (0770… → 967770…), `maskPhone`; **بلا** أي تنسيق عملة
- [X] T020 [P] `src/lib/access.ts`: `FEATURE_KEYS` (39) و`PERMISSION_KEYS` (35) حرفياً من data-model §1، أنواع `FeatureKey`/`PermissionKey`, `hasFeature(session, key)`, `hasPermission(session, key)`
- [X] T021 [P] المكوّنات المشتركة في `src/components/shared/`: `money.tsx` (`<Money value: string>` → `font-mono tabular-nums` + `dir="ltr"`), `mono.tsx`, `empty-state.tsx` (نص + إجراء، بلا رسم), `error-state.tsx` (رسالة عربية + إعادة محاولة, يقبل `ApiError`), `page-header.tsx`, `visually-hidden.tsx`, `ltr.tsx` (`<span dir="ltr">` للأرقام/النطاقات)
- [X] T022 [P] `src/components/shared/mock-indicator.tsx`: شريط 1px أمبر + نص «بيانات تجريبية» يظهر فقط في dev حين تحمل استجابة `x-sharwa-mock`؛ يُقرأ عبر `apiFetch` (يضبط علم في Zustand `src/stores/dev-flags.ts`)
- [X] T023 [P] شِيمات مشتركة في `src/lib/schemas/`: `pagination.ts` (`paginated(schema)`), `money.ts` (`displayString`), `provisioning.ts` (`ProvisioningStatusSchema` من data-model §1), `store-config.ts` (`StoreConfigSchema` من contracts/ready-api-v1 #1 بالحقول الجاهزة + الموسّعة اختيارية)
- [X] T024 [P] `src/app/api/bff/README.md` (اتفاق المسارات `/api/bff/<module>/<resource>` + وضعا `legacy|mock`) + handler نموذجي `src/app/api/bff/public/check-subdomain/route.ts` بوضع `legacy` (يمرّر إلى `${API}/register/check-subdomain/?subdomain=` ويعيد `{available, reason}`) مع سقوط إلى mock (`src/mocks/public/check-subdomain.ts`: محجوز/مستخدم لـ `demo`,`shop`, متاح لغيرها) حين `SHARWA_MOCKS=on` والخادم غير متاح
- [X] T025 نقل مولّد الفهرس إلى `.specify/scripts/python/gen_contracts_inventory.py` (من scratchpad) وتوثيقه في `contracts/README.md`
- [X] T026 بوابة الجودة: lint + tsc + فحص يدوي بـ Playwright MCP: `localhost:3000/_s/x` → 404، `noor.localhost:3000/_d/demo/dashboard` → 404 من الشبكة، ترويسة `x-sharwa-store` تصل (صفحة debug مؤقتة تُحذف)؛ commit + `rp/02-core-after` + `restore-points.md`

**Checkpoint**: الأساس جاهز — يمكن بدء قصص المستخدم.

---

## Phase 3: User Story 1 — التاجر يُطلق متجره ويبيع أول طلب (Priority: P1) 🎯 MVP

**Goal**: من `/` إلى أول طلب «مكتمل»: M01 → M47/M03 → M02 → M04/M05/M06 (+M48/M49 الأساسي) → M34.

**Independent Test**: السيناريو الكامل على بيئة mocks في ≤ 10 دقائق، لقطات على 3 مقاسات لكل وحدة، صفر تمرير أفقي، صفر أخطاء console.

### 3A — M01 الصفحة الترويجية (**المهمة 1** · `rp/03-landing-before|after`)

- [X] T027 [US1] وسم `rp/03-landing-before`
- [X] T028 [P] [US1] محتوى الصفحة في `src/features/landing/landing.content.ts` (FR-01.04): `hero{title ≤ 9 كلمات, subtitle ≤ 25 كلمة, cta:'ابدأ متجرك'}`, `proofStats[3]{label, value, unit, source:'static-2026-10'}` (قيم ثابتة مُعلَّمة حتى `GET /api/v1/public/stats/`), `capabilities[7]{key, title, body, size, preview}` بأحجام `8/4 · 4/4/4 · 6/6` (لا صفّان متتاليان متماثلان), `howItWorks[3]{num:'01|02|03', title, body}`, `faqs[6]{q, a}`, `footer{columns[], legal}`, `nav[]`; نصوص أفعال ملموسة فقط (FR-01.10) — ممنوع «أطلق العنان/ثورة/✨»
- [X] T029 [P] [US1] شِيمات وعقود الخطط في `src/features/landing/schemas/plans.ts`: `PublicPlanSchema` (`code, name, is_free, price: string, currency: 'SAR'|'USD'|'YER_OLD'|'YER_NEW', billing_interval: 'monthly'|'yearly'|'lifetime', max_products: number|null, max_orders_per_month: number|null, features: string[]`), `PublicPlansResponseSchema{ subscriptions_enabled: boolean, plans: PublicPlan[] }`; mock `src/mocks/public/plans.ts` (الحالة الفعلية: `subscriptions_enabled:false`, خطة مجانية واحدة `is_default_free`) + handler `src/app/api/bff/public/plans/route.ts` (mock) + دالة خادمية `getPublicPlans()` في `src/features/landing/api/plans.ts` بـ `'use cache'` + `cacheLife('hours')`
- [X] T030 [P] [US1] `src/features/landing/schemas/stats.ts` + mock `src/mocks/public/stats.ts` (`{stores, orders_30d}`) + handler `src/app/api/bff/public/stats/route.ts`؛ `getProofStats()` يسقط إلى قيم المحتوى الثابتة عند الفشل (بلا رسالة للزائر، `console.info` خادمي فقط)
- [X] T031 [US1] تخطيط المجموعة `src/app/(marketing)/layout.tsx`: `QueryProvider`, `Toaster` (Sonner, `position="bottom-left"` ↔ bottom-start في RTL، `richColors=false`), حاوية `max-w-6xl`, `<SkipLink>`, تذييل مشترك؛ metadata: `title.template '%s · شروه'`, `description`, `openGraph{locale:'ar_SA', type:'website'}`, `alternates.canonical`
- [X] T032 [P] [US1] الرأس `src/features/landing/components/site-header.tsx` (client): شعار نصي «شروه» (Mono للـ wordmark الإنجليزي `sharwa` بـ `dir="ltr"`), روابط `#capabilities #pricing #faq`, «دخول التاجر» → `/login`, زر «ابدأ متجرك» → `#start`; ثابت `sticky top-0`, شفاف → `bg-background/95 border-b` بعد 8px تمرير (IntersectionObserver على sentinel, لا scroll listener); على `< md` زر قائمة يفتح shadcn `drawer` من الأسفل بروابط 44px؛ `aria-label` لكل أيقونة Lucide
- [X] T033 [P] [US1] نموذج البدء `src/features/landing/components/start-form.tsx` (client, RHF + Zod): حقل «اسم المتجر» (3–100 حرف، يقبل العربية والمسافات) + زر «ابدأ متجرك» بارتفاع 48px؛ حالات: افتراضي / خطأ تحقق تحت الحقل بـ `text-destructive` / جارٍ التحويل (`aria-busy`); عند الإرسال `router.push('/register?store_name=' + encodeURIComponent(name))` (عقد M02 US-02.1: معامل `store_name`)؛ `autoComplete="organization"`, `inputMode="text"`, `enterKeyHint="go"`
- [X] T034 [P] [US1] Hero `src/features/landing/components/hero.tsx` (RSC): شبكة 12 عموداً غير مركزية: العنوان `text-5xl md:text-6xl font-semibold tracking-tight` بوزن ≤ 600 في 7 أعمدة بداية، نموذج البدء تحته، شريط الإثبات `proof-bar.tsx` بأرقام `<Mono>` كبيرة (`text-3xl`) وتسميات `text-muted-foreground text-sm` بفواصل عمودية 1px؛ لا تدرج، لا ظل، لا رسم توضيحي؛ above-the-fold على 390px (hero ≤ 100dvh)
- [X] T035 [P] [US1] معاينة اللوحة `src/features/landing/components/dashboard-preview.tsx` (RSC): إطار نافذة بحد 1px `rounded-lg` بثلاث نقاط zinc-300، داخله **مكوّن مصغّر حقيقي** (لا صورة): شريط جانبي 160px بخمسة عناصر، شريط علوي 40px، 4 أرقام Mono (طلبات اليوم، الإيراد `display_*`, جديد، منخفض المخزون) وجدول 5 صفوف 44px بحدود أفقية فقط وشارة حالة ملوّنة بنقطة 6px + نص؛ بيانات من `landing.content.ts`؛ يُستبدل بـ M03 الفعلي لاحقاً (تعليق `// TODO(M03)`)
- [X] T036 [P] [US1] شبكة القدرات `src/features/landing/components/capabilities-bento.tsx` (RSC): `grid-cols-12` على `≥ lg` بأحجام من المحتوى (`col-span-8/4`, `4/4/4`, `6/6`), بطاقات بحد 1px بلا ظل، كل بطاقة: عنوان 20px، نص ≤ 25 كلمة، و**معاينة واجهة حقيقية مصغّرة** من `previews/*.tsx` (جدول طلبات، نموذج متغيرات، خط زمني شحنة، بطاقة محفظة بـ Mono، قسيمة، شاشة POS، صندوق وارد) أو **رقم كبير Mono**؛ على `< lg` عمود واحد بارتفاعات متباينة (`min-h-[240px|320px]`)؛ لا أيقونات في دوائر ملونة، لا إيموجي
- [X] T037 [P] [US1] «كيف يعمل» `src/features/landing/components/how-it-works.tsx` (RSC): 3 خطوات بأرقام `01/02/03` بـ `font-mono text-6xl text-muted-foreground/40`, عناوين ≤ 6 كلمات، فواصل 1px بين الخطوات (عمودية على الديسكتوب، أفقية على الجوال)
- [X] T038 [US1] الأسعار `src/features/landing/components/pricing.tsx` (RSC async يعتمد T029): `subscriptions_enabled=false` أو لا خطط → عمود واحد «مجاني الآن — كل الميزات» بحد 1px وقائمة مزايا بنقاط 4px؛ وإلا جدول مقارنة واحد (أعمدة الخطط، صفوف `max_products`, `max_orders_per_month`, المزايا) بأرقام `<Mono>` محاذاة نهاية (`text-end`), يتحول على `< md` إلى `Tabs` (shadcn) لكل خطة؛ `<Suspense>` بـ skeleton صفّين (`pricing-skeleton.tsx`)
- [X] T039 [P] [US1] الأسئلة `src/features/landing/components/faq.tsx`: shadcn `Accordion` (`type="single" collapsible`), 6 أسئلة، حدود أفقية 1px، `aria-expanded` من المكوّن، أيقونة `ChevronDown` بـ `rtl:` واعية (دوّار 180° عند الفتح فقط)
- [X] T040 [P] [US1] التذييل `src/features/landing/components/site-footer.tsx` (RSC): 3 أعمدة روابط («المنصة»، «للتاجر»: دخول التاجر/شروة باي/المسوقون، «قانوني») + سطر الحقوق بـ `<Mono>` للسنة؛ حد علوي 1px؛ لا شعارات اجتماعية ملونة
- [X] T041 [P] [US1] الحركة `src/features/landing/components/reveal.tsx` (client, `motion/react`): `whileInView` opacity 0→1 + y 8→0, 200ms ease-out, `once`, يُعطَّل كلياً بـ `useReducedMotion()` (الحالة النهائية مباشرة); يُغلّف الأقسام فقط لا العناصر الفردية
- [X] T042 [US1] صفحة `src/app/(marketing)/page.tsx` (RSC، يعتمد T031–T041): ترتيب الأقسام Header · Hero · DashboardPreview · CapabilitiesBento (`id="capabilities"`) · HowItWorks · Pricing (`id="pricing"`) · FAQ (`id="faq"`) · Footer؛ فواصل بين الأقسام `py-16 md:py-24`؛ `scroll-margin-top` للمراسي؛ JSON-LD `SoftwareApplication` (`name, applicationCategory:'BusinessApplication', operatingSystem:'Web', offers{price:'0', priceCurrency:'SAR'}`) بـ `JSON.stringify(...).replace(/</g,'\\u003c')`؛ `generateMetadata` من المحتوى (FR-01.09)
- [X] T043 [P] [US1] صورة OG `src/app/(marketing)/opengraph-image.tsx` بـ `ImageResponse` (1200×630، أرضية `#FAFAFA`، نص «شروه» وجملة الدعم بخط IBM Plex Sans Arabic المحمَّل من Google Fonts في وقت البناء، بلا تدرج)
- [X] T044 [US1] دخول التاجر `src/app/(marketing)/login/page.tsx` + `src/features/landing/components/store-login-form.tsx` (client, US-01.4): حقل «نطاق متجرك» بـ `dir="ltr"` ولاحقة `.<base>` بـ `<Mono>`؛ تحقق محلي `SUBDOMAIN_RE` و`RESERVED_SUBDOMAINS` من `src/lib/tenant.ts`؛ عند الإرسال `GET /api/bff/public/check-subdomain?subdomain=` (T024): `available=false ∧ reason='مستخدم بالفعل'` ⇒ موجود → `window.location.assign(buildStoreUrl(sub)+'/dashboard/login')`؛ غير ذلك → «لم نجد متجراً بهذا الاسم» تحت الحقل مع رابط «أنشئ متجرك»؛ metadata `robots: noindex`
- [X] T045 [US1] إمكانية الوصول والأداء (يعتمد T042): فحص Tab عبر كل الصفحة مع `focus-visible:ring-1 ring-ring` مرئي؛ `h1` واحد؛ كل صورة/معاينة بـ `alt`/`aria-label`؛ `prefers-reduced-motion` يُعطّل Reveal؛ لا تمرير أفقي 320–1920px (اختبار بـ Playwright MCP على 320/390/768/1024/1440/1920)؛ الخطوط `display:swap`؛ `next/image` لأي صورة (لا توجد صور خام حالياً)
- [X] T046 [US1] فحص Playwright: `npm run visual-check -- --slug 01-landing --url http://localhost:3000/` → `docs/visual-checks/01-landing/{desktop,tablet,mobile,desktop-dark}.png` + لقطة `login.png` لصفحة `/login`؛ 0 أخطاء console؛ Lighthouse (Chrome DevTools MCP أو `npx lighthouse`) Performance ≥ 90 / Accessibility ≥ 95 على mobile preset، تُحفظ النتيجة في `docs/visual-checks/01-landing/lighthouse.json`
- [X] T047 [US1] مراجعة المبدأ I يدوياً (قائمة: لا تدرج، لا ظل ملون، لا بطاقات متماثلة، لا إيموجي، لا عبارات عامة، لا رسوم جاهزة) وتوثيق «0 مخالفات» في `restore-points.md`؛ `npm run lint` + `tsc --noEmit`؛ commit `feat(landing): M01 marketing landing page` + `rp/03-landing-after`

> **تعديل الخطة — إعادة تصميم 3A (2026-10-17، بطلب المالك).** النسخة الأولى (`rp/03-landing-after`) رُفضت بصرياً: جامدة وتقليدية. ما تغيّر عن النص الأصلي للمهام أعلاه، وسببه:
>
> | المهمة | الانحراف | السبب |
> |---|---|---|
> | المكدّس | `clsx` + `tailwind-merge` في `src/lib/utils.ts` بدل حزمة `cn`؛ كل `src/components/ui/*` يستورد من `@/lib/utils` | بلا `twMerge` لا يحسم تعارض أصناف Tailwind (`rounded-lg` المخبوز ضد `rounded-md` المُمرَّر) إلا بترتيب الـ stylesheet. **لم تُثبَّت `framer-motion`**: الحزمة `motion@14` هي نفسها بنفس رقم الإصدار (أعاد الفريق تسميتها)، وتثبيت الاثنتين يعني نسختين من نفس المحرّك في الحزمة. **ولم تُستخدم Aceternity/Magic UI**: مصادرها تحمل ألوان hex خام وأصنافاً اتجاهية فيزيائية، وكلاهما يسقط على حرّاس ESLint؛ بُنيت المكوّنات يدوياً في `src/components/motion/`. |
> | T034 | Spotlight يتتبع المؤشر + شبكة 1px خلف الـ hero؛ العنوان `text-4xl` على الجوال (لا `text-5xl`) | المالك طلب hero تفاعلياً. الضوء **أحادي اللون بالكامل** (قنوات zinc عند ≤7% ألفا) فلا يخالف منع التدرجات والهالات. و`text-4xl` على 390px هو ما يُبقي الـ hero ضمن 100dvh كما تشترط المهمة نفسها. |
> | T034 | **لا** «نص بتدرج لوني» | المالك خيّر بين Spotlight **أو** Animated Gradient Text؛ اختير الأول لأن الثاني ممنوع نصاً في المبدأ I. التوكيد يأتي من خط 1px يُرسم تحت الكلمتين. |
> | T035 | ظل زنك ناعم ثلاثي الطبقات (`--shadow-lift`، ألفا ≤16%) + حافة لمعان 1px + بركة ضوء تحت الإطار | المالك طلب «إطاراً متوهجاً قليلاً **أو** ظلاً ناعماً جداً»؛ اختير الظل المحايد لأن التوهّج ممنوع. لا لون brand في أي طبقة. |
> | T041 | **أُلغي** `Reveal` بـ `motion/react` `whileInView`؛ لا كشف عند التمرير إطلاقاً | كلا التنفيذين يُخفي المحتوى حتى يُظهره شيء آخر: `whileInView` يُرسل `opacity:0` من الخادم وينتظر الـ hydration، و`animation-timeline: view()` يُحسب عند حالة البداية كلما قيست الصفحة بدل تمريرها. **كلاهما أفرغ أربعة أقسام كاملة من لقطات Playwright** (الدستور IV) — موثّق في `globals.css`. الحركة الآن إمّا عند التحميل (الـ hero، فوق الطية، بـ CSS) أو عند التفاعل (الضوء، hover، الرأس اللاصق)، ولا تكون أبداً شرطاً لقراءة الصفحة. |
> | T031 | أُسقط `QueryProvider` و`Toaster` من تخطيط المجموعة؛ `MockIndicator` في التطوير فقط | لا استعلام عميل ولا toast في هذه المجموعة (نداء `check-subdomain` الوحيد يمرّ عبر `apiFetch` مباشرة). إسقاطهما خفّض JS من 264KB إلى 130KB وTBT من 390ms إلى 0ms — وهو ما رفع Performance من 73 إلى 91. |
> | T037 | أرقام الخطوات `text-muted-foreground/80` بدل `/40` | `/40` قيست 1.68:1 مقابل الأرضية، دون حد 3:1 للنص الكبير في WCAG AA — وT045 أولى من الرسم التخطيطي. |
> | الخطوط | `preload: false` لـ Geist Mono في `src/app/layout.tsx` | الأوجه الستة (~284KB) كانت كلها على المسار الحرج؛ الأرقام ثانوية مقابل نص العنوان، و`display:swap` يرسمها فوراً بالخط البديل. خفّض LCP وأكمل الوصول إلى Performance 91. |
> | T036 | المعاينات السبع في `previews/index.tsx` ملفاً واحداً لا `previews/*.tsx` منفصلة | سبعة مكوّنات صغيرة تتشارك الصفوف نفسها؛ ملف واحد أوضح للقراءة والمراجعة. |
> | T046 | Lighthouse على **بناء إنتاج** (منفذ 3100) لا على خادم التطوير | خادم التطوير غير مُصغَّر وبـ HMR؛ قياسه بلا معنى مقابل ميزانية ≥90 (أعطى 73 لنفس الكود الذي يعطي 91 في الإنتاج). |

> **تعديل الخطة — إعادة تصميم 3A v3 (2026-10-17، بقرار المالك).** رُفضت v2 بصرياً («ميتة، كمستند HTML بدائي»). **الدستور رُفِّع إلى 2.0.0 وقُسِّم المبدأ I حسب السطح**: I-أ (الترويجي) يسمح بالتدرجات والتوهّج والـ glassmorphism ولون brand؛ I-ب (اللوحة/المتجر/الأدمن) يبقى على قواعد 1.0.0 بلا استثناء. ما نُفِّذ ومقابله:
>
> | البند | التنفيذ |
> |---|---|
> | خلفية حية | `.dot-field` (نقاط 22px بقناع إشعاعي) + `.brand-aura` (تدرجان `emerald`/`cyan`) في الـ hero، ونسخة أخف خلف الأسعار والقدرات |
> | نص متوهّج | `.text-brand-gradient` على الكلمات المفتاحية. **درجات اللون مُعمَّقة خطوة** (`emerald-600→cyan-600` فاتح، `400` داكن) لا `500→500` كما طُلب: `500→500` قيست ~2.4:1 مقابل الأرضية، دون حد 3:1 للنص الكبير |
> | أزرار نابضة | `bg-emerald-600` + `shadow-lg shadow-emerald-500/25` + `hover:-translate-y-0.5 hover:shadow-xl` في الرأس والـ hero والأسعار |
> | Mockup زجاجي | `.glass` (طبقة blur **واحدة**) + ظل عميق + `.mockup-glow` تحته، داخل الـ hero مباشرة تحت النصوص، يصعد `y:50→0` |
> | بطاقات عائمة | ثلاث شارات حية (`Bell`/`TrendingUp`/`PackageCheck`) تدخل بـ `motion/react` ثم تنجرف بحلقة CSS |
>
> **الثمن المقيس (Lighthouse mobile، بناء إنتاج):** Accessibility **97 → 100**، Performance **91 → 66**. ما جُرِّب وما أعطى:
>
> - إزالة `filter: blur()` عن طبقات الهالة: styleLayout 1307ms → 928ms (التدرج العريض يكفي بصرياً).
> - إزالة `backdrop-blur` الزخرفي من ستة عناصر صغيرة (بقي على الـ mockup والرأس فقط).
> - `LazyMotion` + `domAnimation` + `m` بدل `motion` الكامل.
> - إعادة `preload` لـ Geist Mono: الـ mockup انتقل إلى الـ hero، وعنصر LCP صار رقماً بخط Mono — FCP 1.6s → 0.9s.
> - **إسقاط React Hook Form + Zod من `start-form.tsx`** (تحقق يدوي لحقل واحد): أزال أكبر chunk (141KB) عن مسار الصفحة. `/login` والنماذج متعددة الحقول تبقى على RHF + Zod.
> - جُرِّب إلغاء `framer-motion` كلياً: أعطى +3 نقاط فقط، فأُعيد لأن المالك طلبه صراحةً.
>
> الفارق الباقي موزَّع على DOM أكبر (الـ mockup داخل الـ hero + الشارات)، `backdrop-filter`، وطبقات الخلفية. **T046 يشترط ≥90 — غير محقَّق في v3؛ القرار للمالك.**

**Checkpoint 3A**: الصفحة الترويجية قابلة للعرض للمالك؛ `/register` يستقبل `store_name` (يُبنى في 3C).

### 3B — M47 حلّ المستأجر + M03 هيكل اللوحة (`rp/12-tenant-shell-before|after`)

- [X] T048 [US1] وسم `rp/04-tenant-shell-before`
- [X] T049 [P] [US1] شِيمات M47 في `src/features/tenant/schemas.ts` (`ResolutionOutcome`, `ProvisioningStatusSchema` reuse) + `src/features/tenant/api/probe.ts`: `probeStore(storeHost)` ينادي `/api/v1/config/` عبر upstream ويعيد `{outcome, config?}` (404/403/503 → outcomes)؛ mock `src/mocks/tenant/config.ts` (متاجر `noor` ready, `pending1` 503, `closed` 403؛ ملاحظة: `demo` محجوز في Django فلا يُستخدم) + سلوك mock للـ passthrough `/api/v1/config/` حين `SHARWA_MOCKS=on` والخادم غير متاح
- [X] T050 [P] [US1] صفحات الخطأ zinc في `src/app/(onboarding)/_errors/{store-not-found,store-inactive,store-provisioning}/page.tsx` + `layout.tsx` مستقل (`forcedTheme` نظام، `robots noindex`): 404 «لم نجد متجراً بهذا العنوان» + رابط `<base>/register`؛ 403 «هذا المتجر غير متاح حالياً» + زر واتساب المنصة 44px؛ 503 (`Retry-After: 10` عبر `headers()` في route segment) «جارٍ تجهيز متجرك» بمؤشر غير محدد 1px + خطوات نصية + زمن منقضٍ `<Mono>`
- [X] T051 [US1] عميل الاستطلاع `src/features/tenant/components/provisioning-poller.tsx` (client, TanStack `refetchInterval` 3s → backoff 10s): مع `?t=` → `GET /api/bff/public/provisioning/<token>` (legacy adapter لـ `/register/status/<token>/`) وحالات `pending|provisioning|ready|failed`; بلا token → `HEAD /api/v1/config/` كل 10s؛ `ready` → «تم إنشاء متجرك» ثانيتان ثم `dashboard_url`؛ `failed` → رسالة نهائية + واتساب؛ بعد 5 دقائق «يستغرق وقتاً أطول»؛ توقف عند `visibilitychange` hidden واستئناف عند focus
- [X] T052 [US1] تخطيط المتجر الجذري `src/app/(storefront)/_s/[store]/layout.tsx`: يقرأ `params.store`, ينادي `probeStore`, يحوّل outcomes إلى `notFound()`/صفحات الخطأ/503؛ يطبّق ثيم التاجر كمتغيرات CSS inline من `brand_shades` على `<div data-store-theme>`؛ `forcedTheme="light"`؛ `QueryProvider`؛ صفحة `page.tsx` مؤقتة «متجر {store_name}» (تُستبدل في Phase 4)
- [X] T053 [P] [US1] عقود M03 في `src/features/dashboard-shell/schemas.ts`: `SessionSchema` (data-model §1 Session), `OverviewSchema`, `CountersSchema`, `AccountStoresSchema`; mocks `src/mocks/dashboard/{me,overview,counters,stores}.ts` + handlers `src/app/api/bff/dashboard/{me,overview,overview/refresh,counters}/route.ts` و`src/app/api/bff/account/stores/route.ts`
- [X] T054 [P] [US1] مصادقة التاجر عبر BFF: `src/app/api/bff/auth/{csrf,merchant/login,staff/login,logout,setup-password,forgot-password,reset-password}/route.ts` بوضع `legacy` (POST إلى `/dashboard/login/` إلخ مع `X-CSRFToken` المقروء من `Set-Cookie` لـ GET سابق) + mock؛ `src/lib/csrf.ts` (`getCsrfToken()` خادمي)
- [X] T055 [P] [US1] فهرس التنقل `src/features/dashboard-shell/navigation.ts`: 15 مجموعة الشريط حرفياً من discovery 01 §4 مع `feature?`/`permission?`/`keywords[]`/`shortcut?`/`comingSoon` (السجلات)؛ مصدر واحد لـ M03 وM48
- [X] T056 [US1] هيكل اللوحة `src/app/(dashboard)/_d/[store]/dashboard/layout.tsx` + `src/features/dashboard-shell/components/{sidebar,topbar,mobile-nav,shell-skeleton}.tsx`: شريط جانبي 256px/56px rail بحد نهاية 1px (`[` للطيّ, حالة في Zustand `src/stores/shell.ts`), شريط علوي 48px بحد أسفل 1px (زر «بحث… Ctrl+K» placeholder، جرس placeholder، مبدّل المتاجر إن `stores.length>1`, قائمة المستخدم), محتوى `max-w-[1440px] px-6`; إخفاء عناصر بلا ميزة، تعطيل مع `Tooltip` بلا صلاحية؛ drawer بداية + شريط سفلي 4 مداخل على الجوال؛ `requireSession()` خادمي يحوّل إلى `/dashboard/login`
- [X] T057 [P] [US1] شاشات الدخول `src/app/(dashboard)/_d/[store]/dashboard/{login,staff/login,forgot-password,reset-password,setup-password}/page.tsx` + نماذج RHF/Zod في `src/features/dashboard-shell/components/auth/*.tsx` (كلمة مرور ≥ 8، تطابق التأكيد، هاتف الموظف `dir=ltr`)، أخطاء `{field:[msg]}` تحت الحقول، `{detail}` فوق النموذج؛ تخطيط خارج الـ shell
- [X] T058 [US1] النظرة العامة `src/app/(dashboard)/_d/[store]/dashboard/page.tsx` + `src/features/dashboard-shell/components/overview/*.tsx`: شريط 6 أرقام Mono (`today`) مع «تحديث» (`POST overview/refresh`) ووقت `refreshed_at`, Bento غير متماثل: الطلبات الجديدة (جدول 44px بمحورَي حالة), «يحتاج انتباهك» (4 عدّادات نصية), أفضل المنتجات, مصادر الزيارات (Recharts bar أحادي)؛ حالات skeleton/فراغ متجر جديد/خطأ لكل كتلة مستقلة
- [X] T059 [US1] اختصارات لوحة المفاتيح `src/features/dashboard-shell/hooks/use-shortcuts.ts` (`G O/G P/G C`, `[`, `?` قائمة الاختصارات في Dialog, `Esc`)
- [X] T060 [US1] فحص Playwright: `docs/visual-checks/47-tenant-guard/` (404, 403, provisioning, ready, failed على desktop/mobile/mobile-dark) + `docs/visual-checks/03-dashboard-shell/` (login, overview, rail, mobile drawer، داكن)؛ اختبار متجرَين متناوبين (`noor` و`shop`) يقارن `store_name` 10 مرات؛ 0 console errors؛ lint + tsc؛ commit + `rp/04-tenant-shell-after`

> **تعديل الخطة — المرحلة 3B (2026-10-18).** ما انحرف عن نص المهام أعلاه وسببه المقيس:
>
> | المهمة | الانحراف | السبب |
> |---|---|---|
> | الوسوم | `rp/12-tenant-shell-before\|after` بدل `rp/04-…` | الوسوم `rp/04`…`rp/11` استُهلكت في جولات إعادة تصميم الصفحة الترويجية؛ الـ slug بقي كما في المهمة. |
> | T052 وكل مسارات `_s/_d` | المجلدات على القرص `%5Fs` و`%5Fd` لا `_s` و`_d` | Next يعامل أي مجلد يبدأ بـ `_` كمجلد **خاص** ويستثنيه من التوجيه (قيس: `/_rtprobe` ← 404 مقابل `/%5Frtprobe2` ← 200). `%5F` هو الهروب الموثَّق، والـ **URL يبقى** `/_s/...` و`/_d/...` تماماً كما يكتبه `proxy.ts` وكما في research R-03 — لا تغيير في العقد ولا في الـ proxy. |
> | T050 · T052 | صفحات الخطأ تُخدَم على أصل المتجر عبر إعادة توجيه إلى `/_tenant/{not-found,inactive,provisioning}` يعيد الـ proxy كتابته إلى `/_errors/*` بالحالة المطلوبة | مكوّن خادمي في React لا يملك أي واجهة لضبط حالة HTTP؛ `notFound()` يعطي 404 فقط. الـ proxy هو الطبقة الوحيدة التي تملك الاستجابة كاملة. المسار الظاهر يبقى على نطاق المتجر وبلا معرّف مستأجر (SC-47.6). |
> | T050 (الحالة) | **الحالة الحقيقية تصل في `next dev` فقط**؛ في بناء الإنتاج يعيد الخادم `200` للمستند مع `Retry-After: 10` صحيحة، والحالة الحقيقية تصل على طلب الـ RSC (قيس: `404` على `/_tenant/not-found?_rsc=…`) | مع `cacheComponents: true` تُرسَل قشرة PPR ثابتة قبل أن يُحسم الحارس، فتُثبَّت الحالة 200. جُرِّب بلا نتيجة: `notFound()`، حالة الـ rewrite من الـ proxy، `export const instant = false` على الصفحة وعلى التخطيط، وجعل كامل سلسلة المسار ديناميكية بـ `connection()` في تخطيط `(onboarding)`. الرافعة الوحيدة المتبقية هي `cacheComponents: false` وهي قرار R-02 يخصّ المالك. **الصفحة والترويسة والسلوك مطابقة للعقد؛ حالة المستند في الإنتاج ليست كذلك.** |
> | T052 · T056 | `export const instant = false` + منع أي `<Suspense>` فوق الحارس (حُذفت `loading.tsx` من مجموعة اللوحة) | مع وجود حدّ Suspense فوق الحارس كان `/dashboard` بلا جلسة يُرجع **200 ومعه ترميز النظرة العامة** ثم يحوّل من العميل. بعد الإزالة صار 307 حقيقياً إلى `/dashboard/login` في التطوير، وفي الإنتاج 200 بلا أي تسريب للمحتوى (قيس: صفر مطابقة لـ `today-bar` في الجسم). |
> | T052 | «`forcedTheme="light"`» نُفِّذ بتثبيت رموز ثيم التاجر inline على جذر المجموعة بدل `ThemeProvider` متداخل | مزوّدا `next-themes` متداخلان يكتبان الصنف نفسه على `<html>` ويتسابقان → تحذير hydration، والدستور IV يعدّه فشلاً. المتغيّرات inline تتقدّم على `.dark` فتحقّق الغرض نفسه بلا مزوّد ثانٍ. |
> | T054 | محوّلات المصادقة بوضع **target** (`/api/v1/auth/*`) لا **legacy** (`/dashboard/login/`) — عدا CSRF فهو legacy كما نُصّ | أسماء حقول نماذج Django ليست في `specs/discovery/**`، وكشط القوالب لمعرفتها نسخٌ لمنطق الباك إند (المبدأ V). الصفوف السبعة كلها `[NEEDS BACKEND]`، فالعقد الهدف هو المرجع. CSRF يبقى legacy لأنه لا يحتاج أسماء حقول. |
> | T053/T054 | كوكي جلسة تطويرية `sharwa_mock_session` تضبطها محوّلات الدخول ويقرأها `getSession()` | لا يوجد `/api/v1/auth/me/` ولا جلسة Django لمتاجر الـ fixtures، فبلا علامة جلسة لا يمكن عرض اللوحة أصلاً. تعمل فقط مع `SHARWA_MOCKS=on`، وبيانات الدخول التجريبية مسجّلة في `src/mocks/dashboard/auth.ts`. |
> | T049 | الـ fixtures تجيب أيضاً حين يعيد Django **404** (لا عند انقطاعه فقط) | Django يعمل فعلاً على :8000 لكنه لا يحوي أي مستأجر بهذه الأسماء، فبلا هذا لا يمكن عرض أو تصوير حالة «جاهز» إطلاقاً. أي صف يملكه Django يفوز دائماً؛ القاعدة محصورة بـ `SHARWA_MOCKS=on` وكل استجابة تحمل `x-sharwa-mock: 1`. أُضيف `shop` كمتجر ثانٍ جاهز (يلزمه اختبار المتجرَين في T060) وهو كذلك متجر «فارغ» لعرض حالة الفراغ. |
> | T056 | حدّ الهيكل `lg` (1024px): أقل منه = درج + شريط سفلي، أكثر منه = شريط جانبي موسّع أو rail بخيار التاجر | §8 يطلب rail تلقائياً عند 1024px وFR-03.13 يطلب درجاً على الجوال؛ عند 768px يأكل شريط 256px ثلث الشاشة، فالدرج يغطي المدى كله تحت 1024. |
> | T056 | المجموعات **مطوية افتراضياً** عدا المجموعة التي تحوي الشاشة الحالية (`expandedGroups` بدل `collapsedGroups`) | بالتوسيع الافتراضي بلغ الشريط 3071px في أول لقطة — غير قابل للمسح بالعين. |
> | T056 | تُخفى المجموعة إذا لم يملك الموظف صلاحية **أي** عنصر فيها (مع إبقاء التعطيل + Tooltip للمزيج) | US-03.2.2 «تُخفى المجموعات الأخرى» للكاشير. المجموعات التي لا يبوّبها الباك إند أصلاً تبقى ظاهرة؛ اختراع مفتاح صلاحية لها حقلٌ لا يسنده أي اكتشاف. |
> | T056 | مسار `(shell)/[...unbuilt]` يعرض «هذه الشاشة لم تُبنَ بعد» بـ 200 | الشريط يسرد الوجهات الـ 15 كاملة من M03 بينما الشاشات تصل مرحلة بعد مرحلة؛ وNext يعمل prefetch لكل رابط ظاهر، فكانت أول لقطة تسجّل خطأ console لكل رابط (وهو فشل محقّ في البوابة). المسار الصريح يتقدّم على الـ catch-all فيُزيل كل شاشة نفسها من هنا عند بنائها. |
> | T058 | مصادر الزيارات أشرطة CSS لا Recharts | تسعة أشرطة ثابتة لا تبرّر ~100KB على أول شاشة في اللوحة (SC-03.2)، ونصوص Recharts الافتراضية تخالف الرموز. Recharts يبقى للسلاسل الزمنية في M25. |
> | T058 | قراءة النظرة العامة **خادمية** مع كتلة خطأ واحدة + «إعادة المحاولة»، لا استعلام عميل لكل كتلة | العقد endpoint واحد (`/dashboard/overview/`)؛ أربع حدود خطأ مستقلة فوق نداء واحد زينة لا معنى لها. الهيكل والأرقام تصل مع HTML (SC-03.2). حالات الفراغ لكل كتلة منفّذة كما في المواصفة. |
> | T058 | صف الطلبات الجديدة رابط إلى `/dashboard/orders/<id>` لا sheet | الـ sheet يملكه M06 ويصل معه (US-03.5.2). |
> | T060 | أُضيفت إلى `scripts/visual-check.ts` أعلام `--viewports` و`--cookie` و`--click` و`--wait` و`--expect-status` و`--allow-status`؛ وفحص هدف اللمس صار على كل مقاس < 768px | T060 يطلب `mobile-dark` وحالات لا تُلتقط إلا بتفاعل (rail، الدرج) وصفحات تحمل حالة خطأ بحكم العقد. |
> | T060 | أُضيف `scripts/tenant-shell-check.ts` | SC-47.1 (عشر تحميلات متناوبة) وSC-47.4 وSC-47.6 واختصارات §6 لا يثبتها أي سكرين شوت. النتيجة: **8/8 ناجحة**. |
> | عامّ | `src/components/ui/sheet.tsx`: زر الإغلاق `size-11 lg:size-7` | المكوّن المولَّد يشحن 28px، وهو أقل من 44px في كل درج يُفتح على هاتف أو لوحي (قيد نظام التصميم). |
>
> **ملاحظة خارج النطاق:** الصفحة الترويجية تعمل prefetch لـ `/register` غير الموجود بعد، فيسجّل المتصفح 404 واحداً عليها في بناء الإنتاج. مصدره روابط M01 وتحلّه 3C عند إنشاء المسار؛ لم تُمَس الصفحة الترويجية.

**Checkpoint 3B**: المستأجر يُحلّ من الـ host بحالاته الأربع، ولوحة التاجر تفتح بجلسة على بيانات تجريبية بعقد M03.

### 3C — M02 معالج التأسيس (`rp/05-onboarding-before|after`)

- [X] T061 [US1] وسم `rp/05-onboarding-before`
- [X] T062 [P] [US1] شِيمات `src/features/onboarding/schemas.ts` (`RegistrationDraft` من data-model §2، `MarketCategorySchema`, `RegisterResponse{otp_token, ttl_seconds, masked_phone}`, `VerifyResponse{status_token, status_url}`, `ResendResponse`) + محتوى `src/features/onboarding/onboarding.content.ts` (نص الشروط)
- [X] T063 [P] [US1] mocks + handlers: `src/mocks/public/{market-categories,register,verify-otp,resend-otp}.ts` و`src/app/api/bff/public/{market-categories,register,register/verify-otp,register/resend-otp,provisioning/[token]}/route.ts` (الأخير `legacy` إلى `/register/status/<token>/`؛ mock يتقدم `pending→provisioning→ready` كل استدعاءَين)
- [X] T064 [US1] اللوحة 01 `src/app/(onboarding)/register/page.tsx` + `src/features/onboarding/components/register-form.tsx`: 4 حقول + موافقة؛ `store_name` مُعبَّأ من `?store_name=`؛ `merchant_phone` بـ `dir=ltr` وتطبيع؛ `subdomain` مع اقتراح لاتيني من الاسم وفحص حيّ بعد 400ms عبر `/api/bff/public/check-subdomain` يعرض السبب الحرفي أو «متاح» بـ `text-success`؛ القطاعات كـ chips قابلة للتبديل؛ زر معطّل حتى الصلاحية؛ حالة المعالج في Zustand `src/stores/onboarding.ts` (لا بيانات شخصية في الرابط FR-02.10)
- [X] T065 [US1] اللوحة 02 `src/app/(onboarding)/register/verify/page.tsx` + `otp-form.tsx`: 6 خانات `inputMode=numeric` بـ `<Mono>`, عدّاد TTL Mono, «إعادة الإرسال» مع `Retry-After`, أخطاء 400/410/429 بالعربية؛ عند النجاح `router.replace('/register/status/' + status_token)` ويضع cookie قصيرة العمر `sharwa_prov` على `<base>` (M47 US-47.3.2)
- [X] T066 [US1] اللوحة 03 `src/app/(onboarding)/register/status/[token]/page.tsx` تعيد استعمال `provisioning-poller.tsx` (T051) بنمط المنصة؛ عند `ready` تحويل إلى `dashboard_url` مع `?t=` مرة واحدة
- [ ] T067 [US1] فحص Playwright `docs/visual-checks/02-onboarding/` (النموذج 390/1440، OTP، الانتظار، النجاح، الفشل، داكن)؛ تدفق كامل بالـ mocks ≤ 60s؛ lint + tsc؛ commit + `rp/05-onboarding-after`

> **تعديل الخطة — المرحلة 3C (2026-10-18).** نُفِّذت T061–T067 عدا خطوة الـ commit والوسم `*-after` في T067 (معلّقة بأمر المالك حتى المراجعة). التفصيل والمخرجات الحرفية في `execution_log.md`.
>
> | المهمة | الانحراف | السبب |
> |---|---|---|
> | T061 | الوسم `rp/13-onboarding-before` بدل `rp/05` | بتوجيه المالك؛ `rp/05` مستهلك. |
> | T061 | لم يُطبَّق `cacheComponents: false` رغم الموافقة | Next 16.4 أزال `experimental.ppr` و`experimental_ppr` على مستوى المقطع؛ لا يوجد إيقاف لتخطيط المستأجر وحده. الرافعة الوحيدة عامة وتكسر `"use cache"`/`cacheLife` في M01 و`partialPrefetching` وصادرات `instant` — خارج نطاق M02. القرار معلّق للمالك. |
> | T063 | سجلّ متاجر المعالج على `globalThis` يقرؤه `tenantFixture()` | معالجات الـ BFF ومكوّنات الخادم حزمتان منفصلتان في عملية واحدة؛ بلا سجلّ مشترك يقع التحويل بعد `ready` على حارس 404. المتجر الجديد «فارغ» في النظرة العامة. |
> | T063 | البادئة `gone…` في fixture الحالة → 404 | لتصوير «لم نجد طلب التأسيس هذا» (M02 §8). |
> | T064 | مربع الموافقة لا يدخل في تعطيل الزر | US-02.1 (معطّل حتى صلاحية الحقول) وUS-02.1.3 (الضغط بلا موافقة ينقل التركيز إلى المربع) متعارضان حرفياً؛ الزر ينتظر الحقول الثلاثة والفحص الحيّ، والموافقة تُفحص عند الإرسال. |
> | T064 | لا نقل تلقائي للتركيز إلى حقل النطاق مع الاسم العربي | القفز من الاسم إلى النطاق يتخطى حقل الهاتف بينهما؛ يبقى التلميح «أحرف إنجليزية صغيرة وأرقام» تحت الحقل. |
> | T065 | `sharwa_prov` HttpOnly يضبطه محوّل verify-otp لا العميل، بلا سمة `Domain` | لا يراه أي نطاق متجر (M47 §10)؛ `/register` يقرؤه خادمياً ليعرض «متابعة الحالة»، ويُمسح عند `ready`. |
> | T065 | لوحة OTP مفتاحها `otp_token` | Next 16 يُبقي المسارات مخفية بـ Activity؛ بلا مفتاح تنتقل حالة القفل/الانتهاء إلى تسجيل جديد. |
> | T066 | `ready` يعرض العنوان والزرَّين ثم تحويل بعدّ تنازلي 5 ثوانٍ إلى `dashboard_url/setup-password?t=` | يجمع US-02.4.1 (زرّان + رابط قابل للنسخ) وT066 (تحويل آلي)؛ المتجر الجديد بلا كلمة مرور فـ`dashboard_url` المجرّد يرتد إلى الدخول (US-02.6). النسخ يوقف التحويل. |
> | T066 | محرّك الاستطلاع استُخرج إلى `useProvisioningPoll` بسياستين `store`/`platform` | إعادة استعمال T051 بدل نسخه. أُصلح عَرَضاً خلل سابق: رسالة «تحقق من اتصالك» لم تكن تظهر أبداً لأن `failureCount` مع `retry:false` لا يتجاوز 1. على أصل المتجر صار الرمز المرفوض (404) يحوّل إلى مسار الزائر كما نصّ تعليق T051. |
> | T067 | `scripts/onboarding-check.ts` | معظم معايير M02 تفاعلية (فحص بلا شبكة، إرسال آلي، لصق، 429، انتهاء TTL، سباق التفرّد، خلو الروابط) ولا تثبتها لقطة. |

### 3D — M04 المنتجات · M05 التنظيم · M06 الطلبات · M48 لوحة الأوامر · M49 التنبيهات (`rp/06-catalog-orders-before|after`)

- [ ] T068 [US1] وسم `rp/06-catalog-orders-before`
- [X] T069 [P] [US1] `src/components/shared/data-table/*` (TanStack Table 8): صفوف 44px، رأس ثابت، حدود أفقية فقط، أعمدة رقمية `text-end font-mono`, كثافة قابلة للتبديل، تحديد متعدد مع شريط إجراءات جماعية (معاينة بالعدد)، حالة الفلاتر/الترتيب/الترقيم عبر `nuqs`, حالات skeleton/فراغ/خطأ/بلا صلاحية
- [X] T070 [P] [US1] شِيمات M04 `src/features/products/schemas/*.ts` (Product كاملاً بكل enums من data-model §4 حرفياً: `payment_policy cod|deposit|full`, `unit` 14, `product_type physical|digital|service`, `pricing_type fixed|formula`, `hazard_class`; VariantAttribute `field_type`/`data_type`; ProductVariant; ProductTemplate) + mocks `src/mocks/products/*.ts` (60 منتجاً عربياً، 3 سمات، قوالب) + handlers `src/app/api/bff/products/**` لكل صفوف M04 §7 (`list, detail, quick, images, stock, variant-attributes, variants/generate, templates, bulk, export.csv, import, changes`)
- [X] T071 [US1] قائمة المنتجات `src/app/(dashboard)/_d/[store]/dashboard/products/page.tsx` + `src/features/products/components/products-table.tsx`: فلاتر (حالة، مخزون، تصنيف، ماركة، وسم، نوع) في الرابط، بحث، إجراءات جماعية (`publish|archive|delete|set_category|add_tag`) بتقرير `{succeeded, failed[{id, reason}]}`, حالة فراغ «أضف منتجك الأول» تفتح الإضافة السريعة
- [X] T072 [US1] الإضافة السريعة `quick-add-dialog.tsx` (≤ 4 حقول إلزامية: اسم، سعر decimal نص، صورة، مخزون) + نموذج المنتج الكامل `src/app/(dashboard)/_d/[store]/dashboard/products/{new,[id]}/page.tsx` بأقسام (أساسي، تسعير، مخزون، شحن، محتوى، SEO، أعلام) RHF/Zod مع حفظ تلقائي للمسودة، تحميل صور متعدد بترتيب (`@dnd-kit`)، سجل التغييرات
- [X] T073 [US1] المتغيرات: `src/app/(dashboard)/_d/[store]/dashboard/products/variants/page.tsx` (قاموس السمات/القيم CRUD بـ `field_type`/`data_type`) + مولّد التوليفات `variant-matrix.tsx` داخل نموذج المنتج (اختيار سمات → `generate` → جدول SKU/`extra_price`/`stock` قابل للتحرير جماعياً، استثناءات) + القوالب `products/templates/**`
- [X] T074 [P] [US1] M05: شِيمات `src/features/organization/schemas.ts` (Category/Brand/Tag/Collection/Badge) + mocks + handlers `src/app/api/bff/{categories,brands,tags,collections,badges}/**` + صفحة `dashboard/products/organization/page.tsx` بتبويبات: شجرة التصنيفات قابلة للسحب (`@dnd-kit/sortable`, منع الدورات) مع `reassign_to` عند الحذف، ماركات (شعار)، وسوم (دمج)، مجموعات (بحث منتجات Ready + ترتيب), شارات (منتقي لون zinc/دلالي فقط)
- [X] T075 [P] [US1] شِيمات M06 `src/features/orders/schemas/*.ts` (Order بمحورَي الحالة حرفياً من data-model §4، OrderStatus، OrderItem، Fulfillment، PaymentIntent، OrderRefund) + mocks `src/mocks/orders/*.ts` (120 طلباً بتوزيع حالات) + handlers `src/app/api/bff/{orders/**,order-statuses/**}` + passthrough لـ `/api/v1/returns/*` و`/orders/b2b-*` (Ready)
- [X] T076 [US1] قائمة الطلبات `dashboard/orders/page.tsx` + `orders-table.tsx`: عمودان للحالة (مالية = شارة zinc نصية؛ تنفيذ = نقطة 6px بلون `OrderStatus.color` + اسم), فلاتر (status, payment_status, fulfillment_status, channel, location, from/to, q) في الرابط، عدّاد «جديد» في الشريط من `counters`, تغيير حالة التنفيذ من القائمة مباشرة بـ `version` و409 → لوحة التعارض
- [X] T077 [US1] تفاصيل الطلب `dashboard/orders/[id]/page.tsx`: رأس بالحالتين، العناصر (`<Money>`), الفاتورة `display_*`, المدفوعات (`PaymentIntent`), التنفيذات لكل موقع، الخط الزمني، إجراءات: حالة التنفيذ، الحالة المالية، تأكيد/مراجعة دفع، استرجاع مالي (`amount, method, reason`), تحويل إلى استلام، طباعة البوليصة (route `print`), ملاحظة الهدية
- [X] T078 [US1] حالات التنفيذ `dashboard/orders/statuses/page.tsx`: CRUD + ترتيب بالسحب + `is_default` + أعلام `releases_stock`/`marks_completed` + منتقي لون؛ إنشاء طلب يدوي `dashboard/orders/new/page.tsx` (عميل بالهاتف، أسطر منتجات ببحث Ready، توصيل/استلام، `sales_channel: phone`)
- [X] T079 [P] [US1] M48 لوحة الأوامر `src/features/command-palette/*` (cmdk عبر shadcn `command`, Zustand `src/stores/palette.ts`): `Ctrl+K/⌘K`, صفحات من `navigation.ts` مفلترة بالميزة/الصلاحية، إجراءات سياقية (`>`), بحث خادمي مجمَّع عبر `/api/bff/search` (mock) بـ debounce 150ms وskeleton صفَّين لكل مجموعة، `#` للطلب، الأخيرة في localStorage بمفتاح `<store>:<staff>`, مبدّل المتاجر؛ Dialog 640px / drawer على الجوال؛ تذييل تلميحات
- [X] T080 [P] [US1] M49 مركز التنبيهات الأساسي `src/features/notifications/*`: شِيما Notification، mocks + handlers `/api/bff/notifications/{summary,list,read,read-all}`, جرس في الشريط العلوي بعدّاد Mono ونقطة حمراء عند `has_critical`, لوحة منبثقة بتجميع `group_key`, تعليم مقروء/الكل، استطلاع 30s مشروط بـ visibility
- [ ] T081 [US1] فحص Playwright `docs/visual-checks/{04-products,05-organization,06-orders,48-command-palette,49-notifications}/` (3 مقاسات + داكن + حالات فراغ/خطأ/409)؛ سيناريو US1 الكامل بالـ mocks: إضافة منتج بمتغيرات → طلب جديد يظهر → تغيير حالته حتى «مكتمل»؛ lint + tsc؛ commit + `rp/06-catalog-orders-after`

> **تعديل الخطة — المرحلة 3D (2026-10-18).** نُفِّذت T069–T080، وبوابات T081 (lint · tsc · `scripts/catalog-orders-check.ts` 21/21 · الفحص البصري) ناجحة. T068 (الوسم) وخطوة الـ commit/الوسم في T081 بيد المالك. التفصيل في `execution_log.md`.
>
> | المهمة | الانحراف | السبب |
> |---|---|---|
> | T068 | الوسم `rp/14-next-phase-before` بدل `rp/06-catalog-orders-before`، ويشغّله المالك | بتوجيه المالك؛ `rp/06` مستهلك. تشغيل أوامر git على جهاز المالك من الجلسة مرفوض أمنياً، فسُلِّمت المرحلة كرقعة تُطبَّق بعد الوسم. |
> | T071/T074/T076… | المسارات تحت `src/app/(dashboard)/%5Fd/[store]/dashboard/(shell)/…` | Next يستثني `_folder` من التوجيه (قرار 3B). |
> | T074 | `/products/categories` و`/products/brands` و`/products/organization` شاشة واحدة بخمسة تبويبات والتبويب في `?tab=` | FR-05.11 + M05 §6؛ كل مسار يفتح على تبويبه. |
> | T074 | رابط المجموعة `<أصل المتجر>/?collection=<slug>` | M05 US-05.5.3 يسمّي الاستعلام فقط؛ مسار قائمة المتجر لم يُبنَ بعد. |
> | T074 | الحذف الفارغ بتراجع 5 ثوانٍ يؤجّل الطلب نفسه حتى انقضاء المهلة | FR-05.09؛ التراجع لا يحتاج endpoint استعادة. |
> | T075 | `orders/form-options` يُرجع `locations` (مصادر التنفيذ) مع طرق التوصيل ونقاط الاستلام | فلتر «الموقع» في FR-06.01 يحتاج القائمة، ومالكها M22 غير مبني؛ `[NEEDS BACKEND]`. |
> | T076 | التغيير الجماعي = طلب مُصدَّر بـ `version` لكل طلب، والمحجوب يُرفض محلياً بسببه دون إرسال | لا endpoint جماعي في M06 §7؛ يحقق FR-06.05 (معاينة + تقرير). |
> | T076 | «حفظ كعرض» (US-06.1.2) غير مبني | خارج نص T076؛ الرابط نفسه قابل للمشاركة (SC-06.5). |
> | T076/T077 | الاختصار `E` و`P` داخل التفاصيل (لوحة/صفحة) لا على صف القائمة | `E` على القائمة يحتاج «صفاً مركَّزاً» يملكه DataTable؛ J/K/Enter تعمل هناك. |
> | T077 | الطباعة في مجموعة مسارات `(print)` بتخطيط يمرّ بنفس `requireSession()` بلا هيكل اللوحة | FR-06.10؛ طلب الهدية يُطبع بلا أسعار وبرسالة الهدية. |
> | T078 | الطلب اليدوي يتطلب `orders.update_status`؛ خيار «مسودة جملة» يظهر فقط مع `orders.create_b2b` | لا مفتاح صلاحية لإنشاء الطلب بين الـ 35؛ الإجمالي يحسبه الخادم (الدستور II). |
> | T079 | التقارير الـ 42 غير مفهرسة في اللوحة | `REPORT_REGISTRY` يُبنى في M25؛ الفهرس يقرأ `navigation.ts` فقط. مبدّل اللغة مخفي (M48 §10). |
> | T079 | «إضافة تصنيف» تفتح شجرة التصنيفات، و«كوبون جديد» تفتح `/dashboard/marketing/offers` | لا مسار إنشاء مستقل لهما؛ الثاني غير مبني بعد. |
> | T080 | الاستطلاع كل 30 ثانية (نص T080) لا 60 (FR-49.01) | نص المهمة أحدث وأدق؛ متوقف مع إخفاء التبويب ويُجلب عند التركيز. |
> | T080 | الاختصار `N` لفتح اللوحة غير مربوط | يتعارض مع `N` «منتج جديد» (M04) و«تصنيف جديد» (M05) على نفس الشاشات. |
> | T080 | عدّادات الشريط الجانبي ما زالت من `dashboard/counters` (FR-49.11) والصفحة الكاملة/Web Push (P2) غير مبنية | خارج نص T080 («المركز الأساسي»). |
> | T081 | `scripts/visual-check.ts` يستثني مدخلات Base UI المخفية (`position: fixed` بحجم 1px) من فحص 44px | هي وكلاء نماذج مخفية لـ Checkbox/Switch لا أهداف لمس، مثل استثناء رابط التخطي القائم. |

### 3E — M34 إعدادات المتجر (`rp/08-settings-before|after`)

- [ ] T082 [US1] وسم `rp/08-settings-before`
- [X] T083 [P] [US1] شِيمات `src/features/settings/schemas.ts` (StoreSetting من data-model §4 بلا أسرار؛ FX `sar_to_yer_old 140`, `sar_to_yer_new 520`, `usd_to_sar 3.75`; `timezone`, `week_start_day sunday|monday`) + mocks + handlers `src/app/api/bff/settings/{identity,contact,policies,shipping,currency,seo,announcement,payments,multi-location}/route.ts`
- [X] T084 [US1] مركز الإعدادات `dashboard/settings/page.tsx` (فهرس بطاقات نصية غير متماثلة) + صفحات `settings/{identity,contact,policies,shipping,currency,seo,announcement,payments}/page.tsx` بنماذج RHF/Zod، حفظ تلقائي حيث يناسب، `fx_preview` بـ `<Money>`, قائمة المناطق الزمنية من `Intl.supportedValuesOf('timeZone')`, تعدد المواقع مع 409 مقروء
- [X] T085 [US1] فحص Playwright `docs/visual-checks/34-settings/`؛ lint + tsc؛ commit + `rp/08-settings-after`

> **تعديل الخطة — المرحلة 3E (2026-10-18).** نُفِّذت T083–T084، وبوابات T085 (lint · tsc · `scripts/settings-check.ts` 22/22 · الفحص البصري) ناجحة. الوسم في T082 والـ commit في T085 بيد المالك (لا shell على جهازه من هذه الجلسة). التفصيل في `execution_log.md`.
>
> | المهمة | الانحراف | السبب |
> |---|---|---|
> | T082 | لم يُنشأ `rp/08-settings-before` | أوامر git على جهاز المالك غير متاحة من الجلسة؛ سياسة المالك الجديدة خطية (commit + push في نهاية المرحلة) بلا وسوم. |
> | T084 | `/dashboard/settings` فهرس نصّي بقيمة كل قسم الحالية، لا تحويل إلى `/identity` | نص T084 («فهرس بطاقات نصية غير متماثلة») أحدث من M34 §6. |
> | T084 | قسم تعدد المواقع على `/dashboard/settings/locations` ومحوّله `settings/multi-location` | M34 §6 يسمّي الصفحة `locations`، وT083 يسمّي المحوّل `multi-location`. |
> | T084 | روابط الشريط «معلومات التواصل» و«الصفحات الإضافية» و«أسعار الصرف» و«إعدادات SEO» صارت تفتح أقسام المركز | نموذج واحد ومسار واحد لكل إعداد؛ المجموعات وعناوينها في الشريط كما هي. |
> | T084 | الأقسام الحساسة (الشحن، العملات، الدفع، المواقع) للمالك فقط؛ النصّية للمالك و«مدير المتجر/الفرع» | لا مفتاح `settings.*` بين الـ 35 (M34 §10)؛ الشحن أُلحق بالحساسة لأنه مالي وصريح الحفظ. |
> | T084 | تنسيق سياسة الاسترجاع نصّي خفيف (`##` عنوان، `-` قائمة، سطر فارغ فقرة) يُعرض عناصر React لا HTML | «محرّر نص بسيط» دون حقن HTML؛ إن خزّن Django HTML يلزم محوّل. |
> | T084 | إبطال كاش `/api/v1/config/` (FR-34.12) = تحديث اسم المتجر في الهيكل فوراً ودمج الحقول في fixture الإعداد | دوال المتجر المكاشة (`cacheTag(storeTag)`) تُبنى في المرحلة 4؛ هناك يُضاف `revalidateTag`. |
> | T084 | «تعديلان من تبويبين» (M34 §8) غير مطبّق | لا `version` في عقد الإعدادات. |
> | T084 | `seo_og_image` يُرسل data URL في JSON | العقد multipart؛ المحوّل الحقيقي يحوّله عند وصول الـ endpoint. |

**Checkpoint US1**: السلسلة الكاملة (`/` → متجر → منتج → طلب مكتمل) تعمل بالـ mocks؛ قائمة `[NEEDS BACKEND]` المستهلكة موثَّقة في تقرير التسليم.

---

## Phase 4: User Story 2 — المشتري يتصفح ويشتري (Priority: P1) · M09 M10 M11 M12 M41 M44 (`rp/07-storefront-before|after`)

**Goal**: متجر بهوية التاجر، PDP، سلة جانبية بالكوكي، دفع صفحة واحدة، تتبع، PWA.

**Independent Test**: شراء كامل على 390px ≤ 90s، LCP ≤ 2.5s، سلة تبقى عبر الصفحات، 0 تمرير أفقي.

- [ ] T086 [US2] وسم `rp/07-storefront-before`
- [X] T087 [P] [US2] شِيمات Ready في `src/features/storefront/schemas/{config,catalog,cart}.ts` (contracts/ready-api-v1 #1–#7) + دوال خادمية مكاشة `src/features/storefront/api/{config,catalog}.ts` (`'use cache'`, `cacheLife('minutes')`, `cacheTag(storeTag(store))`, `store` وسيط أول) + mocks للـ passthrough عند غياب Django
- [X] T088 [P] [US2] محرّك الثيم `src/features/storefront/theme/{tokens.ts,apply-theme.tsx}`: `brand_shades` → `--primary/--primary-foreground/--secondary/--background/--foreground/--border` على جذر `_s/[store]`؛ 11 خطاً عربياً عبر `next/font/google` بتحميل كسول حسب `heading_font`/`body_font`؛ 9 presets كبيانات في `presets.ts` معلَّمة بالمصدر
- [X] T089 [US2] الرئيسية `src/app/(storefront)/_s/[store]/page.tsx` + مُصيِّر الأقسام `src/features/storefront-home/components/sections/{hero,category-strip,featured-products,latest-products,slider,banner-grid,product-grid,promotional-offers}.tsx` بترتيب التاجر، `show_on_mobile=false` يُخفي على `< md`, شريط الإعلان بسرعاته، رأس المتجر (شعار، بحث، سلة بعدّاد، تبديل العملة `?currency=` sticky), شريط سفلي للجوال، بطاقة منتج `product-card.tsx` (شارات محلية «نفدت الكمية»/«تخفيض»، `payment_policy`), قائمة منتجات مفلترة `c/[id]/page.tsx` و`search/page.tsx` بـ nuqs وترقيم خادمي
- [X] T090 [US2] PDP `src/app/(storefront)/_s/[store]/p/[id]/page.tsx` + `src/features/pdp/components/*`: معرض (`next/image`, lazy ما عدا الأولى), اختيار `sizes_list/colors_list` (Ready) ثم `attributes/variants` (`[NEEDS BACKEND]` بـ mock), سياسة الدفع (`deposit_required` → «المطلوب الآن/المستحق عند الاستلام»), كمية بحدود، «أضف للسلة» بـ `POST /api/v1/cart/actions/` + فتح السلة الجانبية، تقييمات/مرتبطة/حزم/تخصيص/مزاد/فترات (mocks)، JSON-LD `Product`, `generateMetadata`
- [X] T091 [US2] السلة `src/features/cart/*`: `Sheet` جانبي (بداية في RTL) بحالة Zustand `src/stores/cart-ui.ts` + TanStack `['store', store, 'cart']`, أسطر بـ `display_*`, +/−/حذف (`add|decrease|remove_line`), إفراغ، كوبون (`/api/bff/cart/coupon` mock), شريط «المتبقي للشحن المجاني», التقاط هاتف للسلة المتروكة، صفحة `/cart` كاملة للجوال؛ تحديث متفائل مع تراجع عند الخطأ
- [X] T092 [US2] الدفع `src/app/(storefront)/_s/[store]/checkout/page.tsx` + `src/features/checkout/*`: صفحة واحدة (معلومات → توصيل/استلام → دفع → مراجعة) بـ RHF/Zod `CheckoutDraft`, `delivery-options`/`payment-options`/`quote` (mocks)، فاتورة `display_*` حيّة، COD OTP وOTP محفظة/شروة باي كـ Dialog 6 خانات، الهدية، الحجز `start_datetime`, إرسال `POST /api/bff/checkout` → `next_action` (none/redirect_gateway/show_transfer_instructions) → `checkout/success/[public_uuid]/page.tsx` برقم الطلب ورابط التتبع وإرفاق إيصال
- [X] T093 [P] [US2] M41 التتبع `src/app/(storefront)/_s/[store]/track/[uuid]/page.tsx` (`/api/bff/orders/track/<uuid>` mock): الحالتان، خط زمني للشحنات، كود الاستلام، زر واتساب التاجر، استطلاع 60s؛ `noindex`
- [X] T094 [P] [US2] M44 PWA: `manifest.webmanifest/route.ts` من `/config/` (الاسم، `theme_color` من `primary_color`، أيقونات مولَّدة `icon/route.tsx` 192/512 بـ `ImageResponse`), `sw.js/route.ts` بالسياسة المقررة (R-16), تسجيل SW في layout المتجر فقط بعد `ready`, `install-prompt.tsx` (`beforeinstallprompt` + تلميح iOS) يرسل `POST /api/v1/pwa/install-event/` بـ `source:'nextjs_app'`, اشتراك Push اختياري (`/api/v1/push/*` Ready)
- [X] T095 [US2] فحص Playwright `docs/visual-checks/{09-storefront-home,10-pdp,11-cart,12-checkout,41-tracking,44-pwa}/` + Lighthouse mobile للرئيسية وPDP (≥ 90/95) + اختبار السلة عبر إعادة التحميل + تبديل العملة؛ lint + tsc؛ commit + `rp/07-storefront-after`

> **تعديل الخطة — المرحلة 4 (2026-10-18).** نُفِّذت T087–T094. بوابات T095: lint ✅ · tsc ✅ · `scripts/storefront-check.ts` **41/41** ✅ · الفحص البصري **72 لقطة** في الأقسام الستة (0 أخطاء console، 0 تمرير أفقي، كل هدف جوال ≥ 44px) ✅ · تراجعات 3C/3D/3E (`tenant-shell` 9 · `settings` 23 · `catalog-orders` 22) ✅. T095 أُغلقت بعد تحسين الأداء (التقسيم الكسول — الجدول أدناه)؛ الـ commit بيد المالك. التفصيل في `execution_log.md`.
>
> | المهمة | الانحراف | السبب |
> |---|---|---|
> | T086 | لم يُنشأ `rp/07-storefront-before` | سياسة المالك خطية (commit + push في نهاية المرحلة) بلا وسوم، ولا git من الجلسة. |
> | T087 | `getProducts` يعيد 404 «نتيجةً» لا استثناء؛ أنواع الأقسام غير المعروفة تُسقَط مع `console.warn` | الصفحة بعد الأخيرة تصحّح الرابط بتحويل (M09 §8)؛ قسم جديد في Django لا يكسر الرئيسية. |
> | T088 | 10 عائلات عبر `next/font/local` (WOFF2 عربي 400/700) بـ `preload:false`، والحادية عشرة IBM Plex الخاصة بالمنصة؛ لا `next/font/google` | R-07: محمّل Google يفشل في هذه البيئة. القيم الحرفية إلزامية في خيارات المحمّل. |
> | T088 | لا وضع داكن على صفحات المتجر (`dark:` مستثنى تحت `[data-store-theme]`) | لوحة التاجر هي المرجع؛ الوضع الداكن يقلب ألوانه. اللقطات `*-dark` تتحقق من ذلك. |
> | T089 | تفضيل العملة كوكي `sharwa_currency` يضعه الخادم + `?currency=` يُحترم ويُحدَّث إن وُجد، ولا يُضاف إلى كل رابط | رابط مشاركة لا يفرض عملة المرسل؛ السلة تُثبَّت بـ `GET /api/v1/cart/?currency=` (Ready). |
> | T089 | «لا نتائج» في البحث يُسجَّل محلياً فقط | لا endpoint لإحصاءات البحث في العقد. |
> | T090 | المفضلة محلية (Zustand persist) و`wishlist/toggle` mock | لا جلسة مشترٍ في Ready API. |
> | T090 | أيام الحجز تبدأ من اليوم؛ mock المنتجات يتجاهل `image_url` على نطاقات `.invalid` | لا حجز في الماضي؛ الصورة الميتة في الـ seed كانت تُنتج أخطاء console. |
> | T090 | تعديل الـ seed: «خاتم فضة» منشور (تخصيص)، «دهن عود كمبودي» قالب `landing_page` بعربون 100 | لتغطية قالب الهبوط ومسار العربون بلقطات وفحص. |
> | T092 | الطلب يُخزَّن بالريال السعودي مع سعر مقفل `fx_from_sar`، ويُعرض بعملة العرض | لا تحويل في المتصفح؛ الطلبات السابقة لا تتأثر بتغيّر الأسعار (M34). |
> | T092 | لا خريطة: الموقع من `navigator.geolocation` فقط | لا مزوّد خرائط مقرّر ولا مفتاح. |
> | T092 | `customers/otp/send` endpoint **مقترح** | OTP المشتري خارج الدفع (تقييم، تنبيه التوفر) غير موجود في العقد. |
> | T093 | المسار `/track/[uuid]` (نص المهمة) لا `/orders/track/...` (M41) | M06 يربط `tracking_url` بهذا المسار منذ 3D. |
> | T094 | «إشعار تجريبي» للتاجر (US-44.5) غير مبني | يتبع لوحة M44 في الداشبورد (مرحلة لاحقة). |
> | T095 | Lighthouse mobile بعد التقسيم الكسول (`next/dynamic` + مراقبة الظهور): PDP وسيط **91** (91–94)، الرئيسية 89 (82–92)، منتج ثانٍ 86، القسم 84؛ إمكانية الوصول/أفضل الممارسات/SEO 100 | القياس محاكى (Lantern) على CPU الحاوية بتذبذب ±8؛ LCP المرصود 0.25–0.5s. الطابق الثابت: React + Next ≈ 113KB gz، zod ≈ 31KB؛ خط Amiri 98KB بقرار التاجر. التفصيل والقياس على جهاز المالك في `execution_log.md`. |
> | — | `await connection()` في layout المتجر و`getTracking` | fetch غير مكاش (الـ probe) كان يُبلَّغ في dev كـ `Date.now()` أثناء مرحلة prefetch؛ نفس نمط مجموعتي الداشبورد والتسجيل. |
> | — | غلاف `ThemeProvider` في الجذر يجعل سكربت next-themes data block عند الرسم في المتصفح | `notFound()` قبل الـ shell يرسل وثيقة خطأ تُرسم كاملة في المتصفح فيحذّر React «Encountered a script tag». |
> | — | `scripts/visual-check.ts`: input داخل `<label>` ارتفاعه ≥ 44px مُعفى | الـ label هو منطقة اللمس. |

**Checkpoint US2**: جلسة شراء كاملة بالـ mocks (وبـ Django إن توفر لـ config/catalog/cart).

---

## Phase 5: User Story 3 — إدارة يومية على نطاق أوسع (Priority: P2) · M07 M08 M13 M14 M15 M18 M19 M21 M22 M24 M25 M35 M42 (+M48/M49 توسعة)

**Goal**: كل وحدة P2 مستقلة بقصصها؛ المعيار المشترك: قائمة ≥ 500 صف < 1s بفلاتر في الرابط، كل إجراء محجوب بسبب مقروء.

**Independent Test**: لكل وحدة لقطات 3 مقاسات + داكن + حالات (فراغ/خطأ/بلا صلاحية/ميزة معطّلة) وسيناريو قبولها من مواصفتها.

لكل وحدة أدناه ثلاث مهام ثابتة: (أ) شِيمات + mocks + handlers لكل صفوف §7؛ (ب) الشاشات والمكوّنات حسب §6 بالحالات الخمس (FR-011)؛ (ج) فحص بصري + lint/tsc + وسم `*-after`. الوسم قبل البدء `rp/NN-<slug>-before` ضمن (أ).

- [X] T096 [P] [US3] M07 العملاء (أ): `src/features/customers/schemas.ts` (Customer من data-model §4)، mocks، `src/app/api/bff/customers/**` (قائمة، ملف، طلبات، محفظة، نقاط، أمنيات، تقييمات، ملاحظات، COD، تصدير، شرائح) · وسم `rp/09-customers-before`
- [X] T097 [US3] M07 (ب): `dashboard/customers/page.tsx` (جدول مشتق بفلاتر الشرائح/الثقة/الإنفاق) + `customers/[phone]/page.tsx` (ملف: ثقة منصة/متجر، طلبات، محفظة، نقاط، أمنيات، تقييمات، ملاحظات، إيقاف COD بصلاحية `customers.edit_profile`, تصدير مع 429 عند `critical`)
- [X] T098 [US3] M07 (ج): `docs/visual-checks/07-customers/` + `rp/09-customers-after`
- [X] T099 [P] [US3] M08 مخصّص الثيم (أ): شِيمات (`StorefrontDesignForm`, presets, sections Ready), mocks لـ `store/theme`, `store/theme/presets`, `store/announcement`; passthrough `/api/v1/admin/sections/*` (Ready، تحفّظ المصادقة موثَّق) · وسم `rp/10-theme-before`
- [X] T100 [US3] M08 (ب): `dashboard/design/page.tsx` بلوحة تحكم بداية (presets كبطاقات حدود 1px بعينة ألوان، 5 ألوان، خطّان، `design_style`, شعار، شريط الإعلان) ومعاينة حيّة نهاية في `iframe` لصفحة المتجر مع تطبيق المتغيرات فوراً عبر `postMessage`؛ بناء الأقسام بالسحب (`@dnd-kit`) مع `reorder`/إضافة/حذف/تحرير `settings`/`content_data` لكل `section_type`؛ «نشر» منفصل عن المعاينة
- [X] T101 [US3] M08 (ج): `docs/visual-checks/08-theme/` + `rp/10-theme-after`
- [X] T102 [P] [US3] M13 التسويق (أ): شِيمات Coupon/PromotionalOffer/AbandonedCart/Campaign/MarketingEvent/Loyalty/Gift (enums حرفياً)، mocks، `src/app/api/bff/marketing/**` · وسم `rp/11-marketing-before`
- [X] T103 [US3] M13 (ب): `dashboard/marketing/page.tsx` (ملخص Bento) + `marketing/{coupons,offers,abandoned-carts,campaigns,timeline,loyalty,gifting}/**` (قوائم بجدول مشترك، نماذج، معاينة الحملة بعدد المستلمين، تقويم الجدول الزمني بألوان دلالية فقط)
- [X] T104 [US3] M13 (ج): `docs/visual-checks/13-marketing/` + `rp/11-marketing-after`
- [X] T105 [P] [US3] M14 الدفع والمحافظ (أ): شِيمات Gateway/PayoutAccount/MerchantWallet/Withdrawal/Dues، mocks، `src/app/api/bff/{payments,wallet,store/payments}/**` · وسم `rp/12-payments-before`
- [X] T106 [US3] M14 (ب): `dashboard/payments/{gateways,payout-accounts,wallet,withdrawals,dues}/page.tsx` (اعتمادات سرّية بحقول «اترك فارغاً للإبقاء»، مفاتيح Sharwa Pay/التحويل اليدوي، أرصدة 4 عملات بلا جمع، حركات بمرجع، طلب سحب بحساب)
- [X] T107 [US3] M14 (ج): `docs/visual-checks/14-payments/` + `rp/12-payments-after`
- [X] T108 [P] [US3] M15 الشحن (أ): شِيمات DeliveryMethod/PickupLocation/ShippingProvider/Carrier/Zones/Packaging/EdgeCases، mocks، `src/app/api/bff/shipping/**` · وسم `rp/13-shipping-before`
- [X] T109 [US3] M15 (ب): `dashboard/shipping/{settings,delivery-methods,pickup-locations,providers,carriers,zones,packaging,zone-review,edge-cases}/**` + إجراءات الشحنة (تحديث عنوان أثناء النقل، تحويل إلى استلام بـ `version`)
- [X] T110 [US3] M15 (ج): `docs/visual-checks/15-shipping/` + `rp/13-shipping-after`
- [X] T111 [P] [US3] M18 الموظفون والصلاحيات (أ): شِيمات StaffMember/Role/Permission/Assignments/Overrides/Sessions/Approvals/AuditLog/BehaviorAlert، mocks، `src/app/api/bff/{staff,roles,permissions,approvals,audit-log,behavior-alerts}/**` · وسم `rp/14-staff-before`
- [X] T112 [US3] M18 (ب): `dashboard/staff/**` (قائمة، تفاصيل، إنهاء/إبطال الجلسات، تعيينات موقع×دور، استثناءات مع «الصلاحيات الفعلية»), `staff/roles` (مصفوفة 35 صلاحية × أدوار، النظامية للقراءة), `staff/approvals` (حسم بـ `version`), `staff/audit-log` (+ تحقق السلسلة), `staff/behavior-alerts`؛ تطبيق إخفاء/تعطيل في الشريط ولوحة الأوامر وفق `permissions[]`
- [X] T113 [US3] M18 (ج): `docs/visual-checks/18-staff/` + اختبار موظف `orders.view` فقط + `rp/14-staff-after`
- [X] T114 [P] [US3] M19 النطاقات والربط (أ): شِيمات Domain/Tracking/WebhookEndpoint/Delivery/IntegrationStatus، mocks (كلها Absent)، `src/app/api/bff/{domains,store/tracking,webhooks,integrations}/**` · وسم `rp/15-domains-before`
- [X] T115 [US3] M19 (ب): `dashboard/settings/{domains,tracking,webhooks,integrations}/**` (سجلات DNS بـ `<Mono dir=ltr>` ونسخ، تحقق/أساسي/حذف، البكسلات العشرة مع `has_*` للأسرار، نقاط Webhook بسرّ يُعرض مرة، سجل التسليم وإعادة الإرسال)
- [X] T116 [US3] M19 (ج): `docs/visual-checks/19-domains/` + `rp/15-domains-after`
- [X] T117 [P] [US3] M21 المخزون (أ): شِيمات (StockMovement reasons، InventoryItem، Reservation)، mocks، `src/app/api/bff/inventory/**` · وسم `rp/16-inventory-before`
- [X] T118 [US3] M21 (ب): `dashboard/inventory/{page,movements,items,reservations}.tsx` (جدول مخزون بتعديل في مكانه `delta|new_quantity` + سبب، دفتر حركات بمرجع، طلب إعدام عبر الموافقات، عدّادات منخفض/نافد)
- [X] T119 [US3] M21 (ج): `docs/visual-checks/21-inventory/` + `rp/16-inventory-after`
- [X] T120 [P] [US3] M22 المواقع (أ): شِيمات Location (8 أعلام، 4 ملكيات، تفاصيل شرطية)، mocks، `src/app/api/bff/locations/**` · وسم `rp/17-locations-before`
- [X] T121 [US3] M22 (ب): `dashboard/locations/**` (تبديل الوضع، قائمة بـ `display_type`, نموذج بأقسام شرطية حسب الأعلام، مخزون الموقع، موظفو الموقع، قواعد التوجيه بالسحب، تحذير التعطيل بالأثر)
- [X] T122 [US3] M22 (ج): `docs/visual-checks/22-locations/` + `rp/17-locations-after`
- [X] T123 [P] [US3] M24 المرتجعات (أ): شِيمات ReturnRequest/RMA (Ready معظمها)، passthrough `/api/v1/returns/*`, `/warehouse/returns/*`, mocks لقائمة RMA وسجل الاسترجاعات والموثوقية · وسم `rp/18-returns-before`
- [X] T124 [US3] M24 (ب): `dashboard/returns/{page,new,[id],rma,rma/[id],refunds}.tsx` (إنشاء من طلب بعناصر قابلة للإرجاع، اعتماد/رفض بـ `version` و409 و`CashLiquidityError` مقروء، RMA: مسح استلام وقرار QA)
- [X] T125 [US3] M24 (ج): `docs/visual-checks/24-returns/` + `rp/18-returns-after`
- [X] T126 [P] [US3] M25 التقارير (أ): شِيمات Registry (42/10 فئات حرفياً)/ReportData/ExportJob/Schedule، mocks، `src/app/api/bff/reports/**` · وسم `rp/19-reports-before`
- [X] T127 [US3] M25 (ب): `dashboard/reports/page.tsx` (فهرس 10 فئات، «قريباً» للمعلَّمة `*`), `reports/[code]/page.tsx` (ملخص Mono مع مقارنة، Recharts أحادي، جدول مرقّم، فترة/مقارنة/موقع في الرابط، تصدير csv/xlsx بمهمة واستطلاع), `reports/exports`, `reports/schedules`; شجرة التقارير في الشريط من `registry`
- [X] T128 [US3] M25 (ج): `docs/visual-checks/25-reports/` + `rp/19-reports-after`
- [X] T129 [P] [US3] M35 محافظ العملاء والولاء (أ): شِيمات، mocks، `src/app/api/bff/{customers/wallets,loyalty}/**` · وسم `rp/20-wallets-before`
- [X] T130 [US3] M35 (ب): `dashboard/customers/wallets/**` (قائمة بمجاميع، إنشاء، تفاصيل، تعبئة/تسوية بـ `idempotency_key`, حركات) + `dashboard/customers/points/**` + قراءة برنامج الولاء
- [X] T131 [US3] M35 (ج): `docs/visual-checks/35-wallets/` + `rp/20-wallets-after`
- [X] T132 [P] [US3] M42 الأمنيات والتقييمات (متجر) (أ): شِيمات، mocks، `src/app/api/bff/{shopper/phone,wishlist,catalog/products/[id]/{reviews,back-in-stock},store-reviews}/**` · وسم `rp/21-engagement-before`
- [X] T133 [US3] M42 (ب): `src/features/engagement/*` (قلب الأمنيات على البطاقة وPDP بهاتف الجلسة، صفحة `/wishlist`, نموذج تقييم بـ OTP، «أعلمني عند التوفر», تقييم المتجر في التذييل) + إشعار التوفر
- [X] T134 [US3] M42 (ج): `docs/visual-checks/42-engagement/` + `rp/21-engagement-after`

> **تعديل الخطة — المرحلة 5 (2026-10-18).** نُفِّذت T096–T134 بالـ mocks (13 وحدة). بوابات: lint ✅ (0 أخطاء، 0 تحذيرات) · tsc ✅ · فحوص الوحدات الوظيفية (تشغيل متتالٍ واحد على خادم أُعيد تشغيله): M07 27 · M08 26 · M13 30 · M14 40 · M15 29 · M18 22 · M19 34 · M21 27 · M22 25 · M24 30 · M25 41 · M35 26 · M42 28 ✅ · لقطات بصرية في 13 مجلداً تحت `docs/visual-checks/` ✅ · تراجعات المراحل السابقة (`tenant-shell` 9 · `catalog-orders` 22 · `settings` 23 · `onboarding` 33 · `storefront` 41، 0 أخطاء console) ✅. الـ commit بيد المالك. التفصيل في `execution_log.md`.
>
> | المهمة | الانحراف | السبب |
> |---|---|---|
> | T096 | بيانات العملاء = طلبات M06 (120) + سجل مجمّع لطلبات أقدم يصل إلى نحو 2000 عميل | بدونه تبقى شريحة «خامل» فارغة ولا يتحقق اختبار الـ2000 |
> | T097 | تبويب الطلبات يعرض طلبات M06 فقط مع سطر «يظهر هنا N من أصل M؛ الأقدم مؤرشفة» | السجل التاريخي مجمّع بلا صفوف |
> | T097 | المستوى السلوكي من `session.behavior`؛ الـ429 في الوهمي بـ`?simulate=critical` | لا موظف وهمي بمستوى critical |
> | T097 | الملاحظات تحتاج `customers.view`؛ الرد على التقييم وإيقاف/تفعيل COD يحتاجان `customers.edit_profile` | المواصفة لا تحدد |
> | T097 | ربط التقييم بالعميل في جدول خاص بـM07 | صفوف التقييمات لا تحمل هاتفاً |
> | T097 | بحث المنتج بـ`?q=` لا `?search=` | اسم المعامل الفعلي في M04 |
> | T097 | الهاتف المقنَّع = عميل كل طلباته من amazon/noon (`traffic_source`) | الحقل المميز لطلبات الأسواق في M06 |
> | T098 | لا لقطة لحالة «بلا صلاحية» أو «الميزة معطّلة» | الكاشير يملك `customers.view` و`customer_report` |
> | T100 | ترتيب/إخفاء الأقسام في المعاينة بورقة CSS لا بنقل عقد DOM؛ القسم الجديد وتعديل المحتوى يظهران بعد النشر | تجنّب أخطاء hydration؛ الهوية والشريط والترتيب والظهور حيّة |
> | T100 | مكوّن الربط في المتجر أُضيف بسطرين (import + عنصر) | لا يمكن تصيير المكوّن دون استيراده |
> | T100 | محررات الأقسام والهوية مربوطة بمسودة Zustand مع تحقق Zod يدوي لا react-hook-form | كل ضغطة تحدّث المعاينة فوراً (FR-08.01) |
> | T100 | `hero` يحرَّر بـ {title, subtitle, cta_text, link} | الحقول هي ما يقرؤه M09 |
> | T100 | تغيير `design_style` يحوّل `theme_preset` إلى `custom` | القالب = القيم الثماني مجتمعة |
> | T100 | القسم المفرد معطّل في «إضافة قسم» فقط إن وُجد | قاعدة المفرد = فريد |
> | T100 | صور السلايدر تُرسل data URL داخل JSON في الـ mock | لا عقد رفع صور للأقسام |
> | T100 | معاينة الخطوط بوجوه `next/font/local` تُحمَّل عند فتح القائمة فقط | US-08.2.1 |
> | T104 | `/marketing/bar` يعيد التوجيه إلى `/dashboard/settings/announcement`، والمركز يضع رابطاً نصياً | الشريط إعداد واحد يملكه M34 |
> | T103 | `?segment=&product_id=` في `/campaigns/new` تُقرأ في المتصفح (nuqs) | إعادة كتابة المستأجر لا تمرّر الاستعلام إلى صفحة الخادم |
> | T102 | كود كوبون المؤثر `readOnly` لا `disabled` | سلوك `disabled` في react-hook-form |
> | T104 | شريط الحدث لا يقل عن 5 أيام عرضاً، والتواريخ الحقيقية في التلميح والـSheet | حدث اليوم الواحد لا يُقرأ عنوانه |
> | T103 | «آخر حملة» في المركز هي الأحدث إرسالاً أو إنشاءً ولو مسودة | المواصفة لا تحدد |
> | T106 | المسارات `/dashboard/payments` و`/payments/gateways/[code]` و`/payments/payout-accounts` و`/wallet` و`/wallet/withdrawals(/new)` و`/wallet/dues`، مع صفحات تحويل للمسارات القديمة | المحفظة مجموعة مستقلة في الشريط |
> | T105 | `GET /wallet/` يعيد زيادة: `available` و`display_reserved` و`pending_withdrawals` | FR-14.04 تحقق محلي «≤ المتاح» وتحذير المحجوز |
> | T105 | `GET /wallet/dues/` يعيد زيادة: `commission_enabled` و`counts` | ملاحظة «العمولات غير مفعّلة» وعدد البنود |
> | T105 | وصف حقول البوابة يحمل `value` للحقول غير السرّية فقط | US-14.1.2 |
> | T105 | `GET /store/payments/` يُضاف ويحمل `active_payout_accounts` | تحذير US-14.2.1 |
> | T105 | حركة المحفظة تحمل `currency` و`amount` الموقّع | YER_OLD وYER_NEW بالرمز نفسه |
> | T107 | لم يُنشأ وسما `rp/12-payments-before/after` | git ممنوع على المنفّذ |
> | T109 | الإعدادات على `/dashboard/shipping` نفسها، و`/delivery-methods` صفحة مستقلة بنفس المكوّن | حسب موجز الوحدة |
> | T108 | طرق التوصيل ونقاط الاستلام بحالة خاصة بكل متجر بُذرت من ثوابت M06، لكن mock الدفع (`storefront/checkout.ts`) ما زال يقرأ ثوابته | يلزم توحيدهما لاحقاً |
> | T108 | الأسعار المبذورة بـ YER_NEW | US-15.1 |
> | T109 | الخريطة مخطط SVG تجريدي بلا بلاطات | FR-15.08 |
> | T109 | تحرير النطاق المحظور بإدخال الإحداثيات مع معاينة SVG | لا خريطة أساس |
> | T109 | «تُدار من المنصة» ملاحظة داخل الصفحة | لا مسار دعم للتاجر |
> | T109 | شريط الأرقام في الحالات الحدّية هو التبويبات | تجنّب التكرار |
> | T109 | التحويل إلى استلام يغيّر الشحنة في mock الوحدة ولا يغيّر طلب M06 | `orders/state.ts` مشترك |
> | T109 | صفوف الحالات الحدّية تفتح `/dashboard/orders?order=<id>` | صفحة الشحنة في M39 لاحقاً |
> | T112 | العدّاد يعرض «n من 34» لا 35 | `PERMISSION_KEYS` فيها 34 مفتاحاً؛ المواصفة تمنع اختراع الناقص |
> | T112 | مصفوفة التعيينات والجدول الأسبوعي صفوف مكدّسة على الجوال | منع التمرير الأفقي على 390px |
> | T113 | منع الموافقة الذاتية يُثبت في فحص الوحدة عبر استدعاء mock مباشر | جلسة الكاشير بلا `staff.view`؛ والمالك ليس صفّ موظف |
> | T113 | لقطة forbidden بجلسة الكاشير تعرض «الميزة غير متاحة» | خطة الجلسة بلا `staff_rbac`؛ بوابة الميزة تسبق الصلاحية |
> | T112 | حذف دور مستخدم يعيد 403 مع قائمة الموظفين | المواصفة لا تحدّد الرمز |
> | T115 | أدوات التتبع على `/dashboard/marketing/tracking` لا `settings/tracking` | المواصفة §6 والشريط الحالي |
> | T115 | النطاقات قائمة و Sheet (`?domain=<id>`) بلا صفحة `/domains/[id]` | القائمة لا تتجاوز 6 صفوف |
> | T115 | تفاصيل نقطة النهاية صفحة كاملة `/webhooks/[id]` بلا Sheet | سجل التسليم بفلاتر وترقيم |
> | T114 | أُضيف إلى IntegrationStatus الحقول `group` و`available` و`detail` | FR-19.08 |
> | T114 | حدث `webhook.test` إضافي في سجل التسليم | نتيجة الحدث التجريبي تظهر في السجل |
> | T114 | المحجوز (`www, api, admin, app`) يُرفض كأول جزء في النطاق المخصص | تطبيق حرفي للموجز — بانتظار قرار المالك بشأن `www` |
> | T114 | `PATCH` للرمز بقيمة `null` يحذفه | الرمز للكتابة فقط |
> | T121 | صفحتا «موقع جديد» وتعديل الموقع مقصورتان على مالك المتجر (`session.kind === "merchant"`) لا على مفتاح صلاحية | لا يوجد مفتاح `locations.*` بين المفاتيح الـ35؛ الـBFF يطبّق القيد نفسه (403) |
> | T121 | المخزون على الجوال بطاقات بدل جدول | الجدول يتجاوز عرض 390px |
> | T121 | تعديل الكمية عبر `POST /api/bff/locations/[id]/inventory/adjust` لا عبر `inventory/adjustments` | ليبقى M22 مستقلاً عن M21 |
> | T122 | ترتيب القواعد بالسحب وبزرّي ↑↓، والحفظ فوري مع إعادة القائمة عند الفشل | الوصول بلوحة المفاتيح؛ الخادم يعيد ترقيم الأولويات |
> | T121 | أيام ساعات العمل تُعرض حسب `week_start_day` وتُرسل بترقيم 0 = الأحد | يطابق عقد الخادم |
> | T126 | علامة `*` في §5 على 6 أكواد والاختبار يطلب 7 معطّلة؛ جُعل `whatsapp_costs` بحالة `coming_soon` | تناقض في المواصفة |
> | T126 | خريطة §5 تجعل تقارير `core` تتطلب مفتاح فئة، فـ`reports.view` وحدها لا تُظهر `core` | طُبّقت الخريطة حرفياً |
> | T126 | فحص «reports.view فقط» على الدالة `canOpenReport` لا عبر الواجهة | لا ملف موظف بميزة `reports` |
> | T127 | الجدول على الجوال بطاقات مع قائمة ترتيب 44px | رؤوس `DataTable` 32px |
> | T127 | «اليوم» = يوم UTC على الخادم والعميل | تفادي اختلاف hydration |
> | T127 | اختصار ⌘K «تقرير: <عنوان>» لم يُبنَ | يتبع M48 |
> | T128 | انتهاء صلاحية الملف في الـMock بعد 3 قراءات للحالة لا 24 ساعة | ليصل إليه سكربت الفحص |
> | T132 | قائمة الأمنيات صارت على الخادم مرتبطة برقم الهاتف بدل القائمة المحلية؛ مخزن Zustand نسخة عاكسة فقط | FR-42.01/03؛ أُبقيت `useWishlistIds`/`hydrateWishlist` |
> | T133 | إرسال تقييم المنتج يبقى عبر OTP (`customers/otp/send`) مع تعبئة الرقم؛ لوحة الرقم بلا OTP للأمنيات فقط | قرار المالك 2026-10-18 |
> | T132 | لوحة «رقم هاتفك» تُركَّب داخل الزر بدل غلاف المتجر | `storefront-chrome.tsx` خارج ملكية الوحدة |
> | T134 | تقييم المتجر يُنشر فوراً في المحاكاة دون OTP | لا عقد إشراف بعد — `[NEEDS BACKEND]` |
> | T132 | إزالة منتج غير منشور من القائمة مسموحة، وحفظه يُرفض بـ404 | ليحذف المشتري «لم يعد متاحاً» |
> | T117–T118 | التراجع عن التعديل في المكان يتم بإبطال الاستعلام لا بنسخة محلية؛ بلا عمود هامش (التكلفة فقط)؛ صفحة الإعدام تعرض كل الطلبات وتقرأ من طابور الموافقات المشترك | الخادم مصدر الأرقام؛ الهامش غير موجود في العقد؛ الإعدام موافقة M18 |
> | T129–T130 | أرقام 966 المحلية تُطبَّع إلى 967 (اليمن)؛ الصف يُفتح بـ Enter أو زر «فتح» فقط؛ لقطة «بلا صلاحية» تعرض «الميزة معطّلة» | سوق المنصة يمني؛ الصف يحمل إجراءات؛ ملف الكاشير بلا `customer_wallets` |
> | T123–T125 | الجدول الزمني للإرجاع مكوّن محلي بشكل جدول M06، والقرارات تُكتب في `timeline` الطلب أيضاً؛ الرفض يرسل `note`؛ المسح وقرار QA يقبلان `inventory.adjust` أيضاً؛ `returns/options` لقائمة المواقع؛ عدّادات الشريط بخمسة طلبات `?status=`؛ ⌘K «إرجاع: #» غير منفذ | M06 لا يصدّر الجدول؛ US-24.3؛ الفاعل «أمين المخزن»؛ قائمة M22 للمالك فقط؛ DRF بلا عدّادات؛ M48 |
> | T096–T134 | لم تُنشأ وسوم `rp/09…21-*-before/after` | سياسة المالك خطية (commit + push في نهاية المرحلة) بلا وسوم، ولا git من الجلسة |
> | — | دمج: عدّادا الشريط `pending_approvals`/`unread_behavior_alerts` صارا حيّين من طابور M18 وتنبيهاته (كانا ثابتين 3 و2+1) | الشارة والكتلة والشاشات لا تختلف |
> | — | دمج: عدد جمهور الحملة (M13) = عدد شريحة العملاء (M07)؛ ⌘K للعميل يفتح `/dashboard/customers/<phone>` | كان M13 يعدّ هواتف طلبات M06 فقط |
> | — | دمج: روابط أمر الشراء من الموافقات والحركات → `/dashboard/suppliers/purchase-orders/<id>` (لم تُبنَ بعد) | مسار واحد لوحدة الموردين اللاحقة |
> | — | دمج: إعدادات «الربط والتكاملات» (النطاقات، Webhooks، التكاملات، التتبع) مجموعة في `SettingsShell` تُخفى بنودها المقصورة على المالك عن الموظف | ليست أقسام M34 (بلا حفظ صريح) |
> | — | دمج: `CheckoutScreen` يعرض الهيكل حتى اكتمال الإماهة | السلة قد تُحلّ عبر مشترك آخر قبل إماهة حدّ Suspense فيختلف HTML الخادم والعميل |

> **قرارات المالك — المرحلة 5 (2026-10-19، فُوِّضت كلها).** (1) الشاشات المقصورة على المالك تبقى كذلك بلا مفاتيح جديدة، وتُخفى عن الموظف في الشريط و⌘K (`isStoreOwner` + `ownerOnly`)؛ (2) ملف «مدير المتجر» الوهمي (`manager`، منى القحطاني، `967770000004`، الخطة كاملة + 27 مفتاحاً)؛ (3) يُقبل `www.` وأي اسم فرعي على نطاق التاجر نفسه، ويبقى نطاق المنصة مرفوضاً؛ (4) M25 بلا تغيير: 6 «غير متاح بعد» + `whatsapp_costs` «قريباً»، ومفاتيح الفئات فوق `reports.view`؛ (5) سطح تعديل واحد لمفاتيح الدفع: `/dashboard/payments`، وقسم الإعدادات ملخص للقراءة برابط؛ (6) حالة الشحن M15 مصدر واحد للدفع والتتبع وطلبات M06؛ (7) سجل passthrough يستبدل بالمفتاح. بوابات: lint ✅ · tsc ✅ · `phase5-decisions-check` 24 ✓ · تراجعات 9/23/22/41/33 ✅. التفصيل في `execution_log.md`.

**Checkpoint US3**: كل وحدة P2 تُفحص وحدها؛ تقرير التسليم يذكر صفوف `[NEEDS BACKEND]` المستهلكة.

---

## Phase 6: User Story 4 — مالك المنصة (Priority: P2) · M20 M45 M46 (`rp/22-admin-before|after`)

**Goal**: لوحة `console.<base>` تغطي العمليات اليومية بلا Django admin.

**Independent Test**: إعادة تجهيز متجر فاشل، تفعيل ميزة لمتجر، قبول شحن محفظة، تحصيل مستحق — كلها بالـ mocks.

- [ ] T135 [US4] وسم `rp/22-admin-before`
- [X] T136 [P] [US4] شِيمات M20/M45/M46 في `src/features/platform-admin/schemas/*.ts` (Client, Plan, Subscription, Feature, Override, App, Dues, SharwaPay requests, Zones, MarketCategory, WebhookEvent, Deactivation — enums حرفياً من data-model §5) + mocks `src/mocks/platform/*.ts` + handlers `src/app/api/bff/{platform,admin}/**` لكل صفوف §7
- [X] T137 [US4] هيكل `src/app/(admin)/_a/layout.tsx` (نفس الشريط/الشريط العلوي بمحتوى الإدارة، مصادقة admin عبر BFF mock) + `page.tsx` نظرة عامة (إجمالي المتاجر/المبيعات/الطلبات Mono، المتاجر الفاشلة، آخر 50 متجراً)
- [X] T138 [US4] المتاجر `_a/stores/**` (قائمة بفلاتر الحالة/الخطة، تفاصيل، إعادة تجهيز بتحديث حيّ `provisioning→ready`, تبديل شروة شيب، تجاوزات الميزات لكل متجر ومجمَّع، دورة التعطيل، أحداث Webhook المعلّقة)
- [X] T139 [US4] M46 `_a/{plans,features,subscriptions,apps,billing-settings,market-categories}/**` (مصفوفة خطة×ميزة، فحص الحسم بـ `decided_by`, تعيين اشتراك، مفتاحا `subscriptions_enabled`/`commission_enabled`)
- [X] T140 [US4] M45 `_a/dues/**` (نظرة عامة بالإيراد، تفاصيل متجر بالعملات، 8 إجراءات بـ `{detail, level}` و409 «تم التعامل معه مسبقاً»، إعفاء/إلغاء إعفاء) + Sharwa Pay `_a/sharwa-pay/{topups,withdrawals,wallets}/**` + مناطق شروة شيب
- [X] T141 [US4] فحص Playwright `docs/visual-checks/{20-admin,45-dues,46-plans}/`؛ lint + tsc؛ commit + `rp/22-admin-after`

---

> **تعديل الخطة — المرحلة 6 (2026-10-19).** نُفِّذت T136–T141 بالـ mocks على `console.<base>`. بوابات: lint ✅ · tsc ✅ · `admin-shell` 23 · `admin-stores` 35 · `admin-billing` 53 · `admin-money` 58 ✅ (تشغيلان متتاليان على خادم أُعيد تشغيله، 0 أخطاء console) · تراجعات المراحل السابقة ✅. التفصيل في `execution_log.md`.
>
> | المهمة | الانحراف | السبب |
> |---|---|---|
> | T135 | بلا وسم `rp/22-admin-before` | سياسة المالك خطية بلا وسوم |
> | T136 | كل الصفوف تحت `/api/v1/platform/*` بمحوِّل BFF واحد `platform/[...path]` بدل `/api/v1/admin/*` في M45/M46 | `/api/bff/admin/*` محجوز لأقسام المتجر (M08)، وجسر الجهاز لا يكتب أعمق من 7 مجلدات |
> | T136 | حالة المنصة مصدر واحد: ميزات جلسة التاجر (FR-46.04) ومناطق شروة شيب (M15) وفئات السوق (M02) تُقرأ منها | SC-20.4: صفر اختلاف بين اللوحة وحساب الخادم |
> | T137 | المسارات بلا بادئة `/admin` و`/master-dashboard` (`/dues`، `/plans`…) | النطاق `console.` يقولها؛ جذر واحد للوحة |
> | T138 | إجراء «إعادة التفعيل» من المعلَّق/المعطَّل (لا من المغلق) | تعليق بلا رفع طريق مسدود — قرار مفتوح للمالك |
> | T138 | تسوية العهدة في الـ mock = لا مستحقات معلّقة ورصيد محفظة صفري | الحقل غير موصوف في الـ discovery — قرار مفتوح |
> | T139 | القوائم القصيرة جداول كثيفة بلا `DataTable` | لا ترقيم خادمي لها |
> | T140 | محفظة العميل على `/wallets/[phone]` لا `/sharwa-pay/wallets/[phone]` | حد عمق جسر الجهاز (7 مجلدات) |
> | T140 | الإيصال إطار نصي بالمفتاح والمبلغ ورقم الحوالة مع «تكبير» | الـ mock يحمل مفتاحاً لا صورة؛ بلا طلبات خارجية |
> | T140 | اختصار `C` في المستحقات لم يُبنَ | اختياري في المواصفة |

## Phase 7: User Story 5 — القنوات والامتدادات المتقدمة (Priority: P3) · M16 M17 M23 M26–M33 M36–M40 M43

**Goal**: كل وحدة P3 تتكامل مع M06/M21 دون تضارب حالات.

**Independent Test**: سيناريوهات قبول كل وحدة من مواصفتها بالـ mocks (أو Ready: M36, M38) + لقطات.

نفس النمط (أ) شِيمات/mocks/handlers + وسم before · (ب) الشاشات · (ج) فحص + وسم after.

- [X] T142 [P] [US5] M16 POS (أ): شِيمات CashRegister/Shift/Movement/OTPChallenge، mocks، `src/app/api/bff/pos/**` · `rp/23-pos-before`
- [X] T143 [US5] M16 (ب): `src/app/(pos)/_p/[store]/pos/**` (تخطيط مستقل بلا شريط اللوحة: فتح وردية بـ `opening_float`, شاشة بيع بعمودين — بحث/باركود + سلة Mono، خصم بحد الدور، دفع نقدي/محفظة، إيصال للطباعة، درج الكاش بالحركات، إغلاق بالفرق والموافقة، 428 OTP step-up)
- [X] T144 [US5] M16 (ج): `docs/visual-checks/16-pos/` + `rp/23-pos-after`
- [X] T145 [P] [US5] M17 المسوقون والمؤثرون (أ): شِيمات، mocks، `src/app/api/bff/{affiliates,influencers}/**` · `rp/24-affiliates-before`
- [X] T146 [US5] M17 (ب): `dashboard/marketing/{affiliates,influencers}/**` (أداء بـ Mono، رابط `?aff_id=` بالـ host، مبيعات بحالة الدفع وتعليم جماعي «مدفوعة»)
- [X] T147 [US5] M17 (ج): `docs/visual-checks/17-affiliates/` + `rp/24-affiliates-after`
- [X] T148 [P] [US5] M23 الموردون وأوامر الشراء (أ): شِيمات (PO 6 حالات)، mocks، `src/app/api/bff/{suppliers,purchase-orders}/**` · `rp/25-procurement-before`
- [X] T149 [US5] M23 (ب): `dashboard/suppliers/**`, `dashboard/purchase-orders/**` (مسودة بسطور، إرسال للموافقة، حسم بـ `version`, استلام جزئي، إلغاء، خط زمني)
- [X] T150 [US5] M23 (ج): `docs/visual-checks/23-procurement/` + `rp/25-procurement-after`
- [X] T151 [P] [US5] M26 الحجوزات (أ): شِيمات (weekday 0=Monday ⚠)، mocks، `src/app/api/bff/bookings/**` + `catalog/products/[id]/slots/**` · `rp/26-bookings-before`
- [X] T152 [US5] M26 (ب): `dashboard/bookings/{page,services,services/[id]/availability}.tsx` (تقويم أسبوعي بحدود 1px، نوافذ توفر، إلغاء) + منتقي الموعد في PDP/الدفع (`hold` → `held_until`)
- [X] T153 [US5] M26 (ج): `docs/visual-checks/26-bookings/` + `rp/26-bookings-after`
- [X] T154 [P] [US5] M27 الصندوق الموحَّد والقنوات (أ): شِيمات Conversation/Message/Keyword/Template/CatalogSync، mocks، `src/app/api/bff/{channels,inbox}/**` · `rp/27-inbox-before`
- [X] T155 [US5] M27 (ب): `dashboard/inbox/**` (ثلاثة أعمدة: محادثات/رسائل/سياق العميل والطلب؛ استطلاع `?after=`؛ ردّ بقالب/منتج؛ إسناد/حالة؛ تحويل إلى طلب) + `dashboard/channels/**` (حالة Meta/TikTok/Telegram، OAuth كتحويل، محفّزات، قوالب، مزامنة الكتالوج، ربط فئات، وصول الموظفين)
- [X] T156 [US5] M27 (ج): `docs/visual-checks/27-inbox/` + `rp/27-inbox-after`
- [X] T157 [P] [US5] M28 الأسواق (أ): شِيمات Listing/SyncJob/Settings/MarketplaceOrder، mocks، `src/app/api/bff/marketplaces/**` · `rp/28-marketplaces-before`
- [X] T158 [US5] M28 (ب): `dashboard/marketplaces/**` (حالة أمازون/نون، إعدادات بمعاينة سعر، قوائم بمعرّفات وتجاوز سعر ودفع جماعي، مهام بالأخطاء CSV، طلبات الأسواق وتأكيد الشحنة)
- [X] T159 [US5] M28 (ج): `docs/visual-checks/28-marketplaces/` + `rp/28-marketplaces-after`
- [X] T160 [P] [US5] M29 الدروبشيبينغ (أ): شِيمات SupplierConnection/PricingRule/SupplierProduct/Feed/SupplierOrder (10 حالات)، mocks، `src/app/api/bff/dropshipping/**` · `rp/29-dropshipping-before`
- [X] T161 [US5] M29 (ب): `dashboard/dropshipping/**` (موردون، قواعد تسعير بمحاكاة، كتالوج المورد واستيراد، معالج الملفات: رفع → ربط أعمدة → معاينة → اعتماد → تشغيل → أخطاء، طلبات الموردين، مهام)
- [X] T162 [US5] M29 (ج): `docs/visual-checks/29-dropshipping/` + `rp/29-dropshipping-after`
- [X] T163 [P] [US5] M30 متجر التطبيقات + M31 شروة AI + M32 الدعم (أ): شِيمات App/Installation/Usage/Template/SupportSession/SupportTicket، mocks، `src/app/api/bff/{apps,support}/**` · `rp/30-apps-support-before`
- [X] T164 [US5] M30/M31/M32 (ب): `dashboard/apps/**` (كتالوج بحالة التثبيت، تثبيت/تفعيل/تعطيل، أحداث، رسوم؛ واتساب: استخدام/قوالب/رابط الربط؛ شروة AI: حالة/إعدادات/رمز SSO), `dashboard/support/{sessions,sessions/[id],tickets,tickets/[id]}/**` (خط زمني رسائل/أدوات، استيلاء/إفراج/إغلاق بـ `version`, تذاكر بعدّادات)
- [X] T165 [US5] M30/M31/M32 (ج): `docs/visual-checks/{30-apps,31-ai,32-support}/` + `rp/30-apps-support-after`
- [X] T166 [P] [US5] M33 المصروفات (أ): شِيما (4 فئات)، mocks، `src/app/api/bff/expenses/**` · `rp/31-expenses-before`
- [X] T167 [US5] M33 (ب): `dashboard/expenses/page.tsx` (مجمَّعة بالشهر بمجاميع لكل عملة بلا جمع عبر العملات، إنشاء، بلا تعديل/حذف حتى توفر العقد)
- [X] T168 [US5] M33 (ج): `docs/visual-checks/33-expenses/` + `rp/31-expenses-after`
- [X] T169 [P] [US5] M36 الجملة B2B (أ): passthrough Ready `/api/v1/orders/b2b-*` + شِيمات، mocks لأسعار الكميات والمساومة · `rp/32-b2b-before`
- [X] T170 [US5] M36 (ب): `dashboard/orders/b2b/**` (مسودة بعميل/أسطر/معتمد/فرع، قائمة المعلّقة، حسم بـ `version` و403 اعتماد ذاتي مقروء) + أسعار الكميات في نموذج المنتج وPDP + مسودات المساومة
- [X] T171 [US5] M36 (ج): `docs/visual-checks/36-b2b/` + `rp/32-b2b-after`
- [X] T172 [P] [US5] M37 الحزم/التخصيص/المزادات (أ): شِيمات، mocks، `src/app/api/bff/products/[id]/{bundle-components,compatibility-rules,personalization-fields,auction,serials}/**` + `catalog/products/[id]/bids` + `products/formula-preview` · `rp/33-bundles-before`
- [X] T173 [US5] M37 (ب): تبويبات في نموذج المنتج (مكوّنات الحزمة، قواعد التوافق، حقول التخصيص بالسحب، إعدادات المزاد، أكواد تسلسلية، معاينة المعادلة) + PDP (محدد الحزمة، نموذج التخصيص الديناميكي، المزايدة بـ 409 مقروء، السعر بالمعادلة)
- [X] T174 [US5] M37 (ج): `docs/visual-checks/37-bundles/` + `rp/33-bundles-after`
- [X] T175 [P] [US5] M38 تطبيق المندوب (أ): passthrough Ready `/api/v1/agent/*` + شِيمات + mocks لـ `agent/{shipments,me,custody}` · `rp/34-courier-before`
- [X] T176 [US5] M38 (ب): `src/app/(courier)/_c/[store]/agent/**` (تخطيط جوال أولاً بأهداف 48px: بدء/إنهاء/تسليم مناوبة، شحناتي بالحالة، تفاصيل بأحداث، مسح باركود بالكاميرا (`BarcodeDetector` مع سقوط لإدخال يدوي), نقل حالة بـ `client_generated_uuid` وجيولوكيشن، تسليم جزئي بتحصيل COD، دفتر العهدة Mono؛ عمل دون اتصال: طابور إجراءات في IndexedDB يُعاد إرساله)
- [X] T177 [US5] M38 (ج): `docs/visual-checks/38-courier/` (mobile + mobile-dark أساساً) + `rp/34-courier-after`
- [X] T178 [P] [US5] M39 شروة شيب (أ): شِيمات ShipmentOrder/Event/Zone/AWBQueue/RateCard، mocks، `src/app/api/bff/shipping/{sharwa-ship,shipments,awb-queue,rate-cards,supervisor,agents}/**` · `rp/35-sharwa-ship-before`
- [X] T179 [US5] M39 (ب): `dashboard/shipping/sharwa-ship/**` (طلبات بلا بوليصة بمعاينة الوزن القابل للتحصيل والمناطق، إصدار بوليصة، قائمة البوليصات بـ `billing_status`, تفاصيل بأحداث مع `out_of_order/flagged`, تعديل يدوي للحالة، طابور AWB، لقطات التسعيرة، إشراف وإعادة إسناد طارئة)
- [X] T180 [US5] M39 (ج): `docs/visual-checks/39-sharwa-ship/` + `rp/35-sharwa-ship-after`
- [X] T181 [P] [US5] M40 شروة باي (أ): شِيمات SharwaPayWallet/Transaction/Topup/Withdrawal، mocks، `src/app/api/bff/sharwa-pay/**` · `rp/36-sharwa-pay-before`
- [X] T182 [US5] M40 (ب): `src/app/(pay)/sharwa-pay/**` (دخول OTP بالهاتف، محفظة 4 عملات بلا جمع، حركات بالمصدر، طلب شحن multipart بإيصال، طلب سحب، طلباتي، خروج؛ `manifest.webmanifest` و`sw.js` مستقلان بسياسة «لا كاش» تحت `/sharwa-pay/`)
- [X] T183 [US5] M40 (ج): `docs/visual-checks/40-sharwa-pay/` + `rp/36-sharwa-pay-after`
- [X] T184 [P] [US5] M43 تجميع المتاجر (أ): شِيما، mock، `src/app/api/bff/merchant/stores/route.ts` · `rp/37-rollup-before`
- [X] T185 [US5] M43 (ب): `dashboard/stores/page.tsx` (جدول المتاجر بالطلبات/المكتمل/المسترد/الإيراد SAR Mono + مجاميع، فلتر تاريخ في الرابط) + مبدّل المتاجر في الشريط العلوي ولوحة الأوامر
- [X] T186 [US5] M43 (ج): `docs/visual-checks/43-rollup/` + `rp/37-rollup-after`

---

> **تعديل الخطة — المرحلة 7 (2026-10-19).** نُفِّذت T142–T186 بالـ mocks (17 وحدة). الوسوم `rp/23…37-*-before|after` لم تُنشأ (سياسة المالك خطية بلا وسوم)، وT144…T186 (ج) تعني الفحص + اللقطات فقط. بوابات: lint ✅ · tsc ✅ · 15 فحص وحدة (391 ✓، 0 أخطاء console) · تراجعات المراحل 2–6 القابلة للتشغيل ✅. التفصيل في `execution_log.md`.
>
> | المهمة | الانحراف | السبب |
> |---|---|---|
> | كل (أ) | محوِّل BFF واحد catch-all لكل وحدة (`[...path]` أو `[[...path]]`) + راوتر في `src/mocks/<module>/router.ts` | حد عمق جسر الجهاز (7 مجلدات)، ويصير passthrough بملف واحد يوم يُشحن Django |
> | T143 | `src/app/(pos)/%5Fp/…` ؛ لا مفتاح ميزة POS في الخطط الـ 39 → الدخول = الجلسة + إسناد الفرع (M22) | `_` مجلد خاص في Next؛ الكتالوج بلا ميزة POS |
> | T146 | كتابات المسوقين/المؤثرين للمالك فقط؛ `mark-paid` يقبل `dry_run` للمعاينة الخادمية | لا مفتاح صلاحية؛ FR-17.05 |
> | T149 | صفحة «أوامر الشراء» بند مستقل في الشريط بصلاحية `suppliers.manage` وحدها | `NavItem` يقبل صلاحية واحدة (المواصفة: manage أو approve) — قرار مفتوح |
> | T152 | مسار الحجز `catalog/products/[id]/slots` (POST = hold) بدل `…/slots/hold` | حد العمق |
> | T155/T158/T161 | القنوات تحت `/dashboard/channels/{social,marketplaces,dropshipping}` لا `/dashboard/{channels,marketplaces,dropshipping}` | مسارات `navigation.ts` هي المرجع |
> | T158 | إعدادات/قوائم السوق تبويبات `?tab=`، تفاصيل المهمة لوحة جانبية `?job=` | حد العمق |
> | T161 | حقول الموجز الـ 20 عرّفناها (إلزامية: `sku,name,cost,stock`)؛ أعمدة `.xlsx` ثابتة في الـ mock | غير موصوفة في الـ discovery |
> | T164 | التذاكر على `/dashboard/wallet/tickets`؛ شاشات جلسات M31 مدمجة في `/dashboard/support/sessions`؛ واتساب = `whatsapp_bot` | مسارات الشريط ورموز كتالوج المنصة |
> | T167 | المصروفات على `/dashboard/wallet/expenses` (للمالك فقط) | مسار الشريط؛ M33 §10 |
> | T170 | مسودات المساومة لم تُبنَ | المواصفة تخفيها حتى يتوفر العقد |
> | T173 | لقطات M37 في `docs/visual-checks/37-advanced-products/` | اسم مواصفة M37 |
> | T176 | التطبيق على `/agent` لا `/courier`؛ تسليم المناوبة برقم المندوب | `groupForStorePath` + tasks.md؛ لا قائمة مندوبين للمندوب |
> | T179 | `POST shipments/<id>/assign` امتداد mock | لا صف إسناد في §7 |
> | T182 | `manifest`/`sw.js` تحت `/sharwa-pay/` بنطاق `/sharwa-pay/`؛ الرابط من نطاق متجر يُحوَّل 308 لأصل المنصة | `/` على أصل المنصة هو الموقع التسويقي |
> | T185 | لقطات M43 في `docs/visual-checks/43-stores/`؛ المبدّل على الجوال يبقى قائمة منسدلة | — |

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T187 [P] قاعدة ESLint مخصصة لمفاتيح الكاش (FR-47.09) في `eslint-rules/tenant-cache-key.js`: ترفض `useQuery({queryKey:[...]})` لا يبدأ بـ `storeKey(` داخل `src/app/(storefront)|(dashboard)` و`src/features/**`
- [ ] T188 [P] تدقيق RTL شامل: `grep` للفئات الفيزيائية والأيقونات الاتجاهية بلا `rtl:rotate-180` (`ArrowLeft|ArrowRight|ChevronLeft|ChevronRight`) عبر `src/`؛ تصحيح النتائج
- [ ] T189 [P] تدقيق المبدأ I عبر كل `docs/visual-checks/**` (قائمة الفحص الكاملة) وتوثيق النتيجة في `docs/visual-checks/ANTI-AI-AUDIT.md`
- [ ] T190 [P] Lighthouse على `/`, المتجر الرئيسي, PDP, الطلبات (mobile preset) → `docs/lighthouse/*.json`؛ معالجة ما دون 90/95
- [ ] T191 [P] اختبار عزل المستأجرين الآلي `scripts/tenant-isolation-check.ts` (10 متاجر متناوبة في عملية واحدة، مقارنة `store_name` في كل استجابة، SC-009)
- [ ] T192 تحديث `README.md` و`specs/001-sharwa-frontend-platform/contracts/needs-backend-inventory.md` (إعادة توليد) + تقرير تسليم `docs/DELIVERY-REPORT.md` يسرد لكل وحدة: ما بُني، ما فُحص، الوسم، صفوف `[NEEDS BACKEND]` المستهلكة
- [ ] T193 تشغيل `quickstart.md` §4 كاملاً من بيئة نظيفة (`rm -rf .next && npm ci && npm run build && npm start`) وتوثيق النتيجة
- [ ] T194 وسم `rp/99-platform-after` نهائي + مراجعة الامتثال I–IX في `restore-points.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: بلا اعتماد — تبدأ فوراً.
- **Phase 2 (Foundational)**: تعتمد على Phase 1 — **تحجب** كل قصص المستخدم.
- **Phase 3 (US1)**: أجزاؤها بالترتيب 3A → 3B → 3C → 3D → 3E (3A مستقل بصرياً عن البقية؛ 3C يعتمد على 3B لصفحة الانتظار؛ 3D يعتمد على 3B للـ shell؛ 3E يعتمد على 3B).
- **Phase 4 (US2)**: تعتمد على 3B (layout المتجر والـ probe) فقط؛ يمكن أن تسبق 3D/3E إن أراد المالك.
- **Phase 5 (US3)**: تعتمد على 3B + 3D (الجدول المشترك، الطلبات، الصلاحيات).
- **Phase 6 (US4)**: تعتمد على Phase 2 + 3B (الـ shell) فقط.
- **Phase 7 (US5)**: تعتمد على 3D (الطلبات/المنتجات) و3B؛ M38/M40 تعتمدان على Phase 2 فقط.
- **Phase 8**: بعد كل القصص المطلوبة.

### User Story Dependencies

- **US1 (P1)**: بعد Phase 2؛ لا تعتمد على قصص أخرى.
- **US2 (P1)**: بعد 3B؛ تتكامل مع US1 (المنتجات/الطلبات تظهر في اللوحة) لكنها تُفحص وحدها بالـ mocks.
- **US3 (P2)**: بعد 3B/3D؛ كل وحدة مستقلة.
- **US4 (P2)**: بعد 3B؛ مستقلة.
- **US5 (P3)**: بعد 3D؛ كل وحدة مستقلة.

### Within Each Module

شِيمات + mocks + handlers → الشاشات والمكوّنات → الحالات الخمس → الفحص البصري → lint/tsc → وسم `*-after`.

### Parallel Opportunities

- Phase 1: T003–T008 متوازية بعد T002.
- Phase 2: T011, T013, T014, T016–T024 متوازية؛ T012 بعد T011؛ T015 بعد T014.
- 3A: T028–T030 ثم T032–T041 متوازية (ملفات مختلفة)؛ T042 بعدها؛ T043/T044 متوازية مع T042.
- Phase 5/7: كل وحدة مستقلة؛ مهام (أ) لكل الوحدات قابلة للتوازي.

---

## Parallel Example: 3A — M01

```bash
# بعد T027 (وسم before)، شغّل معاً:
Task: "T028 landing.content.ts"
Task: "T029 schemas/plans.ts + mocks/public/plans.ts + api/bff/public/plans + api/plans.ts"
Task: "T030 schemas/stats.ts + mocks/public/stats.ts + api/bff/public/stats"
# ثم معاً:
Task: "T032 site-header.tsx"  Task: "T033 start-form.tsx"  Task: "T034 hero.tsx + proof-bar.tsx"
Task: "T035 dashboard-preview.tsx"  Task: "T036 capabilities-bento.tsx + previews/*"  Task: "T037 how-it-works.tsx"
Task: "T039 faq.tsx"  Task: "T040 site-footer.tsx"  Task: "T041 reveal.tsx"
# ثم T038 (pricing) → T042 (page.tsx) → T043/T044 → T045 → T046 → T047
```

---

## Implementation Strategy

### MVP First (US1 — 3A الآن)

1. Phase 1 Setup → `rp/01-foundation-after`
2. Phase 2 Foundational → `rp/02-core-after`
3. 3A M01 الصفحة الترويجية → فحص Playwright → `rp/03-landing-after` → **عرض للمالك**
4. 3B → 3C → 3D → 3E بنفس الإيقاع (وسم، تنفيذ، فحص، وسم)

### Incremental Delivery

كل وحدة تُسلَّم بتقرير مقتضب: ما بُني، ما فُحص (اللقطات)، الوسم، صفوف `[NEEDS BACKEND]` المستهلكة. كلمة «استعادة» تعيد آخر `*-before`.

---

## Notes

- [P] = ملفات مختلفة بلا اعتماد. [Story] = قصة المستخدم في `spec.md`.
- لا كود خارج `src/features/<module>/` أو مجموعة مسار الوحدة أو `src/components/shared`/`src/lib` المشترك.
- كل enum حرفياً من `data-model.md`؛ كل عقد من `contracts/`؛ أي انحراف يعود إلى المواصفة أولاً (الدستور VI).
- commit بعد كل مهمة أو مجموعة منطقية؛ لا وسم `*-after` بلا لقطات + lint + tsc.
