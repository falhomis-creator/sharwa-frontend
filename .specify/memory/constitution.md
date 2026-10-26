<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0 → 2.0.0 (2026-10-17) → 3.0.0 (2026-10-20, owner-directed) → 3.1.0 (2026-10-24)
- 3.1.0 MINOR (2026-10-24, retroactive audit T195): new section «Dashboard Shell & Theme Architecture»
  documents the layout and token rules already shipped (shell grid, sidebar, breakpoints, the two-layer
  brand → semantic token system, white-label surface, dark mode, storefront exclusion). The guideline
  example sidebar hex is superseded by the real token `--sidebar-color: #0f1e45`. No rule removed.
- 3.0.0 (+2026-10-20 clarification): chart area/bar fills may use a soft vertical royal-blue gradient.
- 3.0.0 BREAKING: Principle I-ب redefined — the product surfaces (dashboard, admin) leave the zinc-only,
  hairline, no-brand-hue, no-shadow rule. New section «UI/UX & Design Guidelines (Updated)»: deep navy
  sidebar, cool slate-50 ground, royal blue (#0066ff / blue-600) accent, NO coral or orange, white
  rounded-2xl cards with soft diffused shadows. Principle VII radius cap (0.5rem) lifted for cards.
  Design System Constraints «اللوحة (المنتج)» rewritten. Storefront still wears the merchant's theme.
  Follow-up: the coral accent shipped in the 2026-10-19 polish pass must be migrated to royal blue
  in `src/app/globals.css` (tokens only).
- 2.0.0 BREAKING: Principle I split by surface — I-أ expressive marketing (gradients, glow,
  glassmorphism, brand emerald now ALLOWED on `(marketing)`), I-ب restrained product (1.0.0 rules
  unchanged for dashboard/storefront/admin). Design System Constraints gained a marketing palette.
- Modified principles: all five template placeholders replaced; count expanded from 5 to 9
  - [PRINCIPLE_1] → I. Strict Anti-AI Look (NON-NEGOTIABLE)
  - [PRINCIPLE_2] → II. Arabic-First, Native RTL (NON-NEGOTIABLE)
  - [PRINCIPLE_3] → III. Git Restore Points (NON-NEGOTIABLE)
  - [PRINCIPLE_4] → IV. Visual Self-Verification with Playwright
  - [PRINCIPLE_5] → V. Read-Only Backend Boundary & Headless Contract
  - (new)         → VI. Spec-Driven, Module-Scoped Delivery
  - (new)         → VII. Design Tokens as the Single Source of Truth
  - (new)         → VIII. Multi-Tenant Route Isolation
  - (new)         → IX. Performance, Accessibility & Type-Safety Budgets
- Added sections:
  - Design System Constraints (replaces [SECTION_2])
  - Technology Stack & Development Workflow (replaces [SECTION_3])
- Removed sections: none
- Templates reviewed for alignment:
  - .specify/templates/plan-template.md ✅ "Constitution Check" gate reads principles I–IX
  - .specify/templates/spec-template.md ✅ no changes required
  - .specify/templates/tasks-template.md ✅ restore-point + visual-check tasks derive from III/IV
- Follow-up TODOs: none (all placeholders resolved)
-->

# Sharwa Frontend Constitution
# دستور الواجهة الأمامية لمنصة «شروه»

منصة «شروه» (Sharwa) هي SaaS للتجارة الإلكترونية متعددة المستأجرين (Multi-tenant).
هذا الدستور يحكم مشروع الواجهة الأمامية المستقل في `C:\sharwa_front\sharwa-frontend`
المبني بـ Next.js (App Router) ويتصل بالباك إند الأصلي (Django) في `C:\sharwa_saas` كعميل Headless.
كل بند أدناه قاعدة قابلة للفحص؛ أي مخالفة توقف المراجعة حتى تُصحَّح أو تُوثَّق كاستثناء مبرَّر.

## Core Principles

### I. Expressive Marketing / Restrained Product — سطحان بصريان

> **تعديل v2.0.0 (2026-10-17، بقرار المالك).** النسخة 1.0.0 منعت منعاً باتاً التدرجات اللونية
> ونصوص التدرج والهالات والظلال الملونة والـ glassmorphism في **كل** الأسطح. طُبِّق ذلك حرفياً على
> الصفحة الترويجية فجاءت «ميتة» بحكم المالك. القاعدة لم تُلغَ — **قُسِّمت حسب السطح**: الصفحة
> الترويجية تبيع، ولوحة التاجر تُدار. ما يصحّ في الأولى لا يصحّ في الثانية.

#### I-أ · الصفحة الترويجية والصفحات العامة (`(marketing)`) — تعبيرية

يُسمح ويُشجَّع هنا:

- **تدرجات لونية** في النصوص المفتاحية والأسطح (`emerald → cyan` هو تدرج المنصة المعتمد).
- **هالات وظلال ملونة** (`shadow-emerald-500/25` ونظائرها) حول الأزرار والأسطح البارزة.
- **Glassmorphism** لسطح واحد بارز (طبقة blur واحدة، لا blur فوق blur).
- **خلفيات حية**: شبكة أو نقاط مع قناع إضاءة شعاعي (Radial Gradient Mask).
- **عناصر عائمة** وحركة دخول واضحة (`framer-motion`/`motion`).
- **لون brand** (`emerald`) للأفعال الرئيسية.

ويبقى ممنوعاً حتى هنا:

- العبارات العامة والحشو («أطلق العنان»، «ثورة في التجارة») والإيموجي داخل الواجهة.
- الرسوم التوضيحية الجاهزة (stock illustrations / 3D blobs).
- رص بطاقات متماثلة بنفس الأيقونة داخل دائرة ملونة ونفس الطول.
- أي حركة لا تحترم `prefers-reduced-motion`، أو تجعل المحتوى غير مقروء قبل تنفيذ JS.

#### I-ب · لوحة التاجر و Super Admin — مؤسسية نظيفة (NON-NEGOTIABLE)

> **تعديل v3.0.0 (2026-10-20، بقرار المالك).** أُلغيت قاعدة «zinc فقط، حدود `1px` بلا ظلال، بلا لون brand»
> لأسطح المنتج. الهوية البصرية الملزِمة الآن هي قسم **«UI/UX & Design Guidelines (Updated)»** أدناه:
> شريط جانبي كحلي داكن، أرضية رمادية باردة فاتحة، لون تمييز أزرق ملكي (**لا مرجاني ولا برتقالي**)،
> وبطاقات بيضاء بظلال ناعمة وحواف `rounded-2xl`.

ويبقى ملزِماً هنا:

- **بلا تدرجات وبلا هالات ملونة وبلا glassmorphism** في الأسطح والنصوص — العمق من الظلال المحايدة الناعمة فقط.
  الاستثناء الوحيد: **تعبئة الرسوم البيانية** (مساحة تحت الخط/أشرطة) بتدرج رأسي ناعم من لون التمييز الأزرق، كما في تصميم المالك.
- الألوان الدلالية (نجاح/تحذير/خطأ/معلومة) لحالات البيانات فقط، ولا تحلّ محل لون التمييز.
- أرقام `font-mono tabular-nums`، تخطيطات غير متماثلة، مساحات بيضاء بدل الزخرفة.
- الحركة وظيفية: 150–300ms، `ease-out`، وتحترم `prefers-reduced-motion`.

**المتجر (`(storefront)`)** لا يتبع ألوان هذا القسم: يُرسَم بثيم التاجر نفسه (المبدأ VII)، ويرث فقط
شكل البطاقات والعمق. ألوان اللوحة لا تُفرض على متاجر التجار.

**Rationale**: التاجر يرى الصفحة الترويجية مرة واحدة ويقرر؛ ويرى اللوحة ثماني ساعات يومياً.
الأولى تحتاج جاذبية بصرية تُقنع، والثانية تحتاج هدوءاً لا يُرهق ولا يزاحم البيانات. فصل السطحين
يحفظ الهدفين معاً بدل التضحية بأحدهما — وهو ما فشلت فيه النسخة 1.0.0. وفي v3.0.0 تبيّن أن «الهدوء»
لا يعني «التسطيح»: لوحة باردة الألوان بعمق ناعم ولون تمييز واحد أهدأ للعين وأوضح للتسلسل من لوحة أحادية.

### II. Arabic-First, Native RTL (NON-NEGOTIABLE) — عربي أصيل

- `<html lang="ar" dir="rtl">` هو الافتراضي في كل التخطيطات (Landing، لوحة التاجر، المتجر، Super Admin).
  اللغة الإنجليزية (LTR) خيار ثانٍ عبر نفس المكونات دون تفرّع في الكود.
- الخطوط: **IBM Plex Sans Arabic** للنصوص العربية والواجهة، و**Geist Mono** (بـ `tabular-nums`) للأرقام،
  الأسعار، SKU، أرقام الطلبات، والتواريخ. يُمنع عرض الأرقام المالية بخط النص.
- يُمنع استخدام خصائص CSS الاتجاهية الفيزيائية (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`)
  ويُلزم بالبدائل المنطقية (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`).
- الأيقونات الاتجاهية (أسهم، chevrons، back) MUST تنعكس في RTL عبر `rtl:rotate-180` أو مكونات واعية بالاتجاه.
- الأرقام تُعرض بالأرقام العربية الغربية (0-9) مع فواصل آلاف محلية، والعملة بعد الرقم بفاصل غير قابل للكسر
  (مثال: `1,250.00 ر.س`). التواريخ عبر `Intl.DateTimeFormat('ar')`.
- `components.json` MUST تضبط `"rtl": true`، وأي مكون Shadcn مُولَّد يُراجع لتوافق RTL قبل الاعتماد.

**Rationale**: التاجر العربي هو المستخدم الأول؛ تجربة RTL المُرقَّعة (patched) هي أول ما يفقد ثقته (مرجع: Salla).

### III. Git Restore Points (NON-NEGOTIABLE) — نقاط الاستعادة

كل مرحلة تصميمية/تنفيذية MUST تُحاط بنقطتي استعادة عبر Git:

1. **قبل البدء**: `git add -A && git commit -m "chore(rp): before <phase-slug>"` ثم
   `git tag -a rp/<NN>-<phase-slug>-before -m "<وصف>"`.
2. **بعد الانتهاء والفحص البصري**: `git commit -m "feat(<module>): <summary>"` ثم
   `git tag -a rp/<NN>-<phase-slug>-after -m "<وصف>"`.
3. `NN` رقم تسلسلي من رقمين يطابق رقم المهمة/المرحلة في `tasks.md`؛ الـ slug بالإنجليزية kebab-case.
4. كل نقطة تُسجَّل سطراً في `.specify/memory/restore-points.md` (التاريخ، الوسم، الوصف، لقطات الفحص).

**بروتوكول كلمة «استعادة»**: عندما يكتب المالك كلمة **«استعادة»** (مع أو بدون اسم وسم) MUST يُنفَّذ فوراً وبدون نقاش:

```bash
git stash push -u -m "wip-before-restore-$(date +%Y%m%d-%H%M%S)"   # حفظ أي عمل غير مُلتزَم
git reset --hard <tag>   # الوسم المذكور، وإلا آخر وسم *-before للمرحلة الجارية
```

ثم يُعاد تشغيل الفحص البصري (المبدأ IV) ويُبلَّغ المالك بالوسم المُستعاد وبالعمل المحفوظ في الـ stash.
يُمنع `git push --force` أو حذف الوسوم؛ نقاط الاستعادة سجل دائم.

**Rationale**: التصميم عملية استكشافية؛ القدرة على التراجع الفوري بلا خوف هي ما يسمح بالتجريب الجريء.

### IV. Visual Self-Verification with Playwright — الفحص البصري الذاتي

لا تُعتبر أي واجهة «منتهية» قبل فحصها فعلياً في المتصفح:

- بعد بناء كل واجهة MUST يُشغَّل `next dev` ويُفتح المتصفح (Playwright MCP أو Browser Tools) على:
  Desktop `1440×900`، Tablet `768×1024`، Mobile `390×844`.
- يُفحص: صحة RTL (المحاذاة، الأيقونات، الـ overflow الأفقي = صفر)، التباين، تناسق الحدود والمسافات،
  الوضع الداكن، حالات التحميل (skeleton) والفراغ (empty) والخطأ، ولوحة المفاتيح (Tab / Esc / `Ctrl+K`).
- لقطات الشاشة تُحفظ في `docs/visual-checks/<NN>-<slug>/{desktop,tablet,mobile}[-dark].png`
  ويُشار إليها في سجل نقاط الاستعادة؛ لا يُنشأ وسم `*-after` قبل وجودها.
- أي خطأ في console أو تحذير hydration يُعامَل كفشل في الفحص.

**Rationale**: التصميم يُقاس بما يراه المستخدم، لا بما يمرّ في الـ TypeScript.

### V. Read-Only Backend Boundary & Headless Contract — حدود القراءة فقط

- مجلد المشروع الأصلي `C:\sharwa_saas` للقراءة فقط. يُمنع منعاً باتاً إنشاء أو تعديل أو حذف أي ملف فيه،
  أو تشغيل أوامر تكتب فيه (`git`, `pip`, `manage.py migrate`…). كل الكتابة حصراً داخل `C:\sharwa_front\sharwa-frontend`.
- الواجهة الأمامية عميل Headless: كل البيانات عبر HTTP API موثَّق في `specs/**/contracts/`؛
  يُمنع استيراد أو نسخ قوالب Django أو منطق الباك إند.
- أي حقل/حالة/enum يُستخدم في الواجهة MUST يكون مُشتقاً من اكتشاف فعلي للـ Models/Serializers الأصلية
  (موثَّق في `specs/discovery/`), لا من الافتراض.
- حين يغيب endpoint مطلوب في الباك إند، تُبنى الواجهة على عقد (contract) مُقترَح مع Mock محلي
  يُعلَّم `[NEEDS BACKEND]` في الـ spec، ولا يُزعم اكتمال التكامل.

**Rationale**: فصل الواجهة عن الباك إند (Medusa/Saleor) يحمي النظام الحيّ ويسمح بتطوير الواجهة بسرعة.

### VI. Spec-Driven, Module-Scoped Delivery — التنفيذ وفق المواصفات

- لا كود قبل spec: كل وحدة من الأركان الوظيفية (20+ ركناً) لها `spec.md` ثم `plan.md` ثم `tasks.md`
  عبر تسلسل SpecKit (`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`).
- كل مهمة تنفيذية تلمس وحدة واحدة ومجلداً واحداً تحت `src/features/<module>/` أو مجموعة مسار واحدة.
- المواصفات تُكتب بلغة المستخدم (قصص مستخدم، معايير قبول قابلة للفحص)، والقرارات التقنية تبقى في `plan.md`.
- أي انحراف عن الـ spec أثناء التنفيذ MUST يُعاد إلى الـ spec أولاً (تعديل موثَّق) لا إلى الكود مباشرة.

**Rationale**: حجم المنصة (20+ وحدة) يجعل التنفيذ العشوائي مصدر تضارب بصري ووظيفي.

### VII. Design Tokens as the Single Source of Truth — الرموز التصميمية

- كل الألوان، الخطوط، الحواف، المسافات، ومدد الحركة تُعرَّف مرة واحدة كمتغيرات CSS في `src/app/globals.css`
  (Tailwind v4 `@theme`) وتُستهلك عبر فئات Tailwind الدلالية (`bg-background`, `border-border`, `text-muted-foreground`).
- يُمنع كتابة قيم hex/oklch/px خام داخل المكونات أو الصفحات؛ الاستثناء الوحيد ملف الرموز نفسه.
- ثيم المتجر الذي يختاره التاجر (Theme Customizer) يُطبَّق عبر تجاوز نفس الرموز على جذر مجموعة مسار المتجر فقط،
  ولا يلمس رموز لوحة التاجر أو الصفحة الترويجية.
- نصف قطر الحواف: البطاقات والحاويات `rounded-2xl` (v3.0.0)؛ الحقول والأزرار حسب `--radius`؛
  الحواف الدائرية الكاملة للـ avatars والـ badges والمفاتيح (switches) فقط.
- قيم قسم «UI/UX & Design Guidelines» (الكحلي، الأزرق الملكي، slate-50، الظل الناعم) تُعرَّف **رموزاً**
  في `globals.css` (`--primary-color`, `--accent-color`, `--bg-main`, `--elevation-card`…) وتُستهلك عبر
  الفئات الدلالية (`bg-sidebar`, `bg-primary`, `bg-background`, `bg-card`, `shadow-card`)؛ الأمثلة الحرفية في
  ذلك القسم (`#1a2642`، `bg-slate-50`، `shadow-[0_8px_30px_rgb(0,0,0,0.04)]`) مواصفة للقيمة لا صيغة تُكتب
  في المكونات — فحظر القيم الخام أعلاه ما زال سارياً، وهو ما يُبقي تخصيص الثيم لكل مستأجر ممكناً.
- المكونات الأساسية من Shadcn/ui (نمط base-nova) ومكونات Aceternity/Magic UI تُعاد كتابتها لتستهلك الرموز نفسها قبل الاستخدام.

**Rationale**: الاتساق البصري عبر 20+ وحدة لا يمكن حفظه يدوياً؛ الرموز تحميه آلياً.

### VIII. Multi-Tenant Route Isolation — عزل المستأجرين في التوجيه

- App Router يُقسَّم إلى مجموعات مسار معزولة بتخطيطاتها وحالتها:
  `(marketing)` الصفحة الترويجية، `(onboarding)` تأسيس المتجر، `(dashboard)` لوحة التاجر،
  `(storefront)/[store]` متجر المشتري، `(admin)` لوحة Super Admin، `(pos)` نقاط البيع.
- المستأجر يُحلّ من الـ host (subdomain أو نطاق مخصص) في `middleware.ts` ويُمرَّر كـ header/param؛
  يُمنع تمرير معرّف المستأجر عبر query string للمستخدم النهائي.
- حالة عميل الطلب (TanStack Query) MUST تُفتَح مفاتيحها بمعرّف المستأجر لمنع تسرب الكاش بين المتاجر.
- مكونات واجهة المتجر لا تستورد من مكونات لوحة التاجر وبالعكس؛ المشترك فقط في `src/components/ui` و`src/lib`.

**Rationale**: تسرب بيانات متجر إلى آخر هو أخطر عيب في SaaS متعدد المستأجرين.

### IX. Performance, Accessibility & Type-Safety Budgets — ميزانيات الأداء والوصول والأنواع

- أداء: LCP ≤ 2.5s وCLS ≤ 0.1 على الجوال لصفحات المتجر و PDP والـ Landing؛ Lighthouse Performance ≥ 90.
  الصور عبر `next/image` فقط، الخطوط عبر `next/font` مع `display: swap`.
- الوصول: تباين AA على الأقل، كل عنصر تفاعلي قابل للوصول بلوحة المفاتيح مع حالة `focus-visible` مرئية
  (حلقة `1px` بلون `ring`)، وكل أيقونة بلا نص لها `aria-label`.
- الأنواع: `strict: true`، يُمنع `any` و`@ts-ignore`؛ كل استجابة API تُحقَّق عبر Zod schema تُشتق منها الأنواع.
- حالة الخادم عبر TanStack Query فقط؛ Zustand للحالة اللحظية في المتصفح فقط (سلة، سحب/إفلات، لوحة أوامر)؛
  حالة الفلاتر والبحث والترقيم في الـ URL عبر `nuqs`.
- `npm run lint` و`tsc --noEmit` MUST تنجح قبل أي وسم `*-after`.

**Rationale**: المتجر يُفتح من جوال التاجر والمشتري في شبكات متواضعة؛ السرعة والوضوح جزء من الهوية.

## UI/UX & Design Guidelines (Updated)
- **Vibe:** Ultra-clean, modern, enterprise-grade e-commerce SaaS. High contrast, cool tones.
- **Colors (Dashboard & Admin):** 
  - Sidebar: Deep Navy Blue (`#1a2642` or similar).
  - Background: Very light cool gray/off-white (`bg-slate-50`).
  - Accent/CTAs: Bright Royal Blue (`#0066ff` or `blue-600`) for primary buttons, charts, and active highlights. NO CORAL OR ORANGE.
- **Cards & Depth:** Pure white backgrounds (`bg-white`), with very soft, diffused, large drop shadows (e.g., `shadow-[0_8px_30px_rgb(0,0,0,0.04)]`), completely rounded corners (`rounded-2xl`), and clean, light borders (`border-slate-100`).

> نطاق هذا القسم: `(dashboard)` و`(admin)` وما يشاركهما الهوية (`(pos)`، `(courier)`، `(onboarding)`، `sharwa-pay`).
> التطبيق عبر الرموز وفق المبدأ VII. المتجر يتبع ثيم التاجر (I-ب)، والصفحة الترويجية تتبع I-أ.
> القيم الفعلية الملزِمة هي رموز `globals.css` (القسم التالي)؛ الأمثلة أعلاه (`#1a2642`…) توصيف للاتجاه فقط.

## Dashboard Shell & Theme Architecture (v3.1.0) — هيكل اللوحة ونظام الثيم

> توثيق رجعي (T195، 2026-10-24) لما هو مشحون فعلاً في `src/app/(dashboard)/%5Fd/[store]/dashboard/(shell)/layout.tsx`،
> `src/features/dashboard-shell/**`، و`src/app/globals.css`. أي تغيير لهذه القواعد يمر بتعديل دستوري.

### أ. هيكل الـ Shell

- **بوابة واحدة**: `requireSession()` و`requestIdentity()` تُنتظَران في جسم التخطيط نفسه، **خارج** أي `<Suspense>`،
  مع `export const instant = false` و`await connection()`. الغاية: حالات HTTP حقيقية (404 متجر مجهول،
  403 موقوف، 503 أثناء التجهيز، 307 للدخول) بدل shell ثابت يُرسَل بـ 200 ثم يُعاد توجيهه. الـ skeletons
  في ملفات `loading.tsx` فقط.
- **الترتيب**: `SessionProvider` ← `StoreProvider` ← (`ShellHydrator`, `ShellShortcuts`, `SkipLink`) ← شبكة `flex min-h-dvh`
  ← ثم خارج الشبكة: `MobileDrawer`، `ShortcutsDialog`، `CommandPalette` (`Ctrl+K`).
- **الشريط الجانبي**: `sticky top-0 h-dvh`، ظاهر من `lg` (1024px) فقط. عرضه **256px** (`w-64`) موسّعاً أو
  **64px** (`w-16`) شريطاً ضيقاً (rail) — اختيار التاجر المحفوظ في `useShellStore`. منطقة التمرير الداخلية `min-h-0`
  إلزامية (بدونها تخرج العناصر عن الـ 100dvh).
- **تحت `lg`**: لا rail؛ دُرج من جهة البداية (`Sidebar variant="drawer"`) + شريط سفلي (`MobileBottomNav`).
- **الشريط العلوي**: ارتفاع **48px** (`h-12`) على سطح البطاقة، ومحاذاة رأس الشريط الجانبي بنفس الارتفاع.
- **المحتوى**: `<main id="main">` بسقف **1440px** ومسافات `px-4 py-6` (16/24px) ثم `lg:px-8 lg:py-8` (32px)، على أرضية
  `bg-background`. الـ `SkipLink` يقفز إلى `#main`.

### ب. الشريط الجانبي والصلاحيات

- السطح `bg-sidebar text-sidebar-foreground` بحد `border-sidebar-border`؛ العنصر النشط **كتلة شفافة فاتحة**
  (`--sidebar-primary`) لا خط سفلي؛ الأيقونات `--sidebar-icon`؛ مربع الشعار `bg-cta text-cta-foreground shadow-button`.
- **بوابات التنقل**: المجموعة تُخفى إذا كانت ميزتها مغلقة، أو كل ميزات عناصرها مغلقة، أو لا صلاحية لأي
  عنصر فيها. مجموعة **مختلطة** تبقى ظاهرة وعناصرها الممنوعة معطَّلة مع تلميح
  «ليست لديك صلاحية لهذا القسم». عناصر «للمالك فقط» تُحذف للموظفين (لا تُعطَّل). البوابة تقبل صلاحية
  واحدة أو قائمة «أيٌّ من» (`PermissionGate`).

### ج. نظام الرموز ذو الطبقتين (أساس الـ White-label)

1. **طبقة العلامة (Brand layer)** — ستة مدخلات خام على `:root` هي **السطح الوحيد** الذي يجوز لثيم المستأجر
   تجاوزه: `--primary-color` (#0066ff)، `--sidebar-color` (#0f1e45)، `--accent-color` (#0066ff)،
   `--bg-main` (#f8fafc)، `--surface-color` (#ffffff)، `--ink-color` (#0f1b33).
2. **الطبقة الدلالية (Semantic layer)** — رموز shadcn/Tailwind (`--primary`، `--accent`، `--sidebar*`، `--cta`،
   `--accent-ink`، `--chart-1..5`…) **مشتقة** من طبقة العلامة عبر `var()` و`color-mix()`، ولا تُتجاوَز لكل مستأجر.
   المكوّنات تستهلك هذه الطبقة فقط (`bg-primary`، `bg-sidebar`، `bg-cta`، `text-accent-ink`، `shadow-card`).
- **Tailwind v4 بلا `tailwind.config.ts`**: كتلة `@theme inline` في `globals.css` هي الـ config الوحيد.
- **العمق**: `--elevation-card` / `--elevation-card-hover` (ظلال محايدة ناعمة واسعة) و`--elevation-button` (رفعة زرقاء
  خفيفة تحت الـ CTA فقط). الحواف: `--radius: 0.75rem` ومشتقاته (`rounded-2xl` = 1.5rem للبطاقات).
- **التباين المقيس (AA على #F5F7FA)**: النص 16:1، النص الخافت 5.1:1، الأبيض على الأزرق 4.8:1، `--accent-ink` 6.3:1،
  نص الشريط الجانبي 8.5:1، أيقوناته 5.1:1. أي تغيير في طبقة العلامة يُعاد قياس تباينه.

### د. الوضع الداكن واستثناء المتجر

- `next-themes` بـ `attribute="class"` و`defaultTheme="system"`؛ الـ `ThemeProvider` المغلّف يحوّل سكربت منع الوميض
  إلى كتلة بيانات عند العرض من جهة العميل (صفحة خطأ `notFound()`)؛ `suppressHydrationWarning` على `<html>`.
- `.dark` يتجاوز **طبقة العلامة** (كحلي أعمق + أزرق #4d8dff) والقليل من الرموز الدلالية غير المشتقة؛
  الباقي يُشتق تلقائياً.
- `@custom-variant dark` يستثني أي صفحة تحمل `[data-store-theme]`: **المتجر لا يتبع الوضع الداكن للزائر**،
  بل يُرسَم بألوان التاجر (المبدأ VII).
- الخطوط مستضافة ذاتياً عبر `next/font/local` (IBM Plex Sans Arabic 400/500/600، Geist Mono 400/500/600 مُحمّلة مسبقاً).
  `themeColor` في الـ viewport مأخوذ من `TOKENS.background` لا قيمة خام.

## Design System Constraints — قيود نظام التصميم

- **اللوحة (المنتج)** (v3.0.0): وفق قسم «UI/UX & Design Guidelines (Updated)» — شريط جانبي كحلي داكن،
  أرضية `slate-50`، بطاقات بيضاء بحدود `slate-100`، لون تمييز أزرق ملكي للأزرار الرئيسية والرسوم والحالات النشطة.
  يُمنع المرجاني والبرتقالي كلون تمييز. الوضع الداكن يشتق نفس الرموز بدرجات كحلية. الألوان الدلالية:
  `emerald-700` (`#047857`) نجاح، `amber-700` (`#b45309`) تحذير، `red-600` خطأ/حذف، `sky-700` (`#0369a1`) معلومة — تُستخدم للنص والنقاط الصغيرة لا للمساحات، وكلها ≥ 4.5:1 على الأبيض (AA). (تعديل 2026-10-19 بقرار المالك: الوصول والتباين يتقدّمان؛ كانت درجات 600.)
- **اللوحة (الترويجي، I-أ)**: zinc كأساس + `emerald` لون brand للأفعال، وتدرج `emerald-500 → cyan-500`
  للكلمات المفتاحية والأسطح. الرموز في `globals.css` تحت البادئة `--brand-*` و`--glow-*` و`--glass-*`.
  **هذه الرموز ممنوعة خارج `src/app/(marketing)/**` و`src/features/landing/**`.**
- **التيبوغرافي**: مقياس 12/14/16/20/24/32/48/64px؛ العناوين `tracking-tight` ووزن 500–600 لا 700+.
  الأرقام المالية `font-mono tabular-nums` دائماً.
- **المسافات**: شبكة 4px؛ padding البطاقات 16–24px؛ الفواصل بين الأقسام 48–96px في الـ Landing.
- **الجداول** (TanStack Table): صفوف 44px، رأس ثابت، حدود أفقية فقط، أعمدة رقمية محاذاة للنهاية، كثافة قابلة للتبديل.
- **النماذج** (React Hook Form + Zod): تسمية فوق الحقل، رسائل الخطأ تحت الحقل باللون الدلالي، حفظ تلقائي حيث يناسب.
- **التنبيهات**: Sonner فقط، أسفل-البداية (bottom-start في RTL)، بلا ألوان صاخبة.
- **الجوال**: القوائم السفلية عبر Vaul؛ أهداف اللمس ≥ 44px؛ لا hover-only interactions.
- **لوحة الأوامر**: `Ctrl+K`/`⌘K` عبر cmdk في كل لوحات التحكم للبحث والتنقل وتنفيذ الإجراءات.
- **الأيقونات**: Lucide فقط، حجم 16/20px، سماكة 1.5–2.

## Technology Stack & Development Workflow — التقنيات وسير العمل

**الترسانة المعتمدة** (لا تُستبدل دون تعديل دستوري):
Next.js App Router · React 19 · TypeScript strict · Tailwind CSS v4 · Shadcn/ui (base-nova) · Aceternity/Magic UI
(بعد إعادة التلوين) · Motion · TanStack Table v8 · TanStack Query · Zustand · React Hook Form + Zod ·
Recharts/Tremor · cmdk · @dnd-kit · Vaul · Sonner · nuqs · Lucide · next-themes · IBM Plex Sans Arabic + Geist Mono ·
Playwright · Git.

**الهيكل**: `src/app/(group)/…` للمسارات، `src/features/<module>/{components,hooks,api,schemas}` لمنطق الوحدات،
`src/components/ui` لمكونات Shadcn، `src/lib` للمشترك (api-client, tenant, format, i18n)،
`specs/<NNN>-<module>/{spec.md,plan.md,tasks.md,contracts/}` للمواصفات، `specs/discovery/` لمخرجات قراءة الباك إند.

**تسلسل تسليم كل وحدة**:

1. وسم `*-before` (المبدأ III).
2. تنفيذ المهام من `tasks.md` بالترتيب.
3. `npm run lint` + `tsc --noEmit`.
4. فحص بصري وثلاث لقطات + داكن (المبدأ IV).
5. تحديث `restore-points.md` ثم وسم `*-after`.
6. تقرير مقتضب للمالك: ما بُني، ما فُحص، الوسم، وما بقي `[NEEDS BACKEND]`.

**بوابات المراجعة**: أي مراجعة تتحقق من قائمة المبادئ I–IX صراحة؛ مخالفة المبادئ I، II، III، V ترفض التغيير بلا استثناء.

## Governance

- هذا الدستور يتقدّم على أي ممارسة أو تفضيل أو قالب آخر في المشروع، بما فيه `AGENTS.md` وملفات القوالب.
- **التعديل**: يُقترح التعديل كتابياً مع المبرر والأثر على المواصفات القائمة، ويُقرّه مالك المنصة.
  يُحدَّث رقم الإصدار وتاريخ آخر تعديل، ويُذكر التعديل في Sync Impact Report أعلى الملف حتى اعتماده.
- **الإصدارات** (SemVer): MAJOR لإزالة/إعادة تعريف مبدأ؛ MINOR لإضافة مبدأ أو قسم أو توسيع جوهري؛
  PATCH للصياغة والتوضيح.
- **المراجعة الدورية**: عند إنهاء كل وحدة من الأركان الوظيفية يُراجع الامتثال للمبادئ I–IX ويُوثَّق في تقرير التسليم.
- **الاستثناءات**: أي استثناء مؤقت يُسجَّل في `plan.md` للوحدة تحت «Complexity Tracking» مع المبرر وتاريخ الإزالة.
- الإرشاد التشغيلي أثناء التطوير: `.specify/memory/constitution.md` (هذا الملف) ثم `AGENTS.md` لقواعد Next.js الإصدارية.

**Version**: 3.1.0 | **Ratified**: 2026-10-17 | **Last Amended**: 2026-10-24
