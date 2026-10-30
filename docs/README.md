# Sharwa Documentation — توثيق منصة شروة

> Phase 003 documentation home. This file is the entry point for every reader. It also sets the rules every page follows: structure, language, conventions, contributing and maintenance.
> Status and plan: [`specs/003-documentation/documentation-roadmap.md`](../specs/003-documentation/documentation-roadmap.md) (536 `DOC-XXX` tasks, milestones M-1…M-6) · [`execution-plan.md`](../specs/003-documentation/execution-plan.md) (52 steps) · [`CHANGELOG.md`](CHANGELOG.md).

Sharwa (شروة) is a multi-tenant e-commerce SaaS for Yemeni and Gulf merchants. It has two parts. The Next.js frontend (this repo, `sharwa-frontend`) holds the storefront, the merchant dashboard, the courier app, the Sharwa Pay wallet and the platform console, plus a BFF under `/api/bff/`. The Django + django-tenants + PostgreSQL backend (`sharwa_saas`) serves `/api/v1/`. All 49 frontend modules (M01–M49) were integrated with Django in Phase 002 (INT-001 → INT-049). These docs describe the integrated system.

---

## 1. Start here — index per audience

| You are… | Language | Read |
|---|---|---|
| **Developer / integrator** (frontend, backend, partner building on the API) | English | [API reference](api/README.md): [overview](api/overview/README.md) (auth, [CSRF](api/overview/csrf.md), [conventions & versioning](api/overview/conventions.md), errors, money, idempotency, BFF) → [domains](api/domains/README.md) → [integrators](api/integrators/README.md) (webhooks) → [OpenAPI](api/openapi/README.md) ([`sharwa-v1.yaml`](api/openapi/sharwa-v1.yaml), [route inventory](api/openapi/route-inventory.md)) · [Postman](api/postman/README.md) · [API changelog](api/CHANGELOG.md). Then [Architecture](architecture/README.md). |
| **DevOps / maintainer** | English | [Architecture](architecture/README.md) ([data model](architecture/data-model/README.md), [jobs](architecture/jobs/README.md)) → [Operations](ops/README.md) ([deployment](ops/deployment/README.md), [migrations](ops/migrations/README.md), [runbooks](ops/runbooks/README.md), [testing](ops/testing/README.md)). |
| **Merchant — store owner «مالك المتجر»** | العربية | [أدلة التاجر](guides/merchant/README.md) — من التسجيل حتى التقارير، مقسّمة على 14 مجالاً. |
| **Staff member** («مدير المتجر»، «مدير الفرع»، «كاشير»، «أمين مخزن»، أو دور مخصّص) | العربية | [أدلة التاجر](guides/merchant/README.md) — كل صفحة تذكر الصلاحية المطلوبة. [مصفوفة الصلاحيات](guides/merchant/12-settings-staff-integrations/README.md). |
| **Buyer / shopper** (زائر المتجر) | العربية | [مركز مساعدة المشتري](guides/buyer/README.md). |
| **Courier agent** (المندوب) | العربية | [دليل تطبيق المندوب](guides/courier/README.md). |
| **Sharwa Pay customer** (محفظة شروة باي) | العربية | [دليل شروة باي](guides/sharwa-pay/README.md). |
| **Platform owner «مالك المنصة» / operator «مشرف تشغيلي»** | العربية | [دليل لوحة مالك المنصة](guides/console/README.md). |

Shared references: [Glossary — المسرد](glossary.md) · [Page templates](_templates/README.md) · [Changelog](CHANGELOG.md) · [Coverage matrix](_coverage.md) · [Consistency report](_verification.md) · [Maintenance rule](#maintenance).

---

## 2. Documentation tree

```
docs/
├── README.md                 ← this file
├── glossary.md               ← Arabic ↔ English terms, M01–M49 ↔ INT-001…INT-049
├── CHANGELOG.md              ← one entry per execution step
├── _coverage.md              ← INT → DOC coverage matrix (generated, DOC-533)
├── _verification.md          ← consistency report: links, terms, money, fixtures (DOC-534)
├── _tools/                   ← check_links.py · check_terms.py · coverage.py · allow.json
├── _templates/               ← api-endpoint · guide-page · architecture-page · runbook
├── api/                      ← Track 1 — Developer & API Reference (English)
│   ├── openapi/              ← sharwa-v1.yaml, tooling decision, contract diff, examples/
│   ├── postman/              ← collection + environments/
│   ├── overview/             ← auth, csrf, conventions, errors, money, idempotency, conflicts, pagination, rate-limits, bff …
│   ├── integrators/          ← outgoing webhooks, inbound webhook receivers
│   └── domains/NN-<slug>/    ← one page per module / endpoint group, 16 domains
├── guides/                   ← Track 2 — User manuals (Arabic, RTL)
│   ├── merchant/NN-<slug>/   ← owner + staff (14 domain folders)
│   ├── buyer/05-storefront/  ← storefront help centre
│   ├── courier/11-shipping/  ← M38 courier app
│   ├── sharwa-pay/08-finance/← M40 Sharwa Pay customers
│   ├── console/16-platform-console/ ← «مالك المنصة» + «مشرف تشغيلي»
│   └── _assets/              ← screenshots (see §5.4)
├── architecture/             ← Track 3 — Architecture (English): data-model/, jobs/
├── ops/                      ← Track 3 — Operations (English): deployment/, migrations/, runbooks/, testing/
│
├── DELIVERY-REPORT.md        ← Phase 1–8 delivery report (generated, existing)
├── lighthouse/               ← Phase 8 Lighthouse JSON (existing)
└── visual-checks/            ← Phase 1–8 screenshots + ANTI-AI-AUDIT.md (existing)
```

Every folder has a `README.md` that lists its planned pages with the `DOC-XXX` task that produces each one. A page listed there but not yet linked is still planned; the roadmap checkbox is the source of truth for its status.

### 2.1 Domain slugs (shared by Tracks 1–3)

| NN | Slug | Domain | Modules |
|---|---|---|---|
| 01 | `01-public-onboarding` | Public site, onboarding & tenant resolution — الصفحة الترويجية والتسجيل وحلّ المستأجر | M01, M02, M47 |
| 02 | `02-dashboard-shell` | Dashboard shell, auth, overview, search, notifications & multi-store — هيكل اللوحة والمصادقة والإشعارات | M03, M43, M48, M49 |
| 03 | `03-catalog` | Core catalog & advanced products — الكتالوج الأساسي والمنتجات المتقدمة | M04, M05, M37 |
| 04 | `04-orders-returns` | Order management & returns — إدارة الطلبات والمرتجعات | M06, M24 |
| 05 | `05-storefront` | Storefront, purchase journey & PWA — واجهة المتجر ورحلة الشراء وتطبيق PWA | M09–M12, M41, M42, M44 |
| 06 | `06-customers-wallets` | Customers, customer wallets & loyalty — العملاء ومحافظ العملاء والولاء | M07, M35 |
| 07 | `07-marketing-design-partners` | Marketing, storefront design & partners — التسويق والتصميم والمسوّقون والمؤثرون | M08, M13, M17 |
| 08 | `08-finance` | Finance: payments, merchant wallet, expenses & Sharwa Pay — المالية والمحفظة | M14, M33, M40 |
| 09 | `09-b2b` | B2B wholesale — البيع بالجملة B2B | M36 |
| 10 | `10-inventory-locations-procurement` | Inventory, locations & procurement — المخزون والمواقع والمشتريات | M21, M22, M23 |
| 11 | `11-shipping` | Shipping, couriers & Sharwa Ship — الشحن والمندوبون وشروة شيب | M15, M38, M39 |
| 12 | `12-settings-staff-integrations` | Store settings, staff & permissions, domains & integrations — الإعدادات والفريق والصلاحيات والتكاملات | M18, M19, M34 |
| 13 | `13-channels-operations` | Sales channels & operations: inbox, marketplaces, dropshipping, POS, bookings — القنوات والأسواق والدروبشيبينغ ونقطة البيع والحجوزات | M16, M26, M27, M28, M29 |
| 14 | `14-apps-ai-support` | Apps, AI & automation, support — التطبيقات والذكاء الاصطناعي والدعم | M30, M31, M32 |
| 15 | `15-reports` | Reports & analytics — التقارير والتحليلات | M25 |
| 16 | `16-platform-console` | Platform owner console (`console.<base>`) — لوحة مالك المنصة | M20, M45, M46 |

The full module ↔ INT ↔ live-key table is in the [glossary](glossary.md#4-modules-m01m49).

---

## 3. How these docs relate to the rest of the project

| Source | Where | Role for the docs |
|---|---|---|
| Frontend spec (Phase 001) | [`specs/001-sharwa-frontend-platform/`](../specs/001-sharwa-frontend-platform/) — spec, 49 module specs, contracts, `ready-api-v1.md`, `needs-backend-inventory.md` | Product intent and screen behaviour (FR-/US- ids cited in pages). |
| Integration (Phase 002) | [`specs/002-sharwa-integration/integration-tasks.md`](../specs/002-sharwa-integration/integration-tasks.md) + [`integration-inventory.md`](../specs/002-sharwa-integration/integration-inventory.md) | What was integrated, regrouped by domain — the roadmap's only input. |
| This phase (003) | [`specs/003-documentation/`](../specs/003-documentation/) — roadmap + execution plan | What to write and in which order. |
| Frontend code | `sharwa-frontend/src/` — Zod contracts `src/features/<module>/schemas.ts`, fixtures `src/mocks/<module>`, BFF `src/app/api/bff/`, `src/lib/bff/` | **The Data Contract** (immutable source of truth for response shapes). |
| Backend code | `sharwa_saas/` — `api/urls.py`, `api/views_*.py`, services under `products/services/`, `tenants/`, `sharwapay/`, migrations, `api/test_*_api.py` | **The behaviour** every page is verified against. |
| Older backend docs | `sharwa_saas/docs/` (`ARCHITECTURE/00_MASTER_INDEX.md` … `05_INTEGRATIONS_AND_AI.md`, `THEME_ENGINE_ARCHITECTURE.md`, `SHARWA_AI_*.md`, `DEVELOPMENT_WORKFLOW.md`) and `sharwa_saas/Sharwa_User_Guide.md` | Background only. They predate Phase 002 and describe the HTML screens. Do not copy from them without checking the code. |

Paths in pages are written repo-relative, as in the inventory: `sharwa_saas/…` = Django, `sharwa-frontend/…` = Next.js. Django routes are under `/api/v1/` unless a page says otherwise; BFF routes are under `/api/bff/`.

---

## 4. Language policy

> DOC-002 — **approved by fares** (2026-10-27, before step 02).

1. **Track 1 (API, `docs/api/`) and Track 3 (architecture & ops, `docs/architecture/`, `docs/ops/`) are written in English.** Code identifiers, routes, field names and module ids stay as in the code.
2. **Track 2 (user manuals, `docs/guides/`) is written in Arabic (RTL)**, for merchants, staff, buyers, couriers, Sharwa Pay customers and the platform console users. The UI is Arabic-first (constitution principle II), so the manuals use the UI's own words.
3. **Arabic server and UI sentences are quoted verbatim in «…» in every language.** Never paraphrase or translate one in place. An English page may add a translation after it in parentheses: «هذه الصفحة لمالك المتجر فقط.» (*this page is for the store owner only*). Copy the sentence from the code (`grep`), not from the roadmap or the inventory.
4. **One Arabic term per concept**, taken from the UI and listed in the [glossary](glossary.md): «مالك المتجر», «مدير المتجر», «مدير الفرع», «كاشير», «أمين مخزن», «مالك المنصة», «مشرف تشغيلي», «شروة شيب», «شروة باي»… If a page needs a term that is not in the glossary, add it to the glossary in the same change.
5. **Numbers and money**: Western digits (0-9) everywhere. Money is shown exactly as the server formats it (`display_*` strings, see [glossary §3](glossary.md#3-currencies-and-money)), never re-computed in a page.

---

## 5. Conventions every page follows

### 5.1 Templates
Every page starts from one of the [templates](_templates/README.md): `api-endpoint.md` (Track 1), `guide-page.md` (Track 2), `architecture-page.md` (Track 3 architecture), `runbook.md` (Track 3 ops procedures). Each page names its source tasks in a `Source` line (`DOC-XXX · INT-0xx (Mxx)`).

### 5.2 Discrepancies
If the code differs from the roadmap or the inventory, the page documents **what the code does** and adds:

```markdown
> ⚠️ Discrepancy — roadmap says … / code does … (file:line). Reported in step NN.
```

The discrepancy is listed in the step report and in `CHANGELOG.md`. It is never silently "fixed" in either direction.

### 5.3 Examples and data
- Examples use fixture data only, from `src/mocks/**` or obviously fake values (`9677XXXXXXXX`, store `noor`). Never use real phone numbers, customers, tokens, secrets, credentials or production hostnames.
- Request/response examples are taken from a mock-mode run (`SHARWA_LIVE_MODULES=none`) or from a Django test, and match the Zod schema.

### 5.4 Arabic pages (RTL) and screenshots
- Each Track 2 page wraps its body in `<div dir="rtl">` … `</div>`. Keep a blank line after the opening tag so Markdown still renders inside. Code, routes and permission keys stay in back-ticks; they render LTR inside the RTL block.
- Screenshots live in `docs/guides/_assets/<audience>/<NN-slug>/<page>-<n>.png`. They are captured in mock mode with the Playwright pipeline (DOC-285 → `docs/guides/_screenshots.md`). A guide at `docs/guides/<audience>/<NN-slug>/<page>.md` references them as `../../_assets/<audience>/<NN-slug>/<page>-<n>.png`.
- Until a screenshot is captured, the page keeps a placeholder that names the route to capture: `![وصف اللقطة](../../_assets/merchant/04-orders-returns/orders-list-1.png) <!-- capture: /dashboard/orders, desktop 1440 -->`.
- The Phase 1–8 QA screenshots in `docs/visual-checks/` are design evidence, not manual images. Do not link them from guides.

### 5.5 Diagrams
Use Mermaid (` ```mermaid `) for sequence, state and flow diagrams, so they render on GitHub and stay diffable.

### 5.6 Links
Link with relative paths. Linking to a page that does not exist yet is allowed only if its path is listed in the roadmap (it will exist later). Track 4 (DOC-534) runs the link checker.

---

## 6. Contributing — ownership, review and Definition of Done

> DOC-005 — **approved by fares** (2026-10-27, before step 02).

**Who does what**
- **Claude** writes the pages, one execution step at a time (see [`execution-plan.md`](../specs/003-documentation/execution-plan.md)). Claude never runs `git commit` or `git push`; each step ends with the exact `git add` / `git commit` / `git push` commands.
- **fares** reviews each step, approves decisions, and commits and pushes himself.
- **Approval per track**: fares signs off Track 1, Track 2 and Track 3 pages per milestone. Track 4 (verification) is the final sign-off.

**Definition of Done for a `DOC-XXX` task.** The task is ticked `[x]` in the roadmap only when all of these hold:
1. The page(s) at the task's **Output** path exist and follow the matching template.
2. Every **Must document / Must cover** bullet of the task appears as real content: prose, tables, examples or diagrams, not a pasted checklist.
3. The content was checked against the code (`sharwa_saas` + `sharwa-frontend`), not only against the inventory. Discrepancies are flagged per §5.2.
4. Every quoted Arabic sentence was copied from the code.
5. Screenshots and examples come from mock mode (`SHARWA_LIVE_MODULES=none`) unless the page is about live behaviour.
6. Links resolve or point to roadmap-listed paths; no secrets or real data.
7. Tasks whose **Done when** requires a decision stay `[ ]` until fares approves, and the step report says so.

**Per step**: update the roadmap frontmatter `status:` (`N / 536 tasks`) and add a `CHANGELOG.md` entry (date, step, DOC range, files, discrepancies, decisions pending).

---

## 7. Maintenance <a id="maintenance"></a>

> Set by DOC-536 (Track 4, official Step 52) — **approved by fares on 2026-10-30**. Coverage proof: [`_coverage.md`](_coverage.md) (DOC-533) · consistency report: [`_verification.md`](_verification.md) (DOC-534).

### 7.1 The rule

Any change to a **Zod schema** (`src/features/<module>/schemas.ts`), a **Django `/api/v1/` view or serializer**, a **live module key**, a **migration** or a **Celery task / Beat schedule** updates, **in the same change**:

1. the matching doc page (Track 1 API page, and the Track 2 guide when a screen or an Arabic sentence changes, and the Track 3 page when a model, job, key or migration changes);
2. that page's **Last verified against code** line;
3. [`api/CHANGELOG.md`](api/CHANGELOG.md) when a `/api/v1/` route, a BFF row, a live key or a Zod contract changes (policy: [conventions › Versioning](api/overview/conventions.md#versioning)), and [`CHANGELOG.md`](CHANGELOG.md) for documentation changes;
4. the coverage matrix — re-run `python docs/_tools/coverage.py` and commit the regenerated [`_coverage.md`](_coverage.md).

A new **live key** also goes into the `.env.example` sample line and its comment block; a new **migration** into [`ops/migrations/phase-002-ledger.md`](ops/migrations/phase-002-ledger.md) (or its successor ledger); a new **Celery job** into [`architecture/50-background-jobs.md`](architecture/50-background-jobs.md); a new **test suite** into [`ops/testing/django-suites.md`](ops/testing/django-suites.md). A behaviour that is not built yet goes into [`architecture/90-open-items.md`](architecture/90-open-items.md), never into a guide as if it worked.

### 7.2 The checks before every documentation commit

Run from the `sharwa-frontend` folder (Python 3, standard library only — no install):

```bash
python docs/_tools/check_links.py     # 0 broken links / anchors (GitHub slugs + <a id>); pending screenshots listed apart
python docs/_tools/check_terms.py     # live keys, module ids, permission keys, plan features, money format, UI terms, anchors, fixture phones, secrets
python docs/_tools/coverage.py --check  # no empty INT → DOC cell, no missing output page
```

All three exit `0` on 2026-10-30. Accepted exceptions are listed, each with its reason, in [`_tools/allow.json`](_tools/allow.json); adding one is a review decision, not a way to silence a finding. Option A of the CI decision ([`ops/testing/ci.md`](ops/testing/ci.md) §8) puts these three commands in the future `frontend-static` job.

### 7.3 Where the documentation is published

| Question | Decision (fares, 2026-10-30) |
|---|---|
| Where the docs live | **In the repository only, for now** — `sharwa-frontend/docs/` in git, read on GitHub, which renders the Markdown and the Mermaid diagrams. Step 52 made every internal link and anchor GitHub-compatible (no `{#id}` attributes). |
| Visibility | ⚠️ The GitHub repository `falhomis-creator/sharwa-frontend` is **public** (checked 2026-10-30). Publishing in the repository therefore makes every page readable by anyone, including the security findings of [`architecture/30-security.md`](architecture/30-security.md) §9 and [`architecture/90-open-items.md`](architecture/90-open-items.md) §C. Make the repository private, or move those pages out, before the link is shared. |
| Static site | **Later.** MkDocs (Material, RTL-capable) or Docusaurus can be built from the same tree without moving files; it is a separate task, not part of Phase 003. |
| How merchants reach the Arabic guides | **Later.** A «مساعدة» link in the dashboard needs a public URL for `docs/guides/`; until a static site exists, staff send the guide page on GitHub. Recorded as a follow-up, not an open documentation task. |
| Screenshots | The guides carry 279 image references; 256 are registered in `guides/_assets/shots.json` and are produced by `npx tsx scripts/guide-screenshots.ts` on fares's machine; 23 (console pages, CSV import/export) need the manual capture described in [`guides/_screenshots.md`](guides/_screenshots.md). They show as missing images until captured; `check_links.py` reports them as **pending**, not broken. |

### 7.4 Git process

Claude writes files; it never runs `git commit` or `git push`. fares reviews every step, then runs the `git add` / `git commit` / `git push` commands given at the end of the step himself.
