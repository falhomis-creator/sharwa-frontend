# Implementation Plan: Sharwa Frontend Platform — منصة «شروه»

**Branch**: `master` (spec dir `001-sharwa-frontend-platform`; restore points via `rp/*` tags — see research R-15) | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md) + [modules/](modules/) (49)

**Input**: Feature specification from `specs/001-sharwa-frontend-platform/spec.md` + 49 module specs + `specs/discovery/00..03` + constitution v1.0.0

**User input to this plan**: «خطة App Router + Shadcn base-nova + ضبط `components.json` إلى `"rtl": true` وتثبيت الحزم المتبقية».

## Summary

واجهة أمامية مستقلة بـ Next.js 16 App Router لمنصة تجارة إلكترونية متعددة المستأجرين، تعمل كعميل Headless فوق باك إند Django قائم **للقراءة فقط**. ثمانية مجموعات مسار معزولة تُحلّ من الـ Host في `src/proxy.ts` (خالص، بلا I/O) وتمرّ كل بياناتها عبر BFF نفس الأصل يحافظ على الكوكيز (الجلسة، السلة، CSRF). المكوّنات من shadcn/ui (base-nova، `rtl: true`) فوق رموز zinc أحادية في `globals.css`؛ العربية RTL افتراضياً بخط IBM Plex Sans Arabic والأرقام بـ Geist Mono. 65 عقداً جاهزاً تُستهلك مباشرة، و368 عقداً `[NEEDS BACKEND]` تُبنى على Mock محلي بنفس الشكل وتُعلَّم في الواجهة. التنفيذ بترتيب الأولوية: M01 → M47/M03 → M02 → M04/M05/M06 → M09–M12 → M34 → P2 → P3، كل وحدة بين وسمَي استعادة وفحص بصري على 3 مقاسات + داكن.

## Technical Context

**Language/Version**: TypeScript 5 (`strict: true`, no `any`/`@ts-ignore`) · Node 24 (≥ 20.9) · React 19.3

**Primary Dependencies**: Next.js 16.4.2 (App Router, Turbopack, Cache Components + Partial Prefetching, `proxy.ts`) · Tailwind CSS v4 (`@theme`) · shadcn/ui 4.22 style **base-nova** on `@base-ui/react` · TanStack Query 5 · TanStack Table **8** · Zustand 5 · React Hook Form 7 + Zod 4 (`@hookform/resolvers`) · nuqs 2 · Sonner 2 + next-themes · cmdk 1 · motion 14 · @dnd-kit · Recharts 3 · Lucide · `@t3-oss/env-nextjs` · Playwright 1.64 (dev). تفاصيل الإصدارات والبدائل في [research.md](research.md) R-06.

**Storage**: لا قاعدة بيانات في الواجهة. حالة الخادم في TanStack Query (مفاتيح مفتوحة بالمستأجر)؛ حالة لحظية في Zustand؛ حالة الفلاتر في الرابط (nuqs)؛ `sessionStorage` لرمز حالة التجهيز؛ `localStorage` للعناصر الأخيرة في لوحة الأوامر (مفتوحة بالمتجر والموظف). كل الكتابة الحقيقية في Django عبر BFF.

**Testing**: `npm run lint` (ESLint 9 flat + قواعد مخصصة للفئات الفيزيائية وhex الخام) · `tsc --noEmit` · فحص بصري Playwright (MCP تفاعلي + `scripts/visual-check.ts` للقطات `docs/visual-checks/<NN>-<slug>/`) · اختبار عزل المستأجرين (متجران متناوبان). اختبارات الوحدات اختيارية (غير مطلوبة في المواصفة).

**Target Platform**: متصفحات حديثة (Chrome/Edge/Firefox 111+, Safari 16.4+)؛ الجوال أولاً (390px)؛ PWA على أصل المتجر وشروة باي. يُنشر كخادم Node (`next start`) خلف نفس النطاق الأساسي `TENANT_BASE_DOMAIN` مع wildcard subdomains.

**Project Type**: web frontend (Next.js monolith متعدد مجموعات المسار) + BFF داخلي؛ الباك إند خارجي للقراءة فقط.

**Performance Goals**: LCP ≤ 2.5s وCLS ≤ 0.1 على الجوال (الصفحة الترويجية LCP ≤ 2.0s، CLS ≤ 0.05)؛ Lighthouse Performance ≥ 90 وAccessibility ≥ 95؛ أي قائمة ≤ 100 صف تُرسم < 1s؛ بحث `⌘K` < 500ms؛ `proxy.ts` ≤ 2ms p95.

**Constraints**: الباك إند للقراءة فقط (`C:\sharwa_saas`)؛ لا JWT ولا CORS cross-origin — كوكيز first-party عبر نفس الأصل؛ CSRF `HttpOnly` (قراءة خادمية)؛ المال `display_*` بلا تنسيق في العميل؛ عربي RTL فقط في v1؛ Anti-AI look صارم (الدستور I)؛ لا معرّف مستأجر في query string؛ `TENANT_BASE_DOMAIN` إلزامي للبناء.

**Scale/Scope**: 49 وحدة / 8 مجموعات مسار / ~120 شاشة؛ 39 مفتاح ميزة و35 مفتاح صلاحية؛ 4 عملات بلا تحويل؛ 453 صف عقد بيانات (65 Ready، 368 `[NEEDS BACKEND]`، 20 محلي).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | المبدأ | كيف تحققه الخطة | الحالة |
|---|---|---|---|
| I | Anti-AI Look | رموز zinc حرفية في `globals.css` (R-08)؛ قاعدة ESLint ترفض hex/oklch الخام والظلال الملونة؛ Bento غير متماثل في M01؛ لا إيموجي (فحص grep في visual-check) | ✅ |
| II | Arabic-First RTL | `lang="ar" dir="rtl"` في الجذر؛ `components.json.rtl=true` وإعادة توليد `button.tsx`؛ IBM Plex Sans Arabic + Geist Mono عبر `next/font` (R-07)؛ قاعدة ESLint ترفض `ml-/mr-/pl-/pr-/left-/right-/text-left/right`؛ `<Money>`/`<Mono>` | ✅ |
| III | Git Restore Points | `rp/NN-<slug>-before|after` + `.specify/memory/restore-points.md`؛ بروتوكول «استعادة» في quickstart §5 | ✅ |
| IV | Visual Self-Verification | `scripts/visual-check.ts` (3 مقاسات + داكن، يفشل على console/hydration/overflow) + Playwright MCP؛ لا وسم `*-after` بلا لقطات | ✅ |
| V | Read-Only Backend & Headless | كل الوصول عبر BFF (`contracts/bff-cross-cutting.md`)؛ 368 صف `[NEEDS BACKEND]` على mocks معلَّمة `x-sharwa-mock`؛ لا نسخ قوالب Django؛ كل enum من discovery | ✅ |
| VI | Spec-Driven | هذا الملف + research/data-model/contracts/quickstart → `/speckit-tasks`؛ كل مهمة تلمس `src/features/<module>/` أو مجموعة مسار واحدة | ✅ |
| VII | Design Tokens SSOT | `@theme` في `globals.css` فقط؛ ثيم المتجر يتجاوز نفس المتغيرات على جذر `(storefront)/_s/[store]`؛ shadcn/Aceternity يُعاد تلوينها | ✅ |
| VIII | Multi-Tenant Route Isolation | 8 مجموعات معزولة؛ `proxy.ts` من Host فقط؛ `x-sharwa-store` ترويسة داخلية؛ `[store]` وسيط صريح للكاش؛ مفاتيح `['store', store, …]` و`cacheTag('store:…')`؛ منع استيراد متبادل storefront⇄dashboard (قاعدة `no-restricted-imports`) | ✅ |
| IX | Budgets | `next/image`, `next/font display swap`; Zod على كل استجابة؛ TanStack/Zustand/nuqs بالتقسيم المحدد؛ lint + tsc قبل `*-after` | ✅ |

**Deviations requiring justification** (انظر Complexity Tracking): Vaul → shadcn `drawer` (Base UI)؛ `middleware.ts` → `proxy.ts` (تسمية فقط).

**Post-design re-check (Phase 1)**: لا مخالفة جديدة. العقود لا تخترع مصادقة؛ نموذج البيانات مشتق من discovery فقط؛ الكاش مفتوح بالمستأجر. ✅

## Project Structure

### Documentation (this feature)

```text
specs/001-sharwa-frontend-platform/
├── spec.md                      # المواصفة الأم
├── modules/M01..M49-*.md        # مواصفات الوحدات
├── checklists/requirements.md
├── plan.md                      # هذا الملف
├── research.md                  # Phase 0 — 16 قراراً تقنياً
├── data-model.md                # Phase 1 — كيانات الواجهة وشِيمات Zod
├── quickstart.md                # Phase 1 — تشغيل وتحقق
├── contracts/
│   ├── README.md
│   ├── bff-cross-cutting.md     # proxy/BFF/auth/CSRF/errors/money/cache/env/mocks
│   ├── ready-api-v1.md          # 30 endpoint موجودة اليوم
│   └── needs-backend-inventory.md  # مولَّد: 453 صفاً من §7
└── tasks.md                     # Phase 2 — /speckit-tasks (لم يُنشأ بعد)
```

### Source Code (repository root)

```text
src/
├── proxy.ts                               # حلّ المستأجر وإعادة الكتابة (خالص)
├── env.ts                                 # @t3-oss/env-nextjs + Zod
├── app/
│   ├── layout.tsx                         # <html lang="ar" dir="rtl">, الخطوط، ThemeProvider
│   ├── globals.css                        # @theme + رموز zinc (المصدر الوحيد للألوان)
│   ├── (marketing)/                       # M01  — localhost:3000/
│   │   ├── layout.tsx  page.tsx  login/page.tsx  opengraph-image.tsx
│   ├── (onboarding)/                      # M02, M47 error pages
│   │   ├── layout.tsx  register/…  _errors/{store-not-found,store-inactive,store-provisioning}/page.tsx
│   ├── (storefront)/_s/[store]/           # M09–M12, M41, M42, M44 (ثيم التاجر على هذا الجذر)
│   │   ├── layout.tsx  page.tsx  p/[id]/  c/[id]/  cart/  checkout/  track/[uuid]/
│   │   ├── manifest.webmanifest/route.ts  sw.js/route.ts  not-found.tsx  error.tsx
│   ├── (dashboard)/_d/[store]/dashboard/  # M03–M08, M13–M15, M17–M19, M21–M37, M39, M43, M48, M49
│   │   ├── layout.tsx (shell)  page.tsx  login/  products/  orders/  customers/  …
│   ├── (pos)/_p/[store]/pos/              # M16
│   ├── (courier)/_c/[store]/agent/        # M38
│   ├── (pay)/sharwa-pay/                  # M40 (على أصل المنصة)
│   ├── (admin)/_a/                        # M20, M45, M46 (console.<base>)
│   └── api/
│       ├── v1/[...path]/route.ts          # BFF passthrough إلى Django
│       └── bff/<module>/…/route.ts        # محوّلات legacy + mocks لعقود [NEEDS BACKEND]
├── features/<module>/                     # منطق كل وحدة (مجلد واحد لكل وحدة)
│   ├── components/  hooks/  api/  schemas/  <module>.content.ts
│   # أمثلة: landing/, onboarding/, tenant/, dashboard-shell/, products/, orders/, storefront-home/, cart/, checkout/, command-palette/, notifications/
├── components/
│   ├── ui/                                # shadcn base-nova (rtl) — مشترك فقط
│   └── shared/                            # Money, Mono, EmptyState, ErrorState, PageHeader, DataTable (TanStack 8)
├── lib/
│   ├── tenant.ts  api-client.ts  bff/ (server-only)  access.ts (39 features + 35 permissions)
│   ├── format.ts  query-keys.ts  cache.ts  csrf.ts  utils.ts
├── mocks/<module>/*.ts                    # fixtures بنفس عقود §7 (عربية، display_*)
└── stores/                                # Zustand: cart-ui, palette, dnd

scripts/visual-check.ts                    # لقطات 3 مقاسات + داكن → docs/visual-checks/
docs/visual-checks/<NN>-<slug>/*.png
.specify/memory/restore-points.md
```

**Structure Decision**: مشروع Next.js واحد (لا monorepo) لأن الـ 8 مجموعات تشترك في الرموز والمكوّنات وآلية الحلّ، والعزل يتحقق بمجموعات المسار + البادئات الداخلية `_s/_d/_p/_c/_a` + قاعدة منع الاستيراد المتبادل. `src/features/<module>/` هو حدّ كل مهمة (الدستور VI). الـ BFF يعيش داخل `src/app/api/` لأنه يحتاج نفس الأصل (الكوكيز).

## Phase 0 → Phase 1 outputs

- [x] `research.md` — 16 قراراً (R-01…R-16)، صفر `NEEDS CLARIFICATION`.
- [x] `data-model.md` — كيانات الواجهة + enums + انتقالات الحالة + قواعد التحقق.
- [x] `contracts/` — عقد cross-cutting، الـ endpoints الجاهزة، فهرس الفجوات المولَّد.
- [x] `quickstart.md` — تشغيل محلي على `*.localhost:3000`، سيناريوهات التحقق، بروتوكول الاستعادة.

## Foundation setup executed with this plan (user-requested)

| Step | Result |
|---|---|
| `components.json` → `"rtl": true` | ✅ |
| إعادة توليد `src/components/ui/button.tsx` بفئات منطقية | ✅ (`ps-/pe-`) |
| تثبيت الحزم المتبقية (R-06) | ✅ انظر `package.json`؛ `.npmrc` بـ `legacy-peer-deps=true` (peer اختياري Zod 3 في `@hookform/resolvers`) |
| `npm run lint` + `tsc --noEmit` | ✅ |

> ملاحظة: لم يُكتب أي كود واجهة؛ التنفيذ يبدأ بعد `/speckit-tasks` بالمهمة الأولى (تأسيس الرموز/الخطوط/proxy/BFF) ثم M01.

## Implementation order (input to `/speckit-tasks`)

| Phase | Scope | Restore tag |
|---|---|---|
| 1 | Setup: رموز `globals.css`، الخطوط، `layout.tsx` RTL، `env.ts`، ESLint rules، `scripts/visual-check.ts`، `restore-points.md` | `rp/01-foundation-*` |
| 2 | Foundational: `proxy.ts` + `lib/tenant.ts`، BFF passthrough + adapters skeleton + mocks runtime، `api-client` + `ApiError`، QueryProvider/ThemeProvider/NuqsAdapter، `components/shared` (Money, EmptyState, ErrorState, DataTable)، `access.ts` | `rp/02-core-*` |
| 3 | **M01** الصفحة الترويجية (US1 أول شاشة) | `rp/03-landing-*` |
| 4 | **M47** حلّ المستأجر وصفحات 404/403/503 + **M03** هيكل اللوحة والدخول | `rp/04-tenant-shell-*` |
| 5 | **M02** معالج التأسيس | `rp/05-onboarding-*` |
| 6 | **M04/M05/M06** المنتجات، التنظيم، الطلبات (+ **M48** لوحة الأوامر، **M49** مركز التنبيهات الأساسي) | `rp/06-catalog-orders-*` |
| 7 | **M09–M12** المتجر، PDP، السلة، الدفع (+ M41, M44) | `rp/07-storefront-*` |
| 8 | **M34** إعدادات المتجر — نهاية P1 | `rp/08-settings-*` |
| 9–N | P2 ثم P3 بترتيب فهرس الوحدات | `rp/NN-<slug>-*` |

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Vaul (الدستور، قسم «الجوال») → shadcn base-nova `drawer` المبني على `@base-ui/react` | سجل shadcn 4.22 لنمط base-nova يولّد الـ drawer على Base UI لا Vaul؛ استعماله يبقي كل القوائم السفلية على نفس الرموز والـ primitives والـ RTL المولَّد | تثبيت Vaul بجانبه = primitive ثانٍ للطبقات (focus trap، scroll lock، RTL) يُراجَع يدوياً ويخالف VII؛ يُقترح تعديل PATCH للدستور يذكر «Vaul أو drawer من shadcn base-nova» — تاريخ الإزالة: عند اعتماد التعديل |
| `middleware.ts` (الدستور VIII، M47) → `proxy.ts` | Next 16 أعاد التسمية رسمياً؛ `middleware.ts` مهجور ويُحذف في الإصدار التالي | لا بديل؛ تسمية فقط — يُقترح تعديل PATCH للصياغة |
| TanStack Table مثبَّت على `^8` رغم توفر v9.3 | الدستور ينص على v8 صراحة | الترقية تحتاج تعديلاً دستورياً وتقييم API؛ تُدرَس بعد M06 |
