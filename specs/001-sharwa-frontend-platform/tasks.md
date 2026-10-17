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

- [ ] T010 وسم `rp/02-core-before`
- [ ] T011 [P] `src/lib/tenant.ts` (خالص، بلا I/O): `RESERVED_SUBDOMAINS` (الـ 23 حرفياً من discovery 01 §1), `SUBDOMAIN_RE = /^[a-z0-9]+$/`, `normalizeHost(host)` (lowercase + strip port), `resolveTenant(host, base): TenantContext` (`platform|reserved|subdomain|custom_domain` + `group` + `storeHost`), `buildStoreUrl(sub, base, proto)`, `internalPrefixFor(group)` (`_s|_d|_p|_c|_a`); أنواع `TenantContext` من data-model §1
- [ ] T012 `src/proxy.ts` (يعتمد T011): `config.matcher` يستثني `_next/*`, `api/*`, الملفات الثابتة؛ يرفض `/_s|/_d|/_p|/_c|/_a` الواردة من الشبكة بـ 404؛ جدول إعادة الكتابة R-03 (`/dashboard/*→/_d/<store>/dashboard/*`, `/pos/*→/_p/…`, `/agent/*→/_c/…`, باقي مسارات المتجر→`/_s/<store>/*`, `console.<base>`→`/_a/*`, `admin.<base>`→308 إلى console)؛ يضع ترويسة طلب `x-sharwa-store`؛ مسارات المنصة تمرّ كما هي
- [ ] T013 [P] `src/lib/api-error.ts`: صنف `ApiError{status, detail?, fields?, retryAfter?, isMock}` + `parseApiError(res)` من `{detail}`/`{field:[msg]}`/`Retry-After` (contracts/bff-cross-cutting §4)
- [ ] T014 [P] `src/lib/bff/upstream.ts` (`import 'server-only'`): `upstreamFetch(path, init, {storeHost, csrfToken?})` يبني `${API_PROXY_URL ?? API_INTERNAL_URL}${path}`، ينسخ الكوكيز والترويسات المسموحة، يضيف `X-Store-Domain`/`X-Forwarded-Host`/`X-Forwarded-Proto`/`X-Real-IP`، يحقن `X-CSRFToken` للطرق غير الآمنة؛ `forwardResponse(res)` يعيد الجسم stream مع `Set-Cookie`/`Retry-After`/`Content-Type` كما هي
- [ ] T015 `src/app/api/v1/[...path]/route.ts` (يعتمد T014): GET/POST/PUT/PATCH/DELETE تمرير شفاف لكل `/api/v1/*`؛ `export const dynamic = 'force-dynamic'`؛ لا كاش، لا تحويل
- [ ] T016 [P] نظام الـ mocks في `src/mocks/runtime.ts`: `mockResponse(data, {status, delay})` يضيف `x-sharwa-mock: 1`؛ `isMocksOn()` من `env.SHARWA_MOCKS`؛ `notAvailable()` → 501 `{detail:'غير متاح بعد'}` حين `off`؛ مولّد fixtures عربي ثابت (seeded) في `src/mocks/_fixtures.ts` (أسماء، هواتف `9677…`, `display_price` بصيغة `1,250.00 ر.س`)
- [ ] T017 [P] `src/lib/api-client.ts` (client + server): `apiFetch<T>(path, schema: ZodType<T>, init)` نحو نفس الأصل (`/api/v1/*` أو `/api/bff/*`) مع `credentials:'include'`، تحقق Zod، تحويل الأخطاء إلى `ApiError`، إعادة محاولة واحدة عند 403 CSRF عبر `refreshCsrf()`؛ `ApiClientProvider` (client) يحمل `csrfToken` من prop خادمي؛ لا قراءة لـ `document.cookie`
- [ ] T018 [P] `src/lib/query-keys.ts` (`storeKey(store, ...parts)` → `['store', store, ...parts]`) + `src/lib/cache.ts` (`storeTag(store)` → `store:<store>`) + `src/components/providers/query-provider.tsx` (`QueryClientProvider` + `NuqsAdapter` من `nuqs/adapters/next/app`; defaults `staleTime 30s`, `retry 1`)
- [ ] T019 [P] `src/lib/format.ts`: `formatDate(iso, {timeZone})` بـ `Intl.DateTimeFormat('ar',{numberingSystem:'latn'})`, `formatRelative`, `normalizePhone` (0770… → 967770…), `maskPhone`; **بلا** أي تنسيق عملة
- [ ] T020 [P] `src/lib/access.ts`: `FEATURE_KEYS` (39) و`PERMISSION_KEYS` (35) حرفياً من data-model §1، أنواع `FeatureKey`/`PermissionKey`, `hasFeature(session, key)`, `hasPermission(session, key)`
- [ ] T021 [P] المكوّنات المشتركة في `src/components/shared/`: `money.tsx` (`<Money value: string>` → `font-mono tabular-nums` + `dir="ltr"`), `mono.tsx`, `empty-state.tsx` (نص + إجراء، بلا رسم), `error-state.tsx` (رسالة عربية + إعادة محاولة, يقبل `ApiError`), `page-header.tsx`, `visually-hidden.tsx`, `ltr.tsx` (`<span dir="ltr">` للأرقام/النطاقات)
- [ ] T022 [P] `src/components/shared/mock-indicator.tsx`: شريط 1px أمبر + نص «بيانات تجريبية» يظهر فقط في dev حين تحمل استجابة `x-sharwa-mock`؛ يُقرأ عبر `apiFetch` (يضبط علم في Zustand `src/stores/dev-flags.ts`)
- [ ] T023 [P] شِيمات مشتركة في `src/lib/schemas/`: `pagination.ts` (`paginated(schema)`), `money.ts` (`displayString`), `provisioning.ts` (`ProvisioningStatusSchema` من data-model §1), `store-config.ts` (`StoreConfigSchema` من contracts/ready-api-v1 #1 بالحقول الجاهزة + الموسّعة اختيارية)
- [ ] T024 [P] `src/app/api/bff/README.md` (اتفاق المسارات `/api/bff/<module>/<resource>` + وضعا `legacy|mock`) + handler نموذجي `src/app/api/bff/public/check-subdomain/route.ts` بوضع `legacy` (يمرّر إلى `${API}/register/check-subdomain/?subdomain=` ويعيد `{available, reason}`) مع سقوط إلى mock (`src/mocks/public/check-subdomain.ts`: محجوز/مستخدم لـ `demo`,`shop`, متاح لغيرها) حين `SHARWA_MOCKS=on` والخادم غير متاح
- [ ] T025 نقل مولّد الفهرس إلى `.specify/scripts/python/gen_contracts_inventory.py` (من scratchpad) وتوثيقه في `contracts/README.md`
- [ ] T026 بوابة الجودة: lint + tsc + فحص يدوي بـ Playwright MCP: `localhost:3000/_s/x` → 404، `demo.localhost:3000/_d/demo/dashboard` → 404 من الشبكة، ترويسة `x-sharwa-store` تصل (صفحة debug مؤقتة تُحذف)؛ commit + `rp/02-core-after` + `restore-points.md`

**Checkpoint**: الأساس جاهز — يمكن بدء قصص المستخدم.

---

## Phase 3: User Story 1 — التاجر يُطلق متجره ويبيع أول طلب (Priority: P1) 🎯 MVP

**Goal**: من `/` إلى أول طلب «مكتمل»: M01 → M47/M03 → M02 → M04/M05/M06 (+M48/M49 الأساسي) → M34.

**Independent Test**: السيناريو الكامل على بيئة mocks في ≤ 10 دقائق، لقطات على 3 مقاسات لكل وحدة، صفر تمرير أفقي، صفر أخطاء console.

### 3A — M01 الصفحة الترويجية (**المهمة 1** · `rp/03-landing-before|after`)

- [ ] T027 [US1] وسم `rp/03-landing-before`
- [ ] T028 [P] [US1] محتوى الصفحة في `src/features/landing/landing.content.ts` (FR-01.04): `hero{title ≤ 9 كلمات, subtitle ≤ 25 كلمة, cta:'ابدأ متجرك'}`, `proofStats[3]{label, value, unit, source:'static-2026-10'}` (قيم ثابتة مُعلَّمة حتى `GET /api/v1/public/stats/`), `capabilities[7]{key, title, body, size, preview}` بأحجام `8/4 · 4/4/4 · 6/6` (لا صفّان متتاليان متماثلان), `howItWorks[3]{num:'01|02|03', title, body}`, `faqs[6]{q, a}`, `footer{columns[], legal}`, `nav[]`; نصوص أفعال ملموسة فقط (FR-01.10) — ممنوع «أطلق العنان/ثورة/✨»
- [ ] T029 [P] [US1] شِيمات وعقود الخطط في `src/features/landing/schemas/plans.ts`: `PublicPlanSchema` (`code, name, is_free, price: string, currency: 'SAR'|'USD'|'YER_OLD'|'YER_NEW', billing_interval: 'monthly'|'yearly'|'lifetime', max_products: number|null, max_orders_per_month: number|null, features: string[]`), `PublicPlansResponseSchema{ subscriptions_enabled: boolean, plans: PublicPlan[] }`; mock `src/mocks/public/plans.ts` (الحالة الفعلية: `subscriptions_enabled:false`, خطة مجانية واحدة `is_default_free`) + handler `src/app/api/bff/public/plans/route.ts` (mock) + دالة خادمية `getPublicPlans()` في `src/features/landing/api/plans.ts` بـ `'use cache'` + `cacheLife('hours')`
- [ ] T030 [P] [US1] `src/features/landing/schemas/stats.ts` + mock `src/mocks/public/stats.ts` (`{stores, orders_30d}`) + handler `src/app/api/bff/public/stats/route.ts`؛ `getProofStats()` يسقط إلى قيم المحتوى الثابتة عند الفشل (بلا رسالة للزائر، `console.info` خادمي فقط)
- [ ] T031 [US1] تخطيط المجموعة `src/app/(marketing)/layout.tsx`: `QueryProvider`, `Toaster` (Sonner, `position="bottom-left"` ↔ bottom-start في RTL، `richColors=false`), حاوية `max-w-6xl`, `<SkipLink>`, تذييل مشترك؛ metadata: `title.template '%s · شروه'`, `description`, `openGraph{locale:'ar_SA', type:'website'}`, `alternates.canonical`
- [ ] T032 [P] [US1] الرأس `src/features/landing/components/site-header.tsx` (client): شعار نصي «شروه» (Mono للـ wordmark الإنجليزي `sharwa` بـ `dir="ltr"`), روابط `#capabilities #pricing #faq`, «دخول التاجر» → `/login`, زر «ابدأ متجرك» → `#start`; ثابت `sticky top-0`, شفاف → `bg-background/95 border-b` بعد 8px تمرير (IntersectionObserver على sentinel, لا scroll listener); على `< md` زر قائمة يفتح shadcn `drawer` من الأسفل بروابط 44px؛ `aria-label` لكل أيقونة Lucide
- [ ] T033 [P] [US1] نموذج البدء `src/features/landing/components/start-form.tsx` (client, RHF + Zod): حقل «اسم المتجر» (3–100 حرف، يقبل العربية والمسافات) + زر «ابدأ متجرك» بارتفاع 48px؛ حالات: افتراضي / خطأ تحقق تحت الحقل بـ `text-destructive` / جارٍ التحويل (`aria-busy`); عند الإرسال `router.push('/register?store_name=' + encodeURIComponent(name))` (عقد M02 US-02.1: معامل `store_name`)؛ `autoComplete="organization"`, `inputMode="text"`, `enterKeyHint="go"`
- [ ] T034 [P] [US1] Hero `src/features/landing/components/hero.tsx` (RSC): شبكة 12 عموداً غير مركزية: العنوان `text-5xl md:text-6xl font-semibold tracking-tight` بوزن ≤ 600 في 7 أعمدة بداية، نموذج البدء تحته، شريط الإثبات `proof-bar.tsx` بأرقام `<Mono>` كبيرة (`text-3xl`) وتسميات `text-muted-foreground text-sm` بفواصل عمودية 1px؛ لا تدرج، لا ظل، لا رسم توضيحي؛ above-the-fold على 390px (hero ≤ 100dvh)
- [ ] T035 [P] [US1] معاينة اللوحة `src/features/landing/components/dashboard-preview.tsx` (RSC): إطار نافذة بحد 1px `rounded-lg` بثلاث نقاط zinc-300، داخله **مكوّن مصغّر حقيقي** (لا صورة): شريط جانبي 160px بخمسة عناصر، شريط علوي 40px، 4 أرقام Mono (طلبات اليوم، الإيراد `display_*`, جديد، منخفض المخزون) وجدول 5 صفوف 44px بحدود أفقية فقط وشارة حالة ملوّنة بنقطة 6px + نص؛ بيانات من `landing.content.ts`؛ يُستبدل بـ M03 الفعلي لاحقاً (تعليق `// TODO(M03)`)
- [ ] T036 [P] [US1] شبكة القدرات `src/features/landing/components/capabilities-bento.tsx` (RSC): `grid-cols-12` على `≥ lg` بأحجام من المحتوى (`col-span-8/4`, `4/4/4`, `6/6`), بطاقات بحد 1px بلا ظل، كل بطاقة: عنوان 20px، نص ≤ 25 كلمة، و**معاينة واجهة حقيقية مصغّرة** من `previews/*.tsx` (جدول طلبات، نموذج متغيرات، خط زمني شحنة، بطاقة محفظة بـ Mono، قسيمة، شاشة POS، صندوق وارد) أو **رقم كبير Mono**؛ على `< lg` عمود واحد بارتفاعات متباينة (`min-h-[240px|320px]`)؛ لا أيقونات في دوائر ملونة، لا إيموجي
- [ ] T037 [P] [US1] «كيف يعمل» `src/features/landing/components/how-it-works.tsx` (RSC): 3 خطوات بأرقام `01/02/03` بـ `font-mono text-6xl text-muted-foreground/40`, عناوين ≤ 6 كلمات، فواصل 1px بين الخطوات (عمودية على الديسكتوب، أفقية على الجوال)
- [ ] T038 [US1] الأسعار `src/features/landing/components/pricing.tsx` (RSC async يعتمد T029): `subscriptions_enabled=false` أو لا خطط → عمود واحد «مجاني الآن — كل الميزات» بحد 1px وقائمة مزايا بنقاط 4px؛ وإلا جدول مقارنة واحد (أعمدة الخطط، صفوف `max_products`, `max_orders_per_month`, المزايا) بأرقام `<Mono>` محاذاة نهاية (`text-end`), يتحول على `< md` إلى `Tabs` (shadcn) لكل خطة؛ `<Suspense>` بـ skeleton صفّين (`pricing-skeleton.tsx`)
- [ ] T039 [P] [US1] الأسئلة `src/features/landing/components/faq.tsx`: shadcn `Accordion` (`type="single" collapsible`), 6 أسئلة، حدود أفقية 1px، `aria-expanded` من المكوّن، أيقونة `ChevronDown` بـ `rtl:` واعية (دوّار 180° عند الفتح فقط)
- [ ] T040 [P] [US1] التذييل `src/features/landing/components/site-footer.tsx` (RSC): 3 أعمدة روابط («المنصة»، «للتاجر»: دخول التاجر/شروة باي/المسوقون، «قانوني») + سطر الحقوق بـ `<Mono>` للسنة؛ حد علوي 1px؛ لا شعارات اجتماعية ملونة
- [ ] T041 [P] [US1] الحركة `src/features/landing/components/reveal.tsx` (client, `motion/react`): `whileInView` opacity 0→1 + y 8→0, 200ms ease-out, `once`, يُعطَّل كلياً بـ `useReducedMotion()` (الحالة النهائية مباشرة); يُغلّف الأقسام فقط لا العناصر الفردية
- [ ] T042 [US1] صفحة `src/app/(marketing)/page.tsx` (RSC، يعتمد T031–T041): ترتيب الأقسام Header · Hero · DashboardPreview · CapabilitiesBento (`id="capabilities"`) · HowItWorks · Pricing (`id="pricing"`) · FAQ (`id="faq"`) · Footer؛ فواصل بين الأقسام `py-16 md:py-24`؛ `scroll-margin-top` للمراسي؛ JSON-LD `SoftwareApplication` (`name, applicationCategory:'BusinessApplication', operatingSystem:'Web', offers{price:'0', priceCurrency:'SAR'}`) بـ `JSON.stringify(...).replace(/</g,'\\u003c')`؛ `generateMetadata` من المحتوى (FR-01.09)
- [ ] T043 [P] [US1] صورة OG `src/app/(marketing)/opengraph-image.tsx` بـ `ImageResponse` (1200×630، أرضية `#FAFAFA`، نص «شروه» وجملة الدعم بخط IBM Plex Sans Arabic المحمَّل من Google Fonts في وقت البناء، بلا تدرج)
- [ ] T044 [US1] دخول التاجر `src/app/(marketing)/login/page.tsx` + `src/features/landing/components/store-login-form.tsx` (client, US-01.4): حقل «نطاق متجرك» بـ `dir="ltr"` ولاحقة `.<base>` بـ `<Mono>`؛ تحقق محلي `SUBDOMAIN_RE` و`RESERVED_SUBDOMAINS` من `src/lib/tenant.ts`؛ عند الإرسال `GET /api/bff/public/check-subdomain?subdomain=` (T024): `available=false ∧ reason='مستخدم بالفعل'` ⇒ موجود → `window.location.assign(buildStoreUrl(sub)+'/dashboard/login')`؛ غير ذلك → «لم نجد متجراً بهذا الاسم» تحت الحقل مع رابط «أنشئ متجرك»؛ metadata `robots: noindex`
- [ ] T045 [US1] إمكانية الوصول والأداء (يعتمد T042): فحص Tab عبر كل الصفحة مع `focus-visible:ring-1 ring-ring` مرئي؛ `h1` واحد؛ كل صورة/معاينة بـ `alt`/`aria-label`؛ `prefers-reduced-motion` يُعطّل Reveal؛ لا تمرير أفقي 320–1920px (اختبار بـ Playwright MCP على 320/390/768/1024/1440/1920)؛ الخطوط `display:swap`؛ `next/image` لأي صورة (لا توجد صور خام حالياً)
- [ ] T046 [US1] فحص Playwright: `npm run visual-check -- --slug 01-landing --url http://localhost:3000/` → `docs/visual-checks/01-landing/{desktop,tablet,mobile,desktop-dark}.png` + لقطة `login.png` لصفحة `/login`؛ 0 أخطاء console؛ Lighthouse (Chrome DevTools MCP أو `npx lighthouse`) Performance ≥ 90 / Accessibility ≥ 95 على mobile preset، تُحفظ النتيجة في `docs/visual-checks/01-landing/lighthouse.json`
- [ ] T047 [US1] مراجعة المبدأ I يدوياً (قائمة: لا تدرج، لا ظل ملون، لا بطاقات متماثلة، لا إيموجي، لا عبارات عامة، لا رسوم جاهزة) وتوثيق «0 مخالفات» في `restore-points.md`؛ `npm run lint` + `tsc --noEmit`؛ commit `feat(landing): M01 marketing landing page` + `rp/03-landing-after`

**Checkpoint 3A**: الصفحة الترويجية قابلة للعرض للمالك؛ `/register` يستقبل `store_name` (يُبنى في 3C).

### 3B — M47 حلّ المستأجر + M03 هيكل اللوحة (`rp/04-tenant-shell-before|after`)

- [ ] T048 [US1] وسم `rp/04-tenant-shell-before`
- [ ] T049 [P] [US1] شِيمات M47 في `src/features/tenant/schemas.ts` (`ResolutionOutcome`, `ProvisioningStatusSchema` reuse) + `src/features/tenant/api/probe.ts`: `probeStore(storeHost)` ينادي `/api/v1/config/` عبر upstream ويعيد `{outcome, config?}` (404/403/503 → outcomes)؛ mock `src/mocks/tenant/config.ts` (متاجر `demo` ready, `pending1` 503, `closed` 403) + سلوك mock للـ passthrough `/api/v1/config/` حين `SHARWA_MOCKS=on` والخادم غير متاح
- [ ] T050 [P] [US1] صفحات الخطأ zinc في `src/app/(onboarding)/_errors/{store-not-found,store-inactive,store-provisioning}/page.tsx` + `layout.tsx` مستقل (`forcedTheme` نظام، `robots noindex`): 404 «لم نجد متجراً بهذا العنوان» + رابط `<base>/register`؛ 403 «هذا المتجر غير متاح حالياً» + زر واتساب المنصة 44px؛ 503 (`Retry-After: 10` عبر `headers()` في route segment) «جارٍ تجهيز متجرك» بمؤشر غير محدد 1px + خطوات نصية + زمن منقضٍ `<Mono>`
- [ ] T051 [US1] عميل الاستطلاع `src/features/tenant/components/provisioning-poller.tsx` (client, TanStack `refetchInterval` 3s → backoff 10s): مع `?t=` → `GET /api/bff/public/provisioning/<token>` (legacy adapter لـ `/register/status/<token>/`) وحالات `pending|provisioning|ready|failed`; بلا token → `HEAD /api/v1/config/` كل 10s؛ `ready` → «تم إنشاء متجرك» ثانيتان ثم `dashboard_url`؛ `failed` → رسالة نهائية + واتساب؛ بعد 5 دقائق «يستغرق وقتاً أطول»؛ توقف عند `visibilitychange` hidden واستئناف عند focus
- [ ] T052 [US1] تخطيط المتجر الجذري `src/app/(storefront)/_s/[store]/layout.tsx`: يقرأ `params.store`, ينادي `probeStore`, يحوّل outcomes إلى `notFound()`/صفحات الخطأ/503؛ يطبّق ثيم التاجر كمتغيرات CSS inline من `brand_shades` على `<div data-store-theme>`؛ `forcedTheme="light"`؛ `QueryProvider`؛ صفحة `page.tsx` مؤقتة «متجر {store_name}» (تُستبدل في Phase 4)
- [ ] T053 [P] [US1] عقود M03 في `src/features/dashboard-shell/schemas.ts`: `SessionSchema` (data-model §1 Session), `OverviewSchema`, `CountersSchema`, `AccountStoresSchema`; mocks `src/mocks/dashboard/{me,overview,counters,stores}.ts` + handlers `src/app/api/bff/dashboard/{me,overview,overview/refresh,counters}/route.ts` و`src/app/api/bff/account/stores/route.ts`
- [ ] T054 [P] [US1] مصادقة التاجر عبر BFF: `src/app/api/bff/auth/{csrf,merchant/login,staff/login,logout,setup-password,forgot-password,reset-password}/route.ts` بوضع `legacy` (POST إلى `/dashboard/login/` إلخ مع `X-CSRFToken` المقروء من `Set-Cookie` لـ GET سابق) + mock؛ `src/lib/csrf.ts` (`getCsrfToken()` خادمي)
- [ ] T055 [P] [US1] فهرس التنقل `src/features/dashboard-shell/navigation.ts`: 15 مجموعة الشريط حرفياً من discovery 01 §4 مع `feature?`/`permission?`/`keywords[]`/`shortcut?`/`comingSoon` (السجلات)؛ مصدر واحد لـ M03 وM48
- [ ] T056 [US1] هيكل اللوحة `src/app/(dashboard)/_d/[store]/dashboard/layout.tsx` + `src/features/dashboard-shell/components/{sidebar,topbar,mobile-nav,shell-skeleton}.tsx`: شريط جانبي 256px/56px rail بحد نهاية 1px (`[` للطيّ, حالة في Zustand `src/stores/shell.ts`), شريط علوي 48px بحد أسفل 1px (زر «بحث… Ctrl+K» placeholder، جرس placeholder، مبدّل المتاجر إن `stores.length>1`, قائمة المستخدم), محتوى `max-w-[1440px] px-6`; إخفاء عناصر بلا ميزة، تعطيل مع `Tooltip` بلا صلاحية؛ drawer بداية + شريط سفلي 4 مداخل على الجوال؛ `requireSession()` خادمي يحوّل إلى `/dashboard/login`
- [ ] T057 [P] [US1] شاشات الدخول `src/app/(dashboard)/_d/[store]/dashboard/{login,staff/login,forgot-password,reset-password,setup-password}/page.tsx` + نماذج RHF/Zod في `src/features/dashboard-shell/components/auth/*.tsx` (كلمة مرور ≥ 8، تطابق التأكيد، هاتف الموظف `dir=ltr`)، أخطاء `{field:[msg]}` تحت الحقول، `{detail}` فوق النموذج؛ تخطيط خارج الـ shell
- [ ] T058 [US1] النظرة العامة `src/app/(dashboard)/_d/[store]/dashboard/page.tsx` + `src/features/dashboard-shell/components/overview/*.tsx`: شريط 6 أرقام Mono (`today`) مع «تحديث» (`POST overview/refresh`) ووقت `refreshed_at`, Bento غير متماثل: الطلبات الجديدة (جدول 44px بمحورَي حالة), «يحتاج انتباهك» (4 عدّادات نصية), أفضل المنتجات, مصادر الزيارات (Recharts bar أحادي)؛ حالات skeleton/فراغ متجر جديد/خطأ لكل كتلة مستقلة
- [ ] T059 [US1] اختصارات لوحة المفاتيح `src/features/dashboard-shell/hooks/use-shortcuts.ts` (`G O/G P/G C`, `[`, `?` قائمة الاختصارات في Dialog, `Esc`)
- [ ] T060 [US1] فحص Playwright: `docs/visual-checks/47-tenant-guard/` (404, 403, provisioning, ready, failed على desktop/mobile/mobile-dark) + `docs/visual-checks/03-dashboard-shell/` (login, overview, rail, mobile drawer، داكن)؛ اختبار متجرَين متناوبين (`demo` و`shop2`) يقارن `store_name` 10 مرات؛ 0 console errors؛ lint + tsc؛ commit + `rp/04-tenant-shell-after`

### 3C — M02 معالج التأسيس (`rp/05-onboarding-before|after`)

- [ ] T061 [US1] وسم `rp/05-onboarding-before`
- [ ] T062 [P] [US1] شِيمات `src/features/onboarding/schemas.ts` (`RegistrationDraft` من data-model §2، `MarketCategorySchema`, `RegisterResponse{otp_token, ttl_seconds, masked_phone}`, `VerifyResponse{status_token, status_url}`, `ResendResponse`) + محتوى `src/features/onboarding/onboarding.content.ts` (نص الشروط)
- [ ] T063 [P] [US1] mocks + handlers: `src/mocks/public/{market-categories,register,verify-otp,resend-otp}.ts` و`src/app/api/bff/public/{market-categories,register,register/verify-otp,register/resend-otp,provisioning/[token]}/route.ts` (الأخير `legacy` إلى `/register/status/<token>/`؛ mock يتقدم `pending→provisioning→ready` كل استدعاءَين)
- [ ] T064 [US1] اللوحة 01 `src/app/(onboarding)/register/page.tsx` + `src/features/onboarding/components/register-form.tsx`: 4 حقول + موافقة؛ `store_name` مُعبَّأ من `?store_name=`؛ `merchant_phone` بـ `dir=ltr` وتطبيع؛ `subdomain` مع اقتراح لاتيني من الاسم وفحص حيّ بعد 400ms عبر `/api/bff/public/check-subdomain` يعرض السبب الحرفي أو «متاح» بـ `text-success`؛ القطاعات كـ chips قابلة للتبديل؛ زر معطّل حتى الصلاحية؛ حالة المعالج في Zustand `src/stores/onboarding.ts` (لا بيانات شخصية في الرابط FR-02.10)
- [ ] T065 [US1] اللوحة 02 `src/app/(onboarding)/register/verify/page.tsx` + `otp-form.tsx`: 6 خانات `inputMode=numeric` بـ `<Mono>`, عدّاد TTL Mono, «إعادة الإرسال» مع `Retry-After`, أخطاء 400/410/429 بالعربية؛ عند النجاح `router.replace('/register/status/' + status_token)` ويضع cookie قصيرة العمر `sharwa_prov` على `<base>` (M47 US-47.3.2)
- [ ] T066 [US1] اللوحة 03 `src/app/(onboarding)/register/status/[token]/page.tsx` تعيد استعمال `provisioning-poller.tsx` (T051) بنمط المنصة؛ عند `ready` تحويل إلى `dashboard_url` مع `?t=` مرة واحدة
- [ ] T067 [US1] فحص Playwright `docs/visual-checks/02-onboarding/` (النموذج 390/1440، OTP، الانتظار، النجاح، الفشل، داكن)؛ تدفق كامل بالـ mocks ≤ 60s؛ lint + tsc؛ commit + `rp/05-onboarding-after`

### 3D — M04 المنتجات · M05 التنظيم · M06 الطلبات · M48 لوحة الأوامر · M49 التنبيهات (`rp/06-catalog-orders-before|after`)

- [ ] T068 [US1] وسم `rp/06-catalog-orders-before`
- [ ] T069 [P] [US1] `src/components/shared/data-table/*` (TanStack Table 8): صفوف 44px، رأس ثابت، حدود أفقية فقط، أعمدة رقمية `text-end font-mono`, كثافة قابلة للتبديل، تحديد متعدد مع شريط إجراءات جماعية (معاينة بالعدد)، حالة الفلاتر/الترتيب/الترقيم عبر `nuqs`, حالات skeleton/فراغ/خطأ/بلا صلاحية
- [ ] T070 [P] [US1] شِيمات M04 `src/features/products/schemas/*.ts` (Product كاملاً بكل enums من data-model §4 حرفياً: `payment_policy cod|deposit|full`, `unit` 14, `product_type physical|digital|service`, `pricing_type fixed|formula`, `hazard_class`; VariantAttribute `field_type`/`data_type`; ProductVariant; ProductTemplate) + mocks `src/mocks/products/*.ts` (60 منتجاً عربياً، 3 سمات، قوالب) + handlers `src/app/api/bff/products/**` لكل صفوف M04 §7 (`list, detail, quick, images, stock, variant-attributes, variants/generate, templates, bulk, export.csv, import, changes`)
- [ ] T071 [US1] قائمة المنتجات `src/app/(dashboard)/_d/[store]/dashboard/products/page.tsx` + `src/features/products/components/products-table.tsx`: فلاتر (حالة، مخزون، تصنيف، ماركة، وسم، نوع) في الرابط، بحث، إجراءات جماعية (`publish|archive|delete|set_category|add_tag`) بتقرير `{succeeded, failed[{id, reason}]}`, حالة فراغ «أضف منتجك الأول» تفتح الإضافة السريعة
- [ ] T072 [US1] الإضافة السريعة `quick-add-dialog.tsx` (≤ 4 حقول إلزامية: اسم، سعر decimal نص، صورة، مخزون) + نموذج المنتج الكامل `src/app/(dashboard)/_d/[store]/dashboard/products/{new,[id]}/page.tsx` بأقسام (أساسي، تسعير، مخزون، شحن، محتوى، SEO، أعلام) RHF/Zod مع حفظ تلقائي للمسودة، تحميل صور متعدد بترتيب (`@dnd-kit`)، سجل التغييرات
- [ ] T073 [US1] المتغيرات: `src/app/(dashboard)/_d/[store]/dashboard/products/variants/page.tsx` (قاموس السمات/القيم CRUD بـ `field_type`/`data_type`) + مولّد التوليفات `variant-matrix.tsx` داخل نموذج المنتج (اختيار سمات → `generate` → جدول SKU/`extra_price`/`stock` قابل للتحرير جماعياً، استثناءات) + القوالب `products/templates/**`
- [ ] T074 [P] [US1] M05: شِيمات `src/features/organization/schemas.ts` (Category/Brand/Tag/Collection/Badge) + mocks + handlers `src/app/api/bff/{categories,brands,tags,collections,badges}/**` + صفحة `dashboard/products/organization/page.tsx` بتبويبات: شجرة التصنيفات قابلة للسحب (`@dnd-kit/sortable`, منع الدورات) مع `reassign_to` عند الحذف، ماركات (شعار)، وسوم (دمج)، مجموعات (بحث منتجات Ready + ترتيب), شارات (منتقي لون zinc/دلالي فقط)
- [ ] T075 [P] [US1] شِيمات M06 `src/features/orders/schemas/*.ts` (Order بمحورَي الحالة حرفياً من data-model §4، OrderStatus، OrderItem، Fulfillment، PaymentIntent، OrderRefund) + mocks `src/mocks/orders/*.ts` (120 طلباً بتوزيع حالات) + handlers `src/app/api/bff/{orders/**,order-statuses/**}` + passthrough لـ `/api/v1/returns/*` و`/orders/b2b-*` (Ready)
- [ ] T076 [US1] قائمة الطلبات `dashboard/orders/page.tsx` + `orders-table.tsx`: عمودان للحالة (مالية = شارة zinc نصية؛ تنفيذ = نقطة 6px بلون `OrderStatus.color` + اسم), فلاتر (status, payment_status, fulfillment_status, channel, location, from/to, q) في الرابط، عدّاد «جديد» في الشريط من `counters`, تغيير حالة التنفيذ من القائمة مباشرة بـ `version` و409 → لوحة التعارض
- [ ] T077 [US1] تفاصيل الطلب `dashboard/orders/[id]/page.tsx`: رأس بالحالتين، العناصر (`<Money>`), الفاتورة `display_*`, المدفوعات (`PaymentIntent`), التنفيذات لكل موقع، الخط الزمني، إجراءات: حالة التنفيذ، الحالة المالية، تأكيد/مراجعة دفع، استرجاع مالي (`amount, method, reason`), تحويل إلى استلام، طباعة البوليصة (route `print`), ملاحظة الهدية
- [ ] T078 [US1] حالات التنفيذ `dashboard/orders/statuses/page.tsx`: CRUD + ترتيب بالسحب + `is_default` + أعلام `releases_stock`/`marks_completed` + منتقي لون؛ إنشاء طلب يدوي `dashboard/orders/new/page.tsx` (عميل بالهاتف، أسطر منتجات ببحث Ready، توصيل/استلام، `sales_channel: phone`)
- [ ] T079 [P] [US1] M48 لوحة الأوامر `src/features/command-palette/*` (cmdk عبر shadcn `command`, Zustand `src/stores/palette.ts`): `Ctrl+K/⌘K`, صفحات من `navigation.ts` مفلترة بالميزة/الصلاحية، إجراءات سياقية (`>`), بحث خادمي مجمَّع عبر `/api/bff/search` (mock) بـ debounce 150ms وskeleton صفَّين لكل مجموعة، `#` للطلب، الأخيرة في localStorage بمفتاح `<store>:<staff>`, مبدّل المتاجر؛ Dialog 640px / drawer على الجوال؛ تذييل تلميحات
- [ ] T080 [P] [US1] M49 مركز التنبيهات الأساسي `src/features/notifications/*`: شِيما Notification، mocks + handlers `/api/bff/notifications/{summary,list,read,read-all}`, جرس في الشريط العلوي بعدّاد Mono ونقطة حمراء عند `has_critical`, لوحة منبثقة بتجميع `group_key`, تعليم مقروء/الكل، استطلاع 30s مشروط بـ visibility
- [ ] T081 [US1] فحص Playwright `docs/visual-checks/{04-products,05-organization,06-orders,48-command-palette,49-notifications}/` (3 مقاسات + داكن + حالات فراغ/خطأ/409)؛ سيناريو US1 الكامل بالـ mocks: إضافة منتج بمتغيرات → طلب جديد يظهر → تغيير حالته حتى «مكتمل»؛ lint + tsc؛ commit + `rp/06-catalog-orders-after`

### 3E — M34 إعدادات المتجر (`rp/08-settings-before|after`)

- [ ] T082 [US1] وسم `rp/08-settings-before`
- [ ] T083 [P] [US1] شِيمات `src/features/settings/schemas.ts` (StoreSetting من data-model §4 بلا أسرار؛ FX `sar_to_yer_old 140`, `sar_to_yer_new 520`, `usd_to_sar 3.75`; `timezone`, `week_start_day sunday|monday`) + mocks + handlers `src/app/api/bff/settings/{identity,contact,policies,shipping,currency,seo,announcement,payments,multi-location}/route.ts`
- [ ] T084 [US1] مركز الإعدادات `dashboard/settings/page.tsx` (فهرس بطاقات نصية غير متماثلة) + صفحات `settings/{identity,contact,policies,shipping,currency,seo,announcement,payments}/page.tsx` بنماذج RHF/Zod، حفظ تلقائي حيث يناسب، `fx_preview` بـ `<Money>`, قائمة المناطق الزمنية من `Intl.supportedValuesOf('timeZone')`, تعدد المواقع مع 409 مقروء
- [ ] T085 [US1] فحص Playwright `docs/visual-checks/34-settings/`؛ lint + tsc؛ commit + `rp/08-settings-after`

**Checkpoint US1**: السلسلة الكاملة (`/` → متجر → منتج → طلب مكتمل) تعمل بالـ mocks؛ قائمة `[NEEDS BACKEND]` المستهلكة موثَّقة في تقرير التسليم.

---

## Phase 4: User Story 2 — المشتري يتصفح ويشتري (Priority: P1) · M09 M10 M11 M12 M41 M44 (`rp/07-storefront-before|after`)

**Goal**: متجر بهوية التاجر، PDP، سلة جانبية بالكوكي، دفع صفحة واحدة، تتبع، PWA.

**Independent Test**: شراء كامل على 390px ≤ 90s، LCP ≤ 2.5s، سلة تبقى عبر الصفحات، 0 تمرير أفقي.

- [ ] T086 [US2] وسم `rp/07-storefront-before`
- [ ] T087 [P] [US2] شِيمات Ready في `src/features/storefront/schemas/{config,catalog,cart}.ts` (contracts/ready-api-v1 #1–#7) + دوال خادمية مكاشة `src/features/storefront/api/{config,catalog}.ts` (`'use cache'`, `cacheLife('minutes')`, `cacheTag(storeTag(store))`, `store` وسيط أول) + mocks للـ passthrough عند غياب Django
- [ ] T088 [P] [US2] محرّك الثيم `src/features/storefront/theme/{tokens.ts,apply-theme.tsx}`: `brand_shades` → `--primary/--primary-foreground/--secondary/--background/--foreground/--border` على جذر `_s/[store]`؛ 11 خطاً عربياً عبر `next/font/google` بتحميل كسول حسب `heading_font`/`body_font`؛ 9 presets كبيانات في `presets.ts` معلَّمة بالمصدر
- [ ] T089 [US2] الرئيسية `src/app/(storefront)/_s/[store]/page.tsx` + مُصيِّر الأقسام `src/features/storefront-home/components/sections/{hero,category-strip,featured-products,latest-products,slider,banner-grid,product-grid,promotional-offers}.tsx` بترتيب التاجر، `show_on_mobile=false` يُخفي على `< md`, شريط الإعلان بسرعاته، رأس المتجر (شعار، بحث، سلة بعدّاد، تبديل العملة `?currency=` sticky), شريط سفلي للجوال، بطاقة منتج `product-card.tsx` (شارات محلية «نفدت الكمية»/«تخفيض»، `payment_policy`), قائمة منتجات مفلترة `c/[id]/page.tsx` و`search/page.tsx` بـ nuqs وترقيم خادمي
- [ ] T090 [US2] PDP `src/app/(storefront)/_s/[store]/p/[id]/page.tsx` + `src/features/pdp/components/*`: معرض (`next/image`, lazy ما عدا الأولى), اختيار `sizes_list/colors_list` (Ready) ثم `attributes/variants` (`[NEEDS BACKEND]` بـ mock), سياسة الدفع (`deposit_required` → «المطلوب الآن/المستحق عند الاستلام»), كمية بحدود، «أضف للسلة» بـ `POST /api/v1/cart/actions/` + فتح السلة الجانبية، تقييمات/مرتبطة/حزم/تخصيص/مزاد/فترات (mocks)، JSON-LD `Product`, `generateMetadata`
- [ ] T091 [US2] السلة `src/features/cart/*`: `Sheet` جانبي (بداية في RTL) بحالة Zustand `src/stores/cart-ui.ts` + TanStack `['store', store, 'cart']`, أسطر بـ `display_*`, +/−/حذف (`add|decrease|remove_line`), إفراغ، كوبون (`/api/bff/cart/coupon` mock), شريط «المتبقي للشحن المجاني», التقاط هاتف للسلة المتروكة، صفحة `/cart` كاملة للجوال؛ تحديث متفائل مع تراجع عند الخطأ
- [ ] T092 [US2] الدفع `src/app/(storefront)/_s/[store]/checkout/page.tsx` + `src/features/checkout/*`: صفحة واحدة (معلومات → توصيل/استلام → دفع → مراجعة) بـ RHF/Zod `CheckoutDraft`, `delivery-options`/`payment-options`/`quote` (mocks)، فاتورة `display_*` حيّة، COD OTP وOTP محفظة/شروة باي كـ Dialog 6 خانات، الهدية، الحجز `start_datetime`, إرسال `POST /api/bff/checkout` → `next_action` (none/redirect_gateway/show_transfer_instructions) → `checkout/success/[public_uuid]/page.tsx` برقم الطلب ورابط التتبع وإرفاق إيصال
- [ ] T093 [P] [US2] M41 التتبع `src/app/(storefront)/_s/[store]/track/[uuid]/page.tsx` (`/api/bff/orders/track/<uuid>` mock): الحالتان، خط زمني للشحنات، كود الاستلام، زر واتساب التاجر، استطلاع 60s؛ `noindex`
- [ ] T094 [P] [US2] M44 PWA: `manifest.webmanifest/route.ts` من `/config/` (الاسم، `theme_color` من `primary_color`، أيقونات مولَّدة `icon/route.tsx` 192/512 بـ `ImageResponse`), `sw.js/route.ts` بالسياسة المقررة (R-16), تسجيل SW في layout المتجر فقط بعد `ready`, `install-prompt.tsx` (`beforeinstallprompt` + تلميح iOS) يرسل `POST /api/v1/pwa/install-event/` بـ `source:'nextjs_app'`, اشتراك Push اختياري (`/api/v1/push/*` Ready)
- [ ] T095 [US2] فحص Playwright `docs/visual-checks/{09-storefront-home,10-pdp,11-cart,12-checkout,41-tracking,44-pwa}/` + Lighthouse mobile للرئيسية وPDP (≥ 90/95) + اختبار السلة عبر إعادة التحميل + تبديل العملة؛ lint + tsc؛ commit + `rp/07-storefront-after`

**Checkpoint US2**: جلسة شراء كاملة بالـ mocks (وبـ Django إن توفر لـ config/catalog/cart).

---

## Phase 5: User Story 3 — إدارة يومية على نطاق أوسع (Priority: P2) · M07 M08 M13 M14 M15 M18 M19 M21 M22 M24 M25 M35 M42 (+M48/M49 توسعة)

**Goal**: كل وحدة P2 مستقلة بقصصها؛ المعيار المشترك: قائمة ≥ 500 صف < 1s بفلاتر في الرابط، كل إجراء محجوب بسبب مقروء.

**Independent Test**: لكل وحدة لقطات 3 مقاسات + داكن + حالات (فراغ/خطأ/بلا صلاحية/ميزة معطّلة) وسيناريو قبولها من مواصفتها.

لكل وحدة أدناه ثلاث مهام ثابتة: (أ) شِيمات + mocks + handlers لكل صفوف §7؛ (ب) الشاشات والمكوّنات حسب §6 بالحالات الخمس (FR-011)؛ (ج) فحص بصري + lint/tsc + وسم `*-after`. الوسم قبل البدء `rp/NN-<slug>-before` ضمن (أ).

- [ ] T096 [P] [US3] M07 العملاء (أ): `src/features/customers/schemas.ts` (Customer من data-model §4)، mocks، `src/app/api/bff/customers/**` (قائمة، ملف، طلبات، محفظة، نقاط، أمنيات، تقييمات، ملاحظات، COD، تصدير، شرائح) · وسم `rp/09-customers-before`
- [ ] T097 [US3] M07 (ب): `dashboard/customers/page.tsx` (جدول مشتق بفلاتر الشرائح/الثقة/الإنفاق) + `customers/[phone]/page.tsx` (ملف: ثقة منصة/متجر، طلبات، محفظة، نقاط، أمنيات، تقييمات، ملاحظات، إيقاف COD بصلاحية `customers.edit_profile`, تصدير مع 429 عند `critical`)
- [ ] T098 [US3] M07 (ج): `docs/visual-checks/07-customers/` + `rp/09-customers-after`
- [ ] T099 [P] [US3] M08 مخصّص الثيم (أ): شِيمات (`StorefrontDesignForm`, presets, sections Ready), mocks لـ `store/theme`, `store/theme/presets`, `store/announcement`; passthrough `/api/v1/admin/sections/*` (Ready، تحفّظ المصادقة موثَّق) · وسم `rp/10-theme-before`
- [ ] T100 [US3] M08 (ب): `dashboard/design/page.tsx` بلوحة تحكم بداية (presets كبطاقات حدود 1px بعينة ألوان، 5 ألوان، خطّان، `design_style`, شعار، شريط الإعلان) ومعاينة حيّة نهاية في `iframe` لصفحة المتجر مع تطبيق المتغيرات فوراً عبر `postMessage`؛ بناء الأقسام بالسحب (`@dnd-kit`) مع `reorder`/إضافة/حذف/تحرير `settings`/`content_data` لكل `section_type`؛ «نشر» منفصل عن المعاينة
- [ ] T101 [US3] M08 (ج): `docs/visual-checks/08-theme/` + `rp/10-theme-after`
- [ ] T102 [P] [US3] M13 التسويق (أ): شِيمات Coupon/PromotionalOffer/AbandonedCart/Campaign/MarketingEvent/Loyalty/Gift (enums حرفياً)، mocks، `src/app/api/bff/marketing/**` · وسم `rp/11-marketing-before`
- [ ] T103 [US3] M13 (ب): `dashboard/marketing/page.tsx` (ملخص Bento) + `marketing/{coupons,offers,abandoned-carts,campaigns,timeline,loyalty,gifting}/**` (قوائم بجدول مشترك، نماذج، معاينة الحملة بعدد المستلمين، تقويم الجدول الزمني بألوان دلالية فقط)
- [ ] T104 [US3] M13 (ج): `docs/visual-checks/13-marketing/` + `rp/11-marketing-after`
- [ ] T105 [P] [US3] M14 الدفع والمحافظ (أ): شِيمات Gateway/PayoutAccount/MerchantWallet/Withdrawal/Dues، mocks، `src/app/api/bff/{payments,wallet,store/payments}/**` · وسم `rp/12-payments-before`
- [ ] T106 [US3] M14 (ب): `dashboard/payments/{gateways,payout-accounts,wallet,withdrawals,dues}/page.tsx` (اعتمادات سرّية بحقول «اترك فارغاً للإبقاء»، مفاتيح Sharwa Pay/التحويل اليدوي، أرصدة 4 عملات بلا جمع، حركات بمرجع، طلب سحب بحساب)
- [ ] T107 [US3] M14 (ج): `docs/visual-checks/14-payments/` + `rp/12-payments-after`
- [ ] T108 [P] [US3] M15 الشحن (أ): شِيمات DeliveryMethod/PickupLocation/ShippingProvider/Carrier/Zones/Packaging/EdgeCases، mocks، `src/app/api/bff/shipping/**` · وسم `rp/13-shipping-before`
- [ ] T109 [US3] M15 (ب): `dashboard/shipping/{settings,delivery-methods,pickup-locations,providers,carriers,zones,packaging,zone-review,edge-cases}/**` + إجراءات الشحنة (تحديث عنوان أثناء النقل، تحويل إلى استلام بـ `version`)
- [ ] T110 [US3] M15 (ج): `docs/visual-checks/15-shipping/` + `rp/13-shipping-after`
- [ ] T111 [P] [US3] M18 الموظفون والصلاحيات (أ): شِيمات StaffMember/Role/Permission/Assignments/Overrides/Sessions/Approvals/AuditLog/BehaviorAlert، mocks، `src/app/api/bff/{staff,roles,permissions,approvals,audit-log,behavior-alerts}/**` · وسم `rp/14-staff-before`
- [ ] T112 [US3] M18 (ب): `dashboard/staff/**` (قائمة، تفاصيل، إنهاء/إبطال الجلسات، تعيينات موقع×دور، استثناءات مع «الصلاحيات الفعلية»), `staff/roles` (مصفوفة 35 صلاحية × أدوار، النظامية للقراءة), `staff/approvals` (حسم بـ `version`), `staff/audit-log` (+ تحقق السلسلة), `staff/behavior-alerts`؛ تطبيق إخفاء/تعطيل في الشريط ولوحة الأوامر وفق `permissions[]`
- [ ] T113 [US3] M18 (ج): `docs/visual-checks/18-staff/` + اختبار موظف `orders.view` فقط + `rp/14-staff-after`
- [ ] T114 [P] [US3] M19 النطاقات والربط (أ): شِيمات Domain/Tracking/WebhookEndpoint/Delivery/IntegrationStatus، mocks (كلها Absent)، `src/app/api/bff/{domains,store/tracking,webhooks,integrations}/**` · وسم `rp/15-domains-before`
- [ ] T115 [US3] M19 (ب): `dashboard/settings/{domains,tracking,webhooks,integrations}/**` (سجلات DNS بـ `<Mono dir=ltr>` ونسخ، تحقق/أساسي/حذف، البكسلات العشرة مع `has_*` للأسرار، نقاط Webhook بسرّ يُعرض مرة، سجل التسليم وإعادة الإرسال)
- [ ] T116 [US3] M19 (ج): `docs/visual-checks/19-domains/` + `rp/15-domains-after`
- [ ] T117 [P] [US3] M21 المخزون (أ): شِيمات (StockMovement reasons، InventoryItem، Reservation)، mocks، `src/app/api/bff/inventory/**` · وسم `rp/16-inventory-before`
- [ ] T118 [US3] M21 (ب): `dashboard/inventory/{page,movements,items,reservations}.tsx` (جدول مخزون بتعديل في مكانه `delta|new_quantity` + سبب، دفتر حركات بمرجع، طلب إعدام عبر الموافقات، عدّادات منخفض/نافد)
- [ ] T119 [US3] M21 (ج): `docs/visual-checks/21-inventory/` + `rp/16-inventory-after`
- [ ] T120 [P] [US3] M22 المواقع (أ): شِيمات Location (8 أعلام، 4 ملكيات، تفاصيل شرطية)، mocks، `src/app/api/bff/locations/**` · وسم `rp/17-locations-before`
- [ ] T121 [US3] M22 (ب): `dashboard/locations/**` (تبديل الوضع، قائمة بـ `display_type`, نموذج بأقسام شرطية حسب الأعلام، مخزون الموقع، موظفو الموقع، قواعد التوجيه بالسحب، تحذير التعطيل بالأثر)
- [ ] T122 [US3] M22 (ج): `docs/visual-checks/22-locations/` + `rp/17-locations-after`
- [ ] T123 [P] [US3] M24 المرتجعات (أ): شِيمات ReturnRequest/RMA (Ready معظمها)، passthrough `/api/v1/returns/*`, `/warehouse/returns/*`, mocks لقائمة RMA وسجل الاسترجاعات والموثوقية · وسم `rp/18-returns-before`
- [ ] T124 [US3] M24 (ب): `dashboard/returns/{page,new,[id],rma,rma/[id],refunds}.tsx` (إنشاء من طلب بعناصر قابلة للإرجاع، اعتماد/رفض بـ `version` و409 و`CashLiquidityError` مقروء، RMA: مسح استلام وقرار QA)
- [ ] T125 [US3] M24 (ج): `docs/visual-checks/24-returns/` + `rp/18-returns-after`
- [ ] T126 [P] [US3] M25 التقارير (أ): شِيمات Registry (42/10 فئات حرفياً)/ReportData/ExportJob/Schedule، mocks، `src/app/api/bff/reports/**` · وسم `rp/19-reports-before`
- [ ] T127 [US3] M25 (ب): `dashboard/reports/page.tsx` (فهرس 10 فئات، «قريباً» للمعلَّمة `*`), `reports/[code]/page.tsx` (ملخص Mono مع مقارنة، Recharts أحادي، جدول مرقّم، فترة/مقارنة/موقع في الرابط، تصدير csv/xlsx بمهمة واستطلاع), `reports/exports`, `reports/schedules`; شجرة التقارير في الشريط من `registry`
- [ ] T128 [US3] M25 (ج): `docs/visual-checks/25-reports/` + `rp/19-reports-after`
- [ ] T129 [P] [US3] M35 محافظ العملاء والولاء (أ): شِيمات، mocks، `src/app/api/bff/{customers/wallets,loyalty}/**` · وسم `rp/20-wallets-before`
- [ ] T130 [US3] M35 (ب): `dashboard/customers/wallets/**` (قائمة بمجاميع، إنشاء، تفاصيل، تعبئة/تسوية بـ `idempotency_key`, حركات) + `dashboard/customers/points/**` + قراءة برنامج الولاء
- [ ] T131 [US3] M35 (ج): `docs/visual-checks/35-wallets/` + `rp/20-wallets-after`
- [ ] T132 [P] [US3] M42 الأمنيات والتقييمات (متجر) (أ): شِيمات، mocks، `src/app/api/bff/{shopper/phone,wishlist,catalog/products/[id]/{reviews,back-in-stock},store-reviews}/**` · وسم `rp/21-engagement-before`
- [ ] T133 [US3] M42 (ب): `src/features/engagement/*` (قلب الأمنيات على البطاقة وPDP بهاتف الجلسة، صفحة `/wishlist`, نموذج تقييم بـ OTP، «أعلمني عند التوفر», تقييم المتجر في التذييل) + إشعار التوفر
- [ ] T134 [US3] M42 (ج): `docs/visual-checks/42-engagement/` + `rp/21-engagement-after`

**Checkpoint US3**: كل وحدة P2 تُفحص وحدها؛ تقرير التسليم يذكر صفوف `[NEEDS BACKEND]` المستهلكة.

---

## Phase 6: User Story 4 — مالك المنصة (Priority: P2) · M20 M45 M46 (`rp/22-admin-before|after`)

**Goal**: لوحة `console.<base>` تغطي العمليات اليومية بلا Django admin.

**Independent Test**: إعادة تجهيز متجر فاشل، تفعيل ميزة لمتجر، قبول شحن محفظة، تحصيل مستحق — كلها بالـ mocks.

- [ ] T135 [US4] وسم `rp/22-admin-before`
- [ ] T136 [P] [US4] شِيمات M20/M45/M46 في `src/features/platform-admin/schemas/*.ts` (Client, Plan, Subscription, Feature, Override, App, Dues, SharwaPay requests, Zones, MarketCategory, WebhookEvent, Deactivation — enums حرفياً من data-model §5) + mocks `src/mocks/platform/*.ts` + handlers `src/app/api/bff/{platform,admin}/**` لكل صفوف §7
- [ ] T137 [US4] هيكل `src/app/(admin)/_a/layout.tsx` (نفس الشريط/الشريط العلوي بمحتوى الإدارة، مصادقة admin عبر BFF mock) + `page.tsx` نظرة عامة (إجمالي المتاجر/المبيعات/الطلبات Mono، المتاجر الفاشلة، آخر 50 متجراً)
- [ ] T138 [US4] المتاجر `_a/stores/**` (قائمة بفلاتر الحالة/الخطة، تفاصيل، إعادة تجهيز بتحديث حيّ `provisioning→ready`, تبديل شروة شيب، تجاوزات الميزات لكل متجر ومجمَّع، دورة التعطيل، أحداث Webhook المعلّقة)
- [ ] T139 [US4] M46 `_a/{plans,features,subscriptions,apps,billing-settings,market-categories}/**` (مصفوفة خطة×ميزة، فحص الحسم بـ `decided_by`, تعيين اشتراك، مفتاحا `subscriptions_enabled`/`commission_enabled`)
- [ ] T140 [US4] M45 `_a/dues/**` (نظرة عامة بالإيراد، تفاصيل متجر بالعملات، 8 إجراءات بـ `{detail, level}` و409 «تم التعامل معه مسبقاً»، إعفاء/إلغاء إعفاء) + Sharwa Pay `_a/sharwa-pay/{topups,withdrawals,wallets}/**` + مناطق شروة شيب
- [ ] T141 [US4] فحص Playwright `docs/visual-checks/{20-admin,45-dues,46-plans}/`؛ lint + tsc؛ commit + `rp/22-admin-after`

---

## Phase 7: User Story 5 — القنوات والامتدادات المتقدمة (Priority: P3) · M16 M17 M23 M26–M33 M36–M40 M43

**Goal**: كل وحدة P3 تتكامل مع M06/M21 دون تضارب حالات.

**Independent Test**: سيناريوهات قبول كل وحدة من مواصفتها بالـ mocks (أو Ready: M36, M38) + لقطات.

نفس النمط (أ) شِيمات/mocks/handlers + وسم before · (ب) الشاشات · (ج) فحص + وسم after.

- [ ] T142 [P] [US5] M16 POS (أ): شِيمات CashRegister/Shift/Movement/OTPChallenge، mocks، `src/app/api/bff/pos/**` · `rp/23-pos-before`
- [ ] T143 [US5] M16 (ب): `src/app/(pos)/_p/[store]/pos/**` (تخطيط مستقل بلا شريط اللوحة: فتح وردية بـ `opening_float`, شاشة بيع بعمودين — بحث/باركود + سلة Mono، خصم بحد الدور، دفع نقدي/محفظة، إيصال للطباعة، درج الكاش بالحركات، إغلاق بالفرق والموافقة، 428 OTP step-up)
- [ ] T144 [US5] M16 (ج): `docs/visual-checks/16-pos/` + `rp/23-pos-after`
- [ ] T145 [P] [US5] M17 المسوقون والمؤثرون (أ): شِيمات، mocks، `src/app/api/bff/{affiliates,influencers}/**` · `rp/24-affiliates-before`
- [ ] T146 [US5] M17 (ب): `dashboard/marketing/{affiliates,influencers}/**` (أداء بـ Mono، رابط `?aff_id=` بالـ host، مبيعات بحالة الدفع وتعليم جماعي «مدفوعة»)
- [ ] T147 [US5] M17 (ج): `docs/visual-checks/17-affiliates/` + `rp/24-affiliates-after`
- [ ] T148 [P] [US5] M23 الموردون وأوامر الشراء (أ): شِيمات (PO 6 حالات)، mocks، `src/app/api/bff/{suppliers,purchase-orders}/**` · `rp/25-procurement-before`
- [ ] T149 [US5] M23 (ب): `dashboard/suppliers/**`, `dashboard/purchase-orders/**` (مسودة بسطور، إرسال للموافقة، حسم بـ `version`, استلام جزئي، إلغاء، خط زمني)
- [ ] T150 [US5] M23 (ج): `docs/visual-checks/23-procurement/` + `rp/25-procurement-after`
- [ ] T151 [P] [US5] M26 الحجوزات (أ): شِيمات (weekday 0=Monday ⚠)، mocks، `src/app/api/bff/bookings/**` + `catalog/products/[id]/slots/**` · `rp/26-bookings-before`
- [ ] T152 [US5] M26 (ب): `dashboard/bookings/{page,services,services/[id]/availability}.tsx` (تقويم أسبوعي بحدود 1px، نوافذ توفر، إلغاء) + منتقي الموعد في PDP/الدفع (`hold` → `held_until`)
- [ ] T153 [US5] M26 (ج): `docs/visual-checks/26-bookings/` + `rp/26-bookings-after`
- [ ] T154 [P] [US5] M27 الصندوق الموحَّد والقنوات (أ): شِيمات Conversation/Message/Keyword/Template/CatalogSync، mocks، `src/app/api/bff/{channels,inbox}/**` · `rp/27-inbox-before`
- [ ] T155 [US5] M27 (ب): `dashboard/inbox/**` (ثلاثة أعمدة: محادثات/رسائل/سياق العميل والطلب؛ استطلاع `?after=`؛ ردّ بقالب/منتج؛ إسناد/حالة؛ تحويل إلى طلب) + `dashboard/channels/**` (حالة Meta/TikTok/Telegram، OAuth كتحويل، محفّزات، قوالب، مزامنة الكتالوج، ربط فئات، وصول الموظفين)
- [ ] T156 [US5] M27 (ج): `docs/visual-checks/27-inbox/` + `rp/27-inbox-after`
- [ ] T157 [P] [US5] M28 الأسواق (أ): شِيمات Listing/SyncJob/Settings/MarketplaceOrder، mocks، `src/app/api/bff/marketplaces/**` · `rp/28-marketplaces-before`
- [ ] T158 [US5] M28 (ب): `dashboard/marketplaces/**` (حالة أمازون/نون، إعدادات بمعاينة سعر، قوائم بمعرّفات وتجاوز سعر ودفع جماعي، مهام بالأخطاء CSV، طلبات الأسواق وتأكيد الشحنة)
- [ ] T159 [US5] M28 (ج): `docs/visual-checks/28-marketplaces/` + `rp/28-marketplaces-after`
- [ ] T160 [P] [US5] M29 الدروبشيبينغ (أ): شِيمات SupplierConnection/PricingRule/SupplierProduct/Feed/SupplierOrder (10 حالات)، mocks، `src/app/api/bff/dropshipping/**` · `rp/29-dropshipping-before`
- [ ] T161 [US5] M29 (ب): `dashboard/dropshipping/**` (موردون، قواعد تسعير بمحاكاة، كتالوج المورد واستيراد، معالج الملفات: رفع → ربط أعمدة → معاينة → اعتماد → تشغيل → أخطاء، طلبات الموردين، مهام)
- [ ] T162 [US5] M29 (ج): `docs/visual-checks/29-dropshipping/` + `rp/29-dropshipping-after`
- [ ] T163 [P] [US5] M30 متجر التطبيقات + M31 شروة AI + M32 الدعم (أ): شِيمات App/Installation/Usage/Template/SupportSession/SupportTicket، mocks، `src/app/api/bff/{apps,support}/**` · `rp/30-apps-support-before`
- [ ] T164 [US5] M30/M31/M32 (ب): `dashboard/apps/**` (كتالوج بحالة التثبيت، تثبيت/تفعيل/تعطيل، أحداث، رسوم؛ واتساب: استخدام/قوالب/رابط الربط؛ شروة AI: حالة/إعدادات/رمز SSO), `dashboard/support/{sessions,sessions/[id],tickets,tickets/[id]}/**` (خط زمني رسائل/أدوات، استيلاء/إفراج/إغلاق بـ `version`, تذاكر بعدّادات)
- [ ] T165 [US5] M30/M31/M32 (ج): `docs/visual-checks/{30-apps,31-ai,32-support}/` + `rp/30-apps-support-after`
- [ ] T166 [P] [US5] M33 المصروفات (أ): شِيما (4 فئات)، mocks، `src/app/api/bff/expenses/**` · `rp/31-expenses-before`
- [ ] T167 [US5] M33 (ب): `dashboard/expenses/page.tsx` (مجمَّعة بالشهر بمجاميع لكل عملة بلا جمع عبر العملات، إنشاء، بلا تعديل/حذف حتى توفر العقد)
- [ ] T168 [US5] M33 (ج): `docs/visual-checks/33-expenses/` + `rp/31-expenses-after`
- [ ] T169 [P] [US5] M36 الجملة B2B (أ): passthrough Ready `/api/v1/orders/b2b-*` + شِيمات، mocks لأسعار الكميات والمساومة · `rp/32-b2b-before`
- [ ] T170 [US5] M36 (ب): `dashboard/orders/b2b/**` (مسودة بعميل/أسطر/معتمد/فرع، قائمة المعلّقة، حسم بـ `version` و403 اعتماد ذاتي مقروء) + أسعار الكميات في نموذج المنتج وPDP + مسودات المساومة
- [ ] T171 [US5] M36 (ج): `docs/visual-checks/36-b2b/` + `rp/32-b2b-after`
- [ ] T172 [P] [US5] M37 الحزم/التخصيص/المزادات (أ): شِيمات، mocks، `src/app/api/bff/products/[id]/{bundle-components,compatibility-rules,personalization-fields,auction,serials}/**` + `catalog/products/[id]/bids` + `products/formula-preview` · `rp/33-bundles-before`
- [ ] T173 [US5] M37 (ب): تبويبات في نموذج المنتج (مكوّنات الحزمة، قواعد التوافق، حقول التخصيص بالسحب، إعدادات المزاد، أكواد تسلسلية، معاينة المعادلة) + PDP (محدد الحزمة، نموذج التخصيص الديناميكي، المزايدة بـ 409 مقروء، السعر بالمعادلة)
- [ ] T174 [US5] M37 (ج): `docs/visual-checks/37-bundles/` + `rp/33-bundles-after`
- [ ] T175 [P] [US5] M38 تطبيق المندوب (أ): passthrough Ready `/api/v1/agent/*` + شِيمات + mocks لـ `agent/{shipments,me,custody}` · `rp/34-courier-before`
- [ ] T176 [US5] M38 (ب): `src/app/(courier)/_c/[store]/agent/**` (تخطيط جوال أولاً بأهداف 48px: بدء/إنهاء/تسليم مناوبة، شحناتي بالحالة، تفاصيل بأحداث، مسح باركود بالكاميرا (`BarcodeDetector` مع سقوط لإدخال يدوي), نقل حالة بـ `client_generated_uuid` وجيولوكيشن، تسليم جزئي بتحصيل COD، دفتر العهدة Mono؛ عمل دون اتصال: طابور إجراءات في IndexedDB يُعاد إرساله)
- [ ] T177 [US5] M38 (ج): `docs/visual-checks/38-courier/` (mobile + mobile-dark أساساً) + `rp/34-courier-after`
- [ ] T178 [P] [US5] M39 شروة شيب (أ): شِيمات ShipmentOrder/Event/Zone/AWBQueue/RateCard، mocks، `src/app/api/bff/shipping/{sharwa-ship,shipments,awb-queue,rate-cards,supervisor,agents}/**` · `rp/35-sharwa-ship-before`
- [ ] T179 [US5] M39 (ب): `dashboard/shipping/sharwa-ship/**` (طلبات بلا بوليصة بمعاينة الوزن القابل للتحصيل والمناطق، إصدار بوليصة، قائمة البوليصات بـ `billing_status`, تفاصيل بأحداث مع `out_of_order/flagged`, تعديل يدوي للحالة، طابور AWB، لقطات التسعيرة، إشراف وإعادة إسناد طارئة)
- [ ] T180 [US5] M39 (ج): `docs/visual-checks/39-sharwa-ship/` + `rp/35-sharwa-ship-after`
- [ ] T181 [P] [US5] M40 شروة باي (أ): شِيمات SharwaPayWallet/Transaction/Topup/Withdrawal، mocks، `src/app/api/bff/sharwa-pay/**` · `rp/36-sharwa-pay-before`
- [ ] T182 [US5] M40 (ب): `src/app/(pay)/sharwa-pay/**` (دخول OTP بالهاتف، محفظة 4 عملات بلا جمع، حركات بالمصدر، طلب شحن multipart بإيصال، طلب سحب، طلباتي، خروج؛ `manifest.webmanifest` و`sw.js` مستقلان بسياسة «لا كاش» تحت `/sharwa-pay/`)
- [ ] T183 [US5] M40 (ج): `docs/visual-checks/40-sharwa-pay/` + `rp/36-sharwa-pay-after`
- [ ] T184 [P] [US5] M43 تجميع المتاجر (أ): شِيما، mock، `src/app/api/bff/merchant/stores/route.ts` · `rp/37-rollup-before`
- [ ] T185 [US5] M43 (ب): `dashboard/stores/page.tsx` (جدول المتاجر بالطلبات/المكتمل/المسترد/الإيراد SAR Mono + مجاميع، فلتر تاريخ في الرابط) + مبدّل المتاجر في الشريط العلوي ولوحة الأوامر
- [ ] T186 [US5] M43 (ج): `docs/visual-checks/43-rollup/` + `rp/37-rollup-after`

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
